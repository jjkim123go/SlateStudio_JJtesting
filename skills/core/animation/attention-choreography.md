# Attention Choreography — Sequencing Elements Within a Scene

> **Layer 2 skill** — load at **scene_plan** or when writing `animation.js`
> for any component with more than one animated element. This skill
> answers: "in what ORDER do elements appear, and how much do they overlap?"
>
> **Companion skills:** [motion-intent.md](motion-intent.md) for material
> choice, [material-physics.md](material-physics.md) for timing values.

---

## The Rule

**At any moment, only ONE thing should be moving** (or a group moving as
a single conceptual unit).

Human attention is sequential. When two unrelated elements animate
simultaneously, the viewer misses both. Every element in a scene
needs a place in the attention sequence.

---

## The Choreography Process

For every scene, before writing GSAP:

### 1. List every animated element

```
Scene "api-metrics":
- Title text
- 3 metric cards
- Supporting label
- Background accent
```

### 2. Rank by importance

What must the viewer see first? That enters first.

```
1. Title (establishes context — "what am I looking at?")
2. Metric cards (the payload — why this scene exists)
3. Supporting label (secondary — elaborates)
4. Background accent (ambient — doesn't need attention)
```

### 3. Group conceptual units

Elements that form one logical thing animate together.

```
Group A: Title (single element)
Group B: 3 metric cards (same type — stagger as one group)
Group C: Supporting label (single element)
Background: Accent (ambient — animates independently)
```

### 4. Assign timing

Each group gets a start time. Groups overlap by 30-50%.

```
t+0.0s: Title enters (0.4s)
t+0.2s: Metric cards stagger in (0.3s each, 0.08s stagger)
t+0.5s: Supporting label fades in (0.3s)
Background: continuous subtle motion throughout
```

---

## Stagger Timing Reference

When multiple elements of the same type animate, stagger them:

| Element granularity | Stagger delay | Use case |
|--------------------|---------------|----------|
| Characters | 0.03–0.05s | Typewriter effect, character reveal |
| Words | 0.06–0.10s | Headline emphasis, word-by-word reveal |
| Lines | 0.12–0.20s | Paragraph or list reveal |
| Cards/items | 0.08–0.12s | Grid items, metric cards, logos |
| Sections | 0.20–0.30s | Major content blocks |

### Stagger in GSAP

```javascript
// Simple stagger — all cards enter sequentially
master.from(S + ' .card', {
  y: MAT.distance,
  autoAlpha: 0,
  ...MAT.enter,
  stagger: 0.1               // 0.1s between each card
}, SCENE_START + 0.2);

// Stagger from center (draws eye to middle first)
master.from(S + ' .card', {
  y: MAT.distance,
  autoAlpha: 0,
  ...MAT.enter,
  stagger: { each: 0.1, from: "center" }
}, SCENE_START + 0.2);
```

### Total Stagger Duration

```
Total = (N - 1) × stagger_delay + element_duration

Example: 5 cards, 0.1s stagger, 0.4s animation each
Total = 4 × 0.1 + 0.4 = 0.8s
```

**Keep total under 2 seconds.** Beyond that the reveal drags.
If you have 10+ items, either:
- Reduce stagger to 0.04–0.06s
- Group items into sets (first 3, then next 3)
- Have the tail items fade in as a batch

---

## Overlap Between Groups

Groups should overlap — fully sequential feels sluggish, fully
simultaneous is chaotic. **Start the next group at 40-60% through
the current group's animation.**

```javascript
const S = '.scene-' + SCENE_ID;
const t = SCENE_START;

// Group 1: Title (0.4s)
master.from(S + ' .title', { y: 20, autoAlpha: 0, ...MAT.enter }, t);

// Group 2: Metric cards — starts at 60% of title animation
master.from(S + ' .metric', {
  y: 15, autoAlpha: 0, ...MAT.enter,
  stagger: 0.08
}, t + 0.24);  // 0.4 × 0.6 = 0.24

// Group 3: Label — starts 0.15s after first metric appears
master.from(S + ' .label', {
  autoAlpha: 0, ...MAT.enter
}, t + 0.24 + 0.15);
```

---

## The Background Exception

Ambient/background elements can animate during foreground focus IF:
- They are **much slower** than foreground (2-3× duration or continuous)
- They are **subtle** (opacity ≤ 0.3, or very small movement)
- They are **clearly secondary** (out of focus, low contrast, peripheral)
- They **never compete** with the primary narrative element

```javascript
// Background accent — slow, subtle, runs throughout scene
master.fromTo(S + ' .bg-accent', 
  { x: -10, autoAlpha: 0.15 },
  { x: 10, autoAlpha: 0.2, duration: SCENE_DURATION * 0.8, ease: "sine.inOut" },
  SCENE_START
);

// Foreground content — normal material timing, enters later
master.from(S + ' .title', { y: 20, autoAlpha: 0, ...MAT.enter }, SCENE_START + 0.2);
```

---

## Reading Order

Respect natural reading patterns (left→right, top→bottom in Western
languages) unless intentionally disrupting for emphasis.

### Grid stagger patterns

**Natural reading (default):**
```
[1] [2] [3]
[4] [5] [6]
```
Use: `stagger: 0.1` — GSAP follows DOM order, which should be row-first.

**Center-out (focal emphasis):**
```
[3] [1] [4]
[5] [2] [6]
```
Use: `stagger: { each: 0.1, from: "center" }`

**Edges-in (converging):**
```
[1] [3] [5]
[2] [4] [6]
```
Use: `stagger: { each: 0.1, from: "edges" }`

---

## Component-Specific Choreography

These are the standard attention sequences for common Slate components.
Component authors should follow these unless the scene's intent demands
otherwise.

### MetricsCard / MetricStack
```
1. Metric value (counter tween) — the payload
2. Label / description — context
3. Delta indicator (↑12%) — reinforcement
```

### DataFlow / ArchitectureDiagram
```
1. Source node — "where it starts"
2. First edge (stroke-draw) — "it flows to..."
3. Next node — "arriving at..."
4. Repeat edge→node until complete
5. Labels fade in on their nodes — last (don't distract during flow)
```

### TerminalCast / VSCodeScene
```
1. Window chrome (subtle, fast) — establish context
2. Command/code (typing animation) — the content
3. Output/result — the payoff
```

### StepByStep
```
1. Step 1 (full animation)
2. Step 2 (staggered after step 1 completes or at 60%)
3. Step 3 (staggered after step 2)
Note: Each step is a conceptual unit — its number, text, and
icon animate together, not separately.
```

### Quote / CustomerStory
```
1. Avatar/photo (if present) — establish the human
2. Quote text — the voice
3. Attribution line — who said it
```

---

## Testing Your Choreography

Watch the rendered scene and ask:

1. **Where does my eye go at each moment?** — If you're unsure, the
   sequence is ambiguous. Add more delay between groups.
2. **Do I see everything I should?** — If something gets lost, it's
   either simultaneous with something else or too fast.
3. **Does anything feel sluggish?** — Probably too much delay between
   groups. Tighten the overlap.
4. **Does the total entrance fit within SCENE_DURATION?** — All
   entrance animation should complete within the first 40-60% of
   scene duration, leaving time for the viewer to read/absorb.

### The 60% Rule

Entrance choreography should complete within the first 60% of
`SCENE_DURATION`. The remaining 40% is hold time — the viewer needs
to absorb what they see before the scene transitions.

```javascript
const choreographyBudget = SCENE_DURATION * 0.6;
// All entrance tweens must finish within this budget
// The last 40% is static hold + exit transition
```

---

## Anti-Patterns

**Simultaneous unrelated animation:**
```javascript
// BAD: title + chart + label all at SCENE_START
master.from(S + ' .title', { y: 20, autoAlpha: 0 }, SCENE_START);
master.from(S + ' .chart', { scale: 0.9, autoAlpha: 0 }, SCENE_START);
master.from(S + ' .label', { autoAlpha: 0 }, SCENE_START);
```

**Too many staggers:**
```javascript
// BAD: 15 items × 0.15s stagger = 2.1s just for stagger
// Viewer loses interest waiting for the last item
master.from(S + ' .item', { autoAlpha: 0, stagger: 0.15 }, SCENE_START);

// GOOD: batch into groups or tighten stagger
master.from(S + ' .item', { autoAlpha: 0, stagger: 0.05 }, SCENE_START);
```

**Wrong reading order:**
```javascript
// BAD: label appears before the value it describes
master.from(S + ' .metric-label', { autoAlpha: 0 }, t);
master.from(S + ' .metric-value', { autoAlpha: 0 }, t + 0.3);

// GOOD: value first (the payload), then label (context)
master.from(S + ' .metric-value', { autoAlpha: 0 }, t);
master.from(S + ' .metric-label', { autoAlpha: 0 }, t + 0.15);
```
