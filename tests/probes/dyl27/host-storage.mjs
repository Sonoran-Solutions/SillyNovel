// DYL-27 ONLY: copied into a disposable pinned host, never imported by SillyNovel.
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
    function chatFor(context, chatId) {
        const chat = context.catalog.chats.find(item => item.chatId === chatId);
        const scope = chat && context.catalog.scopes.find(s => s.scopeId === chat.scopeId);
        if (!chat || chat.deleted || !scope || scope.disabled || !uuid(chat.chatId) || !uuid(chat.scopeId)) fail('INVALID_TARGET');
        const file = path.resolve(context.userRoot, chat.relativePath);
        if (!file.startsWith(`${context.userRoot}${path.sep}`)) fail('INVALID_TARGET');
        try {
            // Guard detects changes outside hooked native writes; UUIDs come from lifecycle allocation.
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
        clients.set(clientId, { user: req.user.profile.handle, session: req.session.dyl27Session, chatId: null, viewToken: null, sequence: 0 });
        return { clientId };
    });
    // Ordered intent is shared by the native browser hook and HTTP race probe.
    route('activate', req => {
        if (!exact(req.body, ['clientId', 'sequence', 'locator']) || !Number.isSafeInteger(req.body.sequence)
            || req.body.sequence < 1) fail('INVALID_INPUT');
        const client = clientFor(req, req.body.clientId);
        if (req.body.sequence <= client.sequence) fail('STALE_ACTIVATION', 409);
        client.sequence = req.body.sequence;
        client.chatId = null; client.viewToken = null;
        if (req.body.locator === null) return { inactive: true };
        if (typeof req.body.locator !== 'string' || req.body.locator.length > 512) fail('INVALID_INPUT');
        const context = catalogFor(req);
        const chat = context.catalog.chats.find(c => !c.deleted && c.relativePath === req.body.locator);
        if (!chat) fail('UNRESOLVED_IDENTITY', 409);
        chatFor(context, chat.chatId);
        client.chatId = chat.chatId; client.viewToken = randomUUID();
        return { storeId: context.catalog.storeId, scopeId: chat.scopeId, chatId: chat.chatId,
            clientId: req.body.clientId, viewToken: client.viewToken };
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
