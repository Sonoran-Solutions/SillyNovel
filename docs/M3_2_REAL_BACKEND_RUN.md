# M3.2 real-backend run — the owner's one request against a real ComfyUI

**Status: authorized, NOT_RUN.** The owner [authorized](DECISIONS.md#owner-authorization--m32-real-backend-run-on-the-owners-machine--2026-11-08) this run on 2026-11-08. It is the first time the image route sends anything to a real backend. Everything below the protocol is filled only from what the owner reports and what the agent can read without touching the owner's settings. Nothing here is Gate C; Gate C needs M3.3 and its own recorded step.

## What this run is

One manual missing-background request from the owner's own SillyTavern install, through the host's Image Generation extension on the owner's local ComfyUI, using the SillyNovel runtime now on main. It measures what the synthetic campaign could not: that a real ComfyUI accepts the host's request, how long it takes on this machine, and whether the result imports. It cannot establish safety beyond what PR A, B and C measured, and it does not run the campaign's hazard cases against the real backend.

| Item | Value |
| --- | --- |
| SillyNovel candidate | main `ec13df3`; runtime byte-identical to the frozen PR C candidate `afac1f9` |
| Served how | the owner's install's `public/scripts/extensions/third-party/SillyNovel` symlink, repointed by the agent on 2026-11-08 from the stale Gate B scratch path (which no longer existed) to `/home/dq/Projects/SillyNovel`; the storage plugin under `plugins/sillynovel-storage` is byte-identical to main's |
| Host | the owner's SillyTavern **1.18.0** `8172dcd` at `~/SillyTavern`, systemd user service `sillytavern-server` on port 8000. **Deviation from the pin** (1.19.0 `7e8663c`), recorded as at Gate B (I8). PR A inspected both versions' image seams and found the same paths; runtime on 1.18.0 is otherwise NOT_TESTED. |
| Backend | the owner's ComfyUI v0.43.2 at `~/ComfyUI`, expected on `http://127.0.0.1:8188`, AMD GPU. The owner starts it; the agent never starts or contacts it. |
| Workflow | the owner selects it in the host. SillyNovel's preflight accepts only a six-node workflow; `Default_Comfy_Workflow.json` qualifies, `Char_Avatar_Comfy_Workflow.json` does not, and any custom workflow is refused unless it uses only the six allowed node types. |
| Spend | none: local compute only. |

## Protocol for the owner

Before starting: have ComfyUI running on this machine (`http://127.0.0.1:8188`). Reload the SillyTavern page so the repointed extension loads.

1. In SillyTavern **Extensions → Image Generation**: Source **ComfyUI**, type **standard** (not RunPod), URL `http://127.0.0.1:8188`, press the connect/validate button so the model, sampler, scheduler and VAE lists load, and pick one of each from the loaded lists. Workflow: `Default_Comfy_Workflow.json` (or another six-node workflow you trust). Turn **off** “Extend prompt with LLM”, “Edit before generating”, interactive mode and the image function tool. Keep the prompt prefix and negative prefix free of `{{macros}}`, `<USER>`-style markers and `%placeholders%`. SillyNovel changes none of these; it only reads them.
2. Enable the SillyNovel reader, open a chat you do not mind being the test chat, and attach or create a saved project (the Image workflow needs an attached project to import a result).
3. Open **Image workflow**, write a short prompt that is not a trigger word (for example `a quiet reading room at dusk`), and optionally a negative prompt.
4. Turn on **Image session on this host**. Read the **Generation review**: it is exactly what will be sent after the host adds its prefixes. If it lists problems instead, fix the named setting in the host and turn the session off and on. **Copy the review text** for the record.
5. Note the time and press **Submit**. The status reads “Generating on 127.0.0.1:8188 · reading and replying continue”. Reading and replying should still work while it runs; try sending one ordinary message if you like.
6. When it finishes: the candidate appears with “Candidate, not imported · the host kept a copy at /user/images/…”. Press **Import and apply background** (or **Discard preview**). If it does not finish within 120 seconds, the status says the outcome is unknown and offers **Abandon**; you may also use **Stop host job**, which interrupts whatever ComfyUI is running.
7. Report back, in your words: the review text you copied; the time from Submit to the candidate (or the status at 120 s); which button you pressed at the end and what happened; any refusal or odd status line; whether the result looked usable; and whether reading and replying stayed smooth.

The agent then reads, without changing anything: the new file under the host's `user/images` folder (size, SHA-256, PNG signature), the host's own server log lines for the request, and the saved project's state if you imported.

## Record

To be filled from the owner's report and the agent's read-only capture. Every line NOT_RUN until then.

| Line | Value |
| --- | --- |
| Date, host version, candidate | NOT_RUN |
| ComfyUI version and URL as shown in the review | NOT_RUN |
| Workflow name and SHA-256 as shown in the review | NOT_RUN |
| Model, sampler, scheduler, VAE, steps, CFG, size, seed policy as shown | NOT_RUN |
| Review text (the owner's copy) | NOT_RUN |
| Submit to candidate, as the owner timed it | NOT_RUN |
| Host-retained file: name, size, SHA-256, PNG signature | NOT_RUN |
| Host server log lines for the request | NOT_RUN |
| Ending: import, discard, abandon or stop; what happened | NOT_RUN |
| Reading and replying during the request (owner) | NOT_RUN |
| Usefulness of the result (owner) | NOT_RUN |
| Anything odd (owner) | NOT_RUN |

What this run does not show, whatever its result: that a real ComfyUI stops work on Stop host job (only that the host sent the interrupt); the hazard cases; behaviour on 1.19.0 at runtime; anything on a device other than this desktop.
