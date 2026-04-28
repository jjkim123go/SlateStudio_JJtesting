# SwirlVortex — Registration Artifacts

> Paste-ready blocks for central registration files.  
> Class prefix: `svx-`

---

## KNOWN_COMPONENTS entry

```js
'SwirlVortex',
```

---

## Schema enum entry

```json
"SwirlVortex",
```

---

## Schema $defs block

```json
"SwirlVortexProps": {
  "type": "object",
  "properties": {
    "outgoingColor": { "type": "string", "default": "#1a1a2e", "description": "CSS color for the outgoing layer." },
    "incomingColor": { "type": "string", "default": "#0078D4", "description": "CSS color for the incoming layer." },
    "brandColor": { "type": "string", "default": "#0078D4", "description": "CSS color for the radial vortex bands." },
    "bandCount": { "type": "number", "default": 6, "description": "Number of radial bands in the vortex." },
    "vortexRotation": { "type": "number", "default": 720, "description": "Total rotation in degrees for the vortex effect." }
  },
  "additionalProperties": false
}
```

---

## Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "SwirlVortex" } } },
  "then": { "properties": { "props": { "$ref": "#/$defs/SwirlVortexProps" } } }
}
```

---

## INDEX.md Layer 2 row

```markdown
| `components/swirl-vortex` | SwirlVortex component: vortex, swirl, spiral, whirlpool transition, radial spin | [components/swirl-vortex.md](core/components/swirl-vortex.md) |
```

---

## Skill file content

**File:** `skills/core/components/swirl-vortex.md`

```markdown
# SwirlVortex

> **Trigger keywords:** vortex, swirl, spiral, whirlpool, radial spin,
> tornado transition, spin transition, cyclone

## When to use

Use SwirlVortex as a **bridge scene** for a dramatic, energy-filled
transition. The outgoing content spirals into a center vortex of brand-colored
radial bands, then the vortex unfurls outward revealing the incoming content.
Best for creative / high-energy videos — product launches, teasers, recaps.

**Duration range:** 1.5–2.0 s (works well at 1.8 s default).

### Alternatives

| Instead of… | Use when… |
|-------------|-----------|
| CollageShatter | You want tiles flying outward, not a spiral |
| DepthZoomPunch | You want a fast camera-punch, not a vortex |
| TransitionWipe | You want a clean professional wipe |

## Prop reference

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `outgoingColor` | string | `#1a1a2e` | Solid color for the outgoing layer. |
| `incomingColor` | string | `#0078D4` | Solid color for the incoming layer. |
| `brandColor` | string | `#0078D4` | Color for the radial vortex bands. Use brand primary. |
| `bandCount` | number | `6` | Number of radial bands. More = denser vortex. 4–12 recommended. |
| `vortexRotation` | number | `720` | Total rotation degrees. 720 = two full spins. |

## Narration timing

SwirlVortex is a visual-only bridge. At 1.5–2.0 s it can technically carry
a short exclamation ("And now…") but generally keep narration in flanking
scenes. The spinning motion is visually dominant and competes with spoken
content.

## Example SCF snippet

```json
{
  "id": "act-break-vortex",
  "duration": 1.8,
  "component": "SwirlVortex",
  "props": {
    "brandColor": "#0078D4",
    "bandCount": 6,
    "vortexRotation": 720,
    "outgoingColor": "#1a1a2e",
    "incomingColor": "#0078D4"
  },
  "transition": "none"
}
```
```
