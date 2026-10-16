import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, validateDatabaseSchema } from './database-schema.mjs';
import { randomUUID } from 'node:crypto';
import { demand, exact, label, validId, validateScene, emptyScene } from './schema.mjs';
import { decodePNG, digest } from './png.mjs';
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
        demand(version === 0 || version === 1, 'UNSUPPORTED_SCHEMA', 503);
        if (version === 0) transaction(() => {
            demand(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get().n === 0, 'UNSUPPORTED_SCHEMA', 503);
            db.exec(SCHEMA_SQL.join(';') + '; PRAGMA user_version=1;');
        });
        validateDatabaseSchema(db);
        demand(db.prepare('PRAGMA quick_check').get().quick_check === 'ok', 'CORRUPT_STORE', 503);
    } catch (error) { db.close(); throw error; }
    function load(owner, id) {
        demand(typeof owner === 'string' && owner.length > 0, 'UNAUTHORIZED', 401);
        demand(validId(id), 'NOT_FOUND', 404);
        const row = db.prepare('SELECT * FROM projects WHERE owner=? AND id=?').get(owner,id);
        demand(row, 'NOT_FOUND', 404);
        demand(Number.isSafeInteger(row.revision) && row.revision >= 0 && label(row.name), 'CORRUPT_STORE', 503);
        return { schemaVersion: 1, projectId: row.id, name: row.name, revision: row.revision, scene: validateScene(JSON.parse(row.scene)) };
    }
    function asset(owner, project, id) {
        load(owner,project); demand(validId(id), 'NOT_FOUND', 404);
        const row = db.prepare('SELECT * FROM assets WHERE project=? AND id=?').get(project,id);
        demand(row, 'NOT_FOUND', 404);
        demand(digest(row.bytes) === row.sha256, 'CORRUPT_ASSET', 503);
        return row;
    }
    return {
        close: () => db.close(), load,
        list(owner) { demand(typeof owner === 'string' && owner.length > 0, 'UNAUTHORIZED', 401); return db.prepare('SELECT id AS projectId,name,revision FROM projects WHERE owner=? ORDER BY name,id').all(owner); },
        create(owner, body) {
            demand(typeof owner === 'string' && owner.length > 0, 'UNAUTHORIZED', 401);
            demand(exact(body,['name']) && label(body.name));
            return transaction(() => {
                // ponytail: bounded prototype store; quotas need product review before distribution.
                demand(db.prepare('SELECT count(*) AS n FROM projects WHERE owner=?').get(owner).n < 100, 'PROJECT_LIMIT', 413);
                const id = randomUUID();
                db.prepare('INSERT INTO projects VALUES (?,?,?,0,?)').run(id,owner,body.name,JSON.stringify(emptyScene()));
                return load(owner,id);
            });
        },
        save(owner,id,body) {
            demand(exact(body,['schemaVersion','expectedRevision','name','scene']) && body.schemaVersion === 1 && label(body.name)
                && Number.isSafeInteger(body.expectedRevision) && body.expectedRevision >= 0 && body.expectedRevision < Number.MAX_SAFE_INTEGER);
            validateScene(body.scene);
            return transaction(() => {
                const prior = load(owner,id);
                demand(prior.revision === body.expectedRevision, 'REVISION_CONFLICT', 409);
                const refs = [body.scene.backgroundAssetId, ...body.scene.actors.map(a => a.spriteAssetId)].filter(Boolean);
                for (const ref of refs) asset(owner,id,ref);
                const result = db.prepare('UPDATE projects SET name=?,scene=?,revision=revision+1 WHERE id=? AND owner=? AND revision=?')
                    .run(body.name,JSON.stringify(body.scene),id,owner,body.expectedRevision);
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
                db.prepare('INSERT INTO projects VALUES (?,?,?,0,?)').run(id,owner,bundle.name,JSON.stringify(emptyScene()));
                for(const a of bundle.assets) db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?)').run(remap.get(a.assetId),id,a.sha256,a.width,a.height,Buffer.from(a.bytes));
                db.prepare('UPDATE projects SET scene=? WHERE id=? AND owner=?').run(JSON.stringify(scene),id,owner);
                return load(owner,id);
            });
        },
        importAsset(owner,id,bytes) {
            load(owner,id);
            const metadata = decodePNG(bytes);
            return transaction(() => {
                demand(db.prepare('SELECT coalesce(sum(length(bytes)),0) AS n FROM assets JOIN projects ON assets.project=projects.id WHERE projects.owner=?').get(owner).n + bytes.length <= 100*1024*1024, 'ASSET_QUOTA', 413);
                demand(db.prepare('SELECT count(*) AS n FROM assets WHERE project=?').get(id).n < 100, 'ASSET_LIMIT', 413);
                const assetId = randomUUID();
                db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?)').run(assetId,id,metadata.sha256,metadata.width,metadata.height,bytes);
                return { assetId, ...metadata };
            });
        }, asset,
    };
}
