import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const sha = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
const root = process.argv[2];
assert.equal(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sha);
const files = ['src/endpoints/chats.js', 'src/endpoints/groups.js', 'src/endpoints/characters.js', 'src/util.js',
    'src/users.js', 'src/server-main.js', 'public/script.js', 'public/scripts/bookmarks.js',
    'public/scripts/chats.js', 'public/scripts/group-chats.js', 'src/endpoints/data-maid.js',
    'src/endpoints/users-private.js', 'src/endpoints/users-admin.js', 'public/scripts/data-maid.js', 'public/scripts/user.js'];
const result = { sha, classification: 'SOURCE_INSPECTION', files: {} };
for (const file of files) {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.deepEqual(bytes, execFileSync('git', ['-C', root, 'show', `${sha}:${file}`], { maxBuffer: 8e6 }));
    const lines = bytes.toString().split('\n');
    result.files[file] = { sha256: createHash('sha256').update(bytes).digest('hex'), locations: lines.flatMap((line, i) =>
        /router.post|writeFile|copyFile|renameSync|unlinkSync|trySaveChat|tryDeleteFile|api\/chats|api\/groups|function (importChat|createBranch|branchChat|saveChat|saveGroup|createNewGroup|openGroup|Generate|swipe|renameChat)|request.user =/.test(line)
            ? [{ line: i + 1, text: lines.slice(Math.max(0, i - 1), i + 3).join('\n') }] : []) };
}
console.log(JSON.stringify(result, null, 2));
