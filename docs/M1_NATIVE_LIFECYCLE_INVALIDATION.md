# DYL-43: Native lifecycle invalidation and registry failure boundaries

**Recommendation: REVISE.** Tested lifecycle revocations hold across failures and process restart. An authoritative negative control still accepts obsolete authority after an unobserved byte-identical rewrite/restoration. Full no-resurrection requires a host-owned lifecycle/write-generation contract.

Investigation baseline: fetched main `ea6659d70813812617ac0869bf9fd20093d71f0c`; supplied checkout `4688646861274d9b5c993e9c478628d84c700144` remains unchanged. PR #16 verified merged; DYL-42 verified Done. Pinned SillyTavern 1.19.0: `7e8663cd9c184a550b37238218bdd32c6efc68e9`.

## Lifecycle inventory (source inventory completed before implementation; runtime columns finalized afterward)

This inventory was written before the DYL-43 patch. Browser function calls and direct endpoint evidence are classified separately. All native paths resolve authenticated user directories; no display name, avatar filename, hash or imported metadata constitutes experimental identity.

| Native lifecycle path | Identity transition | Required invalidation | Registry failure behavior | Runtime evidence | Verdict |
| --- | --- | --- | --- | --- | --- |
| `renameCharacter` → `/characters/rename` | New card filename; `writeCharacterData`, cp/rm chat directory, unlink old card; browser `renamePastChats` saves history and renames chat files | Revoke old scope before first write; destination may reuse obsolete chat directory; no enrollment at destination | Inherited middleware swallows persist failure: unsafe; experiment must refuse before mutation | Native browser function + endpoints; F1/F2/F5/restart | REVOKED; preservation exceeds bounded transaction |
| Native delete → `/characters/delete` | Card unlink then optional awaited recursive chat deletion; locator reusable | Scope revocation before unlink, survives partial deletion/recreation | Refuse if revocation cannot persist | Native endpoints; recreation/F1/F2/F5/restart | REVOKED; no automatic reenrollment |
| Duplicate card → `/characters/duplicate` | `copyFileSync` to unused suffix; only card copied | No new scope enrolled, ignore copied identity metadata | No registry write required for unsupported duplicate | Native endpoint; copied metadata and card hash | REFUSED visuals; native duplication usable |
| `importCharacter` → `/characters/import` JSON/PNG/CharX/BYAF | `getPreservedName` can replace card at existing filename; JSON/PNG/CharX write card; BYAF additionally writes chat JSONL directly before card | Revoke before native import; pre-route multipart fields unavailable, conservative all existing scopes | Refuse if registry cannot persist; no guessed enrollment | JSON native endpoint/F1/F2/restart; other formats source only | JSON REVOKED; BYAF direct writers bypass shared chat hooks, NOT_TESTED |
| `/characters/edit-avatar` | Card bytes replaced at same locator | All existing scopes revoked before multipart parsing | Refuse required invalidation failure | Source only | NOT_TESTED |
| `/characters/edit`, `/edit-attribute`, `/merge-attributes` | Shared card writer can change embedded names/metadata; canonical chat files not rewritten | Actor/content semantics unresolved; no imported identity adopted | No complete lifecycle protocol | Source only | BLOCKED for full actor identity |
| Data Maid UI → `/data-maid/report`, `/delete` | User-bound report token hashes resolve orphan chat files, awaited unlink per file | Chat tombstone before each unlink; old report can target a recreated path | Refuse cleanup if registered revocation fails; retain tombstone on unlink failure | Native report/delete; F1/F2 and same-byte restore | REVOKED; hook bypasses `nativeMutation` |
| Group UI → `/groups/delete`, `/chats/group/delete` | Direct unlinks of transcripts + group JSON; partial cleanup possible | Keep all persistent group visuals refused | No group authority to preserve | Source only; inherited group endpoint tests separate | REFUSED / native group-delete NOT_TESTED |
| Startup `migrateGroupChatsMetadataFormat` | Async backup copies and atomic group transcript/metadata rewrites | Group visuals remain refused; future group contract must include migration | No transaction/recovery contract | Source only | NOT_TESTED |
| `migrateUserData` in users.js | Startup legacy public directory copy then recursive remove | Store generation and migration transaction required before enrollment | No production recovery policy | Source only | NOT_TESTED actual migration |
| User reset UI → `/users/reset-step2` | Removes user data root then recreates defaults | Store revocation outside removed registry required for restore safety | Whole-root restore can restore obsolete registry too | Source only | NOT_TESTED; never run on real profiles |
| Admin UI → `/users/delete` | User record removal; optional recursive root removal | Store/account incarnation and session revocation contract | No atomic account + files + registry boundary | Source only | NOT_TESTED |
| `/users/backup`, chat backups/export | Archive/read or backup output; not canonical restore | Restore needs external generation authority; never restore namespace as trusted identity | Old registry + canonical bytes can resurrect disk authority | Source only | Restore BLOCKED |
| Unknown writer/byte-identical replacement; restore pre-drift bytes | Bypasses every native hook; content can return to prior hash | Observed drift must latch revocation; unobserved in-place same-byte replacement is undetectable with current seal | Failed durable latch cannot promise restart safety | Authoritative acceptance counterexample + observed-drift refusal | General guarantee BLOCKED |

The experimental choice is conservative invalidation. Preserving scope across card write, directory copy/remove, historical-message rewrites and browser chat saves requires a host transaction spanning those separate operations. No production policy is selected by this experiment.

## Answer and recommendation

**REVISE.** The tested native operations can revoke obsolete authority conservatively, but the universal “without ever silently transferring it” claim is **not established**. The experiment deliberately reproduces a counterexample: an unobserved in-place rewrite followed by restoration of old bytes, and a byte-identical `copyFileSync` overwrite, leave the old inode/birth/hash seal valid. The authoritative host still accepts the old visual read. No digest, filename or matching transcript can supply the missing write/ownership history.

The smallest next task is a separately authorized **host-owned lifecycle reservation/write-generation contract proof**: reserve source and destination character incarnations through asynchronous canonical writes, persist revocation before any write, and prove overlapping create/import/rename and restore cannot bypass that generation. Unknown writers must participate or be explicitly excluded from persistence. Whole-root restore also needs a store incarnation authority outside the restored registry. This task does not implement that redesign or automatically repair registries.

The production extension remains unchanged. DYL-22/23 remain blocked; DYL-24 remains the accepted session-only stage; M1.3/M2 remain unauthorized; **Gate A is NOT_RUN**. An experiment passing its assertions does not convert the blocking negative control into a safety PASS.

## Reproduction, topology and source ownership

Issue: [DYL-43](https://linear.app/devils17/issue/DYL-43/sillynovel-m12-i-prove-native-lifecycle-invalidation-and-registry). Branch: `research/dyl-43-lifecycle-invalidation`; dedicated worktree `/tmp/sillynovel-dyl43`. Tested proof SHA: `ca577c2da9fafb50210a1db3e2e416dc27a78854`. Final pushed head is recorded in the PR and Linear handoff, avoiding a self-referential commit SHA in this report.

The DYL-26/27 CAS/identity and DYL-28 envelope/module/browser probes, plus the DYL-42 overlay/campaign, were inspected before reuse. [Pinned source inspection](evidence/dyl43/source-inspection.json) records exact pristine file hashes and numbered native excerpts for all requested source files and further browser/account/bookmark callers. It is generated with the existing DYL-42 source inspector against the exact pin; inventory rows above identify the additional lifecycle meanings. The experiment applies the DYL-27 mount, copies DYL-28 helpers, applies DYL-28 envelope and DYL-42 writers, then applies [host-lifecycle.patch](../tests/probes/dyl43/host-lifecycle.patch). [lifecycle-campaign.mjs](../tests/probes/dyl43/lifecycle-campaign.mjs) runs after all 16 inherited DYL-28 checkpoints. `SN_DYL43=baseline SN_DYL42=1` applies the same patch but runs the complete 33-check DYL-42 campaign instead.

The existing runner creates its own temporary pinned checkout, links only the supplied checkout's installed dependencies, and creates a UUID-marked data root and account-enabled config. Both authenticated users, all cards/transcripts and original synthetic metadata are test-owned. Browser contexts are isolated. Host and deterministic responder listeners bind to loopback. No installed host, real profile, paid provider, credential, reference image, private chat or upstream repository is modified.

The supplied pinned checkout is `/tmp/SillyTavern-m12-review`; its Git status is checked before/after each run. Each run refuses an existing evidence directory, owns only its child process/tree, closes its browser/provider, stops its host with bounded TERM/KILL fallback, verifies its marker and removes its tree. Source-only preparation clone `/tmp/dyl43-patch-host` was independently verified before cleanup. These are process-restart tests; neither a graceful restart nor deterministic fault injection proves a power-loss or machine-crash transaction.

## Experimental invalidation policy

Rename preservation would need one host-authoritative transition across the new card write, directory copy/remove, old card unlink, historical-message updates, browser saves and possible failures. The bounded policy therefore **revokes** rather than migrates:

- Rename revokes both currently registered source and resolved destination scopes before the first asynchronous card read/write. Native filename selection is authoritative only as the locator passed to this revocation. It does not allocate an identity. A registered orphan destination remains revoked when native rename skips moving into an existing chat directory.
- Character deletion revokes its scope before card unlink. Optional recursive chat deletion can fail afterward without restoring the scope. Creating the same avatar later encounters the disabled entry; it cannot reenable or inherit it. Restoring identical transcript bytes does not change this.
- Duplicate copies the native card unchanged, including forged identity metadata. No scope allocation hook runs; its chats remain readable/savable with visual identity unavailable. Original scope/records remain independent.
- Character import and avatar-edit middleware run before multipart parsing. They permanently disable **all existing scopes in that authenticated store** before proceeding; registry persistence failure returns explicit HTTP 503. JSON replacement is runtime-tested. PNG, CharX, BYAF, YAML and avatar-edit format behavior are SOURCE_INSPECTION / NOT_TESTED. This all-scope choice is conservative and affects availability. It is not a production recovery policy.
- Data Maid marks all registry entries at the exact host-resolved cleanup path disabled before each awaited unlink. This is chat-specific, remains disabled on native unlink failure, and survives identical-byte restoration. The user-bound report token is verified before the guard. A stale report can therefore revoke a currently registered replacement at that locator before deleting it.
- Observed canonical drift through authoritative target validation permanently disables that chat. Unobserved byte restoration remains a proven gap. Missing/corrupt registries do not enroll files or reconstruct identities.
- A pending native save transaction refuses the whole store. The shared writer now propagates failure to persist its pending intent before running the canonical writer. Failed finalization leaves the existing durable pending marker intact; no repair is attempted.

Permanent lifecycle revocation is itself the final registry state; it has **no post-native finalization step that can reenable authority**. Files and old visual records remain on disk where native cleanup leaves them, but validation refuses them. All-scope refusal applies to existing scopes, not a proven reservation of every future asynchronous allocation; overlapping create/import/rename is explicitly NOT_TESTED and needs the next host contract.

## Registry failure-boundary matrix

| Boundary | Registry must commit first | Native result / injected fault | After restart / authority | Evidence |
| --- | --- | --- | --- | --- |
| F1 rename | Source + existing destination scopes disabled | Real namespace EACCES; native endpoint HTTP 500, no card/chat/registry bytes changed | Original authority remains valid because operation never started | EXPERIMENTAL_HOST |
| F1 delete | Character scope disabled | Real namespace EACCES; explicit 503 before unlink; original authority still valid | No canonical ownership mutation | EXPERIMENTAL_HOST |
| F1 JSON card replacement | All existing scopes disabled | Real namespace EACCES; middleware 503 before import parsing/commit | Original registered instance remains readable and authorized | EXPERIMENTAL_HOST |
| F1 Data Maid | Matching chat entries disabled | Real namespace EACCES; native cleanup 500; source and registry unchanged | Native file not deleted | EXPERIMENTAL_HOST |
| F1 shared native save | Durable store pending intent | Real EACCES; save 500, canonical bytes unchanged | Prior target stays valid; no swallowed begin-intent error | EXPERIMENTAL_HOST |
| F2 rename/delete/import | Permanent revocation already committed | Marker-controlled throw after registry commit and before native mutation | Unnecessary scope/all-scope visual refusal persists; no automatic reenable | SYNTHETIC fault + EXPERIMENTAL_HOST |
| F2 Data Maid | Chat disabled | Real chat-directory EACCES on awaited unlink; file remains | Chat stays disabled; later native cleanup succeeds | EXPERIMENTAL_HOST |
| F3 completed destructive operations | Permanent scope/chat revocation | Native operation commits; no registry finalization needed | Restart retains refusal; old CAS rejects identity, old load ticket rejects client | EXPERIMENTAL_HOST |
| F3 native save | Pending intent before canonical write | Marker fails registry finalization after native save commits; endpoint still reports native success | Exact pending registry bytes survive restart; whole store unavailable for visuals | SYNTHETIC fault + EXPERIMENTAL_HOST |
| F4 missing/corrupt registry | No guessed reconstruction | Remove registry or write `{broken`, then restart separately | Native JSONL loads return actual readable messages, identity null, CAS `IDENTITY_UNAVAILABLE` | SYNTHETIC fault + EXPERIMENTAL_HOST |
| F5 rename partial mutation | Source/existing destination scopes disabled | Deterministic fault after new card write: both cards and old directory remain | Old authority stays refused; no migration/adoption | SYNTHETIC fault + EXPERIMENTAL_HOST |
| F5 delete partial mutation | Scope disabled | Real directory EACCES after native card unlink; transcripts remain | Scope stays refused | EXPERIMENTAL_HOST |
| Corrupt registry during destructive operation | No authority can be reconstructed | JSON parse refuses mutation; missing registry may allow native operation with no enrolled authority | Recovery/concurrent enrollment not claimed | SOURCE_INSPECTION / NOT_TESTED |
| Directory fsync, disk-full/fsync failure, multi-process, power loss | External transaction/durability contract missing | Not injected/tested | No guarantee claimed | NOT_TESTED / BLOCKED |

`atomic` fsyncs the registry temporary file before renaming it. That is evidence for the tested process-restart boundary only; it does not fsync the parent directory or atomically commit multiple native files.

## Runtime evidence and no-resurrection controls

`NATIVE_HOST_UI` means the real browser invoked native `renameCharacter(name, { silent:true, renameChats:true })` after native card selection. The rename menu and confirmation popup were not clicked. It rewrote historical message names through the native save route, moved the directory, loaded the new card and left visual identity unavailable. The chat filename itself remained unchanged. The separately rerun inherited chat-rename check covers filename changes and pending-load invalidation; it must not be mistaken for character identity preservation.

Other new lifecycle operations use actual authenticated native HTTP endpoints: character create/delete/duplicate/JSON multipart import, chat get/save, Data Maid report/delete and experimental CAS/load boundaries. Synthetic setup is explicit: unknown card removal to create a Data Maid orphan; unknown file unlink/in-place writes; marker files for exact failure boundaries. Data Maid UI clicks, native import menus, PNG/CharX/BYAF payload import and a real provider are NOT_TESTED.

Every fixture writes a real visual revision 1 while verifying canonical bytes remain identical. It captures a target and a separate pending load ticket. Each revocation asserts both old CAS and old ticket refusal and unchanged raw visual record. Host `INVALID_TARGET` (400) refuses disabled identities; after restart `accept-load` first refuses the old in-memory client with `INVALID_CLIENT` (403). Missing/corrupt/pending catalog CAS returns `IDENTITY_UNAVAILABLE` (409). These are server responses, not conclusions from browser target clearing.

The evidence includes:

- Rename, reused old card/name, same transcript bytes, and rename into a registered orphan destination; source and destination scopes never inherit one another.
- Native delete with recursive cleanup, recreate same name/avatar/transcript, and restart; old scope stays disabled.
- Card duplication with explicitly inserted copied host target metadata; native card bytes copy exactly, duplicate gets no scope/chat/record.
- Native JSON card replacement containing copied identity metadata; old canonical transcript bytes remain but old visual authority is unavailable.
- Actual Data Maid token/report/deletion, wrong-user token 403, real registry and unlink permission failures, then same-locator byte restoration.
- Synthetic unhooked chat unlink, authoritative CAS refusal, and identical-byte restoration; observed unknown source drift also remains revoked after byte restoration.
- The **blocking counterexample** of unobserved restored bytes and a byte-identical overwrite accepted under the old seal. This is recorded as an expected negative-control finding with verdict REVISE, not “safe unknown writer” support.
- Missing and corrupt registry across separate restarts, retained native text with no guessed IDs, and a failed save finalization with unchanged pending registry after restart.
- Two authenticated synthetic users: the first user's scoped invalidations, corrupt registry and store-wide pending refusal do not change the second user's raw registry/store identity or native visual authority. Inherited wrong-store/session/CAS checks also run.

Raw store/scope/chat IDs, source and visual revisions, load requests, view tokens, raw canonical/registry/visual bytes, source seals and SHA-256 values are retained at checkpoints in the results files. F4 records the literal missing/corrupt state before the harness restores its own injected fault bytes. That restoration is test setup, not an implementation recovery feature.

## Coverage classification and remaining boundaries

| Surface | Classification | Result / limit |
| --- | --- | --- |
| Character rename + historical message rewrite | NATIVE_HOST_UI + EXPERIMENTAL_HOST | Conservative source/destination revocation; native flow remains usable |
| Character delete/recreate, partial rename/delete | EXPERIMENTAL_HOST + explicit faults | Tested refusal; permanence favored over availability |
| Duplicate with copied metadata | EXPERIMENTAL_HOST | Native duplicate usable; visual enrollment unsupported |
| JSON character replacement | EXPERIMENTAL_HOST | Tested all-existing-scopes revocation and F1/F2 |
| PNG/CharX/BYAF/YAML and avatar edit | SOURCE_INSPECTION / NOT_TESTED | BYAF direct JSONL creation before card write is inventoried, never certified by JSON evidence |
| Data Maid orphan chat cleanup | EXPERIMENTAL_HOST; SYNTHETIC orphan setup | Exact token-authorized native unlink and failure boundaries tested; UI menu NOT_TESTED |
| DYL-28 ordering, HTTP refusal vs transport, source revision, activation and CAS | NATIVE_HOST_UI + EXPERIMENTAL_HOST | Complete inherited suite rerun |
| DYL-42 JSONL imports, copies/branches, collisions and group refusal | NATIVE_HOST_UI + EXPERIMENTAL_HOST | Complete inherited suite rerun with DYL-43 patch |
| Group delete/startup metadata migration | SOURCE_INSPECTION / NOT_TESTED | No group storage/identity allocated; persistent visuals remain REFUSED |
| Account reset/delete, legacy data migration, backup/restore | SOURCE_INSPECTION / NOT_TESTED / BLOCKED | No real or synthetic account reset/delete/migration run; external store-generation contract required for restore |
| Unknown in-place write/restoration | SYNTHETIC + EXPERIMENTAL_HOST | **BLOCKED: counterexample accepts old authority** |
| Overlapping native lifecycle allocations/writes | NOT_TESTED / BLOCKED | Scoped revocation does not reserve future incarnations across awaits; requires host transaction contract |
| Production Node + actual-entry Chromium | SYNTHETIC | Existing regression suites; no production changes |
| Other hosts/browsers, physical devices, multi-process and power loss | NOT_TESTED | No compatibility/durability claims |

## Security, maintenance and owner decisions

Imported/copied identity fields remain untrusted canonical metadata, never identity inputs. No imported script, URL, slash command or path becomes executable authority. All target lookup and lifecycle locators come from authenticated host-resolved storage. The synthetic visual payload remains the existing tiny allowlist, outside canonical JSONL. The patch is never imported by the production extension.

The guards add coupling to pinned native lifecycle internals and remain a disposable source patch. There is no required server plugin, permanent fork, namespace/schema release design, automatic migration/repair, group actor mapping, visual inheritance or asset persistence. Registry snapshots can grow and operations may lose visual availability permanently; recovery/quotas/garbage collection need a separately approved contract. Unknown writers, stale backups, overlapping lifecycle operations and cross-process writes remain blockers.

Owner decisions still needed: whether conservative permanent refusal is an acceptable release experience; how an explicitly approved recovery/adoption workflow would establish a new incarnation; which host integration/transaction capability is acceptable; and the restore/account-generation policy. This report's scoped/all-scope/store-wide choices are **engineering choices for the experiment**, not owner rulings. No Gate A verdict is supplied.


## Exact validation commands and results

All final host proof bytes were committed at `ca577c2da9fafb50210a1db3e2e416dc27a78854` before these runs. Later commits change only reports/evidence. Commands below ran from `/tmp/sillynovel-dyl43` with reviewed elevated execution for child processes, loopback listeners and Chromium; no dependency installation was performed.

```sh
node tests/probes/dyl42/source-inspection.mjs /tmp/SillyTavern-m12-review > docs/evidence/dyl43/source-inspection.json
node --check tests/probes/dyl43/lifecycle-campaign.mjs
node --check tests/probes/dyl28/host-probe.mjs
node --check /tmp/dyl43-patch-host/src/dyl27-storage.mjs
SN_DYL43=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl43-final-lifecycle
SN_DYL42=1 SN_DYL43=baseline SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl43-final-inherited
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-source-prefix.test.mjs tests/probes/dyl19/*.test.mjs > docs/evidence/dyl43/node-tests.txt 2>&1
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test tests/m1-reader-browser.test.mjs > docs/evidence/dyl43/browser-tests.txt 2>&1
git diff origin/main --check -- . ':!tests/probes/dyl43/host-lifecycle.patch'
git -c core.whitespace=-blank-at-eol,-blank-at-eof diff origin/main --check -- tests/probes/dyl43/host-lifecycle.patch
```

The full-branch default whitespace check flags the unified patch’s intentional single-space blank context lines and final blank context. The two exact diff checks above check ordinary files normally and exempt only those encoded patch blank-context rules; patch bytes remain identical to the frozen runtime evidence.

Final lifecycle: **38/38 checkpoints** (16 inherited DYL-28 + 22 new lifecycle checkpoints). Final inherited writers: **33/33** (16 DYL-28 + 17 DYL-42). These overlap and are not 71 independent lifecycle scenarios. Node **64/64** and actual-entry Chromium **24/24**, zero failed/skipped. Syntax, pinned source verification and diff checks pass. Runtime: Node v26.8.1 on Linux; headless Chromium 151.0.7922.34. Deterministic loopback provider only; no CI/provider/device/owner-experience claim.

[Lifecycle results](evidence/dyl43/results.json), [inherited writer results](evidence/dyl43/inherited-results.json), [Node output](evidence/dyl43/node-tests.txt), [Chromium output](evidence/dyl43/browser-tests.txt), [source inventory](evidence/dyl43/source-inspection.json), and [checksums](evidence/dyl43/SHA256SUMS) retain the evidence. The runner labels a successful campaign `PASS_WITH_BOUNDED_CHARACTER_CHAT_LIMITS`; its recommendation is REVISE, and the blocking counterexample is explicitly represented in the lifecycle checkpoint and report.

Development history: `/tmp/dyl43-dev-1` failed a harness expectation after restart because `accept-load` checks the now-missing client before catalog identity and correctly returned 403 `INVALID_CLIENT`, rather than expected 400 `INVALID_TARGET`. The assertion was corrected to distinguish CAS and load-check order. [Development failure record](evidence/dyl43/development-failure.json) retains exact failure and cleanup. `/tmp/dyl43-dev-2` passed 37 checkpoints; `/tmp/dyl43-baseline-dev` passed 33. These ran while proof sources were being edited and are not frozen evidence. Their commands used the same respective environment/runner arguments above with those output directory names. Initial restricted source inspection returned `spawnSync git EPERM`; rerunning with reviewed elevated execution verified the source. No host safety claim is based on that failed setup command.

## Frozen hashes and representative stored bytes

| Proof component | SHA-256 |
| --- | --- |
| `host-storage.mjs` | `77c5397c402e40bbc1580eb55e9f6df1559d1eaa7ab9ad5178e2ba86d4bd722a` |
| `host-visit.js` | `dd18e8e1b71aa3dc60e2e9e1c3e22f43064edab5f8435f5643acf0c24b2f9287` |
| `host-envelope.patch` | `e73905b37c59b20a6f9844050a4152e7c25a02d1bb6ccaa9e908968ae665996d` |
| `host-probe.mjs` | `552a82a4ff34a481b6a2d96271167102f53467fb74f5e231be0f09799c2769a0` |
| `dyl27-host-mount.patch` | `a30ddf37b47c99d3db0e575df339e8fe3411b97914551a1351f9d0d6e312c6aa` |
| `dyl42-host-writers.patch` | `af14a89522f954345914f71762b436f9ff4d9db2d3f1b22557eafd9b3d6f3b83` |
| `dyl42-writer-campaign.mjs` | `f436e5b4932fda523cfa3b03c060834a78de2f0c18cfbadc6510ab91e193e9fd` |
| `applied-host-storage.mjs` | `0c6b90a720120999177ce09aabd84be68fe323181dea7907492d5f1b91021861` |
| `dyl43-host-lifecycle.patch` | `232f3cef407229df54ad41e9026bde3fcc8076419dd1ac33f616c13fffd420c7` |
| `dyl43-lifecycle-campaign.mjs` | `05fceb5eb74b4eaa4a6045a99ca9a4a9b155246d0eb59a998838f8423f0b9571` |

| Actual stored example | Before SHA-256 | After SHA-256 | Meaning |
| --- | --- | --- | --- |
| Rename historical JSONL | `e8bc87f7d12056d1a19ca584f4a70aa9539a7a54665c0a553f86eae95e5bfca5` | `0d30510f894a3c0005de3f0e292fcca6369c9a4a3cae7a60c6734f2df1de0cb8` | Native history name rewrite changes bytes; old identity revoked |
| Rename visual record | `9e4fd893a2d619b5b4c2d412e9c4519aba3f4d745912ff2e9a338dcf383eb977` | `9e4fd893a2d619b5b4c2d412e9c4519aba3f4d745912ff2e9a338dcf383eb977` | Visual bytes unchanged |
| Data Maid restored JSONL | `6adcbdfcf5d0b7e7420c1d9e22f5aada2f8aa5f90bc3f5eb93cd2cd293e1ca98` | `6adcbdfcf5d0b7e7420c1d9e22f5aada2f8aa5f90bc3f5eb93cd2cd293e1ca98` | Exact bytes restored; disabled authority remains refused |
| Unknown unobserved replacement JSONL | `5012efc87f560dd8ddc7f7fd6b2286f381d815e22eda257c24cc7613c75f2c2f` | `5012efc87f560dd8ddc7f7fd6b2286f381d815e22eda257c24cc7613c75f2c2f` | Exact bytes plus old seal accepted: blocker |
| Pending finalization registry | `da14933e255f49c9fa7b1b21b2f5b10f75c6624a681ad40f63ce2c32971317ad` | `da14933e255f49c9fa7b1b21b2f5b10f75c6624a681ad40f63ce2c32971317ad` | Registry unchanged after restart |
| JSONL before failed save finalization | `458d55dcdb80e88e136197e950a2d118188b902675c7e965efe8ceff9d1bc71d` | `9083756b96dc2abaa970bdf558c3a32ddcf997fbca6e40b8db208ad4e4b67407` | Native save committed but store stays pending |

Final lifecycle run ID `3e61ad03-fdc8-48af-89d1-7dd3e3406356`; inherited run ID `3dbfad63-3d5e-4cfd-b41f-bea7ec18fbcd`. Both record `ownedRootRemoved`, `hostStopped`, `sourceCheckoutPresent` and `sourceStatusUnchanged` as true. Exact preparation-clone verification/removal is in [preparation-cleanup.json](evidence/dyl43/preparation-cleanup.json). No pre-existing temporary directory or data root was deleted.
