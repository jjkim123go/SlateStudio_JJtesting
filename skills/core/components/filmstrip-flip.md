# FilmstripFlip Component

> Full-screen bridge transition. A 3D card flip with CSS perspective,
> filmstrip sprocket-hole decoration, and a cinematic drop shadow that
> swings as the card rotates. The outgoing scene is on the front face;
> the incoming scene materializes on the back.

## Heritage / motion-design context

The filmstrip metaphor draws from analog editing suites where editors
physically handled strips of perforated celluloid — visible today as the
timeline-strip UI in Premiere Pro and Final Cut. The 3D card flip itself
maps to Eisenstein's montage-by-collision: juxtaposing two images on
opposite faces creates meaning through contrast (before/after, old/new,
problem/solution). The sprocket-hole ornamentation is pure tape-transport
skeuomorphism — it says "this is cinema" without a single word.
<!-- Ref: Eisenstein, "Film Form" (1949) on intellectual montage;
     filmstrip-as-timeline convention in NLE software. -->

## When to use

- **Before/after** or **version A → version B** transitions where the
  two-sided card metaphor reinforces the comparison.
- **Card-stack montages** — up to 3 flips in rapid succession to rifle
  through features or portfolio items.
- **Chapter breaks** with a controlled, mechanical energy (less cosmic
  than OrbitReveal, less typographic than TypewriterDissolve).
- Script triggers: "on the other hand", "flip side", "switching to",
  "compare", "before and after", "let's turn to."

## When NOT to use

- Calm editorial or book-metaphor scenes — too kinetic; consider a
  simple crossfade or TransitionWipe.
- Immediately after another 3D-perspective effect — perspective fatigue.
- When the video is portrait / vertical (9:16) — horizontal flips
  lose spatial context in narrow frames. Use `flip-up`/`flip-down` if
  you must, or pick a different bridge.

## Props

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `direction` | `"flip-left"` \| `"flip-right"` \| `"flip-up"` \| `"flip-down"` | no | `"flip-left"` | Axis + direction. Horizontal uses `rotationY`; vertical uses `rotationX` in animation.js. |
| `color` | CSS color string | no | `"#0078D4"` | Edge-frame accent border visible at the flip midpoint (3 px solid). Use brand primary. |
| `perspective` | number (400–3000) | no | `1200` | CSS `perspective` in px on `.ff-root`. Lower = more dramatic 3D distortion. Below 600 the card warps visibly. |

**Gotcha:** The back face is pre-rotated 180° in CSS via `data-direction`
attribute selectors (index.html lines 21–23). animation.js flips the
card from 0° → 180° (or –180° if reversed). Don't set `rotationY` or
`rotationX` in any SCF override — the component owns the transform.

## Scene timing

**Recommended duration: 2–3 s.** The animation uses proportional phase
splits so it scales with `SCENE_DURATION`:

| Phase | % of dur | At 2.5 s | Purpose |
|-------|----------|----------|---------|
| Sprocket-in (stagger) | 12 % | 0.30 s | Sprocket holes fade in, each: 0.02 s stagger |
| Pre-flip hold + shadow | 8 % | 0.20 s | Shadow builds, anticipation beat |
| Flip-out (0→90°) | 25 % | 0.625 s | Front face rotates away, `power2.in` ease |
| Edge flash | 4 % | 0.10 s | Brand-color border pulses at midpoint |
| Flip-in (90→180°) | 25 % | 0.625 s | Back face rotates into view, `power2.out` ease |
| Sprocket-out + shadow | 10 % | 0.25 s | Decoration fades |
| Exit fade | dur − 0.5 s | 2.0 s | Root autoAlpha → 0 over 0.2 s |

Below 1.5 s the flip is too abrupt for the eye to register the 3D
rotation; above 4 s the anticipation hold and shadow swing feel sluggish.

### Music-sync frames (30 fps)

| Tempo | Beat interval | Suggested dur | Flip midpoint on… |
|-------|--------------|---------------|--------------------|
| 90 BPM | 0.667 s | 2.67 s (4 beats) | Beat 2–3 boundary |
| 120 BPM | 0.500 s | 2.5 s (5 beats) | Beat 3 |
| 140 BPM | 0.429 s | 2.14 s (5 beats) | Beat 3 |

## Music sync

The money-moment is the **flip midpoint** (the edge flash). Sync a
percussive hit, snap, or whoosh to that instant.

```jsonc
// 120 BPM track, scene starts on beat 1 at 8.0 s
{ "id": "flip-compare", "duration": 2.5, "triggerSec": 8.0,
  "component": "FilmstripFlip", "props": { "direction": "flip-left" } }
// Midpoint edge flash ≈ 8.0 + 0.3 + 0.2 + 0.625 = 9.125 s (beat 3).
```

## Accessibility & motion safety

**Vestibular risk: moderate.** A 180° 3D rotation is a significant
motion event, but it is a single discrete flip — not continuous rotation
like OrbitReveal. Per WCAG 2.3.3 (Level AAA), motion from interaction
should be disablable; in a pre-rendered video the mitigation is limiting
usage and providing a reduced-motion alternative.
<!-- Ref: W3C WCAG 2.3.3 — https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html -->

**`prefers-reduced-motion` fallback:** Replace with a 0.3 s crossfade
(no 3D rotation, no sprocket holes). The two faces dissolve into each
other — preserves the before/after meaning without spatial motion.

**Flashing check:** The edge flash is a single 0.1 s pulse (at default
2.5 s duration = 4 % of dur). This is well below the 3-flashes-per-second
seizure threshold (WCAG 2.3.1). Safe.

## Performance & failure modes

- **DOM nodes:** ~34 total (card structure 6 + 2 × 14 sprocket holes).
  Sprocket holes are generated at runtime (14 per strip × 2 strips = 28).
- **GPU load:** `transform-style: preserve-3d` + `perspective` promotes
  the card subtree. Shadow and edge use `will-change: opacity`. Moderate.
- **Visual break:** `perspective` < 500 causes extreme foreshortening —
  the card edges warp past the viewport. Keep ≥ 600 for safe results.
  `perspective` > 2500 flattens the flip so much it looks like a 2D
  crossfade — defeats the purpose.
- **Perf cost ranking:** low–medium (fixed DOM count, no per-frame
  reflows).

## Composition tips

- **Before:** a content scene whose final frame becomes the "front" of
  the card conceptually (even though the component uses its own
  background). Works best after static frames like TitleCard or an
  image scene.
- **After:** the "revealed" scene — ideally visually distinct from the
  preceding one to justify the flip metaphor.
- Up to **3× per video**. In series (rapid card-stack) keep duration at
  the low end (2 s) and use alternating directions (`flip-left`,
  `flip-right`) for rhythm.
- Match `color` to brand primary for the edge flash — it's a brief but
  high-contrast brand moment.

## Authoring example

```json
{
  "id": "chapter-flip",
  "duration": 2.5,
  "component": "FilmstripFlip",
  "props": {
    "direction": "flip-left",
    "color": "#0078D4",
    "perspective": 1200
  },
  "transition": "crossfade"
}
```
