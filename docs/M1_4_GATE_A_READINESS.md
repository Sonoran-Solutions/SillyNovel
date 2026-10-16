# M1.4-A: Gate A readiness and owner decision package

## Owner disposition — 2026-10-16, America/Phoenix

**F1 APPROVED for the first disposable Gate A playtest.** [Full exact approved amendment and all five rulings](DECISIONS.md#owner-approvals-and-dyl-60-authorization--2026-10-16). PNG-only deferral, explicit reopening and manual native groups are approved. Established Galaxy Tab S8 technical access and DYL-60 preparation are separately authorized by the same explicit assignment. The historical proposal, unselected F2 alternative and original acceptance below remain intact as the PR #33 review record; its “undecided”, “unstarted” and authorization-required statements describe that earlier checkpoint.

DYL-60 now proceeds to one exact-candidate technical campaign and draft PR. Scope decisions and the fresh integrated desktop/native integrity/branch campaign are complete at `6f8252699dae3a92f639f94531bba221d5e1cc02`; actual-device coverage remains BLOCKED by access and assistive coverage NOT_TESTED. Technical readiness is REVISE pending those mandatory surfaces. [Current candidate/evidence record](M1_4_DYL60_CANDIDATE.md). Human Gate A remains NOT_RUN and separately gated. No M1.3/M2, production, live installation or merge authorization.

## Historical PR #33 preflight

Review: **2026-10-16, America/Phoenix**. Documentation/evidence only; stop for senior and owner review. **Decision F: undecided. Gate A: NOT_RUN. DYL-60: Backlog, execution not started.**

**Recommendation: REVISE before freeze; conditional GO for candidate preparation after the owner records the scope choices below and separately authorizes DYL-60.** The merged manual experience is a credible basis for a disposable usability candidate. It does not meet the original persistence/writer gate. No new runtime defect was established in this review; no runtime correction is included or currently recommended without a failing reproduction.

The freeze blockers are unresolved Decision F, explicit format/group/attachment scope confirmation, an exact-candidate integrated campaign, fuller native-integrity evidence, and identified physical-device evidence. Owner usability is still untested and remains a later human gate. Production hardening belongs to DYL-61 and does not block this disposable candidate on the tested pin.

## 1. Verified baseline and evidence provenance

The supplied clean checkout was `758443b011274c179aac4f401043386f844620d4`. A fresh fetch returned **main `f9497aebf59cbeae07a2b6391d0cff17e81bcc76`**. This documentation branch, `codex/m14-gate-a-preflight`, starts there. That is the inspected merged baseline, **not a frozen DYL-60 candidate**. Final documentation/pushed head belongs in the PR and handoff, avoiding a self-referential SHA in this file.

Authenticated GitHub reads verify all four PRs merged into main; Git ancestry and recorded input hashes connect their implementations to this baseline. PR bodies and older documents saying draft/unmerged are historical handoffs. GitHub's submitted-review arrays were empty for #29–32; the owner-supplied review findings and correction evidence are in the linked reports, not invented GitHub approvals. [Inspection snapshot](evidence/m14-preflight/inspection.json) preserves current PR metadata, issue states/relations, and original DYL-22/23/60/61 requirements.

| PR | Verified merge SHA | Final PR head | Merge time (UTC) |
| --- | --- | --- | --- |
| [#29 PNG library](https://github.com/Sonoran-Solutions/SillyNovel/pull/29) | `ad70bb52e0f46155a5c7b1e5c3da957536612dc9` | `2f9daa38b9509e6462e3b9a84230a59a14d3c630` | 2026-10-16 16:07:26 |
| [#30 manual UX](https://github.com/Sonoran-Solutions/SillyNovel/pull/30) | `d3f5761c03fec7fc5d97b0698da718af7af9c187` | `e132b23b9766467ab88260eb3d507380dae4eba0` | 2026-10-16 16:38:50 |
| [#31 temporary expressions](https://github.com/Sonoran-Solutions/SillyNovel/pull/31) | `5a9b87f14d5a008e9801aa2260efe40d9e22f5b7` | `334023a87a4bdc02bb70aaba65651e664e2b773a` | 2026-10-16 17:28:27 |
| [#32 native groups](https://github.com/Sonoran-Solutions/SillyNovel/pull/32) | `f9497aebf59cbeae07a2b6391d0cff17e81bcc76` | `758443b011274c179aac4f401043386f844620d4` | 2026-10-16 18:25:17 |

Evidence keys in the matrix refer to **historical runs**, never fresh current-main runtime validation. Counts overlap and must not be added together.

| Key | Exact tested SHA and strongest retained evidence |
| --- | --- |
| L | `10043cd3ee309c1fd9429c5f23edb9acf7e75f1d`: [PR #29 correction](M1_PNG_ASSET_LIBRARY_REVIEW_CORRECTION.md), [host record](evidence/project-library-review/host.json). 85 Node / 126 storage / 41 actual-entry Chromium / 20 disposable-host checkpoint groups. Explicit preserved-backup migration; 64 migration and 34 library named native-file comparisons. |
| U | `646ec9e7bd1439cb2137e97edba9c1526c808db9`: [PR #30 implementation](M1_MANUAL_STAGE_UX_IMPLEMENTATION.md), [host record](evidence/project-stage-ux/host.json). 91 Node / 126 storage / 46 Chromium / 24 host groups. Project/Scene/Artwork Library UX, real peer conflict/lost receipt, eight screenshots. |
| E | `eae12ff9b74d12363c12f6e5d7925955502a3767`: [PR #31 correction](M1_PROJECT_EXPRESSIONS_REVIEW.md), [host record](evidence/project-expressions/review/host.json). 124 Node / 59 Chromium / 16 host groups; storage 126 inherited, explicitly not rerun for that correction. Reorder regression is synthetic actual-entry, not native UI reorder evidence. |
| G | `11396926c0f0aed0028d5e8a3f320abd3bd486e4`: [PR #32 correction](M1_NATIVE_GROUPS_REVIEW.md), [host record](evidence/native-groups/review/host.json), [input hashes](evidence/native-groups/review/proof-hashes.json), [checksums](evidence/native-groups/review/checksums.json). 153 Node / 81 Chromium / 126 storage / 22 disposable-host groups; 41 named native files unchanged, 18 screenshots. Eventless generation-start reproduction is synthetic actual-entry; ordinary native group operations are real disposable-host evidence. |

All four use pristine SillyTavern **1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9`**, Linux, Node **26.8.1**, SQLite **3.53.4**, Chromium **151.0.7922.34**, synthetic accounts/art/conversations and the deterministic loopback endpoint. No real provider/device/owner acceptance follows from them. G's 60 recorded input hashes match this main; later changes from G to main are documentation/evidence only. This review rechecked those hashes and retained artifacts, without rerunning G's tests.

Read basis: [M1 plan](M1_PLAN.md), [prior completion review](M1_2_STORAGE_COMPLETION_AND_READINESS.md), [manual UX](M1_MANUAL_STAGE_UX.md), [expressions](M1_PROJECT_EXPRESSIONS.md), [groups](M1_NATIVE_GROUPS.md), [independent storage](M1_INDEPENDENT_PROJECT_STORAGE.md), [decisions](DECISIONS.md), [testing](TESTING.md), [roadmap](ROADMAP.md), README/STATUS/AGENTS and the original Linear criteria. Source inspection traced explicit open → attachment/session checks → project model/global reducer → save/CAS/receipt and separate source-expression projection → renderer. The shared source-order and new-owner-generation corrections are present. Nothing in this path supplies durable native correspondence or writer exclusion.

## 2. Decision F — one-page owner comparison

This is **Decision F from the prior completion-review decision package**, not DYL-16's earlier “F — Rich content” default. The comparison was unapproved in PR #33. The owner has now selected **F1 APPROVED for the first disposable Gate A playtest**, on 2026-10-16 America/Phoenix; [exact approved register](DECISIONS.md#owner-approvals-and-dyl-60-authorization--2026-10-16). F2 is unselected and its implications remain below.

| | F1 — recommended bounded amendment | F2 — retain original Gate A |
| --- | --- | --- |
| Acceptance | Saved account-owned global project layout/catalog; explicit reopen; temporary source expressions; CAS conflict/refusal recovery | Persistent message visuals, matching history/branch restoration, one visual writer/read-only other tabs |
| Benefit | Evaluate reading, replying, scene controls and manual groups using the merged implementation | Evaluate the original continuity/writer experience without reducing that promise |
| Cost | Owner consciously accepts lost temporary choices and manual reopening; current-main/device campaign still required | Several separately scoped implementation/proof slices before freeze; no credible fixed duration until host-authority feasibility is settled |
| Risk | Reopen may feel tedious; users may mistake global layouts for historical scenes; CAS can reject edits after another tab saved, and another tab's unsaved artwork references are undiscoverable | Incorrect source/branch identity could restore unrelated visuals; writer crash/takeover and accepted-load races require proof, beyond adding database rows |
| Next consequence | Record exact amendment plus decisions in section 3; authorize DYL-60 technical preparation, then a separately authorized owner session | Keep freeze BLOCKED; authorize the missing capabilities below in small reviewed slices before DYL-60 |
| Does it accept Gate A now? | No: Gate A NOT_RUN, human verdict still required | No: original requirements remain unmet |

### Exact F1 amendment — APPROVED for the first disposable Gate A playtest

> For the first disposable SillyNovel Gate A owner playtest only, I amend the persistence and multi-tab writer acceptance as follows. A saved, account-owned independent project must restore its global layout and labeled static-PNG artwork catalog after explicit reopening. Reload and every observed native conversation activation, including A → B → A, start detached; no native chat/project association is remembered. Source-specific manual expression decisions and their artwork are temporary, source/revision/session checked, and disappear on reload, detach, project replacement, disable or conversation switching. Reopening restores the saved global layout, not message-specific scene history or branch history.
>
> For this playtest, atomic expected-revision compare-and-swap, visible conflict refusal, and explicit recovery from an uncertain save receipt replace the original mandatory single-writer/read-only-secondary-tab requirement. Concurrent editors may have unsaved changes; no automatic merge, overwrite, retry or assurance that another tab's draft references are protected is accepted. A conflict or uncertain receipt must retain current edits in memory and require deliberate discard/reopen to inspect committed state before another save or cleanup.
>
> All remaining complete-reader, native composer/draft/send/Stop/Continue/swipe, source-safety, delayed-result isolation, manual-lock, four-member duplicate-name group, native-data-integrity, physical touch/virtual-keyboard, accessibility and owner-usability requirements remain in force. Approximately 20 individual turns and a short native group session remain required on one exact validated candidate. This amendment grants no Gate A verdict and does not execute or schedule that session.
>
> This approval does not authorize persistent source history, durable chat/card/branch correspondence, remembered project attachment or DYL-56, automatic speaker binding/focus, M1.3 implementation, M2, live installation, public beta, production use, release, or a PR merge. Candidate preparation and the owner session require their respective separate authorization. Gate A remains NOT_RUN until the owner's later recorded verdict.

F1 changes only the named persistence/writer expectations. The PNG-only deferral is a **separate** decision below. Art/format scope approval cannot waive data validation, source guards, failure recovery or physical-device requirements. Passing a disposable owner playtest supplies no beta or production approval.

### F2 — smallest separately authorized work if the original gate stays

1. **Prove authority before saving history:** choose and verify durable native source/branch ownership, accepted-load provenance and host-owned lifecycle/incarnation guarantees where needed. Public labels, array indices, avatar filenames, equal text, transient object keys and project UUIDs cannot prove these. Keep unresolved restore refused. Reuse the earlier identity/storage investigations as constraints; do not import their experimental host patches into production.
2. **Persist and restore source decisions:** separately design a namespaced versioned message-decision record and asset retention, validated source/prefix/swipe/branch correspondence, suffix invalidation and revision-safe restore. Include backup/migration and export behavior for the actual schema change, repeated-text/branch/edit/delete/reload tests and stale accepted-load/write races. Reuse the current journal/reducer where its transient assumptions permit; do not flatten its projections into global outfits.
3. **Enforce one writer:** implement proven exclusion within the accepted account/storage scope, read-only visual controls elsewhere, release/crash/account-switch recovery and explicit takeover with re-read/revision checks. Native reading/chatting must remain usable in either tab. CAS stays a commit guard underneath exclusion.
4. **Revalidate integrated behavior:** exact-candidate suites, native branch/copy/reload and two-tab writer/restore campaign, physical device, then owner acceptance. Separate review/authorization for each slice; this preflight authorizes none.

Global project rows contain neither message decisions nor durable source/branch keys. A revision check can reject a stale project update; it cannot decide which native history a record belongs to, restore earlier expressions, prevent another tab editing locally, or grant writer ownership. Hence existing saves plus CAS cannot satisfy F2. Durable identity/accepted-load feasibility is an external prerequisite, not a small missing UI toggle.

## 3. Other owner decisions before freeze

All five choices are now approved by the owner on 2026-10-16 America/Phoenix, with separate DYL-60 execution authorization: [attributed decision record](DECISIONS.md#owner-approvals-and-dyl-60-authorization--2026-10-16). The original recommendation/consequence table below is retained for provenance; the unresolved cases no longer describe current decision status. Device access itself remains an empirical prerequisite.

| Decision | Proposed wording / recommendation | Consequence if declined or unresolved |
| --- | --- | --- |
| Asset formats | “For this disposable first playtest, approve persistent static PNG only and explicitly defer original JPEG/static-WebP import acceptance. Keep actual-byte/decode/size/hash/compatibility validation and missing-art fallback mandatory. Do not mark broader DYL-22 format, logical-revision replacement or optional attribution management complete.” PNG covers the existing synthetic backgrounds/cutouts; no expansion needed for this experiment. | Freeze BLOCKED on scope; format implementation requires a separate assignment. Other original revision/attribution/export completeness remains explicit later scope, never credited by library labels alone. |
| Attachment | “Confirm explicit project attachment on each activation and detached reload as the first playtest experience. Saved global project identity is independent of native conversations. DYL-56 remembered hints remain unauthorized.” | Clarify before preparing instructions; do not implement automatic reopen. Existing independent-project approval is credited; this asks whether that experience is acceptable for Gate A. |
| Group scope | “Accept the functional playtest scope of four real native cards, two sharing a display name, four manually registered UUID actors, three visible slots and one offstage, explicit swap/replace, native generation and temporary expressions. Native author labels remain unresolved card identity; no guessed speaker mapping/focus.” | F2-style durable card binding or automatic speaker features need separately scoped work. Current manual group behavior technically fits the proposed exercise; usefulness still awaits the owner. |
| Device access | Name the physical Android device/browser/OS/keyboard and authorized tester/access path. Preserve section 7 as mandatory evidence; do not substitute viewport emulation. Recommendation: collect device technical evidence during separately authorized candidate preparation, before final freeze/readiness signoff. | Physical requirements remain NOT_TESTED and block full readiness. A desktop-only feedback trial would need a separately explicit reduced scope and would leave full Gate A unaccepted. No device waiver is proposed by F1. |
| Candidate preparation | After decisions are recorded, separately authorize DYL-60 on the selected full SHA, including disposable technical/device evidence and integrity coverage; keep the owner session separately gated. | DYL-60 remains Backlog/unstarted. Scope decisions alone do not start it. |

Owner record template: `Decision / approved exact wording or revisions / owner / date / evidence link / candidate consequences`. At the original PR #33 preflight, Decision F was **undecided** and these rows were **proposed**. The later approved record above supersedes that pending state, without supplying a human Gate A verdict.

## 4. Readiness matrix

**PASS** = the stated bounded behavior has the cited historical technical evidence. **PARTIAL** = implemented but incomplete against the requirement. **NOT_TESTED** = no adequate exercise at the claimed surface. **UNSUPPORTED** = absent/excluded capability, not waived acceptance. **BLOCKED** = named missing prerequisite/decision. **REVISE** = readiness recommendation requiring change or evidence. These classifications never manufacture a human verdict. **All current-main runtime rows still require fresh DYL-60 evidence.** U/L/E/G resolve to exact full SHAs in section 1; each evidence-type label below states the strongest relevant surface.

| Requirement / TESTING mapping | Expected behavior and current implementation | Strongest evidence / type / SHA key | Class and limitation | Blocks proposed playtest or later? |
| --- | --- | --- | --- | --- |
| T01 repeated toggle/disable | One stage/owned listeners; native view restored, including disable during generation | G full Node and actual-entry Chromium | PASS within synthetic entry; no leak/compatibility claim for every extension/theme | Fresh exact-candidate mandatory |
| T02 draft/focus | Original native composer/node, exact draft/caret and native send preserved | U/E/G disposable native host + actual-entry keyboard checks | PASS bounded desktop; physical caret/IME NOT_TESTED | Device/full-candidate evidence mandatory |
| T03 missing capability | Refuse affected feature; retain native UI/text fallback | G unit + synthetic actual-entry | PASS synthetic absence; native capability removal not freshly exercised | Candidate absence check mandatory; no full-host removal claim |
| T04 long formatted messages, Copy/Backlog | Entire selected source text readable/selectable; ordinary formatting; unsafe/unsupported content falls back; Copy exact text; native backlog remains reachable | G actual-entry formatting/security tests; G native Copy/Backlog | PASS bounded technical; native exact-message handoff remains explicitly unresolved where host cannot prove rendered correspondence | Full text/native fallback mandatory; owner comfort pending |
| T05 send/stream/Stop/Continue/swipe | Native controls remain usable; read canonical revisions, do not treat ended as success | E/G disposable native host; G eventless-start synthetic actual-entry regression | PASS on pin; successful completion provenance can remain unknown and refuse head expressions | Mandatory; real-model/provider quality outside manual gate |
| T06 four native cards/two Mira names | Preserve native labels, no inferred actor mapping | G disposable native host: four real API cards/distinct avatars, native group UI activation | PASS functional scope; durable card identity UNSUPPORTED | Group scope approval + fresh host run mandatory |
| T07 stable slots/larger cast | ≤3 sprites, all four manual UUIDs retained; offstage selectable, no arbitrary eviction | U/G native host + reducer unit | PASS; implementation ceiling 20 actors, not tested unbounded casts | Mandatory for four-member exercise |
| T06 manual UUID safety | Names/host member order/drafted characterId never pick or move manual actors | G native member Move up and duplicate greetings; unit/entry authority cases | PASS transient/manual safety; automatic/durable mapping UNSUPPORTED | Mandatory safety; automatic binding excluded |
| PNG import/list/reselection (#29) | Labeled alternatives persist; explicit compatible reselection after save/reload/open; duplicate labels keep IDs | L native host + storage unit; U actual controls | PASS PNG scope; original JPEG/WebP UNSUPPORTED; full logical revision/attribution management incomplete | Explicit bounded deferral blocks freeze; broader features later |
| Background/presence/outfits/locks/swap (#30) | Stable manual arrangement, compatible outfits, explicit occupied-slot refusal/swap/replace; deliberate overrides/release | U/G disposable host + reducer unit | PASS technical; owner control clarity/tedium NOT_TESTED | Mandatory technical and later human acceptance |
| T08/T09 A → B → A | Detach each observed activation; old load/decode/hash/save cannot affect B or returned A | G native group/chat/individual switches + delayed receipt; synthetic actual-entry decode/eventless races | PASS observed-boundary scope; entirely unobserved identical-object/locator lifecycle not provable | Mandatory guards; durable guarantee excluded under F1 |
| T10 earlier swipe | Invalidate affected expression suffix; preserve unrelated pinned source | E/G native swipe + unit/entry | PASS transient history; no durable historical scene | Mandatory under either F choice |
| T11 edit/insert/delete/continue/reorder | Revision/prefix/order guards suppress stale overlays immediately and invalidate affected suffix | G native edit/Continue; E/G synthetic actual-entry unchanged-object reorder/insert/delete | PASS mixed evidence; synthetic cases are not all native UI operations | Mandatory; record scenario/evidence distinction |
| Temporary expression apply/clear/revisit (#31) | Explicit actor/outfit/source choices, historical correction invalidates later decisions, global dirty/revision untouched | E/G actual-entry + native host outgoing/committed/bundle inspection | PASS temporary scope; unresolved generating head refuses, stopped partial deliberate choice allowed | Mandatory; expression usability awaits owner |
| T12 save/reload/explicit reopen | Restore saved global layout/catalog/UUIDs/locks; detached after reload/switch; no temporary expressions restored | L/U/E/G native host restart/reopen | PASS global; original matching message/branch history UNSUPPORTED | Decision F BLOCKED; then fresh reopen evidence |
| T12 branch/copy ownership | No automatic native association/history reuse; native ownership change must detach; portable project copy gets fresh IDs | G inherited native switching and bundle host; source/epoch unit | PARTIAL against original native branch restore; no comprehensive durable native branch campaign | F1 excludes matching history, keeps isolation; verify native branch/copy detachment on candidate or leave NOT_TESTED/block |
| T13 pinned navigation/new messages | Previous/Next pins; append preserves old cursor/scroll/focus; Jump to Latest resumes follow; no navigation provider calls | E/G synthetic actual-entry + source unit | PASS entry scope; owner reading/replying flow untested | Mandatory candidate and owner exercise |
| T14 concurrent project saves | CAS refuses stale commit, no silent overwrite; clear memory edits/reopen recovery | U/G real authenticated peer + storage unit | PASS CAS; single-writer lease/read-only other tab UNSUPPORTED | Decision F BLOCKED; F2 requires implementation |
| Uncertain committed receipt (#30/#32) | Retain edits; block retry/cleanup until explicit reopen; delayed old receipt ignored | U/G instrumented response loss over actual committed native-host save + SQLite inspection | PASS injected transport evidence, not power failure | Mandatory disposable candidate |
| T19 native data integrity | Visual operations do not alter canonical chats/cards/groups/lore/personas/connections or inject tags/prompt metadata | G 41 named files equal; L/U/E inventories; save-body inspection; source inspection | PARTIAL full requirement: inventories omit complete persona/connection coverage; intentional native edits separately inventoried | Broaden named fixture inventory on candidate; blocks full readiness until covered |
| T22 missing/incompatible art | Keep captions/logical state and compatible base/neutral fallback; no wrong outfit or actor substitution | G native-host instrumented image error + actual-entry/reducer/store cases | PASS bounded failure; host image-error injection is identified | Mandatory; native reply must stay usable |
| T23 unsafe import | Reject corrupt/oversize/animation/MIME/path/foreign refs; preserve existing assets | L/G storage unit + actual-entry and native PNG refusal | PASS static PNG scope; JPEG/WebP acceptance absent | Validation mandatory even if PNG-only approved |
| T27 plugin absence/unknown schema | Reader/native reply/session visuals remain; unavailable persistence actionable; original bytes preserved | G disposable plugin-disabled startup; L actual v1 startup/CLI migration; unit future-schema refusal | PASS bounded; migration explicit preserved-backup → new absent stopped-host slot, never startup overwrite | Mandatory; no schema change in this task |
| T28 narrow/keyboard/zoom/reduced motion | Art yields, controls scroll, visible focus/local Escape, no global key capture, readable at zoom | U/G actual-entry keyboard/viewport checks, desktop 1440×1100/narrow 390×800 screenshots | PARTIAL; physical touch/Android/virtual keyboard/IME/assistive use NOT_TESTED | Physical technical evidence mandatory before full signoff |
| T29 untrusted content | Text/labels/import metadata remain inert; safe formatting and URLs; no scripts/commands | G unit + synthetic actual-entry security checks | PASS M1 data-safety portion; director prompt classification not implemented | M1 safety mandatory; M2/M3 classifier/provider tests excluded |
| T30 save overlapping switch | Capture project ID/revision/attachment epoch before I/O; stale receipt never reattaches or retargets | U/G native delayed committed receipt + model/entry unit | PASS project-global; not proof of native metadata targeted-write API | Mandatory; native metadata writes excluded |
| Owner individual/group experience | Approximately 20 turns plus short native group; evaluate immersion/read/reply/control/reopen usefulness | Human acceptance: none, no candidate SHA | NOT_TESTED; Gate A NOT_RUN | Later separately authorized human gate, never satisfied by tests |

Original requirements intentionally outside proposed F1: persistent message visuals, matching branch/history restore and writer exclusion (only if F1 approved); JPEG/WebP and fuller asset revision/attribution management only with explicit bounded scope deferral. Mandatory under F1: safe complete reading/replying, native integrity, source/epoch guards, compatible art/failure recovery, manual locks, four-member groups, device/accessibility and owner verdict. No automated scene director or image provider is needed.

Later concerns, **not disposable-playtest blockers on the pinned environment**: Node 22.13 compatibility/floor verification, other host/browser/OS/filesystem support, public plugin packaging/update/uninstall, license/demo distribution, production security/resource budgets, account recreation/repair, real disk-full/power-loss/fsync campaigns and recovery drills. [DYL-61](https://linear.app/devils17/issue/DYL-61) retains these; known unsupported account/CSRF-disabled persistence must still refuse safely. Real providers remain NOT_TESTED and are not needed for the deterministic manual evaluation.

## 5. DYL-60 candidate plan — execution authorized 2026-10-16

The owner has now separately authorized this recipe after recording all decisions. [Frozen candidate and fresh campaign](M1_4_DYL60_CANDIDATE.md). The next paragraph and setup estimates preserve the original preflight instructions; authorization is complete.

Use [existing DYL-60](https://linear.app/devils17/issue/DYL-60); no separate preflight issue is needed. Record scope decisions first, then obtain separate candidate-preparation authorization. Do not freeze this documentation branch by implication. Choose one clean full merged SHA at that later point (current inspected main is `f9497aebf59cbeae07a2b6391d0cff17e81bcc76`). Re-fetch/reconcile intervening changes rather than copying a historical SHA into a “current” claim.

### Environment, setup and fixtures

Use an isolated Linux checkout at the exact SillyTavern pin above with dependencies from its lockfile; no native writer overlays or core patches. Use Node **26.8.1** with built-in SQLite **3.53.4**, external Playwright **1.62.1** supplying Chromium **151.0.7922.34** (revision **1234**), and the candidate plugin lockfile (`pngjs` **7.0.0**). These are reproduction pins, not minimum-version compatibility claims. Record `node --version`, `node -p 'process.versions.sqlite'`, `npm --version`, OS/kernel, Playwright version and actual `browser.version()`. The plugin's advertised Node >=22.13 does not certify its backup CLI there. Browser installation/dependency availability must be checked; unavailable pins are BLOCKED/NOT_TESTED, never silently substituted.

Preparation commands below are a **later recipe**, not commands run by this preflight. Replace the candidate placeholder only after authorization; choose unused paths. `SN_PLAYWRIGHT_MODULE` must resolve to an existing installed Playwright module; the historical path shown is machine-specific. A clean independent checkout needs the pinned host's `npm ci` and Chromium/dependencies installed using that external Playwright distribution. For an independent machine without that tooling, install the same existing test dependency in a separate unused tooling directory: `npm install --prefix /tmp/sn-dyl60-tooling --save-exact --no-audit --no-fund playwright@1.62.1`, then `node /tmp/sn-dyl60-tooling/node_modules/playwright/cli.js install chromium` and set `SN_PLAYWRIGHT_MODULE=/tmp/sn-dyl60-tooling/node_modules/playwright/index.mjs`. Provision missing Linux browser libraries through the operator's approved package workflow; do not claim tests ran if launch fails. Keep dependency install logs/lock hashes; never add Playwright to production dependencies merely to run this recipe.

```sh
git clone https://github.com/Sonoran-Solutions/SillyNovel.git /tmp/sn-dyl60-candidate
cd /tmp/sn-dyl60-candidate
git checkout --detach FULL_OWNER_AUTHORIZED_CANDIDATE_SHA
git status --short
git rev-parse HEAD
git clone https://github.com/SillyTavern/SillyTavern.git /tmp/sn-dyl60-host-source
git -C /tmp/sn-dyl60-host-source checkout --detach 7e8663cd9c184a550b37238218bdd32c6efc68e9
npm ci --prefix /tmp/sn-dyl60-host-source --no-audit --no-fund
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
export SILLYTAVERN_ROOT=/tmp/sn-dyl60-host-source
export SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs
SN_EVIDENCE_DIR=$(mktemp -d /tmp/sn-dyl60-evidence-XXXXXX)
export SN_EVIDENCE_DIR
```

The [existing host runner](../tests/probes/project-portability/host.mjs) clones that host into its own `sn-portability-host-*` root, copies installed host dependencies, copies the candidate storage plugin and runs its locked `npm ci --ignore-scripts --no-audit --no-fund`, then symlinks this exact candidate UI. It creates disposable config/data with accounts enabled, CSRF retained, server plugins enabled and auto-update disabled. Recovery/library/group fixture paths require private **0700** data roots; database files are **0600**. No live path or real account data enters the run. Do not edit the candidate checkout while a symlinked run is active.

The runner selects an ephemeral loopback host port and starts the committed [deterministic provider](../tests/fixtures/dyl18-openai-endpoint.mjs) on **127.0.0.1:8128** with `custom_url=http://127.0.0.1:8128/v1`, `custom_model=sn-reader-local`, streaming enabled. It rewrites only the fixture origin into its temporary provider copy. Keep that port free and run host campaigns serially. No credential/real-provider request is required. The browser fixture uses pinned host Markdown/sanitizer dependencies, not a second fake provider/framework.

Synthetic individual fixtures are `Project A`/`Project B`, created by the runner with invented greetings and deterministic replies. [Group fixture](../tests/probes/native-groups/host.mjs) creates actual native cards **Mira, Mira, Rowan, Sage**, distinct native avatar records, deliberately equal first Mira greetings, Group A/B and four distinct manual actor UUIDs; IDs are generated per run, never name-matched. [Browser fixture](../tests/fixtures/reader-browser.html) and the actual-entry tests supply long formatted, repeated-text, unsafe-markup and delayed-source cases. Send `[LONG]` to the deterministic fixture to request its complete 65-paragraph formatted reply. These are technical fixtures; the owner session checklist below is longer and has not run.

Artwork is the existing original procedural fixture set, with no external/private art. [Manifest](../tests/fixtures/m12-stage/manifest.json) is authoritative for dimensions/bytes/attribution; retain and verify all eleven hashes, including `oversized.png` as a **rejection-only** fixture. Successful scene assets:

| File | SHA-256 |
| --- | --- |
| forest.png | `5ec7d5cb2f89ee08e5493088ff85a71830078e4d95a0010cec1743294f8ef5a2` |
| tavern.png | `7b76e59e5e9c3927db0dec2e492c8cd1924ba5a61919c37ac4d880af1cebd448` |
| mira-a.png | `794277e5167e757658fe33b58e702e51d32668d427f86a5b1c67bfa5f1f5786f` |
| mira-b.png | `f583c391c970a2c8fc4b20519cc17b05984ecfb65231d36d3ba87021f7366c3a` |
| rowan.png | `fa15ed5552e8a102cbb659fe4359f288f6cfcc667247d893b4725704d92b1b46` |
| sage.png | `2ff97d72355e8c093e032d450746b4484212041ffee857359604fc080542ef88` |
| mira-a-coat.png | `ef697948f70aacbe82c691c978678e03b5eb2b9b3e528ef553afe62786477542` |
| mira-a-joy.png | `ebc67fb00f77658f0f3fff534659afaa569e34f87d663be4e255002b16e85ea6` |
| mira-a-stern.png | `0e721dca1cb8314e16003b617406da3c6aab80a603c6706a1b7884857802faff` |
| mira-a-coat-joy.png | `c216bde830b0ddf4631ee0b665161a08c50086ceb90a085a272968856216ff7c` |

### Canonical automated sequence

Run once on the chosen **one full SHA**, retaining command, start/end time, exit status, unfiltered log and structured result per step. Do not hide a failed earlier run or reuse old campaign output as fresh output. The three test commands cover all current root Node tests and storage tests. No new framework, schema or provider is proposed.

```sh
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/m1-project-expressions.test.mjs tests/probes/dyl19/*.test.mjs > "$SN_EVIDENCE_DIR/node.txt" 2>&1
timeout 600s node --test --test-isolation=none plugins/sillynovel-storage/test/*.test.mjs > "$SN_EVIDENCE_DIR/storage.txt" 2>&1
timeout 300s node --test --test-isolation=none tests/m1-reader-browser.test.mjs > "$SN_EVIDENCE_DIR/browser.txt" 2>&1
SN_STAGE_UX_RUN=1 SN_LIBRARY_RUN=1 SN_MIGRATION_RUN=1 timeout 600s node tests/probes/project-portability/host.mjs "$SILLYTAVERN_ROOT" > "$SN_EVIDENCE_DIR/stage-library-migration.txt" 2>&1
SN_EXPRESSIONS_RUN=1 timeout 600s node tests/probes/project-portability/host.mjs "$SILLYTAVERN_ROOT" > "$SN_EVIDENCE_DIR/expressions.txt" 2>&1
SN_GROUP_RUN=1 timeout 600s node tests/probes/project-portability/host.mjs "$SILLYTAVERN_ROOT" > "$SN_EVIDENCE_DIR/groups.txt" 2>&1
SN_RECOVERY_RUN=1 timeout 600s node tests/probes/project-portability/host.mjs "$SILLYTAVERN_ROOT" > "$SN_EVIDENCE_DIR/recovery.txt" 2>&1
SN_CLEANUP_RUN=1 timeout 600s node tests/probes/project-portability/host.mjs "$SILLYTAVERN_ROOT" > "$SN_EVIDENCE_DIR/cleanup.txt" 2>&1
```

Use a fresh shell with unrelated `SN_*_RUN` flags unset. Stop on a nonzero exit; inspect it before proceeding. These are existing separately exercised campaign combinations; keep them separate because their scenario setup has stateful assumptions. Do not invent an all-flags combination to save a few minutes. Each includes some inherited portability/auth/restart/failure checks; that bounded repetition verifies integration. Do not rerun obsolete DYL-26–46 patched-native-writer investigations or independent resource campaigns as generic prerequisites.

Campaign coverage: stage/library/migration covers durable alternatives, save UX and preserved-v1 refusal/new-output migration; expressions covers individual temporary source corrections and native Stop/Continue/swipe; groups covers real duplicate-name native cards, larger manual cast, group lifecycle/switching and delayed save receipts; recovery/cleanup cover actual CLI/full-store preservation and reference-safe deletion/refusal. Node/entry checks cover delayed hashing/decoding, selection/outfit/source/order changes, failure restoration and untrusted data. Add the identified **native branch/copy detachment and persona/connection integrity evidence** using the same disposable host and inventories; no production-source change is needed merely to collect it. If a new helper/harness adjustment is necessary, it belongs to separately authorized DYL-60 preparation, with its inputs included in the frozen SHA.

Estimate, not measured execution here: Node seconds (G log ~2.2s), Chromium ~1 minute (G ~35.8s), storage ~3 minutes (G ~135s); allow **30–60 minutes machine time** for the serial host campaigns, provisioning and evidence checks, plus **2–4 hours engineer time** for independent setup, inventory completion, screenshots, classification and packaging. Allow **45–90 minutes** separately for physical-device technical testing once access is granted. Cold dependency/browser installs or failures can extend this. Owner conversation time is separate and unscheduled. F2 needs new implementation/proofs first and cannot use this estimate.

### Native-file integrity and evidence acceptance

Reuse runner `canonical()` path→SHA-256 maps and `nativeBefore`/`nativeAfter`; retain both maps, not only a boolean/count. The present helper covers characters, chats, groups, group chats, worlds and conditional avatars under the disposable account. **It does not fully inventory personas/connection settings.** Before the candidate visual-only phase, create explicitly synthetic persona/connection/lore fixtures through native setup and record their actual storage paths/configuration. Inventory those paths plus account settings and relevant exports; capture raw bytes and canonical field snapshots so side effects cannot hide inside a changed settings file.

Perform enablement, fixture creation and provider/config setup **before** the visual-only baseline. Wait for intended native saves to settle. Compare names, additions/deletions, byte counts and SHA-256 after visual-only layout/library/expression/save/reopen operations. No native send/edit/reorder during this interval. If the enabled preference or another documented extension setting is deliberately changed, record its exact allowed field/value separately and require all other canonical fields to remain equal; never exclude the whole settings file because it changed. Compare the actual synthetic outgoing native generation request after the phase: no added visual tags, source journal, project identity or authoring-prompt metadata. Keep that native-send inventory separate.

Native generation/edit/swipe/member reorder/new-chat/branch/copy/delete/recreate intentionally alter canonical files. Take a separate baseline/result for each; identify expected changed files/fields, and keep unaffected card/lore/persona/connection bytes equal. A generated chat file change is not a visual non-mutation failure, and cannot be hidden in the visual-only PASS. Do not claim all native files unchanged from a 41-file subset.

Retain from each owned root: `evidence.json`, `host.log`, command log, generated fixture identifiers and host-source hashes; plugin/global save bodies and committed rows; PNG hashes; bundle/backup inspection results (account binding UNVERIFIED stays such unless destination accounts are actually verified); complete native inventories and separate intentional-operation maps. Inspect desktop **1440×1100** and narrow **390×800** screenshots of library/reselection, current project/save states, four native members/duplicate names, three sprites/offstage controls, temporary expression, invalidation/failure, conflict/uncertainty and explicit reopen. Capture keyboard/zoom/reduced-motion and device screenshots separately with scenario IDs, dimensions, device/browser and candidate SHA. The 18 historical G screenshots are reference evidence, not new captures.

Validate candidate/host/full command identity in every structured record; hash frozen runtime, plugin/package/lock, tests/runners, provider, browser fixture and all artwork inputs. Verify every artifact exists, log exit/count/failure/skip fields match its report, source hashes match the pinned pristine host, maps compare within the correct phase, and no temporary expression/source/group association entered scene/catalog/bundle/backup. Retain an artifact SHA-256 manifest and rerun its checks before handoff. Reuse the existing [G validator](evidence/native-groups/review/validate.py) as an example of assertions, but **do not point it at historical directories and call that candidate validation**: it has historical paths/counts baked in. Candidate evidence needs its own actual paths/counts and validation record, using existing standard-library mechanisms.

Failure classification: **BLOCKED** missing pin/dependency/device/access/owner scope; **NOT_TESTED** unavailable or unreached surface; **UNSUPPORTED** deliberate documented exclusion; **PARTIAL** mixed surface coverage; **REVISE** any unresolved candidate regression or mandatory evidence gap. Historical expected counterexamples are never safety PASS. A concrete runtime defect gets exact SHA/reproduction, severity, expected/actual and smallest proposed separate correction; do not silently fix it in the readiness package. Exact-candidate technical PASS remains separate from Gate A NOT_RUN.

### Cleanup and independent reproduction

The runner prints `Owned evidence root ...` and `Evidence .../evidence.json`. Preserve all such roots on failure until reviewed; copy selected synthetic evidence into the evidence package before cleanup. Its `finally` closes the browser/host and terminates its provider, but an outer timeout/kill can bypass cleanup. Verify the exact owned PIDs, command lines, cwd and loopback listeners; stop only those processes, never broad `pkill` or an unrelated port owner. Confirm no owned host/provider remains. The source host is not an installed service.

After evidence/hash verification and reviewer release, remove only the individually recorded generated `sn-portability-host-*` roots, the explicitly created `/tmp/sn-dyl60-candidate` and `/tmp/sn-dyl60-host-source` checkouts, and any separately created `/tmp/sn-dyl60-tooling` directory and staging evidence directory after its retained copy verifies. Check exact paths/ownership and absence of symlink surprises first; never recursively remove a discovered wildcard path or a pre-existing directory. No live database/configuration is touched; no native rollback is needed. Keep verified migration source/backup/output until review is complete.

An independent reviewer uses a fresh checkout of the same full SHA, the same host/runtime/browser pins and manifest assets, then runs the same serial commands and compares scenario outcomes/input hashes, not random UUIDs or timestamp-dependent native filenames across runs. Record new evidence roots and maps for that run. Any candidate input change requires a new full SHA and fresh applicable validation; do not assemble a freeze from unrelated PR runs.

## 6. Owner playtest sheet — draft, session NOT_RUN

Before starting a later separately authorized session, fill: `candidate full SHA / approved Decision F and format scope record / host full SHA+version / browser+device / theme+extensions / assets / tester/date / evidence location`. Use synthetic conversation/art for shareable captures; keep private owner observations/art outside Git. Technical evidence must already identify remaining limits.

### Individual conversation — approximately 20 user/reply turns

- [ ] Open an invented individual chat, enable SillyNovel, explicitly create/open a project. Import a background, two neutral actors and compatible outfit/expression PNGs. Identify which project is attached and whether edits are saved.
- [ ] Turns 1–5: read a long formatted reply to its end; select/copy the full text and compare with native chat. Use Backlog and return. Reply naturally from the native composer while generating; Stop, then Continue. Confirm partial/unknown states are understandable.
- [ ] Turns 6–10: change background, presence, outfit and locks; release a lock and deliberately replace a value. Apply different temporary expressions to several messages/actors. Revisit them with Previous/Next; stay on an old message while a new reply arrives, then Jump to Latest.
- [ ] Turns 11–15: use native swipe/regeneration and edit an older source; observe dependent expressions clear without changing canonical text through visual controls. Make an older-message expression correction and note later-choice invalidation. Keep reading/replying throughout.
- [ ] Turns 16–20: save global layout/library, reload detached and explicitly reopen. Under F1 expect saved layout/catalog and **no temporary expression history**. Switch A → B → A and reopen explicitly. Try a deliberately invalid PNG/incompatible visual action; reading/replying must remain available. Check dirty/save/conflict/uncertain recovery using the prepared synthetic fault scenario, without sacrificing private work.
- [ ] Toggle native chat/reader repeatedly and disable while generating. Confirm draft, caret, native reply/Stop and complete dialogue remain usable. Record any required workarounds.

### Short native group — approximately 4–6 exchanges

- [ ] Use four genuine native cards, **Mira, Mira, Rowan, Sage**; identify the two distinct Mira card records in native UI. Explicitly open the independent project; register four manual UUID actors.
- [ ] Show three actors and keep one offstage. Select each same-name actor by its distinguishing ID. Try an occupied move, then explicit swap/replace; verify no silent eviction and stable slots/presence/outfits/locks.
- [ ] Generate native group replies and use native Stop/Continue/swipe. Native speaker labels must not choose an actor or guessed spotlight. Apply/revisit temporary expressions to explicit actors, including equal-text/equal-name sources where provided.
- [ ] Switch group A → B → A and group ↔ individual; observe detachment and recovery. Reload/reopen restores saved global layout only under F1. Try missing/incompatible art; keep reading and replying. Record whether manual management is useful or tedious.

### Owner observations and later verdict

For each answer, record a concrete moment and screenshot/scenario reference: more immersive than normal chat; easy/comfortable reading; natural replying while generating; understandable scene controls; clear saved/unsaved/reopen states; manual actor management becoming tedious; useful groups without automatic speaker mapping; would keep SillyNovel enabled.

| Observation | What happened / expected / effect on reading or replying | Screenshot or turn | Severity / requested change |
| --- | --- | --- | --- |
| To be filled by owner | | | |

Later owner record: `PASS / REVISE / STOP / exact words / owner / date / candidate full SHA / tested surfaces / blockers / next bounded step`. Until supplied, **Gate A NOT_RUN**. Do not infer PASS from completing checkboxes or from an automated campaign. A PASS does not authorize M2, beta or production.

## 7. Physical-device technical checklist — access authorized, evidence BLOCKED

Current DYL-60 disposition: authorized `adb devices -l` and `adb mdns services` both return empty inventories. No established endpoint is accessible. Physical testing is BLOCKED pending the operator’s already paired, connected/unlocked Galaxy Tab S8 or its established reachable endpoint. No pairing, unlock, setting change or private-data access was attempted. [Exact discovery record](evidence/dyl60/device.txt). The following paragraphs retain the original preflight recipe and do not revoke this later authorization.

No device was inspected, connected, unlocked or modified in the original preflight review. No repository instructions for an established wireless-ADB endpoint were found in Markdown guidance; do not invent an IP, pairing code, serial, browser or Android version. If the owner's **Galaxy Tab S8** and established wireless-ADB setup are available later, obtain authorized unlocked device access and the existing connection details from its operator. Use the already paired connection only; record model/serial redacted for public evidence, Android/build, native browser version, keyboard/IME, density/text scaling, orientation and candidate/host SHA. Device discovery/connection and testing require that later authorization; none was attempted here.

Use a dedicated disposable host accessible from the authorized device without making a live host public. The runner binds host/provider to loopback; for an authorized already-connected ADB device, an operator can use an explicitly approved `adb -s DEVICE_SERIAL reverse tcp:DEVICE_PORT tcp:HOST_PORT`, then open `http://127.0.0.1:DEVICE_PORT` in the device's native Android browser. Use actual recorded ports and verify secure-context/crypto availability; the provider remains host-loopback only. This is a proposed transport recipe, **not a tested connection**. Remove only that reverse mapping afterward and close the synthetic tab. Do not enable debugging, pair, unlock, change device settings, forward network exposure or reuse private browser sessions without explicit authorization. If transport/browser crypto cannot support the visuals, record BLOCKED rather than claim viewport equivalence.

- [ ] Tap every main navigation/scene/project action with real touch; check target spacing, labels and absence of hover-only actions. Scroll long dialogue independently of controls.
- [ ] Open/dismiss the actual virtual keyboard repeatedly. Native composer, current text/caret, Send and Stop stay visible/reachable while generating. Enter a draft, select text, move caret, switch backlog/reader and verify exact draft/selection. Exercise the actual IME without global shortcut interference.
- [ ] Portrait and landscape: collapsed and expanded controls, long status/group labels, library/cast/cleanup panel scrolling; no clipped dialogue or blocked native actions. Record viewport changes and screenshots before/with/after keyboard.
- [ ] At normal and increased text scaling/browser zoom (including 200% where supported), read long formatted text and reach all controls. Exercise reduced-motion preference and verify no disruptive motion; record actual system/browser setting without claiming assistive-tech coverage.
- [ ] Navigate native chat/backlog, return to reader, reply, Stop/Continue and switch individual/groups. Save/reload/explicit reopen and one refused visual operation must preserve usable native reply access.
- [ ] Record each outcome, exact device/browser/keyboard/configuration and evidence. Restore any operator-approved temporary preferences, remove only task-owned transport/tab/processes, and confirm cleanup.

Touch, Android browser behavior, virtual keyboard/IME, physical focus/caret, orientation, scaling and assistive use all remain **NOT_TESTED** until actual evidence is supplied. Screen-reader/other assistive-device acceptance remains separately identified if unavailable; never claim it from semantic DOM assertions. F1 preserves these requirements.

## 8. Issue reconciliation and handoff boundary

The table preserves the original PR #33 Linear snapshot on 2026-10-16. Current DYL-60 authorization/status/evidence is in the [candidate record](M1_4_DYL60_CANDIDATE.md); its historical blockers remain. The other issue dispositions were not changed by DYL-60. Original reads, with relations, confirmed:

| Issue | Current status / actual relationships | Recommended owner disposition |
| --- | --- | --- |
| [DYL-22](https://linear.app/devils17/issue/DYL-22) | Done; blockedBy DYL-21, blocks DYL-23 retained | Credit merged PNG catalog; retain original JPEG/WebP/revision/attribution criteria and record bounded deferrals explicitly. Done is not evidence of full original acceptance. |
| [DYL-23](https://linear.app/devils17/issue/DYL-23) | Done; blockedBy DYL-18/20/22; blocks DYL-60 retained | Credit merged UX/temporary expressions/groups; preserve original physical/history/writer acceptance and dependency history. No reversal or silent full-gate completion. |
| [DYL-62](https://linear.app/devils17/issue/DYL-62) | In Review although PR #31 MERGED | Owner may reconcile the bounded implementation slice after reviewing the correction/merge. Preserve temporary-only scope and residual device/gate gaps. No automatic Done here. |
| [DYL-63](https://linear.app/devils17/issue/DYL-63) | In Review although PR #32 MERGED | Same bounded disposition recommendation; verified mismatch is tracker/handoff reconciliation, not missing merged implementation. Preserve all acceptance/history. |
| [DYL-60](https://linear.app/devils17/issue/DYL-60) | Backlog; actually blockedBy DYL-23; related DYL-22/62/63/61 | Link this proposed plan on the existing issue; retain blocker and state. Owner scope decisions and separate execution authorization come first. No freeze/Done/session implied. |
| [DYL-61](https://linear.app/devils17/issue/DYL-61) | Backlog; no blocking relations | Retain later public-beta/production concerns; do not turn them into disposable-stage prerequisites. |
| [DYL-55](https://linear.app/devils17/issue/DYL-55) | Done; DYL-54 blocker retained; older prose says pending | Preserve status and acceptance; no new parent-completion ruling. |
| [DYL-56](https://linear.app/devils17/issue/DYL-56) | Backlog; DYL-54 blocker retained | Remembered hints remain unauthorized. |

No state, original acceptance or blocker relation is changed by this PR. No duplicate issue is created. Existing narrative “draft/unmerged”, “groups unfinished” and “pending parent” statements in older reports describe their original checkpoints; this dated snapshot distinguishes current implementation/status without erasing those records.

**Historical PR #33 next-step recommendation:** senior/owner review of that draft documentation PR; record F1 or F2 and section 3 choices. If F1 and bounded scope are approved, separately authorize DYL-60 to complete one exact-candidate technical/device/integrity package. If F2, separately authorize the missing implementation/proofs first. Stop here: no frozen candidate, owner session/schedule, Gate A verdict, blocker removal, M1.3/M2, live installation, release, public beta, production approval or merge.

## 9. Checks performed by this preflight

Fresh work here is repository/GitHub/Linear inspection, source/doc/scenario review, historical artifact/input/hash verification and documentation validation only. [Check record](evidence/m14-preflight/validation.txt) records actual commands/results. The preliminary `git fetch` first hit sandbox read-only metadata; the authorized retry succeeded. No runtime suite, browser campaign, disposable-host campaign, real provider, physical device or owner session was run. Historical logs/test totals/screenshots remain attributed to their original candidates above. This documentation package is **REVISE before freeze; GO for senior review**, not Gate A acceptance.
