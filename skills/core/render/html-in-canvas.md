# HTML-in-Canvas — Layer 3 Skill

> Layer 3: Routing skill for "I need HTML to end up inside a `<canvas>` or as
> a texture." Load whenever a scene calls for HTML/SVG/text content that must
> live inside a 3D scene, a particle system, a shader, a video frame buffer,
> or any other canvas-bound surface.
>
> Companion to: `core/render/three-js.md` (consumer of these textures),
> `core/structured-visuals.md` (component-first routing for static text/data).

## When to load

Triggers: `CanvasTexture`, `THREE.Texture`, `texture from HTML`, `HTML on
a 3D card`, `text on a plane`, `screen of a 3D laptop`, `logo wall`,
`quote wall`, `billboard`, `Satori`, `resvg`, `html2canvas`, `dom-to-image`,
`screenshot a component`, `puppeteer screenshot`, `SVG → PNG`, "I want a
HUD overlay rendered into the WebGL frame", any mention of the planned
`HTMLTextureWall` / `DeviceStage3D` components.

Don't load this skill for:

- A normal 2D scene where the HTML is just a HyperFrames component on
  the page. That's the default path — no canvas conversion needed.
- Animated charts/diagrams/code rendered by an existing component
  (`DataChart`, `DataFlow`, `TerminalCast`, etc.). Those stay in the DOM.

## The decision tree

```
Does the scene need this HTML to end up *inside a canvas* (3D plane,
shader, particle, video buffer)?
├── NO → Stop. Use the normal HyperFrames component path.
└── YES ↓

Is the content a card/label/badge — title + maybe subtitle/caption?
├── YES → `html_texture_render` with `template: "text-card" | "label" | "badge"`.
│         Deterministic, zero-cost, ships today. ✅
└── NO ↓

Is the content already authored as an SVG (icon, simple chart, diagram)?
├── YES → `html_texture_render` with `svg: "<svg ...>"`.
│         Requires `cairosvg` to be installed; otherwise the tool returns
│         a clean failed_dependency error (no silent fallback). ✅
└── NO ↓

Is the content a fully-styled HyperFrames component you've already authored
(VSCodeScene, ScreenDemoFrame, MetricsCard, etc.)?
├── YES → Use `component_texture_capture` with
│         `mode: "component_frame"` or `mode: "scf_frame"` to capture an exact
│         PNG keyframe through the same SCF compiler + @hyperframes/producer
│         browser path used for normal rendering. ✅
└── NO ↓

Is it arbitrary HTML/CSS that nobody has authored as a component yet?
├── Option A (recommended): Author it as a HyperFrames component first,
│   then either keep it in the normal component path or capture it with
│   `component_texture_capture`. You get reuse + reviewability.
├── Option B (only if truly one-off): Use a future Satori+resvg or
│   headless-browser path. NOT IN THE MVP — `html_texture_render` returns
│   a failed_dependency error for `html` mode on purpose, so you don't ship
│   something that pretends to work.
└── Never: send the raw HTML to gpt-image-2 hoping it'll "draw the UI".
    Image models hallucinate text, numbers, and layout. P5 forbids this.
```

## Component / SCF frame capture

`component_texture_capture` is the first-class bridge for Slate's
three.js/HTML-in-canvas roadmap. It captures a deterministic PNG frame from
either:

- `mode: "component_frame"` — one registered HyperFrames component plus props,
  wrapped in a single-scene SCF.
- `mode: "scf_frame"` — an existing SCF composition at a specified time.

Implementation details:

- Reuses `render/lib/scf-to-html.mjs` and `@hyperframes/producer` frame capture.
- Writes a real PNG; no AI image generation and no approximate HTML rasterizer.
- Requires local renderer dependencies (`cd render && npm install`) and a
  Chromium/Puppeteer environment that can run producer capture.
- Fails loudly on unknown components, invalid SCF, missing Node/producer, or
  capture times outside the composition duration.

Use this for HTML cards as 3D textures, `DeviceStage3D` device screens,
`BrowserWall3D` / `AppScreensCarousel` panels, and Foundry image/video hybrid
compositing where exact component text/UI must remain readable on a 3D surface.

Continue to use `html_texture_render` for simple deterministic card/label/badge
textures and SVG rasterization. Do **not** route arbitrary raw HTML to
`component_texture_capture`; author a component first.

## Why the MVP rejects arbitrary HTML

Three options exist for "arbitrary HTML → PNG", each with a real cost:

1. **Satori + resvg** (`@vercel/satori` → SVG → `resvg` → PNG). Excellent
   text fidelity, supports a constrained CSS subset, deterministic, no
   browser. Adds a Node dependency and a per-call subprocess cost.
2. **Headless browser** (Playwright/Puppeteer screenshot). Full CSS. Slate now
   supports the safe subset of this path only for already-authored HyperFrames
   components/SCF via `component_texture_capture`, reusing producer's existing
   Puppeteer dependency and deterministic `window.__hf.seek()` protocol.
3. **`html2canvas` / `dom-to-image`** *inside* the captured page. Pure JS,
   but produces *visibly different* output from the DOM (CSS subset,
   filter approximations, no proper subpixel text rendering). Surprises
   reviewers.

The `html_texture_render` MVP still picks **none** of these for arbitrary raw
HTML. It returns a clear error so the agent either (a) routes to a card
template, (b) authors a component and captures that component, or (c) escalates
to the user. Honest fidelity beats fake fidelity.

When/if Slate adds a Satori path, this skill will gain a "Satori mode" section.
Until then, treat `html` mode as "documented, not implemented".

## Texture authoring tips

When generating PNGs that will become three.js textures, follow these
rules to avoid the most common artefacts.

### Sizing

- Render textures at **2×** the on-screen plane size. A plane that ends
  up ~512px tall on screen wants a 1024px texture for retina sharpness.
- Prefer **power-of-two** dimensions (256, 512, 1024, 2048) so mipmaps
  work. `html_texture_render` warns when the dimensions are not POT.
- Cap at **2048×2048** unless you genuinely need 4K. Bigger textures
  blow GPU memory and slow capture.

### Color

- Always set `texture.colorSpace = THREE.SRGBColorSpace` on the consumer
  side. Pillow saves PNGs as sRGB by default, so this matches.
- Pick card backgrounds with the brand palette so the 3D scene reads as
  the same product. Defaults are slate-900/slate-50/sky-400 — overridden
  via `bg`, `fg`, `accent` data keys.

### Transparency

- The `label` and `badge` templates default to a transparent background
  for compositing onto an existing 3D scene. The `text-card` template
  defaults to opaque slate-900 — pass `bg: [0,0,0,0]` for transparent.

### CORS / taint

- The texture file MUST be loaded from the same origin as the rendered
  HTML page, OR served with `Access-Control-Allow-Origin: *`. A tainted
  canvas silently breaks frame capture. See the three.js skill, rule 6.

## Tool surface

`html_texture_render` (Layer: GENERATE, runtime LOCAL, BETA):

- Inputs: one of `template` / `svg` / `html`, plus `data`, `width`,
  `height`, `output_dir` or `output_path`.
- Outputs: `{ texture_path, width, height, mode, deterministic }`.
- Costs: $0. Time: tens of milliseconds for cards, ~100ms for SVG.
- Failure modes:
   - `html` mode → `failed_dependency: html-rasterizer` (by design).
   - `svg` mode without `cairosvg` → `failed_dependency: cairosvg`.
   - Both fail loudly so the agent picks a real fallback.

`component_texture_capture` (Layer: GENERATE, runtime LOCAL, BETA):

- Inputs:
  - `mode: "component_frame"`, `component`, optional `props`, `duration`,
    `time`, `width`, `height`, `fps`.
  - `mode: "scf_frame"`, exactly one of `scf` / `scf_path`, plus `time`,
    `width`, `height`, `fps`.
- Outputs: `{ texture_path, width, height, time, frame_index, fps, duration,
  mode, deterministic, html_path, work_dir }`.
- Costs: $0. Time: usually seconds because it launches producer capture.
- Failure modes:
  - Missing Node / producer deps / Chromium → failed dependency.
  - Invalid SCF or unknown component → schema/compiler error.
  - `time` outside composition duration → hard error, no fallback frame.

## See also

- `core/render/three-js.md` — the consumer contract (rule 5: text-as-texture)
- `core/structured-visuals.md` — when an animated DOM component is the right call
- `core/scene-component-routing.md` — upstream selector for any scene
- `creative/premium-motion-routing.md` — when 3D / texture work is even justified

## Provenance

Distilled from: three.js Texture / CanvasTexture docs, MDN
`HTMLCanvasElement.toDataURL` / cross-origin image notes, Vercel Satori
docs (https://github.com/vercel/satori), `resvg` README, Playwright
"Screenshot" docs, and `html2canvas` known-limitations page.
