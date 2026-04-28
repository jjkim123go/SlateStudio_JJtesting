# ROICalculator Component

> Layer 2 component skill. Load when an explainer needs a **structured ROI
> breakdown** — inputs, formula, result, and optional sensitivity analysis.
> This is the densest narrative component: it walks the viewer through a
> business-case calculation step by step, with formula token highlighting
> designed for future narration sync.

## When to use

**Trigger vocabulary:** `ROI, return on investment, cost-benefit, payback,
savings, business case, TCO, total cost of ownership, break-even, "how much
you save", "what it's worth", formula, calculation, sensitivity, "if X
varies"`.

Pick `ROICalculator` when the narrative needs to **show work** — not just a
final number (that's `MetricsCard`) but the inputs, formula, and reasoning
that produce it. If you only have a result number with no formula, use
`MetricsCard`. If you have a quote about ROI, pair `ROICalculator` with
`CustomerStory`.

## Props

```json
{
  "title": "Annual ROI from automation",
  "inputsJson": "[{\"id\":\"users\",\"label\":\"Active users\",\"value\":12000,\"source\":\"license-export\"},{\"id\":\"hoursSaved\",\"label\":\"Hours saved / user / month\",\"value\":3.5},{\"id\":\"hourlyRate\",\"label\":\"Avg hourly rate\",\"value\":45,\"unit\":\"USD\"},{\"id\":\"licenseCost\",\"label\":\"Annual license cost\",\"value\":264000,\"unit\":\"USD\"}]",
  "formulaJson": "{\"template\":\"(users × hoursSaved × hourlyRate × 12) − licenseCost\",\"tokens\":[{\"id\":\"users\",\"kind\":\"input\"},{\"id\":\"hoursSaved\",\"kind\":\"input\"},{\"id\":\"hourlyRate\",\"kind\":\"input\"},{\"id\":\"licenseCost\",\"kind\":\"input\"},{\"id\":\"result\",\"kind\":\"output\"}]}",
  "resultJson": "{\"value\":1656000,\"unit\":\"USD/yr\",\"label\":\"Annual ROI\"}",
  "stepsJson": "[{\"description\":\"Monthly user-hours recovered\",\"value\":42000},{\"description\":\"Annual savings at $45/hr\",\"value\":\"$22.68M\"},{\"description\":\"Minus license cost\",\"value\":\"-$264K\"},{\"description\":\"Net annual benefit\",\"value\":\"$1.656M\"}]",
  "sensitivityJson": "[{\"inputId\":\"users\",\"range\":[8000,16000],\"impact\":[1056000,2256000]},{\"inputId\":\"hoursSaved\",\"range\":[2,5],\"impact\":[1116000,2196000]}]",
  "disclaimer": "Estimates based on customer-reported data. Actual results may vary."
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `title` | string | yes | Heading for the ROI scene. |
| `inputsJson` | string | yes | JSON-stringified array, **max 8**. Each: `{ id, label, value, unit?, source? }`. `id` is used to cross-reference formula tokens. |
| `formulaJson` | string | yes | JSON-stringified object: `{ template, tokens[] }`. `template` is a human-readable string. `tokens` maps each id to kind (`input` or `output`). Tokens render as `<span class="roi-tok" data-token-id="...">` for future CodeWalkthrough integration. |
| `resultJson` | string | yes | JSON-stringified object: `{ value, unit, label }`. Counter rolls to `value`. |
| `stepsJson` | string | no | JSON-stringified array, **max 5**. Each: `{ description, value }`. Narrative breakdown of how result is reached. |
| `sensitivityJson` | string | no | JSON-stringified array, **max 5**. Each: `{ inputId, range: [min, max], impact: [min, max] }`. Draws animated bar showing range. |
| `disclaimer` | string | no | Legal/estimate disclaimer. Fades in at the end. Hides if empty. |

> **Formula token rendering (rubber-duck #4):** The `template` string is
> walked character-by-character. When a substring matches a `tokens[].id`,
> it's wrapped in `<span class="roi-tok" data-token-id="...">`. Everything
> else (operators, parens, spaces) stays as plain text. Token ids are matched
> longest-first to prevent partial matches.

## Visual recipe

| Step | Time (relative to `SCENE_START`) | Effect |
|------|----------------------------------|--------|
| Title fade-in | `+0.1s` | Title fades + lifts 16px over 0.6s (`power2.out`). |
| Input rows stagger | `+0.3s + i×0.15s` | Each row slides in from left with 0.35s duration. |
| Formula bar reveal | After inputs settle | Bar fades in, then each `roi-tok` span highlights in sequence (0.4s per token — brief `rgba(56,189,248,0.25)` background pulse). |
| Steps cascade | After formula highlights | Each step fades + lifts over 0.35s, staggered by 0.2s. |
| Result card | After steps (min `+3.5s`) | Scales 0.85→1.0 with `back.out(1.7)` + counter rolls to value over 1.6s. |
| Sensitivity bars | `result + 1.2s` | Rows fade in, fill widths animate 0→range over 0.8s. |
| Disclaimer | `result + 2.2s` | Simple opacity fade over 0.4s. |
| Exit fade | `SCENE_START + SCENE_DURATION − 0.4s` | Whole component fades to opacity 0 over 0.4s. |

**Recommended scene duration:** **10–15 seconds**. This is a dense component.
10s works for inputs + formula + result only. 12–15s if steps and sensitivity
are present.

## Composition tips

- **Precede with context.** Put a TitleCard or narrative scene before the
  ROICalculator so viewers understand *what* is being calculated.
- **Follow with a CustomerStory.** After showing the math, a customer quote
  anchors the numbers in reality.
- **Keep inputs ≤ 5 for clarity.** The cap is 8, but 4–5 inputs fit the
  grid cleanly at 1080p without shrinking text.
- **Formula length matters.** Keep the template under ~60 chars so it reads
  as a single line at 22px monospace.
- **Steps are the narrative glue.** They translate the formula into plain
  English. Always include steps for non-technical audiences.
- **Sensitivity is optional but powerful.** It answers "what if?" — great
  for executive audiences who want to see range, not just a point estimate.

## Provenance

| Design choice | Source |
|---------------|--------|
| Component name `ROICalculator` | Proposal §3.5. |
| Structured formula with token spans | Rubber-duck finding #4: formula MUST render tokens as `<span class="roi-tok" data-token-id="...">` for PR 6 CodeWalkthrough integration. |
| Token highlight animation (background pulse) | Convention: syntax-highlight walk-through in code-demo videos; adapted for formula tokens. |
| Token matching (longest-first substring) | Standard tokenizer approach to prevent partial matches (e.g. "hour" matching inside "hoursSaved"). |
| Result scale with `back.out(1.7)` | Matches `BrandIntro` and `SectionDivider` numeral overshoot for visual continuity. |
| Counter roll pattern | Canonical pattern from `MetricsCard/animation.js`. |
| Data-island pattern for all JSON props | Mirrors `DataFlow` / `DataChart` / `CustomerStory` precedent. |
| Sensitivity bar animation | Inspired by progress-fill pattern in `SectionDivider` progress reveal. |
| Input table layout | Adapts `CalloutBox` compact card pattern for tabular data. |
| Class prefix `roi-` | **Invented** for this PR. Orchestrator must add to CONTRACT §5 prefix registry. |
| Grid layout (2-column) | Dense component needs efficient space use; grid allows inputs left, steps right, formula + result spanning full width. |
| Selector hygiene | CONTRACT §4.3. |
| Exit fade 0.4s before scene end | CONTRACT §7. |

## Deferred dependencies

ROICalculator is **fully self-contained at runtime**. The following are
related but not blocking:

- **Prop transformer** — the orchestrator will add a builder that stringifies
  `inputs[]` → `inputsJson`, `formula` → `formulaJson`, `result` →
  `resultJson`, `steps[]` → `stepsJson`, `sensitivity[]` →
  `sensitivityJson`. Until then, SCF authors pass pre-stringified JSON.
- **PR 6 CodeWalkthrough integration** — the `roi-tok` spans with
  `data-token-id` are designed so CodeWalkthrough's highlight engine can
  target individual tokens during narration. No code changes needed here
  when that lands.
- **Brand package** — a future PR may read `brand.primary` to tint the
  result card border and sensitivity fills.
- **`narration-component-sync`** — timing anchors for formula highlight
  start, result reveal, and step descriptions.
