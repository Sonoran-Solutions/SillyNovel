import assert from 'node:assert/strict';

export async function createOwnedChats({ owners, filename, marker, getChat, saveChat, ownedChats }) {
    // Preflight every owner before writing any record; a collision never becomes ours to clean.
    for (const avatarUrl of owners) {
        const existing = await getChat(avatarUrl, filename);
        assert.ok(Array.isArray(existing) ? existing.length === 0 : Object.keys(existing).length === 0,
            `${avatarUrl}/${filename} already exists; refusing to overwrite`);
    }

    for (const avatarUrl of owners) {
        await saveChat(avatarUrl, filename, marker(avatarUrl));
        ownedChats.push({ avatarUrl, filename });
    }
}

export async function cleanupOwnedChats(ownedChats, removeChat) {
    const resources = ownedChats.splice(0);
    for (const { avatarUrl, filename } of resources) {
        await removeChat(avatarUrl, filename);
    }
}

export async function createOwnedAsset({ filename, getAssets, uploadAsset, ownedAssets }) {
    const images = await getAssets();
    assert.ok(!images.some(image => image.filename === filename), `${filename} already exists; refusing to overwrite`);
    await uploadAsset();
    ownedAssets.add(filename);
}

export async function cleanupOwnedAssets(ownedAssets, removeAsset) {
    const resources = [...ownedAssets];
    ownedAssets.clear();
    for (const filename of resources) await removeAsset(filename);
}
