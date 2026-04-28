# Mermaid — Layer 3 Skill

> Layer 3: Vendor library skill. Load when authoring HTML/JS that renders
> a Mermaid diagram — typically inside a `structured_image` diagram
> scene that exceeds the Pillow renderer's complexity threshold (>8 boxes,
> cyclic graph, multi-rank flow, sequence diagram, gantt, ER, class diagram).
> Sourced from the official docs at https://mermaid.js.org. Last researched: 2026-04-06.

## When to use

Triggers: flowchart with >8 nodes, sequence diagram, ER diagram, class
diagram, gantt, gitgraph, journey diagram, quadrant chart, "render this
mermaid block", `\`\`\`mermaid` fenced code in source material, "show me
the call graph", "diagram this state machine", anything in a `structured_image` diagram
that the deterministic Pillow `diagram` layout flags as too dense.

Don't load this skill for:
- Simple ≤8-box architecture diagrams — use the Slate `ArchitectureDiagram`
  component or the Pillow `diagram` structured visual. Both are
  deterministic and animatable; Mermaid output is harder to choreograph.
- Bar/donut/line charts — those are Chart.js (see `chartjs.md`).
- Code highlighting — that's Shiki (see `shiki.md`).
- Photorealistic flow imagery — use AI image generation.

## Official sources

- Docs: https://mermaid.js.org
- Usage guide (CDN + securityLevel): https://mermaid.js.org/config/usage.html
- Repository: https://github.com/mermaid-js/mermaid
- npm package: `mermaid` (current stable 11.x; pin `mermaid@11`)
- License: `MIT` (Copyright © 2014–2022 Knut Sveidqvist — verified at
  https://raw.githubusercontent.com/mermaid-js/mermaid/develop/LICENSE)

## Slate integration

- **Bundle method**: pin to `mermaid@11` via the official ESM CDN that
  the Mermaid docs themselves use:
  ```html
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  </script>
  ```
- **Allowlist entry**: add `mermaid@11` to `config/org/governance-policy.yaml`
  under `runtime_libraries`. The "tiny" build at
  `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.tiny.min.mjs` is
  ~half the size and is acceptable when the diagram is *not* a mindmap,
  architecture, or KaTeX-using diagram.
- **Loading from inside a HyperFrames component**: Mermaid renders
  asynchronously. The component's `animation.js` should:
  1. Import Mermaid as ESM.
  2. Call `mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' })`.
  3. `await mermaid.run({ querySelector: '.mermaid-host' })` (or
     `mermaid.render(id, code)` for full control).
  4. Resolve `window.hf.ready(promise)` so the GSAP timeline does not
     start before the SVG exists in the DOM. Animate the SVG nodes with
     GSAP afterwards.

## Core API (top 5)

### 1. `mermaid.initialize(config)` — call once, before any render
Always pass `startOnLoad: false` for programmatic use (Slate never wants
the auto-scan on `DOMContentLoaded`).
```js
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',  // strict|loose|antiscript|sandbox; see Gotchas
  theme: 'dark',            // default|dark|forest|neutral|null (custom)
  fontFamily: 'Inter, system-ui, sans-serif',
});
```

### 2. `await mermaid.run({ querySelector })` — declarative scan
Picks up every element matching the selector (default `.mermaid`) whose
`textContent` is mermaid source, replaces it with the rendered SVG.
```html
<pre class="mermaid">
  graph LR
    A[Ingest] --> B[Plan] --> C[Render] --> D[Publish]
</pre>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  await mermaid.run({ querySelector: 'pre.mermaid' });
</script>
```

### 3. `await mermaid.render(id, definition)` — programmatic render
Returns `{ svg, bindFunctions }` without touching the DOM. Best for
Slate because the SVG can be inspected, sized, and inserted at the
exact point the timeline needs it.
```js
const { svg } = await mermaid.render('diagram-host', `
  flowchart TD
    A[Source] --> B{Decision}
    B -->|yes| C[Path 1]
    B -->|no|  D[Path 2]
`);
document.getElementById('host').innerHTML = svg;
```

### 4. `await mermaid.parse(definition)` — validate without rendering
Throws on syntax error. Use this in the agent's compose stage to catch
bad Mermaid before sending to the renderer.
```js
try { await mermaid.parse(src); }
catch (e) { /* fall back to ArchitectureDiagram or DataFlow component */ }
```

### 5. Per-diagram theme variables (`%%{init: …}%%`)
Override theme tokens inline at the top of any Mermaid source — useful
when the brand color must apply to one diagram but not the global config.
```text
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#0078D4','lineColor':'#444'}}}%%
flowchart LR
  A --> B
```

## Theming hooks

- `theme:` global option: `default`, `dark`, `forest`, `neutral`, or `base`
  with `themeVariables` for full custom palette.
- `themeVariables`: `primaryColor`, `primaryBorderColor`, `primaryTextColor`,
  `lineColor`, `secondaryColor`, `tertiaryColor`, `background`, `mainBkg`,
  `nodeTextColor` — match these to the active brand package.
- `fontFamily` is global — match the brand's body font.
- The rendered output is plain SVG — you can post-process node fills,
  stroke widths, and animate paths with GSAP after `mermaid.render()`
  resolves.

## Gotchas

- **`startOnLoad: false` is mandatory** for programmatic rendering. Without
  it, Mermaid re-scans on every DOM mutation and double-renders the
  diagram inside HyperFrames' headless Chrome.
- **`securityLevel` defaults to `'strict'`** since v8.2 — HTML in node
  labels is encoded and `click` directives are disabled. Use `'loose'`
  only on trusted source. `'sandbox'` puts the SVG in an iframe and is
  not safe to animate from outside (GSAP can't reach into the iframe).
- **Mermaid is async.** `mermaid.run` and `mermaid.render` return
  promises. Never start the GSAP master timeline before they resolve —
  the SVG nodes won't exist yet.
- **The "tiny" build is missing features.** It does not support mindmaps,
  architecture diagrams, KaTeX, or lazy loading. Pick the full build
  unless your diagram type is in the supported subset.
- **Node IDs become element IDs.** Two diagrams on the same page with
  overlapping node IDs collide. Use `mermaid.render(uniqueId, ...)`
  with a per-scene UUID.
- **Fonts must be loaded before render.** If using a brand webfont, await
  `document.fonts.ready` before `mermaid.render`, otherwise text widths
  measure wrong and labels overflow nodes.

## Out of scope (don't do this)

- Don't ship a Mermaid SVG straight to MP4 without animating it — it
  reads as a static image. After render, use GSAP to fade/draw nodes
  in sequence (`gsap.from('.node', { opacity: 0, y: 20, stagger: 0.15 })`).
- Don't use `securityLevel: 'loose'` on user-provided source. Mermaid
  source is executable enough that loose mode + a `click` directive is
  a script-injection vector.
- Don't use Mermaid for charts (bar/donut/line). Mermaid's `pie` is the
  only chart-like primitive and it's deliberately minimal — Chart.js is
  the right tool.
- Don't pin to `mermaid@latest` — pin `mermaid@11` so the governance
  allowlist can audit.
