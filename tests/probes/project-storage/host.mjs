import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,symlink,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
const {chromium}=await import(process.env.SN_PLAYWRIGHT_MODULE||'playwright');
const source=resolve(process.argv[2]),repo=resolve(import.meta.dirname,'../../..');
const PIN='7e8663cd9c184a550b37238218bdd32c6efc68e9';
assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),PIN);
const root=await mkdtemp(join(tmpdir(),'sn-project-host-')),host=join(root,'host'),data=join(root,'data'),config=join(root,'config.yaml');
console.log('Owned evidence root '+root);
const candidate=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const evidence={candidate,host:PIN,node:process.version,root,checks:[],files:{},notTested:['Production release','Physical devices','Other host versions','Owner Gate A','Power loss and administrative restore']};
for(const path of ['src/server-main.js','src/plugin-loader.js','src/users.js','src/constants.js','package.json'])evidence[path]=createHash('sha256').update(await readFile(join(source,path))).digest('hex');
for(const name of ['forest.png','mira-a.png','rowan.png'])evidence[name]=createHash('sha256').update(await readFile(join(repo,'tests/fixtures/m12-stage',name))).digest('hex');
const pass=name=>{evidence.checks.push(name);console.log('PASS '+name);};
const hash=x=>createHash('sha256').update(x).digest('hex');
let child,browser,origin,logs='',provider;
async function stop(){if(child&&child.exitCode===null){const done=new Promise(r=>child.once('close',r));child.kill('SIGTERM');await done;}child=null;}
async function start(enabled=true){
 const cfg=(await readFile(join(host,'default/config.yaml'),'utf8')).replace('enableServerPlugins: false','enableServerPlugins: '+enabled).replace('enableServerPluginsAutoUpdate: true','enableServerPluginsAutoUpdate: false').replace('enableUserAccounts: false','enableUserAccounts: true');
 await writeFile(config,cfg);const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));origin='http://127.0.0.1:'+port;logs='';
 child=spawn(process.execPath,['server.js','--configPath',config,'--dataRoot',data,'--port',String(port),'--listen','false','--browserLaunchEnabled','false'],{cwd:host,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
 const deadline=Date.now()+60000;
 while(Date.now()<deadline&&child.exitCode===null){if(logs.includes('127.0.0.1:'+port))return;await delay(100);}
 throw Error('Startup failed '+logs.slice(-2000));
}
async function session(handle='default-user'){
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 const token=(await(await context.request.get(origin+'/csrf-token')).json()).token;
 assert.equal((await context.request.post(origin+'/api/users/login',{headers:{'X-CSRF-Token':token},data:{handle}})).status(),200);
 const request=async(path,method='GET',body,status=200,type='application/vnd.sillynovel+json')=>{
  const res=await context.request.fetch(origin+path,{method,headers:{'X-CSRF-Token':token,...(body===undefined?{}:{'Content-Type':type})},data:body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body)});
  assert.equal(res.status(),status,path+' '+await res.text());return res;
 };
 return {context,token,request,api:async(path,method='GET',body,status=200,type)=> (await request('/api/plugins/sillynovel-storage'+path,method,body,status,type)).json()};
}
async function canonical(){const result={};for(const folder of ['characters','chats','groups','group chats','worlds']){
 const base=join(data,'default-user',folder);
 async function walk(p){let entries;try{entries=await readdir(p,{withFileTypes:true});}catch{return;}for(const e of entries){const f=join(p,e.name);if(e.isDirectory())await walk(f);else result[f.slice(data.length+1)]=hash(await readFile(f));}}
 await walk(base);
}return result;}
async function select(page,name){
 const icon=page.locator('#rightNavDrawerIcon');if((await icon.getAttribute('class')).includes('closedIcon'))await icon.click();
 await page.locator('#right-nav-panel.openDrawer').waitFor({state:'visible'});
 if(!await page.locator('#rm_button_create').isVisible())await page.locator('#rm_button_characters').click();
 await page.locator('#rm_print_characters_block').getByText(name,{exact:true}).click();
 await page.waitForFunction(n=>SillyTavern.getContext().chat[0]?.name===n,name);await icon.click();await page.locator('#right-nav-panel').waitFor({state:'hidden'});
}
async function enable(page){await page.locator('.drawer-icon[title="Extensions"]').click();await page.locator('#sillynovel-enabled').setChecked(true);await page.locator('.drawer-icon[title="Extensions"]').click();await page.locator('#sillynovel-stage').waitFor();}
try {
 execFileSync('git',['clone','--shared',source,host],{stdio:'pipe'});
 execFileSync('git',['-C',host,'checkout','--detach',PIN],{stdio:'pipe'});
 execFileSync('cp',['-a','--reflink=auto',join(source,'node_modules'),join(host,'node_modules')]);
 await mkdir(join(host,'plugins'),{recursive:true});await symlink(join(repo,'plugins/sillynovel-storage'),join(host,'plugins/sillynovel-storage'));
 await mkdir(join(host,'public/scripts/extensions/third-party'),{recursive:true});await symlink(repo,join(host,'public/scripts/extensions/third-party/SillyNovel'));
 await mkdir(join(data,'default-user'),{recursive:true});
 const settings=JSON.parse(await readFile(join(host,'default/content/settings.json')));settings.firstRun=false;
 settings.main_api='openai';settings.oai_settings={...settings.oai_settings,chat_completion_source:'custom',custom_url:'http://127.0.0.1:8128/v1',custom_model:'sn-reader-local',stream_openai:true};
 await writeFile(join(data,'default-user/settings.json'),JSON.stringify(settings));
 await start();
 const providerFile=join(root,'provider.mjs');await writeFile(providerFile,(await readFile(join(repo,'tests/fixtures/dyl18-openai-endpoint.mjs'),'utf8')).replaceAll('http://127.0.0.1:8018',origin));
 provider=spawn(process.execPath,[providerFile],{cwd:repo,stdio:['ignore','pipe','pipe']});
 let providerLog='';provider.stdout.on('data',x=>providerLog+=x);provider.stderr.on('data',x=>providerLog+=x);
 while(!providerLog.includes('listening on 8128')){if(provider.exitCode!==null)throw Error(providerLog);await delay(50);}
 browser=await chromium.launch({headless:true});evidence.browser=browser.version();
 const alice=await session();assert.equal((await alice.api('/capabilities')).apiVersion,1);
 await alice.request('/api/users/create','POST',{handle:'sn-other',name:'Synthetic second user'},200,'application/json');
 const bob=await session('sn-other');
 const p=await alice.api('/projects','POST',{name:'API project'},201);
 assert.equal((await bob.api('/projects')).length,0);
 await bob.api('/projects/'+p.projectId,'GET',undefined,404);
 const body={schemaVersion:1,expectedRevision:0,name:p.name,scene:p.scene};
 const otherProject=await bob.api('/projects','POST',{name:'Bob project'},201);await alice.api('/projects/'+otherProject.projectId,'GET',undefined,404);
 const peer=await session();await alice.api('/projects/'+p.projectId,'PUT',body);await peer.api('/projects/'+p.projectId,'PUT',body,409);
 await bob.api('/projects/'+p.projectId,'PUT',{...body,expectedRevision:1},404);
 await alice.api('/projects','POST',{name:'Bad',owner:'sn-other'},400);
 await alice.api('/projects','POST',{name:'Bad',path:'/tmp/unsafe'},400);
 const asset=await alice.api('/projects/'+p.projectId+'/assets','POST',await readFile(join(repo,'tests/fixtures/m12-stage/forest.png')),201,'image/png');
 await bob.request('/api/plugins/sillynovel-storage/projects/'+p.projectId+'/assets/'+asset.assetId,'GET',undefined,404);
 const readback=await alice.request('/api/plugins/sillynovel-storage/projects/'+p.projectId+'/assets/'+asset.assetId);assert.equal(hash(await readback.body()),asset.sha256);
 await alice.api('/projects/'+p.projectId+'/assets','POST',Buffer.from('<svg/>'),400,'image/png');
 await alice.api('/projects/'+p.projectId+'/assets','POST',Buffer.alloc(5*1024*1024+1),413,'image/png');
 await alice.api('/projects/'+p.projectId+'/assets','POST',Buffer.from('jpeg'),415,'image/jpeg');
 const noCSRF=await alice.context.request.post(origin+'/api/plugins/sillynovel-storage/projects',{headers:{'Content-Type':'application/vnd.sillynovel+json'},data:JSON.stringify({name:'no'})});assert.equal(noCSRF.status(),403);
 const anonymous=await browser.newContext();const unauth=await anonymous.request.get(origin+'/api/plugins/sillynovel-storage/projects');assert.equal(unauth.status(),403);await anonymous.close();
 pass('real host auth/CSRF, two-user project and asset isolation, two-client CAS, PNG hash and limits');
 for(const name of ['Project A','Project B'])await alice.request('/api/characters/create','POST',{ch_name:name,description:'Public synthetic fixture',first_mes:'Welcome to '+name},200,'application/json');
 const page=await alice.context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>console.log('PAGE ERROR '+e.message));
 await page.goto(origin);await page.locator('#sillynovel-settings').waitFor({state:'attached'});await select(page,'Project A');await enable(page);
 await page.locator('.sillynovel-controls summary').click();
 const field=name=>page.locator('#sillynovel-stage').getByLabel(({'Session actor name':'Project actor name','Session actor':'Project actor','Temporary image use':'Project image use','Temporary raster file':'Project PNG file'})[name]||name,{exact:true});const button=name=>page.getByRole('button',{name,exact:true});
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status')?.textContent.includes('No project'));
 await field('Project name').fill('Browser project');await button('Create project and use with this chat').click();
 await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Browser project'));
 await field('Temporary image use').selectOption('background');await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage/forest.png'));
 await page.waitForFunction(()=>!document.querySelector('.sillynovel-art__background').hidden);
 for(const [name,slot,file]of [['One','left','mira-a.png'],['Two','right','rowan.png']]){
  await field('Session actor name').fill(name);await button('Register project actor').click();
  await page.waitForFunction(n=>document.querySelector('.sillynovel-cast').textContent.includes(n),name);
  await field('Temporary image use').selectOption('outfit');await field('Temporary raster file').setInputFiles(join(repo,'tests/fixtures/m12-stage',file));
  await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.startsWith('Imported'));
  await field('Position').selectOption(slot);await button('Apply position').click();
  await page.waitForFunction(s=>!document.querySelector('.sillynovel-sprite--'+s).hidden,slot);
 }
 await delay(1500);const before=await canonical();assert.ok(Object.keys(before).length>=2);
 await button('Save project').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('revision 1'));
 const project=(await alice.api('/projects')).find(x=>x.name==='Browser project');const saved=await alice.api('/projects/'+project.projectId);
 assert.equal(saved.scene.actors.length,2);assert.deepEqual(saved.scene.actors.map(x=>x.slot),['left','right']);
 await page.reload();await page.locator('#sillynovel-stage').waitFor();await select(page,'Project A');await page.locator('.sillynovel-controls summary').click();
 assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);
 await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();
 await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
 await page.waitForFunction(()=>[...document.querySelectorAll('.sillynovel-art img')].filter(e=>!e.hidden).every(e=>e.complete&&e.naturalWidth));
 assert.deepEqual((await alice.api('/projects/'+project.projectId)).scene,saved.scene);
 await page.locator('.sillynovel-controls summary').click();await page.screenshot({path:join(root,'restored.png')});await page.locator('.sillynovel-controls summary').click();assert.deepEqual(await canonical(),before);evidence.files=before;
 pass('browser create/import background + two sprites/arrange/save/reload/explicit reopen; named canonical files unchanged');
 await select(page,'Project B');assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);await select(page,'Project A');assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);
 pass('native A to B to A detaches and never auto-restores project');
 // Actual host persistence failure and neutral missing-art restore.
 const fault=new DatabaseSync(join(data,'.sillynovel-projects.sqlite'));
 fault.exec("CREATE TRIGGER fail_update BEFORE UPDATE ON projects BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
 await alice.api('/projects/'+project.projectId,'PUT',{schemaVersion:1,expectedRevision:saved.revision,name:'lost',scene:saved.scene},503);
 assert.deepEqual(await alice.api('/projects/'+project.projectId),saved);fault.exec('DROP TRIGGER fail_update');
 const missingURL='**/api/plugins/sillynovel-storage/projects/'+project.projectId+'/assets/'+saved.scene.backgroundAssetId;
 await page.route(missingURL,route=>route.fulfill({status:404,body:'missing test asset'}));
 const missingId=saved.scene.actors[0].spriteAssetId;
 const original=fault.prepare('SELECT bytes FROM assets WHERE id=?').get(missingId).bytes;
 fault.prepare('UPDATE assets SET bytes=? WHERE id=?').run(Buffer.from('corrupt'),missingId);
 await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();
 await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
 assert.equal(await page.locator('.sillynovel-sprite--left img').isVisible(),false);assert.equal(await page.locator('.sillynovel-art__background').isVisible(),false);await page.unroute(missingURL);
 await button('Detach project').click();fault.prepare('UPDATE assets SET bytes=? WHERE id=?').run(original,missingId);fault.close();
 pass('actual host failed update preserves project; missing/corrupt assets restore neutral fallback');
 await field('Saved project').selectOption(project.projectId);await button('Open project and use with this chat').click();await page.waitForFunction(()=>document.querySelectorAll('.sillynovel-sprite:not([hidden])').length===2);
 let release,entered;const gate=new Promise(r=>release=r),seen=new Promise(r=>entered=r);
 await page.route('**/api/plugins/sillynovel-storage/projects/'+project.projectId,async route=>{if(route.request().method()!=='PUT')return route.continue();const response=await route.fetch();entered();await gate;await route.fulfill({response});});
 await button('Save project').click();await seen;await select(page,'Project B');release();await page.waitForTimeout(100);assert.equal(await page.locator('.sillynovel-sprite:visible').count(),0);assert.match(await page.locator('.sillynovel-project-status').innerText(),/No project/);await page.unrouteAll({behavior:'wait'});
 pass('delayed successful save receipt cannot redirect switched chat');
 await page.locator('.sillynovel-controls summary').click();
 await page.locator('#API-status-top').click();await page.locator('#api_button_openai').click();await page.locator('#send_but').waitFor({state:'visible'});await page.locator('#API-status-top').click();
 await page.locator('#send_textarea').fill('Hello synthetic fixture');await page.locator('#send_but').click();
 await page.waitForFunction(()=>document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));
 await page.locator('#mes_stop').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-reader__status').textContent.includes('streaming'));
 await button('Previous').click();await button('Next').click();await button('Backlog').click();await button('Return to Reader').click();
 assert.equal(await page.locator('#send_textarea').isVisible(),true);
 pass('actual host native send/stream/stop, navigation and backlog remain functional');
 await stop();await start();const reopened=await session();assert.deepEqual((await reopened.api('/projects/'+project.projectId)).scene,saved.scene);
 pass('plugin/server restart preserves committed layout and asset bytes');
 const again=await reopened.request('/api/plugins/sillynovel-storage/projects/'+p.projectId+'/assets/'+asset.assetId);assert.equal(hash(await again.body()),asset.sha256);
 await stop();await start(false);const disabled=await session();await disabled.request('/api/plugins/sillynovel-storage/capabilities','GET',undefined,404);
 const fallback=await disabled.context.newPage();await fallback.goto(origin);await fallback.locator('#sillynovel-stage').waitFor();await fallback.locator('.sillynovel-controls summary').click();
 await fallback.waitForFunction(()=>document.querySelector('.sillynovel-project-status').textContent.includes('Plugin unavailable'));
 assert.equal(await fallback.locator('#send_textarea').isVisible(),true);assert.equal(await fallback.getByRole('button',{name:'Register session actor',exact:true}).isEnabled(),true);
 pass('plugin disabled at startup retains session stage and native composer');
 evidence.result='PASS';
} catch(error){evidence.result='FAIL';evidence.error=error.stack;console.error(error);process.exitCode=1;}
finally{await browser?.close();await stop();provider?.kill('SIGTERM');await writeFile(join(root,'host.log'),logs);await writeFile(join(root,'evidence.json'),JSON.stringify(evidence,null,2));console.log('Evidence '+join(root,'evidence.json'));}
