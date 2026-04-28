# CalloutPin Component

> Layer 2 component skill. Load when a scene needs to point at a specific
> location on a base image (UI screenshot, diagram, photo, map).

## When to use

Triggers: "this part of the UI", "look here", "notice the X in the
top-right", annotated screenshot, point out, callout, highlight on image.

**Pick CalloutPin over CalloutBox when** the explanation is a single short
phrase (≤ 12 words), when the visual emphasis is the *location* (where to
look) more than the explanation, or when several pins on one image are
needed (CalloutBox is heavier and clutters with multiple instances).

## Props

```json
{
  "baseSrc": "assets/dashboard-screenshot.png",
  "x": 72,
  "y": 38,
  "labelX": 50,
  "labelY": 65,
  "label": "Real-time error rate",
  "detail": "Updates every 5 seconds via the SignalR connection."
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `baseSrc` | string | yes | Background image. Falls back to a dark gradient if missing. |
| `x` | number | yes | Pin X position as **percent of width** (0–100). |
| `y` | number | yes | Pin Y position as **percent of height** (0–100). |
| `labelX` | number | yes | Label card center X (percent). Place ~25–40 percent units away from the pin so the leader is visible. |
| `labelY` | number | yes | Label card top Y (percent). |
| `label` | string | yes | Bold callout title. ≤ 40 chars. |
| `detail` | string | yes | One-sentence supporting detail. ≤ 140 chars. |

## Scene timing

Recommended duration: **5–8 seconds.** Pin lands at +0.9s, label slides
in at +1.5s, then audience needs ~3s to read.

## Composition tip

Two callouts on the same image? Use two consecutive `CalloutPin` scenes
with the same `baseSrc`. The crossfade is invisible because the
backgrounds match.
