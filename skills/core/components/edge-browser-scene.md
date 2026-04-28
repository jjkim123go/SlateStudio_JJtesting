# EdgeBrowserScene Component

> Layer 2 component skill. Load for any synthetic Microsoft Edge browser scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: browser demo, Edge browser, Microsoft Edge, "show this website",
"in the browser", web app demo, SaaS UI demo, DevTools, F12 inspector,
"inspect element", "open developer tools", page load animation, address bar typing,
URL change, "download a file", new tab, browser tab strip,
**any M365 admin / SaaS surface that lives behind browser chrome**.

**Override:** This beats `foundry_video_gen` (Sora-2) for browser content because
URLs, page titles, and tab labels are pixel-perfect deterministic — Sora-2
will hallucinate domain names and page chrome. It beats `visual_prompt`
(image gen) because still images can't show URL typewriting, page-load
progress, or DevTools sliding up.

## Props

The component accepts `stepsHtml` and `tabsHtml` as raw HTML (triple-mustache
injection). The `pageHtml` content lives inside the `stepsHtml` block as the
target of `page_load` reveals.

```json
{
  "url": "https://learn.microsoft.com/azure/storage",
  "pageTitle": "Azure Storage docs - Microsoft Learn",
  "tabsHtml": "<div class=\"ed-tab\" style=\"display:flex;align-items:center;gap:6px;padding:6px 10px 8px;background:#e5e5e5;border-radius:8px 8px 0 0;font-size:12px;color:#605e5c;max-width:160px;height:28px;box-sizing:border-box\"><div style=\"width:12px;height:12px;background:#0078d4;border-radius:2px;flex-shrink:0\"></div><span style=\"flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">Azure Portal</span></div>",
  "stepsHtml": "<div class=\"ed-step\" data-kind=\"address_bar\" data-duration=\"1.0\" style=\"opacity:0;display:none\"></div><div class=\"ed-step\" data-kind=\"page_load\" data-duration=\"1.4\" style=\"opacity:0\"><h1 style=\"font-size:32px;font-weight:600;margin:0 0 16px;color:#161616\">Azure Storage documentation</h1><p style=\"font-size:16px;line-height:1.6;color:#424242;margin:0 0 24px\">Learn how to use Azure Storage to build cloud-scale apps with blob, file, queue, and table storage.</p><div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px\"><div style=\"padding:16px;border:1px solid #e1dfdd;border-radius:4px\"><div style=\"font-weight:600;color:#0078d4;margin-bottom:6px\">Blob storage</div><div style=\"font-size:13px;color:#605e5c\">Object storage for unstructured data</div></div><div style=\"padding:16px;border:1px solid #e1dfdd;border-radius:4px\"><div style=\"font-weight:600;color:#0078d4;margin-bottom:6px\">File storage</div><div style=\"font-size:13px;color:#605e5c\">Managed SMB file shares</div></div></div></div><div class=\"ed-step\" data-kind=\"pause\" data-duration=\"0.8\" style=\"display:none\"></div><div class=\"ed-step\" data-kind=\"inspect_element\" data-duration=\"0.8\" style=\"opacity:0;position:absolute;left:0;right:0;bottom:22px;height:280px;background:#202020;border-top:1px solid #3c3c3c;color:#d4d4d4;font-family:'Cascadia Code',monospace;font-size:12px;display:flex;flex-direction:column\"><div style=\"display:flex;background:#2d2d2d;height:30px;align-items:center;padding:0 12px;gap:14px;flex-shrink:0;border-bottom:1px solid #3c3c3c\"><span style=\"color:#ffffff;border-bottom:2px solid #0078d4;padding:6px 0\">Elements</span><span style=\"color:#858585\">Console</span><span style=\"color:#858585\">Sources</span><span style=\"color:#858585\">Network</span><span style=\"color:#858585\">Performance</span></div><pre style=\"margin:0;padding:12px 14px;color:#d4d4d4;flex:1;overflow:hidden;white-space:pre\"><span style=\"color:#808080\">&lt;!DOCTYPE html&gt;</span>\n<span style=\"color:#569cd6\">&lt;html</span> <span style=\"color:#9cdcfe\">lang</span>=<span style=\"color:#ce9178\">&quot;en&quot;</span><span style=\"color:#569cd6\">&gt;</span>\n  <span style=\"color:#569cd6\">&lt;body&gt;</span>\n    <span style=\"color:#569cd6\">&lt;h1&gt;</span>Azure Storage documentation<span style=\"color:#569cd6\">&lt;/h1&gt;</span>\n    <span style=\"color:#569cd6\">&lt;p&gt;</span>Learn how to use Azure Storage…<span style=\"color:#569cd6\">&lt;/p&gt;</span>\n  <span style=\"color:#569cd6\">&lt;/body&gt;</span>\n<span style=\"color:#569cd6\">&lt;/html&gt;</span></pre></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `url` | string | yes | Initial URL shown in the address bar (also typewriter target on `address_bar` steps). Also rendered in the bottom status bar. |
| `pageTitle` | string | yes | Active tab title. |
| `tabsHtml` | string (raw HTML) | no | Additional tab pills in the tab strip. Use `.ed-tab` class with the same skeleton as the active tab. |
| `stepsHtml` | string (raw HTML) | yes | Sequence of `<div class="ed-step" data-kind="…" data-duration="…">…</div>` overlays in the page body. The DevTools panel and download bar should be `position:absolute; bottom:…` so they slide up over the page. |

## Step kinds

| Kind              | Visual                                                                |
|-------------------|-----------------------------------------------------------------------|
| `address_bar`     | URL typewrites into the address bar (uses the global `.ed-url-text`). |
| `page_load`       | Top progress bar fills 0→100% then fades; page content fades in.      |
| `tab_open`        | New tab pill scales in from the left into the tab strip.              |
| `inspect_element` | DevTools panel (~280px tall) slides up from the bottom of the page.   |
| `download`        | Download bar (~60px tall) slides up from the bottom of the page.      |
| `pause`           | Held beat (no visible change).                                        |
| `pill`            | Status badge (✓ done, ⚠ warning).                                     |

For `address_bar`, the step `<div>` itself can be invisible (`display:none`) — the
animation targets the global `.ed-url-text` span in the address bar. Pass the
target text via `data-text` on the step.

## Scene timing

Recommended duration: **8–18 seconds.** Sum each step's `data-duration`,
add ~0.2s gap per `address_bar` step. Reserve **1.5s headroom** for the
window reveal (~0.8s) and exit fade (~0.5s). For full M365 admin walkthroughs,
chain multiple EdgeBrowserScene scenes rather than one long scene.

## Out of scope (v1)

❌ Real DOM rendering of arbitrary URLs · ❌ JavaScript console eval ·
❌ Mouse cursor · ❌ Right-click context menus · ❌ Extension popups ·
❌ History sidebar · ❌ Sign-in / SSO flows · ❌ Real network requests in DevTools ·
❌ Bookmarks bar customization. See the umbrella skill for rationale.
