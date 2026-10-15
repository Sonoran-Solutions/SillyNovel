# Decision register

**Status:** user-stated scope, proposed defaults, and measured facts remain distinct. The M1 planning entry records recommendations as they stood before DYL-16; the approved decisions are recorded in the dated owner entry below.

## Confirmed user-stated scope

| ID | Decision | Basis |
| --- | --- | --- |
| U01 | The project is for a better roleplay experience, not primarily a game-development asset studio | Explicit clarification in the project discussion |
| U02 | A visual-novel aesthetic inside SillyTavern chat is the intended direction | Explicit request to explore a SillyTavern extension |
| U03 | The project repository is `Sonoran-Solutions/SillyNovel` | Repository supplied by the owner |
| U04 | ChatGPT subscription use for images is a desired possibility to investigate, not an established integration | Original question about subscription-backed image generation |

No private character canon, relationship details, or unrelated game-art constraints are made part of the project baseline.

## Proposed baseline

| ID | Proposal | Rationale / consequence |
| --- | --- | --- |
| P01 | Ordinary installable UI extension, not a host fork | Keep the project centered on presentation and isolate compatibility work |
| P02 | Canonical conversation and roleplay configuration remain unchanged | Visual errors must not corrupt the roleplay |
| P03 | Manual reader before director before image generation | Validate immersion before adding latency, cost, and provider complexity |
| P04 | Separate visual classification from story authoring | No mandatory tags or machine-readable output format in ordinary RP replies |
| P05 | Stable scene/assets, conservative updates, manual locks | Favor continuity and cheap correction over constant novelty |
| P06 | Namespaced visual metadata and a small host adapter | Make ownership, migrations, and compatibility testable |
| P07 | No automatic cloud/image work by default | Avoid surprise data disclosure and paid requests |
| P08 | One to three visible sprites; retain larger logical group membership | Bound the stage without changing chat participation |
| P09 | Complete-message reader first; precise within-message cues later | Avoid lossy rewriting or an unverified dialogue parser |
| P10 | Explicit human gates A/B/C | Technical passes do not establish a good roleplay experience |
| P11 | No required server plugin in the core | Keep the manual experience usable with a UI extension alone |
| P12 | Provider capabilities verified independently | Text compatibility does not prove image, transparency, or billing support |

## Proposed defaults before DYL-16

The current owner-approved defaults and clarifications are recorded in the DYL-16 entry below.

The extension starts disabled. Enabling it activates manual presentation only. Director and image generation are separately off. Automatic retries and automatic CG creation are off. Typewriter animation is off. Standard chat and the existing composer remain available.

Location, presence, and outfit overrides remain locked until released. Manual expressions affect the selected message only. A later change to these defaults must update the UX, state, tests, and migration notes together.

## Technically resolved questions

| ID | Question | Verified finding and evidence |
| --- | --- | --- |
| O01 | Which actual SillyTavern release/commit and browser form the first tested baseline? | TECHNICALLY RESOLVED — SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Brave `154.1.96.61` on Ubuntu 24.04. See [pinned target](M0_COMPATIBILITY.md#pinned-sillytavern-target) and [M0.2 host validation](M0_LIFECYCLE_VALIDATION.md#m02--final-host-compatibility-validation-2026-10-12), recorded 2026-10-12. |

O01 records the tested environment, not owner approval of a product compatibility policy. Evidence remains tied to the documented candidates; other hosts/browsers remain unverified. The owner accepted the tested-scope M0 verdict and L10 waiver on 2026-10-12; see the DYL-16 owner decision below. M1 authorization is limited to DYL-17 and DYL-19.

## Decisions still needed

| ID | Question | When it must be resolved |
| --- | --- | --- |
| O02 | Which host-supported storage/asset routes meet user scoping and save-safety needs? | M0/M1, before persistence is advertised |
| O03 | Which source license should the repository use? | Before an installable public release |
| O04 | Which one text-director transport should be exercised first? | M2 planning; never required for M1 |
| O05 | Which image route should be the first real adapter? | M3 planning after Gate B |
| O06 | What usage limits and content-sharing scope will the owner enable? | Before any automatic paid/cloud work |
| O07 | Is plan-backed ChatGPT text access worth a separate integration spike? | Optional; not a reader or image milestone prerequisite |

These questions do not block documentation or the manual compatibility shell. Do not answer them by silently treating an example configuration as a user decision.

## Historical M1 planning entry — 2026-10-12, DYL-15

[M1_PLAN.md](M1_PLAN.md) narrows the existing UX/state/asset baseline into reviewable contracts. Its decision table distinguishes requirements, proposed defaults, owner decisions in DYL-16, and technical proofs in DYL-19. **Approving person: none; owner review pending.** It does not authorize M1 runtime work, accept M0, or approve the L10 waiver. Gate A remains NOT_RUN.

At planning time these defaults were proposals. The owner decision below approves A–G with clarifications; the historical planning record is retained as written.

Affected documents: [roadmap](ROADMAP.md), [status](STATUS.md), and the new [reader plan](M1_PLAN.md), which refines [UX](UX_SPEC.md), [architecture](ARCHITECTURE.md), [state](STATE_AND_DIRECTOR.md) and [assets](ASSETS_AND_PROVIDERS.md) without rewriting historical evidence. No existing owner approval is superseded. DYL-16 must record the owner's actual statement/date/scope before approved defaults or implementation authorization are added here.

## Changing decisions

Add a new entry with status, date, rationale, affected documents, and approving person where applicable. Preserve superseded decisions and link their replacements. Keep user statements, agent recommendations, measured findings, and owner approvals distinct.

## Owner decision — 2026-10-12, DYL-16

**Approving owner:** Dylan (explicit response in the working chat, 2026-10-12). **Status:** APPROVED for the exact scope below. This supersedes the pending owner questions and agent recommendations recorded in the DYL-15 planning entry; it does not expand beyond the authorized tickets.

### M0 and L10

- Accept the L10 waiver for the tested persistent-chat workflow on the pinned SillyTavern host. Record L10 as **UNSUPPORTED / WAIVED**, never HOST PASS. Retain synthetic empty-source regression coverage. Revisit the waiver if a supported reachable workflow is later demonstrated.
- Approve M0 **PASS for the explicitly documented scope and evidence limits**. Do not claim real model/provider inference or compatibility beyond the documented host/browser/candidate evidence. Add a short current-main-head regression smoke check to DYL-17's pinned-host validation; this does not reopen M0.

### M1 defaults A–G

- **A — Reader layout:** Scene reader is the default; hide the native feed only after successful mount. Preserve native composer/send/stop and immediate Back to Chat. Permanent side-by-side mode is not required for M1.
- **B — Reading/navigation:** Preserve whole-message pinned navigation and independent text-scroll position during streaming.
- **C — Character identity:** Permit explicit manual resolution to distinguishable cards within verified scope. Unresolved identity must not block reading or unrelated scene controls.
- **D — Assets/storage:** Prefer verified host storage. Browser-local persistence needs its own explicit proposal and approval.
- **E — Manual controls:** Locks protect manual choices against automatic or delayed changes, not deliberate user replacements. Slots stay stable and are never automatically evicted.
- **F — Rich content:** Require readable ordinary formatting. Use plain-text/native-view fallback only for unsupported or unsafe content.
- **G — Persistence/writers:** Use a verified single-visual-writer policy with clear ownership and recovery. Other tabs retain ordinary chat access. Make no untested cross-device concurrency claims.

### Authorization and limits

- Authorize **DYL-17** and **DYL-19** in parallel, on separate branches with coordinated file ownership and separate PRs left open for review. DYL-19 is a bounded proof task, not authorization to implement the asset library or persistence system.
- Keep **DYL-18 and later implementation tickets blocked** pending prerequisites and separate authorization. Gate A remains NOT_RUN; M2 is not authorized.
- Record DYL-16's decisions and links before closing the owner gate. DYL-17 and DYL-19 are authorized but remain unstarted until their own work begins.

Affected documents: [status](STATUS.md), [M1 reader plan](M1_PLAN.md), and [roadmap](ROADMAP.md). Affected issues: [DYL-16](https://linear.app/devils17/issue/DYL-16/sillynovel-m10-b-owner-decision-on-m0l10-and-m1-implementation-scope), [DYL-17](https://linear.app/devils17/issue/DYL-17/sillynovel-m11-a-build-the-reader-source-model-and-streaming-safe), [DYL-18](https://linear.app/devils17/issue/DYL-18/sillynovel-m11-b-ship-the-text-reader-backlog-handoff-and-composer), and [DYL-19](https://linear.app/devils17/issue/DYL-19/sillynovel-m12-a-prove-chatcard-identity-and-assetmetadata-storage).


## Owner assignment — 2026-10-12, DYL-18

The repository owner explicitly assigned the pasted “SillyNovel DYL-18: Implement the First Usable Text Reader” prompt in Codex on 2026-10-12 (America/Phoenix). The assignment authorizes DYL-18 only, after PR #6 / DYL-19 and PR #7 / DYL-17 merged. [Linear assignment record](https://linear.app/devils17/issue/DYL-18/sillynovel-m11-b-ship-the-text-reader-backlog-handoff-and-composer). Deliver one focused open/unmerged PR and leave the issue In Review. This supersedes the earlier DYL-18 authorization hold, not the DYL-19 storage findings or any human gate.

The implementation reuses the existing source model and installed host Markdown/sanitizer libraries. Backlog also serves as Open Original Message; duplicate controls were removed to prioritize dialogue on narrow screens. Following the PR #8 P2 review, native handoff scrolls to a matching candidate when available but always reports unresolved correspondence on the pinned host, which exposes no rendered source/revision token. Exact success requires a verified read-only host seam; unrendered history uses native fallback. These are bounded engineering choices documented in the [reader contract](M1_READER_SOURCE.md#dyl-18-reader-ui-contract), not new owner approvals. No persistence, art, later milestone work, merge authorization or Gate A verdict is inferred.

## Owner decision and bounded assignment — 2026-10-12, DYL-26

**Approving owner:** Dylan, via the DYL-26 assignment in Codex on 2026-10-12 (America/Phoenix). Exact supplied statement: “The owner has approved the DYL-24 session-only visual-stage test.” Record **PASS for the bounded session-only prototype**. This is not Gate A PASS: durable visual state, imports, reload recovery and the full acceptance session remain outstanding. Gate A remains **NOT_RUN**.

The assignment authorizes **DYL-26 only**, an isolated technical feasibility spike of DYL-25's host-owned storage proposal, on a disposable SillyTavern 1.19.0 checkout at `7e8663cd9c184a550b37238218bdd32c6efc68e9`. It authorizes a reproducible test-only host patch/fixture and one open, unmerged SillyNovel PR. It does not select an architecture for release or authorize production persistence, live-host changes, a permanent fork, an upstream issue/PR, a required server plugin, DYL-22/23, M1.3, or M2. DYL-22/23 blockers remain.

The [spike report](M1_HOST_STORAGE_SPIKE.md) distinguishes experimental identity enrollment and activation from existing supported host behavior. These bounded test choices and its recommendation are engineering findings, not further owner approvals.

## Owner assignment — 2026-10-12, DYL-27

The owner's pasted DYL-27 assignment authorizes one native identity/activation feasibility experiment after merged PR #13, using a disposable pinned SillyTavern checkout and fresh synthetic data. It authorizes one open/unmerged PR only; no installed-host changes, permanent fork, production persistence, upstream publication, required plugin, DYL-22/23, M1.3, Gate A or M2. The [DYL-27 report](M1_NATIVE_IDENTITY_ACTIVATION.md) records engineering findings and bounded design choices, **not owner approval** of the registry, migration or release architecture. Recommendation remains REVISE; subsequent work needs its own authorization.


## Owner assignment and bounded engineering findings — 2026-10-14, DYL-42

The owner's pasted DYL-42 assignment authorizes one disposable pinned-host writer-coverage proof and one focused open/unmerged PR, after PR #15 merged and DYL-28 became Done. It does not authorize production persistence, migration/recovery, upstream publication, a permanent fork, a required plugin or later milestones. The [writer report](M1_NATIVE_WRITER_COVERAGE.md) records fresh-import enrollment, no-op source revisions, conservative collision/pending refusal and blanket group visual refusal as **experimental engineering choices**, not owner-approved release policy. Recommendation: REVISE; no new human gate verdict. DYL-22/23 blockers remain, DYL-24 stays session-only, M1.3 remains unauthorized and Gate A NOT_RUN.

## Owner assignment — 2026-10-14, DYL-44

The owner's pasted M1.2-J assignment authorizes only [DYL-44](https://linear.app/devils17/issue/DYL-44/sillynovel-m12-j-prove-host-owned-lifecycle-reservations-and-write): a disposable pinned-host lifecycle reservation/write-generation investigation and one OPEN/UNMERGED experimental PR. PR #17 is verified merged and DYL-43 Done; its REVISE outcome is retained. The store-wide reservation, conservative scope refusal, and generation binding in the [report](M1_NATIVE_LIFECYCLE_GENERATIONS.md) are bounded engineering choices, not approved production architecture. Unknown writers and whole-root restore remain outside the proven guarantee. No production persistence, permanent fork, upstream publication, recovery/re-enrollment policy, DYL-22/23 implementation, M1.3/M2 or Gate A verdict is authorized.


## Owner assignment and experimental findings — 2026-10-14, DYL-46

The pasted “SillyNovel M1.2-L: External Authority Reconciliation and Safe Failure Recovery” assignment authorizes this bounded investigation and one open/unmerged experimental PR after PR #19 merged / DYL-45 Done. [DYL-46 report](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md) records forward-only clean-abort and coordinated read-revocation engineering choices, **not owner approval** of a release or replacement compatibility contract.

Measured recommendation **REVISE; compatibility REQUEST CHANGES / HOLD**. The unchanged writer suite is fully passing; lifecycle and other predecessor campaigns retain documented failures and unreached suffixes. A failed observation with no durable external intent cannot survive unknown byte restoration plus restart. Owner decisions about durable failure evidence, scoped availability, writer exclusion and authority ownership remain open. No issue Done, merge, production persistence, DYL-22/23 unblock, M1.3/M2 authorization or Gate A verdict is inferred.
