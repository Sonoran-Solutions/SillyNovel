import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirectorOverlay, composeLayout } from '../src/director-overlay.mjs';
import { routeProposal } from '../src/director-session.mjs';

// Pure module over fixtures: no host, no journal, no timers.
const source = (key, seed = key) => ({ key, revision: 0, swipeRevision: 0, fingerprintVersion: 'sn-source-v1', prefixSha256: seed.charCodeAt(0).toString(16).padStart(2, '0').repeat(32) });
const SOURCES = ['m1', 'm2', 'm3', 'm4'].map(key => source(key, key[1]));
const asset = (id, kind = 'background', characterKey) => ({ id, revision: 'r-' + id, kind, available: true, ...(characterKey ? { characterKey } : {}) });
const ASSETS = [asset('forest'), asset('harbor'), asset('mira-base', 'outfit', 'mira')];
const reference = id => ({ id, revision: 'r-' + id, status: 'ready' });
const member = (key, overrides = {}) => ({ key, label: key, present: true, slot: 'left', visible: true, outfit: null, expression: null, locks: { presence: false, slot: false, outfit: false }, ...overrides });
const layout = (overrides = {}) => ({ actors: [{ key: 'mira', label: 'Mira' }, { key: 'rowan', label: 'Rowan' }], view: { background: reference('forest'), backgroundLocked: false, slots: { left: 'mira', center: null, right: 'rowan' },
    cast: [member('mira', { outfit: reference('mira-base') }), member('rowan', { slot: 'right' })], ...overrides } });
const open = (view = layout(), selectedSourceKey = 'm3', sources = SOURCES, assets = ASSETS) => { const overlay = createDirectorOverlay({ ownerKey: 'director:p', sessionEpoch: 1 }); overlay.rebase(view, sources, { selectedSourceKey, assets }); return overlay; };
const TEXTS = { m3: 'They reach the harbor. Rowan leaves.' };
const evidence = { sourceMessageKey: 'm3', excerpt: 'harbor' };
const propose = (...updates) => ({ schemaVersion: 1, updates });
const location = (backgroundId = 'harbor') => ({ op: 'setLocation', backgroundId, evidence });
const presence = (characterKey = 'rowan', present = false) => ({ op: 'setCharacter', characterKey, present, evidence });
function tokenOf(overlay) {
    const scene = overlay.scene(), context = scene.context, at = context.sources.find(item => item.key === context.selectedSourceKey);
    return { authority: { ownerKey: context.ownerKey, sessionEpoch: context.sessionEpoch, historyRevision: context.historyRevision, selectionRevision: context.selectionRevision, catalogRevision: context.catalog.revision, expectedRevision: scene.revision, source: at, origin: 'automatic' },
        expectedOverrideRevision: scene.overrideRevision, evidenceStamp: 'stamp', selectionRevision: context.selectionRevision, historyRevision: context.historyRevision, globalRevision: scene.revision, source: at, promptVersion: 'v' };
}
const apply = (overlay, proposal = propose(location(), presence())) => overlay.apply(proposal, tokenOf(overlay), { texts: TEXTS, window: ['m3'] });
const selection = selectedSourceKey => ({ selectedSourceKey, assets: ASSETS });

test('base replay applies at every source, with the layout\'s locks and no automatic command', () => {
    const overlay = open(layout({ backgroundLocked: true }));
    for (const { key } of SOURCES) {
        const view = overlay.project(key);
        assert.equal(view.background.id, 'forest', key);
        assert.equal(view.backgroundLocked, true, key);
        assert.deepEqual(view.cast.map(actor => [actor.key, actor.present, actor.outfit?.id ?? null]), [['mira', true, 'mira-base'], ['rowan', true, null]], key);
    }
    assert.equal(overlay.active(), false);
    assert.equal(overlay.scene().context.selectedSourceKey, 'm3');
    assert.equal(overlay.scene().commands.every(entry => entry.origin === 'manual' && entry.source.key === 'm1'), true);
});
test('background and presence apply forward from the anchored message and not before it', () => {
    const overlay = open();
    const result = apply(overlay);
    assert.equal(result.code, 'ACCEPTED');
    assert.deepEqual(result.applied.map(item => item.field), ['background', 'presence']);
    assert.equal(overlay.active(), true);
    for (const key of ['m1', 'm2']) assert.equal(overlay.project(key).background.id, 'forest', key);
    for (const key of ['m3', 'm4']) {
        assert.equal(overlay.project(key).background.id, 'harbor', key);
        assert.equal(overlay.project(key).cast[1].present, false, key);
    }
    assert.equal(overlay.project('m2').cast[1].present, true);
});
test('D4: a locked field skips as LOCKED without refusing the rest', () => {
    const overlay = open(layout({ backgroundLocked: true }));
    const result = apply(overlay);
    assert.equal(result.accepted, true);
    assert.deepEqual(result.ignored, [{ index: 0, field: 'background', code: 'LOCKED' }]);
    assert.deepEqual(result.applied.map(item => item.field), ['presence']);
    assert.equal(overlay.project('m4').background.id, 'forest');
    assert.equal(overlay.project('m4').cast[1].present, false);
    const locked = open(layout({ cast: [member('mira'), member('rowan', { locks: { presence: true, slot: false, outfit: false } })] }));
    assert.deepEqual(apply(locked, propose(presence())).ignored, [{ index: 0, field: 'presence', characterKey: 'rowan', code: 'LOCKED' }]);
    assert.equal(locked.active(), false);
});
test('a stale token refuses atomically: the scene is the exact previous one', () => {
    const overlay = open(), token = tokenOf(overlay);
    apply(overlay);
    const scene = overlay.scene(), result = overlay.apply(propose(presence('mira')), token, { texts: TEXTS, window: ['m3'] });
    assert.equal(result.accepted, false);
    assert.equal(overlay.scene(), scene);
});
test('F8: clear and rebase discard every automatic command, and a later rebase is a new scene even at the same revision', () => {
    const overlay = open(), before = overlay.scene();
    apply(overlay);
    overlay.clear();
    assert.equal(overlay.active(), false);
    assert.equal(overlay.project('m4').background.id, 'forest');
    assert.equal(overlay.scene().revision, before.revision, 'scene revisions restart');
    assert.notEqual(overlay.scene(), before, 'so a captured scene compares by identity');
    assert.ok(overlay.scene().context.selectionRevision > before.context.selectionRevision, 'its context revisions stay monotonic');
    apply(overlay);
    overlay.rebase(layout({ background: reference('harbor'), backgroundLocked: true }), SOURCES, selection('m3'));
    assert.equal(overlay.active(), false);
    assert.equal(overlay.project('m1').background.id, 'harbor');
    assert.equal(overlay.project('m1').backgroundLocked, true);
    assert.equal(apply(overlay, propose(location('forest'))).ignored[0].code, 'LOCKED');
});
test('a prefix change invalidates from the first changed source; appended messages and navigation keep what stands', () => {
    const overlay = open();
    apply(overlay);
    const grown = [...SOURCES, source('m5', '5')];
    overlay.reconcile(grown, selection('m5'));
    assert.equal(overlay.project('m5').background.id, 'harbor', 'appending changes nothing that came before');
    overlay.reconcile(grown, selection('m2'));
    assert.equal(overlay.scene().view.background.id, 'forest', 'navigation reinstalls the selection');
    assert.equal(overlay.active(), true);
    const scene = overlay.scene();
    assert.equal(overlay.reconcile(grown, selection('m2')), scene, 'an unchanged context is the same scene');
    // m4 changed: the anchor at m3 stands.
    const later = [SOURCES[0], SOURCES[1], SOURCES[2], source('m4', 'x')];
    overlay.reconcile(later, selection('m4'));
    assert.equal(overlay.project('m4').background.id, 'harbor');
    // m3 changed: the anchor falls, not retried.
    const edited = [SOURCES[0], SOURCES[1], source('m3', 'y'), source('m4', 'z')];
    overlay.reconcile(edited, selection('m4'));
    assert.equal(overlay.active(), false);
    assert.equal(overlay.project('m4').background.id, 'forest');
    assert.equal(overlay.project('m4').cast[1].present, true);
    assert.equal(overlay.project('m4').cast.length, 2, 'the base stands');
});
test('a changed first source or an empty history rebases; automatic layout does not survive, the base does', () => {
    const overlay = open();
    apply(overlay);
    overlay.reconcile([source('m1', 'q'), source('m2', 'r')], selection('m2'));
    assert.equal(overlay.active(), false);
    assert.equal(overlay.project('m2').background.id, 'forest');
    apply(overlay, propose({ ...presence(), evidence: { sourceMessageKey: 'm2', excerpt: 'Rowan' } }));
    assert.equal(overlay.reconcile([], selection(null)), null);
    assert.equal(overlay.project('m1'), null, 'fail closed: composition shows the global layout');
    overlay.reconcile(SOURCES, selection('m3'));
    assert.equal(overlay.active(), false);
    assert.equal(overlay.project('m3').cast.length, 2);
});
test('a catalog change refreshes references: removed art shows as missing', () => {
    const overlay = open();
    apply(overlay);
    overlay.reconcile(SOURCES, { selectedSourceKey: 'm3', assets: ASSETS.filter(item => item.id !== 'harbor') });
    assert.equal(overlay.project('m3').background.id, 'harbor');
    assert.equal(overlay.project('m3').background.status, 'missing');
    assert.equal(overlay.project('m2').background.status, 'ready');
    assert.equal(overlay.active(), true);
});
test('a cursor not fingerprinted yet keeps the last selection instead of flashing back to the global layout', () => {
    const overlay = open();
    apply(overlay);
    assert.equal(overlay.project('not-yet').background.id, 'harbor');
    overlay.reconcile(SOURCES, selection('not-yet'));
    assert.equal(overlay.scene().context.selectedSourceKey, 'm3');
});
test('a layout that cannot be replayed fails closed; disposal discards', () => {
    const broken = open(layout(), 'm3', SOURCES, ASSETS.filter(item => item.id !== 'forest'));
    assert.equal(broken.scene(), null);
    assert.equal(broken.project('m3'), null);
    assert.equal(broken.apply(propose(), { nope: true }, {}).accepted, false);
    const overlay = open();
    apply(overlay);
    overlay.dispose();
    assert.equal(overlay.scene(), null);
    assert.equal(overlay.clear(), null);
    assert.equal(overlay.reconcile(SOURCES, selection('m3')), null);
});
test('composition takes background and presence only, keeps slots reserved in the global view, marks only what differs', () => {
    const overlay = open(), view = { ...layout().view, cast: [{ ...member('mira'), expression: reference('joy') }, member('rowan', { slot: 'right' })] };
    assert.equal(composeLayout(view, null), view);
    const quiet = composeLayout(view, overlay.project('m3'));
    assert.equal(quiet.background, view.background);
    assert.equal(quiet.cast[1], view.cast[1]);
    apply(overlay);
    const at = composeLayout(view, overlay.project('m3'));
    assert.deepEqual(at.background, { ...reference('harbor'), origin: 'automatic' });
    assert.equal(at.cast[1].present, false);
    assert.equal(at.cast[1].visible, false);
    assert.equal(at.cast[1].presenceOrigin, 'automatic');
    assert.equal(at.cast[1].slot, 'right', 'the position stays reserved');
    assert.deepEqual(at.slots, { left: 'mira', center: null, right: null });
    assert.equal(at.cast[0].expression.id, 'joy', 'composed expressions are untouched');
    assert.equal(at.cast[0].presenceOrigin, undefined);
    assert.equal(view.cast[1].present, true, 'the global view is not written');
    const before = composeLayout(view, overlay.project('m2'));
    assert.equal(before.background, view.background);
});
test('F7 routing: location and presence to the overlay, outfit NO_AUTOMATIC_LAYOUT, expression to the journal, suggestion as text, no-ops dropped', () => {
    const { view } = layout(), route = routeProposal(propose(
        location(), location('forest'),
        { op: 'setCharacter', characterKey: 'rowan', present: false, outfitId: 'x', expressionId: 'y', evidence },
        { op: 'setCharacter', characterKey: 'mira', present: true, expressionId: 'z', evidence },
        { op: 'setCharacter', characterKey: 'mira', outfitId: 'mira-base', expressionId: 'w', evidence },
        { op: 'suggestLocation', label: ' Harbor ', evidence }), view);
    assert.deepEqual(route.layout, propose(location(), presence()));
    assert.deepEqual(route.ignored, [{ index: 2, field: 'outfit', characterKey: 'rowan', code: 'NO_AUTOMATIC_LAYOUT' }, { index: 2, field: 'expression', characterKey: 'rowan', code: 'NO_AUTOMATIC_LAYOUT' }, { index: 4, field: 'outfit', characterKey: 'mira', code: 'NO_AUTOMATIC_LAYOUT' }]);
    assert.deepEqual(route.expressions, [{ index: 3, characterKey: 'mira', assetId: 'z' }, { index: 4, characterKey: 'mira', assetId: 'w' }]);
    assert.deepEqual(route.suggestions, [{ index: 5, label: 'Harbor' }]);
});

// M2.4 PR C: corrections (G5, G6, G7).
const authorityOf = (overlay, origin = 'manual') => { const { origin: _, ...rest } = tokenOf(overlay).authority; return { ...rest, origin }; };
const correct = (overlay, command) => overlay.correct(command, authorityOf(overlay));
const setBack = (assetId = 'forest') => ({ type: 'setBackground', assetId });
const setPresence = (characterKey = 'rowan', present = true) => ({ type: 'setPresence', characterKey, present });
const release = (field = 'background', characterKey) => ({ type: 'release', field, ...(characterKey ? { characterKey } : {}) });
const composeAt = (overlay, key) => composeLayout(layout().view, overlay.project(key));
test('T63: a correction applies forward from the selected message and not before it; other fields stay; active counts it; nothing automatic needed', () => {
    const overlay = open();
    assert.equal(overlay.active(), false);
    assert.equal(correct(overlay, setBack('harbor')).accepted, true);
    assert.equal(overlay.active(), true, 'a correction alone is active');
    assert.equal(overlay.corrected(), true);
    for (const key of ['m1', 'm2']) assert.equal(overlay.project(key).background.id, 'forest', key);
    for (const key of ['m3', 'm4']) assert.equal(overlay.project(key).background.id, 'harbor', key);
    assert.equal(overlay.project('m4').cast[1].present, true);
    const other = open();
    apply(other);
    assert.equal(correct(other, setBack()).invalidated, 0, 'at the head nothing falls');
    assert.equal(other.project('m3').background.id, 'forest');
    assert.equal(other.project('m3').cast[1].present, false, 'the other automatic field is kept');
});
test('T63: a correction refuses atomically: wrong origin, an outfit or slot, a stale authority, no scene', () => {
    const overlay = open(), scene = overlay.scene();
    assert.equal(overlay.correct(setBack('harbor'), authorityOf(overlay, 'automatic')).code, 'MANUAL_ONLY');
    assert.equal(correct(overlay, { type: 'setOutfit', characterKey: 'mira', assetId: 'mira-base' }).code, 'INVALID_COMMAND', 'F7');
    assert.equal(correct(overlay, { type: 'setSlot', characterKey: 'mira', slot: 'center' }).code, 'INVALID_COMMAND', 'F7');
    assert.equal(correct(overlay, release('slot', 'mira')).code, 'INVALID_COMMAND');
    assert.equal(correct(overlay, { type: 'lock', field: 'background' }).code, 'INVALID_COMMAND');
    assert.equal(correct(overlay, setBack('unknown')).code, 'UNKNOWN_ASSET');
    assert.equal(overlay.correct(setBack('harbor'), { ...authorityOf(overlay), expectedRevision: 999 }).code, 'STALE_REVISION');
    assert.equal(overlay.scene(), scene, 'the exact previous scene');
    overlay.dispose();
    assert.equal(overlay.correct(setBack('harbor'), {}).code, 'MANUAL_ONLY');
    assert.equal(overlay.correct(setBack('harbor'), { origin: 'manual' }).code, 'INVALID_SCENE');
});
test('T63: a correction at an earlier message invalidates later overlay commands of every field, by the reducer rule, and says how many', () => {
    const overlay = open(layout(), 'm2');
    assert.equal(apply(overlay, propose(presence('mira'))).code, 'INVALID_EVIDENCE_WINDOW', 'the evidence window names m3 only');
    overlay.reconcile(SOURCES, selection('m3'));
    apply(overlay);
    overlay.reconcile(SOURCES, selection('m2'));
    assert.equal(correct(overlay, setPresence('mira', false)).invalidated, 2, 'both commands at m3 fall');
    assert.equal(overlay.project('m4').background.id, 'forest');
    assert.equal(overlay.project('m4').cast[1].present, true);
    assert.equal(overlay.project('m4').cast[0].present, false);
    assert.equal(overlay.commandValid(overlay.scene().commands.at(-1).revision), true);
    assert.equal(overlay.commandValid(overlay.scene().commands.at(-2).revision), false);
});
test('G6: a correction locks its field forward; a later automatic update there is LOCKED, the rest applies; Release enables only a fresh proposal', () => {
    const overlay = open();
    apply(overlay, propose(presence()));
    correct(overlay, setPresence());
    assert.equal(overlay.project('m3').cast[1].locks.presence, true);
    assert.equal(overlay.project('m2').cast[1].locks.presence, false, 'not before the message');
    const skipped = apply(overlay, propose(location(), presence()));
    assert.deepEqual(skipped.ignored, [{ index: 1, field: 'presence', characterKey: 'rowan', code: 'LOCKED' }]);
    assert.deepEqual(skipped.applied.map(item => item.field), ['background']);
    assert.equal(overlay.project('m4').cast[1].present, true);
    assert.equal(correct(overlay, release('presence', 'rowan')).accepted, true);
    assert.equal(overlay.project('m3').cast[1].present, true, 'Release keeps the value and applies nothing');
    assert.equal(overlay.project('m3').cast[1].locks.presence, false);
    assert.deepEqual(apply(overlay, propose(presence())).applied.map(item => item.field), ['presence'], 'the fresh proposal now moves it');
    assert.equal(overlay.project('m3').cast[1].present, false);
});
test('G7: a rebase discards corrections and their locks with the rest; the epoch advances', () => {
    const overlay = open(), epoch = overlay.epoch();
    correct(overlay, setBack('harbor'));
    overlay.rebase(layout(), SOURCES, selection('m3'));
    assert.equal(overlay.active(), false);
    assert.equal(overlay.corrected(), false);
    assert.equal(overlay.project('m4').background.id, 'forest');
    assert.equal(overlay.project('m4').backgroundLocked, false);
    assert.equal(overlay.epoch(), epoch + 1);
    correct(overlay, setBack('harbor'));
    overlay.clear();
    assert.equal(overlay.active(), false, 'disable clears it too');
});
test('a correction makes a new scene, so a result in flight fails the identity check; a prefix change invalidates it from the first changed source', () => {
    const overlay = open(), captured = overlay.scene();
    correct(overlay, setBack('harbor'));
    assert.notEqual(overlay.scene(), captured);
    overlay.reconcile([SOURCES[0], SOURCES[1], source('m3', 'y'), source('m4', 'z')], selection('m4'));
    assert.equal(overlay.active(), false);
    assert.equal(overlay.project('m4').background.id, 'forest');
    assert.equal(overlay.project('m4').backgroundLocked, false);
});
test('composition: origin comes from the deciding command, so a correction is not the director\'s and its lock shows, including a value equal to the global one', () => {
    const overlay = open();
    apply(overlay);
    const automatic = composeAt(overlay, 'm3');
    assert.equal(automatic.backgroundOrigin, 'automatic');
    assert.equal(automatic.backgroundLockOrigin, undefined);
    correct(overlay, setBack());
    correct(overlay, setPresence());
    const at = composeAt(overlay, 'm4');
    assert.deepEqual(at.background, { ...reference('forest'), origin: 'correction' });
    assert.equal(at.backgroundOrigin, 'correction');
    assert.equal(at.backgroundLocked, true);
    assert.equal(at.backgroundLockOrigin, 'correction');
    const rowan = at.cast[1];
    assert.deepEqual([rowan.present, rowan.visible, rowan.presenceOrigin, rowan.locks.presence, rowan.presenceLockOrigin], [true, true, 'correction', true, 'correction']);
    assert.equal(at.overlayOrigins.background.sourceKey, 'm3');
    assert.equal(layout().view.backgroundLocked, false, 'the global view is not written');
    const before = composeAt(overlay, 'm2');
    assert.equal(before.backgroundOrigin, undefined);
    assert.equal(before.cast[1].presenceOrigin, undefined);
    correct(overlay, release());
    const released = composeAt(overlay, 'm3');
    assert.equal(released.backgroundOrigin, 'correction', 'Release keeps the value');
    assert.equal(released.backgroundLocked, false);
    assert.equal(released.backgroundLockOrigin, undefined);
});
test('composition: a correction back to no background shows neutral; a project lock is not a correction\'s; an actor unknown to the overlay is untouched', () => {
    const overlay = open();
    correct(overlay, { type: 'clearBackground' });
    const neutral = composeAt(overlay, 'm3');
    assert.equal(neutral.background, null);
    assert.equal(neutral.backgroundOrigin, 'correction');
    const locked = open(layout({ backgroundLocked: true }));
    correct(locked, setPresence('mira', false));
    const at = composeLayout(layout({ backgroundLocked: true }).view, locked.project('m3'));
    assert.equal(at.backgroundLocked, true);
    assert.equal(at.backgroundLockOrigin, undefined);
    const stranger = member('stranger'), view = { ...layout().view, cast: [...layout().view.cast, stranger] };
    assert.equal(composeLayout(view, locked.project('m3')).cast[2], stranger);
});
