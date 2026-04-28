# SwirlVortex — radial vortex spiral transition

> Layer 2 component skill. Load when the script needs a spinning,
> brand-coloured vortex bridge — outgoing content spirals into the
> centre, radial bands pulse, incoming content unfurls outward.

## Heritage / motion-design context

Radial wipes trace back to Hollywood's Golden Age; George Lucas made the
pinwheel wipe iconic in *Star Wars* (1977) as a deliberate homage to
Kurosawa's serial-adventure pacing. The **spiral/vortex** variant
intensifies the radial wipe by adding continuous rotation and scale,
creating a tunnel-like depth illusion. In motion graphics, vortex
transitions gained popularity with digital switchers in 1990s broadcast
design (news opens, sports bumpers) and remain a staple in After Effects
and Cinema 4D for brand-reveal moments. The effect leverages the Gestalt
principle of *common fate* — all bands rotate together, pulling the
viewer's eye to the centre — and Disney's *slow-in / slow-out* to make
the spin feel organic rather than mechanical.
(Ref: *The Filmmaker's Handbook*, Ascher & Pincus; Lucas commentary on
wipes in *Star Wars* Special Edition)

## When to use

**Triggers:** "vortex", "swirl", "spiral", "whirlpool", "radial spin",
"tornado transition", "spin transition", "cyclone".

- Transitioning between abstract or conceptual scenes (vision→reality)
- Brand moments where the brand colour is the visual hero
- Dreamy or aspirational segments — product imagination, future state
- Recaps or montage intros where energy needs to build quickly

## When NOT to use

- Information-dense scenes (data tables, code, charts) — the spinning
  motion competes with content the viewer needs to read
- Calm, narrated explanations — the kinetic energy is mismatched
- Documentary or realistic content — the effect reads as stylised
- Back-to-back with CollageShatter or DepthZoomPunch — too much
  high-energy transition in sequence fatigues the viewer
- More than **twice per video** — the novelty decays fast

## Props

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `outgoingColor` | string | no | `"#1a1a2e"` | CSS color for the outgoing layer. Used when no image layer is present. |
| `incomingColor` | string | no | `"#0078D4"` | CSS color for the incoming layer. Falls through to `--brand-primary`. |
| `brandColor` | string | no | `"#0078D4"` | CSS color for the radial vortex bands. Use brand primary for brand-coherent transitions. If the value contains unresolved mustache syntax, `animation.js` resets to `var(--brand-primary, #0078D4)`. |
| `bandCount` | number | no | `6` | Number of radial band spokes. Parsed with `parseInt`; values < 2 fall back to 6. Sweet spot: 4–8. Below 4 looks sparse; above 10 blurs into a solid disc. Each band is a DOM `<div>` positioned at `360°/bandCount` intervals. |
| `vortexRotation` | number | no | `720` | Total rotation in degrees across the full vortex phase. 720 = two full spins (default). Parsed with `parseInt`; values ≤ 0 fall back to 720. Higher values (1080+) create a faster perceived spin but increase vestibular risk. |

**Gotcha — band opacity:** Bands cycle through three alpha levels
(`0.60`, `0.75`, `0.90` via `i % 3`) for depth. This is hard-coded in
`animation.js` and not exposed as a prop.

## Scene timing

**Recommended duration: 1.5–2.0 s.** Sweet spot is **1.8 s.** Shorter
than 1.4 s compresses the three-phase structure into a blur; longer than
2.2 s makes the spin feel indulgent.

| Phase | % of duration | At 1.8 s | What happens |
|-------|---------------|----------|-------------|
| 1 — Outgoing spiral-in | 0–40 % | 0–0.72 s | Scale 1→0.05, rotation 0→`vortexRotation×0.5`, blur 0→8 px, fade out (`power3.in`). |
| 2 — Vortex spin | 30–65 % | 0.54–1.17 s | Bands scale 0.1→1→3, rotate 0→`vortexRotation×0.7`, opacity ramp up then down (`power2.out` / `power2.in`). Overlaps Phase 1. |
| 3 — Incoming unfurl | 55–100 % | 0.99–1.8 s | Scale 0.1→1, counter-rotation `−vortexRotation×0.3`→0, blur 12→0 px, fade in (`power2.out`). |
| End fade | last 12 % (max 0.25 s) | 1.55–1.8 s | Root fades out for clean handoff. |

**Beat math at 30 fps:**

| BPM | Beat (s) | Suggested duration |
|-----|----------|--------------------|
| 90 | 0.667 | 2.000 s (3 beats) |
| 120 | 0.500 | 1.500 s (3 beats) or 2.000 s (4 beats) |
| 140 | 0.429 | 1.714 s (4 beats) |

## Music sync

The vortex is a sustained effect, not a point event. Align Phase 1 start
to an upbeat or rising note, and the vortex peak (Phase 2 midpoint, ~47 %
of duration) to the downbeat. A continuous swelling tone or rising
arpeggio works better than a staccato hit.

Example — swell peaks at 15.0 s, 1.8 s duration:
```json
{ "id": "vortex-swell", "duration": 1.8, "component": "SwirlVortex", "triggerSec": 14.15 }
```
(Sets Phase 2 peak at ~14.15 + 0.85 ≈ 15.0 s.)

## Accessibility & motion safety

**Vestibular risk: HIGH.** Continuous rotation (up to 720° default) with
simultaneous scale changes is one of the strongest vestibular triggers in
motion design. Per WCAG 2.3.3 (Animation from Interactions), rotation is
classified as high-risk for users with vestibular disorders, and scale
animation compounds the effect.
(Ref: [W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html);
A List Apart, "Designing Safer Web Animation for Motion Sensitivity")

**`prefers-reduced-motion` fallback:** Replace the entire vortex with a
simple crossfade (opacity swap, 0.4 s). The rotation + scale combination
has no safe "reduced" variant — reducing speed still triggers vection.
The component does not implement this internally; the SCF compiler should
substitute a crossfade at the scene level.

**Flash safety:** No discrete flash event. Band opacity cycling is
continuous and well under the WCAG 2.3.1 three-flashes-per-second
threshold.

**Additional guideline:** If `vortexRotation` exceeds 1080° (3 full
spins), the risk of viewer disorientation rises sharply. Cap at 720° for
general audiences; only exceed for explicitly stylised/music-video
contexts with a stated accessibility caveat.

## Performance & failure modes

DOM structure: root (1) + outgoing layer (1) + incoming layer (1) +
vortex container (1) + `bandCount` band divs. At default 6 bands = 10
elements total. The vortex container is sized at 200 %×200 % of the
viewport (CSS `inset: -50%`) to prevent band edges from showing during
rotation — this means the composited area is 4× the visible viewport.

| Band count | DOM elements | Composited area | Perf rating |
|-----------|-------------|-----------------|-------------|
| 4 | 8 | 4× viewport | Comfortable |
| 6 | 10 | 4× viewport | Default — smooth |
| 8 | 12 | 4× viewport | Fine |
| 12 | 16 | 4× viewport | Watch for blur cost |

The vortex container animates `transform` (rotation + scale) and
`autoAlpha` — compositor-friendly. Outgoing and incoming layers add
`filter: blur()`, which forces rasterisation. Cost is dominated by
the blur, not the band count.

**Failure modes:**
- `bandCount` < 2 or non-numeric → falls back to 6
- `vortexRotation` ≤ 0 or non-numeric → falls back to 720
- `brandColor` contains unresolved mustache → reset to CSS variable
  `var(--brand-primary, #0078D4)`
- Missing `.svx-root` or `.svx-vortex` DOM node → IIFE early-returns

## Composition tips

- Use sparingly — **1–2 per video**. The spiral is visually dominant and
  memorable; a third instance reads as a crutch.
- Works best between **abstract/conceptual scenes** where precise content
  readability is not critical during the transition.
- Match `brandColor` to brand primary for a brand-coherent vortex.
  When the incoming scene is a BrandIntro, align `incomingColor` to the
  brand's background for a seamless colour handoff.
- Pair with a music swell, not a hard beat. The vortex is a process, not
  a moment — it needs sustained sonic energy.
- Follow with a calm, static scene (TitleCard, narrated image) to let
  the viewer's vestibular system settle.

## Authoring example

```json
{
  "id": "act-break-vortex",
  "duration": 1.8,
  "component": "SwirlVortex",
  "props": {
    "outgoingColor": "#1a1a2e",
    "incomingColor": "#0078D4",
    "brandColor": "#0078D4",
    "bandCount": 6,
    "vortexRotation": 720
  },
  "transition": "none"
}
```
