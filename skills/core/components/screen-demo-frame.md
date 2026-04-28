# ScreenDemoFrame Component

> Layer 2 component skill. Load when a video clip or screenshot needs
> to be presented inside a realistic device chrome — browser window,
> macOS window, phone, tablet — for a polished demo look.

## When to use

Triggers: "wrap this in a browser frame", "phone mockup", "tablet
demo", "macOS window", product demo, app screenshot, "show this on
mobile", marketing-style framed asset.

**Pick ScreenDemoFrame over a raw `image` or `video` layer when** you
want the audience to *recognize the device context* — a browser URL,
a phone notch, a window title bar all add credibility and signal
"this is real software".

## Props

```json
{
  "src": "assets/dashboard-demo.mp4",
  "frameStyle": "browser",
  "urlBar": "https://contoso.com/dashboard",
  "windowTitle": "Contoso — Operations",
  "theme": "dark",
  "shadow": "medium",
  "cornerRadius": 12,
  "scale": 0.85
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `src` | string | yes | Video (mp4/webm) or image (png/jpg). Videos autoplay muted. |
| `frameStyle` | enum | yes | `browser`, `macos-window`, `phone-portrait`, `phone-landscape`, `tablet`. |
| `urlBar` | string | conditional | URL shown in the address bar. Used by `browser` only. |
| `windowTitle` | string | no | Title text. Used by `browser` and `macos-window`. |
| `theme` | enum | no | `dark` (default) or `light`. |
| `shadow` | enum | no | `none`, `small`, `medium` (default), `large`. |
| `cornerRadius` | number | no | Pixels. Default 12. |
| `scale` | number | no | 0.5–1.0. How much of the canvas the frame occupies. Default 0.85. |

## Scene timing

Recommended duration: **4–10 seconds** depending on demo content.
Frame scales in at +0.4s with `back.out(1.4)` ease, content starts
playing at +0.7s, exits with the scene.

## Composition tip

Combine with `WebcamOverlay` to put a presenter face in the corner of
a framed demo. Combine with `CalloutBox` (positioned via `targetX/Y`
on the same canvas) to annotate parts of the framed demo. For
side-by-side device comparisons (web vs mobile), use `SplitScreen`
with a `ScreenDemoFrame` in each half.
