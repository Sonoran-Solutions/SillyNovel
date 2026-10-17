# DYL-60 keyboard visibility and runner review correction

The owner requested correction of DYL60-DEVICE-01 and the senior review's P3 discovery finding, followed by actual tablet checks. Starting checkout: `4172a977e55608c906be32115bb0a6f0b55e910c`, clean, on `codex/dyl60-candidate-preparation`; existing draft PR #34 remains open/unmerged with auto-merge disabled. The supplied senior review approves the earlier desktop technical checkpoint at `5c27ea699833803fc3e2f670b74584f9ae019188` / frozen `6f8252699dae3a92f639f94531bba221d5e1cc02`; it does not certify the later device results or this correction. No owner Gate A session is authorized or executed.

The pinned host already declares `interactive-widget=resizes-content`, yet the tablet's existing Brave desktop-site mode leaves `100dvh` and the layout viewport taller than the visible area when Samsung IME opens. The shared reader mount now caps the original `#sheld` at the observed visual viewport bottom, minus the shell's actual top, on viewport resize/pan. This also covers Back to Chat while the extension remains active. It leaves the composer node, draft/caret, native handlers, meta viewport and settings intact. At pinch scale other than 1 the cap is inactive; absent VisualViewport keeps the existing fallback. Disable/failure removes the class/property/listeners. Short reader content scrolls and the manual-controls heading does not collapse into later content. Other host themes/movable layouts/browser engines remain unverified.

This uses the existing [VisualViewport geometry](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) rather than changing the host's [keyboard viewport policy](https://developer.chrome.com/blog/viewport-resize-behavior/). The actual-entry regression exercises resize, pan, short controls, native reader handoff, original draft/selection, zoom, absent API and disable cleanup. The Android IME remains a separate real-device check.

P3: the runner resolves every test file from its absolute repository root, checks the exact discovered filenames (8 Node suite files including two DYL-19 probes, five storage suites, one browser suite), refuses missing/empty/unexpected discovery and records `discovery.json`. `python3 tests/probes/dyl60/run.py --list-tests` requires no campaign environment. `python3 tests/probes/dyl60/check-discovery.py` compares repository/foreign working directories and exercises unexpected, empty and missing files in a disposable copy. Test-case totals remain the actual Node output, not discovery-file counts. Update the expected filename set deliberately when adding/removing a suite.

The final frozen SHA, completed fresh campaign, actual tablet evidence, cleanup and remaining readiness limits are recorded below. Earlier evidence and the original device defect remain historical, not replaced by new counts. DYL-60 stays In Review and Gate A NOT_RUN.

## Frozen candidate and physical rerun

**Frozen candidate: `c5c1699a48629ae761a093e13056f0b11fdc4b88` (110 input hashes).** [Physical results, probe limitations and cleanup](evidence/dyl60/keyboard/device/evidence.json) · [exact actions](evidence/dyl60/keyboard/device/actions.jsonl) · [runtime/tool facts](evidence/dyl60/keyboard/device/final-facts.json). Fresh synthetic data copied from the earlier prepared root into `/tmp/sn-dyl60-keyboard-final-kl_l0aog`; original evidence roots remain intact. Device serial/address omitted. The UI uses the current frozen repository; unchanged storage plugin/pinned host use the existing disposable host clone.

**DYL60-DEVICE-01: PASS on the tested configuration.** Samsung SM-X800 / Galaxy Tab S8+, Android 16 build `BP2A.250605.031.A3.X800XXSBEZH3`, Brave 1.97.57 / engine 155.0.8059.80, Samsung HoneyBoard 5.9.20.90 English US; existing desktop-site mode, density 340, DPR 2.125, fontScale 1 and reduced-motion false unchanged. Actual layout viewports 1317×650 landscape and 824×1143 portrait. The owner rotated the device; all captures contain synthetic app content and omit unrelated browser chrome.

| Actual keyboard scenario | Visible viewport bottom | Composer bottom | Native Send bottom | Outcome |
| --- | --- | --- | --- | --- |
| Landscape |316.24px|315.29px|314.29px|Both hit targets unobstructed; original composer|
| Portrait |769.88px|768.94px|766.94px|Both hit targets unobstructed; original composer|

[Landscape IME](evidence/dyl60/keyboard/device/final-landscape-ime.png) · [portrait IME](evidence/dyl60/keyboard/device/final-portrait-ime.png). Both orientations preserve exact draft/caret through Previous, Backlog and Return to Reader with the keyboard open; native Back to Chat stays within the same visible boundary. Portrait uses actual Samsung A-key input, `Lantern IME drafta`, selection 17/17; landscape `Landscape IME draft`, selection 18/18. Canonical chat/cards/metadata are identical across the portrait viewport/navigation phase.

Native Send/Stop run with the actual keyboard open in both orientations, and Stop's hit target stays above it during streaming; portrait Continue appends the deterministic response without adding a new native message. Provider 8128 remains host-loopback only; host 8762 is reached through owned device reverse 8762. No real model. [Portrait generation](evidence/dyl60/keyboard/device/final-portrait-generation.json), [landscape generation](evidence/dyl60/keyboard/device/final-landscape-generation.json).

The complete field-note reply is reached by 28 Previous touch actions and 3 touch scroll gestures; the end marker is visible and scroll reaches the bottom. The keyboard dismissed during this reading interaction (final visual viewport 1143.53px), so that long-scroll capture does not claim keyboard-open reading throughout. [Long reply](evidence/dyl60/keyboard/device/final-long-scroll.png). Touch Save advances the layout 4→5; reload detaches; deliberate native chat selection and explicit reopen restore 5. [Reopen record](evidence/dyl60/keyboard/device/final-reopen.json).

Actual six-message Lantern council group: four card members/two Miras, four independent manual UUID actors, three slots and Sage offstage. Touch swap, refused occupied move, replace and presence are verified; confirmed discard/reopen restores the original saved cast and three sprites with controls collapsed. [Exact group states](evidence/dyl60/keyboard/device/final-group.json), [restored group](evidence/dyl60/keyboard/device/final-group-controls.png). This supplies the recovery proof missing from the earlier unverified attempt. Raw probe failures remain separate: sticky-heading target positioning, an incorrect `:visible` assertion while expanded controls yielded art, and duplicate dialog listeners after a no-op initial discard. Those earlier development probes remain separate. On the final revision, a short response finished before Stop; repeating with the unchanged `[LONG]` deterministic fixture verified Stop/Continue. No runtime/test source changed after the final freeze.

These are actual Android browser touch events, Android draft/caret input and operator rotation; programmatic select options, native transcript loading and target scroll positioning are setup aids. Physical select-menu/file-picker/export/import/cleanup flows and a complete finger/digitizer audit remain incomplete. **Increased text scaling/200% physical zoom, reduced-motion-enabled use, assistive technology, native group branch/copy and the human Gate A session remain NOT_TESTED/NOT_RUN.** This bounded fix passes; full owner-playtest readiness remains REVISE pending the mandatory remaining surfaces. Disable restores the original host behavior, including its unmodified browser viewport policy; this is not a host-wide fix when SillyNovel is disabled.

## Development evidence retained separately

The incomplete `b238b9193d989256e3e53179b5a7b755b9dc73e6` attempt passed Node/storage but failed the browser manual-cast assertion while expanded controls yielded artwork space. [Raw incomplete run](evidence/dyl60/keyboard/development/frozen-b238-incomplete/runs.json) and its browser failure remain retained, along with the earlier physical replay. The final freeze changes only that test: semantic presence is checked while controls are expanded, then actual three-sprite rendering and presence changes are checked with controls collapsed. [Empty runtime diff between freezes](evidence/dyl60/keyboard/runtime-identity.txt). Both targeted checks pass. Final automated and physical checks are repeated on the final full SHA; earlier counts are not reused.

## Final automated campaign and handoff

All nine rows below pass freshly on `c5c1699a48629ae761a093e13056f0b11fdc4b88`. Node/storage/browser have zero failed, skipped or cancelled tests. The six native-host counts are overlapping checkpoint groups, not independent test totals. [Exact commands, flags, UTC times and retained roots](evidence/dyl60/keyboard/final/runs.json), [pins](evidence/dyl60/keyboard/final/pins.json), [110 frozen input hashes](evidence/dyl60/keyboard/final/inputs.json), [output hashes](evidence/dyl60/keyboard/final/artifacts.json).

| Campaign | Tests / checkpoint groups | Elapsed | Exit |
| --- | --- | --- | --- |
| node | 153 | 1.318s | 0 |
| storage | 126 | 170.659s | 0 |
| browser | 82 | 56.534s | 0 |
| stage-library-migration | 24 | 125.249s | 0 |
| expressions | 16 | 72.916s | 0 |
| groups | 22 | 99.480s | 0 |
| recovery | 17 | 70.169s | 0 |
| cleanup | 21 | 67.952s | 0 |
| native-integrity-branches | 18 | 80.763s | 0 |

SillyTavern 1.19.0 / `7e8663cd9c184a550b37238218bdd32c6efc68e9`; Node 26.8.1, npm 11.19.0, SQLite 3.53.4, Playwright 1.62.1, Chromium 151.0.7922.34, Linux x86_64, Python 3.12.3. Only synthetic accounts/cards/chats/persona/lore and the unchanged deterministic loopback endpoint were used. No extension build, new dependency, host patch or private/live install.

The initial committed-runner invocation was launched from `/tmp`:

```sh
SILLYTAVERN_ROOT=/tmp/SillyTavern-dyl22 SN_PLAYWRIGHT_MODULE=/home/dq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs python3 /home/dq/Projects/SillyNovel/tests/probes/dyl60/run.py /home/dq/Projects/SillyNovel/docs/evidence/dyl60/keyboard/final
```

It completed the first four rows, then the outer command/session ended with SIGTERM/exit 143 during expressions, with no failed assertion in its captured log. Cause unknown. [Interruption record](evidence/dyl60/keyboard/final/resume.json) and the [incomplete expression log](evidence/dyl60/keyboard/development/interrupted-c5/expressions.txt) remain retained. The four successful same-candidate rows were preserved; expressions was rerun and the remaining four campaigns ran serially, one command session each, after verifying the same 110 input hashes and host/Node/browser/tooling pins. This is a completed same-candidate continuation, not an uninterrupted runner claim. [Exact continuation helper](evidence/dyl60/keyboard/resume-source.txt); commands actually run:

```sh
python3 /tmp/sn-dyl60-keyboard-resume.py expressions
python3 /tmp/sn-dyl60-keyboard-resume.py groups
python3 /tmp/sn-dyl60-keyboard-resume.py recovery
python3 /tmp/sn-dyl60-keyboard-resume.py cleanup
python3 /tmp/sn-dyl60-keyboard-resume.py native-integrity-branches
python3 tests/probes/dyl60/validate.py docs/evidence/dyl60/keyboard/final
python3 tests/probes/dyl60/check-discovery.py
```

[Automated package validator](evidence/dyl60/keyboard/campaign-validation.txt) checks all nine rows, native integrity and output hashes; its legacy physical-NOT_TESTED message describes that automated package only. [Separate physical validator](evidence/dyl60/keyboard/device-validation.txt) verifies the actual tablet results. The discovery self-check compares repo/foreign working directories and rejects missing/empty/unexpected suites; [recorded discovery](evidence/dyl60/keyboard/discovery-from-tmp.json), [result](evidence/dyl60/keyboard/discovery-validation.txt). Expected native abort messages during deliberate Stop remain in raw logs.

The fresh visual-only native inventory preserves all 84 files and complete settings. Native identical copy, active-expression branch/held committed save, delayed-image branch, exact canonical non-system generation messages and exclusion of actual visual identifiers pass. Actual four-card duplicate-name native groups remain separate from four manual UUID actors; source decisions remain transient. [Native integrity record](evidence/dyl60/keyboard/final/native-integrity-branches/evidence.json). Representative desktop/narrow and actual tablet captures were inspected; [reviewed-frame hashes and limits](evidence/dyl60/keyboard/visual-review.json).

[Cleanup verification](evidence/dyl60/keyboard/cleanup-verification.json) records closed owned ports and no matching Node host/provider processes. The synthetic tablet tab and only its owned reverse/forward mappings were removed; system/browser settings stayed unchanged. [New retained roots and non-host file hashes](evidence/dyl60/keyboard/retained-roots.json) include the interrupted and development roots; all earlier DYL-60 roots/evidence remain retained. No root is deleted before review. [Package hashes](evidence/dyl60/SHA256SUMS.json) include historical and new evidence. Executable inputs remain byte-identical after freeze; subsequent commit contains documentation/evidence only. The final pushed evidence head is recorded in PR #34 and the Linear handoff.

**Disposition:** keyboard visibility and P3 correction PASS within the named scope; GO for senior review of this correction. Full owner-playtest readiness remains REVISE for the mandatory remaining physical/assistive surfaces listed above. DYL-60 remains In Review with original acceptance/blockers; DYL-62/63 are unchanged. PR #34 stays draft/open/unmerged, auto-merge disabled. Human Gate A NOT_RUN; no owner session/schedule/verdict, later milestone, live install or release follows. Next bounded step is senior review of this exact correction and selection of the remaining physical/assistive technical coverage.
