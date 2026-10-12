# Project status

**Updated:** 2026-10-11.

## Current state

The repository now contains the M0 compatibility shell. This is not a visual-novel reader and does not implement visual state, scene direction, or asset handling.

| Area | State |
| --- | --- |
| M0 shell code | IMPLEMENTED |
| Synthetic adapter/controller harness | PASS — 5 tests |
| SillyTavern 1.19.0 source inspection | COMPLETE — commit `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Isolated real-host shell smoke check | PASS — extension load, default-off control, repeated mount/dispose, draft retained |
| Live host generation lifecycle checks | NOT_TESTED — no provider configured |
| M0 overall | PARTIAL — live reply lifecycle remains unverified |
| M1 — manual visual-novel reader | NOT_STARTED / NOT_AUTHORIZED |
| Gate A — reader feel | NOT_RUN |
| M2 — automatic direction | NOT_STARTED |
| Gate B — direction quality | NOT_RUN |
| M3 — optional asset generation | NOT_STARTED |
| Gate C — image workflow | NOT_RUN |
| Tested SillyTavern release and full SHA | 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Provider tests | NOT_TESTED; no provider call was made |
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

The simulated harness passed 5 tests, including generated-message observations, streaming token observation, stop, continuation, regeneration, swipe, edit/delete, chat switching, group author labels, missing capabilities, and listener cleanup. These are synthetic observations, not proof that a live host run emits every event in the same order.

On a clean SillyTavern 1.19.0 checkout in an isolated temporary data root, the extension loaded and its checkbox began unchecked. Two enable/disable cycles preserved the exact synthetic draft `Synthetic draft: keep this exact text.` and left SillyTavern's chat surface in place. No provider was configured, so live normal/streaming replies, stop, continuation, regeneration, and group replies were not exercised.

The tested browser was the Codex in-app browser. No compatibility claim is made for other browsers, devices, themes, or extension combinations. See the [M0 compatibility checklist](M0_COMPATIBILITY.md).

## Next action

Review the M0 PR and, if the owner accepts the shell and its limits, plan M1 as a separate authorized task. Gate A remains NOT_RUN. Completing M0 does not authorize M1.

## Status discipline

Keep implementation, simulated checks, real-host checks, provider checks, and owner verdicts separate. Do not promote M0 to fully passed until the live lifecycle scenarios in the compatibility record have been exercised on an identified host environment.
