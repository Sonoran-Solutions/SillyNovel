# Decision register

**Status:** initial register. User-stated scope is distinguished from recommendations. A proposed default is not a recorded owner approval.

## Confirmed user-stated scope

| ID | Decision | Basis |
| --- | --- | --- |
| U01 | The project is for a better roleplay experience, not primarily a game-development asset studio | Explicit clarification in the project discussion |
| U02 | A visual-novel aesthetic inside SillyTavern chat is the intended direction | Explicit request to explore a SillyTavern extension |
| U03 | The project repository is `Sonoran-Solutions/SillyNovel` | Repository supplied by the owner |
| U04 | ChatGPT subscription use for images is a desired possibility to investigate, not an established integration | Original question about subscription-backed image generation |

No private character canon, relationship details, or unrelated game-art constraints are made part of the project baseline.

## Proposed baseline

| ID | Proposal | Rationale / consequence |
| --- | --- | --- |
| P01 | Ordinary installable UI extension, not a host fork | Keep the project centered on presentation and isolate compatibility work |
| P02 | Canonical conversation and roleplay configuration remain unchanged | Visual errors must not corrupt the roleplay |
| P03 | Manual reader before director before image generation | Validate immersion before adding latency, cost, and provider complexity |
| P04 | Separate visual classification from story authoring | No mandatory tags or machine-readable output format in ordinary RP replies |
| P05 | Stable scene/assets, conservative updates, manual locks | Favor continuity and cheap correction over constant novelty |
| P06 | Namespaced visual metadata and a small host adapter | Make ownership, migrations, and compatibility testable |
| P07 | No automatic cloud/image work by default | Avoid surprise data disclosure and paid requests |
| P08 | One to three visible sprites; retain larger logical group membership | Bound the stage without changing chat participation |
| P09 | Complete-message reader first; precise within-message cues later | Avoid lossy rewriting or an unverified dialogue parser |
| P10 | Explicit human gates A/B/C | Technical passes do not establish a good roleplay experience |
| P11 | No required server plugin in the core | Keep the manual experience usable with a UI extension alone |
| P12 | Provider capabilities verified independently | Text compatibility does not prove image, transparency, or billing support |

## Proposed defaults

The extension starts disabled. Enabling it activates manual presentation only. Director and image generation are separately off. Automatic retries and automatic CG creation are off. Typewriter animation is off. Standard chat and the existing composer remain available.

Location, presence, and outfit overrides remain locked until released. Manual expressions affect the selected message only. A later change to these defaults must update the UX, state, tests, and migration notes together.

## Decisions still needed

| ID | Question | When it must be resolved |
| --- | --- | --- |
| O01 | Which actual SillyTavern release/commit and browser form the first tested baseline? | M0, before compatibility claims |
| O02 | Which host-supported storage/asset routes meet user scoping and save-safety needs? | M0/M1, before persistence is advertised |
| O03 | Which source license should the repository use? | Before an installable public release |
| O04 | Which one text-director transport should be exercised first? | M2 planning; never required for M1 |
| O05 | Which image route should be the first real adapter? | M3 planning after Gate B |
| O06 | What usage limits and content-sharing scope will the owner enable? | Before any automatic paid/cloud work |
| O07 | Is plan-backed ChatGPT text access worth a separate integration spike? | Optional; not a reader or image milestone prerequisite |

These questions do not block documentation or the manual compatibility shell. Do not answer them by silently treating an example configuration as a user decision.

## Changing decisions

Add a new entry with status, date, rationale, affected documents, and approving person where applicable. Preserve superseded decisions and link their replacements. Keep user statements, agent recommendations, measured findings, and owner approvals distinct.
