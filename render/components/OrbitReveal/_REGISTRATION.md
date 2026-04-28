# OrbitReveal — Registration Snippets

> Paste-ready snippets for the consolidation person. Do NOT edit the target
> files yourself — hand these blocks to whoever maintains the registries.

---

## 1. KNOWN_COMPONENTS entry

**File:** `render/lib/scf-to-html.mjs` — inside the `new Set([…])` block.

```js
  'OrbitReveal',
```

Place after the existing transition line (`'TransitionWipe'`).

---

## 2. Schema — component enum entry

**File:** `schemas/scf-v1.0.schema.json` — inside `$defs.Scene.properties.component.enum`.

```json
            "OrbitReveal",
```

Place after `"BookingsScene"` (the current last entry).

---

## 3. Schema — `$defs` block

**File:** `schemas/scf-v1.0.schema.json` — inside `$defs`, at the same level
as `PricingTableProps`, `TerminalCastProps`, etc.

```json
    "OrbitRevealProps": {
      "type": "object",
      "properties": {
        "direction": {
          "type": "string",
          "enum": ["clockwise", "counterclockwise"],
          "default": "clockwise",
          "description": "Spiral rotation direction"
        },
        "color": {
          "type": "string",
          "default": "#0078D4",
          "description": "CSS color for the comet and trail particles"
        },
        "trailCount": {
          "type": "number",
          "default": 18,
          "minimum": 1,
          "maximum": 40,
          "description": "Number of trailing particles behind the comet"
        },
        "spiralTurns": {
          "type": "number",
          "default": 2.5,
          "minimum": 0.5,
          "maximum": 5,
          "description": "Number of full spiral revolutions"
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
          "if": { "properties": { "component": { "const": "OrbitReveal" } }, "required": ["component"] },
          "then": { "properties": { "props": { "$ref": "#/$defs/OrbitRevealProps" } } }
        },
```

Place after the last existing entry (currently `AnimatedCaption`).

---

## 5. INDEX.md — Layer 2 component row

**File:** `skills/INDEX.md` — in the "Layer 2 — Component skills" table.

```markdown
| `components/orbit-reveal` | [`skills/core/components/orbit-reveal.md`](core/components/orbit-reveal.md) | orbit, spiral, comet trail, radial reveal, cosmic reveal, particle trail, "orbit in", "spiral open", bridge scene, act transition, section transition. Full-screen bridge: a comet spirals outward leaving a brand-colored particle trail while a radial clip-path mask reveals the incoming scene |
```

---

## 6. Skill file content

**File:** `skills/core/components/orbit-reveal.md`

```markdown
# OrbitReveal — component skill

> Full-screen bridge transition. A luminous point spirals outward along a
> logarithmic path, trailing brand-colored particles. A growing radial
> clip-path mask reveals the incoming scene as the spiral expands.

## When to use

* Act breaks, chapter transitions, section dividers where the outgoing
  content should "dissolve" into the incoming content with kinetic energy
* When the brand wants a premium, cinematic feel
* Use sparingly — 1–3 per video at major topic boundaries

## Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `direction` | `"clockwise"` \| `"counterclockwise"` | `"clockwise"` | Spiral rotation direction |
| `color` | CSS color string | `"#0078D4"` | Comet & particle color (brand primary recommended) |
| `trailCount` | number (1–40) | `18` | Number of trailing particles |
| `spiralTurns` | number (0.5–5) | `2.5` | Full spiral revolutions |

## Duration guidance

Recommended scene duration: **2–4 seconds**.
The animation is authored to scale to SCENE_DURATION — shorter feels snappier,
longer feels more epic. Below 1.6s the spiral looks rushed; above 5s it drags.

## SCF example

\`\`\`json
{
  "id": "act-break-1",
  "duration": 3,
  "component": "OrbitReveal",
  "props": {
    "direction": "clockwise",
    "color": "#0078D4",
    "trailCount": 18,
    "spiralTurns": 2.5
  },
  "transition": "crossfade"
}
\`\`\`

## Implementation notes

* Spiral waypoints are pre-computed in JS (no MotionPath plugin).
* Mask uses `clipPath: circle()` — GPU-composited.
* Trail particles use staggered `autoAlpha` with index-based delay.
* Exit fade lands ≥ 0.35s before scene end.
* Class prefix: `or-` (registered in CONTRACT.md §5).
```
