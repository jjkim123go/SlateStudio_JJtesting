# IrisZoom Component

> Layer 2 component skill. A circular mask closes onto a chosen focal point, holds for a beat, then opens the next scene from that same point.

## Heritage / motion-design context

The iris-in / iris-out is early film grammar, used in silent cinema to start scenes, end scenes, or isolate a detail before releasing the frame again ([BFI silent cinema introduction](https://www.bfi.org.uk/features/silent-cinema-introduction), [Columbia Film Language Glossary](https://filmglossary.ccnmtl.columbia.edu/term/iris-shot/)). Later cartoon end cards turned the same device into a sign-off joke, but its core function is still attention control: it tells the viewer exactly where the edit's meaning lives.

## When to use

**Trigger vocabulary:** `iris`, `iris in`, `iris out`, `close on`, `spotlight`, `focus on`, `zoom into`, `lens close`, `reveal from detail`.

Use `IrisZoom` when the edit needs to:
- Collapse attention onto one meaningful object, metric, or product detail.
- Move from a wide view to a precise detail (or vice versa) with explicit narrative focus.
- End one act with a punctuation mark, then reopen cleanly into the next act.
- Quote classic film language without committing to a full retro visual system.

## When NOT to use

Do **not** use it for:
- Generic chapter changes where no focal point matters.
- Scenes with multiple equally important subjects; the mask implies a single answer.
- Already-zooming camera moves; doubling the motion makes the edit feel pushy.
- Repeated use in short succession. The audience starts noticing the trick instead of the focus shift.

## Props

```json
{
  "focalPoint": "50% 50%",
  "outgoingSrc": "assets/wide-shot.png",
  "incomingSrc": "assets/detail-shot.png",
  "outgoingLabel": "Current focus",
  "incomingLabel": "Next focus",
  "subline": "The outgoing scene contracts into a precise focal point before the next image blooms open."
}
```

| Prop | Type | Required | Default | Notes / gotchas |
|------|------|----------|---------|-----------------|
| `focalPoint` | string | no | `50% 50%` | Passed straight into CSS `clip-path` as `circle(... at x y)`. No validation beyond whitespace split; off-canvas or malformed values can produce awkward masks. |
| `outgoingSrc` | string | no | `""` | Optional outgoing artwork. Empty string falls back to the dark editorial gradient in `animation.js`. |
| `incomingSrc` | string | no | `""` | Optional incoming artwork. Empty string falls back to the blue-violet reveal gradient. |
| `outgoingLabel` | string | no | `Current focus` | Populates only the outgoing kicker. The outgoing title is hard-coded to **"Iris closes"**. |
| `incomingLabel` | string | no | `Next focus` | Populates only the incoming kicker. The incoming title is hard-coded to **"Iris opens"**. |
| `subline` | string | no | `The outgoing scene contracts into a precise focal point before the next image blooms open.` | Shared supporting copy used on both states. Keep it short; there is only a brief hold between close and reopen. |

Implementation gotchas:
- The ring highlight is a fixed **140px** circle around the focal point; if the focal point sits too close to frame edges, the ring looks clipped.
- Titles are not prop-driven.
- There is no prop for hold duration; the beat is computed in `animation.js`.

## Scene timing

Recommended duration: **1.25-1.6s**.

Why that range:
- `animation.js` splits time into **close -> brief hold -> open**, with a hold capped at **0.15s** and close/open sharing the remainder almost evenly.
- Below ~1.2s, the open phase becomes too abrupt for the audience to register the new scene as an intentional reveal.
- Above ~1.6s, the iris starts feeling nostalgic or theatrical rather than efficient.

Typical phase split:
- **0-44%**: outgoing iris closes and softens.
- **44-56%**: closed beat / punctuation.
- **56-100%**: incoming iris opens and sharpens.

30fps beat math:
- **90 BPM** = 20 frames / beat. Good target: **40f (2 beats = 1.33s)**.
- **120 BPM** = 15 frames / beat. Good target: **45f (3 beats = 1.50s)**.
- **140 BPM** = 12.86 frames / beat. Good target: **51f (~4 beats = 1.70s)**, but that is already the long side for this effect; use sparingly.

For GSAP timing conventions and phrase placement, see [sequencing](../animation/sequencing.md) and [basics](../animation/basics.md).

## Music sync

The strongest sync pattern is **close on pickup, reopen on downbeat**.

Concrete `triggerSec` examples:
- **1.33s scene (40f)**: close begins **0.00**, closed beat **0.59**, reopen **0.74**, full open **1.33**.
- **1.50s scene (45f)**: close begins **0.00**, closed beat **0.68**, reopen **0.83**, full open **1.50**.

Narration guidance:
- Put the pivot word just before the iris fully closes.
- Put the new-topic noun on the first 100-200ms of the reopen, when the audience recognizes the new frame.

## Accessibility & motion safety

This is the most obviously vestibular of the three because it combines **full-frame scale change, shrinking / expanding mask, and focal-point emphasis**. WCAG 2.3.3 and MDN's `prefers-reduced-motion` guidance both support removing non-essential animation when users request reduced motion ([W3C](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).

Recommended fallback behavior:
- **Reduced-motion preview / export:** replace with a cut or a short dip-to-color centered on the same editorial beat.
- If the focus shift is essential, use a still highlight, callout, or crop cut rather than an animated iris.
- Keep focal points stable; do not animate the focal point itself.

## Performance & failure modes

Approximate DOM cost from `index.html`:
- **12 live elements** per instance.
- **1 pseudo-element** for the ring highlight.
- Two full-frame plates with animated `clip-path`, plus blur and slight scale changes.

Perf ranking: **medium**. It is lighter than `PrismRefract` and usually lighter than `PageTurn`, but full-frame `clip-path` animation is still not free. See [performance](../animation/performance.md) for transform / filter budgeting.

Common failure modes:
- **Arbitrary focal point:** if the mask closes on empty space, the effect reads as gimmick instead of grammar.
- **Edge focal point:** the ring and mask can feel clipped or asymmetrical when placed too close to borders.
- **Long copy:** there is no meaningful read hold; subtitles should support the beat, not carry new information.
- **Adjacent zooms:** pairing this with other scale-heavy moves compounds motion load.

## Composition tips

- Best use case: wide context -> detail reveal, or problem frame -> solution detail.
- Use **1-2 times per video** at most.
- Let the focal point be story-driven, not default-center by habit.
- Follow it with a calmer scene so the reveal has room to land.
- For brand work, rely on the artwork inside the mask for color identity; the component's built-in gradients are only fallbacks.

## Authoring example

```json
{
  "id": "focal-iris-bridge",
  "duration": 1.5,
  "component": "IrisZoom",
  "props": {
    "focalPoint": "62% 38%",
    "outgoingSrc": "assets/dashboard-wide.png",
    "incomingSrc": "assets/dashboard-detail.png",
    "outgoingLabel": "Problem",
    "incomingLabel": "Signal",
    "subline": "The frame closes on the noisy metric, then reopens on the one that matters."
  }
}
```
