# Project status

**Updated:** 2026-10-12. The status snapshot below preserves the M0.1 record from 2026-10-11; the current M0.2 result is appended at the end.

## Current state

The repository now contains the M0 compatibility shell. This is not a visual-novel reader and does not implement visual state, scene direction, or asset handling.

| Area | State |
| --- | --- |
| M0 shell code | IMPLEMENTED |
| Synthetic adapter/controller/source harness | PASS — 8 tests |
| SillyTavern 1.19.0 source inspection | COMPLETE — commit `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Isolated real-host lifecycle checks | PARTIAL PASS — normal, streaming, stop, continuation, swipe, edit/delete, chat switching, toggles, and disable-during-stream verified with deterministic local endpoint |
| Live model/provider behavior | NOT_TESTED — endpoint was deterministic and local |
| Switch into empty B and generate; group/duplicate-name cases; capability removal in host UI | NOT_TESTED (deletion to an empty view was separately exercised) |
| M0 overall | PARTIAL / REVISE — supported lifecycle paths passed; listed host gaps remain |
| M1 — manual visual-novel reader | NOT_STARTED / NOT_AUTHORIZED |
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

Complete the remaining real-host empty-chat switch/generation and group scenarios on the pinned host, then request owner review of the evidence. Gate A remains NOT_RUN. M1 remains NOT_AUTHORIZED.

## Status discipline

Keep implementation, simulated checks, real-host checks, provider checks, and owner verdicts separate. Do not promote M0 to fully passed until the outstanding host scenarios in the compatibility record have been exercised and the owner has reviewed the evidence.

## M0.2 current status (2026-10-12)

| Area | Current result |
| --- | --- |
| Host-validated SillyNovel candidate | `de25366aeaa5e1cbd10e9bc40861e8ae91339aee` |
| PR review fix candidate | `831714e9343b51682d643efb2eaa419ef9ab5145` |
| Pinned host | SillyTavern 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Synthetic regression suite | PASS — 13 tests |
| L10: revisitable empty B and generation | UNSUPPORTED / WAIVER REQUESTED; supported UI restores the welcome message after switching away and reopening |
| L12: group author labels and switching | HOST PASS |
| L13: duplicate-name labels | HOST PASS for M0 label-only behavior; stable identity remains an M1 contract requirement |
| L16: missing capability in browser | INSTRUMENTED_HOST_PASS; no stage/partial activation, native chat usable, normal activation recovered after restoring context |
| Same-length eventless content update | SYNTHETIC PASS; one refresh, unchanged-source deduplication, and disposal verified; browser host not rerun for this edge case |
| Confirmed production defect | Eventless Temporary Chat transition kept stale stage content on previous candidate; fixed and host-rechecked on the validated candidate |
| M0 recommendation | PASS recommended subject to owner acceptance of L10 waiver; owner verdict pending |
| Gate A | NOT_RUN |
| M1 | NOT_AUTHORIZED |
| Real model/provider, other host releases, browsers, and error/abort paths | NOT_TESTED |

The host-validated candidate uses a coalesced, disposal-owned observer on `#chat`; the PR review fix additionally compares exact text when the other source fields and length match. It does not change canonical chat content or host source, and message bodies are neither logged nor hashed. The review fix was tested synthetically; host evidence remains tied to `de25366`. Full evidence and exact commands are in [M0 lifecycle validation](M0_LIFECYCLE_VALIDATION.md), [M0 compatibility](M0_COMPATIBILITY.md), and [testing](TESTING.md). The L10 waiver is a request for owner review, not an approval.

## M1 planning handoff — 2026-10-12, DYL-15

[M1 reader plan](M1_PLAN.md) supplies complete-message desktop/narrow/keyboard layouts, streaming and older-cursor rules, manual cast/asset/lock contracts, source-anchored state/save failure boundaries, component interfaces and a frozen owner Gate A session. Documentation only: M1 runtime is **NOT_STARTED / NOT_AUTHORIZED**. Owner M0/L10 acceptance remains pending; Gate A is **NOT_RUN**.

Initial clean checkout: `6eedb720e699b1194db41371975ddd07b4db46c6`. Fetched main and this focused branch's base: `a7f1a4a6299a459adce1e24ea7b1b3f4405d02b5` (merged PR #3). Branch: `codex/dyl-15-m1-reader-plan`. Final pushed head and PR are recorded in the GitHub/Linear handoff rather than inventing a self-referential SHA in this file.

The Linear project and DYL-15–DYL-19 were read directly; those five existing M1 issues form plan → owner decisions → source model → text reader, plus identity/storage proof alongside source work after authorization. Eight later bounded ticket titles/dependencies are proposed in the plan; no issues were created or implementation started. DYL-19 failures block the affected persistence/binding/storage work. Next action: review DYL-15, then record actual owner decisions in DYL-16. DYL-17 is the recommended first implementation ticket only after explicit authorization.

Verification for this planning PR: relative Markdown file/anchor and fenced-block checks, `git diff --check`, and docs-only path/runtime comparison, with exact results in the PR/Linear handoff. No new runtime tests, host/browser/provider/device run, or owner playtest is claimed. Existing M0 evidence retains its original candidate and limitations.
