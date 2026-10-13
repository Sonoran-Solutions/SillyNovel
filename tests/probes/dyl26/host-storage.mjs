// DYL-26 ONLY: copied into a disposable pinned host, never imported by SillyNovel.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const namespace = 'sillynovel-dyl26';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
const recordValid = record => exact(record, ['background'])
    && (record.background === null || ['forest', 'tavern'].includes(record.background));
const rootFor = userRoot => path.join(userRoot, namespace);

function seal(file) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail('INVALID_TARGET');
    return { dev: stat.dev, ino: stat.ino, birthtimeMs: stat.birthtimeMs, sha256: hash(fs.readFileSync(file)) };
}

// Trusted offline fixture enrollment, NOT an HTTP/import or existing-chat identity API.
// IDs originate here at synthetic fixture creation, never from names, indexes or digests.
export function enrollSynthetic(userRoot, fixtures) {
    const root = rootFor(userRoot);
    if (fs.existsSync(root)) fail('COLLISION');
    const scopes = new Map();
    const catalog = { storeId: randomUUID(), chats: fixtures.map(({ label, relativePath, scope }) => {
        if (!scopes.has(scope)) scopes.set(scope, randomUUID());
        const file = path.resolve(userRoot, relativePath);
        if (!file.startsWith(`${path.resolve(userRoot)}${path.sep}`)) fail('INVALID_TARGET');
        return { label, relativePath, scopeId: scopes.get(scope), chatId: randomUUID(), seal: seal(file) };
    }) };
    fs.mkdirSync(root); // exclusive namespace preflight; caller owns a fresh root
    for (const chat of catalog.chats) {
        fs.writeFileSync(path.join(root, `${chat.chatId}.json`), JSON.stringify({
            storeId: catalog.storeId, chatId: chat.chatId, revision: 0, record: { background: null },
        }), { flag: 'wx' });
    }
    fs.writeFileSync(path.join(root, 'identities.json'), JSON.stringify(catalog), { flag: 'wx' });
    return catalog;
}

export function install(app) {
    const runId = process.env.SN_DYL26_RUN;
    const dataRoot = path.resolve(globalThis.DATA_ROOT);
    if (!uuid(runId) || !path.basename(dataRoot).startsWith('sillynovel-dyl26-')
        || fs.readFileSync(path.join(dataRoot, '.dyl26-owned'), 'utf8') !== runId) {
        throw new Error('DYL26 requires an explicitly owned disposable data root');
    }
    const clients = new Map();
    // ponytail: one host process and sealed fixtures only; native lifecycle integration and
    // cross-process transactions require a host-owned identity registry/transaction boundary.
    function catalogFor(req) {
        const userRoot = path.resolve(req.user.directories.root);
        if (path.dirname(userRoot) !== dataRoot) fail('WRONG_STORE', 403);
        const root = rootFor(userRoot);
        let catalog;
        try { catalog = JSON.parse(fs.readFileSync(path.join(root, 'identities.json'), 'utf8')); }
        catch { fail('IDENTITY_UNAVAILABLE', 409); }
        if (!uuid(catalog.storeId) || !Array.isArray(catalog.chats)) fail('IDENTITY_UNAVAILABLE', 409);
        return { userRoot, root, catalog };
    }
    function clientFor(req, clientId) {
        const client = clients.get(clientId);
        if (!client || client.session !== req.session.dyl26Session || client.user !== req.user.profile.handle) fail('INVALID_CLIENT', 403);
        return client;
    }
    function chatFor(context, chatId) {
        const chat = context.catalog.chats.find(item => item.chatId === chatId);
        if (!chat || !uuid(chat.chatId) || !uuid(chat.scopeId)) fail('INVALID_TARGET');
        const file = path.resolve(context.userRoot, chat.relativePath);
        if (!file.startsWith(`${context.userRoot}${path.sep}`)) fail('INVALID_TARGET');
        try {
            // Seal is a conservative invalidation guard, not an inferred chat identity.
            if (JSON.stringify(seal(file)) !== JSON.stringify(chat.seal)) fail('INVALID_TARGET');
        } catch { fail('INVALID_TARGET'); }
        return chat;
    }
    function validate(req, target) {
        if (!exact(target, ['storeId', 'scopeId', 'chatId', 'clientId', 'viewToken'])
            || !Object.values(target).every(uuid)) fail('INVALID_TARGET');
        const context = catalogFor(req);
        if (target.storeId !== context.catalog.storeId) fail('WRONG_STORE', 403);
        const chat = chatFor(context, target.chatId);
        if (target.scopeId !== chat.scopeId) fail('INVALID_TARGET');
        const client = clientFor(req, target.clientId);
        if (client.chatId !== target.chatId || client.viewToken !== target.viewToken) fail('STALE_VIEW', 409);
        return { ...context, chat, client, file: path.join(context.root, `${chat.chatId}.json`) };
    }
    function read(context) {
        let bytes;
        try { bytes = fs.readFileSync(context.file, 'utf8'); }
        catch (error) { fail(error.code === 'ENOENT' ? 'MISSING_RECORD' : 'READ_FAILED', 409); }
        let saved;
        try { saved = JSON.parse(bytes); } catch { fail('CORRUPT_RECORD', 409); }
        if (!exact(saved, ['storeId', 'chatId', 'revision', 'record'])
            || saved.storeId !== context.catalog.storeId || saved.chatId !== context.chat.chatId
            || !Number.isSafeInteger(saved.revision) || saved.revision < 0 || !recordValid(saved.record)) fail('CORRUPT_RECORD', 409);
        return saved;
    }
    function route(name, handler) {
        app.post(`/api/dyl26/${name}`, async (req, res) => {
            res.set('Cache-Control', 'no-store');
            try { res.json(await handler(req)); }
            catch (error) { res.status(error.status ?? 500).json({ error: error.status ? error.code : 'IO_FAILED' }); }
        });
    }
    route('catalog', req => {
        const { catalog } = catalogFor(req);
        return { storeId: catalog.storeId, chats: catalog.chats.map(({ label, scopeId, chatId }) => ({ label, scopeId, chatId })) };
    });
    route('client', req => {
        req.session.dyl26Session ??= randomUUID();
        const clientId = randomUUID();
        clients.set(clientId, { user: req.user.profile.handle, session: req.session.dyl26Session, chatId: null, viewToken: null });
        return { clientId };
    });
    // Experimental host activation seam. NOT wired to native UI CHAT_CHANGED.
    route('activate', req => {
        if (!exact(req.body, ['clientId', 'chatId'])) fail('INVALID_INPUT');
        const client = clientFor(req, req.body.clientId);
        client.chatId = null;
        client.viewToken = null; // even refused/temporary navigation revokes the old visit
        if (req.body.chatId === null) fail('TEMPORARY_TARGET', 409);
        const context = catalogFor(req);
        chatFor(context, req.body.chatId);
        client.chatId = req.body.chatId;
        client.viewToken = randomUUID();
        return { activated: true };
    });
    route('target', req => {
        if (!exact(req.body, ['clientId'])) fail('INVALID_INPUT');
        const client = clientFor(req, req.body.clientId);
        if (!client.chatId) fail('INACTIVE_TARGET', 409);
        const context = catalogFor(req);
        const chat = chatFor(context, client.chatId);
        return { storeId: context.catalog.storeId, scopeId: chat.scopeId, chatId: chat.chatId,
            clientId: req.body.clientId, viewToken: client.viewToken };
    });
    route('read', req => {
        if (!exact(req.body, ['target'])) fail('INVALID_INPUT');
        return read(validate(req, req.body.target));
    });
    // Test instrumentation only: deterministic wait BEFORE the final transaction checks.
    route('barrier', req => {
        if (!exact(req.body, ['clientId', 'action'])) fail('INVALID_INPUT');
        const client = clientFor(req, req.body.clientId);
        if (req.body.action === 'arm') {
            if (client.barrier) fail('BUSY', 409);
            let release;
            const promise = new Promise(resolve => { release = resolve; });
            client.barrier = { promise, release, entered: false };
        } else if (req.body.action === 'release') {
            if (!client.barrier) fail('NO_BARRIER');
            client.barrier.release();
        } else if (req.body.action !== 'status') fail('INVALID_INPUT');
        return { entered: client.barrier?.entered ?? false };
    });
    route('cas', async req => {
        if (!exact(req.body, ['target', 'expectedRevision', 'record']) || !recordValid(req.body.record)
            || !Number.isSafeInteger(req.body.expectedRevision) || req.body.expectedRevision < 0) fail('INVALID_INPUT');
        const initial = validate(req, req.body.target);
        const barrier = initial.client.barrier;
        if (barrier) {
            barrier.entered = true;
            await barrier.promise;
            if (initial.client.barrier === barrier) delete initial.client.barrier;
        }
        // No await from revalidation through rename: single-process server CAS, independent of Web Locks.
        const context = validate(req, req.body.target);
        const saved = read(context);
        if (saved.revision !== req.body.expectedRevision) fail('STALE_REVISION', 409);
        if (saved.revision === Number.MAX_SAFE_INTEGER) fail('REVISION_LIMIT', 409);
        const next = { ...saved, revision: saved.revision + 1, record: req.body.record };
        const temporary = path.join(context.root, `${randomUUID()}.tmp`);
        let fd;
        try {
            fd = fs.openSync(temporary, 'wx', 0o600);
            fs.writeFileSync(fd, JSON.stringify(next));
            fs.fsyncSync(fd);
            fs.closeSync(fd);
            fd = undefined;
            fs.renameSync(temporary, context.file);
        } catch {
            fail('WRITE_FAILED', 503);
        } finally {
            if (fd !== undefined) fs.closeSync(fd);
            if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
        }
        return next; // rename completed; process restart tested, power-loss durability not claimed
    });
}
