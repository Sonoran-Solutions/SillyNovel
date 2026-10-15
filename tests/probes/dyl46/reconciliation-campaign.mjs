import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Synthetic faults and observations; every response comes from the owned pinned host.
export async function run(h) {
    await h.firstPage.context().close();
    let first = h.first;
    const owner = 'default-user', root = h.userRoot(owner), ns = path.join(root, 'sillynovel-dyl27');
    const localFile = path.join(root, 'sillynovel-dyl44-reservation.json');
    const registryFile = path.join(ns, 'identities.json');
    const authorityFile = path.join(h.authority, `${h.hash(path.resolve(root))}.json`);
    const witnessFile = path.join(h.authority, 'validation', path.basename(authorityFile));
    const bytes = file => fs.readFileSync(file, 'utf8');
    const external = () => JSON.parse(bytes(authorityFile));
    const local = () => JSON.parse(bytes(localFile));
    const capture = () => [authorityFile, localFile, registryFile, witnessFile].map(file => [file, bytes(file)]);
    // Restore only deliberate fixture faults BETWEEN independent cases, never as host recovery.
    const reset = saved => { for (const [file, value] of saved) fs.writeFileSync(file, value); };
    const cp = (name, details = {}, classification = 'EXPERIMENTAL_HOST') => h.checkpoint(`DYL-46 ${name}`, classification,
        { ...details, authority: bytes(authorityFile), reservation: bytes(localFile), registry: bytes(registryFile), witness: bytes(witnessFile),
            witnessSha256: h.hash(bytes(witnessFile)), authoritySha256: h.hash(bytes(authorityFile)), reservationSha256: h.hash(bytes(localFile)), registrySha256: h.hash(bytes(registryFile)) });
    async function load(x, accept = true, client = first) {
        const clientId = (await client.api('client')).clientId;
        const envelope = await client.request('/api/chats/get', { avatar_url: x.avatar, file_name: x.chatName,
            dyl28ClientId: clientId, dyl28Sequence: 1 });
        const request = { clientId, sequence: 1, loadRequestId: envelope.loadRequestId };
        return { envelope, request, target: envelope.identity && accept ? await client.api('accept-load', request) : null };
    }
    async function fixture(label, forged = false) {
        const name = `${label}-${h.runId}`;
        const avatar = await first.request('/api/characters/create', { ch_name: name, first_mes: 'Synthetic fixture.' });
        const chatName = 'Same transcript', messages = h.chatMessages('Original generated transcript.');
        if (forged) messages[0].chat_metadata.sillynovel = h.registry(owner).chats[0];
        await first.request('/api/chats/save', { avatar_url: avatar, file_name: chatName, chat: messages });
        const entry = h.registry(owner).chats.find(c => !c.deleted && c.relativePath === `chats/${avatar.slice(0, -4)}/${chatName}.jsonl`);
        assert.ok(entry);
        const x = { name, avatar, chatName, messages, entry, file: path.join(root, entry.relativePath) };
        x.active = await load(x); x.ticket = await load(x, false); x.canonical = bytes(x.file);
        await first.api('cas', { target: x.active.target, expectedRevision: 0, record: { background: 'forest' } });
        x.visualFile = h.visualFile(owner, entry.chatId); x.visual = bytes(x.visualFile);
        return x;
    }
    async function restart() { await h.stopHost(); await h.startHost(); first = h.session(); await first.login(owner); }
    const save = (x, status = 200) => first.request('/api/chats/save', { avatar_url: x.avatar, file_name: x.chatName, chat: x.messages }, status);
    const oldCas = (x, status) => first.api('cas', { target: x.active.target, expectedRevision: 1, record: { background: 'tavern' } }, status);
    async function refused(x) {
        const loaded = await load(x); assert.equal(loaded.envelope.identity, null); assert.ok(loaded.envelope.messages.length);
        const read = await first.api('read', { target: x.active.target }, 409);
        const cas = await oldCas(x, 409); assert.equal(read.error, 'IDENTITY_UNAVAILABLE'); assert.equal(cas.error, 'IDENTITY_UNAVAILABLE');
        assert.equal(bytes(x.visualFile), x.visual); return { loaded, read, cas };
    }
    function flag(name) { const file = path.join(ns, name); fs.writeFileSync(file, h.runId, { flag: 'wx' }); return () => fs.unlinkSync(file); }
    function arm(point) {
        const file = path.join(ns, `dyl44-barrier-${point}`), entered = `${file}.entered`;
        if (fs.existsSync(entered)) fs.unlinkSync(entered);
        fs.writeFileSync(file, h.runId, { flag: 'wx' });
        return { async wait() {
            const deadline = Date.now() + 8000;
            while (!fs.existsSync(entered)) { assert.ok(Date.now() < deadline, point); await new Promise(r => setTimeout(r, 10)); }
        }, release() { fs.unlinkSync(file); } };
    }
    async function malformed(x, client = first, status = 200, content = '{}') {
        const form = new FormData(); form.set('file_type', 'jsonl'); form.set('avatar_url', x.avatar);
        form.set('character_name', 'Synthetic'); form.set('user_name', 'Synthetic');
        form.set('avatar', new Blob([content]), 'malformed.jsonl');
        return client.request('/api/chats/import', form, status);
    }
    async function revoke(x) {
        await first.request('/api/characters/delete', { avatar_url: x.avatar, delete_chats: false });
        assert.equal(await first.request('/api/characters/create', { ch_name: x.name, first_mes: 'Synthetic fixture.' }), x.avatar);
        assert.equal(bytes(x.file), x.canonical);
    }

    const healthy = await fixture('Healthy');
    for (const operation of ['rename', 'delete']) {
        const x = await fixture(`Clean-${operation}`), before = capture();
        const card = path.join(root, 'characters', x.avatar), cardBytes = fs.readFileSync(card);
        fs.chmodSync(ns, 0o500); let response;
        try { response = await first.request(`/api/characters/${operation}`, { avatar_url: x.avatar,
            new_name: `Denied-${h.runId}`, delete_chats: true }, operation === 'rename' ? 500 : 503); }
        finally { fs.chmodSync(ns, 0o700); }
        assert.equal(external().outcome, 'VERIFIED_CLEAN_ABORT'); assert.equal(external().generation, JSON.parse(before[0][1]).generation + 1);
        assert.equal(external().pending, null); assert.equal(local().serial, external().generation);
        assert.equal(bytes(registryFile), before[2][1]); assert.equal(bytes(x.file), x.canonical);
        assert.deepEqual(fs.readFileSync(card), cardBytes);
        await first.api('read', { target: healthy.active.target }); await first.api('read', { target: x.active.target });
        assert.equal(bytes(x.visualFile), x.visual);
        cp(`EACCES ${operation}: verified pre-native guard failure reconciles forward`, { x, before, after: capture(), response,
            cardBase64: cardBytes.toString('base64'), cardSha256: h.hash(cardBytes) });
    }
    for (const operation of ['rename', 'delete', 'import']) {
        const x = await fixture(`CommittedRevocation-${operation}`);
        const untouched = operation === 'import' ? null : await fixture(`UnaffectedRevocation-${operation}`);
        const before = capture();
        const card = path.join(root, 'characters', x.avatar), originalCard = fs.readFileSync(card);
        const undo = flag('dyl43-after-revoke'); let response;
        try {
            if (operation === 'import') {
                const form = new FormData(); form.set('file_type', 'json'); form.set('preserved_name', x.avatar);
                form.set('avatar', new Blob([JSON.stringify({ name: x.name, first_mes: 'Synthetic replacement.' })]), 'card.json');
                response = await first.request('/api/characters/import', form, 503);
            } else response = await first.request(`/api/characters/${operation}`, { avatar_url: x.avatar,
                new_name: `Failed-${h.runId}`, delete_chats: true }, operation === 'rename' ? 500 : 503);
        } finally { undo(); }
        assert.equal(external().outcome, 'VERIFIED_REVOCATION'); assert.equal(external().pending, null);
        assert.equal(external().generation, JSON.parse(before[0][1]).generation + 1);
        assert.equal(local().serial, external().generation); assert.notEqual(bytes(registryFile), before[2][1]);
        assert.deepEqual(fs.readFileSync(card), originalCard); assert.equal(bytes(x.file), x.canonical);
        assert.equal((await oldCas(x, 400)).error, 'INVALID_TARGET');
        assert.equal((await first.api('accept-load', x.ticket.request, 400)).error, 'INVALID_TARGET');
        if (untouched) await first.api('read', { target: untouched.active.target });
        cp(`post-revocation ${operation} inspected failure finalizes VERIFIED_REVOCATION, never clean abort`, { x, before, response });
        await restart(); assert.equal((await load(x)).envelope.identity, null);
        assert.equal((await oldCas(x, 400)).error, 'INVALID_TARGET'); assert.equal(bytes(x.visualFile), x.visual);
        if (untouched) assert.ok((await load(untouched)).target);
        // Multipart import deliberately revokes all scopes. Fresh unrelated authority remains possible.
        const next = await fixture(`AfterRevocation-${operation}`); assert.ok((await load(next)).target);
        cp(`post-revocation ${operation} restart retains revocation and permits healthy native/visual work`, { x, next });
    }
    for (const point of ['reservation', 'external']) {
        const x = await fixture(`RevocationFinalize-${point}`), before = capture();
        const undoRevocation = flag('dyl43-after-revoke');
        const undoFinalize = flag(point === 'reservation' ? 'dyl44-finalize-failure' : 'dyl45-finalize-failure');
        await first.request('/api/characters/rename', { avatar_url: x.avatar, new_name: `Uncommitted-${h.runId}` }, 500);
        undoRevocation(); undoFinalize(); assert.ok(external().pending); const pending = capture();
        await restart(); const refusal = await refused(x); assert.deepEqual(capture(), pending);
        cp(`post-revocation ${point} finalization failure remains durably refused`, { x, before, pending, refusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
        reset(before);
    }
    const clean = await fixture('Malformed'); const beforeImport = capture();
    const importResponse = await malformed(clean); assert.equal(importResponse.error, true);
    assert.equal(external().outcome, 'VERIFIED_CLEAN_ABORT'); assert.equal(external().pending, null);
    assert.equal(bytes(registryFile), beforeImport[2][1]); assert.equal(bytes(clean.file), clean.canonical);
    await first.api('read', { target: clean.active.target });
    cp('malformed-header HTTP 200 error attests clean abort before import commit', { clean, beforeImport, importResponse });
    assert.equal((await malformed(clean, first, 200, '{bad json')).error, true);
    assert.equal(external().outcome, 'VERIFIED_CLEAN_ABORT');
    await save(clean); assert.ok((await load(clean)).target); await restart(); assert.ok((await load(clean)).target);
    cp('ordinary native save and restart work after malformed-header clean abort', { clean });
    const revokedBeforeAbort = await fixture('EnrollmentAfterAbort', true); await revoke(revokedBeforeAbort);
    await malformed(clean);
    const fresh = await first.api('reenroll', { avatar: revokedBeforeAbort.avatar });
    assert.notEqual(fresh.scopeId, revokedBeforeAbort.entry.scopeId); assert.ok(!fresh.chatIds.includes(revokedBeforeAbort.entry.chatId));
    const freshLoad = await load(revokedBeforeAbort); const empty = await first.api('read', { target: freshLoad.target });
    assert.equal(empty.revision, 0); assert.deepEqual(empty.record, { background: null });
    assert.equal(bytes(revokedBeforeAbort.visualFile), revokedBeforeAbort.visual);
    cp('completed revocation plus unrelated clean abort permits fresh enrollment without visual inheritance', { revokedBeforeAbort, fresh, freshLoad, empty });

    const raceEnroll = await fixture('EnrollmentDuringDrift'); await revoke(raceEnroll);
    const drift = await fixture('Drift'), unaffected = await fixture('Unaffected');
    const beforeDrift = capture(); fs.appendFileSync(drift.file, '\n');
    const gate = arm('reconcile'); const winning = first.api('read', { target: drift.active.target }, 400); await gate.wait();
    assert.ok(external().pending); assert.equal(external().generation, JSON.parse(beforeDrift[0][1]).generation + 1);
    const during = capture(), canonicalDuring = bytes(drift.file);
    const nativeLoser = await save(unaffected, 409); assert.equal(nativeLoser.error, 'RESERVATION_BUSY');
    const readLoser = await first.api('read', { target: drift.active.target }, 409); assert.equal(readLoser.error, 'IDENTITY_UNAVAILABLE');
    const enrollLoser = await first.api('reenroll', { avatar: raceEnroll.avatar }, 409); assert.equal(enrollLoser.error, 'RESERVATION_BUSY');
    assert.deepEqual(capture(), during); assert.equal(bytes(drift.file), canonicalDuring);
    fs.writeFileSync(drift.file, drift.canonical); gate.release(); assert.equal((await winning).error, 'INVALID_TARGET');
    assert.equal(external().outcome, 'VERIFIED_REVOCATION'); assert.equal(external().pending, null);
    assert.equal((await oldCas(drift, 400)).error, 'INVALID_TARGET');
    assert.equal((await first.api('accept-load', drift.ticket.request, 400)).error, 'INVALID_TARGET');
    await first.api('read', { target: unaffected.active.target }); assert.equal(bytes(drift.visualFile), drift.visual);
    cp('F5/F6 read revocation owns reservation; competing save/read/enrollment never mutates; restored bytes stay revoked',
        { drift, unaffected, beforeDrift, during, nativeLoser, readLoser, enrollLoser, canonicalDuring });
    const afterRace = await first.api('reenroll', { avatar: raceEnroll.avatar });
    assert.notEqual(afterRace.scopeId, raceEnroll.entry.scopeId); assert.ok((await load(raceEnroll)).target);
    cp('eligible enrollment loses during revocation and succeeds with fresh scope after completion', { raceEnroll, afterRace });
    await restart(); assert.equal((await load(drift)).envelope.identity, null); assert.ok((await load(unaffected)).target);
    await save(unaffected); cp('completed scoped revocation persists through restart; unrelated native and visual operations resume', { drift, unaffected });

    // Writer-first ordering cannot nest a read-triggered reservation.
    const writerFirst = await fixture('WriterFirst'), source = await fixture('WriterFirstDrift');
    const renameGate = arm('rename-read');
    const rename = first.request('/api/characters/rename', { avatar_url: writerFirst.avatar, new_name: `Moved-${h.runId}` });
    await renameGate.wait(); fs.appendFileSync(source.file, '\n'); const whileWriter = capture();
    const refusedRead = await first.api('read', { target: source.active.target }, 409);
    assert.deepEqual(capture(), whileWriter); renameGate.release(); await rename;
    assert.equal((await first.api('read', { target: source.active.target }, 400)).error, 'INVALID_TARGET');
    cp('F5 native writer first: read refuses, no nested reservation/deadlock, later observation revokes', { writerFirst, source, refusedRead });

    const deniedAuthority = await fixture('ExternalEACCES'); const beforeDenied = capture();
    fs.appendFileSync(deniedAuthority.file, '\n'); fs.chmodSync(h.authority, 0o500); let permissionFailure;
    try { permissionFailure = await first.api('read', { target: deniedAuthority.active.target }, 500); }
    finally { fs.chmodSync(h.authority, 0o700); }
    assert.deepEqual(capture().slice(0, 3), beforeDenied.slice(0, 3));
    assert.ok(JSON.parse(bytes(witnessFile)).pending); assert.equal(bytes(deniedAuthority.visualFile), deniedAuthority.visual);
    fs.writeFileSync(deniedAuthority.file, deniedAuthority.canonical);
    const deniedWitness = bytes(witnessFile); await restart(); const deniedRefusal = await refused(deniedAuthority);
    assert.equal(bytes(witnessFile), deniedWitness);
    cp('F1 real external-directory EACCES leaves durable validation refusal after restored bytes and restart', { deniedAuthority, beforeDenied, permissionFailure, deniedWitness, deniedRefusal });
    reset(beforeDenied); // Deliberate fixture reset, never an exposed recovery operation.

    const faulted = await fixture('Faults'); const cleanState = capture();
    for (const point of ['begin', 'local-begin', 'finalize']) {
        fs.appendFileSync(faulted.file, '\n'); const undo = flag(`dyl45-${point}-failure`);
        const before = capture();
        const response = await first.api('read', { target: faulted.active.target }, 503); undo();
        assert.equal(bytes(faulted.visualFile), faulted.visual);
        if (point === 'begin') {
            assert.deepEqual(capture().slice(0, 3), before.slice(0, 3)); assert.equal(bytes(registryFile), cleanState[2][1]);
            fs.writeFileSync(faulted.file, faulted.canonical); // Test reset after explicitly injected failed observation.
        } else {
            const pending = capture(); assert.ok(external().pending);
            if (point === 'local-begin') assert.equal(bytes(registryFile), cleanState[2][1]);
            else assert.ok(h.registry(owner).chats.find(c => c.chatId === faulted.entry.chatId).disabled);
            await restart(); const refusal = await refused(faulted); assert.deepEqual(capture(), pending);
            assert.equal((await first.api('reenroll', { avatar: faulted.avatar }, 503)).error, 'EXTERNAL_LOCAL_MISMATCH');
            cp(`${point === 'local-begin' ? 'F2' : 'F3'} reconciliation ${point} failure remains pending across restart`, { before, pending, response, refusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
            reset(cleanState); fs.writeFileSync(faulted.file, faulted.canonical);
        }
        if (point === 'begin') {
            const witness = bytes(witnessFile); await restart(); const refusal = await refused(faulted);
            assert.equal(bytes(witnessFile), witness); assert.ok(JSON.parse(witness).pending);
            cp('F1 external intent failure persists validation refusal despite restored bytes and restart', { before, response, witness, refusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
            reset(cleanState);
        }
    }
    fs.appendFileSync(faulted.file, '\n'); const stopGate = arm('reconcile');
    const interrupted = first.api('read', { target: faulted.active.target }).then(() => ({ unexpected: true }), e => ({ transportError: e.message }));
    await stopGate.wait(); const intent = capture(); await restart(); const transport = await interrupted; assert.ok(transport.transportError);
    assert.deepEqual(capture(), intent); const stopRefusal = await refused(faulted);
    cp('F4 owned process stops at revocation barrier; durable pending intent survives restart', { intent, transport, stopRefusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
    reset(cleanState); stopGate.release(); fs.writeFileSync(faulted.file, faulted.canonical);

    for (const point of ['local-begin', 'finalize']) {
        const before = capture(); const undo = flag(`dyl45-${point}-failure`);
        const response = await malformed(faulted, first, point === 'local-begin' ? 503 : 200); undo();
        assert.ok(external().pending); const pending = capture(); await restart();
        const refusal = await refused(faulted); assert.deepEqual(capture(), pending);
        cp(`clean-abort ${point} fault never releases pending evidence on restart`, { before, pending, response, refusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
        reset(before);
    }
    for (const fault of ['missing', 'corrupt', 'wrong-account']) {
        const before = capture();
        if (fault === 'missing') fs.unlinkSync(authorityFile);
        if (fault === 'corrupt') fs.writeFileSync(authorityFile, '{broken');
        if (fault === 'wrong-account') fs.writeFileSync(authorityFile, JSON.stringify({ ...external(), account: JSON.stringify([owner, -1]) }));
        const faultBytes = fs.existsSync(authorityFile) ? bytes(authorityFile) : null;
        await restart(); const refusal = await refused(faulted);
        await malformed(faulted, first, fault === 'wrong-account' ? 403 : 503);
        await first.api('reenroll', { avatar: faulted.avatar }, fault === 'wrong-account' ? 403 : 503);
        assert.equal(fs.existsSync(authorityFile) ? bytes(authorityFile) : null, faultBytes);
        reset(before); // The inherited checkpoint parser needs valid fixture authority.
        cp(`AUTHORITY_UNAVAILABLE ${fault}: no local reconstruction or clean-abort bypass`, { faultBytes, refusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
    }

    // A partially committed native rename is never a clean abort, even with unchanged transcript.
    const partial = await fixture('Partial'); const beforePartial = capture(); const partialName = `PartialDestination-${h.runId}`;
    const undoPartial = flag('dyl43-partial-rename');
    const partialResult = await first.request('/api/characters/rename', { avatar_url: partial.avatar, new_name: partialName }, 500); undoPartial();
    assert.ok(fs.existsSync(path.join(root, 'characters', partial.avatar)) && fs.existsSync(path.join(root, 'characters', `${partialName}.png`)));
    assert.equal(bytes(partial.file), partial.canonical); assert.ok(external().pending);
    await malformed(partial, first, 503); await restart(); const partialRefusal = await refused(partial);
    cp('F7 partial native card write is INDETERMINATE; matching transcript cannot attest abort', { partial, beforePartial, partialResult, partialRefusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
    reset(beforePartial);

    const accountTest = await fixture('Accounts'), accountClean = capture();
    const other = h.session(); await other.login(h.otherHandle);
    const otherFile = path.join(h.authority, `${h.hash(path.resolve(h.userRoot(h.otherHandle)))}.json`);
    const otherBefore = bytes(otherFile);
    await other.api('read', { target: accountTest.active.target }, 403);
    const wrong = await other.api('reenroll', { avatar: accountTest.avatar, storeId: external().storeInstanceId,
        generation: external().generation, target: accountTest.active.target }, 400);
    assert.deepEqual(capture(), accountClean); assert.equal(bytes(accountTest.visualFile), accountTest.visual);
    assert.ok(JSON.parse(bytes(otherFile)).pending); // Invalid input never repairs or selects the foreign store.
    cp('F8 two authenticated accounts: submitted store/generation/target cannot select foreign authority', { accountTest, wrong, otherBefore, otherAfter: bytes(otherFile) });

    // Hold old CAS/load through healthy re-enrollment following a completed read revocation.
    const enroll = await fixture('HeldEnrollment', true);
    await first.api('barrier', { clientId: enroll.active.target.clientId, action: 'arm' });
    const held = oldCas(enroll, 400);
    while (!(await first.api('barrier', { clientId: enroll.active.target.clientId, action: 'status' })).entered) await new Promise(r => setTimeout(r, 10));
    fs.appendFileSync(enroll.file, '\n'); await first.api('read', { target: enroll.active.target }, 400); fs.writeFileSync(enroll.file, enroll.canonical);
    // A chat revocation alone does not retire its character scope: native delete/recreate is explicit.
    await revoke(enroll); const enrolled = await first.api('reenroll', { avatar: enroll.avatar });
    await first.api('barrier', { clientId: enroll.active.target.clientId, action: 'release' }); assert.equal((await held).error, 'INVALID_TARGET');
    assert.equal((await first.api('accept-load', enroll.ticket.request, 400)).error, 'INVALID_TARGET');
    assert.notEqual(enrolled.scopeId, enroll.entry.scopeId); assert.ok(!enrolled.chatIds.includes(enroll.entry.chatId));
    const enrolledLoad = await load(enroll); assert.equal((await first.api('read', { target: enrolledLoad.target })).revision, 0);
    await first.api('cas', { target: enrolledLoad.target, expectedRevision: 0, record: { background: 'tavern' } });
    assert.equal(bytes(enroll.file), enroll.canonical); assert.equal(bytes(enroll.visualFile), enroll.visual);
    cp('healthy read revocation, explicit fresh enrollment and old held CAS/load remain isolated', { enroll, enrolled, enrolledLoad });
    await restart(); assert.ok((await load(enroll)).target); cp('fresh enrolled authority persists across restart', { enrolled });

    const unknown = await fixture('Unknown'); fs.appendFileSync(unknown.file, '\n'); fs.writeFileSync(unknown.file, unknown.canonical);
    const identical = path.join(ns, 'identical'); fs.writeFileSync(identical, unknown.canonical); fs.copyFileSync(identical, unknown.file); fs.unlinkSync(identical);
    await first.api('read', { target: unknown.active.target });
    cp('COUNTEREXAMPLE unknown in-place restore still accepts old authority', { unknown, safetyVerdict: 'NOT_PROVEN' }, 'SYNTHETIC');

    const lost = await fixture('LostObservation'); const beforeLost = capture(); fs.appendFileSync(lost.file, '\n');
    const undoLost = flag('dyl45-begin-failure'); await first.api('read', { target: lost.active.target }, 503); undoLost();
    const durableWitness = bytes(witnessFile); assert.ok(JSON.parse(durableWitness).pending);
    fs.writeFileSync(lost.file, lost.canonical); await restart(); const lostRefusal = await refused(lost);
    assert.equal(bytes(witnessFile), durableWitness);
    assert.equal((await first.api('reenroll', { avatar: lost.avatar }, 503)).error, 'VALIDATION_PENDING');
    await restart(); await refused(lost); assert.equal(bytes(witnessFile), durableWitness);
    cp('review regression: failed external intent plus unknown byte restore refuses old identity through two restarts',
        { lost, durableWitness, lostRefusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
    reset(beforeLost);

    for (const point of ['begin', 'finalize']) {
        const x = await fixture(`Witness-${point}`), before = capture(); const undo = flag(`dyl46-witness-${point}-failure`);
        await first.api('read', { target: x.active.target }, 503); undo();
        assert.equal(bytes(x.visualFile), x.visual); assert.equal(bytes(x.file), x.canonical);
        if (point === 'begin') {
            assert.deepEqual(capture(), before); await first.api('read', { target: x.active.target });
        } else {
            const pending = capture(); await restart(); await refused(x); assert.deepEqual(capture(), pending); reset(before);
        }
        cp(`validation witness ${point} failure never grants authority or invents history`, { x, before }, 'SYNTHETIC + EXPERIMENTAL_HOST');
    }
    for (const fault of ['missing', 'corrupt', 'binding']) {
        const x = await fixture(`Witness-${fault}`), before = capture();
        if (fault === 'missing') fs.unlinkSync(witnessFile);
        if (fault === 'corrupt') fs.writeFileSync(witnessFile, '{broken');
        if (fault === 'binding') fs.writeFileSync(witnessFile, JSON.stringify({ ...JSON.parse(bytes(witnessFile)), account: 'foreign' }));
        const faultBytes = fs.existsSync(witnessFile) ? bytes(witnessFile) : null;
        await restart(); const refusal = await refused(x); await first.api('reenroll', { avatar: x.avatar }, 503);
        assert.equal(fs.existsSync(witnessFile) ? bytes(witnessFile) : null, faultBytes);
        reset(before); cp(`validation witness ${fault} is never reconstructed or adopted`, { x, faultBytes, refusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
    }

    const rollback = await fixture('Rollback'); const beforeRollback = capture();
    const backup = path.join(path.dirname(root), `dyl46-backup-${h.runId}`); assert.equal(fs.existsSync(backup), false);
    function snapshot(from, to) {
        fs.mkdirSync(to);
        for (const e of fs.readdirSync(from, { withFileTypes: true })) {
            const source = path.join(from, e.name), target = path.join(to, e.name);
            if (e.isDirectory()) snapshot(source, target); else { assert.ok(e.isFile()); fs.linkSync(source, target); }
        }
    }
    await h.stopHost(); snapshot(root, backup); await h.startHost(); first = h.session(); await first.login(owner);
    await save(rollback); const advancedAuthority = bytes(authorityFile);
    await h.stopHost(); assert.equal(path.basename(path.dirname(root)), `sillynovel-dyl27-${h.runId}`);
    fs.rmSync(root, { recursive: true }); fs.renameSync(backup, root);
    await h.startHost(); first = h.session(); await first.login(owner);
    assert.equal(bytes(authorityFile), advancedAuthority); assert.equal(bytes(registryFile), beforeRollback[2][1]);
    const restored = capture();
    await malformed(rollback, first, 503); // Clean-abort hook is unreachable from an untrusted root.
    fs.appendFileSync(rollback.file, '\n'); const rollbackRead = await load(rollback); assert.equal(rollbackRead.envelope.identity, null);
    fs.writeFileSync(rollback.file, rollback.canonical); // Attacker restores canonical bytes; no authority transition.
    await first.api('reenroll', { avatar: rollback.avatar }, 503); const rollbackRefusal = await refused(rollback);
    assert.deepEqual(capture(), restored); await restart(); await refused(rollback); assert.deepEqual(capture(), restored);
    cp('root rollback refuses every recovery entry and enrollment through two restarts without adoption', { rollback, beforeRollback, advancedAuthority, restored, rollbackRead, rollbackRefusal }, 'SYNTHETIC restore + EXPERIMENTAL_HOST');
    const forgedLocal = local(), authority = external(); forgedLocal.serial = authority.generation; forgedLocal.storeIncarnation = authority.trustedIncarnation;
    fs.writeFileSync(localFile, JSON.stringify(forgedLocal));
    const forgedRegistry = JSON.parse(bytes(registryFile)); forgedRegistry.storeId = authority.storeInstanceId;
    fs.writeFileSync(registryFile, JSON.stringify(forgedRegistry));
    const forged = capture(); await restart(); const forgeryRefusal = await refused(rollback);
    await malformed(rollback, first, 503); await first.api('reenroll', { avatar: rollback.avatar }, 503);
    assert.deepEqual(capture(), forged); assert.equal(bytes(rollback.visualFile), rollback.visual);
    cp('forged local serial/incarnation/store UUID without finalized registry history remains refused', { forged, forgeryRefusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');
}
