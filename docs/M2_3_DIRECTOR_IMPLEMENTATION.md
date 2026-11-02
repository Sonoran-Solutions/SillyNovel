# M2.3 director queueing — implementation record

**PR C candidate — 2026-11-02.** The [PR C record](#pr-c--automatic-layout-overlay) is the last section below. It is a draft PR, unmerged and unreviewed. The entries that follow are older.

**Candidate for owner review, draft PR, unmerged.** Implements PR A of the [M2.3 plan](M2_3_DIRECTOR_QUEUEING_PLAN.md) under [rulings F1–F10](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02). Tracked by [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold). PR B follows only after the owner reviews this one; PR C is not authorized (F9). Gate B remains **NOT_RUN**.

**PR B merged — 2026-11-02.** The owner [accepted and merged](DECISIONS.md#owner-acceptance--m23-pr-b-merged--2026-11-02) PR B at `4561888`; its record is the last section below, [PR B — composer hold](#pr-b--composer-hold), and its choices stand as the reversible baseline. T46 is amended in TESTING. PRs A and B complete the authorized M2.3 work; PR C waits on F9.

**Post-merge update — 2026-11-02.** The owner [accepted and merged](DECISIONS.md#owner-acceptance--m23-pr-a-merged--2026-11-02) PR A at `89d5abd`; the choices below stand as the reversible baseline, and T42 is amended in TESTING. PR B starts only on the owner's go-ahead. The rest of this section is the historical candidate record.

## PR A — pending target and stale rules

**Date:** 2026-11-02, America/Phoenix. **Starting main:** `c5d3f50217a8124bbb70170e48acd162ac50e66d` (PR #49 merge). **Frozen implementation/test SHA:** `be6a42221fab60119256dcc4c6454e671cb4f57e`. Later commits on the branch are documentation only.

### What changed

| File | Change |
| --- | --- |
| `src/director-controller.mjs` | `armed` and the skip counter replaced by one `pending` target; `gates()` evaluates the wait and drop rules; `wake()` re-checks on every `observe()`, on settle expiry, after the controller's own settlement and on `runtime.onRelease`; `superseded()` names the F4 outcome; `skipped` and its two notices removed |
| `tests/m2-director-controller.test.mjs` | 17 new cases (race matrix, T51, T53 controller half, T54, T55, two loopback); 4 amended, each with a one-line reason in the test |

No other runtime file changed. No dependency, persistence or schema change. The director still moves expressions only.

### Rulings and where each is honoured

| Ruling | Implementation | Test |
| --- | --- | --- |
| F2 | `pending` is one object; a completion calls `dropPending()` before creating the next, so a superseded head is never requested and spends nothing. It waits on selection and on the slot; returning to the head fires it once, and the ledger stops a repeat | `T54` cases, `T42`, `race: two completions…` |
| F4 | `settle()` decides staleness first. If stale and `superseded()` holds, the notice is “Director request superseded by your reply”; `consecutive` is untouched, `count` stands, nothing is re-anchored | `T53` cases, `stale result dropped after continue start` |
| F5 | `gates()` returns “wait” on `generation.status === 'streaming'` before the identity check. The target is then replaced by that generation's completion, or dropped once it ends without one | `T51/F5`, `race: quiet…`, `race: four-member…` |
| F6 | Abandonment logic unchanged except that a pause clears the target. The slot is released only by `runtime.send` settling. `firing` spans settlement, so a target fires only after the earlier result is handled. No automatic resume | `T55`, `race: a pause…`, `90 s abandonment…`, loopback abandonment |

F1 is this slice's scope. F3 is PR B. F7 and F8 belong to PR C. F9 leaves PR C unauthorized. F10's rows T51, T53, T54 and T55 are in [TESTING](TESTING.md).

### Race matrix (plan section 4.6)

| Row | Status |
| --- | --- |
| A1, A2 within 2 s; A1 outstanding then A2; Send while outstanding; return to latest; newer reply while reading earlier; `quiet` before settle; four-member group; A → B → A with a target pending; A → B → A with a request outstanding; abandonment with a target pending; three failures with a target pending; ceiling with a target pending | Node, new or amended |
| Manual expression at the head while outstanding | Node, existing T50 cases, unchanged |
| The two composer rows | PR B |
| Manual layout edit while outstanding | Existing `manual layout` stale case covers refusal and no failure; the overlay half is PR C |

Two rows resolve differently from how they read in the plan, because a completion always starts a new generation first:

- **“A1's result applies if still current.”** A completion during a request changes the generation id, so A1's result is never current in that race and ends `SUPERSEDED`. The test asserts this, and that A2's own result applies.
- **“Three consecutive failures with a target pending.”** For the same reason, a late failure cannot be counted while a target is pending, since stale wins. Only an abandonment can raise the third failure in that state, so the test uses one.

### Commands and results

Run on frozen `be6a422`, Node 26.8.1, no host and no real provider. The file list is the runner's own, from `python3 tests/probes/dyl60/run.py --list-tests`.

```sh
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/m1-project-expressions.test.mjs tests/m2-director-proposal.test.mjs tests/m2-director-request.test.mjs tests/m2-director-controller.test.mjs tests/probes/dyl19/owned-chat-probe.test.mjs tests/probes/dyl19/source-anchor.test.mjs
python3 tests/probes/dyl60/check-discovery.py
```

| Check | Result |
| --- | --- |
| Node, 11 files | 244/244, 0 fail, 0 skipped, 0 cancelled, about 3 s; 17 more than M2.2's 227 |
| `tests/m2-director-controller.test.mjs` alone | 54/54, three consecutive runs before freezing |
| `check-discovery.py` | PASS: 11/5/1 files; unexpected, empty and missing suites refused |

`node --test tests/` was not used: it would also collect the browser suite, which needs a pinned host and Playwright.

### NOT_RUN

| Surface | Status and reason |
| --- | --- |
| Browser actual-entry suite | **NOT_RUN.** Pure-module slice under the [M2 evidence standard](TESTING.md#m2-evidence-standard--2026-11-01); PR B runs it |
| Storage suite | **NOT_RUN.** Plugin unchanged |
| Native-host campaigns | **NOT_RUN.** Adapter, persistence, composer and renderer untouched; PR B runs them. T53's host half is therefore open |
| Catch-up through the real stage view | **NOT_RUN.** Node drives `model.sync` directly; `src/stage-view.mjs:291` is the path on a real reader change, read but not exercised |
| Tablet, real providers, real single-slot backends | **NOT_TESTED**, as in M2.2 |
| Gate B, usefulness, accuracy | **NOT_RUN**, owner-gated |

**Known consequence for PR B.** `tests/probes/m2-director/host.mjs:305` asserts the removed “not directed while a request is outstanding” notice, and line 203 lists “not directed” among its alternatives. Line 305 will fail until amended. The plan places that file in PR B, and it could not be verified here, so it is unchanged. The retained M2.2 campaign stays evidence for `d566411` only and is not reused for this change.

### Implementation choices for owner review

Not settled by the documents; each is reversible and none is an owner ruling.

| Choice | Rationale |
| --- | --- |
| The streaming gate is evaluated before the identity check, although plan section 3.2 lists identity first. | A started generation always has a new id, so identity-first would drop the target on every start and F5's “waits through it” could not hold. Either order issues nothing for that target; the difference is that a target is only dropped when the generation ends. |
| Pause and disable are checked first; ledger next; then selection and slot; host, then ceiling. Plan section 3.2 lists pause and ceiling last. | A paused director must not show “1 reply waiting”, and section 4.5 says a pause clears the target. The ceiling must stay after the slot, or the last permitted result would be discarded by the pause, against E7. |
| Host offline and missing capability drop the target only when the wait gates have passed. | Follows section 3.2's order. While reading earlier, the user sees the waiting notice first and the idle notice on return. |
| Quiet and impersonate generations during a request end as “cancelled”, not `SUPERSEDED`. Other reply types, including the next group member's, are `SUPERSEDED`. | Plan section 4.4 says “because a user generation started”; a quiet generation is not the user's reply. Counting is identical. The notice's “your reply” is loose for a group's next member; the reader offers no way to tell them apart. |
| Send then Stop: the result's `ABORTED` code is not read; the outcome is `SUPERSEDED`. | Plan section 4.4's order: staleness precedes reading the result. Neither outcome is a failure. |
| `SUPERSEDED` is expressed as the notice, not a new `status()` field. | Failure codes reach the user the same way, and nothing consumes a separate field. |
| A slot-busy wait has no notice of its own. | Section 4.2 names none, and the outstanding request's notice is already showing. |
| A pending target survives a failed `expressions.sync()`; the next `observe()` re-checks it. M2.2 dropped it. | That sync can fail only because a newer sync overtook it, or because the head is unresolved. Dropping would lose a good target to a transient. An unresolved head is bounded: its target is dropped when the generation changes. |
| A waiting notice is cleared when its target is dropped. If a newer reply replaces the target, the notice can disappear for the 2 s settle interval, then return. | The notice must never name a reply that no longer waits. |
| `runtime.onRelease` is new internal runtime surface. | After a chat switch the releasing request belongs to a disposed controller, so the slot's release must reach the new one. |

### Limits

Until PR B, nothing defers a request while the user types, so E16 stands unchanged and the toggle's help text is unchanged. T42 stays as written until this PR merges, per F10 and plan section 9; its wording then becomes “at most one waits”. T46 is amended with PR B and T49 with PR C.

### Next bounded step

Owner review of this draft PR and the choices above. PR B starts only after that review. This document starts nothing.

## PR B — composer hold

**Candidate for owner review, draft PR, unmerged.** Implements PR B of the [M2.3 plan](M2_3_DIRECTOR_QUEUEING_PLAN.md) under [F3 and F4](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02), tracked by [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold). Nothing here is approved or merged. PR C is not authorized (F9). Gate B remains **NOT_RUN**.

**Date:** 2026-11-02, America/Phoenix. **Starting main:** `972f91c4bbc6cc3a42206426b6b750149b7b51c9` (PR #51, the owner's PR A acceptance; `docs/DECISIONS.md` begins with “Owner acceptance — M2.3 PR A merged — 2026-11-02”). **Frozen implementation/test SHA:** `02a3a966b79a4a3db909fa86281707bcf5927032`. Every later commit on the branch is documentation or evidence only; the final pushed head is named in the PR description.

### What changed

| File | Change |
| --- | --- |
| `src/host-adapter.mjs` | New read-only `inspectComposer()` returning `{ present, draft, idleMs }` from `document.getElementById('send_textarea')`: only `value.length` is read; `idleMs` is the time since the last `input`/`keydown` the adapter saw on that element since `subscribe`, `null` when none. `subscribe` registers the two listeners (capture, on `document`, filtered by the target's id) and its disposer releases them, also on a failed registration. `createHostAdapter` takes an optional `{ onComposerInput }` that is called with no argument |
| `index.js` | Passes `adapter.inspectComposer` to the director runtime and `onComposerInput` to the adapter, so a composer event wakes the runtime |
| `src/director-controller.mjs` | `HOLD_MS` (5000); the hold gate in `gates()` between the ledger and the selection gate; a hold timer; the notice “Director waiting while you type”; the one-time missing-element note; `runtime.composer()`, `runtime.composerInput()` and `runtime.firstTime()`; a wake that arrives during an evaluation is re-run when it ends |
| `src/stage-view.mjs` | The E16 help sentence replaced by plan section 3.3's wording |
| `tests/m2-director-controller.test.mjs` | 7 new cases (54 → 61 in the file): hold and extension, idle draft, Send while held, gate order, missing element, adapter signal and privacy, wake during an evaluation |
| `tests/m1-reader-browser.test.mjs` | 4 new cases (real clock, five-second hold); one assertion amended to the new help text |
| `tests/probes/m2-director/host.mjs` | Amended to PR A's behaviour (below) and three new native blocks for T52 and T53's host half |

No change to `src/director-request.mjs`, `src/director-proposal.mjs`, `src/scene-reducer.mjs`, `src/project-expressions.mjs`, `src/reader-source-model.mjs`, the storage plugin or the project schema. No dependency, persistence or schema change; nothing is stored beyond the existing `extensionSettings.sillynovel.director` keys. The director still moves expressions only. The adapter never reads `value` beyond `.length`, retains no text, and the only thing that crosses to the controller is `{ present, draft, idleMs }`; the controller's request input type has no field for a draft.

### Rulings and where each is honoured

| Ruling | Implementation | Test |
| --- | --- | --- |
| F3: defer while a keystroke was within about 5 s **or** the composer is non-empty; length and input events only; a missing element disables only the hold | `holdMs()`: a draft holds (re-checked every `HOLD_MS`); otherwise `HOLD_MS − idleMs`. `present: false` returns 0 and queues the note | Node `T52` cases; browser hold cases; native `T52` blocks |
| F3: re-checked on observe and on composer input | `wake()` runs from `observe()`, from the hold timer and from `runtime.composerInput()` (the adapter's listener) | Node “a keystroke inside the hold…”, “an idle draft…” |
| F4: Send during a request; `SUPERSEDED`; E16 sentence replaced | Controller behaviour is PR A's. The sentence is replaced in `directorHelp` | Native Send block now asserts the `SUPERSEDED` notice, the count and no retry; browser help assertion |
| F5/F6 (PR A) interplay | The streaming gate precedes the hold and clears the hold timer and notice, so a Send never leaves “waiting while you type” behind; a request outstanding keeps its own notice because the target is not evaluated until settlement | Node “Send while held…”, “while a request is outstanding nothing is held…” |

### Amendments to `tests/probes/m2-director/host.mjs`

| Line (before) | Was | Now |
| --- | --- | --- |
| 203 | `untilStatus(/cancelled\|not directed\|in progress/)` after Send while outstanding | Waits for the `SUPERSEDED` notice in a notice history, asserts nothing applied, one later request for the new reply (two keys), the count up by exactly one, and no `skipped` or `paused` notice |
| 305 | “not directed while a request is outstanding” | “still outstanding”, then after release exactly one more request for the pending head (T55) |
| Stop after Send (not named in the task) | `Director request cancelled.` | `SUPERSEDED`: PR A's recorded choice is that a Send before the Stop makes the result superseded and the `ABORTED` code is never read. The wire still shows the director request aborted |

New native blocks: a draft kept through a regenerate holds the head past settle and past five idle seconds, the composer is byte-identical, Send supersedes the held head (never requested) and the reply to the sent draft is requested once; a draft cleared by the user releases the hold 5.0 s after the clearing event and the request body carries none of the never-sent draft, with every non-chat native file byte-identical; and the synthetic rejecting single-slot backend with the user typing shows no overlap, the user's reply succeeds with no host error toast and the next reply is requested.

### Commands and results

Frozen `02a3a96`, Node 26.8.1, Playwright 1.62.1, Chromium 151.0.7922.34, pinned SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9` on a disposable copy under the session scratchpad (clean at the pin, hashes in [pins.json](evidence/m2-3-b/campaign/pins.json)), loopback endpoint only, host user data isolated in per-run temporary roots that were removed afterwards, no real provider. One run, deadline 2700 s, output to per-step log files.

```sh
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
python3 tests/probes/dyl60/check-discovery.py
SILLYTAVERN_ROOT=/path/to/pinned SN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs timeout -k 15 2700 python3 tests/probes/dyl60/run.py /new/evidence/dir
python3 tests/probes/dyl60/validate.py docs/evidence/m2-3-b/campaign
```

| Suite | Result | Elapsed |
| --- | --- | --- |
| `check-discovery.py` | PASS: 11/5/1 files, unexpected, empty and missing suites refused | Under 1 s |
| Node (11 files) | 251/251; 7 more than PR A's 244 | 4 s |
| Storage (5 files) | 126/126; plugin unchanged, run because the runner runs it | 133 s |
| Browser, actual entry | 92/92; 4 new | 74 s |
| stage-library-migration | PASS, 24 checkpoints | 102 s |
| expressions | PASS, 16 | 63 s |
| groups | PASS, 22 | 86 s |
| recovery | PASS, 17 | 58 s |
| cleanup | PASS, 21 | 81 s |
| native-integrity-branches | PASS, 18 | 85 s |
| **director (amended)** | PASS, 20 (17 in M2.2 plus the three new blocks; the same blocks otherwise) | 413 s |
| `validate.py` | PASS: 123 frozen inputs, 108 artifact hashes | |

Total 1099 s. `tests/m2-director-controller.test.mjs` alone passed 61/61 on three consecutive runs before freezing. Before the final run the director script was run three times on the pinned host while it was being amended: the first stopped at the Stop-after-Send expectation, the second at a test string reused between a sent and a never-sent draft (a test defect: a sent draft is chat text and correctly travels in the window), and the third passed; those two failures are test corrections, not product changes. Retained: [full package](evidence/m2-3-b/campaign/), [runs](evidence/m2-3-b/campaign/runs.json), [director checkpoints](evidence/m2-3-b/campaign/director/evidence.json) (hold released 5035 ms after the clearing event; 2 native requests served on the single-slot backend; abandonment observed at 89 999 ms).

Reproduce from the repository: `python3 tests/probes/dyl60/validate.py docs/evidence/m2-3-b/campaign`.

### NOT_RUN and NOT_TESTED

| Surface | Status and reason |
| --- | --- |
| Tablet replay of the unchanged controls | **NOT_TESTED.** No paired device was used or checked for availability; no device in use was taken over |
| Composer behaviour on touch, soft keyboards and IME beyond Chromium's synthetic typing | **NOT_TESTED.** `input` and `keydown` were exercised in headless Chromium only |
| A composer cleared by the host without an `input` event, on the real host | **NOT_RUN.** On the real host Send clears it, but the pending target is dropped by the new generation first. Node covers the periodic re-check |
| Regenerate, Continue or a swipe pressed during an outstanding request on the rejecting single-slot backend (the E16 residual) | **NOT_RUN.** The hold cannot see these; E16 stays recorded with the narrowed wording |
| Real providers, text-completion backends, queueing single-slot backends, other host versions | **NOT_TESTED**, as in M2.2 |
| Gate B, usefulness, accuracy | **NOT_RUN**, owner-gated |

### Implementation choices for owner review

Not settled by the documents; each is reversible and none is an owner ruling.

| Choice | Rationale |
| --- | --- |
| A cleared draft releases `HOLD_MS` after the clearing `input` event, not at once. | The clearing is itself an observed event, so it restarts the idle time. Plan section 3.2.1 reads “releases the hold without a keystroke timer”, which I took to mean no timer while the draft is idle. Releasing at once on a clear would be a one-line change if the owner prefers it |
| A non-empty draft is re-checked every `HOLD_MS`, not only on `input`. | The host clears the composer on Send without an event; without a poll a draft cleared programmatically would hold until the next reader change. The poll runs only while a target is held |
| The adapter wakes the runtime through an `onComposerInput` option, not as an observation through the shell, reader and stage. | Plan section 3.2.1 says the adapter “calls the same observation path”. The reader model ignores a composer event and the stage would re-render on every keystroke; the direct call keeps four files untouched. The wake carries no argument |
| Listeners are on `document` in the capture phase, filtered by the target's id. | A re-rendered or late-appearing composer is still seen; nothing but the id is read from the event. Any `keydown` counts, including modifier keys |
| The missing-element note is prefixed to the next “Director request in progress” notice, once per page, instead of being said at once. | A notice said at once is replaced within milliseconds by the request notice and would never be read |
| The hold is evaluated only when a target is evaluated, which `firing` serializes behind an outstanding request. While a request is outstanding the panel keeps its own notice and nothing is held; the hold applies after settlement. | Section 4.2 gives the slot gate no notice of its own (PR A). The first evaluation after settlement shows the typing notice |
| A wake that arrives during an evaluation sets `again` and re-runs when the evaluation ends. | Without it a hold timer or a composer event that fires while the evaluation is awaiting its sync is lost. Found by a Node test |
| The typing notice restores the notice it replaced when the hold ends or a Send starts a generation. | Otherwise the panel could be left blank or name a reply that no longer waits |
| Every reply to a typed Send is directed no sooner than five seconds after the last keystroke. | It follows from the rule. A reply that streams for less than the remainder is delayed by the difference. The director campaign rose from 267 s (M2.2) to 413 s partly for this and partly for three new blocks |
| The Stop-after-Send expectation in `host.mjs` became `SUPERSEDED`. | It follows PR A's recorded choice; see the amendments table |

### Limits

The hold covers typing and an unsent draft. It cannot see Regenerate, Continue, swipes, slash commands or quick replies, so the E16 limitation stays recorded with narrowed wording: those flows can still fail a reply on a backend that handles one request at a time, inside an outstanding director request. The interval between the fire-time check and the host's fetch is sub-second and not addressable from an extension. T46 is amended per F10 only when this PR merges, and is unchanged in the matrix until then.

### Next bounded step

Owner review of this draft PR and the choices above, then a decision on PR C under F9 (a third PR in M2.3, or deferral to M2.4). This document starts nothing.

## PR C — automatic layout overlay

**Candidate for owner review, draft PR, unmerged.** Implements PR C of the [M2.3 plan](M2_3_DIRECTOR_QUEUEING_PLAN.md#5-automatic-layout-overlay-e3-option-b) under [F7 and F8](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02) and the owner's [PR C authorization](DECISIONS.md#owner-authorization--m23-pr-c-automatic-layout-overlay--2026-11-02), tracked by [DYL-203](https://linear.app/devils17/issue/DYL-203/sillynovel-m23-pr-c-automatic-layout-overlay-for-background-and). Nothing here is approved or merged. Gate B remains **NOT_RUN**; DYL-193 stays open.

**Date:** 2026-11-02, America/Phoenix. **Starting main:** `d4fc583ba508397f66f89cec3603495a49ed6c03` (PR #54; `docs/DECISIONS.md` begins with the PR C authorization). **Frozen implementation/test SHA:** `67c1aedd5214ad47902d0edfdb2948d356c4b45e`. Every later commit on the branch is documentation or evidence only; the final pushed head is named in the PR description.

### What changed

| File | Change |
| --- | --- |
| `src/director-overlay.mjs` (new, pure) | `createDirectorOverlay({ ownerKey, sessionEpoch })` owns one reducer scene: `rebase(layout, sources, { selectedSourceKey, assets })`, `reconcile(sources, { selectedSourceKey, assets })`, `apply(proposal, token, evidence)` through the merged `applyProposal`, `project(sourceKey)`, `clear()`, plus `active()`, `scene()` and `dispose()`. `composeLayout(view, projection)` overlays background and presence on a view |
| `src/director-session.mjs` | `mirrorScene` removed; its replay is the overlay's rebase. `routeProposal` returns a layout-only proposal for `setLocation` and `setCharacter.present`; outfit stays `NO_AUTOMATIC_LAYOUT`; expressions and suggestions as before |
| `src/director-controller.mjs` | Captures the overlay scene (revision and override revision in the token, otherwise as before); the request reports the overlay's background and presence; settlement compares that scene by identity; the layout applies before the first expression; notices name the changes; disable clears |
| `src/project-scene.mjs` | `get()` composes global → expressions → overlay at the selected source; every manual `dispatch`, actor registration and art import rebases the overlay after `apply`; catalog refreshes reconcile it; dispose discards it. `globalState()`, `save`, export, bundles, `dirty` and `edit` are unchanged |
| `src/stage-view.mjs` | “(director)” on the background and presence read-outs (selected-art line and cast line); the toggle's help sentence now names background and presence |
| `tests/m2-director-overlay.test.mjs` (new) | 12 pure cases |
| `tests/m2-director-controller.test.mjs` | 20 new or generated cases; the E3-A case amended (below); the fake client's upload returns a receipt |
| `tests/m1-reader-browser.test.mjs` | 1 new case; the fixture serves the new module, a free-layout project and, for that project only, the asset digest |
| `tests/probes/m2-director/host.mjs`, `tests/fixtures/m2-director-endpoint.mjs` | 10 new native blocks; the T49 assertion amended (below); the endpoint's `auto` reply takes `background` and `presence` |
| `tests/probes/dyl60/run.py`, `check-discovery.py` | The new suite file, 12/5/1; the director step's deadline raised from 600 s to 900 s, since the amended script takes about 470 s |

No change to `src/scene-reducer.mjs`, `src/director-proposal.mjs`, `src/director-request.mjs`, `src/project-expressions.mjs`, `src/reader-source-model.mjs`, the storage plugin or the project schema. No dependency. Nothing is persisted beyond the existing `extensionSettings.sillynovel.director` keys.

### Rulings and where each is honoured

| Ruling | Implementation | Test |
| --- | --- | --- |
| F7: background and presence only | `routeProposal`; `replay` carries no slot; `applyProposal` receives no outfit or expression | Node `F7 routing`, `T56: outfit…`; native T56 |
| F7: outfit `NO_AUTOMATIC_LAYOUT`, slot never automatic | `skip('outfit')`; composition takes `slot` from the global view | Same; `composition…` |
| F8: locked fields skip as `LOCKED` (D4) | Locks replayed into the base; `applyProposal` records them; the rest applies | Node `D4…`, `T56…LOCKED`; native T57 lock block |
| F8: any manual layout command clears and rebases | `clearOverlay()` after `apply` in `dispatch`, `register`, `importFile` | Node `T57/F8` six commands and registration/import; browser; native |
| F8: manual expressions unaffected | Expression commands return from `dispatch` before the overlay is touched | Node `T57/F8: manual expressions…` |
| Plan 5.5: invalidation | `reconcileScene` from the first changed source; a changed first source rebases | Node prefix cases; native real edit |
| Plan 5.5: discard | Overlay lives in the project model: detach, replacement, chat switch and reload dispose it; disable calls `clear()` | Node `T57` disable and A → B → A; native four blocks |
| Authorization: saved project and non-chat files byte-identical | `globalState` reads only the global `scene` variable, never the composed view | Node save case; browser save; native scene, revision, bundle bytes and full file inventory |

### Amended tests, each tied to a ruling

| Test | Was | Now |
| --- | --- | --- |
| Node `E3-A…` | Two layout changes “not applied”, location included | F7, F8: with every field locked the presence update skips as `LOCKED`. The location update is dropped from the case because it named the background already showing, which is now no change |
| `host.mjs` T49 block | “1 layout change not applied” | D4, F7: that project locks its background, so “1 kept your manual choice” |

### Commands and results

Frozen `67c1aed`, Node 26.8.1, Playwright 1.62.1, Chromium 151.0.7922.34, pinned SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9` on a disposable clone under the session scratchpad (clean at the pin, hashes in [pins.json](evidence/m2-3-c/campaign/pins.json)), loopback endpoint only, host user data isolated in per-run temporary roots that were removed afterwards, no real provider. One campaign, deadline 3000 s, output to per-step log files; no owned process remains.

```sh
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
python3 tests/probes/dyl60/check-discovery.py
SILLYTAVERN_ROOT=/path/to/pinned SN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs timeout -k 15 3000 python3 tests/probes/dyl60/run.py /new/evidence/dir
python3 tests/probes/dyl60/validate.py docs/evidence/m2-3-c/campaign
```

| Suite | Result | Elapsed |
| --- | --- | --- |
| `check-discovery.py` | PASS: 12/5/1 files; unexpected, empty and missing suites refused | Under 1 s |
| Node (12 files) | 283/283; 32 more than PR B's 251 | 5 s |
| Storage (5 files) | 126/126; plugin unchanged, run because the runner runs it | 158 s |
| Browser, actual entry | 93/93; 1 new | 80 s |
| stage-library-migration | PASS, 24 checkpoints | 102 s |
| expressions | PASS, 16 | 70 s |
| groups | PASS, 22 | 95 s |
| recovery | PASS, 17 | 56 s |
| cleanup | PASS, 21 | 82 s |
| native-integrity-branches | PASS, 18 | 83 s |
| **director (amended)** | PASS, 30 (20 in PR B plus 10 new) | 468 s |
| `validate.py` | PASS: 125 frozen inputs, 108 artifact hashes | |

Total 1198 s. Before freezing, the director script was run four times against the pinned host while its new blocks were written. One attempt never started (a duplicate identifier in the script). Two stopped at test defects: an assertion that forgot PR B's typing notice restores the previous notice, and a `fill` on an edit box the reader covers. The fourth passed, and no product code changed between those runs. The browser's first overlay run also corrected two test assumptions: the fixture omitted the asset digest, so art read as missing, and `isVisible` is false for sprites in that fixture, so the test reads the `hidden` attribute. Retained: [full package](evidence/m2-3-c/campaign/), [runs](evidence/m2-3-c/campaign/runs.json), [director checkpoints](evidence/m2-3-c/campaign/director/evidence.json).

Reproduce from the repository: `python3 tests/probes/dyl60/validate.py docs/evidence/m2-3-c/campaign`.

### NOT_RUN and NOT_TESTED

| Surface | Status and reason |
| --- | --- |
| Tablet replay | **NOT_TESTED.** No paired device was used or checked for availability; no device in use was taken over. This slice changes what the stage draws, so the DYL-193 question stands |
| Swipe, regenerate and Continue invalidating automatic layout on the real host | **NOT_RUN** as an overlay assertion. They reach the same first-changed-source path as the real edit that was run; Node covers the path |
| Project replacement while automatic layout is applied, on the real host | **NOT_RUN** separately; detach and reopen were run, and replacement disposes the same model |
| Removed art under the overlay on the real host | **NOT_RUN.** Node covers the missing reference; the stage's fallback is the existing one |
| The manual layout row of plan 4.6 on the real host (edit while a request is outstanding) | **NOT_RUN.** Node covers it |
| Real providers, text-completion backends, queueing single-slot backends, other host versions | **NOT_TESTED**, as in M2.2 |
| Whether a self-moving stage reads well; usefulness, accuracy; Gate B | **NOT_RUN**, owner-gated |

### Implementation choices for owner review

Not settled by the documents; each is reversible and none is an owner ruling.

| Choice | Rationale |
| --- | --- |
| **A project's fields are locked by default in practice, so automatic layout rarely moves anything until a lock is released.** The reducer locks every manual background and presence choice, including adding an actor. I changed nothing here. | D4 and the contract's section 5 say so. It is the largest practical consequence of this slice and affects what Gate B would see: the owner may want a way to mark a choice as a default the director may move. That would be a separate decision |
| E11 is unchanged: with no temporary expression artwork the director stays idle, even if it could move layout. The check reads the global layout, not the composed one. | E11 is a ruling. Reading the composed view would let the director make every actor absent, then never run again |
| The overlay owns its history, selection and catalog revisions instead of taking the journal's, so `rebase` and `reconcile` take `{ selectedSourceKey, assets }`, not revisions as the plan's signature suggests. | Replaying the base needs a selection at the first source and then a move, which needs its own advance; the journal's numbers could not stay in step. The token reads them from the overlay, as plan 5.2 asks |
| Settlement compares the captured overlay scene by identity. | A rebase restarts the scene's own `revision`, so a manual change could reproduce the same number; a new scene is always a new object. `reconcile` keeps the same object when nothing changed |
| The layout applies synchronously before the first expression. If an expression then throws, the layout stands and the notice says so. | Nothing can change between the identity check and the apply. A failure after an expression's await could otherwise leave a layout half-validated against a moved scene |
| A value already on stage is dropped before `applyProposal`, so it is no move, no notice and no command, even on a locked field. | A model repeating “still at the harbor” would otherwise fill the journal and report a move each turn |
| “(director)” shows only when the value differs from the global layout. | An automatic choice equal to the global value is not visibly the director's |
| A cursor the overlay has not fingerprinted yet keeps the last selection's projection, and the overlay stays on stage while a reply streams, unlike expressions. | Forward-scoped layout falling back to the global scene would flash the background on every reply |
| An unused overlay is not reconciled on sync; a capture reconciles for itself. | The director is off by default and a streaming reply syncs on every change |
| The toggle's help sentence “only ever changes temporary expressions” became “…temporary expressions, the background and who is present, for this attachment; none of it is saved”. | The old sentence is now false. The rest of the help text is F4's wording, unchanged |
| The notice for a cleared overlay is appended to the existing “Applied · unsaved project changes.” and shows only when something was cleared. | The stage changes more than the user's command said; the panel should say why |
| Outfit updates are reported as “N outfit changes not applied: the director does not change outfits.” | “Not available yet” promised a later slice nobody has authorized |
| Native T56 and T57 run at the end of the director script, after the four-card group. | No earlier block's expectations change, and T57's reload cannot disturb them |

### Limits

The overlay is lost on reload and on a chat switch by design, like temporary expressions. Its command list is not pruned; it is bounded by the session ceiling (at most 200 requests of at most 16 updates) and released with the attachment. T49 is amended per F10 only when this PR merges and is unchanged in the matrix until then. M2.4 is not started.

### Next bounded step

Owner review of this draft PR and the choices above. On merge, M2.3 is complete and T49 is amended; M2.4 planning follows only on separate authorization. This document starts nothing.
