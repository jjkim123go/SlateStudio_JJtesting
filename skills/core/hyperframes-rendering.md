# HyperFrames Rendering Engine

> Core skill — reference this when building or rendering SCF compositions.

## What Is HyperFrames?

HyperFrames is Slate's Apache-2.0-licensed rendering engine built on the `@hyperframes/*` package family. It takes a **Slate Composition Format (SCF)** JSON file and renders it into a final video. The agent never writes rendering code directly — it generates SCF JSON and hands it to HyperFrames via an SCF→HTML compiler.

## Authoring Component Animations

When **editing or adding components** under `render/components/**`, the
Slate component contract and the underlying GSAP best-practice references
are mandatory reading:

- **Layer 2 (Slate-specific contract):** [`skills/core/component-authoring.md`](component-authoring.md) — paused master timelines, `SCENE_DURATION` scaling, transform-only rule, scene-id scoping, exclusion list.
- **Layer 3 (generic animation references, vendored from greensock/gsap-skills, MIT):**
  - [`skills/core/animation/sequencing.md`](animation/sequencing.md) — master timelines, position parameter, defaults
  - [`skills/core/animation/basics.md`](animation/basics.md) — tweens, eases, transform aliases, autoAlpha
  - [`skills/core/animation/performance.md`](animation/performance.md) — transforms only, no layout properties
  - [`skills/core/animation/value-helpers.md`](animation/value-helpers.md) — helpers for scene-time-derived values

## Slate Composition Format (SCF)

SCF is a declarative JSON format that describes an entire video composition. The agent's job is to produce valid SCF; HyperFrames handles all rendering.

### Top-Level Structure

```json
{
  "version": "1.0",
  "pipeline": "animated-explainer",
  "outputProfile": {
    "resolution": "1920x1080",
    "fps": 30,
    "format": "mp4",
    "quality": "high"
  },
  "scenes": [],
  "music": {
    "src": "assets/music/track.mp3",
    "volume": 0.15,
    "fadeIn": 1.0,
    "fadeOut": 2.0
  },
  "captions": {
    "src": "assets/captions.srt",
    "style": "default"
  }
}
```

### Output Profiles

| Quality  | Resolution  | FPS | Use Case              |
|----------|-------------|-----|-----------------------|
| draft    | 1280x720    | 24  | Quick preview         |
| standard | 1920x1080   | 30  | Internal sharing      |
| high     | 1920x1080   | 30  | External / production |
| ultra    | 3840x2160   | 30  | Broadcast / keynote   |

## Available Components

Use these pre-built components whenever possible — they handle animation, branding, and timing automatically.

### Core (always-available)

| Component        | Purpose                              | Key Props                                      |
|------------------|--------------------------------------|-------------------------------------------------|
| `BrandIntro`     | Opening brand animation              | `brandPackage`, `tagline`, `duration`           |
| `BrandOutro`     | Closing brand animation              | `brandPackage`, `cta`, `duration`               |
| `TitleCard`      | Full-screen title with subtitle      | `title`, `subtitle`, `background`, `duration`   |
| `AnimatedCaption`| Animated text overlay                | `text`, `position`, `animation`, `duration`     |
| `LowerThird`     | Name/title bar at bottom of screen   | `name`, `title`, `side`, `duration`             |

### Phase A — Foundational storytelling

| Component       | When to use                                                   | Key props |
|-----------------|---------------------------------------------------------------|-----------|
| `MetricsCard`   | **Single KPI / metric / stat callout with trend.** Big number, delta arrow, sparkline. Prefer over a `structured_image` bar chart for headline numbers. | `label`, `value`, `prevValue`, `unit`, `deltaText`, `sparklinePoints` |
| `Quote`         | Pull quote / testimonial / customer voice. Attribution + optional photo. | `text`, `author`, `role`, `photoSrc`, `accentColor` |
| `CalloutPin`    | Annotate a specific point on a base image (UI screenshot, photo, diagram). Pulsing pin + labeled card with leader. | `baseSrc`, `x`, `y`, `labelX`, `labelY`, `label`, `detail` |
| `CompareSlider` | Before/after / A vs B side-by-side reveal with a sweeping divider. | `leftSrc`, `rightSrc`, `leftLabel`, `rightLabel`, `leftBg`, `rightBg`, `title` |

### Phase C — Engineer / technical

| Component             | When to use                                                | Key props |
|-----------------------|------------------------------------------------------------|-----------|
| `ArchitectureDiagram` | **Animated** system architecture / service map / topology / dependency graph / pipeline. Boxes pop in, arrows stroke-draw. Prefer over a `structured_image` diagram whenever the audience benefits from sequential reveal of components. | `title`, `boxesSvg` (raw `<rect>`/`<text>` SVG fragments), `arrowsSvg` (raw `<path>` arrow fragments), `markerId` |

### Phase F — Education / closing

| Component   | When to use                                                              | Key props |
|-------------|--------------------------------------------------------------------------|-----------|
| `StepByStep`| Numbered checklist that fills in step-by-step. Ideal for tutorials, onboarding, processes. | `title`, `stepsHtml` (raw `<li class="sbs-step">…<span class="sbs-check">✓</span>…</li>` rows) |
| `CTABlock`  | Closing call-to-action card. Eyebrow + huge title + body + button + contact. Pairs naturally with `BrandOutro`. | `eyebrow`, `title`, `body`, `ctaText`, `contact`, `accentColor` |

### Phase I — Synthetic screen recording

| Component       | When to use                                                  | Key props |
|-----------------|--------------------------------------------------------------|-----------|
| `TerminalScene` | **Synthetic terminal/CLI demo without screen capture.** Steps include `cmd` (typed character-by-character), `out` (block reveal), `pause` (hold), `pill` (status badge). Ideal for product demos, install flows, deploy walkthroughs. See [`synthetic-screen-recording.md`](synthetic-screen-recording.md) for the step-kind contract. | `titlebar`, `linesHtml` (raw `<div class="ts-line" data-kind="…" data-duration="…">…</div>` rows) |
| `KustoExplorerScene` | **Synthetic Kusto Explorer / ADX query demo without screen capture.** Desktop-style ribbon, connection tree, KQL editor, result grid, and callout overlay. Use mock data only. | `connections`, `tabs`, `queryLines`, `highlightLines`, `results`, `callout` |
| `AzureDevOpsScene` | **Synthetic Azure DevOps repo / file / pull request / PR Assistant surface.** Use for anonymized ADO repo walkthroughs, PAL impact-review explanations, reviewer activity, and PR Assistant comments without screen recording. | `variant`, `projectName`, `repoName`, `files`, `codeLines`, `diffLines`, `checks`, `reviewers`, `impactRows`, `recommendations`, `activity` |
| `DualMetricShowcase` | **Side-by-side executive metric panels** for two products, programs, or operating moments. Use when both sets of numbers must remain visible together. | `leftTitle`, `leftMetricsJson`, `rightTitle`, `rightMetricsJson`, `title`, `footer` |

> **Routing note:** `MetricsCard`, `ArchitectureDiagram`, and `TerminalScene`
> override the default `structured_image` routing for their respective
> domains. See [`structured-visuals.md`](structured-visuals.md) §"Component
> overrides" for the precedence rules.

## Scene Types

### Component-Based Scenes

Use `"component"` and `"props"` for pre-built components. Preferred when a component fits the need.

```json
{
  "id": "scene-intro",
  "duration": 4,
  "component": "BrandIntro",
  "props": {
    "brandPackage": "microsoft-default",
    "tagline": "Empowering every person and organization"
  },
  "transition": { "in": "fadeIn", "out": "crossfade" }
}
```

### Custom Scenes

Use `"layers"` for scenes that need bespoke layout. Layers render in order (first = bottom).

```json
{
  "id": "scene-stats",
  "duration": 6,
  "layers": [
    {
      "type": "image",
      "src": "assets/images/bg-gradient.png",
      "fit": "cover"
    },
    {
      "type": "text",
      "content": "40% increase in efficiency",
      "style": { "fontSize": 72, "fontWeight": "bold", "color": "#FFFFFF" },
      "position": { "x": "center", "y": "40%" },
      "animation": { "type": "countUp", "from": 0, "to": 40, "suffix": "%" }
    },
    {
      "type": "caption",
      "text": "Since implementing the new platform",
      "position": { "x": "center", "y": "65%" },
      "animation": { "type": "fadeInUp", "delay": 1.0 }
    }
  ],
  "narration": { "src": "assets/narration/scene-stats.wav" },
  "transition": { "in": "fadeIn", "out": "crossfade" }
}
```

## Layer Types

| Type        | Purpose                         | Required Fields                        |
|-------------|----------------------------------|----------------------------------------|
| `image`     | Static or animated image         | `src`, `fit` (cover/contain/fill)      |
| `video`     | Video clip background or overlay | `src`, `fit`, `startTime`, `endTime`   |
| `text`      | Styled text element              | `content`, `style`, `position`         |
| `shape`     | Rectangles, circles, lines       | `shape`, `fill`, `position`, `size`    |
| `caption`   | Subtitle-style text              | `text`, `position`                     |
| `chart`     | Animated chart                   | `chartType`, `data`, `style`           |
| `component` | Nested component                 | `component`, `props`                   |

## Animations

Apply via the `animation` property on any layer.

| Animation    | Effect                              | Best For                     |
|--------------|-------------------------------------|------------------------------|
| `fadeIn`     | Opacity 0 → 1                      | Backgrounds, subtle reveals  |
| `fadeInUp`   | Fade in + slide up                  | Text, captions               |
| `slideUp`    | Slide from below frame              | Lists, sequential items      |
| `scaleIn`    | Scale from 0 → 1                   | Icons, emphasis              |
| `bounceIn`   | Scale with bounce easing            | Fun / energetic tone         |
| `typewriter` | Characters appear one by one        | Code, quotes                 |
| `countUp`    | Number animates from `from` to `to` | Statistics, metrics          |

Animation properties: `type`, `duration` (seconds), `delay` (seconds), `easing` (ease, easeIn, easeOut, easeInOut, spring).

## Transitions

Apply between scenes via the `transition` property.

| Transition   | Effect                          | Best For                      |
|--------------|---------------------------------|-------------------------------|
| `cut`        | Instant switch                  | Fast-paced, same-topic scenes |
| `fadeIn`     | Fade from black                 | Opening scenes                |
| `fadeOut`    | Fade to black                   | Closing scenes                |
| `crossfade`  | Blend between scenes            | Most scene transitions        |
| `slide`      | Push scene left/right/up/down   | Topic changes                 |
| `wipe`       | Reveal with a wipe              | Dramatic reveals              |
| `zoom`       | Zoom into next scene            | Focus / drill-down            |

## Rendering

### Command

```bash
node render/render.mjs <scf-path>
```

### Options

| Flag              | Default         | Description                    |
|-------------------|-----------------|--------------------------------|
| `--output`, `-o`  | `output/`       | Output directory               |
| `--quality`, `-q` | from SCF        | Override quality profile        |
| `--preview`       | false           | Render first 10 seconds only   |
| `--dry-run`       | false           | Validate SCF without rendering |

### Examples

```bash
# Full render
node render/render.mjs output/composition.scf.json

# Preview only
node render/render.mjs output/composition.scf.json --preview

# Validate without rendering
node render/render.mjs output/composition.scf.json --dry-run
```

## Best Practices

1. **Validate before rendering** — always run `--dry-run` first to catch schema errors.
2. **Prefer components over custom layers** — components handle animation, timing, and brand compliance automatically.
3. **Keep scenes 3–10 seconds** — shorter than 3s feels rushed; longer than 10s loses attention.
4. **Use crossfade as the default transition** — it works well in almost all cases. Reserve cuts for fast-paced sequences and wipes/zooms for emphasis.
5. **Layer order matters** — first layer is the bottom (background), last layer is the top (foreground).
6. **Test with draft quality first** — render at 720p/24fps for quick iteration, then switch to high/ultra for final output.
7. **Match animation to tone** — use `fadeInUp` for professional, `bounceIn` for energetic, `typewriter` for technical.
8. **Keep text readable** — minimum 48px for titles, 36px for body text at 1080p. High contrast against background.
