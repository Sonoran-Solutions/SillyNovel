# M3.1 image workflow planning proposal

**Planning proposal — NOT approved. Authorizes nothing.**
**Base SHA:** `1741b870391709745250a55537fbc1e2699a0b77`.
**Date:** 2026-11-03, America/Phoenix (inspection 2026-11-04 UTC). **Owner:** Dylan.
This document changes no runtime, test registration, owner ruling or gate.
Implementation, provider requests, installation, subsequent slices and Gate C each need their own recorded authorization.

## 1. Inputs and boundaries

[README](../README.md) defines a presentation extension, not an asset studio or another chat backend.
[STATUS](STATUS.md) and the [Gate B verdict](DECISIONS.md#gate-b-verdict--pass--2026-11-03) record M0–M2 complete, Gate A PASS on 2026-11-01 and Gate B PASS on 2026-11-03, candidate `6799a5e74427b7b8052c39bb64cbb2fe0c408413`.
That verdict authorizes nothing further. It does not supply the unreported session observations.
The [open-questions table](DECISIONS.md#decisions-still-needed) retains O05's historical deferral; its Gate B condition is now met, but no first adapter has been selected.

| Input | Constraint carried into this proposal |
| --- | --- |
| [O05 ruling](DECISIONS.md#owner-rulings-on-open-decisions--2026-11-01) | Local-first through the host's existing image integration before any new cloud adapter. H3 proposes the particular route; it is not an owner ruling. |
| Same rulings: O04, O06, D7 | Text director uses the selected host connection, remains off by default with its bounded window and ceiling 40; automatic expressions remain memory-only. None authorizes sending that window or images to an image provider. Image limits are a separate H5 decision. |
| [State contract](STATE_AND_DIRECTOR.md#5-manual-overlay-and-locks), [AGENTS](../AGENTS.md) | Manual locks outrank automation; source identity, revisions and session ownership precede delayed application. Cancellation alone is insufficient. |
| [Architecture](ARCHITECTURE.md#active-project-storage-direction--2026-10-15) | Independent projects own visual state, separately from canonical chat; explicit attachment, no automatic reattachment. Current project storage supersedes the older proposed chat-metadata design. |
| [Provider plan](ASSETS_AND_PROVIDERS.md#8-queue-and-generation-lifecycle) | Missing art, timeout, refusal and failed providers never block reading or replying. Keep the last valid display or an honest missing-art placeholder. |
| [Privacy and credentials](ASSETS_AND_PROVIDERS.md#10-privacy-and-credentials) | No silent local-to-cloud reroute, credential copying or provider hopping. Model output/imported metadata are untrusted: no model-selected URLs, paths, scripts, slash commands or secrets. |
| [Billing boundary](ASSETS_AND_PROVIDERS.md#7-chatgpt-subscription-boundary), O07 | API billing is distinct from plan-backed text access. O07 closed the text experiment as not pursued; older provider-plan speculation does not reopen it. No image entitlement or current subscription capability claim is made here. |
| [PNG library](M1_PNG_ASSET_LIBRARY.md), [storage plugin](../plugins/sillynovel-storage/README.md#data-and-api) | Static PNG only; existing account/project-owned immutable bytes, catalog, CAS, cleanup and backup rules. No new database or project schema for M3.1. |
| [Retention](ASSETS_AND_PROVIDERS.md#11-retention-and-sharing), AGENTS | No private chats, cards, reference images, generated private art or credentials committed. Public-safe invented fixtures only. |
| [Delivery rule](ROADMAP.md#delivery-rule), [release readiness](ROADMAP.md#release-readiness) | Reviewable PRs and exact-input evidence precede owner judgment. No automated Gate C verdict, beta, release or wider installation implied. Untested versions/providers/devices stay NOT_TESTED. |

[Gate C](ROADMAP.md#gate-c--image-workflow) requires a cache hit, new background, rejected candidate, timeout, policy refusal, cancelled/stale job and configured usage limit, with reading and replying throughout.
It also requires proof against duplicate paid jobs and late scene replacement, and verification of actual provider-bound data. Section 6 maps every demonstration.

## 2. Proposed milestone slices

Follow [M3's order](ROADMAP.md#m3--optional-asset-generation); the numbers below are proposed subdivisions, not completed milestones.

| Slice | Useful boundary | What remains outside it |
| --- | --- | --- |
| **M3.1 — Manual exchange** | User edits and exports prompt/reference material, generates elsewhere by hand, then explicitly imports/applies a PNG through the existing library. No provider needed. | No automatic request, prompt-writing model, job queue or new provenance schema. |
| **M3.2 — One missing background** | One manual request through the host's existing image integration, initially standard local ComfyUI if verified on the pin. Result is a pending candidate, never an automatic scene replacement. | No cloud fallback, automatic location triggers, reference-image transmission or batch generation. |
| **M3.3 — Complete the first path** | Candidate review/retention, full request cache/deduplication, stale-job handling, privacy controls and application-side usage limits; prepare Gate C. | No new provider just to fill an evidence gap. |
| **M3.4 — Further adapters** | Separately proposed adapters only after the first complete path is useful to Dylan. Each has its own capability, privacy, spending and evidence contract. | No general claim that all host providers work. |

M3.2 must already have basic approval, stale checks, one in-flight slot, a ceiling and no retries.
M3.3 completes those controls; roadmap order is not permission to submit unsafe jobs in M3.2.
Automatic CGs, outfit batches and sprite generation remain separately gated throughout.

## 3. M3.1 implementation contract (proposed)

### 3.1 Placement and workflow

Add a closed **Image workflow** disclosure inside the existing Artwork Library area in `src/stage-view.mjs`.
The first path is background-focused. Existing curated sprite imports remain available elsewhere.
Require an explicitly attached project for reference export and durable result import; explain unavailable storage without disabling the reader.
Prompt drafting/copy/download can work without an attachment, with references and result import disabled.

1. Enter a background label, prompt, optional negative prompt, optional style note and size hint. Start blank; never scrape the current chat, cards, persona or director output.
2. Optionally select existing project PNG references by catalog identity, with thumbnail, label, dimensions, byte count and hash. Nothing is selected by default.
3. Review the exact text and selected files. **Copy prompt** copies text only; **Download prompt** creates a UTF-8 text file. Each reference has its own **Download PNG** action.
4. The user chooses and opens their external tool, pastes/uploads there and generates manually. SillyNovel neither opens a provider nor drives a browser or consumer application.
5. **Choose result PNG** previews one local file. **Import and apply background** is the explicit approval action; **Discard preview** drops it without uploading.
6. Import uses the current project's PNG path, selects and locks the background, clears/rebases the director overlay as the current manual action does, and marks the project dirty. **Save project** remains explicit.

The apply button names the project and says “applies to the project layout; Save project to retain it.”
This avoids promising an import-only action when today's `importFile()` both registers and applies.
H10 offers a later library-only alternative; silently changing every import caller is not part of this proposal.
Controls use labels, keyboard focus, plain-text status and local Escape dismissal; the disclosure must leave the native reply field reachable.

### 3.2 Data shapes and bounds

These are proposed internal records, not host APIs, plugin fields or portable bundle formats.
One draft and one result preview per mounted workflow; strict known keys/types, no arbitrary metadata bag.

```js
// In memory only; provider/model/endpoint fields deliberately absent.
draft = {
  version: 1, kind: 'background', label: '', prompt: '',
  negativePrompt: '', styleNote: '', sizeHint: 'unspecified',
  references: [] // [{ assetId, sha256 }], from this project's catalog only
};
// Captured by the workflow, never accepted from an imported file.
capture = { projectModel, projectId, sessionEpoch, draftRevision };
preview = { file, sha256, width, height, capture }; // File remains browser memory
```

| Field/resource | Proposed ceiling/validation |
| --- | --- |
| Label | Existing 1–80-character library label on import; blank draft permitted. Render as text. |
| Prompt | Required for text export, at most 8 KiB UTF-8; no silent truncation. |
| Negative prompt / style note | At most 2 KiB / 1 KiB UTF-8, optional. |
| Size hint | Enum `unspecified`, `landscape`, `square`, `portrait`; advisory text only, no automatic resize or host setting change. |
| References | At most three unique project-local asset IDs; each hash must still match authenticated readback. At most 15 MiB encoded PNG bytes total. |
| Result | One static PNG, existing 5 MiB, 4096px edge and 16M-pixel ceilings. Check signature/chunks/dimensions before preview decode; abandon preview after 10 seconds, invalidate its receipt and release resources. Reject animation, malformed or oversized data. Plugin decoding remains authoritative before insertion. |
| Export | Fixed generated filenames `sillynovel-image-prompt.txt`, `reference-1.png` etc.; no label/path interpolation. No ZIP, manifest importer, custom extension or new dependency. |

Text export is a deterministic plain-text assembly of the visible prompt, negative prompt, style and size hint, omitting empty optional sections.
The preview displays precisely those bytes; Copy and Download use the same builder.
References are separate byte-identical PNG downloads. Show that original files may contain embedded PNG metadata; this slice does not promise metadata stripping.
No project/account IDs, source anchors, chat text, filenames from the user's machine or credentials enter the text export automatically.
No imported text/JSON can populate this record or execute anything. Quotes, markup, macro-looking strings and slash commands remain inert text in M3.1.

### 3.3 Ownership, storage and reuse

| Existing code/contract | Proposed use |
| --- | --- |
| `src/project-client.mjs`: `asset(project,id)` | Authenticated reference readback with SHA-256 verification; only catalog-selected IDs, never a pasted URL. |
| `src/project-scene.mjs`: `importFile(file,kind,key,displayLabel)` | Reuse with `kind='background'`, no actor key, only after the explicit Import and apply action. Check every existing caller if this shared method changes. |
| `src/project-scene.mjs`: `save()` | Existing schema-v2 scene/catalog snapshot and expected-revision save; upload success is not a saved project. |
| `src/transient-scene.mjs` preview checks | Reuse the existing bounded image preflight pattern; extract only what the new preview actually shares. Do not import the Node-only PNG decoder into the browser. |
| New `src/image-workflow.mjs` (proposed) | Small draft validator/text builder and workflow lifetime logic, with focused Node tests. No provider interface hierarchy or future adapter scaffolding. |

Reference reads and result uploads go only to the configured authenticated SillyTavern host/plugin.
Approved PNG bytes live as immutable BLOBs in `<host dataRoot>/.sillynovel-projects.sqlite`; catalog registrations and layout share the existing project revision.
The project-local SHA-256 plus exact-byte deduplication already reuses identical uploads; this is **byte reuse**, not a generated-request cache.
The [plugin README's later amendments](../plugins/sillynovel-storage/README.md) and [PNG contract](M1_PNG_ASSET_LIBRARY.md#stored-contract-and-concurrency) govern schema v2, superseding its historical v1 table.
Prompts, reference selections and previews do not enter the database, host settings, native chat metadata, localStorage, bundles or diagnostics.
Portable v1 copies still include selected artwork only, omitting library labels and unused alternatives; full-store backup is the existing whole-library path.

Clear drafts/previews and revoke owned object URLs on detach, project replacement, chat switch, disable or reload.
Recheck captured model/project/session and draft revision after every asynchronous read/decode and immediately before approval; A → B → A cannot restore old authority.
An import uses the existing serialized edit/import/save rules; no background completion can apply without the user's current manual action.
No scene lock is changed by drafting, previewing, exporting or discarding. Explicit manual import may replace a locked background and locks the new selection.

### 3.4 Privacy and failure behavior

M3.1 sends **nothing to an image provider**. No chat, card, lorebook, persona, system prompt, connection configuration, composer draft or unselected asset is collected for exchange.
On a same-machine host, the new workflow keeps data on that machine until the user shares it; on a remote host, existing authenticated asset reads/writes cross that host connection. Do not label the latter “never leaves this machine.”
Downloads and clipboard are deliberate local exports. The user can subsequently share them; SillyNovel cannot control clipboard synchronization, browser downloads, external-tool retention or backups.
User-entered text and selected reference bytes are the entire export scope, shown before export. Nothing is silently sent onward.

| Failure | Required behavior |
| --- | --- |
| Clipboard denied/download cancelled | Keep draft; offer the other explicit export action. Never upload as fallback. Browser download initiation is not proof of a file saved to disk. |
| Missing reference, wrong hash, stale attachment | Refuse that export, identify the unavailable reference, retain the draft while current. No alternate reference or URL guessed. |
| Bad result PNG, decode timeout or wrong dimensions | Refuse before application; keep existing scene/library. Free preview resources; reading/replying continue. |
| Storage unavailable/quota exceeded | Keep the current local preview for deliberate retry while attached; no hidden browser database or cloud store. |
| Upload commits but catalog/install/save fails | Explain that bytes may exist without a saved registration. Retain dirty edits where available; use existing reopen/review and explicit unused-asset cleanup. No blind retry or byte deletion. |
| Save conflict/uncertain receipt | Existing conflict/uncertain-save behavior; preserve edits and previous committed state. Reopen/review, not overwrite or automatic retry. |

## 4. M3.2 route proposal and host source findings

### 4.1 Inspection identity and limits

Read-only source inspection: `/home/dq/SillyTavern`, branch `release`, `package.json` **1.18.0**, HEAD **`8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8`**.
The inspected source paths below match that HEAD (`git diff --quiet HEAD -- <inspected paths>` succeeded).
The pinned **1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9` is absent**.
Every host observation in this section is **1.18.0 source-only; NOT_VERIFIED on 1.19.0; runtime NOT_TESTED**, including the proposed call below.
No host was modified, started or run; no `data/`, configuration secrets, user workflow files or network source was read.

Source references use the inspected commit, not the unavailable pin:

| Source read (1.18.0; NOT_VERIFIED on 1.19.0) | Finding and consequence |
| --- | --- |
| [`public/scripts/st-context.js`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/st-context.js), L164–174 | Context exposes `SlashCommandParser` and command executors. No typed `generatePicture` entry was found in this context surface. |
| [`public/scripts/slash-commands/SlashCommandParser.js`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/slash-commands/SlashCommandParser.js), L44, L95–99 | Static `commands` registry stores command objects and aliases. Direct callback invocation is a candidate internal seam, not a documented stable image API. |
| [`public/scripts/extensions/stable-diffusion/index.js`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions/stable-diffusion/index.js), L5487–5532 | Registers `imagine`, aliases `sd/img/image`; callback accepts `(args, trigger)`, returns image path or empty/failure. `generatePicture` itself is not exported. |
| Same image extension, L2990–3095, L3317–3451 | `quiet=true` replaces the callback, suppressing chat posting and the BACKGROUND callback's `FORCE_SET_BACKGROUND`. It still saves image bytes before returning the path. Host chat-ID comparison alone misses A → B → A and manual scene revisions. |
| Same image extension, L2860–2881, L3165–3226, L3331–3332 | Literal trigger words can invoke text generation/captioning; FREE may become FREE_EXTENDED. Free prompts support character-prefix substitution; combined positive/negative prompts run `substituteParams`. “quiet” does not mean context-free. |
| Same image extension, L4219–4314 | Standard ComfyUI uses `/api/sd/comfy/workflow` then `/api/sd/comfy/generate`. Workflow placeholders can inject user/character avatars and macro-expanded custom values. `comfy` also supports RunPod; the source name alone does not prove local processing. |
| Same image extension, L2967–2976, L3103–3157, L5384–5452, L5515–5520 | Selection repair and dimension restore touch mutable image settings; command overrides temporarily change them and may schedule saving. Concurrent host activity/settings edits need explicit proof, not a claim of isolation. |
| [`src/endpoints/stable-diffusion.js`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/src/endpoints/stable-diffusion.js), L562–631 | Comfy route POSTs `/prompt`, polls `/history`, fetches `/view`, returns `{format,data}`. Socket close attempts `/interrupt`; it is not job-scoped, and the controller's signal is not passed to those fetches. The polling loop has no visible deadline here. No exactly-once or billing guarantee. |
| [`public/scripts/utils.js`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/utils.js), L1652–1678; [`src/endpoints/images.js`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/src/endpoints/images.js), L39–79 | `saveBase64AsFile` POSTs `/api/images/upload`; the route writes under authenticated `userImages`, optional character subfolder, and returns a client-relative path. This upload is not the SillyNovel PNG decoder/library. |
| [`src/constants.js`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/src/constants.js), L25; [`src/users.js`](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/src/users.js), L1217 | `userImages` maps to `user/images`; host serves the account's image directory. `gallery=false` avoids a character-named subfolder; it does not avoid host disk retention. |

### 4.2 Recommended first route (H3)

Propose **the host's Image Generation extension, standard local ComfyUI, text-only, one manually requested missing background**.
Dylan selects/configures the local endpoint, model and a reviewed single-output workflow in the host; SillyNovel does not configure a service, install nodes or select a cloud provider.
Availability of such a backend on Dylan's machine is NOT_VERIFIED; no settings were read.
The following illustrates a possible typed call through the inspected registry, **not an approved or verified integration**:

```js
// Proposed adapter-only seam; requires pinned-host verification before use.
const command = context.SlashCommandParser.commands.imagine;
const path = await command.callback({ quiet: 'true', gallery: 'false',
  negative: reviewedNegativePrompt }, reviewedPrompt);
```

Never interpolate the prompt into `/sd ...`, a command pipeline or an executor string.
No setting overrides in the proposed call: require preflighted host settings instead, so no temporary override/restore is introduced by SillyNovel.
Keep this dependency in `src/host-adapter.mjs`; absence, replacement or incompatible behavior disables only generation.
If the pin lacks a safe seam, report the blocker and retain M3.1; do not substitute direct cloud requests or silently fork host code.

Preflight must establish FREE mode without text expansion/captioning, reject reserved triggers and character-prefix/macro syntax, and inspect the effective positive/negative prefixes, fixed seed, dimensions, model and workflow.
Reject workflow avatar placeholders, custom macro substitutions, hidden reference inputs, multiple-image/batch paths and unreviewed network-capable nodes for this first profile.
Use the exact transformed text in the preview; refusal is preferable to silently changing it. No chat evidence is inferred from “missing background.”
Show the selected destination, local/remote classification, effective prompt/negative prompt, workflow identity/hash and generation settings before Submit.
An unfamiliar endpoint or unverifiable workflow disables this route. A “local” label is not proof that arbitrary workflow nodes never contact a cloud service.
The host's `SD_PROMPT_PROCESSING` hook can change text after review (observed in 1.18.0 L3054–3056; NOT_VERIFIED on 1.19.0).
Pinned tests must capture actual outgoing data with decoy private fields and demonstrate the supported extension/configuration set; unexpected rewriting blocks that profile.

### 4.3 Candidate, cancellation and spending boundary

Capture request ID, project/model identity, host chat key, source/prefix stamp, attachment epoch, catalog/state/manual-lock revisions, effective payload hash and host configuration/workflow fingerprint before submission.
Recheck before accepting bytes and before any import/apply. Never rebind an old ticket to the currently open project.
Changed source, settings, project, scene, lock or session makes the result stale; a newer scene is never replaced.
M3.2 drops stale in-memory results with a visible reason; M3.3 may retain an inert project-scoped candidate only after H7's retention contract, never auto-attach it.

The host saves a result into its account image directory first (`gallery=false` at its root in the inspected 1.18.0 path; NOT_VERIFIED on 1.19.0).
Then the adapter accepts only a verified same-origin account-image path returned by that exact request, with no redirect to another origin, traversal or model-supplied destination.
Bound the fetch/decode and validate as static PNG before preview. Non-PNG output is refused, not silently converted.
Only **Import and apply** copies approved bytes into SillyNovel's project BLOB store; host files and provider outputs are separate retained copies.

Cancellation withdraws permission to apply immediately; provider cancellation is best-effort and never promises a refund or released compute.
Do not automatically call a global interrupt that could stop someone else's job. The host's stop behavior needs an isolated-backend probe and a user-visible explanation.
Proposed wait deadline: 120 seconds, configurable only within a later documented bound. Timeout means **outcome unknown**, not “no job ran.”
Keep the in-flight reservation held while outcome is unresolved; no automatic retry, no automatic slot reuse after timeout, and no second identical request on another click.
Show recovery instructions to inspect the host/provider result before explicitly abandoning or retrying. A reload can lose a memory ledger; do not promise cross-reload exactly-once behavior in M3.2.
Source inspection found no adapter-level idempotency key, reliable cost receipt or job-scoped cancellation receipt in this path (1.18.0; NOT_VERIFIED on 1.19.0).
One reviewed workflow may itself do multiple operations; request-count control alone does not bound provider jobs or fees.

## 5. M3.3 and M3.4 outline

M3.3 makes the first path reviewable end to end: Approve/import, Reject, Delete candidate, inspect sent scope, and inspect count/limit/outcome.
Cache keys include normalized asset intent, exact effective prompt/negative/style, approved reference hashes (if later authorized), dimensions, fixed seed, route/model/workflow/configuration fingerprint and prompt-builder version.
Only approved project-owned PNGs satisfy a cache hit. A changed setting or missing/deleted asset misses; no cross-account cache, semantic fuzzy reuse or caching a refusal as artwork.
Coalesce simultaneous identical requests and reserve the count before dispatch. Explicit Regenerate is a new authorized request with a new identity, never an invisible retry.
Rejected/failed/cancelled/stale/unknown outcomes remain distinguishable; retained metadata is namespaced and separate from scene state and canonical text.
Durable candidate/job records require a separate storage/schema/backup/cleanup design before implementation; do not sneak provenance into today's strict catalog keys.
M3.3 must close cross-tab/reload duplicate-submission gaps for its supported operating mode, or explicitly refuse generation outside a proven single-owner session.
Unresolved jobs stay reserved across any supported recovery path. A paid adapter is blocked until its idempotency/uncertain-outcome contract is demonstrated.

Proposed starting image limits (H5): generation off, manual-only; one active job; five submissions per explicitly begun image session; zero automatic retries.
Counts include failures, cancellations, timeouts and deliberate retries after dispatch; cache hits and preflight refusals do not count. Switching chats does not reset the allowance.
Changing/starting an allowance is explicit and cannot clear unresolved reservations. Reload is not permission for more submissions; require explicit reactivation and reconciliation.
No dollar estimate is treated as zero when unknown. For any later priced route require per-submit approval and a configured application budget, including in-flight reservations when estimates are reliable.
These are proposed application ceilings, not a provider invoice cap or the director's O06 ceiling.

M3.4 begins only after Dylan finds the complete first path useful and separately authorizes another adapter.
Evaluate each local/cloud route separately, including credentials, reference policy, output formats, billing, refusals, cancellation, retention and duplicate-job control.
Plan-backed text remains closed under O07. A new cloud route cannot be selected as error recovery for a local request.

## 6. Gate C demonstration and evidence map

All demonstrations are **NOT_RUN**. M3.1 alone cannot claim Gate C readiness.

| Gate C demonstration | Delivering slice | Evidence required on the frozen candidate |
| --- | --- | --- |
| Cache hit | M3.3 (M3.1 establishes only byte reuse) | Repeat identical effective request: approved asset reused; provider submission counter unchanged. Changed workflow/seed and deleted asset must miss. |
| New background | M3.2; completed path M3.3 | One local generation, reviewed candidate, explicit approval/import/save/reopen, selected PNG hash. Real route run separate from deterministic loopback proof. |
| Rejected candidate | M3.1 local discard; M3.3 generated candidate | Reject before approval: no scene/catalog mutation, host/provider retention explained, explicit candidate removal demonstrated. |
| Timeout | M3.2 basic; M3.3 recovery | Held deterministic backend crosses deadline; reservation kept, no retry, late response cannot apply; reading and native reply succeed. |
| Policy refusal | M3.3 | Deterministic refusal fixture proves handling without fallback or text change. If the local route has no policy-refusal response, real-provider refusal is NOT_TESTED; synthetic handling must not be called an actual provider refusal. |
| Cancelled/stale job | M3.2 basic; M3.3 lifecycle matrix | Cancel, edit/swipe, manual replacement/lock, project change, A → B → A and reload with delayed result: no stale application or cross-project import. Record whether backend actually stopped separately. |
| Configured usage limit | M3.2 ceiling; M3.3 recovery/budget | Small configured test allowance exhausted, including in-flight/unknown outcomes; next submit emits no request; cache use and native chat remain available. No invoice-cap claim. |

Across every row: a native-host campaign proves reading, navigation and replying continue; hashes show no extension-authored canonical text/card/lore/persona/connection changes.
Instrument submission and backend job counts: one eligible request must not become duplicate paid jobs. Local single-output proof is not paid-provider proof.
Record actual provider-bound payload against the on-screen review, including workflow substitutions, settings and references; redact secrets, use synthetic data only.
Gate C's record distinguishes loopback, real local and any future paid-route evidence. Missing required coverage stays incomplete; only Dylan can accept a stated scope or supply PASS, REVISE or STOP.

## 7. Proposed TESTING rows

Highest existing ID in [TESTING](TESTING.md) is **T68** at the base SHA. Propose T69–T80 here only; coordinator/owner adoption is separate.
Existing T19–T21, T23–T26, T28–T30 also apply where touched; these rows do not replace them.

| ID | Scenario and required outcome | Slice | Status |
| --- | --- | --- | --- |
| T69 | Exact visible text equals copy/download bytes; blank/oversized fields refuse; HTML/macros/slash text stays data; no provider request or implicit chat/card collection. | M3.1 | NOT_RUN |
| T70 | Export only explicitly selected owned PNG references with matching hashes; foreign/missing/hash-changed references refuse; filenames cannot create paths. | M3.1 | NOT_RUN |
| T71 | Local preview discard uploads nothing; explicit import/apply locks background, marks dirty, saves/reopens; identical PNG reuses project bytes; invalid PNG/quota/conflict preserves previous saved state. | M3.1 | NOT_RUN |
| T72 | Delayed export/decode/upload after detach, project replacement or A → B → A cannot publish into the new attachment; draft/preview resources disposed. | M3.1 | NOT_RUN |
| T73 | Workflow keyboard, scaling, touch picker/download and screen-reader checks; reply field reachable throughout export/import/failure. Physical/assistive rows never replaced by emulation. | M3.1 UI | NOT_RUN |
| T74 | Pinned host seam with adversarial prompts and decoy private data: no command execution, text-model call, chat/background mutation or unexpected outbound fields; actual wire matches review. | M3.2 | NOT_RUN |
| T75 | Standard local route unavailable, source/workflow/settings changed or cloud/RunPod selected: refuse before dispatch; no connection rewrite or fallback. | M3.2 | NOT_RUN |
| T76 | Valid host result staged only; arbitrary path/redirect/non-PNG refused; approval alone copies into the intended project; host file retention disclosed. | M3.2 | NOT_RUN |
| T77 | Timeout/cancel/stale late result, including A → B → A and manual lock: no application, no retry, unknown reservation retained, actual backend cancellation separately measured. | M3.2–3 | NOT_RUN |
| T78 | Concurrent identical requests and repeated clicks coalesce; cache hit sends zero; changed effective inputs miss; reload/second-tab recovery cannot cause a duplicate authorized job in the supported mode. | M3.3 | NOT_RUN |
| T79 | Refusal/auth/rate/error fixtures preserve canonical data and reading/replying, with no provider hopping; count/budget reservations include failed and unresolved jobs. | M3.3 | NOT_RUN |
| T80 | Generated candidate reject/delete/approve, approved-asset deletion protection, metadata redaction and recovery/portability behavior match the adopted retention contract. | M3.3 | NOT_RUN |

## 8. Proposed PR boundaries and validation

Use the [M2 evidence standard](TESTING.md#m2-evidence-standard--2026-11-01), not a new weaker M3 standard.
Each PR has one frozen input SHA, implementation record, exact commands/results and explicit untested surfaces. Each next PR needs Dylan's review/go-ahead.

| PR | One-PR boundary | Required evidence |
| --- | --- | --- |
| M3.1 A | Pure draft validation/export text builder in `src/image-workflow.mjs` and focused tests only; no UI/provider wiring. | Focused Node tests plus record; host/storage/device NOT_RUN with pure-module reason. |
| M3.1 B | Artwork Library disclosure, reference downloads, local preview and existing import/apply integration; minimum shared preview extraction if needed. No plugin schema/provider changes. | Focused tests plus actual-entry browser, full native-host campaign, storage suite and affected device replay under the existing standard; export/import/save/cleanup consumers, T69–T73 and canonical hashes. |
| M3.2 A | Test-only pinned-seam feasibility/payload probe and report; no shipped provider control. Confirm callback behavior, workflow scope, bytes, settings races and cancellation. | Bounded disposable 1.19.0 loopback/native probe. Unsupported seam is a recorded stop for M3.2, not an alternate cloud implementation. |
| M3.2 B | One manual local background control/adapter with minimum candidate approval, ownership, reservation, ceiling and timeout. | Focused tests, browser/storage/full native campaign and affected device replay; T74–T77, unchanged canonical files. Separately authorized real-local run; loopback alone cannot establish usefulness. |
| M3.3 A | Pure full-request key/coalescing/reservation state machine, without persistence or UI. | Focused Node race/error checks and record; no broad suite merely because it is a new PR. |
| M3.3 B | Adopted candidate/cache/privacy/usage UI and any separately reviewed storage/recovery contract, integrated into the first route. | Browser/storage/full native campaign, migrations/backups/cleanup if schema changes, affected device replay, T78–T80 and earlier affected regressions. Replan a separate storage PR if the reviewed contract cannot fit this boundary. |
| M3.3 C | Gate C fixture/record preparation, tests/docs only, then separately authorized demonstrations and Dylan's session/verdict. | Validate changed harness and frozen fixtures; reuse unchanged runtime evidence by SHA. No autonomous real-provider spend or owner verdict. |
| M3.4 | One adapter per separately scoped proposal/PR sequence after first-path usefulness. | Adapter-specific evidence and billing/privacy authorization; no compatibility inferred from M3.2. |

Existing entry points inspected: `tests/probes/dyl60/run.py`, `check-discovery.py`, `validate.py`, project-portability and director campaigns referenced by that runner; focused `node --test` files are registered there.
No implementation commands or test counts are claimed by this plan. The native runner pins host 1.19.0 and Node 26.8.1; the owner's 1.18.0 install is not a substitute.
Before execution, inspect existing results/in-flight jobs and reuse matching input evidence. New renderer/adapter behavior invalidates the affected old evidence; inert follow-up docs do not.
Heavy runs (the campaign, storage suite, device replay) need a finite deadline, bounded output and owned-process cleanup recorded before launch; one heavy job per host.

## 9. Owner decisions H1–H11

**Ruled 2026-11-03:** see the [owner rulings](DECISIONS.md#owner-rulings-h1h11--m31-image-workflow--2026-11-03). H1, H2, H4, H9, H10 and H11 adopt the recommendation; H3, H5, H6 and H7 are deferred to M3.2 planning; H8 was delegated and recorded as option B. The table below is the proposal as reviewed.

| ID | Decision and options | Recommendation and reason |
| --- | --- | --- |
| H1 | Sequence: A, authorize only M3.1's two PRs after plan review, each reviewed before the next; B, defer implementation; C, request a narrower manual-exchange slice. | **A.** Delivers a useful workflow without making an adapter decision an implementation dependency. M3.2 onward stays separately gated. |
| H2 | Does M3.1 need a provider? A, none; B, require host image generation in the first release of the workflow. | **A, no provider.** Export/import answers the roadmap's first step and can be evaluated with an existing PNG. |
| H3 | O05 first real route: A, host Image Generation → standard local ComfyUI, subject to pinned verification; B, defer route selection while using M3.1; C, investigate another specifically named host-local source. | **A.** Matches the local-first ruling and has a concrete source seam; not a claim that the backend exists or that 1.19.0 supports this callback. No new cloud adapter. |
| H4 | Evidence per slice: A, apply the M2 standard as section 8; B, require a full campaign even for pure modules. | **A.** Focused Node evidence for pure slices; broader required gates for UI/adapter/persistence, physical evidence named separately. No waiver of required unavailable checks. |
| H5 | Image limits: A, off/manual-only, one in flight, five submissions per explicit session, zero automatic retries, unknown outcomes reserved; B, a different owner-specified finite count/budget. | **A.** Small explicit allowance independent of director ceiling 40; any later priced route needs a separate budget and unknown-cost approval. |
| H6 | Provider content: A, reviewed user-written text plus inspected host prefixes/settings/workflow, no references/context in M3.2; B, also explicitly selected PNG references after a separate capability/privacy probe. | **A.** Show effective payload and destination before Submit and verify it on wire; M3.1 reference export remains available by hand. |
| H7 | Pre-approval storage: A, browser-only M3.1 preview; host image file plus memory-only M3.2 candidate; B, immediately add a durable plugin candidate store. | **A.** No schema expansion until M3.3. Disclose host/provider retained copies; Reject drops SillyNovel's preview, not those files. Durable retention needs backup/cleanup design. |
| H8 | Optional director follow-up: A, short real session before M3; B, after M3.1; C, leave the existing NOT_RUN session lines as recorded. | **A, as an optional feedback opportunity.** It may clarify expression/correction burden; it is not a new prerequisite, a reopened Gate B or implied session authorization. Dylan can choose B/C and separately authorize M3.1. |
| H9 | Manual export format: A, plain text plus individual PNG downloads, three references maximum; B, a packaged exchange format with provenance import. | **A.** Inspectable, no archive parser or dependency; package/provenance work waits for demonstrated need. |
| H10 | Result approval: A, explicitly labelled Import and apply using existing semantics; B, library-only import plus separate Apply. | **A for M3.1.** Preserves the shared import contract and makes its stage/lock effect visible; candidate-library separation can be reviewed in M3.3. |
| H11 | Testing/acceptance record: A, adopt T69–T80 on authorization and Gate C mapping with synthetic versus real labels; B, revise scope before adoption. | **A.** Keeps all new rows NOT_RUN until measured and leaves Gate C judgment with Dylan. |

For H8, the [Gate B record](evidence/gate-b/record.md) reports expression **65 correct, 15 incorrect**, the weakest scored field by incorrect count; no aggregate percentage or new accuracy promise follows.
The omitted lines cover session summary counts, lifecycle checks, E16 per-flow outcomes, annoyance/abstention/latency/correction judgments, and the session's canonical-text/saved-project integrity line.
A short optional session could record those observations with the director on and temporary expression art loaded; it would use counts and Dylan's words, never private transcript excerpts.
It cannot fill the old record retroactively or substitute for any unperformed physical/assistive checks.

## 10. Risks, exclusions and handoff

| Risk / surface | Current status or explicit limit |
| --- | --- |
| Host seam, provider payload, cancellation, local backend availability | Source-only 1.18.0; NOT_VERIFIED on 1.19.0, runtime NOT_TESTED. No promise that cancellation stops queued work, that settings are isolated, or that one request equals one billable operation. |
| Real provider failures, policy refusals, image quality, costs and latency | NOT_TESTED. No provider was contacted; deterministic fixtures will not establish real-provider behavior. |
| Multi-tab/reload deduplication and durable candidates | Not solved by the callback or current PNG catalog. M3.3 design/proof required; paid expansion cannot rely on memory-only reservations. |
| Host/provider copies, PNG embedded metadata, clipboard/download retention | Separate privacy surfaces; SillyNovel preview deletion is not secure erasure or deletion from every store. |
| Native composer contention while local image work uses shared resources | NOT_TESTED. Include normal Send and E16 residual flows; do not infer nonblocking inference from a nonblocking UI. |
| Tablet scaling/reduced motion, screen readers and remaining DYL-193 surfaces | Remain NOT_TESTED where the [Gate B record](evidence/gate-b/record.md) says so; new controls add their own checks, not a waiver. |

Not covered: implementing any slice; host configuration/install/startup; provider/model setup; automatic prompt extraction; automatic images/CGs/outfits; sprite consistency/editing; non-PNG conversion; general asset editing; private ChatGPT endpoints/browser automation; plan-backed text; new cloud adapters; director accuracy fixes; existing open PR D findings; DYL-56; release or distribution.
No credentials, live data, downloaded art, external tickets, STATUS/ROADMAP entries or changes outside this file belong to this task.

Documentation validation only: review diff, relative links/anchors, data-shape syntax, T-number continuity and proposal/approval wording; no engine, host, provider or gameplay suite is needed for this inert file.
Recommended next bounded step: Dylan reviews H1–H11 and records chosen options; only then assign the authorized M3.1 PR. This proposal starts nothing.
