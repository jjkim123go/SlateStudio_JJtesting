# AssetCascade Component

> Layer 2 component skill. Use it when several images should arrive as a curated spread—fan, grid, or stack—rather than as unrelated cuts.

## Heritage / motion-design context

Contact sheets and edit boards taught audiences to read many images at once as a deliberate curation surface rather than as visual clutter; Peter Galassi's [*Proof: Photography in the Era of the Contact Sheet*](https://mitpressbookstore.mit.edu/book/9780300250077) frames the grid as both selection tool and storytelling artifact. Modern product and mood-board UX inherited that logic through card-based layouts, where grouped cards improve scanability because each card is a discrete chunk (see LogRocket's [card interface design guide](https://blog.logrocket.com/ux-design/ui-card-design/)). This component sits between those traditions: editorial spread, not slideshow.

## When to use

Triggers: `asset cascade`, `image fan`, `contact sheet reveal`, `mood board spread`, `photo stack`, `capability wall`, `dealt cards`, `gallery reveal`.

- Showing 3–6 related stills that belong to one narrative beat.
- Product stills, references, sample outputs, or customer examples where comparison matters more than sequence.
- Recap moments where the audience should absorb breadth quickly.
- Cases where a fan or stack metaphor adds tangibility: “here are the inputs,” “here are the examples,” “here is the body of evidence.”

## When NOT to use

- A single hero image; use a direct image layer instead.
- Scenes where each asset requires its own caption or close reading.
- More than 8 images; the implementation hard-caps there and starts to feel cramped earlier than that.
- Motion-heavy scenes underneath. This component wants a quiet background so the spread itself can be the event.

## Props

```json
{
  "images": [
    { "src": "assets/hero-01.jpg", "alt": "Workspace wide shot" },
    { "src": "assets/hero-02.jpg", "alt": "Close-up detail" }
  ],
  "layout": "fan",
  "cascadeDuration": 0.4,
  "holdDuration": 1.5,
  "exitOnComplete": true
}
```

| Prop | Type | Required | Default | Notes and gotchas |
|------|------|----------|---------|-------------------|
| `images` | array of `{src, alt}` | no | `[]` | Empty or unparsable input falls back to 5 built-in placeholders. Runtime slices to a hard max of `8` images. **Important:** `animation.js` calls `JSON.parse()` on `data-ac-images`; if the compiler does not stringify the array prop into valid JSON, the component silently falls back to placeholders. |
| `layout` | string enum | no | `"fan"` | `fan`, `grid`, `stack`. Invalid values are coerced to `fan`. |
| `cascadeDuration` | number | no | `0.4` | Schema minimum is `0.1`, but runtime floors it to `0.18` before scaling to available scene time. It is the per-card landing duration, not total cascade time. |
| `holdDuration` | number | no | `1.5` | Schema allows `0`, but runtime floors to `0.2` before time compression. Long holds are compressed automatically if the scene is short. |
| `exitOnComplete` | boolean | no | `true` | If true, cards scatter downward/outward in reverse stagger order over ~`0.34s`, scaled to fit the scene. |

## Scene timing

Recommended scene duration: **3.0–5.5 seconds** for `3–6` images. Reason: you need time for the staggered landings, then at least 0.8–1.2 seconds of stable read time once the arrangement is complete.

| Phase | Implementation timing | What the viewer perceives |
|------|------------------------|----------------------------|
| Card build | `SCENE_START + 0.02s` | Cards and placeholders are materialized and positioned. |
| Cascade in | starts at `SCENE_START + 0.1s` | Each card lands with `back.out(1.4)`; stagger step is `cascadeDuration × 0.62`. |
| Hold | after final landing | Viewer reads the spread as a set. |
| Exit scatter | optional | Reverse-order card loss keeps the spread feeling authored rather than simply faded out. |

At **30 fps**, common beat math is:

| BPM | 1 beat | 1/2 beat | Practical use here |
|-----|--------|----------|--------------------|
| 90  | 20 frames | 10 frames | Each card can land every beat or every half beat for slower editorial spreads. |
| 120 | 15 frames | 7.5 frames | The default `cascadeDuration: 0.4` is 12 frames; the stagger step is ~7.4 frames, close to a half beat. |
| 140 | 12.86 frames | 6.43 frames | Fast enough for teaser montages, but keep image count low. |

Because the step is `0.62 × cascadeDuration`, the default step is about **0.248s**, or **7.44 frames**—almost exactly a half beat at 120 BPM.

## Music sync

Sync the **card landings**, not the start of the off-screen travel.

- **120 BPM, 4-image fan:** keep `cascadeDuration: 0.4`; cards land roughly every 7.4 frames, so each arrival feels half-beat-tight.
- **90 BPM, slower portfolio spread:** raise `cascadeDuration` to `0.54`; the step becomes ~10 frames, a clean half beat.
- **140 BPM, 3-card teaser:** drop `cascadeDuration` to `0.32`; the step becomes ~6 frames, close to a half beat at 140 BPM.

If narration is active, let the final arrangement lock on the noun phrase that names the group (“examples,” “outputs,” “references”) rather than trying to voice each card.

## Accessibility & motion safety

This effect is **moderate motion risk**: cards travel in from above and from off-axis, but there is no flash loop and the movement settles into a static arrangement.

- For `prefers-reduced-motion`, replace the cascade with a simultaneous fade-up of the finished spread, or a simple grid appear with no off-screen travel. MDN's reduced-motion guidance favors dissolves over positional movement.
- If triggered interactively, WCAG [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) still applies; the spread is decorative unless it conveys essential sequencing.
- Keep image count reasonable. Dense, moving cards increase cognitive load even when the motion itself is not severe.
- Alt text inside `images[].alt` is not surfaced to screen readers in the rendered video experience; it is used here for placeholders and author clarity, not accessibility output. If the content matters semantically, the narration must say it.
- Avoid combining the cascade with camera movement or parallax beneath it.

Fallback recommendation: static contact-sheet grid or a single dissolve to the completed layout.

## Performance & failure modes

**Perf cost rank: low-medium.**

- DOM cost is modest: roughly `2 + (2 × imageCount)` nodes (root + stage + each card + each image/placeholder). At the hard max of `8`, that is about `18` nodes before wrapper overhead.
- The real visual constraint is space. `grid` becomes cramped after 6 assets on 16:9 frames; `fan` works best at 3–5; `stack` starts to feel arbitrary beyond 4 unless the art direction wants clutter.
- Runtime time-compresses the whole sequence to fit the scene. If you author long holds inside short scenes, the cascade may feel rushed because `desiredTotal` is scaled down.
- The **array-prop materialization issue is real**: `index.html` stores `images` in a `data-*` attribute, and `animation.js` only accepts valid JSON. If the SCF compiler emits anything like `[object Object]`, the component will show placeholders instead of real assets. Workaround: verify the compiled HTML contains a JSON string, or pre-serialize the prop if your authoring layer allows it.
- Missing `src` values are not fatal; they intentionally render placeholders labeled from `alt` or `Hero asset 0X`.

See `skills/core/animation/performance.md` for the general advice on keeping simultaneous motion readable.

## Composition tips

- Best before: a single-image or text-led setup that creates anticipation for “here are the examples.”
- Best after: either hold the spread for narration, or cut to one selected asset if the next beat goes deeper.
- Use **once or twice per video**; repeated spreads flatten the hierarchy of your edit.
- `fan` reads editorial and cinematic, `grid` reads systematic and comparative, `stack` reads tactile and informal. Choose the metaphor that matches the script.
- Keep card borders and shadows neutral; the images should carry the brand color, not the chrome.
- For timing and grouping fundamentals, pair this guidance with `skills/core/animation/basics.md` and `skills/core/animation/sequencing.md`.

## Authoring example

```json
{
  "id": "customer-proof-spread",
  "duration": 4.5,
  "component": "AssetCascade",
  "props": {
    "images": [
      { "src": "assets/proof-01.jpg", "alt": "Control dashboard" },
      { "src": "assets/proof-02.jpg", "alt": "Variance chart" },
      { "src": "assets/proof-03.jpg", "alt": "Review workflow" },
      { "src": "assets/proof-04.jpg", "alt": "Audit output" }
    ],
    "layout": "fan",
    "cascadeDuration": 0.4,
    "holdDuration": 1.2,
    "exitOnComplete": true
  }
}
```
