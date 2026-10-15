export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function demand(ok, code = 'INVALID_STATE', status = 400) {
    if (!ok) throw Object.assign(new Error(code), { code, status });
}
export const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === fields.length && fields.every(k => Object.hasOwn(value, k));
export const validId = id => typeof id === 'string' && UUID.test(id);
export const label = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 80 && !/[\x00-\x1f]/.test(v);
export const emptyScene = () => ({ backgroundAssetId: null, backgroundLocked: false, actors: [] });
export function validateScene(scene) {
    demand(exact(scene, ['backgroundAssetId', 'backgroundLocked', 'actors']));
    demand((scene.backgroundAssetId === null || validId(scene.backgroundAssetId)) && typeof scene.backgroundLocked === 'boolean');
    demand(Array.isArray(scene.actors) && scene.actors.length <= 20);
    const ids = new Set(), slots = new Set();
    for (const a of scene.actors) {
        demand(exact(a, ['actorId', 'name', 'spriteAssetId', 'slot', 'present', 'locks']));
        demand(validId(a.actorId) && !ids.has(a.actorId) && label(a.name)); ids.add(a.actorId);
        demand(a.spriteAssetId === null || validId(a.spriteAssetId));
        demand([null, 'left', 'center', 'right'].includes(a.slot) && typeof a.present === 'boolean');
        demand(a.slot === null || !slots.has(a.slot)); if (a.slot) slots.add(a.slot);
        demand(exact(a.locks, ['presence', 'slot', 'outfit']) && Object.values(a.locks).every(v => typeof v === 'boolean'));
    }
    return scene;
}
