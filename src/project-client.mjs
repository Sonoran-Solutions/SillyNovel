import { validateCleanupPreview, validateCleanupRequest } from '../plugins/sillynovel-storage/schema.mjs';
const ROOT='/api/plugins/sillynovel-storage';
/** A refusal or failure carrying the plugin's code (message is the code too) and any details the plugin sent. */
export class StorageError extends Error {
    constructor(code,details={}){super(code);this.name='StorageError';this.code=code;this.details=details;}
}
export function createProjectClient(getHeaders) {
    async function request(path='',method='GET',value,uncertain=false) {
        let response;
        try {
            response=await fetch(ROOT+path,{method,credentials:'same-origin',headers:{...getHeaders(),...(value!==undefined?{'Content-Type':value instanceof Blob?'image/png':'application/vnd.sillynovel+json'}:{})},body:value===undefined?undefined:value instanceof Blob?value:JSON.stringify(value)});
        } catch(error){throw uncertain?Error('SAVE_UNCERTAIN'):error;}
        if(!response.ok){let code=uncertain?'SAVE_UNCERTAIN':'STORAGE_UNAVAILABLE',details={};try{const body=await response.json();if(body&&typeof body==='object'&&!Array.isArray(body)){const {code:value,...rest}=body;if(typeof value==='string')code=value;details=rest;}}catch{}throw new StorageError(code,details);}
        try {return await response.json();}catch(error){throw uncertain?Error('SAVE_UNCERTAIN'):error;}
    }
    // The image ledger (plugin schema v3): an unreachable plugin or an unreadable reply is STORAGE_UNAVAILABLE, never a raw error.
    const image=(id,path)=>'/projects/'+encodeURIComponent(id)+'/image/'+path;
    const ledger=(...args)=>request(...args).catch(error=>{throw error instanceof StorageError?error:new StorageError('STORAGE_UNAVAILABLE');});
    const imageLedger={
        imageSession:id=>ledger(image(id,'session')),
        beginImageSession:(id,{tab,workflowSha256,takeover})=>ledger(image(id,'session/begin'),'POST',{tab,workflowSha256,...(takeover?{takeover:true}:{})}),
        heartbeatImageSession:(id,{sessionId,tab})=>ledger(image(id,'session/heartbeat'),'POST',{sessionId,tab}),
        endImageSession:(id,{sessionId,tab})=>ledger(image(id,'session/end'),'POST',{sessionId,tab}),
        reserveImageJob:(id,body)=>ledger(image(id,'jobs'),'POST',body),
        transitionImageJob:(id,jobId,body)=>ledger(image(id,'jobs/'+encodeURIComponent(jobId)),'POST',body),
        imageHostDeleted:(id,jobId)=>ledger(image(id,'jobs/'+encodeURIComponent(jobId)+'/host-deleted'),'POST',{}),
        imageJobs:id=>ledger(image(id,'jobs')),
        imageCache:(id,payloadSha256)=>ledger(image(id,'cache?payload='+encodeURIComponent(payloadSha256))),
        cleanupImageJobs:(id,jobIds)=>ledger(image(id,'jobs/cleanup'),'POST',{jobIds}),
    };
    async function bundle(path,method='GET',file) {
        const limit=8*1024*1024+32768;
        if(file && (!file.name.endsWith('.sillynovel') || file.size>limit))throw Error('Select a .sillynovel bundle up to 8 MiB + 32 KiB.');
        const response=await fetch(ROOT+path,{method,credentials:'same-origin',headers:{...getHeaders(),...(file?{'Content-Type':'application/vnd.sillynovel.bundle'}:{})},body:file});
        if(!response.ok){let code='STORAGE_UNAVAILABLE';try{code=(await response.json()).code||code;}catch{}throw Error(code);}
        if(file)return response.json();
        if(response.headers.get('Content-Type')?.split(';')[0]!=='application/vnd.sillynovel.bundle')throw Error('INVALID_BUNDLE_DOWNLOAD');
        const blob=await response.blob();if(!blob.size||blob.size>limit)throw Error('INVALID_BUNDLE_DOWNLOAD');return blob;
    }
    async function previewCleanup(id) {
        return validateCleanupPreview(await request('/projects/'+encodeURIComponent(id)+'/unused-assets'),id);
    }
    async function removeUnusedAssets(id,preview,assetIds) {
        validateCleanupPreview(preview,id);
        const body=validateCleanupRequest({expectedRevision:preview.revision,inventoryRevision:preview.inventoryRevision,assetIds});
        const selected=preview.candidates.filter(a=>assetIds.includes(a.assetId));
        if(selected.length!==assetIds.length)throw Error('INVALID_CLEANUP_SELECTION');
        let response;
        try {response=await fetch(ROOT+'/projects/'+encodeURIComponent(id)+'/unused-assets/remove',{method:'POST',credentials:'same-origin',
            headers:{...getHeaders(),'Content-Type':'application/vnd.sillynovel+json'},body:JSON.stringify(body)});}
        catch {throw Error('CLEANUP_UNCERTAIN');}
        if(!response.ok){let code='CLEANUP_UNCERTAIN';try{const value=(await response.json()).code;if(typeof value==='string')code=value;}catch{}throw Error(code);}
        try {
            const receipt=await response.json();
            if(receipt.projectId!==id || receipt.revision!==preview.revision || receipt.deletedCount!==assetIds.length
                || !Array.isArray(receipt.deletedIds) || receipt.deletedIds.length!==assetIds.length || new Set(receipt.deletedIds).size!==assetIds.length
                || !receipt.deletedIds.every(id=>assetIds.includes(id)) || receipt.reclaimedBytes!==selected.reduce((sum,a)=>sum+a.byteCount,0))throw Error('INVALID_RECEIPT');
            return receipt;
        } catch {throw Error('CLEANUP_UNCERTAIN');}
    }
    return {...imageLedger,previewCleanup,removeUnusedAssets,exportBundle:id=>bundle('/projects/'+encodeURIComponent(id)+'/export'),importBundle:file=>bundle('/projects/import','POST',file),capabilities:()=>request('/capabilities'),list:()=>request('/projects'),create:name=>request('/projects','POST',{name}),
        load:id=>request('/projects/'+encodeURIComponent(id)),save:(id,body)=>request('/projects/'+encodeURIComponent(id),'PUT',body,true),
        upload:(id,file)=>request('/projects/'+encodeURIComponent(id)+'/assets','POST',file),
        async asset(project,id){
            const response=await fetch(ROOT+'/projects/'+encodeURIComponent(project)+'/assets/'+encodeURIComponent(id),{credentials:'same-origin'});
            if(!response.ok)throw Error('ASSET_UNAVAILABLE');
            const blob=await response.blob();if(blob.size>5*1024*1024 || blob.type!=='image/png')throw Error('INVALID_ASSET');
            const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
            if(hash!==response.headers.get('X-Content-SHA256'))throw Error('ASSET_DIGEST');
            return {blob,hash};
        }};
}
