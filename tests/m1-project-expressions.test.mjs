import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createProjectScene} from '../src/project-scene.mjs';
import {createHostAdapter} from '../src/host-adapter.mjs';
import {createReaderSourceModel} from '../src/reader-source-model.mjs';
const bytes=await readFile(new URL('./fixtures/m12-stage/mira-a-joy.png',import.meta.url));
const file=()=>new Blob([bytes],{type:'image/png'});
const view=model=>model.get().scene.view;
async function setup(t,group=false){
 const previous=globalThis.Image;let decode=async()=>{};
 const dimensions=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 globalThis.Image=class {naturalWidth=dimensions.getUint32(16);naturalHeight=dimensions.getUint32(20);decode(){return decode();}};
 t.after(()=>{globalThis.Image=previous;});
 const context={chatId:'A',characterId:1,chat:[{name:'Mira',mes:'Equal text'},{name:'Mira',mes:'Equal text'},{name:'Mira',mes:'Later source'}]};
 if(group){context.groupId='G';context.groups=[{id:'G',name:'Group',chat_id:'A',members:['Mira.png','Mira1.png','Rowan.png','Sage.png']}];}
 const host=createHostAdapter(()=>context),reader=createReaderSourceModel();reader.activate(host.readHistory(),host.readChatIdentity());
 const refresh=()=>reader.apply({history:host.readHistory(),owner:host.readChatIdentity()});
 const actions={getSnapshot:reader.getSnapshot,getSceneEvidence:(fresh=true)=>({snapshot:fresh?refresh():reader.getSnapshot(),history:reader.getHistory()})};
 let evidenceReads=0;const originalEvidence=actions.getSceneEvidence;actions.getSceneEvidence=(...args)=>{evidenceReads++;return originalEvidence(...args);};
 const actor=randomUUID(),other=randomUUID(),sprite=randomUUID();let saved,uploads=0,current=true;
 const record={schemaVersion:2,projectId:randomUUID(),name:'Expressions',revision:7,catalog:[{assetId:sprite,kind:'sprite',actorId:actor,label:'Base outfit'}],scene:{backgroundAssetId:null,backgroundLocked:true,actors:[{actorId:actor,name:'Mira',present:true,slot:'left',spriteAssetId:sprite,locks:{presence:true,outfit:true,slot:true}},{actorId:other,name:'Mira',present:true,slot:'right',spriteAssetId:null,locks:{presence:true,outfit:false,slot:true}}]}};
 const client={asset:async()=>({blob:file(),hash:'a'.repeat(64)}),upload:async()=>{uploads++;},save:async(id,body)=>{saved=body;return{projectId:id,revision:body.expectedRevision+1};}};
 const model=await createProjectScene(record,client,actions,()=>{},()=>current);t.after(()=>model.dispose());
 const go=async index=>{refresh();reader.jumpToLatest();while(reader.getSnapshot().cursor.index>index)reader.navigate(-1);await model.sync();};
 const importExpression=async(key=actor,name='Happy')=>model.importExpression(file(),key,name);
 const apply=async(id,key=actor)=>model.dispatch({type:'setExpression',characterKey:key,assetId:id});
 return {model,record,actor,other,context,reader,go,importExpression,apply,get saved(){return saved;},get uploads(){return uploads;},get evidenceReads(){return evidenceReads;},decode:fn=>{decode=fn;},replace:()=>{current=false;},restore:()=>{current=true;}};
}
test('attached expressions are per source and UUID; revisit/clear preserve global outfits and save records',async t=>{
 const x=await setup(t),{model,actor,other}=x;const base=structuredClone(view(model)),revision=model.get().scene.revision;
 await x.go(0);const happy=await x.importExpression(),stern=await x.importExpression(actor,'Stern'),second=await x.importExpression(other,'Other Mira');await x.apply(happy);await x.apply(second,other);
 await x.go(1);assert.equal(view(model).cast[0].expression,null);await x.apply(stern);await x.go(0);
 assert.equal(view(model).cast[0].expression.id,happy);assert.equal(view(model).cast[1].expression.id,second);
 assert.equal(model.status().dirty,false);assert.equal(model.status().revision,7);assert.equal(model.get().scene.revision,revision);assert.equal(x.uploads,0);
 await model.save();assert.deepEqual(x.saved.scene,x.record.scene);assert.deepEqual(x.saved.catalog,x.record.catalog);assert.doesNotMatch(JSON.stringify(x.saved),/temporary-expression|prefixSha256|session-source|expression/);
 await model.dispatch({type:'clearExpression',characterKey:actor});assert.equal(view(model).cast[0].expression,null);assert.deepEqual(view(model).cast[0].outfit,base.cast[0].outfit);
 await x.go(1);assert.equal(view(model).cast[0].expression,null,'historical clear invalidates later decisions');
});
for(const group of [false,true])for(const change of ['edit','same-length','author','swipe','delete','insert','replace','reorder','older-prefix','continue','stream'])test((group?'group ':'')+'source suffix invalidation: '+change,async t=>{
 const x=await setup(t,group);await x.go(0);const id=await x.importExpression();await x.apply(id);await x.go(2);await x.apply(id);
 const old=x.context.chat[0];
 if(change==='edit')old.mes+=' edit';
 if(change==='same-length')old.mes='Other text';
 if(change==='author')old.name='Other';
 if(change==='swipe')old.swipe_id=1;
 if(change==='delete')x.context.chat.splice(0,1);
 if(change==='insert')x.context.chat.unshift({name:'You',is_user:true,mes:'Inserted'});
 if(change==='replace')x.context.chat[0]={...old};
 if(change==='reorder')x.context.chat.reverse();
 if(change==='older-prefix')old.mes+=' corrected before selected';
 if(change==='continue')x.context.chat[2].mes+=' continuation';
 if(change==='stream'){x.reader.apply({type:'generationStarted',generationType:'continue'});x.context.chat[2].mes+=' streamed';}
 await x.model.sync();assert.equal(view(x.model).cast[0].expression,null);assert.match(x.model.expressionStatus().notice,/invalidated/);
 await x.go(0);if(!['continue','stream'].includes(change))assert.equal(view(x.model).cast[0].expression,null);
});
test('compatibility refuses wrong UUID/outfit; failed art falls back; global locks stay intact',async t=>{
 const x=await setup(t);await x.go(0);const id=await x.importExpression();await assert.rejects(x.apply(id,x.other),/INCOMPATIBLE_ASSET/);await x.apply(id);
 x.model.expressionFailed(id);assert.equal(view(x.model).cast[0].expression.status,'missing');assert.ok(view(x.model).cast[0].outfit);await x.model.dispatch({type:'clearOutfit',characterKey:x.actor});await assert.rejects(x.apply(id),/INCOMPATIBLE_ASSET/);assert.equal(x.model.get().assets.some(a=>a.id===id),false);
});
for(const group of [false,true])for(const boundary of ['selection','selection-return','edit','swipe','outfit','outfit-return','chat','replace','detach','disable','dispose'])test((group?'group ':'')+'delayed decode cannot cross '+boundary,async t=>{
 const x=await setup(t,group);await x.go(0);let release,entered;const start=new Promise(r=>entered=r);x.decode(()=>{entered();return new Promise(r=>release=r);});
 const pending=x.importExpression();const rejected=assert.rejects(pending,/STALE_SOURCE/);await start;
 if(boundary.startsWith('selection')){await x.go(1);if(boundary==='selection-return')await x.go(0);}
 if(boundary==='edit')x.context.chat[0].mes+=' edit';
 if(boundary==='swipe')x.context.chat[0].swipe_id=2;
 if(boundary.startsWith('outfit')){await x.model.dispatch({type:'clearOutfit',characterKey:x.actor});if(boundary==='outfit-return')await x.model.dispatch({type:'setOutfit',characterKey:x.actor,assetId:x.actor+':'+x.record.scene.actors[0].spriteAssetId});}
 if(boundary==='chat'){x.context.chatId='B';await x.model.sync();x.context.chatId='A';await x.model.sync();}
 if(boundary==='replace')x.replace();
 if(['detach','disable','dispose'].includes(boundary))x.model.dispose();
 release();await rejected;assert.equal(x.model.get().assets.filter(a=>a.kind==='expression').length,0);assert.equal(x.model.status().dirty,boundary.startsWith('outfit'));
});
test('ambiguous history clears decisions and cannot resurrect; A B A resets attachment authority',async t=>{
 const x=await setup(t);await x.go(0);const id=await x.importExpression();await x.apply(id);
 x.context.chat.push(x.context.chat[0]);await x.model.sync();await assert.rejects(x.apply(id),/UNRESOLVED_SOURCE/);x.context.chat.pop();await x.go(0);assert.equal(view(x.model).cast[0].expression,null);
 x.context.chatId='B';await x.model.sync();x.context.chatId='A';await x.model.sync();assert.equal(await x.model.dispatch({type:'clearBackground'}),false);
});
test('generation end without completion proof refuses head; pinned older source remains usable',async t=>{
 const x=await setup(t);x.reader.apply({type:'generationStarted',generationType:'continue'});await x.model.sync();assert.equal(x.model.expressionStatus().ready,false);
 x.reader.apply({type:'generationEnded'});await x.model.sync();assert.equal(x.model.expressionStatus().ready,false);await x.go(0);assert.equal(x.model.expressionStatus().ready,true);
});
test('PNG content/type/animation/dimension limits refuse without upload or dirtying',async t=>{
 const x=await setup(t);for(const f of [new Blob([bytes],{type:'image/jpeg'}),new Blob(['not png'],{type:'image/png'}),new Blob([Buffer.alloc(5*1024*1024+1)],{type:'image/png'})])await assert.rejects(x.model.importExpression(f,x.actor,'Bad'));
 const animated=Buffer.from(bytes);animated.write('acTL',37,'ascii');await assert.rejects(x.model.importExpression(new Blob([animated],{type:'image/png'}),x.actor,'Animated'),/Animated/);
 const huge=Buffer.from(bytes);huge.writeUInt32BE(4097,16);await assert.rejects(x.model.importExpression(new Blob([huge],{type:'image/png'}),x.actor,'Huge'),/dimensions/);assert.equal(x.uploads,0);assert.equal(x.model.status().dirty,false);
});
test('temporary artwork count ceiling and URL release on invalidation/disposal',async t=>{
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL,live=new Set();URL.createObjectURL=b=>{const u=create(b);live.add(u);return u;};URL.revokeObjectURL=u=>{live.delete(u);revoke(u);};t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});
 const x=await setup(t);for(let i=0;i<32;i++)await x.importExpression(x.actor,'Choice '+i);assert.equal(live.size,33);await assert.rejects(x.importExpression(),/32 PNGs/);
 const id=x.model.get().assets.find(a=>a.kind==='expression').id;await x.apply(id);x.context.chat[2].mes+=' changed';await x.model.sync();assert.equal(live.size,32);x.model.dispose();assert.equal(live.size,0);
});
test('decision ceiling refuses atomically and an explicit historical clear releases journal capacity',async t=>{
 const x=await setup(t);for(let i=3;i<401;i++)x.context.chat.push({name:'Mira',mes:'Message '+i});await x.go(0);const id=await x.importExpression();
 const readsBefore=x.evidenceReads;
 for(let i=0;i<400;i++){if(i)x.reader.navigate(1);await x.apply(id);}x.reader.navigate(1);await assert.rejects(x.apply(id),/400 decisions/);assert.ok(x.evidenceReads-readsBefore<900,'canonical reads are bounded per operation, never per prefix entry');assert.equal(view(x.model).cast[0].expression,null);
 x.reader.navigate(-1);await x.model.dispatch({type:'clearExpression',characterKey:x.actor});x.reader.navigate(1);await x.apply(id);assert.equal(view(x.model).cast[0].expression.id,id);assert.equal(x.model.status().dirty,false);
});
test('a valid prior activation expression and its bytes never return after A B A',async t=>{
 const x=await setup(t);await x.go(0);const id=await x.importExpression();await x.apply(id);assert.ok(view(x.model).cast[0].expression);
 x.context.chatId='B';await x.model.sync();x.context.chatId='A';await x.model.sync();assert.equal(view(x.model).cast[0].expression,null);assert.equal(x.model.get().assets.filter(a=>a.kind==='expression').length,0);await assert.rejects(x.apply(id),/UNRESOLVED_SOURCE/);
});

test('a failed project replacement can resume the prior attachment expression authority',async t=>{
 const x=await setup(t);const id=await x.importExpression();await x.apply(id);x.replace();assert.equal(await x.model.sync(),false);x.restore();await x.model.sync();assert.equal(view(x.model).cast[0].expression.id,id);await x.model.dispatch({type:'clearExpression',characterKey:x.actor});assert.equal(view(x.model).cast[0].expression,null);
});


test('group four-actor manual cast and duplicate names stay independent from native speakers/membership',async t=>{
 const x=await setup(t,true),m=x.model;const base=structuredClone(view(m));
 const third=await m.register('','Rowan'),fourth=await m.register('','Sage');
 await m.dispatch({type:'setSlot',characterKey:third,slot:'center'});
 assert.equal(view(m).cast.length,4);assert.equal(view(m).cast.find(a=>a.key===fourth).slot,null);
 await assert.rejects(m.dispatch({type:'setSlot',characterKey:fourth,slot:'left'}),/SLOT_OCCUPIED/);
 await m.dispatch({type:'setSlot',characterKey:fourth,slot:'left',mode:'replace'});
 assert.equal(view(m).cast.find(a=>a.key===x.actor).slot,null);
 await m.dispatch({type:'setSlot',characterKey:fourth,slot:'right',mode:'swap'});
 await m.dispatch({type:'setPresence',characterKey:fourth,present:false});
 assert.equal(view(m).cast.find(a=>a.key===fourth).slot,'right');
 await m.dispatch({type:'setPresence',characterKey:fourth,present:true});
 await m.dispatch({type:'setSlot',characterKey:fourth,slot:null});
 assert.equal(view(m).cast.find(a=>a.key===fourth).present,true);
 await m.save();const saved=structuredClone(x.saved),layout=structuredClone(view(m));
 await x.go(0);const id=await x.importExpression();await x.apply(id);await x.go(1);await x.apply(id);await x.go(0);assert.equal(view(m).cast[0].expression.id,id);
 x.context.groups[0].members.reverse();x.context.characterId=3;await m.sync();assert.equal(view(m).cast[0].expression.id,id);
 assert.deepEqual(view(m).slots,layout.slots);assert.equal(m.status().dirty,false);
 await m.save();assert.deepEqual(x.saved.scene,saved.scene);assert.deepEqual(x.saved.catalog,saved.catalog);
 assert.equal(base.cast[0].label,base.cast[1].label);assert.notEqual(base.cast[0].key,base.cast[1].key);
 x.context.groups[0].chat_id='B';x.context.chatId='B';await m.sync();x.context.groups[0].chat_id='A';x.context.chatId='A';await m.sync();
 assert.equal(view(m).cast[0].expression,null);assert.equal(await m.dispatch({type:'clearBackground'}),false);
});
