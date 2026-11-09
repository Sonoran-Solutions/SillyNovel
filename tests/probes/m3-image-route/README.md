# M3.2 PR C: native image-route campaign

`host.mjs` drives SillyNovel's real **Generate on this host** UI on the disposable pinned SillyTavern 1.19.0 host
(`../m2-director/harness.mjs`) against the fake ComfyUI `tests/fixtures/m3-comfy-endpoint.mjs`, started with
`SN_COMFY_PORT=0` on an ephemeral loopback port (asserted not 8188). `comfy_url` is set to the fixture origin before
`source` becomes `comfy`, and it is asserted to be the fixture origin before every Submit. Synthetic data only: the
harness decoys (persona, card, lorebook) and a decoy chat message.

```
SN_PLAYWRIGHT_MODULE=<playwright>/index.mjs node tests/probes/m3-image-route/host.mjs <pinned-host-root>   # port 8128 free
```

Checkpoints print `PASS <name>`; any failure throws, writes `evidence.json` with `result: 'FAIL'` and exits non-zero.

- A: setup (characters, decoys, chat, image extension on the fixture with selections aligned, a saved project with a background attached).
- B: session on; the review equals `reviewText(preflight())` computed in Node from the host's workflow text and settings; nothing sent.
- C: one Submit; the `/prompt` body deep-equals the independently substituted shipped workflow; no decoy on the image wire; no text request; Import and apply registers the fixture PNG and locks the background; canonical files and `extension_settings.sd` unchanged.
- D: Cancel with a held job; E: Stop host job (`/interrupt` logged); G: character switch while held; H: allowance of five; I: `free_extend` refused.
- F (the 120 s timeout) is not run: the UI has no hook to shorten the wait. It is covered in the browser suite with fake timers and listed in `notTested`.

The fixture's `/interrupt` entry is the host's request, not evidence that real ComfyUI work stops. Registered as the
`image-route` step of `tests/probes/dyl60/run.py`.
