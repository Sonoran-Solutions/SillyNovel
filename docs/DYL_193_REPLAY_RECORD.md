# DYL-193 replay record — Gate B candidate 6799a5e

**Candidate and unmerged. Replay step 3 of the [Gate B sequence](M2_4_EVIDENCE_UI_PLAN.md#61-sequence), [authorized by the owner](DECISIONS.md#owner-authorization--dyl-193-replay-on-gate-b-candidate-6799a5e--2026-11-02) on 2026-11-02.** This record reports; it fixes nothing. No runtime file changed. The desktop halves of the scaling and motion rows and the native group branch/copy row ran; every result from an emulated preference, zoom or accessibility tree is labelled SYNTHETIC and stands for no physical or assistive row. The tablet rows are NOT_TESTED for the reason stated below, and no screen reader was run. Gate B NOT_RUN; steps 4 to 6 are not started.

## Identity

| Item | Value |
| --- | --- |
| Candidate (runtime under test) | `6799a5e74427b7b8052c39bb64cbb2fe0c408413` |
| Starting main | `ecb7ecd8c9116d558171e75faa0b6628c0445ff1` (PR #69 merge); fast-forwarded to `b579eabdd39299e604ae5deb7ec99cba2fa7c6d1` once PR #70 merged |
| Starting check | `git diff --quiet 6799a5e HEAD -- src tests index.js style.css plugins` → exit 0 at `ecb7ecd` and again at `b579eab` |
| Probe head (tests added) | `133428768500373f36195928aff06a5bc9b21abb`: `tests/probes/dyl193/` only; `git diff --quiet 6799a5e 1334287 -- src index.js style.css plugins manifest.json` → exit 0 ([pins](evidence/dyl193/pins.json) `runtimeDiffFromCandidate`) |
| Host | SillyTavern 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`, disposable clone per row, loopback only |
| Tooling | Node v26.8.1, Playwright 1.62.1, headless Chromium 151.0.7922.34, Linux 7.0.0-38-generic x86_64, adb 1.0.41 (37.0.1) |
| Package | [`docs/evidence/dyl193/`](evidence/dyl193/), 2.3 MiB, 54 artifact hashes in [`artifacts.json`](evidence/dyl193/artifacts.json); SHA-256 of `artifacts.json`: `faa16e175fe759b9483af647cdbaa6ff52ec1ccb115e1ecce85ec766e3a89639` |

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
| `python3 tests/probes/dyl193/validate.py docs/evidence/dyl193` | — | PASS (after the redaction and manifest regeneration described below) |
| `python3 tests/probes/dyl60/check-discovery.py` | — | PASS 14/5/1 (unchanged: no new `.test.mjs` file) |

Before the campaign, each row ran singly under `timeout 600` while the probe blocks were corrected; those attempts are retained under [`development/`](evidence/dyl193/development/notes.json). Every failure there was a probe or fixture correction (a selector, a comparison that ignored host-added fields, a baseline taken before a debounced host write), none a candidate failure. No `failed-<sha>/` sibling exists because the supervised campaign passed first time.

After the campaign the package was edited by hand and the manifest regenerated: the device serial, mDNS address and the account holder's name were redacted from `adb-devices.txt`, `adb-mdns.txt`, `device.txt` and `device/facts-readonly.txt` (as Gate A omitted them); `device.txt` gained the observations below; `development/` was added. `artifacts.json` covers the edited files, and `validate.py` passes over them.

## Device status

The session's first discovery (`adb devices -l`, `adb mdns services`, at the start of the task) listed nothing. The campaign's discovery, minutes later, listed one authorized device over the established wireless-ADB setup. Read-only facts ([`device/facts-readonly.txt`](evidence/dyl193/device/facts-readonly.txt)): Samsung SM-X800 (Galaxy Tab S8+), Android 16, build `BP2A.250605.031.A3.X800XXSBEZH3`, security patch 2026-08-05, 1752×2800 physical, density 340, font scale 1.0, animator duration scale at its default, no accessibility service enabled, Samsung HoneyBoard, awake, keyguard not showing, not locked. No browser was running and no Chromium devtools socket existed; Brave 1.98.63 and Chrome 149.0.7827.197 are installed. The foreground window was `com.sonoransolutions.dungeondispatcher.issue258qa`, a Godot QA app that may be another session's test in progress.

Driving the tablet as at Gate A would have meant launching Brave (`adb shell am start` at a loopback URL through `adb reverse`), which pushes that app to the background. The coordinating session ruled that taking over a device in use is the owner's call and put the question to the owner; no answer had arrived when this package was frozen. Nothing was launched, paired, unlocked, installed or changed. The device half is therefore **NOT_TESTED with the device attached**, not BLOCKED. The prepared probe, [`tests/probes/dyl193/device.mjs`](../tests/probes/dyl193/device.mjs), is committed NOT_RUN; it serves the candidate from a disposable pinned host over `adb reverse tcp:8760`, drives the browser through its own debugging socket with synthesized touch, reads device facts read-only, and removes only the test download it hash-verified. Two of its rows are known in advance to end NOT_TESTED on this device: the host's viewport meta carries `user-scalable=no, maximum-scale=1.0`, so a real pinch cannot reach 200 % (Gate A saw scale 1.0), and browser page zoom, text scaling, Remove animations and TalkBack are settings the probe never changes.

## Surfaces

| # | Surface | Desktop | Tablet | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Increased text scaling and 200 % zoom: reader readable, controls reachable, reply field reachable with “Why this visual?” open, no clipped dialogs | **SYNTHETIC PASS** on five variants: baseline 1440×1100; 200 % browser zoom emulated as a 720×550 viewport at DPR 2 (what a 1440×1100 window shows at 200 %, media queries included); DPR 2 with root CSS `zoom: 2`; root font size 200 % (32 px); host font scale 2 (dialogue 31.5 px). In every variant: dialogue visible and fitting horizontally; Previous/Next/Backlog/Jump to Latest/Copy message and all 45–46 visible controls inside the viewport and hit-testable, none under 44 px; the disclosure open inside the stage; the reply field inside the viewport, hit-testable and focusable with the disclosure open; the cleanup review row and its 44×44 checkbox unclipped; no stage element outside the art box clips its content | **NOT_TESTED** (device attached; browser not launched; font scale 1.0 and page zoom are settings the probe never changes) | [scaling/evidence.json](evidence/dyl193/scaling/evidence.json), 10 stage crops |
| 2 | Reduced motion as a system and as a browser preference: stage animations and transitions off, nothing else changes | **SYNTHETIC PASS**: with the media feature emulated (`reducedMotion: 'reduce'`, the same `prefers-reduced-motion` path an OS setting or a browser flag reaches), none of the 207 stage elements keeps a named animation or a non-zero transition; without it, 31 host `menu_button` elements inside the stage carry the host's own `all 0.25s` transition and nothing else moves; text, element structure and the geometry of the dialogue, controls, disclosure, art and composer are identical under both. `style.css` declares no animation or transition of its own; its only two such declarations are the `prefers-reduced-motion` guard at line 94 | **NOT_TESTED** (animator duration scale at default; Remove animations is a setting) | [motion/evidence.json](evidence/dyl193/motion/evidence.json), 2 crops |
| 3 | Assistive technology: a screen-reader pass over the reader, the controls and the dialogs | **NOT_TESTED**: no screen reader was run. A separate **SYNTHETIC** row (not a substitute): ARIA snapshots of the stage with the controls closed and with controls, disclosure and cleanup list open; every visible interactive element has an accessible name; 10 `role="status"` regions; five headings; no live region inside the disclosure (T60); 51 Tab stops from the controls summary to the reply field, 48 inside the stage; Escape closes the disclosure and refocuses its summary | **NOT_TESTED** (no accessibility service enabled; TalkBack is a setting) | [assistive/evidence.json](evidence/dyl193/assistive/evidence.json), 1 crop |
| 4 | Tablet touch through the file picker, portable bundle import and export, and asset cleanup | not a desktop surface (desktop coverage of these flows is the existing project-portability and cleanup campaigns, cited by SHA in earlier records) | **NOT_TESTED** (device attached; browser not launched) | [device.txt](evidence/dyl193/device.txt) |
| 5 | Native group branch and copy with an attached project | **TESTED PASS on the pinned host** (real host flow, not synthetic): six-message four-card group with two Miras, a four-actor project attached (three slots, one offstage), a temporary expression applied. **Create branch** at message 2 through the host's own message control: the host opened the branch as a new group chat of 3 messages, the project detached, no sprites, no temporary expression; explicit reopen restored the saved global layout only; the branch holds the parent's text, author flags and cards for messages 1–3. Return to the parent through the host's chat list: detached, reopened explicitly, expression re-applied. **Create checkpoint** (the host's copy) at message 3 through the message control and the host's own name popup: no chat switch, so the attachment and the applied expression stayed; the copy holds messages 1–4. **Open checkpoint chat** through the flag: detached, no sprites, no temporary expression; reopen restored the saved layout only. Parent again: never reattached. The saved project is byte-equal before and after every step, revision 1 | not a tablet surface | [groups/evidence.json](evidence/dyl193/groups/evidence.json), 4 crops |

Row 5, native bytes: across the three steps the only files that changed were the host's own new chat files and its group record: `group chats/<parent> - Branch #1.jsonl` (new), `group chats/Council checkpoint.jsonl` (new), `group chats/<parent>.jsonl` (the host writes `extra.bookmark_link` onto message 3 when a checkpoint is created; the parent was byte-identical after the branch) and `groups/<id>.json` (the host appends each new chat to `chats` and moves `chat_id`). Every other native file (cards, individual chats, worlds, avatars, presets, `settings.json`) was byte-identical, and no changed file contains an extension marker. No canonical write by the extension.

## Defects

None found. The candidate produced no failing reproduction on any surface reached, so no row was stopped and no runtime change is proposed.

## Observations that are not defects

- Under root CSS `zoom: 2` the document scrolls horizontally because the host's `div#expression-wrapper` (sized in viewport units) does not follow a root zoom; no stage element overflows. The faithful emulation of 200 % browser zoom (halved viewport at DPR 2) shows no horizontal scroll. Recorded as an emulation artefact of the prescribed CSS-zoom variant.
- At root font size 200 %, after Playwright's minimal `scrollIntoViewIfNeeded`, the cleanup checkbox's centre sat under the controls panel's sticky summary (“Manual scene controls”, `style.css` line 122). A centred scroll, which is what a person does, exposed it; the first measurement is kept in the evidence (`cleanup[].afterMinimalScroll`). Worth the owner's eye on the tablet: keyboard focus that lands a row under the sticky summary would need one more scroll.
- The 31 moving elements without the preference are the host's `menu_button` transitions inherited by the extension's buttons; the extension declares no motion of its own.
- The host's branch snapshot adds `swipe_id`, `swipes` and `swipe_info` to each copied message; the probe compares text, author flags and card only.
- Chrome 149 is on the tablet beside Brave; Gate A drove Brave (then Chromium 155). The prepared probe launches Brave to match Gate A.

## What `validate.py` covers and does not

[`tests/probes/dyl193/validate.py`](../tests/probes/dyl193/validate.py) checks the pins (Node, Chromium, host SHA and version), that the runtime files at the probe head hash-equal the candidate's, that the recorded inputs still match the repository, that each of the four rows exited 0 with a PASS evidence record on the probe head, the checkpoint counts, that the synthetic flag is set on exactly the three emulated rows, PNG headers and the artifact manifest. It does **not** validate the dyl60 campaign layout (that is [`tests/probes/dyl60/validate.py`](../tests/probes/dyl60/validate.py), which expects ten campaign runs and does not apply to this package), does not judge a screenshot, cannot turn a SYNTHETIC row into a physical or assistive one, and knows nothing about the device beyond the presence of `device.txt`.

## Proposed amendments to the TESTING matrix (text only; rows change at merge)

| Row | Proposed addition to the required-outcome cell |
| --- | --- |
| T12 Reload and branch a chat | “Native group branch and checkpoint through the host's own controls on `1334287` (runtime `6799a5e`): detach, no temporary state, explicit reopen restores the saved layout, parent never reattached, native bytes unchanged apart from the host's own chat files and group record ([DYL-193 record](DYL_193_REPLAY_RECORD.md))” |
| T28 Reduced motion, zoom, touch keyboard | “Desktop SYNTHETIC on `1334287` (runtime `6799a5e`): 200 % zoom (halved viewport at DPR 2), root font 200 %, host font scale 2 and emulated reduced motion keep the reader, controls, disclosure, cleanup list and reply field reachable and unclipped; tablet scaling, zoom, reduced motion and touch keyboard NOT_TESTED (device attached, browser not launched; DYL-193)” |
| T52 (tablet note) | “tablet NOT_TESTED” stays; add “DYL-193 replay 2026-11-02: device attached, browser not launched” |
| T61 Evidence UI on the stage | “reply field's reach with the disclosure open covered on desktop at 200 % zoom, root font 200 % and host font scale 2 (SYNTHETIC, `1334287`); physical device NOT_TESTED (DYL-193 replay: device attached, browser not launched)” |

No row is amended by this record; the [Gate B record](evidence/gate-b/record.md) carries only the DYL-193 half, and “accepted by the owner” stays NOT_RUN.

## What remains for the owner's own hands

- Say whether the tablet may be taken over (Brave launched while the Godot QA app is in the foreground). On a go, `node tests/probes/dyl193/device.mjs $SILLYTAVERN_ROOT` runs the touch rows and records `device/facts.json`; its 200 % and scaling rows will still end NOT_TESTED unless the owner first sets, by hand, Android font size or Chrome's accessibility text scaling and “Force enable zoom” (or Chrome page zoom), and its reduced-motion row unless Settings → Accessibility → Vision → Remove animations is on.
- A real screen-reader pass: TalkBack on the tablet (Settings → Accessibility → TalkBack) over the reader, the controls and the dialogs with the candidate served the same way; on desktop, Orca on this Linux host or NVDA on Windows over the same page. Only the owner's run counts; the synthetic row above does not.
- Rotation to portrait, as at Gate A, is the operator's.
