# DYL-22 reusable PNG library — first vertical slice

Owner assignment, 2026-10-15 (America/Phoenix): explicitly authorizes this residual DYL-22 slice using the implemented independent-project architecture, PNG-first development, existing-stage catalog controls, persistence/cleanup integration, compatibility verification and one draft PR for senior review. This supersedes the historical implementation hold only for this slice. PR #28 is merged at starting main `262aad7b64624845e68f783bf779a6fd5e4689d4`. Historical DYL-21 blocker relations and original acceptance remain; no implication that blocked upstream storage proofs became supported host APIs.

Live-state discrepancy: Linear currently reports DYL-55 **Done**, while this assignment explicitly keeps its owner acceptance pending. This task leaves that external status unchanged and does not infer acceptance or reopen it. DYL-55 remains pending owner acceptance within this assignment; DYL-23 is separately gated, DYL-56/60 unchanged, Decision F (persistence/writer expectations) undecided, Gate A NOT_RUN. No M1.3/M2, persistent message scenes, groups/source-overlay completion, production installation/release or upstream engagement is authorized. JPEG/static WebP, expression compatibility, attribution and logical revision-replacement completeness remain unmet original DYL-22 requirements; PNG-first authorization is limited to this assignment.

## User workflow

1. Open an individual conversation, enable the reader and expand **Manual scene controls**. Create or explicitly open a saved project.
2. Register a **Project actor** manually for sprites. Its UUID belongs to the project; names do not associate native cards.
3. Choose **Project image use** (background or selected actor outfit), optionally enter **PNG display label**, then select **Project PNG file**. An empty label defaults to the filename without `.png` (bounded to 80 characters), or “Imported PNG”. Import registers and selects the artwork. Only static decoded PNG, up to the existing 5 MiB / 4096 edge / 16M pixel ceilings, is supported here.
4. Import more alternatives. **Background** lists backgrounds; **Outfit** lists compatible alternatives for the selected actor. Options show labels and full immutable UUIDs, so duplicate labels are distinguishable. Apply a selection explicitly. The **Selected background / Selected actor sprite** line identifies what is on stage, independently of the choice being browsed.
5. **Library artwork → Artwork label → Save artwork label** edits presentation metadata. **Save project** commits the complete library and global arrangement together. Upload success alone does not save the catalog; failed saves retain local dirty edits and the previous committed project.
6. Reload or detach, then explicitly select the saved project and **Open project and use with this chat**. All saved alternatives return. Chat switching detaches; nothing attaches automatically. Source expressions remain transient, outside attached projects. Three visible slots, the larger logical cast, presence, explicit swaps and manual locks retain their existing behavior.
7. To remove an alternative, first select different artwork or clear its scene choice. Choose it in **Library artwork**, then **Remove artwork from library** and confirm. Save this change. **Review unused artwork** now permits a separate explicit selection/confirmation to delete bytes if no saved scene or library registration still uses them. Unregistering alone never deletes bytes. There is no automatic garbage collector or in-app undo.

Native chat, cards, lorebooks, personas, connection settings and composer remain outside the write boundary. Labels render as text. Missing/corrupt artwork remains a known selectable reference with neutral art; the text reader remains usable. Saving references with missing/corrupt server bytes refuses without stripping or replacing saved data.

## Stored contract and concurrency

Reuse the existing SQLite projects/assets store and transaction helper. No parallel registry database, browser persistence, native metadata or new dependency. Database `user_version=2` adds exactly `projects.catalog TEXT NOT NULL DEFAULT '[]'`; all other tables, indexes and constraints stay unchanged. Project envelope `schemaVersion:2` adds `catalog`; the global **scene shape remains v1**.

The inherited 32 KiB HTTP save envelope also bounds combined scene/catalog metadata; large Unicode libraries can reach it before 100 registrations. Each of at most 100 registrations has exactly:

```json
{"assetId":"11111111-1111-4111-8111-111111111111","label":"Forest","kind":"background","actorId":null}
```

For `kind:"sprite"`, `actorId` must identify a manual actor in that same saved scene. Identity is the tuple `(kind, actorId, assetId)`; labels are inert, nonunique presentation metadata. An immutable PNG UUID may serve several explicit actor/category contexts without another BLOB. Duplicate tuples, unknown fields/categories, nonexistent actors, invalid UUIDs/labels and incompatible registered selected artwork refuse. Backgrounds and sprites are never inferred from names. Scene-only references from pre-library clients/portable copies remain valid; the editor seeds them with generic labels for its next save.

`PUT /projects/:id` accepts exact `{schemaVersion:2, expectedRevision, name, scene, catalog}`. Scene and catalog share one project revision/CAS transaction; every reference must resolve in the authenticated owner's project and pass the existing digest readback. Schema-v1 writes remain accepted **only for projects whose committed catalog is empty**; otherwise `409 CATALOG_CLIENT_REQUIRED` prevents old clients from erasing metadata. Unknown versions/keys refuse. Updated UI requires capabilities `apiVersion:1, schemaVersion:2, catalogVersion:1`; older plugins leave project controls unavailable and preserve transient visuals/native reading.

PNG upload still validates actual decoded bytes before insertion. Inside the existing transaction, an identical project-local SHA-256 **and exact byte equality** reuses its existing asset UUID before testing new-byte quotas. Labels/categories are saved separately. No cross-project/account data sharing or old-row rewrite occurs; older duplicate rows are retained. Reuse adds no logical BLOB quota. New distinct PNGs retain existing limits (100 rows/project, 100 MiB/account). Quota tests use genuinely distinct PNGs rather than manufacturing quota with repeated copies.

Imports pause same-model edits; saves capture immutable scene/catalog snapshots and retain edits made while the request is pending. Cleanup refuses dirty/importing/saving work and pauses edits while pending. Explicit replacement/chat switching still invalidates authority. Every delayed image/save/cleanup receipt checks the captured model/project/session epoch; cancellation alone grants no authority. A server commit can survive an abandoned or lost receipt; reopen/review to discover it. Cross-client CAS refuses stale catalog/scene saves. There is no single-writer lease or claim of discovering other clients' memory.

## Cleanup, backup and portability

Saved library registrations now count as protected references alongside saved scene references. Cleanup inventory digest includes the catalog and full inventory. Deletion recomputes both sets transactionally; a forged registered-asset deletion receives `ASSET_REFERENCED`. Uploads, relevant saves or other deletions invalidate stale previews; duplicate-byte reuse without a mutation leaves the inventory unchanged. Scene references remain protected even when absent from the catalog. Other clients' **unsaved** registrations remain discoverable only after save; the existing explicit warning and stale/missing-reference refusal still apply. Logical quota and filesystem size remain separate; no compaction.

Full database backup preserves all catalog metadata, alternative BLOBs and disposable uploads. Manifest container version stays 1, with its existing explicit `schemaVersion` now supporting **1 or 2**. Inspector validates the exact SQL schema for that version, bounded catalog shape, actor compatibility, project-local references and all PNGs; manifest and actual schema versions must agree. Restore retains the existing verified-account/absent-slot/stopped-host rules. Older recovery tools intentionally refuse schema 2; update tools with the plugin.

Portable `.sillynovel` **v1 is unchanged**: only the saved scene and its referenced PNGs travel, within the existing smaller limits. **Library labels and unselected alternatives do not travel.** Export never claims full-library backup; controls/help/download status say selected artwork only. Import allocates new project/actor/asset IDs, leaves the current editor untouched and requires explicit reopen. The imported project's selected artwork receives generic library labels in the editor; its saved catalog starts empty until Save project. No dangling references or silently expanded bundle ceilings. Use verified database backup when retaining the whole library matters.

## Explicit v1 → v2 transition

Plugin startup **never migrates an existing v1 database**. It validates the known SQL shape and returns `503 MIGRATION_REQUIRED`, leaving the file unchanged. Native reading, replying and session-only visuals remain available; persistence controls explain the operator action. New empty stores initialize v2; existing v2 stores validate normally. Unknown/incomplete SQL schemas still refuse.

Follow the existing DYL-58 preservation policy. Create and inspect a consistent private **v1 backup first**, then explicitly migrate that frozen backup to an **absent database slot in a separately provisioned, stopped compatible host/data root**, retaining the same authenticated account incarnations. The migration command reuses the strict backup inspection, private staging, account checks, exclusive hardlink publication, fsync and empty-slot guards from restore. It accepts only a verified schema-v1 backup; there is no raw/live database migration input, HTTP migration endpoint, overwrite flag or inferred destination.

```sh
node /absolute/plugin/tools/recovery.mjs backup /absolute/original-data/.sillynovel-projects.sqlite /absolute/private-backups/before-v2
node /absolute/plugin/tools/recovery.mjs inspect /absolute/private-backups/before-v2 --data-root /absolute/new-stopped-data
node /absolute/plugin/tools/recovery.mjs migrate /absolute/private-backups/before-v2 /absolute/new-stopped-data/.sillynovel-projects.sqlite
```

The new data root must already have independently retained compatible host accounts/native files; this utility does not provision them or select a new live data root automatically. Inspect the successful output and deliberately start only the compatible candidate host on that new root. Do not delete or replace the original database or backup. Source host, account and stopped-target constraints match [database recovery](M1_PROJECT_DATABASE_RECOVERY.md).

Only a private staged **copy** of the verified backup receives `BEGIN IMMEDIATE`, the catalog column and `user_version=2`. It seeds selected background/sprite registrations with generic labels, preserving every original owner, UUID, revision, scene and PNG BLOB. Existing unselected v1 uploads remain stored without invented classifications; explicitly reimport their original bytes to classify/reuse their UUID. The migration validates the entire output (schema, integrity, catalog/scene references and every PNG), rechecks the preserved backup/account evidence, and publishes only to the absent destination. Success returns `MIGRATED` with schema 2; a lost/failed receipt after publication requires offline inspection, never overwrite/retry blindly.

The original store and preserved v1 snapshot remain usable **after successful migration**, not merely after transaction failure. To revert the application, stop the candidate and deliberately return the previous compatible application to the untouched original data root, or use existing empty-slot restore of the verified v1 backup in a separately provisioned stopped compatible target. Do not overwrite a v2 store; preserve any newer v2 edits/backups separately. A v1 snapshot cannot contain edits made later on the v2 copy. There is no v2→v1 conversion or automatic reconciliation.

Senior review rejected the earlier in-place startup proposal because transaction rollback did not preserve a post-success downgrade path. This correction implements the established copy-on-new-output policy rather than treating that proposal as owner-approved. Fault tests cover stage/transform/marker/output-validation/publication failures and existing-target races while checking original/backup bytes; real-host evidence includes v1 startup refusal and explicit CLI migration/reopen. Power-loss behavior and other platforms remain NOT_TESTED.

## Verification and remaining scope

[Implementation handoff and exact-candidate evidence](M1_PNG_ASSET_LIBRARY_IMPLEMENTATION.md) records commands, counts, pinned host/browser, named native-file hashes, screenshots, failures and limits. Physical devices/touch remain NOT_TESTED; narrow Chromium viewports are not physical evidence. This is a technical slice for senior review, not an owner experience verdict, full DYL-22 completion or DYL-23 authorization.
