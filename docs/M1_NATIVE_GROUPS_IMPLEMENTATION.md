> PR #32 senior review requested a targeted eventless generation-start correction. [Current correction, exact candidate and fresh evidence](M1_NATIVE_GROUPS_REVIEW.md). The original implementation record below remains historical.

# DYL-23-C implementation and verification

**GO for bounded senior review.** [DYL-63 / DYL-23-C](https://linear.app/devils17/issue/DYL-63/dyl-23-c-native-group-conversation-integration) delivers [manual independent-project use in native groups](M1_NATIVE_GROUPS.md). No merge/auto-merge, release, DYL-60 execution or owner gate is authorized. DYL-23 Done/history/original acceptance, DYL-55 and DYL-62 statuses are preserved. Decision F undecided; Gate A NOT_RUN.

## Candidate and changes

Clean supplied checkout: `334023a87a4bdc02bb70aaba65651e664e2b773a`. Starting fetched main / verified PR #31 merge: **`5a9b87f14d5a008e9801aa2260efe40d9e22f5b7`**, merged 2026-10-16 17:28:27 UTC, containing that reviewed head. GitHub authenticated PR metadata and fetched Git parentage both confirm MERGED. Focused branch: `codex/dyl23-c-native-groups`.

Frozen tested implementation/runner: **`0f736dbacd5f4959fd4200783447c85b0550805b`**. Later changes are documentation/evidence only. [60 input hashes](evidence/native-groups/proof-hashes.json) cover runtime, source/reducer/project/expression tests, storage modules/tests/package/lock, browser fixture, host runner, deterministic provider and synthetic artwork. The final pushed head and draft PR URL are recorded in the PR, Linear handoff and chat, avoiding a self-referential commit field.

Changes:

- `src/host-adapter.mjs`: validate unique native group record/current chat agreement; transient group-instance evidence; ignore drafted group `characterId`; refresh changed ownership on every native observation. Shared project-conversation predicate refuses invalid contexts.
- `src/reader-source-model.mjs`: group instance/verification enter the existing owner key/epoch boundary. Canonical text, formatting and source-order logic are unchanged.
- `src/project-expressions.mjs`: reuse the shared conversation predicate to admit verified group scope. Journal/prefix/cache/generation rules are unchanged.
- `src/stage-view.mjs`: explicit group project opening with fresh completion-time ownership checks; native group/speaker/manual-binding notice; clear expression markers when an empty slot loses its image. `style.css` bounds the notice while retaining the complete ordinary narrow notice.
- `tests/m0.test.mjs`, `tests/m1-project-expressions.test.mjs`, `tests/m1-reader-browser.test.mjs`: group authority, larger duplicate-name cast, source invalidation, asynchronous boundaries, source-order/performance and eventless lifecycle coverage; existing assertions retained. Existing identity-shape assertion now additionally requires the new unresolved group fields.
- `tests/probes/native-groups/host.mjs` and the conditional `SN_GROUP_RUN` hook in `tests/probes/project-portability/host.mjs`: actual native host acceptance, reusing existing account/server/provider/portable/failure infrastructure. Group fixture data uses the recovery tool's existing private-directory requirement.
- README, architecture/state/status/decisions/roadmap/testing and prior expression/manual-stage/reader contracts link the current group contract while preserving historical scope. New contract/report and evidence are under `docs/M1_NATIVE_GROUPS*` / `docs/evidence/native-groups/`.

These are bounded engineering choices for review, not invented owner rulings. No schema, plugin, asset-storage, reducer, source-prefix, provider, bundle-format, dependency or host-source change. No native speaker/card→manual actor binding, guessed spotlight or automatic stage action. WeakMap group keys are activation evidence only, with the documented unobservable-lifecycle ceiling.

## Validation

Final results: **149/149 Node**, **80/80 actual-entry Chromium**, **126/126 storage**, **22/22 disposable actual-host checkpoint groups**. No failures, skips or cancellations in those final suites. Totals measure tests/checkpoint groups, not individual gestures or owner acceptance.

Node and Chromium verify the final runtime/test input bytes. The last commit changes only host screenshot framing/timing; the host campaign reruns on that exact commit. Storage completed during final validation; every storage/runtime/package/test input is byte-identical at the frozen candidate (later corrections changed only group-host provisioning, CSS and screenshot/browser assertions). No inherited storage result is substituted for this fresh run.

| Campaign | Retained evidence |
| --- | --- |
| M0/source/prefix/reducer/project/expression + DYL-19 helpers | [Node log](evidence/native-groups/node-tests.txt) |
| Complete actual-entry Chromium suite | [Browser log](evidence/native-groups/browser-tests.txt) |
| Store/PNG/catalog/bundle/recovery/migration/cleanup | [Storage log](evidence/native-groups/storage-tests.txt) |
| Actual native group campaign plus inherited portability/persistence/failure/restart checks | [Run log](evidence/native-groups/host-run.txt), [structured host record](evidence/native-groups/host.json) |
| Pins, frozen inputs, file maps, screenshots and links | [Pinned host source hashes](evidence/native-groups/host-source.json), [validator](evidence/native-groups/validate.py), [validation log](evidence/native-groups/validation.txt) |

Environment: pristine **SillyTavern 1.19.0**, **`7e8663cd9c184a550b37238218bdd32c6efc68e9`**; Node **v26.8.1**, SQLite **3.53.4**, Linux; headless Chromium **151.0.7922.34**; synthetic authenticated accounts; deterministic OpenAI-compatible loopback provider at `127.0.0.1:8128`. Host/data roots and browser contexts are disposable, with no live installation/private cards/chats/real provider. The runner records its owned root and closes its browser, child host and provider. Data/evidence roots are retained for review, not reused as live installations. No hosted CI claim; repository workflows query returned zero.

Exact commands run from `/home/dq/Projects/SillyNovel`:

```sh
git status --short
git rev-parse HEAD
git fetch origin main
git rev-parse origin/main
gh pr view 31 --repo Sonoran-Solutions/SillyNovel --json number,state,mergedAt,mergeCommit,headRefOid,url,baseRefName
git switch -c codex/dyl23-c-native-groups origin/main
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/m1-project-expressions.test.mjs tests/probes/dyl19/*.test.mjs > docs/evidence/native-groups/node-tests.txt 2>&1
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl22 timeout 300s node --test --test-isolation=none tests/m1-reader-browser.test.mjs > docs/evidence/native-groups/browser-tests.txt 2>&1
timeout 600s node --test --test-isolation=none plugins/sillynovel-storage/test/*.test.mjs > docs/evidence/native-groups/storage-tests.txt 2>&1
SN_GROUP_RUN=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs timeout 600s node tests/probes/project-portability/host.mjs /tmp/SillyTavern-dyl22 > docs/evidence/native-groups/host-run.txt 2>&1
python3 docs/evidence/native-groups/validate.py
git diff --check
```

Syntax checks were also run for changed production modules, tests and runners. Chromium/host runs require loopback/browser access outside the execution network sandbox; Git operations require repository-metadata write permission. The pinned host's relevant files were compared byte-for-byte to Git HEAD. No experimental DYL-42–48 native writer/lifecycle patches are applied.

## Actual native group and persistence evidence

The runner creates four actual character-card records using authenticated **`POST /api/characters/create`**, names **Mira, Mira, Rowan, Sage**, distinct descriptions and first greetings. The two Mira cards deliberately have identical greeting text. The host returns distinct avatar/card filenames; actual IDs, exact native greeting fields and named card SHA-256 values are retained in `host.json`. Two real group records are created with **`POST /api/groups/create`**, containing those four locators. Activation clicks **`#rm_print_characters_block .group_select[data-grid]`** in the actual host character/group drawer. Native `getGroupChat` creates/persists greetings. This is neither a fabricated `scope: group` object nor a patched host.

An existing account-owned saved project is explicitly selected/opened in group A. Actual stage controls register four manual UUIDs (two named Mira), import/select sprites/background/coat, arrange three stable slots and retain Sage offstage. Occupied move refusal, swap/replace, absence/presence, manual locks/release and save are exercised. Native member Move up changes native order while manual actor selection/layout remains unchanged. Native author labels do not identify either manual Mira.

Temporary actor/outfit-compatible PNG choices are applied to separate equal-text/equal-label native sources, revisited and cleared. Historical clear intentionally invalidates later decisions. Expression-only state remains clean. Native edit invalidates its dependent overlay while an earlier prefix survives. Actual user Send/group reply, swipe/regeneration, Continue and Stop operate with the attachment intact across drafted member IDs. Copy matches exact canonical head text; Backlog and native composer/draft/focus survive. Instrumented image failure and corrupt PNG input retain base art/readability. Successful completion remains unresolved; Stop is not relabeled complete.

The structured record contains **41/41 identical named native file hashes** before/after visual-only operations, including native group JSON, group JSONL, cards, other native chats and fixtures. The outgoing save body and committed SQLite project row contain global scene/catalog only; saved actor UUIDs/slots/outfits/locks/catalog match. Portable bundle remains v1/selected-art-only without catalog or temporary source state. An actual online schema-v2 full-store backup validates SQLite integrity, all stored scenes/assets and excludes the in-memory overlay by construction; standalone backup inspection reports account binding **UNVERIFIED**, not a new group restore/account-binding certification. Existing account isolation/recovery tests remain independently passing.

Intentional native edits/generation/member reorder/new-chat/delete/recreate have separate before/after inventories. Card hashes remain identical even after these operations. Native member reorder deliberately changes group A metadata; native deletion/recreation deliberately removes/replaces group B and its chat files. These expected native mutations are never counted as visual-only equality. The helper stores canonical greetings before edits and inventories after native operations/lifecycle/deletion so reviewers can distinguish them.

A real authenticated peer causes CAS conflict; a committed response is deliberately lost; local recovery blocks retry and explicitly reopens. A real committed save receipt delayed across group A→B cannot revive attachment or cross epochs. Group A→B→A, group↔individual, another chat in group A (native `createNewGroupChat`/public `openGroupChat`), reload, detach and explicit reopen restore only the saved global scene. Actual native **Delete group** plus confirmation and same-name native recreation produces a fresh group ID and requires explicit reopen without old temporary choices.

## Screenshots and visual inspection

Desktop **1440×1100** and narrow **390×800**; viewport emulation only. Eighteen final screenshots are retained and visually inspected. The narrow cast ledger is scrollable; the complete offstage ledger is visible in desktop evidence and all actors remain available through the narrow selector. Ordinary narrow notice remains readable, artwork yields when controls expand, and dialogue/native composer stay available. Exact UUIDs in screenshots are synthetic project IDs.

| Scenario | Desktop | Narrow |
| --- | --- | --- |
| Four actual native members, duplicate Mira cards | [Native group](evidence/native-groups/group-native-members-desktop.png) | [Native group](evidence/native-groups/group-native-members-narrow.png) |
| Three visible actors, larger offstage cast | [Stage](evidence/native-groups/group-cast-desktop.png), [controls](evidence/native-groups/group-cast-desktop-controls.png) | [Stage](evidence/native-groups/group-cast-narrow.png), [controls](evidence/native-groups/group-cast-narrow-controls.png) |
| Explicit selected temporary expression | [Stage](evidence/native-groups/group-expression-desktop.png), [controls](evidence/native-groups/group-expression-desktop-controls.png) | [Stage](evidence/native-groups/group-expression-narrow.png), [controls](evidence/native-groups/group-expression-narrow-controls.png) |
| Native edit/base fallback | [Stage](evidence/native-groups/group-invalidated-desktop.png), [controls](evidence/native-groups/group-invalidated-desktop-controls.png) | [Stage](evidence/native-groups/group-invalidated-narrow.png), [controls](evidence/native-groups/group-invalidated-narrow-controls.png) |
| Explicit saved-project reopen | [Stage](evidence/native-groups/group-reopened-desktop.png), [controls](evidence/native-groups/group-reopened-desktop-controls.png) | [Stage](evidence/native-groups/group-reopened-narrow.png), [controls](evidence/native-groups/group-reopened-narrow-controls.png) |

## Retained development failures and limits

Development logs/structured records remain under [development](evidence/native-groups/development/):

- Initial Node 123/124: exact identity-shape expectation needed the new unresolved group fields. Old fields/assertions remain; final 149/149.
- Six eventless browser cases found an old expression marker on a hidden cleared sprite. Shared render cleanup now clears it; seven lifecycle/cast cases pass. Separate delayed load/save cases also pass.
- Host run 1: test closure omitted the `joyURL` argument to browser evaluation. Run 2: harness tried to reuse an asset correctly released by historical clear/suffix invalidation; it now explicitly reimports. Run 3: pinned older reader source correctly did not report head streaming; harness follows latest. Run 4: harness compared a blob URL from before explicit reopen; it now captures the current base URL. Run 5 passed 21 checkpoints before the additional backup/deletion checks.
- First frozen host attempt: existing recovery `UNSAFE_PARENT` correctly refused a nonprivate fixture data directory. The group fixture now uses the same `0700` provisioning as existing recovery/library campaigns. The next run passed 22 checkpoints.
- Visual inspection of that passing run found the narrow native/manual-binding notice clipped to one line and premature native-drawer screenshot framing. CSS now retains the full ordinary notice; capture waits/scrolls to actual members. Final host and Chromium verification include these corrections.
- Restricted browser attempt produced no tests and was interrupted; an incomplete redundant development storage run was interrupted during its child-process checkpoint. Neither is counted as PASS. Final complete suites run with appropriate execution access. Native host can log `AbortSignal was fired. Group generation stopped` on intentional Stop; this expected host rejection remains in raw logs.

**NOT_TESTED:** physical touch, IME, virtual keyboard, screen reader/assistive devices; other hosts/browsers; real model/provider or cloud use; production deployment. Eventless replacement/deletion, same-object source reorder/insertion/replacement/deletion, delayed expression decode and no-scroll-hashing are actual-entry synthetic Chromium/Node evidence, not native UI coverage for each operation. Native group deletion/member reorder/new-chat/edit/swipe/Continue/Stop are actual host evidence. Arbitrarily fast unobserved away/back, identical external same-object/same-locator lifecycle and accepted-load provenance remain unprovable through this public context. No durable native association or comprehensive native writer guarantee is claimed.

Persistent per-message history, remembered group association, automatic actor binding/spotlight, single-writer/read-only tabs, original broader Gate A persistence/device requirements and owner experience remain unfinished/excluded. No DYL-60 candidate preparation, production hardening or later milestone begins. Recommendation: **GO for senior review of this bounded draft only**; stop without merging.
