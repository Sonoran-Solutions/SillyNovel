import { demand } from './schema.mjs';
export const SCHEMA_VERSION = 1;
export const SCHEMA_SQL = [
    'CREATE TABLE projects (id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision >= 0), scene TEXT NOT NULL)',
    'CREATE INDEX projects_owner ON projects(owner)',
    'CREATE TABLE assets (id TEXT PRIMARY KEY, project TEXT NOT NULL REFERENCES projects(id), sha256 TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, bytes BLOB NOT NULL)',
    'CREATE INDEX assets_project ON assets(project)',
];
export function validateDatabaseSchema(db) {
    demand(db.prepare('PRAGMA user_version').get().user_version === SCHEMA_VERSION, 'UNSUPPORTED_SCHEMA', 503);
    // v1 has exactly these tables, constraints and indexes; no triggers/views or partial schemas.
    const normalize = sql => sql.replace(/\s+/g, '').toLowerCase();
    demand(db.prepare('SELECT count(*) AS n, coalesce(max(length(sql)),0) AS size FROM sqlite_master').get().n === 6 && db.prepare('SELECT coalesce(max(length(sql)),0) AS size FROM sqlite_master').get().size < 4096, 'UNSUPPORTED_SCHEMA', 503);
    const actual = db.prepare('SELECT sql FROM sqlite_master WHERE sql IS NOT NULL').all().map(r => normalize(r.sql)).sort();
    demand(JSON.stringify(actual) === JSON.stringify(SCHEMA_SQL.map(normalize).sort()), 'UNSUPPORTED_SCHEMA', 503);
}
