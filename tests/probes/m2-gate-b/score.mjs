// Pure Gate B fixture scorer. Counts per category and field; refused apart; never an aggregate or a percentage (roadmap Gate B, G9).
// node tests/probes/m2-gate-b/score.mjs <results.json> [--recorded-sha <hex>]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createDirectorOverlay } from '../../../src/director-overlay.mjs';
import { validateProposal } from '../../../src/director-proposal.mjs';
import { buildDirectorRequest, PROMPT_VERSION } from '../../../src/director-request.mjs';
import { routeProposal } from '../../../src/director-session.mjs';

export const CATEGORIES = ['presence', 'mentions', 'negation', 'hypothetical travel', 'flashbacks', 'outfit continuity', 'group authorship', 'user locks'];
export const CASES_FILE = new URL('../../fixtures/m2-gate-b/cases.json', import.meta.url);
export const SHA_FILE = new URL('../../fixtures/m2-gate-b/expected-answers.sha256', import.meta.url);
const SLOTS = ['left', 'center', 'right'];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const recordedSha = () => readFileSync(SHA_FILE, 'utf8').trim();

/** Parses the frozen bytes; a changed answer changes the hash, and scoring refuses before reading anything else. */
export function loadCases(bytes, recorded) {
    const actual = sha256(bytes);
    if (actual !== recorded) throw Error('EXPECTED_ANSWERS_SHA_MISMATCH: recorded ' + recorded + ', file is ' + actual);
    return JSON.parse(bytes.toString());
}
/** The set the roadmap names: five for each category, answers only about what the case's catalog offers and its locks allow. */
export function checkCases({ cases }) {
    const problems = [], ids = new Set(cases.map(item => item.id));
    if (cases.length !== 40 || ids.size !== 40) problems.push('need 40 unique cases');
    for (const category of CATEGORIES) if (cases.filter(item => item.category === category).length !== 5) problems.push(category + ' needs five cases');
    for (const { id, category, input, expected } of cases) {
        if (!CATEGORIES.includes(category)) problems.push(id + ': unknown category');
        buildDirectorRequest(input);
        const { background, presence, expression } = expected, actor = key => input.cast.find(item => item.characterKey === key);
        if (background !== 'stay') {
            if (!input.backgrounds.some(item => item.backgroundId === background.to)) problems.push(id + ': background not in catalog');
            if (input.backgrounds[0].locked || background.to === input.scene.backgroundId) problems.push(id + ': background cannot move');
        }
        for (const [key, present] of Object.entries(presence)) if (!actor(key) || actor(key).presenceLocked || actor(key).present === present) problems.push(id + ': presence cannot move');
        for (const [key, allowed] of Object.entries(expression)) if (!actor(key) || !allowed.every(expressionId => input.expressions.some(item => item.expressionId === expressionId && item.characterKey === key))) problems.push(id + ': expression not in catalog');
    }
    return problems;
}
const sourceOf = key => ({ key, revision: 0, swipeRevision: 0, fingerprintVersion: 'sn-source-v1', prefixSha256: sha256(key) });
const reference = id => ({ id, revision: 'r-' + id, status: 'ready' });
const assetOf = (id, kind, extra = {}) => ({ id, revision: 'r-' + id, kind, available: true, ...extra });
/** The overlay the product would hold for this input: same module, same base replay, same locks. */
function stageFor({ window, cast, expressions, backgrounds, scene }) {
    const sources = window.map(({ key }) => sourceOf(key)), selectedSourceKey = sources.at(-1).key;
    const slots = { left: null, center: null, right: null };
    const members = cast.map((actor, index) => {
        const slot = SLOTS[index] ?? null;
        if (slot && actor.present) slots[slot] = actor.characterKey;
        return { key: actor.characterKey, label: actor.label, present: actor.present, slot, visible: actor.present && slot !== null, outfit: actor.outfitId ? reference(actor.outfitId) : null, expression: null,
            locks: { presence: actor.presenceLocked, slot: false, outfit: actor.outfitLocked } };
    });
    const assets = [...backgrounds.map(item => assetOf(item.backgroundId, 'background')),
        ...cast.filter(actor => actor.outfitId).map(actor => assetOf(actor.outfitId, 'outfit', { characterKey: actor.characterKey })),
        ...expressions.map(item => assetOf(item.expressionId, 'expression', { characterKey: item.characterKey, outfitId: cast.find(actor => actor.characterKey === item.characterKey)?.outfitId ?? null }))];
    const overlay = createDirectorOverlay({ ownerKey: 'gate-b', sessionEpoch: 1 });
    const stage = overlay.rebase({ actors: cast.map(({ characterKey: key, label }) => ({ key, label })),
        view: { background: scene.backgroundId ? reference(scene.backgroundId) : null, backgroundLocked: backgrounds[0]?.locked ?? false, slots, cast: members } }, sources, { selectedSourceKey, assets });
    if (!stage) throw Error('INVALID_CASE_SCENE');
    return { overlay, selectedSourceKey };
}
function tokenFor(overlay) {
    const scene = overlay.scene(), { context } = scene, source = context.sources.find(item => item.key === context.selectedSourceKey);
    return { authority: { ownerKey: context.ownerKey, sessionEpoch: context.sessionEpoch, historyRevision: context.historyRevision, selectionRevision: context.selectionRevision, catalogRevision: context.catalog.revision, expectedRevision: scene.revision, source, origin: 'automatic' },
        expectedOverrideRevision: scene.overrideRevision, evidenceStamp: 'gate-b', selectionRevision: context.selectionRevision, historyRevision: context.historyRevision, globalRevision: scene.revision, source, promptVersion: PROMPT_VERSION };
}
// Stay: right when nothing moved, a locked skip or a repeated value included. Move: no update at all is abstention; a repeated current value is a claim, so it is wrong.
const verdict = (wanted, proposed, moved, right) => wanted === undefined ? (moved ? 'incorrect' : 'correct') : right ? 'correct' : proposed ? 'incorrect' : 'abstained';
/** One case through the product's validator, router and overlay. Refused comes back apart, with no field verdicts. */
export function scoreCase(testCase, proposal) {
    const { input, expected, category } = testCase, request = buildDirectorRequest(input), { overlay, selectedSourceKey } = stageFor(input);
    const valid = validateProposal(proposal, { scene: overlay.scene(), texts: request.texts, window: request.window });
    if (!valid.accepted) return { refused: valid.code };
    const before = overlay.scene().view, route = routeProposal(proposal, before);
    const applied = overlay.apply(route.layout, tokenFor(overlay), { texts: request.texts, window: request.window });
    if (!applied.accepted) return { refused: applied.code };
    const after = overlay.project(selectedSourceKey), updates = proposal.updates, fields = [];
    const location = updates.find(update => update.op === 'setLocation');
    const to = expected.background === 'stay' ? undefined : expected.background.to;
    fields.push({ field: 'background', verdict: verdict(to, Boolean(location), after.background?.id !== before.background?.id, after.background?.id === to) });
    for (const { characterKey: key } of input.cast) {
        const of = list => list.cast.find(item => item.key === key), update = updates.find(item => item.op === 'setCharacter' && item.characterKey === key);
        fields.push({ field: 'presence', characterKey: key, verdict: verdict(expected.presence[key], update !== undefined && Object.hasOwn(update, 'present'), of(after).present !== of(before).present, of(after).present === expected.presence[key]) });
        // An expression that falls with an outfit (F7) reaches no one, so it is not an update.
        const chosen = route.expressions.find(item => item.characterKey === key)?.assetId, allowed = expected.expression[key];
        fields.push({ field: 'expression', characterKey: key, verdict: verdict(allowed, chosen !== undefined, chosen !== undefined, allowed?.includes(chosen)) });
        if (category === 'outfit continuity') {
            const asked = updates.filter(item => item.op === 'setCharacter' && item.characterKey === key && Object.hasOwn(item, 'outfitId')).length;
            const ended = route.ignored.filter(item => item.field === 'outfit' && item.characterKey === key && item.code === 'NO_AUTOMATIC_LAYOUT').length;
            fields.push({ field: 'outfit', characterKey: key, verdict: (of(after).outfit?.id ?? null) === (of(before).outfit?.id ?? null) && asked === ended ? 'correct' : 'incorrect' });
        }
    }
    return { fields, notes: { lockedSkips: applied.ignored.length, unchanged: route.unchanged.length, outfitUpdates: route.ignored.filter(item => item.field === 'outfit').length, suggestions: route.suggestions.length } };
}
const emptyField = () => ({ correct: 0, incorrect: 0, abstained: 0 });
const emptyCategory = () => ({ cases: 0, scored: 0, refused: { count: 0, codes: {} }, failed: { count: 0, codes: {} }, notRun: 0,
    fields: { background: emptyField(), presence: emptyField(), expression: emptyField(), outfit: emptyField() }, notes: { lockedSkips: 0, unchanged: 0, outfitUpdates: 0, suggestions: 0 } });
const bump = (group, code) => { group.count++; group.codes[code] = (group.codes[code] ?? 0) + 1; };
/**
 * Refuses a changed fixture, a result set taken against other answers or another prompt, and unknown or repeated cases.
 * A case with no result is not_run, and `complete` says so: a short run is never a pass.
 */
export function scoreRun({ casesBytes, recorded, run }) {
    const { cases } = loadCases(casesBytes, recorded);
    if (run.casesSha256 !== recorded) throw Error('RESULTS_FROM_OTHER_ANSWERS: run used ' + run.casesSha256);
    if (run.promptVersion !== PROMPT_VERSION) throw Error('RESULTS_FROM_OTHER_PROMPT: run used ' + run.promptVersion);
    const byId = new Map(run.results.map(item => [item.id, item]));
    if (byId.size !== run.results.length || run.results.some(item => !cases.some(testCase => testCase.id === item.id))) throw Error('RESULTS_DO_NOT_MATCH_CASES');
    const categories = Object.fromEntries(CATEGORIES.map(name => [name, emptyCategory()])), perCase = [];
    for (const testCase of cases) {
        const summary = categories[testCase.category], result = byId.get(testCase.id);
        summary.cases++;
        if (!result || result.status === 'not_run') { summary.notRun++; perCase.push({ id: testCase.id, outcome: 'not_run' }); continue; }
        if (result.status === 'failed') { bump(summary.failed, result.code); perCase.push({ id: testCase.id, outcome: 'failed', code: result.code }); continue; }
        if (result.status === 'refused') { bump(summary.refused, result.code); perCase.push({ id: testCase.id, outcome: 'refused', code: result.code }); continue; }
        const scored = scoreCase(testCase, result.proposal);
        if (scored.refused) { bump(summary.refused, scored.refused); perCase.push({ id: testCase.id, outcome: 'refused', code: scored.refused }); continue; }
        summary.scored++;
        for (const { field, verdict: value } of scored.fields) summary.fields[field][value]++;
        for (const [key, count] of Object.entries(scored.notes)) summary.notes[key] += count;
        perCase.push({ id: testCase.id, outcome: 'scored', fields: scored.fields });
    }
    return { recordedSha256: recorded, promptVersion: run.promptVersion, mode: run.mode, complete: perCase.every(item => item.outcome !== 'not_run'), categories, perCase };
}
/** Plain text for the record. One block per category, on purpose: there is no row across categories. */
export function formatReport({ recordedSha256, promptVersion, mode, complete, categories }) {
    const lines = ['Expected answers SHA-256: ' + recordedSha256, 'PROMPT_VERSION: ' + promptVersion, 'Mode: ' + mode, 'All cases run: ' + (complete ? 'yes' : 'NO')];
    const codes = group => group.count + (group.count ? ' (' + Object.entries(group.codes).map(([code, count]) => code + ' ' + count).join(', ') + ')' : '');
    for (const [name, item] of Object.entries(categories)) {
        lines.push('', name + ': ' + item.cases + ' cases, ' + item.scored + ' scored, refused ' + codes(item.refused) + ', failed ' + codes(item.failed) + ', not run ' + item.notRun);
        for (const [field, count] of Object.entries(item.fields)) if (count.correct + count.incorrect + count.abstained) lines.push('  ' + field + ': correct ' + count.correct + ', incorrect ' + count.incorrect + ', abstained ' + count.abstained);
        lines.push('  noted: locked skips ' + item.notes.lockedSkips + ', repeated values ' + item.notes.unchanged + ', outfit updates ' + item.notes.outfitUpdates + ', suggestions ' + item.notes.suggestions);
    }
    return lines.join('\n') + '\n';
}
/** For tests and the loopback proof only: a schema-valid reply that gives the frozen answer. */
export function answerFor({ input, expected }) {
    const { key: sourceMessageKey, text } = input.window.at(-1), evidence = { sourceMessageKey, excerpt: text.slice(0, 40) }, updates = [];
    if (expected.background !== 'stay') updates.push({ op: 'setLocation', backgroundId: expected.background.to, evidence });
    for (const { characterKey } of input.cast) {
        const update = { op: 'setCharacter', characterKey, evidence };
        if (Object.hasOwn(expected.presence, characterKey)) update.present = expected.presence[characterKey];
        if (Object.hasOwn(expected.expression, characterKey)) update.expressionId = expected.expression[characterKey][0];
        if (Object.keys(update).length > 3) updates.push(update);
    }
    return { schemaVersion: 1, updates };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [file, flag, value] = process.argv.slice(2);
    const recorded = flag === '--recorded-sha' ? value : recordedSha();
    const report = scoreRun({ casesBytes: readFileSync(CASES_FILE), recorded, run: JSON.parse(readFileSync(file, 'utf8')) });
    process.stdout.write(formatReport(report));
}
