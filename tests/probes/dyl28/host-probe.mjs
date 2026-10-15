import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hostSha = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const namespace = 'sillynovel-dyl27'; // DYL-27 identity/CAS registry, extended only in this disposable host.
const source = path.resolve(process.argv[2] ?? '');
const output = process.argv[3] && path.resolve(process.argv[3]);
if (!process.argv[2] || !output) throw new Error('Usage: node tests/probes/dyl28/host-probe.mjs <pinned-host-with-node_modules> <new-evidence-directory>');
assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), hostSha);
assert.ok(fs.existsSync(path.join(source, 'node_modules')));
assert.ok(!fs.existsSync(output), 'evidence collision; choose a new directory');
const sourceStatus = execFileSync('git', ['-C', source, 'status', '--porcelain'], { encoding: 'utf8' });
const probeDir = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runId = randomUUID();
const owned = fs.mkdtempSync(path.join(os.tmpdir(), 'sillynovel-dyl28-'));
const host = path.join(owned, 'host');
const data = path.join(owned, `sillynovel-dyl27-${runId}`);
const config = path.join(owned, 'config.yaml');
const evidence = {
    runId, sourceHostSha: hostSha, testedSillyNovelSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    node: process.version, platform: `${os.platform()} ${os.release()}`, checks: [], sourceSnapshots: [], files: {},
};
for (const file of ['host-storage.mjs', 'host-visit.js', 'host-envelope.patch', 'host-probe.mjs']) {
    evidence.files[file] = hash(fs.readFileSync(path.join(probeDir, file)));
}
evidence.files['dyl27-host-mount.patch'] = hash(fs.readFileSync(path.resolve(probeDir, '../dyl27/host-mount.patch')));
let child;
let logs = '';
let base;
let provider;
let browser;
let browserContexts = [];
let failed;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function userRoot(handle) { return path.join(data, handle); }
function registry(handle) { return JSON.parse(fs.readFileSync(path.join(userRoot(handle), namespace, 'identities.json'), 'utf8')); }
function chatFile(handle, relativePath) { return path.join(userRoot(handle), relativePath); }
function visualFile(handle, chatId) { return path.join(userRoot(handle), namespace, `${chatId}.json`); }
function actualState() {
    const users = {};
    for (const handle of ['default-user', otherHandle]) {
        if (!fs.existsSync(path.join(userRoot(handle), namespace, 'identities.json'))) continue;
        const rawRegistry = fs.readFileSync(path.join(userRoot(handle), namespace, 'identities.json'), 'utf8');
        const catalog = JSON.parse(rawRegistry);
        users[handle] = {
            registry: rawRegistry,
            registrySha256: hash(rawRegistry),
            storeId: catalog.storeId,
            chats: catalog.chats.map(chat => {
                const sourceFile = path.join(userRoot(handle), chat.relativePath);
                const visualRecord = visualFile(handle, chat.chatId);
                return {
                    relativePath: chat.relativePath, chatId: chat.chatId, scopeId: chat.scopeId,
                    sourceRevision: chat.sourceRevision ?? null, deleted: Boolean(chat.deleted), seal: chat.seal ?? null,
                    sourceText: fs.existsSync(sourceFile) ? fs.readFileSync(sourceFile, 'utf8') : null,
                    sourceSha256: fs.existsSync(sourceFile) ? hash(fs.readFileSync(sourceFile)) : null,
                    visualRecord: fs.existsSync(visualRecord) ? fs.readFileSync(visualRecord, 'utf8') : null,
                    visualSha256: fs.existsSync(visualRecord) ? hash(fs.readFileSync(visualRecord)) : null,
                };
            }),
        };
    }
    return users;
}
function canonicalHashes() {
    const result = {};
    for (const [handle, state] of Object.entries(actualState())) {
        for (const chat of state.chats) if (chat.sourceSha256) result[`${handle}/${chat.relativePath}`] = chat.sourceSha256;
    }
    return result;
}
function checkpoint(name, classification, details = {}) {
    const state = actualState();
    evidence.checks.push({ name, result: 'PASS', classification, ...details, actualState: state });
    evidence.sourceSnapshots.push({ name, canonicalSha256: canonicalHashes() });
    console.log(`PASS ${name}`);
}
async function stopHost() {
    if (child && child.exitCode === null) {
        const done = new Promise(resolve => child.once('close', resolve));
        child.kill('SIGTERM');
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        await done;
        clearTimeout(timer);
    }
}
async function startHost() {
    logs = '';
    const reserve = net.createServer();
    await new Promise((resolve, reject) => { reserve.once('error', reject); reserve.listen(0, '127.0.0.1', resolve); });
    const port = reserve.address().port;
    await new Promise(resolve => reserve.close(resolve));
    base = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [path.join(host, 'server.js'), '--configPath', config, '--port', String(port),
        '--listen', 'false', '--enableIPv4', 'true', '--enableIPv6', 'false', '--listenAddressIPv4', '127.0.0.1',
        '--browserLaunchEnabled', 'false', '--whitelist', 'false', '--dataRoot', data], {
        cwd: host, env: { ...process.env, SN_DYL27_RUN: runId, SN_DYL27_INTERRUPT: '', ...(process.env.SN_DYL42 === '1' ? { SN_DYL42_IMPORT_TIME: '1700000000000' } : {}) },
        stdio: ['ignore', 'pipe', 'pipe'],
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
            headers: { cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
                ...(csrf ? { 'x-csrf-token': csrf } : {}), ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) },
            ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
        });
        for (const cookie of response.headers.getSetCookie()) {
            const [pair] = cookie.split(';'); const equals = pair.indexOf('=');
            cookies.set(pair.slice(0, equals), pair.slice(equals + 1));
        }
        const raw = await response.text();
        assert.equal(response.status, expected, `${route}: ${raw.slice(0, 300)}`);
        try { return JSON.parse(raw); } catch { return raw; }
    };
    return {
        cookies, request,
        api: (name, body = {}, expected) => request(`/api/dyl27/${name}`, body, expected),
        async login(handle) { csrf = (await request('/csrf-token')).token; await request('/api/users/login', { handle }); },
    };
}
function chatMessages(marker, extra = {}) {
    return [
        { user_name: 'Synthetic User', character_name: 'Mira', chat_metadata: { integrity: runId } },
        { name: 'Mira', is_user: false, mes: marker, extra: {}, ...extra },
    ];
}
function selectedCardIndex(page, avatar) {
    return page.evaluate(av => SillyTavern.getContext().characters.findIndex(card => card.avatar === av), avatar);
}
async function clickCard(page, avatar) {
    const icon = page.locator('#rightNavDrawerIcon');
    if ((await icon.count()) && (await icon.getAttribute('class') || '').includes('closedIcon')) await icon.click();
    if (!(await page.locator('#rm_button_create').isVisible())) await page.locator('#rm_button_characters').click();
    const index = await selectedCardIndex(page, avatar);
    assert.ok(index >= 0, `synthetic card ${avatar} is listed`);
    await page.locator(`.character_select[data-chid="${index}"]`).first().click();
}
async function waitForTarget(page, avatar, chatId, sourceRevision) {
    try {
        await page.waitForFunction(({ avatar, chatId, sourceRevision }) => {
            const context = SillyTavern.getContext();
            return context.characters[context.characterId]?.avatar === avatar
                && window.dyl28?.target?.chatId === chatId
                && window.dyl28?.target?.sourceRevision === sourceRevision;
        }, { avatar, chatId, sourceRevision }, { timeout: 15000 });
    } catch (error) {
        throw new Error(`${error.message}; state=${JSON.stringify(await pageState(page))}`);
    }
}
async function pageState(page) {
    return page.evaluate(() => {
        const context = SillyTavern.getContext();
        return {
            avatar: context.characters[context.characterId]?.avatar,
            chatName: context.characters[context.characterId]?.chat,
            messages: context.chat.map(message => message.mes),
            dom: [...document.querySelectorAll('#chat > .mes .mes_text')].map(node => node.innerText),
            target: window.dyl28?.target ?? null,
            history: window.dyl28?.history ?? [],
        };
    });
}
async function uiApi(page, name, body, expected = 200) {
    const result = await page.evaluate(async ({ name, body }) => {
        const context = SillyTavern.getContext();
        const response = await fetch(`/api/dyl27/${name}`, {
            method: 'POST', headers: context.getRequestHeaders(), body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
    }, { name, body });
    assert.equal(result.status, expected, `${name}: ${JSON.stringify(result.body)}`);
    return result.body;
}
function holdFirst(page, urlPattern, matches) {
    let release;
    let enter;
    let fulfill;
    const gate = new Promise(resolve => { release = resolve; });
    const entered = new Promise(resolve => { enter = resolve; });
    const fulfilled = new Promise(resolve => { fulfill = resolve; });
    let captured;
    const handler = async route => {
        let body = {};
        try { body = route.request().postDataJSON() ?? {}; } catch { /* no JSON body */ }
        if (!captured && matches(body)) {
            const response = await route.fetch();
            const text = await response.text();
            captured = { request: body, response: JSON.parse(text), status: response.status() };
            enter(captured);
            await gate;
            await route.fulfill({ response, body: text });
            fulfill();
        } else await route.continue();
    };
    return {
        install: () => page.route(urlPattern, handler),
        entered, fulfilled,
        release: () => release(),
        remove: () => page.unroute(urlPattern, handler),
    };
}
async function apiError(client, name, body, code, status = 409) {
    assert.deepEqual(await client.api(name, body, status), { error: code });
}

let otherHandle = `dyl28-${runId}`;
let first;
let other;
let avatarA;
let avatarB;
let a;
let b;
let initialA;
let secondPage;
let firstPage;
let firstContext;
let secondContext;

try {
    execFileSync('git', ['clone', '--shared', '--no-hardlinks', source, host], { stdio: 'pipe' });
    execFileSync('git', ['-C', host, 'checkout', '--detach', hostSha], { stdio: 'pipe' });
    fs.symlinkSync(path.join(source, 'node_modules'), path.join(host, 'node_modules'), 'dir');
    const dyl27Patch = path.resolve(probeDir, '../dyl27/host-mount.patch');
    const envelopePatch = path.join(probeDir, 'host-envelope.patch');
    execFileSync('git', ['-C', host, 'apply', '--check', dyl27Patch], { stdio: 'pipe' });
    execFileSync('git', ['-C', host, 'apply', dyl27Patch], { stdio: 'pipe' });
    fs.copyFileSync(path.join(probeDir, 'host-storage.mjs'), path.join(host, 'src/dyl27-storage.mjs'), fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(path.join(probeDir, 'host-visit.js'), path.join(host, 'public/scripts/dyl27-visit.js'), fs.constants.COPYFILE_EXCL);
    execFileSync('git', ['-C', host, 'apply', '--check', envelopePatch], { stdio: 'pipe' });
    execFileSync('git', ['-C', host, 'apply', envelopePatch], { stdio: 'pipe' });
    if (process.env.SN_DYL42 === '1') {
        const writersPatch = path.resolve(probeDir, '../dyl42/host-writers.patch');
        execFileSync('git', ['-C', host, 'apply', '--check', writersPatch], { stdio: 'pipe' });
        execFileSync('git', ['-C', host, 'apply', writersPatch], { stdio: 'pipe' });
        for (const file of ['host-writers.patch', 'writer-campaign.mjs']) {
            evidence.files[`dyl42-${file}`] = hash(fs.readFileSync(path.resolve(probeDir, '../dyl42', file)));
        }
        evidence.files['applied-host-storage.mjs'] = hash(fs.readFileSync(path.join(host, 'src/dyl27-storage.mjs')));
    }
    const settings = JSON.parse(fs.readFileSync(path.join(host, 'default/content/settings.json'), 'utf8'));
    provider = createServer(async (request, response) => {
        if (request.url === '/v1/models') return response.end(JSON.stringify({ data: [{ id: 'dyl28-loopback' }] }));
        if (request.url !== '/v1/chat/completions') { response.statusCode = 404; return response.end(); }
        let bytes = 0;
        for await (const part of request) { bytes += part.length; if (bytes > 1024 * 1024) { response.statusCode = 413; return response.end(); } }
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ choices: [{ index: 0, message: { role: 'assistant', content: 'Synthetic DYL28 reply.' }, finish_reason: 'stop' }] }));
    });
    await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
    settings.firstRun = false; settings.main_api = 'openai';
    settings.oai_settings = { ...settings.oai_settings, chat_completion_source: 'custom',
        custom_url: `http://127.0.0.1:${provider.address().port}/v1`, custom_model: 'dyl28-loopback', stream_openai: false };
    fs.writeFileSync(config, fs.readFileSync(path.join(host, 'default/config.yaml'), 'utf8')
        .replace('enableUserAccounts: false', 'enableUserAccounts: true'), { flag: 'wx' });
    fs.mkdirSync(data);
    fs.writeFileSync(path.join(data, '.dyl27-owned'), runId, { flag: 'wx' });
    fs.mkdirSync(path.join(data, 'default-user'));
    fs.writeFileSync(path.join(data, 'default-user/settings.json'), JSON.stringify(settings), { flag: 'wx' });
    await startHost();

    first = session(); await first.login('default-user');
    await first.request('/api/users/create', { handle: otherHandle, name: 'Synthetic second user' });
    other = session(); await other.login(otherHandle);
    const cardBody = { ch_name: `Mira-${runId}`, first_mes: 'Identical synthetic greeting.', description: 'Synthetic DYL28 test character.' };
    avatarA = await first.request('/api/characters/create', cardBody);
    avatarB = await first.request('/api/characters/create', cardBody);
    const otherAvatar = await other.request('/api/characters/create', cardBody);
    const chatNameA = (await first.request('/api/characters/get', { avatar_url: avatarA })).chat;
    const chatNameB = (await first.request('/api/characters/get', { avatar_url: avatarB })).chat;
    const otherChatName = (await other.request('/api/characters/get', { avatar_url: otherAvatar })).chat;
    assert.notEqual(avatarA, avatarB);
    assert.equal(avatarA, otherAvatar);
    const aMessages = chatMessages('A-only canonical transcript.');
    const bMessages = chatMessages('B-only canonical transcript.');
    await first.request('/api/chats/save', { avatar_url: avatarA, file_name: chatNameA, chat: aMessages });
    await first.request('/api/chats/save', { avatar_url: avatarB, file_name: chatNameB, chat: bMessages });
    await other.request('/api/chats/save', { avatar_url: otherAvatar, file_name: otherChatName, chat: chatMessages('Other user transcript.') });
    let catalogA = registry('default-user');
    a = catalogA.chats.find(chat => chat.relativePath.endsWith(`/${avatarA.replace('.png', '')}/${chatNameA}.jsonl`));
    b = catalogA.chats.find(chat => chat.relativePath.endsWith(`/${avatarB.replace('.png', '')}/${chatNameB}.jsonl`));
    assert.ok(a && b);
    assert.equal(a.sourceRevision, 1);
    assert.equal(b.sourceRevision, 1);
    initialA = fs.readFileSync(chatFile('default-user', a.relativePath), 'utf8');
    const initialB = fs.readFileSync(chatFile('default-user', b.relativePath), 'utf8');
    const expectedA = initialA.split('\n').filter(Boolean).map(line => JSON.parse(line));
    const expectedB = initialB.split('\n').filter(Boolean).map(line => JSON.parse(line));
    evidence.initialMainSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    evidence.initialFixtures = { a, b, canonicalSha256: canonicalHashes() };
    checkpoint('native create/save allocates host identity and sourceRevision 1 for A and B', 'EXPERIMENTAL_HOST', {
        aResponseExpected: expectedA, bResponseExpected: expectedB,
    });

    const { chromium } = await import(process.env.SN_PLAYWRIGHT_MODULE || 'playwright');
    browser = await chromium.launch({ headless: true });
    evidence.browser = browser.version();
    firstContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); browserContexts.push(firstContext);
    await firstContext.addCookies([...first.cookies].map(([name, value]) => ({ name, value, url: base })));
    firstPage = await firstContext.newPage();
    await firstPage.goto(base); await firstPage.waitForFunction(() => window.SillyTavern?.getContext && window.dyl28);
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    assert.deepEqual((await pageState(firstPage)).messages, ['B-only canonical transcript.']);

    // A response is fetched from the real native endpoint and held after the server issued its envelope.
    let heldA = holdFirst(firstPage, '**/api/chats/get', body => body.avatar_url === avatarA);
    await heldA.install();
    await clickCard(firstPage, avatarA);
    const delayedA = await Promise.race([heldA.entered, sleep(12000).then(() => { throw new Error('A transcript response barrier timeout'); })]);
    assert.equal(delayedA.status, 200);
    assert.equal(delayedA.response.dyl28Envelope, true);
    assert.deepEqual(delayedA.response.identity, { storeId: catalogA.storeId, scopeId: a.scopeId, chatId: a.chatId });
    assert.equal(delayedA.response.sourceRevision, 1);
    assert.deepEqual(delayedA.response.messages, expectedA);
    assert.ok(delayedA.response.loadRequestId);
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    const beforeLateA = await pageState(firstPage);
    heldA.release(); await heldA.fulfilled; await heldA.remove();
    await firstPage.waitForTimeout(100);
    const afterLateA = await pageState(firstPage);
    assert.equal(afterLateA.avatar, avatarB);
    assert.deepEqual(afterLateA.messages, ['B-only canonical transcript.']);
    assert.ok(afterLateA.dom.some(text => text.includes('B-only canonical transcript.')));
    assert.equal(afterLateA.target.chatId, b.chatId);
    assert.equal(afterLateA.target.loadRequestId, beforeLateA.target.loadRequestId);
    const lateAccept = await uiApi(firstPage, 'accept-load', { clientId: delayedA.request.dyl28ClientId,
        sequence: delayedA.request.dyl28Sequence, loadRequestId: delayedA.response.loadRequestId }, 409);
    assert.equal(lateAccept.error, 'STALE_LOAD');
    assert.deepEqual(canonicalHashes(), evidence.checks[0].canonicalSha256 ?? evidence.initialFixtures.canonicalSha256);
    checkpoint('delayed native A response after B: B transcript, DOM, identity and target stay current; A load token is stale', 'NATIVE_HOST_UI', {
        request: delayedA.request, delayedEnvelope: delayedA.response, beforeLateA, afterLateA, staleAActivation: lateAccept,
    });

    // A -> B -> A with deliberately reversed native /get response order and identical A identity.
    heldA = holdFirst(firstPage, '**/api/chats/get', body => body.avatar_url === avatarA);
    await heldA.install();
    await clickCard(firstPage, avatarA);
    const oldA = await Promise.race([heldA.entered, sleep(12000).then(() => { throw new Error('old A transcript barrier timeout'); })]);
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    await clickCard(firstPage, avatarA); await waitForTarget(firstPage, avatarA, a.chatId, 1);
    const latestA = await pageState(firstPage);
    heldA.release(); await heldA.fulfilled; await heldA.remove();
    await firstPage.waitForTimeout(100);
    const afterOldA = await pageState(firstPage);
    assert.equal(oldA.response.identity.chatId, latestA.target.chatId);
    assert.notEqual(oldA.response.loadRequestId, latestA.target.loadRequestId);
    assert.equal(Object.hasOwn(oldA.request, 'sourceRevision'), false);
    assert.equal(afterOldA.target.loadRequestId, latestA.target.loadRequestId);
    assert.deepEqual(afterOldA.messages, ['A-only canonical transcript.']);
    const oldARefusal = await uiApi(firstPage, 'accept-load', { clientId: oldA.request.dyl28ClientId,
        sequence: oldA.request.dyl28Sequence, loadRequestId: oldA.response.loadRequestId }, 409);
    assert.equal(oldARefusal.error, 'STALE_LOAD');
    checkpoint('A-B-A with reordered native transcript responses: only latest A request and visit remain accepted', 'NATIVE_HOST_UI', {
        oldARequest: oldA.request, oldAEnvelope: oldA.response, latestA, afterOldA, oldARefusal,
    });

    // Hold a real activation acknowledgement, navigate with native card controls, then release it late.
    let releaseAck;
    let enterAck;
    let fulfilledAck;
    const ackGate = new Promise(resolve => { releaseAck = resolve; });
    const ackEntered = new Promise(resolve => { enterAck = resolve; });
    const ackFulfilled = new Promise(resolve => { fulfilledAck = resolve; });
    let heldAck;
    const ackHandler = async route => {
        if (!heldAck) {
            const response = await route.fetch();
            const text = await response.text();
            heldAck = { response: JSON.parse(text), status: response.status() };
            enterAck(heldAck);
            await ackGate;
            await route.fulfill({ response, body: text });
            fulfilledAck();
        } else await route.continue();
    };
    await firstPage.route('**/api/dyl27/accept-load', ackHandler);
    const lateAckLoad = firstPage.evaluate(async () => (await import('/script.js')).getChat());
    await Promise.race([ackEntered, sleep(12000).then(() => { throw new Error('activation acknowledgement barrier timeout'); })]);
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    await clickCard(firstPage, avatarA); await waitForTarget(firstPage, avatarA, a.chatId, 1);
    const newestA = await pageState(firstPage);
    releaseAck(); await ackFulfilled; await lateAckLoad;
    await firstPage.unroute('**/api/dyl27/accept-load', ackHandler);
    const afterLateAck = await pageState(firstPage);
    assert.equal(afterLateAck.target.loadRequestId, newestA.target.loadRequestId);
    assert.notEqual(heldAck.response.loadRequestId, newestA.target.loadRequestId);
    assert.deepEqual(afterLateAck.messages, ['A-only canonical transcript.']);
    checkpoint('held native activation acknowledgement across A-B-A is discarded without restoring its visit', 'NATIVE_HOST_UI with response barrier', {
        heldAck: heldAck.response, newestA, afterLateAck,
    });

    const staleVisit = (await pageState(firstPage)).target;
    const visualBeforeStaleWork = fs.readFileSync(visualFile('default-user', a.chatId), 'utf8');
    await uiApi(firstPage, 'barrier', { clientId: staleVisit.clientId, action: 'arm' });
    const staleWrite = uiApi(firstPage, 'cas', { target: staleVisit, expectedRevision: 0, record: { background: 'forest' } }, 409);
    const barrierDeadline = Date.now() + 5000;
    while (!(await uiApi(firstPage, 'barrier', { clientId: staleVisit.clientId, action: 'status' })).entered) {
        assert.ok(Date.now() < barrierDeadline); await sleep(10);
    }
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    await clickCard(firstPage, avatarA); await waitForTarget(firstPage, avatarA, a.chatId, 1);
    await uiApi(firstPage, 'barrier', { clientId: staleVisit.clientId, action: 'release' });
    const staleWriteResult = await staleWrite;
    assert.deepEqual(staleWriteResult, { error: 'STALE_VIEW' });
    assert.equal(fs.readFileSync(visualFile('default-user', a.chatId), 'utf8'), visualBeforeStaleWork);
    checkpoint('old A visual CAS held across native A-B-A is refused against the old visit', 'NATIVE_HOST_UI + EXPERIMENTAL_HOST', {
        staleVisit, latestVisit: (await pageState(firstPage)).target, staleWrite: staleWriteResult,
    });

    // A second authenticated browser edits A through the native editor while client one has a held older snapshot.
    secondContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); browserContexts.push(secondContext);
    const secondLogin = session(); await secondLogin.login('default-user');
    await secondContext.addCookies([...secondLogin.cookies].map(([name, value]) => ({ name, value, url: base })));
    secondPage = await secondContext.newPage();
    await secondPage.goto(base); await secondPage.waitForFunction(() => window.SillyTavern?.getContext && window.dyl28);
    await clickCard(secondPage, avatarA); await waitForTarget(secondPage, avatarA, a.chatId, 1);
    const oldTarget2 = await pageState(secondPage);
    assert.equal(oldTarget2.target.sourceRevision, 1);

    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    const pendingSource = holdFirst(firstPage, '**/api/chats/get', body => body.avatar_url === avatarA);
    await pendingSource.install(); await clickCard(firstPage, avatarA);
    const oldSource = await Promise.race([pendingSource.entered, sleep(12000).then(() => { throw new Error('source-change transcript barrier timeout'); })]);
    assert.equal(oldSource.response.sourceRevision, 1);
    const editNode = secondPage.locator('#chat > .mes').last();
    await editNode.locator('.mes_edit').click();
    await editNode.locator('.edit_textarea').fill('A edited by authenticated client two.');
    await editNode.locator('.mes_edit_done').click();
    const saveDeadline = Date.now() + 10000;
    while (Date.now() < saveDeadline) {
        catalogA = registry('default-user'); a = catalogA.chats.find(chat => chat.chatId === a.chatId);
        const text = fs.readFileSync(chatFile('default-user', a.relativePath), 'utf8');
        if (a.sourceRevision === 2 && text.includes('A edited by authenticated client two.')) break;
        await sleep(25);
    }
    catalogA = registry('default-user'); a = catalogA.chats.find(chat => chat.chatId === a.chatId);
    assert.equal(a.sourceRevision, 2);
    const revisedCanonical = fs.readFileSync(chatFile('default-user', a.relativePath), 'utf8');
    assert.match(revisedCanonical, /A edited by authenticated client two\./);
    const freshSource = holdFirst(firstPage, '**/api/chats/get', body => body.avatar_url === avatarA);
    await freshSource.install();
    pendingSource.release(); await pendingSource.fulfilled; await pendingSource.remove();
    const currentSource = await Promise.race([freshSource.entered, sleep(12000).then(() => { throw new Error('fresh source retry barrier timeout'); })]);
    assert.equal(currentSource.response.sourceRevision, 2);
    assert.notEqual(currentSource.response.loadRequestId, oldSource.response.loadRequestId);
    const beforeFreshApply = await pageState(firstPage);
    assert.equal(beforeFreshApply.target, null);
    assert.equal(beforeFreshApply.messages.includes('A-only canonical transcript.'), false);
    assert.equal(beforeFreshApply.dom.some(text => text.includes('A-only canonical transcript.')), false);
    freshSource.release(); await freshSource.fulfilled; await freshSource.remove();
    await waitForTarget(firstPage, avatarA, a.chatId, 2);
    const staleSourceView = await pageState(firstPage);
    assert.equal(staleSourceView.avatar, avatarA);
    assert.equal(staleSourceView.target.sourceRevision, 2);
    assert.ok(staleSourceView.messages.includes('A edited by authenticated client two.'));
    assert.equal(staleSourceView.messages.includes('A-only canonical transcript.'), false);
    assert.ok(staleSourceView.history.some(entry => entry.refused === 'SOURCE_REVISION_MISMATCH'));
    assert.equal(registry('default-user').chats.find(chat => chat.chatId === a.chatId).sourceRevision, 2);
    const visualBeforeStaleSourceWrite = fs.readFileSync(visualFile('default-user', a.chatId), 'utf8');
    const staleSourceCas = await uiApi(secondPage, 'cas', { target: oldTarget2.target, expectedRevision: 0,
        record: { background: 'forest' } }, 409);
    assert.equal(staleSourceCas.error, 'SOURCE_REVISION_MISMATCH');
    assert.equal(fs.readFileSync(visualFile('default-user', a.chatId), 'utf8'), visualBeforeStaleSourceWrite);
    checkpoint('canonical edit during pending load: old revision 1 is not committed, a fresh revision 2 load is activated', 'NATIVE_HOST_UI + EXPERIMENTAL_HOST', {
        oldEnvelope: oldSource.response, currentSourceRevision: a.sourceRevision,
        oldCanonicalSha256: hash(Buffer.from(initialA)), newCanonicalSha256: hash(Buffer.from(revisedCanonical)),
        beforeFreshApply, freshEnvelope: currentSource.response, nativeEditorState: await pageState(secondPage), staleSourceView, staleSourceCas,
    });

    // Both independent authenticated clients load the same revised identity; source revision and visual CAS stay separate.
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    await clickCard(firstPage, avatarA); await waitForTarget(firstPage, avatarA, a.chatId, 2);
    await clickCard(secondPage, avatarB); await waitForTarget(secondPage, avatarB, b.chatId, 1);
    await clickCard(secondPage, avatarA); await waitForTarget(secondPage, avatarA, a.chatId, 2);
    const target1 = (await pageState(firstPage)).target;
    const target2 = (await pageState(secondPage)).target;
    assert.equal(target1.chatId, target2.chatId);
    assert.equal(target1.sourceRevision, target2.sourceRevision);
    assert.notEqual(target1.viewToken, target2.viewToken);
    const visualBefore = fs.readFileSync(visualFile('default-user', a.chatId), 'utf8');
    const arm1 = await uiApi(firstPage, 'barrier', { clientId: target1.clientId, action: 'arm' });
    const arm2 = await uiApi(secondPage, 'barrier', { clientId: target2.clientId, action: 'arm' });
    assert.deepEqual(arm1, { entered: false }); assert.deepEqual(arm2, { entered: false });
    const cas1 = uiApi(firstPage, 'cas', { target: target1, expectedRevision: 0, record: { background: 'forest' } }, 200);
    const cas2 = uiApi(secondPage, 'cas', { target: target2, expectedRevision: 0, record: { background: 'tavern' } }, 409);
    for (const [page, target] of [[firstPage, target1], [secondPage, target2]]) {
        const end = Date.now() + 5000;
        while (!(await uiApi(page, 'barrier', { clientId: target.clientId, action: 'status' })).entered) {
            assert.ok(Date.now() < end, 'both authenticated clients reached the host CAS barrier'); await sleep(10);
        }
    }
    await uiApi(firstPage, 'barrier', { clientId: target1.clientId, action: 'release' });
    const committed = await cas1;
    assert.equal(committed.revision, 1);
    await uiApi(secondPage, 'barrier', { clientId: target2.clientId, action: 'release' });
    const conflict = await cas2;
    assert.deepEqual(conflict, { error: 'STALE_REVISION' });
    const visualAfter = fs.readFileSync(visualFile('default-user', a.chatId), 'utf8');
    assert.notEqual(visualAfter, visualBefore);
    assert.equal(hash(Buffer.from(revisedCanonical)), hash(fs.readFileSync(chatFile('default-user', a.relativePath))));
    checkpoint('two authenticated clients on one host process: source revision 2 shared, visit tokens distinct, one visual CAS wins without canonical mutation', 'EXPERIMENTAL_HOST + NATIVE_HOST_UI', {
        target1, target2, committedVisualRecord: visualAfter, loser: conflict,
        canonicalSha256BeforeAndAfter: hash(Buffer.from(revisedCanonical)),
    });

    // An expired load ticket must not commit its snapshot: a concurrent native edit supersedes the
    // screen, the acknowledgement is held past the ticket's TTL, and the refusal keeps the stale view.
    const staleScreen = await pageState(firstPage);
    assert.equal(staleScreen.target.sourceRevision, 2);
    assert.ok(staleScreen.messages.includes('A edited by authenticated client two.'));
    const expiredEditNode = secondPage.locator('#chat > .mes').last();
    await expiredEditNode.locator('.mes_edit').click();
    await expiredEditNode.locator('.edit_textarea').fill('A expired-ticket edit by client two.');
    await expiredEditNode.locator('.mes_edit_done').click();
    const expiredSaveDeadline = Date.now() + 10000;
    while (Date.now() < expiredSaveDeadline) {
        catalogA = registry('default-user'); a = catalogA.chats.find(chat => chat.chatId === a.chatId);
        const expiredText = fs.readFileSync(chatFile('default-user', a.relativePath), 'utf8');
        if (a.sourceRevision === 3 && expiredText.includes('A expired-ticket edit by client two.')) break;
        await sleep(25);
    }
    catalogA = registry('default-user'); a = catalogA.chats.find(chat => chat.chatId === a.chatId);
    assert.equal(a.sourceRevision, 3);
    let expiredAckHeld = false;
    let expiredAckRelease;
    let expiredAckEnter;
    const expiredAckGate = new Promise(resolve => { expiredAckRelease = resolve; });
    const expiredAckEntered = new Promise(resolve => { expiredAckEnter = resolve; });
    const expiredAckHandler = async route => {
        if (!expiredAckHeld) {
            expiredAckHeld = true;
            expiredAckEnter();
            await expiredAckGate;
            await route.continue();
        } else await route.continue();
    };
    await firstPage.route('**/api/dyl27/accept-load', expiredAckHandler);
    const expiredChatLoad = firstPage.evaluate(async () => (await import('/script.js')).getChat());
    await Promise.race([expiredAckEntered, sleep(12000).then(() => { throw new Error('expired-ticket acceptance barrier timeout'); })]);
    assert.deepEqual((await pageState(firstPage)).messages, staleScreen.messages);
    await sleep(30100);
    expiredAckRelease();
    await expiredChatLoad;
    await firstPage.unroute('**/api/dyl27/accept-load', expiredAckHandler);
    const refusedState = await pageState(firstPage);
    assert.equal(refusedState.avatar, avatarA);
    assert.equal(refusedState.target, null);
    assert.deepEqual(refusedState.messages, staleScreen.messages);
    assert.ok(refusedState.dom.some(text => text.includes('A edited by authenticated client two.')));
    assert.equal(refusedState.dom.some(text => text.includes('A expired-ticket edit by client two.')), false);
    assert.ok(refusedState.history.some(entry => entry.refused === 'EXPIRED_LOAD'));
    await firstPage.waitForFunction(() => [...document.querySelectorAll('.toast')].some(node => node.textContent.includes('This chat could not be activated. Reopen it to read the latest version.')));
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    await clickCard(firstPage, avatarA); await waitForTarget(firstPage, avatarA, a.chatId, 3);
    const reopened = await pageState(firstPage);
    assert.equal(reopened.target.sourceRevision, 3);
    assert.ok(reopened.messages.includes('A expired-ticket edit by client two.'));
    checkpoint('expired load ticket after a concurrent native edit: the revision 3 snapshot is not committed, the screen keeps revision 2, and the reopen activates revision 3', 'NATIVE_HOST_UI with request barrier + EXPERIMENTAL_HOST', {
        staleScreen, refusedState, reopened, sourceAfter: fs.readFileSync(chatFile('default-user', a.relativePath), 'utf8'),
    });

    // A real authenticated transcript response is followed by the pinned host's non-JSON auth refusal.
    const refusedMarker = 'A expired-ticket edit by client two.';
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    let refusedEnvelope;
    let cookiesBeforeRefusal;
    const expireAuthAfterSnapshot = async route => {
        const response = await route.fetch();
        const text = await response.text();
        refusedEnvelope = { status: response.status(), body: JSON.parse(text) };
        cookiesBeforeRefusal = await firstContext.cookies();
        await firstContext.clearCookies();
        await route.fulfill({ response, body: text });
    };
    await firstPage.route('**/api/chats/get', expireAuthAfterSnapshot);
    const refusalHistoryIndex = await firstPage.evaluate(() => window.dyl28.history.length);
    const refusalResponsePromise = firstPage.waitForResponse(response => response.url().endsWith('/api/dyl27/accept-load'));
    await clickCard(firstPage, avatarA);
    const refusalResponse = await Promise.race([refusalResponsePromise,
        sleep(12000).then(() => { throw new Error('non-JSON 403 activation response timeout'); })]);
    const refusalBody = await refusalResponse.text();
    assert.equal(refusedEnvelope.status, 200);
    assert.equal(refusedEnvelope.body.dyl28Envelope, true);
    assert.equal(refusedEnvelope.body.identity.chatId, a.chatId);
    assert.equal(refusedEnvelope.body.sourceRevision, 3);
    assert.ok(refusedEnvelope.body.messages.some(message => message.mes === refusedMarker));
    assert.equal(refusalResponse.status(), 403);
    assert.doesNotMatch(refusalResponse.headers()['content-type'] ?? '', /application\/json/i);
    assert.throws(() => JSON.parse(refusalBody));
    await firstPage.waitForFunction(index => window.dyl28?.history.length > index, refusalHistoryIndex, { timeout: 10000 });
    await firstPage.unroute('**/api/chats/get', expireAuthAfterSnapshot);
    await firstContext.addCookies(cookiesBeforeRefusal);
    const nonJsonRefusedState = await pageState(firstPage);
    assert.equal(nonJsonRefusedState.target, null);
    assert.ok(nonJsonRefusedState.history.some(entry => entry.refused === 'HTTP_403'),
        `the non-JSON 403 must be classified as a refusal: ${JSON.stringify(nonJsonRefusedState)}`);
    assert.equal(nonJsonRefusedState.messages.includes(refusedMarker), false,
        `the refused snapshot must not enter canonical chat state: ${JSON.stringify(nonJsonRefusedState)}`);
    assert.equal(nonJsonRefusedState.dom.some(text => text.includes(refusedMarker)), false,
        `the refused snapshot must not render: ${JSON.stringify(nonJsonRefusedState)}`);
    checkpoint('identity-bearing transcript followed by the pinned host non-JSON HTTP 403 refusal: the snapshot is not committed and target stays null',
        'NATIVE_HOST_UI with real auth middleware refusal after response barrier', { refusedEnvelope, refusalStatus: refusalResponse.status(),
            refusalContentType: refusalResponse.headers()['content-type'], refusalBody, refusedState: nonJsonRefusedState });

    // An activation transport failure does not stop the native conversation from loading or replying.
    // Start from B so the timed A load's own revision 3 text is what must appear on screen afterwards.
    await clickCard(firstPage, avatarB); await waitForTarget(firstPage, avatarB, b.chatId, 1);
    let timeoutInjected = false;
    const timeoutHandler = async route => {
        if (!timeoutInjected) { timeoutInjected = true; await route.abort('timedout'); }
        else await route.continue();
    };
    await firstPage.route('**/api/dyl27/accept-load', timeoutHandler);
    const sourceRevisionBeforeTimeout = a.sourceRevision;
    const beforeTimeoutRead = await fs.promises.readFile(chatFile('default-user', a.relativePath), 'utf8');
    const timeoutEpochBefore = await firstPage.evaluate(() => window.dyl28.epoch);
    await clickCard(firstPage, avatarA);
    await firstPage.waitForFunction(({ avatar }) => {
        const context = SillyTavern.getContext();
        return context.characters[context.characterId]?.avatar === avatar
            && window.dyl28?.target === null
            && context.chat.map(message => message.mes).includes('A expired-ticket edit by client two.');
    }, { avatar: avatarA }, { timeout: 15000 });
    await firstPage.unroute('**/api/dyl27/accept-load', timeoutHandler);
    const timeoutState = await pageState(firstPage);
    assert.equal(timeoutInjected, true);
    assert.equal(timeoutState.avatar, avatarA);
    assert.equal(timeoutState.target, null);
    assert.ok(timeoutState.messages.includes('A expired-ticket edit by client two.'));
    assert.ok(timeoutState.dom.some(text => text.includes('A expired-ticket edit by client two.')));
    assert.equal(timeoutState.messages.includes('B-only canonical transcript.'), false);
    const transportEntries = timeoutState.history.filter(entry => entry.transportFailure);
    assert.equal(transportEntries.length, 1, `exactly one transport-failure history entry: ${JSON.stringify(timeoutState.history)}`);
    assert.ok(transportEntries[0].epoch > timeoutEpochBefore,
        `timed load epoch ${transportEntries[0].epoch} is after the armed epoch ${timeoutEpochBefore}`);
    await firstPage.locator('#API-status-top').click(); await firstPage.locator('#api_button_openai').click();
    await firstPage.locator('#send_but').waitFor({ state: 'visible' }); await firstPage.locator('#API-status-top').click();
    await firstPage.locator('#send_textarea').fill('Native reading remains usable after activation timeout.');
    await firstPage.locator('#send_but').click();
    await firstPage.waitForFunction(() => SillyTavern.getContext().chat.at(-1)?.mes === 'Synthetic DYL28 reply.');
    const nativeSaveDeadline = Date.now() + 10000;
    let nativeSavedText = '';
    while (Date.now() < nativeSaveDeadline) {
        catalogA = registry('default-user'); a = catalogA.chats.find(chat => chat.chatId === a.chatId);
        nativeSavedText = fs.readFileSync(chatFile('default-user', a.relativePath), 'utf8');
        if (a.sourceRevision > sourceRevisionBeforeTimeout
            && nativeSavedText.includes('Native reading remains usable after activation timeout.')
            && nativeSavedText.includes('Synthetic DYL28 reply.')) break;
        await sleep(25);
    }
    assert.ok(a.sourceRevision > sourceRevisionBeforeTimeout);
    assert.match(nativeSavedText, /Native reading remains usable after activation timeout\./);
    assert.match(nativeSavedText, /Synthetic DYL28 reply\./);
    checkpoint('activation acknowledgement timeout leaves visuals unavailable while native text and ordinary reply/save continue', 'NATIVE_HOST_UI with response abort + deterministic loopback responder', {
        timeoutState, sourceBefore: beforeTimeoutRead, sourceAfter: fs.readFileSync(chatFile('default-user', a.relativePath), 'utf8'),
    });

    await firstPage.evaluate(async () => {
        const host = await import('/script.js');
        await host.closeCurrentChat();
        await host.newAssistantChat({ temporary: true });
    });
    const temporaryState = await pageState(firstPage);
    assert.equal(temporaryState.target, null);
    checkpoint('native Temporary Chat transition revokes the persisted-chat visit', 'NATIVE_HOST_UI via host functions', { temporaryState });

    // Missing chat remains an ordinary empty native load and cannot receive visual identity.
    const missingClient = (await first.api('client')).clientId;
    const missing = await first.request('/api/chats/get', { avatar_url: avatarA, file_name: `Missing-${runId}`,
        dyl28ClientId: missingClient, dyl28Sequence: 1 });
    assert.equal(missing.dyl28Envelope, true);
    assert.equal(missing.identity, null);
    assert.deepEqual(missing.messages, []);
    assert.ok(missing.loadRequestId);
    checkpoint('missing chat returns an empty native snapshot with no visual identity', 'EXPERIMENTAL_HOST', { missing });

    // A rename preserves identity/source revision but supersedes a pending load token for its old locator.
    const renameChat = chatMessages('Rename race transcript.');
    await first.request('/api/chats/save', { avatar_url: avatarA, file_name: 'RenameTarget', chat: renameChat });
    catalogA = registry('default-user');
    const renameFixture = catalogA.chats.find(chat => chat.relativePath.endsWith('/RenameTarget.jsonl'));
    const renameClient = (await first.api('client')).clientId;
    const renameEnvelope = await first.request('/api/chats/get', { avatar_url: avatarA, file_name: 'RenameTarget',
        dyl28ClientId: renameClient, dyl28Sequence: 1 });
    await first.request('/api/chats/rename', { avatar_url: avatarA, original_file: 'RenameTarget.jsonl',
        renamed_file: 'RenamedDuringLoad.jsonl', is_group: false });
    await apiError(first, 'accept-load', { clientId: renameClient, sequence: 1, loadRequestId: renameEnvelope.loadRequestId }, 'STALE_LOAD');
    const renamedFixture = registry('default-user').chats.find(chat => chat.chatId === renameFixture.chatId);
    assert.equal(renamedFixture.sourceRevision, renameFixture.sourceRevision);
    assert.equal(renamedFixture.relativePath.endsWith('/RenamedDuringLoad.jsonl'), true);
    checkpoint('native rename during pending load preserves chat ID/revision but refuses old locator-bound activation', 'EXPERIMENTAL_HOST', {
        beforeRename: renameFixture, loadEnvelope: renameEnvelope, afterRename: renamedFixture,
    });

    // Wrong-store and stale-session checks use actual authenticated SillyTavern sessions.
    const otherClientId = (await other.api('client')).clientId;
    const otherEnvelope = await other.request('/api/chats/get', { avatar_url: otherAvatar, file_name: otherChatName,
        dyl28ClientId: otherClientId, dyl28Sequence: 1 });
    const otherTarget = await other.api('accept-load', { clientId: otherClientId, sequence: 1, loadRequestId: otherEnvelope.loadRequestId });
    assert.notEqual(otherTarget.storeId, registry('default-user').storeId);
    await apiError(first, 'cas', { target: otherTarget, expectedRevision: 0, record: { background: 'forest' } }, 'WRONG_STORE', 403);
    const staleSession = session(); await staleSession.login('default-user');
    await apiError(staleSession, 'accept-load', { clientId: otherClientId, sequence: 1,
        loadRequestId: otherEnvelope.loadRequestId }, 'INVALID_CLIENT', 403);
    checkpoint('different authenticated store and cookie session cannot reuse another client’s load identity', 'EXPERIMENTAL_HOST', {
        otherEnvelope, otherTarget, primaryStoreId: registry('default-user').storeId,
    });

    const expiringClient = (await first.api('client')).clientId;
    const expiringEnvelope = await first.request('/api/chats/get', { avatar_url: avatarA, file_name: chatNameA,
        dyl28ClientId: expiringClient, dyl28Sequence: 1 });
    assert.equal(expiringEnvelope.dyl28Envelope, true);
    await sleep(30100);
    const expiredLoad = await first.api('accept-load', { clientId: expiringClient, sequence: 1,
        loadRequestId: expiringEnvelope.loadRequestId }, 409);
    assert.deepEqual(expiredLoad, { error: 'EXPIRED_LOAD' });
    checkpoint('load request expires after the host TTL and cannot grant a visit', 'EXPERIMENTAL_HOST', {
        request: { clientId: expiringClient, sequence: 1, loadRequestId: expiringEnvelope.loadRequestId },
        expirationResponse: expiredLoad,
    });

    // Close native pages before restart; the registry and visual bytes must recover, while in-memory clients do not.
    const persistedA = registry('default-user').chats.find(chat => chat.chatId === a.chatId);
    const persistedVisual = fs.readFileSync(visualFile('default-user', a.chatId), 'utf8');
    const staleClientId = target1.clientId;
    await Promise.all(browserContexts.map(context => context.close())); browserContexts = [];
    firstPage = undefined; secondPage = undefined;
    await stopHost(); await startHost();
    const afterRestart = session(); await afterRestart.login('default-user');
    await apiError(afterRestart, 'target', { clientId: staleClientId }, 'INVALID_CLIENT', 403);
    assert.equal(registry('default-user').chats.find(chat => chat.chatId === persistedA.chatId).sourceRevision, persistedA.sourceRevision);
    assert.equal(fs.readFileSync(visualFile('default-user', a.chatId), 'utf8'), persistedVisual);
    browserContexts = [];
    firstContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); browserContexts.push(firstContext);
    await firstContext.addCookies([...afterRestart.cookies].map(([name, value]) => ({ name, value, url: base })));
    firstPage = await firstContext.newPage(); await firstPage.goto(base);
    await firstPage.waitForFunction(() => window.SillyTavern?.getContext && window.dyl28);
    await clickCard(firstPage, avatarA); await waitForTarget(firstPage, avatarA, a.chatId, persistedA.sourceRevision);
    assert.equal((await pageState(firstPage)).messages.at(-1), 'Synthetic DYL28 reply.');
    assert.equal((await pageState(firstPage)).target.sourceRevision, persistedA.sourceRevision);
    checkpoint('host restart recovers identity, source revision and visual record; old in-memory visit is rejected and a new visit is issued', 'EXPERIMENTAL_HOST + NATIVE_HOST_UI', {
        persistedChat: persistedA, persistedVisualRecord: persistedVisual, recovered: await pageState(firstPage),
    });
    if (process.env.SN_DYL42 === '1') {
        const { run } = await import('../dyl42/writer-campaign.mjs');
        await run({ first: afterRestart, otherHandle, session, firstPage, registry, userRoot, visualFile, chatFile,
            checkpoint, evidence, runId, avatarA, avatarB, chatMessages, pageState, uiApi, startHost, stopHost,
            browser, baseUrl: () => base, hash });
    }
    evidence.result = 'PASS_WITH_BOUNDED_CHARACTER_CHAT_LIMITS';
    evidence.recommendation = 'REVISE';
} catch (error) {
    failed = error;
    evidence.result = 'FAIL';
    evidence.failure = error.stack;
    evidence.hostLogs = logs;
    console.error(error);
} finally {
    for (const context of browserContexts) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (provider) await new Promise(resolve => provider.close(resolve));
    await stopHost();
    if (fs.existsSync(data)) assert.equal(fs.readFileSync(path.join(data, '.dyl27-owned'), 'utf8'), runId);
    fs.rmSync(owned, { recursive: true, force: true });
    evidence.cleanup = {
        ownedRootRemoved: !fs.existsSync(owned), hostStopped: child ? child.exitCode !== null || child.signalCode !== null : true,
        sourceCheckoutPresent: fs.existsSync(source), sourceStatusUnchanged: fs.existsSync(source)
            && execFileSync('git', ['-C', source, 'status', '--porcelain'], { encoding: 'utf8' }) === sourceStatus,
    };
    assert.ok(evidence.cleanup.sourceStatusUnchanged);
    assert.ok(evidence.cleanup.ownedRootRemoved && evidence.cleanup.hostStopped && evidence.cleanup.sourceCheckoutPresent);
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(evidence, null, 2) + '\n');
}
if (failed) throw failed;
console.log(`Completed ${evidence.checks.length} isolated DYL-28 checks; evidence saved in ${output}`);
