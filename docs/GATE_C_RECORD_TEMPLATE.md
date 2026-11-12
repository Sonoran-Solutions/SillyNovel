# Gate C record template

**Template only. Gate C NOT_RUN.** Copy this into a dated evidence file (for example `docs/evidence/gate-c/record.md`) when the owner runs Gate C. It carries the [human gate record](TESTING.md#6-human-gate-record) plus the seven [roadmap demonstrations](ROADMAP.md#gate-c--image-workflow) and their hard gates. The frozen candidate, the owner's session and the verdict each need their own owner authorization, recorded in [DECISIONS](DECISIONS.md) before the step starts. No field below may be filled in by inference.

**Synthetic and real evidence stay apart.** *Synthetic* means the committed fake ComfyUI on the disposable pinned host (`tests/probes/m3-gate-c/demo.mjs`, or the frozen campaign). *Real* means the owner's own install and the owner's own ComfyUI. A demonstration not shown on the real backend is NOT_RUN there, and a real-provider policy refusal is NOT_TESTED (J7). A synthetic result never fills a real line.

**No private chat text enters the repository** ([AGENTS.md](../AGENTS.md)). The record keeps only counts, hashes, error codes, versions, and observations the owner explicitly marks as non-sensitive. These stay outside the repository and are referred to only by SHA-256 and a location outside it:
- raw logs (the host server log, the browser console, ComfyUI's log);
- the capture output and any ledger backup;
- the owner's prompt and review text, and file and folder names (a host image folder is named after the character).

No chat excerpts, character or persona names from the owner's install, connection settings, URLs other than loopback, keys, headers or `settings.json` contents anywhere. The owner's prompt and review text go in only if the owner says so for that text.

```text
Gate: C
Candidate full SHA:
SillyTavern release and full SHA:
Browser and device:
Relevant extensions/configuration (names and versions only; no URLs, keys or connection settings):
Assets/providers used:
Scenarios exercised:
Automated checks actually run:
Owner feedback (verbatim or clearly attributed; only words the owner marks as non-sensitive, never chat excerpts):
Owner verdict: NOT_RUN / PASS / REVISE / STOP
Remaining blockers:
Known limitations:
Evidence locations (in the repository, or outside it by SHA-256 only):

--- Authorizations (DECISIONS entries) ---
Frozen Gate C candidate:
Owner's Gate C session (real backend):
Read-only capture on the owner's install (capture.mjs), owner's word recorded first:

--- Host and backend for the real session (decided by the owner before the session) ---
Host used (owner's install, version and SHA; or another, named by the owner):
Deviation from the pinned 1.19.0 7e8663c, if any, and why:
Storage plugin on that host is the candidate's (schema v3) yes / no:
Database backup taken before the plugin first ran there (DYL-58 tool; SHA-256 only, kept outside the repository):
ComfyUI version and URL as the review shows them:
Workflow name and SHA-256 as the review shows them:
Seed policy (fixed / random), as the owner set it in the host:
ComfyUI embeds its `prompt` metadata in saved PNGs (observed by capture): yes / no / NOT_AVAILABLE:

--- Hard gates, synthetic (frozen campaign on the candidate, and demo.mjs) ---
Campaign evidence location and SHA, and whether it is a fresh run or reused by SHA (with the diff command):
Synthetic demo observations file and its SHA-256:
One eligible request never becomes duplicate jobs (fixture /prompt == ledger rows == Submit clicks; J; M; N; demo cancelled-or-stale reload):
A late image never replaces a newer scene (D, G, M, N; demo timeout and cancelled-or-stale):
Data actually sent equals the review (campaign B and C wire; T74):
Reading and replying continue (demo replies during held jobs):
Canonical files unchanged (campaign O; demo gates):
No automatic CGs or outfit batches (every /prompt follows a Submit click):
The 8188 guard: tampered URL aborted, sentinel and fixture saw nothing (demo proof):

--- Synthetic demonstrations (demo.mjs --owner, the owner watching and clicking) ---
For each block: fixture step | /prompt | ledger rows and states | host files net | replies during the job | matches expected | owner's words
New background:
Cache hit:
Rejected candidate (Discard, Delete the host's copy):
Timeout (held 120 s, then the late image):
Policy refusal (synthetic, J7):
Cancelled or stale job (Cancel; a newer scene; a reload and takeover):
Configured usage limit (five, the sixth refused, still five after reload):

--- Real session (owner's install, owner's ComfyUI): counts, hashes and the owner's words only ---
Date and time window (the capture's --since):
New background: shown / NOT_RUN; Submit to candidate time (owner); import result; usefulness (owner):
Cache hit (needs a fixed seed): shown / NOT_RUN; new host files (must be 0); new ledger rows (must be 0):
Rejected candidate: shown / NOT_RUN; host copy deleted (capture: rowsDeleted, rowsDeletedButPresent must be 0):
Timeout: shown / NOT_RUN (shown only if the owner slowed ComfyUI by their own means and 120 s passed); late image applied (must be no):
Policy refusal: NOT_TESTED on a real provider (J7); synthetic block above
Cancelled or stale job: Cancel / newer scene / second tab / reload, each shown or NOT_RUN; anything applied late (must be no):
Configured usage limit: shown / NOT_RUN; sixth Submit refused; count after reload:
Reading and replying throughout (owner):
Canonical text, cards, lorebooks, personas unchanged (owner's report):
Anything generated that the owner did not submit (owner; must be none):

--- Real data actually sent (capture.mjs, read-only, outside the repository) ---
Capture command (paths abbreviated, no user or character names), output file SHA-256 (the file stays outside the repository):
Review texts the owner copied: count and SHA-256 of each (text only if the owner says so):
New host files: count; each SHA-256, size and PNG signature (names stay in the capture output, outside the repository):
Backend graph per file: present / absent / unreadable; matched review SHA-256:
Fields compared (positive, negative, seed if fixed, steps, CFG, sampler, scheduler, denoise, size, model): match / mismatch per field:
Not in the graph (VAE, clip skip under the six-node workflow):
Unexplained text inputs (must be 0); node types all on the allowlist (must be yes):
Ledger (recovery backup then inspect): rows by state; files without a row (must be 0); files with several rows (must be 0); rows whose file is missing (must be 0):
ComfyUI's own queue history during the window (owner reads it in ComfyUI; the agent never contacts it): entries, and whether they equal the ledger rows that reached the host:
Host server log (raw lines stay outside the repository): count of image requests, error codes seen, SHA-256 of the excerpt file kept outside:
```

A PASS is recordable only with the synthetic hard gates met on the frozen SHA, every real line either shown or explicitly NOT_RUN or NOT_TESTED, no late image applied, no duplicate or unrequested job, and no lost canonical text or saved-project change in the session. No threshold or percentage exists. Only the owner supplies the verdict and the owner's lines. An agent may fill in commands, hashes and counts it actually observed.
