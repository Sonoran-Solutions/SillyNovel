# Upstream host capability: technical support and owner decision package

**DYL-48 / M1.2-N — PROPOSED; NOT_SUBMITTED.** Internal support for the [public request](UPSTREAM_HOST_CAPABILITY_REQUEST.md). Names and payloads in section C are **PROPOSED**, not SillyTavern APIs. No host implementation, production persistence or external engagement is authorized.

Starting fetched SillyNovel main: `f3ff9a4b61fa31df3e57cf3367f0dcf4860f3fe6`. [PR #21](https://github.com/Sonoran-Solutions/SillyNovel/pull/21) merged 2026-10-15 at 18:57:13Z; Linear DYL-47 is Done. Its complete [architecture checkpoint](M1_STORAGE_ARCHITECTURE_CHECKPOINT.md) is the baseline; its In Review wording records its original handoff. Project-scoped upstream-task search found no equivalent; the assigned identifier is [DYL-48](https://linear.app/devils17/issue/DYL-48/sillynovel-m12-n-prepare-a-maintainer-ready-upstream-host-capability), with DYL-47 as completed prerequisite and DYL-25/22/23 related.

## A. Existing host surfaces and prior proposals

### Research basis

Read-only inspection on **2026-10-15**: official `release` at `06bde939fb1e9c4c8d8641d810f0a916b5bce127` (commit dated 2026-09-14), package version **1.19.0**; current `staging` at `ad29cbda62e92f145e44d7a10398a38af22ca986`, also package version 1.19.0. The context, metadata/debounce and server chat-save functions below were also read at that staging SHA and retain the described gaps. This is source inspection, not a runtime compatibility result. The earlier experimental pin is different: `7e8663cd9c184a550b37238218bdd32c6efc68e9`.

The official web guides expose no publication/update date; record access date rather than inventing one. Source URLs below freeze inspected behavior. “Documented” describes an advertised surface; internal source does not establish an API stability commitment. No matching supported foundation was found in this bounded research; that is not proof that no mechanism or unpublished plan exists.

| Surface / official evidence | What exists | Necessary guarantee not established / status |
| --- | --- | --- |
| [UI guide: state management](https://docs.sillytavern.app/for-contributors/writing-extensions/#state-management) | Namespaced JSON settings, chat metadata and character extension fields. | Documented; no independent per-conversation conditional record commit. |
| [Context source](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/scripts/st-context.js#L115-L165) | `characterId` is the selected array index; `chatId` follows character `.chat` or group `.chat_id`; exposes current data and savers. | Public context surface, implementation-derived locator semantics; no durable store/account/conversation incarnation or accepted-load token found here. |
| [Metadata debounce](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/scripts/extensions.js#L89-L112) and [save helper](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/script.js#L9408-L9439) | Debounce checks group/index, then re-reads active context; save helper waits, selects current saver, catches/logs failures. | Implementation of public helper; neither chat-target capture nor typed durable receipt follows from a fulfilled promise. |
| [Chat save](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/script.js#L7393-L7454), [server route](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/src/endpoints/chats.js#L524-L576) and [integrity guard](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/src/endpoints/chats.js#L332-L369) | Whole-array JSONL save under authenticated user directories; optional integrity guard; `{ok:true}`, integrity 400, generic 500. | Internal endpoint, not extension-record API. Integrity equality is not a changing record revision; acknowledgement names no extension revision. Existing atomic file writing is not proof of cross-resource transaction/restore safety. |
| [AccountStorage](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/scripts/util/AccountStorage.js) and [settings endpoint](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/src/endpoints/settings.js#L204-L216) | String key/value account state uses debounced settings persistence; server writes settings blob. | Context-exposed/internal implementation; not an independent chat identity or record-CAS service. |
| [Files endpoint](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/src/endpoints/files.js#L27-L76) | Validated-name base64 upload into authenticated user's files, deletion by relative path. | Internal generic file transport exists; does not establish immutable extension ownership or conversation lifecycle. Storage is not absent altogether. |
| [Events guide](https://docs.sillytavern.app/for-contributors/writing-extensions/#events) and [event definitions](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/scripts/events.js) | Chat/message/character notifications; payloads vary by emitter. | Documented notifications, not a server transaction fence over all writers. Do not infer pre-mutation ordering from an event name. |
| [Manifest/version and import guidance](https://docs.sillytavern.app/for-contributors/writing-extensions/#manifestjson) | Minimum client version and extension version fields; context preferred over unstable direct module imports. | Documented compatibility controls; no negotiated version of this proposed persistence contract. |
| [Server plugin guide](https://docs.sillytavern.app/for-contributors/server-plugins/) and [loader](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/src/plugin-loader.js) | Opt-in unsandboxed server code and plugin routers. | Documented mechanism, not native identity/writer coverage. Official UI-extension submission policy excludes required server plugins. |
| [Feature-request template](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/.github/ISSUE_TEMPLATE/feature-request.yml) and [contribution guide](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/CONTRIBUTING.md) | Official feature issue form asks about duplicates, solution, alternatives and priority. Contributions normally target staging; small testable changes preferred. | Procedure only; no acceptance, staffing or schedule implied. Owner must choose testing commitment when adapting form. |

### Duplicate and related-work search

GitHub REST issue search covered issues **and PRs** using `repo:SillyTavern/SillyTavern` with `"extension" "storage"`, `"chat" "uuid"`, `"metadata" "save"`, and `"extension" "state" "identity"`. Broad searches returned 94, 16, 83 and 4 results respectively; only the first 30 of the two large sets were inspected, all 16/4 of the smaller sets. GraphQL Discussion searches for `extension storage` and `chat identity` returned 12 and 3 titles; none presented an equivalent foundation. This is a bounded relevance search, not exhaustive certification. Read full bodies of the following relevant issues/PRs, plus comments on #5265/#5269. Dates below are API `updated_at`, not promises of current progress.

| Finding | Status/date checked | Overlap and consequence |
| --- | --- | --- |
| [#5265 incremental chat sync](https://github.com/SillyTavern/SillyTavern/issues/5265) | Open; updated 2026-09-04; created 2026-03-09 | Proposes base revisions and metadata isolation. Closest conceptual overlap. Comments discuss memory cost of tracking diffs. **Recommend asking in this existing thread first, after owner approval**, whether independent extension records belong there; avoid a parallel generic save API request. No durable store/incarnation/lifecycle contract is established by the proposal. |
| [#5865 multi-window leases](https://github.com/SillyTavern/SillyTavern/pull/5865) | Open/unmerged; updated 2026-08-19 | Proposes sessions, leases and revisions; description says server sessions are in memory and lease revisions can reset. Relevant coordination work, not released durable conversation identity/CAS. Do not adopt its claimed tests as our evidence. |
| [#6122 queued saves](https://github.com/SillyTavern/SillyTavern/pull/6122) | Open/unmerged; updated 2026-10-10 | Immutable queued snapshots and failure propagation; description explicitly limits queue to one page and leaves group writes separate. Does not provide independent extension-state CAS. |
| [#6032 same-character switching](https://github.com/SillyTavern/SillyTavern/issues/6032) | Open; updated 2026-10-04 | User-reported target/metadata mismatch, with third-party extensions and a local patch disclosed. Context for lifecycle questions, **not our reproduced defect or proof of root cause**. |
| [#5943 branch integrity fix](https://github.com/SillyTavern/SillyTavern/pull/5943) | Merged 2026-08-19 | Fresh branch/checkpoint integrity slugs already exist in inspected `bookmarks.js`. Acknowledge this improvement; it does not establish record revisions, authenticated store identity or restore semantics. |
| [#5269 server-side extension assets](https://github.com/SillyTavern/SillyTavern/issues/5269) | Open; updated 2026-04-19 | Relevant later asset request. A comment questions architectural cost in a frontend-first application. Does not establish immutable revisions or state lifecycle. Revisit existing thread before a new asset proposal. |

No upstream issue/discussion/comment/reaction/PR was created or modified. No maintainer contact occurred. Search results show adjacent work, not established demand for this exact API.

## B. Required invariants — PROPOSED

The small public surface must rest on these host guarantees. These are acceptance requirements for SillyNovel trust, not a prescribed host implementation.

| Invariant | Required behavior |
| --- | --- |
| Authenticated store binding | Server derives account from authentication. Opaque store identity includes non-reusable account/store incarnation; same username after recreation cannot inherit ownership. Every operation validates binding; no client owner override. |
| Conversation incarnation | Host identity survives supported rename; delete/recreate is fresh even with identical name/bytes. Card recreation cannot adopt old conversation records. Copies, branches and imports get fresh identities; imported IDs are untrusted. |
| Separate revision domains | Source revision identifies the loaded transcript snapshot; extension-record revision changes only on record commit. Native mutation generation changes even for an identical transcript write; equal bytes do not prove equal lifecycle history. These may be opaque host evidence rather than three exposed counters. |
| Activation/load correspondence | Each client visit has new authority, including A → B → A. Host binds accepted load to exact conversation/source/generation; delayed loads cannot replace current native state. Client checks visit/source again before rendering responses. |
| Conditional targeted update | Namespace + exact handle + expected record revision checked atomically with commit. Create expects revision 0; missing record reads revision 0/null. Concurrent losers change nothing; no implicit merge. |
| Native lifecycle invalidation | Every supported writer participates before conflicting canonical mutation and finalizes authoritative generation afterward. An event after mutation is insufficient. A rename can preserve identity while invalidating old handles. |
| Safe uncertain outcomes | Partial/interrupted operations retain refusal until host-owned reconciliation proves a forward outcome. Timeouts, restart, matching hashes or HTTP success never recreate authority. |
| No automatic adoption | No mapping by names, indices, paths, byte equality or imported IDs. Explicit supported migration may allocate fresh IDs and validate source; cannot revive revoked authority. |
| Ownership separation | Host owns auth, identity, lifecycle, revisions, storage and recovery. SillyNovel owns scene schemas, rendering, manual locks/controls, source-scoped choices, reducers and UX. No scene/model parsing in core. |

Native writers include ordinary saves, imports/converters, branch/copy/bookmark, rename/delete, character/card scope changes, cleanup, startup migration and account operations. Either include each relevant writer in a maintained boundary or refuse persistent authority for affected scopes. Unknown filesystem/plugin writers are outside support; ideally prevent bypass where the host controls access. An unsandboxed plugin or same-OS-principal operator cannot be made trustworthy by watcher/hash checks. An explicit unsupported-writer assumption is necessary, not universal exclusion claimed from incomplete observation.

## C. Illustrative API sketch — entirely PROPOSED

Framework-neutral exchange examples. **All operation names, fields, tokens, enum names and namespace labels below are PROPOSED**, not existing endpoints or APIs. `example-ui` is an arbitrary extension namespace, not a hardcoded SillyNovel core feature. Opaque example tokens convey no actual authority. No URLs or filesystem paths are accepted. Authentication/session protection uses the host's existing security boundary; opaque IDs alone are not authorization. The host validates namespace, JSON shape, size/depth, schema envelope and ownership; scene-specific schema remains the extension's responsibility.

**PROPOSED capability negotiation** — call operation `capabilities`; the advertised version means the full stated semantics, not just functions with matching names:

```json
{
  "capability": "conversation-extension-state",
  "version": 1,
  "scopeKinds": ["character"],
  "maxRecordBytes": 16384,
  "guarantees": ["authenticated-incarnation", "accepted-load", "native-lifecycle", "targeted-cas", "durable-receipt", "safe-recovery"]
}
```

The 16 KiB value is an illustrative limit, not an approved quota. Absent/incompatible capability returns UNSUPPORTED. Groups/temporary chats refuse rather than fabricating character handles. Record quotas and retention require maintainer design.

**PROPOSED current handle** — operation `currentConversation` returns only after the host accepts the corresponding native load for this client visit:

```json
{
  "handle": {
    "storeId": "store-incarnation-a",
    "conversationId": "conversation-incarnation-a",
    "visitToken": "visit-a-2",
    "loadToken": "accepted-load-a-2",
    "sourceRevision": "source-7",
    "generation": "generation-11"
  }
}
```

Host retains authenticated client/visit correspondence. Switching a client invalidates its old visit before work can commit; another client's active chat does not redefine this handle. On restart visits expire. Tokens are opaque and host-issued; submitting a forged combination fails. No client-selected identity enrollment.

**PROPOSED read** — operation `readRecord`, request `{ "handle": <the exact object above>, "namespace": "example-ui" }` (metanotation, not literal JSON); response:

```json
{
  "recordRevision": 3,
  "record": { "schemaVersion": 1, "panelPlacement": "bottom" }
}
```

Read validates the same identity/source/generation/visit. Revision 3 is independent of source-7 and generation-11. All responses are logically bound to their request; clients retain the captured handle and reject late UI application.

**PROPOSED conditional update** — operation `compareAndSwapRecord`:

```json
{
  "handle": {
    "storeId": "store-incarnation-a",
    "conversationId": "conversation-incarnation-a",
    "visitToken": "visit-a-2",
    "loadToken": "accepted-load-a-2",
    "sourceRevision": "source-7",
    "generation": "generation-11"
  },
  "namespace": "example-ui",
  "expectedRecordRevision": 3,
  "operationId": "client-request-a-4",
  "record": { "schemaVersion": 1, "panelPlacement": "top" }
}
```

**PROPOSED successful receipt**, only after durable commit:

```json
{
  "outcome": "VERIFIED_COMMITTED",
  "operationId": "client-request-a-4",
  "storeId": "store-incarnation-a",
  "conversationId": "conversation-incarnation-a",
  "namespace": "example-ui",
  "recordRevision": 4
}
```

**PROPOSED refusal alternatives** (one response per request):

```json
[
  { "error": "CONFLICT", "currentRecordRevision": 4, "mutation": "none" },
  { "error": "STALE_TARGET", "mutation": "none" }
]
```

`currentRecordRevision` is disclosed only after ownership validation. `CONFLICT` never merges. CAS does not change canonical bytes, source revision or native generation. Lifecycle racing CAS has a defined serialization point: if invalidation wins, CAS refuses; if commit wins, its receipt remains an exact commit fact and the UI discards it after switching. A commit is never redirected to current context.

**PROPOSED lifecycle notice**, supplemental to server enforcement:

```json
{
  "event": "conversationAuthorityInvalidated",
  "storeId": "store-incarnation-a",
  "conversationId": "conversation-incarnation-a",
  "generation": "generation-12",
  "reason": "native-rename"
}
```

Old generation-11 handles now fail. The next accepted load can preserve conversation identity with fresh load/visit evidence. A copy/import/branch instead allocates a new conversation identity and returns an empty record. Notice delivery need not be reliable for stale-write rejection: the server performs authoritative checks. Cancellation alone never grants safety.

For lost acknowledgement, the **PROPOSED** `operationStatus(operationId)` returns the exact bound receipt or an explicit unresolved outcome, under authenticated ownership. Deduplication binds the operation ID to account, store incarnation, target, namespace and full original request; reuse with different content refuses. A duplicate may return its original receipt but never repeats a write under a stale handle. Receipt retention/expiry must be documented; unavailable evidence yields INDETERMINATE, not proof of abort or permission to retry blindly.

## D. Error and recovery semantics — PROPOSED

The following are semantic outcomes; only committed/refusal categories need become public codes. Host-internal recovery classifications need not be exposed as enums or leak internal paths.

| Semantic state | Minimum contract and recovery |
| --- | --- |
| VERIFIED_COMMITTED | Durable exact target/namespace/revision receipt; not just HTTP 2xx. Host must document durability and supported deployment assumptions, including crash/restart boundaries. |
| VERIFIED_CLEAN_ABORT | Durable evidence proves no canonical/record mutation, with forward finalization if generations advanced. Report original failure; never decrement authority. Ordinary HTTP error is not this proof. |
| VERIFIED_REVOCATION | Authority was durably revoked; old handles stay invalid even if the native operation failed. Healthy unrelated scopes may resume if proven safe; do not reenable old identity. |
| INDETERMINATE | Commit/abort cannot be verified, partial canonical effect exists, or acknowledgement cannot be resolved. Preserve unsaved edit and old stored bytes; refuse affected persistence until explicit host reconciliation. No timeout/reset adoption. |
| STALE_TARGET | Wrong visit/load/source/generation or revoked/recreated target: no mutation. Obtain a fresh accepted handle; never replay old source-scoped choices automatically. |
| CONFLICT | Expected record revision no longer matches: no mutation. Explicit reload/review; no last-writer-wins overwrite. |
| UNSUPPORTED | Capability/version/scope absent: use unsaved session visuals; no metadata/browser/plugin fallback inferred. |
| AUTHORITY_UNAVAILABLE | Missing, corrupt or mismatched identity/restore authority: refuse persistence; supported host-admin recovery or fresh migration only. |
| IO_ERROR / INVALID_RECORD | Distinguish storage failure from rejected input, while separately stating whether outcome is known. An I/O error after commit may be INDETERMINATE; never claim no mutation merely from the error type. |

A successful HTTP response alone does not prove a specific visual revision committed. Match receipt to captured target, namespace, operation and revision; recheck UI visit/source ownership before applying it. Keep native text reading/replying usable on visual-store failure. Refuse native writes only where proceeding would compound an indeterminate canonical transaction.

Backup/restore needs a declared source of truth. Coherent restoration must bind canonical data, identities, records and transaction authority to a consistent generation, or revoke and explicitly migrate to fresh identities. A restored user root cannot silently roll back separately trusted authority. Missing authority must not bootstrap from existing names/content. No hostile rollback of every trust boundary is solved here; operator assumptions must be explicit. DYL-46's independent witness, receipts, locks and directory layout are experimental mechanisms, not required production structures.

## E. What the experimental writer evidence establishes

**EXPERIMENTALLY_PROVEN**, never SUPPORTED_NOW: disposable patched SillyTavern **1.19.0** at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, participating writer paths only. No campaign rerun for DYL-48.

| Investigation / report | Established within its declared scope | Remaining ceiling |
| --- | --- | --- |
| [DYL-26](M1_HOST_STORAGE_SPIKE.md), [27](M1_NATIVE_IDENTITY_ACTIVATION.md), [28](M1_NATIVE_LOAD_ENVELOPE.md) | Independent targeted CAS, host identities, visit and exact load/source correspondence, delayed A → B → A rejection. | Patched host; no supported API or production migration. |
| [DYL-42 writers](M1_NATIVE_WRITER_COVERAGE.md) | Selected native saves, imports, copy/branch and source revisions; fresh identities/no inherited records; groups refused. | Some converters, bookmark menus, startup/account paths were inspection-only or NOT_TESTED. Native-function invocation is not proof every UI menu ran. |
| [DYL-43 lifecycle](M1_NATIVE_LIFECYCLE_INVALIDATION.md) | Tested rename/delete/recreation, selected Data Maid cleanup and registry failure refusal. | Bounded paths/faults, not universal native writer integration. |
| [DYL-44 generations](M1_NATIVE_LIFECYCLE_GENERATIONS.md) | Concurrent participating operations serialized; identical writes preserve source revision but advance generation; stale authority rejected. | Local generations alone were rolled back by restored roots; unknown same-byte writers remained unsafe. |
| [DYL-45 authority](M1_EXTERNAL_STORE_AUTHORITY.md) | Separately retained test authority detects tested root rollback; explicit fresh re-enrollment, two-account binding. | Does not protect rollback of that authority itself or solve account migration. |
| [DYL-46 final re-review](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md#pr-20-re-review-corrections--2026-10-15) | Attested undispatched clean abort and completed revocation; durable observed-drift refusal; selected restart/restore/finalization faults. | Partial native writes, interrupted validation and some finalization failures keep conservative whole-store refusal. Unknown writes restored before observation remain an unsafe counterexample. |

The latest report supersedes earlier failed submissions; do not cite obsolete prefixes as full passes. Final campaign counts overlap; they are not universal writer coverage. Its separate authority and validation witness were retained outside synthetic user-root snapshots. Privileged resets of both authorities isolate independent test episodes **after** refusal/restart checks; they are not a production recovery service. No cross-process, power-loss, real-provider, physical-device or production-deployment guarantee was established. Full reproduction lives in those reports, not the public draft.

## F. Smallest viable implementation sequence — maintainer consideration only

1. **Confirm fit and scope.** Ask whether an existing supported seam solves this; coordinate with #5265/#5865/#6122. Agree on single-character chats, unsupported writers, durability/recovery assumptions and record size. Review independently of any asset work.
2. **Establish host identity and migration.** Allocate authenticated account/store and conversation incarnations without rewriting card identity from names. Define legacy chat enrollment, collision, deletion, account reset and rename semantics while preserving existing formats. The host chooses registry, database or other source of truth.
3. **Complete participating native lifecycle/load contract.** Inventory every supported writer, centralize or otherwise enforce pre-mutation invalidation and generation transitions, bind native loaded snapshots to activation. Include no-op writes, copy/import/branch, cleanup and startup paths. Separately review writer families; do not advertise completeness while unhandled writers can mutate supported scopes.
4. **Add independent record read/CAS/receipts.** Validate bounded JSON, namespace and account; atomically enforce expected revision and authority; preserve canonical bytes. Document public capability version, support matrix, downgrade and receipt retention. Review separately from transcript delta sync.
5. **Finish failure/recovery and acceptance before trust.** Define interrupted/partial outcomes, same-host consistent backup/restore and explicit administrator recovery; measure latency/contention/memory with realistic record/chat sizes. Avoid requiring whole-transcript cloning or synchronous per-read fsync merely because the experiment used them. Require every declared invariant and acceptance row before applications trust persistence.

These can be separate small reviews, following official contribution guidance; no implementation is started. API additions must coexist with old extensions/hosts, preserve chat/card formats and avoid translating ordinary legacy saves into silent record overwrites. Stable capability semantics require maintained native-call-site tests and cross-version migration checks. A functionally partial API can be useful for review but **does not authorize SillyNovel production persistence**, DYL-22/23, M1.3, M2 or Gate A.

### Separately discussable later capabilities

A brief raster follow-up could request host-issued immutable user-scoped asset revisions, decoded-type/dimension validation, quotas, digest readback and reference-safe removal. Coordinate first with #5269. No formats/limits are approved and no complete asset API is specified here. Separate proposals can cover visual-record/asset bundle export/import, migration tools, group identity and cross-device/server portability. Basic coherent same-host restore/refusal semantics remain foundational; richer backup tooling and portability can be later. State-only support does not satisfy the existing asset and release gates in [DYL-47](M1_STORAGE_ARCHITECTURE_CHECKPOINT.md).

## G. Proposed host acceptance matrix — NOT_RUN

These are future host-level acceptance criteria, not new tests or claims. Use public synthetic data. Verify exact stored record and canonical bytes alongside receipts; HTTP status alone is insufficient.

| Scenario | Required observation |
| --- | --- |
| Two authenticated users | Identical labels and forged IDs cannot read/write another account; account recreation gets fresh store incarnation. |
| Two conversations | Independent records/revisions; extension update changes no canonical chat/card/lore/persona/connection bytes. |
| Same-name character recreation | Old scope/chat records remain revoked; matching names/bytes cannot adopt them. |
| A → B → A activation | Fresh visit/load evidence on second A; held first-A read/CAS cannot authorize it. |
| Concurrent conditional writes | One commit at expected revision; loser CONFLICT/no mutation; namespaces remain separate. |
| Delayed stale response | Old response cannot replace native loaded source or current extension UI; a prior committed receipt remains only a commit fact. |
| Identical transcript write | Source revision may stay equal; native generation advances; old handles refuse. |
| Native rename | Conversation identity preserved where supported; old handles invalidated before mutation; fresh load corresponds to new locator. |
| Copy/import/branch | New identities and empty records, including identical bytes/forged imported identity; no automatic inheritance. |
| Interrupted transaction | Pending authority survives restart; durable receipt resolves exact outcome or explicit INDETERMINATE. |
| Partial native write | Never classified clean abort from unchanged transcript; affected persistence refuses; safe text access remains. |
| Unsupported writer | Known excluded mutation path refuses persistent authority; explicitly demonstrate unknown-writer limit without calling it a pass. |
| Backup/restore mismatch | Restored canonical/identity/record data cannot revive old authority; mismatch refuses until supported coherent recovery/fresh migration. |

The detailed [DYL-46 report](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md) is reproduction evidence for the bounded experiment only. A production host suite must cover its actual implementation and declared supported writers/topologies; transplanting synthetic counts is insufficient.

## H. Owner recommendation and decision package

**Readiness:** public draft is suitable for owner review and, after explicit approval and a freshness check, maintainer discussion. It is not ready for automatic publication. No change to DYL-47's architecture ranking is recommended: upstream capability remains PROPOSED, session-only remains interim/fallback; required plugin or service is not selected. This package narrows the *first conversation*, not the production contract or release gates.

**Preferred venue:** start with a short contribution to the existing [#5265 feature-request issue](https://github.com/SillyTavern/SillyTavern/issues/5265), after owner approval, asking whether this narrower metadata/identity case belongs there. Its overlap warrants coordination before a duplicate. If maintainers request separation, adapt the public draft to the verified official feature-request form linked in A. Do not invent a Discussion category or treat a bug-report thread as the submission venue. Check status again immediately before engagement.

**Lead with:** authenticated identity, accepted-load/lifecycle and conditional small per-chat state; defer immutable assets. Acknowledge the small surface still entails costly migrations, writer participation, backup/restore, performance and ongoing API maintenance.

**Three feasibility questions:** (1) Is an existing/planned supported seam sufficient, and should this join #5265? (2) Will the host own incarnation, accepted-load and native writer ordering for a bounded initial scope? (3) What minimum conditional-commit, interrupted-operation and restore guarantees can maintainers support, and how should review be split?

| Maintainer response | Smallest conditional next action; separately authorized |
| --- | --- |
| Existing mechanism identified | Inspect that mechanism against invariants before proposing implementation. |
| Interested | Refine foundation with maintainer guidance and agree on reviewable host slices. |
| Prefer narrower scope | Revise draft and document which persistence gates remain unmet. |
| Decline | Return to owner to reassess session-only sufficiency or companion maintenance costs; no fallback architecture automatically authorized. |

Owner decisions before any external engagement: approve/revise/reject the public wording; authorize the exact venue/message and representation/testing commitments; confirm initial scope and deferred assets. The present authorization approves **draft preparation only**; it does not answer DYL-47's other architecture/recovery/backup decisions. No hypothetical next action begins here.

Hard boundaries unchanged: **DYL-22 Blocked; DYL-23 Blocked; DYL-24 accepted session-only; production persistence unauthorized; M1.3 unauthorized; M2 unauthorized; Gate A NOT_RUN.** PR remains OPEN/UNMERGED, auto-merge disabled; DYL-48 stops In Review, not Done. **NOT_SUBMITTED** upstream.
