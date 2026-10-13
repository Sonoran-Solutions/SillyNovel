# M1 reader source model (DYL-17)

**Status:** Implemented as an internal, in-memory contract for the DYL-17 candidate. DYL-18 now consumes this contract for the text reader described below. Visual state and persistence remain gated.

## Public module contract

`src/reader-source-model.mjs` exports `createReaderSourceModel()`. It returns:

- `activate(history, owner)` to begin a host session and select its latest valid source.
- `apply(observation)` to apply a host observation and return an immutable reader snapshot.
- `reconcile(history, { kind })` for a full canonical history refresh.
- `navigate(-1 | 1)` for previous/next message selection, and `jumpToLatest()` to resume following the head.
- `setTextScrollMode('followBottom' | 'userControlled')` for a separate text-scroll preference.
- `getSnapshot()` for the current immutable snapshot.

The host adapter exposes `readHistory()` and `subscribe(callback, { getTrackedIndices })`. `getTrackedIndices` lets the consumer identify source indices whose updates must remain visible while the user is pinned to an older message. The shell owns one reader model and passes its snapshot alongside stage updates; DYL-18 mounts the text reader using that snapshot.

## Snapshot and ownership

Snapshots contain `owner`, `sessionEpoch`, `head`, `cursor`, `selectionMode`, `selectionState`, `navigation`, `newMessageCount`, `newMessageIndicator`, `sourceRevision`, `viewRevision`, `generation`, and `textScroll`. Source records contain only host identity hints, a per-adapter transient `sourceKey`, message index/count, author kind/label, text, swipe index, and source revision. Returned records and nested values are frozen. Earlier snapshots remain unchanged after later observations. The model retains the indexed history internally and exposes navigation operations instead of copying the full message list into each snapshot.

`head` tracks the newest observed host message independently of `cursor`. Initial activation and `followLatest` select the head. Previous/Next skips unavailable records and enters `pinned` mode; new messages increase a capped unread count without moving the cursor. Jump to Latest restores follow mode. Text scrolling does not change the message cursor.

The `sourceKey` is backed by a `WeakMap` keyed by the host message object. It is transient, is not serialized, and is not a durable message ID. Repeated text is never used as identity. If a locator is duplicated, selection is rejected. Replacing a pinned source invalidates that selection; replacing the latest source while following the head selects the new canonical head. A deleted selected source is reported as `deleted`; other locator loss is `invalidated`. Reordering that preserves the unique source object re-resolves its current index.

Owner changes start a new session epoch, clear prior records, and select the new session's latest source. Epoch and owner are available for consumers to reject delayed work. This source model itself does not persist state or authorize writes.

## Streaming and revision rules

`STREAM_TOKEN_RECEIVED` is only a wake-up signal. Its payload is discarded. Once per animation frame, the adapter samples canonical `context.chat` entries for the latest message and the tracked head/cursor indices. It does not scan all history on this hot path. A one-message append is added incrementally only when the old tail remains at its expected index and the incoming transient source key has not appeared earlier in the session; an initially empty history accepts its first uniquely located source without requiring a prior tail. Other ambiguous appends reconcile full history. A count shrink, a jump of more than one, or an owner transition also falls back to full history reconciliation. Explicit edit, swipe, delete, stop, end, and chat-change events carry full history.

The scheduled refresh captures the current owner, session epoch, view revision, and tracked source indices. It drops the refresh if disposal or a session-epoch change occurred. If the view revision changed before the callback, it reads the current tracked indices and latest source in that same callback, so a newly selected source is refreshed without waiting for another host event. Owner changes force full reconciliation. The callback reads canonical host state after the scheduling delay and never applies token-event payloads, so delayed visibility/frame scheduling cannot overwrite a newer host value.

Text, author, swipe selection, owner, or source identity changes advance the source revision; view-only cursor/scroll changes advance the view revision. Same-length text edits are detected. Streaming growth and continuation update the existing source record when the host object is stable. A normal generation remains unbound until a new assistant source is observed; continuation and swipe may bind the verified existing assistant head. Stop marks `stopped-partial`; an end event without verified correlation leaves status `unknown`. The model never infers successful completion. Dry-run starts are ignored.

Missing host text remains an empty string and missing sources remain absent; neither is fabricated from token payloads. If the host cannot provide a unique source locator, the reader reports no valid selection. Provider failure does not block this model's read path.

## Boundaries and next consumer

This contract is in-memory and adapter-session scoped. It does not define durable source IDs, state anchors, save/load, state migration, or cross-tab ownership. Those belong to the separately authorized identity/storage work. The owner separately assigned DYL-18 on 2026-10-12 after DYL-17 and DYL-19 merged. The text-reader implementation below consumes only transient source records. Gate A remains `NOT_RUN`; technical reader validation is not an owner verdict.

The streaming hot path reads only the latest, head, and selected host entries, and returns snapshots without copying the full history. Full history is read only for explicit lifecycle reconciliation or when count/owner changes make an incremental update ambiguous.


## DYL-18 reader UI contract

The owner assigned the pasted DYL-18 implementation prompt in Codex on 2026-10-12 (America/Phoenix). That assignment is recorded in Linear before implementation and authorizes only the text-reader lane. Starting main was `aa43f4d938c6eafae296cda63a5b4f11111fbd95`. The new UI uses the DYL-16 approved layout. The choices below are bounded implementation choices, not additional owner rulings.

### Mount, visibility and disposal

`index.js` loads the host's `/lib.js` exports before enabling the setting. `src/reader-view.mjs` mounts one section immediately before the existing `#chat`, inside `#sheld`. It checks the native composer/container, renders the initial source successfully, and only then adds the extension-owned `sillynovel-native-hidden` class to `#chat`. Native feed/composer nodes are never removed, replaced or reparented. The host feed remains observed while hidden.

Back to Chat removes that class and displays a small Return to Reader bar. This is a view toggle, not disable: the same model continues tracking source revisions and keeps a valid pinned cursor. Returning displays its current snapshot. A real chat activation starts a new model epoch at that chat's latest source, including A → B → A. No previous chat text or selection is reused as authority.

Disable, failed subscription, detached container, initial mount error and render exceptions release the stage, return bar, owned pointer/scroll/click listeners and adapter subscription/observer/frame work. Visibility restoration occurs first in disposal. Only the extension's class is removed; another extension's inline styles or preferences are not overwritten. Settings expose the failure and allow enabling again after the cause is corrected. Empty, deleted and invalidated sources are expected explicit UI states, with Backlog and Jump to Latest available; they are not mislabeled as render exceptions.

### Navigation, scrolling, copying and focus

Snapshots include model-owned Previous/Next availability, including unavailable-record gaps and an unavailable head. The shell exposes `navigate`, `jumpToLatest`, `openOriginal`, `setTextScrollMode` and the existing immutable snapshot getter. Before navigation or handoff it refreshes canonical history/owner through the adapter. There is one conversation/cursor authority: `createReaderSourceModel()`. Previous/Next pins the selected source even at the head; Jump to Latest alone resumes message following and clears the bounded new-message indicator. Navigation now skips null/unavailable records instead of getting stuck at a gap.

The renderer keeps only display state: the last immutable rendered source/epoch, formatted DOM and viewport position. New selections start at the top. Revisions of that same source scroll to the bottom only in `followBottom`; otherwise the existing text offset is preserved as far as the revised content permits. Native scroll events update the separate model scroll mode. Follow text explicitly resumes bottom following. Message following and text scrolling remain independent.

Content updates keep unchanged DOM nodes and text ranges. When closing Markdown changes structure, a still-present text selection is restored near its prior display offset within the already-verified same source; this display-only text comparison is never message identity. Copy message copies the complete exact current source, including Markdown, via the native clipboard API. Copy failures provide selectable-text/native-view alternatives. Delayed clipboard feedback checks disposal, epoch, source key and source revision before touching status.

All controls are semantic buttons with visible focus, 44px minimum button height, and explicit labels. The dialogue itself is keyboard-scrollable and selectable. There are no added keyboard shortcuts or global key handlers. Pointer activation of reader controls preserves an actively focused native composer/IME; keyboard focus moves to Return to Reader when hiding the reader and to dialogue when returning. Token updates announce status only when the status actually changes; dialogue is not an aria-live region. Physical IME/device evidence remains separate from synthetic event-isolation tests.

### Complete formatting and sanitization

Pinned `getContext().messageFormatting` is intentionally not called. Its implementation in `public/script.js:1800` can substitute and write message 0, strip prompt/name prefixes, invoke arbitrary formatter hooks, and apply user regex/display rules. Even its `messageId=-1` path can hide text. Those assumptions do not meet this reader's complete, read-only source contract.

Instead, a new host-bundled Showdown converter formats ordinary paragraphs/line breaks, emphasis, strong text, lists, inline/fenced code, headings, blockquotes, tables and links. No framework or dependency is added. The inspected installation uses Showdown 2.1.0 and DOMPurify 3.4.2. Heading IDs are disabled. Conversion goes into a never-mounted inert template, then DOMPurify returns a fragment restricted to the reader's HTML tag/attribute allowlist. A final pass rejects unsupported tags/namespaces, removes host-facing attributes/classes, and accepts only absolute HTTP, HTTPS and mailto links without control/space characters. Links open with `noopener noreferrer`. No image, media, style, script, form, event handler or host-action element is mounted.

Sanitizer removals are used only to detect a completeness/fidelity fallback, never as proof of safety. Any unsupported/unsafe content or rejected link falls back to **the complete exact source as plain text**, with an explicit Backlog route to its original. Render exceptions instead disable safely. There is no truncation, summarization, provider request, slash command execution or canonical message mutation. The inert-template step ensures head-only script/style content is seen by sanitization rather than silently disappearing during HTML document parsing. Host-wide formatter/sanitizer hooks remain an untested extension-combination surface; final tag/attribute/protocol validation is still applied.

### Native backlog/original handoff

Backlog is the single original-message action (its title is “Open Original Message in native chat”). It reveals native chat without changing the reader cursor or resuming latest. The intended epoch/source key/revision must survive the canonical refresh before a candidate scroll is attempted. An unobserved chat switch, replacement or revision change opens standard chat with the unresolved-source notice. The adapter freshly resolves the selected transient object key uniquely, verifies its current owner/index/text/author/swipe against canonical history, and locates a single direct `#chat > .mes[mesid]`. The DOM's author, role and swipe attributes must match before it uses the native host `/chat-jump` scroll calculation. It never executes a slash command or edits host state.

These checks establish a candidate position, **not its rendered revision**. The pinned host sets the attributes in `updateMessageElement` (`public/script.js:2618`) without retaining the source object or a text-revision token on the element. `MESSAGE_EDITED` is emitted before `.mes_text` is replaced (`messageEditDone`, lines 8405–8431). `CHARACTER_MESSAGE_RENDERED` carries an index/type, not a rendered source/revision; streaming error paths can emit it without establishing a fresh render. Neither event nor a DOM mutation supplies the missing correspondence evidence. Raw Markdown is never compared to rendered `textContent` as an identity check.

Consequently this adapter always returns the unresolved result, even after scrolling to a matching rendered candidate. The reader displays “Exact source could not be located”; native editing, deletion, swipe selection and regeneration remain accessible. Paginated/unrendered, ambiguous or missing candidates do not scroll. This conservative P2 correction is a bounded engineering choice, not an owner ruling. Exact success requires a separately verified read-only host source/revision seam; the pinned public context also has no verified read-only history loader. Do not add host tags, invoke the mutating formatter, or execute `/chat-jump` to manufacture correspondence.

Implementation/security/browser evidence and remaining gaps: [DYL-18 testing record](TESTING.md#dyl-18-text-reader--2026-10-12). DYL-19 PARTIAL/BLOCKED persistence and asset contracts are unchanged.
