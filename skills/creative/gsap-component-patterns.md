# GSAP Component Patterns — Bridge Skill

> **Layer:** Creative — maps visual intent to GSAP techniques
> **Trigger:** Load when a sub-agent is creating or modifying a HyperFrames
> component. This skill bridges "I want X effect" to "load these GSAP skills
> and apply this pattern."
> **Prerequisite:** `component-authoring.md` (for SCENE_DURATION, master
> timeline contract). Load this skill AFTER component-authoring, not instead of.

This is not a GSAP tutorial — the official GreenSock skills in
`skills/core/animation/` cover the full API. This skill tells you which
patterns to use for which component intent, with video-specific constraints.

---

## Pattern lookup table

Find your component's visual intent below. Load the listed skills, then
apply the pattern code.

### Reveals & Entrances

| Intent | Pattern | GSAP Skills to Load | Video Constraint |
|--------|---------|---------------------|------------------|
| Elements appear one by one | Staggered fade+slide | `basics.md` | stagger: 0.1–0.2s, total reveal ≤ 60% of SCENE_DURATION |
| Title/heading entrance | Scale + fade from center | `basics.md` | duration: 0.4–0.6s, ease: `back.out(1.4)` |
| List/cards cascade in | Stagger from edge | `basics.md` | `{ each: 0.15, from: "start" }`, y: 40, autoAlpha: 0 |
| Icon/logo reveal | Scale from 0 + rotate | `basics.md` | duration: 0.5s, ease: `elastic.out(1, 0.5)` |
| Full-screen wipe reveal | clipPath animation | `basics.md` | `clipPath: "inset(0 0 0 0)"` from `"inset(0 100% 0 0)"` |

**Staggered reveal — the workhorse pattern:**
```javascript
// Load: basics.md
// Every component that shows multiple elements should use this
tl.from('.item', {
  y: 40,
  autoAlpha: 0,
  duration: 0.5,
  stagger: { each: 0.15, from: 'start' },
  ease: 'power2.out',
}, labelOrOffset);
```

### Data & Numbers

| Intent | Pattern | GSAP Skills to Load | Video Constraint |
|--------|---------|---------------------|------------------|
| Counter tween (0 → N) | Proxy object + onUpdate | `basics.md`, `value-helpers.md` | duration: 1.0–1.5s, ease: `power1.out` |
| Bar chart grow | scaleY from 0 | `basics.md` | transformOrigin: 'bottom', stagger bars |
| Donut/pie fill | strokeDashoffset SVG | `basics.md` | duration: 1.2s, ease: `power2.inOut` |
| Progress bar | scaleX from 0 | `basics.md` | transformOrigin: 'left', duration: 1.0s |
| Sparkline draw | SVG stroke animation | `basics.md` | `strokeDashoffset: 0` from total length |

**Counter tween — for any numeric display:**
```javascript
// Load: basics.md, value-helpers.md
const counter = { val: 0 };
tl.to(counter, {
  val: targetNumber,
  duration: 1.2,
  ease: 'power1.out',
  onUpdate: () => {
    el.textContent = Math.floor(counter.val).toLocaleString();
  },
}, labelOrOffset);
```

### Flow & Diagrams

| Intent | Pattern | GSAP Skills to Load | Video Constraint |
|--------|---------|---------------------|------------------|
| Nodes appear sequentially | Stagger + connectors after | `basics.md`, `sequencing.md` | Nodes first (stagger 0.2s), then arrows (stagger 0.15s) |
| Arrow/connector draw | SVG stroke dashoffset | `basics.md` | duration: 0.4s per arrow, ease: `power2.inOut` |
| Highlight active node | Scale pulse + glow | `basics.md` | scale: 1.08, boxShadow tween, duration: 0.3s |
| Flow path trace | Sequential highlight | `sequencing.md` | Label each step, 0.8s per node |

**Node + arrow reveal — for DataFlow, ArchitectureDiagram:**
```javascript
// Load: basics.md, sequencing.md
// Phase 1: nodes appear
tl.from('.node', {
  scale: 0,
  autoAlpha: 0,
  duration: 0.4,
  stagger: 0.2,
  ease: 'back.out(1.4)',
}, 'nodes');

// Phase 2: arrows draw in (after nodes)
tl.from('.arrow', {
  strokeDashoffset: (i, el) => el.getTotalLength(),
  duration: 0.4,
  stagger: 0.15,
  ease: 'power2.inOut',
}, 'nodes+=0.8');

// Phase 3: highlight active path
tl.to('.node.active', {
  scale: 1.08,
  boxShadow: '0 0 20px rgba(0,120,212,0.6)',
  duration: 0.3,
}, '>');
```

### Layout & Comparison

| Intent | Pattern | GSAP Skills to Load | Video Constraint |
|--------|---------|---------------------|------------------|
| Side-by-side compare | Slide in from edges | `basics.md` | Left: x: -100, Right: x: 100, simultaneous |
| Before/after slider | Clip-path or width tween | `basics.md` | duration: 1.5s, ease: `power2.inOut` |
| Card flip/swap | FLIP plugin | `gsap-flip.md` | Use for reorder animations, shared-element |
| Grid layout shift | FLIP plugin | `gsap-flip.md` | Capture state → change DOM → animate |
| Split screen merge | Two panels → one | `basics.md` | clipPath or x translation |

### Text & Typography

| Intent | Pattern | GSAP Skills to Load | Video Constraint |
|--------|---------|---------------------|------------------|
| Typewriter effect | Reveal chars with stagger | `basics.md` | stagger: 0.03–0.05s per char, use `SplitText` or manual spans |
| Word-by-word caption | autoAlpha stagger on words | `basics.md` | Sync with narration word timestamps |
| Heading slide-up | y + autoAlpha | `basics.md` | duration: 0.5s, ease: `power2.out` |
| Subtitle highlight | Background color tween | `basics.md` | Match `AnimatedCaption` word-highlight timing |

### Transitions (between visual states within a scene)

| Intent | Pattern | GSAP Skills to Load | Video Constraint |
|--------|---------|---------------------|------------------|
| Crossfade content | autoAlpha swap | `basics.md` | 0.3s overlap, use absolute positioning |
| Slide content left | x tween + next enters | `sequencing.md` | Previous: x: -1920, Next: x: 0 from 1920 |
| Zoom into detail | scale + transform-origin | `basics.md` | scale: 2–3x, duration: 0.8s, ease: `power2.inOut` |
| Morph shape | SVG morphSVG (if available) | `basics.md` | Only for SVG-based components |

---

## Video-specific GSAP constraints

These override general GSAP best practices for the headless video capture
environment:

1. **All timelines must be paused on creation** — HyperFrames controls
   playback via `seek()`. Never auto-play.

2. **Transform-only animation** — the headless Chromium capture runs at
   exact frame boundaries. Animating `width`, `height`, `top`, `left`
   causes layout thrash and frame drops. Use `x`, `y`, `scale`, `rotation`,
   `autoAlpha` exclusively. (See `animation/performance.md`.)

3. **No requestAnimationFrame-dependent code** — HyperFrames steps the
   GSAP ticker manually. Don't use `gsap.ticker.add()` or `setTimeout` for
   sequencing. Use timeline position parameters.

4. **Duration budget** — total animation time must fit within
   `SCENE_DURATION`. If narration starts at `narrationStartSec`, front-load
   visual setup before narration begins.

5. **No scroll-based animation** — ScrollTrigger is irrelevant for video.
   Don't load `gsap-scrolltrigger`.

6. **Stagger totals** — compute `each * (count - 1)` and ensure it plus
   the tween duration fits the scene. A 20-element stagger at 0.2s = 3.8s
   of stagger time alone.

---

## Pattern → skills quick reference

| I want to... | Load these skills |
|-------------|-------------------|
| Fade/slide elements in | `animation/basics.md` |
| Sequence a multi-step reveal | `animation/basics.md` + `animation/sequencing.md` |
| Animate numbers/counters | `animation/basics.md` + `animation/value-helpers.md` |
| Reorder/swap elements | `render/gsap-flip.md` |
| Optimize for 60fps capture | `animation/performance.md` |
| Compute ranges/clamps | `animation/value-helpers.md` |
| Render code with highlighting | `render/shiki.md` |
| Animate chart data | `render/chartjs.md` + `animation/basics.md` |
| Render diagrams from text | `render/mermaid.md` |

---

## Composing a new component: checklist

Before writing `animation.js` for a new component:

- [ ] Read `component-authoring.md` (SCENE_DURATION, master timeline, file layout)
- [ ] Read `component-design-system.md` (style, colors, typography from design data)
- [ ] Find your intent in the pattern lookup table above
- [ ] Load the listed GSAP skills
- [ ] Write the timeline with paused master: `const tl = gsap.timeline({ paused: true })`
- [ ] Use labeled phases: `tl.addLabel('enter')`, `tl.addLabel('content')`, `tl.addLabel('exit')`
- [ ] Verify total animation fits SCENE_DURATION
- [ ] Check narration sync via `narration-component-sync.md`
- [ ] Performance check: transform-only, no layout properties
