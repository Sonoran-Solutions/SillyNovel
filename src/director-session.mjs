/** Pure proposal routing under F7 (E3 option B). See docs/M2_2_DIRECTOR_IMPLEMENTATION.md and docs/M2_3_DIRECTOR_IMPLEMENTATION.md. */
/**
 * Background and presence go to the memory-only overlay, expressions to the journal, suggestions are text.
 * Outfit stays NO_AUTOMATIC_LAYOUT (F7): the journal binds expressions to the global outfit. An expression chosen for an
 * outfit that is not applied falls with that outfit. A value the stage already shows is not a change, so it spends no command.
 */
export function routeProposal(proposal, view) {
    const updates = [], expressions = [], ignored = [], suggestions = [];
    for (const [index, update] of proposal.updates.entries()) {
        if (update.op === 'suggestLocation') { suggestions.push({ index, label: update.label.trim() }); continue; }
        if (update.op === 'setLocation') { if (update.backgroundId !== view.background?.id) updates.push(update); continue; }
        const { characterKey } = update, actor = view.cast.find(item => item.key === characterKey), current = actor?.outfit?.id ?? null;
        const skip = field => ignored.push({ index, field, characterKey, code: 'NO_AUTOMATIC_LAYOUT' });
        if (Object.hasOwn(update, 'present') && update.present !== actor?.present) updates.push({ op: 'setCharacter', characterKey, present: update.present, evidence: update.evidence });
        if (Object.hasOwn(update, 'outfitId')) skip('outfit');
        if (update.expressionId) {
            if (Object.hasOwn(update, 'outfitId') && update.outfitId !== current) skip('expression');
            else expressions.push({ index, characterKey, assetId: update.expressionId });
        }
    }
    return { layout: { schemaVersion: proposal.schemaVersion, updates }, expressions, ignored, suggestions };
}
