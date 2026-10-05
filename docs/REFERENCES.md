# References and verified integration notes

**Checked:** 2026-10-04. These are live external documents, not a tested SillyTavern compatibility matrix. Recheck relevant sources when implementing a provider or pinning the host.

The repository's architecture, UX, contracts, limits, and milestones are original proposed design choices. The brief notes below identify the external facts they rely on; they do not imply those APIs have been exercised in SillyNovel.

## S1

**SillyTavern — UI Extensions**  
[Official documentation](https://docs.sillytavern.app/for-contributors/writing-extensions/)

Source for the browser extension model, context interface, event caveats, settings/chat metadata, and character-index warning cited in the architecture and state documents. Pin and test actual behavior rather than assuming every documented function exists in every installed version.

## S2

**SillyTavern — Character Expressions**  
[Official documentation](https://docs.sillytavern.app/extensions/expression-images/)

Documents expression sprites, Visual Novel display, classification options, fallback images, and sprite folder overrides. These are existing host capabilities to evaluate, not a guarantee that another renderer can reuse all of them without adaptation.

## S3

**SillyTavern — Image Generation**  
[Official documentation](https://docs.sillytavern.app/extensions/stable-diffusion/)

Documents local/cloud sources, ComfyUI integration, and quiet image generation. The suggested reuse path requires an integration spike covering context disclosure, return values, escaping, and side effects.

## S4

**SillyTavern — Server Plugins**  
[Official documentation](https://docs.sillytavern.app/for-contributors/server-plugins/)

Documents server-side extension points and warns that server plugins are not sandboxed. No required server plugin is assumed by this project's manual reader baseline.

## S5

**OpenAI — Managing billing for ChatGPT and the API platform**  
[Official help article](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform)

Confirms ordinary API usage has billing separate from ChatGPT subscriptions. This does not negate the distinct eligible-app authorization flow in S6.

## S6

**OpenAI — Sign in with ChatGPT: ChatGPT plan usage overview**  
[Official developer documentation](https://developers.openai.com/siwc/token-sharing-open-source)

Documents an optional plan-usage capability for eligible open-source/local applications, requiring user authorization. It does not grant existing ChatGPT conversation access. Availability to this particular project/account has not been tested.

## S7

**OpenAI — ChatGPT plan usage: preview limitations**  
[Official developer documentation](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)

The checked preview explicitly excludes image-generation tools. Do not infer image entitlements from working text inference or a ChatGPT login. Reverify before any implementation claim.

## S8

**OpenAI — Image generation API guide**  
[Official developer documentation](https://developers.openai.com/api/docs/guides/image-generation)

Implementation reference for a future separately configured image adapter. No particular model, quality tier, price, output size, or transparency support is frozen in this project's documentation.

## S9

**Google — Gemini API image generation**  
[Official developer documentation](https://ai.google.dev/gemini-api/docs/image-generation)

Implementation reference for a possible Gemini image adapter. Model support, credentials, regional availability, limits, and pricing require verification for the actual chosen configuration.

## User-supplied inspiration

**Reddit — “I made a VN-style sprite creator! Oh and a game”**  
[Original user-supplied thread](https://www.reddit.com/r/SillyTavernAI/comments/1wlixok/i_made_a_vnstyle_sprite_creator_oh_and_a_game/)

The thread is inspiration for the requested aesthetic. Its contents could not be independently retrieved during this drafting run. This package does not rely on unverified claims about the author's code, license, architecture, or bundled assets, and it copies none of them.

## Claims deliberately not made

No third-party VN extension is assumed to be bundled, installed, compatible, or necessary. No model ranking, performance benchmark, API price, or minimum host version is invented. The existence of a feature in documentation is not a passing integration test.