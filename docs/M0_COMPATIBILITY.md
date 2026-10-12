# M0 compatibility and evidence

**Checked:** 2026-10-11. **M0 result:** partial; shell smoke passed, live message lifecycle remains untested.

## Pinned SillyTavern target

| Field | Value |
| --- | --- |
| Release tag | `1.19.0` |
| Full source SHA | `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Source | [SillyTavern at the pinned commit](https://github.com/SillyTavern/SillyTavern/tree/7e8663cd9c184a550b37238218bdd32c6efc68e9) |
| Environment | Linux; Node.js `v26.8.1`; Codex in-app browser; isolated local SillyTavern server on loopback |
| Data | Temporary data root `/tmp/sillynovel-st-test-data`; no private chats imported |
| Provider | None configured; no paid or external model call |

The host source was cloned at the `1.19.0` tag and run with:

```sh
npm ci --no-audit --no-fund
node server.js --port 8011 --whitelist false --dataRoot /tmp/sillynovel-st-test-data
```

SillyTavern populated that temporary data root with its own shipped sample content. The smoke check did not open or import a user chat or card. The browser engine's exact version was not exposed by the in-app browser, so no browser-version claim is made.

## Source-verified host seams

The extension uses the public context object rather than importing SillyTavern internals. These references are pinned to the tested commit:

- [`st-context.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/st-context.js) provides `chat`, `chatId`, `groupId`, `characterId`, `getCurrentChatId()`, `eventSource`, `eventTypes`, `extensionSettings`, and `saveSettingsDebounced()` through `SillyTavern.getContext()`.
- [`script.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js) assigns `globalThis.SillyTavern.getContext`, resolves the current chat ID from a group chat ID or the selected character's current chat filename, and emits the message/generation events listed below.
- [`events.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/events.js) defines the event-name constants.
- [`eventemitter.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/lib/eventemitter.js) implements `.on()` and `.removeListener()` used for listener ownership and disposal.
- [`extensions.js`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/extensions.js) discovers extension manifests and loads their JavaScript as a module.
- [Official UI extension guidance](https://docs.sillytavern.app/for-contributors/writing-extensions/) describes the browser extension and context approach.

### Event payloads observed in source

| Event | 1.19.0 emission observed | M0 normalization |
| --- | --- | --- |
| `CHAT_CHANGED` | Current chat ID | Refresh current host identity and latest source |
| `GENERATION_STARTED` | Generation type, options object, dry-run flag | Keep only a bounded type string and boolean; discard options |
| `STREAM_TOKEN_RECEIVED` | Text for the stream iteration | Ignore the event text; sampling the current message object may lag by this token |
| `MESSAGE_RECEIVED` | Message index and generation type | Read that message index from the current `chat` array |
| `CHARACTER_MESSAGE_RENDERED` | Message index and generation type | Read that message index from the current `chat` array |
| `GENERATION_ENDED` | `chat.length` from `hideStopButton()` | Keep as a count; never treat it as a message index or proof of success |
| `GENERATION_STOPPED` | No payload | Read the current latest source; do not assume it was committed |
| `MESSAGE_SWIPED` | Message index, after the swipe view is updated | Read the selected message at that index; its active `mes` and `swipe_id` are host fields |
| `MESSAGE_EDITED` | Edited message index | Read that message index |
| `MESSAGE_DELETED` | In the inspected delete paths, the post-delete `chat.length` | Keep as a count and read the current latest source |

In the inspected [streaming path](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js#L3895-L3896), SillyTavern emits `STREAM_TOKEN_RECEIVED` before it calls `onProgressStreaming()` to update the corresponding chat message. Sampling `context.chat` in response to that event can therefore return the previous streaming state. M0 ignores the event text and does not use the sampled object as canonical or final content. M1 must validate this ordering on the pinned host and choose an update seam that provides the content it needs.

The source emits `MESSAGE_RECEIVED` before `CHARACTER_MESSAGE_RENDERED` in streaming finalization. Ordinary generation uses the type `normal`; continuation uses `continue`; regeneration uses `regenerate`; swipe generation uses `swipe`. `MESSAGE_SWIPED` can be emitted before a swipe generation starts. A stop path can emit `GENERATION_ENDED` while hiding the stop button before it emits `GENERATION_STOPPED`. A generation-ended event is therefore not a completion signal.

These facts are source inspection, not observations from a live model run. Error, abort, group, and continuation paths differ; for example, the inspected streaming error path suppresses its message events for `continue` and `swipe`. M0 records the events without deriving scene state or treating an event as a canonical commit.

## Implemented M0 boundary

- `manifest.json`, `index.js`, `src/host-adapter.mjs`, `src/shell.mjs`, and `style.css` form the extension shell. It has no build step or third-party runtime dependency.
- `extensionSettings.sillynovel.enabled` is opt-in; an absent setting is false.
- The stage is inserted as a sibling immediately before SillyTavern's `#chat` inside `#sheld`. SillyNovel does not hide, move, or rewrite the original chat or composer.
- Stage text is created with DOM `textContent`. It shows the host author label and message length, not the message body. The adapter reads the active `message.mes` and `swipe_id` in memory and does not save or transmit them.
- Character identity is not resolved. A message author is the host message's `name` label; it is not treated as a stable card ID.
- Enabling requires the context, chat array, settings save seam, event emitter API, and ten named events. If a required capability is absent, activation stops before stage mount. If mount or listener registration fails, SillyNovel disposes what it created and leaves normal chat available.
- The renderer retains the latest observed source; a source-less event does not fall back to the source captured at mount. A chat switch with no messages explicitly clears the source. Indexed message events with invalid or out-of-range indices resolve to `null`; they never fall back to the last message.
- The active shell owns ten host event listeners and one stage node. Disable removes both. The persistent settings checkbox keeps one change listener so the user can re-enable the stage; the settings control is mounted once per module load. M0 creates no timer, observer, object URL, chat presentation override, or host chat mutation.
- If initialization fails after the settings control is mounted, the control remains available with an error and the native chat remains usable. SillyTavern does not expose an unload hook in the M0 surface used here; reloading the page disposes the module and its control.

The adapter's `chatId`, `groupId`, and `characterId` observation is marked `durable: false` and is used only in memory. It does not claim a persistent chat/card key.

## Test and manual evidence

| Check | Result | Evidence boundary |
| --- | --- | --- |
| Extension manifest discovery and module load | HOST_TESTED — PASS | Control appeared in the 1.19.0 Extensions settings panel |
| Default disabled state | HOST_TESTED — PASS | Fresh isolated profile showed unchecked control and “Off by default” status |
| Repeated enable/disable | HOST_TESTED — PASS | Two full cycles in the initial shell smoke, plus one full cycle after the review fixes; each activation showed one stage and each disable removed it |
| Draft preservation | HOST_TESTED — PASS | `Synthetic draft: keep this exact text.` remained unchanged through the initial cycles and the post-fix mount/dispose cycle |
| Original chat/composer remains | HOST_TESTED — PASS | Accessibility tree retained SillyTavern's chat surface and textarea while stage mounted |
| Adapter/source observation and disposal | SIMULATED — PASS | `node --test tests/m0.test.mjs`; public-safe fixture only |
| Chat A → empty chat B → generation start | SIMULATED — PASS | Renderer source tracker keeps B empty instead of resurrecting A |
| Malformed or out-of-range indexed events | SIMULATED — PASS | Indexed events resolve to `null`; index-free stream observation still samples the latest message |
| Missing capability and partial listener setup failure | SIMULATED — PASS | Activation refuses or rolls back without listeners/stage |
| Normal, streaming, stopped, continued, regenerated reply | SIMULATED + SOURCE_INSPECTED; HOST_LIFECYCLE_NOT_TESTED | No provider was configured |
| Swipe, message edit/delete, chat switch | SIMULATED + SOURCE_INSPECTED; HOST_LIFECYCLE_NOT_TESTED | No real chat was opened |
| Group author identification | SIMULATED + SOURCE_INSPECTED; HOST_LIFECYCLE_NOT_TESTED | Fixture reads the host `name` field; no group chat was opened |
| Provider behavior, other browsers/devices/extensions | NOT_TESTED | No such compatibility claim is made |

The real-host check was a shell smoke test, not a full compatibility pass. Gate A remains NOT_RUN; M0's live lifecycle portion is incomplete. The synthetic harness intentionally dispatches source-shaped arguments itself and cannot verify how a real generation run orders or omits events.

## Open integration seams

| Concern | Candidate seam observed | Still open |
| --- | --- | --- |
| Chat identity | `context.chatId` / `getCurrentChatId()`, `groupId`, `characterId`, and `chatMetadata.integrity` | `chatId` is the current chat filename; `characterId` is an array index. `integrity` is added when absent, but uniqueness and behavior across rename, copy, branch, import, or restore are not established. No key is persisted by M0. |
| Card identity | Current `characters[characterId]` object and its host-owned avatar/card fields | Duplicate, rename, import, replacement, and group membership semantics need tests. A display name or array index is not a stable key. M0 only labels authors from `message.name`. |
| Metadata save | `context.chatMetadata`, `saveMetadata()`, `saveMetadataDebounced()`, and `updateChatMetadata()` | `saveMetadata()` saves the currently active chat. The inspected debounced helper captures group/character IDs and checks those again before saving, but does not compare `chatId`; cross-chat targeting and serialization need a dedicated race test before use. M0 writes no chat metadata. |
| Asset storage | The host background import flow (`POST /api/backgrounds/upload`) and asset manager routes (`POST /api/assets/get`, `/download`, `/delete`) are candidate seams. See the pinned [background routes](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/backgrounds.js), [asset routes](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/assets.js), and [asset manager UI](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/extensions/assets/index.js). | These are host-managed flows, not a verified extension-owned storage contract. Ownership, permissions, cleanup, and a SillyNovel namespace remain open. M0 writes no assets; do not choose a directory or endpoint by guesswork. |

Before using any of these seams, verify identity changes and save ordering on the pinned host, including A → B and A → B → A, and verify the actual storage permissions/ownership. Until then the capabilities remain open.

## Manual compatibility checklist for follow-up

On the same identified SillyTavern release, record browser/device and enabled extensions, then exercise a synthetic/public-safe test chat. Do not use a live paid service. Mark each row HOST_TESTED only after a real host action; event-emitter calls from a console or Node fixture count as simulated.

- [ ] Send a normal reply, including a non-streaming reply if available.
- [ ] Receive a streaming reply and observe whether token, message, and render events fire and in what order.
- [ ] Stop mid-stream; distinguish partial content from completed message events.
- [ ] Continue a response and record the generation type and emitted source index.
- [ ] Regenerate and select both an old and new swipe.
- [ ] Edit and delete a message, including the first and last message.
- [ ] Switch chats A → B; verify identity and message source update.
- [ ] In a group, verify the host author label for each member and do not infer a card ID from a name.
- [ ] Remove one required event/context capability in a test double and verify activation refuses cleanly.
- [ ] Repeat toggling with a draft already in the composer; compare the exact draft and original chat before/after.
