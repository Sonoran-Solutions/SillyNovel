import { demand, validId, label, validateScene, validateCatalog, selectedCatalog } from './schema.mjs';
export const SCHEMA_VERSION = 3;
export const V1_SCHEMA_SQL = [
    'CREATE TABLE projects (id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision >= 0), scene TEXT NOT NULL)',
    'CREATE INDEX projects_owner ON projects(owner)',
    'CREATE TABLE assets (id TEXT PRIMARY KEY, project TEXT NOT NULL REFERENCES projects(id), sha256 TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, bytes BLOB NOT NULL)',
    'CREATE INDEX assets_project ON assets(project)',
];
export const V2_SCHEMA_SQL = V1_SCHEMA_SQL.map(sql=>sql.startsWith('CREATE TABLE projects')?sql.slice(0,-1)+", catalog TEXT NOT NULL DEFAULT '[]')":sql);
export const IMAGE_SCHEMA_SQL = [
    'CREATE TABLE image_sessions (id TEXT PRIMARY KEY, owner TEXT NOT NULL, project TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, tab TEXT NOT NULL, workflow_sha256 TEXT NOT NULL, allowance INTEGER NOT NULL CHECK(allowance=5), used INTEGER NOT NULL CHECK(used>=0 AND used<=allowance), started_at INTEGER NOT NULL, heartbeat_at INTEGER NOT NULL, ended_at INTEGER)',
    'CREATE INDEX image_sessions_owner_project ON image_sessions(owner, project)',
    'CREATE UNIQUE INDEX image_sessions_open ON image_sessions(owner, project) WHERE ended_at IS NULL',
    'CREATE TABLE image_jobs (id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES image_sessions(id) ON DELETE CASCADE, owner TEXT NOT NULL, project TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, payload_sha256 TEXT NOT NULL, workflow_sha256 TEXT NOT NULL, review TEXT NOT NULL, settings TEXT NOT NULL, seed_policy TEXT NOT NULL, state TEXT NOT NULL, submitted_at INTEGER NOT NULL, deadline_at INTEGER NOT NULL, settled_at INTEGER, host_path TEXT, result_sha256 TEXT, asset TEXT, host_deleted_at INTEGER)',
    'CREATE INDEX image_jobs_owner_project ON image_jobs(owner, project)',
];
export const SCHEMA_SQL = [...V2_SCHEMA_SQL, ...IMAGE_SCHEMA_SQL];
// The caller owns the transaction, including the version marker and validation.
export function upgradeV2(db) {
    validateDatabaseSchema(db,[2]);
    db.exec(IMAGE_SCHEMA_SQL.join(';') + '; PRAGMA user_version=3;');
    validateDatabaseSchema(db);
}
export function validateDatabaseSchema(db, versions=[SCHEMA_VERSION]) {
    const version=db.prepare('PRAGMA user_version').get().user_version;
    demand(versions.includes(version), 'UNSUPPORTED_SCHEMA', 503);
    // Each version has exactly its tables, constraints and indexes; no triggers/views or partial schemas.
    const normalize = sql => sql.replace(/\s+/g, '').toLowerCase();
    demand(db.prepare('SELECT count(*) AS n, coalesce(max(length(sql)),0) AS size FROM sqlite_master').get().n === (version===3?13:6) && db.prepare('SELECT coalesce(max(length(sql)),0) AS size FROM sqlite_master').get().size < 4096, 'UNSUPPORTED_SCHEMA', 503);
    const actual = db.prepare('SELECT sql FROM sqlite_master WHERE sql IS NOT NULL').all().map(r => normalize(r.sql)).sort();
    demand(JSON.stringify(actual) === JSON.stringify((version===1?V1_SCHEMA_SQL:version===2?V2_SCHEMA_SQL:SCHEMA_SQL).map(normalize).sort()), 'UNSUPPORTED_SCHEMA', 503);
    return version;
}

// Only the explicit recovery migration calls this, on its private staged copy.
// The preserved v1 backup and original store are never modified.
export function upgradeV1(db) {
    validateDatabaseSchema(db,[1]);
    db.exec("ALTER TABLE projects ADD COLUMN catalog TEXT NOT NULL DEFAULT '[]'");
    for(const row of db.prepare('SELECT id,owner,name,revision,scene FROM projects').iterate()) {
        demand(validId(row.id) && typeof row.owner==='string' && row.owner.length>0 && label(row.name) && Number.isSafeInteger(row.revision) && row.revision>=0,'CORRUPT_STORE',503);
        const scene=validateScene(JSON.parse(row.scene)),catalog=validateCatalog(selectedCatalog(scene),scene);
        for(const a of catalog)demand(db.prepare('SELECT 1 FROM assets WHERE project=? AND id=?').get(row.id,a.assetId),'CORRUPT_ASSET',503);
        db.prepare('UPDATE projects SET catalog=? WHERE id=?').run(JSON.stringify(catalog),row.id);
    }
    db.exec('PRAGMA user_version=2');
    validateDatabaseSchema(db,[2]);
}
