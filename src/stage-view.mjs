import { createProjectClient } from './project-client.mjs';
import { createProjectScene } from './project-scene.mjs';
import { createTransientScene, TEST_ACTORS, evidenceStamp } from './transient-scene.mjs';

export function mountVisualStage({ document, stage, actions }) {
    const make = (tag, cls, text) => { const e=document.createElement(tag); e.className=cls; if(text)e.textContent=text; return e; };
    if (typeof globalThis.crypto?.randomUUID !== 'function' || typeof globalThis.crypto?.subtle?.digest !== 'function') {
        const notice = make('p', 'sillynovel-visual-unavailable', 'Visual stage unavailable: secure browser crypto is missing. Continue in the text reader, or open SillyTavern over HTTPS (or localhost on the host computer) and reload to enable visuals.');
        notice.setAttribute('role', 'status');
        stage.querySelector('header').after(notice);
        return { update() {}, dispose() { notice.remove(); } };
    }
    const art = make('div','sillynovel-art'); art.setAttribute('aria-label','Manual visual stage');
    const background = make('img','sillynovel-art__background'); background.alt=''; background.hidden=true;
    const slots = new Map(['left','center','right'].map(slot=> {
        const figure=make('figure','sillynovel-sprite sillynovel-sprite--'+slot);
        figure.dataset.slot=slot; figure.hidden=true;
        const image=make('img','sillynovel-sprite__image'); image.alt='';
        const label=make('figcaption','sillynovel-sprite__label');
        figure.append(image,label); art.append(figure); return [slot,{figure,image,label}];
    }));
    art.prepend(background);
    const unsaved=make('strong','sillynovel-unsaved','Unsaved session visuals');unsaved.setAttribute('role','status');
    const details=make('details','sillynovel-controls');
    const summary=make('summary','','Manual scene controls');
    const panel=make('div','sillynovel-controls__panel');
    const help=make('p','','All art and actors disappear on reload, disable or chat reactivation. Actors are manual session identities, with no SillyTavern card binding. Background, presence and outfit apply forward; expressions apply only to this source/swipe. Historical corrections invalidate later choices.');
    const transientHelp=help.textContent;
    const feedback=make('p','sillynovel-visual-status');feedback.setAttribute('role','status');
    const cast=make('p','sillynovel-cast');
    const controls=[], removers=[];
    let target=panel,currentArea=panel,displayedView=null,displayedActor=null,attachmentNotice='';
    function area(title,description) {
        const section=make('fieldset','sillynovel-controls__area');
        section.append(make('legend','',title),make('p','',description));panel.append(section);target=section;currentArea=section;return section;
    }
    function row(){target=make('div','sillynovel-controls__row');currentArea.append(target);}
    let disposed=false,lastStamp=null;
    let model=createTransientScene(actions,render);
    let projectEpoch=0,activation=actions.getSnapshot().sessionEpoch,capable=false,cleanupCapable=false,bundleCapable=false,bundleBusy=false,projectBusy=false,unavailable='Plugin unavailable · session visuals remain unsaved.';
    const client=createProjectClient(()=>actions.getRequestHeaders?.() ?? {});
    const listen=(el,type,cb)=>{el.addEventListener(type,cb);removers.push(()=>el.removeEventListener(type,cb));};
    function run(fn,mutation=false) { const captured=model,epoch=actions.getSnapshot().sessionEpoch;Promise.resolve().then(()=>{if(mutation&&(projectBusy||model.project&&model.status().importing))return;return fn();}).catch(error=> { if(!disposed && model===captured && actions.getSnapshot().sessionEpoch===epoch)feedback.textContent='Visual action refused: '+({SLOT_OCCUPIED:'That position is reserved. Choose Explicit swap (both actors need positions) or Explicit replace (moves the occupant offstage).',INVALID_SWAP:'Swap needs two occupied positions. Choose a position for this actor first, or use Explicit replace.',INCOMPATIBLE_ASSET:'This artwork does not match the selected actor or outfit. Choose a compatible alternative.',PNG_REQUIRED:'Import a valid static PNG; existing artwork is preserved.'}[error.message]??error.message)+' ['+error.message+']'; }); }
    const button=(text,fn)=> {const e=make('button','menu_button sillynovel-button',text);e.type='button';listen(e,'click',()=>run(fn,true));target.append(e);controls.push(e);return e;};
    const field=(name,tag='select')=> { const label=make('label','sillynovel-control',name);const e=make(tag,'');e.setAttribute('aria-label',name);label.append(e);target.append(label);controls.push(e);return e;};
    const shortId=id=>model.project?id.slice(0,8):id.split('-').at(-1);
    function options(select,items) {
        const signature=JSON.stringify(items);
        if(select.dataset.options===signature)return;
        const value=select.value;select.replaceChildren(...items.map(([id,label])=>{const e=make('option','',label);e.value=id;e.title=id;return e;}));
        select.dataset.options=signature;
        if(items.some(([id])=>id===value))select.value=value;
    }
    details.append(summary,panel);panel.append(help);
    const projectStatus=make('p','sillynovel-project-status','Checking optional project storage…');projectStatus.setAttribute('role','status');
    const scope=make('p','sillynovel-project-scope');
    stage.querySelector('header').after(unsaved,projectStatus,scope,details,art,cast,feedback);
    area('Project','Choose a saved project explicitly. Attachment lasts only for this browser activation; it is never stored in the native conversation.');
    const projectName=field('Project name','input');projectName.maxLength=80;
    const projectList=field('Saved project');
    const projectButtons=[];
    const projectButton=(text,fn)=>{const b=button(text,fn);projectButtons.push(b);return b;};
    async function openProject(create=false,reopen=false) {
        if(!capable||projectBusy||model.project&&(model.status().importing||model.status().busy))return;
        const state=model.project?model.status():null;
        const id=reopen?state?.projectId:projectList.value;
        if(!create&&!id)throw Error('Select a saved project first.');
        if((state&&(state.dirty||state.busy||['conflict','uncertain'].includes(state.saveState))||!state&&model.get().scene?.commands.length) && !globalThis.confirm('Discard current visual edits and open the saved project? Pending operations may already have committed on the server.'))return;
        bundleStatus.textContent='';
        const token=++projectEpoch,epoch=actions.getSceneEvidence().snapshot.sessionEpoch;
        if(actions.getSnapshot().owner?.scope !== 'character')throw Error('Projects currently support single-character chats only.');
        const current=()=>!disposed&&token===projectEpoch&&actions.getSnapshot().sessionEpoch===epoch;
        projectBusy=true;render();
        let candidate,installed=false;
        try {
            const record=await(create?client.create(projectName.value.trim()):client.load(id));
            if(!current())return;
            candidate=await createProjectScene(record,client,actions,render,current);
            if(!current()){candidate.dispose();return;}
            model.dispose();model=candidate;installed=true;attachmentNotice='';render();
            const list=await client.list();if(current()){options(projectList,list.map(p=>[p.projectId,p.name+' · '+p.projectId.slice(0,8)]));projectList.value=record.projectId;}
        } finally {if(token===projectEpoch){if(!installed)projectEpoch--;projectBusy=false;}if(!disposed)render();}
    }
    projectButton('Create project and use with this chat',()=>openProject(true));
    const open=projectButton('Open project and use with this chat',()=>openProject(false));
    const reopen=projectButton('Discard and reopen attached project',()=>openProject(false,true));
    const save=projectButton('Save project',()=>model.project&&model.save());
    const detach=projectButton('Detach project',()=>{
        if(model.project&&(model.status().dirty||model.status().busy||['conflict','uncertain'].includes(model.status().saveState))&&!globalThis.confirm('Discard current visual edits and detach this project? Pending operations may already have committed on the server.'))return;
        attachmentNotice='Project detached by you. Saved global layouts remain available for explicit reopen.';bundleStatus.textContent='';projectEpoch++;model.dispose();model=createTransientScene(actions,render);return model.sync();
    });
    listen(projectList,'change',render);
    const bundleStatus=make('p','sillynovel-bundle-status');bundleStatus.setAttribute('role','status');target.append(bundleStatus);
    async function portable(file) {
        if(!bundleCapable||bundleBusy||projectBusy||model.project&&model.status().importing)return;
        const token=projectEpoch,epoch=actions.getSnapshot().sessionEpoch,captured=model,id=projectList.value;
        if(!file&&!id)throw Error('Select a saved project to export.');
        const current=()=>!disposed&&projectEpoch===token&&model===captured&&actions.getSnapshot().sessionEpoch===epoch;
        bundleBusy=true;bundleStatus.textContent=file?'Importing project bundle…':'Exporting saved project layout…';render();
        try {
            if(file) {
                const imported=await client.importBundle(file);if(!current())return;
                const list=await client.list();if(!current())return;
                options(projectList,list.map(p=>[p.projectId,p.name+' · '+p.projectId.slice(0,8)]));
                bundleStatus.textContent='Imported '+imported.name+' · '+imported.projectId+'. Not attached to this conversation. Select it and choose Open project and use with this chat. Current visuals and unsaved changes are preserved.';
            } else {
                const blob=await client.exportBundle(id);if(!current()||projectList.value!==id)return;
                const url=URL.createObjectURL(blob),link=make('a','');link.href=url;link.download='project.sillynovel';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
                bundleStatus.textContent='Exported saved layout and selected artwork only. Library labels and unselected alternatives do not travel in v1 bundles. Unsaved changes are excluded.';
            }
        } catch(error){if(current())bundleStatus.textContent=(file?'Import':'Export')+' failed: '+error.message;}
        finally{bundleBusy=false;if(!disposed)render();}
    }
    const exportProject=projectButton('Export project',()=>portable());
    const bundleFile=field('Import project bundle','input');bundleFile.type='file';bundleFile.accept='.sillynovel';
    listen(bundleFile,'change',()=>{const selected=bundleFile.files[0];bundleFile.value='';if(selected)run(()=>portable(selected));});
    run(async()=>{try{const cap=await client.capabilities();if(disposed)return;if(cap.apiVersion!==1||cap.schemaVersion!==2 || cap.catalogVersion!==1)throw Error('Incompatible storage');const list=await client.list();if(disposed)return;capable=true;cleanupCapable=cap.cleanupVersion===1;bundleCapable=cap.bundleVersion===1;if(!bundleCapable)bundleStatus.textContent='Project bundles require an updated compatible storage plugin.';options(projectList,list.map(p=>[p.projectId,p.name+' · '+p.projectId.slice(0,8)]));}catch(error){if(disposed)return;capable=false;unavailable='Plugin unavailable or incompatible ['+error.message+'] · session visuals remain available.';if(error.message==='AUTHENTICATED_ACCOUNT_REQUIRED')unavailable='Project storage requires a signed-in SillyTavern account. Session visuals remain available.';else if(error.message==='MIGRATION_REQUIRED')unavailable='Project storage needs explicit v1 backup/migration with the operator recovery tool. The original database is unchanged; session visuals remain available.';else if(error.message==='CSRF_REQUIRED')unavailable='Project storage requires host CSRF protection. Session visuals remain available.';}render();});
    const sceneArea=area('Scene','Arrange the manual cast. Presence hides artwork but keeps its position reserved. Offstage releases a position. Manual choices can replace locks; releasing a lock keeps its value.');
    row();
    const bg=field('Background');
    button('Apply background',()=>model.dispatch(bg.value ? {type:'setBackground',assetId:bg.value}:{type:'clearBackground'}));
    row();
    const preset=field('Test actor art');options(preset,[['','No art · manual actor'],...TEST_ACTORS.map(a=>[a.preset,a.description])]);preset.value='mira-a';
    const name=field('Session actor name','input');name.value='Mira';name.maxLength=80;
    listen(preset,'change',()=>{ name.value=TEST_ACTORS.find(a=>a.preset===preset.value)?.label ?? ''; });
    const registerActor=button('Register session actor',async()=>{const key=await model.register(preset.value,name.value);if(key){actor.value=key;render();}});
    row();
    const actor=field('Session actor');
    row();
    const presence=field('Presence');options(presence,[['true','Present'],['false','Absent']]);
    button('Apply presence',()=>model.dispatch({type:'setPresence',characterKey:actor.value,present:presence.value==='true'}));
    row();
    const slot=field('Position');options(slot,[['','Offstage'],['left','Left'],['center','Center'],['right','Right']]);
    const mode=field('Occupied slot action');options(mode,[['move','Move · refuse occupied'],['swap','Explicit swap'],['replace','Explicit replace']]);
    button('Apply position',()=>model.dispatch({type:'setSlot',characterKey:actor.value,slot:slot.value||null,mode:mode.value}));
    row();
    const outfit=field('Outfit');
    button('Apply outfit',()=>model.dispatch(outfit.value?{type:'setOutfit',characterKey:actor.value,assetId:outfit.value}:{type:'clearOutfit',characterKey:actor.value}));
    row();
    const expression=field('Expression · selected source only');
    const applyExpression=button('Apply expression',()=>model.dispatch(expression.value?{type:'setExpression',characterKey:actor.value,assetId:expression.value}:{type:'clearExpression',characterKey:actor.value}));
    row();
    const lockField=field('Lock field');options(lockField,['background','presence','slot','outfit'].map(x=>[x,x]));
    for(const type of ['lock','release'])button(type==='lock'?'Lock choice':'Release lock',()=>model.dispatch({type,field:lockField.value,...(lockField.value==='background'?{}:{characterKey:actor.value})}));
    area('Artwork Library','Import selects the artwork immediately. Save project commits labels, alternatives and layout together. Removing a library entry never deletes its bytes; unused-byte cleanup is a separate review and confirmation after saving.');
    const fileKind=field('Temporary image use');options(fileKind,[['background','Background'],['outfit','Selected actor outfit']]);
    const importLabel=field('PNG display label','input');importLabel.maxLength=80;
    const libraryAsset=field('Library artwork');
    const libraryLabel=field('Artwork label','input');libraryLabel.maxLength=80;
    const renameAsset=button('Save artwork label',()=>model.project&&model.renameAsset(libraryAsset.value,libraryLabel.value.trim()));
    const unregisterAsset=button('Remove artwork from library',()=>model.project&&model.unregisterAsset(libraryAsset.value,message=>globalThis.confirm(message)));
    listen(libraryAsset,'change',()=>{libraryLabel.value=model.get().media.get(libraryAsset.value)?.label??'';});
    const selectedArt=make('p','sillynovel-selected-art');sceneArea.append(selectedArt);
    const file=field('Temporary raster file','input');file.type='file';file.accept='image/png,image/jpeg,image/webp';
    listen(file,'change',()=>{const selected=file.files[0],kind=fileKind.value,key=actor.value;file.value='';if(selected)run(()=>model.importFile(selected,kind,key,importLabel.value),true);});
    target.append(make('h4','','Unused Project Assets'));
    const reviewUnused=button('Review unused artwork',()=>model.project&&model.reviewUnused());
    const cleanupList=make('div','sillynovel-cleanup-list');target.append(cleanupList);
    const cleanupSelected=make('p','sillynovel-cleanup-selected');target.append(cleanupSelected);
    const removeUnused=button('Remove selected unused artwork',()=>model.project&&model.removeUnused([...cleanupSelection],message=>globalThis.confirm(message)));
    const cleanupStatus=make('p','sillynovel-cleanup-status');cleanupStatus.setAttribute('role','status');target.append(cleanupStatus);
    const cleanupWarning=make('p','sillynovel-cleanup-warning');target.append(cleanupWarning);
    let displayedPreview=null;const cleanupSelection=new Set();
    listen(cleanupList,'change',event=>{const input=event.target;if(input.type!=='checkbox')return;if(input.checked)cleanupSelection.add(input.value);else cleanupSelection.delete(input.value);render();});
    const reset=button('Reset transient visuals',()=>model.reset());
    listen(actor,'change',render);
    listen(details,'keydown',event=>{if(event.key==='Escape'){details.open=false;summary.focus();event.stopPropagation();}});
    function image(el,url) {
        if(el.dataset.asset===(url??''))return;
        el.dataset.asset=url??'';el.hidden=!url;
        if(url) {el.src=url;} else el.removeAttribute('src');
    }
    listen(background,'error',()=>{background.hidden=true;feedback.textContent='Background unavailable · neutral stage. Text reading remains available.';});
    for(const {image:img,label} of slots.values())listen(img,'error',()=>{img.hidden=true;label.textContent+=' · art unavailable';});
    function render() {
        if(disposed)return;
        const {scene,actors,assets,media,notice,verifiedStamp}=model.get();
        const verified=verifiedStamp===evidenceStamp(actions.getSnapshot());
        const view=verified?scene?.view:null;
        options(bg,[['','Clear · neutral'],...assets.filter(a=>a.kind==='background').map(a=>[a.id,(media.get(a.id)?.label??a.id)+(model.project?' · '+media.get(a.id)?.assetId?.slice(0,8):'')])]);
        options(actor,actors.map(a=>[a.key,a.label+' · '+a.description+' · '+shortId(a.key)]));
        const active=actor.value;
        options(outfit,[['','Clear · default'],...assets.filter(a=>a.kind==='outfit' && (!model.project || a.characterKey===active)).map(a=>[a.id,(a.characterKey===active?'':'Other actor · ')+(media.get(a.id)?.label??a.id)+(model.project?' · '+media.get(a.id)?.assetId?.slice(0,8):'')])]);
        const member=view?.cast.find(a=>a.key===active);
        options(libraryAsset,assets.map(a=>[a.id,(a.kind==='background'?'Background':'Actor sprite')+' · '+(media.get(a.id)?.label??a.id)+' · '+media.get(a.id)?.assetId?.slice(0,8)+(a.characterKey?' · '+(actors.find(actor=>actor.key===a.characterKey)?.label??'Unknown actor')+' ['+a.characterKey.slice(0,8)+']':'')+(a.available?'':' · art unavailable')]));
        if(libraryLabel.dataset.ref!==libraryAsset.value){libraryLabel.dataset.ref=libraryAsset.value;libraryLabel.value=media.get(libraryAsset.value)?.label??'';}
        const artName=ref=>ref?(media.get(ref.id)?.label??ref.id)+(ref.status==='ready'?'':' · '+ref.status+' artwork'):'neutral / no artwork';
        selectedArt.textContent='Selected background: '+artName(view?.background)+(model.project&&view?.background?' · '+media.get(view.background.id)?.assetId:'')+' / Active actor: '+(member?member.label+' ['+shortId(member.key)+'] · '+(member.present?'present':'absent')+' · '+(member.slot??'offstage')+' · outfit: '+artName(member.outfit)+(model.project&&member.outfit?' · '+media.get(member.outfit.id)?.assetId:'')+' · locks: '+(Object.entries(member.locks).filter(([,v])=>v).map(([k])=>k).join(', ')||'none'):'none');
        if(view!==displayedView||active!==displayedActor){
            if(view!==displayedView)bg.value=view?.background?.id??'';
            presence.value=String(member?.present??true);slot.value=member?.slot??'';outfit.value=member?.outfit?.id??'';
            displayedView=view;displayedActor=active;
        }
        options(expression,[['','Clear · neutral'],...assets.filter(a=>a.kind==='expression').map(a=>[a.id,(a.characterKey===active && a.outfitId===(member?.outfit?.id??null)?'':'Incompatible · ')+(media.get(a.id)?.label??a.id)])]);
        const labels=view?.cast.map(a=>a.label+' ['+shortId(a.key)+'] '+(!a.present?'absent':a.slot??'offstage')+' · locks: '+Object.entries(a.locks).filter(([,v])=>v).map(([k])=>k).join(', '))??[];
        cast.textContent=labels.length?'Cast: '+labels.join(' / '):'No manual cast. Register actors in Scene.';
        cast.dataset.count=String(view?.cast.length??0);
        feedback.textContent=notice+(view?.backgroundLocked?' Background locked.':'');
        const bgRef=view?.background;
        image(background,bgRef?.status==='ready'?media.get(bgRef.id)?.url:null);
        if(bgRef && (bgRef.status!=='ready'||background.hidden))feedback.textContent+=' Background art unavailable · neutral fallback.';
        for(const [position,{figure,image:img,label}] of slots) {
            const a=view?.cast.find(a=>a.key===view.slots[position]);
            figure.hidden=!a;figure.dataset.actor=a?.key??'';
            if(!a){image(img,null);continue;}
            const ref=a.expression??a.outfit;
            const manual=actors.find(item=>item.key===a.key);
            const url=ref?(ref.status==='ready'?media.get(ref.id)?.url:null):manual?.defaultURL;
            image(img,url);label.textContent=a.label+' ['+shortId(a.key)+']'+(url?'':' · art unavailable');
        }
        const ready=Boolean(verified && scene?.context.selectedSourceKey);
        const state=model.project?model.status():null;
        const paused=projectBusy||Boolean(state?.importing);
        for(const e of controls)e.disabled=paused||Boolean(state?.cleanupBusy)||(e===reset ? false : !ready);
        const recovery=state&&['conflict','uncertain'].includes(state.saveState);
        const status=state?.busy?'Saving project…':state?.saveState==='conflict'?'Unsaved project changes · save conflicted':state?.saveState==='uncertain'?'Save outcome uncertain · inspect by explicit reopen':state?.saveState==='error'?'Save failed · edits retained':state?.dirty?'Unsaved project changes':state?'Saved project layout':'Unsaved session visuals';
        unsaved.textContent=status;unsaved.dataset.state=state?.busy?'pending':recovery?state.saveState:state?.saveState==='error'?'error':state?.dirty?'dirty':state?'saved':'session';
        projectStatus.textContent=projectBusy?'Opening project · visual edits paused…':state?state.name+' · revision '+state.revision+' · '+state.projectId.slice(0,8)+' · Attached for this browser activation'+(state.importing?' · importing PNG…':''):'No project attached. '+attachmentNotice+(!capable?unavailable:' Select one explicitly for this chat.');
        projectStatus.title=state?state.projectId:'';
        scope.textContent=state?'Saved global layouts and library persist. Message-specific visual history is not saved. Reload or switching conversations detaches; explicitly reopen.':'Session-only visuals are not saved. No remembered project attachment. '+(!capable?'Storage unavailable; reading and replying remain available.':'');
        for(const e of [projectName,projectList,...projectButtons])e.disabled=!capable||paused||!ready||actions.getSnapshot().owner?.scope!=='character';
        exportProject.disabled=exportProject.disabled||!bundleCapable||bundleBusy||!projectList.value;bundleFile.disabled=!bundleCapable||bundleBusy||paused;
        const preview=state?.cleanupPreview??null;
        if(preview!==displayedPreview){
            displayedPreview=preview;cleanupSelection.clear();
            cleanupList.replaceChildren(...(preview?.candidates??[]).map(a=>{
                const label=make('label','sillynovel-cleanup-item',a.assetId+' · '+a.width+' × '+a.height+' · '+a.byteCount+' bytes · SHA-256 '+a.sha256.slice(0,12));
                const input=make('input','');input.type='checkbox';input.value=a.assetId;label.prepend(input);return label;
            }));
        }
        const cleanupBlocked=!cleanupCapable||!state||recovery||paused||state.dirty||state.busy||state.cleanupBusy||bundleBusy||!ready;
        reviewUnused.disabled=cleanupBlocked;removeUnused.disabled=cleanupBlocked||!preview||cleanupSelection.size===0;
        for(const input of cleanupList.querySelectorAll('input'))input.disabled=cleanupBlocked;
        cleanupSelected.textContent=cleanupSelection.size+' selected · '+(preview?.candidates??[]).filter(a=>cleanupSelection.has(a.assetId)).reduce((sum,a)=>sum+a.byteCount,0)+' logical bytes';
        cleanupStatus.textContent=!cleanupCapable?'Cleanup requires an updated compatible storage plugin.':!state?'Explicitly open a saved project to review unused artwork.':recovery?'Discard and reopen the attached project before reviewing unused artwork.':state.dirty||state.importing||state.busy?'Save or discard unsaved changes and wait for imports and saves before cleanup.':state.cleanupNotice;
        cleanupWarning.textContent=preview?.warning??'Other tabs may have unsaved drafts using artwork absent from the saved project. Removal cannot be undone here; keep verified backups.';
        for(const e of projectButtons)if(e!==detach&&e!==exportProject)e.disabled=e.disabled||Boolean(state?.busy);
        open.disabled=open.disabled||!projectList.value;
        save.disabled=save.disabled||!state||state.busy||recovery;detach.disabled=detach.disabled||!state;reopen.disabled=reopen.disabled||!state;
        if(state){reset.disabled=true;preset.disabled=true;expression.disabled=true;file.accept='image/png';help.textContent='Project actors are manual identities with no native card binding. Global choices apply across all messages. Portable v1 bundles include selected artwork only, without library labels or unselected alternatives.';}
        else {file.accept='image/png,image/jpeg,image/webp';help.textContent=transientHelp;}
        for(const [control,sessionName,projectLabel] of [[name,'Session actor name','Project actor name'],[actor,'Session actor','Project actor'],[fileKind,'Temporary image use','Project image use'],[file,'Temporary raster file','Project PNG file']]){
            const text=state?projectLabel:sessionName;control.setAttribute('aria-label',text);control.parentElement.firstChild.textContent=text;
        }
        for(const control of [importLabel,libraryAsset,libraryLabel])control.parentElement.hidden=!state;
        for(const control of [renameAsset,unregisterAsset]){control.hidden=!state;control.disabled=control.disabled||!libraryAsset.value;}
        registerActor.textContent=state?'Register project actor':'Register session actor';
        preset.parentElement.hidden=Boolean(state);expression.parentElement.hidden=Boolean(state);applyExpression.hidden=Boolean(state);
    }
    function update(snapshot) {
        if(snapshot.sessionEpoch!==activation){
            activation=snapshot.sessionEpoch;projectEpoch++;projectBusy=false;bundleStatus.textContent='';
            if(model.project){attachmentNotice='Project detached after a native conversation switch. Explicitly reopen to use a saved global layout.';model.dispose();model=createTransientScene(actions,render);}
        }
        const stamp=evidenceStamp(snapshot);
        if(stamp===lastStamp)return;
        lastStamp=stamp;
        // Neutralize synchronously before the reader paints changed dialogue. A later
        // render can show art only when its accepted evidence stamp still matches.
        render();
        feedback.textContent='Checking the scene for this message…';
        run(()=>model.sync(false));
    }
    render();update(actions.getSnapshot());
    return {update,dispose(){disposed=true;projectEpoch++;for(const remove of removers)remove();model.dispose();}};
}
