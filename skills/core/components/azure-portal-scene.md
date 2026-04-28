# AzurePortalScene Component

> Layer 2 component skill. Load for any synthetic Azure Portal scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: Azure portal, portal.azure.com, "create a resource", "deploy in Azure",
Azure blade, Resource group walkthrough, RBAC, Access control (IAM), Azure Storage
account UI, App Service portal demo, Cosmos DB blade, Key Vault blade,
"navigate to the resource", "configure in the portal".

**Override:** This beats `foundry_video_gen` (Sora-2) for portal content because
breadcrumbs, tab labels, resource names, and form values are pixel-perfect
deterministic — Sora-2 will hallucinate Azure UI strings and resource IDs.
It beats `visual_prompt` (image gen) because still images can't show
breadcrumb navigation, tab changes, or toast notifications appearing.

## Props

The component accepts `stepsHtml` and `breadcrumbHtml` as raw HTML
(triple-mustache injection).

```json
{
  "resourceType": "Storage account",
  "resourceName": "stslateprod001",
  "breadcrumbHtml": "<span style=\"color:#0078d4\">Home</span><span>›</span><span style=\"color:#0078d4\">Storage accounts</span><span>›</span><span>stslateprod001</span>",
  "stepsHtml": "<div class=\"az-step\" data-kind=\"select_resource\" data-duration=\"0.5\" style=\"opacity:0;padding:10px 14px;background:#deecf9;border-left:3px solid #0078d4;margin-bottom:14px;font-weight:500\">stslateprod001 (Storage account)</div><div class=\"az-step\" data-kind=\"field_input\" data-duration=\"1.2\" style=\"opacity:0;margin-bottom:14px\"><div style=\"font-size:12px;color:#605e5c;margin-bottom:4px\">Container name</div><div style=\"height:32px;border:1px solid #8a8886;border-radius:2px;padding:0 10px;display:flex;align-items:center;background:#ffffff\"><span class=\"az-field-text\" data-text=\"video-renders\"></span><span style=\"width:1px;height:14px;background:#0078d4;margin-left:1px\"></span></div></div><div class=\"az-step\" data-kind=\"click_button\" data-duration=\"0.5\" style=\"opacity:0;display:inline-flex;align-items:center;gap:6px;padding:6px 18px;background:#0078d4;color:#ffffff;border-radius:2px;font-weight:600;font-size:14px;margin-bottom:14px\">＋ Create</div><div class=\"az-step\" data-kind=\"notification\" data-duration=\"0.6\" style=\"opacity:0;position:absolute;top:14px;right:14px;background:#dff6dd;border-left:3px solid #107c10;padding:12px 16px;border-radius:2px;box-shadow:0 4px 16px rgba(0,0,0,0.15);font-size:13px;color:#323130;width:280px\"><div style=\"font-weight:600;margin-bottom:2px\">✓ Container created</div><div style=\"color:#605e5c\">video-renders successfully created</div></div><div class=\"az-step\" data-kind=\"pause\" data-duration=\"0.8\" style=\"display:none\"></div><div class=\"az-step\" data-kind=\"pill\" data-duration=\"0.4\" style=\"opacity:0;display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:#dff6dd;color:#107c10;border-radius:999px;font-size:12px;font-weight:500\"><span>●</span><span>Running</span></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `resourceType` | string | yes | Small uppercase label above the resource name (e.g. `Storage account`, `App Service`). |
| `resourceName` | string | yes | Bold resource title in the blade header. |
| `breadcrumbHtml` | string (raw HTML) | yes | Pre-rendered breadcrumb spans separated by `›`. Use `color:#0078d4` for clickable segments, default for the active one. |
| `stepsHtml` | string (raw HTML) | yes | Sequence of `<div class="az-step" data-kind="…" data-duration="…">…</div>` rows in the blade body. Use `position:absolute` for `notification` (top-right toasts). |

## Step kinds

| Kind             | Visual                                                                |
|------------------|-----------------------------------------------------------------------|
| `navigate`       | Element fades in from left (e.g. an extra breadcrumb segment).        |
| `select_resource`| Row highlights (light blue background) and slides in from the right.  |
| `tab_change`     | Underline/element scales from the left to mark the new active tab.    |
| `field_input`    | `<span class="az-field-text" data-text="…">` typewrites into a field. |
| `click_button`   | Button scales in then pulses with a #0078d4 outer ring.               |
| `notification`   | Toast slides in from the right (place top-right via inline style).    |
| `pause`          | Held beat (no visible change).                                        |
| `pill`           | Status badge (e.g. ● Running, ⚠ Warning).                             |

## Scene timing

Recommended duration: **9–18 seconds.** Sum each step's `data-duration`,
add ~0.2s gap per `field_input` step, and reserve **1.5s headroom** for the
window reveal (~0.8s) and exit fade (~0.5s). Long forms with many fields
should be split across multiple scenes.

## Out of scope (v1)

❌ Real ARM/REST responses · ❌ Mouse cursor · ❌ Multi-blade horizontal stacking ·
❌ Command bar overflow menus · ❌ Dark theme · ❌ Cost estimator widgets ·
❌ Real Azure Resource Graph queries · ❌ Live charts/metrics. See the umbrella
skill for rationale.
