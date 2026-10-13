import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(process.argv[2]);
const sha = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
assert.equal(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sha);
const files = {
    'src/endpoints/chats.js': /router.post|function trySaveChat|tryWriteFileSync|copyFileSync|unlinkSync|writeFileAtomicSync/,
    'src/endpoints/characters.js': /router.post|writeCharacterData|oldChatsPath|newChatsPath|copyFileSync/,
    'src/endpoints/groups.js': /router.post|writeFileAtomic|unlinkSync/,
    'src/users.js': /requireLoginMiddleware|request.user =|getUserDirectories/,
    'src/util.js': /function tryWriteFileSync|writeFileAtomicSync/,
    'public/script.js': /function (getChat|getChatResult|openCharacterChat|clearChat|doNewChat|newAssistantChat|saveChat|renameChat)|CHAT_CHANGED|MESSAGE_EDITED|MESSAGE_SWIPED/,
    'public/scripts/bookmarks.js': /function createBranch|function createNewBookmark|saveChat|integrity/,
    'public/scripts/chats.js': /NEUTRAL_CHAT_KEY|function preserveNeutralChat|function restoreNeutralChat/,
    'public/scripts/group-chats.js': /function (getGroupChat|createNewGroupChat|saveGroupChat)|CHAT_CHANGED|api\/groups\/edit/,
};
const result = { hostSha: sha, classification: 'SOURCE_INSPECTION', files: {} };
for (const [file, pattern] of Object.entries(files)) {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.deepEqual(bytes, execFileSync('git', ['-C', root, 'show', `${sha}:${file}`], { maxBuffer: 8e6 }));
    result.files[file] = { sha256: createHash('sha256').update(bytes).digest('hex'), locations: bytes.toString().split('\n').flatMap((line, i) => pattern.test(line) ? [{ line: i + 1, text: line.trim() }] : []) };
}
console.log(JSON.stringify(result, null, 2));
