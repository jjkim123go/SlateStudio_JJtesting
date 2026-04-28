# ComplianceBadgeWall Component

> Layer 2 component skill. Load when a scene needs to display a grid of
> compliance certifications, attestations, or trust signals — optionally
> with one badge spotlighted, grouped by category/region/status, and a
> footer caveat.

## When to use

**Trigger vocabulary:**
`compliance, certifications, attestations, badges, trust signals, audit,
SOC 2, ISO 27001, HIPAA, FedRAMP, GDPR, NIST, PCI DSS, CSA STAR,
HITRUST, attest, certified, accredited, in scope, regional residency`.

Pick ComplianceBadgeWall (over a generic image grid) when the narration
emphasizes **trust** or **regulatory posture** and the visual goal is
"we have these and we are proud of it." If a single attestation is the
hero with detail copy, use the `spotlightBadgeId` prop to enlarge it.

## Props

> Source: proposal §3.6 *Phase II Component Library and Intelligence*,
> lines 425–435 (component spec) and 432–434 (animation contract).

```json
{
  "title": "Trust & compliance posture",
  "badges": [
    { "id": "soc2",  "name": "SOC 2 Type II", "iconSrc": "assets/badges/soc2.svg",
      "category": "Security",     "detail": "Audited annually by KPMG",
      "status": "current", "regionScope": "Global" },
    { "id": "iso27001", "name": "ISO 27001",  "iconSrc": "assets/badges/iso27001.svg",
      "category": "Security",     "status": "current" },
    { "id": "hipaa", "name": "HIPAA",         "category": "Healthcare",
      "status": "current",        "regionScope": "United States" },
    { "id": "fedramp", "name": "FedRAMP High","category": "Public sector",
      "status": "planned",        "regionScope": "United States" }
  ],
  "groupBy": "category",
  "spotlightBadgeId": "soc2",
  "footerText": "All certifications verified by third-party auditors."
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `title` | string | no | Section heading shown above the grid. |
| `badges` | array | yes | List of badge objects (see schema below). At least one required. |
| `groupBy` | enum | no | `category` \| `region` \| `status`. Inserts separator headers. |
| `spotlightBadgeId` | string | no | `id` of one badge to enlarge in the spotlight slot above the grid. |
| `footerText` | string | no | Caveat / source-of-truth line under the grid. |

**Badge object schema:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable identifier (used by `spotlightBadgeId`). |
| `name` | string | yes | Badge display name (e.g. "SOC 2 Type II"). |
| `iconSrc` | string | no | Path to logo. **Optional** — falls back to initials in a colored circle if missing. |
| `category` | string | no | Used by `groupBy: "category"` and shown in tile meta. |
| `detail` | string | no | One-line supporting copy (auditor name, scope). Shown in tile meta and spotlight. |
| `status` | enum | no | `current` (default) or `planned`. `planned` tiles render dashed amber. |
| `regionScope` | string | no | Used by `groupBy: "region"` and shown when `category` is absent. |

## Compiler / SCF authoring (read this once)

The compiler (`render/lib/scf-to-html.mjs`) currently passes `scene.props`
directly to the mustache template, which only handles scalars. Until the
Lane C prop-builder shim lands, the SCF author has two options:

**Option A — pre-stringify in the SCF (works today):**
```json
"props": {
  "title": "…",
  "badgesJson": "[{\"id\":\"soc2\",\"name\":\"SOC 2 Type II\",…}]",
  "groupBy": "category",
  "spotlightBadgeId": "soc2"
}
```

**Option B — natural arrays (works once Lane C ships the prop-builder):**
```json
"props": {
  "title": "…",
  "badges": [ … ],
  "groupBy": "category",
  "spotlightBadgeId": "soc2"
}
```

The component reads from a `data-cbw-badges="{{badgesJson}}"` attribute on
its root, mirroring how `DataChart` consumes `labels` / `series` strings.

## Animation contract

> Source: `render/components/CONTRACT.md` §3.1 (root div + `data-scene-component`,
> lines 41–45), §3.3 Pattern B (scoped CSS, lines 69–82), §4.3 selector
> hygiene (lines 116–118), §7 self-review (lines 165–172). Animation timing
> derived from proposal §3.6 line 435 ("staggered grid pop-in, badge
> spotlight, optional list of attestations").

| Step | Time (relative to `SCENE_START`) | Effect |
|------|----------------------------------|--------|
| Build DOM | +0.05s | Parse badges JSON; build spotlight + grid + group separators imperatively. |
| Header fade | +0.20s | Title fades + slides 12px down → 0. |
| Group headers | +0.60s | Category labels fade in, separator rules sweep left→right (stagger 0.18s). |
| Tile pop-in | +0.85s | Each tile scales 0.7→1, opacity 0→1, `back.out(1.5)`, stagger 0.06s. |
| Spotlight | +1.40s | Spotlight card scales 0.86→1 with halo (CSS `box-shadow`). |
| Spotlight detail | +1.85s | Detail copy fades + slides up. |
| Footer | +2.20s | Footer fades + slides up. |
| Exit fade | `SCENE_START + SCENE_DURATION − 0.4s` | Whole component fades out. |

**Recommended scene duration:** 6–10 seconds. Below 5s the badge stagger feels rushed; above 10s the static hold becomes dead air — cut to a follow-up scene instead.

## Recommended narration anchors

The compiler will eventually time-align narration to these *verbs* (not
filler words). Author your narration so these verbs land near the
corresponding animation:

| Animation step | Anchor verb / phrase |
|----------------|----------------------|
| Tile pop-in | **list, hold, certify, attest** ("we **hold** SOC 2…") |
| Spotlight   | **highlight, lead, focus** ("the one to **highlight** is…") |
| Footer      | **verify, audit** ("all of these are **audited** annually…") |

Avoid heuristic alignment to "and / the / our" — those words shift across
re-records and will desync the spotlight beat.

## Brand-package integration

| CSS custom property | Brand role |
|---------------------|------------|
| `--cbw-bg-from`, `--cbw-bg-to` | Background gradient endpoints. |
| `--cbw-tile`, `--cbw-tile-border` | Tile fill + border. |
| `--cbw-text`, `--cbw-muted` | Primary + secondary copy. |
| `--cbw-accent`, `--cbw-accent-soft` | Spotlight halo + initials-fallback color. Map to brand primary. |
| `--cbw-planned` | Status-pill color for `status: "planned"`. Default amber. |

Logos passed via `iconSrc` are rendered at native aspect ratio inside
`64×64` tiles (or `160×160` spotlight). Provide PNG/SVG with a transparent
background. **No** logo upscaling is performed.

## Provenance

| Design choice | Source |
|---------------|--------|
| Component name `ComplianceBadgeWall` | Proposal §3.6 line 426. |
| Props `title`, `badges`, `groupBy`, `spotlightBadgeId`, `footerText` | Proposal §3.6 lines 429–434. |
| Badge object fields `id`, `name`, `iconSrc`, `category`, `detail`, `status`, `regionScope` | Proposal §3.6 lines 430–431 (badge inline schema). |
| Animation: "staggered grid pop-in, badge spotlight, optional list of attestations" | Proposal §3.6 line 435. |
| Class prefix `cbw-` | **Invented** for this PR. Lane C must add it to CONTRACT §5 prefix registry (lines 138–146). |
| Initials fallback for missing `iconSrc` | **Invented** — proposal does not specify a missing-icon behavior. Chosen because compliance decks often lack a logo for early-stage attestations (e.g. internal "SDLC review"). |
| Dashed amber border for `status: "planned"` | **Invented** — proposal lists the prop but not its visual treatment. Dashed amber is the cross-industry convention for "in flight." |
| JSON data-island pattern via `data-cbw-badges="{{badgesJson}}"` | **Invented** for this PR, *consistent with* `DataChart` precedent (`labels`/`series` are strings of JSON in `tests/qa-scenarios/smoke-data-chart-bar.scf.json`). The compiler does not yet have per-component prop builders (`render/lib/scf-to-html.mjs` lines 219–279). |
| Selector hygiene (`'.scene-' + SCENE_ID + ' .cbw-…'`) | CONTRACT.md §4.3 lines 116–118. |
| Exit fade landing at `SCENE_DURATION − 0.4s` | CONTRACT.md §7 line 168 ("≥ 0.3s before scene end"). |

## Deferred dependencies

ComplianceBadgeWall is **fully self-contained at runtime**. The following
related components / skills mentioned in the proposal are **not yet built**
and the wall does **not depend on them**:

- **AudienceSafe** (proposal §3.7) — audience filter wrapping. Not required.
- **Disclaimer** (proposal §3.7) — legal copy banner. Not required.
- **demo-data-classifier** skill (proposal §4.x) — narration topic
  classification. Not required; this skill ships its own trigger vocab.

When those land, they may *wrap* a ComplianceBadgeWall scene without any
component change.
