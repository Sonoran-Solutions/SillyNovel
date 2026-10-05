# First implementation task — M0 only

Use this prompt after the documentation has been added to `Sonoran-Solutions/SillyNovel`.

---

Implement **M0: compatibility and reversible extension shell** for SillyNovel. Work only on this milestone. Open a focused PR and leave it unmerged for review.

SillyNovel is a SillyTavern extension for an immersive visual-novel roleplay experience. The existing conversation, cards, lorebooks, personas, and model connection remain authoritative. This is not a new game engine, asset studio, or chat backend.

## Required preparation

Inspect the actual repository and its default branch. Record the starting full SHA and existing working-tree state; preserve unrelated changes. Read README, AGENTS, STATUS, DECISIONS, ARCHITECTURE, STATE_AND_DIRECTOR, UX_SPEC, ROADMAP, and TESTING.

Select an actual SillyTavern release/commit to inspect and test, recording the full SHA and environment. Do not use “latest” as a compatibility claim without identifying what was tested. Consult official source for event payloads and signatures; do not invent APIs from the proposed module names in our documentation.

## Deliverables

1. A minimal valid extension manifest, browser entry point, and scoped stylesheet. Default the feature to disabled. Include only dependencies necessary for this shell.
2. A settings control that mounts and disposes a clearly labeled placeholder stage. It must not hide original chat until mounting succeeds, and it must preserve the existing draft/composer.
3. A small host adapter that safely reads the current chat identity, selected message, and author, and normalizes only the lifecycle events this shell actually uses.
4. Explicit cleanup of owned listeners, timers, observers, DOM, and temporary presentation overrides. A failure must leave normal SillyTavern usable.
5. Tests or a reproducible harness for activation/disposal and source observation, plus a real-host compatibility checklist. Distinguish simulated checks from real-host results.
6. A bounded integration note documenting candidate seams for stable chat/card identity, metadata saves, and asset storage. Unverified capabilities remain open; do not silently commit to a guessed storage path.
7. Updated status and real development/install instructions for the implementation that now exists.

## Verification scenarios

Exercise repeated enable/disable, a draft typed before toggling, normal and streaming replies, stopped generation, continuation, regeneration/swipe selection, message edit/delete, chat switching, group author identification, and missing required capability.

Not every future state feature must be implemented in M0, but event observations must be recorded honestly. Prove the shell does not corrupt chat or drafts. Do not claim tested support for inaccessible browsers, devices, providers, or extensions.

## Explicit exclusions

No scene director, image generation, cloud/API credentials, OAuth implementation, provider queue, automatic scene inference, copied personal character cards, full reader redesign, required server plugin, or SillyTavern fork. Do not scaffold future systems merely to make the tree look complete.

Do not import private chat data for tests. Use synthetic public-safe fixtures. Do not call a live paid service.

## Completion report

Return the PR URL, starting and final full SHAs, inspected/tested SillyTavern version and SHA, precise scope, commands actually run, check outcomes, manual evidence, remaining risks, and recommended next slice.

Leave the PR open and unmerged. Gate A remains NOT_RUN; M1 is not authorized by completing this task. If real-host testing is unavailable, deliver the bounded implementation and reproducible test procedure, mark that surface NOT_TESTED, and do not describe M0 as fully passed.

---