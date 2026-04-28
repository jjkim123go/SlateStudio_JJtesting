# WindowsScene Component

> Layer 2 component skill. Load for any synthetic Windows 11 desktop scene.
> See also: [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
> for the umbrella step-kind contract and v1 scope decisions.

## When to use

Triggers: Windows 11, Windows desktop, taskbar, start menu, OS-level demo,
"show Windows feature", notification toast, app launch from taskbar, desktop
walkthrough, shell surface.

**Override:** This beats `foundry_video_gen` (Sora-2) and `visual_prompt` for Windows shell
walkthroughs because taskbar layout, app-window chrome, and toast timing need
to stay accurate and readable.

## Props

The component accepts `stepsHtml` as raw HTML (triple-mustache injection).
Build it from your logical steps array as a sequence of
`<div class="win-step" data-kind="…" data-duration="…">…</div>` fragments.

```json
{
  "theme": "dark",
  "wallpaperGradient": "radial-gradient(circle at 30% 20%, #1e90ff, #1a1a4d)",
  "clockTime": "2:34 PM",
  "stepsHtml": "<div class=\"win-step\" data-kind=\"taskbar_click\" data-app=\"explorer\" data-duration=\"0.9\" style=\"opacity:0\"></div><div class=\"win-step\" data-kind=\"start_menu\" data-duration=\"0.9\" style=\"opacity:0\"></div><div class=\"win-step\" data-kind=\"window_drag\" data-app=\"explorer\" data-from=\"160,130\" data-to=\"360,105\" data-duration=\"1.1\" style=\"opacity:0\"></div><div class=\"win-step\" data-kind=\"notification_toast\" data-app-name=\"Teams\" data-title=\"Meeting reminder\" data-duration=\"1.4\" style=\"opacity:0\">Design review starts in 10 minutes.</div><div class=\"win-step\" data-kind=\"pill\" data-duration=\"0.5\" style=\"opacity:0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);color:#fff;font-weight:700\"><span>✓</span><span>Desktop walkthrough ready</span></div>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `theme` | string | no | `"dark"` or `"light"`. The component is optimized for dark/frosted Windows 11 styling. |
| `wallpaperGradient` | string | no | CSS gradient string for the wallpaper background. Falls back to a blue radial gradient. |
| `clockTime` | string | yes | System tray clock text. |
| `stepsHtml` | string (raw HTML) | yes | Sequence of `.win-step` fragments. Animation reads `data-kind`, `data-duration`, and per-step data attributes. |

### Step fragment skeletons

```html
<div class="win-step" data-kind="taskbar_click" data-app="explorer"
  data-duration="0.9" style="opacity:0"></div>

<div class="win-step" data-kind="start_menu" data-duration="0.9"
  style="opacity:0"></div>

<div class="win-step" data-kind="window_drag" data-app="explorer"
  data-from="160,130" data-to="360,105" data-duration="1.1"
  style="opacity:0"></div>

<div class="win-step" data-kind="notification_toast" data-app-name="Teams"
  data-title="Meeting reminder" data-duration="1.4" style="opacity:0">
  Design review starts in 10 minutes.
</div>

<div class="win-step" data-kind="pause" data-duration="0.7" style="display:none"></div>

<div class="win-step" data-kind="pill" data-duration="0.5"
  style="opacity:0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);color:#fff;font-weight:700">
  <span>✓</span><span>Desktop walkthrough ready</span>
</div>
```

## Step kinds (recap)

See [`synthetic-screen-recording.md`](../synthetic-screen-recording.md)
for the shared v1 contract.

| Kind | Visual |
|------|--------|
| `taskbar_click` | Pulses a centered taskbar icon and slides the matching app window upward. |
| `start_menu` | Reveals the Windows 11 start menu with a frosted-glass scale-in. |
| `window_drag` | Moves an existing window from `data-from` to `data-to` coordinates. |
| `notification_toast` | Slides a toast card in from the top-right, holds, then exits. |
| `pause` | Held beat with no visible change. |
| `pill` | Status badge reveal for a callout or success state. |

## Scene timing

Recommended duration: **8–13 seconds.** Sum the step `data-duration` values
and add **~1.2 seconds** for taskbar reveal and exit fade. Give window drags
at least 1.0s so the movement feels intentional rather than jittery.

## Out of scope (v1)

❌ Snap layouts · ❌ Resize handles · ❌ Multi-monitor desktops · ❌ Live typing
inside apps · ❌ True pointer movement or hover states.
