const ROOT='/api/plugins/sillynovel-storage';
export function createProjectClient(getHeaders) {
    async function request(path='',method='GET',value) {
        const response=await fetch(ROOT+path,{method,credentials:'same-origin',headers:{...getHeaders(),...(value!==undefined?{'Content-Type':value instanceof Blob?'image/png':'application/vnd.sillynovel+json'}:{})},body:value===undefined?undefined:value instanceof Blob?value:JSON.stringify(value)});
        if(!response.ok){let code='STORAGE_UNAVAILABLE';try{code=(await response.json()).code||code;}catch{}throw Error(code);}
        return response.json();
    }
    return {capabilities:()=>request('/capabilities'),list:()=>request('/projects'),create:name=>request('/projects','POST',{name}),
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
