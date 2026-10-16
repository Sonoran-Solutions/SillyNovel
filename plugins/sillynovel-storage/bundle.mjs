import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { demand, exact, label, validId, validateScene } from './schema.mjs';
import { decodePNG, digest, MAX_BYTES } from './png.mjs';

export const BUNDLE_TYPE = 'application/vnd.sillynovel.bundle';
// ponytail: experimental copy ceilings; review measured memory before raising limits or adding compression.
export const BUNDLE_BYTES = 8 * 1024 * 1024 + 32768;
export const ASSET_BYTES = 6 * 1024 * 1024;
export const PIXELS = 4 * 1024 * 1024;
export const references = scene => [...new Set([scene.backgroundAssetId, ...scene.actors.map(a=>a.spriteAssetId)].filter(Boolean))];

function validate(bundle) {
    demand(exact(bundle,['format','version','name','scene','assets']) && bundle.format==='sillynovel-project', 'INVALID_BUNDLE');
    demand(bundle.version===1, 'BUNDLE_VERSION');
    demand(label(bundle.name), 'INVALID_BUNDLE'); validateScene(bundle.scene);
    demand(Buffer.byteLength(JSON.stringify({name:bundle.name,scene:bundle.scene}))<=32768,'BUNDLE_LIMIT',413);
    demand(Array.isArray(bundle.assets) && bundle.assets.length<=21,'BUNDLE_LIMIT',413);
    const refs=new Set(references(bundle.scene)), seen=new Set(); let total=0,pixels=0;
    const assets=bundle.assets.map(a=>{
        demand(exact(a,['assetId','mediaType','byteLength','sha256','data']) && validId(a.assetId) && !seen.has(a.assetId) && refs.has(a.assetId),'BUNDLE_REFERENCE');
        seen.add(a.assetId);
        demand(a.mediaType==='image/png' && Number.isSafeInteger(a.byteLength) && a.byteLength>0 && a.byteLength<=MAX_BYTES,'BUNDLE_ASSET');
        total+=a.byteLength; demand(total<=ASSET_BYTES,'BUNDLE_LIMIT',413);
        demand(typeof a.sha256==='string' && /^[0-9a-f]{64}$/.test(a.sha256) && typeof a.data==='string' && a.data.length===4*Math.ceil(a.byteLength/3),'BUNDLE_ASSET');
        const bytes=Buffer.from(a.data,'base64');
        demand(bytes.toString('base64')===a.data && bytes.length===a.byteLength && digest(bytes)===a.sha256,'BUNDLE_DIGEST');
        // Check aggregate allocation before invoking the existing full decoder.
        demand(bytes.length>=24,'INVALID_PNG'); pixels+=bytes.readUInt32BE(16)*bytes.readUInt32BE(20);
        demand(pixels<=PIXELS,'BUNDLE_PIXELS',413);
        const metadata=decodePNG(bytes);
        return {assetId:a.assetId,bytes,...metadata};
    });
    demand(refs.size===seen.size && [...refs].every(id=>seen.has(id)),'BUNDLE_REFERENCE');
    return {name:bundle.name,scene:bundle.scene,assets};
}
function processBundle(mode,value) {
    if(mode==='encode') {
        const bundle={format:'sillynovel-project',version:1,name:value.name,scene:value.scene,assets:value.assets.map(a=>({assetId:a.id,mediaType:'image/png',byteLength:a.bytes.length,sha256:a.sha256,data:Buffer.from(a.bytes).toString('base64')}))};
        validate(bundle);
        const bytes=Buffer.from(JSON.stringify(bundle));demand(bytes.length<=BUNDLE_BYTES,'BUNDLE_LIMIT',413);return bytes;
    }
    const bytes=Buffer.from(value);demand(bytes.length<=BUNDLE_BYTES,'BUNDLE_LIMIT',413);
    let bundle;try{bundle=JSON.parse(bytes.toString('utf8'));}catch{demand(false,'INVALID_BUNDLE');}
    // One canonical JSON serialization also rejects duplicate keys, invalid UTF-8,
    // alternate spellings and trailing content; v1 accepts only files we generate.
    demand(Buffer.from(JSON.stringify(bundle)).equals(bytes),'NONCANONICAL_BUNDLE');
    return validate(bundle);
}
let busy=false;
export async function bundleJob(mode,value) {
    demand(!busy,'BUNDLE_BUSY',429);busy=true;
    try {
        return await new Promise((resolve,reject)=>{
            const worker=new Worker(new URL(import.meta.url),{workerData:{mode,value},resourceLimits:{maxOldGenerationSizeMb:128}});
            let result,error;
            const timer=setTimeout(()=>{error=Object.assign(Error('BUNDLE_TIMEOUT'),{code:'BUNDLE_TIMEOUT',status:413});worker.terminate();},15000);
            worker.once('message',message=>{result=message;});
            worker.once('error',()=>{error=Object.assign(Error('INVALID_BUNDLE'),{code:'INVALID_BUNDLE',status:400});});
            worker.once('exit',code=>{
                clearTimeout(timer);
                if(!error && (code || !result))error=Object.assign(Error('BUNDLE_FAILED'),{code:'BUNDLE_FAILED',status:400});
                if(!error && result.error)error=Object.assign(Error(result.error),{code:result.error,status:result.status});
                if(error)reject(error);else resolve(result.value);
            });
        });
    } finally {busy=false;}
}
if(!isMainThread && ['encode','decode'].includes(workerData?.mode)) {
    try {parentPort.postMessage({value:processBundle(workerData.mode,workerData.value)});}
    catch(error){parentPort.postMessage({error:error.code||'INVALID_BUNDLE',status:error.status||400});}
}
