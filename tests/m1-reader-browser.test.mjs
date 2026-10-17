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
    ...['index.js', 'style.css', 'src/shell.mjs', 'src/reader-view.mjs', 'src/reader-source-model.mjs', 'src/host-adapter.mjs', 'src/stage-view.mjs', 'src/transient-scene.mjs', 'src/source-prefix.mjs', 'src/scene-reducer.mjs', 'src/project-client.mjs', 'src/project-scene.mjs', 'src/project-expressions.mjs', 'plugins/sillynovel-storage/schema.mjs'].map(path => ['/' + path, resolve(root, path)]),
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
async function fixture(t, query = '', initScript = null) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    t.after(() => context.close());
    if (initScript) await context.addInitScript(initScript);
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

test('visual viewport keeps the original composer reachable through keyboard resize, pan and native chat; disable releases it', async t => {
    const page = await fixture(t, '', () => {
        window.testViewport = Object.assign(new EventTarget(), { height: 900, offsetTop: 0, scale: 1 });
        Object.defineProperty(window, 'visualViewport', { value: testViewport });
    });
    await page.evaluate(() => {
        window.originalComposer = document.getElementById('send_textarea');
        originalComposer.value = 'Keyboard draft'; originalComposer.focus(); originalComposer.setSelectionRange(2, 7);
    });
    for (const [height, offsetTop] of [[350, 0], [210, 35], [900, 0]]) {
        await page.evaluate(({height, offsetTop}) => {
            Object.assign(testViewport, { height, offsetTop });
            testViewport.dispatchEvent(new Event('resize')); testViewport.dispatchEvent(new Event('scroll'));
        }, {height, offsetTop});
        const controls = page.locator('.sillynovel-controls');
        await controls.locator('summary').click();
        assert.equal(await controls.evaluate(e => e.open), true);
        await controls.locator('summary').click();
        for (const name of ['Back to Chat', 'Return to Reader']) {
            const form = await page.locator('#send_form').boundingBox();
            assert.ok(form.y + form.height <= height + offsetTop + 1, JSON.stringify(form));
            await button(page, name).click();
        }
    }
    assert.deepEqual(await page.evaluate(() => ({same: originalComposer === document.getElementById('send_textarea'), value: originalComposer.value, selection: [originalComposer.selectionStart, originalComposer.selectionEnd]})), {same: true, value: 'Keyboard draft', selection: [2, 7]});
    await page.evaluate(() => { testViewport.scale = 2; testViewport.dispatchEvent(new Event('resize')); });
    assert.equal(await page.locator('#sheld').evaluate(e => e.classList.contains('sillynovel-viewport')), false);
    await page.locator('#sillynovel-enabled').uncheck();
    await page.evaluate(() => { testViewport.scale = 1; testViewport.dispatchEvent(new Event('resize')); });
    assert.equal(await page.locator('#sheld').evaluate(e => e.classList.contains('sillynovel-viewport') || e.style.getPropertyValue('--sillynovel-available-height') !== ''), false);
    const noViewport = await fixture(t, '', () => Object.defineProperty(window, 'visualViewport', { value: undefined }));
    assert.equal(await noViewport.locator('#sheld').evaluate(e => e.classList.contains('sillynovel-viewport')), false);
});

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
    assert.ok((await page.locator('.sillynovel-dialogue').boundingBox()).height>140,'Open controls yield art space to dialogue');
    await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');
    await positionActor(page,a,'left');await positionActor(page,b,'center');await positionActor(page,r,'right');
    assert.equal(await page.locator('.sillynovel-sprite:not([hidden])').count(),3);
    await page.locator('.sillynovel-controls summary').click();
    assert.equal(await page.locator('.sillynovel-sprite:visible').count(),3);
    await page.locator('.sillynovel-controls summary').click();
    assert.match(await page.locator('.sillynovel-cast').innerText(),/Sage.*offstage/);
    await field(page,'Session actor').selectOption(s);await field(page,'Position').selectOption('left');await button(page,'Apply position').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('SLOT_OCCUPIED'));
    assert.equal(await sprite(page,'left').getAttribute('data-actor'),a);
    await positionActor(page,b,'left','swap');assert.equal(await sprite(page,'center').getAttribute('data-actor'),a);
    await positionActor(page,s,'right','replace');assert.equal(await sprite(page,'right').getAttribute('data-actor'),s);
    assert.match(await page.locator('.sillynovel-cast').innerText(),/Rowan.*offstage/);
    await field(page,'Lock field').selectOption('slot');await applyScene(page,'Release lock');
    await applyScene(page,'Lock choice');await positionActor(page,s,'','move');
    await field(page,'Session actor').selectOption(a);await field(page,'Presence').selectOption('false');await applyScene(page,'Apply presence');
    await page.locator('.sillynovel-controls summary').click();assert.equal(await page.locator('.sillynovel-art').isVisible(),true);assert.equal(await sprite(page,'center').isVisible(),false);
    await page.locator('.sillynovel-controls summary').click();
    await field(page,'Presence').selectOption('true');await applyScene(page,'Apply presence');
    await page.locator('.sillynovel-controls summary').click();assert.equal(await sprite(page,'center').isVisible(),true);
    assert.equal(await page.evaluate(()=>JSON.stringify([fixture.context.chat,fixture.context.characters,fixture.context.chatMetadata,fixture.context.connection])),canonical);
    assert.match(await page.locator('.sillynovel-unsaved').innerText(),/Unsaved session visuals/);
});

test('session stage: forward projection, selected-source expressions, outfits and incompatible/missing fallback',async t=> {
    const page=await fixture(t);await sceneControls(page);
    const a=await addActor(page,'mira-a'), b=await addActor(page,'mira-b');
    await positionActor(page,a,'left');
    await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');
    await field(page,'Expression to apply · selected source only').selectOption(a+':joy-default');await applyScene(page,'Apply expression');
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a-joy.png'));
    await button(page,'Previous').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-art__background').hidden);
    assert.equal(await sprite(page,'left').isVisible(),false);
    await button(page,'Next').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a-joy.png'));
    await page.evaluate(()=>{fixture.context.chat.push({name:'You',is_user:true,mes:'next source'});fixture.renderNative();fixture.emit('MESSAGE_RECEIVED',2);});
    await button(page,'Jump to Latest').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a.png'));
    assert.match(await page.locator('.sillynovel-art__background').getAttribute('src'),/tavern.png$/);
    await field(page,'Outfit').selectOption(a+':blue-coat');await applyScene(page,'Apply outfit');
    await field(page,'Expression to apply · selected source only').selectOption(a+':coat-joy');await applyScene(page,'Apply expression');
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a-coat-joy.png'));
    await field(page,'Outfit').selectOption(b+':neutral-sprite');await button(page,'Apply outfit').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('INCOMPATIBLE_ASSET'));
    assert.match(await sprite(page,'left').locator('img').getAttribute('src'),/mira-a-coat-joy/);
    await field(page,'Outfit').selectOption(a+':missing');await applyScene(page,'Apply outfit');
    assert.equal(await sprite(page,'left').locator('img').isVisible(),false);assert.match(await sprite(page,'left').innerText(),/art unavailable/);
    await field(page,'Outfit').selectOption('');await applyScene(page,'Apply outfit');
    await field(page,'Expression to apply · selected source only').selectOption(a+':stern-default');await applyScene(page,'Apply expression');
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
    const finish=()=>page.evaluate(async()=>{await completeImage();Image.prototype.decode=baseDecode;});
    await delay();await button(page,'Reset transient visuals').click();await finish();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('Nothing was saved'));
    assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);
    await delay();await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');await finish();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('STALE_SOURCE'));
    assert.match(await page.locator('.sillynovel-art__background').getAttribute('src'),/tavern.png/);
    await delay();await page.evaluate(()=>{fixture.context.chat[1].mes='canonical edit without a lifecycle event';});await finish();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('STALE_SOURCE'));
    const background=page.locator('.sillynovel-art__background');
    const src=await background.getAttribute('src');
    assert.equal(Boolean(src?.startsWith('blob:')),false);
    assert.equal(await background.isVisible(),false);
});

for (const capability of ['subtle','randomUUID']) test(`session stage: denied ${capability} leaves a complete text reader`,async t=> {
    const page=await fixture(t,'?deny='+capability,()=>{
        window.cryptoErrors=[];
        addEventListener('error',e=>cryptoErrors.push(e.message));
        addEventListener('unhandledrejection',e=>cryptoErrors.push(String(e.reason)));
        Object.defineProperty(crypto,new URLSearchParams(location.search).get('deny'),{value:undefined});
    });
    await page.evaluate(()=>{window.originalComposer=document.getElementById('send_textarea');originalComposer.value='Preserved draft';});
    const canonical=await page.evaluate(()=>JSON.stringify([fixture.context.chat,fixture.context.chatMetadata,fixture.context.characters,fixture.context.connection]));
    for(let i=0;i<2;i++) {
        assert.equal(await page.locator('.sillynovel-visual-unavailable').count(),1);
        assert.match(await page.locator('.sillynovel-visual-unavailable').innerText(),/HTTPS.*localhost.*reload/);
        assert.equal(await page.locator('.sillynovel-art,.sillynovel-controls,.sillynovel-cast,.sillynovel-unsaved').count(),0);
        assert.match(await message(page).innerText(),/Hello reader/);
        await button(page,'Previous').click();assert.equal(await message(page).innerText(),'First message.');
        await button(page,'Next').click();
        await button(page,'Back to Chat').click();assert.equal(await page.locator('#chat').isVisible(),true);
        await button(page,'Return to Reader').click();
        await page.locator('#sillynovel-enabled').uncheck();assert.equal(await page.locator('.sillynovel-visual-unavailable').count(),0);
        await page.locator('#sillynovel-enabled').check();
    }
    assert.equal(await page.evaluate(()=>document.getElementById('send_textarea')===originalComposer),true);
    assert.equal(await page.locator('#send_textarea').inputValue(),'Preserved draft');
    assert.equal(await page.locator('#send_textarea').isVisible(),true);
    assert.equal(await page.evaluate(()=>JSON.stringify([fixture.context.chat,fixture.context.chatMetadata,fixture.context.characters,fixture.context.connection])),canonical);
    assert.deepEqual(await page.evaluate(()=>cryptoErrors),[]);
});

test('session stage: delayed historical hashing neutralizes art before navigation and rejects obsolete work',async t=> {
    const page=await fixture(t);await sceneControls(page);
    const a=await addActor(page,'mira-a');await positionActor(page,a,'left');
    await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');
    await page.locator('.sillynovel-controls summary').click();
    assert.equal(await sprite(page,'left').isVisible(),true);
    await page.evaluate(()=>{
        const digest=crypto.subtle.digest.bind(crypto.subtle);
        window.hashWaiters=[];window.hashFinished=0;
        crypto.subtle.digest=async(...args)=>{
            await new Promise(resolve=>hashWaiters.push(resolve));
            const result=await digest(...args);hashFinished++;return result;
        };
        window.restoreDigest=()=>{crypto.subtle.digest=digest;};
        fixture.setText('edited history under delayed validation',0);
    });
    await page.waitForFunction(()=>hashWaiters.length===1);
    assert.equal(await sprite(page,'left').isVisible(),false);
    assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);
    assert.equal(await page.locator('[aria-label="Background"]').isDisabled(),true);
    await button(page,'Previous').click();
    assert.equal(await message(page).innerText(),'edited history under delayed validation');
    await page.waitForFunction(()=>hashWaiters.length===2);
    assert.equal(await sprite(page,'left').isVisible(),false);
    assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);
    // Complete the abandoned latest-source validation while current navigation is still blocked.
    await page.evaluate(()=>hashWaiters[0]());await page.waitForFunction(()=>hashFinished===1);
    assert.equal(await page.locator('[aria-label="Background"]').isDisabled(),true);
    assert.equal(await sprite(page,'left').isVisible(),false);
    await page.evaluate(()=>{restoreDigest();hashWaiters[1]();});
    await page.waitForFunction(()=>!document.querySelector('[aria-label="Background"]').disabled);
    await button(page,'Next').click();
    await page.waitForFunction(()=>!document.querySelector('[aria-label="Background"]').disabled);
    assert.equal(await sprite(page,'left').isVisible(),false);
    assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);
    assert.equal(await page.locator('#send_textarea').isVisible(),true);
});

test('session stage: history size refusal leaves neutral art and a usable text reader',async t=> {
    const page=await fixture(t);await sceneControls(page);
    await field(page,'Background').selectOption('tavern');await applyScene(page,'Apply background');
    await page.locator('.sillynovel-controls summary').click();
    await page.evaluate(()=>{fixture.context.chat[0].mes='x'.repeat(8*1024*1024+1);fixture.emit('MESSAGE_EDITED',0);});
    await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('8 MiB'));
    assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);
    assert.equal(await page.locator('[aria-label="Background"]').isDisabled(),true);
    assert.match(await message(page).innerText(),/Hello reader/);
    await page.locator('#send_textarea').fill('Text still usable');
    await button(page,'Back to Chat').click();
    assert.equal(await page.locator('#chat').isVisible(),true);
    assert.equal(await page.locator('#send_textarea').inputValue(),'Text still usable');
});

for (const fail of [false,true]) test(`project replacement pauses all visual mutations and ${fail?'failure preserves':'success replaces'} the original scene`,async t=>{
    const page=await fixture(t);
    await page.locator('#sillynovel-enabled').uncheck();
    await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});
    const first={schemaVersion:2,catalog:[],projectId:'11111111-1111-4111-8111-111111111111',name:'First',revision:0,scene:{backgroundAssetId:null,backgroundLocked:true,actors:[]}};
    const second={...first,projectId:'22222222-2222-4222-8222-222222222222',name:'Second'};
    let release,started;
    const requested=new Promise(r=>started=r),gate=new Promise(r=>release=r);
    await page.route('**/api/plugins/sillynovel-storage/**',async route=>{
        const path=new URL(route.request().url()).pathname;
        if(path.endsWith('/'+second.projectId)){
            started();await gate;
            await route.fulfill({status:fail?500:200,json:fail?{code:'LOAD_FAILED'}:second});return;
        }
        await route.fulfill({json:path.endsWith('/capabilities')?{apiVersion:1,schemaVersion:2,catalogVersion:1}:path.endsWith('/projects')?[first,second]:first});
    });
    await page.locator('#sillynovel-enabled').check();
    await page.locator('.sillynovel-controls summary').click();
    await button(page,'Open project and use with this chat').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('First · revision'));
    await page.getByLabel('Project actor name',{exact:true}).fill('Keep me');
    await button(page,'Register project actor').click();
    page.on('dialog',dialog=>dialog.accept());
    await page.getByLabel('Saved project',{exact:true}).selectOption(second.projectId);
    await button(page,'Open project and use with this chat').click();await requested;
    assert.equal(await button(page,'Register project actor').isDisabled(),true);
    assert.equal(await button(page,'Apply background').isDisabled(),true);
    assert.equal(await button(page,'Detach project').isDisabled(),true);
    assert.equal(await page.getByLabel('Project PNG file',{exact:true}).isDisabled(),true);
    assert.equal(await page.locator('#send_textarea').isEnabled(),true);
    // Even a queued/synthetic click cannot bypass the mutation gate.
    await button(page,'Register project actor').dispatchEvent('click');
    assert.equal(await page.locator('.sillynovel-cast').getAttribute('data-count'),'1');
    release();
    await page.waitForFunction(name=>document.querySelector('.sillynovel-project-status').textContent.includes(name+' · revision'),fail?'First':'Second');
    assert.equal(await button(page,'Register project actor').isEnabled(),true);
    assert.equal(await page.locator('.sillynovel-cast').getAttribute('data-count'),fail?'1':'0');
    assert.match(await page.locator('.sillynovel-visual-status').textContent(),/Background locked|LOAD_FAILED/);
    if(fail){await button(page,'Register project actor').click();assert.equal(await page.locator('.sillynovel-cast').getAttribute('data-count'),'2');}
});

for(const outcome of ['success','failure','chat switch','project replacement'])test('portable bundle import preserves current visuals: '+outcome,async t=>{
 const page=await fixture(t);page.setDefaultTimeout(5000);await page.locator('#sillynovel-enabled').uncheck();await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});
 const first={schemaVersion:2,catalog:[],projectId:'11111111-1111-4111-8111-111111111111',name:'First',revision:0,scene:{backgroundAssetId:null,backgroundLocked:true,actors:[]}};
 const imported={...first,projectId:'22222222-2222-4222-8222-222222222222',name:'Imported'};
 let release,started;const gate=new Promise(r=>release=r),seen=new Promise(r=>started=r);let done=false;
 await page.route('**/api/plugins/sillynovel-storage/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/import')){started();await gate;done=true;return route.fulfill({status:outcome==='failure'?400:201,json:outcome==='failure'?{code:'INVALID_BUNDLE'}:imported});}
  await route.fulfill({json:path.endsWith('/capabilities')?{apiVersion:1,schemaVersion:2,catalogVersion:1,bundleVersion:1}:path.endsWith('/projects')?(done?[first,imported]:[first]):first});
 });
 await page.locator('#sillynovel-enabled').check();await page.locator('.sillynovel-controls summary').click();
 await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('First · revision'));
 await page.getByLabel('Project actor name',{exact:true}).fill('Unsaved actor');await button(page,'Register project actor').click();
 await page.getByLabel('Import project bundle',{exact:true}).setInputFiles({name:'copy.sillynovel',mimeType:'application/vnd.sillynovel.bundle',buffer:Buffer.from('{}')});await seen;
 assert.equal(await page.locator('#send_textarea').isEnabled(),true);assert.equal(await page.getByLabel('Import project bundle',{exact:true}).isDisabled(),true);
 if(outcome==='chat switch')await page.evaluate(()=>{fixture.context.chatId='B';fixture.emit('CHAT_CHANGED');});
 if(outcome==='project replacement'){
  page.on('dialog',d=>d.accept());await button(page,'Open project and use with this chat').click();
  await page.waitForFunction(()=>document.querySelector('.sillynovel-cast').dataset.count==='0');
 }
 const received=page.waitForResponse(r=>r.url().endsWith('/projects/import'));release();await received;await page.waitForTimeout(100);
 if(outcome==='success'){
  await page.waitForFunction(()=>document.querySelector('.sillynovel-bundle-status').textContent.includes('Not attached'));
  assert.equal(await page.getByLabel('Saved project',{exact:true}).inputValue(),first.projectId);
  assert.equal(await page.getByLabel('Saved project',{exact:true}).locator('option').count(),2);
 }
 if(outcome==='failure')assert.match(await page.locator('.sillynovel-bundle-status').innerText(),/Import failed: INVALID_BUNDLE/);
 if(['success','failure'].includes(outcome)){
  assert.equal(await page.locator('.sillynovel-cast').getAttribute('data-count'),'1');assert.match(await page.locator('.sillynovel-unsaved').innerText(),/Unsaved project changes/);
 }else {assert.equal(await page.locator('.sillynovel-cast').getAttribute('data-count'),'0');assert.doesNotMatch(await page.locator('.sillynovel-bundle-status').innerText(),/Imported Imported/);}
 assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);
});
test('portable export downloads only a successful bundle, with explicit errors and size refusal',async t=>{
 const page=await fixture(t);await page.locator('#sillynovel-enabled').uncheck();await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});let fail=false;
 const id='11111111-1111-4111-8111-111111111111';
 await page.route('**/api/plugins/sillynovel-storage/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/export'))return route.fulfill(fail?{status:503,json:{code:'CORRUPT_ASSET'}}:{contentType:'application/vnd.sillynovel.bundle',body:'{"format":"test-only"}'});
  await route.fulfill({json:path.endsWith('/capabilities')?{apiVersion:1,schemaVersion:2,catalogVersion:1,bundleVersion:1}:[{projectId:id,name:'Saved'}]});
 });
 await page.locator('#sillynovel-enabled').check();await page.locator('.sillynovel-controls summary').click();
 const download=page.waitForEvent('download');await button(page,'Export project').click();assert.equal((await download).suggestedFilename(),'project.sillynovel');
 fail=true;let downloads=0;page.on('download',()=>downloads++);await button(page,'Export project').click();
 await page.waitForFunction(()=>document.querySelector('.sillynovel-bundle-status').textContent.includes('CORRUPT_ASSET'));assert.equal(downloads,0);
 await page.getByLabel('Import project bundle',{exact:true}).setInputFiles({name:'large.sillynovel',mimeType:'application/vnd.sillynovel.bundle',buffer:Buffer.alloc(8*1024*1024+32769)});
 await page.waitForFunction(()=>document.querySelector('.sillynovel-bundle-status').textContent.includes('up to 8 MiB'));
 assert.equal(await page.locator('#send_textarea').isEnabled(),true);
});

import {CLEANUP_WARNING} from '../plugins/sillynovel-storage/schema.mjs';
for(const outcome of ['cancel','success','stale','lost response','wrong receipt','chat switch','project replacement','disable'])test('unused artwork controls and delayed results: '+outcome,async t=>{
 const page=await fixture(t);await sceneControls(page);
 const first={schemaVersion:2,catalog:[],projectId:'11111111-1111-4111-8111-111111111111',name:'Cleanup First',revision:0,scene:{backgroundAssetId:null,backgroundLocked:true,actors:[]}};
 const second={...first,projectId:'22222222-2222-4222-8222-222222222222',name:'Cleanup Second'};
 const assetId='33333333-3333-4333-8333-333333333333';
 const preview={projectId:first.projectId,revision:0,inventoryRevision:'a'.repeat(64),candidates:[{assetId,sha256:'b'.repeat(64),width:1,height:1,byteCount:123}],reclaimableBytes:123,warning:CLEANUP_WARNING};
 let deletes=0,entered,release;const seen=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 await page.route('**/api/plugins/sillynovel-storage/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/unused-assets/remove')){deletes++;const body=route.request().postDataJSON();assert.deepEqual(body,{expectedRevision:0,inventoryRevision:'a'.repeat(64),assetIds:[assetId]});entered();await gate;
   if(outcome==='lost response')return route.abort('failed');
   if(outcome==='stale')return route.fulfill({status:409,json:{code:'CLEANUP_STALE'}});
   return route.fulfill({json:{projectId:outcome==='wrong receipt'?second.projectId:first.projectId,revision:0,deletedIds:[assetId],deletedCount:1,reclaimedBytes:123}});
  }
  return route.fulfill({json:path.endsWith('/capabilities')?{apiVersion:1,schemaVersion:2,catalogVersion:1,cleanupVersion:1}:path.endsWith('/unused-assets')?preview:path.endsWith('/projects')?[first,second]:path.endsWith(second.projectId)?second:first});
 });
 // Re-enable to repeat the single capability probe after installing the fixture routes.
 await page.locator('#sillynovel-enabled').uncheck();await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});await page.locator('#sillynovel-enabled').check();await sceneControls(page);
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Saved project"]').disabled);
 await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Cleanup First · revision'));
 await button(page,'Review unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-list input'));
 assert.match(await page.locator('.sillynovel-cleanup-status').innerText(),/1 unused.*123 logical bytes/);
 assert.match(await page.locator('.sillynovel-cleanup-warning').innerText(),/Other tabs/);
 assert.equal(deletes,0);await page.locator('.sillynovel-cleanup-list input').check();assert.match(await page.locator('.sillynovel-cleanup-selected').innerText(),/1 selected.*123 logical bytes/);
 page.on('dialog',dialog=>{assert.match(dialog.message(),/1 unused.*123 logical bytes/);return outcome==='cancel'?dialog.dismiss():dialog.accept();});
 await button(page,'Remove selected unused artwork').click();
 if(outcome==='cancel'){assert.equal(deletes,0);assert.equal(await page.locator('.sillynovel-cleanup-list input').count(),1);return;}
 await seen;assert.equal(await page.locator('#send_textarea').isEnabled(),true);
 if(outcome==='chat switch')await page.evaluate(()=>{fixture.context.chatId='cleanup-B';fixture.emit('CHAT_CHANGED','cleanup-B');});
 if(outcome==='project replacement'){await page.getByLabel('Saved project',{exact:true}).selectOption(second.projectId);await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Cleanup Second · revision'));}
 if(outcome==='disable')await page.locator('#sillynovel-enabled').uncheck();
 release();
 if(['success','stale','lost response','wrong receipt'].includes(outcome)){
  await page.waitForFunction(()=>!document.querySelector('.sillynovel-cleanup-status').textContent.includes('Removing'));
  const text=await page.locator('.sillynovel-cleanup-status').innerText();assert.match(text,outcome==='success'?/Cleanup completed.*123 logical bytes/:outcome==='stale'?/Preview expired/:/outcome uncertain/);
  assert.equal(await page.locator('.sillynovel-cleanup-list input').count(),0);
  await page.getByLabel('Project actor name',{exact:true}).fill('Keep edits');await button(page,'Register project actor').click();assert.equal(await button(page,'Review unused artwork').isDisabled(),true);assert.match(await page.locator('.sillynovel-cleanup-status').innerText(),/Save or discard/);
 }else{
  await page.waitForTimeout(100);
  if(outcome==='disable')assert.equal(await page.locator('#sillynovel-stage').count(),0);
  else assert.doesNotMatch(await page.locator('.sillynovel-cleanup-status').innerText(),/Cleanup completed/);
 }
});

test('project library actual entry edits labels, unregisters, saves and reloads/reopens compatible alternatives',async t=>{
 const page=await fixture(t);page.setDefaultTimeout(5000);await page.locator('#sillynovel-enabled').uncheck();await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});
 const id='11111111-1111-4111-8111-111111111111',actor='22222222-2222-4222-8222-222222222222';
 const ids=['33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666'];
 let record={schemaVersion:2,projectId:id,name:'Reusable library',revision:0,
  scene:{backgroundAssetId:ids[1],backgroundLocked:true,actors:[{actorId:actor,name:'Manual actor',spriteAssetId:ids[3],slot:'left',present:true,locks:{presence:true,slot:true,outfit:true}}]},
  catalog:ids.map((assetId,i)=>({assetId,label:'Same label',kind:i<2?'background':'sprite',actorId:i<2?null:actor}))};
 const png=await readFile(resolve(root,'tests/fixtures/m12-stage/mira-a.png')),{createHash}=await import('node:crypto'),sha=createHash('sha256').update(png).digest('hex');
 const saves=[];
 await page.route('**/api/plugins/sillynovel-storage/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path.includes('/assets/'))return route.fulfill({contentType:'image/png',headers:{'X-Content-SHA256':sha},body:png});
  if(request.method()==='PUT'){
   const body=request.postDataJSON();assert.equal(body.expectedRevision,record.revision);saves.push(structuredClone(body));record={...record,...body,revision:record.revision+1};delete record.expectedRevision;return route.fulfill({json:record});
  }
  return route.fulfill({json:path.endsWith('/capabilities')?{apiVersion:1,schemaVersion:2,catalogVersion:1}:path.endsWith('/projects')?[record]:record});
 });
 const field=name=>page.getByLabel(name,{exact:true});
 const open=async()=>{await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});await page.locator('#sillynovel-enabled').check();await page.locator('.sillynovel-controls summary').click();await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Reusable library · revision'));};
 await open();await page.locator('#send_textarea').fill('Keep native draft');
 await field('Library artwork').selectOption(actor+':'+ids[2]);await field('Artwork label').fill('<b>Alternative</b>');await button(page,'Save artwork label').click();
 assert.equal(await page.locator('.sillynovel-controls b').count(),0);assert.match(await page.locator('.sillynovel-unsaved').innerText(),/Unsaved/);
 await button(page,'Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('revision 1'));
 assert.equal(saves[0].catalog.find(a=>a.assetId===ids[2]).label,'<b>Alternative</b>');
 page.on('dialog',dialog=>dialog.accept());await field('Library artwork').selectOption(ids[0]);await button(page,'Remove artwork from library').click();
 assert.match(await page.locator('.sillynovel-unsaved').innerText(),/Unsaved/);assert.equal(await field('Library artwork').locator('option').count(),3);
 await button(page,'Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('revision 2'));
 assert.equal(saves[1].catalog.some(a=>a.assetId===ids[0]),false);assert.equal(saves[1].scene.backgroundAssetId,ids[1]);assert.equal(await page.locator('#send_textarea').inputValue(),'Keep native draft');
 await button(page,'Detach project').click();assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project/);
 await page.reload();await open();assert.equal(await field('Library artwork').locator('option').count(),3);assert.equal(await field('Background').locator('option').count(),2);assert.equal(await field('Outfit').locator('option').count(),3);
 assert.ok((await field('Outfit').textContent()).includes('<b>Alternative</b>'));assert.equal(await page.locator('.sillynovel-controls b').count(),0);
 await field('Outfit').selectOption(actor+':'+ids[2]);await button(page,'Apply outfit').click();await button(page,'Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('revision 3'));
 assert.equal(saves[2].scene.actors[0].spriteAssetId,ids[2]);assert.deepEqual(saves[2].scene.actors[0].locks,{presence:true,slot:true,outfit:true});assert.equal(saves[2].scene.actors[0].slot,'left');
});
test('migration-required storage leaves original reader, composer and transient controls usable',async t=>{
 const page=await fixture(t);page.setDefaultTimeout(5000);await page.locator('#sillynovel-enabled').uncheck();await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});await page.route('**/api/plugins/sillynovel-storage/**',route=>route.fulfill({status:503,json:{code:'MIGRATION_REQUIRED'}}));
 await page.locator('#sillynovel-enabled').check();await page.locator('.sillynovel-controls summary').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('explicit v1 backup/migration'));
 assert.equal(await button(page,'Open project and use with this chat').isDisabled(),true);assert.equal(await button(page,'Register session actor').isEnabled(),true);assert.equal(await page.locator('#send_textarea').isEnabled(),true);assert.match(await message(page).innerText(),/Hello reader/);
});

async function projectUX(t,outcome='saved') {
 const page=await fixture(t);page.setDefaultTimeout(5000);await page.locator('#sillynovel-enabled').uncheck();await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});
 let record={schemaVersion:2,catalog:[],projectId:'12345678-1111-4111-8111-111111111111',name:'Readable project',revision:0,scene:{backgroundAssetId:null,backgroundLocked:false,actors:[]}},puts=0,release;
 const gate=new Promise(r=>release=r);
 await page.route('**/api/plugins/sillynovel-storage/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(req.method()==='PUT'){
   puts++;await gate;
   if(outcome==='conflict')return route.fulfill({status:409,json:{code:'REVISION_CONFLICT'}});
   if(outcome==='uncertain')return route.abort();
   if(outcome==='invalid')return route.fulfill({json:{projectId:record.projectId,revision:99}});
   record={...record,...req.postDataJSON(),revision:record.revision+1};return route.fulfill({json:record});
  }
  return route.fulfill({json:path.endsWith('/capabilities')?{apiVersion:1,schemaVersion:2,catalogVersion:1,cleanupVersion:1}:path.endsWith('/projects')?[record]:record});
 });
 await page.locator('#sillynovel-enabled').check();await sceneControls(page);
 await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').title==='12345678-1111-4111-8111-111111111111');
 return {page,release,puts:()=>puts};
}
for(const outcome of ['saved','conflict','uncertain','invalid'])test('project UX: identity, pending and durable save recovery status · '+outcome,async t=>{
 const {page,release,puts}=await projectUX(t,outcome);
 assert.deepEqual(await page.locator('.sillynovel-controls legend').allTextContents(),['Project','Scene','Artwork Library']);
 assert.match(await page.locator('.sillynovel-project-status').innerText(),/Readable project.*12345678.*Attached/);
 assert.match(await page.locator('.sillynovel-project-scope').innerText(),/Message-specific visual history is not saved/);
 await page.getByLabel('Project actor name',{exact:true}).fill('Keep edits');await button(page,'Register project actor').click();
 assert.equal(await page.locator('.sillynovel-unsaved').getAttribute('data-state'),'dirty');
 await button(page,'Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='pending');
 await page.locator('#send_textarea').fill('Native draft during save');assert.equal(await button(page,'Save project').isDisabled(),true);
 for(const name of ['Create project and use with this chat','Open project and use with this chat','Discard and reopen attached project'])assert.equal(await button(page,name).isDisabled(),true);
 release();const expected=outcome==='saved'?'saved':outcome==='conflict'?'conflict':'uncertain';
 await page.waitForFunction(expected=>document.querySelector('.sillynovel-unsaved').dataset.state===expected,expected);
 if(outcome!=='saved'){
  assert.equal(await button(page,'Save project').isDisabled(),true);assert.equal(await button(page,'Review unused artwork').isDisabled(),true);
  await button(page,'Apply background').click();assert.equal(await page.locator('.sillynovel-unsaved').getAttribute('data-state'),expected);
  page.once('dialog',d=>d.dismiss());await button(page,'Discard and reopen attached project').click();
  assert.match(await page.locator('.sillynovel-cast').innerText(),/Keep edits/);assert.equal(puts(),1);
  page.once('dialog',d=>d.accept());await button(page,'Discard and reopen attached project').click();
  await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='saved');
  assert.equal(await page.locator('.sillynovel-cast').getAttribute('data-count'),'0');
 }
 assert.equal(await page.locator('#send_textarea').inputValue(),'Native draft during save');
 await button(page,'Detach project').click();assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project.*detached by you/);
 assert.equal(await page.locator('.sillynovel-unsaved').getAttribute('data-state'),'session');
});
test('project UX: discard cancel, actor feedback, local Escape focus and narrow composer',async t=>{
 const {page}=await projectUX(t);const actor=page.getByLabel('Project actor',{exact:true});
 for(const name of ['Mira','Mira','Rowan','Sage']){await page.getByLabel('Project actor name',{exact:true}).fill(name);await button(page,'Register project actor').click();}
 assert.equal(await actor.locator('option').count(),4);assert.equal(new Set(await actor.locator('option').allTextContents()).size,4);
 await page.getByLabel('Presence',{exact:true}).selectOption('false');await button(page,'Apply presence').click();
 assert.match(await page.locator('.sillynovel-selected-art').innerText(),/Sage.*absent.*offstage.*locks: presence/);
 page.once('dialog',d=>d.dismiss());await button(page,'Detach project').click();assert.equal(await actor.locator('option').count(),4);
 await page.setViewportSize({width:390,height:550});await actor.focus();await page.keyboard.press('Escape');
 assert.equal(await page.locator('.sillynovel-controls').getAttribute('open'),null);
 assert.equal(await page.locator('.sillynovel-controls summary').evaluate(e=>e===document.activeElement),true);
 assert.equal(await page.locator('.sillynovel-art').isVisible(),false);assert.ok((await page.locator('.sillynovel-dialogue').boundingBox()).height>60);
 await page.locator('#send_textarea').fill('Keyboard draft');await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#send_textarea').inputValue(),'Keyboard draft');
 assert.equal(await page.locator('#send_textarea').isVisible(),true);
 await page.evaluate(()=>{fixture.context.chatId='native-B';fixture.emit('CHAT_CHANGED');});
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('detached after a native conversation switch'));
 await page.evaluate(()=>{fixture.context.chatId='synthetic-A';fixture.emit('CHAT_CHANGED');});
 await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='session');
 assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);
});

async function attachedExpressions(t,group=false){
 const page=await fixture(t);page.setDefaultTimeout(6000);await page.locator('#sillynovel-enabled').uncheck();await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});
 if(group)await page.evaluate(()=>{fixture.context.groupId='G';fixture.context.groups=[{id:'G',name:'Four member group',chat_id:fixture.context.chatId,members:['Mira.png','Mira1.png','Rowan.png','Sage.png']}];fixture.context.chat[0]={name:'Mira',mes:'First message.'};});
 const aid='22222222-2222-4222-8222-222222222222',bid='33333333-3333-4333-8333-333333333333',bgid='44444444-4444-4444-8444-444444444444';
 const actors=['11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555'];
 let record={schemaVersion:2,projectId:'12345678-1111-4111-8111-111111111111',name:'Expression project',revision:4,catalog:[{assetId:aid,kind:'sprite',actorId:actors[0],label:'Base'},{assetId:bid,kind:'sprite',actorId:actors[1],label:'Other Mira'},{assetId:bgid,kind:'background',actorId:null,label:'Forest'}],scene:{backgroundAssetId:bgid,backgroundLocked:true,actors:actors.map((actorId,i)=>({actorId,name:'Mira',present:true,slot:i?'right':'left',spriteAssetId:i?bid:aid,locks:{presence:true,slot:true,outfit:true}}))}};
 const original=structuredClone(record),saves=[];
 await page.route('**/api/plugins/sillynovel-storage/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path.includes('/assets/'))return route.fulfill({contentType:'image/png',body:await readFile(resolve(root,'tests/fixtures/m12-stage',path.endsWith(bgid)?'forest.png':path.endsWith(aid)?'mira-a.png':'rowan.png'))});
  if(req.method()==='PUT'){saves.push(req.postDataJSON());record={...record,...req.postDataJSON(),revision:record.revision+1};return route.fulfill({json:record});}
  return route.fulfill({json:path.endsWith('/capabilities')?{apiVersion:1,schemaVersion:2,catalogVersion:1}:path.endsWith('/projects')?[record]:record});
 });
 await page.locator('#sillynovel-enabled').check();await sceneControls(page);await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
 await page.getByLabel('Project actor',{exact:true}).selectOption(actors[0]);
 const expression=page.getByLabel('Expression to apply · selected source only',{exact:true}),image=page.locator('.sillynovel-sprite--left img');
 const upload=async(label='Happy',file='mira-a-joy.png')=>{await page.getByLabel('Temporary expression label',{exact:true}).fill(label);const picker=page.getByLabel('Temporary expression PNG',{exact:true});await picker.focus();assert.equal(await picker.evaluate(e=>e===document.activeElement),true);const chooser=page.waitForEvent('filechooser');await picker.click();await(await chooser).setFiles(resolve(root,'tests/fixtures/m12-stage',file));await page.waitForFunction(()=>document.querySelector('.sillynovel-expression-context').textContent.includes('Temporary expression ready'));return expression.inputValue();};
 const apply=async id=>{if(id)await expression.selectOption(id);await button(page,'Apply expression').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').dataset.expression!=='');return image.getAttribute('src');};
 return {page,actors,original,saves,expression,image,upload,apply};
}
for(const group of [false,true])test((group?'group ':'')+'attached message expressions: actual UI, navigation/revisit, save exclusion, invalidation and reload',async t=>{
 const x=await attachedExpressions(t,group),{page}=x,base=await x.image.getAttribute('src');
 await button(page,'Previous').click();const happy=await x.upload();const happyURL=await x.apply(happy);
 await button(page,'Next').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').dataset.expression==='');assert.equal(await x.image.getAttribute('src'),base);
 const stern=await x.upload('Stern','mira-a-stern.png'),sternURL=await x.apply(stern);assert.notEqual(sternURL,happyURL);
 await button(page,'Previous').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').dataset.expression!=='');assert.equal(await x.image.getAttribute('src'),happyURL);
 await page.evaluate(()=>{fixture.context.chat.push({name:'You',is_user:true,mes:'Appended while pinned'});fixture.renderNative();fixture.emit('MESSAGE_RECEIVED',2);});
 assert.equal(await x.image.getAttribute('src'),happyURL);assert.equal(await message(page).innerText(),'First message.');
 await page.locator('#send_textarea').fill('Draft preserved 日本語');await page.locator('#send_textarea').focus();await button(page,'Next').click();assert.equal(await page.locator('#send_textarea').inputValue(),'Draft preserved 日本語');assert.equal(await page.locator('#send_textarea').evaluate(e=>e===document.activeElement),true);
 assert.equal(await x.image.getAttribute('src'),sternURL);assert.equal(await page.locator('.sillynovel-unsaved').getAttribute('data-state'),'saved');
 await button(page,'Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('revision 5'));assert.equal(x.saves.length,1);assert.deepEqual(x.saves[0].scene,x.original.scene);assert.deepEqual(x.saves[0].catalog,x.original.catalog);assert.doesNotMatch(JSON.stringify(x.saves[0]),/expression|session-source|prefixSha256/);
 await text(page,'Changed selected source',1);await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').dataset.expression==='');assert.equal(await x.image.getAttribute('src'),base);assert.match(await page.locator('.sillynovel-expression-context').innerText(),/invalidated/);
 await button(page,'Previous').click();assert.equal(await x.image.getAttribute('src'),happyURL);await button(page,'Clear expression').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').dataset.expression==='');assert.equal(await x.image.getAttribute('src'),base);
 await page.reload();await page.evaluate(()=>{fixture.context.getRequestHeaders=()=>({});});await page.locator('#sillynovel-enabled').check();await sceneControls(page);await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);assert.equal(await x.expression.locator('option').count(),1);
});
for(const group of [false,true])for(const boundary of ['selection','edit','swipe','outfit','actor','chat','replace','detach','disable'])test((group?'group ':'')+'attached PNG delayed actual-entry decode rejects '+boundary,async t=>{
 const x=await attachedExpressions(t,group),{page}=x;
 await page.evaluate(()=>{const original=Image.prototype.decode;Image.prototype.decode=function(){window.expressionDecodeStarted=true;return new Promise(resolve=>window.finishExpressionDecode=()=>original.call(this).then(resolve));};});
 await page.getByLabel('Temporary expression PNG',{exact:true}).setInputFiles(resolve(root,'tests/fixtures/m12-stage/mira-a-joy.png'));await page.waitForFunction(()=>window.expressionDecodeStarted);
 if(boundary==='selection')await button(page,'Previous').click();
 if(boundary==='edit')await text(page,'Edited while decoding');
 if(boundary==='swipe')await page.evaluate(()=>{fixture.context.chat[1].swipe_id=1;fixture.emit('MESSAGE_SWIPED',1);});
 if(boundary==='outfit'){await page.getByLabel('Outfit',{exact:true}).selectOption('');await button(page,'Apply outfit').click();}
 if(boundary==='actor')await page.getByLabel('Project actor',{exact:true}).selectOption(x.actors[1]);
 if(boundary==='chat')await page.evaluate(()=>{fixture.context.chatId='B';fixture.emit('CHAT_CHANGED');});
 if(boundary==='replace')await button(page,'Open project and use with this chat').click();
 if(boundary==='detach')await button(page,'Detach project').click();
 if(boundary==='disable')await page.locator('#sillynovel-enabled').uncheck();
 await page.evaluate(()=>window.finishExpressionDecode());
 if(['selection','edit','swipe','outfit','actor'].includes(boundary)){await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('STALE_SOURCE'));assert.equal(await x.expression.locator('option').count(),1);}
 else if(boundary!=='disable')assert.equal(await page.locator('.sillynovel-sprite img[data-expression]:not([data-expression=""])').count(),0);
 assert.equal(await page.locator('#send_textarea').isEnabled(),true);
});
test('attached missing expression image falls back to base outfit; clear, no dirty changes',async t=>{
 const x=await attachedExpressions(t);const base=await x.image.getAttribute('src'),id=await x.upload();await x.apply(id);
 await x.image.evaluate(e=>e.dispatchEvent(new Event('error')));await x.page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').dataset.expression==='');assert.equal(await x.image.getAttribute('src'),base);assert.equal(await x.page.locator('.sillynovel-unsaved').getAttribute('data-state'),'saved');assert.match(await x.page.locator('.sillynovel-expression-context').innerText(),/unavailable/);
});

for(const group of [false,true])for(const movement of ['prefix-only','selected-index'])test((group?'group ':'')+'attached expressions automatically reconcile unchanged-object reorder: '+movement,async t=>{
 const x=await attachedExpressions(t,group),{page}=x;
 await page.evaluate(()=>{fixture.context.chat.push({name:'Mira',mes:'Pinned unchanged source.\n\n'+('A paragraph for scrolling.\n\n'.repeat(60))},{name:'You',is_user:true,mes:'Later unchanged source'},{name:'Mira',mes:'Unchanged head'});fixture.renderNative();fixture.emit('MESSAGE_RECEIVED',4);});
 await button(page,'Previous').click();await button(page,'Previous').click();const base=await x.image.getAttribute('src'),happy=await x.upload();const happyURL=await x.apply(happy);
 await page.evaluate(()=>{
  window.pinnedObject=fixture.context.chat[2];window.prefixEncodes=0;window.expressionHashes=0;
  const encode=TextEncoder.prototype.encode;TextEncoder.prototype.encode=function(...args){prefixEncodes++;return encode.apply(this,args);};
  const digest=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=async(...args)=>{expressionHashes++;if(window.holdExpressionHash)await new Promise(resolve=>window.releaseExpressionHash=resolve);return digest(...args);};
  const dialogue=document.querySelector('.sillynovel-dialogue');dialogue.scrollTop=100;dialogue.dispatchEvent(new Event('scroll'));fixture.emit('MESSAGE_EDITED',0);
 });
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.deepEqual(await page.evaluate(()=>[prefixEncodes,expressionHashes]),[0,0],'scroll and unchanged canonical reconciliation do not validate history again');assert.equal(await x.image.getAttribute('src'),happyURL);
 const immediate=await page.evaluate(movement=>{
  window.holdExpressionHash=true;const chat=fixture.context.chat;
  if(movement==='prefix-only')[chat[0],chat[1]]=[chat[1],chat[0]];else [chat[1],chat[2]]=[chat[2],chat[1]];
  fixture.emit('MESSAGE_EDITED',0); // Canonical host refresh only; no overlay method or navigation.
  return {expression:document.querySelector('.sillynovel-sprite--left img').dataset.expression,sourcePreserved:chat.includes(pinnedObject),message:document.querySelector('.sillynovel-dialogue__message').textContent};
 },movement);
 assert.equal(immediate.sourcePreserved,true);assert.match(immediate.message,/Pinned unchanged source/);assert.equal(immediate.expression,'','remove overlay synchronously before checking changed correspondence');
 await page.waitForFunction(()=>typeof window.releaseExpressionHash==='function');assert.equal(await button(page,'Apply expression').isDisabled(),true);assert.equal(await x.image.getAttribute('src'),base);assert.equal(await page.locator('#send_textarea').isEnabled(),true);
 await page.evaluate(()=>{window.holdExpressionHash=false;releaseExpressionHash();});
 await page.waitForFunction(()=>document.querySelector('.sillynovel-expression-context').textContent.includes('invalidated'));assert.equal(await x.image.getAttribute('src'),base);assert.equal(await x.expression.locator('option').count(),1);assert.match(await message(page).innerText(),/^Pinned unchanged source/);assert.equal(await page.locator('.sillynovel-unsaved').getAttribute('data-state'),'saved');
});

for(const change of ['group','chat','individual','replacement','deleted','contradictory'])test('group attachment invalidates on eventless native owner change: '+change,async t=>{
 const x=await attachedExpressions(t,true),{page}=x;await x.apply(await x.upload());
 await page.evaluate(change=>{
  const c=fixture.context;
  if(change==='group'){c.groupId='B';c.groups.push({id:'B',name:'Group B',chat_id:c.chatId});}
  if(change==='chat'){c.chatId='other';c.groups[0].chat_id=c.chatId;}
  if(change==='individual')c.groupId=null;
  if(change==='replacement')c.groups[0]={...c.groups[0]};
  if(change==='deleted')c.groups=[];
  if(change==='contradictory')c.groups[0].chat_id='not-current';
  fixture.renderNative(); // DOM fallback only; no synthetic CHAT_CHANGED.
 },change);
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));
 assert.equal(await page.locator('.sillynovel-sprite img[data-expression]:not([data-expression=""])').count(),0);
 if(['deleted','contradictory'].includes(change))assert.equal(await button(page,'Open project and use with this chat').isDisabled(),true);
 await page.evaluate(()=>{const c=fixture.context;c.groupId='G';c.chatId='synthetic-A';c.groups=[{id:'G',name:'Returned group',chat_id:c.chatId}];fixture.emit('CHAT_CHANGED');});
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Saved project"]').disabled);
 assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);
 await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);assert.equal(await x.expression.locator('option').count(),1);
});

test('group member reorder/drafted speaker leaves manual UUIDs, selection, three-slot cast and expression unchanged',async t=>{
 const x=await attachedExpressions(t,true),{page}=x;
 for(const name of ['Rowan','Sage']){await page.getByLabel('Project actor name',{exact:true}).fill(name);await button(page,'Register project actor').click();}
 await page.waitForFunction(()=>document.querySelector('.sillynovel-cast').dataset.count==='4');
 const actor=page.getByLabel('Project actor',{exact:true}),keys=await actor.locator('option').evaluateAll(os=>os.map(o=>o.value));
 await actor.selectOption(keys[2]);await field(page,'Position').selectOption('center');await button(page,'Apply position').click();
 await actor.selectOption(keys[0]);await x.apply(await x.upload());const url=await x.image.getAttribute('src');
 const before=await page.locator('.sillynovel-cast').innerText();
 await page.evaluate(()=>{fixture.context.groups[0].members.reverse();fixture.context.characterId=3;fixture.emit('GENERATION_STARTED','normal',{},true);fixture.renderNative();});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.equal(await x.image.getAttribute('src'),url);assert.equal(await page.locator('.sillynovel-cast').innerText(),before);assert.equal(await actor.inputValue(),keys[0]);
 await page.setViewportSize({width:390,height:800});assert.equal(await page.locator('.sillynovel-native-context').evaluate(e=>e.scrollHeight<=e.clientHeight),true);
 assert.match(before,/Sage.*offstage/);assert.equal(await page.locator('.sillynovel-sprite:not([hidden])').count(),3);assert.match(await page.locator('.sillynovel-native-context').innerText(),/Native speaker: Mira/);
});

for(const operation of ['load','save'])test('group delayed '+operation+' completion refreshes unannounced ownership before accepting authority',async t=>{
 const x=await attachedExpressions(t,true),{page}=x;
 let release,entered;const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r);
 await page.route('**/api/plugins/sillynovel-storage/projects/'+x.original.projectId,async route=>{
  if(route.request().method()!==(operation==='load'?'GET':'PUT'))return route.fallback();
  entered();await gate;await route.fulfill({json:{...x.original,revision:operation==='save'?5:4}});
 });
 await button(page,operation==='save'?'Save project':'Open project and use with this chat').click();await seen;
 await page.evaluate(()=>{const c=fixture.context;c.groupId='B';c.groups.push({id:'B',name:'Group B',chat_id:c.chatId});});
 release();await page.waitForFunction(()=>!document.querySelector('.sillynovel-project-status').textContent.includes('Opening project'));
 await page.evaluate(()=>fixture.renderNative());await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));
 assert.equal(await page.locator('.sillynovel-sprite:not([hidden])').count(),0);assert.equal(await page.locator('#send_textarea').isEnabled(),true);
});


test('eventless group generation start survives activation and refuses expressions on explicitly reopened head',async t=>{
 const x=await attachedExpressions(t,true),{page}=x;
 await page.evaluate(()=>{
  const c=fixture.context;c.groupId='B';c.chatId='B';c.groups.push({id:'B',name:'Generating group',chat_id:'B'});
  c.chat=[{name:'Mira',mes:'Stable older B'},{name:'Mira',mes:'Active head B'}];
  fixture.emit('GENERATION_STARTED','normal',{},false); // First ownership signal; no CHAT_CHANGED or DOM wake-up.
 });
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));
 await button(page,'Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
 assert.match(await page.locator('.sillynovel-reader__status').innerText(),/A new reply is being generated/);assert.equal(await message(page).innerText(),'Active head B');
 assert.equal(await x.expression.isDisabled(),true);assert.equal(await button(page,'Apply expression').isDisabled(),true);assert.equal(await page.getByLabel('Temporary expression PNG',{exact:true}).isDisabled(),true);
 await page.evaluate(()=>fixture.emit('GENERATION_ENDED',fixture.context.chat.length));
 assert.equal(await x.expression.isDisabled(),true,'unresolved end does not grant head authority');
 await button(page,'Previous').click();await page.waitForFunction(()=>!document.querySelector('[aria-label="Expression to apply · selected source only"]').disabled);assert.equal(await message(page).innerText(),'Stable older B');
 assert.equal(await page.locator('#send_textarea').isEnabled(),true);assert.equal(await page.locator('.sillynovel-unsaved').getAttribute('data-state'),'saved');
});
