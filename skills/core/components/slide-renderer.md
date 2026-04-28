# SlideRenderer Component

> Layer 2 component skill. Load when a scene needs a clean, brand-styled
> "presentation slide" — title + bullets, title + image, two-column,
> quote slide. Distinct from `PowerPointScene` (which renders the
> PowerPoint app UI itself).

## When to use

Triggers: presentation slide, deck slide, "slide that says…",
keynote-style slide, executive summary, title slide, opening slide,
cover slide, agenda slide, recap slide, closing slide,
"title slide with bullets", conference-talk frame,
"summarize in 3 bullets", "intro slide", "section divider slide".

**Pick SlideRenderer over PowerPointScene when** the audience should
see *just the slide content*, not the PowerPoint chrome (slide rail,
ribbon, status bar). Pick PowerPointScene when the demo *is about*
PowerPoint itself.

## Props

```json
{
  "layout": "title-bullets",
  "eyebrow": "Q3 Results",
  "title": "Three things that drove growth",
  "bullets": [
    "Enterprise pipeline up 38% YoY",
    "Net retention reached 124%",
    "Deployed in 14 new regions"
  ],
  "accent": "#0078D4",
  "pageNumber": 7,
  "pageTotal": 18
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `layout` | enum | yes | `title-only`, `title-bullets`, `title-image`, `two-column`, `quote`. |
| `eyebrow` | string | no | Small label above the title. ≤ 40 chars. |
| `title` | string | yes | Main slide headline. ≤ 80 chars. |
| `bullets` | string[] | conditional | Required for `title-bullets` and `two-column` (right column). 2–6 items, ≤ 90 chars each. |
| `image` | string | conditional | Required for `title-image` and `two-column` (left column). |
| `quoteText` | string | conditional | Required for `quote` layout. |
| `quoteAttribution` | string | conditional | Required for `quote` layout. |
| `accent` | string | no | Brand accent color. Default `#0078D4`. |
| `pageNumber` | number | no | Current slide number. Optional. |
| `pageTotal` | number | no | Total slides. Optional. |

## Scene timing

Recommended duration: **4–7 seconds.** Eyebrow fades in at +0.3s, title
at +0.6s, bullets stagger in at +1.1s (0.3s apart), page number
appears at +0.5s.

## Composition tip

Use SlideRenderer for the "talk-track" backbone of a long-form
explainer — sequential slides reinforce the script while voiceover
plays. Drop in a `DataChart` or `ScreenDemoFrame` scene every 3–4
slides to break the rhythm and add visual variety.
