# FilmstripFlip — Registration Snippets

> Paste-ready snippets for the consolidation person. Do NOT edit the target
> files yourself — hand these blocks to whoever maintains the registries.

---

## 1. KNOWN_COMPONENTS entry

**File:** `render/lib/scf-to-html.mjs` — inside the `new Set([…])` block.

```js
  'FilmstripFlip',
```

Place after `'OrbitReveal'` (or after `'TransitionWipe'` if OrbitReveal isn't merged yet).

---

## 2. Schema — component enum entry

**File:** `schemas/scf-v1.0.schema.json` — inside `$defs.Scene.properties.component.enum`.

```json
            "FilmstripFlip",
```

---

## 3. Schema — `$defs` block

**File:** `schemas/scf-v1.0.schema.json` — inside `$defs`.

```json
    "FilmstripFlipProps": {
      "type": "object",
      "properties": {
        "direction": {
          "type": "string",
          "enum": ["flip-left", "flip-right", "flip-up", "flip-down"],
          "default": "flip-left",
          "description": "Flip direction — horizontal or vertical"
        },
        "color": {
          "type": "string",
          "default": "#0078D4",
          "description": "CSS accent color for the edge frame at the flip midpoint"
        },
        "perspective": {
          "type": "number",
          "default": 1200,
          "minimum": 400,
          "maximum": 3000,
          "description": "CSS perspective value in pixels"
        }
      },
      "additionalProperties": false
    },
```

---

## 4. Schema — `allOf` oneOf entry

**File:** `schemas/scf-v1.0.schema.json` — inside `$defs.Scene.allOf`.

```json
        {
          "if": { "properties": { "component": { "const": "FilmstripFlip" } }, "required": ["component"] },
          "then": { "properties": { "props": { "$ref": "#/$defs/FilmstripFlipProps" } } }
        },
```

---

## 5. INDEX.md — Layer 2 component row

**File:** `skills/INDEX.md` — in the "Layer 2 — Component skills" table.

```markdown
| `components/filmstrip-flip` | [`skills/core/components/filmstrip-flip.md`](core/components/filmstrip-flip.md) | flip, card flip, filmstrip, 3D flip, "flip to the next", "turn the page", perspective flip, cinematic flip, film reel, bridge scene, act transition, section transition. Full-screen bridge: a 3D card flip with filmstrip sprocket holes and a swinging drop shadow |
```

---

## 6. Skill file content

**File:** `skills/core/components/filmstrip-flip.md`

```markdown
# FilmstripFlip — component skill

> Full-screen bridge transition. A 3D card flip with CSS perspective,
> filmstrip sprocket-hole decoration, and a cinematic drop shadow that
> swings as the card rotates. Supports horizontal and vertical flip
> directions.

## When to use

* Act breaks, chapter transitions where a "page turn" or "reveal" metaphor
  fits the narrative
* Works well for before/after, old→new, or "switching context" transitions
* Use sparingly — 1–3 per video at major topic boundaries

## Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `direction` | `"flip-left"` \| `"flip-right"` \| `"flip-up"` \| `"flip-down"` | `"flip-left"` | Flip axis and direction |
| `color` | CSS color string | `"#0078D4"` | Edge frame accent at the midpoint |
| `perspective` | number (400–3000) | `1200` | CSS perspective in px — lower = more dramatic |

## Duration guidance

Recommended scene duration: **2–3 seconds**.
Below 1.0s the flip looks jarring; above 4s it feels sluggish. The 3D
rotation is split into two halves (outgoing 0→90°, incoming –90→0°), each
taking ~25% of scene duration.

## SCF example

\`\`\`json
{
  "id": "chapter-flip",
  "duration": 2.5,
  "component": "FilmstripFlip",
  "props": {
    "direction": "flip-left",
    "color": "#0078D4",
    "perspective": 1200
  },
  "transition": "crossfade"
}
\`\`\`

## Implementation notes

* Uses `transform-style: preserve-3d` + `backface-visibility: hidden` for
  true 3D card flip — no Canvas or WebGL.
* Sprocket holes are decorative `div` elements, stagger-animated in/out.
* Shadow element animates `x`/`y` offset during flip for cinematic swing.
* Supports all four directions via `rotationY` (horizontal) or `rotationX`
  (vertical) — determined by `data-direction` attribute.
* Exit fade lands ≥ 0.35s before scene end.
* Class prefix: `ff-` (registered in CONTRACT.md §5).
```
