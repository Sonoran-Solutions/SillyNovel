# M3.3 PR A: host image-folder probe

A measurement, not a test of shipped code. `host.mjs` starts the disposable pinned SillyTavern 1.19.0 host through
`../m2-director/harness.mjs` (unchanged) and drives the host's own routes with the logged-in request context and CSRF
token. No ComfyUI, no fixture image backend, no SillyNovel UI; never ports 8000 or 8188.

Synthetic decoys only: fixture PNGs from `tests/fixtures/m12-stage/` uploaded through `/api/images/upload` with
`ch_name: ''` (where gallery=false results land), one uploaded into the subfolder `SN-DECOY-SUB`, and two text canaries
`DECOY-OUTSIDE.txt` written beside `user/` and inside `user/`.

- L1-L4: `/api/images/list` folder forms, listing shape, `sortField`/`sortOrder`/`type`, `/api/images/folders`, and the
  `Last-Modified`/`ETag`/`Content-Length` of a `GET /user/images/<decoy>`, plus the upload response's `path` form.
- D1-D5: `/api/images/delete` with the relative and leading-slash forms, seven refusal forms, a normalizing `..` form
  and a request without the CSRF token. Each runs on a fresh decoy with a hash snapshot of the whole data root (and the
  canaries, both `settings.json` and `/etc/hostname`) before and after.

`VERDICT J5 GO` when D1 or D2 deletes exactly the decoy, every D3 case changes nothing and D5 is refused.
`VERDICT J6 GO` when a list form returns the root folder and every listed file has a `Last-Modified`.
`PASS`/`FINDING` lines are facts for PR C, not failures. The exit code is non-zero only when the measurement could not
complete.

```
SN_PLAYWRIGHT_MODULE=<playwright index.mjs> timeout --kill-after=5 600 node tests/probes/m3-image-folder/host.mjs <pinned-host-root>
```

Port 8128 must be free (the harness's text endpoint). Output: `<owned root>/evidence.json` and `host.log`; the printed
owned root holds a host clone, so delete it after use.
