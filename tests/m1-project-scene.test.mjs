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
