import { createScene, reduceScene, reconcileScene } from './scene-reducer.mjs';
import { evidenceStamp } from './transient-scene.mjs';
import { validateScene, validId, label, validateCleanupPreview } from '../plugins/sillynovel-storage/schema.mjs';

/** Global project commands use a project anchor, never a native message anchor.
 * This journal is memory-only; persistence serializes only the global projection. */
export async function createProjectScene(project,client,actions,changed,isCurrent) {
    validateScene(project.scene);
    if(project.schemaVersion!==1 || !validId(project.projectId) || !label(project.name) || !Number.isSafeInteger(project.revision))throw Error('INVALID_PROJECT');
    const epoch=actions.getSnapshot().sessionEpoch;
    let disposed=false,edit=0,savedEdit=0,busy=false,importing=false,scene,notice='Project opened · global layout only.',catalogRevision=0;
    let actors=project.scene.actors.map(a=>({key:a.actorId,label:a.name,description:'Project actor',defaultURL:null}));
    let cleanupBusy=false,cleanupPreview=null,cleanupNotice='Save or discard current changes before cleanup. Other tabs may hold unsaved drafts.';
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
        apply({type:project.scene.backgroundLocked?'lock':'release',field:'background'});
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
    const cleanupReady=()=>current() && !busy && !importing && !cleanupBusy && edit===savedEdit;
    function invalidateCleanup(){cleanupPreview=null;}
    function evictCleanupAssets(ids) {
        // Confirmed or uncertain removal invalidates cached alternatives, never the saved scene.
        for(let i=assets.length-1;i>=0;i--)if(ids.includes(media.get(assets[i].id)?.assetId)){
            const ref=assets[i].id,item=media.get(ref);if(item.url)URL.revokeObjectURL(item.url);media.delete(ref);assets.splice(i,1);
        }
        catalogRevision++;refresh();
    }
    function cleanupError(error) {
        const messages={CLEANUP_STALE:'Preview expired: asset inventory changed. Review unused artwork again.',
            REVISION_CONFLICT:'Project changed on the server. Explicitly reopen it, then review again.',
            ASSET_REFERENCED:'Artwork is now referenced by the saved project. Reopen and review again.',
            ASSET_MISSING:'Artwork no longer exists in this project. Review again.',
            NOT_FOUND:'Project unavailable or unauthorized. Select an owned saved project.',
            STORAGE_UNAVAILABLE:'Database write or storage service failed. Review again before retrying.',
            CLEANUP_UNCERTAIN:'Cleanup outcome uncertain after a lost or invalid response. Removal may have committed. Review again; do not assume rollback.'};
        return messages[error.message]??('Cleanup refused: '+error.message+'. Review again before retrying.');
    }
    return {
        project:true,
        async reviewUnused() {
            if(!cleanupReady()){cleanupNotice='Save or discard unsaved changes and wait for imports, saves and cleanup to finish.';notify();return;}
            cleanupBusy=true;invalidateCleanup();cleanupNotice='Reviewing saved project artwork…';notify();
            try {const preview=validateCleanupPreview(await client.previewCleanup(project.projectId),project.projectId);if(!current())return;
                if(preview.revision!==project.revision)throw Error('REVISION_CONFLICT');
                cleanupPreview=preview;cleanupNotice=preview.candidates.length+' unused artwork files · '+preview.reclaimableBytes+' logical bytes reclaimable.';
            } catch(error){if(current())cleanupNotice=cleanupError(error);}
            finally {cleanupBusy=false;notify();}
        },
        async removeUnused(assetIds,confirm) {
            if(!cleanupReady() || !cleanupPreview){cleanupNotice='Save or discard unsaved changes, wait for pending operations, then review again.';notify();return;}
            const preview=cleanupPreview, selected=preview.candidates.filter(a=>assetIds.includes(a.assetId));
            if(!assetIds.length || selected.length!==assetIds.length || new Set(assetIds).size!==assetIds.length)return;
            const bytes=selected.reduce((sum,a)=>sum+a.byteCount,0);
            if(!confirm('Remove '+assetIds.length+' unused artwork files and reclaim '+bytes+' logical bytes? '+preview.warning))return;
            if(!cleanupReady())return;
            cleanupBusy=true;invalidateCleanup();cleanupNotice='Removing selected unused artwork…';notify();
            try {const receipt=await client.removeUnusedAssets(project.projectId,preview,assetIds);if(!current())return;
                evictCleanupAssets(receipt.deletedIds);cleanupNotice='Cleanup completed: removed '+receipt.deletedCount+' artwork files; reclaimed '+receipt.reclaimedBytes+' logical bytes. Database file size may stay unchanged.';
            } catch(error){if(current()){if(error.message==='CLEANUP_UNCERTAIN')evictCleanupAssets(assetIds);cleanupNotice=cleanupError(error);}}
            finally {cleanupBusy=false;notify();}
        },
        get:()=>({scene,actors,assets,media,notice,verifiedStamp:!disposed&&actions.getSnapshot().sessionEpoch===epoch?evidenceStamp(actions.getSnapshot()):null}),
        status:()=>({projectId:project.projectId,name:project.name,revision:project.revision,dirty:edit!==savedEdit,busy,importing,cleanupBusy,cleanupPreview,cleanupNotice}),
        async sync(){if(!current())return false;notify();return true;},
        async dispatch(command){if(importing||cleanupBusy)throw Error('Wait for the PNG import or cleanup to finish.');invalidateCleanup();if(!current())return false;apply(command);edit++;notice='Applied · unsaved project changes.';notify();return true;},
        async register(_preset,name){if(importing||cleanupBusy)throw Error('Wait for the PNG import or cleanup to finish.');invalidateCleanup();if(!current())return;if(!label(name)||actors.length>=20)throw Error('Use a name of 1–80 characters; maximum 20 actors.');const key=crypto.randomUUID();actors.push({key,label:name,description:'Project actor',defaultURL:null});refresh();apply({type:'addCharacter',characterKey:key});edit++;notify();return key;},
        async importFile(file,kind,key){
            if(!current())return;
            if(file.type!=='image/png'||file.size>5*1024*1024)throw Error('Project imports require static PNG up to 5 MiB.');
            if(kind!=='background'&&!actors.some(a=>a.key===key))throw Error('Select a project actor first.');
            if(importing||cleanupBusy)throw Error('Wait for the PNG import or cleanup to finish.');
            invalidateCleanup();
            importing=true;notice='Importing PNG · visual edits paused.';notify();
            try {
                const result=await client.upload(project.projectId,file);
                if(!current())return;
                const ref=await install(result.assetId,kind,kind==='background'?undefined:key);
                if(!current())return;
                refresh();apply({type:kind==='background'?'setBackground':'setOutfit',assetId:ref,...(kind==='background'?{}:{characterKey:key})});edit++;notice='Imported · unsaved project arrangement.';
            } catch(error){notice='Import failed: '+error.message;throw error;}
            finally{importing=false;notify();}
        },
        async save(){
            if(!current()||busy||importing||cleanupBusy)return;
            invalidateCleanup();
            const captured=edit,id=project.projectId,expectedRevision=project.revision;
            const body={schemaVersion:1,expectedRevision,name:project.name,scene:structuredClone(globalState())};
            busy=true;notify();
            try {const receipt=await client.save(id,body);if(!current())return;
                if(receipt.projectId!==id||receipt.revision!==expectedRevision+1)throw Error('INVALID_RECEIPT');
                project={...project,revision:receipt.revision};savedEdit=captured;
                notice=edit===captured?'Project saved.':'Earlier project snapshot saved; newer changes remain unsaved.';
            }catch(error){if(current())notice=error.message==='REVISION_CONFLICT'?'Conflict: another client saved first. Keep your changes or explicitly reopen to discard them.':error.message==='ASSET_MISSING'?'Save refused: artwork was removed, possibly by another tab. Your edits remain here. Reimport the artwork or deliberately change its reference before saving.':'Save failed: '+error.message;}
            finally{busy=false;notify();}
        },
        reset(){throw Error('Detach the project before resetting session visuals.');},
        dispose(){disposed=true;for(const item of media.values())if(item.url)URL.revokeObjectURL(item.url);},
    };
}
