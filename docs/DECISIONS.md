# Decision register

## Owner rulings G1–G14 — M2.4 evidence UI, corrections and Gate B — 2026-11-02

**Approving owner: Dylan. Date: 2026-11-02, America/Phoenix. Status: APPROVED.** The owner was given the fourteen decisions in [section 10 of the M2.4 plan](M2_4_EVIDENCE_UI_PLAN.md#10-owner-decisions-needed-before-m24-implementation) with a recommendation each, and said “Record all and merge.” The plan merged at `628a3b4` ([PR #57](https://github.com/Sonoran-Solutions/SillyNovel/pull/57)). Each ruling adopts the plan's recommendation; the alternatives the plan records are not adopted. PRs A and B are tracked by [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b); [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) is reopened and extended per G12.

| ID | Ruling |
| --- | --- |
| G1 | M2.4 is authorized as the four sequential PRs of plan section 7, each with its own record, frozen SHA and the owner's review before the next starts. **PR A (decision log and stale reasons, pure modules) and PR B (evidence UI and Resume, renderer) are authorized now.** PR C (corrections and O08) and PR D (Gate B readiness) are ruled below but each starts only on the owner's go-ahead after the previous PR's review. |
| G2 | Evidence surface: one Director line next to the cast read-out, shown only while attached with the director enabled, plus a closed “Why this visual?” disclosure shown only when the selected message has something to explain, with the session summary inside it. `role="status"` on the line, no live region for excerpts, Escape closes, bounded height so the reply field stays reachable (checked physically under DYL-193). |
| G3 | Decision log: memory only, per attachment, last 64 entries; excerpts deleted when the anchored source changes; tallies share E6's lifetime. No new persistence of any kind. |
| G4 | Outcome taxonomy of plan section 3.2 adopted as the roadmap's error taxonomy, including the new labels `APPLIED`, `CANCELLED`, `PARTIAL`, the stale names `STALE_JOURNAL`, `STALE_SELECTION`, `STALE_SCENE`, and the per-update dispositions. The log holds no model text except the validated excerpt; suggestion labels stay in the notice. |
| G5 | Corrections (PR C): revert and override act as manual commands in the memory-only overlay at the selected message for background and presence, and through the existing journal path for expressions. F8 is unchanged for global commands. |
| G6 | A correction locks its field in memory, forward from the selected message, until Release, detach or reload. Release enables only a fresh proposal. |
| G7 | A global manual layout command discards corrections and their locks along with the rest of the overlay (F8 as one rule). |
| G8 | **O08 resolved: option A.** A per-field “director may move this” control over the existing lock flags (`release`/`lock`, “Apply and let the director move it”, one-click release on a `LOCKED` row), no schema change, default stays locked. Options A2 (schema v3), B (unlock on open) and C (UI only) are not adopted. Contract section 5 gains the sentence the plan proposes; D4 is not amended. |
| G9 | Fixture evaluation (PR D): 40 public-safe cases, five per roadmap category, expected answers frozen and their SHA recorded before measuring, counts per category and field with no aggregate percentage, run through a host where the owner selected the connection by hand. **The owner names the connection at run time and accepts 40 requests against it; no fallback, no retries.** |
| G10 | Real-session protocol and pass criteria of plan sections 6.3–6.5 adopted; no percentage threshold; the owner runs it on a disposable or backed-up host. No entry authorizes live installation. |
| G11 | E11 is kept for the first Gate B session: every attachment needs temporary expression art, and a project without any never moves layout. It is a protocol step and is revisited from the owner's feedback, not before. |
| G12 | **DYL-193 reopened and extended.** Linear showed it Done with no evidence while the documents call it open; it is reopened (Todo), and its scope now includes the director toggle and ceiling, the Director line, disclosure and correction controls on touch, the reply field's reach with the disclosure open, and the composer hold on touch, soft keyboard and IME. It runs on the frozen Gate B candidate between PR D and the fixture run. |
| G13 | E16 residual: measured on the owner's real backend during the session and on the synthetic rejecting backend in PR D; a lost reply on the real backend is a REVISE input, not an automatic fail. No pre-emptive extra delay. |
| G14 | TESTING rows T58–T68 of plan section 9 are adopted and added to the matrix as NOT_RUN. T50 and T57 are amended when PR C merges. |

Already settled and not reopened: E1–E16 and F1–F10 except as G5–G8 and G11 state; O04, O06, D4, D5, D7; O05 stays deferred until Gate B PASS. This entry authorizes PRs A and B only; PR C, PR D, the fixture run, the owner's session, Gate B's verdict, DYL-193 closure, live installation and release each need their own recorded step. Gate B NOT_RUN. Older entries below are historical.

## Owner acceptance — M2.3 PR C merged; M2.3 complete — 2026-11-02

**Approving owner: Dylan. Date: 2026-11-02, America/Phoenix. Status: APPROVED.** The owner reviewed the [PR #55](https://github.com/Sonoran-Solutions/SillyNovel/pull/55) summary, including the thirteen implementation choices in the [PR C record](M2_3_DIRECTOR_IMPLEMENTATION.md#pr-c--automatic-layout-overlay) and the lock-default consequence named first among them, and said “Yes, merge it.” Merge commit `174d380`; PR head `9d36038da8bebd5d658c25910ecc553a37961581`; frozen `67c1aedd5214ad47902d0edfdb2948d356c4b45e` with byte-identical runtime, based on `d4fc583`. [DYL-203](https://linear.app/devils17/issue/DYL-203/sillynovel-m23-pr-c-automatic-layout-overlay-for-background-and) is Done. Independent check before merge, from the repository: Node 283/283 over the runner's twelve files; `python3 tests/probes/dyl60/validate.py docs/evidence/m2-3-c/campaign` PASS over 125 frozen inputs and 108 artifact hashes (storage 126, browser 93, six portability scripts, director campaign 30 checkpoints on pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`); `check-discovery.py` PASS (12/5/1); the save, export, bundle and dirty paths in `src/project-scene.mjs` do not reference the overlay; the three mid-campaign corrections were test-side only. This accepts the memory-only automatic layout overlay for background and presence (F7, F8, E3 option B) and the record's choices (a value already on stage is dropped silently; “(director)” shows only when the value differs from the saved layout; the overlay stays on stage while a reply streams; settlement compares the overlay by identity; the help sentence now names background and presence; and the rest) as the reversible baseline. **With PRs A, B and C merged, M2.3 is complete.** T49 is amended per F10. Still NOT_TESTED: tablet replay (DYL-193 open), real providers; NOT_RUN on the real host: swipe, regenerate and Continue invalidating automatic layout, project replacement under the overlay, removed art under the overlay (Node covers each). **New open question O08**, raised by the record and not ruled here: every manual background and presence choice is locked by default (D4), so the overlay rarely moves anything in a hand-arranged project until a lock is released; whether to add a way to mark a manual choice as a default the director may move is an owner decision for M2.4 planning. This entry does not authorize M2.4, Gate B, DYL-193 closure, live installation or release. Gate B NOT_RUN. Older entries below are historical.

## Owner authorization — M2.3 PR C automatic layout overlay — 2026-11-02

**Approving owner: Dylan. Date: 2026-11-02, America/Phoenix. Status: APPROVED.** With PRs A and B merged and accepted (`89d5abd`, `4561888`; records at `972f91c`, `5411b3c`), the owner was given the F9 choice between building the automatic layout overlay as M2.3's third PR and deferring it to M2.4, with the plan's [section 5.7 arguments](M2_3_DIRECTOR_QUEUEING_PLAN.md#57-take-it-in-m23-or-defer-to-m24) on both sides and a recommendation to build it, and said “Authorize PR C.” This is the separate authorization [F9](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02) required. PR C is implemented as [plan section 5](M2_3_DIRECTOR_QUEUEING_PLAN.md#5-automatic-layout-overlay-e3-option-b) and [section 6 PR C](M2_3_DIRECTOR_QUEUEING_PLAN.md#6-proposed-changes-as-three-sequential-prs) describe, under F7 (background and presence only; outfit stays `NO_AUTOMATIC_LAYOUT`; slot never automatic) and F8 (locked fields skip as `LOCKED`; any manual layout command clears and rebases the whole overlay; manual expressions unaffected): a new pure `src/director-overlay.mjs` over the merged reducer and `applyProposal`, routing in `src/director-session.mjs`, overlay revisions in the proposal token, composition in `src/project-scene.mjs` with `globalState()`, save, export, bundles, `dirty`, `edit` and the plugin untouched, and “(director)” read-outs in `src/stage-view.mjs`. Memory only, per attachment, never persisted; the saved project and all non-chat files must be byte-identical after automatic layout is applied. Evidence standard for a renderer change: full native-host campaign on the pinned host, browser actual-entry suite, `check-discovery.py`, `validate.py` PASS from a committed package; T56 and T57 covered; T49 amended at merge (F10). Tracked by [DYL-203](https://linear.app/devils17/issue/DYL-203/sillynovel-m23-pr-c-automatic-layout-overlay-for-background-and). The owner noted the plan's case for deferral (a self-moving stage as Gate B's first impression; the device-replay question in a renderer slice) and chose to evaluate the complete director at Gate B. This entry authorizes PR C only. It does not authorize M2.4, Gate B, DYL-193 closure, live installation or release. Gate B NOT_RUN. Older entries below are historical.

## Owner acceptance — M2.3 PR B merged — 2026-11-02

**Approving owner: Dylan. Date: 2026-11-02, America/Phoenix. Status: APPROVED.** The owner reviewed the [PR #52](https://github.com/Sonoran-Solutions/SillyNovel/pull/52) summary, including the ten implementation choices in the [PR B record](M2_3_DIRECTOR_IMPLEMENTATION.md#pr-b--composer-hold), and said “Yes, merge it.” Merge commit `4561888`; PR head `10e528cb565b2dae3167c50b01c57e5f42d7e1c8`; frozen `02a3a966b79a4a3db909fa86281707bcf5927032` with byte-identical runtime, based on `972f91c`. [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold) is Done. Independent check before merge, from the repository: the record's eleven-file Node command 251/251; `python3 tests/probes/dyl60/validate.py docs/evidence/m2-3-b/campaign` PASS over 123 frozen inputs and 108 artifact hashes (storage 126, browser 92, six portability scripts, amended director campaign 20 checkpoints on pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`); `check-discovery.py` PASS (11/5/1); `src/host-adapter.mjs` reads only the composer's value length and event timing; the 7.4 MiB package holds only the pinned host's sample placeholder credentials, identical to the M2.2 package. This accepts the read-only composer hold (F3), the `SUPERSEDED` help-text wording (F4), the amended native director probe, and the record's ten choices (a cleared draft releases about 5 s after the clearing event; a non-empty draft is re-checked every 5 s; the adapter wakes the runtime directly; every reply to a typed Send is directed no sooner than 5 s after the last keystroke; and the rest) as the reversible baseline. The native director campaign passes again. T46 is amended per F10. Still NOT_TESTED: tablet replay (DYL-193 open), touch, soft-keyboard and IME composer behaviour, real providers and non-chat-completion backends; the E16 residual for Regenerate, Continue, swipes, slash commands and quick replies on a single-slot backend is NOT_RUN and stays recorded. **PRs A and B complete the authorized part of M2.3. PR C (automatic layout overlay) remains unauthorized; the next owner decision is F9: build it as M2.3's third PR or defer it to M2.4.** This entry does not authorize PR C, M2.4, Gate B, DYL-193 closure, live installation or release. Gate B NOT_RUN. Older entries below are historical.

## Owner acceptance — M2.3 PR A merged — 2026-11-02

**Approving owner: Dylan. Date: 2026-11-02, America/Phoenix. Status: APPROVED.** The owner reviewed the [PR #50](https://github.com/Sonoran-Solutions/SillyNovel/pull/50) summary, including the ten implementation choices in the [PR A record](M2_3_DIRECTOR_IMPLEMENTATION.md#implementation-choices-for-owner-review), and said “Yes, merge it.” Merge commit `89d5abd`; PR head `5907fe3876469f1459002f3504ade0ec2b401829`; frozen `be6a42221fab60119256dcc4c6454e671cb4f57e` with byte-identical runtime, based on `c5d3f50`. [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold) stays In Progress for PR B. Independent check before merge, from the repository: the record's eleven-file Node command 244/244, `tests/m2-director-controller.test.mjs` alone 54/54, `check-discovery.py` PASS (11/5/1); browser, storage and native suites NOT_RUN on the reviewing machine and not required for a pure-module slice under the M2 evidence standard. This accepts the depth-one pending target, explicit streaming gate, catch-up on return to the head and `SUPERSEDED` outcome, and the record's ten choices (gate order departures from plan section 3.2, quiet and impersonate generations ending as cancelled rather than `SUPERSEDED`, a pending target surviving a failed expressions sync, `runtime.onRelease`, and the rest) as the reversible baseline. Known consequence accepted: `tests/probes/m2-director/host.mjs:305` asserts a notice PR A removed, so the native director campaign cannot pass until PR B amends it; the retained M2.2 campaign remains evidence for `d566411` only. T42 is amended per F10. **PR B (composer hold) is authorized under F1 but starts only on the owner's explicit go-ahead after this review**; PR C is not authorized. Gate B NOT_RUN. Older entries below are historical.

## Owner rulings F1–F10 — M2.3 director queueing — 2026-11-02

**Approving owner: Dylan. Date: 2026-11-02, America/Phoenix. Status: APPROVED.** The owner was given the ten decisions in [section 8 of the M2.3 director queueing plan](M2_3_DIRECTOR_QUEUEING_PLAN.md#8-owner-decisions-needed-before-m23-implementation) with a recommendation each, and said “Record all as rulings and merge.” The plan merged at `8cef9a3` ([PR #48](https://github.com/Sonoran-Solutions/SillyNovel/pull/48)). Each ruling adopts the plan's proposed default; the alternatives the plan records are not adopted. Implementation of PRs A and B is tracked by [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold).

| ID | Ruling |
| --- | --- |
| F1 | M2.3 is authorized as the three sequential PRs of plan section 6, each with its own implementation record, frozen SHA and the owner's review before the next starts. **PR A (pending target and stale rules, pure module) and PR B (composer hold, read-only adapter touch) are authorized now.** PR C is ruled under F9. |
| F2 | Queue model: one pending target of depth one. The latest completed head waits; a head superseded before it is requested is never requested and spends nothing; catch-up fires once on returning to the head. This replaces E10's skip-and-count. The bounded FIFO alternative is not adopted. |
| F3 | Composer hold: a director request is deferred while a keystroke in the composer was within about 5 s **or** the draft is non-empty. The adapter reads only the draft's length and `input`/`keydown` events on `#send_textarea`, never its text, and the controller's request input has no field for it. A missing element disables the hold only, with a one-time notice. The 5 s figure is the plan's and may be revised in a later slice. |
| F4 | Send while a director request is outstanding: the late result is discarded as stale before it is read, the outcome is `SUPERSEDED`, not a failure, counted toward the ceiling, never re-anchored or retried. E16's help sentence is replaced by the wording in plan section 3.3; the E16 limitation stays recorded for Regenerate, Continue, swipes, slash commands and quick replies, which the hold cannot see. |
| F5 | Explicit streaming gate: no director request while the reader reports any generation in progress, including other extensions' `quiet` and `impersonate` generations; a pending target waits through it and is replaced or dropped as plan section 4.2 states. |
| F6 | Recovery: E7 stands (90 s abandonment counts one failure, the slot is released only on settlement, pause after three consecutive failures, the project toggle resumes). A pending target fires once after settlement. No automatic resume and no early slot release. |
| F7 | Overlay scope (for PR C): background and presence only. Outfit stays `NO_AUTOMATIC_LAYOUT`; slot is never automatic. |
| F8 | Overlay precedence (for PR C): locked fields are skipped as `LOCKED`; any manual layout command into the global scene clears and rebases the whole overlay; manual expressions are unaffected. The field-by-field rebase alternative is not adopted. |
| F9 | The automatic layout overlay is planned as M2.3's third PR, **not authorized by this entry**. It needs its own owner authorization after PRs A and B have their records; the owner may instead defer it to M2.4 at that point. |
| F10 | TESTING rows T51–T57 of plan section 9 are adopted and added to the regression matrix as NOT_RUN. T42, T46 and T49 are amended when the corresponding PR merges. |

Still settled and not reopened: E1–E16 except as F2 and F4 amend them, O04, O06, D7, manual locks outrank automation, model output is untrusted, no canonical writes. This entry does not authorize PR C, M2.4, Gate B, DYL-193 closure, live installation or release. Gate B NOT_RUN. Older entries below are historical.

## Owner acceptance — M2.2 implementation merged — 2026-11-01

**Approving owner: Dylan. Date: 2026-11-01, America/Phoenix. Status: APPROVED.** The owner reviewed the [PR #46](https://github.com/Sonoran-Solutions/SillyNovel/pull/46) summary, including the eleven implementation choices in [section 8 of the implementation record](M2_2_DIRECTOR_IMPLEMENTATION.md#8-implementation-choices-for-owner-review), and said “Yes, merge it.” Merge commit `f570484dc9975ab543d4b116a198c9ba21dcd6ec`; PR head `19b2a8257647022e0ec806dd252ffe3c8cdab90e`; frozen candidate `d5664119d060d72f90aee4e3a386fdf409843a5c` with byte-identical runtime. [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation) is Done. Independent check before merge, from the repository: `python3 tests/probes/dyl60/validate.py docs/evidence/m2-2/campaign` PASS over 123 frozen inputs and 108 artifact hashes (227 Node, 126 storage, 88 browser, seven native campaigns including the new director campaign on pinned SillyTavern 1.19.0); secret scan found only empty `apiKey` fields in synthetic host settings. Browser, storage and native suites were NOT_RUN on the reviewing machine (pinned host absent); the frozen evidence applies because the runtime is unchanged. This accepts the off-by-default director transport and its section 8 choices (E6 counters kept across chat-switch detach/reopen and reset by Detach, Discard or reload; page-wide in-flight slot; user Stop counted toward the ceiling but not as a failure; invalidated automatic decisions keep their artwork; and the rest) as the current baseline; any may be reversed in a later bounded slice. Still NOT_TESTED: tablet replay of the toggle and ceiling controls (DYL-193 open), real providers, text-completion and instruct backends, real single-slot backends. It does not authorize M2.3, M2.4, Gate B, DYL-193 closure, live installation or release. Gate B NOT_RUN. Older entries below are historical.

## Owner rulings after the M2.2 host probe — 2026-11-01

**Approving owner: Dylan. Date: 2026-11-01, America/Phoenix. Status: APPROVED.** The [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation) implementation session ran the plan's section 2.4 runtime probe on the pinned SillyTavern 1.19.0 host and stopped because three findings contradicted the plan. The owner was given the four resulting proposals with a recommendation each and said “Accept all four.” Probe evidence is recorded in the M2.2 implementation document on its PR.

| ID | Ruling |
| --- | --- |
| E4 (amended) | On streamed replies the host emits `GENERATION_ENDED` before `MESSAGE_RECEIVED`/`CHARACTER_MESSAGE_RENDERED`, so the plan's “ended followed by received” rule never completes. A reply is `complete` when both are observed for the same generation, in either order, with no `GENERATION_STOPPED`. |
| E9 (extended) | The host also expands the angle-bracket markers `<USER>`, `<BOT>`, `<CHAR>`, `<GROUP>` and `<CHARIFNOTGROUP>` (case-insensitive) in raw prompts, which would send persona, card and all group-member names past the O06 limit. These markers are neutralized by inserting a space after `<`, in addition to the brace neutralization, and the synthetic transport tests verify they arrive unchanged. |
| E15 | Settle interval: a director request is issued only about two seconds after the last completed head with no newer completion. A head superseded during the interval is never requested and does not count toward the ceiling. |
| E16 | Send during a director request: on a backend that serves one request at a time, pressing Send while a director request is in flight can leave the user's message without a reply and a host error toast; the message is kept and swipe/regenerate recovers. Accepted as a recorded limitation of the off-by-default director, stated in one sentence in the toggle's help text, recorded as a Gate B evaluation question, and named as input to M2.3 serialization. The host cannot abort the raw request locally, so no M2.2 fix is attempted. |

Everything else in E1–E14 stands. Gate B NOT_RUN. Older entries below are historical.

## Owner rulings E1–E14 — M2.2 director transport — 2026-11-01

**Approving owner: Dylan. Date: 2026-11-01, America/Phoenix. Status: APPROVED.** After the [M2.2 planning proposal](M2_2_DIRECTOR_TRANSPORT_PLAN.md) merged at `2c8a3d9243a0d3c18fc509d2c3d8665671ad3058`, the owner was given each of its section 11 decisions with a recommendation and said “Record all as rulings.” The rulings adopt the plan's proposed default except where stated. Implementation is tracked by [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation).

| ID | Ruling |
| --- | --- |
| E1 | M2.2 implementation as described in plan sections 4–10 is **authorized**, conditional on E4 being part of the same slice. The plan's section 2.4 runtime probe on the pinned host is the first task, before module code. |
| E2 | Host entry point is `generateRawData` plus `extractMessageFromData` through the host adapter. `generateQuietPrompt` and `generateRaw` are excluded. |
| E3 | **Option A.** Automatic expressions apply through the memory-only expressions journal; automatic layout updates are recorded as ignored; location suggestions are shown as text. The owner accepts that the first live director therefore moves expressions only. An automatic layout overlay (option B) is deferred to M2.3 planning. |
| E4 | Add generation status `complete` to the reader model as plan section 4 defines. This changes merged M1 behaviour (manual temporary expressions may apply to a freshly completed head) and requires native-host evidence under the M2 evidence standard. |
| E5 | Per-project enable and ceiling live in host `extensionSettings.sillynovel.director` keyed by project ID. Not in the project schema; never carried by bundles. |
| E6 | A session is one project attachment in one page load. Ceiling is an integer 1–200, default 40. Chat switches do not reset the counter; detach/reopen does. |
| E7 | **Amended from the plan.** A failed request skips that message and counts toward the ceiling; the director pauses automatically after three consecutive failures. A cap hit pauses immediately. A stale result is discarded and is not counted as a failure. The in-flight slot is released only on settlement; a 90 s abandonment discards the eventual result and issues no new request. |
| E8 | `responseLength`, `jsonSchema`, `prefill`, `systemPrompt` and `instructOverride` are not used in M2.2. |
| E9 | Macro neutralization `{{`→`{ {` and `}}`→`} }` on all sent data, with `name: ''` on every message. Refusing to request on braces is rejected. |
| E10 | Request only when the completed head is the current selection; otherwise skip and count. No queue; catch-up belongs to M2.3. |
| E11 | Request only when at least one present actor has a compatible temporary expression; otherwise skip. The gate is in the trigger, not the validator, so Gate B fixture runs are unaffected. |
| E12 | Budgets: 12,000 characters of message text, 4,000 per message with the anchored tail kept, catalog ≤ 4,000 characters, response ≤ 32,768 bytes. |
| E13 | Parser tolerates exactly one optional surrounding code fence and nothing else; everything beyond is refused, never repaired. |
| E14 | Author display labels inside the evidence window are sendable. Card and persona descriptions remain excluded. |

Not changed: Gate B NOT_RUN; M2.3, M2.4, DYL-193 closure, live installation, beta and release remain gated. Older entries below are historical.

## Owner rulings on open decisions — 2026-11-01

**Approving owner: Dylan. Date: 2026-11-01, America/Phoenix. Status: APPROVED.** The owner asked for the list of open rulings with a recommendation on each, then said “Record all as rulings.” Each row below is therefore an owner ruling adopting the stated recommendation. Verification notes inside a ruling (for example confirming a host entry point) are implementation obligations, not conditions on the ruling.

| ID | Ruling |
| --- | --- |
| O04 | The first text-director transport is the host's own generation path on the connection the user already has selected, exposed through the pinned host adapter as a quiet background request that never writes to the chat. No new credential or billing route. A separate director connection profile is a later option, considered only after Gate B evidence. M2.2 planning must verify the quiet-generation entry point on the pinned 1.19.0 host before relying on it. |
| O06 | Director off by default and enabled per project. Content sent is limited to the evidence window the M2.1 module enforces (anchored source plus up to five prior sources, excerpts ≤ 200 characters) and catalog labels; never persona, cards, lorebooks, system prompt, connection settings or images. At most one in-flight request, at most one request per completed message, and a user-settable per-session ceiling defaulting to 40. Any failure or cap hit degrades to manual with a visible notice. |
| D7 | In attached-project mode, director expression changes go to the memory-only expressions journal, the same path as manual expressions. Automatic output never reaches the global reducer's persistent project layout or the plugin schema. |
| O03 | Repository license is GNU AGPL-3.0, matching SillyTavern. `LICENSE` is added with this ruling. Third-party assets and reused code still need their own recorded attribution before release. |
| O02 | Closed by reference: host storage/asset routes were decided by [DYL-47](#tracking-record--2026-10-15-dyl-47) and [DYL-49](#owner-decision--2026-10-15-independent-project-storage) (independent projects with the optional local plugin). No further ruling. |
| DYL-193 | Deferred scaling/200% zoom, reduced-motion, assistive-technology, tablet file-picker/import/export/cleanup and native group branch/copy coverage runs before the Gate B owner session and no later than public beta. It does not precede M2.2. |
| DYL-56 | Remembered project attachment hints stay Backlog. Revisit only if explicit reopening proves tedious during the Gate B session. |
| Process | M2 evidence standard: a pure-module slice (no host adapter, persistence, composer or renderer change) needs focused Node tests plus an implementation record. Full native-host campaigns, storage suites and device replays are required only for slices that touch the host adapter, persistence, the composer or the renderer, or that an owner gate names. Reused evidence is cited by SHA, never presented as fresh. |
| O05 | First image route deferred until Gate B PASS. When taken, local-first through the host's existing image integration before any new cloud adapter. |
| O07 | Plan-backed ChatGPT text access is closed as not pursued. No supported API exists for it and nothing depends on it. |

Not changed by these rulings: Gate B NOT_RUN; M2.2 planning may now start but M2.2 implementation needs its own recorded authorization; no live installation, beta or release. Older entries below are historical.

## Owner acceptance — M2.1 implementation merged — 2026-11-01

**Approving owner: Dylan. Date: 2026-11-01, America/Phoenix. Status: APPROVED.** The owner reviewed the [PR #40](https://github.com/Sonoran-Solutions/SillyNovel/pull/40) summary, including the six implementation choices it left open, and said “Yes, merge it.” Merge commit `c5f1f3d3f8356cebc2805b7b67b22a6a8d76ed7b`; frozen implementation/test SHA `0d80dffc803aecf85a1d87e783d63f24212047a0`. DYL-194 is Done. Independent check before merge: 182/182 Node tests, discovery self-check PASS, `src/scene-reducer.mjs` unchanged, no runtime import of `src/director-proposal.mjs`; browser and storage suites NOT_RUN (pinned host absent, plugin unchanged). This accepts the pure M2.1 module and its recorded D2–D8 defaults and open choices as the current baseline; any of them may still be reversed in a later bounded slice. It does not authorize M2.2 (O04 first text-director transport and O06 usage limits/content scope remain open), M2.3, M2.4, Gate B, DYL-193 closure, live installation or release. Gate B NOT_RUN.

## Owner authorization — M2.1 director implementation — 2026-11-01

**Approving owner: Dylan. Date: 2026-11-01, America/Phoenix. Status: APPROVED (D1).** After merging the [M2.1 planning proposal](M2_1_DIRECTOR_PLAN.md) at `a8fde515ac665c4cd892009c3574eef94dbfec57`, the owner was asked whether the approval covered the plan merge only or also implementation and answered “Authorize M2.1 work.” This records plan decision **D1**: implementation of M2.1 as described in plan sections 3–7 is authorized, tracked by [DYL-194](https://linear.app/devils17/issue/DYL-194/sillynovel-m21-director-proposals-lock-precedence-and-snapshot).

**D2–D8 are not owner rulings.** The owner did not rule on them separately. Implementation proceeds on the plan's proposed defaults as bounded, reversible implementation choices: fixture-only with no transport, provider, prompt or network path (D2); the narrowed v1 operation set (D3); skip-and-record for locked fields (D4); manual expression at the anchored message outranks an automatic one (D5); anchoring at the selected source only (D6); the attached-project journal question deferred to M2.2 planning (D7); the state contract's evidence-window limits (D8). Each is recorded in the implementation PR for owner review and may be reversed there without re-planning.

Authorized: one focused implementation branch and draft PR, pure reducer/validation modules and deterministic Node fixtures, an implementation/evidence document, and the proposed TESTING rows. Not authorized: M2.2 transport or any real director request (O04 and O06 remain open), M2.3 queueing, M2.4 evidence UI, Gate B execution or verdict, DYL-56, DYL-61, DYL-193 closure, schema/persistence/dependency changes, live installation, beta or release. Gate B remains NOT_RUN. Older entries below are historical.

## Gate A verdict — PASS — 2026-11-01

**Owner: Dylan. Date: 2026-11-01, America/Phoenix. Verdict: PASS.** Exact words: “Merge it, you can also record my overall PASS for the gate, I approve of the current build”. Candidate: merged main `e8e9cf673b6455dace67d695ee45d1d3dcc2857c`; runtime identical to frozen and tablet-tested `c5c1699a48629ae761a093e13056f0b11fdc4b88` (every commit after it is documentation or evidence only).

| Field | Record |
| --- | --- |
| Tested surfaces | Not supplied to the repository. The owner did not file the [playtest sheet](M1_4_GATE_A_READINESS.md#6-owner-playtest-sheet--draft-session-not_run), host/browser/device, or per-observation notes; this entry records the owner's verdict statement, not a session log. The owner may append observations later without changing the verdict. |
| Technical evidence behind the candidate | [Frozen campaign and actual Galaxy Tab S8+ keyboard replay](M1_4_DYL60_KEYBOARD_FIX.md) on `c5c1699a48629ae761a093e13056f0b11fdc4b88` |
| Blockers | None stated by the owner. Deferred coverage in [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) remains mandatory before public beta, release or non-disposable use. |
| Next bounded step | M2.1 planning proposal (director proposals, base/overlay locks, snapshot validation on the manual reducer). M2 implementation still requires a separate owner authorization recorded here. |

This PASS closes the M1 human gate for the reader experience as the owner judged it. It does not authorize M2 implementation, DYL-56, DYL-61, live installation, public beta, production use or release; the roadmap's own rule that a PASS does not authorize M2, beta or production stands. Gates B and C remain NOT_RUN. Older entries below are historical.

## Owner amendment — deferred coverage for the first disposable Gate A playtest — 2026-11-01

**Approving owner: Dylan. Date: 2026-11-01, America/Phoenix. Status: APPROVED.** Presented with two options for the surfaces still NOT_TESTED on the merged candidate, a bounded coverage ticket before the playtest or a recorded deferral, the owner chose the deferral with the words “Defer, record amendment.”

> For the first disposable SillyNovel Gate A owner playtest only, the following technical acceptance surfaces are deferred and do not block starting that session: increased text scaling and 200% physical zoom, reduced-motion-enabled operation, assistive-technology operation, tablet touch coverage of file picker, portable bundle import/export and asset cleanup flows, and native group branch/copy with an attached project. They are tracked in [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) and remain mandatory before any public beta, release or non-disposable use. The session runs on merged main `04ce6290c7bb5dab0dd0502e2cde931936796897`, whose runtime equals frozen and tablet-tested `c5c1699a48629ae761a093e13056f0b11fdc4b88`.
>
> Every other requirement stays in force: the approved F1 amendment, PNG-only assets, explicit project reopening, manual four-card groups with duplicate names, native composer/draft/Send/Stop/Continue/swipe safety, source safety and delayed-result isolation, manual locks, native data integrity, and the owner-usability questions. Approximately 20 individual turns and a short native group session remain the minimum exercise. This amendment grants no Gate A verdict, does not schedule the session, and does not authorize M1.3/M2, DYL-56, DYL-61, live installation, public beta, production use or release.

The session materials already exist: [owner playtest sheet](M1_4_GATE_A_READINESS.md#6-owner-playtest-sheet--draft-session-not_run) and [disposable host setup and prepared story](M1_4_DYL60_REPRODUCTION.md). The owner records the verdict in this register as `PASS / REVISE / STOP`, with exact words, date, candidate SHA, tested surfaces, blockers and the next bounded step. Until then **Gate A remains NOT_RUN**. Older entries below are historical.

## Owner acceptance of DYL-60 candidate and PR #34 merge — 2026-11-01

**Approving owner: Dylan. Date: 2026-11-01, America/Phoenix. Status: APPROVED.** The owner reviewed the prepared [PR #34](https://github.com/Sonoran-Solutions/SillyNovel/pull/34) summary and instructed the merge; the owner also accepted closing DYL-60, DYL-62 and DYL-63 as Done. Merge commit `91d638ab933b4dc503b7b88e99be41bd5aa76504`; tested runtime `c5c1699a48629ae761a093e13056f0b11fdc4b88`. This records acceptance of the bounded technical correction and candidate preparation only. It is not a Gate A verdict, not an amendment of F1 or of the remaining physical/assistive acceptance requirements, and not authorization for M1.3/M2, DYL-56, DYL-61, live installation or release. **Gate A remains NOT_RUN.** A separate owner decision on the NOT_TESTED surfaces listed in [STATUS](STATUS.md) is still required before the playtest.

## Owner approvals and DYL-60 authorization — 2026-10-16

**Approving owner: Dylan. Date: 2026-10-16, America/Phoenix. Status: APPROVED.** The owner stated “I agree with those recommendations.” The subsequent explicit assignment identifies all five rulings below and separately authorizes DYL-60 technical preparation. This supersedes the pending choices in the historical M1.4-A proposal below; older records remain historical.

### Decision F — F1 APPROVED for the first disposable Gate A playtest

The full exact amendment from merged PR #33 (`c835afe6e274be3fab5a2862f517fd8e4bca32ad`) follows unchanged:

> For the first disposable SillyNovel Gate A owner playtest only, I amend the persistence and multi-tab writer acceptance as follows. A saved, account-owned independent project must restore its global layout and labeled static-PNG artwork catalog after explicit reopening. Reload and every observed native conversation activation, including A → B → A, start detached; no native chat/project association is remembered. Source-specific manual expression decisions and their artwork are temporary, source/revision/session checked, and disappear on reload, detach, project replacement, disable or conversation switching. Reopening restores the saved global layout, not message-specific scene history or branch history.
>
> For this playtest, atomic expected-revision compare-and-swap, visible conflict refusal, and explicit recovery from an uncertain save receipt replace the original mandatory single-writer/read-only-secondary-tab requirement. Concurrent editors may have unsaved changes; no automatic merge, overwrite, retry or assurance that another tab's draft references are protected is accepted. A conflict or uncertain receipt must retain current edits in memory and require deliberate discard/reopen to inspect committed state before another save or cleanup.
>
> All remaining complete-reader, native composer/draft/send/Stop/Continue/swipe, source-safety, delayed-result isolation, manual-lock, four-member duplicate-name group, native-data-integrity, physical touch/virtual-keyboard, accessibility and owner-usability requirements remain in force. Approximately 20 individual turns and a short native group session remain required on one exact validated candidate. This amendment grants no Gate A verdict and does not execute or schedule that session.
>
> This approval does not authorize persistent source history, durable chat/card/branch correspondence, remembered project attachment or DYL-56, automatic speaker binding/focus, M1.3 implementation, M2, live installation, public beta, production use, release, or a PR merge. Candidate preparation and the owner session require their respective separate authorization. Gate A remains NOT_RUN until the owner's later recorded verdict.

F1 amends only the original persistent message/branch history and mandatory single-writer/read-only-secondary-tab acceptance for this first disposable playtest. F2 remains documented and unselected. Original requirements remain visible in M1_PLAN and TESTING; persistent history and writer exclusion are potential separately authorized future work, not completed capabilities. DYL-16's F rich-content decision is unrelated.

### Decision 2 — PNG-only assets APPROVED

Persistent static PNG support is sufficient for the first disposable Gate A candidate. Persistent JPEG and static WebP support are deferred until separately authorized. Original DYL-22 asset revisions, additional formats and optional attribution requirements remain recorded and are not fully satisfied. Existing actual-byte/decode validation, byte/dimension limits, content integrity, import refusal, backup, compatibility and missing-art protections remain mandatory.

### Decision 3 — explicit project attachment APPROVED

Users deliberately create or open a visual project. Reloading, disabling or switching native conversations detaches it; returning requires explicitly reopening. No native chat/project association is remembered automatically. DYL-56 remembered attachment hints remain unauthorized. The owner playtest will evaluate whether explicit reopening becomes tedious enough to justify future improvements.

### Decision 4 — manual native groups APPROVED

Use four real native cards, two with identical display names, and four distinct manually registered project actors, with three visible sprite slots and at least one offstage actor. Explicit presence, outfit, lock, swap and replace controls and temporary source-specific expressions are required. Manual actor UUIDs remain independent of cards; no automatic native speaker binding, guessed spotlight or stage movement. Technical passes do not establish whether this arrangement is enjoyable; owner usability acceptance remains required.

### Decision 5 — Galaxy Tab S8 technical testing APPROVED

Technical testing on the owner's Samsung Galaxy Tab S8 may use the established paired wireless-ADB connection when available and only a disposable synthetic host over an approved local transport such as ADB reverse. Cover actual touch, portrait/landscape, keyboard/IME, composer visibility/focus/caret, long dialogue/scrolling, project/scene/library controls, native Send/Stop/Continue/Backlog, text scaling/zoom, reduced motion, save/reload/explicit reopen and groups. No invented connection details, new pairing, unlocking, unrelated installation, system setting changes or private data access. If unavailable, continue desktop/integration work and report precise BLOCKED/NOT_TESTED physical and separately unavailable assistive-technology coverage. Viewport emulation is not physical evidence.

### Separate authorization — DYL-60 technical preparation APPROVED

After recording these decisions, begin DYL-60: In Progress, one clean frozen candidate, integrated automated and disposable pinned-host validation, expanded native integrity and branch/copy evidence, deterministic synthetic owner conversation, accessible authorized physical testing, reproducible evidence package and one focused draft PR for senior review. Move to In Review with the package; do not mark Done before owner acceptance. Preserve historical blockers and DYL-22/23 original criteria. Leave DYL-62/63 tracker states unchanged despite their merged implementations.

Stop before the human Gate A playtest: no execution/scheduling or owner verdict, M1.3/M2, persistent message history, automatic speaker binding, writer leases, beta/production hardening, live installation, private data, real-provider requests or PR merge/auto-merge. **Gate A remains NOT_RUN.** DYL-61 remains future release hardening. [Preparation and evidence](M1_4_DYL60_CANDIDATE.md).

## M1.4-A owner decision proposals — 2026-10-16 (NOT approved)

[Decision F comparison and exact proposed F1 amendment](M1_4_GATE_A_READINESS.md#2-decision-f--one-page-owner-comparison) recommend bounded global-project reopen/temporary expressions/CAS acceptance instead of original persistent history/branch restore/single-writer requirements. F2 retains those requirements and needs separately authorized implementation. PNG-only deferral, attachment/group scope and physical-device access remain explicit owner choices. Reader/source/group/native-integrity/device and human-verdict requirements are preserved. **Decision F undecided; Gate A NOT_RUN; DYL-60 Backlog/unstarted.** This is documentation readiness analysis on merged main `f9497aebf59cbeae07a2b6391d0cff17e81bcc76`, not an amendment, freeze, gate verdict, release, M1.3/M2 or execution authorization. DYL-16's historical F rich-content default is a different decision and is unchanged.

## DYL-23-C native group integration — 2026-10-16

Owner explicitly authorizes [native groups with manual independent-project attachment](M1_NATIVE_GROUPS.md), tracked by [DYL-63](https://linear.app/devils17/issue/DYL-63/dyl-23-c-native-group-conversation-integration), after PR #31 merged at `5a9b87f14d5a008e9801aa2260efe40d9e22f5b7`. Native group/chat/activation authority remains separate from account-owned project/manual actor UUIDs and memory-only source expressions. Four or more actors retain three visible slots; duplicate names never bind cards to actors. No schema, native metadata, automatic attachment or persistence expansion. DYL-23 Done/history/acceptance, DYL-55 and DYL-62 unchanged; Decision F undecided; Gate A NOT_RUN; DYL-60 unstarted. [Implementation/evidence](M1_NATIVE_GROUPS_IMPLEMENTATION.md). Older dated entries below are historical.


## DYL-23-B attached temporary expressions — 2026-10-16

Owner explicitly authorizes [memory-only attached message expressions](M1_PROJECT_EXPRESSIONS.md), tracked by [DYL-62](https://linear.app/devils17/issue/DYL-62). Starting main `d3f5761c03fec7fc5d97b0698da718af7af9c187` is the verified PR #30 merge. The project-global layout/catalog remains persistent; explicit actor/outfit-compatible PNG expression choices use a separate bounded activation-only source journal and the existing renderer. No expression-only dirty/revision changes or persistence. [Validation and handoff](M1_PROJECT_EXPRESSIONS_IMPLEMENTATION.md).

Linear DYL-23 reports Done; preserve its original acceptance/history/relationships and the remaining group/device gaps. This assignment authorizes only DYL-23-B, not native groups, persistent history, DYL-60 execution or later milestones. Decision F remains undecided; Gate A NOT_RUN; no live install, release or merge. Older entries below are historical.


## Completion review proposals — 2026-10-15 (NOT owner decisions)

Owner assignment authorizes documentation, acceptance review, Linear planning and one open/unmerged documentation PR only. [Decision package A–G](M1_2_STORAGE_COMPLETION_AND_READINESS.md#11-owner-decision-package), reviewed main `ea65d84a521a39c9ccc977f4cb3643454963d4b8`: recommend **DYL-55 GO for bounded experimental completion; overall M1.2 REVISE**. PRs #23–27 are verified merged and DYL-49–54/57–59 Done; parent DYL-55 remains unfinished, pending explicit owner acceptance/closure approval.

Propose revising DYL-22/23 while preserving historical requirements and blocker relations, temporarily deferring persistent JPEG/WebP in favor of a reusable labeled PNG library, retaining explicit attachment, and explicitly amending Gate A's persistence/writer expectations to global-project reopen/temporary source overlays/CAS. Original group/touch/reader-safety and human-verdict requirements remain. None is approved here. Preferred next implementation is DYL-22's first revised PNG-library slice, only after owner scope authorization.

Planning-only DYL-60 (M1.4 candidate preparation, blocked by DYL-23) and DYL-61 (separate release hardening) were created after duplicate search. No DYL-22/23 unblock/closure, DYL-55 Done, DYL-56 authorization, Gate A verdict/session/schedule, M1.3/M2, production release/live install, native modification, upstream contact or PR merge is authorized. Gate A remains NOT_RUN.

**Status:** user-stated scope, proposed defaults, and measured facts remain distinct. The M1 planning entry records recommendations as they stood before DYL-16; the approved decisions are recorded in the dated owner entry below.

## Confirmed user-stated scope

| ID | Decision | Basis |
| --- | --- | --- |
| U01 | The project is for a better roleplay experience, not primarily a game-development asset studio | Explicit clarification in the project discussion |
| U02 | A visual-novel aesthetic inside SillyTavern chat is the intended direction | Explicit request to explore a SillyTavern extension |
| U03 | The project repository is `Sonoran-Solutions/SillyNovel` | Repository supplied by the owner |
| U04 | ChatGPT subscription use for images is a desired possibility to investigate, not an established integration | Original question about subscription-backed image generation |

No private character canon, relationship details, or unrelated game-art constraints are made part of the project baseline.

## Proposed baseline

| ID | Proposal | Rationale / consequence |
| --- | --- | --- |
| P01 | Ordinary installable UI extension, not a host fork | Keep the project centered on presentation and isolate compatibility work |
| P02 | Canonical conversation and roleplay configuration remain unchanged | Visual errors must not corrupt the roleplay |
| P03 | Manual reader before director before image generation | Validate immersion before adding latency, cost, and provider complexity |
| P04 | Separate visual classification from story authoring | No mandatory tags or machine-readable output format in ordinary RP replies |
| P05 | Stable scene/assets, conservative updates, manual locks | Favor continuity and cheap correction over constant novelty |
| P06 | Namespaced visual metadata and a small host adapter | Make ownership, migrations, and compatibility testable |
| P07 | No automatic cloud/image work by default | Avoid surprise data disclosure and paid requests |
| P08 | One to three visible sprites; retain larger logical group membership | Bound the stage without changing chat participation |
| P09 | Complete-message reader first; precise within-message cues later | Avoid lossy rewriting or an unverified dialogue parser |
| P10 | Explicit human gates A/B/C | Technical passes do not establish a good roleplay experience |
| P11 | No required server plugin in the core | Keep the manual experience usable with a UI extension alone |
| P12 | Provider capabilities verified independently | Text compatibility does not prove image, transparency, or billing support |

## Proposed defaults before DYL-16

The current owner-approved defaults and clarifications are recorded in the DYL-16 entry below.

The extension starts disabled. Enabling it activates manual presentation only. Director and image generation are separately off. Automatic retries and automatic CG creation are off. Typewriter animation is off. Standard chat and the existing composer remain available.

Location, presence, and outfit overrides remain locked until released. Manual expressions affect the selected message only. A later change to these defaults must update the UX, state, tests, and migration notes together.

## Technically resolved questions

| ID | Question | Verified finding and evidence |
| --- | --- | --- |
| O01 | Which actual SillyTavern release/commit and browser form the first tested baseline? | TECHNICALLY RESOLVED — SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Brave `154.1.96.61` on Ubuntu 24.04. See [pinned target](M0_COMPATIBILITY.md#pinned-sillytavern-target) and [M0.2 host validation](M0_LIFECYCLE_VALIDATION.md#m02--final-host-compatibility-validation-2026-10-12), recorded 2026-10-12. |

O01 records the tested environment, not owner approval of a product compatibility policy. Evidence remains tied to the documented candidates; other hosts/browsers remain unverified. The owner accepted the tested-scope M0 verdict and L10 waiver on 2026-10-12; see the DYL-16 owner decision below. M1 authorization is limited to DYL-17 and DYL-19.

## Decisions still needed

Rows O02–O07 were ruled on in the [2026-11-01 owner rulings](#owner-rulings-on-open-decisions--2026-11-01); O08 was ruled on 2026-11-02 (G8). The table is retained for the original questions.

| ID | Question | Resolution |
| --- | --- | --- |
| O02 | Which host-supported storage/asset routes meet user scoping and save-safety needs? | RESOLVED by DYL-47/DYL-49; closed by reference 2026-11-01 |
| O03 | Which source license should the repository use? | RESOLVED: AGPL-3.0, 2026-11-01 |
| O04 | Which one text-director transport should be exercised first? | RESOLVED: host generation path on the user's selected connection, 2026-11-01 |
| O05 | Which image route should be the first real adapter? | DEFERRED until Gate B PASS; local-first, 2026-11-01 |
| O06 | What usage limits and content-sharing scope will the owner enable? | RESOLVED: evidence window only, one in flight, per-session ceiling 40, 2026-11-01 |
| O07 | Is plan-backed ChatGPT text access worth a separate integration spike? | CLOSED, not pursued, 2026-11-01 |
| O08 | Should a manual background or presence choice be markable as a default the director may move, given that D4 locks every manual choice and the M2.3 overlay therefore rarely moves a hand-arranged project? | RESOLVED: option A, per-field “director may move this” over the existing lock flags, no schema change, default stays locked ([G8](#owner-rulings-g1g14--m24-evidence-ui-corrections-and-gate-b--2026-11-02), 2026-11-02) |

These questions do not block documentation or the manual compatibility shell. Do not answer them by silently treating an example configuration as a user decision.

## Historical M1 planning entry — 2026-10-12, DYL-15

[M1_PLAN.md](M1_PLAN.md) narrows the existing UX/state/asset baseline into reviewable contracts. Its decision table distinguishes requirements, proposed defaults, owner decisions in DYL-16, and technical proofs in DYL-19. **Approving person: none; owner review pending.** It does not authorize M1 runtime work, accept M0, or approve the L10 waiver. Gate A remains NOT_RUN.

At planning time these defaults were proposals. The owner decision below approves A–G with clarifications; the historical planning record is retained as written.

Affected documents: [roadmap](ROADMAP.md), [status](STATUS.md), and the new [reader plan](M1_PLAN.md), which refines [UX](UX_SPEC.md), [architecture](ARCHITECTURE.md), [state](STATE_AND_DIRECTOR.md) and [assets](ASSETS_AND_PROVIDERS.md) without rewriting historical evidence. No existing owner approval is superseded. DYL-16 must record the owner's actual statement/date/scope before approved defaults or implementation authorization are added here.

## Changing decisions

Add a new entry with status, date, rationale, affected documents, and approving person where applicable. Preserve superseded decisions and link their replacements. Keep user statements, agent recommendations, measured findings, and owner approvals distinct.

## Owner decision — 2026-10-12, DYL-16

**Approving owner:** Dylan (explicit response in the working chat, 2026-10-12). **Status:** APPROVED for the exact scope below. This supersedes the pending owner questions and agent recommendations recorded in the DYL-15 planning entry; it does not expand beyond the authorized tickets.

### M0 and L10

- Accept the L10 waiver for the tested persistent-chat workflow on the pinned SillyTavern host. Record L10 as **UNSUPPORTED / WAIVED**, never HOST PASS. Retain synthetic empty-source regression coverage. Revisit the waiver if a supported reachable workflow is later demonstrated.
- Approve M0 **PASS for the explicitly documented scope and evidence limits**. Do not claim real model/provider inference or compatibility beyond the documented host/browser/candidate evidence. Add a short current-main-head regression smoke check to DYL-17's pinned-host validation; this does not reopen M0.

### M1 defaults A–G

- **A — Reader layout:** Scene reader is the default; hide the native feed only after successful mount. Preserve native composer/send/stop and immediate Back to Chat. Permanent side-by-side mode is not required for M1.
- **B — Reading/navigation:** Preserve whole-message pinned navigation and independent text-scroll position during streaming.
- **C — Character identity:** Permit explicit manual resolution to distinguishable cards within verified scope. Unresolved identity must not block reading or unrelated scene controls.
- **D — Assets/storage:** Prefer verified host storage. Browser-local persistence needs its own explicit proposal and approval.
- **E — Manual controls:** Locks protect manual choices against automatic or delayed changes, not deliberate user replacements. Slots stay stable and are never automatically evicted.
- **F — Rich content:** Require readable ordinary formatting. Use plain-text/native-view fallback only for unsupported or unsafe content.
- **G — Persistence/writers:** Use a verified single-visual-writer policy with clear ownership and recovery. Other tabs retain ordinary chat access. Make no untested cross-device concurrency claims.

### Authorization and limits

- Authorize **DYL-17** and **DYL-19** in parallel, on separate branches with coordinated file ownership and separate PRs left open for review. DYL-19 is a bounded proof task, not authorization to implement the asset library or persistence system.
- Keep **DYL-18 and later implementation tickets blocked** pending prerequisites and separate authorization. Gate A remains NOT_RUN; M2 is not authorized.
- Record DYL-16's decisions and links before closing the owner gate. DYL-17 and DYL-19 are authorized but remain unstarted until their own work begins.

Affected documents: [status](STATUS.md), [M1 reader plan](M1_PLAN.md), and [roadmap](ROADMAP.md). Affected issues: [DYL-16](https://linear.app/devils17/issue/DYL-16/sillynovel-m10-b-owner-decision-on-m0l10-and-m1-implementation-scope), [DYL-17](https://linear.app/devils17/issue/DYL-17/sillynovel-m11-a-build-the-reader-source-model-and-streaming-safe), [DYL-18](https://linear.app/devils17/issue/DYL-18/sillynovel-m11-b-ship-the-text-reader-backlog-handoff-and-composer), and [DYL-19](https://linear.app/devils17/issue/DYL-19/sillynovel-m12-a-prove-chatcard-identity-and-assetmetadata-storage).


## Owner assignment — 2026-10-12, DYL-18

The repository owner explicitly assigned the pasted “SillyNovel DYL-18: Implement the First Usable Text Reader” prompt in Codex on 2026-10-12 (America/Phoenix). The assignment authorizes DYL-18 only, after PR #6 / DYL-19 and PR #7 / DYL-17 merged. [Linear assignment record](https://linear.app/devils17/issue/DYL-18/sillynovel-m11-b-ship-the-text-reader-backlog-handoff-and-composer). Deliver one focused open/unmerged PR and leave the issue In Review. This supersedes the earlier DYL-18 authorization hold, not the DYL-19 storage findings or any human gate.

The implementation reuses the existing source model and installed host Markdown/sanitizer libraries. Backlog also serves as Open Original Message; duplicate controls were removed to prioritize dialogue on narrow screens. Following the PR #8 P2 review, native handoff scrolls to a matching candidate when available but always reports unresolved correspondence on the pinned host, which exposes no rendered source/revision token. Exact success requires a verified read-only host seam; unrendered history uses native fallback. These are bounded engineering choices documented in the [reader contract](M1_READER_SOURCE.md#dyl-18-reader-ui-contract), not new owner approvals. No persistence, art, later milestone work, merge authorization or Gate A verdict is inferred.

## Owner decision and bounded assignment — 2026-10-12, DYL-26

**Approving owner:** Dylan, via the DYL-26 assignment in Codex on 2026-10-12 (America/Phoenix). Exact supplied statement: “The owner has approved the DYL-24 session-only visual-stage test.” Record **PASS for the bounded session-only prototype**. This is not Gate A PASS: durable visual state, imports, reload recovery and the full acceptance session remain outstanding. Gate A remains **NOT_RUN**.

The assignment authorizes **DYL-26 only**, an isolated technical feasibility spike of DYL-25's host-owned storage proposal, on a disposable SillyTavern 1.19.0 checkout at `7e8663cd9c184a550b37238218bdd32c6efc68e9`. It authorizes a reproducible test-only host patch/fixture and one open, unmerged SillyNovel PR. It does not select an architecture for release or authorize production persistence, live-host changes, a permanent fork, an upstream issue/PR, a required server plugin, DYL-22/23, M1.3, or M2. DYL-22/23 blockers remain.

The [spike report](M1_HOST_STORAGE_SPIKE.md) distinguishes experimental identity enrollment and activation from existing supported host behavior. These bounded test choices and its recommendation are engineering findings, not further owner approvals.

## Owner assignment — 2026-10-12, DYL-27

The owner's pasted DYL-27 assignment authorizes one native identity/activation feasibility experiment after merged PR #13, using a disposable pinned SillyTavern checkout and fresh synthetic data. It authorizes one open/unmerged PR only; no installed-host changes, permanent fork, production persistence, upstream publication, required plugin, DYL-22/23, M1.3, Gate A or M2. The [DYL-27 report](M1_NATIVE_IDENTITY_ACTIVATION.md) records engineering findings and bounded design choices, **not owner approval** of the registry, migration or release architecture. Recommendation remains REVISE; subsequent work needs its own authorization.


## Owner assignment and bounded engineering findings — 2026-10-14, DYL-42

The owner's pasted DYL-42 assignment authorizes one disposable pinned-host writer-coverage proof and one focused open/unmerged PR, after PR #15 merged and DYL-28 became Done. It does not authorize production persistence, migration/recovery, upstream publication, a permanent fork, a required plugin or later milestones. The [writer report](M1_NATIVE_WRITER_COVERAGE.md) records fresh-import enrollment, no-op source revisions, conservative collision/pending refusal and blanket group visual refusal as **experimental engineering choices**, not owner-approved release policy. Recommendation: REVISE; no new human gate verdict. DYL-22/23 blockers remain, DYL-24 stays session-only, M1.3 remains unauthorized and Gate A NOT_RUN.

## Owner assignment — 2026-10-14, DYL-44

The owner's pasted M1.2-J assignment authorizes only [DYL-44](https://linear.app/devils17/issue/DYL-44/sillynovel-m12-j-prove-host-owned-lifecycle-reservations-and-write): a disposable pinned-host lifecycle reservation/write-generation investigation and one OPEN/UNMERGED experimental PR. PR #17 is verified merged and DYL-43 Done; its REVISE outcome is retained. The store-wide reservation, conservative scope refusal, and generation binding in the [report](M1_NATIVE_LIFECYCLE_GENERATIONS.md) are bounded engineering choices, not approved production architecture. Unknown writers and whole-root restore remain outside the proven guarantee. No production persistence, permanent fork, upstream publication, recovery/re-enrollment policy, DYL-22/23 implementation, M1.3/M2 or Gate A verdict is authorized.


## Owner assignment and experimental findings — 2026-10-14, DYL-46

The pasted “SillyNovel M1.2-L: External Authority Reconciliation and Safe Failure Recovery” assignment authorizes this bounded investigation and one open/unmerged experimental PR after PR #19 merged / DYL-45 Done. [DYL-46 report](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md) records forward-only clean-abort and coordinated read-revocation engineering choices, **not owner approval** of a release or replacement compatibility contract.

Measured recommendation **REVISE; compatibility REQUEST CHANGES / HOLD**. The unchanged writer suite is fully passing; lifecycle and other predecessor campaigns retain documented failures and unreached suffixes. A failed observation with no durable external intent cannot survive unknown byte restoration plus restart. Owner decisions about durable failure evidence, scoped availability, writer exclusion and authority ownership remain open. No issue Done, merge, production persistence, DYL-22/23 unblock, M1.3/M2 authorization or Gate A verdict is inferred.


## DYL-46 senior-review correction assignment — 2026-10-15

The owner supplied the senior review of PR #20 head `20086abbdbe82087cd98ffef842faca8a8be8fb1`, requesting durable refusal evidence for failed observations and an explicit completed-revocation transition at verified post-revocation native failures. Those two experimental corrections remain within DYL-46 and PR #20. [Current correction record](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md#pr-20-review-corrections--2026-10-15) distinguishes tested changes from owner verdicts.

The chosen engineering contract journals identity-bearing seal validation in independent authority before inspecting canonical seals; unfinished validation refuses across restart and may sacrifice whole-store availability even for a healthy interrupted read. The explicit inspected pre-native throw after durable revocation may finalize VERIFIED_REVOCATION, never clean abort. Partial canonical writes and unclassified failures remain refused. These choices are not production policy approval, permission to reconstruct missing witness history, or a blanket waiver of old assertions.

The new failed-observation refusal and completed-revocation proofs pass; inherited lifecycle still fails later at partial mutation, DYL-44/45 expectations remain unresolved, and unchanged Chromium is 23/24. Recommendation REVISE / compatibility HOLD. Keep PR #20 open/unmerged and DYL-46 In Review; downstream blockers and Gate A NOT_RUN remain.

## Owner-approved DYL-46 replacement expectations — 2026-10-15

**Approving owner:** explicit replies in the working chat, 2026-10-15. **Status: APPROVED for these experimental contracts only.** In response to the concrete reviewed PR #20 evidence, the owner answered “Approve conservative store-wide refusal” for a partially committed native rename, replacing DYL-43's scoped-refusal expectation with whole-store/restart refusal. The owner also answered “Approve both replacement expectations” for DYL-45: scoped 400 INVALID_TARGET after VERIFIED_REVOCATION, and forward clean-abort completion for the specifically inspected malformed JSONL header rejections.

This supersedes the prior pending owner decisions for those exact expectations. It does not authorize clearing indeterminate intent, treating partial writes as clean aborts, relaxing root-rollback refusal, or describing test-fixture resets as host recovery. The original campaign results/assertions remain historical evidence; updated overlay assertions must prove the approved refusal, unchanged old records and restart behavior before continuing independent fault episodes.

The re-review also authorizes the narrow browser-assertion correction, verification against current main and PR, and an external-before-local forward-only proof. It does not approve a production recovery service, merge PR #20, mark DYL-46 Done, unblock DYL-22/23, authorize M1.3/M2, or supply Gate A PASS.

# Tracking record — 2026-10-15, DYL-47

The owner-provided M1.2-M checkpoint authorization created [DYL-47](https://linear.app/devils17/issue/DYL-47/sillynovel-m12-m-decide-production-storage-architecture-and) after searching for an equivalent post-DYL-46 issue. It is In Review, blocked by completed DYL-46, and related to DYL-25, DYL-22, and DYL-23. The checkpoint is documented in [M1_STORAGE_ARCHITECTURE_CHECKPOINT.md](M1_STORAGE_ARCHITECTURE_CHECKPOINT.md).

The document recommends an upstream host API with session-only fallback as **PROPOSED**. This tracking entry records no owner selection, upstream engagement/submission approval, production persistence approval, DYL-22/23 authorization, M1.3/M2 authorization, or Gate A verdict. All existing gates remain unchanged.


## Owner assignment and engineering recommendation — 2026-10-15, DYL-48

The owner's pasted M1.2-N assignment authorizes preparing upstream proposal drafts for review only, after merged PR #21 and completed DYL-47. It does not select DYL-47's architecture or authorize upstream submission/contact, host source changes, API implementation, companion/plugin/service, production persistence, DYL-22/23, M1.3/M2 or Gate A changes.

[Public draft](UPSTREAM_HOST_CAPABILITY_REQUEST.md) and [technical decision package](UPSTREAM_HOST_CAPABILITY_TECHNICAL.md) recommend leading with general authenticated identity/lifecycle/targeted conditional per-chat extension records. Assets and portability remain separately discussable. Existing upstream #5265 overlaps enough to recommend an initial contribution there after explicit owner approval, rather than automatically opening a duplicate; #5865/#6122 and asset request #5269 are related. This is a **PROPOSED engineering recommendation**, with no change to DYL-47's architecture ranking or production gates. **NOT_SUBMITTED**. Owner must approve wording, venue/message and commitments before any engagement. No new owner ruling on recovery, backup or release scope is inferred.

## Owner decision — 2026-10-15: independent project storage

**Independent SillyNovel projects and an optional local storage plugin are approved for planning and the first bounded implementation slice.** Approving owner: Dylan, explicit pasted assignment in Codex on 2026-10-15. This supersedes the previously preferred upstream-API implementation path, not DYL-47/48's historical findings. Upstream remains ON HOLD / NOT_SUBMITTED; no contact authorized.

[Active contract](M1_INDEPENDENT_PROJECT_STORAGE.md): projects own visual state and assets; explicit user binding grants page-local use with a conversation. Native hints never grant ownership; switching chats detaches. Persist global visual configuration only; message history needs separate review. Preserve canonical host data, transient fallback, source safeguards, locks and safe rendering. Authorize the create/import background + two sprites/arrange/save/reload/explicit reopen slice and disposable-host verification, not export/import, duplication, remembered associations, groups, generation, director, M1.3/M2, live installation or production release. DYL-22/23 statuses/blockers remain unchanged. Gate A NOT_RUN. Dedicated planning and implementation PRs remain open/unmerged.

## Owner assignment — 2026-10-15, DYL-55 / DYL-57

The owner explicitly authorizes portable independent project export/import and subdivision of DYL-55 into DYL-57 (implementation), DYL-58 (Backlog database recovery/migrations), DYL-59 (Backlog asset cleanup). This does not accept the parent or change its DYL-54 dependency; inspection found DYL-54 already Done. One focused OPEN/UNMERGED PR; no live installation, production release, restore, association hints, persistent expressions/groups, core modifications, upstream contact, M1.3/M2 or Gate A changes. [Contract and engineering rationale](M1_PROJECT_PORTABILITY.md). The strict JSON/base64 container and smaller experimental resource ceilings are implementation choices, not new owner-approved production policy.

## Owner assignment and engineering choices — 2026-10-15, DYL-58

The pasted DYL-58 assignment explicitly authorizes one focused implementation PR for local SQLite backup, offline validation, empty-destination disposable recovery, migration readiness, tests/docs and issue updates after completed DYL-57. No live host, existing-store overwrite, HTTP administration, automatic restore, account changes, cloud backup, cleanup, associations, PR merge, production release, M1.3/M2 or Gate A approval. [Contract](M1_PROJECT_DATABASE_RECOVERY.md); [evidence](M1_PROJECT_DATABASE_RECOVERY_IMPLEMENTATION.md).

Engineering choices within that scope: official SQLite backup API with no raw-copy fallback; strict two-file manifest/snapshot format; restore targets an absent `.sillynovel-projects.sqlite` slot in an independently provisioned stopped host; verify persisted exact account `(handle, created)` through the pinned node-persist layout; publish complete validated files with exclusive same-filesystem hardlinks; preserve schema v1 and refuse unknown/incomplete versions. Private POSIX paths, limits and runtime ceilings are bounded implementation choices for review, not new owner-approved production policy. No account mapping or manufactured v2 transition. DYL-55 stays unfinished; DYL-59/56 Backlog, DYL-22/23 blocked, upstream on hold, Gate A NOT_RUN.

## Owner assignment — 2026-10-15, DYL-59

The pasted assignment explicitly authorizes project-scoped inspection and selected unreferenced-asset deletion, authenticated revision/inventory/reference checks, quota recovery and disposable-host validation, with one open/unmerged PR. Verified prerequisites: DYL-57/58 Done; PR #25 merged at `4337a05ac8321e714a9677d6a408aa3ee37bbcbf`, PR #26 and starting main `b37a60615795d8871171504de88da8d10afddf9e`. DYL-59 moved from Backlog to In Progress; DYL-55 remains unfinished and all other gates retain their prior state.

[Contract](M1_PROJECT_ASSET_CLEANUP.md): reuse schema v1 and the synchronous SQLite transaction helper. A server-computed state digest plus authoritative transactional revalidation binds the owner/project/revision/inventory; no persistent reservations or schema changes are necessary. Refuse current dirty/pending work and explicitly warn that other clients' unsaved references cannot be discovered. These are bounded engineering choices implementing the assignment, not newly approved production limits or a claim of cross-tab memory safety. No automatic cleanup, compaction, native writes, project deletion, restore, live deployment, release, merge, DYL-56, M1.3/M2 or Gate A verdict is authorized.

## Owner assignment — 2026-10-15, DYL-22 first PNG-library slice

The owner explicitly authorized the first residual DYL-22 slice. [Workflow and storage contract](M1_PNG_ASSET_LIBRARY.md): project-owned labels/categories, durable alternatives and explicit reselection, shared immutable PNG bytes, catalog-aware cleanup, transactional schema-v1→v2 upgrade and compatible full-store recovery. Portable v1 copies still include selected artwork only, without library labels/alternatives. [Implementation/evidence](M1_PNG_ASSET_LIBRARY_IMPLEMENTATION.md). PR #28 is merged at starting main `262aad7b64624845e68f783bf779a6fd5e4689d4`.

This is a bounded implementation for review; historical blockers and original JPEG/static-WebP requirements remain. DYL-55 stays pending owner acceptance, DYL-23 separately gated, Decision F undecided and Gate A NOT_RUN. DYL-56/60 and M1.3/M2, production/release and upstream authorization are unchanged. Older entries below retain their original evidence/scope.

## PR #29 senior-review correction — 2026-10-16

The owner returned REVISE: automatic in-place startup migration conflicted with DYL-58 preservation/copy-on-new-output policy. No in-place exception was approved. The correction implements that policy: v1 startup refuses without mutation, and the explicit operator CLI transforms a verified preserved v1 backup into a new empty stopped-host slot, retaining both original and backup after success. [Correction and validation](M1_PNG_ASSET_LIBRARY_REVIEW_CORRECTION.md). The owner also explicitly approved publishing the factual DYL-22 PR/test/scope handoff including this finding; it was posted and DYL-22 set In Review with description/acceptance/blockers unchanged. DYL-55 status inconsistency is separately owner-reconciled; no reversal here. DYL-23, Decision F and Gate A remain gated/undecided/NOT_RUN respectively.


## Owner assignment — 2026-10-16, DYL-23-A

The pasted assignment explicitly authorizes only the first manual-stage/project UX integration slice on merged PR #29: incremental control organization, readable attachment/global-layout/library/save/recovery state, selection/lock feedback, responsive/keyboard improvements, regressions, actual disposable-host UI evidence and one draft/open/unmerged PR for senior review. DYL-23 may move In Progress then In Review; original acceptance/dependencies remain. No change to Decision F, Gate A NOT_RUN, DYL-55, DYL-60 execution, attached source expressions/groups, persistent message history, M1.3/M2 or release. [Workflow and bounded engineering choices](M1_MANUAL_STAGE_UX.md). Requiring explicit reopen after conflict/uncertain saves and waiting for pending save before project replacement are conservative implementation choices for review, not new owner rulings on the broader writer/persistence gate.
