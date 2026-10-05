# Project status

**Documentation baseline:** 2026-10-05.

## Current state

The product and technical documentation baseline is committed to the repository's default `main` branch. The repository currently contains design/specification material only; no SillyTavern runtime extension, release, or completed playtest exists yet.

| Area | State |
| --- | --- |
| Product and technical baseline | COMMITTED / PROPOSED |
| M0 — compatibility and reversible shell | NOT_STARTED |
| M1 — manual scene reader | NOT_STARTED |
| Gate A — reader feel | NOT_RUN |
| M2 — automatic direction | NOT_STARTED |
| Gate B — direction quality | NOT_RUN |
| M3 — optional asset generation | NOT_STARTED |
| Gate C — image workflow | NOT_RUN |
| M4 — polish/expansions | DEFERRED |
| Tested SillyTavern release and full SHA | NOT_SELECTED |
| Runtime unit/integration tests | NOT_RUN |
| Real provider tests | NOT_RUN |
| License choice | OPEN |

## Verified during documentation preparation

The repository identity and empty starting state were checked through the connected GitHub integration before this baseline was uploaded. Official SillyTavern and provider documentation was read to establish the limited external facts in [REFERENCES.md](REFERENCES.md).

The source documentation package passed integrity checks before upload: **15 files, 40 relative links, one JSON file, one JSON code block, and consistency between the two copies of the director example**. These checks are not evidence that an extension works or that a provider connection is available to the owner.

## Next action

Begin the bounded [M0 task](prompts/FIRST_TASK.md). Record actual starting/final SHAs, executed checks, tested SillyTavern version, and untested surfaces in the first implementation PR.

## Status discipline

Update this file when implementation or verification changes. Distinguish IMPLEMENTED, LOCALLY_TESTED, HOST_TESTED, PROVIDER_TESTED, and OWNER_APPROVED as appropriate. Do not promote a milestone merely because documentation exists or a coding agent reports that it “should work.”
