const REQUIRED_EVENTS = [
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
];

function safeId(value) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
    return null;
}

// Conversation authority is transient; it never binds a project actor to a card.
export function supportsProjectConversation(owner) {
    return safeId(owner?.chatId) !== null && (owner?.scope === 'character'
        ? safeId(owner.characterId) !== null && owner.groupId == null
        : owner?.scope === 'group' && owner.groupVerified === true
            && safeId(owner.groupId) !== null && safeId(owner.groupSessionKey) !== null);
}

function safeLabel(value, fallback) {
    return typeof value === 'string' && value.trim() ? value : fallback;
}

function freeze(value) {
    for (const child of Object.values(value)) {
        if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child);
    }
    return Object.freeze(value);
}

function safeGenerationType(value) {
    return typeof value === 'string' ? value.slice(0, 40) : null;
}

function safeCount(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function sameSource(left, right) {
    if (!left || !right) return left === right;
    return left.sourceKey === right.sourceKey
        && left.identity?.chatId === right.identity?.chatId
        && left.identity?.groupId === right.identity?.groupId
        && left.identity?.characterId === right.identity?.characterId
        && left.index === right.index
        && left.author?.kind === right.author?.kind
        && left.author?.label === right.author?.label
        && left.swipeId === right.swipeId
        && left.text.length === right.text.length
        && left.text === right.text;
}

export function createHostAdapter(getContext) {
    const sourceKeys = new WeakMap();
    // ponytail: only observed record replacement is detectable here; durable or
    // unseen same-locator lifecycle needs host-issued incarnation/load authority.
    const groupKeys = new WeakMap();
    let nextSourceKey = 0;
    let nextGroupKey = 0;

    function contextOrNull() {
        try {
            const context = getContext?.();
            return context && typeof context === 'object' ? context : null;
        } catch {
            return null;
        }
    }

    function inspectCapabilities() {
        const missing = [];
        const context = contextOrNull();
        if (!context) return { ok: false, missing: ['SillyTavern.getContext'] };
        if (!Array.isArray(context.chat)) missing.push('context.chat');
        if (!context.eventSource || typeof context.eventSource.on !== 'function' || typeof context.eventSource.removeListener !== 'function') {
            missing.push('context.eventSource.on/removeListener');
        }
        if (!context.eventTypes || typeof context.eventTypes !== 'object') {
            missing.push('context.eventTypes');
        } else {
            for (const name of REQUIRED_EVENTS) {
                if (typeof context.eventTypes[name] !== 'string') missing.push('eventTypes.' + name);
            }
        }
        if (!context.extensionSettings || typeof context.extensionSettings !== 'object') missing.push('context.extensionSettings');
        if (typeof context.saveSettingsDebounced !== 'function') missing.push('context.saveSettingsDebounced');
        return { ok: missing.length === 0, missing };
    }

    function readChatIdentity(context = contextOrNull()) {
        if (!context) return null;
        let chatId = null;
        let chatReadFailed = false;
        try {
            chatId = safeId(typeof context.getCurrentChatId === 'function' ? context.getCurrentChatId() : context.chatId);
        } catch {
            chatReadFailed = true;
            chatId = safeId(context.chatId);
        }
        const groupId = safeId(context.groupId);
        const characterId = safeId(context.characterId);
        if (context.groupId != null && groupId === null) {
            return { chatId, groupId: null, characterId: null, scope: 'unknown', durable: false };
        }
        if (groupId !== null) {
            const matches = Array.isArray(context.groups)
                ? context.groups.filter(group => group && safeId(group.id) !== null && String(group.id) === String(groupId)) : [];
            const group = matches.length === 1 ? matches[0] : null;
            const verified = !chatReadFailed && group !== null && safeId(chatId) !== null && safeId(group.chat_id) !== null
                && String(group.chat_id) === String(chatId)
                && (context.chatId == null || String(context.chatId) === String(chatId));
            let key = group && groupKeys.get(group);
            if (group && !key) { key = 'session-group-' + (++nextGroupKey); groupKeys.set(group, key); }
            // Pinned native group generation temporarily sets characterId to each
            // replying member. It is neither conversation ownership nor actor identity.
            return { chatId, groupId: String(groupId), characterId: null, scope: 'group', durable: false,
                groupVerified: verified, groupSessionKey: key ?? null, groupLabel: safeLabel(group?.name, 'Native group') };
        }
        return {
            chatId,
            groupId: groupId === null ? null : String(groupId),
            characterId,
            scope: groupId !== null ? 'group' : characterId !== null ? 'character' : 'unknown',
            durable: false,
        };
    }

    function readMessageAt(index, context = contextOrNull()) {
        if (!context || !Array.isArray(context.chat)) return null;
        const messageCount = context.chat.length;
        if (!Number.isSafeInteger(index) || index < 0 || index >= messageCount) return null;
        const message = context.chat[index];
        if (!message || typeof message !== 'object') return null;

        const kind = message.is_user === true ? 'user' : message.is_system === true ? 'system' : 'character';
        const fallback = kind === 'user'
            ? safeLabel(context.name1, 'User')
            : kind === 'system' ? 'System' : 'Unknown character';
        const author = { kind, label: safeLabel(message.name, fallback) };
        const text = typeof message.mes === 'string' ? message.mes : '';
        const swipeId = Number.isSafeInteger(message.swipe_id) && message.swipe_id >= 0 ? message.swipe_id : null;

        let sourceKey = sourceKeys.get(message);
        if (!sourceKey) {
            sourceKey = 'session-source-' + (++nextSourceKey);
            sourceKeys.set(message, sourceKey);
        }

        return freeze({
            sourceKey,
            identity: readChatIdentity(context),
            index,
            messageCount,
            author,
            text,
            swipeId,
        });
    }

    function readHistory() {
        const context = contextOrNull();
        if (!context || !Array.isArray(context.chat)) return [];
        return freeze(context.chat.map((_message, index) => readMessageAt(index, context)));
    }

    function readCurrentSource() {
        const context = contextOrNull();
        if (!context || !Array.isArray(context.chat)) return null;
        return readMessageAt(context.chat.length - 1, context);
    }

    function subscribe(onObservation, { getTrackedIndices = () => [], getScheduleState = () => null } = {}) {
        if (typeof onObservation !== 'function') throw new TypeError('An observation callback is required.');
        const capabilities = inspectCapabilities();
        if (!capabilities.ok) throw new Error('Missing SillyTavern capabilities: ' + capabilities.missing.join(', '));
        const context = contextOrNull();
        const source = context.eventSource;
        const types = context.eventTypes;
        const bindings = [];
        let disposed = false;
        let mutationObserver = null;
        let pendingRefresh = false;
        let pendingFrame = null;
        let lastObservedSource = readCurrentSource();
        let lastObservedHistory = [...readHistory()];
        let observedSourceKeys = new Set(lastObservedHistory.map((item) => item?.sourceKey).filter(Boolean));
        let lastObservedOwner = currentOwner();

        function emit(type, details = {}) {
            const owner = currentOwner();
            if (JSON.stringify(owner) !== JSON.stringify(lastObservedOwner) && !details.history) {
                const history = readHistory();
                details = { ...details, history, source: history.at(-1) ?? null };
            }
            details = { ...details, owner };
            if (Object.prototype.hasOwnProperty.call(details, 'source')) {
                lastObservedSource = details.source;
            }
            if (Array.isArray(details.history)) {
                lastObservedHistory = [...details.history];
                observedSourceKeys = new Set(lastObservedHistory.map((item) => item?.sourceKey).filter(Boolean));
            }
            if (details.owner) lastObservedOwner = details.owner;
            onObservation({ type, ...details });
        }

        function currentOwner() {
            return readChatIdentity(contextOrNull());
        }

        function scheduleReconciliation(type) {
            if (pendingRefresh || disposed) return;
            pendingRefresh = true;
            const scheduledOwner = currentOwner();
            const scheduledIndices = getTrackedIndices();
            const scheduleState = getScheduleState();
            const scheduledState = scheduleState && { ...scheduleState };
            const reconcile = () => {
                pendingRefresh = false;
                pendingFrame = null;
                if (disposed) return;
                const current = contextOrNull();
                if (!current || !Array.isArray(current.chat)) return;
                const messageCount = current.chat.length;
                const owner = currentOwner();
                if (JSON.stringify(owner) !== JSON.stringify(lastObservedOwner)
                    || JSON.stringify(owner) !== JSON.stringify(scheduledOwner)) {
                    const history = readHistory();
                    emit(type, { history, source: history.at(-1) ?? null, owner });
                    return;
                }
                const currentState = getScheduleState();
                if (scheduledState?.sessionEpoch !== undefined
                    && currentState?.sessionEpoch !== scheduledState.sessionEpoch) return;
                const selectionChanged = scheduledState?.viewRevision !== undefined
                    && currentState?.viewRevision !== scheduledState.viewRevision;
                const countDelta = messageCount - lastObservedHistory.length;
                if (countDelta < 0 || countDelta > 1) {
                    const history = readHistory();
                    const changed = history.length !== lastObservedHistory.length
                        || history.some((item, index) => !sameSource(item, lastObservedHistory[index]));
                    if (changed) emit(type, { history, source: history.at(-1) ?? null, owner });
                    return;
                }
                const trackedIndices = selectionChanged ? getTrackedIndices() : scheduledIndices;
                const indices = new Set([messageCount - 1, ...(countDelta === 1 ? [messageCount - 2] : []), ...trackedIndices]);
                const sources = [...indices]
                    .filter((index) => Number.isSafeInteger(index) && index >= 0 && index < messageCount)
                    .map((index) => readMessageAt(index, current));
                const changed = countDelta !== 0 || sources.some((item) => !sameSource(item, lastObservedHistory[item.index]));
                if (!changed) return;
                if (countDelta === 1) {
                    const previousTail = sources.find((item) => item.index === messageCount - 2);
                    const incoming = sources.find((item) => item.index === messageCount - 1);
                    if (!sameSource(previousTail, lastObservedHistory.at(-1)) || !incoming || observedSourceKeys.has(incoming.sourceKey)) {
                        const history = readHistory();
                        emit(type, { history, source: history.at(-1) ?? null, owner });
                        return;
                    }
                    lastObservedHistory = [...lastObservedHistory, incoming];
                    observedSourceKeys.add(incoming.sourceKey);
                }
                for (const item of sources) lastObservedHistory[item.index] = item;
                emit(type, { sources, messageCount, source: sources.find((item) => item.index === messageCount - 1) ?? null, owner });
            };
            if (typeof globalThis.requestAnimationFrame === 'function') {
                pendingFrame = globalThis.requestAnimationFrame(reconcile);
            } else {
                queueMicrotask(reconcile);
            }
        }

        function messageSource(index) {
            const current = contextOrNull();
            return readMessageAt(index, current);
        }

        const listeners = [
            [types.CHAT_CHANGED, (chatId) => {
                const history = readHistory();
                emit('chatChanged', { hostChatId: safeId(chatId), history, source: history.at(-1) ?? null, owner: currentOwner() });
            }],
            [types.MESSAGE_RECEIVED, (index, generationType) => emit('messageReceived', { source: messageSource(index), history: readHistory(), generationType: safeGenerationType(generationType) })],
            [types.CHARACTER_MESSAGE_RENDERED, (index, generationType) => emit('characterMessageRendered', { source: messageSource(index), history: readHistory(), generationType: safeGenerationType(generationType) })],
            // Token payloads run ahead of canonical host writes. Reconcile the current host state once per paint.
            [types.STREAM_TOKEN_RECEIVED, () => { emit('streamToken'); scheduleReconciliation('streamReconciled'); }],
            [types.GENERATION_STARTED, (generationType, _options, dryRun) => emit('generationStarted', { generationType: safeGenerationType(generationType), dryRun: dryRun === true })],
            [types.GENERATION_STOPPED, () => emit('generationStopped', { history: readHistory(), source: readCurrentSource() })],
            [types.GENERATION_ENDED, (messageCount) => emit('generationEnded', { hostMessageCount: safeCount(messageCount), history: readHistory(), source: readCurrentSource() })],
            [types.MESSAGE_SWIPED, (index) => emit('messageSwiped', { source: messageSource(index), history: readHistory() })],
            [types.MESSAGE_EDITED, (index) => emit('messageEdited', { source: messageSource(index), history: readHistory() })],
            [types.MESSAGE_DELETED, (messageCount) => emit('messageDeleted', { hostMessageCount: safeCount(messageCount), history: readHistory(), source: readCurrentSource() })],
        ];

        try {
            for (const [eventName, listener] of listeners) {
                source.on(eventName, listener);
                bindings.push([eventName, listener]);
            }

            const chatElement = globalThis.document?.getElementById?.('chat');
            const Observer = globalThis.MutationObserver;
            if (chatElement && typeof Observer === 'function') {
                mutationObserver = new Observer(() => {
                    scheduleReconciliation('chatViewChanged');
                });
                mutationObserver.observe(chatElement, { childList: true, subtree: true, characterData: true });
            }
        } catch (error) {
            try { mutationObserver?.disconnect(); } catch { /* continue releasing owned listeners */ }
            for (const [eventName, listener] of bindings) {
                try { source.removeListener(eventName, listener); } catch { /* continue releasing owned listeners */ }
            }
            throw error;
        }

        return () => {
            if (disposed) return;
            disposed = true;
            let firstError = null;
            try { mutationObserver?.disconnect(); } catch (error) { firstError ||= error; }
            mutationObserver = null;
            if (pendingFrame !== null) globalThis.cancelAnimationFrame?.(pendingFrame);
            pendingFrame = null;
            pendingRefresh = false;
            for (const [eventName, listener] of bindings) {
                try { source.removeListener(eventName, listener); } catch (error) { firstError ||= error; }
            }
            bindings.length = 0;
            if (firstError) throw firstError;
        };
    }

    function openOriginalMessage(selected) {
        if (!selected) return false;
        // Re-resolve the transient object key; an old numeric index is never authority.
        const matches = readHistory().filter((item) => item?.sourceKey === selected.sourceKey);
        if (matches.length !== 1 || !sameSource(matches[0], selected)) return false;
        const chat = globalThis.document?.getElementById('chat');
        if (typeof chat?.scrollTo !== 'function') return false;
        // Native attributes identify a candidate, not its rendered source revision.
        const elements = chat?.querySelectorAll(':scope > .mes[mesid="' + matches[0].index + '"]');
        if (elements?.length !== 1) return false;
        const element = elements[0];
        const source = matches[0];
        if (element.getAttribute('ch_name') !== source.author.label
            || (element.getAttribute('is_user') === 'true') !== (source.author.kind === 'user')
            || (element.getAttribute('is_system') === 'true') !== (source.author.kind === 'system')
            || element.getAttribute('swipeid') !== String(source.swipeId ?? 0)) return false;
        // Same DOM contract and scroll calculation as pinned host /chat-jump, without executing a command.
        chat.scrollTo({ top: element.getBoundingClientRect().top - chat.getBoundingClientRect().top + chat.scrollTop, behavior: 'instant' });
        // ponytail: pinned host has no rendered source/revision token. Only claim an
        // exact match after a verified read-only host token can establish correspondence.
        return false;
    }

    return { inspectCapabilities, readChatIdentity, readMessageAt, readCurrentSource, readHistory, subscribe, openOriginalMessage };
}
