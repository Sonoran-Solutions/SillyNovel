# M3.3 completion — implementation record

**PR A merged — 2026-11-08.** [#92](https://github.com/Sonoran-Solutions/SillyNovel/pull/92) merged as `3dff21f` on the owner's word (“Merge, start B”).

**PR B merged — 2026-11-09.** [#93](https://github.com/Sonoran-Solutions/SillyNovel/pull/93) merged as `786b58a` on the owner's word (“Merge, start C”).

**PR C merged — 2026-11-11.** [#94](https://github.com/Sonoran-Solutions/SillyNovel/pull/94) merged as `3cd3056` (frozen runtime `5518a51`, record and evidence `8fdc37f`) on the owner's standing word for this PR (“if it passes merge”), after the Codex terra senior review's third round returned MERGE WITH NITS. Choice 12, the holder-only `imported` rule in the plugin, remains an implementation choice for owner review, not an owner ruling. PR D has not started. Gate C NOT_RUN.

**PR D merged — 2026-11-12.** [#96](https://github.com/Sonoran-Solutions/SillyNovel/pull/96) merged as `cfffa48` (frozen code `69dc4cb`, record and evidence `5ef1b91`) on the owner's word (“Merge 96”), after the Codex terra senior review's sixth round returned MERGE WITH NITS and the nit was fixed. Tests and docs only; PR C's campaign on `5518a51` stands by SHA. Choice 12 and PR D's twelve choices remain implementation choices for owner review, not owner rulings. The frozen Gate C candidate, the owner's Gate C session and verdict, and the PR 90 real-backend run each need their own word. Gate C NOT_RUN.

**PR D candidate — 2026-11-11.** Gate C readiness on the owner's [go-ahead](DECISIONS.md#owner-go-ahead--m33-pr-d-gate-c-readiness--2026-11-11); see [PR D](#pr-d--gate-c-readiness). Tests and docs only. Gate C NOT_RUN.

## PR A — request-module changes and the host image-folder probe

**Candidate, unmerged. Frozen `3827af7`** (the campaign ran on `7660a53`; see choice 8), based on main `f22a7e8` (the [owner rulings J1–J9](DECISIONS.md#owner-rulings-j1j9--m33-completion--2026-11-08) on the [M3.3 plan](M3_3_COMPLETION_PLAN.md)). Tracked by [DYL-215](https://linear.app/devils17/issue/DYL-215/sillynovel-m33-complete-the-first-image-route-for-gate-c-ledger-lease). No plugin, schema or adapter change. Because J8 checks locks before the layout, the reason sentence the existing UI shows for a lock change during a request changes, so this PR is a runtime change under H4 and carries the browser suite and a full campaign rather than Node evidence alone.

### What it adds

| File | Change |
| --- | --- |
| `src/image-request.mjs` | `staleReason` checks `LOCK_CHANGED` before `LAYOUT_CHANGED` (J8). `reviewText` renders an absent value as `null` (J8). `cacheHit({ payloadSha256, seedPolicy, jobs, catalogAssetIds })`: the latest imported job with the same payload identity whose asset is still in the catalog; a random seed policy never hits, since two random-seed reviews share their text but not their wire seed; refused, failed, cancelled, unknown, abandoned, discarded and stale jobs never hit (J3). `LEASE` (heartbeat 30 s, stale after 90 s), `leaseStatus` (`free`, `mine`, `held`, `stale`) and `takeoverSession`, which keeps the id, allowance, count and workflow hash and refuses a free or own lease (J2). `reconcileCandidates({ files, submittedAt, origin })`: host files at or after the submission that pass the result-path rule, sorted by time, malformed entries dropped, never a choice made for the user (J6). Nothing new is imported by the runtime yet; PR C wires these. |
| `src/stage-view.mjs` | The "A request from before is still running" problem line also shows while the pending request is cancelled, by Cancel or by turning the session off, so Submit's wait has a reason until the host call settles or is abandoned (J8). |
| `tests/m3-image-request.test.mjs` | 77 tests (66 before). |
| `tests/m1-reader-browser.test.mjs` | The lock-change test now asserts the lock sentence; new tests for the toggled-session and plain-Cancel reasons (126 browser tests). |
| `tests/probes/m3-image-folder/host.mjs`, `README.md` | A test-only measurement on the disposable pinned host of the host's `/api/images/list`, `/api/images/folders` and `/api/images/delete` routes with synthetic decoys, deciding J5 and J6. Not registered in the campaign runner. |

### What the probe measured

One run on `bd15a9b` (the probe's own commit; its files are byte-identical in the frozen candidate) on a disposable pinned SillyTavern 1.19.0 host (`7e8663c`), Node v26.8.1, Chromium 151.0.7922.34; decoys placed through the host's own upload route with `ch_name: ''`, the form gallery=false results take; 20 cases; about 18 s; exit 0; no processes left; ports 8000 and 8188 never contacted. Package: [`docs/evidence/m3-3-a/probe/`](evidence/m3-3-a/probe/).

| Case | Observed |
| --- | --- |
| L1 root listing | `folder` `'.'`, `'/'` and `'..'` list the root `user/images`, because the host's filename sanitizer reduces them to an empty name; absent and `''` return 400. This is a side effect of sanitizing, not a documented contract. |
| L2 listing shape | File names only, no dates or sizes; `sortField: 'date'` orders by modification time; `type` 1 and 7 return images, 0, 2 and 4 return none. |
| L3 folders | Directory names only, no root entry. |
| L4 timestamps | `GET /user/images/<name>` returns `Last-Modified` equal to the file's modification time to the second, an `ETag` and `Content-Length`; the upload response's path has the form `/user/images/<name>` that `imagine` returns. |
| D1, D2 exact delete | `user/images/<name>` and `/user/images/<name>` both delete exactly that file (200); nothing else changes. |
| D3 refusals | Traversal outside the folder (`user/images/../…`, `../settings.json`), an absolute path and an encoded traversal are refused (400 or 404) with nothing changed; a nonexistent name is 404. **The folder itself (`user/images`, `user/images/`) passes the host's path check and then fails with 500 (`EISDIR`)**; nothing is deleted. |
| D4 normalization | `user/images/../images/<name>` is normalized by the route and **deletes the file** (200). |
| D5 CSRF | Without the token: 403, nothing deleted. |

**Verdicts: J5 GO, J6 GO.** For PR C, as findings and not rulings: reconcile lists the root with `folder: '.'` and takes each file's time from `Last-Modified`, which has one-second resolution, so PR C compares against `Math.floor(submittedAt / 1000) * 1000` and may add files from up to one second earlier to the user's choice list (the ETag's millisecond mtime is an undocumented server detail and is not relied on); the delete control sends the path the request returned, or for a reconciled job `/user/images/` plus the listed name, only after the module's result-path rule returns null, because the host normalizes `..` inside the folder and its own check accepts the folder path.

### Campaign

One supervised campaign from the clean worktree at `7660a53` on the same disposable pinned host, the PR A fake ComfyUI as the image backend:

| Suite | Result |
| --- | --- |
| Node (17 files) | 500/500 (492 on main plus the 8 new module tests) |
| Storage | 126/126 |
| Browser actual-entry | 125/125 (124 before plus the toggled-session test) |
| Native campaigns | stage-library-migration 25, expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60, image-route 8 checkpoints |
| `validate.py` | PASS over 149 frozen inputs, a native inventory of 84 files and 119 artifact hashes; physical and owner gates NOT_TESTED or NOT_RUN |
| Discovery | PASS, 17/5/1 |
| On the final candidate `3827af7` | Node list 503/503 and the module 77/77 (on `3827af7`); browser actual-entry 126/126 (on `fdfa313`, whose runtime and browser test equal `3827af7`'s); campaign evidence reused per choice 8 |

Package: [`docs/evidence/m3-3-a/campaign/`](evidence/m3-3-a/campaign/) with `run.json` beside it. The campaign took 1558 s (the director campaign 741 s of it); the supervising runner reaped nothing at exit.

### TESTING coverage

| Row | Covered here | Still NOT_RUN |
| --- | --- | --- |
| T77 | The lock reason now names the lock (browser); the toggled-session wait names its reason (browser) | Unchanged otherwise |
| T78 | `cacheHit` rules in Node | The cache in the UI and on the host (PR C) |
| T81 | `leaseStatus` and `takeoverSession` rules in Node | The ledger-backed lease (PR B, PR C) |
| T82 | `reconcileCandidates` in Node; the host listing and timestamp sources on the pinned host (probe L1, L2, L4) | Reconcile in the UI after a reload (PR C) |
| T83 | The host delete route's exact, refused, normalized and folder-path behaviour on the pinned host (probe D1–D5) | Delete the host's copy in the UI (PR C) |

### Implementation choices for owner review

1. **PR A runs the full evidence standard**, not the pure-module one, because J8's reorder changes a status sentence the shipped UI shows.
2. **A random seed policy never hits the cache.** The review text says "random each request" for every such request, so its hash cannot tell them apart; reusing would hand back an image the user did not ask to repeat.
3. **A lease held by another live tab can be taken over**, not only a stale one, because a reload looks like a different tab with a fresh heartbeat; `leaseStatus` distinguishes `held` from `stale` so the UI can word the two cases differently. Takeover keeps the same session row and id rather than ending it and starting another, which differs from plan 3.2's wording “ends the old session”; PR B's schema confirms or revises this. `leaseStatus` reads a missing or non-numeric clock as `held`, never `stale` or `mine`, and `takeoverSession` refuses a missing tab or a non-numeric clock, so bad data cannot complete a takeover.
4. **`reconcileCandidates` never picks**; it returns the dated list and the user chooses. `cacheHit` fails closed on malformed input (a non-fixed seed policy, a missing hash, a non-array, a row without a finite `settledAt`), the first of equal times wins, and the caller passes only this owner's and project's jobs (J3: nothing cached across projects or owners).
5. **The probe uses the upload route for decoys**, not a real generation, so it measures the folder and routes, not the backend.
6. **Workers.** The module was written by a Codex sol worker whose sandbox could not commit; the coordinator committed it, made the one-line UI change and the two browser-test changes, and merged the probe written by a native Claude agent. A fresh senior reviewer (a native Claude agent in a new context) read the PR at `8d94457` and returned three should-fix findings (`cacheHit` failed open on malformed rows; the `Last-Modified` one-second resolution would drop a result written in the submission's own second; the problem line also shows after a plain Cancel, which the record did not say and no test asserted) and four nits (`leaseStatus` on malformed clocks; takeover keeps the session row; the reconciled-path wording; `Size` rendering for a missing dimension). All were acted on except the last, declined as choice 7.
7. **Declined: `Size: "undefined x undefined"` for a missing dimension.** It is reachable only in a review already refused by `DIMENSIONS_INVALID`, so no payload is affected, and `reviewText` is called by the runtime, so changing it would void the campaign evidence for a cosmetic gap; it waits for PR C.
8. **Tested revision.** The campaign ran on `7660a53`. The final candidate `3827af7` differs from it only in `cacheHit`, `leaseStatus` and `takeoverSession`, which no runtime file calls (a search of `src/` and `index.js` finds no caller), and in tests; Node and the browser suite were rerun on the final candidate, and the campaign evidence on `7660a53` applies to the runtime unchanged. `validate.py docs/evidence/m3-3-a/campaign` passes on a checkout of `7660a53`; on `fdfa313` and later it stops at `src/image-request.mjs` by design, because the frozen inputs include the module and the two test files that changed (all 149 input hashes match `7660a53`'s git objects).

### Not covered

The owner's 1.18.0 install; files from a real generation; deleting inside a character subfolder; symlinks in the image folder; large folders and files written during a listing; physical devices. The ledger, lease, cache and reconcile are not yet used by the runtime.

### Next

The owner reviews this PR. PR B (storage plugin schema v3 and the ledger routes) starts only after that review.

## PR B — the image ledger in the storage plugin (schema v3)

**Candidate, unmerged. Frozen `9375642`**, based on main `3dff21f` (PR A merged). Tracked by [DYL-215](https://linear.app/devils17/issue/DYL-215/sillynovel-m33-complete-the-first-image-route-for-gate-c-ledger-lease). A persistence change: the storage plugin gains the durable image ledger J1 asks for. No `src/` or UI change; the extension does not call the new routes yet (PR C does).

### What it adds

| File | Change |
| --- | --- |
| `database-schema.mjs`, `store.mjs` | Additive migration v2 → v3 in one transaction (`image_sessions`, `image_jobs`, indexed by owner and project); a fresh database is created at v3; every v2 project, asset and catalog byte is unchanged. The job's `asset` column is a soft reference with no foreign key, so unused-asset cleanup and recovery are never blocked by the ledger. |
| `image-ledger.mjs`, `index.mjs` | Routes under `/projects/:id/image/`, owner-scoped and `NOT_FOUND`-concealing like the project routes: `GET session` (the open session and unresolved jobs, including those of ended sessions); `POST session/begin` (`409 LEASE_HELD` with held or stale details, or `takeover: true` keeping the same row, id, count and jobs); `session/heartbeat` and `session/end` by the holder only (`409 LEASE_LOST`); `POST jobs` reserving in one transaction before the host call (`LEASE_LOST`, `IN_FLIGHT`, `ALLOWANCE_EXHAUSTED`, `WORKFLOW_CHANGED`, `LEDGER_FULL` at 500 rows); `POST jobs/:jobId` with the briefed transition table (`INVALID_TRANSITION`, `INVALID_PATH` mirroring the module's result-path rule); `jobs/:jobId/host-deleted`; `GET jobs`, `GET cache?payload=` (imported rows only); `POST jobs/cleanup` (terminal rows only, `UNRESOLVED_JOB`). `/capabilities` advertises `imageLedgerVersion: 1`; the project API schema stays v2. |
| `recovery.mjs`, `tools/recovery.mjs` | Offline inspection and restore accept v3 and report ledger counts per project; the review text is masked unless `--show-review` is given; v2 databases inspect and restore as before. |
| `README.md` | A ledger section: tables, routes, limits, masking, bundle exclusion; the operator still owns backups. |
| `test/image-ledger.test.mjs`, `test/library.test.mjs`, `test/recovery.test.mjs` | 155 new storage tests (126 → 281), including an exhaustive forbidden-transition matrix (103 cases): fresh v3, v2 → v3 preservation, lease and takeover, every reserve refusal, the transition table, path refusals including the probe's folder, `..` and encoded forms, holder rules and the `unknown` exception, cache rows, cleanup, foreign-owner concealment, strict keys, recovery masking, bundles without ledger rows, unused-asset cleanup through the soft reference. Registered in the runner (storage 6 files). |

### TESTING coverage

| Row | Covered here | Still NOT_RUN |
| --- | --- | --- |
| T78 | The ledger's cache rows and the one-unresolved-job rule (storage) | The cache and coalescing in the UI and on the host (PR C) |
| T81 | The lease, takeover and `LEASE_LOST` rules (storage) | The lease in the UI across real tabs and reloads (PR C) |
| T82 | Unresolved rows survive and are listed; `unknown` resolvable after takeover (storage) | Reconcile in the UI (PR C) |
| T83 | `host-deleted` marking and path refusals (storage) | Delete the host's copy in the UI (PR C) |

### Implementation choices for owner review

1. **`GET session` also returns unresolved jobs of ended sessions**, so a job left running when a session ended stays visible for reconcile or abandon.
2. **Takeover keeps the session row**, as PR A's choice 3 proposed; plan 3.2's "ends the old session" wording is satisfied by `LEASE_LOST` on the old tab's next heartbeat.
3. **The plugin never deletes a host file**; it only records that the client did.
4. **The worker's sandbox needed a temporary stdio adapter** to run the suite; the coordinator reran every check without it.
5. **Ending a session withdraws its tab.** An unresolved job of an ended session is resolved only by the holder of the project's current open session, so a reload (a new tab id) can always reconcile or abandon it, and the old tab cannot act on a job that is no longer its own.
6. **Bounded growth.** Begin refuses `LEDGER_FULL` at 500 sessions per project; cleanup also removes ended sessions with no jobs and reports `deletedSessions`; recovery bounds its session load. Ledger rows never carry the owner, in the API or in recovery output.
7. **Three campaign probes pinned the database version.** The library and native-groups campaigns now expect the live database backup at v3; the migration campaign still expects the v1 backup `migrate` command to produce v2, which is what it does. The first campaign on `89a2797` stopped at the library pin; a premature edit of the migration pin was caught by review before any evidence was recorded.
8. **Review.** Written by a Codex sol worker in two rounds; a fresh senior reviewer (a native Claude agent) found one blocker (an ended session's unresolved job could be stranded for good after a reload), three should-fix findings (owner identities in recovery output, unbounded sessions, the transition table tested only from `pending`) and six nits, then on confirmation one more should-fix (the ended session's own tab could still move the job) and the migration-pin error above. All were fixed; the last two by the coordinator exactly as the reviewer prescribed.

### Commands and results

```sh
cd plugins/sillynovel-storage && npm test
python3 tests/probes/dyl60/check-discovery.py
SILLYTAVERN_ROOT=<disposable pinned host> SN_PLAYWRIGHT_MODULE=<pinned Playwright> python3 tests/probes/dyl60/run.py docs/evidence/m3-3-b/campaign
python3 tests/probes/dyl60/validate.py docs/evidence/m3-3-b/campaign
```

| Suite | Result |
| --- | --- |
| Storage | 281/281 (126 before plus 155) |
| Node (17 files) | 503/503 |
| Browser actual-entry | 126/126 |
| Native campaigns | stage-library-migration 25, expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60, image-route 8 checkpoints |
| `validate.py` | PASS over 151 frozen inputs on the final candidate itself |
| Discovery | PASS, 17/6/1 |

Package: [`docs/evidence/m3-3-b/campaign/`](evidence/m3-3-b/campaign/) with `run.json` beside it. The campaign took 1438 s on the disposable pinned SillyTavern 1.19.0 host; the supervising runner reaped nothing at exit.

### Not covered

The ledger on the owner's 1.18.0 install or a real backend; concurrent requests from two real browser tabs (the storage suite exercises the transactional rules in-process); an upgrade of a database in active use by a running older plugin; physical devices. The extension does not use the ledger yet.

### Next

The owner reviews this PR. PR C (the adapter and UI on the ledger) starts only after that review.

## PR C — the adapter and the Generate on this host UI on the image ledger

**Candidate, unmerged. Frozen `5518a51`**, based on main `786b58a` (PR B merged). Tracked by [DYL-215](https://linear.app/devils17/issue/DYL-215/sillynovel-m33-complete-the-first-image-route-for-gate-c-ledger-lease). A renderer, adapter and client change under H4; no schema change. The terra review adds one plugin rule (choice 12), an implementation choice proposed for owner review, not an owner ruling.

### What it adds

| File | Change |
| --- | --- |
| `src/project-client.mjs` | One call per ledger route (session read, begin with optional takeover, heartbeat, end; reserve, transition, host-deleted; jobs, cache, cleanup) through the existing authenticated request and media type. Refusals are `StorageError` with the plugin's `code` (also the message) and its `details` (the `LEASE_HELD` holder); an unreachable plugin or unreadable reply is `STORAGE_UNAVAILABLE`, never a raw error. Existing calls keep their errors. |
| `src/host-adapter.mjs` | `image.listHostImages({ since })`: `POST /api/images/list` with `folder: '.'`, `sortField: 'date'`, then a same-origin GET with the host's headers per file, newest first, reading `Last-Modified` and `Content-Length` with the body cancelled, stopping at the first file older than `since`, at most 50 dated files; names the result-path rule refuses are skipped unrequested. Returns `{ ok, files: [{ path, mtimeMs, size }] }` or `{ ok: false, code }`. `image.deleteHostCopy(path)`: `POST /api/images/delete` with exactly that path, only after `resultPathProblem(path, origin) === null` (the folder, traversal, encoded, foreign and non-PNG paths never leave the page); `{ ok, code }`. Neither throws. |
| `src/project-scene.mjs` | `importFile` returns the stored asset id, so the ledger can record `imported` with it. Its `still` hook is also awaited once as `still(assetId)` after the upload and the asset read, before the asset enters the catalog (`install` takes it as a gate; the caller writes `imported` there), then checked synchronously before the apply; a withdrawal or refusal there installs nothing (terra review). |
| `plugins/sillynovel-storage/image-ledger.mjs`, `README.md`, `test/image-ledger.test.mjs` | Terra review: `candidate`/`reconciled` → `imported` needs the current open session's holder (`409 LEASE_LOST` otherwise); `discarded` stays open to any of the owner's tabs (choice 12). Two plugin tests (each state, holder and non-holder, and after the session ends). |
| `src/stage-view.mjs` | Inside **Generate on this host**: the toggle begins the project's lease (`LEASE_HELD` names the holding tab, held or stale, with **Take over**); a 30 s heartbeat; `LEASE_LOST` ends the session here with a notice; off ends it; the allowance reads the row's `used`. Submit asks the cache, then reserves, then calls the host; every outcome is a transition. Unresolved rows from another page are listed with their time and host folder; after the deadline, **Reconcile** lists dated host files from the submission's second on and the user picks one (fetch, PNG check, Import and apply) or **None of these**; **Abandon**. **Use the previous result** beside **Generate again**. **Delete the host's copy** with its sentence. **Inspect sent requests** (read-only). **Review finished image jobs** and **Remove finished image jobs**. While this page holds the lease, `candidate` and `reconciled` rows no page shows are listed with **Discard** (choice 11). Without the ledger, generation refuses; the manual export and import stay. |
| `tests/fixtures/m3-comfy-endpoint.mjs` | A `refusal` step: an error history item whose message is a synthetic content-policy refusal (J7). |
| `tests/m3-image-ledger-client.test.mjs`, `tests/m3-image-adapter.test.mjs` | Client routes, encoding, typed errors and failure mapping; the listing walk, stop, skip, bound and failures; the delete path rule and status. Registered (discovery 18/6/1). |
| `tests/m1-reader-browser.test.mjs`, `tests/fixtures/reader-browser.html` | The mocked storage routes serve the plugin's own `image-ledger.mjs` over an in-memory SQLite database of the v3 schema (only project and asset lookups are stubbed), context-wide so a second page shares it. 11 new tests, then 4 for the senior review (held upload after a lost lease; an outage after the reservation; a reconcile with a held fetch; per-row host-copy deletion after a reload) and two review extensions (the takeover test now asserts the candidate goes with the lease; the reservation-gate test changes a lock while the reserve is held). The asset upload (`state.uploadGate`) and the host's file reads (`host.gate`) can be held. Terra review: 5 more (two imports after a takeover before the next heartbeat, a lost import acknowledgement, a `candidate` and a `reconciled` row left by a reload), and the second review's third test gains one assertion. No earlier assertion weakened. |
| `tests/probes/m3-image-route/host.mjs`, `README.md` | Checkpoints J (cache), K (refusal), L (host copy), M (takeover and reconcile of a late file; the fixture PNG equals C's, so the import reuses that asset), N (reload), O (ledger rows). From C on, D–I use a second prompt because C's request is a cache hit. |

### Implementation choices for owner review

1. **`listHostImages` returns `{ ok, files }`, not a bare array**, so Reconcile can show the host's refusal and offer Abandon (plan section 4); `files` is the `[{ path, mtimeMs, size }]` that `reconcileCandidates` takes.
2. **Each file's date comes from a GET whose body is cancelled**, not HEAD, which the PR A probe did not measure. The walk is bounded at 50 dated files (a `ponytail:` comment names the ceiling).
3. **All ledger calls are serialized in the page, and every outcome is kept until the ledger acknowledges it** (review finding 4). Outcomes wait in one ordered queue, written inside the serialized ledger queue, so a transition recorded before an end or a begin reaches the plugin first. An unreachable ledger stops the queue: it is retried at the next outcome, heartbeat, session begin and Submit, and while an outcome of this project is unacknowledged the generation section says the ledger state is uncertain and Submit reserves nothing. A `LEASE_LOST` refusal holds that job's outcomes for this tab's next session on the project (written before it lists unresolved rows). Any other refusal (for example `INVALID_TRANSITION`) is resolved by rereading the row (second review): a row already in the outcome's state, with its path, hash and asset, is this page's write whose reply was lost and counts as acknowledged; a row in another state was moved by another page, so the outcome is dropped as a conflict together with every other outcome this page had queued for that request (fourth review), the page names the row's state and how many queued outcomes went with it and reads the list again, and the operations that queued them are superseded (fifth review): each is the job or candidate object its callbacks hold, so those callbacks never write again, while a fresh, authorized action on a request that is still unresolved (a new Reconcile or Abandon after a takeover) is a new operation and records normally. The mark lives on those objects and goes with them; nothing page-wide is kept (third review: another page's result stands). Only a successful read decides: any failed reread, coded or not, keeps the outcome queued, and a row counts as absent only when a list that was read lacks it. A reconciled choice goes through the same queue; if it is still unacknowledged, nothing is attached and the choice is recorded `discarded` after it, so its host copy stays deletable; after a conflict nothing is attached and nothing follows.
4. **The session needs an attached project**, because the ledger lives with the project.
5. **None of these leaves the request unresolved**, so Reconcile can be repeated once a slow file arrives; Abandon resolves it. A `pending` row past its deadline is recorded `timeout-unknown` then `unknown` on a chosen file, and `timeout-unknown` then `abandoned` on Abandon. A `cancelled` row offers Abandon only: a withdrawn request's result is never used (M3.2).
6. **Every request and every reconciled file carries one source identity, taken before the first await and never retaken** (review findings 2 and 3): the attachment, host conversation, catalog and scene revisions, manual locks and the host workflow hash. Submit takes it when clicked; a change before the reservation sends nothing, and a change after it records the reservation `stale` (its unit spent) and sends nothing. Reconcile takes it when Reconcile is clicked, without the draft (no draft was sent); a change before the file is recorded `reconciled` attaches nothing and leaves the row unresolved; a change after that records it `discarded`. The candidate keeps that identity, so Import discards it if the scene, catalog or locks moved since.
7. **Use the previous result is the Apply background command on the catalog asset**, not a re-import: no upload and no host call. The catalog is the attached project's loaded backgrounds, so an imported but unsaved result is a hit in that page and a miss after a reload without Save. A failed cache read is a miss; the reserve then refuses if the ledger is down.
8. **Delete the host's copy is offered for every retained host copy** (review finding 5). The control beside the session acts on the latest discarded, imported or abandoned job this page resolved, as before. **Review finished image jobs** now also lists every discarded, imported or abandoned row of the project with a host path not yet deleted, including rows from before a reload, each with its own **Delete the host's copy** (named by its path and submission time, described by the ComfyUI sentence); it sends that row's recorded path and records `host-deleted`. Inspect stays read-only. A row removed by **Remove finished image jobs** leaves the list, and its file stays in the host folder.
9. **Inspect and cleanup are button disclosures**, because a nested `<summary>` would make the existing `.sillynovel-controls summary` selector ambiguous.
10. **A candidate is the session's** (review finding 1). A generated candidate is shown only after its `candidate` transition is acknowledged; if it is not, nothing is shown and it is recorded `discarded` when the ledger answers. Losing the lease, or turning the session off, discards this page's generated or reconciled candidate. Import and apply checks that this page still holds the session the candidate came from and that its identity is current, before the upload and again before the uploaded PNG is applied (`importFile` takes a `still` check); otherwise nothing is applied and the row is recorded `discarded`, never `imported`. An import withdrawn while its asset is read undoes that install (the catalog entry, its object URL and the catalog revision, then the reducer is refreshed), so later manual commands see a consistent catalog (second review). Terra review: the ledger's acknowledgement of `imported` is the authorization to apply. After the upload and the asset read, before the asset enters the catalog and the synchronous apply, the page flushes its outcome queue, refuses if an outcome of this project is still unacknowledged, and writes `imported` directly through the serialized ledger queue; the plugin accepts it only from the current open session's holder (choice 12). `LEASE_LOST` installs nothing, records the candidate `discarded` and ends the session here; a conflict (another page moved the row) applies nothing and names it; an unreachable ledger applies nothing and keeps the candidate for **Import** again, where a row already `imported` with this asset (a lost reply) counts as written only after a holder-checked heartbeat for this page's session succeeds (terra second round); `LEASE_LOST` or `NOT_FOUND` there ends the session here with nothing applied and no discard queued behind the imported row. A refused authorization installs nothing and moves no catalog or scene revision, so a kept candidate's identity stays current for the retry; an import withdrawn during the asset read is refused at that gate, so nothing is installed and the candidate is recorded `discarded`; the post-install undo (catalog revision advanced, reducer refreshed) is unchanged. An earlier draft restored the catalog revision after an undo; the coordinator's review rejected it, because a revision number reused for a different catalog is an ABA hole in the reducer's and director's stale-result checks. Known edge: if the write succeeds but the preview is discarded or the lease or identity moves during that one round trip, the row stays `imported` with nothing applied: the asset is uploaded but this import did not add it to the catalog, so the cache offers nothing unless identical bytes are already catalogued as a background (then the cache hit points at that existing background, which is the same image).
11. **Candidate and reconciled rows a reload left behind are listed for an explicit Discard** (terra review finding 2). After the unresolved rows, the page reads the project's jobs and lists `candidate` and `reconciled` rows that are not its live preview and have no outcome queued here, only while it holds the lease, each with its time and host copy (text only) and a **Discard** named by its state and submission time; Discard records `discarded` through the outcome queue, after which the row has a deletable host copy and is cleanable like any discarded row. A listed row does not block Submit. A failed read of those rows names the ledger problem and is read again after the next successful heartbeat. No **Resume**: a resumed candidate would refetch `hostPath`, check `resultSha256` and take its identity when Resume starts (the original identity went with the reload); it is left out as a deliberate limit (`ponytail:` comment in `loadRecovery`), since Discard and a new Submit cover it.
12. **Only the current holder records `imported`** (terra review finding 1; **a change to the PR B plugin contract, proposed for owner review, not an owner ruling**). PR B let any of the owner's tabs move `candidate`/`reconciled` to `imported`, so a page whose lease was taken over between heartbeats could still upload, apply and record. Now that transition needs `holder(open(owner, project), tab)`; `discarded` stays allowed from any of the owner's tabs, which the lost-lease discard and choice 11 rely on. A client-only recheck would only narrow the race. Recorded in the plugin README's ledger section.

### Review

The senior review of `45a7d42` (read-only) raised two blockers and three should-fix findings; each was confirmed against the code and fixed in `src/stage-view.mjs` (and `importFile`'s `still` check in `src/project-scene.mjs`), with a browser regression that fails on `45a7d42`:

1. **Lost leases still permitted candidate application** (blocker, confirmed: `leaseLost` kept the preview, `applyResult` checked no lease, and the plugin lets any of the owner's pages record `imported`; the `candidate` transition was not awaited). Fixed as choice 10. Tests: the takeover test now asserts the candidate is discarded and not importable after `LEASE_LOST`; *a lease lost while Import uploads applies nothing*; *an outage after the reservation* (no preview without the acknowledgement).
2. **Reconcile gave delayed results a fresh identity** (blocker, confirmed: the preview captured the attachment after the fetch, and a reconciled candidate skipped the staleness check). Fixed as choice 6. Test: *a reconciled candidate keeps the identity taken when Reconcile started* (a lock change during a held fetch attaches nothing; one after the preview discards it at Import).
3. **Reservation latency hid scene changes** (confirmed: `live()` checked the attachment, epoch and draft only, and `createRequest` read the scene after the reserve). Fixed as choice 6. Test: the reservation-gate test releases a lock while the reserve is held; the row is `stale` and the host is not called.
4. **Transition failures lost known outcomes** (confirmed: `record` returned `null` on any refusal but `LEASE_LOST`, and the deferred replay discarded failures). Fixed as choice 3. Test: *an outage after the reservation keeps the settled outcome* (uncertain line, Submit reserves nothing, the kept outcomes are written in order before the next reserve).
5. **Host-copy deletion was unavailable for retained historical rows** (confirmed). Fixed as choice 8. Test: *the finished-jobs review offers Delete the host's copy for every retained row, including rows from before a reload*.

The confirmation review of `e06e89f` found findings 1, 2, 3 and 5 fixed and raised three more, each confirmed against the code and fixed in `2e5c50a`:

- **High, introduced by the fix: a withdrawn import broke later manual commands** (confirmed: `install` appended the asset and bumped `catalogRevision` before the new `still` return, which skipped `refresh()`, so the reducer refused the next manual command with `STALE_REVISION`). Fixed as part of choice 10. Test: *an Import withdrawn while its asset is read leaves the catalog consistent; the next manual command applies* (held asset GET, Discard preview, then Lock choice and Apply background succeed).
- **The `reconciled` transition bypassed the outcome queue** (confirmed: a committed write with a lost reply removed the row from recovery with no preview and no finished-jobs control). Fixed in choice 3. Test: *a reconciled choice whose reply is lost is kept, reread and discarded; its host copy stays deletable*.
- **Coded refusals were dropped without rereading the row** (confirmed). Fixed in choice 3. Test: *an outcome refused because another page moved the row is reread and named; nothing stays blocked*.
- **Lost-acknowledgement coverage**: the ledger stub's `lose` hook commits a call and answers 503. Test: *an ordinary outcome whose reply is lost is kept, reread as written, and Submit then proceeds*. This one also passes on `e06e89f`, where a refused duplicate was dropped and the next outcome still applied; it is coverage, not a regression.

The third review of `df549d9` confirmed the earlier fixes and the import undo, and raised two more, both confirmed and fixed (`record` resolves `false` after a conflict; `writeOutcomes` reads before it decides):

- **A follow-up `discarded` after an authoritative conflict could discard another page's valid choice** (confirmed: after the reread dropped this page's `reconciled`, `record` returned `null` like a queued outcome and the page queued `discarded`, which the plugin accepts on the other page's reconciled row). Test: *when another page reconciles the same request first, this page's late choice is dropped and nothing follows it; the other page's choice stands and imports* (two pages; this page's file fetch held while the other takes over and reconciles another file).
- **A coded reread failure was taken as an absent row** (confirmed: only transient read errors kept the outcome, so `UNAUTHORIZED` or `AUTHENTICATED_ACCOUNT_REQUIRED` dropped it with a wrong "no longer recorded" notice). Test: *a reread refused with a coded error keeps the outcome; after the reads recover it is written, and nothing new is reserved before* (two `401 UNAUTHORIZED` rereads, then recovery).

The fourth review of `89327f0` confirmed the third-round fixes and raised one more, confirmed and fixed: **a conflict found on replay removed only the conflicting outcome**, so a `discarded` this page had queued behind it during an outage still ran in the same pass and discarded another page's valid choice (the plugin accepts `reconciled` to `discarded` from any of the owner's pages). Now the conflict drops every queued outcome for that request, including those the pass had already captured, the notice counts them, and later outcomes for the request resolve `false` without a request. Tests (two pages, sharing one helper): *a reconciled choice queued during an outage, then another page's reconcile; the replay drops the queued discard too*, and the candidate variant (*a candidate queued during an outage, then another page's reconcile of the overdue request*). Both failed on `89327f0` at the assertion that the other page's row stays `reconciled`.

The fifth review of `bc49d09` confirmed the queued-discard fix and found one should-fix it introduced, confirmed and fixed: **the refusal was page-lifetime and keyed by request**, so after a replay conflict on a request that stayed unresolved (another page's Reconcile moved it to `unknown` and then could not read its file), a later authorized Reconcile of that request on this page was refused locally and never recorded. Now the conflict supersedes the operations, not the request (choice 3). Test: *after a replay conflict on a request that stays unresolved, a fresh Reconcile after takeover records; the superseded outcomes never write* (the ledger row ends `reconciled` then `imported`, and after the conflict this page sends only its fresh choice and its import). It failed on `bc49d09` where the fresh choice should be recorded.

The sixth review of `2ff328d` (the same Codex reviewer, read-only) passed with one nit: the new test drains already-queued old outcomes but does not call a held old callback after supersession, so `record()`'s refusal of a superseded operation rests on source tracing, not on a test that exercises it. It is recorded here, not fixed. The reviewer judged PR C ready for owner review on its scope; that is not a Gate C verdict.

**Terra review.** The Codex terra senior review of `ab6f163` (PR head; runtime `2ff328d`) raised two should-fix findings, both confirmed and fixed:

1. **Import after a takeover between heartbeats** (confirmed by regression: `applyResult` gated on local state only, and the plugin accepted `imported` from any of the owner's tabs, so a page that had not yet heard `LEASE_LOST` uploaded, applied and recorded `imported`). Fixed by choices 10 and 12: the plugin requires the current holder for `imported`, and the page applies only on the ledger's acknowledgement. Tests: plugin *candidate → imported requires the current holder; discarded stays open to any owner tab* and its `reconciled` twin; browser *a takeover before this page's next heartbeat; its Import applies nothing, the row is never imported by it, the lease-lost line shows* and *a takeover while this page's Import upload is held, before its next heartbeat*; plus coverage *an import whose acknowledgement is lost applies nothing and keeps the candidate; Import again rereads the row as written and applies*. The existing *second review 3* test keeps its assertions and now also asserts that the refused import is not applied.
2. **Candidate and reconciled rows stranded after a reload** (confirmed by regression: the session read lists only unresolved rows and cleanup only terminal ones, so such a row stayed forever and counted toward the 500-job cap). Fixed by choice 11 (Discard; no Resume). Tests: *a candidate row left by a reload is listed while this page holds the lease; Discard records it discarded and cleanup then removes it* and its `reconciled` twin.

Every new browser test and both new plugin tests fail on `ab6f163` (its `src/` and `image-ledger.mjs`). The coordinator then rejected an intermediate restore of the catalog revision after an install undo (ABA; see choice 10), and the authorization moved before the asset enters the catalog.

**Terra review, second round** (of `50f8431`; verified by the coordinator by reading; plugin unchanged this round):

1. **Should-fix: a reread `imported` row was applied without the lease.** An `imported` write commits but its reply is lost; another tab takes over; the retry gets `INVALID_TRANSITION` (imported to imported is not a transition, so the plugin never reaches its holder check), the reread finds the row imported with this asset, and the page applied. Fixed in `authorizeImport`: that branch now accepts only after `heartbeatImageSession` for this page's session succeeds through the ledger queue (`LEASE_LOST`/`NOT_FOUND` end the session here; a transient failure keeps the candidate); the imported row cannot move back, so reread then heartbeat is sound. Test: *an import written with its reply lost, then a takeover; the retry applies nothing and shows the lease-lost line* (fails on `50f8431`).
2. **Nit: the known edge claimed the cache offers nothing**; qualified in choice 10 (identical bytes already catalogued can be a hit, on the same image).
3. **Nit: a failed read of the rows a reload left was silent and never retried.** Now it shows the ledger problem and is read again after the next successful heartbeat (no new timer). Test: *a failed read of the rows a reload left names the ledger problem and is read again after the next heartbeat* (fails on `50f8431`). Taking over now renders the session at once, before the two recovery reads, which the existing takeover test's count check relied on.

**Terra review, third round** (of `5518a51`, read-only): **MERGE WITH NITS**. Every earlier finding traced closed: the holder check gates both the first import and the lost-reply retry; stranded candidate and reconciled rows can be discarded and then cleaned up; the cache sentence is qualified; a failed stranded read is reported and retried. The reviewer found no new defect in the outcome-queue ordering, the `done` hand-off, the identity and revision checks across the new await in `install`, the unchanged manual import, lifecycle, row rendering or the docs, and called the holder-only `imported` rule a reasonable proposed change, identified as such for owner review. One nit, recorded here and not fixed: after a failed read of the rows a reload left succeeds on the heartbeat's retry, the rows show but the ledger-problem status line stays until another status replaces it (`src/stage-view.mjs` ~369). The reviewer's permitted Node command passed 148/148; the browser and storage suites are the coordinator's.

### Coordinator's commands and results (frozen `5518a51`)

The coordinator reran every check on the frozen candidate from a clean worktree, under the orchestrator's supervisor (deadline 3400 s, bounded output), holding the host-wide heavy-job lock, on a disposable SillyTavern 1.19.0 host pinned at `7e8663c`, Node v26.8.1, Chromium 151.0.7922.34.

```sh
SILLYTAVERN_ROOT=<disposable pinned host> SN_PLAYWRIGHT_MODULE=<pinned Playwright> python3 tests/probes/dyl60/run.py docs/evidence/m3-3-c/campaign
python3 tests/probes/dyl60/validate.py docs/evidence/m3-3-c/campaign
python3 tests/probes/dyl60/check-discovery.py
```

| Suite | Result |
| --- | --- |
| Node (18 files) | 521/521 (503 before PR C plus 18) |
| Storage | 283/283 (281 before PR C plus the two terra-review plugin tests) |
| Browser actual-entry | 157/157 (126 before PR C plus 31) |
| Native campaigns | stage-library-migration 25, expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60, image-route 14 checkpoints |
| `validate.py` | PASS over 152 frozen inputs on the candidate itself |
| Discovery | PASS, 18/6/1 |

Package: [`docs/evidence/m3-3-c/campaign/`](evidence/m3-3-c/campaign/) with `run.json` beside it. The campaign took 1903 s; the supervisor reaped nothing at exit. It ran from a clean worktree of `5518a51` in which only the previous run's `docs/evidence/m3-3-c/campaign/` was staged as removed, so the probes wrote into an empty directory. Full campaigns also passed on `e06e89f`, `df549d9`, `89327f0`, `bc49d09` and `2ff328d` (1652 s; that run was committed before the terra review and is replaced here with `git rm`); only the frozen candidate's run is committed.

### Worker evidence (the terra-review commits; runtime `960132f`, after the second terra round; record on the next commit)

Run by the fix worker on the disposable SillyTavern 1.19.0 host pinned at `7e8663c`, Node v26.8.1, bounded by `timeout`; not the coordinator's campaign.

| Check | Result |
| --- | --- |
| Node (18 files listed by `run.py --list-tests`) | 521/521 |
| Storage (`npm test`) | 283/283 on `7de5d7d` (281 plus the two terra-review plugin tests); not rerun since, as no later commit changes a plugin file |
| Browser actual-entry | 157/157 (150 on `2ff328d` plus 5 terra-review tests and 2 second-round tests; the lost-acknowledgement test asserts the retry's refused write and reread). The four required regressions, the lost-acknowledgement test and both plugin tests fail on `ab6f163`'s `src/` and `image-ledger.mjs`; the two second-round tests fail on `50f8431`'s `src/` |
| Native image-route campaign | PASS on `5518a51` (checkpoints A–E and G–O; F skipped as in every run), run once after this record was written |
| Discovery | PASS, 18/6/1 |

**The coordinator's campaign failure at image-route** (the first campaign, on `45a7d42`, after checkpoint B; that failed run's evidence is kept outside the repository and not committed) was a test-harness race, not a host exit: `host.log` ends with the host's own shutdown title, written by its SIGTERM handler when the harness closed it after the failure, and no exception. Playwright's request context keeps sockets alive in a shared agent that ignores the host's `Keep-Alive: timeout=5` hint, while the host (Node 26) closes an idle socket after `keepAliveTimeout` plus `keepAliveTimeoutBuffer`, 6 s. C's post-Save GET was the harness's first request since A's project PUT; the data root's file times put that gap at about 6 s (PUT about 10:17:03.3, Save about 10:17:09.3), so the request reused a socket the host was closing: `socket hang up`. A loopback reproduction against a plain Node 26 server with the same Playwright 1.62.1 reused the socket up to 5.9 s idle and reset 3 of 81 requests at 5.96–6.04 s; with `Connection: close` it reset none of 243. Earlier runs had other A-to-C gaps. The harness's `native` and `plugin` calls, and the probe's two direct asset GETs, now send `Connection: close` (`CLOSE` in `tests/probes/m2-director/harness.mjs`); no assertion changed. Other probes that call `context.request` directly (`m2-director/host.mjs` export GETs, the portability, storage, cleanup, folder and `dyl193` probes) have the same latent race and were not changed.

### Findings

- **A reload never leaves a late host file.** The host saves a generated image from the page (`saveBase64AsFile` after the generate request returns), so a page that dies mid-request saves nothing, and the host's generate route sends ComfyUI `/interrupt` when its socket closes. Reconcile can find a file only when the generating page lived on, as after a takeover from a second page (campaign M); after a reload it correctly finds none (campaign N).
- **The plugin allows `host-deleted` only on discarded, imported or abandoned rows**, so the host file kept by a cancelled request whose late result arrived (`stale` with a path) cannot be deleted from the UI. This matches J5's wording; it is a gap against plan 3.5's privacy aim, not a defect.
- **The plugin README's ledger table lists the cleanup reply as `{deletedIds,deletedCount}`**; the route also returns `deletedSessions` (PR B choice 6).

### Not covered

The owner's 1.18.0 install and real ComfyUI; two real tabs reserving at the same instant (the plugin's transaction decides; the browser suite and campaign take over sequentially); deleting inside a character subfolder; physical devices and screen readers.

## PR D — Gate C readiness

**Candidate, unmerged. Frozen `69dc4cb`** (the last code change; later commits are record and evidence only). Based on main `c6f421d` (PR C merged as `3cd3056`, merged notes `c6f421d`), under the owner's [go-ahead](DECISIONS.md#owner-go-ahead--m33-pr-d-gate-c-readiness--2026-11-11), “Go ahead and orchestrate D”, which authorizes PR D only: no Gate C session, no real-backend request, no PR 90 run, no merge. Tracked by [DYL-215](https://linear.app/devils17/issue/DYL-215/sillynovel-m33-complete-the-first-image-route-for-gate-c-ledger-lease). Tests and docs only. **Gate C NOT_RUN.**

**Runtime and reused evidence.** Main `c6f421d`'s runtime and tests are byte-identical to PR C's frozen `5518a51`: `git diff --quiet 5518a51 c6f421d -- src tests plugins index.js style.css manifest.json` is empty. PR D adds only new files under `tests/probes/m3-gate-c/` and docs. `git diff --quiet 5518a51 HEAD -- src index.js style.css manifest.json plugins` is empty, and no existing test file changes. So [PR C's campaign](#coordinators-commands-and-results-frozen-5518a51) applies **by SHA, as reused evidence, not as a fresh run**: tested revision `5518a51`, current revision this PR's head. `python3 tests/probes/dyl60/validate.py docs/evidence/m3-3-c/campaign` passes on this PR's head (152 frozen inputs, 119 artifact hashes). **The new proof below is synthetic. Every real half is NOT_RUN. A real-provider policy refusal is NOT_TESTED (J7).**

### What it adds

| File | Change |
| --- | --- |
| [`docs/GATE_C_RECORD_TEMPLATE.md`](GATE_C_RECORD_TEMPLATE.md) | The Gate C record: the human gate record of TESTING section 6; a field for the host the owner uses, any deviation, and the database backup; the synthetic hard gates; one block per demonstration on the synthetic fixture; the real session's lines (each shown, NOT_RUN or NOT_TESTED); the read-only capture's lines; owner verdict NOT_RUN / PASS / REVISE / STOP. Counts, hashes and the owner's words only. |
| `tests/probes/m3-gate-c/demo.mjs` | The seven demonstrations on the fake ComfyUI and the disposable pinned 1.19.0 host. `--proof-loopback` (headless, automated, asserted; the coordinator's) or `--owner` (a headed browser of its own on the disposable host, Enter between steps; records what it observes against the expected changes and asserts nothing). Writes `observations.json` labelled SYNTHETIC. Includes the 8188 guard below. |
| `tests/probes/m3-gate-c/capture.mjs` | A read-only capture for the owner's real session. It refuses without `--owner-accepts-read-only-capture` and has no network code. It reads only new PNGs in the host's `user/images` folder, the review texts the owner copied, and the recovery tool's `inspect` JSON. A review or ledger file is refused if its real path is `settings.json` or `secrets.json`, or if any directory above it holds either file (a SillyTavern user data root), directly or through a symlink; each is size-capped. It reports each file's name, size, SHA-256 and PNG signature, and checks ComfyUI's `prompt` metadata (the graph the backend actually ran, stored unchanged by the host) field by field against the review. It cross-checks ledger rows against files. Its output holds no prompt or review text and is never overwritten. It must lie outside the repository and the images folder, checked on both the path as given and the real path. |
| `tests/probes/m3-gate-c/gate-c.test.mjs` | 19 Node tests (10, plus 3 from the terra review, 2 from its second round, 1 from its third, 2 from its fourth and 1 from its fifth): argument refusals for both scripts, the demonstration table, the guard on ComfyUI and other backend-address routes, PNG text chunks (`tEXt`, `zTXt`, `iTXt`), review parsing and graph comparison, the ledger cross-check, a capture end to end with no text in its output, and capture's imports (no network module, no settings read). |
| `tests/probes/m3-gate-c/README.md` | Commands, the guard and its limit, registration. |
| `docs/evidence/m3-3-d/proof/`, `docs/evidence/m3-3-d/failed-50e9b57/` | The loopback proof's bounded output (`observations.json`, `capture.json`, `ledger-inspect.json` with the review text masked by the tool, the console log, `SHA256SUMS`) and the retained failed first run. Synthetic only. |

Not touched: `src/`, `index.js`, `style.css`, `manifest.json`, `plugins/`, and every existing file under `tests/`.

### The seven demonstrations and the hard gates

| Demonstration | Real backend in the owner's session | Synthetic (demo.mjs; the proof on `69dc4cb`) | Who records |
| --- | --- | --- | --- |
| New background | Yes, first; capture checks the file and the backend graph against the review | Held job, a reply during it, Import and apply, saved; 1 `/prompt`, 1 row `imported`, +1 host file | Agent: capture and counts; owner: usefulness |
| Cache hit | Only with a fixed seed the owner sets; no new file and no new row | Use the previous result; 0 `/prompt`, 0 rows, nothing counted | Agent: counts; owner: words |
| Rejected candidate | Yes: Discard, then Delete the host's copy | 1 `/prompt`, row `discarded` with the host copy deleted, net 0 files | Agent: capture `rowsDeleted`; owner |
| Timeout | Optional, only if the owner slows ComfyUI by their own means (for example a long job queued in ComfyUI's own UI first) and 120 s pass; otherwise NOT_RUN | Held job, a reply, the real 120 s wait to "outcome unknown" with Abandon offered, then the late image: discarded, nothing applied, row `stale`. This is the on-page timeout the campaign never ran on the host (checkpoint F) | Owner; agent for synthetic |
| Policy refusal | **NOT_TESTED** (J7) | The fixture's `refusal` step: shown as a failure, 1 `/prompt`, row `failed`, no retry or fallback, a reply after it | Agent |
| Cancelled or stale job | Yes: Cancel; a newer scene while generating; a second tab or a reload | Cancel then release (row `stale`); a newer background while held, then the late result discarded with the newer scene kept; a reload while held: takeover, Submit refused while unresolved, Abandon after the deadline | Owner; agent: capture cross-check |
| Configured usage limit | Optional (five local generations) | Five Submits, the sixth refused, still 5 of 5 after a reload and takeover | Agent; owner |

Hard gates:

- **No duplicate jobs.** Synthetic: fixture `/prompt` count equals ledger rows equals Submit clicks over the whole proof (12 = 12 = 12), plus campaign J, M, N. Real: capture's file-to-row cross-check (no file without a row, none with several), and the owner reads ComfyUI's own queue history. The agent never contacts 8188.
- **A late image never replaces a newer scene.** Synthetic: campaign D, G, M, N and the proof's timeout and stale steps. Real: Cancel or a newer scene during a real generation; the owner sees nothing applied, and the row is `stale` or `cancelled`.
- **The data actually sent is verified.** Synthetic: campaign B and C (the wire deep-equals the expected workflow; the review is the wire). Real: PR 90's protocol already reads the owner's copied review text, the new host file (size, SHA-256, signature), the host's server log (which names ComfyUI's outputs but not the prompt) and the saved project. PR D adds the backend's own record of what it ran: the host stores ComfyUI's PNG bytes unchanged (`/api/sd/comfy/generate` returns the `/view` bytes and the page uploads them as is, verified in the pinned source), so `capture.mjs` compares the embedded `prompt` graph with the review. Whether ComfyUI v0.43.2 embeds it is unverified; absent metadata is reported NOT_AVAILABLE. Nothing reads the owner's settings.
- **Reading and replying continue.** Synthetic: a message answered by the synthetic text endpoint while a job was held (4 replies, in new background, timeout, cancelled and, after the failure, policy refusal). Real: the owner.
- **Canonical files unchanged.** Synthetic: cards, lorebooks, personas and the saved image settings unchanged, and the chat's earlier messages unchanged (new turns are the proof's own replies). Real: the owner's report.
- **No automatic CGs or outfit batches.** Every `/prompt` followed a Submit click; real: files equal rows equal the owner's Submit presses.

### The 8188 guard

The host contacts ComfyUI from its server, so every page request goes to the host's own origin. At the pin (`src/endpoints/stable-diffusion.js`), every image backend route takes the backend address in the JSON body as `url`. Other host routes carry `api_server`, `custom_url`, `reverse_proxy`, `server_url`, `*_endpoint` and similar keys. `demo.mjs` therefore routes every `/api/` request of each browser context it opens through `guardDecision`, which reads the body:

- Under `/api/sd/` it passes only ComfyUI's `ping`, `samplers`, `models`, `schedulers`, `vaes` and `generate` with `url` at exactly the fixture's origin. It also passes `workflows` and `workflow`, which read local files, but only when any `url` they carry is the fixture's. Everything else there is aborted, including other image sources, RunPod, and unparseable bodies.
- Any other host API request whose backend-address keys hold an http(s) address other than the fixture or the text endpoint is aborted, and so is unparseable JSON. Values that are choice names (`zai_endpoint: 'common'`) and JSON arrays carry no address.
- Before each demonstration (and each owner step) it reads the host's saved image settings and stops unless `comfy_url` is the fixture and the source is standard ComfyUI.
- The proof sets `comfy_url` in the page to an unused loopback port, never 8188, with a sentinel server listening there. It sends a `ping`, a `generate` and an unparseable `generate`: all three were aborted, the sentinel received 0 connections, and the fixture's log was unchanged.

- Every request to the host passes through the guard, and every rule matches one normalized path: lower case, one percent-decode, duplicate slashes collapsed, a trailing slash stripped. A path that fails to decode, keeps a `%` after one decode, or has a `.` or `..` segment is refused. The pinned host's Express 4.22.1 sets neither `case sensitive routing` nor `strict routing`. Measured against a router mounted as the host mounts them, `/api/horde/status`, `/api/HORDE/status`, `/api/horde/status/` and `/api/horde//status` all reach the same handler, while `/api/%68orde/status`, `/api/horde%2Fstatus`, `/api//horde/status` and dot segments do not. The guard refuses or normalizes all of them.
- The text route is held to what the demonstrations use, the harness's seeded source. `/api/backends/chat-completions/*` passes only with `chat_completion_source: 'custom'` and `custom_url` at the text fixture, because the host chooses the provider from that source. Routes where the host picks an external endpoint itself are refused whatever the body says: other text backends and providers, translation, search, speech, vectors, remote tokenizers, asset downloads, content imports, and extension install, update and version. The proof's tamper check adds three provider switches (an `openai` source, no source, `custom` at the sentinel port), all aborted, with the text fixture's log unchanged.

**Limit:** the guard sees only requests from the browser contexts the script opens. A request from another client of the disposable host, or host-side work not started by such a page, is not covered. The disposable host listens on loopback only, on an ephemeral port, and is stopped at the end.

### Commands and results

Node v26.8.1, Playwright 1.62.1, Chromium 151.0.7922.34, the disposable SillyTavern 1.19.0 host pinned at `7e8663c` (cloned per run into an owned root under TMPDIR), the fake ComfyUI on an ephemeral loopback port, the synthetic text endpoint on 8128. Ports 8000 and 8188 were never used. No real backend.

```sh
python3 tests/probes/dyl60/run.py --list-tests                      # {node: 18, storage: 6, browser: 1}, unchanged
timeout --kill-after=5 600 node --test --test-isolation=none tests/probes/m3-gate-c/gate-c.test.mjs
python3 tests/probes/dyl60/check-discovery.py
python3 tests/probes/dyl60/validate.py docs/evidence/m3-3-c/campaign
git diff --quiet 5518a51 HEAD -- src index.js style.css manifest.json plugins
TMPDIR=<scratch> SN_PLAYWRIGHT_MODULE=<playwright>/index.mjs timeout --kill-after=10 1200 node tests/probes/m3-gate-c/demo.mjs --proof-loopback <pinned host> > <log>
```

| Check | Result |
| --- | --- |
| `gate-c.test.mjs` | 19/19 on the final head (18/18 after round 4, 16/16 after round 3, 15/15 after round 2, 13/13 after round 1, 10/10 before the terra review) |
| `check-discovery.py` | PASS, 18/6/1 (unchanged) |
| `validate.py docs/evidence/m3-3-c/campaign` on this head | PASS: 152 frozen inputs; Node 521, storage 283, browser 157, eight native campaigns; 119 artifact hashes. Reused evidence of `5518a51`, not a fresh run |
| Runtime diff from `5518a51` | Empty |
| `demo.mjs --proof-loopback` on `69dc4cb`, the final code head | **PASS** in 4 min 39 s (2026-11-12 06:47:22–06:52:01 UTC). Earlier passes on `fb3e682`, `d0cfca1`, `9eb0acd`, `3bcee56` and `8adcfed`, before the terra review's later rounds, are superseded and not retained. Guard: a tampered `ping`, `generate` and unparseable `generate`, and three text-provider switches (an `openai` source, no source, `custom` at the sentinel), all aborted; sentinel 0 connections; both fixture logs unchanged. Every demonstration matched its expected changes: new background 1 `/prompt`, `imported`, +1 file; cache hit 0, 0, 0; rejected candidate 1, `discarded` with its host copy deleted, net 0; policy refusal 1, `failed` (“The host returned no image.”), 0; timeout 1, `stale`, +1 (the late copy kept by the host, nothing applied); cancelled or stale 3, `stale`, `stale` (“Result discarded: the scene layout changed”), `abandoned`, +2; usage limit 5, four `discarded` and one `candidate`, +5, “Submissions used 5 of 5” after the reload. Gates: 12 Submit clicks = 12 `/prompt` = 12 ledger rows; nothing unresolved; canonical files, earlier chat messages and saved image settings unchanged; no chat text in the ledger; no guard abort during the demonstrations. Capture pipeline: recovery `backup` and `inspect` (review masked), then `capture.mjs --proof-loopback`: 9 files = 9 expected, every PNG signature valid, backend graph absent (the fixture PNG carries no metadata), no file without a row or with several, no missing or undeleted file, 1 deletion, 6 rows hash-checked against their files and none differing, no text in the output |

Evidence: [`docs/evidence/m3-3-d/proof/`](evidence/m3-3-d/proof/) (`observations.json`, `capture.json`, `ledger-inspect.json`, `console.log`, `SHA256SUMS`). Owned roots `sn-m3-gate-c-7oxRoX`, `sn-m3-gate-c-6PL84v`, `sn-m3-gate-c-rsQkGj`, `sn-m3-gate-c-71xpeQ`, `sn-m3-gate-c-5LBGqh`, `sn-m3-gate-c-heaWqT` and `sn-m3-gate-c-tEg6S1` were read, their bounded outputs kept here, and then deleted. No owned process remained and port 8128 was free afterwards.

**One failed run, retained.** The first proof, on `50e9b57`, passed the guard check, all seven demonstrations and every gate, but ended FAIL. The guard had aborted 16 legitimate requests during the demonstrations: 14 tokenizer counts, whose JSON body is an array, and 2 workflow lists after a reload, whose body carries the fixture's own `url`. A test defect; no product code was involved. The bounded fix (an array carries no backend keys; a local workflow route passes when its `url` is the fixture's), two more guard assertions and one recovery run followed on `fb3e682` (PASS). The terra review's fixes then changed `capture.mjs`, so the proof ran once more on `d0cfca1` (PASS), once more on `9eb0acd` after the second round (PASS), once more on `3bcee56` after the third (PASS), once more on `8adcfed` after the fourth (PASS), and once more on `69dc4cb` after the fifth (PASS); that last run is the evidence above. The failed run is [retained](evidence/m3-3-d/failed-50e9b57/).

### Findings

- **The shared harness leaks on a failed setup** (round 4, finding 2). `createHarness()` in `tests/probes/m2-director/harness.mjs` starts the host and the text fixture before launching Chromium and returns nothing if a later step throws. The director and image-route campaigns call it the same way and have the same gap. It is a pre-existing defect, left for a later change, because the file is a frozen input of PR C's campaign (`docs/evidence/m3-3-c/campaign/inputs.json`) and changing it would void the reuse by SHA. `demo.mjs` works around it (a `ponytail:` comment names the upgrade path: fix `createHarness` with the next full campaign).

### Implementation choices for owner review

Proposals, not owner rulings; each is reversible.

1. **The new Node test file is not registered in `tests/probes/dyl60/run.py`**, so discovery stays 18/6/1 and every frozen input of the PR C campaign stays byte-identical (`validate.py` on `docs/evidence/m3-3-c/campaign` passes on this head). The M3.3 PR A image-folder probe and the M3.2 seam endpoint test are also unregistered. **Ceiling:** a full campaign does not run these tests. **Upgrade path:** register them in `run.py` (19/6/1) when the Gate C frozen candidate gets its own full campaign, which that gate needs anyway. The page helpers `demo.mjs` restates from `m3-image-route/host.mjs` move into a shared module then (`ponytail:` comments in both new files).
2. **Owner mode opens its own headed Chromium on the disposable host**, not the owner's usual browser. Cookies on 127.0.0.1 are shared across ports, so the owner's port-8000 session must not mix with it.
3. **Before the Gate C session, the owner decides which host it runs on.** On the owner's 1.18.0 install that is a deviation from the pin, as at Gate B (I8). It needs the candidate's schema v3 storage plugin there, which migrates the live database (additive), so a DYL-58 backup comes first. The template has fields for the host, the deviation and the backup. `capture.mjs` runs on the owner's install only on the owner's word, recorded first; the README says so. **This is the owner's decision before the session, not before this PR.**
4. **A real timeout, cache hit and usage limit are optional** in the owner's session. Each depends on the owner's own settings or effort: slowing ComfyUI by their own means, a fixed seed, five local generations. Otherwise each is NOT_RUN on the real backend, and the synthetic block stands for it, labelled so.
5. **The record keeps hashes, counts and per-field match flags.** The owner's prompt and review text go in only if the owner says so. The capture output and the ledger backup stay outside the repository.
6. **ComfyUI's own queue count is the owner's reading.** The agent never contacts 8188.
7. **Canonical files on the real install rest on the owner's report.** The agent does not hash the owner's chats or cards.
8. **A ROADMAP entry is added**, as M2.4 PR D did. M3.3 PRs A–C did not add one.
9. **PR 90 (the M3.2 real-backend run) is left untouched.** The real new-background demonstration overlaps it; the owner decides whether the run stays separate, is superseded by Gate C, or comes first.
10. **A file matches a review only if its graph is wired as the six-node workflow and every field the review states and that workflow carries matches** (positive, negative, steps, CFG, sampler, scheduler, denoise, size, model, and the seed when fixed). The only exceptions are a random seed (not compared), VAE and clip skip (not in that workflow, reported "not in graph"), and a field the review renders as `null`. Every node must be on the allowlist, and every text input must be the positive or negative text. A graph missing a node the workflow carries is therefore unmatched.
11. **`--only` refuses a selection that leaves out a prerequisite.** `cache-hit` needs `new-background` in the same run. The other demonstrations stand alone in owner mode; each begins by telling the owner to turn the session on if it is off. The proof always runs all seven.
12. **Capture inputs follow one rule.** A `--review` or `--ledger` file is refused if its real path is named `settings.json` or `secrets.json`, or if any directory above it holds either file (a SillyTavern user data root such as `data/<user>/`). Reviews are capped at 1 MiB and the ledger JSON at 16 MiB.

### Senior review

A Codex terra senior review of `5fe4eab` returned CHANGES REQUIRED with four findings. The coordinator confirmed each by reading the code, and all four are fixed with regressions in `gate-c.test.mjs`:

1. **Should-fix: `capture.mjs`'s `--out` check was lexical.** A symlinked parent into the repository or the images folder passed it. Now the destination is rebuilt from the nearest existing parent's real path and checked against the real repository and images paths; `wx` is kept. Test: symlinked parents into both, including a missing directory below the link.
2. **Should-fix: `matchedReview` accepted fields missing from the graph.** A graph with matching texts but no sampler counted as matched. Now every stated, workflow-carried field must match (choice 10). Tests: a missing sampler node, a missing model node and a missing latent node are each unmatched.
3. **Should-fix: `--review` and `--ledger` could read any path,** including `settings.json` or `secrets.json`, directly or through a symlink. Now choice 12's rule applies, with size caps. Tests: direct, symlinked, data-root and oversize refusals.
4. **Nit: `--only` could start a dependent demonstration without its prerequisite.** Now refused (choice 11).

The runtime is still untouched. The proof was rerun once on `d0cfca1` (PASS).

**Terra review, round 2** (of `45a0065`) confirmed those four fixes and raised three more, each confirmed reachable and fixed with regressions:

1. **Should-fix: proof ownership was checked on the lexical images path.** An `sn-*` root could hold a symlinked `user/images` leading to the owner's folder. Now the images path is resolved with `realpath` and must lie inside the resolved owned root. In either mode, the real path must itself be a `user/images` folder, and the walk skips symlinked files and folders and opens each file with `O_NOFOLLOW` after checking its real path. Tests: a symlinked `images`, a symlinked `user`, an `images` link to another folder, and a symlinked file and folder inside.
2. **Should-fix: matching did not check the wiring.** Swapped conditioning still matched. Now `compareGraph` follows the sampler's links and requires the six-node wiring: model from the checkpoint, latent from the empty latent, positive and negative from two distinct text encodes reading the checkpoint's CLIP, decode from the sampler and the checkpoint's VAE, save from the decode. Values are read through those links. Tests: swapped conditioning, one encode on both inputs, six single rewired links, and a third text encode.
3. **Nit: a standalone `--only` demonstration started with the session off.** Every demonstration now opens with a line telling the owner to turn the session on (choice 11).

**Sweep of `capture.mjs` for the same two classes**, fixed and named here. A ledger `hostPath` with a `..` or empty segment could steer the existence check outside the images folder; now such a row counts as missing, and existence is checked without following links below the real images folder. Pairing a ledger row with a file was by name only; now a row that recorded the result's SHA-256 must hash-match its file (`rowsWhoseHashDiffers`), and the proof requires at least one such check with none differing. Tests: a traversal path and a linked file in the ledger; same name, other bytes. The proof was then rerun once on `9eb0acd` (PASS).

**Terra review, round 3** (of `eff98da`) confirmed the round-2 fixes and raised two more, both confirmed and fixed:

1. **Should-fix: the ledger existence check ran `lstat` on the final component only.** So `/user/images/link/a.png`, with `link` a symlinked folder, followed the link outside. Now one helper, `underImages`, checks every path under the images folder, for the walk, the read and the ledger check alike. It examines each component with `lstat`, refuses any symlink, and confirms the resolved path lies inside the real images folder. Tests: a symlinked first component and a symlinked deeper component, in both a ledger path and the walk; both fail on `eff98da`'s ledger check.
2. **Nit: a standalone `--only cancelled-or-stale` asked for a different background when Forest was the only one.** Setup now also seeds a second background, Harbor, as the proof path's own second scene does, and the owner step names which to pick.

The proof was then rerun once on `3bcee56` (PASS).

**Terra review, round 4** (of `bd4fe0b`, whole PR) confirmed the round-3 fixes and raised three more, each confirmed and fixed:

1. **Should-fix: a chat-completions request with a non-custom provider and no foreign URL passed the guard,** and the host would then have chosen that provider's endpoint. Now the text route passes only the seeded `custom` source at the text fixture, and host-chosen external routes are refused (the guard section above). Tests: a non-custom source, a missing source, a tampered URL, custom without a URL, and the refused routes. The proof's tamper check now includes three provider switches.
2. **Should-fix: if `createHarness()` threw after starting the host and the text fixture, they leaked.** `demo.mjs` now stops its own descendants: a parent-PID walk over `/proc` rooted at `process.pid`, never by name; TERM, up to 5 s, KILL survivors, wait for them to go. Then it rethrows and keeps the owned root. `tests/probes/m2-director/harness.mjs` is not changed (see Findings). Test: a spawned sleeping child and grandchild are found, stopped and reaped.
3. **Should-fix: the template asked for host server log lines with no limit on their content.** Raw logs, capture output, backups, prompt and review text, and file and folder names now stay outside the repository. The record keeps counts, hashes, error codes, versions and observations the owner marks as non-sensitive. Every other field was checked: configuration (names and versions only), owner feedback (marked non-sensitive, never chat excerpts), evidence locations, the backup, the capture command, and the host files (hashes, not names).

The proof was then rerun once on `8adcfed` (PASS).

**Terra review, round 5** (of `b3e3f9f`) confirmed the round-4 fixes and raised one more, confirmed against the pinned host's routing. **Should-fix: the route rules were case-sensitive, but Express routes case-insensitively,** so `POST /api/HORDE/status` passed the guard and reached the AI Horde handler. The whole class is fixed once: the guard now routes every host request, normalizes the path a single time (above), and matches the `/api/sd/` branch, the store routes, the text route and the denylist on that form, segment by segment. Tests: mixed case, an encoded letter and an encoded slash, a double slash in either place, a trailing slash and dot segments, on a denied route and on the `/api/sd/comfy` branch (with the owner's port refused and the fixture passed in every variant).

**Terra review, round 6** (of `9e7614f`): **MERGE WITH NITS.** It traced the round-5 normalization and every earlier fix, and found no further concrete, reachable defect. Its one nit, a stale test count in this record (18 for 19), is corrected. The reviewer ran the 19 Node tests and discovery, and checked the proof checksums. It did not run the host proof.

The proof was then rerun once on the final code head (below).

### NOT_RUN and NOT_TESTED

| Surface | Status |
| --- | --- |
| Gate C: the frozen candidate, the owner's session, the verdict | **NOT_RUN**, each on its own word |
| Every real half above, the read-only capture on the owner's install, the owner's 1.18.0 host with a real ComfyUI | **NOT_RUN** |
| A real provider's policy refusal (J7) | **NOT_TESTED** |
| Whether ComfyUI v0.43.2 embeds `prompt` metadata in saved PNGs | **NOT_VERIFIED** until the capture runs |
| `demo.mjs --owner` (headed) | **NOT_RUN**; it shares setup, the guard and the observations with the proof |
| T79's auth, rate and error fixtures; two real tabs reserving at the same instant; physical devices and screen readers | **NOT_RUN** / **NOT_TESTED**, unchanged from PR C |

### Next bounded step

Owner review of this draft PR and the choices above, then the owner's merge decision. After that, each on its own authorization and none implying the next: the frozen Gate C candidate (with its own full campaign, registering these tests); the owner's decision on the session's host and the backup; the owner's Gate C session with the synthetic demonstrations and the real backend; the read-only capture; the verdict. This document starts none of them.
