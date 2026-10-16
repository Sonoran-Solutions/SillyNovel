import { fingerprintHistory } from './source-prefix.mjs';
import { evidenceStamp } from './transient-scene.mjs';

// A projection-only journal: never passed to project serialization or the global reducer.
export function createProjectExpressions(actions, globalScene, current, changed) {
    const epoch=actions.getSnapshot().sessionEpoch,ownerKey='project-expressions:'+crypto.randomUUID();
    let cache=null,sources=[],stamp=null,work=0,selectionRevision=0,historyRevision=0,disposed=false,busy=false;
    let notice='Temporary message expressions are not saved.',decisions=[];
    const assets=[],media=new Map(),pending=new Map();
    const signature=s=>JSON.stringify([evidenceStamp(s),s.owner,s.selectionRevision,s.generation]);
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const live=()=>!disposed&&current()&&actions.getSnapshot().sessionEpoch===epoch;
    const notify=text=>{if(text)notice=text;if(!disposed)changed();};
    function release(id){const item=media.get(id);if(item)URL.revokeObjectURL(item.url);media.delete(id);const i=assets.findIndex(a=>a.id===id);if(i>=0)assets.splice(i,1);}
    function discard(entries){decisions=decisions.filter(d=>!entries.includes(d));for(const d of entries)if(!decisions.some(v=>v.assetId===d.assetId))release(d.assetId);}
    function clear(){stamp=null;cache=null;sources=[];decisions=[];for(const id of [...media.keys()])release(id);for(const url of pending.keys())URL.revokeObjectURL(url);pending.clear();}
    function compatible(asset){const actor=globalScene().view.cast.find(a=>a.key===asset.characterKey);return actor&&same(actor.outfit,asset.outfit);}
    function authority(snapshot){
        const key=snapshot.cursor?.sourceKey,g=snapshot.generation;
        if(!live()||snapshot.owner?.scope!=='character'||snapshot.owner.chatId==null||snapshot.selectionState!=='valid'||!key||!sources.some(s=>s.key===key))return false;
        // End without completion provenance is unresolved, never a successful finish.
        return !(g?.id!=null&&['streaming','unknown'].includes(g.status)&&(g.sourceKey===key||!g.sourceKey&&snapshot.head?.sourceKey===key));
    }
    async function sync(refresh=true){
        const ticket=++work,{snapshot,history}=actions.getSceneEvidence(refresh),captured=signature(snapshot);
        if(!live()){clear();return false;}
        if(stamp!==captured){stamp=null;selectionRevision++;}
        for(const [url,sourceStamp] of pending)if(sourceStamp!==captured){URL.revokeObjectURL(url);pending.delete(url);}
        if(!Array.isArray(history)||history.some(s=>!s||typeof s.sourceKey!=='string'||typeof s.text!=='string')||new Set(history.map(s=>s.sourceKey)).size!==history.length){clear();notify('UNRESOLVED_SOURCE: temporary expressions cleared; global layout retained.');return false;}
        try {
            const next=await fingerprintHistory(history,ownerKey,cache,()=>ticket===work&&live()&&signature(actions.getSnapshot())===captured);
            if(!next||ticket!==work||!live()||signature(actions.getSceneEvidence(refresh).snapshot)!==captured)return false;
            let first=0;while(first<Math.min(sources.length,next.sources.length)&&same(sources[first],next.sources[first]))first++;
            if(first<sources.length){discard(decisions.filter(d=>sources.findIndex(s=>s.key===d.source.key)>=first));notice='Source/history changed: dependent temporary expressions invalidated; base outfit retained.';}
            if(!same(sources,next.sources))historyRevision++;
            sources=next.sources;cache=next;
            const incompatible=assets.filter(a=>!compatible(a));
            for(const asset of incompatible){decisions=decisions.filter(d=>d.assetId!==asset.id);release(asset.id);notice='Outfit changed: incompatible temporary expressions cleared.';}
            stamp=captured;notify();return authority(snapshot);
        }catch(error){if(ticket===work&&live()){clear();notify(error.message);}return false;}
    }
    function token(){const s=actions.getSnapshot();return {stamp:signature(s),selectionRevision,historyRevision,globalRevision:globalScene().revision,source:sources.find(v=>v.key===s.cursor?.sourceKey)};}
    async function valid(t){return await sync()&&t.stamp===stamp&&t.selectionRevision===selectionRevision&&t.historyRevision===historyRevision&&t.globalRevision===globalScene().revision&&same(t.source,sources.find(s=>s.key===t.source?.key));}
    async function dispatch(command){
        if(!['setExpression','clearExpression'].includes(command.type))throw Error('INVALID_COMMAND');
        if(!await sync())throw Error('UNRESOLVED_SOURCE: select a stable verified message; completion may be unresolved.');
        const actor=globalScene().view.cast.find(a=>a.key===command.characterKey);
        if(!actor)throw Error('Select a manually registered project actor.');
        const asset=assets.find(a=>a.id===command.assetId);
        if(command.type==='setExpression'&&(!asset||asset.characterKey!==actor.key||!compatible(asset)))throw Error('INCOMPATIBLE_ASSET');
        const source=sources.find(s=>s.key===actions.getSnapshot().cursor.sourceKey),index=sources.indexOf(source);
        const retained=decisions.filter(d=>sources.findIndex(s=>s.key===d.source.key)<=index&&!(d.source.key===source.key&&d.characterKey===actor.key));
        if(command.type==='setExpression'&&retained.length>=400)throw Error('Temporary expression limit: 400 decisions. Clear choices or detach/reopen.');
        const corrected=decisions.some(d=>sources.findIndex(s=>s.key===d.source.key)>index);
        const suffix=decisions.filter(d=>sources.findIndex(s=>s.key===d.source.key)>index);
        decisions=retained;
        if(command.type==='setExpression')decisions.push({source,characterKey:actor.key,assetId:asset.id,revision:asset.revision});
        for(const d of suffix)if(!decisions.some(v=>v.assetId===d.assetId))release(d.assetId);
        notify((command.type==='setExpression'?'Applied temporary expression.':'Cleared expression · base outfit restored.')+(corrected?' Historical correction invalidated later expressions.':'')+' Not saved.');return true;
    }
    async function importFile(file,key,name,selectionCurrent=()=>true){
        if(busy)throw Error('Wait for the temporary PNG decode to finish.');
        if(!await sync())throw Error('UNRESOLVED_SOURCE: select a stable verified message first.');
        const actor=globalScene().view.cast.find(a=>a.key===key),captured=token();
        name=name?.trim()||file?.name?.replace(/\.png$/i,'').slice(0,80)||'Temporary expression';
        if(!actor||!name||name.length>80)throw Error('Select an actor and use a label of 1–80 characters.');
        if(!file||file.type!=='image/png'||!file.size||file.size>5*1024*1024)throw Error('Use a static PNG up to 5 MiB.');
        if(assets.length>=32||[...media.values()].reduce((n,a)=>n+a.bytes,0)+file.size>32*1024*1024)throw Error('Temporary artwork limit: 32 PNGs / 32 MiB. Detach/reopen to release them.');
        busy=true;let url;notify('Decoding temporary PNG… native reading and replying remain available.');
        try {
            const bytes=new Uint8Array(await file.arrayBuffer()),v=new DataView(bytes.buffer);
            if(bytes.length<33||![137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))throw Error('PNG_REQUIRED');
            const ascii=(a,b)=>String.fromCharCode(...bytes.subarray(a,b));
            if(v.getUint32(8)!==13||ascii(12,16)!=='IHDR')throw Error('PNG_REQUIRED');
            const width=v.getUint32(16),height=v.getUint32(20);
            if(!width||!height||Math.max(width,height)>4096||width*height>16000000)throw Error('PNG dimensions exceed 4096px / 16M pixels.');
            if([...media.values()].reduce((n,a)=>n+a.pixels,0)+width*height>32000000)throw Error('Temporary artwork limit: 32M decoded pixels. Detach/reopen to release them.');
            let end=false;
            for(let i=8;i<bytes.length;){if(i+12>bytes.length)throw Error('PNG_REQUIRED');const size=v.getUint32(i),type=ascii(i+4,i+8);if(size>bytes.length-i-12)throw Error('PNG_REQUIRED');if(type==='acTL')throw Error('Animated PNG is unsupported.');i+=size+12;if(type==='IEND'){if(size||i!==bytes.length)throw Error('PNG_REQUIRED');end=true;break;}}
            if(!end)throw Error('PNG_REQUIRED');
            if(!await valid(captured)||!selectionCurrent())throw Error('STALE_SOURCE: source, selection, attachment or outfit changed.');
            url=URL.createObjectURL(file);pending.set(url,captured.stamp);const image=new Image();image.src=url;await image.decode();
            if(image.naturalWidth!==width||image.naturalHeight!==height)throw Error('PNG_REQUIRED');
            if(!await valid(captured)||!selectionCurrent())throw Error('STALE_SOURCE: source, selection, attachment or outfit changed.');
            const id='temporary-expression:'+crypto.randomUUID(),revision=crypto.randomUUID();
            assets.push({id,revision,kind:'expression',characterKey:key,outfitId:actor.outfit?.id??null,outfit:actor.outfit,available:true});
            media.set(id,{url,label:name,bytes:file.size,pixels:width*height});pending.delete(url);url=null;
            notify('Temporary expression ready: '+name+'. Choose Apply expression for this message. Not saved.');return id;
        } finally {if(url){pending.delete(url);URL.revokeObjectURL(url);}busy=false;if(!disposed)changed();}
    }
    return {sync,dispatch,importFile,
        get(){const snapshot=actions.getSnapshot(),ready=stamp===signature(snapshot)&&authority(snapshot);
            const view=globalScene().view;
            return {assets,media,notice:notice+(ready?'':' Expressions unavailable: select a stable verified message; streaming or unresolved completion cannot accept expressions.'),busy,ready,view:{...view,cast:view.cast.map(actor=>{
                const d=ready?decisions.find(d=>d.source.key===snapshot.cursor.sourceKey&&d.characterKey===actor.key):null;
                const a=d&&assets.find(a=>a.id===d.assetId&&a.revision===d.revision);
                return {...actor,expression:a&&compatible(a)?{id:a.id,revision:a.revision,status:a.available?'ready':'missing'}:null};
            })}};},
        failed(id){const asset=assets.find(a=>a.id===id);if(!asset)return;asset.available=false;const item=media.get(id);if(item?.url){URL.revokeObjectURL(item.url);item.url=null;}notify('Temporary expression art unavailable · base outfit restored.');},
        dispose(){disposed=true;work++;clear();},
    };
}
