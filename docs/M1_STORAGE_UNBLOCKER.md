# DYL-21: Safe saves and owned asset storage

**Status:** investigation complete; targeted persistent visual saves and an extension-owned asset library remain **BLOCKED**. No production persistence, asset library, host fork, server plugin, or browser-local fallback was implemented. DYL-21 is **In Review** with [PR #9](https://github.com/Sonoran-Solutions/SillyNovel/pull/9) open and unmerged.

## Scope and exact heads

| Item | SHA / state |
| --- | --- |
| Fetched `origin/main` before work | `d253ce597532d6193b00401d30c173473d0f1de7` |
| DYL-21 work branch base / tested SillyNovel candidate | `d253ce597532d6193b00401d30c173473d0f1de7` |
| Pinned SillyTavern | 1.19.0, `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
The investigation read the current DYL-21 and completed DYL-19 Linear records, the repository instructions, README, status, roadmap, decisions, architecture, M1 plan, identity/storage contract, state/director contract, asset/provider contract, and testing guide. Work is on `research/dyl-21-storage-unblocker`; it does not touch DYL-20 source/tests or shared `STATUS.md` / `TESTING.md`.

## Evidence and reproduction

Evidence labels mean:

- **SOURCE_INSPECTION** — asserted against the exact pinned source and its SHA-256.
- **HOST_TESTED** — request sent to the child SillyTavern process started by this probe; the actual stored files were read back.
- **SYNTHETIC** — generated fixture or cooperating-tab simulation, not SillyTavern persistence.
- **BLOCKED** — the required contract cannot be safely established from the inspected/available seam.
- **NOT_TESTED** — no runtime evidence; no inferred pass.

Reproduce from this branch with a separate disposable host checkout:

```sh
git clone https://github.com/SillyTavern/SillyTavern.git /tmp/SillyTavern-dyl21
git -C /tmp/SillyTavern-dyl21 checkout 7e8663cd9c184a550b37238218bdd32c6efc68e9
(cd /tmp/SillyTavern-dyl21 && npm ci)
node tests/probes/dyl21/source-inspection.mjs /tmp/SillyTavern-dyl21
node --check tests/probes/dyl21/source-inspection.mjs
node --check tests/probes/dyl21/host-target-probe.mjs
node tests/probes/dyl21/host-target-probe.mjs /tmp/SillyTavern-dyl21
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/probes/dyl19/source-anchor.test.mjs tests/probes/dyl19/owned-chat-probe.test.mjs
```

The host probe uses a new temporary data root, random run names, a newly reserved loopback port, a child process owned by the probe, and synthetic records only. It waits for that child to announce the data root and loopback listener. It preflights its names, records created resources, only requests deletion for those names, stops its child, and removes only its newly created data root. No browser, real chat, provider endpoint, credentials, shared data root, or DYL-20 process was used. The first probe attempt treated the host's empty-chat `{}` response as invalid and stopped before any record write. A second attempt completed the chat checks, cleaned those records, then found that the harness JSON-encoded `FormData` and got HTTP 400 before uploading an asset. Both harness issues were corrected. The final run passed; no failure was counted as host evidence.

`npm ci` completed on the pinned host and reported 64 dependency audit findings (1 low, 29 moderate, 30 high, 4 critical); no audit remediation was run. The Node version was `v26.8.1`, npm `11.19.0`.

Final host run ID: `bbaf63c3-4b70-4341-acf3-816266f8c5e4`. Result: `HOST_TESTED`; explicit chat save returned HTTP 200 / `{ok:true}`, stale same-token record was accepted, invalid body returned 400, same-name background bytes were replaced, and settings remained unchanged.

### Source inspected

The source inspector emits these hashes at runtime; they matched the recorded DYL-19 hashes:

| Pinned SillyTavern file | SHA-256 |
| --- | --- |
| `public/scripts/st-context.js` | `5a91ce36a343041c81351953baba10a54a7576f15571c01ef1af8c19bcc0e30d` |
| `public/scripts/extensions.js` | `f5ee3fee55d52e8b7041ceafb260dba5a2b2dada53081f930045ab8b6447d30d` |
| `public/script.js` | `955c603d0bad84bac5a716f0818d85c2543e44d4c43878e0d63ef1e55ca91855` |
| `public/scripts/bookmarks.js` | `5c3a68aa82e58c0d82777065b8466572fc1b202cad98a92ba4daa852c386ad1b` |
| `public/scripts/chats.js` | `2b870d44c55f99c622b5afcd7b1fd563219b9444bc70e8653611327d6e7f7be6` |
| `src/endpoints/chats.js` | `40012ebc71a75357e62f7532e5b20def0d8b6c132bb6ab48f662993cc97b9063` |
| `src/endpoints/assets.js` | `890a4fe32ca20d24b0c1aa178e0e9c6b3de82f64f51b01d3f3766105b9fb4b8a` |
| `src/endpoints/backgrounds.js` | `9694644c52046bba0540c8835caa2fcc1e1cb829449fae72f69110aafe06cf46` |
| `src/util.js` | `d33d67234af4e188bb7fcfac9c3ca7952c19e8c58791e96b19f9ad748dd168cd` |

The probe fixtures are the existing 1×1 PNG (`168f79d81e75820ed8c17775ca48248b57d783c0df951ca50065fc34b3b0622c`) and red 1×1 PNG (`4ff6ab670a58c14270e034e2090d9a432caa263a14e0a25785386b0c12f880b5`). Their tiny size tests byte preservation only, not product limits or image-policy support.

## Findings

### Identity and scope

**SOURCE_INSPECTION:** `getContext()` exposes the current character array index, group ID, and chat ID/name. The individual chat ID is the current `.chat` name; group chat identity uses the current group chat ID. The context also exposes an `accountStorage` object, but no explicit verified account/profile key or stable character UUID. An index, display name, avatar filename, or identical image bytes cannot be promoted to a durable character identity.

The chat routes resolve under `request.user.directories.chats` and select a character directory from `avatar_url`; thus the server request is scoped to the host user's current authenticated session. That server-side scope is not an extension-visible stable user key. A new data root creates only the default host user, so **distinct host users were not exercised**.

**HOST_TESTED:** two synthetic card-directory names with the same chat filename stored and read back distinct markers. This verifies the low-level route's directory separation for two selectors within one host user; it does not prove that those selectors are stable card identities. **SOURCE_INSPECTION:** native branch creation copies a prefix snapshot and assigns a fresh integrity token; rename/copy/import may change the filename. Temporary Chat uses a `sessionStorage` neutral-chat record and has no durable chat filename. DYL-19's actual UI probe verified duplicate display labels and Temporary Chat behavior in its isolated browser context, but did not establish durable identity.

Duplicate usernames across host users, card rename/duplicate/replacement/import lifecycle, group membership churn, chat import identities, branch identity recovery, and Temporary Chat persistence are **NOT_TESTED** in this DYL-21 host run. Their required persistent keys remain unavailable in the inspected public context.

### Targeted save and acknowledgement

**SOURCE_INSPECTION:** public `saveMetadataDebounced()` captures group ID and character index, not chat ID; its timer invokes active-context `saveMetadata()` and the helper returns before that callback finishes. `saveMetadata()` accepts no target. `saveChatConditional()` selects whichever chat/group is active when it runs and catches/logs errors, so its resolved promise does not prove persistence. A queued A write followed by A→B can therefore be applied to B if the same group/character selectors remain valid; A→B→A is also not guarded by a captured visit/session epoch. These race outcomes are a source-based risk, not a reproduced UI host race.

The low-level `/api/chats/save` route accepts explicit `avatar_url`, `file_name`, and a full chat array, scopes its path to the current authenticated host user, and returns `{ ok: true }` after its write call. The call path uses `write-file-atomic` synchronously before the response. It reports malformed input as HTTP 400 and integrity mismatch as HTTP 400. This is an internal route used by the host, not a documented extension storage contract. It writes the whole JSONL chat, not a namespaced metadata patch. Its integrity check compares the current record's stable `chat_metadata.integrity` token to the token in the submitted first record; it is not a monotonically changing record revision or compare-and-swap.

**HOST_TESTED:** the explicit route returned HTTP 200 / `{ok:true}` and the actual JSONL record read back as submitted. Two synthetic card directories with the same filename stayed distinct. A subsequent stale whole-array write carrying the same integrity token was also acknowledged and replaced a newer extension metadata marker. Invalid non-array chat input returned 400. This demonstrates why completion acknowledgement alone is insufficient: the endpoint can complete a write to a supplied path, but cannot refuse same-generation stale writes, and it requires resubmitting canonical message data. No real host UI queue, A→B or A→B→A context switch, forced integrity bypass, file-system failure, interrupted request, or rename-during-save was tested.

**Decision: BLOCKED.** No available public extension API meets all six requirements together: explicit verified target, server-side ownership revalidation, extension-only patch, completion/error result, stale-write refusal, and no canonical chat rewrite. The low-level route is not a safe adapter substitute.

### Asset ownership and storage

**SOURCE_INSPECTION:** background upload sanitizes an uploaded filename, copies bytes into the current host user's mutable `backgrounds/<filename>` path, and then attempts metadata generation. Re-uploading the same filename copies over the prior bytes. Image metadata generation errors are logged and do not fail the upload response. Asset download validates a filename/category and imports a configured remote URL into a mutable category filename; delete removes that category filename. There is no SillyNovel namespace, immutable revision locator, create-if-absent operation, SHA-256 contract, decoded format/dimension/byte limit contract, or extension-only deletion guard.

**HOST_TESTED:** an explicit 1×1 PNG upload was read back with matching SHA-256 and listed by the background endpoint. A second upload with the same random run-owned filename replaced its bytes; the listing still had one matching name. The host settings hash was unchanged. Cleanup deleted only that run-owned filename before discarding the fresh test root. The endpoints can store/read/remove the exercised small background, but do not prove library ownership or revision immutability.

The probe did not exercise PNG transparency beyond the existing tiny fixture, static WebP, JPEG, corrupt/unsupported files, MIME spoofing, dimensions, byte ceilings, filename traversal attempts, collision with a pre-existing record, interrupted/partial upload, export/import inclusion, asset sharing, or other host users. These are **NOT_TESTED**. No maximum library or file limits are proposed here as measured constraints or product policy. Chat metadata contains no image bytes; the test settings file remained unchanged.

### Single writer

DYL-19's same-origin browser fixture used two tabs, Web Locks, and a `localStorage` revision record to exercise exclusive acquisition, reread-under-lock, queued writer behavior, and owner-tab closure. Classify this **SYNTHETIC cooperating-tab evidence** only. It did not use SillyTavern chat storage or writes and does not establish cross-origin, cross-profile, cross-account, cross-device, crash durability, or native-chat writer coordination. A real backend still needs atomic revision/CAS or equivalent stale-write refusal, and must acknowledge persistence before a lock can be released. Other tabs can keep ordinary chatting only if visual writes are isolated from their host-chat saves.

## Architecture comparison

| Option | Ownership and target | Ack / stale writes | Assets and portability | Compatibility, risk, decision |
| --- | --- | --- | --- | --- |
| **A. Existing public extension APIs** (`getContext`, `saveMetadataDebounced`, extension settings) | Current session exposes locators, not durable user/card keys. Metadata save targets active chat; extension settings are user-level, not chat-targeted. | Debounce has no completion result; save errors are swallowed. No record revision/CAS. | Settings/chat metadata cannot hold image bytes. No extension-owned immutable asset API. Export behavior for extension state/assets is unproven. | Source-inspected; does not satisfy target or ownership contract. No safe persistence choice. |
| **B. Existing host routes as a narrow extension adapter** (`/api/chats/save`, backgrounds/assets endpoints) | Server implicitly scopes to authenticated host user; chat route takes card filename + chat filename. Stable identity and an approved public extension contract are absent. | Chat route acknowledges writes and reports some HTTP failures, but accepts whole chat arrays and same-token stale writes. Background upload overwrites by filename. | Background file bytes can be read back; same-name overwrite is HOST_TESTED. No immutable extension namespace, content digest guarantee, or export/import contract. | Strongest existing host-side substrate, still unsafe for durable scene writes/library. Requires a separately approved host contract before use. |
| **C. Add a narrow supported storage capability** (preferred proposal) | Host returns an opaque user/store key and stable card/group/chat instance IDs, and accepts an explicit target plus an ownership token. | Namespaced patch write with expected revision/CAS, stale refusal, and typed completion/error after durable write. | Host-owned create-if-absent immutable asset revisions keyed by digest, scoped read/remove, and explicit export/import of referenced bytes. | Best fit without a fork or required external service, but needs upstream host API support and owner approval. Compatibility is pinned/versioned and requires maintenance tests. |
| **D. Separately approved service/backend** | Service must authenticate the user and receive stable host scope/target identifiers; browser sends no secrets or arbitrary paths. | Service must implement revision/CAS and durable acknowledgements itself. | Service owns immutable assets and export/import, with account separation and retention. | Possible alternate only after a separate owner decision and privacy/security review. Adds deployment, credential, sync, and maintenance scope; not authorized here. |

Option C is the recommendation for a future decision proposal, not an approved architecture or implementation authorization. No browser-local fallback is selected; earlier owner decisions require a separate explicit proposal and approval for that boundary.

Concurrency and trust boundaries by option: **A** has no verifiable save target, revision, or writer scope, so a tab switch cannot be rejected and cross-profile/device behavior is undefined. **B** binds a request to the host user's authenticated route and explicit path, but overlapping same-token writes are last-writer-wins; Web Locks would coordinate only cooperating same-origin tabs, not host routes from other tabs/profiles/devices. **C** should scope every target to the authenticated host owner and extension namespace, require CAS at the storage layer, and use Web Locks only as an extra same-origin guard; cross-device writes are safe only if that same CAS service is shared. **D** must enforce account isolation and CAS in the service; sync across profiles/devices is possible only if deliberately designed and exported, while adding endpoint, retention, and credential risks. None of B–D has a proven chat-export/import portability path in this evidence.

## Proposed minimum contract and remaining decisions

Before persistent visual choices, the host integration needs:

1. Opaque, host-issued user/store key plus stable character/group/chat instance IDs. Filenames and display data remain locators only; rename/branch/import produce explicit identity relationships or new IDs.
2. A targeted write request containing extension namespace, target IDs, expected revision, and namespaced visual patch. The host revalidates the authenticated owner and target, refuses stale/missing/corrupt records without touching canonical messages, and returns the committed revision only after persistence completes.
3. A separate user-scoped asset API with create-if-absent immutable content revisions, SHA-256-verified readback, validated decoded raster type/size/dimensions, and deletion restricted to the extension's namespace and unreferenced records.
4. Defined export/import behavior for visual records and the image bytes they reference. Until supported, portability is limited to the same verified host store; no device-sync claim.
5. Multi-tab policy: Web Locks only as an optional same-origin exclusion for cooperating extension tabs. Backing storage supplies atomic CAS independently. When either is unavailable, refuse visual persistence while leaving chat usable.

Owner decisions required: whether to request a supported host API change or separately evaluate a backend; which verified identity survives character/chat rename, duplicate, branch, import, and Temporary Chat; what export/import portability is required; and which decoded raster formats/size/dimension/library limits are product policy. Do not decide these based on the current route behavior.

## Downstream impact

| Area | Safe next step based on this evidence |
| --- | --- |
| **DYL-22: asset importer** | A persistent owned library/import-manager remains **BLOCKED**. The host can accept small background bytes, but mutable names and no extension ownership/revision guarantees are insufficient. |
| **DYL-23: manual scene renderer** | Transient, visibly unsaved scene selection can proceed independently if separately authorized and uses user-selected in-memory image bytes or session-only references. It must not silently rely on the background upload as durable storage. |
| **M1.3: saved visual state** | **BLOCKED** pending the identity, targeted revision/CAS save, completion/error, and asset portability contracts above. No reload/branch/device durability claim is safe. |

No DYL-22, DYL-23, M1.3, Gate A, or M2 work was started by this investigation. Suggested follow-up: a bounded owner decision on the minimum host storage API (including account and export semantics), then a host-maintainer feasibility issue; only after that decision should a separate authorized implementation ticket be opened.
