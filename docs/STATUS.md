# Project status

## Post-Gate-B cleanup candidate (draft, unmerged) — 2026-11-03

A small runtime change for owner review, [record](POST_GATE_B_CLEANUP.md): the Scene panel read-out no longer prints `undefined` when an overlay background's art was removed (PR D finding 1); the notice after Send during a director request now reads “Director request set aside for your reply”, outcome `SUPERSEDED` unchanged (finding 3); `tests/probes/m2-gate-b/run.mjs` exits after “Finished” (its losing race timers were referenced); the storage plugin README says `dataRoot` must be absolute. Finding 2 has proposed T60 wording for acceptance at merge; finding 4 is unchanged by design. Rebased onto `22b774d`; full campaign on a disposable pinned SillyTavern 1.19.0 host at `67d6207`: Node 371, storage 126, browser 103, seven native campaigns, `validate.py` PASS. Gate C NOT_RUN.

## M3.1 PR A candidate (draft, unmerged) — 2026-11-03

The pure image-workflow module is implemented on frozen `4b3a300` for owner review under [DYL-207](https://linear.app/devils17/issue/DYL-207/sillynovel-m31-manual-image-exchange-promptreference-export-explicit): draft checks with UTF-8 ceilings and strict keys, the one export text that the preview, Copy and Download share, fixed filenames, catalog and hash checks for at most three references, and the capture rule that refuses a delayed step after detach, a draft edit or A → B → A. Nothing imports it yet; runtime unchanged. Node 371/371 (9 new), discovery PASS 15/5/1; browser, storage and native NOT_RUN for a pure-module slice (H4). See the [record](M3_1_IMAGE_WORKFLOW_IMPLEMENTATION.md). PR B waits for the owner's review. Gate C NOT_RUN.

## M3.1 authorized (PRs A and B) — 2026-11-03

The owner [ruled on H1–H11](DECISIONS.md#owner-rulings-h1h11--m31-image-workflow--2026-11-03) on the [M3.1 plan](M3_1_IMAGE_WORKFLOW_PLAN.md): M3.1 is authorized as two sequential PRs tracked by [DYL-207](https://linear.app/devils17/issue/DYL-207/sillynovel-m31-manual-image-exchange-promptreference-export-explicit), PR A (pure draft validator and export text builder, Node evidence) and then PR B (Image workflow disclosure, reference downloads, local preview, “Import and apply background”; full campaign). No image provider in M3.1. H3, H5, H6 and H7, including O05's first route, are deferred to M3.2 planning; H8, delegated to the agent, is an optional director session after M3.1. TESTING rows T69–T80 added as NOT_RUN. Runtime unchanged by this entry. Gate C NOT_RUN.

## M3.1 planning proposal (NOT approved) — 2026-11-03

The [M3.1 image workflow plan](M3_1_IMAGE_WORKFLOW_PLAN.md) proposes M3 in the roadmap's order: M3.1 manual prompt/reference export and explicit PNG import into the existing library with no provider; M3.2 one manual missing-background request through the host's Image Generation extension on standard local ComfyUI (an answer to O05, from 1.18.0 source only, NOT_VERIFIED on 1.19.0); M3.3 approval, cache, stale-job, privacy and usage-limit controls; M3.4 further adapters later. It lists owner decisions H1–H11 with a recommendation each, maps every Gate C demonstration to a slice, and proposes T69–T80 as NOT_RUN. **It authorizes nothing**; runtime unchanged. Gate C NOT_RUN.

## Gate B verdict PASS — 2026-11-03

The owner [recorded PASS](DECISIONS.md#gate-b-verdict--pass--2026-11-03) on candidate `6799a5e` in their own words, choosing to skip the session lines; the [Gate B record](evidence/gate-b/record.md) holds the hard gates, the DYL-193 evidence and the fixture counts, and NOT_RUN for every session and E16 line. The session host was the owner's regular SillyTavern 1.18.0 install with the candidate and its storage plugin installed on the owner's word. Nothing further is authorized: no beta, release or wider installation; the NOT_TESTED surfaces of DYL-193 and the four open PR D findings stand.

## Gate B owner's session authorized — 2026-11-03

The owner [authorized](DECISIONS.md#owner-authorization--gate-b-owners-session-on-candidate-6799a5e--2026-11-03) step 5: the owner's own session under the plan 6.3 protocol on candidate `6799a5e`, on a disposable or backed-up host of the owner's choice (G10), not yet named. Not yet run. Step 6, the verdict, waits on the session. Gate B NOT_RUN.

## Gate B fixture evaluation run on candidate 6799a5e — candidate, unmerged — 2026-11-03

Step 4 ran once, as [authorized](DECISIONS.md#owner-authorization--gate-b-fixture-evaluation-on-candidate-6799a5e--2026-11-03), on the [owner's regular install](DECISIONS.md#owner-decision--gate-b-fixture-run-on-the-owners-regular-sillytavern-install--2026-11-03) (SillyTavern 1.18.0, a recorded deviation from the pin) with the runtime served from a checkout at `6799a5e`. 40 cases sent through the product's request path on the owner's hand-selected connection (OpenRouter chat completion, model Xiaomi MiMo-V2.6-Pro, provider DeepInfra, no fallback models or providers); 36 scored, 4 refused as `NOT_SINGLE_JSON` (hypothetical travel 1, group authorship 1, user locks 2), 0 failed, 0 not run; elapsed 542 ms min, 1681 ms median, 12889 ms max. Counts per category and field are in the [Gate B record](evidence/gate-b/record.md) and [`fixture/score.txt`](evidence/gate-b/fixture/score.txt): background 34 correct and 2 incorrect (both flashbacks), presence 79 correct and 1 incorrect (flashbacks), expression 65 correct and 15 incorrect, outfit 10 correct with 1 outfit update noted, 4 locked skips in user locks. No aggregate and no percentage, by ruling; no fixture answer changed. The runner printed “Finished” and then stayed alive until it was sent SIGTERM, a test-file observation that touched no result. Steps 5 and 6 stay unauthorized. Gate B NOT_RUN.

## Gate B fixture evaluation authorized — 2026-11-03

The owner [authorized](DECISIONS.md#owner-authorization--gate-b-fixture-evaluation-on-candidate-6799a5e--2026-11-03) step 4: one run of the 40 frozen cases through the product's request path on the connection the owner selects by hand at run time, from a checkout at candidate `6799a5e`, results committed under `docs/evidence/gate-b/` and counts copied into the Gate B record with no percentage. Not yet run. Steps 5 and 6 stay unauthorized. Gate B NOT_RUN.

## DYL-193 replay merged; Gate B step 3 complete — 2026-11-03

The owner [accepted](DECISIONS.md#owner-acceptance--dyl-193-replay-merged-on-gate-b-candidate-6799a5e--2026-11-03) the replay ([PR #71](https://github.com/Sonoran-Solutions/SillyNovel/pull/71), merge `cf31c38`, head `62a1f16`) with the runtime still byte-identical to candidate `6799a5e`. Tablet text scaling, reduced motion and screen readers on both platforms stay NOT_TESTED and are claimed by nothing. [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) is Done. Step 4, the fixture evaluation, waits on its own authorization. Gate B NOT_RUN.

## DYL-193 replay on candidate 6799a5e — candidate, unmerged — 2026-11-02

Step 3 ran with the runtime byte-identical to the [frozen candidate](DECISIONS.md#gate-b-candidate-frozen--6799a5e--2026-11-02) `6799a5e` (test files only were added). [Record](DYL_193_REPLAY_RECORD.md); package [`docs/evidence/dyl193/`](evidence/dyl193/), `validate.py` PASS. Native group branch and checkpoint with an attached project: TESTED PASS on the pinned host. Desktop scaling (200 % zoom, root font 200 %, host font scale 2) and emulated reduced motion: SYNTHETIC PASS. On the owner's word (“Yes, launch it”) the Galaxy Tab S8+ was driven as at Gate A through Brave's own debugging socket: reply field reachable with the disclosure open and with the Samsung keyboard open, a real pinch to 2.0 with the reader, disclosure, reply field and navigation reachable by panning, file pickers and cleanup by touch TESTED PASS; export and import PASS bounded. Tablet text scaling, reduced motion and TalkBack stay NOT_TESTED because they are device settings the replay never changes; no screen reader was run anywhere, and the synthetic accessibility-tree row substitutes for nothing. No defect found; no runtime change. Steps 4 to 6 unauthorized; Gate B NOT_RUN.

## DYL-193 replay authorized on the candidate — 2026-11-02

The owner [authorized](DECISIONS.md#owner-authorization--dyl-193-replay-on-gate-b-candidate-6799a5e--2026-11-02) step 3 of the Gate B sequence: the [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) replay on candidate `6799a5e`, in the `docs/evidence/dyl60/` layout, with the tablet rows on the paired Galaxy Tab S8+ when it is reachable and BLOCKED otherwise, assistive technology honest as NOT_TESTED unless actually run, and no runtime change. Steps 4 to 6 stay unauthorized. Gate B NOT_RUN.

## Gate B candidate frozen — 2026-11-02

The owner [froze](DECISIONS.md#gate-b-candidate-frozen--6799a5e--2026-11-02) main `6799a5e` as the Gate B candidate on the M2.4 PR D campaign evidence (runtime and tests byte-identical to `e37d6b5`; `validate.py` and `check-discovery.py` reproduced PASS from the candidate). The [Gate B record](evidence/gate-b/record.md) is started with the candidate and hard-gate fields only. Next, on its own go-ahead: the [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) replay on this SHA, whose physical rows (tablet, 200% zoom, reduced motion, screen reader, touch flows) need the owner's devices. Then the fixture run, the owner's session and the verdict. Any runtime change makes a new candidate. Gate B NOT_RUN.

## M2.4 complete; Gate B sequence next — 2026-11-02

PR D [accepted and merged](DECISIONS.md#owner-acceptance--m24-pr-d-merged-m24-complete--2026-11-02) at `9797c47` (frozen `e37d6b5`, runtime byte-identical to the PR C merge `34dfcd8`): the 40 frozen fixture cases (expected-answers SHA-256 `ada4ff1e…cacf5`), the scorer with no aggregate percentage, the loopback-proven runner, 13 new native checkpoints and the [Gate B record template](GATE_B_RECORD_TEMPLATE.md) are on main; see the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-d--gate-b-readiness). [DYL-206](https://linear.app/devils17/issue/DYL-206/sillynovel-m24-pr-d-gate-b-readiness-fixtures-scorer-runner-native) is Done. M2.4 (PRs A–D) is complete; the four findings from PR D are recorded open, none fixed. No fixture case has been measured and no accuracy figure exists. Next is the [Gate B sequence](M2_4_EVIDENCE_UI_PLAN.md#61-sequence), each step on its own recorded authorization: frozen candidate, [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) replay, fixture run (40 requests on the owner's named connection), the owner's session, the owner's verdict. Gate B NOT_RUN.

## M2.4 PR D candidate — 2026-11-02

Gate B readiness is a draft PR on frozen `e37d6b5`, unmerged and awaiting owner review: 40 frozen fixture cases (expected-answers SHA-256 `ada4ff1e…cacf5`), a scorer with no aggregate percentage, a runner proven against the loopback only, 13 new native checkpoints and a [record template](GATE_B_RECORD_TEMPLATE.md); see the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-d--gate-b-readiness). Runtime byte-identical to main. On the synthetic rejecting backend, Regenerate during a held request lost the reply and Continue and swipe kept it; the user's message stayed each time and each recovered. The record lists four findings for the owner, none fixed here. Gate B NOT_RUN; the fixture run spends 40 requests and is the owner's own step.

## M2.4 PR D go-ahead — 2026-11-02

The owner [gave the go-ahead](DECISIONS.md#owner-go-ahead--m24-pr-d-gate-b-readiness--2026-11-02) on PR D under G9, G13 and G14: the Gate B fixture set and scorer, the runner (committed, not run against a real provider), the E16 residual blocks on the synthetic rejecting backend, the native blocks earlier records left NOT_RUN, and a Gate B record template. Tests and docs only; runtime byte-identical to PR C. Tracked by [DYL-206](https://linear.app/devils17/issue/DYL-206/sillynovel-m24-pr-d-gate-b-readiness-fixtures-scorer-runner-native). On its merge M2.4 is complete and the Gate B sequence begins, each step on its own authorization: frozen candidate, [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) replay, fixture run on the owner's named connection, the owner's session, the owner's verdict. Gate B NOT_RUN.

## M2.4 PR C merged; PR D go-ahead next — 2026-11-02

The owner [accepted and merged](DECISIONS.md#owner-acceptance--m24-pr-c-merged--2026-11-02) PR C at `34dfcd8` (frozen `c6f6ec7`); [DYL-205](https://linear.app/devils17/issue/DYL-205/sillynovel-m24-pr-c-manual-corrections-correction-locks-and-the-o08) Done. The reader can now revert or override an automatic background, presence or expression at the selected message without clearing the rest, a correction locks its field until Release, and the Scene panel offers a per-field “director may move this” control and “Apply and let the director move it”, resolving O08 with no schema change. Evidence validated from the repository: Node 346, storage 126, browser 103, seven native campaigns. Tablet, touch, IME and screen readers NOT_TESTED (DYL-193). **Next owner decision:** go-ahead on PR D (Gate B fixtures and scorer, E16 residual blocks, the native blocks the M2.3 PR C record left NOT_RUN, a Gate B record template; tests and docs only). After PR D the Gate B sequence begins: frozen candidate, DYL-193 replay, fixture run on the owner's named connection, the owner's session, the owner's verdict. Gate B NOT_RUN.

## M2.4 PR C candidate (draft, unmerged) — 2026-11-02

Corrections and the director-may-move control are implemented on frozen `c6f6ec7` for owner review under [DYL-205](https://linear.app/devils17/issue/DYL-205/sillynovel-m24-pr-c-manual-corrections-correction-locks-and-the-o08): Revert, Override and Release on “Why this visual?” in the memory-only overlay, a correction lock until Release, and a per-field toggle over the existing lock flags with no schema change. Node 346, storage 126, browser 103, six portability scripts, director campaign 47 checkpoints on the pinned host; `validate.py` PASS. See the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-c--corrections-and-the-director-may-move-control). Tablet NOT_TESTED, Gate B NOT_RUN, DYL-193 open. The next step is owner review.

## M2.4 PR C go-ahead — 2026-11-02

The owner [gave the go-ahead](DECISIONS.md#owner-go-ahead--m24-pr-c-corrections-and-the-o08-control--2026-11-02) on PR C under G5–G8: revert and override at the selected message without clearing the rest of the overlay, correction locks with Release, and the per-field “director may move this” control that resolves O08 with no schema change. Tracked by [DYL-205](https://linear.app/devils17/issue/DYL-205/sillynovel-m24-pr-c-manual-corrections-correction-locks-and-the-o08); renderer and overlay change with the full native-host campaign. Runtime unchanged by this entry. PR D (Gate B readiness) follows on its own go-ahead. Gate B NOT_RUN; DYL-193 reopened.

## M2.4 PR B merged; PR C go-ahead next — 2026-11-02

The owner [accepted and merged](DECISIONS.md#owner-acceptance--m24-pr-b-merged--2026-11-02) PR B at `8203ea1` (frozen `98d4c27`); [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b) Done. The stage now shows a Director line with state and request count, a closed “Why this visual?” disclosure listing what is on stage at the selected message, the decisions behind it and the session summary, and a Resume button after a pause. Evidence validated from the repository: Node 328, storage 126, browser 97, seven native campaigns. Tablet, touch, IME and screen readers NOT_TESTED (DYL-193). PRs A and B complete the authorized M2.4 work. **Next owner decision:** go-ahead on PR C (revert and override at the selected message, correction locks, the O08 per-field “director may move this” control), then PR D (Gate B fixtures, scorer, E16 residual blocks). Gate B NOT_RUN.

## M2.4 PR B candidate (draft, unmerged) — 2026-11-02

The Director line, the closed “Why this visual?” disclosure and Resume are implemented on frozen `98d4c27` for owner review under [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b). Node 328, storage 126, browser 97, six portability scripts and the director campaign (35 checkpoints) pass on the disposable pinned host; `validate.py docs/evidence/m2-4-b/campaign` PASS. See the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-b--evidence-ui-and-resume). Tablet, soft keyboard and assistive technology NOT_TESTED; the reply field's reach with the disclosure open is a DYL-193 item. Gate B NOT_RUN.

## M2.4 PR A merged — 2026-11-02

The owner [accepted and merged](DECISIONS.md#owner-acceptance--m24-pr-a-merged--2026-11-02) PR A at `8d85158` (frozen `f5de115`): the controller now keeps a memory-only log of the last 64 director decisions per attachment with the plan's outcome taxonomy, named stale reasons, per-update dispositions, tallies and excerpt deletion when the source changes; nothing renders it yet. Node 322/322 from the repository; browser, storage and native NOT_RUN for this pure-module slice. Accepted departures: a pause is a tally, not an entry; most real stale results read `STALE_JOURNAL`. Next bounded step is PR B (Director line, “Why this visual?”, Resume) on the owner's go-ahead under [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b). Gate B NOT_RUN; DYL-193 reopened.

## M2.4 PR A candidate (draft, unmerged) — 2026-11-02

The memory-only decision log, outcome taxonomy and stale reasons are implemented on frozen `f5de115` for owner review: last 64 entries per attachment, excerpts deleted when the anchored source changes, tallies with E6's lifetime, no renderer, adapter or persistence change. Node 322/322, discovery PASS (13/5/1); browser, storage and native NOT_RUN for a pure-module slice. See the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md). Nothing is on screen until PR B. Gate B NOT_RUN.

## M2.4 authorized (PRs A and B) — 2026-11-02

The owner [ruled on G1–G14](DECISIONS.md#owner-rulings-g1g14--m24-evidence-ui-corrections-and-gate-b--2026-11-02) after the [M2.4 plan](M2_4_EVIDENCE_UI_PLAN.md) merged at `628a3b4`: PR A (memory-only decision log, outcome taxonomy, stale reasons) and PR B (Director line, “Why this visual?” disclosure, Resume) are authorized and tracked by [DYL-204](https://linear.app/devils17/issue/DYL-204/sillynovel-m24-director-decision-log-and-evidence-ui-prs-a-and-b); PR C (corrections, O08 option A) and PR D (Gate B fixture scorer and runner, E16 residual blocks) are ruled but each waits for the owner's go-ahead. O08 is resolved. [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) is reopened and extended; it runs on the frozen Gate B candidate before the fixture run and the owner's session. TESTING rows T58–T68 added as NOT_RUN. Runtime unchanged by this entry. Gate B NOT_RUN.

## M2.4 planning proposal (NOT approved) — 2026-11-02

The [M2.4 evidence UI plan](M2_4_EVIDENCE_UI_PLAN.md) proposes a memory-only decision log with the outcome taxonomy and an on-stage “Why this visual?”, per-decision corrections in the overlay, an answer to open question O08 over the existing lock flags with no schema change, and the Gate B candidate's fixtures, protocol and record. It lists owner decisions G1–G14 with a recommendation each and authorizes nothing. It also records a conflict for the owner: Linear shows DYL-193 Done, with no replay evidence in the repository, while the documents call it open (G12). Runtime unchanged. Gate B NOT_RUN.

## M2.3 complete — 2026-11-02

The owner [accepted and merged](DECISIONS.md#owner-acceptance--m23-pr-c-merged-m23-complete--2026-11-02) PR C at `174d380` (frozen `67c1aed`); [DYL-203](https://linear.app/devils17/issue/DYL-203/sillynovel-m23-pr-c-automatic-layout-overlay-for-background-and) Done. With PRs A, B and C merged, M2.3 is complete: the director keeps one pending target, waits through native generation and typing, names overtaken results `SUPERSEDED`, and can now move the background and who is present through a memory-only overlay that never touches the saved project, with manual locks and any manual layout command winning. Evidence validated from the repository: Node 283, storage 126, browser 93, seven native campaigns. Tablet replay and real providers NOT_TESTED. **Open question O08:** manual choices are locked by default, so the overlay rarely moves a hand-arranged project; a “default the director may move” marking is for M2.4 planning. Next bounded step is M2.4 planning (evidence UI, Gate B candidate), which needs owner authorization. Gate B NOT_RUN; DYL-193 open.

## M2.3 PR C candidate — 2026-11-02

Draft PR, unmerged, awaiting owner review: the [memory-only automatic layout overlay](M2_3_DIRECTOR_IMPLEMENTATION.md#pr-c--automatic-layout-overlay) for background and presence under F7 and F8 ([DYL-203](https://linear.app/devils17/issue/DYL-203/sillynovel-m23-pr-c-automatic-layout-overlay-for-background-and)), frozen at `67c1aed`. Node 283, storage 126, browser 93, six portability scripts and the amended director campaign (30 checkpoints) pass on the disposable pinned host; `validate.py docs/evidence/m2-3-c/campaign` PASS. The saved project, its bundle and all non-chat files stayed byte-identical. Tablet replay NOT_TESTED; DYL-193 open; Gate B NOT_RUN. For review: manual choices lock their fields by default, so the director moves little until a lock is released. The rest of M2.3 and M2.4 are not changed by this entry.

## M2.3 PR C authorized — 2026-11-02

The owner [authorized PR C](DECISIONS.md#owner-authorization--m23-pr-c-automatic-layout-overlay--2026-11-02) under F9: the memory-only automatic layout overlay for background and presence (E3 option B), tracked by [DYL-203](https://linear.app/devils17/issue/DYL-203/sillynovel-m23-pr-c-automatic-layout-overlay-for-background-and), built as plan section 5 describes under F7 and F8. It is a renderer change and carries the full native-host campaign and browser suite. Runtime unchanged by this entry. On merge, M2.3 is complete and M2.4 (evidence UI, Gate B candidate) is the next planning step, separately gated. Gate B NOT_RUN; DYL-193 open.

## M2.3 PR B merged; F9 decision next — 2026-11-02

The owner [accepted and merged](DECISIONS.md#owner-acceptance--m23-pr-b-merged--2026-11-02) PR B at `4561888` (frozen `02a3a96`); [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold) Done. The director now waits while the user types or holds a draft (reading only the draft's length), names a result overtaken by the user's reply `SUPERSEDED`, and the native director campaign passes again on the pinned host. Evidence validated from the repository: Node 251, storage 126, browser 92, seven native campaigns. Tablet replay, touch/IME composer behaviour and real providers NOT_TESTED; the E16 residual for Regenerate, Continue and swipes stays recorded. PRs A and B complete the authorized M2.3 work. **Next owner decision is F9:** PR C (automatic layout overlay for background and presence) as a third M2.3 PR, or deferral to M2.4. Gate B NOT_RUN; DYL-193 open.

## M2.3 PR B candidate (draft, unmerged) — 2026-11-02

Draft for owner review under [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold): a read-only composer hold. The adapter reports only whether a draft exists and the time since the last keystroke on `#send_textarea`; the director defers while a keystroke is within five seconds or the draft is non-empty, shows “Director waiting while you type”, and disables only the hold, with one notice, if the element is missing. The help text carries plan section 3.3's sentence. Frozen `02a3a96`: Node 251/251, browser 92/92, storage 126/126, the full native-host campaign on pinned SillyTavern 1.19.0 PASS (director script amended to PR A's behaviour, 20 checkpoints), `validate.py` PASS from the repository, discovery PASS. Tablet replay NOT_TESTED. Nothing here is approved. [PR B record](M2_3_DIRECTOR_IMPLEMENTATION.md#pr-b--composer-hold). Next bounded step: owner review, then a decision on PR C under F9. Gate B NOT_RUN; DYL-193 open.

## M2.3 PR A merged — 2026-11-02

The owner [accepted and merged](DECISIONS.md#owner-acceptance--m23-pr-a-merged--2026-11-02) PR A at `89d5abd` (frozen `be6a422`): the director now keeps one pending target of depth one, waits through native generation and while the reader is on an earlier message, fires once on return to the head, and names a result overtaken by the user's reply `SUPERSEDED` without counting a failure. Node 244/244 from the repository; browser, storage and native suites NOT_RUN for this pure-module slice. The native director campaign script still asserts a removed notice and cannot pass until PR B. Next bounded step is PR B, the read-only composer hold, on the owner's go-ahead under [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold). PR C not authorized. Gate B NOT_RUN; DYL-193 open.

## M2.3 PR A candidate (draft, unmerged) — 2026-11-02

Draft for owner review under [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold): one pending target, an explicit streaming gate, catch-up on returning to the head and the `SUPERSEDED` outcome, in `src/director-controller.mjs` only. Frozen `be6a422`: Node 244/244, discovery PASS. Browser, storage and native suites NOT_RUN under the M2 evidence standard. [PR A record](M2_3_DIRECTOR_IMPLEMENTATION.md). PR B waits for the owner's review; PR C is not authorized. Gate B NOT_RUN.

## M2.3 authorized (PRs A and B) — 2026-11-02

The owner [ruled on F1–F10](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02) after the [M2.3 plan](M2_3_DIRECTOR_QUEUEING_PLAN.md) merged at `8cef9a3`: PR A (pending target of depth one, explicit streaming gate, `SUPERSEDED` outcome, ordered stale-result and recovery rules, race matrix) and PR B (read-only composer hold) are authorized and tracked by [DYL-196](https://linear.app/devils17/issue/DYL-196/sillynovel-m23-director-pending-target-stale-rules-and-composer-hold); PR C (automatic layout overlay, background and presence only) is planned but needs its own authorization after A and B have their records. TESTING rows T51–T57 added as NOT_RUN. Runtime unchanged by this entry. Gate B NOT_RUN; DYL-193 open.

## M2.3 planning proposal (NOT approved) — 2026-11-02

A docs-only [M2.3 director queueing plan](M2_3_DIRECTOR_QUEUEING_PLAN.md) is open for owner review on main `a86bf2c` (PR #47 merge, the M2.2 acceptance record; written against the PR #46 merge `f570484` and rebased). It proposes a depth-one pending target replacing E10's skip-and-count, an explicit streaming gate and a read-only composer hold against the user's own generation (E16 follow-through), `SUPERSEDED` as a named non-failure outcome for Send during a request, ordered stale-result and recovery rules on the existing stamps, a race matrix including A → B → A, and a memory-only automatic layout overlay for background and presence (E3 option B) as a separately authorized third PR. Owner decisions F1–F10 are listed with a recommendation each. **It authorizes nothing**; runtime and tests are unchanged. Gate B NOT_RUN; DYL-193 open. Older entries below are historical.
## M2.2 merged — 2026-11-01

The owner [accepted and merged](DECISIONS.md#owner-acceptance--m22-implementation-merged--2026-11-01) the M2.2 director transport at `f570484dc9975ab543d4b116a198c9ba21dcd6ec` (frozen `d5664119d060d72f90aee4e3a386fdf409843a5c`); [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation) Done. Main now carries one quiet director request per completed head over the host's own raw generation path, off by default, expressions only, with the recorded E16 Send-during-request limitation. Evidence validated from the repository; tablet replay, real providers and non-chat-completion backends NOT_TESTED. Next bounded step is M2.3 planning (queueing and catch-up, serialization with native generation, automatic layout overlay E3-B), which needs owner authorization. Gate B NOT_RUN; DYL-193 still precedes beta/release.

## M2.2 implementation candidate for review — 2026-11-01

Draft PR for [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation), frozen at `d5664119d060d72f90aee4e3a386fdf409843a5c`: one quiet director request per completed head over `generateRawData` on the user's selected connection, off by default, applying temporary expressions through the memory-only journal. Reader status `complete` is live, so manual temporary expressions can now apply to a freshly completed head. Synthetic evidence: 227 Node, 126 storage, 88 browser, seven native campaigns including a new director campaign on the pinned host. Tablet replay NOT_TESTED; real providers NOT_TESTED. [Record](M2_2_DIRECTOR_IMPLEMENTATION.md). Not merged. Gate B NOT_RUN. Older entries below are historical.

## M2.2 probe rulings — 2026-11-01

The M2.2 host probe contradicted the plan in three places; the owner [accepted all four resulting proposals](DECISIONS.md#owner-rulings-after-the-m22-host-probe--2026-11-01): E4 completion in either event order, E9 extended to angle-bracket name markers, E15 settle interval, E16 Send-during-request recorded as a limitation and Gate B question. [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation) implementation resumes at E4. Gate B NOT_RUN.

## M2.2 authorized — 2026-11-01

The owner [ruled on E1–E14](DECISIONS.md#owner-rulings-e1e14--m22-director-transport--2026-11-01): M2.2 implementation is authorized with E3 option A (expressions only, layout changes recorded as ignored), E4 reader status `complete`, host-settings enable, and an amended E7 failure policy (skip and count, pause after three consecutive failures). Tracked by [DYL-195](https://linear.app/devils17/issue/DYL-195/sillynovel-m22-one-text-director-transport-over-the-hosts-generation). First task is the plan's section 2.4 runtime probe on the pinned host. Native-host campaign evidence applies to this slice. Gate B NOT_RUN.

## M2.2 planning proposal (NOT approved) — 2026-11-01

A docs-only [M2.2 director transport plan](M2_2_DIRECTOR_TRANSPORT_PLAN.md) is open for owner review on main `9ae2dbf1df23e1a7e3a569c14ff6a5c903b54a60`. It records the quiet generation entry point verified by inspection of pinned SillyTavern 1.19.0 source (`generateRawData`/`extractMessageFromData` on `SillyTavern.getContext()`; `generateQuietPrompt` rejected because it assembles cards, persona, lorebooks and chat history), the O06-bounded request assembly, strict single-JSON parsing into the merged M2.1 validator, the off-by-default per-project enable, one-in-flight/one-per-message rules, the per-session ceiling of 40 with its degrade-to-manual notice, D7 journal routing, stale-result checks on the existing stamps, a synthetic loopback transport test plan and the owner decisions E1–E14 it needs. Two things the documents did not settle are recorded as decisions: the merged reader never records a `complete` generation status, and attached-project mode has no non-persistent home for automatic layout changes. **M2.2 implementation requires separate owner authorization recorded in [DECISIONS](DECISIONS.md).** Runtime unchanged; Gate B NOT_RUN; DYL-193 still precedes beta/release.

## Owner rulings recorded — 2026-11-01

All open decisions are [ruled](DECISIONS.md#owner-rulings-on-open-decisions--2026-11-01): O04 director transport is the host's own generation path on the user's selected connection; O06 limits the director to the evidence window, one request in flight, a per-session ceiling of 40, off by default; D7 routes automatic expressions to the memory-only journal; O03 selects AGPL-3.0 and `LICENSE` is added; O02 closed by reference; DYL-193 runs before the Gate B session; DYL-56 stays Backlog; M2 pure-module slices need Node tests plus a record only; O05 deferred past Gate B; O07 closed. M2.2 planning is unblocked; M2.2 implementation, Gate B, beta and release remain gated.

## M2.1 merged — 2026-11-01

The owner [accepted and merged](DECISIONS.md#owner-acceptance--m21-implementation-merged--2026-11-01) the M2.1 director module at `c5f1f3d3f8356cebc2805b7b67b22a6a8d76ed7b` (frozen `0d80dffc803aecf85a1d87e783d63f24212047a0`); DYL-194 Done. Main passes 182 Node tests; browser/storage suites NOT_RUN on this merge. The module is pure and unwired: no runtime path calls it yet. Next bounded step is M2.2 planning, which needs owner rulings O04 and O06 first. Gate B NOT_RUN; DYL-193 still precedes beta/release.

## M2.1 implementation candidate for review — 2026-11-01

Draft PR for [DYL-194](https://linear.app/devils17/issue/DYL-194/sillynovel-m21-director-proposals-lock-precedence-and-snapshot), frozen at `0d80dffc803aecf85a1d87e783d63f24212047a0`: pure `src/director-proposal.mjs` with strict whole-proposal validation, atomic application with manual-lock precedence, and evidence-stamp checks, on an unmodified reducer. 29 new Node tests pass with the existing 144. [Implementation record](M2_1_DIRECTOR_IMPLEMENTATION.md) lists the D2–D8 defaults (not owner rulings) and six choices for owner review. Fixture-only: no transport, UI, persistence or runtime wiring; browser suite NOT_RUN (no pinned host checkout present); Gate B NOT_RUN. Unmerged. Older entries below are historical.

## M2.1 implementation authorized — 2026-11-01

The owner [authorized M2.1 implementation](DECISIONS.md#owner-authorization--m21-director-implementation--2026-11-01) (plan decision D1) on main `a8fde515ac665c4cd892009c3574eef94dbfec57`; D2–D8 proceed on the plan's proposed defaults as recorded implementation choices, not rulings. Tracked by [DYL-194](https://linear.app/devils17/issue/DYL-194/sillynovel-m21-director-proposals-lock-precedence-and-snapshot): pure director proposal validation, reducer extension with manual-lock precedence and snapshot validation, deterministic fixtures, one draft PR. No transport, provider, persistence or schema change. Gate B NOT_RUN; DYL-193 coverage still precedes beta/release.

## M2.1 planning proposal (NOT approved) — 2026-11-01

A docs-only [M2.1 director proposal plan](M2_1_DIRECTOR_PLAN.md) is open for owner review on main `737735bcd54e3fed7ff9de7e6ed6c53420de85bd`: strict proposal schema, pure translation onto the existing reducer with manual-lock precedence, evidence-stamp and override-revision checks, deterministic fixtures, and the owner decisions D1–D8 it needs. No transport, provider, UI, persistence or image work; O04 is not required for M2.1. **M2.1 implementation requires separate owner authorization recorded in [DECISIONS](DECISIONS.md).** Gates B and C NOT_RUN; runtime unchanged.

## Gate A PASS recorded — 2026-11-01

The owner recorded [Gate A PASS](DECISIONS.md#gate-a-verdict--pass--2026-11-01) for merged main `e8e9cf673b6455dace67d695ee45d1d3dcc2857c` (runtime `c5c1699a48629ae761a093e13056f0b11fdc4b88`), approving the current build. No playtest sheet or session observations were supplied; the register says so explicitly. [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) deferred coverage still precedes beta/release. Next bounded step is an M2.1 planning proposal; M2 implementation, DYL-56, DYL-61, live installation and release remain unauthorized. Gates B and C NOT_RUN.

## Gate A deferral amendment recorded — 2026-11-01

The owner [deferred the remaining NOT_TESTED surfaces](DECISIONS.md#owner-amendment--deferred-coverage-for-the-first-disposable-gate-a-playtest--2026-11-01) to [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) for the first disposable playtest only. The playtest candidate is merged main `04ce6290c7bb5dab0dd0502e2cde931936796897` (runtime equal to `c5c1699a48629ae761a093e13056f0b11fdc4b88`). Nothing else changed: the [playtest sheet](M1_4_GATE_A_READINESS.md#6-owner-playtest-sheet--draft-session-not_run) and [setup recipe](M1_4_DYL60_REPRODUCTION.md) are the session materials; the disposable pinned host checkout must be recreated before the session because the earlier `/tmp` roots are gone. **Gate A remains NOT_RUN** until the owner records a verdict. No M1.3/M2, DYL-56, DYL-61, live installation or release authorization.

## DYL-60 owner acceptance and PR #34 merge — 2026-11-01

**Owner (Dylan) accepted and merged [PR #34](https://github.com/Sonoran-Solutions/SillyNovel/pull/34) at merge commit `91d638ab933b4dc503b7b88e99be41bd5aa76504` on 2026-11-01, America/Phoenix.** The merged runtime is byte-identical to frozen correction `c5c1699a48629ae761a093e13056f0b11fdc4b88`; the frozen campaign and actual Galaxy Tab S8+ evidence in [the keyboard correction record](M1_4_DYL60_KEYBOARD_FIX.md) apply to the merged head. Before merging, the Node suites, `tests/probes/dyl60/check-discovery.py` and `tests/probes/dyl60/validate.py` were rerun on the head and passed; the browser, storage and native campaigns were not rerun because the disposable pinned host checkout no longer existed, so that evidence is reused, not fresh. DYL-60, DYL-62 and DYL-63 are now Done in Linear with their original acceptance text and remaining limits preserved.

Still open: increased text scaling/200% zoom, reduced motion, assistive technology, tablet file-picker/import/export/cleanup touch flows and native group branch/copy remain NOT_TESTED. **Gate A remains NOT_RUN.** The owner must record a scope decision on those surfaces in [DECISIONS](DECISIONS.md) before the first disposable playtest. No M1.3/M2, DYL-56, DYL-61, live installation or release authorization follows from this merge. Older dated entries below describe the pre-merge state and are historical.

## DYL-60 keyboard and P3 correction — 2026-10-16

**Frozen correction `c5c1699a48629ae761a093e13056f0b11fdc4b88`:** actual Galaxy Tab S8+ portrait/landscape IME, original draft/caret, native Send/Stop/Continue, complete long reply, save/reload/reopen and manual group recovery pass within the named scope. [Correction, raw evidence and remaining limits](M1_4_DYL60_KEYBOARD_FIX.md). P3 discovery is repository-root based and fails closed on unexpected/empty/missing suites; foreign-working-directory self-check passes. Fresh pinned campaign passes 153 Node / 126 storage / 82 Chromium and six serial native campaigns (24/16/22/17/21/18 checkpoint groups); interrupted expressions were rerun on the unchanged freeze, with the completed earlier rows retained. Full readiness remains REVISE for physical scaling/motion/assistive gaps; Gate A NOT_RUN; DYL-60 In Review and PR #34 draft/open/unmerged. The following original candidate entry retains its historical results and now-corrected keyboard finding.

## DYL-60 technical candidate preparation — 2026-10-16

**Frozen candidate `6f8252699dae3a92f639f94531bba221d5e1cc02`: 153 Node / 126 storage / 81 Chromium pass; six serial native campaigns pass 24/16/22/17/21/18 checkpoint groups.** [Fresh package, raw logs, manifests and reproduction](M1_4_DYL60_CANDIDATE.md). Complete scoped native integrity is 84 files with full settings equality; actual individual copy/branch and active-persona request checks pass. **Technical readiness REVISE: actual Galaxy Tab S8+ keyboard hides composer in both orientations; physical coverage PARTIAL and assistive coverage NOT_TESTED. Gate A NOT_RUN.** DYL-60 is handed off In Review, unfinished pending owner acceptance; the draft PR must remain open/unmerged without auto-merge. Earlier incomplete candidate/fixture failures are retained separately.

The owner [approved all five rulings and separately authorized DYL-60](DECISIONS.md#owner-approvals-and-dyl-60-authorization--2026-10-16): F1 for the first disposable Gate A playtest, PNG-only assets, explicit project reopening, manual four-card groups and available established Galaxy Tab S8 technical testing. PR #33 merged at `c835afe6e274be3fab5a2862f517fd8e4bca32ad`, the starting main for this work. [Current preparation/evidence](M1_4_DYL60_CANDIDATE.md) distinguishes technical results and remaining gaps. Original history/writer requirements below are amended only by F1 for this playtest; broader DYL-22/23 criteria and historical blocker relations remain. DYL-62/63 remain In Review despite merged code. Gate A NOT_RUN; owner session and verdict, M1.3/M2, DYL-56 and DYL-61 release work remain separately gated. Older dated entries retain historical states.

## M1.4-A readiness preflight — 2026-10-16

Fetched main `f9497aebf59cbeae07a2b6391d0cff17e81bcc76` is the verified PR #32 merge; PRs #29–32 are now merged. [Readiness matrix, proposed Decision F amendment, DYL-60 recipe and owner/device checklists](M1_4_GATE_A_READINESS.md). **REVISE before freeze; GO for senior/owner review only.** Decision F undecided; Gate A NOT_RUN; DYL-60 Backlog/unstarted. DYL-22/23/55 report Done; DYL-62/63 remain In Review despite merged implementations. Original acceptance and blockers remain intact; no tracker state changes. This documentation review checks retained evidence/input hashes, not fresh current-main runtime behavior. Older entries below retain their historical states and evidence limits.

## PR #32 P2 correction — 2026-10-16

[Targeted correction and re-review evidence](M1_NATIVE_GROUPS_REVIEW.md): preserve a generation-start observation after new-owner activation so a newly attached project refuses expressions on its active head. Adapter/identity/persistence are unchanged. DYL-63 stays In Review and PR #32 draft/open/unmerged; Decision F undecided, Gate A NOT_RUN, DYL-60 unstarted.

## DYL-23-C native group integration — 2026-10-16

Owner explicitly authorizes [native groups with manual independent-project attachment](M1_NATIVE_GROUPS.md), tracked by [DYL-63](https://linear.app/devils17/issue/DYL-63/dyl-23-c-native-group-conversation-integration), after PR #31 merged at `5a9b87f14d5a008e9801aa2260efe40d9e22f5b7`. Native group/chat/activation authority remains separate from account-owned project/manual actor UUIDs and memory-only source expressions. Four or more actors retain three visible slots; duplicate names never bind cards to actors. No schema, native metadata, automatic attachment or persistence expansion. DYL-23 Done/history/acceptance, DYL-55 and DYL-62 unchanged; Decision F undecided; Gate A NOT_RUN; DYL-60 unstarted. [Implementation/evidence](M1_NATIVE_GROUPS_IMPLEMENTATION.md). Older dated entries below are historical.


## PR #31 senior-review correction — 2026-10-16

The owner supplied REQUEST CHANGES for missed automatic reconciliation after unchanged-object reorder. [Bounded correction/evidence](M1_PROJECT_EXPRESSIONS_REVIEW.md): dedicated source-order revision shared by stage and expression authority; immediate temporary fallback during prefix checking; actual-entry regressions preserving the selected source; explicit “Expression to apply” labeling. DYL-62 stays In Review; PR #31 stays draft/open/unmerged. DYL-23 Done, DYL-60, Decision F and Gate A NOT_RUN remain unchanged.


## DYL-23-B attached temporary expressions — 2026-10-16

Owner explicitly authorizes [memory-only attached message expressions](M1_PROJECT_EXPRESSIONS.md), tracked by [DYL-62](https://linear.app/devils17/issue/DYL-62). Starting main `d3f5761c03fec7fc5d97b0698da718af7af9c187` is the verified PR #30 merge. The project-global layout/catalog remains persistent; explicit actor/outfit-compatible PNG expression choices use a separate bounded activation-only source journal and the existing renderer. No expression-only dirty/revision changes or persistence. [Validation and handoff](M1_PROJECT_EXPRESSIONS_IMPLEMENTATION.md).

Linear DYL-23 reports Done; preserve its original acceptance/history/relationships and the remaining group/device gaps. This assignment authorizes only DYL-23-B, not native groups, persistent history, DYL-60 execution or later milestones. Decision F remains undecided; Gate A NOT_RUN; no live install, release or merge. Older entries below are historical.


## DYL-23-A manual-stage UX — 2026-10-16

[Draft PR #30](https://github.com/Sonoran-Solutions/SillyNovel/pull/30) is OPEN/UNMERGED, auto-merge disabled; DYL-23 In Review. Frozen code `646ec9e7bd1439cb2137e97edba9c1526c808db9`: 91 Node, 126 storage, 46 Chromium and 24 pinned-host checkpoint groups pass. [Exact evidence and remaining requirements](M1_MANUAL_STAGE_UX_IMPLEMENTATION.md). GO for this bounded senior review only.

Owner explicitly authorized the bounded [manual stage/project integration](M1_MANUAL_STAGE_UX.md): Project, Scene and Artwork Library controls, visible attachment/global-scope/save/recovery feedback, and responsive/accessibility verification. Starting main `ad70bb52e0f46155a5c7b1e5c3da957536612dc9` merges PR #29; Linear DYL-22 is Done with broader original format/revision requirements still unfinished. DYL-24 session stage and DYL-53 global projects remain credited. DYL-23 keeps original acceptance/dependencies and stays unfinished; attached source overlays/native groups remain excluded. DYL-60 stays blocked. Decision F undecided; Gate A NOT_RUN; no DYL-55 change, M1.3/M2, live install, release or merge. [Implementation/evidence](M1_MANUAL_STAGE_UX_IMPLEMENTATION.md). Older dated entries below are historical.


**PR #29 re-review:** [Migration-policy correction](M1_PNG_ASSET_LIBRARY_REVIEW_CORRECTION.md) replaces automatic v1 startup upgrade with explicit verified-backup migration to a new output. The original store and backup remain unchanged. DYL-22 is In Review with original unfinished acceptance/blockers retained; no DYL-55 reconciliation, DYL-23 authorization or Gate A change.

## DYL-22 PNG-library review candidate — 2026-10-15

The owner explicitly authorized the first residual DYL-22 slice. [Workflow and storage contract](M1_PNG_ASSET_LIBRARY.md): project-owned labels/categories, durable alternatives and explicit reselection, shared immutable PNG bytes, catalog-aware cleanup, transactional schema-v1→v2 upgrade and compatible full-store recovery. Portable v1 copies still include selected artwork only, without library labels/alternatives. [Implementation/evidence](M1_PNG_ASSET_LIBRARY_IMPLEMENTATION.md). PR #28 is merged at starting main `262aad7b64624845e68f783bf779a6fd5e4689d4`.

This is a bounded implementation for review; historical blockers and original JPEG/static-WebP requirements remain. DYL-55 stays pending owner acceptance, DYL-23 separately gated, Decision F undecided and Gate A NOT_RUN. DYL-56/60 and M1.3/M2, production/release and upstream authorization are unchanged. Older entries below retain their original evidence/scope.

## Active project-storage direction — 2026-10-15

Fetched main `ea65d84a521a39c9ccc977f4cb3643454963d4b8` contains merged PRs #23–27. DYL-49–54 and DYL-57–59 are Done. [Completion/readiness review](M1_2_STORAGE_COMPLETION_AND_READINESS.md): **DYL-55 GO for bounded experimental acceptance, pending owner; overall M1.2 REVISE**. DYL-55 stays unfinished, pending owner acceptance; DYL-22/23 retain Backlog/blockers, DYL-56 stays Backlog. New planning-only DYL-60 prepares a frozen owner candidate after DYL-23; DYL-61 tracks release hardening separately. Gate A NOT_RUN.

[Independent project storage](M1_INDEPENDENT_PROJECT_STORAGE.md) supersedes the upstream-API implementation path and earlier chat-metadata persistence proposals for this bounded slice. The owner authorizes planning and the first independent-project implementation with an optional local plugin, explicit attachment and project-global state only. Production release is not approved. Source-specific history remains transient/gated; existing renderer, source, lock and native-composer safeguards remain applicable. No project data enters native metadata or browser persistence. [Implementation and tracking](M1_PROJECT_STORAGE_IMPLEMENTATION.md).

DYL-48 is Done and PR #22 merged at `ca77bbf5e4ee5219e34e873b1680e8d644754149`. Upstream engagement is **ON HOLD / NOT_SUBMITTED**. DYL-22/23 retain Backlog and their blocker relations; DYL-24 remains supported; M1.3/M2 unauthorized and Gate A NOT_RUN. Earlier entries below retain their historical authorization/evidence scope and do not override this decision.

**Updated:** 2026-10-15. Historical M0.1 and planning handoffs are preserved below; the current storage architecture checkpoint is summarized first. Owner approvals and technical evidence remain distinct.

## Current state

Main implements the complete text reader, DYL-24 session stage and optional independent-project persistence. Saved project-global layout is separate from source-specific scene history; reload/chat switching detach. Persistent projects currently accept PNG and single-character conversations only. Remaining reusable asset-library and manual-stage gaps are mapped in the [readiness review](M1_2_STORAGE_COMPLETION_AND_READINESS.md).

| Area | State |
| --- | --- |
| M0 shell code | IMPLEMENTED |
| Latest retained automated evidence | DYL-59 frozen candidate: 80 Node, 104 storage/bundle/recovery/cleanup, 39 actual-entry Chromium, 21 pinned-host checkpoint groups; overlapping coverage, not rerun by this docs review |
| SillyTavern 1.19.0 source inspection | COMPLETE — commit `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Isolated real-host lifecycle checks | PASS within documented scope — normal, streaming, stop, continuation, swipe, edit/delete, chat switching, toggles, group/duplicate labels, and disable-during-stream verified with synthetic data and deterministic local endpoint |
| Live model/provider behavior | NOT_TESTED — endpoint was deterministic and local |
| L10 persistent empty-chat workflow | UNSUPPORTED / WAIVED; supported host UI restores the welcome message on reopen |
| Missing-capability behavior | INSTRUMENTED_HOST_PASS; capability omission was injected, not a natural host failure |
| M0 overall | OWNER APPROVED PASS for the explicitly documented scope and evidence limits; L10 is UNSUPPORTED / WAIVED |
| M1 runtime | DYL-18/20/24 Done; complete reader, pure reducer and supported session-only stage; full DYL-22/23 remain blocked |
| M1.2 storage | Independent-project DYL-49–54/57–59 Done, PRs #23–27 merged; bounded DYL-55 GO recommended, parent unfinished; production release unauthorized |
| M1.2 remaining | Reusable labeled/kinded asset catalog, attached transient source controls/group support and integrated usability evidence; proposed revised DYL-22 → DYL-23 → DYL-60 |
| Gate A — reader feel | NOT_RUN |
| M2 — automatic direction | NOT_STARTED |
| Gate B — direction quality | NOT_RUN |
| M3 — optional asset generation | NOT_STARTED |
| Gate C — image workflow | NOT_RUN |
| Tested SillyTavern release and full SHA | 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Provider tests | Deterministic localhost OpenAI-compatible endpoint tested; real model/provider behavior NOT_TESTED |
| License choice | OPEN |

## Historical upstream proposal handoff — 2026-10-15, DYL-48

The following records the pre-merge handoff. DYL-48 is now Done/PR #22 merged; independent projects supersede that implementation direction, while upstream remains ON HOLD / NOT_SUBMITTED.

[Public request](UPSTREAM_HOST_CAPABILITY_REQUEST.md) and [technical support / owner recommendation](UPSTREAM_HOST_CAPABILITY_TECHNICAL.md) are complete for review. Starting fetched main `f3ff9a4b61fa31df3e57cf3367f0dcf4860f3fe6`; prerequisite PR #21 merged and DYL-47 Done verified. Current official release/staging source and related proposals were inspected read-only. Recommend coordinating first in existing upstream #5265 after explicit owner approval, leading with identity/lifecycle/conditional per-chat state and deferring assets. No supported complete foundation was found in the bounded research; adjacent proposals are acknowledged.

**NOT_SUBMITTED.** Draft preparation is authorized; architecture selection, upstream engagement and implementation are not. DYL-22/23 remain Blocked; DYL-24 accepted session-only; production persistence, M1.3 and M2 unauthorized; Gate A NOT_RUN. [Documentation validation](TESTING.md#dyl-48-upstream-proposal-validation--2026-10-15) adds no runtime/host/provider/device evidence. DYL-48 stops In Review and its PR remains open/unmerged with auto-merge disabled.

## Historical storage architecture checkpoint — 2026-10-15, DYL-47

The following recommendation predates the owner's independent-project decision and merged PRs #23–27; it is not the current implementation prerequisite.

[DYL-47](M1_STORAGE_ARCHITECTURE_CHECKPOINT.md) recommends a small upstream SillyTavern identity/lifecycle/targeted-CAS/asset capability, with the visibly session-only DYL-24 experience as fallback. This is **PROPOSED**, not an owner selection or production authorization. The recommendation is GO for owner architecture review only; durable persistence remains NO-GO until a supported host API and recovery/backup contract exist.

PR #20 merged at `8b7e8e04f1218e73902f997d9018765a79f76128`; DYL-46 is Done. Final DYL-46 evidence is bounded to its documented patched-host writer and failure paths. Unknown/unobserved filesystem writers remain outside its guarantee. DYL-22/23 remain Blocked; DYL-24 remains accepted session-only; M1.3/M2 remain unauthorized; Gate A remains NOT_RUN. DYL-47 does not alter those gates.

## Historical M0 starting repository state

The implementation checkout was cloned from the repository's default `main` branch at full SHA `6631f6e29b6a05420bc5b9c16bf02b242c9fad8c`. The branch was clean at that commit. The implementation branch is `codex/m0-shell`. The initial supplied workspace directory was empty; no pre-existing local files or changes were overwritten.

## Historical M0 scope implemented

- SillyTavern manifest, module entry point, and scoped stylesheet.
- A setting that defaults off, mounts a labeled placeholder before the chat surface, and disposes its owned stage and event listeners.
- Read-only observation of current host chat/message/author data; no canonical chat, card, lorebook, persona, or model settings are written.
- A Node built-in test harness and a pinned source/host evidence record.
- Development/install instructions in [README.md](../README.md).

The implementation persists only the user's `extensionSettings.sillynovel.enabled` preference. It does not persist chat or character identity. Details and limitations are in [M0 compatibility](M0_COMPATIBILITY.md).

## Historical M0 verification record

The synthetic harness passed 8 tests, including source clearing across empty-chat transitions, A → B → A refresh, malformed indices, missing capabilities, listener cleanup, and canonical chat immutability through enable/disable. The real-host checks used pinned SillyTavern 1.19.0 and a deterministic localhost endpoint. Normal, streaming, stopped, continued, regenerated, swipe-selected, edited, deleted, and chat-switch flows were exercised. Disabling SillyNovel during a stream removed its stage/listeners without stopping the host reply. The streamed message object lagged the `STREAM_TOKEN_RECEIVED` event until SillyTavern's progress update; M1 must not treat a token-event-time sample as current text.

Deletion to an empty view was exercised, but the host switch into an empty B chat and generation-start sequence remains untested: reopening B after switching away restored its welcome message. Group author mapping (including duplicate names) and missing-capability removal were not exercised in the UI. Error/aborted network behavior and actual model/provider behavior are also unverified. Browser: Brave `154.1.96.61`; exact engine version unavailable. No compatibility claim is made for other browsers, devices, themes, extension combinations, SillyTavern versions, or models. See [M0 compatibility](M0_COMPATIBILITY.md) and the [dated lifecycle report](M0_LIFECYCLE_VALIDATION.md).

## Next action

Review and manually try the bounded DYL-18 text-reader PR. Keep it open/unmerged and DYL-18 In Review until the owner decides. Gate A remains NOT_RUN; M1.2/M1.3/M2 work is not started by this handoff.

## Status discipline

Keep implementation, simulated checks, real-host checks, provider checks, and owner verdicts separate. M0 PASS is limited to the explicitly documented scope and does not change any NOT_TESTED result.

## M0.2 current status (2026-10-12)

| Area | Current result |
| --- | --- |
| Host-validated SillyNovel candidate | `de25366aeaa5e1cbd10e9bc40861e8ae91339aee` |
| PR review fix candidate | `831714e9343b51682d643efb2eaa419ef9ab5145` |
| Pinned host | SillyTavern 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Synthetic regression suite | PASS — 13 tests |
| L10: revisitable empty B and generation | UNSUPPORTED / WAIVED by owner for the tested persistent-chat workflow; revisit if a supported reachable workflow is demonstrated |
| L12: group author labels and switching | HOST PASS |
| L13: duplicate-name labels | HOST PASS for M0 label-only behavior; stable identity remains an M1 contract requirement |
| L16: missing capability in browser | INSTRUMENTED_HOST_PASS; no stage/partial activation, native chat usable, normal activation recovered after restoring context |
| Same-length eventless content update | SYNTHETIC PASS; one refresh, unchanged-source deduplication, and disposal verified; browser host not rerun for this edge case |
| Confirmed production defect | Eventless Temporary Chat transition kept stale stage content on previous candidate; fixed and host-rechecked on the validated candidate |
| M0 verdict | OWNER APPROVED PASS for the explicitly documented scope and evidence limits |
| Gate A | NOT_RUN |
| M1 authorization | DYL-17 and DYL-19 authorized in parallel; DYL-18 and later tickets blocked pending prerequisites and separate authorization |
| Real model/provider, other host releases, browsers, and error/abort paths | NOT_TESTED |

The host-validated candidate uses a coalesced, disposal-owned observer on `#chat`; the PR review fix additionally compares exact text when the other source fields and length match. It does not change canonical chat content or host source, and message bodies are neither logged nor hashed. The review fix was tested synthetically; host evidence remains tied to `de25366`. Full evidence and exact commands are in [M0 lifecycle validation](M0_LIFECYCLE_VALIDATION.md), [M0 compatibility](M0_COMPATIBILITY.md), and [testing](TESTING.md). The L10 waiver and tested-scope M0 PASS were approved by the owner on 2026-10-12.

## Historical M1 planning handoff — 2026-10-12, DYL-15

[M1 reader plan](M1_PLAN.md) supplies complete-message desktop/narrow/keyboard layouts, streaming and older-cursor rules, manual cast/asset/lock contracts, source-anchored state/save failure boundaries, component interfaces and a frozen owner Gate A session. At that handoff, M1 runtime was **NOT_STARTED / NOT_AUTHORIZED**, owner M0/L10 acceptance was pending, and Gate A was **NOT_RUN**. The later DYL-16 owner decision below supersedes that authorization state.

Initial clean checkout: `6eedb720e699b1194db41371975ddd07b4db46c6`. Fetched main and this focused branch's base: `a7f1a4a6299a459adce1e24ea7b1b3f4405d02b5` (merged PR #3). Branch: `codex/dyl-15-m1-reader-plan`. Final pushed head and PR are recorded in the GitHub/Linear handoff rather than inventing a self-referential SHA in this file.

The Linear project and DYL-15–DYL-19 were read directly; those five existing M1 issues form plan → owner decisions → source model → text reader, plus identity/storage proof alongside source work after authorization. Eight later bounded ticket titles/dependencies are proposed in the plan; no issues were created or implementation started. DYL-19 failures block the affected persistence/binding/storage work. Next action: review DYL-15, then record actual owner decisions in DYL-16. DYL-17 is the recommended first implementation ticket only after explicit authorization.

Verification for this planning PR: relative Markdown file/anchor and fenced-block checks, `git diff --check`, and docs-only path/runtime comparison, with exact results in the PR/Linear handoff. No new runtime tests, host/browser/provider/device run, or owner playtest is claimed. Existing M0 evidence retains its original candidate and limitations.

## Owner decision — 2026-10-12, DYL-16

The owner accepted L10 as **UNSUPPORTED / WAIVED** for the tested persistent-chat workflow on the pinned host, retaining synthetic empty-source coverage and requesting reconsideration if a supported reachable workflow is later demonstrated. The owner approved M0 **PASS for its documented scope and evidence limits**. A short smoke check against the current SillyNovel main head is included in DYL-17's host-validation scope; M0 is not reopened.

The owner approved M1 defaults A–G with the clarifications in [DECISIONS](DECISIONS.md#owner-decision--2026-10-12-dyl-16) and [M1_PLAN](M1_PLAN.md#owner-approved-defaults--2026-10-12-dyl-16). DYL-17 (source model) and DYL-19 (identity/storage proof) are authorized in parallel as separate branches and separate open PRs with coordinated file ownership. DYL-19 does not authorize asset-library or persistence implementation. DYL-18 and later implementation remain blocked pending prerequisites and separate authorization. Gate A is **NOT_RUN** and M2 is **NOT_AUTHORIZED**.

## DYL-17 implementation handoff — 2026-10-12

DYL-17 adds the internal in-memory reader source model and connects it to the host adapter and shell. The source model keeps head and cursor separate, tracks immutable revisions, uses transient host-object locators, invalidates deleted/replaced selections, and reports conservative generation states. Token notifications now trigger a coalesced canonical sample of only the latest and consumer-tracked message indices; lifecycle changes and nontrivial history shape changes reconcile full history. The stage UI remains the M0 placeholder.

Contract and limits: [M1 reader source model](M1_READER_SOURCE.md). Verification and host evidence for this candidate are recorded in [TESTING](TESTING.md). DYL-18 was not started; DYL-19 remains separate. Gate A remains **NOT_RUN**.

The 2026-10-12 senior re-review fixes are in code candidate `3d871679ca216eec1210f3bec5845299a672af92`: zero-to-one append, follow-latest recovery on latest-object replacement, and null-record refresh safety. The two adapter/model regressions and P3 regression pass in the 27-test suite. The pinned host loaded the candidate and refreshed its synthetic source, but the exact zero-history and eventless-object-replacement cases were not reachable through its UI; those host cases remain **NOT_TESTED**. See the dated addendum in [TESTING](TESTING.md).


## DYL-18 text-reader implementation and handoff — 2026-10-12

The owner explicitly assigned the pasted DYL-18 implementation prompt in Codex on 2026-10-12 (America/Phoenix). The assignment/date/scope were recorded in Linear before implementation. Initial clean workspace SHA: `98ee37d7464063d607b0a0c892cd2259d4ed75ae`; fetched starting main: `aa43f4d938c6eafae296cda63a5b4f11111fbd95`. Focused branch: `codex/dyl-18-text-reader`. The full final host-tested SHA and runtime/fixture hashes are in [the evidence record](evidence/dyl18/results.json); the final pushed review head is recorded in GitHub/Linear. The reviewed head `29cb5bf8d348490f407565f9c3f9e91db6afb1d7` left those host-tested runtime bytes unchanged. The later P2 correction below changes the adapter and has separate automated evidence.

| Area | DYL-18 result |
| --- | --- |
| Complete formatted reader, selectable text and exact copy | IMPLEMENTED; actual-entry browser PASS and pinned HOST PASS |
| Previous/Next/Latest, valid-record bounds, pinned unread and independent text scrolling | IMPLEMENTED; synthetic/browser PASS, normal pinned/streaming HOST PASS |
| Native composer and repeated reader/chat transitions | HOST PASS; exact draft, backward caret selection and active textarea preserved |
| Backlog/Open Original, native edit and swipe, Return to Reader | Historical HOST PASS on `3d136668e97a47f602775c9297b567c73293261e`; exact-match claim corrected below |
| Native feed visibility/disposal and recovery | PASS; owned class only, original DOM retained; induced render failure INSTRUMENTED_HOST_PASS |
| Chat A → B → A and toggle during/after generation | HOST PASS; queued old-epoch/clipboard work additionally synthetic browser PASS |
| Automated suites | 37/37 Node + 14/14 behavioral Chromium PASS |
| Pinned-host scenario runner | 12/12 PASS with deterministic local endpoint and fresh owned data root |
| Narrow/keyboard-height and zoom | HOST PASS as 390×800 / 390×500 viewport simulations; actual 200% browser zoom PASS |
| Host/browser | SillyTavern 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9`; Chromium 151.0.7922.34, Ubuntu 24.04.5 LTS |
| Durable identity, asset storage and metadata saves | DYL-19 findings unchanged: PARTIAL/BLOCKED; no implementation or fallback added |
| Gate A | NOT_RUN; technical evidence is not an owner verdict |

The implementation consumes a single source model, uses the host's installed Markdown/sanitizer libraries through a restricted read-only path, and never writes canonical chat/cards/lore/personas/provider settings. Only the existing enabled preference is persisted. Backlog and Open Original are one control to keep narrow layouts compact. Runtime interfaces, safe complete-text fallback, DOM/visibility ownership and the verified handoff ceiling are in [the reader contract](M1_READER_SOURCE.md#dyl-18-reader-ui-contract).

Exact commands, complete final test results, development failures, eight representative screenshots, synthetic fixture hashes, composer/backlog checks and remaining NOT_TESTED paths are in [TESTING](TESTING.md#dyl-18-text-reader--2026-10-12). Physical touch/IME/virtual keyboard, other engines/themes/extensions/host versions, real provider inference, natural capability/mount failures, native deep-pagination locator fallback and final-host empty/deleted/replaced/eventless/group-reader edge cases remain untested on this reader candidate. Existing history retains unknown completion provenance; unsupported rich content uses full literal text and a native route. M0/L10 historical conclusions are not rewritten.

Recommendation: owner review and a direct text-reader trial of this open PR. If exact unrendered-history handoff matters, separately authorize a narrow, non-mutating host history-loading proof. Do not merge automatically, mark Gate A passed, or begin later milestones.

### PR #8 P2 correction — 2026-10-12

Starting reviewed head: `29cb5bf8d348490f407565f9c3f9e91db6afb1d7`. Correction code: `f0e811bab1b3c74acd0ac00c4f75d9e9cf980684`; final pushed head is recorded in GitHub/Linear. The actual-entry browser regression first reproduced the stale-DOM false success, then passed with the correction. Matching attributes permit a best-effort candidate scroll, but the adapter always reports unresolved correspondence because the pinned host provides no rendered source/revision token. Same-object edits and index-only render notifications also cannot produce an exact-match claim.

**37/37 Node and 15/15 actual-entry Chromium tests PASS**. The host probe's expected notice was updated and syntax-checked; the 12-scenario host campaign was **not rerun** for this focused correction. Existing screenshots/results remain historical evidence on their recorded host-tested code. DYL-18 stays **In Review**, PR #8 stays open/unmerged, and Gate A stays **NOT_RUN**. See the [P2 testing addendum](TESTING.md#pr-8-p2-stale-native-dom-correction--2026-10-12).

## DYL-26 owner assignment — 2026-10-12

Fetched main at `0d3510816afb255e9d5eb3ef2c9e2335bcf962e0`; PRs #11 and #12 verified merged, DYL-24 and DYL-25 verified Done. The owner's DYL-26 assignment records **PASS for the bounded DYL-24 session-only prototype**, with the exact statement and limits in [decisions](DECISIONS.md#owner-decision-and-bounded-assignment--2026-10-12-dyl-26). This supersedes the historical “owner trial pending” status only for that prototype. **Gate A remains NOT_RUN**.

DYL-26 is a test-only host storage spike; see [report and evidence](M1_HOST_STORAGE_SPIKE.md). The production reader/stage remains unchanged and session-only. DYL-22/23 remain Backlog/blocked; M1.3 persistence and later milestones remain gated. No upstream request, release architecture selection or production installation is authorized.

## DYL-27 native identity/activation proof — 2026-10-12

Owner-assigned DYL-27 extends the merged DYL-26 experiment in a disposable pinned host only. [Report and evidence](M1_NATIVE_IDENTITY_ACTIVATION.md): **REVISE**. Newly created character-chat IDs survive native save/rename and restart; deletion/recreation receives a new ID. Actual native browser A→B→A and delayed CAS/activation-ack races pass in the experimental protocol. Native source-load correspondence, migration/recovery and complete scope/import lifecycle remain blockers. No production renderer/reader/persistence changes, upstream publication or later milestone work. DYL-24 stays session-only, DYL-22/23 remain blocked, Gate A NOT_RUN. Next bounded recommendation is a separately authorized native load/activation envelope proof; it is not started here.


## DYL-42 native writer coverage — 2026-10-14

Owner-assigned DYL-42 extends the merged DYL-26/27/28 disposable pinned-host proof. [Writer inventory, evidence and exact commands](M1_NATIVE_WRITER_COVERAGE.md): **REVISE**. Fresh JSONL character imports receive independent host-owned IDs; native copies/branches keep independent records; committed byte changes advance source revisions and identical saves retain them. Group native operations remain usable with persistent group visuals explicitly refused. Collision/failure controls preserve authority boundaries; unhooked cleanup/startup/card-scope writers, recovery and complete group identity remain blocked or untested. No production runtime changed. DYL-24 stays session-only, DYL-22/23 stay blocked, M1.3 remains unauthorized, Gate A NOT_RUN. Review the focused open/unmerged DYL-42 PR; no additional implementation is started.

## DYL-43 lifecycle invalidation — 2026-10-14

Owner-assigned bounded investigation on verified main `ea6659d70813812617ac0869bf9fd20093d71f0c`; PR #16 merged and DYL-42 Done. [Report, reproducible patch and raw evidence](M1_NATIVE_LIFECYCLE_INVALIDATION.md): **REVISE**. Native character rename/delete/recreation, duplicate, JSON replacement, Data Maid cleanup and registry failure boundaries were exercised in a disposable pinned host. Conservative revocation survives tested partial failures and process restart. An authoritative negative control still accepts an unobserved identical-byte rewrite/restoration under the old seal. Lifecycle reservations/write generations, restore/account incarnation and untested format/startup paths remain blockers. Final frozen runs: 38 lifecycle and 33 inherited checkpoints (overlapping inherited checks), 64 Node and 24 actual-entry Chromium tests. Production runtime unchanged; DYL-22/23 blocked, DYL-24 session-only, M1.3/M2 unauthorized, Gate A NOT_RUN. Next bounded recommendation is a separately authorized host lifecycle reservation/write-generation proof, not automatic implementation.

## DYL-44 lifecycle reservation/write-generation proof — 2026-10-14

**REVISE.** [Report and exact evidence](M1_NATIVE_LIFECYCLE_GENERATIONS.md): one authenticated-store reservation rejects overlapping participating native writers before mutation; independent chat write generations reject stale load/CAS authority even for identical bytes. Frozen new campaign: **36/36 expected checkpoints** (16 inherited + 20 new, including **2 unsafe counterexamples**, not safety passes). Same-overlay inherited lifecycle **38/38**, inherited writer **33/33**, Node **64/64**, actual-entry Chromium **24/24**; totals overlap. Interrupted and failed-finalization reservations remain refused after process restart. Unknown unobserved writers and metadata-preserving whole-root rollback can still restore old authority; a separately trusted store incarnation and explicit re-enrollment/recovery remain unresolved. Character recreation conservatively refuses visuals; groups remain refused. Production extension unchanged; DYL-22/23 blocked, DYL-24 session-only, M1.3/M2 unauthorized, Gate A NOT_RUN. One focused PR is for review, not merge authorization.


## DYL-45 external authority and explicit enrollment — 2026-10-14

**REVISE.** [Contract, rollback comparison, failure/race matrices and exact evidence](M1_EXTERNAL_STORE_AUTHORITY.md). A test-owned authority outside the restorable root detects user-root rollback after a participating native write and retains refusal through restart. Explicit enrollment of a revoked/recreated character allocates fresh scope/chat IDs and independent visual records; old CAS/load authority stays refused. Unknown in-place writers remain a counterexample. The corrected overlay does not pass the complete unchanged inherited campaigns: conservative whole-store failure refusal and read-time digest drift require a reviewed recovery contract. No production runtime changed. DYL-22/23 blocked, DYL-24 session-only, M1.3/M2 unauthorized, Gate A NOT_RUN. Deliver one open/unmerged experimental PR; follow-up requires separate authorization.


## DYL-46 external reconciliation experiment — 2026-10-14

[Report and evidence](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md): **REVISE; compatibility REQUEST CHANGES / HOLD**. Verified clean aborts for pre-write registry EACCES and malformed JSONL headers finalize forward; read-triggered revocation now owns an external/local reservation. New campaign completes 43 expected checkpoints (16 inherited + 27 new), including two unsafe negative controls; unchanged writers pass 33/33, lifecycle remains red after 21, generations after 27, authority after 32. No assertion weakened; unreached suffixes remain unproved. Node 64/64 and actual-entry Chromium 24/24. Production files unchanged.

Independent root rollback/forged local fields remain refused, but a failed external observation followed by unknown canonical restore and restart has no durable witness. Owner review and another bounded proof are required; no production persistence, merge approval or human gate verdict. DYL-22/23 blocked; DYL-24 session-only; M1.3/M2 unauthorized; Gate A NOT_RUN.


## DYL-46 review corrections — 2026-10-15

[Current correction record](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md#pr-20-review-corrections--2026-10-15) supersedes the original DYL-46 current-code findings above. A provisioned independent validation witness commits before canonical seal inspection and preserves refusal when external intent fails, including restored canonical bytes and two restarts. The exact inspected post-revocation/pre-native failure now completes VERIFIED_REVOCATION without re-enabling old authority. No production runtime or predecessor campaign assertions changed.

Corrected campaign: 56 expected checkpoints (16 inherited + 40 new), ONE unsafe unobserved-writer control; the old lost-observation counterexample is now a refusal regression. Writer 33/33; lifecycle still FAIL after 23 at partial rename; generations FAIL after 27; authority FAIL after 31 at its old store-wide-refusal expectation. Node 64/64. Actual-entry Chromium remains FAIL 23/24 on both attempts at unchanged line 445 (undefined versus false for absent image src); not waived or reported green. **REVISE / compatibility HOLD** remains. PR #20 stays open/unmerged; DYL-46 In Review. Gate A and downstream authorization are unchanged.


## DYL-46 re-review corrections — 2026-10-15

[Current report, commands, revisions, hashes, raw evidence and limits](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md#pr-20-re-review-corrections--2026-10-15). Approved contracts and forward-only undispatched receipt recovery now complete all inherited campaign suffixes: reconciliation 61 expected (ONE unsafe control), writers 33/33, lifecycle 41/41, generations 37/37, authority 46/46. Node 64/64; corrected Chromium 24/24 on both current main and PR. GO for bounded feasibility under approved contracts; merge HOLD for owner review. Unknown writers remain outside the guarantee. Production unchanged; PR #20 OPEN/unmerged, DYL-46 In Review; downstream gates unchanged.

## DYL-57 portable project bundles — 2026-10-15

Owner assignment authorizes the bounded bundle slice under DYL-55, after merged PR #24 at `537c193ce6ac22234cfaab04def85af8ae0a25a2`. Live Linear inspection reports DYL-49–54 Done; no DYL-54 status was changed here. DYL-55's existing dependency remains. [Portable contract](M1_PROJECT_PORTABILITY.md): strict versioned JSON/PNG copy, fresh identities and explicit open; database recovery (DYL-58) and unused-asset cleanup (DYL-59) remain Backlog/unimplemented. Final exact-head evidence and review recommendation are in [the portability implementation report](M1_PROJECT_PORTABILITY_IMPLEMENTATION.md). DYL-22/23 remain blocked, DYL-56 Backlog, M1.3/M2 unauthorized and Gate A NOT_RUN.

DYL-57 frozen candidate `770932811430dbd85bee79182be75ee3c22b7370`: 70/70 Node, 37/37 storage/bundle, 31/31 actual-entry Chromium, 12/12 disposable-host checkpoints PASS; 33 enumerated native file hashes unchanged. GO for bounded senior review, no production or human-gate acceptance. Exact commands, resource measurements, hashes and limits are in the portability report.

## DYL-58 database recovery — 2026-10-15

The owner separately authorized operator-only consistent SQLite backup, inspection and empty-slot disposable restore after PR #25 merged at `4337a05ac8321e714a9677d6a408aa3ee37bbcbf` and DYL-57 Done. [Recovery contract](M1_PROJECT_DATABASE_RECOVERY.md) and [implementation/evidence](M1_PROJECT_DATABASE_RECOVERY_IMPLEMENTATION.md). DYL-58 frozen acceptance PASS; In Review for senior review only. Prior Backlog/unimplemented entries remain historical. DYL-55 unfinished, DYL-59/56 Backlog, DYL-22/23 blocked, M1.3/M2 unauthorized, upstream on hold and Gate A NOT_RUN. No live host, overwrite, automatic recovery or account reassignment is authorized.

## DYL-59 explicit unused artwork cleanup — 2026-10-15

Owner-authorized selected cleanup follows verified merged PR #26 at `b37a60615795d8871171504de88da8d10afddf9e` and DYL-57/58 Done. [Contract](M1_PROJECT_ASSET_CLEANUP.md), [exact-candidate evidence](M1_PROJECT_ASSET_CLEANUP_IMPLEMENTATION.md). Schema v1, owner-scoped preview, committed-reference/inventory revalidation, atomic selected deletion and logical quota recovery; manual confirmation warns about unobservable other-tab drafts. No automatic cleanup/compaction, native mutation or in-app undo. The evidence report records final acceptance and review status; earlier predecessor entries remain historical. DYL-55 unfinished, DYL-56 Backlog, DYL-22/23 blocked, DYL-24 supported, M1.3/M2 unauthorized, upstream on hold and Gate A NOT_RUN.
