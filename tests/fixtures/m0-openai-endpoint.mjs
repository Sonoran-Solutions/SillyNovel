import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const answer = 'The lantern flickers as the door opens, revealing a quiet room.';
const chunks = ['The ', 'lantern ', 'flickers ', 'as ', 'the ', 'door ', 'opens, ', 'revealing ', 'a ', 'quiet ', 'room.'];
const allowedOrigin = 'http://127.0.0.1:8012';
const maxBodyBytes = 1024 * 1024;
const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    res.setHeader('Vary', 'Origin');
    if (origin === allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    else if (origin) { res.writeHead(403).end('origin not allowed'); return; }
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    if (req.method === 'GET' && req.url === '/m0-lifecycle-observer.js') {
        const observer = await readFile(fileURLToPath(new URL('./m0-lifecycle-observer.js', import.meta.url)));
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }).end(observer);
        return;
    }
    if (req.method === 'GET' && req.url === '/v1/models') {
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: [{ id: 'sn-local-test', object: 'model' }] }));
        return;
    }
    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
        res.writeHead(404).end('not found');
        return;
    }
    let raw = '';
    let bodyBytes = 0;
    for await (const part of req) {
        bodyBytes += part.length;
        if (bodyBytes > maxBodyBytes) {
            res.writeHead(413).end('request body too large');
            req.resume();
            return;
        }
        raw += part;
    }
    let payload;
    try { payload = JSON.parse(raw); } catch { res.writeHead(400).end('invalid json'); return; }
    const streaming = payload.stream === true;
    if (JSON.stringify(payload.messages ?? []).includes('[DYL17_CONTROLLED_FAILURE]')) {
        console.log('request: controlled failure, model=' + String(payload.model || 'unknown'));
        res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: 'DYL17 controlled local endpoint failure' } }));
        return;
    }
    console.log('request: ' + (streaming ? 'streaming' : 'non-streaming') + ', model=' + String(payload.model || 'unknown'));
    const id = 'chatcmpl-sillynovel-local';
    const created = Math.floor(Date.now() / 1000);
    if (streaming) {
        res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' });
        for (const content of chunks) {
            if (res.destroyed) return;
            res.write('data: ' + JSON.stringify({ id, object: 'chat.completion.chunk', created, model: 'sn-local-test', choices: [{ index: 0, delta: { content }, finish_reason: null }] }) + '\n\n');
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (!res.destroyed) {
            res.write('data: ' + JSON.stringify({ id, object: 'chat.completion.chunk', created, model: 'sn-local-test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + '\n\n');
            res.end('data: [DONE]\n\n');
        }
        return;
    }
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
        id,
        object: 'chat.completion',
        created,
        model: 'sn-local-test',
        choices: [{ index: 0, message: { role: 'assistant', content: answer }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }));
});
server.listen(8123, '127.0.0.1', () => console.log('deterministic endpoint listening on 127.0.0.1:8123'));
