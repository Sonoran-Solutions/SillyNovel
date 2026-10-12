/*
 * Paste this debug-only fixture into the DevTools console on the isolated
 * SillyTavern 1.19.0 test page. It does not emit events or modify chat data.
 */
(() => {
    const root = globalThis;
    const key = 'M0LifecycleObserver';
    if (root[key]) throw new Error(key + ' is already installed in this page.');

    const eventKeys = [
        'CHAT_CHANGED',
        'GENERATION_STARTED',
        'STREAM_TOKEN_RECEIVED',
        'MESSAGE_RECEIVED',
        'CHARACTER_MESSAGE_RENDERED',
        'GENERATION_ENDED',
        'GENERATION_STOPPED',
        'MESSAGE_SWIPED',
        'MESSAGE_EDITED',
        'MESSAGE_DELETED',
    ];

    function hash(value) {
        const text = String(value ?? '').slice(0, 4096);
        let result = 0x811c9dc5;
        for (let i = 0; i < text.length; i++) {
            result ^= text.charCodeAt(i);
            result = Math.imul(result, 0x01000193);
        }
        return (result >>> 0).toString(16).padStart(8, '0');
    }

    function context() {
        const value = root.SillyTavern?.getContext?.();
        if (!value || !Array.isArray(value.chat) || !value.eventSource || !value.eventTypes) {
            throw new Error('SillyTavern context is not ready or is missing required fields.');
        }
        return value;
    }

    function safeIdentity(value) {
        if (value === undefined || value === null) return { status: 'missing', type: null, hash: null };
        if (Number.isSafeInteger(value)) return { status: 'valid', type: 'integer', hash: hash('integer:' + value) };
        if (typeof value === 'string') {
            return value.trim()
                ? { status: 'valid', type: 'string', hash: hash('string:' + value) }
                : { status: 'invalid', type: 'string', hash: null };
        }
        return { status: 'invalid', type: typeof value, hash: null };
    }

    function identity(ctx) {
        const rawChatId = typeof ctx.getCurrentChatId === 'function' ? ctx.getCurrentChatId() : ctx.chatId;
        const groupId = ctx.groupId;
        const characterId = ctx.characterId;
        return {
            scope: groupId !== undefined && groupId !== null ? 'group' : characterId !== undefined && characterId !== null ? 'character' : 'unknown',
            chatId: safeIdentity(rawChatId),
            groupId: safeIdentity(groupId),
            characterId: safeIdentity(characterId),
        };
    }

    function listenerCounts(ctx) {
        return Object.fromEntries(eventKeys.map((keyName) => {
            const eventName = ctx.eventTypes[keyName];
            const listeners = typeof eventName === 'string' ? ctx.eventSource.events?.[eventName] : null;
            return [keyName, Array.isArray(listeners) ? listeners.length : null];
        }));
    }

    root[key] = {
        install({ syntheticLabels = [], postTokenDelayMs = 100 } = {}) {
            if (!Array.isArray(syntheticLabels) || !syntheticLabels.every((label) => typeof label === 'string')) {
                throw new TypeError('syntheticLabels must be an array of synthetic author labels.');
            }
            if (!Number.isSafeInteger(postTokenDelayMs) || postTokenDelayMs < 0 || postTokenDelayMs > 1000) {
                throw new RangeError('postTokenDelayMs must be an integer from 0 to 1000.');
            }

            const ctx = context();
            const source = ctx.eventSource;
            const types = ctx.eventTypes;
            const baseline = listenerCounts(ctx);
            const missingEventTypes = eventKeys.filter((keyName) => typeof types[keyName] !== 'string');
            const labels = new Set(syntheticLabels.map((label) => label.slice(0, 80)));
            const startedAt = performance.now();
            const records = [];
            const bindings = [];
            let sequence = 0;
            let installed = true;
            let originalGetContext = null;
            let generationActive = false;
            let stopSeenInGeneration = false;
            let panel = null;

            function renderPanel() {
                const output = panel?.querySelector('pre');
                if (!output) return;
                output.textContent = JSON.stringify({
                    note: 'Debug-only sanitized trace. Message bodies and stream tokens are not stored.',
                    missingEventTypes,
                    missingCapabilityOverrideActive: originalGetContext !== null,
                    recordCount: records.length,
                    records: records.slice(-60),
                }, null, 1);
            }

            function readSource(index) {
                const current = context();
                const selectedIndex = Number.isSafeInteger(index) ? index : current.chat.length - 1;
                const message = selectedIndex >= 0 ? current.chat[selectedIndex] : null;
                if (!message || typeof message !== 'object') {
                    return {
                        index: selectedIndex >= 0 ? selectedIndex : null,
                        resolution: current.chat.length === 0 ? 'empty' : 'unresolved',
                    };
                }
                const text = typeof message.mes === 'string' ? message.mes : '';
                const label = typeof message.name === 'string' ? message.name : '';
                return {
                    index: selectedIndex,
                    resolution: typeof message.mes === 'string' ? 'resolved' : 'unresolved',
                    kind: message.is_user === true ? 'user' : message.is_system === true ? 'system' : 'character',
                    authorLabel: labels.has(label) ? label : null,
                    authorLabelHash: label ? hash(label) : null,
                    messageFields: Object.keys(message).sort().slice(0, 40),
                    originalAvatar: safeIdentity(message.original_avatar),
                    forcedAvatar: safeIdentity(message.force_avatar),
                    textLength: text.length,
                    textHashPrefix: hash(text),
                    swipeId: Number.isSafeInteger(message.swipe_id) ? message.swipe_id : null,
                };
            }

            function safeArgs(keyName, args) {
                switch (keyName) {
                    case 'CHAT_CHANGED':
                        return { chatId: safeIdentity(args[0]) };
                    case 'GENERATION_STARTED':
                        return { generationType: typeof args[0] === 'string' ? args[0].slice(0, 40) : null, dryRun: args[2] === true };
                    case 'STREAM_TOKEN_RECEIVED':
                        return { tokenLength: typeof args[0] === 'string' ? args[0].length : null, tokenText: '[redacted]' };
                    case 'MESSAGE_RECEIVED':
                    case 'CHARACTER_MESSAGE_RENDERED':
                        return { index: Number.isSafeInteger(args[0]) ? args[0] : null, generationType: typeof args[1] === 'string' ? args[1].slice(0, 40) : null };
                    case 'GENERATION_ENDED':
                    case 'MESSAGE_DELETED':
                        return { hostCount: Number.isSafeInteger(args[0]) ? args[0] : null };
                    case 'MESSAGE_SWIPED':
                    case 'MESSAGE_EDITED':
                        return { index: Number.isSafeInteger(args[0]) ? args[0] : null };
                    default:
                        return {};
                }
            }

            function writeRecord(kind, keyName, args, sourceIndex, triggerSequence = null) {
                if (!installed) return null;
                const current = context();
                if (kind === 'hostEvent' && keyName === 'GENERATION_STARTED' && args[2] !== true) {
                    generationActive = true;
                    stopSeenInGeneration = false;
                } else if (kind === 'hostEvent' && keyName === 'GENERATION_STOPPED') {
                    stopSeenInGeneration = true;
                } else if (kind === 'hostEvent' && keyName === 'GENERATION_ENDED') {
                    generationActive = false;
                }
                const ownListenerCounts = Object.fromEntries(eventKeys.map((eventKey) => [eventKey, 1]));
                const currentCounts = listenerCounts(current);
                const deltas = Object.fromEntries(eventKeys.map((eventKey) => {
                    const now = currentCounts[eventKey];
                    const base = baseline[eventKey];
                    return [eventKey, Number.isSafeInteger(now) && Number.isSafeInteger(base) ? now - base - ownListenerCounts[eventKey] : null];
                }));
                const record = {
                    sequence: ++sequence,
                    elapsedMs: Math.round(performance.now() - startedAt),
                    kind,
                    event: keyName,
                    triggerSequence,
                    args: safeArgs(keyName, args),
                    chat: identity(current),
                    messageCount: current.chat.length,
                    source: readSource(sourceIndex),
                    generationActive,
                    stopSeenInGeneration,
                    stageCount: document.querySelectorAll('#sillynovel-stage').length,
                    listenerDeltasFromInstall: deltas,
                };
                records.push(record);
                // ponytail: retain at most 2,000 safe diagnostic rows; export or clear between longer runs.
                if (records.length > 2000) records.shift();
                renderPanel();
                return record;
            }

            try {
                for (const keyName of eventKeys) {
                    const eventName = types[keyName];
                    if (typeof eventName !== 'string') continue;
                    const listener = (...args) => {
                        const index = ['MESSAGE_RECEIVED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_SWIPED', 'MESSAGE_EDITED'].includes(keyName)
                            ? args[0]
                            : null;
                        const record = writeRecord('hostEvent', keyName, args, index);
                        if (keyName === 'STREAM_TOKEN_RECEIVED' && record) {
                            setTimeout(() => writeRecord('postTokenSample', 'STREAM_TOKEN_RECEIVED', [], null, record.sequence), postTokenDelayMs);
                        }
                    };
                    source.on(eventName, listener);
                    bindings.push([eventName, listener]);
                }
            } catch (error) {
                for (const [eventName, listener] of bindings) source.removeListener(eventName, listener);
                throw error;
            }

            panel = document.createElement('section');
            panel.id = 'm0-lifecycle-observer-panel';
            panel.setAttribute('aria-label', 'Temporary sanitized M0 lifecycle trace');
            panel.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:999999;max-width:42vw;max-height:42vh;overflow:auto;background:#111;color:#eee;border:1px solid #888;padding:6px;font:11px monospace;opacity:.96';
            const heading = document.createElement('strong');
            heading.textContent = 'Temporary M0 lifecycle observer — sanitized trace';
            const clearButton = document.createElement('button');
            clearButton.textContent = 'Clear trace';
            clearButton.addEventListener('click', () => { records.length = 0; sequence = 0; renderPanel(); });
            const capabilityButton = document.createElement('button');
            capabilityButton.textContent = 'Toggle missing MESSAGE_SWIPED';
            capabilityButton.addEventListener('click', () => {
                const api = root.SillyTavern;
                if (originalGetContext) {
                    api.getContext = originalGetContext;
                    originalGetContext = null;
                } else if (typeof api?.getContext === 'function') {
                    originalGetContext = api.getContext;
                    api.getContext = function () {
                        const current = originalGetContext.call(this);
                        if (!current || typeof current !== 'object') return current;
                        return { ...current, eventTypes: { ...current.eventTypes, MESSAGE_SWIPED: undefined } };
                    };
                }
                renderPanel();
            });
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove observer';
            removeButton.addEventListener('click', () => {
                handle.uninstall();
                panel?.remove();
                panel = null;
                delete root.__m0LifecycleObserver;
                delete root.M0_LIFECYCLE_SYNTHETIC_LABELS;
                delete root[key];
            });
            const output = document.createElement('pre');
            panel.append(heading, clearButton, capabilityButton, removeButton, output);
            document.body.append(panel);

            // ponytail: listener counts use the pinned 1.19.0 EventEmitter.events array; recheck this if the host changes emitter.
            const handle = {
                missingEventTypes: missingEventTypes.slice(),
                records: () => records.slice(),
                dump: () => JSON.stringify(records, null, 2),
                clear: () => { records.length = 0; sequence = 0; renderPanel(); },
                uninstall() {
                    if (!installed) return false;
                    installed = false;
                    if (originalGetContext && root.SillyTavern?.getContext !== originalGetContext) {
                        root.SillyTavern.getContext = originalGetContext;
                        originalGetContext = null;
                    }
                    for (const [eventName, listener] of bindings) source.removeListener(eventName, listener);
                    bindings.length = 0;
                    panel?.remove();
                    panel = null;
                    if (root.__m0LifecycleObserver === handle) delete root.__m0LifecycleObserver;
                    return true;
                },
            };
            renderPanel();
            return handle;
        },
    };
    const syntheticLabels = Array.isArray(root.M0_LIFECYCLE_SYNTHETIC_LABELS) ? root.M0_LIFECYCLE_SYNTHETIC_LABELS : [];
    root.__m0LifecycleObserver = root[key].install({ syntheticLabels });
    return key + ' installed; only allowlisted synthetic author labels are recorded.';
})();
