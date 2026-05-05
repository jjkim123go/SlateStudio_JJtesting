# Visual Storytelling Components — Umbrella

> Layer 2 — Slate-specific. Load this skill at **scene_plan** stage as a
> *quick map* over the Phase II / "non-Microsoft-surface" component
> library. It does **not** replace the per-component skills; it routes you
> to the right one in one read.

## When to load

Load early in `scene_plan` whenever the script contains *any* of:
mention of metrics/numbers, before-and-after, customer quote, location to
point at on an image, multi-step instructions, closing CTA, side-by-side
arrangement, charts that should animate, presentation slide, framed
device/window mockup, picture-in-picture presenter, chapter break, or a
two-or-more-sentence callout on a screenshot.

If the script is purely a synthetic Microsoft surface demo (PowerPoint
editing, VS Code, Azure portal, etc.), load
[`synthetic-screen-recording.md`](synthetic-screen-recording.md) instead
(or in addition).

If the script reaches for "premium / cinematic / 3D / depth / parallax /
shader / logo wall / device flythrough" cues, *also* load
[`../creative/premium-motion-routing.md`](../creative/premium-motion-routing.md)
to pick the right tier (standard 2D vs 2.5D polish vs Sora-2 hybrid vs true
3D) before authoring a `ThreeScene` / `HTMLTextureWall` / `DeviceStage3D`
component. See [`render/three-js.md`](render/three-js.md) for the
engineering contract and [`render/html-in-canvas.md`](render/html-in-canvas.md)
for texture authoring.

## Quick router — pick a component in one read

| Script signal | Component | Skill |
|---------------|-----------|-------|
| Single headline number, KPI, "X% improvement", uptime, latency, throughput | `MetricsCard` | [`components/metrics-card.md`](components/metrics-card.md) |
| Animated bar/donut/line chart with reveal cue | `DataChart` | [`components/data-chart.md`](components/data-chart.md) |
| Static chart values that must read precisely (no animation cue) | a `bar_chart`/`donut_chart` PNG via `structured_image` | [`structured-visuals.md`](structured-visuals.md) |
| Pull quote, testimonial, customer voice | `Quote` | [`components/quote.md`](components/quote.md) |
| Point at one spot on an image, ≤ 12-word label | `CalloutPin` | [`components/callout-pin.md`](components/callout-pin.md) |
| Annotate one spot on an image, 2+ sentence explanation, icon, card | `CalloutBox` | [`components/callout-box.md`](components/callout-box.md) |
| Architecture/system map with sequential reveal | `ArchitectureDiagram` | [`components/architecture-diagram.md`](components/architecture-diagram.md) |
| Synthetic terminal / CLI walkthrough | `TerminalScene` | [`components/terminal-scene.md`](components/terminal-scene.md) |
| Numbered steps, checklist, tutorial sequence | `StepByStep` | [`components/step-by-step.md`](components/step-by-step.md) |
| Closing call to action | `CTABlock` | [`components/cta-block.md`](components/cta-block.md) |
| Same subject in two states (before/after, with/without, legacy/new) | `CompareSlider` | [`components/compare-slider.md`](components/compare-slider.md) |
| Two **different** subjects shown together (two team members, two products) | `SplitScreen` | [`components/split-screen.md`](components/split-screen.md) |
| Branded title / agenda / recap / opening / cover slide (no app chrome) | `SlideRenderer` | [`components/slide-renderer.md`](components/slide-renderer.md) |
| Demo *about* PowerPoint itself (ribbon, slide rail visible) | `PowerPointScene` | [`components/powerpoint-scene.md`](components/powerpoint-scene.md) |
| Wrap a screenshot/clip in a browser window / phone / tablet / macOS frame | `ScreenDemoFrame` | [`components/screen-demo-frame.md`](components/screen-demo-frame.md) |
| Picture-in-picture face-cam over the demo | `WebcamOverlay` | [`components/webcam-overlay.md`](components/webcam-overlay.md) |
| Chapter break / section divider / "Part 2" | `TransitionWipe` | [`components/transition-wipe.md`](components/transition-wipe.md) |

## Key disambiguation rules (the ones that bite)

1. **CompareSlider vs SplitScreen** — same subject in two states ⇒
   CompareSlider; two different subjects ⇒ SplitScreen. The phrase
   "side-by-side" alone routes to **SplitScreen**.
2. **CalloutPin vs CalloutBox** — short label / multiple pins ⇒
   CalloutPin; long explanation / single feature card ⇒ CalloutBox.
3. **SlideRenderer vs PowerPointScene** — clean branded slide content ⇒
   SlideRenderer; demo *of* PowerPoint as an app ⇒ PowerPointScene.
4. **DataChart vs `structured_image` chart** — animated reveal cue ⇒
   DataChart; values must read precisely with no animation ⇒
   a `bar_chart` / `donut_chart` PNG via `structured_image`.
5. **MetricsCard vs DataChart** — one headline number ⇒ MetricsCard; a
   set of comparable values ⇒ DataChart.

## Pipeline integration

This skill is referenced by the explainer director (`skills/directors/explainer.md`) at
the `scene_plan` and `compose` stages. The per-component skills it
points to are the ones the compose stage actually loads to render the
SCF. Loading this umbrella does not bypass them — it just helps the
director pick the right one fast.

## Versioning

This list reflects the Phase II catalog (15 components total in the
visual-storytelling group, plus 12 Microsoft-surface scenes covered by
[`synthetic-screen-recording.md`](synthetic-screen-recording.md)). Add
new components both here and in
[`skills/INDEX.md`](../INDEX.md) when introducing them.
