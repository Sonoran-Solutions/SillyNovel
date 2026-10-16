import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,cp,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createBackup,inspectBackup,restoreBackup,DATABASE_NAME} from '../../../plugins/sillynovel-storage/recovery.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function inventory(path){const db=new DatabaseSync(path,{readOnly:true});try{return {projects:db.prepare('SELECT * FROM projects ORDER BY id').all(),assets:db.prepare('SELECT id,project,sha256,width,height,length(bytes) AS byteLength,bytes FROM assets ORDER BY id').all().map(a=>({...a,bytes:hash(a.bytes)})),sqlite:db.prepare('SELECT sqlite_version() AS v').get().v,journal:db.prepare('PRAGMA journal_mode').get().journal_mode};}finally{db.close();}}
async function nativeFiles(root){const files={};for(const account of ['default-user','sn-other'])for(const kind of ['characters','chats','groups','group chats','worlds']){
 async function walk(path){let entries;try{entries=await readdir(path,{withFileTypes:true});}catch{return;}for(const entry of entries){const file=join(path,entry.name);if(entry.isDirectory())await walk(file);else files[file.slice(root.length+1)]=hash(await readFile(file));}}
 await walk(join(root,account,kind));}return files;}
export async function runRecovery({root,data,repo,stop,start,session,select,pass,evidence}){
 const source=join(data,DATABASE_NAME),backup=join(root,'recovery-backup'),target=join(root,'recovered-data');
 const before=await nativeFiles(data),rows=inventory(source),started=performance.now();
 const result=await createBackup(source,backup);assert.equal(inspectBackup(backup,data).accountBinding,'VERIFIED_SAME_ACCOUNT_INCARNATION');
 assert.deepEqual(inventory(source),rows);assert.deepEqual(await nativeFiles(data),before);
 const backupHashes={};for(const name of ['snapshot.sqlite','manifest.json'])backupHashes[name]=hash(await readFile(join(backup,name)));
 pass('online SQLite backup on running pinned host; verified counts, exact rows/PNG hashes and original native inventory');
 await stop();await mkdir(target,{mode:0o700});
 // Explicit disposable fixture provisioning, outside the recovery utility: retain
 // the same synthetic host accounts/native files, omit every SillyNovel DB file.
 for(const name of await readdir(data))if(!name.startsWith(DATABASE_NAME))await cp(join(data,name),join(target,name),{recursive:true,errorOnExist:true,force:false});
 const targetBefore=await nativeFiles(target);assert.deepEqual(targetBefore,before);
 const authBefore={};for(const name of await readdir(join(target,'_storage')))authBefore[name]=hash(await readFile(join(target,'_storage',name)));
 const restored=restoreBackup(backup,join(target,DATABASE_NAME));assert.equal(restored.code,'RESTORED');assert.deepEqual(inventory(join(target,DATABASE_NAME)),rows);
 for(const [name,digest]of Object.entries(authBefore))assert.equal(hash(await readFile(join(target,'_storage',name))),digest);
 for(const [name,digest]of Object.entries(backupHashes))assert.equal(hash(await readFile(join(backup,name))),digest);
 pass('offline empty-slot restore; exact project IDs/revisions/owners/actors/PNG rows, unchanged backup and host account files');
 await start(true,target);const alice=await session(),bob=await session('sn-other');
 const first=await alice.api('/projects'),second=await bob.api('/projects');assert.ok(first.length&&second.length);
 for(const p of first)await bob.api('/projects/'+p.projectId,'GET',undefined,404);
 for(const p of second)await alice.api('/projects/'+p.projectId,'GET',undefined,404);
 for(const p of rows.projects){const client=JSON.parse(p.owner)[0]==='default-user'?alice:bob;const got=await client.api('/projects/'+p.id);assert.equal(got.projectId,p.id);assert.equal(got.revision,p.revision);assert.deepEqual(got.scene,JSON.parse(p.scene));}
 for(const a of rows.assets){const p=rows.projects.find(p=>p.id===a.project),client=JSON.parse(p.owner)[0]==='default-user'?alice:bob;const response=await client.request('/api/plugins/sillynovel-storage/projects/'+a.project+'/assets/'+a.id);assert.equal(hash(await response.body()),a.bytes);}
 pass('restored pinned host serves every original project/PNG and retains two-account separation');
 const project=first.find(p=>p.name==='Browser project'),saved=await alice.api('/projects/'+project.projectId);
 const page=await alice.context.newPage();
 await page.goto(alice.origin);await page.locator('#sillynovel-stage').waitFor();await select(page,'Project A');
 assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);await page.locator('.sillynovel-controls summary').click();
 await page.getByLabel('Saved project',{exact:true}).selectOption(project.projectId);await page.getByRole('button',{name:'Open project and use with this chat',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
 await page.waitForFunction(()=>[...document.querySelectorAll('.sillynovel-art img')].filter(e=>!e.hidden).every(e=>e.complete&&e.naturalWidth));
 assert.deepEqual((await alice.api('/projects/'+project.projectId)).scene,saved.scene);
 await page.locator('.sillynovel-controls summary').click();const composer=page.locator('#send_textarea');await composer.fill('Recovery draft remains native');
 await page.getByRole('button',{name:'Backlog',exact:true}).click();await page.getByRole('button',{name:'Return to Reader',exact:true}).click();assert.equal(await composer.inputValue(),'Recovery draft remains native');assert.equal(await composer.isVisible(),true);
 assert.ok(await page.locator('.sillynovel-dialogue__message').innerText());await page.screenshot({path:join(root,'recovery-restored.png')});await composer.fill('');
 assert.deepEqual(await nativeFiles(target),targetBefore);assert.deepEqual(await nativeFiles(data),before);
 pass('explicit browser reopen renders original background/two sprites; native reader/composer/draft work; inventoried canonical files unchanged');
 await stop();await start(true,target);const reopened=await session();assert.deepEqual((await reopened.api('/projects/'+project.projectId)).scene,saved.scene);assert.deepEqual(inventory(join(target,DATABASE_NAME)),rows);
 assert.deepEqual(await nativeFiles(target),targetBefore);
 pass('restored installation restart preserves complete rows/ownership and native file inventory');
 const report={...result,elapsedMs:performance.now()-started,peakRSS:process.resourceUsage().maxRSS*1024,sourceRows:rows,restoredRows:inventory(join(target,DATABASE_NAME)),backupHashes,nativeBefore:before,nativeAfter:await nativeFiles(target),accountFilesBefore:authBefore,restoredDatabaseSHA256:hash(await readFile(join(target,DATABASE_NAME))),fixtureHashes:{}};
 for(const name of ['forest.png','mira-a.png','rowan.png'])report.fixtureHashes[name]=hash(await readFile(join(repo,'tests/fixtures/m12-stage',name)));
 evidence.recovery=report;await writeFile(join(root,'recovery.json'),JSON.stringify(report,null,2));
}
