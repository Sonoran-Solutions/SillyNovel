# DYL-23-A implementation and senior-review handoff

**[Draft PR #30](https://github.com/Sonoran-Solutions/SillyNovel/pull/30): OPEN / DRAFT / UNMERGED; auto-merge disabled.** DYL-23 is In Review, not Done.

**Scope:** [manual-stage UX contract and workflow](M1_MANUAL_STAGE_UX.md). One bounded DYL-23-A implementation; DYL-23 retains its full original acceptance/dependencies. Stop for senior review, no merge/auto-merge. Gate A NOT_RUN; Decision F unchanged; DYL-60 blocked. No native group support, attached source-expression overlays, persistent message history, remembered attachment, director, production/live install or later milestone work.

Starting main: **`ad70bb52e0f46155a5c7b1e5c3da957536612dc9`**, verified with `git fetch origin main` and `gh pr view 29 --json state,mergedAt,mergeCommit,url`. PR #29 is MERGED at that SHA, timestamp `2026-10-16T16:07:26Z`. Initial supplied clean checkout `2f9daa38b9509e6462e3b9a84230a59a14d3c630` was its final head; implementation branch `codex/dyl23-a-stage-ux` starts from the main merge.

Frozen implementation/test/runner SHA: **`646ec9e7bd1439cb2137e97edba9c1526c808db9`**. Later commits contain docs/evidence only. Final pushed head and draft PR are recorded in the final PR/Linear handoff rather than a circular self-referential commit field. [Runtime/test input fingerprints](evidence/project-stage-ux/proof-hashes.json) bind retained results to the frozen input bytes.

## Changed files and engineering decisions

- `src/stage-view.mjs`, `style.css`: native Project/Scene/Artwork Library fieldsets and scene-action rows; sticky local control summary; always-visible active identity, activation-only attachment and persistence scope; short-ID choices/full-reference disambiguation; current-actor form synchronization; selection/presence/position/lock descriptions; explicit attached-project discard/reopen; pending/conflict/uncertain feedback; bounded status lines, dialogue minimum height and missing-art slot captions. Existing native composer and reader are unchanged.
- `src/project-client.mjs`, `src/project-scene.mjs`: transport/malformed/foreign/null/wrong-revision save receipts are uncertain, definite server refusals remain distinct; local save status survives later edits. Explicit reopen is required after conflict/uncertainty; cleanup and repeated save refuse. Pending saves block project replacement while edits may continue. This reuses CAS/session/model ownership and captured snapshots; no schema/service/reducer/plugin/native persistence change or dependency.
- `tests/m1-project-scene.test.mjs`, `tests/m1-reader-browser.test.mjs`: focused save/recovery, discard/cancel, scope/identity, four actors/duplicate names, grouped controls, current selection, focus/narrow and native-composer regressions. Existing reader/source/reducer/library/migration/backup/cleanup tests remain.
- `tests/probes/project-stage-ux/host.mjs`, `tests/probes/project-portability/host.mjs`: optional `SN_STAGE_UX_RUN=1` campaign inside the existing disposable runner. Uses actual controls, four actors, seven reusable entries, save/dirty/reopen, screenshots, native switching, peer conflict/lost committed receipt, named lore/avatar/chat/card inventories and native replying. Existing library/migration campaigns also execute.
- `tests/probes/project-migration/host.mjs`: preserve the original project's UUID from the parent runner for migrated UI reopen. Selecting by duplicate project name could choose another account's project. Ownership/revision/asset/native-file assertions remain intact.
- README, status, roadmap, decisions, architecture, state, testing and these two handoffs record current versus historical scope. No gate, original acceptance or DYL-55 reconciliation is inferred.

## Exact canonical commands

Executed from `/home/dq/Projects/SillyNovel`, redirecting output to the corresponding retained logs:

```sh
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/probes/dyl19/*.test.mjs > docs/evidence/project-stage-ux/node-tests.txt 2>&1
timeout 600s node --test --test-isolation=none plugins/sillynovel-storage/test/*.test.mjs > docs/evidence/project-stage-ux/storage-tests.txt 2>&1
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl22 timeout 240s node --test --test-isolation=none tests/m1-reader-browser.test.mjs > docs/evidence/project-stage-ux/browser-tests.txt 2>&1
SN_STAGE_UX_RUN=1 SN_LIBRARY_RUN=1 SN_MIGRATION_RUN=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs timeout 600s node tests/probes/project-portability/host.mjs /tmp/SillyTavern-dyl22 > docs/evidence/project-stage-ux/host-run.txt 2>&1
```

External tooling only: Node **v26.8.1**, SQLite **3.53.4**, Linux **7.0.0-38-generic**; Chromium version and exact disposable root are in the structured final host evidence. SillyTavern **1.19.0**, **`7e8663cd9c184a550b37238218bdd32c6efc68e9`**, from existing disposable source `/tmp/SillyTavern-dyl22`. The runner creates a fresh clone/data root, synthetic accounts/cards/chats and the deterministic loopback endpoint on port 8128. It installs the plugin only into that fresh host and stops only its own children. No live installation, private data or real model/provider. No build step or repository dependency was added. GitHub `gh run list --branch main --limit 5 --json databaseId,status,conclusion,headSha` returned `[]`; the repository has no hosted workflow configuration.

## Development failures retained separately

[First browser run](evidence/project-stage-ux/development-browser-1.txt): 37/41 pass, four failures while implementing the stage. The session catalog needed optional asset-ID access and the expanded status/control layout squeezed dialogue. Fixed the shared rendering path and bounded/minimum layout sizes; no assertions weakened. A sandbox-only browser attempt produced no test output and was interrupted; it is not a result.

[First host attempt](evidence/project-stage-ux/development-host-1.txt), [structured failure](evidence/project-stage-ux/development-host-1.json): inherited library check required conflict status to identify unsaved edits. The new wording now explicitly says “Unsaved project changes · save conflicted”.

[Second host attempt](evidence/project-stage-ux/development-host-2.txt), [structured failure](evidence/project-stage-ux/development-host-2.json): all new stage checks and inherited checks through explicit migration publication passed, then the migration UI runner timed out selecting a same-name project owned by the other synthetic account. Fixed the runner to select the original UUID; preserved its full assertions. This failed mutable run is not relabeled as frozen evidence.

[Incomplete sandbox storage run](evidence/project-stage-ux/development-storage-sandbox-incomplete.txt) stalled at the killed-backup subprocess check and was interrupted. The canonical final run uses full child-process/signal access outside the sandbox; the incomplete run supplies no overall pass or count. No storage test or product recovery code was changed.

## Frozen results and recommendation

**GO for senior review of DYL-23-A only.** All four final campaigns completed with no failures, skips or cancellations. Counts overlap in scope and are not added into one product-acceptance total.

| Campaign | Exact result | Evidence |
| --- | --- | --- |
| Node source/reducer/model/lifecycle | **91/91 PASS** | [Log](evidence/project-stage-ux/node-tests.txt) |
| Storage/library/bundle/backup/migration/cleanup | **126/126 PASS** | [Log](evidence/project-stage-ux/storage-tests.txt) |
| Actual-entry synthetic Chromium | **46/46 PASS** | [Log](evidence/project-stage-ux/browser-tests.txt) |
| Real disposable pinned host | **24/24 checkpoint groups PASS** | [Run log](evidence/project-stage-ux/host-run.txt), [structured evidence](evidence/project-stage-ux/host.json), [host log](evidence/project-stage-ux/host.log) |

Final host root `/tmp/sn-portability-host-opVIds`; Chromium **151.0.7922.34**. Campaign verifies actual create/register/import/apply/save/dirty/reopen/detach/discard controls, four actors including two Mira labels, three stable visible slots with offstage membership, two backgrounds and alternative actor sprites, presence/reservations/explicit swap/replace, locks, retained library and restored arrangement. A real peer saves first to cause CAS conflict. A routed real successful save loses its receipt; the UI retains local edits, disables another save and explicitly reopens to discover the committed revision. Native A → B → A detaches without reattachment. A native user message is actually sent, and deterministic native generation/stop/backlog still work. Existing library checks cover failed PNG, stale import/cleanup and explicit unregister/save/delete; existing migration checks verify refusal/preservation, operator-only new-output migration and explicit reopen.

Named SHA-256 inventories, compared as full name→digest maps in structured evidence:

- **36/36 unchanged** across the visual-only stage campaign: synthetic character/card files, both native conversations, fixture/default lorebooks and a synthetic persona-avatar PNG. Native reply is deliberately sent **after** this comparison; its chat mutation is expected, not mislabeled as non-mutation.
- **34/34 unchanged** across the existing library campaign.
- **65/65 unchanged** across the migration campaign, including both synthetic accounts' enumerated native files. Original v1 database and both preserved backup files retain their hashes after successful new-output migration.
- The captured native main-API/connection-manager context hashes also match. This is a bounded context check, not a claim that every provider preference, persona metadata field, extension or filesystem path was inventoried. Actual-entry tests separately preserve native chat/character/metadata/connection fixtures, composer node, draft/caret and lifecycle.

Additional executed checks: `node --check` for the three changed production modules, both changed test suites and all three changed host runners; `python3 /tmp/dyl23-validate.py` (9 changed Markdown documents/fences, 227 local file links, 101 frozen input fingerprints, all 24 host checkpoints/inventories and eight stage screenshots); `git diff --check`. [Validation log and evidence checksums](evidence/project-stage-ux/validation.txt). No hosted CI workflows/checks were available; no fabricated build or compatibility claim.

## Screenshots and visual review

Actual pinned-host Chromium, with synthetic artwork and native composer. Desktop **1440×1100**, narrow **390×800**. Controls scroll within a bounded panel; screenshots show a particular scroll position, not every control at once. Project scope remains outside that panel. The runner waits for the native API drawer to close before captures. All eight stage screenshots were visually inspected; these are viewport emulations, not touch-device observations.

| Phase | Desktop stage | Desktop controls | Narrow stage | Narrow controls |
| --- | --- | --- | --- | --- |
| Before reload/reopen | [Stage](evidence/project-stage-ux/stage-before-reopen-desktop.png) | [Controls](evidence/project-stage-ux/stage-before-reopen-desktop-controls.png) | [Stage](evidence/project-stage-ux/stage-before-reopen-narrow.png) | [Controls](evidence/project-stage-ux/stage-before-reopen-narrow-controls.png) |
| After explicit reopen | [Stage](evidence/project-stage-ux/stage-after-reopen-desktop.png) | [Controls](evidence/project-stage-ux/stage-after-reopen-desktop-controls.png) | [Stage](evidence/project-stage-ux/stage-after-reopen-narrow.png) | [Controls](evidence/project-stage-ux/stage-after-reopen-narrow-controls.png) |

Additional retained fallback evidence: [migration-required reader](evidence/project-stage-ux/migration-required.png), [migrated explicit reopen](evidence/project-stage-ux/migration-reopened.png).

## Remaining issues and next step

The bounded manual stage is ready for senior review, with global layout/library persistence and explicit recovery. Expanded controls and full reference descriptions require scrolling, especially on narrow viewports; they intentionally yield artwork space to dialogue/composer. Conflict/uncertain recovery preserves the editor until deliberate discard/reopen, but there is no draft merge/export or in-app undo. Other clients' unsaved references remain undiscoverable by cleanup. Those existing limits are disclosed, not resolved by this slice.

Original DYL-23 acceptance remains unfinished for attached source-expression overlays and their edit/swipe/delete/continue/historical invalidation, saved-project native groups/four-member duplicate-card integration, and identified physical touch/virtual-keyboard/IME/accessibility evidence. The four actors here are manually registered in an individual conversation, **not native group support**. Persistent source history/native correspondence, remembered attachment and verified single-writer/read-only tabs remain unimplemented broader gate requirements. PNG-only storage, selected-only portable v1, other browser/host/runtime/platform support, real-provider behavior and production durability retain existing limits. Physical devices, real IME/virtual keyboard and assistive technology are **NOT_TESTED**.

DYL-24 session stage, DYL-53 global projects and merged DYL-22 first PNG catalog remain credited separately. DYL-23-A supplies no Gate A verdict or approval of Decision F and does not complete all DYL-23 requirements. Leave DYL-23 In Review after the draft PR; leave DYL-60 blocked and DYL-55 unchanged. Recommended next step is senior review of this PR; any source-overlay/group work needs a separate bounded assignment. **Stop here without merging or starting later work.**


Screenshot QA correction: [prior all-pass campaign](evidence/project-stage-ux/development-host-3.json), [log](evidence/project-stage-ux/development-host-3.txt), used implementation `3f46a9bc5d9b9580405d966f8817a6a96d91f543`. Visual inspection found one reopened desktop capture obscured by an animating native API drawer. The final frozen commit changes only the runner to await closed-drawer visibility and offset scrolling below the sticky summary. Production/UI and regression assertions remain identical; all final canonical campaigns were repeated on the new frozen commit rather than relabeling the older captures.
