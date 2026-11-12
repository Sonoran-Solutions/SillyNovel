// M3.3 PR D: Node tests for the Gate C demonstration and capture scripts. Unregistered in dyl60 on purpose (see README).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { crc32, deflateSync } from 'node:zlib';
import { DEMOS, guardDecision, ownerPreamble, parseDemoArgs } from './demo.mjs';
import { capture, compareGraph, crossCheck, matched, parseCaptureArgs, parseReview, pngText } from './capture.mjs';
import { reviewText } from '../../../src/image-request.mjs';

const FIXTURE = 'http://127.0.0.1:43123';
const chunk = (type, data) => { const t = Buffer.from(type, 'latin1'), len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); };
const png = (...chunks) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', Buffer.alloc(13)), ...chunks, chunk('IEND', Buffer.alloc(0))]);
const tEXt = (key, text) => chunk('tEXt', Buffer.from(key + '\0' + text, 'latin1'));
const REVIEW = reviewText({ destination: { url: 'http://127.0.0.1:8188', local: true }, workflow: { name: 'Default_Comfy_Workflow.json', sha256: 'a'.repeat(64), nodes: ['KSampler'] },
    settings: { model: 'm.safetensors', sampler: 'euler', scheduler: 'normal', vae: 'v.safetensors', steps: 20, scale: 7, clip_skip: 1, denoising_strength: 1, width: 512, height: 512 },
    seedPolicy: 'fixed', seed: 1234, texts: { positive: 'PREFIX, a quiet harbor at dusk,', negative: 'NEG, PREFIX-NEG' } });
// The host's shipped Default_Comfy_Workflow.json at the pin, substituted: the six-node wiring.
const GRAPH = { 3: { class_type: 'KSampler', inputs: { seed: 1234, steps: 20, cfg: 7, sampler_name: 'euler', scheduler: 'normal', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
    4: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'm.safetensors' } }, 5: { class_type: 'EmptyLatentImage', inputs: { width: 512, height: 512, batch_size: 1 } },
    6: { class_type: 'CLIPTextEncode', inputs: { text: 'PREFIX, a quiet harbor at dusk,', clip: ['4', 1] } }, 7: { class_type: 'CLIPTextEncode', inputs: { text: 'NEG, PREFIX-NEG', clip: ['4', 1] } },
    8: { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } }, 9: { class_type: 'SaveImage', inputs: { filename_prefix: 'x', images: ['8', 0] } } };

test('demo arguments: exactly one mode and one host root; --only only in owner mode, with known ids', () => {
    assert.throws(() => parseDemoArgs(['/h']), /exactly one of --owner or --proof-loopback/);
    assert.throws(() => parseDemoArgs(['--owner', '--proof-loopback', '/h']), /exactly one/);
    assert.throws(() => parseDemoArgs(['--owner']), /exactly one pinned host root/);
    assert.throws(() => parseDemoArgs(['--owner', '/h', '/g']), /exactly one pinned host root/);
    assert.throws(() => parseDemoArgs(['--owner', '--real', '/h']), /unknown option --real/);
    assert.throws(() => parseDemoArgs(['--proof-loopback', '--only', 'timeout', '/h']), /proof runs every/);
    assert.throws(() => parseDemoArgs(['--owner', '--only', 'nope', '/h']), /--only takes ids/);
    assert.throws(() => parseDemoArgs(['--owner', '--only', 'timeout,cache-hit', '/h']), /cache-hit needs new-background in the same run/);
    assert.deepEqual(parseDemoArgs(['--owner', '--only', 'timeout,cache-hit,new-background', '/h']), { mode: 'owner', host: resolve('/h'), demos: ['new-background', 'cache-hit', 'timeout'] });
    assert.deepEqual(parseDemoArgs(['--owner', '--only', 'usage-limit', '/h']).demos, ['usage-limit']);
    assert.equal(parseDemoArgs(['--proof-loopback', '/h']).demos.length, 7);
});

test('the seven roadmap demonstrations, each with expectations and owner steps', () => {
    for (const d of DEMOS) assert.match(ownerPreamble(d), /turn it on/, d.id + ' starts with the session on, alone or not (round 2, finding 3)');
    assert.deepEqual(DEMOS.map(d => d.id), ['new-background', 'cache-hit', 'rejected-candidate', 'policy-refusal', 'timeout', 'cancelled-or-stale', 'usage-limit']);
    for (const d of DEMOS) {
        assert.ok(d.owner.length > 0 && d.owner.every(p => typeof p.say === 'string'), d.id);
        assert.equal(d.expect.rows.length, d.expect.prompts, d.id + ': every /prompt is one ledger row (no duplicate jobs)');
        assert.equal(d.fixture.filter(s => s.hold).length, d.owner.filter(p => p.then === 'release').length, d.id + ': every held job is released');
    }
    assert.deepEqual(DEMOS.find(d => d.id === 'cache-hit').expect, { prompts: 0, rows: [], filesNet: 0, replies: 0 });
    assert.deepEqual(DEMOS.find(d => d.id === 'policy-refusal').fixture, [{ refusal: true }]);
});

test('guard: ComfyUI routes pass only with the fixture origin in the parsed body', () => {
    const decide = (pathname, body, contentType = 'application/json') => guardDecision({ pathname, body, contentType }, { fixtureOrigin: FIXTURE }).allow;
    assert.equal(decide('/api/sd/comfy/generate', JSON.stringify({ url: FIXTURE, prompt: '{}' })), true);
    assert.equal(decide('/api/sd/comfy/ping', JSON.stringify({ url: FIXTURE + '/' })), true);
    for (const url of ['http://127.0.0.1:8188', 'http://localhost:43123', 'http://127.0.0.1:43124', 'https://127.0.0.1:43123', 'http://user@127.0.0.1:8188', 'file:///etc/passwd', '', 42])
        assert.equal(decide('/api/sd/comfy/generate', JSON.stringify({ url })), false, String(url));
    assert.equal(decide('/api/sd/comfy/generate', JSON.stringify({ prompt: '{}' })), false, 'no url');
    assert.equal(decide('/api/sd/comfy/generate', '{not json'), false, 'unparseable');
    assert.equal(decide('/api/sd/comfy/generate', '[1]'), false, 'not an object');
    assert.equal(decide('/api/sd/comfy/workflow', JSON.stringify({ file_name: 'Default_Comfy_Workflow.json' })), true);
    assert.equal(decide('/api/sd/comfy/workflows', ''), true);
    assert.equal(decide('/api/sd/comfy/workflows', JSON.stringify({ url: FIXTURE })), true, 'the page sends url on the workflow list too');
    assert.equal(decide('/api/sd/comfy/workflows', JSON.stringify({ url: 'http://127.0.0.1:8188' })), false);
    assert.equal(decide('/api/sd/comfy/workflow', JSON.stringify({ file_name: 'x', url: 'http://127.0.0.1:8188' })), false);
    for (const route of ['/api/sd/comfyrunpod/generate', '/api/sd/generate', '/api/sd/pollinations/generate', '/api/sd/comfy/save-workflow', '/api/sd/comfy/generate/x', '/api/sd/ping'])
        assert.equal(decide(route, JSON.stringify({ url: FIXTURE })), false, route);
});

test('guard: other host routes carrying a backend address pass only with a fixture origin', () => {
    const decide = (pathname, body, contentType = 'application/json') => guardDecision({ pathname, body, contentType }, { fixtureOrigin: FIXTURE }).allow;
    assert.equal(decide('/api/backends/chat-completions/generate', JSON.stringify({ custom_url: 'http://127.0.0.1:8128/v1', reverse_proxy: '' })), true);
    assert.equal(decide('/api/backends/chat-completions/generate', JSON.stringify({ custom_url: 'http://127.0.0.1:8000/v1' })), false);
    assert.equal(decide('/api/backends/text-completions/status', JSON.stringify({ api_server: 'http://127.0.0.1:5000' })), false);
    assert.equal(decide('/api/assets/download', JSON.stringify({ url: 'https://example.com/x.png' })), false);
    assert.equal(decide('/api/backends/chat-completions/generate', JSON.stringify({ pollinations_endpoint: 'https://example.com' })), false);
    assert.equal(decide('/api/backends/chat-completions/generate', JSON.stringify({ urls: [FIXTURE, 'http://127.0.0.1:8188'] })), false);
    assert.equal(decide('/api/backends/chat-completions/generate', '{broken'), false, 'unparseable JSON');
    assert.equal(decide('/api/tokenizers/openai/count', JSON.stringify([{ role: 'user', content: 'see http://127.0.0.1:8188' }])), true, 'a JSON array carries no backend keys');
    assert.equal(decide('/api/backends/chat-completions/generate', JSON.stringify({ zai_endpoint: 'common', siliconflow_endpoint: 'global', custom_url: 'http://127.0.0.1:8128/v1' })), true, 'choice names are not addresses');
    assert.equal(decide('/api/characters/create', JSON.stringify({ avatar_url: 'a.png', ch_name: 'x' })), true, 'a file name is not a backend');
    assert.equal(decide('/api/settings/save', JSON.stringify({ api_server: 'http://127.0.0.1:5000' })), true, 'storing settings contacts nothing');
    assert.equal(decide('/api/plugins/sillynovel-storage/projects/x/assets', 'PNG', 'image/png'), true);
    assert.equal(decide('/scripts/x.js', null), true);
});

test('pngText reads tEXt, zTXt and iTXt chunks and refuses non-PNG bytes', () => {
    const z = chunk('zTXt', Buffer.concat([Buffer.from('workflow\0\0', 'latin1'), deflateSync('{"z":1}')]));
    const i = chunk('iTXt', Buffer.concat([Buffer.from('note\0\0\0en\0\0', 'latin1'), Buffer.from('héllo', 'utf8')]));
    assert.deepEqual(pngText(png(tEXt('prompt', '{"a":1}'), z, i)), { prompt: '{"a":1}', workflow: '{"z":1}', note: 'héllo' });
    assert.equal(pngText(Buffer.from('not a png')), null);
    assert.deepEqual(pngText(png()), {});
});

test('compareGraph: a matching graph matches every compared field; a changed value or an extra text is flagged', () => {
    const review = parseReview(REVIEW);
    assert.equal(review.Positive, 'PREFIX, a quiet harbor at dusk,');
    assert.equal(review.Seed, 'fixed 1234');
    const ok = compareGraph(GRAPH, review);
    assert.equal(ok.nodeTypesAllowed, true);
    assert.equal(ok.unexplainedTextInputs, 0);
    assert.deepEqual(Object.entries(ok.fields).filter(([, v]) => v !== 'match'), [['vae', 'not-in-graph'], ['clipSkip', 'not-in-graph']]);
    const changed = structuredClone(GRAPH); changed[3].inputs.steps = 21; changed[6].inputs.text = 'something else';
    const bad = compareGraph(changed, review);
    assert.equal(bad.fields.steps, 'mismatch'); assert.equal(bad.fields.positive, 'mismatch'); assert.equal(matched(bad), false);
    const foreign = structuredClone(GRAPH); foreign[10] = { class_type: 'LoadImage', inputs: {} };
    assert.equal(compareGraph(foreign, review).nodeTypesAllowed, false);
    assert.equal(compareGraph(GRAPH, parseReview(REVIEW.replace('Seed: "fixed 1234"', 'Seed: "random each request"'))).fields.seed, 'random-not-compared');
});

test('matched: every field the review states and the six-node workflow carries must match (terra review finding 2)', () => {
    const review = parseReview(REVIEW);
    assert.equal(matched(compareGraph(GRAPH, review)), true, 'VAE and clip skip are the only fields allowed outside the graph');
    assert.equal(matched(compareGraph(GRAPH, parseReview(REVIEW.replace('Seed: "fixed 1234"', 'Seed: "random each request"')))), true, 'a random seed is not compared');
    const without = type => Object.fromEntries(Object.entries(GRAPH).filter(([, n]) => n.class_type !== type));
    const noSampler = compareGraph(without('KSampler'), review), noModel = compareGraph(without('CheckpointLoaderSimple'), review);
    assert.equal(noSampler.fields.steps, 'not-in-graph');
    assert.equal(matched(noSampler), false, 'a graph without the sampler is not the request');
    assert.equal(noModel.fields.model, 'not-in-graph');
    assert.equal(matched(noModel), false, 'a graph without the model loader is not the request');
    const latent = compareGraph(without('EmptyLatentImage'), review);
    assert.equal(matched(latent), false);
});

test('matched is structural: swapped conditioning or one rewired link is unmatched (terra review round 2, finding 2)', () => {
    const review = parseReview(REVIEW);
    assert.equal(compareGraph(GRAPH, review).wiring, 'six-node');
    const swapped = structuredClone(GRAPH); swapped[3].inputs.positive = ['7', 0]; swapped[3].inputs.negative = ['6', 0];
    const s = compareGraph(swapped, review);
    assert.equal(s.fields.positive, 'mismatch'); assert.equal(s.fields.negative, 'mismatch'); assert.equal(matched(s), false, 'both texts present, but on the wrong inputs');
    const same = structuredClone(GRAPH); same[3].inputs.negative = ['6', 0];
    assert.equal(matched(compareGraph(same, review)), false, 'one encode on both inputs');
    for (const [node, key, value, why] of [[8, 'samples', ['5', 0], 'decode reads the latent, not the sampler'], [3, 'model', ['4', 1], 'wrong checkpoint slot'], [3, 'latent_image', ['3', 0], 'sampler fed by itself'],
        [9, 'images', ['3', 0], 'save skips the decode'], [6, 'clip', ['4', 0], 'encode reads the model slot'], [8, 'vae', ['4', 1], 'decode reads the CLIP slot']]) {
        const rewired = structuredClone(GRAPH); rewired[node].inputs[key] = value;
        const c = compareGraph(rewired, review);
        assert.notEqual(c.wiring, 'six-node', why); assert.equal(matched(c), false, why);
    }
    const extra = structuredClone(GRAPH); extra[10] = { class_type: 'CLIPTextEncode', inputs: { text: 'hidden', clip: ['4', 1] } };
    const third = compareGraph(extra, review);
    assert.equal(third.unexplainedTextInputs, 1); assert.equal(matched(third), false, 'a third text encode');
});

test('crossCheck: each new file belongs to exactly one ledger row, and retained files exist', () => {
    const inspect = { ledger: [{ rows: [{ state: 'imported', hostPath: '/user/images/Gate%20C/a.png', resultSha256: 'a'.repeat(64) }, { state: 'discarded', hostPath: '/user/images/Gate C/b.png', hostDeletedAt: 5 }, { state: 'failed', hostPath: null }] }] };
    const clean = crossCheck([{ name: 'Gate C/a.png', sha256: 'a'.repeat(64) }], inspect, name => name === 'Gate C/a.png');
    assert.deepEqual(clean, { ledgerRows: 3, statesByCount: { imported: 1, discarded: 1, failed: 1 }, filesWithoutRow: 0, filesWithSeveralRows: 0, rowsWhoseFileIsMissing: 0, rowsDeletedButPresent: 0, rowsDeleted: 1, rowsHashChecked: 1, rowsWhoseHashDiffers: 0 });
    assert.equal(crossCheck([{ name: 'Gate C/a.png', sha256: 'b'.repeat(64) }], inspect, () => true).rowsWhoseHashDiffers, 1, 'same name, other bytes');
    const dirty = crossCheck([{ name: 'Gate C/a.png' }, { name: 'Gate C/stray.png' }], { ledger: [{ rows: [...inspect.ledger[0].rows, { state: 'stale', hostPath: '/user/images/Gate C/a.png' }] }] }, () => true);
    assert.equal(dirty.filesWithoutRow, 1); assert.equal(dirty.filesWithSeveralRows, 1); assert.equal(dirty.rowsDeletedButPresent, 1);
});

test('capture arguments refuse by default, inside the repository, over an existing file, and outside an owned root in proof mode', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sn-gate-c-test-')), images = join(tmp, 'data/default-user/user/images');
    try {
        mkdirSync(images, { recursive: true });
        const base = ['--images', images, '--since', '2026-11-11T00:00:00Z'];
        assert.throws(() => parseCaptureArgs([...base, '--out', join(tmp, 'o.json')]), /--owner-accepts-read-only-capture is the owner's statement/);
        assert.throws(() => parseCaptureArgs(['--proof-loopback', '--owner-accepts-read-only-capture', ...base, '--out', join(tmp, 'o.json')]), /not both/);
        assert.throws(() => parseCaptureArgs(['--owner-accepts-read-only-capture', ...base, '--out', resolve('docs/x.json')]), /outside the repository/);
        writeFileSync(join(tmp, 'exists.json'), '');
        assert.throws(() => parseCaptureArgs(['--owner-accepts-read-only-capture', ...base, '--out', join(tmp, 'exists.json')]), /never overwritten/);
        assert.throws(() => parseCaptureArgs(['--owner-accepts-read-only-capture', '--images', tmp, '--since', '2026-11-11', '--out', join(tmp, 'o.json')]), /user\/images folder/);
        assert.throws(() => parseCaptureArgs(['--owner-accepts-read-only-capture', ...base, '--out', join(images, 'o.json')]), /outside the images folder/);
        assert.throws(() => parseCaptureArgs(['--owner-accepts-read-only-capture', '--images', images, '--since', 'soon', '--out', join(tmp, 'o.json')]), /must be a date/);
        assert.throws(() => parseCaptureArgs(['--proof-loopback', ...base, '--out', join(tmp, 'o.json')], { tmp: join(tmp, 'elsewhere') }), /owned sn-\* root/);
        // Round 2, finding 1: a link inside an owned root that leads to another images folder is refused in proof mode.
        const outside = mkdtempSync(join(tmpdir(), 'gate-c-outside-')), realImages = join(outside, 'data/default-user/user/images');
        try {
            mkdirSync(realImages, { recursive: true });
            mkdirSync(join(tmp, 'linked-images/user'), { recursive: true });
            symlinkSync(realImages, join(tmp, 'linked-images/user/images'));
            assert.throws(() => parseCaptureArgs(['--proof-loopback', '--images', join(tmp, 'linked-images/user/images'), '--since', '2026-11-11', '--out', join(tmp, 'o1.json')]), /owned sn-\* root/, 'symlinked images');
            symlinkSync(join(outside, 'data/default-user/user'), join(tmp, 'linked-user'));
            mkdirSync(join(tmp, 'linked-user-parent'));
            symlinkSync(join(outside, 'data/default-user/user'), join(tmp, 'linked-user-parent/user'));
            assert.throws(() => parseCaptureArgs(['--proof-loopback', '--images', join(tmp, 'linked-user-parent/user/images'), '--since', '2026-11-11', '--out', join(tmp, 'o2.json')]), /owned sn-\* root/, 'symlinked user');
            mkdirSync(join(tmp, 'renamed/user'), { recursive: true }); mkdirSync(join(tmp, 'renamed/elsewhere'));
            symlinkSync(join(tmp, 'renamed/elsewhere'), join(tmp, 'renamed/user/images'));
            assert.throws(() => parseCaptureArgs(['--owner-accepts-read-only-capture', '--images', join(tmp, 'renamed/user/images'), '--since', '2026-11-11', '--out', join(tmp, 'o3.json')]), /not a link to another folder/);
        } finally { rmSync(outside, { recursive: true, force: true }); }
        assert.equal(parseCaptureArgs(['--proof-loopback', ...base, '--out', join(tmp, 'o.json')]).mode, 'loopback-proof');
    } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('capture --out: a symlinked parent into the repository or the images folder is refused (terra review finding 1)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sn-gate-c-test-')), images = join(tmp, 'data/default-user/user/images');
    try {
        mkdirSync(images, { recursive: true });
        symlinkSync(resolve('docs'), join(tmp, 'into-repo'));
        symlinkSync(images, join(tmp, 'into-images'));
        const args = out => ['--owner-accepts-read-only-capture', '--images', images, '--since', '2026-11-11T00:00:00Z', '--out', out];
        assert.throws(() => parseCaptureArgs(args(join(tmp, 'into-repo/capture.json'))), /outside the repository/);
        assert.throws(() => parseCaptureArgs(args(join(tmp, 'into-repo/new/capture.json'))), /outside the repository/, 'a missing directory below the link');
        assert.throws(() => parseCaptureArgs(args(join(tmp, 'into-images/capture.json'))), /outside the images folder/);
        assert.equal(parseCaptureArgs(args(join(tmp, 'out/capture.json'))).out, join(tmp, 'out/capture.json'));
    } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('capture --review and --ledger: host settings, secrets and anything in a data root are refused, directly or through a symlink (terra review finding 3)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sn-gate-c-test-')), user = join(tmp, 'data/default-user'), images = join(user, 'user/images');
    try {
        mkdirSync(images, { recursive: true });
        writeFileSync(join(user, 'settings.json'), '{"secret":"x"}');
        writeFileSync(join(user, 'secrets.json'), '{"key":"x"}');
        writeFileSync(join(user, 'notes.txt'), 'x');
        writeFileSync(join(tmp, 'review.txt'), REVIEW);
        writeFileSync(join(tmp, 'big.txt'), 'x'.repeat(1024 * 1024 + 1));
        symlinkSync(join(user, 'secrets.json'), join(tmp, 'innocent.txt'));
        symlinkSync(join(user, 'notes.txt'), join(tmp, 'notes-link.txt'));
        const args = (...more) => parseCaptureArgs(['--owner-accepts-read-only-capture', '--images', images, '--since', '2026-11-11T00:00:00Z', '--out', join(tmp, 'o.json'), ...more]);
        assert.throws(() => args('--review', join(user, 'settings.json')), /settings or secrets file/);
        assert.throws(() => args('--ledger', join(user, 'secrets.json')), /settings or secrets file/);
        assert.throws(() => args('--review', join(tmp, 'innocent.txt')), /settings or secrets file/, 'a symlink to secrets.json');
        assert.throws(() => args('--review', join(user, 'notes.txt')), /inside a SillyTavern data root/);
        assert.throws(() => args('--ledger', join(tmp, 'notes-link.txt')), /inside a SillyTavern data root/, 'a symlink into a data root');
        assert.throws(() => args('--review', join(tmp, 'big.txt')), /at most 1048576 bytes/);
        assert.throws(() => args('--review', join(tmp, 'missing.txt')), /cannot be read/);
        assert.deepEqual(args('--review', join(tmp, 'review.txt')).reviews, [join(tmp, 'review.txt')]);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('capture never follows a symlinked file or folder out of the images folder, and checks ledger paths below it (round 2)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sn-gate-c-test-')), images = join(tmp, 'data/default-user/user/images'), outside = mkdtempSync(join(tmpdir(), 'gate-c-outside-'));
    try {
        mkdirSync(join(images, 'Gate C'), { recursive: true });
        writeFileSync(join(images, 'Gate C/real.png'), png());
        writeFileSync(join(outside, 'private.png'), png(tEXt('prompt', '{"secret":1}')));
        mkdirSync(join(outside, 'folder')); writeFileSync(join(outside, 'folder/inner.png'), png());
        symlinkSync(join(outside, 'private.png'), join(images, 'Gate C/linked.png'));
        symlinkSync(join(outside, 'folder'), join(images, 'linked-folder'));
        writeFileSync(join(tmp, 'inspect.json'), JSON.stringify({ ledger: [{ rows: [{ state: 'imported', hostPath: '/user/images/Gate%20C/real.png' }, { state: 'discarded', hostPath: '/user/images/../../secrets.json' }, { state: 'discarded', hostPath: '/user/images/Gate%20C/linked.png' }] }] }));
        const result = capture(parseCaptureArgs(['--proof-loopback', '--images', images, '--since', '2026-01-01T00:00:00Z', '--ledger', join(tmp, 'inspect.json'), '--out', join(tmp, 'o.json')]));
        assert.deepEqual(result.files.map(f => f.name), ['Gate C/real.png'], 'linked file and linked folder skipped');
        assert.equal(result.ledger.rowsWhoseFileIsMissing, 2, 'a traversal path and a link are not files below the folder');
    } finally { rmSync(tmp, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

test('capture reads only new PNGs, compares the backend graph, and writes no prompt or review text', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sn-gate-c-test-')), images = join(tmp, 'data/default-user/user/images');
    try {
        mkdirSync(join(images, 'Gate C'), { recursive: true });
        writeFileSync(join(images, 'Gate C/new.png'), png(tEXt('prompt', JSON.stringify(GRAPH))));
        writeFileSync(join(images, 'Gate C/plain.png'), png());
        writeFileSync(join(images, 'Gate C/old.png'), png());
        utimesSync(join(images, 'Gate C/old.png'), new Date('2020-01-01'), new Date('2020-01-01'));
        writeFileSync(join(tmp, 'review.txt'), REVIEW);
        writeFileSync(join(tmp, 'inspect.json'), JSON.stringify({ ledger: [{ rows: [{ state: 'imported', hostPath: '/user/images/Gate%20C/new.png' }, { state: 'discarded', hostPath: '/user/images/Gate%20C/plain.png' }] }] }));
        const options = parseCaptureArgs(['--proof-loopback', '--images', images, '--since', '2026-01-01T00:00:00Z', '--review', join(tmp, 'review.txt'), '--ledger', join(tmp, 'inspect.json'), '--out', join(tmp, 'o.json')]);
        const result = capture(options);
        assert.deepEqual(result.files.map(f => [f.name, f.backendGraph, f.pngSignature]), [['Gate C/new.png', 'present', true], ['Gate C/plain.png', 'absent', true]]);
        assert.equal(result.files[0].matchedReview, result.reviews[0]);
        assert.equal(result.ledger.filesWithoutRow, 0); assert.equal(result.ledger.rowsWhoseFileIsMissing, 0);
        const text = JSON.stringify(result);
        for (const secret of ['harbor', 'PREFIX', 'm.safetensors', 'euler']) assert.equal(text.includes(secret), false, secret);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('capture has no network code and reads no host settings', () => {
    const source = readFileSync(new URL('./capture.mjs', import.meta.url), 'utf8');
    const imports = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]);
    assert.deepEqual(imports, ['node:fs', 'node:path', 'node:crypto', 'node:zlib', 'node:os', 'node:url', '../../../src/image-request.mjs']);
    // The two host file names appear once, in the refusal list; nowhere else.
    const code = source.replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, '');
    assert.equal(code.match(/settings\.json|secrets\.json/g).length, 2);
    assert.match(code, /^const HOST_FILES = \['settings\.json', 'secrets\.json'\];$/m);
    assert.doesNotMatch(code.replace(/^const HOST_FILES = .*$/m, ''), /fetch\(|node:https?|node:net|settings\.json|secrets\.json|import\(/);
});
