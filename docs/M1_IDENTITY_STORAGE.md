# DYL-19: Identity and Storage Contract Proof

Status: bounded investigation; no production persistence implementation. Host tested: SillyTavern 1.19.0, commit `7e8663cd9c184a550b37238218bdd32c6efc68e9`. SillyNovel candidate base: `4e72a3cda0393ca1e2a11155491ef10f0ab759bc` (`origin/main` at investigation start). Work is isolated on `test/dyl-19-identity-storage-proof`; shared `STATUS.md` and `TESTING.md` remain untouched for DYL-17.

## Evidence and reproduction

Evidence is labeled by how it was obtained:

- **Source inspection**: pinned SillyTavern source, guarded by exact commit in the probe. This establishes code paths, not runtime behavior by itself.
- **Synthetic helper tests**: deterministic Node tests over fabricated records; no host state involved.
- **Actual host operations**: synthetic records written/read through SillyTavern 1.19.0 routes in a fresh data root and isolated localhost session.
- **Actual UI operations**: two synthetic cards with the same display name created through Character Management; Temporary Chat opened through its native control. The app browser context was a separate Codex in-app browser context on `127.0.0.1:18019`; browser engine/version and OS profile internals were unavailable, so the evidence does not generalize to other profiles/devices.
- **Instrumented-host tests**: none. The writer test is a same-origin fixture page, not instrumentation of SillyTavern chat writes.

The probes use only Node's standard library. Create the pinned host checkout and install its declared dependencies, then run the checks from the SillyNovel checkout:

```sh
git clone https://github.com/SillyTavern/SillyTavern.git /home/dq/Projects/SillyTavern-dyl19
git -C /home/dq/Projects/SillyTavern-dyl19 checkout 7e8663cd9c184a550b37238218bdd32c6efc68e9
(cd /home/dq/Projects/SillyTavern-dyl19 && npm ci)
node tests/probes/dyl19/source-inspection.mjs /home/dq/Projects/SillyTavern-dyl19
node --test tests/probes/dyl19/source-anchor.test.mjs tests/probes/dyl19/owned-chat-probe.test.mjs
node tests/probes/dyl19/host-storage-probe.mjs /home/dq/Projects/SillyTavern-dyl19
node --test tests/m0.test.mjs
```

The host-storage probe refuses any other host commit. It creates a new `mkdtemp` data root and random resource suffix per run, reserves an available port, starts that exact checkout bound to `127.0.0.1` with browser launch disabled, and talks only to that child process. It waits for the child to announce both the exact data root and loopback listener before using the URL. It preflights all resource names, tracks only successful creates, deletes only tracked chat/asset names, stops its own host, then removes its fresh data root (including any host-created backup files). It accepts no arbitrary host URL or data-root argument. No model endpoint was used. Probe source/fixture files are `tests/probes/dyl19/`; source inspection emits exact SHA-256 hashes for inspected host files. No chat/card exports or personal data are included.

### Pinned source findings

`getContext()` in `public/scripts/st-context.js` exposes current chat data, character array index, group ID, and current chat ID/name. It exposes no explicit account/user/profile key and no stable character UUID in this public context. The current chat ID is the group chat filename or selected character's `.chat`; the character identifier is an array index. These are useful current-session locators, not independently durable owner keys.

`saveMetadataDebounced()` in `public/scripts/extensions.js` captures group ID and character index, then later re-reads context and checks those two fields. It does not capture or compare chat ID, invokes the active-context `saveMetadata()`, and returns before the timer finishes. `saveMetadata()` in `public/script.js` accepts no target chat. `saveChatConditional()` chooses the currently selected group/chat at invocation (after waiting for an in-progress save), catches and logs errors instead of rethrowing, and its resolved Promise therefore does not establish successful persistence. There is no extension-facing targeted metadata-save seam in this pinned source.

`src/endpoints/chats.js` scopes files under the current host user's chat directory and separates a character avatar filename from the chat filename. The host route accepts a target owner and filename, but this low-level API is not the extension's public metadata seam. Host chat integrity tokens are write guards; native branch creation in `public/scripts/bookmarks.js` creates a fresh token, so the token is not a universal identity. Temporary Chat in `public/scripts/chats.js` keeps/restores a neutral chat through `sessionStorage` and removes its temporary session key on restore.

The asset and background endpoints use current host-user directories and mutable filenames. The background upload route sanitizes the supplied name and writes by that name; re-uploading the same name replaces the bytes. Asset download similarly copies to a named path, while delete removes that path. This proves a host-user storage location for the exercised background operation, not extension ownership, immutable revisions, content validation, or a general extension asset API.

Inspected host file hashes (also emitted by the script):

| Pinned source file | SHA-256 |
| --- | --- |
| `public/scripts/st-context.js` | `5a91ce36a343041c81351953baba10a54a7576f15571c01ef1af8c19bcc0e30d` |
| `public/scripts/extensions.js` | `f5ee3fee55d52e8b7041ceafb260dba5a2b2dada53081f930045ab8b6447d30d` |
| `public/script.js` | `955c603d0bad84bac5a716f0818d85c2543e44d4c43878e0d63ef1e55ca91855` |
| `public/scripts/bookmarks.js` | `5c3a68aa82e58c0d82777065b8466572fc1b202cad98a92ba4daa852c386ad1b` |
| `public/scripts/chats.js` | `2b870d44c55f99c622b5afcd7b1fd563219b9444bc70e8653611327d6e7f7be6` |
| `public/scripts/group-chats.js` | `862eb24dfe1f596a2bd6d039a69397667829e0fc34471d22d2028d7781a5c73c` |
| `src/endpoints/chats.js` | `40012ebc71a75357e62f7532e5b20def0d8b6c132bb6ab48f662993cc97b9063` |
| `src/endpoints/assets.js` | `890a4fe32ca20d24b0c1aa178e0e9c6b3de82f64f51b01d3f3766105b9fb4b8a` |
| `src/endpoints/backgrounds.js` | `9694644c52046bba0540c8835caa2fcc1e1cb829449fae72f69110aafe06cf46` |

SHA-256 for the committed probe files at review time:

| Probe file | SHA-256 |
| --- | --- |
| `tests/probes/dyl19/host-storage-probe.mjs` | `054e9487acf061a3291b144c6ba7a6a9c59fa552937345faa1d35b26dcdd0e47` |
| `tests/probes/dyl19/owned-chat-probe.mjs` | `89c48056b86dff15be2c10a2302c57124da94f3a7c7adc98f693bfde1f7726fc` |
| `tests/probes/dyl19/owned-chat-probe.test.mjs` | `7dede63f588984f26473979781fc90bb63e9aa5e6950bdf5723f75874ed13d6a` |
| `tests/probes/dyl19/source-anchor.mjs` | `d52c515d3a7217d8bff989a9dcc5f472d0655dfce903fae91c1d1bdf8eaecc6b` |
| `tests/probes/dyl19/source-anchor.test.mjs` | `8f8545a793318e217dd4cc9c35a1383bd2966248d284ef92a3c4536e7e558bc2` |
| `tests/probes/dyl19/source-inspection.mjs` | `f530c38b759d0d0b941a0d036e2ba9b81df0ab1ca8017f6f1c22d870e91b6ca1` |
| `tests/probes/dyl19/writer-server.mjs` | `20ea2f5b9fd05082cc9b03f6f190ac204d619dc477f4a2daf5ec1b847d5d15d8` |
| `tests/probes/dyl19/writer.html` | `f4ba1082c6a8f5a6cfed46782c25f1f728df1a8e896bd7d29d04485d6bb9cf99` |
| `tests/probes/dyl19/fixtures/pixel-1x1.png` | `168f79d81e75820ed8c17775ca48248b57d783c0df951ca50065fc34b3b0622c` |
| `tests/probes/dyl19/fixtures/pixel-1x1-red.png` | `4ff6ab670a58c14270e034e2090d9a432caa263a14e0a25785386b0c12f880b5` |

## Results matrix

| Area | Result | Evidence level | Permitted use now | Dependent features |
| --- | --- | --- | --- | --- |
| Chat owner and filename identity | **PARTIAL** | Source inspection; host API writes/readbacks; native UI | Treat host user scope + character/group scope + chat filename as a compound, host-scoped locator when all parts are freshly verified. Refuse when owner is unresolved. | Supports design only; cross-account identity and persistence remain blocked. |
| Character binding | **PARTIAL** | Actual native UI creation of two `Mira` cards; source inspection | Do not bind by display name, content, or numeric index. A session may refer to the selected card's current avatar/card locator only while revalidated. | Durable scene ownership and card replacement/import/group transitions remain blocked. |
| Source anchor/fingerprint | **PROVEN** for the helper contract | Six synthetic Node tests | Use `sn-source-v1` as a candidate comparison contract after a verified owner key is supplied; index is only a hint. | Enables isolated helper/review work; does not enable host persistence. |
| Metadata save targeting/completion | **BLOCKED** | Pinned source inspection; no instrumented race test | Do not persist asynchronous visual metadata through the current debounced active-chat seam. | Scene persistence, migration, and durable anchors remain blocked. DYL-17 text-reader work is independent. |
| Asset storage | **PARTIAL** | Actual host API upload/list/read/overwrite/delete with tiny synthetic PNGs; source inspection | Host background path is host-user scoped and filename mutable. Do not treat it as extension-owned revision storage. Keep bytes out of settings/chat metadata. | Asset library/import/export and portability remain blocked. |
| Single visual writer | **PARTIAL** | Same-origin two-tab Web Locks fixture, actual browser context | Web Locks coordinated two tabs sharing this same origin and browser context; B acquired after A release and after A tab close, then reread A's record. | Does not establish cross-profile/account/device exclusion or coordination with native chat writes. |

## Identity and source contract proposal

The host user namespace, content scope, and chat locator are separate fields. A future durable anchor must carry a verified `userStoreKey`, a `{ kind: "character" | "group", key }` scope key, and the host chat ID/name as a separate locator. Do not derive a durable key from display name, card content, avatar bytes, array position, or chat integrity token. The pinned extension context does not provide a verified account key or stable card UUID. Until the owner key and card scope are resolved by a supported host seam, creation/rebinding must refuse or require explicit manual resolution. Account separation was **not** exercised; only the isolated default host user was used.

`tests/probes/dyl19/source-anchor.mjs` defines `sn-source-v1`: UTF-8 JSON array serialization followed by SHA-256. The serialized prefix is `[version, userStoreKey, scopeKind, scopeKey, messagesThroughSelected]`; each message is `[role, authorEvidence, exactText, selectedSwipeEvidence]`. Resolved author is `['resolved', characterKey]`; missing/unknown author is explicitly `['unresolved', label-or-null]`. A swipe is `[id-or-null, exactText]`, or `null`. Exact string contents, including whitespace, are preserved. Chat ID is stored on the anchor but not in the prefix digest, allowing a copied branch to prove an identical canonical prefix while retaining a distinct owner locator. The index is a locator hint only and is excluded from the digest.

One stable synthetic vector from the tests:

```json
{
  "version": "sn-source-v1",
  "userStoreKey": "synthetic-user-store",
  "scope": { "kind": "character", "key": "synthetic-card-mira-a" },
  "chatId": "branch-a",
  "locator": { "indexHint": 1 },
  "prefixSha256": "494964a82108011a8de580c883c4f11286730c8ddb1ef34d1c52131b8c5dd5ff"
}
```

The helper tests prove deterministic output; repeated identical messages remain position-sensitive; insertion/deletion/continuation, author or selected-swipe changes, and same-length text replacement change the prefix hash; a copied identical prefix has the same digest with a different chat ID; unresolved authors are explicit; and a missing user-store key is rejected. Duplicate display names are represented by distinct synthetic scope keys; this proves representation behavior, not host resolution. Any canonical transcript change changes the digest; normalization or host-specific message/swipe representation still needs a pinned adapter contract.

## Host probes and save semantics

The native Character Management UI created two cards both displayed as `Mira`; SillyTavern assigned distinct avatar filenames (`Mira.png`, `Mira1.png`). Their synthetic file hashes were respectively `c2fc23b949557076405e2ed77b17e2fa825f3ed5a2e627e04862582352488273` and `840121ffcdc51f35a10325bd4dd6f44edef91910cd3e27b672d2e741952a2acd`. This shows the host distinguishes these created files despite duplicate labels. It does not prove stability under rename, duplicate/import replacement, index reorder, group replies, or character/group transitions; those operations were **NOT_TESTED**. No stable card binding is approved by this evidence.

The host-storage probe posted synthetic chat records with the same random run-specific filename under `Mira.png` and `Mira1.png`, but with a different persisted message marker per owner. It read back and verified each owner's distinct marker. It renamed owner A's chat and verified owner A's record remained intact while owner B's original record remained unchanged, then renamed owner A back. A native empty chat header was also created during earlier UI setup. Temporary Chat was opened through the native UI; source confirms its session-only restore mechanism. Branch/copy was inspected in source, not performed as a live host operation; import was not exercised.

The three regression tests in `owned-chat-probe.test.mjs` simulate pre-existing chat and asset name collisions plus a partial chat-write failure. Collision cases assert the probe refuses before writing, leaves the pre-existing record/asset intact, and makes no cleanup deletion. The partial-write case proves cleanup receives only successfully created chat records. The host probe independently uses a fresh process/root and random names, so the negative tests do not substitute for that isolation guard.

The requested controlled A→B and A→B→A save races were **NOT_RUN**. Source inspection already shows why the public seam cannot prove safe persistence: the debounce omits chat ID and returns before completion, then invokes a saver that targets whatever is active later. No instrumented test was added because the permitted public seam cannot direct metadata to the intended chat or reliably report completion; a mocked helper would not establish actual host writes. The exact required follow-up is a host-supported targeted save operation with explicit owner/chat input, ownership recheck at write time, and a completion/error result, followed by actual stored-record race tests. Until then, durable visual metadata persistence is blocked. No visual data was written into canonical messages or card fields.

## Assets and writer exclusion

The host API probe uploaded a 1×1 grayscale-alpha PNG (`168f79d81e75820ed8c17775ca48248b57d783c0df951ca50065fc34b3b0622c`), read it from the fresh process's `default-user/backgrounds` directory, and listed it through `/api/backgrounds/all`. Uploading a second 1×1 red PNG (`4ff6ab670a58c14270e034e2090d9a432caa263a14e0a25785386b0c12f880b5`) under the same run-owned name replaced the first file; the listing contained one matching filename. The probe verified the host settings file hash was unchanged and chat metadata had no asset bytes. It deleted only the successful run-owned asset and chat names, stopped its child server, and discarded that run's fresh data root. Missing/corrupt inputs, dimension/size ceilings, immutable revisions, character assets, general asset endpoint import/export, and chat export contents were **NOT_TESTED**. These tiny fixtures do not establish an acceptable content policy or actual limits.

Proposed ceilings for owner review only: raster PNG/WebP for transparent character sprites and PNG/WebP/JPEG for backgrounds; maximum dimension 4096×4096, maximum 10 MiB per file, and 256 MiB total library budget. These are unmeasured proposal values, not observed host constraints or approved product behavior. Library choice and validation rules remain a separate bounded decision. Chat transcript export and visual asset export are separate boundaries until a specific host-supported export operation proves inclusion. Do not adopt browser-local storage as fallback; the earlier owner decision requires separate approval.

### Candidate contract for a future extension-owned asset store

This is a proposal for owner review, not a claim about a supported SillyTavern API. Store records should be namespaced by the verified host `userStoreKey` and a fixed extension ID; each logical `assetId` is extension-generated and unique within that namespace. Each immutable revision should carry a SHA-256 content digest, validated media type, dimensions/byte length, and an opaque storage locator. Replacing an asset creates a new revision and updates the logical asset's current-revision pointer; it must never overwrite bytes at a prior revision locator. Chat/scene metadata may refer to `{ extensionId, assetId, revisionSha256 }`, but should not embed asset bytes or trust a model-supplied path/URL. Delete should only remove records owned by that extension namespace, and should preserve revisions still referenced by scene records (or use an explicit tombstone until reference cleanup is proven).

Import should validate actual decoded file type, dimensions, and byte size before accepting; then hash stored bytes and verify the hash on read. Missing files, corrupt bytes, hash mismatches, unsupported formats, quota exhaustion, and write errors should surface as typed failures, leave the previous current revision intact, and degrade visual presentation without blocking host chat. The proposed raster formats and ceilings above need owner acceptance and measured implementation behavior before they can become limits. The probe established none of these guarantees.

### Candidate single-writer contract

For cooperating extension tabs on one origin, use a Web Lock scoped to the verified user store and visual-state namespace. Inside the exclusive lock, reread the authoritative revision, verify owner/scope and expected base revision, then commit a new revision atomically; stale base revision means refuse/reload instead of last-writer-wins. Keep the lock held through confirmed persistence, then release it on success or failure. If Web Locks or the backing store's atomic commit are unavailable, refuse visual persistence while leaving native chat use available. This mechanism is only a candidate: this probe tested Web Locks acquisition/release/recovery in two fixture tabs, not SillyNovel storage, native chat interaction, or crash-safe atomic asset writes. It does not coordinate other origins, browser profiles, accounts, or devices; cross-device writes need a host-provided revision/CAS seam or must be refused.

The writer fixture at `tests/probes/dyl19/writer.html` used `navigator.locks` with two same-origin tabs in the isolated browser context and a `localStorage` record. Both A and B now reread, validate, and advance the record while holding the exclusive lock: A requires empty state then commits revision 1; B requires A's exact revision-1 record then commits revision 2. In the release scenario, B queued while A held the lock; after A released, B acquired and reread A's record before writing its next revision. In the owner-close scenario, B queued while A held the lock; closing A's tab released the lock, and B acquired and reread the stored A record before advancing it. Both scenarios passed. This is evidence for coordination of cooperating tabs sharing the same origin/storage context and Web Locks implementation. Crash semantics are approximated by closing the owner tab, not browser/process crash. Profiles, accounts, devices, unsupported browsers, and competing native SillyTavern operations were not covered. The fixture did not wrap ordinary chat or extension writes, so native chat availability/writer interaction is unproven.

## Outcome, integration, and cleanup

This report recommends a compound host-scoped locator plus an independently versioned canonical source-prefix digest. The host adapter should expose verified owner/scope/chat identity and a targeted, ownership-checked save that resolves only after successful persistence. Until those seams and account separation are proven, unresolved identity must refuse binding and visual persistence remains blocked. A host-owned asset API with immutable revision semantics is still needed before asset library or export work. The Web Locks fixture is a candidate for same-origin cooperating extension tabs only, not a cross-device conflict protocol.

Evidence unblocks review of DYL-17's transient text-reader lane only; it does not authorize durable persistence, asset-library implementation, migration, reader UI, director, providers, a server plugin, or Gate A. For DYL-17 integration, proposed shared summary: “Pinned SillyTavern exposes current-session character/group/chat locators but no explicit public account key or stable character UUID. Its metadata debounce does not capture chat ID and resolves before persistence; current metadata save targets whichever chat is active. Keep durable visual writes blocked pending a targeted ownership-checked save seam. Host background files are user-scoped mutable names, not extension-owned immutable assets. These findings do not block transient text-reader work.”

Each host-storage run owns its process, random loopback port, random chat/asset names, and fresh temporary data root; the probe removes only tracked resources before stopping that process and deleting that root. The browser writer server and fixture tabs were also task-owned and cleaned after evidence capture. No DYL-17 host/profile/chat/endpoint was used or changed. The pinned clone used for reproduction is removable after the checks; runtime data and any host-created backups are discarded only within the probe-created root.
