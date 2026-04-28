# DataChart Component

> Layer 2 component skill. Load when a scene needs a real animated
> chart — bars growing, donut filling, line drawing in — driven by
> structured data, not a static image of a chart.

## When to use

Triggers: chart, graph, bar chart, donut, pie, line chart, area chart,
"show the numbers", quarterly results, growth trend, breakdown,
distribution, comparison of categories, "X grew Y%".

**Pick DataChart over a `structured_image` bar chart** when the
chart needs to *animate* (bars growing in sequence, line drawing on,
donut wedges sweeping). `structured_image` produces a static PNG.

## Props

```json
{
  "chartType": "bar",
  "title": "Revenue by region (FY24)",
  "labels": ["Americas", "EMEA", "APAC", "LATAM"],
  "series": [
    { "name": "Revenue", "values": [42.1, 31.8, 24.7, 8.4], "color": "#0078D4" }
  ],
  "unit": "$B",
  "theme": "dark"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `chartType` | enum | yes | `bar`, `line`, `area`, `donut`, `pie`. |
| `title` | string | yes | Chart title. ≤ 60 chars. |
| `labels` | string[] | yes | Category labels (X axis or wedge labels). 2–8 items. |
| `series` | object[] | yes | `[{ name, values, color }]`. Multi-series supported for bar/line/area. Donut/pie use first series only. |
| `unit` | string | no | Suffix appended to value labels (e.g. `"$B"`, `"%"`, `"ms"`). |
| `theme` | enum | no | `dark` (default) or `light`. |

## Scene timing

Recommended duration: **5–8 seconds.** Title fades in at +0.4s, axis
draws at +0.8s, bars/line/donut animates in over ~1.5–2s with
staggered entry, value labels pop in at the end of each bar's growth.

## Composition tip

Pair with a `Quote` or `MetricsCard` scene immediately after to let
the audience absorb the chart's headline takeaway. For a multi-chart
walkthrough, use 2–3 sequential DataChart scenes with the same theme;
keep the y-axis range consistent if you're comparing the same metric
across periods.
