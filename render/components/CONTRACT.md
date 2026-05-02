# Component Contract — Canonical Baseline

> **Status:** Locked as of PR 0 (Phase II). All new components MUST conform.
> Existing components MAY be progressively migrated when touched.

This document is the **authoritative contract** for any component that lives
under `render/components/<Name>/` and is consumable by the SCF compiler
(`render/lib/scf-to-html.mjs`). Read this before adding, modifying, or
reviewing a component.

---

## 1. File layout

```
render/components/<ComponentName>/
  index.html          # required — root markup with mustache template vars
  animation.js        # optional — GSAP timeline calls; runs once per scene
  style.css           # optional — extra CSS (rare; prefer scoped <style> in index.html)
```

The compiler inlines all three. There is no module boundary, no bundler step,
no imports/exports.

---

## 2. Registration

Every component MUST be registered in `KNOWN_COMPONENTS` in
`render/lib/scf-to-html.mjs`. Unregistered names throw at compile time
(`Unknown SCF component: X`).

A component directory without registration is **dead code**. Either register
it or delete the directory.

---

## 3. `index.html` contract

### 3.1 Root element
- MUST be a single root `<div>` (not a fragment).
- MUST carry `data-scene-component="<ComponentName>"` so devtools can identify it.
- MUST be self-positioning: typically `position:absolute;inset:0` so the scene
  container sizes it. Smaller overlays (LowerThird, AnimatedCaption) may use
  `position:absolute;left:..;top:..` instead.

### 3.2 Templating
The compiler runs a two-pass mustache replacer **before** the HTML is emitted:
- `{{var}}` → HTML-escaped (use for user-supplied strings, prop values).
- `{{{var}}}` → raw HTML (use ONLY for pre-rendered HTML fragments built by
  the compiler, e.g. `{{{stepsHtml}}}` in `StepByStep`).
- Dotted paths supported: `{{user.name}}`, `{{theme.primary}}`.
- Missing or `null`/`undefined` → empty string (no error).

**Rule:** If you need to render a list, the compiler-side prop builder
materializes it into an HTML string and you pass it via `{{{thing}}}`. Do
NOT invent loop syntax in templates.

### 3.3 Scene-scoped CSS
Two valid patterns:

**Pattern A — Inline styles (small components only)**
```html
<div class="tc-stack" style="position:absolute;top:50%;left:50%;...">
```
Use when total component CSS fits in a few `style=""` attributes
(< ~6 elements). Examples: TitleCard, BrandIntro, AnimatedCaption.

**Pattern B — Scoped `<style>` block (preferred for anything non-trivial)**
```html
<style>
.scene-{{sceneId}} .dc-root  { ... }
.scene-{{sceneId}} .dc-title { ... }
</style>
<div class="dc-root" ...>
```
- Every selector MUST be prefixed with `.scene-{{sceneId}}` to prevent
  collisions across scenes that happen to use the same class names.
- Use CSS custom properties for theming (see DataChart for the exemplar).
- Component class prefix should be unique (`dc-` for DataChart, `mc-` for
  MetricsCard, etc.).

### 3.4 Asset references
Image/video `src` values that come from props are NOT auto-resolved by the
compiler at the template level — they pass through as-written. The compiler
resolves paths only in the layer renderers (`renderImageLayer`, etc.) and
only for the SCF schema's known asset fields.

**Rule:** If your component takes an asset path prop, the upstream caller
(SCF JSON or a Python builder) MUST pass an absolute path or a `file://` URL.

---

## 4. `animation.js` contract

### 4.1 Injected globals (read-only)
The script body runs once per scene with these symbols already bound by the
compiler — do NOT redeclare them, do NOT import:

| Global | Type | Meaning |
|---|---|---|
| `master` | GSAP `Timeline` | The master timeline for the entire video |
| `gsap` | GSAP namespace | Loaded from CDN |
| `SCENE_ID` | string | The scene's `id` field from SCF |
| `SCENE_START` | number (s) | Scene start time on the master timeline |
| `SCENE_DURATION` | number (s) | Scene duration |

### 4.2 Timing convention
- All animations are added to `master` with absolute positions:
  `master.fromTo('.scene-' + SCENE_ID + ' .X', from, to, SCENE_START + offset)`
- Use `SCENE_START + N` for entry animations (N usually 0.1–0.5 s).
- Use `SCENE_START + SCENE_DURATION - 0.5` for exit fades.
- Do NOT create your own paused timelines unless you also register them on
  the master.

### 4.3 Selector hygiene
- ALL selectors MUST be namespaced: `'.scene-' + SCENE_ID + ' .your-class'`.
- Never use bare class selectors — they will leak across scenes.

### 4.4 Stateful animations (counters, draws)
Use `master.call(fn, args, position)` for code that needs to read the DOM
(measure SVG path length, parse data-attrs, etc.). Inside the callback
you may launch a sub-tween with `gsap.to()` — it runs in real time, not on
the master timeline. This is acceptable for short reveals; see `MetricsCard`
for the canonical pattern (counter + sparkline draw).

### 4.5 **Standing Rule #16: register every animation on `master`**

> *Rationale:* Slate renders headlessly by scrubbing `master` frame-by-frame
> at a fixed framerate. Animations created on a **standalone** GSAP timeline
> (`gsap.timeline()`) — or naked `gsap.to/from/fromTo()` at module scope —
> run on GSAP's real-time ticker. The renderer captures frames at
> deterministic positions, but the standalone timeline has progressed by an
> unrelated amount of wallclock — so the captured frames land on random
> animation states (visible / mid-fade / invisible). This produced the
> "blue blink" bug in PR 10e (WindowsScene, TerminalScene, GitHubScene,
> VSCodeScene all alternated visible/wallpaper frames).

**FORBIDDEN at module scope:**
```js
gsap.timeline().to(el, { ... }, SCENE_START);     // ❌ standalone timeline
gsap.to(el, { ... }, SCENE_START + 0.5);          // ❌ position arg silently ignored
```

**REQUIRED:**
```js
if (typeof master === 'undefined') return;
master.to(el, { ... }, SCENE_START + 0.15);
master.to(el, { opacity: 0, ... }, SCENE_START + SCENE_DURATION - 0.5);
```

**Allowed inside `master.call(fn, args, position)` callbacks** (see §4.4):
counter tweens and short reveals via `gsap.to(...)` are fine because the
callback fires at a deterministic frame and the renderer waits for tween
completion within that scrub window.

This rule is enforced by `tests/_lint_animation.mjs`. Canonical example:
[`render/components/EdgeBrowserScene/animation.js`](EdgeBrowserScene/animation.js).

### 4.6 Cleanup
You do NOT need to clean up. The compiler tears down the entire DOM between
renders.

---

## 5. Class-name prefix registry

Every component MUST use a unique 2–4 letter prefix on its class names to
guarantee no cross-component CSS collision even within a single scene.

| Component | Prefix | Component | Prefix |
|---|---|---|---|
| TitleCard | `tc-` | MetricsCard | `mc-` |
| BrandIntro | `bi-` | DataChart | `dc-` |
| BrandOutro | `bo-` | StepByStep | `sbs-` |
| LowerThird | `lt-` | AnimatedCaption | `ac-` |
| ScreenDemoFrame | `sdf-` | SplitScreen | `ss-` |
| TransitionWipe | `tw-` | WebcamOverlay | `wo-` |
| SlideRenderer | `sr-` | CalloutBox | `cb-` |
| ComplianceBadgeWall | `cbw-` | DataFlow | `df-` |
| AuditTrail | `at-` | PolicyEnforcement | `pe-` |
| SectionDivider | `sd-` | ScrollingBackground | `sb-` |
| AudienceSafe | `as-` | Disclaimer | `dcl-` |
| CustomerStory | `cs-` | PricingTable | `pt-` |
| CompetitiveMatrix | `cm-` | ROICalculator | `roi-` |
| _shared (PT + CM grid)_ | `cmp-` | LoopScene | `loop-` |
| StreamScene | `stream-` | WhiteboardScene | `wb-` |
| PremiumMotionShowcase | `pms-` |  |  |

**New components** must declare and reserve their prefix in this table when
adding to `KNOWN_COMPONENTS`. PR review should reject unprefixed selectors.

---

## 6. Performance budget

Per the proposal performance bar:
- ≤ 200 KB total CSS+HTML+JS per component
- ≤ 30 active GSAP tweens at any moment within a single scene
- 60 fps headless capture target — avoid `box-shadow` on animated elements,
  avoid filter chains > 1 layer, prefer transforms over `top/left` animation

---

## 7. Self-review checklist (before PR)

- [ ] Registered in `KNOWN_COMPONENTS`
- [ ] Class prefix added to §5 table
- [ ] All selectors namespaced via `.scene-{{sceneId}}` or `'.scene-' + SCENE_ID`
- [ ] No bare `import`/`export`/`require` in `animation.js`
- [ ] No mutation of injected globals
- [ ] Exit fade lands ≥ 0.3 s before `SCENE_START + SCENE_DURATION`
- [ ] Component renders correctly when ALL optional props are missing
- [ ] CSS custom properties used for any color or font that should respect a brand package (PR 5)
