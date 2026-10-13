// DYL-27 registry plus DYL-28 load-envelope proof; copied into a disposable host only.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const namespace = 'sillynovel-dyl27';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
const recordValid = record => exact(record, ['background'])
    && (record.background === null || ['forest', 'tavern'].includes(record.background));
const rootFor = userRoot => path.join(userRoot, namespace);
let createLoadEnvelopeForRequest = () => fail('NOT_READY', 503);

// The native /get endpoint passes the messages and raw bytes from one synchronous read.
export function createLoadEnvelope(req, file, messages, sourceText, clientId, sequence) {
    return createLoadEnvelopeForRequest(req, file, messages, sourceText, clientId, sequence);
}

function seal(file) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail('INVALID_TARGET');
    return { dev: stat.dev, ino: stat.ino, birthtimeMs: stat.birthtimeMs, sha256: hash(fs.readFileSync(file)) };
}

// Only native lifecycle hooks allocate identities. No enrollment API.
function load(userRoot) {
    return JSON.parse(fs.readFileSync(path.join(rootFor(userRoot), 'identities.json'), 'utf8'));
}
function atomic(file, value) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    let fd;
    try {
        fd = fs.openSync(temporary, 'wx', 0o600);
        fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd);
        fs.closeSync(fd); fd = undefined; fs.renameSync(temporary, file);
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
}
function persist(userRoot, catalog) { atomic(path.join(rootFor(userRoot), 'identities.json'), catalog); }
export function scopeCreated(userRoot, avatar) {
    const root = rootFor(userRoot);
    if (!fs.existsSync(root)) {
        fs.mkdirSync(root);
        persist(userRoot, { storeId: randomUUID(), scopes: [], chats: [], pending: null });
    }
    const catalog = load(userRoot);
    if (catalog.pending) return;
    const existing = catalog.scopes.find(s => s.avatar === avatar);
    if (existing) { existing.disabled = true; persist(userRoot, catalog); return; }
    catalog.scopes.push({ avatar, scopeId: randomUUID() });
    persist(userRoot, catalog);
}
// ponytail: single-process, newly created character scopes only. A pending transaction
// refuses visual access after restart; recovery/adoption needs a reviewed host protocol.
export function nativeMutation(userRoot, file, operation, action, destination) {
    let catalog, chat;
    try {
        catalog = load(userRoot);
        if (catalog.pending) throw new Error('pending');
        const relativePath = path.relative(userRoot, file);
        const scope = catalog.scopes.find(s => relativePath.startsWith(`chats/${s.avatar.replace('.png', '')}/`));
        if (!scope || scope.disabled) throw new Error('unresolved scope');
        chat = catalog.chats.find(c => !c.deleted && c.relativePath === relativePath);
        if (chat && JSON.stringify(seal(file)) !== JSON.stringify(chat.seal)) throw new Error('external drift');
        if (!chat && (operation !== 'save' || fs.existsSync(file))) throw new Error('adoption refused');
        catalog.pending = { operation, relativePath, destination: destination && path.relative(userRoot, destination) };
        persist(userRoot, catalog);
        if (!chat) {
            chat = { relativePath, scopeId: scope.scopeId, chatId: randomUUID() };
            catalog.chats.push(chat);
        }
    } catch { catalog = null; }
    const result = action(); // Native chat operation remains usable when visual identity is unresolved.
    if (catalog) {
        if (process.env.SN_DYL27_INTERRUPT === operation) return result;
        try {
            if (operation === 'delete') chat.deleted = true;
            else {
                if (destination) chat.relativePath = path.relative(userRoot, destination);
                chat.seal = seal(destination || file);
                if (operation === 'save') {
                    const revision = Number.isSafeInteger(chat.sourceRevision) ? chat.sourceRevision : 0;
                    if (revision === Number.MAX_SAFE_INTEGER) return result;
                    chat.sourceRevision = revision + 1;
                }
            }
            const record = path.join(rootFor(userRoot), `${chat.chatId}.json`);
            if (!fs.existsSync(record)) fs.writeFileSync(record, JSON.stringify({ storeId: catalog.storeId,
                chatId: chat.chatId, revision: 0, record: { background: null } }), { flag: 'wx' });
            catalog.pending = null; persist(userRoot, catalog);
        } catch { /* persisted pending intent refuses visual use, without guessing recovery */ }
    }
    return result;
}

export function install(app) {
    const runId = process.env.SN_DYL27_RUN;
    const dataRoot = path.resolve(globalThis.DATA_ROOT);
    if (!uuid(runId) || !path.basename(dataRoot).startsWith('sillynovel-dyl27-')
        || fs.readFileSync(path.join(dataRoot, '.dyl27-owned'), 'utf8') !== runId) {
        throw new Error('DYL27 requires an explicitly owned disposable data root');
    }
    const clients = new Map();
    const loadRequests = new Map();
    // Unsupported scope mutation invalidates visual authority BEFORE native processing.
    for (const name of ['rename', 'delete', 'import', 'edit-avatar']) app.use(`/api/characters/${name}`, (req, res, next) => {
        try {
            const catalog = load(req.user.directories.root);
            for (const scope of catalog.scopes) scope.disabled = true;
            persist(req.user.directories.root, catalog);
        } catch { /* absent registry has no visual authority */ }
        next();
    });
    // ponytail: one host process only; multiple processes require a shared transaction boundary.
    function catalogFor(req) {
        const userRoot = path.resolve(req.user.directories.root);
        if (path.dirname(userRoot) !== dataRoot) fail('WRONG_STORE', 403);
        const root = rootFor(userRoot);
        let catalog;
        try { catalog = JSON.parse(fs.readFileSync(path.join(root, 'identities.json'), 'utf8')); }
        catch { fail('IDENTITY_UNAVAILABLE', 409); }
        if (catalog.pending || !uuid(catalog.storeId) || !Array.isArray(catalog.chats) || !Array.isArray(catalog.scopes)) fail('IDENTITY_UNAVAILABLE', 409);
        return { userRoot, root, catalog };
    }
    function clientFor(req, clientId) {
        const client = clients.get(clientId);
        if (!client || client.session !== req.session.dyl27Session || client.user !== req.user.profile.handle) fail('INVALID_CLIENT', 403);
        return client;
    }
    function clearClient(client) {
        client.chatId = null;
        client.viewToken = null;
        client.loadRequestId = null;
        client.sourceRevision = null;
    }
    function supersedeLoads(clientId) {
        for (const load of loadRequests.values()) if (load.clientId === clientId && !load.consumed) load.superseded = true;
    }
    function pruneLoadRequests() {
        const now = Date.now();
        for (const [id, load] of loadRequests) if (load.expiresAt <= now) loadRequests.delete(id);
        if (loadRequests.size >= 256) fail('LOAD_CAPACITY', 429);
    }
    function chatFor(context, chatId) {
        const chat = context.catalog.chats.find(item => item.chatId === chatId);
        const scope = chat && context.catalog.scopes.find(s => s.scopeId === chat.scopeId);
        if (!chat || chat.deleted || !scope || scope.disabled || !uuid(chat.chatId) || !uuid(chat.scopeId)) fail('INVALID_TARGET');
        if (!Number.isSafeInteger(chat.sourceRevision) || chat.sourceRevision < 1) fail('INVALID_TARGET');
        const file = path.resolve(context.userRoot, chat.relativePath);
        if (!file.startsWith(`${context.userRoot}${path.sep}`)) fail('INVALID_TARGET');
        try {
            // Guard detects changes outside hooked native writes; UUIDs come from lifecycle allocation.
            if (JSON.stringify(seal(file)) !== JSON.stringify(chat.seal)) fail('INVALID_TARGET');
        } catch { fail('INVALID_TARGET'); }
        return chat;
    }
    function validate(req, target) {
        if (!exact(target, ['storeId', 'scopeId', 'chatId', 'clientId', 'viewToken', 'loadRequestId', 'sourceRevision'])
            || !['storeId', 'scopeId', 'chatId', 'clientId', 'viewToken', 'loadRequestId'].every(key => uuid(target[key]))
            || !Number.isSafeInteger(target.sourceRevision) || target.sourceRevision < 1) fail('INVALID_TARGET');
        const context = catalogFor(req);
        if (target.storeId !== context.catalog.storeId) fail('WRONG_STORE', 403);
        const chat = chatFor(context, target.chatId);
        if (target.scopeId !== chat.scopeId) fail('INVALID_TARGET');
        const client = clientFor(req, target.clientId);
        if (chat.sourceRevision !== target.sourceRevision) fail('SOURCE_REVISION_MISMATCH', 409);
        if (client.chatId !== target.chatId || client.viewToken !== target.viewToken
            || client.loadRequestId !== target.loadRequestId || client.sourceRevision !== target.sourceRevision) fail('STALE_VIEW', 409);
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
        app.post(`/api/dyl27/${name}`, async (req, res) => {
            res.set('Cache-Control', 'no-store');
            try { res.json(await handler(req)); }
            catch (error) { res.status(error.status ?? 500).json({ error: error.status ? error.code : 'IO_FAILED' }); }
        });
    }
    route('catalog', req => {
        const { catalog } = catalogFor(req);
        return { storeId: catalog.storeId, chats: catalog.chats.map(({ relativePath, scopeId, chatId, deleted }) => ({ relativePath, scopeId, chatId, deleted })) };
    });
    route('client', req => {
        req.session.dyl27Session ??= randomUUID();
        const clientId = randomUUID();
        clients.set(clientId, { user: req.user.profile.handle, session: req.session.dyl27Session,
            chatId: null, viewToken: null, loadRequestId: null, sourceRevision: null, sequence: 0 });
        return { clientId };
    });
    // A null intent revokes. Locators alone may no longer grant visual authority.
    route('activate', req => {
        if (!exact(req.body, ['clientId', 'sequence', 'locator']) || !Number.isSafeInteger(req.body.sequence)
            || req.body.sequence < 1) fail('INVALID_INPUT');
        const client = clientFor(req, req.body.clientId);
        if (req.body.sequence <= client.sequence) fail('STALE_ACTIVATION', 409);
        client.sequence = req.body.sequence;
        supersedeLoads(req.body.clientId);
        clearClient(client);
        if (req.body.locator === null) return { inactive: true };
        fail('LOAD_REQUIRED', 409);
    });
    createLoadEnvelopeForRequest = (req, file, messages, sourceText, clientId, sequence) => {
        if (!uuid(clientId) || !Number.isSafeInteger(sequence) || sequence < 1 || !Array.isArray(messages)
            || typeof sourceText !== 'string') fail('INVALID_INPUT');
        pruneLoadRequests();
        const client = clientFor(req, clientId);
        if (sequence <= client.sequence) fail('STALE_LOAD', 409);
        client.sequence = sequence;
        supersedeLoads(clientId);
        clearClient(client);

        const loadRequestId = randomUUID();
        const envelope = { dyl28Envelope: true, loadRequestId, identity: null, sourceRevision: null, messages };
        try {
            if (!file) throw Object.assign(new Error('MISSING_CHAT'), { code: 'MISSING_CHAT' });
            const context = catalogFor(req);
            const absolute = path.resolve(file);
            if (!absolute.startsWith(`${context.userRoot}${path.sep}`)) fail('INVALID_TARGET');
            const relativePath = path.relative(context.userRoot, absolute);
            const chat = context.catalog.chats.find(item => !item.deleted && item.relativePath === relativePath);
            if (!chat) fail('UNRESOLVED_IDENTITY', 409);
            chatFor(context, chat.chatId);
            if (hash(sourceText) !== chat.seal.sha256) fail('SOURCE_SNAPSHOT_MISMATCH', 409);
            const identity = { storeId: context.catalog.storeId, scopeId: chat.scopeId, chatId: chat.chatId };
            loadRequests.set(loadRequestId, { loadRequestId, clientId, session: req.session.dyl27Session,
                user: req.user.profile.handle, sequence, relativePath, identity, sourceRevision: chat.sourceRevision,
                sourceSha256: chat.seal.sha256, expiresAt: Date.now() + 30000, consumed: false, superseded: false });
            client.loadRequestId = loadRequestId;
            envelope.identity = identity;
            envelope.sourceRevision = chat.sourceRevision;
        } catch (error) {
            envelope.unavailableReason = error.code ?? 'IDENTITY_UNAVAILABLE';
        }
        return envelope;
    };
    route('accept-load', req => {
        if (!exact(req.body, ['clientId', 'sequence', 'loadRequestId']) || !uuid(req.body.loadRequestId)
            || !Number.isSafeInteger(req.body.sequence) || req.body.sequence < 1) fail('INVALID_INPUT');
        pruneLoadRequests();
        const client = clientFor(req, req.body.clientId);
        const load = loadRequests.get(req.body.loadRequestId);
        if (!load || load.expiresAt < Date.now()) fail('EXPIRED_LOAD', 409);
        if (load.superseded) fail('STALE_LOAD', 409);
        if (load.consumed || load.clientId !== req.body.clientId || load.session !== req.session.dyl27Session
            || load.user !== req.user.profile.handle || load.sequence !== req.body.sequence
            || client.sequence !== req.body.sequence || client.loadRequestId !== load.loadRequestId) fail('STALE_LOAD', 409);
        if (!load.identity) fail('UNRESOLVED_IDENTITY', 409);
        const context = catalogFor(req);
        const chat = chatFor(context, load.identity.chatId);
        if (chat.relativePath !== load.relativePath) fail('STALE_LOAD', 409);
        if (chat.sourceRevision !== load.sourceRevision || chat.seal.sha256 !== load.sourceSha256) fail('SOURCE_REVISION_MISMATCH', 409);
        load.consumed = true;
        client.chatId = chat.chatId;
        client.sourceRevision = chat.sourceRevision;
        client.viewToken = randomUUID();
        return { ...load.identity, clientId: req.body.clientId, loadRequestId: load.loadRequestId,
            sourceRevision: load.sourceRevision, viewToken: client.viewToken };
    });
    route('target', req => {
        if (!exact(req.body, ['clientId'])) fail('INVALID_INPUT');
        const client = clientFor(req, req.body.clientId);
        if (!client.chatId) fail('INACTIVE_TARGET', 409);
        const context = catalogFor(req);
        const chat = chatFor(context, client.chatId);
        if (chat.sourceRevision !== client.sourceRevision) fail('SOURCE_REVISION_MISMATCH', 409);
        return { storeId: context.catalog.storeId, scopeId: chat.scopeId, chatId: chat.chatId,
            clientId: req.body.clientId, viewToken: client.viewToken,
            loadRequestId: client.loadRequestId, sourceRevision: client.sourceRevision };
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
