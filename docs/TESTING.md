# Verification and acceptance

**Current DYL-18 evidence:** the [text-reader record below](#dyl-18-text-reader--2026-10-12) adds actual-entry browser behavior and isolated pinned-host reader checks. Gates A/B/C remain NOT_RUN.

**Historical M0 status:** M0 has a passing synthetic harness and real-host lifecycle evidence on an isolated SillyTavern 1.19.0 instance using a deterministic localhost endpoint. This does not validate model/provider behavior. Switching into an empty chat and generating there, group identity cases, and host capability removal remain untested. Deletion to an empty view was exercised. See [M0 compatibility](M0_COMPATIBILITY.md) and the [lifecycle report](M0_LIFECYCLE_VALIDATION.md) for the evidence split.

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

## DYL-17 senior re-review addendum (2026-10-12)

Code candidate `3d871679ca216eec1210f3bec5845299a672af92` addresses the two new P2 findings and the P3 cleanup. A zero-to-one sampled append is accepted only with a present, unique source key; nonempty incremental appends still require the verified previous tail. Follow-latest recovers to a replaced canonical head, while a pinned replaced source remains invalidated. Invalid/null history records are omitted from the prior-source lookup.

| Check | Result |
| --- | --- |
| DOM-only zero-to-one adapter/model regression | PASS — first source selected as head and cursor without a lifecycle event |
| DOM-only latest-object replacement regression | PASS — followLatest selects the new source without a lifecycle event |
| Refresh after ambiguous/null history regression | PASS — ordinary full refresh does not throw and restores the unique source |
| Node regression suites | PASS — 27 tests |
| Syntax checks and `git diff --check` | PASS — commands below |
| Pinned SillyTavern smoke | PASS for candidate load and current synthetic-source observation after reload; host UI started its Temporary Chat with a system welcome source, so zero-message arrival was NOT_TESTED on host. No UI action replaces the latest message object without also raising a lifecycle event, so the requested eventless replacement remains NOT_TESTED on host. |
| Provider, browser-engine version, Gate A | NOT_TESTED / NOT_RUN |

The host candidate was served from this isolated worktree on SillyTavern 1.19.0 (`7e8663cd9c184a550b37238218bdd32c6efc68e9`), Node.js `v26.8.1`, with synthetic data under `/tmp/SillyTavern-dyl17-final-data`. Brave was used; the browser engine/version was not reported. The deterministic endpoint was available at `127.0.0.1:8123`, but no generation request was submitted for this smoke. The visible stage showed the current synthetic chat source and `chatViewChanged` after reload. The specific two P2 host scenarios were unreachable through the pinned UI and remain covered by the synthetic adapter/model regressions only.

Commands actually run on the candidate:

```sh
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs
node --check src/host-adapter.mjs
node --check src/reader-source-model.mjs
node --check src/shell.mjs
node --check tests/fixtures/m0-openai-endpoint.mjs
git diff --check
```

The DYL-18 and DYL-19 scope remains unchanged. The Node harness and host smoke are implementation evidence, not an owner verdict or Gate A pass.


## DYL-18 text reader — 2026-10-12

The owner assigned DYL-18 in Codex on 2026-10-12 (America/Phoenix), recorded in Linear before implementation. Initial clean checkout: `98ee37d7464063d607b0a0c892cd2259d4ed75ae`. Fetched starting main: `aa43f4d938c6eafae296cda63a5b4f11111fbd95`. Branch: `codex/dyl-18-text-reader`. The final host-tested SHA, runtime/fixture hashes, browser metrics and complete scenario results are in [results.json](evidence/dyl18/results.json); the pushed review head is recorded in the PR/Linear handoff rather than a self-referential commit here. Runtime files were committed and unchanged during that host run. The reviewed head `29cb5bf8d348490f407565f9c3f9e91db6afb1d7` did not change those runtime bytes. The later P2 adapter correction has separate evidence in the addendum below.

### Commands actually run and results

The dedicated host was cloned locally from the existing inspected pinned checkout; its installed dependencies were reused with a symlink, not reinstalled or added to SillyNovel:

```sh
git fetch origin main
git rev-parse origin/main
git switch -c codex/dyl-18-text-reader origin/main
git clone --shared /tmp/sillynovel-m0lifecycle-st /tmp/SillyTavern-dyl18
git -C /tmp/SillyTavern-dyl18 checkout 7e8663cd9c184a550b37238218bdd32c6efc68e9
ln -s /tmp/sillynovel-m0lifecycle-st/node_modules /tmp/SillyTavern-dyl18/node_modules
mkdir -p /tmp/SillyTavern-dyl18/public/scripts/extensions/third-party
ln -s /home/dq/Projects/SillyNovel /tmp/SillyTavern-dyl18/public/scripts/extensions/third-party/SillyNovel

node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl18 node --test tests/m1-reader-browser.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl18/reader-host.mjs /tmp/SillyTavern-dyl18 /tmp/sillynovel-dyl18-final-evidence

node --check index.js
node --check src/shell.mjs
node --check src/host-adapter.mjs
node --check src/reader-source-model.mjs
node --check src/reader-view.mjs
node --check tests/fixtures/dyl18-openai-endpoint.mjs
node --check tests/probes/dyl18/reader-host.mjs
git diff --check
```

Final results: **37/37 Node tests PASS** (13 M0, 15 source-model, 9 existing DYL-19 helper/probe regressions); **14/14 behavioral Chromium tests PASS**; **12/12 isolated pinned-host scenario checks PASS**. Syntax checks and `git diff --check` passed. An ad hoc standard-library Python check validated 117 relative Markdown file links, fenced blocks, all 12 host results and eight fixture/runtime hashes; `sha256sum -c SHA256SUMS` passed for all nine screenshot/result artifacts in the evidence directory. No SillyNovel dependency, application framework, build migration or CI job was added. The DYL-19 host-storage probe was not rerun; its historical results and blocked contracts are unchanged.

The browser suite serves the actual `index.js`, controller, source model, adapter and renderer. A synthetic host context drives real DOM controls and lifecycle observations. Its `/lib.js` shim exposes the actual installed host Showdown/DOMPurify libraries; it does not mock the renderer. It verifies mount/update/dispose; complete long Markdown and exact clipboard copying; malicious HTML and encoded/unsafe protocols; navigation/pinning/unread; independent text following and text selection through closing Markdown; deleted/replaced sources; current-index re-resolution and failed locator fallback; exact draft/caret/focus; toggles; missing capability and mount/render failure; queued A → B → A reads and delayed copy feedback; IME/editable-field key isolation; empty/unresolved authors and reduced-height layout.

Development failures were retained as failures, not relabeled PASS: early browser passes had 7/14, 12/14 and 10/14 outcomes while correcting sanitizer wrapper handling, discarded head-only script content, and generated heading IDs. Targeted closing-Markdown selection and unobserved-chat-switch handoff checks failed before range restoration and intended-source guards were added; both now pass within the 14-test suite. Manual host automation initially sampled scrolling too near the bottom; the corrected check scrolls up only after at least 500px of overflow and verifies the exact 100px offset through the rest of the stream. Early full host-run attempts stopped on hidden-settings selection, premature Stop/continuation sampling, native initialization/data-comparison races, and chat/drawer frame transitions. The final probe waits for native state and observer frames instead of assigning success from those failed attempts. Source inspection traced the metadata race to host `WorldInfoTimedEffects` creating `timedWorldInfo` even in a dry run; the before/after comparison waits for that initialization and compares canonical card content while omitting derived character-list metadata and duplicate card serialization.

### Host, browser and fixture isolation

Host: **SillyTavern 1.19.0**, `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Browser: **Chromium 151.0.7922.34**, headful Playwright browser, Ubuntu 24.04.5 LTS, Node v26.8.1. Desktop viewport: 1440×1000; narrow: 390×800; keyboard-height approximation: 390×500 with composer focused. This is viewport simulation, **not physical-device or real virtual-keyboard evidence**.

[The host probe](../tests/probes/dyl18/reader-host.mjs) refuses an unpinned host or a different mounted extension. It creates a fresh `mkdtemp` data root, seeds only its own local-endpoint settings, and starts its own loopback host and deterministic endpoint processes on ports 8018/8128. It verifies both its exact data-root announcement and listener before connecting, so an occupied port cannot redirect it to another host. Character Management creates two invented cards, Mira Reader A/B, through native UI. All sends, stop/continue, edits, swipes and switches use native controls. It saves screenshots/results to the explicit output directory, closes its browsers, stops only its children and removes its own data root even on a failed check. Fixed ports are a documented concurrency ceiling; run one such probe at a time.

The endpoint returns a synthetic short Markdown reply or the complete 9,951-character chapter when the latest user message contains `[LONG]`. No credentials or real provider were used. Reproduce with a dedicated pinned host checkout and its declared installed dependencies; the extension symlink must point to the review checkout. Provide `SN_PLAYWRIGHT_MODULE` for an external installed Playwright module, or use an already installed `playwright` package. A display is required for the headful host/actual browser-zoom check. The browser-only synthetic suite runs headless.

Actual 200% **browser zoom** used a temporary test-only Chrome extension with `chrome.tabs.setZoom(2)`/`getZoom`; it did not inject page code. Metrics in results prove CSS viewport width/height halved while `visualViewport.scale` remained 1. This was not CSS zoom, pinch zoom or device scaling. The test extension/profile were removed with the owned root. At 200%, reader navigation and the native composer remained reachable.

### Result matrix and screenshots

| Scenario | Evidence/result |
| --- | --- |
| Enable after successful mount; native chat/data preserved | HOST PASS; one stage, feed mounted/hidden by owned class, native data comparison unchanged |
| Normal native send and streamed formatted reply | HOST PASS; reader updates real selected host text |
| Stop and native Continue | HOST PASS; readable stopped partial state; existing source grows on continuation |
| Backlog/original locator, edit, new swipe and earlier swipe | HOST PASS; verified native handoff, native text edit reflected, native swipe state respected on return |
| Three reader/chat transitions with draft, caret and focus | HOST PASS; exact `Exact draft 日本語 with selection`, backward selection 2–8, same active native textarea |
| Older pinned source while user/assistant replies arrive | HOST PASS; original dialogue retained, `2 new`, explicit Latest restores following |
| Long full formatted/copyable source; independent scrolling | HOST PASS; all 9,951 source characters copied exactly; 65 chapter paragraphs and final marker; scrollTop remains 100 while stream grows |
| Narrow and composer-focused reduced height | HOST PASS as viewport simulation; composer/send visible, dialogue scrollable; dimensions in results |
| Native A → B → A | HOST PASS; each activation selects its own current latest source; no old text carried into B |
| Disable/re-enable during and after generation | HOST PASS; native reply continues, one stage restored, full source remains readable |
| Deliberate renderer exception | INSTRUMENTED_HOST_PASS; an extension-owned text node was made to throw, native edit triggered update, native feed/draft/caret restored and clean re-enable succeeded |
| Actual 200% browser zoom | HOST PASS; navigation and native composer remain reachable |
| Exact re-resolution after insert/reorder, missing/ambiguous/unrendered locator fallback | SYNTHETIC browser PASS; native paginated/deep-history fallback NOT_TESTED |
| Initial mount failure, capability omission, deleted/replaced/empty sources, queued old reads, delayed clipboard feedback and IME/editable-key exclusion | SYNTHETIC browser PASS; natural host failures/physical IME NOT_TESTED |

Representative verified screenshots (all synthetic, on the SHA in results): [desktop](evidence/dyl18/desktop-reader.png), [long scrollable reply](evidence/dyl18/long-scrollable-reply.png), [pinned older source](evidence/dyl18/pinned-older-message.png), [narrow](evidence/dyl18/narrow-reader.png), [keyboard-height simulation](evidence/dyl18/keyboard-viewport-simulation.png), [native backlog](evidence/dyl18/native-backlog.png), [render-failure recovery](evidence/dyl18/render-failure-native-recovery.png), [200% browser zoom](evidence/dyl18/browser-zoom-200-percent.png). Fixture/runtime SHA-256 hashes are in results; screenshot SHA-256 hashes are in [SHA256SUMS](evidence/dyl18/SHA256SUMS).

### Security coverage, limits and next work

Ordinary paragraph/line-break, emphasis/strong/nested emphasis, lists, inline/fenced code, heading and safe-link rendering passes. Long text is never truncated and Copy preserves exact raw source. Malicious `<script>`, event-handler image, SVG/iframe/srcdoc, encoded `java&#x73;cript:`, percent-encoded scheme, `javascript:` and `data:` links, malformed HTML and unmatched/nested Markdown pass the actual entry/render path checks. Unsafe/unsupported source remains complete readable plain text with a native Backlog route. No model HTML, styles, images/media, host-facing classes/actions, executable URLs or slash commands are installed by the reader. The final allowlist/protocol validation is separate from sanitizer-removal fidelity detection.

Known UX limits: complete messages only; existing history and uncorrelated completion retain “Completion status unknown”; re-enable mid-generation cannot reconstruct lifecycle events missed while disabled. Unsupported rich content is shown literally. The original host campaign covered candidate positioning for already-rendered messages. The P2 correction below removes its unverified exact-match claim; the current pinned-host adapter always reports unresolved correspondence, including after a candidate scroll. Earlier paginated messages require native history loading. There is no keyboard shortcut layer, replacement composer, art, scene state or persistence.

NOT_TESTED on this final reader UI: physical touch/IME/virtual keyboard; other browser engines, devices, themes, extension combinations or host versions; real model/provider inference; natural missing-capability/mount failure; final-host native deletion-to-empty/replaced-object/eventless Temporary Chat and group-reader edge cases; actual native pagination/deep-history fallback; generation network failure/abort beyond explicit Stop; separate persisted lorebook/persona-store hash comparison. Those paths retain synthetic coverage or their previous dated evidence; no earlier host evidence is silently promoted to this SHA. L10 stays UNSUPPORTED / WAIVED. DYL-19 PARTIAL/BLOCKED storage findings are untouched.

Recommendation: review and manually try this bounded DYL-18 reader candidate. Keep the PR OPEN/UNMERGED and issue In Review until the owner decides. A separate, explicitly authorized read-only host history-loader proof is the bounded follow-up if exact deep-backlog handoff is required. Gate A is NOT_RUN; this technical evidence does not start later milestones or supply a human verdict.

## PR #8 P2 stale native DOM correction — 2026-10-12

Reviewed starting head: `29cb5bf8d348490f407565f9c3f9e91db6afb1d7`. Automated-tested correction code: `f0e811bab1b3c74acd0ac00c4f75d9e9cf980684`. The final pushed head is recorded in the PR/Linear handoff; subsequent documentation and host-probe result-label changes do not change this correction's runtime or automated-test bytes.

The added actual-entry test replaces the canonical Mira message object at index 1 without calling `renderNative()`, retains the same author/role/swipe attributes, emits `MESSAGE_EDITED`, confirms that the reader accepted the new canonical text, and requests Backlog. Before the fix, the targeted command below failed with “Original message located.” Afterward it reports “Exact source could not be located”, opens native chat, and keeps the composer usable. The same test covers a subsequent native render with an index-only notification and an in-place canonical edit while the DOM stays stale. Existing reorder coverage verifies that candidate scrolling and returning to the pinned reader still work, while a missing candidate does not scroll.

Pinned-source inspection found no source-object/text-revision token on the native element (`public/script.js:2618–2705`). `MESSAGE_EDITED` precedes native text replacement (8405–8431); render notifications carry only index/type, including streaming error notifications (3829). A notification, matching DOM attributes or a DOM mutation is insufficient proof. The adapter therefore preserves candidate navigation but always returns the unresolved result. No raw-Markdown/rendered-text comparison or host formatter hook is introduced. The host probe expectation was updated for the honest notice and syntax-checked, **not executed**.

Commands actually run:

```sh
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl18 node --test --test-name-pattern='stale native revision' tests/m1-reader-browser.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl18 node --test tests/m1-reader-browser.test.mjs
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/probes/dyl19/*.test.mjs
node --check src/host-adapter.mjs
node --check tests/probes/dyl18/reader-host.mjs
git diff --check
```

Results: targeted pre-fix reproduction **FAIL as expected**; corrected full browser suite **15/15 PASS**; Node regressions **37/37 PASS**; syntax/diff checks **PASS**. `sha256sum -c SHA256SUMS` in `docs/evidence/dyl18` verified all nine unchanged historical artifacts. Browser: headless Chromium 151.0.7922.34, synthetic host fixture, actual extension entry and pinned-host Showdown/DOMPurify libraries. The 12-scenario SillyTavern host campaign was **not rerun**, as requested by the review. Its existing results/screenshots/checksums are retained at the recorded host-tested SHA `3d136668e97a47f602775c9297b567c73293261e`, not attributed to this new adapter. No hosted GitHub CI result is claimed. All previous untested surfaces remain untested; DYL-18 remains In Review and Gate A remains NOT_RUN.

## DYL-26 isolated host storage spike — 2026-10-12

The [spike report](M1_HOST_STORAGE_SPIKE.md) records exact candidate/host/fixture hashes, commands, stored records, negative cases and identity limits. `tests/probes/dyl26/host-probe.mjs` creates its own disposable checkout and data root from a pinned host checkout with installed dependencies; it applies the test-only mount patch and module, uses authenticated synthetic users and loopback-only HTTP, then removes only its owned process/data/checkout. Supply a new output directory; an existing output or fixture namespace refuses collision.

This is an **EXPERIMENTAL_HOST** storage/API test, not a native UI lifecycle test or production persistence. New/copy/branch identities and view activation are test-only host additions. Native rename is tested for safe refusal; identity preservation through rename remains unsupported. Node and actual-entry browser regressions retain the unchanged session-only stage; their passes are distinct from owner experience. Gate A remains NOT_RUN.

## DYL-27 native lifecycle experiment — 2026-10-12

[Report, exact commands, hashes and classifications](M1_NATIVE_IDENTITY_ACTIVATION.md). The runner in `tests/probes/dyl27/host-probe.mjs` owns a disposable pinned host, synthetic accounts/cards/transcripts, browser context and deterministic loopback responder. It distinguishes native UI selection/editor/send, direct native browser-function calls, actual native endpoints, fault injection and synthetic regressions. Do not use its experimental API or patch as production persistence. Existing transcript adoption/import allocation, complete group/card lifecycle, reordered canonical load responses and automatic interrupted-update recovery remain blocked or untested. Gate A stays NOT_RUN.


## DYL-42 native writers — 2026-10-14

[Complete report and reproduction](M1_NATIVE_WRITER_COVERAGE.md). Set `SN_DYL42=1` when running `tests/probes/dyl28/host-probe.mjs` to apply the additional test-only writer patch and invoke `tests/probes/dyl42/writer-campaign.mjs` after all inherited checks. Use only a disposable pristine pinned host and a new evidence directory. Source inspection covers all listed native writers including startup migration, Data Maid, account reset/delete and BYAF import; inspection never certifies runtime support.

The campaign distinguishes native browser-function invocations, clicked native controls, actual authenticated multipart/JSON endpoints and fault injection. It checks fresh/forged/identical imports, no-op versus changed source revisions, stale CAS/tickets, native copy/two branches and independent edits, four-member duplicate-label groups with explicit visual refusal, collision revocation before byte restoration, actual canonical and registry permission failures, malformed/corrupt/unknown state, restart and owned cleanup. Production stage/reader/reducer bytes remain unchanged. Full results/counts/hashes are in the linked report; Gate A stays NOT_RUN.

## DYL-43 native lifecycle and registry boundaries — 2026-10-14

[Complete inventory, failure matrix, exact commands, SHAs, raw records/hashes and cleanup](M1_NATIVE_LIFECYCLE_INVALIDATION.md). Frozen proof `ca577c2da9fafb50210a1db3e2e416dc27a78854`: **38/38** lifecycle checkpoints (16 inherited + 22 new), **33/33** inherited writer checkpoints on the same patched host, **64/64** Node and **24/24** actual-entry Chromium. Native browser rename includes historical message rewriting; other new native lifecycle/cleanup paths use authenticated endpoints with explicitly identified synthetic setup and faults. Failed registry invalidation refuses native mutation; permanent scoped/chat revocation and pending-store refusal survive tested restart. The unobserved identical-byte replacement counterexample **accepts old authority** and supports REVISE, not comprehensive coverage. Startup/account/migration/restore and other character-import formats remain source-only/NOT_TESTED; multi-process, physical device, real provider and power-loss behavior are NOT_TESTED. Gate A remains NOT_RUN.

## DYL-44 lifecycle reservations and write generations — 2026-10-14

[Contract, commands, frozen SHAs, hashes, raw bytes and limits](M1_NATIVE_LIFECYCLE_GENERATIONS.md). `SN_DYL44=1` applies all inherited patches plus the new overlay and runs 16 inherited + 20 new checkpoints in an owned pinned-host/data-root process. `SN_DYL44=baseline SN_DYL43=1` runs the complete inherited lifecycle campaign with the new overlay; `SN_DYL44=baseline SN_DYL42=1` runs the complete inherited writers. Use a fresh output directory and only the documented disposable pin/dependencies.

Final evidence: 36/36 new-campaign expected outcomes, 38/38 inherited lifecycle, 33/33 inherited writers (overlapping totals), 64/64 Node and 24/24 actual-entry Chromium. Two new outcomes reproduce unsafe unknown-write and whole-root rollback controls; they are **not safety passes**. New races use actual authenticated native endpoints with deterministic barriers at native async boundaries. File-permission and injected failures, process stop during native rename, restart refusal, source/content versus write-generation separation, and unchanged visual records are recorded independently. Whole-root rollback uses only generated test-owned files and hardlinks to retain file identities; it is synthetic restore, not a supported restore API. Recommendation REVISE; no physical-device, paid-provider, multi-process or power-loss claim. Gate A remains NOT_RUN.


## DYL-45 external authority and enrollment — 2026-10-14

[Exact commands, counts, hashes, raw bytes and limitations](M1_EXTERNAL_STORE_AUTHORITY.md). `SN_DYL44=baseline SN_DYL45=1` runs the new campaign after all 16 inherited load/CAS checks. `SN_DYL45=baseline` applies the same overlay without the new campaign, permitting unchanged DYL-42/43 comparisons. The original DYL-44 counterexamples remain untouched. Independent external authority is outside the owned data root and excluded from the hardlink rollback snapshot.

Do not label the complete inherited overlay suites PASS: their unchanged availability expectations fail under conservative external pending/digest refusal, with explicit raw evidence and counts in the report. Missing/corrupt-state tests restore only injected fixture faults, never imply a supported recovery API. Node and actual-entry Chromium regressions exercise unchanged production files. No account migration, external-authority rollback, cross-process or power-loss guarantee. Gate A remains NOT_RUN.


## DYL-46 external reconciliation — 2026-10-14

[Contract, exact commands, hashes, fault matrix and evidence](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md). Frozen proof `1ae869f6b289a71a490fedf15799073e559c1ac2`, pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Enable `SN_DYL46=1 SN_DYL44=baseline SN_DYL45=baseline` in the existing owned DYL-28 runner; `SN_DYL46=baseline` applies only the patch when exercising an unchanged predecessor campaign.

New campaign: 43 expected checkpoints, including two unsafe accepted counterexamples. Full unchanged writer overlay 33/33; lifecycle FAIL after 21; generations FAIL after 27; authority FAIL after 32. Unreached suffixes are not green; no inherited campaign assertions changed. F1–F8, clean-abort faults, two accounts, enrollment races, held old CAS/load, root rollback across two restarts and forged local fields have direct replacement evidence. Failed external intent plus unknown byte restoration plus process restart remains an explicit unsafe control. Recommendation REVISE / compatibility HOLD.

Node TAP 64/64; actual-entry Chromium 24/24; Node v26.8.1 / Chromium 151.0.7922.34. All owned cleanup checks pass; no new host/provider/device/owner compatibility claim. Raw JSON is losslessly XZ-compressed; readable indexes, baseline boundary bytes, summaries and checksums are included.


## DYL-46 review correction validation — 2026-10-15

[Updated protocol, exact per-run commands and evidence](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md#pr-20-review-corrections--2026-10-15). Protocol proof `37cef930fcbde90ccbb20071fa4834a3dddc91b6`; final reconciliation/writer proof `b57257fde1190ca5b074ed276ba12591f40c7ec5` changes only the new campaign's expired-client fixture. Runner/host implementation hashes are identical. Original evidence remains under dyl46; corrections and all unsuccessful attempts are under dyl46/review with separate checksums.

New campaign 56 expected = 16 inherited + 40 new, including ONE unsafe unknown-writer control. Failed observation + restored bytes + two restarts now proves durable refusal; pending/missing/corrupt/binding-invalid witness and finalization faults refuse without reconstruction. Inspected completed revocation checks rename/delete/import, old CAS/load, restart, healthy work and failed finalization. Partial new-card write remains INDETERMINATE. Root rollback and selected-field forgery remain refused.

Unchanged inherited suites: writers 33/33 after one preserved common-setup timeout; lifecycle FAIL after 23 (partial rename); generations FAIL after 27 (external-before-local EACCES); authority FAIL after 31 (old store-wide refusal versus completed revocation). Unreached suffixes are NOT_REACHED. Node 64/64. Unchanged actual-entry Chromium FAIL 23/24 on both attempts, line 445 expected false/actual undefined from absent-source optional chaining; no test or production change made to hide it. REVISE / HOLD; no hosted CI or owner-experience claim.


## DYL-46 re-review validation — 2026-10-15

[Current report, commands, revisions, hashes, raw evidence and limits](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md#pr-20-re-review-corrections--2026-10-15). Frozen proof `59acdbc0c66cb58ed616351947cd1c83ddc85ae7`; all final campaigns use identical frozen runner/host patch bytes. Reconciliation 61 expected, including ONE unsafe unknown-writer control; writers 33/33, approved lifecycle 41/41, generations 37/37, approved authority 46/46. Complete suffixes reached. Node TAP 64/64; corrected actual-entry Chromium 24/24 at the PR proof and at main1046106 with identical corrected test bytes. Separate old failures and new development failures are preserved. Fixture resets restore both independent authorities only after pending/restart refusal proof; they are synthetic isolation, not recovery. No production, real provider, multi-process, physical-device or human-gate claim.
