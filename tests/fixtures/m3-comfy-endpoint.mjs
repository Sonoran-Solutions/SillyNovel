// Deterministic loopback ComfyUI stand-in. PNG output is tests/fixtures/m12-stage/tavern.png.
// No outbound requests; this fixture is only for the SillyTavern image seam probe.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const COMFY_MARKER = 'sn-comfy-fixture';
const PORT = Number(process.env.SN_COMFY_PORT ?? 8129);
const MAX_BODY = 8 * 1024 * 1024, MAX_LOG = 500;
const png = await readFile(new URL('./m12-stage/tavern.png', import.meta.url));
export const RESULT_PNG_SHA256 = createHash('sha256').update(png).digest('hex');
let log = [], script = [], fallback = {}, jobs = new Map(), held = new Set(), started = Date.now(), nextJob = 1;
const send = (res, status, body, type = 'application/json') => {
    if (!res.destroyed && !res.headersSent) res.writeHead(status, { 'content-type': type }).end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
function historyItem(job) {
    return job.interrupted
        ? { prompt: [], status: { status_str: 'error', completed: true, messages: [['execution_interrupted', { prompt_id: job.id }]] }, outputs: {} }
        : job.step.error
            ? { prompt: [], status: { status_str: 'error', completed: true, messages: [['execution_error', { node_type: 'KSampler', node_id: '3', exception_type: 'SyntheticError', exception_message: 'synthetic node failure' }]] }, outputs: {} }
            : { prompt: [], status: { status_str: 'success', completed: true, messages: [] }, outputs: job.step.noOutputs ? {} : { '9': { images: [{ filename: `${job.id}.${job.step.format || 'png'}`, subfolder: '', type: 'output' }] } } };
}
function complete(job) { if (!job.done) { job.done = true; held.delete(job.id); job.timer && clearTimeout(job.timer); } }
function summarize() { return { ok: true, requests: log.length, scripted: script.length, jobs: jobs.size, held: held.size }; }
const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const hash = createHash('sha256'), chunks = [];
    let bodyBytes = 0;
    for await (const part of req) {
        bodyBytes += part.length; hash.update(part);
        if (bodyBytes <= MAX_BODY) chunks.push(part);
        else if (bodyBytes - part.length < MAX_BODY) chunks.push(part.subarray(0, MAX_BODY - (bodyBytes - part.length)));
    }
    const rawBody = bodyBytes ? Buffer.concat(chunks).toString('utf8') : null;
    const entry = { seq: log.length + 1, at: Date.now() - started, method: req.method, path: url.pathname,
        query: Object.fromEntries(url.searchParams), bodyBytes, bodySha256: hash.digest('hex'), rawBody };
    if (log.length < MAX_LOG && !['/log', '/control'].includes(url.pathname)) log.push(entry);
    if (req.headers.origin) return send(res, 403, {});
    if (bodyBytes > MAX_BODY) return send(res, 413, {});
    if (req.method === 'GET' && url.pathname === '/log') return send(res, 200, log);
    if (req.method === 'GET' && url.pathname === '/system_stats') return send(res, 200, { system: { os: 'sn-synthetic', comfyui_version: COMFY_MARKER }, devices: [] });
    if (req.method === 'GET' && url.pathname === '/object_info') return send(res, 200, {
        CheckpointLoaderSimple: { input: { required: { ckpt_name: [['sn-synthetic.safetensors']] } } },
        UNETLoader: { input: { required: { unet_name: [[]] } } },
        KSampler: { input: { required: { sampler_name: [['euler']], scheduler: [['normal']] } } },
        VAELoader: { input: { required: { vae_name: [['sn-synthetic-vae.safetensors']] } } },
    });
    if (req.method === 'POST' && url.pathname === '/control') {
        let body; try { body = JSON.parse(rawBody || '{}'); } catch { return send(res, 400, {}); }
        // Reset clears the log, script, held set and fallback only. Job ids never restart and completed jobs stay answerable,
        // so a host still polling an earlier job can never be handed a later case's job under a reused id.
        if (body.reset) { log = []; script = []; held.clear(); fallback = {}; }
        if (Array.isArray(body.script)) script.push(...body.script);
        if (body.fallback) fallback = body.fallback;
        if (body.release) for (const id of [...held]) complete(jobs.get(id));
        return send(res, 200, summarize());
    }
    if (req.method === 'POST' && url.pathname === '/prompt') {
        const step = script.shift() ?? fallback;
        if (step.status) return send(res, step.status, { error: { message: 'synthetic failure' }, node_errors: {} });
        const number = nextJob++, id = `sn-${number}`, job = { id, number, step, done: false, interrupted: false };
        entry.promptId = id; jobs.set(id, job);
        if (step.hold) held.add(id);
        else { const delay = Math.max(0, Number(step.delayMs) || 0); job.timer = setTimeout(() => complete(job), delay); }
        return send(res, 200, { prompt_id: id, number, node_errors: {} });
    }
    if (req.method === 'POST' && url.pathname === '/interrupt') {
        for (const id of [...held]) { const job = jobs.get(id); job.interrupted = true; complete(job); }
        return send(res, 200, {});
    }
    if (req.method === 'GET' && url.pathname.startsWith('/history')) {
        const id = url.pathname === '/history' ? null : decodeURIComponent(url.pathname.slice('/history/'.length));
        if (id !== null) { const job = jobs.get(id); entry.historyId = id; entry.terminal = !!job?.done; return send(res, 200, job?.done ? { [id]: historyItem(job) } : {}); }
        return send(res, 200, Object.fromEntries([...jobs.values()].filter(job => job.done).map(job => [job.id, historyItem(job)])));
    }
    if (req.method === 'GET' && url.pathname === '/view') {
        const job = [...jobs.values()].find(item => item.done && !item.interrupted && !item.step.error && !item.step.noOutputs && item.step.format !== 'jpg' && item.step.format !== 'gif' && url.searchParams.get('filename') === `${item.id}.${item.step.format || 'png'}`);
        if (!job) {
            const other = [...jobs.values()].find(item => item.done && !item.interrupted && !item.step.error && !item.step.noOutputs && url.searchParams.get('filename') === `${item.id}.${item.step.format || 'png'}`);
            if (!other) return send(res, 404, {});
            const bytes = Buffer.from(`synthetic-${other.step.format}`);
            return send(res, 200, bytes, other.step.format === 'jpg' ? 'image/jpeg' : 'image/gif');
        }
        return send(res, 200, png, 'image/png');
    }
    return send(res, 404, {});
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535 || PORT === 8188) { console.error('invalid SN_COMFY_PORT (8188 is reserved)'); process.exitCode = 1; }
    else server.listen(PORT, '127.0.0.1', () => console.log('comfy endpoint listening on ' + server.address().port));
}
