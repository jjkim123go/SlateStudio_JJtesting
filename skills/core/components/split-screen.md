# SplitScreen Component

> Layer 2 component skill. Load when a scene needs two media regions
> visible *simultaneously* — side-by-side comparison, before/after,
> two perspectives at once.

## When to use

Triggers: split screen, side by side, "show both", before/after
together, two views, comparison, dual-pane, "left shows X, right
shows Y", "while X is happening, Y is also happening".

**Pick SplitScreen over CompareSlider when** the two regions should
both be fully visible at the same time. Pick `CompareSlider` when the
audience should drag/wipe between an A and B view of the same image.

## Props

```json
{
  "leftSrc": "assets/before-redesign.png",
  "rightSrc": "assets/after-redesign.png",
  "leftLabel": "Before",
  "rightLabel": "After",
  "leftCaption": "5 clicks to checkout",
  "rightCaption": "1 click to checkout",
  "orientation": "horizontal",
  "ratio": "50/50",
  "divider": "line"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `leftSrc` | string | yes | Left/top media. Image or video. |
| `rightSrc` | string | yes | Right/bottom media. Image or video. |
| `leftLabel` | string | no | Short label overlay on left. ≤ 24 chars. |
| `rightLabel` | string | no | Short label overlay on right. ≤ 24 chars. |
| `leftCaption` | string | no | One-line caption under the left label. |
| `rightCaption` | string | no | One-line caption under the right label. |
| `orientation` | enum | no | `horizontal` (default, left/right) or `vertical` (top/bottom). |
| `ratio` | enum | no | `50/50` (default), `60/40`, `40/60`, `70/30`, `30/70`. |
| `divider` | enum | no | `line` (default), `gap`, `none`, `gradient`. |

## Scene timing

Recommended duration: **5–9 seconds.** Both regions wipe in via
clip-path from outside edges (sequential or simultaneous), labels
fade in at +1.0s, captions stagger at +1.4s.

## Composition tip

Use for *honest* comparisons — old vs new, manual vs automated, on-prem
vs cloud. Keep the two media in the same visual register (both UIs,
both photos, both diagrams). For three-way splits, use two
SplitScreen scenes back-to-back rather than cramming three regions
into one.
