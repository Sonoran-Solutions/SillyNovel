import { createScene, reduceScene, reconcileScene } from './scene-reducer.mjs';
import { createProjectExpressions } from './project-expressions.mjs';
import { evidenceStamp } from './transient-scene.mjs';
import { validateScene, validId, label, validateCleanupPreview, validateCatalog, selectedCatalog } from '../plugins/sillynovel-storage/schema.mjs';

/** Global project commands use a project anchor, never a native message anchor.
 * This journal is memory-only; persistence serializes only the global projection. */
export async function createProjectScene(project,client,actions,changed,isCurrent) {
    validateScene(project.scene);
    if(project.schemaVersion!==2 || !validId(project.projectId) || !label(project.name) || !Number.isSafeInteger(project.revision))throw Error('INVALID_PROJECT');
    const library=structuredClone(validateCatalog(project.catalog,project.scene));
    // v1 bundles and pre-library saves carry selected art without labels.
    for(const entry of selectedCatalog(project.scene))if(!library.some(a=>a.assetId===entry.assetId && a.kind===entry.kind && a.actorId===entry.actorId))library.push(entry);
    const epoch=actions.getSnapshot().sessionEpoch;
    let disposed=false,edit=0,savedEdit=0,busy=false,importing=false,scene,notice='Project opened · global layout only.',catalogRevision=0;
    let actors=project.scene.actors.map(a=>({key:a.actorId,label:a.name,description:'Project actor',defaultURL:null}));
    let saveState='clean';
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
        const c=scene.context;
        const outcome=reduceScene(scene,command,{ownerKey:c.ownerKey,sessionEpoch:epoch,historyRevision:0,selectionRevision:0,catalogRevision,expectedRevision:scene.revision,source,origin:'manual'});
        if(!outcome.result.accepted)throw Error(outcome.result.code);
        scene=outcome.scene;
    }
    async function install(id,kind,key,displayLabel='Imported PNG') {
        // Reducer IDs are actor-specific even when immutable bytes are shared.
        const ref=kind==='background'?id:key+':'+id;
        if(assets.some(a=>a.id===ref)){media.get(ref).label=displayLabel;return ref;}
        let url=null,revision='missing';
        try {const value=await client.asset(project.projectId,id);if(!current())throw Error('STALE_PROJECT');url=URL.createObjectURL(value.blob);revision=value.hash;}
        catch {notice='Some project art is unavailable · neutral fallback.';}
        if(!current()){if(url)URL.revokeObjectURL(url);throw Error('STALE_PROJECT');}
        assets.push({id:ref,kind,revision,available:Boolean(url),...(key?{characterKey:key}:{})});
        media.set(ref,{url,label:displayLabel,assetId:id});catalogRevision++;return ref;
    }
    try {
        for(const a of library)await install(a.assetId,a.kind==='background'?'background':'outfit',a.actorId??undefined,a.label);
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
    const cleanupReady=()=>current() && !busy && !importing && !cleanupBusy && edit===savedEdit && !['conflict','uncertain'].includes(saveState);
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
    const expressions=createProjectExpressions(actions,()=>scene,()=>!disposed&&isCurrent()&&actions.getSnapshot().sessionEpoch===epoch,notify);
    await expressions.sync();
    return {
        project:true,
        expressionStatus:()=>expressions.get(),
        importExpression:(file,key,name,selectionCurrent)=>expressions.importFile(file,key,name,selectionCurrent),
        expressionFailed:id=>expressions.failed(id),
        async renameAsset(ref,name) {
            if(!current())return;
            if(importing||cleanupBusy)throw Error('Wait for the PNG import or cleanup to finish.');
            if(!label(name))throw Error('Use a label of 1–80 characters.');
            const asset=assets.find(a=>a.id===ref),item=media.get(ref);
            if(!asset||!item)throw Error('Select library artwork first.');
            const entry=library.find(a=>a.assetId===item.assetId && a.actorId===(asset.characterKey??null) && a.kind===(asset.kind==='background'?'background':'sprite'));
            entry.label=name;item.label=name;edit++;invalidateCleanup();notify();
        },
        async unregisterAsset(ref,confirm) {
            if(!current())return;
            if(importing||cleanupBusy)throw Error('Wait for the PNG import or cleanup to finish.');
            const asset=assets.find(a=>a.id===ref),item=media.get(ref);
            if(!asset||!item)throw Error('Select library artwork first.');
            if(scene.view.background?.id===ref || scene.view.cast.some(a=>a.outfit?.id===ref))throw Error('Select different artwork or clear its scene choice first.');
            if(!confirm('Remove '+item.label+' from this project library? Save this change, then review unused artwork to explicitly delete its bytes.'))return;
            const index=library.findIndex(a=>a.assetId===item.assetId && a.actorId===(asset.characterKey??null) && a.kind===(asset.kind==='background'?'background':'sprite'));
            library.splice(index,1);assets.splice(assets.indexOf(asset),1);media.delete(ref);if(item.url)URL.revokeObjectURL(item.url);
            catalogRevision++;refresh();edit++;invalidateCleanup();notice='Removed from library · save before reviewing unused artwork.';notify();
        },
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
        get:()=>{const overlay=expressions.get();return {scene:{...scene,view:overlay.view},actors,assets:[...assets,...overlay.assets],media:new Map([...media,...overlay.media]),notice:notice+' '+overlay.notice,verifiedStamp:!disposed&&actions.getSnapshot().sessionEpoch===epoch?evidenceStamp(actions.getSnapshot()):null};},
        status:()=>({projectId:project.projectId,name:project.name,revision:project.revision,dirty:edit!==savedEdit,saveState,busy,importing,cleanupBusy,cleanupPreview,cleanupNotice}),
        async sync(refresh=true){if(!current()){if(actions.getSnapshot().sessionEpoch!==epoch)expressions.dispose();return false;}await expressions.sync(refresh);notify();return true;},
        async dispatch(command){if(['setExpression','clearExpression'].includes(command.type))return expressions.dispatch(command);if(importing||cleanupBusy)throw Error('Wait for the PNG import or cleanup to finish.');invalidateCleanup();if(!current())return false;apply(command);await expressions.sync();edit++;notice='Applied · unsaved project changes.';notify();return true;},
        async register(_preset,name){if(importing||cleanupBusy)throw Error('Wait for the PNG import or cleanup to finish.');invalidateCleanup();if(!current())return;if(!label(name)||actors.length>=20)throw Error('Use a name of 1–80 characters; maximum 20 actors.');const key=crypto.randomUUID();actors.push({key,label:name,description:'Project actor',defaultURL:null});refresh();apply({type:'addCharacter',characterKey:key});edit++;notify();return key;},
        async importFile(file,kind,key,displayLabel){
            if(!current())return;
            displayLabel=displayLabel?.trim() || file.name?.replace(/\.png$/i,'').slice(0,80) || 'Imported PNG';
            if(!label(displayLabel))throw Error('Use a label of 1–80 characters.');
            if(!['background','outfit'].includes(kind))throw Error('Select background or actor sprite.');
            if(file.type!=='image/png'||file.size>5*1024*1024)throw Error('Project imports require static PNG up to 5 MiB.');
            if(kind!=='background'&&!actors.some(a=>a.key===key))throw Error('Select a project actor first.');
            if(importing||cleanupBusy)throw Error('Wait for the PNG import or cleanup to finish.');
            invalidateCleanup();
            importing=true;notice='Importing PNG · visual edits paused.';notify();
            try {
                const result=await client.upload(project.projectId,file);
                if(!current())return;
                if(!validId(result.assetId))throw Error('INVALID_RECEIPT');
                const entry={assetId:result.assetId,label:displayLabel,kind:kind==='background'?'background':'sprite',actorId:kind==='background'?null:key};
                const prior=library.findIndex(a=>a.assetId===entry.assetId && a.kind===entry.kind && a.actorId===entry.actorId);
                if(prior<0 && library.length>=100)throw Error('Maximum 100 library entries.');
                const ref=await install(result.assetId,kind,kind==='background'?undefined:key,displayLabel);
                if(!current())return;
                if(prior<0)library.push(entry);else library[prior]=entry;
                refresh();apply({type:kind==='background'?'setBackground':'setOutfit',assetId:ref,...(kind==='background'?{}:{characterKey:key})});edit++;notice='Imported · unsaved project arrangement.';
            } catch(error){notice='Import failed: '+error.message;throw error;}
            finally{importing=false;notify();}
        },
        async save(){
            if(!current()||busy||importing||cleanupBusy||['conflict','uncertain'].includes(saveState))return;
            invalidateCleanup();
            const captured=edit,id=project.projectId,expectedRevision=project.revision;
            const body={schemaVersion:2,expectedRevision,name:project.name,scene:structuredClone(globalState()),catalog:structuredClone(library)};
            busy=true;saveState='pending';notify();
            try {const receipt=await client.save(id,body);if(!current())return;
                if(!receipt||receipt.projectId!==id||receipt.revision!==expectedRevision+1)throw Error('INVALID_RECEIPT');
                project={...project,revision:receipt.revision};savedEdit=captured;saveState='saved';
                notice=edit===captured?'Project saved.':'Earlier project snapshot saved; newer changes remain unsaved.';
            }catch(error){if(current()){
                saveState=error.message==='REVISION_CONFLICT'?'conflict':['SAVE_UNCERTAIN','INVALID_RECEIPT'].includes(error.message)?'uncertain':'error';
                notice=saveState==='conflict'?'Conflict: another client saved first. Your edits remain here. Explicitly discard and reopen to load the saved project.':saveState==='uncertain'?'Save outcome uncertain: the server may have saved it. Your edits remain here. Do not retry; explicitly discard and reopen to inspect the saved project.':error.message==='ASSET_MISSING'?'Save refused: artwork was removed, possibly by another tab. Your edits remain here. Reimport the artwork or deliberately change its reference before saving.':'Save failed: '+error.message+'. Your edits remain here.';
            }}
            finally{busy=false;notify();}
        },
        reset(){throw Error('Detach the project before resetting session visuals.');},
        dispose(){disposed=true;expressions.dispose();for(const item of media.values())if(item.url)URL.revokeObjectURL(item.url);},
    };
}
