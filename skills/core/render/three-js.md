# three.js — Layer 3 Skill

> Layer 3: Vendor library skill. Load when authoring a HyperFrames component
> that uses three.js / WebGL — including the planned `ThreeScene`,
> `HTMLTextureWall`, `DeviceStage3D`, and `ShaderPortal` family — or when
> reviewing a 3D scene's determinism, performance, or correctness.
>
> Sourced from the official docs at https://threejs.org. Last researched: 2026-04-06.

## When to load

Triggers: `three.js`, `THREE.`, `WebGL`, `Scene`, `Camera`, `Mesh`,
`Geometry`, `Material`, `CanvasTexture`, `Texture`, `OrbitControls`,
`requestAnimationFrame` *inside a HyperFrames component*, `ThreeScene`,
`HTMLTextureWall`, `DeviceStage3D`, `ShaderPortal`, "3D scene", "depth",
"parallax done with real geometry", "3D camera move", "shader pass",
"physically based material".

Don't load this skill for:

- 2.5D parallax achieved with stacked HTML+CSS (`gsap-flip`, transforms,
  perspective). That is the cheaper, deterministic default — see
  `creative/premium-motion-routing.md`.
- Pure SVG/Lottie motion. Those have their own Layer 3 skills.

## Status of three-related Slate components

`ThreeScene` is the first MVP WebGL component and is registered in the SCF
schema. The remaining components are **PLANNED / CONDITIONAL**; when a script
asks for one of them and it does not exist, treat it as a component-authoring
request.

Runtime loading is local and reproducible: `render/lib/scf-to-html.mjs`
embeds `three@0.171.0` from
`render/node_modules/three/build/three.module.min.js` into a conditional
import map only when a three-backed component is used. There is no CDN
fallback; if the installed package is missing or the version is not exactly
`0.171.0`, compilation fails fast.

| Planned component | Purpose | Texture source |
|---|---|---|
| `ThreeScene` | Generic three.js stage with deterministic meshes, lights, particles, and a camera path. | Built-in canvas texture today; future `assets/*.png` / `html_texture_render` outputs |
| `HTMLTextureWall` | A wall/grid of planes whose textures are PNGs of HTML cards (logos, quotes, metrics) — fast to compose, no live DOM-in-WebGL. | `html_texture_render` (`template: "text-card"` / `"label"` / `"badge"`) |
| `DeviceStage3D` | A device mockup (laptop/phone) with the screen as a textured plane. | screenshot of a real HyperFrames component, then `html_texture_render` for chrome labels |
| `ShaderPortal` | A single full-frame shader pass for backgrounds / transitions. | n/a (uniforms only) |

For any new WebGL component, load `core/component-authoring.md`,
`creative/component-design-system.md`, `creative/gsap-component-patterns.md`
*and* this skill.

## The Slate three.js contract

These rules are mandatory for any component that uses three.js inside
HyperFrames. They are stricter than what the three.js docs suggest.

### 1. No `requestAnimationFrame` render loop

HyperFrames captures frame-by-frame by seeking the `master` GSAP timeline.
A self-driven rAF loop will run *between* captures, drift relative to the
audio track, and produce non-deterministic output.

Instead, expose a `render(time)` function and call `renderer.render(scene, camera)`
from a GSAP `onUpdate` tick driven by `master`:

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);

// Seed deterministic numbers if you need any randomness (see rule 4).
const rng = mulberry32(0xC0FFEE);

master.to(camera.position, {
  z: 4, duration: 6, ease: "sine.inOut",
  onUpdate: () => renderer.render(scene, camera),
}, 0);
```

If the scene has no animation, still call `renderer.render` once on
`onComplete` of the scene's reveal tween — never auto-call on a timer.

### 2. Renderer init is synchronous and idempotent

`renderer = new THREE.WebGLRenderer(...)` must be created **before** any
animation tween runs. Allocate it inside the component's init phase and
attach to the same `<canvas>` every frame. Never create a new renderer
per frame — WebGL contexts are scarce (browsers cap at ~16 live contexts).

Set `renderer.setSize(w, h, false)` (no CSS resize), and
`renderer.setPixelRatio(1)` — devicePixelRatio drift is the single most
common source of non-deterministic output across machines.

### 3. Use orthographic camera for UI-style scenes

If the scene is "panels in space" (HTMLTextureWall, DeviceStage3D), use
`OrthographicCamera`. It removes perspective foreshortening that makes
text-on-textures look smudged at glancing angles, and it composes cleanly
with 2D HTML overlays.

Use `PerspectiveCamera` only when depth is the *point* (a flythrough,
a true 3D model reveal).

### 4. Seeded randomness only

`Math.random()` is forbidden inside three.js components. Particle
positions, jitter, noise — all must come from a seeded PRNG (e.g.
`mulberry32(seed)`). The seed is a component prop, defaulted from the
scene id, so re-renders are bit-identical.

### 5. Text belongs in textures, not in geometry

Three.js `TextGeometry` / `Troika-three-text` looks great in interactive
demos and looks bad on a captured frame: subpixel positions snap, font
hinting differs across machines. **Always** render text via
`html_texture_render` (or a screenshot of a HyperFrames component) and
upload as a `THREE.CanvasTexture` / `THREE.Texture` mapped onto a plane.

When you do that:

- Generate the texture at **2× the on-screen plane size** for retina
  sharpness, then set `texture.minFilter = THREE.LinearFilter` if the
  texture isn't power-of-two (see rule 7).
- Set `texture.colorSpace = THREE.SRGBColorSpace` so the card colors
  match the HTML preview.
- Set `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()`
  to keep glancing-angle text legible.

### 6. CORS / canvas tainting

A `WebGLRenderer` will throw a security error the moment you upload a
texture from a `crossorigin`-less image hosted off-origin. Two safe
patterns:

- Generate the texture *locally* via `html_texture_render` and load it
  by relative path. (Preferred.)
- For images that must come from URLs, set `image.crossOrigin = "anonymous"`
  before assigning `.src`, and ensure the server returns
  `Access-Control-Allow-Origin: *`.

If a texture taints the canvas, `renderer.domElement.toDataURL()` and any
HyperFrames frame capture will fail silently or return a blank frame.

### 7. WebGL limits to design within

- **Max live WebGL contexts per browser:** ~16. Components must expose
  disposal: call `renderer.dispose()`, `geometry.dispose()`,
  `material.dispose()`, and `texture.dispose()` from the registered
  `dispose()` hook. Slate invokes that hook at page teardown.
- **Max texture size:** 4096×4096 is safe everywhere; 8192 is risky on
  older GPUs. `html_texture_render` warns when dimensions are not
  power-of-two — heed it for any texture that needs mipmaps.
- **Draw calls:** keep the scene under ~200 meshes for headless capture
  to stay realtime-ish. If you need a hundred logos, batch them into a
  single `InstancedMesh` with one shared material.

### 8. Resource lifecycle

Components that create three.js resources MUST expose `dispose()` on the API
object passed to `window.__slateThree.register(sceneId, api)`. The Slate
driver calls every registered `dispose()` on `pagehide` / `beforeunload`, and
also exposes `window.__slateThree.unregister(sceneIdOrInstance)` and
`window.__slateThree.disposeAll()` for future scene-window loaders.

Do not attach disposal to an ordinary in-timeline scene-exit tween unless the
component cannot be sought backwards afterward. HyperFrames normally captures
forward, but previews and diagnostic seeks may revisit earlier times. Current
Slate keeps all three-backed scenes initialized for the page lifetime, then
disposes at page teardown; keep the number of live WebGL scenes small.

Minimum component pattern:

```js
window.__slateThree.register(sceneId, {
  init(THREE) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    // create scene resources once
  },
  renderAtTime(compositionTime, THREE) {
    renderer.render(scene, camera);
  },
  dispose() {
    renderer.dispose();
    scene.traverse((o) => {
      o.geometry?.dispose();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material?.dispose();
    });
    textures.forEach((t) => t.dispose());
  }
});
```

Forgetting this is the #1 cause of "second render of the day produces
black frames" bugs — the browser has hit its WebGL context limit.

## Authoring checklist

When you land a three.js component, verify each of these before
submitting:

- [ ] `renderer.setPixelRatio(1)` — no devicePixelRatio drift
- [ ] No `requestAnimationFrame`; render is driven by `master.onUpdate`
- [ ] All randomness comes from a seeded PRNG with a prop-derived seed
- [ ] All visible text is texture-based (no `TextGeometry`)
- [ ] All textures: `colorSpace = SRGBColorSpace`, `anisotropy` set, taint-safe
- [ ] `dispose()` releases renderer, geometries, materials, textures; driver teardown has been exercised
- [ ] Scene stays under ~200 draw calls (or uses `InstancedMesh`)
- [ ] Reviewer sub-agent (P6) compared an early frame and a late frame
      across two clean renders — outputs are identical

## Render safety contract

Never start a full-length, 1080p, auto-worker render as the first test for a
WebGL-heavy SCF. Headless Chrome may fall back to software WebGL; with multiple
capture workers this can saturate CPU, memory bandwidth, and disk I/O enough to
make the desktop unusable even on high-RAM machines.

Use this escalation ladder:

1. `node render/render.mjs <scf> --scene <id> --safe-webgl --dry-run`
2. `node render/render.mjs <scf> --scene <id> --safe-webgl --quality draft --workers 1`
3. If the user environment has a real GPU available, try one isolated GPU
   scene render before the full video:
   - Windows: `node render/render.mjs <scf> --scene <id> --quality draft --workers 1 --use-gpu true --webgl-backend d3d11`
   - Cross-platform/default backend: `node render/render.mjs <scf> --scene <id> --quality draft --workers 1 --use-gpu true`
   Keep `workers=1` for the first GPU probe. If the GPU scene is faster and
   visually correct, run the same representative scene again with `--workers 2`.
   Use `workers=2` for the full split render only if the second probe improves
   throughput without black frames, browser crashes, thermal throttling, or
   memory pressure. Try `workers=3` only on machines with clear headroom after
   `workers=2` (for example, high-VRAM discrete GPUs and no signs of paging or
   UI contention). If any probe fails, produces black frames, or is not
   materially faster, fall back to `--safe-webgl`.
4. `node render/render.mjs <scf> --split-scenes --output <out.mp4>`
  (the renderer auto-selects WebGL defaults: `workers=2`, `useGpu=true`,
  and `webglBackend=d3d11` on Windows) or force fallback with
  `node render/render.mjs <scf> --safe-webgl --split-scenes --output <out.mp4>`.
5. Only after the above is stable, explicitly opt into higher quality or more
   workers. Do not rely on auto workers for `ThreeScene`, `DeviceStage3D`, or
   `HTMLTextureWall` unless the machine has already passed a WebGL diagnostic.

For local desktop production, Slate now defaults WebGL renders to the GPU path
with two workers when the environment has not disabled GPU use. Prefer
`workers=2` over `workers=3` unless the machine has demonstrable GPU/VRAM
headroom; extra workers can reduce throughput if they contend for the same GPU
or exhaust WebGL contexts. Use `--safe-webgl` for conservative software fallback
after black frames, crashes, throttling, or memory pressure.
Cloud/remote rendering is preferred for final-quality premium 3D videos.

## See also

- `core/render/html-in-canvas.md` — how to produce textures for rule 5
- `creative/premium-motion-routing.md` — when 3D is even the right choice
- `core/component-authoring.md` — the broader Slate component contract
- `core/animation/sequencing.md` — master-timeline integration

## Provenance

Distilled from: three.js manual (Manual / Fundamentals, Lights, Materials,
Textures, Loading 3D Models, Cleanup, Custom BufferGeometry), three.js
examples gallery, and the WebGL 1/2 best-practices document on MDN.
Seed-PRNG pattern: `mulberry32` (public domain). License: three.js is
**MIT** (Copyright © 2010-present three.js authors).
