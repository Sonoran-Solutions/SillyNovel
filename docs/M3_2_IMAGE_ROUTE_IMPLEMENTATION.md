# M3.2 first image route — implementation record

## PR A — the seam probe, tests only

**Candidate, unmerged. Frozen `75b2807`**, based on main `522b79d` (the [plan](M3_2_IMAGE_ROUTE_PLAN.md) and the [owner rulings I1–I10](DECISIONS.md#owner-rulings-i1i10--m32-first-image-route--2026-11-08)). Tracked by [DYL-213](https://linear.app/devils17/issue/DYL-213/sillynovel-m32-first-image-route-host-image-generation-local-comfyui). Tests and a fixture only (plan section 7, PR A): nothing under `src/`, `index.js`, `style.css` or the plugin changes, so the runtime behaves exactly as main does. No provider was contacted; the owner's ComfyUI on port 8188 was never reached.

### What it adds

| File | Purpose |
| --- | --- |
| `tests/fixtures/m3-comfy-endpoint.mjs` | A deterministic loopback stand-in for a ComfyUI server: `/system_stats`, `/object_info`, `/prompt`, `/history` and `/history/<id>`, `/view`, `/interrupt`, plus `/control` to script steps (`hold`, `delayMs`, `error`, `status`, `noOutputs`, `format`) and `/log` to read every request with its raw body, byte count and SHA-256. Binds 127.0.0.1 only, on an ephemeral port or `SN_COMFY_PORT`; **refuses port 8188**, the owner's real ComfyUI. Job ids never restart and completed jobs stay answerable across `/control reset`, so a stale server-side poll from one case cannot consume the next case's job. The PNG it serves is `tests/fixtures/m12-stage/tavern.png`. |
| `tests/probes/m3-image-seam/endpoint.test.mjs` | The fixture's `node:test` self-check: Origin refusal, option shapes, raw-body logging byte for byte, both history forms, hold and release, hold and interrupt, backend error, empty outputs, a non-PNG result, and that asking for port 8188 exits without listening. |
| `tests/probes/m3-image-seam/host.mjs` | The measurement. Starts the disposable pinned SillyTavern 1.19.0 host through `tests/probes/m2-director/harness.mjs` (unchanged), starts the fixture, sets `comfy_url` to the fixture **before** `source` becomes `comfy`, asserts `comfy_url` is still the fixture immediately before every seam call, and calls `SlashCommandParser.commands.imagine.callback({ quiet: 'true', gallery: 'false', negative, _abortController }, prompt)` from inside the page. Records per case the host's `/api/` requests (the `/api/sd/comfy/generate` body; upload metadata with the image field's length and SHA-256 only), the fixture's requests, the loopback text endpoint's requests, chat length and hash, background, `extension_settings.sd` before, during and after, the user images directory, toasts, page errors, dialogs and the exact return value. A returned path is validated (string, same origin, under `/user/images/`, no `%` or `\`, no `..` after decoding, unchanged by normalisation, no redirect followed) before anything is fetched. After every case it waits, bounded, until the host's server-side poll of that case's job has reached a terminal history answer or a view fetch, then resets the fixture. Closes the harness and stops the fixture before the final evidence write, each closer in its own try/catch, and prints `PASS`/`FAIL` for the eight required cases and `FINDING` for the nine hazard cases, then `VERDICT GO` or `VERDICT STOP`. |
| `tests/probes/m3-image-seam/README.md` | What it measures, the command, what GO and STOP mean. |

The self-test is not registered in `tests/probes/dyl60/run.py`; the campaign and `check-discovery.py` (15/5/1) are unchanged. PR C, which changes the runtime, registers it and adds the fixture to the campaign.

### What the probe measured

One supervised run on the frozen candidate, from a clean worktree at `75b2807`, on a disposable pinned host (SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`, a fresh `git clone` of the owner's local SillyTavern clone with `npm ci`; the owner's install untouched), Node v26.8.1, headless Chromium 151.0.7922.34 via the pinned Playwright. Package: [`docs/evidence/m3-2-a/`](evidence/m3-2-a/): `evidence.json` (with `startedAt`, `endedAt`, `elapsedMs`, `exitCode` and the `cleanup` outcome recorded after the closers ran), `run.json` (the wrapping script's command, timestamps, elapsed seconds, exit code and leftover-process count), `leftover-processes.txt` (the wrapper's process listing three seconds after exit), `supervisor.json` (the supervising runner's terminal record: status, exit code, duration, processes reaped, output limits), `probe.txt`, `endpoint-test.txt`, `host.log`, `candidate.txt` and `wire/<case>.json` (15 files; image fields and base64 runs replaced by length and SHA-256; each under 1 MiB). 48 seconds by the probe's own clock (`evidence.json` `elapsedMs` 48019) and 53 seconds for the wrapped command (`run.json` `elapsedSeconds`), 62 seconds for the whole supervised job including the fixture self-test (`supervisor.json` `duration_s`); 17 cases; exit 0 in all three files; no page errors or dialogs; the harness closed and the fixture exited on SIGTERM before the final write (`evidence.json` `cleanup`); three seconds after the probe exited the wrapper found no process matching the probe, fixture or owned root (`leftover-processes.txt` empty, `run.json` `leftoverProcesses` 0), and the supervising runner had nothing to reap (`supervisor.json` `leftover_processes_killed` 0); the owned host clone was deleted after copying. An earlier run of the same candidate was discarded because its wrapper counted one matching process at the instant of its check without listing it; this run replaces it.

**Setup facts.** The seam exists with a function callback of arity 2. The host's shipped defaults were `source: extras`, `comfy_type: standard`, `comfy_workflow: Default_Comfy_Workflow.json`, and **`comfy_url` defaulting to port 8188**, which is why the probe sets the URL first. The user's `workflows` directory held the two shipped workflows, and `/api/sd/comfy/workflow` returned the shipped default byte for byte (SHA-256 `18f3e44c…`). Because the probe configured the extension without its UI, the saved sampler `DDIM` was not among the options the host loaded from the fixture (`euler` only); the probe aligned it and recorded the change (see H7).

**Required cases**, all PASS. Each also required: settings deep-equal before and after (excluding the case's own deliberate override, restored and checked in its own `finally`), zero text-endpoint requests, chat and background unchanged, no page error or dialog.

| Case | Observed on `75b2807` |
| --- | --- |
| R1 baseline | Returned `/user/images/<timestamp>.png`, validated as a same-origin relative path before the fetch; one `/prompt`; the host's `/api/sd/comfy/generate` body's `prompt` string equals the fixture's raw `/prompt` body byte for byte; the six node types equal the shipped default's; the received workflow `deepEqual` to one built independently in Node from the host checkout's shipped default with the known substitutions (positive `SN-PREFIX-TEXT, a quiet reading room at dusk` and negative `SN-DRAFT-NEG, SN-NEG-PREFIX` by the plan's `combinePrefixes` rule, seed 1234, the settings snapshot's model, VAE, sampler, scheduler, steps, scale and dimensions, the host's denoise and clip-skip rules), so no extra field, node or parameter was sent; the generate body had exactly the keys `url` and `prompt` with `url` the fixture origin; the file landed in the user images root (`ch_name` empty, `gallery=false`), and its bytes hash to the fixture's PNG; no decoy string on either wire. |
| R2 marker | With `prompt_prefix` = `SN-PREFIX-HEAD, {prompt}, SN-PREFIX-TAIL`, the wire carried `SN-PREFIX-HEAD, harbor at noon, SN-PREFIX-TAIL`. |
| R3 inert text | `/sendas name=Seam SN-SLASH-INJECT <img src=x onerror=alert(1)> "quoted" é` reached the wire as data, JSON-escaped only; no chat message, no command effect. |
| R4 abort, host controller | With the job held and the host's own `SlashCommandAbortController` passed as `_abortController`, abort settled the call to `undefined` within the 10 s window, the fixture logged `/interrupt`, no file was saved, settings unchanged. The `/interrupt` entry is what was measured; it is ComfyUI's global interrupt and no claim that a real backend stopped follows. |
| R5 chat change | With the job held and the call still pending, switching to `Seam B` and releasing: the host fetched the result from the fixture, then discarded it; the call returned `undefined`, no file was saved, the host showed “Chat changed, generated image discarded.”, and `Seam B`'s chat and background were unchanged. |
| R6 backend error | A ComfyUI error history item: the call returned `undefined`, no file, exactly one `/prompt`, no retry. |
| R7 non-PNG | A `jpg` result was saved and returned as `/user/images/<timestamp>.jpg`; the saved bytes are the fixture's synthetic non-PNG bytes, not a PNG. The adapter must refuse it (plan 3.5). |
| R8 still polling | Held for 15 s: the call was still pending, and at least one fresh `/history` request arrived after the 15 s checkpoint (cumulative polls recorded as an observation); released, it settled to a path. That the host polls without any deadline is a source finding (plan section 2); the runtime observation is only the 15 s. |

**Hazard cases** (nine observations, each with its override restored and checked; H6 found no mutation; the plan changes they suggest are proposed below, not adopted):

| Case | Observed |
| --- | --- |
| H1 macros | `{{user}} meets {{char}}` became `Decoy Traveller meets Seam A` on the wire: both macros expanded. |
| H2 character prefix | `char, at the window` with a per-character prompt set: `SN-CHAR-PREFIX` reached the wire. |
| H3 trigger word | The prompt `background` made **one text-model request** carrying the decoy persona description, card description, persona name and the decoy chat message; the image prompt became the model's reply. No background or chat change (quiet). |
| H4 `free_extend` | Same as H3 for an ordinary prompt: one text-model request with the same decoys. |
| H5 avatar workflow | `Char_Avatar_Comfy_Workflow.json` put a base64 avatar (104,808 characters) into the `/prompt` body through an `ETN_LoadImageBase64` node, and carries `VAEEncode` and `ImageScale` beyond the six-node allowlist. |
| H6 dimensions | For a FREE request, `width`/`height` did not change in flight (512 × 512); no other key changed. |
| H7 selection repair | With the saved sampler absent from the loaded options, the call rewrote `sd.sampler` to `euler` and sent `euler`: settings are **not** isolated when a saved choice is stale. |
| H9 server-side polling | After R4's abort settled the client call, the host's server kept polling `/history/<id>` until the fixture reported the job terminal: one stale poll observed after settlement. Runtime confirmation of plan section 2's no-deadline reading, and the reason a Cancel that lets the call finish (I5) leaves the host polling until the backend answers. |
| H8 abort, DOM controller | A DOM `AbortController` passed as `_abortController` was ignored: still pending 10 s after abort, no `/interrupt`, and after release the host saved a file and returned its path. Cause, on 1.19.0 source L3063: the host registers the controller only if the controller object itself has `addEventListener`. |

Every failure path measured (R4, R5, R6) returned `undefined`, never `''`, matching the corrected return contract in plan section 2.

### Findings that bear on the plan

Proposed for the owner's decision and not adopted by this record:

1. **Abort argument (H8, R4).** Plan sections 2 and 3.1 say an `_abortController` is honored; on 1.19.0 the host honors only a controller object with `addEventListener`, which its `SlashCommandAbortController` has and a DOM `AbortController` lacks. Proposed wording for section 2's `generatePicture` row: “An `args._abortController` is honored only when the controller object itself has `addEventListener` (L3063); the host's `SlashCommandAbortController` qualifies, a DOM `AbortController` does not.” Plan 3.1 step 3 and I5's Stop host job pass the host's controller type. The probe's required R4 already measures that form.
2. **Stale saved selections (H7).** Add to plan 3.2's profile: “every saved model, sampler, scheduler and VAE choice is among the options the host loaded from the backend”, else the review text is not what is sent. The probe's `SETUP selections aligned` line is the check.
3. **Server-side polling (H9).** Plan 3.5's timeout and Cancel rows should say that the host's server keeps polling the backend after the client stops waiting, until the backend reports the job terminal; an abandoned job therefore keeps a host request open, not just a backend job. This confirms section 2's source reading at runtime and changes no ruling.
4. **Avatar workflow (H5).** The allowlist must refuse `ETN_LoadImageBase64`, `VAEEncode` and `ImageScale` as well as the `%user_avatar%`/`%char_avatar%` placeholders; section 3.2 already refuses anything outside the six node types, so this is a confirmation, not a change.

### TESTING coverage

| Row | Covered here (pinned host, synthetic backend) | Still NOT_RUN |
| --- | --- | --- |
| T74 | The supported configuration: wire equals review byte for byte, no command execution, no text-model call, no chat or background mutation, no unexpected outbound field, decoys absent (R1–R3); and the four hazards that break it: H1 and H2 put persona, character or per-character text on the image wire, H3 and H4 made a text-model request with decoys measured on the text wire | Other image-aware extensions; the owner's 1.18.0 |
| T75 | — (the adapter's refusals are PR B and C) | All of it |
| T76 | What the host does with a result: same-origin path, root folder with `gallery=false`, non-PNG saved as `.jpg` (R1, R7) | The adapter's staging and refusals (PR C) |
| T77 | What the host does on abort, chat change and a held backend (R4, R5, R8, H8), including that the interrupt is ComfyUI's global one | SillyNovel's own timeout, Cancel, Stop host job and stale rules (PR B and C) |

### Implementation choices for owner review

1. **The probe is a measurement, not a test of shipped code.** It exits non-zero only when it cannot complete; a failed property is a `STOP` verdict in the evidence, so a later run can compare.
2. **`comfy_url` is set before `source`**, and re-asserted inside the page in the same task as the callback, because the host's default URL is the owner's real ComfyUI port. A wrong `comfy_url` is the one condition that stops the run.
3. **The fixture refuses port 8188 outright** rather than merely defaulting elsewhere.
4. **Stale saved selections are aligned at setup and recorded**, so R1 measures the seam and H7 measures the hazard separately. An earlier iteration failed R1 on this alone.
5. **The supported controller shape is the host's `SlashCommandAbortController`** (coordinator's decision during review, finding 5 below). The first iteration had R4 use a DOM `AbortController` and reported `STOP`; that measurement is kept as H8 so the record shows both forms. The plan's text named the argument without a type, so this is a clarification the owner can still reject.
6. **The self-test is not in the campaign runner yet**; registering it changes `check-discovery.py`'s counts and belongs with PR C's runtime change.
7. **Workers and review.** The fixture was written by a Codex worker whose sandbox could not bind a socket or commit; the coordinator fixed the self-test's interrupt method, the output filenames and one job id, verified the self-test and committed. The probe was written by a native Claude agent in three iterations. A fresh Codex reviewer read the probe at `888c66b` and returned one blocker (a returned path was fetched before validation), six should-fix findings (incomplete base64 redaction, under-asserted R7 and R8, invariants reported rather than enforced, the controller shape, fixed sleeps as readiness, cleanup not guaranteed) and one nit; all were corrected in `12ae4d3`. The reviewer's second pass confirmed four and left five residuals: encoded traversal in a returned path, a digit-string exemption and raw fallback in the redaction, deadlines not enforced inside awaited predicates, R8's polling evidence, and partial-failure cleanup in the shared harness. The first four were corrected in `2e3b83b`; the fifth is **declined for PR A** because `tests/probes/m2-director/harness.mjs` is shared and deliberately unchanged here and the supervised runner kills descendants, and it is recorded as a known limit below. The reviewer's third pass confirmed those four and left one partial: after a wait expires inside a hazard case, the override's restore step awaits page evaluations with no inner deadline before the run's STOP and cleanup. **Accepted as a known limit** by the coordinator rather than iterated again: the documented command wraps the whole probe in `timeout --kill-after=5 600` and the supervised runner reaps descendants, so the measurement cannot hang the host; the owner may ask for the inner bound in PR C. A frontier reviewer (Codex Astra, authorized by the owner for this review) then read the whole PR at `3fc4d58`: one blocker (the package recorded no elapsed time, exit status or cleanup outcome, and the verdict printed before cleanup), four should-fix (job ids reused across cases, so a stale server-side poll from R4 consumed R5's job; R1 did not exclude unexpected fields; R5 could pass an unrelated failure; hazard wording overstated) and one nit (a `node --check` with two files checks only the first). All six were corrected in `75b2807` and this record; the stale poll became finding H9. The frontier reviewer's second pass confirmed four and left two partials, both in this package rather than the code: the wrapper's leftover-process count was unexplained and the supervisor's terminal record was not in the package, and two wording spots. Both were corrected: the evidence run was repeated on the same frozen SHA with the wrapper listing what it counts after a settle delay, the supervisor's terminal record is included as `supervisor.json`, and the wording was changed. The frontier reviewer's third pass is recorded in the PR. Each iteration's owned roots were deleted; only the frozen run above is evidence.

### Commands and results

```sh
# fixture self-test, from the frozen worktree
timeout --kill-after=5 120 node --test --test-isolation=none tests/probes/m3-image-seam/endpoint.test.mjs
# the measurement
SN_PLAYWRIGHT_MODULE=<pinned Playwright index.mjs> timeout --kill-after=5 600 node tests/probes/m3-image-seam/host.mjs <disposable pinned host>
python3 tests/probes/dyl60/check-discovery.py
node --check tests/probes/m3-image-seam/host.mjs
node --check tests/fixtures/m3-comfy-endpoint.mjs
node --check tests/probes/m3-image-seam/endpoint.test.mjs
git diff --check
```

| Check | Result |
| --- | --- |
| Fixture self-test | 1/1 (one test, every assertion), [`endpoint-test.txt`](evidence/m3-2-a/endpoint-test.txt) |
| Probe | exit 0; R1–R8 PASS; H1–H9 recorded; `VERDICT GO`; 48 s; [`probe.txt`](evidence/m3-2-a/probe.txt) |
| Discovery | PASS, 15/5/1 (unchanged) |
| Syntax and whitespace | PASS |

Node suite, storage suite, browser suite and the native campaigns NOT_RUN: no runtime, test registration or plugin file changed, so main's evidence at `ad4279d` stands for them.

### Not covered

A real ComfyUI (8188 never contacted); the owner's 1.18.0 install; other image-aware extensions listening on `SD_PROMPT_PROCESSING`; RunPod and every cloud source; group chats; non-default model, sampler or VAE selections; physical devices. The host's own startup runs once with its default `extras` source before the probe configures anything; that is host behaviour the probe records but does not control. Known limit: if the shared harness fails part-way through startup (host up, text endpoint not), it does not clean up what it started; the supervised runner's descendant cleanup covers that case for the recorded run. Nothing here shows that a real ComfyUI stops work on `/interrupt`.

### Next

The owner reviews this record and the four proposed plan findings. PR B (the pure request module `src/image-request.mjs`) starts only after that review.
