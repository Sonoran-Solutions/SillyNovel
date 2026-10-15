# DYL-45: External store authority and explicit re-enrollment

**Recommendation: REVISE.** The bounded experiment detects metadata-preserving user-root rollback when external authority remains ahead, and explicitly re-enrolls a revoked/recreated character with fresh identities and independent visual records. It does not establish a production storage or recovery contract. Two unchanged inherited campaigns fail on the new overlay's more conservative availability semantics; those failures are retained, not counted as passes.

## Assignment and revisions

[DYL-45](https://linear.app/devils17/issue/DYL-45/sillynovel-m12-k-prove-external-store-incarnation-and-safe-character) was created after searches for “external store” and “re-enrollment” found no equivalent issue. It is in milestone M1.2, with completed prerequisite DYL-44 and related DYL-22/23. Their blockers were not changed. PR #18 was verified MERGED at `2026-10-15T05:49:32Z`; DYL-44 was verified Done with REVISE retained.

- Owner assignment date: 2026-10-14, America/Phoenix. Authorization is this test-only M1.2-K investigation and one open/unmerged PR.
- Starting fetched main: `3296835b842740cba4823e67983bdf6a72590829`.
- Supplied checkout preserved: `4688646861274d9b5c993e9c478628d84c700144`.
- Dedicated worktree: `/home/dq/.codex/worktrees/store-incarnation/SillyNovel`; branch `research/dyl-45-store-incarnation`.
- Pinned SillyTavern 1.19.0: `7e8663cd9c184a550b37238218bdd32c6efc68e9`.
- Final campaign proof: `1291fe610fe1a6700c4779b67fa4f4165df1fa49`; corrected-overlay inherited comparisons: `f8b19cd5c9f5e00a7a81822041092078d1b82a42` (identical host overlay; final commit only supplies missing native import fixture labels).
- Node/Chromium regressions: `68c4e18f892d1536d707726e5d1bc815e7281865` (unchanged production files). Complete original DYL-44 inherited comparisons: `b36dad30627dfc42994072412cb2305023bc988f`. Earlier overlay writer evidence on `68c4e18` is explicitly historical; the corrected patch now also refuses HTTP-200 native error bodies.
- Final pushed head is in the PR/Linear handoff, avoiding a self-referential report commit.

No production SillyNovel runtime changes. DYL-24 remains session-only, DYL-22/23 blocked, M1.3/M2 unauthorized, **Gate A NOT_RUN**. Engineering choices below are proposals demonstrated in a disposable host, not owner approval of release architecture.

## External ownership and restore boundary

The harness creates sibling directories inside a fresh, uniquely owned temporary tree: a restorable data root containing authenticated users and canonical files, and `host-authority/` outside that entire data root. The authority directory is mode 0700, files mode 0600, marked with the run UUID, excluded from snapshots, not statically served, and selected by host environment configuration. The mounted experiment checks the ownership marker and rejects a configured authority inside the data root. Native auth and CSRF precede every experimental endpoint.

This is a **separate restore/administration boundary**, not a separate OS security principal. The same test-owned server process can write both areas. A user with arbitrary access as that OS account, a malicious plugin, or an operator restoring both directories can defeat this trust assumption. Merely placing a file elsewhere does not protect it; the tested guarantee explicitly assumes the host-authority directory and host account database are not restored with the user root and cannot be edited through client requests. No hostile-filesystem protection is claimed.

No automatic authority bootstrap occurs. Test-only authenticated `POST /api/dyl27/provision` accepts an empty body and a never-enrolled store with no character/chat inventory, registry, reservation or external record. It generates IDs; it cannot adopt a populated restored store. The disposable clone's content seed index omits the bundled character and sprites to establish this empty initial condition; the supplied host is untouched. Provisioning writes external state first, then local state; a partial provision refuses subsequent attempts.

External records are located by the digest of the **host-resolved absolute root**, not a submitted owner string. They additionally bind the authenticated profile's handle and creation timestamp, and contain independently generated store/incarnation UUIDs. Client owner/store fields are rejected by the enrollment request schema. Same display name is not sufficient to select authority. Native profile creation timestamps are not a complete account-incarnation protocol; account deletion/recreation needs a stronger explicit lifecycle binding before production use.

Backup policy for this proof: snapshot user roots only; retain authority independently and never rewind it. Missing/corrupt authority, deletion of its directory, or restoration onto another host requires refusal and an independently reviewed recovery decision. There is no recovery endpoint. Restoring authority itself is **unsupported**; no higher trusted monotonic boundary is implemented.

## Minimal authority and ordering

The external object contains:

| Field | Meaning |
| --- | --- |
| `root`, `account` | Exact host root and authenticated `[handle, created]` binding |
| `storeInstanceId` | Host UUID used as local catalog store ID at initial creation |
| `trustedIncarnation` | Host UUID that must match the local DYL-44 reservation incarnation |
| `generation` | Monotonic participating-operation serial, compared to local reservation serial |
| `pending` | Host-issued operation UUID or null |
| `registryDigest` | SHA-256 of the last finalized local registry, or null before first scope allocation |

Authorization and permission to enroll are derived from these fields, not independently stored booleans. The registry digest detects a stale or altered registry even if the local reservation file has not rolled back. It is a consistency check against independent state, never an identity allocator. Visual CAS revisions, canonical source revisions, per-chat write generations, scope/chat IDs and activation visits retain their separate meanings from DYL-44. External store serial does not invalidate unrelated healthy chat visits by itself; per-chat evidence still does that job.

Ordering for every participating native writer and enrollment:

1. After authentication, reject a process-local competing writer. Validate external account/root binding, no pending intent, equal incarnation/generation and exact registry digest.
2. Allocate the operation UUID, advance the external generation and persist external pending intent **before** local reservation or canonical mutation.
3. Persist the DYL-44 local reservation with the same serial and operation UUID; install its AsyncLocalStorage owner. Native hooks and barriers recheck that owner.
4. Execute the inherited native lifecycle operation or explicit enrollment. Existing inner registry pending intent and revocations remain active.
5. At the native response boundary, verify the external operation UUID and generation, successful response status, no JSON error indication (native import can return HTTP 200 with `{error:true}`), and non-pending local registry. Finalize the local reservation first, then external digest/pending state last.
6. On any incomplete transition, retain pending/mismatch and refuse persistent load identity, activation, read and CAS. Restart does not repair, roll forward, or clear intent. Native transcript reads remain available without identity; participating writes may be blocked.

The last step intentionally permits a native HTTP success when canonical bytes committed but visual finalization failed. That response does not confer visual authority. Enrollment-returned IDs likewise require a subsequent accepted load before any persistent visual access.

All writes reuse `atomic`: exclusive temporary file, file fsync, rename. Parent directories are **not fsynced**. Native canonical writers have their inherited durability behavior. Tests cover process termination/restart and injected/permission failures, not machine crash, filesystem corruption, power loss, disk-full/fsync faults or cross-process locking. Response-end finalization only covers inspected native handlers, not arbitrary deferred writers.

## Explicit character re-enrollment

Test-only `POST /api/dyl27/reenroll` accepts exactly `{avatar}` from an authenticated store. The avatar is a validated single PNG filename used as a locator. The host requires exactly one previously registered **disabled** scope at that locator, a regular current PNG card whose native metadata parser yields a name, a non-symlink chat directory, and 1–32 regular JSONL files containing JSON objects. Unknown files, missing sources, conflicting live scope mappings and additional ownership fields refuse. This bounded inventory policy is not a production import parser or unlimited migration implementation.

Under the existing whole-store writer reservation, the endpoint validates card/chat seals and inventory again after its deterministic await. It persists local pending intent, retires all old-scope chat entries, replaces the disabled scope with a newly generated scope UUID, allocates new chat UUIDs/incarnations, and initializes **new revision-zero/null visual records**. It does not modify canonical card/transcript bytes. It never reads embedded identities to decide authority and never copies an old visual record. The old records remain on disk but their targets/tickets no longer resolve. Failure before local finalization leaves both new and old authority unavailable.

The successful scenario deletes a native-created character while retaining its chats, recreates the same display name and card filename, verifies refusal, then explicitly enrolls it. Identical transcript bytes and forged embedded store/scope/chat metadata do not preserve the former IDs. A new load/read/CAS succeeds independently; an old CAS held before deletion and an unaccepted old load ticket refuse after enrollment. A second successful scenario performs enrollment after restarting the host.

## Operation matrix

| Operation | External authority | Local generation | Re-enrollment/identity outcome | Old visual authority | Evidence/verdict |
| --- | --- | --- | --- | --- | --- |
| Native identical save | Advances before mutation | Advances; source revision unchanged | Existing chat identity retained | Old write-generation target refused | EXPERIMENTAL_HOST |
| Native delete/recreate character, same display/filename | Advances for each operation | Scope revoked, local serial advances | No automatic enrollment | Refused | EXPERIMENTAL_HOST |
| Explicit enrollment with byte-identical/forged metadata | Pending then finalized at next generation | Fresh scope/chat IDs and incarnations | New revision-zero record; new CAS succeeds | Held old CAS/load refused; old record unchanged | EXPERIMENTAL_HOST |
| Enrollment after restart | Existing independent authority retained | Fresh IDs under reservation | Succeeds for healthy revoked scope | Old scope never restored | EXPERIMENTAL_HOST |
| Two enrollments / enrollment versus rename/import/delete | One pending owner | Losing request never mutates | Winner enrolls, loser `RESERVATION_BUSY` | Remains obsolete | EXPERIMENTAL_HOST |
| Rename first, enrollment second | Rename owns pending state | Enrollment refuses before mutation | Native rename completes; no enrollment | Remains revoked | EXPERIMENTAL_HOST |
| Missing card / ambiguous inventory / client owner override | Intent stays pending after refusal | No published new identity | Deliberately refused | Unavailable | SYNTHETIC + EXPERIMENTAL_HOST |
| User-root rollback after participating native save | Remains ahead, unchanged by restore | Old serial/registry restored | No repair or adoption | Refused through two restarts | SYNTHETIC + EXPERIMENTAL_HOST |
| Unknown in-place write/restore or identical copy | Unchanged | Unchanged | Cannot detect unobserved history | **Accepted counterexample** | SYNTHETIC; NOT safety proof |
| Read-time observed drift | Digest no longer matches revoked registry | Durable local revocation | Subsequent writer blocked | Refused more broadly than DYL-44 | EXPERIMENTAL_HOST; inherited availability failure |
| Authorized restore | No endpoint implemented | Requires verified explicit generation transition | Not supported | No recovery claim | BLOCKED / NOT_TESTED |
| Rollback of external authority too | Higher boundary absent | Can restore matching old state | Unsupported | No guarantee | BLOCKED / NOT_TESTED |

The participating route list remains DYL-44's character create/rename/delete/import/edit-avatar, character chat save/import/rename/delete and Data Maid delete, plus explicit enrollment. Existing runtime import/copy/branch and group-refusal evidence is separated below. All other writers remain excluded: card field edits/duplicate, plugins, other processes, direct filesystem operations, startup/legacy migration, account reset/delete and uninstrumented formats. No comprehensive group identity is added. Visual CAS is not a canonical-writer generation transition; **visual-record-only rollback without an intervening canonical/identity transition is outside this proof**.

## Rollback comparison and failure matrix

The baseline runs the original DYL-44 campaign before adding the overlay. Its hardlink snapshot preserves original canonical inode/birth identity while native atomic saves replace their live paths. After root restoration, DYL-44 accepts the old durable chat identity and revision-one visual record under a new visit. This is an unsafe counterexample, not a safety pass.

The new campaign uses the same snapshot technique and saves only the user root, never the external directory. A native identical save advances external/local serials and the chat write generation. It stops the owned host, replaces only that owned root with its earlier snapshot and restarts. Exact registry/reservation bytes equal the snapshot; external bytes equal the newer state. Native text loads, but identity is null; old read/CAS and enrollment refuse. A second restart retains refusal and the unchanged bytes. Old process-local tickets also expire, independently of the durable rollback detection.

| Boundary | Actual ordering/control | Result |
| --- | --- | --- |
| F1 external write fails | Injected failure and real external-directory EACCES before external intent | No native or registry mutation; previous target remains usable |
| F2 external advances, local begin fails | Injected before local reservation write | Canonical unchanged; external pending survives restart; load/read/CAS/enrollment refuse |
| F2 native logical error | Native JSONL import returns HTTP 200 with `{error:true}` | External intent stays pending and refuses old authority through restart |
| F2 native mutation fails | Actual rename with deterministic throw after local revocation | Canonical unchanged; pending external state still refuses after restart |
| F3 canonical commits, registry finalization fails | Inherited DYL-43 finalization fault during identical save | Local pending and external intent retain refusal after restart |
| F3 local reservation finalization fails | Inherited DYL-44 finalization fault | External/local pending retain refusal after restart |
| F3 external finalization fails | Local finalization complete, injected before clearing external intent | External pending retains refusal after restart |
| F4 local registry missing/corrupt/stale | Remove, malformed JSON, or altered complete registry; restart | Readable native transcript, identity null, no rebuild; enrollment refuses |
| F5 external authority missing/corrupt/stale | Remove, malformed JSON, or reduced generation; restart | No bootstrap from populated root; no repair, read/CAS/enrollment refused |
| F6 interruption | Stop owned process while enrollment awaits deterministic barrier | Request transport failure, exact intent retained; restart refuses |
| Enrollment local finalization fails | New record creation followed by injected failure before catalog finalization | Neither old nor proposed new identities obtain authority after restart |

Fault resets in the harness restore only deliberately modified test bytes between independent cases. They are not recoveries offered by the host and confer no recovery guarantee. Missing/corrupt raw bytes are captured separately before restoring fixtures because the inherited evidence collector parses valid registries.

## Account and restore analysis

Pinned source inspection: `src/users.js` attaches a profile fetched from host `node-persist` to authenticated requests and resolves directories by handle; account records live in the data-root `_storage` directory. `src/endpoints/users-admin.js` creates profiles with `created: Date.now()`, removes records on deletion and may remove user directories. Those paths do not allocate a non-reusable durable account UUID or notify this authority. No full account lifecycle implementation was added.

| Situation | Required behavior / evidence |
| --- | --- |
| Another authenticated account submits the first account's target or enrollment locator | Wrong-store visual refusal and no matching revoked scope; runtime EXPERIMENTAL_HOST |
| Same handle, different creation evidence | External binding mismatch refuses; SYNTHETIC changed-binding control, not actual account deletion |
| Account deleted/recreated with same handle | Must revoke external binding and assign a fresh host account incarnation. Timestamp equality/replay and restored account DB remain unresolved; SOURCE_INSPECTION / BLOCKED |
| Root moved | Exact absolute-root key/binding no longer matches; explicit migration required. SOURCE_INSPECTION, no runtime portability claim |
| Root restored on another machine | Missing independent authority must refuse; copying authority as a workaround is not authorized migration. SOURCE_INSPECTION / BLOCKED |
| Backup contains registry but no authority | Populated-root bootstrap refuses, demonstrated by F5; recovery needs a separate trusted decision |
| External exists, local registry missing | F4 refusal; no guessing identities from canonical files |
| External exists, all local files missing | Must retain refusal; provisioning sees existing authority. SOURCE_INSPECTION / NOT_TESTED whole-root loss |
| Backup contains forged embedded identity metadata | Metadata ignored in successful fresh enrollment; no old record adoption. SYNTHETIC + EXPERIMENTAL_HOST |

Cross-device portability, account-reset support, external backup freshness and production recovery remain unproved. A timestamp is only a bounded additional host-profile check, not a substitute for the required account incarnation lifecycle.

## Reproduction and evidence

Run from the focused worktree with the existing disposable pinned checkout and installed dependencies. Choose new nonexistent output directories. All host runs use owned synthetic accounts/cards/transcripts, isolated headless Chromium, loopback host/responder listeners, UUID markers, bounded process shutdown and cleanup verification. No installed host/profile, real provider, user credential or paid service is used.

```sh
git fetch origin main
gh pr view 18 --json state,mergedAt,mergeCommit,url
# Original rollback counterexample on starting main:
SN_DYL44=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl45-baseline
# New frozen campaign:
SN_DYL44=baseline SN_DYL45=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl45-final-v3
# Unchanged inherited campaigns without new authority overlay:
SN_DYL44=baseline SN_DYL43=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl45-final-inherited-lifecycle
SN_DYL44=baseline SN_DYL42=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl45-final-inherited-writers
# Unchanged inherited assertions WITH new overlay; both exit 1, retained explicitly:
SN_DYL44=baseline SN_DYL45=baseline SN_DYL43=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl45-overlay-lifecycle-v2
SN_DYL44=baseline SN_DYL45=baseline SN_DYL42=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl45-overlay-writers-v2
node tests/probes/dyl42/source-inspection.mjs /tmp/SillyTavern-m12-review > docs/evidence/dyl45/source-inspection.json
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-source-prefix.test.mjs tests/probes/dyl19/*.test.mjs > docs/evidence/dyl45/node-tests.txt 2>&1
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test tests/m1-reader-browser.test.mjs > docs/evidence/dyl45/browser-tests.txt 2>&1
node --check tests/probes/dyl28/host-probe.mjs
node --check tests/probes/dyl45/authority-campaign.mjs
node --check /tmp/dyl45-prep/src/dyl27-storage.mjs
```

Preparation used an owned clone at `/tmp/dyl45-prep` to compose the predecessor overlays and generate the new unified patch. The runner always reapplies patches from pristine pinned source, in DYL-27 mount → DYL-28 module/envelope → DYL-42 → DYL-43 → DYL-44 → DYL-45 order. No dependency was added. Failed early fixture attempts and development runs are summarized in `development-runs.json`; they are not frozen proof results.

## Inherited compatibility and remaining decision

The unchanged DYL-43 overlay campaign stops after **19 completed checkpoints** (16 common + 3 lifecycle), at its former expectation that a read still returns 200 after a failed native rename's registry write. New external intent has already advanced, so the actual result is 409 `IDENTITY_UNAVAILABLE`. This is conservative refusal, but a real availability regression and not a full inherited pass.

The corrected DYL-42 overlay campaign stops after **19 completed checkpoints** (16 common + 3 writer): a native malformed import returns HTTP 200 with `{error:true}`. The corrected overlay retains external intent; the next operation refuses with `EXTERNAL_LOCAL_MISMATCH`. This is intentionally more conservative than the old continuation expectation, but the full campaign is **not a pass**. The final new campaign directly proves that this logical failure cannot reopen old visual authority after restart.

An earlier overlay candidate reached **28 completed checkpoints**, including native UI copy/two branches, swipe/continue/regeneration, group refusal and collision checks, before observed drift caused the external digest mismatch. It is preserved in [earlier-overlay-writers.json](evidence/dyl45/earlier-overlay-writers.json). That run exposed a gap: the initial implementation treated HTTP-200 error bodies as successful finalization. The final patch fixes that gap and its new F2 regression passes. Earlier successes are **not promoted to final-overlay certification**. Later inherited suffix checks are NOT_REACHED on the corrected overlay; full original DYL-44 comparisons remain available separately.

Read-time revocation still updates the local registry outside the new writer finalization, so observed drift causes durable external digest mismatch and blocks subsequent writers. This is a documented conservative limitation, not an automatic recovery design.

No inherited assertion was weakened or rewritten. Complete unchanged campaigns also run separately on DYL-44 for comparison. New failure checks verify that these conservative refusals survive restart and preserve canonical reading. The experiment therefore proves the central rollback/enrollment mechanism but leaves integration/recovery availability gaps: **REVISE**, not GO for release or universal writer support.

Smallest proposed follow-up, requiring separate authorization: prove one explicit refusal/recovery transition for read-triggered revocation and failed native operations, without accepting a rolled-back root. Account-incarnation lifecycle remains a separate prerequisite rather than implicit timestamp-based portability. Owner decisions are whether the whole-store refusal/contended-writer ceiling is acceptable, who owns and backs up the independent authority, and which writers can be excluded or required to participate. No recovery, production persistence, upstream work or later milestone is started here.


## Final measured results and hashes

New campaign: **46/46 expected checkpoints**, comprising **16 inherited + 30 new**. One new checkpoint deliberately reproduces the unsafe unknown-writer counterexample; it is **not a safety pass**. The baseline DYL-44 run has **36/36 expected checkpoints** (16 inherited + 20, including two unsafe counterexamples). Complete original inherited comparisons without DYL-45: lifecycle **38/38** (16 + 22; includes its unknown-writer control), writers **33/33** (16 + 17). Corrected-overlay unchanged campaigns each complete **19 checkpoints then fail**, as described above. Their totals overlap and must not be summed as independent scenarios.

Node **64/64**, actual-entry Chromium **24/24**, zero failures/skips. Runtime: v26.8.1, linux 7.0.0-38-generic; headless Chromium 151.0.7922.34. These are synthetic/owned-host results, not owner experience or physical-device/provider certification. Source checks, syntax, local documentation links and whitespace checks passed. All recorded final and failed comparison runs confirm owned host shutdown/root removal and unchanged supplied checkout. Preparation cleanup is independently recorded.

- [Final raw evidence](evidence/dyl45/results.json), [original rollback baseline](evidence/dyl45/baseline-dyl44.json).
- [Complete inherited lifecycle](evidence/dyl45/inherited-lifecycle.json), [complete inherited writers](evidence/dyl45/inherited-writers.json).
- [Corrected-overlay lifecycle failure](evidence/dyl45/overlay-lifecycle.json), [corrected-overlay writer failure](evidence/dyl45/overlay-writers.json).
- [Node output](evidence/dyl45/node-tests.txt), [Chromium output](evidence/dyl45/browser-tests.txt), [development attempts](evidence/dyl45/development-runs.json).
- [Pinned native inventory](evidence/dyl45/source-inspection.json), [account-source evidence](evidence/dyl45/account-source-inspection.json), [preparation cleanup](evidence/dyl45/preparation-cleanup.json).
- [Proof hashes](evidence/dyl45/proof-hashes.json), [evidence checksum manifest](evidence/dyl45/SHA256SUMS).

### Actual rollback and enrollment values

External generation advanced **70 → 71** before root restoration. Restored local serial was **70**, while the external generation stayed **71** through both restarts. The obsolete chat was `b9887f0e-3ffa-4a42-883c-2cce0097ef5a`; its retained revision-one visual record was refused, not deleted or adopted.

Successful explicit enrollment replaced scope `e7e555f0-3099-4e17-bed0-aef4f7a44ecb` with `c499cd01-d03d-4648-841e-bbce11c7146d` and old chat `c63a7a4e-eddd-474d-8f4c-7e06e2877c19` with `619ef5fe-df02-4cef-bca7-aed2856269f3`. The new record started revision 0/null and accepted its own CAS; the old record remained byte-identical. Raw current card bytes are retained as base64 plus SHA-256 at this checkpoint.

| Actual evidence | SHA-256 |
| --- | --- |
| Rollback canonical JSONL | `06515608f32ac3aee3f155b6374eea7833749338e67587cb850ec4fc3d4edc0d` |
| Restored registry | `aafea62719819c2b28989becd519c6f60453e7685dab26d87d2b908d0516f83f` |
| Restored local reservation | `70ca84c7de5ae171f9c3169be91091ca4bbd539dec716b6dfd7dc81bbef3816d` |
| External before native write | `3d3a624a0f90603abe59fefb960ec192e19ee32c585607b71855e49c38069444` |
| External after write and restore | `977d443d1002013511a2f2e2fba79ffae399811b24b25c106e0efdd4962a4c00` |
| Retained old visual record | `40b1908d47708c4fb04d9884486e9dbad056b5a94726ed35d96261e5b6f7874e` |
| Canonical card unchanged by enrollment | `1cf1a856767325511f896132cffa8881148ac1d2c7fd0e779b35feb102dfe12f` |

### Reproducible proof components

| Component | SHA-256 |
| --- | --- |
| `host-storage.mjs` | `77c5397c402e40bbc1580eb55e9f6df1559d1eaa7ab9ad5178e2ba86d4bd722a` |
| `host-visit.js` | `dd18e8e1b71aa3dc60e2e9e1c3e22f43064edab5f8435f5643acf0c24b2f9287` |
| `host-envelope.patch` | `e73905b37c59b20a6f9844050a4152e7c25a02d1bb6ccaa9e908968ae665996d` |
| `host-probe.mjs` | `aa0909524fd054f39dca2f1d29f530493db7f90a4ba21f24a0211c7da455e3d0` |
| `dyl27-host-mount.patch` | `a30ddf37b47c99d3db0e575df339e8fe3411b97914551a1351f9d0d6e312c6aa` |
| `dyl42-host-writers.patch` | `af14a89522f954345914f71762b436f9ff4d9db2d3f1b22557eafd9b3d6f3b83` |
| `dyl42-writer-campaign.mjs` | `210ecf940952bb2331d5e616eee6efc4317e2ad8d6c787aa9b85c5290a51fec7` |
| `dyl43-host-lifecycle.patch` | `232f3cef407229df54ad41e9026bde3fcc8076419dd1ac33f616c13fffd420c7` |
| `dyl43-lifecycle-campaign.mjs` | `05fceb5eb74b4eaa4a6045a99ca9a4a9b155246d0eb59a998838f8423f0b9571` |
| `dyl44-host-generations.patch` | `e4dae9a1a5d6f98db8bea0cabf589f80245dde1b150fe9c2981c7fd12770f5ce` |
| `dyl44-generation-campaign.mjs` | `66b5d35a6b99dbeb8514bce68d80941836139507549fd4412fcd02e72d51ed1f` |
| `dyl45-host-authority.patch` | `bb13288e7828b8551bf879a8674a94f2814866e674f4c7f208126e3222414497` |
| `dyl45-authority-campaign.mjs` | `127e3945eb1a27895b34999d92f45f8903401aa995b1bb15826ae88119584052` |
| `owned-content-index.json` | `3573dde3fda762bd77bda4464fbf250b309164475e45d61548275eeb65d5c2d6` |
| `applied-host-storage.mjs` | `3908cef7d8f341061ffb0b79cfcf26e406c788839ce3560ed5cde840550f15b2` |

Additional checks actually run:

```sh
git diff origin/main --check -- . ':!tests/probes/dyl45/host-authority.patch'
git -c core.whitespace=-blank-at-eol,-blank-at-eof diff origin/main --check -- tests/probes/dyl45/host-authority.patch
(cd docs/evidence/dyl45 && sha256sum -c SHA256SUMS)
```

A Python pathlib/re scan checked local Markdown links in the report, STATUS and TESTING; zero missing targets. The patch alone excludes unified-diff context whitespace from ordinary whitespace rules. The checksum manifest covers evidence files; proof input/module hashes are separately recorded above. Final pushed head and the open/unmerged PR URL are recorded in the Linear handoff.
