# M2.1 director proposals — implementation candidate and handoff

**Candidate for owner review, draft PR, unmerged.** The owner [authorized M2.1 implementation](DECISIONS.md#owner-authorization--m21-director-implementation--2026-11-01) (plan decision D1); [DYL-194](https://linear.app/devils17/issue/DYL-194/sillynovel-m21-director-proposals-lock-precedence-and-snapshot) tracks it. D2–D8 are the [plan's](M2_1_DIRECTOR_PLAN.md#8-owner-decisions-needed-before-m21-implementation) proposed defaults applied as reversible implementation choices, not owner rulings. Gate B NOT_RUN. No M2.2, M2.3 or M2.4 work has started.

Starting main: **`0e2dc5d0b63fe275129c9fa70c8584114026c089`**, the merge of PR #39. Frozen implementation/test SHA: **`0d80dffc803aecf85a1d87e783d63f24212047a0`**. Commits after it are documentation only or a merge of `origin/main`; the final pushed head is recorded in the PR.

## What changed

- `src/director-proposal.mjs` (new, pure): `validateProposal`, `applyProposal`, `checkProposalEvidence`. It imports only `reduceScene`/`projectScene` and the existing `evidenceStamp`. No runtime module imports it yet, so the extension's behavior is unchanged.
- `tests/m2-director-proposal.test.mjs` (new): 29 Node tests. `tests/fixtures/m2-director/`: `proposals.json` (86 raw proposals) and `texts.json` (invented six-message window). No private chat, card or provider output.
- `tests/probes/dyl60/run.py`, `check-discovery.py`: expected Node suite list now 9 files. Evidence packages frozen at earlier SHAs bind the earlier bytes of these runners and stay attributed to those SHAs.
- Docs: this file, TESTING rows T31–T38, top entries in STATUS, ROADMAP and TESTING, and a pointer in the state contract.

**Not modified:** `src/scene-reducer.mjs` (`SCENE_SCHEMA_VERSION` stays 1), every other runtime file, the plugin, the manifest, dependencies, persistence formats, `docs/examples/director-response.json`.

## Behavior

`applyProposal(previous, proposal, token, { texts, window })` returns `{ scene, result: { accepted, code, detail?, applied, ignored, suggestions } }`. Steps: token shape; reducer authority; override revision; scene revision; whole-proposal validation; stable translation (location, then characters in proposal order, each presence → outfit → expression); one `reduceScene` per command with `origin: 'automatic'`. Any refusal returns the exact `previous` reference.

| Code | Meaning |
| --- | --- |
| `ACCEPTED` / `NO_CHANGE` | At least one command applied / none applied (same scene reference) |
| `INVALID_PROPOSAL`, `UNSUPPORTED_PROPOSAL_SCHEMA`, `INVALID_UPDATE`, `INVALID_EVIDENCE`, `UNRESOLVED_CHARACTER`, `CHARACTER_NOT_ADDED`, `UNKNOWN_ASSET`, `INCOMPATIBLE_ASSET`, `CONFLICTING_UPDATES` | Plan section 4, checked by category in that order. `detail` names the update position and rule, never model text |
| `STALE_OVERRIDE` | A manual change or release followed the capture |
| `STALE_SESSION`, `STALE_REVISION`, `STALE_SELECTION`, `STALE_SOURCE`, `MISSING_AUTHORITY`, `INVALID_SCENE`, `REVISION_LIMIT` | Reducer's own authority refusals, unchanged |
| `INVALID_TOKEN`, `INVALID_EVIDENCE_WINDOW` | New: malformed caller inputs (see below) |

`checkProposalEvidence(token, snapshot, scene, currentSource)` returns `CURRENT`, `STALE_EVIDENCE`, `STALE_SOURCE`, `UNRESOLVED_COMPLETION` or `INVALID_TOKEN`. `applyProposal` does not call it, because it takes no snapshot; plan section 6 makes the caller run both layers, and that wiring is M2.3.

## Defaults applied (not owner rulings)

| ID | Default | Where |
| --- | --- | --- |
| D2 | Fixture-only: no transport, provider, prompt or network path | No such code exists; the suite asserts the module's only imports and scans it for host, DOM and network names |
| D3 | Narrowed operations: `setCharacter`, `setLocation`, `suggestLocation` | `UPDATE_KEYS`, `translate()` |
| D4 | Locked field in a valid proposal is skipped and recorded | `applyProposal` loop, `result.ignored` |
| D5 | Manual expression at the anchored message outranks automatic | `manualExpression()` guard in the `applyProposal` loop |
| D6 | Anchored at the selected source only | Reducer `STALE_SELECTION`, unchanged; `validWindow()` requires the window to end at the selected source |
| D7 | Attached-project expression journal deferred to M2.2 planning | Nothing built. The module targets the reducer path only; it is not a complete integration |
| D8 | Window of up to six sources, excerpt ≤ 200 characters, ≤ 16 updates | `MAX_WINDOW`, `MAX_EXCERPT`, `MAX_UPDATES` |

## Where the plan left room: choices for owner review

Bounded proposals with a rationale. None is an owner ruling; each can be reversed in this PR.

1. **Expression that depended on a locked-out outfit is skipped, not refused.** Plan step 4 refuses the whole proposal on any non-`LOCKED` reducer refusal. A valid `{outfitId: coat, expressionId: coat-smile}` against a locked different outfit would hit `INCOMPATIBLE_ASSET` and let one lock silence the director, which is what D4 avoids. Both fields are recorded as ignored with `LOCKED`. If the kept outfit already fits the expression, the expression applies.
2. **An automatic outfit change is also skipped while a manual expression is showing at that message.** The plan's D5 rule names only automatic `setExpression`, but `setOutfit` resets the expression, so the manual choice would otherwise be wiped. Recorded as `{field: 'outfit', code: 'LOCKED'}`. After a manual `clearExpression` nothing is showing, so the outfit applies.
3. **Override check runs before the scene-revision check.** A manual command advances both, and the plan's fixtures expect `STALE_OVERRIDE`, which a revision-first order could never return.
4. **Reducer authority is checked up front, including for proposals with no commands.** The plan runs those checks only inside `reduceScene`, so an empty or suggestion-only proposal from an old visit would have returned accepted, with old suggestions. A probe (an automatic `lock`, which passes every authority check and then always refuses with `MANUAL_ONLY`) reuses the reducer's checks without duplicating them.
5. **New codes.** `INVALID_TOKEN`: token keys not exact, origin not `automatic`, or `token.source` differing from `token.authority.source`; a manual-origin token would otherwise reach the reducer with manual powers. `INVALID_EVIDENCE_WINDOW`: window not a run of up to six consecutive sources ending at the selected one, or missing text. This separates a caller error from model evidence.
6. **Stricter or sharper readings.** A whitespace-only excerpt counts as empty. `evidence: null` is `INVALID_EVIDENCE` rather than `INVALID_UPDATE`. Lengths count Unicode code points. Key checks include symbol and non-enumerable keys and refuse accessors. Sparse or tagged `updates` arrays are refused. `checkProposalEvidence` also requires `selectionState === 'valid'` and the cursor at the anchored source, as `project-expressions.mjs` does.

**Known behavior, left as is:** the reducer accepts explicit repeats, so restating an unchanged background or outfit advances revisions, and restating an unchanged outfit without an expression resets an *automatic* expression at that message. The plan's translation has no no-op filter; add one in a later slice if Gate B shows churn.

**Not settled here:** D7; O04 and O06 before M2.2; whether `docs/examples/director-response.json` moves to `characterKey`/`backgroundId` (left unchanged until D3 is ruled on); journaling provenance, which is returned in `result.applied` and `result.suggestions` only.

## Commands and results

Node v26.8.1, Linux x64, run on the frozen SHA from the worktree root.

| Command | Result |
| --- | --- |
| `node --test tests/*.test.mjs` | Exit 1: 173 pass, 1 fail, 174 total. 144 existing + 29 new pass. The 1 is the browser file failing at import (see NOT_RUN) |
| `node --test --test-isolation=none` on the 7 Node suites in `tests/` + `tests/probes/dyl19/*.test.mjs` | 182/182 pass |
| `node --test tests/m2-director-proposal.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-expressions.test.mjs` (plan section 7) | 110/110 pass |
| `node --check src/director-proposal.mjs`, same for the test file | Clean |
| `python3 tests/probes/dyl60/run.py --list-tests` | 9 node / 5 storage / 1 browser files; new suite listed |
| `python3 tests/probes/dyl60/check-discovery.py` | PASS: 9/5/1, unexpected/empty/missing suites refused |
| `git diff --check origin/main HEAD` | Clean |

Baseline before any change on starting main: 144/144 on the six `tests/` Node suites. A one-off mutation pass broke 16 guards in the new module one at a time (override, authority probe, origin, D5 and its outfit guard, dependent expression, window, conflicts, substring, evidence copy, generation, selection state, stamp, translation, own-key check, sparse array); the suite failed on all 16. The mutation script is not committed.

**NOT_RUN:** `tests/m1-reader-browser.test.mjs`. The only local host checkout, `~/SillyTavern`, is at `8172dcd0` (1.18.0-1), not pinned `7e8663cd9c184a550b37238218bdd32c6efc68e9`, so it was not used. No runtime file loaded by that suite changed, so its earlier exact-head evidence is not contradicted. Storage suite NOT_RUN: plugin unchanged.

## Testing rows

| Row | M2.1 evidence (SYNTHETIC, unit level only) | Still open |
| --- | --- | --- |
| T31–T38 | Covered by named tests | Host behavior when wired |
| T09 | Epoch mismatch at reducer and stamp layers, A → B → A | Real switches with delayed work |
| T15 | Lock wins; proposal captured before a lock is stale | Real director running |
| T16 | Unknown keys, IDs, schema and evidence reject whole | Raw-response parsing and 32 KiB limit (M2.2) |
| T19 | No input mutated or frozen; no prose or evidence in the scene | Real host before/after comparison |
| T29 | Instruction-like excerpt is inert data | Prompt path (M2.2) |
| T05, T11 | Stamp and unresolved-completion refusals on synthetic snapshots | Live snapshot wiring (M2.3) |
| T17 | None; needs a transport | NOT_TESTED |
| T18 | None; needs a classifier | NOT_TESTED |

Gate B categories are fixtured only as far as a validator reaches. A mentioned unregistered character refuses. Negation and hypothetical travel have abstention and suggestion fixtures. Outfit continuity, group authorship with duplicate labels, and user locks are exact. One test pins the limit: **a well-formed flashback misreading with an exact quote validates and applies unless locked.** A matching excerpt proves only that the quote exists; these fixtures make no accuracy claim.

## Not covered

No transport, prompt, provider or network request. No queue, deduplication or timeout recovery. No UI or evidence panel. No persistence. No live `getSceneEvidence()` wiring and no attached-project integration. No host, browser, device or owner session. Gate B **NOT_RUN**. Gates A and C, DYL-193, DYL-56 and DYL-61 are unaffected.

## Recommended next step

Owner review of this one draft PR, including a statement on D2–D8 and the six choices above. M2.2 stays blocked on O04 and O06 and needs its own authorization. This document starts nothing.
