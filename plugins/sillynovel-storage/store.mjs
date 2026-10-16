import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, validateDatabaseSchema } from './database-schema.mjs';
import { randomUUID } from 'node:crypto';
import { demand, exact, label, validId, validateScene, validateCatalog, emptyScene, validateCleanupRequest, CLEANUP_WARNING } from './schema.mjs';
import { decodePNG, digest, MAX_BYTES } from './png.mjs';
import { bundleJob, references, ASSET_BYTES } from './bundle.mjs';

export function openStore(filename) {
    const db = new DatabaseSync(filename, { allowExtension: false });
    const transaction = fn => {
        db.exec('BEGIN IMMEDIATE');
        try { const value = fn(); db.exec('COMMIT'); return value; }
        catch (error) { db.exec('ROLLBACK'); throw error; }
    };
    try {
        db.exec('PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;');
        const version = db.prepare('PRAGMA user_version').get().user_version;
        demand([0,1,2].includes(version), 'UNSUPPORTED_SCHEMA', 503);
        if (version === 0) transaction(() => {
            demand(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get().n === 0, 'UNSUPPORTED_SCHEMA', 503);
            db.exec(SCHEMA_SQL.join(';') + '; PRAGMA user_version=2;');
        });
        if(version===1){validateDatabaseSchema(db,[1]);demand(false,'MIGRATION_REQUIRED',503);}
        validateDatabaseSchema(db);
        demand(db.prepare('PRAGMA quick_check').get().quick_check === 'ok', 'CORRUPT_STORE', 503);
    } catch (error) { db.close(); throw error; }
    function load(owner, id) {
        demand(typeof owner === 'string' && owner.length > 0, 'UNAUTHORIZED', 401);
        demand(validId(id), 'NOT_FOUND', 404);
        const row = db.prepare('SELECT * FROM projects WHERE owner=? AND id=?').get(owner,id);
        demand(row, 'NOT_FOUND', 404);
        demand(Number.isSafeInteger(row.revision) && row.revision >= 0 && label(row.name), 'CORRUPT_STORE', 503);
        const scene=validateScene(JSON.parse(row.scene));
        return { schemaVersion: 2, projectId: row.id, name: row.name, revision: row.revision, scene, catalog:validateCatalog(JSON.parse(row.catalog),scene) };
    }
    function asset(owner, project, id) {
        load(owner,project); demand(validId(id), 'NOT_FOUND', 404);
        const row = db.prepare('SELECT * FROM assets WHERE project=? AND id=?').get(project,id);
        demand(row, 'NOT_FOUND', 404);
        demand(digest(row.bytes) === row.sha256, 'CORRUPT_ASSET', 503);
        return row;
    }
    function cleanupInventory(owner,id) {
        const project=load(owner,id), refs=new Set([...references(project.scene),...project.catalog.map(a=>a.assetId)]);
        const rows=db.prepare('SELECT id AS assetId,sha256,width,height,length(bytes) AS byteCount FROM assets WHERE project=? ORDER BY id LIMIT 101').all(id);
        demand(rows.length<=100,'CORRUPT_ASSET',503);
        let total=0;
        for(const row of rows) {
            total+=row.byteCount;
            demand(validId(row.assetId) && Number.isSafeInteger(row.byteCount) && row.byteCount>0 && row.byteCount<=MAX_BYTES && total<=100*1024*1024,'CORRUPT_ASSET',503);
            // One bounded PNG at a time; corrupt candidates refuse the entire operation.
            try {
                const decoded=decodePNG(Buffer.from(asset(owner,id,row.assetId).bytes));
                demand(decoded.sha256===row.sha256 && decoded.width===row.width && decoded.height===row.height,'CORRUPT_ASSET',503);
            } catch { demand(false,'CORRUPT_ASSET',503); }
        }
        demand([...refs].every(ref=>rows.some(row=>row.assetId===ref)),'CORRUPT_ASSET',503);
        const candidates=rows.filter(row=>!refs.has(row.assetId));
        const inventoryRevision=digest(JSON.stringify([owner,id,project.revision,project.scene,project.catalog,rows,candidates.map(row=>row.assetId)]));
        return {projectId:id,revision:project.revision,inventoryRevision,candidates,
            reclaimableBytes:candidates.reduce((sum,row)=>sum+row.byteCount,0),warning:CLEANUP_WARNING};
    }
    return {
        previewCleanup(owner,id) { return transaction(()=>cleanupInventory(owner,id)); },
        removeUnusedAssets(owner,id,body) {
            validateCleanupRequest(body);
            return transaction(()=>{
                const project=load(owner,id);
                demand(project.revision===body.expectedRevision,'REVISION_CONFLICT',409);
                const preview=cleanupInventory(owner,id), refs=new Set([...references(project.scene),...project.catalog.map(a=>a.assetId)]);
                for(const assetId of body.assetIds) {
                    demand(!refs.has(assetId),'ASSET_REFERENCED',409);
                    demand(preview.candidates.some(a=>a.assetId===assetId),'ASSET_MISSING',409);
                }
                demand(preview.inventoryRevision===body.inventoryRevision,'CLEANUP_STALE',409);
                const remove=db.prepare('DELETE FROM assets WHERE project=? AND id=?');
                for(const assetId of body.assetIds)demand(remove.run(id,assetId).changes===1,'CLEANUP_STALE',409);
                return {projectId:id,revision:project.revision,deletedIds:body.assetIds,
                    deletedCount:body.assetIds.length,reclaimedBytes:preview.candidates.filter(a=>body.assetIds.includes(a.assetId)).reduce((sum,a)=>sum+a.byteCount,0)};
            });
        },
        close: () => db.close(), load,
        list(owner) { demand(typeof owner === 'string' && owner.length > 0, 'UNAUTHORIZED', 401); return db.prepare('SELECT id AS projectId,name,revision FROM projects WHERE owner=? ORDER BY name,id').all(owner); },
        create(owner, body) {
            demand(typeof owner === 'string' && owner.length > 0, 'UNAUTHORIZED', 401);
            demand(exact(body,['name']) && label(body.name));
            return transaction(() => {
                // ponytail: bounded prototype store; quotas need product review before distribution.
                demand(db.prepare('SELECT count(*) AS n FROM projects WHERE owner=?').get(owner).n < 100, 'PROJECT_LIMIT', 413);
                const id = randomUUID();
                db.prepare('INSERT INTO projects (id,owner,name,revision,scene) VALUES (?,?,?,0,?)').run(id,owner,body.name,JSON.stringify(emptyScene()));
                return load(owner,id);
            });
        },
        save(owner,id,body) {
            const legacy=body?.schemaVersion===1;
            demand(exact(body,legacy?['schemaVersion','expectedRevision','name','scene']:['schemaVersion','expectedRevision','name','scene','catalog']) && [1,2].includes(body.schemaVersion) && label(body.name)
                && Number.isSafeInteger(body.expectedRevision) && body.expectedRevision >= 0 && body.expectedRevision < Number.MAX_SAFE_INTEGER);
            validateScene(body.scene);
            if(!legacy)validateCatalog(body.catalog,body.scene);
            return transaction(() => {
                const prior = load(owner,id);
                demand(prior.revision === body.expectedRevision, 'REVISION_CONFLICT', 409);
                // Old clients cannot erase a saved library they do not understand.
                demand(!legacy || prior.catalog.length===0,'CATALOG_CLIENT_REQUIRED',409);
                const catalog=legacy?[]:body.catalog;
                const refs = [body.scene.backgroundAssetId, ...body.scene.actors.map(a => a.spriteAssetId),...catalog.map(a=>a.assetId)].filter(Boolean);
                for (const ref of refs) {
                    demand(db.prepare('SELECT 1 FROM assets WHERE project=? AND id=?').get(id,ref),'ASSET_MISSING',409);
                    asset(owner,id,ref);
                }
                const result = db.prepare('UPDATE projects SET name=?,scene=?,catalog=?,revision=revision+1 WHERE id=? AND owner=? AND revision=?')
                    .run(body.name,JSON.stringify(body.scene),JSON.stringify(catalog),id,owner,body.expectedRevision);
                demand(result.changes === 1, 'REVISION_CONFLICT', 409);
                return load(owner,id);
            });
        },
        async exportBundle(owner,id) {
            // Snapshot all rows before yielding; concurrent clients see one commit.
            const snapshot=transaction(()=>{
                const project=load(owner,id); let total=0;
                const assets=references(project.scene).map(ref=>{
                    const size=db.prepare('SELECT length(bytes) AS n FROM assets WHERE project=? AND id=?').get(id,ref);
                    demand(size,'CORRUPT_ASSET',503);total+=size.n;
                    demand(total<=ASSET_BYTES,'BUNDLE_LIMIT',413);
                    return asset(owner,id,ref);
                });
                return {name:project.name,scene:project.scene,assets};
            });
            return Buffer.from(await bundleJob('encode',snapshot));
        },
        async importBundle(owner,bytes) {
            demand(typeof owner === 'string' && owner.length > 0, 'UNAUTHORIZED', 401);
            const bundle=await bundleJob('decode',bytes);
            return transaction(()=>{
                demand(db.prepare('SELECT count(*) AS n FROM projects WHERE owner=?').get(owner).n < 100,'PROJECT_LIMIT',413);
                const total=bundle.assets.reduce((sum,a)=>sum+a.bytes.length,0);
                demand(db.prepare('SELECT coalesce(sum(length(bytes)),0) AS n FROM assets JOIN projects ON assets.project=projects.id WHERE projects.owner=?').get(owner).n+total<=100*1024*1024,'ASSET_QUOTA',413);
                const id=randomUUID(), remap=new Map(bundle.assets.map(a=>[a.assetId,randomUUID()]));
                const scene={...bundle.scene,backgroundAssetId:remap.get(bundle.scene.backgroundAssetId)??null,
                    actors:bundle.scene.actors.map(a=>({...a,actorId:randomUUID(),spriteAssetId:remap.get(a.spriteAssetId)??null}))};
                validateScene(scene);
                db.prepare('INSERT INTO projects (id,owner,name,revision,scene) VALUES (?,?,?,0,?)').run(id,owner,bundle.name,JSON.stringify(emptyScene()));
                for(const a of bundle.assets) db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?)').run(remap.get(a.assetId),id,a.sha256,a.width,a.height,Buffer.from(a.bytes));
                db.prepare('UPDATE projects SET scene=? WHERE id=? AND owner=?').run(JSON.stringify(scene),id,owner);
                return load(owner,id);
            });
        },
        importAsset(owner,id,bytes) {
            load(owner,id);
            const metadata = decodePNG(bytes);
            return transaction(() => {
                const existing=db.prepare('SELECT id FROM assets WHERE project=? AND sha256=? ORDER BY id').all(id,metadata.sha256);
                for(const row of existing) {
                    const prior=asset(owner,id,row.id);
                    if(Buffer.from(prior.bytes).equals(bytes))return {assetId:row.id,...metadata};
                }
                demand(db.prepare('SELECT coalesce(sum(length(bytes)),0) AS n FROM assets JOIN projects ON assets.project=projects.id WHERE projects.owner=?').get(owner).n + bytes.length <= 100*1024*1024, 'ASSET_QUOTA', 413);
                demand(db.prepare('SELECT count(*) AS n FROM assets WHERE project=?').get(id).n < 100, 'ASSET_LIMIT', 413);
                const assetId = randomUUID();
                db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?)').run(assetId,id,metadata.sha256,metadata.width,metadata.height,bytes);
                return { assetId, ...metadata };
            });
        }, asset,
    };
}
