// Disposable browser hook paired with the DYL-27 identity registry and DYL-28 load envelopes.
let epoch = 0;
let clientPromise;
let target = null;
const history = [];

async function api(name, body, headers, timeout = 5000) {
    let response;
    try {
        response = await fetch(`/api/dyl27/${name}`, {
            method: 'POST', signal: AbortSignal.timeout(timeout), headers: headers(), body: JSON.stringify(body),
        });
    } catch (error) {
        throw error; // transport failure (network, abort, timeout); keep it distinct from a server refusal
    }
    let value;
    try {
        value = await response.json();
    } catch (error) {
        throw error; // an unreadable body is a transport failure too
    }
    if (!response.ok) {
        const refusal = new Error(value.error);
        refusal.server = true; // the host answered; this is a refusal, not a transport failure
        throw refusal;
    }
    return value;
}

function client(headers) {
    clientPromise ??= api('client', {}, headers);
    return clientPromise;
}

export async function beginVisit(headers) {
    const current = ++epoch;
    target = null;
    try {
        const { clientId } = await client(headers);
        if (current !== epoch) return current;
        await api('activate', { clientId, sequence: current * 2, locator: null }, headers);
    } catch (error) {
        history.push({ epoch: current, inactiveFailure: error.message });
    }
    return current;
}

export async function beginLoad(headers) {
    const current = ++epoch;
    target = null;
    try {
        const { clientId } = await client(headers);
        if (current !== epoch) return { epoch: current, clientId, sequence: current * 2 + 1, ready: false };
        await api('activate', { clientId, sequence: current * 2, locator: null }, headers);
        if (current !== epoch) return { epoch: current, clientId, sequence: current * 2 + 1, ready: false };
        return { epoch: current, clientId, sequence: current * 2 + 1, ready: true };
    } catch (error) {
        history.push({ epoch: current, loadStartFailure: error.message });
        return { epoch: current, sequence: current * 2 + 1, ready: false };
    }
}

export function isCurrentLoad(current) {
    return current === epoch;
}

// Returns exactly one of three shapes:
//   { target, error: null }                  accepted; the snapshot may be committed
//   { target: null, error, refusal: true }   the host refused this activation; the snapshot must not be committed
//   { target: null, error, transport: true } transport failure or unresolved identity; native text must still load
export async function acceptLoad(load, envelope, headers) {
    if (!isCurrentLoad(load.epoch)) return { target: null, error: 'SUPERSEDED_LOAD', refusal: true };
    if (!load.ready || envelope?.dyl28Envelope !== true) return { target: null, error: 'LOAD_NOT_READY', transport: true };
    if (!envelope.identity || !Number.isSafeInteger(envelope.sourceRevision) || !envelope.loadRequestId) {
        const error = envelope.unavailableReason ?? 'UNRESOLVED_IDENTITY';
        history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, refused: error });
        // A missing chat is an ordinary empty native load; an identity-claiming envelope lacking identity details is a refusal.
        return envelope.identity ? { target: null, error, refusal: true } : { target: null, error, transport: true };
    }
    try {
        // 60s ceiling so the expiry probe can hold the acknowledgement past the 30s ticket TTL before failing it.
        const accepted = await api('accept-load', {
            clientId: load.clientId, sequence: load.sequence, loadRequestId: envelope.loadRequestId,
        }, headers, 60000);
        if (!isCurrentLoad(load.epoch)) {
            history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, discarded: true });
            return { target: null, error: 'SUPERSEDED_LOAD', refusal: true };
        }
        if (accepted.loadRequestId !== envelope.loadRequestId
            || accepted.sourceRevision !== envelope.sourceRevision
            || accepted.chatId !== envelope.identity.chatId
            || accepted.scopeId !== envelope.identity.scopeId
            || accepted.storeId !== envelope.identity.storeId) {
            history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, refused: 'ENVELOPE_MISMATCH' });
            return { target: null, error: 'ENVELOPE_MISMATCH', refusal: true };
        }
        target = accepted;
        history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, target: accepted });
        return { target: accepted, error: null };
    } catch (error) {
        // A host answer (409 EXPIRED_LOAD/STALE_LOAD, 403 INVALID_CLIENT, ...) is a refusal; a fetch that
        // never reached the host is a transport failure and must not block ordinary native text loading.
        history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId,
            ...(error.server ? { refused: error.message } : { transportFailure: error.message }) });
        return error.server
            ? { target: null, error: error.message, refusal: true }
            : { target: null, error: error.message, transport: true };
    }
}

window.dyl28 = {
    get target() { return target; },
    get epoch() { return epoch; },
    get history() { return history; },
};
