# KNOWN_COMPONENTS entry

```js
'GlitchPulse',
```

# Schema enum entry

```json
"GlitchPulse",
```

# Schema $defs block

```json
"GlitchPulseProps": {
  "type": "object",
  "properties": {
    "triggerSec": {
      "type": "number",
      "minimum": 0,
      "default": 0.3
    },
    "intensity": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "default": "medium"
    },
    "color1": {
      "type": "string",
      "default": "#00e5ff"
    },
    "color2": {
      "type": "string",
      "default": "#ff3ad8"
    }
  },
  "additionalProperties": false
}
```

# Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "GlitchPulse" } }, "required": ["component"] },
  "then": { "properties": { "props": { "$ref": "#/$defs/GlitchPulseProps" } } }
}
```

# INDEX.md Layer 2 row

```md
| `components/glitch-pulse` | [`skills/core/components/glitch-pulse.md`](core/components/glitch-pulse.md) | glitch pulse, rgb split, scanline glitch, reveal hit, digital distortion, punctuate beat, scan sweep |
```

# Skill file content

```md
# GlitchPulse Component

> Layer 2 component skill. Load when a scene needs a **brief transparent glitch overlay** to punctuate a reveal, beat, or impact without becoming a full transition.

## When to use

Triggers: `glitch pulse, rgb split, scanline hit, digital distortion, reveal hit, scan sweep, glitch beat, cyber flicker`.

Pick **GlitchPulse** when the scene already has content underneath and you only need a **0.4–0.6 second punctuation hit**. It is not a bridge transition and should not own the base visual.

## Props

```json
{
  "triggerSec": 0.3,
  "intensity": "medium",
  "color1": "#00e5ff",
  "color2": "#ff3ad8"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `triggerSec` | number | no | Offset from scene start. Default `0.3`. |
| `intensity` | enum | no | `low`, `medium`, `high`. Controls duration, RGB offset, and overlay strength. |
| `color1` | string | no | First channel tint. Default cyan. |
| `color2` | string | no | Second channel tint. Default magenta. |

## Animation contract

| Step | Time | Effect |
|------|------|--------|
| Clone underlying scene | `SCENE_START + 0.02s` | Deterministically duplicates scene children into overlay shells (excluding the GlitchPulse root). |
| RGB split kick | at `triggerSec` | Cyan/magenta channels offset horizontally while a neutral brightened copy lifts the base. |
| Noise burst | same window | Screen-blended noise and clipped bands flash on top. |
| Scan sweep | mid pulse | Bright scan bar traverses the frame. |
| Resolve | end of pulse | Channels collapse back to clean and overlay fades out. |

## Direction notes

- Keep it rare: usually **one hit per scene**.
- Pair with copy like “and that’s the switch” / “watch the reveal” / “the system snaps into place.”
- Because this is an overlay, put the owned content in a separate layer/component underneath.

## Provenance

- Name + prop surface: user-assigned PR brief.
- Clone-based overlay approach: implementation choice to honor “underlying content shows through” without changing SCF slot semantics.
- Cyan / magenta defaults: explicit brief requirement.
```
