# CollageShatter — fragmented-tile shatter reveal

> Layer 2 component skill. Load when the script calls for a dramatic
> break-apart reveal — tiles explode outward, incoming scene rises behind.

## Heritage / motion-design context

The shatter transition descends from optical fragmentation effects
popularised in 1990s digital compositing (notably After Effects' Shatter
and CC Pixel Polly). It applies two of Disney's 12 Principles — *staging*
(the grid creates a clear visual event) and *follow-through* (staggered
tile delays produce organic dispersion). In film grammar, a shatter is a
hard punctuation mark: it signals a decisive break, not a gentle segue.
Use it the way a writer uses an em-dash — to interrupt and redirect.

## When to use

**Triggers:** "shatter", "glass break", "tile explode", "mosaic
transition", "collage shatter", "dramatic reveal", "break apart".

- Hero reveal at a major chapter break ("…and here it is.")
- After a build-up beat — a thesis lands, the world shatters, next idea
  takes over
- Brand moment where a logo or product image emerges from the debris
- Music-synced hit: align the first tile movement to a kick or cymbal

## When NOT to use

- Subtle informational pivots — the effect is too loud; use TransitionWipe
- Documentary or regulated content — over-stylized for the tone
- Scenes with motion-heavy backgrounds — shatter becomes unreadable
  against competing movement
- Back-to-back: never place two CollageShatter instances within 3 scenes
  of each other; the novelty vanishes

## Props

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `tileColumns` | number | no | `4` | Grid columns. With `tileRows`, determines total tile count (`cols × rows`). At 4×4 = 16 tiles. Raising to 6×6 = 36 produces a finer glass-like shatter. |
| `tileRows` | number | no | `4` | Grid rows. Keep the aspect ratio close to 1:1 per tile for balanced dispersion. |
| `color` | string | no | `"#0078D4"` | CSS color for tile fill **and** the reveal background. Falls through to `--brand-primary` if the CSS variable is set. Use brand primary when a brand package is active. |
| `incomingImageSrc` | string | no | `""` | Optional image path revealed behind the shattered tiles. When empty, the reveal is a solid `color` sheet. Image uses `object-fit: cover`. |
| `spreadFactor` | number | no | `1.5` | Multiplier for tile travel distance. `1.0` = tiles reach frame edge; `1.5` (default) = tiles fly past the edge; `2.0+` = dramatic explosion. Parsed in `animation.js` with `parseFloat`; values ≤ 0 fall back to 1.5. |

**Gotcha — DOM count:** Total DOM nodes = `tileColumns × tileRows × 2`
(each tile wraps an inner `<div>`). A 4×4 grid = 32 nodes; an 8×8 grid =
128 nodes. Keep below 6×6 (72 nodes) for smooth 30 fps rendering in
HyperFrames. See `animation/performance.md`.

## Scene timing

**Recommended duration: 1.2–2.0 s.** Sweet spot is **1.4 s** for a pure
visual bridge; extend to **2.0 s** if `incomingImageSrc` carries content
the viewer needs to register.

| Phase | % of duration | At 1.4 s | What happens |
|-------|---------------|----------|-------------|
| Shatter out | 0–65 % | 0–0.91 s | Tiles fly outward (`power3.in`). Per-tile delay 0–0.15 s (deterministic seed). |
| Reveal fade-up | 10–60 % | 0.14–0.84 s | Background/image fades from 0→1 (`power2.out`), overlapping shatter. |
| End fade | last 15 % (max 0.3 s) | 1.1–1.4 s | Entire root fades out for clean handoff. |

**Beat math at 30 fps:**

| BPM | Beat (s) | Half-beat | Suggested duration |
|-----|----------|-----------|-------------------|
| 90 | 0.667 | 0.333 | 1.333 s (2 beats) |
| 120 | 0.500 | 0.250 | 1.500 s (3 beats) |
| 140 | 0.429 | 0.214 | 1.286 s (3 beats) |

## Music sync

Align `triggerSec` so the shatter begins on a strong beat. The perceptual
"hit" is ~0.1 s into the animation when tiles first visibly separate. For
a downbeat at `t`, set `SCENE_START = t − 0.1`.

Example — drop at 12.0 s in a 120 BPM track:
```json
{ "id": "shatter-drop", "duration": 1.5, "component": "CollageShatter", "triggerSec": 11.9 }
```

## Accessibility & motion safety

**Vestibular risk: MEDIUM-HIGH.** Rapid multi-directional movement of 16+
elements with scale and rotation. Per WCAG 2.3.3 (Animation from
Interactions) and W3C vestibular-safety guidance, this kind of distributed
motion can trigger dizziness in users with vestibular disorders.
(Ref: [W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html))

**`prefers-reduced-motion` fallback:** Replace the shatter with a simple
crossfade (opacity 1→0 on outgoing, 0→1 on incoming, 0.4 s duration).
The component does not currently implement this internally — the SCF
compiler should substitute a crossfade transition at the scene level when
the user preference is active.

**Flash safety:** No full-screen flash. Tile opacity decays individually
so luminance change is distributed, staying well under the WCAG 2.3.1
three-flashes-per-second threshold.

## Performance & failure modes

| Grid | Tile count | DOM nodes | Perf rating |
|------|-----------|-----------|-------------|
| 3×3 | 9 | 18 | Comfortable |
| 4×4 | 16 | 32 | Default — smooth |
| 6×6 | 36 | 72 | Fine on modern renderers |
| 8×8 | 64 | 128 | Risky — test before shipping |
| 10×10 | 100 | 200 | Likely to drop frames |

Each tile animates `x`, `y`, `rotation`, `scale`, and `autoAlpha` —
five GSAP properties per element. At 4×4 that is 80 concurrent tween
targets; at 8×8, 320. The renderer composites with `will-change: transform,
opacity` on each tile, so GPU layer count = tile count.

**Failure modes:**
- `spreadFactor` < 0 or non-numeric → animation.js clamps to 1.5
- `incomingImageSrc` path broken → reveal shows solid `color` (graceful)
- Missing `csh-grid` DOM node → animation IIFE early-returns silently

## Composition tips

- Place CollageShatter between two static-image or narrated scenes — it
  needs visual calm on both sides to read as a punctuation mark.
- Limit to **1–2 per video**. A third shatter dilutes the impact.
- Match `color` to brand primary so the reveal reinforces brand recall.
- After a shatter, follow with a calmer component (TitleCard, LowerThird)
  to let the eye reset.
- For a finer "glass crack" look, use 6×6 tiles with `spreadFactor: 1.0`.

## Authoring example

```json
{
  "id": "act-break-1",
  "duration": 1.4,
  "component": "CollageShatter",
  "props": {
    "tileColumns": 4,
    "tileRows": 4,
    "color": "#0078D4",
    "incomingImageSrc": "assets/hero-reveal.png",
    "spreadFactor": 1.5
  },
  "transition": "none"
}
```
