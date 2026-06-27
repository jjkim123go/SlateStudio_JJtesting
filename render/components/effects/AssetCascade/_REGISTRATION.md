# KNOWN_COMPONENTS entry

```js
'AssetCascade',
```

# Schema enum entry

```json
"AssetCascade",
```

# Schema $defs block

```json
"AssetCascadeProps": {
  "type": "object",
  "properties": {
    "images": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["src"],
        "properties": {
          "src": { "type": "string" },
          "alt": { "type": "string" }
        },
        "additionalProperties": false
      },
      "default": []
    },
    "layout": {
      "type": "string",
      "enum": ["fan", "grid", "stack"],
      "default": "fan"
    },
    "cascadeDuration": {
      "type": "number",
      "minimum": 0.1,
      "maximum": 4,
      "default": 0.4
    },
    "holdDuration": {
      "type": "number",
      "minimum": 0,
      "maximum": 10,
      "default": 1.5
    },
    "exitOnComplete": {
      "type": "boolean",
      "default": true
    }
  },
  "additionalProperties": false
}
```

# Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "AssetCascade" } }, "required": ["component"] },
  "then": { "properties": { "props": { "$ref": "#/$defs/AssetCascadeProps" } } }
}
```

# INDEX.md Layer 2 row

```md
| `components/asset-cascade` | [`skills/core/components/asset-cascade.md`](core/components/asset-cascade.md) | asset cascade, dealt cards, image fan, showcase images, photo cascade, card spread, gallery reveal |
```

# Skill file content

```md
# AssetCascade Component

> Layer 2 component skill. Load when a scene needs a **set of images to arrive as overlapping dealt cards** instead of static crossfades.

## When to use

Triggers: `asset cascade, dealt cards, image fan, photo spread, gallery reveal, showcase images, card stack, card fan`.

Pick **AssetCascade** for moodboards, product stills, customer logos with image treatments, photo-driven montage beats, or any scene where multiple visual assets need to feel choreographed and premium.

## Props

```json
{
  "images": [
    { "src": "assets/hero-01.jpg", "alt": "Workspace wide shot" },
    { "src": "assets/hero-02.jpg", "alt": "Close-up detail" }
  ],
  "layout": "fan",
  "cascadeDuration": 0.4,
  "holdDuration": 1.5,
  "exitOnComplete": true
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `images` | array | no | Array of `{src, alt}`. Component falls back to built-in placeholders if omitted so it still renders standalone. |
| `layout` | enum | no | `fan` (default), `grid`, or `stack`. |
| `cascadeDuration` | number | no | Per-card landing duration. Default `0.4`. |
| `holdDuration` | number | no | Hold after final landing. Default `1.5`. |
| `exitOnComplete` | boolean | no | When `true`, cards scatter away after the hold. |

## Animation contract

| Step | Time | Effect |
|------|------|--------|
| Build cards | `SCENE_START + 0.02s` | Creates positioned cards from the supplied image metadata. |
| Cascade in | staggered | Each card enters from above/off-axis and lands with `back.out(1.4)`. |
| Hold | after final landing | Final arrangement holds for the configured beat. |
| Exit scatter | optional | Cards scatter out with deterministic offsets if `exitOnComplete` is true. |

## Direction notes

- `fan` is the most cinematic default for 3–6 assets.
- `grid` reads best for evenly weighted screenshots or product stills.
- `stack` works when the content should feel like one pile being riffled.
- Because the component self-compresses to `SCENE_DURATION`, it can be used in short teaser scenes without manual timing math.

## Provenance

- Name + layouts + bounce easing + exit flag: user-assigned PR brief.
- Placeholder-card fallback: implementation choice so the component renders standalone with no supplied images.
```
