import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:18019';
const dataRoot = process.argv[3];
if (!dataRoot) {
    throw new Error('Usage: node tests/probes/dyl19/host-storage-probe.mjs <host-url> <isolated-data-root>');
}

const fixturePath = fileURLToPath(new URL('./fixtures/pixel-1x1.png', import.meta.url));
const fixture = fs.readFileSync(fixturePath);
const fixtureHash = createHash('sha256').update(fixture).digest('hex');
const alternateFixture = fs.readFileSync(fileURLToPath(new URL('./fixtures/pixel-1x1-red.png', import.meta.url)));
const alternateFixtureHash = createHash('sha256').update(alternateFixture).digest('hex');
const testName = 'DYL19-shared';
const owners = ['Mira.png', 'Mira1.png'];
const testBackground = 'sillynovel_dyl19_pixel_1x1.png';
const backupDir = path.join(dataRoot, 'default-user', 'backups');
const settingsPath = path.join(dataRoot, 'default-user', 'settings.json');
const settingsHashBefore = createHash('sha256').update(fs.readFileSync(settingsPath)).digest('hex');
const existingBackups = new Set(fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : []);
const headersResponse = await fetch(`${baseUrl}/csrf-token`);
assert.equal(headersResponse.ok, true, 'host CSRF endpoint is available');
const csrf = await headersResponse.json();
const cookies = headersResponse.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
assert.ok(/(?:^|; )session-[^=]+=/.test(cookies), 'isolated profile session cookie is present');

async function postJson(route, body) {
    const response = await fetch(`${baseUrl}${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: cookies, 'x-csrf-token': csrf.token },
        body: JSON.stringify(body),
    });
    assert.equal(response.ok, true, `${route} returned ${response.status}`);
    return response;
}

async function removeChat(avatarUrl, fileName) {
    const response = await fetch(`${baseUrl}/api/chats/delete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: cookies, 'x-csrf-token': csrf.token },
        body: JSON.stringify({ avatar_url: avatarUrl, chatfile: `${fileName}.jsonl` }),
    });
    assert.ok(response.ok || response.status === 400, `cleanup chat returned ${response.status}`);
}

try {
    for (const avatar_url of owners) {
        const prior = await postJson('/api/chats/get', { avatar_url, file_name: testName });
        const priorRecord = await prior.json();
        assert.ok(Array.isArray(priorRecord) ? priorRecord.length === 0 : Object.keys(priorRecord).length === 0, `${avatar_url} test filename is unused`);
        await postJson('/api/chats/save', {
            avatar_url,
            file_name: testName,
            force: true,
            chat: [
                { chat_metadata: {}, user_name: 'DYL19 Test User', character_name: 'Mira' },
                { name: 'DYL19 Test User', is_user: true, mes: 'Repeated synthetic prefix.', send_date: '2026-10-12T19:02:00.000Z', extra: {} },
            ],
        });
    }

    const persisted = [];
    for (const avatar_url of owners) {
        const result = await postJson('/api/chats/get', { avatar_url, file_name: testName });
        persisted.push(await result.json());
    }
    assert.equal(persisted.length, 2);
    assert.deepEqual(persisted[0], persisted[1], 'identical filenames under separate card directories keep distinct records');
    assert.deepEqual(persisted[0][0].chat_metadata, {}, 'synthetic chat record carries no visual metadata or image bytes');

    const rename = await postJson('/api/chats/rename', {
        is_group: false,
        avatar_url: owners[0],
        original_file: `${testName}.jsonl`,
        renamed_file: `${testName}-renamed.jsonl`,
    });
    assert.equal((await rename.json()).ok, true, 'host chat rename operation succeeds');
    const renamed = await postJson('/api/chats/get', { avatar_url: owners[0], file_name: `${testName}-renamed` });
    assert.deepEqual(await renamed.json(), persisted[0], 'renamed host chat persists the same canonical record');
    await postJson('/api/chats/rename', {
        is_group: false,
        avatar_url: owners[0],
        original_file: `${testName}-renamed.jsonl`,
        renamed_file: `${testName}.jsonl`,
    });

    async function uploadFixture(bytes) {
        const form = new FormData();
        form.set('avatar', new Blob([bytes], { type: 'image/png' }), testBackground);
        const upload = await fetch(`${baseUrl}/api/backgrounds/upload`, {
            method: 'POST',
            headers: { cookie: cookies, 'x-csrf-token': csrf.token },
            body: form,
        });
        assert.equal(upload.ok, true, `background upload returned ${upload.status}`);
        assert.equal((await upload.text()), testBackground);
    }

    await uploadFixture(fixture);
    const storedPath = path.join(dataRoot, 'default-user', 'backgrounds', testBackground);
    assert.equal(createHash('sha256').update(fs.readFileSync(storedPath)).digest('hex'), fixtureHash, 'persisted asset bytes match the tiny fixture');
    const backgrounds = await postJson('/api/backgrounds/all', {});
    assert.ok((await backgrounds.json()).images.some(image => image.filename === testBackground), 'host background read API lists the upload');
    await uploadFixture(alternateFixture);
    assert.equal(createHash('sha256').update(fs.readFileSync(storedPath)).digest('hex'), alternateFixtureHash, 'same-name upload replaces the prior bytes');
    const replacedBackgrounds = await postJson('/api/backgrounds/all', {});
    assert.equal((await replacedBackgrounds.json()).images.filter(image => image.filename === testBackground).length, 1, 'host background read API exposes one mutable filename, not two revisions');
    assert.equal(createHash('sha256').update(fs.readFileSync(settingsPath)).digest('hex'), settingsHashBefore, 'asset import does not write to extension settings');
    console.log(JSON.stringify({
        result: 'PASS',
        sameFilenameOwners: owners.map(name => name.replace('.png', '')),
        chatRecordsReadBack: persisted.length,
        chatRenameRoundTrip: true,
        assetStore: 'default-user/backgrounds',
        assetBytesSha256: fixtureHash,
        sameNameReplacedBytesSha256: alternateFixtureHash,
        sameNameUploadReplaced: true,
        extensionSettingsUnchanged: true,
        chatMetadataHasAssetBytes: false,
    }));
} finally {
    for (const avatarUrl of owners) {
        await removeChat(avatarUrl, testName);
        await removeChat(avatarUrl, `${testName}-renamed`);
    }
    const removedAsset = await fetch(`${baseUrl}/api/backgrounds/delete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: cookies, 'x-csrf-token': csrf.token },
        body: JSON.stringify({ bg: testBackground }),
    });
    assert.ok(removedAsset.ok || removedAsset.status === 400, `cleanup asset returned ${removedAsset.status}`);
    if (fs.existsSync(backupDir)) {
        for (const filename of fs.readdirSync(backupDir)) {
            if (!existingBackups.has(filename) && filename.startsWith('chat_mira')) {
                fs.unlinkSync(path.join(backupDir, filename));
            }
        }
    }
}
