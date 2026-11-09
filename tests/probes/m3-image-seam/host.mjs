// M3.2 PR A seam probe: the host's own `imagine` callback against the loopback fake ComfyUI on the disposable pinned host.
// A measurement, not a test of shipped code. Synthetic data and loopback fixtures only; never 8188.
// node tests/probes/m3-image-seam/host.mjs <pinned-host-root>   (SN_PLAYWRIGHT_MODULE set; port 8128 free)
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHarness, DECOYS, PIN, repo } from '../m2-director/harness.mjs';
import { RESULT_PNG_SHA256 } from '../../fixtures/m3-comfy-endpoint.mjs';

const MiB = 1024 * 1024;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const CHAT_DECOY = 'DECOY-CHAT-MESSAGE-5e19';
const DECOY_STRINGS = [...Object.values(DECOYS), CHAT_DECOY];
const FIXTURE = join(repo, 'tests/fixtures/m3-comfy-endpoint.mjs');
const CHAT_FILE = 'Seam reading';
const BASE = { prompt_prefix: 'SN-PREFIX-TEXT,', negative_prompt: 'SN-NEG-PREFIX' };

// The host's combinePrefixes (stable-diffusion/index.js L969-983 at the pin), restated in Node for the expected wire text.
function combinePrefixes(str1, str2, macro = '') {
    const process = s => s.trim().replace(/^,|,$/g, '').trim();
    if (!str2) return str1;
    str1 = process(str1); str2 = process(str2);
    return process(macro && str1.includes(macro) ? str1.replace(macro, str2) : `${str1}, ${str2},`);
}
// Wire files never keep base64 payloads: each long run becomes its length and SHA-256.
const scrub = value => typeof value === 'string'
    ? value.replace(/[A-Za-z0-9+/]{1000,}={0,2}/g, run => `<base64 length=${run.length} sha256=${sha(run)}>`)
    : Array.isArray(value) ? value.map(scrub)
        : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v)])) : value;
async function writeBounded(file, value) {
    const text = JSON.stringify(scrub(value), null, 1);
    const bytes = Buffer.byteLength(text);
    await writeFile(file, bytes <= MiB ? text : JSON.stringify({ truncated: true, originalLength: bytes, sha256: sha(text), head: text.slice(0, MiB / 2) }));
}

const h = await createHarness(resolve(process.argv[2]), 'm3-image-seam');
const { page, native, requests, seedDecoys, connect, root } = h;
const wireDir = join(root, 'wire');
await mkdir(wireDir, { recursive: true });
const evidence = { candidate: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), host: PIN, node: process.version, fixtureSha256: sha(await readFile(FIXTURE)), setup: {}, cases: [], findings: [],
    notTested: ['Real ComfyUI (the owner\'s 127.0.0.1:8188 was never contacted)', 'Other host versions, including the owner\'s 1.18.0', 'Other image-aware extensions (SD_PROMPT_PROCESSING listeners)', 'RunPod serverless and every cloud source', 'Physical devices', 'Group chats', 'Non-default sampler/model/VAE selections'] };
let fixture, fixtureOut = '', fixtureOrigin, verdict = 'STOP';

async function stopFixture() {
    if (!fixture || fixture.exitCode !== null) return;
    const done = new Promise(r => fixture.once('close', r));
    fixture.kill('SIGTERM');
    await Promise.race([done, delay(5000)]);
    if (fixture.exitCode === null) { fixture.kill('SIGKILL'); await done; }
}
const comfy = async (path, body) => (await fetch(fixtureOrigin + path, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) })).json();

// Browser-side capture of every same-origin /api/ request, with bodies only where the brief asks.
const apiLog = [], dialogs = [];
function summarizeUpload(text) {
    try { const b = JSON.parse(text); return { ch_name: b.ch_name, filename: b.filename, format: b.format, imageLength: String(b.image ?? '').length, imageSha256: sha(String(b.image ?? '')) }; } catch { return { unparsed: true, length: text?.length ?? 0 }; }
}
page.on('request', req => {
    const url = new URL(req.url());
    if (url.origin !== h.origin || !url.pathname.startsWith('/api/') || apiLog.length > 5000) return;
    const entry = { method: req.method(), path: url.pathname };
    if (url.pathname === '/api/sd/comfy/generate') entry.body = req.postData();
    if (url.pathname === '/api/images/upload') entry.upload = summarizeUpload(req.postData());
    apiLog.push(entry);
});
page.on('dialog', d => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });

const imagesRoot = join(h.data, 'default-user/user/images');
async function images() {
    const files = {};
    async function walk(dir) {
        let entries;
        try { entries = await readdir(dir, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
        for (const e of entries) {
            const file = join(dir, e.name);
            if (e.isDirectory()) await walk(file);
            else { const b = await readFile(file); files[file.slice(imagesRoot.length + 1)] = { bytes: b.length, sha256: sha(b) }; }
        }
    }
    await walk(imagesRoot);
    return files;
}
const newFiles = (before, after) => Object.keys(after).filter(k => !before[k] || before[k].sha256 !== after[k].sha256);
const watchToasts = () => page.evaluate(() => {
    window.__toasts = [];
    new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.classList?.contains('toast')) window.__toasts.push(n.textContent.trim()); }).observe(document.body, { childList: true, subtree: true });
});
async function snapshot() {
    const s = await page.evaluate(() => {
        const c = SillyTavern.getContext();
        return { sd: JSON.parse(JSON.stringify(c.extensionSettings.sd)), chatJson: JSON.stringify(c.chat), chatLength: c.chat.length, chatId: c.getCurrentChatId(),
            background: getComputedStyle(document.querySelector('#bg1')).backgroundImage,
            backgroundMeta: Object.fromEntries(Object.entries(c.chatMetadata ?? {}).filter(([k]) => /background/i.test(k))), toasts: window.__toasts.length };
    });
    s.chatSha256 = sha(s.chatJson); delete s.chatJson;
    return s;
}
const until = async (check, what, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await check()) return; await delay(100); } throw Error('Timed out: ' + what); };
const select = async name => {
    const icon = page.locator('#rightNavDrawerIcon');
    if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
    await page.locator('#right-nav-panel.openDrawer').waitFor({ state: 'visible' });
    if (!await page.locator('#rm_button_create').isVisible()) await page.locator('#rm_button_characters').click();
    await page.locator('#rm_print_characters_block').getByText(name, { exact: true }).first().click();
    await page.waitForFunction(n => SillyTavern.getContext().chat[0]?.name === n, name);
    await icon.click();
    await page.locator('#right-nav-panel').waitFor({ state: 'hidden' });
};
const openSeamChat = () => page.evaluate(async file => { await (await import('/script.js')).openCharacterChat(file); }, CHAT_FILE);
const sdNow = () => page.evaluate(() => JSON.parse(JSON.stringify(SillyTavern.getContext().extensionSettings.sd)));
const setSd = patch => page.evaluate(p => { const sd = SillyTavern.getContext().extensionSettings.sd; for (const [k, v] of Object.entries(p)) { if (v === undefined) delete sd[k]; else sd[k] = v; } }, patch);
async function assertRestored(baseline, label) {
    const now = await sdNow();
    assert.ok(isDeepStrictEqual(now, baseline), 'settings restore after ' + label);
    assert.equal(now.comfy_url, fixtureOrigin);
}

// The seam call, from inside the page. comfy_url is checked in the same task, immediately before the callback.
async function startSeam(prompt, negative, abortable) {
    assert.equal((await sdNow()).comfy_url, fixtureOrigin, 'comfy_url is the fixture before the seam call');
    await page.evaluate(async ({ prompt, negative, origin, abortable }) => {
        // 'dom' is the plan's proposal (a DOM AbortController); 'host' is the host's own SlashCommandAbortController.
        const Host = abortable === 'host' ? (await import('/scripts/slash-commands/SlashCommandAbortController.js')).SlashCommandAbortController : null;
        const c = SillyTavern.getContext();
        if (c.extensionSettings.sd.comfy_url !== origin) throw Error('comfy_url is not the fixture origin');
        const args = { quiet: 'true', gallery: 'false', negative };
        if (abortable) { window.__ctrl = Host ? new Host() : new AbortController(); args._abortController = window.__ctrl; }
        window.__call = { state: 'pending' };
        c.SlashCommandParser.commands.imagine.callback(args, prompt).then(
            r => { window.__call = { state: 'resolved', type: typeof r, value: r === undefined ? null : r }; },
            e => { window.__call = { state: 'rejected', error: String(e?.message ?? e) }; });
    }, { prompt, negative, origin: fixtureOrigin, abortable });
}
const callState = () => page.evaluate(() => window.__call);
const isPath = r => r?.state === 'resolved' && r.type === 'string' && r.value.length > 0;
const untilPrompt = () => until(async () => (await comfy('/log')).some(e => e.path === '/prompt'), 'fixture /prompt');

async function seamCase(id, { prompt, negative = '', step, abortable = false, during }) {
    await comfy('/control', { reset: true });
    if (step) await comfy('/control', { script: [step] });
    const before = await snapshot(), imagesBefore = await images(), textStart = (await requests()).length;
    const apiStart = apiLog.length, errStart = h.pageErrors.length, dialogStart = dialogs.length;
    const toastStart = await page.evaluate(() => window.__toasts.length);
    await startSeam(prompt, negative, abortable);
    const extra = during ? await during() : {};
    await until(async () => (await callState()).state !== 'pending', id + ' settles', 60000);
    const returned = await callState();
    await delay(700);
    const after = await snapshot(), imagesAfter = await images();
    const fixtureLog = await comfy('/log'), text = (await requests()).slice(textStart);
    const api = apiLog.slice(apiStart), toasts = (await page.evaluate(() => window.__toasts)).slice(toastStart);
    const generate = api.filter(e => e.path === '/api/sd/comfy/generate'), prompts = fixtureLog.filter(e => e.path === '/prompt');
    const o = { id, prompt, negative, step, returned, before, after, imagesNew: newFiles(imagesBefore, imagesAfter), imagesAfter, fixtureLog, text, api, toasts,
        pageErrors: h.pageErrors.slice(errStart), dialogs: dialogs.slice(dialogStart), generate, prompts, ...extra };
    o.workflow = prompts[0]?.rawBody ? (() => { try { return JSON.parse(prompts[0].rawBody).prompt; } catch { return null; } })() : null;
    if (o.workflow) {
        const sampler = Object.values(o.workflow).find(n => n.class_type === 'KSampler');
        o.positiveText = o.workflow[sampler?.inputs.positive?.[0]]?.inputs.text;
        o.negativeText = o.workflow[sampler?.inputs.negative?.[0]]?.inputs.text;
        o.seed = sampler?.inputs.seed;
    }
    const wires = [...generate.map(e => e.body ?? ''), ...fixtureLog.map(e => e.rawBody ?? '')].join('\n');
    o.decoysOnImageWire = DECOY_STRINGS.filter(d => wires.includes(d));
    o.decoysOnTextWire = DECOY_STRINGS.filter(d => JSON.stringify(text).includes(d));
    await writeBounded(join(wireDir, id + '.json'), o);
    return o;
}
const summary = o => ({ returned: o.returned, prompts: o.prompts.length, positiveText: o.positiveText, negativeText: o.negativeText, seed: o.seed, imagesNew: o.imagesNew,
    textRequests: o.text.length, decoysOnImageWire: o.decoysOnImageWire, decoysOnTextWire: o.decoysOnTextWire, toasts: o.toasts, pageErrors: o.pageErrors, dialogs: o.dialogs,
    chatChanged: o.before.chatSha256 !== o.after.chatSha256, chatLength: [o.before.chatLength, o.after.chatLength], backgroundChanged: o.before.background !== o.after.background || !isDeepStrictEqual(o.before.backgroundMeta, o.after.backgroundMeta),
    settingsEqual: isDeepStrictEqual(o.before.sd, o.after.sd) });
function required(id, o, failures, extra = {}) {
    const pass = failures.length === 0;
    evidence.cases.push({ id, kind: 'required', pass, failures, observed: { ...summary(o), ...extra } });
    console.log((pass ? 'PASS ' : 'FAIL ') + id + (pass ? '' : ': ' + failures.join('; ')) + ' | returned ' + JSON.stringify(o.returned));
}
function finding(id, o, text, extra = {}) {
    evidence.cases.push({ id, kind: 'hazard', observed: { ...summary(o), ...extra } });
    evidence.findings.push({ id, text });
    console.log('FINDING ' + id + ': ' + text);
}
const noFile = (o, f) => { if (o.imagesNew.length) f.push('new image file ' + o.imagesNew.join(',')); };
const nonPath = (o, f) => { if (isPath(o.returned)) f.push('returned a path'); if (o.returned.state !== 'resolved') f.push('callback ' + o.returned.state); };

try {
    evidence.browser = page.context().browser().version();
    // The fake ComfyUI on an ephemeral port; 8188 is the owner's.
    fixture = spawn(process.execPath, [FIXTURE], { env: { ...process.env, SN_COMFY_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    fixture.stdout.on('data', p => { fixtureOut = (fixtureOut + p).slice(-65536); });
    fixture.stderr.on('data', p => { fixtureOut = (fixtureOut + p).slice(-65536); });
    await until(() => /listening on \d+/.test(fixtureOut) || fixture.exitCode !== null, 'fixture start', 10000);
    const port = Number(/listening on (\d+)/.exec(fixtureOut)?.[1]);
    assert.ok(Number.isInteger(port) && port > 0 && port !== 8188, 'fixture port ' + port);
    fixtureOrigin = 'http://127.0.0.1:' + port;
    evidence.setup.fixtureOrigin = fixtureOrigin;
    assert.equal((await comfy('/system_stats')).system.comfyui_version, 'sn-comfy-fixture');

    await page.goto(h.origin);
    await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
    await page.waitForFunction(() => SillyTavern.getContext().extensionSettings.sd?.comfy_url !== undefined && SillyTavern.getContext().SlashCommandParser.commands.imagine);
    for (const name of ['Seam A', 'Seam B']) await native('/api/characters/create', { ch_name: name, description: DECOYS.card, first_mes: 'Welcome to ' + name });
    const message = (name, mes, is_user = false) => ({ name, mes, is_user, is_system: false, send_date: '2026-11-08T12:00:00.000Z', extra: {} });
    await native('/api/chats/save', { avatar_url: 'Seam A.png', file_name: CHAT_FILE, chat: [{ user_name: DECOYS.personaName, character_name: 'Seam A', create_date: '2026-11-08T12:00:00.000Z', chat_metadata: {} },
        message('Seam A', 'The reading room is quiet.'), message(DECOYS.personaName, CHAT_DECOY + ' meet me by the lantern.', true)] });

    // comfy_url first, then the source; saved through the host's own settings save; then reload so the extension initialises on comfy.
    evidence.setup.sdDefaultsSeen = await page.evaluate(() => { const sd = SillyTavern.getContext().extensionSettings.sd; return { source: sd.source, comfy_type: sd.comfy_type, comfy_workflow: sd.comfy_workflow, comfyUrlIsDefault8188: /:8188\b/.test(sd.comfy_url) }; });
    await page.evaluate(async ({ origin, BASE }) => {
        const sd = SillyTavern.getContext().extensionSettings.sd;
        sd.comfy_url = origin;
        if (sd.comfy_url !== origin) throw Error('comfy_url not set');
        Object.assign(sd, { source: 'comfy', comfy_type: 'standard', comfy_workflow: 'Default_Comfy_Workflow.json', seed: 1234, free_extend: false, multimodal_captioning: false, refine_mode: false, interactive_mode: false, function_tool: false, ...BASE });
        await (await import('/script.js')).saveSettings();
    }, { origin: fixtureOrigin, BASE });
    const saved = JSON.parse(await readFile(join(h.data, 'default-user/settings.json'))).extension_settings?.sd;
    assert.ok(saved?.comfy_url === fixtureOrigin && saved.source === 'comfy' && saved.seed === 1234, 'image settings saved to disk before reload');
    await page.reload();
    await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
    await page.waitForFunction(() => SillyTavern.getContext().extensionSettings.sd?.source === 'comfy' && SillyTavern.getContext().SlashCommandParser.commands.imagine);
    assert.equal((await sdNow()).comfy_url, fixtureOrigin);
    await watchToasts();
    await select('Seam A');
    await seedDecoys();
    await openSeamChat();
    await page.waitForFunction(() => SillyTavern.getContext().chat.length === 2);
    await connect();
    await delay(2000);
    const seam = await page.evaluate(() => { const cmd = SillyTavern.getContext().SlashCommandParser.commands.imagine; return { exists: !!cmd, callbackType: typeof cmd?.callback, arity: cmd?.callback?.length }; });
    const startupContacts = await comfy('/log');
    const shippedText = await readFile(join(h.host, 'default/content/Default_Comfy_Workflow.json'), 'utf8');
    const workflowsDir = join(h.data, 'default-user/user/workflows');
    const fetched = await page.evaluate(async () => {
        const res = await fetch('/api/sd/comfy/workflow', { method: 'POST', headers: SillyTavern.getContext().getRequestHeaders(), body: JSON.stringify({ file_name: 'Default_Comfy_Workflow.json' }) });
        return { status: res.status, text: res.ok ? await res.json() : await res.text() };
    });
    const options = await page.evaluate(() => Object.fromEntries(['#sd_model', '#sd_sampler', '#sd_scheduler', '#sd_vae'].map(s => [s, [...document.querySelectorAll(s + ' option')].map(o => o.value)])));
    // The extension was configured without its UI, so a saved selection may be absent from what the host just loaded from the fixture.
    // generatePicture's ensureSelectionExists would rewrite it on the first call (measured as H7); align it once here, as the UI would show it, and record it.
    evidence.setup.selectionsAligned = await page.evaluate(async () => {
        const sd = SillyTavern.getContext().extensionSettings.sd, changed = {};
        for (const [key, sel] of [['model', '#sd_model'], ['sampler', '#sd_sampler'], ['scheduler', '#sd_scheduler'], ['vae', '#sd_vae']]) {
            const el = document.querySelector(sel);
            if (el?.selectedOptions.length && ![...el.options].some(o => o.value === sd[key])) { changed[key] = { from: sd[key], to: el.selectedOptions[0].value }; sd[key] = el.selectedOptions[0].value; }
        }
        await (await import('/script.js')).saveSettings();
        return changed;
    });
    console.log('SETUP selections aligned ' + JSON.stringify(evidence.setup.selectionsAligned));
    const sd0 = await sdNow();
    Object.assign(evidence.setup, { seam, workflowsDirFiles: await readdir(workflowsDir).catch(e => 'missing: ' + e.code),
        workflowEndpoint: { status: fetched.status, equalsShippedDefault: fetched.text === shippedText, sha256: sha(String(fetched.text)) }, shippedDefaultSha256: sha(shippedText),
        hostStartupFixtureRequests: startupContacts.map(e => e.method + ' ' + e.path), selectOptions: options,
        sdEffective: { source: sd0.source, comfy_type: sd0.comfy_type, comfy_url: sd0.comfy_url, comfy_workflow: sd0.comfy_workflow, model: sd0.model, sampler: sd0.sampler, scheduler: sd0.scheduler, vae: sd0.vae, seed: sd0.seed, width: sd0.width, height: sd0.height, snap: sd0.snap, prompt_prefix: sd0.prompt_prefix, negative_prompt: sd0.negative_prompt } });
    assert.ok(seam.exists && seam.callbackType === 'function', 'imagine seam present');
    console.log('SETUP seam arity ' + seam.arity + '; workflows dir ' + JSON.stringify(evidence.setup.workflowsDirFiles) + '; workflow endpoint equals shipped default ' + evidence.setup.workflowEndpoint.equalsShippedDefault);
    const shippedTypes = [...new Set(Object.values(JSON.parse(shippedText)).map(n => n.class_type))].sort();

    // R1 baseline
    {
        const o = await seamCase('R1', { prompt: 'a quiet reading room at dusk', negative: 'SN-DRAFT-NEG' }), f = [];
        if (!isPath(o.returned)) f.push('no path returned');
        const path = o.returned.value;
        let fetchedSha = null, onDisk = null;
        if (isPath(o.returned)) {
            if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(path) || new URL(path, h.origin + '/').origin !== h.origin) f.push('path not same-origin relative: ' + path);
            const got = await page.evaluate(async p => { const r = await fetch(p); const b = await r.arrayBuffer(); return { status: r.status, url: r.url, sha: [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(x => x.toString(16).padStart(2, '0')).join('') }; }, path);
            fetchedSha = got.sha;
            if (got.status !== 200 || got.sha !== RESULT_PNG_SHA256) f.push('fetched bytes ' + got.status + ' ' + got.sha);
            onDisk = o.imagesNew;
            if (o.imagesNew.length !== 1 || o.imagesNew[0].includes('/') || !path.endsWith('/' + o.imagesNew[0])) f.push('saved file not one root file matching the path: ' + JSON.stringify(o.imagesNew));
            else if (o.imagesAfter[o.imagesNew[0]].sha256 !== RESULT_PNG_SHA256) f.push('disk bytes differ');
        }
        if (o.prompts.length !== 1) f.push(o.prompts.length + ' /prompt');
        if (o.generate.length !== 1) f.push(o.generate.length + ' generate requests');
        let genBody = null;
        try { genBody = JSON.parse(o.generate[0].body); } catch { f.push('generate body unparsed'); }
        if (genBody && genBody.prompt !== o.prompts[0]?.rawBody) f.push('generate prompt != fixture /prompt body');
        if (genBody && genBody.url !== fixtureOrigin) f.push('generate url ' + genBody.url);
        const types = o.workflow ? [...new Set(Object.values(o.workflow).map(n => n.class_type))].sort() : [];
        if (!isDeepStrictEqual(types, shippedTypes)) f.push('class_types ' + types.join(','));
        const expectPos = combinePrefixes(BASE.prompt_prefix, 'a quiet reading room at dusk', '{prompt}'), expectNeg = combinePrefixes('SN-DRAFT-NEG', BASE.negative_prompt);
        assert.equal(expectPos, 'SN-PREFIX-TEXT, a quiet reading room at dusk'); assert.equal(expectNeg, 'SN-DRAFT-NEG, SN-NEG-PREFIX');
        if (o.positiveText !== expectPos) f.push('positive ' + JSON.stringify(o.positiveText));
        if (o.negativeText !== expectNeg) f.push('negative ' + JSON.stringify(o.negativeText));
        if (o.seed !== 1234) f.push('seed ' + o.seed);
        if (o.text.length) f.push(o.text.length + ' text-endpoint requests');
        if (o.before.chatLength !== o.after.chatLength || o.before.chatSha256 !== o.after.chatSha256) f.push('chat changed');
        if (o.before.background !== o.after.background || !isDeepStrictEqual(o.before.backgroundMeta, o.after.backgroundMeta)) f.push('background changed');
        if (!isDeepStrictEqual(o.before.sd, o.after.sd)) f.push('settings changed: ' + Object.keys(o.after.sd).filter(k => !isDeepStrictEqual(o.before.sd[k], o.after.sd[k])).join(','));
        if (o.decoysOnImageWire.length) f.push('decoys on wire ' + o.decoysOnImageWire.join(','));
        const uploads = o.api.filter(e => e.upload).map(e => e.upload);
        required('R1', o, f, { fetchedSha256: fetchedSha, savedFiles: onDisk, uploads, classTypes: types, generateUrl: genBody?.url });
    }
    // R2 {prompt} marker
    {
        const sdBase = await sdNow();
        await setSd({ prompt_prefix: 'SN-PREFIX-HEAD, {prompt}, SN-PREFIX-TAIL' });
        const o = await seamCase('R2', { prompt: 'harbor at noon' }), f = [];
        await setSd({ prompt_prefix: BASE.prompt_prefix });
        await assertRestored(sdBase, 'R2');
        if (o.positiveText !== 'SN-PREFIX-HEAD, harbor at noon, SN-PREFIX-TAIL') f.push('positive ' + JSON.stringify(o.positiveText));
        if (o.prompts.length !== 1) f.push(o.prompts.length + ' /prompt');
        required('R2', o, f);
    }
    // R3 inert text
    {
        const text = '/sendas name=Seam SN-SLASH-INJECT <img src=x onerror=alert(1)> "quoted" é';
        const o = await seamCase('R3', { prompt: text }), f = [];
        const expectPos = combinePrefixes(BASE.prompt_prefix, text, '{prompt}');
        if (o.positiveText !== expectPos) f.push('positive ' + JSON.stringify(o.positiveText));
        if (!o.prompts[0]?.rawBody?.includes(JSON.stringify(expectPos))) f.push('literal JSON-escaped text not in /prompt body');
        if (o.before.chatLength !== o.after.chatLength || o.before.chatSha256 !== o.after.chatSha256) f.push('chat changed');
        if (o.pageErrors.length || o.dialogs.length) f.push('page error or dialog');
        if (o.text.length) f.push('text-endpoint request');
        if (o.prompts.length !== 1) f.push(o.prompts.length + ' /prompt');
        const sendas = await page.evaluate(() => document.body.innerText.includes('SN-SLASH-INJECT'));
        required('R3', o, f, { slashTextVisibleInPage: sendas });
    }
    // R4 abort through the page-kept AbortController (the plan's proposal); H8 repeats it with the host's own controller type.
    async function abortCase(id, kind) {
        let afterAbort = null, interruptLogged = null, historyPolls = null, released = false;
        const o = await seamCase(id, { prompt: 'a lantern on a shelf', step: { hold: true }, abortable: kind, during: async () => {
            await untilPrompt();
            await page.evaluate(() => window.__ctrl.abort());
            const end = Date.now() + 10000;
            while (Date.now() < end && (await callState()).state === 'pending') await delay(100);
            afterAbort = await callState();
            await delay(1500);
            const log = await comfy('/log');
            interruptLogged = log.some(e => e.path === '/interrupt');
            historyPolls = log.filter(e => e.path.startsWith('/history')).length;
            // Never leave the host polling a held job: release it whatever the abort did.
            await comfy('/control', { release: true });
            released = true;
            return {};
        } });
        await delay(1500);
        const late = newFiles(o.imagesAfter, await images());
        return { o, afterAbort, interruptLogged, historyPolls, released, late };
    }
    {
        const r = await abortCase('R4', 'dom'), { o } = r, f = [];
        if (r.afterAbort.state === 'pending') f.push('a DOM AbortController passed as _abortController did not settle the call within 10 s of abort (the host only honours an object with addEventListener)');
        nonPath(o, f); noFile(o, f);
        if (!isDeepStrictEqual(o.before.sd, o.after.sd)) f.push('settings changed');
        if (r.late.length) f.push('late file ' + r.late.join(','));
        required('R4', o, f, { afterAbort: r.afterAbort, interruptLogged: r.interruptLogged, historyPollsBeforeRelease: r.historyPolls, settledAfterRelease: o.returned });
    }
    // R5 chat change while held
    {
        let seamB = {};
        const o = await seamCase('R5', { prompt: 'a door left open', step: { hold: true }, during: async () => {
            await untilPrompt();
            await select('Seam B');
            seamB.before = await snapshot();
            await comfy('/control', { release: true });
            return {};
        } }), f = [];
        await delay(1000);
        seamB.after = await snapshot();
        nonPath(o, f); noFile(o, f);
        if (seamB.before.chatSha256 !== seamB.after.chatSha256 || seamB.before.chatLength !== seamB.after.chatLength) f.push('Seam B chat changed');
        required('R5', o, f, { seamBChat: { before: seamB.before.chatSha256, after: seamB.after.chatSha256, length: seamB.after.chatLength } });
        await select('Seam A');
        await openSeamChat();
        await page.waitForFunction(() => SillyTavern.getContext().chat.length === 2);
    }
    // R6 backend error
    {
        const o = await seamCase('R6', { prompt: 'a broken lamp', step: { error: true } }), f = [];
        nonPath(o, f); noFile(o, f);
        if (o.prompts.length !== 1) f.push(o.prompts.length + ' /prompt');
        required('R6', o, f);
    }
    // R7 non-PNG
    {
        const o = await seamCase('R7', { prompt: 'a jpeg window', step: { format: 'jpg' } }), f = [];
        if (o.prompts.length !== 1) f.push(o.prompts.length + ' /prompt');
        required('R7', o, f, { returnedPath: o.returned.value, savedExtensions: o.imagesNew.map(n => extname(n)) });
    }
    // R8 no deadline, and H6 during the hold
    {
        let at15 = null, sdDuring = null, histories = null;
        const o = await seamCase('R8', { prompt: 'a long night', step: { hold: true }, during: async () => {
            await untilPrompt();
            await delay(15000);
            at15 = await callState();
            sdDuring = await sdNow();
            histories = (await comfy('/log')).filter(e => e.path.startsWith('/history')).length;
            await comfy('/control', { release: true });
            return { sdDuring };
        } }), f = [];
        if (at15?.state !== 'pending') f.push('not pending at 15 s: ' + JSON.stringify(at15));
        if (!(histories > 20)) f.push('history polls at 15 s: ' + histories);
        if (o.returned.state !== 'resolved') f.push('did not settle after release');
        required('R8', o, f, { at15s: at15, historyPollsAt15s: histories, settledAfterRelease: o.returned });
        const changed = ['width', 'height'].filter(k => sdDuring[k] !== o.before.sd[k]);
        finding('H6', o, changed.length ? 'width/height changed in flight: ' + changed.map(k => k + ' ' + o.before.sd[k] + '->' + sdDuring[k]).join(', ') : `width/height unchanged in flight for a FREE request (${o.before.sd.width}x${o.before.sd.height}); other keys changed in flight: ${Object.keys(sdDuring).filter(k => !isDeepStrictEqual(sdDuring[k], o.before.sd[k])).join(',') || 'none'}`, { sdDuringDiff: Object.keys(sdDuring).filter(k => !isDeepStrictEqual(sdDuring[k], o.before.sd[k])) });
    }
    // H1 macros
    {
        const o = await seamCase('H1', { prompt: '{{user}} meets {{char}}' });
        const persona = o.positiveText?.includes(DECOYS.personaName), char = o.positiveText?.includes('Seam A');
        finding('H1', o, `positive on the wire ${JSON.stringify(o.positiveText)}; persona name expanded ${!!persona}; character name expanded ${!!char}`);
    }
    // H2 per-character prefix
    {
        const sdBase = await sdNow(), had = Object.hasOwn(sdBase.character_prompts ?? {}, 'Seam A');
        await page.evaluate(() => { SillyTavern.getContext().extensionSettings.sd.character_prompts['Seam A'] = 'SN-CHAR-PREFIX'; });
        const o = await seamCase('H2', { prompt: 'char, at the window' });
        await page.evaluate(({ had, prev }) => { const cp = SillyTavern.getContext().extensionSettings.sd.character_prompts; if (had) cp['Seam A'] = prev; else delete cp['Seam A']; }, { had, prev: sdBase.character_prompts?.['Seam A'] });
        await assertRestored(sdBase, 'H2');
        finding('H2', o, `SN-CHAR-PREFIX reached the wire: ${!!o.positiveText?.includes('SN-CHAR-PREFIX')}; positive ${JSON.stringify(o.positiveText)}`);
    }
    // H3 trigger word
    {
        const o = await seamCase('H3', { prompt: 'background' });
        const s = summary(o);
        finding('H3', o, `text-endpoint requests ${o.text.length}; decoys in their bodies [${o.decoysOnTextWire.join(', ')}]; background changed ${s.backgroundChanged}; chat message added ${o.after.chatLength > o.before.chatLength}; positive ${JSON.stringify(o.positiveText)}; returned ${JSON.stringify(o.returned)}`);
    }
    // H4 free_extend
    {
        const sdBase = await sdNow();
        await setSd({ free_extend: true });
        const o = await seamCase('H4', { prompt: 'a lighthouse' });
        await setSd({ free_extend: false });
        await assertRestored(sdBase, 'H4');
        const s = summary(o);
        finding('H4', o, `text-endpoint requests ${o.text.length}; decoys in their bodies [${o.decoysOnTextWire.join(', ')}]; background changed ${s.backgroundChanged}; chat message added ${o.after.chatLength > o.before.chatLength}; positive ${JSON.stringify(o.positiveText)}`);
    }
    // H5 avatar workflow
    {
        const sdBase = await sdNow();
        await setSd({ comfy_workflow: 'Char_Avatar_Comfy_Workflow.json' });
        const o = await seamCase('H5', { prompt: 'a portrait study' });
        await setSd({ comfy_workflow: 'Default_Comfy_Workflow.json' });
        await assertRestored(sdBase, 'H5');
        const types = o.workflow ? Object.values(o.workflow).map(n => n.class_type) : [];
        const loader = o.workflow && Object.values(o.workflow).find(n => typeof n.inputs?.image === 'string');
        const img = loader?.inputs.image;
        const avatar = img ? { length: img.length, sha256: sha(img), decodedBytes: Buffer.from(img, 'base64').length, node: loader.class_type } : null;
        finding('H5', o, `avatar base64 in /prompt body ${!!(img && img.length > 100)}${avatar ? ` (${avatar.node}, ${avatar.length} chars, sha256 ${avatar.sha256})` : ''}; class_types ${types.join(',')}`, { avatar, classTypes: types });
    }
    // H8 abort with the host's SlashCommandAbortController
    {
        const r = await abortCase('H8', 'host'), { o } = r;
        finding('H8', o, `with the host's SlashCommandAbortController: state 10 s after abort ${JSON.stringify(r.afterAbort)}; /interrupt logged ${r.interruptLogged}; new image files ${o.imagesNew.length + r.late.length}; settings equal ${isDeepStrictEqual(o.before.sd, o.after.sd)}`, { afterAbort: r.afterAbort, interruptLogged: r.interruptLogged, historyPolls: r.historyPolls });
    }
    // H7 stale sampler selection
    {
        const sdBase = await sdNow();
        await setSd({ sampler: 'DDIM' });
        const o = await seamCase('H7', { prompt: 'a stale sampler' });
        const rewritten = o.after.sd.sampler;
        await setSd({ sampler: sdBase.sampler });
        await assertRestored(sdBase, 'H7');
        finding('H7', o, `saved sampler 'DDIM' absent from the loaded options: after the call sd.sampler is ${JSON.stringify(rewritten)}; KSampler sampler_name on the wire ${JSON.stringify(o.workflow && Object.values(o.workflow).find(n => n.class_type === 'KSampler')?.inputs.sampler_name)}`);
    }
    const failed = evidence.cases.filter(c => c.kind === 'required' && !c.pass).map(c => c.id);
    verdict = failed.length ? 'STOP' : 'GO';
    evidence.unexpectedPageErrors = h.pageErrors;
} catch (error) {
    verdict = 'STOP';
    evidence.error = error.stack;
    console.error(error);
    await page.screenshot({ path: join(root, 'failure.png') }).catch(() => {});
    process.exitCode = 1;
} finally {
    evidence.verdict = verdict;
    evidence.dialogs = dialogs;
    evidence.fixtureConsoleTail = fixtureOut.slice(-4096);
    await writeBounded(join(root, 'evidence.json'), evidence);
    await h.close();
    await stopFixture();
    console.log('VERDICT ' + verdict);
    console.log('Evidence ' + join(root, 'evidence.json'));
}
