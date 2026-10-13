import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hostSha = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const source = path.resolve(process.argv[2] ?? '');
const output = process.argv[3] && path.resolve(process.argv[3]);
if (!process.argv[2] || !output) throw new Error('Usage: node tests/probes/dyl27/host-probe.mjs <pinned-host-with-node_modules> <new-evidence-directory>');
assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), hostSha);
assert.ok(fs.existsSync(path.join(source, 'node_modules')));
assert.ok(!fs.existsSync(output), 'evidence collision; use a new directory');
const sourceStatus = execFileSync('git', ['-C', source, 'status', '--porcelain'], { encoding: 'utf8' });
const probeDir = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runId = randomUUID();
const owned = fs.mkdtempSync(path.join(os.tmpdir(), 'sillynovel-dyl27-'));
const host = path.join(owned, 'host');
const data = path.join(owned, 'sillynovel-dyl27-data');
fs.mkdirSync(data);
fs.writeFileSync(path.join(data, '.dyl27-owned'), runId, { flag: 'wx' });
const config = path.join(owned, 'config.yaml');
const evidence = { runId, hostSha, testedSillyNovelSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    node: process.version, platform: `${os.platform()} ${os.release()}`, checks: [], files: {} };
for (const file of ['host-storage.mjs', 'host-mount.patch', 'host-probe.mjs', 'host-visit.js']) evidence.files[file] = hash(fs.readFileSync(path.join(probeDir, file)));
let child;
let logs = '';
let base;
let failed;
const canonical = new Map();
const catalogs = new Map();
let namespace;
let browser;
let provider;
let interruptOperation;
const sequences = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function stop() {
    if (child && child.exitCode === null) {
        const done = new Promise(resolve => child.once('close', resolve));
        child.kill('SIGTERM');
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        await done;
        clearTimeout(timer);
    }
}
async function start() {
    logs = '';
    const server = net.createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    base = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [path.join(host, 'server.js'), '--configPath', config, '--port', String(port),
        '--listen', 'false', '--enableIPv4', 'true', '--enableIPv6', 'false', '--listenAddressIPv4', '127.0.0.1',
        '--browserLaunchEnabled', 'false', '--whitelist', 'false', '--dataRoot', data], {
        cwd: host, env: { ...process.env, SN_DYL27_RUN: runId, SN_DYL27_INTERRUPT: interruptOperation || '' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', bytes => { logs += bytes; });
    child.stderr.on('data', bytes => { logs += bytes; });
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline && child.exitCode === null) {
        if (logs.includes(data) && logs.includes(`SillyTavern is listening on IPv4: 127.0.0.1:${port}`)) return;
        await sleep(100);
    }
    throw new Error(`Owned host startup failed: ${logs.slice(-3000)}`);
}
function session() {
    const cookies = new Map();
    let csrf;
    const request = async (route, body, expected = 200) => {
        const response = await fetch(`${base}${route}`, {
            method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000),
            headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
                ...(csrf ? { 'x-csrf-token': csrf } : {}), 'content-type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        for (const cookie of response.headers.getSetCookie()) {
            const [pair] = cookie.split(';');
            const i = pair.indexOf('=');
            cookies.set(pair.slice(0, i), pair.slice(i + 1));
        }
        const raw = await response.text();
        assert.equal(response.status, expected, `${route}: ${raw.slice(0, 250)}`);
        let result;
        try { result = JSON.parse(raw); } catch { result = raw; }
        return result;
    };
    return { cookies, request, api: (name, body = {}, expected) => request(`/api/dyl27/${name}`, body, expected),
        async login(handle) {
            csrf = (await request('/csrf-token')).token;
            await request('/api/users/login', { handle });
        },
        async init() { csrf = (await request('/csrf-token')).token; },
    };
}
function stored(handle, id) { return path.join(data, handle, namespace, `${id}.json`); }
function disk(handle, id) { return JSON.parse(fs.readFileSync(stored(handle, id), 'utf8')); }
function snapshot(name, details = {}) {
    for (const [file, digest] of canonical) assert.equal(hash(fs.readFileSync(file)), digest, `canonical changed: ${file}`);
    const records = {};
    for (const [handle, catalog] of catalogs) {
        records[handle] = Object.fromEntries(catalog.chats.map(chat => {
            const file = stored(handle, chat.chatId);
            return [chat.chatId, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : 'MISSING'];
        }));
    }
    evidence.checks.push({ name, result: 'PASS', classification: 'EXPERIMENTAL_HOST', ...details, storedRecords: records, canonicalSha256: Object.fromEntries([...canonical].map(([file, digest]) => [path.relative(data, file), digest])) });
    console.log(`PASS ${name}`);
}
async function activate(client, clientId, locator, sequence) {
    sequence ??= (sequences.get(clientId) || 0) + 1;
    sequences.set(clientId, Math.max(sequence, sequences.get(clientId) || 0));
    return client.api('activate', { clientId, sequence, locator });
}
function refresh(handle) {
    const catalog = JSON.parse(fs.readFileSync(path.join(data, handle, namespace, 'identities.json')));
    catalogs.set(handle, catalog); return catalog;
}
function canonicalRefresh() {
    canonical.clear();
    for (const [handle, catalog] of catalogs) for (const c of catalog.chats) {
        const file = path.join(data, handle, c.relativePath);
        if (fs.existsSync(file)) canonical.set(file, hash(fs.readFileSync(file)));
    }
}
function storageBytes() {
    return [...catalogs].map(([handle, catalog]) => catalog.chats.map(chat => {
        const file = stored(handle, chat.chatId);
        return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    }));
}
async function error(client, name, body, code, status = 409) {
    const before = storageBytes();
    assert.deepEqual(await client.api(name, body, status), { error: code });
    assert.deepEqual(storageBytes(), before, `${code} leaves every user's visual record unchanged`);
}
const casBody = (target, expectedRevision, background = 'forest') => ({ target, expectedRevision, record: { background } });
async function held(client, target, revision, action) {
    await client.api('barrier', { clientId: target.clientId, action: 'arm' });
    let acknowledged = false;
    const pending = client.api('cas', casBody(target, revision), 409).then(result => { acknowledged = true; return result; });
    const end = Date.now() + 5000;
    while (!(await client.api('barrier', { clientId: target.clientId, action: 'status' })).entered) {
        assert.ok(Date.now() < end, 'CAS reached deterministic barrier');
        await sleep(10);
    }
    assert.equal(acknowledged, false);
    await action();
    await client.api('barrier', { clientId: target.clientId, action: 'release' });
    assert.deepEqual(await pending, { error: 'STALE_VIEW' });
}

try {
    execFileSync('git', ['clone', '--shared', '--no-hardlinks', source, host], { stdio: 'pipe' });
    execFileSync('git', ['-C', host, 'checkout', '--detach', hostSha], { stdio: 'pipe' });
    fs.symlinkSync(path.join(source, 'node_modules'), path.join(host, 'node_modules'), 'dir');
    execFileSync('git', ['-C', host, 'apply', '--check', path.join(probeDir, 'host-mount.patch')]);
    execFileSync('git', ['-C', host, 'apply', path.join(probeDir, 'host-mount.patch')]);
    fs.copyFileSync(path.join(probeDir, 'host-storage.mjs'), path.join(host, 'src/dyl27-storage.mjs'), fs.constants.COPYFILE_EXCL);
    fs.writeFileSync(config, fs.readFileSync(path.join(host, 'default/config.yaml'), 'utf8')
        .replace('enableUserAccounts: false', 'enableUserAccounts: true'), { flag: 'wx' });
    fs.copyFileSync(path.join(probeDir, 'host-visit.js'), path.join(host, 'public/scripts/dyl27-visit.js'), fs.constants.COPYFILE_EXCL);
    namespace = 'sillynovel-dyl27';
    const settings = JSON.parse(fs.readFileSync(path.join(host, 'default/content/settings.json')));
    provider = createServer(async (req, res) => {
        if (req.url === '/v1/models') return res.end(JSON.stringify({ data: [{ id: 'dyl27-local' }] }));
        if (req.url !== '/v1/chat/completions') { res.statusCode = 404; return res.end(); }
        let bytes = 0; for await (const part of req) { bytes += part.length; if (bytes > 1024 * 1024) { res.statusCode = 413; return res.end(); } }
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ choices: [{ index: 0, message: { role: 'assistant', content: 'Synthetic DYL27 reply.' }, finish_reason: 'stop' }] }));
    });
    await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
    settings.firstRun = false; settings.main_api = 'openai';
    settings.oai_settings = { ...settings.oai_settings, chat_completion_source: 'custom',
        custom_url: `http://127.0.0.1:${provider.address().port}/v1`, custom_model: 'dyl27-local', stream_openai: false };
    fs.mkdirSync(path.join(data, 'default-user'));
    fs.writeFileSync(path.join(data, 'default-user/settings.json'), JSON.stringify(settings), { flag: 'wx' });
    await start();
    const first = session(); await first.login('default-user');
    const otherHandle = `dyl27-${runId}`;
    await first.request('/api/users/create', { handle: otherHandle, name: 'Synthetic second user' });
    const other = session(); await other.login(otherHandle);
    const cardBody = { ch_name: `Mira-${runId}`, first_mes: 'Identical synthetic greeting.', description: 'Generated test fixture.' };
    const avatar = await first.request('/api/characters/create', cardBody);
    const avatarB = await first.request('/api/characters/create', cardBody);
    const otherAvatar = await other.request('/api/characters/create', cardBody);
    assert.notEqual(avatar, avatarB);
    assert.equal(avatar, otherAvatar);
    const chat = [{ user_name: 'Synthetic', character_name: 'Mira', chat_metadata: { integrity: runId } },
        { name: 'Mira', is_user: false, mes: 'Identical synthetic greeting.', extra: {} }];
    const save = (client, av, name, content = chat) => client.request('/api/chats/save', { avatar_url: av, file_name: name, chat: content });
    await save(first, avatar, 'A'); await save(first, avatarB, 'B'); await save(other, otherAvatar, 'A');
    let cat = refresh('default-user'); const otherCat = refresh(otherHandle);
    const a = cat.chats.find(c => c.relativePath.endsWith('/A.jsonl'));
    const b = cat.chats.find(c => c.relativePath.endsWith('/B.jsonl'));
    assert.notEqual(a.chatId, b.chatId); assert.notEqual(a.scopeId, b.scopeId);
    assert.notEqual(cat.storeId, otherCat.storeId);
    assert.equal(hash(fs.readFileSync(path.join(data, 'default-user', a.relativePath))), hash(fs.readFileSync(path.join(data, otherHandle, otherCat.chats[0].relativePath))));
    canonicalRefresh();
    snapshot('native create/save: distinct chats/scopes/users despite duplicate labels and identical bytes', { classification: 'EXPERIMENTAL_HOST' });
    const client1 = (await first.api('client')).clientId;
    let target = await activate(first, client1, a.relativePath);
    const initial = await first.api('cas', casBody(target, 0));
    assert.deepEqual(initial, disk('default-user', a.chatId));
    await error(other, 'cas', casBody(target, 0), 'WRONG_STORE', 403);
    await error(first, 'cas', casBody({ ...target, clientId: randomUUID() }, 1), 'INVALID_CLIENT', 403);
    await error(first, 'cas', casBody({ ...target, scopeId: b.scopeId }, 1), 'INVALID_TARGET', 400);
    await error(first, 'cas', casBody({ ...target, viewToken: randomUUID() }, 1), 'STALE_VIEW');
    snapshot('visual CAS readback, authenticated isolation, identity and token refusals; canonical unchanged');
    const oldHash = canonical.get(path.join(data, 'default-user', a.relativePath));
    const edited = structuredClone(chat); edited[1].mes += ' Native edit.';
    await save(first, avatar, 'A', edited);
    cat = refresh('default-user'); assert.equal(cat.chats[0].chatId, a.chatId);
    canonicalRefresh(); assert.notEqual(canonical.get(path.join(data, 'default-user', a.relativePath)), oldHash);
    assert.equal((await first.api('read', { target })).revision, 1);
    snapshot('native message save keeps durable identity through atomic replacement', { beforeCanonical: oldHash, afterCanonical: Object.fromEntries([...canonical].map(([file, digest]) => [path.relative(data, file), digest])) });
    await first.request('/api/chats/rename', { avatar_url: avatar, original_file: 'A.jsonl', renamed_file: 'Renamed.jsonl', is_group: false });
    cat = refresh('default-user'); const renamed = cat.chats.find(c => c.chatId === a.chatId);
    assert.equal(renamed.relativePath.split('/').at(-1), 'Renamed.jsonl');
    assert.equal((await first.api('read', { target })).revision, 1);
    await save(first, avatar, 'A'); cat = refresh('default-user');
    assert.notEqual(cat.chats.find(c => c.relativePath === a.relativePath && !c.deleted).chatId, a.chatId);
    canonicalRefresh(); snapshot('native rename preserves ID; reused old filename gets a new ID');
    await save(first, avatar, 'Branch', [{ ...chat[0], chat_metadata: { integrity: randomUUID(), chatId: a.chatId } }, chat[1]]);
    cat = refresh('default-user'); const branch = cat.chats.find(c => c.relativePath.endsWith('/Branch.jsonl'));
    assert.notEqual(branch.chatId, a.chatId);
    canonicalRefresh(); snapshot('new save with copied bytes and untrusted ID gets a fresh ID', { classification: 'EXPERIMENTAL_HOST; native branch UI NOT_TESTED' });
    const competitor = (await first.api('client')).clientId;
    const writerA = await activate(first, client1, branch.relativePath);
    const writerB = await activate(first, competitor, branch.relativePath);
    for (const t of [writerA, writerB]) await first.api('barrier', { clientId: t.clientId, action: 'arm' });
    const winner = first.api('cas', casBody(writerA, 0));
    const loser = first.api('cas', casBody(writerB, 0, 'tavern'), 409);
    for (const t of [writerA, writerB]) {
        const end = Date.now() + 5000;
        while (!(await first.api('barrier', { clientId: t.clientId, action: 'status' })).entered) { assert.ok(Date.now() < end); await sleep(10); }
    }
    await first.api('barrier', { clientId: client1, action: 'release' });
    assert.deepEqual(await winner, disk('default-user', branch.chatId));
    await first.api('barrier', { clientId: competitor, action: 'release' });
    assert.deepEqual(await loser, { error: 'STALE_REVISION' });
    assert.equal(disk('default-user', branch.chatId).revision, 1);
    snapshot('overlapping native-target visual writes: one commit, one revision conflict');
    target = await activate(first, client1, renamed.relativePath);
    await held(first, target, 1, async () => { await activate(first, client1, b.relativePath); });
    target = await activate(first, client1, renamed.relativePath);
    await held(first, target, 1, async () => { await activate(first, client1, b.relativePath); await activate(first, client1, renamed.relativePath); });
    snapshot('deterministic delayed CAS across A-B and A-B-A refuses old visit');
    const sequence = sequences.get(client1);
    await error(first, 'activate', { clientId: client1, sequence: sequence - 1, locator: b.relativePath }, 'STALE_ACTIVATION');
    target = await first.api('target', { clientId: client1 });
    assert.equal(target.chatId, a.chatId);
    await activate(first, client1, null);
    await error(first, 'cas', casBody(target, 1), 'STALE_VIEW');
    await error(first, 'activate', { clientId: client1, sequence: sequence + 2, locator: '../unknown' }, 'UNRESOLVED_IDENTITY');
    sequences.set(client1, sequence + 2);
    snapshot('out-of-order activation and unresolved/temporary intent cannot restore old authority');

    // Actual native UI selections invoke patched clearChat/getChat; no CHAT_CHANGED listener activates records.
    const { chromium } = await import(process.env.SN_PLAYWRIGHT_MODULE || 'playwright');
    browser = await chromium.launch({ headless: true }); evidence.browser = browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([...first.cookies].map(([name, value]) => ({ name, value, url: base })));
    const page = await context.newPage();
    await page.goto(base); await page.waitForFunction(() => window.SillyTavern?.getContext);
    async function select(av) {
        const icon = page.locator('#rightNavDrawerIcon');
        if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
        if (!(await page.locator('#rm_button_create').isVisible())) await page.locator('#rm_button_characters').click();
        const index = await page.evaluate(av => SillyTavern.getContext().characters.findIndex(c => c.avatar === av), av);
        await page.locator(`.character_select[data-chid="${index}"]`).first().click();
        await page.waitForFunction(av => window.dyl27?.target && SillyTavern.getContext().characters[SillyTavern.getContext().characterId]?.avatar === av, av);
        return page.evaluate(() => window.dyl27.target);
    }
    const uiA = await select(avatar); const uiB = await select(avatarB); const uiA2 = await select(avatar);
    assert.equal(uiA.chatId, uiA2.chatId); assert.notEqual(uiA.viewToken, uiA2.viewToken); assert.notEqual(uiA.chatId, uiB.chatId);
    refresh('default-user'); canonicalRefresh();
    evidence.nativeVisits = await page.evaluate(() => window.dyl27.history);
    snapshot('actual native UI A-B-A: stable chat identity, fresh visit', { classification: 'NATIVE_HOST_UI', uiA, uiB, uiA2 });
    const uiApi = (name, body) => page.evaluate(async ({ name, body }) => {
        const c = SillyTavern.getContext(); const r = await fetch(`/api/dyl27/${name}`, { method: 'POST', headers: c.getRequestHeaders(), body: JSON.stringify(body) });
        return { status: r.status, body: await r.json() };
    }, { name, body });
    await uiApi('barrier', { clientId: uiA2.clientId, action: 'arm' });
    const uiPending = uiApi('cas', casBody(uiA2, 0));
    for (let n = 0; n < 100; n++) { if ((await uiApi('barrier', { clientId: uiA2.clientId, action: 'status' })).body.entered) break; await sleep(20); assert.ok(n < 99); }
    await select(avatarB); await select(avatar);
    await uiApi('barrier', { clientId: uiA2.clientId, action: 'release' });
    assert.deepEqual(await uiPending, { status: 409, body: { error: 'STALE_VIEW' } });
    snapshot('native UI switch while CAS is held: server refuses old activation', { classification: 'NATIVE_HOST_UI' });
    // Delay an activation ACK while native navigation runs again; observe local epoch discard.
    let releaseAck; const ackHeld = new Promise(resolve => { releaseAck = resolve; }); let enteredAck;
    const ackEntered = new Promise(resolve => { enteredAck = resolve; });
    let intercepted = false;
    await page.route('**/api/dyl27/activate', async route => {
        if (!intercepted && route.request().postDataJSON().locator !== null) {
            intercepted = true;
            const response = await route.fetch(); enteredAck(); await ackHeld; await route.fulfill({ response });
        } else await route.continue();
    });
    // Native exported loader is used only for the overlapping-load instrumentation case.
    const late = page.evaluate(async () => (await import('/script.js')).getChat());
    await Promise.race([ackEntered, sleep(10000).then(() => { throw new Error('activation ACK barrier timeout'); })]);
    await select(avatarB); releaseAck(); await late;
    await page.unroute('**/api/dyl27/activate');
    await page.waitForFunction(() => window.dyl27.history.some(h => h.discarded));
    assert.equal((await page.evaluate(() => window.dyl27.target)).chatId, uiB.chatId);
    evidence.nativeVisits = await page.evaluate(() => window.dyl27.history);
    snapshot('out-of-order native activation ACK discarded by local epoch', { classification: 'NATIVE_HOST_UI with response barrier' });
    // Native editor and ordinary composer remain owned by the host.
    const nativeTarget = await page.evaluate(() => window.dyl27.target);
    const nativeMessage = page.locator('#chat > .mes').last();
    await nativeMessage.locator('.mes_edit').click();
    await nativeMessage.locator('.edit_textarea').fill('Native editor mutation.');
    await nativeMessage.locator('.mes_edit_done').click();
    await page.evaluate(async () => (await import('/script.js')).saveChatConditional());
    assert.equal((await page.evaluate(() => window.dyl27.target)).chatId, nativeTarget.chatId);
    const nativeRecord = refresh('default-user').chats.find(c => c.chatId === nativeTarget.chatId);
    assert.match(fs.readFileSync(path.join(data, 'default-user', nativeRecord.relativePath), 'utf8'), /Native editor mutation/);
    await page.locator('#API-status-top').click(); await page.locator('#api_button_openai').click();
    await page.locator('#send_but').waitFor({ state: 'visible' }); await page.locator('#API-status-top').click();
    await page.locator('#send_textarea').fill('Ordinary synthetic send.'); await page.locator('#send_but').click();
    await page.waitForFunction(() => SillyTavern.getContext().chat.at(-1)?.mes === 'Synthetic DYL27 reply.');
    await page.evaluate(async () => (await import('/script.js')).saveChatConditional());
    canonicalRefresh(); snapshot('native message editor and ordinary send/reply preserve chat identity', { classification: 'NATIVE_HOST_UI; deterministic loopback provider' });
    const branchName = await page.evaluate(async () => (await import('/scripts/bookmarks.js')).createBranch(0));
    cat = refresh('default-user'); const nativeBranch = cat.chats.find(c => c.relativePath.endsWith(`/${branchName}.jsonl`));
    assert.ok(nativeBranch); assert.notEqual(nativeBranch.chatId, nativeTarget.chatId);
    canonicalRefresh(); snapshot('actual native createBranch function allocates separate identity', { classification: 'EXPERIMENTAL_HOST via native browser function, not branch-button UI' });
    await page.evaluate(async () => { const host = await import('/script.js'); await host.closeCurrentChat(); await host.newAssistantChat({ temporary: true }); });
    assert.equal(await page.evaluate(() => window.dyl27.target), null);
    assert.deepEqual(await uiApi('cas', casBody(nativeTarget, 0)), { status: 409, body: { error: 'STALE_VIEW' } });
    snapshot('native Temporary Chat function revokes durable visual visit', { classification: 'EXPERIMENTAL_HOST via native browser function, not menu UI' });
    await browser.close(); browser = undefined;

    target = await activate(first, client1, renamed.relativePath);
    const saved = disk('default-user', a.chatId);
    await stop(); await start();
    await error(first, 'read', { target }, 'INVALID_CLIENT', 403);
    const restartedClient = (await first.api('client')).clientId;
    target = await activate(first, restartedClient, renamed.relativePath);
    assert.deepEqual(await first.api('read', { target }), saved);
    snapshot('process restart recovers native mappings and visual records; old client refuses');
    const beforeDelete = hash(fs.readFileSync(path.join(data, 'default-user', renamed.relativePath)));
    await first.request('/api/chats/delete', { avatar_url: avatar, chatfile: 'Renamed.jsonl' });
    await save(first, avatar, 'Renamed', edited); cat = refresh('default-user');
    const recreated = cat.chats.find(c => c.relativePath === renamed.relativePath && !c.deleted);
    assert.notEqual(recreated.chatId, a.chatId);
    assert.equal(hash(fs.readFileSync(path.join(data, 'default-user', renamed.relativePath))), beforeDelete);
    await error(first, 'cas', casBody(target, 1), 'INVALID_TARGET', 400);
    canonicalRefresh(); snapshot('native delete and byte-identical recreation never inherit deleted identity');
    // Real multipart import, with an untrusted host ID in the JSONL header: no adoption.
    const imported = [{ ...chat[0], chat_metadata: { chatId: recreated.chatId } }, chat[1]].map(x => JSON.stringify(x)).join('\n');
    const csrf = (await first.request('/csrf-token')).token;
    const form = new FormData(); form.set('avatar_url', avatar); form.set('character_name', 'Imported'); form.set('file_type', 'jsonl');
    form.set('user_name', 'Synthetic'); form.set('avatar', new Blob([imported]), 'synthetic.jsonl');
    const response = await fetch(`${base}/api/chats/import`, { method: 'POST', headers: { cookie: [...first.cookies].map(([k,v]) => `${k}=${v}`).join('; '), 'x-csrf-token': csrf }, body: form });
    assert.equal(response.status, 200, `import status; host log: ${logs.slice(-1500)}`); const importedResult = await response.json(); assert.equal(importedResult.res, true);
    await error(first, 'activate', { clientId: restartedClient, sequence: 100, locator: `chats/${avatar.replace('.png','')}/${importedResult.fileNames[0]}` }, 'UNRESOLVED_IDENTITY');
    snapshot('native JSONL import ignores embedded identity by refusing adoption', { classification: 'EXPERIMENTAL_HOST' });
    const importedFile = path.join(data, 'default-user', 'chats', avatar.replace('.png',''), importedResult.fileNames[0]);
    evidence.importCanonicalSha256 = hash(fs.readFileSync(importedFile));
    canonical.set(importedFile, evidence.importCanonicalSha256);
    target = await activate(first, restartedClient, recreated.relativePath, 101);
    const recordPath = stored('default-user', recreated.chatId); const goodRecord = fs.readFileSync(recordPath);
    fs.writeFileSync(recordPath, JSON.stringify({ ...JSON.parse(goodRecord), chatId: b.chatId }));
    await error(first, 'read', { target }, 'CORRUPT_RECORD'); fs.writeFileSync(recordPath, goodRecord);
    snapshot('identity/visual-record mismatch refuses without repair');
    const group = await first.request('/api/groups/create', { name: `Group-${runId}`, members: [avatar, avatarB] });
    await first.request('/api/chats/group/save', { id: group.chat_id, chat });
    await first.request('/api/groups/edit', { ...group, members: [avatar] });
    const groupBytes = fs.readFileSync(path.join(data, 'default-user/group chats', `${group.chat_id}.jsonl`));
    await error(first, 'activate', { clientId: restartedClient, sequence: 102, locator: `group chats/${group.chat_id}.jsonl` }, 'UNRESOLVED_IDENTITY');
    assert.deepEqual(fs.readFileSync(path.join(data, 'default-user/group chats', `${group.chat_id}.jsonl`)), groupBytes);
    snapshot('native group creation/membership save works; unresolved durable group scope refuses', { classification: 'EXPERIMENTAL_HOST; group identity BLOCKED' });
    await stop(); interruptOperation = 'save'; await start();
    await save(first, avatar, 'Interrupted', edited);
    cat = refresh('default-user'); assert.equal(cat.pending.operation, 'save');
    await stop(); interruptOperation = undefined; await start();
    const recoveryClient = (await first.api('client')).clientId;
    await error(first, 'activate', { clientId: recoveryClient, sequence: 1, locator: recreated.relativePath }, 'IDENTITY_UNAVAILABLE');
    await save(first, avatar, 'StillNative', edited); // unresolved registry must not block chat saves
    assert.ok(fs.existsSync(path.join(data, 'default-user', 'chats', avatar.replace('.png',''), 'StillNative.jsonl')));
    snapshot('interrupted registry update survives restart as refusal; ordinary native save still succeeds', { classification: 'EXPERIMENTAL_HOST fault injection; automatic recovery BLOCKED' });
    evidence.identities = Object.fromEntries(catalogs);
    evidence.canonicalSha256 = Object.fromEntries([...canonical].map(([file, digest]) => [path.relative(data, file), digest]));
    evidence.result = 'PASS_WITH_IDENTITY_LIMITS';
} catch (error) {
    failed = error;
    evidence.result = 'FAIL';
    evidence.failure = error.stack;
    console.error(error);
} finally {
    if (browser) await browser.close();
    if (provider) await new Promise(resolve => provider.close(resolve));
    await stop();
    // Delete only the mkdtemp directory owned by THIS invocation; never the supplied checkout.
    assert.equal(fs.readFileSync(path.join(data, '.dyl27-owned'), 'utf8'), runId);
    fs.rmSync(owned, { recursive: true, force: true });
    evidence.cleanup = { ownedRootRemoved: !fs.existsSync(owned), hostStopped: child ? child.exitCode !== null || child.signalCode !== null : true,
        sourceCheckoutPresent: fs.existsSync(source),
        sourceStatusUnchanged: execFileSync('git', ['-C', source, 'status', '--porcelain'], { encoding: 'utf8' }) === sourceStatus };
    assert.ok(evidence.cleanup.sourceStatusUnchanged);
    assert.ok(evidence.cleanup.ownedRootRemoved && evidence.cleanup.hostStopped && evidence.cleanup.sourceCheckoutPresent);
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(evidence, null, 2) + '\n');
}
if (failed) throw failed;
console.log(`Completed ${evidence.checks.length} checks; isolated resources cleaned. Evidence: ${output}`);
