# Sora-2 — Video Generation (Layer 3 Skill)

> Deep model-specific knowledge sourced from official Azure documentation.
> Source: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/video-generation

## Model Identity

| Field | Value |
|-------|-------|
| Model | Sora 2 |
| Provider | OpenAI (via Azure AI Foundry) |
| Deployment name | `sora` |
| SDK | OpenAI Python SDK (`client.videos.create_and_poll`) |
| Auth scope | `https://ai.azure.com/.default` (NOT cognitiveservices) |

## Capabilities

- **Modalities**: text → video, image → video, video → video (remix)
- **Audio**: Sora 2 generates audio in output videos
- **Remix**: Make targeted edits to existing generated videos
- **Durations**: **exactly 4, 8, or 12 seconds** — any other value returns HTTP 400. Use `_snap_duration()` in `scripts/lib/video_gen.py` to coerce arbitrary requested durations to the nearest valid value.
- **Rate limit**: **1 request per 60 seconds** at capacity 1 (Slate's deployment). Expect 60–160s end-to-end per clip including poll wait.

## Supported Resolutions

| Resolution | Aspect | Multi-variant |
|-----------|--------|---------------|
| 480×480 | 1:1 (square) | Up to 4 |
| 480×854 | 9:16 (portrait) | Up to 4 |
| 854×480 | 16:9 (landscape) | Up to 4 |
| 720×720 | 1:1 | Up to 4 |
| 720×1280 | 9:16 (portrait) | Up to 2 |
| 1280×720 | 16:9 (landscape) | Up to 2 |
| 1080×1080 | 1:1 | Disabled |
| 1080×1920 | 9:16 | Disabled |
| 1920×1080 | 16:9 | Disabled |

> At 1080p, multi-variant is disabled. For faster iteration, use 720p with 2 variants.

## Content Restrictions (Verified from Azure docs)

These are **hard blocks** — prompts violating them will be rejected:

1. **Copyrighted characters** and copyrighted music → rejected
2. **Real people** including public figures → rejected
3. **Input images with human faces** → currently rejected
4. **IP and photorealistic content** of real people → blocked by RAI

## Prompt Engineering Best Practices

### Structure your prompts with:
1. **Subject** — who/what is in the scene
2. **Action** — what is happening (motion is key for video)
3. **Environment** — where the scene takes place
4. **Camera** — movement, angle, framing
5. **Lighting** — time of day, mood, direction
6. **Style** — cinematic, documentary, animation, etc.

For Slate scene planning, also capture the five-aspect visual spec from
`skills/core/precise-video-language.md` before generation. The Sora prompt can
be prose, but the underlying decision should explicitly name `subject`,
`scene`, `motion`, `spatial`, and `camera` so reviewers can detect prompt drift.

### Cinematic primitives that are usually safe

Use one or two of these at a time. Too many constraints reduce reliability.

| Primitive | Safer options |
|---|---|
| Shot size | wide shot, medium shot, close-up, macro detail |
| Camera movement | locked-off, slow dolly, gentle pan, slow push-in |
| Angle | eye-level, low angle, high angle, top-down, isometric |
| Focus | shallow depth of field, deep focus, rack focus to the subject |
| Reveal | foreground reveal, door/window reveal, push-in reveal |
| Motion style | slow motion, time lapse, smooth real-time motion |

Avoid precise multi-step choreography, left/right dependencies, and exact UI text in Sora prompts. Use deterministic components for those scenes.

### Proven prompt patterns:
```
A professional woman in a modern glass office giving a presentation
to a small group, camera slowly dollying right, warm afternoon light
through floor-to-ceiling windows, cinematic 4K quality
```

### Prompt pitfalls:
- ❌ **Abstract/metaphorical** → "data flowing through neural networks" (moderation block)
- ❌ **Named characters** → "Iron Man flying" (IP block)
- ❌ **Real people** → "Satya Nadella speaking" (rejected)
- ❌ **Excessive detail** → too many constraints reduce quality
- ✅ **Concrete physical scenes** → people, offices, cities, nature
- ✅ **Simple motion** → walking, typing, gesturing, camera pan
- ✅ **Environmental shots** → cityscapes, offices, labs, nature

### Character Consistency Across Scenes

Sora-2 does NOT have a built-in character reference system. To maintain visual consistency:

1. **Describe characters identically** in every prompt — same clothing, hair, age, build
2. **Use distinctive visual anchors** — "woman in red blazer", "man with silver glasses"
3. **Keep style consistent** — same lighting, camera style, environment mood
4. **Use image-to-video** when available — provide a reference frame
5. **Limit character count** — fewer characters = more consistent results

### Duration Strategy

- **4 seconds**: Single action, establishing shot, transition clip
- **8 seconds**: Conversation snippet, product demo, simple narrative
- **12 seconds**: Extended scene, environmental exploration
- **>12 seconds**: Split into multiple clips and concatenate

> Short clips (4-8s) are more reliable than long ones. Prefer multiple short clips over a single long one.

## Known Limitations (from Azure docs)

- Difficulty with **complex physics** and causal relationships
- **Spatial reasoning** issues (left/right confusion)
- **Time-based sequencing** of precise events unreliable
- **Camera movement** instructions may not be followed precisely
- Jobs expire after **24 hours** — download promptly
- Rate limit: **1 request per 60 seconds** per resource (Slate's deployment, capacity 1). Generation takes ~60–160s including poll wait.

## Slate Integration Notes

- Tool: `scripts/lib/video_gen.py` → `generate_video_clip()`
- Duration is snapped to nearest valid value via `_snap_duration()`
- Prompt sanitizer (`sanitize_video_prompt()`) rewrites abstract → concrete
- Fallback: FFmpeg test-pattern clip if generation fails
- Always mute Sora-2 audio and overlay TTS narration instead
- Cost: see `config/models.yaml` for current pricing
