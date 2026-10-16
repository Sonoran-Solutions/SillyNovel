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

    const streamed = modelWith(message('selected-live', 'same text', 0), message('live-head', 'latest', 1));
    streamed.navigate(-1);
    streamed.apply({ type: 'streamReconciled', messageCount: 2, sources: [message('replacement-live', 'same text', 0), message('live-head', 'latest', 1)] });
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

test('normal generation stays unbound until a new assistant source appears', () => {
    const model = modelWith(message('user', 'prompt', 0, { kind: 'user' }));
    model.apply({ type: 'generationStarted', generationType: 'normal', dryRun: false });
    assert.equal(model.getSnapshot().generation.sourceKey, null);
    model.apply({ type: 'generationStopped' });
    model.apply({ type: 'generationEnded' });
    assert.equal(model.getSnapshot().generation.status, 'stopped-partial');
    assert.equal(model.getSnapshot().generation.sourceKey, null, 'a failed or stopped request without an assistant message has no source');

    const live = modelWith(message('prompt', 'prompt', 0, { kind: 'user' }));
    live.apply({ type: 'generationStarted', generationType: 'normal', dryRun: false });
    live.apply({
        type: 'streamReconciled',
        messageCount: 2,
        sources: [message('prompt', 'prompt', 0, { kind: 'user' }), message('assistant', 'answer', 1)],
    });
    assert.equal(live.getSnapshot().generation.sourceKey, 'assistant', 'normal generation binds only after a new assistant source is observed');

    const continuing = modelWith(message('reply', 'partial', 0));
    continuing.apply({ type: 'generationStarted', generationType: 'continue', dryRun: false });
    assert.equal(continuing.getSnapshot().generation.sourceKey, 'reply', 'continuation can bind its verified existing assistant source');
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

test('DOM-only first-message arrival and latest-object replacement reconcile through adapter and model', async () => {
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const previousObserver = Object.getOwnPropertyDescriptor(globalThis, 'MutationObserver');
    const previousRaf = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
    const previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
    const frames = new Map();
    let frameId = 0;
    let mutationCallback;
    const chatElement = {};
    class TestMutationObserver {
        constructor(callback) { mutationCallback = callback; }
        observe() {}
        disconnect() {}
    }
    globalThis.document = { getElementById: (id) => id === 'chat' ? chatElement : null };
    globalThis.MutationObserver = TestMutationObserver;
    globalThis.requestAnimationFrame = (callback) => { const id = ++frameId; frames.set(id, callback); return id; };
    globalThis.cancelAnimationFrame = (id) => frames.delete(id);

    function fixture(chat) {
        const listeners = new Map();
        const context = {
            chat,
            chatId: 'dom-only-chat',
            characterId: 1,
            eventSource: { on(name, listener) { listeners.set(name, listener); }, removeListener(name) { listeners.delete(name); } },
            eventTypes: Object.fromEntries(['CHAT_CHANGED','MESSAGE_RECEIVED','CHARACTER_MESSAGE_RENDERED','STREAM_TOKEN_RECEIVED','GENERATION_STARTED','GENERATION_STOPPED','GENERATION_ENDED','MESSAGE_SWIPED','MESSAGE_EDITED','MESSAGE_DELETED'].map(name => [name, name])),
            extensionSettings: {},
            saveSettingsDebounced() {},
        };
        return context;
    }

    async function reconcileDomChange() {
        mutationCallback([], null);
        const [id, callback] = frames.entries().next().value;
        frames.delete(id);
        callback();
        await Promise.resolve();
    }

    try {
        const emptyContext = fixture([]);
        const emptyAdapter = createHostAdapter(() => emptyContext);
        const emptyReader = createReaderSourceModel();
        emptyReader.activate(emptyAdapter.readHistory(), emptyAdapter.readChatIdentity());
        const emptyObservations = [];
        const disposeEmpty = emptyAdapter.subscribe((observation) => {
            emptyObservations.push(observation);
            emptyReader.apply(observation);
        }, { getTrackedIndices: () => emptyReader.getTrackedIndices(), getScheduleState: () => emptyReader.getSnapshot() });
        emptyContext.chat.push({ name: 'Mira', mes: 'First message arrives.' });
        await reconcileDomChange();
        assert.equal(emptyObservations.length, 1, 'the DOM observer reports the transition without a lifecycle event');
        assert.equal(emptyObservations[0].messageCount, 1);
        assert.equal(emptyReader.getSnapshot().head.text, 'First message arrives.');
        assert.equal(emptyReader.getSnapshot().cursor.sourceKey, emptyReader.getSnapshot().head.sourceKey);
        assert.equal(emptyReader.getSnapshot().selectionState, 'valid');
        disposeEmpty();

        const replacementContext = fixture([
            { is_user: true, name: 'Reader', mes: 'Prompt.' },
            { name: 'Mira', mes: 'Original latest.' },
        ]);
        const replacementAdapter = createHostAdapter(() => replacementContext);
        const replacementReader = createReaderSourceModel();
        replacementReader.activate(replacementAdapter.readHistory(), replacementAdapter.readChatIdentity());
        const originalKey = replacementReader.getSnapshot().cursor.sourceKey;
        const replacementObservations = [];
        const disposeReplacement = replacementAdapter.subscribe((observation) => {
            replacementObservations.push(observation);
            replacementReader.apply(observation);
        }, { getTrackedIndices: () => replacementReader.getTrackedIndices(), getScheduleState: () => replacementReader.getSnapshot() });
        replacementContext.chat[1] = { name: 'Mira', mes: 'Replacement latest.' };
        await reconcileDomChange();
        assert.equal(replacementObservations.length, 1, 'latest replacement is observed by DOM reconciliation only');
        assert.equal(replacementReader.getSnapshot().selectionMode, 'followLatest');
        assert.equal(replacementReader.getSnapshot().cursor.text, 'Replacement latest.');
        assert.notEqual(replacementReader.getSnapshot().cursor.sourceKey, originalKey);
        assert.equal(replacementReader.getSnapshot().cursor.sourceKey, replacementReader.getSnapshot().head.sourceKey);
        assert.equal(replacementReader.getSnapshot().selectionState, 'valid');
        disposeReplacement();
    } finally {
        for (const [key, descriptor] of [['document', previousDocument], ['MutationObserver', previousObserver], ['requestAnimationFrame', previousRaf], ['cancelAnimationFrame', previousCancel]]) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        }
    }
});

test('a refresh after ambiguous history safely skips unavailable source records', () => {
    const model = modelWith(message('duplicate', 'first', 0), message('duplicate', 'second', 1));
    assert.equal(model.getSnapshot().head, null);
    assert.doesNotThrow(() => model.apply({ type: 'chatViewChanged', history: [message('unique', 'available again', 0)] }));
    assert.equal(model.getSnapshot().head.text, 'available again');
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
            { name: 'Host', mes: 'latest' },
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
        const reader = createReaderSourceModel();
        reader.activate(initial, initial[0].identity);
        reader.navigate(-1);
        reader.navigate(-1);
        const dispose = adapter.subscribe((observation) => observations.push(observation), {
            getTrackedIndices: () => reader.getTrackedIndices(),
            getScheduleState: () => reader.getSnapshot(),
        });
        let indexedReads = 0;
        context.chat = new Proxy(context.chat, {
            get(target, key, receiver) {
                if (typeof key === 'string' && /^\d+$/.test(key)) indexedReads++;
                return Reflect.get(target, key, receiver);
            },
        });
        listeners.get('STREAM_TOKEN_RECEIVED')('must not be copied');
        listeners.get('STREAM_TOKEN_RECEIVED')('must not be copied either');
        context.chat[1].mes = 'after!';
        indexedReads = 0;
        reader.navigate(1);
        assert.equal(callbacks.size, 1, 'one canonical reconciliation is queued for the frame');
        const [id, callback] = callbacks.entries().next().value;
        callbacks.delete(id);
        callback();
        await Promise.resolve();
        assert.equal(observations.filter(item => item.type === 'streamToken').length, 2);
        const reconciled = observations.find(item => item.type === 'streamReconciled');
        assert.equal(reconciled.sources.find(item => item.index === 1).text, 'after!');
        assert.deepEqual(reconciled.sources.map(item => item.index), [2, 1], 'the queued frame samples the latest source and the newly selected source');
        assert.equal(reconciled.messageCount, 3);
        reader.apply(reconciled);
        assert.equal(reader.getSnapshot().cursor.text, 'after!', 'the newly selected same-length edit is applied without a later host event');
        assert.ok(indexedReads <= 3, 'token reconciliation reads only selected, latest, and append-tail entries');
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

test('one-message middle insertion falls back to full history and preserves the pinned source', async () => {
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
            { name: 'Host', mes: 'selected' },
            { name: 'Host', mes: 'tail' },
        ],
        chatId: 'fixture',
        eventSource: { on(name, listener) { listeners.set(name, listener); }, removeListener(name) { listeners.delete(name); } },
        eventTypes: Object.fromEntries(['CHAT_CHANGED','MESSAGE_RECEIVED','CHARACTER_MESSAGE_RENDERED','STREAM_TOKEN_RECEIVED','GENERATION_STARTED','GENERATION_STOPPED','GENERATION_ENDED','MESSAGE_SWIPED','MESSAGE_EDITED','MESSAGE_DELETED'].map(name => [name,name])),
        extensionSettings: {},
        saveSettingsDebounced() {},
    };
    try {
        const adapter = createHostAdapter(() => context);
        const initial = adapter.readHistory();
        const reader = createReaderSourceModel();
        reader.activate(initial, initial[0].identity);
        reader.navigate(-1);
        const selectedKey = reader.getSnapshot().cursor.sourceKey;
        const observations = [];
        const dispose = adapter.subscribe((observation) => {
            observations.push(observation);
            if (observation.type === 'streamReconciled') reader.apply(observation);
        }, { getTrackedIndices: () => reader.getTrackedIndices(), getScheduleState: () => reader.getSnapshot() });

        listeners.get('STREAM_TOKEN_RECEIVED')();
        context.chat.splice(1, 0, { name: 'Host', mes: 'inserted in the middle' });
        const [id, callback] = callbacks.entries().next().value;
        callbacks.delete(id);
        callback();
        await Promise.resolve();

        const reconciled = observations.find(item => item.type === 'streamReconciled');
        assert.ok(Array.isArray(reconciled.history), 'tail movement triggers full-history reconciliation');
        assert.equal(reader.getSnapshot().cursor.sourceKey, selectedKey);
        assert.equal(reader.getSnapshot().cursor.index, 2);
        assert.equal(reader.getSnapshot().head.index, 3);
        assert.equal(new Set(reconciled.history.map(item => item.sourceKey)).size, 4, 'the middle insertion does not duplicate a source locator');
        dispose();
    } finally {
        if (oldRaf) globalThis.requestAnimationFrame = oldRaf;
        else delete globalThis.requestAnimationFrame;
        if (oldCancel) globalThis.cancelAnimationFrame = oldCancel;
        else delete globalThis.cancelAnimationFrame;
    }
});

test('reader navigation skips unavailable records instead of becoming stuck at a gap', () => {
    const model = createReaderSourceModel();
    const first = { sourceKey: 'first', index: 0, text: 'first', author: { kind: 'user', label: 'You' } };
    const last = { sourceKey: 'last', index: 2, text: 'last', author: { kind: 'character', label: 'Mira' } };
    model.activate([first, null, last], null);
    assert.deepEqual(model.getSnapshot().navigation, { previous: true, next: false });
    assert.equal(model.navigate(-1), true);
    assert.equal(model.getSnapshot().cursor.sourceKey, 'first');
    assert.deepEqual(model.getSnapshot().navigation, { previous: false, next: true });
    assert.equal(model.navigate(1), true);
    assert.equal(model.getSnapshot().cursor.sourceKey, 'last');
    assert.equal(model.getSnapshot().selectionMode, 'pinned');
});

test('selection revision ignores canonical refresh and records an away-and-back navigation',()=>{
 const model=createReaderSourceModel();const owner={chatId:'selection',characterId:1,scope:'character'};
 const history=[{sourceKey:'a',text:'a',author:{kind:'user',label:'You'},index:0},{sourceKey:'b',text:'b',author:{kind:'character',label:'Mira'},index:1}];
 model.activate(history,owner);const before=model.getSnapshot().selectionRevision;model.apply({history,owner});assert.equal(model.getSnapshot().selectionRevision,before);model.navigate(-1);model.navigate(1);assert.equal(model.getSnapshot().selectionRevision,before+2);model.jumpToLatest();assert.equal(model.getSnapshot().selectionRevision,before+3);
});

test('ordered-source revision notices full/sample order and availability changes without scroll or refresh churn',()=>{
 const history=['a','b','c','d'].map((key,index)=>message(key,'Unchanged '+key,index)),model=modelWith(...history);model.navigate(-1);
 const before=model.getSnapshot();model.reconcile(history);model.setTextScrollMode('userControlled');assert.equal(model.getSnapshot().sourceOrderRevision,before.sourceOrderRevision);
 model.reconcile([history[1],history[0],history[2],history[3]]);const reordered=model.getSnapshot();
 assert.equal(reordered.sourceOrderRevision,before.sourceOrderRevision+1);assert.equal(reordered.sourceRevision,before.sourceRevision);assert.equal(reordered.selectionRevision,before.selectionRevision);assert.equal(reordered.cursor.sourceKey,'c');assert.equal(reordered.cursor.revision,before.cursor.revision);assert.equal(reordered.cursor.index,before.cursor.index);
 model.apply({sources:[message('b','Unchanged b',0),message('a','Edited a',1)],messageCount:4});assert.equal(model.getSnapshot().sourceOrderRevision,reordered.sourceOrderRevision);
 model.apply({sources:[message('a','Edited a',0),message('b','Unchanged b',1)],messageCount:4});assert.equal(model.getSnapshot().sourceOrderRevision,reordered.sourceOrderRevision+1);
 model.apply({sources:[message('d','Unchanged d',3),message('e','Appended',4)],messageCount:5});const appended=model.getSnapshot().sourceOrderRevision;assert.equal(appended,reordered.sourceOrderRevision+2);
 model.reconcile([null,history[1],history[2],history[3]]);assert.equal(model.getSnapshot().sourceOrderRevision,appended+1);
});


test('owner-transition dry run resets the visit without inventing an active generation',()=>{
 const model=modelWith(message('old','Old source',0));model.apply({type:'generationStarted',generationType:'normal'});
 const before=model.getSnapshot();
 const after=model.apply({type:'generationStarted',generationType:'continue',dryRun:true,owner:{chatId:'B'},history:[message('new','New source',0,{chatId:'B'})]});
 assert.equal(after.sessionEpoch,before.sessionEpoch+1);assert.equal(after.owner.chatId,'B');assert.equal(after.cursor.sourceKey,'new');
 assert.equal(after.generation.id,null);assert.equal(after.generation.status,'unknown');
});
