import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function runLibrary({root,data,repo,page,alice,bob,peer,project,field,button,select,canonical,pass,evidence}) {
 const baseline=await canonical(),get=id=>alice.api('/projects/'+id),put=(who,p)=>who.api('/projects/'+p.projectId,'PUT',{schemaVersion:2,expectedRevision:p.revision,name:p.name,scene:p.scene,catalog:p.catalog});
 const waitSaved=rev=>page.waitForFunction(r=>document.querySelector('.sillynovel-project-status').textContent.includes('revision '+r)&&document.querySelector('.sillynovel-unsaved').textContent==='Saved project layout',rev);
 // Global dialog acceptance is confined to this synthetic disposable scenario.
 const accept=d=>d.accept();page.on('dialog',accept);
 await field('Project name').fill('Reusable library');await button('Create project and use with this chat').click();
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Reusable library'));
 await field('Session actor name').fill('Manual actor');await button('Register project actor').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cast').dataset.count==='1');
 const actor=await field('Session actor').inputValue();
 let imports=0;
 for(const [kind,name]of [['background','forest'],['background','tavern'],['outfit','mira-a'],['outfit','mira-b']]) {
  await field('PNG display label').fill('Same label');await field('Temporary image use').selectOption(kind);await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage',name+'.png'));imports++;
  await page.waitForFunction(n=>document.querySelector('[aria-label="Library artwork"]').options.length===n&&!document.querySelector('[aria-label="Project PNG file"]').disabled,imports);
 }
 await field('Position').selectOption('left');await button('Apply position').click();
 for(const lock of ['background','presence','slot','outfit']){await field('Lock field').selectOption(lock);await button('Lock choice').click();}
 await button('Save project').click();await waitSaved(1);
 const entry=(await alice.api('/projects')).find(p=>p.name==='Reusable library');let saved=await get(entry.projectId);assert.equal(saved.catalog.length,4);
 const png=await readFile(join(repo,'tests/fixtures/m12-stage/forest.png'));
 const reused=await Promise.all([alice,peer].map(who=>who.api('/projects/'+entry.projectId+'/assets','POST',png,201,'image/png')));
 assert.ok(reused.every(a=>a.assetId===saved.catalog[0].assetId));
 const bg=saved.catalog.filter(a=>a.kind==='background'),sprites=saved.catalog.filter(a=>a.kind==='sprite');
 assert.equal(new Set(saved.catalog.map(a=>a.assetId)).size,4);assert.ok(sprites.every(a=>a.actorId===actor));
 await bob.api('/projects/'+entry.projectId,'GET',undefined,404);
 evidence.library={initial:saved,artwork:[]};
 for(const [i,a]of saved.catalog.entries()){
  const r=await alice.request('/api/plugins/sillynovel-storage/projects/'+entry.projectId+'/assets/'+a.assetId),bytes=await r.body();
  assert.equal(hash(bytes),hash(await readFile(join(repo,'tests/fixtures/m12-stage',['forest','tavern','mira-a','mira-b'][i]+'.png'))));evidence.library.artwork.push({assetId:a.assetId,sha256:hash(bytes),bytes:bytes.length});
 }
 await button('Review unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-status').textContent.startsWith('0 unused'));
 assert.equal(await page.locator('.sillynovel-cleanup-list input').count(),0);
 await page.locator('#send_textarea').fill('Unchanged native draft');
 const nativeComposer=await page.locator('#send_textarea').evaluate(e=>{window.libraryComposer=e;e.setSelectionRange(3,12);return e.value;});
 await field('Library artwork').selectOption(bg[0].assetId);await field('Artwork label').fill('<b>Forest label</b>');await button('Save artwork label').click();
 assert.equal(await page.locator('.sillynovel-controls b').count(),0);
 await button('Save project').click();await waitSaved(2);
 assert.equal(await page.locator('#send_textarea').evaluate(e=>e===window.libraryComposer),true);assert.equal(await page.locator('#send_textarea').inputValue(),nativeComposer);
 saved=await get(entry.projectId);assert.equal(saved.catalog[0].label,'<b>Forest label</b>');
 await field('Temporary raster file').setInputFiles({name:'corrupt.png',mimeType:'image/png',buffer:Buffer.from('not PNG')});
 await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('PNG_REQUIRED'));assert.deepEqual(await get(entry.projectId),saved);
 assert.equal(await page.locator('#send_textarea').inputValue(),nativeComposer);await page.locator('#send_textarea').fill('');
 assert.deepEqual(await canonical(),baseline);
 pass('library controls: two backgrounds/two actor sprites, duplicate labels/UUIDs, inert label edit, saved unused protection, failed PNG and composer/native-file isolation');
 await page.reload();await page.locator('#sillynovel-stage').waitFor();await select(page,'Project A');await page.locator('.sillynovel-controls summary').click();
 assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project/);
 await field('Saved project').selectOption(entry.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('[aria-label="Library artwork"]').options.length===4);
 for(const a of bg){await field('Background').selectOption(a.assetId);await button('Apply background').click();await page.waitForFunction(id=>document.querySelector('.sillynovel-selected-art').textContent.includes(id),a.assetId);}
 assert.equal(await field('Outfit').locator('option').count(),3);
 for(const a of sprites){await field('Outfit').selectOption(actor+':'+a.assetId);await button('Apply outfit').click();await page.waitForFunction(id=>document.querySelector('.sillynovel-selected-art').textContent.includes(id),a.assetId);}
 await button('Save project').click();await waitSaved(3);saved=await get(entry.projectId);assert.equal(saved.catalog.length,4);assert.equal(saved.scene.actors[0].slot,'left');assert.ok(Object.values(saved.scene.actors[0].locks).every(Boolean));
 await button('Detach project').click();assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project/);
 await field('Saved project').selectOption(entry.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('[aria-label="Library artwork"]').options.length===4);
 await page.locator('.sillynovel-controls summary').click();await page.screenshot({path:join(root,'library-desktop.png')});
 await page.setViewportSize({width:390,height:800});await page.screenshot({path:join(root,'library-narrow.png')});
 assert.equal(await page.locator('#send_textarea').isVisible(),true);
 assert.ok(await page.locator('.sillynovel-dialogue').boundingBox());await page.locator('.sillynovel-controls summary').click();await field('Library artwork').scrollIntoViewIfNeeded();await page.screenshot({path:join(root,'library-controls-narrow.png')});assert.equal(await page.locator('#send_textarea').isVisible(),true);await page.locator('.sillynovel-controls summary').click();await page.setViewportSize({width:1440,height:1100});await page.locator('.sillynovel-controls summary').click();
 pass('real Chromium reload/detach/explicit reopen/reselect every alternative without import; positions/locks and desktop/narrow reader/composer remain usable');
 // A second independent project has no inherited actor/catalog, even with reused labels.
 await field('Project name').fill('Independent library');await button('Create project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Independent library'));
 assert.equal(await field('Library artwork').locator('option').count(),0);assert.equal(await field('Session actor').locator('option').count(),0);
 await field('Temporary image use').selectOption('background');await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage/forest.png'));await page.waitForFunction(()=>document.querySelector('[aria-label="Library artwork"]').options.length===1);
 await button('Save project').click();await waitSaved(1);const independent=(await alice.api('/projects')).find(p=>p.name==='Independent library');evidence.library.independent=await get(independent.projectId);assert.deepEqual(await get(entry.projectId),saved);
 await field('Saved project').selectOption(entry.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('[aria-label="Library artwork"]').options.length===4);
 await put(peer,saved);await field('Background').selectOption(bg[0].assetId);await button('Apply background').click();await button('Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.startsWith('Conflict:'));
 assert.match(await page.locator('.sillynovel-unsaved').innerText(),/Unsaved/);assert.equal((await get(entry.projectId)).revision,4);
 await button('Open project and use with this chat').click();await waitSaved(4);saved=await get(entry.projectId);
 pass('two independent project libraries and authenticated stale client conflict preserve committed catalog/selection and local dirty edits');
 // Complete upload on the server, then hold its receipt across a real native chat switch.
 let release,entered;const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r);
 await page.route('**/api/plugins/sillynovel-storage/projects/'+entry.projectId+'/assets',async route=>{const response=await route.fetch();entered();await gate;await route.fulfill({response});});
 await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage/rowan.png'));await seen;await select(page,'Project B');release();await page.waitForTimeout(150);await page.unrouteAll({behavior:'wait'});
 assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project/);assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);assert.deepEqual(await get(entry.projectId),saved);
 await select(page,'Project A');await field('Saved project').selectOption(entry.projectId);await button('Open project and use with this chat').click();await waitSaved(4);
 await button('Review unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-list input'));
 const stale=await alice.api('/projects/'+entry.projectId+'/unused-assets');assert.equal(stale.candidates.length,1);
 await alice.api('/projects/'+entry.projectId+'/assets','POST',await readFile(join(repo,'tests/fixtures/m12-stage/sage.png')),201,'image/png');
 await page.locator('.sillynovel-cleanup-list input').check();await button('Remove selected unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-status').textContent.includes('Preview expired'));
 assert.deepEqual(await get(entry.projectId),saved);
 // Deliberate unregister/save exposes only that alternative plus failed/late uploads.
 await field('Library artwork').selectOption(bg[0].assetId);await button('Remove artwork from library').click();await page.waitForFunction(()=>document.querySelector('[aria-label="Library artwork"]').options.length===3);
 await button('Save project').click();await waitSaved(5);await button('Review unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-list').querySelectorAll('input').length===3);
 await page.locator('.sillynovel-cleanup-list input[value="'+bg[0].assetId+'"]').check();await button('Remove selected unused artwork').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-cleanup-status').textContent.startsWith('Cleanup completed'));
 assert.equal((await get(entry.projectId)).catalog.length,3);await alice.request('/api/plugins/sillynovel-storage/projects/'+entry.projectId+'/assets/'+bg[0].assetId,'GET',undefined,404);
 pass('native switch abandons delayed PNG receipt; stale cleanup refuses; explicit unregister/save/selected cleanup removes only chosen alternative');
 const {createBackup,inspectBackup}=await import('../../../plugins/sillynovel-storage/recovery.mjs');
 const backup=join(root,'library-backup');await createBackup(join(data,'.sillynovel-projects.sqlite'),backup);assert.equal(inspectBackup(backup).schemaVersion,2);
 const bundle=JSON.parse(await(await alice.request('/api/plugins/sillynovel-storage/projects/'+entry.projectId+'/export')).body());assert.equal(bundle.version,1);assert.equal(bundle.assets.length,2);assert.equal(Object.hasOwn(bundle,'catalog'),false);
 evidence.library.final=await get(entry.projectId);evidence.library.cleanupStale=stale;evidence.library.backup=inspectBackup(backup);
 const db=new DatabaseSync(join(data,'.sillynovel-projects.sqlite'));evidence.library.inventory={projects:db.prepare('SELECT * FROM projects ORDER BY id').all(),assets:db.prepare('SELECT id,project,sha256,length(bytes) AS bytes FROM assets ORDER BY id').all()};db.close();
 assert.deepEqual(await canonical(),baseline);evidence.library.nativeBefore=baseline;evidence.library.nativeAfter=await canonical();
 await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);page.off('dialog',accept);
 pass('schema-v2 full backup validates all retained assets; portable v1 exports selected bytes only; named native hashes unchanged across library campaign');
}
