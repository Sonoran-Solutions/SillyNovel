# DYL-58 operator database recovery contract

**DYL-22 review candidate:** [PNG library contract](M1_PNG_ASSET_LIBRARY.md) extends project/database envelopes to v2 with an additive transactional catalog migration; scene and portable bundle v1 remain unchanged. Saved library alternatives are protected from cleanup. Updated recovery tools support exact schema 1/2 and whole-library backups; portable v1 copies omit library labels/unselected alternatives. Historical v1-only/no-migration statements below describe the prior slice.

This experimental local workflow recovers the installed SillyNovel store with its original IDs, revisions, owner keys and every immutable PNG, including unreferenced assets. It is authorized for disposable verification and senior review. It does not authorize live installation, production replacement, automatic recovery, account reassignment, DYL-59 cleanup, associations, M1.3/M2 or Gate A acceptance. [Implementation/evidence](M1_PROJECT_DATABASE_RECOVERY_IMPLEMENTATION.md).

The separate [portable `.sillynovel` format](M1_PROJECT_PORTABILITY.md) remains the supported copy path between account identities, allocating new project/actor/asset IDs. A database recovery never imports those semantics.

## Supported target and architecture

The optional plugin stores `<dataRoot>/.sillynovel-projects.sqlite` outside account directories. Schema v1 has `projects(id, owner, name, revision, scene)` and `assets(id, project, sha256, width, height, bytes)`, primary keys, an asset-to-project foreign key, revision check and owner/project lookup indexes. Ownership remains canonical JSON `[handle, created]` from the authenticated host profile. Normal saves use expected-revision CAS; project/asset writes remain separate transactions. The plugin enables foreign keys, synchronous FULL and a three-second busy timeout; default journal mode is DELETE. Startup now checks the exact complete v1 schema before quick_check. No HTTP recovery/migration routes or browser controls exist.

Recovery is implemented by `plugins/sillynovel-storage/tools/recovery.mjs` and `recovery.mjs`, reusing the actual scene/PNG validators and shared `database-schema.mjs`. No new dependency. Only Linux, local POSIX filesystem behavior, Node 26.8.1 / SQLite 3.53.4 and SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9` have been tested. Other versions/platforms/filesystems are NOT_TESTED.

Backup requires the official `node:sqlite.backup` function, introduced in Node 22.16 / 23.8. Feature absence returns UNSUPPORTED_RUNTIME; no raw-copy fallback exists. The plugin's declared >=22.13 floor is unchanged and does not promise backup on 22.13. [Node backup API](https://nodejs.org/download/release/v26.8.1/docs/api/sqlite.html) documents incremental online backup and restart on writes from other connections; [Node 22.13](https://nodejs.org/download/release/v22.13.0/docs/api/sqlite.html) lacks that API.

## Operator commands

Use the installed plugin directory, after its locked dependency is installed. All paths are explicit absolute paths; there is no inferred data root or overwrite default. Provision a private backup parent outside any served directory. The source data root and destination parents must be owned by the invoking OS user and not writable by group/others. Backup directories are mode 0700; database/manifest files are 0600. The utility never changes permissions on a source data root or host account files.

```sh
node /absolute/plugin/tools/recovery.mjs backup \
  /absolute/source-data/.sillynovel-projects.sqlite \
  /absolute/private-backups/snapshot-001

node /absolute/plugin/tools/recovery.mjs inspect \
  /absolute/private-backups/snapshot-001

node /absolute/plugin/tools/recovery.mjs inspect \
  /absolute/private-backups/snapshot-001 \
  --data-root /absolute/disposable-target-data

# Stop the disposable target host first. Its SillyNovel DB slot must be absent.
node /absolute/plugin/tools/recovery.mjs restore \
  /absolute/private-backups/snapshot-001 \
  /absolute/disposable-target-data/.sillynovel-projects.sqlite
```

The destination is an **empty database slot**, not an empty entire SillyTavern data root. Its parent must already exist and contain independently retained, compatible host accounts. The database file, WAL, SHM and rollback journal must all be absent. Existing files, directories and symlinks refuse; no `--force`, merge, rollback-to-older-data or overwrite option exists. The utility does not create a host installation or its `_storage`, accounts, cards, conversations or settings. A never-started target without compatible account records refuses populated recovery.

Restore verifies the accounts in the destination's actual parent, never an unrelated supplied evidence directory. Start only that disposable host with this data root, accounts enabled, CSRF enabled and the matching plugin. Sign in normally. Select the saved project and choose **Open project and use with this chat**. Reload, restart and native chat switching continue to detach projects; restored data never attaches to native conversations automatically.

Successful commands print aggregate JSON, without names, owner keys, paths, project scenes or account credentials. Failures print a code and exit nonzero. Offline inspection without account evidence returns `code: VALID_BACKUP` with `accountBinding: ACCOUNT_BINDING_UNVERIFIED`: valid content does not establish destination ownership. With evidence it reports VERIFIED_SAME_ACCOUNT_INCARNATION, or fails ACCOUNT_BINDING_UNVERIFIED. Inspection never restores anything.

## Backup format and verification

A completed directory has exactly two regular, singly linked files:

- `snapshot.sqlite`: standalone, consistent SQLite snapshot, normalized to DELETE journal format.
- `manifest.json`: strict version 1 manifest, at most 4096 bytes. Exact keys: `format` = `sillynovel-database-backup`, `version` = 1, UTC `createdAt`, `schemaVersion` = 1, `snapshot` containing exact `byteLength` and SHA-256, `integrity` = `ok`, integer `projects` and `assets` counts.

No native files, credentials, project names or scene contents go in the manifest. The SQLite file itself contains private artwork, scenes and owner keys: protect the entire package. SHA-256 detects accidental changes; it is **not authentication** against someone who can rewrite both files. A manifest digest is recorded in verification evidence, not a circular self-signature.

Inspection checks the exact layout, manifest types/version, UTC timestamp, length/hash, SQLite header/openability, complete v1 tables/constraints/indexes and absence of extra SQL objects, integrity_check, foreign_key_check, valid UUIDs/revisions/names/owner representation and scene schemas. Every scene reference must find an asset in its own project. Every asset, including unused rows, gets full bounded static PNG decoding, CRC, SHA-256 and dimension comparison. Validation streams file hashing in 64 KiB chunks and iterates BLOB rows individually. It rehashes after database validation. SQLite is opened read-only/query-only with extensions disabled, trusted schema off and a 2 MiB page cache. Published packages cannot contain journal/WAL/SHM sidecars or symlink/hardlink aliases.

## Account compatibility

The supported recovery is **same-installation or verified same-account-incarnation recovery** only. On the pinned host, `src/users.js` initializes node-persist in `<dataRoot>/_storage` with TTL disabled; `user:<handle>` stores the full profile. node-persist 4.0.4 names records by SHA-256 of that key and serializes `{key, value, ...}`. The admin create path slugifies the handle and uses `created: Date.now()`. The plugin uses those same authenticated fields. Source inspection and two-account host tests establish this bounded mechanism; it is not a stable upstream API promise.

The operator utility reads only the expected hashed account records, bounded to 64 KiB each, without initializing node-persist or importing host startup code. It requires the exact record key, handle and numeric creation timestamp for every recorded owner. It does not match display names, infer identity from a username alone, adopt the currently signed-in user, recreate accounts or change enabled/password/admin fields. Disabled accounts remain disabled; matching identity is not a login or credential validation. Handles over 100 characters, owner JSON over 1024 bytes, noncanonical owner encoding and unfamiliar host storage formats refuse this experimental workflow.

Account records must have been retained through the installation's independent host backup/provisioning process. The recovery utility neither backs them up nor copies them. Test provisioning explicitly copies only synthetic host records/native files before restore. A new account with the same username and a different `created` is incompatible. Missing compatible host account evidence means account recovery cannot be claimed and restore refuses. No database operation repairs host authentication.

## SQLite journals and concurrency

Online backup opens a separate read-only source connection and calls SQLite's backup API in 64-page batches. It never copies an active main database with filesystem copy. SQLite coordinates the source rollback journal/WAL and committed transactions; writes can cause retries/restarts. The saved scene and immutable BLOB rows come from one committed state. Asset upload can be committed before a later scene save, so valid unreferenced uploads are included. Backup never increments project revisions.

Only the owned output snapshot is switched to DELETE journaling before validation and publication. The live source's journal mode and synchronous setting are unchanged. Source journal/WAL/SHM files must be regular and safe when present; a lock, disappearing sidecar, hot rollback journal or unavailable read-only WAL access can cause safe refusal. Never delete source sidecars to make backup pass. A running rollback transaction may be omitted or roll back normally. SQLite recovery after a crash is a separate host/database operation; this utility does not repair a hot source journal. WAL with pending committed frames, overlapping save/import, explicit rollback and process interruption have dedicated tests.

## Publication and failure boundaries

Backup reserves an owned 0700 sibling staging directory and a 0600 snapshot. Open descriptors retain the created inode identities throughout cleanup, preventing inode reuse from making a replacement look owned. After snapshot validation it writes the manifest, independently inspects, and fsyncs both files and staging directory. It exclusively creates the final directory, hardlinks the snapshot, then links the manifest last, fsyncs destination/parent and removes its own staging links. Existing backup names refuse atomically. A directory without a validated manifest is incomplete. A crash with retained staging links can also fail the singly-linked-file inspection; its directory name alone never establishes completion.

Restore fully validates before staging, copies only the frozen backup snapshot to a sibling owned file, independently validates that staged SQLite database and compares its digest to a revalidated package. It rechecks destination account evidence, fsyncs the staged file and uses an exclusive hardlink to publish the complete database at the exact absent destination filename. Existing targets cannot be overwritten by that syscall. Finally it fsyncs the parent and removes its owned staging link. No partially copied database is exposed at the plugin filename.

These operations require a local filesystem supporting hardlinks and file/directory fsync on the same filesystem as each staging/output pair, honest storage durability, a stopped target, and exclusive operator control over directories, mount mappings, account records and backup contents for the operation. No guarantee against another privileged/same-UID process deliberately changing paths or starting a host during restore, bind-mount aliases, custom web-server mappings, network/FUSE filesystems or power loss is claimed. `public` and `extensions` path components, symlink components, `..` and existing hardlink files refuse; operators must also exclude any separately configured served path.

Ordinary failures clean only known output inodes. Unknown/replaced paths remain untouched. SIGKILL/timeout can leave a private `.sn-recovery-*` directory; there is no recursive startup cleanup or guessed ownership after restart. Preserve it for offline inspection. Publication is atomic but a later fsync, cleanup or process failure can leave a **complete** published output with an unsuccessful/unknown command outcome. Inspect it before any next action; do not retry by overwriting or delete source data. Physical power-loss behavior is NOT_TESTED.

## Refusal semantics

| Result | Operator response |
|---|---|
| VALID_BACKUP | Preserve snapshot and manifest together; independently inspect before recovery |
| INVALID_MANIFEST | Reject missing/invalid/extra layout, keys, versions, timestamp or counts |
| CHECKSUM_MISMATCH | Reject changed/truncated bytes; retain evidence |
| CORRUPT_DATABASE | Reject header, SQLite/openability or integrity failure |
| UNSUPPORTED_SCHEMA | Refuse unknown version, missing/altered schema or extra executable SQL objects; do not migrate |
| INVALID_PROJECT_STATE | Reject invalid owner, revision, scene, missing/foreign reference or FK violation |
| INVALID_ASSET | Reject invalid PNG, metadata, dimensions, digest or asset identity |
| ACCOUNT_BINDING_UNVERIFIED | No ownership reattachment; retain account evidence separately |
| DESTINATION_EXISTS | Preserve every existing database/sidecar/directory; no replacement |
| UNSAFE_PATH / UNSAFE_PARENT / UNSAFE_FILE | Correct operator-controlled path/permissions separately; no guard bypass |
| RECOVERY_LIMIT / RECOVERY_TIMEOUT | Refuse whole operation; preserve source and inspect partial output |
| UNSUPPORTED_RUNTIME | Use a separately verified runtime supporting official SQLite backup |
| Filesystem/SQLite failure | Nonzero code without private content; inspect destination, retain original source/backup |
| Plugin unavailable | Existing native chat and session-only visuals remain usable |

## Limits, resources and operator responsibilities

Experimental ceilings: 512 MiB standalone database and each inspected source sidecar, 1000 projects, 10000 assets, 268435456 aggregate decoded pixels, existing PNG limits (5 MiB encoded, 4096 edge, 16M pixels), 32 KiB serialized scene, 120 seconds per CLI process. A separate parent process watchdog kills synchronous SQLite/decoder work at the deadline; time-budget checks also run between rows. Internal test functions do not promise an independent process timeout. These are engineering limits, not owner-approved production capacity. A changing source may exceed the initial page count before refusal; budget disk for SQLite/WAL growth and incomplete outputs.

No whole-database Buffer or JSON serialization is needed; file hashing and BLOB validation are sequential. Full PNG decoding can still allocate substantial native/external memory, unaffected by V8 heap limits. Representative, ~126 MiB/1000-asset and 16M-pixel synthetic measurements are in the report; they do not establish a universal RSS ceiling. Run one operator command at a time, provide external OS memory/disk quotas if required, and keep PNG CPU work in this separate CLI process rather than importing recovery into the active server.

Plan free space for a full source, any source WAL/journal growth, the full snapshot and a full separate restored copy; staging and final hardlinks do not duplicate their BLOB bytes. Allow at least twice the snapshot size beyond the retained source/sidecars for backup plus restored copy, and additional headroom for failed attempts and concurrent growth. The utility does not reserve free space; ENOSPC refuses and must be handled like other I/O failures. Keep multiple dated backups outside served directories, restrict OS access, verify them periodically and retain independent host/account backups. Encryption, off-host retention and storage authentication remain operator responsibilities; no cloud transport is added.

## Migration policy

Schema v1 remains the only implemented version. Shared schema validation is the migration-precondition safeguard: version plus the exact tables, columns, constraints and indexes must match. Startup and operator validation refuse incomplete/corrupt or future schemas. Tests cover future-version and damaged-schema refusal without rewriting source bytes. There is **no v1→v2 transition** and no cross-version migration success claim.

Any future transition needs a separately reviewed explicit source/target version pair, full input validation, a preserved consistent pre-migration backup, copy-on-new-output transformation, unchanged source IDs/owners, complete output validation before activation, explicit runtime/account compatibility and rollback instructions. Migration exceptions must preserve the previous usable database. Destructive automatic migration and implicit downgrade/replacement are prohibited. This assignment provides the policy and tested preconditions, not a generic migration runner or manufactured schema v2.

## Testing and exclusions

[Exact-candidate evidence and commands](M1_PROJECT_DATABASE_RECOVERY_IMPLEMENTATION.md) distinguish real SQLite tests, filesystem faults, interrupted processes, synthetic resource measurements and a pinned disposable host/browser campaign. No production disaster-recovery certification, hostile local administrator isolation, Windows/macOS, other SQLite/Node/host versions, physical devices, real providers, automatic account repair, power-loss survival, production replacement, cleanup or release acceptance is claimed. DYL-55 remains unfinished; DYL-59/56 Backlog; DYL-22/23 blocked; upstream engagement on hold; Gate A NOT_RUN.
