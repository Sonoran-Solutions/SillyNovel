import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createProjectScene } from '../src/project-scene.mjs';
import { createHostAdapter } from '../src/host-adapter.mjs';
import { createReaderSourceModel } from '../src/reader-source-model.mjs';
import { createDirectorRuntime, SETTLE_MS, ABANDON_MS } from '../src/director-controller.mjs';

const bytes = await readFile(new URL('./fixtures/m12-stage/mira-a-joy.png', import.meta.url));
const png = () => new Blob([bytes], { type: 'image/png' });
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise(resolve => setImmediate(resolve)); };

function clock() {
    let now = 0, next = 0;
    const timers = new Map();
    return {
        setTimer: (fn, ms) => { timers.set(++next, { at: now + ms, fn }); return next; },
        clearTimer: id => timers.delete(id),
        async advance(ms) {
            now += ms;
            for (const [id, timer] of [...timers].sort((a, b) => a[1].at - b[1].at)) if (timer.at <= now) { timers.delete(id); timer.fn(); await flush(); }
            await flush();
        },
        pending: () => timers.size,
    };
}
async function setup(t, { enabled = true, ceiling, request, group = false, online = 'Valid', inspect, importArt = true } = {}) {
    const previous = globalThis.Image, view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    globalThis.Image = class { naturalWidth = view.getUint32(16); naturalHeight = view.getUint32(20); decode() { return Promise.resolve(); } };
    t.after(() => { globalThis.Image = previous; });
    const context = { chatId: 'A', characterId: 1, chat: [{ name: 'You', is_user: true, mes: 'Hello there' }, { name: 'Mira', mes: 'Mira smiles at the lantern.' }] };
    if (group) { context.groupId = 'G'; context.characterId = null; context.groups = [{ id: 'G', name: 'Council', chat_id: 'A', members: ['a.png', 'b.png', 'c.png', 'd.png'] }]; }
    const host = createHostAdapter(() => context), reader = createReaderSourceModel(), time = clock();
    reader.activate(host.readHistory(), host.readChatIdentity());
    const refresh = () => reader.apply({ history: host.readHistory(), owner: host.readChatIdentity() });
    const calls = [];
    let settings = { sessionCeiling: ceiling };
    const respond = request ?? (messages => new Promise(resolve => calls.push({ messages, resolve })));
    const runtime = createDirectorRuntime({ request: respond, inspect: inspect ?? (() => ({ ok: true, missing: [], online })), read: () => settings, write: value => { settings = value; }, setTimer: time.setTimer, clearTimer: time.clearTimer });
    const actions = { getSnapshot: reader.getSnapshot, getSceneEvidence: (fresh = true) => ({ snapshot: fresh ? refresh() : reader.getSnapshot(), history: reader.getHistory() }), director: runtime };
    const actor = randomUUID(), other = randomUUID(), sprite = randomUUID(), background = randomUUID();
    const record = { schemaVersion: 2, projectId: randomUUID(), name: 'Director', revision: 3, catalog: [{ assetId: sprite, kind: 'sprite', actorId: actor, label: 'Base' }, { assetId: background, kind: 'background', actorId: null, label: 'Forest' }],
        scene: { backgroundAssetId: background, backgroundLocked: true, actors: [{ actorId: actor, name: 'Mira', present: true, slot: 'left', spriteAssetId: sprite, locks: { presence: true, outfit: true, slot: true } }, { actorId: other, name: 'Mira', present: true, slot: 'right', spriteAssetId: null, locks: { presence: true, outfit: false, slot: true } }] } };
    let saved = null, uploads = 0;
    const client = { asset: async () => ({ blob: png(), hash: 'a'.repeat(64) }), upload: async () => { uploads++; }, save: async (id, body) => { saved = body; return { projectId: id, revision: body.expectedRevision + 1 }; } };
    const attach = async () => { const model = await createProjectScene(record, client, actions, () => {}, () => true); t.after(() => model.dispose()); return model; };
    if (enabled) runtime.setEnabled(record.projectId, true);
    const model = await attach();
    const art = importArt ? await model.importExpression(png(), actor, 'Happy') : null;
    // Native lifecycle as the adapter would observe it; streamed order by default, as the pinned host does.
    const complete = async ({ text = 'Mira laughs by the lantern.', type = 'normal', plain = false, target = model, settle = true, name = 'Mira', sync = true, start = true } = {}) => {
        if (start) reader.apply({ type: 'generationStarted', generationType: type, dryRun: false });
        if (type === 'normal') context.chat.push({ name, mes: text }); else context.chat.at(-1).mes = text;
        const index = context.chat.length - 1;
        const received = () => [{ type: 'messageReceived', source: host.readMessageAt(index), history: host.readHistory() }, { type: 'characterMessageRendered', source: host.readMessageAt(index), history: host.readHistory() }];
        const ended = { type: 'generationEnded', history: host.readHistory() };
        for (const step of plain ? [...received(), ended] : [ended, ...received()]) reader.apply(step);
        if (sync) await target.sync(false);
        if (settle) await time.advance(SETTLE_MS);
    };
    const proposal = (expressionId, extra = {}) => { const head = host.readHistory().at(-1); return JSON.stringify({ schemaVersion: 1, updates: [{ op: 'setCharacter', characterKey: actor, expressionId, evidence: { sourceMessageKey: head.sourceKey, excerpt: 'Mira' }, ...extra }] }); };
    const answer = async (index, value) => {
        calls[index].resolve(value);
        await flush();
        for (let i = 0; i < 200 && /in progress/.test(model.directorStatus().notice); i++) await new Promise(resolve => setTimeout(resolve, 5));
    };
    const expression = (target = model) => target.get().scene.view.cast[0].expression;
    return { context, host, reader, time, calls, runtime, actions, record, actor, other, sprite, background, model, art, attach, complete, proposal, answer, expression, refresh, get settings() { return settings; }, get saved() { return saved; }, get uploads() { return uploads; } };
}
const ok = text => ({ ok: true, text });
const status = x => x.model.directorStatus();
const until = async check => { for (let i = 0; i < 500; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 5)); } throw Error('Condition not reached'); };
// Settles request index and waits for the waiting target's request; answer() would spin on its in-progress notice.
const resolveUntil = async (x, index, value, calls) => { x.calls[index].resolve(value); await until(() => x.calls.length >= calls); };

test('off by default and per project; enabling writes only host director settings and is not retroactive', async t => {
    const x = await setup(t, { enabled: false });
    await x.complete();
    assert.equal(x.calls.length, 0);
    assert.equal(x.time.pending(), 0);
    assert.equal(status(x).enabled, false);
    x.model.setDirectorEnabled(true);
    assert.deepEqual(Object.keys(x.settings.enabledProjects), [x.record.projectId]);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 0, 'the reply before enabling is not requested');
    await x.complete({ text: 'Mira waves.' });
    assert.equal(x.calls.length, 1);
    const stranger = createDirectorRuntime({ request: async () => {}, inspect: () => ({ ok: true }), read: () => x.settings, write() {} });
    assert.equal(stranger.enabled(randomUUID()), false);
    assert.equal(stranger.enabled('__proto__'), false);
    x.model.setDirectorEnabled(false);
    assert.equal(x.settings.enabledProjects[x.record.projectId], undefined);
});
test('project schema and saves never carry the director; ceiling is host settings with a bounded default', async t => {
    const x = await setup(t);
    await x.model.save();
    assert.doesNotMatch(JSON.stringify(x.saved), /director|enabledProjects|sessionCeiling/);
    for (const [value, expected] of [[undefined, 40], [0, 40], [201, 40], [2.5, 40], ['7', 40], [1, 1], [200, 200]]) {
        const runtime = createDirectorRuntime({ request: async () => {}, inspect: () => ({ ok: true }), read: () => ({ sessionCeiling: value }), write() {} });
        assert.equal(runtime.ceiling(), expected, String(value));
    }
});
test('no connection, missing capability and no artwork send nothing and spend nothing', async t => {
    const offline = await setup(t, { online: 'no_connection' });
    await offline.complete();
    assert.equal(offline.calls.length, 0);
    assert.match(status(offline).notice, /no connection selected/);
    assert.equal(status(offline).count, 0);
    const missing = await setup(t, { inspect: () => ({ ok: false, missing: ['generateRawData'], online: null }) });
    await missing.complete();
    assert.equal(missing.calls.length, 0);
    assert.equal(status(missing).available, false);
    const bare = await setup(t, { importArt: false });
    await bare.complete();
    assert.equal(bare.calls.length, 0);
    assert.match(status(bare).notice, /no expression artwork imported/);
    assert.equal(status(bare).count, 0);
});
test('E15: nothing before two seconds; a superseded head is never requested and spends nothing', async t => {
    const x = await setup(t, { group: true });
    await x.complete({ settle: false });
    await x.time.advance(SETTLE_MS - 1);
    assert.equal(x.calls.length, 0);
    await x.complete({ settle: false, name: 'Mira', text: 'Second Mira speaks.' });
    await x.complete({ settle: false, name: 'Rowan', text: 'Rowan speaks.' });
    await x.complete({ settle: false, name: 'Sage', text: 'Sage speaks.' });
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 1, 'four-member turn, one request');
    assert.match(x.calls[0].messages[1].content, /Sage speaks/);
    assert.equal(status(x).count, 1);
    const started = await setup(t);
    await started.complete({ settle: false });
    started.reader.apply({ type: 'generationStarted', generationType: 'continue', dryRun: false });
    await started.model.sync(false);
    await started.time.advance(SETTLE_MS);
    assert.equal(started.calls.length, 0);
    assert.equal(status(started).count, 0);
    const edited = await setup(t);
    await edited.complete({ settle: false });
    edited.context.chat.at(-1).mes = 'Edited during the interval.';
    await edited.time.advance(SETTLE_MS);
    assert.equal(edited.calls.length, 0);
    assert.equal(status(edited).count, 0);
});
test('completion provenance: stop, quiet and an end with no reply never trigger; plain and streamed orders do', async t => {
    for (const plain of [false, true]) {
        const x = await setup(t);
        await x.complete({ plain });
        assert.equal(x.calls.length, 1, String(plain));
    }
    const x = await setup(t);
    x.reader.apply({ type: 'generationStarted', generationType: 'normal', dryRun: false });
    x.context.chat.push({ name: 'Mira', mes: 'Cut off' });
    const index = x.context.chat.length - 1;
    for (const step of [{ type: 'generationEnded' }, { type: 'generationStopped' }, { type: 'messageReceived', source: x.host.readMessageAt(index), history: x.host.readHistory() }]) x.reader.apply(step);
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    x.reader.apply({ type: 'generationStarted', generationType: 'quiet', dryRun: false });
    x.reader.apply({ type: 'generationEnded' });
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    x.reader.apply({ type: 'generationStarted', generationType: 'normal', dryRun: false });
    x.reader.apply({ type: 'generationEnded' });
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 0);
});
test('valid proposal applies to the memory-only journal; canonical chat, project and revisions untouched', async t => {
    const x = await setup(t), chat = () => JSON.stringify(x.context.chat);
    await x.complete();
    const before = chat(), revision = x.model.get().scene.revision;
    assert.equal(x.calls.length, 1);
    const [system, user] = x.calls[0].messages;
    assert.equal(system.role, 'system');
    assert.match(user.content, /Mira laughs by the lantern/);
    assert.match(user.content, /Happy/);
    await x.answer(0, ok(x.proposal(x.art)));
    assert.equal(x.expression().id, x.art);
    assert.equal(x.expression().origin, 'automatic');
    assert.match(status(x).notice, /applied 1 temporary expression/);
    assert.equal(chat(), before);
    assert.equal(x.model.status().dirty, false);
    assert.equal(x.model.status().revision, 3);
    assert.equal(x.model.get().scene.revision, revision);
    await x.model.save();
    assert.deepEqual(x.saved.scene, x.record.scene);
    assert.doesNotMatch(JSON.stringify(x.saved), /temporary-expression|prefixSha256|session-source/);
});
test('E3-A: layout updates recorded, suggestion shown as text, expression for an unapplied outfit falls, nothing saved', async t => {
    const x = await setup(t);
    await x.complete();
    const key = x.host.readHistory().at(-1).sourceKey, evidence = { sourceMessageKey: key, excerpt: 'Mira' };
    await x.answer(0, ok(JSON.stringify({ schemaVersion: 1, updates: [{ op: 'setLocation', backgroundId: x.background, evidence }, { op: 'setCharacter', characterKey: x.other, present: false, evidence }, { op: 'suggestLocation', label: 'Harbor', evidence }] })));
    assert.equal(x.expression(), null);
    const notice = status(x).notice;
    assert.match(notice, /2 layout changes not applied/);
    assert.match(notice, /Suggested location: Harbor/);
    assert.match(notice, /no change/);
    assert.equal(x.model.status().dirty, false);
    assert.equal(x.model.get().scene.view.cast[1].present, true);
});
test('T50: a manual set or clear at the source outranks; a later manual choice replaces an automatic one', async t => {
    const x = await setup(t);
    const manual = await x.model.importExpression(png(), x.actor, 'Manual');
    await x.complete();
    await x.model.dispatch({ type: 'setExpression', characterKey: x.actor, assetId: manual });
    // A manual choice at the head is not a stale result: the source and scene did not move.
    await x.answer(0, ok(x.proposal(x.art)));
    assert.equal(x.expression().id, manual);
    assert.match(status(x).notice, /1 kept your manual choice/);
    const y = await setup(t);
    await y.complete();
    await y.model.dispatch({ type: 'clearExpression', characterKey: y.actor });
    await y.answer(0, ok(y.proposal(y.art)));
    assert.equal(y.expression(), null);
    const z = await setup(t);
    await z.complete();
    await z.answer(0, ok(z.proposal(z.art)));
    await z.model.importExpression(png(), z.actor, 'Later');
    const later = z.model.get().assets.filter(a => a.kind === 'expression').at(-1).id;
    await z.model.dispatch({ type: 'setExpression', characterKey: z.actor, assetId: later });
    assert.equal(z.expression().id, later);
    assert.equal(z.expression().origin, 'manual');
    await z.model.dispatch({ type: 'clearExpression', characterKey: z.actor });
    assert.equal(z.expression(), null);
});
for (const [name, change] of Object.entries({
    'chat switch': x => { x.context.chatId = 'B'; x.context.chat = [{ name: 'Mira', mes: 'Other chat' }]; },
    'A to B to A': x => { const saved = x.context.chat; x.context.chatId = 'B'; x.context.chat = [{ name: 'Mira', mes: 'Other chat' }]; x.refresh(); x.context.chatId = 'A'; x.context.chat = saved; x.refresh(); },
    swipe: x => { x.context.chat.at(-1).swipe_id = 1; x.context.chat.at(-1).mes = 'A different variant'; },
    edit: x => { x.context.chat.at(-1).mes = 'Edited after the request.'; },
    'older edit': x => { x.context.chat[0].mes = 'Edited earlier message.'; },
    'continue start': x => { x.reader.apply({ type: 'generationStarted', generationType: 'continue', dryRun: false }); },
    navigation: x => { x.refresh(); x.reader.navigate(-1); },
    'manual layout': x => x.model.dispatch({ type: 'clearOutfit', characterKey: x.actor }),
    disable: x => x.model.setDirectorEnabled(false),
    detach: x => x.model.dispose(),
})) test('stale result dropped after ' + name + ': no journal write, no failure counted', async t => {
    const x = await setup(t);
    await x.complete();
    const proposal = x.proposal(x.art);
    await change(x);
    await x.answer(0, ok(proposal));
    assert.equal(x.expression(), null);
    assert.equal(x.runtime.session(x.record.projectId).consecutive, 0);
    // F4: a started reply generation names its own outcome; the rest stay cancelled.
    if (name !== 'detach' && name !== 'disable') assert.equal(status(x).notice, name === 'continue start' ? 'Director request superseded by your reply' : 'Director request cancelled.');
    assert.equal(x.runtime.inFlight, false);
    assert.equal(JSON.stringify(x.record.scene).includes('temporary-expression'), false);
});
test('stale wins over garbage: a malformed reply after a switch is not a failure', async t => {
    const x = await setup(t);
    await x.complete();
    x.context.chat.at(-1).mes = 'Edited.';
    await x.answer(0, ok('not json'));
    assert.equal(x.runtime.session(x.record.projectId).consecutive, 0);
    assert.equal(status(x).notice, 'Director request cancelled.');
});
test('E7: a failure skips and counts; three consecutive pause; success resets; toggle resumes with the same counter', async t => {
    const x = await setup(t);
    const fail = async (result, text) => { await x.complete({ text }); await x.answer(x.calls.length - 1, result); };
    for (const [result, code, i] of [[ok('nope'), 'NOT_SINGLE_JSON', 1], [{ ok: false, code: 'TRANSPORT_ERROR' }, 'TRANSPORT_ERROR', 2]]) {
        await fail(result, 'Reply ' + i);
        assert.match(status(x).notice, new RegExp('skipped this reply: ' + code));
        assert.equal(status(x).paused, null);
    }
    await x.complete({ text: 'Mira again.' });
    await x.answer(2, ok(x.proposal(x.art)));
    assert.equal(x.runtime.session(x.record.projectId).consecutive, 0, 'success resets');
    for (const [i, result] of [ok(''), ok(JSON.stringify({ schemaVersion: 2, updates: [] })), ok('x'.repeat(33000))].entries()) await fail(result, 'Later ' + i);
    assert.equal(status(x).paused, 'RESPONSE_TOO_LARGE');
    assert.match(status(x).notice, /Director paused: RESPONSE_TOO_LARGE · manual controls remain available/);
    const sent = x.calls.length;
    await x.complete({ text: 'While paused.' });
    assert.equal(x.calls.length, sent);
    const count = status(x).count;
    await x.model.dispatch({ type: 'clearExpression', characterKey: x.actor });
    x.model.setDirectorEnabled(false);
    x.model.setDirectorEnabled(true);
    assert.equal(status(x).paused, null);
    assert.equal(status(x).count, count);
    await x.complete({ text: 'Resumed.' });
    assert.equal(x.calls.length, sent + 1);
});
test('invalidating an automatic choice keeps the artwork for the next reply; manual choices keep their M1 release', async t => {
    const x = await setup(t);
    await x.complete();
    await x.answer(0, ok(x.proposal(x.art)));
    x.context.chat.at(-1).mes = 'Hand edit of the applied message.';
    await x.model.sync();
    assert.equal(x.expression(), null);
    assert.ok(x.model.get().assets.some(a => a.id === x.art), 'artwork survives');
    await x.model.dispatch({ type: 'setExpression', characterKey: x.actor, assetId: x.art });
    x.context.chat.at(-1).mes = 'Second hand edit.';
    await x.model.sync();
    assert.equal(x.model.get().assets.some(a => a.id === x.art), false, 'a manual decision still releases');
});
test('invalid and refused proposals apply nothing and never quote model text', async t => {
    const x = await setup(t);
    await x.complete();
    await x.answer(0, ok(JSON.stringify({ schemaVersion: 1, updates: [{ op: 'setCharacter', characterKey: x.actor, expressionId: x.art, evidence: { sourceMessageKey: x.host.readHistory().at(-1).sourceKey, excerpt: 'SECRET-NOT-IN-TEXT' } }] })));
    assert.equal(x.expression(), null);
    assert.match(status(x).notice, /INVALID_EVIDENCE/);
    assert.doesNotMatch(status(x).notice, /SECRET/);
    await x.complete({ text: 'Mira next.' });
    await x.answer(1, ok('https://example.com SECRET'));
    assert.doesNotMatch(status(x).notice, /SECRET|example/);
});
test('ceiling: the next completion sends nothing and pauses; survives a chat-switch detach and reopen; deliberate end resets', async t => {
    const x = await setup(t, { ceiling: 3 });
    for (let i = 0; i < 3; i++) { await x.complete({ text: 'Mira turn ' + i }); await x.answer(i, ok(x.proposal(x.art))); }
    assert.equal(status(x).count, 3);
    assert.equal(status(x).paused, 'CEILING', 'a cap hit pauses immediately');
    assert.match(status(x).notice, /applied 1 temporary expression.*session ceiling 3 reached/);
    await x.complete({ text: 'Mira turn 4' });
    assert.equal(x.calls.length, 3);
    assert.match(status(x).notice, /Director paused: session ceiling 3 reached · manual controls remain available/);
    await x.model.dispatch({ type: 'clearExpression', characterKey: x.actor });
    // Reader, composer and manual expressions keep working.
    assert.equal(x.expression(), null);
    x.model.dispose();
    const reopened = await x.attach();
    assert.equal(reopened.directorStatus().count, 3, 'a chat-switch detach and reopen is not a free reset');
    assert.equal(reopened.directorStatus().paused, 'CEILING');
    reopened.endDirectorSession();
    assert.equal(reopened.directorStatus().count, 0);
    assert.equal(reopened.directorStatus().paused, null);
});
// F2 amends T42: at most one target waits, the newest, instead of counted and never revisited.
test('T42: one in flight under rapid completions; the newest waits and fires on release; slot outlives a detach', async t => {
    const x = await setup(t);
    await x.complete({ text: 'First Mira.' });
    await x.complete({ text: 'Second Mira.' });
    await x.complete({ text: 'Third Mira.' });
    assert.equal(x.calls.length, 1);
    assert.doesNotMatch(status(x).notice, /not directed/);
    x.model.dispose();
    const reopened = await x.attach();
    await reopened.importExpression(png(), x.actor, 'Happy');
    await x.complete({ text: 'After reopen.', target: reopened });
    assert.equal(x.calls.length, 1, 'still one outstanding across attachments');
    await resolveUntil(x, 0, ok('{}'), 2);
    assert.match(x.calls[1].messages[1].content, /After reopen/, 'the second attachment fires on release; the first attachment\'s target died with it');
    assert.equal(x.runtime.session(x.record.projectId).count, 2);
});
test('one request per key: an unchanged head is never repeated; continue and swipe are new keys', async t => {
    const x = await setup(t);
    await x.complete();
    await x.answer(0, ok(x.proposal(x.art)));
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 1, 'resync does not re-request');
    x.context.chat.at(-1).mes = 'Hand edit.';
    await x.model.sync();
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 1, 'an edit is not a generation');
    await x.complete({ type: 'continue', text: 'Hand edit. And more from Mira.' });
    assert.equal(x.calls.length, 2);
    await x.answer(1, ok(x.proposal(x.art)));
    x.context.chat.at(-1).swipe_id = 1;
    await x.complete({ type: 'swipe', text: 'Mira, another variant.' });
    assert.equal(x.calls.length, 3);
});
// F2 amends E10: reading earlier waits, and returning to the head catches up once.
test('T54: reading earlier waits with one notice; return fires once; a second return issues nothing', async t => {
    const x = await setup(t);
    x.refresh();
    x.reader.navigate(-1);
    await x.complete();
    assert.equal(x.calls.length, 0);
    assert.equal(status(x).notice, '1 reply waiting: Jump to Latest to direct it');
    assert.equal(status(x).count, 0);
    await x.model.sync(false);
    assert.equal(x.calls.length, 0, 'still reading earlier');
    x.reader.jumpToLatest();
    await x.model.sync(false);
    await until(() => x.calls.length === 1);
    assert.equal(status(x).count, 1);
    await x.answer(0, ok(x.proposal(x.art)));
    x.reader.navigate(-1);
    await x.model.sync(false);
    x.reader.jumpToLatest();
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 1, 'second return');
    assert.equal(x.expression().id, x.art);
});
test('T54: a newer reply replaces the waiting one; one request, for the newest head', async t => {
    const x = await setup(t);
    x.refresh();
    x.reader.navigate(-1);
    await x.complete({ text: 'Older waiting reply.' });
    await x.complete({ text: 'Newer waiting reply.' });
    assert.match(status(x).notice, /^1 reply waiting/);
    x.reader.jumpToLatest();
    await x.model.sync(false);
    await until(() => x.calls.length === 1);
    assert.match(x.calls[0].messages[1].content, /Newer waiting reply/);
    await flush();
    assert.equal(x.calls.length, 1);
    assert.equal(status(x).count, 1);
});
test('a waiting head edited before the return is dropped from fresh evidence, and its notice goes with it', async t => {
    const x = await setup(t);
    x.refresh();
    x.reader.navigate(-1);
    await x.complete();
    x.context.chat.at(-1).mes = 'Edited while reading earlier.';
    x.reader.jumpToLatest();
    await x.model.sync();
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 0);
    assert.equal(status(x).notice, '');
    assert.equal(status(x).count, 0);
});
test('90 s abandonment discards the late result, counts one failure, issues nothing until settlement', async t => {
    const x = await setup(t);
    await x.complete();
    const proposal = x.proposal(x.art);
    await x.time.advance(ABANDON_MS - 1);
    assert.equal(x.runtime.inFlight, true);
    assert.doesNotMatch(status(x).notice, /still outstanding/);
    await x.time.advance(1);
    assert.match(status(x).notice, /Director request still outstanding · manual controls remain available/);
    assert.equal(x.runtime.session(x.record.projectId).consecutive, 1);
    await x.complete({ text: 'Mira after abandonment.' });
    assert.equal(x.calls.length, 1, 'no second request while the first is outstanding');
    // F6: the waiting target fires once after settlement; M2.2 lost it.
    await resolveUntil(x, 0, ok(proposal), 2);
    assert.equal(x.expression(), null, 'the late result is discarded');
    assert.match(x.calls[1].messages[1].content, /Mira after abandonment/);
    assert.equal(x.runtime.session(x.record.projectId).consecutive, 1, 'settlement counts nothing more');
});
test('Stop while outstanding: cancelled, not a failure, slot released', async t => {
    const x = await setup(t);
    await x.complete();
    await x.answer(0, { ok: false, code: 'ABORTED' });
    assert.equal(status(x).notice, 'Director request cancelled.');
    assert.equal(x.runtime.session(x.record.projectId).consecutive, 0);
    assert.equal(x.runtime.inFlight, false);
    assert.equal(x.expression(), null);
});
// Plan section 4.6. Composer rows belong to PR B and the manual layout row to PR C.
test('race: two completions inside the settle interval request only the later', async t => {
    const x = await setup(t);
    await x.complete({ text: 'A1 reply.', settle: false });
    await x.time.advance(SETTLE_MS - 1);
    await x.complete({ text: 'A2 reply.', settle: false });
    await x.time.advance(SETTLE_MS - 1);
    assert.equal(x.calls.length, 0, 'the interval restarts');
    await x.time.advance(1);
    assert.equal(x.calls.length, 1);
    assert.match(x.calls[0].messages[1].content, /A2 reply/);
    assert.equal(status(x).count, 1);
});
test('race: a completion during a request waits and fires after settlement; two requests, two keys', async t => {
    const x = await setup(t);
    await x.complete({ text: 'Mira A1 reply.' });
    await x.complete({ text: 'Mira A2 reply.' });
    assert.equal(x.calls.length, 1);
    assert.equal(status(x).notice.startsWith('Director request in progress'), true, 'a busy slot has no notice of its own');
    await resolveUntil(x, 0, ok('{"schemaVersion":1,"updates":[]}'), 2);
    assert.match(x.calls[1].messages[1].content, /A2 reply/);
    const state = x.runtime.session(x.record.projectId);
    assert.equal(state.ledger.size, 2);
    assert.equal(state.count, 2);
    assert.equal(state.consecutive, 0);
    await x.answer(1, ok(x.proposal(x.art)));
    assert.equal(x.expression().id, x.art, 'the second result applies to the head it was anchored on');
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 2, 'nothing further');
});
test('T53: Send while outstanding is SUPERSEDED before the result is read; not a failure, counted, never re-anchored', async t => {
    for (const late of [ok('not json'), { ok: false, code: 'TRANSPORT_ERROR' }, { ok: false, code: 'ABORTED' }]) {
        const x = await setup(t);
        await x.complete({ text: 'A1 reply.' });
        x.context.chat.push({ name: 'You', is_user: true, mes: 'Sent while outstanding.' });
        x.reader.apply({ type: 'generationStarted', generationType: 'normal', dryRun: false });
        await x.answer(0, late);
        assert.equal(status(x).notice, 'Director request superseded by your reply');
        const state = x.runtime.session(x.record.projectId);
        assert.equal(state.consecutive, 0);
        assert.equal(state.count, 1);
        assert.equal(x.context.chat.at(-1).mes, 'Sent while outstanding.', 'the user message is untouched');
        await x.time.advance(SETTLE_MS);
        assert.equal(x.calls.length, 1, 'the superseded head is not retried');
    }
    const y = await setup(t);
    await y.complete({ text: 'A1 reply.' });
    const proposal = y.proposal(y.art);
    y.context.chat.push({ name: 'You', is_user: true, mes: 'Sent.' });
    await y.complete({ text: 'A2 reply.' });
    assert.equal(y.calls.length, 1, 'A2 waits for the slot');
    await resolveUntil(y, 0, ok(proposal), 2);
    assert.equal(y.expression(), null, 'the result never applies to the old or the new head');
    assert.equal(status(y).count, 2);
    assert.match(y.calls[1].messages[1].content, /A2 reply/);
});
test('T53: another extension\'s quiet or impersonate generation while outstanding is stale but is not "your reply"', async t => {
    for (const generationType of ['quiet', 'impersonate']) {
        const x = await setup(t);
        await x.complete();
        x.reader.apply({ type: 'generationStarted', generationType, dryRun: false });
        await x.answer(0, ok('not json'));
        assert.equal(status(x).notice, 'Director request cancelled.', generationType);
        assert.equal(x.runtime.session(x.record.projectId).consecutive, 0);
    }
});
test('T51/F5: a reply that completes inside a running generation waits; replaced on completion, dropped on an end with no reply', async t => {
    const x = await setup(t);
    await x.complete({ text: 'First head.', settle: false });
    x.reader.apply({ type: 'generationStarted', generationType: 'normal', dryRun: false });
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS * 3);
    assert.equal(x.calls.length, 0, 'no request while the reader reports a generation');
    assert.equal(status(x).count, 0);
    await x.complete({ text: 'Replacing head.', start: false, settle: false });
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 1);
    assert.match(x.calls[0].messages[1].content, /Replacing head/);
    assert.equal(status(x).count, 1, 'the superseded head spent nothing');
    for (const [type, ends] of [['normal', [{ type: 'generationEnded' }]], ['quiet', [{ type: 'generationEnded' }]], ['impersonate', [{ type: 'generationEnded' }]], ['normal', [{ type: 'generationEnded' }, { type: 'generationStopped' }]]]) {
        const y = await setup(t);
        await y.complete({ settle: false });
        y.reader.apply({ type: 'generationStarted', generationType: type, dryRun: false });
        await y.model.sync(false);
        await y.time.advance(SETTLE_MS);
        assert.equal(y.calls.length, 0, type);
        for (const step of ends) y.reader.apply(step);
        await y.model.sync(false);
        await y.time.advance(SETTLE_MS);
        assert.equal(y.calls.length, 0, 'dropped: ' + type);
        assert.equal(status(y).count, 0);
    }
});
test('race: quiet generation starts and ends before settle; nothing requested or counted', async t => {
    const x = await setup(t);
    await x.complete({ settle: false });
    x.reader.apply({ type: 'generationStarted', generationType: 'quiet', dryRun: false });
    x.reader.apply({ type: 'generationEnded' });
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 0);
    assert.equal(status(x).count, 0);
});
test('race: four-member group turn with the streaming gate observed between members; one request after the last', async t => {
    const x = await setup(t, { group: true });
    for (const name of ['Mira', 'Rowan', 'Sage', 'Wren']) {
        await x.complete({ name, text: name + ' speaks.', settle: false });
        x.reader.apply({ type: 'generationStarted', generationType: 'normal', dryRun: false });
        await x.model.sync(false);
        await x.time.advance(SETTLE_MS);
        assert.equal(x.calls.length, 0, name + ': the next member is generating');
        await x.complete({ name, text: name + ' adds a line.', start: false, settle: false });
    }
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 1);
    assert.match(x.calls[0].messages[1].content, /Wren adds a line/);
    assert.equal(status(x).count, 1);
});
const leaveAndReturn = x => { const saved = x.context.chat; x.context.chatId = 'B'; x.context.chat = [{ name: 'Mira', mes: 'Other chat' }]; x.refresh(); x.context.chatId = 'A'; x.context.chat = saved; x.refresh(); };
test('A → B → A: a target pending in A dies on detach; reopen issues nothing; a new completion fires normally', async t => {
    const x = await setup(t);
    x.refresh();
    x.reader.navigate(-1);
    await x.complete();
    assert.match(status(x).notice, /^1 reply waiting/);
    x.model.dispose();
    leaveAndReturn(x);
    const reopened = await x.attach();
    await reopened.importExpression(png(), x.actor, 'Happy');
    await reopened.sync();
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 0, 'nothing retroactive');
    assert.equal(reopened.directorStatus().count, 0);
    assert.equal(reopened.directorStatus().notice, '');
    await x.complete({ text: 'Second visit reply.', target: reopened });
    assert.equal(x.calls.length, 1);
    assert.match(x.calls[0].messages[1].content, /Second visit reply/);
});
test('A → B → A: a late first-visit result is dropped; the slot stays held; a second-visit completion waits, then fires once', async t => {
    const x = await setup(t);
    await x.complete({ text: 'First visit reply.' });
    const proposal = x.proposal(x.art);
    x.model.dispose();
    leaveAndReturn(x);
    const reopened = await x.attach();
    const art = await reopened.importExpression(png(), x.actor, 'Happy');
    await x.complete({ text: 'Second visit reply.', target: reopened });
    assert.equal(x.calls.length, 1, 'the page-wide slot is still held');
    assert.equal(x.runtime.inFlight, true);
    assert.equal(reopened.directorStatus().count, 1);
    await resolveUntil(x, 0, ok(proposal), 2);
    assert.equal(x.expression(reopened), null, 'first-visit result never applied');
    assert.equal(x.runtime.session(x.record.projectId).consecutive, 0);
    assert.match(x.calls[1].messages[1].content, /Second visit reply/);
    await x.answer(1, ok(x.proposal(art)));
    await reopened.sync();
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 2, 'once');
});
test('T55: abandonment at 90 s with a target pending; one failure, late result discarded, fires once; three abandonments pause', async t => {
    const x = await setup(t), state = x.runtime.session(x.record.projectId);
    await x.complete({ text: 'Round 0' });
    for (const round of [1, 2]) {
        await x.time.advance(ABANDON_MS);
        assert.equal(state.consecutive, round, 'one failure at abandonment');
        await x.complete({ text: 'Round ' + round });
        assert.equal(x.calls.length, round, 'held until settlement');
        await resolveUntil(x, round - 1, ok('late garbage'), round + 1);
        assert.equal(state.consecutive, round, 'the late result counts nothing more');
        assert.match(x.calls[round].messages[1].content, new RegExp('Round ' + round));
        await flush();
        assert.equal(x.calls.length, round + 1, 'once');
    }
    await x.complete({ text: 'Cleared by the pause' });
    await x.time.advance(ABANDON_MS);
    assert.equal(status(x).paused, 'ABANDONED');
    assert.equal(state.consecutive, 3);
    x.calls[2].resolve(ok('late garbage'));
    await flush();
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 3, 'the pause cleared the target');
    assert.equal(x.runtime.inFlight, false);
});
test('race: a pause with a target pending clears it; toggle resumes with the counter; no retroactive request', async t => {
    const x = await setup(t);
    for (const i of [0, 1]) { await x.complete({ text: 'Fail ' + i }); await x.answer(i, ok('nope')); }
    await x.complete({ text: 'Third request.' });
    await x.complete({ text: 'Waiting target.' });
    assert.equal(x.calls.length, 3);
    await x.time.advance(ABANDON_MS);
    assert.equal(status(x).paused, 'ABANDONED');
    x.calls[2].resolve(ok('late'));
    await flush();
    const count = status(x).count;
    x.model.setDirectorEnabled(false);
    x.model.setDirectorEnabled(true);
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 3, 'no replay after resume');
    assert.equal(status(x).count, count);
    await x.complete({ text: 'After resume.' });
    assert.equal(x.calls.length, 4);
});
test('race: ceiling reached with a target pending; last result handled, pause at once, target cleared', async t => {
    const x = await setup(t, { ceiling: 1 });
    await x.complete({ text: 'Only permitted.' });
    await x.complete({ text: 'Over the ceiling.' });
    assert.equal(status(x).paused, null, 'the last permitted result still has its chance');
    await x.answer(0, ok('{}'));
    assert.equal(status(x).paused, 'CEILING');
    assert.match(status(x).notice, /session ceiling 1 reached/);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 1);
    assert.equal(status(x).count, 1);
});
test('disable drops a waiting target; re-enabling is not a completion', async t => {
    const x = await setup(t);
    x.refresh();
    x.reader.navigate(-1);
    await x.complete();
    x.model.setDirectorEnabled(false);
    assert.equal(x.time.pending(), 0);
    x.model.setDirectorEnabled(true);
    x.reader.jumpToLatest();
    await x.model.sync(false);
    await x.time.advance(SETTLE_MS);
    assert.equal(x.calls.length, 0);
});
test('adapter: exact E2/E8 arguments, copies, one extract call, classified errors, never throws', async () => {
    const calls = [];
    const context = { mainApi: 'openai', onlineStatus: 'Valid', generateRawData: async args => { calls.push(args); args.prompt[0].content = 'mutated'; return { raw: true }; }, extractMessageFromData: (data, api) => JSON.stringify([data, api]) };
    const adapter = createHostAdapter(() => context), messages = [{ role: 'system', name: '', content: 'S' }, { role: 'user', name: '', content: 'U' }];
    assert.deepEqual(await adapter.requestDirectorText(messages), { ok: true, text: '[{"raw":true},"openai"]' });
    assert.equal(messages[0].content, 'S', 'host mutation never reaches the caller');
    assert.deepEqual(Object.keys(calls[0]).sort(), ['api', 'instructOverride', 'jsonSchema', 'prefill', 'prompt', 'quietToLoud', 'responseLength', 'systemPrompt']);
    assert.deepEqual({ ...calls[0], prompt: null }, { prompt: null, api: null, instructOverride: false, quietToLoud: false, systemPrompt: '', responseLength: null, prefill: '', jsonSchema: null });
    context.generateRawData = async () => { throw new Error('Cancelled by stop event'); };
    assert.deepEqual(await adapter.requestDirectorText(messages), { ok: false, code: 'ABORTED' });
    context.generateRawData = async () => { throw new Error('Internal Server Error'); };
    assert.deepEqual(await adapter.requestDirectorText(messages), { ok: false, code: 'TRANSPORT_ERROR' });
    context.generateRawData = async () => { throw { error: true }; };
    assert.deepEqual(await adapter.requestDirectorText(messages), { ok: false, code: 'TRANSPORT_ERROR' });
    context.onlineStatus = 'no_connection';
    assert.deepEqual(await adapter.requestDirectorText(messages), { ok: false, code: 'HOST_REFUSED' });
    context.onlineStatus = 'Valid';
    delete context.extractMessageFromData;
    assert.deepEqual(await adapter.requestDirectorText(messages), { ok: false, code: 'HOST_REFUSED' });
    assert.equal(adapter.inspectCapabilities().director.ok, false);
    assert.deepEqual(adapter.inspectDirector().missing, ['extractMessageFromData']);
});

// Same controller over real HTTP bytes on the deterministic loopback; the native campaign covers the real host path.
let endpoint, base;
before(async () => {
    endpoint = spawn(process.execPath, [new URL('./fixtures/m2-director-endpoint.mjs', import.meta.url).pathname], { env: { ...process.env, SN_ENDPOINT_PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'] });
    base = await new Promise((resolve, reject) => {
        endpoint.once('exit', reject);
        endpoint.stdout.on('data', part => { const found = /listening on (\d+)/.exec(String(part)); if (found) resolve('http://127.0.0.1:' + found[1]); });
    });
    endpoint.removeAllListeners('exit');
});
after(() => { endpoint.kill('SIGKILL'); });
const control = async body => (await fetch(base + '/control', { method: 'POST', body: JSON.stringify(body) })).json();
const log = async () => (await fetch(base + '/log')).json();
function loopback(stops) {
    const context = { mainApi: 'openai', onlineStatus: 'Valid', extractMessageFromData: data => data?.choices?.[0]?.message?.content ?? '',
        generateRawData: async ({ prompt }) => {
            const abort = new AbortController();
            stops.push(abort);
            let response;
            try { response = await fetch(base + '/v1/chat/completions', { method: 'POST', signal: abort.signal, body: JSON.stringify({ messages: prompt, stream: false }) }); } catch (error) { if (abort.signal.aborted) throw new Error('Cancelled by stop event'); throw error; }
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        } };
    return createHostAdapter(() => context).requestDirectorText;
}
async function wired(t, options) {
    await control({ reset: true });
    const stops = [], request = loopback(stops);
    let done = 0;
    const x = await setup(t, { ...options, request: async messages => { try { return await request(messages); } finally { done++; } } });
    const settled = async n => { await until(() => done >= n); await flush(); };
    return { ...x, stops, settled };
}
test('loopback: valid proposal over HTTP applies; the wire carries only the assembled messages', async t => {
    const x = await wired(t);
    x.context.chat.at(-1).mes = 'Say {{persona}} and <USER> and {{input}}.';
    await x.model.sync();
    await control({ script: [{ content: '```json\n' + 'PLACEHOLDER' + '\n```' }] });
    await control({ reset: true });
    await x.complete({ text: 'Mira grins at {{persona}} <USER> <GROUP>.', settle: false });
    await control({ script: [{ content: '```json\n' + x.proposal(x.art) + '\n```' }] });
    await x.time.advance(SETTLE_MS);
    await x.settled(1);
    assert.equal(x.expression().id, x.art);
    const [entry] = await log();
    assert.equal(entry.director, true);
    assert.deepEqual(entry.body.messages.map(({ role, name }) => [role, name]), [['system', ''], ['user', '']]);
    const wire = JSON.stringify(entry.body);
    assert.doesNotMatch(wire, /\{\{|<USER>|<GROUP>/);
    assert.match(wire, /\{ \{persona\} \} < USER> < GROUP>/);
});
for (const [name, step, code] of [['malformed reply', { content: 'I think she is happy.' }, 'NOT_SINGLE_JSON'], ['HTTP 500', { status: 500 }, 'TRANSPORT_ERROR'], ['empty reply', { content: '' }, 'EMPTY_RESPONSE'], ['oversized reply', { content: '{"a":"' + 'x'.repeat(33000) + '"}' }, 'RESPONSE_TOO_LARGE']]) test('loopback: ' + name + ' skips with ' + code, async t => {
    const x = await wired(t);
    await control({ script: [step] });
    await x.complete();
    await x.settled(1);
    assert.match(status(x).notice, new RegExp(code));
    assert.equal(x.expression(), null);
});
test('loopback: three consecutive failures pause; locked outfit makes no difference to an expression', async t => {
    const x = await wired(t);
    assert.equal(x.model.get().scene.view.cast[0].locks.outfit, true);
    await control({ script: [{ content: 'a' }, { content: 'b' }, { content: 'c' }] });
    for (let i = 1; i <= 3; i++) { await x.complete({ text: 'Mira ' + i }); await x.settled(i); }
    assert.equal(status(x).paused, 'NOT_SINGLE_JSON');
    await x.complete({ text: 'Mira 4' });
    assert.equal((await log()).length, 3);
});
test('loopback: held request then Stop aborts on the wire; ceiling hit sends nothing further', async t => {
    const x = await wired(t, { ceiling: 1 });
    await control({ script: [{ hold: true, content: '{}' }] });
    await x.complete();
    await until(async () => (await log()).length === 1);
    assert.equal(x.runtime.inFlight, true);
    x.stops[0].abort();
    await x.settled(1);
    assert.match(status(x).notice, /^Director request cancelled\./);
    await until(async () => (await log())[0].aborted);
    await x.complete({ text: 'Mira more.' });
    assert.equal((await log()).length, 1);
    assert.match(status(x).notice, /session ceiling 1 reached/);
});
test('loopback: held result after a chat switch is dropped; 90 s abandonment discards a late reply', async t => {
    const x = await wired(t);
    await x.complete({ settle: false });
    await control({ script: [{ hold: true, content: x.proposal(x.art) }] });
    await x.time.advance(SETTLE_MS);
    await until(async () => (await log()).length === 1);
    x.context.chatId = 'B';
    x.context.chat = [{ name: 'Mira', mes: 'Other' }];
    await control({ release: true });
    await x.settled(1);
    assert.equal(x.expression(), null);
    const y = await wired(t);
    await y.complete({ settle: false });
    await control({ script: [{ hold: true, content: y.proposal(y.art) }] });
    await y.time.advance(SETTLE_MS);
    await until(async () => (await log()).length === 1);
    await y.time.advance(ABANDON_MS);
    assert.match(status(y).notice, /still outstanding/);
    await control({ release: true });
    await y.settled(1);
    assert.equal(y.expression(), null);
});
test('loopback: held request then Send is SUPERSEDED on the wire; a held request then a completion issues one later request', async t => {
    const x = await wired(t);
    await x.complete({ text: 'First head.', settle: false });
    await control({ script: [{ hold: true, content: x.proposal(x.art) }] });
    await x.time.advance(SETTLE_MS);
    await until(async () => (await log()).length === 1);
    await x.complete({ text: 'Second head.' });
    assert.equal((await log()).length, 1, 'one outstanding');
    await control({ release: true });
    await until(async () => (await log()).length === 2);
    assert.equal(status(x).count, 2);
    assert.equal(x.runtime.session(x.record.projectId).consecutive, 0);
    assert.equal(x.expression(), null);
    await x.settled(2);
});
test('loopback: abandonment, late reply, and the pending target fires once', async t => {
    const x = await wired(t);
    await x.complete({ text: 'First head.', settle: false });
    await control({ script: [{ hold: true, content: 'late garbage' }] });
    await x.time.advance(SETTLE_MS);
    await until(async () => (await log()).length === 1);
    await x.time.advance(ABANDON_MS);
    await x.complete({ text: 'Waiting head.' });
    await control({ release: true });
    await until(async () => (await log()).length === 2);
    await x.settled(2);
    assert.equal(status(x).count, 2);
    assert.equal(x.expression(), null);
    assert.equal((await log()).length, 2);
});
