# PR #31 senior-review correction

The owner's pasted senior review returned REQUEST CHANGES for one P2 finding at reviewed head **`8e6e97020472a9a6c49e2376730f8563dcdd91c1`**, the clean starting checkout for this correction. PR #31 remains draft/open/unmerged; [DYL-62](https://linear.app/devils17/issue/DYL-62) remains In Review. DYL-23's recorded Done/history, DYL-60 Backlog, Decision F undecided and Gate A NOT_RUN are unchanged. The assignment authorizes this bounded correction only.

## Root cause and correction

Reader reconciliation preserved per-source content revisions after existing objects moved. Only the broad display revision advanced, while the stage and overlay signatures ignored source order. As a result, the correct prefix/suffix reconciliation was never called automatically.

`reader-source-model.mjs` now exposes `sourceOrderRevision`, advancing on changes to ordered source keys/count/availability in full reconciliation and incremental samples. `transient-scene.mjs` adds it to the existing shared `evidenceStamp`, which the stage already uses. `project-expressions.mjs` now reuses that shared stamp instead of maintaining a parallel source signature. Source-order changes immediately suppress the expression projection and refuse application while incremental prefix validation is pending. Unchanged refreshes and text scrolling do not change the order stamp; no prefix hashing or history encoding is added to those paths. `source-prefix.mjs` and its cache, limits and invalidation algorithm are unchanged.

The optional P3 is addressed by labeling the existing chooser **Expression to apply · selected source only**. It identifies the pending choice separately from the current-expression status, retaining intentional imported selections. No selector synchronization, persistence, storage, provider or identity redesign.

## Regression proof

[Before-fix actual-entry run](evidence/project-expressions/review/development/reorder-before-fix.txt): both new browser cases fail on the stale expression remaining visible. [After-fix focused run](evidence/project-expressions/review/development/reorder-after-fix.txt): 2/2 pass. The source/model development run passes 48/48. These mutable development runs remain separate from final evidence.

Both actual-entry regressions reorder the same unchanged host message objects while preserving the selected source and head. One swaps only earlier sources, retaining the selected numeric index as well; the other moves the selected source. The test emits a host refresh event only, never invokes the overlay model or navigates after reordering. It delays SHA-256 to assert synchronous base-art fallback, disabled expression application and a usable native composer before reconciliation finishes. Completion invalidates the affected expression and preserves the global project/selected dialogue. Instrumented encoder and digest calls remain zero after text scrolling plus an unchanged canonical reconciliation. Reader coverage independently proves unchanged source/selection revisions on reorder, separate content changes, sample swaps/appends and unavailable records.

Frozen correction SHA and final results are recorded after verification. Final pushed head is recorded in the PR/Linear handoff rather than creating a self-referential commit field.

## Scope and remaining limits

Storage/plugin/schema/project-global save behavior is unchanged. The prior 126/126 storage result is retained against identical plugin/test/fixture inputs, not relabeled as a new run. Native host reorder/insertion/object replacement remains NOT_TESTED at the host UI level; the new reorder proof is an actual-entry synthetic Chromium test. Physical touch/IME/virtual keyboard/accessibility, other host/browser combinations and real providers remain NOT_TESTED. No native group work, persistent message history, owner gate or later milestone starts here. Stop for re-review; no merge or auto-merge.
