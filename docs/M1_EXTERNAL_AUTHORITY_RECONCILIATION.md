# DYL-46: External authority reconciliation

## PR #20 review corrections — 2026-10-15

**Feasibility: REVISE. Compatibility/merge recommendation: REQUEST CHANGES / HOLD.** The two reviewed boundaries now have direct replacement proofs: the failed-observation history survives restart, and the inspected post-revocation/pre-native failure completes as VERIFIED_REVOCATION. Complete inherited compatibility remains unresolved, and the unchanged Chromium suite currently has a failing assertion. PR #20 remains open/unmerged; DYL-46 remains In Review. No owner verdict or replacement-contract approval is inferred.

The owner supplied the senior review of head `20086abbdbe82087cd98ffef842faca8a8be8fb1`, authorizing these corrections within the existing experimental PR. Starting main remains `104610632a58481a63d948005c2c0f7a2d07f431`; pinned SillyTavern 1.19.0 remains `7e8663cd9c184a550b37238218bdd32c6efc68e9`. The supplied checkout at `4688646861274d9b5c993e9c478628d84c700144` and all production extension files remain unchanged. DYL-42 through DYL-45 campaign assertions and the actual-entry Chromium test file are unchanged.

Protocol proof is `37cef930fcbde90ccbb20071fa4834a3dddc91b6`. Final reconciliation/writer proofs and Node/Chromium runs use `b57257fde1190ca5b074ed276ba12591f40c7ec5`; the intervening commit changes only a test fixture's expired-client reuse. Host patch, runner and composed host module bytes are identical at both proofs. [Per-run revisions and inputs](evidence/dyl46/review/runs.json) and [all module/input hashes](evidence/dyl46/review/proof-hashes.json) retain that distinction. Final pushed head belongs in the PR/Linear handoff.

### Durable validation witness

A process-local drift map is insufficient. The correction removes it and journals **each identity-bearing canonical seal validation before inspecting that seal**. The provisioned witness file lives under `host-authority/validation/<host-root-digest>.json`, outside the entire restorable user data root. Its root, authenticated-account binding, store instance and trusted incarnation must match independent authority. A pending witness contains a host UUID, chat UUID, starting external generation and finalized registry digest. Clients cannot create, choose, clear or replay that capability.

Ordering is:

1. Authenticate and verify independent external/local authority, exact registry digest and a healthy provisioned witness.
2. Atomically persist pending validation with file fsync/rename. If this fails, do not inspect the canonical seal or authorize visuals.
3. Inspect the seal synchronously. A matching source clears only its owned validation witness before returning authority; failure to clear refuses and retains the witness.
4. A mismatch retains the witness while the internal revocation transaction uses its private validation UUID to acquire the existing external/local reservation. Ordinary readers, writers and enrollment cannot bypass pending validation.
5. Advance external intent before local revocation as before; disable only the observed chat, finalize local/external state, then clear the same owned witness. No await occurs during the final writes.
6. Any incomplete witness/transition stays refused across restart. There is no automatic replay, clearing, timeout, digest repair or reconstruction.

The known external-parent EACCES fault cannot erase the witness: its pre-created child directory has its own write permission. If the witness directory itself cannot be written, validation refuses **before a seal comparison**. This is an ordering guarantee, not an assumption that a second attempted write always succeeds. Both are in the same independently controlled host-authority trust boundary and must be retained together outside root snapshots. Host-authority rollback or hostile control of that boundary is still unsupported.

The former unsafe sequence is now a positive refusal regression: observed drift → external intent failure → exact canonical-byte restoration → restart twice → native text readable, old visual read/CAS and enrollment refused. The witness bytes remain identical. Actual external-directory EACCES, injected external-intent failure, witness begin/finalize failure, missing/corrupt/wrong-binding witness, process interruption, native/read concurrency and competing enrollment are included. Missing witnesses are never initialized from populated roots.

Native text loading alone may read ordinary transcript bytes before the visual envelope is built; it grants no identity. The journal precedes the identity-authorizing seal comparison. Unknown writes that are restored **before any successful observed validation** remain the separately retained unknown-writer counterexample.

This deliberately trades availability for durable refusal: an interrupted healthy validation may strand the whole store too. No production performance claim is made; the experimental synchronous per-validation fsync/rename ceiling is explicit in the patch. No multi-process, power-loss or parent-directory-fsync guarantee is added.

### Completed post-revocation outcome

The shared revocation helper can attest the exact inspected `dyl43-after-revoke` failure boundary: registry revocation was persisted, and the native caller has not resumed. It captures that committed registry digest under the current reservation owner. Response finalization checks ownership, serial/incarnation, no entered canonical boundary, the exact committed revocation digest and no inner pending registry before completing **VERIFIED_REVOCATION** at the advanced generation.

This is not VERIFIED_CLEAN_ABORT: scope/chat authority has changed and remains revoked. Native error status is preserved; held old CAS/load tickets refuse with INVALID_TARGET, while unaffected scoped authority remains usable. Rename/delete and multipart import are tested before and after restart. Multipart import deliberately revokes all existing scopes, so it cannot promise those old scopes remain usable; fresh unrelated native/visual work does succeed. Reservation/external-finalization faults retain pending refusal instead of restoring an old generation.

The attestation is restricted to the known pre-native failure site. Generic errors and partial canonical operations are not inferred safe from unchanged transcript bytes. A rename that already wrote a new card remains INDETERMINATE and refused. No arbitrary pending intent is cleared to obtain a passing suite.

### Current measured disposition

| Campaign | Reviewed submission | Corrected overlay | Disposition |
| --- | --- | --- | --- |
| New reconciliation | 43 expected, 2 unsafe controls | **56/56 expected = 16 inherited + 40 new; ONE unsafe control** | Lost-observation case now proves durable refusal; unobserved unknown writer remains unsafe |
| Unchanged DYL-42 writers | 33/33 | **33/33 complete** | Retained pass; an earlier common-setup timeout is preserved separately |
| Unchanged DYL-43 lifecycle | FAIL after 21 | **FAIL after 23** | Reviewed post-revocation rename/delete cases pass; next partial rename at `lifecycle-campaign.mjs:153` → `revoked:43` expects 400 INVALID_TARGET, actual 409 IDENTITY_UNAVAILABLE. Still blocks full compatibility |
| Unchanged DYL-44 generations | FAIL after 27 | **FAIL after 27** | External intent precedes local reservation-parent EACCES; next fixture create at line 177 receives EXTERNAL_LOCAL_MISMATCH. Conservative refusal unchanged |
| Unchanged DYL-45 authority | FAIL after 32 | **FAIL after 31** | Line 157 → `unavailable:50` expects store-wide 409 after the inspected post-revocation failure; new completed revocation correctly gives scoped 400. Malformed-header pending expectation at line 164 is now NOT_REACHED, still an intentional contract difference |
| Node TAP | 64/64 | **64/64** | No failures/skips |
| Actual-entry Chromium | 24/24 | **23/24 on both attempts** | Unchanged line 445 expects false, actual undefined from absent-source optional chaining. Test remains red; no assertion or production fix included |

Counts overlap. Passing prefixes are not full campaigns. No inherited assertion has been weakened, skipped or silently replaced. The reviewed lifecycle regression is fixed, but a full inherited pass is still unavailable; the new campaign explicitly proves partial-write refusal and finalization faults. Owner review is still required for the remaining scoped-versus-whole-store refusal contract and DYL-45's changed expectations. The requested implementation correction is not a blanket waiver of those assertions.

The Chromium result is separate from host reconciliation. Its assertion chains `getAttribute('src')` through `x?.startsWith('blob:')`; an absent source yields undefined although no stale blob source is present. This explains the assertion mismatch, but **does not convert either run to PASS**. The original test and runtime remain unchanged. The writer timeout occurred in the common provider UI setup before its new campaign; the successful retry does not erase that unsuccessful run or establish its cause.

### Safety and evidence comparison

| Boundary | Persisted evidence and result |
| --- | --- |
| External intent cannot persist after drift | Validation witness already committed; local registry/reservation and main external authority unchanged; restored canonical bytes and restart cannot release it |
| Validation witness cannot begin | No canonical seal comparison; no visual authorization; prior bytes preserved |
| Healthy validation cannot finalize witness | Pending witness survives restart; no authority returned |
| Witness missing/corrupt/account binding wrong | Refuse without reconstruction; native text remains readable in the tested file-level faults |
| Completed inspected post-revocation failure | Forward VERIFIED_REVOCATION; revoked identity never reenabled; healthy unrelated work resumes |
| Revocation finalization fails | Local or external pending remains; restart cannot apply the volatile attestation |
| Partial native rename | Both cards can exist with unchanged old transcript; never classified clean abort or completed revocation |
| Root-only rollback / forged local fields | Prior generation/digest checks remain intact; witness ownership cannot bypass them; old record bytes remain unchanged |
| Concurrent native/read/enrollment transitions | Shared reservation plus pending validation excludes losers; no nested reservation or competing mutation |
| Unobserved in-place write/restore | ONE retained unsafe counterexample; no new unknown-writer-exclusion claim |

[Transition bytes](evidence/dyl46/review/transition-bytes.json) include actual witness, external, reservation, registry, canonical and visual bytes/hashes for these cases. Complete raw JSON is losslessly XZ-compressed alongside the [run index](evidence/dyl46/review/runs.json). The previous submission's [run index](evidence/dyl46/runs.json), both unsafe controls and all old failed runs remain unchanged. All nine new host attempts, including development/failures, verify owned process shutdown, owned-root removal and unchanged pinned source checkout. [Preparation cleanup](evidence/dyl46/review/preparation-cleanup.json) is separate. [New checksums](evidence/dyl46/review/SHA256SUMS) and the original checksums both verify their respective evidence sets.

| Corrected proof input | SHA-256 |
| --- | --- |
| `tests/probes/dyl28/host-probe.mjs` | `31ca01fe42bfb57a1c072f5b5e58e254934e1902b96cf1971baf8ba5f9c8072e` |
| `tests/probes/dyl46/host-reconciliation.patch` | `48ef2ade7ac0d81e2b045dce30cd12102802e67e0e608ecd3942e790995e3a3f` |
| `tests/probes/dyl46/reconciliation-campaign.mjs` | `108308d5dc26d6607aa39e26c6b4cb77e2dc01a401fdcd81ef9997c2153d9761` |
| `src/dyl27-storage.mjs` | `58644831801c694ca63ac7a6c3ea555db0ff4d562a5f5e5b189054d51a2a7f8a` |
| `src/endpoints/chats.js` | `3fcfb3a198b589db474b6961277b7d8f27f1cb46bd84b7d218f6a27e1ab41316` |
| `src/endpoints/characters.js` | `6d62a3bc31ce2a8801a8410055aceba6654f9acb57a59ebae27c999351f50065` |
| `src/endpoints/data-maid.js` | `01c704f5df3d06c043e66dc0da8778f6901c591921089176aab3308ed41e52a1` |


Exact new host commands and output paths are recorded per run in the index. They use the original owned DYL-28 runner, pinned host and installed Playwright dependencies, with `SN_DYL46_TRACE=1`; reconciliation enables `SN_DYL46=1 SN_DYL44=baseline SN_DYL45=baseline`, while inherited comparisons apply `SN_DYL46=baseline` and select their original campaign. No dependency install, real provider, paid service, installed host/profile or production extension change occurred. Syntax of all composed changed host modules, Node/Chromium output, doc-link and whitespace checks, lossless XZ round trips, exact input hashes and owned cleanup are recorded. No hosted CI pass is claimed.

Whitespace verification preserves the original failed Chromium terminal output byte-for-byte. Its four blank lines containing spaces are checked separately with `core.whitespace=-blank-at-eol`; the unified patch retains its existing encoded-context exception. All other files use the ordinary check. Exact commands run:

```sh
git diff origin/main --check -- . ':!tests/probes/dyl46/host-reconciliation.patch' ':!docs/evidence/dyl46/review/browser-tests-attempt-1.txt' ':!docs/evidence/dyl46/review/browser-tests-attempt-2.txt'
git -c core.whitespace=-blank-at-eol diff origin/main --check -- docs/evidence/dyl46/review/browser-tests-attempt-1.txt docs/evidence/dyl46/review/browser-tests-attempt-2.txt
git -c core.whitespace=-blank-at-eol,-blank-at-eof diff origin/main --check -- tests/probes/dyl46/host-reconciliation.patch
```

**Remaining decisions and smallest next step:** keep REVISE / HOLD. Review the partial-native-operation refusal contract and the DYL-44/45 replacement expectations, and separately resolve the unchanged browser assertion before claiming complete regression compatibility. A durable witness recovery/migration service, unknown-writer enforcement and production persistence remain out of scope. DYL-22/23 blocked; DYL-24 session-only; M1.3/M2 unauthorized; Gate A NOT_RUN. No merge, Done status or further implementation follows automatically.

---

## Historical original submission — reviewed head 20086ab

The remainder records the original 2026-10-14 experiment. Its current-code descriptions, counts and known lost-observation limit are historical and superseded by the correction record above; the underlying evidence remains preserved.


**Feasibility: REVISE. Compatibility/merge recommendation: REQUEST CHANGES / HOLD.** The experiment recovers forward after specifically attested non-mutating failures and coordinates observed drift revocation with independent authority. It does not establish general failure recovery or complete inherited compatibility. No owner approval of a replacement contract is inferred.

The answer is **yes for the demonstrated clean-abort and completed revocation paths, with the independent authority intact; not for every failure history required by the broader contract**. Pending, partial and rolled-back stores remain refused. An unwritable external intent followed by unknown byte restoration and process restart has no durable observation history; the negative control demonstrates that limit rather than counting it as safety.

## Assignment, prerequisites and revisions

[DYL-46](https://linear.app/devils17/issue/DYL-46/sillynovel-m12-l-prove-safe-external-authority-reconciliation-after) is the actual issue created after SillyNovel searches for “reconciliation” and “M1.2-L” found no equivalent assignment. It belongs to M1.2 with completed prerequisite DYL-45 and related DYL-22/23; their blockers were not removed. The entire DYL-45 issue and its empty comment list were read. PR #19 was verified MERGED at `2026-10-15T06:32:14Z`; DYL-45 was verified Done, retaining REVISE.

- Owner assignment: 2026-10-14, America/Phoenix; bounded experimental M1.2-L only.
- Starting fetched main: `104610632a58481a63d948005c2c0f7a2d07f431`.
- Supplied checkout preserved: `4688646861274d9b5c993e9c478628d84c700144`.
- Branch: `research/dyl-46-authority-reconciliation`; worktree `/tmp/sillynovel-dyl46-worktree`.
- Pinned SillyTavern **1.19.0**: `7e8663cd9c184a550b37238218bdd32c6efc68e9`.
- Frozen proof: `1ae869f6b289a71a490fedf15799073e559c1ac2`. Final pushed head is recorded in the PR/Linear handoff, avoiding a self-referential report commit.

Only test tooling, a reproducible disposable-host overlay and documentation change. Production extension files remain byte-identical to starting main. DYL-24 remains accepted session-only; DYL-22/23 blocked; M1.3/M2 unauthorized; **Gate A NOT_RUN**. No permanent host fork, required plugin, production repair interface, upstream submission or real-data migration.

## Regression first

Before altering the protocol, the unchanged campaigns ran on frozen DYL-45 with DYL-44 enabled. Both completed 19 checkpoints and then exited 1, matching the supplied evidence. Additional instrumented runs captured actual files immediately before and after the failing native request; instrumentation changed no host protocol or inherited assertion.

| Original failure | Actual behavior | Disposition |
| --- | --- | --- |
| DYL-43 `lifecycle-campaign.mjs:133`, first F1 rename | Native registry EACCES returns 500 before card/transcript mutation; next visual read is 409 `IDENTITY_UNAVAILABLE`, expected 200 | Original clean-abort regression fixed; complete inherited lifecycle remains blocked later |
| DYL-42 `writer-campaign.mjs:114`, save following malformed header | `{bad json` returns HTTP 200 `{error:true}`; next ordinary save is 503 `EXTERNAL_LOCAL_MISMATCH`, expected 200 | See measured comparison below |
| Earlier DYL-45 writer overlay, after 28 checkpoints | Read-time registry revocation leaves external digest behind and next import refuses | Replaced by coordinated revocation; tested directly and in unchanged writer campaign |

The six requested DYL-45 evidence files were inspected: `overlay-lifecycle.json`, `overlay-writers.json`, `earlier-overlay-writers.json`, `results.json`, `inherited-lifecycle.json`, `inherited-writers.json`. Historical counts and failures are retained in [DYL-45's report](M1_EXTERNAL_STORE_AUTHORITY.md); its earlier 38/33 passes without the authority overlay are not used as new-overlay certification.

[Run index](evidence/dyl46/runs.json) links compressed, complete raw JSON, including unsuccessful runs. [Boundary bytes](evidence/dyl46/failure-boundaries.json) exposes the baseline failures without decompressing a complete campaign. Each boundary has base64 actual registry, reservation, external, character, transcript and visual bytes plus SHA-256 before/after; no secrets or user data. Base64 is a lossless encoding, not a hash-only claim.

## Outcomes and trust boundaries

Native HTTP status, canonical outcome and visual authority are separate. The external record's `outcome` is the last **completed** transition; pending intent supersedes that historical outcome. Errors do not silently clear it.

| Outcome | Required host evidence | Availability |
| --- | --- | --- |
| VERIFIED_CLEAN_ABORT | Current authenticated operation owner; validated starting external/local history; explicit inspected pre-write rejection; no entered canonical boundary; unchanged independently finalized registry digest; no registry pending | Finalize at already-advanced generation; prior healthy chat visits remain eligible |
| VERIFIED_COMMITTED | Inspected participating native success without JSON error; owned reservation/generation; complete local registry transitions with no pending; local and external finalization succeed | Fresh source/generation checks still required; native success alone does not grant visuals |
| VERIFIED_REVOCATION | Host-observed seal failure for a known registered chat; exclusive external/local transition; exact starting registry still verified after await; durable disabled entry and completed finalization | Affected chat permanently refused; healthy unrelated chat may resume |
| INDETERMINATE | Native writer entered, partial mutation, unclassified error, abandoned operation, failed finalization or incomplete local reservation | Retain pending/mismatch; no automatic release, timeout or restart repair |
| STALE_OR_ROLLED_BACK_ROOT | External/local serial/incarnation/digest mismatch before operation begins | Native text remains readable where safe; writer, enrollment and persistent authority refused |
| AUTHORITY_UNAVAILABLE | Missing/corrupt independent authority or wrong authenticated account/root binding | Refuse; never reconstruct from user-root files |

Client inputs cannot assert an outcome, operation UUID, generation, external directory, store identity or observed drift. Native authentication/CSRF choose the root/account. Existing account creation timestamp and exact resolved root binding are inherited experimental limits, not a production account-incarnation protocol. The authority directory is outside the restorable data root but uses the same test OS principal; an actor able to rewrite both sides defeats this assumption.

### What proves a clean abort

`beginOperation` first validates the independent authority against current local reservation and exact registry digest, advances external intent, then writes matching local intent. Its process-owned object records the starting digest and whether an inspected canonical boundary was entered. `verifiedCleanAbort` is called only from explicitly inspected pre-write rejection sites. It requires the active AsyncLocalStorage owner and matching local reservation; finalization independently rechecks owner, serial, incarnation, unchanged registry and absence of registry pending.

A content hash alone is never non-mutation evidence. Matching transcript bytes after a rename can coexist with a newly written card, copied directory or replaced ownership. The protocol does not undo a registry revocation or restore an incarnation. Only reservation metadata advances for a clean abort; registry identity, canonical and visual bytes remain unchanged.

The claim is limited to the patched host sites. All callers of the shared native mutation/revocation helpers and the new boundary hook were inspected; uninstrumented writers are excluded. No new dependency or generalized transaction framework was added.

### Native malformed import and failed rename

Pinned native JSONL import reads the upload, parses its header, validates header fields, then flattens and commits a conversation through `nativeMutation`. A local catch surrounding **only `JSON.parse(header)`**, and the missing-header-field rejection, attest non-mutation before any conversation writer. Native HTTP-200 error behavior is preserved. This covers both the inherited syntax-error fixture and DYL-45's `{}` fixture; it does not cover JSON converters, multi-output imports, malformed trailing records or errors after commit.

Character rename calls durable scope invalidation before its asynchronous card read, new-card write, directory move and old-card unlink. When that first registry persist fails with actual EACCES, the shared guard attests a clean abort only if no prior canonical boundary or registry change occurred in this owned operation. The original native 500 remains; reservation and external state finalize forward while the directory is still unwritable. Delete's equivalent guard and failed chat/import invalidation share the same proof rule.

A fault **after** successful registry revocation is not a clean abort: identity state already changed. A fault after new-card write is INDETERMINATE even when the transcript matches. This experiment retains conservative refusal for both; completing the first as a separately verified revocation is a possible bounded follow-up, not silently implemented here.

## Read-triggered revocation

`chatFor` never accepts a mismatched seal. It records a host-owned observation and throws an internal event containing the already-resolved chat ID/relative locator. The visual route catch or asynchronous native load-envelope catch handles that event; native transcript messages remain readable with null identity.

The internal transition uses the **same** `beginOperation` as native writers. It advances independent external intent before local reservation, awaits the deterministic test barrier, rechecks ownership and the original registry digest, rereads the known chat, writes only its disabled flag, finalizes local reservation and finally external history/digest. Restoration of canonical bytes during the await cannot cancel the observation. The triggering read still refuses; it never returns a stale target after completing reconciliation.

Competing native save/enrollment loses before mutation. A second read sees pending authority and refuses without starting a second transition. Writer-first ordering also refuses a read until the native reservation completes; a later read can observe/revoke. There is no nested reservation or lock wait cycle.

After complete scoped revocation, healthy unrelated chat visits remain valid because external store serial is not their per-chat write generation. During intent, the whole store conservatively refuses persistent authority. Failures after intent persist that whole-store refusal through restart. Old visual files remain on disk and cannot be modified through old CAS/load tickets.

### Failed observation ceiling

A failed external-intent write changes no local registry/reservation. Its observation remains latched in memory, so restoring canonical bytes does not enable the chat in the same process; a healthy retry records permanent revocation. Actual external-directory EACCES and an injected failure exercise this.

**Additional unsafe counterexample:** if that external write never succeeded, an unknown writer restores the old canonical bytes, and the process restarts, neither independent authority nor local files retain the observation. A fresh load can then accept the old durable identity. This is a missing durable refusal-history guarantee, not a successful reconciliation or safety pass. The unchanged unknown-writer counterexample is retained separately. No automatic recovery of a persisted pending intent is implicated: this case has no persisted intent at all.

An independently durable failure witness, or an enforceable exclusion of unknown restore writers, is needed for a stronger F1/restart contract. Recomputing the external digest, clearing pending or comparing current hashes cannot supply that history. This finding prevents an unqualified GO.

## Failure, concurrency and re-enrollment evidence

| Scenario | External state | Local state | Canonical mutation proven? | Recovery/refusal outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| Rename/delete first-guard EACCES | Generation +1 then CLEAN_ABORT | Serial +1; registry identical | No entry into canonical code | Healthy prior authority resumes | EXPERIMENTAL_HOST |
| JSONL syntax/field rejection | Generation +1 then CLEAN_ABORT | Serial +1; registry identical | Parser rejects before commit | Native error preserved; next save/restart succeeds | EXPERIMENTAL_HOST |
| Observed drift, successful reconciliation | Generation +1 then REVOCATION | One chat disabled, digest finalized | External writer caused drift; no canonical write by reconciliation | First read and old CAS/load refuse; unrelated chat works | SYNTHETIC + EXPERIMENTAL_HOST |
| F1 external write fails | Previous finalized authority retained | Registry/reservation unchanged | Reconciliation never entered local mutation | Refuse; same-process latch can retry after bytes restore | Injected + real EACCES, EXPERIMENTAL_HOST |
| F2 external commits, local begin fails | Pending at advanced serial | Old registry/local reservation | No local revocation | Restart retains mismatch; enrollment refuses | SYNTHETIC + EXPERIMENTAL_HOST |
| F3 local revocation commits, external finalize fails | Pending at advanced serial | Disabled chat, local intent cleared | No canonical write by revocation | Persistent authority refuses across restart | SYNTHETIC + EXPERIMENTAL_HOST |
| F4 process stops at reconcile barrier | Pending | Pending reservation; registry unchanged | Before local revocation | Restart retains exact intent; no adoption | Owned process stop, EXPERIMENTAL_HOST |
| F5 read revocation versus native save, both orderings | One owner | One reservation | Loser enters no native write | Busy/identity refusal; winner completes without deadlock | SYNTHETIC barriers + EXPERIMENTAL_HOST |
| F6 two reads trying reconciliation | Winner pending; loser cannot advance | Loser changes no registry/reservation | Loser never enters mutation | One owner; old target remains refused | SYNTHETIC barrier + EXPERIMENTAL_HOST |
| F7 partial character rename | Pending | Scope revoked | New card exists; old card/transcript remain | INDETERMINATE; never clean-abort | SYNTHETIC fault + EXPERIMENTAL_HOST |
| F8 wrong account / submitted store fields | Host-selected account only | Foreign registry/canonical/visual unchanged | Foreign native writer never entered | Wrong-store/schema/binding refusal | Two authenticated synthetic accounts |
| Clean-abort local/external finalize faults | Pending | Old registry; old or cleared reservation intent | No canonical mutation | Restart cannot replay volatile attestation | SYNTHETIC + EXPERIMENTAL_HOST |
| Missing/corrupt/wrong-account authority | Missing/corrupt/unbound | No reconstruction | No participating mutation | Native text readable; visuals/enrollment refused | SYNTHETIC + EXPERIMENTAL_HOST |
| Root-only rollback after participating save | Remains ahead | Snapshot serial/registry restored | Earlier authoritative save proven | Every recovery path refuses through two restarts | SYNTHETIC restore + EXPERIMENTAL_HOST |
| Forged local serial/incarnation/store UUID | Finalized digest still disagrees | Attacker-selected matching fields | No trusted transition history | No digest repair or clean-abort bypass | SYNTHETIC + EXPERIMENTAL_HOST |
| Unknown unobserved in-place restore/copy | Unchanged | Seal/generations appear unchanged | Outside participating contract | **Unsafe accepted counterexample** | SYNTHETIC |
| Failed observation + unknown restore + restart | No durable intent was written | No durable observation | Outside proved durable history | **Unsafe accepted counterexample** | SYNTHETIC + EXPERIMENTAL_HOST |

Re-enrollment tests cover completed healthy revocation; unrelated safe clean abort; pending and rolled-back-store refusal; an eligible enrollment losing to drift revocation then succeeding afterward; fresh scope/chat IDs with copied embedded metadata and identical transcript bytes; revision-zero/null new records with their own successful CAS; held old CAS/load rejection; and restart. Native delete/recreate explicitly retires a scope before enrollment; disabling one chat does not silently disable/enroll its whole character scope. No old visual record is copied or inherited.

## Measured regression comparison

| Campaign on new overlay | DYL-45 before | DYL-46 after | Exact disposition |
| --- | --- | --- | --- |
| Unchanged DYL-42 writers | FAIL after 19 | **33/33 complete** | **Fixed and fully passing**; malformed syntax and drift/digest failures no longer stop the campaign |
| Unchanged DYL-43 lifecycle | FAIL after 19 | **FAIL after 21** | First EACCES rename/delete regressions fixed; **still failing and blocking compatibility** at `lifecycle-campaign.mjs:143` → `revoked:43`: after injected post-revocation failure, expected 400 INVALID_TARGET, actual 409 IDENTITY_UNAVAILABLE |
| Unchanged DYL-44 generations | Original baseline 36/36 without DYL-45, including two unsafe controls | **FAIL after 27** | `generation-campaign.mjs:177`: next fixture create expects 200, actual 503 EXTERNAL_LOCAL_MISMATCH after external intent committed but reservation-parent EACCES prevented local begin; stronger refusal is retained |
| Unchanged DYL-45 authority | 46/46 expected, including one unsafe control | **FAIL after 32** | `authority-campaign.mjs:164` expects pending after `{}` malformed import; new specifically attested abort completes instead. **Intentionally changed**, replacement new checkpoints 19/20/31/32; owner contract review required |
| New DYL-46 reconciliation | Not present | **43/43 expected checkpoints = 16 inherited + 27 new** | Includes **two unsafe accepted counterexamples**, not safety guarantees |
| Existing Node | 64/64 | **64/64**, no skips/failures | Elevated TAP output records individual tests |
| Actual-entry Chromium | 24/24 | **24/24**, no skips/failures | Production entry/renderer, installed pinned host libraries |

Counts overlap and must not be added as independent scenarios. The unchanged DYL-42 run reaches its complete suffix, including malformed trailing import, failed canonical import and restart refusal. DYL-43's later suffix is NOT_REACHED on the new overlay. Its stronger store-wide refusal after an already-durable revocation is conservative, but the old scoped-availability expectation is not demonstrated unsafe merely by that fact: a verified revocation-finalization protocol could potentially satisfy it. That protocol is not implemented, so compatibility remains blocked rather than waived.

New checkpoints 28–32 directly prove unresolved-intent refusal across restart, including the DYL-44 external-before-local boundary. New checkpoints 19/20 prove the replacement healthy behavior for DYL-45's now-obsolete malformed-header pending expectation; this does not certify its unreached suffix. New checkpoint 36 proves partial mutation never becomes clean abort. Rollback and re-enrollment are directly exercised in the new campaign independently of stopped predecessor campaigns.

Runtime: Node **v26.8.1**, headless Chromium **151.0.7922.34**, Linux; deterministic loopback responder only. All 14 preserved runs, including failures/development, report owned host stopped, owned root removed, pinned source checkout present and status unchanged.

None of the DYL-42, DYL-43, DYL-44 or DYL-45 campaign files or assertions changed. Red campaigns retain their exact failure and unreached suffix; no prefix-only green result is reported as a complete pass. The new campaign supplies explicit replacement proofs for the expected stronger refusal paths, but owner review of the compatibility contract is still required. No owner-approved replacement exists.

## Reproduction and evidence

All host runs clone the pin into a fresh marked owned tree, reuse existing installed host/Playwright dependencies, create two synthetic accounts/cards/conversations, use loopback-only host/responder listeners, and close isolated Chromium contexts. External authority is in a separately marked directory outside the restorable user data root. No installed host/profile, real provider or paid service is used. Process stops target only the owned child. Cleanup checks require root removal, stopped child and unchanged supplied pinned source checkout.

From the focused worktree (each output directory must not already exist):

```sh
# The original frozen overlay failures; no SN_DYL46 patch enabled:
SN_DYL46_TRACE=1 SN_DYL44=baseline SN_DYL45=baseline SN_DYL43=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl46-baseline-traced-lifecycle
SN_DYL46_TRACE=1 SN_DYL44=baseline SN_DYL45=baseline SN_DYL42=1 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl46-baseline-traced-writers-v2
# Frozen new campaign:
SN_DYL46_TRACE=1 SN_DYL46=1 SN_DYL44=baseline SN_DYL45=baseline SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl28/host-probe.mjs /tmp/SillyTavern-m12-review /tmp/dyl46-final
# Exact inherited commands and output paths are in runs.json; each enables SN_DYL46=baseline.
node --test --test-reporter=tap tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-source-prefix.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-m12-review node --test tests/m1-reader-browser.test.mjs
node tests/probes/dyl42/source-inspection.mjs /tmp/SillyTavern-m12-review
node --check tests/probes/dyl28/host-probe.mjs
node --check tests/probes/dyl46/reconciliation-campaign.mjs
```

Syntax was also checked on the composed storage, chats, characters and Data Maid modules in `/tmp/dyl46-prep/host`. The runner reapplies every predecessor patch before the new overlay using `git apply --check`. Source inspection verifies pinned native bytes, separate from runtime evidence. Scope is one host process; file fsync plus rename is inherited, parent-directory fsync/power-loss/cross-process durability are NOT_TESTED. Process termination is not a machine crash claim.

Raw campaigns are losslessly XZ-compressed to avoid repeating many megabytes of cumulative synthetic registries. Read, for example, `xz -dc docs/evidence/dyl46/final.json.xz`. [Run index](evidence/dyl46/runs.json) lists results, counts, names, failures, cleanup, proof hashes and exact commands; [representative bytes](evidence/dyl46/representative-bytes.json) exposes selected transition values. [SHA256SUMS](evidence/dyl46/SHA256SUMS) covers every delivered evidence file. Development attempts remain separately labeled and are not final-head proof.

| Proof component | SHA-256 |
| --- | --- |
| `tests/probes/dyl28/host-probe.mjs` | `b3b4f5d195bb03392af565c254206127a20160532555cebdf00062dc1024c83d` |
| `tests/probes/dyl46/host-reconciliation.patch` | `413fd81c3a2d7d0e9a73b042d007ade260bb3a746d6bffa39a95a09f02e99014` |
| `tests/probes/dyl46/reconciliation-campaign.mjs` | `4b2b8c8d52432c31ad88328926c2dc9168dec623ce3c4e58f7db36d18bed5a17` |
| `src/dyl27-storage.mjs` | `decdc6c93e62acfe86cd15ca849070019f80c9ce4c11b3c204c0870cb409b4bf` |
| `src/endpoints/chats.js` | `3fcfb3a198b589db474b6961277b7d8f27f1cb46bd84b7d218f6a27e1ab41316` |
| `src/endpoints/characters.js` | `6d62a3bc31ce2a8801a8410055aceba6654f9acb57a59ebae27c999351f50065` |
| `src/endpoints/data-maid.js` | `01c704f5df3d06c043e66dc0da8778f6901c591921089176aab3308ed41e52a1` |

Representative actual values: failed rename advances external/local serial **14 → 15** with CLEAN_ABORT and unchanged registry digest `7cd45948f6a1a3a02037f2c1c01e8bafa6acf876a2629d5c71fc59d77baa5533`. The malformed `{}` rejection advances **20 → 21**. Completed read revocation advances **37 → 38** with digest `b7a3b5009a0fd1ac281a7f439187bd1e956cb324fb954a4ee94f752c8d10103e`.

The rollback snapshot has serial **67**; participating native save advances independent authority to **68**. After restoration and two restarts, local stays **67** and external stays **68**. Forging local serial 68/incarnation/store fields still fails the external registry digest. Obsolete chat is `6ffb2762-48dd-4992-965b-1e0e1803b1d7`; canonical SHA-256 is `2b77bd0bcb956079196250719450b29ec4f70242bebe985059c04b8f46414625`, retained visual SHA-256 `ebb01561e721f6f06a6a4696baac60b0cae04095d15ef6519d208879ea7302d7`. Raw canonical/visual, registry/reservation/external bytes and their digests are preserved in the linked evidence.


## Decisions, limits and next bounded step

The only owner authorization is this investigation and one open/unmerged PR. No owner decision accepts the red inherited compatibility or the lost-observation control. Owner decisions remain: acceptable scope/store availability during failure, independently durable failure evidence and authority backup ownership, supported writer participation/exclusion, account incarnation lifecycle, and whether to authorize the next proof. No timeout release, arbitrary registry repair, old-record migration, partial-write adoption or production repair button is proposed as implemented.

Automatically recoverable states are only live, authenticated, explicitly attested clean aborts and successfully coordinated revocations. Persisted pending intent or failed finalization needs a separately authorized future outcome-proof/recovery design; this patch does not replay volatile claims after restart. Old revoked targets remain permanently refused; fresh enrollment allocates independent authority. Rolled-back/forged roots and missing/corrupt external authority remain refused without reconstruction.

Unsupported: hostile control of both authority and root; rollback of authority itself; visual-only record rollback without canonical transition; portable backup restore; unknown writers; multi-process coordination; untested import converters and partial multi-output commits; arbitrary existing-chat migration; group persistence; account deletion/recreation; physical devices, other browsers/host versions, machine crash/power loss, real model/provider operation and owner experience.

**REVISE, with compatibility REQUEST CHANGES / HOLD.** Smallest proposed next task, requiring owner authorization: prove a durable refusal witness for an observation whose external intent cannot be written, and explicitly review the pre-native-but-already-revoked failure contract against the inherited scoped-availability assertions. Keep that proof separate from production persistence and all blocked downstream work. Do not merge this PR or mark the issue Done on the strength of the passing bounded checkpoints.
