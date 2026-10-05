# Asset library and provider plan

**Status:** proposed design. No provider adapter, authenticated connection, paid request, or asset generation has been implemented or tested by this starter.

## 1. Three visual asset types

**Background:** a reusable location image, optionally varied by time or weather.

**Sprite:** a character image associated with an identity, outfit, pose, and expression. Transparent raster assets are preferred for the stage.

**Scene illustration (CG):** a full-scene image for an occasional important moment. CG is a visual treatment, not a new story event. Its generation is later scope and manual by default.

Start with a tiny useful library: one or two backgrounds, a neutral sprite for each test character, and a few expressions. Do not generate every outfit × pose × expression combination before the reader works.

## 2. Asset registry

Every imported or generated asset has a stable ID, type, revision, file-content hash, storage reference, dimensions, format, and approval state. Character assets also carry the character key, outfit, pose, expression, anchor, and intended scale. Backgrounds carry a location key and optional time variant.

Keep provenance separate: imported/generated, source provider, model/workflow identifier, seed when available, reference-asset hashes, prompt version, creation time, and user-supplied license/attribution information. Unknown values remain unknown.

Provenance does not guarantee identical regeneration. An approved image is the durable artifact; a prompt or seed is not a replacement for the file.

Prompts and references may contain private material. Keep full provenance local by default; offer a redacted export. Never commit personal chats, reference photos, provider tokens, or generated private assets to the public repository.

## 3. Asset selection and fallbacks

First choose the character identity and intended outfit. Only then resolve a suitable image.

Sprite fallback order:

1. Exact approved character/outfit/pose/expression match.
2. Same character, outfit, and pose with its approved neutral expression.
3. Same character and outfit with an approved default pose and neutral expression.
4. An explicitly approved identity portrait, silhouette, or no sprite with a missing-asset indicator.

Do not fall back to a different outfit without an explicit user-approved compatibility mapping. Never fall back to another character because their names or filenames are similar.

For backgrounds, prefer the exact approved location/time variant, then an approved generic variant of that location. For a confirmed new location without art, use a neutral placeholder; optionally keep the previous background with an obvious “previous location art” indicator. Do not imply the old room is the new room.

Use immutable asset revisions in historical snapshots. A new generation becomes a candidate, not an automatic replacement for every earlier appearance of that asset.

## 4. Imports and storage

M1 should support a small documented set of decoded raster formats, with PNG/WebP for transparent sprites and JPEG where transparency is unnecessary. Validate actual decoded content, dimensions, file size, and total import size rather than trusting extensions or MIME labels alone.

If pack import is added, reject traversal paths, symlinks, executable content, duplicate IDs, oversized decompressed archives, and unexpected file types. Do not run imported scripts or automatically install ComfyUI custom nodes/workflows.

Select and document the storage boundary in M0/M1. User-scoped host storage is preferred when safe APIs exist. Browser-local storage is an explicitly limited alternative, not a claim of cross-device persistence. Chat export and asset export are different operations; explain what each carries and what needs reassignment.

## 5. Reuse existing host capabilities first

SillyTavern documents local/cloud image sources, ComfyUI workflow integration, and `/sd quiet=true`, which can return an image URL without adding a chat message. That is a candidate integration seam, not proof that every required background/sprite operation is compatible. [S3](REFERENCES.md#s3)

Before adopting a host generation path, test that it does not change canonical messages, switch the global roleplay connection, disclose unexpected context, or execute user/model text as commands. Prefer typed calls; never concatenate a model-generated prompt into an executable slash-command string.

If only a command bridge is available, arguments must be passed through a verified parser/escaping path with adversarial tests. Failure to establish safe transport blocks that adapter, not the manual reader.

## 6. Provider roles

| Role | Baseline | Optional later adapters |
| --- | --- | --- |
| Roleplay author | Existing SillyTavern connection, unchanged | No new authoring service required |
| Scene director | Off/manual in M1 | Configured local/text service through a verified adapter |
| Image creation | User imports existing images | Host ComfyUI integration, OpenAI API, Gemini API, other explicitly supported services |
| ChatGPT consumer workflow | User-controlled export/import | Eligible plan-backed text-access spike; no image-generation entitlement assumed |

Keep each role separately configurable. Selecting an image provider must not replace the roleplay model. Do not promise that every “OpenAI-compatible” endpoint supports image creation, reference editing, transparency, JSON constraints, cancellation, or usage reporting.

Each adapter declares its actual capabilities and can refuse an unsupported request before submission. Current models, quality tiers, limits, and prices belong in provider configuration and dated verification records—not hard-coded marketing claims in the core design.

## 7. ChatGPT subscription boundary

Ordinary API-key usage is billed separately from a ChatGPT subscription. [S5](REFERENCES.md#s5)

OpenAI also documents a **Sign in with ChatGPT / ChatGPT plan usage** path for eligible open-source/local apps. This may merit a future text-director experiment, subject to its authorization, workspace, model, and preview constraints. It does not provide the user's existing ChatGPT conversations. [S6](REFERENCES.md#s6)

The current preview explicitly excludes image-generation tools. Therefore SillyNovel must not advertise this route as subscription-covered background or sprite generation. [S7](REFERENCES.md#s7)

Supported product planning is: manual prompt/reference export for the user to use in ChatGPT, followed by result import; or a separately configured supported image API. Manual export must show exactly which text and references leave SillyNovel. The user opens the consumer product and performs the generation themselves.

No cookie/session-token scraping, private `backend-api` integration, or automated browser driving is included. No silent conversion from plan usage to separately billed API calls. Recheck official capabilities before implementing any future subscription-backed adapter.

## 8. Queue and generation lifecycle

Proposed job states: requested → awaiting approval → queued → running → candidate ready → approved/rejected, with failed/canceled/stale as explicit alternatives. Cached assets can satisfy a request without a new generation.

A generation request captures a normalized asset identity, desired style, approved references, dimensions, provider/model/workflow settings, source anchor, request ID, and relevant revisions. Deduplicate by the full request identity; coalesce concurrent identical requests.

Default behavior is no automatic generation. Initial image support should be a manual **Generate missing background** action. Sprites remain curated imports; automatic outfit batches and CGs are separate later decisions.

Jobs never block reading or replying. A result arriving after a scene change may be retained in the requesting chat's pending library, with provenance and approval controls, but must not replace the active scene. It must not attach to another chat.

Preload and validate bytes before making a candidate visible. Provider refusal, timeout, and corrupt output preserve the previous valid display or placeholder.

## 9. Usage and spending controls

Require explicit activation per provider and per automatic job category. Automatic generation starts disabled. Show provider, request count, estimated cost when known, and actual reported usage when available.

Before enabling automation, configure a generation-count limit and an application-side budget policy. Reserve estimated cost for queued/in-flight requests where estimates are reliable. Include retries and reference/input charges when known. Unknown pricing should require manual approval rather than be treated as zero.

These controls are not a guarantee of an exact provider invoice cap. Unknown final usage, concurrent clients, delayed reporting, and noncancelable requests must be disclosed. A UI cancellation does not prove the remote provider stopped or refunded the job.

No automatic retries by default. Authentication errors and policy refusals should not trigger requests to another provider.

## 10. Privacy and credentials

Before a director or image request, make the processing destination and content scope inspectable. Local-only mode must not silently route to the cloud, including after errors.

Use verified host credential handling or a separately reviewed trusted backend. Do not put provider secrets into frontend bundles, extension settings exports, chat metadata, repository files, or diagnostics. A browser UI extension is not a secrets vault.

Allow only user-configured endpoints and registry-owned asset references. A director cannot supply network destinations. A future server adapter must validate fetch destinations, enforce account scoping, and guard against arbitrary local/private-network access.

Respect provider policies. A visual refusal should not rewrite, delete, or sanitize the canonical roleplay text; it should leave the visual job failed and preserve normal chat. Do not retry via another service as a way to bypass restrictions.

## 11. Retention and sharing

Provide independent controls to remove candidates, approved assets, cached jobs, and visual metadata. Explain which stored scenes reference an asset before deletion. Deleting a chat does not automatically authorize erasing shared assets used by other chats.

Use invented fixtures for tests and screenshots. Remove private prompt/reference metadata before sharing an asset pack unless the user explicitly includes it.