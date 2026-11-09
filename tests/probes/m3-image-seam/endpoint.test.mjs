import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

const fixture = new URL('../../fixtures/m3-comfy-endpoint.mjs', import.meta.url);
let child, base, startup = '', startupError = '';
function launch(port) {
    const proc = spawn(process.execPath, [fixture.pathname], { env: { ...process.env, SN_COMFY_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    return proc;
}
async function response(path, options) { return fetch(base + path, options); }
async function control(value) { return (await response('/control', { method: 'POST', body: JSON.stringify(value) })).json(); }
async function prompt(raw = '{"prompt":{"3":{"inputs":{"text":"hello"}}}}') {
    return (await response('/prompt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw })).json();
}
async function waitDone(id) {
    for (let i = 0; i < 100; i++) {
        const result = await (await response(`/history/${id}`)).json();
        if (result[id]) return result[id];
        await sleep(10);
    }
    assert.fail(`${id} did not complete`);
}
after(() => { if (child && child.exitCode === null) child.kill('SIGTERM'); });

test('deterministic loopback ComfyUI fixture contract', async () => {
    child = launch(0);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { startup += chunk; });
    child.stderr.on('data', chunk => { startupError += chunk; });
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`fixture did not start: ${startup}`)), 5000);
        child.stdout.on('data', () => { if (/comfy endpoint listening on \d+\n/.test(startup)) { clearTimeout(timer); resolve(); } });
        child.once('error', reject);
        child.once('exit', code => reject(new Error(`fixture exited ${code}: ${startup} ${startupError}`)));
    });
    const port = Number(startup.match(/listening on (\d+)/)[1]); base = `http://127.0.0.1:${port}`;

    assert.equal((await response('/system_stats', { headers: { origin: 'http://localhost' } })).status, 403);
    const info = await (await response('/object_info')).json();
    assert.deepEqual(info.CheckpointLoaderSimple.input.required.ckpt_name[0], ['sn-synthetic.safetensors']);
    assert.deepEqual(info.UNETLoader.input.required.unet_name[0], []);
    assert.deepEqual(info.KSampler.input.required.sampler_name[0], ['euler']);
    assert.deepEqual(info.KSampler.input.required.scheduler[0], ['normal']);
    assert.deepEqual(info.VAELoader.input.required.vae_name[0], ['sn-synthetic-vae.safetensors']);

    await control({ reset: true });
    const raw = '{"prompt":{"3":{"inputs":{"text":"café \"雪\""}}}}';
    const first = await prompt(raw); assert.equal(first.prompt_id, 'sn-1');
    const firstHistory = await waitDone(first.prompt_id);
    assert.equal(firstHistory.status.status_str, 'success');
    const img = await response(`/view?filename=${first.prompt_id}.png&subfolder=&type=output`);
    assert.equal(img.status, 200);
    const bytes = Buffer.from(await img.arrayBuffer());
    const expectedHash = createHash('sha256').update(bytes).digest('hex');
    const fixtureSource = await (await import('../../fixtures/m3-comfy-endpoint.mjs')).RESULT_PNG_SHA256;
    assert.equal(expectedHash, fixtureSource);
    const logs = await (await response('/log')).json();
    assert.equal(logs.find(entry => entry.promptId === 'sn-1').rawBody, raw);
    assert.equal(logs.find(entry => entry.promptId === 'sn-1').bodyBytes, Buffer.byteLength(raw));
    assert.deepEqual(Object.keys(await (await response('/history')).json()), ['sn-1']);

    await control({ script: [{ hold: true }] });
    const held = await prompt(); assert.deepEqual(await (await response(`/history/${held.prompt_id}`)).json(), {});
    await control({ release: true }); assert.equal((await waitDone(held.prompt_id)).status.status_str, 'success');
    await control({ script: [{ hold: true }] });
    const interrupted = await prompt(); assert.equal((await response('/interrupt', { method: 'POST' })).status, 200);
    const interruptedItem = await waitDone(interrupted.prompt_id);
    assert.equal(interruptedItem.status.status_str, 'error');
    assert.deepEqual(interruptedItem.status.messages[0], ['execution_interrupted', { prompt_id: interrupted.prompt_id }]);

    await control({ script: [{ status: 500 }, { error: true }, { noOutputs: true }, { format: 'jpg' }] });
    assert.equal((await response('/prompt', { method: 'POST', body: '{}' })).status, 500);
    const errored = await prompt(); assert.equal((await waitDone(errored.prompt_id)).status.messages[0][0], 'execution_error');
    const empty = await prompt(); assert.deepEqual((await waitDone(empty.prompt_id)).outputs, {});
    const jpg = await prompt(); assert.equal(jpg.prompt_id, 'sn-6'); await waitDone(jpg.prompt_id);
    assert.equal((await response('/view?filename=nope.png')).status, 404);
    const jpgResponse = await response(`/view?filename=${jpg.prompt_id}.jpg`);
    assert.equal(jpgResponse.headers.get('content-type'), 'image/jpeg');
    assert.notEqual((await jpgResponse.arrayBuffer()).byteLength, bytes.length);

    const guarded = launch(8188);
    const [code] = await once(guarded, 'exit'); assert.notEqual(code, 0);
});
