# PR #29 migration-policy correction

[Implementation PR #29](https://github.com/Sonoran-Solutions/SillyNovel/pull/29) remains draft/open/unmerged.

Review starting head `0bcf9f8c7fd3edaa428412a7fe91e7570bc936d3`; original frozen code `80c03000b9f9b3a2a5c67e4daa6752d1964ee515`. Original tests, fingerprints, screenshots and 17 host checkpoints under `docs/evidence/project-library/` are preserved as historical evidence.

P2: fixed the policy issue by removing startup migration entirely. `openStore` refuses exact v1 with `MIGRATION_REQUIRED` without changing its bytes. The plugin reports that typed condition; the stage retains native reading/composer/session controls. Existing v2 behavior and the asset-library contract are unchanged.

The existing recovery publication path now supports explicit `migrate V1_BACKUP_DIR NEW_DATA_ROOT/.sillynovel-projects.sqlite`. Input must be a fully validated preserved v1 backup with verified destination account incarnations. Only its private staged copy changes, under a transaction; full schema/catalog/scene/reference/PNG validation follows before exclusive publication into an absent stopped-host slot. Both original v1 store and backup remain unchanged after success. No v2 downgrade, overwrite, inferred destination, automatic activation, HTTP migration, new database framework or dependency. [Operator workflow and rollback limits](M1_PNG_ASSET_LIBRARY.md#explicit-v1--v2-transition).

P3 browser coverage: a focused actual-entry regression edits an inert label, saves it, unregisters another alternative, saves, reloads and explicitly reopens, then selects/saves the surviving sprite. Checks catalog persistence, UUID references, compatibility, slot/locks and native draft. A separate actual-entry test verifies migration-required fallback.

DYL-22 factual handoff, including the original P2 REVISE finding, was published with the owner's explicit approval; the issue is In Review. Original description/unfinished acceptance and blocker relations remain unchanged. DYL-55 tracker reconciliation remains separate; DYL-23 stays gated, Decision F undecided and Gate A NOT_RUN. PR #29 remains draft/open/unmerged, auto-merge disabled.

Final frozen correction code is recorded after the hot-journal compatibility correction below. Later handoff commits contain docs/evidence only. New evidence is stored separately in `docs/evidence/project-library-review/`; the original 16 evidence checksums remain intact. [100 frozen runtime/plugin/test/fixture fingerprints](evidence/project-library-review/proof-hashes.json).

## Exact commands

Run from the repository root; Node v26.8.1 / SQLite 3.53.4 / Linux, Chromium 151.0.7922.34 and disposable SillyTavern 1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`, using the same pinned checkout/tooling as the first campaign.

```sh
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/probes/dyl19/*.test.mjs
node --test --test-isolation=none plugins/sillynovel-storage/test/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl22 node --test --test-isolation=none tests/m1-reader-browser.test.mjs
SN_LIBRARY_RUN=1 SN_MIGRATION_RUN=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/project-portability/host.mjs /tmp/SillyTavern-dyl22
```

The actual commands redirected output to the corresponding new logs. Final results are recorded after all processes exit. Node and Chromium have completed: [85/85 Node](evidence/project-library-review/node-tests.txt), [41/41 Chromium](evidence/project-library-review/browser-tests.txt), no failures/skips/cancellations. [Storage log](evidence/project-library-review/storage-tests.txt) and [host run](evidence/project-library-review/host-run.txt) retain exact output.

Additional checks actually run: `node --check` on plugin `store.mjs`, `database-schema.mjs`, `recovery.mjs`, `index.mjs`, `tools/recovery.mjs`; `src/stage-view.mjs`; `tests/m1-reader-browser.test.mjs`; both changed host runners. `python3 /tmp/dyl22-doc-check.py` checks relative links/anchors, fences and JSON examples. `git diff --check`, frozen-input SHA-256 checks and original evidence-checksum verification are retained in the new validation log.

## Development checks and limits

Targeted migration library checks passed (22 checks); the read-only-v1 startup/CLI check also passed independently. The new browser fixture initially timed out after reload because its synthetic host did not reinstall `getRequestHeaders`; the product code was unchanged by that correction. The focused label/edit/unregister/save/reopen and migration-hold tests then passed 2/2, and all 41 passed on the frozen SHA. A superseded diagnostic browser process was terminated by its exact task-owned command pattern. The retained original 85/119/39/17 campaign is not relabeled as correction evidence.

No live data root, personal chat/account/card or user image was used. Only fresh disposable roots and public synthetic assets. Migration requires deliberate operator backup/provision/activation; source and backup remain intact, but later v2 edits do not flow back to the v1 snapshot. Physical devices/touch, other hosts/runtimes/platforms, power loss and production remain NOT_TESTED/unapproved. PNG-only, portable v1 selected-art-only limits and all other unfinished DYL-22 requirements remain unchanged.


## Frozen real-host evidence

[Structured host evidence](evidence/project-library-review/host.json) reports PASS on the exact frozen correction; 20/20 checkpoint groups. Fresh root `/tmp/sn-portability-host-dwXiVk`. The original library workflow, project/account/CAS/cleanup/bundle/restart/failure checks pass again. The new migration fixture explicitly constructs the actual v1 SQL format in a separate synthetic data root; this is test setup, not an implemented downgrade command.

The updated plugin starts against that v1 store and reports `MIGRATION_REQUIRED`. Reader/native composer/session controls remain available; the database SHA-256 and enumerated native files remain unchanged. The actual operator CLI creates/inspects a preserved v1 backup, migrates it into a newly provisioned stopped target, and leaves the original v1 database plus both backup files unchanged after success. The new host opens **10 original projects / 25 PNG assets** with the same UUIDs, revisions, scene layouts/locks and exact PNG hashes; both authenticated accounts retain isolation. Explicit browser reopen renders the original background/two-sprite layout. All **64 enumerated migration native-file hashes** match; the library subcampaign separately retains its **34-file** matching inventory. No universal filesystem non-mutation claim.

Visually inspected [migration-required reader/composer](evidence/project-library-review/migration-required.png) and [migrated explicit reopen](evidence/project-library-review/migration-reopened.png); repeated [desktop](evidence/project-library-review/library-desktop.png) and [narrow](evidence/project-library-review/library-narrow.png) library screenshots are retained. These are Chromium observations, not physical device evidence.

The only new production behavior is explicit migration safety and its fallback notice. Catalog schema v2, scene/bundle v1, existing ownership, asset protections, byte reuse and library controls retain their prior contract. The old in-place migration is not an approved exception and is no longer called by startup.

### Full-suite compatibility correction

The first correction candidate `f455b74b5101ae41dfebc3165c9e9bc291818f65` passed 85 Node, 41 Chromium and 20 host checkpoints, but storage was 125/126: an extra read-only preflight could not recover an existing **v2 hot rollback journal**. That probe was removed. Startup still refuses v1 schema migration; opening an existing database retains the established SQLite journal-recovery behavior. Healthy v1 byte non-mutation remains explicitly tested. This preserves the inherited interrupted-process regression rather than weakening its assertion. The failed full-suite log is retained separately; new final runs replace no original campaign evidence. A permission-review attempt timed out before execution; the allowed retry succeeded. An initial diagnostic name filter matched zero tests and is not counted as a pass.
