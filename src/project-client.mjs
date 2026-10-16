import { validateCleanupPreview, validateCleanupRequest } from '../plugins/sillynovel-storage/schema.mjs';
const ROOT='/api/plugins/sillynovel-storage';
export function createProjectClient(getHeaders) {
    async function request(path='',method='GET',value) {
        const response=await fetch(ROOT+path,{method,credentials:'same-origin',headers:{...getHeaders(),...(value!==undefined?{'Content-Type':value instanceof Blob?'image/png':'application/vnd.sillynovel+json'}:{})},body:value===undefined?undefined:value instanceof Blob?value:JSON.stringify(value)});
        if(!response.ok){let code='STORAGE_UNAVAILABLE';try{code=(await response.json()).code||code;}catch{}throw Error(code);}
        return response.json();
    }
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
    return {previewCleanup,removeUnusedAssets,exportBundle:id=>bundle('/projects/'+encodeURIComponent(id)+'/export'),importBundle:file=>bundle('/projects/import','POST',file),capabilities:()=>request('/capabilities'),list:()=>request('/projects'),create:name=>request('/projects','POST',{name}),
        load:id=>request('/projects/'+encodeURIComponent(id)),save:(id,body)=>request('/projects/'+encodeURIComponent(id),'PUT',body),
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
