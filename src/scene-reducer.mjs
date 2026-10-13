/** Pure session-only manual scene rules. See docs/M1_SCENE_REDUCER.md. */
/**
 * @typedef {{key: string, revision: number, swipeRevision: number,
 *   fingerprintVersion: 'sn-source-v1', prefixSha256: string}} SceneSource
 * @typedef {{id: string, revision: string, kind: 'background'|'outfit'|'expression',
 *   available: boolean, characterKey?: string, outfitId?: string|null}} CatalogAsset
 * @typedef {{ownerKey: string, sessionEpoch: number, historyRevision: number,
 *   selectionRevision: number, selectedSourceKey: string|null, sources: SceneSource[],
 *   characters: {key: string, label: string}[], catalog: {revision: number, assets: CatalogAsset[]}}} SceneContext
 * @typedef {{ownerKey: string, sessionEpoch: number, historyRevision: number,
 *   selectionRevision: number, catalogRevision: number, expectedRevision: number,
 *   source: SceneSource, origin: 'manual'|'automatic'}} SceneAuthority
 * @typedef {{type: 'setBackground', assetId: string} | {type: 'clearBackground'} |
 *   {type: 'addCharacter', characterKey: string} |
 *   {type: 'setPresence', characterKey: string, present: boolean} |
 *   {type: 'setSlot', characterKey: string, slot: 'left'|'center'|'right'|null, mode?: 'move'|'swap'|'replace'} |
 *   {type: 'setOutfit'|'setExpression', characterKey: string, assetId: string} |
 *   {type: 'clearOutfit'|'clearExpression', characterKey: string} |
 *   {type: 'lock'|'release', field: 'background'|'presence'|'slot'|'outfit', characterKey?: string}} SceneCommand
 */
export const SCENE_SCHEMA_VERSION = 1;
const SLOTS = ['left', 'center', 'right'];
const FIELDS = ['background', 'presence', 'slot', 'outfit'];
const COMMAND_KEYS = {
    setBackground: ['assetId'], clearBackground: [], addCharacter: ['characterKey'],
    setPresence: ['characterKey', 'present'], setSlot: ['characterKey', 'slot', 'mode'],
    setOutfit: ['characterKey', 'assetId'], clearOutfit: ['characterKey'],
    setExpression: ['characterKey', 'assetId'], clearExpression: ['characterKey'],
    lock: ['field', 'characterKey'], release: ['field', 'characterKey'],
};
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const text = value => typeof value === 'string' && value.length > 0;
const revision = value => Number.isSafeInteger(value) && value >= 0;
const keys = (value, allowed) => record(value) && Object.keys(value).every(key => allowed.includes(key));
function equal(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    return Object.keys(a).length === Object.keys(b).length
        && Object.keys(a).every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
}
function freeze(value) {
    if (value && typeof value === 'object') {
        for (const child of Object.values(value)) freeze(child);
        Object.freeze(value);
    }
    return value;
}
const copy = value => structuredClone(value);
function refused(scene, code, detail) {
    return { scene, result: freeze({ accepted: false, code, detail }) };
}
function accepted(scene, code = 'ACCEPTED') {
    return { scene, result: freeze({ accepted: true, code }) };
}
function unique(items, key) {
    return Array.from(items).every(record) && new Set(items.map(item => item[key])).size === items.length;
}
function validSource(source) {
    return keys(source, ['key', 'revision', 'swipeRevision', 'prefixSha256', 'fingerprintVersion'])
        && text(source.key) && revision(source.revision) && revision(source.swipeRevision)
        && source.fingerprintVersion === 'sn-source-v1' && typeof source.prefixSha256 === 'string' && /^[a-f0-9]{64}$/.test(source.prefixSha256);
}
function validContext(context) {
    return keys(context, ['ownerKey', 'sessionEpoch', 'historyRevision', 'selectionRevision', 'selectedSourceKey', 'sources', 'characters', 'catalog'])
        && text(context.ownerKey) && revision(context.sessionEpoch) && revision(context.historyRevision)
        && revision(context.selectionRevision)
        && Array.isArray(context.sources) && context.sources.every(validSource) && unique(context.sources, 'key')
        && (context.selectedSourceKey === null || context.sources.some(source => source.key === context.selectedSourceKey))
        && Array.isArray(context.characters) && context.characters.every(character => keys(character, ['key', 'label'])
            && text(character.key) && typeof character.label === 'string') && unique(context.characters, 'key')
        && keys(context.catalog, ['revision', 'assets']) && revision(context.catalog.revision)
        && Array.isArray(context.catalog.assets) && context.catalog.assets.every(asset => keys(asset, ['id', 'revision', 'kind', 'characterKey', 'outfitId', 'available'])
            && text(asset.id) && text(asset.revision) && ['background', 'outfit', 'expression'].includes(asset.kind)
            && typeof asset.available === 'boolean'
            && (asset.kind === 'background' ? asset.characterKey === undefined && asset.outfitId === undefined
                : text(asset.characterKey) && (asset.kind === 'outfit' ? asset.outfitId === undefined
                    : asset.outfitId === null || text(asset.outfitId)))) && unique(context.catalog.assets, 'id');
}
function validCommand(command) {
    if (!record(command) || typeof command.type !== 'string' || !Object.hasOwn(COMMAND_KEYS, command.type)) return 'UNKNOWN_COMMAND';
    if (!keys(command, ['type', ...COMMAND_KEYS[command.type]])) return 'INVALID_COMMAND';
    if (COMMAND_KEYS[command.type].includes('characterKey') && !['lock', 'release'].includes(command.type)
        && !text(command.characterKey)) return 'INVALID_COMMAND';
    if (COMMAND_KEYS[command.type].includes('assetId') && !text(command.assetId)) return 'INVALID_COMMAND';
    if (command.type === 'setPresence' && typeof command.present !== 'boolean') return 'INVALID_COMMAND';
    if (command.type === 'setSlot' && (!SLOTS.includes(command.slot) && command.slot !== null
        || command.mode !== undefined && !['move', 'swap', 'replace'].includes(command.mode)
        || command.slot === null && command.mode !== undefined && command.mode !== 'move')) return 'INVALID_COMMAND';
    if (['lock', 'release'].includes(command.type) && (!FIELDS.includes(command.field)
        || (command.field === 'background' ? command.characterKey !== undefined : !text(command.characterKey)))) return 'INVALID_COMMAND';
    return null;
}
function neutral() {
    return { background: null, backgroundLocked: false, cast: [], slots: { left: null, center: null, right: null } };
}
function member(identity) {
    return { ...identity, present: false, slot: null, visible: false, outfit: null, expression: null,
        locks: { presence: false, slot: false, outfit: false } };
}
function assetReference(context, assetId) {
    const asset = context.catalog.assets.find(item => item.id === assetId);
    return { id: asset.id, revision: asset.revision, status: asset.available ? 'ready' : 'missing' };
}
function assetError(context, command, character) {
    if (!COMMAND_KEYS[command.type].includes('assetId')) return null;
    const kind = { setBackground: 'background', setOutfit: 'outfit', setExpression: 'expression' }[command.type];
    const asset = context.catalog.assets.find(item => item.id === command.assetId);
    if (!asset) return 'UNKNOWN_ASSET';
    if (asset.kind !== kind || kind !== 'background' && (asset.characterKey !== character.key
        || kind === 'expression' && asset.outfitId !== (character.outfit?.id ?? null))) return 'INCOMPATIBLE_ASSET';
    return null;
}
/** Apply to an owned mutable projection only. Never called on caller objects. */
function apply(view, command, origin, reference) {
    const character = view.cast.find(item => item.key === command.characterKey);
    const manual = origin === 'manual';
    if (command.type === 'addCharacter') {
        character.present = true;
        character.locks.presence = manual;
    } else if (command.type === 'setBackground' || command.type === 'clearBackground') {
        view.background = command.type === 'setBackground' ? reference : null;
        view.backgroundLocked = manual;
    } else if (command.type === 'setPresence') {
        character.present = command.present;
        character.locks.presence = manual;
    } else if (command.type === 'setOutfit' || command.type === 'clearOutfit') {
        character.outfit = command.type === 'setOutfit' ? reference : null;
        character.expression = null;
        character.locks.outfit = manual;
    } else if (command.type === 'setExpression' || command.type === 'clearExpression') {
        character.expression = command.type === 'setExpression' ? reference : null;
    } else if (command.type === 'setSlot') {
        const occupant = command.slot === null ? null : view.cast.find(item => item.slot === command.slot && item !== character);
        if (occupant) {
            occupant.slot = command.mode === 'swap' ? character.slot : null;
            occupant.locks.slot = manual;
        }
        character.slot = command.slot;
        character.locks.slot = manual;
    } else if (command.field === 'background') {
        view.backgroundLocked = command.type === 'lock';
    } else {
        character.locks[command.field] = command.type === 'lock';
    }
}
function commandError(view, command, origin, context) {
    const character = view.cast.find(item => item.key === command.characterKey);
    if (command.characterKey && !context.characters.some(item => item.key === command.characterKey)) return 'UNRESOLVED_CHARACTER';
    if (command.characterKey && !character) return 'CHARACTER_NOT_ADDED';
    const error = assetError(context, command, character);
    if (error) return error;
    const field = { setBackground: 'background', clearBackground: 'background', addCharacter: 'presence',
        setPresence: 'presence', setSlot: 'slot', setOutfit: 'outfit', clearOutfit: 'outfit' }[command.type];
    if (origin === 'automatic') {
        if (['lock', 'release'].includes(command.type)) return 'MANUAL_ONLY';
        if (field === 'background' ? view.backgroundLocked : character?.locks[field]) return 'LOCKED';
    }
    if (command.type === 'setSlot') {
        const occupant = command.slot === null ? null : view.cast.find(item => item.slot === command.slot && item !== character);
        if (occupant && (command.mode ?? 'move') === 'move') return 'SLOT_OCCUPIED';
        if (command.mode === 'swap' && (!occupant || character.slot === null)) return 'INVALID_SWAP';
        if (origin === 'automatic' && occupant?.locks.slot) return 'LOCKED';
    }
    return null;
}
function refreshReference(reference, context, kind, character) {
    if (!reference) return null;
    const asset = context.catalog.assets.find(item => item.id === reference.id && item.revision === reference.revision);
    const compatible = asset && asset.kind === kind && (kind === 'background' || asset.characterKey === character.key
        && (kind !== 'expression' || asset.outfitId === (character.outfit?.id ?? null)));
    return { ...reference, status: !asset ? 'missing' : !compatible ? 'incompatible' : asset.available ? 'ready' : 'missing' };
}
function project(scene, sourceKey) {
    const context = scene.context;
    const selectedIndex = context.sources.findIndex(source => source.key === sourceKey);
    // ponytail: linear in-memory journal, no pruning; add validated checkpoints with the future bounded storage contract.
    const active = scene.commands.filter(entry => entry.valid);
    const view = neutral();
    // Logical registration survives offstage/absence; presence itself is forward-scoped.
    for (const entry of active.filter(entry => entry.command.type === 'addCharacter')) {
        if (!view.cast.some(item => item.key === entry.command.characterKey)) {
            view.cast.push(member(context.characters.find(item => item.key === entry.command.characterKey)));
        }
    }
    const layout = entry => entry.command.type === 'setSlot'
        || ['lock', 'release'].includes(entry.command.type) && entry.command.field === 'slot';
    const ordered = active.filter(entry => !layout(entry)).sort((a, b) =>
        context.sources.findIndex(source => source.key === a.source.key) - context.sources.findIndex(source => source.key === b.source.key)
        || a.revision - b.revision);
    for (const entry of ordered) {
        const index = context.sources.findIndex(source => source.key === entry.source.key);
        if (index > selectedIndex) continue;
        if (['setExpression', 'clearExpression'].includes(entry.command.type) && entry.source.key !== sourceKey) continue;
        apply(view, entry.command, entry.origin, entry.reference);
    }
    for (const entry of active.filter(layout)) apply(view, entry.command, entry.origin, entry.reference);
    view.background = refreshReference(view.background, context, 'background');
    for (const character of view.cast) {
        character.outfit = refreshReference(character.outfit, context, 'outfit', character);
        character.expression = refreshReference(character.expression, context, 'expression', character);
        character.visible = character.present && character.slot !== null;
        if (character.visible) view.slots[character.slot] = character.key;
    }
    return view;
}
function validReference(reference) {
    return reference === null || keys(reference, ['id', 'revision', 'status']) && text(reference.id)
        && text(reference.revision) && ['ready', 'missing', 'incompatible'].includes(reference.status);
}
function validView(view) {
    return keys(view, ['background', 'backgroundLocked', 'cast', 'slots']) && validReference(view.background)
        && typeof view.backgroundLocked === 'boolean' && keys(view.slots, SLOTS)
        && SLOTS.every(slot => view.slots[slot] === null || text(view.slots[slot]))
        && Array.isArray(view.cast) && Array.from(view.cast).every(character =>
            keys(character, ['key', 'label', 'present', 'slot', 'visible', 'outfit', 'expression', 'locks'])
            && text(character.key) && typeof character.label === 'string' && typeof character.present === 'boolean'
            && typeof character.visible === 'boolean' && (character.slot === null || SLOTS.includes(character.slot))
            && validReference(character.outfit) && validReference(character.expression)
            && keys(character.locks, ['presence', 'slot', 'outfit'])
            && ['presence', 'slot', 'outfit'].every(field => typeof character.locks[field] === 'boolean'));
}
function validScene(scene) {
    if (!keys(scene, ['schemaVersion', 'context', 'revision', 'commandRevision', 'overrideRevision', 'commands', 'view', 'invalidatedFrom'])
        || scene.schemaVersion !== SCENE_SCHEMA_VERSION || !validContext(scene.context)
        || !revision(scene.revision) || !revision(scene.commandRevision) || !revision(scene.overrideRevision)
        || scene.commandRevision > scene.revision || scene.overrideRevision > scene.commandRevision
        || !Array.isArray(scene.commands) || scene.commands.length > scene.commandRevision
        || scene.invalidatedFrom !== null && !revision(scene.invalidatedFrom) || !validView(scene.view)) return false;
    if (!Array.from(scene.commands).every((entry, index) => keys(entry, ['revision', 'origin', 'source', 'command', 'reference', 'valid'])
        && revision(entry.revision) && entry.revision > (scene.commands[index - 1]?.revision ?? 0)
        && entry.revision <= scene.commandRevision && ['manual', 'automatic'].includes(entry.origin)
        && validSource(entry.source) && validCommand(entry.command) === null && typeof entry.valid === 'boolean'
        && (COMMAND_KEYS[entry.command.type].includes('assetId')
            ? keys(entry.reference, ['id', 'revision', 'status']) && entry.reference.id === entry.command.assetId
                && text(entry.reference.revision) && ['ready', 'missing'].includes(entry.reference.status)
            : entry.reference === null))) return false;
    const active = scene.commands.filter(entry => entry.valid);
    if (!active.every(entry => scene.context.sources.some(source => equal(source, entry.source))
        && (!entry.command.characterKey || scene.context.characters.some(character => character.key === entry.command.characterKey)
            && active.some(add => add.command.type === 'addCharacter' && add.command.characterKey === entry.command.characterKey)))) return false;
    return equal(scene.view, project(scene, scene.context.selectedSourceKey));
}
function finish(scene) {
    scene.view = project(scene, scene.context.selectedSourceKey);
    return accepted(freeze(scene));
}
/**
 * Caller attests that context ownership, source correspondence and character keys
 * are freshly verified (or explicitly manually resolved). No host ID inference.
 * @param {SceneContext} context Session authority; exact shape in the contract.
 * @returns {{scene: object|null, result: object}}
 */
export function createScene(context) {
    if (!validContext(context)) return refused(null, 'INVALID_CONTEXT', 'Require unique verified session/source keys and a typed catalog.');
    return finish({ schemaVersion: SCENE_SCHEMA_VERSION, context: copy(context), revision: 0,
        commandRevision: 0, overrideRevision: 0, commands: [], view: neutral(), invalidatedFrom: null });
}
/** Read a projection without advancing any revisions or changing selection. */
export function projectScene(scene, sourceKey) {
    if (!validScene(scene)) return refused(scene, 'INVALID_SCENE', 'Unsupported or malformed in-memory scene.');
    if (!scene.context.sources.some(source => source.key === sourceKey)) return refused(scene, 'UNRESOLVED_SOURCE', 'Source is absent or ambiguous.');
    return { scene, projection: freeze(project(scene, sourceKey)), result: freeze({ accepted: true, code: 'PROJECTED' }) };
}
/**
 * @param {object} previous Immutable schema-v1 scene.
 * @param {SceneCommand} command Explicit operation; no caller-selected scopes.
 * @param {SceneAuthority} authority Captured owner/session/selection/history/catalog/state revisions and exact source.
 * @returns {{scene: object, result: {accepted: boolean, code: string, detail?: string}}}
 */
export function reduceScene(previous, command, authority) {
    if (!validScene(previous)) return refused(previous, 'INVALID_SCENE', 'Unsupported or malformed in-memory scene.');
    const malformed = validCommand(command);
    if (malformed) return refused(previous, malformed, 'Unknown operation, extra fields or invalid payload.');
    const context = previous.context;
    if (!keys(authority, ['ownerKey', 'sessionEpoch', 'selectionRevision', 'historyRevision', 'catalogRevision', 'expectedRevision', 'source', 'origin'])
        || !['manual', 'automatic'].includes(authority.origin) || !validSource(authority.source)) {
        return refused(previous, 'MISSING_AUTHORITY', 'An exact captured source and origin are required.');
    }
    if (authority.ownerKey !== context.ownerKey || authority.sessionEpoch !== context.sessionEpoch) return refused(previous, 'STALE_SESSION', 'Owner/session no longer matches.');
    if (authority.expectedRevision !== previous.revision || authority.catalogRevision !== context.catalog.revision) return refused(previous, 'STALE_REVISION', 'Scene/catalog revision no longer matches.');
    if (authority.selectionRevision !== context.selectionRevision || authority.source.key !== context.selectedSourceKey) return refused(previous, 'STALE_SELECTION', 'Selected source no longer matches.');
    if (authority.historyRevision !== context.historyRevision || !equal(authority.source, context.sources.find(source => source.key === authority.source.key))) return refused(previous, 'STALE_SOURCE', 'Source/prefix/swipe revision no longer matches.');
    if (previous.revision === Number.MAX_SAFE_INTEGER || previous.commandRevision === Number.MAX_SAFE_INTEGER) return refused(previous, 'REVISION_LIMIT', 'Start a separately validated session; revisions cannot wrap.');
    const scene = copy(previous);
    const index = context.sources.findIndex(source => source.key === authority.source.key);
    // A historical deliberate correction never silently replays its dependent suffix.
    if (authority.origin === 'manual') {
        for (const entry of scene.commands) {
            if (entry.valid && context.sources.findIndex(source => source.key === entry.source.key) > index) {
                entry.valid = false;
                scene.invalidatedFrom = index + 1;
            }
        }
    }
    const view = project(scene, context.selectedSourceKey);
    if (command.type === 'addCharacter' && !view.cast.some(item => item.key === command.characterKey)) {
        const identity = context.characters.find(item => item.key === command.characterKey);
        if (identity) view.cast.push(member(identity));
    }
    const error = commandError(view, command, authority.origin, context);
    if (error) return refused(previous, error, 'Command failed identity, asset, lock or slot validation.');
    scene.revision++;
    scene.commandRevision++;
    if (authority.origin === 'manual') scene.overrideRevision++;
    scene.commands.push({ revision: scene.commandRevision, origin: authority.origin, source: copy(authority.source),
        command: copy(command), reference: command.assetId ? assetReference(context, command.assetId) : null, valid: true });
    return finish(scene);
}
/**
 * Install a freshly validated caller context. Navigation is separate from commands.
 * First changed ordered source invalidates the whole dependent suffix, permanently.
 * A newer session epoch resets visuals; no restore/copy ownership is inferred.
 */
export function reconcileScene(previous, context) {
    if (!validScene(previous)) return refused(previous, 'INVALID_SCENE', 'Unsupported or malformed in-memory scene.');
    if (!validContext(context)) return refused(previous, 'INVALID_CONTEXT', 'Require unique verified keys and typed catalog.');
    const prior = previous.context;
    if (context.sessionEpoch < prior.sessionEpoch || context.ownerKey !== prior.ownerKey && context.sessionEpoch <= prior.sessionEpoch) return refused(previous, 'STALE_SESSION', 'Session epoch must advance on activation.');
    if (previous.revision === Number.MAX_SAFE_INTEGER) return refused(previous, 'REVISION_LIMIT', 'Scene revision cannot wrap.');
    if (context.sessionEpoch > prior.sessionEpoch) {
        const next = createScene(context).scene;
        return accepted(freeze({ ...next, revision: previous.revision + 1, commandRevision: previous.commandRevision, overrideRevision: previous.overrideRevision }), 'SESSION_RESET');
    }
    if (context.historyRevision < prior.historyRevision || context.selectionRevision < prior.selectionRevision
        || context.catalog.revision < prior.catalog.revision) return refused(previous, 'STALE_REVISION', 'Context revisions cannot go backwards.');
    if (!equal(context.sources, prior.sources) && context.historyRevision === prior.historyRevision
        || context.selectedSourceKey !== prior.selectedSourceKey && context.selectionRevision === prior.selectionRevision
        || !equal(context.catalog, prior.catalog) && context.catalog.revision === prior.catalog.revision) return refused(previous, 'STALE_REVISION', 'Changed context requires an advanced revision.');
    if (equal(context, prior)) return accepted(previous, 'UNCHANGED');
    const scene = copy(previous);
    let firstChanged = 0;
    while (firstChanged < Math.min(prior.sources.length, context.sources.length)
        && equal(prior.sources[firstChanged], context.sources[firstChanged])) firstChanged++;
    const changed = firstChanged < prior.sources.length;
    for (const entry of scene.commands) {
        const oldIndex = prior.sources.findIndex(source => source.key === entry.source.key);
        if (entry.valid && (changed && oldIndex >= firstChanged
            || entry.command.characterKey && !context.characters.some(item => item.key === entry.command.characterKey))) entry.valid = false;
    }
    if (changed) scene.invalidatedFrom = firstChanged;
    scene.context = copy(context);
    scene.revision++;
    return finish(scene);
}
