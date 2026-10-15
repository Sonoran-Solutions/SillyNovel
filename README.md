# SillyNovel

**Your roleplay, presented as a visual novel.**

SillyNovel is a planned SillyTavern extension that presents ordinary roleplay chats with scene backgrounds, character sprites, a dialogue box, and restrained visual direction. Keep the characters, lorebooks, personas, model connections, and conversations you already use. Change how the story feels on screen—not who is writing it.

> **Status: M1.2-D0 session-stage review candidate.** Main contains the complete text reader and pure scene reducer. Branch `codex/m12-d0-session-stage` adds manually selected backgrounds, up to three sprites, a larger session cast, outfits/expressions and explicit locks. All visual choices are **UNSAVED** and clear on reload, disable or chat reactivation. The native composer remains in place. [Install/trial instructions, tests and screenshots](docs/M1_TRANSIENT_STAGE.md); Gate A remains NOT_RUN.

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
| [Transient manual stage](docs/M1_TRANSIENT_STAGE.md) | M1.2-D0 unsaved prototype, fixture hashes, installation and host evidence |
| [M1 reader plan](docs/M1_PLAN.md) | DYL-15 interaction designs, component contracts, dependencies, and pending owner decisions |
| [Native writer coverage](docs/M1_NATIVE_WRITER_COVERAGE.md) | DYL-42 disposable import/group/branch proof, explicit refusals and remaining gaps |
| [Testing](docs/TESTING.md) | Regression matrix and evidence requirements |
| [M0 compatibility](docs/M0_COMPATIBILITY.md) | Pinned host source, smoke results, lifecycle limits, and open integration seams |
| [Decisions](docs/DECISIONS.md) | User-stated scope, proposed defaults, and unresolved decisions |
| [Status](docs/STATUS.md) | Honest implementation and verification state |
| [References](docs/REFERENCES.md) | Verified upstream facts and integration limitations |
| [First implementation task](docs/prompts/FIRST_TASK.md) | A bounded M0 prompt for a coding agent |
| [Agent guidance](AGENTS.md) | Repository working rules for implementation and review |

## Install and develop

SillyNovel is a browser-side SillyTavern extension. It has no build step and no extension dependencies. The current implementation was inspected and smoke-tested against SillyTavern 1.19.0 at the exact commit recorded in [M0 compatibility](docs/M0_COMPATIBILITY.md); other releases and browsers are unverified.

Clone the extension into the SillyTavern third-party extension directory:

```sh
git clone https://github.com/Sonoran-Solutions/SillyNovel.git \
  /path/to/SillyTavern/public/scripts/extensions/third-party/SillyNovel
```

This installs the default `main` branch, including the merged text reader and pure reducer. For the session-only stage review candidate, check out `codex/m12-d0-session-stage` in the extension clone. Visual choices are unsaved; see the [manual stage trial](docs/M1_TRANSIENT_STAGE.md#install-and-try). Reload SillyTavern, open **Extensions**, and select **Enable SillyNovel reader** to read the current conversation. The feature starts off by default. Backlog opens native chat and scrolls to a matching candidate when available, with an explicit notice that its source revision could not be verified; Back to Chat and Return to Reader preserve a valid selection. To develop, edit the cloned extension in place and reload the SillyTavern page; no `npm install` is needed for SillyNovel.

Run the synthetic adapter/controller harness from the extension checkout:

```sh
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs
```

The behavioral browser check runs the actual entry and renderer. Its external Playwright/host-library setup, isolated pinned-host runner, and screenshots are documented in [testing](docs/TESTING.md#dyl-18-text-reader--2026-10-12). The harness does not replace the real-host checklist. Current host evidence and untested scenarios are in [M0 compatibility](docs/M0_COMPATIBILITY.md).

## License and attribution

A repository license has not been selected in this starter. Choose one before publishing an installable release. Record licenses and attribution for any reused code or bundled assets; a public repository is not a substitute for a license decision. This documentation imports no third-party extension code or art.

## Optional project persistence review candidate

The owner-authorized independent-project slice is documented in [the implementation report](docs/M1_PROJECT_STORAGE_SLICE.md). The optional local plugin saves global layouts and static PNG assets; explicit project selection is required after reload and native chat switches detach it. This is an experimental review candidate, not production acceptance. The existing reader/manual stage remains session-only without a compatible plugin. See the [separate plugin installation and limitations](plugins/sillynovel-storage/README.md); no live-host installation is implied.
