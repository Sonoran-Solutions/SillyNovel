# Verification and acceptance

## M3.3 PR D candidate — Gate C record template and demonstration scripts — 2026-11-11

No runtime change: `git diff --quiet 5518a51 HEAD -- src index.js style.css manifest.json plugins` is empty and no existing test file changes. PR C's campaign therefore stands for T74–T83 by SHA (tested revision `5518a51`), and `validate.py docs/evidence/m3-3-c/campaign` passes on this head. New and unregistered (discovery stays 18/6/1): `tests/probes/m3-gate-c/gate-c.test.mjs`, 16/16. One loopback proof of `demo.mjs` on the disposable pinned 1.19.0 host, on `3bcee56` (after all three rounds of the terra review's fixes): PASS. It covers the guard's tamper check, all seven demonstrations matching their expected changes, 12 Submit clicks = 12 `/prompt` = 12 ledger rows, canonical files unchanged, and the capture pipeline on its own synthetic data (the failed first run on `50e9b57` is retained). It is SYNTHETIC; it adds the on-page 120 s timeout with a late image, a reply during a held job, a newer scene during a held job, and a usage limit surviving a reload. The [Gate C record template](GATE_C_RECORD_TEMPLATE.md) is linked from section 6. Row text changes only at merge; T80 stays NOT_RUN in the matrix. Real halves NOT_RUN; a real-provider refusal NOT_TESTED (J7). [Record](M3_3_COMPLETION_IMPLEMENTATION.md#pr-d--gate-c-readiness). Gate C NOT_RUN.

## M3.3 PR C candidate — T78, T81, T82, T83 UI halves and the T79 refusal fixture — 2026-11-11

Full campaign on frozen `5518a51` on a disposable pinned SillyTavern 1.19.0 host, [`docs/evidence/m3-3-c/campaign/`](evidence/m3-3-c/campaign/): Node 521/521, storage 283/283 (2 new, the holder-only `imported` rule), browser 157/157 (31 new), native checkpoints 25/16/22/17/21/18/60/14, `validate.py` PASS over 152 frozen inputs; discovery 18/6/1. The image-route campaign adds checkpoints J (cache hit with the fixture's `/prompt` count unchanged, T78), K (the refusal step shown as failed with the unit spent and no retry, T79's refusal fixture only), L (Delete the host's copy removes exactly that file, T83), M (takeover from a second page, then reconcile of the late file through the import gate, T81, T82), N (a reload: the host interrupts the job and reconcile finds no file, T82) and O (ledger rows match). The browser suite covers the lease, reserve refusals, outages and lost replies, conflicts between pages, reconcile, cache, deletion, inspect and cleanup, an import after a takeover between heartbeats, and Discard of rows a reload left. T79's auth, rate and error fixtures stay NOT_RUN. Row text changes only at merge. [Record](M3_3_COMPLETION_IMPLEMENTATION.md#pr-c--the-adapter-and-the-generate-on-this-host-ui-on-the-image-ledger). Gate C NOT_RUN.

## M3.3 PR B candidate — T78, T81, T82, T83 ledger halves in the storage suite — 2026-11-09

Full campaign on frozen `9375642` on a disposable pinned SillyTavern 1.19.0 host, [`docs/evidence/m3-3-b/campaign/`](evidence/m3-3-b/campaign/): Node 503/503, storage 281/281 (155 new), browser 126/126, native checkpoints 25/16/22/17/21/18/60/8, `validate.py` PASS over 151 frozen inputs; discovery 17/6/1. The ledger's cache rows (T78), lease and takeover (T81), unresolved-job survival and resolution after a reload (T82) and host-deletion marking with path refusals (T83) are covered in the storage suite; the UI halves wait for PR C. Row text changes only at merge. [Record](M3_3_COMPLETION_IMPLEMENTATION.md#pr-b--the-image-ledger-in-the-storage-plugin-schema-v3). Gate C NOT_RUN.

## M3.3 PR A candidate — T78, T81, T82 rules in Node; T82 and T83 host halves on the pinned host — 2026-11-08

Full campaign on `7660a53`, reused for the final candidate `3827af7` (which adds only fail-closed guards in three functions with no runtime caller and four tests; Node 503/503 there, browser 126/126 on `fdfa313` whose runtime and browser test are the same; `validate.py` passes on a checkout of `7660a53` and stops by design on later candidates because the module and two test files are frozen inputs) on a disposable pinned SillyTavern 1.19.0 host, [`docs/evidence/m3-3-a/campaign/`](evidence/m3-3-a/campaign/): Node 500/500, storage 126/126, browser 125/125, native checkpoints 25/16/22/17/21/18/60/8, `validate.py` PASS over 149 frozen inputs. The host image-folder probe, [`docs/evidence/m3-3-a/probe/`](evidence/m3-3-a/probe/), 20 cases: root listing, `Last-Modified` timestamps, exact delete, refused traversal, folder-path 500, `..` normalization, CSRF. T78's cache rule, T81's lease rules and T82's reconcile filter are covered in Node; T82's and T83's host routes on the pinned host; the UI halves wait for PR C. Row text changes only at merge. [Record](M3_3_COMPLETION_IMPLEMENTATION.md#pr-a--request-module-changes-and-the-host-image-folder-probe). Gate C NOT_RUN.

## M3.3 rows adopted — 2026-11-08

Per [J9](DECISIONS.md#owner-rulings-j1j9--m33-completion--2026-11-08), rows T81–T83 from [plan section 7](M3_3_COMPLETION_PLAN.md#7-proposed-testing-rows-and-pr-boundaries) are added to the matrix below as NOT_RUN. T78–T80 keep their earlier adoption. No evidence is claimed by this entry.

## M3.2 PR C merged — T74, T76 and T77 rows annotated — 2026-11-08

On the owner's merge of [#88](https://github.com/Sonoran-Solutions/SillyNovel/pull/88) (`d31254a`, frozen runtime `afac1f9`), rows T74, T76 and T77 below carry their SYNTHETIC annotations from the PR C campaign ([record](M3_2_IMAGE_ROUTE_IMPLEMENTATION.md#pr-c--the-adapter-seam-and-the-generate-on-this-host-section), [evidence](evidence/m3-2-c/campaign/)); T75 keeps its PR B annotation with the UI gap the record names. The real route, the real 120 s wait on the host, physical devices and screen readers stay NOT_RUN or NOT_TESTED. No suite was run for this docs-only change.

## M3.2 PR C candidate — T74–T77 adapter halves covered — 2026-11-08

Full campaign on frozen `afac1f9` on a disposable pinned SillyTavern 1.19.0 host with the PR A fake ComfyUI as the image backend, [`docs/evidence/m3-2-c/campaign/`](evidence/m3-2-c/campaign/): Node 492/492 (17 files), storage 126/126, browser 124/124, native checkpoints 25/16/22/17/21/18/60/8, `validate.py` PASS over 147 frozen inputs; `check-discovery.py` PASS (17/5/1). T74's adapter half (one `/prompt` per Submit, workflow `deepEqual` to the shipped default, no decoys, zero text requests, settings and canonical files unchanged), T75's adapter refusals, T76's path validation and shared import, and T77's Cancel, Abandon only after the deadline, the late result after a timeout, Stop host job, timeout (fake timers), stale discard on a chat switch, a draft edit and a scene change, and allowance are covered against the real entry and on the pinned host; the new controls' keyboard pass is emulated. The real 120 s wait on the host, a manual lock during a request on the host, physical devices and screen readers stay NOT_RUN or NOT_TESTED. Row text changes only at merge. [Record](M3_2_IMAGE_ROUTE_IMPLEMENTATION.md#pr-c--the-adapter-seam-and-the-generate-on-this-host-section). Gate C NOT_RUN.

## M3.2 PR B merged — T75 and T77 rows annotated — 2026-11-08

On the owner's [acceptance](DECISIONS.md#owner-acceptance--m32-pr-b-merged-two-proposals-adopted-pr-c-go-ahead--2026-11-08) of [#86](https://github.com/Sonoran-Solutions/SillyNovel/pull/86) (`2bc9fea`, test candidate `883d59b`), rows T75 and T77 below carry their SYNTHETIC Node annotations from the PR B module tests ([record](M3_2_IMAGE_ROUTE_IMPLEMENTATION.md#pr-b--the-pure-image-request-module)); the adapter and host halves stay NOT_RUN for PR C. No suite was run for this docs-only change.

## M3.2 PR B candidate — T75 and T77 covered in Node — 2026-11-08

Node-level SYNTHETIC evidence on frozen `883d59b`, unmerged: T75's refusal rules (every plan 3.2 code, each triggered alone and all together) and T77's reservation and staleness rules are covered in `tests/m3-image-request.test.mjs`. Node 439/439 over the runner's 16 files; `python3 tests/probes/dyl60/check-discovery.py` PASS (16/5/1). Browser, storage and native NOT_RUN: a pure-module slice under the M2 evidence standard (H4). The adapter halves of T74–T77 wait for PR C. [Record](M3_2_IMAGE_ROUTE_IMPLEMENTATION.md#pr-b--the-pure-image-request-module). Gate C NOT_RUN.

## M3.2 PR A merged — T74 row annotated — 2026-11-08

On the owner's [acceptance](DECISIONS.md#owner-acceptance--m32-pr-a-merged-four-findings-adopted-pr-b-go-ahead--2026-11-08) of [#84](https://github.com/Sonoran-Solutions/SillyNovel/pull/84) (`3665f6e`, test candidate `75b2807`), row T74 below carries its SYNTHETIC annotation from the PR A probe ([record](M3_2_IMAGE_ROUTE_IMPLEMENTATION.md#pr-a--the-seam-probe-tests-only), [evidence](evidence/m3-2-a/)); the real route stays NOT_RUN. T75–T77 are unchanged. No suite was run for this docs-only change.

## M3.2 PR A candidate — T74 covered on the pinned host; T76 and T77 host halves; T75 NOT_RUN — 2026-11-08

One supervised probe run on frozen `75b2807` on a disposable pinned SillyTavern 1.19.0 host against the committed fake ComfyUI, [`docs/evidence/m3-2-a/`](evidence/m3-2-a/): fixture self-test 1/1, probe exit 0, R1–R8 PASS, H1–H9 recorded, `VERDICT GO`. T74's supported configuration is covered with decoys absent from both wires, and its four hazards are recorded (H1 and H2 on the image wire, H3 and H4 as text-model requests with decoys on the text wire); T76 and T77 have their host halves (result path and folder, non-PNG saved as `.jpg`, abort with the host's controller, chat-change discard, still polling after 15 s, the fixture's `/interrupt` entry); T75 and the adapter halves wait for PR B and C. No row text changes until the owner's review. [Record](M3_2_IMAGE_ROUTE_IMPLEMENTATION.md#pr-a--the-seam-probe-tests-only). Gate C NOT_RUN.

## T74 and T77 amended on M3.2 authorization — 2026-11-08

Per [I10](DECISIONS.md#owner-rulings-i1i10--m32-first-image-route--2026-11-08), the two clarifications proposed in [M3.2 plan section 6](M3_2_IMAGE_ROUTE_PLAN.md#6-testing-rows) are applied: T74 names its supported configuration and what “the wire” is; T77 separates the required “SillyNovel applied nothing” from the measured “ComfyUI stopped” and adds the Stop host job disclosure to the assistive pass. Both rows stay NOT_RUN. No evidence is claimed by this entry.

## T73 PASS by owner report; T60 wording accepted — 2026-11-08

The owner said “You can record that T73 passes and I accept T60 wording.” T73 is recorded as PASS on the owner's report alone: no devices, assistive tools or tested revision were given, and no agent ran or observed it. T60's Expected text is now the wording proposed in the [post-Gate-B cleanup record](POST_GATE_B_CLEANUP.md); its existing evidence annotations keep their original revisions. No suite was run for this docs-only change.

## M3.1 PR B candidate — T69, T70 and T71 covered; T72 partly; T73 NOT_RUN — 2026-11-03

Full campaign on frozen `66a0297` (rebased onto the merged cleanup `6f8cf24`), merged as #80 (`ad4279d`) on 2026-11-04, on a disposable pinned SillyTavern 1.19.0 host: Node 373/373, storage 126/126, browser 105/105, seven native campaigns; `python3 tests/probes/dyl60/validate.py docs/evidence/m3-1-b/campaign` PASS. Browser and native checks cover T69–T71; T72 has its detach half in the browser and its capture rule in Node. T73 (keyboard-only, narrow, scaling, touch and screen readers for the new controls) is NOT_RUN. [Record](M3_1_IMAGE_WORKFLOW_IMPLEMENTATION.md#pr-b--the-image-workflow).

## M3.1 PR A candidate — T69, T70 and T72 covered in Node — 2026-11-03

Node-level SYNTHETIC evidence on frozen `4b3a300`, unmerged: T69's text half, T70's validation and filename half, and T72's capture rule. Node 371/371 over the runner's 15 files; `python3 tests/probes/dyl60/check-discovery.py` PASS (15/5/1). Browser, storage and native NOT_RUN: a pure-module slice under the M2 evidence standard (H4). T71 and T73, and the browser halves of T69, T70 and T72, wait for PR B. [Record](M3_1_IMAGE_WORKFLOW_IMPLEMENTATION.md).

## M3 rows adopted — 2026-11-03

Per [H11](DECISIONS.md#owner-rulings-h1h11--m31-image-workflow--2026-11-03), rows T69–T80 from [plan section 7](M3_1_IMAGE_WORKFLOW_PLAN.md#7-proposed-testing-rows) are added to the matrix below as NOT_RUN. T69–T73 belong to M3.1; T74–T80 wait for M3.2 and M3.3, which are not authorized. No evidence is claimed by this entry.

## Gate B verdict PASS recorded — 2026-11-03

[Recorded](DECISIONS.md#gate-b-verdict--pass--2026-11-03) in the owner's words; the [Gate B record](evidence/gate-b/record.md) is the human gate record for candidate `6799a5e`: automated checks, hard gates, fixture counts and DYL-193 filled from evidence; real-session and E16 lines NOT_RUN by the owner's choice. The session host was SillyTavern 1.18.0 with the candidate's storage plugin, a deviation from the pin recorded in DECISIONS. Tablet text scaling, tablet reduced motion and screen readers stay NOT_TESTED. Plugin README follow-up: `dataRoot` must be absolute for the storage plugin.

## Gate B owner's session authorized on candidate 6799a5e — 2026-11-03

[Authorized](DECISIONS.md#owner-authorization--gate-b-owners-session-on-candidate-6799a5e--2026-11-03): the plan 6.3 protocol run by the owner on a disposable or backed-up host serving the candidate runtime, with the record's owner fields (session summary counts, E16 result per flow, feedback) filled from the owner's words only; no excerpts or labels from a private chat enter the repository. Agents prepare the host and transcribe; nothing automated substitutes. Gate B NOT_RUN until the owner's verdict.

## Gate B fixture evaluation run on candidate 6799a5e — candidate, unmerged — 2026-11-03

From a checkout detached at `6799a5e`: `timeout --foreground -k 15 3900 node tests/probes/m2-gate-b/run.mjs --owner-accepts-40-requests --origin http://127.0.0.1:8000 --out results.json`, headed, against the owner's regular SillyTavern install at ~/SillyTavern, release 1.18.0, git 8172dcd0e (not the pinned 1.19.0 7e8663c) serving SillyNovel by symlink from that checkout (served sender modules hash-equal to the candidate's); the owner selected the connection by hand (OpenRouter chat completion, model Xiaomi MiMo-V2.6-Pro, provider DeepInfra, no fallback models or providers) and pressed Enter. Then `node tests/probes/m2-gate-b/score.mjs results.json` against the recorded expected-answers SHA `ada4ff1e…`. 40 sent, 36 scored, 4 refused `NOT_SINGLE_JSON`, 0 failed, 0 not run; elapsed 542 ms min, 1681 ms median, 12889 ms max. Evidence: [`docs/evidence/gate-b/fixture/`](evidence/gate-b/fixture/) (`results.json` SHA-256 `0ee8748fd98431e4690a5060baad6a076a35de51a57aa794d16aa00d6e531c10`, `results-cases.json`, `score.txt`, `runner.log`); counts copied into the [Gate B record](evidence/gate-b/record.md). Two earlier launches never sent a request: the wrapper ran `timeout` without `--foreground`, so the runner was stopped on its terminal read. Observation for the test file: after “Finished” the runner process does not exit on its own. T18 and T67 are amended below; merging this record is the owner's acceptance of it. Gate B NOT_RUN.

## Gate B fixture evaluation authorized on candidate 6799a5e — 2026-11-03

[Authorized](DECISIONS.md#owner-authorization--gate-b-fixture-evaluation-on-candidate-6799a5e--2026-11-03): `tests/probes/m2-gate-b/run.mjs --owner-accepts-40-requests` once, headed, from a checkout at `6799a5e`, against a host the owner names where the owner selects the connection by hand; the runner refuses a host serving different sender modules; results JSON committed with the scorer's per-category counts (T18 measured for the first time; T67 then measures direction). A failed or not-run case is reported, never retried. Gate B NOT_RUN until the owner's session and verdict.

## DYL-193 replay merged — matrix rows amended — 2026-11-03

On the owner's [acceptance](DECISIONS.md#owner-acceptance--dyl-193-replay-merged-on-gate-b-candidate-6799a5e--2026-11-03) of [PR #71](https://github.com/Sonoran-Solutions/SillyNovel/pull/71) (merge `cf31c38`), rows T12, T28, T52 and T61 carry the amendments the [record](DYL_193_REPLAY_RECORD.md#proposed-amendments-to-the-testing-matrix-text-only-rows-change-at-merge) proposed, citing probe heads `1334287` and `8f784f0` on runtime `6799a5e`. Reproduced before merge from a scratch worktree at `62a1f16`: `python3 tests/probes/dyl193/validate.py docs/evidence/dyl193` PASS, `check-discovery.py` PASS 14/5/1, Node 465/465 at `556e18b` on the pinned host (reused; only the validator line, docs and two deleted cache files differ). Screen readers, tablet text scaling and tablet reduced motion stay NOT_TESTED. Gate B NOT_RUN.

## DYL-193 replay — candidate 6799a5e, unmerged — 2026-11-02

Probe head `1334287` for the desktop campaign and `8f784f0` for the device run, both with the runtime byte-identical to candidate `6799a5e` (`git diff --quiet` over `src index.js style.css plugins manifest.json` empty; only `tests/probes/dyl193/` added). `python3 tests/probes/dyl193/run.py docs/evidence/dyl193 6799a5e…` exit 0 (scaling, motion, assistive, groups rows PASS on pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Chromium 151.0.7922.34); `node tests/probes/dyl193/device.mjs` run 4 PASS on the Galaxy Tab S8+ (Android 16, Brave 1.98.63 / Chromium 156) with runs 1 to 3 retained as probe corrections; `tests/probes/dyl193/validate.py` PASS; `check-discovery.py` PASS 14/5/1. T12's group half is covered on the real host (branch and checkpoint through the host's own controls). T28 and T61 gain physical coverage (real pinch to 2.0, keyboard open, reply field with the disclosure open) and keep tablet text scaling and reduced motion NOT_TESTED; T52's tablet note stays. Proposed amendments are in the [record](DYL_193_REPLAY_RECORD.md#proposed-amendments-to-the-testing-matrix-text-only-rows-change-at-merge), not applied here. Desktop results are SYNTHETIC where a preference or zoom was emulated; the screen reader is NOT_TESTED on both. Gate B NOT_RUN.

## DYL-193 replay authorized on candidate 6799a5e — 2026-11-02

[Authorized](DECISIONS.md#owner-authorization--dyl-193-replay-on-gate-b-candidate-6799a5e--2026-11-02): the deferred physical scaling, 200% zoom, reduced-motion, assistive-technology, tablet touch-flow and native group branch/copy rows run against candidate `6799a5e`, recorded in the `docs/evidence/dyl60/` layout with retained failures. Rows reached on the actual device become TESTED with their evidence cited by SHA; rows not reached stay NOT_TESTED and say why. Synthetic emulation of a preference or zoom is recorded as synthetic, never as the physical row. Matrix rows change only when the replay's record merges. No runtime change in this step. Gate B NOT_RUN.

## Gate B candidate frozen on reused evidence — 2026-11-02

Candidate main `6799a5e`, [frozen by the owner](DECISIONS.md#gate-b-candidate-frozen--6799a5e--2026-11-02). Hard-gate evidence is the [M2.4 PR D campaign](evidence/m2-4-d/campaign/) on `e37d6b5`, applicable because runtime and test files are byte-identical between the two SHAs (empty `git diff` over `src tests index.js style.css plugins`); it is cited as tested on `e37d6b5`, not as a run on the candidate. Reproduced from the candidate: `validate.py docs/evidence/m2-4-d/campaign` PASS and `check-discovery.py` PASS (14/5/1). The [Gate B record](evidence/gate-b/record.md) holds the filled fields. Matrix rows are unchanged. T18, the DYL-193 rows and every owner row stay NOT_RUN or NOT_TESTED. Gate B NOT_RUN.

## M2.4 PR D merged; T67 and T68 amended — 2026-11-02

PR D [accepted](DECISIONS.md#owner-acceptance--m24-pr-d-merged-m24-complete--2026-11-02) at `9797c47` (frozen `e37d6b5`): `validate.py docs/evidence/m2-4-d/campaign` PASS reproduced from the repository (Node 362, storage 126, browser 103, six portability scripts, director campaign 60 checkpoints on pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`); `check-discovery.py` PASS (14/5/1). T67 and T68 are amended below per G14 and now name their coverage; the native blocks the candidate entry below lists as newly covered stand. The failed campaign on `f74423d` is retained beside the package and is not evidence for any claim. T18 stays NOT_RUN: the fixture set is on main but unmeasured, and the fixture run is its own authorized step. Gate B NOT_RUN.

## M2.4 PR D candidate — T67 and T68 covered — 2026-11-02

Frozen `e37d6b5`, candidate and unmerged: Node 362/362, storage 126/126, browser 103/103, six portability scripts, director campaign 60 checkpoints on pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`; `validate.py docs/evidence/m2-4-d/campaign` PASS; `check-discovery.py` PASS (14/5/1). T67 is covered by Node and a loopback-only runner proof. T68 is covered on the synthetic rejecting backend, with each flow's outcome recorded in the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-d--gate-b-readiness). Also covered on the host, from earlier NOT_RUN rows: swipe, regenerate and Continue invalidating automatic layout; project replacement and removed art under the overlay; a manual edit while a request is outstanding; stage-view catch-up; “message changed” after a real swipe (regenerate leaves no row at the selected message; the record says so); a correction after a real swipe. The failed `f74423d` run is [retained](evidence/m2-4-d/failed-f74423d/). T67 and T68 row text changes only at merge, per G14. T18 stays NOT_RUN until the fixture run; Gate B NOT_RUN.

## M2.4 PR C merged; T50 and T57 amended — 2026-11-02

PR C [accepted](DECISIONS.md#owner-acceptance--m24-pr-c-merged--2026-11-02) at `34dfcd8` (frozen `c6f6ec7`): `validate.py docs/evidence/m2-4-c/campaign` PASS reproduced from the repository (Node 346, storage 126, browser 103, six portability scripts, director campaign 47 checkpoints); T63–T66 covered per the [PR C record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-c--corrections-and-the-director-may-move-control). T50 and T57 are amended below per G14. T56 and T57 also lose the “PR C not authorized” note left from the M2.3 plan: that PR C merged on 2026-11-02 and both rows were covered by its campaign. The failed campaign on `ed80339` is retained beside the package and is not evidence for any claim. T67 and T68 stay NOT_RUN pending the PR D go-ahead.

## M2.4 PR C candidate — T63, T64, T65 and T66 covered — 2026-11-02

Frozen `c6f6ec7`, candidate and unmerged: Node 346/346, storage 126/126, browser 103/103, six portability scripts, director campaign 47 checkpoints on pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`; `validate.py docs/evidence/m2-4-c/campaign` PASS; `check-discovery.py` PASS (13/5/1). T63–T66 are covered at Node, browser and native level per the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-c--corrections-and-the-director-may-move-control), with the failed `ed80339` run [retained](evidence/m2-4-c/failed-ed80339/). T50 and T57 are amended only at merge, per G14, so both are pending. Tablet, soft keyboard, IME and screen reader NOT_TESTED, DYL-193. No human verdict.

## M2.4 PR B merged — 2026-11-02

PR B [accepted](DECISIONS.md#owner-acceptance--m24-pr-b-merged--2026-11-02) at `8203ea1` (frozen `98d4c27`): `validate.py docs/evidence/m2-4-b/campaign` PASS reproduced from the repository (Node 328, storage 126, browser 97, six portability scripts, director campaign 35 checkpoints); T59's render half, T61 and T62 covered per the [PR B record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-b--evidence-ui-and-resume). The failed campaign on `43c7059` is retained beside it and is not evidence for any claim. T63–T68 stay NOT_RUN pending PR C and PR D go-aheads. No matrix row is amended by this entry.

## M2.4 PR B candidate — T59, T61 and T62 covered — 2026-11-02

Frozen `98d4c27`, candidate and unmerged: Node 328/328, storage 126/126, browser 97/97, six portability scripts, director campaign 35 checkpoints on pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`; `validate.py docs/evidence/m2-4-b/campaign` PASS; `check-discovery.py` PASS (13/5/1). T59's render half, T61 and T62 are covered, and T60's words are on screen, per the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#pr-b--evidence-ui-and-resume). A failed attempt on `43c7059` is [retained](evidence/m2-4-b/failed-43c7059/). Tablet NOT_TESTED; the reply field's reach with the disclosure open stays with DYL-193.

## M2.4 PR A merged — 2026-11-02

PR A [accepted](DECISIONS.md#owner-acceptance--m24-pr-a-merged--2026-11-02) at `8d85158` (frozen `f5de115`): Node 322/322 over the runner's thirteen files and discovery PASS at 13/5/1 reproduced from the repository; T58, T60 and T59's log half covered in Node per the [PR A record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#commands-and-results). T59's render half, T61 and T62 wait for PR B. No matrix row is amended by this entry.

## M2.4 PR A candidate — T58, T60 and T59's log half covered in Node — 2026-11-02

Node-level SYNTHETIC evidence on frozen `f5de115`, unmerged: T58 and T60 covered in Node, and T59's log half (its render half stays NOT_RUN until PR B). Node 322/322 over the runner's 13 files; `python3 tests/probes/dyl60/check-discovery.py` PASS (13/5/1). Browser, storage and native suites NOT_RUN: a pure-module slice under the M2 evidence standard. T58's stale paths other than `STALE_JOURNAL` and `STALE_SCENE` are reached with a scripted journal; the [record](M2_4_EVIDENCE_UI_IMPLEMENTATION.md#implementation-choices-for-owner-review) says why. The T58, T59 and T60 rows below are amended to say so; no row is added.

## M2.4 rows adopted — 2026-11-02

Per [G14](DECISIONS.md#owner-rulings-g1g14--m24-evidence-ui-corrections-and-gate-b--2026-11-02), rows T58–T68 from [plan section 9](M2_4_EVIDENCE_UI_PLAN.md#9-proposed-testing-rows) are added to the matrix below as NOT_RUN; T50 and T57 are amended when M2.4 PR C merges. No evidence is claimed by this entry. The Gate B fixture run (T18, T67) spends against the owner's named connection and runs only on the owner's go-ahead.

## M2.3 PR C merged; T49 amended — 2026-11-02

PR C [accepted](DECISIONS.md#owner-acceptance--m23-pr-c-merged-m23-complete--2026-11-02) at `174d380` (frozen `67c1aed`): `validate.py docs/evidence/m2-3-c/campaign` PASS reproduced from the repository (Node 283 over twelve files, storage 126, browser 93, six portability scripts, director campaign 30 checkpoints); `check-discovery.py` now expects 12/5/1. T56 and T57 covered per the [PR C record](M2_3_DIRECTOR_IMPLEMENTATION.md#pr-c--automatic-layout-overlay). T49's required outcome is amended below per F10 (layout applied in the overlay). All M2.3 amendments (T42, T46, T49) are now in the matrix.

## M2.3 PR C candidate — T56 and T57 covered; T49 pending — 2026-11-02

SYNTHETIC evidence on frozen `67c1aed`, unmerged, from one campaign on the disposable pinned SillyTavern 1.19.0 (`7e8663cd…`) with the loopback endpoint: Node 283/283 (new `tests/m2-director-overlay.test.mjs`), storage 126/126, browser 93/93, the six project-portability scripts PASS, and the amended `tests/probes/m2-director/host.mjs` PASS with 30 checkpoints. `python3 tests/probes/dyl60/validate.py docs/evidence/m2-3-c/campaign` PASS (125 frozen inputs, 108 artifact hashes) and `check-discovery.py` PASS at 12/5/1. **T56** is covered in Node, in the browser at the real entry and on the real host: location and presence applied to the overlay forward from the anchored message, outfit `NO_AUTOMATIC_LAYOUT`, a locked field `LOCKED`; scene, revision, bundle bytes and all native files byte-identical; project not dirty. **T57** is covered the same way: a manual background and a lock clear and rebase, a lock keeps its field afterwards, a real edit invalidates from the first changed source, and disable, detach, chat switch, A → B → A and reload discard the overlay. The two rows below still read NOT_RUN until the owner's review. **T49 is not yet amended**: per F10 it changes only when this PR merges. Tablet replay NOT_TESTED; Gate B NOT_RUN. [Commands and limits](M2_3_DIRECTOR_IMPLEMENTATION.md#pr-c--automatic-layout-overlay).

## M2.3 PR B merged; T46 amended — 2026-11-02

PR B [accepted](DECISIONS.md#owner-acceptance--m23-pr-b-merged--2026-11-02) at `4561888` (frozen `02a3a96`): `validate.py docs/evidence/m2-3-b/campaign` PASS reproduced from the repository (Node 251, storage 126, browser 92, six portability scripts, amended director campaign 20 checkpoints); T52 and T53's host half covered per the [PR B record](M2_3_DIRECTOR_IMPLEMENTATION.md#pr-b--composer-hold). T46's required outcome is amended below per F10 (E16 narrowed to flows without typing). The native director campaign in `tests/probes/m2-director/host.mjs` is amended and passing again. T56 and T57 stay NOT_RUN; PR C not authorized.

## M2.3 PR B candidate — T52 and T53 covered; T46 pending — 2026-11-02

SYNTHETIC evidence on frozen `02a3a96`, unmerged, from one campaign on the disposable pinned SillyTavern 1.19.0 (`7e8663cd…`) with the loopback endpoint: Node 251/251, storage 126/126, browser 92/92 (four new composer cases), the six project-portability scripts PASS, and the amended `tests/probes/m2-director/host.mjs` PASS with 20 checkpoints. `python3 tests/probes/dyl60/validate.py docs/evidence/m2-3-b/campaign` PASS (123 frozen inputs, 108 artifact hashes) and `check-discovery.py` PASS at 11/5/1. **T52** is covered in Node, in the browser at the real entry (a keystroke defers to five seconds after the last one, an idle draft holds, a clear releases, the request carries none of the draft, the composer is untouched) and on the real host (draft kept: held past settle, Send supersedes the head; draft cleared: released 5.0 s later with a draft-free body and byte-identical non-chat files). **T53**'s host half is covered: Send during a held request on the concurrent loopback completes, the result is `SUPERSEDED`, counted, not a failure, the next reply requested once; on the rejecting single-slot backend with the user typing nothing overlaps and the reply succeeds. The two assertions in the director script that PR A invalidated (the removed notice, and Stop after Send) are amended. **T46 is not yet amended**: per F10 it changes only when this PR merges, and its row below is unchanged. Tablet replay NOT_TESTED; the regenerate, Continue and swipe residual of E16 on a single-slot backend NOT_RUN; Gate B NOT_RUN. [Commands and limits](M2_3_DIRECTOR_IMPLEMENTATION.md#pr-b--composer-hold).

## M2.3 PR A merged; T42 amended — 2026-11-02

PR A [accepted](DECISIONS.md#owner-acceptance--m23-pr-a-merged--2026-11-02) at `89d5abd` (frozen `be6a422`): Node 244/244 and discovery PASS reproduced from the repository; T51, T54, T55 and T53's controller half are covered in Node per the [PR A record](M2_3_DIRECTOR_IMPLEMENTATION.md#commands-and-results). T42's required outcome is amended below per F10 (“counted, not queued” → “at most one waits”). The native director campaign in `tests/probes/m2-director/host.mjs` asserts a notice PR A removed and is NOT_RUN until PR B amends it; the retained M2.2 campaign evidence applies to `d566411` only.

## M2.3 PR A candidate — 2026-11-02

Node-level SYNTHETIC evidence on frozen `be6a422`, unmerged: T51, T54 and T55 covered in Node, and T53's controller half (its host half stays NOT_RUN until PR B). Node 244/244 over the runner's 11 files; `python3 tests/probes/dyl60/check-discovery.py` PASS at 11/5/1. Browser, storage and native NOT_RUN per the M2 evidence standard. T42 is amended when PR A merges, per F10; it is unchanged here. `tests/probes/m2-director/host.mjs:305` still expects the removed notice and is amended in PR B. [Commands and limits](M2_3_DIRECTOR_IMPLEMENTATION.md#commands-and-results).

## M2.3 rows adopted — 2026-11-02

Per [F10](DECISIONS.md#owner-rulings-f1f10--m23-director-queueing--2026-11-02), rows T51–T57 from [plan section 9](M2_3_DIRECTOR_QUEUEING_PLAN.md#9-proposed-testing-rows) are added to the matrix below as NOT_RUN; T42, T46 and T49 are amended when the corresponding M2.3 PR merges. No evidence is claimed by this entry.

## M2.2 implementation candidate — 2026-11-01

SYNTHETIC evidence on the disposable pinned host and loopback endpoint, frozen at `d5664119d060d72f90aee4e3a386fdf409843a5c`: rows T39–T50 added below; first host-level evidence for T17, T19 around a real request and T29; T05 now exercises `complete` in the actual entry. T18 still uncovered. [Commands, counts and limits](M2_2_DIRECTOR_IMPLEMENTATION.md#6-commands-and-results). `python3 tests/probes/dyl60/check-discovery.py` now expects 11/5/1 files, and `run.py` runs a seventh native campaign, `tests/probes/m2-director/host.mjs`.

## M2 evidence standard — 2026-11-01

Per the [owner process ruling](DECISIONS.md#owner-rulings-on-open-decisions--2026-11-01): pure-module slices need focused Node tests plus an implementation record; native-host campaigns, storage suites and device replays are required only when a slice touches the host adapter, persistence, the composer or the renderer, or when an owner gate names them. Reused evidence is cited by SHA. DYL-193 coverage runs before the Gate B owner session.

## M2.1 implementation candidate — 2026-11-01

Unit-level SYNTHETIC evidence only, frozen at `0d80dffc803aecf85a1d87e783d63f24212047a0`: rows T31–T38 added below, partial T05, T09, T11, T15, T16, T19 and T29; T17 and T18 not covered. [Commands, counts and limits](M2_1_DIRECTOR_IMPLEMENTATION.md#commands-and-results). `python3 tests/probes/dyl60/check-discovery.py` now expects 9/5/1 suite files; the 8/5/1 entry below stays historical. Browser suite NOT_RUN; Gate B NOT_RUN.

## Gate A PASS — 2026-11-01

Owner verdict [PASS](DECISIONS.md#gate-a-verdict--pass--2026-11-01) on main `e8e9cf673b6455dace67d695ee45d1d3dcc2857c`; session details were not supplied to the repository. Matrix rows, frozen `c5c1699a48629ae761a093e13056f0b11fdc4b88` evidence and the [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and) deferral are unchanged. Gates B and C NOT_RUN.

## Gate A deferral — 2026-11-01

For the first disposable owner playtest only, the owner [deferred](DECISIONS.md#owner-amendment--deferred-coverage-for-the-first-disposable-gate-a-playtest--2026-11-01) increased scaling/200% zoom, reduced motion, assistive technology, tablet file-picker/import/export/cleanup touch flows and native group branch/copy to [DYL-193](https://linear.app/devils17/issue/DYL-193/sillynovel-m14-deferred-physical-scaling-motion-assistive-and). Those rows stay NOT_TESTED and mandatory before beta/release. All other matrix rows and the frozen `c5c1699a48629ae761a093e13056f0b11fdc4b88` evidence are unchanged; the playtest candidate is main `04ce6290c7bb5dab0dd0502e2cde931936796897`. Gate A NOT_RUN.

## DYL-60 keyboard/P3 correction — 2026-10-16

[New exact-candidate regression and actual-device rerun](M1_4_DYL60_KEYBOARD_FIX.md) supersedes the earlier keyboard blocker within the tested active-extension configuration. `python3 tests/probes/dyl60/check-discovery.py` covers repository/foreign launch directories and refused unexpected/empty/missing suites. `run.py --list-tests` lists the expected 8/5/1 suite files; the full runner records discovery and actual case counts separately. Earlier evidence below remains attributed to its original SHA. Scaling/motion/assistive gaps and Gate A NOT_RUN remain explicit.

## DYL-60 approved candidate campaign — 2026-10-16

[Five owner approvals and separate technical authorization](DECISIONS.md#owner-approvals-and-dyl-60-authorization--2026-10-16) select F1 for the first disposable Gate A playtest. Original matrix rows below remain intact: T12 historical restoration and T14 writer exclusion are amended only within that scope. [Fresh candidate record](M1_4_DYL60_CANDIDATE.md) and [reproduction/setup/cleanup](M1_4_DYL60_REPRODUCTION.md) distinguish one frozen SHA from older evidence and later evidence-only commits. The stdlib serial runner is `tests/probes/dyl60/run.py`; the package self-check is `tests/probes/dyl60/validate.py`. Native inventories include real User Avatars/persona settings, connection profile and complete settings, group definitions/membership, all relevant card/chat/world/config paths, sizes and hashes. Visual-only comparisons permit no setting changes; intentional native branch chat-pointer changes are checked at the exact field with avatar bytes and other card fields retained. Native sends/request payloads are a separate phase. [Actual paired Galaxy Tab S8+ technical evidence](evidence/dyl60/device/evidence.json) now supplies bounded touch/native/group/scroll/reopen coverage and exposes the keyboard/composer visibility blocker in both orientations; physical coverage PARTIAL, scaling/motion/assistive coverage separately NOT_TESTED. Gate A NOT_RUN.

## DYL-23-C native group integration — 2026-10-16

Owner explicitly authorizes [native groups with manual independent-project attachment](M1_NATIVE_GROUPS.md), tracked by [DYL-63](https://linear.app/devils17/issue/DYL-63/dyl-23-c-native-group-conversation-integration), after PR #31 merged at `5a9b87f14d5a008e9801aa2260efe40d9e22f5b7`. Native group/chat/activation authority remains separate from account-owned project/manual actor UUIDs and memory-only source expressions. Four or more actors retain three visible slots; duplicate names never bind cards to actors. No schema, native metadata, automatic attachment or persistence expansion. DYL-23 Done/history/acceptance, DYL-55 and DYL-62 unchanged; Decision F undecided; Gate A NOT_RUN; DYL-60 unstarted. [Implementation/evidence](M1_NATIVE_GROUPS_IMPLEMENTATION.md). Older dated entries below are historical.


## M1.2 completion and readiness review — 2026-10-15

Documentation-only review of fetched main `ea65d84a521a39c9ccc977f4cb3643454963d4b8`. [Acceptance matrices, evidence keys and proposed owner checklist](M1_2_STORAGE_COMPLETION_AND_READINESS.md). The retained S/P/R/C/T campaigns are historical exact-candidate evidence; **no runtime, browser, host, provider, physical-device or owner tests were rerun**. Gate A NOT_RUN.

Commands actually used: `git status --short`, `git rev-parse HEAD`, `git fetch origin main`, `git rev-parse origin/main`, `git switch -c codex/m12-storage-readiness origin/main`, source/doc/test reads with `cat`, `sed` and `rg`; validation uses `python3 /tmp/sn-readiness-check.py` and `git diff --check`. GitHub connector `get_pr_info` verifies #23–27 current merged states and expected merge SHAs; Linear `list_issues`, `get_issue(includeRelations: true)`, `list_comments` and `list_milestones` verify current statuses, actual dependencies, original acceptance and duplicate search. Project and workspace SillyNovel searches both returned 32 issues/no next page before creating DYL-60/61. No hosted CI claim.

The temporary standard-library checker validates Markdown relative files/heading anchors, balanced fences, changed heading/table structure, JSON examples, exact five merge SHAs/ancestry, C's 13 runtime/test fingerprints, five unchanged R recovery-specific fingerprints and current status/boundary statements. It also compares runtime/test path changes against origin/main. **PASS:** 460 local links/anchors, fences in 43 Markdown documents, one JSON example, seven documentation-only changed paths, all 18 fingerprints, five merge ancestors and `git diff --check`. Initial checker failure found a pre-existing missing blank before the DYL-47 heading in DECISIONS; a whitespace-only correction fixed it. Live Linear senior-review re-reads confirm DYL-55 is In Progress, unfinished pending owner acceptance, while DYL-22/23/56 remain Backlog with original blocker relations. No Linear status was changed to match documentation. The original review preserved acceptance prose (Linear normalized bold punctuation in DYL-22), found DYL-60 blocked only by DYL-23 and DYL-61 with no blocker relation. Final project search returns 34 issues/no next page: only the two planned additions, no duplicate implementation ticket.

For the next candidate, reuse existing actual-entry and disposable-host runners; select applicable T01–T14/T19/T22–T23/T27–T30. Explicitly distinguish source-safe transient controls from saved project-global layouts. Add real owned catalog/reselection, group/duplicate-name, overlay invalidation, changed-schema/format preservation if introduced, and physical-device evidence only under separately approved tickets. Do not run obsolete native-writer overlays as a generic prerequisite or schedule the owner session from this plan.

**Current DYL-18 evidence:** the [text-reader record below](#dyl-18-text-reader--2026-10-12) adds actual-entry browser behavior and isolated pinned-host reader checks. Gates A/B/C remain NOT_RUN.

**Historical M0 status:** M0 has a passing synthetic harness and real-host lifecycle evidence on an isolated SillyTavern 1.19.0 instance using a deterministic localhost endpoint. This does not validate model/provider behavior. Switching into an empty chat and generating there, group identity cases, and host capability removal remain untested. Deletion to an empty view was exercised. See [M0 compatibility](M0_COMPATIBILITY.md) and the [lifecycle report](M0_LIFECYCLE_VALIDATION.md) for the evidence split.

The corrective streaming and stop rerun used the committed [local endpoint fixture](../tests/fixtures/m0-openai-endpoint.mjs) and [sanitized observer fixture](../tests/fixtures/m0-lifecycle-observer.js); the lifecycle report records their hashes, observer installation/removal steps, and raw sanitized event fields.

## 1. Evidence levels

Distinguish unit tests, simulated integration tests, real-host testing, real-provider testing, and owner playtesting. Passing one level does not imply another.

Every report records the full candidate SHA, host version/commit, browser/device, relevant configuration, commands actually run, outcome, and known gaps. A screenshot without a source build and scenario is illustrative, not a complete test record.

## 1.1 M0 execution record

The tested M0 production shell matches SillyNovel source commit `b34ec1e0c0dbd3c74376b5ef9d1e901de8579f10`; this validation branch adds tests and documentation only. Host: SillyTavern `1.19.0`, full SHA `7e8663cd9c184a550b37238218bdd32c6efc68e9`; Ubuntu 24.04, kernel `7.0.0-34-generic`; Node.js `v26.8.1`; Brave Browser `154.1.96.61` (exact engine version unavailable). The host used a temporary isolated data root, synthetic chats, and a deterministic OpenAI-compatible endpoint bound to `127.0.0.1:8123`. No paid service, credentials, or private chat data were used. See [M0 lifecycle validation](M0_LIFECYCLE_VALIDATION.md) for full outcomes and trace details.

| Scenario | Synthetic harness | Real-host result |
| --- | --- | --- |
| Enable/disable/re-enable; one stage and listener set | PASS | PASS — one stage while enabled; owned listeners removed while disabled |
| Draft entered before toggle | Not represented in Node harness | PASS — exact draft survived off/on cycle; native composer remained available |
| Disable during generation | PASS — late events ignored after disposal | PASS — stage/listeners removed while host stream continued to final events |
| Missing required event capability | PASS — activation refused before mount | NOT_TESTED — pinned host exposes required capabilities |
| Normal non-streaming reply | PASS — synthetic event observation | PASS — real host request/event path via local deterministic endpoint |
| Streaming reply and stop | PASS — synthetic event observation | PASS — token ordering and user stop observed; stop was not treated as successful completion |
| Continuation | PASS — `continue` type and indexed source | PASS — existing message index updated and finalized with `continue` type |
| Regeneration and swipe selection | PASS | PASS — swipe generation and old/new selection resolved selected source |
| Message edit and first/middle/last delete, including final deletion to empty | PASS | PASS — edit source and post-delete counts observed; final deletion cleared the selected source and stage |
| Chat A → populated B → A; A → B → A | PASS | PASS — source followed active chat identity and returned to current A state |
| Switch A → empty B → generation start | PASS — source clears and stays empty | NOT_TESTED on host; reopening B restored its welcome message |
| Malformed/out-of-range index and missing source | PASS — no fallback to last source | NOT_TESTED on host |
| Group authors; duplicate display names | PASS for fixture author label only | NOT_TESTED on host |

Harness assertions model event shapes and do not prove host ordering. In the live pinned-host stream, `STREAM_TOKEN_RECEIVED` fired before the corresponding message object update: a sample saw length 3 on the first token and still length 3 on the next token, then length 11 after the host progress update. Final host events observed were `GENERATION_ENDED(chat.length)`, then `MESSAGE_RECEIVED(index, type)`, then `CHARACTER_MESSAGE_RENDERED(index, type)`. A stopped generation also emitted `GENERATION_STOPPED` and then `GENERATION_ENDED`; these signals do not establish successful completion. Error and aborted-network paths remain untested. The real-host work is not an owner experience test and does not pass Gate A.

## 2. Core regression matrix

| ID | Scenario | Required outcome | First stage |
| --- | --- | --- | --- |
| T01 | Enable/disable/re-enable repeatedly | One active stage; no leaked handlers; native chat restored | M0 |
| T02 | Type a draft, toggle views | Exact draft preserved; normal send behavior remains | M0 |
| T03 | Required host capability absent | Actionable disabled state; no broken native UI | M0 |
| T04 | Long formatted message | All source text accessible; no silent summarization or truncation | M1 |
| T05 | Streaming, stop, continue | Readable text; no premature/duplicate automatic work | M1/M2 |
| T06 | Group with duplicate display names | Correct identity mapping or explicit unresolved state | M1 |
| T07 | More group members than stage slots | No loss of logical membership or dialogue | M1 |
| T08 | Switch A → B with delayed work | A's work cannot render or save into B | M1/M2 |
| T09 | Switch A → B → A with delayed work | Old epoch cannot apply to new visit | M2 |
| T10 | Select an earlier swipe | Changed suffix invalidated; selected history drives visuals | M1 |
| T11 | Edit/insert/delete/continue earlier text | Fingerprints change and dependent state is invalidated | M1 |
| T12 | Reload and branch a chat | Valid matching state restored; branch ownership isolated. Native group branch and checkpoint through the host's own controls on `1334287` (runtime `6799a5e`): detach, no temporary state, explicit reopen restores the saved layout, parent never reattached, native bytes unchanged apart from the host's own chat files and group record ([DYL-193 record](DYL_193_REPLAY_RECORD.md)) | M1 |
| T13 | Read backlog while new message arrives | Cursor stays put; no provider calls for navigation | M1 |
| T14 | Second tab attempts state writes | Defined ownership policy; no silent save race | M1 |
| T15 | Lock outfit while director is running | Lock wins; stale proposal cannot overwrite it | M2 |
| T16 | Unknown keys, IDs, schema, bad evidence | Entire invalid proposal rejected | M2 |
| T17 | Model/server error or timeout | Last valid scene survives; chat remains usable | M2 |
| T18 | Mention/negation/flashback/hypothetical | No unsupported current-location or presence change. Measured once on `6799a5e` by the Gate B fixture run of 2026-11-03 (owner's connection, counts per category in the [Gate B record](evidence/gate-b/record.md), no percentage): background incorrect 2 and presence incorrect 1, all in flashbacks; mentions, negation and hypothetical travel 0 incorrect on background and presence; expression incorrect 15 across categories | M2 |
| T19 | Compare canonical data before/after | No extension-authored text/card/lore/config changes | M1/M2 |
| T20 | Same asset requested concurrently | One generation request or safe cache result | M3 |
| T21 | Image finishes after scene/chat change | Candidate remains scoped; active scene not replaced | M3 |
| T22 | Missing outfit sprite | Correct-identity safe fallback; no contradictory outfit swap | M1 |
| T23 | Corrupt/oversized/traversal import | Rejected safely; existing library retained | M1/M3 |
| T24 | Local provider unavailable | No silent cloud fallback | M2/M3 |
| T25 | API refusal, auth error, rate limit | No provider hopping, retry storm, or chat modification | M3 |
| T26 | Budget/count threshold and in-flight jobs | No newly unauthorized automatic submissions | M3 |
| T27 | Unsupported persistence version | Original data preserved; safe degraded mode | M1 |
| T28 | Reduced motion, zoom, touch keyboard | Readable, usable controls; reply field accessible. Desktop SYNTHETIC on `1334287` (runtime `6799a5e`): 200 % zoom (halved viewport at DPR 2), root font 200 %, host font scale 2 and emulated reduced motion keep the reader, controls, disclosure, cleanup list and reply field reachable and unclipped; on the Galaxy Tab S8+ (`8f784f0`, runtime `6799a5e`): real pinch to 2.0 with reader, disclosure, reply field and navigation reachable by panning, composer inside the visual viewport with the Samsung keyboard open; tablet text scaling and reduced motion NOT_TESTED (settings unchanged; [DYL-193 record](DYL_193_REPLAY_RECORD.md)) | M1 |
| T29 | Prompt text containing slash/HTML instructions | Data stays data; no command or script execution | M2/M3 |
| T30 | Metadata save overlaps chat change | Write targets correct owner or is safely deferred/refused | M1 |
| T31 | Proposal with one locked and several unlocked field changes | Locked change recorded as ignored; unlocked changes apply atomically; no lock altered | M2.1 |
| T32 | Manual change or lock release after a proposal token was captured | `STALE_OVERRIDE`; nothing applied; next fresh proposal may apply | M2.1 |
| T33 | `sourceOrderRevision` or source revision changes between capture and application | Evidence stamp refuses; nothing applied; stage unchanged | M2.1 |
| T34 | Empty `updates` | `NO_CHANGE`; same scene reference; no revision advance | M2.1 |
| T35 | Two updates to the same character or two location updates in one proposal | Whole proposal rejected; no later-wins | M2.1 |
| T36 | `suggestLocation` | No scene, asset or job change; label returned as bounded plain text only | M2.1 |
| T37 | Automatic presence or expression for a character never manually registered | Refused; no cast registration from a mention | M2.1 |
| T38 | Identical proposal sequence replayed from the same scene | Identical journal and projections | M2.1 |
| T39 | Director request on the disposable pinned host with decoy persona, lorebook and cards seeded | Request body contains only window texts, author kinds/labels, catalog labels, compact scene and the instruction; decoy strings absent | M2.2 |
| T40 | Chat message or label containing `{{persona}}`, `{{input}}`, `{{getvar::x}}` or a legacy marker such as `<USER>` or `<GROUP>` inside the window | Arrives neutralized; no expansion; evidence check still runs against original text | M2.2 |
| T41 | Raw response over 32 KiB, non-JSON, two objects, prose around JSON, array | Refused before validation; nothing applied; failure counted with a notice; manual controls work | M2.2 |
| T42 | Several replies complete in quick succession, including a four-member group turn | At most one request outstanding; at most one per message key; a head superseded within the settle interval is never requested or counted; at most one later head waits as the pending target, the newest replaces an older one, never more than one request per key (amended M2.3 PR A per F10) | M2.2, amended M2.3-A |
| T43 | Ceiling (configured to 3) reached | Pauses at once; the next completion sends nothing; manual expressions, layout and composer unaffected; counter survives a chat-switch detach and reopen, resets on deliberate detach | M2.2 |
| T44 | Host error, refusal or disconnected backend during a request (T17 instance) | Last valid scene survives; chat remains usable; message skipped with the bounded code; pause after three consecutive failures | M2.2 |
| T45 | Chat switch, A → B → A, swipe, edit or disable while a request is outstanding (T08/T09 instance) | Late result dropped by ticket and stamp checks; no journal write; not a failure; no notice beyond “cancelled” | M2.2 |
| T46 | User presses Stop or Send while a director request is outstanding | Stop during the user's own generation aborts the director request; Send makes the outstanding result `SUPERSEDED` (discarded before it is read, not a failure, counted). The composer hold defers requests while the user types or holds a draft; Regenerate, Continue, swipes, slash commands and quick replies are not covered, and on a rejecting single-slot backend those can still fail the user's reply, which is kept (E16, narrowed; amended M2.3 PR B per F10) | M2.2, amended M2.3-B |
| T47 | Completion provenance on the pinned host | Normal, continue, regenerate and swipe replies reach `complete` in streamed and plain order; stopped replies stay `stopped-partial`; another extension's `quiet` generation never marks the head complete | M2.2 |
| T48 | Director default state and portability | Off for a new project; bundle export/import and database restore never enable it | M2.2 |
| T49 | Accepted proposal with expression plus layout updates in attached mode | Expression applied to the memory-only journal; location and presence updates applied to the memory-only director overlay forward from the anchored message; outfit updates recorded `NO_AUTOMATIC_LAYOUT`; locked fields skipped `LOCKED`; project not dirty; `globalState()`, saved project and bundles unchanged (amended M2.3 PR C per F10) | M2.2, amended M2.3-C |
| T50 | Manual expression at the anchored source, then automatic expression for the same actor | Manual decision kept; automatic recorded as ignored `LOCKED`; later manual clear or set replaces an automatic one. Corrections reach the same path through the Revert control on a “Why this visual?” row, otherwise as written (amended M2.4 PR C per G14) | M2.2, amended M2.4-C |
| T51 | Reply completes while a native generation runs or starts (next group member, another extension's `quiet`, user Send within the settle interval) | No director request while the reader reports a generation in progress; the pending target waits or is superseded; nothing counted for a superseded head. Node on `be6a422` (unmerged); host NOT_RUN | M2.3-A |
| T52 | Reply completes; the user types, holds a draft, or clears it | No request within 5 s of a keystroke or while the draft is non-empty; clearing the draft releases the hold; the draft text never appears in any request input or wire body; the composer is byte-identical afterwards. Node, browser and native on `02a3a96` (unmerged); tablet NOT_TESTED (DYL-193 replay 2026-11-02: tablet touch on the composer and keyboard covered, the hold itself not exercised on the tablet) | M2.3-B |
| T53 | User presses Send while a director request is outstanding (T46 to be amended) | Result discarded as stale before it is read, outcome `SUPERSEDED`, not a failure, counted; the user's message kept; on the concurrent loopback the reply completes; the rejecting single-slot backend case with typing shows no overlap. Controller half Node on `be6a422` (merged in PR A); host half native on `02a3a96` (unmerged), with the T46 amendment pending until merge | M2.3-A, host in B |
| T54 | Reply completes while reading earlier; a newer reply may complete; the user returns to latest (T42 and E10 to be amended) | At most one target waits, the newest; one request on return; a second return issues nothing; enable or reopen issues nothing retroactively. Node on `be6a422` (unmerged); host NOT_RUN | M2.3-A |
| T55 | Request abandoned at 90 s, then settles, with a target pending | One failure at abandonment; late result discarded; the pending target fires once after settlement; three abandonments pause. Node on `be6a422` (unmerged); host NOT_RUN | M2.3-A |
| T56 | Accepted proposal with location and presence updates in attached mode (T49 to be amended) | Applied to the memory-only overlay forward from the anchored message; outfit still `NO_AUTOMATIC_LAYOUT`; locked field skipped `LOCKED`; `globalState()`, saved project, bundles and all non-chat files unchanged; project not dirty.  Covered by the M2.3 PR C campaign | M2.3-C |
| T57 | Manual layout edit, lock, prefix change, detach, chat switch, A → B → A or reload after automatic layout applied | Manual edit clears and rebases the overlay, corrections included (G7); a lock keeps its field; prefix change invalidates from the first changed source; the rest discard the overlay and its corrections; no overlay state from a first visit shows in a second. Covered by the M2.3 PR C and M2.4 PR C campaigns (amended M2.4 PR C per G14) | M2.3-C, amended M2.4-C |
| T58 | Each outcome of M2.4 plan section 3.2 occurs | One log entry per issued request or build refusal with the right code; no entry for a wait or idle; stale decided before the result is read; counters as tabulated; nothing written to settings, project or wire. NOT_RUN on a host. Node on `f5de115` (candidate, unmerged) | M2.4-A |
| T59 | Model output or chat text with markup, an instruction or a URL reaches the log | Only a validated excerpt is held and rendered, as text; no raw response, refusal detail or suggestion label in the log; no element created, nothing executed (T29 instance). Log half: Node on `f5de115`. Render half: browser on `98d4c27` (candidate, unmerged) | M2.4-A, UI in B |
| T60 | Source of a logged decision is edited, swiped, regenerated, deleted or reordered | Excerpts deleted; outcome kept in tallies; no text of the old message remains in the log. When a changed source retains its message key, its row shows ‘message changed’. A real regenerate replaces the message under a new key: the excerpt is gone and tallies keep the outcome, but no ‘message changed’ row remains at the selected replacement message. (Wording accepted by the owner on 2026-11-08; the annotations below keep their original tested revisions.) Node on `f5de115`. “message changed” on screen after a real edit on the host on `98d4c27` (candidate, unmerged); real swipe, regenerate, delete and reorder NOT_RUN | M2.4-A |
| T61 | Evidence UI on the stage | Director line readable with the controls closed; disclosure closed by default; keyboard operable; reply field reachable; reading and replying unaffected when the director is off, paused or failing. Browser and native on `98d4c27` (candidate, unmerged); reply field's reach with the disclosure open covered on desktop at 200 % zoom, root font 200 % and host font scale 2 (SYNTHETIC, `1334287`); reply field reachable with the disclosure open on the Galaxy Tab S8+ at scale 1.0, with the keyboard open and at a real pinch of 2.0 (DYL-193 replay, `8f784f0`) | M2.4-B |
| T62 | Paused director, then Resume | Overlay kept; count kept; `consecutive` cleared; nothing retroactive; refused at the ceiling with a note. Node, browser and native on `98d4c27` (candidate, unmerged) | M2.4-B |
| T63 | Correct one automatic background or presence at the selected message | Forward from that message only; other fields kept at the head; later overlay commands invalidated when not at the head; field shows its lock and later updates skip `LOCKED`; Release enables only a fresh proposal; `globalState()`, saved project, bundles and all non-chat files unchanged; project not dirty. Node, browser and native on `c6f6ec7` (candidate, unmerged) | M2.4-C |
| T64 | Correct one automatic expression | Existing manual clear or set at that source; later automatic choice there recorded `LOCKED` (T50); suffix rule named in the notice. Node, browser and native on `c6f6ec7` (candidate, unmerged) | M2.4-C |
| T65 | Correction, then a manual global layout command | Whole overlay, corrections included, cleared and rebased (F8); notice says so; the manual choice is what shows. Node, browser and native on `c6f6ec7` (candidate, unmerged) | M2.4-C |
| T66 | Mark a background or presence movable, Save, reopen, export, import | Value kept, lock false after each; director may move it; a new manual apply locks again unless the movable action was used; director enablement does not travel (T48); schema v2 unchanged. Node, browser and native on `c6f6ec7` (candidate, unmerged) | M2.4-C |
| T67 | Gate B fixture scorer | Counts per category and field; refused apart, and failed or not-run apart from refused; no aggregate percentage; changed expected answers refused against the recorded SHA. Covered by Node (`tests/m2-gate-b-score.test.mjs`) and the loopback-only runner proof in the M2.4 PR D campaign; measured direction once on `6799a5e` in the Gate B fixture run of 2026-11-03 (40 sent, 36 scored, 4 refused, [record](evidence/gate-b/record.md)) | M2.4-D |
| T68 | Regenerate, Continue or swipe during an outstanding request on the synthetic rejecting backend (E16 residual) | Outcome recorded per flow as observed: Regenerate loses the reply, Continue and swipe keep it; the user's message kept in all three; a host toast each; the director request counted `SUPERSEDED`; recovery by the same flow once the slot frees demonstrated; not asserted away. Real backend stays with the owner's session. Covered by the M2.4 PR D campaign (amended at merge per G14) | M2.4-D |
| T69 | Image prompt draft copied or downloaded | Exact visible text equals copy/download bytes; blank/oversized fields refuse; HTML/macros/slash text stays data; no provider request or implicit chat/card collection. NOT_RUN. | M3.1 |
| T70 | Reference PNGs exported | Export only explicitly selected owned PNG references with matching hashes; foreign/missing/hash-changed references refuse; filenames cannot create paths. NOT_RUN. | M3.1 |
| T71 | Result PNG previewed, discarded, or imported and applied | Local preview discard uploads nothing; explicit import/apply locks background, marks dirty, saves/reopens; identical PNG reuses project bytes; invalid PNG/quota/conflict preserves previous saved state. NOT_RUN. | M3.1 |
| T72 | Delayed export, decode or upload after detach, project replacement or A → B → A | Delayed export/decode/upload after detach, project replacement or A → B → A cannot publish into the new attachment; draft/preview resources disposed. NOT_RUN. | M3.1 |
| T73 | Image workflow on keyboard, scaling, touch and screen reader | Workflow keyboard, scaling, touch picker/download and screen-reader checks; reply field reachable throughout export/import/failure. Physical/assistive rows never replaced by emulation. PASS by the owner's report on 2026-11-08; the owner did not list the devices, assistive tools or revision used, and no agent evidence exists. | M3.1 UI |
| T74 | Host image seam with adversarial prompts and decoy private data | Pinned host seam with adversarial prompts and decoy private data: no command execution, text-model call, chat/background mutation or unexpected outbound fields; actual wire matches review. Supported configuration: SillyNovel the only image-aware extension, standard ComfyUI on loopback, a workflow within the six-node allowlist. The wire is the body of the host's POST to `/api/sd/comfy/generate` and the fake backend's received `/prompt` body, both captured by the fixture. SYNTHETIC half PASS on the pinned 1.19.0 host at `75b2807` with the fake backend (PR A probe, R1–R3 and H1–H4, [evidence](evidence/m3-2-a/)); adapter half SYNTHETIC PASS at `afac1f9` on the pinned host through the real UI (PR C campaign C: one `/prompt` per Submit, workflow `deepEqual` to the shipped default, no decoys, zero text requests, settings and canonical files unchanged, [evidence](evidence/m3-2-c/campaign/)); the real route NOT_RUN. | M3.2 |
| T75 | Local image route unavailable, changed or cloud-selected | Standard local route unavailable, source/workflow/settings changed or cloud/RunPod selected: refuse before dispatch; no connection rewrite or fallback. SYNTHETIC Node half PASS at `883d59b`: every refusal rule of plan 3.2 as a code, each triggered alone and all together (PR B); the adapter's refusal on a real host NOT_RUN. | M3.2 |
| T76 | Host image result staged for approval | Valid host result staged only; arbitrary path/redirect/non-PNG refused; approval alone copies into the intended project; host file retention disclosed. SYNTHETIC PASS at `afac1f9`: the returned path validated before fetch, a `.jpg` result refused with its path (browser), approval through the shared import locks the background (browser, campaign C), the host's retained file disclosed in every status; host halves at `75b2807` (PR A R1, R7). The real route NOT_RUN. | M3.2 |
| T77 | Image timeout, cancel or stale late result | Timeout/cancel/stale late result, including A → B → A and manual lock: no application, no retry, unknown reservation retained. “SillyNovel applied nothing” is required; “ComfyUI stopped” is measured and reported, never required. The Stop host job control's global-interrupt disclosure is part of the keyboard and screen-reader pass. Host halves SYNTHETIC PASS at `75b2807` (PR A: abort, chat change, held backend, global interrupt); SillyNovel's reservation and staleness rules SYNTHETIC Node PASS at `883d59b` (PR B); the UI's Cancel, Abandon after the deadline, the late result after a timeout, Stop host job, timeout with fake timers, stale discard on a chat switch, a draft edit and a scene change, and allowance SYNTHETIC PASS at `afac1f9` (PR C browser suite and campaign D, E, G, H). The real 120 s wait on the host, a manual lock during a request on the host and the M3.3 recovery half NOT_RUN. | M3.2–3 |
| T78 | Concurrent identical image requests and cache hits | Concurrent identical requests and repeated clicks coalesce; cache hit sends zero; changed effective inputs miss; reload/second-tab recovery cannot cause a duplicate authorized job in the supported mode. SYNTHETIC PASS at `5518a51` on the pinned 1.19.0 host (PR C): a cache hit sends zero `/prompt` and counts nothing (campaign J, browser suite); a changed payload identity misses (`cacheHit` in Node, PR A); one unresolved job per request and the cache rows in the ledger (storage, PR B); a takeover and a reload keep one reservation and attach nothing automatically, and only the lease holder can record `imported` (campaign M, N; browser and storage suites). Two tabs reserving at the same instant, and the owner's 1.18.0 host with a real ComfyUI, NOT_RUN. | M3.3 |
| T79 | Image refusal, auth, rate and error fixtures | Refusal/auth/rate/error fixtures preserve canonical data and reading/replying, with no provider hopping; count/budget reservations include failed and unresolved jobs. Refusal fixture only: SYNTHETIC PASS at `5518a51` on the pinned 1.19.0 host (PR C campaign K and the browser suite: shown as failed, the unit spent, one host call, no retry or fallback, the ledger row failed). The auth, rate and error fixtures NOT_RUN. | M3.3 |
| T80 | Generated candidate reject, delete and approve | Generated candidate reject/delete/approve, approved-asset deletion protection, metadata redaction and recovery/portability behavior match the adopted retention contract. NOT_RUN. | M3.3 |
| T81 | Image session lease | A second tab or a reload sees the open session and is refused or offered an explicit takeover; a lease with a heartbeat older than 90 s is stale; takeover keeps reservations and the count; the old tab ends its session with a notice. SYNTHETIC PASS at `5518a51` on the pinned 1.19.0 host (PR C): takeover from a second page keeps the count and the first page ends at its next heartbeat with `LEASE_LOST` and a notice (campaign M, browser suite); a takeover before the old page's next heartbeat cannot import there (browser and storage suites); the lease, stale and takeover rules in the ledger (storage, PR B). Real tabs on the owner's 1.18.0 host NOT_RUN. | M3.3 |
| T82 | Reload reconciliation | Pending and unknown job rows survive a reload; reconcile lists only host image files newer than the submission; attaching passes path validation, the PNG check and the import gate; abandoning keeps the unit spent; nothing auto-attaches. SYNTHETIC PASS at `5518a51` on the pinned 1.19.0 host (PR C): after a takeover, Reconcile lists only the late file and attaches it through the fetch, the PNG check and Import and apply (campaign M); after a reload the host interrupts the job, Reconcile finds nothing, and Abandon keeps the unit spent (campaign N); candidate and reconciled rows a reload left are listed for Discard (browser suite). The owner's 1.18.0 host with a real ComfyUI NOT_RUN. | M3.3 |
| T83 | Host-copy deletion | Delete the host's copy removes exactly the job's file through the host's delete route; refused and traversal paths change nothing; the row records the deletion; the catalog is untouched. SYNTHETIC PASS at `5518a51` on the pinned 1.19.0 host (PR C campaign L and the browser suite: exactly that file removed, `hostDeletedAt` recorded, refusals change nothing); the host route's path behaviour at `75b2807` (PR A D1–D5). Deleting inside a character subfolder NOT_RUN. | M3.3 |

## 3. Fixture design

Use invented characters and conversations. Include two characters with the same display name but different identities, repeated identical message text at different positions, a renamed card, a branched chat with a shared prefix, a stopped stream, and an edited historical message.

Director fixtures need ground-truth expected updates, allowed abstentions, and forbidden changes. Include quoted travel plans, a character saying “I am not leaving,” an offscreen person being mentioned, an outfit change explicitly completed, a user lock contradicting the prose, and content that tries to instruct the classifier to ignore its rules.

Freeze fixture expectations before evaluating a candidate. Report semantic failures separately from malformed JSON and transport errors. Do not treat a substring-valid evidence quote as semantic correctness.

## 4. Data-integrity checks

Compare canonical source fields before and after extension-only operations. Compare cards, lorebooks, personas, connection configuration, selected content, and the current draft where relevant. Allow only intended writes to extension-owned visual metadata/settings.

Check at least one real host export to ensure namespaced metadata does not unexpectedly enter the main roleplay prompt. A quiet-looking API helper can still have side effects; capture the actual request construction during integration verification.

Do not include secrets or personal prompt content in committed traces. Use redacted request summaries or synthetic fixtures.

## 5. Performance targets

Proposed engineering targets, to be measured rather than advertised: cached visual selection should not perceptibly delay the reader; ordinary message rendering must not wait for an external model; only one automatic director request per eligible source revision (explicit retries recorded separately); no image request per streaming token; no unbounded growth of listeners, DOM nodes, object URLs, or job queues.

Before introducing numerical timing budgets, record the actual host, browser, hardware, asset sizes, and measurement method. Report a latency distribution and slow cases instead of a single favorable screenshot/run.

## 6. Human gate record

Copy this record into a dated evidence file for each real candidate. Gate B uses the [Gate B record template](GATE_B_RECORD_TEMPLATE.md), which adds the fields of M2.4 plan section 6.4. Gate C uses the [Gate C record template](GATE_C_RECORD_TEMPLATE.md), which adds the seven demonstrations, the hard gates, the host and backup the owner chooses, and the read-only capture, with synthetic and real evidence apart:

```text
Gate: A / B / C
Candidate full SHA:
SillyTavern release and full SHA:
Browser and device:
Relevant extensions/configuration:
Assets/providers used:
Scenarios exercised:
Automated checks actually run:
Owner feedback (verbatim or clearly attributed):
Owner verdict: NOT_RUN / PASS / REVISE / STOP
Remaining blockers:
Known limitations:
Evidence locations:
```

Only the owner supplies the human verdict. Agents can recommend readiness for evaluation but cannot fabricate approval, elapsed session length, screenshots, or test outcomes.

## 7. Documentation checks

Before merging documentation, validate relative links, JSON example syntax, consistent milestone/status names, and separation of planned versus implemented behavior. Check that external facts cite primary sources and that provider limits/pricing have not been invented.

These checks validate the documentation package only. They do not count as M0 completion or extension compatibility evidence.

## M0.2 final host validation addendum (2026-10-12)

Candidate `de25366aeaa5e1cbd10e9bc40861e8ae91339aee` was tested on pinned SillyTavern 1.19.0 (`7e8663cd9c184a550b37238218bdd32c6efc68e9`) using Ubuntu 24.04, Node `v26.8.1`, Brave `154.1.96.61`, isolated synthetic host data, and the deterministic local endpoint. The lifecycle report contains exact setup and fixture hashes.

| Check | Result | Evidence level |
| --- | --- | --- |
| L10 empty B across chat switch and generation | UNSUPPORTED / WAIVER REQUESTED | Host UI creates a welcome message and restores it on reopen; synthetic empty-source regression remains PASS. |
| Eventless Temporary Chat transition | PASS after targeted fix | Host UI reproduced stale stage on prior candidate; candidate DOM observer refreshed source; observer disposal is covered synthetically. Temporary Chat is not L10. |
| L12 group authors and switching | HOST PASS | Synthetic 3-member group, host regeneration, group/individual switch, and disable/re-enable. |
| L13 duplicate display names | HOST PASS for label-only behavior | Two distinct Mira cards share the host label; differing avatar fields are observed but not used as durable identity. |
| L16 missing `MESSAGE_SWIPED` capability | INSTRUMENTED_HOST_PASS | Reversible browser-local override; refusal before mount/listeners, chat/composer usable, normal activation after restore. |
| Same-length eventless source replacement | PASS — exact content compared and one refresh emitted | Synthetic DOM observer regression replaces `Synthetic temporary reply.` with same-length `Synthetic temporary story.`, then checks unchanged-source deduplication and disposal. Fix commit `831714e9343b51682d643efb2eaa419ef9ab5145`; browser host was not rerun for this edge case. |
| Node regression harness | PASS — 13 tests | `node --test tests/m0.test.mjs` |
| Fixture and adapter syntax | PASS | `node --check tests/fixtures/m0-openai-endpoint.mjs`; `node --check tests/fixtures/m0-lifecycle-observer.js`; `node --check src/host-adapter.mjs` |
| JSON examples | PASS | Node `JSON.parse` on each `docs/examples/*.json`; command shown below. |
| Relative Markdown links | PASS — 15 Markdown files checked | One-off Node path-existence check; external links are excluded. |
| Git whitespace | PASS | `git diff --check` |

The JSON validation command used was:

```sh
node --input-type=module -e 'import {readdirSync,readFileSync} from "node:fs"; const files=readdirSync("docs/examples").filter(f=>f.endsWith(".json")); for (const f of files) JSON.parse(readFileSync(`docs/examples/${f}`,"utf8")); console.log(`JSON OK: ${files.join(", ")}`)'
```

At the time of this evidence record, the recommendation was **M0 PASS subject to owner acceptance of the L10 waiver**. The owner later approved M0 PASS for this documented scope and accepted L10 as **UNSUPPORTED / WAIVED**; see the [DYL-16 decision](DECISIONS.md#owner-decision--2026-10-12-dyl-16). Gate A remains NOT_RUN. The host run does not validate real model/provider behavior, error/abort paths, other browser engines, or other SillyTavern releases.

## DYL-17 source-model candidate (2026-10-12)

The bounded contract and consumer notes are in [M1 reader source model](M1_READER_SOURCE.md). The implementation remains a source/navigation model behind the M0 placeholder; it does not pass Gate A or start DYL-18.

| Evidence item | Result |
| --- | --- |
| Starting main | `4e72a3cda0393ca1e2a11155491ef10f0ab759bc` |
| Final code candidate tested on host | `dfbb6dffa88f4aaeda097fb880e54d6c7d956867` |
| Pinned host | SillyTavern 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Host runtime | Ubuntu 24.04, Node.js `v26.8.1`; host PID `2713766`, fixture PID `2713768` |
| Browser | Codex In-app Browser on this host; browser engine/version NOT_REPORTED |
| Isolated host data | `/tmp/SillyTavern-dyl17-final-data`; synthetic chat only |
| Local endpoint | `127.0.0.1:8123`, allowed origin `http://127.0.0.1:8012`; 1 MiB request limit |
| Endpoint fixture SHA-256 | `c62ae622241627553b1652d042250bb1686b9a329bd06b4552affc5517e271ef` |
| Sanitized observer fixture SHA-256 | `74a114b65a6f64dadf111b8274a255b093b1e0b3c798733e761cfbfbdf7d64ac` |

The before-change smoke used a clean worktree at starting main `4e72a3cda0393ca1e2a11155491ef10f0ab759bc`, pinned SillyTavern, and its own temporary data root. It verified extension off/on with exact draft preservation and a reachable Temporary Chat source. The requested same-length native edit was NOT_TESTED on this baseline candidate.

The review-fix candidate `dfbb6dffa88f4aaeda097fb880e54d6c7d956867` was loaded from the isolated worktree into SillyTavern 1.19.0 for the requested final-candidate checks. On the synthetic chat, a native edit changed the assistant source from the 127-character text ending in `quiet room.` to a different 127-character text ending in `peace room.`; the stage reported `messageEdited` and the new canonical text. The built-in **Continue** action then extended that same assistant message from 127 to 191 characters; the stage reported `streamReconciled` during growth and `characterMessageRendered` when complete. The browser UI showed one assistant message updated in place, not a second assistant message. These checks used the deterministic local endpoint; no real provider was used and SillyNovel did not submit generation requests. The final rerun did not repeat the earlier toggle/draft-preservation, stopped-stream, or controlled-failure smoke, which remain tied to `fa18bd2`. The in-app browser engine/version was not reported. The observer fixture was not injected in this rerun, so raw `GENERATION_STARTED` type arguments were not recorded; the host action itself was the UI's **Continue** command.

The local runtime checks run against the final source content were:

```sh
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs
node --check src/host-adapter.mjs
node --check src/reader-source-model.mjs
node --check src/shell.mjs
node --check tests/fixtures/m0-openai-endpoint.mjs
git diff --check
```

Result: 25 tests passed; all four syntax checks passed; `git diff --check` passed. Coverage includes head/cursor navigation, edits and same-length revisions, insert/delete/replacement invalidation, repeated text, swipe/group-author changes, empty history, generation-state conservatism, normal generation remaining unbound without a new assistant source, A → B → A, eventless DOM refresh, selected-index-only token sampling, a one-message middle insertion while pinned, selection change plus same-length edit during a queued frame, and disposal. The Node harness does not replace host evidence. Browser engine/version, real provider behavior, and Gate A remain NOT_TESTED/NOT_RUN.

## DYL-17 senior re-review addendum (2026-10-12)

Code candidate `3d871679ca216eec1210f3bec5845299a672af92` addresses the two new P2 findings and the P3 cleanup. A zero-to-one sampled append is accepted only with a present, unique source key; nonempty incremental appends still require the verified previous tail. Follow-latest recovers to a replaced canonical head, while a pinned replaced source remains invalidated. Invalid/null history records are omitted from the prior-source lookup.

| Check | Result |
| --- | --- |
| DOM-only zero-to-one adapter/model regression | PASS — first source selected as head and cursor without a lifecycle event |
| DOM-only latest-object replacement regression | PASS — followLatest selects the new source without a lifecycle event |
| Refresh after ambiguous/null history regression | PASS — ordinary full refresh does not throw and restores the unique source |
| Node regression suites | PASS — 27 tests |
| Syntax checks and `git diff --check` | PASS — commands below |
| Pinned SillyTavern smoke | PASS for candidate load and current synthetic-source observation after reload; host UI started its Temporary Chat with a system welcome source, so zero-message arrival was NOT_TESTED on host. No UI action replaces the latest message object without also raising a lifecycle event, so the requested eventless replacement remains NOT_TESTED on host. |
| Provider, browser-engine version, Gate A | NOT_TESTED / NOT_RUN |

The host candidate was served from this isolated worktree on SillyTavern 1.19.0 (`7e8663cd9c184a550b37238218bdd32c6efc68e9`), Node.js `v26.8.1`, with synthetic data under `/tmp/SillyTavern-dyl17-final-data`. Brave was used; the browser engine/version was not reported. The deterministic endpoint was available at `127.0.0.1:8123`, but no generation request was submitted for this smoke. The visible stage showed the current synthetic chat source and `chatViewChanged` after reload. The specific two P2 host scenarios were unreachable through the pinned UI and remain covered by the synthetic adapter/model regressions only.

Commands actually run on the candidate:

```sh
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs
node --check src/host-adapter.mjs
node --check src/reader-source-model.mjs
node --check src/shell.mjs
node --check tests/fixtures/m0-openai-endpoint.mjs
git diff --check
```

The DYL-18 and DYL-19 scope remains unchanged. The Node harness and host smoke are implementation evidence, not an owner verdict or Gate A pass.


## DYL-18 text reader — 2026-10-12

The owner assigned DYL-18 in Codex on 2026-10-12 (America/Phoenix), recorded in Linear before implementation. Initial clean checkout: `98ee37d7464063d607b0a0c892cd2259d4ed75ae`. Fetched starting main: `aa43f4d938c6eafae296cda63a5b4f11111fbd95`. Branch: `codex/dyl-18-text-reader`. The final host-tested SHA, runtime/fixture hashes, browser metrics and complete scenario results are in [results.json](evidence/dyl18/results.json); the pushed review head is recorded in the PR/Linear handoff rather than a self-referential commit here. Runtime files were committed and unchanged during that host run. The reviewed head `29cb5bf8d348490f407565f9c3f9e91db6afb1d7` did not change those runtime bytes. The later P2 adapter correction has separate evidence in the addendum below.

### Commands actually run and results

The dedicated host was cloned locally from the existing inspected pinned checkout; its installed dependencies were reused with a symlink, not reinstalled or added to SillyNovel:

```sh
git fetch origin main
git rev-parse origin/main
git switch -c codex/dyl-18-text-reader origin/main
git clone --shared /tmp/sillynovel-m0lifecycle-st /tmp/SillyTavern-dyl18
git -C /tmp/SillyTavern-dyl18 checkout 7e8663cd9c184a550b37238218bdd32c6efc68e9
ln -s /tmp/sillynovel-m0lifecycle-st/node_modules /tmp/SillyTavern-dyl18/node_modules
mkdir -p /tmp/SillyTavern-dyl18/public/scripts/extensions/third-party
ln -s /home/dq/Projects/SillyNovel /tmp/SillyTavern-dyl18/public/scripts/extensions/third-party/SillyNovel

node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl18 node --test tests/m1-reader-browser.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl18/reader-host.mjs /tmp/SillyTavern-dyl18 /tmp/sillynovel-dyl18-final-evidence

node --check index.js
node --check src/shell.mjs
node --check src/host-adapter.mjs
node --check src/reader-source-model.mjs
node --check src/reader-view.mjs
node --check tests/fixtures/dyl18-openai-endpoint.mjs
node --check tests/probes/dyl18/reader-host.mjs
git diff --check
```

Final results: **37/37 Node tests PASS** (13 M0, 15 source-model, 9 existing DYL-19 helper/probe regressions); **14/14 behavioral Chromium tests PASS**; **12/12 isolated pinned-host scenario checks PASS**. Syntax checks and `git diff --check` passed. An ad hoc standard-library Python check validated 117 relative Markdown file links, fenced blocks, all 12 host results and eight fixture/runtime hashes; `sha256sum -c SHA256SUMS` passed for all nine screenshot/result artifacts in the evidence directory. No SillyNovel dependency, application framework, build migration or CI job was added. The DYL-19 host-storage probe was not rerun; its historical results and blocked contracts are unchanged.

The browser suite serves the actual `index.js`, controller, source model, adapter and renderer. A synthetic host context drives real DOM controls and lifecycle observations. Its `/lib.js` shim exposes the actual installed host Showdown/DOMPurify libraries; it does not mock the renderer. It verifies mount/update/dispose; complete long Markdown and exact clipboard copying; malicious HTML and encoded/unsafe protocols; navigation/pinning/unread; independent text following and text selection through closing Markdown; deleted/replaced sources; current-index re-resolution and failed locator fallback; exact draft/caret/focus; toggles; missing capability and mount/render failure; queued A → B → A reads and delayed copy feedback; IME/editable-field key isolation; empty/unresolved authors and reduced-height layout.

Development failures were retained as failures, not relabeled PASS: early browser passes had 7/14, 12/14 and 10/14 outcomes while correcting sanitizer wrapper handling, discarded head-only script content, and generated heading IDs. Targeted closing-Markdown selection and unobserved-chat-switch handoff checks failed before range restoration and intended-source guards were added; both now pass within the 14-test suite. Manual host automation initially sampled scrolling too near the bottom; the corrected check scrolls up only after at least 500px of overflow and verifies the exact 100px offset through the rest of the stream. Early full host-run attempts stopped on hidden-settings selection, premature Stop/continuation sampling, native initialization/data-comparison races, and chat/drawer frame transitions. The final probe waits for native state and observer frames instead of assigning success from those failed attempts. Source inspection traced the metadata race to host `WorldInfoTimedEffects` creating `timedWorldInfo` even in a dry run; the before/after comparison waits for that initialization and compares canonical card content while omitting derived character-list metadata and duplicate card serialization.

### Host, browser and fixture isolation

Host: **SillyTavern 1.19.0**, `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Browser: **Chromium 151.0.7922.34**, headful Playwright browser, Ubuntu 24.04.5 LTS, Node v26.8.1. Desktop viewport: 1440×1000; narrow: 390×800; keyboard-height approximation: 390×500 with composer focused. This is viewport simulation, **not physical-device or real virtual-keyboard evidence**.

[The host probe](../tests/probes/dyl18/reader-host.mjs) refuses an unpinned host or a different mounted extension. It creates a fresh `mkdtemp` data root, seeds only its own local-endpoint settings, and starts its own loopback host and deterministic endpoint processes on ports 8018/8128. It verifies both its exact data-root announcement and listener before connecting, so an occupied port cannot redirect it to another host. Character Management creates two invented cards, Mira Reader A/B, through native UI. All sends, stop/continue, edits, swipes and switches use native controls. It saves screenshots/results to the explicit output directory, closes its browsers, stops only its children and removes its own data root even on a failed check. Fixed ports are a documented concurrency ceiling; run one such probe at a time.

The endpoint returns a synthetic short Markdown reply or the complete 9,951-character chapter when the latest user message contains `[LONG]`. No credentials or real provider were used. Reproduce with a dedicated pinned host checkout and its declared installed dependencies; the extension symlink must point to the review checkout. Provide `SN_PLAYWRIGHT_MODULE` for an external installed Playwright module, or use an already installed `playwright` package. A display is required for the headful host/actual browser-zoom check. The browser-only synthetic suite runs headless.

Actual 200% **browser zoom** used a temporary test-only Chrome extension with `chrome.tabs.setZoom(2)`/`getZoom`; it did not inject page code. Metrics in results prove CSS viewport width/height halved while `visualViewport.scale` remained 1. This was not CSS zoom, pinch zoom or device scaling. The test extension/profile were removed with the owned root. At 200%, reader navigation and the native composer remained reachable.

### Result matrix and screenshots

| Scenario | Evidence/result |
| --- | --- |
| Enable after successful mount; native chat/data preserved | HOST PASS; one stage, feed mounted/hidden by owned class, native data comparison unchanged |
| Normal native send and streamed formatted reply | HOST PASS; reader updates real selected host text |
| Stop and native Continue | HOST PASS; readable stopped partial state; existing source grows on continuation |
| Backlog/original locator, edit, new swipe and earlier swipe | HOST PASS; verified native handoff, native text edit reflected, native swipe state respected on return |
| Three reader/chat transitions with draft, caret and focus | HOST PASS; exact `Exact draft 日本語 with selection`, backward selection 2–8, same active native textarea |
| Older pinned source while user/assistant replies arrive | HOST PASS; original dialogue retained, `2 new`, explicit Latest restores following |
| Long full formatted/copyable source; independent scrolling | HOST PASS; all 9,951 source characters copied exactly; 65 chapter paragraphs and final marker; scrollTop remains 100 while stream grows |
| Narrow and composer-focused reduced height | HOST PASS as viewport simulation; composer/send visible, dialogue scrollable; dimensions in results |
| Native A → B → A | HOST PASS; each activation selects its own current latest source; no old text carried into B |
| Disable/re-enable during and after generation | HOST PASS; native reply continues, one stage restored, full source remains readable |
| Deliberate renderer exception | INSTRUMENTED_HOST_PASS; an extension-owned text node was made to throw, native edit triggered update, native feed/draft/caret restored and clean re-enable succeeded |
| Actual 200% browser zoom | HOST PASS; navigation and native composer remain reachable |
| Exact re-resolution after insert/reorder, missing/ambiguous/unrendered locator fallback | SYNTHETIC browser PASS; native paginated/deep-history fallback NOT_TESTED |
| Initial mount failure, capability omission, deleted/replaced/empty sources, queued old reads, delayed clipboard feedback and IME/editable-key exclusion | SYNTHETIC browser PASS; natural host failures/physical IME NOT_TESTED |

Representative verified screenshots (all synthetic, on the SHA in results): [desktop](evidence/dyl18/desktop-reader.png), [long scrollable reply](evidence/dyl18/long-scrollable-reply.png), [pinned older source](evidence/dyl18/pinned-older-message.png), [narrow](evidence/dyl18/narrow-reader.png), [keyboard-height simulation](evidence/dyl18/keyboard-viewport-simulation.png), [native backlog](evidence/dyl18/native-backlog.png), [render-failure recovery](evidence/dyl18/render-failure-native-recovery.png), [200% browser zoom](evidence/dyl18/browser-zoom-200-percent.png). Fixture/runtime SHA-256 hashes are in results; screenshot SHA-256 hashes are in [SHA256SUMS](evidence/dyl18/SHA256SUMS).

### Security coverage, limits and next work

Ordinary paragraph/line-break, emphasis/strong/nested emphasis, lists, inline/fenced code, heading and safe-link rendering passes. Long text is never truncated and Copy preserves exact raw source. Malicious `<script>`, event-handler image, SVG/iframe/srcdoc, encoded `java&#x73;cript:`, percent-encoded scheme, `javascript:` and `data:` links, malformed HTML and unmatched/nested Markdown pass the actual entry/render path checks. Unsafe/unsupported source remains complete readable plain text with a native Backlog route. No model HTML, styles, images/media, host-facing classes/actions, executable URLs or slash commands are installed by the reader. The final allowlist/protocol validation is separate from sanitizer-removal fidelity detection.

Known UX limits: complete messages only; existing history and uncorrelated completion retain “Completion status unknown”; re-enable mid-generation cannot reconstruct lifecycle events missed while disabled. Unsupported rich content is shown literally. The original host campaign covered candidate positioning for already-rendered messages. The P2 correction below removes its unverified exact-match claim; the current pinned-host adapter always reports unresolved correspondence, including after a candidate scroll. Earlier paginated messages require native history loading. There is no keyboard shortcut layer, replacement composer, art, scene state or persistence.

NOT_TESTED on this final reader UI: physical touch/IME/virtual keyboard; other browser engines, devices, themes, extension combinations or host versions; real model/provider inference; natural missing-capability/mount failure; final-host native deletion-to-empty/replaced-object/eventless Temporary Chat and group-reader edge cases; actual native pagination/deep-history fallback; generation network failure/abort beyond explicit Stop; separate persisted lorebook/persona-store hash comparison. Those paths retain synthetic coverage or their previous dated evidence; no earlier host evidence is silently promoted to this SHA. L10 stays UNSUPPORTED / WAIVED. DYL-19 PARTIAL/BLOCKED storage findings are untouched.

Recommendation: review and manually try this bounded DYL-18 reader candidate. Keep the PR OPEN/UNMERGED and issue In Review until the owner decides. A separate, explicitly authorized read-only host history-loader proof is the bounded follow-up if exact deep-backlog handoff is required. Gate A is NOT_RUN; this technical evidence does not start later milestones or supply a human verdict.

## PR #8 P2 stale native DOM correction — 2026-10-12

Reviewed starting head: `29cb5bf8d348490f407565f9c3f9e91db6afb1d7`. Automated-tested correction code: `f0e811bab1b3c74acd0ac00c4f75d9e9cf980684`. The final pushed head is recorded in the PR/Linear handoff; subsequent documentation and host-probe result-label changes do not change this correction's runtime or automated-test bytes.

The added actual-entry test replaces the canonical Mira message object at index 1 without calling `renderNative()`, retains the same author/role/swipe attributes, emits `MESSAGE_EDITED`, confirms that the reader accepted the new canonical text, and requests Backlog. Before the fix, the targeted command below failed with “Original message located.” Afterward it reports “Exact source could not be located”, opens native chat, and keeps the composer usable. The same test covers a subsequent native render with an index-only notification and an in-place canonical edit while the DOM stays stale. Existing reorder coverage verifies that candidate scrolling and returning to the pinned reader still work, while a missing candidate does not scroll.

Pinned-source inspection found no source-object/text-revision token on the native element (`public/script.js:2618–2705`). `MESSAGE_EDITED` precedes native text replacement (8405–8431); render notifications carry only index/type, including streaming error notifications (3829). A notification, matching DOM attributes or a DOM mutation is insufficient proof. The adapter therefore preserves candidate navigation but always returns the unresolved result. No raw-Markdown/rendered-text comparison or host formatter hook is introduced. The host probe expectation was updated for the honest notice and syntax-checked, **not executed**.

Commands actually run:

```sh
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl18 node --test --test-name-pattern='stale native revision' tests/m1-reader-browser.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl18 node --test tests/m1-reader-browser.test.mjs
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/probes/dyl19/*.test.mjs
node --check src/host-adapter.mjs
node --check tests/probes/dyl18/reader-host.mjs
git diff --check
```

Results: targeted pre-fix reproduction **FAIL as expected**; corrected full browser suite **15/15 PASS**; Node regressions **37/37 PASS**; syntax/diff checks **PASS**. `sha256sum -c SHA256SUMS` in `docs/evidence/dyl18` verified all nine unchanged historical artifacts. Browser: headless Chromium 151.0.7922.34, synthetic host fixture, actual extension entry and pinned-host Showdown/DOMPurify libraries. The 12-scenario SillyTavern host campaign was **not rerun**, as requested by the review. Its existing results/screenshots/checksums are retained at the recorded host-tested SHA `3d136668e97a47f602775c9297b567c73293261e`, not attributed to this new adapter. No hosted GitHub CI result is claimed. All previous untested surfaces remain untested; DYL-18 remains In Review and Gate A remains NOT_RUN.

## DYL-26 isolated host storage spike — 2026-10-12

The [spike report](M1_HOST_STORAGE_SPIKE.md) records exact candidate/host/fixture hashes, commands, stored records, negative cases and identity limits. `tests/probes/dyl26/host-probe.mjs` creates its own disposable checkout and data root from a pinned host checkout with installed dependencies; it applies the test-only mount patch and module, uses authenticated synthetic users and loopback-only HTTP, then removes only its owned process/data/checkout. Supply a new output directory; an existing output or fixture namespace refuses collision.

This is an **EXPERIMENTAL_HOST** storage/API test, not a native UI lifecycle test or production persistence. New/copy/branch identities and view activation are test-only host additions. Native rename is tested for safe refusal; identity preservation through rename remains unsupported. Node and actual-entry browser regressions retain the unchanged session-only stage; their passes are distinct from owner experience. Gate A remains NOT_RUN.

## DYL-27 native lifecycle experiment — 2026-10-12

[Report, exact commands, hashes and classifications](M1_NATIVE_IDENTITY_ACTIVATION.md). The runner in `tests/probes/dyl27/host-probe.mjs` owns a disposable pinned host, synthetic accounts/cards/transcripts, browser context and deterministic loopback responder. It distinguishes native UI selection/editor/send, direct native browser-function calls, actual native endpoints, fault injection and synthetic regressions. Do not use its experimental API or patch as production persistence. Existing transcript adoption/import allocation, complete group/card lifecycle, reordered canonical load responses and automatic interrupted-update recovery remain blocked or untested. Gate A stays NOT_RUN.


## DYL-42 native writers — 2026-10-14

[Complete report and reproduction](M1_NATIVE_WRITER_COVERAGE.md). Set `SN_DYL42=1` when running `tests/probes/dyl28/host-probe.mjs` to apply the additional test-only writer patch and invoke `tests/probes/dyl42/writer-campaign.mjs` after all inherited checks. Use only a disposable pristine pinned host and a new evidence directory. Source inspection covers all listed native writers including startup migration, Data Maid, account reset/delete and BYAF import; inspection never certifies runtime support.

The campaign distinguishes native browser-function invocations, clicked native controls, actual authenticated multipart/JSON endpoints and fault injection. It checks fresh/forged/identical imports, no-op versus changed source revisions, stale CAS/tickets, native copy/two branches and independent edits, four-member duplicate-label groups with explicit visual refusal, collision revocation before byte restoration, actual canonical and registry permission failures, malformed/corrupt/unknown state, restart and owned cleanup. Production stage/reader/reducer bytes remain unchanged. Full results/counts/hashes are in the linked report; Gate A stays NOT_RUN.

## DYL-43 native lifecycle and registry boundaries — 2026-10-14

[Complete inventory, failure matrix, exact commands, SHAs, raw records/hashes and cleanup](M1_NATIVE_LIFECYCLE_INVALIDATION.md). Frozen proof `ca577c2da9fafb50210a1db3e2e416dc27a78854`: **38/38** lifecycle checkpoints (16 inherited + 22 new), **33/33** inherited writer checkpoints on the same patched host, **64/64** Node and **24/24** actual-entry Chromium. Native browser rename includes historical message rewriting; other new native lifecycle/cleanup paths use authenticated endpoints with explicitly identified synthetic setup and faults. Failed registry invalidation refuses native mutation; permanent scoped/chat revocation and pending-store refusal survive tested restart. The unobserved identical-byte replacement counterexample **accepts old authority** and supports REVISE, not comprehensive coverage. Startup/account/migration/restore and other character-import formats remain source-only/NOT_TESTED; multi-process, physical device, real provider and power-loss behavior are NOT_TESTED. Gate A remains NOT_RUN.

## DYL-44 lifecycle reservations and write generations — 2026-10-14

[Contract, commands, frozen SHAs, hashes, raw bytes and limits](M1_NATIVE_LIFECYCLE_GENERATIONS.md). `SN_DYL44=1` applies all inherited patches plus the new overlay and runs 16 inherited + 20 new checkpoints in an owned pinned-host/data-root process. `SN_DYL44=baseline SN_DYL43=1` runs the complete inherited lifecycle campaign with the new overlay; `SN_DYL44=baseline SN_DYL42=1` runs the complete inherited writers. Use a fresh output directory and only the documented disposable pin/dependencies.

Final evidence: 36/36 new-campaign expected outcomes, 38/38 inherited lifecycle, 33/33 inherited writers (overlapping totals), 64/64 Node and 24/24 actual-entry Chromium. Two new outcomes reproduce unsafe unknown-write and whole-root rollback controls; they are **not safety passes**. New races use actual authenticated native endpoints with deterministic barriers at native async boundaries. File-permission and injected failures, process stop during native rename, restart refusal, source/content versus write-generation separation, and unchanged visual records are recorded independently. Whole-root rollback uses only generated test-owned files and hardlinks to retain file identities; it is synthetic restore, not a supported restore API. Recommendation REVISE; no physical-device, paid-provider, multi-process or power-loss claim. Gate A remains NOT_RUN.


## DYL-45 external authority and enrollment — 2026-10-14

[Exact commands, counts, hashes, raw bytes and limitations](M1_EXTERNAL_STORE_AUTHORITY.md). `SN_DYL44=baseline SN_DYL45=1` runs the new campaign after all 16 inherited load/CAS checks. `SN_DYL45=baseline` applies the same overlay without the new campaign, permitting unchanged DYL-42/43 comparisons. The original DYL-44 counterexamples remain untouched. Independent external authority is outside the owned data root and excluded from the hardlink rollback snapshot.

Do not label the complete inherited overlay suites PASS: their unchanged availability expectations fail under conservative external pending/digest refusal, with explicit raw evidence and counts in the report. Missing/corrupt-state tests restore only injected fixture faults, never imply a supported recovery API. Node and actual-entry Chromium regressions exercise unchanged production files. No account migration, external-authority rollback, cross-process or power-loss guarantee. Gate A remains NOT_RUN.


## DYL-46 external reconciliation — 2026-10-14

[Contract, exact commands, hashes, fault matrix and evidence](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md). Frozen proof `1ae869f6b289a71a490fedf15799073e559c1ac2`, pinned SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Enable `SN_DYL46=1 SN_DYL44=baseline SN_DYL45=baseline` in the existing owned DYL-28 runner; `SN_DYL46=baseline` applies only the patch when exercising an unchanged predecessor campaign.

New campaign: 43 expected checkpoints, including two unsafe accepted counterexamples. Full unchanged writer overlay 33/33; lifecycle FAIL after 21; generations FAIL after 27; authority FAIL after 32. Unreached suffixes are not green; no inherited campaign assertions changed. F1–F8, clean-abort faults, two accounts, enrollment races, held old CAS/load, root rollback across two restarts and forged local fields have direct replacement evidence. Failed external intent plus unknown byte restoration plus process restart remains an explicit unsafe control. Recommendation REVISE / compatibility HOLD.

Node TAP 64/64; actual-entry Chromium 24/24; Node v26.8.1 / Chromium 151.0.7922.34. All owned cleanup checks pass; no new host/provider/device/owner compatibility claim. Raw JSON is losslessly XZ-compressed; readable indexes, baseline boundary bytes, summaries and checksums are included.


## DYL-46 review correction validation — 2026-10-15

[Updated protocol, exact per-run commands and evidence](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md#pr-20-review-corrections--2026-10-15). Protocol proof `37cef930fcbde90ccbb20071fa4834a3dddc91b6`; final reconciliation/writer proof `b57257fde1190ca5b074ed276ba12591f40c7ec5` changes only the new campaign's expired-client fixture. Runner/host implementation hashes are identical. Original evidence remains under dyl46; corrections and all unsuccessful attempts are under dyl46/review with separate checksums.

New campaign 56 expected = 16 inherited + 40 new, including ONE unsafe unknown-writer control. Failed observation + restored bytes + two restarts now proves durable refusal; pending/missing/corrupt/binding-invalid witness and finalization faults refuse without reconstruction. Inspected completed revocation checks rename/delete/import, old CAS/load, restart, healthy work and failed finalization. Partial new-card write remains INDETERMINATE. Root rollback and selected-field forgery remain refused.

Unchanged inherited suites: writers 33/33 after one preserved common-setup timeout; lifecycle FAIL after 23 (partial rename); generations FAIL after 27 (external-before-local EACCES); authority FAIL after 31 (old store-wide refusal versus completed revocation). Unreached suffixes are NOT_REACHED. Node 64/64. Unchanged actual-entry Chromium FAIL 23/24 on both attempts, line 445 expected false/actual undefined from absent-source optional chaining; no test or production change made to hide it. REVISE / HOLD; no hosted CI or owner-experience claim.


## DYL-46 re-review validation — 2026-10-15

[Current report, commands, revisions, hashes, raw evidence and limits](M1_EXTERNAL_AUTHORITY_RECONCILIATION.md#pr-20-re-review-corrections--2026-10-15). Frozen proof `59acdbc0c66cb58ed616351947cd1c83ddc85ae7`; all final campaigns use identical frozen runner/host patch bytes. Reconciliation 61 expected, including ONE unsafe unknown-writer control; writers 33/33, approved lifecycle 41/41, generations 37/37, approved authority 46/46. Complete suffixes reached. Node TAP 64/64; corrected actual-entry Chromium 24/24 at the PR proof and at main1046106 with identical corrected test bytes. Separate old failures and new development failures are preserved. Fixture resets restore both independent authorities only after pending/restart refusal proof; they are synthetic isolation, not recovery. No production, real provider, multi-process, physical-device or human-gate claim.

# DYL-47 storage architecture checkpoint — 2026-10-15

Documentation-only checkpoint based on fetched main `8b7e8e04f1218e73902f997d9018765a79f76128`, merged PR #20, DYL-46 status Done, current official SillyTavern server-plugin/UI-extension documentation, and the reviewed DYL-19 through DYL-46 reports. See [checkpoint](M1_STORAGE_ARCHITECTURE_CHECKPOINT.md) for evidence scope, links, architecture classifications and limitations.

No pinned-host campaign or executable test was rerun; no production source, proof patch or test fixture was changed. A standard-library Python check passed for local Markdown links/anchors across the four changed documents, and `git diff --check` passed. The changed paths are documentation only. No hosted CI run or new runtime test is claimed; prior DYL-46 results remain historical evidence, not DYL-47 validation.


## DYL-48 upstream proposal validation — 2026-10-15

Documentation-only assignment on fetched main `f3ff9a4b61fa31df3e57cf3367f0dcf4860f3fe6`. Prerequisites checked with `git fetch origin main` and `gh pr view 21 --json state,mergedAt,mergeCommit,url`; PR #21 MERGED, Linear DYL-47 Done. Dedicated branch `planning/dyl-48-upstream-api-proposal`. [Research versions, official URLs, bounded search coverage and findings](UPSTREAM_HOST_CAPABILITY_TECHNICAL.md#a-existing-host-surfaces-and-prior-proposals) distinguish source inspection from runtime evidence.

Current upstream source was downloaded read-only with `git clone --depth 1 --branch release https://github.com/SillyTavern/SillyTavern.git /tmp/sillynovel-dyl48-upstream`, then `git fetch --depth 1 origin staging` in that research clone. Exact release/staging SHAs are in the appendix. GitHub REST issue/PR search, GraphQL Discussion search, issue/comment reads and PR status reads were read-only. Official HTML guides were checked on 2026-10-15; no upstream write or maintainer contact occurred.

Validation commands: `python3 /tmp/dyl48-validate.py --external`, `git diff --check`, and `git diff origin/main --name-only` (after staging new drafts). The temporary standard-library checker validates relative Markdown files/heading anchors in the five changed documents, balanced fences, public word range, seven JSON examples and cross-example handle/revision/receipt consistency. It verifies GitHub source objects/line bounds, issue/PR URLs via the GitHub API and official docs HTTP/heading anchors; the DYL-48 URL was verified through Linear. Result: PASS; public draft 887 words. Initial invocation using `python` failed because that executable is unavailable; the actual check ran successfully with `python3`.

Manual editorial review: every illustrative API is explicitly PROPOSED; unsupported/existing/internal/experimental evidence remains distinct; public copy contains no private records, credentials, raw test logs or fixture paths. The two drafts and minimal STATUS/DECISIONS/TESTING updates are the only changed paths. No runtime campaign, browser, real provider, device, CI or owner-experience test was run or newly claimed. Prior experimental reports retain their original pins and limitations. Gate A NOT_RUN; DYL-22/23 Blocked; production persistence/M1.3/M2 unauthorized. **NOT_SUBMITTED** upstream.

## Independent project storage validation plan — 2026-10-15

[DYL-49–56 plan](M1_PROJECT_STORAGE_IMPLEMENTATION.md) adds a separate project persistence matrix: strict schema/ownership, CAS and failed writes, restart, decoded PNG bounds/hash/foreign access, explicit reopen and A→B→A detachment, stale responses, plugin absence, two authenticated users/two clients, native composer/navigation regressions, and exact named canonical-file hash comparisons. Documentation-only checks do not count as runtime evidence. Earlier overlays remain historical; no new production compatibility or Gate A verdict is implied.

## DYL-57 project portability — 2026-10-15

[Contract](M1_PROJECT_PORTABILITY.md) and [exact implementation evidence](M1_PROJECT_PORTABILITY_IMPLEMENTATION.md). Regression matrix: complete saved-scene roundtrip/fresh project-actor-asset IDs; same-name independence; strict malformed container/image/ownership/limits; inspected rollback at creation/asset/final-scene/COMMIT; quotas; consistent export/save; real account/CSRF refusal; two-client imports; UI dirty-state preservation, explicit open, delayed native switch/replacement; restart; absent plugin; enumerated native file hashes. Resource probe separately measures full aggregate-pixel decoding off the main event loop. Earlier DYL-54 counts remain historical. Gate A NOT_RUN.

## DYL-58 operator database recovery — 2026-10-15

[Contract and test limits](M1_PROJECT_DATABASE_RECOVERY.md); [exact-candidate commands, faults and evidence](M1_PROJECT_DATABASE_RECOVERY_IMPLEMENTATION.md). Run `node --test --test-isolation=none plugins/sillynovel-storage/test/*.test.mjs` for storage/bundle/recovery, the existing Node/actual-entry Chromium suites, and `SN_RECOVERY_RUN=1 SN_PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/probes/project-portability/host.mjs /absolute/pinned-disposable-host` for the inherited host checks plus recovery. `node tests/probes/project-recovery/resources.mjs` measures representative, larger-store and 16M-pixel cases. These create only owned synthetic fixtures and never install into a live host.

New evidence must prove exact row/BLOB/owner/revision/actor/lock preservation, absent-slot restoration with existing same-incarnation accounts, restart/explicit open, two-user separation, DELETE/WAL write overlap, invalid-state refusal, stage ownership and interrupted-process behavior. Compare the actual destination/source filesystem and named native-file hashes after failures. Keep power loss and untested versions separate; no test run supplies Gate A acceptance or parent completion.

## DYL-59 unused artwork cleanup — 2026-10-15

[Contract](M1_PROJECT_ASSET_CLEANUP.md) and [frozen evidence/commands](M1_PROJECT_ASSET_CLEANUP_IMPLEMENTATION.md). Run existing storage/bundle/recovery suites plus `plugins/sillynovel-storage/test/cleanup.test.mjs`, Node regressions including `tests/m1-project-scene.test.mjs`, and actual-entry `tests/m1-reader-browser.test.mjs`. `SN_CLEANUP_RUN=1` enables the real cleanup campaign in `tests/probes/project-portability/host.mjs` against the pinned disposable source; it imports `tests/probes/project-cleanup/host.mjs`. Use the external Playwright module as documented above; no production dependency added.

Coverage: empty/all/shared/duplicate-content references; explicit single/multiple removal; strict body/IDs, two-owner/project isolation and CSRF; stale scene/inventory and repeated removal; corrupted candidate/missing reference refusal; rollback before/after the first delete with committed-row comparisons; SQLite cross-connection save/upload/export/backup serialization; dirty and pending-import/save gates; confirm cancellation; delayed preview/deletion after switch/replacement/disable; invalid/lost/proxy receipts; saved layout/locks/assets, reload/reopen/restart; portable export and verified pre/post backups; logical quota refusal/recovery/new upload and separate freelist/file measurements. Named synthetic native files are hashed before/after; no global non-mutation inference. Maintain verified synthetic backups before destructive checks. Power loss, physical devices, production installs and unknown platforms remain NOT_TESTED; owner Gate A remains NOT_RUN.

## DYL-22 PNG library — 2026-10-15

[Contract](M1_PNG_ASSET_LIBRARY.md) and [exact-candidate results](M1_PNG_ASSET_LIBRARY_IMPLEMENTATION.md). Reuse the Node reducer/model, optional storage and actual-entry Chromium suites plus `SN_LIBRARY_RUN=1` in the existing disposable portability host runner. New storage/model coverage includes two backgrounds/two sprites and duplicate labels, account/project isolation, category compatibility, CAS, failed metadata writes, delayed uploads, saved-library cleanup protection, explicit unregister/save/delete, true v1 upgrade/rollback, full backup and deliberately selected-only portable copies. Host validation must exercise actual controls/reload/reopen/reselection and compare precreated synthetic native-file hashes; desktop/narrow screenshots do not establish touch support. T01–T14/T19/T22–T23/T27–T30 remain applicable within this slice; no Gate A or later milestone verdict.

## PR #29 migration-policy correction

[New exact-head campaign](M1_PNG_ASSET_LIBRARY_REVIEW_CORRECTION.md) preserves prior frozen logs and adds v1 startup non-mutation; verified-backup-to-new-output migration and CLI; full output/account validation; original/backup retention after success and failures; empty-slot/race protection; and a focused actual-entry label-edit/unregister/save/reload/reopen test plus migration-required reader fallback. The existing disposable host runner supports `SN_MIGRATION_RUN=1` with `SN_LIBRARY_RUN=1` for real startup refusal, CLI migration and browser reopen. No prior evidence is relabeled as a run on the correction.

## DYL-23-A manual stage UX — 2026-10-16

[Workflow and scope](M1_MANUAL_STAGE_UX.md); [frozen implementation, exact commands/results/evidence and remaining gaps](M1_MANUAL_STAGE_UX_IMPLEMENTATION.md). Run the canonical Node and storage suites and actual-entry Chromium suite above; use `SN_STAGE_UX_RUN=1 SN_LIBRARY_RUN=1 SN_MIGRATION_RUN=1` with the existing disposable `tests/probes/project-portability/host.mjs` runner for the authorized actual UI campaign. The new hook adds four manual actors, duplicate labels, three slots/offstage, explicit move/swap/replace, presence/outfit/locks, seven reusable entries, save/dirty/save, detached reload/explicit reopen, discard cancellation, local Escape, desktop/narrow screenshots, real peer conflict/lost committed receipt, A→B→A, named native-file hashes and real native reply. Migration UI selection uses the original UUID instead of an ambiguous display name. T01–T14/T19/T22–T23/T27–T30 apply within the documented slice; no native groups, attached source overlays, physical touch/IME or Gate A acceptance is inferred. Keep development failures separate from frozen results.

## DYL-23-B attached temporary expressions — 2026-10-16

[Contract](M1_PROJECT_EXPRESSIONS.md) and [exact frozen-candidate evidence](M1_PROJECT_EXPRESSIONS_IMPLEMENTATION.md). Add `tests/m1-project-expressions.test.mjs` to the canonical Node/source/prefix/reducer/project suite. The actual-entry Chromium suite additionally exercises temporary PNG choice/apply/clear, navigation/revisit, pinned append, source invalidation, save-body exclusion, reload/reopen, same-name UUIDs, missing-art base fallback and delayed decode across selection/edit/swipe/outfit/actor/chat/replacement/detach/disable. Run `SN_EXPRESSIONS_RUN=1 SN_PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/probes/project-portability/host.mjs /absolute/pinned-disposable-host` for the existing host campaign plus the expression workflow using an independent portable project copy, real native edit/swipe/Continue/Stop, screenshots and named native-file integrity. No live data or real provider. Group/device and human Gate A remain separate; Gate A NOT_RUN.

## PR #31 reorder review correction — 2026-10-16

[Current correction/evidence](M1_PROJECT_EXPRESSIONS_REVIEW.md). The actual-entry Chromium suite adds two unchanged-object reorder cases: prefix-only reorder with selected index unchanged, and reorder moving the selected object. Both use only native fixture history/event updates, delay SHA-256 to inspect synchronous base fallback/disabled apply, then verify automatic suffix invalidation. Encoder/digest instrumentation verifies that scrolling and unchanged canonical refreshes do not run visual history validation. Reader tests additionally cover full/sample order/count/availability revisions without content/selection revision churn. Existing 57 browser regressions remain intact; the chooser label explicitly identifies a pending expression to apply.
