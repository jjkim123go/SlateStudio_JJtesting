# KNOWN_COMPONENTS entry

'IrisZoom',

# Schema enum entry

"IrisZoom",

# Schema $defs block

```json
"IrisZoomProps": {
  "type": "object",
  "properties": {
    "focalPoint": {
      "type": "string",
      "default": "50% 50%",
      "description": "Center point for the iris close/open, expressed as '<x>% <y>%'."
    },
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
    "outgoingLabel": {
      "type": "string",
      "default": "Current focus",
      "description": "Small label shown on the outgoing scene."
    },
    "incomingLabel": {
      "type": "string",
      "default": "Next focus",
      "description": "Small label shown on the revealed scene."
    },
    "subline": {
      "type": "string",
      "default": "The outgoing scene contracts into a precise focal point before the next image blooms open.",
      "description": "Shared supporting copy for both states."
    }
  },
  "additionalProperties": false
}
```

# Schema oneOf entry

```json
{
  "if": { "properties": { "component": { "const": "IrisZoom" } }, "required": ["component"] },
  "then": { "properties": { "props": { "$ref": "#/$defs/IrisZoomProps" } } }
}
```

# INDEX.md Layer 2 row

```md
| `components/iris-zoom` | [`skills/core/components/iris-zoom.md`](components/iris-zoom.md) | iris, iris-out, iris-in, lens close, focal point transition, classic film transition, circular mask, spotlight close, zoom iris |
```

# Skill file content

```md
# IrisZoom Component

> Layer 2 component skill. Load when a transition should collapse the frame
> to a precise focal point, hold for a beat, then bloom back open on the
> next act.

## When to use

**Trigger vocabulary:** `iris, iris-out, iris-in, circular close, focal
point transition, film iris, spotlight close, lens-style transition`.

Choose `IrisZoom` when you want the audience's attention to lock onto a
specific point before releasing into the next scene. It works especially well
for product demos, training videos, and classic film-inspired chapter beats.

Use `PageTurn` for tactile storybook motion. Use `PrismRefract` for
brand-color energy. Use `TransitionWipe` when you need a simpler section
break with optional chapter-card copy.

## Props

```json
{
  "focalPoint": "50% 50%",
  "outgoingSrc": "file:///C:/Projects/Slate/assets/current-scene.png",
  "incomingSrc": "file:///C:/Projects/Slate/assets/next-scene.png",
  "outgoingLabel": "Current focus",
  "incomingLabel": "Next focus",
  "subline": "The outgoing scene contracts into a precise focal point before the next image blooms open."
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `focalPoint` | string | no | Center for the iris, formatted as `"<x>% <y>%"`. Default `50% 50%`. |
| `outgoingSrc` | string | no | Optional outgoing artwork. Falls back to a dark editorial gradient. |
| `incomingSrc` | string | no | Optional incoming artwork. Falls back to a blue-violet reveal gradient. |
| `outgoingLabel` | string | no | Small label on the outgoing scene. |
| `incomingLabel` | string | no | Small label on the revealed scene. |
| `subline` | string | no | Shared supporting copy for the outgoing / incoming treatments. |

## Narration timing notes

- Recommended scene duration: **1.2–1.6s**.
- Let the key pivot word land just before the iris fully closes.
- The closed hold is intentionally brief (~150ms): enough to register the
  beat, not long enough to feel like a cut to black.
- If narration continues through the reopen, place the new-topic noun on the
  first **150–250ms** of the opening reveal.

## Example SCF snippet

```json
{
  "id": "focal-iris-bridge",
  "duration": 1.4,
  "component": "IrisZoom",
  "props": {
    "focalPoint": "62% 38%",
    "outgoingLabel": "Problem",
    "incomingLabel": "Solution"
  }
}
```
```
