import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const { chromium } = await import(process.env.SN_PLAYWRIGHT_MODULE || 'playwright');

const PIN = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const hostRoot = resolve(process.argv[2] || '');
const output = resolve(process.argv[3] || '/tmp/sillynovel-dyl18-evidence');
const extensionRoot = resolve(import.meta.dirname, '../../..');
const git = (root,...args) => execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
assert.equal(git(hostRoot,'rev-parse','HEAD'),PIN,'Refusing an unpinned host');
assert.equal(await realpath(resolve(hostRoot,'public/scripts/extensions/third-party/SillyNovel')),extensionRoot,'Use a dedicated host checkout with this extension mounted');
const runtimeFiles = ['index.js','style.css','src/reader-view.mjs','src/reader-source-model.mjs','src/shell.mjs','src/host-adapter.mjs'];
assert.equal(git(extensionRoot,'diff','HEAD','--',...runtimeFiles),'','Commit runtime changes before host validation');
const candidate = git(extensionRoot,'rev-parse','HEAD');
const dataRoot = await mkdtemp(resolve(tmpdir(),'sillynovel-dyl18-owned-'));
const children=[];
let browser, zoomContext;
const results=[];
const evidence={candidate,host:PIN,results,screenshots:[],fixtures:{},notTested:['Physical touch device, real IME input, real virtual keyboard','Other browsers/themes/extension combinations or host versions','Real model/provider inference; endpoint is deterministic and local','Owner reader-feel verdict: Gate A NOT_RUN']};
await mkdir(output,{recursive:true});

function start(command,args,cwd,ready) {
    return new Promise((resolve,reject) => {
        const child=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe']});children.push(child);
        let log='';
        const timer=setTimeout(()=>reject(Error('Child startup timed out: '+log.slice(-1500))),120000);
        const collect=chunk=>{log+=chunk; if(ready(log)){clearTimeout(timer);resolve(child);}};
        child.stdout.on('data',collect);child.stderr.on('data',collect);
        child.once('error',error=>{clearTimeout(timer);reject(error);});
        child.once('exit',code=>{clearTimeout(timer);reject(Error('Owned process exited '+code+': '+log.slice(-1500)));});
    });
}
const pass=(name,details={})=>{results.push({name,result:'PASS',...details});console.log('PASS '+name);};
async function screenshot(page,name) {
    await page.screenshot({path:resolve(output,name+'.png'),scale:'css'});evidence.screenshots.push(name+'.png');
}
const button=(page,name)=>page.getByRole('button',{name,exact:true});
async function setEnabled(page,enabled) {
    const icon=page.locator('.drawer-icon[title="Extensions"]');
    await icon.click();
    await page.locator('#sillynovel-enabled').setChecked(enabled);
    await icon.click();
    await page.locator('#sillynovel-enabled').waitFor({state:'hidden'});
}
async function selectCharacter(page,name) {
    const icon=page.locator('#rightNavDrawerIcon');
    if (!(await page.locator('#rm_button_characters').isVisible())) await icon.click();
    if (!(await page.locator('#rm_button_create').isVisible())) await page.locator('#rm_button_characters').click();
    await page.locator('#rm_print_characters_block').getByText(name,{exact:true}).click();
    await page.waitForFunction(name=>SillyTavern.getContext().chat[0]?.name===name,name);
    await icon.click();
    await page.locator('#character_name_pole').waitFor({state:'hidden'});
}
async function createCharacter(page,name,greeting) {
    if (!(await page.locator('#rm_button_create').isVisible())) await page.locator('#rightNavDrawerIcon').click();
    await page.locator('#rm_button_create').click();
    await page.locator('#character_name_pole').fill(name);
    await page.locator('#description_textarea').fill('Synthetic DYL-18 reader fixture. No private character data.');
    await page.locator('#firstmessage_textarea').fill(greeting);
    await page.locator('#create_button_label').click();
    await page.waitForFunction(name=>SillyTavern.getContext().characters.some(c=>c.name===name),name);
}
async function connected(page) {
    await page.locator('#API-status-top').click();
    await page.locator('#api_button_openai').click();
    await page.locator('#send_but').waitFor({state:'visible'});
    await page.locator('#API-status-top').click();
    await page.locator('#api_button_openai').waitFor({state:'hidden'});
}
async function send(page,text) {
    await page.locator('#send_textarea').fill(text);await page.locator('#send_but').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status')?.textContent.match(/streaming|being generated/));
}
async function settled(page) { await page.locator('#send_but').waitFor({state:'visible'}); }
async function composerState(page) {
    return page.evaluate(()=>{const d=document.getElementById('send_textarea');return[d.value,d.selectionStart,d.selectionEnd,d.selectionDirection,document.activeElement===d];});
}
const canonical = page => page.evaluate(()=>JSON.stringify({
    chat:SillyTavern.getContext().chat,characters:SillyTavern.getContext().characters,
    metadata:SillyTavern.getContext().chatMetadata,api:SillyTavern.getContext().mainApi,
    connection:SillyTavern.getContext().chatCompletionSettings,
}));

try {
    const settings=JSON.parse(await readFile(resolve(hostRoot,'default/content/settings.json')));
    settings.firstRun=false;settings.main_api='openai';
    settings.oai_settings={...settings.oai_settings,chat_completion_source:'custom',custom_url:'http://127.0.0.1:8128/v1',custom_model:'sn-reader-local',stream_openai:true};
    await mkdir(resolve(dataRoot,'default-user'),{recursive:true});
    await writeFile(resolve(dataRoot,'default-user/settings.json'),JSON.stringify(settings));
    // ponytail: this fixture reserves two fixed loopback ports; make fixture ports/origin
    // configurable together if concurrent host-validation runs become necessary.
    await start(process.execPath,['tests/fixtures/dyl18-openai-endpoint.mjs'],extensionRoot,log=>log.includes('endpoint listening on 8128'));
    await start(process.execPath,['server.js','--port','8018','--dataRoot',dataRoot,'--listen','false','--browserLaunchEnabled','false'],hostRoot,
        log=>log.includes('Using data root: '+dataRoot) && log.includes('SillyTavern is listening on IPv4: 127.0.0.1:8018'));
    browser=await chromium.launch({headless:false});evidence.browser=browser.version();
    const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    await page.goto('http://127.0.0.1:8018');
    await page.waitForSelector('#sillynovel-settings');
    const greetingA='*The reading room is quiet.*\n\nWelcome, **reader**. This is a synthetic conversation.';
    const greetingB='This is synthetic conversation B. Its text belongs only here.';
    await createCharacter(page,'Mira Reader A',greetingA);
    await createCharacter(page,'Mira Reader B',greetingB);
    await selectCharacter(page,'Mira Reader A');await connected(page);
    const beforeEnable=await canonical(page);
    await setEnabled(page,true);
    assert.equal(await page.locator('#chat').isVisible(),false);
    assert.equal(await page.locator('#sillynovel-stage').count(),1);
    assert.equal(await canonical(page),beforeEnable);
    pass('enable and native data preservation');
    await send(page,'Please greet the reader.');await settled(page);
    assert.ok(await page.locator('.sillynovel-dialogue em').count()>0);
    await screenshot(page,'desktop-reader');
    pass('normal send and streaming reply');

    await send(page,'Show a reply I can stop.');
    await page.waitForFunction(()=>SillyTavern.getContext().chat.at(-1).mes.length>15);
    await page.locator('#mes_stop').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status').textContent.includes('partial'));
    const stopped=await page.evaluate(()=>SillyTavern.getContext().chat.at(-1).mes);
    await page.locator('#options_button').click();await page.locator('#option_continue').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status').textContent.match(/streaming|being generated/));
    await settled(page);
    assert.ok((await page.evaluate(()=>SillyTavern.getContext().chat.at(-1).mes)).length>stopped.length);
    pass('stop and native continuation');

    await button(page,'Backlog').click();
    assert.match(await page.locator('.sillynovel-native-bar__status').innerText(),/Original message located/);
    const last=page.locator('#chat > .mes').last();
    await last.locator('.mes_edit').click();
    const original=await last.locator('.edit_textarea').inputValue();
    await last.locator('.edit_textarea').fill(original+'\n\nNATIVE EDIT MARKER');await last.locator('.mes_edit_done').click();
    await button(page,'Return to Reader').click();
    assert.match(await page.locator('.sillynovel-dialogue__message').innerText(),/NATIVE EDIT MARKER/);
    await button(page,'Backlog').click();await last.locator('.swipe_right').click();
    await page.waitForFunction(()=>SillyTavern.getContext().chat.at(-1).swipe_id===1);await settled(page);
    await last.locator('.swipe_left').click();
    await page.waitForFunction(()=>SillyTavern.getContext().chat.at(-1).swipe_id===0);
    await screenshot(page,'native-backlog');await button(page,'Return to Reader').click();
    assert.match(await page.locator('.sillynovel-dialogue__message').innerText(),/NATIVE EDIT MARKER/);
    pass('exact native handoff, native edit, swipe generation and previous swipe');

    await page.locator('#send_textarea').fill('Exact draft 日本語 with selection');await page.locator('#send_textarea').focus();
    await page.evaluate(()=>document.getElementById('send_textarea').setSelectionRange(2,8,'backward'));
    const draft=await composerState(page),beforeToggles=await canonical(page);
    for(let i=0;i<3;i++){await button(page,'Back to Chat').click();await button(page,'Return to Reader').click();}
    assert.deepEqual(await composerState(page),draft);assert.equal(await canonical(page),beforeToggles);
    pass('three reader/chat transitions preserve exact draft, focus and backward selection');
    while(!(await button(page,'Previous').isDisabled())) await button(page,'Previous').click();
    const pinned=await page.locator('.sillynovel-dialogue__message').innerText();
    await send(page,'[LONG] Show the complete chapter.');
    await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__unread').textContent==='2 new');
    assert.equal(await page.locator('.sillynovel-dialogue__message').innerText(),pinned);
    await screenshot(page,'pinned-older-message');
    await button(page,'Jump to Latest').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-dialogue').scrollHeight>document.querySelector('.sillynovel-dialogue').clientHeight+500);
    await page.evaluate(()=>{const d=document.querySelector('.sillynovel-dialogue');d.scrollTop=100;d.dispatchEvent(new Event('scroll'));});
    await settled(page);
    assert.equal(await page.evaluate(()=>document.querySelector('.sillynovel-dialogue').scrollTop),100);
    const complete=await page.evaluate(()=>SillyTavern.getContext().chat.at(-1).mes);
    assert.ok(complete.endsWith('END OF COMPLETE SYNTHETIC REPLY'));
    assert.ok(await page.locator('.sillynovel-dialogue p').count()>=65);
    await button(page,'Copy message').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),complete);
    await screenshot(page,'long-scrollable-reply');
    pass('pinned new replies, explicit latest, independent scroll and full formatted copy',{characters:complete.length,scrollTop:100});

    for(const [width,height,name] of [[390,800,'narrow-reader'],[390,500,'keyboard-viewport-simulation']]) {
        await page.setViewportSize({width,height});await page.locator('#send_textarea').focus();
        const rect=await page.locator('#send_textarea').boundingBox();assert.ok(rect.y+rect.height<=height);
        assert.equal(await page.locator('#send_but').isVisible(),true);
        const textRect=await page.locator('.sillynovel-dialogue').boundingBox();assert.ok(textRect.height>100);
        await screenshot(page,name);pass(name,{width,height,composer:rect,dialogueHeight:textRect.height});
    }
    await page.setViewportSize({width:1440,height:1000});
    await button(page,'Previous').click();await selectCharacter(page,'Mira Reader B');
    assert.equal(await page.locator('.sillynovel-dialogue__message').innerText(),greetingB);
    await selectCharacter(page,'Mira Reader A');
    assert.match(await page.locator('.sillynovel-dialogue__message').innerText(),/END OF COMPLETE SYNTHETIC REPLY/);
    assert.equal(await page.locator('.sillynovel-reader__unread').innerText(),'');
    pass('native A to B to A starts each activation at its current latest source');

    await send(page,'Disable and re-enable while this reply streams.');
    await setEnabled(page,false);assert.equal(await page.locator('#chat').isVisible(),true);
    await setEnabled(page,true);assert.equal(await page.locator('#sillynovel-stage').count(),1);
    await settled(page);await setEnabled(page,false);await setEnabled(page,true);
    assert.ok((await page.locator('.sillynovel-dialogue__message').innerText()).includes('a quiet moment'));
    pass('disable/re-enable during and after generation leaves native reply running');

    await page.locator('#send_textarea').fill('Draft survives render failure');await page.locator('#send_textarea').focus();
    await page.evaluate(()=>document.getElementById('send_textarea').setSelectionRange(3,9));
    const failureDraft=await composerState(page);
    // Instrument only an extension-owned text node. The host formatter keeps working.
    await page.evaluate(()=>{document.querySelector('.sillynovel-dialogue p em').firstChild.replaceData=()=>{throw Error('DYL18 induced reader render failure');};});
    await button(page,'Backlog').click();await page.locator('#chat > .mes').last().locator('.mes_edit').click();
    const edit=page.locator('#chat > .mes').last();
    const current=await edit.locator('.edit_textarea').inputValue();await edit.locator('.edit_textarea').fill(current.replace('lantern','candle'));await edit.locator('.mes_edit_done').click();
    assert.equal(await page.locator('#sillynovel-stage').count(),0);assert.equal(await page.locator('#chat').isVisible(),true);
    const afterFailure=await composerState(page);assert.deepEqual(afterFailure.slice(0,4),failureDraft.slice(0,4));
    await page.locator('.drawer-icon[title="Extensions"]').click();
    assert.match(await page.locator('#sillynovel-settings-status').innerText(),/induced reader render failure/);
    await screenshot(page,'render-failure-native-recovery');
    await page.locator('.drawer-icon[title="Extensions"]').click();
    await setEnabled(page,true);assert.equal(await page.locator('#sillynovel-stage').count(),1);
    pass('instrumented render failure restores native feed, draft/caret and clean re-enable');

    // A minimal, task-owned Chrome extension calls the actual browser zoom API. It
    // does not inject page scripts; CSS zoom/pinch/device scaling are not this check.
    const zoomExtension=resolve(dataRoot,'zoom-extension');await mkdir(zoomExtension);
    await writeFile(resolve(zoomExtension,'manifest.json'),JSON.stringify({manifest_version:3,name:'DYL18 synthetic zoom probe',version:'1.0',background:{service_worker:'background.js'}}));
    await writeFile(resolve(zoomExtension,'background.js'),'chrome.runtime.onInstalled.addListener(() => {});');
    zoomContext=await chromium.launchPersistentContext(resolve(dataRoot,'zoom-profile'),{headless:false,viewport:null,ignoreDefaultArgs:['--disable-extensions'],args:['--disable-extensions-except='+zoomExtension,'--load-extension='+zoomExtension,'--window-size=1440,1080']});
    const worker=zoomContext.serviceWorkers()[0] || await zoomContext.waitForEvent('serviceworker');
    const zoomPage=zoomContext.pages()[0];await zoomPage.goto('http://127.0.0.1:8018');await zoomPage.waitForSelector('#sillynovel-stage');
    await selectCharacter(zoomPage,'Mira Reader A');await connected(zoomPage);
    const beforeZoom=await zoomPage.evaluate(()=>({innerWidth,innerHeight,dpr:devicePixelRatio}));
    const zoom=await worker.evaluate(async()=>{const [tab]=await chrome.tabs.query({active:true});await chrome.tabs.setZoom(tab.id,2);return chrome.tabs.getZoom(tab.id);});assert.equal(zoom,2);
    await zoomPage.waitForFunction(before=>innerWidth<before.innerWidth*0.6,beforeZoom);
    const zoomMetrics=await zoomPage.evaluate(()=>({innerWidth,innerHeight,dpr:devicePixelRatio,scale:visualViewport.scale}));
    const zoomComposer=await zoomPage.locator('#send_textarea').boundingBox();assert.ok(zoomComposer.y+zoomComposer.height<=zoomMetrics.innerHeight);
    await button(zoomPage,'Previous').click();await button(zoomPage,'Jump to Latest').click();
    await screenshot(zoomPage,'browser-zoom-200-percent');
    pass('actual 200 percent browser zoom; navigation and composer remain reachable',{zoom,beforeZoom,zoomMetrics});
    await zoomContext.close();zoomContext=null;

    for(const file of ['tests/fixtures/reader-browser.html','tests/fixtures/dyl18-openai-endpoint.mjs',...runtimeFiles]) evidence.fixtures[file]=createHash('sha256').update(await readFile(resolve(extensionRoot,file))).digest('hex');
    evidence.completed=true;
} catch(error) {
    evidence.completed=false;evidence.failure=String(error);throw error;
} finally {
    await zoomContext?.close();await browser?.close();
    for(const child of children.reverse()) {
        if(child.pid && child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}
    }
    await writeFile(resolve(output,'results.json'),JSON.stringify(evidence,null,2)+'\n');
    await rm(dataRoot,{recursive:true,force:true});
}
