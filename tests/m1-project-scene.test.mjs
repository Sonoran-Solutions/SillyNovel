import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createProjectScene} from '../src/project-scene.mjs';
const initial=()=>({schemaVersion:1,projectId:randomUUID(),name:'Project',revision:0,scene:{backgroundAssetId:null,backgroundLocked:false,actors:[]}});
function setup(){let snapshot={sessionEpoch:1,sourceRevision:0,cursor:{sourceKey:'native-a',revision:0},owner:{scope:'character'}};return{actions:{getSnapshot:()=>snapshot,getSceneEvidence:()=>({snapshot})},switch:()=>{snapshot={...snapshot,sessionEpoch:2};}};}
test('global reducer preserves actor IDs and excludes native anchors and expressions',async()=>{
 const {actions}=setup(),record=initial();let saved;
 const model=await createProjectScene(record,{save:async(id,body)=>{saved=body;return{projectId:id,revision:1};}},actions,()=>{},()=>true);
 const key=await model.register('mira-a','Same name');await model.dispatch({type:'setSlot',characterKey:key,slot:'left'});
 await assert.rejects(model.dispatch({type:'clearExpression',characterKey:key}),/session-only/);
 await model.save();assert.equal(saved.scene.actors[0].actorId,key);assert.equal(saved.scene.actors[0].slot,'left');
 assert.deepEqual(Object.keys(saved).sort(),['expectedRevision','name','scene','schemaVersion']);assert.ok(!JSON.stringify(saved).includes('native-a'));
 const restored=await createProjectScene({...record,revision:1,scene:saved.scene},{},actions,()=>{},()=>true);
 assert.equal(restored.get().scene.view.cast[0].key,key);assert.equal(restored.get().scene.view.slots.left,key);model.dispose();restored.dispose();
});
test('save captures snapshot and keeps edits made during request dirty',async()=>{
 const {actions}=setup();let release,captured;
 const model=await createProjectScene(initial(),{save:(id,body)=>{captured=structuredClone(body);return new Promise(r=>release=()=>r({projectId:id,revision:1}));}},actions,()=>{},()=>true);
 await model.register('','Before');const pending=model.save();await model.register('','After');release();await pending;
 assert.equal(captured.scene.actors.length,1);assert.equal(model.get().scene.view.cast.length,2);assert.equal(model.status().dirty,true);assert.equal(model.status().revision,1);model.dispose();
});
test('late successful save cannot update detached model authority',async()=>{
 const context=setup();let release;
 const model=await createProjectScene(initial(),{save:id=>new Promise(r=>release=()=>r({projectId:id,revision:1}))},context.actions,()=>{},()=>true);
 await model.register('','Actor');const pending=model.save();context.switch();release();await pending;
 assert.equal(model.status().revision,0);assert.equal(await model.dispatch({type:'clearBackground'}),false);model.dispose();
});
test('locked neutral background survives save, reload and explicit reopen',async()=>{
 const {actions}=setup(),record=initial();let saved;
 const client={save:async(id,body)=>{saved=structuredClone(body.scene);return{projectId:id,revision:body.expectedRevision+1};}};
 const model=await createProjectScene(record,client,actions,()=>{},()=>true);
 await model.dispatch({type:'lock',field:'background'});await model.save();
 assert.equal(saved.backgroundAssetId,null);assert.equal(saved.backgroundLocked,true);
 const expected=structuredClone(saved);model.dispose();
 const reopened=await createProjectScene({...record,revision:1,scene:saved},client,actions,()=>{},()=>true);
 assert.equal(reopened.get().scene.view.backgroundLocked,true);await reopened.save();assert.deepEqual(saved,expected);reopened.dispose();
});
test('pending PNG import rejects concurrent edits and uploads, then attaches its committed asset',async()=>{
 const {actions}=setup();let release,uploads=0,saved;const assetId=randomUUID();
 const client={upload:()=>{uploads++;return new Promise(r=>release=()=>r({assetId}));},asset:async()=>({blob:new Blob(['png']),hash:'hash'}),save:async(id,body)=>{saved=body.scene;return{projectId:id,revision:1};}};
 const model=await createProjectScene(initial(),client,actions,()=>{},()=>true);
 const file=new Blob(['png'],{type:'image/png'}),pending=model.importFile(file,'background');
 assert.equal(model.status().importing,true);
 await assert.rejects(model.dispatch({type:'clearBackground'}),/Wait for/);
 await assert.rejects(model.register('','Another'),/Wait for/);
 await assert.rejects(model.importFile(file,'background'),/Wait for/);
 await model.save();assert.equal(saved,undefined);assert.equal(uploads,1);
 release();await pending;assert.equal(model.status().importing,false);await model.save();assert.equal(saved.backgroundAssetId,assetId);model.dispose();
});
test('failed PNG upload unlocks editing and preserves the existing scene',async()=>{
 const {actions}=setup();const model=await createProjectScene(initial(),{upload:async()=>{throw Error('UPLOAD_FAILED');}},actions,()=>{},()=>true);
 await assert.rejects(model.importFile(new Blob(['png'],{type:'image/png'}),'background'),/UPLOAD_FAILED/);
 assert.equal(model.status().importing,false);assert.equal(model.status().dirty,false);
 assert.equal(await model.dispatch({type:'lock',field:'background'}),true);model.dispose();
});

import {CLEANUP_WARNING} from '../plugins/sillynovel-storage/schema.mjs';
function unusedPreview(record,id=randomUUID()) {return {projectId:record.projectId,revision:record.revision,inventoryRevision:'a'.repeat(64),candidates:[{assetId:id,sha256:'b'.repeat(64),width:1,height:1,byteCount:3}],reclaimableBytes:3,warning:CLEANUP_WARNING};}
test('cleanup refuses dirty/pending saves/imports, explicit cancel does not mutate',async()=>{
 const {actions}=setup(),record=initial(),preview=unusedPreview(record);let previews=0,deletes=0,release;
 const client={previewCleanup:async()=>{previews++;return preview;},removeUnusedAssets:async()=>{deletes++;},save:id=>new Promise(r=>release=()=>r({projectId:id,revision:1}))};
 const model=await createProjectScene(record,client,actions,()=>{},()=>true);
 await model.reviewUnused();assert.equal(previews,1);await model.removeUnused([preview.candidates[0].assetId],text=>{assert.match(text,/1 unused.*3 logical bytes/);assert.match(text,/Other tabs/);return false;});assert.equal(deletes,0);
 await model.register('','Unsaved');await model.reviewUnused();assert.equal(previews,1);assert.equal(model.status().cleanupPreview,null);
 const pending=model.save();await model.reviewUnused();assert.equal(previews,1);release();await pending;model.dispose();
});
for(const operation of ['preview','remove'])for(const stale of ['chat switch','replacement','disable'])test('late cleanup '+operation+' ignores '+stale,async()=>{
 const context=setup(),record=initial(),preview=unusedPreview(record);let release,current=true;
 const client={previewCleanup:()=>operation==='preview'?new Promise(r=>release=()=>r(preview)):Promise.resolve(preview),removeUnusedAssets:()=>new Promise(r=>release=()=>r({deletedIds:[preview.candidates[0].assetId],deletedCount:1,reclaimedBytes:3}))};
 const model=await createProjectScene(record,client,context.actions,()=>{},()=>current);
 let pending;
 if(operation==='preview')pending=model.reviewUnused();else{await model.reviewUnused();pending=model.removeUnused([preview.candidates[0].assetId],()=>true);}
 if(stale==='chat switch')context.switch();else if(stale==='replacement')current=false;else model.dispose();
 const before=model.status();release();await pending;assert.equal(model.status().cleanupPreview,before.cleanupPreview);assert.equal(model.status().cleanupNotice,before.cleanupNotice);assert.equal(model.status().dirty,false);model.dispose();
});
test('confirmed cleanup evicts unused Blob/catalog entries and keeps saved scene/dirty state',async()=>{
 const {actions}=setup(),record=initial(),assetId=randomUUID();let scene,revision=0;
 const preview=unusedPreview(record,assetId);
 const client={upload:async()=>({assetId}),asset:async()=>({blob:new Blob(['png']),hash:'b'.repeat(64)}),save:async(id,body)=>{scene=body.scene;return{projectId:id,revision:++revision};},previewCleanup:async()=>({...preview,revision}),removeUnusedAssets:async()=>({deletedIds:[assetId],deletedCount:1,reclaimedBytes:3})};
 const model=await createProjectScene(record,client,actions,()=>{},()=>true);
 await model.importFile(new Blob(['png'],{type:'image/png'}),'background');await model.dispatch({type:'clearBackground'});await model.save();
 assert.equal(model.get().assets.length,1);await model.reviewUnused();const pending=model.removeUnused([assetId],()=>true);
 await assert.rejects(model.register('','Blocked'),/Wait for/);await pending;
 assert.equal(model.get().assets.length,0);assert.equal(model.get().media.size,0);assert.equal(model.status().dirty,false);assert.equal(model.status().revision,1);assert.equal(scene.backgroundAssetId,null);assert.match(model.status().cleanupNotice,/Cleanup completed/);model.dispose();
});
test('pending PNG upload blocks cleanup, and ASSET_MISSING save keeps edits for recovery',async()=>{
 const {actions}=setup(),record=initial();let release,previews=0;
 const client={upload:()=>new Promise(r=>release=()=>r({assetId:randomUUID()})),asset:async()=>({blob:new Blob(['png']),hash:'hash'}),previewCleanup:async()=>{previews++;},save:async()=>{throw Error('ASSET_MISSING');}};
 const model=await createProjectScene(record,client,actions,()=>{},()=>true),pending=model.importFile(new Blob(['png'],{type:'image/png'}),'background');
 await model.reviewUnused();assert.equal(previews,0);release();await pending;await model.save();assert.equal(model.status().dirty,true);assert.equal(model.status().revision,0);assert.match(model.get().notice,/Your edits remain here/);assert.equal(model.get().assets.length,1);model.dispose();
});

import {createProjectClient} from '../src/project-client.mjs';
test('cleanup client treats transport loss, malformed/proxy failures and wrong committed receipts as uncertain',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});const record=initial(),v=unusedPreview(record),id=v.candidates[0].assetId;
 const client=createProjectClient(()=>({'X-CSRF-Token':'fixture'}));
 for(const response of [()=>{throw Error('lost');},()=>new Response('gateway failure',{status:502}),()=>new Response('{}'),()=>Response.json({projectId:record.projectId,revision:0,deletedIds:[id,id],deletedCount:1,reclaimedBytes:3})]){
  globalThis.fetch=async()=>response();await assert.rejects(client.removeUnusedAssets(record.projectId,v,[id]),/CLEANUP_UNCERTAIN/);
 }
 globalThis.fetch=async()=>Response.json({code:'CLEANUP_STALE'},{status:409});await assert.rejects(client.removeUnusedAssets(record.projectId,v,[id]),/CLEANUP_STALE/);
 globalThis.fetch=async()=>Response.json({projectId:record.projectId,revision:0,deletedIds:[id],deletedCount:1,reclaimedBytes:3});assert.equal((await client.removeUnusedAssets(record.projectId,v,[id])).reclaimedBytes,3);
});
