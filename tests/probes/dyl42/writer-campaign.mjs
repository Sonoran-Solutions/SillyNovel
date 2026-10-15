import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Runs only inside the DYL-28 owned-host harness, after every inherited check passes.
export async function run(h) {
    const { first, firstPage: page, registry, userRoot, visualFile, chatFile, checkpoint, runId, avatarA,
        avatarB, chatMessages, pageState, hash, evidence } = h;
    const owner = 'default-user';
    const recordBytes = chat => fs.readFileSync(visualFile(owner, chat.chatId), 'utf8');
    const entry = (avatar, name) => registry(owner).chats.find(c => !c.deleted
        && c.relativePath === `chats/${avatar.replace('.png', '')}/${name}.jsonl`);
    const raw = chat => fs.readFileSync(chatFile(owner, chat.relativePath), 'utf8');
    const load = async (avatar, name, client = first) => {
        const clientId = (await client.api('client')).clientId;
        const envelope = await client.request('/api/chats/get', { avatar_url: avatar, file_name: name,
            dyl28ClientId: clientId, dyl28Sequence: 1 });
        const target = envelope.identity ? await client.api('accept-load', { clientId, sequence: 1,
            loadRequestId: envelope.loadRequestId }) : null;
        return { clientId, envelope, target };
    };
    const refuseCas = async (target, expectedRevision = 0, client = first) => {
        const result = await client.api('cas', { target, expectedRevision, record: { background: 'forest' } }, 400);
        assert.equal(result.error, 'INVALID_TARGET');
        return result;
    };
    async function upload(client, route, avatar, label, text, fields = {}) {
        const body = new FormData();
        body.set('avatar', new Blob([text], { type: 'application/json' }), 'synthetic.jsonl');
        if (avatar) body.set('avatar_url', avatar);
        body.set('file_type', 'jsonl'); body.set('character_name', label); body.set('user_name', 'Synthetic');
        for (const [key, value] of Object.entries(fields)) body.set(key, value);
        return client.request(route, body);
    }
    async function imported(avatar, label, text, client = first, fields) {
        const response = await upload(client, '/api/chats/import', avatar, label, text, fields);
        assert.equal(response.res, true);
        assert.equal(response.fileNames.length, 1);
        return response.fileNames[0].replace(/\.jsonl$/, '');
    }
    const parentName = `WriterParent-${runId}`;
    const messages = chatMessages('Original writer parent.');
    messages.push({ name: 'Mira', is_user: false, mes: 'Older branch point.', extra: {} },
        { name: 'Mira', is_user: false, mes: 'Parent-only tail.', extra: {} });
    await first.request('/api/chats/save', { avatar_url: avatarA, file_name: parentName, chat: messages });
    const parent = entry(avatarA, parentName);
    const p = await load(avatarA, parentName);
    const parentSourceBeforeVisual = raw(parent);
    const parentVisual = await first.api('cas', { target: p.target, expectedRevision: 0, record: { background: 'tavern' } });
    assert.equal(raw(parent), parentSourceBeforeVisual);
    const forged = JSON.parse(JSON.stringify(messages));
    Object.assign(forged[0].chat_metadata, { chatId: parent.chatId, storeId: p.target.storeId, sourceRevision: 900,
        main_chat: '../../forged-parent', sillynovel: { target: p.target } });
    const text = forged.map(m => JSON.stringify(m)).join('\n');
    const i1 = await imported(avatarA, 'ImportOne', text);
    const i2 = await imported(avatarA, 'ImportTwo', text);
    const i3 = await imported(avatarB, 'ImportOne', text);
    const imports = [entry(avatarA, i1), entry(avatarA, i2), entry(avatarB, i3)];
    assert.equal(new Set([parent.chatId, ...imports.map(c => c.chatId)]).size, 4);
    assert.equal(new Set(imports.map(c => hash(raw(c)))).size, 1);
    assert.notEqual(imports[0].scopeId, imports[2].scopeId);
    for (const [index, c] of imports.entries()) {
        assert.equal(c.sourceRevision, 1);
        assert.equal(c.seal.sha256, hash(raw(c)));
        assert.deepEqual(JSON.parse(recordBytes(c)).record, { background: null });
        const loaded = await load(index === 2 ? avatarB : avatarA, [i1, i2, i3][index]);
        assert.equal(loaded.target.chatId, c.chatId);
        assert.equal(loaded.target.sourceRevision, 1);
        assert.equal(loaded.envelope.messages[0].chat_metadata.sourceRevision, 900);
        const sourceBeforeVisual = raw(c);
        const saved = await first.api('cas', { target: loaded.target, expectedRevision: 0, record: { background: 'forest' } });
        assert.equal(saved.revision, 1);
        assert.equal(raw(c), sourceBeforeVisual);
        assert.equal(entry(index === 2 ? avatarB : avatarA, [i1, i2, i3][index]).sourceRevision, 1);
        assert.deepEqual(await first.api('cas', { target: { ...p.target, scopeId: c.scopeId, chatId: c.chatId }, expectedRevision: 0,
            record: { background: 'forest' } }, 409), { error: 'STALE_VIEW' });
    }
    assert.equal(JSON.parse(recordBytes(parent)).revision, parentVisual.revision);
    checkpoint('native JSONL imports: identical bytes, duplicate card labels and forged IDs allocate fresh scoped identities without visual inheritance', 'EXPERIMENTAL_HOST', { imports, forgedMetadata: forged[0], originalTarget: p.target });

    const browserImport = await page.evaluate(async ({ avatar, text }) => {
        const form = new FormData();
        form.set('avatar', new Blob([text]), 'synthetic-browser.jsonl');
        form.set('avatar_url', avatar); form.set('file_type', 'jsonl');
        form.set('character_name', 'BrowserImport'); form.set('user_name', 'Synthetic');
        const host = await import('/script.js');
        const names = await host.importCharacterChat(form, { refresh: false });
        await host.openCharacterChat(names[0].replace(/\.jsonl$/, ''));
        return names;
    }, { avatar: avatarA, text });
    assert.equal(browserImport.length, 1);
    assert.equal((await pageState(page)).target.chatId,
        entry(avatarA, browserImport[0].replace(/\.jsonl$/, '')).chatId);
    checkpoint('native browser importCharacterChat and openCharacterChat resolve the new imported transcript envelope', 'NATIVE_HOST_UI', { browserImport, page: await pageState(page) });

    const normalName = await imported(avatarA, 'NormalImport', messages.map(m => JSON.stringify(m)).join('\n'));
    assert.equal((await load(avatarA, normalName)).target.sourceRevision, 1);
    const malformed = await upload(first, '/api/chats/import', avatarA, 'BadHeader', '{bad json');
    assert.equal(malformed.error, true);
    assert.equal(entry(avatarA, 'BadHeader'), undefined);
    const other = h.session(); await other.login(h.otherHandle);
    const foreignName = await imported(avatarA, 'ForeignOwner', text, other, { storeId: p.target.storeId, owner: owner });
    assert.equal(entry(avatarA, foreignName), undefined);
    const foreign = await load(avatarA, foreignName, other);
    assert.notEqual(foreign.target.storeId, p.target.storeId);
    assert.notEqual(foreign.target.chatId, parent.chatId);
    assert.deepEqual(await other.api('cas', { target: p.target, expectedRevision: parentVisual.revision,
        record: { background: 'forest' } }, 403), { error: 'WRONG_STORE' });
    checkpoint('normal native import, malformed header refusal and forged owner fields remain authenticated-store scoped', 'EXPERIMENTAL_HOST', { malformed, foreignEnvelope: foreign.envelope });

    // A byte-identical save refreshes the atomic-file seal, without inventing a source change.
    const beforeNoop = await load(avatarA, parentName);
    const unchanged = raw(parent);
    await first.request('/api/chats/save', { avatar_url: avatarA, file_name: parentName, chat: messages });
    assert.equal(raw(parent), unchanged);
    assert.equal(entry(avatarA, parentName).sourceRevision, 1);
    await first.api('read', { target: beforeNoop.target });
    const editLoad = await load(avatarA, parentName);
    const ticketClient = (await first.api('client')).clientId;
    const ticket = await first.request('/api/chats/get', { avatar_url: avatarA, file_name: parentName,
        dyl28ClientId: ticketClient, dyl28Sequence: 1 });
    messages[1].mes = 'Edited writer parent.';
    await first.request('/api/chats/save', { avatar_url: avatarA, file_name: parentName, chat: messages });
    assert.equal(entry(avatarA, parentName).sourceRevision, 2);
    assert.notEqual(hash(raw(parent)), hash(unchanged));
    assert.deepEqual(await first.api('cas', { target: editLoad.target, expectedRevision: parentVisual.revision,
        record: { background: 'forest' } }, 409), { error: 'SOURCE_REVISION_MISMATCH' });
    assert.deepEqual(await first.api('accept-load', { clientId: ticketClient, sequence: 1,
        loadRequestId: ticket.loadRequestId }, 409), { error: 'SOURCE_REVISION_MISMATCH' });
    checkpoint('canonical save advances only changed bytes; overlapping old source CAS and pending load ticket refuse after edit', 'EXPERIMENTAL_HOST', { noOpTarget: beforeNoop.target, oldLoad: ticket, current: await load(avatarA, parentName) });

    // Real native save-as and bookmark/branch functions, not filesystem copies.
    await page.evaluate(async name => (await import('/script.js')).openCharacterChat(name), parentName);
    const copyName = `IdenticalCopy-${runId}`;
    await page.evaluate(async name => {
        const host = await import('/script.js');
        await host.saveChat(); // Normalize native header once before comparing an unchanged copy.
        await host.saveChat({ chatName: name });
    }, copyName);
    const liveParent = entry(avatarA, parentName), copy = entry(avatarA, copyName);
    assert.ok(copy);
    assert.notEqual(copy.chatId, parent.chatId);
    assert.equal(raw(copy), raw(liveParent));
    assert.equal(copy.sourceRevision, 1);
    const currentParent = await load(avatarA, parentName);
    const branches = [];
    for (let n = 0; n < 2; n++) {
        await page.evaluate(async name => (await import('/script.js')).openCharacterChat(name), parentName);
        const parentVisit = (await pageState(page)).target;
        const name = await page.evaluate(async () => (await import('/scripts/bookmarks.js')).branchChat(1));
        const parentRefusal = await h.uiApi(page, 'cas', { target: parentVisit, expectedRevision: parentVisual.revision,
            record: { background: 'forest' } }, 409);
        assert.ok(['STALE_VIEW', 'SOURCE_REVISION_MISMATCH'].includes(parentRefusal.error));
        assert.ok(name);
        const c = entry(avatarA, name);
        assert.ok(c); assert.notEqual(c.chatId, parent.chatId); assert.equal(c.sourceRevision, 1);
        assert.equal((await pageState(page)).target.chatId, c.chatId);
        assert.equal((await pageState(page)).messages.length, 2);
        assert.deepEqual(JSON.parse(recordBytes(c)).record, { background: null });
        branches.push({ name, ...c });
    }
    assert.notEqual(branches[0].relativePath, branches[1].relativePath);
    assert.notEqual(branches[0].chatId, branches[1].chatId);
    const branchTarget = (await pageState(page)).target;
    await page.evaluate(async () => {
        const host = await import('/script.js');
        SillyTavern.getContext().chat[0].mes = 'Branch-only edit.';
        await host.saveChat(); await host.getChat();
    });
    assert.equal(entry(avatarA, branches[1].name).sourceRevision, 2);
    assert.deepEqual(await h.uiApi(page, 'cas', { target: branchTarget, expectedRevision: 0,
        record: { background: 'forest' } }, 409), { error: 'SOURCE_REVISION_MISMATCH' });
    assert.equal(JSON.parse(recordBytes(parent)).revision, parentVisual.revision);
    const parentRevision = entry(avatarA, parentName).sourceRevision;
    await page.evaluate(async name => (await import('/script.js')).openCharacterChat(name), parentName);
    assert.equal((await pageState(page)).target.chatId, parent.chatId);
    assert.equal(entry(avatarA, parentName).sourceRevision, parentRevision);
    const copiedLoad = await load(avatarA, copyName);
    assert.deepEqual(await first.api('cas', { target: { ...currentParent.target, chatId: copy.chatId, sourceRevision: copy.sourceRevision }, expectedRevision: 0,
        record: { background: 'forest' } }, 409), { error: 'STALE_VIEW' });
    checkpoint('native save-as identical copy and two older-message branches: unique IDs, collision suffixes, independent edits and parent navigation', 'NATIVE_HOST_UI', { copy, branches, parentTarget: currentParent.target, copiedTarget: copiedLoad.target, page: await pageState(page) });

    // Real native generation/swipe functions use the deterministic loopback provider.
    await page.locator('#API-status-top').click();
    await page.locator('#api_button_openai').click();
    await page.locator('#send_but').waitFor({ state: 'visible' });
    await page.locator('#API-status-top').click();
    for (const type of ['swipe', 'continue', 'regenerate']) {
        const before = entry(avatarA, parentName);
        const beforeBytes = raw(before);
        const beforeVisit = (await pageState(page)).target;
        await page.evaluate(async type => {
            const host = await import('/script.js');
            await host.Generate(type); await host.saveChat();
        }, type);
        const after = entry(avatarA, parentName);
        assert.match(raw(after), /Synthetic DYL28 reply/);
        assert.notEqual(raw(after), beforeBytes);
        assert.ok(after.sourceRevision > before.sourceRevision);
        assert.deepEqual(await h.uiApi(page, 'cas', { target: beforeVisit, expectedRevision: parentVisual.revision,
            record: { background: 'forest' } }, 409), { error: 'SOURCE_REVISION_MISMATCH' });
        await page.evaluate(async () => (await import('/script.js')).getChat());
        assert.equal((await pageState(page)).target.sourceRevision, after.sourceRevision);
        checkpoint(`native ${type} commits changed canonical bytes and refuses the previous source visit`, 'NATIVE_HOST_UI', {
            beforeSha256: hash(beforeBytes), beforeRevision: before.sourceRevision, afterSha256: hash(raw(after)),
            afterRevision: after.sourceRevision, page: await pageState(page) });
    }
    const beforeSwipe = entry(avatarA, parentName);
    const beforeSwipeBytes = raw(beforeSwipe);
    await page.evaluate(async () => {
        const host = await import('/script.js');
        await host.swipe_left(null); await host.saveChat(); await host.getChat();
    });
    const afterSwipe = entry(avatarA, parentName);
    assert.equal(afterSwipe.sourceRevision > beforeSwipe.sourceRevision, raw(afterSwipe) !== beforeSwipeBytes);
    checkpoint('native selected-swipe save revision follows actual committed byte change', 'NATIVE_HOST_UI', {
        beforeRevision: beforeSwipe.sourceRevision, afterRevision: afterSwipe.sourceRevision,
        changed: raw(afterSwipe) !== beforeSwipeBytes, page: await pageState(page) });

    // Native group data and transcript paths keep working; no group identities are allocated.
    const members = [avatarA, avatarB];
    for (const label of ['Rowan', 'Sage']) members.push(await first.request('/api/characters/create', {
        ch_name: `${label}-${runId}`, first_mes: 'Synthetic group greeting.' }));
    const group = await first.request('/api/groups/create', { name: `WriterGroup-${runId}`, members });
    const groupMessages = chatMessages('Group canonical transcript.');
    await first.request('/api/chats/group/save', { id: group.chat_id, chat: groupMessages });
    assert.deepEqual(await first.request('/api/chats/group/get', { id: group.chat_id }), groupMessages);
    assert.deepEqual(await other.request('/api/chats/group/get', { id: group.chat_id }), []);
    const groupPath = path.join(userRoot(owner), 'group chats', `${group.chat_id}.jsonl`);
    assert.ok(fs.existsSync(groupPath));
    const groupBefore = hash(fs.readFileSync(groupPath));
    const priorVisit = (await pageState(page)).target;
    await page.evaluate(async id => {
        const host = await import('/script.js'); await host.getCharacters();
        await (await import('/scripts/group-chats.js')).openGroupById(id);
    }, group.id);
    assert.equal((await pageState(page)).target, null);
    assert.deepEqual(await h.uiApi(page, 'cas', { target: priorVisit, expectedRevision: parentVisual.revision,
        record: { background: 'forest' } }, 409), { error: 'STALE_VIEW' });
    await page.evaluate(async () => {
        SillyTavern.getContext().chat[0].mes = 'Group native edited message.';
        await (await import('/script.js')).saveChatConditional();
    });
    assert.notEqual(hash(fs.readFileSync(groupPath)), groupBefore);
    assert.match(fs.readFileSync(groupPath, 'utf8'), /Group native edited message/);
    group.members = members.slice(1);
    await first.request('/api/groups/edit', group);
    assert.deepEqual((await first.request('/api/groups/all', {})).find(g => g.id === group.id).members, group.members);
    const importedGroup = await upload(first, '/api/chats/group/import', null, 'unused', text);
    assert.ok(importedGroup.res);
    group.chats.push(importedGroup.res);
    await first.request('/api/groups/edit', group);
    await page.evaluate(async ({ id, chat }) => {
        await (await import('/script.js')).getCharacters();
        await (await import('/scripts/group-chats.js')).openGroupChat(id, chat);
    }, { id: group.id, chat: importedGroup.res });
    assert.equal((await pageState(page)).target, null);
    assert.equal((await pageState(page)).messages.length, 3);
    await page.evaluate(async id => (await import('/scripts/group-chats.js')).createNewGroupChat(id), group.id);
    assert.equal((await pageState(page)).target, null);
    assert.ok(!registry(owner).chats.some(c => c.relativePath.startsWith('group chats/')));
    await first.request('/api/chats/group/delete', { id: group.chat_id });
    await first.request('/api/chats/group/save', { id: group.chat_id, chat: groupMessages });
    assert.deepEqual(await first.request('/api/chats/group/get', { id: group.chat_id }), groupMessages);
    checkpoint('four-member duplicate-label group: create/save/load/edit/membership/import/switch/new/delete-recreate preserve native behavior and refuse visual authority', 'NATIVE_HOST_UI + EXPERIMENTAL_HOST', { group, importedGroup, groupSource: fs.readFileSync(groupPath, 'utf8'), groupSha256: hash(fs.readFileSync(groupPath)), page: await pageState(page), policy: 'All group persistent visuals refused; no membership or actor identity inferred.' });

    // An actual collision uses the frozen import clock; native overwrite is preserved, visuals refuse.
    const collisionAvatar = await first.request('/api/characters/create', { ch_name: `Collision-${runId}` });
    const collisionName = await imported(collisionAvatar, 'Collision', text);
    const collisionEntry = entry(collisionAvatar, collisionName);
    const collisionLoad = await load(collisionAvatar, collisionName);
    const collisionVisual = recordBytes(collisionEntry);
    const namespaceRoot = path.dirname(visualFile(owner, collisionEntry.chatId));
    const collisionRegistryBefore = fs.readFileSync(path.join(namespaceRoot, 'identities.json'), 'utf8');
    assert.notEqual(process.getuid?.(), 0, 'invalidation EACCES requires a non-root runner');
    fs.chmodSync(namespaceRoot, 0o500);
    let failedInvalidation;
    try { failedInvalidation = await upload(first, '/api/chats/import', collisionAvatar, 'Collision', text); }
    finally { fs.chmodSync(namespaceRoot, 0o700); }
    assert.equal(failedInvalidation.error, true);
    assert.equal(fs.readFileSync(path.join(namespaceRoot, 'identities.json'), 'utf8'), collisionRegistryBefore);
    assert.equal(raw(collisionEntry), text);
    assert.equal(recordBytes(collisionEntry), collisionVisual);
    await first.api('read', { target: collisionLoad.target }); // Original instance remains valid; no import committed.
    checkpoint('EACCES persisting collision invalidation refuses native overwrite before any source or registry change', 'EXPERIMENTAL_HOST', { failedInvalidation, originalInstance: collisionLoad });
    assert.equal(await imported(collisionAvatar, 'Collision', text), collisionName);
    assert.equal(raw(collisionEntry), text);
    assert.equal((await load(collisionAvatar, collisionName)).envelope.identity, null);
    await refuseCas(collisionLoad.target);
    assert.equal(recordBytes(collisionEntry), collisionVisual);
    checkpoint('native timestamp import collision with identical bytes invalidates scope before overwrite; old CAS cannot inherit or alter visual record', 'EXPERIMENTAL_HOST', { collisionLoad, collisionEntry });

    const driftAvatar = await first.request('/api/characters/create', { ch_name: `Drift-${runId}` });
    const driftName = await imported(driftAvatar, 'DriftCollision', text);
    const driftEntry = entry(driftAvatar, driftName);
    const driftLoad = await load(driftAvatar, driftName);
    const driftVisual = recordBytes(driftEntry);
    fs.appendFileSync(chatFile(owner, driftEntry.relativePath), '\n'); // Deliberate test-only unknown-writer drift.
    assert.equal((await load(driftAvatar, driftName)).envelope.identity, null);
    assert.equal(await imported(driftAvatar, 'DriftCollision', text), driftName);
    assert.equal(raw(driftEntry), text);
    await refuseCas(driftLoad.target);
    assert.equal(recordBytes(driftEntry), driftVisual);
    checkpoint('native collision restoring pre-drift identical bytes cannot resurrect old visual authority', 'EXPERIMENTAL_HOST', { driftLoad, driftEntry });

    // Native delete/recreate gives a fresh ID; retained record never becomes the new record.
    const deletion = await load(avatarA, normalName);
    const oldEntry = entry(avatarA, normalName);
    await first.request('/api/chats/delete', { avatar_url: avatarA, chatfile: `${normalName}.jsonl` });
    await first.request('/api/chats/save', { avatar_url: avatarA, file_name: normalName, chat: messages });
    const recreated = entry(avatarA, normalName);
    assert.notEqual(recreated.chatId, oldEntry.chatId);
    await refuseCas(deletion.target);
    checkpoint('native delete/recreate at the same locator tombstones old identity and allocates an independent revision-one record', 'EXPERIMENTAL_HOST', { oldEntry, recreated });

    // Corrupt/unknown registry and failed canonical write remain explicitly unavailable; no recovery guessed.
    const registryFile = path.join(userRoot(owner), 'sillynovel-dyl27', 'identities.json');
    const cleanRegistry = fs.readFileSync(registryFile, 'utf8');
    const expectedCanonical = raw(entry(avatarA, parentName)).split('\n').map(line => JSON.parse(line));
    for (const state of ['{broken', JSON.stringify({ storeId: 'unknown' })]) {
        fs.writeFileSync(registryFile, state);
        const result = await load(avatarA, parentName);
        assert.equal(result.envelope.identity, null);
        assert.deepEqual(result.envelope.messages, expectedCanonical);
        fs.writeFileSync(registryFile, cleanRegistry); // Test fault restoration, never an automatic recovery path.
    }
    const invalidBodyName = await imported(avatarA, 'MalformedBody', '{"chat_metadata":{}}\nnull', other);
    const invalidBody = await load(avatarA, invalidBodyName, other);
    assert.equal(invalidBody.envelope.identity, null);
    assert.ok(registry(h.otherHandle).pending);
    checkpoint('native importer accepts malformed trailing record but visual registry stays pending and refuses authority', 'EXPERIMENTAL_HOST', { invalidBody });
    const failureAvatar = await first.request('/api/characters/create', { ch_name: `Failure-${runId}` });
    const failureDir = path.join(userRoot(owner), 'chats', failureAvatar.replace('.png', ''));
    assert.notEqual(process.getuid?.(), 0, 'EACCES control requires a non-root runner');
    fs.mkdirSync(failureDir, { recursive: true }); fs.chmodSync(failureDir, 0o500);
    let partial;
    try { partial = await upload(first, '/api/chats/import', failureAvatar, 'CannotWrite', text); }
    finally { fs.chmodSync(failureDir, 0o700); }
    assert.equal(partial.error, true);
    assert.ok(registry(owner).pending);
    assert.equal(fs.readdirSync(failureDir).length, 0);
    assert.equal((await load(avatarA, parentName)).envelope.identity, null);
    checkpoint('unknown/corrupt registry keeps canonical loads readable; real EACCES import leaves pending intent and no canonical file or visual authority', 'EXPERIMENTAL_HOST', { partial, pending: registry(owner).pending });

    const groupHash = hash(fs.readFileSync(groupPath));
    const finalVisual = recordBytes(parent);
    await page.close();
    await h.stopHost(); await h.startHost();
    const restarted = h.session(); await restarted.login(owner);
    assert.equal(hash(fs.readFileSync(groupPath)), groupHash);
    assert.equal(recordBytes(parent), finalVisual);
    assert.deepEqual(await restarted.request('/api/chats/group/get', { id: group.chat_id }), groupMessages);
    assert.equal((await load(avatarA, parentName, restarted)).envelope.identity, null);
    checkpoint('restart retains group canonical bytes, visual bytes and fail-closed pending registry without automatic recovery', 'EXPERIMENTAL_HOST', { groupSha256: groupHash, parentVisualSha256: hash(finalVisual), pending: registry(owner).pending });
    evidence.writerCoverage = { recommendation: 'REVISE', groupPolicy: 'REFUSED', imports: 'SUPPORTED only fresh registered character scope; collisions/refused registry fail closed', branchPolicy: 'fresh IDs; no visual inheritance' };
}
