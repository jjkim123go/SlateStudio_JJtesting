# ArchitectureDiagram Component

> Layer 2 component skill. Load when a scene needs an animated system
> architecture, service map, topology, or component-relationship diagram.

## When to use

Triggers: architecture, system architecture, service map, topology,
dependency graph, component diagram, integration flow, microservices,
boxes and arrows, data flow (when you want sequential reveal).

**Override:** This beats a `structured_image` diagram whenever the
audience benefits from seeing components appear one at a time and arrows
draw between them. Use the static diagram only when the topology is
already familiar to the audience.

## Props (raw SVG injection)

The component accepts pre-built SVG fragments via `boxesSvg` and
`arrowsSvg` (triple-mustache `{{{…}}}` injection).

```json
{
  "title": "Slate Production Pipeline",
  "markerId": "demo-1",
  "boxesSvg": "<g class=\"ad-box\" transform=\"translate(120,400)\"><rect width=\"260\" height=\"140\" rx=\"16\" fill=\"#1e293b\" stroke=\"#38bdf8\" stroke-width=\"2\"/><text x=\"130\" y=\"60\" text-anchor=\"middle\" fill=\"#FFFFFF\" font-size=\"24\" font-weight=\"700\" font-family=\"Inter\">Ingest</text><text x=\"130\" y=\"95\" text-anchor=\"middle\" fill=\"rgba(255,255,255,0.6)\" font-size=\"16\" font-family=\"Inter\">User prompt</text></g>",
  "arrowsSvg": "<path class=\"ad-arrow\" d=\"M 380 470 L 720 470\" stroke=\"#38bdf8\" stroke-width=\"3\" fill=\"none\" marker-end=\"url(#ad-arrow-demo-1)\"/><text class=\"ad-arrow-label\" x=\"550\" y=\"460\" text-anchor=\"middle\" fill=\"#94a3b8\" font-size=\"16\" font-family=\"Inter\">brief</text>"
}
```

### Box fragment skeleton

Each box must have `class="ad-box"` so the animation can stagger-reveal it:

```html
<g class="ad-box" transform="translate(<x>,<y>)">
  <rect width="<w>" height="<h>" rx="16" fill="#1e293b" stroke="<accent>" stroke-width="2"/>
  <text x="<w/2>" y="<h/2 - 10>" text-anchor="middle" fill="#FFFFFF" font-size="24" font-weight="700">Title</text>
  <text x="<w/2>" y="<h/2 + 25>" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="16">Subtitle</text>
</g>
```

### Arrow fragment skeleton

Each arrow must have `class="ad-arrow"` so the animation can stroke-draw it:

```html
<path class="ad-arrow" d="M <x1> <y1> L <x2> <y2>" stroke="#38bdf8" stroke-width="3" fill="none" marker-end="url(#ad-arrow-<markerId>)"/>
<text class="ad-arrow-label" x="<midX>" y="<midY-10>" text-anchor="middle" fill="#94a3b8" font-size="16">label</text>
```

## Layout coordinates

The SVG viewBox is **1920 × 1080**. Recommended placement:
- Title bar reserved at top: y ∈ [0, 120]
- Diagram area: y ∈ [180, 1000], x ∈ [80, 1840]
- Box width: 240–320, height: 120–160
- Minimum spacing between boxes: 80px (so arrow paths don't crowd)
- Maximum boxes for one scene: **6.** More than that, the boxes shrink
  past readability — split into two scenes or use `visual_prompt`.

## Scene timing

Recommended duration: **8–14 seconds.** Title at +0.2s, boxes start
revealing at +0.7s with 0.18s stagger, arrows draw at +1.5s with 0.15s
stagger, labels fade at +2.0s. Plus 2–3s of read time.

## `markerId` collision

The `markerId` prop must be **unique per scene**. The component defines
an SVG marker with id `ad-arrow-<markerId>` and references it via
`url(#ad-arrow-<markerId>)`. If two `ArchitectureDiagram` scenes share a
`markerId`, the second arrow head will be missing.
