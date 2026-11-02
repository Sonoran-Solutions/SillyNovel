/** Pure director proposal v1 rules over the manual reducer. See docs/M2_1_DIRECTOR_IMPLEMENTATION.md. */
import { projectScene, reduceScene } from './scene-reducer.mjs';
import { evidenceStamp } from './transient-scene.mjs';

/**
 * @typedef {{sourceMessageKey: string, excerpt: string}} ProposalEvidence
 * @typedef {{op: 'setCharacter', characterKey: string, present?: boolean, outfitId?: string, expressionId?: string, evidence: ProposalEvidence} |
 *   {op: 'setLocation', backgroundId: string, evidence: ProposalEvidence} |
 *   {op: 'suggestLocation', label: string, evidence: ProposalEvidence}} ProposalUpdate
 * @typedef {{schemaVersion: 1, updates: ProposalUpdate[]}} DirectorProposal
 * @typedef {{authority: import('./scene-reducer.mjs').SceneAuthority, expectedOverrideRevision: number, evidenceStamp: string,
 *   selectionRevision: number, historyRevision: number, globalRevision: number,
 *   source: import('./scene-reducer.mjs').SceneSource, promptVersion: string}} ProposalToken
 */
export const PROPOSAL_SCHEMA_VERSION = 1;
const MAX_UPDATES = 16, MAX_EXCERPT = 200, MAX_LABEL = 80, MAX_WINDOW = 6;
const UPDATE_KEYS = { setCharacter: ['characterKey', 'present', 'outfitId', 'expressionId'], setLocation: ['backgroundId'], suggestLocation: ['label'] };
const TOKEN_KEYS = ['authority', 'expectedOverrideRevision', 'evidenceStamp', 'selectionRevision', 'historyRevision', 'globalRevision', 'source', 'promptVersion'];
const SOURCE_KEYS = ['key', 'revision', 'swipeRevision', 'fingerprintVersion', 'prefixSha256'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const text = value => typeof value === 'string' && value.length > 0;
const revision = value => Number.isSafeInteger(value) && value >= 0;
const length = value => Array.from(value).length;
// Own keys only, including symbols and non-enumerables; accessors could answer differently on each read.
const exact = (value, allowed) => record(value) && Reflect.ownKeys(value).every(key => allowed.includes(key)
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
const list = value => Array.isArray(value) && Reflect.ownKeys(value).length === value.length + 1;
const sameSource = (a, b) => record(a) && record(b) && SOURCE_KEYS.every(key => a[key] === b[key]);
function freeze(value) {
    if (value && typeof value === 'object') {
        for (const child of Object.values(value)) freeze(child);
        Object.freeze(value);
    }
    return value;
}
const refusal = (code, detail) => freeze({ accepted: false, code, detail });
function validLabel(label) {
    if (typeof label !== 'string') return false;
    const trimmed = label.trim();
    return trimmed.length > 0 && length(trimmed) <= MAX_LABEL && !/\p{Cc}/u.test(trimmed);
}
function validUpdate(update) {
    if (!record(update) || typeof update.op !== 'string' || !Object.hasOwn(UPDATE_KEYS, update.op)) return false;
    if (!exact(update, ['op', 'evidence', ...UPDATE_KEYS[update.op]])) return false;
    if (update.op === 'setLocation') return text(update.backgroundId);
    if (update.op === 'suggestLocation') return validLabel(update.label);
    const has = key => Object.hasOwn(update, key);
    return text(update.characterKey) && (has('present') || has('outfitId') || has('expressionId'))
        && (!has('present') || typeof update.present === 'boolean')
        && (!has('outfitId') || text(update.outfitId)) && (!has('expressionId') || text(update.expressionId));
}
function validEvidence(evidence, texts, window) {
    if (!exact(evidence, ['sourceMessageKey', 'excerpt'])) return false;
    const { sourceMessageKey: key, excerpt } = evidence;
    return typeof key === 'string' && window.includes(key) && typeof excerpt === 'string' && excerpt.trim().length > 0
        && length(excerpt) <= MAX_EXCERPT && texts[key].includes(excerpt);
}
/** The anchored selected source plus up to five directly prior sources, each with its exact text. */
function validWindow(window, texts, context) {
    if (!list(window) || window.length < 1 || window.length > MAX_WINDOW || !record(texts)) return false;
    const keys = context.sources.map(source => source.key), end = keys.indexOf(context.selectedSourceKey);
    return window.every((key, index) => key === keys[end - window.length + 1 + index]
        && Object.hasOwn(texts, key) && typeof texts[key] === 'string');
}
function assetError(context, kind, assetId, characterKey, outfitId) {
    const asset = context.catalog.assets.find(item => item.id === assetId);
    if (!asset) return 'UNKNOWN_ASSET';
    if (asset.kind !== kind || kind !== 'background' && (asset.characterKey !== characterKey
        || kind === 'expression' && asset.outfitId !== outfitId)) return 'INCOMPATIBLE_ASSET';
    return null;
}
function identityError(update, context, view) {
    if (update.op === 'suggestLocation') return null;
    if (update.op === 'setLocation') return assetError(context, 'background', update.backgroundId);
    const actor = view.cast.find(item => item.key === update.characterKey);
    if (!context.characters.some(item => item.key === update.characterKey)) return 'UNRESOLVED_CHARACTER';
    if (!actor) return 'CHARACTER_NOT_ADDED';
    const outfit = Object.hasOwn(update, 'outfitId') ? update.outfitId : actor.outfit?.id ?? null;
    return (update.outfitId && assetError(context, 'outfit', update.outfitId, actor.key))
        || (update.expressionId && assetError(context, 'expression', update.expressionId, actor.key, outfit)) || null;
}
function conflictIndex(updates) {
    const seen = new Set();
    for (const [index, update] of updates.entries()) {
        const target = update.op === 'setLocation' ? 'location' : update.op === 'setCharacter' ? 'character:' + update.characterKey : null;
        if (target && seen.has(target)) return index;
        if (target) seen.add(target);
    }
    return -1;
}
/**
 * Whole-proposal validation against one scene. Refusal details name positions and rules,
 * never model text. A valid quote proves only that the quote exists, not its interpretation.
 * @param {DirectorProposal} proposal Untrusted data.
 * @param {{scene: object, texts: Record<string, string>, window: string[]}} evidence Caller-supplied canonical text; ordered allowed source keys.
 * @returns {{accepted: boolean, code: string, detail?: string}}
 */
export function validateProposal(proposal, { scene, texts, window } = {}) {
    const projected = projectScene(scene, scene?.context?.selectedSourceKey);
    if (!projected.result.accepted) return refusal(projected.result.code, projected.result.detail);
    if (!validWindow(window, texts, scene.context)) return refusal('INVALID_EVIDENCE_WINDOW', 'Window must be the selected source and up to five directly prior sources with exact text.');
    if (!exact(proposal, ['schemaVersion', 'updates']) || !Object.hasOwn(proposal, 'schemaVersion') || !Object.hasOwn(proposal, 'updates')) return refusal('INVALID_PROPOSAL', 'Require a plain record with exactly schemaVersion and updates.');
    if (proposal.schemaVersion !== PROPOSAL_SCHEMA_VERSION) return refusal('UNSUPPORTED_PROPOSAL_SCHEMA', 'Only proposal schema 1 is supported.');
    const { updates } = proposal;
    if (!list(updates) || updates.length > MAX_UPDATES) return refusal('INVALID_PROPOSAL', 'Require an updates array of at most 16 entries.');
    let index = updates.findIndex(update => !validUpdate(update));
    if (index >= 0) return refusal('INVALID_UPDATE', 'Update ' + index + ': unknown operation, wrong keys or invalid value.');
    index = updates.findIndex(update => !validEvidence(update.evidence, texts, window));
    if (index >= 0) return refusal('INVALID_EVIDENCE', 'Update ' + index + ': evidence must be an exact 1-200 character excerpt of one source in the window.');
    for (const [position, update] of updates.entries()) {
        const code = identityError(update, scene.context, projected.projection);
        if (code) return refusal(code, 'Update ' + position + ': character or asset failed catalog validation.');
    }
    index = conflictIndex(updates);
    if (index >= 0) return refusal('CONFLICTING_UPDATES', 'Update ' + index + ': repeats an earlier target; there is no later-wins rule.');
    return freeze({ accepted: true, code: 'VALID' });
}
function validToken(token) {
    return exact(token, TOKEN_KEYS) && TOKEN_KEYS.every(key => Object.hasOwn(token, key))
        && record(token.authority) && token.authority.origin === 'automatic'
        && revision(token.expectedOverrideRevision) && text(token.evidenceStamp)
        && revision(token.selectionRevision) && revision(token.historyRevision) && revision(token.globalRevision)
        && text(token.promptVersion) && sameSource(token.source, token.authority.source);
}
function refuse(previous, code, detail) {
    return { scene: previous, result: freeze({ accepted: false, code, detail, applied: [], ignored: [], suggestions: [] }) };
}
const copyEvidence = ({ sourceMessageKey, excerpt }) => ({ sourceMessageKey, excerpt });
/** Stable order: location first, then characters in proposal order, each presence -> outfit -> expression. */
function translate(updates) {
    const steps = [];
    for (const [index, update] of updates.entries()) {
        if (update.op === 'setLocation') steps.push({ index, update, field: 'background', command: { type: 'setBackground', assetId: update.backgroundId } });
    }
    for (const [index, update] of updates.entries()) {
        if (update.op !== 'setCharacter') continue;
        const { characterKey } = update;
        if (Object.hasOwn(update, 'present')) steps.push({ index, update, characterKey, field: 'presence', command: { type: 'setPresence', characterKey, present: update.present } });
        if (update.outfitId) steps.push({ index, update, characterKey, field: 'outfit', command: { type: 'setOutfit', characterKey, assetId: update.outfitId } });
        if (update.expressionId) steps.push({ index, update, characterKey, field: 'expression', command: { type: 'setExpression', characterKey, assetId: update.expressionId } });
    }
    return steps;
}
const manualExpression = (scene, characterKey, sourceKey) => scene.commands.some(entry => entry.valid && entry.origin === 'manual'
    && entry.source.key === sourceKey && entry.command.characterKey === characterKey
    && ['setExpression', 'clearExpression'].includes(entry.command.type));
/**
 * Atomic application. Any refusal returns the exact `previous`; earlier steps were only
 * successive immutable values. Locked fields are skipped and recorded. Never reads or
 * writes canonical text, the project layout or persistence.
 * @param {object} previous Immutable scene.
 * @param {DirectorProposal} proposal Untrusted data.
 * @param {ProposalToken} token Captured by the caller, never derived from model output.
 * @param {{texts: Record<string, string>, window: string[]}} evidence Caller-supplied.
 * @returns {{scene: object, result: {accepted: boolean, code: string, detail?: string, applied: object[], ignored: object[], suggestions: object[]}}}
 */
export function applyProposal(previous, proposal, token, { texts, window } = {}) {
    if (!validToken(token)) return refuse(previous, 'INVALID_TOKEN', 'Require an exact captured automatic proposal token.');
    // An automatic lock passes every reducer authority check, then always refuses without
    // changing anything. Empty and suggestion-only proposals must be just as current.
    const probe = reduceScene(previous, { type: 'lock', field: 'background' }, { ...token.authority, expectedRevision: previous?.revision });
    if (probe.result.code !== 'MANUAL_ONLY') return refuse(previous, probe.result.code, probe.result.detail);
    // Before the revision check: a manual change advances both, and this is the specific reason.
    if (token.expectedOverrideRevision !== previous.overrideRevision) return refuse(previous, 'STALE_OVERRIDE', 'A manual change or release followed this capture.');
    if (token.authority.expectedRevision !== previous.revision) return refuse(previous, 'STALE_REVISION', 'Scene revision no longer matches.');
    const valid = validateProposal(proposal, { scene: previous, texts, window });
    if (!valid.accepted) return refuse(previous, valid.code, valid.detail);
    let current = previous;
    const applied = [], ignored = [], sourceKey = token.source.key;
    const skip = ({ index, field, characterKey }) => ignored.push({ index, field, ...(characterKey ? { characterKey } : {}), code: 'LOCKED' });
    for (const step of translate(proposal.updates)) {
        const { index, field, characterKey, command } = step;
        // Expression has no lock flag. A manual choice at this message outranks automation,
        // including the expression reset that an automatic outfit change would cause.
        if (characterKey && manualExpression(current, characterKey, sourceKey) && (field === 'expression'
            || field === 'outfit' && current.view.cast.find(item => item.key === characterKey).expression)) {
            skip(step);
            continue;
        }
        const outcome = reduceScene(current, command, { ...token.authority, expectedRevision: current.revision });
        if (outcome.result.accepted) {
            current = outcome.scene;
            applied.push({ index, commandRevision: current.commandRevision, field, ...(characterKey ? { characterKey } : {}),
                evidence: copyEvidence(step.update.evidence), promptVersion: token.promptVersion });
        // An expression chosen for an outfit that a lock kept out falls with that outfit.
        } else if (outcome.result.code === 'LOCKED' || outcome.result.code === 'INCOMPATIBLE_ASSET' && field === 'expression'
            && ignored.some(item => item.index === index && item.field === 'outfit')) {
            skip(step);
        } else return refuse(previous, outcome.result.code, outcome.result.detail);
    }
    const suggestions = [];
    for (const [index, update] of proposal.updates.entries()) {
        if (update.op === 'suggestLocation') suggestions.push({ index, label: update.label.trim(), evidence: copyEvidence(update.evidence) });
    }
    return { scene: current, result: freeze({ accepted: true, code: applied.length ? 'ACCEPTED' : 'NO_CHANGE', applied, ignored, suggestions }) };
}
/**
 * Caller layer: compare a captured token with plain current evidence, before application.
 * @param {ProposalToken} token
 * @param {object} snapshot Reader snapshot refreshed through getSceneEvidence(true).
 * @param {object} scene Scene whose revisions the token captured.
 * @param {import('./scene-reducer.mjs').SceneSource} currentSource Current record of the anchored source.
 * @returns {{accepted: boolean, code: string, detail?: string}}
 */
export function checkProposalEvidence(token, snapshot, scene, currentSource) {
    if (!validToken(token)) return refusal('INVALID_TOKEN', 'Require an exact captured automatic proposal token.');
    if (!record(snapshot) || snapshot.selectionState !== 'valid' || evidenceStamp(snapshot) !== token.evidenceStamp
        || token.selectionRevision !== scene?.context?.selectionRevision || token.globalRevision !== scene?.revision) return refusal('STALE_EVIDENCE', 'Session, source, order, cursor, selection or scene changed after capture.');
    if (token.historyRevision !== scene.context.historyRevision || snapshot.cursor?.sourceKey !== token.source.key
        || !sameSource(token.source, currentSource)) return refusal('STALE_SOURCE', 'The anchored source record changed after capture.');
    const generation = snapshot.generation;
    // End without completion provenance is unresolved, never a successful finish.
    if (generation?.id != null && ['streaming', 'unknown'].includes(generation.status)
        && (generation.sourceKey === token.source.key || !generation.sourceKey && snapshot.head?.sourceKey === token.source.key)) return refusal('UNRESOLVED_COMPLETION', 'The anchored source has no resolved completion.');
    return freeze({ accepted: true, code: 'CURRENT' });
}
