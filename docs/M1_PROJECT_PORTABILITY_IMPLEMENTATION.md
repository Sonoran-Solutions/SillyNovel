# DYL-57 portability implementation and evidence

Owner-authorized bounded portable-project slice under DYL-55. **GO for senior review** only when the frozen evidence below passes. Production/live installation, whole-database recovery, cleanup, associations, M1.3/M2 and owner Gate A are excluded. [Format/API/security/limits contract](M1_PROJECT_PORTABILITY.md). One focused implementation PR is to remain OPEN/UNMERGED.

## Baseline and tracking

Original clean checkout `4688646861274d9b5c993e9c478628d84c700144` was preserved on its previous branch. Fetched main and implementation base: `537c193ce6ac22234cfaab04def85af8ae0a25a2`. Verified GitHub PR #23 MERGED (`97441493dd42343883c5ef3f5ae44ad845e1368a`), #24 MERGED (base SHA). Linear DYL-49–53 Done; DYL-54 actually **Done** at inspection, contrary to the assignment's historical note. This task did not change that status or infer owner experience acceptance. DYL-55's original DYL-54 blocker relation remains intact.

Searches for bundle, backup and unreferenced work found no equivalent child issues. Created:

| Issue | Scope / dependency | Handoff state |
|---|---|---|
| [DYL-57](https://linear.app/devils17/issue/DYL-57) | Portable bundles, child of DYL-55 | In Progress until frozen acceptance completes; then In Review |
| [DYL-58](https://linear.app/devils17/issue/DYL-58) | Database backup/recovery/migrations, after DYL-57 | Backlog, unimplemented |
| [DYL-59](https://linear.app/devils17/issue/DYL-59) | Explicit unused-asset cleanup, after DYL-57/DYL-58 | Backlog, unimplemented |

Parent DYL-55 remains Backlog/unfinished. DYL-22/23 retain their original blockers, DYL-56 Backlog, Gate A NOT_RUN. No new owner verdict was supplied for any human gate.

## Behavior

Authenticated export reads a consistent saved-scene/asset snapshot, checks stored hashes, validates each referenced PNG in a worker, and downloads the complete v1 `.sillynovel` container. Export does not increment revision. Import validates the entire strict container before mutation; account quotas and fresh project/actor/asset UUID allocation happen within a single SQLite transaction. References are remapped consistently; no source project/account/chat authority is adopted. Duplicate display names are allowed and dropdown labels include short project IDs to distinguish them.

Import preserves active visuals and dirty edits, refreshes the saved list without changing selection, displays the new name/UUID and requires **Open project and use with this chat**. Explicit open restores background, sprites, presence, positions and locks; native switch/reload detaches. Model identity and replacement/native epochs reject delayed receipts. Failed/oversized/corrupt operations leave the stage intact and do not create empty downloads. Unknown/disabled plugins leave native reader/composer and the session stage available.

The strict JSON/base64 container uses standard library parsing, with no new dependency or archive extraction code. PNG validation reuses pngjs 7.0.0. Compression and general ZIP interoperability are intentionally unsupported. Experimental limits: 8 MiB + 32 KiB body, 6 MiB encoded PNGs, 21 entries, 4,194,304 aggregate pixels, one admitted bundle request per process, 15-second worker timeout, 128 MiB worker V8 old-generation ceiling. This heap setting is not a process/external-buffer memory cap.

## Validation commands

Run from the implementation checkout; exact candidate IDs/results follow after freezing. No historical DYL-54 counts are counted as new evidence.

```sh
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
npm test --prefix plugins/sillynovel-storage
node --test --test-isolation=none plugins/sillynovel-storage/test/*.test.mjs
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test --test-isolation=none tests/m1-reader-browser.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/project-portability/host.mjs /tmp/SillyTavern-m12-review
node tests/probes/project-portability/resources.mjs
node --check tests/probes/project-portability/host.mjs
git diff --check
```

The host harness clones the pinned disposable source/dependencies, installs a fresh plugin with npm ci, starts only its own processes and creates synthetic accounts/cards/chats/images. It makes no host-core patch and never installs on the owner's live host. Tested target SillyTavern 1.19.0, `7e8663cd9c184a550b37238218bdd32c6efc68e9`; Node v26.8.1, Chromium 151.0.7922.34, Linux. The optional plugin floor >=22.13 is a declared requirement, not a test claim for that version. No real provider inference, physical device or other platform claim.

## Acceptance coverage

- Store roundtrip exports only referenced PNGs and preserves exact bytes/SHA-256, names, presence, layout/locks. All project/actor/asset IDs are fresh. Copies with duplicate display names are independently editable; restart persists committed copies.
- Every malformed-container subtest compares full committed project and asset inventory before/after: truncated/oversized input, excess/duplicate entries, compression, traversal/absolute identifiers, symlink/special fields, source ownership/project authority, unknown keys/version, missing/foreign references, corrupt PNG, hash/length mismatch, bad actor/scene schema, scripts, excessive dimensions, ZIP bytes, duplicate JSON keys. Export explicitly refuses total-byte/aggregate-pixel ceilings and corrupt saved assets.
- Fault injection at project insertion, second asset insertion (after a partial row set), final scene update, and deferred foreign-key COMMIT failure inspects committed tables and confirms zero orphan/partial imports. Existing rows remain identical. Separate project-count/account-byte quota failures refuse completely. Tests do not equate a failed response with rollback.
- Actual-entry browser checks include success/failure while active edits are dirty, delayed import after native switch and project replacement, disabled old-plugin support, explicit list selection, valid download versus refusal, local size refusal and native composer access.
- Real host checks use two authenticated sessions/accounts, CSRF refusal, body/compression limits, foreign export refusal and owner-scoped import. Concurrent imports either succeed separately or receive 429 then explicitly retry; two successes get distinct project IDs. A concurrent save/export returns a coherent snapshot. Lost/delayed import receipt across a native chat switch never attaches art.
- Real browser downloads a bundle, imports with unsaved edits present, explicitly reopens the copy, checks decoded background/two sprites and remapped identities/locks, then restarts and explicitly reopens again. The harness captures exact before/after SHA-256 inventories for 33 named synthetic/public native files under the disposable account's characters/chats/worlds scope. There is no global non-mutation claim.

## Security/resource review

Host login and CSRF middleware plus existing plugin checks remain intact; authenticated account incarnation is never selected by bundle data. Foreign/unknown IDs are 404; public errors expose codes only. Native text/cards/lore/personas/provider settings are not called by portability code. The new routes share private SQLite ownership and existing quota checks. Download is attachment/no-store/nosniff with sandbox CSP. No remote requests or temporary server files arise from bundle processing. Filesystem paths/executable entry types are absent from the format and refused as extra fields.

Streaming body caps apply before parsing, entry/metadata/decoded-byte and pixel limits precede insertion, PNG CPU work and canonical serialization execute in a worker. One global admission avoids concurrent large allocations; it can return a generic busy signal across accounts but discloses no project content. Snapshot/import transactions contain synchronous bounded SQL only; validation runs outside write locks. SQLite busy timeout remains 3 seconds, full synchronization and rollback journaling unchanged. Account quotas count all uploaded BLOBs, including unreferenced assets; imports never clean up to fit.

The resource probe uses synthetic exact-maximum-pixel and maximum-encoded-byte fixtures, records wall time/event-loop delay and RSS, and validates accepted near-ceiling bundles. Fixture-generation buffers are retained by that standalone test process, so total RSS includes those inputs and previous fixture allocations; measured RSS is evidence for these runs, not a universal upper bound. Worker V8 limits exclude native buffers/SQLite/process overhead. Reverse-proxy rate/slow-client limits, the host's preexisting global JSON parser, multi-process contention, adversarial throughput and power-loss recovery remain outside this bounded result. Before production or increasing limits, review memory budgets on the intended host.

## Development failures retained

The first host-harness syntax check caught a reused `original` variable in the added portable block; it was renamed before execution. New synthetic browser tests initially lacked the fixture's request-header capability, leaving project controls disabled, and then incorrectly assumed a file input had no button role. Those harness errors were fixed without weakening workflow assertions. The sandboxed browser run stalled and was interrupted; browser/host validation was rerun with local browser/server permissions. Node 26's default isolated runner reported module-level totals; explicit `--test-isolation=none` produced individual assertion totals. An early uncommitted host exploration passed 12 checkpoints but reported the base HEAD because runtime changes were uncommitted; only the separately frozen candidate evidence below is acceptance evidence.

## Frozen evidence and final handoff

Pending final exact-candidate campaign. Final pushed head and OPEN/UNMERGED PR will be recorded here and in Linear; no self-referential commit SHA is invented. Remaining work after review: DYL-58 consistent backup/journals/restore/migrations/account recovery; DYL-59 explicit reference-safe cleanup/concurrency/quota recovery. Portable import alone does not accept DYL-55 or production disaster recovery.
