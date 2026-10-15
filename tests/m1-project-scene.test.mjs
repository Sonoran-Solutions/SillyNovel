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
