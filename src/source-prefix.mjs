// Retained encoded history is bounded; no full transcript prefix is a cache key.
export const MAX_PREFIX_BYTES = 8 * 1024 * 1024;
export const MAX_PREFIX_MS = 5000;
const encoder = new TextEncoder();

/** Exact sn-source-v1 bytes, native SHA-256, and reuse up to the first changed source.
 * Reader revisions attest immutable content; neither revisions nor digests prove ownership.
 * Returns null when the caller's source/session/selection authority changed while hashing.
 */
export async function fingerprintHistory(history, ownerKey, previous, isCurrent) {
    const started = performance.now();
    const check = () => {
        if (!isCurrent()) return false;
        if (performance.now() - started > MAX_PREFIX_MS) throw Error('Visual history validation exceeded 5 seconds. Continue with text or use a shorter chat for visuals.');
        return true;
    };
    const prior = previous?.ownerKey === ownerKey ? previous.entries : [];
    const header = encoder.encode(JSON.stringify(['sn-source-v1', ownerKey, 'session', ownerKey]).slice(0, -1) + ',[');
    let size = header.length + 2, firstChanged = history.length;
    const entries = history.map((source, index) => {
        check();
        const old = prior[index];
        const same = old?.key === source.sourceKey && old.revision === source.revision && old.swipeRevision === (source.swipeId ?? 0);
        if (!same) firstChanged = Math.min(firstChanged, index);
        let entry = old;
        if (!same) {
            if (source.text.length > MAX_PREFIX_BYTES) throw Error('Visual history exceeds the 8 MiB limit. Continue with text or use a shorter chat for visuals.');
            const bytes = encoder.encode(JSON.stringify([source.author.kind, ['unresolved', source.author.label], source.text,
                source.swipeId == null ? null : [String(source.swipeId), source.text]]));
            entry = { key: source.sourceKey, revision: source.revision, swipeRevision: source.swipeId ?? 0, bytes };
        }
        size += entry.bytes.length + (index ? 1 : 0);
        if (size > MAX_PREFIX_BYTES) throw Error('Visual history exceeds the 8 MiB limit. Continue with text or use a shorter chat for visuals.');
        return entry;
    });
    if (!check()) return null;
    const sources = previous?.ownerKey === ownerKey ? previous.sources.slice(0, firstChanged) : [];
    if (firstChanged < history.length) {
        // ponytail: native SHA-256 still reads quadratic bytes on cold loads; 8 MiB / 5s
        // ceilings bound this prototype. Larger histories need measured incremental SHA.
        // One scratch buffer supplies exact prefixes; unchanged digests are reused.
        const buffer = new Uint8Array(size);
        buffer.set(header);
        let end = header.length;
        for (let index = 0; index < entries.length; index++) {
            if (index) buffer[end++] = 44; // comma overwrites the prior prefix's closing brackets
            const { bytes, ...source } = entries[index];
            buffer.set(bytes, end); end += bytes.length;
            if (index < firstChanged) continue;
            if (!check()) return null;
            buffer[end] = 93; buffer[end + 1] = 93;
            const digest = await crypto.subtle.digest('SHA-256', buffer.subarray(0, end + 2));
            if (!check()) return null;
            sources.push({ ...source, fingerprintVersion: 'sn-source-v1',
                prefixSha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('') });
        }
    }
    return { ownerKey, entries, sources };
}
