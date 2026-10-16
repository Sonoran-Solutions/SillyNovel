# DYL-59 implementation and acceptance evidence

**GO for bounded senior review**, subject to the completed frozen campaign below. [Cleanup contract](M1_PROJECT_ASSET_CLEANUP.md). No merge, release, live installation, parent completion or human-gate verdict follows.

Original shared checkout was clean at `1ff171f747c6f03cbd3cf7aa8564e0d06d8ec4fd`; it remains preserved. Fetched starting/current main: `b37a60615795d8871171504de88da8d10afddf9e`. Verified GitHub #25 MERGED at `4337a05ac8321e714a9677d6a408aa3ee37bbcbf` and #26 MERGED at starting main. Linear DYL-57/58 Done; DYL-59 Backlog with those two dependencies; DYL-55 unfinished, DYL-56 Backlog and DYL-22/23 Backlog with blockers retained. DYL-59 alone moved to In Progress. Dedicated managed worktree, branch `codex/dyl-59-asset-cleanup`; execution used a writable temporary worktree location, subsequently returned to its managed location for handoff.

Runtime implementation frozen at `ebe4d08cb2b771f9ba4d51a7880c749844441156`. Final frozen acceptance head **`c77f512834d9c52b17a9d0a74f0ed5a89004c50a`** adds only an explicit original-project post-cleanup save/reload/reopen host assertion. Final campaigns all run on that latter head. Subsequent changes are evidence/documentation only. The final pushed head is recorded in the PR/Linear handoff, avoiding a circular SHA inside its own commit. [Runtime/test hashes](evidence/project-cleanup/proof-hashes.json), [run summary](evidence/project-cleanup/runs.json).

## Commands and separation of evidence

Commands actually executed from the dedicated checkout:

```sh
git fetch origin main
gh pr view 25 --json state,mergeCommit
gh pr view 26 --json state,mergeCommit
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
npm test --prefix plugins/sillynovel-storage
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test --test-isolation=none tests/m1-reader-browser.test.mjs
SN_CLEANUP_RUN=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/project-portability/host.mjs /tmp/SillyTavern-m12-review
git diff --check
```

Development-only targeted commands additionally used `node --test --test-isolation=none plugins/sillynovel-storage/test/cleanup.test.mjs`, `tests/m1-project-scene.test.mjs`, the initial inherited storage/bundle/recovery/model glob, `--test-name-pattern='separate SQLite' --test-reporter=tap` for cleanup tests and `--test-name-pattern='unused artwork' --test-reporter=tap` for Chromium. Superseded sandbox test runners were stopped by exact task-owned PID; these incomplete attempts are not counted as passes. Final subprocess/browser/host campaigns ran with the necessary local process/network permissions. No new production dependency, hosted CI, build or compatibility claim is inferred.

| Frozen campaign | Result | Evidence |
| --- | --- | --- |
| Storage, DYL-57 bundles, DYL-58 recovery, DYL-59 cleanup | **104/104**; 19 cleanup tests, unchanged predecessor checks included | [npm output](evidence/project-cleanup/storage.txt) |
| Existing Node regressions and project/client checks | **80/80** | [Output](evidence/project-cleanup/node.txt) |
| Actual-entry Chromium with synthetic host APIs | **39/39**, including eight cleanup control/lifecycle cases | [Output](evidence/project-cleanup/browser.txt) |
| Real pinned disposable host/browser | **21/21 named checkpoint groups**; individual checks overlap preceding campaigns | [Output](evidence/project-cleanup/host-run.txt), [host JSON](evidence/project-cleanup/host.json), [cleanup details](evidence/project-cleanup/cleanup.json) |

Zero failures/cancellations/skips/todos in final test suites. Do not sum checkpoint groups and Node assertions as distinct coverage. The Chromium fixture runs real entry/renderer code and mocks network responses; it is separate from the actual host workflow. All fixtures are synthetic/public-safe. Historical DYL-57/58 evidence is unchanged.

## Implemented transaction and refusal contract

Schema v1 and the strict DYL-58 startup validator remain. Preview and deletion use the existing synchronous `BEGIN IMMEDIATE`/COMMIT/ROLLBACK helper. The inventory digest binds authenticated owner, project UUID, committed revision and validated scene, sorted complete inventory metadata and candidate IDs. Both operations recheck saved references and all bounded PNG rows. Deletion rechecks revision, selected ownership/references and the independently recomputed digest, then parameterized project-and-ID deletes demand exactly one row each. Success is constructed inside the transaction but cannot return until COMMIT succeeds. Cleanup does not increment scene revision. One invalid selection, integrity issue, stale state or write failure rolls back all selected rows.

`REVISION_CONFLICT`, `CLEANUP_STALE`, `ASSET_REFERENCED`, `ASSET_MISSING`, `NOT_FOUND`, strict schema/body refusals and generic storage failures are distinct; server responses never include caught SQLite paths/stacks. Authentication comes only from the host session. Current model dirty/import/save/replacement gates protect this browser; explicit confirmation names count/bytes and other clients' unsaved risk. The client verifies exact committed receipts; invalid/lost/untyped proxy responses are uncertain and not retried. Successful or uncertain removal evicts submitted cached alternatives. A deleted-reference save refuses without changing the committed scene or discarding in-memory edits.

## Coverage and actual-host workflow

Real SQLite checks cover empty/no-assets/all-referenced scenes, background and multiple actors sharing one ID, distinct IDs with identical PNG contents, unused alternatives before failed saves, single/multiple selected deletion, exact preserved scene/revision and rows, owner/project isolation, forged/duplicate/unknown/referenced/oversized IDs, scene and inventory changes, repeated cleanup and unrelated new-project import. Corrupt PNG bytes/hash/dimensions and missing saved references refuse the complete preview/removal. Before-first and after-first-delete SQLite triggers prove full rollback by committed-row comparison. Valid synthetic backups precede destructive checks.

Dedicated workers establish separate SQLite connections for save, upload, export and backup while the real cleanup transaction holds its write reservation. The save cannot commit a deleted reference; upload/export serialize coherently and backup remains a validated coherent before/after snapshot. Overlapping bundle jobs retain `BUNDLE_BUSY` refusal; tests assert it rather than weakening the existing gate. No production parallel writer path was introduced.

Model/Chromium checks cover explicit cancel/no deletion, selection totals, dirty/pending upload/save refusal, successful cached-art eviction, typed missing-reference recovery and transport/malformed/proxy/wrong-receipt uncertainty. Preview and deletion receipts delayed across chat switch, project replacement and disable cannot change new model ownership, dirty state or visuals. Those six delay combinations have synthetic browser/model evidence; the real host separately exercises a delayed preview across native A/B/A, a committed lost deletion response and inherited delayed save/import lifecycle checks.

The actual pinned host campaign creates two synthetic authenticated accounts and native characters; imports background plus two sprites; saves positions/locks; imports two unsaved alternatives; reloads and explicitly reopens. Cleanup preview excludes the three saved references. Cancel retains rows; explicit selected deletion removes one exact unused row. Real HTTP tests cover foreign/forged IDs, owner fields, unsupported method, malformed/oversized bodies and missing/invalid CSRF. A second client upload stales preview. An injected failure on the second selected delete returns generic storage failure and preserves all rows. A response aborted after `route.fetch()` still has a committed deletion in SQLite; UI reports uncertainty, and another draft's missing reference is refused.

Dirty edits and a pending PNG request disable cleanup; explicit reopen preserves original saved state. Real quota fill/refusal/cleanup/replacement upload, portable export and verified pre/post backups follow. The original project then saves, reloads detached and explicitly reopens with the original background, sprites, actor IDs, presence, positions and locks. Only that deliberate save increments revision. The inherited portability campaign then verifies copy/remapped identities, native navigation/send/stream/stop, storage failures, restart, explicit imported reopen and plugin-disabled session fallback. A final CSRF-disabled host refuses inspection/deletion with `CSRF_REQUIRED`.

Only the specifically inventoried two-account native files receive an unchanged-hash claim. Their explicit names/digests are in cleanup JSON. Host account creation and native chat creation happen before the cleanup inventory; synthetic native activity outside that window is not described as global non-mutation.

## Measured outcome

The final pinned host is SillyTavern **1.19.0**, `7e8663cd9c184a550b37238218bdd32c6efc68e9`; **Node v26.8.1**, **SQLite 3.53.4**, **Chromium 151.0.7922.34**, Linux. Host source/fixture hashes, candidate revision/digest, exact candidate UUIDs/SHA-256/dimensions/bytes, full before/after project and asset metadata, scene JSON and the native inventory are retained in host/cleanup JSON. Final disposable root: `/tmp/sn-portability-host-7YC9TC`. The 3-project/6-asset pre-cleanup inventory and 5-project/33-asset post-campaign inventory include explicitly created foreign/quota fixtures; the original saved scene is separately compared unchanged.

| Quota measurement | Before removal | After removal | After new upload |
| --- | ---: | ---: | ---: |
| Logical account bytes | 104,091,432 | 100,089,759 | 104,091,432 |
| SQLite file bytes | 104,239,104 | 104,239,104 | 104,239,104 |
| Freelist pages | 0 | 978 | 0 |

The initial project preview has two alternatives, **16,045 logical bytes**, at revision **1**. One explicit browser removal deletes the **11,591-byte** alternate while leaving revision **1** and all saved asset hashes/scene fields intact. Later cleanup/conflict/failure episodes are inspected independently. The final deliberate original-project save advances revision **1 → 2** and the reloaded/reopened arrangement matches it.

The quota campaign reaches `ASSET_QUOTA`, explicitly removes one **4,001,673-byte** PNG, observes the exact logical-byte reduction, then uploads another valid PNG successfully. SQLite file length remains unchanged during deletion; **978** freelist pages become available and are consumed by the replacement upload. These are separate observations, not an OS-space reclamation guarantee. No VACUUM, compaction, database replacement or restore occurs in the cleanup host campaign. DYL-58 tests separately retain their previously authorized synthetic recovery checks.

Pre-cleanup snapshots contain unused artwork; post-cleanup snapshots validate with matching account incarnations and the resulting inventory. Portable export still includes exactly the three saved referenced assets. Full backup files remain private in the disposable root and are not committed. Only metadata/hashes, console results and the public synthetic screenshot are retained in the repository. [Reopened original layout](evidence/project-cleanup/cleanup.png).

The first confirmed selection on project `1070ee02-38cb-48ad-ae5f-3ac41ace7ee2 used this body and received this validated committed receipt:

```json
{
  "expectedRevision": 1,
  "inventoryRevision": "d6ee7b70b281883dd281cc79276f54bf96e113052d764b4ad6dc46240d64ab88",
  "assetIds": [
    "a4626517-5777-4eca-a1b7-196f4e991c66"
  ]
}
```

```json
{
  "projectId": "1070ee02-38cb-48ad-ae5f-3ac41ace7ee2",
  "revision": 1,
  "deletedIds": [
    "a4626517-5777-4eca-a1b7-196f4e991c66"
  ],
  "deletedCount": 1,
  "reclaimedBytes": 11591
}
```

## Development failures that informed the result

- [Initial PNG fixture rejection](evidence/project-cleanup/development/invalid-png.txt): the old probe PNG is invalid under the full decoder. The new check generates a valid 1×1 PNG using existing pngjs; validation was not weakened.
- [Bundle concurrency refusal](evidence/project-cleanup/development/bundle-busy.txt): attempting import and export together correctly triggered `BUNDLE_BUSY`, and the abandoned import produced teardown noise. The check now asserts refusal, awaits the admitted operation and verifies subsequent snapshots.
- [Cross-worker entry failure](evidence/project-cleanup/development/worker-entry.txt): importing `openStore` in a separate worker inadvertently executed the bundle module's worker entry and delivered an unrelated result. The shared entry now runs only for encode/decode jobs. All four cross-connection checks then passed.
- Initial new browser fixtures omitted `getRequestHeaders`, so the persistence capability correctly remained unavailable. The fixture now supplies the same explicit header seam as predecessor browser tests. Superseded waits were stopped; no runtime capability check was relaxed.
- [Native-inventory baseline](evidence/project-cleanup/development/native-baseline.txt): switching to synthetic Project B for the first time created its native JSONL after baseline. Both native chats are now deliberately visited before hashing. The corrected complete 64-file inventory remains byte-identical throughout the cleanup workflow, including post-cleanup save/reload/reopen.

## Limitations and handoff

Other tabs' unsaved references cannot be enumerated. They may keep displaying cached Blob URLs until they refresh or receive `ASSET_MISSING` on save. Their edits remain available for deliberate reimport/reference changes; no silent substitution occurs. There is no in-app undo. Maintain verified private database backups; portable bundles omit unused art. Follow the separate operator recovery contract rather than overwriting a live store. Failed/lost HTTP responses are never treated as proof of rollback.

Preview/deletion fully decode one bounded PNG at a time while holding a synchronous write reservation. Large allowed projects can pause other plugin work; inherited ceilings and the measured synthetic cases do not certify production latency/memory budgets. No automatic garbage collection, persistent draft reservations, physical disk shrink, hostile-admin isolation, actual power-loss/disk-full durability, other host/runtime/OS/filesystem support or physical-device testing is claimed. Gate A remains NOT_RUN.

After required acceptance, DYL-59 is **In Review**, with one **OPEN/UNMERGED** PR and auto-merge disabled. **GO for senior review only.** DYL-55 remains unfinished, DYL-56 Backlog, DYL-22/23 blocked, DYL-24 supported, M1.3/M2 unauthorized and upstream on hold. Smallest next task: senior review of the transaction, unsaved-draft warning/recovery UX and exact evidence on this PR; owner acceptance remains required before any merge or parent completion review.
