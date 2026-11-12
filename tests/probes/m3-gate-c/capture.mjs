// M3.3 PR D: read-only capture for the owner's real Gate C session. It verifies what the backend actually ran, from the files the host kept.
// It refuses by default. On the owner's install it runs only on the owner's word, recorded first:
//   node tests/probes/m3-gate-c/capture.mjs --owner-accepts-read-only-capture --images <host data>/<user>/user/images --since <ISO> \
//        [--review <copied review text>]... [--ledger <recovery inspect JSON>] --out <new file outside the repository>
// --proof-loopback accepts only an owned sn-* root under TMPDIR (synthetic data).
// It has no network code at all, never reads settings.json, secrets.json, keys or headers, and never writes into the images folder.
// The output holds names, sizes, hashes, counts and per-field match flags; never the prompt or review text.
import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readdirSync, readFileSync, readSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { ALLOWLIST } from '../../../src/image-request.mjs';

const REPO = resolve(import.meta.dirname, '../../..');
const MAX_FILE = 32 * 1024 * 1024, MAX_FILES = 200, MAX_TEXT = 1024 * 1024, MAX_LEDGER = 16 * 1024 * 1024;
const HOST_FILES = ['settings.json', 'secrets.json'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const inside = (path, root) => { const r = relative(root, path); return r === '' || !r.startsWith('..') && !r.startsWith(sep) && r !== '..'; };
/** The real path a not-yet-existing file would get: the nearest existing parent through realpathSync, plus the rest. */
export function realDestination(path) {
    let parent = resolve(path), rest = [];
    while (!existsSync(parent)) { rest.unshift(basename(parent)); const up = dirname(parent); if (up === parent) break; parent = up; }
    return join(realpathSync(parent), ...rest);
}
/**
 * One rule for --review and --ledger: the real path must not be named settings.json or secrets.json, and no directory
 * above it may hold either file (that directory is a SillyTavern user data root, such as data/<user>/), so host settings,
 * keys and anything beside them are never read, directly or through a symlink.
 */
export function readableInput(path, max) {
    let real;
    try { real = realpathSync(path); } catch { throw Error('Refused: ' + path + ' cannot be read.'); }
    if (HOST_FILES.includes(basename(real))) throw Error('Refused: ' + path + ' is a host settings or secrets file.');
    for (let dir = dirname(real); ; dir = dirname(dir)) {
        if (HOST_FILES.some(name => existsSync(join(dir, name)))) throw Error('Refused: ' + path + ' is inside a SillyTavern data root.');
        if (dirname(dir) === dir) break;
    }
    const stat = statSync(real);
    if (!stat.isFile() || stat.size > max) throw Error('Refused: ' + path + ' is not a file of at most ' + max + ' bytes.');
    return real;
}

export function parseCaptureArgs(argv, { repo = REPO, tmp = tmpdir() } = {}) {
    const values = { review: [] }, flags = [];
    for (let i = 0; i < argv.length; i++) {
        const name = argv[i];
        if (['--images', '--since', '--ledger', '--out', '--review'].includes(name)) {
            const value = argv[++i];
            if (value === undefined || value.startsWith('--')) throw Error('Refused: ' + name + ' needs a value.');
            if (name === '--review') values.review.push(resolve(value)); else values[name.slice(2)] = value;
        } else flags.push(name);
    }
    const owner = flags.includes('--owner-accepts-read-only-capture'), proof = flags.includes('--proof-loopback');
    if (flags.some(f => !['--owner-accepts-read-only-capture', '--proof-loopback'].includes(f))) throw Error('Refused: unknown option.');
    if (owner && proof) throw Error('Refused: use --owner-accepts-read-only-capture or --proof-loopback, not both.');
    if (!owner && !proof) throw Error('Refused: --owner-accepts-read-only-capture is the owner\'s statement that this read-only capture may read their install\'s image folder.');
    if (!values.images || !values.out || !values.since) throw Error('Refused: --images, --since and --out are required.');
    const images = resolve(values.images), out = resolve(values.out), since = Date.parse(values.since);
    const imagesFolder = path => basename(path) === 'images' && basename(dirname(path)) === 'user';
    if (!imagesFolder(images)) throw Error('Refused: --images must be a host user/images folder.');
    if (!Number.isFinite(since)) throw Error('Refused: --since must be a date.');
    if (!existsSync(images)) throw Error('Refused: --images does not exist.');
    if (!imagesFolder(realpathSync(images))) throw Error('Refused: --images must really be a host user/images folder, not a link to another folder.');
    // Lexical and real: a symlinked parent must not lead the capture into the repository or the images folder.
    const realOut = realDestination(out), realRepo = existsSync(repo) ? realpathSync(repo) : repo, realImages = realpathSync(images);
    if (inside(out, repo) || inside(realOut, realRepo)) throw Error('Refused: --out must be outside the repository.');
    if (existsSync(out) || existsSync(realOut)) throw Error('Refused: ' + out + ' exists; a capture is never overwritten.');
    if (inside(out, images) || inside(realOut, realImages)) throw Error('Refused: --out must be outside the images folder.');
    if (proof) {
        // Ownership on the real path: a link inside an sn-* root that leads elsewhere (images, user or above) is refused.
        const realTmp = existsSync(tmp) ? realpathSync(tmp) : resolve(tmp), owned = relative(realTmp, realImages).split(sep)[0];
        if (!inside(images, resolve(tmp)) || !inside(realImages, realTmp) || !/^sn-[\w-]+$/.test(owned ?? '') || !inside(realImages, join(realTmp, owned)))
            throw Error('Refused: a proof reads only an owned sn-* root under TMPDIR.');
    }
    return { mode: owner ? 'owner' : 'loopback-proof', images: realImages, since, out: realOut, repo: realRepo, reviews: values.review.map(path => readableInput(path, MAX_TEXT)), ledger: values.ledger ? readableInput(resolve(values.ledger), MAX_LEDGER) : null };
}

/** Text chunks of a PNG (tEXt, zTXt, iTXt), or null when the bytes are not a PNG. */
export function pngText(bytes) {
    if (bytes.length < 8 || !bytes.subarray(0, 8).equals(SIGNATURE)) return null;
    const text = {};
    for (let at = 8; at + 12 <= bytes.length;) {
        const length = bytes.readUInt32BE(at), type = bytes.toString('latin1', at + 4, at + 8), data = bytes.subarray(at + 8, at + 8 + length);
        if (at + 12 + length > bytes.length) break;
        at += 12 + length;
        const zero = data.indexOf(0), key = zero > 0 ? data.toString('latin1', 0, zero) : null;
        try {
            if (type === 'tEXt' && key) text[key] = data.toString('latin1', zero + 1);
            else if (type === 'zTXt' && key) text[key] = inflateSync(data.subarray(zero + 2), { maxOutputLength: MAX_TEXT }).toString('latin1');
            else if (type === 'iTXt' && key) {
                const compressed = data[zero + 1], lang = data.indexOf(0, zero + 3), translated = data.indexOf(0, lang + 1), body = data.subarray(translated + 1);
                text[key] = (compressed ? inflateSync(body, { maxOutputLength: MAX_TEXT }) : body).toString('utf8');
            }
        } catch { text[key] = null; }
        if (type === 'IEND') break;
    }
    return text;
}

/** The review text's `Key: value` lines (src/image-request.mjs reviewText), values JSON-decoded where they are JSON. */
export function parseReview(text) {
    const review = {};
    for (const line of String(text).split('\n')) {
        const at = line.indexOf(': ');
        if (at < 1) continue;
        const key = line.slice(0, at), raw = line.slice(at + 2);
        try { review[key] = JSON.parse(raw); } catch { review[key] = raw; }
    }
    return review;
}

/**
 * Compares the graph the backend ran (ComfyUI's `prompt` chunk) with one review. Flags only; no text is returned.
 * Structural: the graph must be wired exactly as the six-node workflow (one sampler, checkpoint loader, empty latent, decode
 * and save, and two text encodes), and each value is read from the node the sampler's links reach, never matched by text alone.
 */
export function compareGraph(graph, review) {
    const entries = Object.entries(graph && typeof graph === 'object' ? graph : {}).filter(([, n]) => n && typeof n === 'object');
    const byId = new Map(entries.map(([id, n]) => [String(id), n]));
    const ids = type => entries.filter(([, n]) => n.class_type === type).map(([id]) => String(id));
    const one = type => { const found = ids(type); return found.length === 1 ? found[0] : null; };
    const [samplerId, modelId, latentId, decodeId, saveId] = ['KSampler', 'CheckpointLoaderSimple', 'EmptyLatentImage', 'VAEDecode', 'SaveImage'].map(one);
    const input = id => byId.get(id)?.inputs ?? {};
    const link = (value, id, slot) => Array.isArray(value) && value.length === 2 && String(value[0]) === id && value[1] === slot;
    const target = value => Array.isArray(value) && value.length === 2 && byId.get(String(value[0]))?.class_type === 'CLIPTextEncode' && value[1] === 0 ? String(value[0]) : null;
    const sampler = input(samplerId), positiveId = target(sampler.positive), negativeId = target(sampler.negative), encodes = ids('CLIPTextEncode');
    const problems = [
        [entries.length === 7, 'not seven nodes'],
        [samplerId && modelId && latentId && decodeId && saveId, 'a workflow node is missing or repeated'],
        [encodes.length === 2 && positiveId && negativeId && positiveId !== negativeId, 'the sampler\'s conditioning is not two distinct text encodes'],
        [link(sampler.model, modelId, 0), 'the sampler\'s model is not the checkpoint loader'],
        [link(sampler.latent_image, latentId, 0), 'the sampler\'s latent is not the empty latent'],
        [encodes.every(id => link(input(id).clip, modelId, 1)), 'a text encode does not read the checkpoint\'s CLIP'],
        [link(input(decodeId).samples, samplerId, 0) && link(input(decodeId).vae, modelId, 2), 'the decode does not read the sampler and the checkpoint\'s VAE'],
        [link(input(saveId).images, decodeId, 0), 'the save does not read the decode'],
    ].filter(([ok]) => !ok).map(([, why]) => why);
    const latent = input(latentId), model = input(modelId);
    const same = (a, b) => a !== undefined && b !== undefined && a !== null && (a === b || Number(a) === Number(b) && typeof a !== 'string');
    const flag = (sent, ran) => sent === undefined || sent === null ? 'not-in-review' : ran === undefined ? 'not-in-graph' : same(sent, ran) ? 'match' : 'mismatch';
    const text = (sent, id) => id && typeof input(id).text === 'string' && input(id).text === sent ? 'match' : 'mismatch';
    const size = typeof review.Size === 'string' ? review.Size.split(' x ').map(Number) : [];
    const seed = typeof review.Seed === 'string' && review.Seed.startsWith('fixed ') ? Number(review.Seed.slice(6)) : null;
    return {
        nodeTypesAllowed: entries.length > 0 && entries.every(([, n]) => ALLOWLIST.includes(n.class_type)),
        wiring: problems.length ? problems : 'six-node',
        fields: {
            positive: text(review.Positive, positiveId), negative: text(review.Negative, negativeId),
            seed: seed === null ? 'random-not-compared' : flag(seed, sampler.seed), steps: flag(review.Steps, sampler.steps), cfg: flag(review.CFG, sampler.cfg),
            sampler: flag(review.Sampler, sampler.sampler_name), scheduler: flag(review.Scheduler, sampler.scheduler), denoise: flag(review.Denoise, sampler.denoise),
            width: flag(size[0], latent.width), height: flag(size[1], latent.height), model: flag(review.Model, model.ckpt_name),
            vae: flag(review.VAE, undefined), clipSkip: flag(review['Clip skip'], undefined),
        },
        unexplainedTextInputs: encodes.filter(id => id !== positiveId && id !== negativeId).length,
    };
}

// Every field the review states and the six-node workflow carries must match. The only exceptions: a random seed policy
// (not compared), VAE and clip skip (not in that workflow), and a field the review renders as null (nothing stated).
const EXEMPT = { seed: ['random-not-compared', 'not-in-review'], vae: ['not-in-graph', 'not-in-review'], clipSkip: ['not-in-graph', 'not-in-review'] };
export const matched = c => c.nodeTypesAllowed && c.wiring === 'six-node' && c.unexplainedTextInputs === 0
    && Object.entries(c.fields).every(([field, flag]) => flag === 'match' || (EXEMPT[field] ?? ['not-in-review']).includes(flag));

/**
 * The one check for every path under the images folder, used by the walk, the read and the ledger check: each component
 * below the real images folder is examined with lstat and must exist and not be a symlink, and the resolved path must lie
 * inside the real images folder. Returns the path, or null.
 */
export function underImages(realImages, name, { file = true } = {}) {
    const parts = String(name).split(/[\\/]/);
    if (!parts.length || parts.some(part => !part || part === '.' || part === '..')) return null;
    let path = realImages;
    for (const [index, part] of parts.entries()) {
        path = join(path, part);
        const stat = lstatSync(path, { throwIfNoEntry: false });
        if (!stat || stat.isSymbolicLink()) return null;
        if (index < parts.length - 1 ? !stat.isDirectory() : file ? !stat.isFile() : !stat.isDirectory()) return null;
    }
    return inside(realpathSync(path), realImages) ? path : null;
}

// Opened without following a final symlink, and only through underImages.
function readBounded(path, realImages) {
    if (underImages(realImages, relative(realImages, path)) !== path) throw Error('Refused: ' + path + ' leads outside the images folder.');
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const stat = fstatSync(fd);
        if (!stat.isFile()) throw Error('Refused: ' + path + ' is not a file.');
        const bytes = Buffer.alloc(Math.min(stat.size, MAX_FILE)); readSync(fd, bytes, 0, bytes.length, 0); return { bytes, size: stat.size, mtimeMs: stat.mtimeMs };
    } finally { closeSync(fd); }
}
function listPngs(root, since) {
    const found = [];
    // Every entry passes underImages, so symlinked files and folders are skipped and the walk never leaves the real images folder.
    const walk = dir => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const name = relative(root, join(dir, entry.name));
            const folder = underImages(root, name, { file: false }), path = folder ?? underImages(root, name);
            if (folder) walk(folder);
            else if (path && /\.png$/i.test(entry.name) && lstatSync(path).mtimeMs >= since) found.push(path);
            if (found.length > MAX_FILES) throw Error('Refused: more than ' + MAX_FILES + ' new images; narrow --since.');
        }
    };
    walk(root);
    return found.sort();
}
// A ledger path names a file below the images folder only: no empty, `.` or `..` segment and no backslash.
const ledgerName = hostPath => { try { const p = decodeURIComponent(hostPath); if (!p.startsWith('/user/images/')) return null; const name = p.slice('/user/images/'.length); return name.split('/').every(part => part && part !== '.' && part !== '..') && !name.includes('\\') ? name : null; } catch { return null; } };

/**
 * Each new host file must belong to exactly one ledger row, and each row's retained file must exist. Where the row recorded
 * the result's SHA-256, the file's bytes must hash to it: the pairing is by content, not by name alone.
 */
export function crossCheck(files, inspect, exists) {
    const hashes = new Map(files.map(f => [f.name, f.sha256]));
    files = files.map(f => f.name);
    const rows = (inspect?.ledger ?? []).flatMap(p => p.rows ?? []);
    const byName = new Map();
    for (const row of rows) { const name = row.hostPath ? ledgerName(row.hostPath) : null; if (name) byName.set(name, [...(byName.get(name) ?? []), row]); }
    return {
        ledgerRows: rows.length, statesByCount: rows.reduce((m, r) => ({ ...m, [r.state]: (m[r.state] ?? 0) + 1 }), {}),
        filesWithoutRow: files.filter(f => !byName.has(f)).length,
        filesWithSeveralRows: files.filter(f => (byName.get(f)?.length ?? 0) > 1).length,
        rowsWhoseFileIsMissing: rows.filter(r => r.hostPath && !r.hostDeletedAt && !exists(ledgerName(r.hostPath))).length,
        rowsDeletedButPresent: rows.filter(r => r.hostPath && r.hostDeletedAt && exists(ledgerName(r.hostPath))).length,
        rowsDeleted: rows.filter(r => r.hostDeletedAt).length,
        rowsHashChecked: rows.filter(r => r.resultSha256 && hashes.has(ledgerName(r.hostPath ?? ''))).length,
        rowsWhoseHashDiffers: rows.filter(r => r.resultSha256 && hashes.has(ledgerName(r.hostPath ?? '')) && hashes.get(ledgerName(r.hostPath)) !== r.resultSha256).length,
    };
}

export function capture(options) {
    const reviews = options.reviews.map(path => { const text = readFileSync(readableInput(path, MAX_TEXT), 'utf8'); return { sha256: sha(text), review: parseReview(text) }; });
    const realImages = realpathSync(options.images);
    const files = listPngs(realImages, options.since).map(path => {
        const { bytes, size, mtimeMs } = readBounded(path, realImages), name = relative(realImages, path).split(sep).join('/');
        const entry = { name, size, sha256: size <= MAX_FILE ? sha(bytes) : null, pngSignature: bytes.subarray(0, 8).equals(SIGNATURE), mtime: new Date(mtimeMs).toISOString() };
        const text = entry.pngSignature ? pngText(bytes) : null, raw = text?.prompt;
        let graph = null;
        if (typeof raw === 'string') try { graph = JSON.parse(raw); } catch { graph = null; }
        entry.backendGraph = raw === undefined ? 'absent' : graph ? 'present' : 'unreadable';
        if (graph) {
            entry.backendGraphSha256 = sha(raw);
            entry.comparisons = reviews.map(r => ({ reviewSha256: r.sha256, ...compareGraph(graph, r.review) }));
            entry.matchedReview = entry.comparisons.find(matched)?.reviewSha256 ?? null;
        }
        return entry;
    });
    const inspect = options.ledger ? JSON.parse(readFileSync(readableInput(options.ledger, MAX_LEDGER), 'utf8')) : null;
    return { schemaVersion: 1, mode: options.mode, since: new Date(options.since).toISOString(), reviews: reviews.map(r => r.sha256), files,
        // Existence is checked without following links, and only below the real images folder.
        ledger: inspect ? crossCheck(files.map(f => ({ name: f.name, sha256: f.sha256 })), inspect, name => name !== null && underImages(realImages, name) !== null) : 'not-given' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const options = parseCaptureArgs(process.argv.slice(2)), result = capture(options);
        writeFileSync(options.out, JSON.stringify(result, null, 1) + '\n', { flag: 'wx' });
        console.log('Capture ' + options.out + ': ' + result.files.length + ' files; backend graph ' + result.files.map(f => f.backendGraph).join(',') + (result.ledger === 'not-given' ? '' : '; ledger ' + JSON.stringify(result.ledger)));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
