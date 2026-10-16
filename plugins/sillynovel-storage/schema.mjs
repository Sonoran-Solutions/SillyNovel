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

export const CLEANUP_WARNING='Only saved project references are checked. Other tabs or clients may have unsaved drafts that will lose access to removed artwork. Removal cannot be undone here; keep verified database backups.';
const hash256=value=>typeof value==='string' && /^[0-9a-f]{64}$/.test(value);
export function validateCleanupRequest(body) {
    demand(exact(body,['expectedRevision','inventoryRevision','assetIds']) && Number.isSafeInteger(body.expectedRevision) && body.expectedRevision>=0
        && hash256(body.inventoryRevision) && Array.isArray(body.assetIds) && body.assetIds.length>0 && body.assetIds.length<=100
        && body.assetIds.every(validId) && new Set(body.assetIds).size===body.assetIds.length);
    return body;
}
export function validateCleanupPreview(value,id) {
    demand(exact(value,['projectId','revision','inventoryRevision','candidates','reclaimableBytes','warning']) && value.projectId===id && validId(id)
        && Number.isSafeInteger(value.revision) && value.revision>=0 && hash256(value.inventoryRevision) && value.warning===CLEANUP_WARNING
        && Array.isArray(value.candidates) && value.candidates.length<=100,'INVALID_CLEANUP_PREVIEW');
    let total=0;const ids=new Set();
    for(const a of value.candidates) {
        demand(exact(a,['assetId','sha256','width','height','byteCount']) && validId(a.assetId) && !ids.has(a.assetId) && hash256(a.sha256)
            && Number.isSafeInteger(a.width) && a.width>0 && a.width<=4096 && Number.isSafeInteger(a.height) && a.height>0 && a.height<=4096
            && a.width*a.height<=16000000 && Number.isSafeInteger(a.byteCount) && a.byteCount>0 && a.byteCount<=5*1024*1024,'INVALID_CLEANUP_PREVIEW');
        ids.add(a.assetId);total+=a.byteCount;
    }
    demand(total===value.reclaimableBytes && total<=100*1024*1024,'INVALID_CLEANUP_PREVIEW');return value;
}
