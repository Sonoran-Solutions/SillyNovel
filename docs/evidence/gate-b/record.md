# Gate B record — candidate 6799a5e — started 2026-11-02

**Gate B verdict: PASS, recorded 2026-11-03 in the owner's words ([DECISIONS](../../DECISIONS.md#gate-b-verdict--pass--2026-11-03)). The real-session and E16 lines below stay NOT_RUN because the owner chose to record the verdict without reporting them; nothing in them is inferred.** Started from the [Gate B record template](../../GATE_B_RECORD_TEMPLATE.md) when the owner [froze the candidate](../../DECISIONS.md#gate-b-candidate-frozen--6799a5e--2026-11-02). Only fields an agent observed are filled; every owner line is NOT_RUN and no field is filled by inference. Each later step of [plan section 6.1](../../M2_4_EVIDENCE_UI_PLAN.md#61-sequence) needs its own owner authorization and adds its half below. No excerpts, messages or labels from a private chat enter this file.

```text
Gate: B
Candidate full SHA: 6799a5e74427b7b8052c39bb64cbb2fe0c408413
SillyTavern release and full SHA: 1.19.0 7e8663cd9c184a550b37238218bdd32c6efc68e9 (disposable pinned host used by the campaign). Owner's session host: the owner's regular SillyTavern install at ~/SillyTavern, release 1.18.0 git 8172dcd0e, run by the owner's systemd user service sillytavern-server on Node 24.18.0, serving SillyNovel at the candidate by symlink, with the candidate's storage plugin installed under plugins/sillynovel-storage and four config lines changed from the kept backup config.yaml.bak-20261103-sillynovel: dataRoot made absolute (/home/dq/SillyTavern/data), enableUserAccounts true, enableServerPlugins true, enableServerPluginsAutoUpdate false (owner's decisions: owner-decision--gate-b-fixture-run-on-the-owners-regular-sillytavern-install--2026-11-03 and the verdict entry)
Browser and device: campaign: headless Chromium 151.0.7922.34 via Playwright on Linux 7.0.0-38-generic x86_64 (pins.json). Owner session: the owner's own desktop browser on the same machine; not measured
Relevant extensions/configuration: campaign: SillyNovel only, loopback director endpoint tests/fixtures/m2-director-endpoint.mjs, no real provider. Owner session: NOT_RUN
Assets/providers used: campaign: fixture assets, no provider. Owner session: NOT_RUN
Scenarios exercised: automated only; see Automated checks. Owner session: the owner opened the reader on an individual chat in that host with the candidate loaded and was shown how to create a project and import temporary expressions; what the owner then exercised was not reported: NOT_RUN
Automated checks actually run: on 2026-11-02 from a checkout of 6799a5e:
  git diff --quiet e37d6b5 6799a5e -- src tests index.js style.css plugins   (empty: runtime and tests byte-identical)
  python3 tests/probes/dyl60/validate.py docs/evidence/m2-4-d/campaign   PASS, 132 frozen inputs; node 362, storage 126, browser 103, stage-library-migration 24, expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60; 115 artifact hashes
  python3 tests/probes/dyl60/check-discovery.py   PASS 14/5/1
  The campaign itself ran on e37d6b5 (tested revision), not on the candidate (current revision): reused evidence.
Owner feedback (verbatim or clearly attributed): “ok I approve of the current build” and, asked for the record's session lines, “You can skip the answers to the questions and record a PASS” (2026-11-03, America/Phoenix). No other feedback given
Owner verdict: PASS (2026-11-03, America/Phoenix; the owner's words above)
Remaining blockers: none inside the Gate B sequence; steps 1 to 4 done and merged, step 5 run as the owner chose with its lines unreported (NOT_RUN), step 6 PASS recorded. Beta, release and any further live installation stay unauthorized (README, G10); tablet text scaling, tablet reduced motion and screen readers stay NOT_TESTED (DYL-193)
Known limitations: the campaign is synthetic on the loopback endpoint; direction was measured once by the fixture run (counts below, no percentage); latency on a real backend only as the fixture run's elapsed times; the owner's session lines, including the plan 6.5 line on lost canonical text or saved-project change, are unreported (NOT_RUN); the owner's session host is 1.18.0, not the pinned 1.19.0
Evidence locations: docs/evidence/m2-4-d/campaign/ (package SHA-256 over sorted per-file hashes: 5b63e37f593995b91ab000b66ad969ee62fe3354797705dfc1bbdfd19bd00995); failed first run retained at docs/evidence/m2-4-d/failed-f74423d/

--- Fixture evaluation (plan 6.2) ---
Authorization for the 40 requests (DECISIONS entry): docs/DECISIONS.md, “Owner authorization — Gate B fixture evaluation on candidate 6799a5e — 2026-11-03” (“Yes, authorize it”); run on 2026-11-03, host per docs/DECISIONS.md, “Owner decision — Gate B fixture run on the owner's regular SillyTavern install — 2026-11-03”
Expected-answers SHA-256 (tests/fixtures/m2-gate-b/expected-answers.sha256): ada4ff1ed766af87872a0b50973b95a0d7b652a0b773ddaeb0ad54a6804cacf5
Commit that froze those answers, recorded before the first measurement: first committed at f74423d6c5802c828b488cc5c3574418b954b7de, unchanged at e37d6b5 and at 6799a5e
PROMPT_VERSION: 0ef22635aed99352
Connection class and model, as the owner reports them: OpenRouter chat completion, model Xiaomi MiMo-V2.6-Pro, provider DeepInfra, no fallback models or providers (the owner's host settings as the owner showed and confirmed them; the runner retained nothing about the connection). Host: the owner's regular SillyTavern install at ~/SillyTavern, release 1.18.0, git 8172dcd0e (not the pinned 1.19.0 7e8663c), with SillyNovel served by symlink from a checkout detached at the candidate; served src/director-request.mjs and src/host-adapter.mjs hash-equal to the candidate's
Runner command and deadline: from a checkout at 6799a5e, `timeout --foreground -k 15 3900 node tests/probes/m2-gate-b/run.mjs --owner-accepts-40-requests --origin http://127.0.0.1:8000 --out results.json`, headed, 90 s per case; started 2026-11-04T02:39:32Z (2026-11-03 19:39 America/Phoenix); the owner selected the connection in the browser window and pressed Enter; all 40 cases settled within about two minutes; the runner printed “Finished: 40 cases, 0 not run” and then stayed alive, so it was sent SIGTERM and exited 143 at 02:46:25Z with the results file already complete (it is rewritten after every case). Two earlier launches were stopped by the kernel on reading the terminal because the wrapper ran timeout without --foreground; neither sent a request (fixture/runner.log is the successful launch's log)
Results file and its SHA-256: docs/evidence/gate-b/fixture/results.json 0ee8748fd98431e4690a5060baad6a076a35de51a57aa794d16aa00d6e531c10; cases as sent in fixture/results-cases.json (SHA-256 ada4ff1ed766af87872a0b50973b95a0d7b652a0b773ddaeb0ad54a6804cacf5, equal to the expected-answers SHA); scorer output in fixture/score.txt; elapsed per case 542 ms min, 1681 ms median, 12889 ms max
All cases run (scorer “All cases run”): yes; 40 sent, 36 scored, 4 refused (NOT_SINGLE_JSON), 0 failed, 0 not run
Counts by category, copied from the scorer with no aggregate and no percentage:
  presence: 5 cases, 5 scored, refused 0, failed 0, not run 0; background: correct 5, incorrect 0, abstained 0; presence: correct 12, incorrect 0, abstained 0; expression: correct 10, incorrect 2, abstained 0; noted: locked skips 0, repeated values 0, outfit updates 0, suggestions 0
  mentions: 5 cases, 5 scored, refused 0, failed 0, not run 0; background: correct 5, incorrect 0, abstained 0; presence: correct 12, incorrect 0, abstained 0; expression: correct 9, incorrect 3, abstained 0; noted: locked skips 0, repeated values 0, outfit updates 0, suggestions 0
  negation: 5 cases, 5 scored, refused 0, failed 0, not run 0; background: correct 5, incorrect 0, abstained 0; presence: correct 10, incorrect 0, abstained 0; expression: correct 7, incorrect 3, abstained 0; noted: locked skips 0, repeated values 0, outfit updates 0, suggestions 0
  hypothetical travel: 5 cases, 4 scored, refused 1 (NOT_SINGLE_JSON 1), failed 0, not run 0; background: correct 4, incorrect 0, abstained 0; presence: correct 8, incorrect 0, abstained 0; expression: correct 7, incorrect 1, abstained 0; noted: locked skips 0, repeated values 0, outfit updates 0, suggestions 0
  flashbacks: 5 cases, 5 scored, refused 0, failed 0, not run 0; background: correct 3, incorrect 2, abstained 0; presence: correct 9, incorrect 1, abstained 0; expression: correct 7, incorrect 3, abstained 0; noted: locked skips 0, repeated values 0, outfit updates 0, suggestions 0
  outfit continuity: 5 cases, 5 scored, refused 0, failed 0, not run 0; background: correct 5, incorrect 0, abstained 0; presence: correct 10, incorrect 0, abstained 0; expression: correct 9, incorrect 1, abstained 0; outfit: correct 10, incorrect 0, abstained 0; noted: locked skips 0, repeated values 0, outfit updates 1, suggestions 0
  group authorship: 5 cases, 4 scored, refused 1 (NOT_SINGLE_JSON 1), failed 0, not run 0; background: correct 4, incorrect 0, abstained 0; presence: correct 12, incorrect 0, abstained 0; expression: correct 12, incorrect 0, abstained 0; noted: locked skips 0, repeated values 0, outfit updates 0, suggestions 0
  user locks: 5 cases, 3 scored, refused 2 (NOT_SINGLE_JSON 2), failed 0, not run 0; background: correct 3, incorrect 0, abstained 0; presence: correct 6, incorrect 0, abstained 0; expression: correct 4, incorrect 2, abstained 0; noted: locked skips 4, repeated values 0, outfit updates 0, suggestions 0
Earlier measurements retained, if an answer changed (each with its SHA): none

--- Hard gates, from the regression and native campaign on the frozen SHA ---
Campaign evidence location and SHA: docs/evidence/m2-4-d/campaign/, run on e37d6b5bd27c1356b2a99cdf1ef3ed714286ef6f, byte-identical runtime and tests to the candidate; package SHA-256 5b63e37f593995b91ab000b66ad969ee62fe3354797705dfc1bbdfd19bd00995
Cross-chat commits (must be 0): 0 observed in the campaign (A → B → A, chat switch and detach blocks: no overlay or journal state from one chat shown in another; every native file byte-identical)
Canonical text or card modifications (must be 0): 0 observed in the campaign (“canonical files unchanged” asserted in seven blocks; native files byte-identical in every director block)
Stale-result applications (must be 0): 0 observed in the campaign (stale results dropped with no journal write after swipe, edit, older edit, navigation, manual layout, disable, detach, continue start, chat switch and A → B → A; STALE_JOURNAL and STALE_SCENE recorded as not failures)
Automatic overrides of active locks (must be 0): 0 observed in the campaign (locked fields skipped LOCKED; corrections held; the director-may-move control releases only the field the owner marks)

--- Real session (plan 6.3), counts and the owner's words only ---
Date, host, chat kinds used (individual, native group): 2026-11-03; host as above; an individual chat was opened; whether a native group was used: not reported, NOT_RUN
Requests and ceiling: NOT_RUN
Tallies by outcome and code (from “Session summary”, copied before closing): NOT_RUN
Dispositions by field: NOT_RUN
Corrections by field: NOT_RUN
Elapsed minimum, median, maximum: NOT_RUN
Pauses and resumes: NOT_RUN
Lifecycle checks, each as seen (one swipe, one edit, one A → B → A, one reload): NOT_RUN
Did automatic visuals follow the story without being annoying or untrustworthy (owner): NOT_RUN
Abstention (owner): NOT_RUN
Latency (owner): NOT_RUN
Corrections occasional or constant (owner): NOT_RUN
Was one panel enough to understand a wrong choice (owner): NOT_RUN
Lock on correction, G6 (owner): NOT_RUN
Re-importing expressions on each attachment, E11 and G11 (owner): NOT_RUN

--- E16 residual on the owner's backend (G13) ---
Backend, as the owner reports it: not reported for the session (the fixture run used OpenRouter chat completion, Xiaomi MiMo-V2.6-Pro via DeepInfra, on the same host); NOT_RUN
Regenerate while requesting: reply kept or lost / toast or none / recovery used: NOT_RUN
Continue while requesting: reply kept or lost / toast or none / recovery used: NOT_RUN
Swipe while requesting: reply kept or lost / toast or none / recovery used: NOT_RUN
Quick reply while requesting, if used: reply kept or lost / toast or none / recovery used: NOT_RUN
Slash command while requesting, if used: reply kept or lost / toast or none / recovery used: NOT_RUN
Owner's decision: the help sentence suffices / a fix is required before beta: not reported; the help sentence stands as shipped; NOT_RUN
Synthetic comparison: docs/M2_4_EVIDENCE_UI_IMPLEMENTATION.md, PR D, T68 outcomes (Regenerate lost the reply; Continue and swipe kept it; user message kept in all three; recovery by the same flow once the slot freed)

--- DYL-193 ---
Replay evidence location and SHA: docs/evidence/dyl193/ (desktop campaign on probe head 133428768500373f36195928aff06a5bc9b21abb, device run on 8f784f06602d62605bf1bf03b6e8efd457cee153; both with the runtime byte-identical to the candidate 6799a5e74427b7b8052c39bb64cbb2fe0c408413; tests added only); SHA-256 of artifacts.json c04cbecb81b4b94b94cca8e3b600be7cc848ce9e2d71cdede3c2ebee19c236a8; record docs/DYL_193_REPLAY_RECORD.md (merged cf31c38, PR #71, head 62a1f16; the runtime at that head is byte-identical to the candidate)
Unreached surfaces, stated as NOT_TESTED and accepted by the owner: NOT_TESTED: increased text scaling on the tablet and the browser's own zoom setting (a real pinch to 2.0 was reached); reduced motion on the tablet; screen reader on desktop and tablet; portrait; the controls panel and cleanup list at the pinched scale; a real picker selection and Brave's save step for the export (export and import are PASS bounded); system-level (not emulated) reduced motion and font size on desktop. Reached: native group branch and checkpoint (TESTED on the host); desktop scaling and reduced motion (SYNTHETIC); tablet reply field with the disclosure and keyboard open, pinch to 2.0, file pickers and cleanup by touch (TESTED). Accepted by the owner: yes; the owner said “Yes, merge it” to PR #71 on 2026-11-03 with the NOT_TESTED list above stated in the PR summary (docs/DECISIONS.md, “Owner acceptance — DYL-193 replay merged on Gate B candidate 6799a5e — 2026-11-03”); nothing in that acceptance claims a NOT_TESTED surface
```

A PASS is recordable only with the four hard gates at zero on the frozen SHA, DYL-193 evidence on that SHA, fixture counts recorded and no lost canonical text or saved-project change in the session ([plan section 6.5](../../M2_4_EVIDENCE_UI_PLAN.md#65-pass-criteria-for-the-owners-verdict)). No percentage threshold exists. Only the owner supplies the verdict and the owner's lines above. On 2026-11-03 the owner recorded PASS without reporting the session lines: the hard gates, the DYL-193 evidence and the fixture counts are recorded above, and the session line on lost canonical text or saved-project change is NOT_RUN. The verdict is the owner's; this file states what was observed and what was not.
