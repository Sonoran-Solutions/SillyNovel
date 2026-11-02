import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildDirectorRequest, parseDirectorResponse, neutralize, DIRECTOR_INSTRUCTION, PROMPT_VERSION } from '../src/director-request.mjs';
import { validateProposal } from '../src/director-proposal.mjs';
import { createScene, reduceScene } from '../src/scene-reducer.mjs';

const fixture = name => JSON.parse(readFileSync(new URL('./fixtures/m2-director/' + name + '.json', import.meta.url), 'utf8'));
const message = (key, text = 'text ' + key, kind = 'character', label = 'Mira') => ({ key, author: { kind, label }, text });
const input = (window = [message('m1')], extra = {}) => ({ window, cast: [{ characterKey: 'a', label: 'Mira', present: true, outfitId: null, presenceLocked: true, outfitLocked: false }],
    expressions: [{ expressionId: 'e', label: 'Happy', characterKey: 'a' }], backgrounds: [{ backgroundId: 'b', label: 'Park', locked: true }], scene: { backgroundId: 'b' }, ...extra });
const data = request => request.messages[1].content;

test('assembly is deterministic, two messages with empty names, and the version is the instruction hash', () => {
    const request = buildDirectorRequest(input([message('m1', 'One'), message('m2', 'Two', 'user', 'Traveller')]));
    assert.deepEqual(buildDirectorRequest(input([message('m1', 'One'), message('m2', 'Two', 'user', 'Traveller')])), request);
    assert.deepEqual(request.messages.map(({ role, name }) => [role, name]), [['system', ''], ['user', '']]);
    assert.equal(request.messages[0].content, DIRECTOR_INSTRUCTION);
    assert.equal(PROMPT_VERSION, createHash('sha256').update(DIRECTOR_INSTRUCTION).digest('hex').slice(0, 16));
    assert.equal(data(request), 'Current background: b\nCast:\na: Mira | present | outfit default | presence locked\nExpressions:\ne: Happy | for a\nBackgrounds:\nb: Park | locked\nMessages, oldest first:\n<<message key="m1" author="character" label="Mira">>\nOne\n<<end>>\n<<message key="m2" author="user" label="Traveller">>\nTwo\n<<end>>');
    assert.deepEqual(request.window, ['m1', 'm2']);
    assert.doesNotMatch(DIRECTOR_INSTRUCTION, /https?:|\/[a-z]+ |\bfile\b/i);
});
test('window is one to six messages in order; anything else refused', () => {
    for (const n of [1, 2, 6]) assert.deepEqual(buildDirectorRequest(input(Array.from({ length: n }, (_, i) => message('m' + i)))).window, Array.from({ length: n }, (_, i) => 'm' + i));
    for (const n of [0, 7]) assert.throws(() => buildDirectorRequest(input(Array.from({ length: n }, (_, i) => message('m' + i)))), /INVALID_DIRECTOR_INPUT/);
});
test('budget: 4,000 each with the anchored tail, 12,000 in total, a prior that does not fit ends the window', () => {
    const anchored = buildDirectorRequest(input([message('m1', 'older'), message('m2', 'START' + 'x'.repeat(5000))]));
    assert.match(data(anchored), /truncated="kept the last 4000 characters"/);
    assert.doesNotMatch(data(anchored), /START/);
    assert.equal(anchored.texts.m2.startsWith('START'), true, 'evidence keeps the original');
    const big = buildDirectorRequest(input([message('m1', 'old'), message('m2', 'y'.repeat(4001)), message('m3', 'kept')]));
    assert.deepEqual(big.window, ['m3'], 'an oversized prior is dropped whole, older ones stay out so the window is contiguous');
    const total = buildDirectorRequest(input(['a', 'b', 'c', 'd', 'e'].map(c => message(c, c.repeat(4000)))));
    assert.deepEqual(total.window, ['c', 'd', 'e']);
    const exact = buildDirectorRequest(input([message('p', 'p'.repeat(4000)), message('q', 'q'.repeat(4000)), message('r', 'r'.repeat(4000))]));
    assert.equal(exact.window.length, 3, 'exactly 12,000 fits');
    const emoji = buildDirectorRequest(input([message('m', '😀'.repeat(2500))]));
    assert.doesNotMatch(data(emoji), /[\udc00-\udfff](?<![\ud800-\udbff][\udc00-\udfff])/, 'never starts with half a pair');
    const many = buildDirectorRequest(input([message('m')], { backgrounds: Array.from({ length: 100 }, (_, i) => ({ backgroundId: 'bg' + i + '-'.repeat(40), label: 'l'.repeat(80), locked: false })) }));
    assert.ok(data(many).split('Messages, oldest first:')[0].length <= 4000 + 1);
    assert.ok(data(many).length + many.messages[0].content.length < 20000);
});
test('E9: braces and every legacy marker are broken in text and labels; evidence keeps the original', () => {
    assert.equal(neutralize('{{persona}}'), '{ {persona} }');
    assert.equal(neutralize('{{{x}}}'), '{ { {x} } }');
    assert.equal(neutralize('{{getvar::x}} {{input}} }} {{'), '{ {getvar::x} } { {input} } } } { {');
    for (const marker of ['USER', 'BOT', 'CHAR', 'GROUP', 'CHARIFNOTGROUP', 'user', 'Bot', 'cHaR', 'group', 'charifnotgroup']) assert.equal(neutralize('a<' + marker + '>b'), 'a< ' + marker + '>b');
    assert.equal(neutralize('<USERS> <b> a<b'), '<USERS> <b> a<b');
    const raw = '{{persona}} <USER> {{{input}}} <group>';
    const request = buildDirectorRequest(input([message('m1', raw, 'character', '<CHAR>{{char}}')], { cast: [{ characterKey: 'a', label: '{{user}}<BOT>', present: true, outfitId: null, presenceLocked: false, outfitLocked: false }], expressions: [{ expressionId: 'e', label: '{{x}}', characterKey: 'a' }], backgrounds: [{ backgroundId: 'b', label: '<GROUP>', locked: false }] }));
    assert.doesNotMatch(JSON.stringify(request.messages), /\{\{|\}\}|<(user|bot|char|group|charifnotgroup)>/i);
    assert.equal(request.texts.m1, raw);
    assert.equal(data(request).includes('{ {persona} } < USER> { { {input} } } < group>'), true);
});
test('input validator refuses decoys in unused fields at every level', () => {
    const decoy = 'DECOY-PERSONA';
    for (const bad of [{ ...input(), persona: decoy }, { ...input(), systemPrompt: decoy }, input([{ ...message('m'), description: decoy }]), input([message('m')], { cast: [{ ...input().cast[0], description: decoy }] }),
        input([message('m')], { scene: { backgroundId: 'b', lore: decoy } }), input([message('m')], { expressions: [{ ...input().expressions[0], url: decoy }] }), input([{ key: 'm', author: { kind: 'character', label: 'x', avatar: decoy }, text: 't' }]), input([message('m', 7)]), null]) {
        assert.throws(() => buildDirectorRequest(bad), /INVALID_DIRECTOR_INPUT/);
    }
    const inherited = Object.assign(Object.create({ persona: decoy }), input());
    assert.throws(() => buildDirectorRequest(inherited), /INVALID_DIRECTOR_INPUT/);
});
test('parser: exact limit, one optional fence, nothing repaired', () => {
    const good = { schemaVersion: 1, updates: [] };
    const padded = size => { const text = JSON.stringify(good); return text.slice(0, -1) + ' '.repeat(size - text.length) + '}'; };
    assert.deepEqual(parseDirectorResponse(padded(32768)).proposal, good);
    assert.equal(parseDirectorResponse(padded(32769)).code, 'RESPONSE_TOO_LARGE');
    assert.equal(parseDirectorResponse('{"a":"' + 'é'.repeat(16400) + '"}').code, 'RESPONSE_TOO_LARGE', 'bytes, not characters');
    for (const text of ['﻿{"a":1}', '  {"a":1}\n', '```json\n{"a":1}\n```', '```\n{"a":1}\n```', ' ```json {"a":1}``` ']) assert.deepEqual(parseDirectorResponse(text).proposal, { a: 1 }, text);
    for (const text of [null, undefined, 7, '', '   ']) assert.equal(parseDirectorResponse(text).code, 'EMPTY_RESPONSE');
    for (const text of ['```json\n```json\n{"a":1}\n```\n```', '[1]', '{"a":1}{"b":2}', 'Sure: {"a":1}', '{"a":1} done', '{"a":NaN}', '```python\n{"a":1}\n```', 'null', '{bad}']) assert.equal(parseDirectorResponse(text).code, 'NOT_SINGLE_JSON', text);
    const proto = parseDirectorResponse('{"__proto__":{"x":1},"schemaVersion":1,"updates":[]}');
    assert.equal(proto.ok, true);
    assert.equal(Object.getPrototypeOf(proto.proposal), Object.prototype);
    assert.equal(({}).x, undefined);
    assert.equal(JSON.stringify(parseDirectorResponse('not json secret text')).includes('secret'), false, 'refusals never carry model text');
});
test('all M2.1 raw proposals serialized through the parser reach the validator unchanged', () => {
    const texts = fixture('texts'), proposals = fixture('proposals'), window = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
    assert.equal(Object.keys(proposals).length, 86);
    const sources = Object.keys(texts).concat('m7').slice(0, 7).map((key, i) => ({ key, revision: 1, swipeRevision: 0, fingerprintVersion: 'sn-source-v1', prefixSha256: String(i).repeat(64) }));
    const context = { ownerKey: 'o', sessionEpoch: 1, historyRevision: 1, selectionRevision: 1, selectedSourceKey: 'm6', sources,
        characters: ['mira-a', 'mira-b', 'rowan', 'sage'].map(key => ({ key, label: key })),
        catalog: { revision: 1, assets: [{ id: 'park', revision: 'v1', kind: 'background', available: true }, { id: 'coat', revision: 'v1', kind: 'outfit', characterKey: 'mira-a', available: true }, { id: 'smile', revision: 'v1', kind: 'expression', characterKey: 'mira-a', outfitId: null, available: true }, { id: 'coat-smile', revision: 'v1', kind: 'expression', characterKey: 'mira-a', outfitId: 'coat', available: true }] } };
    let scene = createScene(context).scene;
    for (const characterKey of ['mira-a', 'mira-b', 'rowan']) scene = reduceScene(scene, { type: 'addCharacter', characterKey }, { ownerKey: 'o', sessionEpoch: 1, historyRevision: 1, selectionRevision: 1, catalogRevision: 1, expectedRevision: scene.revision, source: sources[5], origin: 'manual' }).scene;
    const codes = new Set();
    for (const [name, raw] of Object.entries(proposals)) {
        const parsed = parseDirectorResponse(JSON.stringify(raw));
        if (!parsed.ok) { assert.equal(typeof raw === 'object' && raw !== null && !Array.isArray(raw), false, name); continue; }
        const direct = validateProposal(raw, { scene, texts, window }), through = validateProposal(parsed.proposal, { scene, texts, window });
        assert.equal(through.code, direct.code, name);
        codes.add(through.code);
    }
    assert.ok(codes.has('VALID') && codes.has('INVALID_EVIDENCE') && codes.has('INVALID_PROPOSAL'), [...codes].join());
});
