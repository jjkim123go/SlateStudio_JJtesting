# Synthetic Screen Recording (Slate-Specific)

> **Layer 2 skill** — load whenever a scene depicts a CLI, terminal, app
> UI, IDE, browser tool, or any "watch as I do this on a computer" moment.
>
> **For non-surface visual storytelling components** (MetricsCard,
> DataChart, Quote, CalloutPin/Box, ArchitectureDiagram, CodeWalkthrough,
> StepByStep, CTABlock, CompareSlider, SplitScreen, SlideRenderer,
> ScreenDemoFrame, WebcamOverlay, TransitionWipe), load
> [`visual-storytelling-components.md`](visual-storytelling-components.md)
> instead (or in addition).
>
> **Companion components:**
> - `TerminalScene` — CLI / shell sessions
> - `VSCodeScene` — VS Code editor walkthroughs
> - `AzurePortalScene` — Azure portal blade workflows
> - `GitHubScene` — GitHub PR / repo / Actions workflows
> - `EdgeBrowserScene` — generic browser / SaaS surface behind chrome
> - `TeamsScene` — Microsoft Teams chat / channel / meeting
> - `OutlookScene` — Outlook inbox / compose / calendar
> - `ExcelScene` — Excel workbook / formulas / pivots
> - `PowerPointScene` — PowerPoint slide deck
> - `PowerBIScene` — Power BI report / dashboard
> - `FabricScene` — Microsoft Fabric lakehouse / notebook
> - `WindowsScene` — Windows desktop shell / taskbar
> - `AdminCenterScene` — M365 admin center
>
> All Phase I components share the step-kind contract documented here.
> Each component extends the vocabulary with surface-specific kinds
> (e.g. `intellisense` for VSCode, `react` for Teams, `recompute` for
> Excel) — see the per-component skill at `skills/core/components/<name>.md`.

## Why "synthetic" instead of real screen capture?

Real screen recordings are expensive and brittle:

- Require a working environment with the right state at the right moment.
- Cannot be re-rendered with a different example, theme, or duration.
- Pick up artifacts: cursor jitter, OS chrome, notification toasts,
  background services, real PII or secrets.
- Cannot be A/B'd or localized without re-recording.

Synthetic screen recording renders the same on-screen content as
deterministic HTML+GSAP. It re-renders for free, has no artifacts,
contains no real secrets, and is easy to localize or theme.

## The step-kind contract (v1)

Every Phase I component takes a `steps` array (or pre-rendered `linesHtml`
that decomposes into the same kinds). Each step has a `kind` that
determines how it animates:

| Kind    | Visual                                  | Required fields                | Default duration |
|---------|-----------------------------------------|--------------------------------|------------------|
| `cmd`   | Typed character-by-character with a leading prompt (`$`, `>`, `PS>`). | `text` (string to type) | scaled by length, ~0.04s/char |
| `out`   | Block reveal — appears as a unit, no typing. Use for command output, log lines, file content. | `text` (string or HTML) | 0.3s |
| `pause` | A held beat with no visible change. Use to give the audience time to read previous output before the next command. | (none — only `duration`) | 0.6s |
| `pill`  | Status badge fades in (✓ done, ⚠ warning, ✗ error). Use to mark phase completion. | `text`, `variant` (`success`/`warning`/`error`) | 0.4s |

## v1 — what's IN scope

- ✅ Sequential rendering of `cmd`, `out`, `pause`, `pill` steps in a
  single terminal/window pane.
- ✅ Theme prop (titlebar text, dark/light) on the host component.
- ✅ Auto-scroll: when content overflows the viewport, the terminal
  body scrolls so the latest line is visible.
- ✅ Character-by-character typing with monospace font.

## v1 — what's OUT of scope (explicitly)

- ❌ Mouse cursor rendering or movement.
- ❌ Click animations / button highlight / hover states.
- ❌ Text selection / copy-paste visualization.
- ❌ Split panes or multi-tab terminal.
- ❌ Window resize / drag / minimize chrome interactions.
- ❌ Real-time interactive prompts (yes/no, password masking).

If a scene needs any of the above, fall back to `foundry_video_gen` (Sora-2)
or a real recorded clip via the `video` layer type.

## Authoring `TerminalScene` props

The component accepts `linesHtml` as raw HTML (triple-mustache injection).
Build it from the steps array. Required structure for each line:

```html
<div class="ts-line" data-kind="cmd" data-duration="0.6" style="opacity:0;display:flex;gap:12px;margin-bottom:8px">
  <span style="color:#22c55e;font-weight:600">$</span>
  <span class="ts-cmd-text" data-text="npm install hyperframes">npm install hyperframes</span>
</div>

<div class="ts-line" data-kind="out" data-duration="0.4" style="opacity:0;color:rgba(255,255,255,0.7);margin-bottom:4px;white-space:pre">
added 247 packages in 8s
</div>

<div class="ts-line" data-kind="pause" data-duration="0.8" style="display:none"></div>

<div class="ts-line" data-kind="pill" data-duration="0.4" style="opacity:0;display:inline-flex;align-items:center;gap:6px;margin:8px 0;padding:4px 12px;background:rgba(34,197,94,0.2);border:1px solid #22c55e;border-radius:999px;color:#22c55e;font-size:18px">
  <span>✓</span><span>install complete</span>
</div>
```

Notes:
- `cmd` lines need BOTH `data-text` (the full string to type) AND
  the same string as initial textContent (animation.js will clear it
  to `""` then animate to the full string).
- `out` lines should set `white-space:pre` if preserving whitespace
  matters (e.g., aligned table output).
- `pause` lines have `display:none` — they consume timeline time
  but render nothing.

## Pacing guidelines

- `cmd` typing: ~0.04s per character, minimum 0.4s, maximum 1.5s.
  For long commands, prefer breaking into a multi-line `out` instead.
- After every `cmd`, insert a 0.4–0.8s `pause` before the `out` so the
  audience perceives the cause→effect.
- After a `pill`, give a 0.6–1.0s `pause` so it can register before
  the next command.
- Total terminal scene duration: 8–20 seconds. Longer feels like
  documentation, shorter feels rushed.
