# Staged implementation roadmap

**Status:** proposed sequence. Every implementation milestone is currently **NOT_STARTED** and every human gate is **NOT_RUN**. This document contains targets, not completion evidence.

## Delivery rule

Build the smallest version that can be evaluated in a real roleplay session. Do not substitute automated tests or an attractive screenshot for the owner's experience. Each stage ends with a reviewable pull request, exact-head evidence, and a clear statement of remaining limitations.

The project has three human gates: **A — reader feel**, **B — automatic direction**, and **C — optional image workflow**. The owner may record PASS, REVISE, or STOP. No agent grants a human PASS on the owner's behalf.

## M0 — Compatibility and reversible shell

**Question:** Can the extension safely coexist with the actual SillyTavern setup?

Pin a real target release/commit and document the browser and enabled extensions. Inspect source and test event behavior for completed/streaming/stopped/continued messages, group replies, swipes, edits, deletions, and chat switches.

Implement only a minimal manifest/entry point, a scoped settings control, reversible empty stage, and the host adapter surface required to read the selected message. Default the extension to disabled. Add activation/disposal tests where practical, and a manual compatibility record.

Resolve or explicitly block the host chat identity, card identity, metadata save, and asset-storage seams. No provider calls, paid services, full director, image-generation queue, or private user fixtures.

**Exit criteria:** enable/disable cycles preserve ordinary chat and the draft; the adapter can identify a selected message without guessing; failures leave native chat usable; known limitations are documented. A failure in basic reversibility blocks M1.

## M1 — Manual visual-novel reader

**Question:** Does the presentation improve roleplay before adding automation?

Suggested slices:

| Slice | Scope | Evidence |
| --- | --- | --- |
| M1.1 | Current-message panel, author label, streaming display, backlog and composer access | No lost text/drafts or keyboard conflicts |
| M1.2 | Import/select background and 1–3 sprites; stable slots and focus | Public-safe fixture screenshots and real-session inspection |
| M1.3 | Source-anchored manual state/reducer, reload, chat isolation, swipe/edit invalidation, limited single-writer policy | State and lifecycle regressions |
| M1.4 | Candidate cleanup, responsive behavior, reduced-motion behavior | Gate A candidate on one frozen head |

Do not implement a new message composer, automatic dialogue rewriting, image generation, or a scene director in this stage.

### Gate A — Reader feel

Run at least one roughly 20-turn one-to-one session and one short group session using imported assets. Include long responses and normal editing/regeneration operations. These are proposed minimum exercises, not statistical claims.

The owner answers: Is this more immersive than normal chat? Is it still easy to read and respond? Are the controls out of the way without being hidden? Is the scene useful enough to keep enabled?

Record PASS/REVISE/STOP, the exact candidate SHA, tested host/browser, observations, and blockers. On REVISE, improve the reader rather than adding another provider.

## M2 — Conservative automatic direction

**Question:** Can visuals follow the story without becoming annoying or untrustworthy?

Suggested slices:

| Slice | Scope | Evidence |
| --- | --- | --- |
| M2.1 | Extend the manual reducer with director proposals, base/overlay locks, and snapshot validation | Deterministic unit fixtures and migrations |
| M2.2 | One configured text-director path, bounded context, strict proposal validation | Synthetic transport tests; no canonical-chat mutations |
| M2.3 | Serialized work, deduplication, stale-result rejection, timeout/refusal recovery | Race tests including A → B → A |
| M2.4 | Evidence UI, manual corrections, real-chat evaluation | Gate B candidate and error taxonomy |

Use a small catalog of known locations and imported outfits/expressions. Unknown locations become review suggestions. No image generation is needed to pass this stage.

### Gate B — Direction quality

Evaluate a fixed public-safe fixture set covering presence, mentions, negation, hypothetical travel, flashbacks, outfit continuity, group authorship, and user locks. Report correct/incorrect/abstained counts separately by category. Freeze the expected answers before measuring a candidate.

Hard correctness gates: zero cross-chat commits, zero canonical text/card modifications, zero stale-result applications in the regression suite, and zero automatic overrides of active locks.

Then run a real session with the owner. Technical correctness is necessary but insufficient: excessive abstention, latency, or constant manual corrections may still earn REVISE. Do not fabricate a percentage-based accuracy promise before this evidence exists.

## M3 — Optional asset generation

**Question:** Do image tools improve the experience without making roleplay wait?

Implement in this order:

1. User-controlled prompt/reference export and manual result import.
2. One manual missing-background generation path, preferably reusing the verified host integration.
3. Candidate approval, cache/deduplication, stale-job handling, privacy controls, and application-side usage limits.
4. Additional cloud adapters only after the first complete path is useful.

Evaluate ComfyUI and any chosen cloud API separately; “supports provider adapters” is not a claim that all adapters work. Keep API billing and ChatGPT plan-backed text access distinct. A subscription-backed text integration is an optional separate spike, never a prerequisite or a promise of image support.

### Gate C — Image workflow

Demonstrate a cache hit, a new background, a rejected candidate, a timeout, a policy refusal, a canceled/stale job, and a configured usage limit. The owner must be able to keep reading and replying through all of them.

Prove that one eligible request does not become duplicate paid jobs and that a late image cannot replace a newer scene. Verify the actual data sent to the selected provider. No automatic CGs or outfit-batch generation before separate approval.

## M4 — Polish and optional expansions

Only after the core gates, consider paragraph-based reading beats, timed visual cues, restrained scene transitions, more responsive layouts, better asset-pack portability, optional TTS coordination, or occasional approved CGs.

Each expansion needs its own bounded acceptance criteria. Do not add a full game loop, romance statistics, autonomous plot generation, multiplayer, or a general asset editor as hidden scope.

## Release readiness

Before an installable release: choose the repository license, include properly licensed demo assets or clear import instructions, verify the installation procedure from a fresh checkout, document tested host versions, publish privacy/provider behavior, and provide data export/recovery instructions.

Release claims must correspond to tested features on an exact candidate. A provider, host version, or device not exercised is **NOT_TESTED**, not “probably supported.”