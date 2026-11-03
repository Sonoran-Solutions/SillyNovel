# Gate B record — candidate 6799a5e — started 2026-11-02

**Gate B NOT_RUN.** Started from the [Gate B record template](../../GATE_B_RECORD_TEMPLATE.md) when the owner [froze the candidate](../../DECISIONS.md#gate-b-candidate-frozen--6799a5e--2026-11-02). Only fields an agent observed are filled; every owner line is NOT_RUN and no field is filled by inference. Each later step of [plan section 6.1](../../M2_4_EVIDENCE_UI_PLAN.md#61-sequence) needs its own owner authorization and adds its half below. No excerpts, messages or labels from a private chat enter this file.

```text
Gate: B
Candidate full SHA: 6799a5e74427b7b8052c39bb64cbb2fe0c408413
SillyTavern release and full SHA: 1.19.0 7e8663cd9c184a550b37238218bdd32c6efc68e9 (disposable pinned host used by the campaign; the owner's session host is the owner's choice, G10, NOT_RUN)
Browser and device: campaign: headless Chromium 151.0.7922.34 via Playwright on Linux 7.0.0-38-generic x86_64 (pins.json). Owner session: NOT_RUN
Relevant extensions/configuration: campaign: SillyNovel only, loopback director endpoint tests/fixtures/m2-director-endpoint.mjs, no real provider. Owner session: NOT_RUN
Assets/providers used: campaign: fixture assets, no provider. Owner session: NOT_RUN
Scenarios exercised: automated only; see Automated checks. Owner session: NOT_RUN
Automated checks actually run: on 2026-11-02 from a checkout of 6799a5e:
  git diff --quiet e37d6b5 6799a5e -- src tests index.js style.css plugins   (empty: runtime and tests byte-identical)
  python3 tests/probes/dyl60/validate.py docs/evidence/m2-4-d/campaign   PASS, 132 frozen inputs; node 362, storage 126, browser 103, stage-library-migration 24, expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60; 115 artifact hashes
  python3 tests/probes/dyl60/check-discovery.py   PASS 14/5/1
  The campaign itself ran on e37d6b5 (tested revision), not on the candidate (current revision): reused evidence.
Owner feedback (verbatim or clearly attributed): NOT_RUN
Owner verdict: NOT_RUN
Remaining blockers: steps 3–6 of plan 6.1 unauthorized and NOT_RUN: DYL-193 replay, fixture evaluation, owner session, verdict
Known limitations: the campaign is synthetic on the loopback endpoint; nothing here measures direction, latency or a real backend
Evidence locations: docs/evidence/m2-4-d/campaign/ (package SHA-256 over sorted per-file hashes: 5b63e37f593995b91ab000b66ad969ee62fe3354797705dfc1bbdfd19bd00995); failed first run retained at docs/evidence/m2-4-d/failed-f74423d/

--- Fixture evaluation (plan 6.2) ---
Authorization for the 40 requests (DECISIONS entry): NOT_RUN (none)
Expected-answers SHA-256 (tests/fixtures/m2-gate-b/expected-answers.sha256): ada4ff1ed766af87872a0b50973b95a0d7b652a0b773ddaeb0ad54a6804cacf5
Commit that froze those answers, recorded before the first measurement: first committed at f74423d6c5802c828b488cc5c3574418b954b7de, unchanged at e37d6b5 and at 6799a5e
PROMPT_VERSION: 0ef22635aed99352
Connection class and model, as the owner reports them: NOT_RUN
Runner command and deadline: NOT_RUN
Results file and its SHA-256: NOT_RUN
All cases run (scorer “All cases run”): NOT_RUN
Counts by category, copied from the scorer with no aggregate and no percentage:
  presence: NOT_RUN
  mentions: NOT_RUN
  negation: NOT_RUN
  hypothetical travel: NOT_RUN
  flashbacks: NOT_RUN
  outfit continuity: NOT_RUN
  group authorship: NOT_RUN
  user locks: NOT_RUN
Earlier measurements retained, if an answer changed (each with its SHA): none

--- Hard gates, from the regression and native campaign on the frozen SHA ---
Campaign evidence location and SHA: docs/evidence/m2-4-d/campaign/, run on e37d6b5bd27c1356b2a99cdf1ef3ed714286ef6f, byte-identical runtime and tests to the candidate; package SHA-256 5b63e37f593995b91ab000b66ad969ee62fe3354797705dfc1bbdfd19bd00995
Cross-chat commits (must be 0): 0 observed in the campaign (A → B → A, chat switch and detach blocks: no overlay or journal state from one chat shown in another; every native file byte-identical)
Canonical text or card modifications (must be 0): 0 observed in the campaign (“canonical files unchanged” asserted in seven blocks; native files byte-identical in every director block)
Stale-result applications (must be 0): 0 observed in the campaign (stale results dropped with no journal write after swipe, edit, older edit, navigation, manual layout, disable, detach, continue start, chat switch and A → B → A; STALE_JOURNAL and STALE_SCENE recorded as not failures)
Automatic overrides of active locks (must be 0): 0 observed in the campaign (locked fields skipped LOCKED; corrections held; the director-may-move control releases only the field the owner marks)

--- Real session (plan 6.3), counts and the owner's words only ---
Date, host, chat kinds used (individual, native group): NOT_RUN
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
Backend, as the owner reports it: NOT_RUN
Regenerate while requesting: reply kept or lost / toast or none / recovery used: NOT_RUN
Continue while requesting: reply kept or lost / toast or none / recovery used: NOT_RUN
Swipe while requesting: reply kept or lost / toast or none / recovery used: NOT_RUN
Quick reply while requesting, if used: reply kept or lost / toast or none / recovery used: NOT_RUN
Slash command while requesting, if used: reply kept or lost / toast or none / recovery used: NOT_RUN
Owner's decision: the help sentence suffices / a fix is required before beta: NOT_RUN
Synthetic comparison: docs/M2_4_EVIDENCE_UI_IMPLEMENTATION.md, PR D, T68 outcomes (Regenerate lost the reply; Continue and swipe kept it; user message kept in all three; recovery by the same flow once the slot freed)

--- DYL-193 ---
Replay evidence location and SHA: docs/evidence/dyl193/ (desktop campaign on probe head 133428768500373f36195928aff06a5bc9b21abb, device run on 8f784f06602d62605bf1bf03b6e8efd457cee153; both with the runtime byte-identical to the candidate 6799a5e74427b7b8052c39bb64cbb2fe0c408413; tests added only); SHA-256 of artifacts.json c04cbecb81b4b94b94cca8e3b600be7cc848ce9e2d71cdede3c2ebee19c236a8; record docs/DYL_193_REPLAY_RECORD.md (candidate, unmerged)
Unreached surfaces, stated as NOT_TESTED and accepted by the owner: NOT_TESTED: increased text scaling on the tablet and the browser's own zoom setting (a real pinch to 2.0 was reached); reduced motion on the tablet; screen reader on desktop and tablet; portrait; the controls panel and cleanup list at the pinched scale; a real picker selection and Brave's save step for the export (export and import are PASS bounded); system-level (not emulated) reduced motion and font size on desktop. Reached: native group branch and checkpoint (TESTED on the host); desktop scaling and reduced motion (SYNTHETIC); tablet reply field with the disclosure and keyboard open, pinch to 2.0, file pickers and cleanup by touch (TESTED). Accepted by the owner: NOT_RUN
```

A PASS is recordable only with the four hard gates at zero on the frozen SHA, DYL-193 evidence on that SHA, fixture counts recorded and no lost canonical text or saved-project change in the session ([plan section 6.5](../../M2_4_EVIDENCE_UI_PLAN.md#65-pass-criteria-for-the-owners-verdict)). No percentage threshold exists. Only the owner supplies the verdict and the owner's lines above.
