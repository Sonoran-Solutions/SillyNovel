import { createScene, reconcileScene, reduceScene } from './scene-reducer.mjs';

export const TEST_ACTORS = [
    { preset: 'mira-a', label: 'Mira', description: 'Mira A · rose cape' },
    { preset: 'mira-b', label: 'Mira', description: 'Mira B · violet hat' },
    { preset: 'rowan', label: 'Rowan', description: 'Rowan · green tunic' },
    { preset: 'sage', label: 'Sage', description: 'Sage · gold hat' },
];
const fixtureURL = name => new URL('../tests/fixtures/m12-stage/' + name + '.png', import.meta.url).href;
export const evidenceStamp = s => JSON.stringify([s.sessionEpoch, s.sourceRevision, s.cursor?.sourceKey, s.cursor?.revision]);

/** Only the reader's unique host-object keys and explicit manual actors attest identity.
 * Hashes are change detectors, never proof of durable ownership or card binding. */
export function createTransientScene(actions, changed) {
    let scene = null, epoch = null, ownerKey, historyRevision = 0, selectionRevision = 0;
    let selectedKey = null, priorHistory = '', catalogRevision = 0, nextActor = 0, disposed = false;
    let actors = [], assets = [], media = new Map(), digests = new Map();
    let notice = 'Choose test art and explicitly register session actors. No host card binding.';
    let work = 0;
    const pending = new Map();
    const revoke = item => { if (item?.temporary) URL.revokeObjectURL(item.url); };
    function clear(nextEpoch) {
        work++;
        for (const url of pending.keys()) URL.revokeObjectURL(url);
        pending.clear();
        for (const item of media.values()) revoke(item);
        actors = []; assets = []; media = new Map(); digests = new Map(); scene = null;
        epoch = nextEpoch; ownerKey = disposed ? null : 'session-stage-' + crypto.randomUUID();
        historyRevision = 0; selectionRevision = 0; selectedKey = null; priorHistory = ''; catalogRevision = 0;
        for (const name of ['tavern', 'forest']) {
            assets.push({ id: name, revision: 'fixture-v1', kind: 'background', available: true });
            media.set(name, { url: fixtureURL(name), label: name });
        }
    }
    function current(stamp, fresh = false) {
        // Refresh canonical evidence even if the host hasn't delivered its event yet.
        return !disposed && evidenceStamp(fresh ? actions.getSceneEvidence().snapshot : actions.getSnapshot()) === stamp;
    }
    function notify(text) { if (text) notice = text; if (!disposed) changed(); }
    function context(sources, snapshot) {
        return { ownerKey, sessionEpoch: epoch, historyRevision, selectionRevision,
            selectedSourceKey: snapshot.cursor?.sourceKey ?? null, sources,
            characters: actors.map(({key,label}) => ({key,label})), catalog: {revision: catalogRevision, assets} };
    }
    async function sync(refreshCanonical = true) {
        const { snapshot, history } = actions.getSceneEvidence(refreshCanonical);
        if (epoch !== snapshot.sessionEpoch) { clear(snapshot.sessionEpoch); notice = 'New activation: temporary visuals cleared.'; }
        const stamp = evidenceStamp(snapshot), ticket = ++work;
        for (const [url, captured] of pending) if (captured !== stamp) { URL.revokeObjectURL(url); pending.delete(url); }
        if (history.some(s => !s || typeof s.sourceKey !== 'string' || typeof s.text !== 'string')
            || new Set(history.map(s => s.sourceKey)).size !== history.length) {
            scene = null; notify('UNRESOLVED_SOURCE: history has unavailable or ambiguous source objects. Text reading remains available.'); return false;
        }
        // ponytail: whole-prefix hashing is quadratic on the first load of a long history;
        // reuse immutable revision results now, add validated incremental prefix hashing if measured necessary.
        const prefix = [];
        const sources = [], activeDigests = new Map();
        for (const s of history) {
            prefix.push([s.author.kind, ['unresolved', s.author.label], s.text, s.swipeId == null ? null : [String(s.swipeId), s.text]]);
            const serialized = JSON.stringify(['sn-source-v1', ownerKey, 'session', ownerKey, prefix]);
            let digest = digests.get(serialized);
            if (!digest) {
                digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))), b => b.toString(16).padStart(2,'0')).join('');
                if (ticket !== work || !current(stamp)) return false;
                digests.set(serialized, digest);
            }
            activeDigests.set(serialized,digest);
            sources.push({key:s.sourceKey,revision:s.revision,swipeRevision:s.swipeId ?? 0,fingerprintVersion:'sn-source-v1',prefixSha256:digest});
        }
        if (ticket !== work || !current(stamp, refreshCanonical)) return false;
        const signature = JSON.stringify(sources);
        if (signature !== priorHistory) { historyRevision++; priorHistory = signature; }
        if (selectedKey !== snapshot.cursor?.sourceKey) { selectionRevision++; selectedKey = snapshot.cursor?.sourceKey; }
        const c = context(sources, snapshot);
        const outcome = scene ? reconcileScene(scene,c) : createScene(c);
        if (!outcome.result.accepted) { notify(outcome.result.code + ': ' + (outcome.result.detail ?? 'Visual authority unavailable.')); return false; }
        if (scene?.commands.some((command,index)=>command.valid && !outcome.scene.commands[index]?.valid)) notice = 'Historical change: dependent visuals invalidated. Choose them again.';
        scene = outcome.scene;
        // Retain only the active validated prefixes, not private text from prior revisions.
        digests = activeDigests;
        notify(); return true;
    }
    function authority() {
        const c = scene.context;
        return { ownerKey:c.ownerKey, sessionEpoch:c.sessionEpoch, historyRevision:c.historyRevision,
            selectionRevision:c.selectionRevision, catalogRevision:c.catalog.revision, expectedRevision:scene.revision,
            source:c.sources.find(s=>s.key===c.selectedSourceKey), origin:'manual' };
    }
    function apply(command, token = authority()) {
        const outcome = reduceScene(scene,command,token);
        if (outcome.result.accepted) scene = outcome.scene;
        notify(outcome.result.accepted ? 'Applied · unsaved. Later source choices may be invalidated by historical corrections.'
            : outcome.result.code + ': ' + (outcome.result.detail ?? 'Choose a valid source, actor or explicit slot mode.'));
        return outcome.result.accepted;
    }
    async function dispatch(command) { if (await sync()) return apply(command); return false; }
    async function register(preset, label) {
        if (!(await sync())) return;
        const test = TEST_ACTORS.find(a=>a.preset===preset);
        label = label.trim();
        if (!label || label.length > 80) return notify('Actor name must contain 1–80 characters.');
        const key = 'manual-session-actor-' + (++nextActor);
        actors.push({key,label,preset:test?.preset ?? null,description:test?.description ?? 'Manual actor',defaultURL:test ? fixtureURL(test.preset) : null});
        if (test) {
            const add = (suffix,kind,file,outfitId) => {
                const id = key + ':' + suffix;
                assets.push({id,revision:'fixture-v1',kind,characterKey:key,available:file !== null,...(kind==='expression'?{outfitId}: {})});
                media.set(id,{url:file ? fixtureURL(file) : null,label:suffix}); return id;
            };
            add('neutral-sprite','outfit',test.preset);
            add('missing','outfit',null);
            if (preset==='mira-a') {
                const coat = add('blue-coat','outfit','mira-a-coat');
                for (const outfitId of [null,key+':neutral-sprite']) {
                    add('joy-'+(outfitId?'outfit':'default'),'expression','mira-a-joy',outfitId);
                    add('stern-'+(outfitId?'outfit':'default'),'expression','mira-a-stern',outfitId);
                }
                add('coat-joy','expression','mira-a-coat-joy',coat);
            }
        }
        catalogRevision++;
        if (await sync()) apply({type:'addCharacter',characterKey:key});
        return key;
    }
    async function importFile(file, kind, actorKey) {
        if (!(await sync())) return;
        const stamp = evidenceStamp(actions.getSnapshot()), token = authority();
        const actor = actors.find(a=>a.key===actorKey);
        if (kind !== 'background' && !actor) return notify('Register and select a session actor first.');
        let url;
        try {
            // ponytail: prototype accepts static rasters up to 5 MiB / 4096px / 16M pixels;
            // production importer limits need separate measured policy and authorization.
            if (!file || file.size > 5*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw Error('Use a static PNG, JPEG or WebP up to 5 MiB.');
            const bytes = new Uint8Array(await file.arrayBuffer());
            if (!current(stamp, true) || scene?.context.ownerKey!==token.ownerKey || scene?.revision!==token.expectedRevision) throw Error('STALE_SOURCE: file read belongs to an old source or session.');
            const ascii = (start,end) => String.fromCharCode(...bytes.slice(start,end));
            const png = bytes.length>8 && bytes[0]===137 && ascii(1,4)==='PNG' && bytes[4]===13 && bytes[5]===10 && bytes[6]===26 && bytes[7]===10;
            const jpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
            const webp = ascii(0,4)==='RIFF' && ascii(8,12)==='WEBP';
            if (!(file.type==='image/png' && png || file.type==='image/jpeg' && jpeg || file.type==='image/webp' && webp)) throw Error('Decoded format must match PNG, JPEG or WebP content.');
            if (png) {
                const v = new DataView(bytes.buffer);
                for (let i=8;i+12<=bytes.length;) { const size=v.getUint32(i); if (ascii(i+4,i+8)==='acTL') throw Error('Animated images are unsupported.'); i+=size+12; }
            }
            if (webp && (ascii(12,16)==='VP8X' && (bytes[20]&2))) throw Error('Animated images are unsupported.');
            url = URL.createObjectURL(file); pending.set(url,stamp);
            const image = new Image(); image.src = url; await image.decode();
            if (!image.naturalWidth || !image.naturalHeight || Math.max(image.naturalWidth,image.naturalHeight)>4096 || image.naturalWidth*image.naturalHeight>16000000) throw Error('Image dimensions exceed the prototype ceiling.');
            if (!current(stamp, true) || scene?.context.ownerKey!==token.ownerKey || scene?.revision!==token.expectedRevision || scene?.context.catalog.revision!==token.catalogRevision) throw Error('STALE_SOURCE: image finished after a session, source, selection or manual choice changed.');
            const id = kind==='background' ? 'temporary-background' : actorKey+':temporary-outfit';
            const old = media.get(id);
            assets = assets.filter(a=>a.id!==id);
            assets.push({id,revision:crypto.randomUUID(),kind,available:true,...(kind==='outfit'?{characterKey:actorKey}:{})});
            pending.delete(url);
            media.set(id,{url,temporary:true,label:'Temporary file'}); url=null; revoke(old); catalogRevision++;
            if (await sync()) apply({type:kind==='background'?'setBackground':'setOutfit',assetId:id,...(kind==='outfit'?{characterKey:actorKey}:{})});
        } catch (error) { if (url) { URL.revokeObjectURL(url); pending.delete(url); } if (!disposed && epoch===token.sessionEpoch && ownerKey===token.ownerKey) notify(error.message || 'Image decode failed.'); }
    }
    return { sync, dispatch, register, importFile,
        get: () => ({scene,actors,assets,media,notice}),
        reset() { clear(actions.getSnapshot().sessionEpoch); notice='Temporary visuals reset. Nothing was saved.'; return sync(); },
        dispose() { disposed=true; clear(null); },
    };
}
