# OrbitReveal Component

> Full-screen bridge transition. A luminous comet spirals outward along a
> logarithmic path, trailing brand-colored particles, while a radial
> clip-path mask reveals the incoming scene in sync with the spiral radius.

## Heritage / motion-design context

The orbital reveal descends from the "camera orbit" convention used in
film title sequences (*Westworld*, *Game of Thrones* map flyover, *Iron
Man* HUD) where circling a subject implies holistic inspection or system
overview. The logarithmic spiral (r = ae^bθ) — the same curve found in
galaxies and nautilus shells — adds organic growth to the mechanical
orbit, making the reveal feel both precise and expansive.
<!-- Ref: Framestore title-sequence breakdowns; logarithmic spiral in
     natural motion — D'Arcy Thompson, "On Growth and Form" (1917). -->

## When to use

- **Act breaks / chapter transitions** where outgoing content should
  dissolve into incoming content with kinetic energy.
- **System overview** or "zooming out" beats — the spiral visually says
  "here's the big picture."
- **Premium / cinematic** brand moments (product launch, keynote opener).
- Script triggers: "let's step back", "the full picture", "overview",
  "from the ground up", aspirational opener, cosmic/tech theme.

## When NOT to use

- Calm, conversational, or documentary-realism beats — the spiral is
  too kinetic.
- Back-to-back with another high-motion bridge (FilmstripFlip,
  TransitionWipe) — overloads the viewer's attention budget.
- Videos targeting audiences with high vestibular sensitivity — see
  §Accessibility below.
- More than **2× per video**. Once at an act break, once at a finale.

## Props

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `direction` | `"clockwise"` \| `"counterclockwise"` | no | `"clockwise"` | Spiral rotation direction. Counterclockwise can feel "unwinding." |
| `color` | CSS color string | no | `"#0078D4"` | Comet + trail particle color. Falls back to `--brand-primary` if empty in animation.js. Use brand primary. |
| `trailCount` | number (1–40) | no | `18` | Trailing particles. Capped at 40 in animation.js (perf guard). More particles = denser trail but more DOM nodes. |
| `spiralTurns` | number (0.5–5) | no | `2.5` | Full revolutions. Clamped ≥ 0.5 in JS. Higher = tighter early loops, wider finish. |

**Gotcha:** `trailCount` creates N DOM elements at runtime (one `div.or-particle`
per particle). At 40 particles + 60 waypoints per particle the timeline has
~2 400 tween segments — still smooth, but don't combine with heavy overlay
scenes. See [performance.md](../animation/performance.md) §stagger-count.

## Scene timing

**Recommended duration: 2.5–4 s.** The animation scales to `SCENE_DURATION`
via proportional phase splits (85 % spiral, 12 % final reveal, exit fade
at dur − 0.5 s).

| Phase | % of dur | At 3 s | Purpose |
|-------|----------|--------|---------|
| Comet ignition | 0–0.15 s | 0–0.15 s | Scale 0.3→1, autoAlpha 0→1 |
| Spiral + trail + mask | 0 %–85 % | 0–2.55 s | Comet traverses 60 waypoints; mask circle() grows |
| Final reveal burst | 85 %–97 % | 2.55–2.91 s | clip-path snaps to 100 % |
| Exit fade | dur − 0.5 s | 2.50 s | Root autoAlpha → 0 over 0.2 s |

Below 1.8 s the spiral is too compressed to read; above 5 s it drags.
At 3 s with 2.5 turns, each full revolution takes ~1 s — comfortable
pace for the eye to track.

### Music-sync frames (30 fps)

| Tempo | Beat interval | Suggested dur | Spiral lands on beat… |
|-------|--------------|---------------|----------------------|
| 90 BPM | 0.667 s | 2.67 s (4 beats) | Beat 4 = final reveal |
| 120 BPM | 0.500 s | 3.0 s (6 beats) | Beat 5 = reveal, beat 6 = fade |
| 140 BPM | 0.429 s | 2.57 s (6 beats) | Beat 5 = reveal |

## Music sync

Align `triggerSec` so the scene starts on a downbeat. The comet ignition
(first 0.15 s) works as a pickup — place the scene start 1 beat before
the target downbeat so the spiral "arrives" on beat 4–6.

```jsonc
// Example: scene starts at 12.0 s, 120 BPM track
{ "id": "act-break", "duration": 3, "triggerSec": 12.0,
  "component": "OrbitReveal", "props": { "spiralTurns": 2.5 } }
// Final reveal burst lands at ~14.55 s ≈ beat 6 of the phrase.
```

## Accessibility & motion safety

**Vestibular risk: moderate–high.** Continuous rotational motion is a
known vestibular trigger (WCAG 2.3.3, Level AAA). The spiral spans 2.5
full revolutions at default — enough to induce discomfort in sensitive
users.
<!-- Ref: W3C Understanding 2.3.3 — https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
     MDN prefers-reduced-motion — https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion -->

**`prefers-reduced-motion` fallback:** Replace the spiral with an
instant radial wipe (clip-path circle 0 %→100 % over 0.4 s, no comet,
no particles). The SCF author should pair this component with a
`reducedMotionFallback: "crossfade"` note in the scene plan so the
reviewer knows the intent.

**Recommendation:** Limit to 1–2 uses per video. Never loop.

## Performance & failure modes

- **DOM nodes:** 3 static + `trailCount` particles = **21 at default**.
  Each particle gets ~60 positional tweens → ~1 080 total segments on the
  master timeline. Well within GSAP's comfort zone but heavy if layered
  with another particle-heavy component.
- **GPU load:** `clip-path: circle()` on `.or-reveal` is composited;
  `will-change: clip-path` is set. Particle `will-change: transform,
  opacity` promotes each to its own layer — at 40 particles that's 40
  compositor layers. Keep `trailCount` ≤ 25 on lower-end targets.
- **Visual break:** If `spiralTurns` > 4 and duration < 2 s, the comet
  whips too fast and the trail clumps. The mask also can't keep up with
  rapid radius growth, leaving a visible un-revealed ring.
- **Perf cost ranking:** medium (particle DOM + many tween segments).

## Composition tips

- **Before:** a content scene (explainer, TitleCard, or TerminalCast).
- **After:** a new content scene that the mask "reveals."
- Pair with an ascending synth swell or whoosh SFX timed to the spiral.
- Match `color` to brand primary; on dark backgrounds the glow
  (box-shadow 16 px) reads strongest in saturated hues.
- Counterclockwise feels like "unwinding" — use it for retrospective
  beats ("let's rewind").

## Authoring example

```json
{
  "id": "act-break-1",
  "duration": 3,
  "component": "OrbitReveal",
  "props": {
    "direction": "clockwise",
    "color": "#0078D4",
    "trailCount": 18,
    "spiralTurns": 2.5
  },
  "transition": "crossfade"
}
```
