import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node tests/probes/dyl21/source-inspection.mjs <pinned-SillyTavern-checkout>');
const expectedCommit = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
assert.equal(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expectedCommit,
    'inspection requires SillyTavern 1.19.0 at the pinned commit');

const files = [
    'public/scripts/st-context.js',
    'public/scripts/extensions.js',
    'public/script.js',
    'public/scripts/bookmarks.js',
    'public/scripts/chats.js',
    'src/endpoints/chats.js',
    'src/endpoints/assets.js',
    'src/endpoints/backgrounds.js',
    'src/util.js',
];
const source = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const hash = text => createHash('sha256').update(text).digest('hex');
const context = source['public/scripts/st-context.js'].split('export function getContext()')[1].split('export default getContext')[0];
const debounce = source['public/scripts/extensions.js'].split('export function saveMetadataDebounced()')[1].split('\n}\n')[0];
const save = source['src/endpoints/chats.js'].split("router.post('/save'")[1].split("router.post('/get'")[0];
const conditional = source['public/script.js'].split('export async function saveChatConditional()')[1].split('\n}\n')[0];
const integrity = source['src/endpoints/chats.js'].split('async function checkChatIntegrity')[1].split('\n}\n')[0];
const background = source['src/endpoints/backgrounds.js'].split("router.post('/upload'")[1].split("router.post('")[0];
const assetDownload = source['src/endpoints/assets.js'].split("router.post('/download'")[1].split("router.post('")[0];
const writeHelper = source['src/util.js'].split('export function tryWriteFileSync(filePath, data)')[1].split('\n}\n')[0];

assert.match(context, /characterId:\s*this_chid/);
assert.match(context, /groupId:\s*selected_group/);
assert.match(context, /chatId:\s*selected_group/);
assert.doesNotMatch(context, /\b(?:accountId|userId|profileId|characterUuid)\s*:/);
assert.doesNotMatch(debounce, /chatId/);
assert.match(debounce, /await newContext\.saveMetadata\(\)/);
assert.doesNotMatch(debounce, /return\s+new Promise/);
assert.match(conditional, /await saveGroupChat\(selected_group, true\)/);
assert.match(conditional, /await saveChat\(\)/);
assert.match(conditional, /catch \(error\)/);
assert.match(save, /request\.user\.directories\.chats/);
assert.match(save, /request\.body\.avatar_url/);
assert.match(save, /request\.body\.file_name/);
assert.match(save, /await trySaveChat\(chatData, chatFilePath, request\.body\.force/);
assert.match(save, /response\.send\(\{ ok: true \}\)/);
assert.match(writeHelper, /writeFileAtomicSync\(filePath, data, 'utf8'\)/);
assert.match(integrity, /chatIntegrity === integritySlug/);
assert.doesNotMatch(integrity, /revision|compareAndSwap|expectedRevision/);
assert.match(background, /request\.user\.directories\.backgrounds/);
assert.match(background, /sanitize\(request\.file\.originalname\)/);
assert.match(background, /fs\.copyFileSync\(img_path/);
assert.match(assetDownload, /validateAssetFileName/);
assert.match(assetDownload, /fs\.copyFileSync\(temp_path, file_path\)/);

console.log(JSON.stringify({
    result: 'SOURCE_INSPECTION_PASS',
    hostCommit: expectedCommit,
    sourceSha256: Object.fromEntries(files.map(file => [file, hash(source[file])])),
    findings: [
        'extension context exposes session locators, not explicit user/profile or stable character IDs',
        'public metadata debounce does not capture chatId or return completion; saveMetadata uses active chat',
        'low-level chat route accepts explicit card/chat selectors and returns after a whole-array write',
        'chat integrity compares a stable token, not an expected record revision',
        'host background and asset import paths are mutable filename destinations',
    ],
}));
