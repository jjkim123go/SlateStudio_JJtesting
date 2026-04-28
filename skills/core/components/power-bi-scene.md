# PowerBIScene Component

> Layer 2 component skill. Load for any synthetic Power BI report or dashboard scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: Power BI, dashboard demo, BI report, slicer, drill down, KPI card,
"view the report", report canvas, filter pane, tooltip on chart, executive
dashboard.

**Override:** This beats `visual_prompt` and `foundry_video_gen` (Sora-2) for Power BI
product walkthroughs because the report chrome, KPI cards, slicers, and
drill-down states stay pixel-crisp and editable.

## Props

The component accepts `stepsHtml` as raw HTML (triple-mustache injection).
Build it from your logical steps array as a sequence of
`<div class="pb-step" data-kind="…" data-duration="…">…</div>` fragments.

```json
{
  "theme": "light",
  "workspaceName": "Executive Analytics",
  "reportName": "Sales Dashboard",
  "stepsHtml": "<div class=\"pb-step\" data-kind=\"report_load\" data-duration=\"1.2\" style=\"opacity:0\"></div><div class=\"pb-step\" data-kind=\"slicer_change\" data-target=\"region\" data-value=\"NA\" data-kpi1=\"$38.6M\" data-kpi2=\"29.8%\" data-delta1=\"+8.1% vs LY\" data-delta2=\"+1.1 pts\" data-bar-values=\"68,54,40,32\" data-duration=\"1.1\" style=\"opacity:0\"></div><div class=\"pb-step\" data-kind=\"drill_down\" data-title=\"Sales › North America › Washington\" data-duration=\"1.0\" style=\"opacity:0\"></div><div class=\"pb-step\" data-kind=\"tooltip_show\" data-x=\"64\" data-y=\"38\" data-duration=\"1.0\" style=\"opacity:0\"><h4>Seattle</h4><div class=\"pb-tooltip-row\"><span>Revenue</span><strong>$2.4M</strong></div><div class=\"pb-tooltip-row\"><span>Margin</span><strong>33.8%</strong></div></div><div class=\"pb-step\" data-kind=\"pill\" data-duration=\"0.5\" style=\"opacity:0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(16,124,16,.12);border:1px solid rgba(16,124,16,.2);color:#107c10;font-weight:700\"><span>✓</span><span>Insights captured</span></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `theme` | string | no | `"light"` or `"dark"`. Light is the best Power BI match. |
| `workspaceName` | string | yes | Workspace chip in the top header. |
| `reportName` | string | yes | Large report title above the canvas. |
| `stepsHtml` | string (raw HTML) | yes | Sequence of `.pb-step` fragments. Animation reads `data-kind`, `data-duration`, and per-step data attributes. |

### Step fragment skeletons

```html
<div class="pb-step" data-kind="report_load" data-duration="1.2" style="opacity:0"></div>

<div class="pb-step" data-kind="slicer_change" data-target="region" data-value="NA"
  data-kpi1="$38.6M" data-kpi2="29.8%" data-delta1="+8.1% vs LY"
  data-delta2="+1.1 pts" data-bar-values="68,54,40,32"
  data-line-path="M40 170 C120 150 180 92 240 98 S360 142 420 128 S540 70 660 58"
  data-duration="1.1" style="opacity:0"></div>

<div class="pb-step" data-kind="drill_down" data-title="Sales › North America › Washington"
  data-duration="1.0" style="opacity:0"></div>

<div class="pb-step" data-kind="tooltip_show" data-x="64" data-y="38"
  data-duration="1.0" style="opacity:0">
  <h4>Seattle</h4>
  <div class="pb-tooltip-row"><span>Revenue</span><strong>$2.4M</strong></div>
  <div class="pb-tooltip-row"><span>Margin</span><strong>33.8%</strong></div>
</div>

<div class="pb-step" data-kind="pause" data-duration="0.7" style="display:none"></div>

<div class="pb-step" data-kind="pill" data-duration="0.5"
  style="opacity:0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(16,124,16,.12);border:1px solid rgba(16,124,16,.2);color:#107c10;font-weight:700">
  <span>✓</span><span>Insights captured</span>
</div>
```

## Step kinds (recap)

See [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
for the shared v1 contract.

| Kind | Visual |
|------|--------|
| `report_load` | KPI cards, charts, slicers, and filter pane fade in with a staggered render feel. |
| `slicer_change` | A slicer button highlights, visuals flash with a yellow tint, and KPI/chart values swap. |
| `drill_down` | The bar chart card scales forward and a drill path chip appears. |
| `tooltip_show` | A chart tooltip fades in at `data-x` / `data-y` with custom metric rows. |
| `pause` | Held beat with no visible change. |
| `pill` | Status badge reveal for a conclusion or takeaway. |

## Scene timing

Recommended duration: **9–14 seconds.** Sum the step `data-duration` values
and add **~1.5 seconds** for shell reveal, report-load stagger, and the exit
fade. Use at least one `pause` after a slicer or drill action so the audience
can read the new values.

## Out of scope (v1)

❌ True cursor motion · ❌ Arbitrary canvas re-layout · ❌ Cross-page report
navigation · ❌ DAX editor · ❌ Real export/share dialogs.
