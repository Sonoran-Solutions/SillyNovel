import { createProjectClient } from './project-client.mjs';
import { createProjectScene } from './project-scene.mjs';
import { createTransientScene, TEST_ACTORS, evidenceStamp } from './transient-scene.mjs';
import { supportsProjectConversation } from './host-adapter.mjs';
import { emptyDraft, draftProblems, exportText, referenceFilename, captureOf, stillCurrent, pngProblem, SIZE_HINTS, PROMPT_FILENAME, RESULT_LIMITS, PREVIEW_TIMEOUT_MS } from './image-workflow.mjs';
import { preflight, reviewText, createRequest, staleReason, createImageSession, WAIT_MS, DEFAULT_ALLOWANCE } from './image-request.mjs';

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
    const directorBar=make('div','sillynovel-director-bar');directorBar.hidden=true;
    const directorLine=make('p','sillynovel-director-line');directorLine.setAttribute('role','status');directorLine.tabIndex=-1;
    const resumeDirector=make('button','menu_button sillynovel-button','Resume');resumeDirector.type='button';resumeDirector.hidden=true;
    const ceilingNote=make('p','sillynovel-director-note','At the session ceiling. The ceiling is set in the extension settings.');ceilingNote.hidden=true;
    directorBar.append(directorLine,resumeDirector,ceilingNote);
    // Plain lists and no live region: excerpts are never announced as they arrive.
    const why=make('details','sillynovel-why');why.hidden=true;why.tabIndex=-1; // A click inside must leave focus here, or Escape has nothing to act on: the lists hold no control.
    const whySummary=make('summary','','Why this visual?'),whyBody=make('div','sillynovel-why__body');why.append(whySummary,whyBody);
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
    const nativeContext=make('p','sillynovel-native-context');
    stage.querySelector('header').after(unsaved,projectStatus,scope,nativeContext,details,art,cast,directorBar,why,feedback);
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
        const snapshot=actions.getSceneEvidence().snapshot;
        if(!supportsProjectConversation(snapshot.owner))throw Error('Select a verified native character or group conversation before attaching a project.');
        const token=++projectEpoch,epoch=snapshot.sessionEpoch;
        const current=()=>!disposed&&token===projectEpoch&&actions.getSceneEvidence().snapshot.sessionEpoch===epoch;
        projectBusy=true;render();
        let candidate,installed=false;
        try {
            const record=await(create?client.create(projectName.value.trim()):client.load(id));
            if(!current())return;
            candidate=await createProjectScene(record,client,actions,render,current);
            if(!current()){candidate.dispose();return;}
            if(reopen)model.endDirectorSession?.();model.dispose();model=candidate;installed=true;attachmentNotice='';await model.sync();render();
            const list=await client.list();if(current()){options(projectList,list.map(p=>[p.projectId,p.name+' · '+p.projectId.slice(0,8)]));projectList.value=record.projectId;}
        } finally {if(token===projectEpoch){if(!installed)projectEpoch--;projectBusy=false;}if(!disposed)render();}
    }
    projectButton('Create project and use with this chat',()=>openProject(true));
    const open=projectButton('Open project and use with this chat',()=>openProject(false));
    const reopen=projectButton('Discard and reopen attached project',()=>openProject(false,true));
    const save=projectButton('Save project',()=>model.project&&model.save());
    const detach=projectButton('Detach project',()=>{
        if(model.project&&(model.status().dirty||model.status().busy||['conflict','uncertain'].includes(model.status().saveState))&&!globalThis.confirm('Discard current visual edits and detach this project? Pending operations may already have committed on the server.'))return;
        attachmentNotice='Project detached by you. Saved global layouts remain available for explicit reopen.';bundleStatus.textContent='';projectEpoch++;model.endDirectorSession?.();model.dispose();model=createTransientScene(actions,render);return model.sync();
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
    const directorArea=make('div','sillynovel-director');
    const directorLabel=make('label','checkbox_label sillynovel-control','Automatic director for this project');
    const directorToggle=make('input','');directorToggle.type='checkbox';directorToggle.setAttribute('aria-describedby','sillynovel-director-help');directorLabel.prepend(directorToggle);
    const directorHelp=make('p','sillynovel-director-help','Off by default. After each completed reply, sends the last messages and your artwork labels to the connection you selected, counts against the usage of that connection, and only ever changes temporary expressions, the background and who is present, for this attachment; none of it is saved. The director waits while you type; a regenerate or swipe pressed while a director request is running can fail on a backend that handles one request at a time, and a swipe or regenerate recovers.');directorHelp.id='sillynovel-director-help';
    const directorStatus=make('p','sillynovel-director-status');directorStatus.setAttribute('role','status');
    directorArea.append(directorLabel,directorHelp,directorStatus);target.append(directorArea);
    listen(directorToggle,'change',()=>model.setDirectorEnabled?.(directorToggle.checked));
    const sceneArea=area('Scene','Arrange the manual cast. Presence hides artwork but keeps its position reserved. Offstage releases a position. Manual choices can replace locks; releasing a lock keeps its value.');
    row();
    const bg=field('Background');
    const backgroundCommand=()=>bg.value?{type:'setBackground',assetId:bg.value}:{type:'clearBackground'};
    button('Apply background',()=>model.dispatch(backgroundCommand()));
    const movableAction=(what,command)=>{const e=button('Apply and let the director move it',()=>model.applyMovable?.(command()));e.setAttribute('aria-label','Apply and let the director move it: '+what);return e;};
    const applyBackgroundMovable=movableAction('background',backgroundCommand);
    // O08: the existing lock flag is the mark. A toggle is a global release or lock, so F8 clears the overlay and the project goes dirty.
    const movableToggle=(name,field,characterKey)=>{
        const wrap=make('label','checkbox_label sillynovel-control sillynovel-movable',name),input=make('input',''),state=make('span','sillynovel-movable__state');
        input.type='checkbox';input.setAttribute('aria-label',name);input.dataset.field=field;if(characterKey)input.dataset.actor=characterKey;
        wrap.prepend(input);wrap.append(state);return wrap;
    };
    const movableChange=event=>{const {checked,dataset:{field,actor:key}}=event.target;run(()=>model.dispatch({type:checked?'release':'lock',field,...(key?{characterKey:key}:{})}),true);};
    const movableBackground=movableToggle('Director may move the background','background');target.append(movableBackground);
    listen(movableBackground,'change',movableChange);
    row();
    const preset=field('Test actor art');options(preset,[['','No art · manual actor'],...TEST_ACTORS.map(a=>[a.preset,a.description])]);preset.value='mira-a';
    const name=field('Session actor name','input');name.value='Mira';name.maxLength=80;
    listen(preset,'change',()=>{ name.value=TEST_ACTORS.find(a=>a.preset===preset.value)?.label ?? ''; });
    const registerActor=button('Register session actor',async()=>{const key=await model.register(preset.value,name.value);if(key){actor.value=key;render();}});
    row();
    const actor=field('Session actor');
    row();
    const presence=field('Presence');options(presence,[['true','Present'],['false','Absent']]);
    const presenceCommand=()=>({type:'setPresence',characterKey:actor.value,present:presence.value==='true'});
    button('Apply presence',()=>model.dispatch(presenceCommand()));
    const applyPresenceMovable=movableAction('presence',presenceCommand);
    row();
    const movableActors=make('div','sillynovel-movable-list');target.append(movableActors);listen(movableActors,'change',movableChange);
    row();
    const slot=field('Position');options(slot,[['','Offstage'],['left','Left'],['center','Center'],['right','Right']]);
    const mode=field('Occupied slot action');options(mode,[['move','Move · refuse occupied'],['swap','Explicit swap'],['replace','Explicit replace']]);
    button('Apply position',()=>model.dispatch({type:'setSlot',characterKey:actor.value,slot:slot.value||null,mode:mode.value}));
    row();
    const outfit=field('Outfit');
    button('Apply outfit',()=>model.dispatch(outfit.value?{type:'setOutfit',characterKey:actor.value,assetId:outfit.value}:{type:'clearOutfit',characterKey:actor.value}));
    row();
    const expression=field('Expression to apply · selected source only');
    const applyExpression=button('Apply expression',()=>model.dispatch(expression.value?{type:'setExpression',characterKey:actor.value,assetId:expression.value}:{type:'clearExpression',characterKey:actor.value}));
    const clearExpression=button('Clear expression',()=>model.dispatch({type:'clearExpression',characterKey:actor.value}));
    const expressionContext=make('p','sillynovel-expression-context');expressionContext.setAttribute('role','status');target.append(expressionContext);
    row();
    const expressionLabel=field('Temporary expression label','input');expressionLabel.maxLength=80;
    const expressionFile=field('Temporary expression PNG','input');expressionFile.type='file';expressionFile.accept='image/png';
    listen(expressionFile,'change',()=>{const selected=expressionFile.files[0],captured=model,key=actor.value;expressionFile.value='';if(selected)run(async()=>{const id=await captured.importExpression(selected,key,expressionLabel.value,()=>model===captured&&actor.value===key);if(id&&model===captured){expression.value=id;render();}},true);});
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
    // M3.1 manual exchange stays explicit; M3.2 sends only the reviewed draft prompt and negative on Submit. A result enters only by Import and apply.
    // A button disclosure, not a nested <details>: one summary inside the controls keeps every existing selector unambiguous.
    const workflow=make('div','sillynovel-image-workflow'),workflowToggle=make('button','menu_button sillynovel-button','Image workflow'),workflowBody=make('div','sillynovel-controls__panel');
    workflowToggle.type='button';workflowBody.id='sillynovel-image-workflow-body';workflowBody.hidden=true;workflowToggle.setAttribute('aria-controls',workflowBody.id);workflowToggle.setAttribute('aria-expanded','false');
    const openWorkflow=open=>{workflowBody.hidden=!open;workflowToggle.setAttribute('aria-expanded',String(open));};
    listen(workflowToggle,'click',()=>openWorkflow(workflowBody.hidden));
    workflow.append(workflowToggle,workflowBody);target.append(workflow);
    // Own controls, outside `controls`: drafting does not wait for a resolved message. Import and apply does, like the PNG import (layoutReady).
    const wfField=(name,tag)=>{const label=make('label','sillynovel-control',name),e=make(tag,'');e.setAttribute('aria-label',name);label.append(e);workflowBody.append(label);return e;};
    const wfButton=(text,fn)=>{const e=make('button','menu_button sillynovel-button',text);e.type='button';listen(e,'click',()=>wfRun(fn));workflowBody.append(e);return e;};
    workflowBody.append(make('p','','Write a prompt, copy or download it, make the image in any tool you choose, then import the PNG here. SillyNovel sends nothing to an image service and fills nothing in from the chat.'));
    const wfLabel=wfField('Background label','input');wfLabel.maxLength=80;
    const wfPrompt=wfField('Image prompt','textarea'),wfNegative=wfField('Negative prompt','textarea'),wfStyle=wfField('Style note','input');
    const wfSize=wfField('Size hint','select');options(wfSize,SIZE_HINTS.map(h=>[h,h[0].toUpperCase()+h.slice(1)]));
    const wfRefs=[0,1,2].map(i=>wfField('Reference '+(i+1),'select'));
    const wfText=make('pre','sillynovel-image-workflow__text');wfText.setAttribute('aria-label','Prompt export preview');wfText.tabIndex=0;
    const wfProblems=make('p','sillynovel-image-workflow__problems');workflowBody.append(wfText,wfProblems);
    // Each field copies alone, so a tool's positive-prompt box never receives the headings or the negative prompt (owner acceptance of PR A).
    const copyButtons=[['prompt','Prompt'],['negativePrompt','Negative prompt'],['styleNote','Style note']].map(([key,name])=>[key,wfButton('Copy '+name.toLowerCase(),async()=>{
        try{await navigator.clipboard.writeText(draft()[key]);wfStatus.textContent=name+' copied.';}catch{wfStatus.textContent='Clipboard unavailable · use Download prompt instead.';}})]);
    const downloadPrompt=wfButton('Download prompt',()=>{saveFile(new Blob([exportText(draft())],{type:'text/plain;charset=utf-8'}),PROMPT_FILENAME);wfStatus.textContent='Prompt download started as '+PROMPT_FILENAME+'.';});
    const refButtons=[0,1,2].map(i=>wfButton('Download reference '+(i+1),()=>downloadReference(i)));
    const wfNote=make('p','sillynovel-image-workflow__note');workflowBody.append(wfNote);
    const resultFile=wfField('Result PNG','input');resultFile.type='file';resultFile.accept='image/png';
    const resultImage=make('img','sillynovel-image-workflow__preview');resultImage.alt='Chosen result, not imported';resultImage.hidden=true;workflowBody.append(resultImage);
    const importResult=wfButton('Import and apply background',()=>applyResult()),discardResult=wfButton('Discard preview',()=>clearPreview('Preview discarded · nothing was uploaded.'));
    const generation=make('div','sillynovel-image-workflow__generation');workflowBody.append(generation);generation.append(make('p','','Generate on this host'));
    const imageUnavailable=make('p','','Host image generation is not available to SillyNovel on this host'),imageControls=make('div','sillynovel-controls__panel');generation.append(imageUnavailable,imageControls);
    const imageToggle=wfField('Image session on this host','input');imageToggle.type='checkbox';imageToggle.parentElement.classList.add('sillynovel-image-workflow__session');imageControls.append(imageToggle.parentElement);
    const allowanceLine=make('p',''),generationReview=make('pre','sillynovel-image-workflow__review'),generationProblems=make('p','sillynovel-image-workflow__generation-problems'),workflowPin=make('p','');
    generationReview.setAttribute('aria-label','Generation review');generationReview.tabIndex=0;imageControls.append(allowanceLine,generationReview,generationProblems,workflowPin);
    const submitImage=wfButton('Submit',()=>submitGeneration()),cancelImage=wfButton('Cancel',()=>cancelGeneration());imageControls.append(submitImage,cancelImage);
    const stopWarning=make('p','','Stop host job asks ComfyUI to interrupt whatever it is running now, not only this request.');stopWarning.id='sillynovel-image-stop-warning';imageControls.append(stopWarning);
    const stopImage=wfButton('Stop host job',()=>stopGeneration()),abandonImage=wfButton('Abandon',()=>abandonGeneration());stopImage.setAttribute('aria-describedby',stopWarning.id);imageControls.append(stopImage,abandonImage);
    const wfStatus=make('p','sillynovel-image-workflow__status');wfStatus.setAttribute('role','status');workflowBody.append(wfStatus);
    let wfModel=model,wfRevision=0,wfBusy=false,resultPreview=null,previewSeq=0,layoutReady=false;
    const session=createImageSession();
    let pending=null,orphan=null,inspection=null,workflowSha256=null,review=null,problems=[],reviewDraft=null,imageStarting=false,imageSubmitting=false,imageEpoch=0,imageSeq=0;
    const IMAGE_PROBLEMS={SEAM_MISSING:'Host image generation is not available to SillyNovel on this host.',SOURCE_NOT_COMFY:"The host's image source is not ComfyUI.",COMFY_TYPE_NOT_STANDARD:'Only standard ComfyUI is supported, not RunPod.',
        URL_INVALID:'The ComfyUI address must be this machine (localhost, 127.0.0.1 or [::1]).',URL_NOT_LOOPBACK:'The ComfyUI address must be this machine (localhost, 127.0.0.1 or [::1]).',
        MODE_FREE_EXTEND:"Turn off free extend in the host's Image Generation settings.",MODE_MULTIMODAL:"Turn off multimodal captioning in the host's Image Generation settings.",MODE_REFINE:"Turn off refine mode in the host's Image Generation settings.",MODE_INTERACTIVE:"Turn off interactive mode in the host's Image Generation settings.",MODE_FUNCTION_TOOL:"Turn off function tool in the host's Image Generation settings.",
        PROMPT_EMPTY:'Write a prompt.',PROMPT_RESERVED_TRIGGER:'That prompt is a host trigger word; write a description instead.',PROMPT_CHAR_PREFIX:"A prompt may not start with 'char' or use {{charPrefix}}.",
        PROMPT_MACRO:'Remove {{ }}, <USER>-style markers and %placeholders% from the prompt.',NEGATIVE_MACRO:'Remove {{ }}, <USER>-style markers and %placeholders% from the negative prompt.',PREFIX_MACRO:'Remove {{ }}, <USER>-style markers and %placeholders% from the host prompt prefix.',NEGATIVE_PREFIX_MACRO:'Remove {{ }}, <USER>-style markers and %placeholders% from the host negative prefix.',
        PREFIX_MARKER_REPEATED:'The host prompt prefix has more than one {prompt} marker.',WORKFLOW_HASH_MISSING:'The workflow could not be read from the host.',WORKFLOW_NAME_MISSING:'The workflow could not be read from the host.',WORKFLOW_UNPARSEABLE:'The workflow must be a JSON object.',WORKFLOW_PROMPT_PLACEHOLDER:'The workflow must contain exactly one quoted %prompt% and one quoted %negative_prompt% placeholder.',
        WORKFLOW_SAVE_NODES:'The workflow must contain exactly one SaveImage node.',WORKFLOW_LOAD_IMAGE:'The workflow may not contain LoadImage nodes.',WORKFLOW_NODE_NOT_ALLOWED:'The workflow contains a node outside the six allowed node types.',WORKFLOW_AVATAR:'The workflow may not contain avatar placeholders.',WORKFLOW_CUSTOM_PLACEHOLDERS:'The workflow may not use custom placeholders.',WORKFLOW_CHANGED:'The workflow changed; turn the image session off and on to review it again.',
        DIMENSIONS_INVALID:'Width and height must be positive and within 4096 pixels and 16 million pixels.',HOST_NO_RESULT:'The host returned no image.',HOST_THREW:"The host's image command failed.",DRAFT_CHANGED:'The draft changed; review it before submitting.',INVALID_REQUEST:'The request identity is unavailable; nothing was sent.'};
    const imageProblem=({code,detail})=>code==='SELECTION_STALE'?'A saved '+String(detail).split(':')[0]+" is not among the host's loaded options; reselect it in the host.":code==='OPTIONS_MISSING'?"The host has not loaded its "+detail+' options yet; open Image Generation settings and connect.':code.startsWith('RESULT_')?"The host's result was refused: "+code+'.':(IMAGE_PROBLEMS[code]??code)+(code==='WORKFLOW_NODE_NOT_ALLOWED'&&detail?' '+detail:'');
    const STALE_REASONS={CAPTURE_STALE:'the project, conversation or draft changed',HOST_CHAT_CHANGED:'the host conversation changed',CATALOG_CHANGED:'the project catalog changed',LAYOUT_CHANGED:'the scene layout changed',LOCK_CHANGED:'the manual locks changed',WORKFLOW_CHANGED:'the workflow changed'};
    const PROBLEMS={PROMPT_REQUIRED:'Write a prompt to export.',PROMPT_TOO_LONG:'The prompt is over 8 KiB.',NEGATIVE_PROMPT_TOO_LONG:'The negative prompt is over 2 KiB.',STYLE_NOTE_TOO_LONG:'The style note is over 1 KiB.',
        BAD_LABEL:'Use a label of 1–80 characters on one line.',DUPLICATE_REFERENCE:'A reference is selected twice.',UNKNOWN_REFERENCE:'A reference is no longer in this project.',REFERENCE_CHANGED:'A reference changed; select it again.',
        NOT_PNG:'Choose a PNG file.',PNG_TOO_LARGE:'The PNG is over 5 MiB.',PNG_DIMENSIONS:'The PNG must be at most 4096 pixels on an edge and 16 million pixels.',ANIMATED_PNG:'Animated PNGs are unsupported.',MALFORMED_PNG:'The PNG is damaged or incomplete.',
        DECODE_TIMEOUT:'The preview took over 10 seconds and was abandoned.',STALE:'The project changed while this was running; nothing was applied.',ASSET_UNAVAILABLE:'That reference is unavailable.',ASSET_DIGEST:'That reference failed its digest check.',INVALID_ASSET:'That reference is not a valid stored PNG.'};
    const describe=code=>PROBLEMS[code]??code;
    function wfRun(fn){const captured=model;Promise.resolve().then(fn).catch(error=>{if(!disposed&&model===captured)wfStatus.textContent='Image workflow: '+describe(error.message);}).finally(()=>{if(!disposed)renderWorkflow();});}
    const now=draftRevision=>({projectModel:model.project?model:null,projectId:model.project?model.status().projectId:null,sessionEpoch:actions.getSnapshot().sessionEpoch,draftRevision});
    // One per library PNG; the hash is the one checked when the art was installed. Expressions are temporary and never references.
    const references=()=>{if(!model.project)return[];const {assets,media}=model.get(),seen=new Map();for(const a of assets){const item=media.get(a.id);if(a.kind!=='expression'&&a.available&&item?.assetId&&/^[0-9a-f]{64}$/.test(a.revision)&&!seen.has(item.assetId))seen.set(item.assetId,{assetId:item.assetId,sha256:a.revision,label:item.label,kind:a.kind});}return[...seen.values()];};
    // ponytail: byteCount 0 because project-client refuses any stored asset over 5 MiB, so three stay within LIMITS.referenceBytes; pass real sizes if that cap rises.
    const catalog=refs=>refs.map(({assetId,sha256})=>({assetId,sha256,byteCount:0}));
    const draft=()=>{const refs=references();return {...emptyDraft(),label:wfLabel.value,prompt:wfPrompt.value,negativePrompt:wfNegative.value,styleNote:wfStyle.value,sizeHint:wfSize.value,
        references:wfRefs.map(s=>s.value).filter(Boolean).map(assetId=>({assetId,sha256:refs.find(r=>r.assetId===assetId)?.sha256??'0'.repeat(64)}))};};
    const nowFull=()=>({...now(wfRevision),hostChatKey:actions.image.hostChatKey(),catalogRevision:model.project?model.status().revision:null,layoutRevision:model.project?model.status().sceneRevision:null,lockState:model.project?model.globalLocks():{},workflowSha256:inspection?.workflowSha256});
    function reviewGeneration(){
        const d=draft();reviewDraft={prompt:d.prompt,negativePrompt:d.negativePrompt};
        ({review,problems}=preflight({...inspection,snapshot:inspection?.snapshot??{},draft:reviewDraft}));
        for(const missing of inspection?.missing??[]){const p=typeof missing==='string'?{code:missing}:missing;if(!problems.some(item=>item.code===p.code))problems.push(p);}
        if(inspection?.workflowSha256!==workflowSha256)problems.push({code:'WORKFLOW_CHANGED'});
        review.ok=problems.length===0;
    }
    function endImageSession(){
        // A call that never settles must stay abandonable after a chat switch, detach or dispose: keep it as the orphan with its deadline.
        if(pending){if(session.snapshot().requests[pending.id]==='pending')session.cancel(pending.id);pending.cancelled=true;if(disposed)clearTimeout(pending.timer);orphan=pending;}
        session.end();imageEpoch++;imageStarting=false;imageSubmitting=false;pending=null;
        inspection=null;workflowSha256=null;review=null;problems=[];reviewDraft=null;imageToggle.checked=false;
        if(resultPreview?.generated)clearPreview();
    }
    listen(imageToggle,'change',()=>wfRun(async()=>{
        if(!imageToggle.checked){if(pending){if(session.snapshot().requests[pending.id]==='pending')session.cancel(pending.id);pending.cancelled=true;}session.end();imageEpoch++;imageStarting=false;imageSubmitting=false;renderWorkflow();return;}
        if(session.snapshot().on||imageStarting)return;
        const captured=model,epoch=actions.getSnapshot().sessionEpoch,token=++imageEpoch;imageStarting=true;renderWorkflow();
        try{const inspected=await actions.image.inspect();
            if(disposed||captured!==model||epoch!==actions.getSnapshot().sessionEpoch||token!==imageEpoch)return;
            inspection=inspected;workflowSha256=inspected.workflowSha256;session.begin(workflowSha256);reviewGeneration();
        }catch{if(!disposed&&captured===model&&epoch===actions.getSnapshot().sessionEpoch&&token===imageEpoch)wfStatus.textContent='The host image settings could not be read; nothing was sent.';}
        finally{if(token===imageEpoch)imageStarting=false;}
    }));
    function renderGeneration(){
        const seam=actions.image?.available(),available=Boolean(seam?.ok||seam?.missing.join()==='SlashCommandAbortController'),state=session.snapshot(),job=pending??orphan,outcome=job?state.requests[job.id]:null;
        imageUnavailable.hidden=available;imageControls.hidden=!available;if(!available)return;
        imageToggle.checked=state.on||imageStarting;
        allowanceLine.textContent='Submissions used '+state.used+' of '+DEFAULT_ALLOWANCE;
        if(state.on&&inspection)reviewGeneration();
        generationReview.hidden=!review;generationReview.textContent=review?reviewText(review):'';generationReview.classList.toggle('sillynovel-image-workflow__refused',Boolean(problems.length));
        generationProblems.textContent=[...problems.map(imageProblem),...(state.on&&state.used>=state.allowance?['All '+state.allowance+' submissions in this image session are used.']:[]),...(state.inFlight!==null&&!pending?['A request from before is still running on the host; Submit returns when it settles or after Abandon.']:[])].join(' ');
        workflowPin.hidden=!workflowSha256;workflowPin.textContent=workflowSha256?'Session workflow SHA-256: '+workflowSha256:'';
        submitImage.disabled=!state.on||!review?.ok||state.inFlight!==null||imageSubmitting||state.used>=state.allowance||!model.project;
        cancelImage.disabled=!pending||outcome!=='pending';
        stopImage.disabled=!pending||pending.timer===null||!['pending','cancelled'].includes(outcome)||!pending.controller;
        abandonImage.hidden=!job||!(outcome==='timeout-unknown'||outcome==='cancelled'&&job.expired);abandonImage.disabled=abandonImage.hidden;
    }
    function cancelGeneration(){
        if(!pending)return;const outcome=session.snapshot().requests[pending.id];
        if(outcome==='pending')session.cancel(pending.id);else if(outcome!=='cancelled')return;
        pending.cancelled=true;wfStatus.textContent='Cancelled · permission to apply withdrawn; the host keeps polling until the job is terminal';renderWorkflow();
    }
    function stopGeneration(){
        if(stopImage.disabled||!pending)return;
        try{pending.controller.abort('Stopped by SillyNovel');}finally{cancelGeneration();}
    }
    function abandonGeneration(){
        const job=pending??orphan;if(!job||abandonImage.disabled)return;
        session.abandon(job.id);clearTimeout(job.timer);if(pending===job)pending=null;if(orphan===job)orphan=null;wfStatus.textContent='Abandoned · the unit stays spent.';renderWorkflow();
    }
    function dropGeneration(job){
        if(session.snapshot().inFlight===job.id)session.settle(job.id,'stale');
        if(pending===job)pending=null;if(orphan===job)orphan=null;if(!disposed)renderWorkflow();
    }
    function discardGeneration(job,reason,path){
        session.settle(job.id,'stale');pending=null;
        wfStatus.textContent='Result discarded: '+(STALE_REASONS[reason]??reason)+(path?'; the host kept a copy at '+path:'; no host file was returned.');renderWorkflow();
    }
    async function submitGeneration(){
        if(submitImage.disabled)return;
        const capture=captureOf(now(wfRevision)),token=imageEpoch,shown=reviewText(review);let job=null;imageSubmitting=true;renderWorkflow();
        try{
            // Refresh the host before hashing; changed settings must be shown for another explicit Submit.
            const inspected=await actions.image.inspect();
            if(disposed||token!==imageEpoch||!session.snapshot().on||!stillCurrent(capture,now(wfRevision)))return;
            inspection=inspected;reviewGeneration();
            if(!review.ok||reviewText(review)!==shown){wfStatus.textContent='The host image settings changed · review them before submitting.';return;}
            const reviewed=review,raw={...reviewDraft},payloadSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(shown))),byte=>byte.toString(16).padStart(2,'0')).join('');
            if(disposed||token!==imageEpoch||!session.snapshot().on||!stillCurrent(capture,now(wfRevision)))return;
            const d=draft();if(d.prompt!==raw.prompt||d.negativePrompt!==raw.negativePrompt)throw Error('DRAFT_CHANGED');
            const controller=actions.image.createController();if(!controller)throw Error('SEAM_MISSING');
            const id=++imageSeq,request=createRequest({capture:now(wfRevision),hostChatKey:actions.image.hostChatKey(),catalogRevision:model.status().revision,layoutRevision:model.status().sceneRevision,lockState:model.globalLocks(),review:reviewed,workflowSha256,payloadSha256,id,submittedAt:Date.now()});
            session.submit(request);
            job={id,request,controller,timer:null,cancelled:false,timedOut:false,expired:false};pending=job;imageSubmitting=false;
            // A cancelled call that never settles becomes abandonable only at the deadline (plan 3.5), so Cancel cannot free the slot for a new host job at once.
            job.timer=setTimeout(()=>{if((pending===job||orphan===job)&&session.snapshot().requests[id]==='cancelled'){job.expired=true;if(!disposed)renderWorkflow();return;}
                if(pending!==job||session.snapshot().requests[id]!=='pending')return;session.timeout(id);job.timedOut=true;wfStatus.textContent="No result after 120 s · outcome unknown; the slot stays reserved. Check ComfyUI's queue and the host's image folder; the host keeps polling until the job is terminal.";renderWorkflow();},WAIT_MS);
            wfStatus.textContent='Generating on '+new URL(reviewed.destination.url).host+' · reading and replying continue';renderWorkflow();
            let result;
            try{result=await actions.image.request({prompt:raw.prompt,negative:raw.negativePrompt,controller:job.controller});}catch{result={ok:false,code:'HOST_THREW'};}
            clearTimeout(job.timer);job.timer=null;
            if(pending!==job||disposed){dropGeneration(job);const late=!disposed&&!pending&&result.path?staleReason(request,nowFull()):null;if(late)wfStatus.textContent='Result discarded: '+(STALE_REASONS[late]??late)+'; the host kept a copy at '+result.path;return;}
            if(job.cancelled||job.timedOut){session.settle(id,'stale');pending=null;wfStatus.textContent=(job.timedOut?'No result within 120 s':'Cancelled')+' · result discarded'+(result.path?'; the host kept a copy at '+result.path:'.');return;}
            let reason=staleReason(request,nowFull());if(reason){discardGeneration(job,reason,result.path);return;}
            if(!result.ok){session.settle(id,'failed');pending=null;wfStatus.textContent=imageProblem(result);return;}
            let fetched;
            try{fetched=await actions.image.fetchResult(result.path);}catch{fetched={ok:false,code:'RESULT_FETCH_FAILED',path:result.path};}
            if(pending!==job||disposed){dropGeneration(job);return;}
            if(job.cancelled||job.timedOut){session.settle(id,'stale');pending=null;wfStatus.textContent='Cancelled · result discarded; the host kept a copy at '+result.path;return;}
            if(fetched.ok){
                const latest=await actions.image.inspect();if(pending===job)inspection=latest;if(!latest.ok)fetched={ok:false,code:'RESULT_REVIEW_FAILED',path:result.path};
                if(pending!==job||disposed){dropGeneration(job);return;}
                if(job.cancelled||job.timedOut){session.settle(id,'stale');pending=null;wfStatus.textContent='Cancelled · result discarded; the host kept a copy at '+result.path;return;}
            }
            if(!fetched.ok){session.settle(id,'failed');pending=null;wfStatus.textContent=imageProblem(fetched)+' The host kept a copy at '+result.path;return;}
            reason=staleReason(request,nowFull());if(reason){discardGeneration(job,reason,result.path);return;}
            clearPreview();session.settle(id,'candidate');pending=null;
            resultPreview={file:fetched.file,url:URL.createObjectURL(fetched.file),capture:captureOf(now(0)),generated:{id,path:result.path,request}};resultImage.src=resultPreview.url;resultImage.hidden=false;
            wfStatus.textContent='Candidate, not imported · the host kept a copy at '+result.path+'. Import and apply it, or discard it.';
        }catch(error){if(job&&pending===job){clearTimeout(job.timer);session.settle(job.id,'failed');pending=null;}if(!disposed&&token===imageEpoch&&stillCurrent(capture,now(wfRevision)))wfStatus.textContent='Image workflow: '+imageProblem({code:error.message});}
        finally{if(!job&&token===imageEpoch)imageSubmitting=false;if(!disposed)renderWorkflow();}
    }
    function saveFile(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    async function downloadReference(i){
        const assetId=wfRefs[i].value,expected=references().find(r=>r.assetId===assetId)?.sha256;
        if(!model.project||!assetId||draftProblems(draft(),catalog(references())).length)return;
        const capture=captureOf(now(wfRevision));wfBusy=true;renderWorkflow();
        try{const {blob,hash}=await capture.projectModel.readReference(assetId);
            if(!stillCurrent(capture,now(wfRevision)))throw Error('STALE');
            if(hash!==expected)throw Error('REFERENCE_CHANGED');
            saveFile(blob,referenceFilename(i));wfStatus.textContent='Reference '+(i+1)+' download started as '+referenceFilename(i)+'. It is the stored file and may contain embedded PNG metadata.';
        }finally{wfBusy=false;}
    }
    function clearPreview(message){previewSeq++;if(resultPreview?.generated&&session.snapshot().requests[resultPreview.generated.id]==='candidate')session.discard(resultPreview.generated.id);if(resultPreview)URL.revokeObjectURL(resultPreview.url);resultPreview=null;resultImage.hidden=true;resultImage.removeAttribute('src');if(message!==undefined)wfStatus.textContent=message;}
    // A preview belongs to the attachment, not to draft edits: the label is read when importing (draft revision 0 on both sides).
    async function choosePreview(file){
        clearPreview('Checking the PNG · nothing is uploaded.');const seq=previewSeq;
        if(!model.project)throw Error('Attach a saved project first.');
        if(file.size>RESULT_LIMITS.bytes)throw Error('PNG_TOO_LARGE');
        const capture=captureOf(now(0)),problem=pngProblem(new Uint8Array(await file.arrayBuffer()));
        if(problem)throw Error(problem);
        const url=URL.createObjectURL(file),image=new Image();let timer;
        try{image.src=url;await Promise.race([image.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DECODE_TIMEOUT')),PREVIEW_TIMEOUT_MS);})]);
            if(seq!==previewSeq||!stillCurrent(capture,now(0)))throw Error('STALE');
        }catch(error){URL.revokeObjectURL(url);throw error;}finally{clearTimeout(timer);}
        resultPreview={file,url,capture};resultImage.src=url;resultImage.hidden=false;
        wfStatus.textContent='Preview only · nothing uploaded. Import and apply it, or discard it.';
    }
    listen(resultFile,'change',()=>{const selected=resultFile.files[0];resultFile.value='';if(selected)wfRun(()=>choosePreview(selected));});
    async function applyResult(){
        const chosen=resultPreview;
        if(!chosen)return;
        if(!stillCurrent(chosen.capture,now(0))){clearPreview('The project changed · preview discarded, nothing uploaded.');return;}
        if(!layoutReady){wfStatus.textContent='Wait for the selected message to settle, then import.';return;}
        if(projectBusy||model.status().importing)return;
        if(chosen.generated){
            const inspected=await actions.image.inspect();if(resultPreview!==chosen||disposed)return;inspection=inspected;
            const reason=staleReason(chosen.generated.request,nowFull());if(reason){clearPreview('Result discarded: '+(STALE_REASONS[reason]??reason)+'; the host kept a copy at '+chosen.generated.path);return;}
            if(!layoutReady||projectBusy||model.status().importing)return;
        }
        await model.importFile(chosen.file,'background',undefined,wfLabel.value.trim());
        if(resultPreview===chosen){if(chosen.generated)session.imported(chosen.generated.id);clearPreview('Imported and applied as the background · unsaved project change. Save project to keep it.');}
    }
    for(const e of [wfLabel,wfPrompt,wfNegative,wfStyle])listen(e,'input',()=>{wfRevision++;renderWorkflow();});
    for(const e of [wfSize,...wfRefs])listen(e,'change',()=>{wfRevision++;renderWorkflow();});
    listen(workflowBody,'keydown',event=>{if(event.key==='Escape'){openWorkflow(false);workflowToggle.focus();event.stopPropagation();}});
    function renderWorkflow(){
        if(wfModel!==model){
            // Your text survives attach, detach and replacement (owner direction on PR B); references and previews belong to one attachment and never carry over.
            endImageSession();const left=Boolean(wfModel.project);for(const s of wfRefs)s.value='';wfModel=model;wfRevision++;clearPreview(left?'Project changed: references and any preview cleared; your text is kept.':'');
        }
        const attached=Boolean(model.project),refs=references(),d=draft(),text=draftProblems(d),all=draftProblems(d,catalog(refs)),importing=attached&&model.status().importing;
        for(const s of wfRefs){options(s,[['','None'],...refs.map(r=>[r.assetId,(r.kind==='background'?'Background':'Actor sprite')+' · '+r.label])]);s.disabled=!attached;}
        wfText.textContent=text.length?'':exportText(d);wfText.hidden=Boolean(text.length);
        wfProblems.textContent=all.map(p=>describe(p.code)).join(' ');
        for(const [key,e] of copyButtons)e.disabled=Boolean(text.length)||!d[key];
        downloadPrompt.disabled=Boolean(text.length);
        refButtons.forEach((e,i)=>{e.hidden=!wfRefs[i].value;e.disabled=!attached||wfBusy||Boolean(all.length);});
        resultFile.disabled=!attached||importing;
        importResult.textContent=attached?'Import and apply background to '+model.status().name:'Import and apply background';
        importResult.disabled=!resultPreview||importing||projectBusy||!layoutReady;discardResult.disabled=!resultPreview;
        wfNote.textContent=attached?'Import adds the PNG to this project, sets it as the background and locks it, like any manual import. Save project to keep it.':'Attach a saved project to download references or import a result. The prompt can be copied or downloaded now.';
        renderGeneration();
    }
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
    for(const {image:img,label} of slots.values())listen(img,'error',()=>{if(model.project&&img.dataset.expression){const id=img.dataset.expression;img.dataset.expression='';model.expressionFailed(id);}else{img.hidden=true;label.textContent+=' · art unavailable';}});
    listen(why,'keydown',event=>{if(event.key==='Escape'){why.open=false;whySummary.focus();event.stopPropagation();}});
    listen(why,'toggle',()=>render());
    // The button hides once resumed, so focus moves to the line instead of being lost.
    listen(resumeDirector,'click',()=>run(()=>{if(model.resumeDirector?.())directorLine.focus();}));
    // The ceiling's input lives in the extension settings; raising it must re-enable Resume without another reply.
    listen(document,'change',event=>{if(event.target?.id==='sillynovel-director-ceiling')render();});
    const OUTCOMES={applied:'Applied',no_change:'No change',superseded:'Overtaken by your reply',cancelled:'Cancelled',stale:'Stale',not_built:'Not built',transport:'Transport failure',response_refused:'Response refused',proposal_refused:'Proposal refused',partial:'Partly applied',abandoned:'Abandoned'};
    const DISPOSITIONS={applied:'applied',LOCKED:'LOCKED · kept your manual choice',NO_AUTOMATIC_LAYOUT:'NO_AUTOMATIC_LAYOUT · the director does not change outfits',unchanged:'unchanged · already on stage',suggestion:'suggestion only · not applied'};
    const counts=tally=>Object.entries(tally).map(([key,count])=>key+' '+count).join(', ');
    // Message and author come from the current history, labels from the catalog; of an entry's own text only the validated excerpt is shown.
    function explanation(view,actors,media,director,catalog) {
        const {snapshot,history}=actions.getSceneEvidence(false),selected=snapshot.cursor?.sourceKey;
        const positionOf=key=>history.findIndex(item=>item.sourceKey===key);
        const message=key=>{const item=history[positionOf(key)];return item?'message '+(item.index+1)+' · '+item.author.label:'a message no longer in the chat';};
        const actorName=key=>{const actor=actors.find(item=>item.key===key);return actor?actor.label+' ['+shortId(key)+']':'Unknown actor';};
        const artwork=id=>id?media.get(id)?.label??'artwork no longer available':'neutral';
        const applied=(match,scope=entry=>positionOf(entry.source?.key)>=0&&positionOf(entry.source?.key)<=positionOf(selected))=>{
            const entry=director.log.findLast(item=>scope(item)&&item.updates.some(update=>update.disposition==='applied'&&!update.cleared&&match(update)));
            return entry?'director, '+message(entry.source.key):'director, decision no longer in the log';
        };
        // The update behind what is on stage, by the overlay command that put it there.
        const decided=revision=>{for(const entry of director.log.toReversed()){const update=entry.updates.find(item=>item.commandRevision===revision&&!item.cleared);if(update)return {entry,update};}return null;};
        const madeBy=revision=>{const found=decided(revision);return found?'director, '+message(found.entry.source.key):'director, decision no longer in the log';};
        const correction=(lock,sourceKey)=>'your correction, '+message(sourceKey)+' · Not saved'+(lock?' · locked until Release':'');
        const layoutLock=locked=>locked?' · locked':' · director may move it';
        const correct=(aria,command)=>({label:'Revert',aria,command,kind:'correct'});
        const backgroundOverride=()=>{
            const options=catalog.filter(a=>a.kind==='background'&&a.id!==view.background?.id).map(a=>[a.id,media.get(a.id)?.label??a.id]);
            return options.length?[{label:'Override',aria:'Override background',kind:'override',options}]:[];
        };
        // A presence Revert is the opposite value: the field is binary, so Override would be the same button.
        const release=(field,name,characterKey)=>({label:'Release',aria:'Release '+name,kind:'correct',command:{type:'release',field,...(characterKey?{characterKey}:{})}});
        const onStage=[];
        const backgroundAt=view.overlayOrigins?.background;
        if(view.backgroundOrigin==='automatic'){
            const before=decided(backgroundAt.revision)?.update.before;
            onStage.push({text:'Background: '+artwork(view.background?.id)+' · '+madeBy(backgroundAt.revision),actions:[...(before===undefined?[]:[correct('Revert background',before?{type:'setBackground',assetId:before}:{type:'clearBackground'})]),...backgroundOverride()]});
        } else if(view.backgroundOrigin==='correction'){
            const lock=view.backgroundLockOrigin==='correction';
            onStage.push({text:'Background: '+artwork(view.background?.id)+' · '+correction(lock,backgroundAt.sourceKey),actions:[...backgroundOverride(),...(lock?[release('background','background')]:[])]});
        } else onStage.push('Background: '+artwork(view.background?.id)+' · your layout'+layoutLock(view.backgroundLocked));
        for(const actor of view.cast){
            const name=actorName(actor.key),at=view.overlayOrigins?.presence[actor.key];
            const flip=correct('Revert presence of '+name,{type:'setPresence',characterKey:actor.key,present:!actor.present});
            if(actor.presenceOrigin==='automatic')onStage.push({text:name+': '+(actor.present?'present':'absent')+' · '+madeBy(at.revision),actions:[flip]});
            else if(actor.presenceOrigin==='correction'){
                const lock=actor.presenceLockOrigin==='correction';
                onStage.push({text:name+': '+(actor.present?'present':'absent')+' · '+correction(lock,at.sourceKey),actions:[flip,...(lock?[release('presence','presence of '+name,actor.key)]:[])]});
            } else onStage.push(name+': '+(actor.present?'present':'absent')+' · your layout'+layoutLock(actor.locks.presence));
            if(actor.expression){
                const automatic=actor.expression.origin==='automatic';
                onStage.push({text:name+' expression: '+artwork(actor.expression.id)+' · '+(automatic?applied(update=>update.field==='expression'&&update.characterKey===actor.key&&update.targetId===actor.expression.id,entry=>entry.source?.key===selected):'your choice'),
                    // Override is the existing Apply expression control; Revert is its manual clear, through the journal.
                    actions:automatic?[{label:'Revert',aria:'Revert expression of '+name,kind:'dispatch',command:{type:'clearExpression',characterKey:actor.key}}]:[]});
            }
        }
        const rowName=update=>{
            const was=update.before!==undefined&&update.before!==update.targetId?' (was '+artwork(update.before)+')':'';
            if(update.disposition==='suggestion')return 'Background suggestion';
            if(update.field==='background')return 'Background: '+artwork(update.targetId)+was;
            if(update.field==='presence')return 'Presence of '+actorName(update.characterKey)+': '+((update.disposition==='unchanged'?update.before:!update.before)?'present':'absent');
            return (update.field==='outfit'?'Outfit of ':'Expression of ')+actorName(update.characterKey)+': '+artwork(update.targetId)+was;
        };
        // What keeps a LOCKED row kept right now: a correction releases in the overlay, a project lock is a global release (G6, G8).
        const lockedRow=update=>{
            if(update.disposition!=='LOCKED'||!['background','presence'].includes(update.field))return {};
            const actor=view.cast.find(item=>item.key===update.characterKey),name=update.field==='background'?'background':'presence of '+actorName(update.characterKey);
            const locked=update.field==='background'?view.backgroundLocked:actor?.locks.presence,lockOrigin=update.field==='background'?view.backgroundLockOrigin:actor?.presenceLockOrigin;
            if(!locked)return {words:DISPOSITIONS.LOCKED+' · released'};
            if(lockOrigin==='correction')return {words:'LOCKED · kept your correction',actions:[release(update.field,name,update.characterKey)]};
            return {actions:[{label:'Let the director move '+(update.field==='background'?'the background':name),aria:'Let the director move '+(update.field==='background'?'the background':name),kind:'dispatch',command:{type:'release',field:update.field,...(update.characterKey?{characterKey:update.characterKey}:{})}}]};
        };
        const decisions=director.log.filter(entry=>entry.source?.key===selected).map(entry=>({
            text:'Decision '+entry.seq+': '+(OUTCOMES[entry.outcome]??entry.outcome)+' · '+entry.code+(entry.elapsedMs===null?'':' · '+entry.elapsedMs+' ms')+(entry.messageChanged?' · message changed':''),
            items:entry.updates.map(update=>({
                actions:lockedRow(update).actions,
                text:rowName(update)+' · '+(lockedRow(update).words??DISPOSITIONS[update.disposition]??update.disposition)+(update.cleared&&!entry.messageChanged?' · cleared by your layout change':'')+(!update.cleared&&update.commandRevision!==undefined&&!model.overlayCommandValid(update.commandRevision)?' · invalidated by your correction':''),
                items:update.evidence?[{quote:true,text:'Quote from '+message(update.evidence.sourceMessageKey)+': “'+update.evidence.excerpt+'”'}]:[],
            })),
        }));
        const {outcomes,codes,pauses,dispositions,elapsed}=director.tallies;
        const summary=['Requests: '+director.count+' of '+director.ceiling,
            'Consecutive failures: '+director.consecutive+(director.paused?' · Paused: '+director.paused:''),
            'Outcomes: '+(counts(Object.fromEntries(Object.entries(outcomes).map(([key,count])=>[OUTCOMES[key]??key,count])))||'none yet'),
            'Codes: '+(counts(codes)||'none yet'),
            'Pauses: '+(counts(pauses)||'none'),
            'Corrections: '+(counts(director.corrections)||'none'),
            ...Object.entries(dispositions).map(([field,tally])=>'Dispositions, '+field+': '+counts(tally)),
            'Elapsed: '+(elapsed?'minimum '+elapsed.min+' ms, median '+elapsed.median+' ms, maximum '+elapsed.max+' ms, over the latest '+elapsed.samples:'none yet')];
        return [['On stage at this message',onStage],...(decisions.length?[['Decisions at this message',decisions]]:[]),['Session summary',summary]];
    }
    // Plain data in, so the signature below covers every action; the handler re-checks the selection the row was built for.
    function rowAction(action,sourceKey) {
        const act=fn=>run(async()=>{if(actions.getSnapshot().cursor?.sourceKey!==sourceKey)throw Error('STALE_SELECTION');await fn();if(why.open)why.focus();},true);
        const press=(label,aria,fn)=>{const e=make('button','menu_button sillynovel-button sillynovel-why__action',label);e.type='button';e.setAttribute('aria-label',aria);listen(e,'click',fn);return e;};
        if(action.kind==='override'){
            const choice=make('select','');choice.setAttribute('aria-label','Override background with');
            choice.append(...action.options.map(([id,label])=>{const e=make('option','',label);e.value=id;return e;}));
            return [choice,press(action.label,action.aria,()=>act(()=>model.correct({type:'setBackground',assetId:choice.value})))];
        }
        return [press(action.label,action.aria,()=>act(()=>action.kind==='correct'?model.correct(action.command):model.dispatch(action.command)))];
    }
    const list=(items,sourceKey)=>{const e=make('ul','');e.append(...items.map(item=>{const li=make('li',item.quote?'sillynovel-why__quote':'',item.text??item);if(item.actions?.length){const span=make('span','sillynovel-why__actions');span.append(...item.actions.flatMap(action=>rowAction(action,sourceKey)));li.append(span);}if(item.items?.length)li.append(list(item.items,sourceKey));return li;}));return e;};
    // Held only while open: a closed disclosure keeps no excerpt in the page, and cannot show an old one for a frame on opening (T60).
    const emptyWhy=()=>{if(whyBody.firstChild)whyBody.replaceChildren();delete whyBody.dataset.signature;};
    function renderDirectorEvidence(director,view,actors,media,catalog,journalReady) {
        const shown=Boolean(director?.enabled);
        directorBar.hidden=!shown;
        if(!shown){why.hidden=true;why.open=false;emptyWhy();return;}
        const line='Director: '+director.state+' · '+director.count+' of '+director.ceiling;
        if(directorLine.textContent!==line)directorLine.textContent=line;
        const atCeiling=director.count>=director.ceiling;
        resumeDirector.hidden=!director.paused;resumeDirector.disabled=atCeiling;ceilingNote.hidden=!director.paused||!atCeiling;
        // No verified view means no verified answer: hide without forgetting that the reader opened it.
        if(!view){why.hidden=true;emptyWhy();return;}
        const selected=actions.getSnapshot().cursor?.sourceKey;
        const explains=view.backgroundOrigin||view.cast.some(a=>a.presenceOrigin||a.expression?.origin==='automatic')||director.log.some(entry=>entry.source?.key===selected);
        why.hidden=!explains;
        if(!explains)why.open=false;
        if(!why.open){emptyWhy();return;}
        const sections=explanation(view,actors,media,director,catalog),signature=JSON.stringify([selected,sections]);
        if(whyBody.dataset.signature!==signature){
            // A reply rebuilds the lists; whoever is mid-choice keeps their place. Controls are named by aria-label.
            const focused=whyBody.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null,chosen=whyBody.querySelector('select')?.value;
            whyBody.dataset.signature=signature;
            whyBody.replaceChildren(...sections.flatMap(([title,items])=>[make('h4','',title),list(items,selected)]));
            const choice=whyBody.querySelector('select');
            if(choice&&[...choice.options].some(option=>option.value===chosen))choice.value=chosen;
            if(focused)[...whyBody.querySelectorAll('[aria-label]')].find(e=>e.getAttribute('aria-label')===focused)?.focus();
        }
        // Like the expression controls: nothing acts on a streaming or unresolved message.
        for(const e of whyBody.querySelectorAll('button,select'))e.disabled=!journalReady;
    }
    function renderMovable(state,view,actors,blocked) {
        for(const e of [movableBackground,movableActors,applyBackgroundMovable,applyPresenceMovable])e.hidden=!state;
        if(!state)return;
        const signature=JSON.stringify(actors.map(a=>[a.key,a.label]));
        if(movableActors.dataset.actors!==signature){
            movableActors.dataset.actors=signature;
            movableActors.replaceChildren(...actors.map(a=>movableToggle('Director may move presence of '+a.label+' ['+shortId(a.key)+']','presence',a.key)));
        }
        const locks=model.globalLocks();
        const show=(wrap,locked,correction)=>{
            const input=wrap.querySelector('input');input.checked=!locked;input.disabled=blocked;
            wrap.querySelector('.sillynovel-movable__state').textContent=locked?' · locked':correction?' · movable · held by your correction':' · movable';
        };
        show(movableBackground,locks.background,view?.backgroundLockOrigin==='correction');
        for(const wrap of movableActors.children){const key=wrap.querySelector('input').dataset.actor;show(wrap,locks.presence[key],view?.cast.find(a=>a.key===key)?.presenceLockOrigin==='correction');}
    }
    function render() {
        if(disposed)return;
        const {scene,actors,assets,media,notice,verifiedStamp}=model.get();
        const verified=verifiedStamp===evidenceStamp(actions.getSnapshot());
        const view=verified?scene?.view:null;
        options(bg,[['','Clear · neutral'],...assets.filter(a=>a.kind==='background').map(a=>[a.id,(media.get(a.id)?.label??a.id)+(model.project&&media.get(a.id)?.assetId?' · '+media.get(a.id).assetId.slice(0,8):'')])]);
        options(actor,actors.map(a=>[a.key,a.label+' · '+a.description+' · '+shortId(a.key)]));
        const active=actor.value;
        options(outfit,[['','Clear · default'],...assets.filter(a=>a.kind==='outfit' && (!model.project || a.characterKey===active)).map(a=>[a.id,(a.characterKey===active?'':'Other actor · ')+(media.get(a.id)?.label??a.id)+(model.project&&media.get(a.id)?.assetId?' · '+media.get(a.id).assetId.slice(0,8):'')])]);
        const member=view?.cast.find(a=>a.key===active);
        options(libraryAsset,assets.filter(a=>a.kind!=='expression').map(a=>[a.id,(a.kind==='background'?'Background':'Actor sprite')+' · '+(media.get(a.id)?.label??a.id)+(media.get(a.id)?.assetId?' · '+media.get(a.id).assetId.slice(0,8):'')+(a.characterKey?' · '+(actors.find(actor=>actor.key===a.characterKey)?.label??'Unknown actor')+' ['+a.characterKey.slice(0,8)+']':'')+(a.available?'':' · art unavailable')]));
        if(libraryLabel.dataset.ref!==libraryAsset.value){libraryLabel.dataset.ref=libraryAsset.value;libraryLabel.value=media.get(libraryAsset.value)?.label??'';}
        const artName=ref=>ref?(media.get(ref.id)?.label??ref.id)+(ref.status==='ready'?'':' · '+ref.status+' artwork'):'neutral / no artwork';
        const byDirector=origin=>origin==='automatic'?' (director)':origin==='correction'?' (corrected)':'';
        selectedArt.textContent='Selected background: '+artName(view?.background)+byDirector(view?.backgroundOrigin)+(model.project&&media.get(view?.background?.id)?.assetId?' · '+media.get(view.background.id).assetId:'')+' / Active actor: '+(member?member.label+' ['+shortId(member.key)+'] · '+(member.present?'present':'absent')+byDirector(member.presenceOrigin)+' · '+(member.slot??'offstage')+' · outfit: '+artName(member.outfit)+(model.project&&media.get(member.outfit?.id)?.assetId?' · '+media.get(member.outfit.id).assetId:'')+' · locks: '+(Object.entries(member.locks).filter(([,v])=>v).map(([k])=>k).join(', ')||'none'):'none');
        if(view!==displayedView||active!==displayedActor){
            if(view!==displayedView)bg.value=view?.background?.id??'';
            presence.value=String(member?.present??true);slot.value=member?.slot??'';outfit.value=member?.outfit?.id??'';
            displayedView=view;displayedActor=active;
        }
        options(expression,[['','Clear · neutral'],...assets.filter(a=>a.kind==='expression'&&(!model.project||a.characterKey===active&&a.outfitId===(member?.outfit?.id??null))).map(a=>[a.id,(a.characterKey===active && a.outfitId===(member?.outfit?.id??null)?'':'Incompatible · ')+(media.get(a.id)?.label??a.id)])]);
        const labels=view?.cast.map(a=>a.label+' ['+shortId(a.key)+'] '+(!a.present?'absent':a.slot??'offstage')+byDirector(a.presenceOrigin)+' · locks: '+Object.entries(a.locks).filter(([,v])=>v).map(([k])=>k).join(', '))??[];
        cast.textContent=labels.length?'Cast: '+labels.join(' / '):'No manual cast. Register actors in Scene.';
        cast.dataset.count=String(view?.cast.length??0);
        feedback.textContent=notice+(view?.backgroundLocked?' Background locked.':'');
        const bgRef=view?.background;
        image(background,bgRef?.status==='ready'?media.get(bgRef.id)?.url:null);
        if(bgRef && (bgRef.status!=='ready'||background.hidden))feedback.textContent+=' Background art unavailable · neutral fallback.';
        for(const [position,{figure,image:img,label}] of slots) {
            const a=view?.cast.find(a=>a.key===view.slots[position]);
            figure.hidden=!a;figure.dataset.actor=a?.key??'';
            if(!a){img.dataset.expression='';image(img,null);continue;}
            const ref=a.expression?.status==='ready'?a.expression:a.outfit;
            img.dataset.expression=a.expression?.status==='ready'?a.expression.id:'';
            const manual=actors.find(item=>item.key===a.key);
            const url=ref?(ref.status==='ready'?media.get(ref.id)?.url:null):manual?.defaultURL;
            image(img,url);label.textContent=a.label+' ['+shortId(a.key)+']'+(url?'':' · art unavailable');
        }
        const ready=Boolean(verified && scene?.context.selectedSourceKey);
        const state=model.project?model.status():null;
        const paused=projectBusy||Boolean(state?.importing);
        for(const e of controls)e.disabled=paused||Boolean(state?.cleanupBusy)||(e===reset ? false : !ready);
        layoutReady=ready&&!paused&&!state?.cleanupBusy;
        const recovery=state&&['conflict','uncertain'].includes(state.saveState);
        const status=state?.busy?'Saving project…':state?.saveState==='conflict'?'Unsaved project changes · save conflicted':state?.saveState==='uncertain'?'Save outcome uncertain · inspect by explicit reopen':state?.saveState==='error'?'Save failed · edits retained':state?.dirty?'Unsaved project changes':state?'Saved project layout':'Unsaved session visuals';
        unsaved.textContent=status;unsaved.dataset.state=state?.busy?'pending':recovery?state.saveState:state?.saveState==='error'?'error':state?.dirty?'dirty':state?'saved':'session';
        projectStatus.textContent=projectBusy?'Opening project · visual edits paused…':state?state.name+' · revision '+state.revision+' · '+state.projectId.slice(0,8)+' · Attached for this browser activation'+(state.importing?' · importing PNG…':''):'No project attached. '+attachmentNotice+(!capable?unavailable:' Select one explicitly for this chat.');
        projectStatus.title=state?state.projectId:'';
        scope.textContent=state?'Saved global layouts and library persist. Message-specific visual history is not saved. Reload or switching conversations detaches; explicitly reopen.':'Session-only visuals are not saved. No remembered project attachment. '+(!capable?'Storage unavailable; reading and replying remain available.':'');
        const snapshot=actions.getSnapshot(),owner=snapshot.owner;
        nativeContext.hidden=owner?.scope!=='group';
        nativeContext.textContent=owner?.scope==='group'?'Native group: '+owner.groupLabel+'. '+(supportsProjectConversation(owner)?'':'Conversation identity unresolved; project attachment unavailable. ')+'Native speaker: '+(snapshot.cursor?.author.label??'unresolved')+'. Project actor selection is manual; no native card binding.':'';
        nativeContext.title=owner?.scope==='group'?'Group '+owner.groupId+' / chat '+owner.chatId:'';
        for(const e of [projectName,projectList,...projectButtons])e.disabled=!capable||paused||!ready||!supportsProjectConversation(owner);
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
        const director=state?model.directorStatus():null;
        directorArea.hidden=!director;
        if(director){directorToggle.checked=director.enabled;directorToggle.disabled=!director.available;directorStatus.textContent=director.available?director.notice+(director.enabled?' · '+director.count+' of '+director.ceiling+' requests this session':''):'Director unavailable: this host has no generation path for it.';}
        const overlay=state?model.expressionStatus():null;
        renderDirectorEvidence(director,view,actors,media,assets,Boolean(overlay?.ready&&!paused));
        renderMovable(state,view,actors,!ready||paused||Boolean(state?.cleanupBusy));
        expressionContext.textContent=state?'Selected message: '+(actions.getSnapshot().cursor?String(actions.getSnapshot().cursor.index+1)+' · '+actions.getSnapshot().cursor.author.label:'unresolved')+' / Actor: '+(member?member.label+' ['+shortId(member.key)+']':'select actor')+' / Current expression: '+artName(member?.expression)+(member?.expression?.origin==='automatic'?' (director)':'')+' · Temporary, not saved. '+overlay.notice:'';
        for(const e of [expression,applyExpression,clearExpression])e.disabled=e.disabled||Boolean(state&&!overlay.ready);
        for(const e of [expressionFile,expressionLabel]){e.parentElement.hidden=!state;e.disabled=e.disabled||!state||!overlay?.ready||overlay?.busy;}
        expressionContext.hidden=!state;
        if(state){reset.disabled=true;preset.disabled=true;file.accept='image/png';help.textContent='Project actors are manual identities with no native card binding. Global outfits and layout persist across messages. Expressions are temporary, source-specific, and can be invalidated by edits; no speaker mapping is inferred. Portable v1 bundles include selected artwork only, without library labels or unselected alternatives.';}
        else {file.accept='image/png,image/jpeg,image/webp';help.textContent=transientHelp;}
        for(const [control,sessionName,projectLabel] of [[name,'Session actor name','Project actor name'],[actor,'Session actor','Project actor'],[fileKind,'Temporary image use','Project image use'],[file,'Temporary raster file','Project PNG file']]){
            const text=state?projectLabel:sessionName;control.setAttribute('aria-label',text);control.parentElement.firstChild.textContent=text;
        }
        for(const control of [importLabel,libraryAsset,libraryLabel])control.parentElement.hidden=!state;
        for(const control of [renameAsset,unregisterAsset]){control.hidden=!state;control.disabled=control.disabled||!libraryAsset.value;}
        registerActor.textContent=state?'Register project actor':'Register session actor';
        preset.parentElement.hidden=Boolean(state);
        renderWorkflow();
    }
    function update(snapshot) {
        if(snapshot.sessionEpoch!==activation){
            endImageSession();
            activation=snapshot.sessionEpoch;projectEpoch++;projectBusy=false;bundleStatus.textContent='';
            if(model.project){attachmentNotice='Project detached after a native conversation switch. Explicitly reopen to use a saved global layout.';model.dispose();model=createTransientScene(actions,render);}
        }
        const stamp=JSON.stringify([evidenceStamp(snapshot),snapshot.selectionRevision,snapshot.generation]);
        if(stamp===lastStamp)return;
        lastStamp=stamp;
        // Neutralize synchronously before the reader paints changed dialogue. A later
        // render can show art only when its accepted evidence stamp still matches.
        render();
        feedback.textContent='Checking the scene for this message…';
        run(()=>model.sync(false));
    }
    render();update(actions.getSnapshot());
    return {update,dispose(){disposed=true;projectEpoch++;endImageSession();clearPreview();for(const remove of removers)remove();model.dispose();}};
}
