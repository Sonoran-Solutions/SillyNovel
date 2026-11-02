// Deterministic OpenAI-compatible loopback for director transport evidence. No real provider.
// A request whose system message starts with DIRECTOR_MARKER takes the next scripted reply;
// everything else is an ordinary native reply. POST /control scripts it; GET /log reads it.
import { createServer } from 'node:http';

export const DIRECTOR_MARKER = 'SillyNovel visual director';
export const nativeAnswer = '*The lantern glows.* "Welcome to the reading room," Mira says.';
const PORT = Number(process.env.SN_ENDPOINT_PORT || 8128);
const MAX_BODY = 4 * 1024 * 1024, MAX_LOG = 500;
let log = [], script = [], fallback = { content: '{"schemaVersion":1,"updates":[]}' }, nativeDelayMs = 25, busy503 = false, release = [], outstandingDirector = 0;
const send = (res, status, body) => { if (!res.destroyed && !res.headersSent) res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body)); };
const completion = content => ({ id: 'sn-director-local', created: 1, model: 'sn-reader-local', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }] });
const chunk = delta => 'data: ' + JSON.stringify({ id: 'sn-director-local', created: 1, model: 'sn-reader-local', object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason: delta.content ? null : 'stop' }] }) + '\n\n';

// Builds a schema-valid reply from what the request itself lists; model text is otherwise canned.
function autoProposal(content, { excerpt, layout, background: chosen, presence, suggest }) {
    const sourceMessageKey = [...content.matchAll(/<<message key="([^"]+)"/g)].at(-1)[1], evidence = { sourceMessageKey, excerpt };
    const found = /^(temporary-expression:\S+): .* \| for (\S+)$/m.exec(content), background = /^Backgrounds:\n([^:\n]+): /m.exec(content);
    return JSON.stringify({ schemaVersion: 1, updates: [
        ...(found ? [{ op: 'setCharacter', characterKey: found[2], expressionId: found[1], evidence }] : []),
        ...(layout && background ? [{ op: 'setLocation', backgroundId: background[1], evidence }] : []),
        ...(chosen ? [{ op: 'setLocation', backgroundId: chosen, evidence }] : []),
        ...(presence ? [{ op: 'setCharacter', ...presence, evidence }] : []),
        ...(suggest ? [{ op: 'suggestLocation', label: suggest, evidence }] : []),
    ] });
}
async function director(req, res, entry) {
    const step = script.shift() ?? fallback;
    outstandingDirector++;
    try {
        if (step.hold) await new Promise(resolve => { release.push(resolve); req.once('close', resolve); res.once('close', resolve); });
        if (step.delayMs) await new Promise(resolve => setTimeout(resolve, step.delayMs));
        if (res.destroyed) return;
        entry.replied = true;
        if (step.status) return send(res, step.status, step.json ?? { error: { message: 'synthetic failure' } });
        send(res, 200, step.json ?? completion(step.auto ? autoProposal(entry.body.messages[1].content, step.auto) : step.content));
    } finally { outstandingDirector--; }
}
async function native(res, body, entry) {
    if (busy503 && outstandingDirector) return send(res, 503, { error: { message: 'synthetic single-slot backend busy' } });
    entry.replied = true;
    if (!body.stream) return send(res, 200, completion(nativeAnswer));
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    for (let at = 0; at < nativeAnswer.length; at += 12) {
        if (res.destroyed) return;
        res.write(chunk({ content: nativeAnswer.slice(at, at + 12) }));
        await new Promise(resolve => setTimeout(resolve, nativeDelayMs));
    }
    if (!res.destroyed) res.end(chunk({}) + 'data: [DONE]\n\n');
}
const server = createServer(async (req, res) => {
    // The host proxies every provider call server-side; a browser Origin here is never expected.
    if (req.headers.origin) return send(res, 403, {});
    if (req.url === '/log') return send(res, 200, log);
    if (req.url === '/v1/models') return send(res, 200, { data: [{ id: 'sn-reader-local', object: 'model' }] });
    let raw = '';
    for await (const part of req) { raw += part; if (raw.length > MAX_BODY) return send(res, 413, {}); }
    let body;
    try { body = JSON.parse(raw); } catch { return send(res, 400, {}); }
    if (req.url === '/control') {
        if (body.reset) { log = []; script = []; busy503 = false; nativeDelayMs = 25; fallback = { content: '{"schemaVersion":1,"updates":[]}' }; }
        if (body.script) script.push(...body.script);
        if (body.fallback) fallback = body.fallback;
        if (body.nativeDelayMs !== undefined) nativeDelayMs = body.nativeDelayMs;
        if (body.busy503 !== undefined) busy503 = body.busy503;
        if (body.release) { for (const resolve of release.splice(0)) resolve(); }
        return send(res, 200, { ok: true, requests: log.length, scripted: script.length });
    }
    if (req.url !== '/v1/chat/completions' || req.method !== 'POST') return send(res, 404, {});
    const isDirector = body.messages?.[0]?.role === 'system' && String(body.messages[0].content).startsWith(DIRECTOR_MARKER);
    const entry = { director: isDirector, body, aborted: false, replied: false };
    if (log.length < MAX_LOG) log.push(entry);
    res.once('close', () => { if (!res.writableFinished) entry.aborted = true; });
    await (isDirector ? director(req, res, entry) : native(res, body, entry));
});
if (process.argv[1] === new URL(import.meta.url).pathname) server.listen(PORT, '127.0.0.1', () => console.log('director endpoint listening on ' + server.address().port));
