# GSAP Flip — Layer 3 Skill

> Layer 3: Vendor library skill. Load when authoring a HyperFrames
> component that needs to choreograph a *layout change* — window drag,
> slide swap, drill-down zoom, list-to-detail expand, card reorder,
> grid → focused-item, "this thing moves from here to there and the
> rest of the layout reflows around it."
> Sourced from the official docs at https://gsap.com/docs/v3/Plugins/Flip/.
> Last researched: 2026-04-06.

## When to use

Triggers: layout transition, "morph this card into the detail view",
window drag/resize choreography, slide swap, drill-down zoom, list ↔
detail, masonry reorder, item promoted from grid to hero, gallery
swap, "make this look like the same element moved across the page",
shared-element transition.

Don't load this skill for:
- Simple tween from explicit A → B coordinates — use `gsap.to()` /
  `gsap.fromTo()` from the basics skill.
- Scroll-driven animation — Slate renders headlessly, there is no
  scroll. ScrollTrigger is also out of scope per Slate policy.
- 3D / WebGL transitions — out of scope for HyperFrames' DOM renderer.
- Page transitions in a real browser app — Slate composes MP4, not SPAs.

## Official sources

- Docs: https://gsap.com/docs/v3/Plugins/Flip/
- `Flip.getState()`: https://gsap.com/docs/v3/Plugins/Flip/static.getState()
- License (post-Webflow acquisition): https://gsap.com/licensing/
- Repository: GSAP source under https://github.com/greensock (Flip is
  bundled inside the published `gsap` npm package).
- npm package: `gsap` (Flip is a registerable plugin shipped with the
  same package; pin `gsap@3`)
- License: **GSAP Standard License** (Webflow-owned, free for commercial
  and non-commercial use as of April 30 2025 — *all* former Club plugins
  including Flip are now free; verified at https://gsap.com/licensing/).
  Not MIT — you must keep the GreenSock copyright notice in the bundled
  source. The license forbids embedding GSAP into competing
  visual-animation builders (irrelevant for Slate).

## Slate integration

- **Bundle method**: GSAP core is already loaded by the SCF compiler
  (see `render/lib/scf-to-html.mjs`). Flip is a separate file shipped in
  the same package. Add it to the compiler's CDN block (or the
  component's local `<script>` block) and `gsap.registerPlugin(Flip)`
  before first use:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/Flip.min.js"></script>
  <script>gsap.registerPlugin(Flip);</script>
  ```
- **Allowlist entry**: add `gsap@3` (covers Flip) to
  `config/org/governance-policy.yaml` under `runtime_libraries`.
  Explicitly note: only the **free** GSAP plugins are permitted —
  ScrollTrigger, ScrollSmoother, Observer, Draggable, MotionPath,
  MorphSVG, SplitText, etc. are now also free under the new license,
  but Slate's policy in `component-authoring.md` §6 still excludes
  them on the basis of "not needed for headless render"; only Flip
  is allowed in. Verify before adding others.
- **Loading from inside a HyperFrames component**: Flip works on the
  current state of the DOM. The component's `animation.js` should:
  1. Capture state with `Flip.getState(targets)` *before* the layout
     change.
  2. Mutate the DOM (toggle a class, move a node, swap innerHTML).
  3. Add the resulting timeline to the component master via
     `master.add(Flip.from(state, {...}), positionLabel)` so it's
     paused-by-default like every other Slate animation.

## Core API (top 5)

### 1. `Flip.getState(targets, vars?)`
Snapshots position, size, rotation, skew, opacity, and viewport offset
for the given targets. Optionally captures arbitrary CSS via `props`.
```js
const state = Flip.getState('.card', { props: 'backgroundColor,borderRadius' });
```

### 2. `Flip.from(state, vars?)`
The actual animation. Compares the captured state to the *current* DOM,
applies inverse offsets, then animates them away. Returns a GSAP
timeline you can `add()` to a master timeline.
```js
const tl = Flip.from(state, {
  duration: 0.8,
  ease: 'power2.inOut',
  absolute: true,           // see Gotchas — flex/grid layouts almost always need this
  nested: true,             // when both a parent and a child are in targets
  fade: true,               // cross-fade when data-flip-id pairs swap
  onEnter: (els) => gsap.from(els, { opacity: 0, scale: 0.8, duration: 0.4 }),
  onLeave: (els) => gsap.to(els,   { opacity: 0, scale: 0.8, duration: 0.4 }),
});
```

### 3. `Flip.to(state, vars?)` — inverted direction
Animates the targets *to* the recorded state from wherever they
currently are. Useful when the desired end state is the previously
captured one (e.g., undo, return-to-grid).

### 4. `Flip.fit(target, source, vars?)`
Repositions/resizes `target` to perfectly overlap `source` (an element
or a previously captured state). Great for "this card grows to fill
the hero" without owning the layout math.
```js
Flip.fit(detailCard, gridCard, { duration: 1, ease: 'power3.inOut', scale: true });
```

### 5. `Flip.batch(id)` — coordinate multiple flips
For scenes where several independent groups capture/animate state at
roughly the same time — keeps them from stomping on each other.
```js
const batch = Flip.batch('cards');
batch.add({
  getState: () => Flip.getState('.card'),
  animate: (self) => Flip.from(self.state, { duration: 0.6, ease: 'power1.inOut' }),
});
// later, after a DOM change:
batch.run();
```

### Element pairing via `data-flip-id`

When the "before" element and the "after" element are *different DOM
nodes* (e.g., a list item is removed and a detail panel is added),
give them the same `data-flip-id="card-42"` attribute and Flip will
treat them as the same logical element — animating from the list
position/size to the detail position/size. Combine with `fade: true`
for a cross-fade.

## Gotchas

- **`absolute: true` is almost always needed** for flex / grid layouts.
  Without it, the inverse offsets fight against the parent layout and
  things jitter. With it, the targets are pulled out of flow during
  the animation only.
- **`absolute: true` removes elements from flow**, which collapses
  surrounding layout. If that matters, pass a *subset* selector
  (`absolute: '.card'`) so the container still props the layout open.
- **`nested: true` is required** when a parent and any of its children
  are both in `targets` — otherwise child offsets compound on top of
  parent offsets and the kids end up moving twice as far as intended.
- **Capture, then mutate, then `Flip.from`** — never call `getState()`
  *after* the DOM change. There's nothing to flip from.
- **Flip respects existing transforms.** Unlike most FLIP libraries,
  GSAP Flip handles parents that are scaled or rotated. Don't
  pre-clear transforms.
- **`gsap.registerPlugin(Flip)` must run** before the first `Flip.x` call
  in browsers; otherwise tree-shaking strips the plugin from the bundle
  and you get "Flip is not defined".
- **Slate paused-timeline contract.** `Flip.from()` returns a *playing*
  timeline by default. Wrap or `pause()` it, then `master.add(tl, ...)`,
  so the master timeline owns playback (per `component-authoring.md`).

## Out of scope (don't do this)

- **No paid bonus plugins.** Per Slate policy, only Flip from the
  formerly-Club set is in scope right now. Even though
  ScrollTrigger / SplitText / MorphSVG / Draggable / Observer /
  ScrollSmoother / MotionPath are *now free* under the post-2025 GSAP
  license, they are explicitly excluded by `component-authoring.md` §6
  and `config/org/governance-policy.yaml`.
- Don't use Flip for simple, hand-coded A→B tweens — `gsap.fromTo()` is
  cheaper and easier to reason about.
- Don't capture state across scenes — Flip is intra-scene. Scene
  boundaries are crossfaded by the renderer, not by Flip.
- Don't use `Flip.fit()` to fake a 3D camera move — it's 2D and operates
  on layout only.
- Don't pin to `gsap@latest` — pin `gsap@3`.
