# CompareSlider Component

> Layer 2 component skill. Load when a scene needs a before/after, A vs B,
> "with vs without", or legacy vs new comparison.

## When to use

Triggers: before/after, vs, comparison, with and without,
old vs new, legacy vs modern, classical vs ML, manual vs automated,
"sweep between two images".

**Pick CompareSlider over SplitScreen when** both sides show the *same*
subject in two states (before/after, with/without, legacy/new) and a
sweeping divider tells the story. Pick SplitScreen when the two sides are
*different* subjects shown together (e.g., two team members, two products,
two regions). Avoid the phrase "side-by-side" as a trigger here — that's
SplitScreen's keyword.

## Props

```json
{
  "leftSrc": "assets/before.png",
  "rightSrc": "assets/after.png",
  "leftLabel": "Before",
  "rightLabel": "After",
  "leftBg": "#1e293b",
  "rightBg": "#0f172a",
  "title": "60% fewer manual touchpoints"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `leftSrc` | string | yes | "Before" image. |
| `rightSrc` | string | yes | "After" image. |
| `leftLabel` | string | yes | Red badge text on the left side. |
| `rightLabel` | string | yes | Green badge text on the right side. |
| `leftBg` | string | yes | Fallback background color if leftSrc fails. |
| `rightBg` | string | yes | Fallback background color if rightSrc fails. |
| `title` | string | yes | Caption shown at the bottom. |

## Scene timing

Recommended duration: **8–10 seconds.** The divider sweeps to 50% over
1.6s starting at +1.0s, then sweeps further to 20% at +3.4s for emphasis.

## Composition tip

Frame the two images so the differences land in roughly the same screen
region — that way the divider sweep reveals the contrast cleanly.
