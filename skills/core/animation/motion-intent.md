# Motion Intent — How to Choose Animation Personality

> **Layer 2 skill** — load at **scene_plan** stage, before writing any
> `animation.js`. This skill answers: "what should the animation *feel*
> like?" before you write a single GSAP call.
>
> **Companion skills:** After choosing a material here, use
> [material-physics.md](material-physics.md) for exact GSAP parameters,
> then [attention-choreography.md](attention-choreography.md) for
> sequencing within the scene.

---

## Why This Matters

Without intent, agents pick arbitrary easing and duration — `power2.out`
and `0.5s` everywhere. The result is technically correct but emotionally
flat. Every scene in a video should serve a communication purpose, and
the animation should reinforce it.

---

## The Intent Chain

Every animation decision follows this chain:

```
What should the viewer REMEMBER from this scene?
  ↓
What should the viewer FEEL while watching?
  ↓
Which MATERIAL metaphor expresses that feeling?
  ↓
The material determines ALL motion parameters
(duration, easing, overshoot, stagger timing)
```

The agent answers the first two questions from the script. The material
maps mechanically to GSAP parameters via `material-physics.md`.

---

## Step 1: Extract the Scene's Job

Read the narration line for the scene. What is this scene doing?

| Scene job | Example narration |
|-----------|-------------------|
| Introduce a concept | "Let's talk about how data flows through the system" |
| Prove with data | "Latency dropped from 340ms to 12ms" |
| Show a process | "First you configure the pipeline, then deploy" |
| Build credibility | "We're SOC 2 Type II certified" |
| Call to action | "Get started today at contoso.com" |
| Transition/bridge | "Now let's look at the architecture" |

## Step 2: Map Job → Target Emotion

| Scene job | Target emotion | Why |
|-----------|---------------|-----|
| Introduce a concept | **Calm clarity** | Viewer needs to absorb, not be overwhelmed |
| Prove with data | **Confident impact** | Numbers should land with authority |
| Show a process | **Guided momentum** | Steps should flow naturally, building energy |
| Build credibility | **Quiet authority** | Trust comes from restraint, not flash |
| Call to action | **Energetic urgency** | Motivate without being pushy |
| Transition/bridge | **Smooth continuity** | Don't interrupt the narrative flow |

## Step 3: Map Emotion → Material

Materials are metaphors that lock in ALL motion parameters at once.
Pick the one that matches the emotion:

| Material | Personality | When to use |
|----------|-------------|-------------|
| **Glass** | Clean, precise, professional | Corporate explainers, tech content, credibility scenes |
| **Paper** | Gentle, editorial, calm | Introductions, narrative scenes, onboarding |
| **Metal** | Sharp, decisive, authoritative | Data impact, key statistics, urgent callouts |
| **Rubber** | Playful, bouncy, fun | Celebrations, social teasers, friendly brands |
| **Liquid** | Smooth, flowing, continuous | Transitions, loading states, ambient motion |
| **Wood** | Warm, grounded, trustworthy | Customer stories, testimonials, human moments |

**Consistency rule:** All elements within a scene use the same material.
A scene doesn't mix glass and rubber — that creates tonal whiplash.

**Video-level default:** If the script doesn't suggest a specific emotion,
default to **glass** for professional content or **paper** for educational
content. Override per-scene only when the scene's job clearly demands
something different.

---

## Step 4: Write the Intent Line

Before writing `animation.js`, write a one-line intent comment at the top:

```javascript
// Intent: glass — confident impact for key metric reveal
```

This serves two purposes:
1. Forces the agent to be deliberate (not just "animate stuff")
2. Makes the material choice reviewable in code review

---

## Decision Shortcuts

For common Slate component types:

| Component | Default material | Override when |
|-----------|-----------------|---------------|
| BrandIntro | glass | Playful brand → rubber |
| DataChart | metal | Narrative chart → paper |
| MetricsCard | metal | Always metal — numbers need authority |
| TerminalCast | glass | Hacker energy → metal |
| DataFlow | paper | Complex flow → liquid (smooth) |
| StepByStep | paper | Urgent tutorial → glass |
| CustomerStory | wood | Always wood — human warmth |
| CTABlock | glass | High-energy CTA → rubber |
| SectionDivider | liquid | Always liquid — smooth bridge |
| Quote | wood | Always wood — human voice |
| CompareSlider | metal | Numbers-heavy → metal |
| SlideRenderer | paper | Default for decks |

---

## Anti-Patterns

**No intent → generic motion:**
```javascript
// BAD: no reasoning, arbitrary values
master.from(el, { y: 30, opacity: 0, duration: 0.5, ease: "power2.out" }, SCENE_START);
```

**Intent-driven → purposeful motion:**
```javascript
// GOOD: material-derived values
// Intent: metal — data should land with authority
master.from(el, { y: 20, opacity: 0, duration: 0.3, ease: "power3.out" }, SCENE_START);
```

**Tonal mismatch:**
```
Script: "Our security certifications protect your data"
BAD material: rubber (bouncy ≠ trust)
GOOD material: glass (precise = trust)
```

**Decoration without purpose:**
```
Ask: "If I remove this animation, does the scene communicate less?"
If NO → the animation is decoration. Cut it or simplify it.
```
