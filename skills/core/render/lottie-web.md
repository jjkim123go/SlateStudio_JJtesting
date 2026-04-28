# Lottie (lottie-web) — Layer 3 Skill

> Layer 3: Vendor library skill. Load when authoring or composing a
> HyperFrames component that needs **designer-authored vector motion
> graphics** — animated logos, icon flourishes, badge reveals, looping
> background ornaments, illustrative micro-interactions delivered as
> Adobe After Effects compositions exported via Bodymovin.
> Sourced from the official docs at https://airbnb.io/lottie/ and
> https://github.com/airbnb/lottie-web.
> Last researched: 2026-04-06.

## When to use

Triggers: "we have a Lottie file from the brand team", "the designer
gave me a Bodymovin export", "the badge wall needs the cert seals to
shimmer/wave", "the event opener needs that animated wordmark logo",
"play this brand-approved icon animation", "the scrolling background
needs animated ornament/pattern motion", "react to a designer-supplied
`.json` animation".

Don't load this skill for:
- **Hand-coded animations** — if you're tweening DOM, use GSAP from the
  basics skill. Lottie is for *imported* AE compositions, not for things
  Slate authors itself.
- **Photo / video motion** — Lottie is vector-only (SVG renderer in
  Slate). For raster motion, use the `video` layer or generate a clip.
- **Raster Lottie features** — bitmap assets, `precomp` references with
  external image files, expressions that fetch remote data. Slate's
  Lottie support is restricted to **self-contained vector** Lotties only
  (Standing Rule #12: `assets.length === 0`).
- **Runtime data binding** — Lottie's "data" mode that swaps JSON at
  runtime is forbidden; everything is embedded at compile time.

## Official sources

- Project home: https://airbnb.io/lottie/
- Docs (web): https://airbnb.io/lottie/#/web
- Repository: https://github.com/airbnb/lottie-web
- npm package: `lottie-web` (pin `lottie-web@5`)
- License: **MIT** (clean — verified at
  https://github.com/airbnb/lottie-web/blob/master/LICENSE.md)
- Bodymovin AE plugin: https://aescripts.com/bodymovin/ (the typical
  source of `.json` Lottie files).
- LottieFiles marketplace (browseable curated set):
  https://lottiefiles.com/ — review the per-file license; not every
  file on LottieFiles is MIT, many are author-licensed.

## Slate integration

- **Bundle method**: lottie-web is vendored locally under
  `render/vendor/lottie-web/lottie_svg.min.js` (the **SVG-only** build —
  ~75 KB min+gz, vs ~250 KB for the full multi-renderer bundle). Slate
  only ever uses the SVG renderer; canvas / HTML / worker renderers are
  out of scope.
  ```html
  <script src="render/vendor/lottie-web/lottie_svg.min.js"></script>
  ```
  The SCF compiler (`render/lib/scf-to-html.mjs`) emits this `<script>`
  tag exactly once, the first time it sees a `lottie` layer in the
  composition. No CDN — vendored on-disk to satisfy the air-gapped /
  reproducible-build contract.
- **Allowlist entry**: `lottie-web@5` is registered in
  `config/org/governance-policy.yaml` under `runtime_libraries`.
- **License attribution**: the upstream MIT `LICENSE` is copied into
  `render/vendor/lottie-web/LICENSE` (required by §10.3 of the Phase II
  proposal).
- **Compile-time embed (Standing Rule #10)**: The compiler reads the
  `.json` referenced by a `lottie` layer's `src` at compile time,
  parses it, validates `assets.length === 0`, and inlines it into the
  compiled HTML as a `<script type="application/json">` data island.
  Runtime `path:` loading via `lottie.loadAnimation({ path: ... })` is
  **forbidden** — file:// protocol breaks relative loads, async
  fetching races GSAP master timeline start, and external paths break
  reproducible-build hashing.
- **Self-contained only (Standing Rule #12)**: Embedded Lottie JSON
  MUST have `assets.length === 0`. If a Lottie has external image
  references, the compiler throws with a clear error. To fix: re-export
  from After Effects with all rasters baked into vectors, or use a
  different animation.
- **Determinism (the critical contract)**: Slate renders headlessly via
  HyperFrames at a fixed framerate (typically 30 fps). Lottie's default
  `requestAnimationFrame`-driven playback would produce non-deterministic
  output across renders. Slate solves this with a **single
  framework-level driver** that:
  1. Loads each Lottie with `autoplay: false, loop: false,
     renderer: 'svg', rendererSettings: { progressiveLoad: false }`.
  2. Calls `anim.setSubframe(false)` on each instance (forces integer
     frame steps, eliminates a class of subpixel float drift).
  3. Subscribes to the **GSAP master timeline's update tick** and, on
     every frame, computes the target Lottie frame from
     `master.time()` and calls `anim.goToAndStop(targetFrame, true)`.
  This is the **single permitted exception** to Standing Rule #7 ("no
  DOM mutations inside GSAP `onUpdate`") because (a) it lives in
  compiler-emitted bootstrap code, not in any
  `render/components/*/animation.js`, and (b) it calls Lottie's own
  frame-stepping API rather than mutating raw DOM. Component authors
  must NOT add `onUpdate` callbacks of their own.

## SCF layer schema

A `lottie` layer in an SCF scene:
```json
{
  "type": "lottie",
  "id": "brand-logo",
  "src": "assets/brand/contoso-logo.json",
  "x": 760, "y": 400,
  "width": 400, "height": 280,
  "loop": false,
  "speed": 1,
  "segment": [0, 60],
  "opacity": 1
}
```
Field semantics:
- `src` (required) — project-root-relative path to a self-contained
  Lottie JSON file. Read at **compile** time.
- `x`, `y`, `width`, `height` — absolute placement in the 1920×1080
  scene coordinate system (default origin 0,0; default size = the
  Lottie's intrinsic `w`/`h`).
- `loop` (default `false`) — when `true`, the driver wraps frame
  computation modulo `totalFrames` so the animation repeats for as
  long as the scene is on screen.
- `speed` (default `1`) — playback rate multiplier applied by the
  driver. `2` = double-time, `0.5` = half-time. Range `[0.1, 5]`.
- `segment` (optional, `[from, to]` integers) — restricts playback to
  a sub-range of frames. Combined with `loop` to loop a sub-segment.
- `opacity` (default `1`) — applied to the container `<div>`, not to
  the Lottie itself (avoids per-frame opacity composition cost).

## Authoring a Lottie source file

Designers typically deliver a `.json` file from After Effects via the
Bodymovin export. Before checking it in:
1. Open the JSON, verify `"assets": []` is empty (or only contains
   *empty* `precomp` entries, which are fine — only image/raster
   assets are forbidden).
2. Verify `"chars"` and `"fonts"` are absent or empty unless you've
   bundled the actual font in the project. (Lottie text layers that
   reference unbundled fonts render as missing-glyph boxes.)
3. Sanity-check the file size — vector Lotties should be 5–80 KB.
   Anything > 250 KB usually means the designer included raster
   assets (Lottie embeds them as base64 data URIs, which works at
   runtime but bloats the JSON; not allowed by Slate's contract).
4. Pin the framerate to the SCF's `outputProfile.fps` (or an integer
   divisor of it). Mismatched framerates still play but accumulate
   drift across long scenes.

## Gotchas

- **The compiler hard-fails on `assets.length > 0`.** Re-export from
  AE with raster assets converted to vectors (or removed) before
  re-checking in. This is a feature, not a bug.
- **`{{{lottieJson}}}` (triple Mustache) is mandatory.** The data
  island uses raw-mode Mustache because the JSON contains `"`
  characters that HTML-escaping would corrupt. This is Standing Rule
  #9 enforced for Lottie specifically.
- **Don't add `onUpdate:` callbacks** in component animation.js to
  drive Lotties. The framework driver handles that. Adding your own
  doubles the frame-step calls and breaks playback.
- **`autoplay: false` is non-negotiable.** If you set `autoplay: true`,
  the Lottie plays in real time using `requestAnimationFrame`, which
  is non-deterministic across renders and races the GSAP master
  timeline.
- **`renderer: 'svg'` only.** Slate's vendor bundle is the SVG-only
  build. `'canvas'` and `'html'` will fail with "renderer not
  registered".
- **Don't use `path:` loading.** Forbidden by Standing Rule #10. The
  compiler reads the file at build time and embeds it. Runtime fetch
  breaks file:// rendering and the reproducible-build hash.
- **Loop logic lives in the driver, not in `loop: true` on
  loadAnimation.** Pass Lottie `loop: false` always; the SCF layer's
  `loop` flag tells the driver to wrap frame computation. This keeps
  scene-end behavior (stop vs continue) controlled by the timeline.
- **`segment` is integer frames, not seconds.** A 30 fps Lottie of 60
  frames = 2 seconds. `segment: [15, 45]` = play frames 15→45 = 1
  second of animation. The driver maps SCF time to those frames.
- **Opacity is on the container `<div>`, not the Lottie SVG.** Setting
  the Lottie's internal alpha would force per-frame compositing in
  the SVG renderer. The container approach is one composite at the
  browser level.
- **Bodymovin's "Glyphs" text mode is preferred over "Text".** Glyphs
  bake fonts into vector outlines at export time; Text mode requires
  the runtime to find the font. Slate doesn't bundle arbitrary fonts,
  so Glyphs avoids missing-glyph boxes.
- **License every Lottie file you add.** LottieFiles marketplace is
  *not* uniformly MIT — many files are author-licensed for
  personal/commercial use with attribution. Track the license per-file
  in `assets/brand/<file>.json.LICENSE` if it's not your own work.

## Out of scope (don't do this)

- **No canvas or HTML renderer.** SVG only.
- **No Lottie Workers / web-worker offload.** Slate runs in
  Puppeteer-driven Chromium without worker support assumed.
- **No `path:` runtime loading.** Compile-time embed only.
- **No `chars` / `fonts` references to unbundled fonts.** Re-export
  with Glyphs mode.
- **No expressions that fetch remote data.** Lottie supports a tiny
  expression engine; anything that calls `fetch`, `XMLHttpRequest`,
  or `globalThis.someAppData` is non-portable and breaks under
  reproducible-build constraints.
- **No external image assets.** Self-contained vectors only (Standing
  Rule #12, enforced by the compiler).
- **No Adobe AE-specific blend modes** that Lottie doesn't implement
  in SVG. The Lottie spec lists supported modes; "Hue" / "Saturation"
  / "Color" / "Luminosity" silently degrade to "Normal" in the SVG
  renderer. Test the export, don't trust the AE preview.
- **Don't bundle the full multi-renderer build.** ~250 KB hit for no
  benefit. Always use `lottie_svg.min.js`.
