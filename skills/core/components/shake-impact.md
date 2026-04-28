# ShakeImpact Component

> Layer 2 component skill. Use it when a number, hit, or statement needs a short physical jolt that the audience feels more than notices.

## Heritage / motion-design context

Camera shake has two very different lineages: handheld immediacy in war/action cinematography such as Janusz Kamiński's work on [Saving Private Ryan](https://theasc.com/articles/saving-private-ryan-cinematography-kaminski), and stylized impact punctuation in animation, where single-frame “impact frames” make force feel instantaneous ([Sakuga Blog glossary](https://blog.sakugabooru.com/glossary/impact-frames/)). Good shake borrows the first lineage's sense of force but the second lineage's discipline: one hit, one reason, then settle. Bad shake reads as weak camera operation.

## When to use

Triggers: `shake impact`, `screen jolt`, `stat hit`, `camera bump`, `impact beat`, `punch in the numbers`, `wow moment`, `hard landing`.

- Landing a KPI, claim, or before/after delta when the script needs tactile emphasis.
- Music-driven hero moments where an impact already exists in the score.
- Product demos where one panel should feel as though it “slams into place.”
- Follow-up punctuation after a reveal, not the reveal itself.

## When NOT to use

- Calm explanatory narration, compliance walkthroughs, or any scene where trust and stability are more important than force.
- Repeatedly on every stat. One strong hit beats several medium ones.
- Entire-scene shake on dense UI or subtitles; readability drops immediately.
- Long looping shake. This implementation is built for a single 240 ms event, not ongoing turbulence.

## Props

```json
{
  "triggerSec": 0.5,
  "intensity": "medium",
  "direction": "both",
  "targetSelector": ".scene-hero-stat"
}
```

| Prop | Type | Required | Default | Notes and gotchas |
|------|------|----------|---------|-------------------|
| `triggerSec` | number | no | `0.5` | Clamped so the full hit can complete before scene end: runtime uses `min(triggerSec, SCENE_DURATION - 0.24)`. |
| `intensity` | string enum | no | `"medium"` | `subtle`, `medium`, `heavy`. Runtime amplitudes: `subtle = 8px/6px`, `medium = 15px/11px`, `heavy = 22px/16px`, plus contrast/saturation pump. |
| `direction` | string enum | no | `"both"` | `horizontal`, `vertical`, `both`. Runtime zeroes the unused axis; `horizontal` is usually safer for UI, `vertical` reads more like a drop or slam. |
| `targetSelector` | string | no | `".scene-{{sceneId}}"` | If the selector is blank or still contains template braces at runtime, the component falls back to the whole scene root. Narrow targeting is strongly preferred. |

## Scene timing

Recommended scene duration: **1.5–5 seconds**, but the shake itself is fixed at about **0.24 seconds**. Reason: the effect is just four quick moves; what matters is having enough clean time before and after the hit for contrast.

| Phase | Implementation timing | What the viewer perceives |
|------|------------------------|----------------------------|
| Kick | `0.04s` | Immediate shove to peak amplitude. |
| Counter-shift | next `0.05s` | Rebound; prevents the first move from looking like a typo. |
| Decay | next `0.06s` | Smaller aftershock. |
| Settle | final `0.09s` | Returns to clean, with filter reset. |

At **30 fps**, that 0.24s envelope is roughly **7.2 frames** total.

| BPM | 1 beat | 1/2 beat | 0.24s hit |
|-----|--------|----------|-----------|
| 90  | 20 frames | 10 frames | 36% of a beat |
| 120 | 15 frames | 7.5 frames | 48% of a beat |
| 140 | 12.86 frames | 6.43 frames | 56% of a beat |

In practice, the component feels like a **half-beat accent** at 120–140 BPM.

## Music sync

Align `triggerSec` to the **transient**, not to the middle of the decay.

- **120 BPM:** `triggerSec: 1.5` lands the kick on beat 4; the rebound and settle occupy the following half beat cleanly.
- **140 BPM:** `triggerSec: 0.857` works well for a downbeat if you keep `intensity: "subtle"` or `"medium"`.
- **90 BPM:** `triggerSec: 2.0`, `direction: "vertical"`, `intensity: "heavy"` can sell a large product drop, but only if the rest of the frame is simple.

If you need a more cinematic “aftershock,” build it with edit rhythm or scale/blur accents elsewhere rather than lengthening this shake. See `skills/core/animation/sequencing.md`.

## Accessibility & motion safety

This effect is **high vestibular risk**. Even though it is short, the whole-scene default combines translation and contrast pumping in a way many motion-sensitive users feel immediately.

- The heavy preset reaches **22 px horizontal / 16 px vertical** in the first 40 ms, reverses direction twice, and completes three distinct directional changes inside 240 ms. That is intentionally forceful, but it is aggressive.
- For `prefers-reduced-motion`, do not substitute a smaller shake. Replace it with a non-spatial cue: a one-frame highlight ring, a static color change, bolding a number, or a restrained opacity/contrast bump on the target element.
- WCAG [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) applies if this is user-triggered; motion that is not essential must be suppressible.
- While the component does not create repeated flashes that inherently trip WCAG [2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html), the contrast pump can amplify existing bright content. Avoid using it on already flashing footage.
- If subtitles, captions, or body text live inside `targetSelector`, the shake actively harms readability. Target the card, panel, chart, or stat group instead.

Fallback recommendation: no translation; use a 80–120 ms emphasis state on the target (color, stroke, glow, or numeral weight change).

## Performance & failure modes

**Perf cost rank: low**, but the artistic failure risk is high.

- Runtime cost is just a few transform/filter tweens on one selector. The component itself adds almost no DOM.
- The real failure mode is targeting too much. If `targetSelector` resolves to the whole scene, captions, logos, and UI all move together and the shot can look amateur fast.
- `horizontal` is safer for wide dashboards; `vertical` is safer for bar or column hits. `both` is the most visceral and the easiest to overdo.
- On low-end or filter-heavy scenes, the contrast/saturation pump can cause a brief muddy frame. If that happens, keep the translation and drop the effect at authoring level by using a custom variant.
- Because trigger timing is clamped near scene end, late hits may happen earlier than authored. Always preview the actual rendered timing.

See `skills/core/animation/performance.md` for the general rule: transforms are cheap, but legibility is the real budget.

## Composition tips

- Best before: a clean hold or slow build that makes the jolt feel earned.
- Best after: immediate stability. A shake that does not resolve feels like camera error.
- Use **once per video**, twice maximum in long-form work.
- Keep color grading stable; the internal saturation/contrast pump is already part of the effect.
- If you need “power,” start with sound design and edit structure. Shake should reinforce impact, not manufacture it from nothing.
- For general motion hygiene, pair this guidance with `skills/core/animation/basics.md`.

## Authoring example

```json
{
  "id": "revenue-hit",
  "duration": 3.2,
  "component": "ShakeImpact",
  "props": {
    "triggerSec": 1.5,
    "intensity": "medium",
    "direction": "horizontal",
    "targetSelector": ".scene-hero-stat"
  }
}
```
