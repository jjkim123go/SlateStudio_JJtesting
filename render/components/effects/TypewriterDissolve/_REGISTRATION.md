# TypewriterDissolve — Registration Snippets

> Paste-ready snippets for the consolidation person. Do NOT edit the target
> files yourself — hand these blocks to whoever maintains the registries.

---

## 1. KNOWN_COMPONENTS entry

**File:** `render/lib/scf-to-html.mjs` — inside the `new Set([…])` block.

```js
  'TypewriterDissolve',
```

Place after `'FilmstripFlip'` (or after `'TransitionWipe'` if the others aren't merged yet).

---

## 2. Schema — component enum entry

**File:** `schemas/scf-v1.0.schema.json` — inside `$defs.Scene.properties.component.enum`.

```json
            "TypewriterDissolve",
```

---

## 3. Schema — `$defs` block

**File:** `schemas/scf-v1.0.schema.json` — inside `$defs`.

```json
    "TypewriterDissolveProps": {
      "type": "object",
      "properties": {
        "color": {
          "type": "string",
          "default": "#0078D4",
          "description": "CSS color for the monospace text characters"
        },
        "cursorColor": {
          "type": "string",
          "default": "#ffffff",
          "description": "CSS color for the blinking cursor"
        },
        "cols": {
          "type": "number",
          "default": 40,
          "minimum": 10,
          "maximum": 80,
          "description": "Number of columns in the character grid"
        },
        "rows": {
          "type": "number",
          "default": 22,
          "minimum": 5,
          "maximum": 40,
          "description": "Number of rows in the character grid"
        },
        "deleteOffset": {
          "type": "number",
          "default": 200,
          "minimum": 0,
          "maximum": 1000,
          "description": "Milliseconds offset between delete and retype waves"
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
          "if": { "properties": { "component": { "const": "TypewriterDissolve" } }, "required": ["component"] },
          "then": { "properties": { "props": { "$ref": "#/$defs/TypewriterDissolveProps" } } }
        },
```

---

## 5. INDEX.md — Layer 2 component row

**File:** `skills/INDEX.md` — in the "Layer 2 — Component skills" table.

```markdown
| `components/typewriter-dissolve` | [`skills/core/components/typewriter-dissolve.md`](core/components/typewriter-dissolve.md) | typewriter, monospace, character grid, terminal dissolve, retro text, "type out", "retype", "dissolve to text", delete wave, retype wave, matrix-style, bridge scene, act transition, section transition. Full-screen bridge: a monospace character grid deletes then retypes with a blinking cursor |
```

---

## 6. Skill file content

**File:** `skills/core/components/typewriter-dissolve.md`

```markdown
# TypewriterDissolve — component skill

> Full-screen bridge transition. A monospace character grid dissolves
> outgoing "text" left-to-right with a blinking cursor, then retypes
> incoming characters with a configurable offset between the two waves.
> Evokes a retro terminal / hacker-film aesthetic.

## When to use

* Act breaks or topic transitions in technical/developer-focused videos
* "Terminal reboot" metaphor — clearing the old, typing the new
* Works best when the surrounding scenes have a technical or data feel
* Use sparingly — 1–3 per video at major topic boundaries

## Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `color` | CSS color string | `"#0078D4"` | Character color |
| `cursorColor` | CSS color string | `"#ffffff"` | Blinking cursor color |
| `cols` | number (10–80) | `40` | Grid columns |
| `rows` | number (5–40) | `22` | Grid rows |
| `deleteOffset` | number (0–1000) | `200` | ms offset between delete & retype waves |

## Duration guidance

Recommended scene duration: **3–4 seconds**.
Below 2.0s the delete/retype rhythm is too fast to read; above 5s it drags.
The character grid is ~880 cells at defaults (40×22), so stagger timing
scales with SCENE_DURATION automatically.

## SCF example

\`\`\`json
{
  "id": "terminal-bridge",
  "duration": 3.5,
  "component": "TypewriterDissolve",
  "props": {
    "color": "#00ff88",
    "cursorColor": "#ffffff",
    "cols": 40,
    "rows": 22,
    "deleteOffset": 200
  },
  "transition": "crossfade"
}
\`\`\`

## Implementation notes

* Characters are plain `<span>` elements in a CSS grid — no SplitText
  plugin (which is on the excluded-plugin list).
* Delete wave: staggered `autoAlpha: 1→0`, left-to-right, top-to-bottom.
* Retype wave: staggered `autoAlpha: 0→1` with configurable ms offset.
* Cursor blinks via rapid `autoAlpha` pulses (no `setInterval`).
* Character set is deterministic (no `Math.random()`).
* Cell size auto-scales to fill 1920×1080 viewport.
* Exit fade lands ≥ 0.35s before scene end.
* Class prefix: `td-` (registered in CONTRACT.md §5).
```
