import { chmodSync, lstatSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { demand } from './schema.mjs';
import { MAX_BYTES } from './png.mjs';
import { BUNDLE_TYPE, BUNDLE_BYTES } from './bundle.mjs';
export const info = { id: 'sillynovel-storage', name: 'SillyNovel project storage', description: 'Optional local project persistence; experimental.' };
let store;
export function exit() { store?.close(); store = null; }
export async function init(router) {
    // Dynamic import leaves the host operational when its Node lacks SQLite.
    try {
        const [major,minor]=process.versions.node.split('.').map(Number);
        demand(major>22 || major===22 && minor>=13, 'UNSUPPORTED_RUNTIME', 503);
        const { openStore } = await import('./store.mjs');
        demand(typeof globalThis.DATA_ROOT === 'string' && isAbsolute(globalThis.DATA_ROOT), 'UNAVAILABLE', 503);
        // A root-level file cannot become a host account's directory/backup namespace.
        const filename = join(globalThis.DATA_ROOT, '.sillynovel-projects.sqlite');
        const existing=lstatSync(filename,{throwIfNoEntry:false});
        demand(!existing || existing.isFile() && !existing.isSymbolicLink(), 'INVALID_STORE', 503);
        store = openStore(filename);
        chmodSync(filename, 0o600);
    } catch { exit(); }
    router.use((req,res,next) => {
        res.set('Cache-Control','no-store');
        const profile = req.user?.profile;
        if (req.session?.handle !== profile?.handle) return res.status(503).json({code:'AUTHENTICATED_ACCOUNT_REQUIRED'});
        if (!profile || typeof profile.handle !== 'string' || !Number.isSafeInteger(profile.created)) return res.status(401).json({code:'UNAUTHORIZED'});
        // Refuse persistence even for GET if host CSRF is disabled. Host auth runs before the mounted router.
        if (typeof req.session?.csrfToken !== 'string' || req.session.csrfToken.length < 32) return res.status(503).json({code:'CSRF_REQUIRED'});
        if (req.method !== 'GET' && req.headers['x-csrf-token'] !== req.session.csrfToken) return res.status(403).json({code:'CSRF_REQUIRED'});
        if (!store) return res.status(503).json({code:'STORAGE_UNAVAILABLE'});
        req.sillynovelOwner = JSON.stringify([profile.handle,profile.created]);
        next();
    });
    const route = fn => async (req,res) => {
        try { await fn(req,res); }
        catch (error) { if (!res.headersSent) res.status(error.status || 503).json({code:error.code && error.status ? error.code : 'STORAGE_UNAVAILABLE'}); }
    };
    async function body(req,type,limit) {
        demand(req.headers['content-type']?.split(';')[0] === type && req.headers['content-encoding'] === undefined, 'CONTENT_TYPE', 415);
        demand(!req.readableEnded && (!req.headers['content-length'] || Number(req.headers['content-length']) <= limit), 'BODY_LIMIT', 413);
        const chunks=[]; let size=0;
        for await (const chunk of req) { size+=chunk.length; demand(size<=limit,'BODY_LIMIT',413); chunks.push(chunk); }
        return Buffer.concat(chunks);
    }
    const json = async req => {
        const bytes = await body(req,'application/vnd.sillynovel+json',32768);
        try { return JSON.parse(bytes.toString('utf8')); } catch { demand(false,'INVALID_JSON'); }
    };
    router.get('/capabilities',route((req,res)=>res.json({apiVersion:1,schemaVersion:1,formats:['image/png'],maxBytes:MAX_BYTES,bundleVersion:1,bundleMaxBytes:BUNDLE_BYTES})));
    router.get('/projects',route((req,res)=>res.json(store.list(req.sillynovelOwner))));
    router.post('/projects',route(async(req,res)=>res.status(201).json(store.create(req.sillynovelOwner,await json(req)))));
    let bundleBusy=false;
    const portable=fn=>route(async(req,res)=>{
        demand(!bundleBusy,'BUNDLE_BUSY',429);bundleBusy=true;
        try {await fn(req,res);} finally {bundleBusy=false;}
    });
    router.post('/projects/import',portable(async(req,res)=>res.status(201).json(await store.importBundle(req.sillynovelOwner,await body(req,BUNDLE_TYPE,BUNDLE_BYTES)))));
    router.get('/projects/:id/export',portable(async(req,res)=>{
        const bytes=await store.exportBundle(req.sillynovelOwner,req.params.id);
        res.set('X-Content-Type-Options','nosniff').set('Content-Security-Policy',"sandbox; default-src 'none'")
            .set('Content-Disposition','attachment; filename="project.sillynovel"').type(BUNDLE_TYPE).send(bytes);
    }));
    router.get('/projects/:id',route((req,res)=>res.json(store.load(req.sillynovelOwner,req.params.id))));
    router.put('/projects/:id',route(async(req,res)=>res.json(store.save(req.sillynovelOwner,req.params.id,await json(req)))));
    router.post('/projects/:id/assets',route(async(req,res)=> {
        store.load(req.sillynovelOwner,req.params.id);
        res.status(201).json(store.importAsset(req.sillynovelOwner,req.params.id,await body(req,'image/png',MAX_BYTES)));
    }));
    router.get('/projects/:id/assets/:asset',route((req,res)=> {
        const asset=store.asset(req.sillynovelOwner,req.params.id,req.params.asset);
        res.set('X-Content-Type-Options','nosniff').set('X-Content-SHA256',asset.sha256).type('png').send(Buffer.from(asset.bytes));
    }));
}
