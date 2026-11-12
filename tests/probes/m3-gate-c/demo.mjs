// M3.3 PR D: the seven Gate C demonstrations on the SYNTHETIC fixture, on the disposable pinned SillyTavern 1.19.0 host.
// Never the owner's install (createHarness refuses any source that is not the pin and clones it into an owned TMPDIR root),
// never the owner's ComfyUI (the fake ComfyUI listens on an ephemeral loopback port and 8188 is refused), never a real provider.
//   node tests/probes/m3-gate-c/demo.mjs --owner <pinned-host-root>            headed; the owner clicks, Enter between steps
//   node tests/probes/m3-gate-c/demo.mjs --proof-loopback <pinned-host-root>   headless; every demonstration automated and asserted
// SN_PLAYWRIGHT_MODULE set; port 8128 free. Add --only id,id to run some demonstrations (owner mode only).
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const parseReviewPositive = text => /^Positive: (.*)$/m.exec(text)?.[1] ?? '\u0000';
export const TEXT_ORIGIN = 'http://127.0.0.1:8128';
export const OWNER_PORTS = Object.freeze([8000, 8188]);

// Expected changes per demonstration, counted from the fixture's /prompt log, the ledger and the host's image folder.
export const DEMOS = Object.freeze([
    { id: 'new-background', title: 'New background', fixture: [{ hold: true }], expect: { prompts: 1, rows: ['imported'], filesNet: 1, replies: 1 },
        owner: [{ say: 'Press Submit. While it says Generating, send one chat message and watch the reply arrive. Press Enter here to let the fixture finish.', then: 'release' },
            { say: 'Press Import and apply background, then Save project. Press Enter.' }] },
    { id: 'cache-hit', title: 'Cache hit', needs: ['new-background'], fixture: [], expect: { prompts: 0, rows: [], filesNet: 0, replies: 0 },
        owner: [{ say: 'Pick Forest in Background and press Apply background. Keep the same prompt and press Submit: it should offer Use the previous result. Press it (nothing is sent or counted). Press Enter.' }] },
    { id: 'rejected-candidate', title: 'Rejected candidate', fixture: [{}], expect: { prompts: 1, rows: ['discarded'], filesNet: 0, replies: 0, hostDeleted: 1 },
        owner: [{ say: 'Change the Image prompt (add ", second take"), press Submit, then Discard preview, then Delete the host\'s copy. Press Enter.' }] },
    { id: 'policy-refusal', title: 'Policy refusal (synthetic, J7)', fixture: [{ refusal: true }], expect: { prompts: 1, rows: ['failed'], filesNet: 0, replies: 1 },
        owner: [{ say: 'Press Submit. The fixture refuses it as a synthetic content-policy refusal. Then send one chat message. Press Enter.' }] },
    { id: 'timeout', title: 'Timeout and a late image', fixture: [{ hold: true }], expect: { prompts: 1, rows: ['stale'], filesNet: 1, replies: 1 },
        owner: [{ say: 'Press Submit and send one chat message while it runs. Wait for "No result after 120 s · outcome unknown" (two minutes; Abandon appears). Do not press Abandon. Press Enter here to deliver the late image.', then: 'release' },
            { say: 'The late image must be discarded and nothing applied. Press Enter.' }] },
    { id: 'cancelled-or-stale', title: 'Cancelled or stale job', fixture: [{ hold: true }, { hold: true }, { hold: true }], fresh: true, expect: { prompts: 3, rows: ['stale', 'stale', 'abandoned'], filesNet: 2, replies: 1 },
        owner: [{ say: 'Press Submit, send one chat message, then press Cancel. Press Enter here to let the fixture finish.', then: 'release' },
            { say: 'Press Submit, then, while it runs, apply a different background: in Background pick Harbor if Forest is on stage, otherwise Forest, and press Apply background. Press Enter here to deliver the result.', then: 'release' },
            { say: 'Press Submit, then reload the page while it runs. Reopen the chat, SillyNovel and the project, turn the session on and press Take over. Submit stays disabled while the request is unresolved. Press Enter.', then: 'release' },
            { say: 'Wait for the request\'s deadline (two minutes after Submit), then press Abandon on the unresolved request. Press Enter.' }] },
    { id: 'usage-limit', title: 'Configured usage limit', fixture: [], fresh: true, expect: { prompts: 5, rows: ['candidate|discarded', 'candidate|discarded', 'candidate|discarded', 'candidate|discarded', 'candidate|discarded'], filesNet: 5, replies: 0 },
        owner: [{ say: 'Press Submit five times, waiting for each candidate. The sixth Submit is disabled. Reload, reopen, turn the session on and Take over: it still says 5 of 5. Press Enter.' }] },
]);

// Every demonstration starts with the session on, whether it runs alone (--only) or after another.
export const ownerPreamble = demo => demo.fresh
    ? 'Start a fresh session: if Image session on this host is on, turn it off; then turn it on.'
    : 'If Image session on this host is off, turn it on (press Take over if another tab or page holds it).';

export function parseDemoArgs(argv) {
    const flags = [], rest = [];
    let only = null;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--only') { only = argv[++i] ?? ''; continue; }
        (argv[i].startsWith('--') ? flags : rest).push(argv[i]);
    }
    const owner = flags.includes('--owner'), proof = flags.includes('--proof-loopback');
    if (flags.some(f => !['--owner', '--proof-loopback'].includes(f))) throw Error('Refused: unknown option ' + flags.find(f => !['--owner', '--proof-loopback'].includes(f)) + '.');
    if (owner === proof) throw Error('Refused: use exactly one of --owner or --proof-loopback.');
    if (rest.length !== 1) throw Error('Refused: give exactly one pinned host root.');
    let demos = DEMOS.map(d => d.id);
    if (only !== null) {
        if (proof) throw Error('Refused: the proof runs every demonstration.');
        const asked = only.split(',').filter(Boolean);
        if (!asked.length || asked.some(id => !demos.includes(id))) throw Error('Refused: --only takes ids from ' + demos.join(', ') + '.');
        // A demonstration that builds on an earlier one's result (the cache hit needs the imported new background) needs it selected too.
        const missing = DEMOS.filter(d => asked.includes(d.id)).flatMap(d => (d.needs ?? []).filter(n => !asked.includes(n)).map(n => d.id + ' needs ' + n));
        if (missing.length) throw Error('Refused: ' + missing.join('; ') + ' in the same run.');
        demos = demos.filter(id => asked.includes(id));
    }
    return { mode: owner ? 'owner' : 'proof', host: resolve(rest[0]), demos };
}

// The host contacts backends from its server, so the page's requests all go to the host's own origin; the backend address
// travels in the JSON body (`url` for every image source at the pin). The guard therefore reads the body.
const COMFY_BACKEND = new Set(['ping', 'samplers', 'models', 'schedulers', 'vaes', 'generate']), COMFY_LOCAL = new Set(['workflows', 'workflow']);
const URL_KEY = /^(url|urls|api_server|server_url|custom_url|reverse_proxy|server|endpoint|.+_endpoint)$/;
const STORE_ONLY = ['/api/settings/save', '/api/plugins/'];
const originOf = value => { try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.origin : null; } catch { return null; } };
export function guardDecision({ pathname, body, contentType = '' }, { fixtureOrigin, textOrigin = TEXT_ORIGIN }) {
    if (!pathname.startsWith('/api/')) return { allow: true };
    // A JSON array (the tokenizer's message list) has no top-level keys, so it carries no backend address.
    const json = (() => { if (body == null || body === '') return {}; try { const v = JSON.parse(body); return v && typeof v === 'object' ? v : undefined; } catch { return undefined; } })();
    const parsed = json && !Array.isArray(json) ? json : json && {};
    const addresses = Object.entries(parsed ?? {}).filter(([key, value]) => URL_KEY.test(key) && value !== '' && value != null).flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map(item => [key, item]));
    if (pathname.startsWith('/api/sd/')) {
        const [, , , source, route, extra] = pathname.split('/');
        if (source !== 'comfy' || extra !== undefined || !(COMFY_BACKEND.has(route) || COMFY_LOCAL.has(route))) return { allow: false, reason: 'image route other than the fixture ComfyUI' };
        if (json === undefined || Array.isArray(json)) return { allow: false, reason: 'unparseable body' };
        // The workflow routes read local files, but the page still sends `url`; it must be the fixture too.
        if (COMFY_LOCAL.has(route)) return addresses.every(([, item]) => originOf(item) === fixtureOrigin) ? { allow: true } : { allow: false, reason: 'backend address on a local route is not the fixture' };
        return typeof parsed.url === 'string' && originOf(parsed.url) === fixtureOrigin ? { allow: true } : { allow: false, reason: 'ComfyUI URL is not the fixture' };
    }
    if (STORE_ONLY.some(p => pathname.startsWith(p))) return { allow: true };
    if (!/json/i.test(contentType)) return { allow: true };
    if (json === undefined) return { allow: false, reason: 'unparseable body' };
    // Some keys hold a choice name (zai_endpoint: 'common'); only a value that is an http(s) address is a backend address.
    const foreign = addresses.find(([, item]) => originOf(item) !== null && ![fixtureOrigin, textOrigin].includes(originOf(item)));
    return foreign ? { allow: false, reason: 'backend address ' + foreign[0] + ' is not a fixture' } : { allow: true };
}

async function main() {
    const options = parseDemoArgs(process.argv.slice(2));
    const { createHarness, DECOYS, repo } = await import('../m2-director/harness.mjs');
    const { RESULT_PNG_SHA256 } = await import('../../fixtures/m3-comfy-endpoint.mjs');
    const { nativeAnswer } = await import('../../fixtures/m2-director-endpoint.mjs');
    const FIXTURE = join(repo, 'tests/fixtures/m3-comfy-endpoint.mjs'), CHAT_FILE = 'Gate C reading', ACTOR = 'Gate C';
    const DRAFT = { prompt: 'a quiet harbor at dusk', negativePrompt: 'SN-DRAFT-NEG' };
    const proof = options.mode === 'proof';
    const record = { schemaVersion: 1, label: 'SYNTHETIC', mode: options.mode, candidate: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version, demos: [], guard: { aborted: [], tamper: [] }, notes: ['Synthetic fixture only: no real ComfyUI, no real provider; a policy refusal here is the fixture\'s synthetic refusal (J7).'] };
    let h, page, fixture, fixtureOut = '', fixtureOrigin, imagesRoot, project, forest, draft = DRAFT.prompt, submits = 0, phase = 'setup', headed;
    const reviews = [];
    const until = async (check, what, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await check(); if (v) return v; await delay(50); } throw Error('Timed out: ' + what); };
    const comfy = async (path, payload) => (await fetch(fixtureOrigin + path, { signal: AbortSignal.timeout(10000), ...(payload === undefined ? {} : { method: 'POST', body: JSON.stringify(payload) }) })).json();
    const prompts = async () => (await comfy('/log')).filter(e => e.path === '/prompt').length;
    async function images() {
        const files = {};
        async function walk(dir) {
            let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
            for (const e of entries) { const file = join(dir, e.name); if (e.isDirectory()) await walk(file); else files[file.slice(imagesRoot.length + 1)] = sha(await readFile(file)); }
        }
        await walk(imagesRoot); return files;
    }
    // ponytail: these page helpers restate tests/probes/m3-image-route/host.mjs, whose bytes stay frozen so PR C's campaign is reused by SHA.
    // Upgrade path: move them into a shared module when the Gate C frozen candidate gets its own full campaign.
    const button = name => page.locator('#sillynovel-stage').getByRole('button', { name, exact: true, includeHidden: true });
    const field = name => page.locator('.sillynovel-image-workflow').getByLabel(name, { exact: true });
    const status = () => page.locator('.sillynovel-image-workflow__status').textContent();
    const problems = () => page.locator('.sillynovel-image-workflow__generation-problems').textContent();
    const used = () => page.locator('.sillynovel-image-workflow__generation p', { hasText: /^Submissions used / }).textContent();
    const untilStatus = (pattern, ms) => until(async () => pattern.test(await status()), 'status ' + pattern, ms);
    const ledgerJobs = () => h.plugin('/projects/' + project.projectId + '/image/jobs');
    const savedSd = async () => JSON.parse(await readFile(join(h.data, 'default-user/settings.json'))).extension_settings?.sd;
    const iso = ms => new Date(ms).toISOString();
    async function installGuard(context) {
        await context.route(url => url.origin === h.origin && url.pathname.startsWith('/api/'), async route => {
            const request = route.request(), { pathname } = new URL(request.url());
            let body; try { body = request.postData(); } catch { body = undefined; }
            const decision = body === undefined ? { allow: !pathname.startsWith('/api/sd/'), reason: 'unreadable body' } : guardDecision({ pathname, body, contentType: request.headers()['content-type'] }, { fixtureOrigin });
            if (decision.allow) return route.continue();
            record.guard.aborted.push({ at: new Date().toISOString(), phase, method: request.method(), path: pathname, reason: decision.reason });
            console.log('GUARD aborted ' + request.method() + ' ' + pathname + ': ' + decision.reason);
            return route.abort('blockedbyclient');
        });
    }
    // Before each demonstration: the host's saved image settings must still point at the fixture, or nothing continues.
    async function checkSaved() {
        const sd = await savedSd();
        if (sd?.comfy_url !== fixtureOrigin || sd.source !== 'comfy' || sd.comfy_type !== 'standard') throw Error('STOP: the saved image settings no longer point at the fixture ' + fixtureOrigin);
    }
    async function select(name) {
        const icon = page.locator('#rightNavDrawerIcon');
        if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
        await page.locator('#right-nav-panel.openDrawer').waitFor({ state: 'visible' });
        if (!await page.locator('#rm_button_create').isVisible()) await page.locator('#rm_button_characters').click();
        await page.locator('#rm_print_characters_block').getByText(name, { exact: true }).first().click();
        await page.waitForFunction(n => SillyTavern.getContext().chat[0]?.name === n, name);
        await icon.click();
        await page.locator('#right-nav-panel').waitFor({ state: 'hidden' });
    }
    async function openProject() {
        await page.locator('.sillynovel-controls').evaluate(e => { e.open = true; });
        await page.locator('#sillynovel-stage').getByLabel('Saved project', { exact: true }).selectOption(project.projectId);
        await button('Open project and use with this chat').click();
        await page.waitForFunction(() => document.querySelector('.sillynovel-project-status').textContent.includes('Gate C · revision'));
    }
    async function openWorkflow() {
        await page.locator('.sillynovel-controls').evaluate(e => { e.open = true; });
        if (await page.locator('#sillynovel-image-workflow-body').isHidden()) await button('Image workflow').click();
        if (await field('Image prompt').inputValue() !== draft) await field('Image prompt').fill(draft);
        if (await field('Negative prompt').inputValue() !== DRAFT.negativePrompt) await field('Negative prompt').fill(DRAFT.negativePrompt);
    }
    async function attachPage() {
        await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
        await page.waitForFunction(() => SillyTavern.getContext().extensionSettings.sd?.source === 'comfy' && SillyTavern.getContext().SlashCommandParser.commands.imagine);
        await until(() => page.evaluate(s => s.every(k => document.querySelectorAll('#sd_' + k + ' option').length > 0), ['model', 'sampler', 'scheduler', 'vae']), 'image option lists populated');
        await select(ACTOR);
        await page.evaluate(async file => { await (await import('/script.js')).openCharacterChat(file); }, CHAT_FILE);
        await page.waitForFunction(() => SillyTavern.getContext().chat.length >= 2);
        if (!await page.locator('#sillynovel-enabled').isChecked()) {
            const drawer = page.locator('.drawer-icon[title="Extensions"]');
            await drawer.click(); await page.locator('#sillynovel-enabled').setChecked(true); await drawer.click();
        }
        await page.locator('#sillynovel-stage').waitFor();
        await until(async () => await page.locator('#sillynovel-stage').getByLabel('Saved project', { exact: true }).locator('option[value="' + project.projectId + '"]').count() === 1, 'saved project listed');
        await openProject();
        await openWorkflow();
    }
    async function sessionOn(fresh = true) {
        const begun = page.waitForResponse(r => r.url().endsWith('/image/session') && r.request().method() === 'GET');
        await field('Image session on this host').check();
        await begun; await delay(300);
        await page.waitForFunction(() => !document.querySelector('.sillynovel-image-workflow__review').hidden);
        if (fresh) await until(async () => /^Submissions used 0 of 5$/.test(await used()), 'fresh allowance');
        await until(async () => (await button('Submit').isEnabled()) || (await problems()) !== '', 'session begun');
    }
    async function submit() {
        assert.equal((await page.evaluate(() => SillyTavern.getContext().extensionSettings.sd.comfy_url)), fixtureOrigin, 'comfy_url is the fixture before Submit');
        assert.equal(await button('Submit').isEnabled(), true, 'Submit enabled');
        reviews.push(await page.locator('.sillynovel-image-workflow__review').textContent());
        await button('Submit').click(); submits++;
    }
    const held = async () => { await until(async () => (await comfy('/log')).some(e => e.path === '/prompt' && e.promptId) && (await comfy('/control', {})).held > 0, 'job held'); await untilStatus(/^Generating on 127\.0\.0\.1:\d+ · reading and replying continue$/); };
    // Reading and replying continue: one ordinary message, answered by the synthetic text endpoint, while the image job is held.
    async function reply(text) {
        const before = await page.evaluate(() => SillyTavern.getContext().chat.length), served = (await h.requests()).length;
        await page.locator('#send_textarea').fill(text);
        await page.locator('#send_but').click();
        await until(() => page.evaluate(([n, a]) => { const c = SillyTavern.getContext().chat; return c.length === n + 2 && c.at(-1).mes === a; }, [before, nativeAnswer]), 'reply appended', 30000);
        console.log('REPLY served during the image job (' + ((await h.requests()).length - served) + ' text request)');
        return 1;
    }
    const background = () => page.locator('.sillynovel-selected-art').textContent();
    async function snapshot() { return { prompts: await prompts(), files: await images(), rows: (await ledgerJobs()).map(r => r.id), texts: (await h.requests()).length }; }
    async function changes(before) {
        const after = await snapshot(), rows = await ledgerJobs(), fresh = rows.filter(r => !before.rows.includes(r.id)).reverse();
        return { prompts: after.prompts, filesAdded: Object.keys(after.files).filter(k => !(k in before.files)), filesRemoved: Object.keys(before.files).filter(k => !(k in after.files)),
            rows: fresh.map(r => ({ state: r.state, hostPath: r.hostPath, hostDeleted: Boolean(r.hostDeletedAt) })), textRequests: after.texts - before.texts };
    }
    const matches = (demo, seen) => seen.prompts === demo.expect.prompts && seen.rows.length === demo.expect.rows.length && seen.rows.every((r, i) => demo.expect.rows[i].split('|').includes(r.state))
        && seen.filesAdded.length - seen.filesRemoved.length === demo.expect.filesNet && (demo.expect.hostDeleted ?? 0) === seen.rows.filter(r => r.hostDeleted).length;

    // Automated steps for the proof: the same clicks the owner is asked to make.
    const steps = {
        async 'new-background'(note) {
            await sessionOn();
            await submit(); await held();
            note.replies = await reply('Is the harbor office still open?');
            assert.equal((await comfy('/control', {})).held, 1, 'the image job was still running while the reply arrived');
            await comfy('/control', { release: true });
            await untilStatus(/^Candidate, not imported/, 60000);
            await button('Import and apply background to Gate C').click();
            await untilStatus(/^Imported and applied as the background/);
            await button('Save project').click();
            await page.waitForFunction(() => document.querySelector('.sillynovel-unsaved').dataset.state === 'saved');
            const saved = await h.plugin('/projects/' + project.projectId);
            note.importedAssetId = saved.scene.backgroundAssetId;
            assert.notEqual(note.importedAssetId, forest, 'the new background is applied and saved');
            const stored = await h.context.request.get(h.origin + '/api/plugins/sillynovel-storage/projects/' + project.projectId + '/assets/' + note.importedAssetId, { headers: { Connection: 'close' } });
            assert.equal(sha(await stored.body()), RESULT_PNG_SHA256);
            assert.equal(await used(), 'Submissions used 1 of 5');
        },
        async 'cache-hit'(note) {
            await page.locator('#sillynovel-stage').getByLabel('Background', { exact: true }).selectOption(forest);
            await button('Apply background').click();
            await until(async () => (await background()).includes('Selected background: Forest'), 'forest applied');
            const before = await used();
            await submit(); submits--;
            await untilStatus(/^This exact request was imported before as “.+”\. Use the previous result \(nothing is sent or counted\), or Generate again \(counted\)\.$/);
            await button('Use the previous result').click();
            await untilStatus(/^Applied the previous result “.+” as the background · nothing was sent and nothing was counted/);
            assert.equal(await used(), before, 'nothing counted');
            note.used = before;
        },
        async 'rejected-candidate'() {
            draft = DRAFT.prompt + ', second take'; await field('Image prompt').fill(draft);
            await submit();
            await untilStatus(/^Candidate, not imported/, 60000);
            const path = /host kept a copy at (\S+)\. Import/.exec(await status())?.[1];
            assert.ok(path, 'the candidate names its host copy');
            await button('Discard preview').click();
            // The control names the latest resolved job; wait until it is this one, never the imported background's.
            await until(async () => (await page.locator('#sillynovel-image-host-copy-note').textContent()).includes(path), 'host copy offered');
            await button("Delete the host's copy").click();
            await untilStatus(/^Deleted the host's copy at /);
        },
        async 'policy-refusal'(note) {
            await submit();
            await untilStatus(/^The host (returned no image|'s image command failed)\.$/, 30000);
            await delay(1500);
            note.status = await status();
            note.replies = await reply('Did the picture come through?');
        },
        async timeout(note) {
            await submit(); await held();
            note.replies = await reply('I will wait by the lantern.');
            await untilStatus(/^No result after 120 s · outcome unknown; the slot stays reserved\./, 140000);
            assert.equal(await button('Abandon').isVisible(), true, 'Abandon is offered after the deadline');
            const scene = await background();
            await comfy('/control', { release: true });
            await untilStatus(/^No result within 120 s · result discarded; the host kept a copy at /, 30000);
            assert.equal(await background(), scene, 'the late image replaced nothing');
            assert.equal(await page.locator('.sillynovel-image-workflow__preview').isVisible(), false, 'no candidate from the late image');
        },
        async 'cancelled-or-stale'(note) {
            await field('Image session on this host').uncheck(); await sessionOn();
            await submit(); await held();
            note.replies = await reply('Never mind the picture.');
            await button('Cancel').click();
            await comfy('/control', { release: true });
            await untilStatus(/^Cancelled · result discarded; the host kept a copy at /, 30000);
            await until(async () => button('Submit').isEnabled(), 'slot released');
            // A newer scene: the background changes while the request is held; the late result must not replace it.
            await submit(); await held();
            assert.equal((await background()).includes('Selected background: Forest'), false, 'the generated background is on stage before the change');
            await page.locator('#sillynovel-stage').getByLabel('Background', { exact: true }).selectOption(forest);
            await button('Apply background').click();
            await until(async () => (await background()).includes('Selected background: Forest'), 'newer scene');
            const newer = await background();
            await comfy('/control', { release: true });
            await untilStatus(/^Result discarded: /, 30000);
            note.staleStatus = await status();
            assert.equal(await background(), newer, 'the late image did not replace the newer scene');
            // A reload while held: the reservation survives, the next page takes over and cannot submit until the request is resolved.
            await until(async () => button('Submit').isEnabled(), 'slot released');
            await submit(); await held();
            const job = (await ledgerJobs())[0];
            await page.reload(); await attachPage();
            await field('Image session on this host').check();
            await page.locator('.sillynovel-image-workflow__lease').waitFor({ state: 'visible' });
            await button('Take over').click();
            await untilStatus(/^Took over this project's image session/);
            assert.equal(await used(), 'Submissions used 3 of 5', 'the reservation survived the reload');
            assert.equal(await button('Submit').isDisabled(), true, 'no second job while the request is unresolved');
            await comfy('/control', { release: true });
            const abandon = page.getByRole('button', { name: 'Abandon the request submitted ' + iso(job.submittedAt), exact: true, includeHidden: true });
            await until(async () => await abandon.count() === 1 && await abandon.isEnabled(), 'deadline', 140000);
            await abandon.click();
            await untilStatus(/^Abandoned · the unit stays spent\.$/);
        },
        async 'usage-limit'(note) {
            await field('Image session on this host').uncheck(); await sessionOn();
            for (let i = 1; i <= 5; i++) {
                await submit();
                await until(async () => (await used()) === 'Submissions used ' + i + ' of 5' && /^Candidate, not imported/.test(await status()) && await prompts() === i, 'submission ' + i, 60000);
            }
            assert.equal(await button('Submit').isDisabled(), true, 'the sixth Submit is disabled');
            assert.match(await problems(), /All 5 submissions in this image session are used\./);
            await page.reload(); await attachPage();
            await field('Image session on this host').check();
            await page.locator('.sillynovel-image-workflow__lease').waitFor({ state: 'visible' });
            await button('Take over').click();
            await untilStatus(/^Took over this project's image session/);
            note.afterReload = await used();
            assert.equal(note.afterReload, 'Submissions used 5 of 5', 'the count survives a reload');
            assert.equal(await button('Submit').isDisabled(), true, 'still refused after the reload');
        },
    };

    try {
        // Ports first: 8128 must be free for the text endpoint, and the owner's ports are never used.
        const probe = createServer();
        await new Promise((ok, fail) => probe.once('error', fail).listen(8128, '127.0.0.1', ok)).catch(() => { throw Error('Refused: port 8128 is in use.'); });
        await new Promise(ok => probe.close(ok));
        h = await createHarness(options.host, 'm3-gate-c');
        page = h.page;
        imagesRoot = join(h.data, 'default-user/user/images');
        record.browser = page.context().browser().version();
        fixture = spawn(process.execPath, [FIXTURE], { env: { ...process.env, SN_COMFY_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
        fixture.stdout.on('data', p => { fixtureOut = (fixtureOut + p).slice(-65536); });
        fixture.stderr.on('data', p => { fixtureOut = (fixtureOut + p).slice(-65536); });
        await until(() => /listening on \d+/.test(fixtureOut) || fixture.exitCode !== null, 'fixture start', 10000);
        const port = Number(/listening on (\d+)/.exec(fixtureOut)?.[1]);
        assert.ok(Number.isInteger(port) && port > 0 && !OWNER_PORTS.includes(port), 'fixture port ' + port);
        fixtureOrigin = 'http://127.0.0.1:' + port;
        record.fixtureOrigin = fixtureOrigin;
        assert.equal((await comfy('/system_stats')).system.comfyui_version, 'sn-comfy-fixture');
        await installGuard(h.context);

        // Setup (as image-route A): a synthetic character and chat, decoys, a saved project with a background, the host's image extension on the fixture.
        await page.goto(h.origin);
        await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
        await page.waitForFunction(() => SillyTavern.getContext().extensionSettings.sd?.comfy_url !== undefined && SillyTavern.getContext().SlashCommandParser.commands.imagine);
        await h.native('/api/characters/create', { ch_name: ACTOR, description: DECOYS.card, first_mes: 'Welcome to the harbor office.' });
        const message = (name, mes, is_user = false) => ({ name, mes, is_user, is_system: false, send_date: '2026-11-11T12:00:00.000Z', extra: {} });
        await h.native('/api/chats/save', { avatar_url: ACTOR + '.png', file_name: CHAT_FILE, chat: [{ user_name: DECOYS.personaName, character_name: ACTOR, create_date: '2026-11-11T12:00:00.000Z', chat_metadata: {} },
            message(ACTOR, 'The harbor office is quiet.'), message(DECOYS.personaName, 'Meet me by the lantern.', true)] });
        const created = await h.plugin('/projects', 'POST', { name: 'Gate C' }, 201);
        forest = (await h.plugin('/projects/' + created.projectId + '/assets', 'POST', await readFile(join(repo, 'tests/fixtures/m12-stage/forest.png')), 201, 'image/png')).assetId;
        // A second background, so a standalone cancelled-or-stale run (--only) always has a different scene to apply.
        const harbor = (await h.plugin('/projects/' + created.projectId + '/assets', 'POST', await readFile(join(repo, 'tests/fixtures/m12-stage/sage.png')), 201, 'image/png')).assetId;
        project = await h.plugin('/projects/' + created.projectId, 'PUT', { schemaVersion: 2, expectedRevision: 0, name: 'Gate C', scene: { backgroundAssetId: forest, backgroundLocked: false, actors: [] }, catalog: [{ assetId: forest, kind: 'background', actorId: null, label: 'Forest' }, { assetId: harbor, kind: 'background', actorId: null, label: 'Harbor' }] });
        await page.evaluate(async origin => {
            const sd = SillyTavern.getContext().extensionSettings.sd;
            sd.comfy_url = origin;
            Object.assign(sd, { source: 'comfy', comfy_type: 'standard', comfy_workflow: 'Default_Comfy_Workflow.json', seed: 1234, free_extend: false, multimodal_captioning: false, refine_mode: false, interactive_mode: false, function_tool: false, comfy_placeholders: [], prompt_prefix: 'SN-PREFIX-TEXT,', negative_prompt: 'SN-NEG-PREFIX' });
            await (await import('/script.js')).saveSettings();
        }, fixtureOrigin);
        assert.equal((await savedSd())?.comfy_url, fixtureOrigin, 'image settings saved before reload');
        await page.reload();
        await page.waitForFunction(() => SillyTavern.getContext().extensionSettings.sd?.source === 'comfy' && SillyTavern.getContext().SlashCommandParser.commands.imagine);
        await until(() => page.evaluate(s => s.every(k => document.querySelectorAll('#sd_' + k + ' option').length > 0), ['model', 'sampler', 'scheduler', 'vae']), 'image option lists populated');
        await page.evaluate(async keys => {
            const sd = SillyTavern.getContext().extensionSettings.sd;
            for (const key of keys) { const el = document.querySelector('#sd_' + key); if (el?.selectedOptions.length && ![...el.options].some(o => o.value === sd[key])) sd[key] = el.selectedOptions[0].value; }
            await (await import('/script.js')).saveSettings();
        }, ['model', 'sampler', 'scheduler', 'vae']);
        await select(ACTOR);
        await h.seedDecoys();
        await h.connect();
        record.since = new Date().toISOString();
        await attachPage();
        const sdBaseline = await savedSd(), inventoryBaseline = await h.inventory();
        const chatBaseline = await page.evaluate(() => SillyTavern.getContext().chat.map(m => [m.name, m.is_user, m.mes]));
        assert.equal(await field('Image session on this host').isChecked(), false, 'the session is off until the user turns it on');

        // The guard on a tampered page: an unused loopback port (never 8188) set in the page is aborted before the host sees it,
        // and a body that cannot be parsed is aborted too. A sentinel listens on that port and must see nothing.
        phase = 'tamper';
        if (proof) {
            const sentinel = createServer((req, res) => { sentinel.hits++; res.end(); }); sentinel.hits = 0;
            await new Promise(ok => sentinel.listen(0, '127.0.0.1', ok));
            const tampered = 'http://127.0.0.1:' + sentinel.address().port;
            assert.ok(!OWNER_PORTS.includes(sentinel.address().port) && tampered !== fixtureOrigin);
            const before = (await comfy('/log')).length;
            const results = await page.evaluate(async url => {
                const sd = SillyTavern.getContext().extensionSettings.sd, kept = sd.comfy_url, headers = SillyTavern.getContext().getRequestHeaders(), out = [];
                sd.comfy_url = url;
                for (const [route, body] of [['ping', JSON.stringify({ url: sd.comfy_url })], ['generate', JSON.stringify({ url: sd.comfy_url, prompt: '{}' })], ['generate', '{not json']]) {
                    try { const r = await fetch('/api/sd/comfy/' + route, { method: 'POST', headers, body }); out.push({ route, status: r.status }); } catch (e) { out.push({ route, aborted: e.name }); }
                }
                sd.comfy_url = kept;
                return out;
            }, tampered);
            await delay(500);
            record.guard.tamper = { target: 'an unused loopback port (never 8000 or 8188), set as comfy_url in the page only', requests: results, sentinelConnections: sentinel.hits };
            assert.ok(results.every(r => r.aborted), 'every tampered request was aborted: ' + JSON.stringify(results));
            assert.equal(sentinel.hits, 0, 'the tampered port saw no connection');
            assert.equal((await comfy('/log')).length, before, 'the fixture saw no request');
            assert.equal(record.guard.aborted.filter(a => a.phase === 'tamper').length, 3, 'three aborts recorded');
            await new Promise(ok => sentinel.close(ok));
            await checkSaved();
            console.log('PASS guard: a tampered ComfyUI URL and an unparseable body were aborted; the unused port and the fixture saw nothing');
        } else {
            await page.close();
            const { chromium } = await import(process.env.SN_PLAYWRIGHT_MODULE || 'playwright');
            headed = await chromium.launch({ headless: false });
            const context = await headed.newContext({ viewport: { width: 1440, height: 1000 } });
            await installGuard(context);
            const token = (await (await context.request.get(h.origin + '/csrf-token', { headers: { Connection: 'close' } })).json()).token;
            assert.equal((await context.request.post(h.origin + '/api/users/login', { headers: { Connection: 'close', 'X-CSRF-Token': token }, data: { handle: 'default-user' } })).status(), 200);
            page = await context.newPage(); page.setDefaultTimeout(20000);
            page.on('dialog', d => d.accept().catch(() => {}));
            await page.goto(h.origin);
            await page.waitForFunction(() => globalThis.SillyTavern?.getContext);
            const icon = page.locator('#API-status-top');
            if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
            await page.locator('#api_button_openai').click();
            await page.waitForFunction(() => SillyTavern.getContext().onlineStatus !== 'no_connection');
            await icon.click();
            await attachPage();
            console.log('\nSYNTHETIC Gate C demonstrations on the disposable host ' + h.origin + ' (fixture ComfyUI ' + fixtureOrigin + '). Everything here is synthetic.');
        }

        phase = 'demos';
        const ask = proof ? null : createInterface({ input: process.stdin, output: process.stdout });
        const notes = {};
        for (const demo of DEMOS.filter(d => options.demos.includes(d.id))) {
            await checkSaved();
            await comfy('/control', { reset: true, script: demo.fixture });
            const before = await snapshot(), note = notes[demo.id] = {};
            let error = null;
            try {
                if (proof) await steps[demo.id](note);
                else {
                    console.log('\n== ' + demo.title + ' (SYNTHETIC) ==\n' + ownerPreamble(demo));
                    for (const phase of demo.owner) { await ask.question(phase.say + ' '); await checkSaved(); if (phase.then === 'release') await comfy('/control', { release: true }); }
                }
            } catch (e) { error = e; if ((await comfy('/control', {})).held) await comfy('/control', { release: true }); }
            await delay(1000);
            const seen = await changes(before);
            const entry = { id: demo.id, title: demo.title, label: 'SYNTHETIC', expected: demo.expect, observed: seen, replies: note.replies ?? null, details: note };
            entry.matchesExpected = matches(demo, seen) && (!proof || (note.replies ?? 0) === demo.expect.replies);
            entry.result = error ? 'FAIL' : proof ? (entry.matchesExpected ? 'PASS' : 'FAIL') : 'OBSERVED';
            if (error) entry.error = String(error.stack ?? error).slice(0, 4000);
            record.demos.push(entry);
            console.log(entry.result + ' ' + demo.id + ' ' + JSON.stringify({ prompts: seen.prompts, rows: seen.rows.map(r => r.state), filesNet: seen.filesAdded.length - seen.filesRemoved.length, replies: entry.replies, matchesExpected: entry.matchesExpected }));
            if (error && proof) console.error(error);
        }
        ask?.close();

        // Hard gates over the whole run (synthetic): no automatic generation, no duplicates, canonical files untouched.
        const rows = (await ledgerJobs()).reverse(), allPrompts = record.demos.reduce((n, d) => n + d.observed.prompts, 0);
        record.gates = {
            submitClicks: proof ? submits : null, fixturePrompts: allPrompts, ledgerRows: rows.length,
            noDuplicateJobs: allPrompts === rows.length, noAutomaticGeneration: proof ? allPrompts === submits : null,
            unresolved: (await h.plugin('/projects/' + project.projectId + '/image/session')).jobs.length,
        };
        const inventoryEnd = await h.inventory(), chatFile = Object.keys(inventoryEnd.files).find(k => k.endsWith('/' + CHAT_FILE + '.jsonl'));
        const chatEnd = await page.evaluate(() => SillyTavern.getContext().chat.map(m => [m.name, m.is_user, m.mes]));
        record.gates.canonicalFilesChanged = Object.keys({ ...inventoryBaseline.files, ...inventoryEnd.files }).filter(k => k !== 'default-user/settings.json' && k !== chatFile && !isDeepStrictEqual(inventoryBaseline.files[k], inventoryEnd.files[k]));
        record.gates.earlierChatMessagesUnchanged = isDeepStrictEqual(chatEnd.slice(0, chatBaseline.length), chatBaseline);
        record.gates.imageSettingsUnchanged = isDeepStrictEqual(await savedSd(), sdBaseline);
        record.gates.ledgerHoldsNoChatText = rows.every(r => !Object.values(DECOYS).some(d => JSON.stringify(r).includes(d)) && !chatEnd.some(([, , mes]) => mes.length > 12 && r.review.includes(mes)));
        record.guard.unexpectedAborts = record.guard.aborted.filter(a => a.phase === 'demos');
        record.result = proof
            ? (record.demos.every(d => d.result === 'PASS') && record.gates.noDuplicateJobs && record.gates.noAutomaticGeneration && record.gates.unresolved === 0 && !record.gates.canonicalFilesChanged.length
                && record.gates.earlierChatMessagesUnchanged && record.gates.imageSettingsUnchanged && record.gates.ledgerHoldsNoChatText && !record.guard.unexpectedAborts.length ? 'PASS' : 'FAIL')
            : 'OBSERVED';
        console.log('GATES ' + JSON.stringify(record.gates));
        await mkdir(join(h.root, 'reviews'), { recursive: true });
        for (const [i, text] of [...new Set(reviews)].entries()) await writeFile(join(h.root, 'reviews', 'review-' + (i + 1) + '.txt'), text);
    } catch (error) {
        record.result = 'FAIL';
        record.error = String(error.stack ?? error).slice(0, 8000);
        console.error(error);
        await page?.screenshot({ path: join(h.root, 'failure.png') }).catch(() => {});
    } finally {
        record.fixtureConsoleTail = fixtureOut.slice(-4096);
        await headed?.close().catch(() => {});
        try { await h?.close(); } catch (e) { console.error(e); record.result = 'FAIL'; }
        if (fixture && fixture.exitCode === null && fixture.signalCode === null) {
            const done = new Promise(r => fixture.once('close', r)); fixture.kill('SIGTERM'); await Promise.race([done, delay(5000)]);
            if (fixture.exitCode === null && fixture.signalCode === null) { fixture.kill('SIGKILL'); await done; }
        }
        // The real-session capture pipeline, proved here on the synthetic run: the recovery tool's backup and inspect, then capture.mjs.
        if (proof && h?.root && record.result === 'PASS') {
            try {
                const run = (args, out) => execFileSync(process.execPath, args, { cwd: h.root, timeout: 150000, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8', ...(out ? {} : { stdio: ['ignore', 'pipe', 'pipe'] }) });
                await chmod(h.data, 0o700); // the recovery tool requires a private parent for the database
                const tool = join(h.host, 'plugins/sillynovel-storage/tools/recovery.mjs');
                run([tool, 'backup', join(h.data, '.sillynovel-projects.sqlite'), join(h.root, 'ledger-backup')]);
                await writeFile(join(h.root, 'ledger-inspect.json'), run([tool, 'inspect', join(h.root, 'ledger-backup')]));
                const reviewFiles = (await readdir(join(h.root, 'reviews'))).flatMap(f => ['--review', join(h.root, 'reviews', f)]);
                console.log(run([join(repo, 'tests/probes/m3-gate-c/capture.mjs'), '--proof-loopback', '--images', imagesRoot, '--since', record.since, ...reviewFiles, '--ledger', join(h.root, 'ledger-inspect.json'), '--out', join(h.root, 'capture.json')]).trim());
                const c = JSON.parse(await readFile(join(h.root, 'capture.json'), 'utf8')), net = record.demos.reduce((n, d) => n + d.observed.filesAdded.length - d.observed.filesRemoved.length, 0);
                record.capture = { files: c.files.length, expectedFiles: net, signatures: c.files.every(f => f.pngSignature), backendGraph: [...new Set(c.files.map(f => f.backendGraph))], ledger: c.ledger,
                    textFree: !reviews.some(t => JSON.stringify(c).includes(parseReviewPositive(t))) };
                const l = c.ledger;
                assert.ok(c.files.length === net && record.capture.signatures && l.ledgerRows === record.gates.ledgerRows && l.filesWithoutRow === 0 && l.filesWithSeveralRows === 0
                    && l.rowsWhoseFileIsMissing === 0 && l.rowsDeletedButPresent === 0 && l.rowsDeleted === 1 && l.rowsHashChecked > 0 && l.rowsWhoseHashDiffers === 0 && record.capture.textFree, 'capture: ' + JSON.stringify(record.capture));
                console.log('PASS capture: ' + JSON.stringify(record.capture));
            } catch (error) { record.result = 'FAIL'; record.captureError = String(error.stack ?? error).slice(0, 4000); console.error(error); }
        }
        if (h?.root) await writeFile(join(h.root, 'observations.json'), JSON.stringify(record, null, 2) + '\n');
        console.log('RESULT ' + record.result);
        if (h?.root) console.log('Observations ' + join(h.root, 'observations.json'));
        process.exitCode = record.result === 'PASS' || record.result === 'OBSERVED' ? process.exitCode : 1;
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main().catch(error => { console.error(error.message); process.exit(1); });
