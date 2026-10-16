import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {V1_SCHEMA_SQL} from '../../../plugins/sillynovel-storage/database-schema.mjs';
import {inspectBackup,DATABASE_NAME} from '../../../plugins/sillynovel-storage/recovery.mjs';
import {selectedCatalog} from '../../../plugins/sillynovel-storage/schema.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function runMigration({root,data,repo,stop,start,session,select,pass,evidence,projectId}) {
 await stop();
 const legacy=join(root,'v1-data'),target=join(root,'migrated-data'),backup=join(root,'preserved-v1-backup');
 async function provision(from,to){await mkdir(to,{mode:0o700});for(const name of await readdir(from))if(!name.startsWith(DATABASE_NAME))await cp(join(from,name),join(to,name),{recursive:true,errorOnExist:true,force:false});}
 async function nativeFiles(base){const result={};for(const account of ['default-user','sn-other'])for(const name of ['characters','chats','groups','group chats','worlds']){
  async function walk(path){let entries;try{entries=await readdir(path,{withFileTypes:true});}catch{return;}for(const e of entries){const p=join(path,e.name);if(e.isDirectory())await walk(p);else result[p.slice(base.length+1)]=hash(await readFile(p));}}await walk(join(base,account,name));}return result;}
 await provision(data,legacy);
 // Test-only construction of the actual old SQL format; never a runtime downgrade.
 const original=new DatabaseSync(join(data,DATABASE_NAME),{readOnly:true}),v1=new DatabaseSync(join(legacy,DATABASE_NAME));
 const projects=original.prepare('SELECT id,owner,name,revision,scene FROM projects ORDER BY id').all(),assets=original.prepare('SELECT * FROM assets ORDER BY id').all();
 v1.exec(V1_SCHEMA_SQL.join(';')+'; PRAGMA user_version=1;');for(const p of projects)v1.prepare('INSERT INTO projects VALUES (?,?,?,?,?)').run(p.id,p.owner,p.name,p.revision,p.scene);
 for(const a of assets)v1.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?)').run(a.id,a.project,a.sha256,a.width,a.height,a.bytes);v1.close();original.close();
 const database=join(legacy,DATABASE_NAME),before=hash(await readFile(database)),native=await nativeFiles(legacy);
 await start(true,legacy);const account=await session();assert.equal((await account.api('/capabilities','GET',undefined,503)).code,'MIGRATION_REQUIRED');
 const page=await account.context.newPage();await page.goto(account.origin);await page.locator('#sillynovel-stage').waitFor();await select(page,'Project A');await page.locator('.sillynovel-controls summary').click();
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('explicit v1 backup/migration'));
 assert.equal(await page.getByRole('button',{name:'Open project and use with this chat',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Register session actor',exact:true}).isEnabled(),true);
 await page.locator('#send_textarea').fill('Migration hold keeps native reply usable');assert.ok(await page.locator('.sillynovel-dialogue__message').innerText());await page.screenshot({path:join(root,'migration-required.png')});await page.locator('#send_textarea').fill('');await stop();
 assert.equal(hash(await readFile(database)),before);assert.deepEqual(await nativeFiles(legacy),native);
 pass('real v1 plugin startup refuses migration without changing database/native hashes; reader/composer/transient controls remain usable');
 const cli=join(repo,'plugins/sillynovel-storage/tools/recovery.mjs'),run=(...args)=>JSON.parse(execFileSync(process.execPath,[cli,...args],{encoding:'utf8'}));
 assert.equal(run('backup',database,backup).schemaVersion,1);const inspection=run('inspect',backup,'--data-root',legacy);assert.equal(inspection.accountBinding,'VERIFIED_SAME_ACCOUNT_INCARNATION');
 const preserved={};for(const name of ['snapshot.sqlite','manifest.json'])preserved[name]=hash(await readFile(join(backup,name)));
 await provision(legacy,target);const migrated=run('migrate',backup,join(target,DATABASE_NAME));assert.equal(migrated.code,'MIGRATED');assert.equal(migrated.schemaVersion,2);assert.equal(migrated.assets,assets.length);
 for(const [name,digest] of Object.entries(preserved))assert.equal(hash(await readFile(join(backup,name))),digest);assert.equal(hash(await readFile(database)),before);assert.deepEqual(await nativeFiles(target),native);
 pass('explicit operator CLI verifies preserved v1 backup and migrates only a new output; original/backup/native files remain unchanged');
 await start(true,target);const alice=await session(),bob=await session('sn-other');
 for(const p of projects){const owner=JSON.parse(p.owner)[0]==='default-user'?alice:bob,other=owner===alice?bob:alice;const got=await owner.api('/projects/'+p.id);assert.equal(got.revision,p.revision);assert.deepEqual(got.scene,JSON.parse(p.scene));assert.deepEqual(got.catalog,selectedCatalog(JSON.parse(p.scene)));await other.api('/projects/'+p.id,'GET',undefined,404);}
 for(const a of assets){const p=projects.find(p=>p.id===a.project),owner=JSON.parse(p.owner)[0]==='default-user'?alice:bob;const response=await owner.request('/api/plugins/sillynovel-storage/projects/'+a.project+'/assets/'+a.id);assert.equal(hash(await response.body()),a.sha256);}
 const reopened=await alice.context.newPage();await reopened.goto(alice.origin);await reopened.locator('#sillynovel-stage').waitFor();await select(reopened,'Project A');await reopened.locator('.sillynovel-controls summary').click();const project=projects.find(p=>p.id===projectId);assert.ok(project,'Original project UUID retained by migration');
 await reopened.getByLabel('Saved project',{exact:true}).selectOption(project.id);await reopened.getByRole('button',{name:'Open project and use with this chat',exact:true}).click();await reopened.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
 await reopened.waitForFunction(()=>[...document.querySelectorAll('.sillynovel-art img')].filter(e=>!e.hidden).every(e=>e.complete&&e.naturalWidth));await reopened.locator('.sillynovel-controls summary').click();await reopened.screenshot({path:join(root,'migration-reopened.png')});
 assert.deepEqual(await nativeFiles(target),native);assert.equal(hash(await readFile(database)),before);
 evidence.migration={sourceSchema:1,targetSchema:2,sourceSHA256:before,backup:inspectBackup(backup),backupHashes:preserved,receipt:migrated,projects:projects.length,assets:assets.length,nativeBefore:native,nativeAfter:await nativeFiles(target)};
 pass('migrated pinned host explicitly reopens original layout/locks, preserves all UUIDs/revisions/PNG bytes and two-account isolation');
 await stop();await start();
}
