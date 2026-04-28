# gpt-4o-mini-tts — Text-to-Speech (Layer 3 Skill)

> Deep model-specific knowledge sourced from official Azure documentation.
> Source: https://learn.microsoft.com/en-us/azure/ai-services/openai/text-to-speech-quickstart

## Model Identity

| Field | Value |
|-------|-------|
| Model | gpt-4o-mini-tts |
| Provider | OpenAI (via Azure AI Foundry) |
| Deployment name | `gpt-4o-mini-tts` |
| API version | `2025-01-01-preview` |
| Auth scope | `https://cognitiveservices.azure.com` |
| Output format | WAV (default), MP3, OPUS, FLAC |

## Available Voices (Slate deployment)

The Slate deployment of `gpt-4o-mini-tts` exposes **six voices**. The `alloy`
voice that exists on some other OpenAI TTS deployments is **NOT** available
on Slate's deployment — requesting it returns HTTP 404. The authoritative
list lives in `config/models.yaml` under `tts_models.gpt-4o-mini-tts.voices`.

| Voice ID | Character | Best For |
|----------|-----------|----------|
| `coral` | Professional, warm | Default narration, moderate pace |
| `echo` | Professional, clear | Corporate, authoritative |
| `fable` | Relaxed, storytelling | Narratives, tutorials |
| `onyx` | Deep, engaging | Marketing, dramatic |
| `nova` | Measured, warm | Narration, explainers |
| `shimmer` | Conversational, friendly | Tutorials, onboarding |

> **Slate mapping**: See `VIDEO_TYPE_VOICES` in `scripts/lib/tts_gen.py` for
> video-type → voice mapping. Source of truth for the voice list is
> `config/models.yaml`.

## Voice Instructions (gpt-4o-mini-tts exclusive)

The `gpt-4o-mini-tts` model supports an `instructions` parameter that controls delivery style.
This is **not available** on `tts-1` or `tts-1-hd`.

### Effective instruction patterns:

```
"Speak in a warm, professional tone at a measured pace. Emphasize key terms naturally."
```

```
"Read this as a conversational explainer, pausing slightly between sentences for clarity."
```

```
"Deliver with energy and enthusiasm, as if presenting to a live audience."
```

### Instruction pitfalls:
- ❌ Too vague: "Sound nice" → no effect
- ❌ Contradictory: "Speak quickly but take your time" → confused output
- ❌ Character acting: "Sound like Morgan Freeman" → may be ignored or block
- ✅ Concrete style: "Warm, professional, moderate pace, clear diction"
- ✅ Emotional guidance: "Speak with confidence and optimism"
- ✅ Pacing cues: "Pause briefly after each key point"

## Timing & Pacing

- **Average rate**: ~150 words per minute at default speed
- **60-second video** needs ~150 words of narration
- **Scene boundaries**: Leave ~0.5-1.0s silence for natural pacing
- OpenAI TTS may return `INT_MAX` for nframes in WAV header — calculate duration from file size instead
- Formula: `duration = (file_bytes - 44) / (sample_width × channels × sample_rate)`

## Quality Tips

1. **Clean input text** — remove markdown, URLs, code snippets before synthesis
2. **Punctuation matters** — commas create brief pauses, periods create longer ones
3. **Numbers** — write "twenty-five percent" not "25%" for reliable pronunciation
4. **Abbreviations** — spell out or hyphenate: "A-I" not "AI" if you want letter pronunciation
5. **Emphasis** — CAPS or *asterisks* don't reliably affect emphasis; use instructions instead
6. **Batch vs per-scene**: Per-scene gives better timing control; full-text gives more natural flow

## Cost

- See `config/models.yaml` for current pricing (loaded by model_registry.py)
- Silence fallback: $0.00 (generated locally via Pillow WAV)

## Slate Integration Notes

- Tool: `scripts/lib/tts_gen.py` → `generate_tts()`, `generate_scene_narrations()`
- Voice selection: `select_voice_for_scene(video_type, scene_index)` for auto-cycling
- `VIDEO_TYPE_VOICES` maps video types to preferred voice lists
- WAV duration fix handles OpenAI's INT_MAX nframes bug
- Fallback: silent WAV generated locally when API unavailable
