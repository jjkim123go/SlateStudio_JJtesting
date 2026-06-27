# KNOWN_COMPONENTS entry

'PageTurn',

# Schema enum entry

"PageTurn",

# Schema $defs block

```json
"PageTurnProps": {
  "type": "object",
  "properties": {
    "direction": {
      "type": "string",
      "enum": ["left-to-right", "right-to-left"],
      "default": "left-to-right",
      "description": "Which edge acts as the page hinge."
    },
    "outgoingSrc": {
      "type": "string",
      "default": "",
      "description": "Optional path or URL for the outgoing face artwork."
    },
    "incomingSrc": {
      "type": "string",
      "default": "",
      "description": "Optional path or URL for the incoming face artwork."
    },
    "frontLabel": {
      "type": "string",
      "default": "Previous act",
      "description": "Small label on the outgoing page face."
    },
    "backLabel": {
      "type": "string",
      "default": "Next act",
      "description": "Small label on the revealed face."
    },
    "frontSubtitle": {
      "type": "string",
      "default": "A tactile bridge that folds the outgoing moment into the next chapter.",
      "description": "Supporting copy for the outgoing face."
    },
    "backSubtitle": {
      "type": "string",
      "default": "The incoming scene arrives on the reverse side, already waiting behind the sheet.",
      "description": "Supporting copy for the revealed face."
    },
    "paperTint": {
      "type": "string",
      "default": "#f5f1e8",
      "description": "Base tint for the paper stock."
    },
    "accentColor": {
      "type": "string",
      "default": "#0078D4",
      "description": "Accent color used in the incoming badge."
    }
  },
  "additionalProperties": false
}
```

# Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "PageTurn" } }, "required": ["component"] },
  "then": { "properties": { "props": { "$ref": "#/$defs/PageTurnProps" } } }
}
```

# INDEX.md Layer 2 row

```md
| `components/page-turn` | [`skills/core/components/page-turn.md`](components/page-turn.md) | page turn, book page, page flip, tactile transition, turning the page, storybook bridge, chapter flip, physical paper transition |
```

# Skill file content

```md
# PageTurn Component

> Layer 2 component skill. Load when a video needs a tactile, storybook-style
> bridge that physically turns one act into the next.

## When to use

**Trigger vocabulary:** `page turn, page flip, turning the page, storybook,
chapter flip, tactile transition, physical paper, book-like bridge`.

Choose `PageTurn` when the transition itself should feel authored and
cinematic — especially for narrative explainers, training modules, and
chaptered stories where "we are entering the next section" should feel
intentional.

Use `TransitionWipe` instead when you want a cleaner broadcast-style chapter
break. Use `IrisZoom` instead when you want a focal-point-driven lens / film
grammar beat.

## Props

```json
{
  "direction": "left-to-right",
  "outgoingSrc": "file:///C:/Projects/Slate/assets/act-1.png",
  "incomingSrc": "file:///C:/Projects/Slate/assets/act-2.png",
  "frontLabel": "Act I",
  "backLabel": "Act II",
  "frontSubtitle": "The old frame folds away.",
  "backSubtitle": "The next chapter is already waiting behind the page.",
  "paperTint": "#f5f1e8",
  "accentColor": "#0078D4"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `direction` | enum | no | `left-to-right` (default) or `right-to-left`. Changes the hinge edge and rotateY direction. |
| `outgoingSrc` | string | no | Optional outgoing artwork. If omitted, the component falls back to a dark editorial placeholder. |
| `incomingSrc` | string | no | Optional incoming artwork. If omitted, the component falls back to a brand-gradient placeholder. |
| `frontLabel` | string | no | Short kicker on the outgoing face. |
| `backLabel` | string | no | Short kicker on the revealed face. |
| `frontSubtitle` | string | no | Supporting copy for the outgoing page. |
| `backSubtitle` | string | no | Supporting copy for the revealed page. |
| `paperTint` | string | no | Base color for the paper texture. Defaults to warm off-white. |
| `accentColor` | string | no | Accent used in the incoming badge. Defaults to Slate blue. |

## Narration timing notes

- Recommended scene duration: **1.5–2.0s**.
- Start the spoken pivot phrase ("next", "then", "turn the page", "moving on")
  at scene start or within the first **120ms**.
- Let the new-topic noun land as the sheet passes through 90° rotation
  (roughly **55–65%** through the scene).
- Avoid dense explanatory narration here — `PageTurn` is best as a concise
  transition beat, not an information-heavy scene.

## Example SCF snippet

```json
{
  "id": "chapter-page-turn",
  "duration": 1.7,
  "component": "PageTurn",
  "props": {
    "direction": "left-to-right",
    "frontLabel": "Act I",
    "backLabel": "Act II",
    "frontSubtitle": "From problem framing…",
    "backSubtitle": "…to the product reveal."
  }
}
```
```
