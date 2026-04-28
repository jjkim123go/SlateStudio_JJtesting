# ParticleAssemble Component

> Layer 2 component skill. Use it when a mark, icon, or hero object should appear by converging from a particulate field, then hold long enough to read.

## Heritage / motion-design context

Particle-built logo reveals are a familiar motion-graphics trope because tools like [Trapcode Particular](https://www.maxon.net/en/product-detail/red-giant/particles-and-3d/trapcode-particular) made art-directable particle systems routine in After Effects, while Houdini kept the high-end version associated with hero VFX builds. That lineage matters: audiences read “particles forming a mark” as a premium, high-attention reveal, not as a neutral transition. This implementation is intentionally lighter than a Houdini sim: it lays out deterministic DOM particles on a centered plate, then resolves to the supplied image near the end of the move.

## When to use

Triggers: `particle assemble`, `logo from dust`, `mark materializes`, `wordmark forms`, `icon builds`, `brand reveal`, `hero lockup lands`.

- Opening or closing brand moments where the mark deserves the viewer's full attention.
- Product or capability reveals where “scattered parts becoming one thing” supports the script.
- Chapter-end lockups after a line that resolves tension: “all signals unify here,” “this is the control plane,” “everything lands in one view.”
- Dark or quiet frames where small bright particles can read cleanly before the final image appears.

## When NOT to use

- Mid-scene punctuation. The effect is too ceremonial for ordinary narration beats.
- Tiny logos or dense wordmarks; the particle field assembles into a rectangular grid before the final asset fades up, so intricate outlines are not traced by particles.
- Fast scenes under ~2 seconds; the viewer will register motion but not the resolved brand.
- Scenes that already contain other high-salience motion layers. This effect wants a clean stage.

## Props

```json
{
  "assembledImageSrc": "assets/brand/mark.png",
  "particleCount": 200,
  "particleColor": "#ffffff",
  "assemblyDuration": 1.5
}
```

| Prop | Type | Required | Default | Notes and gotchas |
|------|------|----------|---------|-------------------|
| `assembledImageSrc` | string | no | `""` | Transparent PNG/SVG for the resolved mark. If empty, the component hides the `<img>` and shows the built-in `SLATE` fallback plate. |
| `particleCount` | integer | no | `200` | Schema range is `24–360`; `animation.js` clamps to that range. Default DOM cost is ~206 nodes (`200` particles + wrapper/final/fallback). Max cost is ~366 nodes. |
| `particleColor` | string | no | `"#ffffff"` | Applied through `--pa-particle-color`. Bright colors read best because particles begin blurred and semi-glowing. |
| `assemblyDuration` | number | no | `1.5` | Schema range is `0.5–6`; runtime also compresses it to fit the scene: `min(max(value, 0.5), max(0.7, SCENE_DURATION - 0.35))`. Final image fade starts at `entranceStart + 0.62 × assemblyDuration`. |

## Scene timing

Recommended scene duration: **2.4–3.2 seconds**. Reason: the component spends roughly 0.12s entering, `assemblyDuration × 0.72` on the long converge, `assemblyDuration × 0.28` on the settle, then needs at least 0.6–0.9s of readable hold after the final asset appears.

| Phase | Implementation timing | What the viewer perceives |
|------|------------------------|----------------------------|
| Particle field appears | `SCENE_START + 0.03–0.12s` | The frame “wakes up” without a hard cut. |
| Scatter → curved converge | first `72%` of `assemblyDuration` | Energy resolves toward center; this is the prestige part of the move. |
| Settle to plate | final `28%` of `assemblyDuration` | Motion calms so the eye can prepare for the reveal. |
| Final image / fallback fade | starts at `0.62 × assemblyDuration` after entry | The actual logo read begins here. |
| Hold | remainder of scene | Gives the audience time to identify the mark. |

At **30 fps**, common music math is:

| BPM | 1 beat | 1/2 beat | 1/4 beat |
|-----|--------|----------|----------|
| 90  | 20 frames | 10 frames | 5 frames |
| 120 | 15 frames | 7.5 frames | 3.75 frames |
| 140 | 12.86 frames | 6.43 frames | 3.21 frames |

For this component, align the **final resolve**, not the first particle appearance, to the beat. With default timing, `finalStart ≈ 0.12 + (1.5 × 0.62) = 1.05s`, which is roughly 32 frames after scene start.

## Music sync

There is no `triggerSec` prop, so sync is done by **scene in-point** and `assemblyDuration`.

- **120 BPM example:** to land the resolved mark on beat 3 (1.0s after scene start), shorten `assemblyDuration` to about `1.4`; `finalStart ≈ 0.12 + 0.868 = 0.99s`.
- **90 BPM example:** if you want the resolve on beat 2 (0.667s), this component is the wrong tool unless the scene is almost entirely the reveal; use a simpler mark fade instead.
- **140 BPM example:** landing on beat 4 (1.286s) works well with the default `1.5` because the mark appears just before that hit and can settle into it.

Pair the resolve with an upward swell, shimmer, or restrained impact hit. If you need a literal on-beat punch after the logo appears, add **ShakeImpact** to the next scene rather than stacking it on top of the same moment. See `skills/core/animation/sequencing.md` for timeline placement discipline.

## Accessibility & motion safety

This effect is **moderate motion risk**: hundreds of particles travel across large screen distances, but there is no rapid flashing loop. Still, it should respect motion-sensitive viewers.

- For `prefers-reduced-motion`, do **not** merely lower `particleCount`; replace the entire effect with a simple opacity/blur fade on the final image or a static title card. MDN's [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) guidance explicitly recommends substituting dissolve-style motion for scaling or sweeping moves.
- If this reveal is triggered by a user interaction in an interactive surface, WCAG [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) means the non-essential motion should be suppressible.
- Keep particle contrast controlled. Bright particles on a white background create low-information flicker even if they do not breach WCAG [2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html).
- Avoid combining this with zooms, pans, or parallax underneath; layered motion is harder on vestibular users than any single move.

Fallback recommendation: for reduced motion, swap to `TitleCard`, `BrandIntro`, or a static image layer with a 150–250 ms dissolve.

## Performance & failure modes

**Perf cost rank: medium-high** among Layer 2 components.

- DOM math is linear in `particleCount`: `particleCount + 6` nodes before any scene wrapper overhead. At the max `360`, that is `366` component nodes plus GSAP tweens on every particle.
- Default stagger is `min(0.0035, assemblyDuration / 260)`. At `200` particles, the stagger spread is about `0.70s`; at `360`, it grows to about `1.26s`, so dense counts make the reveal feel slower even before the nominal duration changes.
- Because particles assemble into a centered grid, not into alpha-sampled logo contours, fine-outline assets can feel like “dust to rectangle, then logo fade.” Use bold silhouettes and let the final image do the detail work.
- On low-contrast assets, the fallback plate may read better than the supplied transparent image. Test both.
- Long marks can feel cramped because the assembly box is capped at `min(60vw, 960px) × min(34vh, 360px)`.

See `skills/core/animation/performance.md` for the transform/opacity guidance this component already follows.

## Composition tips

- Best preceding scene: a quiet build-up, dark negative space, or narrated setup that creates anticipation.
- Best following scene: either a clean hold with voice-over, or a hard cut into a calmer explanatory scene. Do not cut immediately after the resolve unless the logo is purely transitional.
- Use it **once per video**, twice only in long-form brand films where the first use is a product glyph and the second is the final corporate mark.
- Keep `particleColor` on-brand but not overly saturated. White, warm white, or a single brand accent is safer than multicolor particles because the final asset already carries brand detail.
- If you need true topology-following particulate formation, author a bespoke component or rendered clip instead of overpromising with this one. See `skills/core/animation/basics.md` for clarity-over-flair discipline.

## Authoring example

```json
{
  "id": "brand-mark-resolve",
  "duration": 2.8,
  "component": "ParticleAssemble",
  "props": {
    "assembledImageSrc": "assets/brand/contoso-mark.png",
    "particleCount": 180,
    "particleColor": "#F5F7FA",
    "assemblyDuration": 1.4
  }
}
```
