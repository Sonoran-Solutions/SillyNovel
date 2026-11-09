# M3.2 first image route — implementation record

**PR A accepted — 2026-11-08.** The owner [accepted](DECISIONS.md#owner-acceptance--m32-pr-a-merged-four-findings-adopted-pr-b-go-ahead--2026-11-08) PR A as merged (`3665f6e`), adopted its four findings into the plan, and authorized PR B.

**PR C merged — 2026-11-08.** [#88](https://github.com/Sonoran-Solutions/SillyNovel/pull/88) merged as `d31254a` (frozen runtime `afac1f9`) on the owner's word after the senior review's confirmation pass returned MERGE; M3.2's three PRs are on main.

**PR B accepted — 2026-11-08.** The owner [accepted](DECISIONS.md#owner-acceptance--m32-pr-b-merged-two-proposals-adopted-pr-c-go-ahead--2026-11-08) PR B as merged (`2bc9fea`), adopted its two proposals into the plan, and authorized PR C.

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

## PR B — the pure image-request module

**Candidate, unmerged. Frozen `883d59b`**, based on `267be50` (the [owner's acceptance of PR A](DECISIONS.md#owner-acceptance--m32-pr-a-merged-four-findings-adopted-pr-b-go-ahead--2026-11-08) and the amended [plan](M3_2_IMAGE_ROUTE_PLAN.md)). Tracked by [DYL-213](https://linear.app/devils17/issue/DYL-213/sillynovel-m32-first-image-route-host-image-generation-local-comfyui). Pure module only (plan section 7, PR B; H4): nothing imports `src/image-request.mjs` yet, so the runtime behaves exactly as main does. No UI, adapter, host call, persistence or schema change.

### What it adds

`src/image-request.mjs`, following plan sections 3.2, 3.3 and 3.5 as amended by PR A's findings. It imports `captureOf`, `stillCurrent` and `RESULT_LIMITS` from `src/image-workflow.mjs` and nothing else.

| Export | Behaviour |
| --- | --- |
| `combinePrefixes(str1, str2, macro)` | SillyTavern 1.19.0's rule byte for byte, as PR A measured it (R1, R2): a falsy second part returns the first unchanged and untrimmed; otherwise both parts are trimmed, stripped of one leading and one trailing comma and trimmed again; the first `{prompt}` marker in the first part is replaced when present, else the two are joined with `, `; the result is processed once more. |
| `effectiveTexts(snapshot, draft)` | The FREE-mode texts the host will send: positive from `sd.prompt_prefix` and the draft prompt, negative from the draft negative and `sd.negative_prompt`. Only those two draft fields are ever used (I3). |
| `preflight({ snapshot, workflowText, workflowSha256, draft, options })` | Every rule of plan 3.2 as a refusal code, all returned together: the workflow SHA-256 present as 64 lowercase hex characters; the workflow name present; seam present; `source` `comfy` and `comfy_type` `standard`; `comfy_url` a parseable `http:`/`https:` URL with a loopback hostname (I6); the five mode flags exactly `false`; the prompt non-empty, not a reserved trigger word, not a `char` prefix or `{{charPrefix}}`; no `{{ }}`, angle-bracket marker or `%…%` placeholder in the prompt, the negative or either host prefix; `{prompt}` at most once in the prefix; the workflow parseable, with `"%prompt%"` and `"%negative_prompt%"` exactly once each, exactly one `SaveImage`, no `LoadImage*`, no avatar placeholder, no custom placeholders, every `class_type` in the six-node allowlist; every saved model, VAE, sampler and scheduler among the options the host loaded (PR A, H7); dimensions within today's result limits. Returns a `review` (destination and local flag, workflow name and node types, the generation settings, seed policy, the effective texts, `ok`) even when refused, so the UI can show what would be sent greyed out. |
| `reviewText(review)` | The one deterministic text PR C shows before Submit and hashes as the payload identity: fixed sections `Destination` to `Negative` including the workflow's SHA-256, one JSON-encoded value per line, ending in one newline. |
| `createRequest({…})` | The frozen plan 3.3 request: capture, host chat key, catalog and layout revisions, lock state, the effective texts and settings, workflow and payload hashes, `submittedAt`, `deadlineAt` at 120 s, outcome `pending`. Throws `INVALID_REQUEST` when the capture, chat key or either hash is missing, when the catalog or layout revision is not an integer (so staleness can never be silently disabled), when the review is missing or not `ok`, when the id is undefined or `submittedAt` is not a finite number, or when the workflow hash differs from the reviewed one. |
| `staleReason(request, now)` | The first of `CAPTURE_STALE` (via `stillCurrent`), `HOST_CHAT_CHANGED`, `CATALOG_CHANGED`, `LAYOUT_CHANGED`, `LOCK_CHANGED`, `WORKFLOW_CHANGED`, or `null`. |
| `resultPathProblem(path, origin)` | PR A's returned-path rule as a pure check: a string, no `%` or `\`, not protocol-relative or absolute, same origin, under `/user/images/`, unchanged by URL normalisation (so `.` and `..` segments and double slashes refuse), and ending in `.png` (PR A's R7 showed a `.jpg` result is saved and returned). |
| `createImageSession({ allowance })` | The I2 allowance and reservation state machine: off until `begin(workflowSha256)`; one request in flight; `used` counts every accepted submit and never decreases; `cancel` keeps the slot until `settle` or `abandon`; `timeout` keeps it until `abandon`; `settle` to `candidate`, `failed` or `stale`; `imported` and `discard` from `candidate`; `end()` forgets nothing; a submit against a changed workflow hash is refused. Refusals throw `Error(code)` as `src/image-workflow.mjs` does. |

`tests/m3-image-request.test.mjs`, 66 tests, is registered in `tests/probes/dyl60/run.py`; `check-discovery.py` now expects 16 Node files.

### TESTING coverage

| Row | Covered here (Node, SYNTHETIC) | Still NOT_RUN |
| --- | --- | --- |
| T75 | Every preflight refusal that plan 3.2 names, each triggered alone from a known-good fixture and all returned together: non-comfy and RunPod sources, a non-loopback URL, each mode flag, each macro form in each of the four texts, the reserved triggers, the `char` prefix, every workflow rule including the avatar workflow's node types, stale saved selections, dimensions | The adapter refusing before dispatch on a real host, no connection rewrite, no fallback (PR C) |
| T77 | The reservation rules: `cancelled` and `timeout-unknown` hold the slot, `abandon` releases either with the unit spent, a late settle after abandon is refused, no retry path exists, `used` never decreases; every staleness reason including A → B → A through `stillCurrent` | SillyNovel's own timeout, Cancel and Stop host job in the UI; the late result on a real host (PR C) |
| T74, T76 | — (the wire and the host's result handling were measured in PR A; the adapter's use of `resultPathProblem` is PR C) | PR C |

### Implementation choices for owner review

1. **`preflight` returns a review even when it refuses**, so PR C can show the greyed destination and texts next to the refusal, as plan 3.1 step 2 wants.
2. **The brief took precedence over the plan's pseudocode** where they differ in field names: the plan's `effective.prompt` and `effective.negative` keep those names; the `session` object exposes `requests` as an outcome map rather than a list.
3. **`begin()` resets `used` to zero** for the new session (I2: five submissions per explicitly begun session) while an unresolved reservation, if any, stays reserved ([M3.1 plan section 5](M3_1_IMAGE_WORKFLOW_PLAN.md#5-m33-and-m34-outline): starting an allowance cannot clear unresolved reservations).
4. **A `LoadImage*` node triggers both `WORKFLOW_LOAD_IMAGE` and `WORKFLOW_NODE_NOT_ALLOWED`**, since it is also outside the allowlist; the UI shows both.
5. **`RESERVED_TRIGGERS` includes the host's interactive-mode phrases** (`portrait`, `scenery`, …) as well as the seven command triggers, because refusing them costs nothing and the mode flag check alone would otherwise be the only guard.
6. **No hashing in the module.** The adapter computes the workflow and payload SHA-256 with WebCrypto and passes the strings; the module stays free of `crypto`.
7. **A cancelled request whose host call never settles can be abandoned.** Plan 3.5 gives Abandon only after a timeout, but PR A's H9 shows the host polls with no deadline, so a Cancel followed by a hung backend would otherwise hold the single slot until reload. `abandon` therefore accepts `cancelled` as well as `timeout-unknown`, releasing the slot with the unit still spent; `timeout` never moves a cancelled request, so a late result can never become an importable candidate. **Proposed as an amendment to plan 3.5's Cancel row**, not adopted; the coordinator ruled it for this PR when the reviewer found the gap.
8. **The review text JSON-encodes every string value and renders numbers bare**, so a newline or a forged `Negative:` inside a prompt cannot add a line, and a negative with trailing whitespace hashes differently from one without, keeping the shown text equal to the payload identity byte for byte. The workflow's SHA-256 is a review line, as plan 3.1 step 2 requires; the adapter computes it and preflight refuses without it. The review also carries clip skip and denoise, which the host substitutes into the workflow but plan 3.1 step 2 does not list, so every wire-affecting setting is in the payload identity. **Proposed** as the review-text format for plan 3.1 step 2; not adopted until the owner rules.
9. **Written by a Codex worker** whose sandbox could not bind a loopback socket (the full Node list includes the director fixture) or commit; the coordinator ran the full list, checked scope and committed. A fresh reviewer of a different family (a native Claude agent) read `0df1074` and returned three should-fix findings (the review text stripped trailing newlines and could be forged by a value containing a newline; a cancelled request could never release its slot; the `char` prefix check ran on the untrimmed prompt while the host trims first) and four nits (request guard, allowance validation, duplicate node types hidden in the review, non-string prefixes). All were corrected in `e821af8`. The reviewer's confirmation pass found one new defect in that correction (abandoning a settled cancellation could free a newer request's slot) and three nits (the request's hash was not checked against the reviewed one, non-finite numbers rendered as `null`, a redundant length check); the coordinator fixed all four with tests in `9e3c5ac`, final verdict ACCEPT. A second fresh reviewer (a native Claude agent in a new context) then read the whole PR at `46612e4` against seven merge conditions and returned three should-fix findings (relative result paths with `.` or `..` segments passed because the URL parser had already normalised them; missing catalog or layout revisions would silently disable two staleness checks; choice 8 was not labelled a proposal) and five nits (an unused parameter, two record rows that understated the code, a wrong citation, a missing workflow-name check, and clip skip and denoise absent from the payload identity). All were corrected by the coordinator with tests in the refrozen `883d59b` and in this record; that reviewer's confirmation pass is recorded in the PR.

### Commands and results

From the PR B worktree at the frozen SHA, Node v26.8.1, Linux, synthetic fixtures only, each under `timeout --kill-after=5 300`:

```sh
node --test tests/m3-image-request.test.mjs
node --test --test-isolation=none <the 16 node files from python3 tests/probes/dyl60/run.py --list-tests>
python3 tests/probes/dyl60/check-discovery.py
node --check src/image-request.mjs
git diff --check
```

| Check | Result |
| --- | --- |
| Focused file | 66/66 pass |
| Node runner list (16 files) | 439/439 pass (373 on main `3665f6e` plus these 66); earlier 421 on `0df1074`, 435 on `e821af8` and 438 on `9e3c5ac` |
| Discovery | PASS, 16/5/1 |
| Syntax and whitespace | PASS |

Browser, storage and native suites NOT_RUN: a pure-module slice under the [M2 evidence standard](TESTING.md#m2-evidence-standard--2026-11-01), which H4 keeps for M3. No host, provider or device was used.

### Next

PR C (the adapter seam and the Generate on this host UI) starts only after the owner reviews this PR. It is a renderer and adapter change and needs the browser suite, storage suite, full native campaign on pinned SillyTavern 1.19.0 with the PR A fixture, the affected device replay, and T74–T77's adapter halves.

## PR C — the adapter seam and the Generate on this host section

**Candidate, unmerged. Frozen `afac1f9`**, based on `e950986` (the [owner's acceptance of PR B](DECISIONS.md#owner-acceptance--m32-pr-b-merged-two-proposals-adopted-pr-c-go-ahead--2026-11-08) and the amended [plan](M3_2_IMAGE_ROUTE_PLAN.md)). Tracked by [DYL-213](https://linear.app/devils17/issue/DYL-213/sillynovel-m32-first-image-route-host-image-generation-local-comfyui). The first runtime change of M3.2 (plan section 7, PR C): the host adapter gains the image seam, the Image workflow disclosure gains the Generate on this host section, and the PR B module decides. No plugin or schema change; no image provider is contacted by any test; the owner's ComfyUI on port 8188 was never reached.

### What it adds

| File | Change |
| --- | --- |
| `src/host-adapter.mjs` | `adapter.image`: `available()` (the typed `imagine` command with a two-argument callback, `extensionSettings.sd`, `getRequestHeaders`, `getCurrentChatId`, and the host's `SlashCommandAbortController` module); `inspect()` (a verbatim copy of the image settings the plan names, the option lists of the host's four selects, the workflow text fetched by name through `/api/sd/comfy/workflow` with the host's own headers and bounded at 1 MiB, its lowercase SHA-256, the host chat key, the page origin); `createController()` (the host's own class, never a DOM `AbortController`, which PR A showed the host ignores); `request({ prompt, negative, controller })` (exactly `{ quiet: 'true', gallery: 'false', negative, _abortController }` and the prompt as the trigger; a non-empty string path or a code, never a throw, never a retry; refused before the call when the seam is missing or `comfy_url` is not loopback); `fetchResult(path)` (the module's path rule first, then a same-origin fetch with the host's headers and `redirect: 'error'`, a body bound at the PNG ceiling, and `pngProblem` before a `File` is returned). Testable through optional `document`, `fetch` and `importController` overrides. |
| `src/stage-view.mjs`, `style.css` | Inside the Image workflow disclosure, after the manual export: a paragraph **Generate on this host**; the **Image session on this host** checkbox; the review `<pre aria-label="Generation review">` showing the module's review text, greyed while refused; the session's workflow SHA-256 line; the **Submissions used N of 5** line; a problems paragraph mapping every module and adapter code to a plain sentence; **Submit**, **Cancel**, **Stop host job** (with its always-visible sentence “Stop host job asks ComfyUI to interrupt whatever it is running now, not only this request.”) and **Abandon**; a 120 s timer; the candidate shown in the existing preview slot and imported through the existing **Import and apply background** and **Discard preview**, so the scene is entered only by today's import gate. Submit re-reads the host and refuses when the settings snapshot, the workflow hash or the draft moved since the review. |
| `index.js` | Passes `image: adapter.image` in the actions the stage view receives. |
| `src/project-scene.mjs` | `status()` also reports `sceneRevision`, the scene's edit revision, for the request identity. |
| `tests/m3-image-adapter.test.mjs` | 53 Node tests with a fake context, document, fetch and controller import; registered in `run.py` (17 Node files). |
| `tests/m1-reader-browser.test.mjs`, `tests/fixtures/reader-browser.html` | A scriptable image seam in the host mock (settings, selects, `SlashCommandParser.commands.imagine`, a controller stub, the shipped workflow route, synthetic result files) and 19 new actual-entry tests (13 at first, 6 added after the senior review). |
| `tests/probes/m3-image-route/host.mjs` | The native campaign on the pinned host against the PR A fake ComfyUI, registered in `run.py` as the eleventh step and in `validate.py`. |

### TESTING coverage

| Row | Covered here | Still NOT_RUN |
| --- | --- | --- |
| T74 | Adapter half on the pinned host (campaign C): one `/prompt` per Submit whose workflow `deepEqual`s the independently substituted shipped default; no decoy on the image wire; zero text-model requests; `extension_settings.sd` and the canonical chat files unchanged | Other image-aware extensions; the owner's 1.18.0 |
| T75 | `free_extend` and a stale saved selection refuse before dispatch in the browser suite against the real entry (test 3) and `free_extend` on the pinned host (campaign I); the adapter refuses a non-loopback `comfy_url` before calling the seam (Node, `m3-image-adapter`); non-comfy and RunPod sources and the other mode flags are refused by the module (PR B's tests), not exercised through the UI; no connection is rewritten and no fallback exists | Non-comfy, RunPod and the other mode flags through the UI |
| T76 | The returned path validated before fetch; a `.jpg` result refused with the path disclosed (browser test 7); approval alone copies into the project through the shared import, which locks the background (browser test 5, campaign C); the host's retained file disclosed in every status | — |
| T77 | Cancel holds the slot and the late result is dropped (browser 8, campaign D); Abandon is offered only after the 120 s deadline, also after a Cancel whose host call never settled (browser, campaign D); a result arriving after the timeout is discarded, never a candidate (browser); turning the session off in flight drops the result (browser); Stop host job aborts the host's controller and the fixture logs `/interrupt` (browser 9, campaign E); the 120 s timeout and Abandon (browser 10 with fake timers); stale discard on a chat switch, which detaches the project (browser 12, campaign G), after a draft edit and after a scene change made by a lock (browser); a request that outlives a chat switch stays abandonable (browser, campaign G); allowance exhaustion (browser 11, campaign H) | The real 120 s wait on the pinned host (the UI has no test hook to shorten it; covered with fake timers in the browser suite); manual lock after Submit on the pinned host |
| T73-style | Keyboard order, accessible names, the status role and Escape on the new controls (browser 13, emulated) | Physical devices and screen readers |

### Implementation choices for owner review

1. **The candidate reuses the M3.1 preview slot and its Import and apply**, so a generated result enters the scene by exactly the gate a hand-imported PNG uses (H10): registers, applies, locks, dirties; Save stays explicit.
2. **The draft fields are what SillyNovel hands the host**, never the combined review texts; the host adds its own prefixes, and the review shows the result (I3, PR A R1 and R2). Browser test 4 and campaign C assert this on the wire.
3. **Submit re-inspects the host** and refuses when the settings snapshot, the workflow hash or the draft changed since the review was shown, with one generic sentence (“The host image settings changed · review them before submitting.”; a draft edit during the re-read returns silently to the review); turning the session off and on re-reviews and resets the allowance (I2). Editing the prompt re-runs preflight on the draft only.
4. **The controls are shown when the host's controller class is the only piece still loading.** The adapter imports it lazily inside `inspect()`; without this tolerance the toggle could never be turned on (C3 found it). If the import then fails, preflight refuses with `SEAM_MISSING`. An eager import at adapter creation was tried and reverted because the adapter tests install their fake importer after construction; the lazy design stands.
5. **An exhausted allowance names itself** in the problems line; **a late result after a chat switch or detach is reported**, with the host's retained path, as plan 3.3 asks (both found by C3).
6. **The review `<pre>` and the generation problems paragraph have their own classes**, so the M3.1 browser tests' strict locators keep matching one element each.
7. **The campaign does not wait 120 s on the real host**: step F is recorded as not tested there and covered with fake timers in the browser suite.
8. **`settings.json` on the pinned host changes bytes but no values** when the extension saves; campaign C therefore compares the `sd` section by value and the chat files by hash.
9. **Workers and review.** C1 (adapter) and C2 (UI) were written in parallel by Codex sol workers against a fixed interface; their sandboxes could not bind a socket or commit, so the coordinator ran the Node list and the existing browser suite, found two selector collisions and an unserved module in the browser fixture, fixed those, and committed. C3 (browser tests and the campaign) was written by a native Claude agent, which found the three UI defects above and fixed each with one line. A fresh senior reviewer (a native Claude agent in a new context, a different family from the C1 and C2 authors) read the whole PR at `4613898` against seven merge conditions and returned three blockers (a result arriving after the 120 s timeout could become a candidate; Abandon was offered as soon as a request was cancelled, which let five host jobs start in seconds; the T75 coverage row overclaimed), five should-fix findings (a placeholder left in this record; turning the session off in flight let the result through; a chat switch left the slot held for the life of the page with no reason and no Abandon; in-flight staleness beyond a chat switch was untested; a `.catch` and two sleeps in the campaign) and five nits (dead `catch` blocks and a `null` controller path; three wording points; plan 3.5's reload notice not implemented). The runtime and test corrections were made by a native Claude agent and refrozen as `afac1f9`; the record corrections are in this text; the reviewer's confirmation pass at `922d788` confirmed all thirteen fixed, accepted choices 10 and 11, and returned MERGE with every merge condition met and one new non-blocking nit, recorded as choice 12.
10. **`LOCK_CHANGED` is unreachable through the UI.** Setting a lock in the Scene panel also advances the scene revision, and `staleReason` checks the layout before the locks, so a lock during a request discards the result with the layout reason. The result is still never applied; the test asserts the reason actually produced. Reordering the module's checks is a PR B module change and is left for the owner.
11. **Two one-second sleeps remain in the campaign** (steps H and I), each after a dispatched click on a disabled Submit where nothing happening is the expected outcome and there is no condition to wait for.
12. **Known limit, left for the owner:** after the image session is turned off during a request and turned on again, Submit stays disabled with no reason shown, because that request is still `pending` rather than orphaned and the “A request from before is still running” line keys on an orphan. Abandon still appears at the 120 s deadline, so nothing is lost. The one-condition fix (`state.inFlight !== null && (!pending || pending.cancelled)`) would change the runtime and void this campaign's evidence for a cosmetic gap; it waits for the next runtime PR.

### Commands and results

One supervised campaign from the clean worktree at `afac1f9` on a disposable pinned SillyTavern 1.19.0 host (`7e8663cd9c184a550b37238218bdd32c6efc68e9`, a fresh clone with `npm ci`; the owner's install untouched), Node v26.8.1, headless Chromium 151.0.7922.34, the PR A fake ComfyUI as the image backend and the M2 loopback as the text backend:

```sh
SILLYTAVERN_ROOT=<disposable pinned host> SN_PLAYWRIGHT_MODULE=<pinned Playwright> python3 tests/probes/dyl60/run.py docs/evidence/m3-2-c/campaign
python3 tests/probes/dyl60/validate.py docs/evidence/m3-2-c/campaign
python3 tests/probes/dyl60/check-discovery.py
```

| Suite | Result |
| --- | --- |
| Node (17 files) | 492/492 (439 on main `2bc9fea` plus the 53 adapter tests) |
| Storage | 126/126 |
| Browser actual-entry | 124/124 (105 before plus the 19 new tests) |
| Native campaigns | stage-library-migration 25, expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60, image-route 8 checkpoints |
| `validate.py` | PASS over 147 frozen inputs, a native inventory of 84 files and 119 artifact hashes; physical and owner gates NOT_TESTED or NOT_RUN |
| Discovery | PASS, 17/5/1 |

Package: [`docs/evidence/m3-2-c/campaign/`](evidence/m3-2-c/campaign/) with `run.json` beside it (the wrapping script's timing and exit code). The campaign took 1555 s (the director campaign 737 s of it); the supervising runner reaped nothing at exit. The earlier campaign on `6d88fa6` (1540 s, same counts except browser 118 and image-route 8) was superseded by the review corrections and is not evidence.

### Not covered

A real ComfyUI (8188 never contacted; the real-backend run on the owner's machine is its own authorization, I8); the owner's 1.18.0 install; other image-aware extensions listening on `SD_PROMPT_PROCESSING`; RunPod and every cloud source; physical devices and screen readers (the new controls' keyboard pass is emulated; the Galaxy Tab replay was not attempted in this PR, so whether the device was reachable is unknown, and the replay is NOT_TESTED); the real 120 s wait on the pinned host; a manual lock set during a request on the pinned host; plan 3.5's reload notice (“a job may still be running and where its output would land”) is not implemented: after a reload the session simply starts off, and the host's retained file is disclosed only in the status texts of the session that ran. Nothing here shows that a real ComfyUI stops work on `/interrupt`.

### Next

The owner reviews this record. With PRs A, B and C merged, M3.2 is complete except the separately authorized real-backend run on the owner's machine; M3.3 (candidate retention, cache, recovery, privacy controls) and Gate C each need their own recorded step.
