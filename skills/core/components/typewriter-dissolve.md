# TypewriterDissolve Component

> Full-screen bridge transition. A monospace character grid dissolves
> outgoing "text" left-to-right with a blinking cursor, then retypes
> incoming characters with a configurable offset between the delete and
> retype waves. Evokes a retro terminal / hacker-film aesthetic.

## Heritage / motion-design context

The character-by-character typing reveal is a cinema staple from
newsreel-era title cards through to *WarGames* (1983), *The Matrix*
(1999), and HBO's *Westworld* (2016), where in-world computer diagnostics
use typewriter animation to signal "the machine is thinking." The
phosphor-decay glow of CRT terminals — where characters linger briefly
after the beam moves on — informs the staggered autoAlpha fade in the
delete wave. The blinking cursor is pure terminal skeuomorphism: it says
"you're inside the system" without narrative exposition.
<!-- Ref: CRT phosphor persistence in motion design;
     Westworld UI design — Elastic (title design studio). -->

## When to use

- **Developer / technical content** — bridge into or out of
  TerminalCast, VSCodeScene, or code-heavy scenes.
- **"System reboot" metaphor** — clearing old data, typing new context.
- **Tech-documentary** or cybersecurity narrative beats.
- Script triggers: "under the hood", "behind the scenes", "let's look
  at the code", "the system processes", "data pipeline", "rebooting."

## When NOT to use

- Executive / brand-forward videos — the monospace grid reads as
  "developer tool", not "premium brand."
- Image-heavy hero scenes — the character grid obscures visual content
  by design; the scene is pure texture, not imagery.
- Immediately after another TypewriterDissolve — the delete/retype
  rhythm becomes monotonous. Once or twice per video maximum.

## Props

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `color` | CSS color string | no | `"#0078D4"` | Character fill color. Falls back to `--brand-primary` in animation.js. Green (`#00ff88`) for classic terminal feel; brand primary for corporate. |
| `cursorColor` | CSS color string | no | `"#ffffff"` | Blinking cursor bar color. White default contrasts on the `#0a0a0a` background. |
| `cols` | number (10–80) | no | `40` | Grid columns. Capped at 80 in animation.js. 40 cols ≈ classic 80-col half-width at 1920 px. |
| `rows` | number (5–40) | no | `22` | Grid rows. Capped at 40. 22 rows ≈ VT100 terminal height. |
| `deleteOffset` | number (0–1000) | no | `200` | Milliseconds between delete-wave start and retype-wave start. 0 = simultaneous (chaotic); 200 = readable overlap; 600+ = sequential with a visible gap. |

**Gotcha — cell count:** Total DOM = `cols × rows`. At defaults that is
40 × 22 = **880 cells**, each a `div.td-cell` with its own staggered
tween. At 80 × 40 = 3 200 cells the timeline has ~9 600 tween segments.
Perf is acceptable but test on target hardware at high grid densities.
See [performance.md](../animation/performance.md) §stagger-count.

## Scene timing

**Recommended duration: 3–4 s.** The animation uses proportional phases:

| Phase | % of dur | At 3.5 s | Purpose |
|-------|----------|----------|---------|
| Character reveal (stagger) | 30 % | 1.05 s | Outgoing chars fade in left→right, top→bottom |
| Cursor appears | 15 % into phase 1 | 0.525 s | Cursor autoAlpha → 1 |
| Delete wave | 28 % | 0.98 s | Chars fade out with stagger; cursor follows wavefront + blinks |
| Retype wave (overlaps) | 28 % | 0.98 s | New chars fade in, offset by `deleteOffset` ms from delete start |
| Exit fade | dur − 0.5 s | 3.0 s | Root autoAlpha → 0 over 0.2 s |

Below 2.0 s the delete/retype rhythm is too compressed — the cursor
blur-blinks and the two waves merge into noise. Above 5 s each
character-stagger is individually perceptible and the effect feels
sluggish. 3–4 s is the sweet spot where the waves are distinct but
brisk.

### Music-sync frames (30 fps)

| Tempo | Beat interval | Suggested dur | Delete wave starts on beat… |
|-------|--------------|---------------|----------------------------|
| 90 BPM | 0.667 s | 3.33 s (5 beats) | Beat 2 (≈ 30 % of dur) |
| 120 BPM | 0.500 s | 3.5 s (7 beats) | Beat 3 |
| 140 BPM | 0.429 s | 3.0 s (7 beats) | Beat 3 |

## Music sync

The rhythmic anchor is the **delete-wave start** — the moment characters
begin dissolving. Sync a subtle keystroke burst, lo-fi click, or
downbeat to that instant. The retype wave follows by `deleteOffset` ms.

```jsonc
// 120 BPM track, scene at 20.0 s
{ "id": "terminal-bridge", "duration": 3.5, "triggerSec": 20.0,
  "component": "TypewriterDissolve",
  "props": { "color": "#00ff88", "deleteOffset": 200 } }
// Delete wave starts at 20.0 + 1.05 = 21.05 s ≈ beat 3.
// Retype wave starts at 21.25 s (200 ms later).
```

## Accessibility & motion safety

**Vestibular risk: low.** No rotation or parallax — sequential opacity
stagger reads as a dissolve. Safest of the three new bridge components.
Cursor blinks at ~6.7 Hz (autoAlpha every 0.15 s) which exceeds the
3-flash/s threshold (WCAG 2.3.1), but the 3 px bar is well below the
10 % visual-field size exemption. For maximum compliance, reduced-motion
fallback should use a solid cursor.
<!-- Ref: WCAG 2.3.1 small-area exemption; MDN prefers-reduced-motion. -->

**`prefers-reduced-motion` fallback:** Single 0.3 s crossfade (all cells
fade together, no cursor animation). Preserves monospace texture.

## Performance & failure modes

- **DOM nodes:** `cols × rows` + 2 (grid container + cursor) = **882 at
  default**. Each cell gets 2–3 tween segments (reveal + delete +
  retype) = ~2 640 segments. GSAP handles this, but avoid layering
  another high-stagger component in the same scene.
- **GPU load:** `will-change: opacity` on each cell; no transforms.
  Moderate — no compositor-layer explosion.
- **Visual break:** `cols` > 60 + duration < 2.5 s collapses stagger
  below 1 frame at 30 fps — wave becomes an instant flash.
- **Deterministic chars** — no `Math.random()`. Safe for re-renders.
- **Perf cost ranking:** medium–high (high DOM count, many stagger
  tweens).

## Composition tips

- **Before:** TerminalCast, VSCodeScene, or any code/data scene — the
  character grid echoes the preceding scene's texture.
- **After:** a visually distinct scene (image, diagram, TitleCard) so
  the "retype" wave clearly signals a context switch.
- Classic terminal green: `"color": "#00ff88"`. Amber CRT: `"#ffb000"`.
  Brand-safe: use brand primary.
- Pair with keyboard SFX or lo-fi data-stream hum for skeuomorphic
  immersion. **Max 2× per video.**

## Authoring example

```json
{
  "id": "terminal-bridge",
  "duration": 3.5,
  "component": "TypewriterDissolve",
  "props": {
    "color": "#00ff88",
    "cursorColor": "#ffffff",
    "cols": 40,
    "rows": 22,
    "deleteOffset": 200
  },
  "transition": "crossfade"
}
```
