# CalloutBox Component

> Layer 2 component skill. Load when a scene needs a richer rectangular
> callout — title + body + optional icon + leader line — pointing at a
> spot on a screenshot, diagram, or photo.

## When to use

Triggers: "explain this region", "annotate the chart with two
sentences", "callout with detail", "tooltip on a screenshot",
labelled photo, technical diagram annotation, side-of-image card.

**Pick CalloutBox over CalloutPin when** the explanation is
two-or-more sentences, when an icon is needed, or when the callout
needs a clear card-styled background instead of a thin pin marker.

## Props

```json
{
  "baseSrc": "assets/architecture-screenshot.png",
  "targetX": 68,
  "targetY": 42,
  "anchor": "right",
  "icon": "ℹ",
  "title": "Cosmos DB write path",
  "body": "Writes are routed by partition key, replicated across 4 regions, and ack'd within 10ms p99.",
  "theme": "dark",
  "enterDelay": 0.6,
  "holdDuration": 4.5
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `baseSrc` | string | no | Background image. Falls back to dark gradient. |
| `targetX` | number | yes | Target point X as percent of width (0–100). |
| `targetY` | number | yes | Target point Y as percent of height (0–100). |
| `anchor` | enum | no | `left`, `right`, `top`, `bottom`. Where the card sits relative to target. Default `right`. |
| `icon` | string | no | Single glyph or short emoji. Optional. |
| `title` | string | yes | Bold one-line title. ≤ 50 chars. |
| `body` | string | yes | 1–3 sentences of supporting copy. ≤ 220 chars. |
| `theme` | enum | no | `dark` (default) or `light`. |
| `enterDelay` | number | no | Seconds before the callout appears. Default 0.4. |
| `holdDuration` | number | no | Seconds to hold before exit. Default fills remaining scene time. |

## Scene timing

Recommended duration: **5–9 seconds.** Leader line draws at +`enterDelay`,
card scales in at +`enterDelay + 0.3`, hold for read time, exit fade
during the last 0.5s.

## Composition tip

For multi-callout walkthroughs, use 2–3 sequential CalloutBox scenes
sharing the same `baseSrc` — the matching backgrounds make the cuts
invisible. If you need many simultaneous pins, switch to several
CalloutPins instead.
