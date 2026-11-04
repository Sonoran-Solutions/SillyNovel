# M3.1 image workflow — implementation record

**PR A accepted — 2026-11-03.** The owner [accepted](DECISIONS.md#owner-acceptance--m31-pr-a-merged-per-field-copy-for-pr-b--2026-11-03) PR A, refrozen at `4b3a300`, with per-field Copy added to PR B's scope.

## PR A — draft checks, export text, filenames and capture currency

**Candidate, unmerged. Frozen `4b3a30079d70cd52818db5ecdea433411ce4beba`**, based on main `11c2740` (the [plan](M3_1_IMAGE_WORKFLOW_PLAN.md) and the [owner rulings H1–H11](DECISIONS.md#owner-rulings-h1h11--m31-image-workflow--2026-11-03)). Tracked by [DYL-207](https://linear.app/devils17/issue/DYL-207/sillynovel-m31-manual-image-exchange-promptreference-export-explicit). Pure module only (H1, H4): nothing imports `src/image-workflow.mjs` yet, so the runtime behaves exactly as main does. No UI, provider, adapter, persistence or schema change.

### What it adds

`src/image-workflow.mjs`, following plan sections 3.2 and 3.3:

| Export | Behaviour |
| --- | --- |
| `emptyDraft()` | The blank draft of plan 3.2: version 1, kind `background`, empty texts, size `unspecified`, no references. Nothing is filled from the chat, cards, persona or director. |
| `draftProblems(draft, catalog?)` | Returns the problems that block export as `{ code, assetId? }`; an empty array means exportable. Strict known keys (no provider, model or endpoint field can exist). Prompt is required; the prompt, negative prompt and style note have 8 KiB, 2 KiB and 1 KiB UTF-8 ceilings and are never truncated. The size hint is one of four values. A non-blank label must satisfy the library's existing `label()` (1–80 characters, no control characters). References: at most three, unique, shaped `{ assetId, sha256 }`. With the attached project's catalog, each must be a catalog entry with the same hash, and their `byteCount` total stays at or under 15 MiB. |
| `exportText(draft)` | The one text that the preview, Copy and Download all use: `Prompt`, `Negative prompt`, `Style` and `Size` sections in that order, empty optional sections and `unspecified` left out, ending in one newline. User text passes through verbatim as data. Throws `INVALID_DRAFT` when `draftProblems(draft)` is not empty. |
| `PROMPT_FILENAME`, `referenceFilename(i)` | Fixed names `sillynovel-image-prompt.txt` and `reference-1.png` to `reference-3.png` (H9); any other index throws. |
| `captureOf(…)`, `stillCurrent(capture, now)` | A frozen capture of project model (by identity), project ID, session epoch and draft revision; current only when all four match and a project is attached. A → B → A gets a new epoch, so an old capture never matches again (plan 3.3). |

`tests/m3-image-workflow.test.mjs`, 9 tests, is registered in `tests/probes/dyl60/run.py`; `check-discovery.py` now expects 15 Node files.

### TESTING coverage

| Row | Covered here (Node, SYNTHETIC) | Still NOT_RUN |
| --- | --- | --- |
| T69 | Fixed-order text from the visible fields only; deterministic, so Copy and Download get the same text; blank or whitespace prompt refuses; oversized fields refuse by UTF-8 bytes at exactly ceiling + 1; markup, `{{char}}`, slash commands and URLs pass through verbatim; no label, asset ID or hash enters the text | Clipboard and download bytes in a browser; no provider request (PR B) |
| T70 | Unknown, foreign or deleted references, a changed hash, duplicates, a fourth reference, URL or path-shaped IDs and extra keys all refuse; total byte ceiling; fixed filenames | Authenticated readback with hash check and actual PNG downloads (PR B) |
| T71 | — | All of it (PR B) |
| T72 | The capture rule, including A → B → A, a replaced project model with the same ID, a draft edit and detach | Delayed export, decode and upload in the real workflow; resource disposal (PR B) |
| T73 | — | All of it (PR B, physical and assistive rows) |

### Implementation choices for owner review

1. **Problems are returned as a list, not thrown,** so PR B can show every reason at once and name the unavailable reference (plan 3.4). `exportText` throws only on a draft the interface should never have let through.
2. **The prompt counts as missing when it is only whitespace.** Other fields are kept exactly as typed.
3. **Size is a section only when chosen;** `unspecified` adds nothing to the text.
4. **The text has section headings** (`Prompt:` etc.) so a person reading it knows what each part is. Plan 3.2 fixes the content and order, not the headings. Accepted with per-field Copy in PR B, so pasting into a tool needs no editing.
5. **The reference byte total uses the catalog's recorded `byteCount`.** PR B still verifies each reference's hash on authenticated readback before download, as plan 3.3 requires.
6. **The library's own `label()` check is reused** from `plugins/sillynovel-storage/schema.mjs`, which `src/project-scene.mjs` already imports in the browser, so draft labels follow exactly the import rule.
7. **No result-PNG preflight here.** Plan 3.3 reuses the existing preview checks in `src/transient-scene.mjs` and extracts only what PR B shares, so that work belongs to PR B.

### Commands and results

From the PR A worktree at the frozen SHA, Node v26.8.1, Linux, synthetic fixtures only:

```sh
node --test tests/m3-image-workflow.test.mjs
node --test --test-isolation=none <the 15 node files from python3 tests/probes/dyl60/run.py --list-tests>
python3 tests/probes/dyl60/check-discovery.py
node --check src/image-workflow.mjs
git diff --check
```

| Check | Result |
| --- | --- |
| Focused file | 9/9 pass |
| Node runner list (15 files) | 371/371 pass (362 on main `11c2740` plus these 9), on `9d57a52` and again on the refrozen `4b3a300` (literal problem codes) |
| Discovery | PASS, 15/5/1 |
| Syntax and whitespace | PASS |

Browser, storage and native suites NOT_RUN: a pure-module slice under the [M2 evidence standard](TESTING.md#m2-evidence-standard--2026-11-01), which H4 keeps for M3. No host, provider or device was used.

### Next

PR B (the Image workflow disclosure, reference downloads, local preview, “Import and apply background”) starts only after the owner reviews this PR. It is a renderer change and needs the browser suite, storage suite, full native-host campaign on pinned SillyTavern 1.19.0 and the affected device replay. The pinned host is not currently on this machine.

## PR B — the Image workflow

**Candidate, unmerged. Frozen `0c858c8c0ac1d09e9d709acb2866b31d79901dd8`**, based on main `22b774d` (PR A merged, [owner acceptance](DECISIONS.md#owner-acceptance--m31-pr-a-merged-per-field-copy-for-pr-b--2026-11-03)). Tracked by [DYL-207](https://linear.app/devils17/issue/DYL-207/sillynovel-m31-manual-image-exchange-promptreference-export-explicit). Renderer change: the evidence is the full campaign on pinned SillyTavern 1.19.0 (H4). No image provider (H2), no host-adapter, plugin or schema change.

### What it adds

| Where | Change |
| --- | --- |
| `src/stage-view.mjs` | An **Image workflow** disclosure at the end of the Artwork Library area, closed by default. Fields: background label, image prompt, negative prompt, style note, size hint, references 1–3 (this project's library PNGs only). The preview shows `exportText` exactly, with the reasons it can't be exported under it. **Copy prompt**, **Copy negative prompt** and **Copy style note** each copy that field alone (the owner's acceptance of PR A). **Download prompt** saves `sillynovel-image-prompt.txt`. **Download reference N** re-reads the stored file, checks its digest and saves `reference-N.png`. **Result PNG** checks the file before decode, then shows a local preview. **Import and apply background to ‹project›** imports it; **Discard preview** drops it without uploading. |
| `src/image-workflow.mjs` | `pngProblem(bytes)`: one static PNG (signature, IHDR first, chunks walked to IEND, no `acTL`), at most 5 MiB, 4096 px on an edge and 16 million pixels, checked before any decode. `PREVIEW_TIMEOUT_MS` is 10 s. |
| `src/project-scene.mjs` | `readReference(assetId)`: read-only, accepts only an asset in this project's library, goes through the existing digest-checked `client.asset()` and refuses if the attachment changed meanwhile. |
| `style.css` | Layout for the disclosure, the wrapped text preview and the image preview. |

Nothing is sent to an image service. The only storage requests the workflow makes are the reference readback (GET) and, on Import and apply, the existing upload (POST) and the install readback.

### Implementation choices for owner review

1. **A toggle button with `aria-expanded`, not a nested `<details>`.** A second `<summary>` inside the controls would make the `.sillynovel-controls summary` locator, used about 60 times across the probes, ambiguous. The disclosure is still closed by default, and Escape inside it closes it and returns focus to its button.
2. **The workflow's controls stay usable while a message streams or is unresolved.** They are kept out of the shared `controls` list that the scene's `ready` gate disables. Import still goes through `importFile`'s own gates (import or cleanup in progress) and the stage's `projectBusy`.
3. **A preview belongs to the attachment, not to draft edits.** It is captured with project model, project ID and session epoch; the label is read when you press Import. A reference download is also bound to the draft revision, so changing the selection mid-read drops it.
4. **Attaching keeps a draft written before it; detaching or replacing the project clears the draft, references and preview.** That is plan 3.3's clear-on-detach, with drafting before attachment allowed by plan 3.1.
5. **A → B → A is caught by model identity.** Every attachment builds a new project model, so `stillCurrent` fails on identity even where the session epoch is unchanged. A native chat switch also changes the epoch. (This is point 2 of the PR A acceptance.)
6. **A reference's expected hash is the one checked when the art was installed.** Download re-reads it, and a different hash refuses as “A reference changed; select it again.”
7. **Reference byte counts are passed as 0** (a `ponytail:` comment in the code). `client.asset()` refuses any stored asset over 5 MiB, so three references can't exceed `LIMITS.referenceBytes`. Pass real sizes if that cap is ever raised.
8. **`pngProblem` is a new pure check;** `src/transient-scene.mjs`'s inline checks are untouched. The `acTL` walk is duplicated rather than changing the session-only import path.
9. **Import is today's `importFile` unchanged** (H10): it registers the PNG, applies it as the background, locks it, clears the director overlay and marks the project dirty. A blank label falls back to the file name. Save stays explicit.
10. **Messages are plain text throughout.** Your text goes through `textContent`, and the browser test asserts that a `<b>` in the prompt creates no element.

### TESTING coverage

| Row | Covered (frozen `0c858c8`) | Still NOT_RUN or NOT_TESTED |
| --- | --- | --- |
| T69 | Browser: preview equals the downloaded file's bytes; per-field copy holds only that field; blank prompt refuses; markup, `{{char}}` and `/sd` stay text; no request at all without a project; the native draft is kept. Native: the prompt download makes no storage request. Node (PR A): byte ceilings. | — |
| T70 | Browser: a duplicate refuses; the downloaded reference equals the served bytes; a changed stored file refuses. Native: the download is the stored file, by digest, and the only request is the authenticated readback. Node: foreign, unknown and path-shaped references refuse; fixed filenames. | — |
| T71 | Browser: a non-PNG refuses before preview; choose and discard upload nothing; Import and apply uploads once, applies the background and marks the project unsaved. Native: through the real plugin decoder, saved, locked, with the stored bytes equal to the file. Node: animation, truncation, oversize and dimension ceilings. | Save conflict and quota during this import (covered for the shared import path by the existing campaigns, not exercised from the workflow) |
| T72 | Browser: detach clears the draft and a pending preview, which never uploads. Node: capture rules including A → B → A. | A delayed decode racing a detach, on the real host |
| T73 | — | **All NOT_RUN:** keyboard-only pass, narrow layout and 200 % scaling of the disclosure, touch file picker and downloads on the Galaxy Tab, screen readers |

### Commands and results

One supervised campaign from the PR B worktree at the frozen SHA (heavy-job lock held, 50-minute deadline, 33 minutes used, no leftover processes):

```sh
SILLYTAVERN_ROOT=<disposable pinned host> SN_PLAYWRIGHT_MODULE=<pinned Playwright> python3 tests/probes/dyl60/run.py docs/evidence/m3-1-b/campaign
python3 tests/probes/dyl60/validate.py docs/evidence/m3-1-b/campaign
```

| Suite | Result |
| --- | --- |
| Node | 373/373 (PR A's 371 plus the two `pngProblem` tests) |
| Storage | 126/126 |
| Browser actual-entry | 105/105 (103 before plus the two workflow tests) |
| Native campaigns | stage-library-migration 25 checkpoints (the image-workflow block is one), expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60 |
| `validate.py` | PASS over 138 frozen inputs, a native inventory of 84 files and 115 artifact hashes; physical and owner gates NOT_TESTED or NOT_RUN |

Host: SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, a disposable `git clone` from the owner's local SillyTavern clone (the owner's install untouched) with `npm ci`, Node 26.8.1, the pinned Playwright Chromium. Package: [`docs/evidence/m3-1-b/campaign/`](evidence/m3-1-b/campaign/). Before freezing, the stage-library-migration step ran once on its own (25 PASS) to check the new probe block; that run is not the evidence.

### Not covered

Physical and assistive rows (T73); any image provider, which is M3.2 and not authorized; generated-candidate storage (H7, deferred).
