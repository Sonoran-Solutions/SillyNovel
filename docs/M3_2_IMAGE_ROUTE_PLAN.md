# M3.2 first image route planning proposal

**Planning proposal — NOT approved. Authorizes nothing.**
**Base SHA:** `76606f02be601e73679a2b0b6623881c13eb25c2`.
**Date:** 2026-11-08, America/Phoenix. **Owner:** Dylan.
This document changes no runtime, test registration, owner ruling or gate.
It takes up the decisions the owner [deferred to M3.2 planning](DECISIONS.md#owner-rulings-h1h11--m31-image-workflow--2026-11-03): H3 (the first route, O05), H5 (image limits), H6 (provider content) and H7 (pre-approval storage).
Implementation, any provider request, a real-backend run, subsequent slices and Gate C each need their own recorded authorization.

## 1. Inputs and boundaries

M3.1 is complete: both PRs are merged, [T73 is PASS by the owner's report](DECISIONS.md#owner-verdict--t73-pass-t60-wording-accepted--2026-11-08), and the Image workflow exports prompt text and reference PNGs by hand and imports a result PNG through **Import and apply background**.
The [M3.1 plan](M3_1_IMAGE_WORKFLOW_PLAN.md) proposed the M3.2 route in its [section 4](M3_1_IMAGE_WORKFLOW_PLAN.md#4-m32-route-proposal-and-host-source-findings) from 1.18.0 source only and marked every host finding NOT_VERIFIED on the pinned 1.19.0.
Section 2 below replaces those findings with a read-only inspection of the pinned 1.19.0 source. Everything in [M3.1 plan section 1](M3_1_IMAGE_WORKFLOW_PLAN.md#1-inputs-and-boundaries) still binds this proposal and is not repeated.

| Input | Constraint carried into this proposal |
| --- | --- |
| [O05 ruling](DECISIONS.md#owner-rulings-on-open-decisions--2026-11-01) | Local-first through the host's existing image integration before any new cloud adapter. I1 below proposes the particular route; it is not an owner ruling. |
| [H2, H9, H10](DECISIONS.md#owner-rulings-h1h11--m31-image-workflow--2026-11-03) | The manual exchange stays as shipped. M3.2 adds a route beside it and changes no M3.1 control, filename, export text or import semantics. |
| [H4](DECISIONS.md#owner-rulings-h1h11--m31-image-workflow--2026-11-03) | The M2 evidence standard applies unchanged: Node evidence for pure modules; browser, storage, full native campaign and affected device replay for the renderer, adapter or persistence. Unavailable required checks are reported, never waived. |
| [O06 and the director transport](DECISIONS.md#owner-rulings-e1e14--m22-director-transport--2026-11-01) | The director's window, ceiling 40 and E9 macro neutralization are the director's. An image request shares none of them; its content and ceiling are I3 and I2 below. |
| [State contract](STATE_AND_DIRECTOR.md#5-manual-overlay-and-locks) | Manual locks outrank automation. A generated result enters the scene only by the user's explicit approval, through the same gate as today's PNG import. |
| [Provider plan](ASSETS_AND_PROVIDERS.md#8-queue-and-generation-lifecycle), [privacy](ASSETS_AND_PROVIDERS.md#10-privacy-and-credentials) | Jobs never block reading or replying; no silent local-to-cloud reroute; the destination and content are inspectable before Submit; model output and host metadata are untrusted. |
| [AGENTS](../AGENTS.md) | Narrow adapter; verify payloads and lifecycle on the pinned target; source identity, revision and session ownership before a delayed result applies. Never silently reroute local content to a cloud service. |

Facts observed on the owner's machine on 2026-11-08, for planning only and claimed by no test:
a ComfyUI checkout at `~/ComfyUI` (v0.43.2, 2026-10-30) was listening on port 8188 with about twenty custom node packs installed, including reference-image, captioning, ControlNet and network-capable packs; the GPU is AMD; the owner's SillyTavern install at `~/SillyTavern` is still 1.18.0 `8172dcd`.
No SillyTavern settings, ComfyUI workflow files or user data were read, so whether the host's Image Generation extension points at that ComfyUI, and which workflow it would use, is **NOT_VERIFIED**.

## 2. Pinned 1.19.0 source findings

Read-only inspection of SillyTavern **1.19.0 at `7e8663cd9c184a550b37238218bdd32c6efc68e9`** (the [pinned target](M0_COMPATIBILITY.md#pinned-sillytavern-target)), fetched into a disposable scratch directory and never started.
Every finding below is **VERIFIED on 1.19.0 source and NOT_TESTED at runtime**. The M3.1 plan's 1.18.0 findings hold on 1.19.0 with the line numbers below; no behavior difference was found in the inspected paths.

| Source (1.19.0 `7e8663c`) | Finding and consequence for M3.2 |
| --- | --- |
| [`public/scripts/st-context.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/st-context.js) L128–129, L165, L201 | `getContext()` exposes `SlashCommandParser`, `getRequestHeaders`, `getCurrentChatId` and `extensionSettings`. The adapter needs nothing outside this surface: the command object, the host's own authenticated headers, and read-only access to `extensionSettings.sd`. |
| [`SlashCommandParser.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/slash-commands/SlashCommandParser.js) L44, L65 | `static commands = {}` is the registry; `addCommandObject` fills it. `SlashCommandParser.commands.imagine` is the typed seam. It is an internal registry, not a documented stable API; absence or a changed callback arity disables only generation. |
| [`stable-diffusion/index.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/extensions/stable-diffusion/index.js) L5492–5526 | `imagine` (aliases `sd`, `img`, `image`); `callback: async (args, trigger)` returns the image path, `''` on error. It calls `applyCommandArguments(args)` first and restores overridden settings in `finally`, saving them. **With only `quiet`, `gallery` and `negative` passed, no setting is overridden or saved** (L5384–5452: those three keys are not in the override map). |
| Same, L2990–3095 (`generatePicture`) | `quiet=true` replaces the callback with a no-op, so nothing is posted to chat and `FORCE_SET_BACKGROUND` is not emitted for a FREE-mode request (L3016–3032). `gallery=false` empties the character folder name (L3034). `ensureSelectionExists('sampler'/'model')` runs first and may repair a stale selection (L3001–3002, L2967). `setTypeSpecificDimensions` mutates `sd.width/height` for the call and restores them in `finally` (L3038, L3095): a concurrent host generation would observe the changed values. An `args._abortController` is honored (L3059–3061); abort returns `undefined`, not `''`. The host shows its own non-blocking “Generating an image…” toast with a Stop control (L3064–3070). |
| Same, L2861–2881 (`getGenerationType`), L152–175 (`triggerWords`) | A trigger equal (case-insensitive, trimmed) to a reserved word selects a context-reading mode: `you`, `me`, `scene`, `raw_last`, `last`, `face`, `background`, plus the multimodal variants when `sd.multimodal_captioning` is on. Otherwise FREE. **`sd.free_extend` turns FREE into FREE_EXTENDED, which sends the prompt to the text model** (L2876, L3181, L3294). Preflight must read both settings and refuse when either would leave FREE. |
| Same, L3165–3195 (`getPrompt`), L3202–3227 (`generateFreeModePrompt`) | FREE skips the LLM and `refinePrompt`. It still rewrites a leading `char ` or any `{{charPrefix}}` into the current character's image prefix and may add that character's negative prefix. Refuse prompts containing either form. |
| Same, L3056 | `SD_PROMPT_PROCESSING` is emitted after prompt assembly; any extension may rewrite `eventData.prompt`. The reviewed text is not guaranteed to be the sent text on a host with other image-aware extensions; the wire capture in T74 is the proof, and the supported configuration is “SillyNovel only” unless measured otherwise. |
| Same, L3317–3334 (`sendGenerationRequest`) | FREE skips the character prefix, but `sd.prompt_prefix` and `sd.negative_prompt` are still combined with the text and **both go through `substituteParams`**, which expands `{{char}}`, `{{user}}` and the angle-bracket markers. Preflight must inspect both settings and refuse macro syntax in them and in the user's text; refusal, not silent neutralization, keeps the reviewed text equal to the sent text. |
| Same, L3440–3450 | After the backend returns, a host chat-ID change discards the result (chat-ID only; A → B → A and scene revisions are invisible to it). The bytes are then saved via `saveBase64AsFile(data, characterName, filename, format)` **before** the callback runs, so a quiet request still leaves a file under the account's image directory. The returned path is what the command returns. |
| Same, L4221–4300 (`generateComfyImageCommon`), L4310–4322 | Standard ComfyUI fetches the workflow named by `sd.comfy_workflow` through `/api/sd/comfy/workflow`, then substitutes `%prompt%`, `%negative_prompt%`, `%seed%` (random when `sd.seed < 0`), `%denoise%`, `%clip_skip%`, `%model%`, `%vae%`, `%sampler%`, `%scheduler%`, `%steps%`, `%scale%`, `%width%`, `%height%`, every entry of `sd.comfy_placeholders` after `substituteParams`, and **`%user_avatar%` / `%char_avatar%` as embedded base64 avatars**. The whole substituted workflow is also written to the browser console (L4280). The adapter can fetch the same workflow by name with the same headers and inspect it before Submit. |
| Same, L3367–3376 | `sd.source === 'comfy'` with `sd.comfy_type === 'standard'` posts to `/api/sd/comfy`; `runpod_serverless` posts to `/api/sd/comfyrunpod`. The source name alone does not prove local processing; preflight must check `comfy_type` and the `comfy_url` host. |
| [`src/endpoints/stable-diffusion.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/stable-diffusion.js) L562–631 | `/api/sd/comfy/generate` POSTs `/prompt`, then polls `/history/<id>` every 100 ms **with no deadline**, takes the first image (or gif) output, fetches `/view`, and returns `{format, data}` with `format` taken from the filename extension (so non-PNG is possible). On client socket close before a result it POSTs **`/interrupt`**, which is ComfyUI's global interrupt of whatever is executing, not a job-scoped cancel; the created `AbortController` is not passed to the fetches. |
| [`src/endpoints/images.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/images.js) L39–79, [`utils.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/utils.js) L1651–1665 | Upload writes under the authenticated account's `userImages`, in a sanitized character subfolder unless `gallery=false`, and returns a client-relative path. The adapter accepts only that returned same-origin path, fetches it with the host's headers, and validates the bytes as a static PNG with today's `pngProblem` before preview. |
| [`default/content/Default_Comfy_Workflow.json`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/default/content/Default_Comfy_Workflow.json) | The host's shipped workflow uses exactly six node types (`CheckpointLoaderSimple`, `CLIPTextEncode` ×2, `EmptyLatentImage`, `KSampler`, `VAEDecode`, `SaveImage`) and only the standard placeholders. That is the proposed allowlist for the first profile. |

What the inspection did not establish: runtime behavior of any of the above, the owner's effective settings, whether the host's Stop toast interferes with the reader, latency on an AMD backend, and whether 1.18.0 (the owner's install) matches 1.19.0 in these paths. The [M3.1 plan](M3_1_IMAGE_WORKFLOW_PLAN.md#41-inspection-identity-and-limits) inspected 1.18.0 and found the same seams; line numbers differ.

## 3. M3.2 implementation contract (proposed)

### 3.1 Placement and workflow

Add one route to the existing **Image workflow** disclosure in `src/stage-view.mjs`: a **Generate on this host** section below the manual export, closed by default and visible only while an image session is on.
It reuses the M3.1 draft (label, prompt, negative prompt) as its input and today's `importFile()` gate as its only way into the scene. Nothing is sent until **Submit** is pressed.

1. **Begin image session.** An explicit toggle in the disclosure. Off on load, after reload, after detach and after disable. Turning it on sets the allowance (I2) and runs preflight. Nothing is sent by turning it on.
2. **Preflight** (3.2) reads the host's image settings and the named workflow and shows a plain-text review: destination host and local/remote classification, workflow name and SHA-256, model, sampler, scheduler, steps, CFG, dimensions, seed policy, the exact positive text the host will assemble (prefix + the draft prompt) and the exact negative text (the draft negative + the host's negative prefix). Any refused check names itself and disables Submit; nothing else changes.
3. **Submit** captures the request identity (3.3), reserves the single in-flight slot and one unit of the allowance, and calls the typed seam with `{ quiet: 'true', gallery: 'false', negative, _abortController }` and the draft prompt as the trigger. The status line reads “Generating on <host> · reading and replying continue”.
4. **Wait** up to 120 seconds. The host's own toast appears; SillyNovel neither hides it nor presses its Stop.
5. **Result.** The returned same-origin path is fetched, checked with `pngProblem`, and shown as **Candidate, not imported** in the same preview slot M3.1 uses, with the host's retained-file path disclosed. **Import and apply background** and **Discard candidate** are the only actions. Import is today's import: registers, applies, locks, dirties; Save stays explicit.
6. **Cancel** while waiting withdraws permission to apply at once and keeps the reservation until the host call settles; it does not abort the host request (I5). **Stop host job** is a second, separately labelled control that also aborts the request, with the sentence “this asks ComfyUI to interrupt whatever it is running now”.
7. **Timeout** marks the outcome unknown, keeps the slot reserved, shows how to inspect ComfyUI's queue and the host's image folder, and offers **Abandon** (releases the slot, keeps the unit spent) or keep waiting. No retry, automatic or offered as one click.

The reply field, Back to Chat and the reader's navigation stay reachable in every state. A missing seam, a refused preflight, a failed call or an exhausted allowance leaves the manual export and import exactly as in M3.1.

### 3.2 Preflight profile

Preflight is a pure function over a snapshot of `extensionSettings.sd`, the fetched workflow text and the draft. Every rule is a refusal with a fixed code; none rewrites anything. Proposed first profile:

| Check | Refuse unless |
| --- | --- |
| Seam | `context.SlashCommandParser.commands.imagine` exists with a function `callback` of arity 2. |
| Source | `sd.source === 'comfy'` and `sd.comfy_type === 'standard'`. RunPod, every cloud source and every other local source are out of the first profile. |
| Destination | `sd.comfy_url` parses, and its hostname is `localhost`, `127.0.0.1` or `[::1]` (I6). Shown as “local, this machine”. Anything else is “not local” and refused in M3.2. |
| Mode | `sd.free_extend === false`, `sd.multimodal_captioning === false`, `sd.refine_mode === false`, `sd.interactive_mode === false`, `sd.function_tool === false`. |
| Prompt text | The draft prompt is non-empty, is not equal (case-insensitive, trimmed) to any reserved trigger word, does not start with `char ` or `char,`, and neither it nor the draft negative contains `{{`, `}}`, `<USER>`, `<BOT>`, `<CHAR>`, `<GROUP>`, `<CHARIFNOTGROUP>` (case-insensitive) or `%…%` placeholder syntax. |
| Host prefixes | `sd.prompt_prefix` and `sd.negative_prompt` contain none of the macro forms above. Their text is shown in the review because the host will send it. |
| Workflow | The named workflow fetches, parses as JSON, contains `"%prompt%"` and `"%negative_prompt%"` exactly once each, exactly one `SaveImage`, no `LoadImage`, no `%user_avatar%`, `%char_avatar%` or custom `sd.comfy_placeholders`, and every `class_type` is in the allowlist from section 2. Its SHA-256 is shown and pinned for the session. |
| Seed | `sd.seed >= 0` is shown as “fixed”; `< 0` as “random each request”. Neither is refused; the value is part of the request identity. |
| Dimensions | `sd.width` and `sd.height` within today's result limits (4096 edge, 16 M pixels). |
| Allowance | The session is on, no request is in flight, and submissions used < the allowance. |

The allowlist is deliberately the host's shipped six node types. The owner's ComfyUI has reference, captioning and network-capable packs installed; a workflow using any of them is refused by this profile, not because they are unsafe in themselves but because the first profile claims only what T74 can verify. Widening the allowlist is a later owner decision with its own wire evidence.

### 3.3 Request identity, staleness and the reservation

```js
// In memory only. Nothing here is written to the project, host settings or storage.
request = {
  id,                      // monotonic per mounted workflow
  capture,                 // captureOf({ projectModel, projectId, sessionEpoch, draftRevision }) from M3.1
  hostChatKey,             // the adapter's conversation identity at Submit
  catalogRevision, layoutRevision, lockState,   // from the attached project at Submit
  effective: { prompt, negative, workflowSha256, model, sampler, scheduler, steps, scale, width, height, seedPolicy },
  payloadSha256,           // of the review text shown before Submit
  submittedAt, deadlineAt, // 120 s
  outcome: 'pending' | 'candidate' | 'discarded' | 'imported' | 'failed' | 'cancelled' | 'timeout-unknown' | 'stale'
};
session = { on: false, allowance: 5, used: 0, inFlight: null, workflowSha256: null };
```

`stillCurrent(capture, now)` from `src/image-workflow.mjs` is re-checked when the call settles, after the bytes are fetched and decoded, and immediately before Import and apply. Any of: detach, project replacement, A → B → A, a new `sessionEpoch`, a changed `hostChatKey`, a changed catalog or layout revision, a manual lock set after Submit, or a draft edit makes the result **stale**: it is dropped with the reason shown, the host's retained file path is still disclosed, and the unit stays spent.
`used` counts every Submit, including failures, cancellations, timeouts and abandons. Cache hits do not exist in M3.2 (M3.3). Preflight refusals do not count. `used` and `inFlight` live in memory: a reload loses them, so the session starts off after reload and the owner is told that a job may still be running on the host. M3.2 makes no cross-reload exactly-once claim; that is M3.3's T78.

### 3.4 What leaves SillyNovel, and to where

With I3 option A, the content SillyNovel hands the host is the draft prompt and the draft negative prompt, verbatim, after preflight has refused anything the host would rewrite. The style note, size hint, label, references, chat text, cards, persona, director window and composer draft are **not** sent.
The host then adds `sd.prompt_prefix` and `sd.negative_prompt`, substitutes them into the pinned workflow with the shown settings and seed, and POSTs the workflow to the loopback ComfyUI through its own server route. The review text is that assembled payload, and T74 proves the two match on the wire with decoy private data present in the chat, cards and persona.
Three copies exist after a successful request: ComfyUI's output file, the host's copy under the account's image directory, and (only after Import and apply) the immutable BLOB in the project store. Discard removes none of the first two; the disclosure says so and names the host path. M3.2 deletes nothing on the host.

### 3.5 Failure behavior

| Failure | Required behavior |
| --- | --- |
| Seam missing or changed arity | Route hidden with “Host image generation is not available to SillyNovel on this host”; manual export and import unchanged. |
| Preflight refusal | Named code and sentence; Submit disabled; nothing sent; no setting changed or suggested as a one-click fix. |
| Workflow fetch fails or changes hash mid-session | Refuse Submit; the session's pinned hash is shown beside the new one; the owner re-reviews by turning the session off and on. |
| Host returns `''` or throws | `failed`; the unit stays spent; the slot is released; no retry. The host's own error toast is the detail. |
| Non-PNG or oversized result | Refused by `pngProblem`; path disclosed; no conversion; unit spent. |
| Chat changed during the call | The host discards the bytes itself (chat-ID check); SillyNovel's `hostChatKey` check marks the request `stale` independently. |
| Timeout at 120 s | `timeout-unknown`; slot held; Abandon or keep waiting; recovery text names ComfyUI's queue and the host image folder. |
| Cancel | Permission to apply withdrawn; the call runs to completion and its result is dropped as `cancelled`; the host file is still disclosed. |
| Stop host job | As Cancel, plus `_abortController.abort()`; the sentence about ComfyUI's global interrupt is shown before the control is enabled. |
| Reload with a job in flight | Session off; notice that a job may still be running and where its output would land. |
| Reader disabled or extension unloaded | Session off; in-flight promise ignored on settlement; no apply. |

## 4. Owner decisions I1–I10

Each row restates a deferred H decision or raises a new one. The recommendation is the agent's; nothing is adopted until the owner records it.

| ID | Decision and options | Recommendation and reason |
| --- | --- | --- |
| I1 (H3, O05) | First real route: A, the host's Image Generation extension with standard local ComfyUI through the typed `imagine` seam, under the section 3.2 profile; B, keep M3.1 manual-only and defer the route; C, a different named host-local source. | **A.** The seam is now verified on 1.19.0 source, a ComfyUI is already running on the owner's machine, and no new credential, endpoint or dependency is introduced. B remains available at zero cost if PR A's probe finds the seam unsafe. |
| I2 (H5) | Image allowance: A, generation off until an explicit session; one in flight; five submissions per session; zero automatic retries; unknown outcomes keep their reservation; B, another finite count the owner names. | **A.** Small enough to make a runaway impossible and large enough to evaluate one background. Independent of the director's ceiling 40. |
| I3 (H6) | Content sent: A, the draft prompt and negative prompt only, plus whatever the host's own prefixes and workflow add, all shown before Submit; B, also selected PNG references after a separate capability and privacy probe. | **A.** The owner's ComfyUI has reference-capable nodes, but the first profile's allowlist excludes `LoadImage`, so references could not be consumed anyway. B is a later profile with its own wire evidence. |
| I4 (H7) | Pre-approval storage: A, the candidate is browser memory plus the host's retained file, as in M3.1; B, a durable plugin candidate store now. | **A.** No schema change in M3.2. M3.3 designs retention with backup and cleanup. |
| I5 | Cancel semantics: A, Cancel withdraws permission to apply and lets the host call finish; a separate Stop host job aborts and discloses ComfyUI's global interrupt; B, one Cancel that always aborts; C, no stop control at all. | **A.** The host's interrupt is not job-scoped, and the owner may have their own ComfyUI work queued. Two controls keep the cheap, safe action one click away and the global one deliberate. |
| I6 | Local classification: A, `comfy_url` must be loopback (`localhost`, `127.0.0.1`, `[::1]`); B, also allow a private-range LAN address the owner names in a setting. | **A.** “Local” is then a fact the adapter can check, and no SillyNovel setting is introduced. B is one later rule if the owner ever runs ComfyUI on another machine. |
| I7 | Workflow review: A, the owner selects a workflow in the host that satisfies the six-node allowlist, and SillyNovel pins its hash per session; B, SillyNovel ships its own workflow file and installs it into the host's workflow folder. | **A.** SillyNovel installs nothing into the host and selects no service. The host's shipped default workflow already satisfies the allowlist. |
| I8 | Owner session host for M3.2 evidence: A, the pinned 1.19.0 disposable host for the campaign and a separately authorized real-backend run on the owner's machine (1.18.0), recorded as a deviation as at Gate B; B, the owner upgrades their install to 1.19.0 first. | **A.** Mirrors the Gate B precedent and keeps the owner's install the owner's. The record names both SHAs. B is cleaner but is the owner's call about their own install. |
| I9 | Allowance persistence: A, memory only, session off after reload, no exactly-once claim across reloads; B, persist `used` in `extensionSettings.sillynovel` so a reload cannot reset the count. | **A** for M3.2. B is cheap but touches host settings on every Submit and still cannot see a second tab; T78 in M3.3 is where the cross-tab and reload rule is designed once. |
| I10 | Sequence: A, authorize M3.2 as the three PRs of section 7, each reviewed before the next, with the real-backend run its own authorization; B, defer implementation after recording I1–I9; C, PR A (the probe) only. | **A.** Each PR is independently useful and independently stoppable; C is the right answer if the owner wants only the seam evidence first. |

Already settled and not reopened here: H1, H2, H4, H9, H10, H11, O04, O06, O07, D4, D5, D7, the M2 rulings and Gate B's verdict.

## 5. Gate C mapping for M3.2

From [M3.1 plan section 6](M3_1_IMAGE_WORKFLOW_PLAN.md#6-gate-c-demonstration-and-evidence-map), M3.2 delivers the basic half of: new background (one real local generation, reviewed candidate, explicit import, save, reopen), timeout (deterministic held backend crosses 120 s; reservation kept; late response cannot apply), and cancelled/stale (cancel, edit, A → B → A, lock, project change with a delayed result). It establishes the configured usage limit's ceiling. Cache hit, policy refusal and the recovery half of every row stay with M3.3. All Gate C demonstrations remain **NOT_RUN**.

## 6. TESTING rows

T74–T77 were [adopted as NOT_RUN under H11](TESTING.md#m3-rows-adopted--2026-11-03) and already describe M3.2. No new row is proposed. Two clarifications are proposed as amendments on authorization, not before:

- **T74** names the supported configuration: SillyNovel the only image-aware extension, standard ComfyUI on loopback, a workflow within the allowlist. The wire is the body of the host's POST to `/api/sd/comfy/generate` and the fake backend's received `/prompt` body, both captured by the fixture.
- **T77** separates “SillyNovel applied nothing” (required) from “ComfyUI stopped” (measured and reported, never required) and adds the Stop host job control's disclosure to the keyboard and screen-reader pass.

## 7. Proposed PR boundaries and validation

The [M2 evidence standard](TESTING.md#m2-evidence-standard--2026-11-01) applies. Each PR has one frozen SHA, its own record in `M3_2_IMAGE_ROUTE_IMPLEMENTATION.md`, exact commands and results, and the owner's review before the next starts.

| PR | One-PR boundary | Required evidence |
| --- | --- | --- |
| M3.2 A | **Seam probe, tests only.** A deterministic fake ComfyUI (`tests/fixtures/m3-comfy-endpoint.mjs`) that records `/prompt` bodies, answers `/history` and `/view`, and can hold or error on command; a native-host probe on the disposable pinned 1.19.0 host that configures the host's extension against it, calls `commands.imagine.callback` with the proposed arguments and decoy private data in chat, card and persona, and captures the wire. No shipped code. | The captured payloads, the setting snapshot before and after the call (byte-identical required), the saved file path, the abort and chat-change behaviors, and a stop/go report. An unsafe seam is a recorded stop for I1 option A, not a reason to try another route. |
| M3.2 B | **Pure module** `src/image-request.mjs`: preflight rules and codes over a settings snapshot and workflow text, request identity, the reservation and allowance state machine, staleness reasons. No UI, adapter or host call. | Focused Node tests and record; browser, storage and native NOT_RUN with the pure-module reason (H4). |
| M3.2 C | **Adapter seam and UI.** `src/host-adapter.mjs` gains `inspectImage()` and `requestImage()` over the typed seam and the host's headers; `src/stage-view.mjs` gains the Generate on this host section, session toggle, review, Submit, Cancel, Stop host job, candidate preview and the shared Import and apply. No plugin or schema change. | Focused tests, actual-entry browser suite, storage suite, full native campaign on the pinned host with the fake backend (T74–T77 synthetic halves), affected device replay for the new controls, canonical hashes unchanged. |
| Real-backend run | **Separately authorized.** One manual request on the owner's machine against the owner's ComfyUI, with a workflow the owner selects, recorded with both SHAs (I8). | The review text, the wire as the host logged it, elapsed time, the result's hash, and the owner's words. Loopback evidence alone cannot establish usefulness; this run alone cannot establish safety. |

Entry points inspected and reused: `tests/probes/dyl60/run.py`, `check-discovery.py`, `validate.py`, `tests/probes/dyl60/host.mjs`, the director campaign's fixture pattern in `tests/fixtures/m2-director-endpoint.mjs`. No commands or counts are claimed here. Heavy runs keep the existing bounds: one campaign per host, a recorded deadline, bounded output and owned-process cleanup.

## 8. Risks, exclusions and handoff

| Risk / surface | Status or explicit limit |
| --- | --- |
| Seam stability | An internal registry on 1.19.0 source; a later host may rename or change it. The adapter checks shape at mount and degrades to M3.1 behavior. 1.18.0 (owner's install) is NOT_VERIFIED by this inspection. |
| Other extensions rewriting the prompt | `SD_PROMPT_PROCESSING` can change text after review. Supported configuration is SillyNovel only; T74 measures that configuration and no other. |
| Global interrupt | The host's cancel path is ComfyUI's global `/interrupt`. Stop host job discloses it; Cancel never calls it. Neither promises the backend stopped or freed anything. |
| No server-side deadline | The host polls `/history` forever. SillyNovel's 120 s is client-side; an abandoned job keeps running on the backend and the host keeps polling until the socket closes. Disclosed in the timeout text. |
| Host-retained copies | Every successful request leaves a file under the account's image directory. M3.2 deletes nothing; M3.3 decides retention. |
| Concurrent host image work | `width/height` and selection repair mutate shared settings for the call's duration. Preflight refuses when a host generation is visibly in progress only if the probe finds a reliable signal; otherwise the record says NOT_DETECTABLE. |
| Latency and quality on an AMD backend | Unknown. The real-backend run measures elapsed time once; no promise follows. |
| Custom node packs on the owner's ComfyUI | Excluded by the allowlist, not audited. A workflow that needs them is refused with the node type named. |
| Tablet, screen readers, scaling | New controls add their own T73-style pass in PR C; DYL-193's NOT_TESTED surfaces are unchanged. |

Not covered: implementing any slice; installing, configuring or starting ComfyUI or the host's extension; selecting a model or workflow for the owner; references, batches, CGs, sprites or automatic triggers; any cloud or RunPod route; cache, deduplication, durable candidates or recovery (M3.3); the H8 director session; DYL-193 closure; release.
No credentials, live data, owner settings, generated art or external tickets belong to this task; the inspected 1.19.0 source lives only in a disposable scratch directory.

Documentation validation only: diff review, relative links and anchors, data-shape syntax, decision lettering and proposal wording; no engine, host or gameplay suite for this inert file.
Recommended next bounded step: the owner records I1–I10; only then is M3.2 PR A assigned. This proposal starts nothing.
