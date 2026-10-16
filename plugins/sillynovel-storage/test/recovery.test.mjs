import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, symlinkSync, linkSync, chmodSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../store.mjs';
import { createBackup, inspectBackup, restoreBackup, DATABASE_NAME } from '../recovery.mjs';
const owner = JSON.stringify(['alice',123]), other=JSON.stringify(['bob',456]);
const png=readFileSync(new URL('../../../tests/fixtures/m12-stage/forest.png',import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(populate=true) {
 const root=mkdtempSync(join(tmpdir(),'sn-recovery-test-')), source=join(root,'source.sqlite'), backup=join(root,'backup'), target=join(root,'target');mkdirSync(target,{mode:0o700});
 const store=openStore(source);let saved;
 if(populate){const p=store.create(owner,{name:'Duplicate'}),q=store.create(other,{name:'Duplicate'});
 const images=[store.importAsset(owner,p.projectId,png),store.importAsset(owner,p.projectId,png)];store.importAsset(other,q.projectId,png);
 saved=store.save(owner,p.projectId,{schemaVersion:1,expectedRevision:0,name:p.name,scene:{backgroundAssetId:images[0].assetId,backgroundLocked:true,actors:[{actorId:randomUUID(),name:'Public actor',spriteAssetId:images[0].assetId,slot:'left',present:true,locks:{presence:true,slot:true,outfit:true}}]}});}
 store.close();
 mkdirSync(join(target,'_storage'));
 for(const o of [owner,other]){const [handle,created]=JSON.parse(o),key='user:'+handle;writeFileSync(join(target,'_storage',hash(Buffer.from(key))),JSON.stringify({key,value:{handle,created,enabled:true,password:'synthetic-secret'}}));}
 return {root,source,backup,target,saved,dest:join(target,DATABASE_NAME),cleanup(){rmSync(root,{recursive:true,force:true});}};
}
function inventory(path){const db=new DatabaseSync(path,{readOnly:true});try{return {projects:db.prepare('SELECT * FROM projects ORDER BY id').all(),assets:db.prepare('SELECT * FROM assets ORDER BY id').all()};}finally{db.close();}}
function packageInventory(path){return Object.fromEntries(readdirSync(path).map(n=>[n,hash(readFileSync(join(path,n)))]));}
function resign(path){const p=join(path,'snapshot.sqlite'),m=JSON.parse(readFileSync(join(path,'manifest.json')));const b=readFileSync(p);m.snapshot={byteLength:b.length,sha256:hash(b)};writeFileSync(join(path,'manifest.json'),JSON.stringify(m));}
function mutate(path,sql){const db=new DatabaseSync(join(path,'snapshot.sqlite'));try{db.exec('PRAGMA foreign_keys=OFF');db.exec(sql);}finally{db.close();}resign(path);}
const rejects=(fn,code)=>assert.throws(fn,e=>e.code===code,e=>e?.stack);

test('backup/inspect/restore preserve every row, account, revision, lock, actor and PNG through restart',async()=>{
 const f=fixture();try{
 const before=inventory(f.source),sourceBytes=readFileSync(f.source);await createBackup(f.source,f.backup);
 assert.deepEqual(readFileSync(f.source),sourceBytes);assert.deepEqual(inventory(join(f.backup,'snapshot.sqlite')),before);
 assert.equal(inspectBackup(f.backup).accountBinding,'ACCOUNT_BINDING_UNVERIFIED');
 assert.equal(inspectBackup(f.backup,f.target).accountBinding,'VERIFIED_SAME_ACCOUNT_INCARNATION');
 const backupBefore=packageInventory(f.backup);assert.equal(restoreBackup(f.backup,f.dest).code,'RESTORED');
 assert.deepEqual(inventory(f.dest),before);for(let i=0;i<2;i++){const s=openStore(f.dest);assert.deepEqual(s.load(owner,f.saved.projectId),f.saved);rejects(()=>s.load(other,f.saved.projectId),'NOT_FOUND');s.close();}
 assert.deepEqual(packageInventory(f.backup),backupBefore);
 for(const path of [f.backup,join(f.backup,'snapshot.sqlite'),join(f.backup,'manifest.json'),f.dest])assert.equal(statSync(path).mode&0o777,path===f.backup?0o700:0o600);
 const dbBytes=readFileSync(f.dest);rejects(()=>restoreBackup(f.backup,f.dest),'DESTINATION_EXISTS');assert.deepEqual(readFileSync(f.dest),dbBytes);
 assert.ok(!readFileSync(join(f.backup,'manifest.json'),'utf8').includes('alice'));
 }finally{f.cleanup();}
});
test('empty schema-v1 database roundtrip',async()=>{const f=fixture(false);try{await createBackup(f.source,f.backup);assert.equal(inspectBackup(f.backup).projects,0);restoreBackup(f.backup,f.dest);assert.deepEqual(inventory(f.dest),inventory(f.source));}finally{f.cleanup();}});

test('invalid packages refuse without changing backup, account evidence or an existing destination',async t=>{
 const cases=[
 ['missing manifest',p=>rmSync(join(p,'manifest.json')),'INVALID_MANIFEST'],
 ['invalid JSON',p=>writeFileSync(join(p,'manifest.json'),'{'),'INVALID_MANIFEST'],
 ['future format',p=>{const m=JSON.parse(readFileSync(join(p,'manifest.json')));m.version=2;writeFileSync(join(p,'manifest.json'),JSON.stringify(m));},'INVALID_MANIFEST'],
 ['wrong count',p=>{const m=JSON.parse(readFileSync(join(p,'manifest.json')));m.projects++;writeFileSync(join(p,'manifest.json'),JSON.stringify(m));},'INVALID_MANIFEST'],
 ['checksum',p=>writeFileSync(join(p,'snapshot.sqlite'),Buffer.from('altered')),'CHECKSUM_MISMATCH'],
 ['truncated SQLite',p=>{writeFileSync(join(p,'snapshot.sqlite'),readFileSync(join(p,'snapshot.sqlite')).subarray(0,100));resign(p);},'CORRUPT_DATABASE'],
 ['corrupt btree',p=>{const b=readFileSync(join(p,'snapshot.sqlite'));b[100]=0;writeFileSync(join(p,'snapshot.sqlite'),b);resign(p);},'CORRUPT_DATABASE'],
 ['future schema',p=>mutate(p,'PRAGMA user_version=2'),'UNSUPPORTED_SCHEMA'],
 ['missing projects',p=>mutate(p,'DROP TABLE projects'),'UNSUPPORTED_SCHEMA'],
 ['missing assets',p=>mutate(p,'DROP TABLE assets'),'UNSUPPORTED_SCHEMA'],
 ['missing index',p=>mutate(p,'DROP INDEX assets_project'),'UNSUPPORTED_SCHEMA'],
 ['extra trigger',p=>mutate(p,'CREATE TRIGGER extra BEFORE UPDATE ON projects BEGIN SELECT 1; END'),'UNSUPPORTED_SCHEMA'],
 ['bad foreign key',p=>mutate(p,"PRAGMA foreign_keys=OFF; UPDATE assets SET project='00000000-0000-4000-8000-000000000000'"),'INVALID_PROJECT_STATE'],
 ['bad scene',p=>mutate(p,"UPDATE projects SET scene='{}'"),'INVALID_PROJECT_STATE'],
 ['bad revision',p=>mutate(p,"UPDATE projects SET revision=1.5"),'INVALID_PROJECT_STATE'],
 ['bad owner',p=>mutate(p,"UPDATE projects SET owner='alice'"),'INVALID_PROJECT_STATE'],
 ['wrong digest',p=>mutate(p,"UPDATE assets SET sha256='wrong'"),'INVALID_ASSET'],
 ['wrong dimensions',p=>mutate(p,'UPDATE assets SET width=1'),'INVALID_ASSET'],
 ['invalid PNG',p=>mutate(p,"UPDATE assets SET bytes=X'01020304'"),'INVALID_ASSET'],
 ['missing referenced PNG',p=>mutate(p,"DELETE FROM assets WHERE id IN (SELECT json_extract(scene,'$.backgroundAssetId') FROM projects)"),'INVALID_PROJECT_STATE'],
 ['foreign project PNG',p=>mutate(p,"UPDATE assets SET project=(SELECT id FROM projects WHERE scene LIKE '%\"actors\":[]%') WHERE id IN (SELECT json_extract(scene,'$.backgroundAssetId') FROM projects)"),'INVALID_PROJECT_STATE'],
 ['unexpected file',p=>writeFileSync(join(p,'extra'),'x'),'INVALID_MANIFEST'],
 ['symlink database',p=>{rmSync(join(p,'snapshot.sqlite'));symlinkSync('/dev/null',join(p,'snapshot.sqlite'));},'UNSAFE_PATH'],
 ['hardlink alias',p=>linkSync(join(p,'snapshot.sqlite'),join(p,'../alias')),'UNSAFE_FILE'],
 ];
 for(const [name,change,code]of cases)await t.test(name,async()=>{const f=fixture();try{await createBackup(f.source,f.backup);change(f.backup);
 const digestBefore=readdirSync(f.backup).map(n=>[n,statSync(join(f.backup,n)).isFile()?hash(readFileSync(join(f.backup,n))):null]);
 rejects(()=>inspectBackup(f.backup,f.target),code);rejects(()=>restoreBackup(f.backup,f.dest),code);assert.ok(!readdirSync(f.target).includes(DATABASE_NAME));
 assert.deepEqual(readdirSync(f.backup).map(n=>[n,statSync(join(f.backup,n)).isFile()?hash(readFileSync(join(f.backup,n))):null]),digestBefore);
 writeFileSync(f.dest,'existing');rejects(()=>restoreBackup(f.backup,f.dest),'DESTINATION_EXISTS');assert.equal(readFileSync(f.dest,'utf8'),'existing');
 }finally{f.cleanup();}});
});

test('account incarnation, symlink components, public paths, sidecars and nonempty destinations refuse',async()=>{
 const f=fixture();try{await createBackup(f.source,f.backup);
 const key=hash(Buffer.from('user:alice')),record=join(f.target,'_storage',key);writeFileSync(record,JSON.stringify({key:'user:alice',value:{handle:'alice',created:124}}));
 rejects(()=>restoreBackup(f.backup,f.dest),'ACCOUNT_BINDING_UNVERIFIED');assert.ok(!readdirSync(f.target).includes(DATABASE_NAME));
 const linked=join(f.root,'linked');symlinkSync(f.target,linked);rejects(()=>restoreBackup(f.backup,join(linked,DATABASE_NAME)),'UNSAFE_PATH');
 mkdirSync(join(f.root,'public'));rejects(()=>restoreBackup(f.backup,join(f.root,'public',DATABASE_NAME)),'UNSAFE_PATH');
 mkdirSync(f.dest);rejects(()=>restoreBackup(f.backup,f.dest),'DESTINATION_EXISTS');rmSync(f.dest,{recursive:true});
 writeFileSync(f.dest+'-wal','');rejects(()=>restoreBackup(f.backup,f.dest),'DESTINATION_EXISTS');
 await assert.rejects(createBackup(f.source,f.backup),e=>e.code==='DESTINATION_EXISTS');
 }finally{f.cleanup();}
});

test('faults inspect source and destination filesystem rather than assuming rollback',async t=>{
 for(const point of ['snapshot','snapshot-written','manifest','publish'])await t.test('backup '+point,async()=>{const f=fixture();try{const rows=inventory(f.source);await assert.rejects(createBackup(f.source,f.backup,{at(p){if(p===point)throw Error('injected');}}));assert.deepEqual(inventory(f.source),rows);assert.ok(!readdirSync(f.root).some(n=>n==='backup'||n.startsWith('.sn-recovery-')));}finally{f.cleanup();}});
 for(const point of ['staging','validation','publish'])await t.test('restore '+point,async()=>{const f=fixture();try{await createBackup(f.source,f.backup);const before=packageInventory(f.backup);assert.throws(()=>restoreBackup(f.backup,f.dest,{at(p){if(p===point)throw Error('injected');}}));assert.deepEqual(readdirSync(f.target),['_storage']);assert.deepEqual(packageInventory(f.backup),before);}finally{f.cleanup();}});
 await t.test('exclusive destination creation race',async()=>{const f=fixture();try{await assert.rejects(createBackup(f.source,f.backup,{at(p){if(p==='publish')mkdirSync(f.backup);}}));assert.deepEqual(readdirSync(f.backup),[]);assert.ok(!readdirSync(f.root).some(n=>n.startsWith('.sn-recovery-')));}finally{f.cleanup();}});
 await t.test('backup snapshot write fails with SQLite target replaced by directory',async()=>{const f=fixture();try{await assert.rejects(createBackup(f.source,f.backup,{at(p){if(p==='snapshot'){const stage=readdirSync(f.root).find(n=>n.startsWith('.sn-recovery-'));rmSync(join(f.root,stage,'snapshot.sqlite'));mkdirSync(join(f.root,stage,'snapshot.sqlite'));}}}));assert.ok(!readdirSync(f.root).includes('backup'));const stage=readdirSync(f.root).find(n=>n.startsWith('.sn-recovery-'));assert.ok(statSync(join(f.root,stage,'snapshot.sqlite')).isDirectory());}finally{f.cleanup();}});
});

for(const journal of ['delete','wal'])test('coherent committed revisions with overlapping asset imports/save and rolled-back transaction: '+journal,async()=>{
 const f=fixture();try{
 const grow=openStore(f.source);for(let i=0;i<30;i++)grow.importAsset(owner,f.saved.projectId,png);grow.close();
 const writer=new DatabaseSync(f.source);assert.equal(writer.prepare('PRAGMA journal_mode='+journal).get().journal_mode,journal);
 // Enlarge page count so backup progress necessarily precedes completion.
 writer.prepare('UPDATE assets SET bytes=? WHERE id=(SELECT id FROM assets LIMIT 1)').run(png);writer.prepare('UPDATE projects SET name=? WHERE owner=?').run('Committed pending WAL',other);
 if(journal==='wal')assert.ok(statSync(f.source+'-wal').size>0);
 let changed=false,progress=0;const original=inventory(f.source);
 await createBackup(f.source,f.backup,{progress({remainingPages}){progress++;if(changed||remainingPages===0)return;changed=true;
 const s=openStore(f.source),a=s.importAsset(owner,f.saved.projectId,png);s.save(owner,f.saved.projectId,{schemaVersion:1,expectedRevision:1,name:f.saved.name,scene:{...f.saved.scene,backgroundAssetId:a.assetId}});s.close();
 const db=new DatabaseSync(f.source);db.exec("BEGIN IMMEDIATE; UPDATE projects SET name='rolled back'; ROLLBACK");db.close();}});
 assert.ok(progress>0);assert.ok(changed,'must overlap a committed write');const snapshot=inventory(join(f.backup,'snapshot.sqlite')),after=inventory(f.source);
 assert.ok(JSON.stringify(snapshot)===JSON.stringify(original)||JSON.stringify(snapshot)===JSON.stringify(after));
 const p=snapshot.projects.find(p=>p.id===f.saved.projectId),ref=JSON.parse(p.scene).backgroundAssetId;assert.ok(snapshot.assets.some(a=>a.id===ref&&a.project===p.id));assert.ok(snapshot.projects.every(p=>p.name!=='rolled back'));
 assert.equal(inspectBackup(f.backup).code,'VALID_BACKUP');writer.close();
 }finally{f.cleanup();}
});

test('killed backup retains an incomplete private stage, no completed package and unchanged committed source',async()=>{
 const f=fixture();try{const before=inventory(f.source),moduleURL=new URL('../recovery.mjs',import.meta.url).href;
 const script=`import {createBackup} from ${JSON.stringify(moduleURL)};await createBackup(${JSON.stringify(f.source)},${JSON.stringify(f.backup)},{at(p){if(p==='snapshot-written'){process.stdout.write('ready');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}}});`;
 const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','pipe','pipe']});await new Promise((res,rej)=>{child.stdout.once('data',res);child.once('exit',code=>rej(Error('premature exit '+code)));});
 const ended=new Promise(res=>child.once('exit',res));child.kill('SIGKILL');await ended;assert.ok(!readdirSync(f.root).includes('backup'));const stage=readdirSync(f.root).find(n=>n.startsWith('.sn-recovery-'));assert.ok(stage);assert.ok(!readdirSync(join(f.root,stage)).includes('manifest.json'));assert.deepEqual(inventory(f.source),before);
 }finally{f.cleanup();}
});

test('actual operator CLI creates, inspects, restores and refuses replacement',async()=>{
 const {execFileSync}=await import('node:child_process');const f=fixture();try{
 const cli=new URL('../tools/recovery.mjs',import.meta.url).pathname;
 const run=args=>JSON.parse(execFileSync(process.execPath,[cli,...args],{encoding:'utf8'}));
 assert.equal(run(['backup',f.source,f.backup]).code,'VALID_BACKUP');
 assert.equal(run(['inspect',f.backup,'--data-root',f.target]).accountBinding,'VERIFIED_SAME_ACCOUNT_INCARNATION');
 assert.equal(run(['restore',f.backup,f.dest]).code,'RESTORED');const prior=readFileSync(f.dest);
 assert.throws(()=>run(['restore',f.backup,f.dest]),e=>e.status===1&&e.stderr.includes('DESTINATION_EXISTS'));assert.deepEqual(readFileSync(f.dest),prior);
 }finally{f.cleanup();}
});

test('process killed inside a rollback transaction: backup refuses hot journal, normal SQLite reopen recovers the original commit',async()=>{
 const f=fixture();try{const before=inventory(f.source);
 const script=`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(${JSON.stringify(f.source)});db.exec("PRAGMA cache_size=1; BEGIN IMMEDIATE; UPDATE projects SET name='uncommitted'; UPDATE assets SET bytes=zeroblob(1048576)");process.stdout.write('ready');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);`;
 const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','pipe','pipe']});await new Promise((res,rej)=>{child.stdout.once('data',res);child.once('exit',code=>rej(Error('premature exit '+code)));});const ended=new Promise(res=>child.once('exit',res));child.kill('SIGKILL');await ended;
 assert.ok(statSync(f.source+'-journal').size>0);
 await assert.rejects(createBackup(f.source,f.backup));assert.ok(!readdirSync(f.root).includes('backup'));
 const recovered=openStore(f.source);recovered.close();assert.deepEqual(inventory(f.source),before);
 }finally{f.cleanup();}
});

test('staging tampering and real publication failures preserve unknown files and refuse activation',async t=>{
 await t.test('manifest write failure',async()=>{const f=fixture();try{await assert.rejects(createBackup(f.source,f.backup,{at(p){if(p==='manifest'){const stage=readdirSync(f.root).find(n=>n.startsWith('.sn-recovery-'));mkdirSync(join(f.root,stage,'manifest.json'));}}}));assert.ok(!readdirSync(f.root).includes('backup'));const stage=readdirSync(f.root).find(n=>n.startsWith('.sn-recovery-'));assert.deepEqual(readdirSync(join(f.root,stage)),['manifest.json']);}finally{f.cleanup();}});
 for(const mode of ['symlink','integrity','publication'])await t.test('restore '+mode,async()=>{const f=fixture();try{await createBackup(f.source,f.backup);const before=packageInventory(f.backup);
 assert.throws(()=>restoreBackup(f.backup,f.dest,{at(p){if(p==='validation'&&mode!=='publication'){const stage=readdirSync(f.target).find(n=>n.startsWith('.sn-recovery-')),snapshot=join(f.target,stage,'snapshot.sqlite');if(mode==='symlink'){rmSync(snapshot);symlinkSync(f.source,snapshot);}else writeFileSync(snapshot,'corrupt');}if(p==='publish'&&mode==='publication')writeFileSync(f.dest,'created by another operator');}}));
 assert.deepEqual(packageInventory(f.backup),before);assert.equal(mode==='publication'?readFileSync(f.dest,'utf8'):'no destination',mode==='publication'?'created by another operator':'no destination');
 if(mode!=='publication')assert.ok(!readdirSync(f.target).includes(DATABASE_NAME));
 if(mode==='symlink'){const stage=readdirSync(f.target).find(n=>n.startsWith('.sn-recovery-'));assert.ok(stage);assert.ok(statSync(join(f.target,stage,'snapshot.sqlite')).isFile());}
 }finally{f.cleanup();}});
});
