import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.DYL19_WRITER_PORT ?? 18020);
createServer(async (request, response) => {
    if (request.url !== '/' && request.url?.split('?')[0] !== '/writer.html') {
        response.writeHead(404).end('Not found');
        return;
    }
    try {
        const html = await readFile(path.join(root, 'writer.html'));
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html);
    } catch {
        response.writeHead(500).end('Probe page unavailable');
    }
}).listen(port, '127.0.0.1', () => {
    console.log(`DYL-19 writer probe: http://127.0.0.1:${port}/`);
});
