# Scene-Component Routing

> Layer 2 — Slate-specific. Load this skill at **scene_plan** stage,
> **ALWAYS**, for any component-driven scene. This skill is the upstream
> selector that runs BEFORE the tool-to-component routing in
> [`structured-visuals.md`](structured-visuals.md).
> If this skill routes to a component, the structured-visuals routing is
> bypassed for that scene. If this skill DEFERS, the structured-visuals
> two-step flow (call `structured_image` tool → display PNG via component)
> takes over.
>
> **Premium / 3D / cinematic cues:** before reaching for three.js or a
> Sora-2 plate, also load
> [`creative/premium-motion-routing.md`](../creative/premium-motion-routing.md).
> It picks the cheapest credible treatment (T1 standard 2D → T2 2.5D polish
> → T3 Sora-2 hybrid → T4 true 3D) and prevents "3D for a single text scene"
> failures.

---

## Trigger vocabulary

Load this skill when the narration or scene plan contains any of these
terms. This list matches the vocabulary specified in the Phase II proposal
§4.1 and is the canonical set for `skills/INDEX.md` registration.

```
metric, KPI, quarterly update, roadmap, release, sprint, customer story,
pricing, ROI, compliance, evidence, policy, audit, threat, quiz, glossary,
chapter divider, event intro, presenter, poll, data flow, sequence diagram,
health dashboard, synthetic workflow
```

In practice, this skill should fire for **every** scene at `scene_plan`
because even scenes that lack these keywords may match a framing component
(WebcamOverlay, TransitionWipe, SplitScreen) or a surface component
(VSCodeScene, AzurePortalScene, etc.). The trigger vocabulary above is the
*minimum* set; the router also matches the per-component keywords in the
routing table below.

---

## Routing precedence

Apply these rules **in order**. Earlier rules dominate later ones.

1. **Explicit user choice always wins.**
   If the user says "use a quote slide" or "I want a MetricsCard here," the
   router proposes exactly that component even if other matches score higher.
   The agent is a creative partner, not a gatekeeper.

2. **If the scene needs deterministic text/data rendering, prefer the matching
   HyperFrames component — DEFER to `structured_image` only as a last resort.**
   Most content types have a component that renders text/data correctly:
   `VSCodeScene` / `TerminalCast` for code, `DataFlow` / `ArchitectureDiagram`
   for diagrams, `DataChart` for charts, `PricingTable` / `ExcelScene` for
   tables. Only emit `"deferTo": "structured_image"` when no component can
   render the content natively AND pixel-perfect static fidelity is required
   (e.g., audit-grade charts, print assets). See
   [`structured-visuals.md`](structured-visuals.md) for the full contract.

3. **Safety / governance beats aesthetics.**
   If the scene includes policy, classification, legal, evidence, or
   compliance language, route first into governance-intent components. No
   registered governance components exist today (AuditTrail, PolicyEnforcement
   are Phase II proposals only), so governance scenes currently DEFER to
   the `structured_image` tool (table or diagram type) or `foundry_image_gen`
   with a compliance-themed prompt. Log a `"rejects"` entry noting the gap.

4. **Narrative role beats keyword count.**
   A sentence like "We reduced onboarding time by 40%" should prefer
   `MetricsCard` (metric-intent), not `Quote` (proof-intent) — even though
   "we" might suggest a customer voice. Weight the scene's functional role
   (present a number, compare two states, walk through steps) above raw
   keyword frequency.

5. **Audience persona narrows the set.**
   Internal PM update → SlideRenderer or DataChart.
   Seller pitch → Quote or CompareSlider.
   Engineer demo → TerminalScene, VSCodeScene, ArchitectureDiagram.
   Auditor / reviewer → defer to `structured_image` tool (precise data).
   When persona context is available, use it to break ties between
   equally-scoring alternates.

6. **Narration structure seeds reveal timings.**
   List-like narration ("first… then… finally…") should pre-seed
   `narrationStartSec` scaffolding in seed props. Numeric narration
   ("40% improvement") should pre-seed `value` / `delta` fields. The
   router populates `seedProps` as hints; the downstream
   `narration-component-sync` skill refines them with actual TTS timing.

---

## Routing grammar

The router classifies each scene's narration into one or more intent
classes using the following deterministic grammar. Intents are tested in
declaration order; the first match wins for primary classification, but
all matches contribute to the alternates list.

```bnf
<scene-intent> ::= <metric-intent>
                 | <timeline-intent>
                 | <comparison-intent>
                 | <proof-intent>
                 | <governance-intent>
                 | <training-intent>
                 | <event-intent>
                 | <workflow-intent>
                 | <surface-intent>
                 | <framing-intent>
                 | <fallback-intent>

<metric-intent>     ::= /metric|kpi|uptime|latency|trend|delta|improved by|decreased by/
<timeline-intent>   ::= /roadmap|quarter|milestone|release|burn.?down|okr|goal/
<comparison-intent> ::= /vs|compare|before and after|tier|pricing|competitor/
<proof-intent>      ::= /customer|case study|testimonial|roi|payback|adoption/
<governance-intent> ::= /compliance|policy|audit|evidence|data flow|threat|encryption|classification/
<training-intent>   ::= /learn|quiz|definition|term|glossary|step|module|chapter/
<event-intent>      ::= /speaker|session|event|audience|poll|presenter|demo/
<workflow-intent>   ::= /send.*then|arrives in|approval flow|across apps|handoff/
<surface-intent>    ::= /vscode|vs code|azure portal|github|edge|teams|outlook|excel|powerpoint|power.?bi|fabric|windows|admin center|terminal|cli|command line/
<framing-intent>    ::= /split.?screen|webcam|callout box|wipe|transition|chapter break|side by side|picture.?in.?picture|pip|device frame|phone mockup|tablet|browser frame|presentation slide|deck slide/
<fallback-intent>   ::= anything not matched above
```

### Intent resolution rules

- A scene may match **multiple** intents. The primary is the first match
  in declaration order. All other matches populate `alternates`.
- `<surface-intent>` is scoped: each keyword maps to exactly one `*Scene`
  component (see the routing table). If the surface keyword is present,
  that component is the primary regardless of other intents — surface
  scenes depict a specific application and should not be overridden by
  abstract intent classes.
- `<framing-intent>` produces **overlay** or **structural** components
  (WebcamOverlay, SplitScreen, TransitionWipe, etc.) that may be
  *combined with* a content component rather than replacing it. The
  router should note this in `rationale`.
- `<fallback-intent>` routes to TitleCard, SlideRenderer, or defers to
  `foundry_image_gen` (AI image) depending on the scene's content density.

---

## Intent → component routing table

This is the heart of the skill. Every component in the `KNOWN_COMPONENTS`
registry (`render/lib/scf-to-html.mjs`) has exactly one row. Components
not in the registry are excluded — the router MUST NOT recommend
unregistered components.

### Metric-intent components

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| metric | KPI, metric, stat, uptime, latency, throughput, SLA, SLO, P95/P99, "X% improvement", headline number, delta, trend | `MetricsCard` | `DataChart`, `SlideRenderer` | `value`, `delta`, `trendDirection`, `unit` | Reject MetricsCard when scene has 3+ KPIs — use DataChart bar/donut instead. Reject when the number is embedded in a longer narrative without emphasis. |
| metric, comparison | chart, graph, bar chart, donut, pie, line chart, area chart, "show the numbers", quarterly results, growth trend, breakdown, distribution, "X grew Y%", animated chart | `DataChart` | `MetricsCard`, `SlideRenderer` | `chartType`, `labels`, `values`, `unit`, `animateReveal` | Reject DataChart when only 1 data point (use MetricsCard). Consider `structured_image` tool (bar_chart or donut_chart type) only when the user explicitly needs pixel-perfect static numbers for audit or print fidelity. |

### Comparison-intent components

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| comparison | before/after, vs, "with vs without", old vs new, legacy vs modern, classical vs ML, sweep between two images | `CompareSlider` | `SplitScreen` | `leftSrc`, `rightSrc`, `leftLabel`, `rightLabel` | Reject CompareSlider when both sides show *different* subjects rather than two states of the same subject — use SplitScreen. For text-heavy comparisons, prefer `PricingTable` or `ExcelScene` component. |
| comparison, framing | split screen, side by side, "show both", two views, dual-pane, "left shows X, right shows Y", comparison where both sides stay fully visible | `SplitScreen` | `CompareSlider`, `SlideRenderer` | `leftContent`, `rightContent`, `dividerPosition`, `layout` | Reject SplitScreen when both sides show the same subject in two states — use CompareSlider. Reject when one side is a person (use WebcamOverlay + content instead). |

### Proof-intent components

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| proof | testimonial, quote, "as our CEO said", customer voice, executive statement, pull quote, "one customer told us", "according to" | `Quote` | `SlideRenderer`, `CalloutBox` | `text`, `author`, `authorTitle`, `photoSrc` | Reject Quote when the scene's primary purpose is a metric with a supporting quote — MetricsCard + narration is better. Reject when the quote is > 3 sentences (use SlideRenderer with body text). |
| proof, framing | closing CTA, "get started", "learn more", "sign up", "contact us", final ask, conclusion | `CTABlock` | `BrandOutro`, `SlideRenderer` | `headline`, `body`, `buttonLabel`, `buttonUrl` | Reject CTABlock when the closing is purely brand-sign-off with no actionable ask — use BrandOutro. |

### Training-intent components

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| training | numbered steps, checklist, tutorial, "1.… 2.… 3.…", onboarding flow, "first… then… finally", how-to, step, module | `StepByStep` | `SlideRenderer`, `TerminalScene` | `steps`, `currentStep`, `checkmarkStyle` | Reject StepByStep when steps are CLI commands — use TerminalScene. Reject when steps exceed 7 (split into two scenes). |

### Event-intent components

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| event, framing | presenter webcam, talking head, face-cam, PiP, founder explaining, expert commentary, "keep a human in frame", speaker in corner, host overlay | `WebcamOverlay` | `LowerThird` | `position`, `size`, `shape`, `borderColor` | Reject WebcamOverlay when no presenter video/image is available. Reject when the presenter should fill the frame — use an AI-generated portrait (via `foundry_image_gen`) as an image layer instead. |
| event | speaker name, presenter intro, name + title bar, attribution, "our guest", lower-third identification | `LowerThird` | `SlideRenderer` | `name`, `title`, `position`, `animation` | Reject LowerThird when the name/title is the *entire* scene content — use TitleCard or SlideRenderer. LowerThird is an overlay, not a primary scene component. |

### Workflow-intent components

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| workflow | architecture, system architecture, service map, topology, dependency graph, component diagram, integration flow, microservices, boxes and arrows, data flow with sequential reveal | `ArchitectureDiagram` | `DataFlow`, `SlideRenderer` | `nodes`, `edges`, `revealMode`, `layout` | Reject ArchitectureDiagram when the diagram has > 12 nodes or cyclic/mesh topology — defer to `foundry_image_gen` with architecture-diagram prompt (displayed via image layer). |

### Surface-intent components

Each Microsoft synthetic surface maps to exactly one component. When the
narration describes actions happening *inside* a specific application, route
to that application's `*Scene` component. These components simulate the
application chrome synthetically — no screen capture needed.

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| surface | terminal, CLI, command line, "run this command", install flow, deploy walkthrough, npm/yarn/pip/cargo, kubectl, az, git, docker, "watch as I run", build output | `TerminalScene` | `VSCodeScene` | `commands`, `prompt`, `theme`, `title` | Reject TerminalScene when the demo is about an IDE feature, not CLI — use VSCodeScene. |
| surface | VS Code, IDE walkthrough, "open the file", typing code, IntelliSense, gutter marker, integrated terminal, editor demo | `VSCodeScene` | `TerminalScene`, `GitHubScene` | `fileName`, `language`, `steps`, `theme` | Reject VSCodeScene when the demo is purely CLI with no editor context — use TerminalScene. |
| surface | Azure portal, resource blade, "click Create", subscription picker, ARM resource, Azure UI walkthrough, portal field input | `AzurePortalScene` | `EdgeBrowserScene` | `resourceType`, `bladeName`, `steps`, `theme` | Reject AzurePortalScene when the demo is about Azure CLI commands, not the portal UI — use TerminalScene. |
| surface | GitHub, pull request, code review, merge, GitHub Actions run, commit history, repo navigation, PR discussion | `GitHubScene` | `EdgeBrowserScene`, `VSCodeScene` | `repoName`, `viewType`, `steps`, `theme` | Reject GitHubScene when the PR review is shown inside VS Code's GitHub extension — use VSCodeScene. |
| surface | browser, web app demo, address bar, "navigate to", DevTools, page load, tab open, generic SaaS surface | `EdgeBrowserScene` | `ScreenDemoFrame` | `url`, `pageTitle`, `steps`, `theme` | Reject EdgeBrowserScene when a specific Microsoft app surface applies (Teams, Outlook, etc.) — use the dedicated `*Scene`. |
| surface | Microsoft Teams, chat, channel, mention, reaction, meeting join, screen share, Teams collaboration | `TeamsScene` | `OutlookScene` | `viewType`, `channelName`, `steps`, `theme` | Reject TeamsScene when the scene is about Outlook email, not Teams chat — use OutlookScene. |
| surface | Outlook, inbox, email arrival, compose, send, attach, calendar invite, mail workflow, "an email comes in" | `OutlookScene` | `TeamsScene` | `viewType`, `sender`, `steps`, `theme` | Reject OutlookScene when the scene is about Teams messages, not email — use TeamsScene. |
| surface | Excel, spreadsheet, formula, cell recompute, pivot, chart insert, "in cell B5", workbook demo | `ExcelScene` | `DataChart` | `cellRange`, `formulaBar`, `steps`, `theme` | Reject ExcelScene when the scene is about chart data visualization without Excel chrome — use DataChart. |
| surface | PowerPoint editing demo, deck *being built*, slide transition demo, Designer suggestion, "show me PowerPoint" | `PowerPointScene` | `SlideRenderer` | `slideTitle`, `steps`, `theme` | Reject PowerPointScene when the video needs a plain branded slide without PowerPoint app chrome — use SlideRenderer. |
| surface | Power BI, report, slicer, drill-down, KPI tile, tooltip, BI dashboard demo | `PowerBIScene` | `DataChart`, `MetricsCard` | `reportName`, `viewType`, `steps`, `theme` | Reject PowerBIScene when the scene is a standalone chart not inside the Power BI UI — use DataChart. |
| surface | Microsoft Fabric, lakehouse, notebook cell, data pipeline, OneLake, Fabric workspace | `FabricScene` | `TerminalScene`, `VSCodeScene` | `workspaceName`, `viewType`, `steps`, `theme` | Reject FabricScene when the scene is about a Fabric CLI command, not the portal — use TerminalScene. |
| surface | Windows desktop, taskbar, Start menu, window drag, toast notification, OS-level demo | `WindowsScene` | `EdgeBrowserScene` | `focusApp`, `steps`, `theme` | Reject WindowsScene when the demo is about a specific app running on Windows — use the app's dedicated `*Scene`. |
| surface | M365 admin center, tenant, user provisioning, policy assign, compliance check, IT admin workflow | `AdminCenterScene` | `AzurePortalScene`, `EdgeBrowserScene` | `viewType`, `policyName`, `steps`, `theme` | Reject AdminCenterScene when the admin task is in the Azure portal (subscription-level), not the M365 admin center — use AzurePortalScene. |

### Framing-intent components

Framing components provide structure, transitions, or overlays. They often
*wrap* a content component rather than replacing it. The router should note
in `rationale` when a framing component is recommended as an overlay.

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| framing | chapter break, act break, "now let's switch to", "moving on", section divider, segment intro, "Part 2", "Chapter 3", wipe, transition | `TransitionWipe` | `TitleCard`, `SlideRenderer` | `label`, `style`, `direction` | Reject TransitionWipe for more than 3 per video — overuse fragments the narrative. Reject when the "break" is actually a full title scene with multiple text elements — use TitleCard or SlideRenderer. |
| framing | "wrap in browser frame", phone mockup, tablet demo, macOS window, product demo, app screenshot, "show this on mobile", marketing-style framed asset, device frame | `ScreenDemoFrame` | `EdgeBrowserScene` | `deviceType`, `contentSrc`, `caption`, `theme` | Reject ScreenDemoFrame when the demo is interactive (steps, typing) — use the appropriate `*Scene` component. ScreenDemoFrame is for static or pre-rendered content in a device bezel. |
| framing | presentation slide, deck slide, "slide that says…", keynote-style, executive summary, title slide, opening slide, agenda, recap, "summarize in 3 bullets", conference-talk frame | `SlideRenderer` | `TitleCard` | `headline`, `bullets`, `layout`, `backgroundSrc` | Reject SlideRenderer when the scene is a single title with no body content — use TitleCard. Reject when the content is a PowerPoint-editing demo — use PowerPointScene. |
| framing | annotated region, "explain this area", callout with detail, tooltip on screenshot, labelled photo, technical annotation, side-of-image card, 2+ sentence callout | `CalloutBox` | `CalloutPin` | `targetSrc`, `calloutText`, `position`, `pointerDirection` | Reject CalloutBox when the annotation is ≤ 12 words and needs a precise pin — use CalloutPin. |

### Fallback / structural components

These components are typically selected by pipeline convention (brand
framing) or by explicit user request, not by intent classification.

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| fallback (opening) | brand intro, logo reveal, opening animation, company intro | `BrandIntro` | `TitleCard` | `logoSrc`, `companyName`, `tagline`, `duration` | Reject BrandIntro when no brand package is configured and the user hasn't provided a logo. Use TitleCard with a text-only opening instead. |
| fallback (closing) | brand outro, closing card, end screen, thank you, contact info | `BrandOutro` | `CTABlock` | `logoSrc`, `companyName`, `contactInfo`, `socialLinks` | Reject BrandOutro when the closing needs an actionable CTA with a button — use CTABlock. |
| fallback (title) | title card, full-screen title, scene heading, act title, "big text" | `TitleCard` | `SlideRenderer`, `TransitionWipe` | `title`, `subtitle`, `backgroundSrc`, `alignment` | Reject TitleCard when the scene needs body text, bullets, or layout beyond a title + subtitle — use SlideRenderer. |
| fallback (overlay) | captions, subtitles, word highlight, karaoke text, sentence reveal | `AnimatedCaption` | — | `style`, `position`, `fontSize`, `highlightColor` | AnimatedCaption is an overlay, not a primary scene component. It is typically auto-attached by the compose stage, not explicitly routed. Reject as primary when the user asks for a full subtitle track — that is handled by `subtitle_gen` tool, not a component. |
| fallback (annotation) | "this part of the UI", "look here", "notice the X", annotated screenshot, point out, highlight on image, pin, ≤ 12-word label | `CalloutPin` | `CalloutBox` | `targetSrc`, `pinX`, `pinY`, `label` | Reject CalloutPin when the annotation text exceeds 12 words — use CalloutBox. Reject when there is no base image to annotate. |

---

## Output contract

The router produces one recommendation object per scene. The shape below
extends the proposal §4.1 contract with a `deferTo` field that signals
when the router yields to a non-component rendering path.

```json
{
  "primary": "MetricsCard",
  "alternates": ["DataChart", "SlideRenderer"],
  "confidence": 0.88,
  "rationale": [
    "narration contains 'improved latency by 40%' — metric-intent match",
    "single KPI dominates the scene",
    "audience persona = engineering leadership"
  ],
  "seedProps": {
    "value": "40%",
    "delta": "-40%",
    "trendDirection": "down",
    "unit": "ms"
  },
  "rejects": [
    {
      "component": "DataChart",
      "reason": "single data point; DataChart adds unnecessary chart overhead"
    },
    {
      "component": "Quote",
      "reason": "narrative role is metric presentation, not testimonial"
    }
  ],
  "deferTo": null
}
```

### `deferTo` field

The `deferTo` field tells the pipeline which **asset generation path** to
take when no component is a good fit. Its values name the tool pipeline,
NOT scene-level JSON fields. The downstream pipeline calls the named tool,
then wraps the output in an appropriate component or layer.

| Value | Meaning | Pipeline action |
|---|---|---|
| `null` | The router has a component recommendation. Use `primary`. | — |
| `"structured_image"` | The scene needs exact text/data rendered deterministically. | Call `structured_image` tool → display PNG via `ScreenDemoFrame`, `SlideRenderer`, or `image` layer. See [`structured-visuals.md`](structured-visuals.md). |
| `"ai_image"` | No component fits; generate an AI image via Foundry image routing. | Call `foundry_image_gen` tool → display via `image` layer (or `ScreenDemoFrame` for tech content). |
| `"ai_video"` | The scene needs motion/dynamic action. | Call `foundry_video_gen` tool (Sora-2; 4/8/12s) → display clip via `video` layer. |

When `deferTo` is non-null, `primary` SHOULD be `null`, `alternates`
SHOULD be `[]`, and `seedProps` SHOULD be `{}`. The `rationale` and
`rejects` arrays should still explain why the router deferred.

Example deferred output:

```json
{
  "primary": null,
  "alternates": [],
  "confidence": 0.95,
  "rationale": [
    "narration says 'Here is the full JSON request body' — exact text required",
    "structured_image tool (code type) with highlight_line is the deterministic path"
  ],
  "seedProps": {},
  "rejects": [
    {
      "component": "TerminalScene",
      "reason": "TerminalScene simulates typing; this scene displays static JSON"
    }
  ],
  "deferTo": "structured_image"
}
```

---

## Worked examples

### Example 1 — Clear KPI scene → MetricsCard

**Input narration:**
> "Since launching the new caching layer, our API latency improved by 62%,
> dropping from 340 milliseconds to just 129 milliseconds."

**Audience:** Engineering leadership

**Router analysis:**
- `<metric-intent>` matches: "latency", "improved by", "62%", "milliseconds"
- Single dominant KPI — MetricsCard preferred over DataChart
- No surface keywords, no governance language

**Output:**
```json
{
  "primary": "MetricsCard",
  "alternates": ["DataChart", "SlideRenderer"],
  "confidence": 0.92,
  "rationale": [
    "narration contains 'latency improved by 62%' — strong metric-intent",
    "single KPI with before/after — MetricsCard counter + delta arrow",
    "audience = engineering leadership — technical metric framing appropriate"
  ],
  "seedProps": {
    "value": "129ms",
    "delta": "-62%",
    "trendDirection": "down",
    "unit": "ms"
  },
  "rejects": [
    {
      "component": "DataChart",
      "reason": "single data point; no multi-series comparison"
    },
    {
      "component": "CompareSlider",
      "reason": "no visual images to compare — this is a numeric metric"
    }
  ],
  "deferTo": null
}
```

### Example 2 — Ambiguous scene with two competing components

**Input narration:**
> "Let's look at how our three product tiers compare. The Starter plan
> includes 5 GB storage, the Pro plan offers 50 GB, and Enterprise gives
> you unlimited storage with priority support."

**Audience:** Sales / external prospects

**Router analysis:**
- `<comparison-intent>` matches: "compare", "tier"
- `<metric-intent>` partial match: "5 GB", "50 GB" (quantities present)
- Three items with feature breakdown — this is tabular comparison data
- CompareSlider needs two visual images (mismatch)
- SplitScreen handles two panes, not three tiers
- DataChart could show a bar chart of storage amounts
- But precise text ("5 GB", "50 GB", "unlimited") must be readable

**Output:**
```json
{
  "primary": "DataChart",
  "alternates": ["SlideRenderer", "SplitScreen"],
  "confidence": 0.61,
  "rationale": [
    "narration contains 'tiers compare' — comparison-intent",
    "three data points with units — DataChart bar can animate the reveal",
    "audience = sales; visual impact matters more than raw data precision",
    "confidence is moderate — SlideRenderer with bullets is a strong alternate"
  ],
  "seedProps": {
    "chartType": "bar",
    "labels": ["Starter", "Pro", "Enterprise"],
    "values": [5, 50, null],
    "unit": "GB"
  },
  "rejects": [
    {
      "component": "CompareSlider",
      "reason": "three tiers, not a binary A/B comparison"
    },
    {
      "component": "MetricsCard",
      "reason": "no single dominant KPI — three-way comparison"
    }
  ],
  "deferTo": null
}
```

> **Note:** If the user or director prefers exact text rendering for the
> tier details, they may override to `"deferTo": "structured_image"` with
> table type. The moderate confidence (0.61) signals this ambiguity.

### Example 3 — Surface scene → AzurePortalScene

**Input narration:**
> "Watch as I deploy the new function app via the Azure portal. I'll click
> Create, select the consumption plan, and configure the runtime stack."

**Audience:** Developer tutorial

**Router analysis:**
- `<surface-intent>` matches: "Azure portal"
- `<event-intent>` partial match: "demo" (implied by walkthrough)
- Surface keyword maps directly to `AzurePortalScene`
- Surface-intent takes priority — the scene is *about* the portal UI

**Output:**
```json
{
  "primary": "AzurePortalScene",
  "alternates": ["EdgeBrowserScene"],
  "confidence": 0.96,
  "rationale": [
    "narration explicitly mentions 'Azure portal' — surface-intent",
    "scene describes interactive steps (click Create, select plan) — synthetic surface",
    "AzurePortalScene renders portal chrome with step-by-step field input"
  ],
  "seedProps": {
    "resourceType": "Function App",
    "bladeName": "Create Function App",
    "steps": [],
    "theme": "dark"
  },
  "rejects": [
    {
      "component": "TerminalScene",
      "reason": "demo is portal-based, not CLI-based"
    },
    {
      "component": "EdgeBrowserScene",
      "reason": "dedicated AzurePortalScene provides richer portal fidelity"
    }
  ],
  "deferTo": null
}
```

### Example 4 — Router DEFERS to `structured_image` tool

**Input narration:**
> "Here is the full JSON request body that the publisher sends to the
> ingestion API. Notice the contentType field on line 4 — that's what
> triggers the validation pipeline."

**Audience:** Engineering / API consumers

**Router analysis:**
- Narration says "full JSON request body" — exact text the audience must read
- "line 4" reference implies code with line numbers
- Routing precedence rule 2 fires: deterministic rendering via `structured_image` tool
- TerminalScene simulates *typing*; this scene displays *static* JSON
- `structured_image` tool (code type, `highlight_line: 4`) → PNG → `ScreenDemoFrame`

**Output:**
```json
{
  "primary": null,
  "alternates": [],
  "confidence": 0.97,
  "rationale": [
    "narration says 'full JSON request body' — exact text required",
    "references specific line number — deterministic code rendering needed",
    "structured_image tool (code type) with highlight_line renders this accurately"
  ],
  "seedProps": {},
  "rejects": [
    {
      "component": "TerminalScene",
      "reason": "TerminalScene simulates interactive typing; this is a static code display"
    },
    {
      "component": "VSCodeScene",
      "reason": "no IDE interaction described; plain code block suffices"
    }
  ],
  "deferTo": "structured_image"
}
```

### Example 5 — Router DEFERS to `ai_image`

**Input narration:**
> "Imagine a futuristic command center where analysts monitor global
> threat feeds in real time, holographic displays lighting up the room."

**Audience:** Executive keynote

**Router analysis:**
- No component keywords match — this is a conceptual/artistic scene
- No structured data, no specific app surface, no metric
- `<fallback-intent>` applies → AI image generation is the right path
- `foundry_image_gen` (gpt-image-2) handles "futuristic" concept art

**Output:**
```json
{
  "primary": null,
  "alternates": [],
  "confidence": 0.90,
  "rationale": [
    "no component intent matches — conceptual/artistic scene",
    "no exact data to render deterministically",
    "AI image generation best captures 'futuristic command center' concept"
  ],
  "seedProps": {},
  "rejects": [
    {
      "component": "ArchitectureDiagram",
      "reason": "no real system topology — this is a conceptual illustration"
    }
  ],
  "deferTo": "ai_image"
}
```

---

## Self-check checklist

After the router produces a recommendation for each scene, the agent MUST
verify the following before incorporating the recommendation into the scene
plan:

- [ ] **`primary` component is in `KNOWN_COMPONENTS`** — cross-reference
      against `render/lib/scf-to-html.mjs`. If the component is not
      registered, the SCF compiler will throw `Unknown SCF component`.
- [ ] **Every component in `alternates` is in `KNOWN_COMPONENTS`** — same
      rule. Do not recommend unbuilt Phase II proposals as alternates.
- [ ] **`seedProps` keys are valid for the primary component** — load the
      component's skill file from `skills/core/components/` and verify the
      prop names exist in its schema.
- [ ] **`rationale` references at least one trigger keyword from the
      narration** — this ensures the routing decision is traceable to the
      input, not fabricated.
- [ ] **`rejects` array includes at least one plausible alternative** —
      the router should explain what it *didn't* pick and why. Empty
      rejects suggest the router didn't consider alternatives.
- [ ] **`confidence` is calibrated** — 0.85+ means strong single match;
      0.60–0.84 means ambiguity between two viable components; below 0.60
      should trigger a user checkpoint ("I'm not sure which component fits
      best — here are my options…").
- [ ] **`deferTo` is consistent with `primary`** — if `deferTo` is
      non-null, `primary` MUST be `null`. If `primary` is non-null,
      `deferTo` MUST be `null`.
- [ ] **Routing precedence was applied in order** — verify that explicit
      user choice (rule 1) wasn't overridden, that `structured_image`
      deference (rule 2) was checked, and that governance safety (rule 3)
      was evaluated.
- [ ] **Framing components are flagged as overlays when appropriate** —
      WebcamOverlay, LowerThird, AnimatedCaption, and CalloutPin/Box are
      overlays that may combine with a primary content component. The
      `rationale` should note when an overlay is recommended alongside a
      content component, not as a replacement.
- [ ] **Surface scenes are not diluted** — when `<surface-intent>` matches,
      the primary should be the specific `*Scene` component, not a generic
      alternative. Surface keywords have a 1:1 component mapping.

---

## Component coverage summary

The routing table above covers all **32** components in the
`KNOWN_COMPONENTS` registry:

**Framing primitives (5):** BrandIntro, BrandOutro, TitleCard, LowerThird,
AnimatedCaption

**Content components (8):** MetricsCard, Quote, CalloutPin, CompareSlider,
ArchitectureDiagram, StepByStep, CTABlock, DataChart

**Synthetic surfaces (13):** TerminalScene, VSCodeScene, AzurePortalScene,
GitHubScene, EdgeBrowserScene, TeamsScene, OutlookScene, ExcelScene,
PowerPointScene, PowerBIScene, FabricScene, WindowsScene, AdminCenterScene

**Framing / overlay / structure (6):** CalloutBox, WebcamOverlay,
TransitionWipe, SlideRenderer, ScreenDemoFrame, SplitScreen

### Intentionally excluded

- **CodeWalkthrough** — exists as a directory under `render/components/`
  but is **not registered** in `KNOWN_COMPONENTS`. Per CONTRACT.md §2, an
  unregistered component is dead code. The router MUST NOT recommend it.
  If CodeWalkthrough is registered in a future PR, add a row to the
  workflow-intent section with triggers: code walkthrough, line-by-line
  code explanation, syntax highlight.

- **Roadmap, BurnDown, OKRStatus, ReleaseNotes** — shipped in PR 4 and
  discoverable through their per-component skills. Dedicated routing rows are
  still pending; until they land, combine the `timeline-intent` grammar with
  those component skills.

- **TeamGrid** — still a Phase II §3.3 proposal. Not yet built or registered.

- **APITrace, LogReplay, SystemHealth** — Phase II §3.4 proposals
  (Engineer persona). Not yet built or registered. When built, add rows
  to workflow-intent.

- **CustomerStory, PricingTable, CompetitiveMatrix, ROICalculator** —
  shipped in PR 3. Routing rows live in the new "Sales / GBB
  seller-narrative components (PR 3)" section below.

- **Quiz, TerminologyCard, ProgressBar, TerminalCast, PresenterBug,
  EventBranding, AskTheAudience, LoopScene, WhiteboardScene, StreamScene,
  ListsScene, PlannerScene, OneDriveScene, FormsScene, BookingsScene** —
  shipped and registered. Discover them through their per-component skills
  and the `training-intent` / `surface-intent` grammar until dedicated rows
  are added here.

---

## Governance-intent gap

The proposal §4.1 defines `<governance-intent>` matching compliance,
policy, audit, evidence, data flow, threat, encryption, and classification.
No registered component exists today for governance scenes. The router
handles this as follows:

1. Governance keywords are still matched by the grammar.
2. The router logs a `rejects` entry: `"no registered governance component;
   deferring"`.
3. Depending on scene content:
   - Data flow / architecture → route to `ArchitectureDiagram` (best available)
   - Evidence table / audit data → `deferTo: "structured_image"` (table type)
   - Policy text / legal → `deferTo: "structured_image"` (code or table type) or
     `"ai_image"` with compliance-themed prompt
4. When Phase II governance components (AuditTrail, PolicyEnforcement,
   ComplianceBadgeWall, DataFlow) are registered, this gap closes
   automatically.

> **Status (PR 2 — 2026-04):** All four governance components are now
> registered. The router SHOULD use the governance routing table below
> instead of the `structured_image` fallback for matched scenes. For
> governance scenes that don't match any of the four (e.g., raw legal text),
> create a new component via sub-agent rather than using `structured_image`.

### Governance-intent components

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| governance (compliance / certifications) | SOC 2, ISO 27001, HIPAA, FedRAMP, GDPR, NIST, PCI DSS, CSA STAR, HITRUST, certified, attested, accredited, "in scope", "meets standard", trust signals, badges, attestations | `ComplianceBadgeWall` | `SlideRenderer` | `badges[]` (id, name, status, region), `spotlight`, `footer` | Reject ComplianceBadgeWall when only one cert is mentioned in passing — use a callout. Reject when audience needs the certification *details* (clauses, scopes) — defer to `structured_image` tool (table type), displayed via `SlideRenderer`. |
| governance (data flow / lineage) | data flow, data movement, lineage, ingest→store→export, classification, encryption at rest/in transit, residency, sovereignty, cross-border, GDPR transfer, ETL, gateway, hand-off | `DataFlow` | `ArchitectureDiagram` | `mode` (`linear`/`mesh`), `stages[]`, `edges[]` (encrypted, classification), `legend`, `callouts[]` | Reject DataFlow when the scene is a system-architecture diagram (services + dependencies) without a directional data path — use ArchitectureDiagram. |
| governance (audit / activity log) | audit trail, audit log, activity log, "who did what when", evidence, retention, attested actions, compliance log, change log, immutable record, SOX trail | `AuditTrail` | `SlideRenderer` | `events[]` (timestamp, actor, action, target, result, correlationId, highlighted), `retentionNote`, `exportRef` | Reject AuditTrail when the scene needs to compare *two* audit logs side-by-side — defer to `structured_image` tool (table type). Reject when only 1-2 events are mentioned — use `CalloutBox`. |
| governance (policy / access decision) | policy, access control, RBAC/ABAC, allow/deny, redact, challenge, MFA prompt, conditional access, policy evaluation, "the system blocked", "the system allowed", role check, device check, classification check | `PolicyEnforcement` | `StepByStep`, `ArchitectureDiagram` | `request`, `checks[]` (name, outcome), `decision` (allow/deny/challenge/redact), `auditRef` (`"<audit-scene-id>#<event-id>"`), `ruleCitation`, `layout` (`funnel`/`decision-tree`) | Reject PolicyEnforcement when the scene describes a multi-step user journey rather than a single access decision — use StepByStep. The `auditRef` field is a visual chip only — it does NOT cross-link runtime; pair with an `AuditTrail` scene that contains the referenced event id. |

### Cross-cutting / overlay components (PR 5)

These four components are **not** primary scene content — they are
chapter markers, ambient layers, or governance overlays. The router
selects them in addition to (not instead of) the scene's primary
component. `AudienceSafe`, `ScrollingBackground`, and `Disclaimer` are
typically composed as overlay layers; `SectionDivider` is a full-scene
chapter card with no other primary component.

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| chapter / section transition | chapter, part, section, phase, "next up", "moving on", "let's look at", episode, module, lesson break, act, segment, topic shift, intermission | `SectionDivider` | `TitleCard` | `chapter` (number/string), `totalChapters`, `title`, `subtitle`, `numeralScaleStartSec`, `titleWipeStartSec`, `subtitleFadeStartSec`, `progressTickStartSec` | Reject SectionDivider when the scene is opening the entire video — use `TitleCard` or `BrandIntro`. Reject when no chapter/numeral is implied — use `TitleCard`. |
| ambient background layer | ambient background, scrolling backdrop, parallax, motion wallpaper, looping pattern, animated gradient, "subtle motion behind the content", continuous backdrop | `ScrollingBackground` | (none — defer to static image) | `pattern`, `direction`, `speed`, `colorTokens` | Reject ScrollingBackground when the background needs to be a literal photograph or screenshot — use an AI-generated image layer (via `foundry_image_gen`). Never use as the primary component of a scene. **No narration anchors** — the sync skill skips this component. |
| audience-tier marker (overlay) | audience watermark, "internal only", "for partners", "executive only", "regulated audience", confidentiality marker, classification banner, deliveryProfile watermark | `AudienceSafe` | (none — overlay only) | `tier` (`info`/`warn`), `label`, `appearStartSec`, `pulseStartSec` (warn only) | Reject AudienceSafe as a primary component — it is an overlay. Reject when the scene already uses a fully bespoke watermark via a separate image layer or `structured_image` render. |
| legal / compliance disclaimer | disclaimer, legal notice, forward-looking statement, safe-harbor, "subject to change", "not financial advice", "illustrative only", "demo data", "non-production", regulatory statement, attestation chip | `Disclaimer` | `TitleCard` (for scene-end variant) | `variant` (`footer`/`modal`/`scene-end`), `body`, `mustAcknowledge`, `revealStartSec`, `acknowledgeChipStartSec` | Reject Disclaimer when the legal text is a one-line subtitle — use `LowerThird` or scene caption. For scene-end variant, the disclaimer IS the scene; for footer/modal, it overlays a host scene. |

### Sales / GBB seller-narrative components (PR 3)

These four components serve sales, FastTrack, and GBB seller scenes:
proof points, pricing presentations, competitive comparisons, and ROI
walk-throughs. They are primary scene content (not overlays). Hard caps
(tiers ≤ 4, features ≤ 12, metrics ≤ 6, inputs ≤ 8) are enforced in
schema; when narration exceeds the cap the router MUST `deferTo:
"structured_image"` (table type).

| Intent class | Trigger keywords | Primary | Alternates | Seed-prop hints | Reject reasons |
|---|---|---|---|---|---|
| proof / testimonial | customer, case study, testimonial, "X chose us", "X reduced", customer quote, hero customer, logo + quote + metrics, "in their words", reference customer, proof point | `CustomerStory` | `Quote`, `MetricsCard` | `customerName`, `industry`, `quote`, `attribution{name,title,photoSrc}`, `metrics[]` (≤6), `logoSrc`, `industryIconSrc` | Reject CustomerStory when there is NO attributed quote (just metrics) — use `MetricsCard` + `LowerThird`. Reject when the quote is generic / unattributed — use `Quote`. Reject when ≥ 2 customers' stories are stacked in one scene — split into separate scenes. |
| pricing / tier presentation | pricing, plans, tiers, "Free / Pro / Enterprise", "per user / month", subscription tiers, price comparison, "what's included", recommended plan, billing cadence, CTA per tier | `PricingTable` | `SlideRenderer` | `title`, `tiers[]` (≤4) (id, name, price, billing, features[≤8], ctaLabel, recommended), `recommendedTierId`, `disclaimer` | Reject PricingTable when ≥ 5 tiers are mentioned — defer to `structured_image` tool (table type). Reject when only one plan is described (no comparison) — use `CTABlock`. Reject for usage-based / per-API-call pricing detail — defer to `structured_image` tool (table type; the component shows fixed-tier pricing only). The `cards`/`comparisonMode` layouts are deferred (Lane A ships `columns` only). |
| competitive comparison | competitive comparison, "us vs them", feature parity, "how we compare", competitor matrix, checkmark grid, yes/no/partial, "we have it, they don't", capability comparison, vendor evaluation, RFP response | `CompetitiveMatrix` | `SlideRenderer` | `title`, `products[]` (≤4) (id, name, logoSrc, isUs), `features[]` (≤12) (id, label, category, ratings{productId: yes/partial/no/n-a or {value, note}}), `highlightProductId`, `disclaimer`, `footnotes[]` (≤4) | Reject CompetitiveMatrix when ≥ 5 products or ≥ 13 features are needed — defer to `structured_image` tool (table type). Reject when narration is purely qualitative ("we're better") with no per-feature ratings — use `Quote` + `MetricsCard`. CompetitiveMatrix REQUIRES at least one of `disclaimer` or `footnotes` (source attribution) — schema enforces. |
| ROI / business case | ROI, return on investment, payback, savings calculation, "annual savings", TCO, total cost of ownership, cost-benefit, business case, "X hours saved × Y rate", break-even, sensitivity analysis, what-if, "the formula", business value | `ROICalculator` | `MetricsCard`, `SlideRenderer` | `title`, `inputs[]` (≤8) (id, label, value, unit, source), `formula{template, tokens[]}`, `result{value, unit, label}`, `steps[]` (description, value), `sensitivity[]` (inputId, range, impact), `disclaimer` | Reject ROICalculator when only a single big number is shown (no inputs / formula) — use `MetricsCard`. Reject when the calculation has > 8 inputs — split into multiple scenes or defer to `structured_image` tool (table type). Reject when there is no formula (just a list of savings) — use `StepByStep` or `MetricsCard` strip. The token highlighter requires unique input IDs that appear verbatim in `formula.template`. |

---

## Relationship to the Phase II intelligence chain

This skill is one of three intelligence-layer skills defined in the
Phase II proposal §4.4. They form a coherent chain:

1. **`scene-component-routing`** (this skill, `skills/core/`) — picks the
   component. Runs at `scene_plan` stage.
2. **`narration-component-sync`** (`skills/meta/`) — times the component's
   reveal cues to actual narration duration. Runs after TTS generation.
3. **`brand-package-linting`** (`skills/meta/`) — verifies the SCF draft
   and component props against brand package rules. Runs before render.

The chain is: **pick → time → verify**. This skill is the entry point.
The other two skills live under `skills/meta/` and run AFTER this one.
Together, they form the minimum viable intelligence layer for a component
catalog that will grow from 32 registered components today to 50+ as
Phase II builds out.

---

## Provenance

This skill is **partially research-grounded**. Sources consulted are tracked
in `.internal/research-notes-phase2-sources.md` §1.

### Research-derived
- **Scene as the unit of routing.** Synthesia, Pictory, InVideo, and Runway
  all treat the scene (not the whole video) as the planning primitive. Source:
  research-notes §1 (4 vendor docs).
- **Routing happens before asset generation.** Pictory and Runway both
  emphasize storyboard/shot planning before generation spend. Source: same.
- **Persona-keyed catalog over blank canvas.** InVideo's template catalog
  signals enterprise users expect curated component sets per use case. Source:
  research-notes §1 (InVideo).

### Invented / Slate-specific
- **6-rule precedence ladder** (explicit `component` > `structured_image` tool >
  `ai_video` > intent-keyword match > scene position heuristic > default
  fallback). No external source — designed for Slate's SCF semantics.
- **Scene-intent BNF grammar.** Invented for this skill. May need revision
  once first 5+ user briefs run through the router.
- **32-row routing keyword table.** Built from CONTRACT.md component list,
  not from any external corpus. Will accumulate keyword gaps; revise quarterly.
- **`deferTo` field semantics.** Invented for yielding to non-component
  asset-generation paths (`structured_image`, `ai_image`, `ai_video`).
  These name the tool pipeline, not scene JSON fields.

### Validation plan
First real consumer is PR 2 (Compliance/Security components). Each new
component PR adds a routing-table row and is a chance to stress-test the
precedence ladder. If the same routing decision conflicts surface twice,
revisit the ladder.

### Prior-art validation (post-research, 2026-04-18)
Targeted prior-art research (logged in `.internal/research-notes-phase2-sources.md`)
confirmed the existing grounding is sufficient. No corrections needed.

- **Scene-level routing before asset spend** is the dominant pattern across
  Synthesia (templates), Pictory (storyboard), InVideo (templates), and
  Runway (storyboard planning). Source: research-notes §1.
- **No authoritative source** for a precedence ladder, intent BNF, or
  keyword routing table was found. Those remain Slate-specific design
  choices, validated by use rather than by citation.
