# DYL-44: Host-owned lifecycle reservations and write generations

**Recommendation: REVISE.** This test-only contract reserves all participating native writers in one authenticated store before routing, conservatively refuses competing operations, and separates canonical write generations from content revisions. It does not provide production persistence, automatic re-enrollment of revoked character scopes, unknown-writer exclusion, or a separately trusted store incarnation. Runtime results and frozen evidence are recorded below after validation.

## Baseline and authorization

Owner assignment: 2026-10-14 (America/Phoenix), bounded M1.2-J investigation only. [DYL-44](https://linear.app/devils17/issue/DYL-44/sillynovel-m12-j-prove-host-owned-lifecycle-reservations-and-write) was created in M1.2 after searching the SillyNovel project for an equivalent lifecycle issue. DYL-43 is a completed prerequisite; DYL-22/23 are related without changing their blockers. PR #17 was verified MERGED; DYL-43 was verified Done with REVISE retained. Its full issue, report, predecessor reports and experimental patches were read before implementation.

- Supplied checkout, left unchanged: `4688646861274d9b5c993e9c478628d84c700144`.
- Fetched starting main and PR #17 merge: `72314090ed74c90b1317745bf83f4838723e2dc2`.
- Pinned SillyTavern 1.19.0: `7e8663cd9c184a550b37238218bdd32c6efc68e9`.
- Dedicated managed worktree: `/home/dq/.codex/worktrees/lifecycle-generations/SillyNovel`; branch `research/dyl-44-lifecycle-generations`.
- Tested proof SHA and final pushed head: recorded in the validation section and PR/Linear handoff respectively.

No production extension file changes. DYL-24 remains the accepted session-only stage. DYL-22/23 stay blocked, M1.3/M2 remain unauthorized, **Gate A remains NOT_RUN**. The reservation policy is an experimental engineering choice, not an owner-approved release architecture.

## Trust boundary established before implementation

The chosen bound is one server process and one exclusive writer reservation per authenticated user store. Reserving `['*']` covers every source and destination locator, including destinations not yet chosen or created. This deliberately sacrifices unrelated-write availability to avoid a path-lock manager, multipart preparse identity guesses, and asynchronous filename-allocation races. Requests on another authenticated store have independent reservations. Authentication and CSRF remain native host middleware; client filenames are only native operation inputs and never identity authority.

| Category | Writers / rules |
| --- | --- |
| PARTICIPATING | Character `/create`, `/rename`, `/delete`, `/import`, `/edit-avatar`; character chat `/save`, `/import`, `/rename`, `/delete`; Data Maid `/delete`. Exact routes, case-insensitive/trailing-slash normalization, are listed in the patch. Reservations precede native route execution, directory creation and multipart processing. |
| PARTICIPATING, runtime subset | Native character create/rename/delete; JSON character replacement; JSONL chat import; normal/no-op/changed chat save, save-as/branch, chat rename/delete/recreate; Data Maid token-authorized unlink. Barriers are placed after native asynchronous card reads/image processing, before awaited recursive delete, and before awaited Data Maid unlink. |
| REFUSED visuals | Revoked/recreated character scopes, renamed character destinations, character duplicates, all groups, existing unregistered chats, missing/corrupt registries, unresolved reservation/finalization. Native reading remains available. An unresolved writer reservation also refuses participating native mutations rather than silently allowing competing ownership changes. |
| UNKNOWN / OUTSIDE CONTRACT | Uninstrumented character field edits/merge-attributes/duplicate, plugins, direct filesystem edits, other processes, account reset/delete, legacy/startup migration, restore tools and all other routes. Group files remain outside the character contract and never gain visual authority. |
| SOURCE_INSPECTION / NOT_TESTED | Non-JSON character formats, avatar-edit format behavior, multi-output JSON chat converters and their partial native successes, platform-specific filesystem behavior. Sharing a guarded route does not certify each native format. |

A production guarantee would require all canonical ownership writers to participate or a demonstrated mechanism preventing excluded writes; one process; non-adversarial storage; explicit account/migration/restore transactions; and a durable host authority outside the restorable namespace (or mandatory refusal and re-enrollment after restore). These restrictions are not enforced by this disposable patch. Watchers, timestamps, polling and hashes cannot prove an arbitrarily fast unseen write/restore did not happen.

## Minimal protocol

1. After native authentication, resolve `request.user.directories.root`. Before any participating route, reject an active request for that root or an unresolved disk reservation. Missing/corrupt state refuses; initial bootstrap is allowed only before the experimental namespace exists.
2. Allocate a host UUID `operationId`, increment the independent reservation serial, and atomically persist `{storeIncarnation, serial, pending:{operationId,operation,reservedLocators:['*']}}` to `sillynovel-dyl44-reservation.json` under that user root. File fsync precedes rename. A failure prevents the native route from starting.
3. Install process-local ownership in `AsyncLocalStorage` and an active-writer map. Native shared chat mutation and scope allocation validate that exact owner against the persisted operation ID. Deterministic async barriers revalidate ownership after waiting. A loser has no reservation and never reaches native mutation.
4. While pending, visual catalog/load/accept/read/CAS/target validation refuses the store. Existing DYL-43 lifecycle hooks durably revoke source/destination scopes or cleanup chats before mutation. Import retains conservative all-existing-scope revocation. Character creation now also revokes a registered destination before any canonical directory/card work; it cannot silently overwrite a registered scope.
5. Native code performs its actual canonical operation. Shared chat mutation retains its own durable registry pending intent, updates the seal and write generation, then finalizes that catalog. Lifecycle revocation remains permanent; there is no inferred rollback from matching bytes.
6. At native response end, verify operation ownership and clear only the reservation. Never restore an identity, generation or record. On native failure, existing tombstones/pending catalog remain; clearing the route reservation does not reverse them. Failure clearing the reservation leaves the disk pending marker. A response may report native success even when visual finalization is unavailable; that is not visual success.
7. No close/abort handler releases an unfinished operation. Restart loses process-local clients, but keeps unresolved disk intent and refuses affected authority and further participating writers. No automatic repair exists.

The operation serial is diagnostic reservation ordering, **not** source revision or chat identity. The `res.end` boundary is bounded to the inspected native handlers, which finish relevant canonical work before sending their response. General deferred/background canonical writers must explicitly join the protocol; response completion alone cannot certify them.

## Ten distinct identity and revision concepts

| Concept | Representation and behavior |
| --- | --- |
| Store identity | Existing host UUID `catalog.storeId`, bound to authenticated root; never accepted as an owner override. |
| Store incarnation | Separate UUID in reservation state, bound into accepted load evidence. It is local and restorable, therefore **not independently trusted against whole-root rollback**. External authority is still BLOCKED. |
| Scope identity | Existing random `scopeId`, allocated after native create. |
| Scope incarnation | Integer `scope.incarnation`, starts 1; scope lifecycle revocation advances it and disables the scope. No automatic rebinding/re-enrollment. Import collision may permanently disable directly; a disabled incarnation never regains authority. |
| Chat identity | Existing random `chatId`, independent per new save/import/copy/branch. Native chat rename preserves it. |
| Chat incarnation | Separate random `chat.incarnation`, allocated at chat creation. Delete/recreate gets a fresh ID and incarnation; ordinary writes preserve both. |
| Write generation | `chat.writeGeneration`, starts 1 at first finalized canonical write, advances on each participating registered chat mutation even when bytes match. Pending failure refuses instead of inventing a completed generation. |
| Source revision | Existing `sourceRevision`, advances only when committed transcript hash changes, initialized 1. Hash comparison is only content equality, never lifecycle identity. |
| Activation visit | Existing authenticated `clientId`, ordered sequence, host `loadRequestId`, and random `viewToken`. A→B→A creates a new visit; restart invalidates in-memory clients. |
| Visual revision | Existing independent CAS counter in `<chatId>.json`; canonical writes never advance it. |

The wire envelope remains DYL-28's small identity/source-revision shape. Its unpredictable host-issued load ID now names additional **server-owned** evidence `[storeIncarnation, scopeIncarnation, chatIncarnation, writeGeneration]`. Acceptance, visual read/CAS and activation return compare that evidence with current state. The client cannot submit or edit the evidence. Source revision and visit checks retain their separate failure ordering. Consumed tickets retain generation evidence for the active visit beyond the unaccepted-ticket TTL; a later visit deletes the prior accepted evidence. The inherited bounded capacity is not a production session-retention policy.

## Operation comparison

| Operation | Reservation | Identity/incarnation outcome | Write/source revision | Old visual authority | Runtime evidence |
| --- | --- | --- | --- | --- | --- |
| Changed chat save | Whole authenticated store | Both chat identities preserved | Write +1; source +1 | Refused; fresh load required | EXPERIMENTAL_HOST + inherited NATIVE_HOST_UI |
| Identical chat save / atomic replacement | Whole store | Identity/incarnation preserved | Write +1; source unchanged | Old generation refused; record retained | EXPERIMENTAL_HOST |
| Chat rename, unchanged bytes | Whole store including source/destination | Chat ID/incarnation preserved; locator moves | Write +1; source unchanged | Old locator/load/generation refused | EXPERIMENTAL_HOST |
| Chat delete then same-byte recreation | Whole store for each operation | Old tombstone; new ID/incarnation | New write/source start 1 | Old held CAS/load refused | EXPERIMENTAL_HOST |
| Fresh JSONL import | Whole store | Fresh ID/incarnation in registered scope | Write/source 1 | No inherited visual record | EXPERIMENTAL_HOST + inherited NATIVE_HOST_UI |
| Import replacing registered timestamp path | Whole store | Scope permanently disabled | No replacement authority advertised | Refused even for identical bytes | EXPERIMENTAL_HOST |
| Save-as / branch | Whole store | Independent ID/incarnation | Independent write/source 1 | No parent record inheritance | Inherited NATIVE_HOST_UI function path |
| Character rename | Whole store, source and future destination covered | Source/existing destination revoked; destination not enrolled | Scope incarnation advances; no claimed new chat generation | Permanently refused | EXPERIMENTAL_HOST concurrency + inherited NATIVE_HOST_UI rename |
| Character delete/recreate | Whole store; overlap rejected before recreate | Old scope revoked; recreated scope not enrolled | Scope generation records revocation | Refused after restart | EXPERIMENTAL_HOST |
| JSON character import | Whole store before multipart/native await | All existing scopes revoked; no import enrollment | Revocation; no claimed content continuity | Refused | EXPERIMENTAL_HOST |
| Data Maid cleanup / recreate | Whole store; user token still checked natively | Matching old chat disabled | No new authority inferred from same bytes | Refused | EXPERIMENTAL_HOST; synthetic orphan setup |
| Unknown write/restore or identical copy | None | Old local identity/evidence can appear unchanged | No observed advance | Counterexample accepts old authority | SYNTHETIC mutation + EXPERIMENTAL_HOST validation |
| Whole-root restore | Bypasses protocol and restores both files | Local store/chat generations can roll back | Old generation restored | Old durable record may be accepted under a fresh visit | SYNTHETIC restore + EXPERIMENTAL_HOST; safety BLOCKED |

## Failure/restart contract

| Boundary | Expected persisted result | Availability and evidence |
| --- | --- | --- |
| F1 reservation write fails | No new intent, no canonical mutation, previous authority intact | Injected error and real user-root EACCES; native operation refuses before routing |
| F2 reservation committed, native mutation fails | Scoped revocation or registry pending remains; no old identity reenable | Native rename fault after revocation; restart refusal. Clearing outer reservation does not undo revocation |
| F3 native write committed, reservation finalization fails | Reservation remains pending even if inner registry completed | Identical canonical save; old read/CAS refused, restart preserves exact intent, subsequent writer returns `UNRESOLVED_RESERVATION` |
| Process stopped during native await | Disk reservation remains pending | Actual owned host stop while rename waits; restart never silently releases it. Process-stop evidence, not machine crash/power loss |
| F4 missing/corrupt reservation or registry | No reconstruction from filenames/hashes | Native transcript still readable without identity. Inherited missing/corrupt registry checks retained |
| F5 partial multi-file operation | Revoked source/destination authority; no apparent committed collection | Native rename fault after new card write and inherited delete cleanup permission failure |

Test-only fault resets explicitly restore only the harness's own injected state to isolate later cases. They are not recovery APIs or proof that resetting a pending marker is safe. Parent-directory fsync, disk-full/fsync faults, crash-consistent multi-file transactions and multiple server processes are NOT_TESTED.

## Restore authority analysis

A counter in the same restored user root cannot distinguish a stale snapshot. The minimum additional contract would bind authenticated store ownership to an incarnation held outside that root, check it at load/accept/read/CAS, and advance it **before** an authorized restore publishes canonical files. Alternatively, restore must force refusal until explicit re-enrollment establishes new authority. A missing external authority must refuse, never initialize from restored local files. A separate file whose access/backup lifecycle is not independently controlled is not sufficient.

This task chooses no production architecture and implements no restore service. Native backup/restore transaction, protection of external authority against rollback, and account-delete/recreation binding remain BLOCKED. The synthetic whole-root rollback is a counterexample; a fresh-visit record acceptance after rollback is not restore safety. Ordinary process restart is reported separately.

## Evidence and reproduction

The DYL-28 harness applies mount/envelope, DYL-42 writers, DYL-43 invalidation, then the DYL-44 overlay. All actual host paths come from a disposable clone of the exact pin; installed host dependencies are reused, not installed or changed. Each run has a unique marked data root, original programmatically generated fixtures, two synthetic authenticated accounts, isolated Chromium contexts, loopback-only host/responder listeners, and owned-process shutdown/root cleanup. No installed-host data, real chats, private cards, provider credentials or paid services are used.

`NATIVE_HOST_UI` means the inherited real browser called native functions or clicked the controls described in those inherited reports. New concurrency cases call actual authenticated native endpoints; they are EXPERIMENTAL_HOST with explicitly synthetic barrier/fault instrumentation, not UI menu coverage. Unknown-writer and whole-root rollback controls are counterexamples, not safety passes. Actual records and hashes are retained in evidence rather than inferred from HTTP success.

## Required decisions and smallest next task

The owner must decide whether store-wide writer contention and permanent visual refusal are an acceptable basis for another proof; what explicit re-enrollment/recovery should mean; which supported host integration can guarantee writer participation; and who owns a non-restorable store-incarnation authority. No such approval is inferred here.

Recommend one separately authorized proof of explicit re-enrollment for a revoked/recreated character scope under the same reservation, with host-approved source/destination semantics and an external store-incarnation contract. Do not expand into assets, groups, production storage, upstream publication or the rest of the roadmap. Technical feasibility for the exercised participating operations does not resolve these release blockers; the overall recommendation remains **REVISE**.
