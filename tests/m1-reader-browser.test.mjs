import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import test, { before, after } from 'node:test';

// Test tooling is external; production reuses the pinned host's installed libraries.
const { chromium } = await import(process.env.SN_PLAYWRIGHT_MODULE || 'playwright');
const hostRoot = process.env.SILLYTAVERN_ROOT;
if (!hostRoot) throw new Error('Set SILLYTAVERN_ROOT to the pinned host checkout (installed showdown/dompurify).');
let browser, server, origin;
const root = resolve(import.meta.dirname, '..');
const files = new Map([
    ['/', resolve(root, 'tests/fixtures/reader-browser.html')],
    ['/vendor/showdown.js', resolve(hostRoot, 'node_modules/showdown/dist/showdown.js')],
    ['/vendor/purify.js', resolve(hostRoot, 'node_modules/dompurify/dist/purify.js')],
    ...['index.js', 'style.css', 'src/shell.mjs', 'src/reader-view.mjs', 'src/reader-source-model.mjs', 'src/host-adapter.mjs', 'src/stage-view.mjs', 'src/transient-scene.mjs', 'src/scene-reducer.mjs'].map(path => ['/' + path, resolve(root, path)]),
]);
for (const asset of JSON.parse(await readFile(resolve(root,'tests/fixtures/m12-stage/manifest.json')))) files.set('/tests/fixtures/m12-stage/'+asset.file,resolve(root,'tests/fixtures/m12-stage',asset.file));
before(async () => {
    server = createServer(async (req,res) => {
        const path = new URL(req.url, 'http://localhost').pathname;
        if (path === '/lib.js') {
            res.writeHead(200, { 'content-type': 'text/javascript' }).end('export const showdown = window.showdown; export const DOMPurify = window.DOMPurify;');
            return;
        }
        if (!files.has(path)) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'content-type': path.endsWith('.html') || path === '/' ? 'text/html' : path.endsWith('.css') ? 'text/css' : path.endsWith('.png') ? 'image/png' : 'text/javascript' }).end(await readFile(files.get(path)));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });
async function fixture(t, query = '') {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    t.after(() => context.close());
    const page = await context.newPage();
    await page.goto(origin + '/' + query);
    await page.waitForFunction(() => document.getElementById('sillynovel-settings-status')?.textContent !== '');
    if (query.includes('mount-failure')) await page.locator('#sillynovel-enabled').click();
    else if (!query.includes('missing')) await page.locator('#sillynovel-enabled').check();
    return page;
}
const button = (page, name) => page.getByRole('button', { name, exact: true });
const message = page => page.locator('.sillynovel-dialogue__message');
async function text(page, value, index) { await page.evaluate(({value,index}) => fixture.setText(value,index), {value,index}); }

test('actual entry mounts, updates, disposes and preserves canonical state', async t => {
    const page = await fixture(t);
    assert.equal(await page.locator('#sillynovel-stage').count(), 1);
    assert.equal(await page.locator('#chat').isVisible(), false);
    assert.match(await message(page).innerText(), /Hello reader/);
    const before = await page.evaluate(() => JSON.stringify([fixture.context.chat, fixture.context.characters, fixture.context.chatMetadata, fixture.context.connection]));
    for (let i=0;i<3;i++) {
        await page.locator('#sillynovel-enabled').uncheck();
        assert.equal(await page.locator('#chat').isVisible(), true);
        assert.equal(await page.evaluate(() => fixture.listenerCount()), 0);
        await page.locator('#sillynovel-enabled').check();
        assert.equal(await page.evaluate(() => fixture.listenerCount()), 10);
    }
    assert.equal(await page.evaluate(() => JSON.stringify([fixture.context.chat, fixture.context.characters, fixture.context.chatMetadata, fixture.context.connection])), before);
});

test('long ordinary Markdown is formatted, selectable and copied completely', async t => {
    const page = await fixture(t);
    const source = '# A chapter\n\nFirst *emphasis* and **strong with _nested emphasis_**.\nA line break.\n\n- One\n- Two\n\n1. First\n2. Second\n\n`inline`\n\n```js\nconst answer = 42;\n```\n\n[Safe link](https://example.com/story)\n\n' + 'A long complete paragraph.\n\n'.repeat(400) + 'FINAL MARKER';
    await text(page, source);
    assert.ok(await message(page).locator('p').count() > 400);
    for (const tag of ['em','strong','ul','ol','code','pre','a']) assert.ok(await message(page).locator(tag).count() > 0, tag);
    assert.match(await message(page).innerText(), /FINAL MARKER$/);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.sillynovel-dialogue')).userSelect), 'text');
    await button(page, 'Copy message').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), source);
    assert.equal(await page.locator('#send_textarea').isVisible(), true);
});

test('unsafe HTML, encoded protocols, media and malformed markup never execute or lose raw text', async t => {
    const page = await fixture(t);
    const cases = ['<script>window.readerPwned=true</script>rest', '<img src="https://example.com/pixel" onerror="window.readerPwned=true">', '[bad](javascript:alert%281%29)', '<a href="java&#x73;cript:alert(1)">encoded</a>', '[bad](java%73cript:alert)', '[bad](data:text/html,evil)', '<svg><a href="javascript:alert(1)">x</a></svg>', '<iframe srcdoc="<script>alert(1)</script>"></iframe>', '<strong onclick="alert(1)">broken <em>nested'];
    for (const source of cases) {
        await text(page, source);
        assert.equal(await message(page).textContent(), source, source);
        assert.equal(await message(page).locator('script,img,svg,iframe,[onclick],[onerror]').count(), 0);
        assert.match(await page.locator('.sillynovel-reader__status').innerText(), /Plain text/);
    }
    assert.equal(await page.evaluate(() => window.readerPwned), undefined);
    await text(page, '**nested _safe emphasis_** and unmatched *marker');
    assert.equal(await message(page).locator('strong em').count(), 1);
});

test('Previous/Next pin the cursor; new messages stay bounded until Latest', async t => {
    const page = await fixture(t);
    await button(page,'Previous').click();
    await page.evaluate(() => {
        fixture.context.chat.push({name:'You',is_user:true,mes:'A new question'},{name:'Mira',mes:'New reply'});
        fixture.renderNative(); fixture.emit('MESSAGE_RECEIVED',3);
    });
    assert.equal(await message(page).innerText(),'First message.');
    assert.equal(await page.locator('.sillynovel-reader__unread').innerText(),'2 new');
    await button(page,'Next').click(); await button(page,'Next').click(); await button(page,'Next').click();
    assert.equal(await message(page).innerText(),'New reply');
    assert.equal(await page.locator('.sillynovel-reader__unread').innerText(),'2 new');
    await button(page,'Jump to Latest').click();
    assert.equal(await page.locator('.sillynovel-reader__unread').innerText(),'');
});

test('streaming follows text bottom independently; scrolling up and selecting text survive updates', async t => {
    const page = await fixture(t);
    const source = 'A paragraph of selectable text.\n\n'.repeat(100);
    await text(page, source);
    await page.evaluate(() => {const d=document.querySelector('.sillynovel-dialogue');d.scrollTop=0;d.dispatchEvent(new Event('scroll'));});
    await button(page,'Follow text').click();
    await text(page, source + 'BOTTOM');
    assert.ok(await page.evaluate(() => {const d=document.querySelector('.sillynovel-dialogue');return d.scrollHeight-d.clientHeight-d.scrollTop<10;}));
    await page.evaluate(() => { const d=document.querySelector('.sillynovel-dialogue');d.scrollTop=100;d.dispatchEvent(new Event('scroll')); const n=d.querySelector('p').firstChild;const r=document.createRange();r.setStart(n,2);r.setEnd(n,12);getSelection().removeAllRanges();getSelection().addRange(r); });
    const selected = await page.evaluate(() => getSelection().toString());
    await text(page, source + 'BOTTOM plus more text');
    assert.equal(await page.evaluate(() => document.querySelector('.sillynovel-dialogue').scrollTop),100);
    assert.equal(await page.evaluate(() => getSelection().toString()),selected);
    assert.equal(await button(page,'Follow text').isVisible(),true);
    await text(page, 'Before *closing emphasis');
    await page.evaluate(() => {
        const n=document.querySelector('.sillynovel-dialogue p').firstChild;
        const range=document.createRange();range.setStart(n,8);range.setEnd(n,15);
        getSelection().removeAllRanges();getSelection().addRange(range);
    });
    const closingSelection=await page.evaluate(() => getSelection().toString());
    await text(page, 'Before *closing emphasis*');
    assert.equal(await page.evaluate(() => getSelection().toString()),closingSelection);
});

test('stop and continuation stay readable; disable does not stop generation', async t => {
    const page = await fixture(t);
    await page.evaluate(() => fixture.emit('GENERATION_STARTED','continue',{},false));
    await text(page,'Growing reply');
    assert.match(await page.locator('.sillynovel-reader__status').innerText(),/streaming/);
    await page.evaluate(() => fixture.emit('GENERATION_STOPPED'));
    assert.match(await page.locator('.sillynovel-reader__status').innerText(),/partial/);
    await page.evaluate(() => fixture.emit('GENERATION_STARTED','continue',{},false));
    await page.locator('#sillynovel-enabled').uncheck();
    await text(page,'Growing reply continued');
    await page.locator('#sillynovel-enabled').check();
    assert.equal(await message(page).innerText(),'Growing reply continued');
});

test('deleted/replaced pinned source is explicit and never silently retargeted', async t => {
    const page = await fixture(t);
    await button(page,'Previous').click();
    await page.evaluate(() => {fixture.context.chat.shift();fixture.renderNative();fixture.emit('MESSAGE_DELETED',1);});
    assert.match(await message(page).innerText(),/was deleted/);
    await button(page,'Jump to Latest').click();
    await button(page,'Backlog').click(); await button(page,'Return to Reader').click();
    await page.evaluate(() => {fixture.context.chat.push({name:'You',is_user:true,mes:'tail'});fixture.renderNative();fixture.emit('MESSAGE_RECEIVED',1);});
    await button(page,'Previous').click();
    await page.evaluate(() => {fixture.context.chat[0]={name:'Mira',mes:'replacement'};fixture.renderNative();fixture.emit('MESSAGE_EDITED',0);});
    assert.match(await message(page).innerText(),/selection is unavailable/);
});

test('backlog never claims an exact match against a stale native revision', async t => {
    const page = await fixture(t);
    await page.evaluate(() => {
        const previous = fixture.context.chat[1];
        fixture.context.chat[1] = { ...previous, mes: 'Replacement **revision**.' };
        // Keep the old native element, including its matching author/role/swipe attributes.
        fixture.emit('MESSAGE_EDITED', 1);
    });
    assert.equal(await message(page).innerText(), 'Replacement revision.');
    await button(page, 'Backlog').click();
    assert.match(await page.locator('#chat .mes[mesid="1"]').innerText(), /Hello/);
    assert.match(await page.locator('.sillynovel-native-bar__status').innerText(), /Exact source could not be located/);
    assert.equal(await page.locator('#chat').isVisible(), true);
    assert.equal(await page.locator('#send_textarea').isVisible(), true);
    await button(page, 'Return to Reader').click();
    await page.evaluate(() => {
        // A render notification has an index, but no source/revision evidence.
        fixture.renderNative();
        fixture.emit('CHARACTER_MESSAGE_RENDERED', 1, 'normal');
    });
    await button(page, 'Backlog').click();
    assert.equal(await page.locator('#chat .mes[mesid="1"]').innerText(), 'Replacement **revision**.');
    assert.match(await page.locator('.sillynovel-native-bar__status').innerText(), /Exact source could not be located/);
    await button(page, 'Return to Reader').click();
    await page.evaluate(() => {
        fixture.context.chat[1].mes = 'In-place revision.';
        fixture.emit('MESSAGE_EDITED', 1);
    });
    assert.equal(await message(page).innerText(), 'In-place revision.');
    await button(page, 'Backlog').click();
    assert.match(await page.locator('#chat .mes[mesid="1"]').innerText(), /Replacement/);
    assert.match(await page.locator('.sillynovel-native-bar__status').innerText(), /Exact source could not be located/);
});

test('backlog re-resolves reordered objects, returns pinned selection and reports locator fallback', async t => {
    const page = await fixture(t);
    await button(page,'Previous').click();
    await page.evaluate(() => {
        fixture.context.chat.unshift({name:'Mira',mes:'inserted'});fixture.renderNative();
        window.nativeScrolls=[];
        document.getElementById('chat').scrollTo = options => nativeScrolls.push(options);
    });
    await button(page,'Backlog').click();
    assert.equal(await page.locator('#chat').isVisible(),true);
    assert.match(await page.locator('.sillynovel-native-bar__status').innerText(),/Exact source could not be located/);
    assert.equal(await page.evaluate(() => nativeScrolls.length),1, 'current reordered candidate is still scrolled into view');
    await button(page,'Return to Reader').click();
    assert.equal(await message(page).innerText(),'First message.');
    await page.evaluate(() => document.querySelector('#chat .mes[mesid="1"]').remove());
    await button(page,'Backlog').click();
    assert.match(await page.locator('.sillynovel-native-bar__status').innerText(),/Exact source could not be located/);
    assert.equal(await page.evaluate(() => nativeScrolls.length),1, 'missing native candidate must not scroll');
    await button(page,'Return to Reader').click();
    await page.evaluate(() => {
        // Canonical ownership changed before its event/observer reaches the reader.
        fixture.context.chatId='synthetic-B';
        fixture.context.chat=[{name:'B',mes:'B only'}];fixture.renderNative();
        [...document.querySelectorAll('#sillynovel-stage button')].find(button=>button.textContent==='Backlog').click();
    });
    assert.match(await page.locator('.sillynovel-native-bar__status').innerText(),/Exact source could not be located/);
});

test('draft, caret, native composer node and focus survive repeated view transitions', async t => {
    const page = await fixture(t);
    await page.locator('#send_textarea').fill('Exact draft\nwith 日本語 and a caret');
    await page.locator('#send_textarea').focus();
    await page.evaluate(() => {window.originalComposer=document.getElementById('send_textarea');originalComposer.setSelectionRange(2,8,'backward');});
    for (let i=0;i<3;i++) { await button(page,'Back to Chat').click();await button(page,'Return to Reader').click(); }
    assert.deepEqual(await page.evaluate(() => {const d=document.getElementById('send_textarea');return [d.value,d.selectionStart,d.selectionEnd,d.selectionDirection,d===window.originalComposer,document.activeElement===d];}),['Exact draft\nwith 日本語 and a caret',2,8,'backward',true,true]);
});

test('missing capability and mount failure leave native chat usable', async t => {
    const missing = await fixture(t,'?missing');
    assert.equal(await missing.locator('#sillynovel-enabled').isDisabled(),true);
    assert.equal(await missing.locator('#chat').isVisible(),true);
    const mount = await fixture(t,'?mount-failure');
    assert.equal(await mount.locator('#sillynovel-stage').count(),0);
    assert.equal(await mount.locator('#chat').isVisible(),true);
    assert.equal(await mount.evaluate(() => fixture.listenerCount()),0);
});

test('format exception releases stage/listeners, restores native feed and keeps exact draft', async t => {
    const page = await fixture(t);
    await page.locator('#send_textarea').fill('Preserve this draft');
    await page.evaluate(() => {window.originalSanitize=DOMPurify.sanitize;DOMPurify.sanitize=()=>{throw Error('Synthetic render failure');};fixture.setText('trigger');});
    assert.equal(await page.locator('#chat').isVisible(),true);
    assert.equal(await page.locator('#sillynovel-stage').count(),0);
    assert.equal(await page.evaluate(() => fixture.listenerCount()),0);
    assert.equal(await page.locator('#send_textarea').inputValue(),'Preserve this draft');
    assert.match(await page.locator('#sillynovel-settings-status').innerText(),/Synthetic render failure/);
    await page.evaluate(() => DOMPurify.sanitize=originalSanitize);
    await page.locator('#sillynovel-enabled').check();
    assert.equal(await page.locator('#sillynovel-stage').count(),1);
});

test('A to B to A discards queued old-epoch reads and starts each visit at latest', async t => {
    const page = await fixture(t);
    await button(page,'Previous').click();
    await page.evaluate(() => { navigator.clipboard.writeText = () => new Promise(resolve => {window.finishCopy = resolve;}); });
    await button(page,'Copy message').click();
    await page.evaluate(() => {
        const originalRAF=requestAnimationFrame;
        const frames=[];
        window.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};
        fixture.emit('STREAM_TOKEN_RECEIVED','untrusted delayed text');
        const chatA=fixture.context.chat;
        fixture.context.chatId='synthetic-B';fixture.context.chat=[{name:'B',mes:'B only'}];fixture.renderNative();fixture.emit('CHAT_CHANGED','synthetic-B');
        fixture.context.chatId='synthetic-A';fixture.context.chat=chatA;chatA[1].mes='A latest';fixture.renderNative();fixture.emit('CHAT_CHANGED','synthetic-A');
        frames.forEach(cb=>cb());window.requestAnimationFrame=originalRAF;
    });
    assert.equal(await message(page).innerText(),'A latest');
    assert.equal(await page.locator('.sillynovel-reader__unread').innerText(),'');
    await page.evaluate(async () => {finishCopy(); await Promise.resolve();});
    assert.notEqual(await page.locator('.sillynovel-reader__status').innerText(),'Message copied.');
});

test('IME and editable-field key events remain unconsumed', async t => {
    const page = await fixture(t);
    assert.deepEqual(await page.evaluate(() => {
        const field=document.getElementById('send_textarea');
        const editable=document.createElement('div');editable.contentEditable='true';document.getElementById('sheld').append(editable);
        return [field,editable].flatMap(element=>['Enter',' ','ArrowLeft','ArrowRight'].map(key=>{
            const event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,isComposing:true});element.dispatchEvent(event);return event.defaultPrevented;
        }));
    }),Array(8).fill(false));
});

test('empty and unresolved-author sources are explicit; narrow reduced-height composer remains reachable', async t => {
    const page = await fixture(t);
    await page.evaluate(() => {fixture.context.chat=[{mes:''}];fixture.renderNative();fixture.emit('CHAT_CHANGED','synthetic-A');});
    assert.match(await page.locator('.sillynovel-reader__author').innerText(),/Unknown character/);
    assert.match(await page.locator('.sillynovel-reader__status').innerText(),/no text/);
    await page.evaluate(() => {fixture.context.chat=[];fixture.renderNative();fixture.emit('CHAT_CHANGED','synthetic-empty');});
    assert.match(await message(page).innerText(),/No message is available/);
    await page.setViewportSize({width:390,height:500});
    await page.locator('#send_textarea').focus();
    const rect=await page.locator('#send_textarea').boundingBox();
    assert.ok(rect.y+rect.height <= 500);
});

async function sceneControls(page) {
    await page.locator('.sillynovel-controls summary').click();
    await page.getByLabel('Test actor art',{exact:true}).waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.querySelector('[aria-label="Test actor art"]').disabled);
}
const field = (page,name) => page.getByLabel(name,{exact:true});
async function applyScene(page,name) {
    await button(page,name).click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.startsWith('Applied'));
}
async function addActor(page,preset,label) {
    const count=Number(await page.locator('.sillynovel-cast').getAttribute('data-count'));
    await field(page,'Test actor art').selectOption(preset);
    if(label)await field(page,'Session actor name').fill(label);
    await button(page,'Register session actor').click();
    await page.waitForFunction(count=>Number(document.querySelector('.sillynovel-cast').dataset.count)===count+1,count);
    return field(page,'Session actor').inputValue();
}
async function positionActor(page,key,slot,mode='move') {
    await field(page,'Session actor').selectOption(key);
    await field(page,'Position').selectOption(slot);
    await field(page,'Occupied slot action').selectOption(mode);
    await applyScene(page,'Apply position');
}
const sprite=(page,slot)=>page.locator('.sillynovel-sprite[data-slot="'+slot+'"]');

test('session stage: four manual actors, duplicate names, stable slots, refusal, swap, replace and locks',async t=> {
    const page=await fixture(t); await sceneControls(page);
    const canonical=await page.evaluate(()=>JSON.stringify([fixture.context.chat,fixture.context.characters,fixture.context.chatMetadata,fixture.context.connection]));
    const a=await addActor(page,'mira-a'), b=await addActor(page,'mira-b'), r=await addActor(page,'rowan'), s=await addActor(page,'sage');
    assert.notEqual(a,b);
    await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');
    await positionActor(page,a,'left');await positionActor(page,b,'center');await positionActor(page,r,'right');
    assert.equal(await page.locator('.sillynovel-sprite:visible').count(),3);
    assert.match(await page.locator('.sillynovel-cast').innerText(),/Sage.*offstage/);
    await field(page,'Session actor').selectOption(s);await field(page,'Position').selectOption('left');await button(page,'Apply position').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('SLOT_OCCUPIED'));
    assert.equal(await sprite(page,'left').getAttribute('data-actor'),a);
    await positionActor(page,b,'left','swap');assert.equal(await sprite(page,'center').getAttribute('data-actor'),a);
    await positionActor(page,s,'right','replace');assert.equal(await sprite(page,'right').getAttribute('data-actor'),s);
    assert.match(await page.locator('.sillynovel-cast').innerText(),/Rowan.*offstage/);
    await field(page,'Lock field').selectOption('slot');await applyScene(page,'Release lock');
    await applyScene(page,'Lock choice');await positionActor(page,s,'','move');
    await field(page,'Session actor').selectOption(a);await field(page,'Presence').selectOption('false');await applyScene(page,'Apply presence');assert.equal(await sprite(page,'center').isVisible(),false);
    await field(page,'Presence').selectOption('true');await applyScene(page,'Apply presence');assert.equal(await sprite(page,'center').isVisible(),true);
    assert.equal(await page.evaluate(()=>JSON.stringify([fixture.context.chat,fixture.context.characters,fixture.context.chatMetadata,fixture.context.connection])),canonical);
    assert.match(await page.locator('.sillynovel-unsaved').innerText(),/Unsaved session visuals/);
});

test('session stage: forward projection, selected-source expressions, outfits and incompatible/missing fallback',async t=> {
    const page=await fixture(t);await sceneControls(page);
    const a=await addActor(page,'mira-a'), b=await addActor(page,'mira-b');
    await positionActor(page,a,'left');
    await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');
    await field(page,'Expression · selected source only').selectOption(a+':joy-default');await applyScene(page,'Apply expression');
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a-joy.png'));
    await button(page,'Previous').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-art__background').hidden);
    assert.equal(await sprite(page,'left').isVisible(),false);
    await button(page,'Next').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a-joy.png'));
    await page.evaluate(()=>{fixture.context.chat.push({name:'You',is_user:true,mes:'next source'});fixture.renderNative();fixture.emit('MESSAGE_RECEIVED',2);});
    await button(page,'Jump to Latest').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a.png'));
    assert.match(await page.locator('.sillynovel-art__background').getAttribute('src'),/tavern.png$/);
    await field(page,'Outfit').selectOption(a+':blue-coat');await applyScene(page,'Apply outfit');
    await field(page,'Expression · selected source only').selectOption(a+':coat-joy');await applyScene(page,'Apply expression');
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a-coat-joy.png'));
    await field(page,'Outfit').selectOption(b+':neutral-sprite');await button(page,'Apply outfit').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('INCOMPATIBLE_ASSET'));
    assert.match(await sprite(page,'left').locator('img').getAttribute('src'),/mira-a-coat-joy/);
    await field(page,'Outfit').selectOption(a+':missing');await applyScene(page,'Apply outfit');
    assert.equal(await sprite(page,'left').locator('img').isVisible(),false);assert.match(await sprite(page,'left').innerText(),/art unavailable/);
    await field(page,'Outfit').selectOption('');await applyScene(page,'Apply outfit');
    await field(page,'Expression · selected source only').selectOption(a+':stern-default');await applyScene(page,'Apply expression');
    await page.evaluate(()=>{fixture.context.chat[2].swipe_id=1;fixture.emit('MESSAGE_SWIPED',2);});
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a.png'));
    await page.evaluate(()=>fixture.setText('historical edit',0));
    await page.waitForFunction(()=>document.querySelector('.sillynovel-cast').dataset.count==='0');
    assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);
});

test('session stage: temporary raster decode, replacement/reset/disable cleanup and stale delayed work',async t=> {
    const page=await fixture(t);await sceneControls(page);
    await page.evaluate(()=>{window.createdURLs=[];window.revokedURLs=[];const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=f=>{const u=create(f);createdURLs.push(u);return u;};URL.revokeObjectURL=u=>{revokedURLs.push(u);revoke(u);};});
    const upload=async name=>field(page,'Temporary raster file').setInputFiles(resolve(root,'tests/fixtures/m12-stage',name));
    await upload('forest.png');await page.waitForFunction(()=>document.querySelector('.sillynovel-art__background').src.startsWith('blob:'));
    await upload('tavern.png');await page.waitForFunction(()=>revokedURLs.length===1);
    await button(page,'Reset transient visuals').click();await page.waitForFunction(()=>revokedURLs.length===2);
    await field(page,'Temporary raster file').setInputFiles({name:'evil.png',mimeType:'image/png',buffer:Buffer.from('<svg onload="alert(1)"></svg>')});
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('format'));
    await field(page,'Temporary raster file').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10,0])});
    await page.waitForFunction(()=>revokedURLs.length===3);
    await upload('oversized.png');await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('dimensions'));
    await page.evaluate(()=>{window.originalDecode=Image.prototype.decode;Image.prototype.decode=function(){const self=this;return new Promise((resolve,reject)=>window.finishDecode=()=>originalDecode.call(self).then(resolve,reject));};});
    await upload('forest.png');await page.waitForFunction(()=>typeof window.finishDecode==='function');
    await page.evaluate(()=>{fixture.context.chatId='synthetic-B';fixture.emit('CHAT_CHANGED');});
    await page.waitForFunction(()=>revokedURLs.length===5);
    await page.evaluate(()=>{finishDecode();Image.prototype.decode=originalDecode;});
    await page.waitForFunction(()=>!document.querySelector('.sillynovel-art__background').src.startsWith('blob:'));
    await upload('tavern.png');await page.waitForFunction(()=>document.querySelector('.sillynovel-art__background').src.startsWith('blob:'));
    await page.locator('#sillynovel-enabled').uncheck();assert.equal(await page.evaluate(()=>new Set(revokedURLs).size),6);
    await page.locator('#sillynovel-enabled').check();await sceneControls(page);assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);
    assert.deepEqual(await page.evaluate(()=>Object.keys(fixture.context.extensionSettings.sillynovel)),['enabled']);
});

test('session stage: chat return, A to B to A, reload, narrow/keyboard layout and transparent fixtures',async t=> {
    const page=await fixture(t);await sceneControls(page);
    const a=await addActor(page,'mira-a');await positionActor(page,a,'left');
    await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');
    await page.locator('.sillynovel-controls summary').click();
    await page.evaluate(()=>{window.originalComposer=document.getElementById('send_textarea');originalComposer.value='Native draft';originalComposer.focus();originalComposer.setSelectionRange(2,7);});
    for(let i=0;i<3;i++){await button(page,'Back to Chat').click();await button(page,'Return to Reader').click();}
    assert.equal(await sprite(page,'left').getAttribute('data-actor'),a);
    assert.equal(await page.evaluate(()=>document.getElementById('send_textarea')===originalComposer),true);
    assert.equal(await page.locator('#send_textarea').inputValue(),'Native draft');
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').complete);
    assert.equal(await page.evaluate(async()=>{const blob=await (await fetch(document.querySelector('.sillynovel-sprite--left img').src)).blob();const bitmap=await createImageBitmap(blob);const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);return ctx.getImageData(0,0,1,1).data[3];}),0);
    for(const viewport of [{width:390,height:800},{width:390,height:500}]) {
        await page.setViewportSize(viewport);
        assert.equal(await page.locator('#send_textarea').isVisible(),true);
        assert.equal(await button(page,'Back to Chat').isVisible(),true);
        const metrics=await page.locator('.sillynovel-dialogue').boundingBox();assert.ok(metrics.height>=65,JSON.stringify(metrics));
        assert.ok((await page.locator('#send_form').boundingBox()).y+60<=viewport.height);
    }
    for(const id of ['synthetic-B','synthetic-A']){await page.evaluate(id=>{fixture.context.chatId=id;fixture.emit('CHAT_CHANGED');},id);await page.waitForFunction(()=>document.querySelector('.sillynovel-cast').dataset.count==='0');}
    await page.reload();await page.locator('#sillynovel-enabled').check();await page.waitForSelector('.sillynovel-unsaved');assert.equal(await page.locator('.sillynovel-cast').getAttribute('data-count'),'0');
});

test('session stage: delayed image cannot apply after same-source reset, manual override or unobserved source edit',async t=> {
    const page=await fixture(t);await sceneControls(page);
    const delay=async()=>{
        await page.evaluate(()=>{window.baseDecode=Image.prototype.decode;window.delayedReady=false;Image.prototype.decode=function(){const image=this;return new Promise((resolve,reject)=>{window.delayedReady=true;window.completeImage=()=>baseDecode.call(image).then(resolve,reject);});};});
        await field(page,'Temporary raster file').setInputFiles(resolve(root,'tests/fixtures/m12-stage/forest.png'));
        await page.waitForFunction(()=>window.delayedReady);
    };
    const finish=()=>page.evaluate(()=>{completeImage();Image.prototype.decode=baseDecode;});
    await delay();await button(page,'Reset transient visuals').click();await finish();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('Nothing was saved'));
    assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);
    await delay();await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');await finish();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('STALE_SOURCE'));
    assert.match(await page.locator('.sillynovel-art__background').getAttribute('src'),/tavern.png/);
    await delay();await page.evaluate(()=>{fixture.context.chat[1].mes='canonical edit without a lifecycle event';});await finish();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('STALE_SOURCE'));
    assert.equal(await page.locator('.sillynovel-art__background').getAttribute('src')?.then(x=>x?.startsWith('blob:')),false);
});
