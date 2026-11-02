# M2.2 director transport — implementation record

**Status: runtime probe complete; implementation STOPPED pending an owner statement.** No module code exists. The probe contradicts the [plan](M2_2_DIRECTOR_TRANSPORT_PLAN.md) and two [rulings](DECISIONS.md#owner-rulings-e1e14--m22-director-transport--2026-11-01) as worded, so section 2 asks instead of working around them. Section 2's proposals are recommendations, not approvals. Tracked by [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation). Gate B remains NOT_RUN.

**Date:** 2026-11-01, America/Phoenix. **Starting main:** `d9f975f886ce05b23682002f03de7c7f3adc4e90`.

## 1. Runtime probe

Run on a disposable clone of pinned SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9` (`public/script.js` SHA-256 `955c603d…`, matching the DYL-60 pin), Node 26.8.1, Playwright 1.62.1, Chromium 151.0.7922.34, with the synthetic loopback `tests/fixtures/m2-director-endpoint.mjs` on `127.0.0.1:8128`, Chat Completion source `custom`, and an active decoy persona (`name1` and `persona_description` read back before the requests).

```sh
SN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs timeout -k 5 300 node tests/probes/m2-director/probe.mjs /path/to/pinned/SillyTavern
```

Result: the probe completed; the third run is the recorded one. Raw output: [probe-findings.json](evidence/m2-2/probe-findings.json). All data is synthetic; no real provider was contacted. Two earlier runs exposed that the persona decoy was not yet active, so their results are not used. This is what the host did, not a pass of any TESTING row.

### Plan section 2.4 items

| # | Item | Finding |
| --- | --- | --- |
| 1 | Request body at the endpoint | Exactly two messages, `system` and `user`, in order, each with `"name": ""` on the wire. Other keys: `model`, `temperature`, `max_tokens` (the user's 300), `stream: false` although the user's streaming setting was on, `presence_penalty`, `frequency_penalty`, `top_p`. |
| 2 | Bytes | 78 files (cards, chats, groups, worlds, avatars, presets, `settings.json`): none changed across a request. `chat` JSON and `#chat .mes` count unchanged; `openai_max_tokens` unchanged. |
| 3 | Events | Only `chat_completion_prompt_ready` and `chat_completion_settings_ready`. No `GENERATION_*`, `MESSAGE_*` or `CHARACTER_MESSAGE_RENDERED`. |
| 4 | `online_status` | `no_connection` before connecting, `Valid` after. **The host does not refuse:** a request made while `no_connection` still reached the endpoint and succeeded, so SillyNovel's own check is the only guard. |
| 5 | Text completion and instruct | Pure `createRawPrompt` only; NOT_TESTED on a text-completion backend. Without instruct: `INSTRUCTION\nDATA\n`, no name prefix. With instruct (Alpaca): `### Input:\nINSTRUCTION\n\n### Instruction:\nDATA\n\n### Response:\n`; the system message is wrapped as input and the data as the instruction. |
| 6 | Send during a request | Concurrent backend: the user's reply completed normally and the chat grew by exactly two; the held director result still returned afterward. **Single-slot backend that rejects while busy (synthetic 503): the user's reply failed**, see section 2.3. A queueing backend is NOT_TESTED. |
| 7 | Macro syntax | `{ {`, `} }` and every braced form tried arrive unchanged. `{{persona}}` sent the persona description and `{{input}}` the composer draft, confirming the plan's concern. **Other trigger syntax does exist**, see section 2.2. `\{\{persona\}\}` arrives as literal `{{persona}}`, backslashes removed, not expanded. |
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

## 2. Contradictions needing an owner statement

### 2.1 E4: the plan's completion order does not occur on streamed replies

Plan section 4 defines `complete` as a `messageReceived` or `characterMessageRendered` observation “followed by `generationEnded`”, and section 3 says the host emits them in that order. That holds only without streaming. **With streaming, the host default, `GENERATION_ENDED` comes first**, so under the literal rule a streamed reply never reaches `complete` and no director request ever fires.

**Proposal (not approved):** `complete` when both a received-or-rendered observation naming the generated source and a `generationEnded` have arrived for the same generation, in either order, with no `generationStopped`, for started types `normal`, `continue`, `regenerate` or `swipe`. Evidence for safety: streamed Stop delivers `stopped` before `received`; non-streamed Stop delivers no reply. The type comes from `generationStarted` only, because message events report `normal` for regenerate and `appendFinal` for continue.

### 2.2 E9: brace neutralization does not stop every expansion

The host also rewrites five legacy markers, **case-insensitively**, at `scripts/macros/engine/MacroEngine.js` L283–L291: `<USER>`, `<BOT>`, `<CHAR>`, `<GROUP>`, `<CHARIFNOTGROUP>`. Over the wire, chat text containing `<USER>` arrived as the persona name, `<CHAR>` as the card name, and in a group `<GROUP>` as every member's name (`Mira, Mira, Rowan, Sage`), including members outside the evidence window. `<BOT>` and `<CHAR>` became empty in a group. Only names leak, never descriptions, but E14 allows labels *inside the evidence window* and O06 limits content to that window, so this exceeds both.

**Proposal (not approved):** extend the E9 assembler to break those five markers the same way, `<USER>` → `< USER>`, case-insensitively; `< USER>` and `<USER >` were verified to arrive unchanged. The evidence texts keep the original, so an excerpt spanning a marker fails `INVALID_EVIDENCE`, as with braces. Note also that a plain `{{`→`{ {` replacement leaves `{ {{` when given `{{{`; the assembler must break every adjacent pair, which `{ { {` arriving unchanged supports.

### 2.3 Plan section 4: a director request can fail the user's reply on a rejecting single-slot backend

Section 4 states nothing blocks replying, and `AGENTS.md` says failed providers must not block replying. With a synthetic backend that returns 503 while busy, pressing Send during an outstanding director request left the user's message in the chat with no reply and a host error toast. The director result still arrived afterward. The composer stayed usable and nothing was corrupted, but that reply was lost until the user retried. Whether real local backends behave this way was not tested.

**Proposal (not approved):** accept and record it as a known limit of an off-by-default feature, with a sentence in the toggle's help text. `generateRawData` takes no signal, so SillyNovel cannot abort its own request when the user presses Send. Alternative: the owner defers the director on single-slot connections, which the host does not identify.

## 3. Implementation choice to confirm with the above

A group turn completes each member in turn with the next `started` immediately after, so requesting on every member's completion would issue up to four requests per turn, three of them stale but still counted toward the ceiling under E6. Proposed: wait a short settle interval after completion and re-check before issuing, with the interval measured in the native campaign.

## 4. Not done

Everything after the probe: E4 reader change, adapter method, request assembly, parser, controller, journal origin, UI, tests, `tests/probes/dyl60/run.py` registration, TESTING rows, STATUS and ROADMAP entries, draft PR. No runtime file changed, so no Node, browser, storage or native campaign suite was run, and none is claimed.

Retained root, disposable and task-owned: `sn-m2-probe-SATDAA` under this session's scratchpad, with `probe-findings.json` and `host.log`.

**Next bounded step:** an owner statement on 2.1, 2.2 and 2.3, recorded in DECISIONS; implementation then resumes at E4.
