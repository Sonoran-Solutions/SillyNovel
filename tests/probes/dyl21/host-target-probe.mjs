import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const expectedCommit = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const hostRoot = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node tests/probes/dyl21/host-target-probe.mjs <pinned-SillyTavern-checkout>');
assert.equal(execFileSync('git', ['-C', hostRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expectedCommit,
    'probe requires the pinned SillyTavern commit');
assert.ok(fs.existsSync(path.join(hostRoot, 'node_modules')), 'run npm ci in the pinned host checkout first');

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dyl19/fixtures');
const original = fs.readFileSync(path.join(fixtureDir, 'pixel-1x1.png'));
const replacement = fs.readFileSync(path.join(fixtureDir, 'pixel-1x1-red.png'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runId = randomUUID();
const chatName = `DYL21-${runId}`;
const cardFiles = ['DYL21-A.png', 'DYL21-B.png'];
const backgroundName = `sillynovel_dyl21_${runId}.png`;
const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sillynovel-dyl21-'));
const settingsPath = path.join(dataRoot, 'default-user', 'settings.json');
const createdChats = [];
const createdAssets = new Set();
let child;
let stdout = '';
let stderr = '';
let baseUrl;
let cookies;
let csrfToken;
let probeError;

function reserveLoopbackPort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

async function waitForOwnedHost(timeoutMs = 30_000) {
    const end = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < end && child.exitCode === null) {
        try {
            const response = await fetch(`${baseUrl}/csrf-token`);
            const listener = `SillyTavern is listening on IPv4: 127.0.0.1:${new URL(baseUrl).port}`;
            if (response.ok && fs.existsSync(settingsPath) && stdout.includes(dataRoot) && stdout.includes(listener)) return response;
            lastError = new Error(`unexpected startup response ${response.status}`);
        } catch (error) { lastError = error; }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error(`owned host did not start: ${lastError?.message ?? stderr}`);
}

async function request(route, body, { method = 'POST', headers = {} } = {}) {
    return fetch(`${baseUrl}${route}`, {
        method,
        headers: { cookie: cookies, 'x-csrf-token': csrfToken, ...headers },
        ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    });
}

async function readChat(cardFile) {
    const response = await request('/api/chats/get', { avatar_url: cardFile, file_name: chatName }, { headers: { 'content-type': 'application/json' } });
    assert.equal(response.status, 200);
    return response.json();
}

async function writeChat(cardFile, chat) {
    const response = await request('/api/chats/save', {
        avatar_url: cardFile, file_name: chatName, force: false, chat,
    }, { headers: { 'content-type': 'application/json' } });
    return response;
}

async function removeChat(cardFile) {
    const response = await request('/api/chats/delete', { avatar_url: cardFile, chatfile: `${chatName}.jsonl` }, { headers: { 'content-type': 'application/json' } });
    assert.ok(response.ok || response.status === 400, `chat cleanup returned ${response.status}`);
}

async function removeBackground() {
    const response = await request('/api/backgrounds/delete', { bg: backgroundName }, { headers: { 'content-type': 'application/json' } });
    assert.ok(response.ok || response.status === 400, `asset cleanup returned ${response.status}`);
}

async function run(port) {
    baseUrl = `http://127.0.0.1:${port}`;
    const csrfResponse = await waitForOwnedHost();
    const csrf = await csrfResponse.json();
    cookies = csrfResponse.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
    csrfToken = csrf.token;
    assert.match(cookies, /(?:^|; )session-[^=]+=/);
    const settingsBefore = hash(fs.readFileSync(settingsPath));

    const initial = await Promise.all(cardFiles.map(readChat));
    assert.ok(initial.every(chat => Array.isArray(chat) ? chat.length === 0 : Object.keys(chat).length === 0),
        'collision preflight passes in fresh isolated data root');
    for (const [index, cardFile] of cardFiles.entries()) {
        const chat = [
            { chat_metadata: { integrity: `DYL21-${runId}` }, user_name: 'Synthetic User', character_name: `Card ${index}` },
            { name: 'Synthetic User', is_user: true, mes: `DYL21 canonical marker ${cardFile} ${runId}`, extra: {} },
        ];
        const response = await writeChat(cardFile, chat);
        assert.equal(response.status, 200, `targeted chat write returned ${response.status}`);
        assert.deepEqual(await response.json(), { ok: true });
        createdChats.push(cardFile);
        assert.deepEqual(await readChat(cardFile), chat, 'actual JSONL record reads back after acknowledged write');
    }
    const [recordA, recordB] = await Promise.all(cardFiles.map(readChat));
    assert.notEqual(recordA[1].mes, recordB[1].mes, 'same filename under distinct card directories remains distinct');

    const staleA = structuredClone(recordA);
    const currentA = structuredClone(recordA);
    currentA[0].chat_metadata.extension_sillynovel = { revision: 2, marker: 'current' };
    const currentWrite = await writeChat(cardFiles[0], currentA);
    assert.equal(currentWrite.status, 200);
    assert.deepEqual(await currentWrite.json(), { ok: true });
    staleA[0].chat_metadata.extension_sillynovel = { revision: 2, marker: 'stale' };
    const staleWrite = await writeChat(cardFiles[0], staleA);
    assert.equal(staleWrite.status, 200, 'same chat integrity token does not reject stale whole-array write');
    assert.deepEqual(await staleWrite.json(), { ok: true });
    assert.equal((await readChat(cardFiles[0]))[0].chat_metadata.extension_sillynovel.marker, 'stale',
        'stale metadata overwrites newer state because the route has no revision CAS');

    const badRecordResponse = await writeChat(cardFiles[0], { not: 'an array' });
    assert.equal(badRecordResponse.status, 400, 'invalid chat body receives an HTTP failure');

    const form = bytes => {
        const data = new FormData();
        data.set('avatar', new Blob([bytes], { type: 'image/png' }), backgroundName);
        return request('/api/backgrounds/upload', data, { method: 'POST', headers: {} });
    };
    const backgroundsBefore = await (await request('/api/backgrounds/all', {}, { headers: { 'content-type': 'application/json' } })).json();
    assert.ok(!backgroundsBefore.images.some(item => item.filename === backgroundName), 'background name collision preflight passes');
    const firstUpload = await form(original);
    assert.equal(firstUpload.status, 200);
    assert.equal(await firstUpload.text(), backgroundName);
    createdAssets.add(backgroundName);
    const storedPath = path.join(dataRoot, 'default-user', 'backgrounds', backgroundName);
    assert.equal(hash(fs.readFileSync(storedPath)), hash(original), 'first upload bytes read back exactly');
    const listed = await (await request('/api/backgrounds/all', {}, { headers: { 'content-type': 'application/json' } })).json();
    assert.ok(listed.images.some(item => item.filename === backgroundName), 'background listing reads uploaded asset');
    const secondUpload = await form(replacement);
    assert.equal(secondUpload.status, 200);
    assert.equal(await secondUpload.text(), backgroundName);
    assert.equal(hash(fs.readFileSync(storedPath)), hash(replacement), 'same-name upload overwrites the prior bytes');
    assert.equal(hash(fs.readFileSync(settingsPath)), settingsBefore, 'chat/assets probe leaves extension settings untouched');

    console.log(JSON.stringify({
        result: 'HOST_TESTED', hostCommit: expectedCommit, runId,
        sameFilenameDistinctCardPaths: true, explicitChatWriteAcknowledgement: 'HTTP 200 {ok:true}',
        sameIntegrityStaleWholeRecordWriteAccepted: true, invalidBodyRejected: 400,
        assetReadbackSha256: hash(original), sameNameOverwriteSha256: hash(replacement),
        settingsUnchanged: true,
    }));
}

try {
    const port = await reserveLoopbackPort();
    child = spawn(process.execPath, [
        path.join(hostRoot, 'server.js'), '--port', String(port), '--listen', 'false', '--enableIPv4', 'true',
        '--enableIPv6', 'false', '--listenAddressIPv4', '127.0.0.1', '--browserLaunchEnabled', 'false',
        '--whitelist', 'false', '--dataRoot', dataRoot,
    ], { cwd: hostRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    await run(port);
} catch (error) { probeError = error; }
finally {
    for (const cardFile of createdChats) {
        try { await removeChat(cardFile); } catch (error) { probeError ??= error; }
    }
    if (createdAssets.size) {
        try { await removeBackground(); } catch (error) { probeError ??= error; }
    }
    if (child && child.exitCode === null) {
        child.kill('SIGTERM');
        await new Promise(resolve => child.once('close', resolve));
    }
    fs.rmSync(dataRoot, { recursive: true, force: true });
}
if (probeError) throw new Error(`${probeError.message}\nHost stdout: ${stdout.slice(-2000)}\nHost stderr: ${stderr.slice(-2000)}`, { cause: probeError });
