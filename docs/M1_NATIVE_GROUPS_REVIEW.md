# PR #32: preserve generation start on an eventless owner transition

The owner supplied **REVISE — one P2** at reviewed head `daf1abebad890bb780473d011a0d0bc6d0b6aafa`, the clean starting checkout for this correction. PR #32 remains draft/open/unmerged, auto-merge disabled; [DYL-63](https://linear.app/devils17/issue/DYL-63) stays In Review. This assignment authorizes the targeted lifecycle correction and regression verification only. DYL-23/DYL-55/DYL-62 statuses are unchanged; Decision F undecided, Gate A NOT_RUN, DYL-60 unstarted.

## Root cause and correction

The adapter already supplied the new owner and full current history when an ordinary event first revealed an eventless group transition. `reader.apply()` returned immediately from `activate()`, losing a `generationStarted` carried by that same observation. A project explicitly attached in the new epoch consequently saw no tracked generation and could accept a head expression.

Only `src/reader-source-model.mjs` changes runtime behavior. The owner-change branch activates the new session, then lets **only `generationStarted`** continue through the existing generation-start/reconciliation logic. Other owner-transition observations retain activation-only behavior, avoiding new assumptions about old stop/end provenance. Normal starts remain unbound and refuse head expressions; Continue/Swipe bind only the newly activated verified assistant head. Dry runs still create no generation. An unresolved end remains unknown; stable older sources remain usable.

The adapter and expression authority already enforce the needed checks and are unchanged. No new identity system, persistence/schema, source hashing, provider behavior, generation-success inference or broader group redesign. The shared reader function fixes all shell callers once, including real observations and canonical refresh paths. [Group contract](M1_NATIVE_GROUPS.md) and [reader contract](M1_READER_SOURCE.md) describe the corrected boundary.

## Regression proof and candidate

Frozen tested implementation/test candidate: **`11396926c0f0aed0028d5e8a3f320abd3bd486e4`**. Subsequent commits contain documentation/evidence only; final pushed head is recorded in PR/Linear/chat. [60 frozen input hashes](evidence/native-groups/review/proof-hashes.json).

- The existing M0 adapter→shell regression now asserts a tracked streaming generation, real sequence ID/type and unbound normal source after an owner transition first detected by `GENERATION_STARTED`.
- Three project/expression regressions activate a different verified group/chat with a normal/Continue/Swipe start, explicitly attach a new project, and prove head import/clear refusal, current epoch/owner/source, correct generation binding, refusal after unproven end, older-source availability and unchanged project revision/dirty/upload state.
- A reader dry-run regression checks that the new epoch is installed without transferring the old generation or inventing an active one.
- An actual-entry Chromium regression emits `GENERATION_STARTED` as the first changed-owner signal, without `CHAT_CHANGED` or a DOM wake-up; explicitly opens a project; verifies generation feedback, disabled expression/import controls, unresolved-end refusal, stable older-source use and native composer availability.

[Before-fix Node log](evidence/native-groups/review/development/before-fix.txt): four failures, one dry-run pass. The three expression cases directly reproduce incorrectly granted authority. [Before-fix Chromium](evidence/native-groups/review/development/browser-before-fix.txt) reports unknown completion. [Corrected focused Node](evidence/native-groups/review/development/after-fix.txt): 5/5 pass; [focused Chromium](evidence/native-groups/review/development/browser-after-fix.txt): 1/1 pass. The first post-fix browser assertion expected the bound-source word “streaming”; the normal unbound generation correctly uses “A new reply is being generated…”. That harness-label mismatch is [retained](evidence/native-groups/review/development/browser-after-fix-label-mismatch.txt); the assertion now requires the existing precise label. No production workaround was added.

## Full verification

Final results are recorded in the retained logs and validator:

| Suite | Result | Evidence |
| --- | --- | --- |
| Node: M0/source/prefix/reducer/project/expressions and original DYL-19 helpers | 153/153 PASS | [Log](evidence/native-groups/review/node-tests.txt) |
| Complete actual-entry Chromium, including all 80 original cases | 81/81 PASS | [Log](evidence/native-groups/review/browser-tests.txt) |
| Complete storage/library/portability/backup/recovery/migration/cleanup | 126/126 PASS | [Log](evidence/native-groups/review/storage-tests.txt) |
| Disposable native host: all existing four-member group/persistence campaigns | 22/22 PASS | [Run](evidence/native-groups/review/host-run.txt), [record](evidence/native-groups/review/host.json) |

No final failures/skips/cancellations. Pristine SillyTavern **1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9`**, Node **26.8.1**, SQLite **3.53.4**, Chromium **151.0.7922.34**, Linux, deterministic loopback provider and synthetic accounts/cards/art/chats only. No live installation, host patch, real provider or hosted CI. The runner shuts down its owned browser/host/provider; its owned evidence root remains in the record.

The exact eventless-start bug is **Node + actual-entry synthetic Chromium evidence**. The native host campaign is a fresh full regression, not a claim that native UI reproduced an omitted `CHAT_CHANGED`. It again exercises four actual cards/two Mira labels, native activation, three visible/manual offstage cast, expression revisits/edit/swipe/Continue/Stop, member reorder, native group deletion/recreation, explicit reopen, delayed receipts, CAS/lost saves and composer/backlog/copy. **41/41 named native files match** across visual-only work; intentional native mutations remain separate. Committed global rows/save bodies/bundle/backup exclusions remain verified. Eighteen refreshed desktop/narrow screenshots are listed in `host.json`; they reproduce the original visual scenarios and were inspected for regressions.

All **56 original evidence files remain byte-identical**. Original input hashes/logs retain their historical meaning; the new runtime is checked by the [review validator](evidence/native-groups/review/validate.py) and [validation log](evidence/native-groups/review/validation.txt). No old result was relabeled as a new run.

Exact full-suite commands, from `/home/dq/Projects/SillyNovel`:

```sh
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/m1-project-expressions.test.mjs tests/probes/dyl19/*.test.mjs > docs/evidence/native-groups/review/node-tests.txt 2>&1
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl22 timeout 300s node --test --test-isolation=none tests/m1-reader-browser.test.mjs > docs/evidence/native-groups/review/browser-tests.txt 2>&1
timeout 600s node --test --test-isolation=none plugins/sillynovel-storage/test/*.test.mjs > docs/evidence/native-groups/review/storage-tests.txt 2>&1
SN_GROUP_RUN=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs timeout 600s node tests/probes/project-portability/host.mjs /tmp/SillyTavern-dyl22 > docs/evidence/native-groups/review/host-run.txt 2>&1
python3 docs/evidence/native-groups/review/validate.py
git diff --check
```

Focused Node used `--test-name-pattern='eventless group ownership|new-owner generation|owner-transition dry run'` with the three affected Node files; focused Chromium used `--test-name-pattern='eventless group generation start survives'`. Syntax checks covered the changed production/test files. Browser/host execution requires loopback access outside the execution sandbox; no permission/safety rule or test assertion was weakened.

**GO for bounded re-review of the correction**, with no merge/auto-merge or owner gate decision. Physical touch/IME/virtual keyboard/assistive devices, other hosts/browsers and real providers remain NOT_TESTED. Existing public-context/unobserved-lifecycle and standalone backup account-binding limitations are unchanged. No DYL-60, remembered association, automatic speaker binding, persistent message history, storage redesign or later milestone work.
