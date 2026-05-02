# PremiumMotionShowcase Component

> Layer 2 component skill. Use it for a high-energy motion design reel, capability showcase, or animated proof-of-motion sequence where the point is the quality of Slate's visual physics.

## When To Use

Triggers: `premium motion`, `motion showcase`, `physics animation`, `showcase reel`, `kinetic demo`, `hero motion`, `visual physics`, `animation quality`, `every frame breathes`.

- Opening or bridge scenes that need to signal high craft, cinematic motion, or generative animation range.
- Marketing trailers, demo reels, launch teasers, and capability tours where movement itself is the payload.
- Abstract scene beats that can be expressive without requiring exact data, UI, or code fidelity.

## When Not To Use

- Scenes that must communicate precise numbers, workflow steps, legal text, code, or UI state. Use a deterministic component instead.
- Quiet trust-building moments where energetic motion would distract from credibility.
- Long explanatory sections. This component is a visual hit, not a full lesson surface.

## Props

```json
{
  "mode": "hero",
  "title": "Premium Motion",
  "subtitle": "Every frame breathes with material-aware physics."
}
```

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `mode` | string | no | `hero` | Visual treatment. Supported modes: `hero`, `ascii`, `vortex`, `spectrum`, `pulse`, `liquid`, `shapes`, `zoom`, `glitch`, `orbits`, `hologram`, `gallery`, `reel`, `chart`, `outro`. |
| `title` | string | no | component default | Large headline rendered in the lower-left copy block. Keep it short. |
| `subtitle` | string | no | component default | Supporting line under the headline. Keep to one sentence. |

## Direction Notes

- Pick `mode` based on the scene job: `hero` or `outro` for brand identity, `ascii` for developer energy, `liquid` for smooth transitions, `chart` or `pulse` for abstract impact, `zoom` for acceleration, and `gallery` or `reel` for a montage feeling.
- Pair with short scene durations, typically **3-6 seconds**. The animation is dense; longer holds can feel like decoration.
- Use this component sparingly, usually **1-3 times per video**, to avoid competing with content scenes.
- If narration needs exact timing, keep the copy simple and let the component act as the visual accent behind the line.

## Accessibility And Review

- `glitch`, `zoom`, `vortex`, and `spectrum` modes are visually intense. Avoid stacking them back-to-back and review for flashing or excessive motion.
- Keep title and subtitle high-contrast against the background. Do not place captions over the lower-left copy block unless the scene uses alternate caption placement.
- For reduced-motion treatments, prefer `hero`, `liquid`, or `pulse` with shorter movement and longer holds.

## Authoring Example

```json
{
  "id": "motion-showcase",
  "duration": 4,
  "component": "PremiumMotionShowcase",
  "props": {
    "mode": "liquid",
    "title": "Material Motion",
    "subtitle": "Glass, liquid, and light respond with authored intent."
  }
}
```