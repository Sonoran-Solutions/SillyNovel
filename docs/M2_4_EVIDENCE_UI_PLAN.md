# M2.4 evidence UI plan — decision evidence on stage, manual corrections, the lock-default question and the Gate B candidate

**Status: planning proposal, NOT approved.** This document proposes the fourth and last M2 slice on top of the completed M2.3 director: an on-stage record of what the director decided and why, a way to correct one automatic decision without clearing the rest, an answer to open question O08, and what the Gate B candidate needs on screen and on record. It authorizes nothing. M2.4 implementation, every one of its proposed PRs, Linear tickets, the DYL-193 replay and Gate B each require a separate owner authorization recorded in [DECISIONS](DECISIONS.md). Gate B remains **NOT_RUN**.

**Post-ruling update — 2026-11-02.** The owner [ruled on G1–G14](DECISIONS.md#owner-rulings-g1g14--m24-evidence-ui-corrections-and-gate-b--2026-11-02) with this plan's recommendations after it merged at `628a3b4`: PRs A and B are authorized and tracked by [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b); PR C and PR D follow on separate go-aheads; O08 is resolved as option A; [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) is reopened and extended. The status paragraph above and the rest of this document are the historical proposal.

**Date:** 2026-11-02, America/Phoenix. **Starting main:** `897deebd17a64a77eb697ac89771fc28c41163d3` (PR #56, the owner's M2.3 PR C acceptance; `docs/DECISIONS.md` begins with “Owner acceptance — M2.3 PR C merged; M2.3 complete — 2026-11-02”). Runtime and tests are unchanged by this document. The final pushed head of the planning branch is recorded in section 12.

Read alongside the [M2.3 plan](M2_3_DIRECTOR_QUEUEING_PLAN.md) and [M2.3 implementation record](M2_3_DIRECTOR_IMPLEMENTATION.md), the [F1–F10 rulings](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02), the [M2.1 plan](M2_1_DIRECTOR_PLAN.md) (D4, D5, the refusal codes), the [state and director contract](STATE_AND_DIRECTOR.md) (sections 5, 8, 9), [UX spec section 6](UX_SPEC.md), [roadmap Gate B](ROADMAP.md#gate-b--direction-quality) and [testing](TESTING.md) rows T18, T39–T57 and section 6. Where this plan narrows or amends a ruling, the change is a proposal in section 10, not a replacement of the ruling.

## 1. What M2.4 is and is not

The roadmap defines M2.4 as “evidence UI, manual corrections, real-chat evaluation”, evidenced by “Gate B candidate and error taxonomy”. This plan proposes building the first two, and preparing the third without running it.

| In M2.4 (proposed) | Out of M2.4 |
| --- | --- |
| A memory-only **decision log**, one entry per director request, with the existing bounded evidence excerpt, and the outcome taxonomy of section 3.2 | Persisting the log, tallies, corrections or the overlay; any model text beyond the validated excerpt; hidden model reasoning |
| A one-line director status outside the closed controls panel and a **“Why this visual?”** disclosure for the selected message (UX spec section 6) | A dashboard, a timeline, charts, exported logs, telemetry |
| **Correct this decision** for expression, background and presence at the selected message, in memory, without clearing the rest of the overlay (section 4) | Automatic outfit or slot changes (F7 stands); rewriting earlier messages' visuals; retroactive re-requests |
| A **Resume** control after a pause (deferred here by the M2.3 plan), without the overlay loss the toggle causes (section 3.5) | A Retry control; automatic resume (F6 stands) |
| A one-click per-field “director may move this” control over the **existing** lock flags (O08, section 5) | A new schema field, a schema version bump, a plugin change |
| A frozen Gate B fixture set, a scorer, and a protocol and record form for the owner's session (section 6); the NOT_RUN host rows from the PR C record | Running Gate B, a verdict, an accuracy promise, a director connection profile, image work (O05), DYL-56 |

Unchanged and not reopened: off by default and enabled per project (E5); one request in flight, the ceiling and the request assembly (O06, E6, E9, E12, E13); F2–F7; the memory-only journal with manual precedence (D7, T50); manual locks outrank automation; canonical chat, cards, lorebooks, personas and connection settings are read-only; no visual tags in roleplay output; model output and imported metadata are untrusted data rendered only as text; no model-selected URLs, paths, commands or endpoints; no new dependency; the host adapter gains nothing.

## 2. Verified starting point in the merged code

Read-only inspection of main `897deeb`; nothing was run. Each row names the fact this plan builds on and its consequence.

| Verified fact | Consequence for M2.4 |
| --- | --- |
| `say()` in `src/director-controller.mjs` overwrites a single `notice` string, and `status()` returns only `{available, enabled, notice, count, ceiling, paused}`. Nothing retains which message or excerpt a decision came from. `consecutive` lives in the session but is not exposed. | The evidence UI needs a new memory-only record; it cannot be derived from anything kept today. |
| `applyProposal` already returns `result.applied` with `{index, commandRevision, field, characterKey?, evidence, promptVersion}` and `result.ignored` with `{index, field, characterKey?, code: 'LOCKED'}`, and the M2.1 plan anticipated these for the evidence UI. `settle()` reads only `applied`'s index and the length of `ignored`. | Layout provenance exists and is thrown away after the notice. Keeping it costs no new validation. |
| Evidence excerpts are validated as exact substrings of at most 200 characters of a window message's original text (`validEvidence`, `request.texts`). Refusal `detail` strings name positions and rules, never model text. Raw response text is read only inside `parseDirectorResponse`, which never returns it. `src/stage-view.mjs` has no `innerHTML` and writes through `textContent`. | The excerpt is the one piece of model output whose content is proven to be canonical chat text, and it renders safely as text. A refused proposal needs only its code. |
| `suggestLocation.label` is the one other model-authored string: free text up to 80 characters, not a substring of anything, shown today in the notice as “Suggested location: …”. | The existing notice stays. The log proposed here does not copy it (section 3.3). |
| `stillCurrent()` has five refusal paths (journal `valid`, ticket, cursor, overlay identity, `checkProposalEvidence`) and returns `null` for all of them. `settle()` then reports `SUPERSEDED` or “Director request cancelled.” `ABORTED` shares that same “cancelled” text. The plan's `STALE_SCENE` was never emitted as a code. | “Stale codes” exist in the pure modules but not at the surface. Section 3.2 has `stillCurrent` name its reason; staleness still precedes reading the result. |
| When three failures pause the director, `state.paused` holds the **last failure's code**, not a `FAILURE_LIMIT` value. Abandonment pauses with `ABANDONED`, the cap with `CEILING`. | The taxonomy uses what the code stores. A pause entry names the code that caused it. |
| `routeProposal` drops a value the stage already shows, with no record (PR C choice). | The log cannot presently distinguish “the model repeated the current location” from “the model said nothing”, which is the difference between agreement and abstention at Gate B. Section 3.2 records it. |
| `directorArea` is appended inside the Project area of the `details` “Manual scene controls” panel. Its `directorStatus` is therefore invisible while that panel is closed. The `cast` read-out, with “(director)”, is outside the panel. | During ordinary reading the user cannot see “Director request in progress”, the count or a pause. That matters for the E16 question and is why section 3.1 adds one line outside the panel. |
| `setEnabled(false)` calls `overlay.clear()`, and the F6 resume path is the toggle: off, then on. | **Resuming after a pause today discards all automatic layout.** No ruling asked for that. Section 3.5 proposes Resume. |
| `src/project-scene.mjs` applies a manual background or presence to the **global** scene, whose single synthetic source `project-global:<id>` applies at every message, sets the lock (`apply` in `src/scene-reducer.mjs`: `locks.presence = manual`, `backgroundLocked = manual`), marks the project dirty, and calls `clearOverlay()` (F8). | The only layout correction today rewrites the project's default at every message, can be saved, locks the field and clears every other automatic decision. Reverting one bad background is therefore not available; section 4 addresses it. |
| The render loop sets the Scene panel's selects from the composed view, so the background select shows a director-chosen value when one is on stage. Pressing Apply then writes that value into the global layout. | “Keep this for the project” already exists through ordinary controls, and needs no new code. |
| `dispatch` in `src/project-expressions.mjs` already handles a manual `setExpression` or `clearExpression` at the cursor. A manual clear records the source and actor in `cleared`, which outranks later automatic choices there (T50). A dispatch at an earlier message removes decisions at later messages (“Historical correction invalidated later expressions”). | Correcting an automatic expression needs no new semantics, only a control on the decision. The suffix rule stands and must be named in the notice. |
| `reduceScene` accepts `origin: 'manual'` on any reducer scene, requires the source to be the selected source, advances `overrideRevision`, invalidates valid commands at later sources, and forward-scopes through `project()`. The overlay is such a scene. | A manual command in the **overlay** at the selected message is exactly the contract's section 5 scope, in memory, and never reaches `globalState()`. Section 4 builds on this. |
| `directorOverlay.active()` is true only for valid `automatic` commands, because the base replay is manual. `composeLayout` marks any value that differs from the global view as `origin: 'automatic'`, because the projection carries no origin, and it does not compose locks. `requestInput` reads presence locks from the overlay but `backgrounds[].locked` from the **global** scene. | Three small changes in PR C (section 4.4). Without them a correction would be invisible, or labelled “(director)”, or its lock would not be shown or told to the model. |
| `validateScene` requires exactly `{presence, slot, outfit}` in `locks` and a boolean `backgroundLocked`. The load path in `createProjectScene` replays the saved `lock`/`release` for every field, and `globalState()` writes them back. The stage refuses a plugin whose `schemaVersion` is not 2. | **A released lock with its value kept is already representable, saved and exported in schema v2.** That is the core of the O08 answer (section 5). A separate flag would be a schema change. |
| `hasExpressionWork` (E11) requires a present actor with a compatible **temporary** expression. Temporary expressions live in the journal, so they disappear on reload and on detach. | A director session must re-import expression art on every attachment, or the director stays idle and layout never moves. Section 6.3 makes that a protocol step and G11 asks whether to keep it. |
| Reader actions are `navigate(±1)`, `jumpToLatest` and `openOriginal`; no action selects an arbitrary source. | Evidence and corrections work on the selected message. A forward-scoped decision from an earlier message is shown and corrected from the message the user is on. |
| **DYL-193 status conflict.** Linear shows DYL-193 **Done** since 2026-11-02T01:53Z, about three minutes after it was created, with PR #36 (the deferral record) as its only attachment; the owner's timing comment was added later. `docs/evidence/` has no DYL-193 package, and DECISIONS, STATUS and ROADMAP all call it open. | The coverage appears never to have run. The Done state looks like a side effect of the PR #36 merge, but that is an inference, and this plan does not change Linear. G12 asks the owner to settle it. |

## 3. Evidence UI

### 3.1 Where it appears

| Surface | Proposal | Why |
| --- | --- | --- |
| **Director line**, one line in the stage next to the `cast` read-out, shown only while attached with the director enabled | `Director: <state> · <count> of <ceiling>`, where state is on, waiting, requesting, paused or idle | The panel is closed while reading. Nothing else tells the user a request is running or that the director stopped |
| **“Why this visual?”**, a closed `details` below it, shown only when the selected message has something to explain | What is on stage at the selected message and which decision put it there, then the requests anchored at this message | UX spec section 6 names exactly this panel. Keeping it closed protects the reader from chrome; it is one action away |
| **Session summary**, inside that disclosure | The tallies of section 3.4 | The Gate B record needs them. They are bounded numbers with no story text |
| Existing `directorStatus` and notices | Unchanged | No existing assertion or help text has to move |

The disclosure uses a plain list, not a live region: the Director line carries `role="status"`, and excerpts are not announced as they arrive. Escape closes it as the controls panel does. It must not reduce the reply field's reach on the tablet (the [DYL-60 keyboard correction](M1_4_DYL60_KEYBOARD_FIX.md)), so it scrolls within a bounded height; that needs a physical check under DYL-193.

### 3.2 Outcome taxonomy

One log entry per **issued** request, plus entries for requests refused while being built and for pause events. Waiting states are status, not decisions, and are never logged. Every code below already exists except those marked new.

| Outcome | Code shown | Trigger in `settle()` / `fire()` | Failure count | Ceiling | Result read? |
| --- | --- | --- | --- | --- | --- |
| Applied | `APPLIED` (new label) | At least one layout or expression change | Reset | Counted | Yes |
| No change | `NO_CHANGE` | Accepted with nothing applied, including empty `updates`, or everything skipped | Reset | Counted | Yes |
| Overtaken by a reply | `SUPERSEDED` | Stale and a reply generation started (F4) | Unchanged | Counted | **No** |
| Cancelled | `ABORTED`, or `CANCELLED` (new label) | The user's Stop; a `quiet` or `impersonate` generation; a stale result with no other reason | Unchanged | Counted | **No** |
| Stale | `STALE_JOURNAL`, `STALE_SELECTION`, `STALE_SCENE` (new names for three existing paths), `STALE_EVIDENCE`, `STALE_SOURCE`, `UNRESOLVED_COMPLETION` | The first failing path of `stillCurrent` | Unchanged | Counted | **No** |
| Not built | `INVALID_SCENE`, `INVALID_DIRECTOR_INPUT`, `UNSAFE_DIRECTOR_PAYLOAD` | `fire()`, before anything is sent | +1 | **Not counted** | No request exists |
| Transport failure | `HOST_REFUSED`, `TRANSPORT_ERROR` | Adapter result | +1 | Counted | No text exists |
| Response refused | `EMPTY_RESPONSE`, `RESPONSE_TOO_LARGE`, `NOT_SINGLE_JSON` | `parseDirectorResponse` | +1 | Counted | Parsed, never retained |
| Proposal refused | `INVALID_PROPOSAL`, `UNSUPPORTED_PROPOSAL_SCHEMA`, `INVALID_UPDATE`, `INVALID_EVIDENCE`, `INVALID_EVIDENCE_WINDOW`, `UNRESOLVED_CHARACTER`, `CHARACTER_NOT_ADDED`, `UNKNOWN_ASSET`, `INCOMPATIBLE_ASSET`, `CONFLICTING_UPDATES` | `validateProposal`; also any refusal from `overlay.apply` | +1 | Counted | Parsed, never retained |
| Partly applied | `PARTIAL` (new label) | Layout applied, then an expression dispatch threw; also the temporary expression limit | Unchanged, as today | Counted | Yes |
| Abandoned | `ABANDONED` | 90 s outstanding (E7); a late settlement is discarded unread | +1 | Counted | **No** |
| Paused | The causing code, or `CEILING` | Three consecutive failures, abandonment, or the cap | n/a | n/a | n/a |

Not logged, shown only on the Director line: `Director waiting while you type`, the waiting-reply notice, slot-busy, and the idle reasons (no connection, no expression artwork, no host path). No request was issued in those cases and nothing was spent.

Within an accepted request each update carries one **disposition**: `applied`; `LOCKED` (from `result.ignored` or a journal `LOCKED`); `NO_AUTOMATIC_LAYOUT` (outfit, and an expression that falls with it, F7); `unchanged` (new: routing already drops it, and now records it); or `suggestion`.

### 3.3 The log entry

A new pure module `src/director-log.mjs`, owned by the controller, so it has the attachment's lifetime and a chat switch discards it.

```js
{ seq, source /* exact anchored record */, outcome, code, elapsedMs, promptVersion,
  updates: [{ field, characterKey?, targetId?, before?, disposition,
              evidence?: { sourceMessageKey, excerpt } }] }
```

| Rule | Proposal |
| --- | --- |
| Model text | Only the validated `excerpt`. No raw response, no refusal `detail`, no suggestion label: the label stays in the notice as today, and the entry records only the `suggestion` disposition and its excerpt |
| Rendering | `textContent` only. Message number and author come from the reader's current history at render time; asset and actor labels come from the catalog, never the entry |
| Bound | The last 64 entries. Worst case about 64 × 16 × 200 characters in memory, released with the attachment; older entries fall off, and the tallies still count them |
| Invalidation | When the anchored source record no longer matches `expressions.sources()` (edit, swipe, regenerate, delete, reorder), the entry keeps its outcome and code, its excerpts are **deleted**, and it shows “message changed”. Text the user has edited away must not linger. The anchored record's prefix hash covers prior window messages too |
| Persistence | None. Nothing is added to `extensionSettings.sillynovel.director`, the project schema, bundles or the wire; `requestInput` has no field for the log |
| Link to what is on stage | Layout updates store `commandRevision` plus an overlay epoch that `rebase` advances, because a rebase restarts revisions. An expression matches on source and actor. An entry whose commands were cleared by F8 shows “cleared by your layout change” |

### 3.4 Session counters

The session summary shows requests and ceiling, consecutive failures and the pause reason (all existing, with `consecutive` newly exposed), plus tallies by outcome and code, update dispositions by field, corrections by field, and elapsed minimum, median and maximum. Tallies sit next to `count` in `runtime.session`, so they share E6's lifetime: they survive a chat-switch detach, and reset on Detach, Discard or reload. Unlike the log they hold no story text. The bounded median sample is the latest 64 elapsed values.

### 3.5 Resume

The M2.3 plan left “a Resume or Retry control” to this slice. Proposed: a **Resume** button on the Director line while paused. It clears `paused` and `consecutive` and leaves the overlay alone, which is the toggle's resume minus its `overlay.clear()`. It issues nothing retroactively, as F6 requires. While the count is at the ceiling it is disabled, with a note that the ceiling is set in the extension settings. **No Retry:** the ledger already forbids a second request for a key, the contract's user-requested retry would be new spending logic, and swiping or regenerating produces a new key anyway.

## 4. Manual corrections

### 4.1 The problem

A wrong automatic background can be undone today only by writing a choice into the project's global layout. That choice applies at every message, can be saved, locks the field, and clears every other automatic decision (section 2). F8 is right for a deliberate layout change, but it makes a small correction expensive, and the correction teaches the system nothing the user meant to say about the project.

### 4.2 Proposed actions

Each acts on the **selected message** and is offered on the matching row of “Why this visual?”. Controls are disabled when the journal reports not ready (streaming or unresolved), like the expression controls today.

| Field | Revert | Override | Mechanism |
| --- | --- | --- | --- |
| Expression | **Revert**: clear at this message | The existing Apply expression control | Existing manual `clearExpression` / `setExpression` on the journal. Message-scoped, and manual precedence already holds (T50). No new semantics |
| Background | **Revert**: back to the entry's recorded `before` value | A select of catalog backgrounds on the row | New: a manual `setBackground` or `clearBackground` in the **overlay scene**, forward from the selected message |
| Presence | **Revert**: back to `before` | Same as revert, because the field is binary | New: a manual `setPresence` in the overlay scene, forward from the selected message |
| Keep for the project | Not a new control | The Scene panel's existing Apply, on the value already selected | Existing global command, under F8 |

Anchoring at the selected message rather than at the decision's own message means a decision made at message 14 and corrected while reading message 20 leaves 14–19 as they were. There is no reader action to select 14 anyway, and rewriting the past is the larger change. To correct from 14, the user navigates there first; the reducer's rule then invalidates later commands, as the contract's section 5 says.

### 4.3 Interaction with F8, the journal and T50

| Rule | Proposal |
| --- | --- |
| F8 | **Unchanged and literally true**: a manual layout command *into the global scene* clears and rebases the whole overlay. A correction goes into the overlay, so it does not clear anything else at or before the selected message |
| F8 over corrections | A global manual command discards corrections too, and their locks with them; the notice already says “Director layout cleared”. One rule, and the user's deliberate global choice is exactly what shows. The alternative of preserving corrections across a rebase is the field-by-field idea F8 declined |
| Later messages | A correction at an earlier message invalidates **all** later overlay commands, of every field, by the reducer's existing rule. The notice says so, using the journal's wording. At the head, the usual case, nothing is invalidated |
| Journal | Unchanged. Its suffix rule also stands: correcting an expression at an earlier message removes later temporary expressions, as it does for any manual expression today |
| Precedence (T50) | Unchanged: a later automatic expression at a source with a manual choice or clear is recorded `LOCKED` |
| Outstanding request | A correction makes a new overlay scene, so a result in flight fails the identity check: stale, `STALE_SCENE`, not a failure, the same as a manual edit today |
| Save and dirty | A correction does not touch `edit`, `dirty`, `globalState()`, export or bundles. The row states “Not saved” |
| Lifetime | Same as the overlay: gone on detach, chat switch, reload, disable and project replacement. Invalidation follows the first changed source |
| Canonical chat | Not touched. A correction is a display instruction, as UX spec section 5 requires, and is never sent to the roleplay model |

### 4.4 Should a correction become a lock?

**Proposed: yes, in memory, on that field only.** A manual reducer command locks its field forward, so a correction locks the overlay's field from the selected message on. A later automatic update there is skipped `LOCKED`, recorded, and shown as “kept your correction”, with a **Release** on the row. Release is a manual `release` in the overlay, enabling the next fresh proposal only; it never applies an old one, as the contract's section 5 requires.

| Option | For | Against |
| --- | --- | --- |
| **Lock, memory only (recommended)** | Matches D4 and the contract's “locked until release”; no second kind of manual choice to explain; stops the model re-proposing what the user just rejected, since the same recent messages still say the same thing | The director goes quiet on that field until released or reloaded. A story that later really goes to the harbor stays where it is, with a visible `LOCKED` row explaining why |
| No lock, one-off revert | The director can still follow later story changes | The likely next reply re-proposes the same value, which is the “constant manual corrections” failure Gate B names |
| Lock for N messages | A middle ground | A new timed rule, and a number nobody has evidence for |

The Gate B session measures this directly: corrections and `LOCKED` rows are tallied per field.

Changes required, all in PR C: `src/director-overlay.mjs` gains `correct(command, authority)` and tracks the base's length so `active()` also counts corrections; `composeLayout` takes origin from the entry and composes overlay locks, so a correction is not labelled “(director)” and its lock is shown; `requestInput` reads `backgrounds[].locked` from the overlay, which changes a sent boolean's source but not the request's shape or `PROMPT_VERSION`. `src/scene-reducer.mjs` and `src/director-proposal.mjs` stay unchanged.

## 5. Open question O08 — a default the director may move

### 5.1 What is verified

The lock flag already **is** the marking: `locked: false` with a kept value means exactly “this is the default, and the director may move it”. Schema v2 stores it, Save persists it, bundles carry it, and `createProjectScene` restores it (section 2). What is missing is a usable way to reach that state: manually applying a value locks it (D4 and the contract), and releasing takes the Lock field select, the actor select and Release lock, with the outcome shown only in text. O08 is largely a control problem, not a data problem. The round trip above comes from reading the code; it was not run for this plan, and PR C must prove it on the host.

### 5.2 Options

| Option | What it means | State contract | Persistence | Assessment |
| --- | --- | --- | --- | --- |
| **A. Per-field “director may move this” over the existing flags (recommended)** | A toggle beside background and each actor's presence, dispatching the existing `release`/`lock`; an “Apply and let the director move it” button that sends the value then `release`; and on a `LOCKED` log row a one-click release naming the field | Section 5 gains a sentence: a manual choice stays locked by default, and the user can mark it movable. D4 is not amended | **None.** Existing `backgroundLocked` and `locks.presence`, saved only by explicit Save. Bundles already carry the flags; T48 is untouched because the director's enablement does not travel | Answers O08 with no schema work. The default stays locked, so no existing project changes. Marking is a manual command, so F8 clears the overlay and the project goes dirty, both visibly |
| A2. A separate `directorMayMove` flag | Keeps “locked” and “movable” as distinct stored facts | A third state to define (locked and movable?) | **Schema v3**: `validateScene`'s exact keys refuse it, the stage refuses a plugin not at v2, and it needs the explicit verified-backup migration of the [PR #29 correction](M1_PNG_ASSET_LIBRARY_REVIEW_CORRECTION.md), bundle compatibility, recovery tooling and the storage suite | Large cost for a distinction nobody has asked for. Not recommended |
| B. Unlock by default for fields set before attachment | On opening a project, saved values are movable for this attachment | **Contradicts** contract section 5 and UX spec section 5 (“a reload does not change its meaning”) and arguably the non-negotiable “manual locks outrank automation”, since a saved deliberate lock is indistinguishable from a default one. Would need a D4 amendment | If done on the global scene, the next Save erases the user's locks. If done only in the overlay base, nothing persists, but every saved lock is silently ignored while attached. Telling them apart needs a new stored fact, so it collapses into A2 | Moves the most, and is not recommended: it trades an inconvenience for a broken promise about locks |
| C. Status quo with clearer lock UI | Show lock state per field; explain each `LOCKED` row; keep the existing release flow | None | None | Honest and smallest, but a hand-arranged project stays still until the user performs several steps per field. Gate B would then mostly judge expressions, against the owner's choice to evaluate the complete director |

**Recommendation: option A**, which includes C's clearer lock UI. A new project still behaves as D4 says. The owner marks what may move, and the mark persists only when the owner saves. Slot and outfit get no toggle: the director can never move them (F7), so the control would mean nothing.

## 6. Gate B candidate

### 6.1 Sequence

Each step needs its own authorization, and no step implies the next:

1. PRs A–D merged. 2. One candidate SHA frozen, with the full campaign on that SHA. 3. **DYL-193 replay on that SHA**, as the owner ruled. 4. Fixture evaluation (section 6.2). 5. The owner's real session (section 6.3). 6. The owner's verdict, recorded in DECISIONS.

A runtime change after step 3 invalidates what it touches, and the replay reruns only for the affected surfaces.

### 6.2 Fixture evaluation

The roadmap requires a fixed public-safe set, expected answers frozen before measuring, and counts by category with no percentage promise.

| Item | Proposal |
| --- | --- |
| Set | `tests/fixtures/m2-gate-b/cases.json`: five invented, public-safe cases for each of the eight roadmap categories (presence, mentions, negation, hypothetical travel, flashbacks, outfit continuity, group authorship, user locks), 40 requests in all. Covers T18 |
| Frozen | Expected per-field answers are committed in PR D. The commit SHA is recorded before the first measurement. Changing an answer later is a new measurement, and the old result is retained |
| Outfit continuity | Under F7 the director never changes outfit. A case scores correct when no outfit moves and any outfit update ends `NO_AUTOMATIC_LAYOUT`; expressions in the case score normally |
| Scoring | `tests/probes/m2-gate-b/score.mjs`, pure. Per field: **correct**; **incorrect** (a wrong value, or a change where none was expected); **abstained** (no update where a change was expected). A refused proposal is counted apart as **refused**. Reported per category, with no aggregate percentage |
| Runner | `tests/probes/m2-gate-b/run.mjs` drives a host in which **the owner has selected the connection by hand**, and sends each case through the same `buildDirectorRequest` and `requestDirectorText` path as the product. No new credential route (O04). One request per case, one at a time, 90 s each, no retries, finite deadline, bounded output, under the supervised runner |
| Spending | The owner names the connection and accepts 40 requests against it (G9). No fallback. A failed case is reported, not retried |
| Retained | The cases and each proposal's JSON. Fixture text is public-safe, so this is safe to commit; no headers, keys or connection settings are retained |
| Hard gates | Zero cross-chat commits, zero canonical modifications, zero stale applications, zero automatic overrides of active locks, from the regression and native campaign **on the frozen SHA**, cited by SHA |

### 6.3 Real session protocol (proposed; only the owner runs it)

| Step | What happens | What it answers |
| --- | --- | --- |
| Before | Candidate SHA and pinned host confirmed; DYL-193 evidence exists; chat data backed up; the host used is the owner's choice (G10), since live installation is not authorized by any entry so far | Preconditions |
| Setup | Attach a project in one individual chat. Import temporary expressions, **required on each attachment** (E11). Mark at least the background and one actor's presence as movable (section 5). Enable the director; ceiling 40 | Does setup feel reasonable? Is re-importing tolerable? |
| Reading | Ordinary play on the owner's real connection, long enough for the owner to judge: the owner decides when it is enough. The Director line stays visible; “Why this visual?” opens when something looks off | Annoying or trustworthy? Latency, abstention, correction load |
| Corrections | Whenever a choice looks wrong: revert or override, and at least one Release. Note whether a `LOCKED` row explained the stillness | Is one panel enough? Is lock-on-correction right (G6)? |
| Group | The same in one native group chat, if the owner has one | Group authorship and four-or-more cast behaviour on a real turn |
| Lifecycle | One swipe, one edit, one A → B → A, one reload. Automatic visuals and corrections should behave as stated and not survive where they must not | T57, on the real provider |
| **E16 residual** | Press Regenerate, then separately a swipe, Continue or quick reply, while the Director line says requesting. Do it on the owner's real backend, knowing a reply may fail and a swipe recovers it | Does this backend lose replies? Is the help sentence enough? Accept, or require a fix before beta? (G13) |
| Close | Fill in the record below | |

### 6.4 On record

The [human gate record](TESTING.md#6-human-gate-record) (Gate B, candidate SHA, host SHA, browser and device, extensions, assets and providers, scenarios, automated checks, owner feedback, verdict, blockers, limitations, evidence locations), plus:

| Field | Source |
| --- | --- |
| Fixture counts by category; expected-answers SHA; `PROMPT_VERSION`; connection class and model as the owner reports them | Scorer output |
| Requests; tallies by outcome and code; dispositions and corrections by field; elapsed minimum, median and maximum; pauses and resumes | Session summary, transcribed. It is on screen only and is lost on reload, so it is copied before closing |
| E16 result per flow: reply kept or lost, toast or none, recovery used | Owner |
| DYL-193 evidence location and SHA | Evidence package |

**No excerpts, messages or labels from a private chat enter the repository** (AGENTS.md). The session record holds counts and the owner's words only.

### 6.5 Pass criteria for the owner's verdict

Verdict values are the record's: PASS, REVISE or STOP. **Only the owner supplies one.** An agent may report readiness, and the proposal is:

| Kind | Criterion |
| --- | --- |
| Required for a PASS to be recordable | All four hard gates at zero on the frozen SHA; DYL-193 evidence on that SHA, with anything unreached stated as NOT_TESTED and accepted by the owner; fixture counts recorded; no lost canonical text or saved-project change in the session |
| Owner's judgment, no number | Do visuals follow the story without being annoying or untrustworthy? Is abstention excessive? Is latency acceptable? Are corrections occasional or constant? Is the panel enough to understand a wrong choice? The roadmap says any of these can earn REVISE despite clean technical results |
| Deliberately absent | A percentage threshold. The roadmap forbids an accuracy promise before this evidence exists; the first session supplies the numbers from which one might later be set |

### 6.6 What stays NOT_RUN until the owner runs it

Gate B itself and its verdict; the fixture measurement on a real connection; T18; usefulness, accuracy, latency on a real provider; the E16 residual on a real backend; real single-slot, queueing and text-completion backends unless the owner's connection happens to be one; DYL-193, until its own run. Nothing automated substitutes for any of these.

## 7. Proposed changes, as four sequential PRs

| PR | Files | Nature | Evidence standard |
| --- | --- | --- | --- |
| **A. Decision log and stale reasons** | `src/director-log.mjs` (new, pure); `src/director-controller.mjs` (records entries and tallies; `stillCurrent` names its reason; `status()` adds `log`, `consecutive`, `tallies`); `src/director-session.mjs` (records `unchanged`); Node tests; `docs/M2_4_EVIDENCE_UI_IMPLEMENTATION.md` | Pure modules, with no renderer, adapter, composer or persistence change. Notices unchanged | Focused Node tests plus the record. Browser, storage and native NOT_RUN with reason |
| **B. Evidence UI and Resume** | `src/stage-view.mjs`, `style.css`, `src/director-controller.mjs` (`resume()`); Node and browser tests; native blocks | Renderer | Full native-host campaign, browser actual-entry suite, `check-discovery.py`, `validate.py`. Tablet NOT_TESTED unless the device is free |
| **C. Corrections and O08** | `src/director-overlay.mjs` (`correct`, `active`), `composeLayout`, `src/project-scene.mjs`, `src/director-controller.mjs` (`requestInput` lock source; correction tallies), `src/stage-view.mjs`; `docs/STATE_AND_DIRECTOR.md` section 5 and UX spec section 5 sentences; tests. Omit either half if the owner rules against it | Renderer and overlay; no schema change | Full campaign, including a Save, reopen and export round trip of a released lock, and the saved-layout byte comparison for corrections. Storage suite because the runner runs it; the plugin stays unchanged |
| **D. Gate B readiness** | `tests/fixtures/m2-gate-b/`, `tests/probes/m2-gate-b/{score,run}.mjs`; native blocks for the PR C record's NOT_RUN rows (below); a Gate B record template; docs | Tests and docs only. Runtime byte-identical to PR C | Scorer Node tests; the native director campaign, since its script changes; the runner is **not** run against a real provider |

Native blocks added in PR D: swipe, regenerate and Continue invalidating automatic layout; project replacement and removed art under the overlay; manual layout edit while a request is outstanding; the stage-view catch-up path; and Regenerate during a held request on the synthetic rejecting backend, with its E16 outcome recorded rather than asserted away.

No dependency is added. `src/scene-reducer.mjs`, `src/director-proposal.mjs`, `src/director-request.mjs`, `src/project-expressions.mjs`, `src/reader-source-model.mjs`, `src/host-adapter.mjs`, `index.js`, the storage plugin and the project schema are unchanged in every PR. Nothing is persisted beyond the existing `extensionSettings.sillynovel.director` keys, plus the existing lock flags when the user explicitly saves. Each PR has its own record, frozen SHA and dated entries, and a later PR starts only after the owner reviews the previous one.

## 8. Test plan

No real provider at any level; expected outcomes frozen before implementation.

| Level | Harness | Cases |
| --- | --- | --- |
| Node log (`tests/m2-director-log.test.mjs`, new, PR A) | Pure | Bound of 64 and tallies past it; excerpts deleted on source change, outcome retained; a raw response, `detail` or label given to the recorder is never held; HTML-looking and instruction-like excerpts stored verbatim as data |
| Node controller (extended, PR A, B) | Fake timers, as today | One entry per issued request for every row of section 3.2; a waiting state logs nothing; each `stillCurrent` path gives its reason and stale still precedes reading; `SUPERSEDED` unread; `unchanged` recorded; request inputs identical with and without a log; Resume keeps the overlay, issues nothing, is refused at the ceiling |
| Node overlay (extended, PR C) | Pure | A correction forward from the selected message and not before; later commands invalidated; other fields untouched at the head; lock skip `LOCKED`; Release enables only a fresh proposal; F8 rebase discards corrections; prefix change invalidates; `globalState()` and dirty untouched; not labelled “(director)”; `active()` true with only corrections |
| Browser actual-entry (extended, PR B, C) | Headless Chromium, synthetic host | Director line visible with the panel closed; disclosure content and keyboard use; an excerpt containing markup renders as text with no element created; no live-region announcement of excerpts; revert, override and release; toggle round trip through Save and reopen; a released lock read back from the save body; composer byte-identical |
| Native host (`tests/probes/m2-director/host.mjs`, extended, PR B, C, D) | Disposable pristine pinned 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, loopback endpoint, decoys seeded | Log and tallies across real generations; each correction with the saved layout and all non-chat files byte-identical; A → B → A discards the log and keeps the counters (E6); reload loses everything; the section 7 PR D blocks |
| Scorer (`tests/m2-gate-b-score.test.mjs`, new, PR D) | Pure, synthetic proposals | Correct, incorrect, abstained and refused per category; no aggregate percentage in the output; a fixture whose answers changed since the recorded SHA is refused |

The 20-turn Last Lantern script runs again in PR B and PR C with the director on, asserting no director text in the chat, every non-chat file byte-identical, and the saved layout unchanged unless the script saved it.

## 9. Proposed TESTING rows

IDs continue from T57 and are not added to [TESTING](TESTING.md) until the owner approves this plan.

| ID | Scenario | Required outcome | First stage |
| --- | --- | --- | --- |
| T58 | Each outcome of plan section 3.2 occurs | One log entry per issued request or build refusal with the right code; no entry for a wait or idle; stale decided before the result is read; counters as tabulated; nothing written to settings, project or wire | M2.4-A |
| T59 | Model output or chat text with markup, an instruction or a URL reaches the log | Only a validated excerpt is held and rendered, as text; no raw response, refusal detail or suggestion label in the log; no element created, nothing executed (T29 instance) | M2.4-A, UI in B |
| T60 | Source of a logged decision is edited, swiped, regenerated, deleted or reordered | Excerpts deleted; outcome kept; “message changed” shown; no text of the old message remains in the log | M2.4-A |
| T61 | Evidence UI on the stage | Director line readable with the controls closed; disclosure closed by default; keyboard operable; reply field reachable; reading and replying unaffected when the director is off, paused or failing | M2.4-B |
| T62 | Paused director, then Resume | Overlay kept; count kept; `consecutive` cleared; nothing retroactive; refused at the ceiling with a note | M2.4-B |
| T63 | Correct one automatic background or presence at the selected message | Forward from that message only; other fields kept at the head; later overlay commands invalidated when not at the head; field shows its lock and later updates skip `LOCKED`; Release enables only a fresh proposal; `globalState()`, saved project, bundles and all non-chat files unchanged; project not dirty | M2.4-C |
| T64 | Correct one automatic expression | Existing manual clear or set at that source; later automatic choice there recorded `LOCKED` (T50); suffix rule named in the notice | M2.4-C |
| T65 | Correction, then a manual global layout command | Whole overlay, corrections included, cleared and rebased (F8); notice says so; the manual choice is what shows | M2.4-C |
| T66 | Mark a background or presence movable, Save, reopen, export, import | Value kept, lock false after each; director may move it; a new manual apply locks again unless the movable action was used; director enablement does not travel (T48); schema v2 unchanged | M2.4-C |
| T67 | Gate B fixture scorer | Counts per category and field; refused apart; no aggregate percentage; changed expected answers refused against the recorded SHA | M2.4-D |
| T68 | Regenerate, Continue or swipe during an outstanding request on the synthetic rejecting backend (E16 residual) | Outcome recorded per flow; the user's message kept; recovery by swipe or regenerate demonstrated; not asserted away. Real backend stays with the owner's session | M2.4-D |

Amended on merge of the corresponding PR: T50 (corrections reach it through a control, otherwise as written), T57 (corrections join the list that manual edits clear). T18 is covered by the Gate B fixture run only when that runs.

## 10. Owner decisions needed before M2.4 implementation

None of these is answered by the current documents. Each needs an owner statement recorded in [DECISIONS](DECISIONS.md); recommendations are not rulings. IDs continue as G1–G14 after the M2.3 plan's F1–F10.

| ID | Decision | Recommendation | Why it matters now |
| --- | --- | --- | --- |
| G1 | Authorize M2.4 as the four sequential PRs of section 7, each with its own record and the owner's review before the next starts | Authorize A and B now; C after G5–G8; D after G9 | Nothing starts without it. A is pure and cheap; B is the first renderer change since PR C |
| G2 | Evidence surface: a one-line Director line outside the panel, plus a closed “Why this visual?” disclosure | Accept | Adds visible chrome to a stage Gate A passed without it. Alternative: everything inside the closed panel, which leaves status invisible while reading, and the E16 question hard to observe |
| G3 | Decision log: memory only, per attachment, last 64 entries; excerpts deleted when the source changes; tallies with E6's lifetime | Accept | Settles “no new persistence”. Alternative: tallies per attachment, reset by a chat switch, which breaks a Gate B count across A → B → A |
| G4 | Taxonomy of section 3.2, including new labels and stale names, and the rule that the log holds no model text except the validated excerpt (no suggestion label) | Accept | This is the roadmap's “error taxonomy”. Alternative: keep the label in the log so suggestions stay reviewable, at the cost of retaining free model text, bounded at 80 characters |
| G5 | Corrections: manual commands in the memory-only overlay at the selected message for background and presence; existing journal path for expressions; F8 unchanged for global commands | Accept | The core of “without clearing the whole overlay”. Alternative: leave corrections to the global controls, so every correction still clears everything |
| G6 | A correction locks its field in memory until Release, detach or reload | Accept | Trades later director moves on that field against re-correcting the same mistake. Alternatives: no lock; lock for N messages |
| G7 | A global manual layout command discards corrections along with the rest of the overlay | Accept | Keeps F8 one rule. Alternative: preserve corrections across a rebase, which F8 already declined in spirit |
| G8 | **O08:** option A, a per-field “director may move this” over the existing lock flags, with no schema change; the default stays locked | Accept option A | Decides how much the stage moves at Gate B. Alternatives: A2 (schema v3), B (unlock on open, contradicts the lock contract), C (clearer UI only) |
| G9 | Fixture evaluation: 40 public-safe cases, frozen answers, category counts with no percentage; run through a host where the owner selected the connection; which connection, and acceptance of 40 requests against it | Accept; the owner names the connection at run time | Spending and the first real-model data. Alternatives: fewer cases per category, or a loopback-only run, which measures nothing about direction |
| G10 | Real-session protocol and criteria of sections 6.3–6.5, no percentage threshold; which host to use | Accept; a disposable or backed-up host | The owner's own time. No existing entry authorizes live installation |
| G11 | E11 at Gate B: keep it, so a session needs temporary expression art on every attachment and a project without any never moves layout; or widen it so layout work also qualifies | Keep E11 for the first session; use it as a protocol step, and revisit from the owner's feedback | E11 is a ruling, and PR C recorded why reading the composed view is unsafe. Widening spends more requests. But it may surprise: a director with only backgrounds imported stays idle |
| G12 | **DYL-193:** Linear shows Done with no evidence, while the documents call it open. Reopen it (or replace it with a new ticket) and run it on the frozen candidate between PR D and the fixture run. Extend it to the director line, disclosure and correction controls on touch, and to the composer hold on touch, soft keyboard and IME (PR B NOT_TESTED) | Reopen and extend | The owner ruled that the replay precedes Gate B. This plan changed nothing in Linear and assumes the coverage has not run. If the owner knows otherwise, the sequence in section 6.1 changes |
| G13 | E16 residual: measured on the owner's real backend during the session, and on a synthetic backend in PR D; the owner decides from that whether the help sentence suffices | Accept; a loss on the real backend is a REVISE input, not an automatic fail | The hold cannot see these flows and nothing can end an outstanding request. Alternative: pre-emptively delay requests further, which adds latency for a problem not yet measured |
| G14 | Adopt the TESTING rows of section 9 and amend T50 and T57 as stated when the corresponding PR merges | Accept | Rows are not added until this plan is approved |

Implementation choices proposed here without an owner decision, reversible and to be recorded in each PR: the cap of 64, the 90 s per fixture, Resume's placement, and the exact words on screen.

Already settled and not reopened: E1–E16 and F1–F10 except as G5–G8 and G11 ask; O04, O06, D4, D5, D7; manual locks outrank automation; model output is untrusted; no canonical writes; explicit project attachment; PNG-only assets; the v1 operation set and evidence window. O05 stays deferred until Gate B PASS.

## 11. Exclusions, risks and limits

Excluded: a Retry control; automatic resume; automatic outfit and slot; persisted visuals, logs or corrections; exporting the log; hidden model reasoning; a director connection profile; adapter changes; a schema bump; DYL-56; Linear changes; running Gate B; image work.

| Limit or risk | Status |
| --- | --- |
| A valid excerpt proves the quote exists, not that the model read it correctly | By design. The panel presents it as a quote, never as a reason |
| The log and tallies are lost on reload, so a session record must be copied first | By design under “no new persistence”. Named in section 6.4 |
| A correction's lock can make the director seem to stop | Visible as `LOCKED` rows with Release. G6 records it, and the session measures it |
| Marking a field movable clears the overlay and dirties the project | F8 as written; stated in the notice |
| The Director line adds height on a stage whose tablet layout needed a keyboard correction | Physical check under DYL-193; NOT_TESTED until then |
| Regenerate, Continue, swipes, slash commands and quick replies still race an outstanding request on a single-slot backend | E16 stands; measured, not solved |
| An outstanding raw request cannot be ended; another extension can alter the raw prompt; quiet-after-reply leaves the head unresolved | Existing limits, unchanged |
| Real providers, text-completion backends, queueing single-slot backends, other host versions | NOT_TESTED, as in M2.3, except what the owner's session happens to reach |

## 12. Handoff

This document could not settle G5–G8 (corrections and O08), G9–G11 (evaluation scope, host and E11), or G12 (DYL-193's conflicting status) from the existing documents; the rest of section 10 is bounded implementation proposals with stated rationale. Everything in section 2 is inspection of the merged code at `897deebd17a64a77eb697ac89771fc28c41163d3`, plus one read of Linear for DYL-193. No host was run, no runtime or test file changes in this PR, and nothing in Linear was changed.

Recommended next bounded step: owner review of this plan and a recorded statement on G1–G14, with G12 first since it may change the sequence. If G1 is approved, PR A is one focused branch owning `src/director-log.mjs`, the controller and session changes, their Node tests and `docs/M2_4_EVIDENCE_UI_IMPLEMENTATION.md`, with dated entries in STATUS, ROADMAP, TESTING and DECISIONS; later PRs follow only after the owner's review of the previous one. This document starts nothing.

**Plan content frozen at** `c68c212ece97083cc3da3c626741f7e05a32f22c`. The commit that adds this line changes only this line and is the final pushed head; a commit cannot name its own SHA, so the exact head is in the PR description and the shared hand-over note.
