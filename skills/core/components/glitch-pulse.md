# GlitchPulse Component

> Layer 2 component skill. Use it when a scene needs a short RGB-split / scanline punctuation hit that feels intentional, not like the edit broke.

## Heritage / motion-design context

Controlled glitch aesthetics sit between media-art theory and broadcast design: [Rosa Menkman's *The Glitch Moment(um)*](https://www.instituteofnetworkcultures.org/publications/inc-books/the-glitch-momentum/) treats error as an expressive surface, while production tutorials such as Adobe's [RGB split glitch walkthrough](https://helpx.adobe.com/after-effects/how-to/rgb-split-glitch-effect.html) helped codify channel offsets and scanline contamination as a motion-design shorthand for surveillance, signal interference, and techno-anxiety. In practice, the reference is closer to restrained “system instability” branding than to pure databending. That distinction matters: glitch reads as deliberate only when it is brief, legible, and thematically justified.

## When to use

Triggers: `glitch pulse`, `rgb split`, `scanline hit`, `signal interference`, `data corruption beat`, `tech snap`, `system flicker`, `digital distortion`.

- Short punctuation on a phrase like “the signal breaks,” “the feed spikes,” or “the system detects drift.”
- Tech, cyber, observability, security, or synthetic-media scenes where signal instability is part of the story.
- Hits synced to a stinger, snare, or hard electronic transient.
- Briefly dirtying otherwise clean UI or typography before it returns to normal.

## When NOT to use

- Trust-building corporate, healthcare, finance, or compliance content unless the narrative is explicitly about fault or detection.
- Small text, code blocks, or detailed screenshots that must remain readable during the hit.
- Repeated use within a scene. Multiple pulses quickly stop reading as authored and start reading as export corruption.
- As a scene-to-scene bridge. This is an overlay accent, not a transition.

## Props

```json
{
  "triggerSec": 0.3,
  "intensity": "medium",
  "color1": "#00e5ff",
  "color2": "#ff3ad8"
}
```

| Prop | Type | Required | Default | Notes and gotchas |
|------|------|----------|---------|-------------------|
| `triggerSec` | number | no | `0.3` | Clamped into the safe part of the scene: `0` to `SCENE_DURATION - effectDuration - 0.02`. Too-late triggers are pulled earlier automatically. |
| `intensity` | string enum | no | `"medium"` | `low`, `medium`, `high`. Runtime map: `low = 0.42s / 6px shift`, `medium = 0.50s / 10px`, `high = 0.58s / 15px`, with matching noise and scan opacity increases. |
| `color1` | string | no | `"#00e5ff"` | Tint for the negative X channel. Cyan is readable against dark scenes; use brand accents only if they remain distinct from the base scene. |
| `color2` | string | no | `"#ff3ad8"` | Tint for the positive X channel. Paired with `color1` to create chromatic split; very similar hues weaken the effect. |

## Scene timing

Recommended scene duration: **2.0–6.0 seconds**, with the pulse itself occupying **0.42–0.58 seconds**. Reason: the effect is a punctuation mark, not the whole sentence. The underlying scene needs enough clean time before and after the hit for the audience to parse it.

| Phase | Implementation timing | What the viewer perceives |
|------|------------------------|----------------------------|
| Scene clone prep | `SCENE_START + 0.02s` | Three overlay shells clone the underlying scene content. |
| RGB split kick | first `18–20%` of effect | Cyan and magenta channels shear apart. |
| Noise / banding burst | overlaps kick and mid pulse | Signal contamination rather than full white flash. |
| Scan sweep | starts at `8%` of effect, runs `44%` | A bright bar traverses the frame. |
| Resolve | last `18–20%` | Channels collapse back to clean, overlay disappears. |

At **30 fps**, common beat math is:

| BPM | 1 beat | 1/2 beat | 1/4 beat |
|-----|--------|----------|----------|
| 90  | 20 frames | 10 frames | 5 frames |
| 120 | 15 frames | 7.5 frames | 3.75 frames |
| 140 | 12.86 frames | 6.43 frames | 3.21 frames |

The `medium` pulse is `0.50s`, or about **15 frames**: exactly one beat at 120 BPM, three-quarters of a beat at 90 BPM, and slightly longer than one beat at 140 BPM.

## Music sync

Align `triggerSec` to the **attack** of the audio event, not to the end of the pulse.

- **120 BPM, scene hit on beat 3:** `triggerSec: 1.0`, `intensity: "medium"` gives a one-beat glitch that begins exactly on the beat.
- **140 BPM, tighter electronic stab:** `triggerSec: 0.857`, `intensity: "low"` keeps the hit closer to a single fast beat.
- **90 BPM, heavy accent:** `triggerSec: 1.333`, `intensity: "high"` works if the line is meant to feel like a disruptive interruption rather than a metronomic hit.

Use one pulse per sentence or per scene. If the beat structure demands multiple hits, switch to edit-based cuts rather than stacking more glitches. See `skills/core/animation/sequencing.md`.

## Accessibility & motion safety

This effect is **high risk** for both photosensitive and vestibular users because it combines brightness shifts, horizontal displacement, scan movement, and high-contrast noise.

- **WCAG 2.3.1 check:** the implementation is a **single composite pulse**, not a repeating strobe loop. The three channels, noise, scan, and scanlines animate within one `0.42–0.58s` envelope, so the component itself does not inherently exceed the W3C [three flashes per second threshold](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html). However, if you place several GlitchPulse scenes back-to-back, or use it over already flashing footage, the edit as a whole can still violate the threshold. Test full-screen output with PEAT or an equivalent analyzer before sign-off.
- **WCAG 2.3.3:** if this effect is triggered by interaction, it is non-essential motion unless the experience is literally teaching glitch behavior; users need a way to suppress it. See [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- `prefers-reduced-motion` should be treated aggressively here: replace the effect with either no accent, or a single static color/contrast change lasting 80–120 ms. Do not merely lower `intensity`; even `low` still shears the image and introduces scan movement.
- Rapid RGB separation can create a “vibrating edge” around white text. Keep typography large or avoid text during the pulse.
- Avoid saturated red glitches; WCAG specifically notes heightened risk for red flashing.

Fallback recommendation: a short opacity or contrast bump on one layer, or a clean cut timed to the same beat.

## Performance & failure modes

**Perf cost rank: high on complex scenes, medium on simple scenes.**

- The component clones **every top-level sibling in the scene three times** (`base`, `c1`, `c2`). If the underlying scene has `N` top-level children, you add three cloned subtrees plus the overlay wrappers. Heavy DOM, SVG, or subtitle layers multiply the cost fast.
- Filters (`contrast`, `brightness`, `grayscale`) and blend modes on full-frame overlays are more expensive than the simple prop surface suggests.
- Small text and thin line art fail first: the 10–15 px channel offsets make detail unreadable.
- On bright scenes, the scan bar can read like a rendering defect rather than a designed glitch. Darker bases sell the effect better.
- Because the overlay samples scene children at `SCENE_START + 0.02`, late-added DOM from other components may not appear in the clone if they materialize after that moment.

See `skills/core/animation/performance.md` for why clone-heavy overlays should stay rare.

## Composition tips

- Best before: calm, legible UI or type that gives the glitch something clean to disturb.
- Best after: immediate return to clarity. The effect works because the audience can compare “stable” and “unstable.”
- Use **0–2 times per video**. More than that becomes branding by malfunction.
- Keep `color1` / `color2` close to existing signal-language conventions (cyan/magenta, brand accent + white) unless the brand explicitly owns a different interference palette.
- If the story beat is “danger” or “alarm,” consider an edit, a siren-color wash, or a discrete label change before you reach for glitch. Glitch should mean signal instability, not generic excitement.
- For motion fundamentals and readable easing choices, see `skills/core/animation/basics.md`.

## Authoring example

```json
{
  "id": "signal-break-hit",
  "duration": 4,
  "component": "GlitchPulse",
  "props": {
    "triggerSec": 1.0,
    "intensity": "medium",
    "color1": "#00E5FF",
    "color2": "#FF3AD8"
  }
}
```
