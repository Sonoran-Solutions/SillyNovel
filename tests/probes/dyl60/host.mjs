import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

export async function runCandidate({root,data,config,repo,page,alice,project,field,button,select,pass,evidence}) {
 const report=evidence.candidatePreparation={phases:[],screenshots:[]};
 const inherited=project;
 const portable=await alice.request('/api/plugins/sillynovel-storage/projects/'+project.projectId+'/export');
 project=await alice.api('/projects/import','POST',await portable.body(),201,'application/vnd.sillynovel.bundle');
 project=await alice.api('/projects/'+project.projectId,'PUT',{schemaVersion:2,expectedRevision:project.revision,name:'Lantern candidate layout',scene:{...project.scene,actors:project.scene.actors.map((a,i)=>({...a,name:['Mira','Rowan'][i]}))},catalog:project.catalog});
 const hash=b=>createHash('sha256').update(b).digest('hex');
 const native=async(path,body)=>(await alice.request(path,'POST',body,200,'application/json'));
 const scenario=JSON.parse(await readFile(join(repo,'tests/fixtures/dyl60-owner-conversation.json')));
 assert.equal(scenario.individual.length,20);assert.equal(new Set(scenario.individual.map(t=>t.reply)).size,20);
 const userRoot=join(data,'default-user');
 // Pinned host USER_DIRECTORY_TEMPLATE uses "User Avatars", not "avatars".
 await mkdir(join(userRoot,'User Avatars'),{recursive:true});
 await writeFile(join(userRoot,'User Avatars/lantern-persona.png'),await readFile(join(repo,'tests/fixtures/m12-stage/rowan.png')));
 await writeFile(join(userRoot,'worlds/lantern-lore.json'),JSON.stringify({entries:{0:{uid:0,key:['lantern'],content:'A public synthetic lantern, map and safe bridge.',disable:false}},name:'Lantern lore'}));
 await page.evaluate(async()=>{
  const {power_user}=await import('/scripts/power-user.js');
  power_user.personas['lantern-persona.png']='Synthetic Traveller';
  power_user.persona_descriptions['lantern-persona.png']={description:'An invented traveller testing a reading room.',position:0,depth:2,role:0,connections:[]};
  const c=SillyTavern.getContext();
  c.extensionSettings.connectionManager.profiles.push({id:'sn-lantern-profile',name:'Synthetic loopback only',api:'custom','api-url':'http://127.0.0.1:8128/v1',model:'sn-reader-local'});
  await(await import('/scripts/personas.js')).setUserAvatar('lantern-persona.png',{toastPersonaNameChange:false});
  await(await import('/script.js')).saveSettings();
 });
 const members=[];
 for(const [i,name]of ['Mira','Mira','Rowan','Sage'].entries())members.push(await(await native('/api/characters/create',{ch_name:name,description:'Synthetic lantern card '+i,first_mes:i<2?'I brought the map back.':'Public lantern greeting.'})).text());
 const group=await(await native('/api/groups/create',{name:'Lantern council',members,activation_strategy:1})).json();
 async function openGroup(){const icon=page.locator('#rightNavDrawerIcon');if((await icon.getAttribute('class')).includes('closedIcon'))await icon.click();await page.locator('#right-nav-panel.openDrawer').waitFor({state:'visible'});if(!await page.locator('#rm_button_create').isVisible())await page.locator('#rm_button_characters').click();await page.locator('#rm_print_characters_block .group_select[data-grid="'+group.id+'"]').click();await page.waitForFunction(id=>String(SillyTavern.getContext().groupId)===id&&SillyTavern.getContext().chat.length===6,group.id);await icon.click();await page.locator('#right-nav-panel').waitFor({state:'hidden'});}
 const message=(name,mes,is_user=false)=>({name,mes,is_user,is_system:false,send_date:'2026-10-16T12:00:00.000Z',extra:{}});
 const header={user_name:'Synthetic Traveller',character_name:'Project A',create_date:'2026-10-16T12:00:00.000Z',chat_metadata:{}};
 const story=[header,message('Project A','The lantern is waiting. Public synthetic fixture.')];
 for(const turn of scenario.individual)story.push(message('Synthetic Traveller',turn.user,true),message(turn.speaker,turn.reply));
 await native('/api/chats/save',{avatar_url:'Project A.png',file_name:'The Last Lantern',chat:story});
 await native('/api/chats/group/save',{id:group.chat_id,chat:[{chat_metadata:{}},...scenario.group.map(t=>({...message(t.speaker,t.text),original_avatar:members[t.cardIndex]}))]});
 report.fixture={individual:'The Last Lantern',individualTurns:20,visualProjectId:project.projectId,members,group,scriptSha256:hash(await readFile(join(repo,'tests/fixtures/dyl60-owner-conversation.json')))};
 await page.reload();await page.locator('#sillynovel-stage').waitFor();await select(page,'Project A');
 await page.evaluate(async()=>{const h=await import('/script.js');await h.openCharacterChat('The Last Lantern');await h.saveChat();await h.saveSettings();});
 await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);
 const open=async()=>{await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);};
 await open();await page.waitForTimeout(2000);
 async function inventory(){
  const files={},cards={};
  async function walk(base){let entries;try{entries=await readdir(base,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const entry of entries){const file=join(base,entry.name);if(entry.isDirectory())await walk(file);else{assert.equal(entry.isSymbolicLink(),false);const bytes=await readFile(file);files[file.slice(data.length+1)]={bytes:bytes.length,sha256:hash(bytes)};}}}
  for(const dir of ['characters','chats','group chats','groups','worlds','User Avatars','avatars','OpenAI Settings','TextGen Settings','KoboldAI Settings','NovelAI Settings'])await walk(join(userRoot,dir));
  await walk(join(data,'_storage'));
  const settingsBytes=await readFile(join(userRoot,'settings.json'));
  files['default-user/settings.json']={bytes:settingsBytes.length,sha256:hash(settingsBytes)};
  const cfg=await readFile(config);files['host/config.yaml']={bytes:cfg.length,sha256:hash(cfg)};
  for(const path of Object.keys(files).filter(p=>p.startsWith('default-user/characters/')&&p.split('/').length===3&&p.endsWith('.png'))){const bytes=await readFile(join(data,path)),art=[];let metadata;for(let at=8;at<bytes.length;){const length=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),chunk=bytes.subarray(at+8,at+8+length);if(type==='tEXt'&&chunk.subarray(0,6).toString()==='chara\0')metadata=JSON.parse(Buffer.from(chunk.subarray(6).toString(),'base64'));if(type!=='tEXt')art.push(bytes.subarray(at,at+12+length));at+=12+length;}assert.ok(metadata,path);cards[path]={metadata,artSha256:hash(Buffer.concat(art))};}
  return {files,cards,count:Object.keys(files).length,bytes:Object.values(files).reduce((n,f)=>n+f.bytes,0),settings:JSON.parse(settingsBytes)};
 }
 const settled=async()=>{await page.waitForTimeout(2000);return inventory();};
 const before=await settled();assert.ok(before.settings.power_user.personas['lantern-persona.png']);assert.ok(before.settings.extension_settings.connectionManager.profiles.some(p=>p.id==='sn-lantern-profile'));
 const actor=(await alice.api('/projects/'+project.projectId)).scene.actors[0].actorId;
 await field('Session actor').selectOption(actor);await button('Previous').click();
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Expression to apply · selected source only"]').disabled);
 await field('Temporary expression label').fill('Lantern joy');await field('Temporary expression PNG').setInputFiles(join(repo,'tests/fixtures/m12-stage/mira-a-joy.png'));
 await page.waitForFunction(()=>document.querySelector('.sillynovel-expression-context').textContent.includes('Temporary expression ready'));
 await button('Apply expression').click();await page.waitForFunction(()=>Boolean(document.querySelector('.sillynovel-sprite--left img').dataset.expression));
 await field('PNG display label').fill('Lantern alternative');await field('Temporary image use').selectOption('background');await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage/tavern.png'));
 await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.startsWith('Imported'));
 await button('Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='saved');
 await button('Discard and reopen attached project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='saved');
 const after=await settled();report.phases.push({name:'visual-only',before,after,allowedSettingsChanges:[]});assert.deepEqual(after,before);
 pass('candidate: complete scoped native inventory paths/counts/sizes/hashes and full settings unchanged across expression, artwork, save and explicit reopen; real persona/avatar, connection profile, lore, cards/groups/chats included');
 // A native save-as creates identical bytes but is deliberately opened as a different conversation.
 const parent=await page.evaluate(()=>SillyTavern.getContext().chatId);
 await page.evaluate(async()=>{const h=await import('/script.js');await h.saveChat();await h.saveChat({chatName:'Lantern identical copy'});});
 const copyBefore=await settled();
 const parentPath=Object.keys(copyBefore.files).find(p=>p.endsWith('/'+parent+'.jsonl'));
 const copyPath=Object.keys(copyBefore.files).find(p=>p.endsWith('/Lantern identical copy.jsonl'));
 assert.ok(parentPath&&copyPath);assert.deepEqual(copyBefore.files[copyPath],copyBefore.files[parentPath]);
 const expression=field('Expression to apply · selected source only');
 async function chooseExpression(){await field('Session actor').selectOption(actor);await page.waitForFunction(()=>!document.querySelector('[aria-label="Expression to apply · selected source only"]').disabled);await field('Temporary expression PNG').setInputFiles(join(repo,'tests/fixtures/m12-stage/mira-a-joy.png'));await page.waitForFunction(()=>document.querySelector('.sillynovel-expression-context').textContent.includes('Temporary expression ready'));await button('Apply expression').click();await page.waitForFunction(()=>Boolean(document.querySelector('.sillynovel-sprite--left img').dataset.expression));}
 await chooseExpression();
 let release,entered;const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r);
 await page.route('**/api/plugins/sillynovel-storage/projects/'+project.projectId,async route=>{if(route.request().method()!=='PUT')return route.continue();const response=await route.fetch();entered();await gate;await route.fulfill({response});});
 await button('Save project').click();await seen;
 await page.evaluate(async()=>{await(await import('/script.js')).openCharacterChat('Lantern identical copy');});
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));release();await page.unrouteAll({behavior:'wait'});
 assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);await open();assert.equal(await expression.locator('option').count(),1);
 report.copy={parent,parentPath,copyPath,identical:copyBefore.files[parentPath],before:copyBefore,after:await settled()};
 pass('candidate: real native saveChat save-as/open identical copy detaches, drops expressions, ignores delayed committed parent save receipt; global project deliberately reopens');
 await chooseExpression();
 const verifyBranch=(before,after,name)=>{const path='default-user/characters/Project A.png',oldCard=structuredClone(before.cards[path]),newCard=structuredClone(after.cards[path]);const change={path,field:'chat',before:oldCard.metadata.chat,after:newCard.metadata.chat};assert.equal(newCard.metadata.chat,name);delete oldCard.metadata.chat;delete newCard.metadata.chat;assert.deepEqual(newCard,oldCard);for(const [p,value]of Object.entries(before.files))if(!p.includes('/chats/')&&p!==path)assert.deepEqual(after.files[p],value,p);return change;};
 const activeBranchBefore=await settled();
 let releaseBranchSave,enteredBranchSave,branchSaveBody;const branchSaveGate=new Promise(r=>releaseBranchSave=r),branchSaveSeen=new Promise(r=>enteredBranchSave=r);
 await page.route('**/api/plugins/sillynovel-storage/projects/'+project.projectId,async route=>{if(route.request().method()!=='PUT')return route.continue();branchSaveBody=route.request().postDataJSON();const response=await route.fetch();enteredBranchSave();await branchSaveGate;await route.fulfill({response});});
 await button('Save project').click();await branchSaveSeen;
 const activeBranch=await page.evaluate(async()=>await(await import('/scripts/bookmarks.js')).branchChat(2));assert.ok(activeBranch);
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));releaseBranchSave();await page.unrouteAll({behavior:'wait'});assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);
 await open();assert.equal(await expression.locator('option').count(),1);assert.equal(await page.locator('.sillynovel-sprite--left img').getAttribute('data-expression'),'');
 const activeBranchAfter=await settled();assert.doesNotMatch(JSON.stringify(branchSaveBody),/expression|prefixSha256|session-source/);report.activeBranch={name:activeBranch,before:activeBranchBefore,after:activeBranchAfter,allowedCardChange:verifyBranch(activeBranchBefore,activeBranchAfter,activeBranch),outgoing:branchSaveBody,hadAppliedExpression:true,lateCommittedSaveIgnored:true};
 pass('candidate: native branch while expression is actively applied and parent save receipt is held detaches immediately; late receipt cannot attach or resurrect choices; deliberate reopen has only global layout');
 let releaseImage,enteredImage;const imageGate=new Promise(r=>releaseImage=r),imageSeen=new Promise(r=>enteredImage=r);
 await page.route('**/api/plugins/sillynovel-storage/projects/'+project.projectId+'/assets/*',async route=>{const response=await route.fetch();enteredImage();await imageGate;await route.fulfill({response});});
 await button('Discard and reopen attached project').click();await imageSeen;
 const branchBefore=await settled();
 const branch=await page.evaluate(async()=>await(await import('/scripts/bookmarks.js')).branchChat(2));assert.ok(branch);
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));releaseImage();await page.unrouteAll({behavior:'wait'});
 assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);await open();assert.equal(await expression.locator('option').count(),1);
 const branchAfter=await settled();report.branch={name:branch,before:branchBefore,after:branchAfter};
 assert.notEqual(branch,activeBranch);
 assert.equal(await page.evaluate(()=>SillyTavern.getContext().chat.length),3);
 report.branch.allowedCardChange=verifyBranch(branchBefore,branchAfter,branch);
 pass('candidate: pinned native branchChat opens older prefix detached; delayed parent image/open completion cannot retarget branch; temporary expressions absent, saved global project remains available');
 // Capture the actual outgoing native generation payload separately from visual-only non-mutation.
 await chooseExpression();const icon=page.locator('#API-status-top');if((await icon.getAttribute('class')).includes('closedIcon'))await icon.click();await page.locator('#api_button_openai').click();await page.locator('#send_but').waitFor({state:'visible'});await icon.click();await page.waitForTimeout(2000);
 const nativeGenerationBefore=await inventory(),requests=[];
 assert.equal(nativeGenerationBefore.settings.user_avatar,'lantern-persona.png');
 const expressionId=await page.locator('.sillynovel-sprite--left img').getAttribute('data-expression');assert.ok(expressionId);
 const sourceMessages=await page.evaluate(()=>SillyTavern.getContext().chat.map(m=>({role:m.is_user?'user':'assistant',content:m.mes})));
 const visualIds=[project.projectId,actor,expressionId,...(await alice.api('/projects/'+project.projectId)).catalog.map(a=>a.assetId)];
 const capture=req=>{if(req.url().endsWith('/api/backends/chat-completions/generate'))requests.push(req.postDataJSON());};page.on('request',capture);
 await page.locator('#send_textarea').fill('Tell us about the synthetic lantern.');await page.locator('#send_but').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));await page.locator('#mes_stop').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));page.off('request',capture);assert.ok(requests.length);
 assert.doesNotMatch(JSON.stringify(requests),/sillynovel|prefixSha256|session-source|temporary-expression|projectId|actorId/i);
 for(const id of visualIds)assert.equal(JSON.stringify(requests).includes(id),false);
 const expectedMessages=[...sourceMessages,{role:'user',content:'Tell us about the synthetic lantern.'}];
 assert.deepEqual(requests[0].messages.filter(m=>m.role!=='system').map(({role,content})=>({role,content})),expectedMessages);
 assert.ok(JSON.stringify(requests[0].messages).includes('An invented traveller testing a reading room.'));
 assert.equal(requests[0].user_name,'Synthetic Traveller');assert.equal(requests[0].custom_url,'http://127.0.0.1:8128/v1');
 const generationAfter=await settled();for(const [path,value]of Object.entries(nativeGenerationBefore.files))if(!path.includes('/chats/'))assert.deepEqual(generationAfter.files[path],value,path);
 report.generation={requests,before:nativeGenerationBefore,after:generationAfter,expectedMessages,excludedVisualIds:visualIds,activeSyntheticPersona:true};
 pass('candidate: actual native generation request contains no visual metadata; intentional send/Stop affects chat only, persona/connection/cards/lore/account/host settings retained');
 await page.evaluate(async()=>await(await import('/script.js')).openCharacterChat('The Last Lantern'));await open();
 for(let i=40;i>18;i--)await button('Previous').click();
 assert.equal(await page.evaluate(()=>SillyTavern.getContext().chat[18].mes),scenario.individual[8].reply);
 await alice.context.grantPermissions(['clipboard-read','clipboard-write']);await button('Copy message').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),scenario.individual[8].reply);
 for(const [name,viewport]of [['desktop',{width:1440,height:1100}],['narrow',{width:390,height:800}]]){await page.setViewportSize(viewport);await page.locator('.sillynovel-controls').evaluate(e=>e.open=false);const file='lantern-'+name+'.png';await page.screenshot({path:join(root,file)});report.screenshots.push(file);}
 await page.setViewportSize({width:1440,height:1100});await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);
 await openGroup();
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));
 const groupMessages=await page.evaluate(()=>SillyTavern.getContext().chat.map(m=>({name:m.name,mes:m.mes,original_avatar:m.original_avatar})));
 assert.deepEqual(groupMessages.map(m=>m.mes),scenario.group.map(m=>m.text));assert.notEqual(groupMessages[0].original_avatar,groupMessages[1].original_avatar);report.fixture.groupMessages=groupMessages;
 const groupBundle=await alice.request('/api/plugins/sillynovel-storage/projects/'+project.projectId+'/export');
 let cast=await alice.api('/projects/import','POST',await groupBundle.body(),201,'application/vnd.sillynovel.bundle');
 cast=await alice.api('/projects/'+cast.projectId,'PUT',{schemaVersion:2,expectedRevision:cast.revision,name:'Lantern council layout',scene:{...cast.scene,actors:cast.scene.actors.map(a=>({...a,name:'Mira'}))},catalog:cast.catalog});
 await page.reload();await page.locator('#sillynovel-stage').waitFor();await openGroup();await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);await field('Saved project').selectOption(cast.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Lantern council layout'));
 for(const [name,file,slot]of [['Rowan','rowan.png','center'],['Sage','sage.png','']]){await field('Session actor name').fill(name);await button('Register project actor').click();await page.waitForFunction(n=>document.querySelector('.sillynovel-cast').textContent.includes(n),name);await field('Temporary image use').selectOption('outfit');await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage',file));await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.startsWith('Imported'));if(slot){await field('Position').selectOption(slot);await button('Apply position').click();}}
 await button('Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-unsaved').dataset.state==='saved');report.fixture.groupProject=await alice.api('/projects/'+cast.projectId);assert.equal(report.fixture.groupProject.scene.actors.length,4);assert.equal(report.fixture.groupProject.scene.actors.filter(a=>a.slot).length,3);
 for(const [name,viewport]of [['desktop',{width:1440,height:1100}],['narrow',{width:390,height:800}]]){await page.setViewportSize(viewport);await page.locator('.sillynovel-controls').evaluate(e=>e.open=false);const file='lantern-group-'+name+'.png';await page.screenshot({path:join(root,file)});report.screenshots.push(file);}await page.setViewportSize({width:1440,height:1100});await page.locator('.sillynovel-controls').evaluate(e=>e.open=true);
 pass('candidate: staged 20-turn individual story and six-message four-card duplicate-name group load through native host; manual cue script remains separate from canonical prose');
 // All candidate edits used an independent portable project copy.
 await select(page,'Project B');await select(page,'Project A');
 await field('Saved project').selectOption(inherited.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
}
