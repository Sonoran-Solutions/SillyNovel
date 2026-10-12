import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupOwnedAssets, cleanupOwnedChats, createOwnedAsset, createOwnedChats } from './owned-chat-probe.mjs';

test('a pre-existing owner record survives a collision refusal and cleanup', async () => {
    const filename = 'DYL19-collision';
    const existingRecord = [{ mes: 'pre-existing record; must survive' }];
    const records = new Map([['Mira1.png/DYL19-collision', structuredClone(existingRecord)]]);
    const deleted = [];
    const ownedChats = [];
    const getChat = async (owner, name) => structuredClone(records.get(`${owner}/${name}`) ?? []);
    const saveChat = async (owner, name, record) => records.set(`${owner}/${name}`, record);
    const removeChat = async (owner, name) => {
        deleted.push(`${owner}/${name}`);
        records.delete(`${owner}/${name}`);
    };

    await assert.rejects(createOwnedChats({
        owners: ['Mira.png', 'Mira1.png'],
        filename,
        marker: owner => [{ mes: `new record for ${owner}` }],
        getChat,
        saveChat,
        ownedChats,
    }), /already exists; refusing to overwrite/);
    await cleanupOwnedChats(ownedChats, removeChat);

    assert.deepEqual(deleted, [], 'the preflight collision never entered the cleanup ownership list');
    assert.deepEqual(records.get(`Mira1.png/${filename}`), existingRecord);
    assert.equal(records.has(`Mira.png/${filename}`), false, 'preflight checks every owner before writing any');
});

test('cleanup deletes only records whose create call completed successfully', async () => {
    const ownedChats = [];
    const removed = [];
    await createOwnedChats({
        owners: ['Mira.png', 'Mira1.png'],
        filename: 'DYL19-owned',
        marker: owner => [{ mes: owner }],
        getChat: async () => [],
        saveChat: async owner => { if (owner === 'Mira1.png') throw new Error('write failed'); },
        ownedChats,
    }).catch(() => {});
    await cleanupOwnedChats(ownedChats, async (owner, filename) => removed.push(`${owner}/${filename}`));
    assert.deepEqual(removed, ['Mira.png/DYL19-owned']);
});

test('a pre-existing asset survives a collision refusal and cleanup', async () => {
    const filename = 'DYL19-collision.png';
    const existingAsset = { filename, sha256: 'pre-existing-bytes' };
    const assets = [existingAsset];
    const ownedAssets = new Set();
    const actions = [];

    await assert.rejects(createOwnedAsset({
        filename,
        getAssets: async () => assets,
        uploadAsset: async () => actions.push('upload'),
        ownedAssets,
    }), /already exists; refusing to overwrite/);
    await cleanupOwnedAssets(ownedAssets, async name => {
        actions.push(`delete:${name}`);
        assets.splice(assets.findIndex(asset => asset.filename === name), 1);
    });

    assert.deepEqual(actions, []);
    assert.deepEqual(assets, [existingAsset]);
});
