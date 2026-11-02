# Architecture

## Active-reader visible viewport — 2026-10-16

[The DYL-60 keyboard correction](M1_4_DYL60_KEYBOARD_FIX.md) caps the existing chat shell at the unzoomed VisualViewport bottom on resize/pan while the reader is mounted, including Back to Chat. Short reader content scrolls; manual controls retain their heading. It preserves the native composer and handlers, makes no canonical/settings write, and removes its namespaced class/property/listeners on disable/failure. Missing API and zoom use the existing host layout. No browser meta policy or host source is changed.

## DYL-23-C native group integration — 2026-10-16

Owner explicitly authorizes [native groups with manual independent-project attachment](M1_NATIVE_GROUPS.md), tracked by [DYL-63](https://linear.app/devils17/issue/DYL-63/dyl-23-c-native-group-conversation-integration), after PR #31 merged at `5a9b87f14d5a008e9801aa2260efe40d9e22f5b7`. Native group/chat/activation authority remains separate from account-owned project/manual actor UUIDs and memory-only source expressions. Four or more actors retain three visible slots; duplicate names never bind cards to actors. No schema, native metadata, automatic attachment or persistence expansion. DYL-23 Done/history/acceptance, DYL-55 and DYL-62 unchanged; Decision F undecided; Gate A NOT_RUN; DYL-60 unstarted. [Implementation/evidence](M1_NATIVE_GROUPS_IMPLEMENTATION.md). Older dated entries below are historical.


## DYL-23-B attached temporary expressions — 2026-10-16

Owner explicitly authorizes [memory-only attached message expressions](M1_PROJECT_EXPRESSIONS.md), tracked by [DYL-62](https://linear.app/devils17/issue/DYL-62). Starting main `d3f5761c03fec7fc5d97b0698da718af7af9c187` is the verified PR #30 merge. The project-global layout/catalog remains persistent; explicit actor/outfit-compatible PNG expression choices use a separate bounded activation-only source journal and the existing renderer. No expression-only dirty/revision changes or persistence. [Validation and handoff](M1_PROJECT_EXPRESSIONS_IMPLEMENTATION.md).

Linear DYL-23 reports Done; preserve its original acceptance/history/relationships and the remaining group/device gaps. This assignment authorizes only DYL-23-B, not native groups, persistent history, DYL-60 execution or later milestones. Decision F remains undecided; Gate A NOT_RUN; no live install, release or merge. Older entries below are historical.


## DYL-23-A manual-stage UX — 2026-10-16

Owner explicitly authorized the bounded [manual stage/project integration](M1_MANUAL_STAGE_UX.md): Project, Scene and Artwork Library controls, visible attachment/global-scope/save/recovery feedback, and responsive/accessibility verification. Starting main `ad70bb52e0f46155a5c7b1e5c3da957536612dc9` merges PR #29; Linear DYL-22 is Done with broader original format/revision requirements still unfinished. DYL-24 session stage and DYL-53 global projects remain credited. DYL-23 keeps original acceptance/dependencies and stays unfinished; attached source overlays/native groups remain excluded. DYL-60 stays blocked. Decision F undecided; Gate A NOT_RUN; no DYL-55 change, M1.3/M2, live install, release or merge. [Implementation/evidence](M1_MANUAL_STAGE_UX_IMPLEMENTATION.md). Older dated entries below are historical.


**PR #29 re-review:** [Migration-policy correction](M1_PNG_ASSET_LIBRARY_REVIEW_CORRECTION.md) replaces automatic v1 startup upgrade with explicit verified-backup migration to a new output. The original store and backup remain unchanged. DYL-22 is In Review with original unfinished acceptance/blockers retained; no DYL-55 reconciliation, DYL-23 authorization or Gate A change.

## DYL-22 PNG-library review candidate — 2026-10-15

The owner explicitly authorized the first residual DYL-22 slice. [Workflow and storage contract](M1_PNG_ASSET_LIBRARY.md): project-owned labels/categories, durable alternatives and explicit reselection, shared immutable PNG bytes, catalog-aware cleanup, transactional schema-v1→v2 upgrade and compatible full-store recovery. Portable v1 copies still include selected artwork only, without library labels/alternatives. [Implementation/evidence](M1_PNG_ASSET_LIBRARY_IMPLEMENTATION.md). PR #28 is merged at starting main `262aad7b64624845e68f783bf779a6fd5e4689d4`.

This is a bounded implementation for review; historical blockers and original JPEG/static-WebP requirements remain. DYL-55 stays pending owner acceptance, DYL-23 separately gated, Decision F undecided and Gate A NOT_RUN. DYL-56/60 and M1.3/M2, production/release and upstream authorization are unchanged. Older entries below retain their original evidence/scope.

## Active project-storage direction — 2026-10-15

[Independent project storage](M1_INDEPENDENT_PROJECT_STORAGE.md) supersedes the upstream-API implementation path and earlier chat-metadata persistence proposals for this bounded slice. The owner authorizes planning and the first independent-project implementation with an optional local plugin, explicit attachment and project-global state only. Production release is not approved. Source-specific history remains transient/gated; existing renderer, source, lock and native-composer safeguards remain applicable. No project data enters native metadata or browser persistence. [Implementation and tracking](M1_PROJECT_STORAGE_IMPLEMENTATION.md).

DYL-48 is Done and PR #22 merged at `ca77bbf5e4ee5219e34e873b1680e8d644754149`. Upstream engagement is **ON HOLD / NOT_SUBMITTED**. DYL-22/23 retain Backlog and their blocker relations; DYL-24 remains supported; M1.3/M2 unauthorized and Gate A NOT_RUN. Earlier entries below retain their historical authorization/evidence scope and do not override this decision.

**Status:** proposed longer-term architecture; M0 and the DYL-17/18 transient text-reader lane are implemented. Current runtime consists of the manifest, browser entry, settings, narrow adapter, source model, shell controller and `src/reader-view.mjs`. See [reader contract](M1_READER_SOURCE.md#dyl-18-reader-ui-contract) for implemented boundaries. Scene, director, asset and persistence modules below remain design proposals, not existing SillyTavern APIs. Exact M0 host references are in [M0 compatibility](M0_COMPATIBILITY.md).

## 1. Integration strategy

Build a browser-side SillyTavern UI extension, with a narrow host adapter and a self-contained renderer. Prefer a small JavaScript module implementation with JSDoc typing for the first slice; introducing a UI framework or build pipeline requires a demonstrated need.

Upstream documents browser-context extensions, `SillyTavern.getContext()`, event subscriptions, namespaced settings, and chat metadata. It recommends the context interface over fragile internal-module imports. Event payloads must be checked against the actual host version. [S1](REFERENCES.md#s1)

No SillyTavern fork or required server plugin is part of the baseline. A future provider integration that cannot meet the privacy/credential contract through the host must be deferred or proposed separately—not quietly implemented as a browser secret store. Upstream treats server plugins as a separate, unsandboxed capability. [S4](REFERENCES.md#s4)

## 2. Proposed module boundaries

| Module | Owns | Must not do |
| --- | --- | --- |
| Host adapter | Capability probes, event normalization, source identities, allowed host saves | Hide brittle host assumptions throughout the application |
| Reader | Selected message, backlog handoff, navigation, display formatting | Rewrite, summarize, delete, or send canonical messages |
| Scene store | Versioned snapshots, manual overlays, invalidation, lock revisions | Treat a model response as trusted state |
| Renderer | Background/sprite layout, focus, transitions, accessibility | Start provider calls or mutate chat data |
| Director | Bounded visual classification requests and response parsing | Author story, choose endpoints, execute commands |
| Asset library | IDs, revisions, hashes, references, approval, export/import | Use display names as globally unique identities |
| Job manager | Queueing, deduplication, cancellation, stale-result checks | Make chat wait for images |
| Provider adapters | Capability checks, configured transport, usage/error normalization | Silently switch provider or billing mode |

## 3. Proposed layout

The following is a longer-term proposed layout. M0 has created only `manifest.json`, `index.js`, `style.css`, `src/host-adapter.mjs`, `src/shell.mjs`, and `tests/m0.test.mjs`; the future module directories remain absent.

```text
manifest.json
index.js
style.css
src/
  host/          # compatibility and event normalization
  reader/        # current-message reader and host handoff
  scene/         # reducer, snapshots, identity, locks
  renderer/      # stage and scoped UI
  director/      # bounded inference and response validation
  assets/        # registry and import/export
  jobs/          # queues and request ownership
  providers/     # optional capability-specific adapters
  settings/      # defaults and user controls
tests/
  fixtures/      # invented public-safe chats and assets
  unit/
  integration/
docs/
```

M0 should create only the shell and adapter surface needed to prove safe activation. Do not scaffold every future directory with placeholder implementations.

## 4. Read and write boundaries

Canonical message text, selected swipe content, cards, lorebooks, personas, connection settings, and host conversation ordering are read-only to the visual layer.

The extension may save its own settings and chat metadata under `sillynovel`. Reading a current message is not permission to write new `extra` fields into every host message. Persist source anchors in extension-owned metadata instead.

Settings are small preferences and bindings. Chat metadata contains visual state and source references. Image bytes live in an asset store, never as base64 inside settings or chat metadata. M0/M1 must determine which host asset APIs can safely support this; browser-local storage requires an explicit portability warning and export path.

Upstream exposes `extensionSettings` with `saveSettingsDebounced()`, and `chatMetadata` with `saveMetadata()`. It warns that chat metadata references change when the active chat changes. [S1](REFERENCES.md#s1)

## 5. Event lifecycle

Use these documented event families as investigation inputs, not as an assumed complete implementation recipe: `MESSAGE_RECEIVED`, `CHARACTER_MESSAGE_RENDERED`, `MESSAGE_EDITED`, `MESSAGE_DELETED`, `MESSAGE_SWIPED`, `CHAT_CHANGED`, and generation lifecycle events. [S1](REFERENCES.md#s1)

M0's exact pinned 1.19.0 event payload inspection and the distinction between simulated and real-host observations are recorded in [M0 compatibility](M0_COMPATIBILITY.md).

The host adapter must prove event ordering for a completed reply, streaming, stop, continue, swipe selection, regeneration, and group replies on the pinned target. A generation-ended event alone is not proof of a newly completed roleplay message; background classifier calls and errors must not feed back into the director.

Keep host event handlers short. Capture bounded immutable input, schedule extension work, and return. Do not hold the host event chain open while a cloud model or image service responds.

Normalize events into internal observations such as `sourceCommitted`, `sourceInvalidated`, `chatActivated`, and `presentationDisabled`. These are SillyNovel concepts, not upstream event names.

## 6. Two cursors, not one

Maintain separate **conversation head** and **reader cursor** values. The head describes the latest selected canonical history; the cursor describes the message the user is currently viewing.

New results can update eligible head snapshots without hijacking an older reader cursor. Historical navigation only reads validated records. The renderer must resolve the scene for the selected source anchor, not always use the newest global scene.

## 7. Concurrency and persistence

Every asynchronous job carries the active host chat key, source/prefix digest, session epoch, and relevant settings, lock, state, and catalog revisions. Validate the token before applying a result and immediately before persisting it.

Process state transitions through one serialized commit path. Serialize host metadata saves too; a delayed write for chat A must never use a freshly retrieved reference for chat B. Prefer host-supported targeted saves when available. If persistence is active-chat-only, discard or defer inactive-chat commits and clearly expose unsaved state rather than guessing.

Multiple tabs require ownership coordination or explicit single-writer mode. M1 may refuse a second writer and show a read-only visual view. It must not advertise conflict-free multi-tab saves without tests.

## 8. Failure and shutdown

On enable, probe required capabilities before hiding any host content. Keep the original interface available until the stage is successfully mounted. DYL-18 inserts the reader before `#chat` and hides that feed only after successful initialization with an extension-owned class. Native feed/composer DOM stays mounted. Back to Chat, disable and failure remove only that class; the native composer remains untouched.

On disable or chat change, cancel owned jobs where possible, invalidate their epoch regardless of cancellation success, remove owned listeners/observers/timers, release object URLs, and remove scoped DOM/styles. Restore only the host UI changes this extension owns; do not overwrite another extension's newer settings.

A rendering exception must expose an exit path and leave normal chat usable. An unsupported host version should disable the affected feature with an actionable explanation, not attempt broad monkey-patches.

## 9. Compatibility policy

M0 records an actual release tag and full upstream commit SHA in the status/evidence record, together with browser and enabled extensions. Do not promise compatibility with “latest” or every theme based only on the documentation.

Existing expression/background controllers may compete with the stage. Baseline policy: SillyNovel owns its own surface; conflicts are detected or documented, and any temporary visibility override is scoped and restored. Reusing assets does not imply taking over another extension's global settings.

## 10. Security baseline

Treat model output, chat HTML, imported metadata, filenames, and remote assets as untrusted. Allow only typed visual updates against known registry IDs. Never evaluate model text, run its slash commands, or accept a provider URL from it.

Detailed asset and provider boundaries are in [ASSETS_AND_PROVIDERS.md](ASSETS_AND_PROVIDERS.md). Detailed state ownership and stale-result rules are in [STATE_AND_DIRECTOR.md](STATE_AND_DIRECTOR.md).
