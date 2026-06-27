# KNOWN_COMPONENTS entry

```js
'ShakeImpact',
```

# Schema enum entry

```json
"ShakeImpact",
```

# Schema $defs block

```json
"ShakeImpactProps": {
  "type": "object",
  "properties": {
    "triggerSec": {
      "type": "number",
      "minimum": 0,
      "default": 0.5
    },
    "intensity": {
      "type": "string",
      "enum": ["subtle", "medium", "heavy"],
      "default": "medium"
    },
    "direction": {
      "type": "string",
      "enum": ["horizontal", "vertical", "both"],
      "default": "both"
    },
    "targetSelector": {
      "type": "string",
      "default": ".scene-{{sceneId}}"
    }
  },
  "additionalProperties": false
}
```

# Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "ShakeImpact" } }, "required": ["component"] },
  "then": { "properties": { "props": { "$ref": "#/$defs/ShakeImpactProps" } } }
}
```

# INDEX.md Layer 2 row

```md
| `components/shake-impact` | [`skills/core/components/shake-impact.md`](core/components/shake-impact.md) | shake impact, screen shake, stat hit, wow moment, punch hit, camera jolt, impact beat |
```

# Skill file content

```md
# ShakeImpact Component

> Layer 2 component skill. Load when a scene needs a **short visceral hit** on a number, claim, stat, or beat without cutting away.

## When to use

Triggers: `shake impact, screen shake, stat hit, wow moment, punch hit, impact beat, jolt, camera shake`.

Pick **ShakeImpact** when the emphasis is about **force** — a KPI lands, a chart spikes, or a dramatic phrase needs a tactile bump.

## Props

```json
{
  "triggerSec": 0.5,
  "intensity": "medium",
  "direction": "both",
  "targetSelector": ".scene-hero-stat"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `triggerSec` | number | no | Offset from scene start. Default `0.5`. |
| `intensity` | enum | no | `subtle`, `medium`, `heavy`. Controls travel and filter pump. |
| `direction` | enum | no | `horizontal`, `vertical`, `both`. Default `both`. |
| `targetSelector` | string | no | Selector to shake. Default `.scene-{{sceneId}}`. Use a narrower selector when only one region should move. |

## Animation contract

| Step | Time | Effect |
|------|------|--------|
| Kick | trigger | Fast first hit to peak amplitude in ~40ms. |
| Counter-shift | +40ms | Rebound to opposite side. |
| Decay | +90ms | Smaller third movement. |
| Settle | +150ms | Returns to clean by ~240ms total. |

The filter pump (`contrast` + `saturate`) is part of the effect, not optional. That is what makes the hit feel more visceral than translation alone.

## Direction notes

- Great on: revenue numbers, uptime claims, “10x faster” lines, before/after deltas.
- Use `horizontal` for UI scenes, `vertical` for bar/column hits, `both` for cinematic emphasis.
- Keep narration anchors tight — the shake works best on a stressed syllable or number.

## Provenance

- Name + props + filter pump requirement: user-assigned PR brief.
- Default `.scene-{{sceneId}}` target: explicit brief requirement.
```
