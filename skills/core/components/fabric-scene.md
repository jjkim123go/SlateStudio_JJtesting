# FabricScene Component

> Layer 2 component skill. Load for any synthetic Microsoft Fabric surface.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: Microsoft Fabric, OneLake, lakehouse, notebook in Fabric, data
pipeline, Synapse migration, data engineering demo, notebook cell run,
workspace demo, Data Factory in Fabric.

**Override:** This beats `visual_prompt` and `foundry_video_gen` (Sora-2) for Fabric product
walkthroughs because notebook cells, explorer trees, and pipeline activity
states need deterministic UI structure and legible text.

## Props

The component accepts `stepsHtml` as raw HTML (triple-mustache injection).
Build it from your logical steps array as a sequence of
`<div class="fb-step" data-kind="…" data-duration="…">…</div>` fragments.

```json
{
  "theme": "dark",
  "workspaceName": "FinPlat Analytics",
  "experience": "data-engineering",
  "notebookName": "RevenueQualityChecks",
  "stepsHtml": "<div class=\"fb-step\" data-kind=\"notebook_cell_run\" data-cell=\"1\" data-duration=\"1.2\" style=\"opacity:0\"><div class=\"fb-output-table\"><div>Region</div><div>Revenue</div><div>Margin</div><div>NA</div><div>$12.8M</div><div>34.2%</div></div></div><div class=\"fb-step\" data-kind=\"lakehouse_browse\" data-folder=\"Tables\" data-item=\"SalesOrders\" data-preview-title=\"SalesOrders\" data-duration=\"1.1\" style=\"opacity:0\"></div><div class=\"fb-step\" data-kind=\"pipeline_run\" data-path=\"ingest,transform,validate,publish\" data-duration=\"1.5\" style=\"opacity:0\"></div><div class=\"fb-step\" data-kind=\"pill\" data-duration=\"0.5\" style=\"opacity:0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(76,159,254,.14);border:1px solid rgba(76,159,254,.24);color:#8fc1ff;font-weight:700\"><span>⚙</span><span>Fabric workflow complete</span></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `theme` | string | no | `"dark"` or `"light"`. Dark best matches Fabric. |
| `workspaceName` | string | yes | Workspace switcher label in the top bar. |
| `experience` | string | yes | One of `data-engineering`, `data-science`, `data-warehouse`, `real-time-analytics`, `data-factory`. Controls the highlighted left-nav experience. |
| `notebookName` | string | no | Notebook pill label when the notebook view is active. |
| `stepsHtml` | string (raw HTML) | yes | Sequence of `.fb-step` fragments. Animation reads `data-kind`, `data-duration`, and per-step data attributes. |

### Step fragment skeletons

```html
<div class="fb-step" data-kind="notebook_cell_run" data-cell="1" data-duration="1.2" style="opacity:0">
  <div class="fb-output-table">
    <div>Region</div><div>Revenue</div><div>Margin</div>
    <div>NA</div><div>$12.8M</div><div>34.2%</div>
  </div>
</div>

<div class="fb-step" data-kind="lakehouse_browse" data-folder="Tables"
  data-item="SalesOrders" data-preview-title="SalesOrders" data-duration="1.1"
  style="opacity:0">
  <div class="fb-preview-row fb-head"><div>Order ID</div><div>Region</div><div>Revenue</div><div>Status</div></div>
  <div class="fb-preview-row"><div>SO-1842</div><div>NA</div><div>$128,400</div><div>Complete</div></div>
</div>

<div class="fb-step" data-kind="pipeline_run" data-path="ingest,transform,validate,publish"
  data-duration="1.5" style="opacity:0"></div>

<div class="fb-step" data-kind="pause" data-duration="0.6" style="display:none"></div>

<div class="fb-step" data-kind="pill" data-duration="0.5"
  style="opacity:0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(76,159,254,.14);border:1px solid rgba(76,159,254,.24);color:#8fc1ff;font-weight:700">
  <span>⚙</span><span>Fabric workflow complete</span>
</div>
```

## Step kinds (recap)

See [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
for the shared v1 contract.

| Kind | Visual |
|------|--------|
| `notebook_cell_run` | Highlights a notebook cell, spins the run control, and reveals output content. |
| `lakehouse_browse` | Activates the lakehouse explorer, selects a folder/item, and swaps the preview pane. |
| `pipeline_run` | Sequentially lights pipeline activity nodes and animates flow connectors. |
| `pause` | Held beat with no visible change. |
| `pill` | Status badge reveal for a completed workflow or key result. |

## Scene timing

Recommended duration: **8–14 seconds.** Sum the step `data-duration` values
and add **~1.3 seconds** for shell reveal and exit fade. For notebook scenes,
budget at least 1.0s per `notebook_cell_run`; for pipeline scenes, use 1.3–1.8s
so each activity can reach a visible succeeded state.

## Out of scope (v1)

❌ Multi-tab notebook sessions · ❌ Free-form drag editing of pipeline layout ·
❌ Full semantic model authoring · ❌ Real Spark progress logs · ❌ Mouse cursor.
