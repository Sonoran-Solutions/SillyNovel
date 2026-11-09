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

M3.3 PR C adds the image ledger checkpoints (the plugin's own routes on the host). From C on, C's request is in the cache, so D–I use a second prompt.

- J: C's identical request again: **Use the previous result** applies the imported asset; the fixture's `/prompt` count and host generate requests stay at zero; nothing counted or reserved.
- K: the fixture's `refusal` step (a synthetic content-policy refusal, J7): shown as a failure; one `/prompt`, one host generate request (no retry, no fallback); the unit spent; the row `failed`.
- L: after Discard preview, **Delete the host's copy** removes exactly that file from the host folder; the row records `hostDeletedAt`.
- M: a second page sees the lease held and takes it over (count kept); the first page ends at its next heartbeat; its late file is kept by the host; after the real 120 s deadline **Reconcile** lists only that file and choosing it goes through the fetch, PNG check and Import and apply.
- N: a reload during a held job; the reloaded page takes over and finds the job unresolved; the host folder gains no file (the host saves a result from the page); after the deadline Reconcile finds nothing, **None of these** attaches nothing and Abandon resolves it.
- O: the ledger rows equal the campaign in order; nothing unresolved; no chat, card or persona text stored; saved `extension_settings.sd` and canonical files unchanged.

M and N each wait for the real 120 s deadline, so the campaign takes about five minutes longer than M3.2's.

The fixture's `/interrupt` entry is the host's request, not evidence that real ComfyUI work stops. Registered as the
`image-route` step of `tests/probes/dyl60/run.py`.
