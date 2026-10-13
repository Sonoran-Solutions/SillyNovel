# M1.2-D0 transient manual stage — DYL-24

The owner assigned the session-only prototype on 2026-10-12 (America/Phoenix). This implements that bounded assignment. DYL-22's asset library, DYL-23's full scope, durable identity/storage, M1.3 saves and automatic direction remain unimplemented. Gates A/B/C remain **NOT_RUN**. Storage-design documents and probes are untouched.

Initial supplied checkout: `71e121050e8938690b3cf1003e7095fb6e2b9db5`, clean. Fetched main/worktree baseline: `c64bf05c00ac7cbbd7852fa60c8f21f38ce54517`. PR #9/DYL-21 and PR #10/DYL-20 were verified MERGED before implementation. DYL-20–23 were read directly in Linear. The exact task did not exist; [DYL-24](https://linear.app/devils17/issue/DYL-24/sillynovel-m12-d0-prototype-session-only-manual-vn-stage) was created under M1.2, related to DYL-20/21/23, and moved to In Progress. Existing DYL-22/23 blockers were preserved.

Branch: `codex/m12-d0-session-stage`. Isolated worktree: `/home/dq/.codex/worktrees/m12-d0/SillyNovel`. Runtime/host-tested SHA and pushed code SHA are recorded in the evidence section below. Final documentation-only pushed head belongs in the PR/Linear handoff; a commit cannot contain its own hash.

## Install and try

Clone SillyNovel into SillyTavern's `public/scripts/extensions/third-party/SillyNovel`, check out `codex/m12-d0-session-stage`, and reload the host. Open a conversation, then Extensions → **Enable SillyNovel reader**. The existing enabled preference may be saved; no visual choices or actor bindings are saved.

1. Open **Manual scene controls**, choose tavern or forest, and press **Apply background**.
2. Choose **Test actor art**, optionally edit **Session actor name**, then **Register session actor**. Repeat for Mira A, Mira B, Rowan and Sage. Both Miras retain the same display name and distinct manually created identities. Registration makes a member present but initially offstage.
3. Select a **Session actor**, choose left/center/right, and press **Apply position**. An occupied move refuses; choose **Explicit swap** or **Explicit replace** deliberately. Offstage releases placement without deleting cast membership. Absent hides a sprite but preserves its reserved slot.
4. Choose an outfit or expression and apply it. Mira A offers joy/stern and an alternate blue coat; the coat has its own joy expression. Other-actor outfits and incompatible expressions remain selectable for refusal testing and are labeled accordingly. **missing** deliberately has no sprite. Clear restores the explicitly chosen actor's default/neutral art.
5. Use **Lock choice** / **Release lock** for background, presence, slot or outfit. Manual replacements remain available. Expressions have the reducer's source/swipe scope and no additional expression lock.
6. Read with Previous/Next/Jump to Latest and reply using the original composer. Back to Chat/Return to Reader preserve the current selection and temporary scene for the active session. Reset transient visuals, disable/re-enable, reload, or any new chat activation clears visuals; returning A → B → A does not restore A's earlier art.

To try personal test art, choose **Temporary image use** (background or selected actor outfit), then **Temporary raster file**. This is a local in-memory preview, not an asset import/save. No file upload request is made.

## Stage and failure lifecycle

The existing complete selectable dialogue and restricted Showdown/DOMPurify formatter are reused. One background sits behind three separate left/center/right figures. Sprites use `object-fit: contain`, preserve alpha, and never infer the speaker from names or prose. Cast labels report presence/offstage and locks. Missing references and image load errors show neutral art/labels while reading and replying continue.

When visual capabilities are available, the unsaved indicator is always visible. Controls are a native collapsible `details` panel with labeled fields, semantic buttons, visible focus and 44px targets. Escape within the panel closes it and returns focus to its summary. The panel scrolls within a capped height; it does not trap focus. Opening it reduces art height on desktop and collapses art on narrow screens, preserving dialogue space. No global shortcuts or composer key handlers are added. Art shrinks on narrow screens and disappears below 620px viewport height before dialogue/composer space is sacrificed. Reduced motion disables stage motion. No animation or typewriter is implemented.

The reader mounts before hiding the native feed, keeps the host feed mounted/observed, and restores only its owned visibility class. Composer, Send, Stop, draft/caret and DOM ownership remain native; no composer node is duplicated or reparented. Visual hashing and decoding run asynchronously and do not delay text rendering. A text-render failure retains the existing native-chat recovery path. Artwork/visual-authority failures report locally and leave text reading available. A source/selection evidence change immediately clears displayed art and disables manual controls before changed dialogue paints. Only an accepted validation matching the current session/history/selection stamp can restore art; obsolete async completion cannot restore its scene. Reset also clears displayed art immediately.

Before creating any visual model, controls or artwork, the mount checks both `crypto.randomUUID` and `crypto.subtle.digest`. If either is unavailable, it mounts only a status notice alongside the complete text reader, explaining HTTPS or localhost on the host computer plus reload. Native composer, navigation, Back to Chat and enable/disable continue to work. This deliberately supports ordinary HTTP LAN access with a **text-reader fallback**; visuals require available crypto capabilities. Both APIs are restricted to secure contexts ([MDN randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [MDN subtle](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/subtle)). Capability-denial tests cover each missing API separately; an actual LAN device/origin remains NOT_TESTED.

## Reducer and transient authority

`src/transient-scene.mjs` imports the merged DYL-20 `createScene`, `reconcileScene` and `reduceScene` APIs unchanged. UI handlers dispatch typed commands; all cast/presence/slot/compatibility/lock/scope/replay/invalidation rules remain in the reducer. Rendering consumes the reducer's selected `scene.view`, which is its authoritative projection.

The reader exposes a frozen array of its already immutable source records through `getHistory()`. The shell exposes `getSceneEvidence(refreshCanonical = true)`. Ordinary observed stage updates use the model snapshot/history without another host scan. Explicit visual actions and delayed file commits freshly recheck canonical evidence. Navigation gets a separate selection revision; history revisions advance on exact ordered source record changes, rather than using reader `viewRevision` as scene selection authority.

Owner authority is a fresh random **session-stage** key for this activation/reset, gated by the reader session epoch. Source keys retain the adapter's unique WeakMap-backed host-message-object evidence. Duplicate or unavailable records refuse visual binding rather than substituting numeric indices or text. Host author labels remain unresolved identity data. Every registered actor is an explicit user-created `manual-session-actor-*` identity; selecting test art never binds a SillyTavern card, avatar or message author. Actor names are display data only. There is no durable account/card/chat identity claim.

Web Crypto hashes UTF-8 JSON arrays using the DYL-19 `sn-source-v1` ordered-prefix convention, with the explicitly transient owner/scope and unresolved author labels. Exact role, selected text and swipe data participate; no text normalization occurs. A digest detects changes, not ownership. Revisions, source keys, selected source and session evidence are validated independently. The prefix cache retains one encoded canonical entry per message and compact digests, rather than a serialized transcript prefix per message. Immutable reader source keys/revisions determine the first changed entry; unchanged prefixes reuse their digests. One scratch buffer supplies exact prefix bytes to native SHA-256. Unchanged navigation hashes nothing, and a tail edit hashes only its final prefix. Retained representation and serialization scale linearly; cold loads and historical edits still hash quadratic total bytes because Web Crypto is one-shot. The prototype refuses encoded histories above **8 MiB** or validation work exceeding **5 seconds**, checked between native digests, with neutral art and an actionable text-reader notice. These are bounded implementation choices, not owner-approved production limits. A larger-history implementation would require measured incremental SHA-256 preserving the same byte convention. The 1,000-message regression and budgets are recorded below.

Background/presence/outfit fold forward; expressions stay on the selected source/swipe; slots use the session layout. Editing/deleting/inserting/reordering/swiping/continuing an earlier source invalidates the reducer's affected suffix. A historical manual correction invalidates later valid choices atomically; refusal leaves the prior scene intact. Invalidated commands do not resurrect when returning to an earlier source or swipe. There is no automatic director or lower-authority producer; existing reducer tests retain automatic-versus-lock coverage.

## Temporary raster handling

Only MIME-matching PNG/JPEG/WebP signatures plus successful browser raster decoding are accepted. SVG/HTML, unsupported MIME, signature mismatch, failed decode, animated PNG/WebP and excessive dimensions refuse. Prototype ceilings are 5 MiB/file, 4096px maximum edge and 16 million pixels; these are bounded implementation choices, not an approved production-import policy. PNG chunk inspection rejects APNG; WebP animation flags are rejected. No filenames or model output become URLs or paths.

Blob URLs stay in the active in-memory media map or pending-decode set. Replacement, reset, disable, failed decoding and session/source invalidation revoke owned temporary URLs. A file read is checked before creating its URL; a completed decode checks fresh canonical source/epoch/selection plus scene owner/revision/catalog authority. Reset changes the transient owner even on the same source. A stale completion cannot apply its image or report old-session errors into a new reset session. Cancellation is not used as an authority defense.

No image bytes, labels, actor keys, scene commands or Blob URLs enter chat metadata, extension settings, localStorage, IndexedDB, the mutable host background endpoint, or another persistent store. Existing enable/disable preference persistence is unchanged. Fixture paths are internal constants; there are no model-selected or user-entered URLs.

## Original synthetic fixtures

[Generator](../tests/fixtures/m12-stage/generate_assets.py), [complete dimensions/formats/byte sizes/SHA-256/attribution manifest](../tests/fixtures/m12-stage/manifest.json). Generated using Python/Pillow 10.2.0 with fixed seed 24, geometric shapes, and no external images/fonts, APIs, keys or paid service. These are bundled test fixtures, separate from any future user-owned production library.

Two RGB PNG backgrounds are 1280×720. Eight RGBA PNG character/variation cutouts are 420×660. The deliberate oversize refusal raster is 4097×1. Exact hashes are listed below and in the manifest. The incompatible reference uses another explicitly created actor's outfit; the deliberate missing reference has no bytes or fabricated hash.

| Fixture | Dimensions / format | SHA-256 |
| --- | --- | --- |
| forest.png | 1280×720 PNG RGB | `5ec7d5cb2f89ee08e5493088ff85a71830078e4d95a0010cec1743294f8ef5a2` |
| mira-a-coat-joy.png | 420×660 PNG RGBA | `c216bde830b0ddf4631ee0b665161a08c50086ceb90a085a272968856216ff7c` |
| mira-a-coat.png | 420×660 PNG RGBA | `ef697948f70aacbe82c691c978678e03b5eb2b9b3e528ef553afe62786477542` |
| mira-a-joy.png | 420×660 PNG RGBA | `ebc67fb00f77658f0f3fff534659afaa569e34f87d663be4e255002b16e85ea6` |
| mira-a-stern.png | 420×660 PNG RGBA | `0e721dca1cb8314e16003b617406da3c6aab80a603c6706a1b7884857802faff` |
| mira-a.png | 420×660 PNG RGBA | `794277e5167e757658fe33b58e702e51d32668d427f86a5b1c67bfa5f1f5786f` |
| mira-b.png | 420×660 PNG RGBA | `f583c391c970a2c8fc4b20519cc17b05984ecfb65231d36d3ba87021f7366c3a` |
| oversized.png | 4097×1 PNG RGB | `6e1706f73a7c370ff5599ab589902dc503a21664248eb800d4e8f13dfbe3ea2e` |
| rowan.png | 420×660 PNG RGBA | `fa15ed5552e8a102cbb659fe4359f288f6cfcc667247d893b4725704d92b1b46` |
| sage.png | 420×660 PNG RGBA | `2ff97d72355e8c093e032d450746b4484212041ffee857359604fc080542ef88` |
| tavern.png | 1280×720 PNG RGB | `7b76e59e5e9c3927db0dec2e492c8cd1924ba5a61919c37ac4d880af1cebd448` |

## Verification and evidence

Runtime/host-tested and pushed code SHA: `1ae59b12c8d4abdbf72394186b10ad9163978e30`. The final evidence/README commit changes documentation only; runtime/test/fixture bytes match this tested SHA. [Machine-readable results and runtime/fixture hashes](evidence/m12-stage/results.json), [screenshot/result checksums](evidence/m12-stage/SHA256SUMS).

| Check | Result on final code |
| --- | --- |
| Node M0/M1.1/DYL-20/DYL-19 helper regressions | **61/61 PASS** |
| Actual-entry behavioral Chromium | **20/20 PASS** |
| Isolated pinned-host checks | **16/16 PASS**, including the explicitly instrumented render-failure check |
| Syntax checks (10 entry/runtime/probe modules), diff whitespace | **PASS** |
| Fixture regeneration, 11 dimensions/formats/SHA-256 records | **PASS**, regenerated bytes match committed fixtures |
| Screenshot/result checksums and runtime evidence hashes | **PASS** |
| Owner verdict / Gates A/B/C | **NOT_RUN** |

Host: SillyTavern **1.19.0**, `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Browser: headful Chromium **151.0.7922.34**, Ubuntu 24.04.5 LTS, Node **v26.8.1**. Host-native sends use the deterministic loopback OpenAI-compatible endpoint; no real inference/provider was tested. Desktop: 1440×1000. Narrow: 390×800. Keyboard-height approximation: 390×500, composer focused; dialogue remains 110.5px high and composer stays within the viewport. Actual 200% browser zoom was exercised through the task-owned Chrome zoom extension. No physical device or keyboard evidence is inferred.

The stage campaign creates a tavern with two visible Mira sprites and four manual logical actors, changes expressions/outfits, explicitly swaps slots, tests missing art, navigates and repeatedly returns to chat, and verifies chat-switch reset. The reused reader campaign verifies native send/stream/Stop/Continue, edit/swipe, long exact formatted copy, pinned reading, A → B → A, disable during generation, recovery and zoom. Opening controls now yields art space to readable dialogue; the desktop probe asserts more than 140px of dialogue with controls open. That layout change was checked on a new committed SHA with fresh full browser and host runs, not attributed to older screenshots.

Commands actually run from the dedicated worktree:

```sh
git fetch origin main
gh pr view 9 --json state,mergedAt,mergeCommit,url
gh pr view 10 --json state,mergedAt,mergeCommit,url
git worktree add -b codex/m12-d0-session-stage /home/dq/.codex/worktrees/m12-d0/SillyNovel origin/main
python3 tests/fixtures/m12-stage/generate_assets.py
node --test tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-scene-reducer.test.mjs tests/probes/dyl19/*.test.mjs
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl18 node --test tests/m1-reader-browser.test.mjs

git clone --shared /tmp/SillyTavern-dyl18 /tmp/SillyTavern-m12-stage
git -C /tmp/SillyTavern-m12-stage checkout 7e8663cd9c184a550b37238218bdd32c6efc68e9
ln -s /tmp/SillyTavern-dyl18/node_modules /tmp/SillyTavern-m12-stage/node_modules
mkdir -p /tmp/SillyTavern-m12-stage/public/scripts/extensions/third-party
ln -s /home/dq/.codex/worktrees/m12-d0/SillyNovel /tmp/SillyTavern-m12-stage/public/scripts/extensions/third-party/SillyNovel
SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node tests/probes/dyl18/reader-host.mjs /tmp/SillyTavern-m12-stage /tmp/sillynovel-m12-stage-final-host --stage
```

Additional checks actually run:

```sh
for runtime_path in index.js src/shell.mjs src/reader-source-model.mjs src/reader-view.mjs src/host-adapter.mjs src/scene-reducer.mjs src/stage-view.mjs src/transient-scene.mjs tests/probes/dyl18/reader-host.mjs tests/probes/m12-stage/stage-host.mjs; do node --check "$runtime_path" || exit; done
python3 tests/fixtures/m12-stage/generate_assets.py
git diff --exit-code -- tests/fixtures/m12-stage
git diff --check
```

Standard-library Python checks verified manifest dimensions/formats/hashes against Pillow-decoded files, all final evidence runtime hashes, completion and 16 PASS records, new-document relative links and Markdown fences. `sha256sum -c SHA256SUMS` was run inside `docs/evidence/m12-stage`.

The browser tests serve the actual entry, controller, reader, transient integration, reducer and host-installed formatter/sanitizer. Public-safe fixtures drive lifecycle events and real controls; those are **SYNTHETIC_BROWSER**, not host results. Existing M0/M1.1/DYL-20/DYL-19 helper regressions remain included. Coverage includes four actors/duplicate names, placement/refusal/swap/replace, locks/deliberate replacements, forward and message scopes, outfit/expression clear/change, swipe and historical invalidation, missing/incompatible art, alpha, native composer identity/draft, URL cleanup, failed/oversize/spoofed raster decoding, delayed work across switch/reset/manual override/unobserved source edit, reload, narrow/reduced-height layout and reader-failure recovery.

The opt-in `--stage` hook reuses the existing isolated host runner and adds native UI stage scenarios. It verifies the pinned host SHA and exact mounted worktree, requires committed runtime bytes, creates a fresh owned data root, starts its own loopback host/deterministic endpoint, and closes/removes its owned processes/profile/data even on failure. Fixed ports 8018/8128 require one runner at a time. No SillyNovel dependencies, CI jobs or build pipeline were added.

Development failures were kept as failures: the first browser run passed 17/19; its corrupt-image test had provided only a signature (correctly refused before URL creation), and its reload test had omitted re-enabling the fresh synthetic host. Corrected inputs/control flow passed. The first host run stopped on an ambiguous Background selector; the second passed the stage checks then stopped because the stage navigation test left the reader pinned while the old Stop check expected follow-latest. The corrected probe explicitly resumes latest. A successful earlier run on `d2b3f452bf859f2f03edf57e598522c917a82c87` was followed by screenshot review that found excessive art height while editing. The final layout correction received its own full run and fresh screenshots. These failed/earlier runs are not promoted to final-head evidence.

## Screenshots

All screenshots contain only invented cards, deterministic synthetic chat and generated fixtures.

| View | Evidence |
| --- | --- |
| Desktop tavern/two sprites | [Desktop](evidence/m12-stage/desktop-tavern.png) |
| Manual controls, reduced art/readable dialogue | [Controls](evidence/m12-stage/manual-controls.png) |
| Expression and alternate outfit | [Expression](evidence/m12-stage/expression-change.png), [Outfit](evidence/m12-stage/outfit-change.png) |
| Missing sprite | [Neutral fallback](evidence/m12-stage/missing-art-fallback.png) |
| Narrow stage and reduced height | [Narrow](evidence/m12-stage/narrow-stage.png), [Keyboard-height approximation](evidence/m12-stage/keyboard-viewport-simulation.png) |
| Long text, native handoff and recovery | [Long reply](evidence/m12-stage/long-scrollable-reply.png), [Native backlog](evidence/m12-stage/native-backlog.png), [Induced failure](evidence/m12-stage/render-failure-native-recovery.png) |
| Actual 200% zoom | [Zoom](evidence/m12-stage/browser-zoom-200-percent.png) |

## Limits and next bounded step

This is a usable unsaved test presentation, not the persistent M1/Gate A candidate. There is no saved scene recovery, asset library, export/import portability, multi-tab visual writer, backend, card binding, automatic focus/director, cloud/image service or owner verdict. Actor identities and all test-image choices are local to this active reader session. Other-actor/incompatible choices refuse without changing selected art.

**NOT_TESTED:** physical touch device, actual virtual keyboard/IME, other engines/themes/extension combinations/host versions, real model/provider behavior, native group conversation on this new candidate, natural host capability/mount/render failures, native deep-history pagination/verified original-revision correspondence, JPEG/static WebP/animated-format real-file variants, production import safety/storage/export/quota and whole-browser large-history memory on real chats. The synthetic 1,000-message prefix benchmark is measured separately below. Narrow/keyboard checks simulate viewport size only. The source adapter continues its honest unresolved exact-original correspondence notice. Existing reducer tests cover malformed input and automatic lock precedence without an automatic producer.

Recommend owner installation and a hands-on session trial of this open PR. Keep DYL-24 In Review, the PR OPEN/UNMERGED with auto-merge disabled, DYL-22/23 gated, and Gate A NOT_RUN. Storage architecture decisions remain a separate lane.
