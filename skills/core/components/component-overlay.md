# ComponentOverlay Component

Use `ComponentOverlay` when a scene needs a framed, brandable host for rich HTML or a prebuilt visual asset, especially when the underlying content should sit over a cinematic or branded background.

## When to use

- A component needs to be presented as an overlay with a transparent or glass-like frame.
- A scene combines an image/video background with an exact deterministic foreground.
- You need a quick composite while preserving the SCF layer path for future refinement.

## Props

`title`, `eyebrow`, `badge`, `backgroundSrc`, and raw `overlayHtml`.

Keep `overlayHtml` prebuilt and scoped. Do not use it to inject scripts.

## Timing

Recommended duration: 5-8 seconds. The host panel enters early, the slot follows, and the final 0.4 seconds are reserved for exit.