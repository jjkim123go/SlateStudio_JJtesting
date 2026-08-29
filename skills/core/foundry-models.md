# Azure AI Foundry Models

> **Lineage:** Model selection and provider-routing patterns carry
> implementation lineage from OpenMontage's media selectors (AGPL-3.0). Slate
> maps those patterns to Azure AI Foundry. See
> [`docs/OPENMONTAGE_LINEAGE.md`](../../docs/OPENMONTAGE_LINEAGE.md).

> Core skill — reference this when generating images, speech, or video via Foundry.
> For deep model-specific details, see Layer 3 skills in `skills/models/`.

## Available Models

| Model | Tool | Capability | Pricing Source |
|-------|------|-----------|---------------|
| `gpt-image-2` | `image_gen.py` | Image generation (all content types) | `config/models.yaml` |
| `azure-speech` (**default**) | `azure_speech_tts.py` / `tts_gen.py` | Text-to-speech — full live catalog (700+ voices, 150+ locales, DragonHD/Omni), styles, real word-timings | `config/models.yaml` |
| `gpt-4o-mini-tts` (fallback) | `tts_gen.py` | Text-to-speech fallback (6 voices) | `config/models.yaml` |
| `Sora 2` | `video_gen.py` | Video generation | `config/models.yaml` |

> **Pricing is externalized** — costs live in `config/models.yaml`, loaded by `scripts/lib/model_registry.py`.
> Update the YAML when models or pricing change — no code changes needed.

---

## Image Generation — gpt-image-2

All AI image generation uses gpt-image-2. Structured content (code, tables,
charts, UI mockups) routes to Pillow tools via `model_hint="structured"`.

### Prompt Engineering Tips

Write prompts that are **specific, visual, and compositional**:
1. **Subject** — what is the main focus?
2. **Style** — illustration, photography, 3D render, flat design?
3. **Composition** — camera angle, framing, layout
4. **Lighting** — soft, dramatic, studio, natural
5. **Color palette** — specific hex codes for brand consistency
6. **Context/background** — environment, setting

### Style Consistency

When generating multiple images for the same video:
- Reuse the same style descriptor across all prompts
- Specify the same color palette (use hex codes)
- Keep the same lighting direction and mood
- "Consistent with previous scenes" is NOT sufficient — be explicit each time

> For model-specific prompt tips: `skills/models/gpt-image-2.md`

---

## Text-to-Speech — Azure AI Speech (default) · gpt-4o-mini-tts (fallback)

**Azure AI Speech is the default narration engine** (the `azure_speech_tts` tool
and the `generate_tts` router). It exposes the FULL live catalog — 700+ neural
voices across 150+ locales (DragonHD / Dragon HD Omni), speaking styles, and
**real word-level timings** for captions. Pick any voice by name (e.g.
`en-US-Andrew:DragonHDLatestNeural`); use `action=list_voices` to browse/filter
by locale / accent / gender / HD tier / style. Override the default voice with
`SLATE_TTS_VOICE`, the engine with `SLATE_TTS_ENGINE`. `gpt-4o-mini-tts` is the
6-voice **fallback** below.

### gpt-4o-mini-tts voices (fallback)

| Voice ID | Character | Best For |
|----------|-----------|----------|
| `nova` | Measured, warm, clear | Narration, explainers (DEFAULT) |
| `fable` | Relaxed, storytelling | Tutorials, informative |
| `shimmer` | Conversational, friendly | Onboarding, customer-facing |
| `echo` | Professional, clear | Corporate, authoritative |
| `onyx` | Deep, engaging | Marketing, dramatic |
| `coral` | Professional, warm | General professional |

### Video-Type Voice Selection

Slate auto-selects voices based on video type (see `VIDEO_TYPE_VOICES` in `tts_gen.py`):

| Video Type | Voices (cycled per scene) |
|------------|--------------------------|
| `explainer` | nova, fable |
| `corporate` | nova, echo |
| `tutorial` | shimmer, nova |
| `marketing` | shimmer, onyx |
| `internal` | fable, nova |
| `onboarding` | shimmer, nova |

### Narration Timing

- Average rate: ~150 words per minute at default speed
- 60-second video needs ~150 words of narration
- Leave ~0.5-1.0s at scene boundaries for pacing

> For full voice details and instructions usage: `skills/models/gpt-4o-mini-tts.md`

---

## Video Generation — `Sora 2`

### When to Use Video Generation

Video generation is expensive. Prefer image + animation in most cases:
- ✅ Abstract motion, product demos with movement, fluid motion scenes
- ❌ Static content, text-heavy scenes, simple transitions

### Key Constraints
- Durations: exactly 4, 8, or 12 seconds. Use `_snap_duration()` in `scripts/lib/video_gen.py` when the requested duration is not one of those values.
- Enabled high-quality resolutions are 1280x720 landscape and 720x1280 portrait. 1920x1080 is disabled for Slate's current Sora deployment.
- Sora generates audio in output clips. Always mute or strip Sora audio before overlaying Slate narration.
- No copyrighted characters, no real people, and no faces in input images.
- Use concrete physical scenes. Rewrite abstract metaphors such as "data stream" or "neural network" before generation.

> For full Sora-2 details: `skills/models/sora-2.md`

---

## Cost Awareness

All costs are externalized in `config/models.yaml` and loaded by `scripts/lib/model_registry.py`.
To update pricing, edit the YAML — no code changes needed.

### Cost-Saving Strategies

1. Use standard quality images unless full-screen hero content
2. Reuse background images across scenes with different text overlays
3. Prefer HyperFrames animations over Sora 2 — animation is free
4. Batch similar image requests — review for duplicates first
5. Generate narration in full rather than per-scene for consistent tone

Always request `verbose` format when you need timestamps for subtitle alignment.

---

## Cost Awareness

### Estimating Before Generating

Before generating any assets, estimate the total cost. **Always defer to
`config/models.yaml` for authoritative per-model pricing** — the values below
reflect that file at time of writing and may drift; sync any changes to the
registry, not here.

```
Images (gpt-image-2):   [count] × $0.04                 = $___
TTS:                     [seconds] × $0.001              = $___
Video (Sora-2):          [seconds] × $0.20               = $___
Transcription:           [minutes] × $0.006              = $___
                                                   Total = $___
```

**Typical costs for a 60-second animated explainer (no AI video):**
- 6–8 background images (~$0.04 each): $0.24–$0.32
- 60 seconds narration: $0.06
- 1 minute transcription for subtitles: $0.006
- 0 seconds Sora-2 (use HyperFrames animations instead): $0.00
- **Total: ~$0.31–$0.47**

### Cost-Saving Strategies

1. **Use standard quality images** unless the image is full-screen hero content
2. **Reuse background images** across scenes with different text overlays
3. **Prefer HyperFrames animations over Sora 2** — animation is free, video generation is not
4. **Batch similar image requests** — write all prompts first, review for duplicates, then generate
5. **Generate narration in full** rather than per-scene when tone is consistent — fewer API calls, better pacing
