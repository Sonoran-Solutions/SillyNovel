import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import { createHostAdapter } from '../src/host-adapter.mjs';
import { RESULT_LIMITS } from '../src/image-workflow.mjs';

const ORIGIN = 'http://localhost:8000', PATH = '/user/images/generated.png';
const PNG = new Uint8Array(readFileSync(new URL('./fixtures/m12-stage/tavern.png', import.meta.url)));
const KEYS = ['source', 'comfy_type', 'comfy_url', 'comfy_workflow', 'free_extend', 'multimodal_captioning', 'refine_mode', 'interactive_mode', 'function_tool', 'prompt_prefix', 'negative_prompt', 'seed', 'width', 'height', 'steps', 'scale', 'model', 'vae', 'sampler', 'scheduler', 'clip_skip', 'denoising_strength', 'comfy_placeholders'];
const locationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'location');
before(() => { globalThis.location = { origin: ORIGIN }; });
after(() => {
    if (locationDescriptor) Object.defineProperty(globalThis, 'location', locationDescriptor);
    else delete globalThis.location;
});

class HostController { abort() {} }
function response(body, { status = 200, url = ORIGIN + PATH } = {}) {
    const result = new Response(body, { status });
    Object.defineProperty(result, 'url', { value: url });
    return result;
}
function fixture() {
    const calls = [], fetches = [], imports = [];
    const state = { reply: PATH, error: null, workflow: 'abc', fetch: null };
    const settings = {
        source: 'comfy', comfy_type: 'standard', comfy_url: 'http://127.0.0.1:8188', comfy_workflow: 'Default_Comfy_Workflow.json',
        free_extend: false, multimodal_captioning: false, refine_mode: false, interactive_mode: false, function_tool: false,
        prompt_prefix: '', negative_prompt: '', seed: -1, width: 512, height: 512, steps: 20, scale: 7,
        model: 'model', vae: 'vae', sampler: 'euler', scheduler: 'normal', clip_skip: 1, denoising_strength: 1, comfy_placeholders: [],
    };
    const context = {
        extensionSettings: { sd: settings }, getRequestHeaders: () => ({ 'X-CSRF-Token': 'synthetic-token' }), getCurrentChatId: () => 'chat-a',
        SlashCommandParser: { commands: { imagine: { callback: async function (args, prompt) {
            calls.push([args, prompt]);
            if (state.error) throw state.error;
            return state.reply;
        } } } },
    };
    const selects = Object.fromEntries(['model', 'vae', 'sampler', 'scheduler'].map(key => ['#sd_' + key, { options: [{ value: settings[key] }] }]));
    const environment = {
        document: { querySelector: selector => selects[selector] },
        fetch: async (url, options) => {
            fetches.push([url, options]);
            return state.fetch ? state.fetch(url, options) : response(url.pathname === '/api/sd/comfy/workflow' ? JSON.stringify(state.workflow) : PNG);
        },
        importController: async () => { imports.push(true); return HostController; },
    };
    const image = createHostAdapter(() => context, { image: environment }).image;
    return { image, context, settings, selects, environment, state, calls, fetches, imports };
}

test('controller loading is lazy, cached across concurrent inspections, and uses the host class', async () => {
    const f = fixture();
    assert.deepEqual(f.image.available(), { ok: false, missing: ['SlashCommandAbortController'] });
    assert.equal(f.image.createController(), null);
    assert.equal(f.imports.length, 0);
    await Promise.all([f.image.inspect(), f.image.inspect()]);
    assert.equal(f.imports.length, 1);
    assert.deepEqual(f.image.available(), { ok: true, missing: [] });
    assert.ok(f.image.createController() instanceof HostController);
    assert.notEqual(f.image.createController(), f.image.createController());
});

for (const [name, detail, remove] of [
    ['SlashCommandParser.commands.imagine', 'missing', f => { delete f.context.SlashCommandParser.commands.imagine; }],
    ['SlashCommandParser.commands.imagine', 'changed arity', f => { f.context.SlashCommandParser.commands.imagine.callback = async () => {}; }],
    ['extensionSettings.sd', 'missing', f => { delete f.context.extensionSettings.sd; }],
    ['extensionSettings.sd', 'null', f => { f.context.extensionSettings.sd = null; }],
    ['extensionSettings.sd', 'wrong type', f => { f.context.extensionSettings.sd = 'wrong type'; }],
    ['getRequestHeaders', 'missing', f => { delete f.context.getRequestHeaders; }],
    ['getCurrentChatId', 'missing', f => { delete f.context.getCurrentChatId; }],
]) test('available reports missing ' + name + ' (' + detail + ')', async () => {
    const f = fixture();
    await f.image.inspect();
    remove(f);
    assert.deepEqual(f.image.available(), { ok: false, missing: [name] });
});

for (const importer of [async () => { throw Error('missing module'); }, async () => undefined]) {
    test('failed or invalid controller import is cached and disables the seam', async () => {
        const f = fixture(); let attempts = 0;
        f.environment.importController = async () => { attempts++; return importer(); };
        const first = await f.image.inspect();
        await f.image.inspect();
        assert.equal(attempts, 1);
        assert.equal(first.ok, false);
        assert.equal(first.snapshot.seam, false);
        assert.deepEqual(first.missing, ['SlashCommandAbortController']);
        assert.equal(f.image.createController(), null);
    });
}

test('inspect copies exactly the snapshot keys verbatim and detaches nested values', async () => {
    const f = fixture();
    f.settings.prompt_prefix = { invalid: ['preserve this for preflight'] };
    f.settings.comfy_placeholders = [{ nested: { value: '%unchanged%' } }];
    f.settings.unrelated = 'must not escape';
    const result = await f.image.inspect();
    assert.equal(result.ok, true);
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.snapshot, { ...Object.fromEntries(KEYS.map(key => [key, f.settings[key]])), seam: true });
    assert.notEqual(result.snapshot.prompt_prefix, f.settings.prompt_prefix);
    assert.notEqual(result.snapshot.comfy_placeholders[0].nested, f.settings.comfy_placeholders[0].nested);
    f.settings.prompt_prefix.invalid.push('changed');
    assert.deepEqual(result.snapshot.prompt_prefix, { invalid: ['preserve this for preflight'] });
    assert.deepEqual(result.options, { model: ['model'], vae: ['vae'], sampler: ['euler'], scheduler: ['normal'] });
    assert.equal(result.hostChatKey, 'chat-a');
    assert.equal(result.origin, ORIGIN);
});

test('inspect retains undefined option lists for missing selects', async () => {
    const f = fixture();
    delete f.selects['#sd_vae'];
    f.selects['#sd_sampler'].options.push({ value: 'ddim' });
    const { options } = await f.image.inspect();
    assert.deepEqual(options, { model: ['model'], vae: undefined, sampler: ['euler', 'ddim'], scheduler: ['normal'] });
});

test('document and fetch default to the page globals without changing existing caller options', async () => {
    const f = fixture(), oldDocument = globalThis.document, oldFetch = globalThis.fetch;
    try {
        globalThis.document = f.environment.document;
        globalThis.fetch = f.environment.fetch;
        const image = createHostAdapter(() => f.context, { image: { importController: f.environment.importController } }).image;
        assert.deepEqual((await image.inspect()).options.sampler, ['euler']);
        assert.equal((await image.fetchResult(PATH)).ok, true);
        assert.equal(f.fetches.length, 2);
    } finally {
        if (oldDocument === undefined) delete globalThis.document;
        else globalThis.document = oldDocument;
        globalThis.fetch = oldFetch;
    }
});

test('host getters, uncloneable settings, missing document, and a failing controller constructor never throw', async () => {
    const f = fixture();
    Object.defineProperty(f.context, 'SlashCommandParser', { get() { throw Error('not ready'); } });
    f.settings.prompt_prefix = () => {};
    f.settings.comfy_placeholders = [{ invalid: () => {} }];
    f.environment.document = { querySelector() { throw Error('unavailable'); } };
    f.environment.importController = async () => class { constructor() { throw Error('unavailable'); } };
    const result = await f.image.inspect();
    assert.equal(result.ok, false);
    assert.ok(result.missing.includes('SlashCommandParser.commands.imagine'));
    assert.ok(result.missing.includes('extensionSettings.sd'));
    assert.equal(result.snapshot.prompt_prefix, f.settings.prompt_prefix);
    assert.equal(result.options.model, undefined);
    assert.equal(f.image.createController(), null);
    assert.deepEqual(await f.image.request({ prompt: 'room' }), { ok: false, code: 'SEAM_MISSING' });
});

test('inspect sends the host workflow body and authenticated JSON headers and hashes the exact returned text', async () => {
    const f = fixture();
    const result = await f.image.inspect();
    const [[url, options]] = f.fetches;
    assert.equal(url.href, ORIGIN + '/api/sd/comfy/workflow');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.get('X-CSRF-Token'), 'synthetic-token');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    assert.equal(options.body, JSON.stringify({ file_name: f.settings.comfy_workflow }));
    assert.equal(result.workflowText, 'abc');
    assert.equal(result.workflowSha256, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

for (const [name, fetch] of [
    ['non-string JSON', () => response('{"workflow":{}}')],
    ['invalid JSON', () => response('invalid json')],
    ['non-200', () => response('unavailable', { status: 503 })],
    ['network rejection', () => { throw Error('offline'); }],
]) test('inspect refuses ' + name, async () => {
    const f = fixture(); f.state.fetch = fetch;
    const result = await f.image.inspect();
    assert.equal(result.ok, false);
    assert.equal(result.workflowText, null);
    assert.equal(result.workflowSha256, null);
    assert.deepEqual(result.missing, ['workflow']);
});

function overLimit(limit) {
    const state = { pulls: 0, cancelled: false };
    const body = new ReadableStream({
        pull(controller) {
            state.pulls++;
            controller.enqueue(new Uint8Array(state.pulls === 1 ? limit : 1));
        },
        cancel() { state.cancelled = true; },
    }, { highWaterMark: 0 });
    return { body, state };
}

test('inspect stops a workflow stream one byte over 1 MiB', async () => {
    const f = fixture(), stream = overLimit(1024 * 1024);
    f.state.fetch = () => response(stream.body);
    const result = await f.image.inspect();
    assert.equal(result.ok, false);
    assert.equal(result.workflowText, null);
    assert.equal(result.workflowSha256, null);
    assert.deepEqual(result.missing, ['workflow-too-large']);
    assert.equal(stream.state.pulls, 2);
    assert.equal(stream.state.cancelled, true);
});

test('inspect accepts a workflow body at exactly 1 MiB', async () => {
    const f = fixture();
    f.state.workflow = 'x'.repeat(1024 * 1024 - 2);
    assert.equal((await f.image.inspect()).workflowText, f.state.workflow);
});

test('hostChatKey coerces present IDs without inventing a missing identity', () => {
    const f = fixture();
    for (const key of ['chat-a', 42, 0, '', null, undefined]) {
        f.context.getCurrentChatId = () => key;
        assert.equal(f.image.hostChatKey(), key == null ? null : String(key));
    }
    f.context.getCurrentChatId = () => { throw Error('switching'); };
    assert.equal(f.image.hostChatKey(), null);
});

test('every image method is safe with a missing or throwing context', async () => {
    for (const getContext of [() => null, () => { throw Error('not ready'); }]) {
        const image = createHostAdapter(getContext).image;
        assert.deepEqual(image.available().missing, ['SlashCommandParser.commands.imagine', 'extensionSettings.sd', 'getRequestHeaders', 'getCurrentChatId', 'SlashCommandAbortController']);
        assert.equal((await image.inspect()).ok, false);
        assert.equal(image.createController(), null);
        assert.equal(image.hostChatKey(), null);
        assert.deepEqual(await image.request(), { ok: false, code: 'SEAM_MISSING' });
        assert.deepEqual(await image.fetchResult(PATH), { ok: false, code: 'RESULT_FETCH_FAILED', path: PATH });
    }
});

test('request sends only the exact host arguments and leaves prompt and negative untouched', async () => {
    const f = fixture(); await f.image.inspect();
    const controller = f.image.createController(), prompt = '  a room\n', negative = '  blur\n';
    assert.deepEqual(await f.image.request({ prompt, negative, controller }), { ok: true, path: PATH });
    assert.deepEqual(f.calls, [[{ quiet: 'true', gallery: 'false', negative, _abortController: controller }, prompt]]);
    assert.equal(f.calls[0][0]._abortController, controller);
});

for (const reply of [undefined, '', null, 42, {}]) test('request refuses non-result ' + String(reply), async () => {
    const f = fixture(); await f.image.inspect(); f.state.reply = reply;
    assert.deepEqual(await f.image.request({ prompt: 'room' }), { ok: false, code: 'HOST_NO_RESULT' });
    assert.equal(f.calls.length, 1);
});

test('request catches a host throw without retrying', async () => {
    const f = fixture(); await f.image.inspect(); f.state.error = Error('host failed');
    assert.deepEqual(await f.image.request({ prompt: 'room' }), { ok: false, code: 'HOST_THREW' });
    assert.equal(f.calls.length, 1);
});

for (const url of ['https://example.com', 'http://localhost.evil', 'file://localhost/a', 'ftp://127.0.0.1', 'invalid', null]) {
    test('request guards the current URL before dispatch: ' + url, async () => {
        const f = fixture(); await f.image.inspect(); f.settings.comfy_url = url;
        assert.deepEqual(await f.image.request({ prompt: 'room' }), { ok: false, code: 'URL_NOT_LOOPBACK' });
        assert.equal(f.calls.length, 0);
    });
}
for (const url of ['http://localhost:8188', 'https://127.0.0.1', 'http://[::1]:8188']) {
    test('request accepts loopback http(s): ' + url, async () => {
        const f = fixture(); await f.image.inspect(); f.settings.comfy_url = url;
        assert.equal((await f.image.request({ prompt: 'room' })).ok, true);
    });
}

test('request refuses a missing seam before the callback', async () => {
    const f = fixture();
    assert.deepEqual(await f.image.request({ prompt: 'room' }), { ok: false, code: 'SEAM_MISSING' });
    await f.image.inspect();
    delete f.context.getRequestHeaders;
    assert.deepEqual(await f.image.request({ prompt: 'room' }), { ok: false, code: 'SEAM_MISSING' });
    assert.equal(f.calls.length, 0);
});

for (const [path, code] of [
    ['/user/images/%2e%2e%2fx', 'RESULT_ENCODED'], ['a.jpg', 'RESULT_OUTSIDE_IMAGES'],
    ['/user/images/a.jpg', 'RESULT_NOT_PNG'], ['https://example.com/user/images/a.png', 'RESULT_ABSOLUTE'],
    [undefined, 'RESULT_NOT_STRING'],
]) test('fetchResult refuses an invalid path without fetching: ' + path, async () => {
    const f = fixture();
    assert.deepEqual(await f.image.fetchResult(path), { ok: false, code, path });
    assert.equal(f.fetches.length, 0);
});

test('fetchResult authenticates the same-origin request, refuses redirects, and returns the PNG File and bytes', async () => {
    const f = fixture();
    const result = await f.image.fetchResult(PATH);
    const [[url, options]] = f.fetches;
    assert.equal(url.href, ORIGIN + PATH);
    assert.deepEqual(options, { headers: { 'X-CSRF-Token': 'synthetic-token' }, redirect: 'error' });
    assert.equal(result.ok, true);
    assert.equal(result.path, PATH);
    assert.deepEqual(result.bytes, PNG);
    assert.ok(result.file instanceof File);
    assert.equal(result.file.name, 'generated-background.png');
    assert.equal(result.file.type, 'image/png');
    assert.deepEqual(new Uint8Array(await result.file.arrayBuffer()), PNG);
});

for (const [name, fetch, code] of [
    ['redirected URL', () => response(PNG, { url: ORIGIN + '/user/images/other.png' }), 'RESULT_REDIRECTED'],
    ['non-200', () => response('error', { status: 500 }), 'RESULT_FETCH_FAILED'],
    ['fetch rejection', () => { throw Error('offline'); }, 'RESULT_FETCH_FAILED'],
    ['non-PNG bytes', () => response('not a png'), 'NOT_PNG'],
]) test('fetchResult refuses ' + name, async () => {
    const f = fixture(); f.state.fetch = fetch;
    assert.deepEqual(await f.image.fetchResult(PATH), { ok: false, code, path: PATH });
    assert.equal(f.fetches.length, 1);
});

test('fetchResult stops and cancels a stream one byte over the PNG limit', async () => {
    const f = fixture(), stream = overLimit(RESULT_LIMITS.bytes);
    f.state.fetch = () => response(stream.body);
    assert.deepEqual(await f.image.fetchResult(PATH), { ok: false, code: 'RESULT_TOO_LARGE', path: PATH });
    assert.equal(stream.state.pulls, 2);
    assert.equal(stream.state.cancelled, true);
});

test('fetchResult preserves the size refusal when cancelling the stream rejects', async () => {
    const f = fixture();
    f.state.fetch = () => response(new ReadableStream({
        start(controller) { controller.enqueue(new Uint8Array(RESULT_LIMITS.bytes + 1)); },
        cancel() { throw Error('already closed'); },
    }));
    assert.deepEqual(await f.image.fetchResult(PATH), { ok: false, code: 'RESULT_TOO_LARGE', path: PATH });
});

test('fetchResult preserves pngProblem dimension and malformed-PNG codes', async () => {
    const f = fixture(), bytes = PNG.slice();
    new DataView(bytes.buffer).setUint32(16, RESULT_LIMITS.edge + 1);
    f.state.fetch = () => response(bytes);
    assert.deepEqual(await f.image.fetchResult(PATH), { ok: false, code: 'PNG_DIMENSIONS', path: PATH });
    f.state.fetch = () => response(PNG.slice(0, 34));
    assert.deepEqual(await f.image.fetchResult(PATH), { ok: false, code: 'MALFORMED_PNG', path: PATH });
});
