// M3.3 PR A host image-folder probe: /api/images/list, /folders, /delete and the static /user/images/ route on the
// disposable pinned 1.19.0 host, with synthetic decoys. A measurement, not a test of shipped code. No ComfyUI, no UI.
// node tests/probes/m3-image-folder/host.mjs <pinned-host-root>   (SN_PLAYWRIGHT_MODULE set; port 8128 free)
import { isDeepStrictEqual } from 'node:util';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHarness, PIN, repo } from '../m2-director/harness.mjs';

const KiB = 1024, MiB = 1024 * KiB;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SUB = 'SN-DECOY-SUB';
const CANARY = 'DECOY-OUTSIDE.txt';
const PNGS = ['forest', 'mira-a', 'mira-b', 'rowan', 'sage', 'tavern', 'mira-a-joy', 'mira-a-stern', 'mira-a-coat'].map(n => join(repo, 'tests/fixtures/m12-stage', n + '.png'));
const evidence = { startedAt: new Date(performance.timeOrigin).toISOString(), host: PIN, node: process.version, cases: [], findings: [],
    notTested: ['The owner\'s 1.18.0 install and other host versions', 'Files written by the real imagine/ComfyUI path (decoys go through /api/images/upload only)', 'gallery=true results in character subfolders (delete inside a subfolder)', 'Deleting a subfolder path, symlinks inside user/images, Windows path separators', 'Other user accounts\' directories and multi-user isolation', 'Large folders (listing cost), concurrent writes during a listing, clock skew', 'The deprecated /api/images/list/:folder URL form and HEAD requests', 'Physical devices'] };
let h, root, verdicts = { J5: 'STOP', J6: 'STOP' };

const bound = text => text.length <= 4 * KiB ? text : text.slice(0, 4 * KiB) + `…<truncated length=${text.length} sha256=${sha(text)}>`;
function record(id, request, res, observed) { evidence.cases.push({ id, request, status: res?.status ?? null, body: res ? bound(res.text) : null, observed }); }
const say = (kind, id, text) => { if (kind === 'FINDING') evidence.findings.push({ id, text }); console.log(kind + ' ' + id + ': ' + text); };

try {
    evidence.candidate = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    h = await createHarness(resolve(process.argv[2]), 'm3-image-folder');
    root = h.root;
    const { context, origin, data, userRoot } = h;
    evidence.browser = context.browser().version();
    const imagesDir = join(userRoot, 'user/images');
    // The harness logged in; take the session's token (same session, so generateToken returns the stored one).
    const token = (await (await context.request.get(origin + '/csrf-token')).json()).token;
    const post = async (path, data, csrf = true) => {
        const res = await context.request.post(origin + path, { headers: { ...(csrf ? { 'X-CSRF-Token': token } : {}), 'Content-Type': 'application/json' }, data: JSON.stringify(data), maxRedirects: 0 });
        const text = await res.text();
        let json; try { json = JSON.parse(text); } catch { json = undefined; }
        return { status: res.status(), text, json };
    };
    // Snapshot of the whole data root (paths relative to it), plus named files the cases aim at.
    async function snapshot() {
        const files = {};
        async function walk(dir) {
            for (const e of await readdir(dir, { withFileTypes: true }).catch(err => { if (err.code === 'ENOENT') return []; throw err; })) {
                const f = join(dir, e.name);
                if (e.isDirectory()) { files[f.slice(data.length + 1) + '/'] = 'dir'; await walk(f); } else if (e.isFile()) files[f.slice(data.length + 1)] = sha(await readFile(f));
            }
        }
        await walk(data);
        const at = async f => { try { return sha(await readFile(f)); } catch (e) { return 'absent:' + e.code; } };
        return { files, images: Object.keys(files).filter(f => f.startsWith('default-user/user/images/')).map(f => f.slice('default-user/user/images/'.length)).sort(),
            canary: await at(join(userRoot, CANARY)), canaryInUser: await at(join(userRoot, 'user', CANARY)), userSettings: await at(join(userRoot, 'settings.json')), dataSettings: await at(join(data, 'settings.json')), etcHostname: await at('/etc/hostname') };
    }
    const diff = (a, b) => ({ removed: Object.keys(a.files).filter(k => !(k in b.files)), added: Object.keys(b.files).filter(k => !(k in a.files)), changed: Object.keys(a.files).filter(k => k in b.files && a.files[k] !== b.files[k]) });
    let n = 0;
    const upload = async (name, ch_name = '') => {
        const bytes = await readFile(PNGS[n++ % PNGS.length]);
        const res = await post('/api/images/upload', { image: bytes.toString('base64'), format: 'png', ch_name, filename: name });
        if (res.status !== 200) throw Error('upload ' + name + ' ' + res.status + ' ' + res.text);
        return { res, path: res.json.path, sha256: sha(bytes) };
    };

    // Setup: canaries next to user/ (and one at user/ itself, the target of the '..' form), a decoy subfolder.
    await writeFile(join(userRoot, CANARY), 'SN canary outside user/images\n');
    await writeFile(join(userRoot, 'user', CANARY), 'SN canary at user/, outside images\n');
    const sub = await upload('sn-sub-decoy', SUB);
    evidence.setup = { subUploadPath: sub.path };

    // L2/L4 decoys: names sort opposite to upload order, one second apart.
    const timed = [];
    for (const name of ['sn-order-c', 'sn-order-b', 'sn-order-a']) { timed.push({ name: name + '.png', ...(await upload(name)) }); await delay(1100); }

    // L1 folder forms.
    const forms = [['absent', {}], ["''", { folder: '' }], ["'.'", { folder: '.' }], ["'/'", { folder: '/' }], ["'..'", { folder: '..' }], ['subfolder', { folder: SUB }]];
    const rootForms = [];
    for (const [label, body] of forms) {
        const res = await post('/api/images/list', body);
        const listsRoot = Array.isArray(res.json) && timed.every(t => res.json.includes(t.name));
        if (listsRoot) rootForms.push(label);
        record('L1 ' + label, { path: '/api/images/list', body }, res, { listsRoot, listsSubDecoy: Array.isArray(res.json) && res.json.includes('sn-sub-decoy.png') });
    }
    const after = await snapshot();
    say(rootForms.length ? 'PASS' : 'FINDING', 'L1', `forms listing the root user/images: ${rootForms.join(', ') || 'none'}; absent and '' return ${evidence.cases.filter(c => /^L1 (absent|'')$/.test(c.id)).map(c => c.status).join('/')}; subfolder form lists the subfolder ${evidence.cases.find(c => c.id === 'L1 subfolder').observed.listsSubDecoy}; image dirs after listing ${JSON.stringify(Object.keys(after.files).filter(k => k.startsWith('default-user/user/images') && k.endsWith('/')))}`);

    // L2 shape, ordering, type.
    const rootList = { folder: '.' };
    const byName = await post('/api/images/list', { ...rootList, sortField: 'name' }), byDate = await post('/api/images/list', { ...rootList, sortField: 'date' }), byDateDesc = await post('/api/images/list', { ...rootList, sortField: 'date', sortOrder: 'desc' }), byDefault = await post('/api/images/list', rootList);
    const types = {};
    for (const type of [0, 1, 2, 4, 7]) types[type] = await post('/api/images/list', { ...rootList, type });
    const elementTypes = [...new Set((byDate.json ?? []).map(x => typeof x))];
    const order = list => (list.json ?? []).filter(x => timed.some(t => t.name === x));
    const dateOrdered = isDeepStrictEqual(order(byDate), timed.map(t => t.name)) && isDeepStrictEqual(order(byDateDesc), timed.map(t => t.name).reverse());
    const mtimes = Object.fromEntries(await Promise.all(timed.map(async t => [t.name, (await stat(join(imagesDir, t.name))).mtimeMs])));
    record('L2', { path: '/api/images/list', bodies: { name: { ...rootList, sortField: 'name' }, date: { ...rootList, sortField: 'date' }, dateDesc: { ...rootList, sortField: 'date', sortOrder: 'desc' }, default: rootList, types: [0, 1, 2, 4, 7] } }, byDate,
        { elementTypes, byName: byName.json, byDate: byDate.json, byDateDesc: byDateDesc.json, byDefault: byDefault.json, dateOrdered, fsMtimeMs: mtimes, types: Object.fromEntries(Object.entries(types).map(([k, v]) => [k, { status: v.status, list: v.json }])) });
    say('FINDING', 'L2', `listing elements are ${elementTypes.join('/')} (no date or size); sortField 'date' orders by mtime ${dateOrdered} (default order equals date ${isDeepStrictEqual(byDefault.json, byDate.json)}); type 0 -> ${JSON.stringify(types[0].json?.length)} items, 1 -> ${types[1].json?.length}, 2 (video) -> ${types[2].json?.length}, 4 (audio) -> ${types[4].json?.length}, 7 -> ${types[7].json?.length}`);

    // L3 folders.
    const folders = await post('/api/images/folders', {});
    record('L3', { path: '/api/images/folders', body: {} }, folders, { list: folders.json });
    say('FINDING', 'L3', `/folders returns ${JSON.stringify(folders.json)} (directory names only, no root entry)`);

    // L4 static GET headers and the upload path form.
    const heads = {};
    for (const t of timed) {
        const res = await context.request.get(origin + t.path, { maxRedirects: 0 });
        const hd = res.headers(), lm = hd['last-modified'];
        heads[t.name] = { path: t.path, status: res.status(), lastModified: lm ?? null, etag: hd.etag ?? null, contentLength: hd['content-length'] ?? null, contentType: hd['content-type'] ?? null, bodySha256: sha(await res.body()), uploadedSha256: t.sha256,
            lastModifiedMatchesMtimeSecond: lm ? Date.parse(lm) === Math.floor(mtimes[t.name] / 1000) * 1000 : false };
    }
    const pathForm = timed.every(t => t.path === '/user/images/' + t.name);
    const allTimed = Object.values(heads).every(x => x.status === 200 && x.lastModifiedMatchesMtimeSecond && x.bodySha256 === x.uploadedSha256);
    const lmOrdered = timed.every((t, i) => i === 0 || Date.parse(heads[t.name].lastModified) > Date.parse(heads[timed[i - 1].name].lastModified));
    record('L4', { method: 'GET', paths: timed.map(t => t.path) }, null, { uploadPaths: timed.map(t => t.path), subUploadPath: sub.path, pathFormIsSlashUserImagesName: pathForm, headers: heads, lastModifiedStrictlyOrdered: lmOrdered });
    say(allTimed ? 'PASS' : 'FINDING', 'L4', `GET /user/images/<decoy>: statuses ${Object.values(heads).map(x => x.status).join('/')}, Last-Modified equals mtime to the second ${Object.values(heads).every(x => x.lastModifiedMatchesMtimeSecond)} (second resolution), ETag ${heads[timed[0].name].etag}, Content-Length ${heads[timed[0].name].contentLength}; upload path form '/user/images/<name>' ${pathForm} (e.g. ${timed[0].path}; subfolder ${sub.path})`);

    // J6: some form lists the root, and a time is obtainable for every listed file.
    const rootNames = byDate.json ?? [];
    let timeEach = rootForms.length > 0;
    for (const name of rootNames) {
        const res = await context.request.get(origin + '/user/images/' + encodeURIComponent(name), { maxRedirects: 0 });
        if (res.status() !== 200 || !res.headers()['last-modified']) timeEach = false;
    }
    verdicts.J6 = rootForms.length && timeEach ? 'GO' : 'STOP';
    evidence.j6 = { rootForms, listedRootFiles: rootNames.length, lastModifiedForEach: timeEach };
    if (verdicts.J6 === 'STOP') evidence.j6.missing = !rootForms.length ? 'no list form returns the root folder' : 'a listed file has no Last-Modified';

    // Delete cases, each with a fresh decoy and a before/after snapshot.
    async function del(id, mkPath, { csrf = true, expectDeleted }) {
        const decoy = await upload('sn-del-' + id.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        const name = decoy.path.split('/').pop();
        const target = mkPath(name);
        const before = await snapshot();
        const res = await post('/api/images/delete', { path: target }, csrf);
        const afterS = await snapshot();
        const d = diff(before, afterS);
        const decoyGone = !afterS.images.includes(name);
        const exact = expectDeleted ? decoyGone && isDeepStrictEqual(d, { removed: ['default-user/user/images/' + name], added: [], changed: [] }) : isDeepStrictEqual(d, { removed: [], added: [], changed: [] });
        const keep = s => ({ images: s.images, canary: s.canary, canaryInUser: s.canaryInUser, userSettings: s.userSettings, dataSettings: s.dataSettings, etcHostname: s.etcHostname });
        record(id, { path: '/api/images/delete', body: { path: target }, csrf }, res, { decoy: name, decoyGone, diff: d, exact, before: keep(before), after: keep(afterS) });
        return { res, decoyGone, exact, d };
    }
    const d1 = await del('D1', n => 'user/images/' + n, { expectDeleted: true });
    say(d1.exact && d1.res.status === 200 ? 'PASS' : 'FINDING', 'D1', `'user/images/<decoy>' -> ${d1.res.status} ${JSON.stringify(d1.res.text)}; decoy gone ${d1.decoyGone}; only the decoy changed ${d1.exact}`);
    const d2 = await del('D2', n => '/user/images/' + n, { expectDeleted: true });
    say(d2.exact && d2.res.status === 200 ? 'PASS' : 'FINDING', 'D2', `'/user/images/<decoy>' -> ${d2.res.status} ${JSON.stringify(d2.res.text)}; decoy gone ${d2.decoyGone}; only the decoy changed ${d2.exact}`);
    const refusals = [['D3a', () => 'user/images/../' + CANARY], ['D3b', () => '../settings.json'], ['D3c', () => '/etc/hostname'], ['D3d', () => 'user/images'], ['D3e', () => 'user/images/'], ['D3f', () => 'user/images/sn-no-such-file.png'], ['D3g', () => 'user/images/%2e%2e%2f' + CANARY]];
    let d3ok = true;
    for (const [id, mk] of refusals) {
        const r = await del(id, mk, { expectDeleted: false });
        d3ok &&= r.exact && r.res.status !== 200;
        say(r.exact ? (r.res.status >= 400 && r.res.status < 500 ? 'PASS' : 'FINDING') : 'FINDING', id, `${JSON.stringify(mk())} -> ${r.res.status} ${JSON.stringify(r.res.text.slice(0, 80))}; nothing changed ${r.exact}${r.exact ? '' : ' diff ' + JSON.stringify(r.d)}`);
    }
    const d4 = await del('D4', n => 'user/images/../images/' + n, { expectDeleted: true });
    say('FINDING', 'D4', `'user/images/../images/<decoy>' -> ${d4.res.status}; decoy deleted ${d4.decoyGone}; only the decoy changed ${d4.exact} (the route normalizes, so SillyNovel must send only the exact upload path)`);
    const d5 = await del('D5', n => 'user/images/' + n, { csrf: false, expectDeleted: false });
    say(d5.exact && d5.res.status >= 400 ? 'PASS' : 'FINDING', 'D5', `no X-CSRF-Token -> ${d5.res.status} ${JSON.stringify(d5.res.text.slice(0, 80))}; nothing deleted ${d5.exact}`);
    verdicts.J5 = (d1.exact && d1.res.status === 200 || d2.exact && d2.res.status === 200) && d3ok && d5.exact && d5.res.status >= 400 ? 'GO' : 'STOP';
    evidence.unexpectedPageErrors = h.pageErrors;
} catch (error) {
    evidence.error = error.stack;
    console.error(error);
} finally {
    evidence.verdicts = verdicts;
    const cleanup = { harnessClosed: false, ownedRoot: root ?? null };
    try { if (h) { await h.close(); cleanup.harnessClosed = true; } } catch (e) { cleanup.harnessClosed = 'error: ' + String(e?.message ?? e); }
    let exitCode = evidence.error || cleanup.harnessClosed !== true ? 1 : 0;
    // The host's own account of the delete calls (the 500s' cause), bounded.
    if (root) evidence.hostLogDeleteLines = (await readFile(join(root, 'host.log'), 'utf8').catch(() => '')).split('\n').filter(l => /EISDIR|Deleted image|Invalid CSRF/.test(l)).slice(0, 40).map(l => l.slice(0, 300));
    Object.assign(evidence, { cleanup, exitCode, endedAt: new Date().toISOString(), elapsedMs: Math.round(Date.now() - performance.timeOrigin) });
    if (root) {
        try { const text = JSON.stringify(evidence, null, 1); await writeFile(join(root, 'evidence.json'), Buffer.byteLength(text) <= MiB ? text : JSON.stringify({ truncated: true, sha256: sha(text), head: text.slice(0, MiB / 2) })); } catch (e) { console.error('evidence write failed', e); exitCode = 1; }
    }
    process.exitCode = exitCode;
    console.log(`VERDICT J5 ${verdicts.J5} J6 ${verdicts.J6}`);
    console.log('Evidence ' + (root ? join(root, 'evidence.json') : 'not written (no owned root)'));
}
