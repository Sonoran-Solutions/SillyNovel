# Product vision

**Document status:** proposed product baseline. User-stated scope and unapproved implementation choices are distinguished in [DECISIONS.md](DECISIONS.md).

## 1. Purpose

Make an ordinary SillyTavern roleplay session feel like a visual novel without requiring the user to abandon their existing character setup or write in a special format.

The desired experience is a persistent illustrated place with recognizable characters and readable dialogue. The interface should fade into the background. It should not turn every reply into a loading screen, a configuration exercise, or a hunt for the right sprite.

The user explicitly wants a better roleplay experience inside SillyTavern, rather than a standalone game or an asset-production tool. That distinction governs scope.

## 2. What SillyNovel adds

The proposed value is a coordinated experience: a scene with continuity, a comfortable reading interface, predictable speaker focus, and optional automation that can be corrected instantly.

SillyTavern already documents expression sprites and a Visual Novel mode. SillyNovel should evaluate and reuse useful host capabilities rather than treat the existence of sprites as a new invention. The differentiated work is the reader, scene continuity, and control model. See [S2](REFERENCES.md#s2).

### A representative session

A user opens a familiar group chat. Two assigned characters appear in an imported cafe background. The person currently speaking receives subtle focus. The user reads a response and types into the normal composer.

In manual mode, those visuals stay where the user put them. With the director enabled, an explicitly described smile can select an available expression. Mentioning a train station does not teleport everyone to it. An outfit remains in place until there is evidence of a change or the user selects another one.

When a new location is needed, the conversation keeps moving. An existing background or a neutral placeholder remains visible while an optional image job runs. A failed job is a visual inconvenience, not a failed roleplay turn.

## 3. Product principles

**Conversation first.** Canonical messages, character definitions, and the roleplay model remain authoritative. A visual interpretation is never silently promoted into story canon.

**Continuity over novelty.** Returning to a location should normally return to the same approved art. Expressions may change; identities and rooms should not be reinvented constantly.

**Manual control without punishment.** The user can correct or lock a visual choice without editing prose, reloading the app, or paying for another generation.

**Useful without extra AI.** Imported assets and manual staging must produce the central visual-novel experience. Director and generation services are enhancements.

**Reversible integration.** Turning the extension off restores normal chat presentation. It must not leave missing controls, altered drafts, or broken keyboard behavior.

**Private by default.** Installing or enabling the reader must not send chat content to a new service. Every additional processing destination requires deliberate configuration.

## 4. Scope

The initial target is a desktop browser with keyboard and mouse, with responsive layouts and touch behavior considered from the start. A staged scene supports one to three visible sprites; larger group membership must remain intact even when not everyone fits on stage.

The design is art-style agnostic. A contemporary roleplay, fantasy story, or science-fiction setting should use the same mechanics with different assets. Nothing in the core depends on a particular character name, relationship, image model, or proprietary provider.

## 5. Explicit non-goals

Do not build a replacement chat backend, a fork of SillyTavern, autonomous story-writing agents, a relationship simulator, a branching game engine, a visual asset marketplace, or a general image editor as part of the MVP.

Also defer animated rigs, lip sync, video generation, automated illustration of every reply, and arbitrary camera choreography. These may be interesting later; none proves the basic reading experience.

## 6. Definition of success

The owner chooses to continue an actual roleplay session in SillyNovel rather than switching back because it is easier. Reading and replying remain frictionless. Characters feel visually consistent, corrections are rare and cheap, and the feature survives normal chat operations.

Passing automated tests alone cannot establish this. [ROADMAP.md](ROADMAP.md) includes human acceptance gates before layering on more automation.