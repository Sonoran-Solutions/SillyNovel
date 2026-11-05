# Post-Gate-B cleanup — implementation record

**Merged** as [#77](https://github.com/Sonoran-Solutions/SillyNovel/pull/77), `6f8cf24`, on 2026-11-04. Written on `1741b870391709745250a55537fbc1e2699a0b77`, rebased onto main `22b774d` (M3.1 PR A merged); campaign candidate `67d620724185cc42aa1121a4d4334dde69e07320`. Runtime change (renderer and controller copy), validated by the full campaign below. The merge accepts the runtime change only; the T60 wording is still a proposal.

## Changes and PR D findings

| Finding | Disposition |
| --- | --- |
| (a) Removed-art read-out | Fixed in `src/stage-view.mjs:369`, `:372`, `:374`, `:378`: append background/outfit/library asset IDs only when present, including both selected-art suffixes. Existing textContent rendering retained. |
| (b) T60 regenerate wording | `docs/TESTING.md` NOT changed. Proposed amended Expected text below, for the owner to accept at merge. |
| (c) Reply notice | `src/director-controller.mjs:224`: “Director request set aside for your reply”. Only displayed copy changed; `SUPERSEDED`, log label `superseded` and classification unchanged. Assertions updated in `tests/m2-director-controller.test.mjs:472`, `:706` and `tests/probes/m2-director/host.mjs:240`, `:261`. |
| (d) STALE_JOURNAL vs STALE_SCENE | No change: global edits rebase the journal and reach `STALE_JOURNAL` first; corrections reach `STALE_SCENE`, as previously observed and asserted. Neither is a failure. |

Proposed T60 **Expected** (not an owner-approved matrix amendment): “Excerpts deleted; outcome kept in tallies; no text of the old message remains in the log. When a changed source retains its message key, its row shows ‘message changed’. A real regenerate replaces the message under a new key: the excerpt is gone and tallies keep the outcome, but no ‘message changed’ row remains at the selected replacement message.” Existing evidence annotations should retain their original tested revisions.

## Host findings

- `plugins/sillynovel-storage/README.md:16`: installation note requires an absolute `dataRoot` in `config.yaml`, with a full-path example. The default `./data` yields `STORAGE_UNAVAILABLE` because `server.js` sets `globalThis.DATA_ROOT` before `chdir` and passes the configured value unresolved. Read from the owner's SillyTavern 1.18.0 `server.js` (lines 9 and 11); not re-read on pinned 1.19.0. Documentation only; no plugin code change.
- `tests/probes/m2-gate-b/run.mjs:49`, `:77`: losing `delay` promises in `Promise.race` leave referenced Node timers alive. In owner mode, pressing Enter leaves the 900,000 ms confirmation timer pending; finishing the cases before it expires therefore keeps Node alive after “Finished”. The abandoned-request grace race has the same potential leak until the overall deadline. Both timers now use `{ ref: false }`. `:78` closes readline in `finally`, including timeout/rejection. Inspection found the existing watchdog cleared and browser closed in the outer `finally`; signal listeners do not themselves keep Node alive, page timers belong to the closing browser, and this runner creates no server. No blanket exit added. Runner exit fix verified by inspection only.

## Commands and results

Node v26.8.1, Linux, synthetic fixtures only; no host, provider or device. Each run supervised with a 300 s deadline.

```sh
node --test --test-isolation=none tests/m0.test.mjs tests/m1-reader-source.test.mjs tests/m1-source-prefix.test.mjs tests/m1-scene-reducer.test.mjs tests/m1-project-scene.test.mjs tests/m1-project-expressions.test.mjs tests/m2-director-proposal.test.mjs tests/m2-director-request.test.mjs tests/m2-director-controller.test.mjs tests/m2-director-overlay.test.mjs tests/m2-director-log.test.mjs tests/m2-gate-b-score.test.mjs tests/probes/dyl19/owned-chat-probe.test.mjs tests/probes/dyl19/source-anchor.test.mjs
```

| Inputs | Result |
| --- | --- |
| Main `1741b87` (baseline) | 362/362 pass |
| This branch | 362/362 pass |

`node --check` on the five changed `.mjs` files: PASS. `python3 tests/probes/dyl60/check-discovery.py`: PASS (14/5/1). `git diff --check`: PASS. The old notice text no longer appears in `src/`, `index.js`, `style.css` or `tests/`; historical documents are untouched.

### Full campaign on the rebased branch

One supervised campaign at `67d6207` on a disposable pinned SillyTavern 1.19.0 host (`7e8663cd9c184a550b37238218bdd32c6efc68e9`, cloned from the owner's local SillyTavern clone, `npm ci`; the owner's install untouched), Node 26.8.1, the pinned Playwright Chromium. It waited for another project's heavy job to release the host lock, then ran with a 50-minute deadline and left no processes.

```sh
python3 tests/probes/dyl60/run.py docs/evidence/post-gate-b-cleanup/campaign
python3 tests/probes/dyl60/validate.py docs/evidence/post-gate-b-cleanup/campaign
```

| Suite | Result |
| --- | --- |
| Node | 371/371 (main now includes M3.1 PR A's 9) |
| Storage | 126/126 |
| Browser actual-entry | 103/103 |
| Native campaigns | stage-library-migration 24, expressions 16, groups 22, recovery 17, cleanup 21, native-integrity-branches 18, director 60 (its two `untilNotice` checks now wait for “set aside for your reply”) |
| `validate.py` | PASS over 138 frozen inputs, a native inventory of 84 files and 115 artifact hashes; physical and owner gates NOT_TESTED or NOT_RUN |

Package: [`docs/evidence/post-gate-b-cleanup/campaign/`](evidence/post-gate-b-cleanup/campaign/).

## Outstanding

- No test drives the missing-art read-out itself; the browser and native suites pass around it, but the `undefined` case has no dedicated assertion.
- Runner exit fix: by inspection only; owner mode NOT_RUN.
- The proposed T60 wording still waits for the owner's acceptance: #77 merged without a ruling on it, and TESTING T60 is unchanged.
