# DepthZoomPunch — Registration Artifacts

> Paste-ready blocks for central registration files.  
> Class prefix: `dzp-`

---

## KNOWN_COMPONENTS entry

```js
'DepthZoomPunch',
```

---

## Schema enum entry

```json
"DepthZoomPunch",
```

---

## Schema $defs block

```json
"DepthZoomPunchProps": {
  "type": "object",
  "properties": {
    "outgoingImageSrc": { "type": "string", "default": "", "description": "Image for the outgoing scene." },
    "incomingImageSrc": { "type": "string", "default": "", "description": "Image for the incoming scene." },
    "outgoingColor": { "type": "string", "default": "#1a1a2e", "description": "CSS color fallback for outgoing layer." },
    "incomingColor": { "type": "string", "default": "#0078D4", "description": "CSS color fallback for incoming layer." },
    "flashColor": { "type": "string", "default": "#ffffff", "description": "CSS color for the midpoint flash." },
    "flashDuration": { "type": "number", "default": 0.06, "description": "Duration of the midpoint flash in seconds." },
    "maxBlur": { "type": "number", "default": 20, "description": "Peak Gaussian blur in pixels." }
  },
  "additionalProperties": false
}
```

---

## Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "DepthZoomPunch" } } },
  "then": { "properties": { "props": { "$ref": "#/$defs/DepthZoomPunchProps" } } }
}
```

---

## INDEX.md Layer 2 row

```markdown
| `components/depth-zoom-punch` | DepthZoomPunch component: camera punch, depth zoom, zoom burst, payoff moment, flash transition | [components/depth-zoom-punch.md](core/components/depth-zoom-punch.md) |
```

---

## Skill file content

**File:** `skills/core/components/depth-zoom-punch.md`

```markdown
# DepthZoomPunch

> **Trigger keywords:** camera punch, depth zoom, zoom burst, payoff moment,
> flash transition, zoom punch, dramatic zoom, impact zoom

## When to use

Use DepthZoomPunch as a **bridge scene** to "earn" a payoff moment — the
outgoing content rushes forward into blur while the incoming scene zooms in
from depth, separated by a brief white flash. Feels like a camera snap-zoom.

**Duration range:** 1.0–1.4 s (works well at 1.2 s default).

### Alternatives

| Instead of… | Use when… |
|-------------|-----------|
| CollageShatter | You want tiles/glass-break rather than depth zoom |
| TransitionWipe | You want a clean directional wipe |
| SwirlVortex | You want a spinning vortex rather than depth punch |

## Prop reference

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `outgoingImageSrc` | string | `""` | Image for the outgoing layer. Solid color fallback if empty. |
| `incomingImageSrc` | string | `""` | Image for the incoming layer. |
| `outgoingColor` | string | `#1a1a2e` | Solid color for the outgoing layer. |
| `incomingColor` | string | `#0078D4` | Solid color for the incoming layer. |
| `flashColor` | string | `#ffffff` | Midpoint flash color. Use `#ffffff` for standard punch, `#000000` for dramatic cut. |
| `flashDuration` | number | `0.06` | Flash duration in seconds. Keep ≤ 0.1 s for punch feel. |
| `maxBlur` | number | `20` | Peak blur in px. Higher = more dramatic depth feel. |

## Narration timing

Like all bridge transitions, DepthZoomPunch is best used without narration.
The flash-and-zoom is too fast for spoken content. If narration must overlap,
ensure the key word doesn't land on the flash (±100 ms around midpoint).

## Example SCF snippet

```json
{
  "id": "payoff-punch",
  "duration": 1.2,
  "component": "DepthZoomPunch",
  "props": {
    "outgoingColor": "#1a1a2e",
    "incomingColor": "#0078D4",
    "flashColor": "#ffffff",
    "maxBlur": 20
  },
  "transition": "none"
}
```
```
