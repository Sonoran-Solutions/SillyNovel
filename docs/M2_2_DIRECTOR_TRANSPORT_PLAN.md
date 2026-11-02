# M2.2 director transport plan — one quiet text-director request over the host's generation path

**Status: planning proposal, NOT approved.** This document proposes the second M2 slice: one configured text-director path over a real transport, feeding the merged M2.1 validator. It authorizes nothing. M2.2 implementation, any live director request, Linear tickets and later M2 slices each require a separate owner authorization recorded in [DECISIONS](DECISIONS.md). Gate B remains **NOT_RUN**.

**Date:** 2026-11-01, America/Phoenix. **Starting main:** `9ae2dbf1df23e1a7e3a569c14ff6a5c903b54a60`, the merge of PR #42 that records the owner's [rulings on the open decisions](DECISIONS.md#owner-rulings-on-open-decisions--2026-11-01) (O04, O06, D7 and the M2 evidence standard) and adds the AGPL-3.0 license. Runtime is unchanged by this document. The roadmap's own rule stands: these rulings unblock M2.2 planning, not M2.2 implementation.

Read alongside the [M2.1 plan](M2_1_DIRECTOR_PLAN.md) and [M2.1 implementation record](M2_1_DIRECTOR_IMPLEMENTATION.md), the [state and director contract](STATE_AND_DIRECTOR.md), [architecture](ARCHITECTURE.md), [roadmap M2](ROADMAP.md#m2--conservative-automatic-direction), [testing](TESTING.md), [M0 compatibility](M0_COMPATIBILITY.md) for the pinned host surface already relied on, and [attached temporary expressions](M1_PROJECT_EXPRESSIONS.md) for the journal that D7 names. Where this plan narrows the longer-term director contract, the narrowing is a bounded M2.2 proposal, not a replacement of that contract.

## 1. What M2.2 is and is not

The roadmap defines M2.2 as “one configured text-director path, bounded context, strict proposal validation”, evidenced by “synthetic transport tests; no canonical-chat mutations”. The owner's O04 ruling fixes the transport: the host's own generation path on the connection the user already has selected, exposed through the pinned host adapter as a quiet background request that never writes to the chat, with no new credential or billing route. O06 fixes the content and usage limits. D7 fixes where automatic expressions go in attached-project mode.

| In M2.2 (proposed) | Out of M2.2 |
| --- | --- |
| One host-adapter capability probe and one request method over the verified raw generation entry point (section 2) | A separate director connection profile (O04 names it as a later option, after Gate B evidence); `ConnectionManagerRequestService` is recorded only as that later option |
| Pure request assembly bounded by O06: evidence window, catalog labels, compact current scene, versioned instruction (section 5) | Persona, cards, lorebooks, author's note, system prompt, connection settings, images, the full conversation, `{{macro}}` expansion of any of them |
| Pure parsing of the raw response into exactly one JSON proposal, then the merged `validateProposal` (section 6) | Structured-output (`jsonSchema`) requests, response-length overrides, prefill, reasoning-template parsing (section 2.4, E8) |
| Off by default, enabled per project; one in flight; one per completed message; per-session ceiling 40 with a visible degrade-to-manual notice (section 4) | Queueing, deduplication beyond the one-in-flight rule, skipped-message catch-up, timeout/refusal recovery loops (M2.3) |
| Automatic expressions routed to the memory-only expressions journal (D7), manual decisions outranking them (section 7) | An automatic layout overlay for background, presence and outfit in attached-project mode (decision E3; M2.3/M2.4 candidate) |
| Stale-result and session/revision checks on the existing stamps (section 8) | Persistence of proposals, provenance or counters; any plugin schema change |
| Deterministic loopback transport tests, browser actual-entry tests and the native-host campaign (section 10) | Evidence UI, “Why this visual?” panel, manual correction flows, real-chat evaluation (M2.4); image work (M3); Linear changes; accuracy claims |

The existing contracts stay in force unchanged: canonical chat text, cards, lorebooks, personas and connection settings are read-only; manual locks outrank automation; missing assets and failed providers never block reading or replying; model output is untrusted data; no model-selected URLs, paths, commands or endpoints.

## 2. Verified host entry point on pinned SillyTavern 1.19.0

Verified by read-only inspection of the pinned source at `7e8663cd9c184a550b37238218bdd32c6efc68e9` (release tag `1.19.0`, `package.json` version `1.19.0`), extracted with `git archive` from the local SillyTavern clone's object store into a scratch directory outside this repository. No host was run. Everything below is source inspection; section 2.4 lists what only a runtime probe can settle.

### 2.1 Context surface

[`public/scripts/st-context.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/st-context.js) `getContext()` (L115) builds a fresh object on every call, so the fields below are current at call time. It exposes, among the fields M0 already relies on:

| Field | Line | Use in this plan |
| --- | --- | --- |
| `generateRawData` | L206 | The proposed entry point (section 2.2) |
| `extractMessageFromData` | L287 | Pulls the text out of the raw provider response without `cleanUpMessage` |
| `generateRaw` | L205 | Same request path plus `cleanUpMessage`; not proposed (section 2.2) |
| `generateQuietPrompt` | L204 | Rejected (section 2.3) |
| `mainApi` | L200 | The user's currently selected API (`main_api`); read for the capability probe and the notice |
| `onlineStatus` | L133 | `online_status`; `'no_connection'` means the director must not request |
| `eventSource`, `eventTypes` | existing | `GENERATION_STOPPED` is the only lifecycle event the raw path touches |
| `ConnectionManagerRequestService` | L294 | Profile-based requests ([`extensions/shared.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/extensions/shared.js) L392); the later separate-profile option named in O04, not used in M2.2 |

### 2.2 Proposed entry point: `generateRawData` + `extractMessageFromData`

[`public/script.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js):

```js
// L4000
export async function generateRawData({ prompt = '', api = null, instructOverride = false, quietToLoud = false,
    systemPrompt = '', responseLength = null, prefill = '', jsonSchema = null } = {})
// L4122 — generateRawData, then cleanUpMessage(); returns string
export async function generateRaw({ prompt = '', api = null, instructOverride = false, quietToLoud = false,
    systemPrompt = '', responseLength = null, trimNames = true, prefill = '', jsonSchema = null } = {})
// L6276
export function extractMessageFromData(data, activeApi = null)
// L3924 — called by generateRawData
export function createRawPrompt(prompt, api, instructOverride, quietToLoud, systemPrompt, prefill)
```

Observed behaviour of `generateRawData`, in source order:

| Observation | Where | Consequence |
| --- | --- | --- |
| `api` defaults to `main_api`, the connection the user selected. | L4001–L4003 | Satisfies O04's “connection the user already has selected”. The adapter passes `api: null`. |
| The prompt is built by `createRawPrompt` from **only** the caller's `prompt` (string or `[{role, content, name?}]`) and `systemPrompt`. No character card, persona, world info, author's note, chat history or extension prompts are read. | L3924–L3983 | This is the only generation path on the pinned host whose content the caller fully controls, which O06 requires. |
| `createRawPrompt` runs `substituteParams` over every message's `content` and over `systemPrompt`. | L3945, L3955 | **Any `{{…}}` sequence inside text the director sends is expanded by the host macro engine before transmission.** The registered macros include `persona`, `charDescription`, `charPersonality`, `charScenario`, `mesExamples`, `charCreatorNotes`, `input` (the composer draft) and `lastMessage` ([`macros/definitions/env-macros.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/macros/definitions/env-macros.js) L91 and siblings; new engine default-on at [`power-user.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/power-user.js) L302). A chat message or catalog label containing `{{persona}}` would send the persona. Section 5 neutralizes every `{{` and `}}` in data before it reaches the host (decision E9). |
| For text-completion APIs without instruct mode, a `user` message is prefixed with `message.name ?? name1` and an `assistant` message with `name2`; `name: ''` yields no prefix. For `openai` (Chat Completion) there is no prefix. With instruct mode on, `formatInstructModeChat(name, …)` wraps each message. | L3941–L3945 | The adapter sends every message with `name: ''` so the persona and card display names are not injected as prefixes. Instruct-mode wrapping with an empty name is not verified at runtime (section 2.4). |
| Other extensions may rewrite or abort the prompt through `GENERATE_AFTER_COMBINE_PROMPTS` (text) or `CHAT_COMPLETION_PROMPT_READY` (chat), both with `dryRun: false`. | L4031–L4037 | The host does not let SillyNovel prevent this. The native-host test asserts the payload with no third-party extensions active; the plan records the limit. |
| A `GENERATION_STOPPED` listener aborts the request for its duration. `stopGeneration()` (L5607) emits that event, so the user's Stop aborts an in-flight director request. `generateRawData` never calls `showStopButton`, so no Stop control is shown for a director-only request. | L4013–L4018, L4108 | The user can stop the director only while one of their own generations also runs. Section 4 states the consequence for the in-flight slot. |
| It emits **no** `GENERATION_STARTED`, `GENERATION_ENDED`, `MESSAGE_RECEIVED` or `CHARACTER_MESSAGE_RENDERED`, does not set `is_send_press` (L603), does not use the global `abortController` (L630), does not call `addOneMessage`, `saveChat` or any chat writer, and returns the provider data to the caller. | L4000–L4115 | A director request neither appears in the chat nor is seen by SillyNovel's own adapter as a generation. The user's Send stays enabled; nothing is written to the chat. Runtime confirmation is in section 10. |
| Chat Completion: `sendOpenAIRequest('quiet', …)` ([`openai.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/openai.js) L3138) with `stream = settings.stream_openai && type !== 'quiet' && …` (L2785): never streamed, independent of the user's streaming setting. Other APIs: a plain `fetch` of `getGenerateUrl(api)` (L6172) followed by `response.json()`. | L4071–L4092 | One response object, no token stream to reconcile. `CHAT_COMPLETION_SETTINGS_READY` still fires for Chat Completion. |
| `responseLength` works by temporarily overwriting the user's `openai_max_tokens` or `amount_gen` through the static `TempResponseLength` (L4022, L4207) and restoring afterwards. | L4005–L4024, L4109–L4113 | A user generation starting inside that window could inherit the director's limit. M2.2 does not pass `responseLength` (decision E8). The 32 KiB parse limit is enforced locally. |
| `jsonSchema` routes to per-source structured output and `extractJsonFromData` (L6311), with provider-specific shapes (Claude `tool_use`, Perplexity reasoning strip, …). | L4077, L4102–L4104 | Not used in M2.2 (decision E8). The text contract in section 6 is provider-neutral. |
| `generateRaw` additionally runs `cleanUpMessage` (L6442): user regex scripts with `AI_OUTPUT` placement (L6481), name trimming, newline collapsing and markdown fixes. | L4128–L4136 | Any of these can mangle a JSON object. The adapter calls `generateRawData` and `extractMessageFromData(data, mainApi)` instead (decision E2). |
| `extractMessageFromData` concatenates text parts; for `openai` it reads `choices[0].message.content` or text-part arrays; reasoning content is not included unless the provider puts it in the text. | L6276–L6300 | Section 6 refuses anything that is not a single JSON object; a model that prepends visible reasoning degrades to manual. `parseReasoningFromString` (st-context L296) is available for a later tolerance decision, not used in M2.2. |

### 2.3 Rejected alternative: `generateQuietPrompt`

`generateQuietPrompt` (L3084) calls `Generate('quiet', …)` (L4290). That path emits `GENERATION_STARTED` with type `quiet` (L4299), which SillyNovel's adapter already forwards and the reader would record as a streaming generation of its own making; it assembles the full prompt with the character card, persona, world info and author's note unless `skipWIAN`, example messages, extension prompts and the chat history, then appends the quiet instruction as an extension prompt (L4623); it uses the global `abortController` (L4303) shared with the user's generations; and it returns the text without adding a message only through the `quiet` branch (L5526–L5529). It satisfies “does not write to the chat” but violates O06's content limit by construction. It is therefore not an option for M2.2, and the word “quiet” in O04 is implemented by `generateRawData`, not by the host's quiet-prompt feature.

### 2.4 What stays unverified until a runtime probe

Source inspection cannot settle these; the first implementation step (section 10) is a bounded probe on a disposable pinned host with the deterministic loopback endpoint, recorded in the implementation document:

1. The exact request body the loopback endpoint receives for a Chat Completion `custom` source: two messages, roles `system` and `user`, no names, no extra messages from other host code.
2. That the chat file, `chat_metadata`, the character card, persona and settings files are byte-identical before and after a director request (T19 at host level).
3. That no `GENERATION_*`, `MESSAGE_*` or `CHARACTER_MESSAGE_RENDERED` event reaches SillyNovel's listeners during a director request.
4. `online_status` semantics for a `custom` Chat Completion source before and after the first successful request.
5. The text-completion and instruct-mode payload shape with `name: ''` (no text-completion loopback exists; NOT_TESTED unless one is added).
6. Behaviour when the user presses Send while a director request is outstanding on a single-slot local backend (host serialization or backend error).
7. Whether `{ {` survives the default macro engine untouched, and that no other trigger syntax exists for the macros listed above.
8. That the user's Stop aborts the director request and that the dropped result produces no notice other than “Director request cancelled”.

## 3. Verified starting point in SillyNovel

| Verified fact in the merged code | Consequence for M2.2 |
| --- | --- |
| `src/director-proposal.mjs` exports `validateProposal(proposal, { scene, texts, window })`, `applyProposal(previous, proposal, token, …)` and `checkProposalEvidence(token, snapshot, scene, currentSource)`; nothing imports it at runtime. The raw-response size limit (32 KiB) was explicitly left to the transport. | M2.2 parses raw text into a plain object and hands it to `validateProposal` unchanged. The 32 KiB limit lives in the new parser. |
| The validator needs a reducer `scene` whose context carries the registered cast, the catalog and fingerprinted `sources` ending at `selectedSourceKey`, plus `texts` for the window. | In attached-project mode no such scene exists today (next rows). M2.2 builds a pure, non-persisted mirror scene for validation (section 7). |
| In attached-project mode the project scene is **global layout only**: one synthetic source, `historyRevision: 0`, and `globalState()` serializes `scene.view`, the folded projection of every valid command regardless of origin (`src/project-scene.mjs`). | An automatic `setBackground`/`setPresence`/`setOutfit` reduced into the project scene would be saved on the next save. **D7 forbids automatic output in the persistent project layout, and no message-anchored non-persistent layout exists in attached mode.** Decision E3 names the options. |
| `src/project-expressions.mjs` is a memory-only, source-anchored journal: `dispatch({type:'setExpression'|'clearExpression', characterKey, assetId})`, decisions keyed by exact source record, invalidated by prefix changes, outfit changes, detach, disable and conversation switching; it already fingerprints the reader history (`fingerprintHistory`) and exposes `token()`/`valid(token)` over the shared `evidenceStamp`. Its assets are temporary PNGs imported this session (≤ 32), the only expressions that exist in attached mode. | D7 routing means the director's `setCharacter.expressionId` becomes a journal decision. The journal has no origin field today; section 7 adds one so manual decisions outrank automatic ones at the same source. The director's expression catalog is the set of currently imported temporary expression assets. |
| The reader (`src/reader-source-model.mjs`) records generation status `streaming`, `stopped-partial` or `unknown`; it never records `complete`. `GENERATION_ENDED` maps to `unknown` (“end is not completion proof”, `tests/m1-project-expressions.test.mjs`). `checkProposalEvidence` and the journal's `authority()` refuse `streaming`/`unknown` at the anchored source. | **Under the merged reader every freshly completed reply is unresolved, so an automatic trigger would be refused on every message.** The M1 plan proposed a `complete` status assigned only from a generation-correlated, host-verified finalization; it was never implemented. Decision E4 proposes adding it in M2.2. |
| The host adapter (`src/host-adapter.mjs`) probes a fixed capability list, normalizes ten events, and exposes only read methods plus `openOriginalMessage`. The pinned host emits `MESSAGE_RECEIVED` before `CHARACTER_MESSAGE_RENDERED`, then `GENERATION_ENDED` from `hideStopButton()`; a stop can emit `GENERATION_ENDED` before `GENERATION_STOPPED` ([M0 compatibility](M0_COMPATIBILITY.md)). | M2.2 adds one optional capability group and one request method to the adapter; because the adapter changes, the full native-host campaign applies (section 10). Completion provenance (E4) is derived from the already-normalized observations, not from a new host event. |
| `index.js` stores `extensionSettings.sillynovel.enabled` through `saveSettingsDebounced()`; the storage plugin serializes project schema v2 (`name`, `scene`, `catalog`). | The per-project enable flag and the ceiling can live in the host settings block without a plugin schema change (decision E5). |
| `tests/fixtures/dyl18-openai-endpoint.mjs` is a deterministic OpenAI-compatible loopback on `127.0.0.1:8128`; `tests/probes/dyl60/host.mjs` already seeds a disposable pinned host with a decoy persona description, a lorebook, four cards and a `custom` connection profile pointing at it; `tests/probes/dyl60/run.py` pins host SHA, Node 26.8.1 and Playwright. | The native-host transport test reuses this harness and seeds; the loopback gains a director mode (section 10). No real provider is involved. |

## 4. Enable, trigger and limits (O06)

| Rule | Proposed behaviour | Where enforced |
| --- | --- | --- |
| Off by default, enabled per project | `extensionSettings.sillynovel.director.enabledProjects[projectId] === true`; absent means off. Toggle in the Project panel, visible only while a project is attached. Portable bundles and database restores never carry or set it. Detached session-stage mode has no director (the transient stage has no user project). | `index.js` settings, project panel (E5) |
| Requests only on the user's selected connection, only when online | Capability probe passes (section 9) and `getContext().onlineStatus !== 'no_connection'`; otherwise the notice reads “Director idle: no connection selected” and nothing is sent. | Adapter probe before each request |
| One request per completed message | A request key is `sessionEpoch + ownerKey + sourceKey + revision + swipeRevision` of the completed head. Each key is requested at most once per session; a `continue`, regenerate or swipe produces a new revision and may be requested once more (state contract §10 treats continue as a new source revision). Keys are kept in memory only. | Director controller ledger |
| Completed means completed | A message is eligible when the reader reports `generation.status === 'complete'` for that source (E4): a non-dry-run generation of type `normal`, `continue`, `regenerate` or `swipe` whose `messageReceived` or `characterMessageRendered` observation named the generated source, followed by `generationEnded` with no `generationStopped` for the same generation id. `stopped-partial`, `unknown`, `quiet`, `impersonate` and eventless history never trigger. | Reader model (E4), controller |
| Anchored at the selection | A request is issued only when the completed head is the current selection (`followLatest`, or a pinned cursor equal to the head). While the user reads elsewhere the message is skipped, counted in the notice (“2 replies not directed while reading earlier messages”), and not queued (M2.3). | Controller (E10) |
| Something to direct | A request is issued only if at least one registered, present actor has at least one temporary expression asset compatible with its current outfit; otherwise the message is skipped with “Director idle: no expression artwork imported”. `suggestLocation` alone does not justify spending the ceiling. | Controller (E11) |
| At most one in flight | A single slot. The slot is released only when the host promise settles (resolve, reject or abort); `generateRawData` accepts no signal, so a local timer cannot abort the request. After 90 s the controller **abandons** the result (any late result is discarded by the ticket check), shows “Director request still outstanding; manual controls remain available”, and still waits for settlement before issuing another request. | Controller (E7) |
| Per-session ceiling, default 40, user-settable | `extensionSettings.sillynovel.director.sessionCeiling`, integer 1–200, default 40, edited in the SillyNovel settings panel. A session is one project attachment in one page load: the counter resets on detach, explicit reopen or reload, and not on a chat switch. Every issued request counts, whether it is applied, refused, failed or abandoned. | Controller counter (E6) |
| Cap hit or failure degrades to manual | On reaching the ceiling, on a host error or refusal, on a transport exception, on an unparseable or invalid response, or on a stale result, the director **pauses for the rest of the session**: the notice names the reason (“Director paused: session ceiling 40 reached · manual controls remain available”, “Director paused: INVALID_RESPONSE · …”), and manual controls are unaffected. Turning the project toggle off and on resumes with the same counter. No automatic retry; a user-requested retry control is M2.4. | Controller (E7) |

Nothing in this section blocks reading or replying: the composer, Send, Stop, Continue, swipes, navigation and every manual control keep working whether the director is idle, waiting, paused or disabled.

## 5. Request assembly (bounded by O06)

A new pure module, `src/director-request.mjs`, exports `buildDirectorRequest(input)`; it reads no DOM, host, settings or network. Its input is constructed by the controller from existing data only:

| Input | Source | Allowed content |
| --- | --- | --- |
| `window` | The anchored source plus up to five directly prior sources, in order, from the reader history already fingerprinted by the expressions journal | Per message: the source key, `author.kind` (`user`/`character`/`system`), the message's own `author.label` (the display name stored on that canonical message), and its canonical text |
| `cast` | Project actors currently registered on the stage | `characterKey`, label, `present`, current `outfitId`, whether presence and outfit are locked |
| `expressions` | Temporary expression assets compatible with each actor's current outfit | `expressionId`, label, `characterKey` |
| `backgrounds` | Project library backgrounds | `backgroundId`, label, whether the background is locked |
| `scene` | Compact current projection | Current `backgroundId`, nothing else |
| `instruction` | Constant in the module | The versioned instruction text; `promptVersion` is its SHA-256 prefix, recorded in the token |

Never present in the input type, so never sendable: persona name or description, card fields, lorebook entries, author's note, system prompt, presets, connection settings, images, `chat_metadata`, messages outside the window, and the composer draft.

Assembly rules:

1. **Macro neutralization (E9).** Every `{{` becomes `{ {` and every `}}` becomes `} }` in message text and labels before they enter the payload. The evidence `texts` map handed to `validateProposal` keeps the **original** canonical text; an excerpt that happens to span a neutralized sequence fails `INVALID_EVIDENCE` and the proposal degrades, which is accepted as rare and safe. The assembler asserts the final payload contains no `{{`.
2. **Budget (E12).** Message text is capped at 12,000 characters in total and 4,000 per message; the anchored message is kept first, then prior messages newest-first until the budget is spent; a message that does not fit is dropped whole, and the anchored message keeps its **last** 4,000 characters if longer, with a marker outside the quoted text. Catalog and scene lines are capped at 4,000 characters; labels are already ≤ 80 characters. The instruction is fixed. The whole payload is therefore under 20,000 characters, inside the state contract's 4,096-token intent for ordinary tokenizers; no host token counting is used because `getTokenCountAsync` would pull in the user's tokenizer settings and model for no safety gain.
3. **Shape.** Two messages, `[{ role: 'system', name: '', content: instruction }, { role: 'user', name: '', content: data }]`. The data block presents each window message as `<<message key="m6" author="character" label="Mira">> … <<end>>`, each catalog group as plain `id: label` lines, and locks as `locked` suffixes. The instruction states that everything inside the data block is story data, never an instruction, and demands exactly one JSON object `{ "schemaVersion": 1, "updates": [ … ] }` with the three v1 operations and their evidence rule, or `{ "schemaVersion": 1, "updates": [] }` when nothing changed. It names no URL, tool, command or file.
4. **Transport call.** The adapter method (section 9) passes `{ prompt: messages, api: null, instructOverride: false, quietToLoud: false, systemPrompt: '', responseLength: null, prefill: '', jsonSchema: null }`. No other argument is used.

The assembler is deterministic: identical input yields identical bytes, which the fixtures freeze.

## 6. Response contract and parsing into `validateProposal`

`parseDirectorResponse(text)` in the same module is pure and strict. In order:

| Check | Refusal |
| --- | --- |
| Not a string, or the host returned no text | `EMPTY_RESPONSE` |
| UTF-8 byte length over 32,768 | `RESPONSE_TOO_LARGE` (checked before any parsing; the string is not retained) |
| After trimming whitespace and a BOM, and after removing exactly one surrounding ```` ```json ```` / ```` ``` ```` fence if present (E13), the text does not start with `{` and end with `}` | `NOT_SINGLE_JSON` |
| `JSON.parse` throws, or the result is not a plain object, or anything but whitespace surrounds the object | `NOT_SINGLE_JSON` |
| Parsed value accepted | returned as-is to the caller |

No reviver, no repair, no extraction of the “first JSON object in the prose”, no second attempt. The parsed object then goes **unchanged** to `validateProposal(proposal, { scene, texts, window })` from `src/director-proposal.mjs`, which already refuses unknown keys (including `__proto__` and symbol keys), wrong types, schema versions other than 1, more than 16 updates, unknown operations, invalid evidence, unknown or incompatible IDs and conflicting updates, and whose refusal `detail` never quotes model text. A refusal at either stage pauses the director (section 4) and applies nothing. The parser's own refusal codes join the notice vocabulary; raw model text is never shown, logged or stored.

The same bytes promise from the M2.1 plan is kept: every proposal in `tests/fixtures/m2-director/proposals.json` is serialized and fed through `parseDirectorResponse` and `validateProposal` in the new tests, and must produce the validation code the M2.1 suite already froze for it.

## 7. Application: D7 routing and attached-project scope

The owner's D7 ruling: in attached-project mode, director expression changes go to the memory-only expressions journal, the same path as manual expressions, and automatic output never reaches the persistent project layout or the plugin schema. Section 3 records that the project layout is exactly what `globalState()` saves, so the only message-anchored, non-persistent destination in attached mode today is that journal. Proposed M2.2 behaviour (decision E3, option A):

1. **Mirror scene (pure).** `mirrorScene({ projectView, actors, expressions, backgrounds, sources, selectedSourceKey, revisions })` in a new pure module `src/director-session.mjs` builds a reducer scene with `createScene` over a context whose `sources` are the journal's fingerprinted sources, whose `characters` are the project actors and whose catalog is backgrounds + outfits + temporary expressions, then replays the project layout as manual commands (register, presence, outfit, background, locks). It is rebuilt per request from current state, never saved, and exists only so `validateProposal` and `checkProposalEvidence` run against real IDs, locks and prefix hashes.
2. **Validation.** `validateProposal(parsed, { scene: mirror, texts, window })` as in section 6.
3. **Routing of accepted updates.**
   - `setCharacter` with `expressionId`: becomes `expressions.dispatch({ type: 'setExpression', characterKey, assetId, origin: 'automatic' })` at the anchored source. The journal gains an `origin` field on decisions. A manual decision (`setExpression` or `clearExpression`) at the same source for the same actor outranks: the automatic one is recorded as ignored with `LOCKED`, mirroring M2.1 D5. An automatic decision is invalidated by exactly the same rules as a manual one (prefix change, outfit change, detach, disable, switch) and counts toward the journal's 400-decision limit. A later manual decision at that source replaces it.
   - `setCharacter` with `present` or `outfitId`, and `setLocation`: **not applied in M2.2.** They are recorded as ignored with code `NO_AUTOMATIC_LAYOUT` and counted in the notice (“1 layout change not applied: automatic layout is not available in attached projects yet”). This keeps D7 literally true without inventing a second persistence path. Option B in E3 would add a memory-only automatic layout overlay in a later slice.
   - `suggestLocation`: shown as plain text in the notice line (“Suggested location: Harbor”), never resolved, never stored.
4. **Result.** `ACCEPTED` when at least one expression applied; `NO_CHANGE` otherwise. Nothing touches the global reducer, `scene.revision`, the project's dirty state, `globalState()`, the plugin or the canonical chat.

The merged `applyProposal` is therefore not called in M2.2; its reducer path remains fixture-covered and becomes live with option B. If the owner prefers option B now, the slice grows by one journal-like overlay module and its tests, and this plan's sections 4–6 and 8 apply unchanged.

## 8. Stale-result and session/revision checks (existing stamps only)

Two layers, both required before any journal write, reusing the stamps the merged code already produces; no new stamp format is introduced:

**At capture (before the request is sent):** the controller takes the journal's `token()` (`stamp` = `[evidenceStamp(snapshot), owner, selectionRevision, generation]`, `selectionRevision`, `historyRevision`, `globalRevision`, exact `source` record) and builds the M2.1 `ProposalToken` from the mirror scene's authority with `origin: 'automatic'`, `expectedRevision`/`expectedOverrideRevision` from the mirror, `evidenceStamp(snapshot)`, and `promptVersion`. Both are held with the in-flight ticket.

**At settlement:** in order, and any failure drops the result silently except for the notice:

| Check | Refuses after |
| --- | --- |
| Ticket is the current in-flight ticket and the controller is live (project still attached, extension enabled, same journal epoch) | disable, detach, reload |
| `expressions.valid(token)` (which resyncs and compares `stamp`, revisions and the exact source record) | chat switch, A → B → A, swipe, edit, continue, delete, reorder, generation start at the head |
| `checkProposalEvidence(proposalToken, snapshot, mirror, currentSource)` returns `CURRENT` | the same, through the M2.1 code path, plus `UNRESOLVED_COMPLETION` |
| The selection is still the anchored source | navigation away |
| The session counter and pause state still permit application | ceiling reached or pause raised meanwhile |

The mirror used at settlement is rebuilt from current state and compared field by field to the captured one (actors, locks, outfits, catalog revision); any difference refuses with `STALE_SCENE`. Cancellation is not a check: an abandoned or user-stopped request still runs the ticket check if it settles.

## 9. Proposed module and adapter changes

| File | Change | Persistence or schema |
| --- | --- | --- |
| `src/host-adapter.mjs` | `inspectCapabilities()` returns a new `director` group: `generateRawData`, `extractMessageFromData` functions, `mainApi` string, `onlineStatus` string; missing capabilities disable the director only, never the reader. New `requestDirectorText(messages)` that calls `context.generateRawData(...)` with the fixed arguments of section 5, extracts with `context.extractMessageFromData(data, context.mainApi)`, measures bytes, and returns `{ ok, text }` or `{ ok: false, code }` with codes `HOST_REFUSED`, `TRANSPORT_ERROR`, `ABORTED`, `EMPTY_RESPONSE`, `RESPONSE_TOO_LARGE`; it never throws into the shell and never retries. | None |
| `src/reader-source-model.mjs` | Status `complete` per E4; `rendered` tracking on the generation record; `quiet`/`impersonate` generations never resolve to a source. | None |
| `src/project-expressions.mjs` | `origin` on decisions; `dispatch` accepts `origin: 'automatic'` only from the controller; manual-over-automatic rule; notices name automatic decisions. | None (journal is memory-only) |
| `src/director-request.mjs` (new, pure) | `buildDirectorRequest`, `parseDirectorResponse`, `PROMPT_VERSION` | None |
| `src/director-session.mjs` (new, pure) | `mirrorScene`, routing of accepted updates to journal commands and ignored records | None |
| `src/shell.mjs`, `src/stage-view.mjs`, `index.js` | Controller lifetime bound to project attachment; project toggle; ceiling field; notice line; settings keys under `extensionSettings.sillynovel.director` | Host settings only |

No new dependency, no plugin change, no schema version bump, no change to `src/scene-reducer.mjs` or `src/director-proposal.mjs`.

## 10. Synthetic transport test plan and evidence standard

No real provider is involved at any level. Expected outcomes are frozen before implementation.

| Level | Harness | Cases |
| --- | --- | --- |
| Node unit (`tests/m2-director-request.test.mjs`, new) | Node built-in runner, fixtures under `tests/fixtures/m2-director/` | Deterministic assembly bytes; window of 1–6 messages; budget truncation (per-message, total, anchored tail kept, oldest dropped whole); neutralization of `{{persona}}`, `{{getvar::x}}`, `{{input}}`, nested and unbalanced braces; a decoy input carrying persona/card/lore strings in **unused** fields is refused by the input validator; parser: 32,768 vs 32,769 bytes, BOM, one fence, two fences, array, two objects, prose around JSON, `NaN`, `__proto__`; the 86 M2.1 raw proposals serialized through the parser reproduce their frozen validation codes |
| Node controller (`tests/m2-director-controller.test.mjs`, new) | Fake adapter recording calls; synthetic reader observations as in `tests/m1-project-expressions.test.mjs` | Off by default; toggle per project; no request without connection; completion provenance (normal → `complete`; stop → `stopped-partial`; `generationEnded` without receive → `unknown`; `quiet` type never resolves); one in flight under three rapid completions; one per key, new key after continue/swipe; ceiling 3 (configured) → pause with notice; failure codes → pause; late result after chat switch, A → B → A, swipe, edit, disable, detach → dropped; manual expression at the anchored source outranks; layout updates recorded `NO_AUTOMATIC_LAYOUT`; suggestion shown only as text; no journal write after `STALE_SCENE`; counter reset only on detach/reopen |
| Browser actual-entry (`tests/m1-reader-browser.test.mjs` extension) | Headless Chromium, synthetic host fixture, real extension entry | Synthetic `getContext()` with recording `generateRawData`/`extractMessageFromData`; toggle and ceiling controls reachable by keyboard; notice text; canonical synthetic chat snapshot unchanged (T19); missing `generateRawData` disables only the director |
| Native host (`tests/probes/dyl60/run.py` seventh campaign or a new `tests/probes/m2-director/` campaign registered in the runner) | Disposable pristine pinned 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Node 26.8.1, pinned Playwright, loopback endpoint | Loopback gains a director mode (new `tests/fixtures/m2-director-endpoint.mjs` or a mode flag): answers a request whose system message carries the director marker with a canned proposal, logs every request body. Assertions: request body equals the assembled payload; decoy persona description, lorebook entry and card descriptions (already seeded by `host.mjs`) are absent; a planted `{{persona}}` in a chat message arrives neutralized; chat JSONL, `chat_metadata`, cards, persona and settings files byte-identical before/after (T19); no `GENERATION_*`/`MESSAGE_*` events observed during the request; Stop aborts the request; Send during an outstanding request completes normally and the user's reply is unaffected; chat switch mid-flight → nothing applied; ceiling 3 → pause notice; invalid response → pause, manual expression still applies; the 20-turn Last Lantern script runs with the director on and the stage shows only journal expressions |

**Evidence standard.** Per the owner's process ruling, a slice that touches the host adapter requires the full native-host campaign, not only Node tests. M2.2 touches the adapter, the reader model, the expressions journal, the shell and the panel, so the implementation PR must record: the four levels above with exact commands and counts; `check-discovery.py` updated to the new suite count; the browser suite on the pinned host checkout; the storage suite **NOT_RUN with reason** (plugin unchanged) unless a plugin file changes; a tablet replay of the two new controls under the DYL-193 protocol if the device is available, else NOT_TESTED; and reused evidence cited by SHA, never presented as fresh. The runtime probe of section 2.4 is the first implementation step and is recorded in the implementation document before any controller code is written.

## 11. Owner decisions needed before M2.2 implementation

None of these is answered by the current documents. Each needs an owner statement recorded in [DECISIONS](DECISIONS.md); proposed defaults are recommendations, not rulings. IDs continue as E1–E14 to avoid confusion with the M2.1 plan's D1–D8.

| ID | Decision | Proposed default | Why it matters now |
| --- | --- | --- | --- |
| E1 | Authorize M2.2 implementation as described in sections 4–10 | — | Nothing starts without it; the O04/O06/D7 rulings unblock planning only. |
| E2 | Host entry point: `generateRawData` + `extractMessageFromData` through the adapter, not `generateRaw` and not `generateQuietPrompt` | Accept | `generateQuietPrompt` sends cards, persona and history (section 2.3); `generateRaw` applies user regex scripts and name trimming to the JSON. |
| E3 | Attached-project application scope: (A) expressions to the journal plus suggestions as text, layout updates recorded as ignored; or (B) add a memory-only automatic layout overlay now | A | D7 forbids automatic output in the saved layout and the project scene is not message-anchored (section 3). A is the smallest slice that is honest about it; B is real design work better planned with M2.3 queueing. |
| E4 | Add generation status `complete` to the reader model as section 4 defines it | Accept | Without it every fresh reply is `unknown` and no automatic trigger can ever fire. It also lets manual temporary expressions apply to a freshly completed head, a behaviour change to the merged M1 feature that needs host evidence (T05). |
| E5 | Where the per-project enable and the ceiling live: host `extensionSettings.sillynovel.director` keyed by project ID, or a project schema v3 field | Host settings | No plugin or persistence change; bundles never carry the flag, so import never enables the director; the flag is account-scoped like `enabled`. |
| E6 | Session definition and ceiling control: one project attachment in one page load; integer 1–200, default 40; counter not reset by chat switches | Accept | A chat switch must not be a free reset; detach/reopen is the user's deliberate action. |
| E7 | Failure policy: pause for the session on any failure, cap or stale result; slot released only on settlement; 90 s abandonment that discards the result but issues no new request | Accept | O06 says failures degrade to manual; `generateRawData` cannot be aborted locally; two outstanding requests would break one-in-flight. Alternative: skip the failed message and continue, with pause after three consecutive failures. |
| E8 | No `responseLength`, `jsonSchema`, `prefill`, `systemPrompt` or `instructOverride` in M2.2 | Accept | `responseLength` rewrites the user's max-tokens setting during the call; `jsonSchema` behaves per provider; both can be added later with their own host evidence. |
| E9 | Macro neutralization `{{`→`{ {`, `}}`→`} }` in all sent data, with `name: ''` on every message | Accept | The host expands macros in raw prompts (section 2.2). Alternative: refuse to request when the window contains `{{`, which would let a model or user silence the director by writing braces. |
| E10 | Request only when the completed head is the current selection; otherwise skip and count, no queue | Accept | Keeps M2.1's D6 anchoring and leaves catch-up to M2.3. |
| E11 | Request only when at least one present actor has a compatible temporary expression; otherwise skip | Accept | Under E3-A a request with nothing to apply spends the ceiling for a suggestion at most. Alternative: always request so suggestions still arrive. |
| E12 | Budget numbers: 12,000 characters of message text, 4,000 per message, anchored tail kept, catalog ≤ 4,000, response ≤ 32,768 bytes | Accept | These are the only numbers the fixtures encode; no host token counting. |
| E13 | Parser tolerance: exactly one optional surrounding code fence, nothing else | Accept | Common model habit; everything beyond it is refused rather than repaired. |
| E14 | Author display labels inside the window are sendable (they are fields of the canonical messages) | Accept | Needed to tell speakers apart in groups; card and persona *descriptions* remain excluded. Alternative: send only `author.kind` and rely on the user's actor mapping. |

Already settled and not reopened here: O04, O06 and D7 as ruled; manual locks outrank automation; model output is untrusted; no canonical writes; explicit project attachment; PNG-only assets; the M2.1 v1 operation set and evidence window.

## 12. Proposed TESTING rows

Rows T15–T19 and T29 already name M2 outcomes; M2.2 supplies host-level evidence for T17 and T29 for the first time and adds the transport-specific rows below. IDs continue from T39 and are not added to [TESTING](TESTING.md) until the owner approves this plan.

| ID | Scenario | Required outcome | First stage |
| --- | --- | --- | --- |
| T39 | Director request on the disposable pinned host with decoy persona, lorebook and cards seeded | Request body contains only window texts, author kinds/labels, catalog labels, compact scene and the instruction; decoy strings absent | M2.2 |
| T40 | Chat message or label containing `{{persona}}`, `{{input}}` or `{{getvar::x}}` inside the window | Arrives neutralized; no expansion; evidence check still runs against original text | M2.2 |
| T41 | Raw response over 32 KiB, non-JSON, two objects, prose around JSON, array | Refused before validation; nothing applied; director paused with a notice; manual controls work | M2.2 |
| T42 | Three replies complete in quick succession | At most one request outstanding; at most one request per message key; skipped messages counted, not queued | M2.2 |
| T43 | Ceiling (configured to 3) reached | Fourth completion sends nothing; “paused” notice; manual expressions, layout and composer unaffected; counter survives chat switch, resets on detach/reopen | M2.2 |
| T44 | Host error, refusal or disconnected backend during a request (T17 instance) | Last valid scene survives; chat remains usable; director paused with the bounded code | M2.2 |
| T45 | Chat switch, A → B → A, swipe, edit or disable while a request is outstanding (T08/T09 instance) | Late result dropped by ticket and stamp checks; no journal write; no notice beyond “cancelled” | M2.2 |
| T46 | User presses Stop or Send while a director request is outstanding | Stop aborts the director request; Send's reply completes normally and is unaffected by the director | M2.2 |
| T47 | Completion provenance on the pinned host | Normal, continue, regenerate and swipe replies reach `complete`; stopped replies stay `stopped-partial`; another extension's `quiet` generation never marks the head complete | M2.2 |
| T48 | Director default state and portability | Off for a new project; bundle export/import and database restore never enable it | M2.2 |
| T49 | Accepted proposal with expression plus layout updates in attached mode | Expression applied to the memory-only journal; layout updates recorded `NO_AUTOMATIC_LAYOUT`; project not dirty; `globalState()` unchanged | M2.2 |
| T50 | Manual expression at the anchored source, then automatic expression for the same actor | Manual decision kept; automatic recorded as ignored `LOCKED`; later manual clear or set replaces an automatic one | M2.2 |

Existing rows M2.2 covers at host level for the first time: T17 (through T44), T19 (byte comparison around a real request), T29 (instruction-like chat text travels as data; braces neutralized). T18 remains uncovered: it needs the Gate B fixture evaluation (M2.4), and this plan makes no accuracy claim.

## 13. Exclusions, risks and handoff

M2.2 excludes queueing and catch-up (M2.3), the evidence UI and real-chat evaluation (M2.4), image work (M3), a separate director connection profile, structured outputs, text-completion instruct verification beyond the loopback Chat Completion source, persistence of proposals or counters, and any Linear change. It cannot show whether automatic direction is useful; that is Gate B after M2.4.

Risks recorded rather than solved: other installed extensions can rewrite or abort the raw prompt through host events; a hung backend occupies the single slot until the host settles it; the user has no Stop control for a director-only request; option A leaves background, presence and outfit untouched by the director in attached projects, so Gate B's travel and presence categories stay fixture-only until option B exists; the `complete` status changes when manual temporary expressions become available on a fresh head.

Two things this plan could not settle from the documents are E3 and E4; the rest of section 11 is bounded implementation proposals with stated rationale. Everything in sections 2.2–2.3 is source inspection of the pinned host; section 2.4 is what remains unverified until the runtime probe.

Recommended next bounded step: owner review of this plan and a recorded statement on E1–E14. If E1 is approved, the implementation ticket is one PR owning the files in section 9, the tests in section 10, a new `docs/M2_2_DIRECTOR_TRANSPORT_IMPLEMENTATION.md` with the runtime-probe record and the native campaign evidence, the approved TESTING rows, and dated entries in STATUS, ROADMAP, TESTING and DECISIONS. This document starts nothing.
