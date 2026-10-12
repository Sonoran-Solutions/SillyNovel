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

function safeLabel(value, fallback) {
    return typeof value === 'string' && value.trim() ? value.slice(0, 120) : fallback;
}

function safeGenerationType(value) {
    return typeof value === 'string' ? value.slice(0, 40) : null;
}

function safeCount(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function sourceSignature(source) {
    if (!source) return null;
    return JSON.stringify([
        source.identity?.chatId,
        source.identity?.groupId,
        source.identity?.characterId,
        source.index,
        source.author?.kind,
        source.author?.label,
        source.swipeId,
        source.text.length,
    ]);
}

export function createHostAdapter(getContext) {
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
        try {
            chatId = safeId(typeof context.getCurrentChatId === 'function' ? context.getCurrentChatId() : context.chatId);
        } catch {
            chatId = safeId(context.chatId);
        }
        const groupId = safeId(context.groupId);
        const characterId = safeId(context.characterId);
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

        return {
            identity: readChatIdentity(context),
            index,
            messageCount,
            author,
            text,
            swipeId,
        };
    }

    function readCurrentSource() {
        const context = contextOrNull();
        if (!context || !Array.isArray(context.chat)) return null;
        return readMessageAt(context.chat.length - 1, context);
    }

    function subscribe(onObservation) {
        if (typeof onObservation !== 'function') throw new TypeError('An observation callback is required.');
        const capabilities = inspectCapabilities();
        if (!capabilities.ok) throw new Error('Missing SillyTavern capabilities: ' + capabilities.missing.join(', '));
        const context = contextOrNull();
        const source = context.eventSource;
        const types = context.eventTypes;
        const bindings = [];
        let disposed = false;
        let mutationObserver = null;
        let pendingViewRead = false;
        let lastSourceSignature = sourceSignature(readCurrentSource());

        function emit(type, details = {}) {
            if (Object.prototype.hasOwnProperty.call(details, 'source')) {
                lastSourceSignature = sourceSignature(details.source);
            }
            onObservation({ type, ...details });
        }

        function messageSource(index) {
            const current = contextOrNull();
            return readMessageAt(index, current);
        }

        const listeners = [
            [types.CHAT_CHANGED, (chatId) => emit('chatChanged', { hostChatId: safeId(chatId), source: readCurrentSource() })],
            [types.MESSAGE_RECEIVED, (index, generationType) => emit('messageReceived', { source: messageSource(index), generationType: safeGenerationType(generationType) })],
            [types.CHARACTER_MESSAGE_RENDERED, (index, generationType) => emit('characterMessageRendered', { source: messageSource(index), generationType: safeGenerationType(generationType) })],
            [types.STREAM_TOKEN_RECEIVED, () => emit('streamToken', { source: readCurrentSource() })],
            [types.GENERATION_STARTED, (generationType, _options, dryRun) => emit('generationStarted', { generationType: safeGenerationType(generationType), dryRun: dryRun === true })],
            [types.GENERATION_STOPPED, () => emit('generationStopped', { source: readCurrentSource() })],
            [types.GENERATION_ENDED, (messageCount) => emit('generationEnded', { hostMessageCount: safeCount(messageCount), source: readCurrentSource() })],
            [types.MESSAGE_SWIPED, (index) => emit('messageSwiped', { source: messageSource(index) })],
            [types.MESSAGE_EDITED, (index) => emit('messageEdited', { source: messageSource(index) })],
            [types.MESSAGE_DELETED, (messageCount) => emit('messageDeleted', { hostMessageCount: safeCount(messageCount), source: readCurrentSource() })],
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
                    if (pendingViewRead || disposed) return;
                    pendingViewRead = true;
                    queueMicrotask(() => {
                        pendingViewRead = false;
                        if (disposed) return;
                        const currentSource = readCurrentSource();
                        const signature = sourceSignature(currentSource);
                        if (signature === lastSourceSignature) return;
                        emit('chatViewChanged', { source: currentSource });
                    });
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
            for (const [eventName, listener] of bindings) {
                try { source.removeListener(eventName, listener); } catch (error) { firstError ||= error; }
            }
            bindings.length = 0;
            if (firstError) throw firstError;
        };
    }

    return { inspectCapabilities, readChatIdentity, readMessageAt, readCurrentSource, subscribe };
}
