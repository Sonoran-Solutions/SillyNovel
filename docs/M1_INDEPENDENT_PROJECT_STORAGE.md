# Independent SillyNovel project storage

**DYL-22 review candidate:** [PNG library contract](M1_PNG_ASSET_LIBRARY.md) extends project/database envelopes to v2 with an additive transactional catalog migration; scene and portable bundle v1 remain unchanged. Saved library alternatives are protected from cleanup. Updated recovery tools support exact schema 1/2 and whole-library backups; portable v1 copies omit library labels/unselected alternatives. Historical v1-only/no-migration statements below describe the prior slice.

## Executive decision — 2026-10-15

The owner explicitly authorized independent projects, an optional local storage plugin, architecture documentation, Linear planning and the first bounded implementation slice. SillyTavern core remains unchanged. The existing session-only reader/stage remains supported when the plugin is absent. This authorization is **not production-release acceptance**.

Saved visual state belongs to explicit SillyNovel projects. Explicit user selection establishes the relationship with the current conversation; native locators never confer project authority. [Implementation plan](M1_PROJECT_STORAGE_IMPLEMENTATION.md) records tracking and evidence.

## Architecture and responsibilities

Intended design, not a claim of completed implementation:

```text
SillyTavern
  | Existing supported UI context/events
  v
SillyNovel UI Extension
  | Current dialogue       | Explicit project operations
  v                        v
Text Reader            Project Client Adapter
Manual Stage                   | Authenticated requests
Scene Reducer                  v
                      Optional Storage Plugin
                               |
                               v
                      Project Database / Assets
```

The UI reads native conversations and reuses the DYL-20 reducer and DYL-24 stage. The adapter speaks project operations, not SQL. The optional plugin owns only SillyNovel records and assets; it neither intercepts nor modifies native persistence. Canonical text, cards, metadata, lore, personas, groups, generation and connection settings remain untouched.

## Project identity

The server generates random project IDs. Cast members have stable project-owned actor IDs; asset IDs belong to their project. Neither names, filenames, message hashes, character indices, avatar filenames nor imported identity metadata grant ownership. Duplicate labels are allowed; keys remain distinct. Account ownership derives exclusively from authenticated host context, with ownership checked on every operation. Account deletion/recreation needs a reviewed lifecycle policy before release.

## Explicit attachment

- Create: make an empty named project under the authenticated account; choosing to use it with the current chat is explicit.
- Open: choose a listed project and load its global configuration. Opening for use in the current conversation is an explicit UI action.
- Use with current chat: establish a page-local attachment and a fresh operation epoch; never write native metadata.
- Detach: invalidate pending UI authority and clear the editable project scene. Saved data remains intact. Warn before deliberately discarding unsaved work.
- Save: capture project ID, expected revision and a validated immutable global-state snapshot before I/O. A receipt records that commit, but updates the UI only if project, attachment epoch and edit revision still match.
- Reload: start detached; explicitly reopen and use the project again.
- Chat switch (including A → B → A): detach synchronously and clear the editable scene before new dialogue is presented. Do not move the previous project's scene to the new chat. A pending valid save may commit its captured project without redirecting the UI.
- Duplicate: future explicit operation creates new IDs and remaps owned references; outside this slice.

Remembered association hints are future separately authorized convenience only. Rename, restore, copied/imported chats and matching bytes never autoattach.

## Persistence versus native correspondence

Project-global state includes reusable cast, approved backgrounds/sprites, outfit selection, stable slots, presence, locks and manual layout. The first schema contains only these values. Source-specific expressions, selected-message cues, source hashes, transcript identity and history are excluded. A source expression must not accidentally be flattened into a saved outfit. A future source-anchoring review is required for persistent message history.

A project save proves only a project commit. It does not prove its original native conversation still exists or is unchanged. Existing source-model safeguards continue to protect transient source-specific presentation. Project restoration must enter through validated reducer operations, with no fabricated native source authority.

## Storage, backup and recovery

Prefer local SQLite, subject to runtime/driver verification. Use transactions and expected-revision compare-and-swap; stale clients receive a typed conflict without mutation. Server-issued IDs, schema versions and authenticated ownership are required. Unknown schemas refuse without automatic destructive migration. Failed updates preserve the last committed revision and imported assets.

Proposed asset strategy: immutable SQLite BLOB rows with digest/dimensions and account/project ownership, referenced by validated project records. This keeps bytes and reference integrity in one transactional store, avoiding partial file moves. Asset upload commits independently; a later failed scene save retains the uploaded bytes. No garbage collection or destructive cleanup in the first slice. Bound upload bytes and decoded pixels before accepting an asset; decode actual static PNG content and verify readback hashes. Missing/corrupt assets use neutral art and leave dialogue usable. Corrupt databases fail closed for persistence while the session stage remains available.

The operator owns backups. Portable export/import, verified backup/restore and cross-installation migration are separate release blockers. Until their implementation, do not advertise recovery guarantees or offer an improvised restore command. Preserve old databases before any future migration; recover into a separately validated store with explicit selection. No rollback authority over native conversations is required because this store never claims to restore their identity/history.

## Limits and abandoned guarantees

Native chat identity is not independently authoritative; byte-identical native conversations may be indistinguishable. Unknown writers may invalidate message cues. Moving data into SQLite does not solve source correspondence. Imported/copied chats cannot inherit projects automatically. Cross-host synchronization, groups, message-scoped persistence and collaborative editing beyond conflict refusal are unsupported. Multi-user security requires actual plugin tests; concurrent editors require CAS. No localStorage, IndexedDB, settings or metadata fallback database. Plugin absence must leave reader, stage and native chat usable without repeated failed polling.

Server plugins run with server-process privileges and may participate in host update management. Installation must be explicit, initially only in disposable synthetic hosts. No generic path, filesystem browser, shell, process-control or URL-fetch API. No automatic plugin installation, enablement or live-host changes. Optional packaging does not establish official listing eligibility.

## Relationship to earlier work

DYL-47 recommended upstream host identity/lifecycle authority; DYL-48 prepared an upstream proposal. This owner decision changes the active implementation path to independently owned projects with explicit binding and deliberately narrower guarantees. It does not erase or invalidate those historical recommendations or DYL-26–46 experiments.

Upstream engagement is **ON HOLD / NOT_SUBMITTED**, neither canceled nor rejected by SillyTavern. Preserve [request](UPSTREAM_HOST_CAPABILITY_REQUEST.md), [technical appendix](UPSTREAM_HOST_CAPABILITY_TECHNICAL.md), [checkpoint](M1_STORAGE_ARCHITECTURE_CHECKPOINT.md) and [original proposal](M1_STORAGE_API_PROPOSAL.md). No maintainer contact is authorized.

DYL-22/23 remain Backlog with existing blockers (functionally Blocked), pending reviewed scope/prerequisites. This MVP does not satisfy their full asset-registry/manual-scene acceptance. DYL-24 remains supported. M1.3/M2 remain unauthorized; Gate A NOT_RUN.
