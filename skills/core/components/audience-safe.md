# AudienceSafe

## Purpose

Persistent, low-key watermark overlay that honestly discloses when synthetic, illustrative, or sanitized content is being shown. Prevents audiences from mistaking generated UI mockups, sample data, or fictional personas for real production content.

## When to use

- Scene contains **synthetic UI**, mockup screens, or generated dashboards
- Scene shows **sample data** or placeholder records that are not real customer data
- Scene references a **fictional customer** name, persona, or case study
- Content is marked **internal-only** and must not be shared externally
- Any scene where a governance classification tag is present in the creative brief
- Narration trigger phrases: "for illustration", "sample data", "fictional", "not actual", "internal only"

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `classification` | `"synthetic-ui"` \| `"sample-data"` \| `"fictional-customer"` \| `"internal-only"` | *(required)* | Content classification; drives default watermark text |
| `watermarkText` | string | Derived from classification | Override text displayed in the pill |
| `placement` | `"top-left"` \| `"top-right"` \| `"bottom-right"` \| `"bottom-left"` | `"bottom-right"` | Corner position with 48 px safe-area inset |
| `severity` | `"info"` \| `"warn"` | `"info"` | Visual weight — warn adds amber border + single pulse |
| `icon` | string | `"ⓘ"` (info) / `"⚠"` (warn) | Leading icon in the pill |
| `autoInject` | boolean | `false` | Informational flag for orchestrator (PR 9); no visual effect in PR 5 |
| `appearStartSec` | number | `0.3` | **ANCHOR — "watermark appears"** — seconds after scene start |
| `appearDurationSec` | number | `0.6` | Fade-in duration (opacity 0 → 0.85 / 0.95) |
| `pulseStartSec` | number | `1.2` | **ANCHOR — "watermark pulses"** — warn-only single scale pulse |

## Visual recipe

```json
{
  "id": "demo-safe",
  "component": "AudienceSafe",
  "duration": 8,
  "props": {
    "classification": "synthetic-ui",
    "watermarkText": "Synthetic UI — for illustration only",
    "placement": "bottom-right",
    "severity": "info",
    "icon": "ⓘ",
    "appearStartSec": 0.3,
    "appearDurationSec": 0.6
  }
}
```

## Provenance

- **Standard / pattern:** Broadcast convention — TV networks overlay "DRAMATIZATION" or "SIMULATION" lower-thirds during re-enactments and synthetic visuals. Financial services use "Hypothetical example" watermarks on projected-return charts.
- **Slate decision:** Pill shape chosen over full-width bar for minimal visual disruption. Classification enum constrains free-text to a governed vocabulary so downstream audit tooling can query by tag. `autoInject` prop is a future hook for PR 9 orchestrator-level injection — components stay inert until governance wiring is in place. CSS custom properties (`--as-bg`, `--as-border`, etc.) allow brand-package override in a future PR.
- **Layer:** Layer 2 (Slate-specific)
