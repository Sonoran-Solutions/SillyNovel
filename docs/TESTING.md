# Verification and acceptance

**Status:** test plan only. No runtime tests, provider calls, or human playtests have been executed for this documentation starter.

## 1. Evidence levels

Distinguish unit tests, simulated integration tests, real-host testing, real-provider testing, and owner playtesting. Passing one level does not imply another.

Every report records the full candidate SHA, host version/commit, browser/device, relevant configuration, commands actually run, outcome, and known gaps. A screenshot without a source build and scenario is illustrative, not a complete test record.

## 2. Core regression matrix

| ID | Scenario | Required outcome | First stage |
| --- | --- | --- | --- |
| T01 | Enable/disable/re-enable repeatedly | One active stage; no leaked handlers; native chat restored | M0 |
| T02 | Type a draft, toggle views | Exact draft preserved; normal send behavior remains | M0 |
| T03 | Required host capability absent | Actionable disabled state; no broken native UI | M0 |
| T04 | Long formatted message | All source text accessible; no silent summarization or truncation | M1 |
| T05 | Streaming, stop, continue | Readable text; no premature/duplicate automatic work | M1/M2 |
| T06 | Group with duplicate display names | Correct identity mapping or explicit unresolved state | M1 |
| T07 | More group members than stage slots | No loss of logical membership or dialogue | M1 |
| T08 | Switch A → B with delayed work | A's work cannot render or save into B | M1/M2 |
| T09 | Switch A → B → A with delayed work | Old epoch cannot apply to new visit | M2 |
| T10 | Select an earlier swipe | Changed suffix invalidated; selected history drives visuals | M1 |
| T11 | Edit/insert/delete/continue earlier text | Fingerprints change and dependent state is invalidated | M1 |
| T12 | Reload and branch a chat | Valid matching state restored; branch ownership isolated | M1 |
| T13 | Read backlog while new message arrives | Cursor stays put; no provider calls for navigation | M1 |
| T14 | Second tab attempts state writes | Defined ownership policy; no silent save race | M1 |
| T15 | Lock outfit while director is running | Lock wins; stale proposal cannot overwrite it | M2 |
| T16 | Unknown keys, IDs, schema, bad evidence | Entire invalid proposal rejected | M2 |
| T17 | Model/server error or timeout | Last valid scene survives; chat remains usable | M2 |
| T18 | Mention/negation/flashback/hypothetical | No unsupported current-location or presence change | M2 |
| T19 | Compare canonical data before/after | No extension-authored text/card/lore/config changes | M1/M2 |
| T20 | Same asset requested concurrently | One generation request or safe cache result | M3 |
| T21 | Image finishes after scene/chat change | Candidate remains scoped; active scene not replaced | M3 |
| T22 | Missing outfit sprite | Correct-identity safe fallback; no contradictory outfit swap | M1 |
| T23 | Corrupt/oversized/traversal import | Rejected safely; existing library retained | M1/M3 |
| T24 | Local provider unavailable | No silent cloud fallback | M2/M3 |
| T25 | API refusal, auth error, rate limit | No provider hopping, retry storm, or chat modification | M3 |
| T26 | Budget/count threshold and in-flight jobs | No newly unauthorized automatic submissions | M3 |
| T27 | Unsupported persistence version | Original data preserved; safe degraded mode | M1 |
| T28 | Reduced motion, zoom, touch keyboard | Readable, usable controls; reply field accessible | M1 |
| T29 | Prompt text containing slash/HTML instructions | Data stays data; no command or script execution | M2/M3 |
| T30 | Metadata save overlaps chat change | Write targets correct owner or is safely deferred/refused | M1 |

## 3. Fixture design

Use invented characters and conversations. Include two characters with the same display name but different identities, repeated identical message text at different positions, a renamed card, a branched chat with a shared prefix, a stopped stream, and an edited historical message.

Director fixtures need ground-truth expected updates, allowed abstentions, and forbidden changes. Include quoted travel plans, a character saying “I am not leaving,” an offscreen person being mentioned, an outfit change explicitly completed, a user lock contradicting the prose, and content that tries to instruct the classifier to ignore its rules.

Freeze fixture expectations before evaluating a candidate. Report semantic failures separately from malformed JSON and transport errors. Do not treat a substring-valid evidence quote as semantic correctness.

## 4. Data-integrity checks

Compare canonical source fields before and after extension-only operations. Compare cards, lorebooks, personas, connection configuration, selected content, and the current draft where relevant. Allow only intended writes to extension-owned visual metadata/settings.

Check at least one real host export to ensure namespaced metadata does not unexpectedly enter the main roleplay prompt. A quiet-looking API helper can still have side effects; capture the actual request construction during integration verification.

Do not include secrets or personal prompt content in committed traces. Use redacted request summaries or synthetic fixtures.

## 5. Performance targets

Proposed engineering targets, to be measured rather than advertised: cached visual selection should not perceptibly delay the reader; ordinary message rendering must not wait for an external model; only one automatic director request per eligible source revision (explicit retries recorded separately); no image request per streaming token; no unbounded growth of listeners, DOM nodes, object URLs, or job queues.

Before introducing numerical timing budgets, record the actual host, browser, hardware, asset sizes, and measurement method. Report a latency distribution and slow cases instead of a single favorable screenshot/run.

## 6. Human gate record

Copy this record into a dated evidence file for each real candidate:

```text
Gate: A / B / C
Candidate full SHA:
SillyTavern release and full SHA:
Browser and device:
Relevant extensions/configuration:
Assets/providers used:
Scenarios exercised:
Automated checks actually run:
Owner feedback (verbatim or clearly attributed):
Owner verdict: NOT_RUN / PASS / REVISE / STOP
Remaining blockers:
Known limitations:
Evidence locations:
```

Only the owner supplies the human verdict. Agents can recommend readiness for evaluation but cannot fabricate approval, elapsed session length, screenshots, or test outcomes.

## 7. Documentation checks

Before merging documentation, validate relative links, JSON example syntax, consistent milestone/status names, and separation of planned versus implemented behavior. Check that external facts cite primary sources and that provider limits/pricing have not been invented.

These checks validate the documentation package only. They do not count as M0 completion or extension compatibility evidence.