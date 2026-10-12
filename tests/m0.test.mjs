import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createHostAdapter } from '../src/host-adapter.mjs';
import { createShellController, createSourceTracker } from '../src/shell.mjs';

const eventTypes = Object.fromEntries([
    'CHAT_CHANGED',
    'MESSAGE_RECEIVED',
    'CHARACTER_MESSAGE_RENDERED',
    'STREAM_TOKEN_RECEIVED',
    'GENERATION_STARTED',
    'GENERATION_STOPPED',
    'GENERATION_ENDED',
    'MESSAGE_SWIPED',
    'MESSAGE_EDITED',
    'MESSAGE_DELETED',
].map((name) => [name, name.toLowerCase()]));

function createEventSource({ failOn } = {}) {
    const listeners = new Map();
    return {
        listeners,
        on(name, listener) {
            if (name === failOn) throw new Error('synthetic registration failure');
            const entries = listeners.get(name) || [];
            entries.push(listener);
            listeners.set(name, entries);
        },
        removeListener(name, listener) {
            const entries = listeners.get(name) || [];
            const index = entries.indexOf(listener);
            if (index >= 0) entries.splice(index, 1);
        },
        emit(name, ...args) {
            for (const listener of [...(listeners.get(name) || [])]) listener(...args);
        },
        count() {
            return [...listeners.values()].reduce((total, entries) => total + entries.length, 0);
        },
    };
}

function createFixtureContext() {
    const eventSource = createEventSource();
    return {
        chat: [
            { name: 'User', is_user: true, mes: 'Synthetic draft source.' },
            { name: 'Mira', mes: 'The selected swipe.', swipe_id: 1, swipes: ['Earlier swipe.', 'The selected swipe.'] },
        ],
        chatId: 'synthetic-chat.jsonl',
        groupId: 'synthetic-group',
        characterId: undefined,
        name1: 'Reader',
        eventSource,
        eventTypes: { ...eventTypes },
        extensionSettings: {},
        saveSettingsDebounced() {},
    };
}

function loadObserverFixture(context, { syntheticLabels = [] } = {}) {
    const eventSource = context.eventSource;
    eventSource.events = Object.create(null);
    eventSource.on = (name, listener) => {
        (eventSource.events[name] ||= []).push(listener);
    };
    eventSource.removeListener = (name, listener) => {
        const listeners = eventSource.events[name] || [];
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
    };
    const makeElement = (tagName) => ({
        tagName,
        children: [],
        style: {},
        setAttribute() {},
        addEventListener() {},
        append(...children) { this.children.push(...children); },
        querySelector(selector) { return selector === 'pre' ? this.children.find((child) => child.tagName === 'pre') ?? null : null; },
        remove() {},
    });
    const sandbox = {
        SillyTavern: { getContext: () => context },
        M0_LIFECYCLE_SYNTHETIC_LABELS: syntheticLabels,
        document: { createElement: makeElement, body: { append() {} }, querySelectorAll: () => [] },
        performance: { now: () => 0 },
        setTimeout() {},
    };
    runInNewContext(readFileSync(new URL('./fixtures/m0-lifecycle-observer.js', import.meta.url), 'utf8'), sandbox);
    return {
        observer: sandbox.__m0LifecycleObserver,
        emit(name, ...args) {
            for (const listener of [...(eventSource.events[name] || [])]) listener(...args);
        },
    };
}

test('reads the active message and host author without inventing a durable identity', () => {
    const context = createFixtureContext();
    const adapter = createHostAdapter(() => context);
    const source = adapter.readCurrentSource();

    assert.equal(source.index, 1);
    assert.equal(source.text, 'The selected swipe.');
    assert.equal(source.swipeId, 1);
    assert.deepEqual(source.author, { kind: 'character', label: 'Mira' });
    assert.deepEqual(source.identity, {
        chatId: 'synthetic-chat.jsonl',
        groupId: 'synthetic-group',
        characterId: null,
        scope: 'group',
        durable: false,
    });
    assert.equal(adapter.readMessageAt(99), null);
    assert.equal(adapter.inspectCapabilities().ok, true);
});

test('chat switch to an empty chat is retained across source-less generation start', () => {
    const context = createFixtureContext();
    context.chatId = 'chat-a.jsonl';
    const adapter = createHostAdapter(() => context);
    const tracker = createSourceTracker(adapter.readCurrentSource());
    const renderedSources = [];
    const dispose = adapter.subscribe((observation) => renderedSources.push(tracker.observe(observation)));

    context.chat = [];
    context.chatId = 'chat-b.jsonl';
    context.eventSource.emit(eventTypes.CHAT_CHANGED, context.chatId);
    context.eventSource.emit(eventTypes.GENERATION_STARTED, 'normal');

    assert.equal(renderedSources.length, 2);
    assert.equal(renderedSources[0], null, 'empty chat switch explicitly clears the previous source');
    assert.equal(renderedSources[1], null, 'source-less generation start retains the empty chat state');
    dispose();
});

test('populated A to B to empty B to refreshed A always reads the active chat', () => {
    const context = createFixtureContext();
    context.chatId = 'chat-a.jsonl';
    context.groupId = undefined;
    const adapter = createHostAdapter(() => context);
    const tracker = createSourceTracker(adapter.readCurrentSource());
    const sources = [];
    const dispose = adapter.subscribe((observation) => sources.push(tracker.observe(observation)));

    context.chatId = 'chat-b.jsonl';
    context.chat = [
        { name: 'Reader', is_user: true, mes: 'B user message.' },
        { name: 'Nia', mes: 'B latest reply.' },
    ];
    context.eventSource.emit(eventTypes.CHAT_CHANGED, context.chatId);
    assert.equal(sources.at(-1).text, 'B latest reply.');
    assert.equal(sources.at(-1).identity.chatId, 'chat-b.jsonl');
    assert.equal(sources.at(-1).index, 1);

    context.chatId = 'empty-b.jsonl';
    context.chat = [];
    context.eventSource.emit(eventTypes.CHAT_CHANGED, context.chatId);
    context.eventSource.emit(eventTypes.GENERATION_STARTED, 'normal', {}, false);
    assert.equal(sources.at(-2), null);
    assert.equal(sources.at(-1), null);

    context.chat = [
        { name: 'Reader', is_user: true, mes: 'Generate into empty B.' },
        { name: 'Nia', mes: 'B generated reply.' },
    ];
    context.eventSource.emit(eventTypes.MESSAGE_RECEIVED, 1, 'normal');
    assert.equal(sources.at(-1).text, 'B generated reply.');
    assert.equal(sources.at(-1).identity.chatId, 'empty-b.jsonl');
    assert.equal(sources.at(-1).index, 1);

    context.chatId = 'chat-a.jsonl';
    context.chat = [
        { name: 'Reader', is_user: true, mes: 'A user message.' },
        { name: 'Mira', mes: 'A refreshed reply.' },
    ];
    context.eventSource.emit(eventTypes.CHAT_CHANGED, context.chatId);
    assert.equal(sources.at(-1).text, 'A refreshed reply.');
    assert.equal(sources.at(-1).identity.chatId, 'chat-a.jsonl');

    dispose();
});

test('observes normal and streaming lifecycle events without forwarding token text', () => {
    const context = createFixtureContext();
    const adapter = createHostAdapter(() => context);
    const observations = [];
    const dispose = adapter.subscribe((observation) => observations.push(observation));
    const events = context.eventSource;

    // Synthetic non-streaming normal reply: message events without token events.
    events.emit(eventTypes.GENERATION_STARTED, 'normal', { quiet_prompt: 'not copied' }, false);
    events.emit(eventTypes.MESSAGE_RECEIVED, 1, 'normal');
    events.emit(eventTypes.CHARACTER_MESSAGE_RENDERED, 1, 'normal');
    events.emit(eventTypes.GENERATION_ENDED, 2);

    // Synthetic streaming normal reply: token event plus final message events.
    events.emit(eventTypes.GENERATION_STARTED, 'normal');
    events.emit(eventTypes.STREAM_TOKEN_RECEIVED, 'private synthetic token text');
    events.emit(eventTypes.MESSAGE_RECEIVED, 1, 'normal');
    events.emit(eventTypes.CHARACTER_MESSAGE_RENDERED, 1, 'normal');
    events.emit(eventTypes.GENERATION_ENDED, 2);

    events.emit(eventTypes.GENERATION_STARTED, 'normal');
    // In 1.19.0 stopGeneration hides the stop button (which emits GENERATION_ENDED) before GENERATION_STOPPED.
    events.emit(eventTypes.GENERATION_ENDED, 2);
    events.emit(eventTypes.GENERATION_STOPPED);

    events.emit(eventTypes.GENERATION_STARTED, 'continue');
    events.emit(eventTypes.MESSAGE_RECEIVED, 1, 'continue');
    events.emit(eventTypes.CHARACTER_MESSAGE_RENDERED, 1, 'continue');
    events.emit(eventTypes.GENERATION_ENDED, 2);

    events.emit(eventTypes.MESSAGE_SWIPED, 1);
    events.emit(eventTypes.MESSAGE_EDITED, 1);
    context.chat.pop();
    events.emit(eventTypes.MESSAGE_DELETED, 1);
    context.chat.push({ name: 'Mira', mes: 'Regenerated response.' });
    events.emit(eventTypes.GENERATION_STARTED, 'regenerate');
    events.emit(eventTypes.MESSAGE_RECEIVED, 1, 'regenerate');
    events.emit(eventTypes.CHARACTER_MESSAGE_RENDERED, 1, 'regenerate');
    events.emit(eventTypes.GENERATION_ENDED, 2);
    context.chatId = 'other-synthetic-chat.jsonl';
    events.emit(eventTypes.CHAT_CHANGED, context.chatId);

    assert.deepEqual(observations.map((entry) => entry.type), [
        'generationStarted', 'messageReceived', 'characterMessageRendered', 'generationEnded',
        'generationStarted', 'streamToken', 'messageReceived', 'characterMessageRendered', 'generationEnded',
        'generationStarted', 'generationEnded', 'generationStopped',
        'generationStarted', 'messageReceived', 'characterMessageRendered', 'generationEnded',
        'messageSwiped', 'messageEdited', 'messageDeleted',
        'generationStarted', 'messageReceived', 'characterMessageRendered', 'generationEnded', 'chatChanged',
    ]);
    assert.equal(observations[0].generationType, 'normal');
    assert.equal(observations[0].options, undefined);
    assert.equal(observations[1].generationType, 'normal');
    assert.equal(observations[4].generationType, 'normal');
    assert.equal(observations[5].token, undefined);
    assert.equal(observations[5].generationType, undefined);
    assert.equal(observations[6].generationType, 'normal');
    assert.equal(observations[6].source.text, 'The selected swipe.');
    assert.equal(observations[9].generationType, 'normal');
    assert.equal(observations[10].type, 'generationEnded');
    assert.equal(observations[11].type, 'generationStopped');
    assert.equal(observations[12].generationType, 'continue');
    assert.equal(observations[16].source.text, 'The selected swipe.');
    assert.equal(observations[18].hostMessageCount, 1, 'delete payload is the post-delete message count');
    assert.equal(observations[18].source.index, 0);
    assert.equal(observations[19].generationType, 'regenerate');
    assert.equal(observations[20].source.text, 'Regenerated response.');
    assert.equal(observations[23].source.identity.chatId, 'other-synthetic-chat.jsonl');

    dispose();
    dispose();
    assert.equal(events.count(), 0);
});

test('activation and repeated disposal own exactly one stage and one listener set', () => {
    const context = createFixtureContext();
    const originalChat = structuredClone(context.chat);
    const adapter = createHostAdapter(() => context);
    let mountCount = 0;
    let disposeCount = 0;
    const updates = [];
    const controller = createShellController(adapter, {
        mountStage(source) {
            mountCount++;
            return {
                update: (observation) => updates.push(observation),
                dispose: () => { disposeCount++; },
            };
        },
    });

    assert.equal(controller.isActive(), false);
    assert.equal(controller.enable(), true);
    assert.equal(controller.enable(), false);
    assert.equal(mountCount, 1);
    assert.equal(context.eventSource.count(), 10);
    context.eventSource.emit(eventTypes.MESSAGE_RECEIVED, 1, 'normal');
    context.eventSource.emit(eventTypes.GENERATION_STARTED, 'normal', {}, false);
    assert.equal(updates.length, 2);
    assert.equal(controller.disable(), true);
    assert.equal(controller.disable(), false);
    assert.equal(disposeCount, 1);
    assert.equal(context.eventSource.count(), 0);
    context.eventSource.emit(eventTypes.STREAM_TOKEN_RECEIVED, 'late synthetic token');
    context.eventSource.emit(eventTypes.GENERATION_ENDED, context.chat.length);
    assert.equal(updates.length, 2, 'events during and after a disabled generation are ignored');

    controller.enable();
    controller.disable();
    assert.equal(mountCount, 2);
    assert.equal(disposeCount, 2);
    assert.equal(context.eventSource.count(), 0);
    assert.deepEqual(context.chat, originalChat, 'enable and disable leave canonical chat messages unchanged');
});

test('invalid indices on indexed events never fall back to the last message', () => {
    const context = createFixtureContext();
    const adapter = createHostAdapter(() => context);
    const observations = [];
    const dispose = adapter.subscribe((observation) => observations.push(observation));

    context.eventSource.emit(eventTypes.MESSAGE_RECEIVED, Number.NaN, 'normal');
    context.eventSource.emit(eventTypes.MESSAGE_SWIPED, '1');
    context.eventSource.emit(eventTypes.MESSAGE_EDITED, 99);
    context.eventSource.emit(eventTypes.STREAM_TOKEN_RECEIVED, 'ignored synthetic token');

    assert.deepEqual(observations.slice(0, 3).map((observation) => observation.source), [null, null, null]);
    assert.equal(observations[3].source.text, 'The selected swipe.', 'index-free token event samples the current latest message');
    dispose();
});

test('group author labels follow the host message, while duplicate-name card identity stays unresolved', () => {
    const context = createFixtureContext();
    context.chat = [
        { name: 'Reader', is_user: true, mes: 'Synthetic group prompt.' },
        { name: 'Mira', mes: 'Card A reply.', original_avatar: 'mira-card-a.png' },
        { name: 'Mira', mes: 'Card B reply.', original_avatar: 'mira-card-b.png' },
    ];
    const adapter = createHostAdapter(() => context);
    const cardA = adapter.readMessageAt(1);
    const cardB = adapter.readMessageAt(2);

    assert.equal(cardA.author.label, 'Mira');
    assert.equal(cardB.author.label, 'Mira');
    assert.equal(cardA.text, 'Card A reply.');
    assert.equal(cardB.text, 'Card B reply.');
    assert.equal(cardA.identity.scope, 'group');
    assert.equal(cardA.identity.durable, false);
    assert.equal(cardB.identity.durable, false);
    assert.equal('characterId' in cardA, false);
    assert.equal('characterId' in cardB, false);
});

test('host chat DOM changes clear stale sources when no lifecycle event fires and dispose cleanly', async () => {
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const previousObserver = Object.getOwnPropertyDescriptor(globalThis, 'MutationObserver');
    const chatElement = {};
    let callback;
    let observedTarget;
    let observedOptions;
    let disconnectCount = 0;
    class TestMutationObserver {
        constructor(listener) { callback = listener; }
        observe(target, options) { observedTarget = target; observedOptions = options; }
        disconnect() { disconnectCount++; }
        trigger() { callback([], this); }
    }

    Object.defineProperty(globalThis, 'document', { configurable: true, value: { getElementById: (id) => id === 'chat' ? chatElement : null } });
    Object.defineProperty(globalThis, 'MutationObserver', { configurable: true, value: TestMutationObserver });
    try {
        const context = createFixtureContext();
        const adapter = createHostAdapter(() => context);
        const observations = [];
        const dispose = adapter.subscribe((observation) => observations.push(observation));

        assert.equal(observedTarget, chatElement);
        assert.deepEqual(observedOptions, { childList: true, subtree: true, characterData: true });
        context.chat = [];
        context.chatId = 'ephemeral-chat';
        callback([], null);
        await Promise.resolve();
        assert.deepEqual(observations.map((observation) => observation.type), ['chatViewChanged']);
        assert.equal(observations[0].source, null, 'a host-only chat transition clears the old source');

        context.chat = [
            { name: 'Reader', is_user: true, mes: 'Synthetic temporary prompt.' },
            { name: 'Assistant', mes: 'Synthetic temporary reply.' },
        ];
        callback([], null);
        await Promise.resolve();
        assert.equal(observations.at(-1).source.text, 'Synthetic temporary reply.');

        context.eventSource.emit(eventTypes.MESSAGE_RECEIVED, 1, 'normal');
        callback([], null);
        await Promise.resolve();
        assert.equal(observations.length, 3, 'the DOM fallback does not duplicate a lifecycle event');

        dispose();
        assert.equal(disconnectCount, 1);
        callback([], null);
        await Promise.resolve();
        assert.equal(observations.length, 3, 'disposed observers ignore already queued changes');
    } finally {
        if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
        else delete globalThis.document;
        if (previousObserver) Object.defineProperty(globalThis, 'MutationObserver', previousObserver);
        else delete globalThis.MutationObserver;
    }
});

test('debug observer hashes host avatar fields without confusing duplicate labels', () => {
    const context = createFixtureContext();
    context.chat = [
        { name: 'Mira', mes: 'Synthetic card A reply.', original_avatar: 'Mira.png', force_avatar: '/thumbnail?file=Mira.png' },
        { name: 'Mira', mes: 'Synthetic card B reply.', original_avatar: 'Mira Copy.png', force_avatar: '/thumbnail?file=Mira%20Copy.png' },
    ];
    const observer = loadObserverFixture(context, { syntheticLabels: ['Mira'] });
    observer.emit(eventTypes.CHAT_CHANGED, context.chatId);
    observer.emit(eventTypes.MESSAGE_RECEIVED, 0, 'normal');
    const cardA = observer.observer.records().at(-1).source;
    observer.emit(eventTypes.MESSAGE_RECEIVED, 1, 'normal');
    const cardB = observer.observer.records().at(-1).source;

    assert.equal(cardA.authorLabel, 'Mira');
    assert.equal(cardB.authorLabel, 'Mira');
    assert.equal(cardA.originalAvatar.status, 'valid');
    assert.equal(cardB.originalAvatar.status, 'valid');
    assert.notEqual(cardA.originalAvatar.hash, cardB.originalAvatar.hash);
    assert.notEqual(cardA.forcedAvatar.hash, cardB.forcedAvatar.hash);
    assert.ok(cardB.messageFields.includes('original_avatar'));
    assert.ok(cardB.messageFields.includes('force_avatar'));
    assert.doesNotMatch(observer.observer.dump(), /Mira Copy\.png|thumbnail\?file/);
});

test('missing required capability prevents mount and leaves host state untouched', () => {
    const context = createFixtureContext();
    delete context.eventTypes.MESSAGE_SWIPED;
    const adapter = createHostAdapter(() => context);
    let mountCount = 0;
    const controller = createShellController(adapter, {
        mountStage() {
            mountCount++;
            return { update() {}, dispose() {} };
        },
    });

    assert.throws(() => controller.enable(), /eventTypes\.MESSAGE_SWIPED/);
    assert.equal(mountCount, 0);
    assert.equal(context.eventSource.count(), 0);
    assert.equal(context.chat[0].mes, 'Synthetic draft source.');
    assert.equal(controller.isActive(), false);
});

test('partial event registration failure removes listeners already attached', () => {
    const context = createFixtureContext();
    context.eventSource = createEventSource({ failOn: eventTypes.STREAM_TOKEN_RECEIVED });
    const adapter = createHostAdapter(() => context);

    assert.throws(() => adapter.subscribe(() => {}), /synthetic registration failure/);
    assert.equal(context.eventSource.count(), 0);
});

test('observer distinguishes sanitized integer, string, missing, and invalid identities by chat scope', () => {
    const context = createFixtureContext();
    context.chatId = 'synthetic-chat.jsonl';
    context.groupId = 17;
    context.characterId = undefined;
    const observer = loadObserverFixture(context);
    const readIdentity = () => {
        observer.emit(eventTypes.CHAT_CHANGED, context.chatId);
        return observer.observer.records().at(-1).chat;
    };

    const integerGroup = readIdentity();
    assert.equal(integerGroup.scope, 'group');
    assert.deepEqual(JSON.parse(JSON.stringify(integerGroup.groupId)), { status: 'valid', type: 'integer', hash: integerGroup.groupId.hash });
    assert.notEqual(integerGroup.groupId.hash, '17');
    assert.equal(integerGroup.characterId.status, 'missing');
    assert.equal(integerGroup.chatId.type, 'string');

    context.groupId = 'synthetic-group-card-id';
    const stringGroup = readIdentity();
    assert.equal(stringGroup.scope, 'group');
    assert.equal(stringGroup.groupId.status, 'valid');
    assert.equal(stringGroup.groupId.type, 'string');
    assert.notEqual(stringGroup.groupId.hash, integerGroup.groupId.hash);

    context.groupId = undefined;
    context.characterId = 'synthetic-character-card-id';
    const stringCharacter = readIdentity();
    assert.equal(stringCharacter.scope, 'character');
    assert.equal(stringCharacter.characterId.status, 'valid');
    assert.equal(stringCharacter.characterId.type, 'string');

    context.characterId = 23;
    const integerCharacter = readIdentity();
    assert.equal(integerCharacter.scope, 'character');
    assert.equal(integerCharacter.characterId.type, 'integer');
    assert.notEqual(integerCharacter.characterId.hash, stringCharacter.characterId.hash);

    context.characterId = Number.NaN;
    const invalidCharacter = readIdentity();
    assert.equal(invalidCharacter.scope, 'character');
    assert.deepEqual(JSON.parse(JSON.stringify(invalidCharacter.characterId)), { status: 'invalid', type: 'number', hash: null });

    context.characterId = undefined;
    context.groupId = undefined;
    context.chatId = undefined;
    const missing = readIdentity();
    assert.equal(missing.scope, 'unknown');
    assert.equal(missing.chatId.status, 'missing');
    assert.equal(missing.groupId.status, 'missing');
    assert.equal(missing.characterId.status, 'missing');
    assert.doesNotMatch(JSON.stringify(observer.observer.records()), /synthetic-(?:group|character)-card-id/);
});

test('debug observer remains removable when the instrumented host lacks one event type', () => {
    const context = createFixtureContext();
    delete context.eventTypes.MESSAGE_SWIPED;
    const observer = loadObserverFixture(context);

    assert.deepEqual(JSON.parse(JSON.stringify(observer.observer.missingEventTypes)), ['MESSAGE_SWIPED']);
    assert.equal(context.eventSource.events.message_swiped, undefined);
    observer.emit(eventTypes.MESSAGE_RECEIVED, 1, 'normal');
    assert.equal(observer.observer.records().at(-1).event, 'MESSAGE_RECEIVED');
    assert.equal(observer.observer.uninstall(), true);
    assert.equal(observer.observer.uninstall(), false);
    assert.equal(Object.values(context.eventSource.events).flat().length, 0);
});
