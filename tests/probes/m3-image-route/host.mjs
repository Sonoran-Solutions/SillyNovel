// M3.2 PR C native campaign, extended by M3.3 PR C (the image ledger: cache, refusal, host copy, takeover, reconcile, reload, rows):
// SillyNovel's real "Generate on this host" UI on the disposable pinned host against the fake ComfyUI.
// Synthetic data and loopback fixtures only; the owner's 127.0.0.1:8188 is never contacted.
// node tests/probes/m3-image-route/host.mjs <pinned-host-root>   (SN_PLAYWRIGHT_MODULE set; port 8128 free)
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHarness, DECOYS, PIN, repo } from '../m2-director/harness.mjs';
import { RESULT_PNG_SHA256 } from '../../fixtures/m3-comfy-endpoint.mjs';
import { preflight, reviewText } from '../../../src/image-request.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const FIXTURE = join(repo, 'tests/fixtures/m3-comfy-endpoint.mjs');
const CHAT_DECOY = 'DECOY-CHAT-MESSAGE-5e19', CHAT_FILE = 'Route reading';
const DECOY_STRINGS = [...Object.values(DECOYS), CHAT_DECOY];
const BASE = { prompt_prefix: 'SN-PREFIX-TEXT,', negative_prompt: 'SN-NEG-PREFIX' };
const DRAFT = { prompt: 'a quiet harbor at dusk', negativePrompt: 'SN-DRAFT-NEG' };
const SD_KEYS = ['source', 'comfy_type', 'comfy_url', 'comfy_workflow', 'free_extend', 'multimodal_captioning', 'refine_mode', 'interactive_mode', 'function_tool', 'prompt_prefix', 'negative_prompt', 'seed', 'width', 'height', 'steps', 'scale', 'model', 'vae', 'sampler', 'scheduler', 'clip_skip', 'denoising_strength', 'comfy_placeholders'];

// The host's combinePrefixes (stable-diffusion/index.js L969-983 at the pin), restated independently of src/ for the expected wire.
function combinePrefixes(str1, str2, macro = '') {
    const process = s => s.trim().replace(/^,|,$/g, '').trim();
    if (!str2) return str1;
    str1 = process(str1); str2 = process(str2);
    return process(macro && str1.includes(macro) ? str1.replace(macro, str2) : `${str1}, ${str2},`);
}

const evidence = { candidate: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), host: PIN, node: process.version, checks: [], counts: { prompts: 0, interrupts: 0, textRequests: 0, files: 0 }, setup: {},
    notTested: ['120 s timeout on the real host (covered in the browser suite with fake timers); M and N wait for the real 120 s deadline before Reconcile', 'A real provider\'s content-policy refusal (K is the fixture\'s synthetic refusal, J7)', 'Real ComfyUI (the owner\'s 127.0.0.1:8188 was never contacted); /interrupt is the fixture\'s log entry, not real work stopping', 'Other host versions', 'Other image-aware extensions', 'Physical devices and screen readers', 'Group chats'] };
const pass = name => { evidence.checks.push(name); console.log('PASS ' + name); };
let h, page, fixture, fixtureOut = '', fixtureOrigin, imagesRoot, project, sdSaved, draft = DRAFT.prompt;
const iso = ms => new Date(ms).toISOString();
const apiLog = [];

const until = async (check, what, ms = 20000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await check()) return; await delay(50); }
    throw Error('Timed out: ' + what);
};
const comfy = async (path, payload) => (await fetch(fixtureOrigin + path, { signal: AbortSignal.timeout(10000), ...(payload === undefined ? {} : { method: 'POST', body: JSON.stringify(payload) }) })).json();
const comfyLog = () => comfy('/log');
async function stopFixture() {
    if (!fixture || fixture.exitCode !== null || fixture.signalCode !== null) return;
    const done = new Promise(r => fixture.once('close', r));
    fixture.kill('SIGTERM');
    await Promise.race([done, delay(5000)]);
    if (fixture.exitCode === null && fixture.signalCode === null) { fixture.kill('SIGKILL'); await done; }
}
async function images() {
    const files = {};
    async function walk(dir) {
        let entries;
        try { entries = await readdir(dir, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
        for (const e of entries) { const file = join(dir, e.name); if (e.isDirectory()) await walk(file); else files[file.slice(imagesRoot.length + 1)] = sha(await readFile(file)); }
    }
    await walk(imagesRoot);
    return files;
}
const newFiles = (before, after) => Object.keys(after).filter(k => before[k] !== after[k]);
const sdNow = () => page.evaluate(() => JSON.parse(JSON.stringify(SillyTavern.getContext().extensionSettings.sd)));
const chatState = () => page.evaluate(() => { const c = SillyTavern.getContext(); return { id: c.getCurrentChatId(), length: c.chat.length, json: JSON.stringify(c.chat) }; });
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
const openRouteChat = async () => { await page.evaluate(async file => { await (await import('/script.js')).openCharacterChat(file); }, CHAT_FILE); await page.waitForFunction(() => SillyTavern.getContext().chat.length === 2); };
const button = name => page.locator('#sillynovel-stage').getByRole('button', { name, exact: true, includeHidden: true });
const field = name => page.locator('.sillynovel-image-workflow').getByLabel(name, { exact: true });
const status = () => page.locator('.sillynovel-image-workflow__status').textContent();
const problems = () => page.locator('.sillynovel-image-workflow__generation-problems').textContent();
const used = () => page.locator('.sillynovel-image-workflow__generation p', { hasText: /^Submissions used / }).textContent();
const untilStatus = (pattern, ms) => until(async () => pattern.test(await status()), 'status ' + pattern, ms);
const textCount = async () => (await h.requests()).length;
const hostJobsTerminal = async () => {
    const log = await comfyLog(), ids = log.filter(e => e.path === '/prompt' && e.promptId).map(e => e.promptId);
    return ids.every(id => log.some(e => (e.historyId === id && e.terminal) || (e.path === '/view' && e.query?.filename?.startsWith(id + '.'))));
};
// Every Submit: the host must still point at the fixture.
async function submit() {
    assert.equal((await sdNow()).comfy_url, fixtureOrigin, 'comfy_url is the fixture origin before Submit');
    assert.equal(await button('Submit').isEnabled(), true, 'Submit enabled');
    await button('Submit').click();
}
async function openProject(projectId) {
    await page.locator('.sillynovel-controls').evaluate(e => { e.open = true; });
    await page.locator('#sillynovel-stage').getByLabel('Saved project', { exact: true }).selectOption(projectId);
    await button('Open project and use with this chat').click();
    await page.waitForFunction(() => document.querySelector('.sillynovel-project-status').textContent.includes('Image route · revision'));
}
async function openWorkflow() {
    await page.locator('.sillynovel-controls').evaluate(e => { e.open = true; });
    if (await page.locator('#sillynovel-image-workflow-body').isHidden()) await button('Image workflow').click();
    if (await field('Image prompt').inputValue() !== draft) await field('Image prompt').fill(draft);
    if (await field('Negative prompt').inputValue() !== DRAFT.negativePrompt) await field('Negative prompt').fill(DRAFT.negativePrompt);
}
// Turning the session on inspects the host; wait for that inspection, not a stale review.
async function sessionOn() {
    const inspected = page.waitForResponse(r => r.url().endsWith('/api/sd/comfy/workflow'));
    // After the ledger begins the session the page reads its unresolved rows; that read ends the begin, so the problems line is fresh after it.
    const begun = page.waitForResponse(r => r.url().endsWith('/image/session') && r.request().method() === 'GET');
    await field('Image session on this host').check();
    await inspected;
    await begun;
    await delay(300); // the page renders after it has read that reply; the response event fires on its headers
    await page.waitForFunction(() => !document.querySelector('.sillynovel-image-workflow__review').hidden && document.querySelector('.sillynovel-image-workflow__generation p:not([hidden])') !== null);
    await until(async () => /^Submissions used 0 of 5$/.test(await used()), 'fresh allowance');
    await until(async () => (await button('Submit').isEnabled()) || (await problems()) !== '', 'ledger session begun');
}
const ledgerJobs = () => h.plugin('/projects/' + project.projectId + '/image/jobs');
const unresolved = () => page.locator('.sillynovel-image-workflow__unresolved');
// Load and attach a page as the owner would: the route chat, SillyNovel on, the project open, the Image workflow open.
async function attachPage() {
    await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
    await page.waitForFunction(() => SillyTavern.getContext().extensionSettings.sd?.source === 'comfy' && SillyTavern.getContext().SlashCommandParser.commands.imagine);
    await until(() => page.evaluate(s => s.every(k => document.querySelectorAll('#sd_' + k + ' option').length > 0), ['model', 'sampler', 'scheduler', 'vae']), 'image option lists populated');
    await select('Seam A');
    await openRouteChat();
    if (!await page.locator('#sillynovel-enabled').isChecked()) {
        const drawer = page.locator('.drawer-icon[title="Extensions"]');
        await drawer.click(); await page.locator('#sillynovel-enabled').setChecked(true); await drawer.click();
    }
    await page.locator('#sillynovel-stage').waitFor();
    await until(async () => await page.locator('#sillynovel-stage').getByLabel('Saved project', { exact: true }).locator('option[value="' + project.projectId + '"]').count() === 1, 'saved project listed');
    await openProject(project.projectId);
    await openWorkflow();
}
function watch(p) {
    p.on('dialog', d => d.accept().catch(() => {}));
    p.on('pageerror', error => { h.pageErrors.push(error.message); console.log('PAGE ERROR ' + error.message); });
    p.on('request', req => {
        const url = new URL(req.url());
        if (url.origin !== h.origin || !url.pathname.startsWith('/api/') || apiLog.length > 5000) return;
        apiLog.push({ method: req.method(), path: url.pathname, ...(url.pathname === '/api/sd/comfy/generate' ? { body: req.postData() } : {}) });
    });
}
const catalogCount = () => field('Reference 1').locator('option').count();

try {
    h = await createHarness(resolve(process.argv[2]), 'm3-image-route');
    page = h.page;
    const { native, plugin, inventory, seedDecoys, connect, root } = h;
    imagesRoot = join(h.data, 'default-user/user/images');
    evidence.browser = page.context().browser().version();
    page.on('request', req => {
        const url = new URL(req.url());
        if (url.origin !== h.origin || !url.pathname.startsWith('/api/') || apiLog.length > 5000) return;
        apiLog.push({ method: req.method(), path: url.pathname, ...(url.pathname === '/api/sd/comfy/generate' ? { body: req.postData() } : {}) });
    });
    page.on('dialog', d => d.accept().catch(() => {}));

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

    // A. Setup
    await page.goto(h.origin);
    await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
    await page.waitForFunction(() => SillyTavern.getContext().extensionSettings.sd?.comfy_url !== undefined && SillyTavern.getContext().SlashCommandParser.commands.imagine);
    for (const name of ['Seam A', 'Seam B']) await native('/api/characters/create', { ch_name: name, description: DECOYS.card, first_mes: 'Welcome to ' + name });
    const message = (name, mes, is_user = false) => ({ name, mes, is_user, is_system: false, send_date: '2026-11-08T12:00:00.000Z', extra: {} });
    await native('/api/chats/save', { avatar_url: 'Seam A.png', file_name: CHAT_FILE, chat: [{ user_name: DECOYS.personaName, character_name: 'Seam A', create_date: '2026-11-08T12:00:00.000Z', chat_metadata: {} },
        message('Seam A', 'The harbor office is quiet.'), message(DECOYS.personaName, CHAT_DECOY + ' meet me by the lantern.', true)] });
    const created = await plugin('/projects', 'POST', { name: 'Image route' }, 201);
    const forest = (await plugin('/projects/' + created.projectId + '/assets', 'POST', await readFile(join(repo, 'tests/fixtures/m12-stage/forest.png')), 201, 'image/png')).assetId;
    project = await plugin('/projects/' + created.projectId, 'PUT', { schemaVersion: 2, expectedRevision: 0, name: 'Image route', scene: { backgroundAssetId: forest, backgroundLocked: false, actors: [] }, catalog: [{ assetId: forest, kind: 'background', actorId: null, label: 'Forest' }] });
    // comfy_url first, then the source; saved through the host's own settings save; then reload so the extension initialises on comfy.
    await page.evaluate(async ({ origin, BASE }) => {
        const sd = SillyTavern.getContext().extensionSettings.sd;
        sd.comfy_url = origin;
        if (sd.comfy_url !== origin) throw Error('comfy_url not set');
        Object.assign(sd, { source: 'comfy', comfy_type: 'standard', comfy_workflow: 'Default_Comfy_Workflow.json', seed: 1234, free_extend: false, multimodal_captioning: false, refine_mode: false, interactive_mode: false, function_tool: false, comfy_placeholders: [], ...BASE });
        await (await import('/script.js')).saveSettings();
    }, { origin: fixtureOrigin, BASE });
    const saved = JSON.parse(await readFile(join(h.data, 'default-user/settings.json'))).extension_settings?.sd;
    assert.ok(saved?.comfy_url === fixtureOrigin && saved.source === 'comfy', 'image settings saved before reload');
    await page.reload();
    await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
    await page.waitForFunction(() => SillyTavern.getContext().extensionSettings.sd?.source === 'comfy' && SillyTavern.getContext().SlashCommandParser.commands.imagine);
    assert.equal((await sdNow()).comfy_url, fixtureOrigin);
    const selects = ['model', 'sampler', 'scheduler', 'vae'];
    await until(() => page.evaluate(s => s.every(k => document.querySelectorAll('#sd_' + k + ' option').length > 0), selects), 'image option lists populated');
    evidence.setup.selectionsAligned = await page.evaluate(async keys => {
        const sd = SillyTavern.getContext().extensionSettings.sd, changed = {};
        for (const key of keys) {
            const el = document.querySelector('#sd_' + key);
            if (el?.selectedOptions.length && ![...el.options].some(o => o.value === sd[key])) { changed[key] = { from: sd[key], to: el.selectedOptions[0].value }; sd[key] = el.selectedOptions[0].value; }
        }
        await (await import('/script.js')).saveSettings();
        return changed;
    }, selects);
    console.log('SETUP selections aligned ' + JSON.stringify(evidence.setup.selectionsAligned));
    await select('Seam A');
    await seedDecoys();
    await openRouteChat();
    await connect();
    const drawer = page.locator('.drawer-icon[title="Extensions"]');
    await drawer.click();
    await page.locator('#sillynovel-enabled').setChecked(true);
    await drawer.click();
    await page.locator('#sillynovel-stage').waitFor();
    await openProject(project.projectId);
    await openWorkflow();
    assert.equal(await field('Image session on this host').isVisible(), true);
    assert.equal(await field('Image session on this host').isChecked(), false, 'off by default');
    assert.equal((await comfyLog()).filter(e => e.path === '/prompt').length, 0);
    const shippedText = await readFile(join(h.host, 'default/content/Default_Comfy_Workflow.json'), 'utf8');
    pass('A: decoy character, chat and persona seeded; the host image extension points at the fixture (URL before source) with selections aligned ' + JSON.stringify(evidence.setup.selectionsAligned) + '; saved project with a background attached; the Image workflow open with the session off');

    // B. Session on: the review equals the module's text for the host's own snapshot; nothing is sent.
    await comfy('/control', { reset: true });
    let textStart = await textCount();
    await sessionOn();
    const sdB = await sdNow();
    const optionsB = await page.evaluate(keys => Object.fromEntries(keys.map(k => [k, Array.from(document.querySelector('#sd_' + k).options, o => o.value)])), selects);
    const workflowText = await page.evaluate(async () => (await fetch('/api/sd/comfy/workflow', { method: 'POST', headers: { ...SillyTavern.getContext().getRequestHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ file_name: 'Default_Comfy_Workflow.json' }) })).json());
    assert.equal(workflowText, shippedText, 'the host serves the shipped default workflow');
    const expected = preflight({ snapshot: { ...Object.fromEntries(SD_KEYS.map(k => [k, sdB[k]])), seam: true }, workflowText, workflowSha256: sha(workflowText), draft: DRAFT, options: optionsB });
    assert.deepEqual(expected.problems, []);
    const shownReview = await page.locator('.sillynovel-image-workflow__review').textContent();
    assert.equal(shownReview, reviewText(expected.review));
    assert.equal(await used(), 'Submissions used 0 of 5');
    assert.equal((await comfyLog()).filter(e => e.path === '/prompt').length, 0, 'no /prompt');
    assert.equal(await textCount() - textStart, 0, 'no text-model request');
    await writeFile(join(root, 'review.txt'), shownReview);
    pass('B: session on; the review equals reviewText(preflight()) computed in Node from the host workflow text (sha256 ' + sha(workflowText) + ') and settings snapshot; no /prompt and no text request');

    // C. Plain prompt end to end, then Import and apply.
    await comfy('/control', { reset: true });
    textStart = await textCount();
    const apiStart = apiLog.length, invBefore = await inventory(), sdBefore = await sdNow(), imagesBefore = await images(), chatBefore = await chatState(), catalogBefore = await catalogCount();
    await submit();
    await untilStatus(/^Candidate, not imported/, 60000);
    await until(hostJobsTerminal, 'C host poll terminal');
    const logC = await comfyLog(), promptsC = logC.filter(e => e.path === '/prompt');
    assert.equal(promptsC.length, 1, 'exactly one /prompt');
    let w = shippedText.replaceAll('"%prompt%"', JSON.stringify(combinePrefixes(BASE.prompt_prefix, DRAFT.prompt, '{prompt}')));
    w = w.replaceAll('"%negative_prompt%"', JSON.stringify(combinePrefixes(DRAFT.negativePrompt, BASE.negative_prompt)));
    w = w.replaceAll('"%seed%"', JSON.stringify(1234));
    w = w.replaceAll('"%denoise%"', JSON.stringify(sdBefore.denoising_strength === undefined ? 1.0 : sdBefore.denoising_strength));
    w = w.replaceAll('"%clip_skip%"', JSON.stringify(isNaN(sdBefore.clip_skip) ? -1 : -sdBefore.clip_skip));
    for (const ph of ['model', 'vae', 'sampler', 'scheduler', 'steps', 'scale', 'width', 'height']) w = w.replaceAll(`"%${ph}%"`, JSON.stringify(sdBefore[ph]));
    assert.deepEqual(JSON.parse(promptsC[0].rawBody), { prompt: JSON.parse(w) }, 'the /prompt body equals the independently substituted shipped workflow');
    assert.ok(shownReview.includes('Positive: ' + JSON.stringify(combinePrefixes(BASE.prompt_prefix, DRAFT.prompt, '{prompt}')) + '\n') && shownReview.includes('Negative: ' + JSON.stringify(combinePrefixes(DRAFT.negativePrompt, BASE.negative_prompt)) + '\n'), 'review texts are the wire texts');
    const generate = apiLog.slice(apiStart).filter(e => e.path === '/api/sd/comfy/generate');
    assert.equal(generate.length, 1);
    const wire = [...generate.map(e => e.body ?? ''), ...logC.map(e => e.rawBody ?? '')].join('\n');
    assert.deepEqual(DECOY_STRINGS.filter(d => wire.includes(d)), [], 'no decoy on the image wire');
    assert.equal(await textCount() - textStart, 0, 'zero text-endpoint requests');
    const pathC = /host kept a copy at (\S+)\. Import/.exec(await status())?.[1];
    const imagesC = await images(), newC = newFiles(imagesBefore, imagesC);
    assert.equal(newC.length, 1, 'the host saved one file');
    assert.ok(pathC && decodeURIComponent(pathC).endsWith(newC[0].split('/').pop()), 'status names the host file ' + pathC + ' / ' + newC[0]);
    assert.equal(imagesC[newC[0]], RESULT_PNG_SHA256);
    assert.equal(await page.locator('.sillynovel-image-workflow__preview').isVisible(), true, 'candidate shown');
    await button('Import and apply background to Image route').click();
    await untilStatus(/^Imported and applied as the background/);
    assert.equal(await catalogCount(), catalogBefore + 1, 'project asset count +1');
    assert.match(await page.locator('.sillynovel-visual-status').textContent(), /Background locked\./);
    await button('Save project').click();
    await page.waitForFunction(() => document.querySelector('.sillynovel-unsaved').dataset.state === 'saved');
    const savedProject = await plugin('/projects/' + project.projectId);
    assert.equal(savedProject.catalog.length, 2);
    const importedAsset = savedProject.catalog.find(a => a.assetId !== forest);
    assert.equal(savedProject.scene.backgroundAssetId, importedAsset.assetId);
    assert.equal(savedProject.scene.backgroundLocked, true, 'background locked');
    const stored = await h.context.request.get(h.origin + '/api/plugins/sillynovel-storage/projects/' + project.projectId + '/assets/' + importedAsset.assetId);
    assert.equal(sha(await stored.body()), RESULT_PNG_SHA256, 'the stored PNG is the fixture PNG');
    const invAfter = await inventory(), sdAfter = await sdNow(), chatAfter = await chatState();
    // settings.json is the host's own (it re-saves it as it pleases); it is judged by its extension_settings.sd and the changed keys are disclosed.
    const changedFiles = Object.keys({ ...invBefore.files, ...invAfter.files }).filter(k => k !== 'default-user/settings.json' && !isDeepStrictEqual(invBefore.files[k], invAfter.files[k]));
    assert.deepEqual(changedFiles, [], 'canonical chat, card, persona and lorebook files byte-identical');
    const settingsPaths = (a, b, prefix = '') => Object.keys({ ...a, ...b }).flatMap(k => isDeepStrictEqual(a?.[k], b?.[k]) ? [] : a?.[k] && b?.[k] && typeof a[k] === 'object' && typeof b[k] === 'object' && !prefix.includes('.') ? settingsPaths(a[k], b[k], prefix + k + '.') : [prefix + k]);
    evidence.setup.C_settingsJsonChangedPaths = settingsPaths(invBefore.settings, invAfter.settings);
    console.log('SETUP settings.json paths changed by the host during C: ' + JSON.stringify(evidence.setup.C_settingsJsonChangedPaths));
    assert.deepEqual(invAfter.settings.extension_settings.sd, invBefore.settings.extension_settings.sd, 'saved extension_settings.sd unchanged');
    sdSaved = invAfter.settings.extension_settings.sd;
    assert.deepEqual(sdAfter, sdBefore, 'in-page extension_settings.sd unchanged');
    assert.deepEqual(chatAfter, chatBefore, 'chat unchanged');
    assert.equal(await used(), 'Submissions used 1 of 5');
    evidence.counts.prompts += promptsC.length; evidence.counts.files += newC.length;
    evidence.setup.C = { hostFile: newC[0], statusPath: pathC, importedAssetId: importedAsset.assetId };
    // From here C's request is in the cache (J3), so the cases that must reach the host use another prompt; J asks for C's again.
    draft = DRAFT.prompt + ', second take';
    await field('Image prompt').fill(draft);
    pass('C: one /prompt whose body deep-equals the independently substituted shipped workflow; review texts are the wire texts; no decoy on the image wire; zero text requests; candidate shown with the host path; Import and apply registered the PNG (catalog +1, background locked, stored bytes = fixture PNG); canonical files, chat and extension_settings.sd unchanged');

    // D. Cancel with a held job, then release.
    await comfy('/control', { reset: true, script: [{ hold: true }] });
    textStart = await textCount();
    let imagesBeforeCase = await images(), catalogBeforeCase = await catalogCount();
    await submit();
    await until(async () => (await comfyLog()).some(e => e.path === '/prompt'), 'D /prompt');
    await untilStatus(/^Generating on 127\.0\.0\.1:\d+ · reading and replying continue$/);
    await button('Cancel').click();
    assert.equal(await status(), 'Cancelled · permission to apply withdrawn; the host keeps polling until the job is terminal');
    assert.equal(await button('Submit').isDisabled(), true, 'slot held');
    assert.equal(await button('Abandon').isHidden(), true, 'Abandon waits for the 120 s deadline after a Cancel');
    await comfy('/control', { release: true });
    await untilStatus(/^Cancelled · result discarded; the host kept a copy at /, 30000);
    await until(hostJobsTerminal, 'D host poll terminal');
    let imagesNow = await images(), added = newFiles(imagesBeforeCase, imagesNow);
    assert.equal(added.length, 1, 'the host image folder gained one file');
    assert.ok((await status()).includes(added[0].split('/').pop()), 'the kept file is disclosed');
    assert.equal(await catalogCount(), catalogBeforeCase, 'no new project asset');
    assert.equal(await page.locator('.sillynovel-image-workflow__preview').isHidden(), true, 'nothing applied');
    assert.equal(await button('Submit').isEnabled(), true, 'slot released after settlement');
    assert.equal(await used(), 'Submissions used 2 of 5');
    assert.equal(await textCount() - textStart, 0);
    evidence.counts.prompts += 1; evidence.counts.files += added.length;
    pass('D: Cancel withdrew permission while the host job was held (Abandon not offered before the deadline); after release nothing applied, no project asset, the host kept one file (disclosed), the slot released on settlement; used 2');

    // E. Stop host job.
    await comfy('/control', { reset: true, script: [{ hold: true }] });
    textStart = await textCount();
    imagesBeforeCase = await images();
    await submit();
    await until(async () => (await comfyLog()).some(e => e.path === '/prompt'), 'E /prompt');
    await untilStatus(/^Generating on/);
    assert.equal(await page.locator('#sillynovel-image-stop-warning').isVisible(), true, 'interrupt disclosure visible before the click');
    await button('Stop host job').click();
    await until(async () => (await comfyLog()).some(e => e.path === '/interrupt'), 'fixture /interrupt', 15000);
    await untilStatus(/^Cancelled · result discarded/, 30000);
    await until(hostJobsTerminal, 'E host poll terminal');
    if ((await comfy('/control', {})).held) await comfy('/control', { release: true });
    imagesNow = await images();
    assert.deepEqual(newFiles(imagesBeforeCase, imagesNow), [], 'no new file in the host image folder');
    assert.equal(await page.locator('.sillynovel-image-workflow__preview').isHidden(), true);
    assert.equal(await used(), 'Submissions used 3 of 5');
    assert.equal(await textCount() - textStart, 0);
    evidence.counts.prompts += 1; evidence.counts.interrupts += (await comfyLog()).filter(e => e.path === '/interrupt').length;
    pass('E: Stop host job aborted the host controller; the fixture logged /interrupt; nothing applied; no new host file; used 3');

    // F. 120 s timeout: no test hook shortens WAIT_MS in the UI, so it is not run on the real host.
    console.log('SKIP F: no UI hook shortens the 120 s wait; recorded in notTested');

    // G. Stale: switch character while held, then release.
    await comfy('/control', { reset: true, script: [{ hold: true }] });
    textStart = await textCount();
    imagesBeforeCase = await images();
    const invG = await inventory();
    await submit();
    await until(async () => (await comfyLog()).some(e => e.path === '/prompt'), 'G /prompt');
    await select('Seam B');
    // The host creates and saves Seam B's first chat on selection; that file is the host's, not the result's. Wait until it exists and two reads agree.
    let seamBFiles = null;
    await until(async () => { const { files } = await inventory(), now = JSON.stringify(Object.keys(files).filter(k => k.includes('/chats/Seam B/')).map(k => [k, files[k]])), ok = now !== '[]' && now === seamBFiles; seamBFiles = now; return ok; }, 'Seam B chat file saved', 15000);
    const seamB = await chatState(), invB = await inventory(), RUNNING = 'A request from before is still running on the host';
    assert.ok((await problems()).includes(RUNNING), 'the request that outlived the switch is named');
    assert.equal(await button('Submit').isDisabled(), true, 'Submit waits for it');
    await comfy('/control', { release: true });
    await until(hostJobsTerminal, 'G host poll terminal', 30000);
    await until(async () => !(await problems()).includes(RUNNING), 'G seam returned and the request settled', 30000);
    assert.deepEqual(await chatState(), seamB, 'Seam B chat unchanged');
    const invG2 = await inventory();
    const changed = (a, b) => Object.keys({ ...a.files, ...b.files }).filter(k => k !== 'default-user/settings.json' && !isDeepStrictEqual(a.files[k], b.files[k]));
    assert.deepEqual(changed(invB, invG2), [], 'no file changed by the late result');
    assert.deepEqual(changed(invG, invG2).filter(k => !k.includes('/chats/Seam B/')), [], 'Seam A\'s chat and every other canonical file unchanged');
    assert.deepEqual(newFiles(imagesBeforeCase, await images()), [], 'the host discarded the bytes');
    const toggle = page.locator('.sillynovel-image-workflow').getByLabel('Image session on this host', { exact: true });
    assert.equal(await toggle.count(), 1);
    assert.equal(await toggle.isChecked(), false, 'session off after the switch');
    assert.equal(await page.locator('.sillynovel-image-workflow__preview').isVisible().catch(() => false), false, 'no candidate');
    assert.equal(await textCount() - textStart, 0);
    evidence.counts.prompts += 1;
    evidence.setup.G = { statusAfter: await status().catch(() => null) };
    pass('G: a character switch while held ended the session and named the still-running request with Submit disabled; after release the request settled, nothing was applied to either chat, the result was discarded and no host file was kept');
    await select('Seam A');
    await openRouteChat();
    await page.locator('#sillynovel-stage').waitFor();
    await delay(500);
    await openProject(project.projectId);
    await openWorkflow();

    // H. Allowance.
    await comfy('/control', { reset: true });
    textStart = await textCount();
    imagesBeforeCase = await images();
    await sessionOn();
    for (let i = 1; i <= 5; i++) {
        await submit();
        await until(async () => (await used()) === 'Submissions used ' + i + ' of 5' && /^Candidate, not imported/.test(await status()) && (await comfyLog()).filter(e => e.path === '/prompt').length === i, 'H submission ' + i, 60000);
        await until(hostJobsTerminal, 'H host poll terminal ' + i);
    }
    assert.equal(await button('Submit').isDisabled(), true, 'the sixth Submit is disabled');
    assert.match(await problems(), /All 5 submissions in this image session are used\./);
    await button('Submit').dispatchEvent('click');
    await delay(1000);
    const promptsH = (await comfyLog()).filter(e => e.path === '/prompt').length;
    assert.equal(promptsH, 5, 'nothing beyond five reached the fixture');
    const addedH = newFiles(imagesBeforeCase, await images());
    assert.equal(await textCount() - textStart, 0);
    evidence.counts.prompts += promptsH; evidence.counts.files += addedH.length;
    pass('H: five submissions; the fixture logged five /prompt, equal to the UI\'s "Submissions used 5 of 5"; the sixth Submit is disabled with its reason; nothing beyond five reached the fixture');

    // I. Hazard refusal: free_extend set through extension_settings and saved.
    await comfy('/control', { reset: true });
    textStart = await textCount();
    await page.evaluate(async () => { SillyTavern.getContext().extensionSettings.sd.free_extend = true; await (await import('/script.js')).saveSettings(); });
    await field('Image session on this host').uncheck();
    await sessionOn();
    assert.match(await problems(), /Turn off free extend in the host's Image Generation settings\./);
    assert.equal(await button('Submit').isDisabled(), true);
    await button('Submit').dispatchEvent('click');
    await delay(1000);
    assert.equal((await comfyLog()).filter(e => e.path === '/prompt').length, 0, 'no /prompt');
    assert.equal(await textCount() - textStart, 0, 'no text request');
    await page.evaluate(async () => { SillyTavern.getContext().extensionSettings.sd.free_extend = false; await (await import('/script.js')).saveSettings(); });
    await field('Image session on this host').uncheck();
    await sessionOn();
    assert.equal(await problems(), '');
    assert.equal(await button('Submit').isEnabled(), true);
    assert.equal((await sdNow()).comfy_url, fixtureOrigin);
    pass('I: free_extend on the real host is refused by preflight with its sentence and Submit disabled; no /prompt and no text request; restored');

    // J. Cache (J3): C's request was imported and its asset is in the saved catalog; asking again offers it, with no /prompt and nothing counted.
    await comfy('/control', { reset: true });
    textStart = await textCount();
    let apiMark = apiLog.length;
    await page.locator('#sillynovel-stage').getByLabel('Background', { exact: true }).selectOption(forest);
    await button('Apply background').click();
    await until(async () => (await page.locator('.sillynovel-selected-art').textContent()).includes('Selected background: Forest'), 'J forest applied');
    await field('Image prompt').fill(DRAFT.prompt);
    await until(async () => (await page.locator('.sillynovel-image-workflow__review').textContent()) === shownReview, 'J review is C\'s');
    const usedJ = await used();
    await submit();
    await untilStatus(/^This exact request was imported before as “.+”\. Use the previous result \(nothing is sent or counted\), or Generate again \(counted\)\.$/);
    assert.equal(await button('Generate again').isVisible(), true, 'Generate again beside it');
    await button('Use the previous result').click();
    await untilStatus(/^Applied the previous result “.+” as the background · nothing was sent and nothing was counted/);
    await button('Save project').click();
    await page.waitForFunction(() => document.querySelector('.sillynovel-unsaved').dataset.state === 'saved');
    assert.equal((await plugin('/projects/' + project.projectId)).scene.backgroundAssetId, evidence.setup.C.importedAssetId, 'the previous result is the background');
    assert.equal((await comfyLog()).filter(e => e.path === '/prompt').length, 0, 'the fixture /prompt count is unchanged');
    assert.deepEqual(apiLog.slice(apiMark).filter(e => /generate/.test(e.path)), [], 'no host generate request');
    assert.equal(await used(), usedJ, 'nothing counted');
    assert.equal((await ledgerJobs()).length, 9, 'nothing reserved (C, D, E, G and H\'s five)');
    assert.equal(await textCount() - textStart, 0);
    pass('J: C\'s identical request was a cache hit: Use the previous result applied the imported asset (saved as the background) with zero /prompt, no host generate request, nothing counted (' + usedJ + ') and nothing reserved');

    // K. Refusal (J7): the fixture's synthetic content-policy refusal is a failure; the unit is spent, one /prompt, no retry, no fallback.
    await comfy('/control', { reset: true, script: [{ refusal: true }] });
    await field('Image prompt').fill(draft);
    textStart = await textCount(); apiMark = apiLog.length; imagesBeforeCase = await images();
    await submit();
    await untilStatus(/^The host (returned no image|'s image command failed)\.$/, 30000);
    await until(hostJobsTerminal, 'K host poll terminal');
    await delay(1500);
    assert.equal((await comfyLog()).filter(e => e.path === '/prompt').length, 1, 'one /prompt: no retry');
    assert.deepEqual(apiLog.slice(apiMark).filter(e => /generate/.test(e.path)).map(e => e.path), ['/api/sd/comfy/generate'], 'one host generate request: no fallback route');
    assert.deepEqual(newFiles(imagesBeforeCase, await images()), [], 'no host file');
    assert.equal(await used(), 'Submissions used 1 of 5', 'the unit is spent');
    assert.equal((await ledgerJobs())[0].state, 'failed');
    assert.equal(await textCount() - textStart, 0);
    evidence.setup.K = { status: await status() };
    evidence.counts.prompts += 1;
    pass('K: the synthetic content-policy refusal shows as a failure ("' + evidence.setup.K.status + '"); one /prompt and one host generate request (no retry, no fallback); no host file; the unit spent; the ledger row failed');

    // L. Delete the host's copy (J5): explicit, after a discard, exactly that file.
    await comfy('/control', { reset: true });
    imagesBeforeCase = await images();
    await submit();
    await untilStatus(/^Candidate, not imported/, 60000);
    await until(hostJobsTerminal, 'L host poll terminal');
    const pathL = /host kept a copy at (\S+)\. Import/.exec(await status())?.[1], imagesL = await images(), addedL = newFiles(imagesBeforeCase, imagesL);
    assert.equal(addedL.length, 1, 'the host saved one file');
    // The control names the latest discarded or imported job (here H's last, discarded when L's candidate replaced it), never a candidate.
    const note = page.locator('#sillynovel-image-host-copy-note');
    assert.ok(await note.isHidden() || !(await note.textContent()).includes(pathL), 'not offered for the candidate');
    await button('Discard preview').click();
    await until(async () => (await note.textContent()).includes(pathL), 'L host copy offered');
    assert.equal(await note.textContent(), "Delete the host's copy removes " + pathL + " from SillyTavern's image folder. ComfyUI's own output folder may hold another copy that SillyNovel cannot see.");
    assert.deepEqual(Object.keys(await images()).sort(), Object.keys(imagesL).sort(), 'never automatic');
    await button("Delete the host's copy").click();
    await untilStatus(/^Deleted the host's copy at /);
    const imagesAfterL = await images();
    assert.deepEqual(Object.keys(imagesL).filter(k => !(k in imagesAfterL)), addedL, 'exactly that file removed');
    assert.deepEqual(newFiles(imagesL, imagesAfterL), [], 'nothing else in the host folder changed');
    const rowL = (await ledgerJobs())[0];
    assert.equal(rowL.state, 'discarded'); assert.equal(rowL.hostPath, pathL); assert.ok(Number.isSafeInteger(rowL.hostDeletedAt), 'host-deleted recorded');
    evidence.counts.prompts += 1;
    evidence.setup.L = { hostFile: addedL[0], path: pathL };
    pass('L: after Discard preview, Delete the host\'s copy (shown with its sentence, never automatic) removed exactly ' + addedL[0] + ' and nothing else; the ledger row is discarded with hostDeletedAt');

    // M. Takeover from a second page (J2), then Reconcile (J6) picking the late file through the import gate.
    await comfy('/control', { reset: true, script: [{ hold: true }] });
    imagesBeforeCase = await images();
    await submit();
    await until(async () => (await comfyLog()).some(e => e.path === '/prompt'), 'M /prompt');
    await untilStatus(/^Generating on/);
    const jobM = (await ledgerJobs())[0];
    assert.equal(jobM.state, 'pending', 'reserved before the host call');
    const first = page, second = await h.context.newPage();
    watch(second);
    page = second;
    await page.goto(h.origin);
    await attachPage();
    await field('Image session on this host').check();
    await page.locator('.sillynovel-image-workflow__lease').waitFor({ state: 'visible' });
    assert.match(await page.locator('.sillynovel-image-workflow__lease').textContent(), /^This project's image session is open in another tab or page \(tab [0-9a-f]{8}, last heartbeat /);
    assert.equal(await field('Image session on this host').isChecked(), false, 'no takeover without the click');
    await button('Take over').click();
    await untilStatus(/^Took over this project's image session · its count and reservations are kept/);
    assert.equal(await used(), 'Submissions used 3 of 5', 'the count moved with the lease');
    await unresolved().waitFor();
    assert.equal(await unresolved().locator('p').first().textContent(), 'Unresolved request submitted ' + iso(jobM.submittedAt) + ' · host folder /user/images/ · may still be running · Reconcile and Abandon wait for its deadline at ' + iso(jobM.deadlineAt) + '.');
    page = first;
    await untilStatus(/^This image session ended here: another tab or page took it over\./, 40000);
    assert.equal(await field('Image session on this host').isChecked(), false, 'the first page ended its session');
    await comfy('/control', { release: true });
    await untilStatus(/^Cancelled · result discarded; the host kept a copy at /, 30000);
    const lateFile = /the host kept a copy at (\S+)$/.exec(await status())[1];
    await until(hostJobsTerminal, 'M host poll terminal');
    const addedM = newFiles(imagesBeforeCase, await images());
    assert.equal(addedM.length, 1, 'the late file is in the host folder');
    assert.ok(lateFile.endsWith('/' + addedM[0]), lateFile + ' / ' + addedM[0]);
    assert.equal(await page.locator('.sillynovel-image-workflow__preview').isVisible(), false, 'the first page attaches nothing');
    assert.equal((await ledgerJobs())[0].state, 'pending', 'the first page could not settle a job it no longer holds');
    page = second;
    const reconcileM = page.getByRole('button', { name: 'Reconcile the request submitted ' + iso(jobM.submittedAt), exact: true, includeHidden: true });
    await until(async () => await reconcileM.count() === 1, 'M deadline', 140000);
    const catalogBeforeM = await catalogCount();
    await reconcileM.click();
    await untilStatus(/^Choose the file that is this request's result, or None of these\./, 30000);
    assert.deepEqual(await unresolved().locator('.sillynovel-image-workflow__choices button').evaluateAll(b => b.map(e => e.getAttribute('aria-label'))),
        ['Use ' + lateFile + ' as the result of the request submitted ' + iso(jobM.submittedAt), 'None of these is the result of the request submitted ' + iso(jobM.submittedAt)], 'only the late file');
    assert.equal(await page.locator('.sillynovel-image-workflow__preview').isVisible(), false, 'nothing attached by listing');
    await page.getByRole('button', { name: 'Use ' + lateFile + ' as the result of the request submitted ' + iso(jobM.submittedAt), exact: true }).click();
    await untilStatus(/^Reconciled candidate, not imported · the host kept a copy at /);
    assert.equal((await ledgerJobs())[0].state, 'reconciled');
    await button('Import and apply background to Image route').click();
    await untilStatus(/^Imported and applied as the background/);
    // The fixture always returns the same PNG as C's, so the import reuses the project's bytes: same asset, no new library entry.
    assert.equal(await catalogCount(), catalogBeforeM, 'byte reuse: no new library entry');
    assert.match(await page.locator('.sillynovel-visual-status').textContent(), /Background locked\./);
    const rowM = await until(async () => { const row = (await ledgerJobs())[0]; return row.state === 'imported' ? row : null; }, 'M imported row').then(async () => (await ledgerJobs())[0]);
    assert.equal(rowM.hostPath, lateFile); assert.equal(rowM.resultSha256, RESULT_PNG_SHA256);
    assert.equal(rowM.assetId, evidence.setup.C.importedAssetId, 'the ledger links the reused asset');
    const storedM = await h.context.request.get(h.origin + '/api/plugins/sillynovel-storage/projects/' + project.projectId + '/assets/' + rowM.assetId);
    assert.equal(sha(await storedM.body()), RESULT_PNG_SHA256, 'the imported bytes are the late file');
    evidence.counts.prompts += 1; evidence.counts.files += 1;
    evidence.setup.M = { lateFile, assetId: rowM.assetId };
    pass('M: a second page saw the lease held and took it over (count kept at 3); the first page ended at its next heartbeat (LEASE_LOST); its late file ' + addedM[0] + ' was kept by the host; after the deadline Reconcile listed only that file, and choosing it went through the fetch, the PNG check and Import and apply (background applied and locked, the identical bytes reusing C\'s asset, ledger reconciled then imported with that asset, stored bytes = fixture PNG)');

    // N. Reload during a held job (J1, J6): the reloaded page takes over, finds the job unresolved, and the host folder holds no late file.
    await comfy('/control', { reset: true, script: [{ hold: true }] });
    draft = DRAFT.prompt + ', third take';
    await field('Image prompt').fill(draft);
    imagesBeforeCase = await images();
    await submit();
    await until(async () => (await comfyLog()).some(e => e.path === '/prompt'), 'N /prompt');
    await untilStatus(/^Generating on/);
    const jobN = (await ledgerJobs())[0];
    await page.reload();
    await attachPage();
    await field('Image session on this host').check();
    await page.locator('.sillynovel-image-workflow__lease').waitFor({ state: 'visible' });
    await button('Take over').click();
    await untilStatus(/^Took over this project's image session/);
    assert.equal(await used(), 'Submissions used 4 of 5', 'the reservation survived the reload');
    await unresolved().waitFor();
    assert.equal(await button('Submit').isDisabled(), true, 'Submit waits for the unresolved request');
    await comfy('/control', { release: true });
    await until(hostJobsTerminal, 'N host poll terminal', 30000);
    await delay(1500);
    const logN = await comfyLog();
    assert.deepEqual(newFiles(imagesBeforeCase, await images()), [], 'no late file: the host saves a result from the page, and that page is gone');
    const reconcileN = page.getByRole('button', { name: 'Reconcile the request submitted ' + iso(jobN.submittedAt), exact: true, includeHidden: true });
    await until(async () => await reconcileN.count() === 1, 'N deadline', 140000);
    await reconcileN.click();
    await untilStatus(/^No image in the host folder is dated at or after this request\. Reconcile again later, or Abandon it\.$/, 30000);
    await page.getByRole('button', { name: 'None of these is the result of the request submitted ' + iso(jobN.submittedAt), exact: true }).click();
    await untilStatus(/^Nothing attached\./);
    await page.getByRole('button', { name: 'Abandon the request submitted ' + iso(jobN.submittedAt), exact: true }).click();
    await untilStatus(/^Abandoned · the unit stays spent\.$/);
    await until(async () => await unresolved().count() === 0 && await button('Submit').isEnabled(), 'N resolved');
    assert.equal(await used(), 'Submissions used 4 of 5');
    evidence.counts.prompts += 1; evidence.counts.interrupts += logN.filter(e => e.path === '/interrupt').length;
    evidence.setup.N = { hostInterruptOnReload: logN.some(e => e.path === '/interrupt') };
    pass('N: a reload during a held job left its reservation (used 4 of 5 after takeover) and the job unresolved; the host folder gained no file (the host saves results from the page; host /interrupt on reload: ' + evidence.setup.N.hostInterruptOnReload + '); after the deadline Reconcile found nothing, None of these attached nothing, and Abandon resolved it with the unit spent');

    // O. The ledger rows match what happened, in submission order.
    const rows = (await ledgerJobs()).reverse();
    evidence.setup.ledger = rows.map(r => ({ state: r.state, hostPath: r.hostPath, hostDeleted: Boolean(r.hostDeletedAt), assetId: r.assetId }));
    assert.deepEqual(rows.map(r => r.state), ['imported', 'stale', 'stale', 'stale', 'discarded', 'discarded', 'discarded', 'discarded', 'discarded', 'failed', 'discarded', 'imported', 'abandoned']);
    assert.equal(rows[0].assetId, evidence.setup.C.importedAssetId, 'C imported its asset');
    assert.equal(rows[0].hostPath, evidence.setup.C.statusPath, 'C kept its host path');
    assert.equal(rows[1].hostPath === null, false, 'D kept the disclosed host path');
    assert.equal(rows[2].hostPath, null, 'E (stopped) has no host file');
    assert.ok(rows.slice(4, 9).every(r => r.hostPath?.startsWith('/user/images/')), 'H\'s five candidates were discarded with their paths');
    assert.ok(rows[10].hostDeletedAt && rows.filter(r => r.hostDeletedAt).length === 1, 'only L\'s host copy was deleted');
    assert.equal(rows[11].hostPath, lateFile); assert.equal(rows[12].hostPath, null);
    assert.deepEqual((await plugin('/projects/' + project.projectId + '/image/session')).jobs, [], 'nothing unresolved');
    assert.ok(rows.every(r => !JSON.stringify(r).includes(CHAT_DECOY) && !DECOY_STRINGS.some(d => r.review.includes(d))), 'no chat, card or persona text in the ledger');
    const invO = await inventory();
    assert.deepEqual(invO.settings.extension_settings.sd, sdSaved, 'saved extension_settings.sd unchanged since C');
    assert.deepEqual(Object.keys({ ...invG2.files, ...invO.files }).filter(k => k !== 'default-user/settings.json' && !isDeepStrictEqual(invG2.files[k], invO.files[k])), [], 'canonical chat, card, persona and lorebook files unchanged since G');
    pass('O: the ledger rows match the campaign in order (C imported; D, E, G stale; H five discarded; K failed; L discarded with its host copy deleted; M imported from the reconciled late file; N abandoned); nothing unresolved; no chat, card or persona text stored; saved extension_settings.sd and canonical files unchanged');

    evidence.counts.textRequests = 0;
    const unexpected = h.pageErrors.filter(text => !/Chat changed|aborted|interrupt/i.test(text));
    evidence.pageErrors = h.pageErrors;
    assert.deepEqual(unexpected, [], 'no unexpected page errors');
    evidence.result = 'PASS';
} catch (error) {
    evidence.result = 'FAIL';
    evidence.error = error.stack;
    console.error(error);
    await page?.screenshot({ path: join(h.root, 'failure.png') }).catch(() => {});
    process.exitCode = 1;
} finally {
    evidence.fixtureConsoleTail = fixtureOut.slice(-4096);
    if (h?.root) await writeFile(join(h.root, 'evidence.json'), JSON.stringify(evidence, null, 2)).catch(e => { console.error(e); process.exitCode = 1; });
    try { await h?.close(); } catch (e) { console.error(e); process.exitCode = 1; }
    try { await stopFixture(); } catch (e) { console.error(e); process.exitCode = 1; }
    console.log('RESULT ' + evidence.result);
    if (h?.root) console.log('Evidence ' + join(h.root, 'evidence.json'));
}
