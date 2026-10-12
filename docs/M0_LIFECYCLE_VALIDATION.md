# M0.1 real-host lifecycle validation

**Run date:** 2026-10-11 and 2026-10-12, America/Phoenix. L02 and L03 were rerun on 2026-10-12 with the committed endpoint and observer fixtures.
**Recommended M0 verdict:** PARTIAL / REVISE.
**Gate A:** NOT_RUN. **M1:** NOT_AUTHORIZED.

## Candidate and environment

The review follow-up started from PR head `c197217c2d387f2963fb9b91cfd592608dcd2d63`. The tested SillyNovel production shell is unchanged from candidate commit `b34ec1e0c0dbd3c74376b5ef9d1e901de8579f10`; this branch adds a regression test, test fixtures, and evidence documentation. Starting `main` was at that same full SHA. The validation work is on `test/m0-real-host-lifecycle`.

| Item | Value |
| --- | --- |
| SillyTavern | Release `1.19.0`, full SHA `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| OS | Ubuntu 24.04; kernel `7.0.0-34-generic` |
| Browser | Brave `154.1.96.61`; browser engine version was not exposed |
| Runtime | Node.js `v26.8.1` |
| Host data | Isolated temporary root `/tmp/sillynovel-m0lifecycle-data`; synthetic characters and conversations only |
| Extensions | SillyNovel and temporary sanitized `M0LifecycleObserver`; stock host extensions otherwise left at defaults |
| Generation endpoint | Committed `tests/fixtures/m0-openai-endpoint.mjs`, SHA-256 `9f0eeb33246ed0a65e5dc78d1709ace20eea988c2129cf9228c925cf0c478ef8`, loopback `127.0.0.1:8123`, model `sn-local-test` |
| Event observer | Committed `tests/fixtures/m0-lifecycle-observer.js`, SHA-256 `5c1a1b12ead40ce3a0cb31a5e865a36979cad4d3e8e2348a94763483792a9305` |
| Provider/model boundary | Endpoint returned a fixed response and fixed stream chunks. This exercises SillyTavern's request and event paths, not model inference or provider behavior. No paid API, credentials, or external service was used. |

PR #1 was merged before this work. No SillyTavern source was changed. The checked-in debug observer recorded event sequence/name, safe scalar payloads, hashed chat identity, message count/index, optional allowlisted synthetic author label, source length and bounded FNV-1a diagnostic hash, swipe ID, and stage/listener deltas. Stream token text and message bodies were never retained. Its panel shows at most the latest 60 records; the in-memory ring is capped at 2,000. This is a diagnostic fixture, not an anonymizer; run it only against synthetic chats. The endpoint response was synthetic test text.

## Reproduction

Use a clean checkout of the pinned SillyTavern SHA and an empty temporary data root. Install its existing dependencies, then start the host and the committed deterministic endpoint on loopback:

```sh
# In the pinned SillyTavern checkout
npm ci --no-audit --no-fund
setsid -f node server.js --port 8012 --whitelist false --dataRoot /tmp/sillynovel-m0lifecycle-data >/tmp/sillynovel-m0-host.log 2>&1 </dev/null

# In the SillyNovel checkout
setsid -f node tests/fixtures/m0-openai-endpoint.mjs

# In the SillyNovel checkout, run the deterministic regression suite
node --test tests/m0.test.mjs
```

In the isolated host UI, enable the SillyNovel extension from its local checkout, configure the supported Custom OpenAI-compatible connection to `http://127.0.0.1:8123/v1`, select model `sn-local-test`, leave the API key empty, and use a synthetic character/chat. Turn streaming off for L01 and on for the streaming scenarios.

After SillyTavern has loaded, open DevTools on its page and load the checked-in observer from the local fixture endpoint:

```js
const observerScript = document.createElement('script');
observerScript.src = 'http://127.0.0.1:8123/m0-lifecycle-observer.js';
document.head.append(observerScript);
```

The temporary sanitized trace panel appears in the page. Clear it before each scenario; the `postTokenSample` row is taken 100 ms after its linked `STREAM_TOKEN_RECEIVED` callback and is explicitly a delayed host-state sample, not another host event. The observer records token lengths but not token text, and message text is represented only by a bounded FNV-1a diagnostic hash and length. It omits author labels by default. On synthetic data only, a caller may set `window.M0_LIFECYCLE_SYNTHETIC_LABELS` to an exact allowlist before loading the script. Remove it with the panel's **Remove observer** button; this detaches listeners, removes the panel, and clears the observer globals. Do not replay chats from another environment.

The initial 2026-10-11 report used `/tmp/sillynovel-m0lifecycle-endpoint.mjs`; no exact-equivalence claim is made for that file. On 2026-10-12, L02 and L03 were repeated with the committed endpoint above. The running process logged two `streaming, model=sn-local-test` requests: one complete stream and one user-stopped stream. The endpoint file's SHA-256 was recorded before and after the run as `9f0eeb33246ed0a65e5dc78d1709ace20eea988c2129cf9228c925cf0c478ef8`. For this rerun, the checked-in observer was copied into the temporary host's existing `M0LifecycleObserver` extension directory; its SHA matched `tests/fixtures/m0-lifecycle-observer.js` exactly (`5c1a1b12ead40ce3a0cb31a5e865a36979cad4d3e8e2348a94763483792a9305`). The DevTools script-tag instructions above reproduce the same fixture without changing the pinned host checkout.

Commands actually run across the original validation and the corrective rerun included:

```sh
git rev-parse HEAD
# b34ec1e0c0dbd3c74376b5ef9d1e901de8579f10
git rev-parse HEAD
# c197217c2d387f2963fb9b91cfd592608dcd2d63 (review follow-up starting head)

npm ci --no-audit --no-fund
setsid -f node server.js --port 8012 --whitelist false --dataRoot /tmp/sillynovel-m0lifecycle-data >/tmp/sillynovel-m0-host.log 2>&1 </dev/null
# Original 2026-10-11 endpoint (not used for the corrective rerun)
setsid -f node /tmp/sillynovel-m0lifecycle-endpoint.mjs
# Corrective 2026-10-12 rerun used the committed fixture
setsid -f node tests/fixtures/m0-openai-endpoint.mjs
brave-browser --version
# Brave 154.1.96.61

node --test tests/m0.test.mjs
git diff --check
node --check tests/fixtures/m0-openai-endpoint.mjs
node --check tests/fixtures/m0-lifecycle-observer.js
sha256sum tests/fixtures/m0-openai-endpoint.mjs tests/fixtures/m0-lifecycle-observer.js
curl -fsS -H 'Origin: http://127.0.0.1:8012' http://127.0.0.1:8123/m0-lifecycle-observer.js -o /tmp/m0-observer-served.js
sha256sum tests/fixtures/m0-lifecycle-observer.js /tmp/m0-observer-served.js
curl -sS -D - -o /dev/null -H 'Origin: http://127.0.0.1:8012' http://127.0.0.1:8123/v1/models
curl -sS -D - -o /dev/null -H 'Origin: http://example.invalid' http://127.0.0.1:8123/v1/models
head -c 1048577 /dev/zero | curl -sS -D - -o /dev/null -H 'Content-Type: application/json' --data-binary @- http://127.0.0.1:8123/v1/chat/completions
```

The pinned SillyTavern install and `npm ci` were run in the temporary SillyTavern checkout, not in this repository. No repository dependencies were installed. The rerun verified the endpoint's allowlisted origin with HTTP 200, rejected `http://example.invalid` with HTTP 403, and rejected a request body over 1 MiB with HTTP 413.

## Real-host scenario results

`PASS` means the host interaction was performed in the UI and the stated observation was recorded. `NOT_TESTED` means a partial sub-action may have been observed, but the full requested scenario was not exercised. Synthetic harness results are stated separately and do not upgrade a host result.

| ID | Result | Evidence |
| --- | --- | --- |
| L01 Normal non-streaming reply | PASS | Non-streaming generation resolved the completed source at message index 4, author A, length 63. No stream-token event was recorded. |
| L02 Streaming reply | PASS | Repeated with the committed endpoint. The token callback saw the prior source length (3); its linked 100 ms sample later saw length 11. The normal stream then ended at length 63. Raw observer fields are below. |
| L03 Stop mid-stream | PASS | Repeated with the committed endpoint. User stop left partial source length 20; `GENERATION_STOPPED` preceded `GENERATION_ENDED`, `MESSAGE_RECEIVED`, and `CHARACTER_MESSAGE_RENDERED`, all while that source remained length 20. |
| L04 Continue a response | PASS | Generation type was `continue`; the existing assistant message at index 13 grew from length 63 to 127 and message count stayed 14. Final receive/render events referenced index 13. Per-token lag during continuation was not separately measured; see streaming contract below. |
| L05 Regenerate a reply | PASS | Swipe generation used type `swipe`; `MESSAGE_SWIPED` preceded generation start, and the selected source ended on swipe ID 1 of 2. |
| L06 Select old and new swipes | PASS | Selecting swipe ID 0 resolved its length-127 source; selecting ID 1 resolved its length-63 source. |
| L07 Edit an existing message | PASS | Edit at index 13 resolved the edited source, length 38, bounded hash prefix `55299f09`. A transient isolated-host disconnect interrupted the first save attempt; after restarting the host, the edit was repeated and verified in the saved test chat. |
| L08 Delete first, middle, and last messages, including final deletion to empty | PASS | First/middle/last deletions resolved post-delete counts/source indices (14→13, 13→12, 12→11). In a fresh B chat, deleting its final welcome message emitted `MESSAGE_DELETED` with count 0; selected index was -1, source was null, and the stage showed no current message (observer sequence 158). |
| L09 Switch A → populated B | PASS | B resolved its own three-message chat, character ID 1, latest message index 2, author B, length 63. Returning to A resolved A's own current message, character ID 0, index 10, length 63. |
| L10 Switch A → empty B → generation start | NOT_TESTED | Deleting B's last welcome message produced an empty view, but after switching to A and back, SillyTavern reopened that B chat with its welcome message (observer sequences 162–164). A switch from A into an empty B followed by generation start was not completed. The synthetic regression covers the source-less transition and generation-start event separately. |
| L11 Switch A → B → A | PASS | The real host sequence returned to A's current selected source and identity; it did not reuse B or an obsolete A snapshot. |
| L12 Group with multiple authors | NOT_TESTED | No real group chat was created. Synthetic fixtures verify only that the host-provided `name` label is read. |
| L13 Group members with identical display names | NOT_TESTED | No real group chat with duplicate names was created; no stable card identity is inferred from a display name. |
| L14 Disable/re-enable with a draft | PASS | Exact draft `M0 draft: preserve across extension toggles.` remained in the native composer through disable and re-enable. Stage mounted once; listener deltas returned to zero after re-enable relative to the active baseline. |
| L15 Disable during generation | PASS | SillyNovel was disabled during a streaming host reply. Its stage disappeared and its ten event listeners were removed. SillyTavern kept streaming and emitted its normal end/receive/render events; re-enable mounted one stage showing the completed A source. |
| L16 Missing host capability | NOT_TESTED | The pinned host exposed the required capabilities, so removal/refusal was not exercised in the host UI. Synthetic tests cover missing-capability refusal and setup rollback. |

The extension did not initiate canonical chat changes during mount, disable, or re-enable. The real send, edit, delete, and swipe actions changed chat through ordinary SillyTavern operations. In the synthetic regression, the canonical chat snapshot is asserted unchanged by activation and disposal.

## Sanitized event traces and integration contract

These traces omit message text. Counts and indices are the host values observed for the synthetic chat; event ordering is the order in which the observer saw callbacks. The following fields are copied from the new fixture's raw sanitized records; repeated `listenerDeltasFromInstall` maps are omitted here for readability.

```json
[
  {
    "sequence": 4,
    "elapsedMs": 125407,
    "kind": "hostEvent",
    "event": "STREAM_TOKEN_RECEIVED",
    "triggerSequence": null,
    "args": { "tokenLength": 12, "tokenText": "[redacted]" },
    "chat": { "scope": "character", "chatIdHash": "765b88da", "groupId": null, "characterId": null },
    "messageCount": 17,
    "source": { "index": 16, "resolution": "resolved", "kind": "character", "authorLabel": null, "authorLabelHash": "a03e356a", "textLength": 3, "textHashPrefix": "0ac31c19", "swipeId": 0 },
    "generationActive": true,
    "stopSeenInGeneration": false,
    "stageCount": 1
  },
  {
    "sequence": 5,
    "elapsedMs": 125516,
    "kind": "postTokenSample",
    "event": "STREAM_TOKEN_RECEIVED",
    "triggerSequence": 4,
    "args": { "tokenLength": null, "tokenText": "[redacted]" },
    "chat": { "scope": "character", "chatIdHash": "765b88da", "groupId": null, "characterId": null },
    "messageCount": 17,
    "source": { "index": 16, "resolution": "resolved", "kind": "character", "authorLabel": null, "authorLabelHash": "a03e356a", "textLength": 11, "textHashPrefix": "4ee182ec", "swipeId": 0 },
    "generationActive": true,
    "stopSeenInGeneration": false,
    "stageCount": 1
  },
  {
    "sequence": 8,
    "elapsedMs": 127179,
    "kind": "hostEvent",
    "event": "GENERATION_STOPPED",
    "triggerSequence": null,
    "args": {},
    "chat": { "scope": "character", "chatIdHash": "765b88da", "groupId": null, "characterId": null },
    "messageCount": 17,
    "source": { "index": 16, "resolution": "resolved", "kind": "character", "authorLabel": null, "authorLabelHash": "a03e356a", "textLength": 20, "textHashPrefix": "0b941281", "swipeId": 0 },
    "generationActive": true,
    "stopSeenInGeneration": true,
    "stageCount": 1
  },
  {
    "sequence": 9,
    "elapsedMs": 127179,
    "kind": "hostEvent",
    "event": "GENERATION_ENDED",
    "triggerSequence": null,
    "args": { "hostCount": 17 },
    "chat": { "scope": "character", "chatIdHash": "765b88da", "groupId": null, "characterId": null },
    "messageCount": 17,
    "source": { "index": 16, "resolution": "resolved", "kind": "character", "authorLabel": null, "authorLabelHash": "a03e356a", "textLength": 20, "textHashPrefix": "0b941281", "swipeId": 0 },
    "generationActive": false,
    "stopSeenInGeneration": true,
    "stageCount": 1
  },
  {
    "sequence": 10,
    "elapsedMs": 127214,
    "kind": "hostEvent",
    "event": "MESSAGE_RECEIVED",
    "triggerSequence": null,
    "args": { "index": 16, "generationType": "normal" },
    "chat": { "scope": "character", "chatIdHash": "765b88da", "groupId": null, "characterId": null },
    "messageCount": 17,
    "source": { "index": 16, "resolution": "resolved", "kind": "character", "authorLabel": null, "authorLabelHash": "a03e356a", "textLength": 20, "textHashPrefix": "0b941281", "swipeId": 0 },
    "generationActive": false,
    "stopSeenInGeneration": true,
    "stageCount": 1
  },
  {
    "sequence": 11,
    "elapsedMs": 127214,
    "kind": "hostEvent",
    "event": "CHARACTER_MESSAGE_RENDERED",
    "triggerSequence": null,
    "args": { "index": 16, "generationType": "normal" },
    "chat": { "scope": "character", "chatIdHash": "765b88da", "groupId": null, "characterId": null },
    "messageCount": 17,
    "source": { "index": 16, "resolution": "resolved", "kind": "character", "authorLabel": null, "authorLabelHash": "a03e356a", "textLength": 20, "textHashPrefix": "0b941281", "swipeId": 0 },
    "generationActive": false,
    "stopSeenInGeneration": true,
    "stageCount": 1
  }
]
```

The normal complete rerun used the same committed fixture and finished at source length 63. The observer recorded `GENERATION_ENDED` → `MESSAGE_RECEIVED` → `CHARACTER_MESSAGE_RENDERED`. A later `GENERATION_STARTED(dryRun=true)` was observed separately and did not change the finalized reply.

```text
Streaming normal reply:
  STREAM_TOKEN_RECEIVED       source length 3
  postTokenSample (+100 ms)    source length 3
  STREAM_TOKEN_RECEIVED       source length 3
  postTokenSample (+100 ms)    source length becomes 11
  ...
  GENERATION_ENDED            argument = chat.length
  MESSAGE_RECEIVED            index = 4, type = normal
  CHARACTER_MESSAGE_RENDERED  index = 4, type = normal

User stop mid-stream:
  GENERATION_STOPPED           no payload; current source length = 20
  GENERATION_ENDED             argument = chat.length (17); source remains length 20
  MESSAGE_RECEIVED             index = 16, type = normal; source remains length 20
  CHARACTER_MESSAGE_RENDERED   index = 16, type = normal; source remains length 20

Continuation:
  GENERATION_STARTED           type = continue
  ... existing index 13 grows, message count remains 14 ...
  GENERATION_ENDED             argument = chat.length
  MESSAGE_RECEIVED             index = 13, type = continue
  CHARACTER_MESSAGE_RENDERED   index = 13, type = continue

Swipe:
  MESSAGE_SWIPED                index = 13
  GENERATION_STARTED            type = swipe
  ... selected source is index 13, swipe ID 1 of 2 ...
  MESSAGE_RECEIVED              index = 13, type = swipe
  CHARACTER_MESSAGE_RENDERED    index = 13, type = swipe

Delete first / middle / last:
  MESSAGE_DELETED               count = 13; latest source index = 12
  MESSAGE_DELETED               count = 12; latest source index = 11
  MESSAGE_DELETED               count = 11; latest source index = 10

Delete final message in a fresh B chat:
  MESSAGE_DELETED               count = 0; selected index = -1; source = null
  SillyNovel stage               no current message is available
  ... after switching away and reopening B ...
  CHAT_CHANGED                  B chat; count = 1; welcome source restored
  MESSAGE_RECEIVED              index = 0, type = first_message

Disable while streaming:
  GENERATION_STARTED             type = normal
  SillyNovel disabled            stage count = 0; listener deltas = -1 each
  ... host stream continues ...
  GENERATION_ENDED               argument = chat.length (13)
  MESSAGE_RECEIVED               index = 12, type = normal
  CHARACTER_MESSAGE_RENDERED     index = 12, type = normal
```

### Streaming ordering

The committed-fixture rerun confirmed the pinned-source ordering: `STREAM_TOKEN_RECEIVED` arrives before SillyTavern applies that iteration to the message object. In the stop run, the second callback saw source length 3, and its linked 100 ms sample saw length 11; the following callback then saw length 11. There is no dedicated post-write event for every token in this surface. A sample taken from `context.chat` inside the token event is therefore behind the in-flight update and must not be presented as if it includes that token.

Continuation used the existing selected assistant message (index 13); its source grew from 63 to 127, and its final event type was `continue`. This run did not retain a separate per-token continuation timing trace, so whether the one-update lag differs for continuation remains unverified. M1 should validate its chosen update seam for both normal and continue paths before relying on streaming text.

For the tested normal completion and continuation paths, the observer saw `GENERATION_ENDED(chat.length)` followed by `MESSAGE_RECEIVED(index, type)` and `CHARACTER_MESSAGE_RENDERED(index, type)`. On the tested stop path, `GENERATION_STOPPED` preceded `GENERATION_ENDED`, and receive/render events still followed while the source remained partial. Therefore `GENERATION_ENDED` alone is not a success signal, and receive/render events alone do not distinguish a user stop from an uninterrupted finish. The stop event plus observed source state distinguishes the tested user-stop path. Provider errors and aborted/disconnected requests were not exercised; no broader finalization contract is claimed. The inspected pinned source also has error paths where `continue` and `swipe` suppress message events, so missing final message events must not be treated as proof that the source was never changed.

Across the tested A/B switches, active chat identity and selected source changed together. No wrong-chat source was observed. This validates the current read-only shell path for these sequences; it does not establish durable chat/card identity or safe asynchronous persistence.

## Regression coverage and defects

Added one synthetic regression for populated A → populated B → empty B → source-less generation start → refreshed A. Extended activation/disposal coverage to assert the canonical chat array remains unchanged and late events produce no additional updates after disable. The full Node harness has 8 passing tests. No production defect was reproduced in the exercised host paths, so no production code correction was made.

## Remaining unverified behavior

- Switching from A into an empty B chat and starting generation while it remains empty; reopening B restored its welcome message during this run.
- Group authors, including multiple members with identical display names.
- Required-capability absence in the host UI; only the test double covered refusal/rollback.
- Per-token continuation ordering, explicit endpoint errors, network abort/disconnect, and other failed-generation paths.
- Actual model inference, providers, credentials, cloud services, other SillyTavern versions, browsers, devices, themes, or extension combinations.
- M1 visual presentation and any persistence, intentionally outside this validation.

## Verdict and next step

Recommend **M0 PARTIAL / REVISE**. The local deterministic host verifies core normal, streaming, stop, continuation, swipe, edit/delete, chat-switch, toggle, and disable-during-generation behavior, including deletion to an empty view. L10, L12, L13, and L16 remain unverified against the host. Provider/model behavior and failed-generation paths are also outside the evidence. Run those bounded host scenarios on the pinned build or document why the host cannot support them, then request the owner's M0 review. Gate A remains NOT_RUN; M1 remains NOT_AUTHORIZED.

## M0.2 — Final Host Compatibility Validation (2026-10-12)

This is a separate follow-up to the M0.1 record above; the earlier results and verdict remain historical. Validation candidate: SillyNovel `de25366aeaa5e1cbd10e9bc40861e8ae91339aee`. Pinned host: SillyTavern 1.19.0, `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Environment: Ubuntu 24.04, kernel `7.0.0-34-generic`, Node `v26.8.1`, Brave `154.1.96.61` (engine version unavailable). Host data was isolated under `/tmp/sillynovel-m0lifecycle-data`; all cards, chats, and group members were synthetic. Generation used the committed deterministic OpenAI-compatible endpoint at `127.0.0.1:8123`, model `sn-local-test`; no paid provider or private data was used.

Fixture versions at the candidate:

- `tests/fixtures/m0-lifecycle-observer.js` SHA-256 `74a114b65a6f64dadf111b8274a255b093b1e0b3c798733e761cfbfbdf7d64ac`.
- `tests/fixtures/m0-openai-endpoint.mjs` SHA-256 `9f0eeb33246ed0a65e5dc78d1709ace20eea988c2129cf9228c925cf0c478ef8`.

### L10 — Switch into empty B and generate

**Result: UNSUPPORTED / WAIVER REQUESTED.** In the host UI, “Start new chat” from populated synthetic A created persistent B with its normal first-message greeting, which SillyNovel observed as message 1 (`first_message`, author `M0 Test Speaker A`, 16 characters). After switching away and reopening B, the greeting was restored. Deleting the final message does produce an empty view, but reopening restores the welcome message. The supported UI therefore did not provide a revisitable empty B on which to exercise the requested generation sequence. No host source or welcome behavior was changed to manufacture that state. The synthetic A → empty B → generated B → A test continues to cover the source-clearing contract; it is not host evidence for generation from an empty chat.

The separate host Temporary Chat flow is ephemeral and does not satisfy L10. It emitted no observer lifecycle events, but the candidate's DOM fallback changed the displayed source to the current temporary message (`SillyTavern System`, 782 characters; `chatViewChanged`). On the earlier candidate `4bf71aef34c43bf6961f1cfcaa633a725eafa768`, the stage remained stale. This exposed and fixed a reachable eventless temporary-chat refresh defect, but does not turn L10 into a pass.

### L12 — Real group conversation

**Result: HOST PASS.** A synthetic three-member group (Mira, Rowan, Nia) used list order with the deterministic local endpoint. Regeneration through the host UI removed and recreated the replies; the stage followed each host-provided author and selected the final Mira reply. On the exact candidate, the group produced four replies after a duplicate-name card was added: duplicate Mira at index 8, Nia at index 9, Rowan at index 10, and original Mira at index 11. The selected final source was index 11, label Mira, length 63. Sanitized observer group/chat correlation hashes were `groupId=0bc651df`, `chatId=00de6398`; these are diagnostic hashes, not durable keys.

Switching group → individual chat → group refreshed the selected source and returned to the latest group reply. Disabling SillyNovel removed its stage while the native four-member chat/composer remained available; re-enabling mounted the stage on message 12 by Mira. No stale cross-chat source or prior-member label was observed. M0 reports host labels only and makes no member identity claim.

### L13 — Duplicate display names

**Result: HOST PASS for label-only behavior; stable identity remains open.** Two separate synthetic cards were both shown in the group as Mira. Both messages had `name` label Mira and the same sanitized `authorLabelHash=c173d986`, so `name` alone did not distinguish them. The inspected host message representation included `original_avatar` and `force_avatar`; their values differed between the two cards and the hashes matched the corresponding persisted synthetic chat records:

| Reply | Index | Label | Original-avatar hash | Forced-avatar hash | Character-index hash |
| --- | ---: | --- | --- | --- | --- |
| Mira Copy | 8 | Mira | `9c7ffdaf` | `7242b13d` | `ec79457c` |
| Original Mira | 11 | Mira | `fb5ee6d8` | `a073dc79` | `ed79470f` |

The host `characterId` was a string-typed current array index. Raw avatar filenames and message bodies were not recorded. These host fields distinguished the two synthetic replies in this run, but avatar fields and array indices are not established as durable identity across rename, import, replacement, or migration. SillyNovel continues to display the authoritative label without assigning either message to a card. M1 sprite assignment must define a stable identity contract or show an unresolved state.

### L16 — Missing required capability

**Result: INSTRUMENTED_HOST_PASS.** A removable test-only observer control wrapped `SillyTavern.getContext()` to omit `eventTypes.MESSAGE_SWIPED` before the user enabled the browser-loaded SillyNovel extension. Activation displayed: `Missing SillyTavern capabilities: eventTypes.MESSAGE_SWIPED. The original chat remains available.` The checkbox reset to off, no `#sillynovel-stage` remained, and the native chat/composer accepted a draft. This is injected-host evidence, not a naturally missing host capability.

To check for partial listener registration, an observer-only baseline after reload was compared on group `CHAT_CHANGED`. After failed activation and subsequent chat switches, counts stayed at `CHAT_CHANGED` 9, `MESSAGE_RECEIVED` 2, `CHARACTER_MESSAGE_RENDERED` 1, `GENERATION_ENDED` 1, `MESSAGE_EDITED` 2, and `MESSAGE_DELETED` 2; `MESSAGE_SWIPED` was unavailable under the override (its baseline count before omission was 2). After restoring the context and enabling SillyNovel, numeric counts rose by one each: `CHAT_CHANGED` 10, `MESSAGE_RECEIVED` 3, `CHARACTER_MESSAGE_RENDERED` and `GENERATION_ENDED` 2, and `MESSAGE_SWIPED`, `MESSAGE_EDITED`, and `MESSAGE_DELETED` 3. The stage mounted. The observer could not count `STREAM_TOKEN_RECEIVED` or `GENERATION_STOPPED` because those emitter internals were not exposed as arrays, so no count claim is made for them. The temporary capability override was removed.

### Corrective regression and verification

The eventless Temporary Chat transition reproduced a stale-stage bug on the preceding candidate. Candidate `de25366` adds an owned `MutationObserver` limited to `#chat`, coalesces DOM mutations with `queueMicrotask`, samples current host state only when the source signature changes, and disconnects it on disposal. The observer fixture also records sanitized avatar-field hashes, tolerates absent event types, and includes a removable control for the browser-local capability override. No host source, canonical chat, or production settings were modified. The synthetic regression suite now has 13 tests, including mutation fallback deduplication/disposal and avatar/event-field cases.

Commands run after the code candidate was finalized: `node --test tests/m0.test.mjs` (13/13 pass); `node --check tests/fixtures/m0-openai-endpoint.mjs`; `node --check tests/fixtures/m0-lifecycle-observer.js`; `node --check src/host-adapter.mjs`; `git diff --check`. Documentation validation is recorded in the M0.2 testing addendum below after the docs update. Other browsers, SillyTavern releases, real model/provider behavior, and failed-generation paths remain NOT_TESTED.

### M0.2 recommendation

Recommend **M0 PASS, subject to the owner's L10 waiver decision**: the reachable group, duplicate-label, injected-capability, lifecycle, and reversibility paths passed on the pinned host, and the reproduced eventless-transition defect is fixed on the validated candidate. L10 remains **UNSUPPORTED / WAIVER REQUESTED**, not passed. This is an agent recommendation only: owner waiver/acceptance is pending. Gate A remains NOT_RUN; M1 remains NOT_AUTHORIZED.
