# Component Authoring (Slate-Specific)

> **Layer 2 skill** — load whenever editing or adding files under
> `render/components/**` or `render/lib/scf-to-html.mjs`.
>
> **Companion skills (Layer 3, generic animation):**
> [animation/basics.md](animation/basics.md),
> [animation/sequencing.md](animation/sequencing.md),
> [animation/performance.md](animation/performance.md),
> [animation/value-helpers.md](animation/value-helpers.md).
>
> **Companion skills (Layer 2, motion design):**
> [animation/motion-intent.md](animation/motion-intent.md) — pick a material,
> [animation/material-physics.md](animation/material-physics.md) — get GSAP params,
> [animation/attention-choreography.md](animation/attention-choreography.md) — sequence elements.
>
> **Companion skills (Layer 3, vendor libraries) — load if applicable:**
> [render/three-js.md](render/three-js.md) — mandatory for any WebGL component
> (planned `ThreeScene` / `HTMLTextureWall` / `DeviceStage3D` / `ShaderPortal`):
> no rAF loops, master-timeline driven, seeded randomness, text-as-texture,
> dispose on scene exit;
> [render/html-in-canvas.md](render/html-in-canvas.md) — when a component
> bakes HTML/SVG/text into a canvas or texture.

This skill defines the **Slate component contract**: what a HyperFrames
component must do, how it integrates with the SCF compiler, and which Slate
constraints override generic animation guidance.

---

## Why this skill exists

HyperFrames is a generic HTML→MP4 renderer. Slate constrains it heavily so
that:

1. The SCF compiler can sequence components on a master timeline without
   each component needing to know about the others.
2. Components render deterministically under headless Puppeteer capture
   (no flaky CSS layout, no layout-thrash jank).
3. Brand governance can guarantee output consistency across components.
4. Adding a component is a 4-file change, not a refactor.

The 6 rules below are mandatory. They override anything generic GSAP guidance
would tell you.

---

## The Slate Component Contract

### 1. Components are HTML fragments, not pages

A component lives at `render/components/<Name>/index.html` and contains only
the markup for that scene's content. No `<html>`, `<head>`, `<body>`, or
`<script>` tags — the SCF compiler wraps and injects everything.

Use `{{var}}` placeholders for SCF-supplied props. The compiler resolves
them from the scene's `props` object.

### 2. Animations live in a sibling `animation.js`

Each component has `render/components/<Name>/animation.js` that pushes
tweens onto a **shared master timeline** named `master` (created by the SCF
compiler, in scope for every component). HyperFrames seeks `master`
frame-by-frame during capture; nothing should auto-play.

The compiler also auto-injects per-scene visibility (opacity 0→1→0) using
the `.scene-${SCENE_ID}` wrapper class. Components should NOT animate
the wrapper itself — only their internal elements.

> Historical note: earlier proposals described per-scene `gsap.timeline()`
> instances registered on `window.__timelines[SCENE_ID]`. That is **not**
> the current contract. The compiler exposes one shared `master` and one
> `window.__timelines[compositionId]`. Always push onto `master`.

### 3. Use the injected scene constants

The compiler injects three constants into every `animation.js` scope (plus
the shared `master` timeline):

| Constant | Type | Meaning |
|----------|------|---------|
| `SCENE_ID` | string | Unique scene id (kebab-case from SCF). Use as a CSS scope: `'.scene-' + SCENE_ID + ' .my-class'`. **Note: class selector `.scene-${id}` not id `#${id}`.** |
| `SCENE_START` | number | Scene's start time on the master timeline (seconds). All tweens are positioned at `SCENE_START + offset`. |
| `SCENE_DURATION` | number | Scene's duration (seconds). |

**Never hard-code durations.** Scale your animation to fit `SCENE_DURATION`
so the same component works in a 2-second teaser and a 12-second feature.

### 4. Transform aliases only — no layout properties

Per [animation/performance.md](animation/performance.md), animate `x`, `y`,
`scale`, `rotation`, `autoAlpha`. Do **not** animate `width`, `height`,
`top`, `left`, `margin`, `padding`. Headless Puppeteer capture is
layout-sensitive and any layout-triggering animation will jank or, worse,
cause off-by-one frame artifacts.

`autoAlpha` (not raw `opacity`) is mandatory for fades — it also toggles
`visibility`, which prevents pointer events on hidden elements during
preview mode.

### 5. Master timeline pattern

Every `animation.js` pushes tweens onto the shared `master` timeline using
`SCENE_START + N` offsets:

```javascript
// Compiler injects: master, SCENE_ID, SCENE_START, SCENE_DURATION (seconds)
master.fromTo('.scene-' + SCENE_ID + ' .title',
  { opacity: 0, y: 40 },
  { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 0.2);

master.fromTo('.scene-' + SCENE_ID + ' .subtitle',
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.6);

// Optional: explicit fade-out near scene end (the compiler also auto-fades
// the .scene-${SCENE_ID} wrapper, so this is for inner-element polish only).
master.to('.scene-' + SCENE_ID + ' .root',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
```

Notes:
- Selector is `.scene-` + `SCENE_ID` (CSS class, not id) — the compiler
  wraps each scene in `<div class="scene scene-${id}">`.
- All positions are absolute on the master timeline (`SCENE_START + N`),
  not relative to a per-scene timeline.
- Scene visibility is auto-injected by the compiler: `opacity 0→1` at
  `SCENE_START`, `opacity 1→0` at `SCENE_START + SCENE_DURATION - 0.3`.
  Components only animate their internal elements.

### 5a. Compiler quirks (must-knows)

- **`{{var}}` placeholders are always HTML-escaped.** For raw HTML/SVG
  injection (e.g. server-built `boxesSvg`, `linesHtml`), use the
  triple-mustache `{{{var}}}` form. Triple-mustache bypasses escaping.
- **Component CSS is concatenated globally.** The compiler does NOT
  namespace per-component styles. Always self-scope inline CSS to your
  component's root class (e.g. `.mc-card`, `.qt-bg`) so styles do not
  leak across scenes.
- **The SCF `transition` field is currently ignored** by the compiler.
  Scenes are hard shown/hidden on the master timeline. Plan crossfade-style
  effects inside your `animation.js` (fade tail of scene N, fade head of
  scene N+1).
- **Asset paths** matching `/Src$|Path$|^src$/` in `props` are
  auto-resolved to `file://` URLs. Other paths pass through unchanged.

### 6. What you must NOT use

Slate excludes several GSAP capabilities, either because they don't apply or
because their licenses don't fit Slate's enterprise posture:

| Excluded | Why |
|----------|-----|
| ScrollTrigger / ScrollSmoother / ScrollToPlugin | Headless render — no scroll surface |
| Observer / Draggable | No interaction surface |
| React / Vue / Svelte hooks | Slate renders plain HTML |
| `gsap.matchMedia` reduced-motion | Render target, not a UI |
| Club GSAP plugins (DrawSVG, MorphSVG, MotionPath, SplitText, ScrambleText, Inertia, Physics2D, GSDevTools) | Paid license; not redistributable |
| `kill()` / `revert()` cleanup | Page is destroyed after capture |

These are enforced via the allowlist/forbidden list in
[`config/org/governance-policy.yaml`](../../config/org/governance-policy.yaml)
under `runtime_libraries.render_components`.

---

## Adding a new component (checklist)

> **First decide where it lives.** A **durable / reusable** component (product
> chrome, or a genuinely shared design base) lives in the global
> `render/components/<Name>/` and follows every step below, including global
> registration (step 4). A **project one-off** — a bespoke design scene used by
> exactly one video — instead lives in **`projects/<slug>/components/<Name>/`**
> (next to that video's SCF) and **skips global registration (steps 4–5)**: the
> renderer auto-resolves a project-local component by name, and `scf_validate`
> treats it as known. This keeps single-use scenes out of the shared catalog and
> schema. (One-offs should be 2D — GSAP/SVG/Canvas/CSS; a WebGL one-off still
> needs the global three.js driver wiring, so register those globally.)

1. Create `render/components/<Name>/index.html` with `{{prop}}` placeholders.
2. Create `render/components/<Name>/animation.js` following the master
   timeline pattern above.
3. *(Optional)* Create `render/components/<Name>/props.json` with a JSON
   Schema describing accepted props.
4. **Register the component** (all three are required):
   - Add `<Name>` to the `component` enum in
     [`schemas/scf-v1.0.schema.json`](../../schemas/scf-v1.0.schema.json).
   - Add `'<Name>'` to the `KNOWN_COMPONENTS` set in
     [`render/lib/scf-to-html.mjs`](../../render/lib/scf-to-html.mjs).
   - Missing either → `"Unknown SCF component"` error at render time.
5. Add a usage row to [`hyperframes-rendering.md`](hyperframes-rendering.md)
   under the component reference table.
6. If the new component takes assets (images, audio), update the relevant
   pipeline director skill so the assets stage knows to generate them.
7. **Visual QA loop (mandatory — do NOT skip):**
   Run the verification render and inspect the output:
   ```powershell
   node render/render.mjs <test.scf.json> --quality draft --output output/test.mp4
   ffmpeg -ss 0.5 -i output/test.mp4 -frames:v 1 output/frame-0.5s.png
   ffmpeg -ss <midpoint> -i output/test.mp4 -frames:v 1 output/frame-mid.png
   ffmpeg -ss <end-1s> -i output/test.mp4 -frames:v 1 output/frame-end.png
   ```
   Inspect all three frames for the failures listed in the QA checklist below.
   **Fix and re-render until all checks pass.** Do not hand back a component
   that has not been visually verified.

## Visual QA checklist (mandatory for new and modified components)

Extract frames at 3 points (early, midpoint, late) and verify:

### Layout & containment
- [ ] All text is **inside** its container — not floating above/below/outside
- [ ] SVG elements and text overlays share the same coordinate system
  (both inside the same positioned parent, not siblings with different origins)
- [ ] No elements overflow the 1920×1080 canvas (check all four edges)
- [ ] Content is vertically centered in the scene (not stuck at top or bottom)
- [ ] The 80px safe zone is respected (no content within 80px of any edge)

### Visibility & rendering
- [ ] **No empty containers** — every scene element produces visible pixels.
  If a container is empty, the component is broken (not "waiting for animation")
- [ ] All text is readable — minimum 24px for body, 48px for headings
- [ ] All labels, subtitles, and data values are visible in at least one frame
- [ ] Colors have sufficient contrast (text on background ≥ 7:1 for video)
- [ ] SVG strokes are visible (check strokeWidth ≥ 8px for video resolution)

### Animation
- [ ] Counter tweens reach their target value by the end of the scene
- [ ] All staggered reveals complete within SCENE_DURATION
- [ ] No elements are stuck at opacity:0 in the final frame (exit animation
  is intentional, not a bug)
- [ ] Transitions between animation phases are smooth (no 1-frame jumps)

### Common pitfalls to check
- **SVG text centering**: use `text-anchor="middle"` + `dominant-baseline="central"`
  and position at `(cx, cy)` of the SVG viewBox — NOT CSS flexbox on the SVG element
- **SVG viewBox vs canvas**: if the SVG `viewBox` doesn't match the container
  size, elements will be scaled/offset. Use `viewBox="0 0 1920 1080"` for
  full-scene SVGs or size the viewBox to match the container
- **Absolute positioning inside relative parent**: overlay text on SVG rings/charts
  must use a shared positioned parent (`position: relative` on wrapper,
  `position: absolute` on both SVG and text overlay)
- **Counter tween target**: the proxy object's target value must match the
  prop value, not a hardcoded number. Use `parseInt(el.dataset.value)` or
  read from SCENE_PROPS
- **strokeDasharray/offset**: compute from actual circle circumference
  (`2 * Math.PI * radius`), not a hardcoded magic number

### Graceful degradation (for existing components accepting optional props)
- [ ] Component renders meaningfully when **only required props** are provided
- [ ] Optional props (classification, callouts, comparison) enhance but don't
  break the base render when absent
- [ ] Empty arrays / null optional props don't produce empty DOM containers

## Modifying an existing component

1. Read this skill plus all four files in [`animation/`](animation/).
2. Make the change.
3. **Run the Visual QA checklist above** with a representative SCF.
4. If the change affects component props, update both the schema and any
   pipeline director skill that references the component.
