# GaugeRing Component

> Layer 2 component skill. Use it for one headline metric displayed as a radial progress gauge with an optional comparison ring.

## When To Use

Triggers: `gauge`, `radial gauge`, `progress ring`, `score`, `percent complete`, `quality score`, `health score`, `utilization`, `comparison ring`.

- A single numeric proof point needs to land with authority.
- Progress, score, confidence, completion, or utilization is easier to understand as part-to-whole.
- A secondary benchmark or previous value helps the viewer compare quickly.

## When Not To Use

- Multiple unrelated metrics. Use `MetricStack` or `MetricsCard` instead.
- Time-series or categorical comparison. Use `DataChart` instead.
- Exact table-style reporting where labels and values need dense scanning.

## Props

```json
{
  "value": 87,
  "maxValue": 100,
  "suffix": "%",
  "label": "Render readiness",
  "comparisonValue": 64,
  "comparisonLabel": "last week",
  "accentColor": "#00E5FF",
  "trackColor": "rgba(255,255,255,0.18)"
}
```

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `value` | number | yes | none | Main gauge value and counter target. |
| `maxValue` | number | no | `100` | Denominator used to calculate the arc fill. |
| `suffix` | string | no | empty | Unit displayed next to the number, commonly `%`. |
| `label` | string | no | empty | Uppercase label below the gauge. Keep it short. |
| `comparisonValue` | number | no | `0` | Optional thinner comparison ring. Hidden unless positive. |
| `comparisonLabel` | string | no | empty | Text after `vs {comparisonValue}{suffix}`. |
| `accentColor` | string | no | component default | Main arc and comparison color. |
| `trackColor` | string | no | component default | Background track color. |

## Direction Notes

- Recommended duration: **4-6 seconds**. The counter and arc fill take about 1.2 seconds, then the label lands.
- Use one strong metric per scene. If there are three proof points, create three scenes or switch components.
- Keep `value` and `comparisonValue` on the same scale. A comparison ring is misleading if its denominator differs.
- For business proof, pair with metal or glass motion intent: precise, confident, and restrained.

## Authoring Example

```json
{
  "id": "readiness-score",
  "duration": 5,
  "component": "GaugeRing",
  "props": {
    "value": 92,
    "maxValue": 100,
    "suffix": "%",
    "label": "Review readiness",
    "comparisonValue": 71,
    "comparisonLabel": "baseline",
    "accentColor": "#00E5FF",
    "trackColor": "rgba(255,255,255,0.18)"
  }
}
```