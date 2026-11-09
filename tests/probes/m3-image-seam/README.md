# M3.2 PR A: host image seam probe

A measurement, not a test of shipped code. `host.mjs` starts the disposable pinned SillyTavern 1.19.0 host through
`../m2-director/harness.mjs`, starts the fake ComfyUI `tests/fixtures/m3-comfy-endpoint.mjs` on an ephemeral loopback
port (never 8188), points the host's own Image Generation extension at it (`comfy_url` is set before `source`), and calls
the typed seam exactly as `docs/M3_2_IMAGE_ROUTE_PLAN.md` proposes:

```js
SillyTavern.getContext().SlashCommandParser.commands.imagine.callback({ quiet: 'true', gallery: 'false', negative, _abortController }, prompt);
```

Synthetic data only: the harness decoys (persona, card, lorebook) plus a decoy chat message.
Per case it records the browser's `/api/` requests (the `/api/sd/comfy/generate` body; upload metadata and the image
field's length and SHA-256 only), the fixture's received requests, the loopback text endpoint's requests (any is a
text-model call), chat length and hash, background, `extension_settings.sd` before/during/after, the user images
directory, toasts, page errors and the exact return value. Image fields (upload `image`, workflow `image` inputs such as
avatar substitutions) are stored as length and SHA-256 whatever their size, bodies keep their own length and SHA-256,
and each wire file is capped at 1 MiB. A returned path is validated (relative, same origin, under `/user/images/`)
before it is fetched, and redirects are refused.

- Required cases R1-R8 print `PASS` or `FAIL`: baseline wire equality, `{prompt}` marker, inert text, abort with the
  host's own `SlashCommandAbortController` (the supported controller shape: settles to a non-path value, the fixture
  logs `/interrupt`, no file), chat change, backend error, non-PNG (`.jpg` path and the fixture's non-PNG bytes), and
  still polling after a 15 s hold. Every required case also requires unchanged settings, chat and background and no
  text-endpoint request (R5 checks the chat it switched to instead).
- Hazard cases H1-H9 print `FINDING`: macros, character prefix, trigger word, `free_extend`, avatar workflow,
  in-flight dimensions, stale sampler selection, and a DOM `AbortController` passed as `_abortController` (ignored by
  the host: still pending after abort, no `/interrupt`, file saved after release); H9 stale `/history` polls.

`/interrupt` is the fixture's log of the host's request, not evidence that real ComfyUI work stops. R8 measures only
that polling continues after 15 s; the absence of a host deadline is a source finding.
```
SN_PLAYWRIGHT_MODULE=<playwright index.mjs> timeout --kill-after=5 600 node tests/probes/m3-image-seam/host.mjs <pinned-host-root>
```

Port 8128 must be free. Output: `<owned root>/evidence.json` and `wire/<case>.json`; the printed owned root holds a host clone, so delete it after use.

`VERDICT GO`: every required case passed. `VERDICT STOP`: a required case failed; the plan must change before PR B/C
rely on it. The exit code is non-zero only when the probe could not complete the measurement.
