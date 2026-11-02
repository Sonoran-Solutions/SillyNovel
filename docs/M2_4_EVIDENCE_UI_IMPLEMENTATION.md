# M2.4 evidence UI — implementation record

**Candidate for owner review, draft PR, unmerged.** Implements PR A of the [M2.4 plan](M2_4_EVIDENCE_UI_PLAN.md#7-proposed-changes-as-four-sequential-prs) under [rulings G1–G14](DECISIONS.md#owner-rulings-g1g14--m24-evidence-ui-corrections-and-gate-b--2026-11-02). Tracked by [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b). Nothing here is approved or merged. Gate B NOT_RUN.

**Post-merge update — 2026-11-02.** The owner [accepted and merged](DECISIONS.md#owner-acceptance--m24-pr-a-merged--2026-11-02) PR A at `8d85158`; the choices below stand as the reversible baseline, including the pause-as-tally and `STALE_JOURNAL` departures. The rest of this section is the historical candidate record of PR A; PR B follows below.

**PR B merged — 2026-11-02.** The owner [accepted and merged](DECISIONS.md#owner-acceptance--m24-pr-b-merged--2026-11-02) PR B at `8203ea1`; its record is the [PR B section](#pr-b--evidence-ui-and-resume) below and its choices stand as the reversible baseline. PRs A and B complete the authorized M2.4 work; PR C waits on the owner's go-ahead.

**PR C merged — 2026-11-02.** The owner [accepted and merged](DECISIONS.md#owner-acceptance--m24-pr-c-merged--2026-11-02) PR C at `34dfcd8`; its record is the [PR C section](#pr-c--corrections-and-the-director-may-move-control) below and its choices stand as the reversible baseline. T50 and T57 are amended in TESTING. PR D waits on the owner's go-ahead.

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

## PR B — evidence UI and Resume

**Candidate for owner review, draft PR, unmerged.** Implements PR B of the [M2.4 plan](M2_4_EVIDENCE_UI_PLAN.md#7-proposed-changes-as-four-sequential-prs) under [G1 and G2](DECISIONS.md#owner-rulings-g1g14--m24-evidence-ui-corrections-and-gate-b--2026-11-02), tracked by [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b). Nothing here is approved or merged. Gate B NOT_RUN; DYL-193 stays open.

**Starting main:** `c857e6b4186f54165caa227b537db26b01bac2c8` (PR #60; `docs/DECISIONS.md` begins with the PR A acceptance). **Frozen:** `98d4c27bb97a1ecf8b6f581a3bd8cc339196aae3`. Every later commit on the branch is documentation or evidence only; the final pushed head is named in the PR description.

### What changed

| File | Change |
| --- | --- |
| `src/stage-view.mjs` | The Director line and Resume after the `cast` read-out; the closed “Why this visual?” disclosure below them; every value through `textContent`; the disclosure's body exists only while it is open |
| `style.css` | The line, its note and the disclosure, with a bounded scrolling height: `max(30%, 7rem)` of the stage, `max(24%, 6rem)` on narrow or short stages |
| `src/director-controller.mjs` | `resume()`. Also `status().state`, the line's word, and two change notifications that word needs: a target dropped with no notice, and a freed slot |
| `src/project-scene.mjs` | One line: `resumeDirector`, the model's route to the controller |
| `tests/m2-director-controller.test.mjs` | 6 new cases (T62, the line's word); the harness can replace its settings |
| `tests/m1-reader-browser.test.mjs` | 4 new cases (T59's render half, T61, T62); `src/director-log.mjs` added to the fixture's file map |
| `tests/probes/m2-director/host.mjs` | 5 new blocks and assertions on the line in existing blocks; no existing assertion amended |

Not touched: `src/director-log.mjs`, `src/director-session.mjs`, `src/director-overlay.mjs`, `src/host-adapter.mjs`, `index.js`, `src/scene-reducer.mjs`, `src/director-proposal.mjs`, `src/director-request.mjs`, `src/project-expressions.mjs`, `src/reader-source-model.mjs`, the storage plugin, the project schema. No dependency. Nothing persisted. No Retry.

### Where G2 and plan 3.5 are honoured

| Requirement | Where | Evidence |
| --- | --- | --- |
| Line next to `cast`, only while attached and enabled, `role="status"` | `directorBar`, hidden unless `director.enabled` | Browser T61; native first, T39 and T61 blocks |
| States on, waiting, requesting, paused, idle | `status().state` | Node `Director line word`; browser; native all five on the real host |
| Disclosure closed, shown only when the selected message has something to explain | `explains` in `renderDirectorEvidence` | Browser T61 (none yet, earlier message); native T61 |
| What is on stage and which decision put it there; entries at this message; session summary | `explanation` | Browser T61; native T61 |
| `textContent` only, no element from text, nothing executed | `make`; `src/stage-view.mjs` still has no `innerHTML` | Browser T59 render half: one text node, no element, `window.pwned` undefined |
| Message number and author from current history; labels from the catalog | `message`, `actorName`, `artwork` take only keys from the entry | Browser T61; native names `Project A` from the host's history |
| No live region for excerpts | Plain lists | Browser and native: no `[role]` or `[aria-live]` inside |
| Escape closes like the controls panel | Same handler; focus returns to the summary | Browser, native |
| Bounded height; reply field reachable | CSS above; the reply field is outside the stage | Browser at 390×550, 824×700, 1317×420: form in view, composer receives the hit test. Native at 1440×1100. Physical check is DYL-193 |
| Resume clears `paused` and `consecutive`, keeps the overlay, issues nothing (F6) | `resume()` | Node T62 (four cases, including a reply still settling at the press); browser; native after three real failures, all native files byte-identical across the press |
| Refused at the ceiling with a note | `resume()` refuses; the button is disabled; the note shows | Node; browser, including raising the ceiling; native at ceiling 3 |

### The exact words on screen

Line: `Director: <on|waiting|requesting|paused|idle> · <count> of <ceiling>`. Button: `Resume`. Note: `At the session ceiling. The ceiling is set in the extension settings.` Summary: `Why this visual?`

Headings: `On stage at this message`, `Decisions at this message`, `Session summary`.

On stage: `Background: <label> · your layout` or `· director, message <n> · <author>`; `<actor> [<id>]: present|absent · …`; `<actor> [<id>] expression: <label> · your choice` or `· director, …`; `director, decision no longer in the log` when the entry fell off the 64.

Decision: `Decision <n>: <outcome> · <CODE> · <ms> ms · message changed`. Outcomes: `Applied`, `No change`, `Overtaken by your reply`, `Cancelled`, `Stale`, `Not built`, `Transport failure`, `Response refused`, `Proposal refused`, `Partly applied`, `Abandoned`.

Row: `Background: <label> (was <label>)`, `Presence of <actor>: present|absent`, `Outfit of …`, `Expression of …`, `Background suggestion`, then one of `applied`, `LOCKED · kept your manual choice`, `NO_AUTOMATIC_LAYOUT · the director does not change outfits`, `unchanged · already on stage`, `suggestion only · not applied`, then optionally `· cleared by your layout change`. Quote: `Quote from message <n> · <author>: “<excerpt>”`.

Summary: `Requests: <n> of <ceiling>`; `Consecutive failures: <n> · Paused: <CODE>`; `Outcomes: …`; `Codes: …`; `Pauses: …`; `Dispositions, <field>: …`; `Elapsed: minimum <n> ms, median <n> ms, maximum <n> ms, over the latest <n>`.

Notices: `Director resumed. It reacts to the next completed reply.` and, for a refusal reaching the controller, `Director paused: session ceiling <n> reached. The ceiling is set in the extension settings. · manual controls remain available`.

### Commands and results

Frozen `98d4c27`, Node 26.8.1, Playwright 1.62.1, Chromium 151.0.7922.34, pinned SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9` on a disposable clone under the session scratchpad (clean at the pin, hashes in [pins.json](evidence/m2-4-b/campaign/pins.json)), loopback endpoint only, host user data in per-run temporary roots removed afterwards, no real provider. Deadline 3000 s, output to per-step log files; no owned process remains and port 8128 is free.

```sh
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
python3 tests/probes/dyl60/check-discovery.py
SILLYTAVERN_ROOT=/path/to/pinned SN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs timeout -k 15 3000 python3 tests/probes/dyl60/run.py /new/evidence/dir
python3 tests/probes/dyl60/validate.py docs/evidence/m2-4-b/campaign
```

| Suite | Result | Elapsed |
| --- | --- | --- |
| `check-discovery.py` | PASS: 13/5/1 files; unexpected, empty and missing suites refused | Under 1 s |
| Node (13 files) | 328/328; 6 more than PR A's 322 | 5 s |
| Storage (5 files) | 126/126; plugin unchanged, run because the runner runs it | 166 s |
| Browser, actual entry | 97/97; 4 new | 96 s |
| stage-library-migration | PASS, 24 checkpoints | 80 s |
| expressions | PASS, 16 | 51 s |
| groups | PASS, 22 | 76 s |
| recovery | PASS, 17 | 45 s |
| cleanup | PASS, 21 | 83 s |
| native-integrity-branches | PASS, 18 | 91 s |
| **director (extended)** | PASS, 35 (30 in M2.3 PR C plus 5 new) | 506 s |
| `validate.py` | PASS: 127 frozen inputs, 108 artifact hashes | |

Total 1198 s. The one page error is the existing `Generation was aborted.` from the Stop block. Retained: [full package](evidence/m2-4-b/campaign/), [runs](evidence/m2-4-b/campaign/runs.json), [director checkpoints](evidence/m2-4-b/campaign/director/evidence.json) (abandonment observed at 89 976 ms; hold released 4997 ms after the clearing event).

Mutation check on a working copy restored afterwards, each failing one Node case: no `dropPending` in `resume()`; `consecutive` not cleared; no ceiling refusal.

**Earlier attempts.** Two faults were found in the product before this freeze; both are corrected, and neither was a test-only change.

| Attempt | What happened | Outcome |
| --- | --- | --- |
| Director script alone, uncommitted | PASS, 35. Development evidence only. Reviewing `resume()` afterwards found a reply still settling at the press would have fired retroactively, against F6 | `dropPending()` in `resume()`, with a Node case |
| Full campaign on `43c7059` | Nine suites passed; **director FAILED at checkpoint 27**, reading the previous contents of a just-reopened disclosure. That exposed the real defect: a closed disclosure kept its last contents in the page until the `toggle` event, including excerpts after their message was edited, against T60. [Retained](evidence/m2-4-b/failed-43c7059/) | The body is emptied whenever the disclosure is not open, with a browser assertion. This was the one recovery retry |

Reproduce from the repository: `python3 tests/probes/dyl60/validate.py docs/evidence/m2-4-b/campaign`.

### NOT_RUN and NOT_TESTED

| Surface | Status and reason |
| --- | --- |
| Tablet replay, touch | **NOT_TESTED.** `adb devices` listed no attached device at the check. The reply field's reach with the disclosure open, and the line and Resume on touch, are DYL-193 items under G12; only desktop Chromium viewport sizes were run |
| Soft keyboard, IME with the disclosure open | **NOT_TESTED**, DYL-193 |
| Screen reader announcement of `role="status"`, and the absence of excerpt announcements | **NOT_TESTED.** Attributes are asserted; no assistive technology was used |
| “message changed” after a real swipe, regenerate, delete or reorder | **NOT_RUN** on the host; a real edit was run. Node covers the path. PR D's blocks reach swipe and regenerate |
| `Why this visual?` in a native group | **NOT_RUN** as its own block; the group block's request runs with the same renderer |
| Real providers, other backends and host versions | **NOT_TESTED**, unchanged |
| Whether the line and disclosure read well; usefulness; Gate B | **NOT_RUN**, owner-gated |

### Implementation choices for owner review

Not settled by the documents; each is reversible and none is an owner ruling.

| Choice | Rationale |
| --- | --- |
| **The session summary is reachable only from a message with something to explain**, so a session record needs navigating to such a message before copying it. | G2 places it inside the disclosure and shows the disclosure only then. The Gate B protocol's copy step should say so; moving the summary is a one-line change if the owner prefers |
| **“cleared by your layout change” also appears after turning the director off and on**, because disable rebases the overlay and the entry cannot tell the two apart. PR A's record expected the hidden line to prevent a collision; it does not survive re-enabling. | The user did cause the clearing, so the words are loosely true. Exact wording needs the controller to record why it rebased, which PR C may want anyway |
| **The line reads `waiting` for about 2 s after every reply**, during the settle interval, then `requesting`. | A target really is waiting, and the plan's words have nothing better. Reporting `on` there would be simpler and quieter. The owner's session can judge the flicker |
| Precedence is paused, requesting, waiting, idle, on. An abandoned request still reads `requesting` until the slot frees, even though its notice says “still outstanding”. Idle also checks for no connection live, on each render. | The line says what is true of the slot. A paused director with a request still out reads paused, which is what the user can act on |
| `status().state`, a dropped-target notification and a freed-slot notification were added to the controller, beyond the brief's `resume()`. | Otherwise the view would parse notice strings and the line could stay stale, for example `requesting` after an abandoned request settles with no notice |
| `src/project-scene.mjs` gained one line, and `index.js` none. A `document` listener in the stage re-renders when the ceiling input changes. | The plan's file list omits the model that sits between stage and controller. Without the listener, raising the ceiling would leave Resume disabled until the next reply |
| Resume is both disabled at the ceiling (plan 3.5) and refused by the controller. The note is on the line, always visible while paused at the ceiling. | A disabled button cannot explain itself, and the controller must hold whatever the view believes |
| The disclosure hides with the director off, although a temporary expression the director chose can stay on stage. | G2 says “below it”, and PR A's record assumed so. Showing it while off would need a second visibility rule |
| An open disclosure stays open between messages that have something to explain, and closes when the reader reaches one that does not. | Comparing neighbouring messages should not take a click each; the closed default returns once there is nothing to show |
| The body is built only while open and rebuilt only when its contents change. It is emptied while closed, while unverified and when hidden. | T60: no excerpt lingers in the page. Reopening after a reply loses the scroll position, a small cost |
| On stage lists the whole cast and the background, not only the director's choices. | The plan says “what is on stage”, and “your layout” beside the rest answers the question the reader is asking |
| A forward-scoped choice names the latest applied, uncleared decision at or before the selected message. | Decisions move forward; at most 64 are held, and an older one says so rather than guessing |
| Entries are numbered `Decision <seq>`, and a build refusal is a decision though no request exists. `seq` restarts per attachment. | `not_built` must not read as a request. A build refusal has no source only when `INVALID_SCENE` found none; such an entry is counted in the summary and listed at no message |
| “message changed” replaces the row's “cleared” word on that entry. | A changed first source sets both, and the changed message is the cause |
| The disclosure takes focus on a click inside it (`tabindex="-1"`), and Resume moves focus to the line. | The lists hold no control, so Escape had nothing to act on after a click; the button hides once pressed |
| `src/director-log.mjs` joined the browser fixture's file map. PR A added the import without it, and the suite did not run in PR A. | One line. From reading the map, the actual-entry suite could not load at PR A's merge; that state was not separately run. The merged stage on the pinned host was unaffected, since the host serves the file |

### Limits

The log and tallies stay memory-only (G3), so the summary is lost on reload. A valid excerpt proves the quote exists, not that the model read it correctly; the row presents it as a quote. The disclosure adds height while the reader is using it, and its behaviour under a real soft keyboard is unknown until DYL-193. PR C's corrections are not started; no row offers an action.

### Next bounded step

Owner review of this draft PR and the choices above, the summary's reachability and the off-and-on wording first. PR C follows only on the owner's go-ahead under G1. This document starts nothing.

## PR C — corrections and the director-may-move control

**Candidate for owner review, draft PR, unmerged.** Implements PR C of the [M2.4 plan](M2_4_EVIDENCE_UI_PLAN.md#7-proposed-changes-as-four-sequential-prs) under [G5–G8](DECISIONS.md#owner-rulings-g1g14--m24-evidence-ui-corrections-and-gate-b--2026-11-02) and the owner's [go-ahead](DECISIONS.md#owner-go-ahead--m24-pr-c-corrections-and-the-o08-control--2026-11-02), tracked by [DYL-205](https://linear.app/devils17/issue/DYL-205/sillynovel-m24-pr-c-manual-corrections-correction-locks-and-the-o08). Nothing here is approved or merged. Gate B NOT_RUN; DYL-193 stays open.

**Starting main:** `61f782469401fd06b71d5ed67bee8fcff44aea05` (PR #63; `docs/DECISIONS.md` begins with the PR C go-ahead). **Frozen:** `c6f6ec7486fca9059b4e62f2e6e64ac8685d0c60`. Every later commit on the branch is documentation or evidence only; the final pushed head is named in the PR description.

### What changed

| File | Change |
| --- | --- |
| `src/director-overlay.mjs` | `correct(command, authority)`: a manual `setBackground`, `clearBackground`, `setPresence` or background/presence `release` through the reducer, atomic on refusal, reporting how many later commands fell. `active()` counts everything after the base; new `corrected()` and `commandValid(revision)`. `project()` adds `origins`: which command decided each field at that source. `composeLayout` takes origin from that command and composes the overlay's background and presence locks |
| `src/project-scene.mjs` | `correct`, `applyMovable`, `globalLocks`, `overlayCommandValid`; a manual expression that replaces an automatic one is tallied; the F8 notice names corrections |
| `src/director-controller.mjs` | `backgrounds[].locked` reads the overlay; `noteCorrection(field)`; `corrections` in `runtime.session` and `status()`. Request shape and `PROMPT_VERSION` unchanged |
| `src/stage-view.mjs`, `style.css` | Row actions in “Why this visual?”; `(corrected)` read-outs; per-field toggles and “Apply and let the director move it” in the Scene panel; `Corrections:` in the summary |
| `docs/STATE_AND_DIRECTOR.md`, `docs/UX_SPEC.md` | Section 5 of each gains the sentence plan section 5.2 option A names. D4 is not amended |
| `tests/m2-director-overlay.test.mjs`, `tests/m2-director-controller.test.mjs` | 8 and 10 new cases |
| `tests/m1-reader-browser.test.mjs` | 6 new cases |
| `tests/probes/m2-director/host.mjs` | 12 new checkpoints for T63–T66; one amended assertion, below |

Not touched: `src/scene-reducer.mjs`, `src/director-proposal.mjs`, `src/director-request.mjs`, `src/director-log.mjs`, `src/director-session.mjs`, `src/project-expressions.mjs`, `src/reader-source-model.mjs`, `src/host-adapter.mjs`, `index.js`, the storage plugin, the project schema. No dependency. Nothing persisted beyond the existing lock flags on explicit Save.

**One amended assertion, tied to G5.** `host.mjs`, T61 block: `[role]` inside the disclosure became `[role]:not(button[role="button"])`. Rows now carry action buttons, and the pinned host's `public/scripts/a11y.js` gives every `.menu_button` `role="button"`. Any other role, a live region, or an element from the text still fails.

### Where G5–G8 are honoured

| Ruling | Where | Evidence |
| --- | --- | --- |
| G5: background and presence are manual commands in the overlay, forward from the selected message | `correct`; the reducer's `manual` path | Node `T63: a correction applies forward…`; browser; native T63 |
| G5: expressions through the journal | Row Revert dispatches `clearExpression`; Override is the existing Apply control | Browser and native T64 |
| G5: other fields kept at the head; later commands invalidated otherwise, and the notice says so | Reducer rule; `invalidated` | Node, browser, native T63 |
| G5: disabled while the journal is not ready | Every row control follows `expressions.get().ready`; `correct` also refuses on its own | Browser, streaming; Node `refused while the journal is not ready` |
| G5: never `edit`, `dirty`, `globalState()`, export or bundles; “Not saved” | `correct` touches only the overlay | Native: saved scene, revision, bundle bytes and every native file byte-identical across the correction; an explicit Save with corrections on stage writes the saved scene byte for byte |
| G6: locks forward, later update `LOCKED`, “kept your correction”, Release | The reducer's manual lock; `release` in the overlay | Node, browser, native |
| G6: Release enables only a fresh proposal | Nothing waits behind a lock; `release` applies nothing | Native: value kept, no request issued, files identical, then a fresh proposal moves it |
| G7: a global command discards corrections and locks | `clearOverlay` rebases | Node, browser, native T65 |
| A correction makes `STALE_SCENE` | The identity check at settlement | Node; native with a held request |
| G8: per-field toggle, movable action, one-click release on a `LOCKED` row, lock state shown | `renderMovable`, `applyMovable`, `lockedRow` | Browser and native T66 |
| G8: slot and outfit have none (F7) | Exactly the background and each actor's presence | Browser and native count the controls; `applyMovable` and `correct` refuse others |
| G8: no schema change, default locked, persists only on Save; T48 | Existing flags through existing `release`/`lock` | Native: Save, reopen, export, import, all with value kept and lock false; imported copy off; `locks` and `scene` keys unchanged |

### The exact words on screen

Row buttons, accessible names in brackets: `Revert` [`Revert background`, `Revert presence of <actor>`, `Revert expression of <actor>`]; `Override` [`Override background`] with a select [`Override background with`]; `Release` [`Release background`, `Release presence of <actor>`]; `Let the director move the background`, `Let the director move presence of <actor>`.

On stage, added to PR B's words: `… · your correction, message <n> · <author> · Not saved · locked until Release`; `… · your layout · locked` or `· your layout · director may move it`.

Rows, added: `LOCKED · kept your correction`; `LOCKED · kept your manual choice · released`; `· invalidated by your correction`. Summary, added: `Corrections: <field> <n>, …` or `none`.

Read-outs: `(corrected)` beside `(director)`'s places.

Scene panel: `Apply and let the director move it` [`…: background`, `…: presence`]; `Director may move the background`; `Director may move presence of <actor>`, each followed by `· locked`, `· movable` or `· movable · held by your correction`.

Notices: `Corrected from this message and locked until Release. Not saved.`; `Released. Only a new director proposal can move this; nothing waiting is applied. Not saved.`; `Historical correction invalidated later director layout.`; `Applied · the director may move this · unsaved project changes.`; `Director layout cleared, your corrections included.`

### Commands and results

Frozen `c6f6ec7`, Node 26.8.1, Playwright 1.62.1, Chromium 151.0.7922.34, pinned SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9` on a disposable copy under the session scratchpad (clean at the pin, hashes in [pins.json](evidence/m2-4-c/campaign/pins.json)), loopback endpoint only, host user data in per-run temporary roots removed afterwards, no real provider. Deadline 3000 s, output to per-step log files; no owned process remains and port 8128 is free.

```sh
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
python3 tests/probes/dyl60/check-discovery.py
SILLYTAVERN_ROOT=/path/to/pinned SN_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs timeout -k 15 3000 python3 tests/probes/dyl60/run.py /new/evidence/dir
python3 tests/probes/dyl60/validate.py docs/evidence/m2-4-c/campaign
```

| Suite | Result | Elapsed |
| --- | --- | --- |
| `check-discovery.py` | PASS: 13/5/1 files; unexpected, empty and missing suites refused | Under 1 s |
| Node (13 files) | 346/346; 18 more than PR B's 328 | 4 s |
| Storage (5 files) | 126/126; plugin unchanged, run because the runner runs it | 134 s |
| Browser, actual entry | 103/103; 6 new | 125 s |
| stage-library-migration | PASS, 24 checkpoints | 77 s |
| expressions | PASS, 16 | 60 s |
| groups | PASS, 22 | 79 s |
| recovery | PASS, 17 | 50 s |
| cleanup | PASS, 21 | 71 s |
| native-integrity-branches | PASS, 18 | 76 s |
| **director (extended)** | PASS, 47 (35 in PR B plus 12 new) | 575 s |
| `validate.py` | PASS: 127 frozen inputs, 110 artifact hashes | |

Total 1251 s. The one page error is the existing `Generation was aborted.` from the Stop block. Retained: [full package](evidence/m2-4-c/campaign/), [runs](evidence/m2-4-c/campaign/runs.json), [director checkpoints](evidence/m2-4-c/campaign/director/evidence.json), screenshots of [a corrected row](evidence/m2-4-c/campaign/director/t63-correction-row.png) and [the toggles](evidence/m2-4-c/campaign/director/t66-director-may-move.png).

Mutation check on a working copy restored afterwards, each failing at least one case over the two director Node files: `active()` ignoring corrections; a correction labelled the director's; the background lock not composed; slot or outfit correctable; the request's lock read from the global scene; a layout correction untallied; an expression correction untallied; a correction while the journal is not ready; a correction that dirties the project; the movable action leaving the lock on; the F8 notice silent on corrections.

**Earlier attempts.** No product code changed between `ed80339` and the freeze; the diff is one test file.

| Attempt | What happened | Outcome |
| --- | --- | --- |
| Shortened director script, uncommitted, never in the repository | Nine runs while the blocks were written. Stops were test defects (read-out wording, a closed panel, a row's `(was …)`, a library label bundles do not carry, a missing connection after a reload), plus two from the cut itself. Screenshots of a passing run showed the toggle's checkbox taking the generic full-width field style and its label a 140 px height | Development evidence only. The CSS was corrected before `ed80339` |
| Full campaign on `ed80339` | Nine suites passed; **director FAILED at checkpoint 21**, on the T61 assertion above. [Retained](evidence/m2-4-c/failed-ed80339/) | The assertion was amended; this was the one recovery retry |
| Director script alone, uncommitted, twice | First: 35 checkpoints, then stopped at the first new block, because the T57 block before it reloads the page and loses the connection. Second, with `connect()`: PASS, 47 | Development evidence only. The test commit is the freeze |

Reproduce from the repository: `python3 tests/probes/dyl60/validate.py docs/evidence/m2-4-c/campaign`.

### NOT_RUN and NOT_TESTED

| Surface | Status and reason |
| --- | --- |
| Tablet replay, touch | **NOT_TESTED.** `adb devices` listed no attached device at the check. The row controls and toggles on touch are DYL-193 items under G12; a 390×550 desktop viewport was run (no sideways scroll, 44 px buttons, reply field in view) |
| Soft keyboard, IME with the row controls | **NOT_TESTED**, DYL-193 |
| Screen reader reading of the row buttons and toggles | **NOT_TESTED.** Names are asserted; no assistive technology was used |
| Corrections in a native group | **NOT_RUN** as their own block; the same renderer and overlay run in the group block's request |
| A correction after a real swipe, regenerate or delete | **NOT_RUN** on the host. Node covers the first-changed-source path, a real edit was run in PR B, and PR D's blocks reach swipe and regenerate |
| T50 and T57 wording | **Pending.** Amended only at merge, per G14 |
| Real providers, other backends and host versions | **NOT_TESTED**, unchanged |
| Whether correcting feels right; the lock-on-correction trade-off; Gate B | **NOT_RUN**, owner-gated |

### Implementation choices for owner review

Not settled by the documents; each is reversible and none is an owner ruling.

| Choice | Rationale |
| --- | --- |
| **Revert and Override sit on the “On stage” rows, Release on those and on `LOCKED` decision rows; applied decision rows stay a record.** | Plan 4.2 corrects from the selected message, including a decision made earlier that the reader only reaches at a later one. That decision has no row under “Decisions at this message”; “On stage” always has one |
| **“kept your correction” is decided at render time, from the lock in force now.** After Release the same row reads `LOCKED · kept your manual choice · released`. | `src/director-log.mjs` is off limits and holds no such fact. A correction is a manual choice, so the words stay true |
| **The director's own notice still says “1 kept your manual choice.”** Only the row says correction. | Existing notices are unchanged; the status line cannot name the lock's cause without new state |
| `composeLayout` now labels a value `(director)` whenever an automatic command decided it, even one equal to the global value. Before, only a difference was marked. | The task says origin comes from the entry, and it is what makes a correction back to the saved value read `(corrected)`. No existing assertion needed changing |
| A background's Revert goes to the decision's `before`, which may itself be an earlier automatic value. It is hidden if the decision fell off the 64, leaving Override. | As plan 4.2 says, and `before` has nowhere else to come from |
| A corrected presence also offers Revert (the opposite value). A corrected background offers Override and Release only. | Presence has no Override, so otherwise a wrong correction could only be undone by a global command |
| Release at an earlier message invalidates later overlay commands too. | The reducer's manual rule, one rule; the notice says so |
| Corrections are tallied in `runtime.session.corrections`, not the log's tallies. Any manual expression that replaces an automatic one counts, from the panel too. A Release does not. | The log module is off limits. Its session lifetime is the same (E6). A correction through Apply expression is still a correction |
| Row text gains `· locked` or `· director may move it` on “your layout”. | G8 asks for lock state shown, and the disclosure is where the reader asks about it |
| The toggle shows the **project** flag, so a correction's lock reads `· movable · held by your correction` rather than unchecked. | Unchecking must mean a global lock. Two meanings on one box would invite a dirty project by accident |
| The toggles live in the Scene panel, a list for every actor rather than the selected one. | “Beside the background and each actor's presence”; a list needs no actor select first |
| “Apply and let the director move it” is one edit with no intermediate render, not two dispatches. | The plan says value then `release`; the user made one choice, so the notice and `edit` say one thing |
| A row action checks the selection it was built for and refuses `STALE_SELECTION`. | AGENTS.md: source identities before applying. The row is rebuilt on navigation, so this is the second line |
| A rebuilt disclosure keeps the override choice and the focused control, by accessible name. Focus is still lost when a streaming reply disables the control. | A reply otherwise yanks focus mid-choice. A disabled control cannot hold focus; moving it elsewhere would be worse |
| The disclosure still closes on reaching a message with nothing to explain, so a new reply can close it during a correction. | PR B's choice, unchanged. The owner's session can judge it |

### Limits

Corrections are lost on detach, chat switch, reload, disable and project replacement, by design. The director goes quiet on a corrected field until Release; that is G6's trade-off, and Gate B measures it. Correcting a decision from a later message leaves the messages between as they were. A v1 bundle carries no library labels, so an imported background reads `Background`, as before.

### Next bounded step

Owner review of this draft PR and the choices above, the placement of the row actions and lock-on-correction first; then the owner's merge decision, which is when T50 and T57 are amended under G14; then the owner's go-ahead on PR D under G1. This document starts nothing.
