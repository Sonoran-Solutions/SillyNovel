import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { PNG } from 'pngjs';
import { openStore } from '../store.mjs';
import { init,exit } from '../index.mjs';
import { validateDatabaseSchema } from '../database-schema.mjs';
import { createBackup,inspectBackup,restoreBackup,validateDatabase,DATABASE_NAME } from '../recovery.mjs';
import { digest } from '../png.mjs';
const owner='["alice",1]',foreign='["bob",2]',workflow='a'.repeat(64),payload='b'.repeat(64),review='Public synthetic review 🐈';
const pixel=new PNG({width:1,height:1});pixel.data.set([1,2,3,255]);const png=PNG.sync.write(pixel);
const refuses=(fn,code)=>assert.throws(fn,{code});
function fixture(t) {
 const root=mkdtempSync(join(tmpdir(),'sn-ledger-')),path=join(root,DATABASE_NAME);let store=openStore(path);
 const db=new DatabaseSync(path),p=store.create(owner,{name:'Ledger'}),project=p.projectId;
 t.after(()=>{db.close();store.close();rmSync(root,{recursive:true,force:true});});
 const begin=(tab='tab',extra={})=>store.beginImageSession(owner,project,{tab,workflowSha256:workflow,...extra});
 const request=(s,extra={})=>({sessionId:s.id,tab:s.tab,payloadSha256:payload,workflowSha256:workflow,review,settings:{width:512,seed:7},seedPolicy:'fixed',deadlineMs:120000,...extra});
 const reserve=(s,extra={})=>store.reserveImageJob(owner,project,request(s,extra));
 const move=(j,state,extra={},tab='tab')=>store.transitionImageJob(owner,project,j.id,{tab,state,...extra});
 return {root,path,db,project,p,get store(){return store;},begin,request,reserve,move,restart(){store.close();store=openStore(path);}};
}
// Frozen v2 SQL, rather than creating v3 and removing tables to simulate migration.
const v2SQL=[
 'CREATE TABLE projects (id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision >= 0), scene TEXT NOT NULL, catalog TEXT NOT NULL DEFAULT \'[]\')',
 'CREATE INDEX projects_owner ON projects(owner)',
 'CREATE TABLE assets (id TEXT PRIMARY KEY, project TEXT NOT NULL REFERENCES projects(id), sha256 TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, bytes BLOB NOT NULL)',
 'CREATE INDEX assets_project ON assets(project)',
];
function legacy(path) {
 const db=new DatabaseSync(path);db.exec(v2SQL.join(';')+';PRAGMA user_version=2;');
 for(const who of [owner,foreign]) {
  const id=randomUUID(),asset=randomUUID();
  db.prepare('INSERT INTO projects VALUES (?,?,?,?,?,?)').run(id,who,'Unchanged',7,' {"backgroundAssetId":null,"backgroundLocked":true,"actors":[]} ',JSON.stringify([{assetId:asset,label:'Keep bytes',kind:'background',actorId:null}],null,2));
  db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?)').run(asset,id,digest(png),1,1,png);
 }
 const rows={projects:db.prepare('SELECT * FROM projects ORDER BY id').all(),assets:db.prepare('SELECT * FROM assets ORDER BY id').all()};db.close();return rows;
}
test('fresh v3 and real v2 migration preserve every project/catalog/asset byte',t=>{
 const f=fixture(t);assert.equal(validateDatabaseSchema(f.db),3);assert.equal(f.db.prepare('PRAGMA user_version').get().user_version,3);
 assert.deepEqual(f.db.prepare('PRAGMA foreign_key_list(image_jobs)').all().map(r=>r.table).sort(),['image_sessions','projects']);
 const path=join(f.root,'v2'),before=legacy(path),s=openStore(path);s.close();const db=new DatabaseSync(path);
 assert.equal(validateDatabaseSchema(db),3);assert.deepEqual(db.prepare('SELECT * FROM projects ORDER BY id').all(),before.projects);assert.deepEqual(db.prepare('SELECT * FROM assets ORDER BY id').all(),before.assets);
 assert.equal(db.prepare('SELECT count(*) AS n FROM image_jobs').get().n,0);db.close();
});
test('v2 additive migration failure rolls back the tables and version marker',t=>{
 const f=fixture(t),path=join(f.root,'v2');legacy(path);const bytes=readFileSync(path),exec=DatabaseSync.prototype.exec;
 DatabaseSync.prototype.exec=function(sql){const result=exec.call(this,sql);if(sql.includes('PRAGMA user_version=3'))throw Error('migration fault');return result;};
 try {assert.throws(()=>openStore(path),/migration fault/);}finally{DatabaseSync.prototype.exec=exec;}
 assert.deepEqual(readFileSync(path),bytes);const db=new DatabaseSync(path);assert.equal(validateDatabaseSchema(db,[2]),2);db.close();
});
test('leases report held/stale; takeover keeps identity/workflow/usage/jobs; holder heartbeat/end only',t=>{
 const f=fixture(t);assert.deepEqual(f.store.imageSession(owner,f.project),{session:null,jobs:[]});
 const s=f.begin(),j=f.reserve(s);assert.equal(s.allowance,5);assert.equal(s.used,0);
 assert.throws(()=>f.begin('peer'),e=>e.code==='LEASE_HELD' && e.status===409 && e.details.status==='held' && e.details.tab==='tab' && e.details.heartbeatAt===s.heartbeatAt);
 f.db.prepare('UPDATE image_sessions SET heartbeat_at=? WHERE owner=? AND id=?').run(Date.now()-90001,owner,s.id);
 assert.throws(()=>f.begin('peer'),e=>e.code==='LEASE_HELD' && e.details.status==='stale');
 const taken=f.begin('peer',{takeover:true,workflowSha256:'c'.repeat(64)});
 assert.equal(taken.id,s.id);assert.equal(taken.used,1);assert.equal(taken.allowance,5);assert.equal(taken.workflowSha256,workflow);assert.ok(taken.heartbeatAt>=s.heartbeatAt);
 assert.equal(f.store.imageSession(owner,f.project).jobs[0].id,j.id);
 for(const method of ['heartbeatImageSession','endImageSession'])refuses(()=>f.store[method](owner,f.project,{sessionId:s.id,tab:'tab'}),'LEASE_LOST');
 assert.equal(f.store.heartbeatImageSession(owner,f.project,{sessionId:s.id,tab:'peer'}).id,s.id);
 const ended=f.store.endImageSession(owner,f.project,{sessionId:s.id,tab:'peer'});assert.ok(ended.endedAt);
 assert.deepEqual(f.store.endImageSession(owner,f.project,{sessionId:s.id,tab:'peer'}),ended);
 refuses(()=>f.store.heartbeatImageSession(owner,f.project,{sessionId:s.id,tab:'peer'}),'LEASE_LOST');
 f.restart();assert.equal(f.store.imageSession(owner,f.project).session,null);assert.equal(f.store.imageSession(owner,f.project).jobs[0].state,'pending');
 const next=f.begin();assert.notEqual(next.id,s.id);assert.equal(next.used,0);refuses(()=>f.reserve(next),'IN_FLIGHT');
});
test('reserve refusals preserve used; only successful reservations spend units, cleanup never refunds',t=>{
 const f=fixture(t),s=f.begin(),used=()=>f.store.imageSession(owner,f.project).session.used;
 refuses(()=>f.reserve(s,{tab:'peer'}),'LEASE_LOST');refuses(()=>f.reserve(s,{workflowSha256:'c'.repeat(64)}),'WORKFLOW_CHANGED');assert.equal(used(),0);
 for(const deadlineMs of [999,600001,1.5,'1000'])refuses(()=>f.reserve(s,{deadlineMs}),'INVALID_STATE');
 for(let i=0;i<5;i++) {
  const j=f.reserve(s,{deadlineMs:i?600000:1000});assert.equal(j.deadlineAt-j.submittedAt,i?600000:1000);assert.equal(used(),i+1);
  refuses(()=>f.reserve(s),'IN_FLIGHT');assert.equal(used(),i+1);f.move(j,'failed');
  f.store.cleanupImageJobs(owner,f.project,{jobIds:[j.id]});assert.equal(used(),i+1);
 }
 refuses(()=>f.reserve(s),'ALLOWANCE_EXHAUSTED');assert.equal(used(),5);
 f.restart();assert.equal(used(),5);assert.equal(f.begin('tab',{takeover:true}).used,5);
 f.store.endImageSession(owner,f.project,{sessionId:s.id,tab:'tab'});refuses(()=>f.reserve(s),'LEASE_LOST');assert.equal(f.begin().used,0);
});
test('project ledger ceiling and atomic insert/count rollback',t=>{
 const f=fixture(t),s=f.begin(),j=f.reserve(s);f.move(j,'failed');
 f.db.exec("CREATE TRIGGER fail_reserve BEFORE UPDATE OF used ON image_sessions BEGIN SELECT RAISE(ABORT,'count fault'); END");
 assert.throws(()=>f.reserve(s),/count fault/);assert.equal(f.store.imageJobs(owner,f.project).length,1);assert.equal(f.store.imageSession(owner,f.project).session.used,1);f.db.exec('DROP TRIGGER fail_reserve');
 f.db.exec('BEGIN');for(let i=1;i<500;i++)f.db.prepare('INSERT INTO image_jobs SELECT ?,session,owner,project,payload_sha256,workflow_sha256,review,settings,seed_policy,state,submitted_at,deadline_at,settled_at,host_path,result_sha256,asset,host_deleted_at FROM image_jobs WHERE owner=? AND id=?').run(randomUUID(),owner,j.id);f.db.exec('COMMIT');
 refuses(()=>f.reserve(s),'LEDGER_FULL');assert.equal(f.store.imageSession(owner,f.project).session.used,1);assert.equal(f.store.imageJobs(owner,f.project,{limit:'999'}).length,500);
});
// Explicit contract fixtures independent of the implementation's transition map.
const edges={pending:['candidate','failed','stale','cancelled','timeout-unknown'],cancelled:['stale','abandoned'],'timeout-unknown':['candidate','failed','stale','abandoned','unknown'],unknown:['reconciled','abandoned'],candidate:['imported','discarded'],reconciled:['imported','discarded']};
function reach(f,state) {
 const s=f.begin(),j=f.reserve(s);
 if(['candidate','cancelled','timeout-unknown'].includes(state))return f.move(j,state);
 if(['unknown','reconciled'].includes(state)){f.move(j,'timeout-unknown');const u=f.move(j,'unknown');return state==='unknown'?u:f.move(j,'reconciled');}
 return j;
}
for(const [from,targets]of Object.entries(edges))for(const to of targets)test('transition '+from+' → '+to,t=>{
 const f=fixture(t),j=reach(f,from),before=Date.now(),extra=to==='imported'?{assetId:f.store.importAsset(owner,f.project,png).assetId}:{};
 const value=f.move(j,to,extra);assert.equal(value.state,to);
 if(['pending','cancelled','timeout-unknown','unknown'].includes(to))assert.equal(value.settledAt,null);
 else if(j.settledAt!==null)assert.equal(value.settledAt,j.settledAt);
 else assert.ok(value.settledAt>=before && value.settledAt<=Date.now());
 assert.equal(f.store.imageSession(owner,f.project).session.used,1);
});
test('refused transitions, invalid fields and paths leave rows intact',t=>{
 const f=fixture(t),j=reach(f,'pending');
 for(const state of ['pending','imported','unknown','discarded','script'])refuses(()=>f.move(j,state),'INVALID_TRANSITION');
 for(const hostPath of ['/user/images/../x.png','/user/images/','/user/images/%2e/x.png','/user/images/a//x.png','/user/images/a\\x.png','//evil/user/images/x.png','https://evil/user/images/x.png','/user/images/x.jpg','/user/images/x.png?secret','/user/images/x.png#x',17,'/user/images/./x.png','/user/images/\nx.png'])refuses(()=>f.move(j,'candidate',{hostPath}),'INVALID_PATH');
 assert.deepEqual(f.store.imageJobs(owner,f.project)[0],j);
 const candidate=f.move(j,'candidate',{hostPath:'/user/images/sub/x.PNG',resultSha256:payload});
 refuses(()=>f.move(candidate,'imported'),'INVALID_STATE');
 const other=f.store.create(foreign,{name:'Other'}),a=f.store.importAsset(foreign,other.projectId,png);
 refuses(()=>f.move(candidate,'imported',{assetId:a.assetId}),'NOT_FOUND');
 refuses(()=>f.move(candidate,'discarded',{assetId:a.assetId}),'INVALID_TRANSITION');
 const discarded=f.move(candidate,'discarded');assert.equal(discarded.hostPath,'/user/images/sub/x.PNG');refuses(()=>f.move(discarded,'candidate'),'INVALID_TRANSITION');
});
test('unresolved jobs require their holder; unknown and reconciled can be resolved by a new session',t=>{
 const f=fixture(t),s=f.begin(),j=f.reserve(s);
 for(const [state,next]of [['pending','cancelled'],['cancelled','stale']]) {
  refuses(()=>f.move(j,next,{},'peer'),'LEASE_LOST');
  if(state==='pending')f.move(j,'cancelled');
 }
 f.begin('peer',{takeover:true});refuses(()=>f.move(j,'abandoned'),'LEASE_LOST');f.move(j,'abandoned',{},'peer');
 f.store.endImageSession(owner,f.project,{sessionId:s.id,tab:'peer'});
 const second=f.begin(),k=f.reserve(second);f.move(k,'timeout-unknown');refuses(()=>f.move(k,'unknown',{},'peer'),'LEASE_LOST');f.move(k,'unknown');
 f.store.endImageSession(owner,f.project,{sessionId:second.id,tab:'tab'});f.begin('recovery');
 refuses(()=>f.move(k,'reconciled'),'LEASE_LOST');assert.equal(f.move(k,'reconciled',{},'recovery').state,'reconciled');
 assert.equal(f.move(k,'imported',{assetId:f.store.importAsset(owner,f.project,png).assetId},'recovery').state,'imported');
});
test('cache, newest ordering, host deletion, cleanup and soft asset reference',t=>{
 const f=fixture(t),s=f.begin(),a=f.store.importAsset(owner,f.project,png),j=f.reserve(s);
 f.move(j,'candidate',{hostPath:'/user/images/x.png',resultSha256:digest(png)});f.move(j,'imported',{assetId:a.assetId});
 const newer=f.reserve(s);f.move(newer,'candidate');f.move(newer,'imported',{assetId:a.assetId});
 assert.deepEqual(f.store.imageCache(owner,f.project,{payload}).map(r=>r.id),[newer.id,j.id]);assert.equal(f.store.imageJobs(owner,f.project,{limit:'1'})[0].id,newer.id);
 assert.equal(f.store.imageCache(owner,f.project,{payload:'c'.repeat(64)}).length,0);
 for(const limit of ['0','-1','wat',['1'],'1.5'])refuses(()=>f.store.imageJobs(owner,f.project,{limit}),'INVALID_STATE');
 const deleted=f.store.imageHostDeleted(owner,f.project,j.id,{});assert.ok(deleted.hostDeletedAt);assert.deepEqual(f.store.imageHostDeleted(owner,f.project,j.id,{}),deleted);
 refuses(()=>f.store.imageHostDeleted(owner,f.project,newer.id,{}),'INVALID_TRANSITION');
 const pending=f.reserve(s);refuses(()=>f.store.imageHostDeleted(owner,f.project,pending.id,{}),'INVALID_TRANSITION');
 refuses(()=>f.store.cleanupImageJobs(owner,f.project,{jobIds:[j.id,pending.id]}),'UNRESOLVED_JOB');assert.equal(f.store.imageJobs(owner,f.project).length,3);
 const v=f.store.previewCleanup(owner,f.project);f.store.removeUnusedAssets(owner,f.project,{expectedRevision:v.revision,inventoryRevision:v.inventoryRevision,assetIds:[a.assetId]});
 refuses(()=>f.store.asset(owner,f.project,a.assetId),'NOT_FOUND');assert.equal(f.store.imageCache(owner,f.project,{payload}).length,2);assert.equal(validateDatabase(f.path).ledger[0].jobs,3); // Client catalog filtering decides a usable hit.
 f.store.cleanupImageJobs(owner,f.project,{jobIds:[j.id,newer.id]});assert.equal(f.store.imageSession(owner,f.project).session.used,3);
 const q=f.store.importAsset(owner,f.project,png);f.move(pending,'failed');f.store.cleanupImageJobs(owner,f.project,{jobIds:[pending.id]});assert.equal(f.store.asset(owner,f.project,q.assetId).sha256,digest(png));
});
for(const state of ['pending','cancelled','timeout-unknown','unknown','candidate','reconciled'])test('cleanup refuses nonterminal '+state,t=>{
 const f=fixture(t),j=reach(f,state);refuses(()=>f.store.cleanupImageJobs(owner,f.project,{jobIds:[j.id]}),'UNRESOLVED_JOB');
});
test('recovery v3 counts, masked inspection/CLI opt-in, restore and v2 compatibility',async t=>{
 const f=fixture(t),s=f.begin(),j=f.reserve(s);f.move(j,'failed');const backup=join(f.root,'backup');
 await createBackup(f.path,backup);const info=inspectBackup(backup);assert.equal(info.schemaVersion,3);assert.equal(info.ledger[0].sessions,1);assert.equal(info.ledger[0].jobs,1);assert.equal(info.ledger[0].rows[0].review,'[masked]');assert.equal(info.ledger[0].rows[0].reviewLength,review.length);
 assert.ok(!JSON.stringify(info).includes(review));assert.equal(inspectBackup(backup,undefined,{showReview:true}).ledger[0].rows[0].review,review);
 const cli=new URL('../tools/recovery.mjs',import.meta.url).pathname,run=args=>JSON.parse(execFileSync(process.execPath,[cli,...args],{stdio:['ignore','pipe','pipe'],encoding:'utf8',timeout:15000,maxBuffer:1024*1024}));
 assert.equal(run(['inspect',backup]).ledger[0].rows[0].review,'[masked]');assert.equal(run(['inspect',backup,'--show-review']).ledger[0].rows[0].review,review);
 const target=join(f.root,'target');mkdirSync(target,{mode:0o700});mkdirSync(join(target,'_storage'));writeFileSync(join(target,'_storage',digest('user:alice')),JSON.stringify({key:'user:alice',value:{handle:'alice',created:1}}));
 const restored=restoreBackup(backup,join(target,DATABASE_NAME));assert.equal(restored.ledger[0].jobs,1);const recovered=openStore(join(target,DATABASE_NAME));assert.deepEqual(recovered.imageJobs(owner,f.project),f.store.imageJobs(owner,f.project));recovered.close();
 const v2=join(f.root,'v2');legacy(v2);assert.equal(validateDatabase(v2).schemaVersion,2);const v2Backup=join(f.root,'v2-backup');await createBackup(v2,v2Backup);assert.equal(inspectBackup(v2Backup).schemaVersion,2);
 writeFileSync(join(target,'_storage',digest('user:bob')),JSON.stringify({key:'user:bob',value:{handle:'bob',created:2}}));rmSync(join(target,DATABASE_NAME));assert.equal(restoreBackup(v2Backup,join(target,DATABASE_NAME)).schemaVersion,2);
});
test('strict recovery rejects ledger corruption while missing soft assets are valid',t=>{
 const f=fixture(t),j=reach(f,'pending');
 for(const sql of ["UPDATE image_jobs SET state='invented'","UPDATE image_jobs SET settings='[]'","UPDATE image_jobs SET settings='{'","UPDATE image_jobs SET host_path='/user/images/../x.png'","UPDATE image_jobs SET owner='[\"bob\",2]'", "UPDATE image_jobs SET settled_at=submitted_at"]){
  f.db.exec('BEGIN');f.db.exec(sql); // Validate a standalone copy of the bad commit below.
  f.db.exec('COMMIT');refuses(()=>validateDatabase(f.path),'INVALID_IMAGE_LEDGER');
  f.db.prepare('UPDATE image_jobs SET state=?,settings=?,host_path=NULL,owner=?,settled_at=NULL WHERE id=?').run('pending',JSON.stringify(j.settings),owner,j.id);
 }
});
test('portable export/import excludes ledger, rejects injected rows and preserves the original ledger',async t=>{
 const f=fixture(t);reach(f,'unknown');const before=f.store.imageJobs(owner,f.project),bytes=await f.store.exportBundle(owner,f.project),manifest=JSON.parse(bytes);
 assert.deepEqual(Object.keys(manifest),['format','version','name','scene','assets']);assert.ok(!bytes.includes(Buffer.from(review)));
 const copy=await f.store.importBundle(owner,bytes);assert.deepEqual(f.store.imageSession(owner,copy.projectId),{session:null,jobs:[]});assert.deepEqual(f.store.imageJobs(owner,copy.projectId),[]);assert.deepEqual(f.store.imageJobs(owner,f.project),before);
 for(const key of ['image_sessions','image_jobs','ledger'])await assert.rejects(f.store.importBundle(owner,Buffer.from(JSON.stringify({...manifest,[key]:before}))),{code:'INVALID_BUNDLE'});
});

async function routes(t) {
 const f=fixture(t),registered=[],middleware=[];globalThis.DATA_ROOT=f.root;
 const router={use(fn){middleware.push(fn);}};for(const method of ['get','post','put'])router[method]=(path,fn)=>registered.push({method:method.toUpperCase(),path,fn});
 await init(router);t.after(()=>{exit();delete globalThis.DATA_ROOT;});
 const call=async(method,path,{body={},query={},who=owner,project=f.project,jobId=randomUUID(),headers={}}={})=>{
  const [handle,created]=JSON.parse(who),bytes=Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));
  const req=Readable.from([bytes]);Object.assign(req,{method,headers:{'content-type':'application/vnd.sillynovel+json','x-csrf-token':'x'.repeat(32),...headers},query,params:{id:project,jobId},session:{handle,csrfToken:'x'.repeat(32)},user:{profile:{handle,created}}});
  const res={statusCode:200,set(){return this;},status(code){this.statusCode=code;return this;},json(value){this.value=value;return this;}};
  for(const fn of middleware){let next=false;fn(req,res,()=>{next=true;});if(!next)return res;}
  await registered.find(r=>r.method===method && r.path==='/projects/:id/image/'+path).fn(req,res);return res;
 };
 return {...f,call};
}
test('every image route conceals foreign/unknown projects and records, enforces media type, strict keys and CSRF without sockets',async t=>{
 const f=await routes(t),s=f.begin(),j=f.reserve(s);
 const cases=[['GET','session',{}],['POST','session/begin',{tab:'tab',workflowSha256:workflow}],['POST','session/heartbeat',{sessionId:s.id,tab:'tab'}],['POST','session/end',{sessionId:s.id,tab:'tab'}],['POST','jobs',f.request(s)],['POST','jobs/:jobId',{tab:'tab',state:'failed'}],['POST','jobs/:jobId/host-deleted',{}],['GET','jobs',{}],['GET','cache',{}],['POST','jobs/cleanup',{jobIds:[j.id]}]];
 for(const [method,path,body]of cases) {
  for(const opt of [{who:foreign},{project:randomUUID()}])assert.deepEqual((await f.call(method,path,{body,jobId:j.id,query:path==='cache'?{payload}:{},...opt})).value,{code:'NOT_FOUND'});
  if(method==='POST'){
   assert.equal((await f.call(method,path,{body,jobId:j.id,headers:{'content-type':'application/json'}})).statusCode,415);
   assert.equal((await f.call(method,path,{body,jobId:j.id,headers:{'content-encoding':'gzip'}})).statusCode,415);
   assert.equal((await f.call(method,path,{body,jobId:j.id,headers:{'x-csrf-token':'bad'}})).statusCode,403);
   assert.equal((await f.call(method,path,{body:{...body,owner:foreign},jobId:j.id})).value.code,'INVALID_STATE');
   assert.equal((await f.call(method,path,{body:Buffer.alloc(32769,32),jobId:j.id})).statusCode,413);
  }
 }
 for(const path of ['jobs/:jobId','jobs/:jobId/host-deleted'])assert.equal((await f.call('POST',path,{body:path.endsWith('host-deleted')?{}:{tab:'tab',state:'failed'}})).value.code,'NOT_FOUND');
 const held=await f.call('POST','session/begin',{body:{tab:'other',workflowSha256:workflow}});assert.equal(held.statusCode,409);assert.equal(held.value.code,'LEASE_HELD');assert.equal(held.value.status,'held');assert.equal(held.value.tab,'tab');
 for(const path of ['session','jobs','cache'])assert.equal((await f.call('GET',path,{query:{payload,extra:'bad'}})).value.code,'INVALID_STATE');
 assert.equal((await f.call('POST','jobs',{body:Buffer.from('{')})).value.code,'INVALID_JSON');
 assert.equal((await f.call('GET','session')).value.jobs[0].id,j.id);
 const settled=await f.call('POST','jobs/:jobId',{body:{tab:'tab',state:'failed'},jobId:j.id});assert.equal(settled.statusCode,200);assert.equal(settled.value.state,'failed');
});

for(const state of ['pending','cancelled','timeout-unknown'])test('takeover revokes old holder for '+state,t=>{
 const f=fixture(t),j=reach(f,state);f.begin('peer',{takeover:true});const next=state==='pending'?'failed':'abandoned';
 refuses(()=>f.move(j,next),'LEASE_LOST');assert.equal(f.move(j,next,{},'peer').state,next);
});
for(const state of ['discarded','abandoned'])test('host deletion records '+state+' and never deletes a host file',t=>{
 const f=fixture(t),j=reach(f,state==='discarded'?'candidate':'cancelled');
 f.move(j,state,{hostPath:'/user/images/test.png'});assert.ok(f.store.imageHostDeleted(owner,f.project,j.id,{}).hostDeletedAt);
});
test('HTTP ledger happy path stamps times, reserves, lists, discards and cleans without sockets',async t=>{
 const f=await routes(t),call=f.call;
 const begin=await call('POST','session/begin',{body:{tab:'tab',workflowSha256:workflow}});assert.equal(begin.statusCode,200);const s=begin.value;
 assert.equal((await call('POST','session/heartbeat',{body:{sessionId:s.id,tab:'tab'}})).value.id,s.id);
 const reserved=await call('POST','jobs',{body:f.request(s)});assert.equal(reserved.statusCode,201);const j=reserved.value;assert.equal(j.deadlineAt-j.submittedAt,120000);
 assert.equal((await call('GET','jobs',{query:{limit:'1'}})).value[0].id,j.id);assert.deepEqual((await call('GET','cache',{query:{payload}})).value,[]);
 await call('POST','jobs/:jobId',{jobId:j.id,body:{tab:'tab',state:'candidate',hostPath:'/user/images/test.png'}});
 await call('POST','jobs/:jobId',{jobId:j.id,body:{tab:'tab',state:'discarded'}});
 assert.ok((await call('POST','jobs/:jobId/host-deleted',{jobId:j.id})).value.hostDeletedAt);
 assert.equal((await call('POST','jobs/cleanup',{body:{jobIds:[j.id]}})).value.deletedCount,1);
 assert.ok((await call('POST','session/end',{body:{sessionId:s.id,tab:'tab'}})).value.endedAt);
 assert.equal((await call('GET','session')).value.session,null);
});
