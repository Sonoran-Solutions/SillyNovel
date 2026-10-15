import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function run(h) {
    await h.firstPage.context().close();
    let first = h.first;
    const owner = 'default-user', root = h.userRoot(owner), ns = path.join(root, 'sillynovel-dyl27');
    const stateFile = path.join(root, 'sillynovel-dyl44-reservation.json');
    const registryFile = path.join(ns, 'identities.json');
    const authorityFile = path.join(h.authority, `${h.hash(path.resolve(root))}.json`);
    const bytes = f => fs.readFileSync(f, 'utf8');
    const state = () => JSON.parse(bytes(stateFile));
    const external = () => JSON.parse(bytes(authorityFile));
    const cp = (name, details = {}, classification = 'EXPERIMENTAL_HOST') => h.checkpoint(`DYL-45 ${name}`, classification,
        { ...details, local: bytes(stateFile), localSha256: h.hash(bytes(stateFile)),
            external: bytes(authorityFile), externalSha256: h.hash(bytes(authorityFile)) });
    // Resets only undo deliberate injected fixture faults between independent cases.
    // They are not host APIs or a recovery/restore implementation.
    const capture = () => [authorityFile, stateFile, registryFile].map(file => [file, bytes(file)]);
    const reset = saved => { for (const [file, text] of saved) fs.writeFileSync(file, text); };
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
        const chatName = 'Same transcript';
        const messages = h.chatMessages('Original generated transcript.');
        if (forged) messages[0].chat_metadata.sillynovel = { storeId: h.registry(owner).storeId, scopeId: h.registry(owner).scopes[0].scopeId, chatId: h.registry(owner).chats[0].chatId };
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
    async function restart() { await h.stopHost(); await h.startHost(); first = h.session(); await first.login(owner); }
    async function save(x, expected = 200) { return first.request('/api/chats/save', { avatar_url: x.avatar, file_name: x.chatName, chat: x.messages }, expected); }
    async function unavailable(x) {
        const native = await load(x);
        assert.equal(native.envelope.identity, null); assert.ok(native.envelope.messages.length);
        const read = await first.api('read', { target: x.active.target }, 409);
        const cas = await first.api('cas', { target: x.active.target, expectedRevision: 1, record: { background: 'tavern' } }, 409);
        assert.equal(read.error, 'IDENTITY_UNAVAILABLE'); assert.equal(cas.error, 'IDENTITY_UNAVAILABLE');
        assert.equal(bytes(x.visualFile), x.visual);
        return { native, read, cas };
    }
    async function revoke(x) {
        await first.request('/api/characters/delete', { avatar_url: x.avatar, delete_chats: false });
        assert.equal(await first.request('/api/characters/create', { ch_name: x.name, first_mes: 'Synthetic fixture.' }), x.avatar);
        assert.equal(bytes(x.file), x.canonical);
        assert.equal((await load(x)).envelope.identity, null);
    }
    async function arm(point) {
        const file = path.join(ns, `dyl44-barrier-${point}`), entered = `${file}.entered`;
        if (fs.existsSync(entered)) fs.unlinkSync(entered);
        fs.writeFileSync(file, h.runId, { flag: 'wx' });
        return { async wait() {
            const until = Date.now() + 8000;
            while (!fs.existsSync(entered)) { assert.ok(Date.now() < until, `barrier ${point}`); await new Promise(r => setTimeout(r, 10)); }
        }, release() { fs.unlinkSync(file); } };
    }
    const a = await fixture('FreshAuthority', true);
    const originalAuthority = external();
    await save(a);
    assert.equal(external().generation, originalAuthority.generation + 1);
    assert.equal(external().generation, state().serial);
    assert.equal((await first.api('read', { target: a.active.target }, 409)).error, 'WRITE_GENERATION_MISMATCH');
    cp('identical participating save advances external/local generation and refuses old target', { a, originalAuthority });

    const unknown = await fixture('Unknown');
    fs.appendFileSync(unknown.file, '\n'); fs.writeFileSync(unknown.file, unknown.canonical);
    const identical = path.join(ns, 'identical'); fs.writeFileSync(identical, unknown.canonical); fs.copyFileSync(identical, unknown.file); fs.unlinkSync(identical);
    await first.api('read', { target: unknown.active.target });
    cp('COUNTEREXAMPLE unknown in-place restore/copy still accepts old authority', { safetyVerdict: 'NOT_PROVEN', unknown }, 'SYNTHETIC');

    const enrolled = await fixture('Enrollment', true);
    await first.api('barrier', { clientId: enrolled.active.target.clientId, action: 'arm' });
    const held = first.api('cas', { target: enrolled.active.target, expectedRevision: 1, record: { background: 'tavern' } }, 400);
    while (!(await first.api('barrier', { clientId: enrolled.active.target.clientId, action: 'status' })).entered) await new Promise(r => setTimeout(r, 10));
    await revoke(enrolled);
    const enrollmentCard = fs.readFileSync(path.join(root, 'characters', enrolled.avatar));
    const fresh = await first.api('reenroll', { avatar: enrolled.avatar });
    assert.deepEqual(fs.readFileSync(path.join(root, 'characters', enrolled.avatar)), enrollmentCard);
    assert.notEqual(fresh.scopeId, enrolled.entry.scopeId); assert.ok(!fresh.chatIds.includes(enrolled.entry.chatId));
    const accepted = await load(enrolled); assert.ok(accepted.target);
    const record = await first.api('read', { target: accepted.target });
    assert.equal(record.revision, 0); assert.deepEqual(record.record, { background: null });
    await first.api('cas', { target: accepted.target, expectedRevision: 0, record: { background: 'tavern' } });
    assert.equal(bytes(enrolled.file), enrolled.canonical); assert.equal(bytes(enrolled.visualFile), enrolled.visual);
    await first.api('barrier', { clientId: enrolled.active.target.clientId, action: 'release' });
    assert.equal((await held).error, 'INVALID_TARGET');
    assert.equal((await first.api('accept-load', enrolled.ticket.request, 400)).error, 'INVALID_TARGET');
    cp('explicit same-name same-card same-byte re-enrollment mints fresh IDs; copied metadata ignored; held old CAS/load refuse', { enrolled, fresh, accepted, record, cardBase64: enrollmentCard.toString('base64'), cardSha256: h.hash(enrollmentCard) });

    const again = await fixture('AfterRestart'); await revoke(again); await restart();
    const afterRestart = await first.api('reenroll', { avatar: again.avatar });
    assert.notEqual(afterRestart.scopeId, again.entry.scopeId); assert.ok((await load(again)).target);
    cp('explicit re-enrollment succeeds after restart under fresh identity', { again, afterRestart });

    for (const competitor of ['enrollment', 'rename', 'import', 'delete']) {
        const x = await fixture(`Race-${competitor}`); await revoke(x);
        const gate = await arm('enroll');
        const winner = first.api('reenroll', { avatar: x.avatar }); await gate.wait();
        const before = bytes(authorityFile); let loser;
        if (competitor === 'enrollment') loser = await first.api('reenroll', { avatar: x.avatar }, 409);
        if (competitor === 'rename') loser = await first.request('/api/characters/rename', { avatar_url: x.avatar, new_name: `RaceDest-${h.runId}` }, 409);
        if (competitor === 'delete') loser = await first.request('/api/characters/delete', { avatar_url: x.avatar, delete_chats: true }, 409);
        if (competitor === 'import') {
            const form = new FormData(); form.set('file_type', 'jsonl'); form.set('avatar_url', x.avatar);
            form.set('avatar', new Blob([x.canonical]), 'chat.jsonl');
            loser = await first.request('/api/chats/import', form, 409);
        }
        assert.equal(loser.error, 'RESERVATION_BUSY'); assert.equal(bytes(authorityFile), before);
        gate.release(); const result = await winner; assert.ok((await load(x)).target);
        cp(`enrollment overlapping ${competitor}: one owner; loser refuses before mutation`, { response: result, loser });
    }
    // Opposite ordering: native rename owns the reservation before enrollment arrives.
    const reverse = await fixture('ReverseRace'); await revoke(reverse); const reverseGate = await arm('rename-read');
    const nativeWinner = first.request('/api/characters/rename', { avatar_url: reverse.avatar, new_name: `ReverseDestination-${h.runId}` });
    await reverseGate.wait(); const reverseLoser = await first.api('reenroll', { avatar: reverse.avatar }, 409);
    assert.equal(reverseLoser.error, 'RESERVATION_BUSY'); reverseGate.release(); await nativeWinner;
    cp('native rename wins against enrollment; revoked identity never returns', { reverseLoser });

    const x = await fixture('Failures');
    const clean = capture();
    const beginFlag = path.join(ns, 'dyl45-begin-failure'); fs.writeFileSync(beginFlag, h.runId);
    const f1 = await save(x, 503); fs.unlinkSync(beginFlag);
    assert.deepEqual(capture(), clean); assert.equal(bytes(x.file), x.canonical); await first.api('read', { target: x.active.target });
    cp('F1 injected external write failure precedes native mutation', { f1 }, 'SYNTHETIC');
    fs.chmodSync(h.authority, 0o500); let permission;
    try { permission = await save(x, 503); } finally { fs.chmodSync(h.authority, 0o700); }
    assert.deepEqual(capture(), clean); assert.equal(bytes(x.file), x.canonical);
    cp('F1 real external-directory EACCES prevents native mutation', { permission });
    for (const point of ['local-begin', 'registry-finalize', 'reservation-finalize', 'finalize']) {
        const flag = path.join(ns, point === 'registry-finalize' ? 'dyl43-finalize-failure'
            : point === 'reservation-finalize' ? 'dyl44-finalize-failure' : `dyl45-${point}-failure`); fs.writeFileSync(flag, h.runId);
        const result = await save(x, point === 'local-begin' ? 503 : 200); fs.unlinkSync(flag);
        assert.ok(external().pending); const pending = bytes(authorityFile);
        await restart(); assert.equal(bytes(authorityFile), pending);
        const refusal = await unavailable(x);
        assert.equal((await first.api('reenroll', { avatar: x.avatar }, 503)).error, 'EXTERNAL_LOCAL_MISMATCH');
        cp(`${point === 'local-begin' ? 'F2' : 'F3'} external/local ${point} failure stays refused after restart`, { response: result, refusal, pending }, 'SYNTHETIC');
        reset(clean);
    }
    // Actual native failure after external intent and lifecycle revocation.
    const flag = path.join(ns, 'dyl43-after-revoke'); fs.writeFileSync(flag, h.runId);
    const nativeFailure = await first.request('/api/characters/rename', { avatar_url: x.avatar, new_name: `Failed-${h.runId}` }, 500); fs.unlinkSync(flag);
    assert.equal(bytes(x.file), x.canonical); await restart(); const nativeRefusal = await unavailable(x);
    cp('F2 native mutation fails after external advance; unchanged canonical bytes confer no authority', { nativeFailure, nativeRefusal }, 'SYNTHETIC'); reset(clean);

    const malformed = new FormData(); malformed.set('file_type', 'jsonl'); malformed.set('avatar_url', x.avatar);
    malformed.set('character_name', 'Synthetic'); malformed.set('user_name', 'Synthetic');
    malformed.set('avatar', new Blob(['{}']), 'malformed.jsonl');
    const nativeLogicalFailure = await first.request('/api/chats/import', malformed);
    assert.equal(nativeLogicalFailure.error, true); assert.ok(external().pending);
    assert.equal(bytes(x.file), x.canonical); await restart(); const logicalRefusal = await unavailable(x);
    cp('F2 native HTTP 200 error is not commit evidence; external intent remains refused after restart', { nativeLogicalFailure, logicalRefusal });
    reset(clean);

    for (const [label, file] of [['F4 registry', registryFile], ['F5 external', authorityFile]]) {
        for (const fault of ['missing', 'corrupt', 'stale']) {
            const saved = capture(); let faultBytes = null;
            if (fault === 'missing') fs.unlinkSync(file);
            if (fault === 'corrupt') fs.writeFileSync(file, '{broken');
            if (fault === 'stale') {
                const value = JSON.parse(bytes(file));
                if (file === authorityFile) value.generation--; else value.scopes.pop();
                fs.writeFileSync(file, JSON.stringify(value));
            }
            if (fs.existsSync(file)) faultBytes = bytes(file);
            await restart(); const refusal = await unavailable(x);
            await first.api('provision', {}, 409);
            const attempted = await first.api('reenroll', { avatar: x.avatar }, 503);
            assert.equal(fs.existsSync(file) ? bytes(file) : null, faultBytes);
            reset(saved); // Capture corrupt/missing bytes separately; inherited checkpoint parses valid registries.
            cp(`${label} ${fault}: no reconstruction, native text readable, enrollment refuses`, { faultBytes, refusal, attempted }, 'SYNTHETIC');
        }
    }
    // Authentication chooses the store; caller-supplied ownership never overrides it.
    const other = h.session(); await other.login(h.otherHandle);
    await other.api('read', { target: x.active.target }, 403);
    const otherAuthority = path.join(h.authority, `${h.hash(path.resolve(h.userRoot(h.otherHandle)))}.json`);
    const otherLocal = path.join(h.userRoot(h.otherHandle), 'sillynovel-dyl44-reservation.json');
    const otherSaved = [otherAuthority, otherLocal].map(f => [f, bytes(f)]);
    const foreign = await other.api('reenroll', { avatar: x.avatar }, 409); reset(otherSaved);
    const accountChanged = external(); accountChanged.account = JSON.stringify([owner, -1]); fs.writeFileSync(authorityFile, JSON.stringify(accountChanged));
    await restart(); const identityRefusal = await unavailable(x); await first.api('reenroll', { avatar: x.avatar }, 403); reset(clean);
    cp('foreign authenticated store and changed same-handle account creation evidence refuse', { foreign, identityRefusal }, 'SYNTHETIC + EXPERIMENTAL_HOST');

    const interrupted = await fixture('Interrupted'); await revoke(interrupted); const beforeInterrupt = capture();
    const gate = await arm('enroll');
    const request = first.api('reenroll', { avatar: interrupted.avatar }).then(() => ({ resolved: true }), error => ({ transportError: error.message }));
    await gate.wait(); const intent = bytes(authorityFile); await restart(); const transport = await request;
    assert.ok(transport.transportError); assert.equal(bytes(authorityFile), intent);
    const interruptedRefusal = await unavailable(interrupted);
    cp('F6 process stopped at enrollment barrier retains external/local intent after restart', { intent, transport, interruptedRefusal }, 'SYNTHETIC');
    reset(beforeInterrupt); gate.release();
    const enrollmentFail = path.join(ns, 'dyl45-enroll-finalize-failure'); fs.writeFileSync(enrollmentFail, h.runId);
    await first.api('reenroll', { avatar: interrupted.avatar }, 503); fs.unlinkSync(enrollmentFail);
    await restart(); const failedEnrollment = await unavailable(interrupted);
    cp('failed enrollment finalization never publishes new or old authority', { failedEnrollment }, 'SYNTHETIC'); reset(beforeInterrupt);

    for (const fault of ['missing-card', 'ambiguous-inventory', 'client-owner']) {
        const invalid = await fixture(`Invalid-${fault}`); await revoke(invalid); const saved = capture();
        const card = path.join(root, 'characters', invalid.avatar), cardBytes = fs.readFileSync(card);
        const extra = path.join(path.dirname(invalid.file), 'unrecognized.txt');
        if (fault === 'missing-card') fs.unlinkSync(card);
        if (fault === 'ambiguous-inventory') fs.writeFileSync(extra, 'synthetic ambiguity');
        const result = await first.api('reenroll', { avatar: invalid.avatar,
            ...(fault === 'client-owner' ? { owner, storeId: h.registry(owner).storeId } : {}) },
            fault === 'missing-card' ? 500 : fault === 'client-owner' ? 400 : 409);
        assert.equal(bytes(invalid.file), invalid.canonical); assert.equal(bytes(invalid.visualFile), invalid.visual);
        await unavailable(invalid);
        if (fault === 'missing-card') fs.writeFileSync(card, cardBytes);
        if (fault === 'ambiguous-inventory') fs.unlinkSync(extra);
        cp(`explicit enrollment refuses ${fault} without granting authority`, { response: result }, 'SYNTHETIC');
        reset(saved);
    }

    const rollback = await fixture('Rollback');
    const backup = path.join(path.dirname(root), `dyl45-backup-${h.runId}`); assert.equal(fs.existsSync(backup), false);
    function snapshot(from, to) {
        fs.mkdirSync(to);
        for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
            const source = path.join(from, entry.name), destination = path.join(to, entry.name);
            if (entry.isDirectory()) snapshot(source, destination);
            else { assert.ok(entry.isFile()); fs.linkSync(source, destination); }
        }
    }
    const authorityBefore = bytes(authorityFile), registryBefore = bytes(registryFile), localBefore = bytes(stateFile);
    await h.stopHost(); snapshot(root, backup); await h.startHost(); first = h.session(); await first.login(owner);
    await save(rollback); const authorityAfter = bytes(authorityFile);
    assert.ok(external().generation > JSON.parse(authorityBefore).generation);
    await h.stopHost(); assert.equal(path.basename(path.dirname(root)), `sillynovel-dyl27-${h.runId}`);
    fs.rmSync(root, { recursive: true }); fs.renameSync(backup, root);
    await h.startHost(); first = h.session(); await first.login(owner);
    assert.equal(bytes(registryFile), registryBefore); assert.equal(bytes(stateFile), localBefore); assert.equal(bytes(authorityFile), authorityAfter);
    const refused = await unavailable(rollback);
    await first.api('accept-load', rollback.ticket.request, 403);
    await first.api('reenroll', { avatar: rollback.avatar }, 503);
    await restart(); const refusedAgain = await unavailable(rollback);
    assert.equal(bytes(registryFile), registryBefore); assert.equal(bytes(authorityFile), authorityAfter);
    cp('user-root-only metadata-preserving rollback refuses old visuals through two restarts without adoption',
        { rollback, registryBefore, registrySha256: h.hash(registryBefore), authorityBefore, authorityAfter, refused, refusedAgain }, 'SYNTHETIC restore + EXPERIMENTAL_HOST');
}
