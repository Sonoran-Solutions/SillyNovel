import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {openStore} from '../store.mjs';
import {createBackup,inspectBackup,validateDatabase,DATABASE_NAME} from '../recovery.mjs';
import {bundleJob} from '../bundle.mjs';
const alice='["alice",1]',bob='["bob",2]';
import {PNG} from 'pngjs';
const pixel=new PNG({width:1,height:1});pixel.data.set([1,123,45,255]);const png=PNG.sync.write(pixel);
const refuses=(fn,code)=>assert.throws(fn,e=>e.code===code);
async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'sn-cleanup-')),path=join(root,DATABASE_NAME);let store=openStore(path);const db=new DatabaseSync(path);
 t.after(()=>{store.close();db.close();rmSync(root,{recursive:true,force:true});});
 const p=store.create(alice,{name:'Original'}),q=store.create(alice,{name:'Other project'}),foreign=store.create(bob,{name:'Foreign'});
 let serial=0;
 const upload=(id=p.projectId)=>{const image=new PNG({width:1,height:1});image.data.set([++serial,123,45,255]);return store.importAsset(id===foreign.projectId?bob:alice,id,PNG.sync.write(image));};
 const used=upload(),unused=[upload(),upload(),upload()],other=upload(q.projectId),secret=upload(foreign.projectId);
 const scene={backgroundAssetId:used.assetId,backgroundLocked:true,actors:[0,1].map((_,i)=>({actorId:randomUUID(),name:'Actor',spriteAssetId:used.assetId,slot:i?'right':'left',present:!i,locks:{presence:true,slot:true,outfit:true}}))};
 const saved=store.save(alice,p.projectId,{schemaVersion:1,expectedRevision:0,name:p.name,scene});
 await createBackup(path,join(root,'before'));assert.equal(inspectBackup(join(root,'before')).assets,6);
 const preview=()=>store.previewCleanup(alice,p.projectId);
 const body=(v=preview(),assetIds=[unused[0].assetId])=>({expectedRevision:v.revision,inventoryRevision:v.inventoryRevision,assetIds});
 const rows=()=>({projects:db.prepare('SELECT * FROM projects ORDER BY id').all(),assets:db.prepare('SELECT * FROM assets ORDER BY id').all()});
 return {root,path,get store(){return store;},db,p,q,foreign,used,unused,other,secret,saved,upload,preview,body,rows,restart(){store.close();store=openStore(path);}};
}
test('classification uses committed references, including shared background/sprites and distinct alternatives',async t=>{
 const f=await fixture(t),v=f.preview();assert.equal(v.revision,1);assert.equal(v.reclaimableBytes,3*png.length);
 assert.deepEqual(new Set(v.candidates.map(a=>a.assetId)),new Set(f.unused.map(a=>a.assetId)));
 assert.ok(v.candidates.every(a=>a.sha256.length===64&&a.width===1&&a.height===1&&a.byteCount===png.length));
 assert.match(v.warning,/Other tabs/);assert.equal(f.store.previewCleanup(alice,f.q.projectId).candidates.length,1);
 const empty=f.store.create(alice,{name:'Empty'});assert.deepEqual(f.store.previewCleanup(alice,empty.projectId).candidates,[]);
 const all=f.store.create(alice,{name:'All referenced'}),a=f.upload(all.projectId);
 f.store.save(alice,all.projectId,{schemaVersion:1,expectedRevision:0,name:all.name,scene:{backgroundAssetId:a.assetId,backgroundLocked:false,actors:[]}});
 assert.deepEqual(f.store.previewCleanup(alice,all.projectId).candidates,[]);
 refuses(()=>f.store.save(alice,f.p.projectId,{schemaVersion:1,expectedRevision:1,name:f.p.name,scene:{backgroundAssetId:randomUUID(),backgroundLocked:false,actors:[]}}),'ASSET_MISSING');
 assert.deepEqual(f.preview(),v);assert.deepEqual(f.store.load(alice,f.p.projectId),f.saved);
});
test('selected single/multiple deletion commits exact rows, preserves scene revision, export, backup and restart',async t=>{
 const f=await fixture(t),before=f.rows(),snapshot=await f.store.exportBundle(alice,f.p.projectId),v=f.preview();
 const one=f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v));assert.deepEqual(one,{projectId:f.p.projectId,revision:1,deletedIds:[f.unused[0].assetId],deletedCount:1,reclaimedBytes:png.length});
 assert.deepEqual(f.rows().assets,before.assets.filter(a=>a.id!==f.unused[0].assetId));assert.deepEqual(f.rows().projects,before.projects);
 const ids=f.unused.slice(1).map(a=>a.assetId),receipt=f.store.removeUnusedAssets(alice,f.p.projectId,f.body(f.preview(),ids));assert.equal(receipt.reclaimedBytes,2*png.length);
 assert.deepEqual(await f.store.exportBundle(alice,f.p.projectId),snapshot);assert.equal((await bundleJob('decode',snapshot)).assets.length,1);
 assert.deepEqual(f.store.load(alice,f.p.projectId),f.saved);assert.deepEqual(Buffer.from(f.store.asset(alice,f.p.projectId,f.used.assetId).bytes),png);
 f.restart();assert.equal(f.preview().candidates.length,0);await createBackup(f.path,join(f.root,'after'));assert.equal(inspectBackup(join(f.root,'after')).assets,3);assert.equal(validateDatabase(f.path).assets,3);
 assert.equal(inspectBackup(join(f.root,'before')).assets,6);
});
test('ownership, strict bounded schema, forged/foreign/referenced/unknown IDs refuse without mutation',async t=>{
 const f=await fixture(t),v=f.preview(),before=f.rows();
 for(const id of [f.foreign.projectId,randomUUID(),'../secret','DROP TABLE assets'])refuses(()=>f.store.previewCleanup(alice,id),'NOT_FOUND');
 refuses(()=>f.store.previewCleanup(bob,f.p.projectId),'NOT_FOUND');
 refuses(()=>f.store.removeUnusedAssets(bob,f.p.projectId,f.body(v)),'NOT_FOUND');
 for(const id of [f.other.assetId,f.secret.assetId,randomUUID()])refuses(()=>f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v,[f.unused[0].assetId,id])),'ASSET_MISSING');
 refuses(()=>f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v,[f.used.assetId])),'ASSET_REFERENCED');
 for(const b of [{...f.body(v),owner:bob},{...f.body(v),path:'/tmp/secret'},{...f.body(v),inventoryRevision:'sql'},f.body(v,[]),f.body(v,[f.unused[0].assetId,f.unused[0].assetId]),f.body(v,Array(101).fill(randomUUID())),f.body(v,['../x']),{...f.body(v),expectedRevision:-1}])refuses(()=>f.store.removeUnusedAssets(alice,f.p.projectId,b),'INVALID_STATE');
 assert.deepEqual(f.rows(),before);
});
for(const change of ['save adds reference','upload','another cleanup','unrelated bundle import'])test('preview ordering: '+change,async t=>{
 const f=await fixture(t),v=f.preview();let code='CLEANUP_STALE';
 if(change==='save adds reference'){
  f.store.save(alice,f.p.projectId,{schemaVersion:1,expectedRevision:1,name:f.p.name,scene:{...f.saved.scene,backgroundAssetId:f.unused[0].assetId}});code='REVISION_CONFLICT';
 }else if(change==='upload')f.upload();
 else if(change==='another cleanup'){f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v));code='ASSET_MISSING';}
 else {await f.store.importBundle(alice,await f.store.exportBundle(alice,f.p.projectId));}
 const before=f.rows();
 if(change==='unrelated bundle import'){
  // A different project cannot change this project's inventory or references.
  assert.deepEqual(f.preview(),v);f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v));
 }else {refuses(()=>f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v)),code);assert.deepEqual(f.rows(),before);}
});
test('cleanup then stale draft save refuses missing artwork, subsequent import/export/backup serialize coherently',async t=>{
 const f=await fixture(t),v=f.preview(),draft={schemaVersion:1,expectedRevision:1,name:f.p.name,scene:{...f.saved.scene,backgroundAssetId:f.unused[0].assetId}};
 const importing=f.store.importBundle(alice,await f.store.exportBundle(alice,f.p.projectId));
 await assert.rejects(f.store.exportBundle(alice,f.p.projectId),e=>e.code==='BUNDLE_BUSY');
 await importing;
 const exporting=f.store.exportBundle(alice,f.p.projectId);
 f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v));const before=f.rows();
 refuses(()=>f.store.save(alice,f.p.projectId,draft),'ASSET_MISSING');assert.deepEqual(f.rows(),before);
 assert.equal((await bundleJob('decode',await exporting)).assets.length,1);await importing;
 const after=await createBackup(f.path,join(f.root,'serialized'));assert.equal(after.assets,6);assert.equal(f.preview().candidates.length,2);
});
for(const failure of ['before first delete','after first delete'])test('atomic SQLite rollback '+failure,async t=>{
 const f=await fixture(t),v=f.preview(),ids=f.unused.map(a=>a.assetId),before=f.rows();
 const target=ids[failure==='before first delete'?0:1];
 // Test-only trigger injected after startup. Production startup still rejects extra SQL objects.
 f.db.exec(`CREATE TRIGGER fail_delete BEFORE DELETE ON assets WHEN OLD.id='${target}' BEGIN SELECT RAISE(ABORT,'fixture private path'); END;`);
 assert.throws(()=>f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v,ids)));
 assert.deepEqual(f.rows(),before);f.db.exec('DROP TRIGGER fail_delete');assert.deepEqual(f.preview(),v);
});
for(const corrupt of ['bytes','digest','dimensions','missing reference'])test('corruption refuses entire preview/removal: '+corrupt,async t=>{
 const f=await fixture(t),v=f.preview();
 if(corrupt==='bytes')f.db.prepare('UPDATE assets SET bytes=? WHERE id=?').run(Buffer.from('bad'),f.unused[0].assetId);
 if(corrupt==='digest')f.db.prepare('UPDATE assets SET sha256=? WHERE id=?').run('0'.repeat(64),f.unused[0].assetId);
 if(corrupt==='dimensions')f.db.prepare('UPDATE assets SET width=2 WHERE id=?').run(f.unused[0].assetId);
 if(corrupt==='missing reference')f.db.prepare('DELETE FROM assets WHERE id=?').run(f.used.assetId);
 const before=f.rows();refuses(()=>f.preview(),'CORRUPT_ASSET');refuses(()=>f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v)),'CORRUPT_ASSET');assert.deepEqual(f.rows(),before);
});
test('logical quota recovery, freelist and file size are distinct',async t=>{
 const f=await fixture(t),limit=100*1024*1024;
 // Incompressible valid PNGs fill logical BLOB quota through the real uploader.
 const {randomFillSync}=await import('node:crypto');
 const image=new PNG({width:1000,height:1000});randomFillSync(image.data);
 const quotaProject=f.store.create(alice,{name:'Quota'});let count=0;
 while(true){try{image.data[0]=count;const unique=PNG.sync.write(image,{deflateLevel:0});f.store.importAsset(alice,quotaProject.projectId,unique);count++;}catch(e){assert.equal(e.code,'ASSET_QUOTA');break;}}
 assert.ok(count>20);await createBackup(f.path,join(f.root,'quota-before'));
 const used=()=>f.db.prepare('SELECT sum(length(bytes)) AS n FROM assets JOIN projects ON assets.project=projects.id WHERE owner=?').get(alice).n;
 const measure=()=>({logical:used(),fileBytes:statSync(f.path).size,freePages:f.db.prepare('PRAGMA freelist_count').get().freelist_count,pageSize:f.db.prepare('PRAGMA page_size').get().page_size});
 const before=measure(),v=f.store.previewCleanup(alice,quotaProject.projectId),ids=[v.candidates[0].assetId];assert.ok(before.logical<=limit);
 image.data[0]=count;const next=PNG.sync.write(image,{deflateLevel:0});
 refuses(()=>f.store.importAsset(alice,quotaProject.projectId,next),'ASSET_QUOTA');
 const result=f.store.removeUnusedAssets(alice,quotaProject.projectId,{expectedRevision:v.revision,inventoryRevision:v.inventoryRevision,assetIds:ids});const after=measure();
 assert.equal(before.logical-after.logical,result.reclaimedBytes);assert.ok(after.freePages>before.freePages);assert.equal(after.fileBytes,before.fileBytes);
 f.store.importAsset(alice,quotaProject.projectId,next);assert.equal(used(),before.logical);assert.equal(f.store.asset(alice,f.p.projectId,f.used.assetId).sha256,f.used.sha256);
 console.log('QUOTA_EVIDENCE '+JSON.stringify({before,after,receipt:result,afterUpload:measure()}));
});

for(const operation of ['save deleted reference','asset upload','portable export','database backup'])test('separate SQLite connection waits for cleanup transaction: '+operation,async t=>{
 const f=await fixture(t),v=f.preview();const {Worker}=await import('node:worker_threads');
 const shared=new SharedArrayBuffer(8),signal=new Int32Array(shared);
 const worker=new Worker(`(async()=>{
  const {parentPort,workerData}=await import('node:worker_threads');
  const {openStore}=await import(workerData.storeURL),{createBackup}=await import(workerData.recoveryURL);
  const store=openStore(workerData.path),s=new Int32Array(workerData.shared);Atomics.store(s,0,1);Atomics.notify(s,0);
  Atomics.wait(s,1,0,10000);Atomics.store(s,0,2);Atomics.notify(s,0);
  try {let value;
   if(workerData.operation==='save deleted reference')value=store.save(workerData.owner,workerData.id,workerData.draft);
   if(workerData.operation==='asset upload')value=store.importAsset(workerData.owner,workerData.id,Buffer.from(workerData.png));
   if(workerData.operation==='portable export')value=Array.from(await store.exportBundle(workerData.owner,workerData.id));
   if(workerData.operation==='database backup')value=await createBackup(workerData.path,workerData.destination);
   parentPort.postMessage({value});
  }catch(e){parentPort.postMessage({code:e.code||e.message});}finally{store.close();}
 })().catch(e=>{throw e;});`,{eval:true,workerData:{path:f.path,shared,operation,owner:alice,id:f.p.projectId,png,
 storeURL:new URL('../store.mjs',import.meta.url).href,recoveryURL:new URL('../recovery.mjs',import.meta.url).href,destination:join(f.root,'concurrent-backup'),
 draft:{schemaVersion:1,expectedRevision:1,name:f.p.name,scene:{...f.saved.scene,backgroundAssetId:f.unused[0].assetId}}}});
 t.after(()=>worker.terminate());const received=new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
 const deadline=Date.now()+10000;while(Atomics.load(signal,0)!==1 && Date.now()<deadline)Atomics.wait(signal,0,0,100);
 assert.equal(Atomics.load(signal,0),1);
 const exec=DatabaseSync.prototype.exec;let entered=false;
 DatabaseSync.prototype.exec=function(sql){const result=exec.call(this,sql);if(sql==='BEGIN IMMEDIATE'&&!entered){entered=true;Atomics.store(signal,1,1);Atomics.notify(signal,1);const until=Date.now()+5000;while(Atomics.load(signal,0)!==2&&Date.now()<until)Atomics.wait(signal,0,1,50);assert.equal(Atomics.load(signal,0),2);}return result;};
 try {f.store.removeUnusedAssets(alice,f.p.projectId,f.body(v));}finally{DatabaseSync.prototype.exec=exec;}
 const result=await received;assert.equal(entered,true);
 if(operation==='save deleted reference')assert.equal(result.code,'ASSET_MISSING');else assert.equal(result.code,undefined);
 if(operation==='portable export')assert.equal((await bundleJob('decode',Buffer.from(result.value))).assets.length,1);
 if(operation==='database backup')assert.ok([5,6].includes(inspectBackup(join(f.root,'concurrent-backup')).assets));
 assert.deepEqual(f.store.load(alice,f.p.projectId),f.saved);refuses(()=>f.store.asset(alice,f.p.projectId,f.unused[0].assetId),'NOT_FOUND');
});
