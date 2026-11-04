# M3.1 image workflow — implementation record

## PR A — draft checks, export text, filenames and capture currency

**Candidate, unmerged. Frozen `9d57a52218556895d630062a83b30575fb359aac`**, based on main `11c2740` (the [plan](M3_1_IMAGE_WORKFLOW_PLAN.md) and the [owner rulings H1–H11](DECISIONS.md#owner-rulings-h1h11--m31-image-workflow--2026-11-03)). Tracked by [DYL-207](https://linear.app/devils17/issue/DYL-207/sillynovel-m31-manual-image-exchange-promptreference-export-explicit). Pure module only (H1, H4): nothing imports `src/image-workflow.mjs` yet, so the runtime behaves exactly as main does. No UI, provider, adapter, persistence or schema change.

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
4. **The text has section headings** (`Prompt:` etc.) so a person pasting it knows what each part is. Plan 3.2 fixes the content and order, not the headings; they are a reversible choice.
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
| Node runner list (15 files) | 371/371 pass (362 on main `11c2740` plus these 9) |
| Discovery | PASS, 15/5/1 |
| Syntax and whitespace | PASS |

Browser, storage and native suites NOT_RUN: a pure-module slice under the [M2 evidence standard](TESTING.md#m2-evidence-standard--2026-11-01), which H4 keeps for M3. No host, provider or device was used.

### Next

PR B (the Image workflow disclosure, reference downloads, local preview, “Import and apply background”) starts only after the owner reviews this PR. It is a renderer change and needs the browser suite, storage suite, full native-host campaign on pinned SillyTavern 1.19.0 and the affected device replay. The pinned host is not currently on this machine.
