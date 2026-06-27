# KNOWN_COMPONENTS entry

```js
'ParticleAssemble',
```

# Schema enum entry

```json
"ParticleAssemble",
```

# Schema $defs block

```json
"ParticleAssembleProps": {
  "type": "object",
  "properties": {
    "assembledImageSrc": {
      "type": "string",
      "description": "Transparent PNG/SVG assembled at the end of the particle converge."
    },
    "particleCount": {
      "type": "integer",
      "minimum": 24,
      "maximum": 360,
      "default": 200
    },
    "particleColor": {
      "type": "string",
      "default": "#ffffff"
    },
    "assemblyDuration": {
      "type": "number",
      "minimum": 0.5,
      "maximum": 6,
      "default": 1.5
    }
  },
  "additionalProperties": false
}
```

# Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "ParticleAssemble" } }, "required": ["component"] },
  "then": { "properties": { "props": { "$ref": "#/$defs/ParticleAssembleProps" } } }
}
```

# INDEX.md Layer 2 row

```md
| `components/particle-assemble` | [`skills/core/components/particle-assemble.md`](core/components/particle-assemble.md) | particle assemble, logo build, wordmark reveal, particles converge, icon assembles, burst into logo, brand mark formation |
```

# Skill file content

```md
# ParticleAssemble Component

> Layer 2 component skill. Load when a scene needs a **logo / wordmark / icon to form out of flying particles** inside the scene rather than as a bridge transition.

## When to use

Triggers: `particle assemble, logo reveal, wordmark reveal, particles converge, icon forms, brand burst, emblem materializes, mark assembles`.

Pick **ParticleAssemble** when the beat is about **formation** — scattered energy resolving into a final mark. Use it for brand tags, chapter-end logo hits, product lockups, or icon reveals that should feel premium but still deterministic.

## Props

```json
{
  "assembledImageSrc": "assets/brand/mark.png",
  "particleCount": 200,
  "particleColor": "#ffffff",
  "assemblyDuration": 1.5
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `assembledImageSrc` | string | no | Transparent PNG/SVG for the resolved mark. If omitted, the component falls back to a built-in SLATE plate so it still renders standalone. |
| `particleCount` | integer | no | Default `200`. Clamped to `24–360` for performance. |
| `particleColor` | string | no | Particle fill color. Default white; map to brand accent for brand-led reveals. |
| `assemblyDuration` | number | no | Default `1.5`. The component clamps to available `SCENE_DURATION`. |

## Animation contract

| Step | Time | Effect |
|------|------|--------|
| Build particle field | `SCENE_START + 0.01s` | Deterministically seeds scattered particles and target cells. |
| Scatter → curve | first 72% of `assemblyDuration` | Particles fly in from seeded offsets, rotations, and scales, easing toward curved midpoints. |
| Curve → lock | final 28% of `assemblyDuration` | Particles settle to the assembled silhouette. |
| Resolve image | late in assembly | Final image (or fallback plate) fades up as particles soften. |
| Hold | remainder of scene | Built mark holds until scene wrapper fades. |

## Direction notes

- Best in **2.5s+** scenes so the audience can register the resolved mark.
- Keep `particleColor` bright against dark scenes for readability.
- Use the scene's own narration beat or a companion **GlitchPulse** / **ShakeImpact** if the mark lands on a verbal emphasis.

## Provenance

- Name + core behavior: user-assigned PR brief for intra-scene effects.
- Deterministic seeded particle scatter: required by brief.
- Fallback SLATE plate: implementation choice so the component renders standalone with missing props.
```
