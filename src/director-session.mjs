/** Pure non-persisted validation scene and E3-A routing. See docs/M2_2_DIRECTOR_IMPLEMENTATION.md. */
import { createScene, reduceScene } from './scene-reducer.mjs';

const assetOf = ({ id, revision, kind, characterKey, outfitId, available }) => ({ id, revision, kind, available,
    ...(characterKey === undefined ? {} : { characterKey }), ...(outfitId === undefined ? {} : { outfitId }) });
/**
 * Replays the project layout as manual commands at the selected source, only so
 * validateProposal and checkProposalEvidence run against real IDs, locks and prefix hashes.
 * Rebuilt per request and never saved. Returns null when the layout cannot be replayed.
 */
export function mirrorScene({ ownerKey, sessionEpoch, historyRevision, selectionRevision, catalogRevision, selectedSourceKey, sources, actors, assets, view }) {
    const created = createScene({ ownerKey, sessionEpoch, historyRevision, selectionRevision, selectedSourceKey, sources,
        characters: actors.map(({ key, label }) => ({ key, label })), catalog: { revision: catalogRevision, assets: assets.map(assetOf) } });
    if (!created.result.accepted) return null;
    let scene = created.scene;
    const source = sources.find(item => item.key === selectedSourceKey);
    const apply = command => {
        const outcome = reduceScene(scene, command, { ownerKey, sessionEpoch, historyRevision, selectionRevision, catalogRevision, expectedRevision: scene.revision, source, origin: 'manual' });
        if (!outcome.result.accepted) return false;
        scene = outcome.scene;
        return true;
    };
    const lock = (field, locked, characterKey) => apply({ type: locked ? 'lock' : 'release', field, ...(characterKey ? { characterKey } : {}) });
    if (view.background && !apply({ type: 'setBackground', assetId: view.background.id })) return null;
    if (!lock('background', view.backgroundLocked)) return null;
    for (const actor of view.cast) {
        const characterKey = actor.key;
        if (!apply({ type: 'addCharacter', characterKey }) || !apply({ type: 'setPresence', characterKey, present: actor.present })) return null;
        if (actor.outfit && !apply({ type: 'setOutfit', characterKey, assetId: actor.outfit.id })) return null;
        if (!lock('presence', actor.locks.presence, characterKey) || !lock('outfit', actor.locks.outfit, characterKey)) return null;
    }
    return scene;
}
/**
 * E3-A: expressions go to the journal, layout is recorded as ignored, suggestions are text.
 * An expression chosen for an outfit that is not applied falls with that outfit.
 */
export function routeProposal(proposal, view) {
    const expressions = [], ignored = [], suggestions = [];
    for (const [index, update] of proposal.updates.entries()) {
        if (update.op === 'suggestLocation') { suggestions.push({ index, label: update.label.trim() }); continue; }
        if (update.op === 'setLocation') { ignored.push({ index, field: 'background', code: 'NO_AUTOMATIC_LAYOUT' }); continue; }
        const { characterKey } = update, current = view.cast.find(actor => actor.key === characterKey)?.outfit?.id ?? null;
        const skip = field => ignored.push({ index, field, characterKey, code: 'NO_AUTOMATIC_LAYOUT' });
        if (Object.hasOwn(update, 'present')) skip('presence');
        if (Object.hasOwn(update, 'outfitId')) skip('outfit');
        if (update.expressionId) {
            if (Object.hasOwn(update, 'outfitId') && update.outfitId !== current) skip('expression');
            else expressions.push({ index, characterKey, assetId: update.expressionId });
        }
    }
    return { expressions, ignored, suggestions };
}
