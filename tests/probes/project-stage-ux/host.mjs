import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function runStageUX({root,data,repo,page,alice,peer,project,field,button,select,canonical,pass,evidence}) {
 const accept=d=>d.accept();page.on('dialog',accept);
 async function connect(){
  const icon=page.locator('#API-status-top'),drawer=page.locator('#rm_api_block');
  if((await icon.getAttribute('class')).includes('closedIcon'))await icon.click();
  await drawer.waitFor({state:'visible'});await page.locator('#api_button_openai').click();await page.locator('#send_but').waitFor({state:'visible'});
  if((await drawer.getAttribute('class')).includes('openDrawer'))await icon.click();
  await drawer.waitFor({state:'hidden'});
 }
 await connect();
 await button('Detach project').click();assert.equal(await page.locator('.sillynovel-unsaved').getAttribute('data-state'),'session');
 // Named, invented lore/persona fixtures expand the native-file inventory.
 await mkdir(join(data,'default-user/worlds'),{recursive:true});await mkdir(join(data,'default-user/avatars'),{recursive:true});
 await writeFile(join(data,'default-user/worlds/stage-ux-fixture.json'),JSON.stringify({entries:{},name:'Synthetic stage lore'}));
 await writeFile(join(data,'default-user/avatars/stage-ux-persona.png'),await readFile(join(repo,'tests/fixtures/m12-stage/mira-a.png')));
 const baseline=await canonical();
 const connection=()=>page.evaluate(()=>{const c=SillyTavern.getContext();return JSON.stringify({main:c.mainApi,connection:c.extensionSettings?.connectionManager??null});});
 const connectionBefore=await connection();
 await field('Project name').fill('Manual stage UX');await button('Create project and use with this chat').click();
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Manual stage UX'));
 const entry=(await alice.api('/projects')).find(p=>p.name==='Manual stage UX'),keys=[];
 const get=()=>alice.api('/projects/'+entry.projectId);
 const waitState=state=>page.waitForFunction(s=>document.querySelector('.sillynovel-unsaved').dataset.state===s,state);
 const upload=async(kind,file,label)=>{
  const count=await field('Library artwork').locator('option').count();
  await field('Temporary image use').selectOption(kind);await field('PNG display label').fill(label);await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage',file+'.png'));
  await page.waitForFunction(n=>document.querySelector('[aria-label="Library artwork"]').options.length===n&&!document.querySelector('[aria-label="Project PNG file"]').disabled,count+1);
 };
 const place=async(key,slot,mode='move')=>{await field('Session actor').selectOption(key);await field('Position').selectOption(slot);await field('Occupied slot action').selectOption(mode);await button('Apply position').click();};
 for(const [i,name]of ['Mira','Mira','Rowan','Sage'].entries()){
  await field('Session actor name').fill(name);await button('Register project actor').click();keys.push(await field('Session actor').inputValue());
  await upload('outfit',['mira-a','mira-b','rowan','sage'][i],name+' art');
 }
 await upload('background','forest','Location');await upload('background','tavern','Location');
 await field('Session actor').selectOption(keys[0]);await upload('outfit','mira-a-coat','Coat');
 await place(keys[0],'left');await place(keys[1],'center');await place(keys[2],'right');
 assert.equal(await page.locator('.sillynovel-sprite:visible').count(),3);assert.match(await page.locator('.sillynovel-cast').innerText(),/Sage.*offstage/);
 await place(keys[3],'left');await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('SLOT_OCCUPIED'));
 assert.equal(await page.locator('.sillynovel-sprite--left').getAttribute('data-actor'),keys[0]);
 await place(keys[1],'left','swap');await place(keys[3],'right','replace');
 await field('Presence').selectOption('false');await button('Apply presence').click();assert.equal(await page.locator('.sillynovel-sprite:visible').count(),2);
 await field('Presence').selectOption('true');await button('Apply presence').click();
 for(const lock of ['background','presence','slot','outfit']){await field('Lock field').selectOption(lock);await button('Lock choice').click();await button('Release lock').click();await button('Lock choice').click();}
 await button('Save project').click();await waitState('saved');
 let saved=await get();assert.equal(saved.scene.actors.length,4);assert.equal(saved.catalog.length,7);
 const backgrounds=saved.catalog.filter(a=>a.kind==='background'),alternatives=saved.catalog.filter(a=>a.actorId===keys[0]);
 await field('Session actor').selectOption(keys[0]);await field('Outfit').selectOption(keys[0]+':'+alternatives[0].assetId);await button('Apply outfit').click();await waitState('dirty');await button('Save project').click();await waitState('saved');saved=await get();
 async function screenshots(phase){
  for(const [device,viewport]of [['desktop',{width:1440,height:1100}],['narrow',{width:390,height:800}]]){
   await page.setViewportSize(viewport);
   await page.locator('.sillynovel-controls').evaluate(e=>e.open=false);await page.screenshot({path:join(root,'stage-'+phase+'-'+device+'.png')});
   await page.locator('.sillynovel-controls summary').click();await page.getByRole('group',{name:'Scene',exact:true}).locator('legend').evaluate(e=>{e.scrollIntoView({block:'start'});e.closest('details').scrollTop-=52;});
   await page.screenshot({path:join(root,'stage-'+phase+'-'+device+'-controls.png')});
   assert.equal(await page.locator('#send_textarea').isVisible(),true);assert.ok((await page.locator('.sillynovel-dialogue').boundingBox()).height>60);
  }
  await page.setViewportSize({width:1440,height:1100});
 }
 await screenshots('before-reopen');
 pass('stage UI: session/create/four manual actors/two same-name labels/seven library alternatives/three slots/offstage/refuse/swap/replace/presence/outfit/locks/save/dirty/save');
 await page.reload();await page.locator('#sillynovel-stage').waitFor();await select(page,'Project A');await page.locator('.sillynovel-controls summary').click();
 assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);
 await field('Saved project').selectOption(entry.projectId);await button('Open project and use with this chat').click();await waitState('saved');await connect();
 assert.deepEqual((await get()).scene,saved.scene);assert.equal(await field('Library artwork').locator('option').count(),7);
 assert.equal(await page.locator('.sillynovel-sprite:visible').count(),3);await screenshots('after-reopen');
 await field('Session actor').selectOption(keys[0]);assert.equal(await field('Outfit').inputValue(),keys[0]+':'+alternatives[0].assetId);
 await field('Session actor').focus();await page.keyboard.press('Escape');assert.equal(await page.locator('.sillynovel-controls summary').evaluate(e=>e===document.activeElement),true);
 await page.locator('.sillynovel-controls summary').click();
 await field('Background').selectOption(backgrounds[0].assetId);await button('Apply background').click();await waitState('dirty');
 page.off('dialog',accept);page.once('dialog',d=>d.dismiss());await button('Discard and reopen attached project').click();await waitState('dirty');
 page.once('dialog',d=>d.accept());await button('Discard and reopen attached project').click();await waitState('saved');page.on('dialog',accept);
 pass('reload stays detached; explicit reopen restores arrangement/library; desktop/narrow controls and dialogue/composer; Escape focus; discard cancel/confirm');
 await peer.api('/projects/'+entry.projectId,'PUT',{schemaVersion:2,expectedRevision:saved.revision,name:saved.name,scene:saved.scene,catalog:saved.catalog});
 await field('Background').selectOption(backgrounds[0].assetId);await button('Apply background').click();await button('Save project').click();await waitState('conflict');
 assert.equal(await button('Save project').isDisabled(),true);assert.equal(await page.locator('#send_textarea').isEnabled(),true);
 await button('Discard and reopen attached project').click();await waitState('saved');
 // A real successful write with its receipt lost must be inspected, never retried.
 await page.route('**/api/plugins/sillynovel-storage/projects/'+entry.projectId,async route=>{if(route.request().method()!=='PUT')return route.continue();await route.fetch();await route.abort();});
 await field('Background').selectOption(backgrounds[0].assetId);await button('Apply background').click();await button('Save project').click();await waitState('uncertain');
 assert.equal(await button('Save project').isDisabled(),true);await page.unrouteAll({behavior:'wait'});
 await button('Discard and reopen attached project').click();await waitState('saved');saved=await get();assert.equal(saved.scene.backgroundAssetId,backgrounds[0].assetId);
 for(const name of ['Project B','Project A']){await select(page,name);assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached.*detached after a native conversation switch/);}
 assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);
 assert.deepEqual(await canonical(),baseline);assert.equal(await connection(),connectionBefore);
 evidence.stageUX={project:saved,nativeBefore:baseline,nativeAfter:await canonical(),connectionBeforeSha256:sha(connectionBefore),connectionAfterSha256:sha(await connection()),screenshots:['before-reopen','after-reopen'].flatMap(phase=>['desktop','narrow'].flatMap(device=>['','-controls'].map(suffix=>'stage-'+phase+'-'+device+suffix+'.png')))};
 pass('real stale-save conflict and lost committed receipt retain edits/block retry; A→B→A detaches; named native files and connection context unchanged');
 // Native user reply is an intentional host mutation, checked after the visual-only inventory.
 await connect();
 await page.locator('#send_textarea').fill('Synthetic stage UX native reply');await page.locator('#send_but').click();
 await page.waitForFunction(()=>SillyTavern.getContext().chat.some(m=>m.is_user&&m.mes==='Synthetic stage UX native reply'));
 await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.locator('#mes_stop').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.waitForTimeout(1500);
 assert.match(await page.locator('.sillynovel-dialogue').innerText(),/\S/);assert.equal(await page.locator('#send_textarea').isEnabled(),true);
 evidence.stageUX.nativeReplySent=true;pass('native send accepts a real user reply after stage failures and conversation switching');
 // Return the inherited runner to its saved two-actor project; no later milestone starts.
 await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();await waitState('saved');page.off('dialog',accept);
}
