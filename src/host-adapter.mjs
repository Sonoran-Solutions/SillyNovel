import { LOOPBACK_HOSTS, resultPathProblem } from './image-request.mjs';
import { pngProblem, RESULT_LIMITS } from './image-workflow.mjs';

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

const COMPOSER_ID = 'send_textarea';

// onComposerInput wakes the director's composer hold; it carries no argument, so no draft can travel with it.
export function createHostAdapter(getContext, { onComposerInput, image: imageEnvironment = {} } = {}) {
    const sourceKeys = new WeakMap();
    // Time of the last input/keydown seen on the composer since subscribe; never the draft.
    let lastComposerEvent = null;
    const clock = () => globalThis.performance?.now?.() ?? Date.now();
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
        if (!context) return { ok: false, missing: ['SillyTavern.getContext'], director: inspectDirector(null) };
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
        return { ok: missing.length === 0, missing, director: inspectDirector(context) };
    }

    // Optional: a missing entry point disables the director only, never the reader.
    function inspectDirector(context = contextOrNull()) {
        const missing = ['generateRawData', 'extractMessageFromData'].filter((name) => typeof context?.[name] !== 'function');
        return { ok: missing.length === 0, missing, online: typeof context?.onlineStatus === 'string' ? context.onlineStatus : null };
    }

    // F3: read-only. Only the draft's length and the time since the last observed event leave this function.
    function inspectComposer() {
        const length = globalThis.document?.getElementById?.(COMPOSER_ID)?.value?.length;
        if (!Number.isSafeInteger(length)) return { present: false, draft: false, idleMs: null };
        return { present: true, draft: length > 0, idleMs: lastComposerEvent === null ? null : Math.max(0, clock() - lastComposerEvent) };
    }

    // E2/E8: one call on the user's selected connection. Never throws, never retries.
    async function requestDirectorText(messages) {
        const context = contextOrNull();
        const director = inspectDirector(context);
        if (!director.ok || director.online === 'no_connection') return { ok: false, code: 'HOST_REFUSED' };
        try {
            // createRawPrompt expands macros into the objects it is given, so it gets copies.
            const data = await context.generateRawData({ prompt: messages.map((message) => ({ ...message })), api: null, instructOverride: false, quietToLoud: false, systemPrompt: '', responseLength: null, prefill: '', jsonSchema: null });
            return { ok: true, text: context.extractMessageFromData(data, context.mainApi) };
        } catch (error) {
            return { ok: false, code: /^Cancelled by (stop event|extension)$/.test(error?.message ?? '') || error?.name === 'AbortError' ? 'ABORTED' : 'TRANSPORT_ERROR' };
        }
    }

    let ImageController = null, controllerImport = null;
    const imageFetch = (...args) => (imageEnvironment.fetch ?? globalThis.fetch)(...args);
    const importImageController = () => controllerImport ??= (async () => {
        try {
            const Controller = await (imageEnvironment.importController
                ? imageEnvironment.importController()
                : import('/scripts/slash-commands/SlashCommandAbortController.js').then(module => module.SlashCommandAbortController));
            if (typeof Controller === 'function') ImageController = Controller;
        } catch { /* a missing host module disables image generation only */ }
    })();

    function imageAvailable(context = contextOrNull()) {
        const checks = [
            ['SlashCommandParser.commands.imagine', () => {
                const callback = context?.SlashCommandParser?.commands?.imagine?.callback;
                return typeof callback === 'function' && callback.length === 2;
            }],
            ['extensionSettings.sd', () => context?.extensionSettings?.sd !== null && typeof context?.extensionSettings?.sd === 'object'],
            ['getRequestHeaders', () => typeof context?.getRequestHeaders === 'function'],
            ['getCurrentChatId', () => typeof context?.getCurrentChatId === 'function'],
            ['SlashCommandAbortController', () => ImageController !== null],
        ];
        const missing = checks.filter(([, check]) => { try { return !check(); } catch { return true; } }).map(([name]) => name);
        return { ok: missing.length === 0, missing };
    }

    function imageHostChatKey(context = contextOrNull()) {
        try {
            const key = context?.getCurrentChatId?.();
            return key == null ? null : String(key);
        } catch { return null; }
    }

    function imageOrigin() {
        try { return globalThis.location?.origin ?? null; } catch { return null; }
    }

    // Bound both workflow JSON and PNG reads before buffering; null means the ceiling was crossed.
    async function readImageBody(response, limit) {
        const reader = response.body?.getReader();
        if (!reader) return new Uint8Array();
        const bytes = new Uint8Array(limit); let size = 0;
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                size += value.byteLength;
                if (size > limit) {
                    try { await reader.cancel(); } catch { /* preserve the size refusal */ }
                    return null;
                }
                bytes.set(value, size - value.byteLength);
            }
        } finally { reader.releaseLock(); }
        return bytes.slice(0, size);
    }

    async function inspectImage() {
        await importImageController();
        const context = contextOrNull(), { missing } = imageAvailable(context);
        const snapshot = {}, options = {}, origin = imageOrigin(), hostChatKey = imageHostChatKey(context);
        let workflowText = null, workflowSha256 = null;
        try {
            const sd = context?.extensionSettings?.sd;
            for (const key of ['source', 'comfy_type', 'comfy_url', 'comfy_workflow', 'free_extend', 'multimodal_captioning', 'refine_mode', 'interactive_mode', 'function_tool', 'prompt_prefix', 'negative_prompt', 'seed', 'width', 'height', 'steps', 'scale', 'model', 'vae', 'sampler', 'scheduler', 'clip_skip', 'denoising_strength', 'comfy_placeholders']) {
                const value = sd?.[key];
                snapshot[key] = value && typeof value === 'object' ? structuredClone(value) : value;
            }
        } catch { if (!missing.includes('extensionSettings.sd')) missing.push('extensionSettings.sd'); }
        snapshot.seam = imageAvailable(context).ok;
        for (const key of ['model', 'vae', 'sampler', 'scheduler']) {
            options[key] = undefined;
            try {
                const select = (imageEnvironment.document ?? globalThis.document)?.querySelector?.('#sd_' + key);
                if (select) options[key] = Array.from(select.options, option => option.value);
            } catch { /* preflight refuses a missing option list */ }
        }
        try {
            const headers = new Headers(context.getRequestHeaders());
            headers.set('Content-Type', 'application/json');
            const response = await imageFetch(new URL('/api/sd/comfy/workflow', origin), {
                method: 'POST', headers, body: JSON.stringify({ file_name: snapshot.comfy_workflow }), redirect: 'error',
            });
            if (response.status !== 200) throw Error('workflow');
            const bytes = await readImageBody(response, 1024 * 1024);
            if (bytes === null) missing.push('workflow-too-large');
            else {
                const text = await new Response(bytes).json();
                if (typeof text === 'string') workflowText = text;
            }
        } catch { /* workflow remains unavailable */ }
        if (workflowText === null && !missing.includes('workflow-too-large')) missing.push('workflow');
        if (workflowText !== null) {
            try {
                const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(workflowText));
                workflowSha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
            } catch { missing.push('workflow-sha256'); }
        }
        return { ok: imageAvailable().ok && workflowText !== null, missing, snapshot, options, workflowText, workflowSha256, hostChatKey, origin };
    }

    function createImageController() {
        try { return ImageController ? new ImageController() : null; } catch { return null; }
    }

    async function requestImage(input) {
        const context = contextOrNull();
        if (!imageAvailable(context).ok) return { ok: false, code: 'SEAM_MISSING' };
        try {
            const raw = context.extensionSettings.sd.comfy_url;
            const url = typeof raw === 'string' ? new URL(raw) : null;
            if (!url || !['http:', 'https:'].includes(url.protocol) || !LOOPBACK_HOSTS.includes(url.hostname)) return { ok: false, code: 'URL_NOT_LOOPBACK' };
        } catch { return { ok: false, code: 'URL_NOT_LOOPBACK' }; }
        try {
            const { prompt, negative, controller } = input ?? {};
            const path = await context.SlashCommandParser.commands.imagine.callback({ quiet: 'true', gallery: 'false', negative, _abortController: controller }, prompt);
            return typeof path === 'string' && path.length > 0 ? { ok: true, path } : { ok: false, code: 'HOST_NO_RESULT' };
        } catch { return { ok: false, code: 'HOST_THREW' }; }
    }

    async function fetchImageResult(path) {
        const origin = imageOrigin(), code = resultPathProblem(path, origin);
        if (code) return { ok: false, code, path };
        try {
            const url = new URL(path, origin);
            const response = await imageFetch(url, { headers: contextOrNull().getRequestHeaders(), redirect: 'error' });
            if (response.status !== 200) return { ok: false, code: 'RESULT_FETCH_FAILED', path };
            if (response.url !== url.href) return { ok: false, code: 'RESULT_REDIRECTED', path };
            const bytes = await readImageBody(response, RESULT_LIMITS.bytes);
            if (bytes === null) return { ok: false, code: 'RESULT_TOO_LARGE', path };
            const problem = pngProblem(bytes);
            if (problem) return { ok: false, code: problem, path };
            return { ok: true, file: new File([bytes], 'generated-background.png', { type: 'image/png' }), bytes, path };
        } catch { return { ok: false, code: 'RESULT_FETCH_FAILED', path }; }
    }

    // M3.3 J6: the host's own root image listing (folder '.', PR A probe L1), dated by each file's Last-Modified (one-second resolution, L4).
    // The listing is oldest first by modification time, so the walk goes back from the newest and stops at the first file older than `since`.
    const LIST_FILES = 50; // ponytail: at most 50 dated files per Reconcile; raise it, or page the walk, if a slow backend writes more than that per job.
    async function listHostImages({ since } = {}) {
        try {
            if (!Number.isFinite(since)) return { ok: false, code: 'LIST_INVALID' };
            const context = contextOrNull(), origin = imageOrigin(), headers = new Headers(context.getRequestHeaders());
            headers.set('Content-Type', 'application/json');
            const response = await imageFetch(new URL('/api/images/list', origin), { method: 'POST', headers, body: JSON.stringify({ folder: '.', sortField: 'date' }), redirect: 'error' });
            if (response.status !== 200) return { ok: false, code: 'LIST_REFUSED' };
            const bytes = await readImageBody(response, 1024 * 1024);
            if (bytes === null) return { ok: false, code: 'LIST_TOO_LARGE' };
            const names = await new Response(bytes).json();
            if (!Array.isArray(names)) return { ok: false, code: 'LIST_INVALID' };
            const files = [];
            for (const name of names.slice().reverse()) {
                if (files.length >= LIST_FILES) break;
                const path = '/user/images/' + name;
                if (typeof name !== 'string' || resultPathProblem(path, origin)) continue;
                const url = new URL(path, origin), file = await imageFetch(url, { headers: context.getRequestHeaders(), redirect: 'error' });
                try { await file.body?.cancel(); } catch { /* only the headers are read */ }
                if (file.status !== 200 || file.url !== url.href) continue;
                const mtimeMs = Date.parse(file.headers.get('Last-Modified') ?? ''), size = Number(file.headers.get('Content-Length'));
                if (!Number.isFinite(mtimeMs)) continue;
                if (mtimeMs < since) break;
                files.push({ path, mtimeMs, size });
            }
            return { ok: true, files };
        } catch { return { ok: false, code: 'LIST_FAILED' }; }
    }

    // M3.3 J5: the host's delete route with exactly this path, after the result-path rule; the folder path never passes that rule (it is not a PNG).
    async function deleteHostCopy(path) {
        try {
            const origin = imageOrigin(), code = resultPathProblem(path, origin);
            if (code) return { ok: false, code };
            const headers = new Headers(contextOrNull().getRequestHeaders());
            headers.set('Content-Type', 'application/json');
            const response = await imageFetch(new URL('/api/images/delete', origin), { method: 'POST', headers, body: JSON.stringify({ path }), redirect: 'error' });
            return response.status === 200 ? { ok: true, code: null } : { ok: false, code: 'HOST_DELETE_' + response.status };
        } catch { return { ok: false, code: 'HOST_DELETE_FAILED' }; }
    }

    const image = { available: imageAvailable, inspect: inspectImage, createController: createImageController, request: requestImage, fetchResult: fetchImageResult, hostChatKey: imageHostChatKey, listHostImages, deleteHostCopy };

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
        const composerBindings = [];
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

            // Capture on the document so a re-rendered composer is still seen; only the target's id is read.
            const document = globalThis.document;
            if (typeof document?.addEventListener === 'function') {
                lastComposerEvent = null;
                const seen = (event) => {
                    if (disposed || event.target?.id !== COMPOSER_ID) return;
                    lastComposerEvent = clock();
                    try { onComposerInput?.(); } catch { /* a hold wake-up must not break typing */ }
                };
                for (const type of ['input', 'keydown']) {
                    document.addEventListener(type, seen, true);
                    composerBindings.push([type, seen]);
                }
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
            for (const [type, listener] of composerBindings) globalThis.document?.removeEventListener?.(type, listener, true);
            composerBindings.length = 0;
            lastComposerEvent = null;
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
            for (const [type, listener] of composerBindings) {
                try { globalThis.document?.removeEventListener?.(type, listener, true); } catch (error) { firstError ||= error; }
            }
            composerBindings.length = 0;
            lastComposerEvent = null;
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

    return { image, inspectCapabilities, inspectDirector, inspectComposer, requestDirectorText, readChatIdentity, readMessageAt, readCurrentSource, readHistory, subscribe, openOriginalMessage };
}
