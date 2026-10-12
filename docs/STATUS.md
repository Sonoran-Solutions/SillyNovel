# Project status

**Updated:** 2026-10-12. Historical M0.1 and planning handoffs are preserved below; the owner-approved current state is recorded last.

## Current state

The repository now contains the M0 compatibility shell. This is not a visual-novel reader and does not implement visual state, scene direction, or asset handling.

| Area | State |
| --- | --- |
| M0 shell code | IMPLEMENTED |
| Synthetic adapter/controller/source harness | PASS — 13 tests on the recorded review-fix candidate |
| SillyTavern 1.19.0 source inspection | COMPLETE — commit `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Isolated real-host lifecycle checks | PASS within documented scope — normal, streaming, stop, continuation, swipe, edit/delete, chat switching, toggles, group/duplicate labels, and disable-during-stream verified with synthetic data and deterministic local endpoint |
| Live model/provider behavior | NOT_TESTED — endpoint was deterministic and local |
| L10 persistent empty-chat workflow | UNSUPPORTED / WAIVED; supported host UI restores the welcome message on reopen |
| Missing-capability behavior | INSTRUMENTED_HOST_PASS; capability omission was injected, not a natural host failure |
| M0 overall | OWNER APPROVED PASS for the explicitly documented scope and evidence limits; L10 is UNSUPPORTED / WAIVED |
| M1 runtime | IN_PROGRESS on DYL-17 source model; DYL-19 is separately authorized work, DYL-18 and later tickets remain blocked pending prerequisites and separate authorization |
| Gate A — reader feel | NOT_RUN |
| M2 — automatic direction | NOT_STARTED |
| Gate B — direction quality | NOT_RUN |
| M3 — optional asset generation | NOT_STARTED |
| Gate C — image workflow | NOT_RUN |
| Tested SillyTavern release and full SHA | 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Provider tests | Deterministic localhost OpenAI-compatible endpoint tested; real model/provider behavior NOT_TESTED |
| License choice | OPEN |

## Starting repository state

The implementation checkout was cloned from the repository's default `main` branch at full SHA `6631f6e29b6a05420bc5b9c16bf02b242c9fad8c`. The branch was clean at that commit. The implementation branch is `codex/m0-shell`. The initial supplied workspace directory was empty; no pre-existing local files or changes were overwritten.

## Scope implemented

- SillyTavern manifest, module entry point, and scoped stylesheet.
- A setting that defaults off, mounts a labeled placeholder before the chat surface, and disposes its owned stage and event listeners.
- Read-only observation of current host chat/message/author data; no canonical chat, card, lorebook, persona, or model settings are written.
- A Node built-in test harness and a pinned source/host evidence record.
- Development/install instructions in [README.md](../README.md).

The implementation persists only the user's `extensionSettings.sillynovel.enabled` preference. It does not persist chat or character identity. Details and limitations are in [M0 compatibility](M0_COMPATIBILITY.md).

## Verification record

The synthetic harness passed 8 tests, including source clearing across empty-chat transitions, A → B → A refresh, malformed indices, missing capabilities, listener cleanup, and canonical chat immutability through enable/disable. The real-host checks used pinned SillyTavern 1.19.0 and a deterministic localhost endpoint. Normal, streaming, stopped, continued, regenerated, swipe-selected, edited, deleted, and chat-switch flows were exercised. Disabling SillyNovel during a stream removed its stage/listeners without stopping the host reply. The streamed message object lagged the `STREAM_TOKEN_RECEIVED` event until SillyTavern's progress update; M1 must not treat a token-event-time sample as current text.

Deletion to an empty view was exercised, but the host switch into an empty B chat and generation-start sequence remains untested: reopening B after switching away restored its welcome message. Group author mapping (including duplicate names) and missing-capability removal were not exercised in the UI. Error/aborted network behavior and actual model/provider behavior are also unverified. Browser: Brave `154.1.96.61`; exact engine version unavailable. No compatibility claim is made for other browsers, devices, themes, extension combinations, SillyTavern versions, or models. See [M0 compatibility](M0_COMPATIBILITY.md) and the [dated lifecycle report](M0_LIFECYCLE_VALIDATION.md).

## Next action

Run authorized DYL-17 and DYL-19 as separate, coordinated branches and separate open PRs. DYL-17 includes a short current-main-head regression smoke check in pinned-host validation. Gate A remains NOT_RUN; M2 remains unauthorized.

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
