# Architecture

**Status:** proposed architecture. All named SillyNovel modules and interfaces below are design names, not existing SillyTavern APIs.

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

The following runtime files are planned; they are intentionally absent from this documentation-only starter.

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

On enable, probe required capabilities before hiding any host content. Keep the original interface available until the stage is successfully mounted.

On disable or chat change, cancel owned jobs where possible, invalidate their epoch regardless of cancellation success, remove owned listeners/observers/timers, release object URLs, and remove scoped DOM/styles. Restore only the host UI changes this extension owns; do not overwrite another extension's newer settings.

A rendering exception must expose an exit path and leave normal chat usable. An unsupported host version should disable the affected feature with an actionable explanation, not attempt broad monkey-patches.

## 9. Compatibility policy

M0 records an actual release tag and full upstream commit SHA in the status/evidence record, together with browser and enabled extensions. Do not promise compatibility with “latest” or every theme based only on the documentation.

Existing expression/background controllers may compete with the stage. Baseline policy: SillyNovel owns its own surface; conflicts are detected or documented, and any temporary visibility override is scoped and restored. Reusing assets does not imply taking over another extension's global settings.

## 10. Security baseline

Treat model output, chat HTML, imported metadata, filenames, and remote assets as untrusted. Allow only typed visual updates against known registry IDs. Never evaluate model text, run its slash commands, or accept a provider URL from it.

Detailed asset and provider boundaries are in [ASSETS_AND_PROVIDERS.md](ASSETS_AND_PROVIDERS.md). Detailed state ownership and stale-result rules are in [STATE_AND_DIRECTOR.md](STATE_AND_DIRECTOR.md).