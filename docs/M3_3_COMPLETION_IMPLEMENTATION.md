# M3.3 completion — implementation record

## PR A — request-module changes and the host image-folder probe

**Candidate, unmerged. Frozen `7660a53`**, based on main `f22a7e8` (the [owner rulings J1–J9](DECISIONS.md#owner-rulings-j1j9--m33-completion--2026-11-08) on the [M3.3 plan](M3_3_COMPLETION_PLAN.md)). Tracked by [DYL-215](https://linear.app/devils17/issue/DYL-215/sillynovel-m33-complete-the-first-image-route-for-gate-c-ledger-lease). No plugin, schema or adapter change. Because J8 checks locks before the layout, the reason sentence the existing UI shows for a lock change during a request changes, so this PR is a runtime change under H4 and carries the browser suite and a full campaign rather than Node evidence alone.

### What it adds

| File | Change |
| --- | --- |
| `src/image-request.mjs` | `staleReason` checks `LOCK_CHANGED` before `LAYOUT_CHANGED` (J8). `reviewText` renders an absent value as `null` (J8). `cacheHit({ payloadSha256, seedPolicy, jobs, catalogAssetIds })`: the latest imported job with the same payload identity whose asset is still in the catalog; a random seed policy never hits, since two random-seed reviews share their text but not their wire seed; refused, failed, cancelled, unknown, abandoned, discarded and stale jobs never hit (J3). `LEASE` (heartbeat 30 s, stale after 90 s), `leaseStatus` (`free`, `mine`, `held`, `stale`) and `takeoverSession`, which keeps the id, allowance, count and workflow hash and refuses a free or own lease (J2). `reconcileCandidates({ files, submittedAt, origin })`: host files at or after the submission that pass the result-path rule, sorted by time, malformed entries dropped, never a choice made for the user (J6). Nothing new is imported by the runtime yet; PR C wires these. |
| `src/stage-view.mjs` | The "A request from before is still running" problem line also shows when the pending request was cancelled by turning the session off, so Submit's wait after turning it back on has a reason (J8). |
| `tests/m3-image-request.test.mjs` | 74 tests (66 before). |
| `tests/m1-reader-browser.test.mjs` | The lock-change test now asserts the lock sentence; one new test for the toggled-session reason (125 browser tests). |
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

**Verdicts: J5 GO, J6 GO.** For PR C, as findings and not rulings: reconcile lists the root with `folder: '.'` and takes each file's time from `Last-Modified`; the delete control sends only the exact path the request returned, after the module's result-path rule, never a path SillyNovel built, because the host normalizes `..` inside the folder and its own check accepts the folder path.

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
3. **A lease held by another live tab can be taken over**, not only a stale one, because a reload looks like a different tab with a fresh heartbeat; `leaseStatus` distinguishes `held` from `stale` so the UI can word the two cases differently.
4. **`reconcileCandidates` never picks**; it returns the dated list and the user chooses.
5. **The probe uses the upload route for decoys**, not a real generation, so it measures the folder and routes, not the backend.
6. **Workers.** The module was written by a Codex sol worker whose sandbox could not commit; the coordinator committed it, made the one-line UI change and the two browser-test changes, and merged the probe written by a native Claude agent. A fresh senior review is recorded in the PR.

### Not covered

The owner's 1.18.0 install; files from a real generation; deleting inside a character subfolder; symlinks in the image folder; large folders and files written during a listing; physical devices. The ledger, lease, cache and reconcile are not yet used by the runtime.

### Next

The owner reviews this PR. PR B (storage plugin schema v3 and the ledger routes) starts only after that review.
