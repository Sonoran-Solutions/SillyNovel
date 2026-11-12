# Optional SillyNovel project storage — experimental

**PR #29 review correction:** startup refuses existing v1 storage with `MIGRATION_REQUIRED` and leaves it unchanged. Use the [documented operator backup/inspect/migrate workflow](../../docs/M1_PNG_ASSET_LIBRARY.md#explicit-v1--v2-transition) to transform a verified preserved v1 backup into a new, absent stopped-host database slot. Both the original store and backup remain available after success; no automatic in-place migration or overwrite.

**DYL-22 review candidate:** [Reusable PNG library and v1→v2 upgrade](../../docs/M1_PNG_ASSET_LIBRARY.md). Update plugin, extension and recovery tools together; create and inspect a full backup before upgrading. Project/database schema v2 adds labels/categories/actor registrations, protects saved alternatives from cleanup and reuses identical project-local bytes. Scene and portable bundle v1 stay unchanged; portable copies omit library labels and unselected alternatives. Earlier schema-v1-only/no-migration statements below are historical. No live installation/release is approved.

This package is separate from the UI extension. It stores only SillyNovel global visual projects and immutable static PNG bytes. It does not hook native chat writers. Production distribution and live installation are not approved by this prototype.

## Disposable installation

Use a disposable SillyTavern 1.19.0 checkout at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, with its dependencies installed. Copy this directory to `<disposable-host>/plugins/sillynovel-storage` and run `npm ci --ignore-scripts` there. Install the UI extension from the same candidate under `public/scripts/extensions/third-party/SillyNovel`. Do not copy `node_modules` from a different machine.

Set `enableServerPlugins: true`, `enableServerPluginsAutoUpdate: false`, and `enableUserAccounts: true` in that disposable host's config, retain CSRF protection, restart, and explicitly sign into a test account. The plugin never changes those settings itself. Disable the plugin by setting `enableServerPlugins: false` and restarting; project data is retained. Never install into the owner's real host without separate permission.

Set an absolute `dataRoot` in SillyTavern's `config.yaml` (for example, `dataRoot: /full/path/to/SillyTavern/data`). The default relative `./data` reports `STORAGE_UNAVAILABLE`: on SillyTavern 1.18.0 `server.js` sets `globalThis.DATA_ROOT` before `chdir`, so plugins receive the configured value unresolved (not re-checked on 1.19.0). Write the full path.

The optional plugin requires Node >=22.13; only Node 26.8.1 was exercised here. SillyTavern's broader Node >=20 floor does not imply built-in SQLite support. `node:sqlite` is built into Node (no separately compiled native npm dependency); its API is still release-candidate status on tested Node 26.8.1. The pinned decoder dependency is pure-JavaScript `pngjs` 7.0.0. Lockfile integrity pins its package. Other Node/platform combinations need tests. Missing SQLite/dependencies or a disabled plugin leave the UI session-only.

Accounts-disabled mode is intentionally refused: the pinned host supplies a default profile with a process-time creation timestamp, unsuitable for restart-stable incarnation scoping. Requests require a signed-in host account and its authenticated `(handle, created)` pair. The plugin does not accept client account names, root paths or ownership fields. Account deletion/recreation and administrative recovery remain unsupported; ordinary recreation changes that timestamp, but malicious timestamp restoration is not defended. Privileged host administrators/process code are not isolated by this plugin.

## Data and API

Database: `<host dataRoot>/.sillynovel-projects.sqlite`, mode 0600, outside all account directories. SQLite owns its adjacent transaction journal. The data root comes from host startup, never HTTP. No database files live in the publicly served UI extension or plugin package. No automatic destructive migrations, asset deletion, project deletion or cleanup endpoint exists. Unknown schemas/corruption disable persistence; previous bytes are retained.

`info`, `init(router)` and `exit()` use the pinned host loader. Base route is `/api/plugins/sillynovel-storage`. Host login middleware precedes the router; host CSRF protects mutations. The plugin additionally requires a valid session CSRF token and compares it on mutations; CSRF-disabled configuration refuses persistence.

| Method | Path | Contract |
|---|---|---|
| GET | `/capabilities` | API/schema v1, PNG and byte limit |
| GET | `/projects` | Current authenticated owner's list |
| POST | `/projects` | `{name}`; random server project ID, revision 0 |
| GET | `/projects/:id` | Owned versioned project |
| PUT | `/projects/:id` | `{schemaVersion:1,expectedRevision,name,scene}`; atomic CAS |
| POST | `/projects/:id/assets` | Static PNG bytes; immutable random ID, SHA-256/dimensions |
| GET | `/projects/:id/assets/:asset` | Owned PNG bytes, verified hash header, no-store/nosniff |

Mutation JSON uses `application/vnd.sillynovel+json` with a 32 KiB streaming cap; PNG uses `image/png`, capped at 5 MiB. Compressed request bodies are refused. This avoids relying on the host's much larger JSON parser ceiling; requests deliberately sent to the host's global JSON parser still inherit that host limit before plugin rejection. Reverse-proxy/global resource limits remain operator concerns.

Schema v1 holds name, project ID/revision and global scene: nullable background asset ID/lock, up to 20 project actors with UUID/name, nullable sprite/slot, presence and presence/slot/outfit locks. IDs for projects/assets are server generated; actor UUIDs are explicitly created by the UI and scoped by their project. No native chat IDs, source hashes, message expressions or command journal are persisted. Every reference is verified against the owned project's immutable assets inside the save transaction.

`REVISION_CONFLICT` (409) refuses stale saves; `NOT_FOUND` (404) conceals foreign/unknown records. Invalid schema/extra fields refuse (400); quota failures (413), format failures (415), and unavailable storage (503) are explicit. Failure never silently falls back to settings, chat metadata or browser databases.

Initial engineering limits: 100 projects/account, 100 assets/project, 100 MiB encoded assets/account, 4096px edge, 16 million pixels, 5 MiB/file; these are test ceilings, not approved production quotas. PNG signature/chunks, animation rejection, bounded inflate, CRC and full decoding precede insertion. Immutable BLOBs remain when scene saves fail; there is no garbage collector. Corrupt/missing assets produce neutral UI art.

The existing reducer processes a distinct in-memory project-global anchor. This is explicitly a project projection, never a fabricated native message identity. Its command journal and anchor are not saved. Global background/presence/outfit/slots/locks survive reopening; message expressions remain available only in the transient stage. Native chat switch or disable invalidates attachment authority. Explicit reopen is always required after reload.

## Verification and recovery limits

Run `npm test` here and the repository's project/reader checks. The disposable harness is `tests/probes/project-storage/host.mjs`; see the implementation evidence document for exact commands/results. It creates only synthetic accounts/data in a fresh temporary checkout, never changes the source checkout and stops only child processes it starts.

The operator owns backups. Portable export/import, validated administrative backup/restore, migration and account lifecycle recovery are release blockers (DYL-55); no supported recovery command is advertised. Retain the database and journal on failure and stop the host before forensic copying. Do not overwrite a live database to resolve a conflict. No cross-host sync, groups, JPEG/WebP, message history, duplication, automatic association, generation or director support. Server plugins are unsandboxed; trust and update management remain operator responsibilities.

Primary references: [official plugin guide](https://docs.sillytavern.app/for-contributors/server-plugins/), [Node 22.13 SQLite](https://nodejs.org/download/release/v22.13.0/docs/api/sqlite.html), [tested Node 26.8.1 SQLite](https://nodejs.org/download/release/v26.8.1/docs/api/sqlite.html), [pngjs](https://github.com/pngjs/pngjs).

## Portable bundles (DYL-57 review candidate)

The same optional installation now exposes explicit **Export project** and **Import project bundle** controls. Export the selected saved project; unsaved edits are excluded. Import creates a new independent project and fresh project/actor/asset UUIDs, preserves the current scene/dirty state, and requires selecting the new saved entry and clicking **Open project and use with this chat**. No automatic native chat attachment occurs. A lost response may leave a successfully committed copy; list/reopen before deliberately retrying.

`GET /projects/:id/export` returns an authenticated no-store/nosniff attachment (`project.sillynovel`, `application/vnd.sillynovel.bundle`). `POST /projects/import` accepts that media type and the host CSRF token, validates all content before a single atomic SQLite transaction, checks account quotas, and returns the newly created record (201). Capabilities add `bundleVersion:1` and `bundleMaxBytes`. Existing clients remain compatible; older/disabled plugins leave bundle controls disabled and session visuals usable. Concurrent bundle requests receive `BUNDLE_BUSY` (429), with no automatic retry.

[Complete format, validation, API, limits and recovery distinction](../../docs/M1_PROJECT_PORTABILITY.md). Version 1 uses canonical UTF-8 JSON and base64 PNGs, **not ZIP**. Only exact known fields and versions are accepted; no compression, paths, symlinks, scripts, URLs, auth/native identities or unreferenced assets. The parser is the JavaScript standard library; no new dependency beyond existing pure-JS pngjs 7.0.0. Maximum body 8 MiB + 32 KiB, total encoded PNGs 6 MiB, 21 assets, 4,194,304 aggregate pixels. Oversized/corrupt exports fail entirely. Worker validation has a 15-second timeout and 128 MiB V8 old-generation limit; external Buffers/RSS add memory. These are smaller experimental test ceilings, not final production quotas. Use the same Node >=22.13 runtime floor; other versions/platforms remain unverified.

Portable copies are now implemented for review; the earlier export/import limitation above is historical. Database backup/restore/migrations and account recreation/reassignment remain **unsupported**, tracked separately by DYL-58 under DYL-55. DYL-59 owns explicit unused-asset cleanup; no cleanup or database upload endpoint is implemented. No live installation or production release is approved.

## Operator database recovery (DYL-58)

A separate experimental local CLI now supports official SQLite online backup, strict offline inspection and restore to an absent database slot in a stopped disposable host with verified same-account incarnations. [Commands, filesystem/account requirements, refusal and migration policy](../../docs/M1_PROJECT_DATABASE_RECOVERY.md); [exact-candidate evidence](../../docs/M1_PROJECT_DATABASE_RECOVERY_IMPLEMENTATION.md). Backup needs node:sqlite.backup (Node >=22.16; tested 26.8.1/Linux); no raw-copy fallback or HTTP endpoint. Startup now refuses incomplete/altered v1 schemas as well as unknown versions. No schema-v2 migration, existing-store overwrite, account rewriting or cleanup. Historical recovery-limit statements above describe the preceding slice; this bounded operator workflow supersedes them only for its tested scope. Production/live use remains unapproved.

## Explicit unused artwork cleanup (DYL-59)

`cleanupVersion:1` adds authenticated `GET /projects/:id/unused-assets` and CSRF-protected `POST /projects/:id/unused-assets/remove` with exact `{expectedRevision,inventoryRevision,assetIds}`. Preview validates the committed scene and full bounded project inventory; selected deletion recomputes ownership/references/inventory in the existing atomic SQLite transaction. Stale previews refuse; saved referenced rows cannot be selected. Saves referencing removed assets receive 409 `ASSET_MISSING` without changing saved state. Schema v1 remains unchanged.

The attached project's **Unused Project Assets** controls require explicit review, selection and confirmation. Save/discard dirty edits and finish imports/saves first. Other tabs' unsaved drafts cannot be discovered and can lose artwork; already-cached Blob images elsewhere can remain visible until a missing-reference save refusal. Confirmed/uncertain removal evicts submitted alternatives from this editor's catalog. Lost responses are uncertain, never an automatic retry. No automatic garbage collection, project deletion or native-host writes. Missing/older plugins disable cleanup and preserve session-only visuals.

Removal recovers **logical account quota**, not necessarily filesystem bytes: SQLite freelist pages may be reused without reducing file length. No VACUUM/compaction. Keep verified private database backups; portable bundles omit unused art and cannot recover it. No in-app undo, live-database replacement or automatic restore. [Full cleanup contract](../../docs/M1_PROJECT_ASSET_CLEANUP.md) and [implementation evidence](../../docs/M1_PROJECT_ASSET_CLEANUP_IMPLEMENTATION.md). Earlier no-cleanup statements above describe predecessor slices and are superseded only by this explicit operation; production installation/release remains unapproved.

## Image ledger (M3.3 PR B, schema v3)

Database v3 adds `image_sessions` (lease, pinned workflow, allowance and count) and
`image_jobs` (review text, settings, hashes, outcome, times and host-path disclosures).
Startup adds these tables to a validated v2 database in one transaction; existing
project, catalog and PNG rows are untouched. Fresh databases use v3. Project API
schema v2 and portable bundle v1 are unchanged; capabilities add `imageLedgerVersion:1`.
The explicit v1 backup migration still produces v2, which startup then upgrades.
Keep a verified operator backup before upgrading. The operator owns backups;
the ledger and portable copies are not a backup.

All paths below are under `/projects/:id/image/`, authenticated and owner/project
scoped. Foreign or unknown projects, sessions and jobs return `404 NOT_FOUND`.
Mutations use the existing CSRF protection, JSON media type and 32 KiB cap, with
exact known keys. JSON rows use camelCase (`asset` is exposed as `assetId`,
`settings` as a parsed object, with `owner` omitted); times are server Unix milliseconds.

| Method | Path | Body / result and refusals |
| --- | --- | --- |
| GET | `session` | `{session,jobs}`; open session or null, plus all unresolved project jobs, including ended sessions' jobs |
| POST | `session/begin` | `{tab,workflowSha256,takeover?}`; session (`status: mine` for the same tab); `409 LEDGER_FULL` at 500 retained sessions; `409 LEASE_HELD` includes `status` held/stale, `heartbeatAt`, `tab` |
| POST | `session/heartbeat` | `{sessionId,tab}`; session; `409 LEASE_LOST` |
| POST | `session/end` | `{sessionId,tab}`; session; holder-idempotent; `409 LEASE_LOST` |
| POST | `jobs` | `{sessionId,tab,payloadSha256,workflowSha256,review,settings,seedPolicy,deadlineMs}`; reserved job (201); `409 LEASE_LOST`, `IN_FLIGHT`, `ALLOWANCE_EXHAUSTED`, `WORKFLOW_CHANGED`, `LEDGER_FULL` |
| POST | `jobs/:jobId` | `{tab,state,hostPath?,resultSha256?,assetId?}`; job; `409 INVALID_TRANSITION`, `LEASE_LOST`; `400 INVALID_PATH` |
| POST | `jobs/:jobId/host-deleted` | `{}`; job with `hostDeletedAt`; `409 INVALID_TRANSITION` unless imported/discarded/abandoned with a host path |
| GET | `jobs?limit=` | Job fields without owner, newest submission first; positive integer limit, capped/default 500 |
| GET | `cache?payload=` | Imported jobs with that 64 lowercase hex hash and non-null asset ID, newest first; the client must check the catalog and fixed seed policy |
| POST | `jobs/cleanup` | `{jobIds}` (0–500 unique IDs); `{deletedIds,deletedCount}`; atomic refusal `409 UNRESOLVED_JOB` for any nonterminal row |

One open session per owner/project is enforced by a unique index. Heartbeat every
30 s; older than 90 s is reported stale. Explicit takeover of either held or stale
leases changes only the same row's tab and heartbeat: its identity, workflow,
five-unit allowance, count and jobs survive. Same-tab begin, with or without
takeover, returns the existing session unchanged with `status: mine`. Only a new
explicit session after ending starts at zero. Reserve atomically inserts pending before host dispatch
and increments used; failure, cancel, timeout, abandonment and cleanup never refund.
Any unresolved job in the project blocks reserve, including jobs of ended sessions.
Deadline duration is an integer 1,000–600,000 ms; settings is a JSON object and
seedPolicy is fixed/random. There are at most 500 retained jobs and 500 retained
sessions per project.

| From | Allowed next states |
| --- | --- |
| pending | candidate, failed, stale, cancelled, timeout-unknown |
| cancelled | stale, abandoned |
| timeout-unknown | candidate, failed, stale, abandoned, unknown |
| unknown | reconciled, abandoned |
| candidate / reconciled | imported (owned project assetId required), discarded |

Pending, cancelled, timeout-unknown and unknown are unresolved; leaving these for
a resolved state stamps `settledAt` once. Time passing alone does not transition
rows: the client explicitly records timeout-unknown then unknown. Pending,
cancelled and timeout-unknown transitions require the job session's recorded tab
while that session is open; once it has ended, only the current open session's
holder may (ending a session withdraws its tab's permission). The current
holder resolves jobs left by an ended session; unknown resolution requires that
current holder. Candidate/reconciled `discarded` remains owner-scoped (any of the
owner's tabs). Candidate/reconciled `imported` requires the current open session's
holder, else `409 LEASE_LOST`: the client applies an import only once the ledger
acknowledges it, so a page whose lease was taken over between heartbeats cannot
apply. This narrows the PR B contract (which let any of the owner's tabs record
`imported`); it is an implementation choice from the M3.3 PR C terra review,
proposed for owner review, not an owner ruling.
Ending does not remove or resolve jobs. Candidate/reconciled rows need explicit
import/discard before cleanup; failed/stale/abandoned/imported/discarded are terminal.

Host paths must be literal PNG paths under `/user/images/`, with no encoding,
backslash, traversal segment, doubled slash, query or fragment. `hostPath` and
`resultSha256` may be supplied only for a candidate/reconciled target or when the
respective stored value is null. The plugin never reads or deletes a host file. The host-deleted route only records the client's
explicit deletion; it is idempotent. Asset IDs are soft references: unused-art
cleanup can remove their bytes, leaving a cache miss after catalog filtering.
Ledger cleanup removes selected terminal jobs and ended sessions with no remaining
jobs, never assets or projects. An empty job list permits session-only cleanup.
Project/session foreign keys cascade rather than imposing new deletion blockers.

Portable export never includes ledger rows; import creates none and rejects extra
ledger fields. Full operator backup/restore includes v3 rows; v2 still inspects and
restores unchanged. Strict offline inspection reports counts and job rows per
project, with `review: "[masked]"` and `reviewLength` (JavaScript string length).
Only `node tools/recovery.mjs inspect BACKUP_DIR [--data-root TARGET_DATA_ROOT]
--show-review` explicitly reveals review text. Backup/restore reports also mask it.
This storage-only slice makes no live-host, provider, UI or Gate C claim.
