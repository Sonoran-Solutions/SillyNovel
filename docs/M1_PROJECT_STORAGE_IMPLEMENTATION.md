# Independent project implementation plan

Starting fetched main: `ca77bbf5e4ee5219e34e873b1680e8d644754149`. PR #22 verified merged at that commit; DYL-48 Done. Original checkout was clean at `4688646861274d9b5c993e9c478628d84c700144` and is preserved. Dedicated worktrees start from fetched main.

The owner-approved [architecture pivot](M1_INDEPENDENT_PROJECT_STORAGE.md) authorizes this first slice, not production release. Project-global persistence and native message correspondence are separate contracts. Explicit selection/use attaches only for this activation; chat switching/reload detaches. No native identities or source cues enter schema v1.

## Linear chain

| Issue | Scope | Depends on | Current status |
|---|---|---|---|
| [DYL-49](https://linear.app/devils17/issue/DYL-49) | Architecture/docs | — | Done; PR #23 merged |
| [DYL-50](https://linear.app/devils17/issue/DYL-50) | Optional authenticated plugin | DYL-49 | In Review |
| [DYL-51](https://linear.app/devils17/issue/DYL-51) | Versioned project store/CAS | DYL-50 | In Review |
| [DYL-52](https://linear.app/devils17/issue/DYL-52) | Immutable PNG assets | DYL-50 | In Review |
| [DYL-53](https://linear.app/devils17/issue/DYL-53) | Explicit project stage | DYL-51, DYL-52 | In Review |
| [DYL-54](https://linear.app/devils17/issue/DYL-54) | Safety/host acceptance | DYL-53 | In Review |
| [DYL-55](https://linear.app/devils17/issue/DYL-55) | Export/import/backup | DYL-54 | Backlog; separate authorization |
| [DYL-56](https://linear.app/devils17/issue/DYL-56) | Remembered association hints | DYL-54 | Backlog; separate authorization |

Project-wide issue search found no equivalent independent-project/plugin work. DYL-22/23 remain Backlog with their existing blocking relations, with explanatory comments only. DYL-24 Done/accepted session-only; Gates A/B/C NOT_RUN, M1.3/M2 unauthorized.

## Packaging and storage decision

Implement a separate `plugins/sillynovel-storage` package installed explicitly into a disposable host's `plugins` directory. Verify `info`, `init(router)`, `exit()` and `/api/plugins/<id>` against pinned host source. The UI adapter exposes capability/list/create/load/save/import/read operations independent of SQL. No core patches or writer hooks.

SQLite BLOB storage is the proposed choice: project transactions/CAS and immutable uploaded bytes in one store. Investigate the runtime before locking a driver: host supports Node >=20, while built-in SQLite starts at 22.5 and was unflagged at 22.13. A separately documented higher optional-plugin runtime floor may be used after verification; the UI continues session-only on unsupported hosts. Do not substitute JSON files or claim Node 20 support. No destructive automatic migrations. Verify SQLite API stability for the actual tested Node version, separately from host compatibility.

## Schema and API

Proposed v1 project: server `projectId`, `revision`, `schemaVersion: 1`, bounded `name`, global `scene` with nullable background asset, actor IDs/labels, presence, outfit asset, slot and locks. Exclude message expressions/history/source tokens and native locators. Server generates IDs and enforces ownership and referenced assets. Unknown keys, schemas and client owner/path overrides refuse.

Authenticated routes provide capabilities; project list/create/load; expected-revision update; bounded PNG upload; authorized immutable asset bytes. Use typed conflict/validation/not-found/unavailable outcomes without filesystem details. Every read/write uses authenticated request ownership, never body usernames or roots. Verify route mounting behind login and CSRF on the pinned host and fail closed when required protection is disabled. Test two real accounts, not only a mocked user field.

Initial engineering ceilings: PNG only, 5 MiB encoded bytes, 4096px maximum edge, 16 million decoded pixels; no APNG. These are conservative test ceilings, not owner-approved production quotas. Decode content server-side; SHA-256 on accepted bytes and readback. Keep missing/corrupt art nonblocking. Bounded database growth and upload handling need explicit tests and release review.

## Implementation sequence and evidence

1. Open documentation PR; do not merge. Begin separate implementation worktree immediately.
2. Verify plugin/runtime/auth and implement minimal transactional store plus strict schema; prove conflicts/failures/restart.
3. Add immutable PNG import/read with bounds and decoding; prove cross-user/project refusal.
4. Integrate existing reducer/stage via explicit project controls and page-local attachment tokens. Capture save snapshot before I/O; stale responses cannot redirect current UI. Restore global configuration without pretending to restore message history.
5. Run focused Node tests, existing `node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/probes/dyl19/*.test.mjs`, and actual-entry Chromium tests (`SN_PLAYWRIGHT_MODULE=... SILLYTAVERN_ROOT=... node --test tests/m1-reader-browser.test.mjs`). Record exact real paths/versions at execution.
6. Disposable pinned host/browser: create, import background/two sprites, arrange, save, reload, explicitly reopen; A→B→A, delayed responses, missing art, unavailable plugin, two accounts, two-client CAS, restart, failed writes and clean shutdown. Hash named synthetic canonical files before/after project operations. Preserve exact source/fixture/candidate hashes and failure logs.
7. Open implementation PR when reviewable, never merge. Incomplete issues remain In Progress; In Review requires tested exit criteria. Senior review precedes further scope.

No actual first-slice runtime pass is claimed by this plan. Host/provider/device paths not exercised remain NOT_TESTED. Do not rerun obsolete DYL-26–46 overlays unless a specific regression justifies them.

## Maintenance and release blockers

Unsandboxed plugin privileges, host/runtime drift, account recreation, migrations, administrative recovery and backup ownership need documented policies and evidence. Export/import, verified backup/restore and migrations belong to DYL-55; explicit new IDs and no autoattachment are mandatory. Duplication, JPEG/WebP, groups, historical expressions, automated associations, cross-host sync, director/generation and production distribution are excluded. Never install on the owner's live host. Smallest authorized next work is DYL-50 foundation followed by only the APIs/UI/tests needed for the first slice.

## First-slice handoff — 2026-10-15

Documentation [PR #23](https://github.com/Sonoran-Solutions/SillyNovel/pull/23) and implementation [PR #24](https://github.com/Sonoran-Solutions/SillyNovel/pull/24) are OPEN/UNMERGED. DYL-49–54 are In Review; DYL-55/56 remain Backlog and separately authorized future work. Dependencies in the table above are installed in Linear. DYL-22/23 remain Backlog with the original blockers and explanatory comments only; DYL-24 remains Done.

Implementation pushed head `fd6cab6289779225d03ba0001cae5fff14b4e8b4`; actual clean-install host candidate `fa3ee1a452e6a2aa4eeac66c80508465820299f7`; Node/browser candidate `96b5144582fbf7b58f301fa3f89ffd0e4f287d1e` has identical runtime. The final implementation commit adds evidence/docs only. See PR #24's `docs/M1_PROJECT_STORAGE_SLICE.md` and `docs/evidence/project-storage/host.json` for exact commands, source/fixture hashes, limitations and failed-harness history.

Demonstrated create → background/two PNG sprites → arrange → save → reload → explicitly reopen with the same arrangement. 67/67 Node regressions, 3/3 storage checks, 24/24 actual-entry Chromium and eight disposable-host checkpoint groups PASS. Real authenticated two-user isolation, CSRF refusal, two-client CAS, rollback, missing/corrupt art, delayed receipt rejection, A→B→A detachment, native chatting, restart and disabled-plugin fallback were exercised. Exact hashes of 33 enumerated synthetic native files matched across project save/reload/reopen; no global non-mutation claim.

Selected package `plugins/sillynovel-storage`, built-in SQLite with immutable BLOBs and pure-JavaScript pngjs 7.0.0. Requires Node >=22.13 and a signed-in host account with CSRF; tested only Node 26.8.1, Linux, Chromium 151.0.7922.34 and SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Accounts-disabled persistence is refused because that host's implicit default creation timestamp changes across process restarts. These runtime/account choices need senior review and are not new owner-approved release defaults.

Recommendation: **GO for bounded senior review**, not production release. Smallest next step is reviewing the two PRs and runtime/account prerequisites. Export/import/backup, migration/account recovery, broader platforms, groups and message history remain release blockers or separately authorized work. M1.3/M2 unauthorized, Gate A NOT_RUN. No upstream contact or live-host installation occurred. Measured work interval 19:29:52–19:51:12 UTC was 21m20s; initial inspection and later handoff were additional, not separately timed.
