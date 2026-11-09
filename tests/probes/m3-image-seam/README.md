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
directory, toasts, page errors and the exact return value. Base64 runs are replaced by length and SHA-256; each wire
file is capped at 1 MiB.

- Required cases R1-R8 (baseline wire equality, `{prompt}` marker, inert text, abort, chat change, backend error,
  non-PNG, no deadline) print `PASS` or `FAIL`.
- Hazard cases H1-H8 (macros, character prefix, trigger word, `free_extend`, avatar workflow, in-flight dimensions,
  stale sampler selection, abort with the host's own `SlashCommandAbortController`) print `FINDING`.

```
SN_PLAYWRIGHT_MODULE=<playwright index.mjs> timeout --kill-after=5 600 node tests/probes/m3-image-seam/host.mjs <pinned-host-root>
```

Port 8128 must be free. Output: `<owned root>/evidence.json` and `<owned root>/wire/<case>.json`; the owned root is
printed first and holds a host clone with `node_modules`, so delete it when done.

`VERDICT GO`: every required case passed; the seam behaves as the plan assumes. `VERDICT STOP`: at least one required
case failed; the plan must change before PR B/C rely on that property. The exit code is non-zero only when the probe
could not complete the measurement.
