import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync,readdirSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {openStore} from '../store.mjs';
import {V1_SCHEMA_SQL} from '../database-schema.mjs';
import {validateCatalog,selectedCatalog,emptyScene} from '../schema.mjs';
import {decodePNG,digest} from '../png.mjs';
import {createBackup,inspectBackup,restoreBackup,migrateBackup,DATABASE_NAME} from '../recovery.mjs';
const owner='["alice",1]',foreign='["bob",2]';
const png=n=>readFileSync(new URL('../../../tests/fixtures/m12-stage/'+n+'.png',import.meta.url));
const refuses=(fn,code)=>assert.throws(fn,e=>e.code===code);
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'sn-library-')),path=join(root,DATABASE_NAME);let store=openStore(path);
 t.after(()=>{store.close();rmSync(root,{recursive:true,force:true});});
 return {root,path,get store(){return store;},restart(){store.close();store=openStore(path);}};
}
function library(f){
 const p=f.store.create(owner,{name:'Library'}),actorId=randomUUID();
 const images=['forest','tavern','mira-a','mira-b'].map(n=>f.store.importAsset(owner,p.projectId,png(n)));
 const scene={backgroundAssetId:images[0].assetId,backgroundLocked:true,actors:[{actorId,name:'Manual actor',spriteAssetId:images[2].assetId,slot:'left',present:true,locks:{presence:true,slot:true,outfit:true}}]};
 const catalog=images.map((a,i)=>({assetId:a.assetId,label:'Duplicate label',kind:i<2?'background':'sprite',actorId:i<2?null:actorId}));
 return {...p,scene,catalog,images};
}
const body=p=>({schemaVersion:2,expectedRevision:p.revision,name:p.name,scene:p.scene,catalog:p.catalog});
test('two backgrounds/two actor sprites survive saves/restart/reselection, labels and immutable bytes stay distinct',t=>{
 const f=fixture(t),p=library(f);let saved=f.store.save(owner,p.projectId,body(p));f.restart();
 assert.deepEqual(f.store.load(owner,p.projectId),saved);
 for(const bg of p.images.slice(0,2))for(const sprite of p.images.slice(2)){
  saved=f.store.save(owner,p.projectId,body({...saved,scene:{...saved.scene,backgroundAssetId:bg.assetId,actors:[{...saved.scene.actors[0],spriteAssetId:sprite.assetId}]}}));
  assert.equal(saved.catalog.length,4);assert.equal(f.store.previewCleanup(owner,p.projectId).candidates.length,0);
 }
 for(const [i,a]of p.images.entries())assert.deepEqual(Buffer.from(f.store.asset(owner,p.projectId,a.assetId).bytes),png(['forest','tavern','mira-a','mira-b'][i]));
 const other=f.store.create(owner,{name:p.name});assert.deepEqual(other.catalog,[]);
 refuses(()=>f.store.load(foreign,p.projectId),'NOT_FOUND');refuses(()=>f.store.save(foreign,p.projectId,body(saved)),'NOT_FOUND');
 refuses(()=>f.store.save(owner,other.projectId,body({...saved,revision:0})),'ASSET_MISSING');
 refuses(()=>f.store.save(owner,p.projectId,body({...saved,revision:0})),'REVISION_CONFLICT');
 refuses(()=>f.store.save(owner,p.projectId,{schemaVersion:1,expectedRevision:saved.revision,name:saved.name,scene:saved.scene}),'CATALOG_CLIENT_REQUIRED');
});
test('catalog validation rejects foreign actors, categories, labels, duplicate identities and incompatible selected art',t=>{
 const f=fixture(t),p=library(f);const before=f.store.load(owner,p.projectId);
 for(const catalog of [[{...p.catalog[0],kind:'script'}],[{...p.catalog[2],actorId:randomUUID()}],[{...p.catalog[0],label:'\u0000'}],[p.catalog[0],p.catalog[0]],Array(101).fill(p.catalog[0])])refuses(()=>f.store.save(owner,p.projectId,body({...p,catalog})),'INVALID_STATE');
 refuses(()=>f.store.save(owner,p.projectId,body({...p,catalog:[{...p.catalog[0],kind:'sprite',actorId:p.scene.actors[0].actorId}]})),'INCOMPATIBLE_ASSET');
 assert.deepEqual(f.store.load(owner,p.projectId),before);
 // One immutable image may be registered in several explicit contexts.
 assert.equal(validateCatalog([...p.catalog,{...p.catalog[0],kind:'sprite',actorId:p.scene.actors[0].actorId}],p.scene).length,5);
});
test('catalog protects alternatives; unregister/save is separate from stale-checked byte deletion; failed writes preserve metadata',t=>{
 const f=fixture(t),p=library(f);const saved=f.store.save(owner,p.projectId,body(p));
 const orphan=f.store.importAsset(owner,p.projectId,png('rowan')),preview=f.store.previewCleanup(owner,p.projectId);
 assert.deepEqual(preview.candidates.map(a=>a.assetId),[orphan.assetId]);
 refuses(()=>f.store.removeUnusedAssets(owner,p.projectId,{expectedRevision:1,inventoryRevision:preview.inventoryRevision,assetIds:[p.images[1].assetId]}),'ASSET_REFERENCED');
 const db=new DatabaseSync(f.path),rows=()=>db.prepare('SELECT * FROM projects').all();const prior=rows();
 db.exec("CREATE TRIGGER fail_catalog BEFORE UPDATE ON projects BEGIN SELECT RAISE(ABORT,'fixture'); END;");
 assert.throws(()=>f.store.save(owner,p.projectId,body({...saved,catalog:p.catalog.slice(0,3)})));assert.deepEqual(rows(),prior);db.exec('DROP TRIGGER fail_catalog');
 const unregistered=f.store.save(owner,p.projectId,body({...saved,catalog:p.catalog.filter(a=>a.assetId!==p.images[1].assetId)}));
 refuses(()=>f.store.removeUnusedAssets(owner,p.projectId,{expectedRevision:1,inventoryRevision:preview.inventoryRevision,assetIds:[orphan.assetId]}),'REVISION_CONFLICT');
 const v=f.store.previewCleanup(owner,p.projectId);assert.equal(v.candidates.length,2);
 f.store.removeUnusedAssets(owner,p.projectId,{expectedRevision:unregistered.revision,inventoryRevision:v.inventoryRevision,assetIds:[p.images[1].assetId]});
 refuses(()=>f.store.save(owner,p.projectId,body({...unregistered,catalog:p.catalog})),'ASSET_MISSING');
 db.close();
});
test('identical project PNG uploads reuse UUID/bytes/quota, including shared actor use; separate projects own separate bytes',t=>{
 const f=fixture(t),p=library(f),db=new DatabaseSync(f.path);
 const before=db.prepare('SELECT count(*) AS n,sum(length(bytes)) AS bytes FROM assets').get();
 assert.deepEqual(f.store.importAsset(owner,p.projectId,png('forest')),p.images[0]);
 assert.deepEqual(db.prepare('SELECT count(*) AS n,sum(length(bytes)) AS bytes FROM assets').get(),before);
 const q=f.store.create(owner,{name:'Independent'});assert.notEqual(f.store.importAsset(owner,q.projectId,png('forest')).assetId,p.images[0].assetId);db.close();
});
test('full database backup/recovery preserves library; portable v1 copy carries only selected bytes and no catalog labels/alternatives',async t=>{
 const f=fixture(t),p=library(f),saved=f.store.save(owner,p.projectId,body(p));
 const backup=join(f.root,'backup');await createBackup(f.path,backup);assert.equal(inspectBackup(backup).schemaVersion,2);assert.equal(inspectBackup(backup).assets,4);
 const target=join(f.root,'target');mkdirSync(target,{mode:0o700});mkdirSync(join(target,'_storage'));
 writeFileSync(join(target,'_storage',digest('user:alice')),JSON.stringify({key:'user:alice',value:{handle:'alice',created:1}}));
 restoreBackup(backup,join(target,DATABASE_NAME));const recovered=openStore(join(target,DATABASE_NAME));assert.deepEqual(recovered.load(owner,p.projectId),saved);recovered.close();
 const bundle=await f.store.exportBundle(owner,p.projectId),decoded=JSON.parse(bundle);assert.equal(decoded.version,1);assert.equal(decoded.assets.length,2);assert.equal(Object.hasOwn(decoded,'catalog'),false);
 const copy=await f.store.importBundle(foreign,bundle);assert.deepEqual(copy.catalog,[]);assert.equal(copy.scene.actors.length,1);assert.equal(f.store.previewCleanup(foreign,copy.projectId).candidates.length,0);
 for(const a of selectedCatalog(copy.scene))assert.ok(f.store.asset(foreign,copy.projectId,a.assetId).bytes.length);
});
function legacy(path){
 const db=new DatabaseSync(path),id=randomUUID(),assetId=randomUUID(),actorId=randomUUID(),metadata=decodePNG(png('forest'));
 db.exec(V1_SCHEMA_SQL.join(';')+'; PRAGMA user_version=1;');
 const scene={...emptyScene(),backgroundAssetId:assetId,actors:[{actorId,name:'L'.repeat(80),spriteAssetId:assetId,slot:'left',present:true,locks:{presence:false,slot:true,outfit:true}}]};
 db.prepare('INSERT INTO projects VALUES (?,?,?,?,?)').run(id,owner,'Legacy',7,JSON.stringify(scene));
 db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?)').run(assetId,id,metadata.sha256,metadata.width,metadata.height,png('forest'));db.close();return {id,scene,assetId};
}
function migrationTarget(root,name='target') {
 const target=join(root,name);mkdirSync(target,{mode:0o700});mkdirSync(join(target,'_storage'));
 writeFileSync(join(target,'_storage',digest('user:alice')),JSON.stringify({key:'user:alice',value:{handle:'alice',created:1}}));return join(target,DATABASE_NAME);
}
const packageBytes=directory=>['snapshot.sqlite','manifest.json'].map(name=>readFileSync(join(directory,name)));
test('v1 startup refuses without mutation; explicit verified-backup migration preserves source and reversible v1 copy',async t=>{
 const root=mkdtempSync(join(tmpdir(),'sn-library-v1-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const path=join(root,'old'),p=legacy(path),original=readFileSync(path);chmodSync(path,0o400);
 refuses(()=>openStore(path),'MIGRATION_REQUIRED');assert.deepEqual(readFileSync(path),original);
 const backup=join(root,'v1');await createBackup(path,backup);const frozen=packageBytes(backup);assert.equal(inspectBackup(backup).schemaVersion,1);
 const output=migrationTarget(root);assert.equal(migrateBackup(backup,output).code,'MIGRATED');
 const store=openStore(output),loaded=store.load(owner,p.id);assert.equal(loaded.schemaVersion,2);assert.equal(loaded.revision,7);assert.deepEqual(loaded.scene,p.scene);assert.equal(loaded.catalog.length,2);assert.deepEqual(Buffer.from(store.asset(owner,p.id,p.assetId).bytes),png('forest'));store.close();
 assert.deepEqual(readFileSync(path),original);assert.deepEqual(packageBytes(backup),frozen);
 const rollback=migrationTarget(root,'rollback');restoreBackup(backup,rollback);assert.equal(inspectBackup(backup).schemaVersion,1);assert.deepEqual(readFileSync(rollback),frozen[0]);refuses(()=>openStore(rollback),'MIGRATION_REQUIRED');
 const before=readFileSync(output);refuses(()=>migrateBackup(backup,output),'DESTINATION_EXISTS');assert.deepEqual(readFileSync(output),before);
 const commandTarget=migrationTarget(root,'cli');const {execFileSync}=await import('node:child_process');
 const receipt=JSON.parse(execFileSync(process.execPath,[new URL('../tools/recovery.mjs',import.meta.url).pathname,'migrate',backup,commandTarget],{encoding:'utf8'}));assert.equal(receipt.code,'MIGRATED');assert.equal(receipt.schemaVersion,2);assert.deepEqual(packageBytes(backup),frozen);
});
for(const phase of ['catalog write','version marker'])test('copy migration failure preserves v1 source and backup after '+phase,async t=>{
 const root=mkdtempSync(join(tmpdir(),'sn-library-fault-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const path=join(root,'old');legacy(path);const before=readFileSync(path),backup=join(root,'backup');await createBackup(path,backup);const frozen=packageBytes(backup),output=migrationTarget(root);
 const prepare=DatabaseSync.prototype.prepare,exec=DatabaseSync.prototype.exec;
 DatabaseSync.prototype.prepare=function(sql){if(phase==='catalog write'&&sql==='UPDATE projects SET catalog=? WHERE id=?')throw Error('injected migration failure');return prepare.call(this,sql);};
 DatabaseSync.prototype.exec=function(sql){const result=exec.call(this,sql);if(phase==='version marker'&&sql==='PRAGMA user_version=2')throw Error('injected marker failure');return result;};
 try{assert.throws(()=>migrateBackup(backup,output),/injected/);}finally{DatabaseSync.prototype.prepare=prepare;DatabaseSync.prototype.exec=exec;}
 assert.deepEqual(readFileSync(path),before);assert.deepEqual(packageBytes(backup),frozen);assert.equal(existsSync(output),false);
 assert.equal(migrateBackup(backup,output).code,'MIGRATED');
});
for(const phase of ['staging','validation','migration','migrated','publish'])test('migration '+phase+' failure publishes no output and preserves v1 backup',async t=>{
 const root=mkdtempSync(join(tmpdir(),'sn-library-publish-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const path=join(root,'old');legacy(path);const original=readFileSync(path),backup=join(root,'backup');await createBackup(path,backup);const frozen=packageBytes(backup),output=migrationTarget(root);
 assert.throws(()=>migrateBackup(backup,output,{at(p){if(p===phase)throw Error('injected '+phase);}}),/injected/);
 assert.equal(existsSync(output),false);assert.deepEqual(readFileSync(path),original);assert.deepEqual(packageBytes(backup),frozen);assert.equal(readdirSync(dirname(output)).some(p=>p.startsWith('.sn-recovery-')),false);
});
test('migration refuses invalid backup, schema2 source and wrong-account destinations',async t=>{
 const f=fixture(t),p=library(f);f.store.save(owner,p.projectId,body(p));const backup=join(f.root,'v2');await createBackup(f.path,backup);const output=migrationTarget(f.root);
 refuses(()=>migrateBackup(backup,output),'UNSUPPORTED_SCHEMA');assert.equal(existsSync(output),false);
 const old=join(f.root,'v1');legacy(old);const v1=join(f.root,'v1-backup');await createBackup(old,v1);
 const record=join(f.root,'target','_storage',digest('user:alice'));writeFileSync(record,JSON.stringify({key:'user:alice',value:{handle:'alice',created:2}}));refuses(()=>migrateBackup(v1,output),'ACCOUNT_BINDING_UNVERIFIED');assert.equal(existsSync(output),false);
 writeFileSync(record,JSON.stringify({key:'user:alice',value:{handle:'alice',created:1}}));writeFileSync(join(v1,'manifest.json'),'{}');refuses(()=>migrateBackup(v1,output),'INVALID_MANIFEST');assert.equal(existsSync(output),false);
});

test('backup inspection rejects corrupt catalogs and mismatched schema declarations without touching source',async t=>{
 const f=fixture(t),p=library(f);f.store.save(owner,p.projectId,body(p));const original=readFileSync(f.path);
 for(const [name,change,code]of [
  ['bad catalog',db=>db.exec("UPDATE projects SET catalog='{}'"),'INVALID_PROJECT_STATE'],
  ['dangling library asset',db=>db.prepare('UPDATE projects SET catalog=?').run(JSON.stringify([{...p.catalog[0],assetId:randomUUID()}])),'INVALID_PROJECT_STATE'],
  ['foreign manual actor',db=>db.prepare('UPDATE projects SET catalog=?').run(JSON.stringify([{...p.catalog[2],actorId:randomUUID()}])),'INVALID_PROJECT_STATE'],
  ['unknown database version',db=>db.exec('PRAGMA user_version=3'),'UNSUPPORTED_SCHEMA'],
  ['manifest schema mismatch',()=>{},'INVALID_MANIFEST']
 ])await t.test(name,async()=>{
  const directory=join(f.root,name);await createBackup(f.path,directory);const snapshot=join(directory,'snapshot.sqlite'),db=new DatabaseSync(snapshot);change(db);db.close();
  const bytes=readFileSync(snapshot),manifest=JSON.parse(readFileSync(join(directory,'manifest.json')));manifest.snapshot={byteLength:bytes.length,sha256:digest(bytes)};if(name==='manifest schema mismatch')manifest.schemaVersion=1;
  writeFileSync(join(directory,'manifest.json'),JSON.stringify(manifest));refuses(()=>inspectBackup(directory),code);assert.deepEqual(readFileSync(f.path),original);
 });
});
test('v1 startup leaves malformed scene untouched for offline inspection',t=>{
 const root=mkdtempSync(join(tmpdir(),'sn-library-invalid-v1-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const path=join(root,'old');legacy(path);const db=new DatabaseSync(path);db.exec("UPDATE projects SET scene='{}'");db.close();
 const original=readFileSync(path);refuses(()=>openStore(path),'MIGRATION_REQUIRED');assert.deepEqual(readFileSync(path),original);
});

test('post-migration output validation and publication race preserve source, backup and existing destination',async t=>{
 const root=mkdtempSync(join(tmpdir(),'sn-library-validate-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const path=join(root,'old');legacy(path);const original=readFileSync(path),backup=join(root,'backup');await createBackup(path,backup);const frozen=packageBytes(backup),output=migrationTarget(root);
 refuses(()=>migrateBackup(backup,output,{at(phase){if(phase==='migrated'){const stage=readdirSync(dirname(output)).find(n=>n.startsWith('.sn-recovery-'));const db=new DatabaseSync(join(dirname(output),stage,'snapshot.sqlite'));db.exec("UPDATE projects SET catalog='{}'");db.close();}}}),'INVALID_PROJECT_STATE');assert.equal(existsSync(output),false);
 refuses(()=>migrateBackup(backup,output,{at(phase){if(phase==='publish')writeFileSync(output,'Other operator output');}}),'DESTINATION_EXISTS');assert.equal(readFileSync(output,'utf8'),'Other operator output');
 assert.deepEqual(readFileSync(path),original);assert.deepEqual(packageBytes(backup),frozen);
});
