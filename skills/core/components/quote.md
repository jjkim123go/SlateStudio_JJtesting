# Quote Component

> Layer 2 component skill. Load when a scene needs to highlight a
> testimonial, customer voice, executive statement, or pull quote.

## When to use

Triggers: testimonial, quote, "as our CEO said", "one customer told us",
"according to", pull quote, customer voice, executive statement.

## Props

```json
{
  "text": "Slate cut our internal video production time from days to minutes.",
  "author": "Priya Krishnan",
  "role": "Director of Engineering, Contoso",
  "photoSrc": "assets/priya.jpg",
  "accentColor": "#7c3aed"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `text` | string | yes | The quotation. Aim 60–180 chars. |
| `author` | string | yes | Name only. |
| `role` | string | yes | Title + company. |
| `photoSrc` | string | no | Headshot. If missing or fails to load, hides cleanly. |
| `accentColor` | string | yes | Background gradient seed (hex). Use brand primary. |

## Scene timing

Recommended duration: **6–9 seconds.** Long enough for the audience to
read the full quote without rushing. Read time ≈ chars / 25 words/sec.
