/** Pure M3.2 image-request decisions and page-lifetime reservation. No host access or I/O. */
import { captureOf, stillCurrent, RESULT_LIMITS } from './image-workflow.mjs';

export const ALLOWLIST = Object.freeze(['CheckpointLoaderSimple', 'CLIPTextEncode', 'EmptyLatentImage', 'KSampler', 'VAEDecode', 'SaveImage']);
export const RESERVED_TRIGGERS = Object.freeze(['you', 'me', 'scene', 'raw_last', 'last', 'face', 'background', 'yourself', 'myself', 'story', 'scenario', 'whole story', 'last message', 'portrait', 'selfie', 'scene background', 'scenery', 'surroundings', 'environment']);
export const LOOPBACK_HOSTS = Object.freeze(['localhost', '127.0.0.1', '[::1]']);
export const DEFAULT_ALLOWANCE = 5, WAIT_MS = 120000;
const SETTINGS = ['model', 'vae', 'sampler', 'scheduler', 'steps', 'scale', 'width', 'height', 'clip_skip', 'denoising_strength'];
const text = value => typeof value === 'string' ? value : '';
const hasMacro = value => /{{|}}|<(USER|BOT|CHAR|GROUP|CHARIFNOTGROUP)>|%[a-z_]+%/i.test(text(value));

/** SillyTavern 1.19.0's combinePrefixes rule, including its untrimmed empty-second-part return. */
export function combinePrefixes(str1, str2, macro = '') {
    if (!str2) return str1;
    const process = s => s.trim().replace(/^,|,$/g, '').trim();
    str1 = process(str1); str2 = process(str2);
    return process(macro && str1.includes(macro) ? str1.replace(macro, str2) : `${str1}, ${str2},`);
}

export function effectiveTexts(snapshot, draft) {
    return { positive: combinePrefixes(snapshot.prompt_prefix, draft.prompt, '{prompt}'), negative: combinePrefixes(draft.negativePrompt, snapshot.negative_prompt) };
}

/** Refuse every detectable mismatch; the partial review is still available when refused. */
export function preflight({ snapshot = {}, workflowText, workflowSha256, draft = {}, options = {}, origin }) {
    const problems = [], add = (code, detail) => problems.push(detail === undefined ? { code } : { code, detail });
    if (snapshot.seam !== true) add('SEAM_MISSING');
    if (snapshot.source !== 'comfy') add('SOURCE_NOT_COMFY');
    if (snapshot.comfy_type !== 'standard') add('COMFY_TYPE_NOT_STANDARD');
    let destination;
    try {
        if (typeof snapshot.comfy_url !== 'string') throw Error();
        destination = new URL(snapshot.comfy_url);
        if (!['http:', 'https:'].includes(destination.protocol)) throw Error();
    } catch { destination = null; add('URL_INVALID'); }
    const local = Boolean(destination && LOOPBACK_HOSTS.includes(destination.hostname));
    if (destination && !local) add('URL_NOT_LOOPBACK', destination.hostname);
    for (const [key, code] of [['free_extend', 'MODE_FREE_EXTEND'], ['multimodal_captioning', 'MODE_MULTIMODAL'], ['refine_mode', 'MODE_REFINE'], ['interactive_mode', 'MODE_INTERACTIVE'], ['function_tool', 'MODE_FUNCTION_TOOL']])
        if (snapshot[key] !== false) add(code);
    const prompt = text(draft.prompt);
    if (!prompt.trim()) add('PROMPT_EMPTY');
    if (RESERVED_TRIGGERS.includes(prompt.trim().toLowerCase())) add('PROMPT_RESERVED_TRIGGER');
    if (/^char(\s|,)/i.test(prompt.trimStart()) || /{{charPrefix}}/i.test(prompt)) add('PROMPT_CHAR_PREFIX');
    for (const [value, code] of [[snapshot.prompt_prefix, 'PREFIX_MACRO'], [snapshot.negative_prompt, 'NEGATIVE_PREFIX_MACRO']])
        if (value !== undefined && typeof value !== 'string') add(code, 'not a string');
    for (const [value, code] of [[draft.prompt, 'PROMPT_MACRO'], [draft.negativePrompt, 'NEGATIVE_MACRO'], [snapshot.prompt_prefix, 'PREFIX_MACRO'], [snapshot.negative_prompt, 'NEGATIVE_PREFIX_MACRO']])
        if (hasMacro(value)) add(code);
    if (text(snapshot.prompt_prefix).split('{prompt}').length > 2) add('PREFIX_MARKER_REPEATED');
    if (typeof workflowSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(workflowSha256)) add('WORKFLOW_HASH_MISSING');
    let workflow;
    try {
        if (typeof workflowText !== 'string') throw Error();
        workflow = JSON.parse(workflowText);
        if (!workflow || Object.getPrototypeOf(workflow) !== Object.prototype) throw Error();
    } catch { workflow = null; add('WORKFLOW_UNPARSEABLE'); }
    const raw = text(workflowText);
    if (raw.split('"%prompt%"').length !== 2 || raw.split('"%negative_prompt%"').length !== 2) add('WORKFLOW_PROMPT_PLACEHOLDER');
    const nodes = Object.values(workflow ?? {}).map(node => node?.class_type).sort();
    const nodeTypes = [...new Set(nodes)];
    const saveNodes = Object.values(workflow ?? {}).filter(node => node?.class_type === 'SaveImage').length;
    if (workflow) {
        if (saveNodes !== 1) add('WORKFLOW_SAVE_NODES');
        if (nodeTypes.some(type => typeof type === 'string' && type.startsWith('LoadImage'))) add('WORKFLOW_LOAD_IMAGE');
        const refused = nodeTypes.filter(type => !ALLOWLIST.includes(type));
        if (refused.length) add('WORKFLOW_NODE_NOT_ALLOWED', refused.map(type => String(type)).join(', '));
    }
    if (/%(user|char)_avatar%/i.test(raw)) add('WORKFLOW_AVATAR');
    if (Array.isArray(snapshot.comfy_placeholders) && snapshot.comfy_placeholders.length) add('WORKFLOW_CUSTOM_PLACEHOLDERS');
    for (const key of ['model', 'vae', 'sampler', 'scheduler']) {
        if (!Array.isArray(options[key])) add('OPTIONS_MISSING', key);
        else if (!options[key].includes(snapshot[key])) add('SELECTION_STALE', key + ': ' + String(snapshot[key]));
    }
    const { width, height } = snapshot;
    if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= RESULT_LIMITS.edge) || width * height > RESULT_LIMITS.pixels) add('DIMENSIONS_INVALID');
    const seedPolicy = snapshot.seed >= 0 ? 'fixed' : 'random';
    const review = { destination: { url: snapshot.comfy_url, local }, workflow: { name: snapshot.comfy_workflow, sha256: workflowSha256, nodes, saveNodes },
        settings: Object.fromEntries(SETTINGS.map(key => [key, snapshot[key]])), seedPolicy, ...(seedPolicy === 'fixed' ? { seed: snapshot.seed } : {}),
        texts: effectiveTexts({ prompt_prefix: text(snapshot.prompt_prefix), negative_prompt: text(snapshot.negative_prompt) }, { prompt, negativePrompt: text(draft.negativePrompt) }), ok: problems.length === 0 };
    return { problems, review };
}

/** The single deterministic review text that the adapter displays and hashes. */
export function reviewText(review) {
    const s = review.settings;
    return [
        ['Destination', review.destination.url + (review.destination.local ? ' (local, this machine)' : ' (not local)')],
        ['Workflow', review.workflow.name], ['Workflow SHA-256', review.workflow.sha256], ['Nodes', review.workflow.nodes.join(', ')],
        ['Model', s.model], ['Sampler', s.sampler], ['Scheduler', s.scheduler], ['VAE', s.vae], ['Steps', s.steps], ['CFG', s.scale],
        ['Size', s.width + ' x ' + s.height], ['Seed', review.seedPolicy === 'fixed' ? 'fixed ' + review.seed : 'random each request'],
        ['Positive', review.texts.positive], ['Negative', review.texts.negative],
    ].map(([key, value]) => key + ': ' + (typeof value === 'number' ? String(value) : JSON.stringify(value))).join('\n') + '\n';
}

export function createRequest({ capture, hostChatKey, catalogRevision, layoutRevision, lockState, review, workflowSha256, payloadSha256, id, submittedAt }) {
    if (!capture || !hostChatKey || !workflowSha256 || !payloadSha256 || !review?.texts || review.ok !== true || id === undefined || !Number.isFinite(submittedAt) || workflowSha256 !== review.workflow?.sha256) throw Error('INVALID_REQUEST');
    return Object.freeze({ id, capture: captureOf(capture), hostChatKey, catalogRevision, layoutRevision, lockState: Object.freeze({ ...lockState }),
        effective: Object.freeze({ prompt: review.texts.positive, negative: review.texts.negative, workflowSha256, ...review.settings,
            seedPolicy: review.seedPolicy, ...(review.seedPolicy === 'fixed' ? { seed: review.seed } : {}) }),
        payloadSha256, submittedAt, deadlineAt: submittedAt + WAIT_MS, outcome: 'pending' });
}

const locks = value => JSON.stringify(Object.fromEntries(Object.keys(value ?? {}).sort().map(key => [key, value[key]])));
export function staleReason(request, now) {
    if (!stillCurrent(request.capture, now)) return 'CAPTURE_STALE';
    if (request.hostChatKey !== now.hostChatKey) return 'HOST_CHAT_CHANGED';
    if (request.catalogRevision !== now.catalogRevision) return 'CATALOG_CHANGED';
    if (request.layoutRevision !== now.layoutRevision) return 'LAYOUT_CHANGED';
    if (locks(request.lockState) !== locks(now.lockState)) return 'LOCK_CHANGED';
    if (request.effective.workflowSha256 !== now.workflowSha256) return 'WORKFLOW_CHANGED';
    return null;
}

export function resultPathProblem(path, origin) {
    if (typeof path !== 'string') return 'RESULT_NOT_STRING';
    if (path.includes('%') || path.includes('\\')) return 'RESULT_ENCODED';
    if (path.startsWith('//') || path.includes('://')) return 'RESULT_ABSOLUTE';
    let url;
    try { url = new URL(path, origin); } catch { return 'RESULT_FOREIGN_ORIGIN'; }
    if (url.origin !== origin) return 'RESULT_FOREIGN_ORIGIN';
    const prefix = '/user/images/';
    if (!url.pathname.startsWith(prefix) || url.pathname.includes('/../') || url.pathname.slice(prefix.length).includes('//') || (path.startsWith('/') && url.pathname !== path)) return 'RESULT_OUTSIDE_IMAGES';
    if (!/\.png$/i.test(url.pathname)) return 'RESULT_NOT_PNG';
    return null;
}

/** Cancel and timeout keep the slot: only settlement or explicit abandonment frees it. */
export function createImageSession({ allowance = DEFAULT_ALLOWANCE } = {}) {
    if (!Number.isInteger(allowance) || allowance < 1) throw Error('INVALID_ALLOWANCE');
    let on = false, used = 0, inFlight = null, workflowSha256 = null;
    const requests = new Map();
    const snapshot = () => Object.freeze({ on, allowance, used, inFlight, workflowSha256, requests: Object.freeze(Object.fromEntries(requests)) });
    const requireOutcome = (id, outcome, code) => { if (requests.get(id) !== outcome) throw Error(code); };
    return {
        snapshot,
        begin(sha) {
            if (on) throw Error('ALREADY_ON');
            on = true; used = 0; workflowSha256 = sha;
            return snapshot();
        },
        end() { on = false; return snapshot(); },
        submit(request) {
            if (!on) throw Error('SESSION_OFF');
            if (inFlight !== null) throw Error('IN_FLIGHT');
            if (used >= allowance) throw Error('ALLOWANCE_EXHAUSTED');
            if (request.effective.workflowSha256 !== workflowSha256) throw Error('WORKFLOW_CHANGED');
            if (requests.has(request.id)) throw Error('DUPLICATE_ID');
            used++; inFlight = request.id; requests.set(request.id, 'pending');
            return snapshot();
        },
        cancel(id) {
            requireOutcome(id, 'pending', 'NOT_PENDING');
            requests.set(id, 'cancelled'); return snapshot();
        },
        settle(id, outcome) {
            if (inFlight === null || inFlight !== id) throw Error('NOT_IN_FLIGHT');
            if (!['candidate', 'failed', 'stale'].includes(outcome)) throw Error('INVALID_OUTCOME');
            if (requests.get(id) !== 'cancelled') requests.set(id, outcome);
            inFlight = null; return snapshot();
        },
        timeout(id) {
            requireOutcome(id, 'pending', 'NOT_PENDING');
            requests.set(id, 'timeout-unknown'); return snapshot();
        },
        abandon(id) {
            if (inFlight !== id || !['timeout-unknown', 'cancelled'].includes(requests.get(id))) throw Error('NOT_TIMED_OUT');
            requests.set(id, 'abandoned'); inFlight = null; return snapshot();
        },
        imported(id) {
            requireOutcome(id, 'candidate', 'NOT_CANDIDATE');
            requests.set(id, 'imported'); return snapshot();
        },
        discard(id) {
            requireOutcome(id, 'candidate', 'NOT_CANDIDATE');
            requests.set(id, 'discarded'); return snapshot();
        },
    };
}
