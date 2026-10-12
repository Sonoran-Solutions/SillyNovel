# M1 reader source model (DYL-17)

**Status:** Implemented as an internal, in-memory contract for the DYL-17 candidate. This does not implement the M1 reader UI, visual state, or persistence. DYL-18 remains separately gated.

## Public module contract

`src/reader-source-model.mjs` exports `createReaderSourceModel()`. It returns:

- `activate(history, owner)` to begin a host session and select its latest valid source.
- `apply(observation)` to apply a host observation and return an immutable reader snapshot.
- `reconcile(history, { kind })` for a full canonical history refresh.
- `navigate(-1 | 1)` for previous/next message selection, and `jumpToLatest()` to resume following the head.
- `setTextScrollMode('followBottom' | 'userControlled')` for a separate text-scroll preference.
- `getSnapshot()` for the current immutable snapshot.

The host adapter exposes `readHistory()` and `subscribe(callback, { getTrackedIndices })`. `getTrackedIndices` lets the consumer identify source indices whose updates must remain visible while the user is pinned to an older message. The shell owns one reader model and passes its snapshot alongside stage updates; the current stage remains a placeholder.

## Snapshot and ownership

Snapshots contain `owner`, `sessionEpoch`, `head`, `cursor`, `selectionMode`, `selectionState`, `newMessageCount`, `newMessageIndicator`, `sourceRevision`, `viewRevision`, `generation`, and `textScroll`. Source records contain only host identity hints, a per-adapter transient `sourceKey`, message index/count, author kind/label, text, swipe index, and source revision. Returned records and nested values are frozen. Earlier snapshots remain unchanged after later observations. The model retains the indexed history internally and exposes navigation operations instead of copying the full message list into each snapshot.

`head` tracks the newest observed host message independently of `cursor`. Initial activation and `followLatest` select the head. Previous/Next enters `pinned` mode; new messages increase a capped unread count without moving the cursor. Jump to Latest restores follow mode. Text scrolling does not change the message cursor.

The `sourceKey` is backed by a `WeakMap` keyed by the host message object. It is transient, is not serialized, and is not a durable message ID. Repeated text is never used as identity. If a locator is duplicated, selection is rejected. Replacing a pinned source invalidates that selection; replacing the latest source while following the head selects the new canonical head. A deleted selected source is reported as `deleted`; other locator loss is `invalidated`. Reordering that preserves the unique source object re-resolves its current index.

Owner changes start a new session epoch, clear prior records, and select the new session's latest source. Epoch and owner are available for consumers to reject delayed work. This source model itself does not persist state or authorize writes.

## Streaming and revision rules

`STREAM_TOKEN_RECEIVED` is only a wake-up signal. Its payload is discarded. Once per animation frame, the adapter samples canonical `context.chat` entries for the latest message and the tracked head/cursor indices. It does not scan all history on this hot path. A one-message append is added incrementally only when the old tail remains at its expected index and the incoming transient source key has not appeared earlier in the session; an initially empty history accepts its first uniquely located source without requiring a prior tail. Other ambiguous appends reconcile full history. A count shrink, a jump of more than one, or an owner transition also falls back to full history reconciliation. Explicit edit, swipe, delete, stop, end, and chat-change events carry full history.

The scheduled refresh captures the current owner, session epoch, view revision, and tracked source indices. It drops the refresh if disposal or a session-epoch change occurred. If the view revision changed before the callback, it reads the current tracked indices and latest source in that same callback, so a newly selected source is refreshed without waiting for another host event. Owner changes force full reconciliation. The callback reads canonical host state after the scheduling delay and never applies token-event payloads, so delayed visibility/frame scheduling cannot overwrite a newer host value.

Text, author, swipe selection, owner, or source identity changes advance the source revision; view-only cursor/scroll changes advance the view revision. Same-length text edits are detected. Streaming growth and continuation update the existing source record when the host object is stable. A normal generation remains unbound until a new assistant source is observed; continuation and swipe may bind the verified existing assistant head. Stop marks `stopped-partial`; an end event without verified correlation leaves status `unknown`. The model never infers successful completion. Dry-run starts are ignored.

Missing host text remains an empty string and missing sources remain absent; neither is fabricated from token payloads. If the host cannot provide a unique source locator, the reader reports no valid selection. Provider failure does not block this model's read path.

## Boundaries and next consumer

This contract is in-memory and adapter-session scoped. It does not define durable source IDs, state anchors, save/load, state migration, or cross-tab ownership. Those belong to the separately authorized identity/storage work. DYL-18 may consume this contract only after its own gate is cleared; this ticket does not start that work. M1 Gate A remains `NOT_RUN` because the visual reader is not implemented here.

The streaming hot path reads only the latest, head, and selected host entries, and returns snapshots without copying the full history. Full history is read only for explicit lifecycle reconciliation or when count/owner changes make an incremental update ambiguous.
