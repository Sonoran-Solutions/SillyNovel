import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hostSha = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const source = path.resolve(process.argv[2] ?? '');
const output = process.argv[3] && path.resolve(process.argv[3]);
if (!process.argv[2] || !output) throw new Error('Usage: node tests/probes/dyl26/host-probe.mjs <pinned-host-with-node_modules> <new-evidence-directory>');
assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), hostSha);
assert.ok(fs.existsSync(path.join(source, 'node_modules')));
assert.ok(!fs.existsSync(output), 'evidence collision; use a new directory');
const sourceStatus = execFileSync('git', ['-C', source, 'status', '--porcelain'], { encoding: 'utf8' });
const probeDir = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runId = randomUUID();
const owned = fs.mkdtempSync(path.join(os.tmpdir(), 'sillynovel-dyl26-'));
const host = path.join(owned, 'host');
const data = path.join(owned, 'sillynovel-dyl26-data');
fs.mkdirSync(data);
fs.writeFileSync(path.join(data, '.dyl26-owned'), runId, { flag: 'wx' });
const config = path.join(owned, 'config.yaml');
const evidence = { runId, hostSha, testedSillyNovelSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    node: process.version, platform: `${os.platform()} ${os.release()}`, checks: [], files: {} };
for (const file of ['host-storage.mjs', 'host-mount.patch', 'host-probe.mjs']) evidence.files[file] = hash(fs.readFileSync(path.join(probeDir, file)));
let child;
let logs = '';
let base;
let failed;
const canonical = new Map();
const catalogs = new Map();
let namespace;
let enrollSynthetic;
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
        cwd: host, env: { ...process.env, SN_DYL26_RUN: runId }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', bytes => { logs += bytes; });
    child.stderr.on('data', bytes => { logs += bytes; });
    const deadline = Date.now() + 30000;
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
    return { request, api: (name, body = {}, expected) => request(`/api/dyl26/${name}`, body, expected),
        async login(handle) {
            csrf = (await request('/csrf-token')).token;
            await request('/api/users/login', { handle });
        },
        async init() { csrf = (await request('/csrf-token')).token; },
    };
}
function seed(handle) {
    const userRoot = path.join(data, handle);
    const prefix = `DYL26-${runId}`;
    const specs = [
        { label: 'A', scope: 'card-a', relativePath: `chats/${prefix}-card-a/same.jsonl` },
        { label: 'B', scope: 'card-b', relativePath: `chats/${prefix}-card-b/same.jsonl` },
        { label: 'new', scope: 'card-a', relativePath: `chats/${prefix}-card-a/new.jsonl` },
        { label: 'copy', scope: 'card-a', relativePath: `chats/${prefix}-card-a/copy.jsonl` },
        { label: 'branch', scope: 'card-a', relativePath: `chats/${prefix}-card-a/branch.jsonl` },
    ];
    // Collision preflight for ALL targets before any writes; all data synthetic and owned.
    for (const spec of specs) assert.ok(!fs.existsSync(path.join(userRoot, spec.relativePath)));
    const bytes = JSON.stringify({ chat_metadata: { integrity: runId }, user_name: 'Synthetic', character_name: 'Fixture' })
        + '\n' + JSON.stringify({ name: 'Synthetic', is_user: true, mes: `DYL26 fixture ${runId}`, extra: {} });
    for (const spec of specs) {
        const file = path.join(userRoot, spec.relativePath);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, bytes, { flag: 'wx' });
        canonical.set(file, hash(bytes));
    }
    const catalog = enrollSynthetic(userRoot, specs);
    catalogs.set(handle, catalog);
    return catalog;
}
function stored(handle, id) { return path.join(data, handle, namespace, `${id}.json`); }
function disk(handle, id) { return JSON.parse(fs.readFileSync(stored(handle, id), 'utf8')); }
function snapshot(name, details = {}) {
    for (const [file, digest] of canonical) assert.equal(hash(fs.readFileSync(file)), digest, `canonical changed: ${file}`);
    const records = {};
    for (const [handle, catalog] of catalogs) {
        records[handle] = Object.fromEntries(catalog.chats.map(chat => {
            const file = stored(handle, chat.chatId);
            return [chat.label, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : 'MISSING'];
        }));
    }
    evidence.checks.push({ name, result: 'PASS', ...details, storedRecords: records });
    console.log(`PASS ${name}`);
}
async function activate(client, clientId, chatId) {
    await client.api('activate', { clientId, chatId });
    return client.api('target', { clientId });
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
    fs.copyFileSync(path.join(probeDir, 'host-storage.mjs'), path.join(host, 'src/dyl26-storage.mjs'), fs.constants.COPYFILE_EXCL);
    fs.writeFileSync(config, fs.readFileSync(path.join(host, 'default/config.yaml'), 'utf8')
        .replace('enableUserAccounts: false', 'enableUserAccounts: true'), { flag: 'wx' });
    ({ namespace, enrollSynthetic } = await import(pathToFileURL(path.join(host, 'src/dyl26-storage.mjs'))));
    await start();
    const admin = session();
    await admin.login('default-user');
    const otherHandle = `dyl26-${runId}`;
    await admin.request('/api/users/create', { handle: otherHandle, name: 'Synthetic second user' });
    const cat = seed('default-user');
    const otherCat = seed(otherHandle);
    evidence.identities = { default: cat, second: otherCat };
    assert.throws(() => enrollSynthetic(path.join(data, 'default-user'), []), /COLLISION/);
    snapshot('fixture enrollment collision refusal');

    const anonymous = session();
    await anonymous.init();
    await anonymous.api('catalog', {}, 403);
    const first = session();
    const second = session();
    const other = session();
    await first.login('default-user');
    await second.login('default-user');
    await other.login(otherHandle);
    assert.equal((await first.api('catalog')).storeId, cat.storeId);
    assert.equal((await other.api('catalog')).storeId, otherCat.storeId);
    const client1 = (await first.api('client')).clientId;
    const client2 = (await second.api('client')).clientId;
    const clientOther = (await other.api('client')).clientId;
    const a = cat.chats[0];
    const b = cat.chats[1];
    let target = await activate(first, client1, a.chatId);
    const target2 = await activate(second, client2, a.chatId);
    await error(other, 'read', { target }, 'WRONG_STORE', 403);
    await error(other, 'cas', casBody(target, 0), 'WRONG_STORE', 403);
    await error(other, 'cas', casBody({ ...target, storeId: otherCat.storeId }, 0), 'INVALID_TARGET', 400);
    await error(second, 'read', { target }, 'INVALID_CLIENT', 403);
    const otherTarget = await activate(other, clientOther, otherCat.chats[0].chatId);
    await other.api('cas', casBody(otherTarget, 0, 'tavern'));
    assert.equal(disk('default-user', a.chatId).revision, 0);
    snapshot('authenticated user/store and session isolation');

    assert.equal((await first.api('read', { target })).revision, 0);
    const initial = await first.api('cas', casBody(target, 0));
    assert.equal(initial.revision, 1);
    assert.deepEqual(initial, disk('default-user', a.chatId));
    assert.deepEqual(await first.api('read', { target }), initial);
    snapshot('initial revision creation and acknowledged disk readback');
    const before = fs.readFileSync(stored('default-user', a.chatId), 'utf8');
    await error(first, 'cas', casBody(target, 0, 'tavern'), 'STALE_REVISION');
    assert.equal(fs.readFileSync(stored('default-user', a.chatId), 'utf8'), before);
    snapshot('stale CAS refuses without partial mutation');

    // Hold both at the host before release: truly overlapping HTTP writes, no Web Locks.
    for (const [c, t] of [[first, target], [second, target2]]) await c.api('barrier', { clientId: t.clientId, action: 'arm' });
    // Status may be 200 or 409; use raw HTTP expectation through two deterministic release orders.
    const winner = first.api('cas', casBody(target, 1, 'tavern'));
    const loser = second.api('cas', casBody(target2, 1), 409);
    for (const [c, t] of [[first, target], [second, target2]]) {
        const end = Date.now() + 5000;
        while (!(await c.api('barrier', { clientId: t.clientId, action: 'status' })).entered) {
            assert.ok(Date.now() < end); await sleep(10);
        }
    }
    assert.equal(disk('default-user', a.chatId).revision, 1, 'neither write acknowledged/committed at barrier');
    await first.api('barrier', { clientId: client1, action: 'release' });
    const committed = await winner;
    assert.equal(committed.revision, 2);
    assert.deepEqual(disk('default-user', a.chatId), committed);
    await second.api('barrier', { clientId: client2, action: 'release' });
    assert.deepEqual(await loser, { error: 'STALE_REVISION' });
    assert.deepEqual(disk('default-user', a.chatId), committed);
    snapshot('two overlapping authenticated clients: one commit, one conflict');

    await held(first, target, 2, async () => { await activate(first, client1, b.chatId); });
    assert.equal(disk('default-user', a.chatId).revision, 2);
    assert.equal(disk('default-user', b.chatId).revision, 0);
    snapshot('A to B during delayed write: stale view, neither record changed');
    target = await activate(first, client1, a.chatId);
    await held(first, target, 2, async () => {
        await activate(first, client1, b.chatId);
        await activate(first, client1, a.chatId);
    });
    await error(first, 'read', { target }, 'STALE_VIEW');
    snapshot('A to B to A: old visit remains invalid');
    target = await first.api('target', { clientId: client1 });
    await error(first, 'cas', casBody({ ...target, chatId: b.chatId }, 0), 'INVALID_TARGET', 400);
    await error(first, 'cas', casBody({ ...target, viewToken: randomUUID() }, 2), 'STALE_VIEW');
    await error(first, 'cas', casBody({ ...target, chatId: '../escape' }, 2), 'INVALID_TARGET', 400);
    await error(first, 'cas', { ...casBody(target, 2), record: { background: 'https://untrusted.invalid' } }, 'INVALID_INPUT', 400);
    await error(first, 'activate', { clientId: client1, chatId: randomUUID() }, 'INVALID_TARGET', 400);
    await error(first, 'read', { target }, 'STALE_VIEW');
    snapshot('invalid target/token/path/payload cannot redirect writes');
    const targetB = await activate(first, client1, b.chatId);
    await first.api('cas', casBody(targetB, 0, 'forest'));
    assert.notEqual(targetB.scopeId, target.scopeId);
    assert.equal(disk('default-user', a.chatId).record.background, 'tavern');
    assert.equal(disk('default-user', b.chatId).record.background, 'forest');
    snapshot('same filename and identical bytes under distinct card scopes');

    for (const chat of cat.chats.slice(2)) {
        const t = await activate(first, client1, chat.chatId);
        assert.equal((await first.api('read', { target: t })).revision, 0);
        await first.api('cas', casBody(t, 0));
        assert.equal(disk('default-user', a.chatId).revision, 2);
    }
    assert.equal(new Set(cat.chats.map(chat => chat.chatId)).size, 5);
    snapshot('fixture-created new/copy/branch receive distinct IDs', { classification: 'EXPERIMENTAL_ENROLLMENT; native branch/copy NOT_TESTED' });
    target = await activate(first, client1, a.chatId);
    await error(first, 'activate', { clientId: client1, chatId: null }, 'TEMPORARY_TARGET');
    await error(first, 'target', { clientId: client1 }, 'INACTIVE_TARGET');
    await error(first, 'cas', casBody(target, 2), 'STALE_VIEW');
    snapshot('temporary activation refuses and revokes prior visit', { classification: 'EXPERIMENTAL_ACTIVATION; native Temporary Chat UI NOT_TESTED' });

    target = await activate(first, client1, a.chatId);
    const recordFile = stored('default-user', a.chatId);
    const good = fs.readFileSync(recordFile);
    fs.unlinkSync(recordFile);
    await error(first, 'read', { target }, 'MISSING_RECORD');
    await error(first, 'cas', casBody(target, 0), 'MISSING_RECORD');
    assert.ok(!fs.existsSync(recordFile));
    snapshot('missing record refuses recreation even at revision zero');
    for (const bad of ['{broken', JSON.stringify({ ...JSON.parse(good), revision: -1 }),
        JSON.stringify({ ...JSON.parse(good), chatId: b.chatId })]) {
        fs.writeFileSync(recordFile, bad);
        await error(first, 'read', { target }, 'CORRUPT_RECORD');
        await error(first, 'cas', casBody(target, 2), 'CORRUPT_RECORD');
        assert.equal(fs.readFileSync(recordFile, 'utf8'), bad);
        snapshot('corrupt record preserved', { corruptBytes: bad });
    }
    fs.writeFileSync(recordFile, good);
    const storeDir = path.dirname(recordFile);
    assert.notEqual(process.getuid(), 0, 'permission failure proof requires non-root user');
    fs.chmodSync(storeDir, 0o500);
    try { await error(first, 'cas', casBody(target, 2), 'WRITE_FAILED', 503); }
    finally { fs.chmodSync(storeDir, 0o700); }
    assert.deepEqual(fs.readFileSync(recordFile), good);
    assert.equal(fs.readdirSync(storeDir).filter(name => name.endsWith('.tmp')).length, 0);
    snapshot('actual EACCES write failure preserves revision and bytes');

    await stop();
    await start();
    // Cookies stay host-issued; in-memory clients/visits intentionally do not survive restart.
    await error(first, 'read', { target }, 'INVALID_CLIENT', 403);
    const newClient = (await first.api('client')).clientId;
    target = await activate(first, newClient, a.chatId);
    assert.deepEqual(await first.api('read', { target }), JSON.parse(good));
    await first.api('cas', casBody(target, 2));
    assert.equal(disk('default-user', a.chatId).revision, 3);
    snapshot('host process restart recovers exact stored revision and issues new visits');

    // Native rename is intentionally UNSUPPORTED by the sealed fixture identity mechanism.
    const oldFile = path.join(data, 'default-user', a.relativePath);
    const newFile = path.join(path.dirname(oldFile), 'renamed.jsonl');
    assert.ok(!fs.existsSync(newFile));
    await first.request('/api/chats/rename', { avatar_url: `${path.basename(path.dirname(oldFile))}.png`,
        is_group: false, original_file: 'same.jsonl', renamed_file: 'renamed.jsonl' });
    assert.equal(hash(fs.readFileSync(newFile)), canonical.get(oldFile), 'native rename preserved exact canonical bytes');
    canonical.delete(oldFile);
    canonical.set(newFile, hash(fs.readFileSync(newFile)));
    await error(first, 'read', { target }, 'INVALID_TARGET', 400);
    await error(first, 'cas', casBody(target, 3), 'INVALID_TARGET', 400);
    assert.equal(disk('default-user', a.chatId).revision, 3);
    // Byte-identical recreation at old filename does NOT regain old authority.
    fs.copyFileSync(newFile, oldFile, fs.constants.COPYFILE_EXCL);
    canonical.set(oldFile, hash(fs.readFileSync(oldFile)));
    await error(first, 'cas', casBody(target, 3), 'INVALID_TARGET', 400);
    snapshot('native rename and same-name recreation refuse old binding', { classification: 'HOST_TESTED refusal; rename identity preservation UNSUPPORTED' });
    evidence.canonicalSha256 = Object.fromEntries([...canonical].map(([file, digest]) => [path.relative(data, file), digest]));
    evidence.result = 'PASS_WITH_IDENTITY_LIMITS';
} catch (error) {
    failed = error;
    evidence.result = 'FAIL';
    evidence.failure = error.stack;
    console.error(error);
} finally {
    await stop();
    // Delete only the mkdtemp directory owned by THIS invocation; never the supplied checkout.
    assert.equal(fs.readFileSync(path.join(data, '.dyl26-owned'), 'utf8'), runId);
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
