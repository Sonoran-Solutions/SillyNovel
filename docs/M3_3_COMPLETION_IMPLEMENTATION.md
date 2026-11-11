# M3.3 completion — implementation record

**PR A merged — 2026-11-08.** [#92](https://github.com/Sonoran-Solutions/SillyNovel/pull/92) merged as `3dff21f` on the owner's word (“Merge, start B”).

**PR B merged — 2026-11-09.** [#93](https://github.com/Sonoran-Solutions/SillyNovel/pull/93) merged as `786b58a` on the owner's word (“Merge, start C”).

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

**Candidate, unmerged. Frozen `2ff328d`**, based on main `786b58a` (PR B merged). Tracked by [DYL-215](https://linear.app/devils17/issue/DYL-215/sillynovel-m33-complete-the-first-image-route-for-gate-c-ledger-lease). A renderer, adapter and client change under H4; no plugin or schema change.

### What it adds

| File | Change |
| --- | --- |
| `src/project-client.mjs` | One call per ledger route (session read, begin with optional takeover, heartbeat, end; reserve, transition, host-deleted; jobs, cache, cleanup) through the existing authenticated request and media type. Refusals are `StorageError` with the plugin's `code` (also the message) and its `details` (the `LEASE_HELD` holder); an unreachable plugin or unreadable reply is `STORAGE_UNAVAILABLE`, never a raw error. Existing calls keep their errors. |
| `src/host-adapter.mjs` | `image.listHostImages({ since })`: `POST /api/images/list` with `folder: '.'`, `sortField: 'date'`, then a same-origin GET with the host's headers per file, newest first, reading `Last-Modified` and `Content-Length` with the body cancelled, stopping at the first file older than `since`, at most 50 dated files; names the result-path rule refuses are skipped unrequested. Returns `{ ok, files: [{ path, mtimeMs, size }] }` or `{ ok: false, code }`. `image.deleteHostCopy(path)`: `POST /api/images/delete` with exactly that path, only after `resultPathProblem(path, origin) === null` (the folder, traversal, encoded, foreign and non-PNG paths never leave the page); `{ ok, code }`. Neither throws. |
| `src/project-scene.mjs` | `importFile` returns the stored asset id, so the ledger can record `imported` with it. |
| `src/stage-view.mjs` | Inside **Generate on this host**: the toggle begins the project's lease (`LEASE_HELD` names the holding tab, held or stale, with **Take over**); a 30 s heartbeat; `LEASE_LOST` ends the session here with a notice; off ends it; the allowance reads the row's `used`. Submit asks the cache, then reserves, then calls the host; every outcome is a transition. Unresolved rows from another page are listed with their time and host folder; after the deadline, **Reconcile** lists dated host files from the submission's second on and the user picks one (fetch, PNG check, Import and apply) or **None of these**; **Abandon**. **Use the previous result** beside **Generate again**. **Delete the host's copy** with its sentence. **Inspect sent requests** (read-only). **Review finished image jobs** and **Remove finished image jobs**. Without the ledger, generation refuses; the manual export and import stay. |
| `tests/fixtures/m3-comfy-endpoint.mjs` | A `refusal` step: an error history item whose message is a synthetic content-policy refusal (J7). |
| `tests/m3-image-ledger-client.test.mjs`, `tests/m3-image-adapter.test.mjs` | Client routes, encoding, typed errors and failure mapping; the listing walk, stop, skip, bound and failures; the delete path rule and status. Registered (discovery 18/6/1). |
| `tests/m1-reader-browser.test.mjs`, `tests/fixtures/reader-browser.html` | The mocked storage routes serve the plugin's own `image-ledger.mjs` over an in-memory SQLite database of the v3 schema (only project and asset lookups are stubbed), context-wide so a second page shares it. 11 new tests, then 4 for the senior review (held upload after a lost lease; an outage after the reservation; a reconcile with a held fetch; per-row host-copy deletion after a reload) and two review extensions (the takeover test now asserts the candidate goes with the lease; the reservation-gate test changes a lock while the reserve is held). The asset upload (`state.uploadGate`) and the host's file reads (`host.gate`) can be held. No earlier assertion weakened. |
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
10. **A candidate is the session's** (review finding 1). A generated candidate is shown only after its `candidate` transition is acknowledged; if it is not, nothing is shown and it is recorded `discarded` when the ledger answers. Losing the lease, or turning the session off, discards this page's generated or reconciled candidate. Import and apply checks that this page still holds the session the candidate came from and that its identity is current, before the upload and again before the uploaded PNG is applied (`importFile` takes a `still` check); otherwise nothing is applied and the row is recorded `discarded`, never `imported`. An import withdrawn while its asset is read undoes that install (the catalog entry, its object URL and the catalog revision, then the reducer is refreshed), so later manual commands see a consistent catalog (second review).

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

### Coordinator's commands and results (frozen `2ff328d`)

The coordinator reran every check on the frozen candidate from a clean worktree, under the orchestrator's supervisor (deadline 3400 s, bounded output), holding the host-wide heavy-job lock, on a disposable SillyTavern 1.19.0 host pinned at `7e8663c`, Node v26.8.1, Chromium 151.0.7922.34.

```sh
SILLYTAVERN_ROOT=<disposable pinned host> SN_PLAYWRIGHT_MODULE=<pinned Playwright> python3 tests/probes/dyl60/run.py docs/evidence/m3-3-c/campaign
python3 tests/probes/dyl60/validate.py docs/evidence/m3-3-c/campaign
python3 tests/probes/dyl60/check-discovery.py
```

| Suite | Result |
| --- | --- |
| Node (18 files) | 521/521 (503 before PR C plus 18) |
| Storage | 281/281 (plugin unchanged) |
| Browser actual-entry | 150/150 (126 before PR C plus 24) |
| Native campaigns | stage-library-migration 25, expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60, image-route 14 checkpoints |
| `validate.py` | PASS over 152 frozen inputs on the candidate itself |
| Discovery | PASS, 18/6/1 |

Package: [`docs/evidence/m3-3-c/campaign/`](evidence/m3-3-c/campaign/) with `run.json` beside it. The campaign took 1652 s; the supervisor reaped nothing at exit. Full campaigns also passed on `e06e89f`, `df549d9`, `89327f0` and `bc49d09` during the review rounds; only the frozen candidate's run is committed.

### Worker evidence (the fifth-review commit; the coordinator's full campaign passed 11/11 on `bc49d09`)

| Check | Result |
| --- | --- |
| Node (18 files) | 521/521 |
| Storage (`npm test`) | not rerun: the plugin is unchanged since 281/281 on `3567b2a` |
| Browser actual-entry | 150/150 (137 before PR C's reviews, then 4, 4, 2, 2 and 1 review tests; 2 tests extended). Each round's new regressions failed on the previous round's `src/` (`45a7d42`, `e06e89f`, `df549d9`, `89327f0`, `bc49d09`), except the second round's lost-reply coverage test, which passed on `e06e89f` |
| Native image-route campaign | run once on the commit holding this record, after it was written; the result is in the handoff. Earlier PASS on `0377b5f`, `779c15e` (twice), `2e5c50a`, `df549d9`, `89327f0` and `bc49d09`. Checkpoints A–E and G–O (F not run, as before), disposable pinned 1.19.0 host, fixture on an ephemeral port, no page errors |
| Discovery | PASS, 18/6/1 |

**The coordinator's campaign failure at image-route** (the first campaign, on `45a7d42`, after checkpoint B; that failed run's evidence is kept outside the repository and not committed) was a test-harness race, not a host exit: `host.log` ends with the host's own shutdown title, written by its SIGTERM handler when the harness closed it after the failure, and no exception. Playwright's request context keeps sockets alive in a shared agent that ignores the host's `Keep-Alive: timeout=5` hint, while the host (Node 26) closes an idle socket after `keepAliveTimeout` plus `keepAliveTimeoutBuffer`, 6 s. C's post-Save GET was the harness's first request since A's project PUT; the data root's file times put that gap at about 6 s (PUT about 10:17:03.3, Save about 10:17:09.3), so the request reused a socket the host was closing: `socket hang up`. A loopback reproduction against a plain Node 26 server with the same Playwright 1.62.1 reused the socket up to 5.9 s idle and reset 3 of 81 requests at 5.96–6.04 s; with `Connection: close` it reset none of 243. Earlier runs had other A-to-C gaps. The harness's `native` and `plugin` calls, and the probe's two direct asset GETs, now send `Connection: close` (`CLOSE` in `tests/probes/m2-director/harness.mjs`); no assertion changed. Other probes that call `context.request` directly (`m2-director/host.mjs` export GETs, the portability, storage, cleanup, folder and `dyl193` probes) have the same latent race and were not changed.

### Findings

- **A reload never leaves a late host file.** The host saves a generated image from the page (`saveBase64AsFile` after the generate request returns), so a page that dies mid-request saves nothing, and the host's generate route sends ComfyUI `/interrupt` when its socket closes. Reconcile can find a file only when the generating page lived on, as after a takeover from a second page (campaign M); after a reload it correctly finds none (campaign N).
- **The plugin allows `host-deleted` only on discarded, imported or abandoned rows**, so the host file kept by a cancelled request whose late result arrived (`stale` with a path) cannot be deleted from the UI. This matches J5's wording; it is a gap against plan 3.5's privacy aim, not a defect.
- **The plugin README's ledger table lists the cleanup reply as `{deletedIds,deletedCount}`**; the route also returns `deletedSessions` (PR B choice 6).

### Not covered

The owner's 1.18.0 install and real ComfyUI; two real tabs reserving at the same instant (the plugin's transaction decides; the browser suite and campaign take over sequentially); deleting inside a character subfolder; physical devices and screen readers.
