# Knowledge-to-Video Factory

## Intent

A concept explainer, built for a hackathon audience, that shows an end-to-end
"Knowledge-to-Video Factory": specialized AI agents transform Microsoft Learn
content, technical documentation, and support articles into conceptual
learning videos. Audience is hackathon judges and technical/product
stakeholders. Runtime target is 57.5 seconds total, played on a presentation
screen (16:9, 1920x1080). Outcome: comprehension of the pipeline's value and
credibility, not a sales pitch.

## Capability scan

- Brand package: not found for this project — only a generic `contoso-corporate`
  demo package exists in `config/org/brand-packages/`, not relevant here. No
  brand package will be applied.
- Brand music library / org music library / built-in Slate music library:
  not checked — narration-only video requested, no music bed.
- User-supplied media: local Fluent iconography PNG library at
  `E:\Projects\HyperFrame\Fluent iconography` (hundreds of icons); to be used
  directly as the primary visual asset, not regenerated.
- Foundry models: **no Azure AI Foundry resource is configured.**
  `config/azure.yaml` is the blank distribution template; `config/azure.local.yaml`
  does not exist. `gpt-image-2`, `gpt-4o-mini-tts`, `azure_speech_tts`,
  `gpt-4o-transcribe`, and `sora` are all registered as tools but unreachable
  until a resource is configured. Azure setup was attempted (az CLI is signed
  in as `junki@microsoft.com`, tenant `Microsoft`); no personal subscription
  is available and resource-group creation was denied on the only reachable
  subscription. Deferred per user decision.
- Narration resolution: built and verified a new local tool, `windows_tts`
  (`src/slate/tools/audio/windows_tts.py`) — offline Windows SAPI synthesis,
  $0 cost, no Azure dependency. Installed voices available: Microsoft David
  Desktop, Microsoft Zira Desktop, Microsoft Heami Desktop. This is a lower
  quality voice than Azure neural HD; swap to `azure_speech_tts` later if
  Azure is configured.
- Image generation is not needed — the video is icon-led (Fluent PNGs), not
  AI-image-led.

## Treatment

A six-scene narrated concept explainer, hand-stitched from primitives per
`skills/creative/scene-primitives.md`, using the supplied Fluent iconography
as the visual subject throughout rather than generated imagery. No product
chrome scenes are needed (no real software UI is shown), so nothing routes to
the reusable chrome component catalog. The video ends on its narrated outcome
scene with no separate Copilot ending card. Full art direction is
committed in `art-direction.json` before scene planning (see companion file).

## Constraints

- Budget: $100 (default; not explicitly set by user)
- Brand: none — no brand package applies to this hackathon project
- Audience: hackathon judges and technical/product stakeholders
- Tone: confident, instructional, technically credible — not promotional
- Runtime: 57.5 seconds of narration-driven content
- No music
- Captions: static style, on by default for a narrated video
- Visual system: Fluent iconography only; no AI-generated imagery
