# Explicit unused project artwork cleanup (DYL-59)

Owner assignment: implement and validate explicit project-scoped cleanup after DYL-57 portability and DYL-58 recovery. This is an experimental extension-owned storage operation for senior review. Schema v1, authentication and native host boundaries remain unchanged. [Implementation evidence](M1_PROJECT_ASSET_CLEANUP_IMPLEMENTATION.md).

## Ownership and candidate definition

The host-authenticated `(handle, created)` pair supplies the owner. A validated project UUID grants no authority without that owner. Unknown and foreign projects both return `NOT_FOUND` without inventory disclosure. Client owner fields, paths, SQL fragments and unexpected fields refuse. Only the plugin's `assets` table is deleted from; native chats, cards, metadata, accounts and filesystem paths are outside this API.

A referenced asset is any ID in `backgroundAssetId` or any actor's `spriteAssetId` in the latest committed, validated project scene, including absent/offstage actors and locked artwork. Shared background/sprite or multi-actor references count once. Names, age, current chat attachment and byte equality never decide eligibility. Distinct IDs with equal contents remain distinct assets.

Unreferenced means absent from those saved references. A cleanup candidate additionally passes ownership and inventory integrity checks: bounded UUID/row/byte inventory, actual PNG decoding/CRC, digest/dimensions, and complete resolution of every saved reference. Missing referenced rows or any corrupt candidate refuse the entire operation. Failed saves and abandoned uploads leave assets stored; cleanup never runs automatically.

## HTTP contract

Base: `/api/plugins/sillynovel-storage`. Existing host authentication/CSRF middleware is unchanged; the plugin independently requires signed-in accounts, session CSRF protection and matching mutation token. CSRF-disabled installations refuse persistence, including inspection. Capabilities add `cleanupVersion: 1`; no API/schema version bump or persistent columns/tables.

`GET /projects/:id/unused-assets` returns:

```js
{
  projectId, revision, inventoryRevision,
  candidates: [{assetId, sha256, width, height, byteCount}],
  reclaimableBytes, warning
}
```

Candidates are sorted by asset UUID. Counts/bytes describe encoded PNG BLOB lengths, not decoded image memory. `warning` explicitly explains other tabs' unsaved drafts and recommends verified backups. Preview reads committed SQLite state in the existing `BEGIN IMMEDIATE` transaction and deletes nothing.

`POST /projects/:id/unused-assets/remove` uses existing `application/vnd.sillynovel+json`, a 32 KiB streaming body cap and no content encoding. Exact body:

```js
{expectedRevision, inventoryRevision, assetIds: [/* explicitly selected UUIDs */]}
```

Revision must be a nonnegative safe integer; inventory revision is lowercase SHA-256. Select 1–100 distinct UUIDs. Foreign/unknown/reference IDs, duplicates, oversized selections and extra fields refuse atomically. The route never accepts identity, filesystem destinations or SQL.

After COMMIT the response contains exactly `{projectId, revision, deletedIds, deletedCount, reclaimedBytes}`. Cleanup does not increment the scene revision. Only explicitly selected candidates are removed. The client validates project/revision, exact unique ID set/count and the selected byte total before reporting success. Unreadable/invalid receipts, network loss and untyped proxy failures are uncertain outcomes; no automatic retry occurs.

## Inventory binding and transaction

The deterministic server SHA-256 covers canonical JSON of authenticated owner, project UUID, committed revision, validated committed scene, sorted full project inventory descriptors, and candidate IDs. It is a state digest, not an expiring bearer grant or client assertion. There is no wall-clock expiry. The server independently recomputes it inside the deletion transaction; knowing or forging a digest never bypasses ownership, integrity, revision or reference checks.

The existing synchronous connection and transaction helper serialize upload, CAS save, bundle-import commit, export snapshot and cleanup. Selected deletion does:

1. `BEGIN IMMEDIATE` obtains the SQLite write reservation.
2. Load the exact owned project and compare committed revision.
3. Recompute and validate its entire inventory and saved reference set.
4. Refuse any selected saved reference or unknown/project-foreign ID; compare the inventory digest.
5. Parameterized `DELETE FROM assets WHERE project=? AND id=?` for each selected ID; demand one changed row each.
6. `COMMIT`; only then return exact IDs/count/bytes. Any error rolls back the whole selection.

A project save, upload or deletion that changes the relevant project after preview requires refresh. Import into a new, independent project does not invalidate an unchanged source inventory; quota is never authority for deletion. Repeat removal refuses `ASSET_MISSING`. A revision conflict takes precedence over classification, so a newly referenced selected asset after a save receives `REVISION_CONFLICT`. Same-revision referenced/unknown submissions receive `ASSET_REFERENCED`/`ASSET_MISSING`. Other inventory changes receive `CLEANUP_STALE`.

A save waits for the same SQLite reservation and validates every reference before updating the scene. After cleanup, a stale unsaved draft receives typed `ASSET_MISSING` (409); no saved scene mutation, stripping or substitution occurs. Export snapshots referenced assets before yielding to its worker. Backup uses SQLite's existing consistent online snapshot; an overlapping backup may contain the coherent before or after state. No parallel SQL writer or migration protocol is introduced. Bundle code now runs its worker entry only for encode/decode jobs, allowing store imports in independent test workers.

Engineering ceilings remain 100 assets/project and 100 MiB encoded assets/account, 5 MiB and 16M pixels/PNG. Preview/deletion inspect at most 101 descriptors (101 refuses), load/decode one bounded BLOB at a time and do at most 100 deletes. Full decoding runs synchronously under the reservation and can pause server work for large projects; these inherited limits are experimental, not production resource/latency approval. No cross-client reservation table, garbage collector, timestamps, background timer or compaction is added.

## Manual controls and browser lifecycle

The attached project's manual controls contain **Unused Project Assets**, **Review unused artwork**, UUID/digest/dimensions/byte labels, initially unchecked selection boxes, candidate count/reclaimable bytes, selected count/bytes and **Remove selected unused artwork**. Native confirmation states exact file count/logical bytes, unsaved-other-tab risk and lack of in-app undo. Cancel performs no mutation. Labels use text nodes; no model-selected images/URLs are fetched. Native composer and reading remain available.

Cleanup refuses current-browser dirty edits, pending PNG imports, saves or cleanup. Bundle import/export also disables cleanup controls while pending. It never auto-saves, auto-discards or detaches. Deliberate explicit reopen can discard edits through the existing confirmation flow. Mutations invalidate the preview; editing/import/save cannot race a pending cleanup on the same model. Failure offers refresh/reopen guidance with distinct stale/project/reference/missing/authorization/storage/uncertainty messages.

Requests capture the attached model's project identity, replacement authority and native session epoch. Late preview/removal responses after chat switch, replacement or disable cannot install a preview into a new model, attach visuals, change correspondence or dirty state, or report a new project's removal. A valid commit remains committed even if its receipt is abandoned. Reopen and explicitly review to discover current state. No service polling or browser/native metadata persistence fallback exists. Missing/older plugins disable cleanup while session-only visuals and native chat remain usable.

After success, removed alternatives leave the current editor's catalog, their Blob URLs are revoked, and the reducer catalog is reconciled. Uncertain removal conservatively evicts the submitted alternatives too; a fresh reopen/import can recover availability if the server did not commit. The saved arrangement remains intact.

## Unsaved drafts and recovery limits

The server cannot inspect every browser's memory. Another client may hold an unsaved image reference even when the saved project does not reference it. Explicit confirmation warns about this limitation; cleanup never claims global draft safety. A different tab may continue displaying its already-created Blob URL after deletion. Its next save refuses missing references, retaining its edits for deliberate reimport/reference changes; native reading/replying is unaffected. No unrelated replacement image or automatic data recovery is chosen.

Maintain verified, private, dated [full-database backups](M1_PROJECT_DATABASE_RECOVERY.md) before destructive maintenance. There is no in-app undo. Portable bundles contain only saved referenced assets and therefore cannot recover an unused alternative. Reimport the original artwork and deliberately update references, or follow separately reviewed operator recovery into an absent slot on a stopped compatible host. Never overwrite a live database. This feature initiates no backup restore or backup-package mutation.

A pre-cleanup verified database snapshot can contain later-deleted unused assets. A post-cleanup snapshot reflects a coherent committed database. Existing operator-only recovery/account binding and strict schema inspection are unchanged. [Portable exports](M1_PROJECT_PORTABILITY.md) retain only committed references; removing unrelated alternatives leaves those bundles complete.

## Logical quota versus physical disk

The account quota sums stored encoded BLOB lengths. Successful removal reduces that sum exactly and allows subsequent legitimate upload/import within quota. SQLite may retain freed pages in its freelist for later reuse, leaving the file's physical length unchanged. Logical bytes reclaimed, free-page counts and filesystem file length are separate measurements. No `VACUUM`, database replacement, filesystem compaction or immediate OS-space promise exists. Disk-shrinking maintenance needs separate backup/recovery review.

Production/live installation, physical-device support, power-loss certification, unsupported hosts/runtimes/filesystems, cross-tab collaborative editing and account lifecycle repair remain outside this slice. DYL-55 stays unfinished, DYL-56 Backlog, DYL-22/23 blocked, DYL-24 supported, M1.3/M2 unauthorized, upstream contact on hold and Gate A NOT_RUN.
