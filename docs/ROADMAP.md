# Staged implementation roadmap

## Current M1.4 authorization — 2026-10-16

[Frozen technical package](M1_4_DYL60_CANDIDATE.md) at `6f8252699dae3a92f639f94531bba221d5e1cc02` passes the integrated pinned desktop/native campaign. DYL-60 review is the current stopping point. Physical tablet evidence is BLOCKED, assistive coverage NOT_TESTED and human Gate A NOT_RUN; no later milestone or owner session starts automatically.

The owner [approved all five rulings and separately authorized DYL-60](DECISIONS.md#owner-approvals-and-dyl-60-authorization--2026-10-16): F1 for the first disposable Gate A playtest, PNG-only assets, explicit project reopening, manual four-card groups and available established Galaxy Tab S8 technical testing. PR #33 merged at `c835afe6e274be3fab5a2862f517fd8e4bca32ad`, the starting main for this work. [Current preparation/evidence](M1_4_DYL60_CANDIDATE.md) distinguishes technical results and remaining gaps. Original history/writer requirements below are amended only by F1 for this playtest; broader DYL-22/23 criteria and historical blocker relations remain. DYL-62/63 remain In Review despite merged code. Gate A NOT_RUN; owner session and verdict, M1.3/M2, DYL-56 and DYL-61 release work remain separately gated. Older dated entries retain historical states.

## DYL-23-C native group integration — 2026-10-16

Owner explicitly authorizes [native groups with manual independent-project attachment](M1_NATIVE_GROUPS.md), tracked by [DYL-63](https://linear.app/devils17/issue/DYL-63/dyl-23-c-native-group-conversation-integration), after PR #31 merged at `5a9b87f14d5a008e9801aa2260efe40d9e22f5b7`. Native group/chat/activation authority remains separate from account-owned project/manual actor UUIDs and memory-only source expressions. Four or more actors retain three visible slots; duplicate names never bind cards to actors. No schema, native metadata, automatic attachment or persistence expansion. DYL-23 Done/history/acceptance, DYL-55 and DYL-62 unchanged; Decision F undecided; Gate A NOT_RUN; DYL-60 unstarted. [Implementation/evidence](M1_NATIVE_GROUPS_IMPLEMENTATION.md). Older dated entries below are historical.


## DYL-23-B attached temporary expressions — 2026-10-16

Owner explicitly authorizes [memory-only attached message expressions](M1_PROJECT_EXPRESSIONS.md), tracked by [DYL-62](https://linear.app/devils17/issue/DYL-62). Starting main `d3f5761c03fec7fc5d97b0698da718af7af9c187` is the verified PR #30 merge. The project-global layout/catalog remains persistent; explicit actor/outfit-compatible PNG expression choices use a separate bounded activation-only source journal and the existing renderer. No expression-only dirty/revision changes or persistence. [Validation and handoff](M1_PROJECT_EXPRESSIONS_IMPLEMENTATION.md).

Linear DYL-23 reports Done; preserve its original acceptance/history/relationships and the remaining group/device gaps. This assignment authorizes only DYL-23-B, not native groups, persistent history, DYL-60 execution or later milestones. Decision F remains undecided; Gate A NOT_RUN; no live install, release or merge. Older entries below are historical.


## DYL-23-A manual-stage UX — 2026-10-16

Owner explicitly authorized the bounded [manual stage/project integration](M1_MANUAL_STAGE_UX.md): Project, Scene and Artwork Library controls, visible attachment/global-scope/save/recovery feedback, and responsive/accessibility verification. Starting main `ad70bb52e0f46155a5c7b1e5c3da957536612dc9` merges PR #29; Linear DYL-22 is Done with broader original format/revision requirements still unfinished. DYL-24 session stage and DYL-53 global projects remain credited. DYL-23 keeps original acceptance/dependencies and stays unfinished; attached source overlays/native groups remain excluded. DYL-60 stays blocked. Decision F undecided; Gate A NOT_RUN; no DYL-55 change, M1.3/M2, live install, release or merge. [Implementation/evidence](M1_MANUAL_STAGE_UX_IMPLEMENTATION.md). Older dated entries below are historical.


**PR #29 re-review:** [Migration-policy correction](M1_PNG_ASSET_LIBRARY_REVIEW_CORRECTION.md) replaces automatic v1 startup upgrade with explicit verified-backup migration to a new output. The original store and backup remain unchanged. DYL-22 is In Review with original unfinished acceptance/blockers retained; no DYL-55 reconciliation, DYL-23 authorization or Gate A change.

## DYL-22 PNG-library review candidate — 2026-10-15

The owner explicitly authorized the first residual DYL-22 slice. [Workflow and storage contract](M1_PNG_ASSET_LIBRARY.md): project-owned labels/categories, durable alternatives and explicit reselection, shared immutable PNG bytes, catalog-aware cleanup, transactional schema-v1→v2 upgrade and compatible full-store recovery. Portable v1 copies still include selected artwork only, without library labels/alternatives. [Implementation/evidence](M1_PNG_ASSET_LIBRARY_IMPLEMENTATION.md). PR #28 is merged at starting main `262aad7b64624845e68f783bf779a6fd5e4689d4`.

This is a bounded implementation for review; historical blockers and original JPEG/static-WebP requirements remain. DYL-55 stays pending owner acceptance, DYL-23 separately gated, Decision F undecided and Gate A NOT_RUN. DYL-56/60 and M1.3/M2, production/release and upstream authorization are unchanged. Older entries below retain their original evidence/scope.

## Current M1.2 completion checkpoint — 2026-10-15

[Reviewed main `ea65d84a521a39c9ccc977f4cb3643454963d4b8`](M1_2_STORAGE_COMPLETION_AND_READINESS.md): PRs #23–27 merged; DYL-49–54/57–59 Done. **DYL-55 GO for bounded technical acceptance pending owner; overall M1.2 REVISE.** Parent stays unfinished; DYL-22/23 retain blockers and DYL-56 Backlog. Gate A NOT_RUN, M1.3/M2 unauthorized, upstream on hold, no release/live installation.

Proposed functional order: owner approves revised scope → **DYL-22 reusable PNG-library labels/kinds/list/reselection** → **DYL-23 remaining manual-stage/source-overlay/group/attachment/layout usability** → [DYL-60 frozen disposable candidate preparation](https://linear.app/devils17/issue/DYL-60) → separately approved owner playtest. Keep PNG-only temporarily by explicit owner deferral; do not count JPEG/WebP as complete. DYL-60 is Backlog under M1.4 and blocked by DYL-23. [DYL-61](https://linear.app/devils17/issue/DYL-61) tracks public-beta/production hardening without blocking the next feature. No implementation starts from this planning sequence.

Persistent **global project layouts** already exist; persistent **per-message scenes/native correspondence** do not. Original Gate A matching-history/branch restore and single-writer/read-only-tab requirements need an explicit owner amendment or separately authorized implementation. Preserve original group/touch/reader safety checks. The older slice map and gate text below remain historical requirements, not silently satisfied or waived.

## Active project-storage direction — 2026-10-15

[Independent project storage](M1_INDEPENDENT_PROJECT_STORAGE.md) supersedes the upstream-API implementation path and earlier chat-metadata persistence proposals for this bounded slice. The owner authorizes planning and the first independent-project implementation with an optional local plugin, explicit attachment and project-global state only. Production release is not approved. Source-specific history remains transient/gated; existing renderer, source, lock and native-composer safeguards remain applicable. No project data enters native metadata or browser persistence. [Implementation and tracking](M1_PROJECT_STORAGE_IMPLEMENTATION.md).

DYL-48 is Done and PR #22 merged at `ca77bbf5e4ee5219e34e873b1680e8d644754149`. Upstream engagement is **ON HOLD / NOT_SUBMITTED**. DYL-22/23 retain Backlog and their blocker relations; DYL-24 remains supported; M1.3/M2 unauthorized and Gate A NOT_RUN. Earlier entries below retain their historical authorization/evidence scope and do not override this decision.

**Historical roadmap status before independent-project completion:** proposed sequence with an owner-approved M0 verdict and limited M1 authorization. M0 is **PASS for the explicitly documented scope and evidence limits**; L10 is **UNSUPPORTED / WAIVED** for the tested persistent-chat workflow. See [M0 compatibility](M0_COMPATIBILITY.md) and [lifecycle report](M0_LIFECYCLE_VALIDATION.md). M1 defaults A–G are approved with clarifications recorded in [DYL-16](DECISIONS.md#owner-decision--2026-10-12-dyl-16) and [M1 reader plan](M1_PLAN.md#owner-approved-defaults--2026-10-12-dyl-16). DYL-17 and DYL-19 are merged; the owner separately assigned **DYL-18**, whose text-reader candidate is implemented for review. DYL-19 persistence/assets remain PARTIAL/BLOCKED and later implementation remains unauthorized. M2–M4 are **NOT_STARTED**, and Gates A/B/C are **NOT_RUN**. This document's targets do not authorize work beyond those named tickets.

## Delivery rule

Build the smallest version that can be evaluated in a real roleplay session. Do not substitute automated tests or an attractive screenshot for the owner's experience. Each stage ends with a reviewable pull request, exact-head evidence, and a clear statement of remaining limitations.

The project has three human gates: **A — reader feel**, **B — automatic direction**, and **C — optional image workflow**. The owner may record PASS, REVISE, or STOP. No agent grants a human PASS on the owner's behalf.

## M0 — Compatibility and reversible shell

**Question:** Can the extension safely coexist with the actual SillyTavern setup?

Pin a real target release/commit and document the browser and enabled extensions. Inspect source and test event behavior for completed/streaming/stopped/continued messages, group replies, swipes, edits, deletions, and chat switches. The pinned source and exact 1.19.0 smoke results are recorded in [M0 compatibility](M0_COMPATIBILITY.md).

Implement only a minimal manifest/entry point, a scoped settings control, reversible empty stage, and the host adapter surface required to read the selected message. Default the extension to disabled. Add activation/disposal tests where practical, and a manual compatibility record.

Resolve or explicitly block the host chat identity, card identity, metadata save, and asset-storage seams. No provider calls, paid services, full director, image-generation queue, or private user fixtures.

**Exit criteria:** enable/disable cycles preserve ordinary chat and the draft; the adapter can identify a selected message without guessing; failures leave native chat usable; known limitations are documented. A failure in basic reversibility blocks M1.

**Historical M0.1 implementation record:** the reversible placeholder shell is implemented. The pinned isolated host verified normal, streaming, stopped, continued, swipe, edit/delete, chat-switch, toggle, and disable-during-generation paths using a deterministic loopback endpoint. Empty-chat switch/generation and group cases remained **NOT_TESTED** at that point, so M0.1 was not reported as fully passed. The later M0.2 addenda record group/duplicate-label HOST PASS, missing-capability INSTRUMENTED_HOST_PASS, and L10 UNSUPPORTED / WAIVER REQUESTED. The same-length eventless correction has synthetic evidence only. Gate A remains **NOT_RUN**. Owner approval and exact M1 authorization are now recorded in DYL-16 and [DECISIONS](DECISIONS.md).

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

### M1 delivery map — DYL-15 planning proposal

The [implementation-ready plan](M1_PLAN.md) supplies the interaction sketches, source/navigation rules, component boundaries, defaults for review, and bounded acceptance criteria. The [SillyNovel Linear project](https://linear.app/devils17/project/sillynovel-3833ac2248e8) adds an M1.0 planning/authorization prerequisite while retaining the four implementation slices above. All work uses the M1 phase label.

| Roadmap slice | Existing issues / proposed follow-up |
| --- | --- |
| M1.0 prerequisite | DYL-15 docs-only plan → DYL-16 owner decisions (recorded; defaults A–G approved) |
| M1.1 | Merged DYL-17 source model/streaming proof → owner-assigned DYL-18 usable text-reader review candidate |
| M1.2 | Authorized DYL-19 identity/storage proof runs alongside DYL-17; proposed B pure reducer and C raster registry → D manual stage/controls remain unauthorized |
| M1.3 | Proposed E source-history invalidation → F safe saves/restore/single writer; F also depends on manual stage and successful DYL-19 proofs |
| M1.4 | Proposed G responsive/accessibility/recovery → H frozen candidate validation → I owner Gate A verdict |

B–I are local proposal keys in the plan, not created Linear issues. Pull the pure manual reducer into M1.2 before visual controls; M1.3 completes lifecycle invalidation and persistence. A failed DYL-19 proof blocks affected bindings/storage/saves, not DYL-17's text-source lane. DYL-16 originally authorized only DYL-17 and DYL-19; the later [DYL-18 assignment](DECISIONS.md#owner-assignment--2026-10-12-dyl-18) authorizes the text reader only. Other later tickets still require separate authorization. Proposed titles, exact dependencies, TESTING rows and one-PR boundaries are in the plan.

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

## Historical bounded project portability assignment — 2026-10-15

The following records the DYL-57 assignment. DYL-57/58/59 are now Done and PRs #25–27 merged; current parent disposition and remaining feature sequence are in the completion checkpoint above.

The owner separately authorizes DYL-57 portable global-project bundles under DYL-55 after merged PR #24. [Contract](M1_PROJECT_PORTABILITY.md) and [implementation/evidence](M1_PROJECT_PORTABILITY_IMPLEMENTATION.md). This independent-project copy lane does not start message-scoped M1.3 or M2. DYL-58 database backup/recovery/migrations follows portability review; DYL-59 unused-asset cleanup follows those policies. Both remain Backlog and require separate implementation authorization. DYL-55 remains unfinished, DYL-56 Backlog, DYL-22/23 blocked and Gate A NOT_RUN.

## Bounded database recovery — 2026-10-15

DYL-58 is separately owner-authorized after merged PR #25 and completed DYL-57: operator-only online backup, strict offline inspection, restore into an empty SillyNovel database slot with existing verified account incarnations, and schema-v1 migration preconditions/policy. [Contract](M1_PROJECT_DATABASE_RECOVERY.md); [implementation/evidence](M1_PROJECT_DATABASE_RECOVERY_IMPLEMENTATION.md). Historical DYL-58 Backlog entries above describe the earlier assignment. This work does not authorize production replacement, account reassignment, DYL-59 cleanup, DYL-56 hints, DYL-22/23, M1.3/M2 or a Gate A verdict. DYL-55 remains unfinished.

## Explicit unused artwork cleanup — DYL-59, 2026-10-15

The owner separately authorized [cleanup](M1_PROJECT_ASSET_CLEANUP.md) after merged PRs #25/#26 and completed DYL-57/58. This supersedes the earlier DYL-59 Backlog/unauthorized implementation note only for this bounded task. [Evidence and recommendation](M1_PROJECT_ASSET_CLEANUP_IMPLEMENTATION.md). Saved references remain protected; other clients' unsaved drafts remain an explicit limitation. DYL-55 requires separate completion review; DYL-56 Backlog, DYL-22/23 blocked, M1.3/M2 unauthorized and Gate A NOT_RUN. No release/live installation, merge or automatic next-slice work.
