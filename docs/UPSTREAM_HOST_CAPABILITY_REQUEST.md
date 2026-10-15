# Proposal: Supported per-chat extension state with durable identity and targeted updates

**Draft for owner review — NOT_SUBMITTED.** This is a request for architectural feedback, not an accepted design or scheduled upstream work. Research checked 2026-10-15; supporting evidence and illustrative contracts are in the [internal technical appendix](UPSTREAM_HOST_CAPABILITY_TECHNICAL.md).

## Problem

UI extensions sometimes need to associate small, independent records with a particular conversation. Potential uses include annotations, manual presentation settings, independent UI state, user-owned sidecar records and versioned supplemental metadata. SillyNovel's manual visual presentation is one motivating example; these are possible applications, not claims of demand from other extension authors.

SillyTavern already offers useful persistence surfaces. The [extension guide](https://docs.sillytavern.app/for-contributors/writing-extensions/#state-management) describes user settings, chat metadata and character fields. It also identifies `characterId` as an array index and warns that the metadata object changes on chat switches. Those surfaces serve existing workflows; the question here is whether an additional, narrowly scoped contract would fit.

An array index, display label or filename cannot by itself distinguish a conversation from a newly created one that reuses that locator. In the [inspected release context](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/scripts/st-context.js#L115-L137), chat identity exposed to extensions follows current character/group locators. A delayed operation needs stronger evidence that its original conversation and source are still valid.

The inspected [metadata save path](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/script.js#L9408-L9439) chooses current context and uses the chat saver. The [server save route](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/src/endpoints/chats.js#L524-L576) serializes a whole transcript and returns ordinary save status. This does not establish an independent record revision or targeted conditional update. Browser storage can retain local preferences, but does not provide authenticated host identity, native lifecycle ownership or coordinated host recovery. Extension-visible notifications are useful for refreshing UI; they alone cannot establish ordering across native writers.

Related work already exists: [#5265](https://github.com/SillyTavern/SillyTavern/issues/5265) proposes incremental sync, revision checks and metadata isolation; [#5865](https://github.com/SillyTavern/SillyTavern/pull/5865) explores multi-window leases, and [#6122](https://github.com/SillyTavern/SillyTavern/pull/6122) addresses queued save snapshots. The latter two are open proposals, not released guarantees. This request should be coordinated with that work, including continuing the existing conversation if maintainers prefer.

## Suggested capability

Would a small, versioned host capability for per-conversation extension records be useful? The proposed foundation would provide:

- An opaque conversation identity bound to the authenticated account/store, with a distinct incarnation after deletion and recreation.
- A handle corresponding to the currently activated view and loaded source revision, including repeated visits to the same conversation.
- Read and conditional update of a small JSON record in an extension namespace, independently of canonical messages and cards.
- Compare-and-swap against the expected record revision, with acknowledgement identifying the exact durably committed revision.
- Distinct stale-target, conflict, unavailable and I/O outcomes, so an extension can preserve an unsaved change without guessing.
- Host-defined rename, copy, branch, import, recreation and deletion behavior. Copies/imports/branches receive fresh identities and do not silently inherit records.

A first version could cover ordinary single-character conversations and explicitly refuse other scopes. Record limits and the implementation would be for maintainers to choose.

## Example workflow

1. A user opens a conversation.
2. An extension obtains its host-issued handle, bound to that activation and loaded source.
3. It reads its own namespaced record and record revision.
4. The user changes an extension-only setting, such as dialogue-panel placement.
5. The extension requests an update conditional on the captured handle and revision.
6. The host either confirms the exact committed version or refuses with a typed result.
7. Switching conversations, renaming, copying or importing cannot redirect that record. A late response is applied only if the extension still owns the same visit and source.

## Safety, compatibility and engineering cost

The host would own authentication, identities, native lifecycle, storage authority, revisions, conditional commits and recovery boundaries. Each extension would own its schema and UI. SillyNovel would retain its scene rules, manual controls, source-scoped choices, reducer and rendering; no scene logic or model-output parsing belongs in core.

Extension-only writes would leave canonical chat bytes unchanged. Clients would supply no filesystem paths or account-ownership overrides. Conflicting and stale writes would refuse; imported identifiers would grant no authority. Namespaces organize records within the existing trusted UI-extension environment, rather than promising isolation from arbitrary privileged extension code.

This small external surface still requires meaningful host integration: participating native writers must invalidate obsolete authority before conflicting mutations, and loads must correspond to their source. Interrupted or uncertain writes need explicit recovery semantics. Unsupported writers must be excluded from the supported contract; post-hoc events or hashes cannot prove an unobserved write never occurred.

Stable identity migration, compatibility with existing chat/card formats, maintained writer call sites, backup/restore, performance and cross-version support all have costs. No particular database, lock layout or transcript-format rewrite is requested. Old hosts can omit the capability and extensions can remain session-only. Partial storage support without the lifecycle guarantees would not yet authorize SillyNovel production persistence.

Immutable raster assets, quotas, safe removal, bundles, migration/portability, groups and cross-device operation should be separate follow-ups. [#5269](https://github.com/SillyTavern/SillyTavern/issues/5269) is relevant to the asset discussion. The immediate question is receptiveness to the identity and independent-state foundation.

## Questions for maintainers

- Is there an existing supported mechanism that already addresses these requirements?
- Would this small host-owned capability fit the architecture, potentially alongside #5265?
- Which native lifecycle and recovery guarantees would be appropriate for an initial scope?
- Would you prefer continuing an existing issue/discussion, a separate API proposal, or a narrowly scoped contribution?
- Should immutable assets and portability remain separate discussions?
