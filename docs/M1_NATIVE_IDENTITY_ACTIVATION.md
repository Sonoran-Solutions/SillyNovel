# DYL-27: Native chat identity and activation proof

**Recommendation: REVISE.** A host-owned registry can preserve newly allocated character-chat identity through native save, rename, deletion/recreation and process restart. Native browser selection can revoke visits and reject delayed visual CAS. This experiment demonstrates those bounded paths, but does **not** establish the complete native identity/source/activation contract needed for production persistence.

[DYL-27](https://linear.app/devils17/issue/DYL-27/sillynovel-m12-f-prove-native-chat-identity-and-activation-lifecycle) follows completed DYL-26 / merged [PR #13](https://github.com/Sonoran-Solutions/SillyNovel/pull/13). This assignment authorizes only disposable host experiments and an open/unmerged SillyNovel PR. The accepted DYL-24 stage remains unchanged and session-only. DYL-22/23 remain blocked, M1.3 is unauthorized, and **Gate A remains NOT_RUN**. No upstream request, permanent fork, required plugin or release architecture is approved.

## Baseline and reproducibility

| Item | Actual value |
| --- | --- |
| Original clean working checkout | `a95f33771b4e008d4c811dc453cb735f4ca95719` |
| Fetched starting main; PR #13 merge | `d2b8be02e3d29bab18a1b5f56e50f2e6aca03f21` |
| Separate branch | `research/dyl-27-native-identity` |
| Frozen proof SHA | `d1a46a6be7dfdaf02e4c1020adb3b555bbdb811b` |
| Pinned disposable host | SillyTavern 1.19.0, `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| System | Ubuntu 24.04.5 LTS; Node v26.8.1 |
| Browser | Headless Chromium 151.0.7922.34; fresh owned context |
| Provider | Generated deterministic loopback HTTP responder; no real model or credentials |

Final pushed head belongs in the PR/Linear handoff, not in its own commit. Subsequent report/evidence commits do not change the frozen proof. Source inspection covers pristine pinned bytes, with exact file hashes and line references in [source-inspection.json](evidence/dyl27/source-inspection.json). No production SillyNovel files change.

The reproducible host modification consists of [host-mount.patch](../tests/probes/dyl27/host-mount.patch), [host-storage.mjs](../tests/probes/dyl27/host-storage.mjs) copied to `src/dyl27-storage.mjs`, and [host-visit.js](../tests/probes/dyl27/host-visit.js) copied to `public/scripts/dyl27-visit.js`:

| Component | SHA-256 |
| --- | --- |
| Patch | `a30ddf37b47c99d3db0e575df339e8fe3411b97914551a1351f9d0d6e312c6aa` |
| Server module | `1c422799e2e4d8db1e225b1f411e559a0835f776686a54946ba60bb4b135f020` |
| Browser module | `85e045142c6e1e3955ef86f80aff308271509e5e3958eaaeb9280eca3b46c035` |

Use the [runner](../tests/probes/dyl27/host-probe.mjs), not a user installation. It verifies the host SHA, clones tracked files into its own `mkdtemp` checkout, applies the patch with `git apply --check`, copies the two modules exclusively, and links the supplied disposable host's installed dependencies. It never launches the supplied checkout or copies its data/config. The server mount requires a run UUID and matching fresh-data-root ownership marker. Server hooks are experimental, not an existing SillyTavern extension API. The disposable browser patch is always loaded in that checkout; it is not an optional installation package.

Commands actually executed from the focused worktree:

```sh
git fetch origin main
git rev-parse origin/main
gh pr view 13 --json state,mergedAt,mergeCommit,url
node --check tests/probes/dyl27/host-storage.mjs
node --check tests/probes/dyl27/host-probe.mjs
node --check tests/probes/dyl27/host-visit.js
node tests/probes/dyl27/source-inspection.mjs /tmp/SillyTavern-m12-review > docs/evidence/dyl27/source-inspection.json
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-source-prefix.test.mjs tests/probes/dyl19/*.test.mjs > docs/evidence/dyl27/node-tests.txt
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test tests/m1-reader-browser.test.mjs > docs/evidence/dyl27/browser-tests.txt
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl27/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl27-final-aba
git diff --check
```

For another run choose a **nonexistent** output directory. Installed dependencies and Chromium are prerequisites, not newly added SillyNovel dependencies. The host and generated responder bind only to loopback on OS-selected ports; there is no arbitrary host URL input. Native accounts, duplicate-name cards, messages and import bytes are synthetic. The runner has bounded HTTP/browser requests and a 60-second startup deadline, closes its own browser and responder, stops only its child host, validates its marker, removes only its owned tree, and compares the supplied checkout's Git status before/after. Existing output directories refuse before resource creation. There are no paid image calls; cards use the host's default avatar.

## Native source ownership

Line numbers below refer to the **unpatched** pinned commit. The machine-readable source inventory includes exact SHA-256 values and matching source lines for every listed file.

| Native location | Ownership and effect |
| --- | --- |
| `public/script.js:7634–7752`, `10618–10648` | Browser `getChat`, `getChatResult`, `openCharacterChat`, `doNewChat`: choose mutable card/chat locators, fetch the transcript, generate an initial greeting and save new chats; emit `CHAT_CHANGED` after rendering/save. |
| `public/script.js:1586`, `10746`, `10922` | `clearChat`, `closeCurrentChat`, `newAssistantChat`: browser view transitions; Temporary Chat can clear/render without a `CHAT_CHANGED` event. |
| `src/endpoints/chats.js:532–570`, `src/util.js:1514` | Server `trySaveChat` checks native integrity then calls synchronous atomic file replacement. Both character and group save callers were inspected and patched; existing host unit-test callers omit the new optional root and retain native behavior. Integrity slug is not a changing source or visual revision. |
| `src/endpoints/chats.js:594–679` | Native get is filename-located; rename copies then unlinks; delete removes the located file. The server is authoritative for these filesystem operations, but originally has no durable instance registry. |
| `public/scripts/bookmarks.js:185–245`, `255–298` | Native branch/checkpoint snapshots and fresh integrity slugs originate in the browser, then use the normal character/group save route. A new filename alone does not establish semantic ancestry. |
| `src/endpoints/chats.js:750–869` | Group import copies an upload; character import converts JSON or copies/flattens JSONL. These bypass `trySaveChat`; imported metadata is untrusted. |
| `src/endpoints/characters.js:1024–1100`, `1416`, `1560–1643` | Native create, rename (including chat-directory move), delete, import/replacement and duplicate are separate server paths. Avatar filenames and duplicate labels do not establish durable character instance identity. |
| `src/endpoints/groups.js:156–232`; `public/scripts/group-chats.js:2148`, `2219` | Server creates time-named group metadata and replaces it on membership edit; browser chooses group chat locators and updates chat lists. No experimentally enrolled group scope exists. |
| `public/scripts/chats.js:1855–1879` | Neutral/Temporary Chat preservation uses sessionStorage and is not a durable chat instance. |
| `public/script.js:8405–8431` and swipe event sites in the inventory | Native editor, swipe and regeneration remain host-owned; messages/source revisions must be tracked independently of chat identity. Native edit and ordinary send/reply are exercised; swipe/regeneration on this patch are NOT_TESTED. |
| `src/users.js`, `src/server-main.js:248` | Existing authentication resolves the user's root. The experimental API mounts after login enforcement and retains native CSRF/cookie-session handling. |

A browser event is only an observation. This proof does not use `CHAT_CHANGED` as server write authority. The source inventory is **SOURCE_INSPECTION**, not evidence that all listed operations were tested.

## Registry and transaction experiment

The registry is host-owned under each resolved user root at `sillynovel-dyl27/identities.json`. It contains a random `storeId`, native-created character `scopes[{avatar, scopeId}]`, `chats[{relativePath, scopeId, chatId, seal, deleted?}]`, and a `pending` mutation intent. Each chat's independent visual file is `<chatId>.json`, containing `{storeId, chatId, revision, record:{background}}`. Actual registry and raw record snapshots are retained in [results.json](evidence/dyl27/results.json).

These identities are distinct:

- **Store ID:** minted once when the user's first experimental character scope is created; survives process restart. Authenticated root, not client input, selects its namespace.
- **Scope ID:** random UUID allocated following successful native character creation. Duplicate display names receive different scopes. This is not a complete character lifecycle implementation.
- **Chat ID:** random UUID allocated inside the first hooked native save for a nonexistent file under a registered scope. Existing files are never adopted by lookup, hash or imported ID. Copy/branch creation through that save receives a fresh UUID.
- **Locator:** server-private relative filename mapping, updated on native rename. It locates an already allocated instance; it is not the durable ID. The experimental activation request may propose a locator, which the server must resolve against its registry and revalidate.
- **View token:** random in-memory UUID for one accepted activation of one authenticated client. Returning to the same chat produces a different token; restart invalidates all clients/visits.
- **Source identity/revision:** **not supplied by this registry**. Native integrity and the drift seal are not canonical message identities. The existing SillyNovel source-prefix contract remains separate and no production source binding is added.
- **Visual revision:** integer CAS counter in the extension-owned record. Native edit changes canonical bytes and the drift guard while preserving chat ID and visual revision; a successful visual CAS increments only the visual revision.

The DYL-26 seal is retained solely as an **out-of-band drift guard**, refreshed by authorized native lifecycle hooks. It does not allocate, recover or equate identities. A native edit's atomic inode/content replacement now preserves the UUID because the host executes an explicit registry transition. An external replacement without a hook still refuses. This is a bounded local-filesystem assumption, not protection against hostile filesystem writers or inode replay.

The synchronous mutation section persists a pending intent, performs the native save/rename/delete, then updates mapping/seal/tombstone and clears the intent. No request can interleave in this section in one process. Rename preserves UUID and visual bytes; recreation at the old name allocates a new UUID. Delete tombstones the old instance; byte-identical recreation cannot inherit it. Visual CAS writes only its own file and never calls a canonical saver.

An injected interruption after the canonical save and before registry finalization leaves a pending intent on disk. Restart **refuses the entire visual store** instead of guessing which mapping is correct. Normal native saves continue while identity is unresolved. This proves fail-closed process-restart behavior at one boundary, **not automatic recovery** or power-loss durability. Whole-store refusal is deliberately conservative and is not a proposed user experience.

Unsupported native character rename/delete/import/avatar-replacement routes conservatively disable known scopes before continuing. Character duplicate is not enrolled. Their identity preservation and failure handling are NOT_TESTED. Group save/create/edit work normally, but cannot acquire durable visual authority. Registry I/O failure, unsupported bypass routes, backup restore and character-create overwrite require a complete lifecycle/recovery design; this experiment must not be shipped.

## Activation and race contract

`client` issues an in-memory handle bound to the authenticated user and cookie session. `activate({clientId, sequence, locator})` accepts only a strictly increasing safe integer sequence. It revokes the old visit before resolving the new locator; null means no persistent view. Invalid/unresolved newer intents leave the client inactive. Older/equal intents return `STALE_ACTIVATION` without displacing the newer activation.

The disposable browser hooks `clearChat` and character `getChat`. It increments a local epoch synchronously, clears its target, sends an ordered inactive intent, and later sends the captured locator after the native load/render/save completes. Separate sequence values reserve begin/finish ordering. A completion applies only if its captured epoch is still current. Network failure leaves the browser without a visual target; the added fetch has a five-second timeout. This adds latency to native loading and is one reason to replace the hook with a proper host load/activation capability before release.

Read/CAS require all five UUID fields (`storeId`, `scopeId`, `chatId`, `clientId`, `viewToken`). The server rechecks authenticated store/session, known live mapping, drift guard and current visit. CAS rechecks after its deterministic barrier and compares the on-disk visual revision immediately before synchronous atomic replacement. It never selects the write destination by looking up whichever chat is active on arrival. A network-delayed revocation cannot retarget an old write: the write still names its original chat. Immediate rejection is demonstrated after the server receives the new intent, not before network delivery.

The native UI run selects card A, B, A through actual character controls. New chats originate from native `getChatResult` saves. The same chat ID returns with a new visit token. A CAS held on the server across native A→B→A returns `STALE_VIEW` and leaves records unchanged. A second test holds a successful activation response, navigates A→B→A, then releases the older acknowledgement; the local epoch discards it and the newest A visit remains. HTTP tests separately submit older activation sequence numbers and overlap two CAS requests, proving server-side refusal/conflict independently of cancellation.

**Remaining activation gap:** the native `/get` response is still a transcript array, not a server-issued `{chatId, sourceRevision, loadRequestId}` envelope. The patched loader captures a locator but the rest of the host still reads mutable globals around asynchronous work. The barrier test delays the experimental activation acknowledgement, **not every possible native transcript-load interleaving**. No authoritative binding from the loaded canonical source to the granted visit is established. This gap prevents GO even though the tested visit races pass. Browser state cannot be promoted to a trusted source revision.

## Result matrix

Labels describe the actual evidence, not the desired final contract. **SYNTHETIC** tests do not become native evidence; browser function invocation is distinguished from clicking its menu control.

| Required case | Result and evidence class |
| --- | --- |
| Unique IDs for new chats | PASS — EXPERIMENTAL_HOST native create/save endpoints; NATIVE_HOST_UI initial selected-card chat creation |
| Stable ID on native rename | PASS — EXPERIMENTAL_HOST `/api/chats/rename`; bytes preserved, locator updated; rename dialog NOT_TESTED |
| Stable ID on edit/save | PASS — EXPERIMENTAL_HOST atomic save and NATIVE_HOST_UI message editor; visual revision unchanged |
| Copy/branch gets a separate ID | PASS — EXPERIMENTAL_HOST native `createBranch(0)` invoked in real browser and native save with copied bytes. Branch menu/copy UI NOT_TESTED |
| Imported IDs untrusted | PASS for refusal — EXPERIMENTAL_HOST multipart JSONL import with embedded existing ID; no adoption. Fresh-ID import allocation BLOCKED |
| Deleted/recreated filename | PASS — EXPERIMENTAL_HOST native delete/save, identical bytes and distinct IDs, old CAS refused |
| Actual native A→B→A | PASS — NATIVE_HOST_UI card controls; stable IDs, fresh tokens |
| Delayed old-view CAS | PASS — NATIVE_HOST_UI switch plus host barrier; HTTP A→B and A→B→A also EXPERIMENTAL_HOST |
| Out-of-order activation | PASS — EXPERIMENTAL_HOST old sequence refusal and NATIVE_HOST_UI navigation with delayed acknowledgement. Arbitrarily reordered native transcript responses NOT_TESTED |
| Two authenticated users | PASS — EXPERIMENTAL_HOST same avatar/filename/content, independent stores and cross-store refusal |
| Restart | PASS — EXPERIMENTAL_HOST persisted native IDs/visual bytes; old clients refused |
| Invalid/stale client or visit | PASS — EXPERIMENTAL_HOST refuses without modifying records |
| Identity/visual record mismatch | PASS — EXPERIMENTAL_HOST fault injection refuses, does not repair |
| Temporary Chat | PASS for revocation — EXPERIMENTAL_HOST actual `closeCurrentChat`/`newAssistantChat({temporary:true})` in browser; menu UI NOT_TESTED |
| No unintended canonical mutation | PASS within measured scope — canonical JSONL hashes at checks; native edits/send/rename/delete explicitly distinguished |
| Interrupted registry update | PASS for refusal after restart — EXPERIMENTAL_HOST injected stop of registry finalization; automatic recovery BLOCKED; machine crash/power loss NOT_TESTED |
| Group creation/membership | Native endpoints work; durable identity BLOCKED — EXPERIMENTAL_HOST refusal; group UI NOT_TESTED |
| Character rename/duplicate/import | SOURCE_INSPECTION; complete scope lifecycle BLOCKED; native runtime tests NOT_TESTED |
| Swipes/regeneration | SOURCE_INSPECTION; this patched-host runtime NOT_TESTED |
| Existing reader/stage behavior | PASS — SYNTHETIC 64 Node and 24 actual-entry Chromium regressions on unchanged production bytes |

Final run `db25f9db-e93f-417a-bd6f-03121887a218`: **20/20 checks PASS_WITH_IDENTITY_LIMITS**, 64/64 Node regressions and 24/24 Chromium regressions pass. The technical recommendation remains REVISE.

## Stored records, hashes and failures

Each successful check captures every enrolled chat's raw visual-record bytes for both users, including tombstoned records, plus canonical JSONL digests. Native edit records a before/after digest; visual operations assert the current canonical digest is unchanged. Rename is an intentional path change with unchanged bytes. Delete/recreate explicitly asserts identical transcript bytes and a different identity. The actual import hash is recorded separately, then included in subsequent non-mutation comparisons. These checks are transcript evidence, not a claim to have exhaustively hashed every settings, lorebook or persona file.

The first A visual CAS reaches revision 1/forest. Native edit, rename, delayed-write refusals and restart retain that revision. A separately created branch receives one revision-1 CAS winner; the overlapping writer gets `STALE_REVISION`. The native UI visits' visual records remain revision 0 after the delayed write refuses. The mismatch test temporarily replaces one visual file's embedded chat ID, confirms refusal without repair, then restores the test-owned bytes. Canonical bytes never contain scene directives from this experiment; injected `chatId` metadata exists only in explicitly generated untrusted-import/copy tests.

The final run's UUID, proof hashes, actual IDs, raw records, canonical digests, browser version and cleanup attestations are in [results.json](evidence/dyl27/results.json). Regression transcripts are [Node](evidence/dyl27/node-tests.txt) and [Chromium](evidence/dyl27/browser-tests.txt). No hosted CI result or owner experience verdict is claimed.

Development failures are not hidden: dev1 used `chid` instead of native `data-chid`; dev2 exhausted a 30-second startup deadline while compiling the host frontend; dev3's route handler failed while releasing a delayed response; dev4's test sequence counter failed to account for an intentionally refused newer intent; dev5 sent the import upload under `file` instead of the host's `avatar` field. These were harness defects, not lifecycle passes. Dev6 completed 20 checks before final guard/evidence tightening. The first frozen run at `f0ad058a88f337dd4a774b4c4dc20fb7d28000e4` also passed 20 checks. The strengthened final run adds pending-ack A→B→A and explicit card/rename hash assertions; its frozen SHA above is the handoff evidence. Dev3's unhandled test-route error bypassed normal cleanup: its remaining owned tree was identified by run marker `c3367b59-98d3-4efa-ba06-a576afa50e0a`, verified to have no remaining host process, and removed explicitly. Other completed/failed runner cleanup and final cleanup are recorded; no pre-existing user resource was removed.

## Security and maintenance limits

This is a single-process prototype with synchronous filesystem work, a fixed tiny payload schema and a private test namespace. It inherits host authentication/CSRF, validates target UUIDs and record shape, and derives user paths on the server. Model/imported text cannot choose a visual path, URL, namespace or script. Browser-provided locators are resolved against already host-allocated entries and never enroll them. Multiple profiles/devices, quotas, expiry, registry size, malicious disk writers, read failures, disk-full/fsync failures, lost acknowledgements/idempotency and cross-process locks are not proven. Whole-transcript hashing is a spike guard, not an efficient production design.

File fsync plus atomic rename is not a multi-file transaction or a power-loss claim; there is no parent-directory fsync protocol. Native rename itself is copy/unlink. The intent marker chooses refusal over speculative reconciliation. Some native writers bypass the new hook; this patch is not a maintenance-ready catalog of every mutation path. A permanent fork or plugin is not proposed. Existing chats, backups and restored roots require explicit adoption/restore semantics; never regenerate a missing registry from filenames or hashes.

## Owner decisions and smallest next proof

The technically defensible answer is **partly, on modified host paths; not yet for the full contract**. This is REVISE rather than GO or STOP. No fundamental impossibility was demonstrated, but current supported SillyTavern exposes no such complete capability.

Recommend a separately authorized **load/activation envelope proof**: one native character-chat load returns host-issued chat identity, source revision and request identity; the host couples that response to ordered activation, and tests reorder both transcript loads and activation responses. Include explicit handling of a failed revocation and the exact boundary at which visual writes become ineligible. Keep the registry creation/rename/save proof as the baseline rather than building a broad activation framework now.

Before upstream publication or implementation, the owner must separately decide whether to pursue that capability, approve an existing-chat adoption/restore policy, select interrupted-transaction recovery behavior, and define complete character/group/import scope semantics and supported topology. Native import should eventually allocate fresh identities at its authoritative creation boundary; existing-file adoption requires an explicit migration operation with collision/refusal guarantees. None of these decisions is inferred from this assignment. Keep session-only visuals, DYL-22/23 blockers and Gate A NOT_RUN while reviewing this open/unmerged PR.
