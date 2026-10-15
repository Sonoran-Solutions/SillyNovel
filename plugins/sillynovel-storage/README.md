# Optional SillyNovel project storage — experimental

This package is separate from the UI extension. It stores only SillyNovel global visual projects and immutable static PNG bytes. It does not hook native chat writers. Production distribution and live installation are not approved by this prototype.

## Disposable installation

Use a disposable SillyTavern 1.19.0 checkout at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, with its dependencies installed. Copy this directory to `<disposable-host>/plugins/sillynovel-storage` and run `npm ci --ignore-scripts` there. Install the UI extension from the same candidate under `public/scripts/extensions/third-party/SillyNovel`. Do not copy `node_modules` from a different machine.

Set `enableServerPlugins: true`, `enableServerPluginsAutoUpdate: false`, and `enableUserAccounts: true` in that disposable host's config, retain CSRF protection, restart, and explicitly sign into a test account. The plugin never changes those settings itself. Disable the plugin by setting `enableServerPlugins: false` and restarting; project data is retained. Never install into the owner's real host without separate permission.

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
