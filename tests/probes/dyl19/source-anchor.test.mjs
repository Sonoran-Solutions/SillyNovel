import test from 'node:test';
import assert from 'node:assert/strict';
import { createSourceAnchor, fingerprintSourcePrefix, serializeSourcePrefix } from './source-anchor.mjs';

const owner = { userStoreKey: 'synthetic-user-store' };
const scope = { kind: 'character', key: 'synthetic-card-mira-a' };
const assistant = { kind: 'resolved', characterKey: 'synthetic-card-mira-a' };
const user = { kind: 'resolved', characterKey: 'synthetic-user' };
const messages = [
    { role: 'user', author: user, text: 'A repeated line.' },
    { role: 'assistant', author: assistant, text: 'A repeated line.' },
];

test('fixed field order gives a deterministic SHA-256 prefix', () => {
    const input = { owner, scope, messages, selectedIndex: 1 };
    assert.equal(
        serializeSourcePrefix(input),
        '["sn-source-v1","synthetic-user-store","character","synthetic-card-mira-a",[["user",["resolved","synthetic-user"],"A repeated line.",null],["assistant",["resolved","synthetic-card-mira-a"],"A repeated line.",null]]]',
    );
    assert.equal(fingerprintSourcePrefix(input), '494964a82108011a8de580c883c4f11286730c8ddb1ef34d1c52131b8c5dd5ff');
});

test('repeated identical messages remain position-sensitive through ordered history', () => {
    const first = fingerprintSourcePrefix({ owner, scope, messages, selectedIndex: 0 });
    const second = fingerprintSourcePrefix({ owner, scope, messages, selectedIndex: 1 });
    assert.notEqual(first, second);
});

test('same-length text replacement changes the prefix digest without normalization', () => {
    const replaced = structuredClone(messages);
    replaced[1].text = 'A replaced line.';
    assert.equal(messages[1].text.length, replaced[1].text.length);
    assert.notEqual(
        fingerprintSourcePrefix({ owner, scope, messages, selectedIndex: 1 }),
        fingerprintSourcePrefix({ owner, scope, messages: replaced, selectedIndex: 1 }),
    );
});

test('branch copies share a verified prefix digest but retain different chat owners', () => {
    const left = createSourceAnchor({ owner, scope, chatId: 'branch-a', indexHint: 1, messages, selectedIndex: 1 });
    const right = createSourceAnchor({ owner, scope, chatId: 'branch-b', indexHint: 4, messages, selectedIndex: 1 });
    assert.equal(left.prefixSha256, right.prefixSha256);
    assert.notEqual(left.chatId, right.chatId);
    assert.equal(left.locator.indexHint, 1);
    assert.equal(right.locator.indexHint, 4);
});

test('author, swipe, insertion, deletion, and continuation changes revise the prefix', () => {
    const base = fingerprintSourcePrefix({ owner, scope, messages, selectedIndex: 1 });
    const changedAuthor = structuredClone(messages);
    changedAuthor[1].author = { kind: 'unresolved', label: 'Mira' };
    const changedSwipe = structuredClone(messages);
    changedSwipe[1].swipe = { id: 2, text: 'A repeated line.' };
    const inserted = [messages[0], { role: 'system', author: { kind: 'unresolved', label: null }, text: 'Inserted.' }, messages[1]];
    const deleted = [messages[0]];
    const continued = structuredClone(messages);
    continued[1].text += ' continued';
    for (const variant of [changedAuthor, changedSwipe, inserted, deleted, continued]) {
        assert.notEqual(fingerprintSourcePrefix({ owner, scope, messages: variant, selectedIndex: variant.length - 1 }), base);
    }
});

test('ambiguous authors have an explicit unresolved representation and missing scope is refused', () => {
    const unresolved = [{ role: 'assistant', author: { kind: 'unresolved', label: 'Mira' }, text: 'Hello.' }];
    assert.match(serializeSourcePrefix({ owner, scope, messages: unresolved, selectedIndex: 0 }), /unresolved/);
    assert.throws(() => fingerprintSourcePrefix({ owner: {}, scope, messages: unresolved, selectedIndex: 0 }), /userStoreKey/);
});
