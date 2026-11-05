import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDraft, draftProblems, exportText, referenceFilename, captureOf, stillCurrent, LIMITS, MAX_REFERENCES, PROMPT_FILENAME, pngProblem, RESULT_LIMITS } from '../src/image-workflow.mjs';

const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const hash = c => c.repeat(64);
const catalog = [1, 2, 3, 4].map(n => ({ assetId: id(n), sha256: hash(String(n)), width: 64, height: 64, byteCount: 1000 }));
const draft = changes => ({ ...emptyDraft(), prompt: 'A rainy harbor at dusk', ...changes });
const codes = (d, c) => draftProblems(d, c).map(p => p.code);

test('a fresh draft starts blank and cannot export until a prompt is written', () => {
    assert.deepEqual(emptyDraft(), { version: 1, kind: 'background', label: '', prompt: '', negativePrompt: '', styleNote: '', sizeHint: 'unspecified', references: [] });
    assert.deepEqual(codes(emptyDraft()), ['PROMPT_REQUIRED']);
    assert.deepEqual(codes(draft({ prompt: ' \n\t' })), ['PROMPT_REQUIRED']);
    assert.throws(() => exportText(emptyDraft()), /INVALID_DRAFT/);
    assert.deepEqual(draftProblems(draft({})), []);
});
test('T69: the export holds exactly the visible fields in a fixed order, empty optional sections left out', () => {
    assert.equal(exportText(draft({})), 'Prompt:\nA rainy harbor at dusk\n');
    const full = draft({ negativePrompt: 'people', styleNote: 'watercolor', sizeHint: 'landscape', label: 'Harbor', references: [{ assetId: id(1), sha256: hash('1') }] });
    assert.equal(exportText(full), 'Prompt:\nA rainy harbor at dusk\n\nNegative prompt:\npeople\n\nStyle:\nwatercolor\n\nSize:\nlandscape\n');
    assert.equal(exportText(full), exportText(structuredClone(full)), 'deterministic: Copy and Download use the same text');
    assert.doesNotMatch(exportText(full), /Harbor|0000|1111/, 'no label, asset ID or hash enters the text');
});
test('T69: oversized fields refuse by UTF-8 bytes and are never truncated; the ceilings themselves are accepted', () => {
    assert.deepEqual(draftProblems(draft({ prompt: 'x'.repeat(LIMITS.prompt), negativePrompt: 'x'.repeat(LIMITS.negativePrompt), styleNote: 'x'.repeat(LIMITS.styleNote) })), []);
    assert.deepEqual(codes(draft({ prompt: 'é'.repeat(LIMITS.prompt / 2 + 1) })), ['PROMPT_TOO_LONG']);
    assert.deepEqual(codes(draft({ negativePrompt: 'x'.repeat(LIMITS.negativePrompt + 1), styleNote: 'x'.repeat(LIMITS.styleNote + 1) })), ['NEGATIVE_PROMPT_TOO_LONG', 'STYLE_NOTE_TOO_LONG']);
    assert.throws(() => exportText(draft({ prompt: 'x'.repeat(LIMITS.prompt + 1) })), /INVALID_DRAFT/);
});
test('T69: markup, macros, slash commands and URLs stay inert text, passed through verbatim', () => {
    const prompt = '<img src=x onerror=alert(1)> {{char}} /sd harbor | /echo hi https://example.com/x.png';
    assert.equal(exportText(draft({ prompt })), 'Prompt:\n' + prompt + '\n');
});
test('strict shape: unknown keys, wrong types, versions, kinds, labels and size hints refuse', () => {
    assert.deepEqual(codes(null), ['INVALID_DRAFT']);
    assert.deepEqual(codes({ ...draft({}), provider: 'cloud' }), ['INVALID_DRAFT'], 'no field for a provider, model or endpoint');
    assert.deepEqual(codes(draft({ prompt: 7 })), ['INVALID_DRAFT']);
    assert.deepEqual(codes(draft({ references: 'x' })), ['INVALID_DRAFT']);
    assert.deepEqual(codes(draft({ version: 2 })), ['INVALID_DRAFT']);
    assert.deepEqual(codes(draft({ kind: 'outfit' })), ['INVALID_DRAFT']);
    assert.deepEqual(codes(draft({ label: 'x'.repeat(81) })), ['BAD_LABEL']);
    assert.deepEqual(codes(draft({ label: 'two\nlines' })), ['BAD_LABEL']);
    assert.deepEqual(codes(draft({ label: 'Harbor at dusk' })), []);
    assert.deepEqual(codes(draft({ sizeHint: '1920x1080' })), ['BAD_SIZE_HINT']);
});
test('T70: references must be this project\'s catalog entries with the same hash, unique, at most three', () => {
    const ref = n => ({ assetId: id(n), sha256: hash(String(n)) });
    assert.deepEqual(draftProblems(draft({ references: [ref(1), ref(2), ref(3)] }), catalog), []);
    assert.deepEqual(codes(draft({ references: [ref(1), ref(2), ref(3), ref(4)] }), catalog), ['TOO_MANY_REFERENCES']);
    assert.deepEqual(draftProblems(draft({ references: [ref(1), ref(1)] }), catalog), [{ code: 'DUPLICATE_REFERENCE', assetId: id(1) }]);
    assert.deepEqual(draftProblems(draft({ references: [ref(9)] }), catalog), [{ code: 'UNKNOWN_REFERENCE', assetId: id(9) }], 'a foreign or deleted asset');
    assert.deepEqual(draftProblems(draft({ references: [{ assetId: id(2), sha256: hash('f') }] }), catalog), [{ code: 'REFERENCE_CHANGED', assetId: id(2) }]);
    for (const bad of [{ assetId: 'https://example.com/a.png', sha256: hash('1') }, { assetId: id(1), sha256: 'ABC' }, { ...ref(1), path: '/etc/passwd' }, 'x'])
        assert.deepEqual(codes(draft({ references: [bad] }), catalog), ['INVALID_REFERENCE']);
});
test('T70: the selected references\' bytes stay under the total; the text export does not need the catalog', () => {
    const big = catalog.map(a => ({ ...a, byteCount: 6 * 1024 * 1024 }));
    const refs = [1, 2, 3].map(n => ({ assetId: id(n), sha256: hash(String(n)) }));
    assert.deepEqual(codes(draft({ references: refs.slice(0, 2) }), big), []);
    assert.deepEqual(codes(draft({ references: refs }), big), ['REFERENCES_TOO_LARGE']);
    assert.deepEqual(draftProblems(draft({ references: [{ assetId: id(9), sha256: hash('9') }] })), [], 'catalog checks run only where the catalog is given');
});
test('T70: filenames are fixed and no index makes a path', () => {
    assert.equal(PROMPT_FILENAME, 'sillynovel-image-prompt.txt');
    assert.deepEqual([0, 1, 2].map(referenceFilename), ['reference-1.png', 'reference-2.png', 'reference-3.png']);
    for (const bad of [-1, MAX_REFERENCES, 1.5, '0', '../x', NaN]) assert.throws(() => referenceFilename(bad), /INVALID_REFERENCE_INDEX/);
});
test('T72: a capture matches only the same project model, project, session epoch and draft revision; A → B → A does not restore it', () => {
    const modelA = {}, modelB = {};
    const at = (projectModel, projectId, sessionEpoch, draftRevision) => ({ projectModel, projectId, sessionEpoch, draftRevision });
    const capture = captureOf(at(modelA, id(1), 1, 4));
    assert.equal(Object.isFrozen(capture), true);
    assert.equal(stillCurrent(capture, at(modelA, id(1), 1, 4)), true);
    assert.equal(stillCurrent(capture, at(modelA, id(1), 1, 5)), false, 'the draft was edited');
    assert.equal(stillCurrent(capture, at(modelB, id(2), 2, 4)), false, 'another project attached');
    assert.equal(stillCurrent(capture, at(modelA, id(1), 3, 4)), false, 'A → B → A: same project again, new epoch');
    assert.equal(stillCurrent(capture, at({}, id(1), 1, 4)), false, 'a replaced project model with the same ID');
    assert.equal(stillCurrent(capture, null), false, 'detached');
    assert.equal(stillCurrent(captureOf(at(null, null, 1, 0)), at(null, null, 1, 0)), false, 'no attachment is never current');
});

// A minimal PNG: signature, IHDR, optional extra chunks, IEND. CRCs are not checked before decode; the plugin's decoder checks them.
const chunk = (name, data = []) => [...[24, 16, 8, 0].map(s => (data.length >>> s) & 255), ...[...name].map(c => c.charCodeAt(0)), ...data, 0, 0, 0, 0];
const be = n => [24, 16, 8, 0].map(s => (n >>> s) & 255);
const png = (width = 64, height = 32, extra = []) => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...chunk('IHDR', [...be(width), ...be(height), 8, 6, 0, 0, 0]), ...extra, ...chunk('IEND')]);

test('T71: a static PNG within the ceilings passes before decode, the real fixture included', async () => {
    const { readFile } = await import('node:fs/promises');
    assert.equal(pngProblem(png()), null);
    assert.equal(pngProblem(png(RESULT_LIMITS.edge, 3906)), null, '4096 × 3906 is under 16M pixels');
    assert.equal(pngProblem(new Uint8Array(await readFile(new URL('fixtures/m12-stage/forest.png', import.meta.url)))), null);
});
test('T71: wrong type, animation, truncation, oversize and bad dimensions refuse before decode', () => {
    assert.equal(pngProblem('not bytes'), 'NOT_PNG');
    assert.equal(pngProblem(new Uint8Array([255, 216, 255, 224, ...new Array(40).fill(0)])), 'NOT_PNG', 'a JPEG');
    assert.equal(pngProblem(png(64, 32, chunk('acTL', [0, 0, 0, 2, 0, 0, 0, 0]))), 'ANIMATED_PNG');
    assert.equal(pngProblem(png().subarray(0, 40)), 'MALFORMED_PNG', 'cut off before IEND');
    const noIhdr = png(); noIhdr.set([...'IDAT'].map(c => c.charCodeAt(0)), 12);
    assert.equal(pngProblem(noIhdr), 'MALFORMED_PNG', 'IHDR must come first');
    assert.equal(pngProblem(new Uint8Array(RESULT_LIMITS.bytes + 1)), 'PNG_TOO_LARGE');
    for (const [w, h] of [[0, 32], [64, 0], [RESULT_LIMITS.edge + 1, 1], [4096, 4096]]) assert.equal(pngProblem(png(w, h)), 'PNG_DIMENSIONS', w + ' × ' + h);
});
