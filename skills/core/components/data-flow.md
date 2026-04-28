# DataFlow Component

> Layer 2 component skill. Load when a scene needs to show **data moving
> between systems** with governance metadata — classification banners,
> encryption state, packet tokens, and optional callouts. The default
> mode is a clean left→right pipeline; a `mesh` mode supports many-to-many
> diagrams.

## When to use

**Trigger vocabulary:**
`data flow, data movement, governance, classification, encryption, lineage,
ingest, store, export, sovereignty, residency, GDPR transfer, cross-border,
PII flow, ETL, replication, sync, hand-off, gateway, gating, policy, DLP`.

Pick DataFlow (over `ArchitectureDiagram`) when the **edges carry meaning**
— what type of data, encrypted or not, what classification — rather than
just "service A talks to service B." If the focus is purely topology with
no governance overlay, prefer `ArchitectureDiagram`.

## Props

> Source: proposal §3.6 *Phase II Component Library and Intelligence*,
> lines 439–450 (component spec) and 450 (animation contract).

```json
{
  "title": "Customer telemetry — ingest to insight",
  "stages": [
    { "id": "edge",   "label": "Edge SDK",      "systemType": "client",
      "classification": "internal" },
    { "id": "ingest", "label": "Ingest API",    "systemType": "service",
      "classification": "internal", "region": "EU" },
    { "id": "lake",   "label": "Bronze lake",   "systemType": "storage",
      "classification": "confidential", "region": "EU" },
    { "id": "warehouse","label": "Warehouse",   "systemType": "warehouse",
      "classification": "confidential", "region": "EU" },
    { "id": "bi",     "label": "BI tools",      "systemType": "consumer",
      "classification": "internal" }
  ],
  "edges": [
    { "from": "edge",   "to": "ingest",   "dataType": "events",
      "protocol": "HTTPS", "encrypted": true },
    { "from": "ingest", "to": "lake",     "dataType": "raw events",
      "protocol": "Kafka", "encrypted": true,  "gatedBy": "schema validation" },
    { "from": "lake",   "to": "warehouse","dataType": "curated tables",
      "protocol": "internal", "encrypted": true, "gatedBy": "PII scrubber" },
    { "from": "warehouse","to": "bi",     "dataType": "aggregates",
      "protocol": "ODBC", "encrypted": false }
  ],
  "legend": {
    "classifications": [
      { "label": "Internal" }, { "label": "Confidential" }
    ],
    "encryptionStates": [
      { "label": "Encrypted",   "color": "#22c55e" },
      { "label": "Unencrypted", "color": "#f59e0b" }
    ]
  },
  "callouts": [
    { "targetId": "lake", "text": "Bronze lake retains raw events for 30 days, then auto-purges." }
  ],
  "mode": "linear"
}
```

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `title` | string | no | Diagram heading. |
| `stages` | array | yes | Ordered list of system nodes. |
| `edges` | array | yes | Directed connections between stages. |
| `legend` | object | no | `{ classifications: [...], encryptionStates: [...] }`. Renders as chips below the canvas. |
| `callouts` | array | no | `[{targetId, text}]` — small overlay cards anchored above the named stage. |
| `mode` | enum | no | `linear` (default) or `mesh`. |

**Stage object:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Used by edges and callouts. |
| `label` | string | yes | Display name. |
| `systemType` | string | no | Sub-label (e.g. `service`, `storage`). |
| `classification` | enum | no | `public` \| `internal` \| `confidential` \| `restricted` \| `pii`. Renders a colored banner above the stage. |
| `region` | string | no | Shown in sub-label when `systemType` absent. |
| `encryption` | string | no | Reserved for future per-stage encryption icons; not used today. |

**Edge object:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `from` | string | yes | Source stage `id`. |
| `to` | string | yes | Target stage `id`. |
| `dataType` | string | no | Shown above the edge midpoint. |
| `protocol` | string | no | Appended after `dataType` with `·` separator. |
| `encrypted` | bool | no | `true` → green stroke + green padlock + pulse. `false` → amber dashed stroke + amber padlock (no pulse). Omitted → neutral cyan stroke, no lock. |
| `gatedBy` | string | no | Shown as `(gate: …)` in the edge label. |

## Compiler / SCF authoring (read this once)

The compiler (`render/lib/scf-to-html.mjs`) currently passes `scene.props`
straight to mustache, which only handles scalars. Until the Lane C
prop-builder shim lands, the SCF author has two options:

**Option A — pre-stringify in the SCF (works today):**
```json
"props": {
  "title": "…",
  "stagesJson":   "[{\"id\":\"edge\",\"label\":\"Edge SDK\",…}]",
  "edgesJson":    "[{\"from\":\"edge\",\"to\":\"ingest\",…}]",
  "legendJson":   "{\"classifications\":[…],\"encryptionStates\":[…]}",
  "calloutsJson": "[{\"targetId\":\"lake\",\"text\":\"…\"}]",
  "mode": "linear"
}
```

**Option B — natural arrays/objects (works once Lane C ships the prop-builder):**
```json
"props": {
  "title": "…",
  "stages":   [ … ],
  "edges":    [ … ],
  "legend":   { … },
  "callouts": [ … ],
  "mode": "linear"
}
```

The component reads from `data-df-stages`, `data-df-edges`, `data-df-legend`,
`data-df-callouts`, `data-df-mode` attributes on its root, mirroring how
`DataChart` consumes `labels` / `series` strings (see
`tests/qa-scenarios/smoke-data-chart-bar.scf.json`).

## Animation contract

> Source: `render/components/CONTRACT.md` §3.1 (root div +
> `data-scene-component`, lines 41–45), §3.3 Pattern B (scoped CSS, lines
> 69–82), §4.1 globals (lines 100–106), §4.3 selector hygiene (lines
> 116–118), §7 self-review (lines 165–172). Stroke-reveal pattern mirrors
> `render/components/ArchitectureDiagram/animation.js` lines 14–23
> (`getTotalLength()` → `strokeDasharray` → tween `strokeDashoffset` to 0).
> Animation steps derived from proposal §3.6 line 450.

| Step | Time (relative to `SCENE_START`) | Effect |
|------|----------------------------------|--------|
| Build DOM | +0.05s | Parse JSON, compute layout for `mode`, build `<g>` stage nodes, `<path>` edges, lock icons, packet circles, legend chips, HTML callout overlays. |
| Header fade | +0.20s | Title fades + slides 10px down → 0. |
| Stage pop-in | +0.50s | Each `.df-stage` scales 0.78→1, opacity 0→1, `back.out(1.5)`, stagger 0.12s. |
| Edge stroke reveal | +1.20s | For each edge: measure `getTotalLength()`, set dasharray + dashoffset, tween offset → 0 over 0.85s, stagger 0.15s. |
| Edge labels | +1.60s | Labels fade in, stagger 0.15s. |
| Classification banners | +1.80s | Banners slide 8px down → 0, stagger 0.10s. |
| Encryption locks | +2.00s | Locks scale 0.6→1; encrypted locks then enter a continuous CSS pulse (`@keyframes`). |
| Packet tokens | +2.30s | For each edge: packet fades in at source, traverses Bézier source→mid→dest in ~1.1s, fades out. Stagger 0.18s. **Animated via `gsap.to({ attr:{cx,cy} })` — NOT MotionPath plugin.** |
| Callouts | +2.60s | Overlay cards fade + slide 6px up → 0, stagger 0.18s. |
| Legend | +3.00s | Legend chip row fades + slides up. |
| Exit fade | `SCENE_START + SCENE_DURATION − 0.4s` | Whole component fades out. |

**Recommended scene duration:** 9–14 seconds for ≤5 stages, 12–18 seconds
for mesh diagrams. Allow ≥3 seconds after the last animation finishes for
the viewer to read the labels.

## Recommended narration anchors

Time-align narration to these *verbs* (not filler words). The compiler will
eventually surface these as anchors for narration-component sync:

| Animation step | Anchor verb / phrase |
|----------------|----------------------|
| Stage pop-in | **ingest, land, arrive, persist** ("events **land** at the ingest API…") |
| Edge stroke reveal | **flow, route, replicate, hop, hand off** ("data **flows** into the bronze lake…") |
| Encryption lock pulse | **encrypt, sign, protect, secure** ("every hop is **encrypted** in transit…") |
| Classification banner | **classify, label, tag** ("the lake is **classified** confidential…") |
| Callout fade-in | **note, remember, retain** ("**note** that retention is 30 days…") |

Do **not** try to align on "the / and / a / so" — they shift across re-records.

## Brand-package integration

| CSS custom property | Brand role |
|---------------------|------------|
| `--df-bg-from`, `--df-bg-to` | Background gradient endpoints. |
| `--df-text`, `--df-muted` | Primary + secondary copy. |
| `--df-stage-fill`, `--df-stage-stroke` | Stage rectangle. |
| `--df-edge` | Default edge color (no encryption info). |
| `--df-edge-encrypted`, `--df-edge-unencrypted` | Map to brand "trust" / "warn" colors. |
| `--df-class-public`, `--df-class-internal`, `--df-class-confidential`, `--df-class-restricted`, `--df-class-pii` | Per-classification banner colors. Map to your data-classification taxonomy. |

The legend `color` field on each item lets you override these per-scene
without touching CSS.

## Provenance

| Design choice | Source |
|---------------|--------|
| Component name `DataFlow` | Proposal §3.6 line 440. |
| Props `title`, `stages`, `edges`, `legend`, `callouts`, `mode` | Proposal §3.6 lines 443–449. |
| Stage fields `id`, `label`, `systemType`, `classification`, `encryption`, `region` | Proposal §3.6 line 444 (inline schema). |
| Edge fields `from`, `to`, `dataType`, `protocol`, `encrypted`, `gatedBy` | Proposal §3.6 line 445 (inline schema). |
| `mode: linear \| mesh` | Proposal §3.6 line 449. |
| Animation: "stage pop-ins, edges stroke-reveal, packet tokens travel along edges, encryption locks pulse, classification banners slide" | Proposal §3.6 line 450. |
| Class prefix `df-` | **Invented** for this PR. Lane C must add it to CONTRACT §5 prefix registry (lines 138–146). |
| Stroke-reveal via `getTotalLength()` + `strokeDashoffset` (no DrawSVG) | Mirrors `render/components/ArchitectureDiagram/animation.js` lines 14–23. PR 0 explicitly deferred the DrawSVG plugin. |
| Packet token uses `gsap.to({attr:{cx,cy}})` Bézier in two segments (NOT MotionPath plugin) | **Invented** for this PR; MotionPath is a paid plugin and PR 0 explicitly limited animation to core GSAP. |
| Curve only in `mesh` mode (linear stays straight) | **Invented**; mesh mode benefits from curved Béziers to avoid edge overlap; linear mode reads better as a horizontal pipeline. |
| Encrypted edge: solid green + pulsing lock; unencrypted: dashed amber + static lock; unspecified: cyan, no lock | **Invented** for this PR. Proposal mentions "encryption locks pulse" but does not specify the unencrypted treatment. Chosen because dashed-amber is the standard "untrusted channel" convention. |
| Classification color palette (slate / cyan / violet / pink / red) | **Invented**. Brand packages can override via CSS custom properties listed above. |
| HTML overlay callouts (anchored above the named stage) | **Invented**; proposal lists the prop but not the visual placement. Top-anchored cards keep edges and labels free of overlap. |
| JSON data-island pattern via `data-df-*` attributes | **Invented** for this PR, *consistent with* `DataChart` precedent. Compiler has no per-component prop builder today (`render/lib/scf-to-html.mjs` lines 219–279). |
| Selector hygiene (`'.scene-' + SCENE_ID + ' .df-…'`) | CONTRACT.md §4.3 lines 116–118. |
| Exit fade landing at `SCENE_DURATION − 0.4s` | CONTRACT.md §7 line 168. |

## Deferred dependencies

DataFlow is **fully self-contained at runtime**. The following related
components / skills mentioned in the proposal are **not yet built** and
DataFlow does **not depend on them**:

- **AudienceSafe** (proposal §3.7) — audience filter. Not required.
- **Disclaimer** (proposal §3.7) — legal banner. Not required.
- **demo-data-classifier** skill (proposal §4.x) — narration topic
  classification. Not required; this skill ships its own trigger vocab.

When those land, they may wrap a DataFlow scene without any component
change. The packet-token animation is intentionally **deterministic by
edge index** so a future `audience-safe` overlay can predict + redact a
specific edge if needed.
