# Visual state and scene-director contract

**Status:** proposed v1 contract. This is a design specification, not a shipped persistence format or a promise of model accuracy.

## 1. Authorities

| Domain | Authority |
| --- | --- |
| What was said or happened in the story | Selected canonical SillyTavern conversation |
| Character identity and message author | Verified host/card mapping, with manual resolution when ambiguous |
| Explicit visual selection and locks | User |
| Permitted automatic visual changes | Validated director proposal, subject to the user locks |
| Which files may be shown | Approved asset registry |
| Requests, endpoints, spending, and credentials | User configuration and provider policy, never the director |

A visual lock can intentionally disagree with the prose. That disagreement is a display choice, not a rewrite of story canon. Keep the two authorities distinct.

## 2. Identity and source anchors

Do not key persisted state by a display name or a mutable array position. In particular, upstream warns that `characterId` is an array index and can be undefined in group chats. [S1](REFERENCES.md#s1)

The host adapter must establish these identities:

- **Host chat key:** user/account scope + character/group scope + a verified host chat identifier. A title is not sufficient.
- **Character key:** extension-owned ID mapped to a verified card identity. Rename, duplicate, import, and ambiguous mappings need explicit handling. No forced writes into the original card.
- **Message locator:** source index as a hint, author key, selected content digest, and swipe identity/digest where available. A numeric index alone is never durable authority.
- **Prefix digest:** a digest of the ordered canonical prefix through that selected message, including roles/authors, exact selected text, relevant swipe identity, and a fingerprint-format version.

Specify one deterministic serialization and SHA-256 hashing convention in implementation. Do not silently normalize away text edits. An insertion, deletion, selected-swipe change, or author change must invalidate affected anchors.

Copies and branches may share a verified prefix, but receive their own host chat keys. Reusing a validated prefix snapshot is allowed; sharing live mutable state or pending jobs is not. If a host identity cannot be established safely, show an assignment/compatibility error rather than invent one.

## 3. Stored state

Global/user settings contain preferences, provider references, asset bindings, and defaults. Chat-scoped metadata contains the selected visual baseline and a versioned record of snapshots and overrides. Neither contains raw credentials or image bytes.

A snapshot needs these logical fields:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Persistence-format version; initially 1 |
| `sourceAnchor` | The exact selected message and prefix the interpretation describes |
| `stateRevision` | Monotonic extension revision for this chat |
| `baseState` | Automatic visual projection: location, time, present cast, outfits, poses, expressions |
| `manualOverlay` | Explicit user values and lock scopes that override base state |
| `renderSelection` | Resolved asset IDs and immutable revisions/hashes, including fallback reasons |
| `provenance` | Manual/rule/director origin, selected model and prompt version when applicable |
| `catalogRevision` | Registry version used to validate IDs and select assets |
| `status` | Valid, needs-review, invalidated, or unsaved, with a bounded reason |

Keep the logical scene separate from file availability. A character can be present even when no suitable sprite exists. An approved visual record should not change simply because a newer candidate image was generated.

Snapshots are bounded by an explicit storage policy. Before pruning old snapshots, retain checkpoints or offer export, and disclose when exact old visual playback is no longer available. Reconstructing old scenes must never secretly make cloud calls.

## 4. State transitions

Use a pure reducer for validated changes. It receives a previous state, a typed update, source identity, and lock policy; it returns a new state without network or DOM work.

M1 records manual scene state against selected messages. M2 adds a director-derived **end-of-message** interpretation. A complete-message reader can display that interpretation alongside the full message. Precise changes within a long message require a later beat/cue format; follow the paged-reader rule in [UX_SPEC.md](UX_SPEC.md).

Omitted update fields mean **unchanged**. Null is not a universal reset instruction. In v1, automatic clearing uses an explicit allowed value or operation; arbitrary null values are rejected.

Presence is sticky until a verified exit or manual change. Outfits are sticky until an explicit change. A mentioned location, hypothetical plan, flashback, dream, quoted story, or negated action is not automatically the current location.

## 5. Manual overlay and locks

Manual selections are stored separately from automatic base state so that their scope and precedence remain auditable. Default scopes:

| Selection | Default scope |
| --- | --- |
| Location/background | From selected source point forward, locked until release |
| Character presence and outfit | From selected source point forward, locked until release |
| Stage slot | Chat-level layout preference, locked until release |
| Expression | Selected message only |

Each manual change or release increments an override revision. It invalidates pending proposals based on an older revision. Releasing a lock allows the next valid interpretation; it does not apply an old response that was waiting behind the lock.

A correction at an earlier source point invalidates later dependent visual records. It must not edit later story messages. The UI should explain that later visuals may need review or recomputation.

## 6. Director inputs

The director is a visual classifier, not a second roleplay author. Default input is the selected completed message, a bounded recent prefix, a compact previous scene, available character/location/visual IDs, active locks, and a versioned instruction.

Proposed initial limits are six recent messages within a 4,096-token input budget, at most 16 operations, and a 32 KiB response parsing limit. Output generation limits should be requested where the chosen transport supports them. A local parsing limit is not a guarantee about provider token charges.

Do not send entire cards, lorebooks, private notes, or the complete conversation by default. Ambiguity caused by the bounded context should produce no change or a review suggestion.

Treat quoted dialogue and every source message as data, including messages containing text that looks like instructions. Do not permit the director to choose an endpoint, fetch a URL, call tools, write files, or alter the user's provider settings.

## 7. Proposed director response

The request defines a versioned JSON object containing `schemaVersion` and `updates`. Each update must contain a known operation and evidence. The machine-readable example is in [director-response.json](examples/director-response.json).

```json
{
  "schemaVersion": 1,
  "updates": [
    {
      "op": "setCharacter",
      "characterId": "char_rowan",
      "expressionId": "joy",
      "evidence": {
        "sourceMessageKey": "message_demo_001",
        "excerpt": "Rowan smiles."
      }
    }
  ]
}
```

Proposed v1 operations:

| Operation | Allowed payload | Effect |
| --- | --- | --- |
| `setCharacter` | Known `characterId`; one or more of `present`, `outfitId`, `poseId`, `expressionId`; evidence | Updates unlocked fields for that character |
| `setLocation` | Known `locationId`; optional `timeOfDay`; evidence | Updates an unlocked established location |
| `suggestLocation` | Bounded plain-text `label`; evidence | Creates a review suggestion only; no active location change or image job |

`timeOfDay` permits `unknown`, `dawn`, `day`, `dusk`, or `night`. Character visual IDs must exist in the request's allowed catalog. Stage slots and speaker focus are not chosen by the model in v1; speaker focus comes from host authorship and manual staging.

An empty `updates` array is valid and means no change. It is often the correct answer.

Evidence consists of an allowed source message key and an exact excerpt of at most 200 characters from that message. Validate the reference and substring. A valid quote is useful for review but does not prove the model interpreted it correctly.

## 8. Validation and application

Reject unsupported schema versions, unknown keys, wrong types, unknown operations, unknown character/asset IDs, oversize responses, duplicate/conflicting updates to the same field, and invalid evidence. Reject the complete proposal rather than partially applying an invalid response.

For a structurally valid proposal, overlay the current locks and commit only allowed field changes. Record which proposed changes were ignored due to locks. Use stable operation ordering, and do not let a later duplicate operation win by accident.

Confidence numbers from a language model are not calibrated probabilities. The initial contract does not require them. Source evidence, limited operations, uncertainty-preserving behavior, and user correction are the controls.

If a response fails, preserve the last valid scene. No automatic repair/retry loop by default. A user-requested retry creates a new job under the same privacy and usage rules.

## 9. Asynchronous ownership

At submission, capture a token containing:

```text
hostChatKey
sourceAnchor + prefixDigest
sessionEpoch
settingsRevision
manualOverrideRevision
expectedBaseStateRevision
catalogRevision
directorPromptVersion
```

Before any UI application or persistence, compare every relevant component with current authority. If any differs, reject the stale result. Cancellation is an optimization, not a correctness guarantee.

For initial implementation, use one director job in flight per chat. Process new completed messages in canonical order. If later messages arrive during analysis, queue bounded work or mark skipped messages as unclassified; do not apply a proposal based on the wrong predecessor scene.

Switching A → B → A still changes the session epoch. A response started during the first visit to A must not silently commit during the second visit.

## 10. Chat operations

| Operation | Required response |
| --- | --- |
| Regenerate/select another swipe | Invalidate the changed message and all dependent suffix snapshots |
| Edit/insert/delete | Recompute source anchors; invalidate from first changed prefix |
| Continue a message | Treat the altered content as a new source revision, not a new unrelated scene |
| Stop streaming | Keep partial text readable; suppress automatic generation; mark visual interpretation provisional |
| Switch chat | Invalidate active jobs, clear stage ownership, restore only matching validated state |
| Open an old message | Read existing state; no provider calls merely for navigation |
| Branch/copy chat | New chat ownership; shared-prefix reuse only after validation |
| Rename/duplicate a card | Resolve bindings; never merge characters solely because names match |
| Disable extension | Invalidate jobs and restore ordinary chat; preserve saved visual data |

## 11. Migration and recovery

Migrations must be versioned and tested against saved fixtures. Preserve an exportable old record before a destructive migration. Unknown future versions must not be guessed at or overwritten; run without automatic visual state and report the incompatibility.

Missing or corrupt visual metadata must not prevent opening the original conversation. Lost assets should produce placeholders and repair controls, not a crash or a surprise regeneration charge.