# SillyNovel

**Your roleplay, presented as a visual novel.**

SillyNovel is a planned SillyTavern extension that presents ordinary roleplay chats with scene backgrounds, character sprites, a dialogue box, and restrained visual direction. Keep the characters, lorebooks, personas, model connections, and conversations you already use. Change how the story feels on screen—not who is writing it.

> **Status: design documentation only.** This repository starter contains specifications and a staged implementation plan, not a working extension. There is no installable release, runtime entry point, compatibility claim, or completed playtest yet. Features below are planned unless [STATUS.md](docs/STATUS.md) says otherwise.

## The experience

Open an existing chat, enable SillyNovel, choose a background, and assign a few sprites. Read and respond normally. A persistent scene replaces the feeling of scrolling through a message feed, while the original chat and its controls remain one action away.

An optional scene director can eventually interpret completed messages and select an appropriate expression, outfit, or location. It must not write dialogue, invent story events, edit a character card, or force the roleplay model to emit visual-control tags.

```text
SillyTavern: cards + lore + model connection + canonical conversation
                              |
                    read-only conversation view
                              |
              SillyNovel: scene state + optional director
                              |
           background + character sprites + dialogue reader
                              |
             optional asset library / image-generation queue
```

## Planned capabilities

| Area | First useful version | Later expansion |
| --- | --- | --- |
| Presentation | Background, 1–3 visible sprites, speaker focus, current-message reader, backlog access | Paged beats, richer transitions, cinematic layout |
| Control | Manual scene and outfit selection; immediate return to normal chat | Locks, automatic interpretation, explainable corrections |
| Continuity | Chat-scoped visual records, reload recovery, swipe/edit invalidation | Portable visual-history export and richer scene reconstruction |
| Assets | Import existing backgrounds and transparent sprites | Generate missing backgrounds and occasional scene illustrations |
| Providers | No extra model or image service required for manual mode | Local director, ComfyUI, optional cloud adapters |

The first milestone is **not** an AI image generator. It is a chat you genuinely prefer reading in this presentation.

## Design boundaries

SillyNovel is an extension, not a SillyTavern fork, a standalone roleplay service, a game engine, or a general-purpose asset studio. The proposed implementation preserves the original conversation, makes visual automation optional, and keeps images off the critical path for reading and replying.

The project is not tied to a particular cast, fictional world, or art style. Use public-safe fixtures in this repository; keep personal chats and private character material outside version control.

## ChatGPT, image generation, and subscriptions

Ordinary OpenAI API billing is separate from a ChatGPT subscription. OpenAI also documents an eligible-app **Sign in with ChatGPT / ChatGPT plan usage** flow; its current preview excludes image-generation tools. These are distinct integration paths, not interchangeable credentials. See [provider planning](docs/ASSETS_AND_PROVIDERS.md) and the dated [source notes](docs/REFERENCES.md).

The image plan therefore includes manual prompt/reference export and result import, local generation, and separately configured paid image APIs. No browser-cookie scraping, private ChatGPT endpoints, or promise of subscription-covered automatic image generation.

## Documentation

| Document | Purpose |
| --- | --- |
| [Vision](docs/VISION.md) | Product goals, scope, and what makes this more than a theme |
| [Experience specification](docs/UX_SPEC.md) | Reader, scene, controls, groups, and accessibility |
| [Architecture](docs/ARCHITECTURE.md) | Extension boundaries, host adapter, lifecycle, and storage |
| [State and director contract](docs/STATE_AND_DIRECTOR.md) | Identity, snapshots, invalidation, automation, and manual authority |
| [Assets and providers](docs/ASSETS_AND_PROVIDERS.md) | Asset library, generation queue, billing boundaries, and privacy |
| [Roadmap](docs/ROADMAP.md) | Small implementation slices and human acceptance gates |
| [Testing](docs/TESTING.md) | Regression matrix and evidence requirements |
| [Decisions](docs/DECISIONS.md) | User-stated scope, proposed defaults, and unresolved decisions |
| [Status](docs/STATUS.md) | Honest implementation and verification state |
| [References](docs/REFERENCES.md) | Verified upstream facts and integration limitations |
| [First implementation task](docs/prompts/FIRST_TASK.md) | A bounded M0 prompt for a coding agent |
| [Agent guidance](AGENTS.md) | Repository working rules for implementation and review |

## Start development

Read the vision and decisions, then execute **M0: compatibility and reversible extension shell**. Do not skip straight to a multi-provider image pipeline. Installation and development commands must be added when actual code and a tested build procedure exist.

## License and attribution

A repository license has not been selected in this starter. Choose one before publishing an installable release. Record licenses and attribution for any reused code or bundled assets; a public repository is not a substitute for a license decision. This documentation imports no third-party extension code or art.
