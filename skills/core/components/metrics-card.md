# MetricsCard Component

> Layer 2 component skill. Load when a scene needs to show a single KPI,
> metric, stat, or headline number with a trend.

## When to use

Use `MetricsCard` when the script says any of: "X% improvement",
"jumped from … to …", "our latency dropped to …", uptime, throughput,
SLA, SLO, response time, dashboard headline, KPI, single trend.

**Override:** This beats a `structured_image` bar chart for one number.
Use a chart only when comparing 3+ values.

## Props

```json
{
  "label": "P95 LATENCY",
  "value": 142,
  "prevValue": 380,
  "unit": "ms",
  "deltaText": "−63%",
  "sparklinePoints": "0,90 80,80 160,72 240,68 320,55 400,40 480,32 560,22 640,12"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `label` | string | yes | Caps-styled. Keep ≤ 28 chars. |
| `value` | number | yes | The destination of the count-up tween. |
| `prevValue` | number | yes | Where the count-up starts. Set to same as `value` if you don't want animation. |
| `unit` | string | yes | `ms`, `%`, `req/s`, `$`, etc. Empty string is allowed. |
| `deltaText` | string | yes | Pre-formatted change text (`+24%`, `−63%`, `2.3×`). |
| `sparklinePoints` | string | yes | SVG `points` attribute. Coordinate space is 640×120. Use 8–16 points. |

## Scene timing

Recommended duration: **5–7 seconds.** Internal beats: 0.2s reveal,
1.6s counter, 0.5s delta, 1.4s sparkline draw, 0.8s read time.

## Example

```json
{
  "id": "metric-latency",
  "duration": 6,
  "component": "MetricsCard",
  "props": {
    "label": "Pipeline Latency",
    "value": 142,
    "prevValue": 380,
    "unit": "ms",
    "deltaText": "−63%",
    "sparklinePoints": "0,100 80,90 160,80 240,70 320,55 400,42 480,30 560,18 640,8"
  }
}
```
