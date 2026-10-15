import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Test-only campaign inside the inherited owned, authenticated pinned-host harness.
export async function run(h) {
    let first = h.first;
    let epoch = 0;
    let other = h.session(); await other.login(h.otherHandle);
    const owner = 'default-user';
    const root = h.userRoot(owner);
    const ns = path.join(root, 'sillynovel-dyl27');
    const registryFile = path.join(ns, 'identities.json');
    const bytes = f => fs.readFileSync(f, 'utf8');
    const source = x => path.join(root, x.entry.relativePath);
    const card = avatar => path.join(root, 'characters', avatar);
    const record = x => h.visualFile(owner, x.entry.chatId);
    const checkpoint = (name, details = {}, classification = 'EXPERIMENTAL_HOST') => h.checkpoint(`DYL-43 ${name}`, classification, details);
    async function load(avatar, name, client = first, accept = true) {
        const clientId = (await client.api('client')).clientId;
        const envelope = await client.request('/api/chats/get', { avatar_url: avatar, file_name: name,
            dyl28ClientId: clientId, dyl28Sequence: 1 });
        const request = { clientId, sequence: 1, loadRequestId: envelope.loadRequestId };
        return { envelope, request, target: envelope.identity && accept ? await client.api('accept-load', request) : null };
    }
    async function fixture(label) {
        const name = `${label}-${h.runId}`;
        const avatar = await first.request('/api/characters/create', { ch_name: name, first_mes: 'Original synthetic greeting.' });
        const chatName = (await first.request('/api/characters/get', { avatar_url: avatar })).chat;
        const messages = h.chatMessages(`Synthetic ${label}.`); messages[1].name = name;
        await first.request('/api/chats/save', { avatar_url: avatar, file_name: chatName, chat: messages });
        const entry = h.registry(owner).chats.find(c => c.relativePath === `chats/${avatar.replace('.png', '')}/${chatName}.jsonl`);
        assert.ok(entry);
        const active = await load(avatar, chatName);
        const before = bytes(path.join(root, entry.relativePath));
        await first.api('cas', { target: active.target, expectedRevision: 0, record: { background: 'forest' } });
        assert.equal(bytes(path.join(root, entry.relativePath)), before);
        const ticket = await load(avatar, chatName, first, false);
        return { avatar, name, chatName, messages, entry, active, ticket, epoch, canonical: before,
            canonicalSha256: h.hash(before), visual: bytes(h.visualFile(owner, entry.chatId)), registry: bytes(registryFile) };
    }
    async function revoked(x, client = first, status = 400, code = 'INVALID_TARGET') {
        const cas = await client.api('cas', { target: x.active.target, expectedRevision: 1,
            record: { background: 'tavern' } }, status);
        assert.equal(cas.error, code);
        const ticket = await client.api('accept-load', x.ticket.request, x.epoch === epoch ? status : 403);
        assert.equal(ticket.error, x.epoch === epoch ? code : 'INVALID_CLIENT');
        assert.equal(bytes(record(x)), x.visual);
        return { cas, ticket };
    }
    function flag(name) { const f = path.join(ns, `dyl43-${name}`); fs.writeFileSync(f, h.runId, { flag: 'wx' }); return () => fs.unlinkSync(f); }
    async function restart() {
        await h.stopHost(); await h.startHost(); epoch++;
        first = h.session(); await first.login(owner);
        other = h.session(); await other.login(h.otherHandle);
    }
    const isolatedFailures = new Set();
    const authorityFile = h.authority && path.join(h.authority, `${h.hash(path.resolve(root))}.json`);
    const authorityState = () => [registryFile, path.join(root, 'sillynovel-dyl44-reservation.json'), authorityFile,
        path.join(h.authority, 'validation', path.basename(authorityFile))].map(file => [file, bytes(file)]);
    async function wholeStoreFailure(x, isolation) {
        const pending = authorityState();
        const refusal = await revoked(x, first, 409, 'IDENTITY_UNAVAILABLE');
        await restart(); assert.deepEqual(authorityState(), pending);
        await revoked(x, first, 409, 'IDENTITY_UNAVAILABLE');
        assert.equal((await first.request('/api/chats/save', { avatar_url: x.avatar, file_name: x.chatName,
            chat: x.messages }, 503)).error, 'EXTERNAL_LOCAL_MISMATCH');
        checkpoint('approved conservative failure remains whole-store refused through restart', { x, pending, refusal });
        // End this fault episode. Restoring BOTH authorities is privileged test setup, not recovery.
        await h.stopHost(); isolation.restore(); await restart(); isolatedFailures.add(x);
        return refusal;
    }
    async function upload(x, expected = 200) {
        const data = new FormData();
        data.set('avatar', new Blob([JSON.stringify({ spec: 'chara_card_v2', spec_version: '2.0',
            data: { name: x.name, description: 'Synthetic replacement.', first_mes: 'Imported greeting.',
                extensions: { sillynovel: x.active.target } } })], { type: 'application/json' }), 'synthetic.json');
        data.set('file_type', 'json'); data.set('preserved_name', x.avatar);
        return first.request('/api/characters/import', data, expected);
    }
    const isolated = await fixture('Unaffected');
    const otherCatalog = h.registry(h.otherHandle);
    const otherEntry = otherCatalog.chats.find(c => !c.deleted);
    const otherAvatar = otherCatalog.scopes.find(s => s.scopeId === otherEntry.scopeId).avatar;
    const otherName = path.basename(otherEntry.relativePath, '.jsonl');
    const otherLoad = await load(otherAvatar, otherName, other);
    const otherRegistry = bytes(path.join(h.userRoot(h.otherHandle), 'sillynovel-dyl27/identities.json'));

    // Exercise the real native browser function, including historical-message rewrite and reload.
    const rename = await fixture('Rename');
    const page = h.firstPage;
    await page.evaluate(async () => (await import('/script.js')).getCharacters());
    await h.clickCard(page, rename.avatar);
    const newName = `Renamed-${h.runId}`;
    assert.equal(await page.evaluate(async name => (await import('/script.js')).renameCharacter(name,
        { silent: true, renameChats: true }), newName), true);
    const newAvatar = `${newName}.png`;
    assert.equal(fs.existsSync(card(rename.avatar)), false);
    assert.ok(fs.existsSync(card(newAvatar)));
    const moved = path.join(root, 'chats', newName, `${rename.chatName}.jsonl`);
    assert.match(bytes(moved), new RegExp(newName));
    assert.equal((await load(newAvatar, rename.chatName)).envelope.identity, null);
    const renameRefusals = await revoked(rename);
    await first.api('read', { target: isolated.active.target });
    assert.equal((await other.api('read', { target: otherLoad.target })).storeId, otherCatalog.storeId);
    assert.equal(bytes(path.join(h.userRoot(h.otherHandle), 'sillynovel-dyl27/identities.json')), otherRegistry);
    const reused = await first.request('/api/characters/create', { ch_name: rename.name });
    assert.equal(reused, rename.avatar);
    await first.request('/api/chats/save', { avatar_url: reused, file_name: rename.chatName, chat: rename.messages });
    assert.equal(bytes(source(rename)), rename.canonical);
    assert.equal((await load(reused, rename.chatName)).envelope.identity, null);
    checkpoint('native browser rename with historical messages, moved directory, reused old name and independent stores', {
        rename, newAvatar, movedText: bytes(moved), movedSha256: h.hash(bytes(moved)), renameRefusals,
        browser: await h.pageState(page), otherTarget: otherLoad.target,
    }, 'NATIVE_HOST_UI + EXPERIMENTAL_HOST');

    const deletion = await fixture('Delete');
    const delResponse = await first.request('/api/characters/delete', { avatar_url: deletion.avatar, delete_chats: true });
    assert.equal(fs.existsSync(card(deletion.avatar)), false); assert.equal(fs.existsSync(source(deletion)), false);
    assert.equal(await first.request('/api/characters/create', { ch_name: deletion.name }), deletion.avatar);
    await first.request('/api/chats/save', { avatar_url: deletion.avatar, file_name: deletion.chatName, chat: deletion.messages });
    assert.equal(bytes(source(deletion)), deletion.canonical);
    assert.equal((await load(deletion.avatar, deletion.chatName)).envelope.identity, null);
    checkpoint('native delete/recreate same avatar and identical transcript does not inherit authority', { deletion, delResponse, refusals: await revoked(deletion) });

    const dupe = await fixture('Duplicate');
    await first.request('/api/characters/merge-attributes', { avatar: dupe.avatar, data: { extensions: { sillynovel: dupe.active.target } } });
    assert.deepEqual((await first.request('/api/characters/get', { avatar_url: dupe.avatar })).data.extensions.sillynovel, dupe.active.target);
    const originalCard = fs.readFileSync(card(dupe.avatar));
    const duplicated = await first.request('/api/characters/duplicate', { avatar_url: dupe.avatar });
    assert.deepEqual(fs.readFileSync(card(duplicated.path)), originalCard);
    assert.ok(!h.registry(owner).scopes.some(s => s.avatar === duplicated.path));
    await first.request('/api/chats/save', { avatar_url: duplicated.path, file_name: dupe.chatName, chat: dupe.messages });
    assert.equal((await load(duplicated.path, dupe.chatName)).envelope.identity, null);
    await first.api('read', { target: dupe.active.target });
    checkpoint('native card duplicate copies forged metadata byte-for-byte but grants no scope/chat/visual identity', { dupe, duplicated, cardSha256: h.hash(originalCard) });

    // Real EACCES at the registry boundary: neither native operation may start.
    for (const operation of ['rename', 'delete']) {
        const x = await fixture(`F1-${operation}`);
        const cardBefore = fs.readFileSync(card(x.avatar));
        fs.chmodSync(ns, 0o500);
        let response;
        try { response = await first.request(`/api/characters/${operation}`, { avatar_url: x.avatar,
            new_name: `Denied-${h.runId}`, delete_chats: true }, operation === 'rename' ? 500 : 503); }
        finally { fs.chmodSync(ns, 0o700); }
        assert.equal(bytes(registryFile), x.registry); assert.equal(bytes(source(x)), x.canonical);
        assert.deepEqual(fs.readFileSync(card(x.avatar)), cardBefore);
        await first.api('read', { target: x.active.target });
        checkpoint(`F1 EACCES ${operation} refuses before canonical ownership changes`, { x, response });
    }
    for (const operation of ['rename', 'delete']) {
        const x = await fixture(`F2-${operation}`);
        const undo = flag('after-revoke'); let response;
        try { response = await first.request(`/api/characters/${operation}`, { avatar_url: x.avatar,
            new_name: `Failed-${h.runId}`, delete_chats: true }, operation === 'rename' ? 500 : 503); }
        finally { undo(); }
        assert.equal(bytes(source(x)), x.canonical); assert.ok(fs.existsSync(card(x.avatar)));
        checkpoint(`F2 ${operation} after durable revocation refuses old CAS/load despite unchanged canonical files`, { x, response, refusals: await revoked(x) });
    }
    const partial = await fixture('PartialRename');
    const partialIsolation = process.env.SN_DYL46 && h.captureFixture(owner);
    const partialName = `PartialDestination-${h.runId}`;
    const undoPartial = flag('partial-rename'); let partialResponse;
    try { partialResponse = await first.request('/api/characters/rename', { avatar_url: partial.avatar, new_name: partialName }, 500); }
    finally { undoPartial(); }
    assert.ok(fs.existsSync(card(partial.avatar)) && fs.existsSync(card(`${partialName}.png`)));
    assert.equal(bytes(source(partial)), partial.canonical);
    checkpoint('F5 interrupted native rename after new card write leaves both cards and old chats without authority', {
        partial, partialResponse, newCardSha256: h.hash(fs.readFileSync(card(`${partialName}.png`))), refusals: partialIsolation ? await wholeStoreFailure(partial, partialIsolation) : await revoked(partial) });

    const partialDelete = await fixture('PartialDelete');
    const deleteIsolation = process.env.SN_DYL46 && h.captureFixture(owner);
    fs.chmodSync(path.dirname(source(partialDelete)), 0o500); let deletePartialResponse;
    try { deletePartialResponse = await first.request('/api/characters/delete', { avatar_url: partialDelete.avatar, delete_chats: true }, 500); }
    finally { fs.chmodSync(path.dirname(source(partialDelete)), 0o700); }
    assert.equal(fs.existsSync(card(partialDelete.avatar)), false);
    assert.equal(bytes(source(partialDelete)), partialDelete.canonical);
    checkpoint('F5 native delete unlinks card then chat-removal EACCES leaves remaining chats revoked', {
        partialDelete, deletePartialResponse, refusals: deleteIsolation ? await wholeStoreFailure(partialDelete, deleteIsolation) : await revoked(partialDelete) });

    const destination = await fixture('Destination');
    const incoming = await fixture('Incoming');
    fs.unlinkSync(card(destination.avatar)); // SYNTHETIC stale registered destination setup.
    const destinationResponse = await first.request('/api/characters/rename', { avatar_url: incoming.avatar, new_name: destination.name });
    assert.equal(destinationResponse.avatar, destination.avatar);
    assert.equal(bytes(source(destination)), destination.canonical);
    assert.equal(bytes(source(incoming)), incoming.canonical); // Native skips move into an existing directory.
    checkpoint('native rename into an orphan registered destination revokes both scopes even when native directory move is skipped', {
        destination, incoming, destinationResponse, oldRefusals: await revoked(incoming), destinationRefusals: await revoked(destination) });

    // Data Maid sees a registered chat orphaned by a test-only unknown card removal.
    const maid = await fixture('Maid');
    fs.unlinkSync(card(maid.avatar)); // SYNTHETIC orphan setup; native cleanup below is real.
    await first.api('read', { target: maid.active.target });
    const report = await first.request('/api/data-maid/report', {});
    const maidRow = report.report.chats.find(row => row.parent === maid.avatar.replace('.png', '') && row.name === `${maid.chatName}.jsonl`);
    assert.ok(maidRow);
    await other.request('/api/data-maid/delete', { token: report.token, hashes: [maidRow.hash] }, 403);
    const maidBefore = bytes(registryFile);
    fs.chmodSync(ns, 0o500); let maidF1;
    try { maidF1 = await first.request('/api/data-maid/delete', { token: report.token, hashes: [maidRow.hash] }, 500); }
    finally { fs.chmodSync(ns, 0o700); }
    assert.equal(bytes(registryFile), maidBefore); assert.equal(bytes(source(maid)), maid.canonical);
    await first.api('read', { target: maid.active.target });
    const maidIsolation = process.env.SN_DYL46 && h.captureFixture(owner);
    // Real native unlink failure AFTER durable chat revocation.
    fs.chmodSync(path.dirname(source(maid)), 0o500); let maidF2;
    try { maidF2 = await first.request('/api/data-maid/delete', { token: report.token, hashes: [maidRow.hash] }, 500); }
    finally { fs.chmodSync(path.dirname(source(maid)), 0o700); }
    assert.equal(bytes(source(maid)), maid.canonical);
    const maidRefusals = maidIsolation ? await wholeStoreFailure(maid, maidIsolation) : await revoked(maid);
    if (maidIsolation) {
        const refreshed = await first.request('/api/data-maid/report', {});
        report.token = refreshed.token;
        maidRow.hash = refreshed.report.chats.find(row => row.parent === maid.avatar.replace('.png', '') && row.name === `${maid.chatName}.jsonl`).hash;
    }
    const maidDeleted = await first.request('/api/data-maid/delete', { token: report.token, hashes: [maidRow.hash] }, 204);
    assert.equal(fs.existsSync(source(maid)), false);
    fs.writeFileSync(source(maid), maid.canonical, { flag: 'wx' }); // Explicit same-locator restore negative control.
    assert.equal((await load(maid.avatar, maid.chatName)).envelope.identity, null);
    checkpoint('Data Maid native report/delete token isolation, F1 EACCES, F2 unlink EACCES and identical-byte recreation refusal', {
        maid, report: { token: report.token, row: maidRow }, maidF1, maidF2, maidDeleted, maidRefusals });

    const unhooked = await fixture('UnhookedCleanup');
    fs.unlinkSync(source(unhooked)); // SYNTHETIC unhooked cleanup; authoritative host refusal below.
    assert.equal((await load(unhooked.avatar, unhooked.chatName)).envelope.identity, null);
    await revoked(unhooked);
    fs.writeFileSync(source(unhooked), unhooked.canonical, { flag: 'wx' });
    assert.equal((await load(unhooked.avatar, unhooked.chatName)).envelope.identity, null);
    checkpoint('unhooked chat unlink observed at host boundary remains revoked after identical-byte restoration', {
        unhooked, refusals: await revoked(unhooked) }, 'SYNTHETIC + EXPERIMENTAL_HOST');

    const drift = await fixture('ObservedDrift');
    fs.appendFileSync(source(drift), '\n');
    assert.equal((await load(drift.avatar, drift.chatName)).envelope.identity, null);
    fs.writeFileSync(source(drift), drift.canonical);
    assert.equal((await load(drift.avatar, drift.chatName)).envelope.identity, null);
    checkpoint('observed unknown write latches chat revocation; restored pre-drift bytes cannot resurrect', { drift, refusals: await revoked(drift) });
    const unseen = await fixture('UnobservedDrift');
    fs.appendFileSync(source(unseen), '\n'); fs.writeFileSync(source(unseen), unseen.canonical);
    await first.api('read', { target: unseen.active.target });
    const identicalFile = path.join(ns, `identical-${h.runId}.jsonl`);
    fs.writeFileSync(identicalFile, unseen.canonical, { flag: 'wx' });
    try { fs.copyFileSync(identicalFile, source(unseen)); } finally { fs.unlinkSync(identicalFile); }
    await first.api('read', { target: unseen.active.target });
    checkpoint('BLOCKING negative control: unobserved in-place write/restoration preserves old seal and authority', {
        unseen, verdict: 'REVISE', limitation: 'Requires host-owned write generation or exclusion of unknown/restore writers; no current proof can detect unobserved same-byte ownership replacement.' }, 'SYNTHETIC + EXPERIMENTAL_HOST');

    const replacement = await fixture('Replacement');
    fs.chmodSync(ns, 0o500); let importF1;
    try { importF1 = await upload(replacement, 503); } finally { fs.chmodSync(ns, 0o700); }
    assert.equal(bytes(registryFile), replacement.registry);
    await first.api('read', { target: replacement.active.target });
    const undoImportF2 = flag('after-revoke'); let importF2;
    try { importF2 = await upload(replacement, 503); } finally { undoImportF2(); }
    assert.equal(bytes(source(replacement)), replacement.canonical);
    checkpoint('F2 card import refused after durable all-scope revocation without restoring authority', {
        replacement, importF2, refusals: await revoked(replacement) });
    const imported = await upload(replacement);
    assert.equal(imported.file_name, replacement.avatar.replace('.png', ''));
    assert.equal(bytes(source(replacement)), replacement.canonical);
    assert.equal((await load(replacement.avatar, replacement.chatName)).envelope.identity, null);
    checkpoint('real native JSON card replacement with copied metadata, F1 refusal and conservative all-scope invalidation', {
        replacement, importF1, imported, refusals: await revoked(replacement), replacementCardSha256: h.hash(fs.readFileSync(card(replacement.avatar))) });

    await restart();
    for (const x of [rename, deletion, partial, partialDelete, maid, drift, replacement].filter(x => !isolatedFailures.has(x))) {
        assert.equal((await load(x.avatar, x.chatName)).envelope.identity, null);
        // Persisted identity revocation is checked before the expired in-memory visit.
        await revoked(x);
    }
    checkpoint('F3 process restart retains permanent lifecycle tombstones without finalization or automatic recovery', {
        policy: 'No registry finalization after destructive mutation: revocation is already final. Graceful process restart, not simulated power loss.' });

    // F4 actual missing/corrupt registry + process restarts. Restoration is harness setup only.
    const f4 = await fixture('RegistryF4');
    const goodRegistry = bytes(registryFile);
    for (const state of ['missing', 'corrupt']) {
        if (state === 'missing') fs.unlinkSync(registryFile); else fs.writeFileSync(registryFile, '{broken');
        await restart();
        const snapshot = await load(f4.avatar, f4.chatName);
        assert.equal(snapshot.envelope.identity, null); assert.deepEqual(snapshot.envelope.messages, f4.messages);
        const refusal = await first.api('cas', { target: f4.active.target, expectedRevision: 1,
            record: { background: 'tavern' } }, 409);
        assert.equal(refusal.error, 'IDENTITY_UNAVAILABLE');
        const rawRegistry = fs.existsSync(registryFile) ? bytes(registryFile) : null;
        fs.writeFileSync(registryFile, goodRegistry); // Test fault restoration, not repair/adoption.
        checkpoint(`F4 ${state} registry across restart keeps native transcript readable and visual authority unavailable`, {
            state, rawRegistry, snapshot, refusal, visualSha256: h.hash(bytes(record(f4))) });
    }
    // Native save finalization fault persists pending intent across restart, never reenables by seal.
    const pending = await fixture('Pending');
    fs.chmodSync(ns, 0o500); let saveF1;
    try { saveF1 = await first.request('/api/chats/save', { avatar_url: pending.avatar, file_name: pending.chatName,
        chat: h.chatMessages('Must not commit before durable pending intent.') }, 500); }
    finally { fs.chmodSync(ns, 0o700); }
    assert.equal(bytes(source(pending)), pending.canonical); assert.equal(bytes(registryFile), pending.registry);
    await first.api('read', { target: pending.active.target });
    checkpoint('F1 native save cannot swallow pending-intent EACCES and mutate canonical bytes', { pending, saveF1 });
    const undoFinalize = flag('finalize-failure');
    let saved;
    try { saved = await first.request('/api/chats/save', { avatar_url: pending.avatar, file_name: pending.chatName,
        chat: h.chatMessages('Native mutation committed before registry finalization failure.') }); }
    finally { undoFinalize(); }
    assert.ok(h.registry(owner).pending); assert.notEqual(bytes(source(pending)), pending.canonical);
    const pendingRegistry = bytes(registryFile);
    await restart();
    assert.equal(bytes(registryFile), pendingRegistry);
    assert.equal((await load(pending.avatar, pending.chatName)).envelope.identity, null);
    checkpoint('F3 native save finalization fault leaves durable whole-store pending refusal after restart', {
        pending, saved, refusals: await revoked(pending, first, 409, 'IDENTITY_UNAVAILABLE') });
    assert.equal(bytes(path.join(h.userRoot(h.otherHandle), 'sillynovel-dyl27/identities.json')), otherRegistry);
    assert.ok((await load(otherAvatar, otherName, other)).target);
    checkpoint('second authenticated store remains authorized through first-store revocations, corruption and pending restart', { otherStoreId: otherCatalog.storeId });
    h.evidence.lifecycle = { recommendation: 'REVISE', unknownWriterGuarantee: 'BLOCKED', groupPolicy: 'REFUSED',
        policy: 'Permanent affected-scope revocation; chat-specific Data Maid/observed drift; all existing scopes on character import; store-wide pending on failed native save finalization.' };
}
