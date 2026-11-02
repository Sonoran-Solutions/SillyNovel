/** Pure memory-only automatic layout (background, presence) over the merged reducer. See docs/M2_3_DIRECTOR_IMPLEMENTATION.md. */
import { applyProposal } from './director-proposal.mjs';
import { createScene, projectScene, reconcileScene, reduceScene } from './scene-reducer.mjs';

const assetOf = ({ id, revision, kind, characterKey, outfitId, available }) => ({ id, revision, kind, available,
    ...(characterKey === undefined ? {} : { characterKey }), ...(outfitId === undefined ? {} : { outfitId }) });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// A correction is a manual command on the two fields automation can move, nothing else (F7, G5).
const correctable = ({ type, field } = {}) => ['setBackground', 'clearBackground', 'setPresence'].includes(type) || type === 'release' && ['background', 'presence'].includes(field);
/**
 * One reducer scene per attachment, never saved. The base is the project layout replayed as manual
 * commands at the first source, so it applies at every message and its locks stay locks (D4).
 * The scene's own revisions are monotonic here; a rebase restarts scene.revision, so a caller holding
 * a captured scene compares identity. Slots stay out: they are never automatic and composition reads them from the global view.
 * @param {{ownerKey: string, sessionEpoch: number}} identity
 */
export function createDirectorOverlay({ ownerKey, sessionEpoch }) {
    let scene = null, args = null, history = 0, selection = 0, catalog = 0, memo = null, epoch = 0, baseLength = 0;
    const install = next => { scene = next; memo = null; return scene; };
    const contextOf = (layout, sources, selectedSourceKey, assets) => ({ ownerKey, sessionEpoch, historyRevision: history, selectionRevision: selection, selectedSourceKey, sources,
        characters: layout.actors.map(({ key, label }) => ({ key, label })), catalog: { revision: catalog, assets } });
    // A cursor not fingerprinted yet keeps the last selection, so a reply starting does not flash the stage back to the global layout.
    const selectable = (sources, key) => sources.some(item => item.key === key) ? key : sources.some(item => item.key === scene?.context.selectedSourceKey) ? scene.context.selectedSourceKey : sources.at(-1)?.key ?? null;
    function replay(layout, sources, assets) {
        const created = createScene(contextOf(layout, sources, sources[0].key, assets));
        if (!created.result.accepted) return null;
        let current = created.scene;
        const apply = command => {
            const outcome = reduceScene(current, command, { ownerKey, sessionEpoch, historyRevision: history, selectionRevision: selection, catalogRevision: catalog, expectedRevision: current.revision, source: sources[0], origin: 'manual' });
            if (outcome.result.accepted) current = outcome.scene;
            return outcome.result.accepted;
        };
        const lock = (field, locked, characterKey) => apply({ type: locked ? 'lock' : 'release', field, ...(characterKey ? { characterKey } : {}) });
        const { view } = layout;
        if (view.background && !apply({ type: 'setBackground', assetId: view.background.id })) return null;
        if (!lock('background', view.backgroundLocked)) return null;
        for (const actor of view.cast) {
            const characterKey = actor.key;
            if (!apply({ type: 'addCharacter', characterKey }) || !apply({ type: 'setPresence', characterKey, present: actor.present })) return null;
            if (actor.outfit && !apply({ type: 'setOutfit', characterKey, assetId: actor.outfit.id })) return null;
            if (!lock('presence', actor.locks.presence, characterKey) || !lock('outfit', actor.locks.outfit, characterKey)) return null;
        }
        baseLength = current.commands.length;
        return current;
    }
    // Which command decided each field at a source: the base, a correction, or the director. The projection carries no origin.
    function originsAt(sourceKey) {
        const { sources } = scene.context, index = key => sources.findIndex(item => item.key === key), limit = index(sourceKey), origins = { background: null, presence: {} };
        const standing = scene.commands.map((entry, position) => ({ entry, position })).filter(({ entry }) => entry.valid && index(entry.source.key) <= limit);
        standing.sort((a, b) => index(a.entry.source.key) - index(b.entry.source.key) || a.entry.revision - b.entry.revision);
        for (const { entry, position } of standing) {
            const { type, characterKey } = entry.command, origin = { origin: position < baseLength ? 'base' : entry.origin === 'manual' ? 'correction' : 'automatic', revision: entry.revision, sourceKey: entry.source.key };
            if (type === 'setBackground' || type === 'clearBackground') origins.background = origin;
            else if (type === 'setPresence' || type === 'addCharacter') origins.presence[characterKey] = origin;
        }
        return origins;
    }
    /** Discards every automatic command. Returns the new scene, or null when the layout cannot be replayed. */
    function rebase(layout, sources, { selectedSourceKey, assets }) {
        args = { layout, sources, selection: { selectedSourceKey, assets } };
        history++; selection++; catalog++; epoch++;
        const mapped = assets.map(assetOf), target = selectable(sources, selectedSourceKey);
        const base = sources.length ? replay(layout, sources, mapped) : null;
        if (!base || target === sources[0].key) return install(base);
        selection++;
        const moved = reconcileScene(base, contextOf(layout, sources, target, mapped));
        return install(moved.result.accepted ? moved.scene : null);
    }
    return {
        rebase,
        /** Forwards history, selection and catalog changes. Automatic commands at or after the first changed source are invalidated, never retried. */
        reconcile(sources, { selectedSourceKey, assets }) {
            if (!args) return null;
            // The base is anchored at the first source: when that changes, nothing can survive anyway.
            if (!scene || !sources.length || !same(scene.context.sources[0], sources[0])) return rebase(args.layout, sources, { selectedSourceKey, assets });
            args = { ...args, sources, selection: { selectedSourceKey, assets } };
            const prior = scene.context, mapped = assets.map(assetOf), target = selectable(sources, selectedSourceKey);
            if (!same(prior.sources, sources)) history++;
            if (prior.selectedSourceKey !== target) selection++;
            if (!same(prior.catalog.assets, mapped)) catalog++;
            const outcome = reconcileScene(scene, contextOf(args.layout, sources, target, mapped));
            return outcome.result.code === 'UNCHANGED' ? scene : install(outcome.result.accepted ? outcome.scene : null);
        },
        /** A manual command forward from the selected message, in memory only; later overlay commands fall by the reducer's rule. A refusal keeps the exact scene. */
        correct(command, authority) {
            if (authority?.origin !== 'manual') return { accepted: false, code: 'MANUAL_ONLY' };
            if (!correctable(command)) return { accepted: false, code: 'INVALID_COMMAND' };
            if (!scene) return { accepted: false, code: 'INVALID_SCENE' };
            const standing = scene.commands.filter(entry => entry.valid).length, { scene: next, result } = reduceScene(scene, command, authority);
            if (!result.accepted) return { accepted: false, code: result.code };
            install(next);
            return { accepted: true, code: result.code, invalidated: standing + 1 - next.commands.filter(entry => entry.valid).length };
        },
        /** Layout-only proposal through the merged atomic path; a refusal keeps the exact scene. */
        apply(proposal, token, evidence) {
            const { scene: next, result } = applyProposal(scene, proposal, token, evidence);
            if (result.accepted) install(next);
            return result;
        },
        project(sourceKey) {
            if (!scene) return null;
            const key = selectable(scene.context.sources, sourceKey);
            if (memo?.key !== key) { const { projection } = projectScene(scene, key); memo = { key, projection: projection ? { ...projection, origins: originsAt(key) } : null }; }
            return memo.projection;
        },
        clear() { return args ? rebase(args.layout, args.sources, args.selection) : null; },
        active: () => Boolean(scene?.commands.slice(baseLength).some(entry => entry.valid)),
        corrected: () => Boolean(scene?.commands.slice(baseLength).some(entry => entry.valid && entry.origin === 'manual')),
        commandValid: revision => Boolean(scene?.commands.some(entry => entry.revision === revision && entry.valid)),
        scene: () => scene,
        /** Advanced by every rebase, because a rebase restarts command revisions. */
        epoch: () => epoch,
        dispose() { install(null); args = null; },
    };
}
/**
 * Global view (with expressions composed) under the overlay's background, presence and their locks.
 * Origin comes from the command that decided the field; slots and outfits stay global. A lock only the overlay holds is a correction's.
 */
export function composeLayout(view, projection) {
    if (!projection) return view;
    const { origins } = projection;
    const cast = view.cast.map(actor => {
        const at = projection.cast.find(item => item.key === actor.key), origin = origins.presence[actor.key]?.origin;
        if (!at) return actor;
        const lockOnly = at.locks.presence && !actor.locks.presence, locks = at.locks.presence === actor.locks.presence ? actor.locks : { ...actor.locks, presence: at.locks.presence };
        if (origin === 'base' || !origin) return locks === actor.locks ? actor : { ...actor, locks };
        return { ...actor, locks, present: at.present, visible: at.present && actor.slot !== null, presenceOrigin: origin, ...(lockOnly ? { presenceLockOrigin: 'correction' } : {}) };
    });
    const slots = { left: null, center: null, right: null };
    for (const actor of cast) if (actor.visible) slots[actor.slot] = actor.key;
    const origin = origins.background?.origin, moved = origin && origin !== 'base';
    return { ...view, cast, slots, overlayOrigins: origins, backgroundLocked: projection.backgroundLocked,
        background: moved ? projection.background && { ...projection.background, origin } : view.background,
        ...(moved ? { backgroundOrigin: origin } : {}), ...(projection.backgroundLocked && !view.backgroundLocked ? { backgroundLockOrigin: 'correction' } : {}) };
}
