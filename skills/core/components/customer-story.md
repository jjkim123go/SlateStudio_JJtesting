# CustomerStory Component

> Layer 2 component skill. Load when an explainer needs a **customer
> testimonial** scene — a quote with attribution, optional metrics, and
> optional customer branding. Use for case-study-style narrative beats that
> ground abstract claims in real customer outcomes.

## When to use

**Trigger vocabulary:** `customer, testimonial, quote, case study, success
story, "they said", "according to", "our client", customer outcomes, metrics,
results, ROI story, "in their words"`.

Pick `CustomerStory` (not `Quote`) when you have **structured customer data**
beyond a single quote — metrics, logo, industry tag, or a named attribution
with title. If all you have is a bare quote string and an author, `Quote` is
lighter. If you have metrics but no quote, use `MetricsCard`.

## Props

```json
{
  "customerName": "Contoso Corp",
  "industry": "Financial Services",
  "quote": "We cut reconciliation time from three days to four hours.",
  "attribution": {
    "name": "Sarah Chen",
    "title": "VP of Finance",
    "photoSrc": "assets/sarah-chen.png"
  },
  "metricsJson": "[{\"value\":73,\"label\":\"Time saved\",\"unit\":\"%\",\"deltaPct\":73},{\"value\":4,\"label\":\"Hours to reconcile\",\"unit\":\"hrs\"},{\"value\":12,\"label\":\"Controls automated\"}]",
  "logoSrc": "assets/contoso-logo.png",
  "industryIconSrc": "assets/icon-finance.svg"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `customerName` | string | yes | Company or customer name. Renders in header. |
| `industry` | string | no | Industry tag (e.g. "Financial Services"). Appears as a pill next to the name. Hides if empty. |
| `quote` | string | yes | The testimonial text. Rendered in an italic blockquote with a decorative open-quote mark. |
| `attribution` | object | yes | `{ name, title, photoSrc? }`. Photo is optional — element hides if src is empty. |
| `metricsJson` | string | no | JSON-stringified array of metrics, **max 6** per scene. Each: `{ value, label, unit?, deltaPct? }`. Same data shape as MetricsCard's metrics for SCF-author familiarity. Rendered natively as chips inside this component. |
| `logoSrc` | string | no | Customer logo path. Hides if empty. Resolved by the asset resolver before mustache-time. |
| `industryIconSrc` | string | no | Small icon for the industry pill. Hides if empty. |

> **metricsJson note:** The orchestrator's prop transformer will stringify
> `metrics[]` from the SCF into `metricsJson`. Component reads it from a
> `<script type="application/json">` data-island and builds chips in
> `animation.js`. Counter animation is inlined — no MetricsCard import.

## Visual recipe

| Step | Time (relative to `SCENE_START`) | Effect |
|------|----------------------------------|--------|
| Header (logo + name + industry) | `+0.1s` | Fades in with 16px upward slide over 0.5s (`power2.out`). |
| Quote wipe | `+0.5s` | Quote block revealed left→right via `clip-path: inset(0 100% 0 0)` → `inset(0 0% 0 0)` over 1.2s (`power3.out`). |
| Attribution | `+1.8s` | Photo + name + title fade+lift over 0.5s. |
| Metric chips | `+2.3s + i×0.25s` | Each chip cascades in left-to-right. Counter rolls from 0 → target over 1.2s. |
| Exit fade | `SCENE_START + SCENE_DURATION − 0.4s` | Whole component fades to opacity 0 over 0.4s. |

**Recommended scene duration:** **6–10 seconds**. 6s for quote-only (no
metrics), 8–10s when metrics are present. Shorter durations may clip the
counter animation.

## Composition tips

- **Pair with a hard claim.** Put a `CustomerStory` immediately after a data
  scene (MetricsCard, DataChart) to ground the numbers in a human voice.
- **One customer per scene.** Don't try to stack multiple testimonials — use
  separate scenes or a montage of CustomerStory scenes.
- **Keep metrics ≤ 4 for readability.** The cap is 6, but 3–4 chips read
  cleanly at 1080p. Beyond 4, font sizes start to feel cramped.
- **Provide a photo if you can.** The attribution block with a face is
  significantly more engaging than text-only.
- **Quote length matters.** Aim for 1–2 sentences (≤ 120 chars). Longer
  quotes compress font size visually and may not finish the wipe in time.

## Provenance

| Design choice | Source |
|---------------|--------|
| Component name `CustomerStory` | Proposal §3.5 lines 340–406. |
| Metrics data shape (`value, label, unit, deltaPct`) | Matches `MetricsCard` props for SCF-author familiarity (proposal §3.5). |
| Native metric chips (no MetricsCard import) | Rubber-duck finding #6: Slate has no subcomponent composition. |
| Quote clip-path wipe pattern | Mirrors `SplitScreen/animation.js` and `SectionDivider` title wipe. |
| Counter roll via `gsap.to({ value: 0 }, { value: target, onUpdate })` | Canonical pattern from `MetricsCard/animation.js` lines 7–22. |
| Data-island pattern for `metricsJson` | Mirrors `DataFlow` / `DataChart` precedent (CONTRACT §3.2 note, `data-flow.md`). |
| Attribution layout (photo + name + title) | Adapts `Quote/index.html` attribution block (`.qt-attr`, `.qt-photo`). |
| Class prefix `cs-` | **Invented** for this PR. Orchestrator must add to CONTRACT §5 prefix registry. |
| Selector hygiene (`'.scene-' + SCENE_ID + ' .cs-...'`) | CONTRACT §4.3. |
| Exit fade 0.4s before scene end | CONTRACT §7 checklist. |

## Deferred dependencies

CustomerStory is **fully self-contained at runtime**. The following are
related but not blocking:

- **Prop transformer** — the orchestrator will add a builder that stringifies
  `metrics[]` → `metricsJson` and `attribution` → dotted mustache paths.
  Until then, SCF authors pass `metricsJson` pre-stringified.
- **Brand package integration** — a future PR may read `brand.primary` to
  tint the metric chip borders and quote accent. Currently uses neutral
  white/transparent defaults.
- **`narration-component-sync` skill** — timing props could be added for
  anchor-verb alignment (quote start, attribution reveal, first metric).
