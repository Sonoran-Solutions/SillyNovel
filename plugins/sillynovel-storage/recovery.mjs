import * as sqlite from 'node:sqlite';
import { constants, openSync, closeSync, readSync, fstatSync, lstatSync, readdirSync, mkdtempSync, mkdirSync, chmodSync, writeFileSync, linkSync, unlinkSync, rmdirSync, fsyncSync, copyFileSync } from 'node:fs';
import { resolve, dirname, basename, join, parse, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { demand, exact, validId, label, validateScene } from './schema.mjs';
import { validateDatabaseSchema } from './database-schema.mjs';
import { decodePNG, MAX_BYTES, digest } from './png.mjs';

export const DATABASE_NAME = '.sillynovel-projects.sqlite';
export const LIMITS = Object.freeze({ databaseBytes: 512 * 1024 * 1024, projects: 1000, assets: 10000, pixels: 256 * 1024 * 1024, milliseconds: 120000 });
const SNAPSHOT = 'snapshot.sqlite', MANIFEST = 'manifest.json';
const fail = code => demand(false, code);
const exists = path => lstatSync(path, { throwIfNoEntry: false });
const stamp = s => `${s.dev}:${s.ino}`;

// Operator-controlled local POSIX paths only. No symlink component, hardlink alias,
// publicly served path, or group/other-writable immediate parent is accepted.
function safePath(path, missing = false) {
    demand(typeof path === 'string' && isAbsolute(path) && !path.includes('\0') && !path.split('/').includes('..'), 'UNSAFE_PATH');
    const full = resolve(path);
    demand(!full.split('/').some(p => /^(public|extensions)$/i.test(p)), 'UNSAFE_PATH');
    let current = parse(full).root;
    for (const part of full.slice(current.length).split('/').filter(Boolean)) {
        current = join(current, part);
        const stat = exists(current);
        if (!stat && missing && current === full) return full;
        demand(stat && !stat.isSymbolicLink(), 'UNSAFE_PATH');
        if (current !== full) demand(stat.isDirectory(), 'UNSAFE_PATH');
    }
    return full;
}
function privateParent(path) {
    const parent = safePath(dirname(path)), stat = lstatSync(parent);
    demand(stat.isDirectory() && stat.uid === process.getuid?.() && !(stat.mode & 0o022), 'UNSAFE_PARENT');
    return parent;
}
function file(path, max) {
    safePath(path);
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
        const stat = fstatSync(fd);
        demand(stat.isFile() && stat.nlink === 1 && stat.size <= max, 'UNSAFE_FILE');
        const hash = createHash('sha256'), buffer = Buffer.alloc(65536); let n, total=0;
        while ((n = readSync(fd, buffer, 0, buffer.length, null))) { total+=n; demand(total<=max,'RECOVERY_LIMIT'); hash.update(buffer.subarray(0, n)); }
        demand(total === fstatSync(fd).size,'UNSAFE_FILE');
        demand(stamp(lstatSync(path)) === stamp(stat), 'UNSAFE_FILE');
        return { byteLength: stat.size, sha256: hash.digest('hex') };
    } finally { closeSync(fd); }
}
function smallJSON(path, max, code) {
    try {
        const info = file(path, max), fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        try { const b = Buffer.alloc(info.byteLength); demand(readSync(fd,b,0,b.length,0) === b.length, code); return JSON.parse(b.toString('utf8')); }
        finally { closeSync(fd); }
    } catch { fail(code); }
}
function sync(path) { const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW); try { fsyncSync(fd); } finally { closeSync(fd); } }
function ownerPair(owner) {
    try {
        demand(typeof owner === 'string' && owner.length <= 1024, 'INVALID_PROJECT_STATE');
        const pair = JSON.parse(owner);
        demand(Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && /^[a-z0-9_-]{1,100}$/.test(pair[0]) && Number.isSafeInteger(pair[1]) && pair[1] >= 0 && JSON.stringify(pair) === owner, 'INVALID_PROJECT_STATE');
        return pair;
    } catch { fail('INVALID_PROJECT_STATE'); }
}
function accounts(owners, dataRoot) {
    if (!dataRoot) return 'ACCOUNT_BINDING_UNVERIFIED';
    safePath(dataRoot);
    for (const owner of owners) {
        const [handle, created] = ownerPair(owner), key = 'user:' + handle;
        const record = smallJSON(join(dataRoot, '_storage', digest(Buffer.from(key))), 65536, 'ACCOUNT_BINDING_UNVERIFIED');
        demand(record.key === key && record.value?.handle === handle && record.value?.created === created, 'ACCOUNT_BINDING_UNVERIFIED');
    }
    return 'VERIFIED_SAME_ACCOUNT_INCARNATION';
}
export function validateDatabase(path) {
    const started = Date.now(); const budget = () => demand(Date.now() - started <= LIMITS.milliseconds, 'RECOVERY_LIMIT');
    const info = file(path, LIMITS.databaseBytes);
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW), header = Buffer.alloc(20);
    try { readSync(fd, header, 0, header.length, 0); } finally { closeSync(fd); }
    demand(header.subarray(0,16).equals(Buffer.from('SQLite format 3\0')), 'CORRUPT_DATABASE');
    // Published snapshots are standalone rollback-format files, never raw WAL copies.
    demand(header[18] === 1 && header[19] === 1, 'CORRUPT_DATABASE');
    for (const suffix of ['-wal', '-shm', '-journal']) demand(!exists(path + suffix), 'UNSAFE_FILE');
    let db;
    try {
        db = new sqlite.DatabaseSync(path, { readOnly: true, allowExtension: false });
        db.exec('PRAGMA query_only=ON; PRAGMA trusted_schema=OFF; PRAGMA busy_timeout=3000; PRAGMA cache_size=-2048;');
        validateDatabaseSchema(db);
        demand(db.prepare('PRAGMA integrity_check').all().every(r => r.integrity_check === 'ok'), 'CORRUPT_DATABASE');
        const projects = db.prepare('SELECT count(*) AS n FROM projects').get().n, assets = db.prepare('SELECT count(*) AS n FROM assets').get().n;
        demand(projects <= LIMITS.projects && assets <= LIMITS.assets, 'RECOVERY_LIMIT');
        demand(!db.prepare('PRAGMA foreign_key_check').get(), 'INVALID_PROJECT_STATE');
        demand(!db.prepare('SELECT 1 FROM projects WHERE length(CAST(scene AS BLOB))>32768 OR length(CAST(owner AS BLOB))>1024 OR length(CAST(name AS BLOB))>320 OR length(CAST(id AS BLOB))>36 LIMIT 1').get(), 'INVALID_PROJECT_STATE');
        demand(!db.prepare('SELECT 1 FROM assets WHERE length(bytes)>? OR length(CAST(id AS BLOB))>36 OR length(CAST(project AS BLOB))>36 OR length(CAST(sha256 AS BLOB))>64 LIMIT 1').get(MAX_BYTES), 'INVALID_ASSET');
        const owners = new Set();
        for (const p of db.prepare('SELECT * FROM projects').iterate()) {
            budget();
            try {
                demand(validId(p.id) && label(p.name) && Number.isSafeInteger(p.revision) && p.revision >= 0, 'INVALID_PROJECT_STATE');
                ownerPair(p.owner); owners.add(p.owner);
                const scene = validateScene(JSON.parse(p.scene));
                for (const id of [scene.backgroundAssetId, ...scene.actors.map(a => a.spriteAssetId)].filter(Boolean))
                    demand(db.prepare('SELECT 1 FROM assets WHERE id=? AND project=?').get(id,p.id), 'INVALID_PROJECT_STATE');
            } catch { fail('INVALID_PROJECT_STATE'); }
        }
        let pixels = 0;
        for (const a of db.prepare('SELECT * FROM assets').iterate()) {
            budget();
            try {
                demand(validId(a.id) && validId(a.project) && a.bytes instanceof Uint8Array && Number.isSafeInteger(a.width) && Number.isSafeInteger(a.height) && a.width>0 && a.height>0, 'INVALID_ASSET');
                pixels += a.width * a.height; demand(pixels <= LIMITS.pixels, 'RECOVERY_LIMIT');
                const decoded = decodePNG(Buffer.from(a.bytes));
                demand(decoded.sha256 === a.sha256 && decoded.width === a.width && decoded.height === a.height, 'INVALID_ASSET');
            } catch (e) { if(e.code === 'RECOVERY_LIMIT') throw e; fail('INVALID_ASSET'); }
        }
        budget();
        const final=file(path,LIMITS.databaseBytes);
        demand(final.sha256 === info.sha256 && final.byteLength === info.byteLength,'CHECKSUM_MISMATCH');
        return { ...info, schemaVersion: 1, integrity: 'ok', projects, assets, owners: [...owners], sqlite: db.prepare('SELECT sqlite_version() AS v').get().v, journalMode: 'delete' };
    } catch (e) { if(e.code && !e.code.startsWith('ERR_')) throw e; fail('CORRUPT_DATABASE'); }
    finally { db?.close(); }
}
function manifestFor(result) {
    return { format: 'sillynovel-database-backup', version: 1, createdAt: new Date().toISOString(), schemaVersion: result.schemaVersion,
        snapshot: { byteLength: result.byteLength, sha256: result.sha256 }, integrity: 'ok', projects: result.projects, assets: result.assets };
}
export function inspectBackup(directory, dataRoot) {
    safePath(directory);
    const directoryStat=lstatSync(directory);
    demand(directoryStat.isDirectory(), 'INVALID_MANIFEST');
    demand(directoryStat.uid === process.getuid?.() && !(directoryStat.mode & 0o077), 'UNSAFE_PATH');
    demand(JSON.stringify(readdirSync(directory).sort()) === JSON.stringify([MANIFEST,SNAPSHOT].sort()), 'INVALID_MANIFEST');
    const m = smallJSON(join(directory,MANIFEST),4096,'INVALID_MANIFEST');
    demand(exact(m,['format','version','createdAt','schemaVersion','snapshot','integrity','projects','assets']) && m.format === 'sillynovel-database-backup' && m.version === 1 && typeof m.createdAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(m.createdAt) && Number.isFinite(Date.parse(m.createdAt)) && new Date(m.createdAt).toISOString() === m.createdAt && m.integrity === 'ok' && Number.isSafeInteger(m.schemaVersion), 'INVALID_MANIFEST');
    demand(exact(m.snapshot,['byteLength','sha256']) && Number.isSafeInteger(m.snapshot.byteLength) && m.snapshot.byteLength>0 && m.snapshot.byteLength<=LIMITS.databaseBytes && typeof m.snapshot.sha256==='string' && /^[0-9a-f]{64}$/.test(m.snapshot.sha256) && Number.isSafeInteger(m.projects) && m.projects>=0 && m.projects<=LIMITS.projects && Number.isSafeInteger(m.assets) && m.assets>=0 && m.assets<=LIMITS.assets, 'INVALID_MANIFEST');
    const path = join(directory,SNAPSHOT), bytes = file(path,LIMITS.databaseBytes);
    demand(bytes.byteLength === m.snapshot.byteLength && bytes.sha256 === m.snapshot.sha256, 'CHECKSUM_MISMATCH');
    demand(m.schemaVersion === 1, 'UNSUPPORTED_SCHEMA');
    const result = validateDatabase(path);
    demand(result.projects === m.projects && result.assets === m.assets, 'INVALID_MANIFEST');
    const accountBinding = accounts(result.owners,dataRoot);
    const {owners,...publicResult}=result;
    return { code: 'VALID_BACKUP', ...publicResult, accountBinding };
}
// Only unlink known files whose inode is still the one created in our private stage.
// Interrupted stages are deliberately retained: operators must inspect them offline.
function stageAt(parent) {
    const path = mkdtempSync(join(parent,'.sn-recovery-')); chmodSync(path,0o700);
    // Holding descriptors prevents inode reuse from turning a replacement into
    // apparently owned output after unlink (including rapid symlink substitution).
    const directoryFD=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
    const identity = stamp(fstatSync(directoryFD)), owned = new Map();
    return { path,
        own(name) {
            const fd=openSync(join(path,name),constants.O_RDONLY|constants.O_NOFOLLOW);
            owned.set(name,{fd,id:stamp(fstatSync(fd))});
        },
        check(name) { demand(stamp(lstatSync(join(path,name))) === owned.get(name)?.id,'UNSAFE_FILE'); },
        cleanup() {
            try {
                if(stamp(exists(path)||{}) !== identity) return;
                for(const [name,{id}] of owned) { const f=join(path,name); if(stamp(exists(f)||{})===id) unlinkSync(f); }
                if(!readdirSync(path).length) rmdirSync(path);
            } finally {for(const {fd} of owned.values())closeSync(fd);closeSync(directoryFD);}
        },
    };
}
export async function createBackup(source, destination, hooks = {}) {
    demand(typeof sqlite.backup === 'function', 'UNSUPPORTED_RUNTIME');
    safePath(source); privateParent(source); file(source,LIMITS.databaseBytes);
    for(const suffix of ['-wal','-shm','-journal']) if(exists(source+suffix)) file(source+suffix,LIMITS.databaseBytes);
    safePath(destination,true); const parent = privateParent(destination);
    demand(!exists(destination), 'DESTINATION_EXISTS');
    const stage = stageAt(parent); let db, published=false;
    try {
        writeFileSync(join(stage.path,SNAPSHOT),'',{flag:'wx',mode:0o600}); stage.own(SNAPSHOT);
        hooks.at?.('snapshot');
        db = new sqlite.DatabaseSync(source,{readOnly:true,allowExtension:false});
        db.exec('PRAGMA busy_timeout=3000;'); validateDatabaseSchema(db);
        demand(db.prepare('PRAGMA page_count').get().page_count * db.prepare('PRAGMA page_size').get().page_size <= LIMITS.databaseBytes,'RECOVERY_LIMIT');
        // SQLite owns journal/WAL coordination. No raw file copy of an active store.
        await sqlite.backup(db,join(stage.path,SNAPSHOT),{rate:64,progress:hooks.progress});
        db.close(); db=null; stage.check(SNAPSHOT); chmodSync(join(stage.path,SNAPSHOT),0o600);
        hooks.at?.('snapshot-written');
        const snapshot = new sqlite.DatabaseSync(join(stage.path,SNAPSHOT),{allowExtension:false});
        try { snapshot.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;'); } finally { snapshot.close(); }
        const result = validateDatabase(join(stage.path,SNAPSHOT));
        hooks.at?.('manifest');
        writeFileSync(join(stage.path,MANIFEST),'',{flag:'wx',mode:0o600}); stage.own(MANIFEST);
        writeFileSync(join(stage.path,MANIFEST),JSON.stringify(manifestFor(result))+'\n');
        inspectBackup(stage.path); sync(join(stage.path,SNAPSHOT)); sync(join(stage.path,MANIFEST)); sync(stage.path);
        hooks.at?.('publish');
        // mkdir is exclusive; manifest is the completion marker, published last.
        mkdirSync(destination,{mode:0o700});
        const targetFD=openSync(destination,constants.O_RDONLY|constants.O_NOFOLLOW),targetIdentity=stamp(fstatSync(targetFD));
        try {
            linkSync(join(stage.path,SNAPSHOT),join(destination,SNAPSHOT));
            linkSync(join(stage.path,MANIFEST),join(destination,MANIFEST)); published=true;
            sync(destination); sync(parent);
        } catch(e) {
            if(!published && stamp(lstatSync(destination))===targetIdentity) {
                const f=join(destination,SNAPSHOT); if(exists(f)&&stamp(lstatSync(f))===stamp(lstatSync(join(stage.path,SNAPSHOT))))unlinkSync(f);
                if(!readdirSync(destination).length)rmdirSync(destination);
            }
            throw e;
        } finally {closeSync(targetFD);}
        return {code:'VALID_BACKUP',...result,owners:undefined,accountBinding:'ACCOUNT_BINDING_UNVERIFIED'};
    } finally { db?.close(); stage.cleanup(); }
}
export function restoreBackup(directory, destination, hooks = {}) {
    demand(basename(destination) === DATABASE_NAME, 'INVALID_DESTINATION');
    safePath(destination,true); const parent=privateParent(destination);
    for(const suffix of ['', '-wal','-shm','-journal']) demand(!exists(destination+suffix),'DESTINATION_EXISTS');
    inspectBackup(directory,parent); const stage=stageAt(parent);
    try {
        hooks.at?.('staging');
        writeFileSync(join(stage.path,SNAPSHOT),'',{flag:'wx',mode:0o600}); stage.own(SNAPSHOT);
        copyFileSync(join(directory,SNAPSHOT),join(stage.path,SNAPSHOT)); chmodSync(join(stage.path,SNAPSHOT),0o600);
        hooks.at?.('validation');
        const result=validateDatabase(join(stage.path,SNAPSHOT));
        // Independently compare staged bytes against the validated package, then
        // recheck account evidence and destination immediately before publication.
        const expected=inspectBackup(directory,parent);
        demand(result.sha256===expected.sha256 && result.byteLength===expected.byteLength,'CHECKSUM_MISMATCH');
        sync(join(stage.path,SNAPSHOT)); hooks.at?.('publish');
        for(const suffix of ['', '-wal','-shm','-journal']) demand(!exists(destination+suffix),'DESTINATION_EXISTS');
        linkSync(join(stage.path,SNAPSHOT),destination); sync(parent);
        return {...expected,code:'RESTORED'};
    } finally {stage.cleanup();}
}
