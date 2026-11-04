/** Pure M3.1 manual image exchange (H1, H2, H9): draft checks, export text, fixed filenames, capture currency. No provider, no I/O. See docs/M3_1_IMAGE_WORKFLOW_PLAN.md. */
import { validId, label } from '../plugins/sillynovel-storage/schema.mjs';

export const DRAFT_VERSION = 1, MAX_REFERENCES = 3, PROMPT_FILENAME = 'sillynovel-image-prompt.txt';
export const SIZE_HINTS = Object.freeze(['unspecified', 'landscape', 'square', 'portrait']);
// UTF-8 byte ceilings; nothing is ever truncated to fit.
export const LIMITS = Object.freeze({ prompt: 8192, negativePrompt: 2048, styleNote: 1024, referenceBytes: 15 * 1024 * 1024 });
const KEYS = ['version', 'kind', 'label', 'prompt', 'negativePrompt', 'styleNote', 'sizeHint', 'references'];
const TEXT = ['label', 'prompt', 'negativePrompt', 'styleNote'];
const SHA256 = /^[0-9a-f]{64}$/;
const bytes = text => new TextEncoder().encode(text).length;

/** Starts blank: nothing is scraped from the chat, cards, persona or director. */
export const emptyDraft = () => ({ version: DRAFT_VERSION, kind: 'background', label: '', prompt: '', negativePrompt: '', styleNote: '', sizeHint: 'unspecified', references: [] });

/**
 * Problems that block export, as `{ code, assetId? }`; empty means exportable.
 * With `catalog` (the attached project's PNG entries), each reference must be one of them with the same hash, and their bytes stay under the total.
 * Without it only the reference shape is checked, which is all the text export needs.
 */
export function draftProblems(draft, catalog = null) {
    if (!draft || typeof draft !== 'object' || Object.keys(draft).sort().join() !== [...KEYS].sort().join() || TEXT.some(key => typeof draft[key] !== 'string') || !Array.isArray(draft.references)) return [{ code: 'INVALID_DRAFT' }];
    const problems = [], add = (code, assetId) => problems.push(assetId === undefined ? { code } : { code, assetId });
    if (draft.version !== DRAFT_VERSION || draft.kind !== 'background') add('INVALID_DRAFT');
    if (draft.label !== '' && !label(draft.label)) add('BAD_LABEL');
    if (!draft.prompt.trim()) add('PROMPT_REQUIRED');
    for (const key of ['prompt', 'negativePrompt', 'styleNote']) if (bytes(draft[key]) > LIMITS[key]) add(key.replace(/[A-Z]/g, c => '_' + c).toUpperCase() + '_TOO_LONG');
    if (!SIZE_HINTS.includes(draft.sizeHint)) add('BAD_SIZE_HINT');
    if (draft.references.length > MAX_REFERENCES) add('TOO_MANY_REFERENCES');
    const seen = new Set(); let total = 0;
    for (const ref of draft.references) {
        if (!ref || typeof ref !== 'object' || Object.keys(ref).sort().join() !== 'assetId,sha256' || !validId(ref.assetId) || !SHA256.test(ref.sha256)) { add('INVALID_REFERENCE'); continue; }
        if (seen.has(ref.assetId)) { add('DUPLICATE_REFERENCE', ref.assetId); continue; }
        seen.add(ref.assetId);
        if (!catalog) continue;
        const entry = catalog.find(a => a.assetId === ref.assetId);
        if (!entry) add('UNKNOWN_REFERENCE', ref.assetId);
        else if (entry.sha256 !== ref.sha256) add('REFERENCE_CHANGED', ref.assetId);
        else total += entry.byteCount;
    }
    if (total > LIMITS.referenceBytes) add('REFERENCES_TOO_LARGE');
    return problems;
}

/** The exact text the preview shows and Copy and Download both use; empty optional sections are left out. User text is data and passes through verbatim. */
export function exportText(draft) {
    if (draftProblems(draft).length) throw Error('INVALID_DRAFT');
    const sections = [['Prompt', draft.prompt], ['Negative prompt', draft.negativePrompt], ['Style', draft.styleNote], ['Size', draft.sizeHint === 'unspecified' ? '' : draft.sizeHint]];
    return sections.filter(([, text]) => text !== '').map(([heading, text]) => heading + ':\n' + text).join('\n\n') + '\n';
}

/** Fixed names: no label, path or user text ever reaches a filename. */
export function referenceFilename(index) {
    if (!Number.isInteger(index) || index < 0 || index >= MAX_REFERENCES) throw Error('INVALID_REFERENCE_INDEX');
    return 'reference-' + (index + 1) + '.png';
}

/** Taken before each asynchronous step; the session epoch is new on every attachment, so A → B → A never matches an old capture. */
export const captureOf = ({ projectModel, projectId, sessionEpoch, draftRevision }) => Object.freeze({ projectModel, projectId, sessionEpoch, draftRevision });
export const stillCurrent = (capture, now) => Boolean(capture && now) && capture.projectModel === now.projectModel && capture.projectModel != null
    && capture.projectId === now.projectId && capture.sessionEpoch === now.sessionEpoch && capture.draftRevision === now.draftRevision;
