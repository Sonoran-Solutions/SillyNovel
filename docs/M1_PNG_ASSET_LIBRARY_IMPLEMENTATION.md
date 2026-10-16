# DYL-22 implementation and evidence

**Historical first handoff:** senior review returned REVISE for the automatic in-place migration. Its code/evidence below and `docs/evidence/project-library/` are preserved unchanged as that original campaign. [Current P2 correction and exact-head re-review evidence](M1_PNG_ASSET_LIBRARY_REVIEW_CORRECTION.md) supersedes its migration proposal and resolves the earlier Linear publication hold.

**GO for senior review of this first PNG-library slice only.** [Draft PR #29](https://github.com/Sonoran-Solutions/SillyNovel/pull/29) is OPEN/UNMERGED, auto-merge disabled. Starting main `262aad7b64624845e68f783bf779a6fd5e4689d4` includes merged PR #28. Frozen tested code: `80c03000b9f9b3a2a5c67e4daa6752d1964ee515`. Later commits contain documentation/evidence only; [99 file fingerprints](evidence/project-library/proof-hashes.json) cover all tracked runtime/plugin/test/fixture inputs. Final pushed head is recorded in the PR/Linear handoff rather than a self-referential commit field.

[User workflow and complete storage/migration contract](M1_PNG_ASSET_LIBRARY.md). Create/open a project, register a manual actor, import labeled PNG backgrounds/sprites, Save project, reload/detach and explicitly reopen, then select alternatives without reimport. UUID-bearing options distinguish duplicate labels; selected artwork is identified separately. Label edits and library removal are deliberate; selected bytes need a separate unused-art deletion confirmation after unregister/save.

## Changes and design

- `src/project-scene.mjs`, `src/stage-view.mjs`: reload complete catalog, compatible actor outfits, label/category import, text-only label editing, selected-reference display and explicit unregister. Reuse the existing reducer/three slots/larger cast, locks, dirty/CAS/epoch and neutral-art behavior. Native adapter, reader, composer and canonical data are unchanged.
- Plugin `schema.mjs`, `database-schema.mjs`, `store.mjs`, `index.mjs`: one project-owned catalog column; schema/envelope v2; strict registration validation, transactional scene+catalog saves, old-client erasure refusal, exact-byte project-local PNG reuse, catalog-aware cleanup protection/digest. No separate database/framework/dependency.
- `recovery.mjs`: exact v1/v2 SQL and catalog validation, schema-matched manifests, whole-library backup/empty-slot recovery. Real additive v1→v2 migration retains IDs/revisions/scenes/bytes and rolls back DDL/data/marker on failure. The narrowly transactional in-place migration is an engineering proposal for this transition, explicitly distinguished from the earlier future copy-to-new-output policy and from owner approval.
- `test/library.test.mjs`, model tests and disposable library host hook: durable alternatives, ownership/compatibility/CAS, failed metadata writes, delayed work, cleanup, actual v1 preservation/rollback, corrupt/mismatched backups and selected-only bundles. Existing quota/pixel/backup-overlap fixtures now use distinct PNGs because identical uploads deliberately reuse bytes. Actual-entry protocol mocks require v2/catalog capability.
- README/status/roadmap/architecture/state/decisions/testing and prior storage/recovery/cleanup/portability documents link the current contract while preserving historical evidence and original unmet requirements.

## Exact final commands and evidence

Run from the repository root with Node **v26.8.1**, SQLite **3.53.4**, Linux. Browser tooling is external, with **Chromium 151.0.7922.34**. Pinned disposable SillyTavern **1.19.0**, `7e8663cd9c184a550b37238218bdd32c6efc68e9`. The old `/tmp/SillyTavern-m12-review` checkout was absent; recreated `/tmp/SillyTavern-dyl22` from upstream and checked out that exact pin. Ran `npm ci --prefix /tmp/SillyTavern-dyl22 --ignore-scripts --no-audit --no-fund`; no project dependency change. The existing host runner clones that source into its own fresh directory, copies locked dependencies, installs only this experimental plugin there, symlinks this extension, creates synthetic accounts/data and stops only children it starts.

```sh
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/probes/dyl19/*.test.mjs
node --test --test-isolation=none plugins/sillynovel-storage/test/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl22 node --test --test-isolation=none tests/m1-reader-browser.test.mjs
SN_LIBRARY_RUN=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/project-portability/host.mjs /tmp/SillyTavern-dyl22
```

The executed commands redirected output to the four linked logs. Results:

| Campaign | Result | Evidence |
|---|---|---|
| Node source/reducer/model/lifecycle | 85/85 PASS | [Log](evidence/project-library/node-tests.txt) |
| Storage/bundle/recovery/cleanup/library | 119/119 PASS (including 15 library checks) | [Log](evidence/project-library/storage-tests.txt) |
| Actual-entry synthetic Chromium | 39/39 PASS | [Log](evidence/project-library/browser-tests.txt) |
| Real disposable host | 17/17 checkpoint groups PASS | [Run](evidence/project-library/host-run.txt), [structured evidence](evidence/project-library/host.json) |

Additional commands actually run: `node --check` on `src/project-scene.mjs`, `src/stage-view.mjs`, plugin `schema.mjs`, `database-schema.mjs`, `store.mjs`, `recovery.mjs`, `index.mjs`, and both changed host runners; `python3 /tmp/dyl22-doc-check.py` (relative-link/anchor, fence and JSON example validation); `git diff --check`. Final link/fingerprint/evidence verification is recorded in `validation.txt` after the evidence files are complete. No build step exists. After publishing, GitHub workflow-runs and PR status-check queries returned empty arrays; this repository has no tracked workflow files. Hosted CI is unavailable, not a CI pass.

## Real-host results

Final disposable root `/tmp/sn-portability-host-3d4K4Q`; exact code/host/source/asset hashes and synthetic IDs are in `host.json`. Actual catalog controls imported **two backgrounds and two alternative sprites for one actor**, saved, reloaded, explicitly reopened, and reselected every alternative. A second independent project had its own catalog/actor scope. Two synthetic authenticated accounts refused foreign access; two clients received a stale-save conflict while local edits remained dirty. Two concurrent identical uploads reused the original UUID. Inert HTML-looking labels rendered as text; corrupt PNG upload preserved the saved project and draft/composer node. Saved unselected alternatives were absent from cleanup candidates.

A committed PNG response held across native conversation switching never attached to the new conversation. A stale cleanup confirmation refused after an intervening upload. Explicit unregister/save then selected cleanup removed only the chosen alternative. Full schema-v2 backup inspection retained remaining library assets; portable v1 exported selected bytes only. Browser portable import/reopen, failed transactional writes, delayed receipts, plugin/server restart, missing/corrupt artwork and plugin absence passed inherited checkpoints. Actual host native send/stream/stop/navigation/backlog passed; detailed Copy/Continue, caret/focus, failure restoration and source invalidation are covered by the separate actual-entry synthetic browser suite, not claimed as new real-provider/device evidence.

Exactly **34 named native files** (synthetic chat/card files and pinned default character/lorebook resources) have identical SHA-256 inventories before/after the library campaign; portable campaign inventories also match. This is an enumerated file claim, not a claim that the entire host directory, dynamic UI settings or all operating-system files never changed. Persona/provider settings were not separately inventoried as whole-file hashes; the unchanged adapter and reader suite preserve the canonical write boundary. No personal chats, credentials, private cards or user art were used or committed. Only public synthetic metadata/hashes/screenshots/logs are retained, not raw databases/backups/native chats.

Screenshots visually inspected:

- [Desktop saved library arrangement](evidence/project-library/library-desktop.png).
- [390 × 800 saved reader/composer](evidence/project-library/library-narrow.png).
- [390 × 800 catalog controls](evidence/project-library/library-controls-narrow.png): scrollable controls, text labels and removal/save controls remain reachable; art yields space while controls are open.
- [Original restored two-sprite layout](evidence/project-library/restored.png) and [portable copy](evidence/project-library/portable-restored.png).

Viewport emulation is **not** physical-touch/virtual-keyboard evidence. The tests are technical acceptance, not an owner session or Gate A verdict.

## Compatibility and remaining limits

Database/project envelope v2 adds only project catalog metadata. Scene and portable serialization v1 remain unchanged. Full-store backup container v1 explicitly carries and validates schema 1/2. Original v1 backup → empty-slot restore → v2 open preserves UUIDs, revisions, scenes and bytes; injected migration metadata/marker failures preserve the original database byte-for-byte. No downgrade or live-store overwrite. Update extension/plugin/operator tools together and create/inspect a full backup before upgrade.

Saved library and scene references are deletion-protected. Explicit unregister/save is separate from physical byte deletion; other clients' unsaved drafts remain outside server knowledge. No automatic GC or compaction. Final quota test recovers **4,001,673 logical bytes**, accepts a distinct replacement PNG, and returns freelist pages to use; physical database size stays **104,185,856 bytes**. Portable v1 copies deliberately omit library labels and unselected alternatives and retain their existing smaller limits; use a full backup for the library. UI discloses this before export and in download feedback.

PNG only; no JPEG/static-WebP expansion, expression library/attribution/revision-management completeness, persistent source history, native-card association, group-mode/project overlays, device certification, single-writer lease, cloud/provider work or release. Existing experimental asset/count/byte/pixel limits and 32 KiB save envelope remain; large libraries still have synchronous decode/cleanup and bounded eager loading costs. Physical devices, other runtimes/hosts/platforms, power loss/disk-full certification and production/live installation remain NOT_TESTED/unapproved.

## Development corrections and tracking

Pre-freeze attempts are not final-SHA passes. Retained [development logs](evidence/project-library/development/) show:

- 110/112 storage after the first fixture update: backup-overlap tests rewrote a now-distinct PNG row using the old digest. Fixed the fixture to write only matching SHA-256 rows; the targeted two-test recheck passes. Earlier duplicate-PNG quota/pixel/cleanup assertions were corrected to use actual distinct images, preserving their intended bounds/reference assertions.
- 38/39 actual-entry browser: an over-broad cleanup busy flag disabled explicit project replacement. Keep replacement available and gate model mutations while abandoning stale receipts; the targeted replacement recheck and final 39/39 pass.
- Initial host library scenario reached its final hash comparison but created native conversation B after the baseline. Precreate both synthetic conversations before baseline; subsequent full runs and final frozen run pass. No hash mismatch was suppressed.
- Early noncanonical sandbox subprocess attempts were incomplete/failed; only the final completed commands above count as acceptance. The previous merged baseline evidence files remain unchanged.

No implementation blocker remains for this slice. Live Linear currently reports DYL-55 **Done**, whereas this assignment requires owner acceptance to remain pending. This task does not modify that external status or infer owner acceptance; the discrepancy is recorded for the owner. DYL-22 must stay unfinished with original acceptance and historical blocker relations preserved. DYL-23 remains separately gated, DYL-56/60 unchanged, Decision F undecided, Gate A NOT_RUN; no M1.3/M2, production/release or upstream authorization. Recommend senior review of this bounded draft PR, then an explicit owner decision; do not merge or start the next slice automatically.

## External handoff blocker

Draft PR #29 and its artifact attachment were published successfully. Automatic approval review rejected two attempts to post the DYL-22 handoff through the Linear comment tool, stating that it did not recognize the pasted assignment as trusted publication authorization. The second attempt supplied the assignment’s explicit §7 instruction and the concrete public PR/evidence links; it was still rejected. No alternate publication path or Linear status mutation was attempted. No Linear comments, statuses, descriptions or blocker relations were changed by this task.

The requested update is prepared in the PR description and this report (implemented scope, original unmet requirements, exact acceptance, format/portability/backup/migration limits, PR/test links). Publishing that handoff to DYL-22 remains blocked on explicit approval recognized by the automatic reviewer. This is an external handoff blocker, not a failed code/host test. DYL-22 has not been marked Done or unblocked.
