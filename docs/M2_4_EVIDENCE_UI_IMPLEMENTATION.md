# M2.4 evidence UI — implementation record

**Candidate for owner review, draft PR, unmerged.** Implements PR A of the [M2.4 plan](M2_4_EVIDENCE_UI_PLAN.md#7-proposed-changes-as-four-sequential-prs) under [rulings G1–G14](DECISIONS.md#owner-rulings-g1g14--m24-evidence-ui-corrections-and-gate-b--2026-11-02). Tracked by [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b). Nothing here is approved or merged. Gate B NOT_RUN.

**Post-merge update — 2026-11-02.** The owner [accepted and merged](DECISIONS.md#owner-acceptance--m24-pr-a-merged--2026-11-02) PR A at `8d85158`; the choices below stand as the reversible baseline, including the pause-as-tally and `STALE_JOURNAL` departures. PR B starts only on the owner's go-ahead. The rest of this section is the historical candidate record.

## PR A — decision log and stale reasons

**Starting main:** `3038dd5b44e9a1f6da3ac953251192b4bc002b37` (PR #58; `docs/DECISIONS.md` begins with the G1–G14 entry). **Frozen:** `f5de115050d61b9e6784038f8bb7395aaea0fea0`. The commit that adds this record changes only documentation, so the frozen runtime and tests are byte-identical at the final head, which is named in the PR description.

### What changed

| File | Change |
| --- | --- |
| `src/director-log.mjs` (new, pure) | `createDecisionLog`: last 64 entries of plan section 3.3, copied field by field and frozen; `reconcile(sources)` deletes excerpts; `entries(epoch)` marks cleared layout rows. `createTallies`, `tallyEntry`, `tallyPause`, `summarizeTallies`: counts and elapsed minimum, median and maximum over the latest 64 |
| `src/director-controller.mjs` | One entry and tally per issued request or build refusal; `stillCurrent` names its reason; `status()` adds `log`, `consecutive`, `tallies`; `runtime.session` gains `tallies`; the runtime takes an injectable `now` |
| `src/director-session.mjs` | `routeProposal` also returns `unchanged`. Routing itself is unchanged |
| `src/director-overlay.mjs` | Exposes `epoch()`, advanced by every `rebase`. Nothing else |
| `tests/m2-director-log.test.mjs` (new), `tests/m2-director-controller.test.mjs` | T58, T59's log half, T60 |
| `tests/probes/dyl60/run.py`, `check-discovery.py` | Node list and expected count, now 13/5/1 |

Not touched: `src/stage-view.mjs`, `style.css`, `src/host-adapter.mjs`, `index.js`, `src/scene-reducer.mjs`, `src/director-proposal.mjs`, `src/director-request.mjs`, `src/project-expressions.mjs`, `src/reader-source-model.mjs`, `src/project-scene.mjs`, the storage plugin, the project schema. No dependency added. Every notice is unchanged; no existing assertion was amended. The controller test harness gained one argument, `now: time.now`, for the fake clock.

### Where the rulings are honoured

| Ruling | Where | Evidence |
| --- | --- | --- |
| G3: memory only, per attachment | The controller creates the log; a chat switch disposes the controller | Node `E6: tallies survive…`; `T58: the log touches no settings…` (settings, save body and wire) |
| G3: last 64 | `LOG_LIMIT` | Node `bound of 64…` |
| G3: excerpts deleted when the anchored source changes | `reconcile` against `expressions.sources()`, on `observe` and `status`; a returning record does not restore the text | Node `T60`: edit, swipe, regenerate, delete, reorder, earlier message edit; append and later edit keep it |
| G3: tallies share E6's lifetime | `runtime.session`, next to `count` | Node `E6: tallies survive…` |
| G4: taxonomy | Table below | Node `T58` cases |
| G4: no model text but the validated excerpt | `copyUpdate` and `copySource` keep named fields only; a row is built from catalog-validated IDs and the excerpt; a code that is not code-shaped becomes `UNKNOWN` | Node `T59` cases in both files |

| Outcome (`entry.outcome`) | `entry.code` |
| --- | --- |
| `applied` | `APPLIED` |
| `no_change` | `NO_CHANGE` |
| `superseded` | `SUPERSEDED` |
| `cancelled` | `ABORTED`, `CANCELLED` |
| `stale` | `STALE_JOURNAL`, `STALE_SELECTION`, `STALE_SCENE`, `STALE_EVIDENCE`, `STALE_SOURCE`, `UNRESOLVED_COMPLETION` |
| `not_built` | `INVALID_SCENE`, `INVALID_DIRECTOR_INPUT`, `UNSAFE_DIRECTOR_PAYLOAD` |
| `transport` | `HOST_REFUSED`, `TRANSPORT_ERROR` |
| `response_refused` | `EMPTY_RESPONSE`, `RESPONSE_TOO_LARGE`, `NOT_SINGLE_JSON` |
| `proposal_refused` | The refusal codes of `validateProposal`, and any refusal from `overlay.apply` |
| `partial` | `PARTIAL` |
| `abandoned` | `ABANDONED` |

Per-update dispositions: `applied`, `LOCKED`, `NO_AUTOMATIC_LAYOUT`, `unchanged`, `suggestion`.

### Commands and results

Frozen `f5de115`, Node v26.8.1. No host, browser or provider was involved.

```sh
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/m1-project-expressions.test.mjs tests/m2-director-proposal.test.mjs tests/m2-director-request.test.mjs tests/m2-director-controller.test.mjs tests/m2-director-overlay.test.mjs tests/m2-director-log.test.mjs tests/probes/dyl19/owned-chat-probe.test.mjs tests/probes/dyl19/source-anchor.test.mjs
python3 tests/probes/dyl60/check-discovery.py
```

| Check | Result |
| --- | --- |
| Node, the runner's 13 files | 322/322, 0 failed, about 4.5 s. 39 more than PR C's 283: `tests/m2-director-log.test.mjs` 21, `tests/m2-director-controller.test.mjs` 18 more (99 in all) |
| `check-discovery.py` | PASS: 13/5/1 files; unexpected, empty and missing suites refused |
| Mutation check, on a working copy restored afterwards | Each of six faults failed tests over the two director files: no reconcile (6), no entry on detach (2), excerpts kept on change (7), `STALE_SCENE` misnamed (2), label held in a row (2), `unchanged` not recorded (1) |
| `validate.py docs/evidence/m2-3-c/campaign` | **Fails at this head on `src/director-controller.mjs`, as expected.** A package pins the hashes of its frozen inputs, so it reproduces only at its own candidate; `m2-3-b` fails the same way. It is not evidence for this PR, which has no package |

### NOT_RUN and NOT_TESTED

| Surface | Status and reason |
| --- | --- |
| Browser actual-entry suite | **NOT_RUN.** Pure-module slice under the M2 evidence standard; the renderer is untouched and reads only the fields it read before |
| Storage suite | **NOT_RUN.** The plugin, schema and save paths are untouched |
| Native director campaign and other native suites | **NOT_RUN.** Same standard; PR B runs the full campaign |
| T59's render half (no element created, nothing executed) | **NOT_RUN.** Nothing renders the log until PR B |
| “message changed” and “cleared by your layout change” on screen | **NOT_RUN.** PR A holds `messageChanged` and `cleared`; the words arrive in PR B |
| `UNSAFE_DIRECTOR_PAYLOAD`, `INVALID_EVIDENCE_WINDOW` as log codes | **NOT_RUN.** Neutralizing the input keeps the first unreachable and the captured window keeps the second; each shares a tested branch with `INVALID_DIRECTOR_INPUT` and the proposal refusals |
| Regenerate in T60 | Node reaches it as the reply text changing under the same source key, which is what regeneration does to the source record. A real host's regenerate is **NOT_RUN** |
| Real providers, tablet, Gate B | **NOT_TESTED / NOT_RUN**, unchanged |

### Implementation choices for owner review

Not settled by the documents; each is reversible and none is an owner ruling.

| Choice | Rationale |
| --- | --- |
| **A pause is not a log entry.** It is counted by cause in `tallies.pauses`, and `status().paused` names it. The plan disagrees with itself here: section 3.2 says entries also cover pause events, and T58 says one entry per issued request or build refusal. | The third failure already has its entry, so a pause entry would be a second one for the same request, and a ceiling pause has no request or source to anchor. Adding a pause entry later is small if the owner wants the timeline |
| **The real journal check shadows most stale names.** `stillCurrent` keeps its order, and `expressions.valid` runs first and already covers source, selection and global revision. On the real journal an edit, swipe, navigation or manual layout command all report `STALE_JOURNAL`; only an overlay-only change such as importing art reports `STALE_SCENE`. `STALE_SELECTION`, `STALE_EVIDENCE`, `STALE_SOURCE` and `UNRESOLVED_COMPLETION` are reached in Node with a scripted journal. | The plan says the first failing path names the reason, and reordering would change a tested safety path for a label. The consequence for Gate B: stale tallies will be mostly `STALE_JOURNAL`, coarser than the taxonomy suggests |
| A request ended by disable or detach gets one `CANCELLED` entry and tally; a result arriving later adds nothing. | The plan's table has no row for these, but each was issued and counted. Outcomes other than `not_built` now add up to `count`, which the Gate B record can rely on |
| An interruption outranks the stale reason: a reply generation gives `SUPERSEDED`, a `quiet` or `impersonate` generation `CANCELLED`. A pause reached while outstanding is `CANCELLED`. | Section 3.2's rows. F4's check already ran before the old “cancelled” text |
| `ABORTED` is logged only when the result was otherwise current. A stale result that also aborted logs its stale reason. | Stale is decided first, as E7 requires. The notice is the same either way |
| `cleared` means the overlay rebased after the row: a global manual layout command (F8), disable, or a changed first source. A changed first source also sets `messageChanged`; disable alone cannot be told from F8 in the entry. | The brief asks that F8 be told apart from a live command, which holds. PR B chooses wording; since disable hides the Director line (G2), the two should not collide on screen |
| A row per field, not per update: one update can produce presence, outfit and expression rows, at most 48 per entry against the plan's estimate of 16. Rows run layout, unchanged, skipped, suggestions, expressions, not proposal order. | The disposition belongs to a field, and tallies are by field. Each row's evidence shares its update's strings, so stored text stays within 16 excerpts per entry |
| A suggestion's row has field `background` and no target. Presence rows have `before` as a boolean and no target. | The label stays out (G4). A presence target is implied by `before`, since the field is binary |
| `before` comes from the captured stage for layout, including earlier automatic layout, and from the journal view for expressions. | PR C's Revert returns to what was on stage |
| A value already on stage is `unchanged` even when the field is locked. | Routing drops it before locks are consulted, as PR C chose. The model agreed with the stage; nothing was kept from it |
| `PARTIAL` also covers an expression applied before a later one threw. The notice for that case still says “cancelled”, unchanged as instructed. An expression that threw gets no row. | Something did change, so the log says so. No disposition in G4 fits an update that was never decided |
| Excerpts go on the next `observe` or `status` after the journal's sources change. Between an edit and the next sync an excerpt stays in memory, unrendered. An emptied source list deletes them all. | The journal is the plan's named comparison, and `status` reconciles first, so no reader ever sees one. Deleting too much loses only a quote |
| A build refusal has `elapsedMs` and `promptVersion` of `null`, and adds no elapsed sample. `seq` restarts with each attachment. | Nothing was sent. The log has the attachment's lifetime |
| The default clock is `performance.now()`, rounded to whole milliseconds. | Monotonic, so a system clock change cannot give negative elapsed time |
| Each `status()` call returns a new `log` array and tally summary. | Bounded at 64 entries, and nothing renders them until PR B, which can read them only while its disclosure is open |

### Limits

The log and tallies are lost on reload by design (G3). The median covers only the latest 64 elapsed values; counts cover the whole session. A valid excerpt proves the quote exists, not that the model read it correctly.

### Next bounded step

Owner review of this draft PR and the choices above, the pause entry and the `STALE_JOURNAL` consequence first. PR B (Director line, “Why this visual?”, Resume) follows on that review under G1. The TESTING rows for T58, T59 and T60 name this candidate's Node evidence, unmerged. This document starts nothing.
