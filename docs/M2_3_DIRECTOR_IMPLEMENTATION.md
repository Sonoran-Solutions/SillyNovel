# M2.3 director queueing — implementation record

**Candidate for owner review, draft PR, unmerged.** Implements PR A of the [M2.3 plan](M2_3_DIRECTOR_QUEUEING_PLAN.md) under [rulings F1–F10](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02). Tracked by [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold). PR B follows only after the owner reviews this one; PR C is not authorized (F9). Gate B remains **NOT_RUN**.

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
