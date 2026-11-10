// Disposable pinned-host harness for the M2.2 runtime probe and native campaign. Synthetic data only.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, symlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

export const PIN = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
export const repo = resolve(import.meta.dirname, '../../..');
export const ENDPOINT = 'http://127.0.0.1:8128';
export const DECOYS = { persona: 'DECOY-PERSONA-DESCRIPTION-7f3a', lore: 'DECOY-LOREBOOK-ENTRY-91bc', card: 'DECOY-CARD-DESCRIPTION-44d2', personaName: 'Decoy Traveller' };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const BOUND = 2 * 1024 * 1024;
export const CLOSE = Object.freeze({ Connection: 'close' });

export async function createHarness(source, label) {
    assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), PIN);
    const { chromium } = await import(process.env.SN_PLAYWRIGHT_MODULE || 'playwright');
    const root = await mkdtemp(join(tmpdir(), 'sn-' + label + '-')), host = join(root, 'host'), data = join(root, 'data'), config = join(root, 'config.yaml');
    console.log('Owned evidence root ' + root);
    let child, provider, browser, origin, logs = '';
    const keep = (text, part) => (text + part).slice(-BOUND);
    execFileSync('git', ['clone', '--shared', source, host], { stdio: 'pipe' });
    execFileSync('git', ['-C', host, 'checkout', '--detach', PIN], { stdio: 'pipe' });
    execFileSync('cp', ['-a', '--reflink=auto', join(source, 'node_modules'), join(host, 'node_modules')]);
    await mkdir(join(host, 'plugins'), { recursive: true });
    execFileSync('cp', ['-a', join(repo, 'plugins/sillynovel-storage'), join(host, 'plugins/sillynovel-storage')]);
    execFileSync('npm', ['ci', '--prefix', join(host, 'plugins/sillynovel-storage'), '--ignore-scripts', '--no-audit', '--no-fund'], { stdio: 'pipe' });
    await mkdir(join(host, 'public/scripts/extensions/third-party'), { recursive: true });
    await symlink(repo, join(host, 'public/scripts/extensions/third-party/SillyNovel'));
    await mkdir(join(data, 'default-user'), { recursive: true });
    const settings = JSON.parse(await readFile(join(host, 'default/content/settings.json')));
    settings.firstRun = false; settings.main_api = 'openai';
    settings.oai_settings = { ...settings.oai_settings, chat_completion_source: 'custom', custom_url: ENDPOINT + '/v1', custom_model: 'sn-reader-local', stream_openai: true };
    await writeFile(join(data, 'default-user/settings.json'), JSON.stringify(settings));
    const cfg = (await readFile(join(host, 'default/config.yaml'), 'utf8')).replace('enableServerPlugins: false', 'enableServerPlugins: true').replace('enableServerPluginsAutoUpdate: true', 'enableServerPluginsAutoUpdate: false').replace('enableUserAccounts: false', 'enableUserAccounts: true');
    await writeFile(config, cfg);
    const probe = createServer();
    await new Promise(done => probe.listen(0, '127.0.0.1', done));
    const port = probe.address().port;
    await new Promise(done => probe.close(done));
    origin = 'http://127.0.0.1:' + port;
    child = spawn(process.execPath, ['server.js', '--configPath', config, '--dataRoot', data, '--port', String(port), '--listen', 'false', '--browserLaunchEnabled', 'false'], { cwd: host, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', part => { logs = keep(logs, part); });
    child.stderr.on('data', part => { logs = keep(logs, part); });
    const deadline = Date.now() + 60000;
    while (!logs.includes('127.0.0.1:' + port)) {
        if (Date.now() > deadline || child.exitCode !== null) throw Error('Host startup failed ' + logs.slice(-2000));
        await delay(100);
    }
    let providerLog = '';
    provider = spawn(process.execPath, [join(repo, 'tests/fixtures/m2-director-endpoint.mjs')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    provider.stdout.on('data', part => { providerLog = keep(providerLog, part); });
    provider.stderr.on('data', part => { providerLog = keep(providerLog, part); });
    while (!providerLog.includes('listening on 8128')) {
        if (provider.exitCode !== null) throw Error('Endpoint failed ' + providerLog);
        await delay(50);
    }
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    // Playwright's request agent keeps sockets alive without honouring the host's Keep-Alive hint, so a request about 6 s after the last one
    // (the host's keepAliveTimeout plus its buffer) races the host closing that socket: `socket hang up` / ECONNRESET. The harness's own
    // requests use a fresh connection each; no assertion changes. Probes that call context.request directly pass CLOSE themselves.
    const token = (await (await context.request.get(origin + '/csrf-token', { headers: CLOSE })).json()).token;
    assert.equal((await context.request.post(origin + '/api/users/login', { headers: { ...CLOSE, 'X-CSRF-Token': token }, data: { handle: 'default-user' } })).status(), 200);
    const native = async (path, body) => {
        const res = await context.request.post(origin + path, { headers: { ...CLOSE, 'X-CSRF-Token': token, 'Content-Type': 'application/json' }, data: JSON.stringify(body) });
        assert.equal(res.status(), 200, path + ' ' + await res.text());
        return res;
    };
    const plugin = async (path, method = 'GET', body, status = 200, type = 'application/vnd.sillynovel+json') => {
        const res = await context.request.fetch(origin + '/api/plugins/sillynovel-storage' + path, { method, headers: { ...CLOSE, 'X-CSRF-Token': token, ...(body === undefined ? {} : { 'Content-Type': type }) }, data: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body) });
        assert.equal(res.status(), status, path + ' ' + await res.text());
        return res.json();
    };
    const control = async body => (await fetch(ENDPOINT + '/control', { method: 'POST', body: JSON.stringify(body) })).json();
    const requests = async () => (await fetch(ENDPOINT + '/log')).json();
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const pageErrors = [];
    page.on('pageerror', error => { pageErrors.push(error.message); console.log('PAGE ERROR ' + error.message); });
    const userRoot = join(data, 'default-user');
    async function inventory() {
        const files = {};
        async function walk(base) {
            let entries;
            try { entries = await readdir(base, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
            for (const entry of entries) {
                const file = join(base, entry.name);
                if (entry.isDirectory()) await walk(file);
                else { const bytes = await readFile(file); files[file.slice(data.length + 1)] = { bytes: bytes.length, sha256: hash(bytes) }; }
            }
        }
        for (const dir of ['characters', 'chats', 'group chats', 'groups', 'worlds', 'User Avatars', 'avatars', 'OpenAI Settings', 'TextGen Settings', 'KoboldAI Settings', 'NovelAI Settings']) await walk(join(userRoot, dir));
        const settingsBytes = await readFile(join(userRoot, 'settings.json'));
        files['default-user/settings.json'] = { bytes: settingsBytes.length, sha256: hash(settingsBytes) };
        return { files, settings: JSON.parse(settingsBytes) };
    }
    async function seedDecoys() {
        await mkdir(join(userRoot, 'User Avatars'), { recursive: true });
        await writeFile(join(userRoot, 'User Avatars/decoy-persona.png'), await readFile(join(repo, 'tests/fixtures/m12-stage/rowan.png')));
        await writeFile(join(userRoot, 'worlds/decoy-lore.json'), JSON.stringify({ entries: { 0: { uid: 0, key: ['lantern'], content: DECOYS.lore, disable: false, constant: true } }, name: 'decoy-lore' }));
        await page.evaluate(async ({ DECOYS }) => {
            const { power_user } = await import('/scripts/power-user.js');
            power_user.personas['decoy-persona.png'] = DECOYS.personaName;
            power_user.persona_descriptions['decoy-persona.png'] = { description: DECOYS.persona, position: 0, depth: 2, role: 0, connections: [] };
            await (await import('/scripts/personas.js')).setUserAvatar('decoy-persona.png', { toastPersonaNameChange: false });
            await (await import('/script.js')).saveSettings();
        }, { DECOYS });
    }
    async function connect() {
        const icon = page.locator('#API-status-top');
        if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
        await page.locator('#api_button_openai').click();
        await page.waitForFunction(() => SillyTavern.getContext().onlineStatus !== 'no_connection');
        await page.locator('#send_but').waitFor({ state: 'visible' });
        await icon.click();
    }
    async function close() {
        await browser?.close().catch(() => {});
        browser = null;
        if (child?.exitCode === null) { const done = new Promise(r => child.once('close', r)); child.kill('SIGTERM'); await Promise.race([done, delay(5000)]); if (child.exitCode === null) { child.kill('SIGKILL'); await done; } }
        if (provider?.exitCode === null) { const done = new Promise(r => provider.once('close', r)); provider.kill('SIGTERM'); await Promise.race([done, delay(5000)]); if (provider.exitCode === null) { provider.kill('SIGKILL'); await done; } }
        await writeFile(join(root, 'host.log'), logs);
    }
    return { root, host, data, origin, page, context, native, plugin, control, requests, inventory, seedDecoys, connect, close, pageErrors, userRoot };
}
