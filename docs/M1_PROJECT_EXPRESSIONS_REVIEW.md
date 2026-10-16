# PR #31 senior-review correction

The owner's pasted senior review returned REQUEST CHANGES for one P2 finding at reviewed head **`8e6e97020472a9a6c49e2376730f8563dcdd91c1`**, the clean starting checkout for this correction. PR #31 remains draft/open/unmerged; [DYL-62](https://linear.app/devils17/issue/DYL-62) remains In Review. DYL-23's recorded Done/history, DYL-60 Backlog, Decision F undecided and Gate A NOT_RUN are unchanged. The assignment authorizes this bounded correction only.

## Root cause and correction

Reader reconciliation preserved per-source content revisions after existing objects moved. Only the broad display revision advanced, while the stage and overlay signatures ignored source order. As a result, the correct prefix/suffix reconciliation was never called automatically.

`reader-source-model.mjs` now exposes `sourceOrderRevision`, advancing on changes to ordered source keys/count/availability in full reconciliation and incremental samples. `transient-scene.mjs` adds it to the existing shared `evidenceStamp`, which the stage already uses. `project-expressions.mjs` now reuses that shared stamp instead of maintaining a parallel source signature. Source-order changes immediately suppress the expression projection and refuse application while incremental prefix validation is pending. Unchanged refreshes and text scrolling do not change the order stamp; no prefix hashing or history encoding is added to those paths. `source-prefix.mjs` and its cache, limits and invalidation algorithm are unchanged.

The optional P3 is addressed by labeling the existing chooser **Expression to apply · selected source only**. It identifies the pending choice separately from the current-expression status, retaining intentional imported selections. No selector synchronization, persistence, storage, provider or identity redesign.

## Regression proof

[Before-fix actual-entry run](evidence/project-expressions/review/development/reorder-before-fix.txt): both new browser cases fail on the stale expression remaining visible. [After-fix focused run](evidence/project-expressions/review/development/reorder-after-fix.txt): 2/2 pass. The source/model development run passes 48/48. These mutable development runs remain separate from final evidence.

Both actual-entry regressions reorder the same unchanged host message objects while preserving the selected source and head. One swaps only earlier sources, retaining the selected numeric index as well; the other moves the selected source. The test emits a host refresh event only, never invokes the overlay model or navigates after reordering. It delays SHA-256 to assert synchronous base-art fallback, disabled expression application and a usable native composer before reconciliation finishes. Completion invalidates the affected expression and preserves the global project/selected dialogue. Instrumented encoder and digest calls remain zero after text scrolling plus an unchanged canonical reconciliation. Reader coverage independently proves unchanged source/selection revisions on reorder, separate content changes, sample swaps/appends and unavailable records.

Frozen correction: **`eae12ff9b74d12363c12f6e5d7925955502a3767`**. Final pushed head is recorded in the PR/Linear handoff rather than creating a self-referential commit field. Later commits contain docs/evidence only. [87 frozen input hashes](evidence/project-expressions/review/proof-hashes.json) preserve the tested runtime/fixture/test bytes.

| Campaign | Result | Retained evidence |
| --- | --- | --- |
| Canonical Node M0/source/prefix/reducer/project | **124/124 PASS** | [Log](evidence/project-expressions/review/node-tests.txt) |
| Actual-entry Chromium, all 57 inherited plus two new cases | **59/59 PASS** | [Log](evidence/project-expressions/review/browser-tests.txt) |
| Disposable pinned-host checkpoint groups | **16/16 PASS** | [Run log](evidence/project-expressions/review/host-run.txt), [structured record](evidence/project-expressions/review/host.json) |
| Unchanged storage/recovery suite, inherited result; not rerun | **126/126 PASS** | [Original log](evidence/project-expressions/storage-tests.txt) |

No failures, skips or cancellations in the new final suites. SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Node v26.8.1, SQLite 3.53.4, Linux x64; Chromium 151.0.7922.34 with the deterministic loopback provider. Final owned disposable root `/tmp/sn-portability-host-81qcV2`; no live installation or real provider.

The repeated host campaign verifies the actual native picker, message expressions/revisits, edit/swipe/Continue/Stop, global save isolation, reload/reopen/detach/A→B→A and native composer/draft/focus. **36/36 named native files compare equal** across visual-only operations, and the inherited portability inventory also compares equal. Full path→SHA-256 maps and outgoing global-only save body remain in the structured record. Intentional native edits/generation are recorded separately. The host campaign supplies regression evidence; it does not claim native UI reorder coverage.

Exact final commands, from `/home/dq/Projects/SillyNovel`:

```sh
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/m1-project-expressions.test.mjs tests/probes/dyl19/*.test.mjs > docs/evidence/project-expressions/review/node-tests.txt 2>&1
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl22 timeout 240s node --test --test-isolation=none tests/m1-reader-browser.test.mjs > docs/evidence/project-expressions/review/browser-tests.txt 2>&1
SN_EXPRESSIONS_RUN=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs timeout 600s node tests/probes/project-portability/host.mjs /tmp/SillyTavern-dyl22 > docs/evidence/project-expressions/review/host-run.txt 2>&1
```

Additional checks: `node --check` for the four changed production modules, both changed test suites and the host runner; `git diff --check`; `python3 docs/evidence/project-expressions/review/validate.py`. [Validation log](evidence/project-expressions/review/validation.txt). Prior original evidence is preserved unchanged; the old validator is tied to its historical runtime, and the review validator checks the new frozen inputs.

All eight refreshed screenshots were visually inspected. Desktop 1440×1100/narrow 390×800 screenshots retain the clarified pending-choice label and the separately displayed current expression:

| Phase | Desktop stage | Desktop controls | Narrow stage | Narrow controls |
| --- | --- | --- | --- | --- |
| Selected expression | [Stage](evidence/project-expressions/review/expression-selected-desktop.png) | [Controls](evidence/project-expressions/review/expression-selected-desktop-controls.png) | [Stage](evidence/project-expressions/review/expression-selected-narrow.png) | [Controls](evidence/project-expressions/review/expression-selected-narrow-controls.png) |
| Native edit fallback | [Stage](evidence/project-expressions/review/expression-invalidated-desktop.png) | [Controls](evidence/project-expressions/review/expression-invalidated-desktop-controls.png) | [Stage](evidence/project-expressions/review/expression-invalidated-narrow.png) | [Controls](evidence/project-expressions/review/expression-invalidated-narrow-controls.png) |

**GO for re-review of the bounded correction**, not owner gate or merge approval.

## Scope and remaining limits

Storage/plugin/schema/project-global save behavior is unchanged. The prior 126/126 storage result is retained against identical plugin/test/fixture inputs, not relabeled as a new run. Native host reorder/insertion/object replacement remains NOT_TESTED at the host UI level; the new reorder proof is an actual-entry synthetic Chromium test. Physical touch/IME/virtual keyboard/accessibility, other host/browser combinations and real providers remain NOT_TESTED. No native group work, persistent message history, owner gate or later milestone starts here. Stop for re-review; no merge or auto-merge.
