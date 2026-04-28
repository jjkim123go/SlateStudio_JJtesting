# Disclaimer

## Purpose

Standardized scene treatment for legal, compliance, or regulatory copy. Three placement variants cover every disclosure scenario — from a brief footer footnote to a full-scene legal interstitial — with severity-based visual weight and optional audience badging.

## When to use

- Scene requires **legal disclosure** text (terms, conditions, licensing)
- Scene contains **financial projections**, pricing, or investment language requiring a disclaimer
- Compliance team mandates an **audience-restricted** notice (external, internal, regulated)
- A full scene is dedicated to **regulatory copy** (e.g., mutual-fund boilerplate)
- Content needs a **modal interstitial** before proceeding (e.g., "by continuing you agree…")
- Narration trigger phrases: "please note", "important disclosure", "terms and conditions", "disclaimer", "subject to", "past performance"

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | string | *(required)* | Disclosure body; supports `**bold**`, `*italic*`, `\n` line breaks (parsed at render time) |
| `placement` | `"full-width-footer"` \| `"modal-card"` \| `"scene-end"` | `"full-width-footer"` | Layout variant |
| `severity` | `"info"` \| `"legal"` \| `"financial"` | `"info"` | Accent color: blue (info), amber (legal), green (financial) |
| `audience` | `"external"` \| `"internal"` \| `"regulated"` | `"external"` | Badge pill shown in the content area |
| `title` | string | *(none)* | Optional bold heading (especially useful for modal-card) |
| `mustAcknowledge` | boolean | `false` | When true, a "→ acknowledge" chip animates in after the main reveal (visual hint only in PR 5; orchestrator gating deferred to PR 9) |
| `durationSec` | number | *(none)* | When set AND placement is `"modal-card"`, auto-dismiss after this many seconds; otherwise persistent |
| `revealStartSec` | number | `0.2` (footer/modal) / `0` (scene-end) | **ANCHOR — "disclaimer reveals"** — seconds after scene start |
| `revealDurationSec` | number | `0.5` | Animation duration for the reveal |
| `acknowledgeChipStartSec` | number | `1.4` | **ANCHOR — "acknowledge chip appears"** — seconds after scene start (only when mustAcknowledge is true) |

## Visual recipe

### Full-width footer
```json
{
  "id": "legal-footer",
  "component": "Disclaimer",
  "duration": 10,
  "props": {
    "text": "Past performance is **not indicative** of future results.\nAll figures are illustrative only.",
    "placement": "full-width-footer",
    "severity": "financial",
    "audience": "external"
  }
}
```

### Modal card with auto-dismiss
```json
{
  "id": "terms-modal",
  "component": "Disclaimer",
  "duration": 12,
  "props": {
    "text": "By viewing this content you acknowledge that all data shown is **simulated**.",
    "title": "Important Notice",
    "placement": "modal-card",
    "severity": "legal",
    "audience": "regulated",
    "durationSec": 8,
    "mustAcknowledge": true
  }
}
```

### Full-scene disclaimer
```json
{
  "id": "closing-legal",
  "component": "Disclaimer",
  "duration": 8,
  "props": {
    "text": "This presentation contains **forward-looking statements** that involve risks and uncertainties.\nActual results may differ materially from those projected.",
    "placement": "scene-end",
    "severity": "legal",
    "audience": "external",
    "title": "Legal Disclosure"
  }
}
```

## Provenance

- **Standard / pattern:** Financial-services advertising disclosure conventions — mutual fund prospectus footers, SEC-mandated "past performance" disclaimers, FINRA fair-balance requirements. Also: pharmaceutical DTC advertising fair-balance overlays (modal interstitials) and broadcast "paid advertisement" or "sponsored content" disclosures.
- **Slate decision:** Three placement variants map to real-world disclosure weight — footer for brief footnotes, modal for blocking notices, scene-end for full interstitials. Severity enum controls accent color so viewers develop color associations (amber = legal, green = financial). `mustAcknowledge` is a visual hint in PR 5; actual orchestrator gating (pause-until-acknowledged) is deferred to PR 9 to keep the component stateless. CSS custom properties (`--dcl-accent`, `--dcl-text`) enable brand-package theming in a future PR.
- **Layer:** Layer 2 (Slate-specific)
