# gpt-image-2 — Model Skill

> **Layer 3** — model-specific. Load when generating images via
> `foundry_image_gen` or `scripts/lib/image_gen.py`.

## Identity

| Field | Value |
|-------|-------|
| Model | gpt-image-2 |
| Deployment name | `gpt-image-2` |
| Provider | OpenAI (Azure AI Foundry) |
| API version | `2025-04-01-preview` |
| Tool | `scripts/lib/image_gen.py` → `generate_ai_image()` |
| Cost | ~$0.04 / image (from `config/models.yaml`) |

---

## Capabilities

gpt-image-2 is a universal image generation model that excels at
**everything**: photorealistic faces, environments, creative art,
text-in-image, infographics, and 4K output. There is no need for
multi-model routing — gpt-image-2 is the only AI image model in
Slate's pipeline.

| Content type | Quality | Notes |
|-------------|---------|-------|
| Faces, portraits, headshots | Excellent | Exceptional photorealism |
| Environments, products, scenes | Excellent | High-fidelity scene generation |
| Creative, artistic, abstract | Excellent | Strong stylistic range |
| Text-in-image, infographics | Excellent | Reliable text rendering |
| 4K output | Supported | Arbitrary multiples of 16 up to 4K |

---

## Parameters

| Parameter | Type | Values | Default | Notes |
|-----------|------|--------|---------|-------|
| `size` | string | `1024x1024`, `1024x1536`, `1536x1024` (presets); supports arbitrary multiples of 16 up to 4K | `1024x1024` | Pick the aspect ratio that fits the scene |
| `quality` | string | `low`, `medium`, `high` | `high` | Do NOT use `auto`, `standard`, or `hd` — they are invalid |
| `output_format` | string | `png`, `jpeg` | `png` | Use `jpeg` for smaller files when transparency is not needed |
| `background` | string | `auto`, `transparent` | `auto` | Use `transparent` for overlay assets (logos, icons) |

---

## Routing

gpt-image-2 is the sole AI image model. The `model_hint` parameter is
only meaningful for routing to **Pillow** structured visuals:

| `model_hint` value | Effect |
|--------------------|--------|
| `"structured"` | Routes to `structured_image` tool (Pillow) — zero cost, deterministic |
| Any other value / omitted | Routes to gpt-image-2 |

---

## Fallback Chain

```
gpt-image-2 (with retry) → Pillow placeholder slide
```

If gpt-image-2 fails after retry, the pipeline falls back to a
deterministic Pillow slide so the scene is never silently dropped (P12).

---

## Prompt Engineering Tips

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

---

## API Quirks

- `quality`: Only `low`, `medium`, `high` — NOT `auto`, NOT `standard`/`hd`
- `size`: Supports arbitrary multiples of 16 up to 4K, but use the standard
  presets (`1024x1024`, `1024x1536`, `1536x1024`) unless you need a specific
  resolution
- API version: `2025-04-01-preview`
- Auth: Bearer token from `az account get-access-token --resource https://cognitiveservices.azure.com`
- Windows: Use `shell=True` for `az` subprocess calls (`az.cmd` requires it)
