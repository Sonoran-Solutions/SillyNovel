# Experience specification

**Status:** proposed requirements, not implemented features.

## 1. Presentation modes

### Standard chat

Normal SillyTavern remains available. Entering or exiting SillyNovel must preserve the current chat, active swipe, draft text, scroll/backlog access, and model configuration.

### Scene reader — MVP

Use a scoped scene surface above or alongside the existing composer. It contains a background, up to three staged sprites, speaker identification, the selected message, and a small control strip.

```text
+------------------------------------------------------+
| Back to chat       Scene / cast       Visual controls |
|                                                      |
|                  location background                 |
|                                                      |
|        [character A]             [character B]        |
|                                                      |
| +--------------------------------------------------+ |
| | Speaker                                          | |
| | The current response, with readable formatting.   | |
| | Long content remains scrollable and selectable.  | |
| +--------------------------------------------------+ |
| Previous message      Backlog       Jump to latest    |
+------------------------------------------------------+
| Existing SillyTavern composer and normal send control |
+------------------------------------------------------+
```

This is an interaction sketch, not a fixed pixel layout. The scene must adapt when browser chrome or a mobile keyboard reduces the available height.

### Cinematic mode — later

An optional larger stage can reduce visible controls, but it must retain obvious access to the composer, backlog, and exit action. Do not make browser fullscreen a requirement.

## 2. Reading contract

M1 shows a complete selected message in a scrollable dialogue panel. Preserve its text, order, meaningful formatting, and author. Do not summarize a long response to make it fit.

Render untrusted content as text or through a tested sanitization path. Unsupported rich content should provide an explicit route to the original message, not disappear silently. The canonical message remains unchanged even when unsafe executable markup is not rendered.

The original chat is the backlog authority. MVP can return the user to the original message rather than duplicate every host message action inside the stage.

During streaming, show the arriving response without requesting a new director classification per token. The exact completion boundary must be verified in M0. A stopped partial response may remain readable, but must not launch automatic image generation.

If the user is reading an older message when new replies arrive, do not move the reading cursor. Show an unobtrusive new-message indicator. Switching the reader's cursor is not a story event and must not launch paid work.

### Paged dialogue — deferred

A later optional mode may paginate exact source spans at safe paragraph boundaries. It must preserve every span, avoid splitting active markup, and keep source references for copy/backlog navigation.

One end-of-message scene snapshot cannot represent the exact timing of several locations or speakers within that message. Until timed visual cues exist, keep the preceding scene during intermediate pages and apply the new snapshot only at the final page. Do not present an invented animation timeline as faithful to the text.

Typewriter animation is optional, off by default, instantly skippable, and disabled by reduced-motion preferences.

## 3. Speaker and cast

Use host message-author metadata to identify the message's speaker. Do not extract the author by guessing from quotation marks or the first named person in the text. Narration, user messages, and unresolved identities have explicit labels without a falsely focused character.

A group member is not automatically on stage. A mentioned character is not automatically present. Initial scene setup uses manual cast assignment; later director changes require evidence.

Keep left, center, and right positions stable across replies. Apply modest focus to the active speaker without excessive darkness on everyone else. Do not continuously reorder characters by who spoke most recently.

For larger groups, retain all logical participants. Stage selection uses manual slot locks first, then an available slot for the current speaker, then deterministic recent-presence order. Never remove a character from the logical scene just because there is no visual slot. On narrow screens, permit a single focused sprite and compact indicators for others.

Multi-speaker segmentation inside one host message is a later feature. M1 and M2 must not reattribute parts of a message to other characters without a separately tested parser and uncertainty fallback.

## 4. Background and sprite behavior

Preload a replacement before swapping it in. Use a brief fade when motion is enabled, or an immediate swap otherwise. Failed decoding leaves the previous valid asset in place and exposes a recoverable status.

Fit backgrounds predictably with configurable focal points. Fit sprites consistently using an anchor and intended height; do not independently stretch each image to fill the stage. Preserve transparent edges.

An unrecognized emotion should select the character's approved neutral expression or leave the current compatible sprite. It must not select another character's art.

An unavailable outfit must not silently display a contradictory outfit. Prefer a neutral sprite in the correct outfit; otherwise show an approved portrait/placeholder and mark the missing asset. The fallback hierarchy is defined in [ASSETS_AND_PROVIDERS.md](ASSETS_AND_PROVIDERS.md).

## 5. Visual controls

Provide controls for background/location, cast visibility, stage slot, outfit, expression, and automatic direction. The user should be able to fix a bad visual choice in one panel without changing the roleplay text.

A manual visual correction is a display instruction, not an instruction to the roleplay model. Changing the background to a beach does not secretly append a message saying the characters traveled there.

Locks are explicit and visible. Location, presence, and outfit locks persist until released. A manual expression defaults to the current selected message only. Persist the lock scope so a reload does not change its meaning.

Provide **Reset visual state** with clear scope: current chat only, with confirmation and a recoverable export where available. It must never delete the conversation, host settings, or asset library.

## 6. Automation status

Keep status separate from dialogue. Useful states include manual, analyzing, ready, needs assignment, missing asset, paused, and failed. Error messages should say what still works and how to recover.

A small “Why this visual?” panel can show the selected asset, the source message reference, whether the choice was manual or automatic, and a short evidence excerpt. It must not expose hidden model reasoning.

Changing providers must show which content will be sent. No surprise cloud fallback when a local service is unavailable.

## 7. Keyboard, touch, and accessibility

Do not capture global Space, Enter, or arrow keys while the user types in a composer, editable field, or input-method composition session. Reader shortcuts apply only when focus is in the reader.

Use labeled controls, visible focus, screen-reader-friendly names, selectable text, adjustable text size, and a readable dialogue surface independent of the background art. Speaker names must remain available even when focus is also communicated visually.

Honor reduced motion and avoid autoplaying audio. Touch controls cannot depend on hover. Layout should tolerate increased zoom and a virtual keyboard without covering the reply field.

## 8. Acceptance scenario

Run a real session with one background, two characters, and a small expression set. Send, stream, stop, regenerate, select an earlier swipe, edit a message, open the backlog, switch chats, reload, and disable the extension.

All text must stay available. The draft must survive. No scene from one chat may leak into another. The owner should be able to read and reply without repeatedly escaping the stage to repair basic controls.