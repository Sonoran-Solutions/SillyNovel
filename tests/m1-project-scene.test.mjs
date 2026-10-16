import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createProjectScene} from '../src/project-scene.mjs';
const initial=()=>({schemaVersion:2,catalog:[],projectId:randomUUID(),name:'Project',revision:0,scene:{backgroundAssetId:null,backgroundLocked:false,actors:[]}});
function setup(){let snapshot={sessionEpoch:1,sourceRevision:0,cursor:{sourceKey:'native-a',revision:0},owner:{scope:'character'}};return{actions:{getSnapshot:()=>snapshot,getSceneEvidence:()=>({snapshot})},switch:()=>{snapshot={...snapshot,sessionEpoch:2};}};}
test('global reducer preserves actor IDs and excludes native anchors and expressions',async()=>{
 const {actions}=setup(),record=initial();let saved;
 const model=await createProjectScene(record,{save:async(id,body)=>{saved=body;return{projectId:id,revision:1};}},actions,()=>{},()=>true);
 const key=await model.register('mira-a','Same name');await model.dispatch({type:'setSlot',characterKey:key,slot:'left'});
 await assert.rejects(model.dispatch({type:'clearExpression',characterKey:key}),/session-only/);
 await model.save();assert.equal(saved.scene.actors[0].actorId,key);assert.equal(saved.scene.actors[0].slot,'left');
 assert.deepEqual(Object.keys(saved).sort(),['catalog','expectedRevision','name','scene','schemaVersion']);assert.ok(!JSON.stringify(saved).includes('native-a'));
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
 await model.importFile(new Blob(['png'],{type:'image/png'}),'background');await model.dispatch({type:'clearBackground'});await model.unregisterAsset(assetId,()=>true);await model.save();
 assert.equal(model.get().assets.length,0);await model.reviewUnused();const pending=model.removeUnused([assetId],()=>true);
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

test('project library reopens all alternatives, preserves UUIDs/labels and restricts actor compatibility',async()=>{
 const {actions}=setup();let record=initial();const files=new Map();let uploads=0;
 const client={upload:async(id,file)=>{uploads++;const assetId=randomUUID();files.set(assetId,file);return{assetId};},asset:async(id,asset)=>({blob:files.get(asset),hash:'b'.repeat(64)}),save:async(id,body)=>{record={...record,...structuredClone(body),revision:body.expectedRevision+1};return record;}};
 let model=await createProjectScene(record,client,actions,()=>{},()=>true);
 const key=await model.register('','Actor'),other=await model.register('','Same name');
 const file=new Blob(['png'],{type:'image/png'});
 for(const kind of ['background','background','outfit','outfit'])await model.importFile(file,kind,key,'Duplicate label');
 await model.dispatch({type:'setSlot',characterKey:key,slot:'left'});await model.dispatch({type:'lock',field:'outfit',characterKey:key});await model.save();
 const saved=structuredClone(record);model.dispose();model=await createProjectScene(record,client,actions,()=>{},()=>true);
 assert.equal(model.get().assets.length,4);assert.equal(model.status().dirty,false);
 for(const asset of model.get().assets){
  assert.equal(model.get().media.get(asset.id).label,'Duplicate label');
  await model.dispatch({type:asset.kind==='background'?'setBackground':'setOutfit',assetId:asset.id,...(asset.kind==='background'?{}:{characterKey:key})});
 }
 assert.equal(uploads,4);assert.equal(model.get().scene.view.slots.left,key);assert.equal(model.get().scene.view.cast.find(a=>a.key===key).locks.outfit,true);
 const sprite=model.get().assets.find(a=>a.kind==='outfit');await assert.rejects(model.dispatch({type:'setOutfit',assetId:sprite.id,characterKey:other}));
 await model.renameAsset(sprite.id,'Recognizable sprite');await model.save();assert.equal(record.catalog.find(a=>a.assetId===model.get().media.get(sprite.id).assetId).label,'Recognizable sprite');
 assert.deepEqual(record.catalog.map(a=>a.assetId),saved.catalog.map(a=>a.assetId));model.dispose();
});
for(const change of ['switch','replacement','dispose'])test('late PNG library upload cannot attach after '+change,async()=>{
 const context=setup();let release,current=true,reads=0;
 const model=await createProjectScene(initial(),{upload:()=>new Promise(r=>release=()=>r({assetId:randomUUID()})),asset:async()=>{reads++;return{blob:new Blob(['png']),hash:'hash'};}},context.actions,()=>{},()=>current);
 const pending=model.importFile(new Blob(['png'],{type:'image/png'}),'background',undefined,'Late');
 if(change==='switch')context.switch();else if(change==='replacement')current=false;else model.dispose();release();await pending;
 assert.equal(reads,0);assert.equal(model.get().assets.length,0);assert.equal(model.status().dirty,false);model.dispose();
});
test('missing catalog art remains a selectable neutral alternative; invalid imports and failed catalog save preserve state',async()=>{
 const {actions}=setup(),record=initial(),id=randomUUID();record.catalog=[{assetId:id,label:'Unavailable',kind:'background',actorId:null}];
 const model=await createProjectScene(record,{asset:async()=>{throw Error('CORRUPT_ASSET');},save:async()=>{throw Error('REVISION_CONFLICT');}},actions,()=>{},()=>true);
 assert.equal(model.get().assets[0].available,false);await model.dispatch({type:'setBackground',assetId:id});assert.notEqual(model.get().scene.view.background.status,'ready');
 await assert.rejects(model.importFile(new Blob(['x'],{type:'image/png'}),'expression'),/background or actor/);
 await model.renameAsset(id,'Retained label');await model.save();assert.equal(model.status().dirty,true);assert.equal(model.status().revision,0);assert.equal(model.get().media.get(id).label,'Retained label');
 await assert.rejects(model.unregisterAsset(id,()=>true),/different artwork/);await model.dispatch({type:'clearBackground'});await model.unregisterAsset(id,()=>false);assert.equal(model.get().assets.length,1);await model.unregisterAsset(id,()=>true);assert.equal(model.get().assets.length,0);model.dispose();
});

for(const code of ['REVISION_CONFLICT','SAVE_UNCERTAIN','INVALID_RECEIPT','ASSET_MISSING'])test('save recovery state retains edits: '+code,async()=>{
 const {actions}=setup();let calls=0;
 const model=await createProjectScene(initial(),{save:async()=>{calls++;throw Error(code);}},actions,()=>{},()=>true);
 await model.register('','Keep this actor');await model.save();
 const state=code==='REVISION_CONFLICT'?'conflict':code==='ASSET_MISSING'?'error':'uncertain';
 assert.equal(model.status().saveState,state);assert.equal(model.status().dirty,true);assert.equal(model.status().revision,0);
 await model.dispatch({type:'clearBackground'});assert.equal(model.status().saveState,state);
 if(state!=='error'){await model.save();await model.reviewUnused();assert.equal(calls,1);assert.equal(model.status().cleanupPreview,null);}
 assert.equal(model.get().scene.view.cast[0].label,'Keep this actor');model.dispose();
});
test('save client distinguishes lost receipts from definite server refusal',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});const client=createProjectClient(()=>({}));
 for(const response of [()=>{throw Error('offline');},()=>new Response('gateway',{status:502}),()=>new Response('invalid JSON')]){
  globalThis.fetch=async()=>response();await assert.rejects(client.save(randomUUID(),{}),/SAVE_UNCERTAIN/);
 }
 globalThis.fetch=async()=>Response.json({code:'REVISION_CONFLICT'},{status:409});await assert.rejects(client.save(randomUUID(),{}),/REVISION_CONFLICT/);
});
test('null, foreign and wrong-revision save receipts all require explicit reopen',async()=>{
 const {actions}=setup();
 for(const receipt of [null,{projectId:randomUUID(),revision:1},{revision:99}]){
  const model=await createProjectScene(initial(),{save:async()=>receipt},actions,()=>{},()=>true);
  await model.register('','Keep edits');await model.save();assert.equal(model.status().saveState,'uncertain');assert.equal(model.status().dirty,true);model.dispose();
 }
});
