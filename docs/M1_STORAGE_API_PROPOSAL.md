# M1.2: Host Storage API Feasibility and Owner Decision Proposal

**Status:** proposal for owner decision; no architecture selected or approved.

**Scope:** documentation and host feasibility only. No production storage, SillyTavern changes, backend, browser-local persistence, or downstream implementation was started.

**Tracking:** [DYL-25](https://linear.app/devils17/issue/DYL-25/sillynovel-m12-decide-supported-storage-architecture-and-host-api), related to DYL-19, DYL-21, DYL-22 and DYL-23.

## Recommendation

Prefer **Option A: a small, versioned SillyTavern host capability for extension-owned state and assets**. The host already owns the authenticated user scope, chat lifecycle and storage paths, so it is best positioned to define those identities and enforce targeted writes where they originate. The capability must be a dedicated namespace and must never save a SillyNovel record by rewriting a chat transcript.

Use **Option D: visibly session-only visuals** as the fallback while a host decision is pending or if maintainers decline the API. Keep the reader and chat usable; show that visual choices will be lost on reload. This does not satisfy reloadable imported-scene acceptance or unblock persistent asset import.

Option B is technically possible on the pinned host, which has an opt-in server-plugin loader. It is a poor default: plugins execute unsandboxed Node code, are disabled by default, can auto-update, and current official extension-submission guidance says extensions that require a server plugin will not be accepted. It could be revisited only as an explicitly optional companion after the owner and host maintainers confirm that distribution model is acceptable.

Option C, a separate service, adds authentication, deployment, retention and incident-response work without solving SillyTavern's missing durable chat/card identities. Revisit it only if the owner explicitly wants service-operated or cross-host synchronization and accepts those costs.

**This recommends a path for owner review; it does not approve the API, an upstream request, a plugin, or persistent implementation.** No upstream issue was filed.

## Evidence and limits

The assignment checkout was clean at 71e121050e8938690b3cf1003e7095fb6e2b9db5 on codex/dyl-18-text-reader. The focused worktree was based on fetched origin/main at c64bf05c00ac7cbbd7852fa60c8f21f38ce54517, and this proposal was checked against that head. Linear reports DYL-19 and DYL-21 as **Done**. Their outcomes remain **PARTIAL/BLOCKED**, not proof that persistence or an asset library is safe. DYL-19's evidence was delivered in [PR #6](https://github.com/Sonoran-Solutions/SillyNovel/pull/6), and DYL-21's in [PR #9](https://github.com/Sonoran-Solutions/SillyNovel/pull/9); their reports and probes are in the current SillyNovel main history.

The host evidence is tied to SillyTavern 1.19.0, commit 7e8663cd9c184a550b37238218bdd32c6efc68e9. DYL-21's isolated host run used synthetic records in a fresh data root. It confirmed that the explicit chat route writes and reads a submitted full chat array, but accepted a stale same-integrity-token write; its background upload replaced bytes at the same filename. It did not exercise a real A → B or A → B → A UI save race, multiple host users, rename/import lifecycle, or export portability. DYL-19's identity and writer fixtures establish only the scopes described in [M1_IDENTITY_STORAGE.md](M1_IDENTITY_STORAGE.md); two-tab Web Locks evidence is synthetic cooperating-tab evidence.

The reports and exact reproduction commands are [DYL-19 identity/storage proof](M1_IDENTITY_STORAGE.md) and [DYL-21 safe-save/asset report](M1_STORAGE_UNBLOCKER.md). The DYL-21 status, run ID, probe boundaries and source hashes are preserved there. This proposal does not repeat the host probes or promote untested cases to passes.

Key pinned-source observations:

- [getContext in st-context.js](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/st-context.js#L115-L128) exposes current chat and character/group locators. The character index and filenames are not durable identity, and no stable host-store key is exposed for SillyNovel to persist.
- [saveMetadataDebounced in extensions.js](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/extensions.js#L89-L112) captures group and character indices but not chat ID; it returns before its timer performs the save. [saveMetadata/saveChatConditional in script.js](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js#L9408-L9439) saves the active chat and catches/logs failures.
- [The chat save route](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/chats.js#L532-L570) accepts a target filename and owner selector but a whole chat array. Its integrity token is not a changing record revision. The host probe showed a stale whole-array update can be acknowledged and replace a newer extension marker.
- [The background upload route](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/backgrounds.js#L135-L155) writes by sanitized filename under the current user's directory. Same-name replacement was HOST_TESTED. This is not an extension-owned immutable asset contract.
- [Server plugin loading](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/plugin-loader.js#L40-L85) is disabled unless configured; [plugin routes](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/plugin-loader.js#L188-L230) mount at /api/plugins/{id}. The loader logs that plugins are trusted code. [The checked-in default config](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/default/config.yaml#L393-L396) defaults to plugins disabled and auto-update enabled.

Current official SillyTavern contributor documentation describes server plugins as unsandboxed and says extensions requiring them will not be accepted: [server plugins](https://docs.sillytavern.app/for-contributors/server-plugins/) and [UI extension submission guidance](https://docs.sillytavern.app/for-contributors/writing-extensions/), checked 2026-10-12. The pinned source proves the plugin loader exists at 1.19.0; the current docs are not a version-pinned maintainer commitment.

## Candidate architectures

| Option | Effort and maintenance | Compatibility and deployment | Identity, writes and assets | Privacy, export, offline and approval |
| --- | --- | --- | --- | --- |
| **A. Upstream host capability** | Medium/high host work: identity lifecycle, separate store, CAS, assets, tests and docs. SillyNovel's adapter stays small. Maintenance follows a published host API version. | No fork or extra service. Old hosts use session-only mode after a capability check; target API versions need pinned integration tests. Users must update SillyTavern to a supported release. | Host-issued store/card/group/chat IDs; targeted extension namespace; server CAS; host-owned immutable asset revisions and explicit export hooks. | Best data minimization and account isolation because existing host auth/storage is authoritative. Saved data is as reliable as the host's confirmed store/backup contract; no cross-host sync promise. A local host needs no cloud service but is unavailable when that host cannot be reached. Requires owner approval and host-maintainer acceptance. |
| **B. Optional SillyTavern server plugin** | Medium for a prototype, higher over time: separate server/browser releases, install docs, plugin test matrix and API drift. It still needs host identity lifecycle support or safe, documented identifiers. | The pinned host has a plugin loader and mounts plugin routers. Server plugins are disabled by default; a plugin may be auto-updated. A plugin requirement conflicts with current official extension-submission guidance, even though a separately installed companion is technically possible. | Plugin can implement its own user-scoped files and CAS, but the loader does not supply a stable SillyNovel identity/storage contract. It would still need host-issued durable IDs and careful ownership checks. It can own asset bytes and export code, but must not treat filenames as IDs. | Code runs unsandboxed with server privileges; installation and updates expand the trusted-code surface. Same-host operation only unless separately synchronized. Reliability depends on plugin/host version pairing and operator backups. Requires owner approval, maintainer-policy confirmation, and explicit user installation. Not the recommended extension architecture. |
| **C. Separate storage service** | High: service/API, authentication, account recovery, deployment, monitoring, backups, retention, security response and client maintenance. | Host-independent client code, but requires a reachable service, credentials and ongoing operations. SillyTavern host changes may still be required for stable IDs. | Service can implement CAS and content-addressed files, but the extension still needs verified host identity and target semantics. Manual identity mapping would break on rename/copy/import and is not a durable substitute. | Sends visual metadata and assets to another operator; those can reveal private story context even without transcript text. Export/import and deletion must span two systems. Availability and recovery become an operator responsibility; offline writes fail or queue, and no queue is proposed. Requires owner approval for operator, privacy, cost and retention. |
| **D. Session-only temporarily** | Low: keep visual choices in memory and avoid a persistence layer. Moderate repeated user effort; no backend lifecycle to maintain. | Can be built on the browser extension surface exercised for the reader, but the stage itself is untested and separately gated. Reload loses state. | No durable identity or write/conflict protocol. Assets must be selected from local files into memory/object URLs; no owned library or durable revision IDs. | Lowest data exposure; current loaded bytes remain available while the page is open. Deliberately provides no reload, backup, cross-tab or cross-device recovery. Must be labeled unsaved and separately authorized for the stage UI. This is the fallback, not a persistent architecture. |

Option A is preferred because account ownership, chat lifecycle and files already belong to SillyTavern. It avoids a second credential and deployment system and can make storage rules apply to every extension operation. The cost is upstream dependency and host-version support. If maintainers decline it, Option D is the narrowest safe fallback; choosing B or C would be a new owner decision.

## Exact gaps from DYL-19 and DYL-21

The missing capabilities are not one generic “storage” function:

1. **Host-owned identity:** the browser context has no verified stable user/store key, stable character identity, and chat instance ID distinct from a filename. Rename, branch, copy, import, group changes, and Temporary Chat need explicit semantics. Host directory scoping is not an extension-visible identity contract. Existing extensionSettings are user-level and do not solve per-chat ownership or asset bytes.
2. **Targeted extension-only state:** the public debounced metadata helper targets current active context, does not include chat ID, and cannot tell the caller when the delayed write completes. The low-level chat route rewrites the full chat and does not reject a stale write from the same integrity generation.
3. **Reliable revision/error semantics:** no monotonically increasing revision or compare-and-swap exists for a visual record. A fulfilled promise or HTTP 200 cannot substitute for “this expected revision was committed atomically.” The route's error-swallowing behavior and the helper's timer make confirmation unavailable at the supported seam.
4. **Owned immutable assets:** host background files are mutable by filename. The probes establish small-byte upload/readback and overwrite behavior, not extension ownership, digest verification, decoding policy, immutable revision, safe reference deletion, or asset portability.
5. **Export/import boundary:** ordinary chat export is not evidence that separately stored extension records or image bytes travel with it. No tested visual-state/asset sidecar exists. Import must not trust IDs embedded in an untrusted archive.
6. **Writer/session ownership:** same-origin Web Locks only coordinate cooperating tabs in the tested browser context. They do not protect against host writes, other profiles/devices, stale revisions, or cross-process storage. The real host A → B and A → B → A race was not run.

No browser-local fallback is justified by these findings. The DYL-16 decision requires its own proposal and owner approval.

## Minimal proposed host contract

Expose one narrow SillyTavern capability for the fixed SillyNovel namespace, rather than a general extension database. Names below are illustrative proposal names, not existing APIs or endpoint claims.

### 1. Identity and current-view handle

The host returns an opaque, server-issued target for the current view:

~~~json
{
  "apiVersion": 1,
  "durability": "persistent",
  "storeId": "opaque-host-user-store-id",
  "scope": { "kind": "character", "id": "opaque-host-scope-id" },
  "chatId": "opaque-chat-instance-id",
  "viewToken": "opaque-token-for-this-chat-visit"
}
~~~

The server derives the user from its authenticated request. The target is a handle, not a filesystem path or authority supplied by the model. Every operation revalidates that the handle belongs to the authenticated host store and the SillyNovel namespace. A stale or invalid target is rejected.

The host owns these lifecycle rules:

| Event | Required identity behavior |
| --- | --- |
| Character or group rename | Preserve its stable host ID. A character/group kind change creates a new scope. |
| New chat | Allocate a new chat instance ID; never infer it from title, filename, index, or integrity token. |
| Chat rename | Preserve chat ID; update the filename locator privately within the host. |
| Branch/copy/duplicate | Allocate a new chat ID and expose parent ID plus the verified fork/prefix point. The old record remains separate. Reuse only state whose source prefix is validated. |
| Card/group duplicate or import | Allocate new host IDs. Do not merge visual bindings by display name, card text, avatar bytes or index. Require explicit manual binding when ambiguous. |
| Group membership change | Preserve the group ID if the host considers it the same group; expose the new membership revision so SillyNovel revalidates bindings and never guesses an author. |
| Chat import | Allocate a new chat ID. Ignore imported host IDs. A separate user-invoked visual bundle may restore records after source and binding validation. |
| Temporary Chat | Return durability: temporary and reject durable writes. It may keep in-memory visuals for that view only. |
| Chat deletion | Tombstone the chat's namespace record according to an owner-approved retention window. Never cascade-delete shared assets without a reference check. |

The view token must change for every chat activation, including A → B → A. The API must either reject a write with a superseded token before commit, or define and prove that a request already accepted is permanently bound to its original target and cannot resolve against the newly active chat. The proposal prefers rejection for work not yet committed; SillyNovel must discard stale results on return regardless. If the host cannot enforce this context rule, keep persistence blocked rather than falling back to a fresh active-chat lookup.

Store, scope and chat IDs should be opaque and stable within one SillyTavern user store. They need not expose real names or imply cross-server identity. Cross-server migration uses explicit export/import, not ID equality.

### 2. Separate namespaced visual metadata with CAS

Expose readVisualState(target) and compareAndSwapVisualState(target, expectedRevision, record), or the equivalent small host API. Store the record outside canonical chat JSONL and card data, keyed by authenticated host store + SillyNovel namespace + chat ID.

- The host assigns the revision. First create uses expected revision 0. Each accepted commit advances it once.
- The server validates owner, scope, chat identity, view token, namespace, schema and expected revision in the same serialized/atomic operation as the write.
- A stale revision returns a typed conflict and does not mutate the saved record. No silent merge or last-writer-wins behavior.
- Success returns the committed revision only after the durable write completes. Failures are returned, not swallowed or logged as success.
- SillyNovel records contain visual choices, schema version, source anchors/prefix digests and references to asset revisions. They do not contain canonical chat messages, provider secrets, arbitrary paths or model-selected URLs.
- Every caller captures chat identity, view epoch, source revision and expected storage revision. It validates them before commit and again before applying a result to the UI. Cancellation is only an optimization.
- The server-side revision/CAS is authoritative across tabs that reach the same host store. Web Locks can reduce same-origin conflicts but are not a substitute. If the host runs multiple server processes against shared files, the CAS must be cross-process; otherwise document that topology as unsupported.

Suggested response states:

| Result | Behavior |
| --- | --- |
| committed + revision | Show saved only after durable completion. |
| stale + current revision | Do not overwrite or merge; reload/review or export the unsaved edit. |
| inactive / temporary / wrong-owner | Refuse; keep ordinary chat usable and show an unsaved reason. |
| invalid / unsupported-version / corrupt | Preserve old bytes; offer export or repair. |
| quota / I/O / unavailable | Preserve old record; show retry/export and keep the stage non-blocking. |

~~~mermaid
sequenceDiagram
    participant UI as SillyNovel
    participant Host as Host storage API
    UI->>Host: readVisualState(target)
    Host-->>UI: revision 7 + visual record
    UI->>Host: compareAndSwap(target, viewToken, expected 7, updated record)
    alt current revision is 7 and token is current
        Host->>Host: atomically persist revision 8
        Host-->>UI: committed revision 8 after write
    else revision changed or view token expired
        Host-->>UI: typed stale/inactive refusal; no write
    end
    Note over UI: Apply completion only if chat, view epoch and source still match
~~~

### 3. Independent immutable asset API

Metadata and images are separate host-owned resources. Provide only namespaced list/create/read/remove operations:

- Upload receives bytes and a declared expected SHA-256. The host recomputes it, decodes the raster, checks actual format/dimensions/byte limits and refuses invalid content before publishing it.
- createIfAbsent stores by a host-owned opaque asset ID plus immutable content revision. A repeated digest returns the existing identical bytes; a mismatched collision fails. Replacement creates a new revision and leaves the old bytes intact.
- Read verifies the stored digest and returns validated media type and dimensions. Missing/corrupt bytes produce a typed result, not a broken reader.
- Remove only affects SillyNovel-owned records. Preserve any referenced revision; deletion either refuses while referenced or writes a tombstone until safe collection.
- Chat metadata stores assetId + revisionSha256 references, never bytes or file paths. The host must not treat a filename as authority or trust remote/model-supplied URLs.
- Quota exhaustion or provider/storage failure preserves existing approved assets and does not block text reading or replying.

No format or quota is approved here. M1_PLAN proposes PNG/static WebP/JPEG and 200 MiB total; M1_IDENTITY_STORAGE separately proposes a 256 MiB total. Those unmeasured ceilings conflict. Owner review and actual decode/quota tests must settle supported formats, per-file dimensions/bytes, batch/library limits and removal policy before implementation.

### 4. Export and import

Keep SillyTavern's normal chat export behavior explicit and unchanged. Add a separate “SillyNovel visual bundle” containing a versioned manifest, selected visual records, source-prefix hashes, binding references and the immutable asset bytes those records use. Do not claim transcript export includes this bundle.

Export is initiated by the user and scoped to the authenticated store/chat. Import treats every field and image as untrusted, validates schema/digests/decoded dimensions, assigns fresh host chat/asset identities, and requires the user to confirm character remapping. Restore only records whose source prefix is verified against the destination chat; otherwise import as review-needed or refuse. Unknown future schemas remain untouched and exportable. No sync or portability claim beyond this explicit bundle.

## Host-maintainer feasibility

### Upstream API

The pinned host already has Express route registration, CSRF/authentication middleware, host-user data directories, and chat/card/group lifecycle code. [server-main.js installs user-data and login middleware before loading plugins](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/server-main.js#L156-L164), then loads them during startup [after its private routes are registered](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/server-main.js#L244-L278) and [before the server begins listening](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/server-main.js#L309-L314). A core API can be mounted under an extension namespace after the existing auth layer; it needs:

1. A host identity service that allocates and preserves account/store, card/group and chat-instance IDs through create, rename, branch, duplicate, import, delete and Temporary Chat flows. Existing file names and chat_metadata.integrity cannot stand in for those IDs.
2. A small namespaced extension-record store with server-side ownership checks, view-token validation, atomic revision/CAS and typed completion/error results. It must never route through whole-chat save.
3. A distinct immutable asset namespace with decoded-image validation, ownership/reference-aware deletion and explicit bundle export/import.
4. A versioned public frontend capability and compatibility policy. Unsupported host versions must report the missing feature and continue session-only.
5. Tests for multi-tab, same-store writers, account switches, A → B → A, rename/branch/duplicate/import, Temporary Chat, stale revision, request failure, reload, export round-trip, asset collision/corruption/quota and deletion/reference safety.

The requested identity lifecycle is broader than adding a single endpoint. Migration of existing chats and stable IDs for character cards likely require host-maintainer design across chat and card operations. That is the main schedule and compatibility risk. No exact route or internal file location is assumed by this proposal.

### Optional server plugin

In pinned 1.19.0, server-main.js installs user-data and login middleware before loading plugins; plugin-loader.js gives each plugin an Express router mounted below /api/plugins/{id}. A plugin could therefore host its own routes and store. This establishes technical feasibility for a self-hosted companion, not a supported extension storage API.

The pinned host config defaults enableServerPlugins to false and enableServerPluginsAutoUpdate to true. Server plugins execute arbitrary Node code without a sandbox. Current official documentation says extensions requiring a server plugin will not be accepted. The SillyNovel [decision register](DECISIONS.md) also records “No required server plugin in the core,” and the [architecture baseline](ARCHITECTURE.md#1-integration-strategy) excludes one. An optional feature that degrades to session-only may be acceptable, but the maintainer policy for that exact split is unconfirmed. Even if accepted, a plugin does not gain stable chat/card IDs automatically; depending on internal request.user fields or host source imports adds upgrade risk. It is not a cheaper way to bypass the identity contract.

### Separate service

A backend can host CAS and content-addressed files, but the SillyTavern browser client still needs a safe association between its authenticated host store and the service account. A service login alone does not fix duplicate card labels, chat rename/branch/import, or Temporary Chat. This path adds externally operated retention and deletion semantics and makes host-offline writes unavailable. It is technically buildable but not the smallest supportable path for a single-host visual extension.

## Security, privacy and reliability

- **Trust boundary:** every target, imported record and filename-like label is untrusted client data. The host must derive the user from its authenticated session and validate opaque IDs, namespace, scope and view token at the write boundary. No arbitrary filesystem paths, URLs, scripts or host chat fields are accepted.
- **Canonical data:** visual state is stored separately. The extension does not pass chat arrays to the visual API or add machine-readable visual tags to ordinary roleplay output. Keep only source anchors and visual records; do not store full messages, credentials or provider configuration.
- **Correlation:** a source-prefix SHA-256 digest avoids copying transcript text but can still reveal equality of prefixes to anyone who can compare exported records. Keep it inside the user's visual namespace and include it in a bundle only by explicit export.
- **Plugin risk:** a server plugin has host-process filesystem and Node privileges. A bug or malicious update can expose user data beyond SillyNovel. An optional plugin needs a pinned release, explicit install/update instructions, no auto-update surprises, reviewable source and independent security maintenance. This is a substantial cost compared with a host API.
- **Service risk:** a remote backend learns the user's visual records, asset bytes and associations. It requires clear retention/deletion, account recovery, access logging, backup encryption and incident handling. This proposal sends nothing to such a service.
- **Import and assets:** imported manifests and images are untrusted. Enforce byte/pixel limits before and after decode; reject animation or unsupported formats; verify content digests on read; don't fetch model-provided URLs. Show references before removal and preserve previously approved revisions on failure.
- **Availability:** host/API outage, unsupported API version, quota exhaustion, stale revision or corrupt asset leaves SillyNovel visibly unsaved or showing a neutral placeholder. It must not block native reading/replying, retry through a cloud store, or claim a save before durable acknowledgement.
- **Browser and process limits:** the host CAS must work without relying on Web Locks. If the browser lacks the host's supported request/security primitives, persistent controls are unavailable and the reader remains usable. Cross-device or multi-process guarantees require shared authoritative CAS and tests; absent those, document them as unsupported.

## Cost and implementation phases

Order-of-magnitude engineering estimates only; no host maintainer has committed to these estimates or a release. Calendar time for upstream review and release is unknown. Assumptions: one host-supported store, no cross-server sync, one SillyNovel namespace, no canonical chat rewrite, and ordinary raster formats.

| Phase | Work and exit evidence | Rough effort |
| --- | --- | --- |
| 0. Owner decision | Choose whether to request Option A; settle identity lifecycle, visual bundle portability, compatibility floor, and whether the session-only fallback is acceptable. | 0.5–1 contributor day; owner/maintainer response time unknown. |
| 1. Upstream API design | Host-maintainer review of the narrow identity, context-token, CAS, asset and bundle contract; decide the stable-ID migration point. | 2–4 design/implementation days, excluding review queue. |
| 2. Identity + visual metadata | Host identity lifecycle, namespaced record store, atomic CAS, typed errors, context-token invalidation, versioned frontend API and race/lifecycle tests. | 7–12 host engineering days. This is the largest blocker. |
| 3. Assets + portability | Immutable asset revisions, decode/size/quota checks, reference-safe removal, explicit visual bundle import/export and recovery tests. | 5–9 host engineering days. |
| 4. SillyNovel integration | Adapter, visible saved/unsaved/error states, schema handling, asset references, and M1.3 lifecycle/reload/cross-tab tests on supported host releases. Separate authorization required. | 4–8 extension engineering days plus owner playtest. |

Option B may reduce the need to change upstream code, but it does not remove phases 2–4's lifecycle, ID, writer, validation and maintenance work. It adds a second install/update/support surface and a more privileged trust boundary. Option C requires all storage phases plus a production service and ongoing operator work. Option D can support a small transient renderer without any of those durable phases.

## Owner decisions requested

1. **Preferred path:** approve or decline preparing/submitting the upstream feature request in the appendix. Approval to submit would not approve a storage implementation.
2. **Fallback:** if upstream declines, choose between remaining session-only and separately evaluating an optional server plugin. Current official extension guidance and plugin security do not establish that a required plugin is an acceptable distribution path.
3. **Identity:** confirm the proposed rules for host-user scope, card/group rename/duplicate/import, chat rename/branch/copy/import, group membership changes and Temporary Chat.
4. **Portability:** choose explicit visual sidecar export/import as the minimum; decide whether cross-device or cross-host sync is required. This proposal assumes neither.
5. **Data policy:** approve storage retention/deletion, asset formats/limits and reference-safe cleanup after measured tests. Existing draft total-library budgets conflict (200 vs 256 MiB); neither is approved.
6. **Downstream work:** separately authorize any session-only stage/UI use. Do not treat DYL-21's Done status as approval to implement storage or to pass Gate A.

Until these decisions and the host proof exist, extension state remains in memory, with any future temporary controls clearly labeled unsaved. DYL-25 records a recommendation, not an owner ruling.

## Downstream impact

| Work | What this proposal changes |
| --- | --- |
| **DYL-20 pure reducer** | Independent of durable storage; may proceed under its own authorization using validated in-memory state. |
| **DYL-22 asset library/importer** | Remains **BLOCKED**. DYL-21 proves mutable background files, not owned immutable revisions. It can start only after the owner selects an approved asset path and the required read/write/remove/export proof exists. |
| **DYL-23 manual scene renderer** | Durable imported scenes still depend on DYL-22. A transient renderer may use user-selected in-memory files/session-only references only after separate owner authorization, and must show unsaved state. It does not satisfy reloadable-scene acceptance. |
| **M1.3 persistent scenes** | Remains **BLOCKED** until host identity, target/view ownership, atomic CAS, completion/error handling, asset references, recovery/export and exact-head race tests pass on a supported host. |
| **Gate A / M2** | Gate A stays NOT_RUN; no downstream authorization or human verdict follows from this proposal. |

## Draft upstream feature request (not submitted)

**Title:** Add a supported extension-owned chat-state and immutable-asset storage capability

**Problem:** Browser UI extensions can read the current SillyTavern context, but the public metadata debounce targets active context and does not confirm completion. The low-level chat save endpoint writes a whole transcript and does not provide extension-only compare-and-swap. Current background filenames are mutable. Third-party extensions therefore cannot safely persist chat-specific state and assets without depending on internal routes or risking canonical chat data.

**Requested capability:** Provide a versioned, documented API for an authenticated extension namespace to:

1. Obtain opaque host-owned user-store, character/group and chat-instance handles plus a per-chat-visit token. Define rename, branch/copy, duplicate/import, deletion and Temporary Chat semantics.
2. Read and atomically compare-and-swap a small namespaced record for an explicit chat target, with typed stale/inactive/unsupported/quota/I/O results and a durable completion acknowledgement. The operation must not rewrite chat messages or card metadata.
3. Create-if-absent, read, list and reference-safely remove immutable user-scoped raster asset revisions, with server-computed SHA-256 and decoded format/dimension/size validation.
4. Export and import that namespace and referenced asset bytes as an explicit bundle. Normal chat export must state whether extension data is excluded.

**Non-goals:** a generic third-party database framework, external cloud storage, cross-server sync, extension-authored filesystem paths, model-selected URLs, arbitrary writes to chat JSONL, or making SillyNovel's scene schema a SillyTavern core contract.

**Acceptance evidence:** pinned-host tests for account/chat/card isolation, rename/branch/import/Temporary Chat identity, A → B → A delayed writes, multiple tabs, stale CAS refusal, persistence completion/error, immutable asset collisions/corruption/quota, reference-safe removal and visual-bundle round trip. A supported release/API version and migration behavior should be documented.

This request is draft text for owner and maintainer review only. It has not been filed, and no maintainer response or acceptance is implied.
