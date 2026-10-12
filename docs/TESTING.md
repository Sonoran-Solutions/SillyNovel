# Verification and acceptance

**Status:** M0 has a passing synthetic harness and real-host lifecycle evidence on an isolated SillyTavern 1.19.0 instance using a deterministic localhost endpoint. This does not validate model/provider behavior. Switching into an empty chat and generating there, group identity cases, and host capability removal remain untested. Deletion to an empty view was exercised. See [M0 compatibility](M0_COMPATIBILITY.md) and the [lifecycle report](M0_LIFECYCLE_VALIDATION.md) for the evidence split.

The corrective streaming and stop rerun used the committed [local endpoint fixture](../tests/fixtures/m0-openai-endpoint.mjs) and [sanitized observer fixture](../tests/fixtures/m0-lifecycle-observer.js); the lifecycle report records their hashes, observer installation/removal steps, and raw sanitized event fields.

## 1. Evidence levels

Distinguish unit tests, simulated integration tests, real-host testing, real-provider testing, and owner playtesting. Passing one level does not imply another.

Every report records the full candidate SHA, host version/commit, browser/device, relevant configuration, commands actually run, outcome, and known gaps. A screenshot without a source build and scenario is illustrative, not a complete test record.

## 1.1 M0 execution record

The tested M0 production shell matches SillyNovel source commit `b34ec1e0c0dbd3c74376b5ef9d1e901de8579f10`; this validation branch adds tests and documentation only. Host: SillyTavern `1.19.0`, full SHA `7e8663cd9c184a550b37238218bdd32c6efc68e9`; Ubuntu 24.04, kernel `7.0.0-34-generic`; Node.js `v26.8.1`; Brave Browser `154.1.96.61` (exact engine version unavailable). The host used a temporary isolated data root, synthetic chats, and a deterministic OpenAI-compatible endpoint bound to `127.0.0.1:8123`. No paid service, credentials, or private chat data were used. See [M0 lifecycle validation](M0_LIFECYCLE_VALIDATION.md) for full outcomes and trace details.

| Scenario | Synthetic harness | Real-host result |
| --- | --- | --- |
| Enable/disable/re-enable; one stage and listener set | PASS | PASS — one stage while enabled; owned listeners removed while disabled |
| Draft entered before toggle | Not represented in Node harness | PASS — exact draft survived off/on cycle; native composer remained available |
| Disable during generation | PASS — late events ignored after disposal | PASS — stage/listeners removed while host stream continued to final events |
| Missing required event capability | PASS — activation refused before mount | NOT_TESTED — pinned host exposes required capabilities |
| Normal non-streaming reply | PASS — synthetic event observation | PASS — real host request/event path via local deterministic endpoint |
| Streaming reply and stop | PASS — synthetic event observation | PASS — token ordering and user stop observed; stop was not treated as successful completion |
| Continuation | PASS — `continue` type and indexed source | PASS — existing message index updated and finalized with `continue` type |
| Regeneration and swipe selection | PASS | PASS — swipe generation and old/new selection resolved selected source |
| Message edit and first/middle/last delete, including final deletion to empty | PASS | PASS — edit source and post-delete counts observed; final deletion cleared the selected source and stage |
| Chat A → populated B → A; A → B → A | PASS | PASS — source followed active chat identity and returned to current A state |
| Switch A → empty B → generation start | PASS — source clears and stays empty | NOT_TESTED on host; reopening B restored its welcome message |
| Malformed/out-of-range index and missing source | PASS — no fallback to last source | NOT_TESTED on host |
| Group authors; duplicate display names | PASS for fixture author label only | NOT_TESTED on host |

Harness assertions model event shapes and do not prove host ordering. In the live pinned-host stream, `STREAM_TOKEN_RECEIVED` fired before the corresponding message object update: a sample saw length 3 on the first token and still length 3 on the next token, then length 11 after the host progress update. Final host events observed were `GENERATION_ENDED(chat.length)`, then `MESSAGE_RECEIVED(index, type)`, then `CHARACTER_MESSAGE_RENDERED(index, type)`. A stopped generation also emitted `GENERATION_STOPPED` and then `GENERATION_ENDED`; these signals do not establish successful completion. Error and aborted-network paths remain untested. The real-host work is not an owner experience test and does not pass Gate A.

## 2. Core regression matrix

| ID | Scenario | Required outcome | First stage |
| --- | --- | --- | --- |
| T01 | Enable/disable/re-enable repeatedly | One active stage; no leaked handlers; native chat restored | M0 |
| T02 | Type a draft, toggle views | Exact draft preserved; normal send behavior remains | M0 |
| T03 | Required host capability absent | Actionable disabled state; no broken native UI | M0 |
| T04 | Long formatted message | All source text accessible; no silent summarization or truncation | M1 |
| T05 | Streaming, stop, continue | Readable text; no premature/duplicate automatic work | M1/M2 |
| T06 | Group with duplicate display names | Correct identity mapping or explicit unresolved state | M1 |
| T07 | More group members than stage slots | No loss of logical membership or dialogue | M1 |
| T08 | Switch A → B with delayed work | A's work cannot render or save into B | M1/M2 |
| T09 | Switch A → B → A with delayed work | Old epoch cannot apply to new visit | M2 |
| T10 | Select an earlier swipe | Changed suffix invalidated; selected history drives visuals | M1 |
| T11 | Edit/insert/delete/continue earlier text | Fingerprints change and dependent state is invalidated | M1 |
| T12 | Reload and branch a chat | Valid matching state restored; branch ownership isolated | M1 |
| T13 | Read backlog while new message arrives | Cursor stays put; no provider calls for navigation | M1 |
| T14 | Second tab attempts state writes | Defined ownership policy; no silent save race | M1 |
| T15 | Lock outfit while director is running | Lock wins; stale proposal cannot overwrite it | M2 |
| T16 | Unknown keys, IDs, schema, bad evidence | Entire invalid proposal rejected | M2 |
| T17 | Model/server error or timeout | Last valid scene survives; chat remains usable | M2 |
| T18 | Mention/negation/flashback/hypothetical | No unsupported current-location or presence change | M2 |
| T19 | Compare canonical data before/after | No extension-authored text/card/lore/config changes | M1/M2 |
| T20 | Same asset requested concurrently | One generation request or safe cache result | M3 |
| T21 | Image finishes after scene/chat change | Candidate remains scoped; active scene not replaced | M3 |
| T22 | Missing outfit sprite | Correct-identity safe fallback; no contradictory outfit swap | M1 |
| T23 | Corrupt/oversized/traversal import | Rejected safely; existing library retained | M1/M3 |
| T24 | Local provider unavailable | No silent cloud fallback | M2/M3 |
| T25 | API refusal, auth error, rate limit | No provider hopping, retry storm, or chat modification | M3 |
| T26 | Budget/count threshold and in-flight jobs | No newly unauthorized automatic submissions | M3 |
| T27 | Unsupported persistence version | Original data preserved; safe degraded mode | M1 |
| T28 | Reduced motion, zoom, touch keyboard | Readable, usable controls; reply field accessible | M1 |
| T29 | Prompt text containing slash/HTML instructions | Data stays data; no command or script execution | M2/M3 |
| T30 | Metadata save overlaps chat change | Write targets correct owner or is safely deferred/refused | M1 |

## 3. Fixture design

Use invented characters and conversations. Include two characters with the same display name but different identities, repeated identical message text at different positions, a renamed card, a branched chat with a shared prefix, a stopped stream, and an edited historical message.

Director fixtures need ground-truth expected updates, allowed abstentions, and forbidden changes. Include quoted travel plans, a character saying “I am not leaving,” an offscreen person being mentioned, an outfit change explicitly completed, a user lock contradicting the prose, and content that tries to instruct the classifier to ignore its rules.

Freeze fixture expectations before evaluating a candidate. Report semantic failures separately from malformed JSON and transport errors. Do not treat a substring-valid evidence quote as semantic correctness.

## 4. Data-integrity checks

Compare canonical source fields before and after extension-only operations. Compare cards, lorebooks, personas, connection configuration, selected content, and the current draft where relevant. Allow only intended writes to extension-owned visual metadata/settings.

Check at least one real host export to ensure namespaced metadata does not unexpectedly enter the main roleplay prompt. A quiet-looking API helper can still have side effects; capture the actual request construction during integration verification.

Do not include secrets or personal prompt content in committed traces. Use redacted request summaries or synthetic fixtures.

## 5. Performance targets

Proposed engineering targets, to be measured rather than advertised: cached visual selection should not perceptibly delay the reader; ordinary message rendering must not wait for an external model; only one automatic director request per eligible source revision (explicit retries recorded separately); no image request per streaming token; no unbounded growth of listeners, DOM nodes, object URLs, or job queues.

Before introducing numerical timing budgets, record the actual host, browser, hardware, asset sizes, and measurement method. Report a latency distribution and slow cases instead of a single favorable screenshot/run.

## 6. Human gate record

Copy this record into a dated evidence file for each real candidate:

```text
Gate: A / B / C
Candidate full SHA:
SillyTavern release and full SHA:
Browser and device:
Relevant extensions/configuration:
Assets/providers used:
Scenarios exercised:
Automated checks actually run:
Owner feedback (verbatim or clearly attributed):
Owner verdict: NOT_RUN / PASS / REVISE / STOP
Remaining blockers:
Known limitations:
Evidence locations:
```

Only the owner supplies the human verdict. Agents can recommend readiness for evaluation but cannot fabricate approval, elapsed session length, screenshots, or test outcomes.

## 7. Documentation checks

Before merging documentation, validate relative links, JSON example syntax, consistent milestone/status names, and separation of planned versus implemented behavior. Check that external facts cite primary sources and that provider limits/pricing have not been invented.

These checks validate the documentation package only. They do not count as M0 completion or extension compatibility evidence.

## M0.2 final host validation addendum (2026-10-12)

Candidate `de25366aeaa5e1cbd10e9bc40861e8ae91339aee` was tested on pinned SillyTavern 1.19.0 (`7e8663cd9c184a550b37238218bdd32c6efc68e9`) using Ubuntu 24.04, Node `v26.8.1`, Brave `154.1.96.61`, isolated synthetic host data, and the deterministic local endpoint. The lifecycle report contains exact setup and fixture hashes.

| Check | Result | Evidence level |
| --- | --- | --- |
| L10 empty B across chat switch and generation | UNSUPPORTED / WAIVER REQUESTED | Host UI creates a welcome message and restores it on reopen; synthetic empty-source regression remains PASS. |
| Eventless Temporary Chat transition | PASS after targeted fix | Host UI reproduced stale stage on prior candidate; candidate DOM observer refreshed source; observer disposal is covered synthetically. Temporary Chat is not L10. |
| L12 group authors and switching | HOST PASS | Synthetic 3-member group, host regeneration, group/individual switch, and disable/re-enable. |
| L13 duplicate display names | HOST PASS for label-only behavior | Two distinct Mira cards share the host label; differing avatar fields are observed but not used as durable identity. |
| L16 missing `MESSAGE_SWIPED` capability | INSTRUMENTED_HOST_PASS | Reversible browser-local override; refusal before mount/listeners, chat/composer usable, normal activation after restore. |
| Same-length eventless source replacement | PASS — exact content compared and one refresh emitted | Synthetic DOM observer regression replaces `Synthetic temporary reply.` with same-length `Synthetic temporary story.`, then checks unchanged-source deduplication and disposal. Fix commit `831714e9343b51682d643efb2eaa419ef9ab5145`; browser host was not rerun for this edge case. |
| Node regression harness | PASS — 13 tests | `node --test tests/m0.test.mjs` |
| Fixture and adapter syntax | PASS | `node --check tests/fixtures/m0-openai-endpoint.mjs`; `node --check tests/fixtures/m0-lifecycle-observer.js`; `node --check src/host-adapter.mjs` |
| JSON examples | PASS | Node `JSON.parse` on each `docs/examples/*.json`; command shown below. |
| Relative Markdown links | PASS — 15 Markdown files checked | One-off Node path-existence check; external links are excluded. |
| Git whitespace | PASS | `git diff --check` |

The JSON validation command used was:

```sh
node --input-type=module -e 'import {readdirSync,readFileSync} from "node:fs"; const files=readdirSync("docs/examples").filter(f=>f.endsWith(".json")); for (const f of files) JSON.parse(readFileSync(`docs/examples/${f}`,"utf8")); console.log(`JSON OK: ${files.join(", ")}`)'
```

At the time of this evidence record, the recommendation was **M0 PASS subject to owner acceptance of the L10 waiver**. The owner later approved M0 PASS for this documented scope and accepted L10 as **UNSUPPORTED / WAIVED**; see the [DYL-16 decision](DECISIONS.md#owner-decision--2026-10-12-dyl-16). Gate A remains NOT_RUN. The host run does not validate real model/provider behavior, error/abort paths, other browser engines, or other SillyTavern releases.

## DYL-17 source-model candidate (2026-10-12)

The bounded contract and consumer notes are in [M1 reader source model](M1_READER_SOURCE.md). The implementation remains a source/navigation model behind the M0 placeholder; it does not pass Gate A or start DYL-18.

| Evidence item | Result |
| --- | --- |
| Starting main | `4e72a3cda0393ca1e2a11155491ef10f0ab759bc` |
| Final code candidate tested on host | `dfbb6dffa88f4aaeda097fb880e54d6c7d956867` |
| Pinned host | SillyTavern 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Host runtime | Ubuntu 24.04, Node.js `v26.8.1`; host PID `2713766`, fixture PID `2713768` |
| Browser | Codex In-app Browser on this host; browser engine/version NOT_REPORTED |
| Isolated host data | `/tmp/SillyTavern-dyl17-final-data`; synthetic chat only |
| Local endpoint | `127.0.0.1:8123`, allowed origin `http://127.0.0.1:8012`; 1 MiB request limit |
| Endpoint fixture SHA-256 | `c62ae622241627553b1652d042250bb1686b9a329bd06b4552affc5517e271ef` |
| Sanitized observer fixture SHA-256 | `74a114b65a6f64dadf111b8274a255b093b1e0b3c798733e761cfbfbdf7d64ac` |

The before-change smoke used a clean worktree at starting main `4e72a3cda0393ca1e2a11155491ef10f0ab759bc`, pinned SillyTavern, and its own temporary data root. It verified extension off/on with exact draft preservation and a reachable Temporary Chat source. The requested same-length native edit was NOT_TESTED on this baseline candidate.

The review-fix candidate `dfbb6dffa88f4aaeda097fb880e54d6c7d956867` was loaded from the isolated worktree into SillyTavern 1.19.0 for the requested final-candidate checks. On the synthetic chat, a native edit changed the assistant source from the 127-character text ending in `quiet room.` to a different 127-character text ending in `peace room.`; the stage reported `messageEdited` and the new canonical text. The built-in **Continue** action then extended that same assistant message from 127 to 191 characters; the stage reported `streamReconciled` during growth and `characterMessageRendered` when complete. The browser UI showed one assistant message updated in place, not a second assistant message. These checks used the deterministic local endpoint; no real provider was used and SillyNovel did not submit generation requests. The final rerun did not repeat the earlier toggle/draft-preservation, stopped-stream, or controlled-failure smoke, which remain tied to `fa18bd2`. The in-app browser engine/version was not reported. The observer fixture was not injected in this rerun, so raw `GENERATION_STARTED` type arguments were not recorded; the host action itself was the UI's **Continue** command.

The local runtime checks run against the final source content were:

```sh
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs
node --check src/host-adapter.mjs
node --check src/reader-source-model.mjs
node --check src/shell.mjs
node --check tests/fixtures/m0-openai-endpoint.mjs
git diff --check
```

Result: 25 tests passed; all four syntax checks passed; `git diff --check` passed. Coverage includes head/cursor navigation, edits and same-length revisions, insert/delete/replacement invalidation, repeated text, swipe/group-author changes, empty history, generation-state conservatism, normal generation remaining unbound without a new assistant source, A → B → A, eventless DOM refresh, selected-index-only token sampling, a one-message middle insertion while pinned, selection change plus same-length edit during a queued frame, and disposal. The Node harness does not replace host evidence. Browser engine/version, real provider behavior, and Gate A remain NOT_TESTED/NOT_RUN.
