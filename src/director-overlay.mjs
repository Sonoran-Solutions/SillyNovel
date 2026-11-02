/** Pure memory-only automatic layout (background, presence) over the merged reducer. See docs/M2_3_DIRECTOR_IMPLEMENTATION.md. */
import { applyProposal } from './director-proposal.mjs';
import { createScene, projectScene, reconcileScene, reduceScene } from './scene-reducer.mjs';

const assetOf = ({ id, revision, kind, characterKey, outfitId, available }) => ({ id, revision, kind, available,
    ...(characterKey === undefined ? {} : { characterKey }), ...(outfitId === undefined ? {} : { outfitId }) });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/**
 * One reducer scene per attachment, never saved. The base is the project layout replayed as manual
 * commands at the first source, so it applies at every message and its locks stay locks (D4).
 * The scene's own revisions are monotonic here; a rebase restarts scene.revision, so a caller holding
 * a captured scene compares identity. Slots stay out: they are never automatic and composition reads them from the global view.
 * @param {{ownerKey: string, sessionEpoch: number}} identity
 */
export function createDirectorOverlay({ ownerKey, sessionEpoch }) {
    let scene = null, args = null, history = 0, selection = 0, catalog = 0, memo = null;
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
        return current;
    }
    /** Discards every automatic command. Returns the new scene, or null when the layout cannot be replayed. */
    function rebase(layout, sources, { selectedSourceKey, assets }) {
        args = { layout, sources, selection: { selectedSourceKey, assets } };
        history++; selection++; catalog++;
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
        /** Layout-only proposal through the merged atomic path; a refusal keeps the exact scene. */
        apply(proposal, token, evidence) {
            const { scene: next, result } = applyProposal(scene, proposal, token, evidence);
            if (result.accepted) install(next);
            return result;
        },
        project(sourceKey) {
            if (!scene) return null;
            const key = selectable(scene.context.sources, sourceKey);
            if (memo?.key !== key) memo = { key, projection: projectScene(scene, key).projection ?? null };
            return memo.projection;
        },
        clear() { return args ? rebase(args.layout, args.sources, args.selection) : null; },
        active: () => Boolean(scene?.commands.some(entry => entry.valid && entry.origin === 'automatic')),
        scene: () => scene,
        dispose() { install(null); args = null; },
    };
}
/** Global view (with expressions composed) under the overlay's background and presence. Only what differs is marked as the director's. */
export function composeLayout(view, projection) {
    if (!projection) return view;
    const cast = view.cast.map(actor => {
        const present = projection.cast.find(item => item.key === actor.key)?.present ?? actor.present;
        return present === actor.present ? actor : { ...actor, present, visible: present && actor.slot !== null, presenceOrigin: 'automatic' };
    });
    const slots = { left: null, center: null, right: null };
    for (const actor of cast) if (actor.visible) slots[actor.slot] = actor.key;
    const moved = projection.background && projection.background.id !== view.background?.id;
    return { ...view, cast, slots, background: moved ? { ...projection.background, origin: 'automatic' } : view.background };
}
