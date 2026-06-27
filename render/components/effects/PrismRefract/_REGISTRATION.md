# KNOWN_COMPONENTS entry

'PrismRefract',

# Schema enum entry

"PrismRefract",

# Schema $defs block

```json
"PrismRefractProps": {
  "type": "object",
  "properties": {
    "outgoingSrc": {
      "type": "string",
      "default": "",
      "description": "Optional path or URL for the outgoing scene artwork."
    },
    "incomingSrc": {
      "type": "string",
      "default": "",
      "description": "Optional path or URL for the incoming scene artwork."
    },
    "headline": {
      "type": "string",
      "default": "Spectrum resolves",
      "description": "Large headline shown while the rainbow bands sweep."
    },
    "subline": {
      "type": "string",
      "default": "Color bands sweep through frame, then collapse into a single unified scene.",
      "description": "Supporting copy beneath the headline."
    }
  },
  "additionalProperties": false
}
```

# Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "PrismRefract" } }, "required": ["component"] },
  "then": { "properties": { "props": { "$ref": "#/$defs/PrismRefractProps" } } }
}
```

# INDEX.md Layer 2 row

```md
| `components/prism-refract` | [`skills/core/components/prism-refract.md`](components/prism-refract.md) | prism, refraction, rainbow transition, spectrum sweep, color bands, refract, light split, resolving rainbow bridge |
```

# Skill file content

```md
# PrismRefract Component

> Layer 2 component skill. Load when the transition should feel luminous,
> branded, and cinematic — like light refracting through a prism before
> resolving into the next act.

## When to use

**Trigger vocabulary:** `prism, refraction, rainbow sweep, spectrum, color
bands, refract, resolve into, chromatic transition, light split`.

Choose `PrismRefract` when the transition itself should carry energy and
brand color — launch videos, product reveals, AI stories, and motion-led
explainers benefit most.

Use `PageTurn` when you want tactile / physical storytelling. Use
`TransitionWipe` when you want a simpler chapter card. Use `IrisZoom` when
you want the audience's attention to collapse onto — and reopen from — a
specific focal point.

## Props

```json
{
  "outgoingSrc": "file:///C:/Projects/Slate/assets/scene-a.png",
  "incomingSrc": "file:///C:/Projects/Slate/assets/scene-b.png",
  "headline": "Spectrum resolves",
  "subline": "Brand-color bands sweep across frame, then resolve into the new image."
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `outgoingSrc` | string | no | Optional outgoing artwork. Falls back to a dark editorial plate. |
| `incomingSrc` | string | no | Optional incoming artwork. Falls back to a blue-magenta gradient plate. |
| `headline` | string | no | Large copy block shown while the spectrum forms. |
| `subline` | string | no | Supporting copy. Keep ≤ 110 chars. |

## Narration timing notes

- Recommended scene duration: **1.4–1.8s**.
- Let the spoken pivot begin immediately; the first stressed noun should land
  as the earliest bands enter (**0.10–0.20s**).
- If narration says a phrase like "split into" / "refract into" / "resolve
  into", align **resolve** to the band collapse near the last third.
- Avoid long sentences here — this bridge works best with a short clause or
  no narration at all.

## Example SCF snippet

```json
{
  "id": "launch-spectrum-bridge",
  "duration": 1.6,
  "component": "PrismRefract",
  "props": {
    "headline": "Product reveal",
    "subline": "Eight spectrum bands sweep through, then resolve to the next chapter."
  }
}
```
```
