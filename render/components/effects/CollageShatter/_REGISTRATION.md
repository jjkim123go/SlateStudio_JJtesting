# CollageShatter — Registration Artifacts

> Paste-ready blocks for central registration files.  
> Class prefix: `csh-`

---

## KNOWN_COMPONENTS entry

```js
'CollageShatter',
```

---

## Schema enum entry

```json
"CollageShatter",
```

---

## Schema $defs block

```json
"CollageShatterProps": {
  "type": "object",
  "properties": {
    "tileColumns": { "type": "number", "default": 4, "description": "Number of tile columns in the shatter grid." },
    "tileRows": { "type": "number", "default": 4, "description": "Number of tile rows in the shatter grid." },
    "color": { "type": "string", "default": "#0078D4", "description": "CSS color for the tile fill and reveal background." },
    "incomingImageSrc": { "type": "string", "default": "", "description": "Optional image path revealed behind the shattered tiles." },
    "spreadFactor": { "type": "number", "default": 1.5, "description": "Multiplier for how far tiles travel when shattering." }
  },
  "additionalProperties": false
}
```

---

## Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "CollageShatter" } } },
  "then": { "properties": { "props": { "$ref": "#/$defs/CollageShatterProps" } } }
}
```

---

## INDEX.md Layer 2 row

```markdown
| `components/collage-shatter` | CollageShatter component: shatter, glass break, tile explode, mosaic transition, dramatic reveal | [components/collage-shatter.md](core/components/collage-shatter.md) |
```

---

## Skill file content

**File:** `skills/core/components/collage-shatter.md`

```markdown
# CollageShatter

> **Trigger keywords:** shatter, glass break, tile explode, mosaic transition,
> collage shatter, dramatic reveal, break apart

## When to use

Use CollageShatter as a **bridge scene** between two acts when you want a
dramatic, high-energy break. The outgoing scene shatters into a grid of
tiles that fly outward with randomized rotation and scale while the incoming
scene's color/imagery fades up behind them.

**Duration range:** 1.2–1.6 s (works well at 1.4 s default).

### Alternatives

| Instead of… | Use when… |
|-------------|-----------|
| TransitionWipe | You want a clean directional wipe, not an explosion |
| DepthZoomPunch | You want a camera-punch depth zoom, not tiles |
| SectionDivider | You just need a brief label card, not a visual effect |

## Prop reference

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `tileColumns` | number | 4 | Grid columns (4×4 = 16 tiles). More tiles = finer shatter. |
| `tileRows` | number | 4 | Grid rows. |
| `color` | string | `#0078D4` | Fill color of tiles and reveal background. Use brand primary. |
| `incomingImageSrc` | string | `""` | Optional image revealed behind the shatter. |
| `spreadFactor` | number | 1.5 | Travel distance multiplier (1 = moderate, 2+ = dramatic). |

## Narration timing

CollageShatter is purely visual — no text or narration overlay. Place narration
in the scenes flanking the transition, not on the bridge scene itself.
If the bridge must carry narration, extend duration to ≥ 2.0 s.

## Example SCF snippet

```json
{
  "id": "act-break-1",
  "duration": 1.4,
  "component": "CollageShatter",
  "props": {
    "tileColumns": 4,
    "tileRows": 4,
    "color": "#0078D4",
    "spreadFactor": 1.5
  },
  "transition": "none"
}
```
```
