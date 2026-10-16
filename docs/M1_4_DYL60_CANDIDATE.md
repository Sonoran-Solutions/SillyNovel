# DYL-60 frozen technical candidate and evidence

**Technical readiness recommendation: REVISE before full owner-playtest readiness.** The complete pinned desktop/integration campaign passes; physical Galaxy Tab S8-family testing now exposes a keyboard/composer visibility blocker in both orientations; remaining scaling/motion/assistive coverage is separately NOT_TESTED. **GO for senior review of this bounded package only. Gate A remains NOT_RUN.** No owner session was executed or scheduled; no human PASS/REVISE/STOP verdict is supplied.

## Approval and immutable provenance

[All five approved owner rulings, including the full exact F1 amendment](DECISIONS.md#owner-approvals-and-dyl-60-authorization--2026-10-16), dated **2026-10-16 America/Phoenix**, precede technical execution at decision commit `b90020db78db3e5099ecd1e8226747dfadd1236f`. F1 is approved only for the first disposable Gate A playtest: saved global layout/labeled PNG catalog, explicit reopening, temporary source expressions, CAS conflict refusal and uncertain-save recovery. PNG-only deferral, explicit attachment and manual native groups are approved; broader DYL-22/23 criteria remain visible. Existing Galaxy Tab S8 technical access and DYL-60 preparation were separately authorized by the explicit assignment. The unselected F2 alternative remains in [readiness](M1_4_GATE_A_READINESS.md).

| Identity | Full SHA / state |
| --- | --- |
| Supplied clean checkout | `82180bba823f8e71cb3dc4bda9c9016473a220f9` |
| Fetched starting main / verified PR #33 merge | `c835afe6e274be3fab5a2862f517fd8e4bca32ad` |
| **Final frozen tested candidate** | **`6f8252699dae3a92f639f94531bba221d5e1cc02`** |
| Superseded incomplete attempt | `0985ca945617fd48c205d87d447817e8bd64e9c8`, retained separately; no final-result reuse |
| Branch | `codex/dyl60-candidate-preparation` |
| Final evidence head / PR / tracker disposition | Recorded in the draft PR, Linear and final handoff after push; later commits contain documentation/evidence only |

[Freeze record](evidence/dyl60/freeze.json). [Production diff proof](evidence/dyl60/runtime-diff.txt): runtime/plugin files exactly match starting main. Changes are approved decision records, focused test-harness corrections/fixtures and fresh evidence. The corrected cleanup fixture now supplies genuinely unused PNGs and a novel peer upload, sends a v2 stale-draft envelope, and varies quota-image bytes so deduplication cannot bypass the intended test. Storage protections were preserved. The native probe separately exercises active-expression/late-save branching and delayed-image branching, and selects a real synthetic persona before the integrity baseline.

## Exact configuration and hashes

SillyTavern **1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9`**, pristine source, no experimental native patches. **Node v26.8.1; npm 11.19.0; SQLite 3.53.4; Playwright 1.62.1; Chromium 151.0.7922.34 (revision 1234); Linux 7.0.0-38-generic x86_64.** No version substitution. [Machine pins and host/tool/browser/Node hashes](evidence/dyl60/final/pins.json).

Dedicated synthetic accounts `default-user` and `sn-other`; account/CSRF protection enabled; private data roots; optional storage plugin enabled only in disposable copies; auto-update disabled. Default bundled host UI plus SillyNovel, desktop 1440×1100 and narrow 390×800. The deterministic provider binds **127.0.0.1:8128**, model `sn-reader-local`, custom URL `http://127.0.0.1:8128/v1`; the host uses a recorded ephemeral loopback port. No credentials, real-provider request, private chat/card/art or live installation.

[Input manifest](evidence/dyl60/final/inputs.json) covers **109** runtime/plugin/test/runner/fixture files. All eleven approved PNG hashes match the original procedural fixture manifest; oversized.png is rejection-only. Quota PNGs are generated technical stress inputs, not scene artwork. Important hashes:

| Input | SHA-256 |
| --- | --- |
| Plugin index | `94bf1e187424efd07d23dabf22b5bbf03b15e14eecaeee1676952550580e3de3` |
| Plugin lockfile | `00b3a737d5cd0952ceecad4175ad59224a8b44797e3afccf27fc9fad890be9da` |
| Host lockfile | `5ee4095a82d2b326e30290480b33529553cba60d2f418bc086ed3c08d874d888` |
| Story script | `c963b6b077be0ff9772d1240f87be2a8515b334875a9e5f100de3300e19a3008` |

The runner checks input hashes before every step and after completion. Generated provider copies retain the actual rewritten local origin and are captured output artifacts from the tested runs. [Campaign output manifest](evidence/dyl60/final/artifacts.json) covers the files retained at campaign completion; the [package-level manifest](evidence/dyl60/SHA256SUMS.json) also covers subsequent verification records. [Package validator](evidence/dyl60/validation-final.txt) and [documentation checks](evidence/dyl60/documentation-validation.txt) pass. No executable source changed after this final freeze.

## Fresh integrated results

Every row below ran on **6f8252699dae3a92f639f94531bba221d5e1cc02**. Native numbers are checkpoint groups, overlap inherited portability/auth/fallback checks, and must not be summed as independent test counts. Automated rows have zero failures, cancellations and skips. All commands exited 0.

| Campaign | Tests / checkpoint groups | Exit | Seconds | Evidence |
| --- | --- | --- | --- | --- |
| node | 153 | 0 | 1.672 | [raw log](evidence/dyl60/final/node.txt) |
| storage | 126 | 0 | 177.063 | [raw log](evidence/dyl60/final/storage.txt) |
| browser | 81 | 0 | 40.245 | [raw log](evidence/dyl60/final/browser.txt) |
| stage-library-migration | 24 | 0 | 91.22 | [raw log](evidence/dyl60/final/stage-library-migration.txt) |
| expressions | 16 | 0 | 52.985 | [raw log](evidence/dyl60/final/expressions.txt) |
| groups | 22 | 0 | 72.438 | [raw log](evidence/dyl60/final/groups.txt) |
| recovery | 17 | 0 | 42.011 | [raw log](evidence/dyl60/final/recovery.txt) |
| cleanup | 21 | 0 | 64.658 | [raw log](evidence/dyl60/final/cleanup.txt) |
| native-integrity-branches | 18 | 0 | 81.487 | [raw log](evidence/dyl60/final/native-integrity-branches.txt) |

[Exact expanded commands, flags, UTC start/end times, elapsed times, counts, exits and owned roots](evidence/dyl60/final/runs.json). [Unfiltered orchestration log](evidence/dyl60/campaign-final.txt). Individual raw logs and each host's structured evidence/retained host.log are adjacent. No hosted CI or historical PR run is counted as fresh evidence.

Executed orchestration (the Python runner expands the canonical three suites and six separate serial host campaigns):

```sh
env SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl22 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs python3 tests/probes/dyl60/run.py /home/dq/Projects/SillyNovel/docs/evidence/dyl60/final
python3 tests/probes/dyl60/validate.py docs/evidence/dyl60/final
```

Coverage maps to TESTING T01–T14/T19/T22–T23/T27–T30: lifecycle/source/reducer/project/expression identities; full formatted text and navigation; native composer/draft/focus and Send/Stop/Continue/swipe; PNG/catalog/ownership validation; CAS and uncertain receipts; portable bundles, verified backups/restores, explicit preserved-input v1→v2 migration, cleanup rollback/quota; stale hashing/decoding/save/open work and eventless lifecycle changes; plugin absence and failure fallbacks; real four-card duplicate-name groups and stable four-actor/three-slot/offstage staging. T12 persistent historical restore and T14 mandatory writer exclusion are amended only by F1. Physical/assistive and owner acceptance are not supplied by these tests.

## Native integrity and copy/branch evidence

[Expanded native evidence](evidence/dyl60/final/native-integrity-branches/evidence.json), `candidatePreparation`:

- **Visual-only PASS:** **84 named files / 4850155 bytes** have identical existence/path sets, counts, sizes and SHA-256 before/after expression, artwork, save and explicit reopen operations. The comparison includes character cards plus nested native artwork; individual/group chats; group definitions/membership; lore/worlds; the real **User Avatars** directory; persona descriptions and active selection; provider/preset/profile/account settings; account records and host config. The entire settings JSON is compared, with **no allowed field exclusions**. This is the stated scoped native inventory, not every host/cache/dependency file.
- **Actual native save-as/copy PASS:** `default-user/chats/Project A/The Last Lantern.jsonl` and `default-user/chats/Project A/Lantern identical copy.jsonl` have equal bytes/hash but distinct paths. Opening the copy detaches, discards temporary expressions and ignores a held committed parent-save receipt. Global projects remain available only for deliberate reopen. Matching text/names never confer native ownership.
- **Active-expression branch PASS:** the first native `branchChat(2)` runs while an expression is visibly applied and a committed save receipt is held. Activation detaches immediately; releasing the receipt cannot reattach or resurrect choices. Explicit reopen has global layout and no temporary choices.
- **Separate delayed-image branch PASS:** another actual native branch opens the same bounded prefix while prior project image/open work is held. Releasing it cannot retarget the branch. Both branches have different native names. For each branch the exact intentional card field change is `chat`; decoded remaining card metadata, avatar/non-text PNG chunks and other non-chat inventory entries compare equal. Native chat metadata/file changes are intentionally separate from visual-only non-mutation.
- **Native request/persona/connection PASS:** a selected synthetic native persona and loopback backend remain intact. The actual generated request is retained; its non-system messages exactly equal the current canonical prefix plus the explicit test send. It contains the synthetic persona description and expected native username/backend, and excludes namespaced visual fields and every checked actual project/actor/asset/expression ID. Send/Stop chat mutations have separate inventories; other compared native files/settings remain unchanged.

[Four-card group evidence](evidence/dyl60/final/groups/evidence.json) retains distinct native Mira/Mira/Rowan/Sage records, duplicate greetings, four independent actor UUIDs, three visible slots/one offstage, native UI activation/generation/edit/member reorder, temporary expressions, conflict/uncertain recovery, switching/new-chat/deletion/recreation and delayed receipts. Automatic speaker binding/focus is absent. [Individual expression evidence](evidence/dyl60/final/expressions/evidence.json) separately covers historical navigation/invalidation and global-save exclusion. [Recovery](evidence/dyl60/final/recovery/evidence.json), [cleanup](evidence/dyl60/final/cleanup/evidence.json), and [migration/library/stage](evidence/dyl60/final/stage-library-migration/evidence.json) retain committed-state and native-file comparisons. Bounded copied-account restore proof does not certify arbitrary administrative/account-recreation recovery.

Limits remain explicit: native branch/copy evidence is for individual chats; native group branching/copying is NOT_TESTED. Delayed prefix/source work also has synthetic actual-entry coverage, not a durable native accepted-load/incarnation guarantee. A completely unobserved same-object/same-locator switch or external replacement remains outside the proven public-host seam. No persistent message/branch history, native card correspondence or remembered attachment is claimed. F1 preserves source-safety requirements; these are evidence boundaries, not invented ownership guarantees.

## Screenshots and deterministic owner scenario

**65 fresh PNG screenshots**, hashed in the output manifest. Desktop/narrow library/reselection, status and reopen; duplicate-name cast/native members; expressions/invalidation; conflict/uncertainty; migration/recovery and cleanup are retained with their campaign and exact candidate. Representative links:

| Surface | Evidence |
| --- | --- |
| Library / narrow controls | [desktop](evidence/dyl60/final/stage-library-migration/library-desktop.png), [narrow](evidence/dyl60/final/stage-library-migration/library-controls-narrow.png) |
| Conflict / uncertain save | [desktop conflict](evidence/dyl60/final/stage-library-migration/stage-conflict-desktop.png), [narrow uncertain](evidence/dyl60/final/stage-library-migration/stage-uncertain-narrow.png) |
| Native group / temporary expression | [cast](evidence/dyl60/final/groups/group-cast-desktop.png), [narrow expression](evidence/dyl60/final/groups/group-expression-narrow.png) |
| Prepared long story / group | [desktop story](evidence/dyl60/final/native-integrity-branches/lantern-desktop.png), [narrow story](evidence/dyl60/final/native-integrity-branches/lantern-narrow.png), [group](evidence/dyl60/final/native-integrity-branches/lantern-group-desktop.png) |

[The Last Lantern exact script](../tests/fixtures/dyl60-owner-conversation.json): 20 distinct user/reply turns, Mira and Rowan, tavern/forest changes, outfit/presence/expression cues, long formatted field notes, earlier-message navigation and manual correction opportunities; six group messages with four actual native cards and duplicate-name ambiguity. The script is seeded by native APIs and technically loaded/read/copied, not executed as the owner's human session. Cues remain separate from canonical text. Saved prepared two-actor and four-actor layouts are available under the exact IDs in `candidatePreparation.fixture`; **no LLM or provider-framework expansion**. Script/art hashes, setup, compatibility caveats and deliberate reopening instructions are in [reproduction](M1_4_DYL60_REPRODUCTION.md).

## Physical and remaining acceptance

The owner made the established paired tablet accessible and rotated it to portrait. [Physical technical evidence and limitations](evidence/dyl60/device/evidence.json), [actual device/browser facts](evidence/dyl60/device/facts.json), and [exact touch/action transcript](evidence/dyl60/device/actions.jsonl) supersede the earlier [empty discovery inventory](evidence/dyl60/device.txt), which remains historical. **Samsung SM-X800 / Galaxy Tab S8+; Android 16; Brave 1.97.57 / Chromium 155.0.8059.80; Samsung HoneyBoard 5.9.20.90; 1752×2800 physical pixels, density 340, DPR 2.125.** Existing desktop-site user agent, font scale 1.0 and reduced-motion false were unchanged. The pinned desktop Chromium campaign remains separate. All 109 frozen code/test inputs still match.

**DYL60-DEVICE-01 — P1 readiness blocker:** opening the actual Samsung keyboard hides the native composer and Send controls below the visible viewport in both landscape and portrait. Landscape visual viewport height is 316.24 CSS px while composer top/bottom are 611.91/648.41; portrait is 769.88 versus 1105.09/1141.59. Native Back to Chat reproduces the portrait geometry, so extension-only attribution is unproven. Dismissing the keyboard recovers controls. [Landscape keyboard](evidence/dyl60/device/04-ime-native-cropped.png), [portrait keyboard](evidence/dyl60/device/07-ime-portrait-open-native-cropped.png). Crops exclude unrelated browser chrome. No runtime correction was folded into the frozen candidate.

| Scenario | Actual outcome / limit |
| --- | --- |
| Paired access / loopback / secure context | PASS; fresh synthetic data clone, host 8760, provider 8128 host-only, task-owned reverse and CDP forward removed afterward |
| Touch navigation / complete long reply | PASS bounded; Previous/Next/Backlog/reader return; long field notes reached end by five touch scroll gestures; [end capture](evidence/dyl60/device/09-long-end-portrait.png) |
| Actual IME / draft / caret | **FAIL visibility** both orientations; exact `Lantern IME drafta` draft and caret 17/17 survive Previous/Backlog with keyboard dismissed; complex composition/selection gestures untested |
| Native Send / Stop / Continue | PASS bounded with keyboard dismissed; deterministic local streaming/stop/continuation only |
| Save / reload / explicit reopen | PASS bounded: revision 4→5, reload detaches, explicit native chat selection/reopen restores revision 5 |
| Actual group / manual slot refusal and replace | PASS bounded: six native messages, two Miras/four UUIDs/three sprites; occupied move refused, explicit replace preserves all actors; [slot evidence](evidence/dyl60/device/group-slot.json) |
| Group discard/reopen attempt | UNVERIFIED: final cast still showed replacement; retained [capture](evidence/dyl60/device/12-group-after-discard-attempt.png); no recovery-success assertion |
| All scene/library/file-picker/export/cleanup touch actions | PARTIAL; selects used programmatic setup. No full touch-target or hardware digitizer audit claimed |
| Increased scaling / reduced motion / screen reader | NOT_TESTED: actual pinch left scale 1.0; system/browser preferences unchanged; assistive coverage separate |
| Roughly 20-turn individual + short native-group owner experience | NOT_RUN; separately authorized human session and verdict still required |

Touch events ran on the actual Android browser via its existing debugging socket; Android input entered a draft/caret command, and an observed Samsung on-screen A key was tapped. The operator rotated the hardware. Native API chat loading and programmatic select options were setup aids, not proof of touch-select menus. A transient ADB interruption and probe selector/setup failures remain in the evidence; there is no all-green physical campaign claim. [Device input verification](evidence/dyl60/device/input-verification.json), [retained synthetic data](evidence/dyl60/device/retained-device-data.json), [cleanup](evidence/dyl60/device/cleanup-verification.json). The synthetic tab is closed; owned ports/mappings/processes are removed, preferences unchanged, and the fresh root `/tmp/sn-dyl60-device-nn07uqaq` is retained. The earlier 20 roots remain untouched.

Other unsupported/untested surfaces remain DYL-61 future work: advertised Node 22.13 floor, other hosts/OS/browsers/filesystems, public packaging/license/security/resource acceptance, live deployment, account deletion/recreation/repair, real disk-full/power-loss/fsync campaigns and release. Portable v1 still omits catalog labels/unselected alternatives; broader JPEG/WebP/revision/attribution criteria remain deferred, not completed. No real-provider quality or billing claim.

## Failures, retention and stopping point

The incomplete `0985` campaign and every development attempt remain under [development](evidence/dyl60/development/notes.json); they supply no final candidate counts. Corrections addressed test setup/protocol assumptions and strengthened evidence, with no production fix. Original raw logs, files and failed roots were retained. Native Stop emits the host's `AbortSignal was fired. Group generation stopped` page message in the group campaign; it is retained, expected for that deliberate stop, and did not fail assertions or block controls. Final campaign assertion failures/skips: zero.

| Final campaign | Retained owned root (not deleted before review) |
| --- | --- |
| stage-library-migration | `/tmp/sn-portability-host-3Bdjsr` |
| expressions | `/tmp/sn-portability-host-gGEywx` |
| groups | `/tmp/sn-portability-host-EsAmjo` |
| recovery | `/tmp/sn-portability-host-ENhDvx` |
| cleanup | `/tmp/sn-portability-host-mqyvCs` |
| native-integrity-branches | `/tmp/sn-portability-host-ont3YD` |

[Independent setup/reproduction/cleanup](M1_4_DYL60_REPRODUCTION.md). Full synthetic native data, SQLite stores, backup/migration inputs and troubleshooting remain locally in the named roots; selected logs/structured results/screenshots are committed. The retained-root manifest records their non-host output hashes. [Retention and process verification](evidence/dyl60/cleanup-verification.json) confirms 20 preserved roots / 11546 non-host output hashes, no matching task-owned Node processes, and the provider loopback port free. [Retained-root hashes](evidence/dyl60/retained-roots.json). Packaging/orchestration Python: 3.12.3. [Eight-frame representative fresh screenshot review](evidence/dyl60/screenshot-review.json); all 65 PNG files/hashes were checked. No live data was touched. Cleanup after reviewer release must use exact verified paths, never wildcard deletion.

DYL-60 goes **In Review**, never Done before owner acceptance. DYL-62/63 remain In Review despite merged implementations; original DYL-23 blocker and broader DYL-22/23 acceptance remain. DYL-61 remains future hardening. **Next bounded action: senior review of this draft/unmerged package and the concrete keyboard blocker; separately scope the smallest viewport investigation/correction, then repeat mandatory physical/assistive checks on the resulting exact candidate before full readiness.** The human Gate A session/verdict remains separately gated. No merge/auto-merge, owner playtest, M1.3/M2, beta/production or live installation follows automatically.
