# M1.2 storage completion and manual-stage readiness

Review date: **2026-10-15, America/Phoenix**. Reviewed fetched `origin/main`: **`ea65d84a521a39c9ccc977f4cb3643454963d4b8`**. Original checkout: clean `1ff171f747c6f03cbd3cf7aa8564e0d06d8ec4fd`. Review branch: `codex/m12-storage-readiness`, created from fetched main. This is documentation, acceptance review and planning only; no runtime implementation or new runtime campaign.

**DYL-55: GO for its bounded experimental scope, subject to explicit owner acceptance. Overall M1.2: REVISE. Gate A: NOT_RUN.** The storage path works within the measured boundary. A reusable asset library and a complete manual-stage experience still need work. Project persistence is not persistent message history, native correspondence, production readiness or a human usability verdict.

## 1. Verified implementation history and evidence boundary

GitHub metadata was read directly for each PR; all are CLOSED/MERGED with the expected merge SHA, and those commits are ancestors of reviewed main. Old PR bodies saying OPEN/UNMERGED describe their historical handoffs, not current GitHub state.

| Work | Merge commit | Current result |
| --- | --- | --- |
| [#23 architecture / DYL-49](https://github.com/Sonoran-Solutions/SillyNovel/pull/23) | `97441493dd42343883c5ef3f5ae44ad845e1368a` | Independent projects, explicit attachment, optional local plugin |
| [#24 first persistence slice / DYL-50–54](https://github.com/Sonoran-Solutions/SillyNovel/pull/24) | `537c193ce6ac22234cfaab04def85af8ae0a25a2` | Authenticated SQLite/CAS, immutable PNGs, global scene save/reopen |
| [#25 bundles / DYL-57](https://github.com/Sonoran-Solutions/SillyNovel/pull/25) | `4337a05ac8321e714a9677d6a408aa3ee37bbcbf` | Explicit portable saved-project copies with fresh IDs |
| [#26 recovery / DYL-58](https://github.com/Sonoran-Solutions/SillyNovel/pull/26) | `b37a60615795d8871171504de88da8d10afddf9e` | Consistent backup, offline validation, same-account empty-slot restore |
| [#27 cleanup / DYL-59](https://github.com/Sonoran-Solutions/SillyNovel/pull/27) | `ea65d84a521a39c9ccc977f4cb3643454963d4b8` | Confirmed selected deletion, reference/race protection, logical quota reuse |

The review read the [architecture](M1_INDEPENDENT_PROJECT_STORAGE.md), [implementation plan](M1_PROJECT_STORAGE_IMPLEMENTATION.md), [first-slice evidence](M1_PROJECT_STORAGE_SLICE.md), portability/recovery/cleanup contracts and implementation reports, [M1 plan](M1_PLAN.md), [roadmap](ROADMAP.md), [status](STATUS.md), [decisions](DECISIONS.md), [testing](TESTING.md), [assets](ASSETS_AND_PROVIDERS.md), [UX](UX_SPEC.md), [state](STATE_AND_DIRECTOR.md), and actual plugin/client/stage/reducer/test paths linked below. It does not infer acceptance from child statuses or test totals alone.

Evidence keys below refer to retained campaigns, **not tests rerun by this review**:

| Key | Frozen tested candidate and bounded evidence |
| --- | --- |
| S | [First-slice corrections](M1_PROJECT_STORAGE_SLICE.md#senior-review-corrections--2026-10-15), `94a4f94cb019be9f46db73e910dc7737c5632cff`: 70 Node, 3 storage, 26 actual-entry Chromium; eight pinned-host checkpoint groups. [Host JSON](evidence/project-storage/revision/host.json). |
| P | [Portability](M1_PROJECT_PORTABILITY_IMPLEMENTATION.md#frozen-evidence-and-final-handoff), `770932811430dbd85bee79182be75ee3c22b7370`: 70 Node, 37 storage/bundle, 31 Chromium; 12 pinned-host groups. [Host JSON](evidence/project-portability/host.json). |
| R | [Recovery](M1_PROJECT_DATABASE_RECOVERY_IMPLEMENTATION.md#frozen-acceptance--2026-10-15), `08d1f3560efb3832b9730543ae18dde5829a0d2b`: 85 storage/bundle/recovery (48 recovery), 70 Node, 31 Chromium; 17 host groups. [Row/identity comparison](evidence/project-recovery/database-comparison.json), [runs](evidence/project-recovery/runs.json). |
| C | [Cleanup](M1_PROJECT_ASSET_CLEANUP_IMPLEMENTATION.md), `c77f512834d9c52b17a9d0a74f0ed5a89004c50a`: 104 storage/bundle/recovery/cleanup (19 cleanup), 80 Node, 39 Chromium; 21 host groups. [Runs](evidence/project-cleanup/runs.json), [cleanup records](evidence/project-cleanup/cleanup.json). |
| T | [DYL-24 review](M1_TRANSIENT_STAGE.md#pr-12-senior-review-corrections--2026-10-12) and its later completed host campaign: `cdf9761853e3f9c60e41230556a9be1392b146d8`, runtime identical to `20554b0fcf3f1c7d61ed21df9636fe62cd7617c6`; 64 Node, 24 Chromium and 16 host checks. [Results](evidence/m12-stage-review/results.json). |

S/P/R/C used SillyTavern **1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`**, Node **26.8.1**, Chromium **151.0.7922.34**, Linux; R/C record SQLite **3.53.4**. Synthetic accounts/art/chats and deterministic loopback provider only. T used isolated headful Chromium/Xvfb. No real provider, physical touch device or owner playtest is certified. Counts overlap; never add them into a coverage total. Named native-file inventories cover 33 files in S/P and 64 in R/C, not every persona, connection setting or file on the host.

Current runtime/tests match C's recorded fingerprints; R's recovery module/CLI/schema/PNG/test files remain identical. C reran predecessor storage/recovery checks after its shared worker-entry adjustment. This connects the inspected source to retained evidence without claiming a fresh current-main runtime run. Resource measurements and failed development attempts remain in their original reports.

## 2. Linear snapshot and actual dependencies

Direct issue reads included relations for DYL-18–25 and DYL-47–59; DYL-22/23/55/58/59 comments were also checked. Project-wide search including archived issues returned **32 issues, no next page**, highest identifier DYL-59 before this review. A workspace title/description search for SillyNovel likewise returned those 32, no next page. No existing newer equivalent of the candidate-preparation or release-hardening work was found. Historical local proposal keys G/H/I in M1_PLAN were not actual tickets.

All rows describe tracker facts, not a new ruling that a completed investigation satisfied downstream prerequisites. `A → B` means the actual blocking relation; “related” is not a dependency.

| Issue | Status at review | Actual blocked by | Actual blocks |
| --- | --- | --- | --- |
| DYL-18 | Done | DYL-16, DYL-17 | DYL-23 |
| DYL-19 | Done | DYL-15 | DYL-20, DYL-21 |
| DYL-20 | Done | DYL-17, DYL-19 | DYL-23 |
| DYL-21 | Done | DYL-19 | DYL-22 |
| DYL-22 | Backlog, functionally blocked | DYL-21 | DYL-23 |
| DYL-23 | Backlog, functionally blocked | DYL-18, DYL-20, DYL-22 | None before this review; DYL-60 added below |
| DYL-24 | Done; fallback supported | None | None |
| DYL-25 | Done | None | DYL-26 |
| DYL-47 | Done | DYL-46 | DYL-48 |
| DYL-48 | Done; upstream NOT_SUBMITTED | DYL-47 | None |
| DYL-49 | Done | None | DYL-50 |
| DYL-50 | Done | DYL-49 | DYL-51, DYL-52 |
| DYL-51 | Done | DYL-50 | DYL-53 |
| DYL-52 | Done | DYL-50 | DYL-53 |
| DYL-53 | Done | DYL-51, DYL-52 | DYL-54 |
| DYL-54 | Done | DYL-53 | DYL-55, DYL-56 |
| DYL-55 | Backlog; unfinished pending owner | DYL-54 | None |
| DYL-56 | Backlog; unauthorized | DYL-54 | None |
| DYL-57 | Done; child of DYL-55 | None | DYL-58, DYL-59 |
| DYL-58 | Done; child of DYL-55 | DYL-57 | DYL-59 |
| DYL-59 | Done; child of DYL-55 | DYL-57, DYL-58 | None |

DYL-57's narrative prerequisite DYL-54 is a **related** issue, not an installed blocker. DYL-55 retains its DYL-54 blocker. DYL-22/23 have extensive related links to architecture/storage work, including DYL-49–59 as applicable; those links do not release their original blockers. All three DYL-57–59 have `parentId: DYL-55`; parentage is separate from dependency. DYL-55 is related to DYL-22/23/49/56. There is no newly discovered fourth implementation child.

This review adds only [DYL-60](https://linear.app/devils17/issue/DYL-60), Backlog under M1.4, blocked by DYL-23, and [DYL-61](https://linear.app/devils17/issue/DYL-61), Backlog release-hardening checklist, with related links and no functional-stage blocker. Existing blockers/statuses remain intact. Descriptions of DYL-22/23 retain their original requirements and append proposals; DYL-55 gets a dated factual checkpoint preserving its historical assignment.

## 3. DYL-55 acceptance matrix

**PASS** means implemented with relevant bounded evidence. **PARTIAL** means an implemented requirement still has a mandatory acceptance gap. **NOT_TESTED** means insufficient exercise. **UNSUPPORTED** marks an intentional compatibility exclusion. **BLOCKED** names a prerequisite or decision. A PASS never expands the compatibility boundary.

### Portable projects

Primary code: [store export/import](../plugins/sillynovel-storage/store.mjs), [bundle validation/worker](../plugins/sillynovel-storage/bundle.mjs), [authenticated routes](../plugins/sillynovel-storage/index.mjs), [explicit project UI](../src/stage-view.mjs). Tests: [bundle checks](../plugins/sillynovel-storage/test/bundle.test.mjs), [actual-entry browser](../tests/m1-reader-browser.test.mjs), [host runner](../tests/probes/project-portability/host.mjs).

| Requirement | Class | Implementation and evidence | Remaining boundary |
| --- | --- | --- | --- |
| Explicit export/import | PASS | `exportBundle` snapshots saved state; file UI requires deliberate export/import; P host roundtrip/restart | Unsaved edits and unused alternatives excluded; no chat backup |
| Format/schema validation | PASS | Canonical JSON/base64, exact keys/v1 scene, decoded PNG/hash/dimension/aggregate limits; malformed variants in bundle tests, P | JSON produced by v1 only; no ZIP/pack extraction or general JSON interoperability |
| Fresh IDs | PASS | Server allocates project/actor/asset UUIDs in `importBundle`; roundtrip and repeat-import tests; P rows | Revision starts at 0; source ownership discarded |
| Complete reference remapping | PASS | Validated set equality between declared assets and all background/actor refs; map every reference; P and bundle byte/lock comparisons | Only fields in global v1; no expression/history references exist |
| Atomic import | PASS | Validate before `BEGIN IMMEDIATE`; quota checks/insert/remap/update/COMMIT together | Tests inspect tables/BLOBs after creation, second-asset, final-state and deferred-COMMIT faults; P HTTP faults; lost response can still mean committed copy |
| Account isolation | PASS | Every route uses signed-in `(handle, created)`; foreign export refusal and caller-owned imported copy; P two real accounts/CSRF | Deliberately sharing a bundle permits a new account-owned copy; no hostile-admin isolation |
| No automatic native attachment | PASS | Import refreshes list/status only; no installed model until explicit open; delayed replacement/switch tests and P | No remembered mapping, native ID, metadata write or transcript authority |
| Duplicate names | PASS | No name uniqueness constraint; UUIDs displayed for list distinction; repeated same-name imports and independent edits in P/tests | Display name never authorizes access or identifies a native card |
| Corruption/refusal | PASS | Digest/PNG/container/unknown schema/traversal-like ID/ZIP refusal; old scene/database preserved by tests | Worker 15s/heap policy is bounded, not throughput or production RSS certification |

Limits matter: 8 MiB + 32 KiB container, 6 MiB PNG bytes, 21 entries, **4,194,304 aggregate pixels**. A project accepted by the 16M-pixel upload ceiling can exceed the smaller portable ceiling. Export refuses the entire bundle; it never drops art. This is documented experimental scope, not a promise that every permitted store can be portably exported. A full verified database backup is the preservation route. Raising/unifying limits belongs to DYL-61 and requires measurement.

### Database recovery

Primary code: [recovery](../plugins/sillynovel-storage/recovery.mjs), [operator CLI](../plugins/sillynovel-storage/tools/recovery.mjs), [shared exact schema](../plugins/sillynovel-storage/database-schema.mjs). Tests: [recovery checks](../plugins/sillynovel-storage/test/recovery.test.mjs), [host campaign](../tests/probes/project-recovery/host.mjs). [Operator contract](M1_PROJECT_DATABASE_RECOVERY.md).

| Requirement | Class | Implementation and evidence | Remaining boundary |
| --- | --- | --- | --- |
| Consistent SQLite snapshots | PASS | Official `sqlite.backup`, complete validation before manifest-last publication; R DELETE/WAL committed-write overlap and rollback comparison | No raw active-file copy; local trusted POSIX paths |
| Offline validation | PASS | Read-only/query-only integrity/FK checks, exact schema, all scenes/refs and PNGs, manifest counts/length/hash; invalid-package tests/R | Hashes detect corruption, not authenticity; standalone snapshot only |
| Empty-slot restoration | PASS | Stopped target contract; validate source, stage copy/revalidate, exclusive hardlink publication, refuse DB/sidecars; R CLI and real-host restart | Tool does not prove the host stopped; operator prerequisite; no live or existing-store replacement |
| Account-incarnation verification | PASS | Read-only retained host `user:<handle>` records must match `(handle, created)` before publication; mismatch/recreation refusal tests and R | Must independently provision same accounts; cannot repair/reassign/recreate accounts |
| Complete project/asset preservation | PASS | Exact rows, IDs/revisions/owners/actors/locks and all referenced/unused BLOBs; R restores 8 projects/19 assets and two-owner readback | No native account/chat backup; independently retained native/account data required |
| Journal/WAL handling | PASS | SQLite coordinates online source; published snapshot converted to standalone DELETE; offline sidecars refuse; pending WAL and killed hot-journal tests | Hot journal must undergo normal SQLite recovery; no copying/clearing arbitrary journals |
| v1 compatibility and migration policy | PASS | Exact v1 precondition at startup/inspect; future/incomplete schema refusal; preservation policy for future copy-on-new-output transitions | Approved child scope provided policy/preconditions, not a generic migration engine |
| Actual cross-version migration | NOT_TESTED | No real v2 exists; no transition implemented or claimed | Mandatory before shipping a real schema transition; not a manufactured gap in v1 recovery acceptance |
| Recovery failure handling | PASS | Staging/publication/tamper faults, exclusive destination race, held-inode cleanup and process-kill evidence; R checks actual rows/files | Unknown replaced objects/incomplete stages retained for operator review; no automatic recovery |
| Power-loss / real disk-full durability | NOT_TESTED | R explicitly separates injected errors/SIGKILL from these failures | DYL-61 production evidence; ordinary fsync calls alone do not prove durability |
| Other OS/filesystem or live overwrite | UNSUPPORTED | Deliberate local POSIX/absent-slot contract | New compatibility/replacement work needs separate scope |

Recovery budgets: 512 MiB database, 1000 projects, 10000 assets and aggregate decoded-pixel bound, 120s public CLI watchdog. Source growth/free disk are operator concerns. Node 26.8.1's backup API was exercised; the advertised plugin Node 22.13 floor does not establish recovery API availability there.

### Asset lifecycle

Primary code: `cleanupInventory`, `previewCleanup`, `removeUnusedAssets` and `save` in [store](../plugins/sillynovel-storage/store.mjs); [cleanup request/preview schema](../plugins/sillynovel-storage/schema.mjs); [client receipts](../src/project-client.mjs), [model gates/cache eviction](../src/project-scene.mjs), [selection/confirmation UI](../src/stage-view.mjs). Tests: [cleanup](../plugins/sillynovel-storage/test/cleanup.test.mjs), [model/client](../tests/m1-project-scene.test.mjs), [host campaign](../tests/probes/project-cleanup/host.mjs), browser cleanup cases. C includes predecessor suites.

| Requirement | Class | Implementation and evidence | Remaining boundary |
| --- | --- | --- | --- |
| Explicit unused review | PASS | Authenticated project inventory, initially unchecked selection, count/bytes/warnings; C real review/cancel | Committed scene references only, including absent/offstage actors; no automatic GC |
| Selected deletion | PASS | Exact confirmed UUID set, strict 1–100 unique IDs, parameterized project deletion and verified receipt; C rows/quotas | No project deletion or in-app undo |
| Referential integrity | PASS | Recompute all references/inventory under transaction; saved refs refuse; missing/corrupt inventory refuses all | Server cannot enumerate browser-only drafts |
| Concurrent save/upload protection | PASS | Existing `BEGIN IMMEDIATE` serializes; save revalidates refs; independent worker/SQLite connection tests for save/upload/export/backup | Another tab's draft may later get `ASSET_MISSING`; no draft reservation or merge |
| Stale-preview rejection | PASS | Owner/project/revision/scene/full-inventory digest rechecked before deletes; C second-client upload; scene/upload/cleanup tests | No wall-clock TTL needed; unrelated new project does not stale an unchanged inventory |
| Lost-response handling | PASS | No automatic retry; uncertain status, submitted alternatives evicted from cache; malformed/proxy/wrong-receipt tests and C real aborted receipt with committed row inspection | Reopen/review discovers actual state; transport failure never proves rollback |
| Logical quota recovery | PASS | Exact removed BLOB bytes subtracted; C reaches quota, removes 4,001,673 bytes then uploads replacement | DB file stayed 104,239,104 bytes; 978 freed pages reused; no OS-space guarantee/VACUUM |
| Verified backup compatibility | PASS | Pre/post backups validate; pre retains unused art; portable export still exactly saved refs; C plus R regression tests | C did not restore a pre-cleanup backup; R separately proves whole-store restore including unused assets |
| Cross-tab unsaved-draft preservation | UNSUPPORTED | Explicit warning and failed missing-reference save retain local edits for deliberate repair | It is not global draft safety; no silent replacement or promise of art after deletion |

**DYL-55 disposition: GO.** No mandatory gap was identified in the specifically implemented and approved experimental bundle, v1 recovery-policy/empty-slot, and cleanup contracts. The NOT_TESTED/UNSUPPORTED rows remain release limits. If the owner requires universal store-to-bundle export, actual cross-version migration, account reassignment, power-loss certification or live replacement as parent acceptance, the disposition becomes **REVISE** against that expanded scope. Current tracker state remains **Backlog/unfinished**; only the owner can accept the bounded completion and authorize closure. There is no foundational incompatibility requiring STOP.

## 4. DYL-22: original raster-registry requirements versus current code

**Recommendation: revise the existing ticket to independent-project assets, retaining the historical acceptance text and explicitly identifying any owner-approved deferrals.** Reusing it avoids a replacement registry/backend and duplicate work. Do not declare it unblocked merely because DYL-50–59 are Done. The owner must approve the revised prerequisite/format/catalog contract; its DYL-21 relation remains.

| Original requirement | Current classification and credit | Remaining work / decision |
| --- | --- | --- |
| PNG manual imports and decode safety | PASS for persistent PNG: DYL-52, S/C; [PNG decoder](../plugins/sillynovel-storage/png.mjs) validates chunks/CRC/inflate/pixels/full decode | Keep current bounded ceilings until separately measured policy |
| Static JPEG/WebP, animation/type/coercion tests | PARTIAL: T transient path accepts signatures/browser decode; persistent route/capabilities accept PNG only | JPEG/static WebP persistent support and real-file variants are missing; owner may defer formats, never mark original acceptance passed |
| Immutable asset IDs/content revisions | PARTIAL: DYL-52 UUID + immutable BLOB/SHA, verified readback, new UUID on upload | No durable logical asset ID with replacement revision chain; no immutable catalog metadata revisions |
| Logical asset labels / attribution | PARTIAL: project/actor names persist; assets display generic “Imported PNG”; cleanup shows UUID/digest | Store validated user asset labels and optional attribution; duplicate labels must remain distinct |
| Background versus sprite classification | PARTIAL: transient reducer catalog is typed; saved scene field determines role | Asset rows have no persistent kind; cannot list/classify unused alternatives after reopen |
| Outfit/expression compatibility | PARTIAL: reducer rejects wrong actor/outfit; T fixtures demonstrate expressions | No persisted compatibility metadata for user library; project mode has only sprite selection, expressions hidden |
| Catalog/list/read/remove | PARTIAL: owned immutable reads, DYL-59 unused listing/deletion, DYL-57 saved refs | No complete library list/selector after reopen; [project model](../src/project-scene.mjs) installs only scene-referenced art. Previously imported alternatives remain in SQLite but cannot be reselected through an ordinary catalog |
| Missing-art fallback | PASS for bounded stage: T/S/C neutral art, text/composer continue; model catches unavailable assets | Regress fallback with the expanded catalog; no other-character/outfit substitution |
| Manual import/management UX | PARTIAL: explicit file use/actor/import/save, cleanup selection exist | Meaningful labels, reusable alternatives, compatible outfit selection and clear library versus saved arrangement |
| Quotas/failures | PASS for experimental DYL-50/52/54/59 limits, rollback/CAS and quota reuse | No approved production capacity or global rate/latency budget; DYL-61 |
| Export/import | PASS for DYL-57 saved global scene + referenced PNGs | Not whole asset library export; metadata/catalog extension needs reviewed format/version and recovery compatibility; never silently discard old metadata |
| Persistence across reload | PARTIAL: DYL-51/53/54 saves selected global scene/assets and actor UUIDs | Complete reusable library choices/labels/compatibility not reconstructed; detached reload is intentional |
| Native character-card identity | BLOCKED for legacy durable card association; explicitly excluded from project v1 | Revise to project-owned manually chosen actor UUIDs; preserve unresolved host authors. Same-name cards/names/avatars cannot grant identity. Restoring native-card correspondence would require separately authorized evidence, not this library slice |
| Partial batches/collisions/reference-safe revision removal | PARTIAL: single-file import, UUID constraints and selected unused deletion have tests | Do not add batch UI now; any future batch needs partial-failure rules. Preserve old bytes/references on replacement; no implicit deletion |

DYL-50 supplies authenticated scope; DYL-51 scene/CAS; DYL-52 immutable PNG storage; DYL-53 UI/global reducer integration; DYL-54 real-host failure/reload evidence; DYL-57 portable saved refs; DYL-58 full-store preservation and future-schema refusal; DYL-59 explicit unused cleanup. None supplies the missing labeled reusable library. DYL-56 is unimplemented convenience and supplies no acceptance credit.

Smallest useful first vertical slice under revised DYL-22: **label/classify imported PNG alternatives, list them by owned project after reopen, explicitly select compatible backgrounds/outfits, preserve immutable bytes and selected refs**. First deliverable needs no JPEG/WebP decoder, host-card binder or asset editor. A metadata/schema change must bring its bounded migration/backup/format tests in the same slice; DYL-58's policy does not magically implement a transition. Prefer the smallest compatible metadata design after inspection; do not prescribe a speculative registry framework here. Keep expression-library completion as the next bounded checklist item under the same ticket, before dependent DYL-23 controls. Original unmet criteria remain open until completed or explicitly deferred by the owner.

## 5. DYL-23: stage gap analysis

**Recommendation: revise the existing ticket into the remaining manual-stage integration and usability work, delivered as small reviewed slices.** Do not supersede DYL-24 or reimplement already working controls. Its DYL-18/20/22 blockers stay. Owner authorization of the revised scope is required before implementation.

The original DYL-23 explicitly excluded durable scene saves/migrations; those belonged to later M1.3. Its unfinished message-scoped controls are not permission to add persistent history. The broader frozen Gate A in M1_PLAN contains the restore/branch/writer requirements that need the separate owner decision in §7.

| Requirement | Current result / evidence | Remaining acceptance |
| --- | --- | --- |
| One background, ≤3 visible sprites | PASS in reducer/stage, T/S/C | Regression only |
| Larger logical cast | PASS in reducer/T browser; project schema allows 20 actors | Actual persistent group conversation unsupported; no full DYL-23 group acceptance |
| Stable positions / explicit swap/replace | PASS: reducer `SLOT_OCCUPIED`/swap/replace tests and T browser; S/C restored left/right slots | Integrated group and narrow layout verification |
| Presence/absence and offstage | PASS: reducer/T and saved project scene roundtrip | No implicit eviction or automatic speaker staging |
| Outfits | PARTIAL: T fixture compatibility, project single sprite per actor persists | Reusable user alternatives after reload depend on DYL-22 |
| Message-scoped expressions | PARTIAL: T source/swipe-scoped controls work; project `apply` refuses expressions and UI hides them | Need separately approved **memory-only overlay** using current validated source authority while a project is attached; never serialize it into global state or flatten it into outfit |
| Locks and deliberate override/release | PASS for reducer/T/S/C including locked neutral background | Project-global labels must distinguish session-forward source scope; no automatic producer tested |
| Source-safe navigation / historical corrections | PARTIAL: source/transient prefix reconciliation invalidates suffix, stale hashing/image regressions, T; reader keeps pinned cursor | Project uses synthetic `project-global:` anchor and constant history, displaying one layout on every message. No historical project scene reconstruction; any new transient overlay must invalidate safely on edit/swipe/delete/continue |
| Missing/incompatible art | PASS bounded fallback in T/S/C | Retest real labeled library and overlays |
| Duplicate names / unresolved speakers | PASS for distinct manual actor keys, host author text/no guessed focus; reducer/T synthetic cases | Actual four-member native group with duplicate names and persistent project remains NOT_TESTED/unsupported today; no automatic card mapping or spotlight exists |
| A → B → A / delayed work | PASS: session reset, project detachment, old receipts rejected; S/P/C | User must explicitly reopen each time; no ownership transfer |
| Stream, stop, continue | PASS bounded reader/T/S/P/C deterministic native generation path | No real-model quality claim; overlay regressions needed |
| Native composer/draft / safe formatting/backlog | PASS bounded real entry and pinned host; tests keep native node, draft/caret, IME exclusion | Broad themes/extension combinations and full canonical inventory remain untested |
| Reload/reopen | PASS global project layout/UUIDs/locks, detached reload, explicit open; S/P/R/C | Session art/expressions/history clear. Project layout persistence does not satisfy source-history restore |
| Desktop / narrow layout | PARTIAL: T screenshots/CSS and browser reduced-height checks; project UI functional on desktop | Expanded long library/cleanup/project panel, keyboard/zoom and group layout need integrated candidate evidence |
| Touch / keyboard usability | PARTIAL: semantic controls, local Escape, no global typing interception, target styles and synthetic tests | Physical touch/virtual keyboard/IME and accessibility review NOT_TESTED; no viewport screenshot can close this |

Practical sequence within revised DYL-23: (1) replace confusing session/project language and make attachment/save/discard/reopen status readable with the DYL-22 library; (2) finish approved source-specific transient expressions/history correction while attached and explicit manual group use with no native identity claim; (3) finish desktop/narrow/touch/keyboard control behavior and failure recovery. Each slice needs its own bounded PR/evidence before the next, reusing existing reducer/renderers. Group and overlay changes are proposals, not newly authorized runtime work. Durable source history, card binding, single-writer service, director and providers remain excluded.

## 6. M1.2 technical readiness and exact current workflow

| Layer / original acceptance | Assessment | Consequence |
| --- | --- | --- |
| Complete text reader/native composer | PASS within retained host/entry evidence | Already usable; no storage prerequisite |
| DYL-24 session-only visuals | PASS within T limits | Supported fallback; disappear on reload/new activation |
| Persistent project-global layout | PASS within S/P/R/C limits | Saved actors/presence/slots/background/sprites/locks survive explicit reopen |
| Reusable raster library | PARTIAL | DYL-22 remaining labels/catalog/compatibility; JPEG/WebP unresolved |
| Full manual-stage controls | PARTIAL | DYL-23 group, attached transient expression integration and usability gaps |
| Persistent per-message scene history | UNSUPPORTED in v1 | Not satisfied by project save; M1.3 remains unauthorized |
| Native chat/card correspondence / automatic restore | UNSUPPORTED in v1 | Explicit page-local selection only; DYL-56 not authorized |
| Single-writer/read-only other tabs | PARTIAL against original Gate A wording | Project CAS rejects concurrent stale commits; it is not a writer lease or read-only second tab. Owner must amend gate or commission that separate feature |
| Full Gate A / production readiness | BLOCKED by scope decisions and remaining features/evidence | No milestone acceptance or owner session inferred |

The currently demonstrated workflow is limited to a **single-character native conversation**, signed-in account with CSRF, compatible optional plugin/runtime, and available crypto APIs (secure context for visuals).

| Step | Current behavior | Actual pinned-host evidence |
| --- | --- | --- |
| 1. Open a SillyTavern conversation | Native host owns the conversation | S/P/C synthetic native fixtures |
| 2. Enable SillyNovel | Existing enabled setting; complete reader and native composer | T/S/P/C |
| 3. Create or explicitly open a project | Project name/UUID; no implicit association | S/P/C |
| 4. Import art | Persistent static PNG; background/two sprites | S/P/C; JPEG/WebP persistent path UNSUPPORTED |
| 5. Arrange actors/background | Register manual project actors, set presence/slots/outfits/locks | S/C; historical per-message project arrangement UNSUPPORTED |
| 6. Save | Captured global snapshot/CAS; visible dirty/conflict status | S/C; failed updates preserve prior state |
| 7. Reload | Saved DB survives; visual project starts detached | S/P/C |
| 8. Explicitly reopen | Selected global layout/art/UUIDs/locks restored | S/P/C; R after empty-slot restore |
| 9. Continue reading/replying | Native navigation, draft/send/stream/stop remain | S/P/C deterministic loopback host; no real-provider test |
| 10. Switch conversations | Attachment invalidated; A → B → A needs explicit reopen | S/P/C, including delayed responses |

These are retained exact-candidate host results, not an owner run or a fresh reviewed-main smoke. Groups, physical mobile/touch, persistent expressions and scene history are not demonstrated by this workflow. Without the plugin, native reading/replying and DYL-24 memory-only art remain available; accounts-disabled/CSRF-disabled persistence refuses. Without crypto capabilities, the text reader remains available.

**Overall M1.2: REVISE**, not STOP. The next work should deliver library/stage UX using the working store. More generic storage investigation is not the prerequisite. The smallest complete path to an owner candidate is revised DYL-22 → revised DYL-23 → DYL-60, plus the explicit Gate A choices below. A feedback-only trial of today's limited project workflow could be separately approved, but cannot pass the original full gate.

## 7. Proposed Gate A checklist — NOT_RUN

This checklist is preparation only. No session is scheduled or executed. Freeze one full candidate after DYL-60, and obtain separate approval before the owner playtest. Keep the original roughly 20-turn individual session, short group session, imported assets and owner questions visible.

| Exercise | Proposed acceptance and evidence | Gap today |
| --- | --- | --- |
| Reader usability | Full long/formatted text, copy/select, pinned navigation during new replies, backlog, obvious exit; owner can read/reply without repairing UI | Owner verdict absent |
| Manual stage / readability | One background/two sprites, larger manual cast, stable ≤3 slots, explicit swap/replace, presence/outfit/expression, lock/release, readable text independent of art | User library and attached expressions incomplete |
| Group and ambiguous authors | Short four-member native group with two same-name cards; manual assignments remain distinct, no guessed focus, offstage labels | Persistent project groups unsupported; integrated evidence absent |
| Visual persistence | Save selected global layout, reload detached, explicitly reopen same project; compare art/actors/slots/locks | PASS technical global workflow, but owner expectations untested |
| Expected reload/history | Explain global layout versus temporary message overlay. Reopening an old message must not claim restored historical visuals | Original matching-history/branch-restore wording incompatible with v1; owner decision required |
| Interaction/source safety | Stop/continue, swipe/edit/delete, older-message correction, A → B → A, delayed reads/assets/saves; failed visuals leave native chat usable | Transient overlay integration and current frozen run needed |
| Native integrity | Exact draft/composer behavior preserved across toggles/backlog/errors; compare named synthetic cards/chats/lore/personas/settings appropriate to workflow | Old inventories do not cover all canonical surfaces |
| User control / error recovery | Dirty/save/conflict, explicit discard/open/detach, missing art/import refusal, cleanup cancellation and uncertain receipt; no silent retry or ownership change | Clarity requires owner evaluation; no in-app undo |
| Storage/plugin absent | Graceful signed-in/CSRF/crypto/plugin capability messages and usable text/session fallback | Existing technical evidence, full candidate preflight needed |
| Desktop and touch/narrow | Identified desktop plus physical touch/virtual keyboard; zoom/text size/reduced motion/focus/labels; reply controls visible | Emulated viewport evidence only for touch/keyboard |
| Explicit attachment limitation | User can identify attached project/UUID, saved versus selected entry, global scope and detached reload/chat switch; no native automatic correspondence | Attachment language needs practical review |
| Multiple clients | Demonstrate stale CAS conflict without overwritten saved state, lost-response uncertainty, unsaved-other-tab cleanup warning | Original read-only/single-writer expectation is not implemented |

**Owner decision required:** preserve the original gate (then matching persistent history, branch correspondence and read-only single-writer behavior remain blockers requiring separately authorized work), or explicitly amend persistence acceptance to saved independent **global** layouts with explicit reopen, temporary source overlays and CAS conflict refusal. Recommended amendment does **not** waive reader safety, group exercise, source-safe transient correction, touch/device checks or the human verdict. If the owner wants a single-character-only preliminary trial, label it feedback and leave full Gate A NOT_RUN. Record any approved wording/date separately; this document does not change DYL-16's historical approvals.

## 8. Remaining release hardening, classified by the milestone it blocks

These concerns are tracked in DYL-61. “Public beta” means before advertising/installing a supported beta, not permission to release. A platform may remain excluded if explicitly documented; testing one runtime never establishes another. No item below automatically blocks the next PNG-library prototype on the existing disposable pin.

| Concern | Current class | First blocked milestone / required action |
| --- | --- | --- |
| Node 22.13 advertised plugin floor; recovery API | NOT_TESTED | **Public beta:** verify plugin and CLI separately at advertised floor, or accurately raise/narrow support; current Node 26.8.1 disposable work can proceed |
| Other OS/filesystems | NOT_TESTED; recovery currently POSIX-only | **Public beta on each advertised target:** permissions/hardlink/fsync/path/journal tests; other targets may remain excluded |
| SillyTavern version compatibility | NOT_TESTED beyond exact 1.19.0 pin | **Public beta:** define supported versions and loader/auth/lifecycle matrix, graceful refusal on unsupported versions |
| Plugin packaging/installation/uninstall UX | PARTIAL: disposable copied clean install exercised | **Public beta:** fresh user-facing package/dependency/enablement/recovery instructions and failure/fallback test; no automatic install |
| Accounts-disabled mode | UNSUPPORTED by design | **Public beta decision:** explicitly exclude, or authorize stable incarnation design/tests; not required for signed-in disposable owner candidate |
| Account recreation / recovery | PARTIAL: mismatch safely refuses; no repair | **Public beta:** document limitation and bundle-copy option. **Production release:** supported lifecycle/recovery policy and drills; no automatic reassignment |
| Real schema-version migration | NOT_TESTED, no v2 | **Next implementation if it changes schema:** reviewed explicit transition + preserved backup/rollback/format checks. **Public beta/production:** evidence for every actual supported transition, never fabricate a version solely to claim a pass |
| Actual disk-full | NOT_TESTED | **Production release:** ENOSPC at backup/import/save/delete/publication with source/destination inspection; public beta must disclose risk |
| Power loss/fsync hardware failure | NOT_TESTED | **Production release:** defined supported filesystem/durability expectations and recovery campaign; SIGKILL is insufficient |
| SQLite resource/capacity budgets | PARTIAL: bounded operations, representative recovery measurements | **Public beta:** measured memory/latency/capacity and denial-of-service policy on intended host; production budgets justified |
| Synchronous PNG decode latency | PARTIAL: upload/cleanup decode under server/write reservation | **Public beta:** worst allowed inventory/pixels and native-chat responsiveness; bounded worker/time/limits decision if needed |
| Cross-tab unsaved drafts | UNSUPPORTED enumeration; warning/CAS/missing-reference recovery implemented | **Owner playtest:** comprehensible warning/recovery and decision on original writer gate. **Public beta:** documented editing policy; no claim of collaboration |
| Backup/retention usability | PARTIAL: verified CLI, private operator responsibility | **Public beta:** private dated retention, space planning, inspection/recovery instructions and drills; no promise portable bundle recovers unused art |
| Production security review | NOT_TESTED as comprehensive review | **Public beta:** authenticated/CSRF/unsandboxed plugin, paths, untrusted data, quotas/rates, dependency and installation review; host admin outside isolation boundary |
| Physical-device/touch/virtual keyboard | NOT_TESTED | **Owner playtest** for original full Gate A and **public beta** on advertised devices; no physical evidence from screenshots |
| License/demo asset rights | BLOCKED by owner choice | **Public beta:** license and public-safe fixture/import rights; no private art/chats committed |

Recovery measurements reached ~398 MiB high-water RSS for a 16M-pixel fixture, including fixture/process allocations; bundle near-max case reached ~318 MiB. Neither is a universal budget. Cleanup logical quota recovery is demonstrated; immediate filesystem shrinking is deliberately unsupported. Native-group/manual-control gaps block the intended full owner playtest, not storage acceptance. M1.3 source persistence and M2 remain unauthorized regardless of hardening progress.

## 9. Revised tickets and dependency-ordered delivery

Recommended scopes are **PROPOSED**, not owner decisions. Original DYL-22/23 descriptions/history are retained. No new asset-library or stage ticket is needed because they already own those requirements. Two genuinely missing planning tickets were created only after duplicate search.

| Order / ticket | Scope and exclusions | Dependencies / owner choices | Acceptance and required evidence | Milestone |
| --- | --- | --- | --- | --- |
| 0. DYL-55 owner disposition | Accept bounded completed storage or name required corrections; no release or broad recovery guarantee | Owner A below; existing DYL-54 relation retained | Review this matrix, child contracts and retained exact evidence; parent stays unfinished until explicit acceptance | Experimental storage checkpoint |
| 1. **DYL-22 revised** | First PNG library labels/kinds/list/reselect after reopen; immutable revisions/compatible actor/outfit metadata; then remaining expression catalog. No card binder, generation, packs, batch editor or hidden local DB | DYL-21 blocker stays; owner B/D and any schema/format transition scope approved before work. Existing DYL-50–59 reused | Actual-entry select two alternative PNGs per actor/background, save/reload/reselect, duplicate labels, incompatible choices, missing/corrupt art; owned list/read/cleanup, rollback/CAS, backup/portable compatibility; two-account pinned-host and named canonical hashes. Any metadata migration keeps old usable data | M1.2; **one preferred next implementation**, first vertical slice only |
| 2. **DYL-23 revised** | Finish stage/attachment language, attached memory-only source expressions/corrections, explicit manual group use and responsive/keyboard/touch controls. Reuse current layout/reducer. No persisted message history, native identity, hints, director or replacement composer | DYL-18/20/22 blockers stay; owner C/E/F, explicit authorization of overlay/group scope; completed library first | Four logical actors/two same-name labels/≤3 slots; source/swipe/old-edit invalidation, A→B→A/delayed work, missing art, stream/stop, exact draft/composer; saved-global versus transient overlays; desktop/narrow/physical-device evidence. Split into bounded PRs as described in §5 | M1.2; responsive finish supports M1.4 |
| 3. **[DYL-60](https://linear.app/devils17/issue/DYL-60)** new, Backlog | Freeze/test repeatable disposable owner candidate and evidence checklist; no feature implementation or owner session | Actual blocker DYL-23; DYL-22 transitive; owner-approved gate wording, device availability | One frozen full SHA/pins/assets/config; applicable regressions and real-host campaign; screenshots/failures/NOT_TESTED; complete native/source/attachment/error/device checklist; owner reviews readiness | Existing M1.4 |
| 4. Owner Gate A, no duplicate ticket yet | Separately approved roughly 20-turn individual + short group session, owner feedback and verdict | DYL-60 reviewed and separate owner approval; never schedule automatically | Exact verdict/date/SHA and observations, no agent PASS. REVISE produces bounded reader fixes; PASS does not authorize M2 | Existing M1.4 |
| Separate. **[DYL-61](https://linear.app/devils17/issue/DYL-61)** new, Backlog | Track §8 beta/production concerns and split only chosen failing release requirements. No generic new storage platform or automatic release | Related DYL-55/58/59/60; no blocker on functional M1.2. Owner chooses support/runtime/account/limits/retention/license | Dated compatibility/fault/resource/security/installation/retention/device matrix with raw evidence; exact real migrations when introduced, preserve source data. Untested targets explicitly excluded | Public beta then production; no invented Linear milestone or M1.3 assignment |

No remembered association ticket was added: DYL-56 already exists and remains Backlog/unauthorized. No format-expansion duplicate was created: it remains explicit unmet DYL-22 acceptance. No durable-history ticket is started: original M1.3 remains gated. The proposed order is functional completeness first, frozen candidate second, separately approved owner playtest third; release-hardening decisions run separately when actually needed.

## 10. Validation and handoff

Documentation-only review. Commands/checks executed and their outcomes are recorded in [TESTING](TESTING.md#m12-completion-and-readiness-review--2026-10-15). GitHub PR merge/state reads and Linear status/dependency/search reads were performed live. Reviewed source/evidence fingerprints, local Markdown links/anchors, heading/table/fence structure, JSON examples, consistent current-versus-historical status and `git diff --check` are checked before push. No runtime, browser, host, provider or device test is rerun or newly claimed. The new PR must remain OPEN/UNMERGED, with auto-merge disabled; final pushed SHA/URL are recorded in its handoff rather than circularly inside its own commit.

## 11. Owner decision package

All rows below are **recommendations awaiting the owner**. Their alternatives remain available; no checkbox or tracker update constitutes approval.

| Decision | Recommended default and supporting evidence | Alternative / what approval would not authorize |
| --- | --- | --- |
| **A. DYL-55 completion** | Accept the bounded experimental technical scope; S/P/R/C and source/rollback/identity/backup/quota checks satisfy the reviewed contracts | Request named corrections/evidence, giving REVISE for those requirements. Acceptance would not certify production, universal export, actual schema migrations, account repair, live restore or Gate A; closure still needs explicit instruction |
| **B. DYL-22 disposition** | **Revise**, preserve original acceptance and DYL-21 blocker; credit DYL-50–59, then finish reusable project PNG catalog/labels/compatibility | Split smaller residual tickets if first slice cannot stay bounded; supersede only with an explicit old→new requirement map. Keeping legacy native-card prerequisite requires separate identity work. No unblock/closure/runtime start is authorized by this review |
| **C. DYL-23 disposition** | **Revise**, credit DYL-24/53, finish attached temporary source controls, manual group and usable layouts in small slices | Split residual UI slices under the existing record; retaining old card/storage prerequisites leaves it blocked. Original DYL-23 excluded durable saves. No automatic DYL-22/23 blocker removal or M1.3 authorization |
| **D. First-release asset formats** | Keep **persistent PNG-only temporarily for the next disposable playtest candidate**; decode/store/roundtrip/recovery evidence exists. Retain JPEG/static WebP as unmet original acceptance and decide beta format claim before release | Expand JPEG/static WebP before playtesting, with decoded-content/animation/memory/portability tests. PNG-only deferral must be explicit; no permanent deletion of format requirements or public-release approval |
| **E. Attachment UX** | Keep explicit create/open/use, detached reload and chat switching; S/P/C prove this model and native identity limits remain | Separately review DYL-56 hints requiring confirmation. No automatic attachment, native metadata writes or authorization of DYL-56 follows |
| **F. Gate A scope** | Explicitly amend only persistence/writer expectations to global project saves + explicit reopen, temporary message overlays and CAS conflict refusal. Preserve group, touch, native safety, reader feel and owner verdict | Preserve original wording: persistent source-history/branch correspondence and read-only single-writer remain unsatisfied, requiring separately approved work. No silent waiver, Gate A change, owner playtest or schedule occurs in this review |
| **G. Next implementation** | Authorize **DYL-22's first revised PNG-library slice: labeled/kinded alternatives that can be listed and reselected after reopen**, with safe version/backup/format compatibility if metadata changes. Source shows only selected scene assets reconstructed today; this is the smallest concrete usability gap | Choose format expansion first if essential, or request checkpoint corrections. Approval must name the bounded revised scope; it would not start the rest of DYL-22, DYL-23, M1.3, M2, installation or release automatically |

Until those decisions: DYL-55 unfinished; DYL-22/23 Backlog/functionally blocked with original blockers; DYL-24 supported; DYL-56 Backlog; Gate A NOT_RUN; M1.3/M2 and production/live installation unauthorized; upstream ON HOLD/NOT_SUBMITTED. Stop after this documentation/Linear review and open documentation PR for owner approval.
