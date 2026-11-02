# Gate B record template

**Template only. Gate B NOT_RUN.** Copy this into a dated evidence file when the owner runs Gate B. It carries the [human gate record](TESTING.md#6-human-gate-record) plus the fields of [M2.4 plan section 6.4](M2_4_EVIDENCE_UI_PLAN.md#64-on-record). Each step of [plan section 6.1](M2_4_EVIDENCE_UI_PLAN.md#61-sequence) needs its own owner authorization, and no field below may be filled in by inference.

**No excerpts, messages or labels from a private chat enter the repository** ([AGENTS.md](../AGENTS.md)). The session half holds counts and the owner's words only. The fixture half holds public-safe text and each proposal's JSON. No headers, keys or connection settings anywhere.

```text
Gate: B
Candidate full SHA:
SillyTavern release and full SHA:
Browser and device:
Relevant extensions/configuration:
Assets/providers used:
Scenarios exercised:
Automated checks actually run:
Owner feedback (verbatim or clearly attributed):
Owner verdict: NOT_RUN / PASS / REVISE / STOP
Remaining blockers:
Known limitations:
Evidence locations:

--- Fixture evaluation (plan 6.2) ---
Authorization for the 40 requests (DECISIONS entry):
Expected-answers SHA-256 (tests/fixtures/m2-gate-b/expected-answers.sha256):
Commit that froze those answers, recorded before the first measurement:
PROMPT_VERSION:
Connection class and model, as the owner reports them:
Runner command and deadline:
Results file and its SHA-256:
All cases run (scorer “All cases run”): yes / NO, with the cases not run:
Counts by category, copied from the scorer with no aggregate and no percentage:
  presence:
  mentions:
  negation:
  hypothetical travel:
  flashbacks:
  outfit continuity:
  group authorship:
  user locks:
Earlier measurements retained, if an answer changed (each with its SHA):

--- Hard gates, from the regression and native campaign on the frozen SHA ---
Campaign evidence location and SHA:
Cross-chat commits (must be 0):
Canonical text or card modifications (must be 0):
Stale-result applications (must be 0):
Automatic overrides of active locks (must be 0):

--- Real session (plan 6.3), counts and the owner's words only ---
Date, host, chat kinds used (individual, native group):
Requests and ceiling:
Tallies by outcome and code (from “Session summary”, copied before closing):
Dispositions by field:
Corrections by field:
Elapsed minimum, median, maximum:
Pauses and resumes:
Lifecycle checks, each as seen (one swipe, one edit, one A → B → A, one reload):
Did automatic visuals follow the story without being annoying or untrustworthy (owner):
Abstention (owner):
Latency (owner):
Corrections occasional or constant (owner):
Was one panel enough to understand a wrong choice (owner):
Lock on correction, G6 (owner):
Re-importing expressions on each attachment, E11 and G11 (owner):

--- E16 residual on the owner's backend (G13) ---
Backend, as the owner reports it:
Regenerate while requesting: reply kept or lost / toast or none / recovery used:
Continue while requesting: reply kept or lost / toast or none / recovery used:
Swipe while requesting: reply kept or lost / toast or none / recovery used:
Quick reply while requesting, if used: reply kept or lost / toast or none / recovery used:
Slash command while requesting, if used: reply kept or lost / toast or none / recovery used:
Owner's decision: the help sentence suffices / a fix is required before beta:
Synthetic comparison: docs/M2_4_EVIDENCE_UI_IMPLEMENTATION.md, PR D, T68 outcomes

--- DYL-193 ---
Replay evidence location and SHA:
Unreached surfaces, stated as NOT_TESTED and accepted by the owner:
```

A PASS is recordable only with the four hard gates at zero on the frozen SHA, DYL-193 evidence on that SHA, fixture counts recorded and no lost canonical text or saved-project change in the session ([plan section 6.5](M2_4_EVIDENCE_UI_PLAN.md#65-pass-criteria-for-the-owners-verdict)). No percentage threshold exists. Only the owner supplies the verdict and the owner's lines above; an agent may fill in commands, hashes and scorer output it actually observed.
