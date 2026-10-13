# DYL-26: Minimal host storage feasibility spike

**Recommendation: REVISE.** A separate host-owned visual record with server-side CAS, explicit completion and authenticated user separation works in the isolated experiment. The remaining obstacle is a supported host identity/activation lifecycle. This proof uses **sealed synthetic fixtures and an experimental host activation API**; it does not establish production chat identity or native UI save safety. Do not deploy this patch or unblock persistent scenes.

[Tracking: DYL-26](https://linear.app/devils17/issue/DYL-26/sillynovel-m12-e-prove-targeted-visual-state-storage-with-revision). Design prerequisite: DYL-25. DYL-22/23 remain Backlog/blocked. Gate A remains **NOT_RUN**. No upstream request was published.

## Authorization and baseline

The owner supplied this statement in the assignment on **2026-10-12 (America/Phoenix)**: “The owner has approved the DYL-24 session-only visual-stage test.” Record **PASS for the bounded session-only prototype**. Durable visuals, imports, reload recovery and the full acceptance session are outstanding; this is not Gate A PASS. [Decision record](DECISIONS.md#owner-decision-and-bounded-assignment--2026-10-12-dyl-26).

The assignment authorizes DYL-26 only: disposable host modifications, isolated proof material and one open/unmerged SillyNovel PR, auto-merge off. It does not authorize release architecture selection, production persistence, a live installation change, permanent fork, upstream publication, required plugin, DYL-22/23, M1.3 or M2. No renderer, reducer, reader integration, generated assets or production extension files changed. The working stage remains session-only; no Saved indicator exists in this change.

| Item | Verified value |
| --- | --- |
| Initial supplied checkout, clean | `71e121050e8938690b3cf1003e7095fb6e2b9db5`, `codex/dyl-18-text-reader` |
| Fetched starting main / branch base | `0d3510816afb255e9d5eb3ef2c9e2335bcf962e0` |
| PR #11 | MERGED, merge `9f2065cb9d87c0de0e071971b4ae834634e5eee6` |
| PR #12 | MERGED, merge `0d3510816afb255e9d5eb3ef2c9e2335bcf962e0` |
| Linear starting state | DYL-19/21/24/25 Done; DYL-22/23 Backlog with blockers retained |
| Branch | `research/dyl-26-host-storage-spike` |
| Tested SillyNovel/proof SHA | `5b5065803ee8d4a98bcf6401a2eb87547417ebcb` |
| Pinned host | SillyTavern 1.19.0, `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Final host run ID | `117631d6-f477-402b-8b0d-be8944406da9` |
| Environment | Ubuntu 24.04.5 LTS, Linux `7.0.0-38-generic`, Node `v26.8.1`; loopback HTTP, two synthetic host users, separate authenticated cookie sessions |

The final pushed head is recorded in the PR/Linear handoff; it cannot be embedded in its own commit. Later report/evidence commits do not change the tested proof bytes. No provider/model or physical device was used. The inherited native UI campaign was not rerun; the new campaign operates the actual host through HTTP.

## Proof files and application

Only two host files change in the disposable checkout:

- `src/server-main.js`: three-line conditional mount **after** `requireLoginMiddleware`; existing cookie-session, user resolution and CSRF middleware run first.
- `src/dyl26-storage.mjs`: copy of [the test-only module](../tests/probes/dyl26/host-storage.mjs). No server plugin loader or production extension import is involved.

[Mount patch](../tests/probes/dyl26/host-mount.patch), [complete runner](../tests/probes/dyl26/host-probe.mjs), [stored-record results](evidence/dyl26/results.json), [pinned source inspection](evidence/dyl26/source-inspection.json).

| Proof component | SHA-256 |
| --- | --- |
| `host-mount.patch` | `52183a75145885fadc97accba4e838be613cb05ab6e4974767fc1cded193d51f` |
| `host-storage.mjs` copied into host | `8159d79a82d46e90d54295d31f3bd8a014377c625766b04868f3128cc3266a59` |

Together these are the reproducible host patch; the runner hash is also in results. The runner clones the pinned commit into its own `mkdtemp` directory, checks/applies the mount patch, copies the module exclusively, and reuses the supplied disposable host's installed `node_modules` through a symlink. It creates a separate config from the pinned default, enables host user accounts, and starts a fresh data root. It never starts the supplied checkout or reads its user data. A run UUID marker, root prefix and host-resolved user-root parent are checked before exposing the experiment.

To apply manually **only inside a disposable pinned checkout**, run `git apply --check` then `git apply` with `host-mount.patch`, and copy `host-storage.mjs` to `src/dyl26-storage.mjs`. Use the runner for setup/launch/cleanup: hand-launching against an existing data root is intentionally refused. With no `SN_DYL26_RUN` environment variable, the extra API is not mounted. Nothing here is an extension installation instruction.

Exact final verification commands, run from SillyNovel:

```sh
node --check tests/probes/dyl26/host-storage.mjs
node --check tests/probes/dyl26/host-probe.mjs
node tests/probes/dyl19/source-inspection.mjs /tmp/SillyTavern-m12-review
node tests/probes/dyl21/source-inspection.mjs /tmp/SillyTavern-m12-review
node tests/probes/dyl26/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl26-final-evidence
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-source-prefix.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test tests/m1-reader-browser.test.mjs
git diff --check
```

Use another **nonexistent** evidence directory for a repeat run; collisions refuse. The host checkout must have its pinned dependencies already installed. No dependency or test framework was added to SillyNovel. The EACCES case requires a non-root process and asserts that precondition. The runner has 15-second request and 30-second startup bounds, kills only its own child, verifies its ownership marker, removes only its own temporary tree, and checks that the supplied checkout's Git status did not change. Successful cleanup and the actual record snapshots are retained in results; the temporary host/data are not retained.

## Minimum API and trust boundaries

All experiment routes are POST under `/api/dyl26/`, behind the actual host's authentication and CSRF protections. JSON target fields are UUIDs, never paths. The fixed namespace is `sillynovel-dyl26`; the only visual payload is `{ background: null | "forest" | "tavern" }`. Extra payload fields and URLs refuse. This schema is synthetic, not a production scene schema.

| Operation | Experiment behavior |
| --- | --- |
| `target({clientId})` — equivalent to `getVisualTarget()` | Returns `{storeId, scopeId, chatId, clientId, viewToken}` for the experiment's current active chat; inactive client refuses. |
| `read({target})` | Revalidates authenticated store, sealed fixture, client/session and current visit; returns the exact stored record/revision. |
| `cas({target, expectedRevision, record})` | Revalidates again at transaction entry; compares the current disk revision; writes revision N+1 or refuses without mutation. |
| `client`, `catalog`, `activate` | Test-only host identity/activation scaffolding. Client IDs are host-issued and bound to the authenticated user plus cookie session. Each activation issues a fresh random visit token. |
| `barrier` | Test-only instrumentation to hold CAS before its final checks. It is not a production API or filesystem failure substitute. |

Files live under the **host-resolved** user directory in `sillynovel-dyl26/<chatId>.json`. The request cannot choose an owner path. The offline fixture creator initializes revision 0 with a null background; the first CAS uses expected 0 and commits revision 1. A missing file at any later operation is an error, including expected 0; CAS never silently recreates a deleted record.

Host profile/user middleware is existing supported host behavior. The storage routes, store/scope/chat UUIDs, enrollment catalog, client handles and activation protocol are **experimental additions**, not existing extension capabilities.

## Identity: what is and is not proven

The trusted fixture bootstrap creates all synthetic conversations with exclusive file creation, then invokes the copied host module's offline `enrollSynthetic`. That function allocates random store, scope and chat IDs and an immutable test catalog. New/copy/branch fixtures receive distinct chat IDs even though their transcript bytes are identical. A and B share `same.jsonl` under distinct card-directory scopes. Names, indexes and content hashes never generate the IDs.

The catalog stores an internal file locator plus a **seal**: device, inode, birth time and content hash. Every operation verifies the seal. This is conservative drift detection for sealed fixtures, **not durable native chat identity**. It refuses ordinary edits or atomic file replacements as well as rename. It is not portable across filesystem restore, cannot defend against adversarial inode reuse or external concurrent filesystem mutation, and is not proposed as a production identity scheme. Synthetic fixture creation is the identity authority in this experiment; arbitrary existing chats cannot be safely enrolled by filename.

Likewise, `activate` is explicitly called by the test clients. Native browser `CHAT_CHANGED`, card selection, eventless Temporary Chat and browser navigation are **not connected**. A → B → A is an experiment-protocol transition on the actual server, not a tested native UI lifecycle transition. A production client must also reject delayed completions against its current local view/source revision; no such integration was added here.

To remove this obstacle, the host needs a durable instance registry owned by its canonical lifecycle, with:

1. ID allocation at new/import/copy/branch creation; copies get new IDs even with identical bytes or imported metadata.
2. Stable character/group scope ownership and locator changes on rename without losing identity; deletion tombstones prevent reuse. Existing-chat adoption needs a reviewed migration/reconciliation protocol.
3. One consistent transaction/recovery boundary for registry changes and canonical file lifecycle, including native atomic saves. The visual service remains separate from transcript bytes.
4. Host UI activation/acknowledgement ordering, including eventless/temporary views, that revokes the previous visit before dependent visual work. Out-of-order activation requests need their own generation/ordering protocol; this sequential test does not prove that.
5. Persisted user-store identity and explicit backup/restore/import semantics. A filename, integrity slug, client-generated identifier or seal cannot substitute for these guarantees.

Relevant inspected seams: `src/users.js` resolves `request.user` and gates login; `src/endpoints/chats.js` owns get/save/rename/import/delete; `src/endpoints/groups.js` owns group chat operations; browser `public/scripts/bookmarks.js` constructs branches, and `public/scripts/chats.js` holds Temporary Chat in sessionStorage. No changes to those lifecycle modules were made. Their supported integration remains the next bounded technical task, not work authorized by this report.

## CAS, completion and failures

Within the single host process, the final seal/owner/visit check, disk read, revision comparison, temp-file write, file `fsync`, close and atomic rename execute synchronously with **no await** between them. Consequently, another request in that process cannot interleave a competing revision update or activation in the commit section. A delayed request waits *before* this section and is revalidated afterward. Web Locks are never used.

The HTTP success body is returned only after rename completes. Every successful result is compared to actual on-disk bytes. Rejected revisions do not create temporary files or partial records. A real directory-permission failure returns `WRITE_FAILED` and leaves old bytes/revision intact. Unknown/corrupt record schema, wrong embedded identity and negative revisions refuse without repair. Missing files remain missing.

Typed errors exercised: `WRONG_STORE`, `INVALID_CLIENT`, `INVALID_TARGET`, `STALE_VIEW`, `INACTIVE_TARGET`, `TEMPORARY_TARGET`, `INVALID_INPUT`, `STALE_REVISION`, `MISSING_RECORD`, `CORRUPT_RECORD`, `WRITE_FAILED`. Revision overflow has a refusal path but was not exercised. Identity-catalog damage/read failures have explicit refusal paths but were not fault-injected.

**Ceilings:** single process, trusted fixture catalog, small sealed chats. A second host process sharing this filesystem is unsupported: a synchronous event loop is not a cross-process lock. File `fsync` plus rename establishes completed file replacement and the tested process-restart recovery; no parent-directory fsync, power-loss, disk-full, fsync-failure or machine-crash durability is claimed. An HTTP response lost after commit leaves an uncertain client outcome; reread/reconciliation and request idempotency are future work. Holding a request barrier indefinitely is test instrumentation, not a deployable queue policy. The global host JSON body parser still has its existing large limit; production route quotas/limits must be designed before exposing any real API.

## Actual stored records and results

[Machine-readable evidence](evidence/dyl26/results.json) retains the raw visual-record bytes for **both users and every fixture at every check**, the host-issued catalog and seals, final canonical hashes, proof hashes and cleanup results. The probe checks every user's record is byte-for-byte unchanged on each typed error. It also compares canonical file hashes throughout the campaign.

One actual final record, A:

```json
{"storeId":"3a23dfe9-393f-4e26-b783-2a14436b862d","chatId":"7bbc89f9-fbb1-48cf-a556-aeb0b4950082","revision":3,"record":{"background":"forest"}}
```

A starts at revision 0/null, commits 1/forest, then the overlapping-writer winner commits 2/tavern. The loser receives `STALE_REVISION`. Both switch-race cases leave A at 2/tavern. Restart reads that exact record before a new visit commits 3/forest. Native rename and same-name recreation then refuse A writes, leaving revision 3 intact. B independently reaches 1/forest, and the second user's A reaches 1/tavern.

| Case | Actual result / classification |
| --- | --- |
| Initial state, CAS increment and immediate disk readback | PASS — EXPERIMENTAL_HOST |
| Two overlapping clients, same expected revision | PASS — both requests reached host barriers; first release commits once, second conflicts; no Web Locks |
| A → B and A → B → A while A waits | PASS — old view refused, no wrong-chat mutation; EXPERIMENTAL activation only |
| Same filename, distinct scopes, identical bytes | PASS — distinct enrolled UUIDs and isolated visual files |
| Anonymous request; second user; other cookie-session client handle | PASS — real host authentication/session separation; read/write refusals preserve both stores |
| Wrong store, scope/chat mismatch, random/expired tokens, path text and URL payload | PASS — refusals; no redirected writes |
| New/copy/branch | PASS for fixture enrollment only; native copy/branch UI and lifecycle NOT_TESTED |
| Temporary activation | PASS for explicit refusal/revocation in experiment; native Temporary Chat UI NOT_TESTED |
| Missing and three corrupt-record cases | PASS — no reset/recreate/overwrite |
| Actual EACCES at temp-file creation | PASS — HTTP 503, old bytes retained, no leftover temp file |
| Host shutdown/start | PASS — persisted IDs/record recovered; old in-memory client rejected; new visit required |
| Native `/api/chats/rename`, then byte-identical recreation at old path | PASS for safe refusal; rename identity preservation UNSUPPORTED |
| Enrollment collision and cleanup ownership | PASS — collision refuses, process/root removed, supplied checkout status unchanged |
| Canonical non-mutation | PASS — API only writes its namespace; all ten synthetic chat files hashed at each check. Native rename was a deliberate host action and its resulting bytes match the prior digest. The subsequent same-name fixture recreation was explicit test setup. |

**18/18 host checks PASS_WITH_IDENTITY_LIMITS** (three corruption cases are separate checks). [64/64 Node regressions](evidence/dyl26/node-tests.txt) and [24/24 actual-entry browser regressions](evidence/dyl26/browser-tests.txt) pass on the tested candidate's unchanged extension bytes (headless Chromium `151.0.7922.34`, synthetic host fixture with actual extension entry). Source inspection, syntax and diff checks passed. No GitHub CI result is claimed. The initial uncommitted development probe also passed 18 checks; final evidence comes from the committed, strengthened probe with cross-user write refusals, all-store byte comparisons and source-checkout cleanup verification. No failed host runs occurred.

## Security, maintenance and remaining architecture

The host's existing authentication and CSRF mechanisms can be reused. The experiment demonstrates two real host user stores and cookie sessions without secrets or real conversations. Client/model data cannot provide paths, URLs, namespace names or owner directories. No data was sent to a provider. Fixture records contain no card definitions, message text, provider settings or credentials.

A deployable capability still requires bounded payload parsing, namespace authorization, quotas, catalog validation/recovery, client expiration and resource limits, external-process consistency, filesystem/backup failure semantics and native lifecycle tests. The process-local client map and barrier endpoints are intentionally test-only. Reading/hashing an entire canonical fixture at each operation is a bounded proof convenience, not an acceptable production identity/efficiency solution. The mount patch must not become a permanent fork or required companion plugin.

Before accepting an upstream proposal, a maintainer would need to agree on host-owned IDs and lifecycle semantics, API version/capability discovery, extension namespaces, supported process/storage topology, atomic completion/durability semantics, recovery/migration, and a test matrix covering native user/card/group/chat workflows. This report does not imply maintainer acceptance, and no upstream issue or PR has been submitted.

**Immutable raster assets remain separate work:** host-scoped create-if-absent ownership, immutable revisions/content hashes, byte/dimension/decoded-format limits, no-overwrite guarantees, readback verification, reference-aware removal, recovery and quota behavior. This tiny visual metadata record proves none of those requirements and does not unblock DYL-22.

**Export/import remain separate work:** explicit bundles of visual records and referenced asset bytes, manifest/version/hash validation, source correspondence and binding checks, fresh host IDs on import, safe remapping, error/recovery behavior and a clear user portability promise. Native JSONL export does not include this namespace. No portable/synced storage claim follows from process restart readback.

## Owner decisions and next bounded step

Review whether to authorize **one native host identity/activation feasibility follow-up** covering new, rename, copy/branch, import, deletion, group/card ownership and Temporary Chat. Keep the current session-only stage while that question is resolved. Decide separately whether an upstream proposal may be published; this assignment grants no such permission.

Before any implementation for users, decide the supported host/version/topology, existing-chat migration and restore behavior, retention/deletion and portability expectations, asset limits, and whether to adopt a reviewed storage architecture at all. The existing single-visual-writer product policy is unchanged; accepting two competing CAS test clients does not select a multi-writer UX.

**REVISE:** the small record-store primitive is feasible, but native lifecycle identity and activation remain the bounded technical obstacle. Preserve DYL-22/23 and M1.3 blockers, leave the DYL-26 PR open/unmerged with auto-merge disabled, and keep Gate A NOT_RUN.
