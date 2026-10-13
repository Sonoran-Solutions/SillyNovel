import assert from 'node:assert/strict';
import test from 'node:test';
import { createScene, reduceScene, projectScene, reconcileScene } from '../src/scene-reducer.mjs';
import { fingerprintSourcePrefix } from './probes/dyl19/source-anchor.mjs';

// Public-safe synthetic authority, not a proof of durable SillyTavern ownership.
function context() {
    const messages = Array.from({ length: 7 }, () => ({ role: 'assistant', text: 'Identical message',
        author: { kind: 'resolved', characterKey: 'mira-a' }, swipe: { id: 0, text: 'Identical message' } }));
    return {
        ownerKey: 'synthetic-session-a', sessionEpoch: 1, historyRevision: 1, selectionRevision: 1,
        selectedSourceKey: 'm4', sources: messages.map((_, i) => ({ key: 'm' + (i + 1), revision: 1, swipeRevision: 0,
            fingerprintVersion: 'sn-source-v1', prefixSha256: fingerprintSourcePrefix({
                owner: { userStoreKey: 'synthetic-owner' }, scope: { kind: 'group', key: 'synthetic-group' }, messages, selectedIndex: i,
            }) })),
        characters: ['mira-a', 'mira-b', 'rowan', 'sage'].map(key => ({ key, label: key.startsWith('mira') ? 'Mira' : key })),
        catalog: { revision: 1, assets: [
            { id: 'park', revision: 'v1', kind: 'background', available: true },
            { id: 'room', revision: 'v1', kind: 'background', available: false },
            { id: 'coat', revision: 'v1', kind: 'outfit', characterKey: 'mira-a', available: true },
            { id: 'missing-coat', revision: 'v1', kind: 'outfit', characterKey: 'mira-a', available: false },
            { id: 'smile', revision: 'v1', kind: 'expression', characterKey: 'mira-a', outfitId: null, available: true },
            { id: 'coat-smile', revision: 'v1', kind: 'expression', characterKey: 'mira-a', outfitId: 'coat', available: true },
        ] },
    };
}
function authority(scene, origin = 'manual') {
    const c = scene.context;
    return { ownerKey: c.ownerKey, sessionEpoch: c.sessionEpoch, historyRevision: c.historyRevision,
        selectionRevision: c.selectionRevision, catalogRevision: c.catalog.revision, expectedRevision: scene.revision,
        source: c.sources.find(source => source.key === c.selectedSourceKey), origin };
}
function run(scene, command, origin = 'manual') {
    const result = reduceScene(scene, command, authority(scene, origin));
    assert.equal(result.result.accepted, true, JSON.stringify(result.result));
    return result.scene;
}
function reject(scene, command, code, token = authority(scene)) {
    const before = structuredClone(scene);
    const result = reduceScene(scene, command, token);
    assert.equal(result.result.code, code);
    assert.equal(result.result.accepted, false);
    assert.equal(result.scene, scene);
    assert.deepEqual(scene, before);
}
const cast = (scene, key = 'mira-a') => scene.view.cast.find(character => character.key === key);
const add = (scene, key = 'mira-a') => run(scene, { type: 'addCharacter', characterKey: key });
function select(scene, key) {
    return reconcileScene(scene, { ...structuredClone(scene.context), selectedSourceKey: key,
        selectionRevision: scene.context.selectionRevision + 1 }).scene;
}
function changedHistory(scene, index, change) {
    const c = structuredClone(scene.context);
    c.historyRevision++;
    change(c.sources, index);
    // Real caller computes each affected sn-source-v1 prefix; use distinct synthetic hashes here.
    for (let i = index; i < c.sources.length; i++) c.sources[i].prefixSha256 = String(i + 1).repeat(64);
    return reconcileScene(scene, c);
}
function deeplyFrozen(value) {
    if (!value || typeof value !== 'object') return;
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(deeplyFrozen);
}

test('neutral schema, immutable inputs/output snapshots, deterministic output and revision rules', () => {
    const input = context();
    const saved = structuredClone(input);
    const result = createScene(input);
    assert.equal(result.result.accepted, true);
    let scene = result.scene;
    assert.deepEqual(scene.view, { background: null, backgroundLocked: false, cast: [], slots: { left: null, center: null, right: null } });
    assert.equal(scene.schemaVersion, 1);
    assert.equal(scene.revision, 0);
    assert.deepEqual(createScene(input), result);
    deeplyFrozen(scene);
    assert.deepEqual(input, saved);
    assert.equal(Object.isFrozen(input), false);
    const before = scene;
    const cmd = { type: 'setBackground', assetId: 'park' };
    const token = authority(scene);
    scene = run(scene, cmd);
    assert.deepEqual(reduceScene(before, cmd, token).scene, scene);
    assert.equal(Object.isFrozen(cmd), false);
    assert.equal(Object.isFrozen(token), false);
    const reordered = { ...token, source: Object.fromEntries(Object.entries(token.source).reverse()) };
    assert.deepEqual(reduceScene(before, cmd, reordered).scene, scene, 'source property order is not authority');
    assert.equal(before.view.background, null);
    deeplyFrozen(scene);
    assert.equal(scene.revision, 1);
    assert.equal(scene.commandRevision, 1);
    assert.equal(scene.overrideRevision, 1);
    const next = run(scene, cmd);
    assert.equal(next.revision, 2, 'accepted explicit repeats advance revision');
    const navigated = select(next, 'm7');
    assert.equal(navigated.commandRevision, 2);
    assert.equal(navigated.revision, 3);
    const thawed = structuredClone(navigated);
    assert.equal(reconcileScene(thawed, thawed.context).result.code, 'UNCHANGED');
    projectScene(thawed, 'm3');
    assert.equal(Object.isFrozen(thawed), false, 'read/no-op must not freeze caller objects');
});

test('background select, replace, clear, lock/release and forward projection at messages 3, 4, 7', () => {
    let scene = run(createScene(context()).scene, { type: 'setBackground', assetId: 'park' });
    assert.equal(projectScene(scene, 'm3').projection.background, null);
    assert.equal(projectScene(scene, 'm4').projection.background.id, 'park');
    assert.equal(projectScene(scene, 'm7').projection.background.id, 'park');
    const original = scene;
    reject(scene, { type: 'setBackground', assetId: 'room' }, 'LOCKED', authority(scene, 'automatic'));
    scene = run(scene, { type: 'setBackground', assetId: 'room' });
    assert.equal(scene.view.background.status, 'missing');
    const delayed = authority(scene, 'automatic');
    scene = run(scene, { type: 'release', field: 'background' });
    assert.equal(scene.view.background.id, 'room', 'release keeps current choice');
    reject(scene, { type: 'setBackground', assetId: 'park' }, 'STALE_REVISION', delayed);
    scene = run(scene, { type: 'setBackground', assetId: 'park' }, 'automatic');
    assert.equal(scene.overrideRevision, 3);
    scene = run(scene, { type: 'lock', field: 'background' });
    reject(scene, { type: 'clearBackground' }, 'LOCKED', authority(scene, 'automatic'));
    scene = run(scene, { type: 'clearBackground' });
    assert.equal(scene.view.background, null);
    assert.equal(original.view.background.id, 'park');
});

test('four logical members, duplicate labels, stable slots, move, explicit swap and replace', () => {
    let scene = createScene(context()).scene;
    for (const key of ['mira-a', 'mira-b', 'rowan', 'sage']) scene = add(scene, key);
    for (const [characterKey, slot] of [['mira-a', 'left'], ['mira-b', 'center'], ['rowan', 'right']]) {
        scene = run(scene, { type: 'setSlot', characterKey, slot });
    }
    assert.equal(scene.view.cast.length, 4);
    assert.equal(scene.view.cast.filter(c => c.visible).length, 3);
    assert.equal(scene.view.cast.filter(c => c.label === 'Mira').length, 2);
    reject(scene, { type: 'setSlot', characterKey: 'sage', slot: 'left' }, 'SLOT_OCCUPIED');
    reject(scene, { type: 'setSlot', characterKey: 'sage', slot: 'left', mode: 'swap' }, 'INVALID_SWAP');
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-a', slot: 'center', mode: 'swap' });
    assert.deepEqual(scene.view.slots, { left: 'mira-b', center: 'mira-a', right: 'rowan' });
    scene = run(scene, { type: 'setSlot', characterKey: 'sage', slot: 'right', mode: 'replace' });
    assert.equal(cast(scene, 'rowan').present, true);
    assert.equal(cast(scene, 'rowan').slot, null);
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-b', slot: null });
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-a', slot: 'left' });
    assert.deepEqual(scene.view.slots, { left: 'mira-a', center: null, right: 'sage' });
    assert.equal(cast(scene, 'mira-b').present, true);
    assert.equal(projectScene(scene, 'm3').projection.cast.filter(c => c.visible).length, 0);
    assert.equal(projectScene(scene, 'm3').projection.cast.find(c => c.key === 'mira-a').slot, 'left', 'session layout, presence remains forward');
});

test('presence and offstage are separate; presence release and slot lock release obey precedence', () => {
    let scene = add(createScene(context()).scene);
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-a', slot: 'left' });
    reject(scene, { type: 'setPresence', characterKey: 'mira-a', present: false }, 'LOCKED', authority(scene, 'automatic'));
    reject(scene, { type: 'setSlot', characterKey: 'mira-a', slot: null }, 'LOCKED', authority(scene, 'automatic'));
    scene = run(scene, { type: 'setPresence', characterKey: 'mira-a', present: false });
    assert.equal(cast(scene).visible, false);
    assert.equal(scene.view.cast.length, 1);
    assert.equal(cast(scene).slot, 'left', 'absence masks, never silently evicts layout');
    scene = run(scene, { type: 'release', field: 'presence', characterKey: 'mira-a' });
    scene = run(scene, { type: 'setPresence', characterKey: 'mira-a', present: true }, 'automatic');
    assert.equal(cast(scene).visible, true);
    scene = run(scene, { type: 'release', field: 'slot', characterKey: 'mira-a' });
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-a', slot: 'right' }, 'automatic');
    scene = run(scene, { type: 'lock', field: 'slot', characterKey: 'mira-a' });
    assert.equal(cast(scene).locks.slot, true);
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-a', slot: null });
    assert.equal(cast(scene).present, true);
    assert.equal(cast(scene).visible, false);
});

test('occupied-slot automatic replacement/swap checks every affected lock atomically', () => {
    let scene = add(add(createScene(context()).scene), 'mira-b');
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-a', slot: 'left' });
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-b', slot: 'right' });
    scene = run(scene, { type: 'release', field: 'slot', characterKey: 'mira-b' });
    for (const mode of ['replace', 'swap']) reject(scene, { type: 'setSlot', characterKey: 'mira-b', slot: 'left', mode }, 'LOCKED', authority(scene, 'automatic'));
    scene = run(scene, { type: 'release', field: 'slot', characterKey: 'mira-a' });
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-b', slot: 'left', mode: 'swap' }, 'automatic');
    assert.deepEqual(scene.view.slots, { left: 'mira-b', center: null, right: 'mira-a' });
});

test('outfit select, replace, default/clear, lock/release, compatibility and forward scope', () => {
    let scene = add(createScene(context()).scene);
    scene = run(scene, { type: 'setOutfit', characterKey: 'mira-a', assetId: 'coat' });
    assert.equal(projectScene(scene, 'm3').projection.cast[0].outfit, null);
    assert.equal(projectScene(scene, 'm7').projection.cast[0].outfit.id, 'coat');
    reject(scene, { type: 'clearOutfit', characterKey: 'mira-a' }, 'LOCKED', authority(scene, 'automatic'));
    scene = run(scene, { type: 'setOutfit', characterKey: 'mira-a', assetId: 'missing-coat' });
    assert.equal(cast(scene).outfit.status, 'missing');
    scene = run(scene, { type: 'release', field: 'outfit', characterKey: 'mira-a' });
    scene = run(scene, { type: 'clearOutfit', characterKey: 'mira-a' }, 'automatic');
    assert.equal(cast(scene).outfit, null);
    scene = run(scene, { type: 'lock', field: 'outfit', characterKey: 'mira-a' });
    scene = run(scene, { type: 'clearOutfit', characterKey: 'mira-a' });
    reject(scene, { type: 'setOutfit', characterKey: 'mira-a', assetId: 'park' }, 'INCOMPATIBLE_ASSET');
    reject(scene, { type: 'setOutfit', characterKey: 'mira-a', assetId: 'unknown' }, 'UNKNOWN_ASSET');
    scene = add(scene, 'mira-b');
    reject(scene, { type: 'setOutfit', characterKey: 'mira-b', assetId: 'coat' }, 'INCOMPATIBLE_ASSET');
});

test('expressions select/replace/clear only on exact selected source and swipe; outfit resets to neutral', () => {
    let scene = add(createScene(context()).scene);
    scene = run(scene, { type: 'setExpression', characterKey: 'mira-a', assetId: 'smile' });
    assert.equal(cast(scene).expression.id, 'smile');
    assert.equal(projectScene(scene, 'm7').projection.cast[0].expression, null);
    scene = run(scene, { type: 'setExpression', characterKey: 'mira-a', assetId: 'smile' });
    scene = run(scene, { type: 'clearExpression', characterKey: 'mira-a' });
    assert.equal(cast(scene).expression, null);
    scene = run(scene, { type: 'setOutfit', characterKey: 'mira-a', assetId: 'coat' });
    reject(scene, { type: 'setExpression', characterKey: 'mira-a', assetId: 'smile' }, 'INCOMPATIBLE_ASSET');
    scene = run(scene, { type: 'setExpression', characterKey: 'mira-a', assetId: 'coat-smile' });
    assert.equal(cast(scene).expression.id, 'coat-smile');
    const old = authority(scene);
    const next = changedHistory(scene, 3, (sources, i) => sources[i].swipeRevision++).scene;
    assert.equal(next.view.cast.length, 0, 'selected changed source invalidates its decisions');
    reject(next, { type: 'clearExpression', characterKey: 'mira-a' }, 'STALE_REVISION', old);
    assert.equal(scene.view.cast[0].expression.id, 'coat-smile');
});

test('unknown/malformed commands, unverified identities and missing authority cannot bypass locks', () => {
    const scene = add(createScene(context()).scene);
    for (const cmd of [null, {}, { type: '__proto__' }, { type: 'unknown' }]) reject(scene, cmd, 'UNKNOWN_COMMAND');
    for (const cmd of [
        { type: 'setBackground', assetId: null }, { type: 'clearBackground', scope: 'forever' },
        { type: 'setPresence', characterKey: 'mira-a', present: 1 },
        { type: 'setSlot', characterKey: 'mira-a', slot: 'above' },
        { type: 'setSlot', characterKey: 'mira-a', slot: null, mode: 'replace' },
        { type: 'setSlot', characterKey: 'mira-a' }, { type: 'release', field: 'expression', characterKey: 'mira-a' },
        { type: 'lock', field: 'background', characterKey: 'mira-a' },
        { type: 'setOutfit', characterKey: 0, assetId: 'coat' },
    ]) reject(scene, cmd, 'INVALID_COMMAND');
    reject(scene, { type: 'addCharacter', characterKey: 'Mira' }, 'UNRESOLVED_CHARACTER');
    reject(scene, { type: 'setPresence', characterKey: 'sage', present: true }, 'CHARACTER_NOT_ADDED');
    for (const token of [null, {}, { ...authority(scene), origin: 'user' }, { ...authority(scene), source: null }]) {
        reject(scene, { type: 'release', field: 'presence', characterKey: 'mira-a' }, 'MISSING_AUTHORITY', token);
    }
    reject(scene, { type: 'release', field: 'presence', characterKey: 'mira-a' }, 'MANUAL_ONLY', authority(scene, 'automatic'));
});

test('malformed/unsupported context and scenes safely refuse without modifying supplied objects', () => {
    for (const change of [c => c.characters.push(c.characters[0]), c => c.sources.push(c.sources[0]),
        c => c.ownerKey = '', c => c.selectedSourceKey = 'missing', c => c.sources[0].fingerprintVersion = 'unknown',
        c => c.catalog.assets.push(c.catalog.assets[0]), c => delete c.catalog.assets[4].outfitId,
        c => c.sources[0].revision = -1, c => c.sources[0].prefixSha256 = 'not-a-hash', c => c.sources = null]) {
        const c = context(); change(c);
        const before = structuredClone(c);
        assert.equal(createScene(c).result.code, 'INVALID_CONTEXT');
        assert.deepEqual(c, before);
    }
    for (const bad of [null, {}, { ...createScene(context()).scene, schemaVersion: 99 }]) {
        assert.equal(reduceScene(bad, { type: 'clearBackground' }, {}).result.code, 'INVALID_SCENE');
        assert.equal(reconcileScene(bad, context()).result.code, 'INVALID_SCENE');
        assert.equal(projectScene(bad, 'm4').result.code, 'INVALID_SCENE');
    }
    const scene = createScene(context()).scene;
    assert.equal(projectScene(scene, 'absent').result.code, 'UNRESOLVED_SOURCE');
    const empty = context(); empty.sources = []; empty.selectedSourceKey = null; empty.characters = [];
    assert.equal(createScene(empty).scene.view.cast.length, 0, 'unresolved cast does not block unrelated scene setup');
    const noCast = context(); noCast.characters = [];
    assert.equal(run(createScene(noCast).scene, { type: 'setBackground', assetId: 'park' }).view.background.id, 'park');
});

test('stale session, selection, source, history, scene and catalog authority rejected', () => {
    const scene = createScene(context()).scene;
    const cmd = { type: 'setBackground', assetId: 'park' };
    for (const [field, value, code] of [['sessionEpoch', 0, 'STALE_SESSION'], ['ownerKey', 'other', 'STALE_SESSION'],
        ['selectionRevision', 0, 'STALE_SELECTION'], ['historyRevision', 0, 'STALE_SOURCE'],
        ['expectedRevision', 1, 'STALE_REVISION'], ['catalogRevision', 0, 'STALE_REVISION']]) {
        reject(scene, cmd, code, { ...authority(scene), [field]: value });
    }
    for (const patch of [{ key: 'm5' }, { revision: 2 }, { swipeRevision: 1 }, { prefixSha256: 'f'.repeat(64) }]) {
        reject(scene, cmd, patch.key ? 'STALE_SELECTION' : 'STALE_SOURCE', { ...authority(scene), source: { ...authority(scene).source, ...patch } });
    }
    const stale = authority(scene);
    reject(select(scene, 'm5'), cmd, 'STALE_REVISION', stale);
});

for (const [name, change] of [
    ['edit/continuation', (sources, i) => sources[i].revision++],
    ['deletion', (sources, i) => sources.splice(i, 1)],
    ['replacement', (sources, i) => sources[i].key = 'replacement'],
    ['insertion', (sources, i) => sources.splice(i, 0, { ...sources[i], key: 'inserted' })],
    ['reorder', (sources, i) => [sources[i], sources[i + 1]] = [sources[i + 1], sources[i]]],
]) test(name + ' invalidates the affected suffix without transferring decisions', () => {
    let scene = select(createScene(context()).scene, 'm1');
    scene = run(scene, { type: 'setBackground', assetId: 'park' });
    scene = select(scene, 'm4'); scene = add(scene);
    scene = select(scene, 'm7'); scene = run(scene, { type: 'setBackground', assetId: 'room' });
    const result = changedHistory(scene, 1, change);
    assert.equal(result.result.accepted, true);
    assert.equal(result.scene.invalidatedFrom, 1);
    assert.deepEqual(result.scene.commands.map(entry => entry.valid), [true, false, false]);
    assert.equal(result.scene.view.background.id, 'park');
    assert.equal(result.scene.view.cast.length, 0);
    const restored = structuredClone(scene.context); restored.historyRevision = result.scene.context.historyRevision + 1;
    assert.deepEqual(reconcileScene(result.scene, restored).scene.commands.map(entry => entry.valid), [true, false, false], 'returning to an old digest never resurrects invalidated records');
});

test('historical deliberate correction invalidates later decisions; rejected correction stays atomic', () => {
    let scene = run(createScene(context()).scene, { type: 'setBackground', assetId: 'park' });
    scene = select(scene, 'm7'); scene = run(scene, { type: 'setBackground', assetId: 'room' });
    scene = select(scene, 'm4');
    reject(scene, { type: 'setBackground', assetId: 'unknown' }, 'UNKNOWN_ASSET');
    assert.equal(scene.commands[1].valid, true);
    scene = run(scene, { type: 'clearBackground' });
    assert.deepEqual(scene.commands.map(c => c.valid), [true, false, true]);
    assert.equal(projectScene(scene, 'm7').projection.background, null);
    assert.equal(scene.invalidatedFrom, 4);
});

test('A → B → A resets session-only state; epochs and revisions remain monotonic', () => {
    let scene = add(createScene(context()).scene);
    const token = authority(scene);
    const b = context(); b.ownerKey = 'synthetic-session-b'; b.sessionEpoch = 2;
    scene = reconcileScene(scene, b).scene;
    assert.equal(scene.view.cast.length, 0);
    const a = context(); a.sessionEpoch = 3;
    scene = reconcileScene(scene, a).scene;
    reject(scene, { type: 'addCharacter', characterKey: 'mira-a' }, 'STALE_SESSION', token);
    assert.equal(scene.commandRevision, 1);
    assert.equal(scene.overrideRevision, 1);
    assert.equal(scene.revision, 3);
    scene = add(scene); assert.equal(scene.commandRevision, 2);
    assert.equal(reconcileScene(scene, b).result.code, 'STALE_SESSION');
    assert.equal(reconcileScene(scene, { ...a, ownerKey: 'other' }).result.code, 'STALE_SESSION');
});

test('fresh append retains prefix decisions; context revision failures and identity loss fail safely', () => {
    let scene = add(createScene(context()).scene);
    let c = structuredClone(scene.context);
    c.sources.push({ ...c.sources.at(-1), key: 'm8', prefixSha256: 'a'.repeat(64) });
    assert.equal(reconcileScene(scene, c).result.code, 'STALE_REVISION');
    c.historyRevision++; scene = reconcileScene(scene, c).scene;
    assert.equal(scene.commands[0].valid, true);
    for (const field of ['historyRevision', 'selectionRevision']) {
        assert.equal(reconcileScene(scene, { ...c, [field]: -1 }).result.code, 'INVALID_CONTEXT');
    }
    c = structuredClone(scene.context); c.selectionRevision--; assert.equal(reconcileScene(scene, c).result.code, 'STALE_REVISION');
    c = structuredClone(scene.context); c.selectedSourceKey = 'm5'; assert.equal(reconcileScene(scene, c).result.code, 'STALE_REVISION');
    c = structuredClone(scene.context); c.characters = c.characters.filter(c => c.key !== 'mira-a');
    scene = reconcileScene(scene, c).scene;
    assert.equal(scene.commands[0].valid, false);
    assert.equal(scene.view.cast.length, 0);
});

test('catalog refresh preserves requested immutable references with missing/incompatible fallbacks', () => {
    let scene = add(createScene(context()).scene);
    scene = run(scene, { type: 'setOutfit', characterKey: 'mira-a', assetId: 'coat' });
    scene = run(scene, { type: 'setExpression', characterKey: 'mira-a', assetId: 'coat-smile' });
    let c = structuredClone(scene.context);
    c.catalog.assets.find(a => a.id === 'coat').revision = 'v2';
    assert.equal(reconcileScene(scene, c).result.code, 'STALE_REVISION');
    c.catalog.revision++; scene = reconcileScene(scene, c).scene;
    assert.equal(cast(scene).outfit.revision, 'v1');
    assert.equal(cast(scene).outfit.status, 'missing');
    c = structuredClone(scene.context); c.catalog.revision++;
    c.catalog.assets.find(a => a.id === 'coat-smile').characterKey = 'mira-b';
    scene = reconcileScene(scene, c).scene;
    assert.equal(cast(scene).expression.status, 'incompatible');
});

test('deterministic replay of identical validated command histories; identical text has distinct sources', () => {
    function replay() {
        let scene = add(createScene(context()).scene);
        scene = run(scene, { type: 'setExpression', characterKey: 'mira-a', assetId: 'smile' });
        scene = select(scene, 'm5');
        scene = run(scene, { type: 'setBackground', assetId: 'park' });
        scene = run(scene, { type: 'setSlot', characterKey: 'mira-a', slot: 'center' });
        return scene;
    }
    const a = replay(); const b = replay(); assert.deepEqual(a, b);
    assert.equal(projectScene(a, 'm4').projection.cast[0].expression.id, 'smile');
    assert.equal(projectScene(a, 'm5').projection.cast[0].expression, null);
    for (const source of a.context.sources) assert.deepEqual(projectScene(a, source.key), projectScene(b, source.key));
});

test('revision ceiling refuses instead of wrapping', () => {
    const scene = { ...createScene(context()).scene, revision: Number.MAX_SAFE_INTEGER };
    reject(scene, { type: 'clearBackground' }, 'REVISION_LIMIT');
    const c = context(); c.selectionRevision++;
    assert.equal(reconcileScene(scene, c).result.code, 'REVISION_LIMIT');
});

test('malformed journal/catalog entries and sparse arrays refuse instead of throwing', () => {
    for (const mutate of [c => c.catalog.assets.push(null), c => c.characters = new Array(1), c => c.sources = new Array(1)]) {
        const c = context(); mutate(c);
        assert.equal(createScene(c).result.code, 'INVALID_CONTEXT');
    }
    let original = add(createScene(context()).scene);
    original = run(original, { type: 'setBackground', assetId: 'park' });
    for (const mutate of [s => s.commands.push(null), s => s.commands[1].command = null,
        s => s.commands[1].reference = undefined, s => s.commands[1].reference = { id: 'park' },
        s => s.commands[0].command.characterKey = 'missing', s => s.view.background.id = 'forged',
        s => s.commands = new Array(1), s => s.commands[0].source.revision = 99]) {
        const bad = structuredClone(original); mutate(bad);
        const before = structuredClone(bad);
        assert.equal(reduceScene(bad, { type: 'clearBackground' }, {}).result.code, 'INVALID_SCENE');
        assert.equal(projectScene(bad, 'm4').result.code, 'INVALID_SCENE');
        assert.deepEqual(bad, before);
    }
});

test('forward releases retain earlier locks, while expressions and layouts use their distinct scopes', () => {
    let scene = add(createScene(context()).scene);
    scene = run(scene, { type: 'setBackground', assetId: 'park' });
    scene = run(scene, { type: 'setOutfit', characterKey: 'mira-a', assetId: 'coat' });
    scene = select(scene, 'm7');
    for (const field of ['background', 'outfit', 'presence']) scene = run(scene,
        { type: 'release', field, ...(field === 'background' ? {} : { characterKey: 'mira-a' }) });
    const at4 = projectScene(scene, 'm4').projection;
    const at7 = projectScene(scene, 'm7').projection;
    assert.equal(at4.backgroundLocked, true);
    assert.equal(at4.cast[0].locks.outfit, true);
    assert.equal(at4.cast[0].locks.presence, true);
    assert.equal(at7.backgroundLocked, false);
    assert.equal(at7.cast[0].locks.outfit, false);
    assert.equal(at7.cast[0].locks.presence, false);
    scene = run(scene, { type: 'setSlot', characterKey: 'mira-a', slot: 'left' });
    assert.equal(projectScene(scene, 'm4').projection.cast[0].slot, 'left');
    scene = run(scene, { type: 'release', field: 'slot', characterKey: 'mira-a' });
    assert.equal(projectScene(scene, 'm4').projection.cast[0].locks.slot, false);
    scene = run(scene, { type: 'clearOutfit', characterKey: 'mira-a' });
    assert.equal(scene.view.cast[0].outfit, null);
    assert.equal(scene.view.cast[0].expression, null);
});

test('non-data and cyclic malformed views are explainable refusals', () => {
    const scene = structuredClone(createScene(context()).scene);
    scene.view.background = scene.view;
    assert.equal(projectScene(scene, 'm4').result.code, 'INVALID_SCENE');
    scene.view.background = 1n;
    assert.equal(reduceScene(scene, { type: 'clearBackground' }, {}).result.code, 'INVALID_SCENE');
    const good = createScene(context()).scene;
    reject(good, { type: { toString() { throw new Error('must not coerce'); } } }, 'UNKNOWN_COMMAND');
});
