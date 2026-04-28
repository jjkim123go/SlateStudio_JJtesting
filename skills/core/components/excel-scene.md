# ExcelScene Component

> Layer 2 component skill. Load for any synthetic Excel web scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: Excel, spreadsheet demo, "fill in the cells", formula, pivot table,
Copilot for Excel, chart from data, SUM, VLOOKUP, "enter data", cell range,
workbook, worksheet, grid, CSV import, data analysis, "show the spreadsheet".

**Override:** This beats `foundry_video_gen` (Sora-2) and `visual_prompt` (image gen)
for spreadsheet content because cell values, formulas, and column headers must
be pixel-perfect readable text — AI models will hallucinate cell contents and
misalign grids. Also beats a `structured_image` table when you need
animated cell selection, formula typing, or chart insertion.

## Props

The component accepts `stepsHtml` as raw HTML (triple-mustache injection).
Build it from your steps array — see
[`synthetic-screen-recording.md`](../synthetic-screen-recording.md) for
the step skeletons per kind.

```json
{
  "workbookName": "Q3-Budget.xlsx",
  "sheetName": "Sheet1",
  "stepsHtml": "<div class=\"tm-step\" data-kind=\"cell_select\" data-cell=\"B2\" data-duration=\"0.5\" style=\"opacity:0\"></div><div class=\"tm-step\" data-kind=\"formula_input\" data-formula=\"=SUM(B2:B10)\" data-duration=\"1.2\" style=\"opacity:0\"></div><div class=\"tm-step\" data-kind=\"cell_recompute\" data-duration=\"1.0\" style=\"opacity:0\"><div class=\"xl-recomp-cell\" style=\"opacity:0;position:absolute;left:80px;top:24px;width:80px;height:24px;display:flex;align-items:center;padding:0 4px;font-size:13px;color:#323130\">$42,500</div><div class=\"xl-recomp-cell\" style=\"opacity:0;position:absolute;left:80px;top:48px;width:80px;height:24px;display:flex;align-items:center;padding:0 4px;font-size:13px;color:#323130\">$18,200</div></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `workbookName` | string | no | Displayed in title context (not rendered in chrome v1). |
| `sheetName` | string | yes | Active sheet tab label at bottom. Default: "Sheet1". |
| `stepsHtml` | string (raw HTML) | yes | Sequence of `<div class="tm-step" data-kind="…" data-duration="…">…</div>` elements placed inside the cell grid area. |

## Step kinds

| Kind | Attrs | Visual |
|------|-------|--------|
| `cell_select` | `data-cell="B2"` | Green selection cursor (2px border) moves to the target cell with smooth transition. Cell ref label in formula bar updates. |
| `formula_input` | `data-formula="=SUM(B2:B10)"` | Typewriter into formula bar and the selected cell simultaneously. |
| `cell_recompute` | — | Child `.xl-recomp-cell` divs appear with staggered yellow flash (value commit). Position cells with `position:absolute` + `left`/`top` matching the grid coordinates (col × 80px, row × 24px). |
| `chart_insert` | — | Chart card (white, rounded, bar/line SVG) slides in from right side of the grid. |
| `pivot_refresh` | — | Pivot table card fades in; child `.xl-pivot-row` divs stagger-reveal row by row. |
| `pause` | — | Held beat (no visible change). |
| `pill` | — | Status badge pops in with `back.out` ease. |

### Step HTML skeletons

**cell_select:**
```html
<div class="tm-step" data-kind="cell_select" data-cell="B2" data-duration="0.5" style="opacity:0"></div>
```

**formula_input:**
```html
<div class="tm-step" data-kind="formula_input" data-formula="=SUM(B2:B10)" data-duration="1.2" style="opacity:0;position:absolute;left:80px;top:24px;width:80px;height:24px;display:flex;align-items:center;padding:0 4px;font-size:13px;color:#323130"></div>
```

**cell_recompute:** (position `.xl-recomp-cell` children at grid coordinates)
```html
<div class="tm-step" data-kind="cell_recompute" data-duration="1.0" style="opacity:0">
  <div class="xl-recomp-cell" style="opacity:0;position:absolute;left:80px;top:24px;width:80px;height:24px;display:flex;align-items:center;padding:0 4px;font-size:13px;color:#323130">$42,500</div>
  <div class="xl-recomp-cell" style="opacity:0;position:absolute;left:80px;top:48px;width:80px;height:24px;display:flex;align-items:center;padding:0 4px;font-size:13px;color:#323130">$18,200</div>
  <div class="xl-recomp-cell" style="opacity:0;position:absolute;left:80px;top:72px;width:80px;height:24px;display:flex;align-items:center;padding:0 4px;font-size:13px;color:#323130">$60,700</div>
</div>
```

**chart_insert:**
```html
<div class="tm-step" data-kind="chart_insert" data-duration="1.0" style="opacity:0"></div>
```

**pivot_refresh:**
```html
<div class="tm-step" data-kind="pivot_refresh" data-duration="1.5" style="opacity:0">
  <div class="xl-pivot-row" style="opacity:0;padding:4px 8px;font-size:12px;color:#323130;border-bottom:1px solid #f3f2f1">Region: East — $125,000</div>
  <div class="xl-pivot-row" style="opacity:0;padding:4px 8px;font-size:12px;color:#323130;border-bottom:1px solid #f3f2f1">Region: West — $98,400</div>
  <div class="xl-pivot-row" style="opacity:0;padding:4px 8px;font-size:12px;color:#323130;border-bottom:1px solid #f3f2f1">Region: Central — $76,200</div>
</div>
```

## Grid coordinate system

Cells are positioned on an 80px × 24px grid:
- Column A starts at `left: 0`, B at `left: 80px`, C at `160px`, etc.
- Row 1 starts at `top: 0` (below the column header), Row 2 at `top: 24px`, etc.
- The selection cursor offsets by +24px for the column header row.

## Scene timing

Recommended duration: **8–18 seconds.** Sum step durations plus 1.1s headroom
for chrome reveal (0.6s) and exit fade (0.5s). A typical formula demo
(select → type formula → recompute → chart) fits in 8–10s. Pivot refresh
adds 2–3s.

## Out of scope (v1)

❌ Drag fill · ❌ Multi-cell range select · ❌ Conditional formatting ·
❌ Copilot panel · ❌ Cell comments · ❌ Filter dropdowns · ❌ Sparklines.
See the umbrella skill for the rationale.
