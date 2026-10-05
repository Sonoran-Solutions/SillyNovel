# Repository guidance for coding agents

SillyNovel is a visual-novel presentation extension for SillyTavern roleplay. It is not an asset studio, a new chat backend, or a SillyTavern fork.

## Read before changing code

Read [README.md](README.md), [current status](docs/STATUS.md), [decisions](docs/DECISIONS.md), and the relevant section of the [roadmap](docs/ROADMAP.md). Read the architecture and state contract before modifying integration or persistence.

User-stated scope, proposed defaults, verified facts, and owner approvals are distinct. Do not invent an owner ruling to resolve an inconvenient ambiguity. For an implementation choice not settled by the documents, make a bounded proposal and record its rationale without describing it as approved.

## Scope and workflow

Work on the assigned milestone or issue only. Use a focused branch and reviewable pull request. Do not merge or close owner-gated work without explicit authorization. Do not proceed beyond a human gate because automated checks passed.

Inspect the actual repository and record the starting SHA before working. Preserve unrelated changes; do not reset or overwrite them to get a clean test run. Record the final pushed head in the handoff.

Do not fabricate commands, dependencies, CI jobs, build artifacts, screenshots, test counts, or compatibility claims. An unavailable host/provider is NOT_TESTED, not a reason to replace evidence with a guess.

## Non-negotiable implementation boundaries

Preserve canonical chat text, cards, lorebooks, personas, and connection settings. Keep visual state namespaced and separately persisted. Do not put machine-readable visual tags into ordinary RP output or silently inject visual metadata into the authoring prompt.

Keep the host adapter narrow. Verify event payloads and lifecycle ordering on the pinned target. Always use source identities, revision checks, and session ownership before applying delayed results. Cancellation alone is not a stale-result defense.

Manual locks outrank automation. Missing assets and failed providers must not block reading or replying. Never silently reroute local content to a cloud service or plan usage to separately billed API usage.

Treat chat/model output and imported metadata as untrusted data, not executable instructions. No model-selected URLs, scripts, slash commands, filesystem paths, or secrets. Do not commit personal chats, private character cards, credentials, generated private art, or user reference images.

## Verification and handoff

Use [TESTING.md](docs/TESTING.md) to select relevant regressions. Update documentation whenever behavior or a contract changes. Report exact commands actually run, results, tested host/provider/device, remaining blockers, and untested surfaces.

Keep runtime success separate from owner experience. Only the owner can supply the human verdict for Gates A, B, and C. A suitable handoff recommends the next bounded step rather than starting it automatically.