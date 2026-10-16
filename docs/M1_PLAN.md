# M1 manual reader plan and UX contracts

## Current Gate A scope amendment — 2026-10-16

The owner [approved all five rulings and separately authorized DYL-60](DECISIONS.md#owner-approvals-and-dyl-60-authorization--2026-10-16): F1 for the first disposable Gate A playtest, PNG-only assets, explicit project reopening, manual four-card groups and available established Galaxy Tab S8 technical testing. PR #33 merged at `c835afe6e274be3fab5a2862f517fd8e4bca32ad`, the starting main for this work. [Current preparation/evidence](M1_4_DYL60_CANDIDATE.md) distinguishes technical results and remaining gaps. Original history/writer requirements below are amended only by F1 for this playtest; broader DYL-22/23 criteria and historical blocker relations remain. DYL-62/63 remain In Review despite merged code. Gate A NOT_RUN; owner session and verdict, M1.3/M2, DYL-56 and DYL-61 release work remain separately gated. Older dated entries retain historical states.

## Current readiness checkpoint — 2026-10-15

The [completion review](M1_2_STORAGE_COMPLETION_AND_READINESS.md) reviews main `ea65d84a521a39c9ccc977f4cb3643454963d4b8`, merged PRs #23–27 and Done DYL-49–54/57–59. Bounded DYL-55 completion is recommended **GO**, pending owner acceptance; parent remains unfinished. **Overall M1.2 REVISE**: the usable reusable library, attached transient source controls/group support and integrated layout/device evidence are incomplete. DYL-22/23 remain Backlog/functionally blocked with original dependencies. Gate A NOT_RUN; DYL-24 supported; DYL-56 Backlog; M1.3/M2 unauthorized.

Proposed next order is revised DYL-22 (first labeled/kinded PNG alternatives listed/reselected after reopen), revised DYL-23 (remaining practical manual-stage slices), then [DYL-60](https://linear.app/devils17/issue/DYL-60) (Backlog, M1.4, frozen disposable candidate). [DYL-61](https://linear.app/devils17/issue/DYL-61) holds release hardening separately. No duplicate asset/stage ticket is required. Owner must approve revised scopes and any deferral of JPEG/static WebP. A future metadata/schema change includes its real migration/backup/portable-format evidence; the existing v1 recovery policy is not an implemented version transition.

The original contracts and frozen Gate A session below remain historical acceptance requirements. Current project saves restore **global** scene state after explicit reopen, not source history or native correspondence. CAS conflict refusal does not implement the original single-writer/read-only-tab policy. The review proposes an explicit owner amendment for those differences; group, touch, native safety and the owner verdict remain required. No amendment, waiver, implementation or owner session is authorized by this checkpoint.

## Active project-storage direction — 2026-10-15

[Independent project storage](M1_INDEPENDENT_PROJECT_STORAGE.md) supersedes the upstream-API implementation path and earlier chat-metadata persistence proposals for this bounded slice. The owner authorizes planning and the first independent-project implementation with an optional local plugin, explicit attachment and project-global state only. Production release is not approved. Source-specific history remains transient/gated; existing renderer, source, lock and native-composer safeguards remain applicable. No project data enters native metadata or browser persistence. [Implementation and tracking](M1_PROJECT_STORAGE_IMPLEMENTATION.md).

DYL-48 is Done and PR #22 merged at `ca77bbf5e4ee5219e34e873b1680e8d644754149`. Upstream engagement is **ON HOLD / NOT_SUBMITTED**. DYL-22/23 retain Backlog and their blocker relations; DYL-24 remains supported; M1.3/M2 unauthorized and Gate A NOT_RUN. Earlier entries below retain their historical authorization/evidence scope and do not override this decision.

**Ticket:** [DYL-15](https://linear.app/devils17/issue/DYL-15/sillynovel-m10-a-write-the-reader-plan-and-bounded-ux-contracts). **Project:** [SillyNovel](https://linear.app/devils17/project/sillynovel-3833ac2248e8). **Phase label:** M1. **Date:** 2026-10-12, America/Phoenix.

**Historical DYL-16 authority:** planning and documentation. Owner decision recorded 2026-10-12 in DYL-16: M0 PASS for its explicitly documented scope and limits; L10 UNSUPPORTED / WAIVED; M1 defaults A–G approved with the clarifications below. Only DYL-17 and DYL-19 are authorized, in parallel as separate branches/PRs with coordinated file ownership. DYL-19 is a bounded proof only. DYL-18 and later implementation remain blocked pending prerequisites and separate authorization. Gate A is NOT_RUN; M2 is not authorized.

## Baseline and evidence

The initial checkout was clean on `test/m0-final-compatibility` at `6eedb720e699b1194db41371975ddd07b4db46c6`. Fetched `main` was `a7f1a4a6299a459adce1e24ea7b1b3f4405d02b5`, the merge commit for [PR #3](https://github.com/Sonoran-Solutions/SillyNovel/pull/3). This docs branch starts at that main SHA. Linear was reviewed on 2026-10-12: DYL-15–DYL-19 are the five existing issues in this project, all labeled M1 and in Backlog at inspection. Later ticket titles in this plan are proposals, not created issues.

Historical DYL-18 assignment: the owner separately assigned DYL-18 on 2026-10-12 after DYL-17/19 merged. The [reader contract](M1_READER_SOURCE.md#dyl-18-reader-ui-contract) records this text-only implementation; later scope and Gates A/B/C remain gated. Earlier authorization states below are historical planning checkpoints; current progress is in the readiness checkpoint above.

Read alongside [UX](UX_SPEC.md), [architecture](ARCHITECTURE.md), [state](STATE_AND_DIRECTOR.md), [assets](ASSETS_AND_PROVIDERS.md), [decisions](DECISIONS.md), [status](STATUS.md), [roadmap](ROADMAP.md), and [testing](TESTING.md). This plan narrows those designs for M1; owner-approved defaults and open technical proofs are identified separately.

| Verified M0 fact | Consequence for M1 |
| --- | --- |
| Host evidence: SillyTavern 1.19.0, `7e8663cd9c184a550b37238218bdd32c6efc68e9`; Brave `154.1.96.61`, Ubuntu 24.04; synthetic data and deterministic local endpoint | Keep this pinned baseline; additional hosts/devices/providers need separate evidence. |
| Browser candidate `de25366aeaa5e1cbd10e9bc40861e8ae91339aee`; same-length correction `831714e9343b51682d643efb2eaa419ef9ab5145` tested synthetically only | No final-main browser rerun is claimed. Preserve evidence per exact candidate. |
| Token callbacks precede the corresponding host message write; normal and stop traces retained, continuation per-token ordering unverified | A token event requests a later read; its payload and immediate sample cannot supply current canonical text. |
| Stop can still be followed by ended/receive/render events; other inspected paths have different ordering or suppress message events | Ended is neither a message index nor a success signal. Reconcile source even when final message events are missing. |
| Temporary Chat can change without lifecycle events | Preserve a disposal-owned `#chat` mutation fallback and validate transitions without events. |
| Two Mira cards have the same author label; avatar fields differed in one test, and `characterId` is a current array index | Preserve labels; neither labels nor candidate avatar/index fields establish durable character identity. |
| M0 recorded L10 UNSUPPORTED / WAIVER REQUESTED; the owner later accepted it as UNSUPPORTED / WAIVED for the tested persistent-chat workflow | Preserve synthetic empty-source coverage and the separate Temporary Chat result; never report L10 as HOST PASS. |

Evidence and payload details remain in [M0 compatibility](M0_COMPATIBILITY.md) and [lifecycle validation](M0_LIFECYCLE_VALIDATION.md). The actual shell inserts a placeholder before `#chat` in `#sheld`; it leaves native chat and composer visible, reads `mes`/active swipe, and saves only the enabled preference. Its adapter owns ten listeners and a coalesced mutation observer. Its fallback compares the latest source, including exact same-length text; it does not track historical reader selections, durable identity, or scene saves. `createSourceTracker` is a latest-observation holder, not the future two-cursor model.

## M1.1 — Text reader foundation

### Reading and navigation

Deliver a useful text-only reader before importing art or persisting scenes. Show one entire selected canonical message: exact text, host-provided author/role, active swipe, and readable meaningful formatting. Text stays selectable and scrollable; no summary, ellipsis, paragraph pagination, typewriter, or multi-speaker parsing. Preserve complete author labels in the reader; M0's 120-character label cap is not the M1 display contract.

Prefer an already available host formatting/sanitization path only after DYL-18 verifies both safety and fidelity through the real rendering path. Do not copy host `innerHTML` or assume host/model markup is safe. Plain text with preserved whitespace is the explicit fallback. Unsupported embedded media, custom markup, or interactive content gets a visible **Open original message** action and explanation; all underlying source text remains accessible. Unsafe URLs/scripts are never executed. DYL-18 must prove ordinary emphasis, paragraphs, lists, and code remain readable; unsupported rich content cannot disappear silently.

| State | Ownership and behavior |
| --- | --- |
| Conversation head | Latest current canonical message and ordered history with each active swipe. Source model owns it; host actions alone change it. An indexed edit event about an older message does not redefine the head. |
| Reader cursor | Navigation owns a source selection plus `followLatest` or `pinned` mode and per-selection text scroll. Initial enable/chat activation selects latest; an empty chat has no selection. Cursor does not change host swipe or history. |
| Previous / Next | Navigate whole host messages in canonical order, including user/system messages. At boundaries disable the unavailable action. Navigation pins the selection, even if Next reaches latest; only Jump to latest resumes following. |
| Jump to latest | Explicitly selects current head, clears the new-message indicator, and resumes following. No provider/asset generation or canonical writes. |
| New replies while pinned | Update head and show a bounded indicator such as “2 new messages” (cap display at `99+`). Keep cursor, selected text scroll, and focus. Edits/continuations are changes, not new-message counts. |
| Backlog / Open original message | Reveal native chat and, when a verified locator permits, scroll to the selected original message. Native chat owns edit/delete/swipe actions. If precise handoff cannot be verified, show backlog without claiming the message was found. |
| Back to chat / disabled | Restore standard chat immediately; preserve exact draft, active swipe, native scroll, and focus/selection where supported. Returning to reader in the same chat keeps its valid cursor; a new chat starts at latest. |

Reader scroll follows streaming appends only when the reader was already at the text bottom. Scrolling up suspends that follow until the user returns to the bottom or chooses a visible **Follow text** action. This text-scroll choice is independent of `followLatest`. Source updates do not steal focus, reset selection, or replace the full panel on every token.

### Source revisions and lifecycle

DYL-17 may use explicitly transient locators within the active session, for example unique host object correspondence while that correspondence is still valid. It must detect replacement/reordering and re-resolve safely. An index is a hint, not identity. Text matching alone cannot distinguish repeated identical messages. If correspondence becomes ambiguous, clear to **Selection changed — choose a message in backlog or Jump to latest**; never display a plausible unrelated message at the old index. Persistent anchors wait for DYL-19.

| Host action | Reader result | Scene result once M1.3 exists |
| --- | --- | --- |
| Edit, including same-length text/author change | Re-read the selected source if safely resolved; mark it changed. Keep pinned mode and scroll as far as content permits. | Invalidate from the first changed prefix. |
| Insert/delete before selection | Re-resolve the same source if correspondence is proven; otherwise invalidate selection. Do not retarget by old index. | Invalidate the affected suffix. |
| Delete selected message | Clear selection with explicit deletion status; offer Previous/Next using verified surviving neighbors or Jump to latest. No silent neighbor selection. If following latest, follow the new head; empty means no message. | Remove eligibility of its anchor and dependent suffix. |
| Swipe selection / regeneration | Use active host text/swipe; preserve the older pinned cursor unless it is the changed source. Removed/recreated messages require safe correspondence or invalidation. | Invalidate changed source and suffix, never mix states from different swipes. |
| Continue | Update existing message revision; do not count it as another message. Pinned unrelated source stays put. | Invalidate that source and suffix; keep interpretation provisional while growing. |
| New group replies | Advance head per actual messages, with each host author label; pinned selection remains. | Do not infer identity/presence from label or mentions. |
| Chat A → B → A | Increment session epoch on every activation, clear old ownership before showing B, select B latest, then read current A on return. Old A work cannot apply during the new visit. | Restore only validated records owned by the new activation. |
| Eventless Temporary Chat / replaced chat view | Compare active view/context and source correspondence on coalesced DOM signals; invalidate session when ownership changes even without `CHAT_CHANGED`. DYL-17 must prove this detection. Ambiguous ownership clears source rather than reusing A. | Ephemeral/unresolved ownership is session-only; no durable save or guessed key. |
| Empty/no-chat, missing source, malformed index | Explicit empty/unavailable state. Indexed event failure is not permission to read latest as that event's target. | No old scene carried into a new unknown chat. |
| Disable or render failure | Invalidate epoch; dispose reader work; native chat/composer remain usable. Host generation continues. | Saved visual data remains; no delayed render/save accepted. |

### Streaming contract to prove in DYL-17

Retain exact host text, never concatenate token payloads into a second canonical message. Treat tokens as dirty signals and coalesce post-update reads. Recommended seam: the owned DOM observer triggers a fresh context read after a host render, with at most one scheduled reconciliation per paint while a stream is dirty. A scheduled read is only a current-state sample, never proof of completion; validate this strategy on normal and continuation paths before adopting it. Preserve eventless fallback and exact revision comparison for both head and pinned selection, not just the latest message. Do not introduce a permanent full-history polling loop.

Generation status belongs to the matching session/generation, not whichever source happens to be visible. Ignore dry-run starts. Proposed statuses: `streaming`, `stopped-partial`, `complete`, and `unknown/error`. Existing history can be readable with unknown completion provenance. A known stop remains partial despite receive/render; ended only ends observed activity. Assign complete only from a generation-correlated, host-verified finalization path, including failure/abort distinctions. Missing signals retain readable current text with unknown status. On stop/end, reconcile source again; no automatic retry, director, or image job.

Every delayed read captures epoch, view ownership, generation/source selection revision and disposal state; compare before applying. Release frame/timer callbacks, listeners, and observers on disposal; cancellation alone does not protect A → B → A. DYL-17's pinned-host normal/continue/stop and controlled failure/abort evidence determines which statuses can actually be claimed.

## M1.2 — Manual visual stage

### First setup and identity

Enabling reader opens text immediately. **Scene / cast** offers **Add background** and **Add sprite** through explicit local file selection. Start with one background and one neutral transparent sprite; two neutral sprites and a few expressions are enough for the acceptance session. No required art pack, provider setup, AI assignment, or remote URL import.

Import flow: choose file → validate/decode → preview → choose asset type and user label → for sprites choose verified character identity, outfit and expression (defaults offered as “default outfit” and “neutral”) → explicitly approve → assign left/center/right. Let the user decline assignment and keep approved art unassigned. Backgrounds need only a user-created location label; no world catalog required. Default sprite anchor is bottom center with consistent intended height; preserve aspect ratio and alpha. Optional focal point/scale corrections stay in this same small panel.

DYL-19 must establish extension-owned character keys mapped to verified host evidence. A chooser can show label plus a trusted host thumbnail and disambiguating card detail, but it must not treat the thumbnail filename as a durable key. For duplicate Mira identities, require a specific binding and show its provenance. If evidence is insufficient, offer **Unassigned — reading still available**. A one-message manual resolution is anchor-scoped and does not silently bind all future messages named Mira. Durable resolution across reload/card rename/import waits for the proven contract. Card replacement or conflicting evidence invalidates the binding and asks again; no card writes.

### Stage and manual controls

| Control/behavior | Recommended contract |
| --- | --- |
| Background | One active approved background, or a neutral theme-safe surface. A changed location without compatible art uses a labeled placeholder; previous art is allowed only with an explicit “previous location art” marker. |
| Cast | Logical membership/presence separate from visibility. Larger groups keep every member in the chooser and source model; only three visible slots. Mentioning someone does not add them. |
| Slots | Left, center, right; one visible identity per slot and one slot per identity. Manual placement stays stable across dialogue. An occupied-slot move explicitly swaps or replaces after showing the effect, never silently evicts. |
| Larger-group staging | Manual slot locks first. For unlocked slots only, the UX baseline permits current speaker in a free slot, then deterministic recent-presence order. M1 uses stable manual placements with no automatic eviction; an offstage speaker gets a label/indicator. Locks protect manual choices from automatic or delayed changes, not deliberate user replacements. |
| Speaker focus | Modest border/brightness emphasis on the resolved host author; retain legibility of other sprites. No reorder or strong dimming. On narrow screens optionally show one focused visible sprite plus labeled indicators for the other assigned slots, without changing saved placement. |
| Neutral text | User and system messages retain host labels/roles, with neutral focus. Explicit host narration is neutral; M1 does not infer narration or extra speakers from prose. Unresolved character author retains the host label and no focused sprite. |
| Outfit/expression | Choose compatible approved variants manually. Same character/outfit neutral, then same outfit default pose/neutral, then explicitly approved identity portrait/silhouette/no sprite. Never choose a different character or contradictory outfit. Show requested versus fallback selection. |
| Visibility | Explicit show/hide per character; hiding a sprite does not remove a group member or change who can reply. |
| Loading | Decode/preload before swap; apply only if ownership/revisions still match. Preserve the previous valid compatible art on decode failure; otherwise placeholder. Retry/remove/reassign in controls, while reading/replying remain available. |
| Reset | Current chat visual state only, with clear scope, confirmation and recovery export where available. Never delete chat, shared assets, cards, or host settings. |

Manual controls dispatch typed reducer commands; they do not mutate renderer-only scene state. Pull the small pure manual reducer forward into M1.2 before controls, as the Linear project recommends. M1.3 adds lifecycle invalidation and durable saves rather than replacing a disposable UI state model.

### Import and storage proposal

Recommend PNG, static WebP and JPEG; transparent sprites normally use PNG/WebP. Reject SVG, animated images, scripts, external references, archives and executable metadata in M1. Proposed starting ceilings: 10 MiB/file, 4096 pixels per edge, 16 megapixels/image, 50 MiB/import batch, 200 MiB/library bytes. Validate actual type and decoded dimensions; reject before unbounded decode where possible and verify afterward. Reject unsupported animation even when its filename looks static. These are reviewable safety ceilings, not measured device budgets; DYL-19 must confirm feasibility and quota/error handling. Raise them only with measured need.

Registry records use stable IDs, immutable revisions/content hashes, type, format, dimensions, storage reference, approval, character/outfit/expression compatibility and optional attribution. Filenames and imported labels are plain data. Image bytes never enter settings/chat metadata. No ZIP/pack importer is needed for the small library. Delete only explicitly selected extension-owned assets after showing references; missing files degrade existing scenes rather than destroying records.

Prefer verified user-scoped host storage. DYL-19 proves import/read/remove ownership and save contracts; observed host background/asset routes are candidate seams, not permission to choose a directory. Browser-local persistence requires a separate explicit proposal and owner approval, including quota recovery, export and local-only/portability disclosure. Until host storage is proven, durable import and saved bindings remain blocked; a separately approved session-only file preview must be labeled temporary. Do not silently substitute storage or begin speculative infrastructure.

## M1.3 — Source-anchored manual state

### Pure reducer and lock scopes

`reduceScene(previous, command, authority)` returns a new immutable scene and validation result with no DOM, files, network, clocks, random IDs or host writes. The caller supplies IDs/revisions and commits validated results through one serialized path. Reject unknown commands, malformed scopes, unknown registry identities, and incompatible asset choices atomically. Omitted fields mean unchanged; clearing is an explicit command. M1 has a neutral baseline and manual overlay; it does not implement an automatic director/base classifier.

| Manual value | Approved default | Release/correction behavior |
| --- | --- | --- |
| Background/location | From selected source forward, locked until release | Release is source-anchored; keep current value until another explicit manual choice. |
| Presence/visibility | Per identity from selected source forward, locked until release | Does not alter host membership. |
| Outfit | Per identity from selected source forward, locked until release | No stale load may overwrite it. |
| Expression | Selected message/active swipe revision only | Returning to other messages uses their validated state or compatible neutral fallback. |
| Slot | Chat-level layout preference, locked until release | Layout is separate from source-derived story state; never shared mutably between chats. |

Locks prevent automatic or delayed changes from overriding manual values; an explicit user replacement remains allowed. Every change/release increments override and state revisions. An earlier manual correction invalidates later dependent visual records, with a notice that those visuals need review; it never changes story text. Streaming changes cannot acquire a falsely final anchor: choices remain provisional and unsaved until reconciled against the current source; an explicit earlier-history change still invalidates its suffix. Navigation resolves only validated records through the selected anchor. Never paint the head scene over an older message as if it were historical truth; show a neutral/unrecorded scene where no valid record exists.

Resolve a scene by folding eligible validated manual commands in canonical source order through the cursor, starting from the neutral baseline or a matching validated checkpoint. Apply forward values until their later explicit replacement, retain release scope, then apply expression overrides for that exact selected message/swipe revision and the separate current chat layout. Do not replay invalidated suffix commands by matching their old numeric indices; revalidation or explicit user reapplication is required. Commands at the same anchor use their recorded monotonic revision order. This deterministic projection is reducer logic, independent of save and rendering.

### Anchors, saves and recovery

Require the [state contract](STATE_AND_DIRECTOR.md): account + character/group + verified chat ownership; extension character keys; message locator with index hint, author evidence, exact selected-content digest and active swipe evidence; ordered-prefix digest through that message. DYL-19 freezes deterministic serialization and SHA-256 fingerprint version, including exact text, roles/authors and swipe identity. The anchor scheme must represent unresolved authors without inventing a card mapping. Source/prefix revisions change on edits, insertion, deletion, author/swipe changes and continuation. Digests are private local integrity data; do not log raw chats or commit their fingerprints as fixtures.

Persist only the `sillynovel` namespace after DYL-19 proves a safe save seam. Logical records include schema/fingerprint version, chat key, source anchor/prefix digest, state/override/catalog revisions, manual values and lock scopes, selected immutable asset revisions, manual provenance, and valid/provisional/invalidated/unsaved status. Image bytes remain in the asset store. Reader cursor/scroll need not be persisted in M1; reload starts at latest and restores its matching scene.

| Operation | Required storage behavior |
| --- | --- |
| Reload | Validate schema, owner, prefix, bindings and assets before restore. Missing art preserves logical selections with repair status. |
| A → B → A | New epoch each visit; separate scene/dirty records per verified chat. Never save through B's metadata reference for A. Revalidate A before retrying its unsaved work. |
| Edit/delete/swipe/continue | Find earliest changed prefix and invalidate suffix before render/save. Preserve old invalidated records for review/export, not automatic replay. |
| Branch/copy/import | New ownership; no shared mutable state, pending save or writer token. Reuse only a matching validated prefix after the DYL-19 contract proves destination identity. Copying the metadata blob alone grants no ownership. |
| Unknown schema/fingerprint version | Keep original bytes/record untouched and exportable; disable scene writes and show incompatibility. Continue text reading; offer a separate session-only scene without overwriting saved data. |
| Corrupt/missing metadata | Show recoverable status and neutral scene; retain damaged data for export. No silent reset, migration, or overwrite. |
| Save/quota failure | Keep dirty state in memory with **Unsaved visuals**, retry/export options and reload-loss warning. Never claim success from a helper invocation or debounce schedule. |

Save calls are serialized and validate owner, epoch, source/prefix, expected state/override/catalog revisions and writer ownership immediately before committing. Asset loads/hash results carry the same relevant token plus selection revision. Reject stale results after a control change, chat switch, reset, or disable, even if cancellation failed. A targeted write is preferred only if proven. For active-chat-only saves, DYL-19 must prove actual target selection and completion timing; if an in-flight save can cross chats without safety, persistence is blocked. Refuse/defer inactive-chat writes visibly. A check before calling an unsafe debounced helper is insufficient.

Approved policy: one visual writer within the verified account/storage scope; other tabs can read and navigate, but cannot make visual changes while another tab owns the writer. DYL-19 must prove the ownership mechanism and its crash/account-switch recovery. No timestamp lease claiming conflict safety without proof. Claim ownership before loading mutable state; on explicit takeover after prior owner release, re-read and validate records. If exclusion is unavailable, persistence stays blocked pending an enforceable approved fallback. Native chatting remains available in either tab. No cross-device concurrency guarantee is claimed without testing.

Proposed record ceiling: 1 MiB/chat and 200 scene records; coalesce repeated commands at the same anchor. Before a save would exceed limits, stop with unsaved/export status rather than silently prune history. Checkpoints/pruning can be a later bounded change. DYL-19 confirms actual host storage limits before these defaults are adopted.

### DYL-19 failure boundaries

| Unproven contract | Work that remains blocked | Work still eligible after DYL-16 authorization |
| --- | --- | --- |
| Durable chat/source identity | Saved scenes, branch/copy restore | DYL-17/18 transient text reader with safe selection invalidation |
| Durable card identity | Persistent sprite bindings and inferred focus | Text/host labels, neutral focus; explicitly session-scoped manual assignment only if approved |
| Safe metadata target/save completion | All durable scene writes | Pure reducer, session visuals if separately authorized and clearly unsaved |
| Owned asset storage/quota | Durable asset import/removal | Text reader; temporary previews only under an explicit approved fallback |
| Writer exclusion | Persistent visual editing across tabs | Read-only saved state where safe, text/navigation |

Return the failed proof and specific owner decision needed. Do not present a partial text-only candidate as the full M1/Gate A outcome with reload and imported-scene acceptance satisfied.

## M1.4 — Reader polish and Gate A

### Interaction sketches

These are static designs for review, not a prototype or host screenshots. Per DYL-16, the native feed is hidden only after successful reader mount; its DOM remains mounted for host actions and eventless observation. Visibility is extension-owned and reversible, with immediate Back to Chat. Preserve the native composer/send/stop controls; permanent side-by-side mode is not required for M1. Exact placement uses existing host containers and scoped CSS; no composer reparenting or fullscreen requirement.

**1. Desktop reader**

```text
+--------------------------------------------------------------+
| Back to chat       Scene / cast       Text size       Manual   |
|                         background                           |
|       [left sprite]    [center sprite]     [right sprite]      |
| +----------------------------------------------------------+ |
| | Host author / role                              12 of 12  | |
| | Entire selected message, formatted/selectable.           | |
| | Scroll this panel for a long response.                   | |
| +----------------------------------------------------------+ |
| Previous       Next       Backlog / original      Jump latest |
+--------------------------------------------------------------+
| Native SillyTavern composer, send and stop controls            |
+--------------------------------------------------------------+
```

Dialogue has its own opaque/readable surface independent of art. When available height shrinks, art yields space to dialogue and composer. No overlaid control covers send/stop.

**2. Mobile / narrow window**

```text
+-----------------------------------+
| Back to chat         Scene / cast  |
|    [focused assigned sprite]      |
| Other slots: Mira • Rowan         |
| Host author / role                |
| Full text, vertically scrollable  |
|                                   |
| Prev   Next   Backlog   Latest     |
+-----------------------------------+
| Native composer           Send    |
+-----------------------------------+
```

Wrap controls and use touch targets proposed at 44 CSS pixels minimum. Slot indicators retain identity labels; selecting one opens controls, not a guessed author mapping. Narrow presentation does not rewrite scene slots.

**3. Virtual keyboard visible**

```text
+-----------------------------------+
| Back to chat     Scene (collapsed) |
| Author                            |
| Scrollable dialogue (art yields)  |
| Prev / Next   Backlog   Latest     |
| Native composer + Send / Stop     |
+-----------------------------------+
|           OS keyboard             |
+-----------------------------------+
```

Prefer responsive CSS/dynamic viewport sizing; add a native visual-viewport listener only if device evidence requires it. Keep focused composer in view, retain its selection/draft, and restore available art space on keyboard dismissal. Never overlay a duplicate input.

**4. Streaming / stopped response**

```text
| Mira — Streaming                  |
| Current exact host text grows...  |
| [Follow text] when scrolled up    |
| Native Stop remains accessible    |
             user presses Stop
| Mira — Stopped; partial response  |
| Exact retained partial text       |
| Open original message             |
```

Status sits outside dialogue. No simulated typewriter; no assertive screen-reader announcement per token. Continue uses the same source with a new revision, not a second fabricated message.

**5. Older message and native backlog**

```text
| Reading message 4 of 12           |
| Selected old text + valid scene   |
| Previous   Next   2 new • Latest  |
| Backlog / Open original message   |
                 opens native chat
| Original message 4 + host actions |
| Return to reader (valid cursor 4)  |
| Native composer                   |
```

Backlog does not resume following or select a swipe automatically. If message 4 has been deleted/unresolvable, show selection invalidation and offer explicit navigation.

**6. Manual scene controls**

```text
| Scene / cast                         Close |
| Background: room [Change]  Lock: forward   |
| Identity: Mira (resolved card detail)      |
| Visible [x]  Slot [Left]  Layout lock [x]  |
| Outfit [Default]  Lock: forward            |
| Expression [Neutral] Scope: this message  |
| Add background / sprite   Reset this chat |
| Saved / Unsaved visuals / Read-only       |
```

Panel is secondary to reading and traps focus only when modal. Changes apply to the selected source, with visible scope; an old-message correction explains suffix invalidation before acceptance. Escape closes the panel when focused there, returning focus to its opener; it does not hijack the composer. Unsaved state offers retry/export; read-only controls explain writer ownership.

**7. Missing asset / unresolved speaker**

```text
| Mira — identity unresolved               |
| Full message remains readable            |
| No guessed sprite focus                  |
| Resolve identity / Open original message |

| Rowan — winter outfit art missing        |
| Approved portrait / neutral placeholder  |
| Choose compatible art / Import sprite    |
```

Do not claim missing winter art by displaying summer clothes. Dismissing status never blocks replying. Disabled reader removes the stage and shows native chat; a mount/render error restores that same usable view and exposes Retry in extension settings.

### Usability and failure requirements

Adjust text size with a small user preference (proposed 100–200%); tolerate 200% browser zoom and narrow portrait/landscape without horizontal dialogue clipping. Honor reduced motion: no fades/movement when requested; otherwise brief optional crossfade only after preload. Use semantic labeled buttons, visible focus, disabled boundary actions and polite status announcements. Sprite images are decorative when equivalent author/cast labels exist; no focus-by-color alone. Local reader shortcuts may use arrows for Previous/Next only while reader navigation owns focus, excluding inputs, textareas, contenteditable, selected text interactions and IME composition. Never capture global Enter/Space/arrows or change native send behavior.

Long messages scroll inside dialogue without forcing the composer offscreen. Touch works without hover or gesture-only commands. Focus/selection survive updates; opening reader must not discard native draft/scroll. Repeated reader ↔ chat/backlog transitions restore only extension-owned visibility styles and must not overwrite another extension's newer changes. If mount, subscription or render fails, clean up partially owned resources and reveal native chat before reporting failure. Asset failure degrades art only; capability failure disables the affected feature. No failure launches providers or rewrites text.

### Frozen Gate A acceptance session

Freeze one full candidate SHA after relevant technical checks; record SillyTavern release/full SHA, browser/device, viewport/keyboard conditions, extension/theme configuration, fixture/asset hashes and exact commands/results. Use public-safe invented fixtures for shareable evidence; never commit the owner's private roleplay or art. Any changed candidate needs fresh applicable evidence and owner review.

1. Technical preflight: T01–T14, T19, T22–T23 and T27–T30 from [TESTING](TESTING.md); pull T09 forward for M1 delayed reads/loads/saves and the HTML/data-safety portion of T29 forward for reader rendering. Test real entry/render paths, source/reducer behavior and proven save/storage seams. Separate SYNTHETIC, HOST_TESTED, INSTRUMENTED_HOST, OWNER_PLAYTEST and NOT_TESTED. No extra director/provider checks are required for manual M1.
2. Owner runs approximately 20 one-to-one turns (roughly one user reply plus host response per turn) with one imported background, two neutral sprites and a small expression set. Include long formatted response/copy, stream, stop/continue, regeneration/swipes, historical edit/delete, older-message reading during a new reply, manual corrections and lock release. Verify native send/draft, backlog and obvious exit throughout.
3. Owner runs a short group conversation (proposed 4–6 exchanges) with at least four logical members, including two same-name cards. Show at most three sprites; verify explicit ambiguity/no guessed focus, offstage labels and stable slots. Missing outfit/background art must not interrupt reading/replying.
4. Exercise A → B → A, reload/validated restore, branch/copy isolation, unsaved failure, second-tab read-only policy, repeated switches and disable during streaming. On desktop and at least one identified narrow touch/virtual-keyboard device, check zoom, text size, focus and reduced motion. An emulated keyboard is not physical-device evidence; missing device coverage stays NOT_TESTED.
5. Owner answers: more immersive than normal chat; easy to read/reply; controls reachable and out of the way; scenes useful enough to keep enabled. Record PASS, REVISE or STOP using the [human gate record](TESTING.md#6-human-gate-record), exact statement/date, blockers and next bounded step. Automated checks cannot supply the verdict. Gate A PASS does not authorize M2.

## Component boundaries and proposed interfaces

These are contracts for small JavaScript modules with JSDoc, not a scaffold mandate or verified host API names. Reuse `src/host-adapter.mjs`, shell lifecycle and scoped styles where suitable. Add a file only when a ticket needs it. No framework/build pipeline dependency has been demonstrated.

Proposed value shapes: `SourceView { sessionEpoch, viewRevision, transientOwner, head, messages, generationStatus }`; each immutable message has exact `text`, host `author/role`, active swipe and source revision. `Cursor { mode, locator, selectionRevision }` resolves to a message or explicit invalidation. Durable `SourceAnchor`/chat keys come only from DYL-19. `WorkToken` captures verified owner (or transient owner for reads), epoch, source/prefix, selection, state/override/catalog/settings revisions relevant to that work and writer token for saves. No consumer retains a mutable host context/metadata reference across asynchronous boundaries.

| Component | Inputs → outputs; state ownership | Allowed mutations and cleanup | Error behavior; dependencies; required coverage |
| --- | --- | --- | --- |
| Host adapter | Current public context + events + DOM signals → capability result, immutable reads, normalized observations, verified native handoff/save result where proven. Owns host subscriptions and compatibility facts. | Read canonical fields. Only reviewed extension-owned settings/metadata saves; no text/card/lore/persona/connection writes. Dispose listeners/observer/scheduled reads. | Missing capability returns actionable refusal; invalid index returns null. Depends on pinned host; DYL-17 extends reads, DYL-19 proves identity/saves/storage. T01–T03, T05–T06, T08–T11, T19, T30; eventless/exact-text/disposal regressions. |
| Reader source model | Adapter observations → immutable SourceView/revisions/status and invalidation. Owns ordered current history/head and generation/session ownership. | Replace extension snapshots only; no host writes. Dispose pending reads and source subscriptions. | Unknown correspondence/status stays explicit; never guess index/success. Depends on adapter, not assets/persistence. DYL-17: T04–T05, T08–T11, T13, T19; duplicate content, insert/delete, dry-run/failure/stop and host streaming proof. |
| Cursor/navigation | SourceView + Previous/Next/Latest/native-handoff intent → resolved selection, mode, new-message indicator. Owns cursor/scroll/follow choices. | Extension navigation only; native handoff through adapter, no swipe edits. Remove local input listeners and restore focus ownership. | Invalid selection/failed exact handoff has explicit route to backlog/latest. Depends on source model and mounted reader. DYL-17/18: T02, T10–T13; boundary/new-reply/focus/IME tests. |
| Scene reducer | Immutable scene + typed manual command + source/registry/lock authority → immutable validated scene or rejection. Owns logical transition rules; caller owns storage. | No side effects; never mutate input. Nothing to dispose. | Atomic rejection; explicit neutral/provisional/invalidated status. Depends on DYL-19 anchor/identity contracts, no DOM/provider. Proposed M1.2-B: T06–T07, T10–T12, T19, T22, T27; lock scopes/release/old correction/unknown command tests. |
| Stage renderer | Selected message + validated selected scene + registry assets + preferences → owned DOM/visual status. Owns presentation and outstanding decode/display work. | Scoped DOM/style updates only; no reducer/storage/provider decisions. Revoke object URLs, dispose image callbacks/motion/listeners and restore owned host visibility. | Render failure returns to chat; image failure retains compatible art or placeholder. Depends on source/cursor; art optional, then reducer/registry. DYL-18 and M1.2-D/M1.4-A: T01–T05, T07–T09, T13, T22, T28; actual mount/render/security failures. |
| Asset registry | Explicit file + validated binding/approval + proved storage result → immutable asset IDs/revisions, compatibility/fallback result. Owns catalog/bindings/bytes references. | Reviewed extension-owned assets only; no model-selected paths/URLs. Dispose previews/object URLs and partial imports; never erase existing library on batch failure. | Reject bad content/quota/ambiguous binding; preserve library, expose repair. Depends on DYL-19 storage/identity, user approval. M1.2-C: T06, T22–T23; decode/type/dimension/batch limits, replacement revisions, account ownership and safe removal. |
| Manual controls | Selected anchor + scene + catalog + writer/save status + user intent → validated reducer command/import/repair intent. Owns panel form/focus only. | Dispatch commands, never alter scene behind reducer or canonical text. Dispose controls; return focus to opener. | Invalid/ambiguous input shown locally; read-only controls explain why; unsaved/retry/export visible. Depends on reducer/registry/cursor and writer status. M1.2-D: T06–T07, T13–T14, T22, T28; scope labels, occupied slots and historical correction tests. |
| Persistence | Verified owner/anchor + versioned scene + WorkToken → acknowledged save, validated restore or explicit refusal/unsaved. Owns writer token, serialized save queue and dirty/recovery records. | `sillynovel` metadata/settings and proved asset boundary only; no blind merge/migration. Release writer/subscriptions; invalidate queue on switch/disable, retain dirty export while mounted. | Preserve unknown/corrupt records; no wrong-chat saves or silent pruning. Depends on DYL-19 proof and reducer/lifecycle. M1.3-B: T08–T12, T14, T27, T30; targeted/active-only races, crash/reload/quota/unknown versions. |

## Owner-approved defaults — 2026-10-12, DYL-16

The owner approved A–G together with the clarifications below. These decisions do not substitute for DYL-17/19 technical proof or authorize later tickets.

| Topic | Status | Recommendation and tradeoff / required decision |
| --- | --- | --- |
| Complete messages, two cursors, native composer/exit, no canonical rewrites | R | Required for M1.1; no art or persistence prerequisite. |
| One background, ≤3 sprites, larger logical cast, host author labels/manual authority | R | Required boundaries; neither a mention nor display name proves identity. |
| A — Reader layout | APPROVED | Scene reader is the default. Hide native feed only after successful mount; preserve the native composer/send/stop controls and immediate Back to Chat. Permanent side-by-side mode is not required for M1. |
| B — Reading/navigation | APPROVED | Preserve whole-message Previous/Next pinning and independent text-scroll position during streaming; Jump to Latest explicitly resumes following. |
| C — Character identity | APPROVED | Resolve only from verified host evidence or explicit manual selection of distinguishable cards within verified scope. An unresolved author cannot block reading or unrelated scene controls and receives no guessed sprite focus. DYL-19 proves durable identity. |
| D — Assets/storage | APPROVED | Keep the bounded raster-only proposal. Prefer verified host storage. Browser-local persistence requires a separate explicit proposal and approval; DYL-19 is proof work, not asset-library or persistence implementation. |
| E — Manual controls | APPROVED | Background/presence/outfit apply forward until replaced or released; expressions apply to the selected message. Stable slots are not automatically evicted. Locks protect manual choices from automatic/delayed changes, while deliberate user replacements remain available. |
| F — Rich content | APPROVED | Require readable ordinary formatting. Plain-text/native-view fallback is for unsupported or unsafe content only; DYL-18 must verify formatting fidelity and safety. Never truncate or execute untrusted content. |
| G — Persistence/writers | APPROVED | One verified visual writer with clear ownership and recovery; other tabs retain normal chat access. Unknown/incompatible records remain recoverable. Make no untested cross-device concurrency claims. |
| Source and owner gate | APPROVED | M0 PASS is limited to the documented scope/evidence; L10 is UNSUPPORTED / WAIVED for the tested persistent-chat workflow. Gate A remains NOT_RUN; M2 is not authorized. |

Remaining work here is technical proof or separately gated scope, not a pending owner decision on A–G. Provider/license decisions in the broader register remain separate. No private conversation or character canon becomes a public fixture.

## Linear delivery order and bounded PRs

Existing project milestones are M1.0 plan/authorize, M1.1 readable text, M1.2 imported scenes/controls, M1.3 saved state/lifecycle and M1.4 Gate A. The four implementation slices remain M1.1–M1.4; M1.0 is their planning/authorization prerequisite.

| Existing issue | Milestone and dependency | Deliverable/acceptance boundary |
| --- | --- | --- |
| [DYL-15](https://linear.app/devils17/issue/DYL-15/sillynovel-m10-a-write-the-reader-plan-and-bounded-ux-contracts): Write the reader plan and bounded UX contracts | M1.0; first | Docs/static sketches only; reviewable plan and open/unmerged PR. This task. |
| [DYL-16](https://linear.app/devils17/issue/DYL-16/sillynovel-m10-b-owner-decision-on-m0l10-and-m1-implementation-scope): Owner decision on M0/L10 and M1 implementation scope | M1.0; reviewed DYL-15 | Owner statement/date/scope in decisions/status; no agent-supplied approval. |
| [DYL-17](https://linear.app/devils17/issue/DYL-17/sillynovel-m11-a-build-the-reader-source-model-and-streaming-safe): Build the reader source model and streaming-safe updates | M1.1; DYL-15 and owner authorization recorded in DYL-16 | Read-only head/cursor, transient locators, post-update streaming/epoch/disposal proof; add a short regression smoke check against the current SillyNovel main head to pinned-host validation. No art or saved state. Authorized, not started. |
| [DYL-18](https://linear.app/devils17/issue/DYL-18/sillynovel-m11-b-ship-the-text-reader-backlog-handoff-and-composer): Ship the text reader, backlog handoff, and composer-safe controls | M1.1; DYL-17 review + separate authorization | Usable whole-message reader and native composer/exit; actual render-path safety, host screenshots/actions and basic narrow layout. No persistence/art. Blocked. |
| [DYL-19](https://linear.app/devils17/issue/DYL-19/sillynovel-m12-a-prove-chatcard-identity-and-assetmetadata-storage): Prove chat/card identity and asset/metadata storage contracts | M1.2; DYL-15 and owner authorization recorded in DYL-16; parallel with DYL-17 | `docs/M1_IDENTITY_STORAGE.md`, reproducible pinned-host probes and resolved/open contracts. Bounded proof only: no asset library or persistence system implementation. Authorized, not started; failed proofs block only dependent work. |

The work order is DYL-15 → DYL-16, then the authorized DYL-17 and DYL-19 lanes in parallel. DYL-19 need not wait for DYL-18. DYL-17 owns source/adapter event reads and source tests; DYL-19 owns proof documentation/isolated probes. Use separate branches and separate open PRs; coordinate any shared adapter change before editing and integrate through reviewed contracts. DYL-18 stays blocked pending DYL-17 review and separate authorization. This documentation task starts neither lane.

Only the five issues above existed at inspection, including archived issues (no further page). Propose the following missing tickets in **SillyNovel**, with label **M1**, under the named existing milestones. Proposal keys below are local references, not fabricated Linear IDs. Do not create duplicates or issue numbers in this task.

| Key / exact proposed title | Prerequisites | Scope, exclusions and acceptance for one PR |
| --- | --- | --- |
| B — **SillyNovel M1.2-B: Implement the pure manual scene reducer and lock scopes** | Authorized scope; DYL-17 + relevant successful DYL-19 anchor/identity contracts | Typed manual commands, forward/message/chat scopes and revision validation; no UI/storage/director. Runnable reducer tests for invalid commands, immutable inputs, release, duplicate identities, provisional source and historical correction (T06–T07, T10–T12, T19, T22). |
| C — **SillyNovel M1.2-C: Import and register a small approved raster asset library** | Authorized scope; DYL-19 identity/storage proof | File validation, approval, immutable revisions, minimal binding/import/export/removal flow; no packs/generation/asset editor. Synthetic corrupt/oversize/type/animation/quota and duplicate-Mira tests plus real owned import/read/remove evidence (T06, T22–T23). C may run alongside B with separate file ownership. |
| D — **SillyNovel M1.2-D: Render stable manual scenes and source-scoped controls** | Authorized scope; DYL-18 + B + C | One background, ≤3 stable sprites, focus/fallback and typed controls; no provider/director. Public-safe host screenshots with one-background/two-sprite library; four-member/duplicate-Mira, missing outfit, occupied slot, historical scene and stale decode tests (T06–T09, T13, T19, T22, T28). |
| E — **SillyNovel M1.3-A: Validate source anchors and invalidate manual scene history** | Authorized scope; B + DYL-17 + DYL-19 source/branch contracts | Prefix tracking, historical correction, edit/delete/swipe/continue/branch ownership and epoch rejection; no saves. Reducer/source lifecycle tests including repeated identical text and A → B → A (T08–T12, T19). D integrates against B's anchor contract; E adds full invalidation before persistent scenes. |
| F — **SillyNovel M1.3-B: Save and restore visual state with one verified writer** | Authorized scope; D + E + DYL-19 save/storage/writer proofs | Serialized owned saves/restore, single-writer/read-only tabs, schema/recovery/export and unsaved UI; no speculative migration/conflict merger. Real-host reload/branch/copy/save-race and second-tab checks plus corrupt/quota/unknown-version tests (T08–T12, T14, T27, T30). Failures preserve records/chat. |
| G — **SillyNovel M1.4-A: Polish responsive reading, accessibility, and chat recovery** | Authorized scope; D + F | Desktop/narrow/keyboard/zoom/text-size/reduced-motion/focus/touch and mount/asset failure recovery. Actual render-path tests and identified touch-keyboard device evidence (T01–T05, T13, T22, T28). No cinematic mode or pagination. |
| H — **SillyNovel M1.4-B: Freeze and validate the Gate A reader candidate** | G plus reviewed applicable M1 technical evidence | Frozen full SHA, integrated regression evidence and repeatable public-safe acceptance instructions; no feature additions. Record exact host/assets/fixture hashes, commands, screenshots and gaps against this plan. Gate A stays NOT_RUN pending owner session. |
| I — **SillyNovel M1.4-C: Record the owner's Gate A reader-feel verdict** | H frozen candidate; owner availability | Approximately 20-turn individual session plus short imported-art group session and explicit PASS/REVISE/STOP/date/SHA. Documentation only; cannot self-approve, auto-close gate or start M2. REVISE yields bounded reader fixes and another frozen review. |

Each implementation ticket retains M0 regressions, adds one small runnable behavioral check for its non-trivial logic, documents changed contracts and hands off a focused OPEN/UNMERGED PR with exact base/pushed head and evidence limits. No generic scaffolding or new test framework is needed solely for these contracts; select real DOM/browser tooling when DYL-18 requires it.

## Exclusions and planning handoff

DYL-15 changes documentation only. M1 excludes a new composer/backend, scene automation/director models, image generation, cloud-provider integration, AI sprite assignment, typewriter, paragraph pagination, TTS, a SillyTavern fork and speculative storage infrastructure. No private chats/cards/assets/reference images enter commits. Future modules, APIs, ceilings and layouts above are contracts to review, not implemented compatibility claims.

Historical DYL-15 handoff: that planning task left DYL-16 open and runtime work unauthorized because owner decisions were still pending then. The later DYL-16 decision authorizes only the two named parallel proof/source tasks above. This document records the approved scope and does not claim runtime work or Gate A completion.
