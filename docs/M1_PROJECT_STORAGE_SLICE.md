# First independent project slice — review candidate

Owner assignment: 2026-10-15, independent projects plus an optional local plugin; planning and first bounded implementation only. Starting fetched main `ca77bbf5e4ee5219e34e873b1680e8d644754149`; PR #22 merged and DYL-48 Done verified. Documentation PR #23 was owner-approved and merged at `97441493dd42343883c5ef3f5ae44ad845e1368a`; DYL-49 is Done. Implementation addresses DYL-50/51/52/53 with DYL-54 validation, on `codex/project-storage-slice`. No merge, live installation, production-release or Gate A approval is inferred.

## Implementation

[Plugin package and install/API contract](../plugins/sillynovel-storage/README.md). SQLite `node:sqlite` with immutable BLOB assets, transactional schema initialization, strict global scene validation and expected-revision CAS. Runtime floor >=22.13; tested Node 26.8.1 only, whose SQLite API is release candidate rather than stable. `pngjs` 7.0.0 is the only new dependency and is pure JavaScript. Host minimum Node 20 does not satisfy this optional package. No native SQLite build dependency.

Pinned host: SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Verified loader exports `info`, `init(router)`, `exit()` and router mount `/api/plugins/sillynovel-storage`. Login/CSRF middleware precedes plugin loading. Own session/token checks additionally refuse anonymous/CSRF-disabled requests. Account ownership is the authenticated `(profile.handle, profile.created)` pair, never request fields. Accounts-disabled mode is unsupported because that host's default creation timestamp changes per process; the UI explains the sign-in prerequisite. This is a bounded engineering choice, not a new owner-approved production policy.

Storage is a private root-level `.sillynovel-projects.sqlite` file outside host account directories and public extension paths. SQL bindings and strict keys prevent client path/ownership selection; no filesystem browser, native write interceptor, host patch, process control or URL-fetch API. Project/asset IDs are random server UUIDs; cast UUIDs are explicit project-scoped UI identities. Referenced asset existence/ownership/hash is checked in the save transaction. Imported bytes survive a later failed save. Full asset registry, removal/export and automatic cleanup are excluded.

The existing scene reducer remains unchanged. A distinct memory-only project-global anchor lets it project manual global controls; this anchor is not a native message identity and never enters persistence. The existing source-aware transient stage remains intact. Project snapshots contain only background, actors, presence, outfit, slot and locks. Expressions are disabled in project mode rather than being silently serialized as message history.

The UI explicitly creates/opens a project for the current single-character chat, displays name/revision/dirty state, saves captured immutable snapshots and detaches. Native chat switches invalidate the attachment before displaying another editable scene. Reload starts detached. Save receipts cannot update a different attachment; edits during an in-flight save remain dirty. Conflicts preserve the unsaved state and require explicit reopen/discard or another deliberate action. Project selection never writes native metadata.

## Verification

The reproducible [host harness](../tests/probes/project-storage/host.mjs) creates its own temporary checkout/data/config, installs the plugin via the official loader, copies the pinned source host's installed dependencies to avoid external WASM-path failures, and uses two synthetic authenticated accounts and headless Chromium. It does not patch host source. The synthetic provider fixture is bound to loopback with the disposable browser origin. Host startup with plugins enabled and disabled, restart and SIGTERM shutdown are exercised. Temporary evidence is retained; only owned child processes are stopped.

Final frozen-head results and exact hashes are recorded in the accompanying evidence files after execution. Commands from the implementation worktree:

```sh
npm ci --prefix plugins/sillynovel-storage --ignore-scripts --no-audit --no-fund
npm test --prefix plugins/sillynovel-storage
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test tests/m1-reader-browser.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/project-storage/host.mjs /tmp/SillyTavern-m12-review
git diff --check
```

Node storage checks cover strict ownership/schema, foreign IDs/assets, CAS, injected transaction rollback, earlier asset preservation, restart/readback, malformed/oversized PNG and unknown schema refusal. Project-scene checks cover global-only serialization/stable actors, edit-during-save dirty state and obsolete receipts. Existing actual-entry browser coverage exercises session fallback and composer/source regressions.

Host checkpoints cover two-user list/read/update/asset refusal, two-client conflict, missing CSRF/anonymous refusal, unsupported MIME/oversized upload, digest readback; create/import background and two sprites/arrange/save/reload/explicit reopen; native A→B→A detachment; injected failed update; missing/corrupt art; delayed successful save after a chat switch; native send/stream/stop/navigation/backlog; restart durability; disabled-plugin session stage/composer.

Canonical non-mutation evidence hashes the exact enumerated synthetic character/card files, JSONL and bundled world files before save/reload/reopen and compares bytes afterward. Those paths/hashes are in the JSON evidence. This does not prove global non-mutation, nor cover all personas, connection profiles or other accounts' files. Project runtime code calls only its own API; native chat calls in the harness create fixtures and later separately test native chatting. No real provider or private data is used.

## Failed validation history

Initial store test had an incorrect relative fixture path (2 failures, corrected). First host run reached the core workflow and restart but its disabled-plugin check incorrectly parsed the expected HTML 404 as JSON. Second run hit a native drawer visibility race; synchronization was corrected. Third run passed persistence failures but could not connect its deterministic provider because that fixture assumed a fixed browser origin; copied host dependencies also remove the host's outside-directory WASM refusal. These were test-harness issues, not successful final checks. A fourth exploratory run passed all eight host checkpoint groups. Final evidence uses a separately committed candidate.

## Review and release boundary

GO means ready for senior review of this bounded slice, never production or owner-experience acceptance. No DYL-22/23 status or blockers change; DYL-24 remains supported, M1.3/M2 unauthorized, Gate A NOT_RUN. DYL-55 export/import/backup and DYL-56 remembered hints remain separately authorized future work.

Still unsupported: accounts-disabled persistence, other untested Node/host/platform combinations, groups, message cues/history/expressions, JPEG/WebP, duplication, cross-host sync, collaborative merging beyond CAS refusal, image generation and direction. Administrative restore, power loss, account lifecycle recovery, version migrations, global request-rate/resource defenses and full clean dependency installation on other platforms remain release work. The plugin is unsandboxed; a host administrator or another server plugin is outside its security boundary. No upstream contact was made. Smallest next step is senior re-review of implementation PR #24 and the documented runtime/account prerequisites, not starting export or M1.3.

## Frozen evidence — 2026-10-15

**GO for senior review of the first slice.** [Host evidence](evidence/project-storage/host.json) records all eight checkpoint groups PASS on host/browser candidate `fa3ee1a452e6a2aa4eeac66c80508465820299f7`. Chromium `151.0.7922.34`, Node `v26.8.1`, Linux; disposable host source and fixture SHA-256 values are in that JSON. Clean copied plugin installation ran `npm ci --ignore-scripts --no-audit --no-fund` inside the disposable plugin directory. [Restored scene](evidence/project-storage/restored.png) shows the ordinary single-character chat, background and two sprites after explicit reopen.

[Node regressions](evidence/project-storage/node.txt): 67/67; [storage checks](evidence/project-storage/storage.txt): 3/3; [actual-entry Chromium](evidence/project-storage/browser.txt): 24/24. These ran at `96b5144582fbf7b58f301fa3f89ffd0e4f287d1e`; the host candidate changes only its harness to verify a clean copied plugin installation. `git diff 96b5144582fbf7b58f301fa3f89ffd0e4f287d1e -- index.js src plugins` is empty. Later handoff commits add evidence/documentation only. `git diff --check` PASS.

Exact non-mutation scope: 33 files enumerated in `host.json`, under default-user characters, chats and worlds (including bundled public fixtures). File inventories and byte hashes matched across save/reload/explicit reopen; native send testing occurred afterward. No global filesystem, other-account, persona or connection-profile non-mutation claim is made.

Time record: first explicit clock sample 19:29:52 UTC through 19:51:12 UTC = 21 minutes 20 seconds of observed work, plus initial inspection before that sample and final handoff afterward (not separately timed). Main blockers resolved: optional Node floor, default-user incarnation instability, fixture paths/404 parsing/drawer synchronization and fixed-origin provider/dependency-path setup. No owner approval wait or foundational persistence blocker remains for review; production limitations above remain.

## Senior-review corrections — 2026-10-15

Starting implementation head `fd6cab6289779225d03ba0001cae5fff14b4e8b4`. Merged the approved documentation baseline into this branch. PR #24 remains unmerged; DYL-50–54 remain In Review.

Project replacement now disables all visual mutations through both control state and the event-handler gate until loading and asset restoration finish. Failed replacement restores editing of the original project. Native reading/reply controls stay available. Neutral backgrounds restore their explicit lock even without an asset. PNG import holds a separate busy flag through upload and attachment; concurrent edits, registration, saves, imports and project management are refused until it finishes, eliminating the ordinary edit-race orphan path. Failed uploads release the flag without changing the scene.

Upload and layout save remain separate commits: closing/reloading/disabling the extension or switching native chats can still leave an uploaded asset unreferenced, as can discarding an unsaved arrangement. There is no cleanup/deletion API in this slice. Native chat switching must retain its authority to detach; no delayed import can attach into the new chat. This bounded fix does not claim recovery or reclaiming quota after those interruptions. Node 22.13 minimum remains NOT_TESTED; synchronous worst-case PNG decode time/memory remains unmeasured release work.

Added regressions for delayed successful/failed replacement with attempted edits, full locked-neutral scene round-trip, concurrent upload/edit rejection and upload failure recovery. Updated verification results follow after execution; earlier frozen evidence above remains historical.
