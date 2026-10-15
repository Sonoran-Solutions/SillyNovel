import { createScene, reduceScene, reconcileScene } from './scene-reducer.mjs';
import { evidenceStamp } from './transient-scene.mjs';
import { validateScene, validId, label } from '../plugins/sillynovel-storage/schema.mjs';

/** Global project commands use a project anchor, never a native message anchor.
 * This journal is memory-only; persistence serializes only the global projection. */
export async function createProjectScene(project,client,actions,changed,isCurrent) {
    validateScene(project.scene);
    if(project.schemaVersion!==1 || !validId(project.projectId) || !label(project.name) || !Number.isSafeInteger(project.revision))throw Error('INVALID_PROJECT');
    const epoch=actions.getSnapshot().sessionEpoch;
    let disposed=false,edit=0,savedEdit=0,busy=false,scene,notice='Project opened · global layout only.',catalogRevision=0;
    let actors=project.scene.actors.map(a=>({key:a.actorId,label:a.name,description:'Project actor',defaultURL:null}));
    const assets=[],media=new Map();
    const bytes=new TextEncoder().encode('sillynovel-project-global-v1:'+project.projectId);
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    const source={key:'project-global:'+project.projectId,revision:0,swipeRevision:0,fingerprintVersion:'sn-source-v1',prefixSha256:hash};
    const current=()=>!disposed && isCurrent() && actions.getSceneEvidence().snapshot.sessionEpoch===epoch;
    const notify=()=>{if(!disposed)changed();};
    const context=()=>({ownerKey:'project:'+project.projectId,sessionEpoch:epoch,historyRevision:0,selectionRevision:0,selectedSourceKey:source.key,sources:[source],characters:actors.map(({key,label})=>({key,label})),catalog:{revision:catalogRevision,assets}});
    const refresh=()=>{const result=scene?reconcileScene(scene,context()):createScene(context());if(!result.result.accepted)throw Error(result.result.code);scene=result.scene;};
    function apply(command) {
        if(['setExpression','clearExpression'].includes(command.type))throw Error('Message expressions are session-only; detach the project to use them.');
        const c=scene.context;
        const outcome=reduceScene(scene,command,{ownerKey:c.ownerKey,sessionEpoch:epoch,historyRevision:0,selectionRevision:0,catalogRevision,expectedRevision:scene.revision,source,origin:'manual'});
        if(!outcome.result.accepted)throw Error(outcome.result.code);
        scene=outcome.scene;
    }
    async function install(id,kind,key) {
        // Reducer IDs are actor-specific even when immutable bytes are shared.
        const ref=kind==='background'?id:key+':'+id;
        if(assets.some(a=>a.id===ref))return ref;
        let url=null,revision='missing';
        try {const value=await client.asset(project.projectId,id);if(!current())throw Error('STALE_PROJECT');url=URL.createObjectURL(value.blob);revision=value.hash;}
        catch {notice='Some project art is unavailable · neutral fallback.';}
        if(!current()){if(url)URL.revokeObjectURL(url);throw Error('STALE_PROJECT');}
        assets.push({id:ref,kind,revision,available:Boolean(url),...(key?{characterKey:key}:{})});
        media.set(ref,{url,label:'Imported PNG',assetId:id});catalogRevision++;return ref;
    }
    try {
        if(project.scene.backgroundAssetId)await install(project.scene.backgroundAssetId,'background');
        for(const a of project.scene.actors)if(a.spriteAssetId)await install(a.spriteAssetId,'outfit',a.actorId);
        if(!current())throw Error('STALE_PROJECT');refresh();
        if(project.scene.backgroundAssetId)apply({type:'setBackground',assetId:project.scene.backgroundAssetId});
        if(!project.scene.backgroundLocked)apply({type:'release',field:'background'});
        for(const a of project.scene.actors){
            apply({type:'addCharacter',characterKey:a.actorId});
            apply({type:'setPresence',characterKey:a.actorId,present:a.present});
            if(a.spriteAssetId)apply({type:'setOutfit',characterKey:a.actorId,assetId:a.actorId+':'+a.spriteAssetId});
            if(a.slot)apply({type:'setSlot',characterKey:a.actorId,slot:a.slot});
            for(const field of ['presence','outfit','slot'])apply({type:a.locks[field]?'lock':'release',field,characterKey:a.actorId});
        }
    } catch(error){for(const item of media.values())if(item.url)URL.revokeObjectURL(item.url);throw error;}
    function globalState(){return validateScene({backgroundAssetId:scene.view.background?media.get(scene.view.background.id).assetId:null,backgroundLocked:scene.view.backgroundLocked,
        actors:scene.view.cast.map(a=>({actorId:a.key,name:a.label,spriteAssetId:a.outfit?media.get(a.outfit.id).assetId:null,slot:a.slot,present:a.present,locks:{...a.locks}}))});}
    return {
        project:true,
        get:()=>({scene,actors,assets,media,notice,verifiedStamp:!disposed&&actions.getSnapshot().sessionEpoch===epoch?evidenceStamp(actions.getSnapshot()):null}),
        status:()=>({name:project.name,revision:project.revision,dirty:edit!==savedEdit,busy}),
        async sync(){if(!current())return false;notify();return true;},
        async dispatch(command){if(!current())return false;apply(command);edit++;notice='Applied · unsaved project changes.';notify();return true;},
        async register(_preset,name){if(!current())return;if(!label(name)||actors.length>=20)throw Error('Use a name of 1–80 characters; maximum 20 actors.');const key=crypto.randomUUID();actors.push({key,label:name,description:'Project actor',defaultURL:null});refresh();apply({type:'addCharacter',characterKey:key});edit++;notify();return key;},
        async importFile(file,kind,key){
            if(!current())return;
            if(file.type!=='image/png'||file.size>5*1024*1024)throw Error('Project imports require static PNG up to 5 MiB.');
            if(kind!=='background'&&!actors.some(a=>a.key===key))throw Error('Select a project actor first.');
            const captured=edit;
            const result=await client.upload(project.projectId,file);
            if(!current()||captured!==edit)return;
            const ref=await install(result.assetId,kind,kind==='background'?undefined:key);
            if(!current()||captured!==edit)return;
            refresh();apply({type:kind==='background'?'setBackground':'setOutfit',assetId:ref,...(kind==='background'?{}:{characterKey:key})});edit++;notice='Imported · unsaved project arrangement.';notify();
        },
        async save(){
            if(!current()||busy)return;
            const captured=edit,id=project.projectId,expectedRevision=project.revision;
            const body={schemaVersion:1,expectedRevision,name:project.name,scene:structuredClone(globalState())};
            busy=true;notify();
            try {const receipt=await client.save(id,body);if(!current())return;
                if(receipt.projectId!==id||receipt.revision!==expectedRevision+1)throw Error('INVALID_RECEIPT');
                project={...project,revision:receipt.revision};savedEdit=captured;
                notice=edit===captured?'Project saved.':'Earlier project snapshot saved; newer changes remain unsaved.';
            }catch(error){if(current())notice=error.message==='REVISION_CONFLICT'?'Conflict: another client saved first. Keep your changes or explicitly reopen to discard them.':'Save failed: '+error.message;}
            finally{busy=false;notify();}
        },
        reset(){throw Error('Detach the project before resetting session visuals.');},
        dispose(){disposed=true;for(const item of media.values())if(item.url)URL.revokeObjectURL(item.url);},
    };
}
