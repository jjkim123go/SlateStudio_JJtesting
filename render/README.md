# Slate HyperFrames Renderer

Renders Slate Composition Format (SCF) JSON to MP4 via
[HyperFrames](https://hyperframes.heygen.com) (Apache-2.0).

## Architecture

```
SCF JSON  →  scf-to-html.mjs  →  index.html (+ assets)  →  @hyperframes/producer  →  MP4
```

The agent never sees HTML — it produces SCF JSON, and this package compiles
SCF into a HyperFrames composition, then renders it via the producer pipeline
(headless Chrome BeginFrame capture + FFmpeg encode + audio mix).

## Usage

```
node render.mjs <scf-file.json> [--output <path>] [--quality draft|standard|high] [--dry-run] [--preview]
```

- `--output <path>`: Override the output MP4 path (default: `output/<basename>.mp4`)
- `--quality`: Render preset (`draft`, `standard`, `high`). Default: `standard`.
- `--dry-run`: Compile SCF → HTML and validate, but skip the render step.
- `--preview`: Open the generated HTML in a browser instead of rendering.

## Components

Slate-branded HyperFrames blocks live under `components/`:

| Component         | Purpose                                  |
|-------------------|------------------------------------------|
| `BrandIntro`      | Animated logo + company name reveal      |
| `BrandOutro`      | Closing card with CTA and contact info   |
| `TitleCard`       | Full-screen title with background        |
| `LowerThird`      | Name/title bar overlay                   |
| `AnimatedCaption` | Word-highlight / sentence captions       |

Each component is a self-contained HTML+CSS+GSAP fragment templated by the
SCF→HTML compiler when an SCF scene declares `"component": "<Name>"`.

## Install

```
cd render
npm install
```

Requires Node.js >= 22 and FFmpeg in `PATH`. Chrome/Chromium is auto-downloaded
by Puppeteer on first render.

## Licensing

Built on `@hyperframes/*` packages (Apache-2.0, © HeyGen Inc.). See the root
[NOTICE.md](../NOTICE.md) and [docs/TOOL_LICENSING_INFO.md](../docs/TOOL_LICENSING_INFO.md)
for full attribution and obligations.
