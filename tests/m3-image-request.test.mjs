import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWLIST, RESERVED_TRIGGERS, LOOPBACK_HOSTS, DEFAULT_ALLOWANCE, WAIT_MS, LEASE, combinePrefixes, effectiveTexts, preflight, reviewText, cacheHit, leaseStatus, takeoverSession, createRequest, staleReason, resultPathProblem, reconcileCandidates, createImageSession } from '../src/image-request.mjs';
import { RESULT_LIMITS } from '../src/image-workflow.mjs';

const origin = 'http://127.0.0.1:8000';
const hash = c => c.repeat(64);
// The shipped default's seven nodes, using its six node types and standard placeholders only.
const workflow = {
    '3': { inputs: { seed: '%seed%', steps: '%steps%', cfg: '%scale%', sampler_name: '%sampler%', scheduler: '%scheduler%', denoise: '%denoise%', model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] }, class_type: 'KSampler' },
    '4': { inputs: { ckpt_name: '%model%' }, class_type: 'CheckpointLoaderSimple' },
    '5': { inputs: { width: '%width%', height: '%height%', batch_size: 1 }, class_type: 'EmptyLatentImage' },
    '6': { inputs: { text: '%prompt%', clip: ['4', 1] }, class_type: 'CLIPTextEncode' },
    '7': { inputs: { text: '%negative_prompt%', clip: ['4', 1] }, class_type: 'CLIPTextEncode' },
    '8': { inputs: { samples: ['3', 0], vae: ['4', 2] }, class_type: 'VAEDecode' },
    '9': { inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] }, class_type: 'SaveImage' },
};
const workflowText = JSON.stringify(workflow);
const good = () => ({
    snapshot: { seam: true, source: 'comfy', comfy_type: 'standard', comfy_url: 'http://127.0.0.1:8188', comfy_workflow: 'Default_Comfy_Workflow.json',
        free_extend: false, multimodal_captioning: false, refine_mode: false, interactive_mode: false, function_tool: false,
        prompt_prefix: 'SN-PREFIX-TEXT,', negative_prompt: 'SN-NEG-PREFIX', seed: 1234, width: 512, height: 512, steps: 20, scale: 7,
        model: 'synthetic.safetensors', vae: 'Automatic', sampler: 'euler', scheduler: 'normal', clip_skip: 1, denoising_strength: 1, comfy_placeholders: [] },
    workflowText, workflowSha256: hash('a'), draft: { prompt: 'a quiet reading room at dusk', negativePrompt: 'SN-DRAFT-NEG', styleNote: 'SN-STYLE-DECOY', sizeHint: 'portrait', label: 'SN-LABEL-DECOY', references: ['SN-REF-DECOY'] },
    options: { model: ['synthetic.safetensors'], vae: ['Automatic'], sampler: ['euler'], scheduler: ['normal'] },
});
const codes = input => preflight(input).problems.map(p => p.code);
const changeWorkflow = (input, mutate) => { const w = JSON.parse(input.workflowText); mutate(w); input.workflowText = JSON.stringify(w); };
const review = () => preflight(good()).review;
const projectModel = {};
const requestInput = () => ({ id: 1, capture: { projectModel, projectId: 'synthetic-project', sessionEpoch: 2, draftRevision: 3 }, hostChatKey: 'synthetic-chat', catalogRevision: 4, layoutRevision: 5,
    lockState: { background: true, presence: false }, review: review(), workflowSha256: hash('a'), payloadSha256: hash('b'), submittedAt: 1000 });
const nowFor = request => ({ ...request.capture, hostChatKey: request.hostChatKey, catalogRevision: request.catalogRevision, layoutRevision: request.layoutRevision, lockState: { ...request.lockState }, workflowSha256: request.effective.workflowSha256 });
const ticket = (id, sha = hash('a')) => ({ id, effective: { workflowSha256: sha } });
const refuses = (fn, code) => assert.throws(fn, error => error instanceof Error && error.message === code);

test('constants are the frozen first profile and measured limits', () => {
    assert.deepEqual(ALLOWLIST, ['CheckpointLoaderSimple', 'CLIPTextEncode', 'EmptyLatentImage', 'KSampler', 'VAEDecode', 'SaveImage']);
    assert.deepEqual(LOOPBACK_HOSTS, ['localhost', '127.0.0.1', '[::1]']);
    assert.equal(RESERVED_TRIGGERS.length, 19);
    for (const list of [ALLOWLIST, RESERVED_TRIGGERS, LOOPBACK_HOSTS, LEASE]) assert.equal(Object.isFrozen(list), true);
    assert.equal(DEFAULT_ALLOWANCE, 5); assert.equal(WAIT_MS, 120000);
    assert.deepEqual(LEASE, { heartbeatMs: 30000, staleMs: 90000 });
});
test('combinePrefixes reproduces joins, markers, empty parts and single comma stripping', () => {
    assert.equal(combinePrefixes('head', 'body'), 'head, body');
    assert.equal(combinePrefixes('head, {prompt}, tail', 'body', '{prompt}'), 'head, body, tail');
    for (const empty of ['', null, undefined, false, 0]) assert.equal(combinePrefixes('  , head,  ', empty), '  , head,  ');
    assert.equal(combinePrefixes('', '  , body,  '), 'body');
    assert.equal(combinePrefixes(' , head, ', ' , body, '), 'head, body');
    assert.equal(combinePrefixes(',,head,,', ',,body,,'), 'head,, ,body,', 'one comma per processing pass, including the final result pass');
    assert.equal(combinePrefixes('{prompt}, {prompt}', 'body', '{prompt}'), 'body, {prompt}');
});
test('effectiveTexts reproduces R1 and R2 and sends only the two draft text fields', () => {
    const input = good();
    assert.deepEqual(effectiveTexts(input.snapshot, input.draft), { positive: 'SN-PREFIX-TEXT, a quiet reading room at dusk', negative: 'SN-DRAFT-NEG, SN-NEG-PREFIX' });
    input.snapshot.prompt_prefix = 'SN-PREFIX-HEAD, {prompt}, SN-PREFIX-TAIL'; input.draft.prompt = 'harbor at noon';
    assert.equal(effectiveTexts(input.snapshot, input.draft).positive, 'SN-PREFIX-HEAD, harbor at noon, SN-PREFIX-TAIL');
    assert.doesNotMatch(JSON.stringify(effectiveTexts(input.snapshot, input.draft)), /DECOY|portrait/);
});
test('known-good profile returns the full review without mutating its inputs', () => {
    const input = good(), before = structuredClone(input), result = preflight(input);
    assert.deepEqual(input, before); assert.deepEqual(result.problems, []); assert.equal(result.review.ok, true);
    assert.deepEqual(result.review.destination, { url: 'http://127.0.0.1:8188', local: true });
    assert.deepEqual(result.review.workflow, { name: 'Default_Comfy_Workflow.json', sha256: hash('a'), nodes: [...ALLOWLIST, 'CLIPTextEncode'].sort(), saveNodes: 1 });
    assert.deepEqual(result.review.settings, { model: 'synthetic.safetensors', vae: 'Automatic', sampler: 'euler', scheduler: 'normal', steps: 20, scale: 7, width: 512, height: 512, clip_skip: 1, denoising_strength: 1 });
    assert.equal(result.review.seedPolicy, 'fixed'); assert.equal(result.review.seed, 1234);
});

const refusals = [
    ['SEAM_MISSING', i => { delete i.snapshot.seam; }],
    ['SOURCE_NOT_COMFY', i => { i.snapshot.source = 'cloud'; }],
    ['COMFY_TYPE_NOT_STANDARD', i => { i.snapshot.comfy_type = 'runpod_serverless'; }],
    ['URL_INVALID', i => { i.snapshot.comfy_url = 'invalid'; }],
    ['URL_NOT_LOOPBACK', i => { i.snapshot.comfy_url = 'https://example.invalid'; }],
    ['MODE_FREE_EXTEND', i => { i.snapshot.free_extend = true; }],
    ['MODE_MULTIMODAL', i => { delete i.snapshot.multimodal_captioning; }],
    ['MODE_REFINE', i => { i.snapshot.refine_mode = 0; }],
    ['MODE_INTERACTIVE', i => { i.snapshot.interactive_mode = null; }],
    ['MODE_FUNCTION_TOOL', i => { i.snapshot.function_tool = 'false'; }],
    ['PROMPT_EMPTY', i => { i.draft.prompt = ' \n\t'; }],
    ['PROMPT_RESERVED_TRIGGER', i => { i.draft.prompt = ' Background '; }],
    ['PROMPT_CHAR_PREFIX', i => { i.draft.prompt = 'CHAR, a room'; }],
    ['PROMPT_MACRO', i => { i.draft.prompt = '{{user}} in a room'; }],
    ['NEGATIVE_MACRO', i => { i.draft.negativePrompt = '<BOT>'; }],
    ['PREFIX_MACRO', i => { i.snapshot.prompt_prefix = '%model%'; }],
    ['NEGATIVE_PREFIX_MACRO', i => { i.snapshot.negative_prompt = '}}'; }],
    ['PREFIX_MARKER_REPEATED', i => { i.snapshot.prompt_prefix = '{prompt}, {prompt}'; }],
    ['WORKFLOW_UNPARSEABLE', i => { i.workflowText += '!'; }],
    ['WORKFLOW_PROMPT_PLACEHOLDER', i => { i.workflowText = i.workflowText.replace('%prompt%', 'room'); }],
    ['WORKFLOW_SAVE_NODES', i => { changeWorkflow(i, w => { w['10'] = w['9']; }); }],
    ['WORKFLOW_AVATAR', i => { changeWorkflow(i, w => { w['4'].inputs.avatar = '%USER_AVATAR%'; }); }],
    ['WORKFLOW_CUSTOM_PLACEHOLDERS', i => { i.snapshot.comfy_placeholders = [{ find: '%custom%', replace: 'value' }]; }],
    ['WORKFLOW_NODE_NOT_ALLOWED', i => { changeWorkflow(i, w => { w['4'].class_type = 'NetworkNode'; }); }],
    ['SELECTION_STALE', i => { i.snapshot.sampler = 'missing'; }],
    ['OPTIONS_MISSING', i => { delete i.options.model; }],
    ['DIMENSIONS_INVALID', i => { i.snapshot.width = 0; }],
    ['WORKFLOW_NAME_MISSING', i => { delete i.snapshot.comfy_workflow; }],
];
for (const [code, mutate] of refusals) test('preflight refuses ' + code + ' alone from the good profile', () => {
    const input = good(); mutate(input);
    const result = preflight(input);
    assert.deepEqual(result.problems.map(p => p.code), [code]); assert.equal(result.review.ok, false);
    assert.ok(result.review.texts); assert.ok(result.review.settings);
    for (const problem of result.problems) if ('detail' in problem) assert.equal(typeof problem.detail, 'string');
});
test('LoadImage always also violates the six-type allowlist; both problems are returned', () => {
    const input = good(); changeWorkflow(input, w => { w['4'].class_type = 'LoadImageMask'; });
    assert.deepEqual(codes(input), ['WORKFLOW_LOAD_IMAGE', 'WORKFLOW_NODE_NOT_ALLOWED']);
    assert.equal(preflight(input).problems[1].detail, 'LoadImageMask');
});
test('preflight accumulates independent failures and names every stale or missing option', () => {
    const input = good(); input.snapshot.source = 'extras'; input.snapshot.refine_mode = true;
    input.snapshot.comfy_url = 'https://example.invalid'; input.snapshot.width = -1;
    for (const key of ['model', 'vae', 'sampler', 'scheduler']) input.snapshot[key] = 'stale-' + key;
    assert.deepEqual(codes(input), ['SOURCE_NOT_COMFY', 'URL_NOT_LOOPBACK', 'MODE_REFINE', 'SELECTION_STALE', 'SELECTION_STALE', 'SELECTION_STALE', 'SELECTION_STALE', 'DIMENSIONS_INVALID']);
    assert.deepEqual(preflight(input).problems.filter(p => p.code === 'SELECTION_STALE').map(p => p.detail), ['model: stale-model', 'vae: stale-vae', 'sampler: stale-sampler', 'scheduler: stale-scheduler']);
    input.options = { model: null, vae: 'Automatic', sampler: {}, scheduler: false };
    assert.deepEqual(preflight(input).problems.filter(p => p.code === 'OPTIONS_MISSING').map(p => p.detail), ['model', 'vae', 'sampler', 'scheduler']);
    assert.equal(preflight(input).review.destination.local, false);
});
test('preflight checks all reserved triggers, character forms and macro syntaxes without rewriting', () => {
    for (const trigger of RESERVED_TRIGGERS) { const i = good(); i.draft.prompt = ' ' + trigger.toUpperCase() + ' '; assert.deepEqual(codes(i), ['PROMPT_RESERVED_TRIGGER']); }
    for (const prompt of ['char room', 'char\troom', 'char\nroom', ' char, a room', 'room {{CHARPREFIX}}']) {
        const i = good(); i.draft.prompt = prompt;
        assert.deepEqual(codes(i), prompt.includes('{{') ? ['PROMPT_CHAR_PREFIX', 'PROMPT_MACRO'] : ['PROMPT_CHAR_PREFIX']);
    }
    for (const value of ['{{', '}}', '<user>', '<BOT>', '<char>', '<GROUP>', '<charifnotgroup>', '%some_placeholder%']) {
        for (const [section, key, code] of [['draft', 'prompt', 'PROMPT_MACRO'], ['draft', 'negativePrompt', 'NEGATIVE_MACRO'], ['snapshot', 'prompt_prefix', 'PREFIX_MACRO'], ['snapshot', 'negative_prompt', 'NEGATIVE_PREFIX_MACRO']]) {
            const i = good(); i[section][key] = value; assert.deepEqual(codes(i), [code]);
        }
    }
    const i = good(); i.draft.prompt = 9; assert.deepEqual(codes(i), ['PROMPT_EMPTY']); assert.equal(preflight(i).review.texts.positive, i.snapshot.prompt_prefix);
});
test('only HTTP loopback URLs pass; no string coercion or relative URL resolution', () => {
    for (const url of ['http://localhost:8188', 'https://127.0.0.1', 'http://[::1]:8188']) {
        const i = good(); i.snapshot.comfy_url = url; assert.deepEqual(codes(i), []); assert.equal(preflight(i).review.destination.local, true);
    }
    for (const url of [null, 7, '/relative', 'ftp://localhost', 'http://[broken']) { const i = good(); i.snapshot.comfy_url = url; assert.deepEqual(codes(i), ['URL_INVALID']); }
    for (const url of ['http://localhost.example.invalid', 'http://192.168.1.2:8188']) { const i = good(); i.snapshot.comfy_url = url; assert.deepEqual(codes(i), ['URL_NOT_LOOPBACK']); }
});
test('workflow checks raw exact placeholder counts, plain JSON objects, nodes and avatars', () => {
    for (const raw of [undefined, null, 7, '{}', '[]', 'null', '"text"', 'false']) {
        const i = good(); i.workflowText = raw;
        assert.ok(codes(i).includes(raw === '{}' ? 'WORKFLOW_SAVE_NODES' : 'WORKFLOW_UNPARSEABLE'));
    }
    for (const marker of ['%prompt%', '%negative_prompt%']) {
        const i = good(); changeWorkflow(i, w => { w['4'].inputs.extra = marker; }); assert.deepEqual(codes(i), ['WORKFLOW_PROMPT_PLACEHOLDER']);
    }
    const noSave = good(); changeWorkflow(noSave, w => { delete w['9']; }); assert.deepEqual(codes(noSave), ['WORKFLOW_SAVE_NODES']);
    for (const node of [null, {}, { class_type: 'ETN_LoadImageBase64' }, { class_type: 'VAEEncode' }, { class_type: 'ImageScale' }]) {
        const i = good(); changeWorkflow(i, w => { w['10'] = node; }); assert.deepEqual(codes(i), ['WORKFLOW_NODE_NOT_ALLOWED']);
    }
    const i = good(); changeWorkflow(i, w => { w['4'].inputs.extra = '%char_avatar%'; }); assert.deepEqual(codes(i), ['WORKFLOW_AVATAR']);
});
test('preflight refuses missing or noncanonical workflow SHA-256 values', () => {
    for (const sha of [undefined, null, 7, '', hash('a').slice(1), hash('a') + 'a', hash('A'), hash('g'), hash('a') + '\n']) {
        const input = good(); input.workflowSha256 = sha;
        assert.deepEqual(codes(input), ['WORKFLOW_HASH_MISSING']); assert.equal(preflight(input).review.ok, false);
    }
});
test('review keeps every workflow node, including two KSampler nodes', () => {
    const input = good(); changeWorkflow(input, w => { w['10'] = w['3']; });
    const result = preflight(input), nodes = [...ALLOWLIST, 'CLIPTextEncode', 'KSampler'].sort();
    assert.deepEqual(result.problems, []); assert.deepEqual(result.review.workflow.nodes, nodes);
    assert.ok(reviewText(result.review).includes('Nodes: "' + nodes.join(', ') + '"\n'));
});
for (const [key, code] of [['prompt_prefix', 'PREFIX_MACRO'], ['negative_prompt', 'NEGATIVE_PREFIX_MACRO']]) test('preflight refuses non-string ' + key, () => {
    for (const value of [null, false, 0, {}, []]) {
        const input = good(); input.snapshot[key] = value;
        const result = preflight(input);
        assert.deepEqual(result.problems, [{ code, detail: 'not a string' }]); assert.equal(result.review.ok, false);
    }
});
test('absent host prefixes are accepted as empty strings', () => {
    const input = good(); delete input.snapshot.prompt_prefix; input.snapshot.negative_prompt = undefined;
    const result = preflight(input);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.review.texts, { positive: input.draft.prompt, negative: input.draft.negativePrompt });
});
test('dimensions use the imported PNG ceilings and seed policy preserves zero and random', () => {
    for (const [width, height] of [[1, 1], [RESULT_LIMITS.edge, 3906], [4000, 4000]]) {
        const i = good(); Object.assign(i.snapshot, { width, height }); assert.deepEqual(codes(i), []);
    }
    for (const [width, height] of [[0, 1], [1, 0], [-1, 10], [1.5, 1], ['512', 512], [NaN, 512], [Infinity, 1], [4097, 1], [4096, 4096]]) {
        const i = good(); Object.assign(i.snapshot, { width, height }); assert.deepEqual(codes(i), ['DIMENSIONS_INVALID']);
    }
    const i = good(); i.snapshot.seed = 0; assert.equal(preflight(i).review.seed, 0);
    i.snapshot.seed = -1; const r = preflight(i).review; assert.equal(r.seedPolicy, 'random'); assert.equal(Object.hasOwn(r, 'seed'), false); assert.deepEqual(codes(i), []);
});
test('reviewText is deterministic with the fixed section order and one final newline', () => {
    const r = review();
    const expected = 'Destination: "http://127.0.0.1:8188 (local, this machine)"\nWorkflow: "Default_Comfy_Workflow.json"\nWorkflow SHA-256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"\nNodes: "CLIPTextEncode, CLIPTextEncode, CheckpointLoaderSimple, EmptyLatentImage, KSampler, SaveImage, VAEDecode"\nModel: "synthetic.safetensors"\nSampler: "euler"\nScheduler: "normal"\nVAE: "Automatic"\nSteps: 20\nCFG: 7\nClip skip: 1\nDenoise: 1\nSize: "512 x 512"\nSeed: "fixed 1234"\nPositive: "SN-PREFIX-TEXT, a quiet reading room at dusk"\nNegative: "SN-DRAFT-NEG, SN-NEG-PREFIX"\n';
    assert.equal(reviewText(r), expected); assert.equal(reviewText(structuredClone(r)), expected);
    r.seedPolicy = 'random'; delete r.seed; assert.match(reviewText(r), /\nSeed: "random each request"\n/);
    assert.doesNotMatch(reviewText(r), /DECOY/);
});
test('reviewText renders an absent clip skip as null', () => {
    const input = good(); delete input.snapshot.clip_skip;
    const result = preflight(input);
    assert.deepEqual(result.problems, []);
    assert.equal(reviewText(result.review).split('\n').find(line => line.startsWith('Clip skip: ')), 'Clip skip: null');
});
test('reviewText distinguishes draft negatives with trailing newlines byte for byte', () => {
    const input = good(); input.snapshot.negative_prompt = ''; input.draft.negativePrompt = 'negative\n\n';
    const withNewlines = reviewText(preflight(input).review);
    input.draft.negativePrompt = 'negative';
    const withoutNewlines = reviewText(preflight(input).review);
    assert.notEqual(withNewlines, withoutNewlines);
    assert.ok(withNewlines.endsWith('Negative: "negative\\n\\n"\n'));
    assert.ok(withoutNewlines.endsWith('Negative: "negative"\n'));
});
test('reviewText escapes a forged prompt line and keeps exactly 16 lines', () => {
    const input = good(); input.draft.prompt = 'a room\nNegative: forged';
    const r = preflight(input).review, rendered = reviewText(r);
    assert.equal(rendered.split('\n').length, 17); assert.ok(rendered.endsWith('\n')); assert.ok(!rendered.endsWith('\n\n'));
    assert.ok(rendered.includes('Positive: ' + JSON.stringify(r.texts.positive) + '\n'));
    assert.equal(rendered.split('\n').filter(line => line.startsWith('Negative: ')).length, 1);
});
test('reviewText is deterministic for whitespace, quotes and non-ASCII text', () => {
    const input = good(); input.draft.prompt = '  a "room"\n雪\t'; input.draft.negativePrompt = 'negative\n\n'; input.snapshot.negative_prompt = '';
    const r = preflight(input).review, rendered = reviewText(r);
    assert.equal(reviewText(r), rendered); assert.equal(reviewText(structuredClone(r)), rendered);
    assert.ok(rendered.includes('Positive: ' + JSON.stringify(r.texts.positive) + '\n'));
});

test('cacheHit chooses the latest imported matching asset without changing the ledger', () => {
    const jobs = [
        { id: 'old', state: 'imported', payloadSha256: hash('b'), assetId: 'first', settledAt: 1000 },
        { id: 'latest', state: 'imported', payloadSha256: hash('b'), assetId: 'second', settledAt: 3000 },
        { id: 'middle', state: 'imported', payloadSha256: hash('b'), assetId: 'first', settledAt: 2000 },
    ], before = structuredClone(jobs);
    for (const catalogAssetIds of [['first', 'second'], new Set(['first', 'second'])])
        assert.deepEqual(cacheHit({ payloadSha256: hash('b'), seedPolicy: 'fixed', jobs, catalogAssetIds }), { jobId: 'latest', assetId: 'second' });
    assert.deepEqual(jobs, before);
});
test('cacheHit ignores every state other than imported', () => {
    const imported = { id: 'approved', state: 'imported', payloadSha256: hash('b'), assetId: 'asset', settledAt: 1000 };
    for (const state of ['pending', 'candidate', 'refused', 'failed', 'cancelled', 'unknown', 'timeout-unknown', 'abandoned', 'discarded', 'stale', 'reconciled', 'unexpected', null, undefined]) {
        const other = { ...imported, id: 'other', state, settledAt: 2000 };
        assert.equal(cacheHit({ payloadSha256: hash('b'), seedPolicy: 'fixed', jobs: [other], catalogAssetIds: ['asset'] }), null);
        assert.deepEqual(cacheHit({ payloadSha256: hash('b'), seedPolicy: 'fixed', jobs: [imported, other], catalogAssetIds: ['asset'] }), { jobId: 'approved', assetId: 'asset' });
    }
});
test('cacheHit misses missing assets, different payloads, empty ledgers and random seeds', () => {
    const job = { id: 'approved', state: 'imported', payloadSha256: hash('b'), assetId: 'asset', settledAt: 1000 };
    const input = { payloadSha256: hash('b'), seedPolicy: 'fixed', jobs: [job], catalogAssetIds: ['asset'] };
    assert.equal(cacheHit({ ...input, catalogAssetIds: [] }), null);
    assert.equal(cacheHit({ ...input, payloadSha256: hash('c') }), null);
    assert.equal(cacheHit({ ...input, jobs: [] }), null);
    assert.equal(cacheHit({ ...input, seedPolicy: 'random' }), null);
    assert.deepEqual(cacheHit({ ...input, jobs: [job, { ...job, id: 'missing', assetId: 'gone', settledAt: 2000 }, { ...job, id: 'different', payloadSha256: hash('c'), settledAt: 3000 }] }), { jobId: 'approved', assetId: 'asset' });
});
test('leaseStatus distinguishes free, mine, held and stale at the exact boundary', () => {
    const session = { id: 'session', tab: 'first', allowance: 5, used: 3, workflowSha256: hash('a'), startedAt: 100, heartbeatAt: 1000, endedAt: null };
    const input = { tab: 'second', now: 1000 + LEASE.staleMs };
    for (const absent of [null, undefined]) assert.equal(leaseStatus(absent, input), 'free');
    for (const endedAt of [0, 2000]) assert.equal(leaseStatus({ ...session, endedAt }, { ...input, tab: 'first' }), 'free');
    assert.equal(leaseStatus(session, { ...input, now: 1000 }), 'held');
    assert.equal(leaseStatus(session, { ...input, now: input.now - 1 }), 'held');
    assert.equal(leaseStatus(session, input), 'held');
    assert.equal(leaseStatus(session, { ...input, now: input.now + 1 }), 'stale');
    for (const now of [1000, input.now, input.now + 1]) assert.equal(leaseStatus(session, { tab: 'first', now }), 'mine');
    const open = { ...session }; delete open.endedAt;
    assert.equal(leaseStatus(open, input), 'held');
});
test('takeoverSession freezes a new held or stale session and preserves its counts and identity', () => {
    const session = { id: 'session', tab: 'first', allowance: 5, used: 3, workflowSha256: hash('a'), startedAt: 100, heartbeatAt: 1000, endedAt: null }, before = structuredClone(session);
    for (const now of [1000 + LEASE.staleMs, 1001 + LEASE.staleMs]) {
        const taken = takeoverSession(session, { tab: 'second', now });
        assert.deepEqual(taken, { id: 'session', tab: 'second', allowance: 5, used: 3, workflowSha256: hash('a'), startedAt: 100, heartbeatAt: now, endedAt: null });
        assert.equal(Object.isFrozen(taken), true); assert.notEqual(taken, session);
        assert.equal(leaseStatus(taken, { tab: 'second', now }), 'mine');
    }
    assert.deepEqual(session, before);
    for (const free of [null, undefined, { ...session, endedAt: 0 }]) refuses(() => takeoverSession(free, { tab: 'second', now: 2000 }), 'NOT_HELD');
    refuses(() => takeoverSession(session, { tab: 'first', now: 1001 + LEASE.staleMs }), 'NOT_HELD');
    assert.deepEqual(session, before);
});

test('request freezes copied identity, locks and effective settings with the exact deadline', () => {
    const input = requestInput(), request = createRequest(input);
    assert.deepEqual(request, { id: 1, capture: input.capture, hostChatKey: 'synthetic-chat', catalogRevision: 4, layoutRevision: 5, lockState: { background: true, presence: false },
        effective: { prompt: input.review.texts.positive, negative: input.review.texts.negative, workflowSha256: hash('a'), ...input.review.settings, seedPolicy: 'fixed', seed: 1234 },
        payloadSha256: hash('b'), submittedAt: 1000, deadlineAt: 121000, outcome: 'pending' });
    for (const part of [request, request.capture, request.lockState, request.effective]) assert.equal(Object.isFrozen(part), true);
    assert.equal(request.capture.projectModel, projectModel); assert.notEqual(request.capture, input.capture); assert.notEqual(request.lockState, input.lockState);
    input.capture.draftRevision++; input.lockState.background = false; input.review.settings.model = 'changed'; input.review.texts.positive = 'changed';
    assert.equal(request.capture.draftRevision, 3); assert.equal(request.lockState.background, true); assert.equal(request.effective.model, 'synthetic.safetensors'); assert.equal(request.effective.prompt, review().texts.positive);
    input.review.seedPolicy = 'random'; delete input.review.seed; assert.equal(Object.hasOwn(createRequest(input).effective, 'seed'), false);
});
test('request refuses each missing required identity component', () => {
    for (const key of ['capture', 'hostChatKey', 'workflowSha256', 'payloadSha256', 'catalogRevision', 'layoutRevision']) for (const missing of [undefined, null, '']) {
        const input = requestInput(); input[key] = missing; refuses(() => createRequest(input), 'INVALID_REQUEST');
    }
});
for (const [name, mutate] of [
    ['missing review texts', i => { delete i.review.texts; }],
    ['unapproved review', i => { i.review.ok = false; }],
    ['undefined id', i => { i.id = undefined; }],
    ['non-finite submission time', i => { i.submittedAt = Infinity; }],
]) test('request refuses ' + name, () => {
    const input = requestInput(); mutate(input); refuses(() => createRequest(input), 'INVALID_REQUEST');
});
test('staleness checks every identity field in priority order and sorts lock keys', () => {
    const request = createRequest(requestInput()), now = nowFor(request);
    assert.equal(staleReason(request, now), null);
    assert.equal(staleReason(request, { ...now, lockState: { presence: false, background: true } }), null);
    for (const change of [{ projectModel: {} }, { projectModel: null }, { projectId: 'other' }, { sessionEpoch: 4 }, { draftRevision: 4 }]) assert.equal(staleReason(request, { ...now, ...change }), 'CAPTURE_STALE');
    assert.equal(staleReason(request, null), 'CAPTURE_STALE');
    const changes = [ ['sessionEpoch', 4, 'CAPTURE_STALE'], ['hostChatKey', 'other', 'HOST_CHAT_CHANGED'], ['catalogRevision', 9, 'CATALOG_CHANGED'], ['lockState', { background: false, presence: false }, 'LOCK_CHANGED'], ['layoutRevision', 9, 'LAYOUT_CHANGED'], ['workflowSha256', hash('c'), 'WORKFLOW_CHANGED'] ];
    for (let start = 0; start < changes.length; start++) {
        const changed = { ...now };
        for (const [key, value] of changes.slice(start)) changed[key] = value;
        assert.equal(staleReason(request, changed), changes[start][2]);
    }
    assert.equal(staleReason(request, { ...now, lockState: { ...now.lockState, background: false }, layoutRevision: 6 }), 'LOCK_CHANGED');
});
test('result paths accept only unchanged same-origin PNG paths inside user images', () => {
    assert.equal(resultPathProblem('/user/images/2026-11-08@18h00m02s025ms.png', origin), null);
    assert.equal(resultPathProblem('user/images/result.PNG', origin), null);
    for (const [path, code] of [
        [null, 'RESULT_NOT_STRING'], [7, 'RESULT_NOT_STRING'], ['', 'RESULT_OUTSIDE_IMAGES'],
        ['/user/images/%2e%2e%2fx', 'RESULT_ENCODED'], ['/user/images/a\\b.png', 'RESULT_ENCODED'],
        ['/user/images/../x', 'RESULT_OUTSIDE_IMAGES'], ['/user/images/../images/a.png', 'RESULT_OUTSIDE_IMAGES'],
        ['user/images/a/../b.png', 'RESULT_OUTSIDE_IMAGES'], ['user/images/./b.png', 'RESULT_OUTSIDE_IMAGES'], ['user/images/x/../../images/b.png', 'RESULT_OUTSIDE_IMAGES'],
        ['http://127.0.0.1:8188/x', 'RESULT_ABSOLUTE'], ['//evil/x', 'RESULT_ABSOLUTE'],
        ['https:evil.invalid/x.png', 'RESULT_FOREIGN_ORIGIN'], ['/user/images/a.jpg', 'RESULT_NOT_PNG'],
        ['/elsewhere/a.png', 'RESULT_OUTSIDE_IMAGES'], ['/user/images/a//b.png', 'RESULT_OUTSIDE_IMAGES'],
        ['/user/images/a.png?x=1', 'RESULT_OUTSIDE_IMAGES'], ['/user/images/a.png#fragment', 'RESULT_OUTSIDE_IMAGES'],
    ]) assert.equal(resultPathProblem(path, origin), code, String(path));
    assert.equal(resultPathProblem('/user/images/a.png', 'invalid origin'), 'RESULT_FOREIGN_ORIGIN');
});

test('reconcileCandidates lists every eligible file in time order, including the submission boundary', () => {
    const files = [
        { path: '/user/images/late.png', mtimeMs: 3000, size: 30 },
        { path: '/user/images/old.png', mtimeMs: 999, size: 10 },
        { path: 'user/images/boundary.PNG', mtimeMs: 1000, size: 0 },
        { path: '/user/images/middle.png', mtimeMs: 2000, size: 20 },
    ], before = structuredClone(files);
    const candidates = reconcileCandidates({ files, submittedAt: 1000, origin });
    assert.deepEqual(candidates, [
        { path: 'user/images/boundary.PNG', mtimeMs: 1000, size: 0 },
        { path: '/user/images/middle.png', mtimeMs: 2000, size: 20 },
        { path: '/user/images/late.png', mtimeMs: 3000, size: 30 },
    ]);
    for (const candidate of candidates) { assert.equal(Object.isFrozen(candidate), true); assert.equal(files.includes(candidate), false); }
    assert.deepEqual(files, before); assert.equal(Object.isFrozen(files[0]), false);
    files[0].size = 99; assert.equal(candidates[2].size, 30);
});
test('reconcileCandidates drops malformed entries and paths without throwing', () => {
    const valid = { path: '/user/images/valid.png', mtimeMs: 1000, size: 10 };
    const files = [null, undefined, false, 7, 'file', [], {},
        ...[null, undefined, 7, '', '/user/images/a.jpg', '/elsewhere/a.png', '/user/images/%61.png', '/user/images/a\\b.png', '/user/images/../images/a.png', '/user/images/a//b.png', '/user/images/a.png?x=1', '/user/images/a.png#fragment', origin + '/user/images/a.png', '//evil.invalid/a.png'].map(path => ({ ...valid, path })),
        ...[null, undefined, '1000', NaN, Infinity, -Infinity].map(mtimeMs => ({ ...valid, mtimeMs })),
        ...[null, undefined, '10', -1, 1.5, NaN, Infinity, 2 ** 53].map(size => ({ ...valid, size })), valid];
    assert.deepEqual(reconcileCandidates({ files, submittedAt: 1000, origin }), [valid]);
    assert.deepEqual(reconcileCandidates({ files: [valid], submittedAt: 1000, origin: 'invalid origin' }), []);
    for (const malformed of [null, undefined, {}, 'files', 7]) assert.deepEqual(reconcileCandidates({ files: malformed, submittedAt: 1000, origin }), []);
    for (const submittedAt of [null, undefined, '1000', NaN, Infinity]) assert.deepEqual(reconcileCandidates({ files: [valid], submittedAt, origin }), []);
});

test('session refuses invalid allowances', () => {
    for (const allowance of [0, -1, 1.5, '5', null, NaN, Infinity]) refuses(() => createImageSession({ allowance }), 'INVALID_ALLOWANCE');
});
test('session starts off, counts every submit, and keeps cancellation reserved until settlement', () => {
    const session = createImageSession();
    assert.deepEqual(session.snapshot(), { on: false, allowance: 5, used: 0, inFlight: null, workflowSha256: null, requests: {} });
    refuses(() => session.submit(ticket(1)), 'SESSION_OFF');
    assert.equal(session.begin(hash('a')).on, true); refuses(() => session.begin(hash('b')), 'ALREADY_ON');
    const pending = session.submit(ticket(1)); assert.equal(pending.used, 1); assert.equal(pending.inFlight, 1);
    assert.equal(session.cancel(1).requests[1], 'cancelled'); assert.equal(session.snapshot().inFlight, 1);
    refuses(() => session.submit(ticket(2)), 'IN_FLIGHT'); refuses(() => session.cancel(1), 'NOT_PENDING'); refuses(() => session.timeout(1), 'NOT_PENDING');
    const off = session.end(); assert.deepEqual(off, { ...session.snapshot(), on: false });
    assert.equal(off.inFlight, 1); assert.equal(off.used, 1); assert.equal(off.requests[1], 'cancelled');
    const settled = session.settle(1, 'candidate'); assert.equal(settled.requests[1], 'cancelled'); assert.equal(settled.used, 1); assert.equal(settled.inFlight, null);
    refuses(() => session.settle(1, 'candidate'), 'NOT_IN_FLIGHT'); assert.equal(pending.requests[1], 'pending', 'old snapshots stay unchanged');
    for (const value of [settled, settled.requests]) assert.equal(Object.isFrozen(value), true);
    assert.deepEqual(session.end(), settled, 'ending twice forgets nothing');
});
test('cancelled requests can be abandoned without settling or refunding; late results refuse', () => {
    const session = createImageSession(); session.begin(hash('a')); session.submit(ticket(1)); session.cancel(1);
    const cancelled = session.snapshot(); refuses(() => session.timeout(1), 'NOT_PENDING'); assert.deepEqual(session.snapshot(), cancelled);
    const abandoned = session.abandon(1);
    assert.equal(abandoned.inFlight, null); assert.equal(abandoned.used, 1); assert.equal(abandoned.requests[1], 'abandoned');
    refuses(() => session.settle(1, 'candidate'), 'NOT_IN_FLIGHT'); assert.deepEqual(session.snapshot(), abandoned);
});
test('timeout holds the slot until abandon; late settlement cannot release a newer slot', () => {
    const session = createImageSession(); session.begin(hash('a')); session.submit(ticket('first'));
    const timedOut = session.timeout('first'); assert.equal(timedOut.inFlight, 'first'); assert.equal(timedOut.requests.first, 'timeout-unknown'); assert.equal(timedOut.used, 1);
    refuses(() => session.submit(ticket('second')), 'IN_FLIGHT'); refuses(() => session.cancel('first'), 'NOT_PENDING'); refuses(() => session.timeout('first'), 'NOT_PENDING');
    const abandoned = session.abandon('first'); assert.equal(abandoned.inFlight, null); assert.equal(abandoned.requests.first, 'abandoned'); assert.equal(abandoned.used, 1);
    session.submit(ticket('second')); refuses(() => session.settle('first', 'candidate'), 'NOT_IN_FLIGHT'); refuses(() => session.abandon('first'), 'NOT_TIMED_OUT');
    assert.equal(session.snapshot().inFlight, 'second'); assert.equal(session.snapshot().used, 2);
    session.timeout('second'); const result = session.settle('second', 'stale'); assert.equal(result.requests.second, 'stale'); assert.equal(result.used, 2); assert.equal(result.inFlight, null);
});
test('candidate import/discard and failures spend units until allowance is exhausted', () => {
    const session = createImageSession(); session.begin(hash('a'));
    session.submit(ticket(1)); session.settle(1, 'candidate'); assert.equal(session.imported(1).requests[1], 'imported');
    session.submit(ticket(2)); session.settle(2, 'candidate'); assert.equal(session.discard(2).requests[2], 'discarded');
    session.submit(ticket(3)); assert.equal(session.settle(3, 'failed').requests[3], 'failed');
    session.submit(ticket(4)); session.cancel(4); session.settle(4, 'failed');
    session.submit(ticket(5)); session.timeout(5); session.abandon(5);
    const final = session.snapshot(); assert.equal(final.used, 5); assert.equal(final.inFlight, null);
    assert.deepEqual(final.requests, { 1: 'imported', 2: 'discarded', 3: 'failed', 4: 'cancelled', 5: 'abandoned' });
    refuses(() => session.submit(ticket(6)), 'ALLOWANCE_EXHAUSTED');
    assert.deepEqual(session.end(), { ...final, on: false });
});
test('every session refusal preserves state; duplicate ids and workflow changes spend nothing', () => {
    const session = createImageSession({ allowance: 2 }); session.begin(hash('a'));
    const check = (fn, code) => { const before = session.snapshot(); refuses(fn, code); assert.deepEqual(session.snapshot(), before); };
    check(() => session.submit(ticket(1, hash('b'))), 'WORKFLOW_CHANGED');
    for (const id of ['unknown', 1]) {
        check(() => session.cancel(id), 'NOT_PENDING'); check(() => session.timeout(id), 'NOT_PENDING');
        check(() => session.abandon(id), 'NOT_TIMED_OUT'); check(() => session.settle(id, 'candidate'), 'NOT_IN_FLIGHT');
        check(() => session.imported(id), 'NOT_CANDIDATE'); check(() => session.discard(id), 'NOT_CANDIDATE');
    }
    session.submit(ticket(1)); check(() => session.settle(1, 'imported'), 'INVALID_OUTCOME'); check(() => session.settle(99, 'invalid'), 'NOT_IN_FLIGHT');
    session.settle(1, 'candidate'); check(() => session.submit(ticket(1)), 'DUPLICATE_ID');
    session.imported(1); check(() => session.discard(1), 'NOT_CANDIDATE'); check(() => session.imported(1), 'NOT_CANDIDATE');
    session.submit(ticket(2)); session.settle(2, 'failed'); check(() => session.submit(ticket(3)), 'ALLOWANCE_EXHAUSTED');
    session.end(); check(() => session.submit(ticket(3)), 'SESSION_OFF');
});
test('a new explicit session resets its allowance and pin while preserving history and a held slot', () => {
    const session = createImageSession({ allowance: 1 }); session.begin(hash('a')); session.submit(ticket('old')); session.end();
    const restarted = session.begin(hash('b')); assert.equal(restarted.used, 0); assert.equal(restarted.workflowSha256, hash('b')); assert.equal(restarted.inFlight, 'old'); assert.equal(restarted.requests.old, 'pending');
    refuses(() => session.submit(ticket('new', hash('b'))), 'IN_FLIGHT'); session.settle('old', 'stale');
    refuses(() => session.submit(ticket('old', hash('b'))), 'DUPLICATE_ID');
    const submitted = session.submit(ticket('new', hash('b'))); assert.equal(submitted.used, 1); assert.equal(submitted.requests.old, 'stale');
});
test('request ledgers safely handle ordinary object property names as ids', () => {
    const session = createImageSession(); session.begin(hash('a'));
    session.submit(ticket('__proto__')); session.settle('__proto__', 'candidate');
    assert.equal(Object.hasOwn(session.snapshot().requests, '__proto__'), true);
    assert.equal(session.discard('__proto__').requests.__proto__, 'discarded');
    session.submit(ticket('constructor')); session.settle('constructor', 'failed'); assert.equal(session.snapshot().used, 2);
});

test('abandon refuses a settled cancellation once a newer request holds the slot', () => {
    const session = createImageSession(); session.begin(hash('a'));
    session.submit(ticket('first')); session.cancel('first'); session.settle('first', 'candidate');
    const before = session.submit(ticket('second'));
    refuses(() => session.abandon('first'), 'NOT_TIMED_OUT');
    assert.deepEqual(session.snapshot(), before);
    assert.equal(session.snapshot().inFlight, 'second'); assert.equal(session.snapshot().requests.first, 'cancelled');
});

test('request refuses a workflow hash that differs from the reviewed one', () => {
    const input = requestInput(); input.workflowSha256 = hash('other');
    refuses(() => createRequest(input), 'INVALID_REQUEST');
});

test('reviewText renders numbers bare, including non-finite ones, so NaN and null differ', () => {
    const base = preflight(good()).review;
    const text = reviewText({ ...base, settings: { ...base.settings, steps: NaN } });
    assert.match(text, /^Steps: NaN$/m);
    assert.notEqual(text, reviewText({ ...base, settings: { ...base.settings, steps: null } }));
});
