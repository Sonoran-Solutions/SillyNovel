// M2.2 plan section 2.4 runtime probe: what the pinned host actually does. Records, never fixes.
// node tests/probes/m2-director/probe.mjs <pinned-host-root>   (SN_PLAYWRIGHT_MODULE set; port 8128 free)
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createHarness, DECOYS, PIN } from './harness.mjs';

const h = await createHarness(resolve(process.argv[2]), 'm2-probe');
const { page, native, control, requests, inventory, seedDecoys, connect, root } = h;
const findings = { host: PIN, node: process.version };
const MARKER = 'SillyNovel visual director';
const raw = (messages, extra = {}) => page.evaluate(async ({ messages, extra }) => {
    const c = SillyTavern.getContext();
    window.__events = [];
    const started = performance.now();
    try {
        const data = await c.generateRawData({ prompt: messages, api: null, instructOverride: false, quietToLoud: false, systemPrompt: '', responseLength: null, prefill: '', jsonSchema: null, ...extra });
        return { ok: true, data, text: c.extractMessageFromData(data, c.mainApi), ms: performance.now() - started, events: window.__events };
    } catch (error) {
        return { ok: false, thrown: error instanceof Error ? { name: error.name, message: error.message } : error, ms: performance.now() - started, events: window.__events };
    }
}, { messages, extra });
const pair = (user = 'data') => [{ role: 'system', name: '', content: MARKER + ' probe' }, { role: 'user', name: '', content: user }];
const lastBody = async () => (await requests()).at(-1);
const toasts = () => page.evaluate(() => [...document.querySelectorAll('#toast-container .toast')].map(e => ({ cls: e.className, text: e.textContent.slice(0, 200) })));
const clearToasts = () => page.evaluate(() => { for (const e of document.querySelectorAll('#toast-container .toast')) e.remove(); });
try {
    await page.goto(h.origin);
    await page.locator('#extensions_settings').waitFor({ state: 'attached' });
    await page.evaluate(() => {
        // Every emission, including ones SillyNovel does not subscribe to.
        const c = SillyTavern.getContext();
        window.__events = [];
        window.__log = (name, args) => window.__events.push({ name, args: args.map(a => typeof a === 'object' ? (a === null ? null : '[object]') : a) });
        for (const method of ['emit', 'emitAndWait']) {
            const original = c.eventSource[method].bind(c.eventSource);
            c.eventSource[method] = (name, ...args) => { window.__log(name, args); return original(name, ...args); };
        }
    });
    await native('/api/characters/create', { ch_name: 'Probe Card', description: DECOYS.card, first_mes: 'Probe greeting.' });
    const members = [];
    for (const [i, name] of ['Mira', 'Mira', 'Rowan', 'Sage'].entries()) members.push(await (await native('/api/characters/create', { ch_name: name, description: DECOYS.card + ' ' + i, first_mes: 'Greeting ' + i })).text());
    const group = await (await native('/api/groups/create', { name: 'Probe council', members, activation_strategy: 1 })).json();
    await page.reload();
    await page.locator('#extensions_settings').waitFor({ state: 'attached' });
    await page.evaluate(() => {
        const c = SillyTavern.getContext();
        window.__events = [];
        window.__log = (name, args) => window.__events.push({ name, args: args.map(a => typeof a === 'object' ? (a === null ? null : '[object]') : a) });
        for (const method of ['emit', 'emitAndWait']) {
            const original = c.eventSource[method].bind(c.eventSource);
            c.eventSource[method] = (name, ...args) => { window.__log(name, args); return original(name, ...args); };
        }
    });
    await page.waitForFunction(() => SillyTavern.getContext().characters.length > 0);
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
    await select('Probe Card');
    await seedDecoys();
    findings.personaActive = await page.evaluate(async () => ({ name1: SillyTavern.getContext().name1, description: (await import('/scripts/power-user.js')).power_user.persona_description }));
    await page.evaluate(() => SillyTavern.getContext().setExtensionPrompt?.('sn-probe', 'DECOY-EXTENSION-PROMPT', 0, 0));

    // Item 4: online status before any connection, and whether a request is even refused.
    findings.onlineStatus = { beforeConnect: await page.evaluate(() => SillyTavern.getContext().onlineStatus), mainApi: await page.evaluate(() => SillyTavern.getContext().mainApi) };
    await control({ reset: true });
    const unconnected = await raw(pair('before connect'));
    findings.onlineStatus.requestWhileNoConnection = { ok: unconnected.ok, endpointSaw: (await requests()).length, thrown: unconnected.thrown ?? null };
    await connect();
    findings.onlineStatus.afterConnect = await page.evaluate(() => SillyTavern.getContext().onlineStatus);
    await control({ reset: true });

    // Items 1, 3 and E8: the exact wire shape, every event, and untouched host state.
    await delay(2500);
    const before = await inventory();
    const chatBefore = await page.evaluate(() => JSON.stringify(SillyTavern.getContext().chat));
    const domBefore = await page.evaluate(() => document.querySelectorAll('#chat .mes').length);
    const maxTokensBefore = await page.evaluate(async () => (await import('/scripts/openai.js')).oai_settings.openai_max_tokens);
    const hostRequests = [];
    const capture = req => { if (req.url().endsWith('/api/backends/chat-completions/generate')) hostRequests.push(req.postDataJSON()); };
    page.on('request', capture);
    await control({ script: [{ content: '{"schemaVersion":1,"updates":[]}' }] });
    const first = await raw(pair('Exact data block.'));
    page.off('request', capture);
    const wire = await lastBody();
    findings.wire = { result: { ok: first.ok, text: first.text, dataKeys: first.data && Object.keys(first.data) }, events: first.events, endpointMessages: wire.body.messages, endpointBodyKeys: Object.keys(wire.body), stream: wire.body.stream, maxTokens: wire.body.max_tokens, hostRequestKeys: Object.keys(hostRequests[0] ?? {}), hostType: hostRequests[0]?.type, hostUserName: hostRequests[0]?.user_name, hostCharName: hostRequests[0]?.char_name, hostGroupNames: hostRequests[0]?.group_names };
    findings.wire.decoysAbsent = !JSON.stringify([wire.body, hostRequests]).match(new RegExp([DECOYS.persona, DECOYS.lore, DECOYS.card, 'DECOY-EXTENSION-PROMPT'].join('|')));
    findings.wire.personaNameInHostRequest = JSON.stringify(hostRequests).includes(DECOYS.personaName);
    findings.wire.personaNameAtEndpoint = JSON.stringify(wire.body).includes(DECOYS.personaName);
    findings.wire.cardNameAtEndpoint = JSON.stringify(wire.body).includes('Probe Card');

    // Item 2: bytes.
    await delay(2500);
    const after = await inventory();
    const changed = Object.keys({ ...before.files, ...after.files }).filter(p => JSON.stringify(before.files[p]) !== JSON.stringify(after.files[p]));
    findings.bytes = { files: Object.keys(before.files).length, changed, chatUnchanged: chatBefore === await page.evaluate(() => JSON.stringify(SillyTavern.getContext().chat)), domUnchanged: domBefore === await page.evaluate(() => document.querySelectorAll('#chat .mes').length), maxTokensUnchanged: maxTokensBefore === await page.evaluate(async () => (await import('/scripts/openai.js')).oai_settings.openai_max_tokens), maxTokens: maxTokensBefore };

    // createRawPrompt mutates its argument: does the caller's array change?
    findings.mutation = await page.evaluate(async () => {
        const { createRawPrompt } = await import('/script.js');
        const input = [{ role: 'user', name: '', content: 'x {{noop}}y' }];
        const output = createRawPrompt(input, 'openai', false, false, '', '');
        return { sameArray: output === input, inputAfter: input };
    });

    // Item 7: every trigger we can name, over the real wire.
    const triggers = ['{{persona}}', '{{input}}', '{{getvar::x}}', '{{char}}', '{{user}}', '{{{persona}}}', '{{time_UTC-10}}', '{ {persona} }', '{ {input} }', '{ {char} }', '{ {user} }', '{ { {persona} } }', '{ { {', '} } }', '{ {// comment} }', '<USER>', '<BOT>', '<CHAR>', '<GROUP>', '<CHARIFNOTGROUP>', '<user>', '<bot>', '< USER>', '<USER >', '{ {#if x} }', '\\{\\{persona\\}\\}', '\\{ \\{persona\\} \\}', '$1', '%%', '${x}'];
    await page.locator('#send_textarea').fill('COMPOSER-DRAFT');
    findings.macros = {};
    for (const trigger of triggers) {
        await control({ script: [{ content: '{}' }] });
        await raw([{ role: 'system', name: '', content: MARKER }, { role: 'user', name: '', content: '[' + trigger + ']' }]);
        const arrived = (await lastBody()).body.messages[1].content;
        findings.macros[trigger] = { arrived, unchanged: arrived === '[' + trigger + ']' };
    }
    await page.locator('#send_textarea').fill('');

    // Item 5: text-completion and instruct shapes; pure function, no text-completion loopback.
    findings.textCompletion = await page.evaluate(async () => {
        const { createRawPrompt } = await import('/script.js');
        const { power_user } = await import('/scripts/power-user.js');
        const shape = () => [{ role: 'system', name: '', content: 'INSTRUCTION' }, { role: 'user', name: '', content: 'DATA' }];
        const plain = createRawPrompt(shape(), 'textgenerationwebui', false, false, '', '');
        const saved = power_user.instruct.enabled;
        power_user.instruct.enabled = true;
        const instruct = createRawPrompt(shape(), 'textgenerationwebui', false, false, '', '');
        power_user.instruct.enabled = saved;
        return { plain, instruct, instructPreset: power_user.instruct.preset };
    });

    // E7/T44: failure shapes the adapter must classify, and whether the host itself shows a toast.
    findings.failures = {};
    for (const [name, step] of Object.entries({
        http500: { status: 500 }, http429: { status: 429, json: { error: { message: 'rate limited' } } },
        ok200error: { json: { error: { message: 'refused by provider' } } }, emptyChoices: { json: { choices: [] } }, emptyContent: { content: '' }, nullContent: { json: { choices: [{ message: { role: 'assistant', content: null } }] } },
        refusal: { json: { choices: [{ message: { role: 'assistant', content: null, refusal: 'I cannot' }, finish_reason: 'content_filter' }] } },
        contentParts: { json: { choices: [{ message: { role: 'assistant', content: [{ type: 'text', text: 'part-a' }, { type: 'text', text: 'part-b' }] } }] } },
        reasoningField: { json: { choices: [{ message: { role: 'assistant', content: 'visible', reasoning_content: 'hidden thoughts' } }] } },
    })) {
        await clearToasts();
        await control({ script: [step] });
        const outcome = await raw(pair(name));
        await delay(100);
        findings.failures[name] = { ok: outcome.ok, text: outcome.text, thrown: outcome.thrown, toasts: await toasts() };
    }
    await clearToasts();

    // Items 6 and 8: Send and Stop while a director request is outstanding.
    const startHeld = () => page.evaluate(() => {
        const c = SillyTavern.getContext();
        window.__held = c.generateRawData({ prompt: [{ role: 'system', name: '', content: 'SillyNovel visual director held' }, { role: 'user', name: '', content: 'held' }] }).then(data => ({ ok: true, text: c.extractMessageFromData(data, c.mainApi) }), error => ({ ok: false, thrown: error instanceof Error ? { name: error.name, message: error.message } : error }));
    });
    const held = () => page.evaluate(() => window.__held);
    const send = async text => { await page.locator('#send_textarea').fill(text); await page.locator('#send_but').click(); };
    const idle = () => page.waitForFunction(() => getComputedStyle(document.querySelector('#mes_stop')).display === 'none' && !document.querySelector('#send_but').classList.contains('displayNone'));
    await control({ reset: true, script: [{ hold: true, content: '{"late":true}' }] });
    await page.evaluate(() => { window.__events = []; });
    await startHeld();
    await delay(300);
    findings.sendDuring = { stopVisibleForDirectorOnly: await page.evaluate(() => getComputedStyle(document.querySelector('#mes_stop')).display !== 'none'), sendVisible: await page.locator('#send_but').isVisible() };
    const beforeSend = await page.evaluate(() => SillyTavern.getContext().chat.length);
    await send('Send during director');
    await page.waitForFunction(n => SillyTavern.getContext().chat.length === n + 2 && !SillyTavern.getContext().chat.at(-1).is_user, beforeSend);
    await idle();
    await page.waitForFunction(() => SillyTavern.getContext().chat.at(-1).mes.includes('Mira says'));
    findings.sendDuring.replyText = await page.evaluate(() => SillyTavern.getContext().chat.at(-1).mes);
    findings.sendDuring.chatGrewBy = await page.evaluate(n => SillyTavern.getContext().chat.length - n, beforeSend);
    await control({ release: true });
    findings.sendDuring.directorResult = await held();
    findings.sendDuring.events = await page.evaluate(() => window.__events.filter(e => /^(generation_|message_|character_message|stream_token)/i.test(e.name) && e.name !== 'stream_token_received'));

    await control({ reset: true, busy503: true, script: [{ hold: true, content: '{}' }] });
    await clearToasts();
    await startHeld();
    await delay(300);
    const beforeBusy = await page.evaluate(() => SillyTavern.getContext().chat.length);
    await send('Send on busy single-slot');
    await page.waitForFunction(n => SillyTavern.getContext().chat.length >= n + 1, beforeBusy);
    await delay(1500);
    findings.sendBusy503 = { chatGrewBy: await page.evaluate(n => SillyTavern.getContext().chat.length - n, beforeBusy), lastIsUser: await page.evaluate(() => SillyTavern.getContext().chat.at(-1).is_user), toasts: await toasts(), stopVisible: await page.evaluate(() => getComputedStyle(document.querySelector('#mes_stop')).display !== 'none') };
    await control({ release: true, busy503: false });
    findings.sendBusy503.directorResult = await held();
    await clearToasts();

    // Stop aborts the held request?
    await control({ reset: true, nativeDelayMs: 400, script: [{ hold: true, content: '{"late":true}' }] });
    await page.evaluate(() => { window.__events = []; });
    await startHeld();
    await delay(200);
    await send('Long streaming so Stop is visible');
    await page.locator('#mes_stop').waitFor({ state: 'visible' });
    await page.locator('#mes_stop').click();
    findings.stopDuring = { directorResult: await Promise.race([held(), delay(8000).then(() => 'STILL_PENDING_AFTER_8S')]) };
    await delay(500);
    const stopLog = await requests();
    findings.stopDuring.endpoint = stopLog.map(e => ({ director: e.director, aborted: e.aborted, replied: e.replied }));
    findings.stopDuring.events = await page.evaluate(() => window.__events.filter(e => /^(generation_|message_|character_message)/i.test(e.name)));
    findings.stopDuring.toasts = await toasts();
    await control({ release: true, nativeDelayMs: 25 });
    await idle();
    await clearToasts();

    // Stop with no user generation: host API only, no visible control.
    await control({ reset: true, script: [{ hold: true, content: '{}' }] });
    await startHeld();
    await delay(200);
    await page.evaluate(() => SillyTavern.getContext().stopGeneration?.());
    findings.stopApiOnly = { hasStopApi: await page.evaluate(() => typeof SillyTavern.getContext().stopGeneration), directorResult: await Promise.race([held(), delay(5000).then(() => 'STILL_PENDING_AFTER_5S')]) };
    await control({ release: true });

    // E4: native lifecycle sequences the completion rule has to read.
    const lifecycle = async (name, action, { group = false } = {}) => {
        await page.evaluate(() => { window.__events = []; });
        const baseline = await page.evaluate(() => SillyTavern.getContext().chat.length);
        await action();
        await delay(250);
        await idle();
        await delay(600);
        findings.lifecycle[name] = { chatDelta: await page.evaluate(n => SillyTavern.getContext().chat.length - n, baseline), events: await page.evaluate(() => window.__events.filter(e => /^(generation_|message_|character_message)/i.test(e.name))) };
    };
    findings.lifecycle = {};
    await control({ reset: true });
    for (const stream of [true, false]) {
        const suffix = stream ? ':stream' : ':plain';
        await page.evaluate(async on => { (await import('/scripts/openai.js')).oai_settings.stream_openai = on; }, stream);
        await lifecycle('normal' + suffix, () => send('Lifecycle ' + suffix));
        await lifecycle('regenerate' + suffix, () => page.locator('#option_regenerate').evaluate(e => e.click()));
        await lifecycle('continue' + suffix, () => page.locator('#option_continue').evaluate(e => e.click()));
        await lifecycle('swipe-new' + suffix, () => page.locator('#chat .last_mes .swipe_right').evaluate(e => e.click()));
        await lifecycle('swipe-back' + suffix, () => page.locator('#chat .last_mes .swipe_left').evaluate(e => e.click()));
    }
    await page.evaluate(async () => { (await import('/scripts/openai.js')).oai_settings.stream_openai = true; });
    await control({ nativeDelayMs: 400 });
    await lifecycle('stop:stream', async () => { await send('Lifecycle stop'); await page.locator('#mes_stop').waitFor({ state: 'visible' }); await delay(500); await page.locator('#mes_stop').click(); });
    await page.evaluate(async () => { (await import('/scripts/openai.js')).oai_settings.stream_openai = false; });
    await control({ script: [], nativeDelayMs: 25 });
    await lifecycle('stop:plain', async () => {
        await page.route('**/api/backends/chat-completions/generate', async route => { await delay(1500); await route.continue().catch(() => {}); });
        await send('Lifecycle plain stop');
        await page.locator('#mes_stop').waitFor({ state: 'visible' });
        await page.locator('#mes_stop').click();
    });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.evaluate(async () => { (await import('/scripts/openai.js')).oai_settings.stream_openai = true; });
    await lifecycle('dryRunOrQuiet', () => page.evaluate(async () => { await SillyTavern.getContext().generateQuietPrompt({ quietPrompt: 'probe quiet' }); }));
    // Group: four cards, duplicate names, list activation so every member replies.
    await page.evaluate(() => { window.__events = []; });
    const icon = page.locator('#rightNavDrawerIcon');
    if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
    await page.locator('#right-nav-panel.openDrawer').waitFor({ state: 'visible' });
    if (!await page.locator('#rm_button_create').isVisible()) await page.locator('#rm_button_characters').click();
    await page.locator('#rm_print_characters_block .group_select[data-grid="' + group.id + '"]').click();
    await page.waitForFunction(id => String(SillyTavern.getContext().groupId) === id, group.id);
    await icon.click();
    await page.locator('#right-nav-panel').waitFor({ state: 'hidden' });
    await lifecycle('group:stream', () => send('Group lifecycle'));
    await delay(1500);
    await idle();
    findings.lifecycle['group:stream'].events = await page.evaluate(() => window.__events.filter(e => /^(generation_|message_|character_message)/i.test(e.name)));
    findings.lifecycle['group:stream'].authors = await page.evaluate(() => SillyTavern.getContext().chat.slice(-5).map(m => [m.name, m.is_user === true]));
    findings.groupOwner = await page.evaluate(() => { const c = SillyTavern.getContext(); return { groupId: String(c.groupId), characterId: c.characterId ?? null, chatId: c.getCurrentChatId() }; });
    // Marker expansion in a group: <GROUP> lists every member, not only window speakers.
    await control({ reset: true, script: [{ content: '{}' }] });
    await raw([{ role: 'system', name: '', content: MARKER }, { role: 'user', name: '', content: '[<USER>|<BOT>|<CHAR>|<GROUP>|<CHARIFNOTGROUP>]' }]);
    findings.groupMarkers = (await lastBody()).body.messages[1].content;
    findings.pageErrors = h.pageErrors;
    findings.result = 'PASS';
} catch (error) {
    findings.result = 'FAIL';
    findings.error = error.stack;
    console.error(error);
    process.exitCode = 1;
} finally {
    await writeFile(join(root, 'probe-findings.json'), JSON.stringify(findings, null, 2));
    await h.close();
    console.log('Findings ' + join(root, 'probe-findings.json'));
}
