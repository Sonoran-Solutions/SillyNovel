const TAGS = ['p', 'br', 'em', 'strong', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'del', 's', 'table', 'thead', 'tbody', 'tr', 'th', 'td'];

export function createMessageFormatter({ showdown, DOMPurify }, document) {
    if (typeof showdown?.Converter !== 'function' || typeof DOMPurify?.sanitize !== 'function' || !DOMPurify.isSupported) {
        throw new Error('Message formatting is unavailable. Standard chat is available; reload to retry.');
    }
    const converter = new showdown.Converter({ simpleLineBreaks: true, literalMidWordUnderscores: true, tables: true, strikethrough: true, noHeaderId: true });
    return (text) => {
        // Template contents are inert and never mounted. Keep head-only markup visible to
        // the sanitizer so removed script/style text triggers a complete plain-text fallback.
        const template = document.createElement('template');
        template.innerHTML = converter.makeHtml(text);
        const fragment = DOMPurify.sanitize(template.content, {
            // DOMPurify creates a BODY wrapper while parsing a fragment.
            ALLOWED_TAGS: ['body', ...TAGS],
            ALLOWED_ATTR: ['href', 'title', 'start', 'class'],
            ALLOW_DATA_ATTR: false,
            ALLOW_ARIA_ATTR: false,
            RETURN_DOM_FRAGMENT: true,
            RETURN_TRUSTED_TYPE: false,
        });
        let unsupported = DOMPurify.removed.length > 0;
        for (const element of fragment.querySelectorAll('*')) {
            if (!TAGS.includes(element.localName) || element.namespaceURI !== 'http://www.w3.org/1999/xhtml') unsupported = true;
            // Host hooks and language classes cannot grant styling or host UI behavior.
            for (const attribute of [...element.attributes]) {
                if (!['href', 'title', 'start'].includes(attribute.name)) element.removeAttribute(attribute.name);
            }
            if (element.tagName !== 'A') continue;
            const href = element.getAttribute('href') ?? '';
            try {
                const url = new URL(href);
                if (!['http:', 'https:', 'mailto:'].includes(url.protocol) || /[\u0000-\u0020\u007f]/.test(href)) unsupported = true;
            } catch { unsupported = true; }
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
        }
        if (unsupported) {
            const plain = document.createElement('div');
            plain.className = 'sillynovel-dialogue__plain';
            plain.textContent = text;
            return { content: plain, fallback: true };
        }
        return { content: fragment, fallback: false };
    };
}

// Keep unchanged nodes (and text ranges) during streaming instead of replacing the panel.
function updateContent(target, source) {
    const desired = [...source.childNodes];
    desired.forEach((node, index) => {
        const current = target.childNodes[index];
        if (!current || current.nodeType !== node.nodeType || current.nodeName !== node.nodeName) {
            if (current) current.replaceWith(node);
            else target.append(node);
        } else if (node.nodeType === 3) {
            let prefix = 0;
            while (prefix < current.data.length && current.data[prefix] === node.data[prefix]) prefix++;
            if (current.data !== node.data) current.replaceData(prefix, current.data.length - prefix, node.data.slice(prefix));
        } else if (node.nodeType === 1) {
            for (const attribute of [...current.attributes]) current.removeAttribute(attribute.name);
            for (const attribute of [...node.attributes]) current.setAttribute(attribute.name, attribute.value);
            updateContent(current, node);
        }
    });
    while (target.childNodes.length > desired.length) target.lastChild.remove();
}

function textPoint(element, offset) {
    const walker = element.ownerDocument.createTreeWalker(element, 4); // SHOW_TEXT
    let node;
    while ((node = walker.nextNode())) {
        if (offset <= node.length) return [node, offset];
        offset -= node.length;
    }
    return [element, element.childNodes.length];
}

export function mountReader({ document, snapshot, formatMessage, actions }) {
    const shell = document.getElementById('sheld');
    const chat = document.getElementById('chat');
    if (!shell || !chat || chat.parentElement !== shell || !document.getElementById('send_textarea')) {
        throw new Error('SillyTavern chat/composer container is unavailable. Standard chat remains available.');
    }
    if (document.getElementById('sillynovel-stage') || chat.classList.contains('sillynovel-native-hidden')) {
        throw new Error('An unowned SillyNovel surface already exists. Standard chat was left untouched.');
    }
    const listeners = [];
    const listen = (element, type, callback) => {
        element.addEventListener(type, callback);
        listeners.push(() => element.removeEventListener(type, callback));
    };
    const make = (tag, className, text) => {
        const element = document.createElement(tag);
        element.className = className;
        if (text) element.textContent = text;
        return element;
    };
    const button = (text, callback) => {
        const element = make('button', 'menu_button sillynovel-button', text);
        element.type = 'button';
        listen(element, 'click', () => {
            try { callback(); } catch (error) { actions.fail(error); }
        });
        return element;
    };
    const stage = make('section', 'sillynovel-stage');
    stage.id = 'sillynovel-stage';
    stage.setAttribute('aria-label', 'SillyNovel reader');
    const header = make('header', 'sillynovel-reader__header');
    const author = make('h2', 'sillynovel-reader__author');
    const position = make('span', 'sillynovel-reader__position');
    const status = make('p', 'sillynovel-reader__status');
    status.setAttribute('role', 'status');
    const dialogue = make('article', 'sillynovel-dialogue');
    dialogue.tabIndex = 0;
    dialogue.setAttribute('aria-label', 'Selected message');
    const message = make('div', 'sillynovel-dialogue__message');
    dialogue.append(message);
    const navigation = make('nav', 'sillynovel-reader__navigation');
    navigation.setAttribute('aria-label', 'Reader navigation');
    const previous = button('Previous', () => actions.navigate(-1));
    const next = button('Next', () => actions.navigate(1));
    const latest = button('Jump to Latest', () => actions.jumpToLatest());
    const unread = make('span', 'sillynovel-reader__unread');
    unread.setAttribute('role', 'status');
    const follow = button('Follow text', () => {
        dialogue.scrollTop = dialogue.scrollHeight;
        actions.setTextScrollMode('followBottom');
        follow.hidden = true;
    });
    const backlog = button('Backlog', openBacklog);
    backlog.title = 'Open Original Message in native chat';
    const copy = button('Copy message', async () => {
        const copiedSnapshot = actions.getSnapshot();
        if (!copiedSnapshot.cursor) return;
        function stillSelected() {
            const current = actions.getSnapshot();
            return !disposed && current.sessionEpoch === copiedSnapshot.sessionEpoch
                && current.cursor?.sourceKey === copiedSnapshot.cursor.sourceKey
                && current.cursor?.revision === copiedSnapshot.cursor.revision;
        }
        try {
            await globalThis.navigator.clipboard.writeText(copiedSnapshot.cursor.text);
            if (stillSelected()) status.textContent = 'Message copied.';
        } catch {
            if (stillSelected()) status.textContent = 'Copy unavailable. Select the message text to copy, or open the original.';
        }
    });
    header.append(author, position, button('Back to Chat', () => showChat('Standard chat. Return to Reader keeps your selection.')));
    navigation.append(previous, next, backlog, latest, unread, follow, copy);
    stage.append(header, status, dialogue, navigation);
    const nativeBar = make('div', 'sillynovel-native-bar');
    nativeBar.hidden = true;
    const handoffStatus = make('span', 'sillynovel-native-bar__status');
    handoffStatus.setAttribute('role', 'status');
    const returnToReader = button('Return to Reader', () => {
        const transferFocus = nativeBar.contains(document.activeElement);
        stage.hidden = false;
        nativeBar.hidden = true;
        render({ reader: actions.getSnapshot() });
        chat.classList.add('sillynovel-native-hidden');
        if (transferFocus) dialogue.focus({ preventScroll: true });
    });
    nativeBar.append(returnToReader, handoffStatus);
    let disposed = false;
    let renderedSource = null;
    let renderedEpoch = null;
    let fallback = false;
    let resetScroll = false;

    function showChat(text) {
        const transferFocus = stage.contains(document.activeElement);
        chat.classList.remove('sillynovel-native-hidden');
        stage.hidden = true;
        nativeBar.hidden = false;
        handoffStatus.textContent = text;
        if (transferFocus) returnToReader.focus({ preventScroll: true });
    }
    function openBacklog() {
        showChat('Native backlog.');
        const found = actions.openOriginal();
        if (!disposed) handoffStatus.textContent = found
            ? 'Original message located. Native chat owns editing and swipes.'
            : 'Exact source could not be located. Browse native history; load earlier messages if needed.';
    }
    function atBottom() {
        return dialogue.scrollHeight - dialogue.clientHeight - dialogue.scrollTop <= 8;
    }
    listen(dialogue, 'scroll', () => {
        if (disposed || stage.hidden) return;
        const bottom = atBottom();
        actions.setTextScrollMode(bottom ? 'followBottom' : 'userControlled');
        follow.hidden = bottom;
    });
    // Pointer activation can leave an actively edited native draft/IME focused.
    for (const surface of [stage, nativeBar]) listen(surface, 'pointerdown', (event) => {
        if (event.target.closest('button') && document.activeElement === document.getElementById('send_textarea')) event.preventDefault();
    });

    function render({ reader }) {
        if (disposed) return;
        if (!stage.isConnected || !chat.isConnected || chat.parentElement !== shell) throw new Error('Reader container changed. Standard chat restored; reload to retry.');
        const source = reader.cursor;
        const changedSelection = renderedEpoch !== reader.sessionEpoch || renderedSource?.sourceKey !== source?.sourceKey;
        resetScroll ||= changedSelection;
        const scrollTop = dialogue.scrollTop;
        const bottom = !changedSelection && reader.textScroll.mode === 'followBottom';
        author.textContent = source ? source.author.label + ' · ' + ({ user: 'You', system: 'System', character: 'Character' }[source.author.kind] ?? 'Unknown author') : 'No selected message';
        position.textContent = source ? 'Message ' + (source.index + 1) + (reader.head ? ' of ' + (reader.head.index + 1) : ' · latest unavailable') : '';
        if (changedSelection || renderedSource?.revision !== source?.revision) {
            if (source) {
                const result = formatMessage(source.text);
                fallback = result.fallback;
                const container = document.createElement('div');
                container.append(result.content);
                const selection = document.getSelection();
                const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
                const selectedText = !changedSelection && range && message.contains(range.startContainer)
                    && message.contains(range.endContainer) ? selection.toString() : '';
                let selectedOffset = 0;
                const backward = range && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
                if (selectedText) {
                    const prefix = range.cloneRange();
                    prefix.selectNodeContents(message);
                    prefix.setEnd(range.startContainer, range.startOffset);
                    selectedOffset = prefix.toString().length;
                }
                updateContent(message, container);
                // Closing Markdown can change element structure. Re-anchor a still-present
                // selection within this same source, never use text as message identity.
                if (selectedText) {
                    const text = message.textContent;
                    let closest = -1;
                    for (let index = text.indexOf(selectedText); index !== -1; index = text.indexOf(selectedText, index + 1)) {
                        if (closest === -1 || Math.abs(index - selectedOffset) < Math.abs(closest - selectedOffset)) closest = index;
                    }
                    if (closest !== -1) {
                        const start = textPoint(message, closest);
                        const end = textPoint(message, closest + selectedText.length);
                        selection.setBaseAndExtent(...(backward ? end : start), ...(backward ? start : end));
                    }
                }
            } else {
                message.textContent = reader.selectionState === 'deleted' ? 'This selected message was deleted. Jump to Latest to continue reading.'
                    : reader.selectionState === 'invalidated' ? 'This selection is unavailable because its source changed. Jump to Latest to continue reading.'
                    : 'No message is available. Open a conversation or send a message below.';
                fallback = false;
            }
            renderedSource = source;
            renderedEpoch = reader.sessionEpoch;
            if (!stage.hidden) {
                dialogue.scrollTop = resetScroll ? 0 : bottom ? dialogue.scrollHeight : scrollTop;
                resetScroll = false;
                actions.setTextScrollMode(atBottom() ? 'followBottom' : 'userControlled');
            }
        }
        if (resetScroll && !stage.hidden) {
            dialogue.scrollTop = 0;
            resetScroll = false;
            actions.setTextScrollMode(atBottom() ? 'followBottom' : 'userControlled');
        }
        const generation = reader.generation;
        const readingStatus = source?.text === '' ? 'This message has no text.'
            : generation.sourceKey === source?.sourceKey && generation.status === 'streaming' ? 'Reply streaming…'
            : generation.sourceKey === source?.sourceKey && generation.status === 'stopped-partial' ? 'Stopped · partial reply'
            : generation.status === 'streaming' ? 'A new reply is being generated…'
            : source ? 'Completion status unknown' : '';
        const statusText = (fallback ? 'Plain text for unsupported or unsafe content. Use Backlog to open the original message. ' : '') + readingStatus;
        if (status.textContent !== statusText) status.textContent = statusText;
        previous.disabled = !reader.navigation.previous;
        next.disabled = !reader.navigation.next;
        copy.disabled = !source;
        const unreadText = reader.newMessageIndicator ? reader.newMessageIndicator + ' new' : '';
        if (unread.textContent !== unreadText) unread.textContent = unreadText;
        latest.disabled = reader.selectionMode === 'followLatest' && !reader.newMessageCount;
        follow.hidden = !source || atBottom();
        if (changedSelection && stage.hidden) handoffStatus.textContent = 'Conversation or selection changed. Return to Reader opens the current selection.';
    }
    function dispose() {
        disposed = true;
        // Restore visibility first, even if later cleanup fails.
        chat.classList.remove('sillynovel-native-hidden');
        for (const remove of listeners.splice(0)) remove();
        stage.remove();
        nativeBar.remove();
    }
    try {
        shell.insertBefore(stage, chat);
        shell.insertBefore(nativeBar, chat);
        render({ reader: snapshot });
        chat.classList.add('sillynovel-native-hidden');
    } catch (error) { dispose(); throw error; }
    return { update: render, dispose };
}
