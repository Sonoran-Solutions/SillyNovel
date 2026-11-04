// Gate B fixture runner (plan 6.2, G9). One request per case, one at a time, no retries, no fallback, through the product's own
// buildDirectorRequest and requestDirectorText in a host page whose connection the owner selected by hand. No credential route exists here.
// The owner's run spends 40 requests and is its own authorized step (plan 6.1); nothing starts it automatically:
//   timeout -k 15 3900 node tests/probes/m2-gate-b/run.mjs --owner-accepts-40-requests --origin <host> --out <new file.json>     (SN_PLAYWRIGHT_MODULE set)
// --proof-loopback exists only to show this works: it refuses any origin or connection that is not 127.0.0.1.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { CASES_FILE, checkCases, loadCases, recordedSha, sha256 } from './score.mjs';

const CASE_MS = 90000, GRACE_MS = 120000, CONNECT_MS = 900000, REPO = resolve(import.meta.dirname, '../../..'), LOOPBACK = /^http:\/\/127\.0\.0\.1(:\d+)?(\/|$)/;
const MODULES = ['src/director-request.mjs', 'src/host-adapter.mjs'];
export function parseRunArgs(argv) {
    const args = {}, flags = new Set(argv.filter(item => ['--owner-accepts-40-requests', '--proof-loopback'].includes(item)));
    for (const name of ['origin', 'out', 'per-case-ms', 'extension-base']) { const at = argv.indexOf('--' + name); if (at >= 0) args[name] = argv[at + 1]; }
    const owner = flags.has('--owner-accepts-40-requests'), proof = flags.has('--proof-loopback');
    if (owner && proof) throw Error('Use --owner-accepts-40-requests or --proof-loopback, not both.');
    if (!owner && !proof) throw Error('Refused: --owner-accepts-40-requests is the owner\'s statement that 40 requests may be spent on the connection they select by hand.');
    if (!args.origin) throw Error('Refused: --origin is required.');
    if (!args.out) throw Error('Refused: --out is required.');
    if (proof && !LOOPBACK.test(args.origin)) throw Error('Refused: a proof runs on loopback only.');
    if (owner && args['per-case-ms']) throw Error('Refused: --per-case-ms is for the loopback proof; a measurement uses 90 s.');
    return { mode: owner ? 'owner' : 'loopback-proof', origin: args.origin, out: args.out, perCaseMs: args['per-case-ms'] ? Number(args['per-case-ms']) : CASE_MS, base: args['extension-base'] ?? '/scripts/extensions/third-party/SillyNovel' };
}
// In the page. The raw reply stops at parseDirectorResponse; only the parsed JSON, or a code, comes back.
const sendCase = async ({ base, input, ms }) => {
    const [{ buildDirectorRequest, parseDirectorResponse }, { createHostAdapter }] = await Promise.all([import(base + '/src/director-request.mjs'), import(base + '/src/host-adapter.mjs')]);
    const request = buildDirectorRequest(input), started = performance.now(), elapsed = () => Math.round(performance.now() - started);
    const settled = createHostAdapter(() => SillyTavern.getContext()).requestDirectorText(request.messages).then(result => {
        if (!result.ok) return { status: 'failed', code: result.code, elapsedMs: elapsed() };
        const parsed = parseDirectorResponse(result.text);
        return parsed.ok ? { status: 'proposal', proposal: parsed.proposal, elapsedMs: elapsed() } : { status: 'refused', code: parsed.code, elapsedMs: elapsed() };
    });
    window.__snGateBSettled = settled;
    return Promise.race([settled, new Promise(done => setTimeout(() => done({ status: 'failed', code: 'ABANDONED', elapsedMs: ms }), ms))]);
};
/** Sends every case in order, writing the file after each so a stop keeps what was spent. A settled-late request is discarded unread, and only then may the next start. */
export async function runCases({ page, cases, base, perCaseMs, deadlineAt, write }) {
    const results = [];
    for (const [index, { id, category, input }] of cases.entries()) {
        if (Date.now() >= deadlineAt) { results.push({ id, category, status: 'not_run' }); write(results); console.log(id + ' not_run: deadline'); continue; }
        const result = await page.evaluate(sendCase, { base, input, ms: perCaseMs });
        results.push({ id, category, ...result });
        write(results);
        console.log((index + 1) + '/' + cases.length + ' ' + id + ' ' + result.status + (result.code ? ' ' + result.code : '') + ' ' + result.elapsedMs + ' ms');
        if (result.code === 'ABANDONED') await Promise.race([page.evaluate(() => window.__snGateBSettled.then(() => true)), delay(Math.max(0, deadlineAt - Date.now()), undefined, { ref: false })]);
    }
    return results;
}
async function main() {
    const options = parseRunArgs(process.argv.slice(2)), bytes = readFileSync(CASES_FILE), recorded = recordedSha();
    if (existsSync(options.out)) throw Error('Refused: ' + options.out + ' exists; a measurement is never overwritten.');
    const frozen = loadCases(bytes, recorded), problems = checkCases(frozen);
    if (problems.length) throw Error('Refused: ' + problems.join('; '));
    const startedAt = Date.now(), deadlineAt = startedAt + frozen.cases.length * options.perCaseMs + GRACE_MS + (options.mode === 'owner' ? CONNECT_MS : 0);
    const { chromium } = await import(process.env.SN_PLAYWRIGHT_MODULE || 'playwright');
    const browser = await chromium.launch({ headless: options.mode !== 'owner' });
    let stopping = false;
    const stop = code => { if (stopping) return; stopping = true; console.log('Stopping: ' + code); browser.close().catch(() => {}).finally(() => process.exit(code)); };
    const watchdog = setTimeout(() => stop(124), deadlineAt - startedAt + 30000);
    process.once('SIGTERM', () => stop(143));
    process.once('SIGINT', () => stop(130));
    try {
        const context = await browser.newContext(), page = await context.newPage();
        page.setDefaultTimeout(60000);
        if (options.mode === 'loopback-proof') {
            const token = (await (await context.request.get(options.origin + '/csrf-token')).json()).token;
            await context.request.post(options.origin + '/api/users/login', { headers: { 'X-CSRF-Token': token }, data: { handle: 'default-user' } });
        }
        await page.goto(options.origin);
        await page.waitForFunction(() => globalThis.SillyTavern?.getContext, undefined, { timeout: options.mode === 'owner' ? CONNECT_MS : 60000 });
        if (options.mode === 'owner') {
            const prompt = createInterface({ input: process.stdin, output: process.stdout });
            try { await Promise.race([prompt.question('In the browser window: sign in if needed and select the connection by hand. Then press Enter here to send 40 requests one at a time, or Ctrl+C. '), delay(CONNECT_MS, undefined, { ref: false }).then(() => { throw Error('No confirmation in time.'); })]); }
            finally { prompt.close(); }
        } else {
            // A refusal, not a retained fact: the proof must never reach anything but the loopback fixture.
            await page.waitForFunction(() => SillyTavern.getContext().mainApi === 'openai');
            const url = await page.evaluate(async () => { const { oai_settings: settings } = await import('/scripts/openai.js'); return settings.chat_completion_source === 'custom' ? settings.custom_url : null; });
            if (!LOOPBACK.test(url ?? '')) throw Error('Refused: this host is not connected to a loopback endpoint.');
            const icon = page.locator('#API-status-top');
            if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
            await page.locator('#api_button_openai').click();
        }
        await page.waitForFunction(() => SillyTavern.getContext().onlineStatus !== 'no_connection', undefined, { timeout: 60000 });
        // The modules that send must be the frozen candidate's, byte for byte.
        for (const file of MODULES) {
            const served = await page.evaluate(async path => (await fetch(path)).text(), options.base + '/' + file);
            if (sha256(served) !== sha256(readFileSync(resolve(REPO, file)))) throw Error('Refused: the host serves a different ' + file + ' than this checkout.');
        }
        const { PROMPT_VERSION: promptVersion } = await import(pathToFileURL(resolve(REPO, 'src/director-request.mjs')).href);
        const run = { schemaVersion: 1, mode: options.mode, candidate: execFileSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), casesSha256: recorded, promptVersion, perCaseMs: options.perCaseMs, startedUTC: new Date(startedAt).toISOString() };
        const write = results => { writeFileSync(options.out + '.tmp', JSON.stringify({ ...run, results }, null, 1) + '\n'); renameSync(options.out + '.tmp', options.out); };
        writeFileSync(options.out.replace(/\.json$/, '') + '-cases.json', bytes);
        const results = await runCases({ page, cases: frozen.cases, base: options.base, perCaseMs: options.perCaseMs, deadlineAt, write });
        console.log('Finished: ' + results.length + ' cases, ' + results.filter(item => item.status === 'not_run').length + ' not run. Results ' + options.out);
        if (results.some(item => item.status === 'not_run')) process.exitCode = 1;
    } finally {
        clearTimeout(watchdog);
        if (!stopping) await browser.close().catch(() => {});
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main().catch(error => { console.error(error.message); process.exit(1); });
