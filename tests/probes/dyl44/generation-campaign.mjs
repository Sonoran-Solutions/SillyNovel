import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function run(h) {
    let first = h.first;
    const owner = 'default-user', root = h.userRoot(owner), ns = path.join(root, 'sillynovel-dyl27');
    const stateFile = path.join(root, 'sillynovel-dyl44-reservation.json');
    const registryFile = path.join(ns, 'identities.json');
    const bytes = f => fs.readFileSync(f, 'utf8');
    const state = () => JSON.parse(bytes(stateFile));
    const cp = (name, details = {}, classification = 'EXPERIMENTAL_HOST') => h.checkpoint(`DYL-44 ${name}`, classification,
        { ...details, reservationBytes: bytes(stateFile), reservationSha256: h.hash(bytes(stateFile)) });
    async function load(x, accept = true, client = first) {
        const clientId = (await client.api('client')).clientId;
        const envelope = await client.request('/api/chats/get', { avatar_url: x.avatar, file_name: x.chatName,
            dyl28ClientId: clientId, dyl28Sequence: 1 });
        const request = { clientId, sequence: 1, loadRequestId: envelope.loadRequestId };
        return { envelope, request, target: envelope.identity && accept ? await client.api('accept-load', request) : null };
    }
    async function fixture(label) {
        const name = `${label}-${h.runId}`;
        const avatar = await first.request('/api/characters/create', { ch_name: name, first_mes: 'Synthetic fixture.' });
        const chatName = 'Same transcript';
        const messages = h.chatMessages('Original generated transcript.');
        await first.request('/api/chats/save', { avatar_url: avatar, file_name: chatName, chat: messages });
        const entry = h.registry(owner).chats.find(c => !c.deleted && c.relativePath === `chats/${avatar.replace('.png', '')}/${chatName}.jsonl`);
        assert.ok(entry);
        const x = { name, avatar, chatName, messages, entry, file: path.join(root, entry.relativePath) };
        x.active = await load(x); x.ticket = await load(x, false); x.canonical = bytes(x.file);
        const saved = await first.api('cas', { target: x.active.target, expectedRevision: 0, record: { background: 'forest' } });
        assert.equal(saved.revision, 1);
        x.visualFile = h.visualFile(owner, entry.chatId); x.visual = bytes(x.visualFile);
        return x;
    }
    async function stale(x, status = 400, code = 'INVALID_TARGET') {
        const cas = await first.api('cas', { target: x.active.target, expectedRevision: 1, record: { background: 'tavern' } }, status);
        assert.equal(cas.error, code);
        assert.equal(bytes(x.visualFile), x.visual);
        return cas;
    }
    async function arm(point) {
        const file = path.join(ns, `dyl44-barrier-${point}`);
        const entered = `${file}.entered`;
        if (fs.existsSync(entered)) fs.unlinkSync(entered);
        fs.writeFileSync(file, h.runId, { flag: 'wx' });
        return { async wait() {
            const until = Date.now() + 8000;
            while (!fs.existsSync(entered)) { assert.ok(Date.now() < until, `barrier ${point} not entered`); await new Promise(r => setTimeout(r, 10)); }
            return bytes(entered);
        }, release() { fs.unlinkSync(file); }, file };
    }
    async function restart() {
        await h.stopHost(); await h.startHost(); first = h.session(); await first.login(owner);
    }
    async function cardImport(x, expected = 200) {
        const data = new FormData();
        data.set('avatar', new Blob([JSON.stringify({ name: x.name, first_mes: 'Imported synthetic fixture.' })], { type: 'application/json' }), 'synthetic.json');
        data.set('file_type', 'json'); data.set('preserved_name', x.avatar);
        return first.request('/api/characters/import', data, expected);
    }
    async function save(x, expected = 200) { return first.request('/api/chats/save', { avatar_url: x.avatar, file_name: x.chatName, chat: x.messages }, expected); }
    const a = await fixture('Identical');
    await save(a);
    const after = h.registry(owner).chats.find(c => c.chatId === a.entry.chatId);
    assert.equal(bytes(a.file), a.canonical); assert.equal(after.incarnation, a.entry.incarnation);
    assert.equal(after.writeGeneration, a.entry.writeGeneration + 1); assert.equal(after.sourceRevision, a.entry.sourceRevision);
    await stale(a, 409, 'WRITE_GENERATION_MISMATCH');
    assert.equal((await first.api('accept-load', a.ticket.request, 409)).error, 'WRITE_GENERATION_MISMATCH');
    const fresh = await load(a); assert.equal(fresh.target.chatId, a.entry.chatId);
    cp('byte-identical native save advances write generation, preserves incarnation/content revision, refuses old load and CAS', { before: a, after, fresh });

    // A→B→A through the same host client; lifecycle transition occurs between A visits.
    const b = await fixture('VisitB');
    const clientId = fresh.target.clientId;
    await first.api('activate', { clientId, sequence: 2, locator: null });
    const loadB = await first.request('/api/chats/get', { avatar_url: b.avatar, file_name: b.chatName, dyl28ClientId: clientId, dyl28Sequence: 3 });
    await first.api('accept-load', { clientId, sequence: 3, loadRequestId: loadB.loadRequestId });
    await save(a);
    const loadA = await first.request('/api/chats/get', { avatar_url: a.avatar, file_name: a.chatName, dyl28ClientId: clientId, dyl28Sequence: 4 });
    const returnA = await first.api('accept-load', { clientId, sequence: 4, loadRequestId: loadA.loadRequestId });
    assert.notEqual(returnA.viewToken, fresh.target.viewToken);
    await first.api('read', { target: fresh.target }, 409);
    cp('A→B→A generation transition issues a fresh visit and rejects former A', { fresh, returnA });

    const held = await fixture('HeldCAS');
    await first.api('barrier', { clientId: held.active.target.clientId, action: 'arm' });
    const pendingCAS = first.api('cas', { target: held.active.target, expectedRevision: 1, record: { background: 'tavern' } }, 409);
    while (!(await first.api('barrier', { clientId: held.active.target.clientId, action: 'status' })).entered) await new Promise(r => setTimeout(r, 10));
    await save(held);
    await first.api('barrier', { clientId: held.active.target.clientId, action: 'release' });
    assert.equal((await pendingCAS).error, 'WRITE_GENERATION_MISMATCH'); assert.equal(bytes(held.visualFile), held.visual);
    cp('held authoritative CAS refuses identical bytes after participating write', { held });

    const replace = await fixture('ChatRecreate');
    await first.api('barrier', { clientId: replace.active.target.clientId, action: 'arm' });
    const oldCAS = first.api('cas', { target: replace.active.target, expectedRevision: 1, record: { background: 'tavern' } }, 400);
    while (!(await first.api('barrier', { clientId: replace.active.target.clientId, action: 'status' })).entered) await new Promise(r => setTimeout(r, 10));
    await first.request('/api/chats/delete', { avatar_url: replace.avatar, chatfile: `${replace.chatName}.jsonl` });
    await save(replace);
    const replaced = await load(replace);
    assert.equal(bytes(replace.file), replace.canonical);
    assert.notEqual(replaced.target.chatId, replace.entry.chatId);
    const replacementEntry = h.registry(owner).chats.find(c => c.chatId === replaced.target.chatId);
    assert.notEqual(replacementEntry.incarnation, replace.entry.incarnation);
    await first.api('barrier', { clientId: replace.active.target.clientId, action: 'release' });
    assert.equal((await oldCAS).error, 'INVALID_TARGET');
    assert.equal((await first.api('accept-load', replace.ticket.request, 400)).error, 'INVALID_TARGET');
    assert.equal(bytes(replace.visualFile), replace.visual);
    cp('native chat delete/recreate identical bytes allocates distinct incarnation and rejects held old CAS/load', { replace, replaced, replacementEntry });

    const left = await fixture('ClaimLeft'), right = await fixture('ClaimRight');
    const destination = `ClaimDestination-${h.runId}`;
    const gate = await arm('rename-read');
    const winning = first.request('/api/characters/rename', { avatar_url: left.avatar, new_name: destination });
    const operationId = await gate.wait(), pending = bytes(stateFile);
    const losing = await first.request('/api/characters/rename', { avatar_url: right.avatar, new_name: destination }, 409);
    assert.equal(losing.error, 'RESERVATION_BUSY'); assert.equal(bytes(right.file), right.canonical);
    assert.equal(bytes(stateFile), pending); assert.equal(state().pending.operationId, operationId);
    assert.equal((await first.api('read', { target: right.active.target }, 409)).error, 'IDENTITY_UNAVAILABLE');
    assert.equal((await load(left)).envelope.identity, null);
    gate.release(); const winner = await winning;
    assert.equal(winner.avatar, `${destination}.png`); await stale(left);
    await first.api('read', { target: right.active.target });
    cp('two native renames claim one destination; loser changes no canonical bytes or reservation', { left, right, operationId, pending, losing, winner });

    for (const importFirst of [false, true]) {
        const x = await fixture(`RenameImport-${importFirst}`), destination = { name: `ImportDestination-${importFirst}-${h.runId}` };
        destination.avatar = `${destination.name}.png`;
        const barrier = await arm(importFirst ? 'card-write' : 'rename-read');
        const winnerPromise = importFirst ? cardImport(destination) : first.request('/api/characters/rename', { avatar_url: x.avatar, new_name: destination.name });
        await barrier.wait(); const pending = bytes(stateFile);
        const loser = importFirst ? await first.request('/api/characters/rename', { avatar_url: x.avatar, new_name: destination.name }, 409) : await cardImport(destination, 409);
        assert.equal(loser.error, 'RESERVATION_BUSY'); assert.equal(bytes(x.file), x.canonical); assert.equal(bytes(stateFile), pending);
        barrier.release(); const winner = await winnerPromise; await stale(x);
        cp(`native rename/import overlap ${importFirst ? 'import' : 'rename'} wins reservation`, { x, pending, loser, winner });
    }
    const del = await fixture('DeleteRecreate');
    const barrier = await arm('delete-cleanup');
    const deleting = first.request('/api/characters/delete', { avatar_url: del.avatar, delete_chats: true });
    await barrier.wait(); const pendingDelete = bytes(stateFile);
    assert.equal(fs.existsSync(path.join(root, 'characters', del.avatar)), false);
    const recreate = await first.request('/api/characters/create', { ch_name: del.name }, 409);
    assert.equal(recreate.error, 'RESERVATION_BUSY'); assert.equal(bytes(del.file), del.canonical);
    barrier.release(); await deleting;
    assert.equal(await first.request('/api/characters/create', { ch_name: del.name }), del.avatar);
    await save(del); assert.equal(bytes(del.file), del.canonical); await stale(del);
    // Conservative refusal is intentional; new scope enrollment is not automatic repair.
    assert.equal((await load(del)).envelope.identity, null);
    await restart(); assert.equal((await load(del)).envelope.identity, null); await stale(del);
    cp('delete/cleanup blocks recreation until completion; identical recreated transcript remains refused after restart', { del, pendingDelete, recreate });

    const maid = await fixture('Cleanup'); fs.unlinkSync(path.join(root, 'characters', maid.avatar));
    const report = await first.request('/api/data-maid/report', {});
    const row = report.report.chats.find(r => r.parent === maid.name && r.name === `${maid.chatName}.jsonl`); assert.ok(row);
    const maidGate = await arm('maid-unlink');
    const cleaning = first.request('/api/data-maid/delete', { token: report.token, hashes: [row.hash] }, 204);
    await maidGate.wait(); const pendingCleanup = bytes(stateFile);
    assert.equal((await save(maid, 409)).error, 'RESERVATION_BUSY');
    maidGate.release(); await cleaning; assert.equal(fs.existsSync(maid.file), false);
    await save(maid); assert.equal(bytes(maid.file), maid.canonical); await stale(maid);
    assert.equal((await load(maid)).envelope.identity, null);
    cp('native Data Maid cleanup overlaps native save at former path without resurrecting authority', { maid, pendingCleanup }, 'SYNTHETIC orphan setup + EXPERIMENTAL_HOST');

    const f1 = await fixture('F1'); const registry = bytes(registryFile), canonical = bytes(f1.file), reservationBefore = bytes(stateFile);
    const fault = path.join(ns, 'dyl44-reserve-failure'); fs.writeFileSync(fault, h.runId);
    const refused = await save(f1, 503); fs.unlinkSync(fault);
    assert.equal(refused.error, 'RESERVATION_PERSIST_FAILED'); assert.equal(bytes(f1.file), canonical); assert.equal(bytes(registryFile), registry); assert.equal(bytes(stateFile), reservationBefore);
    await first.api('read', { target: f1.active.target });
    cp('F1 reservation persistence failure prevents all canonical mutation', { refused, reservationBefore }, 'SYNTHETIC fault + EXPERIMENTAL_HOST');
    // Real permission failure in the reservation parent, separate from injected failure.
    fs.chmodSync(root, 0o500); let permission;
    try { permission = await save(f1, 503); } finally { fs.chmodSync(root, 0o700); }
    assert.equal(bytes(f1.file), canonical); assert.equal(bytes(stateFile), reservationBefore);
    cp('F1 real EACCES on reservation directory prevents canonical write', { permission });

    const f2 = await fixture('F2'); const f2flag = path.join(ns, 'dyl43-after-revoke'); fs.writeFileSync(f2flag, h.runId);
    await first.request('/api/characters/rename', { avatar_url: f2.avatar, new_name: `F2Dest-${h.runId}` }, 500); fs.unlinkSync(f2flag);
    assert.equal(bytes(f2.file), f2.canonical); await stale(f2); await restart(); await stale(f2);
    cp('F2 committed reservation then native failure retains durable scope revocation', { f2 }, 'SYNTHETIC fault + EXPERIMENTAL_HOST');
    const f5 = await fixture('F5'), f5flag = path.join(ns, 'dyl43-partial-rename'), f5dest = `Partial-${h.runId}`;
    fs.writeFileSync(f5flag, h.runId);
    await first.request('/api/characters/rename', { avatar_url: f5.avatar, new_name: f5dest }, 500); fs.unlinkSync(f5flag);
    assert.ok(fs.existsSync(path.join(root, 'characters', f5.avatar))); assert.ok(fs.existsSync(path.join(root, 'characters', `${f5dest}.png`)));
    await stale(f5); cp('F5 partial native multi-file rename exposes no committed visual identity', { f5 }, 'SYNTHETIC fault + EXPERIMENTAL_HOST');

    const unknown = await fixture('Unknown'); fs.appendFileSync(unknown.file, '\n'); fs.writeFileSync(unknown.file, unknown.canonical);
    await first.api('read', { target: unknown.active.target });
    const copy = path.join(ns, 'dyl44-identical-copy'); fs.writeFileSync(copy, unknown.canonical);
    fs.copyFileSync(copy, unknown.file); fs.unlinkSync(copy);
    await first.api('read', { target: unknown.active.target });
    cp('OUTSIDE CONTRACT negative control: unknown in-place restoration and identical copy still accept old authority', { unknown, safetyVerdict: 'NOT_PROVEN', limitation: 'Unknown writers bypass every reservation and generation hook.' }, 'SYNTHETIC + EXPERIMENTAL_HOST');

    const other = h.session(); await other.login(h.otherHandle);
    assert.equal((await other.api('read', { target: unknown.active.target }, 403)).error, 'WRONG_STORE');
    cp('wrong authenticated store refuses generation-bound target', { target: unknown.active.target });

    // Failure-only fixture restoration below is test setup, never recovery offered by the host.
    for (const corrupt of [false, true]) {
        const saved = bytes(stateFile);
        if (corrupt) fs.writeFileSync(stateFile, '{broken'); else fs.unlinkSync(stateFile);
        await restart(); const native = await load(unknown);
        assert.equal(native.envelope.identity, null); assert.ok(native.envelope.messages.length);
        const rejected = await first.api('read', { target: unknown.active.target }, 409);
        assert.equal(rejected.error, 'IDENTITY_UNAVAILABLE');
        const rawFault = fs.existsSync(stateFile) ? bytes(stateFile) : null;
        fs.writeFileSync(stateFile, saved); // Restore only our injected test fault, not a recovery claim.
        cp(`F4 ${corrupt ? 'corrupt' : 'missing'} reservation state refuses after restart while native text loads`, { rawFault, native, rejected }, 'SYNTHETIC fault + EXPERIMENTAL_HOST');
    }
    const restore = await fixture('RootRestore');
    const backupRoot = path.join(path.dirname(root), `dyl44-root-backup-${h.runId}`);
    assert.equal(fs.existsSync(backupRoot), false);
    fs.cpSync(root, backupRoot, { recursive: true });
    const beforeRestore = bytes(stateFile);
    await save(restore);
    const advanced = h.registry(owner).chats.find(c => c.chatId === restore.entry.chatId);
    assert.ok(advanced.writeGeneration > restore.entry.writeGeneration);
    await h.stopHost();
    // Both roots belong to this harness UUID; whole-root replacement is synthetic, not a native restore API.
    assert.equal(path.basename(path.dirname(root)), `sillynovel-dyl27-${h.runId}`);
    fs.rmSync(root, { recursive: true }); fs.cpSync(backupRoot, root, { recursive: true });
    fs.rmSync(backupRoot, { recursive: true });
    await h.startHost(); first = h.session(); await first.login(owner);
    const restored = await load(restore), restoredEntry = h.registry(owner).chats.find(c => c.chatId === restore.entry.chatId);
    assert.equal(bytes(stateFile), beforeRestore);
    assert.equal(restoredEntry.writeGeneration, restore.entry.writeGeneration);
    assert.equal(restored.target.chatId, restore.entry.chatId);
    assert.equal((await first.api('read', { target: restored.target })).revision, 1);
    cp('BLOCKED whole-root restore rolls back local generations and restores durable visual identity under a new visit', {
        restore, advanced, restoredEntry, restored, beforeRestore, safetyVerdict: 'NOT_PROVEN',
        limitation: 'A separately trusted host incarnation or mandatory explicit re-enrollment is required; ordinary restart does not prove restore safety.',
    }, 'SYNTHETIC restore + EXPERIMENTAL_HOST');

    const interrupted = await fixture('InterruptedReservation');
    const cleanReservation = bytes(stateFile);
    const crashBarrier = await arm('rename-read');
    // Stop the owned process with native rename awaiting its barrier. Observe the transport rejection.
    const interruptedRequest = first.request('/api/characters/rename', { avatar_url: interrupted.avatar, new_name: `Interrupted-${h.runId}` })
        .then(() => ({ resolved: true }), error => ({ transportError: error.message }));
    await crashBarrier.wait(); const pendingBeforeStop = bytes(stateFile);
    await restart(); const transport = await interruptedRequest;
    assert.ok(transport.transportError); assert.equal(bytes(stateFile), pendingBeforeStop);
    assert.equal(bytes(interrupted.file), interrupted.canonical);
    await stale(interrupted, 409, 'IDENTITY_UNAVAILABLE');
    assert.equal((await save(interrupted, 503)).error, 'UNRESOLVED_RESERVATION');
    cp('process stop while native rename awaits leaves unresolved reservation; restart cannot reopen writers', {
        interrupted, pendingBeforeStop, transport,
    }, 'SYNTHETIC process stop + EXPERIMENTAL_HOST');
    // Isolate the next failure injection only. No endpoint implements this manual test reset.
    fs.writeFileSync(stateFile, cleanReservation); crashBarrier.release();

    const f3 = await fixture('F3'); const finalFault = path.join(ns, 'dyl44-finalize-failure'); fs.writeFileSync(finalFault, h.runId);
    await save(f3); fs.unlinkSync(finalFault); const unresolved = bytes(stateFile);
    assert.ok(state().pending); assert.equal(bytes(f3.file), f3.canonical);
    await stale(f3, 409, 'IDENTITY_UNAVAILABLE'); await restart();
    assert.equal(bytes(stateFile), unresolved); await stale(f3, 409, 'IDENTITY_UNAVAILABLE');
    assert.equal((await save(f3, 503)).error, 'UNRESOLVED_RESERVATION');
    const native = await load(f3); assert.equal(native.envelope.identity, null); assert.ok(native.envelope.messages.length);
    cp('F3 committed identical canonical write plus failed finalization remains durably unresolved across restart', { f3, unresolved, native }, 'SYNTHETIC fault + EXPERIMENTAL_HOST');

}
