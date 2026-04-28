# ScrollingBackground Component

> Layer 2 component skill. Load when a scene needs **continuous ambient
> motion behind a foreground**: a quote that needs life behind it, a long
> narration block where a static image would feel frozen, a brand bumper
> with subtle drifting shapes. This component **never** carries content
> meaning — the foreground does. It is wallpaper, not message.

## When to use

**Trigger vocabulary:**
`background, ambient, parallax, drifting, scrolling, motion behind, behind
the text, while I narrate, hero shot with motion, atmospheric, b-roll feel,
underlying motion, infinite loop, looping background`.

**Don't use this** for content that conveys information — use `DataFlow`,
`ArchitectureDiagram`, `DataChart`, or a real video clip instead. Use this
**only** when the visual job is "make the frame feel alive while the
viewer reads / listens to something else."

## Props

```json
{
  "direction": "parallax",
  "loopSec": 14,
  "noise": true,
  "safeContrastMode": true,
  "gradientStopsJson": "[\"#020617\",\"#0f172a\",\"#020617\"]",
  "layersJson": "[{\"type\":\"gradient\",\"color\":\"#7c3aed\",\"opacity\":0.55,\"speed\":80},{\"type\":\"shape\",\"color\":\"#22d3ee\",\"opacity\":0.40,\"speed\":140},{\"type\":\"image\",\"assetSrc\":\"output/assets/skyline.png\",\"opacity\":0.70,\"speed\":220}]",
  "childHtml": "<h1 style=\"font-size:88px;font-weight:800;color:#fff;text-align:center;max-width:14ch;\">A platform that explains itself.</h1>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `direction` | enum | no | `left` (default) \| `right` \| `up` \| `down` \| `parallax`. `parallax` forces horizontal axis and assigns each layer a slower multiplier the further back it sits (multiplier `1 + index * 0.30`). |
| `loopSec` | number | no | Default `12`. Base loop duration in seconds. With `parallax`, each layer extends this by its index multiplier. With non-parallax directions, used only for layers that omit a per-layer `speed`. |
| `noise` | bool | no | Default `false`. Renders a fixed SVG fractal-noise overlay at opacity 0.04. Adds analog "grain" — recommended for cinematic moods. |
| `safeContrastMode` | bool | no | Default `false`. When `true`, paints a `rgba(0,0,0,0.30)` veil between layers and foreground so child text (passed via `childHtml`) keeps WCAG-friendly contrast over busy layers. |
| `gradientStopsJson` | string (JSON) | no | JSON-stringified array of 2–4 hex colors used to paint the static base gradient (behind all moving layers). Defaults to `["#0a0e27","#1a1f3a","#0a0e27"]`. |
| `layersJson` | string (JSON) | yes | JSON-stringified array of layer objects (see below). 1–6 layers recommended; the renderer caps tween count per CONTRACT §6 (≤ 30 active tweens). |
| `childHtml` | string | no | Raw HTML rendered into the centered foreground overlay (above all layers + noise + contrast veil). Use for a quote, headline, brand mark, or `<video>` element. The component supplies safe-area padding (6%/8%); style fonts/colors yourself. |

> **Compiler / SCF authoring (read this once).** `gradientStopsJson` and
> `layersJson` must be pre-stringified JSON until the Lane C prop-builder
> shim lands (mirrors the DataFlow / DataChart precedent — see
> `data-flow.md` § "Compiler / SCF authoring"). `childHtml` is a flat scalar
> rendered raw via triple-mustache; no nested object access (`child.html`)
> is supported by the compiler today.

**Layer object:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | enum | yes | `gradient` (soft directional sweep) \| `shape` (radial blob field, decorative) \| `image` (cover-cropped raster) \| `noise` (per-layer fractal grain — usually use top-level `noise: true` instead). |
| `color` | hex | no | Required for `gradient` and `shape`; ignored for `image` / `noise`. Defaults to `#3b82f6`. |
| `opacity` | number 0–1 | no | Default `1.0`. |
| `speed` | number | no | Pixels-per-second loop speed. Used only when `direction !== "parallax"` (parallax derives speed from layer index). Higher = faster. |
| `assetSrc` | path/URL | yes for `image` | Path or URL to a raster asset. The component cover-crops it; supply a wide enough image for horizontal scrolls. |

## Visual recipe

Each layer is rendered **twice side-by-side** inside a 200%-sized container
and translated by the host dimension over `dur` seconds, infinite, linear
ease — yielding a perfectly seamless loop with no snap.

| Step | Time (relative to `SCENE_START`) | Effect |
|------|----------------------------------|--------|
| Base + DOM build | `+0.00s` | Static base gradient painted; per-layer DOM (two-tile structure) appended; foreground overlay + child HTML mounted. |
| Layer loops kickoff | `+0.00s` | All layer tweens start in unison via a `master.call(...)` at `SCENE_START`. Each tween: `gsap.fromTo(layer, { x: 0 }, { x: ±tileSize, duration: dur, repeat: -1, ease: 'none' })`. |
| Soft-mute | `SCENE_START + SCENE_DURATION − 0.6s` | Whole component fades to `opacity: 0.7` over `0.3s` to gracefully step down before the cut. |
| Exit fade | `SCENE_START + SCENE_DURATION − 0.3s` | Whole component fades to `opacity: 0` over `0.3s` (CONTRACT §7 ≥ 0.3s margin). |

**Recommended scene duration:** **6–60 seconds.** Too short and the loop
doesn't have time to feel ambient (viewer pattern-matches it as a still
image with a glitch); too long and the loop becomes hypnotic in a bad way.
Sweet spot is whatever the foreground content needs.

**No narration-anchored timing props** — this is ambient motion. If you
need a beat-locked background, use `DataFlow` or build a custom scene; do
not try to bend `ScrollingBackground` to match narration.

## Composition tips

- **Start dim, end dimmer.** A `gradientStopsJson` that's only 5–10%
  brighter than `#000` reads as ambient. If your shape/image layers
  already pop, keep the base nearly black.
- **Three layers max for shape/image.** More than three moving layers and
  the eye starts tracking individual elements instead of relaxing into
  the field. Gradient layers are cheap; shape/image layers are
  attention magnets.
- **Speed-matters more than direction.** A slow `parallax` (loopSec 18+)
  reads as luxurious; a fast `left` (loopSec 4) reads as urgent /
  technical. Match the foreground tone.
- **Always `safeContrastMode: true` when `childHtml` carries text.** Image
  layers or saturated shape layers will eat white text without the veil.
- **Don't combine with on-screen captions.** Captions already sit at the
  bottom of the frame; a busy bottom-half background fights them. If
  captions are on, bias the foreground content to the top half.

## Provenance

| Design choice | Source |
|---------------|--------|
| Component name `ScrollingBackground` | Slate Phase II PR 5 task spec, Lane A. |
| Five `direction` options including `parallax` | PR 5 task spec. |
| Four `layer.type` values (`gradient`, `shape`, `image`, `noise`) | PR 5 task spec. |
| `safeContrastMode` veil at `rgba(0,0,0,0.30)` | News-graphics convention — broadcast lower-third systems use a 30% black scrim under text over busy backgrounds; this is the standard "make sure the words are readable" tax. |
| Parallax multiplier `1 + index * 0.30` | Animated explainer parallax convention (back layers move slower than front layers); the 30%-per-layer step yields perceptible depth without making layer 4 feel frozen. |
| Two-tile seamless loop (200% container, translate by host dimension) | Standard CSS-only continuous-scroll pattern; preferred over `background-position` here because the CONTRACT §6 performance guidance recommends `transform` over `top/left/background-position` for GPU compositing. |
| Loops launched via `master.call(SCENE_START)` (not direct `master.to`) | Keeps the master timeline finite (renderer requires this for scene duration calculation) while still synchronizing every layer's first frame to `SCENE_START`. |
| Soft-mute step (opacity 1 → 0.7 → 0) instead of single fade | Two-stage exit reads less abrupt than a single 0.4s fade for content that has been visible for many seconds; mirrors broadcast outro convention. |
| SVG fractal noise (baseFrequency `0.9`, opacity `0.04`, no animation) | Cinematic film-grain convention. Animating noise creates a flicker that fights the ambient brief; static noise gives the analog feel without distraction. |
| Class prefix `sb-` | **Invented** for this PR. The orchestrator must add it to CONTRACT §5 prefix registry. |
| JSON data-island pattern (`data-layers`, `data-gradient-stops` carry pre-stringified JSON) | Mirrors `DataFlow` / `DataChart` precedent. The compiler has no per-component prop builder today (`render/lib/scf-to-html.mjs`). |
| Flat `childHtml` scalar (not `child.html` dotted path) | Compiler does not currently flatten dotted-path props in any shipped component template (verified across all `render/components/*/index.html`). |
| Selector hygiene (`'.scene-' + SCENE_ID + ' .sb-...'`) | CONTRACT.md §4.3 lines 116–118. |
| Exit fade landing 0.3s before scene end | CONTRACT.md §7 lines 165–174. |

## Deferred dependencies

ScrollingBackground is **fully self-contained at runtime**. Related but
non-blocking work:

- **Lane C prop-builder shim** — when it ships, callers can switch from
  `layersJson` / `gradientStopsJson` (pre-stringified) to natural
  `layers` / `gradientStops` arrays. The component already reads from
  `data-layers` / `data-gradient-stops`, so only the template binding
  needs to change at that point.
- **Brand-color resolver atom** — same story as `SectionDivider`: a shared
  helper that reads brand props and sets CSS custom properties would
  deduplicate setup across components. Not required for ship.
- **Asset preload contract** — when a layer uses `type: image`, the
  asset must be present at render time. A future preload step in the
  pipeline orchestrator would move this from "implicit caller
  responsibility" to "verified before render."
