import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../store.mjs';
import { BUNDLE_BYTES } from '../bundle.mjs';
import {PNG} from 'pngjs';
import { digest } from '../png.mjs';
const png=n=>readFileSync(new URL('../../../tests/fixtures/m12-stage/'+n+'.png',import.meta.url));
function fixture(t) {
 const root=mkdtempSync(join(tmpdir(),'sn-bundle-')),path=join(root,'db');let store=openStore(path);
 const db=new DatabaseSync(path);t.after(()=>{db.close();store.close();rmSync(root,{recursive:true,force:true});});
 const p=store.create('alice',{name:'Same name'}),images=['forest','mira-a','rowan'].map(n=>store.importAsset('alice',p.projectId,png(n)));
 const scene={backgroundAssetId:images[0].assetId,backgroundLocked:true,actors:images.slice(1).map((a,i)=>({actorId:randomUUID(),name:'Actor '+i,spriteAssetId:a.assetId,slot:i?'right':'left',present:!i,locks:{presence:true,slot:!i,outfit:true}}))};
 const saved=store.save('alice',p.projectId,{schemaVersion:1,expectedRevision:0,name:p.name,scene});
 const inventory=()=>({projects:db.prepare('SELECT * FROM projects ORDER BY id').all(),assets:db.prepare('SELECT * FROM assets ORDER BY id').all()});
 return {get store(){return store;},db,p:saved,inventory,restart(){store.close();store=openStore(path);}};
}
const encode=b=>Buffer.from(JSON.stringify(b));
test('bundle roundtrip remaps all IDs, preserves bytes/locks, isolates edits and survives restart',async t=>{
 const f=fixture(t),original=f.inventory();f.store.importAsset('alice',f.p.projectId,png('tavern'));
 const bytes=await f.store.exportBundle('alice',f.p.projectId),manifest=JSON.parse(bytes);
 assert.equal(manifest.assets.length,3);assert.ok(!bytes.includes(Buffer.from('projectId')));
 const imported=await f.store.importBundle('alice',bytes),second=await f.store.importBundle('alice',bytes);
 assert.notEqual(imported.projectId,second.projectId);assert.notEqual(imported.projectId,f.p.projectId);assert.equal(imported.name,f.p.name);
 assert.equal(imported.revision,0);assert.deepEqual(f.store.load('alice',f.p.projectId),f.p);
 for(const [i,a]of imported.scene.actors.entries()){
  const prior=f.p.scene.actors[i];assert.notEqual(a.actorId,prior.actorId);assert.notEqual(a.spriteAssetId,prior.spriteAssetId);
  assert.deepEqual({...a,actorId:prior.actorId,spriteAssetId:prior.spriteAssetId},prior);
 }
 assert.notEqual(imported.scene.backgroundAssetId,f.p.scene.backgroundAssetId);
 const refs=s=>[s.backgroundAssetId,...s.actors.map(a=>a.spriteAssetId)];
 for(const [i,id]of refs(imported.scene).entries()){
  const a=f.store.asset('alice',imported.projectId,id),b=f.store.asset('alice',f.p.projectId,refs(f.p.scene)[i]);assert.equal(a.sha256,b.sha256);assert.deepEqual(a.bytes,b.bytes);
 }
 f.store.save('alice',f.p.projectId,{schemaVersion:1,expectedRevision:1,name:'Edited original',scene:{...f.p.scene,backgroundLocked:false}});
 assert.deepEqual(f.store.load('alice',imported.projectId),imported);
 f.store.save('alice',imported.projectId,{schemaVersion:1,expectedRevision:0,name:'Independent',scene:imported.scene});
 f.restart();assert.equal(f.store.load('alice',imported.projectId).name,'Independent');assert.equal(original.projects.length,1);
});
test('foreign export, forged IDs, busy worker, and caller ownership are refused or independently scoped',async t=>{
 const f=fixture(t);await assert.rejects(f.store.exportBundle('bob',f.p.projectId),{code:'NOT_FOUND'});
 await assert.rejects(f.store.exportBundle('alice','../db'),{code:'NOT_FOUND'});
 const bytes=await f.store.exportBundle('alice',f.p.projectId);
 await assert.rejects(f.store.importBundle('',bytes),{code:'UNAUTHORIZED'});
 const pending=f.store.importBundle('bob',bytes);await assert.rejects(f.store.importBundle('alice',bytes),{code:'BUNDLE_BUSY'});
 const p=await pending;assert.equal(f.store.list('bob').length,1);assert.throws(()=>f.store.load('alice',p.projectId),{code:'NOT_FOUND'});
});
test('malformed containers all leave committed database inventory identical',async t=>{
 const f=fixture(t),bytes=await f.store.exportBundle('alice',f.p.projectId),bundle=JSON.parse(bytes),before=f.inventory();
 const variants=[
  ['truncated',()=>bytes.subarray(0,100)],['oversized',()=>Buffer.alloc(BUNDLE_BYTES+1)],
  ['excess entries',b=>{b.assets=Array(22).fill(b.assets[0]);}],
  ['compression',b=>{b.compression='deflate';}],['duplicate entry',b=>{b.assets.push(b.assets[0]);}],
  ['traversal',b=>{b.assets[0].assetId='../art.png';}],['absolute',b=>{b.assets[0].assetId='/tmp/art.png';}],
  ['symlink',b=>{b.assets[0].symlink='art.png';}],['extra field',b=>{b.owner='bob';}],
  ['source project authority',b=>{b.projectId=f.p.projectId;}],['version',b=>{b.version=2;}],
  ['missing',b=>{b.assets.pop();}],['wrong hash',b=>{b.assets[0].sha256='0'.repeat(64);}],
  ['wrong length',b=>{b.assets[0].byteLength++;}],['foreign reference',b=>{b.scene.backgroundAssetId=randomUUID();}],
  ['invalid actor',b=>{b.scene.actors[0].actorId='native-name';}],['extra scene key',b=>{b.scene.expressions=[];}],
  ['script',b=>{b.assets.push({path:'run.js',data:'alert(1)'});}],
  ['corrupt png',b=>{const a=b.assets[0],v=Buffer.from(a.data,'base64');v[45]^=255;a.data=v.toString('base64');a.sha256=digest(v);}],
  ['dimensions',b=>{const a=b.assets[0],v=Buffer.from(a.data,'base64');v.writeUInt32BE(100000,16);a.data=v.toString('base64');a.sha256=digest(v);}],
  ['ZIP bytes',()=>Buffer.from('PK\x03\x04arbitrary archive')],
  ['duplicate JSON key',()=>Buffer.from(bytes.toString().replace('"version":1','"version":1,"version":1'))],
 ];
 for(const [name,change]of variants)await t.test(name,async()=>{
  const b=structuredClone(bundle),value=change(b);await assert.rejects(f.store.importBundle('alice',Buffer.isBuffer(value)?value:encode(b)));assert.deepEqual(f.inventory(),before);
 });
});
test('write-phase failures inspect rollback; quotas refuse atomically',async t=>{
 const f=fixture(t),bytes=await f.store.exportBundle('alice',f.p.projectId),before=f.inventory();
 for(const [name,sql]of [
  ['project creation',"CREATE TRIGGER fault BEFORE INSERT ON projects BEGIN SELECT RAISE(ABORT,'fail'); END"],
  ['second asset insertion',"CREATE TRIGGER fault BEFORE INSERT ON assets WHEN (SELECT count(*) FROM assets WHERE project=NEW.project)=1 BEGIN SELECT RAISE(ABORT,'fail'); END"],
  ['final scene insertion',"CREATE TRIGGER fault BEFORE UPDATE ON projects BEGIN SELECT RAISE(ABORT,'fail'); END"],
  ['commit deferred foreign key',"CREATE TRIGGER fault AFTER UPDATE ON projects BEGIN INSERT INTO assets VALUES ('fault','nonexistent','hash',1,1,x'01'); END"],
 ])await t.test(name,async()=>{
  if(name.startsWith('commit'))f.db.exec('PRAGMA defer_foreign_keys=ON');
  f.db.exec(sql);
  // Deferred constraint is set inside each transaction via this trigger-compatible fixture.
  if(name.startsWith('commit')) {
   f.db.exec('DROP TRIGGER fault');
   // A deferred FK fixture makes COMMIT fail after every import write succeeds.
   f.db.exec("CREATE TABLE deferred_fault (project TEXT REFERENCES projects(id) DEFERRABLE INITIALLY DEFERRED); CREATE TRIGGER fault AFTER UPDATE ON projects BEGIN INSERT INTO deferred_fault VALUES ('nonexistent'); END;");
  }
  await assert.rejects(f.store.importBundle('alice',bytes));assert.deepEqual(f.inventory(),before);f.db.exec('DROP TRIGGER fault');
  if(name.startsWith('commit')){assert.equal(f.db.prepare('SELECT count(*) AS n FROM deferred_fault').get().n,0);f.db.exec('DROP TABLE deferred_fault');}
 });
 await t.test('project quota',async()=>{for(let i=1;i<100;i++)f.store.create('alice',{name:'Quota'});const prior=f.inventory();await assert.rejects(f.store.importBundle('alice',bytes),{code:'PROJECT_LIMIT'});assert.deepEqual(f.inventory(),prior);});
 await t.test('asset quota',async()=>{const p=f.store.create('bob',{name:'Quota'});f.db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,zeroblob(?))').run(randomUUID(),p.projectId,'unused',1,1,100*1024*1024);const count=f.db.prepare('SELECT count(*) AS n FROM assets').get().n;await assert.rejects(f.store.importBundle('bob',bytes),{code:'ASSET_QUOTA'});assert.equal(f.store.list('bob').length,1);assert.equal(f.db.prepare('SELECT count(*) AS n FROM assets').get().n,count);});
});
test('export snapshots stay coherent while a peer saves; corrupt saved bytes refuse',async t=>{
 const f=fixture(t),prior=f.p;
 const pending=f.store.exportBundle('alice',prior.projectId);
 f.store.save('alice',prior.projectId,{schemaVersion:1,expectedRevision:1,name:'New name',scene:{...prior.scene,backgroundAssetId:null,backgroundLocked:false,actors:[]}});
 const b=JSON.parse(await pending);assert.equal(b.name,prior.name);assert.deepEqual(b.scene,prior.scene);assert.equal(b.assets.length,3);
 const next=JSON.parse(await f.store.exportBundle('alice',prior.projectId));assert.equal(next.assets.length,0);assert.equal(next.name,'New name');
 f.store.save('alice',prior.projectId,{schemaVersion:1,expectedRevision:2,name:prior.name,scene:prior.scene});
 f.db.prepare('UPDATE assets SET bytes=? WHERE id=?').run(Buffer.from('corrupt'),prior.scene.backgroundAssetId);
 await assert.rejects(f.store.exportBundle('alice',prior.projectId),{code:'CORRUPT_ASSET'});
});

test('experimental export ceilings refuse the complete saved arrangement',async t=>{
 const f=fixture(t),prior=f.inventory();
 // Stored valid-looking metadata with too many bytes must refuse before BLOB read/hash.
 f.db.prepare('UPDATE assets SET bytes=zeroblob(?) WHERE id=?').run(6*1024*1024+1,f.p.scene.backgroundAssetId);
 await assert.rejects(f.store.exportBundle('alice',f.p.projectId),{code:'BUNDLE_LIMIT'});
 assert.deepEqual(f.store.load('alice',f.p.projectId),f.p);
 f.db.prepare('UPDATE assets SET bytes=? WHERE id=?').run(prior.assets.find(a=>a.id===f.p.scene.backgroundAssetId).bytes,f.p.scene.backgroundAssetId);
 // Reusing large PNG bytes for distinct sprites counts every decoded entry.
 const actors=Array.from({length:4},(_,i)=>({actorId:randomUUID(),name:'Actor '+i,spriteAssetId:null,slot:null,present:true,locks:{presence:false,slot:false,outfit:false}}));
 // Distinct IDs matter: create four separately stored copies of the large background.
 for(const [i,a] of actors.entries()){const im=PNG.sync.read(png('forest'));im.data[0]=i;a.spriteAssetId=f.store.importAsset('alice',f.p.projectId,PNG.sync.write(im)).assetId;}
 f.store.save('alice',f.p.projectId,{schemaVersion:1,expectedRevision:1,name:f.p.name,scene:{...f.p.scene,actors}});
 const before=f.inventory();await assert.rejects(f.store.exportBundle('alice',f.p.projectId),{code:'BUNDLE_PIXELS'});assert.deepEqual(f.inventory(),before);
});
