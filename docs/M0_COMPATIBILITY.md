# M0 compatibility and evidence

**Checked:** 2026-10-11 (America/Phoenix); later M0.2 evidence is dated 2026-10-12. **Owner verdict (2026-10-12): M0 PASS for the explicitly documented scope and evidence limits.** L10 is **UNSUPPORTED / WAIVED** for the tested persistent-chat workflow on pinned SillyTavern 1.19.0; it is not HOST PASS. Preserve the synthetic empty-source regression and revisit if a supported reachable workflow is demonstrated. Group/duplicate-label and injected missing-capability results are recorded in the M0.2 addenda. See [the lifecycle report](M0_LIFECYCLE_VALIDATION.md).

## Pinned SillyTavern target

| Field | Value |
| --- | --- |
| Release tag | `1.19.0` |
| Full source SHA | `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Source | [SillyTavern at the pinned commit](https://github.com/SillyTavern/SillyTavern/tree/7e8663cd9c184a550b37238218bdd32c6efc68e9) |
| Environment | Ubuntu 24.04; kernel `7.0.0-34-generic`; Node.js `v26.8.1`; Brave Browser `154.1.96.61` (browser engine version not exposed); isolated SillyTavern server on loopback |
| Data | Temporary data root `/tmp/sillynovel-m0lifecycle-data`; synthetic characters/chats only; no private chats imported |
| Provider | Disposable OpenAI-compatible endpoint at `127.0.0.1:8123`, model `sn-local-test`; no paid or external model call. This tests SillyTavern's request/event path, not model/provider behavior. |

The host source was checked out at the exact pinned commit and run with:

```sh
npm ci --no-audit --no-fund
node server.js --port 8012 --whitelist false --dataRoot /tmp/sillynovel-m0lifecycle-data
```

The deterministic endpoint returned `The lantern flickers as the door opens, revealing a quiet room.` and streamed it in fixed chunks. The browser engine version was not exposed by Brave's browser tab, so no engine-version claim is made. The test extension set was SillyNovel plus a temporary sanitized `M0LifecycleObserver`; other shipped host extensions remained at their defaults. The observer recorded event names, safe scalar arguments, identities, message counts/indices, source lengths/hashes, and stage/listener counts; it did not record message bodies.

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
| Extension manifest discovery and module load | HOST_TESTED — PASS | Control appeared in pinned 1.19.0 Extensions settings. |
| Default disabled state; mount/dispose; draft preservation | HOST_TESTED — PASS | Opt-in control; stage mounted once, was removed on disable, and exact draft survived toggles. |
| Normal, streaming, stopped, continued, regenerated replies | HOST_TESTED — PASS | Deterministic loopback endpoint; real host generation and user stop. This is not model/provider validation. |
| Swipe selection; edit; first/middle/last deletion including deletion to empty | HOST_TESTED — PASS | Synthetic chat; selected message/source and post-delete count observed. Deleting B's final welcome message produced count 0, no selected source, and an empty SillyNovel stage. |
| A → populated B → A and A → B → A | HOST_TESTED — PASS | Host chat identity and latest source followed each selected chat; no stale cross-chat source observed. |
| Switch A → empty B → generation start | NOT_TESTED on host; SIMULATED — PASS | Last-message deletion showed an empty B view, but reopening that chat restored its welcome message; the full switch-and-generate sequence was not completed. Regression test covers source clearing and no A resurrection. |
| Disable during streaming | HOST_TESTED — PASS | Stage removed and ten listeners removed while host stream completed with normal final message events. |
| Group authors; duplicate display names | NOT_TESTED on host; SIMULATED — PASS | No group chat was created; host-provided author labels are not promoted to stable card identities. |
| Missing host capability | NOT_TESTED on host; SIMULATED — PASS | The real host exposes the required capabilities; test double verifies activation refusal/rollback. |
| Malformed/out-of-range indices; missing source | SIMULATED — PASS | Invalid indexed events resolve to `null`, never the last message. |
| Canonical chat mutation by enable/disable | HOST_TESTED — PASS; SIMULATED — PASS | Synthetic canonical chat snapshot unchanged through toggles; real generation/edit/delete changed only through native host actions. |
| Other browsers, devices, ST versions, provider/model behavior | NOT_TESTED | No cross-environment or model claim is made. |

At the time of this initial compatibility report, these checks were partial and M1 was not authorized. Exact per-scenario outcomes, event traces, and commands are in [the M0 lifecycle report](M0_LIFECYCLE_VALIDATION.md). The later owner verdict is recorded at the end of this document. The synthetic harness intentionally dispatches source-shaped arguments itself and is kept separate from host lifecycle evidence.

## Open integration seams

| Concern | Candidate seam observed | Still open |
| --- | --- | --- |
| Chat identity | `context.chatId` / `getCurrentChatId()`, `groupId`, `characterId`, and `chatMetadata.integrity` | `chatId` is the current chat filename; `characterId` is an array index. `integrity` is added when absent, but uniqueness and behavior across rename, copy, branch, import, or restore are not established. No key is persisted by M0. |
| Card identity | Current `characters[characterId]` object and its host-owned avatar/card fields | Duplicate, rename, import, replacement, and group membership semantics need tests. A display name or array index is not a stable key. M0 only labels authors from `message.name`. |
| Metadata save | `context.chatMetadata`, `saveMetadata()`, `saveMetadataDebounced()`, and `updateChatMetadata()` | `saveMetadata()` saves the currently active chat. The inspected debounced helper captures group/character IDs and checks those again before saving, but does not compare `chatId`; cross-chat targeting and serialization need a dedicated race test before use. M0 writes no chat metadata. |
| Asset storage | The host background import flow (`POST /api/backgrounds/upload`) and asset manager routes (`POST /api/assets/get`, `/download`, `/delete`) are candidate seams. See the pinned [background routes](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/backgrounds.js), [asset routes](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/assets.js), and [asset manager UI](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/extensions/assets/index.js). | These are host-managed flows, not a verified extension-owned storage contract. Ownership, permissions, cleanup, and a SillyNovel namespace remain open. M0 writes no assets; do not choose a directory or endpoint by guesswork. |

Before using any of these seams, verify identity changes and save ordering on the pinned host, including group membership changes and delayed writes, and verify actual storage permissions/ownership. A → B and A → B → A were observed for the current shell only; this does not establish a durable identity or persistence contract.

## Manual compatibility checklist for follow-up

Follow-up host checks should use the same identified SillyTavern release and a synthetic/public-safe chat. Do not use a live paid service. Mark each row HOST_TESTED only after a real host action; event-emitter calls from a console or Node fixture count as simulated.

- [x] Send a normal non-streaming reply.
- [x] Receive a streaming reply and observe token/message/render order.
- [x] Stop mid-stream and compare partial content with final-message events.
- [x] Continue a response and record the generation type and source index.
- [x] Regenerate and select old and new swipes.
- [x] Edit and delete first, middle, and last messages, including deletion to an empty view.
- [x] Switch A → populated B → A and A → B → A; switch into empty B → generation start remains untested on host.
- [ ] In a group, verify host author labels for multiple members and duplicate display names.
- [x] Test missing required capabilities in a test double; host UI removal remains untested.
- [x] Repeat toggling with a draft and compare the exact draft; disable during streaming and verify native completion.

## M0.2 final host compatibility addendum (2026-10-12)

This addendum records validation on SillyNovel candidate `de25366aeaa5e1cbd10e9bc40861e8ae91339aee` against SillyTavern 1.19.0 commit `7e8663cd9c184a550b37238218bdd32c6efc68e9`. It supplements, rather than rewrites, the M0.1 evidence above. The earlier statement that M0 created no observer describes the M0.1 candidate; M0.2 adds one narrowly owned `MutationObserver` on `#chat` to cover host transitions that emit no event. Mutations are microtask-coalesced, current source is sampled only after a source-signature change, and the observer disconnects with the active shell. No chat body is logged.

The review follow-up code commit `831714e9343b51682d643efb2eaa419ef9ab5145` also closes a same-length content-revision gap: after identity, index, author, swipe, and length match, the fallback compares exact source text. This comparison neither logs nor hashes message bodies; normal appends with a changed length skip it. A synthetic regression covers same-length replacement, one-time observation, deduplication, and disposal. The pinned-host results below remain evidence for `de25366`; no new host run is claimed for this narrow follow-up.

| Scenario | M0.2 result | Boundary |
| --- | --- | --- |
| L10: populated A → revisitable empty B → generation | **UNSUPPORTED / WAIVER REQUESTED** | Supported “Start new chat” creates B with its normal greeting; switching away and reopening restores it. Deleting the greeting gives an empty view but does not persist across reopening. The synthetic empty-source regression passes. |
| Temporary Chat transition | **HOST PASS on candidate** | Separate ephemeral flow, not L10. The prior candidate kept stale stage content; M0.2 DOM fallback refreshed it with the eventless temporary source. |
| L12: group authors, regeneration, switching, disable/re-enable | **HOST PASS** | Three distinct synthetic characters; stage follows host labels and selected indices through group/individual switching and toggles. Group/chat hashes and sanitized index/label records are in the [M0.2 lifecycle report](M0_LIFECYCLE_VALIDATION.md). |
| L13: duplicate display names | **HOST PASS for label-only behavior** | Both cards display as Mira and share the same label hash. Current message avatar fields differ in this run, but are not a durable identity contract; M0 does not map them to cards. |
| L16: required event capability missing | **INSTRUMENTED_HOST_PASS** | Browser-local context wrapper omitted `MESSAGE_SWIPED`; activation refused before stage mount, native composer remained usable, and ordinary activation worked after restoration. Not a natural host failure. |
| Eventless Temporary Chat source refresh defect | **FIXED and HOST_RECHECKED** | Production candidate owns a coalesced observer only on `#chat`; disposal is covered by the synthetic tests. |

The browser evidence used synthetic isolated data, a deterministic loopback endpoint, and the removable observer fixture. It establishes no real model/provider behavior and no compatibility claim for other browsers or host releases. Exact observer and endpoint hashes, sanitized observations, and command results are in the [dated M0.2 report](M0_LIFECYCLE_VALIDATION.md). The recommendation at the time of validation was **PASS subject to owner acceptance of the L10 waiver**; the later owner decision is recorded below. Gate A remains NOT_RUN.

## Owner decision — 2026-10-12, DYL-16

The owner approved **M0 PASS for the explicitly documented scope and evidence limits** and accepted the L10 waiver for the tested persistent-chat workflow on pinned SillyTavern 1.19.0. L10 is **UNSUPPORTED / WAIVED**, never HOST PASS. Synthetic empty-source coverage remains. Revisit if a supported reachable workflow is demonstrated. Real model/provider behavior, other host releases/browsers, and listed error/abort and same-length browser rerun limits remain NOT_TESTED. See [decision register](DECISIONS.md#owner-decision--2026-10-12-dyl-16).
