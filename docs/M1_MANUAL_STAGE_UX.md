> DYL-23-A below is historical. The separately authorized [DYL-23-B expression slice](M1_PROJECT_EXPRESSIONS.md) now adds temporary attached expressions in Scene; global project save/recovery semantics remain unchanged. Native group/device work remains unfinished.

# DYL-23-A manual stage and project UX

Owner assignment, 2026-10-16 (America/Phoenix), authorizes **DYL-23-A only**: integrate the existing manual stage and reusable PNG catalog, test the actual UI on disposable data, and submit one draft/open/unmerged PR for senior review. Starting fetched main is `ad70bb52e0f46155a5c7b1e5c3da957536612dc9`; GitHub confirms it merged PR #29. Initial supplied checkout was clean at `2f9daa38b9509e6462e3b9a84230a59a14d3c630`, PR #29's final head; the focused branch starts from the merge.

This assignment supersedes the old DYL-23 implementation hold **only for this slice**. Linear DYL-22, DYL-24 and DYL-53 are Done. DYL-22's broader JPEG/static-WebP/logical-revision requirements remain unfinished. DYL-55 also reports Done, despite historical pending-acceptance wording; this task does not reconcile or change it. DYL-23 keeps its original acceptance and dependency relationships and remains unfinished. DYL-60 stays blocked by DYL-23. Decision F remains undecided, Gate A NOT_RUN, and M1.3/M2, release and live installation remain unauthorized.

## Workflow and scope

Enable the reader in an individual native conversation. Native text, navigation and the existing composer remain available independently of artwork and the optional storage plugin. Expand **Manual scene controls**:

- **Project:** create or explicitly open a project, save, discard/reopen the attached project, detach, or use the existing portable-copy controls. The saved-project chooser is a browsing selection; the always-visible project status identifies the actual attached project by name, short UUID and revision. Its title exposes the full UUID. Attachment is for this browser activation; it is never written into the native conversation.
- **Scene:** select/apply a background; register/select manual actors; set presence, position, occupied-slot action, compatible outfit and locks. Current selections show names, distinguishing IDs, presence, reserved/offstage position and locks. The form follows the active actor's current choices. Manual locks protect against lower-authority updates; deliberate manual changes remain allowed. Release keeps the current value. Absent actors retain reserved positions; Offstage releases one. Refused occupied moves explain explicit swap/replace. A larger cast retains all actors while at most three sprites are visible.
- **Artwork Library:** import/label, browse existing entries with category and actor context, rename, unregister, and separately review/confirm unused-byte deletion. Import immediately selects artwork; Save project commits the global arrangement and full catalog together. Selected references and saved unselected alternatives remain protected. Unregister requires clearing/replacing a selected reference, explicit confirmation and save before bytes become eligible for cleanup. Cleanup retains its independent preview, selection, stale-revision checks and destructive confirmation.

Actor IDs are project/manual identities, without native card binding or inferred speaker identity. Duplicate names do not merge. Background/outfit selectors use names and short immutable asset UUIDs; option titles expose full reference IDs. The selected-art description retains full asset UUIDs for disambiguation. Missing/incompatible references keep neutral artwork and logical selection; sprite labels and positions remain stable. No replacement artwork is guessed.

Saved **global layouts and library registrations** persist after explicit save. **Message-specific visual history does not.** Project-global layout is shown across messages; it is not a historical reconstruction. Reload starts detached; A → B → A also detaches. Explicit reopen is required on each activation. Session-only fallback choices disappear on reload/disable/new activation. Attached expressions/groups are still unavailable; the accepted DYL-24 session expression controls remain unchanged.

## Status and recovery

The status/attachment/scope lines stay visible with controls collapsed. Save state is memory-only presentation state in the existing project model; it adds no database schema, native association, browser persistence or service.

| State | Display and permitted recovery |
| --- | --- |
| Session / no project | Unsaved session visuals; no attachment; explicit create/open when storage is available |
| Attached, clean | Saved project layout; project name, UUID, revision and activation scope |
| Dirty | Unsaved project changes; Save project commits the captured global snapshot |
| Pending | Saving project; another save/open/create/reopen waits; manual edits can continue and stay dirty if newer than the saved snapshot |
| Acknowledged | Saved project layout, or newer unsaved changes if edits occurred during save |
| Conflict | Unsaved changes remain in memory; save and cleanup refuse until explicit discard/reopen |
| Lost/invalid receipt | Outcome uncertain: server may have committed; save and cleanup refuse until explicit discard/reopen inspects saved state |
| Definite server refusal | Save failed; edits and prior saved state remain. Repair missing artwork or the reported condition before a deliberate save |
| Detached | No project attached; indicate deliberate detach or native conversation switch; saved project remains available |
| Storage unavailable | Explain missing/incompatible plugin, account/CSRF requirement or explicit v1 migration requirement; native reading/replying and session visuals continue |

**Discard and reopen attached project** targets the attached UUID even if the saved-project chooser points elsewhere. Dirty/recovery-state replacement and detachment require confirmation; Cancel preserves the current editor. Successful reopen installs a validated replacement only after loading completes. Failed open preserves the previous editor. Pending imports pause editing/project replacement; native switching still invalidates their ownership. Reopen never retries an uncertain write. There is no automatic discard, merge, mutation retry, database migration or conflict bypass.

Engineering choice for review: require explicit reopen after a save conflict/uncertain receipt rather than repeatedly submitting a stale/unknown revision. This is a conservative recovery UI over existing CAS, not a new single-writer policy or owner approval of Decision F. Project replacement waits for a pending save to settle, avoiding temporary invalidation of the old editor's receipt while a replacement might fail. Explicit detach/native switching can still abandon pending work, with no claim that server commits are cancelled.

Portable **v1 remains selected-art-only**, excluding labels/unselected alternatives; full-store preservation remains the verified operator backup workflow. Existing schema-v1 databases still require explicit verified-backup migration into a new stopped-host empty slot. This UI never performs migration.

## Presentation and accessibility

Three native fieldsets/legends group existing controls; no framework, tabs, reducer rewrite, storage rewrite or dependency. Labels and imported strings remain text nodes. Full reference IDs remain available through option titles and selected descriptions. Image failures retain neutral stage space and character captions. Dialogue has an independent minimum height; artwork yields to controls and disappears on narrow expanded-control or keyboard-reduced viewports. Status lines are bounded/scrollable so they cannot consume all dialogue space. Native composer stays mounted in its original host position.

Local Escape closes the controls and restores focus to their summary. The controls use native keyboard navigation, labeled selects/inputs/buttons, visible focus and 44px targets. No global interception, animation, director, generation or speaker spotlighting. Automated viewport/key checks do not establish physical touch, IME, virtual-keyboard or assistive-technology compatibility.

## Implementation boundaries and remaining DYL-23 acceptance

DYL-24 already supplied the accepted session-only stage; DYL-53 supplied saved global-project integration; PR #29 supplied the first reusable PNG catalog and explicit migration policy. DYL-23-A reorganizes their controls, synchronizes selection feedback, exposes attachment/save/recovery status and improves responsive layout. The narrow client classifies transport/malformed save receipts as uncertain; the existing model retains that recovery state across edits. Source identities, revision checks, model/session epochs, independent persistence, cleanup protection and portability remain in their existing layers. No plugin, reducer, reader, host adapter or protocol schema changes.

Original DYL-23 requirements still unfinished: attached memory-only message-expression overlays and source/swipe/edit/delete/continue/historical-correction integration; explicit saved-project use in native groups including four-member/duplicate-card acceptance; full integrated source-history behavior; identified physical touch/virtual-keyboard/IME and broader accessibility/device evidence. Persistent source history/native card correspondence, remembered attachment and single-writer behavior are excluded and remain original broader gate gaps. This slice supplies neither Gate A's owner verdict nor approval to execute DYL-60.

Recommended next step: senior review of this bounded PR. Separately scope/authorize any attached source-overlay/group slice; do not start it automatically. Exact frozen-candidate commands, counts, screenshots, named-file integrity and remaining limitations are recorded in the [implementation handoff](M1_MANUAL_STAGE_UX_IMPLEMENTATION.md).
