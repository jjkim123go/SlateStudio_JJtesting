# Premium Motion Routing — Creative Skill

> Creative — Layer 2 routing taste. Load at **scene_plan** stage when a
> script asks for "premium," "cinematic," "high-end," "3D," "depth,"
> "parallax," "shader," "particle," "logo wall," "device flythrough,"
> "dramatic reveal," or any time the agent is tempted to reach for
> three.js or a Sora-2 clip to make a scene feel expensive.
>
> Companions: `core/render/three-js.md` (the engineering contract for 3D),
> `core/render/html-in-canvas.md` (textures for 3D), `core/structured-visuals.md`
> (component-first routing), `models/foundry-video-gen.md` (Sora-2 cost/limits).

## Purpose

"Premium motion" rarely means *more 3D*. It usually means **the right
treatment for the moment** — and the right treatment is almost always the
cheapest one that still earns the cinematic note. This skill is the taste
layer: it routes a scene to standard 2D / 2.5D polish / true 3D / Sora-2
hybrid, in that preference order, and explains the trade.

## The ladder (cheapest credible treatment first)

| Tier | Treatment | When it's the right pick | Cost / Risk |
|---|---|---|---|
| **T1 — Standard 2D** | HyperFrames component(s) + GSAP, captured in DOM. | The scene's job is to *communicate* (metric, quote, code, diagram, headline). | $0, deterministic, fast. Default. |
| **T2 — 2.5D Polish** | Same components, plus stacked HTML+CSS depth (transforms, perspective, parallax-on-scroll-equivalent), GSAP-FLIP transitions between layouts. | The scene should *feel* layered — depth cue, foreground/background hierarchy, soft camera-like move — but the content is still flat HTML. | $0, deterministic. Needs `gsap-flip` + good motion taste. |
| **T3 — Sora-2 hybrid** | A Sora-2 generated 4/8/12s clip as a scene's *background plate*, with a HyperFrames component (text card, logo, lower third) composited on top. | The scene needs *real* organic motion (camera move through a real-looking environment, moody establishing shot, ambient texture) AND text must remain crisp and editable. | ~$0.20/sec, non-deterministic, rate-limited (1/min). Use sparingly. |
| **T4 — True 3D** | `ThreeScene` / `HTMLTextureWall` / `DeviceStage3D` / `ShaderPortal`. | The scene's *idea* is geometric: a logo wall flythrough, a device rotating to reveal the screen, parallax that's actually 3D, a custom shader transition. The "third dimension" carries meaning. | Authoring cost (component + skill load), capture cost (WebGL contexts). Only worth it when the idea cannot be sold in T1–T3. |

Reach for the lowest tier that earns the moment. Skipping straight to T4
because it sounds cool is the most common failure mode.

T4 also carries a render-safety obligation: validate one scene first, then use
`node render/render.mjs <scf> --split-scenes` for local desktop renders. Slate
auto-selects GPU-oriented WebGL defaults (`workers=2`, `useGpu=true`, and
`webglBackend=d3d11` on Windows) unless `--safe-webgl` or explicit flags are
provided. Use `--safe-webgl` after black frames, crashes, throttling, or memory
pressure.

If a real GPU is available, agents should test it after the safe single-scene
probe, not before. On Windows, use
`--use-gpu true --webgl-backend d3d11 --workers 1` for one representative scene;
if that render is stable and faster, rerun the same scene with `--workers 2`.
Carry GPU flags into the split-scene render only when the worker-2 probe is
stable and materially faster. Try `workers=3` only with obvious GPU/VRAM
headroom; otherwise stay on `workers=2` or the safe WebGL path.

## Decision questions (apply in order)

1. **What is the scene saying?** If it's a fact, a number, a quote, code,
   or a diagram — T1 wins. The audience is reading, not flying.
2. **Is the cinematic note about *layering* or about *space*?**
   - Layering (front content, soft background, gentle parallax) → T2.
   - Space (camera moves through, geometry rotates, depth carries meaning) → T3 or T4.
3. **Does the scene need a *real-world* texture (people, places, weather)?**
   - Yes, and text must stay crisp → T3 (Sora-2 plate + DOM overlay).
   - Yes, and text can live in the plate → standalone Sora-2 scene (no overlay).
4. **Is the third dimension carrying meaning the audience must read?**
   (e.g., a logo wall whose *scale* shows ecosystem breadth, a device that
   rotates so the screen is the reveal, a portal that morphs scenes.)
   - Yes → T4. Author the component using `core/render/three-js.md`.
   - No → drop down to T3, T2, or T1.
5. **What's the budget and the deadline?** T4 needs at least one component
   authoring round. T3 needs Sora-2 budget headroom. If neither fits the
   slot, go T1/T2 — a tight 2D scene is always better than a sloppy 3D one.

## When 3D is actually worth it

True 3D earns its complexity when the scene meets at least *two* of:

- **Geometric idea** — a wall, a flythrough, a rotation, a portal.
- **Hero moment** — opening, closing, key reveal, brand stinger.
- **Reusable beat** — the component will be reused across videos
  (logo wall, device stage, brand intro variant).
- **Audience memory** — viewers will remember "the moment with the X"
  rather than the words spoken over it.

If the scene meets none of these, T4 is decorative motion — the kind of
"premium" that makes the video feel longer without making it feel better.

## Anti-patterns

- **3D for a single text scene.** Use T1 — `TitleCard`, `Quote`, or
  `MetricsCard` reads better and renders faster.
- **3D to "hide" weak content.** If the script doesn't earn the moment,
  motion won't either. Fix the script.
- **Sora-2 plate behind a dense data scene.** The video plate competes
  with the text. Use a still gradient or a structured background instead.
- **Particle systems for ambiance.** They blow draw calls and add
  capture jitter. If you want shimmer, use a CSS gradient + a slow GSAP
  hue rotate.
- **Custom shader transitions between every scene.** A `ShaderPortal`
  earns its keep ~once per video. Use standard crossfades elsewhere.
- **Real `TextGeometry` in a 3D scene.** Always texture-mapped HTML
  cards via `html_texture_render`. See three-js skill, rule 5.

## SCF integration sketch

```jsonc
// T1 — Standard 2D
{ "id": "metric", "duration": 4, "component": "MetricsCard",
  "props": { "value": "98.7%", "label": "Uptime" } }

// T2 — 2.5D Polish (still HTML; depth via transforms)
{ "id": "headline", "duration": 5, "component": "HeroParallaxCard",
  "props": { "title": "Ship faster", "depthLayers": [...] } }

// T3 — Sora-2 plate + DOM overlay
{ "id": "establishing", "duration": 8, "layers": [
    { "type": "video", "src": "assets/sora-skyline.mp4" },
    { "type": "text", "content": "Welcome to Q3", "style": "heading", "animation": "fadeInUp" }
  ], "narration": "assets/welcome.wav" }

// T4 — True 3D (implemented MVP)
{ "id": "hero-depth", "duration": 6, "component": "ThreeScene",
  "props": { "title": "Agentic video production", "mode": "orbital",
             "primaryColor": "#8B5CF6", "accentColor": "#E7D7A2" } }
```

`HTMLTextureWall` and `DeviceStage3D` are also available alongside `ThreeScene`.
Pick `DeviceStage3D` when the hero artifact is a single screen/screenshot,
`HTMLTextureWall` when many cards need to be on screen at once (logo / quote /
capability walls), and `ThreeScene` for everything else 3D. `ShaderPortal`
remains a planned follow-on. See `core/render/three-js.md` for the authoring
contract when new 3D components are built.

## Brief / script signals to watch for

The agent often has to *infer* premium intent from soft cues. These
phrases should make you re-read this skill:

- "feel premium / cinematic / high-end / Apple-level / launch-grade"
- "depth / parallax / dimensional / layered"
- "fly through / reveal / rotate / portal / morph"
- "logo wall / customer wall / quote wall"
- "device demo / show the laptop / phone in hand"
- "shader / particle / shimmer / glass / glow"
- "moody / atmospheric / ambient / texture"

For each cue, walk the ladder. Don't skip rungs.

## See also

- `core/render/three-js.md` — engineering contract for T4
- `core/render/html-in-canvas.md` — textures for T3/T4
- `core/animation/motion-intent.md` — what kind of motion fits the moment
- `core/animation/material-physics.md` — GSAP params for T1/T2 polish
- `models/foundry-video-gen.md` — Sora-2 cost/limit reference for T3
- `core/scene-component-routing.md` — upstream component selector
