import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const hostSha = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const source = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node tests/probes/dyl28/source-inspection.mjs <pinned-host-checkout>');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [
    'public/script.js',
    'public/scripts/bookmarks.js',
    'public/scripts/chats.js',
    'src/endpoints/chats.js',
    'src/endpoints/characters.js',
    'src/endpoints/groups.js',
];
const contents = new Map(files.map(file => {
    const bytes = fs.readFileSync(path.join(source, file));
    return [file, { bytes, lines: bytes.toString('utf8').split('\n') }];
}));
const needles = [
    ['src/endpoints/chats.js', "router.post('/save'", 'native character-chat save route'],
    ['src/endpoints/chats.js', "router.post('/get'", 'native character-chat load route'],
    ['src/endpoints/chats.js', "router.post('/rename'", 'native character-chat rename route'],
    ['src/endpoints/chats.js', "router.post('/delete'", 'native character-chat delete route'],
    ['src/endpoints/chats.js', "router.post('/import'", 'native character-chat import route'],
    ['src/endpoints/chats.js', "router.post('/group/get'", 'native group-chat load route'],
    ['src/endpoints/chats.js', "router.post('/group/save'", 'native group-chat save route'],
    ['src/endpoints/chats.js', 'export async function trySaveChat', 'shared chat file writer'],
    ['public/script.js', 'export async function clearChat', 'native conversation clear'],
    ['public/script.js', 'export async function getChat()', 'browser transcript request and global commit'],
    ['public/script.js', 'async function getChatResult()', 'prompt/render/event continuation after load'],
    ['public/script.js', 'export async function openCharacterChat', 'past-chat selection'],
    ['public/script.js', 'export async function doNewChat', 'new character chat selection'],
    ['public/script.js', 'export async function newAssistantChat', 'Temporary Chat transition'],
    ['public/script.js', 'export async function saveChatConditional', 'browser save entry'],
    ['public/scripts/bookmarks.js', 'export async function createBranch', 'branch snapshot creation'],
    ['public/scripts/bookmarks.js', 'export async function branchChat', 'branch navigation'],
    ['src/endpoints/characters.js', "router.post('/rename'", 'character rename'],
    ['src/endpoints/characters.js', "router.post('/delete'", 'character delete'],
    ['src/endpoints/characters.js', "router.post('/import'", 'character import'],
];
function findLine(file, needle) {
    const { lines } = contents.get(file);
    const index = lines.findIndex(line => line.includes(needle));
    assert.notEqual(index, -1, `${file} contains ${needle}`);
    return index + 1;
}
function excerpt(file, line, before = 4, after = 10) {
    const lines = contents.get(file).lines;
    const start = Math.max(1, line - before);
    const end = Math.min(lines.length, line + after);
    return { file, startLine: start, endLine: end, text: lines.slice(start - 1, end).join('\n') };
}
const excerpts = needles.map(([file, needle, label]) => {
    const line = findLine(file, needle);
    return { label, line, ...excerpt(file, line) };
});
const writerCalls = contents.get('src/endpoints/chats.js').lines.flatMap((line, index) =>
    line.includes('trySaveChat(') ? [{ file: 'src/endpoints/chats.js', line: index + 1, text: line.trim() }] : []);
const writers = contents.get('src/endpoints/chats.js').lines.flatMap((line, index) =>
    /writeFileAtomicSync\(|tryWriteFileSync\(|copyFileSync\(|unlinkSync\(/.test(line)
        ? [{ file: 'src/endpoints/chats.js', line: index + 1, text: line.trim() }] : []);
const output = {
    pinnedHost: { version: '1.19.0', commit: hostSha, verifiedBy: 'host-probe.mjs uses git rev-parse and rejects any other checkout' },
    files: Object.fromEntries(files.map(file => [file, { sha256: hash(contents.get(file).bytes), lines: contents.get(file).lines.length }])),
    excerpts,
    trySaveChatCallSites: writerCalls,
    directWriteAndRenameSites: writers,
    scope: 'Inspection of pristine pinned source. It does not modify or launch this checkout.',
};
process.stdout.write(JSON.stringify(output, null, 2) + '\n');
