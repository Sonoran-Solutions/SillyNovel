/** Pure memory-only decision log and session tallies (G3, G4). See docs/M2_4_EVIDENCE_UI_IMPLEMENTATION.md. */
export const LOG_LIMIT = 64, SAMPLE_LIMIT = 64;
const SOURCE_KEYS = ['key', 'revision', 'swipeRevision', 'fingerprintVersion', 'prefixSha256'];
// Codes come from our own modules; one that does not look like a code (a thrown message, say) is never held.
const safeCode = code => typeof code === 'string' && /^[A-Z][A-Z0-9_]*$/.test(code) ? code : 'UNKNOWN';
const sameSource = (a, b) => Boolean(a && b) && SOURCE_KEYS.every(key => a[key] === b[key]);
const bump = (counts, key) => { counts[key] = (counts[key] ?? 0) + 1; };
// Field by field: whatever else a caller passes (raw response, refusal detail, suggestion label) is never held.
function copyUpdate({ field, characterKey, targetId, before, disposition, commandRevision, overlayEpoch, evidence }) {
    return Object.freeze({ field, disposition,
        ...(characterKey === undefined ? {} : { characterKey }), ...(targetId === undefined ? {} : { targetId }), ...(before === undefined ? {} : { before }),
        ...(commandRevision === undefined ? {} : { commandRevision, overlayEpoch }),
        ...(evidence ? { evidence: Object.freeze({ sourceMessageKey: evidence.sourceMessageKey, excerpt: evidence.excerpt }) } : {}) });
}
function copySource(source) {
    return source ? Object.freeze(Object.fromEntries(SOURCE_KEYS.map(key => [key, source[key]]))) : null;
}
const stripExcerpts = entry => Object.freeze({ ...entry, messageChanged: true, updates: Object.freeze(entry.updates.map(({ evidence, ...rest }) => Object.freeze(rest))) });

/** One per controller, so it has the attachment's lifetime and a chat switch discards it. */
export function createDecisionLog() {
    let entries = [], seq = 0;
    return {
        record({ source = null, outcome, code, elapsedMs = null, promptVersion = null, updates = [] }) {
            const entry = Object.freeze({ seq: ++seq, source: copySource(source), outcome, code: safeCode(code), elapsedMs, promptVersion, messageChanged: false, updates: Object.freeze(updates.map(copyUpdate)) });
            entries = [...entries, entry].slice(-LOG_LIMIT);
            return entry;
        },
        /** Text the user edited away must not linger: excerpts go as soon as the anchored record stops matching; outcome and code stay. */
        reconcile(sources) {
            if (entries.some(entry => entry.source && !entry.messageChanged && !sameSource(entry.source, sources.find(item => item.key === entry.source.key)))) {
                entries = entries.map(entry => !entry.source || entry.messageChanged || sameSource(entry.source, sources.find(item => item.key === entry.source.key)) ? entry : stripExcerpts(entry));
            }
        },
        /** A layout update from before the overlay's current epoch had its command cleared by a rebase (F8, disable, a changed first source). */
        entries(overlayEpoch) {
            return entries.map(entry => entry.updates.some(update => update.overlayEpoch !== undefined && update.overlayEpoch !== overlayEpoch)
                ? { ...entry, updates: entry.updates.map(update => update.overlayEpoch !== undefined && update.overlayEpoch !== overlayEpoch ? { ...update, cleared: true } : update) } : entry);
        },
    };
}

/** Lives in `runtime.session`, next to `count` (E6). Numbers only; no story text. */
export const createTallies = () => ({ outcomes: {}, codes: {}, dispositions: {}, pauses: {}, elapsed: [] });
export function tallyEntry(tallies, { outcome, code, elapsedMs, updates }) {
    bump(tallies.outcomes, outcome);
    bump(tallies.codes, code);
    for (const { field, disposition } of updates) bump(tallies.dispositions[field] ??= {}, disposition);
    if (elapsedMs !== null) { tallies.elapsed.push(elapsedMs); if (tallies.elapsed.length > SAMPLE_LIMIT) tallies.elapsed.shift(); }
}
export const tallyPause = (tallies, code) => bump(tallies.pauses, safeCode(code));
export function summarizeTallies({ outcomes, codes, dispositions, pauses, elapsed }) {
    const sorted = [...elapsed].sort((a, b) => a - b), middle = sorted.length >> 1;
    return { outcomes: { ...outcomes }, codes: { ...codes }, pauses: { ...pauses },
        dispositions: Object.fromEntries(Object.entries(dispositions).map(([field, counts]) => [field, { ...counts }])),
        elapsed: sorted.length ? { min: sorted[0], median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, max: sorted.at(-1), samples: sorted.length } : null };
}
