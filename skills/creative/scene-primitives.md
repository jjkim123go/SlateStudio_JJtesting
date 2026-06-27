# Scene Primitives — hand-stitch bespoke scenes; reuse only product chrome

> **Creative — Layer 2. Load at SCENE-PLAN and while authoring any non-chrome
> scene.** Pairs with [`art-direction.md`](art-direction.md) (the identity) and
> [`design-critic.md`](design-critic.md) (the variety gate).

## Why this exists

A single beautiful reusable component, repeated across every scene, is still a
template — it just looks nicer. The token-tape pilot proved this: scene 1 blew
people away, then the same motif carried all 10 scenes and the whole video
*became that one component*. Variety is the missing ingredient. The fix is to
**hand-stitch each design scene from primitives**, and reuse components **only**
for product chrome.

## The doctrine: two classes of visual

**1. Product / chrome components — REUSABLE.** Anything that imitates real
software must look real and be consistent, so build it once and reuse it:
VS Code, Terminal, GitHub / Azure DevOps, Teams, Outlook, Excel, PowerPoint,
Azure Portal, a browser frame, a phone shell. These are skinnable shells — use
the catalog (`TerminalCast`, `VSCodeScene`, `ScreenDemoFrame`, `ExcelScene`,
`EdgeBrowserFrame`, …) and feed them content. **Never hand-draw a fake Outlook.**

**2. Design / explanatory / abstract visuals — HAND-STITCHED from primitives.**
Diagrams, data-viz, kinetic typography, metaphor scenes, transitions, hero
moments. **Do not reach for a finished design component** (`DataFlow`,
`StepByStep`, a "workflow" component, a one-motif token-strip) as the scene's
content. Compose each scene from primitives so it is its own thing. Finished
design components are the sameness trap — the user called this out explicitly.

> If you find yourself filling the props of a design component, stop. Either it's
> chrome (fine) or you should be hand-stitching from primitives.

## The primitives toolbox (what you build FROM)

| Primitive | Use for |
|---|---|
| **GSAP 3.12 core + Flip** | The motion backbone of every scene. Sequence reveals, physics-y settles, camera drifts, layout moves (Flip). Paid Club plugins (DrawSVG / MorphSVG / MotionPath / SplitText) are **NOT** loaded — see the capability harness below for manual recipes. |
| **SVG** | Line-art, masks, crisp diagrams / charts at 1080p. "Stroke-draw" = tween `stroke-dashoffset` yourself; "morph" = cross-fade or keyframe `d` (no DrawSVG / MorphSVG). |
| **Canvas 2D** | Particles, generative texture, hand-drawn charts, flow fields, noise. |
| **WebGL / three.js** | 3D objects, depth, camera moves, shader materials, displacement. (Render with `--safe-webgl`; budget render time.) |
| **HTML / CSS** | Layout, type, gradient-mesh, glass (`backdrop-filter`), grain, soft shadow, masks. |
| **HyperFrames runtime** | The scene host (layout, timing, deterministic capture). Everything above runs inside it. |
| **Generated media** | gpt-image-2 stills (with Ken-Burns / parallax) and Sora-2 clips, as scene textures or full-bleed beds. |

## Runtime capability harness (what's ACTUALLY loaded)

These — and only these — are available inside the HyperFrames render sandbox
(allowlist: `config/org/governance-policy.yaml` › `runtime_libraries.render_components`).
Know them *before* you hand-stitch, or you'll reach for a plugin that isn't there
and the render breaks.

**Loaded:**
- **GSAP 3.12 core** (timeline, tweens, stagger, eases) — injected on every scene.
- **GSAP Flip** — layout choreography (reorder / expand / swap position). Load
  [`render/gsap-flip`](../core/render/gsap-flip.md).
- **three.js 0.171.0** — WebGL / 3D, embedded only for `ThreeScene` / three-backed
  components. Load [`render/three-js`](../core/render/three-js.md).
- **shiki** (code highlighting), **mermaid** (text→diagram), **chart.js** (true
  axes / legend) — for fidelity in the relevant component types.
- **Raw SVG, Canvas 2D, HTML / CSS** — masks, `backdrop-filter` glass, gradient
  mesh, grain, soft shadow, CSS filters. Most bespoke design lives here.

**NOT available (do NOT reach for these — they silently break the render):**
- Paid **Club GSAP plugins**: DrawSVG, MorphSVG, MotionPath, SplitText,
  ScrambleText, Physics2D / Inertia, GSDevTools.
- ScrollTrigger / ScrollSmoother / Observer / Draggable (no scroll or
  interaction surface in a headless seek-render).

**Manual recipes (use instead of the excluded plugins):**
- **Stroke-draw a path** (≠ DrawSVG): set `stroke-dasharray` = path length, then
  GSAP-tween `stroke-dashoffset` from length → 0.
- **Kinetic / per-letter type** (≠ SplitText): split into `<span>`s yourself (in
  `index.html` or a server-built `{{{html}}}` prop), then stagger.
- **Move along a path** (≠ MotionPath): sample `path.getPointAtLength()` in a
  setup pass and tween x / y through the points — or use Flip for layout moves.
- **Morph shapes** (≠ MorphSVG): cross-fade two shapes or keyframe the path `d`
  between a few hand-authored states; avoid true morphing.
- **Particles / fields**: Canvas 2D or three.js with a **seeded** PRNG, driven by
  the master timeline's progress — never an independent `rAF` loop.

**Determinism (why the above matters):** capture is **seek-based** — the renderer
scrubs the shared `master` timeline frame-by-frame. Anything driven by
`requestAnimationFrame` or `gsap.ticker` alone won't advance. Drive everything
from `master`, seed all randomness, and dispose three.js resources on scene exit.

## Technique palette — pick a DIFFERENT one per scene

Plan each scene to a distinct technique. Aim for spread; no technique more than
~twice; never two adjacent scenes the same. (Record these as `sceneTreatments`
in `art-direction.json`.)

- **Kinetic typography** — the words *are* the visual; scale/weight/mask/line
  reveals, off-grid, overlap.
- **3D / WebGL** — an object or camera move with real depth, rotation, shader
  material.
- **Hand-stitched data-viz** — an SVG line that draws on, bars that grow with
  easing personality, a Canvas waveform. *Not* the catalog chart.
- **Particle / physics field** — Canvas/WebGL: n² link mesh, swarm, flow,
  dissolve.
- **Generated-image hero** — a gpt-image-2 still as a full-bleed bed with
  parallax/Ken-Burns and type over it (use `ImageBackdrop` for full-bleed).
- **Sora-2 clip bed** — motion footage behind type (the only raster that fills
  1920×1080 without pillarbox).
- **Product-chrome demo** — reusable chrome (Terminal, VS Code, Outlook) showing
  the real thing.
- **Macro / material scene** — the `material` itself fills the frame (liquid,
  ink bloom, glass refraction, metal).
- **SVG diagram that assembles** — nodes/links draw on along a grid; bespoke, not
  DataFlow defaults.
- **Photographic collage / cutout motion** — layered stills with parallax depth.

## How to build a hand-stitched scene (the loop)

1. **Pick the technique** — different from its neighbours (check
   `sceneTreatments`).
2. **Author it as a one-off** — a single-purpose scene component or a layered
   composition on the HyperFrames runtime. **You are authoring a component**, so
   load the contract first: [`component-authoring`](../core/component-authoring.md)
   (push tweens onto the shared `master` timeline; use `SCENE_ID` / `SCENE_START`
   / `SCENE_DURATION`; transform-only props; no auto-play, no `requestAnimationFrame`),
   [`gsap-component-patterns`](gsap-component-patterns.md), plus
   [`render/three-js`](../core/render/three-js.md) for WebGL and
   [`render/html-in-canvas`](../core/render/html-in-canvas.md) if you bake text
   into a texture. Put it in **`projects/<slug>/components/<Name>/`** (next to the
   SCF) — a project one-off needs **no** global registration; the renderer
   auto-resolves project-local components by name. Then run the mandatory
   visual-QA frame check. Keep text-fit and timeline on the tested runtime so it
   can't break.
3. **Stay on-identity** — express ≥3 of {palette, material, motionSignature,
   composition, signatureMotif}. Same material + palette as every other scene.
4. **Gate it** — run the [`design-critic`](design-critic.md) keyframe loop
   (render → look → score → fix). Bespoke is safe because it's *verified*, not
   because it was pre-built.

A one-off scene component is cheap: it lives in **`projects/<slug>/components/<Name>/`**
(next to the video's SCF) and is used by exactly one scene. **It needs no global
registration** — the renderer resolves project-local components by name, so
single-use scenes never touch the shared catalog or schema. It does **not** need
to generalize — resist adding props/modes for reuse. Reusability is for chrome
(the global `render/components/`).

## The signature motif is connective tissue, not the scene

The motif (a mark, a transition, a persistent edge meter, a material echo) ties
scenes together. It is **not** the hero visual of every scene. Let it own the
hook + one hero + the close; elsewhere it's a 5–20% accent while a varied
technique carries the scene. If the motif *is* the scene every time, you've
rebuilt the template you were trying to escape.

## Don't forget the production layers

A finished video has **music** (always, ducked under narration), **captions**
(default on, styled to the art direction), and usually **≥1 generated image or
Sora clip** for texture and variety. Check these at compose time — the pilot
shipped without music or any generated media because nothing forced the check.

## Reliability notes (so hand-stitched stays safe)

- Prefer **GSAP + SVG/Canvas/CSS** for most scenes — deterministic, fast
  (~20–30 s/scene), full-bleed, no driver risk.
- Use **WebGL/3D** for one or two hero moments, not everywhere — it renders via
  software swiftshader (`--safe-webgl`) and is slow (~8–13 min/scene).
- Only **Sora clips** and **pure HTML/CSS/Canvas/SVG/WebGL** fill 1920×1080;
  bare `<img>`/video layers pillarbox (use `ImageBackdrop` for full-bleed
  stills).
- Verify each new technique on **one scene** before building the rest
  (`--split-scenes`, extract a keyframe, look).
