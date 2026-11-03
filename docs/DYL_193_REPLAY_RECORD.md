# DYL-193 replay record — Gate B candidate 6799a5e

**Candidate and unmerged. Replay step 3 of the [Gate B sequence](M2_4_EVIDENCE_UI_PLAN.md#61-sequence), [authorized by the owner](DECISIONS.md#owner-authorization--dyl-193-replay-on-gate-b-candidate-6799a5e--2026-11-02) on 2026-11-02.** This record reports; it fixes nothing. No runtime file changed. The desktop halves of the scaling and motion rows and the native group branch/copy row ran; every result from an emulated preference, zoom or accessibility tree is labelled SYNTHETIC and stands for no physical or assistive row. The tablet was driven as at Gate A on the owner's word; its rows are TESTED, PASS bounded or NOT_TESTED exactly as the table says, and no screen reader was run. Gate B NOT_RUN; steps 4 to 6 are not started.

## Identity

| Item | Value |
| --- | --- |
| Candidate (runtime under test) | `6799a5e74427b7b8052c39bb64cbb2fe0c408413` |
| Starting main | `ecb7ecd8c9116d558171e75faa0b6628c0445ff1` (PR #69 merge); fast-forwarded to `b579eabdd39299e604ae5deb7ec99cba2fa7c6d1` once PR #70 merged |
| Starting check | `git diff --quiet 6799a5e HEAD -- src tests index.js style.css plugins` → exit 0 at `ecb7ecd` and again at `b579eab` |
| Probe head (tests added) | `133428768500373f36195928aff06a5bc9b21abb`: `tests/probes/dyl193/` only; `git diff --quiet 6799a5e 1334287 -- src index.js style.css plugins manifest.json` → exit 0 ([pins](evidence/dyl193/pins.json) `runtimeDiffFromCandidate`) |
| Host | SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`, disposable clone per row, loopback only |
| Tooling | Node v26.8.1, Playwright 1.62.1, headless Chromium 151.0.7922.34, Linux 7.0.0-38-generic x86_64, adb 1.0.41 (37.0.1) |
| Package | [`docs/evidence/dyl193/`](evidence/dyl193/), 4.0 MiB, 79 artifact hashes in [`artifacts.json`](evidence/dyl193/artifacts.json); SHA-256 of `artifacts.json`: `c04cbecb81b4b94b94cca8e3b600be7cc848ce9e2d71cdede3c2ebee19c236a8` |

## Commands actually run

All from the repository root on probe head `1334287`, with `SILLYTAVERN_ROOT` set to a pinned checkout at `7e8663cd…` and `SN_PLAYWRIGHT_MODULE` to Playwright 1.62.1. One host job at a time; test user data in a fresh `mkdtemp` root per row; the loopback director endpoint on 127.0.0.1:8128 only; no real provider, no credentials.

| Command | Deadline | Result |
| --- | --- | --- |
| `python3 tests/probes/dyl193/run.py docs/evidence/dyl193 6799a5e74427b7b8052c39bb64cbb2fe0c408413` | 45 min outer; 120 s per discovery command, 600 s per row; retained output 1 MiB head + 4 MiB tail per job | exit 0: `PASS replay rows … device ATTACHED` ([runs](evidence/dyl193/runs.json)) |
| ↳ `adb devices -l`, `adb mdns services` | 120 s | exit 0, one device listed; serial and address redacted in the package |
| ↳ `node tests/probes/dyl193/host.mjs $SILLYTAVERN_ROOT scaling` | 600 s | exit 0 in 52.9 s, 1 checkpoint, 5 variants, 10 screenshots |
| ↳ `… motion` | 600 s | exit 0 in 37.9 s, 1 checkpoint |
| ↳ `… assistive` | 600 s | exit 0 in 34.4 s, 1 checkpoint |
| ↳ `… groups` | 600 s | exit 0 in 43.8 s, 2 checkpoints |
| `node tests/probes/dyl193/device.mjs $SILLYTAVERN_ROOT` (device probe, SHA-256 `5d8301a273a87e54…`), four attempts under `timeout 600` on head `8f784f0` with the working-tree probe later committed unchanged | 600 s each | run 1 exit 1 (probe bug: no pinch-back), runs 2 and 3 exit 0 with the pinch at 1.0, **run 4 exit 0 retained**: 11 rows, see Device status ([device/evidence.json](evidence/dyl193/device/evidence.json), [attempts](evidence/dyl193/device/attempts/notes.json)) |
| `python3 tests/probes/dyl193/validate.py docs/evidence/dyl193` | — | PASS (after the redaction and manifest regeneration described below) |
| `python3 tests/probes/dyl60/check-discovery.py` | — | PASS 14/5/1 (unchanged: no new `.test.mjs` file) |

Before the campaign, each row ran singly under `timeout 600` while the probe blocks were corrected; those attempts are retained under [`development/`](evidence/dyl193/development/notes.json). Every failure there was a probe or fixture correction (a selector, a comparison that ignored host-added fields, a baseline taken before a debounced host write), none a candidate failure. No `failed-<sha>/` sibling exists because the supervised campaign passed first time.

After the campaign the package was edited by hand and the manifest regenerated: the device serial, mDNS address and the account holder's name were redacted from `adb-devices.txt`, `adb-mdns.txt`, `device.txt` and `device/facts-readonly.txt` (as Gate A omitted them); `device.txt` gained the observations below; `development/` was added. `artifacts.json` covers the edited files, and `validate.py` passes over them.

## Device status

The session's first discovery (`adb devices -l`, `adb mdns services`, at the start of the task) listed nothing. The campaign's discovery, minutes later, listed one authorized device over the established wireless-ADB setup. Read-only facts ([`device/facts-readonly.txt`](evidence/dyl193/device/facts-readonly.txt), [`device/facts.json`](evidence/dyl193/device/facts.json)): Samsung SM-X800 (Galaxy Tab S8+), Android 16, build `BP2A.250605.031.A3.X800XXSBEZH3`, security patch 2026-08-05, 1752×2800 physical, density 340, font scale 1.0, animator duration scale at its default, no accessibility service enabled, Samsung HoneyBoard, awake, keyguard not showing, not locked. No browser was running and no Chromium devtools socket existed; the foreground window was `com.sonoransolutions.dungeondispatcher.issue258qa`, a Godot QA app.

Launching Brave to drive the tablet pushes that app to the background, so the coordinating session put it to the owner. **The owner answered “Yes, launch it”** (relayed by the coordinating session on 2026-11-02), with no pairing, unlocking, settings change, install or account action and nothing else launched; this session's own permission prompt for the launch was then allowed by its user. The exact adb commands are in [`device.txt`](evidence/dyl193/device.txt): `adb reverse tcp:8760 tcp:<host port>` to a disposable pinned host on the computer's loopback (the director endpoint on 8128 never leaves the computer), `adb shell am start -a android.intent.action.VIEW -d http://127.0.0.1:8760/ com.brave.browser`, `adb forward tcp:9229 localabstract:chrome_devtools_remote` for Playwright `connectOverCDP`, `adb shell input keyevent 4` to dismiss each system picker and the keyboard, read-only `ls` of Downloads, and the removal of both mappings afterwards (verified empty). Touch was synthesized through the browser's own debugging socket (`Input.dispatchTouchEvent`, `Input.synthesizePinchGesture`), as at Gate A. Setup aids, not touch proof: the two `<select>` choices, the composer text, the files supplied to the two file inputs after each picker had been opened by touch and dismissed, and the programmatic acceptance of the browser's `confirm()` dialog. Brave 1.98.63 (Chromium 156.0.8078.80), the existing desktop-site user agent, landscape 1317×650 CSS px at DPR 2.125; the synthetic tab was closed; Brave stays in the foreground and the Godot app was not restored. Nothing on the device was paired, unlocked, installed, configured or deleted (the export tap left no file to remove).

Four runs: run 1 reached a real pinch of 2.0 but the probe did not pinch back before its next touch (probe bug, exit 1); runs 2 and 3 passed their flow but the pinch stayed at 1.0 in a tab created over CDP; run 4, with the tab opened through Brave's own VIEW intent as in run 1, is the retained result. Runs 1 to 3 are kept under [`device/attempts/`](evidence/dyl193/device/attempts/notes.json); none is a candidate failure.

**Run 4, on the device (stage crops under [`device/`](evidence/dyl193/device/)):**

| Device row | Result | Measured |
| --- | --- | --- |
| Reply field reachable with “Why this visual?” open, scale 1.0 | **TESTED PASS** | composer `[406,612,539,37]` inside the 1318×650 visual viewport, hit-testable; disclosure open at `[342,296,622,165]` |
| Samsung keyboard open on the composer | **TESTED PASS** | visual viewport 316 px high; composer bottom 316; the stage dropped its art under the `max-height: 620px` rule and the dialogue, disclosure and composer stayed visible (the DYL-60 keyboard check, on this candidate) |
| 200 % by a real pinch | **TESTED PASS, bounded** | scale 1.9999981; the dialogue, the disclosure summary and body, the reply field and the navigation each panned into the 659×325 visual viewport and hit-testable; scale restored to 1.0. The controls panel and the cleanup list were not audited at 2.0. The host's viewport meta says `user-scalable=no`; Brave in desktop-site mode pinched anyway |
| Increased text scaling | NOT_TESTED | `font_scale` 1.0 unchanged; Android font size and browser text scaling are settings |
| Reduced motion | NOT_TESTED | animator duration scale at default, `prefers-reduced-motion` false; Remove animations is a setting |
| Screen reader | NOT_TESTED | no accessibility service enabled; TalkBack is a setting |
| Touch: file picker | **TESTED PASS** | the PNG input opened the Android photo picker, the bundle input opened the documents picker; each dismissed with Back and focus returned to Brave |
| Touch: export | **PASS bounded** | the page's own export request returned 200 with bytes identical to the served bundle; Brave's save step left no file in `/sdcard/Download` and no download window was listed |
| Touch: import | **PASS bounded** | picker opened by touch; the bundle supplied programmatically was accepted (“Imported … Not attached to this conversation”) |
| Touch: cleanup | **TESTED PASS** | Review unused artwork, the 44 px checkbox and Remove selected unused artwork by touch; the confirm dialog accepted programmatically; “Cleanup completed”; saved scene unchanged |
| Portrait | NOT_TESTED | no rotation; the operator's, as at Gate A |

## Surfaces

| # | Surface | Desktop | Tablet | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Increased text scaling and 200 % zoom: reader readable, controls reachable, reply field reachable with “Why this visual?” open, no clipped dialogs | **SYNTHETIC PASS** on five variants: baseline 1440×1100; 200 % browser zoom emulated as a 720×550 viewport at DPR 2 (what a 1440×1100 window shows at 200 %, media queries included); DPR 2 with root CSS `zoom: 2`; root font size 200 % (32 px); host font scale 2 (dialogue 31.5 px). In every variant: dialogue visible and fitting horizontally; Previous/Next/Backlog/Jump to Latest/Copy message and all 45–46 visible controls inside the viewport and hit-testable, none under 44 px; the disclosure open inside the stage; the reply field inside the viewport, hit-testable and focusable with the disclosure open; the cleanup review row and its 44×44 checkbox unclipped; no stage element outside the art box clips its content | 200 % by real pinch **TESTED PASS bounded** (reader, disclosure, reply field and navigation reachable by panning; controls and cleanup list not audited at 2.0); reply field with the disclosure open and with the keyboard open **TESTED PASS** at scale 1.0; increased text scaling **NOT_TESTED** (setting) | [scaling/evidence.json](evidence/dyl193/scaling/evidence.json), 10 stage crops |
| 2 | Reduced motion as a system and as a browser preference: stage animations and transitions off, nothing else changes | **SYNTHETIC PASS**: with the media feature emulated (`reducedMotion: 'reduce'`, the same `prefers-reduced-motion` path an OS setting or a browser flag reaches), none of the 207 stage elements keeps a named animation or a non-zero transition; without it, 31 host `menu_button` elements inside the stage carry the host's own `all 0.25s` transition and nothing else moves; text, element structure and the geometry of the dialogue, controls, disclosure, art and composer are identical under both. `style.css` declares no animation or transition of its own; its only two such declarations are the `prefers-reduced-motion` guard at line 94 | **NOT_TESTED** (animator duration scale at default; Remove animations is a setting; `prefers-reduced-motion` false on the device page) | [motion/evidence.json](evidence/dyl193/motion/evidence.json), 2 crops |
| 3 | Assistive technology: a screen-reader pass over the reader, the controls and the dialogs | **NOT_TESTED**: no screen reader was run. A separate **SYNTHETIC** row (not a substitute): ARIA snapshots of the stage with the controls closed and with controls, disclosure and cleanup list open; every visible interactive element has an accessible name; 10 `role="status"` regions; five headings; no live region inside the disclosure (T60); 51 Tab stops from the controls summary to the reply field, 48 inside the stage; Escape closes the disclosure and refocuses its summary | **NOT_TESTED** (no accessibility service enabled; TalkBack is a setting; no screen reader run) | [assistive/evidence.json](evidence/dyl193/assistive/evidence.json), 1 crop |
| 4 | Tablet touch through the file picker, portable bundle import and export, and asset cleanup | not a desktop surface (desktop coverage of these flows is the existing project-portability and cleanup campaigns, cited by SHA in earlier records) | File picker **TESTED PASS** (photo picker and documents picker opened by touch, dismissed with Back); cleanup **TESTED PASS** by touch (confirm accepted programmatically); export **PASS bounded** (request and bytes observed from the page; Brave's save step left no file); import **PASS bounded** (picker by touch; file supplied programmatically) | [device/evidence.json](evidence/dyl193/device/evidence.json), [device.txt](evidence/dyl193/device.txt) |
| 5 | Native group branch and copy with an attached project | **TESTED PASS on the pinned host** (real host flow, not synthetic): six-message four-card group with two Miras, a four-actor project attached (three slots, one offstage), a temporary expression applied. **Create branch** at message 2 through the host's own message control: the host opened the branch as a new group chat of 3 messages, the project detached, no sprites, no temporary expression; explicit reopen restored the saved global layout only; the branch holds the parent's text, author flags and cards for messages 1–3. Return to the parent through the host's chat list: detached, reopened explicitly, expression re-applied. **Create checkpoint** (the host's copy) at message 3 through the message control and the host's own name popup: no chat switch, so the attachment and the applied expression stayed; the copy holds messages 1–4. **Open checkpoint chat** through the flag: detached, no sprites, no temporary expression; reopen restored the saved layout only. Parent again: never reattached. The saved project is byte-equal before and after every step, revision 1 | not a tablet surface | [groups/evidence.json](evidence/dyl193/groups/evidence.json), 4 crops |

Row 5, native bytes: across the three steps the only files that changed were the host's own new chat files and its group record: `group chats/<parent> - Branch #1.jsonl` (new), `group chats/Council checkpoint.jsonl` (new), `group chats/<parent>.jsonl` (the host writes `extra.bookmark_link` onto message 3 when a checkpoint is created; the parent was byte-identical after the branch) and `groups/<id>.json` (the host appends each new chat to `chats` and moves `chat_id`). Every other native file (cards, individual chats, worlds, avatars, presets, `settings.json`) was byte-identical, and no changed file contains an extension marker. No canonical write by the extension.

## Defects

None found. The candidate produced no failing reproduction on any surface reached, so no row was stopped and no runtime change is proposed.

## Observations that are not defects

- Under root CSS `zoom: 2` the document scrolls horizontally because the host's `div#expression-wrapper` (sized in viewport units) does not follow a root zoom; no stage element overflows. The faithful emulation of 200 % browser zoom (halved viewport at DPR 2) shows no horizontal scroll. Recorded as an emulation artefact of the prescribed CSS-zoom variant.
- At root font size 200 %, after Playwright's minimal `scrollIntoViewIfNeeded`, the cleanup checkbox's centre sat under the controls panel's sticky summary (“Manual scene controls”, `style.css` line 122). A centred scroll, which is what a person does, exposed it; the first measurement is kept in the evidence (`cleanup[].afterMinimalScroll`). Worth the owner's eye on the tablet: keyboard focus that lands a row under the sticky summary would need one more scroll.
- The 31 moving elements without the preference are the host's `menu_button` transitions inherited by the extension's buttons; the extension declares no motion of its own.
- The host's branch snapshot adds `swipe_id`, `swipes` and `swipe_info` to each copied message; the probe compares text, author flags and card only.
- Chrome 149 is on the tablet beside Brave; Gate A drove Brave (then Chromium 155), and this replay drove Brave 1.98.63 (Chromium 156) to match.
- A synthesized pinch took effect only in a tab opened through Brave's VIEW intent (runs 1 and 4), not in a tab created over CDP (runs 2 and 3). Recorded as a probe method fact, not a candidate behaviour.
- Brave's save step for the export download left no file in Downloads within the observation window and listed no download window; the page's own request and bytes were correct. Whether Brave prompts, blocks the unknown type or saves elsewhere was not determined and is outside the page.
- The read-only media-store query in the probe had a wrong projection syntax and returned adb's usage text; it is retained as is and proves nothing.

## What `validate.py` covers and does not

[`tests/probes/dyl193/validate.py`](../tests/probes/dyl193/validate.py) checks the pins (Node, Chromium, host SHA and version), that the runtime files at the probe head hash-equal the candidate's, that the recorded inputs still match the repository, that each of the four rows exited 0 with a PASS evidence record on the probe head, the checkpoint counts, that the synthetic flag is set on exactly the three emulated rows, PNG headers and the artifact manifest. It does **not** validate the dyl60 campaign layout (that is [`tests/probes/dyl60/validate.py`](../tests/probes/dyl60/validate.py), which expects ten campaign runs and does not apply to this package), does not judge a screenshot, cannot turn a SYNTHETIC row into a physical or assistive one, and knows nothing about the device beyond the presence of `device.txt`.

## Proposed amendments to the TESTING matrix (text only; rows change at merge)

| Row | Proposed addition to the required-outcome cell |
| --- | --- |
| T12 Reload and branch a chat | “Native group branch and checkpoint through the host's own controls on `1334287` (runtime `6799a5e`): detach, no temporary state, explicit reopen restores the saved layout, parent never reattached, native bytes unchanged apart from the host's own chat files and group record ([DYL-193 record](DYL_193_REPLAY_RECORD.md))” |
| T28 Reduced motion, zoom, touch keyboard | “Desktop SYNTHETIC on `1334287` (runtime `6799a5e`): 200 % zoom (halved viewport at DPR 2), root font 200 %, host font scale 2 and emulated reduced motion keep the reader, controls, disclosure, cleanup list and reply field reachable and unclipped; on the Galaxy Tab S8+ (`8f784f0`, runtime `6799a5e`): real pinch to 2.0 with reader, disclosure, reply field and navigation reachable by panning, composer inside the visual viewport with the Samsung keyboard open; tablet text scaling and reduced motion NOT_TESTED (settings unchanged; DYL-193)” |
| T52 (tablet note) | “tablet NOT_TESTED” stays for the composer-hold behaviour itself; add “DYL-193 replay 2026-11-02: tablet touch on the composer and keyboard covered, the hold itself not exercised on the tablet” |
| T61 Evidence UI on the stage | “reply field's reach with the disclosure open covered on desktop at 200 % zoom, root font 200 % and host font scale 2 (SYNTHETIC, `1334287`); reply field reachable with the disclosure open on the Galaxy Tab S8+ at scale 1.0, with the keyboard open and at a real pinch of 2.0 (DYL-193 replay, `8f784f0`)” |

No row is amended by this record; the [Gate B record](evidence/gate-b/record.md) carries only the DYL-193 half, and “accepted by the owner” stays NOT_RUN.

## What remains for the owner's own hands

- Increased text scaling and the browser's own zoom on the tablet: set Android font size or Chrome's accessibility text scaling and “Force enable zoom” (or page zoom) by hand, then rerun `node tests/probes/dyl193/device.mjs $SILLYTAVERN_ROOT` or read the page; the probe changes no setting.
- Reduced motion on the tablet: Settings → Accessibility → Vision → Remove animations, then the same rerun shows `prefers-reduced-motion` on the device page.
- A real screen-reader pass: TalkBack on the tablet over the reader, the controls and the dialogs with the candidate served the same way; on desktop, Orca on this Linux host or NVDA on Windows. Only the owner's run counts; the synthetic row does not.
- Rotation to portrait, as at Gate A.
- Brave's handling of the exported bundle download (prompt, block or save location) and a real picker selection for import, which no page-driven probe can perform.
- Brave was left in the foreground on the tablet; the Godot QA app that was in front was not restored.
