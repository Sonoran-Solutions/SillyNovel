import assert from 'node:assert/strict';
import test from 'node:test';
import { createReaderSourceModel } from '../src/reader-source-model.mjs';
import { createHostAdapter } from '../src/host-adapter.mjs';

function message(sourceKey, text, index, options = {}) {
    return {
        sourceKey,
        identity: { chatId: options.chatId ?? 'chat-a', scope: 'character', durable: false },
        index,
        messageCount: options.messageCount ?? 3,
        author: { kind: options.kind ?? 'character', label: options.author ?? 'Mira' },
        text,
        swipeId: options.swipeId ?? 0,
    };
}

function modelWith(...messages) {
    const model = createReaderSourceModel();
    model.activate(messages, messages[0]?.identity ?? null);
    return model;
}

test('head and reader cursor are independent; Next at latest stays pinned until Jump to Latest', () => {
    const model = modelWith(message('a', 'first', 0), message('b', 'second', 1));
    assert.equal(model.getSnapshot().selectionMode, 'followLatest');
    assert.equal(model.getSnapshot().cursor.sourceKey, 'b');
    assert.equal(model.navigate(-1), true);
    assert.equal(model.getSnapshot().cursor.sourceKey, 'a');
    assert.equal(model.getSnapshot().selectionMode, 'pinned');
    assert.equal(model.navigate(1), true);
    assert.equal(model.getSnapshot().cursor.sourceKey, 'b');
    assert.equal(model.getSnapshot().selectionMode, 'pinned');
    assert.equal(model.navigate(1), false);

    model.apply({ type: 'messageReceived', history: [message('a', 'first', 0), message('b', 'second', 1), message('c', 'third', 2)] });
    assert.equal(model.getSnapshot().head.sourceKey, 'c');
    assert.equal(model.getSnapshot().cursor.sourceKey, 'b');
    assert.equal(model.getSnapshot().newMessageIndicator, '1');
    model.jumpToLatest();
    assert.equal(model.getSnapshot().cursor.sourceKey, 'c');
    assert.equal(model.getSnapshot().selectionMode, 'followLatest');
    assert.equal(model.getSnapshot().newMessageIndicator, null);

    model.navigate(-1);
    const expanded = [message('a', 'first', 0), message('b', 'second', 1), ...Array.from({ length: 101 }, (_, i) => message('later-' + i, 'later', i + 2))];
    model.apply({ type: 'messageReceived', history: expanded });
    assert.equal(model.getSnapshot().cursor.sourceKey, 'b');
    assert.equal(model.getSnapshot().newMessageIndicator, '99+');
});

test('edits, continuations, same-length changes and author labels revise an immutable selected source', () => {
    const longLabel = 'Mira '.repeat(40);
    const initial = message('pinned', 'same length', 0, { author: longLabel });
    const model = modelWith(initial, message('head', 'latest', 1));
    model.navigate(-1);
    const before = model.getSnapshot();
    assert.equal(before.cursor.author.label, longLabel);
    assert.ok(Object.isFrozen(before.cursor));
    assert.ok(Object.isFrozen(before.cursor.author));

    const edited = message('pinned', 'new! length', 0, { author: longLabel });
    model.apply({ type: 'messageEdited', history: [edited, message('head', 'latest', 1)] });
    const after = model.getSnapshot();
    assert.equal(after.cursor.text, 'new! length');
    assert.ok(after.cursor.revision > before.cursor.revision);
    assert.equal(before.cursor.text, 'same length', 'previous snapshots stay immutable');
    assert.equal(after.newMessageCount, 0, 'an edit is not a new message');

    model.apply({ type: 'messageReceived', history: [message('pinned', 'continuation grows', 0, { author: longLabel }), message('head', 'latest', 1)] });
    assert.equal(model.getSnapshot().cursor.sourceKey, 'pinned');
    assert.equal(model.getSnapshot().cursor.text, 'continuation grows');
    assert.equal(model.getSnapshot().newMessageCount, 0);
});

test('insertions and deletions before a pinned source re-resolve only by transient source key', () => {
    const model = modelWith(message('one', 'duplicate', 0), message('selected', 'duplicate', 1), message('three', 'tail', 2));
    model.navigate(-1);
    const inserted = [message('one', 'duplicate', 0), message('new', 'inserted', 1), message('selected', 'duplicate', 2), message('three', 'tail', 3)];
    model.apply({ type: 'chatViewChanged', history: inserted });
    assert.equal(model.getSnapshot().cursor.sourceKey, 'selected');
    assert.equal(model.getSnapshot().cursor.index, 2);

    model.apply({ type: 'messageDeleted', history: [inserted[0], inserted[1], inserted[3]] });
    assert.equal(model.getSnapshot().cursor, null);
    assert.equal(model.getSnapshot().selectionState, 'deleted');
    assert.equal(model.getSnapshot().selectionMode, 'pinned');
});

test('repeated identical text keeps distinct locators; replacing selected host object invalidates it', () => {
    const model = modelWith(message('same-1', 'again', 0), message('same-2', 'again', 1));
    model.navigate(-1);
    assert.equal(model.getSnapshot().cursor.sourceKey, 'same-1');
    model.apply({ type: 'messageEdited', history: [message('replacement', 'again', 0), message('same-2', 'again', 1)] });
    assert.equal(model.getSnapshot().cursor, null);
    assert.equal(model.getSnapshot().selectionState, 'invalidated');

    const ambiguous = modelWith(message('dup', 'same object', 0), message('dup', 'same object', 1));
    assert.equal(ambiguous.getSnapshot().head, null, 'duplicate locator values are rejected as ambiguous');

    const streamed = modelWith(message('selected-live', 'same text', 0));
    streamed.apply({ type: 'streamReconciled', messageCount: 1, sources: [message('replacement-live', 'same text', 0)] });
    assert.equal(streamed.getSnapshot().cursor, null, 'incremental reconciliation invalidates a replaced selected host object even when its text matches');
    assert.equal(streamed.getSnapshot().selectionState, 'invalidated');
});

test('swipes and group author changes update the same selected message revision', () => {
    const model = modelWith(message('reply', 'swipe A', 0, { author: 'Mira' }));
    const old = model.getSnapshot().cursor;
    model.apply({ type: 'messageSwiped', history: [message('reply', 'swipe B', 0, { author: 'Mira', swipeId: 1 })] });
    assert.equal(model.getSnapshot().cursor.text, 'swipe B');
    assert.equal(model.getSnapshot().cursor.swipeId, 1);
    assert.ok(model.getSnapshot().cursor.revision > old.revision);
    model.apply({ type: 'messageEdited', history: [message('reply', 'swipe B', 0, { author: 'Mira (Card 2)', swipeId: 1 })] });
    assert.equal(model.getSnapshot().cursor.author.label, 'Mira (Card 2)');
});

test('generation status ignores dry runs, preserves stop, and never infers success from end', () => {
    const model = modelWith(message('head', 'partial', 0));
    model.apply({ type: 'generationStarted', generationType: 'normal', dryRun: true });
    assert.equal(model.getSnapshot().generation.status, 'unknown');
    model.apply({ type: 'generationStarted', generationType: 'continue', dryRun: false });
    assert.equal(model.getSnapshot().generation.status, 'streaming');
    model.apply({ type: 'generationStopped' });
    model.apply({ type: 'generationEnded' });
    assert.equal(model.getSnapshot().generation.status, 'stopped-partial');

    model.apply({ type: 'generationStarted', generationType: 'normal', dryRun: false });
    model.apply({ type: 'generationEnded', history: [message('head', 'partial', 0)] });
    assert.equal(model.getSnapshot().generation.status, 'unknown', 'ended without verified correlation is not complete');
    assert.notEqual(model.getSnapshot().generation.status, 'complete');
});

test('chat reactivation increments the epoch for A to B to A and starts each visit at latest', () => {
    const model = modelWith(message('a1', 'A old', 0));
    const epochA = model.getSnapshot().sessionEpoch;
    model.apply({ type: 'chatChanged', owner: { chatId: 'chat-b' }, history: [message('b1', 'B', 0, { chatId: 'chat-b' })] });
    const epochB = model.getSnapshot().sessionEpoch;
    model.apply({ type: 'chatChanged', owner: { chatId: 'chat-a' }, history: [message('a1-new', 'A current', 0)] });
    assert.ok(epochB > epochA);
    assert.ok(model.getSnapshot().sessionEpoch > epochB);
    assert.equal(model.getSnapshot().cursor.text, 'A current');
    assert.equal(model.getSnapshot().selectionMode, 'followLatest');
});

test('empty history has an explicit no-source state', () => {
    const model = createReaderSourceModel();
    const snapshot = model.activate([], { chatId: 'empty-chat' });
    assert.equal(snapshot.head, null);
    assert.equal(snapshot.cursor, null);
    assert.equal(snapshot.selectionState, 'empty');
    model.jumpToLatest();
    assert.equal(model.getSnapshot().cursor, null);
    assert.equal(model.getSnapshot().selectionState, 'empty');
});

test('text scrolling has a separate snapshot contract from message-following mode', () => {
    const model = modelWith(message('one', 'one', 0), message('two', 'two', 1));
    model.navigate(-1);
    assert.equal(model.getSnapshot().selectionMode, 'pinned');
    assert.equal(model.getSnapshot().textScroll.mode, 'followBottom');
    assert.equal(model.setTextScrollMode('userControlled'), true);
    assert.equal(model.getSnapshot().textScroll.mode, 'userControlled');
    assert.equal(model.getSnapshot().selectionMode, 'pinned');
});

test('adapter snapshots keep full labels and token signals coalesce into fresh canonical reads', async () => {
    const oldRaf = globalThis.requestAnimationFrame;
    const oldCancel = globalThis.cancelAnimationFrame;
    const callbacks = new Map();
    let callbackId = 0;
    globalThis.requestAnimationFrame = (callback) => { const id = ++callbackId; callbacks.set(id, callback); return id; };
    globalThis.cancelAnimationFrame = (id) => callbacks.delete(id);
    const listeners = new Map();
    const context = {
        chat: [
            { is_user: true, name: 'Reader', mes: 'hello' },
            { name: 'Host', mes: 'before' },
        ],
        chatId: 'fixture',
        eventSource: {
            on(name, listener) { listeners.set(name, listener); },
            removeListener(name) { listeners.delete(name); },
        },
        eventTypes: Object.fromEntries(['CHAT_CHANGED','MESSAGE_RECEIVED','CHARACTER_MESSAGE_RENDERED','STREAM_TOKEN_RECEIVED','GENERATION_STARTED','GENERATION_STOPPED','GENERATION_ENDED','MESSAGE_SWIPED','MESSAGE_EDITED','MESSAGE_DELETED'].map(name => [name,name])),
        extensionSettings: {},
        saveSettingsDebounced() {},
    };
    try {
        const adapter = createHostAdapter(() => context);
        const authorLabel = 'A very long host author label '.repeat(8);
        context.chat[1].name = authorLabel;
        const initial = adapter.readHistory();
        assert.equal(initial[1].author.label, authorLabel);
        assert.ok(Object.isFrozen(initial));
        assert.ok(Object.isFrozen(initial[1].author));

        const observations = [];
        const dispose = adapter.subscribe((observation) => observations.push(observation), { getTrackedIndices: () => [0] });
        let indexedReads = 0;
        context.chat = new Proxy(context.chat, {
            get(target, key, receiver) {
                if (typeof key === 'string' && /^\d+$/.test(key)) indexedReads++;
                return Reflect.get(target, key, receiver);
            },
        });
        listeners.get('STREAM_TOKEN_RECEIVED')('must not be copied');
        listeners.get('STREAM_TOKEN_RECEIVED')('must not be copied either');
        context.chat[1].mes = 'after';
        indexedReads = 0;
        assert.equal(callbacks.size, 1, 'one canonical reconciliation is queued for the frame');
        const [id, callback] = callbacks.entries().next().value;
        callbacks.delete(id);
        callback();
        await Promise.resolve();
        assert.equal(observations.filter(item => item.type === 'streamToken').length, 2);
        const reconciled = observations.find(item => item.type === 'streamReconciled');
        assert.equal(reconciled.sources.find(item => item.index === 1).text, 'after');
        assert.equal(reconciled.messageCount, 2);
        assert.ok(indexedReads <= 2, 'token reconciliation reads only selected and latest host entries');
        assert.equal(observations[0].source, undefined, 'token event has no text authority');

        listeners.get('STREAM_TOKEN_RECEIVED')();
        const stale = callbacks.entries().next().value;
        dispose();
        callbacks.delete(stale[0]);
        stale[1]();
        await Promise.resolve();
        assert.equal(observations.filter(item => item.type === 'streamReconciled').length, 1, 'queued reconciliation is ignored after disposal');
    } finally {
        if (oldRaf) globalThis.requestAnimationFrame = oldRaf;
        else delete globalThis.requestAnimationFrame;
        if (oldCancel) globalThis.cancelAnimationFrame = oldCancel;
        else delete globalThis.cancelAnimationFrame;
    }
});
