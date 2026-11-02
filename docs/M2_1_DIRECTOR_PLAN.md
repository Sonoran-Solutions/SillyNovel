# M2.1 director proposal plan — conservative automatic direction, first slice

**Status: planning proposal, NOT approved.** This document proposes the first M2 slice on top of the merged manual reducer. It authorizes nothing. M2.1 implementation, any director transport, Linear tickets and later M2 slices each require a separate owner authorization recorded in [DECISIONS](DECISIONS.md). Gate B remains **NOT_RUN**.

**Date:** 2026-11-01, America/Phoenix. **Starting main:** `737735bcd54e3fed7ff9de7e6ed6c53420de85bd`, the merge of PR #37 that records the owner's [Gate A PASS](DECISIONS.md#gate-a-verdict--pass--2026-11-01) on `e8e9cf673b6455dace67d695ee45d1d3dcc2857c`; runtime remains identical to frozen `c5c1699a48629ae761a093e13056f0b11fdc4b88`. This branch started at `e8e9cf67…` and was rebased onto `737735bc…` before the plan was written. The roadmap's own rule stands: a Gate A PASS does not authorize M2 implementation. Deferred [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) coverage is unaffected by this plan.

Read alongside [roadmap M2](ROADMAP.md#m2--conservative-automatic-direction), [state and director contract](STATE_AND_DIRECTOR.md), [architecture](ARCHITECTURE.md), [testing](TESTING.md), the [implemented reducer contract](M1_SCENE_REDUCER.md), [attached temporary expressions](M1_PROJECT_EXPRESSIONS.md) and the [M1 plan](M1_PLAN.md) whose house style this follows. Where this plan narrows the longer-term director contract, the narrowing is a bounded M2.1 proposal, not a replacement of that contract.

## 1. What M2.1 is and is not

The roadmap defines M2.1 as “extend the manual reducer with director proposals, base/overlay locks, and snapshot validation”, evidenced by “deterministic unit fixtures and migrations”. This plan proposes exactly that: pure modules, synthetic fixtures and documentation. No model is called, no prompt is built, no message is sent anywhere, and nothing new is persisted.

| In M2.1 (proposed) | Out of M2.1 |
| --- | --- |
| A strict proposal schema and validator | Any director transport, provider adapter, prompt construction or bounded-context assembly (M2.2; needs [O04](DECISIONS.md#decisions-still-needed)) |
| Pure translation of a valid proposal into existing reducer commands with `origin: 'automatic'` | Queueing, deduplication, one-job-per-chat serialization, timeout/refusal recovery (M2.3) |
| Atomic application with manual-lock precedence and an ignored-changes record | Evidence UI, “Why this visual?” panel, manual correction flows, real-chat evaluation (M2.4) |
| Pure evidence-stamp and revision checks for a captured proposal token | Image generation, asset generation, cloud or local image routes (M3) |
| Deterministic Node fixtures with frozen expected results | Persistence of proposals, journals, snapshots or provenance; any plugin schema change |
| Documentation of the narrowed v1 operation set | Linear issue creation, Gate B evaluation set, accuracy claims |

The existing M1 contracts stay in force unchanged: canonical chat text, cards, lorebooks, personas and connection settings are read-only; manual locks outrank automation; missing assets never block reading or replying; model output is untrusted data.

## 2. Verified starting point

| Verified fact in the merged code | Consequence for M2.1 |
| --- | --- |
| `src/scene-reducer.mjs` already accepts `origin: 'automatic'` on `reduceScene`, refuses automatic changes to locked fields with `LOCKED`, refuses automatic `lock`/`release` with `MANUAL_ONLY`, and never lets an automatic command acquire a lock. | The lock precedence M2.1 needs already exists per command. M2.1 adds proposal-level atomicity and an ignored-changes record; it does not redesign locks. |
| Scenes are immutable values; a refusal returns the exact unchanged `previous` reference. | A multi-command proposal can be applied step by step on successive values and “rolled back” by returning `previous`. No transaction machinery is needed. |
| `SceneAuthority` has a fixed key set (`ownerKey`, `sessionEpoch`, `historyRevision`, `selectionRevision`, `catalogRevision`, `expectedRevision`, `source`, `origin`); extra keys are refused as `MISSING_AUTHORITY`. | Proposal-specific fields (`expectedOverrideRevision`, `promptVersion`, evidence stamp) live in the proposal token, not in `SceneAuthority`. `reduceScene` is called unchanged. |
| The scene journal already tracks `overrideRevision`, incremented only by manual commands, and `invalidatedFrom`. | “A manual change or release invalidates pending proposals based on an older revision” ([state contract §5](STATE_AND_DIRECTOR.md#5-manual-overlay-and-locks)) is implementable as one comparison against `overrideRevision`. |
| `reduceScene` requires `authority.source.key === context.selectedSourceKey` (`STALE_SELECTION`). | In M2.1 a proposal is anchored at the selected source only. Head-anchored application while the reader is pinned elsewhere is deferred (decision D6). |
| The reducer context carries source keys, revisions, swipe revisions and `sn-source-v1` prefix hashes, but **no message text**. | Evidence excerpt substring checks need caller-supplied text for the allowed evidence window. The validator takes that text as an explicit input; it never reads the DOM or host. |
| The shared `evidenceStamp` is `[sessionEpoch, sourceRevision, sourceOrderRevision, cursor.sourceKey, cursor.revision]` ([transient-scene.mjs](../src/transient-scene.mjs)); `project-expressions.mjs` captures it in a token and re-checks it, plus selection/history/global revisions and the exact source record, before applying delayed work. | M2.1 reuses this exact pattern for proposal tokens. No second stamp format is introduced. |
| In attached-project mode, `setExpression`/`clearExpression` bypass the global reducer and go to a separate memory-only expressions journal; the global reducer is used for the persistent project layout and the session stage. | M2.1 touches only the pure reducer path. Which journal consumes director expression changes in attached mode is an integration question for M2.2–M2.4 (decision D7), not an M2.1 deliverable. |
| `plugins/sillynovel-storage` serializes only the global projection (`globalState()`), never the journal. | Nothing M2.1 adds to in-memory results can reach the persistent project layout or the plugin schema. |
| Generation status: `project-expressions.mjs` refuses application when the selected source is the head of a `streaming`/`unknown` generation. | The same refusal applies to proposals: no proposal applies to a source whose completion is unresolved. |

## 3. Proposed director proposal data shape (v1, in-memory)

This narrows the illustrative response in the [state contract §7](STATE_AND_DIRECTOR.md#7-proposed-director-response) to what the implemented reducer and catalog can actually validate. Names follow the reducer (`characterKey`, catalog asset IDs) rather than the older `characterId`/`char_rowan` illustration; the example file is updated only if the owner approves this shape.

```js
// Produced by a later director transport (M2.2). In M2.1 only test fixtures produce it.
{
    schemaVersion: 1,            // proposal schema; distinct from SCENE_SCHEMA_VERSION
    updates: [                   // 0–16 entries; empty means "no change" and is valid
        { op: 'setCharacter', characterKey, present?, outfitId?, expressionId?, evidence },
        { op: 'setLocation',  backgroundId, evidence },
        { op: 'suggestLocation', label, evidence },
    ],
}
// evidence: { sourceMessageKey, excerpt }  — exact substring, 1–200 characters
```

| Operation | Allowed payload keys (exact; nothing else) | Reducer translation | Effect |
| --- | --- | --- | --- |
| `setCharacter` | `op`, `characterKey`, at least one of `present` (boolean), `outfitId`, `expressionId`, and `evidence` | In this order: `setPresence` (if `present` given), `setOutfit` (if `outfitId`), `setExpression` (if `expressionId`), all `origin: 'automatic'` | Changes unlocked fields of an already registered cast member. Order matters because `setOutfit` resets the expression. |
| `setLocation` | `op`, `backgroundId`, `evidence` | `setBackground` with `origin: 'automatic'` | Changes the unlocked background forward from the anchored source. A background ID is the location reference, as in the reducer contract. |
| `suggestLocation` | `op`, `label` (trimmed plain text, 1–80 characters, no control characters), `evidence` | None | Returned as bounded data in `result.suggestions`; no scene change, no asset, no job. |

Deliberately **absent** from v1 proposals: `addCharacter` (a mentioned character is not automatically present; registration stays manual), `setSlot` (stage slots are not chosen by the model), `lock`/`release` (manual only), every clear operation (`clearBackground`, `clearOutfit`, `clearExpression`; the director abstains instead of clearing), `timeOfDay` and `poseId` (the catalog has no time or pose dimension yet; an unknown key rejects the proposal), confidence numbers (not calibrated, not required), and any URL, path, endpoint, command or free text other than the `suggestLocation` label and evidence excerpt.

### Proposal token

Captured by the caller when the proposal is requested, supplied separately from the proposal, never derived from model output:

```js
{
    authority,                   // exact SceneAuthority with origin: 'automatic', expectedRevision = scene.revision at capture
    expectedOverrideRevision,    // scene.overrideRevision at capture
    evidenceStamp,               // evidenceStamp(snapshot) string at capture
    selectionRevision, historyRevision, globalRevision, // as project-expressions token()
    source,                      // exact SceneSource record at capture
    promptVersion,               // string; recorded for later provenance, not interpreted in M2.1
}
```

This is the [state contract §9](STATE_AND_DIRECTOR.md#9-asynchronous-ownership) token restated in terms of the fields the merged code actually exposes. `hostChatKey` is represented by `ownerKey` plus `sessionEpoch`; `settingsRevision` is omitted in M2.1 because no setting influences a fixture-produced proposal.

## 4. Strict validation — whole proposal rejected

Validation is pure: `validateProposal(proposal, { scene, texts, window })`, where `texts` maps each source key in the allowed evidence window to its exact canonical text and `window` is the ordered list of allowed source keys (the anchored source plus up to five prior sources; six total per the [state contract §6](STATE_AND_DIRECTOR.md#6-director-inputs)). Any single failure rejects the **entire** proposal with one bounded refusal code; nothing is partially applied, no revision advances, and the same `previous` scene reference is returned.

| Check | Refusal |
| --- | --- |
| Proposal is not a plain record (prototype must be `Object.prototype` or null, as the reducer's `record` helper requires), or has keys other than exactly `schemaVersion` and `updates` | `INVALID_PROPOSAL` |
| `schemaVersion !== 1` | `UNSUPPORTED_PROPOSAL_SCHEMA` |
| `updates` not an array, or more than 16 entries | `INVALID_PROPOSAL` |
| Any update not a plain record, unknown `op`, missing or extra keys for its op, wrong types, empty strings, `null` anywhere | `INVALID_UPDATE` |
| `evidence` missing, not exactly `{ sourceMessageKey, excerpt }`, key outside `window`, excerpt empty or over 200 characters, or excerpt not an exact substring of `texts[sourceMessageKey]` | `INVALID_EVIDENCE` |
| `characterKey` not in `scene.context.characters` | `UNRESOLVED_CHARACTER` |
| `characterKey` not currently registered in the projected cast | `CHARACTER_NOT_ADDED` |
| `backgroundId`/`outfitId`/`expressionId` absent from the catalog | `UNKNOWN_ASSET` |
| Asset of the wrong kind, wrong character, or expression incompatible with the outfit that will be active after this update's own `outfitId` (if any) | `INCOMPATIBLE_ASSET` |
| Two updates targeting the same `characterKey`, or two `setLocation` updates | `CONFLICTING_UPDATES` (no later-wins rule) |
| `suggestLocation` label after trim empty, over 80 characters, or containing control characters | `INVALID_UPDATE` |

Structural, identity and evidence failures are reported separately from semantic quality: a proposal that validates can still be wrong about the story, and a matching excerpt proves only that the quote exists. Size: the later transport refuses raw responses over 32 KiB before parsing (M2.2); the pure validator additionally refuses more than 16 updates so fixtures can exercise the limit without a transport.

## 5. Extending the reducer without touching chat text or project layout

Proposed home: one new pure module, `src/director-proposal.mjs`, importing `reduceScene` and `projectScene` from the existing reducer. `src/scene-reducer.mjs` is **not modified** in M2.1; `SCENE_SCHEMA_VERSION` stays 1. This keeps the merged reducer's exact-head evidence valid and avoids a journal schema change.

`applyProposal(previous, proposal, token, { texts, window })` returns `{ scene, result }` with `result: { accepted, code, detail?, applied, ignored, suggestions }`:

1. Validate the token shape and compare `token.authority.expectedRevision === previous.revision` and `token.expectedOverrideRevision === previous.overrideRevision`; mismatch refuses with the reducer's `STALE_REVISION` or a new `STALE_OVERRIDE`. Reducer checks for owner/epoch/selection/history/catalog/source run inside each `reduceScene` call and are not duplicated.
2. Run section 4 validation. Any failure returns `previous` with that code.
3. Translate updates to reducer commands in stable order: `setLocation` first, then `setCharacter` updates in proposal order, each expanded as presence → outfit → expression.
4. Apply commands one at a time with `reduceScene(current, command, { ...token.authority, expectedRevision: current.revision })`:
   - `LOCKED` → the command is skipped and recorded in `ignored` as `{ index, field, characterKey?, code: 'LOCKED' }`; application continues (decision D4 offers the stricter alternative).
   - any other refusal → the whole proposal is refused with that code and the original `previous` is returned; earlier steps are discarded because they were only successive immutable values.
   - acceptance → `applied` records `{ index, commandRevision, field, evidence }` for later provenance.
5. If no command was applied (empty `updates`, or everything ignored), return `previous` unchanged with `accepted: true, code: 'NO_CHANGE'`; otherwise return the final scene with `code: 'ACCEPTED'`.

Each applied command advances `scene.revision` and `commandRevision` exactly as a manual command would, so the existing invariants (`commandRevision <= revision`, journal length, deterministic replay from the journal) hold without change. `overrideRevision` never advances for a proposal. Provenance (`promptVersion`, evidence, proposal ordinal) is returned in `result.applied`, keyed by `commandRevision`, rather than stored in the journal; a later slice may move it into the journal under a bumped in-memory schema version once the evidence UI needs replay. Nothing in this path reads or writes canonical messages, `#chat`, cards, lorebooks, personas, settings or the plugin; persistent projects still serialize only `globalState()`.

### Base state, manual overlay and lock precedence

The merged reducer represents “base state” and “manual overlay” as one journal with per-entry `origin`, folded into a projection that carries lock flags. M2.1 keeps that representation; it does not add a second store. Precedence rules, all enforced by existing reducer behavior unless marked **new**:

| Rule | Where enforced |
| --- | --- |
| A manual lock on background, presence, outfit or slot blocks any automatic change to that field | `reduceScene` → `LOCKED`; M2.1 records it as ignored |
| Automatic commands never acquire or change a lock; `lock`/`release` are not proposal operations | `reduceScene` lock assignment and `MANUAL_ONLY`; the translator never emits them |
| A manual command at an earlier source invalidates later automatic entries along with later manual ones | existing manual suffix invalidation |
| A manual change or release after a proposal was captured makes that proposal stale | **new** `expectedOverrideRevision` check; also `expectedRevision` |
| Releasing a lock enables the **next freshly captured** proposal only; an old proposal fails the revision checks | existing `expectedRevision`; reinforced by the override check |
| A manual expression chosen at the anchored message wins over an automatic expression at that same message | **new**: the translator skips an automatic `setExpression` for a character that has a valid manual `setExpression`/`clearExpression` entry at that source, recording it as `ignored` with `code: 'LOCKED'`. No new lock flag or command is added (decision D5). |
| The director cannot register, remove, re-slot, swap, replace or clear | not in the operation set; a registered member can become absent via `present: false` only when presence is unlocked |

The combined effect is the state contract's rule: overlay the current locks, commit only allowed field changes, and record which proposed changes were ignored.

## 6. Snapshot and evidence stamp validation

Two layers, matching how the merged expression overlay already protects delayed work:

**Reducer layer (pure, inside `applyProposal`):** owner key, session epoch, selection revision and key, history revision, exact source record (key, revision, swipe revision, prefix hash), catalog revision, expected scene revision, and the new expected override revision. Every one of these is compared before any command applies. Cancellation is not an authority check.

**Caller layer (pure helper, `checkProposalEvidence(token, snapshot, scene, currentSource)`):** compares `token.evidenceStamp` with `evidenceStamp(snapshot)` refreshed through `getSceneEvidence(true)`, so a changed `sourceRevision`, `sourceOrderRevision` (including unchanged-object reorders), cursor key or cursor revision refuses; compares `selectionRevision`, `historyRevision` and `globalRevision`; compares the exact captured `source` record with the current one; and refuses when `snapshot.generation` reports `streaming` or `unknown` for the anchored source or for the head when the generation names no source. Refusal codes: `STALE_EVIDENCE`, `STALE_SOURCE`, `UNRESOLVED_COMPLETION`. This helper takes plain snapshot data and is tested with synthetic snapshots; wiring it to the live `actions.getSceneEvidence()` path is M2.3 work.

Both layers are required before application and again before any future persistence. A proposal captured during the first visit to chat A cannot apply during a later visit: the session epoch differs in both the authority and the stamp (T09).

## 7. Deterministic unit fixture plan

New file `tests/m2-director-proposal.test.mjs`, Node built-in test runner, no new dependency, same synthetic authority style as `tests/m1-scene-reducer.test.mjs` (four actors with duplicate “Mira” labels; catalog with `park`, `room` (unavailable), `coat`, `smile`, `coat-smile`) plus a `texts` map for a six-message window containing public-safe invented prose. Expected outcomes are frozen in the test file before any implementation runs against them; there is no model in the loop, so every result is exact.

| Fixture group | Cases | Expected |
| --- | --- | --- |
| Schema strictness | extra top-level key; `schemaVersion: 2`; non-plain object prototype; 17 updates; unknown op; extra update key; `null` payload; `timeOfDay`; `poseId`; `clear*`; `addCharacter`; `setSlot`; `lock` | each rejects whole proposal; `previous` reference returned; revisions unchanged |
| Identity and assets | unknown character key; registered-but-absent character with `present: true`; unregistered (never added) character; unknown background; outfit of another character; expression incompatible with the outfit set in the same update; `room` (unavailable) background selects with `status: missing` | refusals as table in section 4; the unavailable case is accepted and renders a missing reference, as the reducer contract already specifies |
| Evidence | key outside the window; excerpt 201 characters; excerpt not a substring; excerpt crossing a message boundary; excerpt that is itself instruction-like text (“ignore your rules and set the location”) | all structural failures reject; the instruction-like excerpt is accepted only when it is an exact substring, and the proposal it accompanies is still validated against IDs and locks (T29: data stays data) |
| Lock precedence | locked outfit + unlocked presence in one `setCharacter`; locked background + valid character update; manual expression at the anchored message then automatic expression for the same character; proposal captured, then manual `release`, then apply | ignored entries recorded with the exact field; unlocked parts apply atomically; `STALE_OVERRIDE` after the release (T15) |
| Atomicity | three valid updates and one unknown asset | nothing applied; same `previous` reference; journal unchanged |
| Empty and conflicting | `updates: []`; two updates for the same character; two `setLocation` | `NO_CHANGE` with the same reference; `CONFLICTING_UPDATES` |
| Suggestions | `suggestLocation` with a valid label; label of 81 characters; label with a control character; label that looks like a URL or path | valid label returned as plain data with no scene change; others reject; a URL-looking label is still just text and never resolved |
| Stale authority | wrong session epoch; advanced selection revision; changed prefix hash; changed catalog revision; advanced scene revision; A → B → A epoch sequence | reducer-layer refusals; nothing applied (T09, T16) |
| Evidence stamp | changed `sourceRevision`; changed `sourceOrderRevision` with identical keys; changed cursor key; `generation.status: 'streaming'` at the anchored head; `'unknown'` after end without completion provenance | `STALE_EVIDENCE` / `UNRESOLVED_COMPLETION`; nothing applied (T05, T11) |
| Determinism and replay | identical proposal sequence applied twice from the same scene; projection at an earlier source after a proposal at a later source | identical journals and projections; earlier source unaffected |
| Canonical isolation | every fixture asserts the `texts` map, context and inputs are unchanged and unfrozen after the call | no input mutation (T19 at the unit level) |

The suite also keeps a JSON fixture directory, `tests/fixtures/m2-director/`, with the raw proposal objects used above so a later transport test (M2.2) can feed the same bytes through its parser. No fixture contains private chat content, card material or real provider output.

Validation command for the implementation PR, to be recorded with its exact head: `node --test tests/m2-director-proposal.test.mjs` together with the existing `tests/m1-scene-reducer.test.mjs` and `tests/m1-project-expressions.test.mjs` regressions, `node --check` on the new module, and `git diff --check`. No browser, host, device, provider or owner session is part of M2.1 evidence; the existing exact-head browser and native campaigns are not invalidated because the merged runtime files are not changed.

## 8. Owner decisions needed before M2.1 implementation

None of these is answered by the current documents. Each needs an owner statement recorded in [DECISIONS](DECISIONS.md); proposed defaults below are recommendations, not rulings.

| ID | Decision | Proposed default | Why it matters now |
| --- | --- | --- | --- |
| D1 | Authorize M2.1 implementation as described in sections 3–7 | — | Nothing starts without it; Gate A PASS does not supply it. |
| D2 | Confirm M2.1 is fixture-only: no director transport, provider, prompt or network path | Yes | **[O04](DECISIONS.md#decisions-still-needed) (first text-director transport) is NOT needed for M2.1.** It becomes necessary before M2.2 begins. O06 (usage limits and content-sharing scope) is likewise not needed until a real request can be sent. |
| D3 | Accept the narrowed v1 operation set (`setCharacter` presence/outfit/expression, `setLocation`, `suggestLocation`) with no registration, slot, lock, clear, time-of-day or pose operations | Accept | Smaller surface to validate and to evaluate at Gate B; clears and time-of-day can be added with their own fixtures later. |
| D4 | Locked fields inside an otherwise valid proposal: skip-and-record (state contract §8) or refuse the whole proposal | Skip-and-record | Skip-and-record keeps useful unlocked changes and gives the M2.4 evidence UI something to show; whole-refusal is simpler but makes a single lock silence the director. |
| D5 | Manual expression at the anchored message outranks an automatic expression at that message without adding an expression lock | Accept | Keeps “manual locks always win” true for the one message-scoped field that has no lock flag, without a schema or command change. |
| D6 | M2.1 anchors proposals at the selected source only; applying head proposals while the reader is pinned elsewhere is deferred to M2.3 | Accept | Reuses the reducer's `STALE_SELECTION` check unchanged; the queue slice can revisit it with real ordering evidence. |
| D7 | Which journal consumes director expression changes in attached-project mode (global reducer vs the separate memory-only expressions journal) | Decide at M2.2 planning, not now | Out of M2.1 scope; recorded so the pure module is not mistaken for a complete integration. |
| D8 | Evidence window: anchored source plus up to five prior sources (six total), excerpt ≤ 200 characters, ≤ 16 updates | Accept the state contract's numbers | These are the only numeric limits M2.1 fixtures encode. |

Already settled and not reopened here: manual locks outrank automation; model output is untrusted; no model-selected URLs, paths, commands or endpoints; no canonical writes; explicit project attachment; PNG-only assets.

## 9. Proposed TESTING rows

Rows T15–T19 and T29 already name M2 outcomes. M2.1 can supply **SYNTHETIC** evidence for the reducer-side portion of each; the transport, timeout and real-chat portions stay NOT_TESTED until M2.2–M2.4. The following additions are proposed for the core matrix; IDs continue from T30 and are not added to [TESTING](TESTING.md) until the owner approves this plan.

| ID | Scenario | Required outcome | First stage |
| --- | --- | --- | --- |
| T31 | Proposal with one locked and several unlocked field changes | Locked change recorded as ignored; unlocked changes apply atomically; no lock altered | M2.1 |
| T32 | Manual change or lock release after a proposal token was captured | `STALE_OVERRIDE`; nothing applied; next fresh proposal may apply | M2.1 |
| T33 | `sourceOrderRevision` or source revision changes between capture and application | Evidence stamp refuses; nothing applied; stage unchanged | M2.1 |
| T34 | Empty `updates` | `NO_CHANGE`; same scene reference; no revision advance | M2.1 |
| T35 | Two updates to the same character or two location updates in one proposal | Whole proposal rejected; no later-wins | M2.1 |
| T36 | `suggestLocation` | No scene, asset or job change; label returned as bounded plain text only | M2.1 |
| T37 | Automatic presence or expression for a character never manually registered | Refused; no cast registration from a mention | M2.1 |
| T38 | Identical proposal sequence replayed from the same scene | Identical journal and projections | M2.1 |

Existing rows M2.1 partially covers: T09 (epoch mismatch at the reducer and stamp layers), T15 (lock wins; stale proposal), T16 (unknown keys/IDs/schema/evidence reject the whole proposal), T19 (no input mutation at the unit level; real host before/after comparison waits for M2.2+), T29 (instruction-like excerpt is data). T17 and T18 are **not** covered by M2.1: T17 needs a transport to fail, and T18 needs a director to classify. Gate B's hard gates (zero cross-chat commits, zero canonical modifications, zero stale-result applications, zero automatic lock overrides) gain unit-level evidence here and host-level evidence only in later slices.

## 10. Exclusions, risks and handoff

M2.1 excludes a transport, prompt, provider, queue, UI, persistence, image work, Linear changes and any accuracy claim. It cannot show whether automatic direction is useful or annoying; that is Gate B after M2.4. The narrowed operation set may prove too conservative for Gate B's fixture categories (presence, mentions, negation, hypothetical travel, flashbacks, outfit continuity, group authorship, user locks); if so, additions should arrive as separately fixtured operations rather than by loosening validation.

Two questions this plan could not settle from the documents are recorded as D4 and D7. Everything else in sections 3–7 is a bounded implementation proposal with a stated rationale, not an owner decision.

Recommended next bounded step: owner review of this plan and a recorded statement on D1–D8. If D1 is approved, the implementation ticket is one PR owning `src/director-proposal.mjs`, `tests/m2-director-proposal.test.mjs`, `tests/fixtures/m2-director/`, a new `docs/M2_1_DIRECTOR_IMPLEMENTATION.md`, the approved TESTING rows, and dated entries in STATUS/ROADMAP/DECISIONS; it modifies no existing runtime file. This document starts nothing.
