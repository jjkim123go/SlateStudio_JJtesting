# DepthZoomPunch — cinematic depth-zoom flash transition

> Layer 2 component skill. Load when the script needs a camera-punch
> impact moment — outgoing content rushes forward into blur, a flash
> fires, incoming content zooms in from depth.

## Heritage / motion-design context

The depth-zoom punch is a digital descendant of the **dolly-zoom**
(contra-zoom), first deployed by Irmin Roberts for Alfred Hitchcock's
*Vertigo* (1958) to visualise acrophobia. The technique — dolly in while
zooming out, or vice versa — warps spatial perception and signals a
moment of psychological shift. Spielberg reused it in *Jaws* (1975) for
Chief Brody's beach realisation; Jackson in *Lord of the Rings* for
Frodo on the forest road. In motion graphics the effect is flattened to
2D: rapid scale + blur simulates the z-axis rush, and a brief flash
replaces the optical midpoint where the lens crosses infinity focus.
The result is a visceral "snap-zoom" that earns its place as a payoff
punctuation — a visual exclamation mark.
(Ref: Wikipedia — Dolly zoom; *The Filmmaker's Eye*, Gustavo Mercado)

## When to use

**Triggers:** "camera punch", "depth zoom", "zoom burst", "payoff
moment", "flash transition", "zoom punch", "dramatic zoom", "impact".

- Cinematic bridge between two visually distinct scenes
- Payoff moment — a thesis lands, then the next idea hits with force
- Hero product reveal after a narrative lead-in
- Music-synced impact: flash aligns to a snare or downbeat

## When NOT to use

- Calm, narrated explanations — the punch is too aggressive for
  contemplative pacing
- Scenes where readability of either image matters at the cut moment —
  both images are blurred and scaled past legibility near the flash
- Back-to-back use — **once per video maximum**. A second punch loses
  its shock value and risks inducing discomfort
- Long-form educational content where the viewer expects measured,
  predictable transitions

## Props

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `outgoingImageSrc` | string | no | `""` | Image for the outgoing layer. If empty, the layer renders as a solid `outgoingColor`. Image uses `object-fit: cover`. |
| `incomingImageSrc` | string | no | `""` | Image for the incoming layer. Same fallback behaviour. |
| `outgoingColor` | string | no | `"#1a1a2e"` | CSS color for the outgoing layer when no image is provided. Dark default avoids white-flash-on-white. |
| `incomingColor` | string | no | `"#0078D4"` | CSS color for the incoming layer. Falls through to `--brand-primary` in CSS. |
| `flashColor` | string | no | `"#ffffff"` | Midpoint flash color. White (`#ffffff`) for a standard punch. `#000000` creates a dramatic "blink-cut". Avoid saturated hues — they read as errors. |
| `flashDuration` | number | no | `0.06` | Flash duration in seconds. Parsed with `parseFloat`; values ≤ 0 fall back to 0.06. **Keep ≤ 0.08 s** for a punch feel; 0.1 s+ reads as a glitch. At 30 fps, 0.06 s ≈ 2 frames. |
| `maxBlur` | number | no | `20` | Peak Gaussian blur in px at the moment of maximum scale. Parsed with `parseInt`; values ≤ 0 fall back to 20. Higher values (30–40) increase the depth-of-field illusion but cost more GPU compositing. |

## Scene timing

**Recommended duration: 1.0–1.4 s.** Sweet spot is **1.2 s.** Shorter
than 1.0 s collapses the blur ramp into a jarring blink; longer than
1.4 s makes the zoom feel ponderous — the audience expects a punch, not
a sigh.

| Phase | % of duration | At 1.2 s | What happens |
|-------|---------------|----------|-------------|
| Outgoing zoom-in | 0–~47 % | 0–0.57 s | Scale 1→3, blur 0→`maxBlur` px, opacity 1→0 (`power2.in`). |
| Flash | ~47–53 % | 0.57–0.63 s | `flashColor` ramps to 85 % opacity then back to 0 over `flashDuration`. |
| Incoming zoom-out | ~50–100 % | 0.57–1.2 s | Scale 0.3→1, blur `maxBlur`→0, opacity 0→1 (`power2.out`). Overlaps flash by ~30 % of `flashDuration`. |
| End fade | last 12 % (max 0.2 s) | 1.0–1.2 s | Root fades out for clean handoff. |

**Beat math at 30 fps:**

| BPM | Beat (s) | Suggested duration |
|-----|----------|--------------------|
| 90 | 0.667 | 1.333 s (2 beats) |
| 120 | 0.500 | 1.000 s (2 beats) or 1.500 s (3 beats) |
| 140 | 0.429 | 1.286 s (3 beats) |

## Music sync

The flash is the perceptual anchor — align it to the strong beat. The
flash fires at exactly 50 % of `SCENE_DURATION`. For a hit at time `t`,
set `SCENE_START = t − (duration × 0.5)`.

Example — snare hit at 8.0 s, 1.2 s duration:
```json
{ "id": "punch-hit", "duration": 1.2, "component": "DepthZoomPunch", "triggerSec": 7.4 }
```

## Accessibility & motion safety

**Vestibular risk: HIGH.** Rapid z-axis scale change (1→3 and 0.3→1)
combined with full-screen blur creates a strong vection (sense of
self-motion) trigger. Per WCAG 2.3.3 and W3C vestibular-safety guidance,
this is one of the more provocative patterns for users with vestibular
disorders.
(Ref: [W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html))

**Flash safety:** The default 0.06 s flash at 85 % opacity is a single
luminance spike — well under the WCAG 2.3.1 "three flashes per second"
threshold. However, if `flashDuration` is raised above 0.17 s (≈ 3 Hz
boundary at two edges), it could approach the limit. **Never set
`flashDuration` > 0.15 s.**

**`prefers-reduced-motion` fallback:** Replace with a simple crossfade
(opacity swap, 0.3 s). The component does not implement this internally —
the SCF compiler should substitute a crossfade at the scene level.

## Performance & failure modes

DOM structure is lightweight: 5 elements total (root, outgoing layer +
img, incoming layer + img, flash div). Performance cost comes from the
`filter: blur()` animation, which forces rasterisation per frame on both
layers simultaneously during the overlap window (~0.06 s). On the
HyperFrames renderer this is acceptable because frames are pre-rendered;
in a live browser context it would be expensive.

**Failure modes:**
- `flashDuration` non-numeric → falls back to 0.06 s
- `maxBlur` non-numeric → falls back to 20 px
- Image `src` broken → layer shows solid colour (graceful degradation)
- `SCENE_DURATION` < 0.3 s → phases overlap destructively; enforce
  minimum 0.8 s in the SCF validator

## Composition tips

- **Once per video.** The punch is a one-shot weapon. Overuse trains the
  audience to flinch instead of feel impact.
- Pair with a **content-heavy scene** (TitleCard, narrated image) on both
  sides — the punch needs stillness to contrast against.
- For a dark, dramatic feel: `outgoingColor: "#0d0d0d"`,
  `incomingColor: "#0d0d0d"`, `flashColor: "#000000"` (blink-cut).
- Spread at least **3 scenes** between a DepthZoomPunch and any other
  high-energy transition (CollageShatter, SwirlVortex).

## Authoring example

```json
{
  "id": "payoff-punch",
  "duration": 1.2,
  "component": "DepthZoomPunch",
  "props": {
    "outgoingImageSrc": "assets/scene-a.png",
    "incomingImageSrc": "assets/scene-b.png",
    "outgoingColor": "#1a1a2e",
    "incomingColor": "#0078D4",
    "flashColor": "#ffffff",
    "flashDuration": 0.06,
    "maxBlur": 20
  },
  "transition": "none"
}
```
