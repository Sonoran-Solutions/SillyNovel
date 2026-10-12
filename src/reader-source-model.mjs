function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
}

function sameContent(left, right) {
    return left.sourceKey === right.sourceKey
        && left.identity?.chatId === right.identity?.chatId
        && left.identity?.groupId === right.identity?.groupId
        && left.identity?.characterId === right.identity?.characterId
        && left.text === right.text
        && left.author.kind === right.author.kind
        && left.author.label === right.author.label
        && left.swipeId === right.swipeId;
}

function ownerKey(owner) {
    if (!owner) return null;
    return JSON.stringify([owner.chatId ?? null, owner.groupId ?? null, owner.characterId ?? null, owner.scope ?? 'unknown']);
}

export function createReaderSourceModel() {
    let sessionEpoch = 0;
    let owner = null;
    let records = [];
    let head = null;
    let cursor = null;
    let selectionMode = 'followLatest';
    let selectionState = 'valid';
    let newMessageCount = 0;
    let generationSequence = 0;
    let generation = null;
    let generationStartMessageCount = 0;
    let sourceRevision = 0;
    let viewRevision = 0;
    let textScrollMode = 'followBottom';

function revise(snapshot, previous) {
        if (previous && sameContent(previous, snapshot)) {
            return previous.index === snapshot.index ? previous : freeze({ ...previous, index: snapshot.index });
        }
        sourceRevision++;
        return freeze({ ...snapshot, revision: sourceRevision });
    }

    function setHistory(history = []) {
        const previousByKey = new Map(records.filter(Boolean).map((record) => [record.sourceKey, record]));
        const counts = new Map();
        for (const source of history) {
            if (source?.sourceKey !== null && source?.sourceKey !== undefined) {
                counts.set(source.sourceKey, (counts.get(source.sourceKey) || 0) + 1);
            }
        }
        records = history.map((source, index) => {
            if (!source || source.sourceKey === null || source.sourceKey === undefined || counts.get(source.sourceKey) !== 1) return null;
            const old = previousByKey.get(source.sourceKey);
            return revise({ ...source, index, identity: source.identity ? { ...source.identity } : null, author: { ...source.author } }, old);
        });
        head = records.at(-1) ?? null;
    }

    function activate(history, nextOwner) {
        sessionEpoch++;
        owner = nextOwner ? { ...nextOwner } : null;
        records = [];
        head = null;
        cursor = null;
        selectionMode = 'followLatest';
        selectionState = head ? 'valid' : 'empty';
        newMessageCount = 0;
        generation = null;
        generationStartMessageCount = 0;
        setHistory(history);
        cursor = head;
        selectionState = head ? 'valid' : 'empty';
        viewRevision++;
        return getSnapshot();
    }

    function reconcile(history, { kind = 'reconcile' } = {}) {
        const prior = records;
        const priorKeys = prior.filter(Boolean).map((record) => record.sourceKey);
        setHistory(history);
        const nextKeys = records.filter(Boolean).map((record) => record.sourceKey);
        const addedAtEnd = nextKeys.slice(priorKeys.length).filter((key) => !priorKeys.includes(key)).length;
        if (selectionMode === 'followLatest') {
            cursor = head;
            selectionState = head ? 'valid' : 'empty';
            newMessageCount = 0;
        } else if (cursor) {
            const matches = records.filter((record) => record?.sourceKey === cursor.sourceKey);
            if (matches.length === 1) {
                cursor = matches[0];
                selectionState = 'valid';
            } else {
                cursor = null;
                selectionState = kind === 'messageDeleted' ? 'deleted' : 'invalidated';
            }
            if (addedAtEnd) newMessageCount = Math.min(99, newMessageCount + addedAtEnd);
        }
        if (generation?.status === 'streaming' && !generation.sourceKey) {
            const candidate = records.find((record) => record?.index >= generationStartMessageCount
                && record.author.kind === 'character' && !priorKeys.includes(record.sourceKey));
            if (candidate) generation = { ...generation, sourceKey: candidate.sourceKey, sourceRevision: candidate.revision };
        }
        if (generation && generation.sourceKey) {
            const generatedSource = records.find((record) => record?.sourceKey === generation.sourceKey);
            if (generatedSource) generation = { ...generation, sourceRevision: generatedSource.revision };
        }
        viewRevision++;
        return getSnapshot();
    }

    function updateTracked(sources) {
        if (!Array.isArray(sources) || !sources.length) return getSnapshot();
        const byKey = new Map(sources.filter(Boolean).map((source) => [source.sourceKey, source]));
        records = records.map((record) => {
            const update = record && byKey.get(record.sourceKey);
            return update ? revise({ ...update, index: record.index, identity: update.identity ? { ...update.identity } : null, author: { ...update.author } }, record) : record;
        });
        const latest = sources.find((source) => source && source.index === records.length - 1);
        if (latest && head?.sourceKey === latest.sourceKey) head = records.at(-1) ?? revise(latest, head);
        if (cursor) cursor = records.find((record) => record?.sourceKey === cursor.sourceKey) ?? cursor;
        if (generation?.status === 'streaming' && latest && generation.sourceKey === latest.sourceKey) generation = { ...generation, sourceRevision: latest.revision };
        viewRevision++;
        return getSnapshot();
    }

    function reconcileSample(sources, messageCount) {
        if (!Number.isSafeInteger(messageCount) || messageCount < 0 || messageCount < records.length || messageCount > records.length + 1) return getSnapshot();
        const previousCount = records.length;
        const byIndex = new Map((sources ?? []).filter(Boolean).map((source) => [source.index, source]));
        if (messageCount === previousCount + 1) {
            const appended = byIndex.get(messageCount - 1);
            const previousTail = byIndex.get(messageCount - 2);
            if (!appended || appended.sourceKey === null || appended.sourceKey === undefined
                || (previousCount > 0 && (!previousTail || previousTail.sourceKey !== records.at(-1)?.sourceKey))
                || records.some((record) => record?.sourceKey === appended.sourceKey)) return getSnapshot();
            records.push(revise({ ...appended, index: messageCount - 1, identity: appended.identity ? { ...appended.identity } : null, author: { ...appended.author } }, null));
            head = records.at(-1);
            if (selectionMode === 'followLatest') {
                cursor = head;
                selectionState = 'valid';
                newMessageCount = 0;
            } else {
                newMessageCount = Math.min(99, newMessageCount + 1);
            }
            if (generation?.status === 'streaming' && !generation.sourceKey
                && head?.index >= generationStartMessageCount && head.author.kind === 'character') {
                generation = { ...generation, sourceKey: head.sourceKey, sourceRevision: head.revision };
            }
        }
        for (const source of sources ?? []) {
            if (!source || source.index < 0 || source.index >= records.length) continue;
            const previous = records[source.index];
            const next = revise({ ...source, index: source.index, identity: source.identity ? { ...source.identity } : null, author: { ...source.author } }, previous);
            records[source.index] = next;
            if (selectionMode === 'pinned' && previous?.sourceKey !== source.sourceKey && cursor?.sourceKey === previous?.sourceKey) {
                cursor = null;
                selectionState = 'invalidated';
            }
        }
        head = records.at(-1) ?? null;
        if (selectionMode === 'followLatest') {
            cursor = head;
            selectionState = head ? 'valid' : 'empty';
        }
        else if (cursor) cursor = records[cursor.index] ?? cursor;
        if (generation?.sourceKey) {
            const generatedSource = records.find((record) => record?.sourceKey === generation.sourceKey);
            if (generatedSource) generation = { ...generation, sourceRevision: generatedSource.revision };
        }
        viewRevision++;
        return getSnapshot();
    }

    function apply(observation = {}) {
        if (observation.type === 'chatChanged') return activate(observation.history ?? [], observation.owner ?? null);
        if (observation.owner && ownerKey(observation.owner) !== ownerKey(owner)) return activate(observation.history ?? [], observation.owner);

        if (observation.type === 'generationStarted') {
            if (observation.dryRun) return getSnapshot();
            generationSequence++;
            const type = observation.generationType ?? null;
            const mayReuseHead = (type === 'continue' || type === 'swipe') && head?.author.kind === 'character';
            generation = {
                id: generationSequence,
                type,
                sourceKey: mayReuseHead ? head.sourceKey : null,
                sourceRevision: mayReuseHead ? head.revision : null,
                status: 'streaming',
                stopped: false,
            };
            generationStartMessageCount = records.length;
            viewRevision++;
        } else if (observation.type === 'generationStopped') {
            if (generation) generation = { ...generation, status: 'stopped-partial', stopped: true };
            viewRevision++;
        } else if (observation.type === 'generationEnded') {
            if (generation && !generation.stopped) generation = { ...generation, status: 'unknown' };
            viewRevision++;
        }

        if (Array.isArray(observation.history)) return reconcile(observation.history, { kind: observation.type });
        if (Array.isArray(observation.sources)) return reconcileSample(observation.sources, observation.messageCount);
        if (observation.source) return updateTracked([observation.source]);
        return getSnapshot();
    }

    function navigate(direction) {
        if (!cursor || (direction !== -1 && direction !== 1)) return false;
        let index = cursor.index + direction;
        while (index >= 0 && index < records.length && !records[index]) index += direction;
        const next = records[index];
        if (!next) return false;
        cursor = next;
        selectionMode = 'pinned';
        selectionState = 'valid';
        viewRevision++;
        return true;
    }

    function jumpToLatest() {
        cursor = head;
        selectionMode = 'followLatest';
        selectionState = head ? 'valid' : 'empty';
        newMessageCount = 0;
        viewRevision++;
    }

    function setTextScrollMode(mode) {
        if (mode !== 'followBottom' && mode !== 'userControlled') return false;
        if (textScrollMode === mode) return false;
        textScrollMode = mode;
        viewRevision++;
        return true;
    }

    function getSnapshot() {
        return freeze({
            owner: owner ? { ...owner } : null,
            sessionEpoch,
            head,
            cursor,
            selectionMode,
            selectionState,
            newMessageCount,
            newMessageIndicator: newMessageCount ? (newMessageCount >= 99 ? '99+' : String(newMessageCount)) : null,
            sourceRevision,
            viewRevision,
            generation: generation ? { ...generation } : { id: null, type: null, sourceKey: null, sourceRevision: null, status: 'unknown', stopped: false },
            textScroll: { mode: textScrollMode, followsMessages: false },
        });
    }

    function getTrackedIndices() {
        return [head?.index, cursor?.index].filter(Number.isSafeInteger);
    }

    return { activate, apply, reconcile, navigate, jumpToLatest, setTextScrollMode, getSnapshot, getTrackedIndices };
}
