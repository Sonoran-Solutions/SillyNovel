# M3.3 completion planning proposal — candidates, cache, recovery and privacy on the first image route

**Planning proposal — NOT approved. Authorizes nothing.**
**Base SHA:** `ec13df3` (main, M3.2 complete).
**Date:** 2026-11-08, America/Phoenix. **Owner:** Dylan.
This document changes no runtime, test registration, owner ruling or gate. It proposes how roadmap step 3 of M3 (candidate approval, cache and deduplication, stale-job handling, privacy controls, application-side usage limits) completes the first image route so that Gate C can be demonstrated. Implementation, schema changes, any provider request, Gate C and the owner's session each need their own recorded authorization.

## 1. Inputs and boundaries

M3.2 is complete on main (`ec13df3`): one manual missing-background request through the host's Image Generation extension on standard loopback ComfyUI, with the request module's preflight, review text, allowance, reservation and staleness rules, measured on the pinned 1.19.0 host against the PR A fake ComfyUI. The real-backend run (its protocol and record are in `M3_2_REAL_BACKEND_RUN.md`, on the still-open docs PR for that run) is authorized and NOT_RUN; nothing in this proposal depends on its result, and nothing here is blocked by it.

| Input | Constraint carried into this proposal |
| --- | --- |
| [Roadmap M3 step 3 and Gate C](ROADMAP.md#m3--optional-asset-generation) | Demonstrate a cache hit, a new background, a rejected candidate, a timeout, a policy refusal, a cancelled or stale job and a configured usage limit, with reading and replying throughout; prove one eligible request never becomes duplicate jobs and a late image never replaces a newer scene; verify the data actually sent. |
| [M3.1 plan section 5](M3_1_IMAGE_WORKFLOW_PLAN.md#5-m33-and-m34-outline) | Cache keys over the full effective request; only approved project-owned PNGs satisfy a hit; coalesce identical requests and reserve before dispatch; Regenerate is a new request; outcomes stay distinguishable; durable candidate records need their own storage, schema, backup and cleanup design; close the reload and second-tab duplicate gap for the supported mode or refuse generation outside a proven single-owner session. |
| [I1–I10](DECISIONS.md#owner-rulings-i1i10--m32-first-image-route--2026-11-08) and the PR A, B and C acceptances | Loopback standard ComfyUI through the typed seam; five submissions per explicit session, one in flight, zero retries; text only; Cancel never interrupts the backend, Stop host job does; Abandon after the deadline; the review text is the payload identity. None of these is reopened. |
| [M3.2 PR C record](M3_2_IMAGE_ROUTE_IMPLEMENTATION.md#pr-c--the-adapter-seam-and-the-generate-on-this-host-section) | Three recorded limits (a lock during a request discards under the layout reason because the module checks layout before locks; two one-second settles in the campaign; Submit disabled without a reason after the session is toggled off and on in flight) and plan 3.5's unimplemented reload notice. |
| [Storage plugin contract](../plugins/sillynovel-storage/README.md#data-and-api) | SQLite at `<dataRoot>/.sillynovel-projects.sqlite`, schema v2 (projects with catalog, immutable assets), CAS saves, `NOT_FOUND` conceals foreign records, strict media types and caps, a PRAGMA-versioned migration path, the DYL-58 operator recovery CLI and DYL-57 portable bundles that carry selected artwork only. |
| [Privacy and retention](ASSETS_AND_PROVIDERS.md#10-privacy-and-credentials) | Prompts and references may contain private material; keep provenance local by default and offer a redacted export; independent controls to remove candidates, approved assets, cached jobs and visual metadata; a UI cancellation is not proof the backend stopped. |
| [AGENTS](../AGENTS.md) | Narrow adapter; host output is data; no canonical writes; nothing committed that is private; unavailable checks reported, never waived. |

## 2. What M3.2 left open, in Gate C terms

| Gate C demonstration | State after M3.2 | M3.3 must add |
| --- | --- | --- |
| Cache hit | Byte reuse on import only (identical PNG reuses project bytes). No request-level cache; a repeated identical Submit sends again. | A request cache keyed on the payload identity, satisfied only by an approved project-owned PNG, offering reuse with zero `/prompt`. |
| New background | Done synthetically (PR C campaign C); the real run is pending. | Nothing new; the real run records it. |
| Rejected candidate | Discard drops SillyNovel's preview; the host's retained file stays and is only disclosed. | Reject as a recorded outcome; an explicit, separate **Delete the host's copy** control (J5). |
| Timeout | Outcome unknown, slot held, Abandon after 120 s; a late result discarded. | Recovery: after an unknown outcome, reconcile against the host's image folder and let the user attach or discard what arrived (J6). |
| Policy refusal | Not represented: standard ComfyUI has no policy refusal. | A synthetic refusal fixture (T79) proving handling and no fallback; real-provider refusal stays NOT_TESTED and is labelled so. |
| Cancelled or stale job | Done synthetically for cancel, stop, chat switch, draft edit, scene change, allowance. | Reload with a job in flight (plan 3.5's notice) and a second tab (T78): both need a record that outlives the page (J1, J2). |
| Configured usage limit | Five per explicit session in memory; a reload starts a fresh allowance. | The allowance and reservations survive reload within one owner session (J1); unknown outcomes stay reserved across reload. |

The duplicate-job proof is the crux: with a memory-only ledger, a reload while a job is running lets the user begin a new session and submit again while the old job still runs, and a second tab cannot see the first tab's reservation. M3.1 plan section 5 allows either closing that gap or refusing generation outside a proven single-owner session; this proposal closes it with a durable ledger and a lease (J1, J2), because refusing after every reload would make the route unusable on exactly the slow backends it is for.

## 3. Proposed M3.3 contract

### 3.1 The image job ledger (plugin, schema v3)

A new plugin table set, owned by the storage plugin, namespaced away from scene state and the catalog, never part of portable bundles:

```sql
-- proposed; exact SQL is PR B's
CREATE TABLE image_sessions (id TEXT PRIMARY KEY, owner TEXT NOT NULL, project TEXT NOT NULL REFERENCES projects(id),
  tab TEXT NOT NULL, workflow_sha256 TEXT NOT NULL, allowance INTEGER NOT NULL, used INTEGER NOT NULL,
  started_at INTEGER NOT NULL, heartbeat_at INTEGER NOT NULL, ended_at INTEGER);
CREATE TABLE image_jobs (id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES image_sessions(id), owner TEXT NOT NULL, project TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL, workflow_sha256 TEXT NOT NULL, review TEXT, settings TEXT NOT NULL,
  state TEXT NOT NULL, submitted_at INTEGER NOT NULL, deadline_at INTEGER NOT NULL, settled_at INTEGER,
  host_path TEXT, result_sha256 TEXT, asset TEXT REFERENCES assets(id));
```

Rules: one open session per owner and project at a time (the lease, J2); `used` and every job row are written **before** the host call is made, so a reservation exists even if the page dies; states are the module's outcomes plus `unknown` (deadline passed, no settlement) and `reconciled`; a row is never deleted by the UI, only by the explicit cleanup control (J4); the `review` column is the review text (J4 decides whether it is stored or only hashed); `asset` links an imported result to the catalog asset so the cache can confirm the artwork still exists.

The plugin gains CSRF-protected routes under `/api/plugins/sillynovel-storage/projects/:id/image/`: `sessions` (begin with lease, heartbeat, end), `jobs` (reserve, settle, reconcile, mark), `jobs/:id` (read), `cache?payload=<sha>` (lookup), `cleanup` (preview and remove job rows and their orphaned host-path disclosures). Media type, caps, `NOT_FOUND` concealment and CAS discipline follow the existing routes. The migration v2 → v3 adds tables only; the DYL-58 recovery CLI learns the new tables; bundles exclude them.

### 3.2 Session lease and reconciliation

Begin image session acquires the lease: `{ owner, project, tab }` with a 30 s heartbeat; a lease whose heartbeat is older than 90 s is stale and may be taken over after the user confirms. A second tab or a reload sees an open session and is told who holds it and whether a job is unresolved; it may **Take over** (ends the old session, keeps its reservations and `used`) or leave it. After a takeover, an `unknown` or still-`pending` job is shown with its submitted time and host folder, and the user may **Reconcile** (3.3) or **Abandon** (unit stays spent, slot released). This replaces plan 3.5's unimplemented reload notice.

### 3.3 Recovery after an unknown outcome

Reconcile reads the host's image folder through the host's own `/api/images/list` route for files newer than the job's `submitted_at`, lists them with size and date, and lets the user choose one as **this job's result** (then the same path validation, fetch, PNG check and Import and apply as a fresh candidate) or none. Reconcile never guesses, never auto-attaches and never calls ComfyUI. The route's exact contract on 1.19.0 (whether the root folder can be listed, what `path` the delete route expects) is NOT_VERIFIED on source alone and is PR A's probe subject (section 7).

### 3.4 Request cache and coalescing

The cache key is the payload identity SillyNovel already has: `payloadSha256` of the review text, which covers destination, workflow name and hash, every generation setting, seed policy and the effective texts. Before Submit, the UI asks the ledger for an imported job with the same key in this project whose `asset` still exists in the catalog; a hit shows **Use the previous result** (zero `/prompt`, applies through the existing import gate as a reuse of project bytes) beside **Generate again** (a new job with a new identity, counted). A random seed policy never hits (the wire differs). Nothing is cached across projects or owners; a refused, failed, cancelled or unknown job is never a hit. Coalescing stays as in M3.2: one slot, disabled controls while pending, and the lease across tabs.

### 3.5 Candidate lifecycle and privacy controls

| Control | Behaviour |
| --- | --- |
| Approve (Import and apply) | Unchanged gate; the job row gets `imported` and the asset id. |
| Reject (Discard) | The job row gets `discarded`; SillyNovel's preview is dropped; the host's copy stays and its path is shown. |
| **Delete the host's copy** | A separate, explicit control on a rejected or imported job that calls the host's `/api/images/delete` for that exact path; never automatic; the row records `host_deleted_at`. Shown with the sentence that ComfyUI's own output folder may hold another copy that SillyNovel cannot see. |
| Inspect sent scope | A read-only view of the job row: the review text (or its hash, J4), settings, timestamps, outcome, host path. This is the "inspect what was sent" control the roadmap asks for. |
| Cleanup | A preview-then-remove control for job rows, like unused-asset cleanup; removing a row never removes an imported asset. |
| Redaction | Portable bundles exclude the ledger; the recovery CLI's inspection shows job rows with the review text masked unless the operator asks for it. |

### 3.6 Usage limits

I2 stands: five submissions per explicit session, one in flight, zero retries. M3.3 moves the count into the session row so a reload or takeover cannot reset it; `used` counts every reserved job including failed, cancelled, unknown and abandoned ones; cache hits and preflight refusals do not count. No dollar budget exists for the local route; any priced route (M3.4) needs per-submit approval and its own budget, as M3.1 plan section 5 says.

### 3.7 Small corrections folded in

M3.3 PR A (pure module) also: reorders `staleReason` so `LOCK_CHANGED` is checked before `LAYOUT_CHANGED` (the PR C limit), renders an absent numeric setting as `null` in the review text, and makes the "a request from before is still running" problem line key on `inFlight` rather than on an orphan, so the toggle-off-and-on case names its reason. These are the three recorded PR C limits; folding them in avoids a separate runtime PR.

## 4. Privacy and failure behaviour

The ledger stores what SillyNovel itself produced: hashes, settings, outcomes, host paths and (J4) the review text the user saw. It never stores chat text, cards, personas or the result bytes (those live in the catalog once imported). Everything stays in the plugin's database on the host; nothing leaves it except through the owner's own backup.

| Failure | Required behaviour |
| --- | --- |
| Ledger unavailable (plugin down) | Generation refuses with "the image ledger is unavailable"; the manual export and import stay available; no memory-only fallback that could duplicate a job. |
| Reserve succeeds, host call fails to start | Row settles `failed`; the unit stays spent; the user sees why. |
| Page dies mid-request | The row stays `pending` until the deadline, then `unknown`; a later session sees it and reconciles or abandons. |
| Lease takeover while the old tab is alive | The old tab's next heartbeat fails; it ends its session with a notice; its pending job is still reconciled in the ledger, not by that tab. |
| Host list or delete route refuses | Reconcile shows the refusal and offers Abandon; Delete the host's copy shows the refusal and leaves the row as it was. |
| Cache hit whose asset was removed | Miss; the UI says the previous result is gone and offers Generate again. |

## 5. Owner decisions J1–J9

**Ruled 2026-11-08:** see the [owner rulings](DECISIONS.md#owner-rulings-j1j9--m33-completion--2026-11-08). Every row adopts the recommendation. The table below is the proposal as reviewed.

| ID | Decision and options | Recommendation and reason |
| --- | --- | --- |
| J1 | Durable image ledger: A, plugin schema v3 with sessions and jobs as in 3.1; B, keep memory only and refuse generation after any reload or in a second tab. | **A.** B cannot prove "one eligible request never becomes duplicate jobs" and makes slow local backends unusable; A is the design M3.1 plan section 5 asked for. |
| J2 | Lease: A, one open image session per owner and project, heartbeat 30 s, stale after 90 s, explicit takeover; B, no lease, rely on the ledger's one-in-flight check alone. | **A.** B still lets two tabs reserve in a race; the lease makes the single-owner session provable. |
| J3 | Cache: A, key on the payload identity, satisfied only by an imported job whose asset still exists, offered as a reuse beside Generate again; B, no request cache in M3.3. | **A.** Gate C requires a cache hit with zero submissions; the key already exists. |
| J4 | What the ledger keeps of the prompt: A, the review text as shown, masked in operator inspection and excluded from bundles; B, only its hash. | **A.** The roadmap asks for an "inspect sent scope" control, which needs the text; it is the user's own prompt and settings, stored only in the local plugin database. B is available if the owner prefers. |
| J5 | Deleting the host's retained file: A, an explicit separate control per job through the host's delete route, after PR A's probe verifies the path contract; B, never delete host files from SillyNovel. | **A.** Privacy controls promised in the provider plan; explicit and per file, never automatic. |
| J6 | Recovery after an unknown outcome: A, reconcile against the host's image folder listing with the user choosing the file; B, Abandon only. | **A.** It is the only recovery signal that never contacts the backend; B throws away finished work on slow backends. |
| J7 | Policy refusal: A, a synthetic refusal fixture only, real-provider refusal labelled NOT_TESTED; B, defer T79 until a cloud route exists. | **A.** Gate C lists it; the fixture proves the handling path and the no-fallback rule. |
| J8 | Fold the three PR C limits and the `LOCK_CHANGED` order into M3.3 PR A: A, yes; B, a separate runtime PR first. | **A.** One frozen candidate and one campaign instead of two. |
| J9 | Sequence: A, four PRs (section 7: module, plugin and schema, adapter and UI, Gate C readiness), each reviewed before the next, then the owner's Gate C session; B, defer M3.3 until the real-backend run has happened. | **A.** The real run measures latency and usefulness, not the design here; it can land at any point. |

Already settled and not reopened: I1–I10, H1–H11, O04–O08, D4, D5, D7, Gate A and Gate B verdicts.

## 6. Gate C demonstration and evidence map

| Demonstration | Delivering slice | Evidence on the frozen candidate |
| --- | --- | --- |
| Cache hit | PR C | Second identical Submit shows Use the previous result; fixture `/prompt` count unchanged; a changed seed, setting or removed asset misses. |
| New background | M3.2 (done synthetically); the real run | Unchanged. |
| Rejected candidate | PR C | Discard records `discarded`; Delete the host's copy removes exactly that file (probe-verified route) and nothing else; catalog unchanged. |
| Timeout | PR C | Held backend past the deadline; `unknown`; reconcile lists the late file; attaching it goes through the import gate; abandoning keeps the unit spent. |
| Policy refusal | PR C | Fixture refusal step; `failed`, canonical data untouched, reading and replying continue, no fallback, unit spent. |
| Cancelled or stale job | PR C | Reload during a held job: takeover, pending row shown, reconcile or abandon; second tab refused by the lease; the M3.2 cases rerun. |
| Configured usage limit | PR C | `used` survives reload; the sixth Submit refused; unknown jobs stay reserved. |

Every row keeps the M2 rule: native campaign on the pinned host, canonical hashes unchanged, synthetic and real labelled apart. The owner's Gate C session uses the real backend and is its own authorization.

## 7. Proposed TESTING rows and PR boundaries

T78, T79 and T80 are already adopted. Propose, as NOT_RUN on authorization: **T81** image session lease (second tab refused, stale takeover, heartbeat loss); **T82** reload reconciliation (pending and unknown rows after reload, reconcile attaches only a chosen file through the import gate, abandon keeps the unit); **T83** host-copy deletion (exact file, refused paths, row state).

| PR | Boundary | Evidence |
| --- | --- | --- |
| M3.3 A | Pure module: cache key derivation, lease and reconcile state in `src/image-request.mjs`, the three PR C corrections (3.7); plus a **test-only host probe** on the pinned 1.19.0 host for `/api/images/list` and `/api/images/delete` contracts with decoy files (never the owner's install). | Node tests and the probe's record; browser, storage, native NOT_RUN for the module (H4). |
| M3.3 B | Plugin: schema v3 migration, routes of 3.1, recovery CLI awareness, bundle exclusion, README. | Storage suite (new tests), migration from a v2 fixture database, `recovery.mjs` inspection of a v3 database; no UI change. |
| M3.3 C | Adapter and UI: ledger-backed session, lease and takeover, reconcile, cache hit, Delete the host's copy, inspect sent scope, cleanup; fixture refusal step. | Browser suite, storage suite, full native campaign with an extended image-route step covering T78–T83's synthetic halves; affected device replay where reachable. |
| M3.3 D | Gate C readiness: record template, fixture scripts for the seven demonstrations, docs. | Validate the harness; reuse unchanged runtime evidence by SHA. Then the owner's Gate C session and verdict, each on its own word. |

## 8. Risks, exclusions and handoff

| Risk | Limit or mitigation |
| --- | --- |
| Schema v3 migration on a live database | Additive tables only; migration tested from a v2 fixture; the operator owns backups (DYL-55 still a release blocker). |
| Host image routes differ between 1.18.0 and 1.19.0 | PR A's probe measures 1.19.0; the owner's 1.18.0 stays NOT_TESTED until a real run. |
| Lease takeover misuse | Takeover is explicit, shows the old session's state, and never drops a reservation. |
| Ledger grows | Cleanup control and bounded rows per project (proposed 500); counts shown. |
| Reconcile picks the wrong file | The user chooses from a dated list; the file still passes path validation and the PNG check; nothing auto-attaches. |

Not covered: any cloud or RunPod route (M3.4), references or CGs, sprite generation, the real-backend run itself, release. No credentials, owner settings or private data belong to this proposal.

Recommended next bounded step: the owner rules on J1–J9; only then is M3.3 PR A assigned. This proposal starts nothing.
