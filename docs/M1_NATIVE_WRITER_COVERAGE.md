# DYL-42: Native writer coverage and source revisions

**Recommendation: REVISE.** Fresh character JSONL imports, native save-as copies and native branches can receive independent host-owned IDs in this bounded experiment. Changed canonical bytes advance a source revision; byte-identical saves do not. Group functionality remains usable with **all persistent group visuals refused**. This does not establish comprehensive production writer coverage: complete character scope lifecycle, startup/cleanup writers, registry recovery, and cross-process consistency remain blocked or untested.

**Answer to the success question:** only for the tested bounded paths and explicit group refusal, not every relevant native writer. Source inspection is not runtime support. No production stage, reader, reducer or persistence changed. DYL-24 stays session-only, DYL-22/23 stay blocked, M1.3 is unauthorized, and **Gate A remains NOT_RUN**.

## Authority and exact revisions

The owner supplied the DYL-42 assignment on 2026-10-14 (America/Phoenix). It authorizes this disposable proof and one open/unmerged PR, not architecture selection, migration, upstream publication, a permanent host fork, a required server plugin or subsequent implementation. The complete existing DYL-42 issue was read; no issue was created. PR #15 was verified MERGED at `2026-10-15T03:57:35Z`; DYL-28 was verified Done. DYL-42 was moved from Todo to In Progress before implementation.

| Item | Value |
| --- | --- |
| Supplied checkout, left unchanged | `4688646861274d9b5c993e9c478628d84c700144` |
| Fetched starting main / PR #15 merge | `6ecb062c2d891522200b25b5ec398c18d1544154` |
| Dedicated branch | `research/dyl-42-native-writer-coverage` |
| Tested proof SHA | `c2c4e7ae4702d31142e83e773eec3207f599ab23` |
| Pinned SillyTavern | **1.19.0**, `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Runtime | v26.8.1, linux 7.0.0-38-generic; headless Chromium 151.0.7922.34 |
| Model/provider | Deterministic loopback responder only; no model credentials or paid service |
| Final pushed head | Recorded in PR/Linear handoff after push; cannot embed a commit's own SHA in itself |

The source inventory verifies every inspected file byte-for-byte against `git show` on the pinned host. [source-inspection.json](evidence/dyl42/source-inspection.json) includes hashes and numbered source excerpts. [results.json](evidence/dyl42/results.json) includes exact IDs, requests, canonical bytes, registry bytes, visual bytes, hashes and cleanup. Later documentation/evidence commits leave the tested proof bytes unchanged.

## Reused proof and bounded changes

The DYL-28 runner still applies the DYL-27 mount and DYL-28 envelope patches, and copies their original module/browser files. With `SN_DYL42=1` it additionally applies [host-writers.patch](../tests/probes/dyl42/host-writers.patch), reruns every DYL-28 check, then invokes [writer-campaign.mjs](../tests/probes/dyl42/writer-campaign.mjs). The inherited owner/session, ordered load, expired ticket, HTTP refusal, stale CAS, canonical non-mutation and restart checks remain active. No unrelated extension entry or runtime module imports the experiment.

The overlay changes two disposable host files: `src/endpoints/chats.js` wraps both character import commit paths; `src/dyl27-storage.mjs` extends the existing lifecycle transaction. It does not patch groups into a provisional identity model. JSON converter imports share the hook but their format-specific behavior is NOT_TESTED.

A fresh import in an already registered native-created character scope persists a pending intent, allocates a random UUID, performs the native write, checks that imported nonempty lines are JSON objects, records the exact committed seal and initial source revision 1, creates a separate null visual record and clears pending intent. Imported IDs/revisions/ancestry remain untrusted canonical data; they are never identity inputs. The native filename is an internal locator only. A missing/disabled scope or unknown registry is never enrolled from a filename/hash.

An import filename collision disables the affected scope **before** the native overwrite. The native timestamp collision can replace an existing file even when its bytes are identical; a digest alone cannot detect that lifecycle replacement. The old visual record remains on disk but is unauthorized. A failed invalidation write refuses that import before touching canonical bytes; native error reporting remains intact. It does not guess recovery or silently reuse the prior identity.

For native saves, the prior seal hash is compared with committed bytes solely to detect source changes. A changed source advances the host integer; identical bytes retain it while refreshing the atomic-file seal. Hashes neither allocate IDs nor substitute for revisions. Visual CAS revision remains a separate counter.

## Native writer inventory

All routes below derive storage from authenticated `request.user.directories`; the client cannot select another account using owner/store fields. Chat scopes refer to native-created registry entries, never actor display names. Native group IDs, member avatar locators and group-chat filenames are separate from the experimental store/scope/chat UUIDs.

Pristine pinned references: `src/endpoints/chats.js` save/get/rename/delete at 545/592/621/654; imports at 751/771; group get/delete/save at 872/900/922. `trySaveChat` is at 532 and `src/util.js:1514` delegates to atomic file writing. The matrix is intentionally explicit about direct writers that bypass that helper.

| Native operation / browser entry | Server endpoint / canonical writer | Identity, source revision and activation | Failure/rollback / evidence |
| --- | --- | --- | --- |
| Character new/load; `doNewChat`, `openCharacterChat`, `getChat` | `/api/chats/get`; parsed file read. First greeting/save uses `/save` → `trySaveChat` → `tryWriteFileSync` → atomic write | Native character scope must already exist. New file gets UUID/revision 1; envelope binds snapshot and visit. Missing file returns readable empty snapshot/no identity | DYL-28 UI/API rerun; no adoption of existing unknown files |
| `saveChat`, `saveChatConditional`, message editor, replies | `/api/chats/save` → shared writer | Existing UUID preserved; changed bytes advance source revision; no-op does not. Old CAS/load ticket refuses on changed revision | EXPERIMENTAL_HOST + native editor/generation functions; intent survives failed canonical write |
| Edit/delete/reorder messages, swipe selection, regenerate, continue, metadata/extensions saving canonical arrays | Same `/save`; no separate server transcript writer | Same shared revision boundary. Selected-source edits invalidate old target; source revision independent of visual revision | Edit, generation, selected swipe exercised; every other UI operation is SOURCE_INSPECTION, not individually runtime-proven |
| Character JSONL import, `importCharacterChat` | `/api/chats/import` → `flattenChubChat`, then direct atomic write **or `copyFileSync`**, unlink upload | Fresh registered scope: new UUID/revision 1, ignored copied IDs; exact imported byte seal. Collision: disable scope. Browser open gets DYL-28 envelope | API and native browser function exercised. Invalid header returns native error. Bad trailing record/native write failure leave visuals refused |
| JSON chat conversions: Kobold Lite, CAI, Ooba, Agnai, Risu; Chub flattening variants | Same `/import`; JSON conversion `handleChat` writes one/multiple files directly | Same hook exists, but no format-specific support claim | SOURCE_INSPECTION / NOT_TESTED. Multi-output partial success is not a transaction; pending/collision policy must be reviewed |
| `saveChat({chatName})` identical copy | `/save` with new native filename | Fresh UUID/revision 1 even for byte-identical canonical file; no inherited visual record | Native function in real browser, actual bytes compared; copy menu NOT_TESTED |
| `createBranch`, `branchChat`, older message and swipe snapshot | `/save` via `saveChat` | Fresh child UUID; each branch independent revision; parent visit revoked on navigation; no scene inheritance | Two branches from same older point, unique suffixes, edit and parent return exercised via native functions. Branch menu and alternate-swipe branch NOT_TESTED |
| `createNewBookmark`, replace bookmark, back-to-main | `/save` through `saveChat`; may update parent bookmark metadata | Fresh filenames follow new-save rule; replacing existing destination follows native integrity behavior; no automatic ancestry authority | SOURCE_INSPECTION / NOT_TESTED for bookmark UI/replacement. Forged imported ancestry never grants authority |
| Chat rename, `renameChat` / `renameGroupOrCharacterChat` | `/api/chats/rename` → **copy + unlink**, destination-exists check | Character: preserve ID/source revision, update locator; old locator ticket refuses. Group remains refused | DYL-28 native endpoint rename race rerun; dialog/group rename NOT_TESTED. Copy/unlink is not a multi-file transaction |
| Chat delete/recreate, `delChat`, `deleteCharacterChatByName` | `/api/chats/delete` → `tryDeleteFile` / unlink | Tombstone old ID; recreation gets new UUID/revision 1, old target invalid | Native endpoints tested, identical locator reuse; old record retained separately, no garbage collection policy |
| Group create/membership/name/reorder/activation settings; `editGroup`, `_save`, member controls | `/api/groups/create`, `/edit` → **atomic group JSON**, `Date.now()` native group ID | **All persistent group visuals refused.** No experimental group scope or membership revision; member names cannot identify actors | Group create/edit endpoints tested, four members and two duplicate labels. Failed group metadata writes and group-ID clock collision NOT_TESTED |
| Group load/switch/new, `openGroupById`, `getGroupChat`, `openGroupChat`, `createNewGroupChat` | `/api/chats/group/get`; first greeting/save uses `/group/save` → `trySaveChat` | Browser `clearChat` revokes prior character visit. No group envelope/target is issued; native transcript remains readable | Native browser functions, new chat and switching tested. Group load response reorder proof NOT_TESTED; no group visual grant exists |
| Group save/editor/replies/metadata | `/api/chats/group/save` → shared writer, unresolved group scope | Native save works; no group chat UUID/source revision is advertised by the experiment | Native save/load, edit/save and account separation tested; group generation is SOURCE_INSPECTION / NOT_TESTED |
| Group import, `importGroupChat` | `/api/chats/group/import` → **direct copy + unlink**, timestamp filename | Native import remains functional; imported identity/ancestry cannot enroll group scope | Native endpoint import plus browser open tested; group import menu/collision NOT_TESTED |
| Group bookmark/branch and solo→group conversion | `saveGroupBookmarkChat`, `convertSoloToGroupChat` → `/groups/create`/`edit`, `/chats/group/save` | Group metadata and transcript are separate writes, no authoritative membership transaction; visuals refused | SOURCE_INSPECTION / NOT_TESTED; no promotion from character branch evidence |
| Group chat delete/recreate | `/api/chats/group/delete` → unlink (inherited wrapper cannot enroll group) | No group visual authority before or after | Native endpoints tested, successful readback after recreation |
| Group delete | `/api/groups/delete` → **direct unlinks** of listed chats and group JSON | Group visuals remain refused; no tombstone/membership model implemented | SOURCE_INSPECTION / NOT_TESTED. Host catches partial chat cleanup errors; no rollback |
| Character create | `/api/characters/create` → `writeCharacterData`, create chat directory; test scope hook | New random experimental scope UUID; duplicate labels get separate scopes; default chat saved separately | Native endpoint creation tested, inherited UI creates/loads verified; scope creation I/O failure not promoted to support |
| Character rename + rename historical messages | `/api/characters/rename` → card write, **directory copy/remove**, old card unlink; `renamePastChats` then `/chats/save` | Inherited middleware disables existing visual scopes before rename; no scope migration inferred | SOURCE_INSPECTION; full rename lifecycle NOT_TESTED here |
| Character delete/recreate, avatar replacement, character import/overwrite | `/api/characters/delete`, `/edit-avatar`, `/import`; card write/unlink and optional **recursive chat removal**. BYAF import directly writes chats at `characters.js:822` | Inherited pre-route invalidation disables scopes. BYAF-created chats cannot be adopted from their names. Recreated scope does not reenable disabled entries | SOURCE_INSPECTION / NOT_TESTED. No import card content or migration coverage claimed |
| Card duplicate and card field editing | `/api/characters/duplicate` → **copy card only**; `/edit`, `/edit-attribute`, `/merge-attributes` → card writer | Duplicate has no enrolled new scope, so visuals unavailable. Stable actor/binding semantics after arbitrary card edits remain BLOCKED | SOURCE_INSPECTION / NOT_TESTED; these are not equivalent to transcript copy |
| Rename group member historical messages | `renameGroupMember` → `/groups/edit` and multiple `/chats/group/save` | Group policy stays refused; no name-based actor identity or atomic bulk revision | SOURCE_INSPECTION / NOT_TESTED |
| Startup group metadata migration | `migrateGroupChatsMetadataFormat` in `src/endpoints/groups.js` → async backup copies and **atomic transcript/group JSON writes** | No group visual grant. Not covered by character save boundary; group rollout requires a migration contract | SOURCE_INSPECTION / NOT_TESTED; catches partial failures, no transaction |
| Data Maid cleanup | `public/scripts/data-maid.js` → `/api/data-maid/delete` → **async unlink** using user-bound report token | Missing canonical file fails seal checks; no proven lifecycle tombstone/recreation transaction | SOURCE_INSPECTION / NOT_TESTED; native safe refusal is not claimed solely from inspection |
| Account reset/delete, legacy data migration | `public/scripts/user.js` → `/api/users/reset-step2`, admin `/delete` → **recursive root removal**; `src/users.js` legacy copy/remove | Unknown/missing registry refuses; new store allocation does not adopt old metadata. Full reset/restore/recreation semantics BLOCKED | SOURCE_INSPECTION / NOT_TESTED, no private/installed root touched |
| Export/list/search/info/stats/backups | Chat `/export`, `/search`, `/recent`, group `/info`, `/characters/chats`, stats reads; backup writer creates backup file only | No canonical writer from these read/export routes. Full user backup may contain namespace; no restore authority inferred | SOURCE_INSPECTION; explicit visual bundle/export/import remains out of scope |
| External filesystem writes, restore, plugins/unknown writers | Outside verified hooked boundary | Seal detects many changed/missing/replaced files and refuses; no authoritative revision/history/ownership transaction can be inferred | BLOCKED / NOT_TESTED for comprehensive semantics; no cross-process or adversarial filesystem guarantee |

## Writer comparison and actual classifications

`NATIVE_HOST_UI` below means the real pinned browser executed native exported functions unless explicitly called a clicked control. It does **not** mean the corresponding import/branch/group menu was clicked. Direct HTTP is `EXPERIMENTAL_HOST`; source-only rows are never a PASS.

| Writer | Native tested | Chat ID behavior | Source revision | Stale visual authority | Verdict |
| --- | --- | --- | --- | --- | --- |
| New character save/load | Browser card controls + HTTP | Fresh UUID, scoped | Starts 1 | Bound envelope/visit | SUPPORTED, bounded |
| JSONL character import | Multipart endpoint + browser `importCharacterChat` | Fresh UUID; ignored imported IDs | 1 for actual committed bytes | Forged parent target refuses child; separate visual records | SUPPORTED in registered fresh scope |
| Identical imported bytes / duplicate labels | HTTP | Three independent IDs across two scopes | Independent 1 | No record inheritance; wrong-store refusal | SUPPORTED, bounded |
| Timestamp import collision | Frozen import clock + actual native endpoint | Existing scope disabled | No replacement revision advertised | Old target refuses after committed overwrite | REFUSED; no native filename collision fix |
| Malformed header/body, canonical I/O failure | Actual import route + test-owned faults | No grant / pending | Unavailable | Native reading remains usable | REFUSED; no repair |
| Identical native save | Actual `/save` | Same UUID | Unchanged | Existing exact-source authority remains safe | SUPPORTED |
| Edit/save and overlapping source reads | Native editor + endpoints | Same UUID | Advances on change | Old ticket and CAS reject | SUPPORTED |
| Swipe generation / continuation / regeneration | Native `Generate` with deterministic responder | Same UUID | Advances on committed changed bytes | Prior source CAS rejects | SUPPORTED for exercised modes |
| Selected swipe | Native `swipe_left`, save/readback | Same UUID | Follows actual byte change | Reload binds current revision | SUPPORTED for exercised selection |
| Identical native save-as copy | Browser `saveChat({chatName})` | Distinct UUID even with identical bytes | Independent 1 | Parent token cannot authorize child | SUPPORTED for function path |
| Two older-point branches and edit/navigation | Browser `branchChat(1)` | Distinct child IDs, suffix collision avoided | Independent; edited child advances | Old parent/child visits reject | SUPPORTED for function path |
| Rename/delete/recreate | Native endpoints | Preserve rename; fresh after tombstone | Preserve rename / reset new instance | Old locator/ID refuses | SUPPORTED within single-process healthy I/O |
| Group create/save/edit/load/import/switch/new/recreate | HTTP + native browser functions | No experimental group IDs | Unavailable | Character target revoked; no group grant | REFUSED for persistent visuals |
| Other converters/bookmarks/scope/startup/cleanup/reset writers | Source only | Contract missing or conservative refusal model | Unproved | No comprehensive runtime guarantee | BLOCKED / NOT_TESTED |

## Evidence, races and failure policy

The full frozen run `fd6f8597-30fb-4e39-94f0-1ff1d36fd931` has 33 checks, with all 16 inherited DYL-28 checks rerun plus the DYL-42 campaign. The inherited test delays actual transcript responses and activation acknowledgements, uses A→B→A, edits while a load is pending in a second authenticated browser, expires real 30-second tickets, verifies an actual non-JSON HTTP 403 from host auth, aborts activation transport, checks Temporary Chat, races two visual CAS requests, tests rename during a pending load, wrong store/session, and restarts. See raw checkpoint details rather than treating the total as a count of independently tested UI gestures.

Imports use original small synthetic JSONL with duplicate labels, identical bytes, copied store/chat IDs, sourceRevision 900 and forged ancestry. The accepted target always uses host UUIDs and revision 1. Positive visual CAS on imports leaves canonical bytes and source revision unchanged. A second authenticated owner importing the same forged payload gets its own store/ID; submitting owner fields cannot redirect it to the first owner. Forged targets and stale source tickets do not mutate records.

Copies invoke native `saveChat` after normalizing the native header once, then compare **full committed JSONL bytes**. Branches invoke `branchChat(1)` twice from the same parent; they contain only the first two messages, choose distinct native suffixes, open via the real browser, and receive fresh UUIDs/null visual records. Editing one child advances its revision without changing the parent's visual record; parent→branch→parent navigation returns the correct target. No branch point is treated as an approved visual inheritance seam.

Groups have four synthetic native-created members, including the two distinct same-label Mira cards. The test separates the native group instance JSON, member avatar locators and group-chat files. No membership revision, source revision or visual identity is invented for groups. A membership edit preserves native behavior while persistence stays refused. Group transcript/save/load/import/new/switch and delete/recreate execute; a different owner cannot read the first owner's group chat by ID alone. Restart reads actual group bytes. This does not establish actor correspondence or group visual persistence.

Failure policy is conservative: corrupt/unknown registry yields an identity-null envelope while returning readable native messages; malformed trailing import records leave pending intent; actual EACCES creating a canonical import returns the native error with no canonical file, preserving pending refusal across restart. The corruption test restores only its deliberately fault-injected test bytes, explicitly as test setup. No automatic recovery or adoption is implemented. A transaction failure may make unrelated registered chats unavailable for visuals; that is the known ceiling of the inherited whole-store pending marker.

For collisions the import clock alone is frozen to `1700000000000` through an experiment-only environment variable. The canonical import endpoint, multipart parsing, copy/write and registry checks remain real. Unique labels avoid incidental collisions; the dedicated collision test intentionally reuses the same label/scope and checks identical bytes. Native conflict behavior is preserved: an overwrite can occur, but visual authority is unavailable. Invalidation storage failure is a native import error before any overwrite. Collision detection precedes seal/drift checking: an injected unknown-writer newline followed by a native import restoring the original exact bytes must still disable the scope. Otherwise the unchanged inode/birth/hash seal could resurrect the old target; this control explicitly verifies refusal after restoration.

## Actual hashes

| Component | SHA-256 |
| --- | --- |
| `host-storage.mjs` | `77c5397c402e40bbc1580eb55e9f6df1559d1eaa7ab9ad5178e2ba86d4bd722a` |
| `host-visit.js` | `dd18e8e1b71aa3dc60e2e9e1c3e22f43064edab5f8435f5643acf0c24b2f9287` |
| `host-envelope.patch` | `e73905b37c59b20a6f9844050a4152e7c25a02d1bb6ccaa9e908968ae665996d` |
| `host-probe.mjs` | `538445b33d3c057abf9d12e506fde07ccfe39dc1e7a63570225c3e7cae24e475` |
| `dyl27-host-mount.patch` | `a30ddf37b47c99d3db0e575df339e8fe3411b97914551a1351f9d0d6e312c6aa` |
| `dyl42-host-writers.patch` | `af14a89522f954345914f71762b436f9ff4d9db2d3f1b22557eafd9b3d6f3b83` |
| `dyl42-writer-campaign.mjs` | `f436e5b4932fda523cfa3b03c060834a78de2f0c18cfbadc6510ab91e193e9fd` |
| `applied-host-storage.mjs` | `21e77a702a6e1f73cd2182d53b5149ca5f14d401a7f1fcd83bff6327dd96d060` |

| Actual stored example | SHA-256 |
| --- | --- |
| Imported canonical JSONL (77dd0eb2-a611-4623-bf37-bf5ad3eb8da4) | `40da7781d016cd6189d413a51041df6dc10f34257a76d7e4f0cbadde86cac1ff` |
| Its independently written visual record | `ef2e0d8ff5546c8d65b7a34bae74d1b055fbd2c2f08b5e81e644bca95bff244c` |
| Registry at imported-record checkpoint | `9f73e0d85356ce8e1ac836c3e953554c060b47d475bb272b9be8a2649fef19df` |
| Native group canonical JSONL | `ddcb5324a8b4a1f66689d96f214cfaa31edd4ff4717c576ac136e3812bfc2e70` |
| Parent visual record after final restart | `3433cf23436aa06a1e671dc0ea26af35b031e0e04f1eb20c13a65f62688b6dc0` |


The results retain **raw registry and visual bytes plus SHA-256**, canonical source bytes/seals/digests at every checkpoint, group canonical bytes/hash, and cleanup attestations. Group files are recorded explicitly in group checks; they are not misrepresented as registry-enrolled chats. The applied storage-module hash is separate from the unmodified DYL-28 input module hash. Patch application order is part of reproduction.

## Exact reproduction and results

Use a disposable pristine pinned host with its already installed dependencies. This campaign reused `/tmp/SillyTavern-m12-review/node_modules`; it did not run the supplied checkout or read its data. No new dependency was added to SillyNovel.

```sh
node tests/probes/dyl42/source-inspection.mjs /tmp/SillyTavern-m12-review > /tmp/dyl42-source-final.json
node --check tests/probes/dyl28/host-probe.mjs
node --check tests/probes/dyl42/writer-campaign.mjs
SN_DYL42=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl42-evidence-complete
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-source-prefix.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test tests/m1-reader-browser.test.mjs
git diff --check
```

Use a **nonexistent** evidence directory for each invocation. Final command used `/tmp/dyl42-evidence-complete`. Host result: 33/33 checkpoints pass within the documented bounds. Node: **64/64**; actual-entry Chromium: **24/24**; source verification/syntax/diff checks pass. The automated reader/scene suites are synthetic fixtures using the actual extension entry, distinct from the native pinned-host campaign. No hosted CI success, real inference, physical device, other host/browser or owner experience is claimed.

Development runs are retained as failure history, not promoted to evidence: initial stale-target negative omitted the imported scope; second compared an old parent source revision with a revision-one copy before reaching visit validation; a shortened pass attempted generation before connecting the deterministic provider; another corruption assertion reparsed the intentionally broken registry. These harness assertions were corrected. Shortened development runs skip inherited races and are not final evidence. Final reproduction uses only the tracked runner, complete inherited checks and the frozen proof SHA.

The runner refuses an evidence-directory collision and any non-pinned host, clones its own temporary checkout, creates a UUID-marked fresh account-enabled data root, binds host/provider listeners to loopback only, creates separate authenticated browser contexts and synthetic users/cards/chats, and uses only its child processes. EACCES requires a non-root runner. Finally it closes contexts/provider/browser, terminates only its host child with bounded SIGTERM/SIGKILL, verifies its ownership marker, removes only its owned tree and checks the supplied source checkout status stayed unchanged. Final cleanup is recorded in results; no test data root remains. The patch-preparation clone `/tmp/dyl42-patch-host` contained source changes only and was never run. It was removed after verifying its origin, base commit and exact modified paths; [cleanup record](evidence/dyl42/preparation-cleanup.json). Do not delete pre-existing `/tmp/dyl28-*` resources from other work.

## Security and maintenance limitations

- This remains one modified host process with synchronous registry/CAS sections. There is no cross-process lock, portable filesystem identity or protection against malicious disk writers. File fsync/atomic rename does not establish a multi-file transaction, parent-directory durability, machine-crash recovery or power-loss safety.
- No production namespace, schema/capability API, quotas, registry size policy, account restore policy, garbage collection, lost-ack idempotency or existing-chat migration is selected. Registry intent/record commit I/O failure beyond the exercised controls remains NOT_TESTED. Full store read failures and disk-full/fsync failures need a separate protocol proof.
- Direct JSON converters, card scope changes/BYAF, group startup migration, Data Maid and account reset/delete were inventoried, not runtime-certified. Unknown writers cannot be described as safely covered merely because a seal often detects drift. Complete group ownership/membership and delayed group canonical response ordering remain BLOCKED.
- Imported ancestry remains untrusted prose metadata. No actor is identified by display name, no visual state is injected into canonical RP, and no imported path/URL/script becomes executable authority. The tests use fixed host-resolved locators and a tiny allowlisted visual payload.
- The experiment stores synthetic fixture text in evidence intentionally; no real chat/card/reference asset, credential, installed host, external cloud provider or billed image service was used. This proof does not establish raster asset storage or visual-bundle portability and does not unblock DYL-22/23.

## Owner decisions and next bounded step

The assignment authorizes DYL-42 only. Fresh-import enrollment, no-op revision handling, scope-wide collision refusal, whole-store pending refusal and blanket group visual refusal are **engineering choices for this experiment**, not owner approval of release semantics. No new human gate verdict is recorded.

Smallest recommended next task: a separately authorized **lifecycle invalidation and failure-boundary proof** for character scope mutation and unhooked cleanup/startup writers, including registry-write failures, before broadening supported persistence. Decide existing-chat/restore/recovery policy separately. Group support requires its own host-owned group/member/chat and membership-revision contract; do not add ad hoc author-name or filename bindings to force GO.

**REVISE**, not GO or STOP: the covered paths are feasible, but this is not a comprehensive supported native writer architecture. Leave the DYL-42 PR OPEN/UNMERGED with auto-merge disabled and the issue In Review at handoff. Do not merge, implement persistent scenes, publish upstream, start M1.3 or grant Gate A.
