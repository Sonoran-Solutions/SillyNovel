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
    ...['index.js', 'style.css', 'src/shell.mjs', 'src/reader-view.mjs', 'src/reader-source-model.mjs', 'src/host-adapter.mjs'].map(path => ['/' + path, resolve(root, path)]),
]);
before(async () => {
    server = createServer(async (req,res) => {
        const path = new URL(req.url, 'http://localhost').pathname;
        if (path === '/lib.js') {
            res.writeHead(200, { 'content-type': 'text/javascript' }).end('export const showdown = window.showdown; export const DOMPurify = window.DOMPurify;');
            return;
        }
        if (!files.has(path)) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'content-type': path.endsWith('.html') || path === '/' ? 'text/html' : path.endsWith('.css') ? 'text/css' : 'text/javascript' }).end(await readFile(files.get(path)));
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

test('backlog re-resolves reordered objects, returns pinned selection and reports locator fallback', async t => {
    const page = await fixture(t);
    await button(page,'Previous').click();
    await page.evaluate(() => {fixture.context.chat.unshift({name:'Mira',mes:'inserted'});fixture.renderNative();});
    await button(page,'Open Original Message').click();
    assert.equal(await page.locator('#chat').isVisible(),true);
    assert.match(await page.locator('.sillynovel-native-bar__status').innerText(),/Original message located/);
    await button(page,'Return to Reader').click();
    assert.equal(await message(page).innerText(),'First message.');
    await page.evaluate(() => document.querySelector('#chat .mes[mesid="1"]').remove());
    await button(page,'Backlog').click();
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
