# CompetitiveMatrix Component

> Layer 2 component skill. Load when an explainer needs to compare **a
> product against 1–3 competitors on 4–12 features**. Renders the canonical
> "Us vs Them" feature checkmark grid — products as columns, features as
> rows, ratings as colored icons (✓ / ~ / × / —). One product column
> (typically "us") may be highlighted via a Flip lift.

## When to use

**Trigger vocabulary:** `compare, vs, versus, "vs the competition", alternative,
"unlike", "ours has", "they don't", "feature parity", checklist, "side by
side", "what makes us different", competitor.`

Pick `CompetitiveMatrix` when the narration is explicitly contrasting
products on **discrete capabilities**, not on price (use `PricingTable` for
that) and not on a single dimension (use `DataChart` bar-chart for one-axis
comparison). Skip this component for "we're better because..." soft-claim
narratives — those want a `Quote` or `MetricsCard`, not a feature grid.

If you only have 1 product and 1 competitor, the grid still works but feels
sparse — consider a `SplitScreen` with two `MetricsCard`s instead.

## Props

```json
{
  "title": "How we compare",
  "productsJson": "[{\"id\":\"us\",\"name\":\"Contoso\",\"logoSrc\":\"assets/logos/contoso.png\",\"isUs\":true},{\"id\":\"acme\",\"name\":\"Acme\",\"logoSrc\":\"assets/logos/acme.png\"},{\"id\":\"globex\",\"name\":\"Globex\",\"logoSrc\":\"assets/logos/globex.png\"}]",
  "featuresJson": "[{\"id\":\"sso\",\"label\":\"SAML SSO\",\"ratings\":{\"us\":\"yes\",\"acme\":\"partial\",\"globex\":\"no\"}},{\"id\":\"audit\",\"label\":\"Audit log export\",\"ratings\":{\"us\":\"yes\",\"acme\":\"no\",\"globex\":\"yes\"}}]",
  "highlightProductId": "us",
  "disclaimer": "Comparison as of Q3 2025. Public docs only.",
  "footnotesJson": "[\"Acme partial SSO requires Enterprise tier.\",\"Globex audit log retention capped at 30 days.\"]"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `title` | string | yes | Headline above the grid (~48px). |
| `productsJson` | JSON-stringified array | yes | **Max 4** products. Each: `{ id, name, logoSrc?, isUs? }`. `logoSrc` is assumed pre-resolved (the orchestrator's nested asset resolver in `scf-to-html.mjs` rewrites paths before substitution). |
| `featuresJson` | JSON-stringified array | yes | **Max 12** features. Each: `{ id, label, category?, ratings: { [productId]: "yes"\|"partial"\|"no"\|"n/a" \| { value, note? } } }`. Unknown rating values silently coerce to `"n/a"`. |
| `highlightProductId` | string | no | The `product.id` to lift via Flip. Falls back to the first product whose `isUs === true`. |
| `disclaimer` | string | no | Small legal/footer line above the footnotes list. Hidden when empty. |
| `footnotesJson` | JSON-stringified array of strings | no | **Max 4** numbered footnotes. Hidden when empty. |

> **Schema rule (orchestrator-enforced):** the SCF schema requires `oneOf
> [disclaimer, footnotes (non-empty)]` to encourage at least one source-of-truth
> note when comparing products (rubber-duck finding #5). The component itself
> renders both when present and gracefully omits whichever is absent.

> **Compiler / SCF authoring (read this once).** `productsJson`, `featuresJson`,
> and `footnotesJson` must be pre-stringified JSON until the Lane C
> prop-builder shim lands (mirrors the SectionDivider / DataFlow / DataChart
> precedent). The data-island pattern is a deliberate choice: the SCF compiler
> today has no per-component prop-builder, so any nested array prop must
> arrive at the template as a string.

## Visual recipe

| Step | Time (relative to `SCENE_START`) | Effect |
|------|----------------------------------|--------|
| Header rise | `+0.00s` → `+0.6s` | Title fades + lifts (`y: 30 → 0`), ease `power3.out`. |
| Column reveal | `+0.60s` → `+1.4s` | Each product column fades + lifts (`y: 24 → 0`) with `0.10s` stagger left→right, ease `power3.out`. The `data-is-us="true"` (or `data-highlight="true"`) column gets the `--cmp-recommended` background tint baked in via CSS. |
| Highlight emphasis | `+1.00s` → `+1.5s` | The highlight column performs a GSAP `Flip` lift — `translateY(-8px) scale(1.04)`. Falls back to a plain `back.out(1.6)` scale if `Flip` is unavailable. |
| Row cascade | `+1.60s` → ... | Each body row fades + slides up (`y: 12 → 0`) with `0.12s` stagger. ONE group tween across all `.cmp-row:not(.cmp-row--header)` — never per-cell. |
| Cell content morph | `+1.65s` → ... | All `.cm-rating-icon` icons scale in (`scale: 0.6 → 1`, `back.out(1.7)`) as a single group tween with `0.04s` stagger — visually riding on top of the row cascade. |
| Rating notes | `+2.00s` → ... | Optional `cm-rating-note` text fades in with `0.05s` stagger. Skipped when no rating provides a `note`. |
| Footer fade | `−1.4s` from end | Disclaimer + footnotes block fades + lifts (`y: 8 → 0`) over `0.5s`. Whole footer hidden if neither is present. |
| Exit fade | `SCENE_START + SCENE_DURATION − 0.4s` | Whole component fades to opacity 0 over `0.4s` (CONTRACT §7). |

**Recommended scene duration:** **9–11 seconds**. The row cascade alone
takes `1.6s + 12 × 0.12s ≈ 3.0s` for a fully-loaded matrix. Add header
(0.6s), settle (0.5s), and exit (0.4s) and the floor is ~7s; below that
the cascade tail clips into the exit fade.

## Composition tips

- **Order features by competitive advantage.** The cascade is top-to-bottom;
  put the features where you (the highlighted column) clearly win at the
  top so the visual story lands before the audience reads the entire grid.
- **Mix in `partial` ratings.** A grid that's all ✓ for "us" and all × for
  competitors reads as marketing fluff and damages credibility. Use `partial`
  (the warn-orange icon) honestly — it makes the ✓s more believable.
- **Use the `note` form sparingly.** `{ value: "partial", note: "Enterprise tier only" }`
  is great for one or two cells. Sprinkling notes everywhere creates a
  reading workload that overwhelms the cascade.
- **Always include `disclaimer` OR `footnotes`** for B2B / enterprise
  comparisons (the schema requires it). Cite the date and source — these
  comparisons go stale fast and the footer is your audit trail.
- **Brand the `isUs` column** with your real logo. The blue accent
  (`--cmp-accent`) is the default but a brand-package override is on the
  roadmap (see Deferred dependencies).
- **Don't include yourself as a competitor row label.** The `isUs` column
  signals it visually; restating "Us" in the column name is redundant.

## Provenance

| Design choice | Source |
|---------------|--------|
| Component name `CompetitiveMatrix` | Slate Phase II proposal §3.5 (`.internal/proposal-phase-ii-component-library-and-intelligence.md` lines 340–406). |
| Props (`title`, `products[]`, `features[]`, `highlightProductId`, `disclaimer`, `footnotes[]`) | Same proposal §3.5. |
| `oneOf [disclaimer, footnotes (non-empty)]` schema rule | Rubber-duck finding #5 (PR 3 Lane A scope). Component renders both gracefully; the orchestrator wires the schema constraint. |
| Schema cap of 4 products / 12 features / 4 footnotes | `pr3-comparison-grid-spec.md` § "DOM caps (schema-enforced)". 4×12 = 48 cells respects CONTRACT §6 30-tween budget via group-tween icon stagger. |
| Shared `cmp-` grid prefix + `cm-` overrides | `pr3-comparison-grid-spec.md` § "Class prefix registry". |
| Choreography (header rise → column reveal → highlight → row cascade → cell morph → footer → exit) | `pr3-comparison-grid-spec.md` § "Choreography (shared timeline)". |
| GSAP Flip for highlight-column lift | `pr3-comparison-grid-spec.md` § "GSAP Flip use" — Flip is a runtime global. |
| Rating icon vocabulary (`yes` / `partial` / `no` / `n/a`) | Industry feature-comparison convention — Gartner / G2 / Capterra all use the same 4-state vocabulary. The `~` glyph for partial is a deliberate non-half-circle choice (avoids confusion with progress bars). |
| Numbered footnotes via CSS counters | Editorial convention (NYT, Economist) — superscript-numbered claims with footer notes signal evidence-based comparison rather than marketing claim. |
| Single group-tween icon morph (NOT per-cell) | Rubber-duck finding #9 + CONTRACT §6 (≤30 active tweens). 48 cells × per-cell tweens would blow the budget. |
| Animation order: row cascade above icon morph | Eye tracking convention — readers parse the row label first, then the cells in that row. Cascading the row before the icons inside it matches the natural reading order. |
| JSON data-island pattern (`<script type="application/json">`) | `SectionDivider/animation.js` precedent (lines 29–33) — compiler has no per-component prop builder today (`render/lib/scf-to-html.mjs`). |
| Asset resolver assumption for `products[].logoSrc` | Rubber-duck finding #2 — the orchestrator's nested-asset-resolver in `scf-to-html.mjs` PR 3 wiring step rewrites paths before mustache substitution. Component template assumes paths are already absolute. |
| Single root + `data-scene-component` attr | CONTRACT.md §3.1. |
| Selector hygiene (`'.scene-' + SCENE_ID + ' .cm-...'`) | CONTRACT.md §4.3 lines 116–118. |
| Exit fade landing 0.4s before scene end | CONTRACT.md §7 lines 167–174 + task spec. |
| Class prefix `cm-` | **Invented** for this PR. The orchestrator must add it to CONTRACT §5 prefix registry. |

## Deferred dependencies

CompetitiveMatrix is **fully self-contained at runtime**. The following are
related but not blocking:

- **Lane C prop-builder shim** — when it lands, callers can switch from
  `productsJson` / `featuresJson` / `footnotesJson` (pre-stringified) to
  `products` / `features` / `footnotes` (natural arrays). The animation.js
  already reads from JSON data-islands, so only the template binding needs
  to change at that point. Same dependency as SectionDivider's
  `gradientStopsJson` and PricingTable's `tiersJson`.
- **Nested asset resolver in `scf-to-html.mjs`** — `products[].logoSrc`
  resolution is the orchestrator's responsibility per rubber-duck finding
  #2. Component template treats the prop as an already-absolute URL.
- **`oneOf [disclaimer, footnotes]` schema constraint** — orchestrator must
  add this to the SCF schema $defs per rubber-duck finding #5. Component
  renders both gracefully today; schema enforcement is a separate concern.
- **Brand-color resolver atom** — the highlight column accent
  (`--cmp-accent`) should ultimately come from the brand package, not the
  hard-coded `#2563eb`. Same deferred dependency as PricingTable.
- **`narration-component-sync` skill** — the row cascade stagger should
  eventually align to spoken feature names. Today it runs on the fixed
  `0.12s` stagger; once the alignment skill ships, expose
  `rowCascadeStartSec` and `rowCascadeStaggerSec` as override props.
- **Category grouping** — `feature.category` is allowed in the prop schema
  but currently ignored by rendering. A future PR may group rows by
  category with subheader rows; the data already supports it.
