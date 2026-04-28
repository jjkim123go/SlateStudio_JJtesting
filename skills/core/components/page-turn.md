# PageTurn Component

> Layer 2 component skill. A 3D page hinge that turns one scene like paper, then reveals the next scene on the reverse side.

## Heritage / motion-design context

The component sits in the skeuomorphic book / magazine tradition: the turn itself carries meaning, not just state change. That metaphor worked in early digital reading because it borrowed a familiar physical model; Nielsen Norman Group notes skeuomorphism helps when it teaches interaction, but becomes wasteful when speed matters ([NNGroup](https://www.nngroup.com/articles/skeuomorphism/)). Treat `PageTurn` as deliberate chapter punctuation, not as default navigation chrome.

## When to use

**Trigger vocabulary:** `page turn`, `page flip`, `turning the page`, `next chapter`, `storybook bridge`, `editorial transition`, `lesson 2`, `chapter 3`, `from problem to solution`.

Use `PageTurn` when the script is doing one of these things:
- Moving between named acts, lessons, or chapters.
- Reframing a topic from context to next-step guidance.
- Signaling an authored, tactile pause between two otherwise dense scenes.
- Bridging documentary, editorial, training, or narrative explainer sections where a paper metaphor fits the voice.

## When NOT to use

Do **not** use it for:
- Fast montage sequences where the metaphor slows tempo more than it clarifies structure.
- Back-to-back transitions; repeated 3D page hinges read precious, not purposeful.
- Scenes with critical on-screen reading during the turn; the component is a bridge, not a reading surface.
- Brand systems that reject tactile / paper metaphors in favor of flat or utilitarian UI language.

## Props

```json
{
  "direction": "left-to-right",
  "outgoingSrc": "assets/act-1-cover.png",
  "incomingSrc": "assets/act-2-cover.png",
  "frontLabel": "Previous act",
  "backLabel": "Next act",
  "frontSubtitle": "A tactile bridge that folds the outgoing moment into the next chapter.",
  "backSubtitle": "The incoming scene arrives on the reverse side, already waiting behind the sheet.",
  "paperTint": "#f5f1e8",
  "accentColor": "#0078D4"
}
```

| Prop | Type | Required | Default | Notes / gotchas |
|------|------|----------|---------|-----------------|
| `direction` | string (`left-to-right` \| `right-to-left`) | no | `left-to-right` | Controls hinge side, sweep direction, glow direction, and final `rotationY` sign. Keep direction consistent across a video unless you want mirrored chapter language. |
| `outgoingSrc` | string | no | `""` | Optional outgoing artwork. Empty string falls back to the dark editorial gradient in `animation.js`. Use artwork with safe crop margins because the page face is full-bleed. |
| `incomingSrc` | string | no | `""` | Optional incoming artwork. Empty string falls back to the blue-violet reveal gradient used on both the page back and underlay. |
| `frontLabel` | string | no | `Previous act` | Populates the outgoing kicker only. The front title is hard-coded to **"Turning the page"** in `animation.js`; changing `frontLabel` does not change the title line. |
| `backLabel` | string | no | `Next act` | Populates the revealed kicker(s) only. The back titles are hard-coded to **"Opening reveal"** on both back states. |
| `frontSubtitle` | string | no | `A tactile bridge that folds the outgoing moment into the next chapter.` | Supporting copy on the outgoing face. Keep it short; the page rotates away before viewers can read dense prose. |
| `backSubtitle` | string | no | `The incoming scene arrives on the reverse side, already waiting behind the sheet.` | Supporting copy on the revealed face and backdrop. This is the only long-form copy viewers may partially register during settle. |
| `paperTint` | string | no | `#f5f1e8` | Applied to `--pt-paper`, the base sheet color under artwork and texture. Warm neutrals read as paper; saturated colors make the metaphor less legible. |
| `accentColor` | string | no | `#0078D4` | Applied to `--pt-accent`, but only visible in the small dot inside `.pt-backdrop-copy::before`. It is a subtle accent, not a full palette override. |

## Scene timing

Recommended duration: **1.6-2.1s**.

Why that range:
- `animation.js` enforces a **minimum 0.9s turn** (`turnDur`) plus a **minimum 0.16s settle** (`settleDur`). Anything near or below **1.06s** compresses the move into its hard floors and risks timeline overlap.
- The component contains copy on both sides, but the audience only has time to register the metaphor plus one short label / subtitle fragment; anything longer than ~2.1s turns the page into a pause rather than a bridge.

Suggested phase split (mirrors the GSAP structure):
- **0-8%**: establish hinge, sweep, and cast shadow.
- **8-82%**: main page rotation (`rotationY`), shadow growth, outgoing copy dim.
- **82-100%**: revealed side sharpens, glow settles, underlay reaches full clarity.

30fps beat math for music sync:
- **90 BPM** = 20 frames / beat. Sweet spots: **50f (2.5 beats = 1.67s)** or **60f (3 beats = 2.00s)**.
- **120 BPM** = 15 frames / beat. Sweet spots: **45f (3 beats = 1.50s)** or **60f (4 beats = 2.00s)**.
- **140 BPM** = 12.86 frames / beat. Sweet spots: **51f (~4 beats = 1.70s)** or **64f (~5 beats = 2.13s)**.

For beat-placement conventions, see [sequencing](../animation/sequencing.md).

## Music sync

This effect wants **three cues**, not a continuous drum roll:
- a soft onset when the sheet starts moving,
- a midpoint accent as the page crosses roughly 90 degrees,
- a resolve or downbeat as the revealed side finishes sharpening.

Concrete `triggerSec` examples:
- **1.67s scene (50f)**: onset **0.00**, hinge midpoint **0.68**, resolve **1.37**.
- **2.00s scene (60f)**: onset **0.00**, hinge midpoint **0.82**, resolve **1.64**.
- If narration says "next", "then", or "turning to", start that word at **0.00-0.08s**; land the new-topic noun near the midpoint accent, not after settle.

## Accessibility & motion safety

The risk here is not flash; it is **3D perspective rotation plus large-field motion**. W3C's understanding note for WCAG 2.3.3 says motion triggered by interaction should be disable-able unless essential, and MDN recommends honoring `prefers-reduced-motion` with reduced or removed non-essential animation ([W3C](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)). Apple makes the same point in its motion guidance: keep motion meaningful and respect Reduce Motion settings ([Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).

Recommended fallback behavior:
- **Interactive preview / web player:** replace with `TransitionWipe` or a fast crossfade plus static chapter card when reduced motion is requested.
- **Exported accessible cut:** use a chapter card or straight cut; do not try to preserve the full `rotateY` metaphor at reduced amplitude.
- Avoid stacking `PageTurn` immediately after another depth-heavy move.

## Performance & failure modes

Approximate DOM cost from `index.html`:
- **28 live elements** per instance.
- **3 pseudo-elements** contributing texture / highlights (`.pt-backdrop::before` plus two `.pt-face::before`).
- **3 full-frame image plates** (`front`, `back`, `backdrop`) plus animated blur, drop-shadow, and `rotationY`.

Perf ranking: **medium-high** among Layer 2 transitions. The expensive parts are the 3D transform, blur/filter changes, and the large sheet shadow. See [performance](../animation/performance.md) for the transform-first budget rules that this component mostly follows.

Common failure modes:
- **Too short:** the hard minimums make the transition feel rushed and the revealed side never settles.
- **Long subtitles:** the copy is technically rendered, but viewers cannot read both sides before motion takes precedence.
- **Weak artwork crop:** because all media are `background-size: cover`, edge-critical details can disappear at the hinge.
- **Direction flipping between chapters:** looks accidental unless the edit language explicitly alternates.
- **Expecting `accentColor` to theme the whole component:** it only affects a small badge dot.

## Composition tips

- Best before/after pairing: a static or slower scene before the turn, then a clear new composition after it. Give the audience a structural reason for the page.
- Use **1-3 times per video**; beyond that, the book metaphor starts to dominate the editorial voice.
- Pair well with documentary cards, lesson headers, or chapter bumpers; pair poorly with glitch, RGB split, or continuous camera-move scenes.
- Keep `paperTint` near off-white, parchment, or muted stock values; dark paper undercuts the physical cue.
- Because titles are hard-coded, let the **labels** carry topic naming and keep them parallel (`Problem` / `Solution`, `Act I` / `Act II`).

## Authoring example

```json
{
  "id": "chapter-page-turn",
  "duration": 1.67,
  "component": "PageTurn",
  "props": {
    "direction": "left-to-right",
    "outgoingSrc": "assets/act-1-cover.png",
    "incomingSrc": "assets/act-2-cover.png",
    "frontLabel": "Act I",
    "backLabel": "Act II",
    "frontSubtitle": "From problem framing...",
    "backSubtitle": "...to the product reveal.",
    "paperTint": "#f5f1e8",
    "accentColor": "#185ABD"
  }
}
```
