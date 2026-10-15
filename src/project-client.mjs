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
    return {exportBundle:id=>bundle('/projects/'+encodeURIComponent(id)+'/export'),importBundle:file=>bundle('/projects/import','POST',file),capabilities:()=>request('/capabilities'),list:()=>request('/projects'),create:name=>request('/projects','POST',{name}),
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
