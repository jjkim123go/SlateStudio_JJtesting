# Structured Visuals — Component-First Routing Contract

> Layer 2 — Slate-specific. Load this skill at **scene_plan** and **assets**
> stages whenever a scene needs deterministic rendering of code, tables,
> diagrams, charts, or UI mockups.

## Routing principle: component-first, create-if-missing

Most content types that need deterministic rendering have a matching
**animated HyperFrames component** that renders text/data correctly AND
adds motion, reveal animations, and audience engagement. Always prefer the
component. If no component exists for the content type, create one via a sub-agent (load `component-authoring`, `component-design-system`, `gsap-component-patterns`).
The `structured_image` tool is reserved for non-video static exports only (thumbnails, social cards, OG images).

## Routing decision tree

```
Does the scene need exact text the audience must read accurately?
  (code, JSON, API routes, schemas, table data, chart numbers, UI labels)
├── YES → Is there a matching HyperFrames component?
│   ├── Code / CLI → VSCodeScene, TerminalCast, or TerminalScene (renders natively)
│   ├── Diagram / flow → DataFlow or ArchitectureDiagram (animated node+arrow reveal)
│   ├── Chart → DataChart (animated bar/donut with counter tweens)
│   ├── Metrics / KPIs → MetricsCard, MetricStack, BurnDown, or OKRStatus
│   ├── Table / comparison → PricingTable, CompareSlider, or ExcelScene
│   ├── UI mockup → ScreenDemoFrame (component chrome; use structured_image for inner screenshot only if needed)
│   ├── Architecture → ArchitectureDiagram (unless cyclic/mesh layout)
│   └── None of the above → Create a new component via sub-agent
│         (load component-authoring, component-design-system, gsap-component-patterns)
└── NO ↓

Does the scene need camera motion / dynamic action?
├── YES → Call `foundry_video_gen` tool (Sora-2; 4/8/12s clips; ~$0.10/sec)
│         Display clip via video layer: { "type": "video", "src": "..." }
└── NO ↓

Default → Call `foundry_image_gen` tool (gpt-image-2)
          Display via image layer or ScreenDemoFrame
```

## Texture path (3D / canvas-bound content)

For content that must end up *inside* a canvas/texture (3D plane, billboard,
shader, planned `HTMLTextureWall` / `DeviceStage3D` screen), the routing is
different — see [`render/html-in-canvas.md`](render/html-in-canvas.md). In
brief: prefer `html_texture_render` (templates / SVG, deterministic, $0)
or screenshot an existing HyperFrames component. Never ask `foundry_image_gen`
to render UI for a 3D scene — image models hallucinate text and labels.

## Static export only — the `structured_image` tool

> **Note:** This tool is NOT used for video scenes. For video, always use or
> create a HyperFrames component. The `structured_image` tool is reserved for
> non-video static exports: thumbnails, social preview cards, OG images.

When generating a non-video static asset, use the `structured_image` tool
to generate a static PNG. There is no top-level scene field for structured
visuals — the SCF schema uses `additionalProperties: false`. The only valid
scene properties are: `id`, `duration`, `component`, `props`, `layers`,
`narration`, `narrationStartSec`, `transition`, `notes`, and `_demoDataWaiver`.

### Step 1 — Call the `structured_image` tool

**Tool:** `structured_image` (registered in `src/slate/core/tool_registry.py`,
code at `src/slate/tools/graphics/structured_image.py`)

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `type` | enum | ✅ | — | `code`, `table`, `ui`, `diagram`, `bar_chart`, `donut_chart` |
| `title` | string | ✅ | — | Visual title / caption (≤ 50 chars) |
| `data` | object | ✅ | — | Type-specific payload (see §Data payloads below) |
| `width` | integer | | 1920 | Image width in pixels |
| `height` | integer | | 1080 | Image height in pixels |
| `output_dir` | string | | `.` | Output directory |
| `output_path` | string | | — | Explicit path; overrides `output_dir` |

**Output:** `{ "image_path": "...", "type": "...", "width": 1920, "height": 1080 }`

Zero cost, zero latency, deterministic output.

### Step 2 — Display the PNG via a scene component

| Component | When to use | Key props |
|-----------|-------------|-----------|
| `ScreenDemoFrame` | Code, JSON, API endpoints, UI mockups — anything that looks like it belongs in a browser, macOS window, phone, or tablet. Best for technical content. | `src` (path to PNG), `frameStyle`, `urlBar`, `windowTitle`, `theme` |
| `SlideRenderer` | Charts, diagrams, tables presented as part of a slide deck or presentation. Use `title-image` or `two-column` layout. | `layout`, `title`, `image` (path to PNG), `eyebrow` |
| `image` layer | Full-bleed background, or when the structured visual is one of several layers in a custom scene. | `{ "type": "image", "src": "..." }` in the `layers` array |

### Example — code block in a browser frame

```json
{
  "id": "api-request-body",
  "duration": 6,
  "component": "ScreenDemoFrame",
  "props": {
    "src": "output/assets/structured/api-request.png",
    "frameStyle": "browser",
    "urlBar": "api.contoso.com/v1/ingest",
    "theme": "dark"
  },
  "narration": "output/assets/narration/scene-3.wav",
  "transition": "crossfade"
}
```

### Example — table in a presentation slide

```json
{
  "id": "pricing-comparison",
  "duration": 7,
  "component": "SlideRenderer",
  "props": {
    "layout": "title-image",
    "eyebrow": "Pricing",
    "title": "How our tiers compare",
    "image": "output/assets/structured/pricing-table.png"
  },
  "narration": "output/assets/narration/scene-5.wav",
  "transition": "crossfade"
}
```

### Example — diagram as a full-bleed layer

```json
{
  "id": "data-flow",
  "duration": 8,
  "layers": [
    { "type": "image", "src": "output/assets/structured/data-flow.png" }
  ],
  "narration": "output/assets/narration/scene-4.wav",
  "transition": "crossfade"
}
```

## Component-first routing (primary path)

For most scene intents, an animated **component** is the correct choice —
it renders deterministic text/data AND adds motion, reveal animations,
and audience engagement. Apply these routes FIRST; if no component matches,
create a new one via sub-agent.

| Scene intent / keyword in script | Use this component | Why | Create new component when... |
|----------------------------------|-------------------|-----|---------------------------|
| KPI, metric, stat, dashboard, "X% improvement", uptime, latency, throughput, SLA, SLO, single headline number with trend | `MetricsCard` | Animated counter, delta arrow, sparkline — far more compelling than a static chart for one number. | N/A — MetricsCard handles this. |
| Architecture, system architecture, service map, topology, dependency graph, component diagram, integration flow, pipeline (with sequential reveal) | `ArchitectureDiagram` | Boxes pop in one at a time, arrows stroke-draw — guides the audience through structure. | Create a specialized topology component for cyclic/mesh layouts. |
| Terminal, CLI, command line, install flow, deploy walkthrough, "watch as I run", "type the following" | `TerminalScene` | Synthetic terminal recording with character-by-character typing, output reveal, pause beats, status pills. No screen capture needed. See [`synthetic-screen-recording.md`](synthetic-screen-recording.md). | N/A — this component renders code natively. |
| Before/after, A vs B, "with vs without", legacy vs new, classical vs ML | `CompareSlider` | Side-by-side reveal with a sweeping divider that audiences track far better than a static split. | N/A. |
| Pull quote, testimonial, customer voice, "as our CEO said" | `Quote` | Attribution + photo treatment that reads as an editorial pull-quote, not body copy. | N/A. |
| Annotated screenshot, "this part of the UI", "look here on the dashboard" | `CalloutPin` | Pulsing pin + labeled card with a leader to one specific point on a base image. | N/A. |
| Numbered steps, checklist, tutorial sequence, "1. … 2. … 3. …", onboarding flow | `StepByStep` | Each step reveals + checkmark fills with a deliberate cadence. | N/A. |
| Closing CTA, "get started", "learn more", "contact us", final ask | `CTABlock` | Pairs with `BrandOutro` for a strong close. | N/A. |
| Diagram, data flow, pipeline, process flow, boxes and arrows | `DataFlow` | Animated node+arrow reveal with sequential highlighting. | N/A — DataFlow handles flow perfectly. |
| Chart, graph, bar chart, donut, "show the numbers", quarterly results, growth trend, distribution | `DataChart` | Counter tweens, bar height/donut arc easing, segment-by-segment reveal. | Create a specialized audit-quality chart component if needed. |
| Table, pricing, comparison table, feature matrix, tier comparison | `PricingTable` or `ExcelScene` | Animated row/column reveal with highlight support. | N/A. |
| Metrics stack, multi-KPI, burn-down, OKR status | `MetricStack`, `BurnDown`, `OKRStatus` | Animated multi-metric displays. | N/A. |

Only fall through to **creating a new component** (via sub-agent with
`component-authoring`, `component-design-system`, and `gsap-component-patterns`
skills) for content that has no matching component. The `structured_image`
tool is not used for video scenes.

## Diagram routing — component preferred

Diagrams should use the `DataFlow` or `ArchitectureDiagram` component by
default. The `structured_image` tool (type: `diagram`) is reserved for
non-video static exports only. The `foundry_image_gen` fallback applies only when the
component can't handle the topology.

| Box count | Topology | Use |
|-----------|----------|-----|
| Any | Linear, tree, or DAG | `DataFlow` or `ArchitectureDiagram` component (animated reveal) |
| Any | Cyclic / non-DAG / mesh | `foundry_image_gen` with a "clean architecture diagram, dark mode" prompt → image layer |

Use `structured_image` (type: `diagram`) only when the user explicitly
requests a static PNG, e.g., for embedding in a document or print asset.

## Data payloads by type

These mirror the `data` field schema in the `structured_image` tool
(lines 60–90 of `src/slate/tools/graphics/structured_image.py`).

### Code (`type: code`)

```json
{ "lines": ["import json", "data = json.load(f)"], "highlight_line": 2 }
```

- `lines`: string array; ≤ 18 lines for 1080p; longer → split into two scenes
- Each line ≤ 70 monospace chars
- `highlight_line`: 1-indexed integer; `null` = no highlight
- Indentation preserved verbatim — don't re-indent

### Table (`type: table`)

```json
{ "headers": ["Tier", "Storage", "Support"], "rows": [["Starter", "5 GB", "Email"], ["Pro", "50 GB", "Priority"]], "col_widths": null, "highlight_row": null }
```

- ≤ 6 columns, ≤ 8 rows for 1080p
- Cell text ≤ 30 chars (wider tables → split or use vertical layout)
- `highlight_row`: 0-indexed; `null` = no highlight
- `col_widths`: omit unless you have a strong reason; auto-distribution
  works for most cases

### UI mockup (`type: ui`)

```json
{ "elements": [{ "type": "button", "text": "Submit", "x": 400, "y": 500, "w": 200, "h": 50, "variant": "primary" }] }
```

- Coordinates ARE required (no auto-layout for arbitrary UI)
- Stay within `x ∈ [80, 1840]`, `y ∈ [80, 1000]`
- Use `variant: "primary" | "secondary" | "danger"` for buttons

### Diagram (`type: diagram`)

```json
{
  "boxes": [
    { "id": "a", "text": "Data Source", "subtitle": "Kusto" },
    { "id": "b", "text": "Validator", "subtitle": "6-step gate" },
    { "id": "c", "text": "Storage", "subtitle": "CommerceRadar" }
  ],
  "arrows": [
    { "from_id": "a", "to_id": "b", "label": "publish" },
    { "from_id": "b", "to_id": "c", "label": "store" }
  ]
}
```

See §Layout contracts below for coordinate rules and content limits.

### Bar chart (`type: bar_chart`)

```json
{ "labels": ["Q1", "Q2", "Q3"], "values": [120, 340, 580], "unit": "K req/s" }
```

- ≤ 8 categories
- `unit` for bar charts (e.g., `"%"`, `"ms"`, `"K req/s"`)

### Donut chart (`type: donut_chart`)

```json
{ "labels": ["Desktop", "Mobile", "Tablet"], "values": [60, 30, 10] }
```

- ≤ 8 categories
- Values are normalized to percentages by the renderer

## Layout contracts (diagrams)

Slate canvas is **1920 × 1080**. The Pillow renderer reserves the top 100px
for the title bar. Available content area: **1920 × 980**, with safe margins
of 80px on all sides → **usable area: 1760 × 820** centered.

### Rule L1 — Omit coordinates by default; let auto-layout place boxes

Without `x`/`y`/`w`/`h` on boxes, the renderer detects the topology and
fills the canvas. **This is the recommended path** — directors should not
guess pixel coordinates.

### Rule L2 — If you DO provide coordinates, fill the canvas

If you must provide `x`/`y`/`w`/`h`, you MUST satisfy:
- Bounding box of all boxes spans ≥ 60% of canvas width AND ≥ 50% of canvas height
- Box widths ≥ 240, heights ≥ 100
- Minimum gap between boxes ≥ 80px (for arrow routing)
- All boxes within safe area: `x ∈ [80, 1760]`, `y ∈ [180, 1000]`

If your manual layout violates these, the renderer logs a warning and
calls auto-layout instead.

### Rule L3 — Box content limits

- `text` (title): ≤ 24 chars; longer values are wrapped (max 2 lines)
- `subtitle`: ≤ 36 chars; longer values are truncated with ellipsis
- Keep terminology consistent — same entity should use same wording across
  scenes (script-level concern; the OCR comparison in
  [video-indexer-review](video-indexer-review.md) catches drift)

### Rule L4 — Arrow labels

- ≤ 12 chars (e.g., "publish", "validates", "stores")
- Omit when the visual sequence is self-evident
- Never use diagonal arrows when boxes are horizontally/vertically aligned —
  the orthogonal router handles this automatically

## Director checklist

Before selecting a visual treatment for any scene, verify:

- [ ] Did I check for a matching HyperFrames component first? (component-first routing table above)
- [ ] Am I using `structured_image` only because no component fits, or user requires static fidelity?
- [ ] For code/CLI: am I using TerminalCast, VSCodeScene, or TerminalScene? (never Pillow for code)
- [ ] For diagrams: am I using DataFlow or ArchitectureDiagram? (Pillow only if user demands static)
- [ ] For charts: am I using DataChart? (Pillow only for audit-grade pixel-perfect numbers)
- [ ] For tables: am I using PricingTable or ExcelScene? (never Pillow for tables)
- [ ] For metrics: am I using MetricsCard, MetricStack, BurnDown, or OKRStatus?
- [ ] If using structured_image: box/cell text within character limits?
- [ ] No more than 8 boxes / 18 lines / 8 rows / 8 categories?
- [ ] Title is concise (≤ 50 chars)?
- [ ] Scene JSON uses only valid SCF properties? (`component` + `props`, or `layers` — never invented top-level fields)

## What the renderer does behind the scenes

When you submit a diagram without coordinates, the renderer:

1. Builds a directed graph from `arrows`
2. Detects topology:
   - **Linear chain** (single source, single sink, no branching):
     horizontal flow if `n_boxes ≤ 6`, else 2-column vertical
   - **Tree** (single root, branching): top-down hierarchical layout
   - **DAG with merging** (multiple paths to same node): grid layout
3. Assigns coordinates filling the safe area uniformly
4. Routes arrows orthogonally (Manhattan, not diagonal)
5. Wraps box text to fit width

If you provide coordinates AND they pass the L2 sanity check, your
coordinates are honored as-is.

## Feedback loop

The review-director ([review-director](../pipelines/animated-explainer/review-director.md))
checks rendered structured visuals via the `visual_consistency` rubric
dimension. When VI is configured, the OCR signal in
[video-indexer-review](video-indexer-review.md) verifies that all box text
and labels were actually rendered legibly.
