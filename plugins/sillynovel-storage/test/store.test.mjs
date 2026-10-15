import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../store.mjs';
import { decodePNG, MAX_BYTES } from '../png.mjs';
// Paths from test/ to repository fixtures.
const png = name => readFileSync(new URL('../../../tests/fixtures/m12-stage/'+name+'.png',import.meta.url));
const refuses = (fn,code) => assert.throws(fn,e=>e.code===code);
test('owned projects, immutable PNGs, CAS, failed transaction and restart',()=> {
 const root=mkdtempSync(join(tmpdir(),'sn-store-')),path=join(root,'db.sqlite');let store=openStore(path);
 try {
  const p=store.create('alice',{name:'Test'}),q=store.create('bob',{name:'Other'});
  assert.deepEqual(store.list('alice').map(x=>x.projectId),[p.projectId]);
  for(const id of [q.projectId,randomUUID(),'../db'])refuses(()=>store.load('alice',id),'NOT_FOUND');
  refuses(()=>store.create('alice',{name:'x',owner:'bob'}),'INVALID_STATE');
  const images=['forest','mira-a','rowan'].map(name=>store.importAsset('alice',p.projectId,png(name)));
  const scene={backgroundAssetId:images[0].assetId,backgroundLocked:true,actors:images.slice(1).map((im,i)=>({actorId:randomUUID(),name:'Actor',spriteAssetId:im.assetId,slot:i?'right':'left',present:true,locks:{presence:true,slot:true,outfit:true}}))};
  const body={schemaVersion:1,expectedRevision:0,name:'Test',scene};
  const saved=store.save('alice',p.projectId,body);assert.equal(saved.revision,1);
  refuses(()=>store.save('alice',p.projectId,body),'REVISION_CONFLICT');
  refuses(()=>store.save('bob',p.projectId,{...body,expectedRevision:1}),'NOT_FOUND');
  refuses(()=>store.asset('bob',p.projectId,images[0].assetId),'NOT_FOUND');
  refuses(()=>store.asset('bob',q.projectId,images[0].assetId),'NOT_FOUND');
  for(const change of [{owner:'bob'},{path:'/tmp/nope'},{schemaVersion:2}])refuses(()=>store.save('alice',p.projectId,{...body,...change}),'INVALID_STATE');
  refuses(()=>store.save('alice',p.projectId,{...body,expectedRevision:1,scene:{...scene,cues:[]}}),'INVALID_STATE');
  const faildb=new DatabaseSync(path);
  faildb.exec("CREATE TRIGGER fail_update BEFORE UPDATE ON projects BEGIN SELECT RAISE(ABORT,'injected write failure'); END;");
  assert.throws(()=>store.save('alice',p.projectId,{...body,expectedRevision:1,name:'Lost'}));
  assert.deepEqual(store.load('alice',p.projectId),saved);
  for(let i=0;i<images.length;i++)assert.equal(store.asset('alice',p.projectId,images[i].assetId).sha256,images[i].sha256);
  faildb.exec('DROP TRIGGER fail_update');faildb.close();store.close();store=openStore(path);
  assert.deepEqual(store.load('alice',p.projectId),saved);
  assert.deepEqual(Buffer.from(store.asset('alice',p.projectId,images[0].assetId).bytes),png('forest'));
 } finally {store.close();rmSync(root,{recursive:true,force:true});}
});
test('PNG decode, CRC, unsupported formats and byte/dimension limits',()=>{
 assert.equal(decodePNG(png('forest')).width,1280);
 refuses(()=>decodePNG(Buffer.from('<svg/>')),'PNG_REQUIRED');
 refuses(()=>decodePNG(Buffer.alloc(MAX_BYTES+1)),'IMAGE_LIMIT');
 refuses(()=>decodePNG(png('oversized')),'IMAGE_LIMIT');
 const corrupt=Buffer.from(png('forest'));corrupt[45]^=255;
 assert.throws(()=>decodePNG(corrupt));
 const truncated=png('forest').subarray(0,100);assert.throws(()=>decodePNG(truncated));
});
test('unknown schema refuses without rewriting database',()=>{
 const root=mkdtempSync(join(tmpdir(),'sn-schema-')),path=join(root,'db.sqlite');
 const db=new DatabaseSync(path);db.exec('PRAGMA user_version=99');db.close();
 const prior=readFileSync(path);refuses(()=>openStore(path),'UNSUPPORTED_SCHEMA');assert.deepEqual(readFileSync(path),prior);rmSync(root,{recursive:true,force:true});
});
