# MetricStack Component

Use `MetricStack` for three headline KPIs that should land as a single proof moment over a hero background.

## When to use

- The script has exactly three metrics or capability counts.
- The viewer should compare momentum across related measures without reading a chart.
- You need a proof beat in a showcase, recap, or executive explainer.

## Props

Each metric uses `metricNLabel`, `metricNPrev`, `metricNValue`, `metricNUnit`, `metricNDelta`, and `metricNNote` for N = 1..3.

Use `DataChart` when values form a real series; use `MetricsCard` when there is only one number.

## Timing

Recommended duration: 5-7 seconds. Cards stagger in, values count up, deltas resolve, then the stack exits before the scene boundary.