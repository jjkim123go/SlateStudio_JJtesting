# StepByStep Component

> Layer 2 component skill. Load when a scene needs a numbered checklist
> that fills in step-by-step.

## When to use

Triggers: numbered steps, checklist, tutorial sequence, "1. … 2. … 3. …",
onboarding flow, "first … then … finally", how-to.

## Props

```json
{
  "title": "Get started in 4 steps",
  "stepsHtml": "<li class=\"sbs-step\" style=\"opacity:0;display:flex;align-items:center;gap:24px;font-size:36px;color:#FFFFFF\"><span class=\"sbs-check\" style=\"width:48px;height:48px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#0f172a\">✓</span><span>Install the CLI</span></li>"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `title` | string | yes | Heading above the list. |
| `stepsHtml` | string (raw HTML) | yes | One `<li class="sbs-step">…</li>` per step. Each must contain a `<span class="sbs-check">` for the animation. |

## Step row skeleton

```html
<li class="sbs-step" style="opacity:0;display:flex;align-items:center;gap:24px;font-size:36px;color:#FFFFFF;font-weight:500">
  <span class="sbs-check" style="width:48px;height:48px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#0f172a">✓</span>
  <span>Install the CLI</span>
</li>
```

For numbered (rather than checked) variants, replace the `✓` with the
step number. The animation stagger still applies.

## Scene timing

Recommended duration: **6–14 seconds.** The animation auto-scales the
per-step stagger to fit `SCENE_DURATION`. For 4 steps in 8 seconds, that's
roughly 1.5s per step — comfortable reading pace.

## Sweet spot

3–6 steps. Fewer than 3 looks underweight; more than 6 either overflows
or rushes. For longer processes, split into two `StepByStep` scenes.
