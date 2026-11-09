// M3.3 PR C: the project client's image-ledger calls (plugin schema v3 routes) with a fake fetch.
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { createProjectClient, StorageError } from '../src/project-client.mjs';

const ROOT = '/api/plugins/sillynovel-storage', P = '11111111-1111-4111-8111-111111111111', J = '22222222-2222-4222-8222-222222222222', TYPE = 'application/vnd.sillynovel+json';
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
function serve(reply = () => ({ status: 200, json: {} })) {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, method: options.method, headers: options.headers, body: options.body === undefined ? undefined : JSON.parse(options.body), credentials: options.credentials });
        const r = reply(url, options);
        if (r instanceof Error) throw r;
        return new Response(r.text ?? JSON.stringify(r.json), { status: r.status ?? 200 });
    };
    return calls;
}
const client = () => createProjectClient(() => ({ 'X-CSRF-Token': 'token' }));

test('every ledger route: path, method, media type, CSRF header and exact body', async () => {
    const calls = serve(), c = client(), hash = 'a'.repeat(64);
    const reserve = { sessionId: J, tab: 't', payloadSha256: hash, workflowSha256: hash, review: 'R\n', settings: { steps: 20 }, seedPolicy: 'fixed', deadlineMs: 120000 };
    await c.imageSession(P);
    await c.beginImageSession(P, { tab: 't', workflowSha256: hash });
    await c.beginImageSession(P, { tab: 't', workflowSha256: hash, takeover: false });
    await c.beginImageSession(P, { tab: 't', workflowSha256: hash, takeover: true });
    await c.heartbeatImageSession(P, { sessionId: J, tab: 't' });
    await c.endImageSession(P, { sessionId: J, tab: 't' });
    await c.reserveImageJob(P, reserve);
    await c.transitionImageJob(P, J, { tab: 't', state: 'candidate', hostPath: '/user/images/a.png' });
    await c.imageHostDeleted(P, J);
    await c.imageJobs(P);
    await c.imageCache(P, hash);
    await c.cleanupImageJobs(P, [J]);
    const base = ROOT + '/projects/' + P + '/image/';
    assert.deepEqual(calls.map(({ url, method, body }) => [url, method ?? 'GET', body]), [
        [base + 'session', 'GET', undefined],
        [base + 'session/begin', 'POST', { tab: 't', workflowSha256: hash }],
        [base + 'session/begin', 'POST', { tab: 't', workflowSha256: hash }],
        [base + 'session/begin', 'POST', { tab: 't', workflowSha256: hash, takeover: true }],
        [base + 'session/heartbeat', 'POST', { sessionId: J, tab: 't' }],
        [base + 'session/end', 'POST', { sessionId: J, tab: 't' }],
        [base + 'jobs', 'POST', reserve],
        [base + 'jobs/' + J, 'POST', { tab: 't', state: 'candidate', hostPath: '/user/images/a.png' }],
        [base + 'jobs/' + J + '/host-deleted', 'POST', {}],
        [base + 'jobs', 'GET', undefined],
        [base + 'cache?payload=' + hash, 'GET', undefined],
        [base + 'jobs/cleanup', 'POST', { jobIds: [J] }],
    ]);
    for (const call of calls) {
        assert.equal(call.credentials, 'same-origin');
        assert.equal(call.headers['X-CSRF-Token'], 'token');
        assert.equal(call.headers['Content-Type'], call.body === undefined ? undefined : TYPE);
    }
});

test('identifiers and the cache key are URL-encoded, so a hostile id cannot reach another route', async () => {
    const calls = serve(), c = client();
    await c.transitionImageJob('../x', 'a/b?c', { tab: 't', state: 'failed' });
    await c.imageCache(P, 'x&payload=y');
    assert.equal(calls[0].url, ROOT + '/projects/..%2Fx/image/jobs/a%2Fb%3Fc');
    assert.equal(calls[1].url, ROOT + '/projects/' + P + '/image/cache?payload=x%26payload%3Dy');
});

test('a refusal is a StorageError carrying the plugin code and its details; the message stays the code', async () => {
    serve(() => ({ status: 409, json: { code: 'LEASE_HELD', status: 'stale', heartbeatAt: 5, tab: 'other' } }));
    await assert.rejects(client().beginImageSession(P, { tab: 't', workflowSha256: 'a'.repeat(64) }), error =>
        error instanceof StorageError && error.code === 'LEASE_HELD' && error.message === 'LEASE_HELD' && error.name === 'StorageError'
        && JSON.stringify(error.details) === JSON.stringify({ status: 'stale', heartbeatAt: 5, tab: 'other' }));
    for (const code of ['LEASE_LOST', 'IN_FLIGHT', 'ALLOWANCE_EXHAUSTED', 'WORKFLOW_CHANGED', 'LEDGER_FULL', 'INVALID_TRANSITION', 'UNRESOLVED_JOB', 'NOT_FOUND']) {
        serve(() => ({ status: code === 'NOT_FOUND' ? 404 : 409, json: { code } }));
        await assert.rejects(client().reserveImageJob(P, {}), error => error instanceof StorageError && error.code === code && JSON.stringify(error.details) === '{}');
    }
});

for (const [name, reply] of [
    ['a network failure', () => Error('offline')],
    ['an error reply that is not JSON', () => ({ status: 502, text: '<html>' })],
    ['an error reply without a code', () => ({ status: 500, json: ['x'] })],
    ['a success reply that is not JSON', () => ({ status: 200, text: 'ok' })],
]) test('the ledger never throws a raw error: ' + name + ' is STORAGE_UNAVAILABLE', async () => {
    serve(reply);
    for (const call of [c => c.imageSession(P), c => c.reserveImageJob(P, {}), c => c.transitionImageJob(P, J, {}), c => c.imageCache(P, 'a'), c => c.cleanupImageJobs(P, [])])
        await assert.rejects(call(client()), error => error instanceof StorageError && error.code === 'STORAGE_UNAVAILABLE');
});

test('existing project calls keep their errors: a network failure is still the raw error and a refusal still has the code as its message', async () => {
    serve(() => Error('offline'));
    await assert.rejects(client().load(P), /offline/);
    serve(() => ({ status: 409, json: { code: 'REVISION_CONFLICT' } }));
    await assert.rejects(client().save(P, {}), error => error.message === 'REVISION_CONFLICT');
});
