import assert from 'node:assert/strict';
import test from 'node:test';
import { createHostAdapter } from '../src/host-adapter.mjs';
import { createShellController } from '../src/shell.mjs';

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
    assert.equal(updates.length, 1);
    assert.equal(controller.disable(), true);
    assert.equal(controller.disable(), false);
    assert.equal(disposeCount, 1);
    assert.equal(context.eventSource.count(), 0);

    controller.enable();
    controller.disable();
    assert.equal(mountCount, 2);
    assert.equal(disposeCount, 2);
    assert.equal(context.eventSource.count(), 0);
    assert.equal(context.chat[1].mes, 'The selected swipe.');
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
