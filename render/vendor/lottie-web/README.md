# lottie-web (vendored)

**Package:** [`lottie-web`](https://github.com/airbnb/lottie-web) (Bodymovin)
**Version pinned:** `5.12.2`
**Build:** `lottie_svg.min.js` — **SVG-only** lightweight renderer (no canvas / no
HTML renderer modes). Slate composes everything to SVG to keep DOM mutation cost
predictable inside the GSAP master timeline driver.
**License:** MIT — see [`LICENSE`](./LICENSE).

## Source URL

```
https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie_svg.min.js
```

(Mirrors the official npm release artifact at
`node_modules/lottie-web/build/player/lottie_svg.min.js` for `lottie-web@5.12.2`.)

## Why vendored

Slate's render-gate (Standing Rule #3) is real: composed HTML must be
fully self-contained at compile time. Loading the lottie player from a CDN at
runtime would (a) fail under hermetic Chrome captures with networking disabled
and (b) violate the determinism contract the SCF compiler establishes for
animation playback. The vendored copy is referenced via a relative `<script
src="render/vendor/lottie-web/lottie_svg.min.js">` tag emitted exactly once per
compiled HTML by `render/lib/scf-to-html.mjs`.

## Updating

1. Bump the version pin above and re-fetch from the same `cdnjs.cloudflare.com`
   path (or copy `node_modules/lottie-web/build/player/lottie_svg.min.js` after
   `npm i lottie-web@<new-version>`).
2. Verify no API surface changed for: `lottie.loadAnimation()`,
   `anim.goToAndStop()`, `anim.setSubframe()`,
   `loadAnimation({ animationData, autoplay:false, loop:false, renderer:'svg' })`.
3. Re-run `node tests/_smoke_components.mjs` and the Lottie compile fixtures.

## Samples

`samples/checkmark.json` — minimal hand-authored Lottie 5.x JSON used by Lane A
PR-9 compile/runtime smoke fixtures. Self-contained (`assets: []`), 30 frames
@ 30fps (1.0 s), 200×200, animates a green circle scaling 0 → 1.
