# M2.3 director queueing plan — serialization with native generation, a pending target, stale-result rules and the automatic layout overlay

**Status: planning proposal, NOT approved.** This document proposes the third M2 slice on top of the merged M2.2 transport: serialization between the user's own generation and director requests, a bounded queue with deduplication and catch-up, explicit stale-result and recovery rules, and a non-persistent home for automatic layout changes in attached-project mode. It authorizes nothing. M2.3 implementation, every one of its proposed PRs, Linear tickets and later M2 slices each require a separate owner authorization recorded in [DECISIONS](DECISIONS.md). Gate B remains **NOT_RUN**; DYL-193 stays open and is not this plan's concern.

**Post-ruling update — 2026-11-02.** The owner [ruled on F1–F10](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02) with the proposed defaults after this plan merged at `8cef9a3`: PRs A and B are authorized and tracked by [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold); PR C needs its own authorization (F9). The status paragraph above and the rest of this document are the historical proposal.

**Date:** 2026-11-02, America/Phoenix. **Starting main:** `a86bf2c` (PR #47, the owner's M2.2 acceptance record). The plan was written against the PR #46 merge `f570484dc9975ab543d4b116a198c9ba21dcd6ec` (M2.2 director transport, [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation)) and rebased on 2026-11-02; PR #47 changed STATUS, ROADMAP and DECISIONS only, so every fact in section 2 still describes the merged code. Runtime and tests are unchanged by this document. The final pushed head of the planning branch is recorded in section 11.

Read alongside the [M2.2 plan](M2_2_DIRECTOR_TRANSPORT_PLAN.md) and [M2.2 implementation record](M2_2_DIRECTOR_IMPLEMENTATION.md) (its sections 1, 7, 8 and 9 are this plan's inputs), the [E1–E16 rulings](DECISIONS.md#owner-rulings-e1e14--m22-director-transport--2026-11-01) and the [probe rulings](DECISIONS.md#owner-rulings-after-the-m22-host-probe--2026-11-01), the [state and director contract](STATE_AND_DIRECTOR.md) (sections 5, 9 and 10), [roadmap M2](ROADMAP.md#m2--conservative-automatic-direction), [testing](TESTING.md) rows T39–T50, and [attached temporary expressions](M1_PROJECT_EXPRESSIONS.md) for the journal that D7 names. Where this plan narrows or amends an E-ruling, the change is a proposal in section 8, not a replacement of the ruling.

## 1. What M2.3 is and is not

The roadmap defines M2.3 as “serialized work, deduplication, stale-result rejection, timeout/refusal recovery”, evidenced by “race tests including A → B → A”. The M2.2 record names three inputs: E16 serialization with native generation, queueing and catch-up, and the automatic layout overlay (E3 option B). The state contract's section 9 already states the intent: one director job in flight per chat, new completed messages processed in canonical order, bounded queued work or explicit skips, never a proposal applied against the wrong predecessor scene, and A → B → A treated as a new session.

| In M2.3 (proposed) | Out of M2.3 |
| --- | --- |
| A **pending target** of depth one: the latest completed head waits, instead of being skipped, until every gate in section 4.2 holds (serialization, selection, composer, slot, pause, ceiling) | A FIFO of every skipped message; catch-up for superseded heads; retroactive requests on enable or reopen |
| Two new gates against the user's own generation: never while the reader reports a generation in progress, and a **composer hold** while the user is typing or holds a draft (section 3) | Aborting an outstanding raw request (the host offers no handle); emitting host events; `responseLength`, `jsonSchema` or any E8 argument |
| Explicit, ordered stale-result rules on the existing stamps, with “superseded by your reply” as its own outcome (section 4.4) | A new stamp or token format; persistence of tickets, counters or the queue |
| Abandonment and refusal recovery stated as rules with race tests, keeping E7's pause and toggle-resume (section 4.5) | Automatic resume after a pause; a Resume or Retry control (M2.4 evidence UI) |
| A memory-only **automatic layout overlay** for background and presence in attached-project mode, as the third and separately authorized PR (section 5) | Automatic outfit and slot changes; any write to the saved project layout, the plugin schema or bundles; the evidence UI |
| Pure-module controller changes first, one narrow read-only adapter addition second, the overlay third, each with its own record (section 6) | Linear changes; Gate B; real-chat evaluation; image work; a separate director connection profile; DYL-193 closure |

Unchanged and not reopened: off by default and enabled per project (E5); one request in flight and the per-session ceiling (O06, E6); the request assembly, neutralization and parser (E9, E12, E13); expressions through the memory-only journal with manual precedence (D7, E3-A, T50); manual locks outrank automation; canonical chat, cards, lorebooks, personas and connection settings are read-only; no visual tags in roleplay output; model output and imported metadata are untrusted data; no model-selected URLs, paths, commands or endpoints; no new dependency.

## 2. Verified starting point in the merged code

Read-only inspection of main `f570484`; nothing was run. Each row names the fact this plan builds on and its consequence.

| Verified fact | Consequence for M2.3 |
| --- | --- |
| `src/director-controller.mjs` arms one `target` per completed head in `observe()`, fires about 2 s later (`SETTLE_MS`), and in `fire()` returns silently when the generation id, status, source key, revision or head changed (E15), and **skips and counts** when the cursor is not at the head (E10) or the page-wide slot is busy (`runtime.inFlight`). A skipped head is never revisited. | Section 4 replaces “skip and count” with a pending target for exactly those two gates; the E15 supersede rule is kept as is. |
| The in-flight slot is page-wide (`createDirectorRuntime`), released only when the host promise settles; `generateRawData` takes no signal. After `ABANDON_MS` (90 s) the ticket is abandoned, counts one failure, and no new request is issued until settlement. | The host offers no way to end an outstanding director request from SillyNovel. Section 3 therefore prevents overlap rather than resolving it. |
| The expressions journal's `token()` stamp is `[evidenceStamp(snapshot), owner, selectionRevision, generation]`, and `valid(token)` also compares `selectionRevision`, `historyRevision`, `globalRevision` and the exact source record (`src/project-expressions.mjs`). The reader's `generation` record changes id on every non-dry-run `generationStarted`, so **a user Send after capture already makes the outstanding result stale** through the stamp, and `stillCurrent` discards it before the result is read. | Send during a request costs nothing more than the request itself today. Section 4.4 names this outcome and its notice instead of folding it into “cancelled”. |
| The reader marks `generation.status` `streaming` from any non-dry-run `generationStarted` (including other extensions' `quiet` generations) until `generationEnded` (`unknown`) or `generationStopped`; `complete` needs a reply observation plus an end for the same generation (E4 as amended). A `quiet` generation after a completed reply leaves the head unresolved for the journal's `authority()` (an unbound generation refuses at the head). | `generation.status === 'streaming'` is the reader-side signal for “native generation running”. The quiet-after-reply case is an existing M1 limit, recorded in section 10, not changed here. |
| The pinned host emits `GENERATION_STARTED` early in `Generate()`, before prompt assembly and the fetch ([M2.2 plan 2.2](M2_2_DIRECTOR_TRANSPORT_PLAN.md#22-proposed-entry-point-generaterawdata--extractmessagefromdata)); there is no host event before the user presses Send. The group campaign showed the next member's `started` directly after the previous `rendered`. | Nothing in the host announces an imminent Send. The composer hold (section 3.2) is the only pre-Send signal available, and the settle interval already covers group turns. |
| `src/host-adapter.mjs` already reads host DOM read-only: it observes `#chat` mutations and scrolls `#chat` in `openOriginalMessage`. The composer is `#send_textarea`, which `tests/m1-reader-browser.test.mjs` preserves byte-for-byte across enable, disable and navigation. | A read-only composer signal fits the adapter's existing shape; it must never read, retain or send the draft text. |
| `src/director-session.mjs` `mirrorScene` builds a reducer scene per request over the journal's fingerprinted sources, replaying the project layout as manual commands at the selected source; `routeProposal` sends expressions to the journal and records layout as `NO_AUTOMATIC_LAYOUT`. The merged `applyProposal` in `src/director-proposal.mjs` reduces a validated proposal with origin `automatic`, skips locked fields as `LOCKED` (D4), lets a manual expression at the message outrank (D5), and is still uncalled at runtime. `reduceScene` refuses `lock`/`release` for automatic origin and `LOCKED` on locked background, presence, outfit and slot; `project(scene, sourceKey)` applies commands anchored at or before the selected source (forward scope) and expressions at the exact source only; `reconcileScene` invalidates every command anchored at or after the first changed source. | Everything the overlay needs for forward scope, lock precedence, dependent-suffix invalidation and atomic application already exists and is fixture-tested. Section 5 retains the mirror as a scene instead of rebuilding it per request. |
| `src/project-scene.mjs` keeps the persistent layout in a reducer scene with one synthetic source `project-global:<id>`; `globalState()` serializes only that scene's view; `get()` composes the expressions overlay's `view` over it for the renderer; the journal's `compatible()` binds temporary expressions to the actor's **global** outfit reference. | A second memory-only layer can be composed the same way without touching `globalState()`, save, export or bundles. An automatic outfit change would break the journal's compatibility rule, so outfit stays out of the overlay in M2.3 (section 5.3). |
| The M2.2 toggle help text carries the E16 sentence; the status line shows notice, count and ceiling (`src/stage-view.mjs`). | Section 3.3 proposes one sentence replacing the E16 sentence once the composer hold exists; no other control changes. |

## 3. Serialization with native generation (E16 follow-through)

### 3.1 What the host offers, and what it does not

Verified in M2.2 on the pinned 1.19.0 host: a director request is invisible to the host's generation lifecycle (no events, no `is_send_press`, no Stop control); the user's Stop aborts it only while one of the user's own generations is running; on a concurrent backend Send during a request completes normally; on a single-slot backend that rejects while busy, the user's reply fails with a host toast and the message is kept (E16). Not available on the pinned host: aborting a raw request from the caller, a pre-Send signal, or a backend busy state.

Rejected ways to end an outstanding request, recorded so they are not re-proposed:

| Option | Why not |
| --- | --- |
| SillyNovel emits `GENERATION_STOPPED` itself to trigger the host's abort listener | SillyNovel would be acting as the host: every other listener (the host's own stop handling, other extensions) would see a stop the user did not press. The adapter stays read-only on host events. |
| Pass `responseLength` to shorten director replies | E8 excludes it; it rewrites the user's max-tokens setting during the call, which is exactly the window a concurrent user generation would inherit. |
| Issue the director request only after the user's next Send | That is the user's own generation window; the two requests would then always overlap. |

### 3.2 Proposed gates before a request is issued

A director request is issued only when all of the following hold at fire time, re-checked from fresh evidence, in this order:

| Gate | Rule | Source of truth | Status today |
| --- | --- | --- | --- |
| Target still current | Same generation id, status `complete`, same source key and revision, still the head (E15) | Reader snapshot | Exists |
| No native generation in progress | `snapshot.generation.status !== 'streaming'`, whatever the generation type, including other extensions' `quiet` and `impersonate` | Reader snapshot | Implicit today (a new generation changes the id); made an explicit gate so the pending target waits rather than being dropped by accident |
| Settle elapsed | About 2 s since the last completion with no newer one (E15, `SETTLE_MS`) | Controller timer | Exists |
| **Composer hold released** | No keystroke in the composer for about 5 s **and** the composer is empty | New read-only adapter signal (section 3.2.1) | New |
| Selection at the head | Cursor is the anchored head (E10 anchoring) | Reader snapshot | Exists; outcome changes from skip to wait (section 4) |
| Slot free | `runtime.inFlight === false` | Runtime | Exists; outcome changes from skip to wait |
| Not paused, under the ceiling, host online, artwork present | As E7, E6, section 4 of the M2.2 plan, E11 | Runtime, adapter, journal | Exists |

#### 3.2.1 Composer hold

The adapter gains one read-only method, `inspectComposer()`, returning `{ present: boolean, draft: boolean, idleMs: number | null }` from `document.getElementById('send_textarea')`: `draft` is `value.length > 0`, `idleMs` is the time since the last `input` or `keydown` event the adapter observed on that element, `null` when none was observed since subscribe. The listeners are registered in `subscribe` and released by its disposer like the existing ones. The adapter never reads `value` beyond its length, never retains it, and the controller's request input type has no field for it, so the draft cannot reach the wire (the existing payload assertion and T39 cover the wire; a new browser case covers the adapter). When the element is missing, `present` is `false`, the hold is disabled with a one-time notice, and the director otherwise works as in M2.2.

The controller re-checks a held target on every `observe()` (the project sync runs on every reader change) and on a timer of the remaining hold time; the adapter calls the same observation path on composer `input`, so an idle non-empty draft that the user clears releases the hold without a keystroke timer.

What the hold covers and does not:

| Flow | Covered by the hold? |
| --- | --- |
| User reads the reply, starts typing, presses Send | Yes: no request starts while keystrokes are within 5 s or the draft is non-empty. |
| User typed a draft, paused longer than 5 s, presses Send | Yes while the draft is non-empty (the `draft` half of the rule). |
| User presses Regenerate, Continue or a swipe without typing | **No.** Nothing precedes `GENERATION_STARTED` for these. The settle interval covers the first 2 s after a reply; beyond it, E16 remains as a recorded limit (section 3.3). |
| Slash commands or quick replies that generate without the composer | **No**, as above. |
| A group turn | Covered by E15 settle plus the streaming gate: the next member's generation starts within the interval. |
| Another extension's `quiet` generation | Streaming gate; the head then stays unresolved under the existing reader rule (section 10). |

The residual race is the interval between the fire-time check and the host's fetch inside `generateRawData`, which is sub-second and not addressable from an extension.

### 3.3 Send while a director request is outstanding

Nothing can end the request. The proposal is to make the outcome explicit and cheap:

1. The result is discarded as stale by the existing stamp check (the generation id changed), **before it is read**, so a reply that arrives after the user's Send never applies to the superseded head or to the new one.
2. The outcome is `SUPERSEDED`, not `cancelled` and not a failure: the consecutive-failure counter is unchanged, the ceiling count stands (the request was issued), and the notice reads “Director request superseded by your reply”.
3. The superseded head is **not** re-anchored or retried; the next completed reply becomes the pending target as usual.
4. The user's own reply on a rejecting single-slot backend can still fail when Send lands inside an outstanding request that the composer hold could not prevent (section 3.2.1). E16 stays recorded; its help-text sentence changes to: “The director waits while you type; a regenerate or swipe pressed while a director request is running can fail on a backend that handles one request at a time, and a swipe or regenerate recovers.” The Gate B question from the M2.2 record stands, narrowed to the uncovered flows.

## 4. Queue, deduplication, stale results and recovery

### 4.1 Pending target, depth one

The controller keeps at most one **pending target**: the latest completed head that has not been requested, with its generation id, source key and revision (the same shape as today's `armed`). A newer completion replaces it (E15: the superseded head is never requested and spends nothing). It is cleared by disable, detach, dispose, a pause, the ceiling, or the ledger already holding its key. It is never persisted and never survives a page load, a chat switch (the project detaches under F1) or an explicit reopen (today's rule: enabling or attaching is not a completion and issues nothing retroactively).

This is deliberately not a queue of skipped messages. Under E3-A and under the overlay of section 5, a request directs the message the user is reading; a head that was superseded before it could be requested is also no longer the message the user is at. Requesting it later would spend the ceiling on an expression that shows only if the user navigates back, against a predecessor scene that has since moved on, which the state contract forbids. The alternative, a bounded FIFO of skipped heads, is recorded in F2.

### 4.2 Fire rules

`fire()` runs on settle expiry and on every later `observe()` or hold-timer while a target is pending. The gates of section 3.2 are evaluated from fresh evidence in order; the first failing gate decides:

| Failing gate | Outcome |
| --- | --- |
| Target superseded, disabled, disposed, paused, over the ceiling, key already in the ledger | Target dropped (today's behaviour); the ceiling and pause notices are unchanged |
| Native generation in progress | Target **waits**; it is replaced when that generation completes a new head, or dropped if it ends without one (generation id changed, no new completion) |
| Composer held | Target waits; notice “Director waiting while you type” |
| Selection not at the head (reading earlier) | Target waits; notice “1 reply waiting: Jump to Latest to direct it”. Returning to the head fires it once (catch-up). A newer completion while reading earlier replaces it |
| Slot busy | Target waits; fires once the outstanding request settles, after the gates are re-checked |
| Host offline or no expression artwork | Dropped with today's idle notices (E11) |

Only the two “wait” rows for selection and slot change M2.2 behaviour; T42's “counted, not queued” becomes “at most one waits, newer replaces older, never more than one request per key”. The `skipped` counter and its notices go away.

### 4.3 Deduplication

Unchanged key: `[sessionEpoch, owner, sourceKey, head revision, swipeId]` in the per-project ledger, kept in page memory with the counters (E6). A target whose key is in the ledger is dropped at fire time, which covers returning to a head that was already requested, and a `continue`, regenerate or swipe produces a new revision and a new key. The pending target adds a second dedupe rule: at most one target exists, so two completions within the settle interval or while a request is outstanding yield at most one later request.

### 4.4 Stale-result rejection, in order

All on existing stamps; no new format. The order matters because the first refusal names the outcome:

| # | Check | Outcome and counting |
| --- | --- | --- |
| 1 | Ticket is the current one and the controller is live | Silent drop (disable, detach, dispose, reload, A → B → A) |
| 2 | `expressions.valid(token)`: stamp (`evidenceStamp`, owner, selection revision, **generation record**), history revision, global revision, exact source | If the generation record changed because a user generation started: `SUPERSEDED` (section 3.3). Otherwise stale: discarded, not a failure, counted (E7) |
| 3 | Cursor still at the anchored source | Stale, as above |
| 4 | Rebuilt mirror or overlay equals the captured one (actors, locks, outfits, catalog revision) | `STALE_SCENE`, discarded, not a failure |
| 5 | `checkProposalEvidence` returns `CURRENT` and no pause was raised meanwhile | Stale, discarded, not a failure |
| 6 | Result read: `ABORTED` → cancelled; `ok: false` → failure; parse or validation refusal → failure | As E7 |
| 7 | Journal dispatch rechecks the exact source atomically; `LOCKED` keeps the manual choice | As T50 |

Staleness is decided before the result text is read, so garbage after a switch is never a failure (existing T45 rule). A → B → A changes the session epoch, disposes the controller with the project, and starts a new journal instance, so a late result from the first visit fails check 1 and would also fail check 2.

### 4.5 Timeout and refusal recovery

| Event | Rule (proposed) | Change from M2.2 |
| --- | --- | --- |
| Request outstanding 90 s | Abandoned: counts one failure, result discarded on settlement, no new request until settlement (E7) | None. The pending target then fires once the slot frees, instead of the next head being skipped |
| Settlement after abandonment | Slot released; late result discarded by ticket; pending target re-checked | Explicit; race-tested |
| Failure (transport, host refusal, parse, validation) | Skip that head and count; pause after three consecutive; success resets | None |
| Pause (`FAILURE_LIMIT`, `ABANDONED`, `CEILING`) | Pending target cleared; project toggle off and on resumes with the same counter | None. Automatic resume is recorded as the alternative in F6 |
| `SUPERSEDED` | Not a failure; counts toward the ceiling | New outcome |
| Stop by the user during the user's own generation | `ABORTED` → cancelled, not a failure, counts | None |

A pause raised while a target is pending clears it; there is no replay after resume, so a resume never issues a retroactive request.

### 4.6 Race matrix

Each row is a required Node controller test with fake timers, several also loopback and native (section 7). Expected outcomes are frozen before implementation.

| Race | Required outcome |
| --- | --- |
| A1 completes, A2 completes within 2 s | One request, for A2; A1 never requested, never counted (E15) |
| A1 completes; request outstanding; A2 completes | A2 waits; A1's result applies if still current; A2 fires after settlement; two requests, two keys |
| A1 completes; request outstanding; user sends; reply A2 completes | A1 result `SUPERSEDED`, not a failure, counted; A2 fires after settlement and settle; the user's message is untouched |
| Reply completes while the user reads earlier; user presses Jump to Latest | Waits with the notice, then one request; returning again issues nothing (ledger) |
| Reply completes while reading earlier; a newer reply completes; user returns to latest | One request, for the newer head |
| Reply completes; user starts typing within 2 s; stops typing; waits 5 s with an empty composer | Request issued only after the hold releases |
| Reply completes; user types a draft and leaves it | No request while the draft exists; a cleared draft releases the hold without a keystroke |
| Reply completes; another extension's `quiet` generation starts and ends before settle | No request (generation id changed, head unresolved); nothing counted |
| Four-member group turn | One request after the last member (existing T42), with the streaming gate observed between members |
| Chat A → chat B → chat A with a target pending in A | Target dropped on detach; reopen in A issues nothing retroactively; a new completion in A fires normally |
| Chat A → B → A with a request outstanding from A's first visit | Late result dropped at check 1; the page-wide slot stays held until settlement; a completion in A's second visit waits for the slot, then fires once |
| 90 s abandonment, then settlement, with a target pending | One failure counted at 90 s; late result discarded; pending target fires once after settlement |
| Three consecutive failures with a target pending | Pause; target cleared; toggle resumes with the counter; no retroactive request |
| Ceiling reached with a target pending | Pause at once; target cleared |
| Manual expression set at the head while its request is outstanding | Automatic decision for that actor recorded `LOCKED` (T50); other actors apply |
| Manual layout edit (section 5) while a request is outstanding | Overlay cleared; result refused `STALE_OVERRIDE`/`STALE_SCENE`, not a failure |

## 5. Automatic layout overlay (E3 option B)

### 5.1 Why the journal is not the home, and what already is

E3-A records layout updates as ignored because in attached-project mode the only message-anchored, non-persistent state is the expressions journal, which holds exactly one kind of decision (an expression at an exact source) and binds it to the global outfit. Background and presence are forward-scoped (state contract section 5), need lock precedence and dependent-suffix invalidation, and must compose under the expressions. The reducer provides all of that for origin `automatic`, and `applyProposal` already applies a validated proposal atomically with `LOCKED` skips; the M2.2 mirror scene is already a reducer scene over the journal's fingerprinted sources. The proposed home is therefore that mirror, retained across requests instead of rebuilt per request, as a memory-only **director overlay scene**.

### 5.2 Proposed module and composition

| Piece | Proposal | Persistence |
| --- | --- | --- |
| `src/director-overlay.mjs` (new, pure) | Owns one reducer scene per attachment: `rebase(layout, sources, revisions)` creates the scene with the journal's sources, replays the project layout as manual commands anchored at the first source (so the base applies at every message), then reinstalls the current selection through `reconcileScene` with the overlay's own selection revision; `apply(proposal, token, evidence)` calls the merged `applyProposal`; `project(sourceKey)` returns `projectScene(scene, sourceKey).projection`; `reconcile(sources, revisions)` forwards history and catalog changes to `reconcileScene`, which invalidates automatic commands at or after the first changed source; `clear()` discards every automatic command by rebasing. | None. Memory only, per attachment |
| `src/director-session.mjs` | `mirrorScene` becomes the overlay's rebase; `routeProposal` routes `setLocation` and `setCharacter.present` to `applyProposal` on the overlay, keeps `setCharacter.outfitId` as `NO_AUTOMATIC_LAYOUT` (section 5.3) and `setCharacter.expressionId` on the journal path, and suggestions as text | None |
| `src/director-controller.mjs` | Captures the overlay's revision and override revision in the proposal token (already fields of `proposalToken`); settlement compares the overlay instead of a rebuilt mirror (section 4.4 check 4) | None |
| `src/project-scene.mjs` | `get()` composes: global scene → overlay projection at the selected source (background, presence) → expressions overlay (cast expressions). `globalState()`, `save`, export, bundles, `dirty`, `edit` and the plugin are untouched. Every manual `dispatch` into the global scene calls `overlay.clear()` after `apply` (section 5.4) | None |
| `src/project-expressions.mjs` | Unchanged: it keeps reading the global scene for outfit compatibility and revisions | None |
| `src/stage-view.mjs` | The Scene panel's background and presence read-outs show “(director)” when the displayed value comes from the overlay, as expressions do today; notices name applied layout changes (“Director moved the scene to Harbor. Not saved.”) | None |

The director's request input and the validator already see the overlay's view through the mirror, so a proposal is validated against what is on stage, including automatic changes from earlier messages, which is the “previous scene” the contract's section 6 names.

### 5.3 Scope: background and presence; outfit and slot excluded

| Field | In the overlay? | Reason |
| --- | --- | --- |
| Background (`setLocation`) | Yes, forward from the anchored message until a later automatic change, a manual change (clears the overlay) or invalidation | Contract section 5 default scope; reducer `setBackground` with `LOCKED` on a locked background |
| Presence (`setCharacter.present`) | Yes, forward-scoped the same way | Reducer `setPresence`; `LOCKED` on a locked presence; Gate B's presence and mentions categories need it |
| Outfit (`setCharacter.outfitId`) | **No**, stays `NO_AUTOMATIC_LAYOUT` | Temporary expressions are bound to the actor's global outfit reference and the journal's `compatible()` reads the global scene. An automatic outfit at message *m* would make every imported expression incompatible at *m* without the journal knowing. Taking outfit needs a per-message compatibility rule in the journal, which is its own slice (F7 alternative) |
| Slot | Never automatic | Contract: chat-level layout preference, manual only; `translate` in M2.1 never emits `setSlot` |

### 5.4 Manual precedence and locks

1. **Locks** are replayed into the overlay base from the global layout; `applyProposal` skips a locked field as `LOCKED` and records it, never refusing the whole proposal (D4). A lock set after an automatic change takes effect through rule 2.
2. **Any manual layout command** into the global scene (background, presence, outfit, slot, lock, release, import that applies art, actor registration) **clears the whole overlay** and rebases it on the new global layout. The user's deliberate global choice is then exactly what is shown, with no automatic residue to reason about; the director's later proposals build on it from the next message. The finer alternative, rebasing while keeping automatic decisions on untouched fields, is recorded in F8; it is more code and harder to explain in the panel.
3. **Manual expressions** are unaffected: the journal keeps its own precedence (T50), and an automatic presence change does not touch expression decisions (an absent actor is simply not drawn).
4. A manual change while a request is outstanding makes the result stale (`STALE_OVERRIDE` through the token's `expectedOverrideRevision`, or the overlay comparison), not a failure.

### 5.5 Invalidation

Same triggers as the journal, through `reconcileScene` and the attachment lifetime: the first changed ordered source invalidates automatic commands anchored at or after it (edit, swipe, regenerate, continue, delete, insert, reorder); catalog changes advance the overlay's catalog revision and refresh references, so removed art shows as missing with the neutral fallback; detach, disable, project replacement, chat switch (including A → B → A), reload and disposal discard the overlay. Invalidated automatic layout is not retried.

### 5.6 Evidence and ordering

The overlay changes what the renderer draws, so under the M2 evidence standard it needs the browser suite and the full native-host campaign, not Node alone. It also changes T49's required outcome (layout applied in the overlay, `globalState()` still unchanged). That is why section 6 makes it the third PR, authorized on its own after the queue PRs have their records.

### 5.7 Take it in M2.3 or defer to M2.4

| For M2.3 (third PR) | For deferring to M2.4 |
| --- | --- |
| Gate B's travel, presence and mentions categories stay fixture-only until automatic background and presence exist; M2.4 is the Gate B candidate and should evaluate the director that will be judged | The owner may want Gate B's first real session to judge expressions-only direction before the stage moves on its own; a more visible director is a riskier first impression |
| The reducer, `applyProposal`, the mirror and the lock rules are merged and tested; the new module is composition, not new semantics | Renderer and panel changes bring the full campaign and the DYL-193 device replay question into the slice |
| Queueing and the overlay share the stale-result path; designing them apart would reopen section 4.4 later | Three PRs is a larger authorization than M2.1 or M2.2 |

Recommendation: plan it here, build it third, authorize it separately (F9). The owner can stop after the queue PRs with a coherent M2.3.

## 6. Proposed changes, as three sequential PRs

| PR | Files | Nature | Evidence standard |
| --- | --- | --- | --- |
| **A. Pending target and stale rules** | `src/director-controller.mjs` (pending target, gates except the composer hold, `SUPERSEDED`, re-check on observe and settlement); `tests/m2-director-controller.test.mjs` (race matrix); `docs/M2_3_DIRECTOR_IMPLEMENTATION.md` | Pure module: no adapter, persistence, composer or renderer change | Focused Node tests plus the record (process ruling). Browser and storage suites NOT_RUN with reason |
| **B. Composer hold** | `src/host-adapter.mjs` (`inspectComposer`, two listeners, released on dispose); `index.js` (wires the signal into the runtime); `src/director-controller.mjs` (hold gate, hold timer); `src/stage-view.mjs` (help-text sentence of section 3.3); browser and native tests | Adapter touch, read-only | Full native-host campaign, browser actual-entry suite, `check-discovery.py` counts; tablet replay of the unchanged controls NOT_TESTED unless the device is available |
| **C. Automatic layout overlay** | `src/director-overlay.mjs` (new), `src/director-session.mjs`, `src/director-controller.mjs`, `src/project-scene.mjs`, `src/stage-view.mjs`; Node, browser and native tests | Renderer composition; no persistence change | Full native-host campaign and browser suite; T49 amended; storage suite NOT_RUN with reason unless a plugin file changes |

No dependency is added. `src/scene-reducer.mjs`, `src/director-proposal.mjs`, `src/director-request.mjs`, `src/project-expressions.mjs`, `src/reader-source-model.mjs`, the storage plugin and the project schema are unchanged in every PR. Nothing is persisted beyond the existing `extensionSettings.sillynovel.director` keys. Each PR has its own implementation record, frozen SHA and dated entries; a later PR starts only after the owner reviews the previous one.

## 7. Test plan

No real provider at any level; expected outcomes frozen before implementation.

| Level | Harness | Cases |
| --- | --- | --- |
| Node controller (`tests/m2-director-controller.test.mjs`, extended) | Fake timers, fake adapter, synthetic reader observations as today | Every row of section 4.6; the gate order of section 3.2 (a target waits on the first failing gate and fires when it clears); `SUPERSEDED` counting; ledger dedupe on return; pending cleared by pause, ceiling, disable, detach; no retroactive request on enable or reopen; composer `present: false` disables the hold with one notice; the existing 25 cases with T42 and E10 expectations updated |
| Node overlay (`tests/m2-director-overlay.test.mjs`, new, PR C) | Pure module over fixtures | Base replay at the first source; forward scope of background and presence across messages; `LOCKED` skip and record; outfit still `NO_AUTOMATIC_LAYOUT`; manual command clears and rebases; prefix change invalidates from the first changed source; catalog removal shows missing; `globalState()` byte-identical before and after; composition order with a manual expression |
| Loopback (existing director loopback cases, extended) | `tests/fixtures/m2-director-endpoint.mjs` with a held-response mode | Held request then Send → `SUPERSEDED` on the wire; held request then a second completion → one later request; abandonment then late reply then pending target fires |
| Browser actual-entry (`tests/m1-reader-browser.test.mjs`, extended; PR B and C) | Headless Chromium, synthetic host fixture, real entry | Typing in `#send_textarea` defers a request; a non-empty draft defers; clearing the draft releases without a keystroke; the recorded `generateRawData` bodies never contain the draft; the composer is byte-identical afterwards (existing preservation cases); overlay “(director)” read-outs and notices; keyboard operation of unchanged controls |
| Native host (`tests/probes/m2-director/host.mjs`, extended; PR B and C) | Disposable pristine pinned 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, loopback endpoint, decoy persona, lorebook and cards seeded | Send while a request is held → the request result is `SUPERSEDED`, the user's message is kept, the reply completes on the concurrent loopback; typing a draft after a reply → no director request until the draft is sent and the next reply settles; the synthetic rejecting single-slot backend with typing → no overlap, the user's reply succeeds; regenerate during a held request → E16 outcome recorded, not asserted away; four-card group with the streaming gate; A → B → A with a held request; overlay: location and presence applied on real host generation, saved layout and all non-chat files byte-identical, manual background edit clears the overlay, a locked presence is skipped |

The 20-turn Last Lantern script runs again in PR B and PR C with the director on, asserting no director text in the chat, every non-chat file byte-identical, and the saved layout unchanged.

## 8. Owner decisions needed before M2.3 implementation

None of these is answered by the current documents. Each needs an owner statement recorded in [DECISIONS](DECISIONS.md); proposed defaults are recommendations, not rulings. IDs continue as F1–F10 after the M2.2 plan's E1–E16.

| ID | Decision | Proposed default | Why it matters now |
| --- | --- | --- | --- |
| F1 | Authorize M2.3 as the three sequential PRs of section 6, each with its own record and the owner's review before the next starts | Authorize A and B; rule on C under F9 | Nothing starts without it. A alone is pure-module and cheap; B is the first adapter touch since M2.2 |
| F2 | Queue model: a pending target of depth one (latest completed head waits; superseded heads never requested; catch-up only on returning to the head), replacing E10's skip-and-count | Accept | Keeps the contract's “never against the wrong predecessor scene”; spends the ceiling only on the message the user is at. Alternative: a FIFO of up to three skipped heads requested oldest first, which spends more and directs messages the user has left |
| F3 | Composer hold: defer while a keystroke was within about 5 s **or** the composer is non-empty; adapter reads only the draft's length and input events on `#send_textarea`, never its text; missing element disables the hold only | Accept | The only pre-Send signal the host offers. Alternatives: keystroke hold only (an idle draft then does not defer); no hold (E16 stands unchanged). Numbers 5 s and the existing 2 s settle are the proposal's; the owner may set others |
| F4 | Send while a request is outstanding: result discarded as stale before it is read, outcome `SUPERSEDED`, not a failure, counted toward the ceiling, never re-anchored; E16's help sentence replaced by section 3.3's wording | Accept | The stamp already makes it stale; naming it keeps the failure counter honest. Alternative: do not count it toward the ceiling (it was the user's action), which lets rapid sends spend unbounded requests inside one session |
| F5 | Explicit streaming gate: no request while the reader reports any generation in progress, including other extensions' `quiet` and `impersonate`; a pending target waits through it | Accept | Makes the implicit rule testable; `quiet` generations occupy the same backend |
| F6 | Recovery: keep E7 (90 s abandonment counts one failure, slot released only on settlement, pause after three consecutive, toggle resumes); a pending target fires after settlement; no automatic resume | Accept | O06's one-in-flight rule stays literal. Alternative: release the logical slot when a native reply completes after an abandonment (the backend provably serves again), which can put two requests on a single-slot backend; or automatic resume after N native completions, which spends the ceiling on a failing backend |
| F7 | Overlay scope: background and presence only; outfit stays `NO_AUTOMATIC_LAYOUT`; slot never | Accept | Outfit needs a per-message compatibility rule in the expressions journal. Alternative: include outfit and change the journal's `compatible()` to the composed view, one more module in PR C |
| F8 | Overlay precedence: locks skip as `LOCKED`; any manual layout command clears and rebases the whole overlay; manual expressions unaffected | Accept | Simplest rule that keeps “manual outranks automation” visibly true in the panel. Alternative: rebase keeping automatic decisions on fields the manual command did not touch |
| F9 | Build the overlay as M2.3's third PR, or defer it to M2.4 | Third PR of M2.3, authorized after A and B have their records | Gate B needs it before real-chat evaluation; separate authorization keeps the owner's stop point (section 5.7) |
| F10 | Adopt the TESTING rows of section 9 and amend T42, T46 and T49 as stated there when the corresponding PR merges | Accept | Rows are not added to [TESTING](TESTING.md) until this plan is approved |

Already settled and not reopened here: E1–E16 except as amended above; O04, O06, D7; manual locks outrank automation; model output is untrusted; no canonical writes; explicit project attachment; PNG-only assets; the v1 operation set and evidence window.

## 9. Proposed TESTING rows

IDs continue from T50 and are not added to [TESTING](TESTING.md) until the owner approves this plan.

| ID | Scenario | Required outcome | First stage |
| --- | --- | --- | --- |
| T51 | Reply completes while a native generation runs or starts (next group member, another extension's `quiet`, user Send within the settle interval) | No director request while the reader reports a generation in progress; the pending target waits or is superseded; nothing counted for a superseded head | M2.3-A |
| T52 | Reply completes; the user types, holds a draft, or clears it | No request within 5 s of a keystroke or while the draft is non-empty; clearing the draft releases the hold; the draft text never appears in any request input or wire body; the composer is byte-identical afterwards | M2.3-B |
| T53 | User presses Send while a director request is outstanding (T46 amended) | Result discarded as stale before it is read, outcome `SUPERSEDED`, not a failure, counted; the user's message kept; on the concurrent loopback the reply completes; the rejecting single-slot backend case with typing shows no overlap | M2.3-A, host in B |
| T54 | Reply completes while reading earlier; a newer reply may complete; the user returns to latest (T42 and E10 amended) | At most one target waits, the newest; one request on return; a second return issues nothing; enable or reopen issues nothing retroactively | M2.3-A |
| T55 | Request abandoned at 90 s, then settles, with a target pending | One failure at abandonment; late result discarded; the pending target fires once after settlement; three abandonments pause | M2.3-A |
| T56 | Accepted proposal with location and presence updates in attached mode (T49 amended) | Applied to the memory-only overlay forward from the anchored message; outfit still `NO_AUTOMATIC_LAYOUT`; locked field skipped `LOCKED`; `globalState()`, saved project, bundles and all non-chat files unchanged; project not dirty | M2.3-C |
| T57 | Manual layout edit, lock, prefix change, detach, chat switch, A → B → A or reload after automatic layout applied | Manual edit clears and rebases the overlay; a lock keeps its field; prefix change invalidates from the first changed source; the rest discard the overlay; no overlay state from a first visit shows in a second | M2.3-C |

Amended on merge of the corresponding PR: T42 (“counted, not queued” → “at most one waits”), T46 (E16 narrowed to flows without typing), T49 (layout applied in the overlay). T18 remains uncovered until Gate B.

## 10. Exclusions, risks and limits

Excluded: a FIFO of skipped heads; automatic outfit and slot; automatic resume; a Resume or Retry control and any evidence UI (M2.4); persistence of tickets, counters, the pending target or the overlay; a director connection profile; structured outputs; Linear changes; Gate B; image work.

Recorded limits, not solved here:

| Limit | Status |
| --- | --- |
| Regenerate, Continue, swipes, slash commands and quick replies give no pre-Send signal; a rejecting single-slot backend can still fail that reply inside an outstanding director request | E16 stands for these flows; Gate B question |
| An outstanding raw request cannot be ended by the extension; a hung backend holds the slot until the host settles it | E7, unchanged |
| Another extension's `quiet` generation after a reply leaves the head unresolved for expressions and the director | Existing reader rule from M1; not changed |
| Other extensions can rewrite or abort the raw prompt through host events | M2.2 limit, unchanged |
| The composer selector `#send_textarea` is a host DOM fact verified on the pinned 1.19.0 build only | Capability-probed; a missing element disables only the hold |
| The overlay is shown only while attached; reload or a chat switch drops it, like temporary expressions | By design; persistence of automatic visuals is a later, separately decided slice |
| Real providers, text-completion backends and queueing single-slot backends | NOT_TESTED, as in M2.2 |

## 11. Handoff

This document could not settle F2, F3, F7 and F9 from the existing documents; the rest of section 8 is bounded implementation proposals with stated rationale. Everything in section 2 is inspection of the merged code at `f570484dc9975ab543d4b116a198c9ba21dcd6ec`; no host was run and no runtime or test file changes in this PR. Plan content frozen at `9acb201` (rebased from `6fc22b10bf6bebd6d852f797cc6551be0be807de`); the final pushed head is named in the PR description and in the shared hand-over note, and the branch carries documentation only.

Recommended next bounded step: owner review of this plan and a recorded statement on F1–F10. If F1 is approved, PR A is one focused branch owning `src/director-controller.mjs`, its Node tests and `docs/M2_3_DIRECTOR_IMPLEMENTATION.md`, with dated entries in STATUS, ROADMAP, TESTING and DECISIONS; PR B and PR C follow only after the owner's review of the previous one. This document starts nothing.
