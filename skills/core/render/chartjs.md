# Chart.js — Layer 3 Skill

> Layer 3: Vendor library skill. Load when authoring HTML/JS that renders
> a bar, line, or donut chart — typically driven by a
> `structured_image` bar chart or donut chart scene where
> the scene plan calls for a *true* canvas chart with axes/legend instead
> of the deterministic Pillow rendition.
> Sourced from the official docs at https://www.chartjs.org/docs/latest/.
> Last researched: 2026-04-06.

## When to use

Triggers: bar chart with multiple series, line/area chart, time-series,
donut/pie, "show this CSV as a chart", "compare these quantities",
mixed chart (bar+line), responsive chart that needs axes/grid/legend,
any case where the Pillow `bar_chart`/`donut_chart` is too crude
because the data needs ticks, gridlines, tooltips would be useful in a
PNG export, or there are >12 categories.

Don't load this skill for:
- Single headline numbers — use `MetricsCard`.
- Diagrams (boxes + arrows) — use Mermaid (>8 nodes) or Pillow `diagram`.
- ≤6-bar comparisons with no axis labels — Pillow's `bar_chart` is
  deterministic, free, and integrates with the master timeline more
  cleanly than canvas pixels.
- Photorealistic data visualization (3D, custom illustration) — AI image.

## Official sources

- Docs: https://www.chartjs.org/docs/latest/
- Getting started: https://www.chartjs.org/docs/latest/getting-started/
- Repository: https://github.com/chartjs/Chart.js
- npm package: `chart.js` (current stable `4.5.x`; pin `chart.js@4`)
- License: `MIT` (https://github.com/chartjs/Chart.js/blob/master/LICENSE.md)

## Slate integration

- **Bundle method**: pin to `chart.js@4` via the official UMD CDN. UMD is
  the right pick here — Chart.js is happy on a `window.Chart` global,
  and HyperFrames' headless Chrome doesn't need ESM gymnastics:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  ```
  For tree-shaken builds (smaller bundle, fewer chart types), import the
  `auto` ESM entrypoint:
  ```html
  <script type="module">
    import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4/auto/+esm';
  </script>
  ```
- **Allowlist entry**: add `chart.js@4` to `config/org/governance-policy.yaml`
  under `runtime_libraries`.
- **Loading from inside a HyperFrames component**: Chart.js renders to
  `<canvas>`. Order of operations in `animation.js`:
  1. Wait for the `Chart` global / ESM import to resolve.
  2. **Disable animations** for the Chart.js render itself
     (`options.animation = false`) — Slate animates via GSAP on the
     surrounding DOM, not via Chart.js's internal animation loop, which
     would race the headless capture.
  3. Construct `new Chart(ctx, config)` *before* the master timeline
     plays, then animate reveals (canvas opacity, scale, mask) with GSAP.
  4. Set explicit `width`/`height` attributes on the canvas (don't rely
     on responsive resize) — see Gotchas.

## Core API (top 5)

### 1. `new Chart(ctx, config)` — primary constructor
The whole library is shaped as one constructor.
```js
const chart = new Chart(document.getElementById('myChart'), {
  type: 'bar',                                  // bar|line|pie|doughnut|radar|polarArea|bubble|scatter
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{ label: 'Revenue', data: [12, 19, 14, 22], backgroundColor: '#0078D4' }],
  },
  options: {
    responsive: false,                          // see Gotchas
    animation: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true } },
  },
});
```

### 2. `chart.update(mode?)` / `chart.data = {...}; chart.update()`
Mutate the data array in place and call `update()` to re-render.
`mode` can be `'none'` to skip Chart.js's internal animation if you
forgot to set `options.animation = false`.

### 3. `chart.destroy()`
**Mandatory** when removing the canvas from the DOM mid-scene, otherwise
Chart.js leaks event listeners and the next chart on the same canvas
ID will throw "Canvas is already in use".

### 4. Per-dataset and per-element scriptable options
Many options accept a function `(ctx) => value` for data-driven styling
(color a single bar red, larger point on the highest value, etc.):
```js
backgroundColor: (ctx) => ctx.parsed.y >= 20 ? '#22c55e' : '#94a3b8'
```

### 5. Plugin registration (`Chart.register`) for tree-shaken builds
If you're using the modular ESM entry (not `auto`), you must register
controllers, scales, and elements explicitly:
```js
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
```

## Theming hooks

- **Global defaults**: `Chart.defaults.color`, `Chart.defaults.font.family`,
  `Chart.defaults.font.size`, `Chart.defaults.borderColor`. Set these
  once at component start to apply the brand palette globally.
- **Per-chart**: every dataset accepts `backgroundColor`, `borderColor`,
  `borderWidth`, `hoverBackgroundColor`, plus per-chart `options.plugins.title.color`,
  `options.scales.x.ticks.color`, `options.scales.y.grid.color`, etc.
- **Plugin options**: `options.plugins.legend`, `options.plugins.tooltip`,
  `options.plugins.title` — each takes color/display/position. Tooltips
  are not useful in MP4 output; set `plugins.tooltip.enabled = false`.

## Gotchas

- **Chart.js v4 rendering is canvas-only.** No CSS-based theming — every
  color, font, border must come through the options object.
- **Default `responsive: true` will resize against parent.** Inside
  HyperFrames the parent has a fixed pixel size, but the responsive
  resize fires async via ResizeObserver and can race the capture.
  Set `options.responsive = false` and provide explicit `width` and
  `height` attributes on the `<canvas>`.
- **Disable Chart.js animation.** Set `options.animation = false` and
  `options.transitions = { active: { animation: { duration: 0 } } }`.
  Slate's master timeline owns motion; Chart.js's internal animation
  is uncontrolled and not synchronized to the SCENE_DURATION.
- **`devicePixelRatio` differs in headless Chrome.** Force
  `options.devicePixelRatio = 2` (or whatever the SCF outputProfile
  implies) for crisp output, otherwise charts render fuzzy at 1080p.
- **`chart.destroy()` is required** before re-using a canvas element or
  removing it from the DOM. The "Canvas is already in use" error always
  means a missing destroy.
- **Tree-shaking trap.** If you import from `chart.js` (the modular
  entry) without `Chart.register(...)` calls, you get an "is not a
  registered controller" error at construction time. Use the `chart.js/auto`
  entry to skip the registration boilerplate.
- **No SVG output.** Chart.js draws to canvas. If you need vector
  output for post-processing, use a different library (or render the
  Pillow `bar_chart`).

## Out of scope (don't do this)

- Don't enable Chart.js's animation loop in a Slate scene. Slate
  controls timing.
- Don't rely on `responsive: true` inside HyperFrames; it races the
  capture pipeline.
- Don't load Chart.js to draw a single sparkline — Pillow does that
  faster and deterministically.
- Don't use unregistered community plugins from the Chart.js awesome
  list without adding them to the governance allowlist.
- Don't pin to `chart.js@latest` — pin `chart.js@4`.
