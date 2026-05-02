# Material Physics — GSAP Parameters from Material Choice

> **Layer 2 skill** — load after [motion-intent.md](motion-intent.md)
> has determined the material. This skill translates the material into
> exact GSAP `duration`, `ease`, `stagger`, and `overshoot` values.
>
> **Usage:** Agent picks material in intent step → looks up values here →
> applies them in `animation.js`. No guesswork, no arbitrary easing.

---

## Material → GSAP Parameter Map

Each material defines a complete motion profile. Use these values as the
`defaults` for your scene's animation block.

### Glass (professional, precise)

```javascript
// Intent: glass — clean, confident
const MAT = {
  enter:    { duration: 0.4,  ease: "power2.out" },
  exit:     { duration: 0.28, ease: "power2.in" },    // 30% shorter
  stagger:  0.08,
  overshoot: 1.02,                                     // 2% — barely perceptible
  distance: 20,                                        // px — subtle movement
};
```

**Use for:** Corporate content, tech explainers, credibility scenes, product demos.

### Paper (calm, editorial)

```javascript
// Intent: paper — gentle, readable
const MAT = {
  enter:    { duration: 0.6,  ease: "power1.out" },
  exit:     { duration: 0.4,  ease: "power1.in" },
  stagger:  0.12,
  overshoot: 1.0,                                      // none
  distance: 30,                                        // px — moderate float
};
```

**Use for:** Introductions, onboarding, narrative-driven explainers, educational content.

### Metal (sharp, authoritative)

```javascript
// Intent: metal — decisive impact
const MAT = {
  enter:    { duration: 0.3,  ease: "power3.out" },
  exit:     { duration: 0.2,  ease: "power3.in" },
  stagger:  0.06,
  overshoot: 1.0,                                      // none — metal doesn't bounce
  distance: 15,                                        // px — tight, precise
};
```

**Use for:** Key statistics, data reveals, urgent callouts, metric cards.

### Rubber (playful, bouncy)

```javascript
// Intent: rubber — energetic, fun
const MAT = {
  enter:    { duration: 0.5,  ease: "back.out(1.7)" },
  exit:     { duration: 0.3,  ease: "power2.in" },
  stagger:  0.1,
  overshoot: 1.15,                                     // 15% — visible bounce
  distance: 40,                                        // px — expressive movement
};
```

**Use for:** Social teasers, celebrations, playful brands, fun reveals.

### Liquid (smooth, flowing)

```javascript
// Intent: liquid — continuous, smooth
const MAT = {
  enter:    { duration: 0.8,  ease: "power1.inOut" },
  exit:     { duration: 0.6,  ease: "power1.inOut" },
  stagger:  0.15,
  overshoot: 1.0,                                      // none — liquid doesn't overshoot
  distance: 40,                                        // px — gentle drift
};
```

**Use for:** Transitions, section dividers, ambient elements, flowing processes.

### Wood (warm, grounded)

```javascript
// Intent: wood — trustworthy, human
const MAT = {
  enter:    { duration: 0.5,  ease: "power2.out" },
  exit:     { duration: 0.35, ease: "power1.in" },
  stagger:  0.1,
  overshoot: 1.03,                                     // 3% — tiny settle
  distance: 25,                                        // px — natural movement
};
```

**Use for:** Customer stories, testimonials, quotes, human moments.

---

## How to Apply in animation.js

### Pattern: One material per scene

```javascript
// Intent: metal — key metric reveal
const S = '.scene-' + SCENE_ID;
const MAT = { enter: { duration: 0.3, ease: "power3.out" }, stagger: 0.06, distance: 15 };

// All elements in this scene use the same material
master.from(S + ' .metric-value', {
  y: MAT.distance,
  autoAlpha: 0,
  ...MAT.enter
}, SCENE_START + 0.2);

master.from(S + ' .metric-label', {
  y: MAT.distance * 0.5,
  autoAlpha: 0,
  ...MAT.enter
}, SCENE_START + 0.2 + MAT.stagger);
```

### Pattern: Stagger groups

```javascript
// Intent: paper — step-by-step reveal
const S = '.scene-' + SCENE_ID;
const MAT = { enter: { duration: 0.6, ease: "power1.out" }, stagger: 0.12, distance: 30 };

master.from(S + ' .step', {
  y: MAT.distance,
  autoAlpha: 0,
  ...MAT.enter,
  stagger: MAT.stagger
}, SCENE_START + 0.3);
```

### Pattern: Scale with overshoot (rubber/wood)

```javascript
// Intent: rubber — logo reveal
const S = '.scene-' + SCENE_ID;
const MAT = { enter: { duration: 0.5, ease: "back.out(1.7)" }, overshoot: 1.15, distance: 40 };

master.from(S + ' .logo', {
  scale: 0.8,
  autoAlpha: 0,
  ...MAT.enter
}, SCENE_START);
```

---

## Duration Scaling Rules

Materials define BASE durations. Scale for element weight:

| Element weight | Scale factor | Examples |
|---------------|-------------|----------|
| **Light** | 0.6× | Small icons, badges, chips, labels |
| **Medium** | 1.0× (base) | Title cards, standard text, images |
| **Heavy** | 1.5× | Full-screen elements, hero images, backgrounds |

```javascript
// Metal base: 0.3s
// Hero metric (heavy): 0.3 × 1.5 = 0.45s
// Supporting label (light): 0.3 × 0.6 = 0.18s
```

## Distance Scaling Rules

The `distance` value is for standard 1920×1080 at typical element sizes.
Scale for actual movement distance:

- Movement < 50px → use material's base distance
- Movement 50-200px → multiply duration by 1.5×
- Movement > 200px → use `duration × √(distance/100)`

Don't scale linearly for large distances — it feels sluggish.

---

## Exit Rule: 30% Shorter

Exits are always 30% shorter than entrances. The material `exit` values
already encode this. If you need to calculate manually:

```javascript
const exitDuration = MAT.enter.duration * 0.7;
```

**Why:** Entrances need time to register. Exits just need to get out of
the way — the viewer is already looking at the next thing.

---

## Frame Alignment (30fps)

At 30fps, 1 frame ≈ 33ms. Round durations to whole frames:

| Duration | Frames | Round to |
|----------|--------|----------|
| 0.3s | 9 | ✅ exact |
| 0.4s | 12 | ✅ exact |
| 0.5s | 15 | ✅ exact |
| 0.6s | 18 | ✅ exact |
| 0.45s | 13.5 | → 0.433s (13f) or 0.467s (14f) |
| 0.35s | 10.5 | → 0.333s (10f) or 0.367s (11f) |

All material base durations in this skill are already frame-aligned at 30fps.

---

## Common Errors

**Using the wrong ease direction:**
```javascript
// BAD: ease-in for entrance (accelerates INTO the viewport — feels wrong)
master.from(el, { y: 20, ease: "power2.in" }, SCENE_START);

// GOOD: ease-out for entrance (decelerates TO resting position)
master.from(el, { y: 20, ease: "power2.out" }, SCENE_START);
```

**Mixing materials in one scene:**
```javascript
// BAD: glass title + rubber subtitle = tonal chaos
master.from(title, { duration: 0.4, ease: "power2.out" }, t);
master.from(subtitle, { duration: 0.5, ease: "back.out(1.7)" }, t + 0.2);

// GOOD: one material, both elements
master.from(title, { ...MAT.enter, y: MAT.distance }, t);
master.from(subtitle, { ...MAT.enter, y: MAT.distance * 0.5 }, t + MAT.stagger);
```

**Ignoring weight:**
```javascript
// BAD: hero image enters at same speed as a label
master.from('.hero-img', { duration: 0.3 }, t);   // too fast for a large element
master.from('.label', { duration: 0.3 }, t + 0.2);

// GOOD: heavy element gets 1.5× duration
master.from('.hero-img', { duration: 0.3 * 1.5 }, t);   // 0.45s
master.from('.label', { duration: 0.3 * 0.6 }, t + 0.2); // 0.18s
```
