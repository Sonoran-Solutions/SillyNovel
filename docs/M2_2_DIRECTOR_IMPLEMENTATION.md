# M2.2 director transport — implementation record

**Candidate for owner review, draft PR, unmerged.** One quiet text-director request per completed head, over the host's own raw generation path on the connection the user selected, applying temporary expressions only. Off by default. Implemented under [E1–E14](DECISIONS.md#owner-rulings-e1e14--m22-director-transport--2026-11-01) as amended by the [rulings after the host probe](DECISIONS.md#owner-rulings-after-the-m22-host-probe--2026-11-01). Tracked by [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation). Gate B remains **NOT_RUN**; nothing here claims the director is useful or accurate.

**Post-merge update — 2026-11-01.** The owner [accepted and merged](DECISIONS.md#owner-acceptance--m22-implementation-merged--2026-11-01) this candidate at `f570484dc9975ab543d4b116a198c9ba21dcd6ec`; section 8 choices stand as the reversible baseline. The rest of this document is the historical candidate record.

**Date:** 2026-11-01, America/Phoenix. **Starting main:** `d9f975f886ce05b23682002f03de7c7f3adc4e90`; `origin/main` `2d41f386928a9c9f11c0d365a1ec8839c565c35d` merged before freezing. **Frozen implementation/test SHA:** `d5664119d060d72f90aee4e3a386fdf409843a5c`. Every later commit on the branch is documentation or evidence only.

## 1. Runtime probe

Run on a disposable clone of pinned SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9` (`public/script.js` SHA-256 `955c603d…`, matching the DYL-60 pin), Node 26.8.1, Playwright 1.62.1, Chromium 151.0.7922.34, with the synthetic loopback `tests/fixtures/m2-director-endpoint.mjs` on `127.0.0.1:8128`, Chat Completion source `custom`, and an active decoy persona (`name1` and `persona_description` read back before the requests).

```sh
SN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs timeout -k 5 300 node tests/probes/m2-director/probe.mjs /path/to/pinned/SillyTavern
```

Run before any module code. Result: the probe completed; the third run is the recorded one. Raw output: [probe-findings.json](evidence/m2-2/probe-findings.json). All data is synthetic; no real provider was contacted. Two earlier runs exposed that the persona decoy was not yet active, so their results are not used. This is what the host did, not a pass of any TESTING row.

### Plan section 2.4 items

| # | Item | Finding |
| --- | --- | --- |
| 1 | Request body at the endpoint | Exactly two messages, `system` and `user`, in order, each with `"name": ""` on the wire. Other keys: `model`, `temperature`, `max_tokens` (the user's 300), `stream: false` although the user's streaming setting was on, `presence_penalty`, `frequency_penalty`, `top_p`. |
| 2 | Bytes | 78 files (cards, chats, groups, worlds, avatars, presets, `settings.json`): none changed across a request. `chat` JSON and `#chat .mes` count unchanged; `openai_max_tokens` unchanged. |
| 3 | Events | Only `chat_completion_prompt_ready` and `chat_completion_settings_ready`. No `GENERATION_*`, `MESSAGE_*` or `CHARACTER_MESSAGE_RENDERED`. |
| 4 | `online_status` | `no_connection` before connecting, `Valid` after. **The host does not refuse:** a request made while `no_connection` still reached the endpoint and succeeded, so SillyNovel's own check is the only guard. |
| 5 | Text completion and instruct | Pure `createRawPrompt` only; NOT_TESTED on a text-completion backend. Without instruct: `INSTRUCTION\nDATA\n`, no name prefix. With instruct (Alpaca): `### Input:\nINSTRUCTION\n\n### Instruction:\nDATA\n\n### Response:\n`; the system message is wrapped as input and the data as the instruction. |
| 6 | Send during a request | Concurrent backend: the user's reply completed normally and the chat grew by exactly two; the held director result still returned afterward. **Single-slot backend that rejects while busy (synthetic 503): the user's reply failed**, see section 2. A queueing backend is NOT_TESTED. |
| 7 | Macro syntax | `{ {`, `} }` and every braced form tried arrive unchanged. `{{persona}}` sent the persona description and `{{input}}` the composer draft, confirming the plan's concern. **Other trigger syntax does exist**, see section 2. `\{\{persona\}\}` arrives as literal `{{persona}}`, backslashes removed, not expanded. |
| 8 | Stop | The user's Stop, and `stopGeneration()` with no user generation, reject the request with `Error('Cancelled by stop event')`; the endpoint saw the connection close before any reply; no host toast. No Stop control is shown for a director-only request. |

### Other observations

| Observation | Consequence |
| --- | --- |
| `createRawPrompt` mutates the caller's message objects and returns the same array. | The adapter passes a fresh copy, so no caller retains expanded text. |
| Decoy persona description, lorebook entry, card description and an extension prompt set through `setExtensionPrompt` are absent from the host request and the endpoint body. | O06 content scope holds for `custom`. |
| The browser-to-host request also carries `user_name` (persona name), `char_name` (card name) and `group_names`. The `custom` endpoint body contains none of them. | Sources whose server-side converters use those fields are NOT_TESTED. |
| `extractMessageFromData`: normal content returned; text parts concatenated; `reasoning_content` excluded; empty `choices`, empty or `null` content, and a `refusal` with `null` content all return `''`. | All map to `EMPTY_RESPONSE`. |
| HTTP 500, 429 and 200-with-`error` throw `Error(<provider message>)` **and the host itself shows an error toast**. | The user sees a host toast for a director failure in addition to SillyNovel's notice; SillyNovel cannot suppress it through the entry point. |
| `"name": ""` reaches the wire on Chat Completion, where the host applies no name prefix anyway. | Providers that validate `name` may refuse it, which would surface as `TRANSPORT_ERROR` under E7. NOT_TESTED; no real provider in scope. |
| `max_tokens` is the user's setting (E8 forbids overriding it). | A long proposal can be truncated, which fails parsing and takes the E7 failure path. |

### Native generation event order

Started types are reliable; the type argument on message events is not.

| Flow | Order observed (excluding tokens) |
| --- | --- |
| normal, streaming | `started(normal)`, `message_sent`, **`ended`, `received`, `rendered`** |
| normal, not streaming | `started(normal)`, `message_sent`, `received`, `rendered`, `ended` |
| regenerate, not streaming | `started(regenerate)`, `deleted`, `received(id, 'normal')`, `rendered`, `ended` |
| continue, not streaming | `started(continue)`, `received(id, 'appendFinal')`, `rendered`, `ended` |
| swipe to a new reply | `swiped`, `started(swipe)`, then as above for the mode, then a dry-run `started(normal, …, true)` |
| swipe back | `swiped`, dry-run `started(normal, …, true)` only |
| Stop, streaming | `started`, `message_sent`, `ended`, `stopped`, `received`, `rendered` (partial text) |
| Stop, not streaming | `started`, `ended`, `stopped`, `message_sent`, `ended`; no reply message |
| quiet (`generateQuietPrompt`) | `started(quiet)`, `ended`, then a dry-run `started`; no message |
| group of four, streaming | `started` twice for the first member, then per member `ended`, `received`, `rendered`, with the next `started` directly after |

## 2. What the probe contradicted, and the owner's rulings

The probe stopped work at `ea9bdca`. The owner was given the proposals below and said “Accept all four.” The rulings are recorded in [DECISIONS](DECISIONS.md#owner-rulings-after-the-m22-host-probe--2026-11-01).

| Finding | Ruling | Where honoured |
| --- | --- | --- |
| Streamed replies emit `GENERATION_ENDED` before the message events, so the plan's “followed by” rule never completes. | **E4 amended:** both observed for the same generation, in either order, with no stop. | `resolveCompletion` in `src/reader-source-model.mjs` |
| `<USER>`, `<BOT>`, `<CHAR>`, `<GROUP>`, `<CHARIFNOTGROUP>` (any case) expand past brace neutralization and send persona, card and all group-member names. | **E9 extended:** a space after `<`, in addition to the braces. | `neutralize` in `src/director-request.mjs`, proven on the real wire |
| A rejecting single-slot backend fails the user's reply if Send lands during a director request. | **E16:** accepted limitation. The message is kept and a swipe or regenerate recovers. One sentence in the toggle's help text. | `src/stage-view.mjs`; section 9 records the Gate B question and M2.3 input |
| A group turn would request once per member, three of four stale but counted. | **E15:** about 2 s after the last completed head; a superseded head is never requested and does not count. | `SETTLE_MS` and `fire` in `src/director-controller.mjs` |

## 3. What changed

| File | Change | Persistence |
| --- | --- | --- |
| `src/reader-source-model.mjs` | Status `complete`; `observed` and `ended` on the generation record; `quiet` and `impersonate` never bind a source | None |
| `src/host-adapter.mjs` | `inspectCapabilities().director`, `inspectDirector()`, `requestDirectorText(messages)`; missing entry points disable the director only | None |
| `src/director-request.mjs` (new, pure) | `buildDirectorRequest`, `parseDirectorResponse`, `neutralize`, `PROMPT_VERSION` | None |
| `src/director-session.mjs` (new, pure) | `mirrorScene`, `routeProposal` | None; rebuilt per request |
| `src/director-controller.mjs` (new) | Page-lifetime runtime (slot, counters, settings) and per-attachment controller | Counters are memory-only; settings below |
| `src/project-expressions.mjs` | `origin` on decisions; manual set or clear outranks automatic at the same source | None (memory-only journal) |
| `src/project-scene.mjs`, `src/stage-view.mjs`, `index.js`, `style.css` | Controller lifetime, project toggle with help text, status line, ceiling field | `extensionSettings.sillynovel.director` only |

`src/scene-reducer.mjs`, `src/director-proposal.mjs`, the storage plugin and the project schema are unchanged. No dependency was added. `applyProposal` stays uncalled, as plan section 7 expected under E3-A.

### E4 behaviour change

**Merged M1 behaviour changes:** a manual temporary expression can now be applied to a freshly completed head without navigating away first. `GENERATION_ENDED` with no reply observation still stays `unknown` and still refuses the head. The T05 regression covers both orders in the actual entry. A later edit or swipe-back leaves `complete` on the record with a new source revision; the director's trigger keys on the generation, so neither issues a request.

## 4. Rulings and where each is honoured

| Ruling | Implementation | Evidence |
| --- | --- | --- |
| E2 | `requestDirectorText` calls `generateRawData` then `extractMessageFromData`; `generateRaw` and `generateQuietPrompt` are not called | Adapter unit test; native wire checks |
| E3-A | `routeProposal`: expressions to the journal, layout recorded `NO_AUTOMATIC_LAYOUT`, suggestions as plain text | Node, browser, native (T49) |
| E4 amended | Above | Node, browser T05, native T47 |
| E5 | `enabledProjects[projectId]` and `sessionCeiling` in host settings | Saved payload and bundle checks (T48) |
| E6 | Counters keyed by project in page memory; see section 8 for the chat-switch reading | Node; native |
| E7 amended | Skip and count; pause on three consecutive failures; cap pauses at once; stale not a failure; slot released on settlement; 90 s abandonment | Node, loopback; native on real time |
| E8 | Fixed arguments; `responseLength`, `jsonSchema`, `prefill`, `systemPrompt`, `instructOverride` never set | Adapter unit test; browser recording; native max-tokens check |
| E9 extended | `neutralize` over all data, `name: ''`, final-payload assertion | Node; loopback; native wire (T40) |
| E10 | Reading earlier: skip and count, no catch-up | Node |
| E11 | Trigger gate on a present actor with compatible art | Node |
| E12 | 12,000 / 4,000 with anchored tail; catalog 4,000; response 32,768 bytes | Node boundary cases |
| E13 | One optional fence, no repair | Node |
| E14 | Author labels of window messages only | Payload fixture; native decoys absent |
| E15, E16 | Section 2 | Node; native group; help-text assertion |
| D7, O04, O06 | Journal only; user's connection; off by default, evidence window, one in flight, ceiling 40 | All levels |

## 5. Stale-result checks

Before any journal write, in order: the ticket is current and the controller live; `expressions.valid(token)`; the selection is still the anchored source; a mirror rebuilt from current state equals the captured one; `checkProposalEvidence` returns `CURRENT`; no pause was raised. Staleness is decided **before** the result is read, so garbage arriving after a chat switch is not a failure. `expressions.dispatch` then rechecks the exact source record atomically. No new stamp format was added.

## 6. Commands and results

All on frozen `d5664119d060d72f90aee4e3a386fdf409843a5c`, pinned SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Node 26.8.1, Playwright 1.62.1, Chromium 151.0.7922.34, loopback endpoint only.

```sh
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
python3 tests/probes/dyl60/check-discovery.py
SILLYTAVERN_ROOT=/path/to/pinned SN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs timeout -k 5 2700 python3 tests/probes/dyl60/run.py /new/evidence/dir
python3 tests/probes/dyl60/validate.py /new/evidence/dir
```

The retained package is committed; validate it from the repository with:

```sh
python3 tests/probes/dyl60/validate.py docs/evidence/m2-2/campaign
```

| Suite | Result | Elapsed |
| --- | --- | --- |
| `check-discovery.py` | PASS: 11/5/1 files, unexpected, empty and missing suites refused | Under 1 s |
| Node (11 files) | 227/227; 45 new against M2.1's 182 | 4 s |
| Storage (5 files) | 126/126; plugin unchanged, run because the runner runs it | 153 s |
| Browser, actual entry | 88/88; 6 new | 51 s |
| stage-library-migration | PASS, 24 checkpoints | 105 s |
| expressions | PASS, 16 | 64 s |
| groups | PASS, 22 | 92 s |
| recovery | PASS, 17 | 57 s |
| cleanup | PASS, 21 | 82 s |
| native-integrity-branches | PASS, 18 | 87 s |
| **director (new)** | PASS, 17 | 267 s |
| `validate.py` | PASS: 123 frozen inputs, 108 artifact hashes | |

Total 961 s. [Full package](evidence/m2-2/campaign/): [runs](evidence/m2-2/campaign/runs.json), [pins](evidence/m2-2/campaign/pins.json), [frozen input hashes](evidence/m2-2/campaign/inputs.json), [director checkpoints and the exact payload](evidence/m2-2/campaign/director/evidence.json).

The director campaign runs on real host generation with a decoy persona, lorebook and card descriptions seeded and read back as active. It covers: off by default; exact payload and decoys absent; `{{persona}}`, `{{input}}`, `{{getvar::x}}`, `<USER>`, `<GROUP>` neutralized on the wire; 80 native files byte-identical across a request with no lifecycle event and max tokens unchanged; continue, regenerate and swipe completing with exactly one request each; quiet, swipe-back and Stop not triggering; Send and Stop while outstanding; a chat switch mid-flight; malformed reply and HTTP 500; ceiling 3; three consecutive failures and resume; 90 s abandonment on real time (observed 90.0 s); the 20-turn Last Lantern script (20 director requests, 20 native replies, no director text in the chat, every non-chat file byte-identical, saved layout unchanged); a bundle carrying no director setting; and a real four-card duplicate-name group (four native replies, one settled request, expression on one UUID only, all native files byte-identical across the request).

## 7. NOT_RUN and NOT_TESTED

| Surface | Status and reason |
| --- | --- |
| Tablet replay of the two new controls | **NOT_TESTED.** The paired Galaxy Tab S8+ was reachable and unlocked, but its foreground was an unrelated app that looked to be in active use, and launching a browser would have taken over the owner's device. Toggle and ceiling keyboard operation is covered in desktop Chromium, which is not physical evidence. DYL-193 stays open. |
| Text-completion and instruct backends | **NOT_TESTED** on a backend. `createRawPrompt` output only; instruct wraps the data block as the instruction. |
| Real providers | **NOT_TESTED**, out of scope. Providers that validate `name` may refuse the E9 `"name": ""`, which would surface as `TRANSPORT_ERROR`. Sources whose server converters read `user_name`, `char_name` or `group_names` were not inspected. |
| Real single-slot backends, queueing or rejecting | **NOT_TESTED.** Only the synthetic 503 in the probe. |
| Other installed extensions rewriting the raw prompt | **NOT_TESTED.** Campaign runs with no third-party extension but SillyNovel. |
| Plain (non-streaming) order on the native campaign | The campaign runs streamed. Plain order is covered by the probe's event record, Node and the browser regression. |
| Database restore with the director enabled (T48) | Not exercised. The setting is in host settings, which the plugin does not hold; bundle import is exercised. |
| E10, E11 on the native host | Node only. |
| Gate B, T18, usefulness, accuracy | **NOT_RUN**, owner-gated. |

## 8. Implementation choices for owner review

Not settled by the documents; each is reversible and none is an owner ruling.

| Choice | Rationale |
| --- | --- |
| **E6 and chat switches.** Under F1 a chat switch always detaches the project and the user must explicitly reopen, so E6's “chat switches do not reset” and “reopen resets” collide. Counters live in page memory by project: a chat-switch detach and reopen keeps the count; the **Detach** button and **Discard and reopen** reset it; reload clears it. | Honours E6's stated reason that a chat switch must not be a free reset. |
| The in-flight slot is page-wide, across attachments and projects. | A detach or chat switch cannot release the host promise, so a second request would break one-in-flight. |
| A user Stop is `cancelled`, not a failure; it still counts toward the ceiling. | The user asked for it. |
| A 90 s abandonment counts as one failure. | A request that never answered failed; later settlement counts nothing more. |
| Automatic decisions keep their artwork when invalidated; manual ones keep M1's release. | Otherwise one continue would spend the only art and silently idle the director. Plan section 7 says invalidation rules match, which they do; this is only about releasing bytes. Bounded by the existing 32 PNG / 32 MiB limit. |
| Importing a new PNG while a request is outstanding makes that result stale. | The catalog changed, per plan section 8's field-by-field comparison. |
| A prior message that does not fit ends the window instead of being skipped. | The validator requires a contiguous window. |
| An expression bundled with an unapplied `outfitId` is recorded as ignored; with `present` it still applies. | The asset was validated against an outfit that will not exist; presence does not affect expression compatibility. |
| Enabling or a completion before enabling does not issue a retroactive request. | Attaching must not spend the ceiling. |
| The host's own error toast appears on provider failures in addition to SillyNovel's notice. | The entry point offers no way to suppress it. |
| `\{\{x\}\}` in chat arrives as literal `{{x}}`, unexpanded, and is left alone. | Observed in the probe: no expansion or leak. T40 is about expansion. |

## 9. Limits and next bounded step

The director moves expressions only (E3-A), so travel and presence categories stay fixture-only. It needs temporary PNGs imported this activation; reload or a chat switch drops them. A hung backend holds the slot until the host settles. The user has no Stop control for a director-only request. Other extensions can rewrite the raw prompt through host events.

**E16 follow-through.** Gate B evaluation question: does Send during a director request cost replies on the owner's real backend, and is one-sentence help text enough? M2.3 input: serialization between native generation and director requests.

**Retained disposable roots**, task-owned, under this session's scratchpad until review: `m2-2-campaign/`, `sn-m2-director-3wDTt5`, `sn-m2-probe-SATDAA`, `sn-portability-host-{oXIDqd,Mjxolq,niRobY,JfojIV,SBlfqH,KjYa6t}`, and the pinned host `st-pinned`. All owned processes stopped; port 8128 free.

**Next bounded step:** owner review of this draft PR and section 8. M2.3, M2.4, Gate B, DYL-193 closure, live installation and release remain gated, and this document starts none of them.
