// Disposable browser hook paired with the DYL-27 identity registry and DYL-28 load envelopes.
let epoch = 0;
let clientPromise;
let target = null;
const history = [];

async function api(name, body, headers) {
    const response = await fetch(`/api/dyl27/${name}`, {
        method: 'POST', signal: AbortSignal.timeout(5000), headers: headers(), body: JSON.stringify(body),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
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

export async function acceptLoad(load, envelope, headers) {
    if (!isCurrentLoad(load.epoch) || !load.ready || envelope?.dyl28Envelope !== true) return null;
    if (!envelope.identity || !Number.isSafeInteger(envelope.sourceRevision) || !envelope.loadRequestId) {
        const error = envelope.unavailableReason ?? 'UNRESOLVED_IDENTITY';
        history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, refused: error });
        return { target: null, error };
    }
    try {
        const accepted = await api('accept-load', {
            clientId: load.clientId, sequence: load.sequence, loadRequestId: envelope.loadRequestId,
        }, headers);
        if (!isCurrentLoad(load.epoch)) {
            history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, discarded: true });
            return null;
        }
        if (accepted.loadRequestId !== envelope.loadRequestId
            || accepted.sourceRevision !== envelope.sourceRevision
            || accepted.chatId !== envelope.identity.chatId
            || accepted.scopeId !== envelope.identity.scopeId
            || accepted.storeId !== envelope.identity.storeId) {
            history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, refused: 'ENVELOPE_MISMATCH' });
            return null;
        }
        target = accepted;
        history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, target: accepted });
        return { target: accepted, error: null };
    } catch (error) {
        history.push({ epoch: load.epoch, loadRequestId: envelope.loadRequestId, refused: error.message });
        return { target: null, error: error.message };
    }
}

window.dyl28 = {
    get target() { return target; },
    get epoch() { return epoch; },
    get history() { return history; },
};
