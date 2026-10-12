# M0.1 real-host lifecycle validation

**Run date:** 2026-10-11, America/Phoenix (event observer timestamps were UTC 2026-10-12).
**Recommended M0 verdict:** PARTIAL / REVISE.
**Gate A:** NOT_RUN. **M1:** NOT_AUTHORIZED.

## Candidate and environment

The tested SillyNovel production shell is unchanged from candidate commit `b34ec1e0c0dbd3c74376b5ef9d1e901de8579f10`; this branch adds a regression test and evidence documentation. Starting `main` was at that same full SHA. The validation work is on `test/m0-real-host-lifecycle`.

| Item | Value |
| --- | --- |
| SillyTavern | Release `1.19.0`, full SHA `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| OS | Ubuntu 24.04; kernel `7.0.0-34-generic` |
| Browser | Brave `154.1.96.61`; browser engine version was not exposed |
| Runtime | Node.js `v26.8.1` |
| Host data | Isolated temporary root `/tmp/sillynovel-m0lifecycle-data`; synthetic characters and conversations only |
| Extensions | SillyNovel and temporary sanitized `M0LifecycleObserver`; stock host extensions otherwise left at defaults |
| Generation endpoint | Disposable OpenAI-compatible endpoint on `127.0.0.1:8123`, model `sn-local-test` |
| Provider/model boundary | Endpoint returned a fixed response and fixed stream chunks. This exercises SillyTavern's request and event paths, not model inference or provider behavior. No paid API, credentials, or external service was used. |

PR #1 was merged before this work. No SillyTavern source was changed. The host observer recorded event sequence/name, safe scalar payloads, active chat identity, message count/index, author, source length and bounded hash, swipe ID, and stage/listener counts. It did not retain message bodies. The endpoint response was synthetic test text.

## Reproduction

Use a clean checkout of the pinned SillyTavern SHA and an empty temporary data root. Install its existing dependencies, then start the host and the deterministic endpoint on loopback:

```sh
# In the pinned SillyTavern checkout
npm ci --no-audit --no-fund
setsid -f node server.js --port 8012 --whitelist false --dataRoot /tmp/sillynovel-m0lifecycle-data >/tmp/sillynovel-m0-host.log 2>&1 </dev/null

# In the SillyNovel checkout; the checked-in helper is safe to bind to loopback only
setsid -f node tests/fixtures/m0-openai-endpoint.mjs

# In the SillyNovel checkout, run the deterministic regression suite
node --test tests/m0.test.mjs
```

In the isolated host UI, enable the SillyNovel extension from its local checkout, configure the supported Custom OpenAI-compatible connection to `http://127.0.0.1:8123/v1`, select model `sn-local-test`, leave the API key empty, and use a synthetic character/chat. Turn streaming off for L01 and on for the streaming scenarios. Use the observer described above to capture safe event records while performing the table scenarios. Do not replay the chats from another environment.

Commands actually run for this validation included:

```sh
git rev-parse HEAD
# b34ec1e0c0dbd3c74376b5ef9d1e901de8579f10

npm ci --no-audit --no-fund
setsid -f node server.js --port 8012 --whitelist false --dataRoot /tmp/sillynovel-m0lifecycle-data >/tmp/sillynovel-m0-host.log 2>&1 </dev/null
setsid -f node /tmp/sillynovel-m0lifecycle-endpoint.mjs
brave-browser --version
# Brave 154.1.96.61

node --test tests/m0.test.mjs
git diff --check
node --check tests/fixtures/m0-openai-endpoint.mjs
```

The live endpoint used for the run was a temporary file at `/tmp/sillynovel-m0lifecycle-endpoint.mjs`; the checked-in fixture contains the same deterministic response and request behavior for later reproduction. `npm ci` was run in the temporary SillyTavern checkout, not in this repository. No repository dependencies were installed.

## Real-host scenario results

`PASS` means the host interaction was performed in the UI and the stated observation was recorded. `NOT_TESTED` means a partial sub-action may have been observed, but the full requested scenario was not exercised. Synthetic harness results are stated separately and do not upgrade a host result.

| ID | Result | Evidence |
| --- | --- | --- |
| L01 Normal non-streaming reply | PASS | Non-streaming generation resolved the completed source at message index 4, author A, length 63. No stream-token event was recorded. |
| L02 Streaming reply | PASS | Token events preceded chat-message updates; details below. Final source resolved at its selected message index. |
| L03 Stop mid-stream | PASS | A user stop left partial source length 51. `GENERATION_STOPPED` was observed; later end/receive/render events did not turn that partial response into a successful completion. |
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

These traces omit message text. Counts and indices are the host values observed for the synthetic chat; event ordering is the order in which the observer saw callbacks.

```text
Streaming normal reply:
  STREAM_TOKEN_RECEIVED       source length 3
  STREAM_TOKEN_RECEIVED       source length 3
  host onProgressStreaming   source length becomes 11
  ...
  GENERATION_ENDED            argument = chat.length
  MESSAGE_RECEIVED            index = 4, type = normal
  CHARACTER_MESSAGE_RENDERED  index = 4, type = normal

User stop mid-stream:
  GENERATION_STOPPED           no payload; current source length = 51
  GENERATION_ENDED             argument = chat.length (12)
  MESSAGE_RECEIVED             index = 11, type = normal
  CHARACTER_MESSAGE_RENDERED   index = 11, type = normal

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

The live normal stream confirmed the pinned-source ordering: `STREAM_TOKEN_RECEIVED` arrives before SillyTavern applies that iteration to the message object. At token-event time the observer could see the prior partial source; after the host progress update the source length increased. There is no dedicated post-write event for every token in this surface. A sample taken from `context.chat` inside the token event is therefore behind the in-flight update and must not be presented as if it includes that token.

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
