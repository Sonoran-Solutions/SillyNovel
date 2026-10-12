import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createOwnedChats, cleanupOwnedChats, createOwnedAsset, cleanupOwnedAssets } from './owned-chat-probe.mjs';

const expectedCommit = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const hostRoot = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) {
    throw new Error('Usage: node tests/probes/dyl19/host-storage-probe.mjs <pinned-SillyTavern-checkout>');
}
assert.equal(execFileSync('git', ['-C', hostRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expectedCommit,
    'probe requires the pinned SillyTavern commit');
assert.ok(fs.existsSync(path.join(hostRoot, 'node_modules')), 'run npm ci in the pinned host checkout first');

const fixture = fs.readFileSync(fileURLToPath(new URL('./fixtures/pixel-1x1.png', import.meta.url)));
const fixtureHash = createHash('sha256').update(fixture).digest('hex');
const alternateFixture = fs.readFileSync(fileURLToPath(new URL('./fixtures/pixel-1x1-red.png', import.meta.url)));
const alternateFixtureHash = createHash('sha256').update(alternateFixture).digest('hex');
const runId = randomUUID();
const testName = `DYL19-${runId}`;
const owners = ['Mira.png', 'Mira1.png'];
const testBackground = `sillynovel_dyl19_${runId}.png`;
const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sillynovel-dyl19-'));
const settingsPath = path.join(dataRoot, 'default-user', 'settings.json');
const ownedChats = [];
const ownedAssets = new Set();
let child;
let stdout = '';
let stderr = '';
let probeError;
let baseUrl;
let removeOwnedChat;
let removeOwnedAsset;

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

async function waitForOwnedHost(baseUrl, timeoutMs = 30_000) {
    const stopAt = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < stopAt && child.exitCode === null) {
        try {
            const response = await fetch(`${baseUrl}/csrf-token`);
            const listenerLine = `SillyTavern is listening on IPv4: 127.0.0.1:${new URL(baseUrl).port}`;
            if (response.ok && fs.existsSync(settingsPath) && stdout.includes(dataRoot) && stdout.includes(listenerLine)) return response;
            lastError = new Error(`unexpected startup response ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error(`owned SillyTavern process did not start: ${lastError?.message ?? stderr}`);
}

async function runProbe(port) {
    baseUrl = `http://127.0.0.1:${port}`;
    const tokenResponse = await waitForOwnedHost(baseUrl);
    const csrf = await tokenResponse.json();
    const cookies = tokenResponse.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
    assert.ok(/(?:^|; )session-[^=]+=/.test(cookies), 'fresh isolated host session cookie is present');
    const settingsHashBefore = createHash('sha256').update(fs.readFileSync(settingsPath)).digest('hex');

    async function postJson(route, body) {
        const response = await fetch(`${baseUrl}${route}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie: cookies, 'x-csrf-token': csrf.token },
            body: JSON.stringify(body),
        });
        assert.equal(response.ok, true, `${route} returned ${response.status}`);
        return response;
    }

    async function getChat(avatarUrl, filename) {
        return (await (await postJson('/api/chats/get', { avatar_url: avatarUrl, file_name: filename })).json());
    }

    async function saveChat(avatarUrl, filename, chat) {
        await postJson('/api/chats/save', { avatar_url: avatarUrl, file_name: filename, force: true, chat });
    }

    async function removeChat(avatarUrl, filename) {
        const response = await fetch(`${baseUrl}/api/chats/delete`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie: cookies, 'x-csrf-token': csrf.token },
            body: JSON.stringify({ avatar_url: avatarUrl, chatfile: `${filename}.jsonl` }),
        });
        assert.ok(response.ok || response.status === 400, `cleanup chat returned ${response.status}`);
    }
    removeOwnedChat = removeChat;
    removeOwnedAsset = async assetName => {
        const response = await fetch(`${baseUrl}/api/backgrounds/delete`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie: cookies, 'x-csrf-token': csrf.token },
            body: JSON.stringify({ bg: assetName }),
        });
        assert.ok(response.ok || response.status === 400, `cleanup asset returned ${response.status}`);
    };

    const marker = avatarUrl => `DYL19 synthetic owner marker ${avatarUrl} ${runId}`;
    await createOwnedChats({
        owners,
        filename: testName,
        marker: avatarUrl => [
            { chat_metadata: {}, user_name: 'DYL19 Test User', character_name: `Mira ${avatarUrl}` },
            { name: 'DYL19 Test User', is_user: true, mes: marker(avatarUrl), send_date: '2026-10-12T19:02:00.000Z', extra: {} },
        ],
        getChat,
        saveChat,
        ownedChats,
    });

    const first = await getChat(owners[0], testName);
    const second = await getChat(owners[1], testName);
    assert.equal(first[1].mes, marker(owners[0]));
    assert.equal(second[1].mes, marker(owners[1]));
    assert.notEqual(first[1].mes, second[1].mes, 'each owner has a distinct persisted marker');
    assert.deepEqual(first[0].chat_metadata, {}, 'synthetic chat record carries no visual metadata or image bytes');

    const renameName = `${testName}-renamed`;
    const rename = await postJson('/api/chats/rename', {
        is_group: false,
        avatar_url: owners[0],
        original_file: `${testName}.jsonl`,
        renamed_file: `${renameName}.jsonl`,
    });
    assert.equal((await rename.json()).ok, true, 'host chat rename operation succeeds');
    const firstRenamed = await getChat(owners[0], renameName);
    assert.deepEqual(firstRenamed, first, 'renamed host chat preserves owner A record');
    assert.deepEqual(await getChat(owners[1], testName), second, 'renaming owner A leaves owner B record unchanged');
    ownedChats.splice(ownedChats.findIndex(entry => entry.avatarUrl === owners[0] && entry.filename === testName), 1);
    ownedChats.push({ avatarUrl: owners[0], filename: renameName });

    const renameBack = await postJson('/api/chats/rename', {
        is_group: false,
        avatar_url: owners[0],
        original_file: `${renameName}.jsonl`,
        renamed_file: `${testName}.jsonl`,
    });
    assert.equal((await renameBack.json()).ok, true, 'host chat rename round-trip succeeds');
    ownedChats.splice(ownedChats.findIndex(entry => entry.avatarUrl === owners[0] && entry.filename === renameName), 1);
    ownedChats.push({ avatarUrl: owners[0], filename: testName });

    async function getBackgrounds() {
        return (await postJson('/api/backgrounds/all', {})).json();
    }
    async function uploadFixture(bytes) {
        const form = new FormData();
        form.set('avatar', new Blob([bytes], { type: 'image/png' }), testBackground);
        const upload = await fetch(`${baseUrl}/api/backgrounds/upload`, {
            method: 'POST',
            headers: { cookie: cookies, 'x-csrf-token': csrf.token },
            body: form,
        });
        assert.equal(upload.ok, true, `background upload returned ${upload.status}`);
        assert.equal(await upload.text(), testBackground);
    }

    await createOwnedAsset({
        filename: testBackground,
        getAssets: async () => (await getBackgrounds()).images,
        uploadAsset: () => uploadFixture(fixture),
        ownedAssets,
    });
    const storedPath = path.join(dataRoot, 'default-user', 'backgrounds', testBackground);
    assert.equal(createHash('sha256').update(fs.readFileSync(storedPath)).digest('hex'), fixtureHash,
        'persisted asset bytes match the tiny fixture');
    const listed = await getBackgrounds();
    assert.ok(listed.images.some(image => image.filename === testBackground), 'host background read API lists the upload');
    await uploadFixture(alternateFixture);
    assert.equal(createHash('sha256').update(fs.readFileSync(storedPath)).digest('hex'), alternateFixtureHash,
        'same-name upload replaces this run-owned file');
    const replaced = await getBackgrounds();
    assert.equal(replaced.images.filter(image => image.filename === testBackground).length, 1,
        'host background API exposes one mutable filename, not two revisions');
    assert.equal(createHash('sha256').update(fs.readFileSync(settingsPath)).digest('hex'), settingsHashBefore,
        'asset import does not write to extension settings');

    console.log(JSON.stringify({
        result: 'PASS',
        hostCommit: expectedCommit,
        runId,
        sameFilenameOwners: owners.map(name => name.replace('.png', '')),
        distinctOwnerMarkersReadBack: true,
        ownerARenameLeftOwnerBUnchanged: true,
        assetStore: 'fresh-run/default-user/backgrounds',
        assetBytesSha256: fixtureHash,
        sameNameReplacedBytesSha256: alternateFixtureHash,
        sameNameUploadReplaced: true,
        extensionSettingsUnchanged: true,
        chatMetadataHasAssetBytes: false,
    }));
}

try {
    const port = await reserveLoopbackPort();
    child = spawn(process.execPath, [
        path.join(hostRoot, 'server.js'),
        '--port', String(port),
        '--listen', 'false',
        '--enableIPv4', 'true',
        '--enableIPv6', 'false',
        '--listenAddressIPv4', '127.0.0.1',
        '--browserLaunchEnabled', 'false',
        '--whitelist', 'false',
        '--dataRoot', dataRoot,
    ], { cwd: hostRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    await runProbe(port);
} catch (error) {
    probeError = error;
} finally {
    try {
        if (removeOwnedChat) {
            // Cleanup calls are limited to records whose successful creation this run observed.
            await cleanupOwnedChats(ownedChats, removeOwnedChat);
        }
    } catch (error) {
        probeError ??= error;
    }
    try {
        if (removeOwnedAsset) await cleanupOwnedAssets(ownedAssets, removeOwnedAsset);
    } catch (error) {
        probeError ??= error;
    }
    if (child && child.exitCode === null) {
        child.kill('SIGTERM');
        await new Promise(resolve => child.once('close', resolve));
    }
    fs.rmSync(dataRoot, { recursive: true, force: true });
}

if (probeError) {
    throw new Error(`${probeError.message}\nHost stdout: ${stdout.slice(-2000)}\nHost stderr: ${stderr.slice(-2000)}`, { cause: probeError });
}
