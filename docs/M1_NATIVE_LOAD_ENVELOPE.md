# DYL-28: Native Chat Load and Activation Envelope Proof

**Recommendation: REVISE.** The bounded experiment proves that a disposable pinned host can bind a real native transcript read to a host identity, source revision, load request, and current browser visit. Reordered transcript responses do not replace the selected conversation, and a source revision change discards the old snapshot before it reaches the browser's canonical chat array. Every acceptance failure on an identity-claiming envelope, including expired and stale load tickets, blocks that snapshot from being committed and asks the user to reopen the chat. The result is limited to newly created character chats saved through the hooked native save path in one host process. It is not a production SillyNovel persistence design.

DYL-28 is an isolated feasibility assignment. The accepted DYL-24 visual stage remains session-only and unchanged. DYL-22 and DYL-23 remain blocked, M1.3 remains unauthorized, and **Gate A remains NOT_RUN**.

## Baseline and proof revision

| Item | Verified value |
| --- | --- |
| Starting clean main SHA | `3c3a542b2d32e2a130c2a94cb19fbf1a2f284936` |
| Starting main includes | PR #14 merge; PR #14 is merged and DYL-27 is Done |
| DYL-28 issue | [DYL-28 — Prove native transcript-load and activation correspondence](https://linear.app/devils17/issue/DYL-28/sillynovel-m12-g-prove-native-transcript-load-and-activation) |
| Branch | `research/dyl-28-load-activation-envelope` |
| Tested proof SHA | `6d9f9d67f40af1c5c94f5f2c342ce9add800257b`; the final pushed head is recorded in the PR description |
| Pinned SillyTavern | 1.19.0, `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Runtime | Linux `7.0.0-38-generic`, Node `v26.8.1`, headless Chromium `151.0.7922.34` |
| Provider | Generated deterministic HTTP responder bound to loopback; no model credentials or paid service |

The report/evidence commit follows the tested proof commit. The final PR head is recorded in the PR and final handoff after push. Source inspection hashes and pinned line excerpts are in [source-inspection.json](evidence/dyl28/source-inspection.json).

## Native host paths inspected

On the pristine pinned source, `src/endpoints/chats.js` implements `POST /api/chats/get` at line 592. It resolves the character chat path and returns `getChatData()`'s parsed array; it does not return a chat-instance ID, source revision, or request ID. `getChatData()` reads the file with `tryReadFileSync`. The native `/api/chats/save` route at line 545 calls shared `trySaveChat()` at line 557; that writer serializes the message array and uses `tryWriteFileSync` at line 541. `/api/chats/rename` copies and unlinks the file, while character import and group import contain direct file-write/copy paths. `/api/chats/group/get` and `/api/chats/group/save` are separate routes.

In `public/script.js`, `getChat()` at line 7634 awaits `unshallowCharacter`, requests `/api/chats/get`, then mutates global `chat` and `chat_metadata`; `getChatResult()` at line 7684 subsequently awaits itemized-prompt loading and rendering before emitting chat events. `openCharacterChat()` at line 7744 and `doNewChat()` at line 10618 clear the current view, change its chat filename, and call `getChat()`. `newAssistantChat({temporary:true})` at line 10922 creates a Temporary Chat without a persisted chat file. `public/scripts/bookmarks.js` creates and saves branch snapshots before opening the new filename.

The source inventory also found `/group/save` as a second `trySaveChat` caller, direct character and group import writers, and copy/unlink rename/delete paths. Those paths matter because a shared writer hook does not make all host lifecycle changes participate in the same identity transaction. The complete excerpts and file SHA-256 values are retained in the source inventory.

## Proposed experimental envelope

The selected design is Option B: separate load and accept operations, with an explicit host-issued token binding the operations. The contract exists only in the disposable host when the DYL-27 test mount is enabled and the browser supplies its experimental client/sequence fields. Ordinary `/api/chats/get` behavior is unchanged when the experiment is absent.

```json
{
  "dyl28Envelope": true,
  "loadRequestId": "host-issued-uuid",
  "identity": {
    "storeId": "host-issued-uuid",
    "scopeId": "host-issued-uuid",
    "chatId": "host-issued-uuid"
  },
  "sourceRevision": 1,
  "messages": []
}
```

Unresolved or missing chats return no visual identity and include an `unavailableReason`; a missing chat still returns an empty messages array. The server derives the owner from authenticated `request.user`, resolves the registered chat by the native endpoint's resolved file path, and does not accept a client path as identity. `getChatDataSnapshot()` reads the raw source text once and parses `messages` from those same bytes. The host checks the returned snapshot against the registry seal before issuing a load token.

The host assigns `sourceRevision` as an integer when a new supported character chat is first saved (revision 1), then increments it after each successful hooked native save. It is not the SillyTavern integrity slug and is not computed from a hash. The registry seal's SHA-256 is a separate consistency check that ties the bytes parsed for the envelope to the recorded source revision. A native rename preserves chat ID and source revision while updating its registered path.

Each `loadRequestId` is a fresh UUID. Its in-memory host ticket binds the authenticated user and cookie session, client, sequence, relative path, identity, source revision, source hash, expiry time, and superseded/consumed state. Tickets expire after 30 seconds. `accept-load` rechecks the ticket, sequence, session, user, current path, source revision, and seal before issuing a fresh `viewToken` for the visit. Visual record revision remains separate and is advanced only by the DYL-26-style CAS route.

## Browser ordering and race result

The patched browser captures character ID, avatar, and filename before asynchronous work. Starting a load advances a local epoch, synchronously makes the visual target unavailable, and revokes the prior host visit. The request carries a client ID and sequence. After the transcript response and again after `accept-load`, the browser checks the epoch and captured locator. It verifies that the accepted request ID, identity, and source revision match the envelope before changing global `chat` state. The patched `getChatResult()` checks the epoch around asynchronous prompt loading, rendering, selection, and event emission.

`acceptLoad()` returns one of three explicit shapes, and the patched `getChat()` acts only on them: `{ target, error: null }` commits the snapshot; `{ target: null, error, refusal: true }` means the host answered and refused this activation, so the snapshot is not committed; `{ target: null, error, transport: true }` means the activation request never reached the host, or the load never became ready, or the envelope carries no identity, so ordinary native text loading continues with the visual target left null. The refusal set is exactly the host-answered codes: `EXPIRED_LOAD`, `STALE_LOAD`, `INVALID_CLIENT`, `ENVELOPE_MISMATCH`, a source-mismatch code, and `UNRESOLVED_IDENTITY` on an envelope that already claims identity. For a source-revision or snapshot mismatch the browser makes one fresh load attempt; every other refusal shows the reopen notice immediately and leaves the transcript untouched. A transport failure (abort, timeout, network) and a missing chat with no identity are refusals of the visual layer only: they never show the notice and never block the native transcript, reply, or save.

```mermaid
sequenceDiagram
    participant UI as Native browser
    participant Host as Disposable SillyTavern host
    UI->>Host: Begin A at epoch 1; revoke prior visit
    UI->>Host: GET A with client and sequence
    Host-->>UI: Envelope A1, chat A, source revision 1
    Note over UI: Hold the actual native response
    UI->>Host: Begin B at epoch 2; revoke A1
    UI->>Host: GET B with client and sequence
    Host-->>UI: Envelope B1, chat B, source revision 1
    UI->>Host: Accept B1
    Host-->>UI: B visit token
    Note over UI: Epoch 2 is current; commit B transcript and render B
    Host-->>UI: A1 response arrives late
    Note over UI: Epoch mismatch; discard A1 before chat mutation
    UI->>Host: A1 accept attempt (test assertion)
    Host-->>UI: STALE_LOAD; no A visual target
```

The A → B → A test gives the first A response the same `chatId` as the latest A response but a different `loadRequestId`, sequence, and visit token. It completes B and the latest A before releasing old A. The old response does not replace the final A transcript or target. A held old activation acknowledgement is also released after a later A visit and does not restore the old token. An old A CAS held across A → B → A returns `STALE_VIEW` without changing the visual record.

When a second authenticated browser edits A with SillyTavern's native message editor and its native save completes while the first browser's revision 1 response is held, the host reports `SOURCE_REVISION_MISMATCH`. Before the fresh request completes, the first browser has no target and neither its chat array nor message DOM contains the stale A transcript. It then accepts a fresh revision 2 envelope and displays the edited canonical message. The test also verifies that a prior client target cannot CAS against revision 2.

## Evidence and classifications

The final isolated run passed **15 checks**. The test runner clones the exact pinned source into an owned temporary checkout, applies the DYL-27 mount patch and DYL-28 overlay in order, links the supplied host's existing dependencies, creates an account-enabled config and fresh marked data root, and launches only loopback listeners. It creates synthetic accounts, duplicate-name cards, chats, and a deterministic loopback provider. It verifies cleanup, stops its child host, removes only its owned temporary tree, and confirms the supplied pinned source checkout's Git status is unchanged.

| Check | Result / classification |
| --- | --- |
| Native create/save assigns separate identity and source revision 1 | PASS — EXPERIMENTAL_HOST |
| Hold actual A transcript response, load B, release A; B DOM, messages and target stay current | PASS — NATIVE_HOST_UI |
| A → B → A response reordering with same A chat ID | PASS — NATIVE_HOST_UI |
| Hold an actual activation acknowledgement through later A visits | PASS — NATIVE_HOST_UI with response barrier |
| Hold A CAS through A → B → A | PASS — NATIVE_HOST_UI + EXPERIMENTAL_HOST |
| Native edit/save changes A revision during held load; stale A is discarded and revision 2 reloads | PASS — NATIVE_HOST_UI + EXPERIMENTAL_HOST |
| Two authenticated clients share source revision; one visual CAS wins and canonical bytes do not change | PASS — NATIVE_HOST_UI + EXPERIMENTAL_HOST |
| Expired load ticket after a concurrent native edit: the revision 3 snapshot is not committed, the screen keeps revision 2, and the reopen activates revision 3 | PASS — NATIVE_HOST_UI with request barrier + EXPERIMENTAL_HOST |
| Activation transport timeout; native text read, loopback reply, and save still work without visual target | PASS — NATIVE_HOST_UI with response abort and deterministic loopback responder |
| Temporary Chat revokes persisted-chat visual target | PASS — NATIVE_HOST_UI via native host functions |
| Missing chat returns empty messages and no identity | PASS — EXPERIMENTAL_HOST |
| Rename during pending load preserves ID/revision and refuses old locator token | PASS — EXPERIMENTAL_HOST via native endpoint |
| Wrong authenticated store and stale cookie-session client refusal | PASS — EXPERIMENTAL_HOST |
| Actual 30-second load-ticket expiry | PASS — EXPERIMENTAL_HOST |
| Host restart retains identity/revision/visual record; old in-memory client is refused | PASS — EXPERIMENTAL_HOST + NATIVE_HOST_UI |

`docs/evidence/dyl28/results.json` contains every checkpoint's host-issued target/envelope, registry bytes, canonical source text and hashes, visual-record bytes, and cleanup outcome. It records the actual source mismatch pair: old A revision 1 hash `082c0bc407f8d4a6c37fcffe0a07db9b2a329cbaad6f83f41e3c962386d48757`; revised source hash `c23af471481c889b6a271fe4dffa99851dfe3fc760345624321ef1e500c115ed`. The host rejected old request `dacaa311-fbea-4fb2-8caf-4d23eca7ded0`; the subsequent accepted envelope had a distinct request ID (`b1dc0869-dedf-477e-b469-8c5ef6d42a9e`) and source revision 2 for chat `38399dec-b636-4c50-ac57-b294727bb239`.

The expired-ticket check is recorded in the same file: load request `899386fa-81e2-41f7-b92d-567cd3f02233` was held past the 30-second ticket TTL while a native edit advanced the chat to revision 3, acceptance refused it as `EXPIRED_LOAD`, and the browser kept the revision 2 transcript from load request `7f03b7f3-d46b-4df0-955a-bbc749805f8f` with the target null; a later reopen activated revision 3 under load request `53e09ec4-7cc0-4b1d-bcce-8f4a3e133f0e`. Against the pre-fix hunk (`6d9f9d6`) the same probe fails this check: the host-answered refusal shows the old notice text, so the updated assertion never observes it. The committed run output is [discriminating-run.txt](evidence/dyl28/discriminating-run.txt).

The activation-timeout check is recorded in the same file: from chat B, a native card click loads A while the first `accept-load` request is aborted; the history gains exactly one entry `{"epoch":39,"loadRequestId":"9a6698bd-570b-4e80-82f7-54f5a55b8e4c","transportFailure":"Failed to fetch"}`, the revision 3 transcript is committed to the chat array and DOM, and the target stays null.

For an actual final stored visual record, the run retained these bytes for chat `38399dec-b636-4c50-ac57-b294727bb239`:

```json
{"storeId":"6b4be17e-46ea-43a4-9f85-5e1ba396c204","chatId":"38399dec-b636-4c50-ac57-b294727bb239","revision":1,"record":{"background":"forest"}}
```

The same checkpoint stores shared source revision 2 and the actual canonical source SHA-256 `c23af471481c889b6a271fe4dffa99851dfe3fc760345624321ef1e500c115ed`, unchanged before and after the CAS. These are synthetic test values, not user records.

The existing regressions also passed: **6 Node test files** and **24 actual-entry Chromium tests**. Exact command output is retained in [node-tests.txt](evidence/dyl28/node-tests.txt) and [browser-tests.txt](evidence/dyl28/browser-tests.txt).

## Relationship to DYL-27 and DYL-26

DYL-27 supplies the disposable host mount, new-character scope/chat identity lifecycle, session-bound client, visit token, and single-process CAS. DYL-28 extends that proof with the source snapshot and load-request binding. The identity remains host-issued; filename, character index, display name, integrity slug, and matching transcript bytes are not identity sources.

The visual JSON record remains under the host-owned `sillynovel-dyl27` experiment namespace and is separate from canonical JSONL. A target now includes store/scope/chat IDs, client ID, view token, load-request ID, and source revision. CAS validates all of those before comparing and incrementing the visual revision. No canonical transcript metadata or tags are added.

## Patch set and reproduction

The host changes remain reproducible test-only files. The runner applies the DYL-27 base patch, copies the DYL-28 storage and browser helpers, then applies the DYL-28 overlay. It never modifies or launches an installed SillyTavern instance. `host-visit.js` gives the `accept-load` request a 60-second ceiling so the expiry probe can hold the acknowledgement past the 30-second ticket TTL before failing it, and so a stalled activation cannot hang the load.

| File | SHA-256 |
| --- | --- |
| `tests/probes/dyl27/host-mount.patch` | `a30ddf37b47c99d3db0e575df339e8fe3411b97914551a1351f9d0d6e312c6aa` |
| `tests/probes/dyl28/host-envelope.patch` | `e73905b37c59b20a6f9844050a4152e7c25a02d1bb6ccaa9e908968ae665996d` |
| `tests/probes/dyl28/host-storage.mjs` | `77c5397c402e40bbc1580eb55e9f6df1559d1eaa7ab9ad5178e2ba86d4bd722a` |
| `tests/probes/dyl28/host-visit.js` | `1b4f8269acf4efef61894788eb9b1011d8b93b3818934b88c8f0be981770ba04` |
| `tests/probes/dyl28/host-probe.mjs` | `b2fb6741467372ab2058f979bc10d5e6da6eaf4662df52a9b2371c1b24c9f753` |

Commands run from the repository root:

```sh
node --check tests/probes/dyl28/host-storage.mjs
node --check tests/probes/dyl28/host-visit.js
node --check tests/probes/dyl28/host-probe.mjs
node --check tests/probes/dyl28/source-inspection.mjs
node tests/probes/dyl28/source-inspection.mjs /tmp/SillyTavern-m12-review > docs/evidence/dyl28/source-inspection.json
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-source-prefix.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test --test-reporter=spec tests/m1-reader-browser.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl28-evidence-review-fix3
git diff --check
```

For another host-probe run, pass a **new nonexistent** evidence directory. Chromium and the pinned checkout's existing `node_modules` are prerequisites, not new SillyNovel dependencies. The commands were run with reviewed elevated execution because the restricted process sandbox blocked Chromium/child-process startup; the probe itself confines its host, data, browser, and provider to owned temporary resources and loopback.

The committed discriminating run ([discriminating-run.txt](evidence/dyl28/discriminating-run.txt)) executed the same current probe against the pre-fix `host-visit.js` and `host-envelope.patch` from `6d9f9d67f40af1c5c94f5f2c342ce9add800257b`, staged in a scratch directory:

```sh
mkdir -p /tmp/opencode/dyl28-prefix/dyl27 /tmp/opencode/dyl28-prefix/dyl28
git show 6d9f9d67f40af1c5c94f5f2c342ce9add800257b:tests/probes/dyl27/host-mount.patch > /tmp/opencode/dyl28-prefix/dyl27/host-mount.patch
git show 6d9f9d67f40af1c5c94f5f2c342ce9add800257b:tests/probes/dyl28/host-visit.js > /tmp/opencode/dyl28-prefix/dyl28/host-visit.js
git show 6d9f9d67f40af1c5c94f5f2c342ce9add800257b:tests/probes/dyl28/host-envelope.patch > /tmp/opencode/dyl28-prefix/dyl28/host-envelope.patch
git show 6d9f9d67f40af1c5c94f5f2c342ce9add800257b:tests/probes/dyl28/host-storage.mjs > /tmp/opencode/dyl28-prefix/dyl28/host-storage.mjs
cp tests/probes/dyl28/host-probe.mjs /tmp/opencode/dyl28-prefix/dyl28/host-probe.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node /tmp/opencode/dyl28-prefix/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl28-evidence-prefix-discriminating
```

It passes the first seven checks and then fails the expired-ticket check's updated notice assertion, as required.

## Limits, security, and next owner decision

This proves only new synthetic **character chats** registered through the supported create/save route, in one host process. It does not prove existing-chat migration or recovery from an interrupted registry transaction. The load/client/token maps are process-local. There is no cross-process or cross-device guarantee. `sourceRevision` does not cover every native writer: character-chat imports write outside `trySaveChat`; group chats use separate routes and are not assigned character scopes; group import, copy/branch, swipe/reorder/regenerate/continue, and external filesystem writers were not all exercised end to end. Character rename is tested; character card rename/import lifecycle beyond the DYL-27 refusal hook is not established. Every host-answered refusal (`EXPIRED_LOAD`, `STALE_LOAD`, `INVALID_CLIENT`, `ENVELOPE_MISMATCH`, a source-mismatch code, and `UNRESOLVED_IDENTITY` on an identity-claiming envelope) is bounded: the refused snapshot is not committed, a fresh load is attempted once only for source mismatches, and the user is asked to reopen. A transport failure (aborted, timed-out, or unreachable `accept-load`) and a missing chat with no identity are not refusals: the transcript is committed as usual, the visual target stays null, and no notice is shown.

No real chats, card assets, secrets, or provider credentials were used. The test accepts no client-chosen filesystem path or URL. Registry drift and pending lifecycle state refuse visual access. A lost activation leaves the target null while native text continues.

The next smallest technical step, if the owner authorizes it, is a separate disposable-host proof for the missing native writers: chat import, group chat get/save/import, and copy/branch identity allocation, followed by a decision on existing-chat adoption/recovery. Do not extend this patch into production persistence or an upstream SillyTavern change without a new owner decision.

Owner decisions before any follow-up are whether to authorize that writer-path proof, what existing-chat/import/backup recovery semantics are expected, whether any future host integration must support more than one process, and whether an upstream proposal may ever be published. This assignment does not approve those choices.

**Gate A: NOT_RUN. DYL-22/DYL-23 remain blocked. M1.3 remains unauthorized. DYL-24 remains session-only.**
