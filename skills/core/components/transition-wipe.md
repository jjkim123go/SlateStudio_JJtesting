# TransitionWipe Component

> Layer 2 component skill. Load when the script needs an explicit
> chapter break, section transition, or pacing reset between scenes.

## When to use

Triggers: "chapter break", "act break", "now let's switch to", "moving
on", section divider, segment intro, "Part 2", "Chapter 3", reset
the audience attention before a new topic.

**Pick TransitionWipe over a plain crossfade when** you want to
emphasize the topical break — a wipe + chapter card lands harder than
a fade.

## Props

```json
{
  "direction": "left-to-right",
  "color": "#0078D4",
  "chapterNumber": "02",
  "chapterTitle": "Building the data pipeline",
  "style": "solid"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `direction` | enum | no | `left-to-right` (default), `right-to-left`, `top-to-bottom`, `bottom-to-top`, `diagonal`. |
| `color` | string | no | Wipe panel color. Default `#0078D4`. Use brand primary when available. |
| `chapterNumber` | string | no | Eyebrow number/label e.g. `"02"`, `"PART III"`. Optional. |
| `chapterTitle` | string | no | Large chapter headline. ≤ 60 chars. Optional — leave blank for a pure visual wipe. |
| `style` | enum | no | `solid` (default) or `gradient`. |

## Scene timing

Recommended duration: **2.5–4 seconds.** 40% enter wipe, 20% hold on
chapter card, 40% exit wipe. Audience read time for the chapter
title is ~1.2s minimum.

## Composition tip

Use sparingly — 1 to 3 per video, at major topic boundaries. Match
`color` to the brand primary so chapter breaks reinforce brand recall.
For a 5-act long-form video, number them `01`–`05` and keep titles
parallel ("Discover", "Design", "Build", "Ship", "Measure").
