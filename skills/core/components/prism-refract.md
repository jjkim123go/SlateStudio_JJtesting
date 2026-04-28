# PrismRefract Component

> Layer 2 component skill. Eight angled spectrum bands sweep across the frame, then collapse into a unified incoming scene.

## Heritage / motion-design context

The look borrows from a real optical artifact: chromatic aberration happens when different wavelengths fail to converge at the same focal plane, producing color fringing ([Britannica](https://www.britannica.com/science/chromatic-aberration)). Motion graphics turns that physics mistake into a deliberate transition language: RGB separation implies energy, interference, or transformation. In Slate, `PrismRefract` is best treated as a hero bridge, not a neutral default.

## When to use

**Trigger vocabulary:** `prism`, `refraction`, `RGB split`, `chromatic`, `spectrum`, `resolve`, `light split`, `energy bridge`, `reveal through color`.

Use `PrismRefract` when the script is:
- Pivoting into a launch reveal, product hero shot, or abstract "transformation" beat.
- Moving from dark / unresolved context into a clearer branded state.
- Supporting AI, creativity, optics, imaging, or innovation themes where light-splitting reads as conceptually aligned.
- Carrying a musical hit where color movement can do the transition work faster than copy.

## When NOT to use

Avoid it when:
- The next scene contains small text, code, or data that needs immediate readability.
- The brand palette is tightly controlled and a hard-coded rainbow would feel off-system.
- The audience is already under heavy visual load; this effect adds color complexity, not clarity.
- You need a subtle bridge. `PrismRefract` announces itself.

## Props

```json
{
  "outgoingSrc": "assets/before.png",
  "incomingSrc": "assets/after.png",
  "headline": "Spectrum resolves",
  "subline": "Color bands sweep through frame, then collapse into a single unified scene."
}
```

| Prop | Type | Required | Default | Notes / gotchas |
|------|------|----------|---------|-----------------|
| `outgoingSrc` | string | no | `""` | Optional outgoing artwork. Empty string uses the dark editorial fallback plate. The outgoing image quickly fades under the prism bands, so detail-heavy art adds little value. |
| `incomingSrc` | string | no | `""` | Optional incoming artwork. Empty string uses the blue-cyan-magenta gradient fallback. The same source is also sliced into every band, so a single busy image can become visually noisy eight times over. |
| `headline` | string | no | `Spectrum resolves` | Main title in the lower-left copy block. Keep it short; the copy enters quickly and competes with the spectrum sweep. |
| `subline` | string | no | `Color bands sweep through frame, then collapse into a single unified scene.` | Supporting copy below the headline. Practical ceiling: one short sentence. There is no prop to remove the kicker or change the copy region width. |

Implementation gotchas from `animation.js` / `index.html`:
- Band count is fixed at **8**.
- Band colors are fixed from red to magenta; there is **no prop** for palette override.
- Band angle is fixed by `.pr-bands { transform: rotate(-24deg) }`.
- Copy kicker is hard-coded to **"Prism transition"**.

## Scene timing

Recommended duration: **1.5-1.9s** for a hero bridge, or **1.3-1.5s** if you are using it as a mostly visual handoff with minimal copy.

Why:
- `animation.js` devotes **54%** of total duration to band entry, **12%** to a hold, and the remainder to resolve.
- The eight bands are staggered up to **0.08s** apart, so very short scenes force the last bands to arrive after the move already feels over.
- The copy block enters at roughly **8%** of scene time. If you give it less than ~1.5s, viewers register the headline as texture rather than readable language.

Suggested phase split:
- **0-54%**: bands enter, outgoing fades, flare rises.
- **54-66%**: color field holds briefly.
- **66-100%**: bands resolve rightward and incoming image sharpens.

30fps beat math:
- **90 BPM** = 20 frames / beat. Good targets: **50f (2.5 beats = 1.67s)** or **60f (3 beats = 2.00s)**.
- **120 BPM** = 15 frames / beat. Good targets: **45f (3 beats = 1.50s)** or **54f (3.6 beats = 1.80s)**.
- **140 BPM** = 12.86 frames / beat. Good targets: **51f (~4 beats = 1.70s)** or **58f (~4.5 beats = 1.93s)**.

For timeline placement and label strategy, see [sequencing](../animation/sequencing.md).

## Music sync

Think of the move as **sweep -> shimmer hold -> resolve**, not as one long whoosh.

Concrete `triggerSec` examples:
- **1.67s scene**: copy arrival **0.13**, outgoing mostly gone **0.57**, resolve start **1.10**, full incoming clarity **1.67**.
- **1.80s scene**: copy arrival **0.14**, outgoing mostly gone **0.61**, resolve start **1.19**, full clarity **1.80**.

Practical sync guidance:
- Put the **first transient** on scene start or within the first 2-4 frames.
- Put a lighter shimmer or riser accent at the end of entry (~54% mark).
- Land the **main downbeat** on resolve start, not after the bands fully leave; that is the perceptual moment when the next scene becomes legible.

## Accessibility & motion safety

This effect is less vestibular than a full-frame zoom, but it can still be stressful because it combines **multi-band lateral motion, blur, saturation, and color separation**. W3C's WCAG 2.3.3 guidance and MDN's `prefers-reduced-motion` documentation both support replacing non-essential motion with a simpler alternative when users request reduced motion ([W3C](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).

Recommended fallback behavior:
- Replace with a short crossfade or `TransitionWipe` for reduced-motion previews / accessible variants.
- If the spectrum metaphor is semantically important, keep the color cue but remove moving bands: use a static gradient card and a cut.
- Avoid pairing with other chromatic or glitch treatments in adjacent scenes; cumulative color stress is the real failure mode.

## Performance & failure modes

Approximate DOM cost from `index.html`:
- **33 live elements** per instance.
- **8 simultaneously animated bands**, each with a slice and tint child.
- Full-frame outgoing, incoming, and flare layers underneath.

Perf ranking: **high** among Layer 2 transitions. The cost comes from clip-path polygons, eight staggered transforms, blur changes, and full-frame compositing. The component follows the transform-first advice in [performance](../animation/performance.md), but the sheer number of moving layers still makes it heavier than `IrisZoom` or `TransitionWipe`.

Common failure modes:
- **Small typography behind bands:** the sliced incoming image becomes unreadable until late resolve.
- **Overuse:** because the palette is fixed and saturated, repeated use cheapens the reveal.
- **Brand mismatch:** rainbow bands can clash with narrow brand systems or accessibility-safe palettes.
- **Low-contrast art:** the screen blend tint can wash subtle images into pastel mush.
- **Expecting palette control:** there is no prop for band count, color set, or angle.

## Composition tips

- Works best when entering a cleaner, calmer shot. Let the scene after `PrismRefract` breathe.
- Use **once per video** in most cases; twice is defensible only if one use is clearly secondary.
- Strongest pairing: dark setup scene -> luminous reveal. Weakest pairing: already-busy motion graphics -> more spectrum motion.
- Keep `headline` noun-led and short (`Platform live`, `Model trained`, `Now shipping`).
- Treat it as a hero accent, not as a default brand transition, unless the brand system explicitly embraces a full spectrum.

## Authoring example

```json
{
  "id": "launch-spectrum-bridge",
  "duration": 1.67,
  "component": "PrismRefract",
  "props": {
    "outgoingSrc": "assets/problem-state.png",
    "incomingSrc": "assets/reveal-state.png",
    "headline": "Platform live",
    "subline": "Eight spectrum bands sweep through frame, then resolve to the release shot."
  }
}
```
