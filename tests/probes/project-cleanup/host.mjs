import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID,randomFillSync} from 'node:crypto';
import {createBackup,inspectBackup,DATABASE_NAME} from '../../../plugins/sillynovel-storage/recovery.mjs';
import {PNG} from '../../../plugins/sillynovel-storage/node_modules/pngjs/lib/png.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
async function nativeFiles(data){const result={};for(const account of ['default-user','sn-other'])for(const kind of ['characters','chats','groups','group chats','worlds']){
 async function walk(path){let entries;try{entries=await readdir(path,{withFileTypes:true});}catch{return;}for(const e of entries){const path2=join(path,e.name);if(e.isDirectory())await walk(path2);else result[path2.slice(data.length+1)]=hash(await readFile(path2));}}
 await walk(join(data,account,kind));}return result;}
export async function runCleanup({root,data,repo,page,alice,bob,peer,project,saved,field,button,select,pass,evidence}){
 const path=join(data,DATABASE_NAME),db=new DatabaseSync(path);const beforeNative=await nativeFiles(data);
 const rows=()=>({projects:db.prepare('SELECT * FROM projects ORDER BY id').all(),assets:db.prepare('SELECT id,project,sha256,width,height,length(bytes) AS byteCount FROM assets ORDER BY id').all()});
 const report={before:rows(),nativeBefore:beforeNative,sqlite:db.prepare('SELECT sqlite_version() AS v').get().v};
 const api='/projects/'+project.projectId;
 const preview=()=>alice.api(api+'/unused-assets');
 const body=(v,ids=v.candidates.map(a=>a.assetId))=>({expectedRevision:v.revision,inventoryRevision:v.inventoryRevision,assetIds:ids});
 try {
  const backup=join(root,'cleanup-before');await createBackup(path,backup);assert.equal(inspectBackup(backup,data).code,'VALID_BACKUP');
  const v=await preview();report.preview=v;assert.equal(v.candidates.length,2);assert.ok(v.candidates.every(a=>![saved.scene.backgroundAssetId,...saved.scene.actors.map(a=>a.spriteAssetId)].includes(a.assetId)));
  await bob.api(api+'/unused-assets','GET',undefined,404);await bob.api(api+'/unused-assets/remove','POST',body(v),404);
  const before=rows();
  for(const changed of [{...body(v),owner:'sn-other'},body(v,[randomUUID()]),body(v,[saved.scene.backgroundAssetId]),body(v,['/tmp/evil']),body(v,['DROP TABLE assets']),body(v,[v.candidates[0].assetId,v.candidates[0].assetId])])await alice.api(api+'/unused-assets/remove','POST',changed,changed.assetIds[0]===saved.scene.backgroundAssetId||changed.assetIds[0]?.length===36&&changed.assetIds.length===1?409:400);
  const foreign=await bob.api('/projects','POST',{name:'Cleanup foreign'},201),foreignAsset=await bob.api('/projects/'+foreign.projectId+'/assets','POST',await readFile(join(repo,'tests/fixtures/m12-stage/mira-a.png')),201,'image/png');
  await alice.api(api+'/unused-assets/remove','POST',body(v,[foreignAsset.assetId]),409);
  const cs=alice.origin+'/api/plugins/sillynovel-storage'+api+'/unused-assets/remove';
  for(const token of [undefined,'invalid']){
   const response=await alice.context.request.post(cs,{headers:{'Content-Type':'application/vnd.sillynovel+json',...(token?{'X-CSRF-Token':token}:{})},data:JSON.stringify(body(v))});assert.equal(response.status(),403);
  }
  await alice.request('/api/plugins/sillynovel-storage'+api+'/unused-assets/remove','DELETE',undefined,404);
  await alice.request('/api/plugins/sillynovel-storage'+api+'/unused-assets/remove','POST',Buffer.from('{'),400);
  await alice.request('/api/plugins/sillynovel-storage'+api+'/unused-assets/remove','POST',Buffer.alloc(32769),413);
  // No tested refusal may remove any of the original rows.
  assert.deepEqual(rows().assets.filter(a=>a.project===project.projectId),before.assets.filter(a=>a.project===project.projectId));
  pass('cleanup authenticated preview, strict schema/body/method/CSRF and two-account/foreign-ID isolation');
  await button('Review unused artwork').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-cleanup-list input').length===2);
  await page.locator('.sillynovel-cleanup-list input').first().check();
  page.once('dialog',d=>{assert.match(d.message(),/Other tabs/);d.dismiss();});await button('Remove selected unused artwork').click();assert.deepEqual(rows().assets,before.assets.concat(rows().assets.filter(a=>a.project===foreign.projectId)).sort((a,b)=>a.id.localeCompare(b.id)));
  page.once('dialog',d=>d.accept());await button('Remove selected unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-status').textContent.includes('Cleanup completed'));
  const remaining=await preview();assert.equal(remaining.candidates.length,1);report.firstDeletion={deleted:v.candidates.filter(a=>!remaining.candidates.some(b=>b.assetId===a.assetId)),revision:(await alice.api(api)).revision};
  assert.equal(report.firstDeletion.revision,saved.revision);assert.deepEqual((await alice.api(api)).scene,saved.scene);
  for(const id of [saved.scene.backgroundAssetId,...saved.scene.actors.map(a=>a.spriteAssetId)]){const response=await alice.request('/api/plugins/sillynovel-storage'+api+'/assets/'+id);assert.equal(hash(await response.body()),before.assets.find(a=>a.id===id).sha256);}
  pass('browser review/select/cancel/confirm removes exact unused row; saved background/two sprites, IDs, locks, positions and revision preserved');
  // Changed inventory invalidates captured authorization even if the selected row survives.
  await peer.api(api+'/assets','POST',await readFile(join(repo,'tests/fixtures/m12-stage/rowan.png')),201,'image/png');
  const inventoryBefore=rows();const stale=await alice.api(api+'/unused-assets/remove','POST',body(remaining),409);assert.equal(stale.code,'CLEANUP_STALE');assert.deepEqual(rows(),inventoryBefore);
  // A failed transaction must roll back the first deletion before a later selected deletion fails.
  const faultPreview=await preview(),ids=faultPreview.candidates.map(a=>a.assetId),faultBefore=rows();
  db.exec(`CREATE TRIGGER fail_cleanup BEFORE DELETE ON assets WHEN OLD.id='${ids[1]}' BEGIN SELECT RAISE(ABORT,'fixture private database path'); END;`);
  const failed=await alice.api(api+'/unused-assets/remove','POST',body(faultPreview),503);assert.equal(failed.code,'STORAGE_UNAVAILABLE');assert.deepEqual(rows(),faultBefore);db.exec('DROP TRIGGER fail_cleanup');
  pass('second-client upload stales preview; injected SQLite failure after first delete rolls back whole selection without leaking error details');
  // Response loss after commit is tested by the real DB inventory, then stale draft CAS refusal.
  await button('Review unused artwork').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-cleanup-list input').length===2);
  await page.locator('.sillynovel-cleanup-list input').first().check();const doomed=(await preview()).candidates[0].assetId;
  await page.route('**/api/plugins/sillynovel-storage'+api+'/unused-assets/remove',async route=>{await route.fetch();await route.abort('failed');});
  page.once('dialog',d=>d.accept());await button('Remove selected unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-status').textContent.includes('outcome uncertain'));
  assert.ok(!rows().assets.some(a=>a.id===doomed));assert.deepEqual((await alice.api(api)).scene,saved.scene);await page.unrouteAll({behavior:'wait'});
  const unchanged=rows(),draft={schemaVersion:1,expectedRevision:saved.revision,name:saved.name,scene:{...saved.scene,backgroundAssetId:doomed}};
  const missing=await peer.api(api,'PUT',draft,409);assert.equal(missing.code,'ASSET_MISSING');assert.deepEqual(rows(),unchanged);
  pass('lost deletion response reports uncertainty despite committed removal; another unsaved draft receives ASSET_MISSING without changing scene');
  await button('Review unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-list input'));
  let entered,release;const seen=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  await page.route('**/api/plugins/sillynovel-storage'+api+'/unused-assets',async route=>{const response=await route.fetch();entered();await gate;await route.fulfill({response});});
  await button('Review unused artwork').click();await seen;await select(page,'Project B');release();await page.waitForTimeout(100);assert.doesNotMatch(await page.locator('.sillynovel-cleanup-status').innerText(),/unused artwork files/);await page.unrouteAll({behavior:'wait'});
  await select(page,'Project A');assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project/);await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
  await field('Session actor name').fill('Dirty cleanup keeper');await button('Register project actor').click();assert.equal(await button('Review unused artwork').isDisabled(),true);assert.equal(await page.locator('#send_textarea').isVisible(),true);
  page.once('dialog',d=>d.accept());await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').textContent==='Saved project layout');
  // Pending PNG refusal is visible and a reload discards only the in-memory draft.
  let uploadEntered,uploadRelease;const uploadSeen=new Promise(r=>uploadEntered=r),uploadGate=new Promise(r=>uploadRelease=r);
  await page.route('**/api/plugins/sillynovel-storage'+api+'/assets',async route=>{uploadEntered();await uploadGate;await route.continue();});
  await field('Temporary image use').selectOption('background');await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage/forest.png'));await uploadSeen;assert.equal(await button('Review unused artwork').isDisabled(),true);uploadRelease();await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.startsWith('Imported'));await page.unrouteAll({behavior:'wait'});
  page.once('dialog',d=>d.accept());await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').textContent==='Saved project layout');
  pass('real browser late preview cannot cross native A/B/A; dirty edits and pending PNG upload disable cleanup; explicit reopen preserves original saved layout');
  // Real HTTP quota fills with valid incompressible PNGs, no direct quota/row bypass.
  const quota=await alice.api('/projects','POST',{name:'Cleanup quota'},201),image=new PNG({width:1000,height:1000});randomFillSync(image.data);const large=PNG.sync.write(image,{deflateLevel:0});
  let uploaded=0;while(true){const response=await alice.context.request.post(alice.origin+'/api/plugins/sillynovel-storage/projects/'+quota.projectId+'/assets',{headers:{'X-CSRF-Token':alice.token,'Content-Type':'image/png'},data:large});if(response.status()===413){assert.equal((await response.json()).code,'ASSET_QUOTA');break;}assert.equal(response.status(),201);uploaded++;assert.ok(uploaded<30);}
  const measure=async()=>({logical:db.prepare('SELECT coalesce(sum(length(bytes)),0) AS n FROM assets JOIN projects ON assets.project=projects.id WHERE owner=(SELECT owner FROM projects WHERE id=?)').get(quota.projectId).n,fileBytes:(await stat(path)).size,freePages:db.prepare('PRAGMA freelist_count').get().freelist_count});
  await createBackup(path,join(root,'cleanup-quota-before'));assert.equal(inspectBackup(join(root,'cleanup-quota-before'),data).code,'VALID_BACKUP');
  const quotaBefore=await measure(),qv=await alice.api('/projects/'+quota.projectId+'/unused-assets');
  const receipt=await alice.api('/projects/'+quota.projectId+'/unused-assets/remove','POST',body(qv,[qv.candidates[0].assetId]));const quotaAfter=await measure();
  assert.equal(quotaBefore.logical-quotaAfter.logical,receipt.reclaimedBytes);assert.equal(quotaBefore.fileBytes,quotaAfter.fileBytes);assert.ok(quotaAfter.freePages>quotaBefore.freePages);
  await alice.api('/projects/'+quota.projectId+'/assets','POST',large,201,'image/png');report.quota={before:quotaBefore,after:quotaAfter,receipt,afterUpload:await measure()};
  pass('real HTTP ASSET_QUOTA refusal → explicit selected cleanup → exact logical recovery → successful upload; unchanged file bytes and increased freelist measured separately');
  const exported=await alice.request('/api/plugins/sillynovel-storage'+api+'/export');assert.equal(JSON.parse((await exported.body()).toString()).assets.length,3);
  await createBackup(path,join(root,'cleanup-after'));assert.equal(inspectBackup(join(root,'cleanup-after'),data).code,'VALID_BACKUP');
  report.after=rows();report.nativeAfter=await nativeFiles(data);assert.deepEqual(report.nativeAfter,beforeNative);assert.deepEqual((await alice.api(api)).scene,saved.scene);
  pass('post-cleanup portable export and verified database backup remain valid; named two-account native file inventory unchanged');
  const revisionBefore=saved.revision;
  await button('Save project').click();await page.waitForFunction(revision=>document.querySelector('.sillynovel-project-status').textContent.includes('revision '+revision),revisionBefore+1);
  const reloaded=await alice.api(api);assert.equal(reloaded.revision,revisionBefore+1);assert.deepEqual(reloaded.scene,saved.scene);Object.assign(saved,reloaded);
  await page.reload();await page.locator('#sillynovel-stage').waitFor();await select(page,'Project A');await page.locator('.sillynovel-controls summary').click();
  assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();
  await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
  await page.waitForFunction(()=>[...document.querySelectorAll('.sillynovel-art img')].filter(e=>!e.hidden).every(e=>e.complete&&e.naturalWidth));
  assert.deepEqual((await alice.api(api)).scene,saved.scene);report.revisions={beforeCleanup:revisionBefore,afterCleanup:report.firstDeletion.revision,afterSave:reloaded.revision};report.after=rows();
  report.nativeAfter=await nativeFiles(data);assert.deepEqual(report.nativeAfter,beforeNative);
  pass('original project saves after cleanup, reload stays detached, explicit reopen restores original artwork/actors/positions/locks and only save increments revision');
  await page.screenshot({path:join(root,'cleanup.png')});evidence.cleanup=report;await writeFile(join(root,'cleanup.json'),JSON.stringify(report,null,2));
 } finally {db.close();}
}
