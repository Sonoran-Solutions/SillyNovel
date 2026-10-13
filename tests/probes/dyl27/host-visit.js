// Disposable host instrumentation; never loaded by the SillyNovel extension.
let sequence = 0, client, target = null;
const history = [];
async function api(name, body, headers) {
    const response = await fetch(`/api/dyl27/${name}`, { method: 'POST', signal: AbortSignal.timeout(5000), headers: headers(), body: JSON.stringify(body) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    return value;
}
export async function beginVisit(headers) {
    const epoch = ++sequence;
    target = null;
    try {
        client ??= api('client', {}, headers);
        const { clientId } = await client;
        if (epoch !== sequence) return epoch;
        await api('activate', { clientId, sequence: epoch * 2, locator: null }, headers);
    } catch (error) { history.push({ epoch, error: error.message }); }
    return epoch;
}
export async function finishVisit(epoch, locator, headers) {
    if (epoch !== sequence) return;
    try {
        const { clientId } = await client;
        const result = await api('activate', { clientId, sequence: epoch * 2 + 1, locator }, headers);
        if (epoch !== sequence) { history.push({ epoch, discarded: true }); return; }
        target = result; history.push({ epoch, locator, target });
    } catch (error) { history.push({ epoch, error: error.message }); }
}
// Read-only observation for test driver. No setter/enrollment shortcut.
window.dyl27 = { get target() { return target; }, get epoch() { return sequence; }, history };
