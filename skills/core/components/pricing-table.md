# PricingTable Component

> Layer 2 component skill. Load when an explainer needs to compare **2–4
> pricing tiers side-by-side** — the canonical "Free / Pro / Enterprise" SaaS
> pricing grid. Each tier is its own column with name, price, billing cadence,
> a feature checklist, and an optional CTA. One tier may be highlighted as
> "Recommended."

## When to use

**Trigger vocabulary:** `pricing, tiers, plans, packages, subscription, "per
month", "per user", free, pro, business, enterprise, "compare plans",
"choose a plan", "what's included"`.

Pick `PricingTable` when the narration is genuinely listing **purchasable
plans** with a price scalar (or "Free" / "Custom"). For a feature-by-feature
comparison against competitors (no price column), use `CompetitiveMatrix`.
For a single tier's bullet list with no comparison, a `SlideRenderer`
title-bullets layout is lighter weight.

If you have more than 4 tiers, drop the cheapest legacy tier or merge
adjacent ones — past 4 columns at 1080p the grid becomes unreadable
(see Provenance: `cmp-` schema cap).

## Props

```json
{
  "title": "Plans for every team",
  "tiersJson": "[{\"id\":\"free\",\"name\":\"Free\",\"price\":\"$0\",\"billing\":\"forever\",\"features\":[\"5 projects\",\"1 GB storage\",\"Community support\"],\"ctaLabel\":\"Get started\"},{\"id\":\"pro\",\"name\":\"Pro\",\"price\":\"$12\",\"billing\":\"per user / month\",\"features\":[\"Unlimited projects\",\"100 GB storage\",\"Priority email support\",\"SSO via Google\"],\"ctaLabel\":\"Start free trial\"},{\"id\":\"enterprise\",\"name\":\"Enterprise\",\"price\":\"Custom\",\"features\":[\"Everything in Pro\",\"SAML SSO + SCIM\",\"99.9% SLA\",\"Dedicated success manager\"],\"ctaLabel\":\"Contact sales\"}]",
  "recommendedTierId": "pro",
  "disclaimer": "Prices in USD. Annual billing saves 20%."
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `title` | string | yes | Big headline above the grid (~56px). |
| `tiersJson` | JSON-stringified array | yes | **Max 4** tiers. Until the Lane C prop-builder ships, callers pre-stringify. Each tier: `{ id, name, price, billing?, features[], recommended?, ctaLabel? }`. `features[]` capped at 8 by the runtime. |
| `recommendedTierId` | string | no | The `tier.id` to highlight with the accent column treatment + "Recommended" badge + Flip lift. Falls back to `tier.recommended === true` if omitted. |
| `disclaimer` | string | no | Small legal/footer line under the grid. Hidden when empty. |

> **Compiler / SCF authoring (read this once).** `tiersJson` must be
> pre-stringified JSON until the Lane C prop-builder shim lands (mirrors the
> SectionDivider / DataFlow / DataChart precedent — see `data-flow.md`
> § "Compiler / SCF authoring"). The data-island pattern is a deliberate
> choice: the SCF compiler today has no per-component prop-builder, so any
> nested array prop must arrive at the template as a string.

## Visual recipe

| Step | Time (relative to `SCENE_START`) | Effect |
|------|----------------------------------|--------|
| Header rise | `+0.00s` → `+0.6s` | Title fades + lifts (`y: 30 → 0`) over `0.6s`, ease `power3.out`. |
| Column reveal | `+0.60s` → `+1.4s` | Each tier column fades + lifts (`y: 24 → 0`) with `0.10s` stagger left→right, ease `power3.out`. |
| Recommended emphasis | `+1.00s` → `+1.5s` | The recommended column performs a GSAP `Flip` lift — `translateY(-8px) scale(1.04)` plus the `--cmp-recommended` background tint. Falls back to a plain `back.out(1.6)` scale if `Flip` is unavailable. |
| Recommended badge | `+1.20s` → `+1.65s` | "RECOMMENDED" pill drops in above the column (`back.out(1.7)`). Skipped if no tier is highlighted. |
| Feature cascade | `+1.60s` → ... | Per-tier feature bullets fade + slide right (`x: −10 → 0`) with `0.05s` stagger. ONE group tween across all `.pt-feature-li` — never per-cell. |
| Footer fade | `−1.4s` from end | Disclaimer line fades + lifts (`y: 8 → 0`) over `0.5s`. Skipped if `disclaimer` is empty. |
| Exit fade | `SCENE_START + SCENE_DURATION − 0.4s` | Whole component fades to opacity 0 over `0.4s` (CONTRACT §7). |

**Recommended scene duration:** **8–10 seconds**. Less than 7s and the
feature cascade overlaps the exit fade; more than 12s and the grid sits
static for too long — pair with narration that explicitly walks each tier.

## Composition tips

- **Pair with narration that names tier prices in spoken order** (free →
  paid → enterprise). The column reveal animation is left-to-right; if the
  voiceover lists them out of order the eye and ear desync.
- **Keep prices short.** `"$12"` reads better than `"$11.99 USD"`. Use the
  `billing` slot ("per user / month") for cadence.
- **Limit features per tier to ~5.** The cap is 8 but at 1080p eight
  bullets per column starts to feel like a wall. If a tier truly has more,
  consider promoting the longer feature set into a follow-on
  `SlideRenderer` deep-dive scene.
- **Always set `recommendedTierId`** on a 3-tier layout. Pricing UX
  research (Stripe, Linear, Vercel pricing pages) consistently shows that
  an unhighlighted middle tier underperforms — the lift is what nudges
  the eye to the intended default.
- **Don't follow with another grid.** A `PricingTable` is dense; the next
  scene should be a breath (cut to a customer quote, screen demo, or
  CTA card).

## Provenance

| Design choice | Source |
|---------------|--------|
| Component name `PricingTable` | Slate Phase II proposal §3.5 (`.internal/proposal-phase-ii-component-library-and-intelligence.md` lines 340–406). |
| Props (`title`, `tiers[]`, `recommendedTierId`, `disclaimer`) | Same proposal §3.5. |
| Schema cap of 4 tiers / 8 features per tier | `pr3-comparison-grid-spec.md` § "DOM caps (schema-enforced)". Readability + 30-tween budget per CONTRACT §6. |
| Defer of `cards` layout + `comparisonMode` switch | Rubber-duck finding #7 (PR 3 Lane A scope) — ship `columns` only this PR. |
| Shared `cmp-` grid prefix + `pt-` overrides | `pr3-comparison-grid-spec.md` § "Class prefix registry". |
| Choreography (header rise → column reveal → recommended emphasis → cascade → footer fade → exit) | `pr3-comparison-grid-spec.md` § "Choreography (shared timeline)". |
| GSAP Flip for recommended column lift | `pr3-comparison-grid-spec.md` § "GSAP Flip use" — Flip is loaded as a runtime global. |
| Recommended-tier highlight UX (color tint + lift + badge) | Stripe / Linear / Vercel pricing pages — broadcast pricing-page convention since ~2018. |
| Animation order: header → columns → recommended → features | Visual-hierarchy convention — viewers parse "what is this" → "what are my options" → "which one" → "details" in that order. |
| JSON data-island pattern (`<script type="application/json">`) | `SectionDivider/animation.js` precedent (lines 29–33) — compiler has no per-component prop builder today (`render/lib/scf-to-html.mjs`). |
| Single root + `data-scene-component` attr | CONTRACT.md §3.1. |
| Selector hygiene (`'.scene-' + SCENE_ID + ' .pt-...'`) | CONTRACT.md §4.3 lines 116–118. |
| Exit fade landing 0.4s before scene end | CONTRACT.md §7 lines 167–174 + task spec. |
| Group-tween features (no per-cell free-for-all) | Rubber-duck finding #9 + CONTRACT §6 (≤30 active tweens). |
| Class prefix `pt-` | **Invented** for this PR. The orchestrator must add it to CONTRACT §5 prefix registry. |

## Deferred dependencies

PricingTable is **fully self-contained at runtime**. The following are
related but not blocking:

- **Lane C prop-builder shim** — when it lands, callers can switch from
  `tiersJson` (pre-stringified) to `tiers` (natural array). The animation.js
  already reads from a JSON data-island, so only the template binding
  needs to change at that point. Same dependency as SectionDivider's
  `gradientStopsJson`.
- **`cards` layout + `comparisonMode` switch** — proposal §3.5 mentions a
  card variant and a row-vs-column toggle. Deferred per rubber-duck
  finding #7 to keep this PR's scope tight; orchestrator-side schema
  should leave the `layout` and `comparisonMode` prop slots open for a
  future PR.
- **Brand-color resolver atom** — the recommended column accent
  (`--cmp-accent`) should ultimately come from the brand package, not
  the hard-coded `#2563eb`. Same deferred dependency as SectionDivider.
- **`narration-component-sync` skill** — the column-reveal stagger
  should eventually align to the spoken tier names (`"Free"`, `"Pro"`,
  `"Enterprise"`). Today it runs on the fixed `0.10s` stagger; once the
  alignment skill ships, expose `columnRevealStartSec` and
  `columnRevealStaggerSec` as override props.
