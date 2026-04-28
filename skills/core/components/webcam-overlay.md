# WebcamOverlay Component

> Layer 2 component skill. Load when a scene needs a presenter
> webcam-style overlay (picture-in-picture face cam) on top of a demo,
> screen recording, or static slide.

## When to use

Triggers: "presenter webcam", "talking head over the demo",
"face-cam in the corner", "founder in the corner",
"speaker in the corner", "host in the corner", "PiP webcam",
PiP, founder explaining, expert commentary,
"keep a human in frame", PresenterBug, "thumbnail of me explaining".

## Props

```json
{
  "src": "assets/presenter-loop.mp4",
  "position": "bottom-right",
  "size": "medium",
  "shape": "circle",
  "borderColor": "#0078D4",
  "presenterName": "Ada Lovelace",
  "presenterTitle": "VP, Platform Engineering"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `src` | string | yes | Video (mp4/webm) or image. Auto-detected by extension. Videos are muted/looped/playsinline. |
| `position` | enum | no | `top-left`, `top-right`, `bottom-left` (default), `bottom-right`. |
| `size` | enum | no | `small` (160px), `medium` (220px), `large` (300px). Default `medium`. |
| `shape` | enum | no | `circle` (default), `square`, `rounded`. |
| `borderColor` | string | no | CSS color for the ring around the cam. Default `#0078D4`. |
| `presenterName` | string | no | Name caption that appears next to/under the cam. Optional. |
| `presenterTitle` | string | no | Role/title under the name. Optional. |

## Scene timing

Recommended overlay duration: matches the scene it sits over. Slides in
at +0.6s, name caption fades in at +1.2s, exits with the scene.

## Composition tip

Pair with `ScreenDemoFrame` or `TerminalScene` to create a "founder
narrating a demo" scene. Pair with `TitleCard` to make a "talking head
intro". Use `borderColor` to match the brand package primary color.
