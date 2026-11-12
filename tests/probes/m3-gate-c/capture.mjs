// M3.3 PR D: read-only capture for the owner's real Gate C session. It verifies what the backend actually ran, from the files the host kept.
// It refuses by default. On the owner's install it runs only on the owner's word, recorded first:
//   node tests/probes/m3-gate-c/capture.mjs --owner-accepts-read-only-capture --images <host data>/<user>/user/images --since <ISO> \
//        [--review <copied review text>]... [--ledger <recovery inspect JSON>] --out <new file outside the repository>
// --proof-loopback accepts only an owned sn-* root under TMPDIR (synthetic data).
// It has no network code at all, never reads settings.json, secrets.json, keys or headers, and never writes into the images folder.
// The output holds names, sizes, hashes, counts and per-field match flags; never the prompt or review text.
import { closeSync, existsSync, lstatSync, openSync, readdirSync, readFileSync, readSync, realpathSync, statSync, writeFileSync } from 'node:fs';
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
    if (basename(images) !== 'images' || basename(resolve(images, '..')) !== 'user') throw Error('Refused: --images must be a host user/images folder.');
    if (!Number.isFinite(since)) throw Error('Refused: --since must be a date.');
    if (!existsSync(images)) throw Error('Refused: --images does not exist.');
    // Lexical and real: a symlinked parent must not lead the capture into the repository or the images folder.
    const realOut = realDestination(out), realRepo = existsSync(repo) ? realpathSync(repo) : repo, realImages = realpathSync(images);
    if (inside(out, repo) || inside(realOut, realRepo)) throw Error('Refused: --out must be outside the repository.');
    if (existsSync(out) || existsSync(realOut)) throw Error('Refused: ' + out + ' exists; a capture is never overwritten.');
    if (inside(out, images) || inside(realOut, realImages)) throw Error('Refused: --out must be outside the images folder.');
    if (proof) {
        const owned = relative(resolve(tmp), images).split(sep)[0];
        if (!inside(images, resolve(tmp)) || !/^sn-[\w-]+$/.test(owned ?? '')) throw Error('Refused: a proof reads only an owned sn-* root under TMPDIR.');
    }
    return { mode: owner ? 'owner' : 'loopback-proof', images, since, out: realOut, repo: realRepo, reviews: values.review.map(path => readableInput(path, MAX_TEXT)), ledger: values.ledger ? readableInput(resolve(values.ledger), MAX_LEDGER) : null };
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

/** Compares the graph the backend ran (ComfyUI's `prompt` chunk) with one review. Flags only; no text is returned. */
export function compareGraph(graph, review) {
    const nodes = Object.values(graph ?? {}).filter(n => n && typeof n === 'object');
    const of = type => nodes.filter(n => n.class_type === type).map(n => n.inputs ?? {});
    const texts = of('CLIPTextEncode').map(i => i.text), sampler = of('KSampler')[0] ?? {}, latent = of('EmptyLatentImage')[0] ?? {}, model = of('CheckpointLoaderSimple')[0] ?? {};
    const same = (a, b) => a !== undefined && b !== undefined && a !== null && (a === b || Number(a) === Number(b) && typeof a !== 'string');
    const flag = (sent, ran) => sent === undefined || sent === null ? 'not-in-review' : ran === undefined ? 'not-in-graph' : same(sent, ran) ? 'match' : 'mismatch';
    const size = typeof review.Size === 'string' ? review.Size.split(' x ').map(Number) : [];
    const seed = typeof review.Seed === 'string' && review.Seed.startsWith('fixed ') ? Number(review.Seed.slice(6)) : null;
    return {
        nodeTypesAllowed: nodes.length > 0 && nodes.every(n => ALLOWLIST.includes(n.class_type)),
        fields: {
            positive: texts.includes(review.Positive) ? 'match' : 'mismatch', negative: texts.includes(review.Negative) ? 'match' : 'mismatch',
            seed: seed === null ? 'random-not-compared' : flag(seed, sampler.seed), steps: flag(review.Steps, sampler.steps), cfg: flag(review.CFG, sampler.cfg),
            sampler: flag(review.Sampler, sampler.sampler_name), scheduler: flag(review.Scheduler, sampler.scheduler), denoise: flag(review.Denoise, sampler.denoise),
            width: flag(size[0], latent.width), height: flag(size[1], latent.height), model: flag(review.Model, model.ckpt_name),
            vae: flag(review.VAE, undefined), clipSkip: flag(review['Clip skip'], undefined),
        },
        unexplainedTextInputs: texts.filter(t => t !== review.Positive && t !== review.Negative).length,
    };
}

// Every field the review states and the six-node workflow carries must match. The only exceptions: a random seed policy
// (not compared), VAE and clip skip (not in that workflow), and a field the review renders as null (nothing stated).
const EXEMPT = { seed: ['random-not-compared', 'not-in-review'], vae: ['not-in-graph', 'not-in-review'], clipSkip: ['not-in-graph', 'not-in-review'] };
export const matched = c => c.nodeTypesAllowed && c.unexplainedTextInputs === 0
    && Object.entries(c.fields).every(([field, flag]) => flag === 'match' || (EXEMPT[field] ?? ['not-in-review']).includes(flag));

function readBounded(path) {
    const fd = openSync(path, 'r');
    try { const size = lstatSync(path).size, bytes = Buffer.alloc(Math.min(size, MAX_FILE)); readSync(fd, bytes, 0, bytes.length, 0); return { bytes, size }; } finally { closeSync(fd); }
}
function listPngs(root, since) {
    const found = [];
    const walk = dir => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isSymbolicLink()) continue;
            if (entry.isDirectory()) walk(path);
            else if (entry.isFile() && /\.png$/i.test(entry.name) && lstatSync(path).mtimeMs >= since) found.push(path);
            if (found.length > MAX_FILES) throw Error('Refused: more than ' + MAX_FILES + ' new images; narrow --since.');
        }
    };
    walk(root);
    return found.sort();
}
const ledgerName = hostPath => { try { const p = decodeURIComponent(hostPath); return p.startsWith('/user/images/') ? p.slice('/user/images/'.length) : null; } catch { return null; } };

/** Each new host file must belong to exactly one ledger row, and each row's retained file must exist. */
export function crossCheck(files, inspect, exists) {
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
    };
}

export function capture(options) {
    const reviews = options.reviews.map(path => { const text = readFileSync(readableInput(path, MAX_TEXT), 'utf8'); return { sha256: sha(text), review: parseReview(text) }; });
    const realImages = realpathSync(options.images);
    const files = listPngs(realImages, options.since).map(path => {
        const { bytes, size } = readBounded(path), name = relative(realImages, path).split(sep).join('/');
        const entry = { name, size, sha256: size <= MAX_FILE ? sha(bytes) : null, pngSignature: bytes.subarray(0, 8).equals(SIGNATURE), mtime: new Date(lstatSync(path).mtimeMs).toISOString() };
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
        ledger: inspect ? crossCheck(files.map(f => f.name), inspect, name => name !== null && existsSync(join(realImages, ...name.split('/')))) : 'not-given' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const options = parseCaptureArgs(process.argv.slice(2)), result = capture(options);
        writeFileSync(options.out, JSON.stringify(result, null, 1) + '\n', { flag: 'wx' });
        console.log('Capture ' + options.out + ': ' + result.files.length + ' files; backend graph ' + result.files.map(f => f.backendGraph).join(',') + (result.ledger === 'not-given' ? '' : '; ledger ' + JSON.stringify(result.ledger)));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
