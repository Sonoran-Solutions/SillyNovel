import assert from 'node:assert/strict';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
export async function runGroups({root,data,repo,page,alice,peer,project,field,button,select,canonical,pass,evidence}) {
 const accept=d=>d.accept();page.on('dialog',accept);const screenshots=[];
 const native=async(path,body)=>(await alice.request(path,'POST',body,200,'application/json'));
 const members=[];
 for(const [i,name]of ['Mira','Mira','Rowan','Sage'].entries())members.push(await(await native('/api/characters/create',{ch_name:name,description:'Synthetic distinct card '+i,first_mes:i<2?'Identical native greeting.':'Greeting from '+name})).text());
 assert.equal(new Set(members).size,4);
 const groups=[];
 for(const name of ['Group A','Group B'])groups.push(await(await native('/api/groups/create',{name,members,activation_strategy:1})).json());
 const [a,b]=groups;
 // Real cards and group records were created by the host APIs. Activation below clicks its actual group list.
 await page.reload();await page.locator('#sillynovel-stage').waitFor();
 async function group(id){
  const icon=page.locator('#rightNavDrawerIcon');if((await icon.getAttribute('class')).includes('closedIcon'))await icon.click();
  await page.locator('#right-nav-panel.openDrawer').waitFor({state:'visible'});
  if(!await page.locator('#rm_button_create').isVisible())await page.locator('#rm_button_characters').click();
  await page.locator('#rm_print_characters_block .group_select[data-grid="'+id+'"]').click();
  await page.waitForFunction(id=>String(SillyTavern.getContext().groupId)===id&&SillyTavern.getContext().chat.length>=4,id);
  await icon.click();await page.locator('#right-nav-panel').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('.sillynovel-native-context').textContent.includes('Native speaker:'));
 }
 await group(b.id);await group(a.id);
 await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);
 const cards=await page.evaluate(()=>SillyTavern.getContext().characters.filter(c=>['Mira','Rowan','Sage'].includes(c.name)).map(c=>({name:c.name,avatar:c.avatar})));
 assert.equal(cards.filter(c=>c.name==='Mira').length,2);
 const sources=await page.evaluate(()=>SillyTavern.getContext().chat.map(m=>({name:m.name,mes:m.mes,original_avatar:m.original_avatar})));
 assert.deepEqual(sources.map(m=>m.name),['Mira','Mira','Rowan','Sage']);assert.equal(sources[0].mes,sources[1].mes);
 assert.match(await page.locator('.sillynovel-native-context').innerText(),/Project actor selection is manual; no native card binding/);
 const contextDrawer=page.locator('#rightNavDrawerIcon');await contextDrawer.click();
 for(const [device,viewport]of [['desktop',{width:1440,height:1100}],['narrow',{width:390,height:800}]]){await page.setViewportSize(viewport);await page.locator('#rm_group_members .group_member').nth(3).scrollIntoViewIfNeeded();const file='group-native-members-'+device+'.png';await page.screenshot({path:join(root,file)});screenshots.push(file);}
 await contextDrawer.click();await page.setViewportSize({width:1440,height:1100});
 pass('groups: four actual native card API records, two Mira labels/distinct avatars, real group list activation and exact native greetings');
 const record=await alice.api('/projects','POST',{name:'Group manual cast'},201);
 // Refresh storage chooser using a reader reload, still requiring explicit group activation and explicit project opening.
 await page.reload();await page.locator('#sillynovel-stage').waitFor();await group(a.id);await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);
 const open=async()=>{await field('Saved project').selectOption(record.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Group manual cast'));};
 await open();const get=()=>alice.api('/projects/'+record.projectId),keys=[];
 const upload=async(kind,file,label)=>{const n=await field('Library artwork').locator('option').count();await field('Temporary image use').selectOption(kind);await field('PNG display label').fill(label);await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage',file+'.png'));await page.waitForFunction(n=>document.querySelector('[aria-label="Library artwork"]').options.length===n&&!document.querySelector('[aria-label="Project PNG file"]').disabled,n+1);};
 const place=async(key,slot,mode='move')=>{await field('Session actor').selectOption(key);await field('Position').selectOption(slot);await field('Occupied slot action').selectOption(mode);await button('Apply position').click();};
 for(const [i,name]of ['Mira','Mira','Rowan','Sage'].entries()){
  await field('Session actor name').fill(name);await button('Register project actor').click();await page.waitForFunction(n=>document.querySelector('.sillynovel-cast').dataset.count===String(n),i+1);keys.push(await field('Session actor').inputValue());await upload('outfit',['mira-a','mira-b','rowan','sage'][i],name+' art');
 }
 assert.equal(new Set(keys).size,4);
 await upload('background','forest','Group forest');await field('Session actor').selectOption(keys[0]);await upload('outfit','mira-a-coat','Blue coat');
 await place(keys[0],'left');await place(keys[1],'center');await place(keys[2],'right');
 await place(keys[3],'left');await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('SLOT_OCCUPIED'));
 assert.equal(await page.locator('.sillynovel-sprite--left').getAttribute('data-actor'),keys[0]);
 await place(keys[1],'left','swap');await place(keys[3],'right','replace');await place(keys[2],'right','replace');await place(keys[0],'left','swap');
 await field('Session actor').selectOption(keys[3]);await field('Presence').selectOption('false');await button('Apply presence').click();await field('Presence').selectOption('true');await button('Apply presence').click();
 await field('Session actor').selectOption(keys[0]);
 for(const lock of ['background','presence','slot','outfit']){await field('Lock field').selectOption(lock);await button('Lock choice').click();await button('Release lock').click();await button('Lock choice').click();}
 await button('Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='saved');
 const saved=await get();assert.equal(saved.scene.actors.length,4);assert.equal(saved.scene.actors.filter(a=>a.slot&&a.present).length,3);assert.equal(saved.scene.actors[3].slot,null);
 async function screen(phase){for(const [device,viewport]of [['desktop',{width:1440,height:1100}],['narrow',{width:390,height:800}]]){await page.setViewportSize(viewport);await page.locator('.sillynovel-controls').evaluate(e=>e.open=false);const name='group-'+phase+'-'+device+'.png';await page.screenshot({path:join(root,name)});screenshots.push(name);assert.ok((await page.locator('.sillynovel-dialogue').boundingBox()).height>60);assert.equal(await page.locator('#send_textarea').isVisible(),true);await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);await field('Session actor').scrollIntoViewIfNeeded();const controls='group-'+phase+'-'+device+'-controls.png';await page.screenshot({path:join(root,controls)});screenshots.push(controls);}await page.setViewportSize({width:1440,height:1100});}
 await screen('cast');pass('groups: explicit account project opening, four manual UUIDs/two Mira labels, stable three slots/offstage, refuse/swap/replace/presence/outfit/locks/save');
 // Warm both conversations before the visual-only inventory; first native activation creates greetings and native chat files.
 await group(b.id);await group(a.id);await open();await field('Session actor').selectOption(keys[0]);await page.waitForTimeout(1500);
 const before=await canonical();
 const expression=field('Expression to apply · selected source only'),image=page.locator('.sillynovel-sprite--left img');let base=await image.getAttribute('src');
 const at=async index=>{if(await button('Jump to Latest').isEnabled())await button('Jump to Latest').click();const n=await page.evaluate(()=>SillyTavern.getContext().chat.length);for(let i=n-1;i>index;i--)await button('Previous').click();await page.waitForFunction(()=>!document.querySelector('[aria-label="Expression to apply · selected source only"]').disabled);};
 const expressionUpload=async()=>{await field('Temporary expression label').fill('Group joy');await field('Temporary expression PNG').setInputFiles(join(repo,'tests/fixtures/m12-stage/mira-a-coat-joy.png'));await page.waitForFunction(()=>document.querySelector('.sillynovel-expression-context').textContent.includes('Temporary expression ready'));return expression.inputValue();};
 const apply=async id=>{await expression.selectOption(id);await button('Apply expression').click();await page.waitForFunction(()=>Boolean(document.querySelector('.sillynovel-sprite--left img').dataset.expression));};
 await at(0);let joy=await expressionUpload();await apply(joy);const joyURL=await image.getAttribute('src');await button('Next').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-sprite--left img').dataset.expression);assert.equal(await image.getAttribute('src'),base);await apply(joy);await button('Previous').click();await page.waitForFunction(url=>document.querySelector('.sillynovel-sprite--left img').src===url,joyURL);
 await button('Clear expression').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-sprite--left img').dataset.expression);joy=await expressionUpload();await apply(joy);
 await page.locator('#send_textarea').fill('Unsent group draft 日本語');await page.locator('#send_textarea').focus();await button('Next').click();assert.equal(await page.locator('#send_textarea').evaluate(e=>e===document.activeElement),true);assert.equal(await page.locator('#send_textarea').inputValue(),'Unsent group draft 日本語');
 await apply(joy);await screen('expression');
 let outgoing;await page.route('**/api/plugins/sillynovel-storage/projects/'+record.projectId,async route=>{if(route.request().method()==='PUT')outgoing=route.request().postDataJSON();return route.continue();});
 assert.equal(await page.locator('.sillynovel-unsaved').getAttribute('data-state'),'saved');await button('Save project').click();await page.waitForFunction(n=>document.querySelector('.sillynovel-project-status').textContent.includes('revision '+n),saved.revision+1);await page.unrouteAll({behavior:'wait'});
 assert.deepEqual(outgoing.scene,saved.scene);assert.deepEqual(outgoing.catalog,saved.catalog);assert.doesNotMatch(JSON.stringify(outgoing),/expression|prefixSha256|session-source|groupId|members/);
 const after=await canonical();assert.deepEqual(after,before);
 const db=new DatabaseSync(join(data,'.sillynovel-projects.sqlite'));const committed=db.prepare('SELECT * FROM projects WHERE id=?').get(record.projectId);db.close();assert.doesNotMatch(JSON.stringify(committed),/expression|prefixSha256|session-source|groupId|members/);
 const bundle=JSON.parse(await(await alice.request('/api/plugins/sillynovel-storage/projects/'+record.projectId+'/export')).text());assert.equal(bundle.version,1);assert.equal(Object.hasOwn(bundle,'catalog'),false);assert.doesNotMatch(JSON.stringify(bundle),/temporary-expression|prefixSha256|session-source|groupId|members/);
 const {createBackup,inspectBackup}=await import('../../../plugins/sillynovel-storage/recovery.mjs');const backup=join(root,'group-backup');await createBackup(join(data,'.sillynovel-projects.sqlite'),backup);const backupInfo=inspectBackup(backup);assert.equal(backupInfo.schemaVersion,2);
 evidence.groups={cards,members,groups,sources,manualActors:keys,saved,outgoing,committed,bundle,backup:backupInfo,nativeBefore:before,nativeAfter:after,screenshots};
 pass('groups: equal-text same-name native sources keep separate temporary decisions; revisit/clear/manual actor, draft/focus, clean global save body and named native-file equality');
 // Intentional native edit/source and generation mutations begin after visual-only comparison.
 await button('Backlog').click();const edited=page.locator('#chat > .mes[mesid="1"]');await edited.locator('.mes_edit').click();await edited.locator('.edit_textarea').fill('Edited native group message');await edited.locator('.mes_edit_done').click();await button('Return to Reader').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-sprite--left img').dataset.expression);assert.equal(await image.getAttribute('src'),base);assert.match(await page.locator('.sillynovel-expression-context').innerText(),/invalidated/);await screen('invalidated');
 await button('Previous').click();await page.waitForFunction(()=>Boolean(document.querySelector('.sillynovel-sprite--left img').dataset.expression));
 await image.evaluate(e=>e.dispatchEvent(new Event('error')));await page.waitForFunction(()=>!document.querySelector('.sillynovel-sprite--left img').dataset.expression);assert.equal(await image.getAttribute('src'),base);
 await field('Temporary expression PNG').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('corrupt')});await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.includes('PNG_REQUIRED'));
 pass('groups: native edit invalidates dependent expression, earlier prefix survives; instrumented image failure and corrupt PNG preserve base layout/reading');
 // Real CAS peer and lost committed save receipt, still attached to native group.
 let current=await get();await peer.api('/projects/'+record.projectId,'PUT',{schemaVersion:2,expectedRevision:current.revision,name:current.name,scene:current.scene,catalog:current.catalog});
 await field('Presence').selectOption('false');await button('Apply presence').click();await button('Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='conflict');assert.equal(await button('Save project').isEnabled(),false);
 await button('Discard and reopen attached project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='saved');
 await page.route('**/api/plugins/sillynovel-storage/projects/'+record.projectId,async route=>{if(route.request().method()!=='PUT')return route.continue();await route.fetch();await route.abort();});
 await button('Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='uncertain');await page.unrouteAll({behavior:'wait'});await button('Discard and reopen attached project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='saved');
 base=await image.getAttribute('src');
 pass('groups: authenticated peer CAS conflict and lost committed receipt retain safe explicit-reopen recovery');
 const icon=page.locator('#API-status-top');if((await icon.getAttribute('class')).includes('closedIcon'))await icon.click();await page.locator('#api_button_openai').click();await page.locator('#send_but').waitFor({state:'visible'});await icon.click();
 await button('Jump to Latest').click();await page.locator('#send_textarea').fill('Synthetic group user send');await page.locator('#send_but').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.locator('#mes_stop').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.waitForTimeout(1500);
 assert.match(await page.locator('.sillynovel-project-status').innerText(),/Group manual cast/);
 await at((await page.evaluate(()=>SillyTavern.getContext().chat.length))-1);const stopped=await expressionUpload();await apply(stopped);
 await button('Backlog').click();const swipe=await page.evaluate(()=>SillyTavern.getContext().chat.at(-1).swipe_id??0);await page.locator('#chat > .mes').last().locator('.swipe_right').click();await page.waitForFunction(old=>(SillyTavern.getContext().chat.at(-1).swipe_id??0)!==old,swipe);await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.locator('#mes_stop').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.waitForTimeout(1500);await button('Return to Reader').click();assert.equal(await image.getAttribute('src'),base);
 await page.locator('#options_button').click();await page.locator('#option_continue').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.locator('#mes_stop').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.waitForTimeout(1500);
 await alice.context.grantPermissions(['clipboard-read','clipboard-write']);await button('Copy message').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await page.evaluate(()=>SillyTavern.getContext().chat.at(-1).mes));
 assert.match(await page.locator('.sillynovel-project-status').innerText(),/Group manual cast/);assert.deepEqual((await get()).scene,saved.scene);
 evidence.groups.nativeAfterIntentionalOperations=await canonical();
 pass('groups: actual native user send/group reply, stopped-source expression, native swipe/Continue/Stop invalidation, Copy/Backlog/composer and attachment survive drafted-member IDs');
 // Native membership reorder is an intentional metadata operation, separate from the visual-only inventory.
 const castBefore=await page.locator('.sillynovel-cast').innerText(),selectedBefore=await field('Session actor').inputValue();
 evidence.groups.memberReorderBefore=await canonical();
 const right=page.locator('#rightNavDrawerIcon');await right.click();await page.locator('#rm_group_members .group_member').nth(1).locator('[data-action="up"]').click();
 await page.waitForFunction(({id,first})=>SillyTavern.getContext().groups.find(g=>g.id===id).members[0]===first,{id:a.id,first:members[1]});await right.click();
 assert.equal(await page.locator('.sillynovel-cast').innerText(),castBefore);assert.equal(await field('Session actor').inputValue(),selectedBefore);assert.match(await page.locator('.sillynovel-project-status').innerText(),/Group manual cast/);
 evidence.groups.memberReorderAfter=await canonical();pass('groups: actual native member Move up changes host order without rebinding manual actors or changing slots');
 let release,entered;const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r);
 await page.route('**/api/plugins/sillynovel-storage/projects/'+record.projectId,async route=>{if(route.request().method()!=='PUT')return route.continue();const response=await route.fetch();entered();await gate;await route.fulfill({response});});
 await button('Save project').click();await seen;await group(b.id);release();await page.unrouteAll({behavior:'wait'});assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);await group(a.id);await open();
 pass('groups: real committed save receipt delayed across group A to B cannot revive attachment or cross session authority');
 for(const id of [b.id,a.id]){await group(id);assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);await open();assert.equal(await expression.locator('option').count(),1);}
 await select(page,'Project A');assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);await group(a.id);assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);await open();
 await page.evaluate(async id=>{await(await import('/scripts/group-chats.js')).createNewGroupChat(id);},a.id);await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));await open();
 await page.evaluate(async id=>{const c=SillyTavern.getContext();await c.openGroupChat(c.groupId,id);},a.chat_id);await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));
 await page.reload();await page.locator('#sillynovel-stage').waitFor();await group(a.id);await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);await open();assert.equal(await expression.locator('option').count(),1);assert.deepEqual((await get()).scene,saved.scene);await screen('reopened');await button('Detach project').click();await open();
 evidence.groups.nativeAfterLifecycle=await canonical();
 pass('groups: group A B A, group↔individual, same-group new/old chat, reload/detach/explicit reopen never restore temporary decisions; saved global scene survives');
 await group(b.id);await open();await right.click();await page.locator('#rm_group_delete').click();await page.locator('dialog[open] .popup-button-ok').click();
 await page.waitForFunction(()=>SillyTavern.getContext().groupId==null);await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));
 const replacement=await(await native('/api/groups/create',{name:'Group B',members,activation_strategy:1})).json();assert.notEqual(replacement.id,b.id);
 await page.reload();await page.locator('#sillynovel-stage').waitFor();await group(replacement.id);await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project attached/);await open();assert.equal(await expression.locator('option').count(),1);assert.deepEqual((await get()).scene,saved.scene);
 evidence.groups.replacementGroup=replacement;evidence.groups.nativeAfterDeletionAndRecreation=await canonical();
 pass('groups: actual native Delete group control and same-name native recreation detach; fresh group ID requires explicit reopen without prior temporary state');
 // Restore inherited runner, retaining independent group project and evidence.
 await select(page,'Project A');await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);page.off('dialog',accept);
}
