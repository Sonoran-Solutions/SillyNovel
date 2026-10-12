import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) {
    throw new Error('Usage: node tests/probes/dyl19/source-inspection.mjs <pinned-SillyTavern-checkout>');
}

const expectedCommit = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const actualCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(actualCommit, expectedCommit, 'probe requires the pinned SillyTavern commit');

const files = [
    'public/scripts/st-context.js',
    'public/scripts/extensions.js',
    'public/script.js',
    'public/scripts/bookmarks.js',
    'public/scripts/chats.js',
    'public/scripts/group-chats.js',
    'src/endpoints/chats.js',
    'src/endpoints/assets.js',
    'src/endpoints/backgrounds.js',
];
const source = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const hash = text => createHash('sha256').update(text).digest('hex');
const expect = (condition, message) => assert.ok(condition, message);

const context = source['public/scripts/st-context.js'].split('export function getContext()')[1].split('export default getContext')[0];
expect(context.includes('characterId: this_chid'), 'public context exposes character array index');
expect(context.includes('groupId: selected_group'), 'public context exposes selected group id');
expect(context.includes('chatId: selected_group'), 'public context exposes active chat id/filename');
expect(!/\b(?:accountId|userId|profileId)\s*:/.test(context), 'public context has no explicit account/user key');
expect(!/\bcharacterUuid\s*:/.test(context), 'public context has no stable character UUID field');

const extensionSource = source['public/scripts/extensions.js'];
const debounce = extensionSource.split('export function saveMetadataDebounced()')[1].split('\n}\n')[0];
expect(debounce.includes('context.groupId') && debounce.includes('context.characterId'), 'debounced save captures group and character indices');
expect(!debounce.includes('chatId'), 'debounced save does not capture or compare the chat id');
expect(debounce.includes('await newContext.saveMetadata()'), 'debounced callback invokes active-context save');
expect(!/return\s+new Promise/.test(debounce), 'debounced helper returns before its timer callback completes');

const script = source['public/script.js'];
const saveMetadata = script.split('export async function saveMetadata()')[1].split('\n}\n')[0];
const saveConditional = script.split('export async function saveChatConditional()')[1].split('\n}\n')[0];
expect(saveMetadata.includes('return await saveChatConditional()'), 'public saveMetadata delegates to the active-chat saver');
expect(!/saveMetadata\s*\([^)]*chat/i.test(saveMetadata), 'saveMetadata has no target-chat argument');
expect(saveConditional.includes('if (selected_group)') && saveConditional.includes('await saveGroupChat(selected_group, true)'), 'active group is selected when save runs');
expect(saveConditional.includes('await saveChat()'), 'active character chat is selected when save runs');
expect(saveConditional.includes('catch (error)') && saveConditional.includes('console.error'), 'save errors are caught rather than rethrown');

const bookmarks = source['public/scripts/bookmarks.js'];
const branch = bookmarks.split('export async function createBranch(')[1].split('\n}\n')[0];
expect(branch.includes('integrity: uuidv4()'), 'native branch operation mints a new chat integrity token');
expect(branch.includes('saveChat({ chatName: name, withMetadata: newMetadata, mesId, chatData: branchChatSnapshot })'), 'native branch writes a prefix snapshot under its own filename');
const chatModule = source['public/scripts/chats.js'];
expect(chatModule.includes("const NEUTRAL_CHAT_KEY = 'neutralChat'"), 'Temporary Chat uses a separate session key');
expect(chatModule.includes('sessionStorage.setItem(NEUTRAL_CHAT_KEY'), 'Temporary Chat state is held in sessionStorage');
expect(chatModule.includes('sessionStorage.removeItem(NEUTRAL_CHAT_KEY)'), 'Temporary Chat state is removed on restore');

const chats = source['src/endpoints/chats.js'];
const chatSaveRoute = chats.split("router.post('/save'")[1].split("router.post('/get'")[0];
expect(chatSaveRoute.includes('request.user.directories.chats'), 'chat persistence is rooted under the current host user directories');
expect(chatSaveRoute.includes('String(request.body.avatar_url).replace'), 'character chat path uses the host avatar/card filename');
expect(chatSaveRoute.includes('`${String(request.body.file_name)}.jsonl`'), 'character chat filename is separate from its card directory');

const assets = source['src/endpoints/assets.js'];
for (const route of ['/get', '/download', '/delete']) {
    const body = assets.split(`router.post('${route}'`)[1]?.split("router.post('")[0] ?? '';
    expect(body.includes('request.user.directories.assets'), `${route} uses the current host user asset directory`);
}
expect(assets.includes('fs.copyFileSync(temp_path, file_path)'), 'asset download copies into a mutable named path');
expect(assets.includes('await fs.promises.unlink(file_path)'), 'asset removal deletes a named file');
const backgroundUpload = source['src/endpoints/backgrounds.js'].split("router.post('/upload'")[1].split("router.post('")[0];
expect(backgroundUpload.includes('request.user.directories.backgrounds'), 'background upload uses the current host user background directory');
expect(backgroundUpload.includes('sanitize(request.file.originalname)'), 'background upload sanitizes the supplied filename');
expect(backgroundUpload.includes('fs.copyFileSync(img_path'), 'background upload overwrites/copies by filename without immutable revisions');

console.log(JSON.stringify({
    result: 'PASS',
    hostCommit: actualCommit,
    sourceSha256: Object.fromEntries(files.map(file => [file, hash(source[file])])),
    findings: [
        'context lacks explicit user/account and stable card keys',
        'saveMetadata targets active chat; debounced helper omits chatId and returns before completion',
        'host chat integrity token guards writes but is regenerated for branches and is not a universal owner identity',
        'Temporary Chat state is sessionStorage-backed and does not use a persistent chat filename',
        'chat and asset routes resolve paths beneath current host user directories',
        'host asset paths are mutable filename stores without immutable revision ownership',
    ],
}));
