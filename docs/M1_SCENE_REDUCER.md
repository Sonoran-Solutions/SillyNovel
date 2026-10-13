# M1 pure manual scene reducer — DYL-20

Implemented in `src/scene-reducer.mjs`, tested in `tests/m1-scene-reducer.test.mjs`. The owner assigned DYL-20 only on 2026-10-12 (America/Phoenix). This is a session-only scene-rules module; the production reader does not import it yet. No renderer, host adapter change, asset import, persistence, director, provider, or Gate A work is included. Gate A remains **NOT_RUN**.

Starting clean supplied checkout: `71e121050e8938690b3cf1003e7095fb6e2b9db5`. Fetched starting main and worktree base: `d253ce597532d6193b00401d30c173473d0f1de7`. Branch: `codex/dyl-20-manual-scene-reducer`. File ownership is limited to this document, the reducer, and its test file; `STATUS.md`, `TESTING.md`, DYL-21 probes, and the identity/storage report are untouched. DYL-17/18/19 were read in Linear and are Done.

## API and immutable outcomes

| Export | Contract |
| --- | --- |
| `createScene(context)` | Validate/copy caller authority and return neutral schema-v1 state. Invalid context returns `scene: null`. |
| `reduceScene(previous, command, authority)` | Validate an explicit command against current authority and projected locks/slots/catalog. Accept with a new deeply frozen scene; refuse with the exact unchanged `previous` reference. |
| `reconcileScene(previous, context)` | Install freshly validated history, selection, identities, and catalog. Invalidate affected commands or reset on a newer session epoch. No host observation or hashing inside the module. |
| `projectScene(scene, sourceKey)` | Return `{ scene, projection, result }` for a uniquely known source without advancing revisions or changing selection. No projection is returned on refusal. |
| `SCENE_SCHEMA_VERSION` | `1`, an in-memory contract version, **not** a supported persistence format. |

Results have `{ accepted, code }`; refusals also have a bounded `detail`. Scene values, projections, and result records are deeply frozen. Inputs are neither modified nor frozen; reads and identical-context reconciliation preserve the prior scene reference. All inputs must be plain data records/arrays with the documented fields, not executable objects. Object property order does not affect source comparison. Identical input histories give identical output histories.

Unsupported schema and malformed input refuse; no implicit migration, repair, reset, random IDs, timestamps, DOM, host context, network, filesystem, or provider work occurs. A refusal leaves no partial suffix invalidation, lock change, cast change, or revision increment.

## Caller authority and source correspondence

`context` is the caller's **attestation of freshly validated authority**, not evidence manufactured by this reducer:

```js
{
    ownerKey,              // opaque verified current-session owner key
    sessionEpoch,          // nonnegative safe integer; advance on every activation
    historyRevision,       // advance on source/order/prefix changes
    selectionRevision,     // advance on reader selection changes
    selectedSourceKey,     // unique key in sources, or null when unselected
    sources: [{
        key, revision, swipeRevision,
        fingerprintVersion: 'sn-source-v1',
        prefixSha256,      // exactly 64 lowercase hex digits; supplied, not computed
    }],                    // canonical source order, not a durable numeric index
    characters: [{ key, label }], // freshly verified or manually resolved identities
    catalog: { revision, assets: [/* typed records below */] },
}
```

All revisions are nonnegative safe integers. Keys/asset revisions are nonempty strings. Source and character keys and catalog asset IDs must be unique. Empty sources with `selectedSourceKey: null`, an empty character set, and an empty catalog are valid neutral inputs. An unresolved author can stay outside the character set: backgrounds remain independently usable with a validated source, and the existing text reader is unaffected.

No display name, host character index, avatar filename, text, or fingerprint is promoted into a durable character/chat/source ID. `label` is display data only; two verified keys both labeled Mira remain distinct. `ownerKey` and character/source keys are session-only here. The caller must obtain distinguishable card evidence or explicit manual resolution within verified scope before supplying a character key. Duplicate/unknown keys refuse. This module cannot authenticate a string or prevent a dishonest caller from falsely claiming evidence.

DYL-17's `sourceKey`, per-source `revision`, `sessionEpoch`, and `viewRevision` are compatible conceptual inputs after a caller validates the scene context; its host owner hints are not durable ownership, and `viewRevision` is not automatically this contract's selection revision. DYL-19's merged `sn-source-v1` candidate supplies prefix comparison after verified ownership is supplied. Its exact UTF-8 JSON/SHA-256 convention is in [the identity report](M1_IDENTITY_STORAGE.md#identity-and-source-contract-proposal). The Node tests reuse that merged probe helper to construct public-safe fixture hashes; production imports no Node hashing or probe module. A syntactically valid hash proves neither host ownership nor durable correspondence.

A command carries a captured token, supplied separately from its payload:

```js
{
    ownerKey, sessionEpoch, historyRevision, selectionRevision,
    catalogRevision, expectedRevision, // expected current scene.revision
    source,                            // exact selected SceneSource record
    origin: 'manual',                  // or synthetic lower-authority 'automatic'
}
```

Check owner/epoch, scene/catalog revisions, selected key/selection revision, then history and exact source/prefix/swipe revision before applying. Missing or ambiguous source cannot bypass locks. The future caller must control `origin`; model/chat data cannot assert deliberate-user authority. There is no director implementation. Synthetic automatic commands only exercise precedence. Cancellation is not used as an authority check.

## Scene schema and render projection

The scene contains:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1` |
| `context` | Owned frozen copy of validated caller authority |
| `revision` | Monotonic scene revision for accepted commands and context changes |
| `commandRevision` | Monotonic accepted-command sequence |
| `overrideRevision` | Monotonic deliberate manual-command sequence |
| `commands` | Session journal of `{ revision, origin, source, command, reference, valid }` |
| `view` | Projection at `context.selectedSourceKey` |
| `invalidatedFrom` | Zero-based first affected source position for the latest invalidation, or null; a notice hint, never source identity |

Projection:

```js
{
    background: null, // or { id, revision, status: 'ready'|'missing'|'incompatible' }
    backgroundLocked: false,
    cast: [{
        key, label,
        present: false,
        slot: null,       // or left/center/right session layout preference
        visible: false,  // exactly present && slot !== null
        outfit: null,    // default/unassigned, or immutable catalog reference
        expression: null,// neutral/unassigned, or immutable catalog reference
        locks: { presence: false, slot: false, outfit: false },
    }],
    slots: { left: null, center: null, right: null }, // visible character keys only
}
```

Neutral has no background, no cast registrations, no visible slots, and no locks. Logical cast registration comes from valid `addCharacter` commands and persists independently of presence/visibility. The cast ledger includes registered identities even before their first presence point; those entries remain `present: false` there. A renderer uses `present` for the scene cast and `visible`/`slots` for the stage. It need not infer identities, placement, or scope.

**Bounded implementation choices, not additional owner rulings:** presence false masks the sprite while preserving its reserved session layout preference. Returning presence restores that placement. Explicit `setSlot(null)` releases the reservation and goes offstage without removing presence/cast registration. Occupancy checks include absent characters' reserved slots, so a user must explicitly replace or release a reservation. This prevents navigation/absence from silently evicting a layout. At most three preferences and three visible sprites can occupy the stage; any number of logical members may remain offstage. Outfit replacement/clear resets the selected-source expression to neutral before any later explicit expression choice, avoiding an incompatible old expression.

## Catalog references and failure fallback

Catalog records:

| Kind | Required fields in addition to `{ id, revision, kind, available }` |
| --- | --- |
| `background` | None; a background ID is also the logical location reference |
| `outfit` | `characterKey` |
| `expression` | `characterKey`, `outfitId` (explicit null for the default outfit) |

`available` is a caller-validated boolean. There are no asset bytes, paths, URLs, loader calls, or inferred compatibility. A known compatible record with `available: false` may be selected and yields `status: missing`; logical selections remain intact. An unknown record, wrong kind/character, or expression with a mismatched active outfit refuses selection. Missing compatibility fields make the context invalid.

Accepted commands pin the catalog record's immutable revision. Catalog refresh never upgrades those references silently: removal or revision replacement yields `missing`; conflicting compatibility yields `incompatible`. A renderer must show a neutral/no-art fallback for those statuses and retain the requested reference for explanation/repair. No other outfit or character is selected as fallback. Clearing the outfit restores the logical default (`null`), not an invented default asset. This representation is a narrow reducer input contract for later registry work, not an asset registry implementation or proof of host storage.

## Commands and lock precedence

Only these payload fields are allowed; omitted fields never mean clear. Unknown/extra fields, including arbitrary `scope`, refuse.

| `type` | Payload | Scope/effect |
| --- | --- | --- |
| `setBackground` | `assetId` | Select or replace background forward from selected source; manual choice locks |
| `clearBackground` | None | Explicit null background forward; manual clear locks the neutral value |
| `addCharacter` | `characterKey` | Register logical member and set presence true forward; manual choice locks presence |
| `setPresence` | `characterKey`, `present` boolean | Presence forward; false preserves membership and layout reservation |
| `setSlot` | `characterKey`, `slot`, optional `mode` | Session layout; slot is left/center/right/null; mode defaults to move |
| `setOutfit` | `characterKey`, `assetId` | Select/replace compatible outfit forward; manual choice locks |
| `clearOutfit` | `characterKey` | Restore neutral/default outfit forward; manual choice locks |
| `setExpression` | `characterKey`, `assetId` | Select/replace compatible expression at exact selected source/swipe only |
| `clearExpression` | `characterKey` | Neutral expression at exact selected source/swipe only |
| `lock`, `release` | `field`, `characterKey` for character fields only | field is background/presence/outfit (forward) or slot (session) |

Character commands other than `addCharacter` require prior valid logical registration. Repeating an accepted command is explicit and advances revisions. `addCharacter` can deliberately restore a previously absent member. There is no command to delete host membership or canonical data.

`mode: move` requires an empty/reserved-by-self target; otherwise `SLOT_OCCUPIED`. `swap` requires both a target occupant and the moving character's old slot; it exchanges those two slots. `replace` explicitly moves the old occupant offstage, retains their logical presence, and assigns the new occupant. A null slot only accepts move mode. Every affected character's slot lock is checked for automatic commands. No automatic cast rotation or silent eviction occurs.

The approved M1 rule is preserved: a manual lock prevents lower-authority automatic changes, while deliberate replacements remain available. Manual background/presence/outfit/slot changes acquire the relevant lock; explicit lock/release is manual-only. Release retains the selected value and restores eligibility for the **next freshly validated** command. It never applies a previously delayed response. Old tokens fail the scene revision check after release. Expressions have message scope and no added expression-lock feature.

## Projection, historical correction, and revisions

Project by canonical ordered sources, then accepted-command revision within each source. Fold background/presence/outfit and their releases through the requested source. Expression commands are eligible only at that source, whose full source record includes the selected swipe/prefix revision. Apply the separate session layout in accepted-command order. No projected scene is cached or persisted; the accepted journal is the replay contract.

Example: background and coat chosen at message 4 are neutral at message 3 and active at messages 4 and 7. An expression at message 4 is neutral at message 7. A later session slot placement can affect both views, while message 3 remains absent until its validated presence point.

A deliberate command at an earlier source invalidates all currently valid commands anchored strictly later before validating the new transition. If the new command refuses, that tentative invalidation is discarded atomically. Valid commands at the same source remain ordered by command revision. This conservative rule also applies to releases and session layout corrections; it never edits canonical messages or silently revalidates a later decision.

Reconciliation compares old/new ordered source records. At the first changed key, source/swipe revision, or prefix digest, invalidate commands from that old position onward. Edits, continuation, swipe changes, insertion, deletion, replacement, and reordering all follow this rule. A simple unchanged-prefix append preserves prior decisions. Identical text is irrelevant to identity. Reordering does not transfer a choice to the message at its old index. Loss of a validated character key invalidates that character's commands. Invalidated entries are retained with `valid: false`; returning to an old hash/key does not resurrect them. Explicit new commands are required. This is pure conservative invalidation, not the full future M1.3 host-history proof.

Navigation installs a new selected key with an advanced selection revision and increments scene revision only. A newer session epoch resets context, current visuals, and the session journal, while preserving monotonic scene/command/override counters in the reducer chain. This handles A → B → A even when the owner key returns to A. Old/same-epoch owner changes and backwards context revisions refuse. No session state is restored from another visit. A separately created reducer starts counters at zero and owns no shared mutable state.

Every accepted explicit command increments scene/command revisions and manual commands additionally increment override revision. Context changes increment scene revision; identical reconciliation returns `UNCHANGED` without an increment. Refusals and projections never increment revisions. Safe-integer ceilings refuse rather than wrap. The journal has no pruning/checkpoint or persistence-size policy in this scope; a `ponytail:` comment marks the upgrade to validated bounded checkpoints when storage is separately implemented.

## Refusal codes

| Code | Meaning |
| --- | --- |
| `INVALID_CONTEXT`, `INVALID_SCENE` | Malformed authority/state or unsupported schema/fingerprint |
| `UNKNOWN_COMMAND`, `INVALID_COMMAND` | Unsupported operation or malformed/extra payload fields |
| `MISSING_AUTHORITY` | Missing exact captured source or supported origin |
| `STALE_SESSION`, `STALE_REVISION`, `STALE_SELECTION`, `STALE_SOURCE` | Owner/epoch, scene/catalog/context, selection, or source/prefix/swipe mismatch |
| `UNRESOLVED_CHARACTER`, `CHARACTER_NOT_ADDED` | Identity missing from verified set or logical registration missing |
| `UNRESOLVED_SOURCE` | Requested projection source absent/ambiguous |
| `UNKNOWN_ASSET`, `INCOMPATIBLE_ASSET` | No registry evidence or wrong kind/character/outfit |
| `LOCKED`, `MANUAL_ONLY` | Lower authority cannot change a protected field or lock state |
| `SLOT_OCCUPIED`, `INVALID_SWAP` | Occupied move without explicit mode or impossible swap |
| `REVISION_LIMIT` | Safe-integer counter exhausted |

Acceptance codes are `ACCEPTED`, `PROJECTED`, `UNCHANGED`, and `SESSION_RESET`.

## Later UI example

The later caller first builds/validates context using host/manual identity evidence and the candidate prefix convention. It must check every result and display a refusal without hiding the reader:

```js
import { createScene, reduceScene, reconcileScene, projectScene } from '../src/scene-reducer.mjs';

let outcome = createScene(validatedContext);
if (!outcome.result.accepted) return showSceneRefusal(outcome.result);
let scene = outcome.scene;

function dispatch(command) {
    const c = scene.context;
    const authority = {
        ownerKey: c.ownerKey, sessionEpoch: c.sessionEpoch,
        historyRevision: c.historyRevision, selectionRevision: c.selectionRevision,
        catalogRevision: c.catalog.revision, expectedRevision: scene.revision,
        source: c.sources.find(source => source.key === c.selectedSourceKey),
        origin: 'manual', // actual deliberate user action; never taken from model text
    };
    const next = reduceScene(scene, command, authority);
    if (!next.result.accepted) return showSceneRefusal(next.result);
    scene = next.scene;
}

dispatch({ type: 'addCharacter', characterKey: verifiedCharacterKey });
dispatch({ type: 'setSlot', characterKey: verifiedCharacterKey, slot: 'left' });
dispatch({ type: 'setBackground', assetId: approvedBackgroundId });
dispatch({ type: 'release', field: 'background' });

// Fresh caller reconciliation is required before applying work after navigation/history changes.
const refreshed = reconcileScene(scene, newlyValidatedContext);
if (refreshed.result.accepted) scene = refreshed.scene;
else showSceneRefusal(refreshed.result);
const selected = projectScene(scene, scene.context.selectedSourceKey);
if (selected.result.accepted) renderSelectedScene(selected.projection);
else showSceneRefusal(selected.result);
```

These UI function names are explanatory placeholders, not shipped renderer scaffolding. Delayed work captures the token when started and reuses it on completion, rather than minting fresh authority for old content.

## Evidence and remaining boundaries

Verification uses public-safe synthetic authority/catalog records and Node's built-in test runner. The existing behavioral browser suite exercises the actual reader entry with pinned host libraries; it is a fixture regression, not a new host campaign. Node: `v26.8.1`. Code-tested SHA and exact-head results are appended after verification; the final pushed head/PR URL are recorded in GitHub and the Linear handoff rather than guessed or made self-referential here.

Durable card/account ownership, host source-to-scene binding, targeted metadata-save completion, immutable owned assets, import/export, scene restore, writer exclusion, real provider/device integration, and owner reader feel remain **NOT_TESTED / unimplemented here**. DYL-19's PARTIAL/BLOCKED findings are unchanged; no DYL-21 unmerged code is consumed. No browser-local storage fallback is used. Gate A remains **NOT_RUN**. Recommended next step is review of this bounded reducer contract; later UI/registry/storage/history integration needs its own assignment.
