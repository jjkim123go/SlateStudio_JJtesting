# Brand Package Linting

> **Layer:** Meta — cross-cutting compliance  
> **Stage:** `compose` (runs AFTER scene-component-routing + narration-component-sync, BEFORE render)  
> **File:** `skills/meta/brand-package-linting.md`  
> **Purpose:** Validate an SCF draft and component props against explicit Brand Package rules before render.

---

## When to load this skill

Load this skill whenever ANY of the following conditions are true:

1. The SCF document has a non-empty `brandPackage` field.
2. The pipeline manifest has `brand.required: true` or `brand_compliance: required_if_brand_package`.
3. The user mentions any of these trigger words:
   - brand, brand package, color, logo, safe area, typography
   - disclaimer, CTA style, intro/outro, watermark
   - compliance, brand-check, palette, font stack, legal text

**Governance contract:** The production loop (`skills/meta/production-loop.md`)
specifies `brand_compliance: required_if_brand_package`. When `brandPackage` is set,
this skill's output is a blocking gate — compose CANNOT proceed to render until the
linter passes (or all violations are waived).

---

## Chain position

This skill is the THIRD in the Phase II intelligence chain:

1. **scene-component-routing** → picks components
2. **narration-component-sync** → times reveals to narration
3. **brand-package-linting** → verifies compliance ← YOU ARE HERE

The linter operates on the FINAL SCF document — after routing has assigned
components and sync has patched timing props. It is a read-only validator: it
does NOT mutate the SCF. It produces a findings report that gates or warns.

---

## Brand Package schema

Brand Packages live in `config/org/brand-packages/<name>.yaml`. The `brandPackage`
field in SCF is the `<name>` (filename without `.yaml`).

### Expected YAML schema

```yaml
# config/org/brand-packages/contoso.yaml
name: "Contoso"
version: "2.1"

colors:
  primary: "#0078D4"
  secondary: "#50E6FF"
  accent: "#FF8C00"
  background: "#1B1B1F"
  surface: "#2D2D30"
  text: "#FFFFFF"
  textMuted: "#ABABAB"
  allowedPalette:
    - "#0078D4"
    - "#50E6FF"
    - "#FF8C00"
    - "#1B1B1F"
    - "#2D2D30"
    - "#FFFFFF"
    - "#ABABAB"
    - "#005A9E"       # Dark variant
    - "#002050"       # Navy for backgrounds
  semanticOverrides:
    success: "#22c55e"
    warning: "#f59e0b"
    error: "#ef4444"
    info: "#3b82f6"

fonts:
  heading: "Segoe UI Semibold"
  body: "Segoe UI"
  mono: "Cascadia Code"
  fallbackStack: "system-ui, -apple-system, sans-serif"

logo:
  src: "config/org/brand-packages/assets/contoso-logo.svg"
  allowedAssets:
    - "config/org/brand-packages/assets/contoso-logo.svg"
    - "config/org/brand-packages/assets/contoso-logo-white.svg"
    - "config/org/brand-packages/assets/contoso-icon.svg"
  minSize: 48            # Minimum rendered dimension (px)
  maxSize: 200           # Maximum rendered dimension (px)
  forbiddenBackgrounds:
    - "#FFFFFF"          # White logo on white = invisible
    - "#F5F5F5"          # Near-white
    - "#FAFAFA"

safeAreas:
  titleSafe: 0.05        # 5% inset from each edge
  captionSafe: 0.15      # Bottom 15% reserved for captions
  logoZone: "top-right"  # Where persistent logo goes
  logoMargin: 24         # px from edge

requiredDisclaimers:
  - "AI-generated content. For illustrative purposes only."
  - "© 2025 Contoso Ltd. All rights reserved."

disclaimerConditions:
  external: true         # Required for external audiences
  regulated: true        # Required for regulated content
  internal: false        # Not required for internal

voice:
  allowedVoices:
    - "nova"
    - "echo"
    - "coral"
  defaultVoice: "nova"
  toneGuidance: "Professional, warm, measured pace. Avoid casual fillers."
```

### Schema rules

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | Yes | string | Human-readable brand name |
| `version` | Yes | string | Package version for audit |
| `colors.primary` | Yes | hex string | Main brand color |
| `colors.secondary` | Yes | hex string | Secondary brand color |
| `colors.accent` | Yes | hex string | Accent/CTA color |
| `colors.background` | Yes | hex string | Default background |
| `colors.allowedPalette` | Yes | hex string[] | All permitted colors |
| `colors.semanticOverrides` | No | map<string,hex> | Status colors exempt from palette check |
| `fonts.heading` | Yes | string | Font for headings / weight ≥ 600 |
| `fonts.body` | Yes | string | Font for body text |
| `logo.src` | Yes | path | Primary logo asset |
| `logo.allowedAssets` | Yes | path[] | All permitted logo files |
| `logo.minSize` | Yes | int (px) | Minimum rendered dimension |
| `logo.forbiddenBackgrounds` | Yes | hex string[] | Backgrounds that make logo invisible |
| `safeAreas.titleSafe` | Yes | float (0–1) | Inset fraction |
| `safeAreas.captionSafe` | Yes | float (0–1) | Bottom fraction reserved |
| `requiredDisclaimers` | No | string[] | Legal text that MUST appear |
| `voice.allowedVoices` | No | string[] | Permitted TTS voice IDs |

---

## The six checks

The linter performs six independent checks. Each produces a pass/fail result
and zero or more violation records.

### Grammar (from proposal §4.2)

```bnf
<brand-check> ::= <color-check>
                | <logo-check>
                | <font-check>
                | <safe-area-check>
                | <legal-check>
                | <voice-check>

<color-check>     ::= ensure(scene.props.colors subset brand.allowedPalette)
<logo-check>      ::= ensure(logo usage obeys minSize and forbidden backgrounds)
<font-check>      ::= ensure(text styles map to approved stack)
<safe-area-check> ::= ensure(persistent overlays avoid title-safe / caption-safe conflicts)
<legal-check>     ::= ensure(required disclaimers exist for external or regulated outputs)
<voice-check>     ::= ensure(TTS voice and tone hints do not violate brand guidance)
```

---

### Check 1: `color-check`

**What it validates:** Every color literal in the SCF is from the allowed palette
or is a documented semantic override.

**Traversal algorithm:**

1. Walk ALL scenes recursively.
2. For each scene, inspect:
   - `props.backgroundColor`
   - `props.accentColor`
   - `props.textColor`
   - `props.chartColors[]`
   - `props.gradientStops[]`
   - `props.borderColor`
   - `props.highlightColor`
   - Any layer with `style` containing color values
3. Also inspect top-level `captions.color`, `captions.highlightColor`, `captions.backgroundColor`.
4. For each found color literal (hex string):
   - Normalize to lowercase 6-digit hex (`#abc` → `#aabbcc`).
   - Check if it exists in `brand.colors.allowedPalette`.
   - If not, check if it matches any value in `brand.colors.semanticOverrides`.
   - If neither, emit violation.

**Violation record:**
```json
{
  "check": "color-check",
  "scene": "scene-3",
  "prop": "props.accentColor",
  "found": "#ff0000",
  "expected": "One of: #0078D4, #50E6FF, #FF8C00, ... or semantic override"
}
```

**Severity:** Warning (non-blocking). The agent SHOULD fix violations before render
but MAY proceed if the user explicitly approves.

---

### Check 2: `logo-check`

**What it validates:** Logo assets are approved, correctly sized, and not placed
on forbidden backgrounds.

**Traversal algorithm:**

1. Find all scenes using components: `BrandIntro`, `BrandOutro`, `EventBranding`.
2. Find all layers with `type: "image"` where `src` path matches `*logo*` or is in `brand.logo.allowedAssets`.
3. Find scenes with watermark layers.
4. For each logo reference:
   - **Asset check:** `src` must be in `brand.logo.allowedAssets`.
   - **Size check:** rendered size (from `position.width` / `position.height` or component defaults) must be ≥ `brand.logo.minSize`.
   - **Background check:** the scene's `props.backgroundColor` or the layer immediately below the logo MUST NOT be in `brand.logo.forbiddenBackgrounds`.

**Violation record:**
```json
{
  "check": "logo-check",
  "scene": "intro",
  "issue": "forbidden_background",
  "logoSrc": "assets/contoso-logo-white.svg",
  "backgroundColor": "#FFFFFF",
  "forbiddenBackgrounds": ["#FFFFFF", "#F5F5F5", "#FAFAFA"]
}
```

**Severity:** BLOCKING. Logo misuse is always a brand violation. The compose
stage MUST halt until resolved.

---

### Check 3: `font-check`

**What it validates:** Text layers and components use the approved font stack.

**Rules:**

1. Any layer or component prop with explicit font specification:
   - If `style: "heading"` or `style.fontWeight >= 600` → must use `brand.fonts.heading`.
   - Otherwise → must use `brand.fonts.body`.
   - Monospace (code, terminal) → must use `brand.fonts.mono` if defined.
2. If the SCF omits explicit fonts (relying on defaults), this check PASSES —
   the renderer inherits from the Brand Package CSS variables.
3. A scene or layer MAY declare `_brandWaiver: "<reason>"` to suppress this check
   for that specific element.

**Violation record:**
```json
{
  "check": "font-check",
  "scene": "scene-5",
  "prop": "layers[2].font",
  "found": "Comic Sans MS",
  "expected": "Segoe UI (body) or Segoe UI Semibold (heading)",
  "waiver": null
}
```

**Severity:** BLOCKING unless `_brandWaiver` is present. If waived, the violation
is logged but does not halt compose.

---

### Check 4: `safe-area-check`

**What it validates:** Persistent overlays do not intrude into protected screen areas.

**Safe-area math:**

For output resolution `W × H`:

| Zone | Definition | Purpose |
|------|-----------|---------|
| Title-safe | Inset by `safeAreas.titleSafe` (default 5%) from each edge | Critical text must be within this zone |
| Caption-safe | Bottom `safeAreas.captionSafe` (default 15%) of frame | Reserved for subtitles/captions — overlays must NOT intrude |

```
Title-safe bounds:
  left   = W * titleSafe
  right  = W * (1 - titleSafe)
  top    = H * titleSafe
  bottom = H * (1 - titleSafe)

Caption-safe zone (reserved, no overlays):
  top    = H * (1 - captionSafe)
  bottom = H
  left   = 0
  right  = W
```

**Checked elements:**
- `LowerThird` — its bounding box must NOT overlap caption-safe zone.
- `PresenterBug` (when built) — must stay in title-safe zone.
- `EventBranding` — must not intrude caption-safe.
- Watermark layers — must stay in title-safe zone.
- Logo overlays — must respect `safeAreas.logoZone` and `safeAreas.logoMargin`.

**Violation record:**
```json
{
  "check": "safe-area-check",
  "scene": "scene-7",
  "element": "LowerThird",
  "boundingBox": {"x": 0, "y": 850, "width": 600, "height": 120},
  "violation": "intrudes_caption_safe",
  "captionSafeTop": 918,
  "resolution": "1920x1080"
}
```

**Severity:** Warning. The agent should reposition overlays but may proceed if the
specific scene has no active captions.

---

### Check 5: `legal-check`

**What it validates:** Required disclaimers appear in the video when conditions are met.

**Algorithm:**

1. Load `brand.requiredDisclaimers[]`.
2. Determine output audience from SCF `metadata.audience` or pipeline context:
   - If `external` or `regulated` → disclaimers are required.
   - If `internal` → check `brand.disclaimerConditions.internal`.
3. For each required disclaimer string:
   - Search ALL scenes for a case-insensitive substring match in:
     - Any text layer `content`
     - Any `AnimatedCaption` with matching text
     - Any component with text props (e.g., `BrandOutro.disclaimer`)
   - If not found → violation.

**Violation record:**
```json
{
  "check": "legal-check",
  "missingDisclaimer": "AI-generated content. For illustrative purposes only.",
  "requiredBecause": "metadata.audience == 'external'",
  "suggestion": "Add disclaimer to BrandOutro scene or as a text layer in the final scene"
}
```

**Severity:** BLOCKING. Missing legal disclaimers for external/regulated content
is a compliance failure. Compose MUST halt.

---

### Check 6: `voice-check`

**What it validates:** The TTS voice used for narration is in the approved list.

**Algorithm:**

1. Load `brand.voice.allowedVoices[]`.
2. Inspect the pipeline's TTS configuration (from asset manifest or SCF metadata).
3. Check that the `voice` parameter used for narration generation matches one of the allowed voices.
4. If the SCF or scene declares `_brandWaiver: "<reason>"`, the check passes with a logged waiver.

**Violation record:**
```json
{
  "check": "voice-check",
  "voiceUsed": "shimmer",
  "allowedVoices": ["nova", "echo", "coral"],
  "waiver": null
}
```

**Severity:** Warning (non-blocking) — unless the Brand Package explicitly sets
`voice.strict: true`, in which case it becomes blocking.

---

## Output contract

The linter produces a single JSON findings report:

```json
{
  "passed": false,
  "brandPackage": "contoso",
  "brandPackageVersion": "2.1",
  "timestamp": "2025-07-15T14:32:00Z",
  "checks": [
    {
      "name": "color-check",
      "result": "pass",
      "violations": [],
      "waivers": []
    },
    {
      "name": "logo-check",
      "result": "fail",
      "violations": [
        {
          "scene": "intro",
          "issue": "forbidden_background",
          "logoSrc": "assets/contoso-logo-white.svg",
          "backgroundColor": "#FFFFFF"
        }
      ],
      "waivers": []
    },
    {
      "name": "font-check",
      "result": "pass",
      "violations": [],
      "waivers": []
    },
    {
      "name": "safe-area-check",
      "result": "warning",
      "violations": [
        {
          "scene": "scene-7",
          "element": "LowerThird",
          "violation": "intrudes_caption_safe"
        }
      ],
      "waivers": []
    },
    {
      "name": "legal-check",
      "result": "pass",
      "violations": [],
      "waivers": []
    },
    {
      "name": "voice-check",
      "result": "pass",
      "violations": [],
      "waivers": []
    }
  ],
  "totalViolations": 2,
  "blocking": true,
  "blockingChecks": ["logo-check"],
  "waivers": []
}
```

### Severity rules

| Check | Default severity | Blocking? |
|-------|-----------------|-----------|
| `color-check` | Warning | No — unless `brand.colors.strict: true` |
| `logo-check` | Error | **Always blocking** |
| `font-check` | Error | Blocking unless `_brandWaiver` present |
| `safe-area-check` | Warning | No — surfaced in review report |
| `legal-check` | Error | **Always blocking** for external/regulated |
| `voice-check` | Warning | No — unless `brand.voice.strict: true` |

A `blocking: true` result in the findings report means compose MUST NOT
proceed to render. The agent must either fix the violation or obtain an
explicit `_brandWaiver` from the user.

---

## Pipeline integration

### Where it runs

The linter executes as part of the `pre_compose_checklist` in the
production loop (`skills/meta/production-loop.md`). Specifically:

```
scene_plan → assets → [routing] → [sync] → LINTING → render
```

The compose-director skill MUST invoke this linter after:
1. Scene-component-routing has finalized component choices.
2. Narration-component-sync has patched timing props.
3. The SCF JSON is fully assembled but NOT yet sent to `render/render.mjs`.

### Failure behavior

- **Blocking failure** (logo-check, legal-check, font-check without waiver):
  The compose stage halts. The agent presents violations to the user with
  suggested fixes. The user may approve a waiver or request changes.
  The pipeline loops back to the appropriate fix-up step.

- **Warning** (color-check, safe-area-check, voice-check):
  The compose stage proceeds. Warnings are aggregated into the review report
  (review stage, `review_checkpoint: final`). The review-director skill
  surfaces them alongside Video Indexer findings.

### Trace integration

Every linting run appends a trace record to `projects/<slug>/decisions.jsonl`:

```json
{
  "stage": "compose",
  "check": "brand-package-linting",
  "timestamp": "2025-07-15T14:32:00Z",
  "result": "pass|fail|warning",
  "findingsPath": "output/brand_lint_findings.json"
}
```

This makes the compliance check auditable per the governance contract in
`skills/INDEX.md`.

---

## Worked examples

### Example 1: Clean SCF — all checks pass

```json
{
  "version": "1.0",
  "pipeline": "animated-explainer",
  "brandPackage": "contoso",
  "outputProfile": { "width": 1920, "height": 1080, "fps": 30 },
  "scenes": [
    {
      "id": "intro",
      "duration": 4,
      "component": "BrandIntro",
      "props": {
        "logoSrc": "config/org/brand-packages/assets/contoso-logo.svg",
        "companyName": "Contoso",
        "tagline": "Empowering every team",
        "backgroundColor": "#1B1B1F",
        "accentColor": "#0078D4"
      }
    },
    {
      "id": "scene-1",
      "duration": 10,
      "layers": [
        { "type": "image", "src": "output/assets/hero-shot.png" },
        {
          "type": "text",
          "content": "Unified Insights Platform",
          "style": "heading",
          "animation": "fadeInUp"
        }
      ],
      "narration": "output/assets/narration-scene1.wav"
    },
    {
      "id": "outro",
      "duration": 5,
      "component": "BrandOutro",
      "props": {
        "logoSrc": "config/org/brand-packages/assets/contoso-logo.svg",
        "ctaText": "Get Started",
        "ctaUrl": "https://contoso.com/start",
        "disclaimer": "AI-generated content. For illustrative purposes only.",
        "backgroundColor": "#1B1B1F"
      }
    }
  ],
  "captions": {
    "style": "word-highlight",
    "color": "#FFFFFF",
    "highlightColor": "#50E6FF",
    "position": "bottom"
  },
  "metadata": { "audience": "external", "ttsVoice": "nova" }
}
```

**Result:** All 6 checks pass. `blocking: false`, `totalViolations: 0`.

---

### Example 2: Fails `color-check` — unauthorized red

```json
{
  "version": "1.0",
  "pipeline": "animated-explainer",
  "brandPackage": "contoso",
  "outputProfile": { "width": 1920, "height": 1080, "fps": 30 },
  "scenes": [
    {
      "id": "intro",
      "duration": 4,
      "component": "BrandIntro",
      "props": {
        "logoSrc": "config/org/brand-packages/assets/contoso-logo.svg",
        "backgroundColor": "#1B1B1F",
        "accentColor": "#0078D4"
      }
    },
    {
      "id": "problem-scene",
      "duration": 8,
      "layers": [
        { "type": "image", "src": "output/assets/warning.png" },
        {
          "type": "text",
          "content": "Critical Alert!",
          "style": "heading",
          "animation": "bounceIn"
        }
      ],
      "props": {
        "backgroundColor": "#ff0000",
        "textColor": "#FFFFFF"
      }
    }
  ]
}
```

**Findings:**
```json
{
  "passed": true,
  "checks": [
    {
      "name": "color-check",
      "result": "warning",
      "violations": [
        {
          "scene": "problem-scene",
          "prop": "props.backgroundColor",
          "found": "#ff0000",
          "expected": "One of allowed palette OR semantic override (error=#ef4444)"
        }
      ]
    }
  ],
  "totalViolations": 1,
  "blocking": false
}
```

**Fix:** Replace `#ff0000` with the semantic override `#ef4444` (the approved
error color), or add it to `allowedPalette` in the Brand Package.

---

### Example 3: Fails `logo-check` + `safe-area-check`

```json
{
  "version": "1.0",
  "pipeline": "animated-explainer",
  "brandPackage": "contoso",
  "outputProfile": { "width": 1920, "height": 1080, "fps": 30 },
  "scenes": [
    {
      "id": "intro",
      "duration": 4,
      "component": "BrandIntro",
      "props": {
        "logoSrc": "config/org/brand-packages/assets/contoso-logo-white.svg",
        "backgroundColor": "#FFFFFF",
        "accentColor": "#0078D4"
      }
    },
    {
      "id": "speaker-scene",
      "duration": 12,
      "component": "LowerThird",
      "props": {
        "name": "Jane Smith",
        "title": "VP Engineering",
        "position": { "x": 0, "y": 900, "width": 600, "height": 120 }
      }
    }
  ]
}
```

**Findings:**
```json
{
  "passed": false,
  "checks": [
    {
      "name": "logo-check",
      "result": "fail",
      "violations": [
        {
          "scene": "intro",
          "issue": "forbidden_background",
          "logoSrc": "config/org/brand-packages/assets/contoso-logo-white.svg",
          "backgroundColor": "#FFFFFF",
          "forbiddenBackgrounds": ["#FFFFFF", "#F5F5F5", "#FAFAFA"]
        }
      ]
    },
    {
      "name": "safe-area-check",
      "result": "warning",
      "violations": [
        {
          "scene": "speaker-scene",
          "element": "LowerThird",
          "boundingBox": { "x": 0, "y": 900, "width": 600, "height": 120 },
          "violation": "intrudes_caption_safe",
          "captionSafeTop": 918,
          "resolution": "1920x1080",
          "note": "LowerThird bottom edge (1020px) exceeds caption-safe top (918px)"
        }
      ]
    }
  ],
  "totalViolations": 2,
  "blocking": true,
  "blockingChecks": ["logo-check"]
}
```

**Fixes:**
1. **Logo:** Change `backgroundColor` to `#1B1B1F` (dark) or use the standard
   (non-white) logo variant.
2. **Safe area:** Reposition `LowerThird` to `y: 780` so its bottom edge
   (780 + 120 = 900) stays above caption-safe top (918px at 1080p).

---

## Waiver mechanism

Any SCF scene or layer may include a `_brandWaiver` field:

```json
{
  "id": "special-scene",
  "duration": 6,
  "_brandWaiver": "Client requested non-brand red for urgency emphasis — approved by brand team 2025-07-10",
  "props": {
    "backgroundColor": "#ff0000"
  }
}
```

**Rules for waivers:**
- A waiver suppresses the violation for that specific element only.
- The waiver text MUST include a reason and approval reference.
- Waivers are logged in the findings report under `waivers[]`.
- `logo-check` and `legal-check` can be waived ONLY with explicit user confirmation
  during the compose checkpoint — the agent must ask.
- The review stage surfaces all waivers for final user awareness.

---

## Self-check checklist

Before reporting findings, the linting agent verifies:

- [ ] Brand Package YAML was successfully loaded and parsed.
- [ ] All 6 checks were executed (none skipped silently).
- [ ] Color normalization handled 3-digit hex, uppercase, and named colors.
- [ ] Logo check inspected BrandIntro, BrandOutro, and any watermark layers.
- [ ] Safe-area math used the ACTUAL output resolution (not hardcoded 1080p).
- [ ] Legal check determined audience context before asserting disclaimers.
- [ ] Voice check consulted the asset manifest for the actual TTS voice used.
- [ ] All violations include actionable `expected` guidance.
- [ ] Blocking vs. warning classification matches severity rules table.
- [ ] Findings JSON is valid and written to `output/brand_lint_findings.json`.
- [ ] Pipeline trace record was appended to `projects/<slug>/decisions.jsonl`.

---

## Component contract compliance

Per `render/components/CONTRACT.md` (§3.3, §3.4, §5), the linter also validates:

1. **CSS custom properties** — components that use `--brand-primary`, `--brand-accent`,
   etc. are compliant by definition (they inherit from the Brand Package CSS root).
   The linter only flags components with HARDCODED color values in their props.

2. **Class prefix uniqueness** — not a brand check, but the linter warns if it
   detects two components in the same scene sharing a class prefix (potential
   CSS collision that could break brand styling).

3. **Asset path resolution** — per CONTRACT.md §3.4, logo `src` values must be
   absolute paths or `file://` URLs. The linter validates path format.

---

## Edge cases

| Situation | Behavior |
|-----------|----------|
| `brandPackage` field is set but file doesn't exist | BLOCKING error — cannot lint without the package |
| Brand Package has no `requiredDisclaimers` | `legal-check` auto-passes |
| Brand Package has no `voice.allowedVoices` | `voice-check` auto-passes |
| Scene uses `structured_image` output (Pillow-rendered) | Color-check inspects Pillow config colors |
| SCF has no explicit font props | `font-check` auto-passes (renderer uses brand defaults) |
| Multiple brand packages referenced | ERROR — only one `brandPackage` per SCF is supported |
| `metadata.audience` is missing | Default to "internal" (non-regulated) for legal-check |

---

## Integration with other skills

| Skill | Relationship |
|-------|-------------|
| `meta/narration-component-sync` | Runs BEFORE this linter. Sync patches timing props; linter validates the final result. |
| `scene-component-routing` (Lane A) | Runs BEFORE sync. Routing picks components; linter validates their brand compliance. |
| `core/hyperframes-rendering` | The linter validates BEFORE render. If it fails, render is not invoked. |
| `core/component-authoring` | CONTRACT.md rules (§3.3, §5) define what the linter checks for CSS/class compliance. |
| `pipelines/animated-explainer/review-director` | Receives linter warnings in the review report. |

---

## Provenance

This skill is **largely invented from first principles.** Brand-governance
concepts (color compliance, logo placement, safe-area, font stack, voice
guidelines) are common knowledge in the design-systems space, but the
specific schema and severity rules in this skill were NOT validated against
authoritative sources before drafting.

### Research-derived (limited)
- **6 brand-check categories** (color / logo / font / safe-area / legal /
  voice) reflect standard brand-portal taxonomy (Adobe Brand Portal,
  Frontify, Lingo) but were not cross-referenced against a specific
  authoritative source during drafting.

### Invented — needs validation
- **Brand Package YAML schema** (`colors.{primary,secondary,accent,background}`,
  `fonts.{heading,body}`, `logo.{src,minSize,forbiddenBackgrounds[]}`,
  `safeAreas`, `requiredDisclaimers[]`, `voice`) — invented. No real-world
  brand portal export was inspected. **First real `config/org/brand-packages/<name>.yaml`
  may force schema evolution.**
- **Safe-area math** (title-safe = 5% inset, caption-safe = bottom 15%) —
  these are commonly cited broadcast values but the specific numbers were
  NOT verified against SMPTE / EBU / ITU-R BT.2100 or equivalent specs.
  **Cite the spec before locking these in.**
- **`_brandWaiver: "<reason>"` syntax** for waivable font violations —
  invented. No precedent checked (ESLint `// eslint-disable-next-line`,
  stylelint `/* stylelint-disable */`, or similar conventions). **Should
  align with an existing convention if one fits.**
- **Severity model** (legal+logo always blocking; font blocking-with-waiver;
  rest = warnings) — invented. No real brand-governance tool's severity
  ladder was reviewed.

### Prior-art findings (post-research, 2026-04-18)

A targeted prior-art research pass landed concrete corrections. See
`.internal/research-notes-phase2-sources.md` for citations.

#### Confirmed grounded (with citations now available)
- **`colors / fonts / logo / voice` split** matches industry brand-kit
  taxonomy. Sources:
  - Frontify: https://www.frontify.com/en/guide/brand-guidelines
  - Lingo: https://www.lingoapp.com/blog/brand-kit
  - Microsoft Fluent typography: https://fluent2.microsoft.design/typography
- **Title-safe = 5% inset (90% safe area)** is correct for HD per
  SMPTE ST 2046-1:2009 (https://pub.smpte.org/pub/st2046-1/st2046-1-2009.pdf).
  However, SD uses different ratios per SMPTE RP 218 (title-safe = 80%).
  **Action item:** make safe-area math format-aware, not single-constant.
- **Lint-style severities (`error` blocks, `warning` does not)** matches
  ESLint/Stylelint conventions:
  - https://eslint.org/docs/latest/use/configure/rules#disabling-rules
  - https://stylelint.io/user-guide/ignore-code/

#### Confirmed invented — corrections needed
- **Caption-safe = bottom 15%** has **NO authoritative SMPTE/EBU source**.
  Reclassify as Slate editorial policy, not broadcast standard.
  **Action item:** rename internal docs from "caption-safe" to
  "captionBottomInset (Slate policy)" to avoid implying spec backing.
- **`_brandWaiver: "<reason>"`** is Slate-specific. ESLint/Stylelint use
  comment-based directive suppression, not JSON-field strings. The vendor
  precedent is comment directives — not the path Slate took. To improve
  auditability, **consider migrating to a structured waiver object:**
  ```yaml
  waiver: { reason, approvedBy, timestamp }
  ```
  **Action item (deferred to follow-up PR):** schema migration with
  backward-compat parser.
- **`requiredDisclaimers[]` and `voice.allowedVoices[]`** are plausible
  product-policy fields but are not standard brand-kit primitives. Keep,
  but document as Slate extensions to the standard taxonomy.

#### Recommended schema evolution (deferred)
For a future patch PR, consider:
- `safeAreas.titleSafeHd = 0.05` (cite SMPTE ST 2046-1)
- `safeAreas.titleSafeSd = 0.10` (cite SMPTE RP 218)
- `safeAreas.captionBottomInset` (Slate policy, no external standard)
- `waiver: { reason, approvedBy, timestamp }` (replaces `_brandWaiver` string)
- **PR 5 — Governance-safety extension:** Pair this linter with a new
  `demo-data-classifier` tool that scans SCF props (especially
  `ComplianceBadgeWall.badges[]`, `AuditTrail.events[]`,
  `PolicyEnforcement.request`) for real-looking customer / employee /
  internal-system identifiers. Local-only enforcement: block render when
  `outputProfile.deliveryProfile === "external"` AND classifier flags any
  non-synthetic-looking string AND no `_demoDataWaiver` is set on the
  scene. Synthetic scaffolds shipped in PR 2 use "Contoso" / "Fabrikam"
  and placeholder GUIDs already.

These are non-blocking. The current schema is internally consistent and
will work for PR 2. Rename when a real Brand Package YAML lands.

### Validation plan
1. ✅ Prior-art research complete (above).
2. First real Brand Package YAML (likely Microsoft Cloud + AI brand kit)
   will validate the schema and trigger the deferred schema evolution.
3. Treat this skill's rules as **provisional** until at least one real
   brand package and one PR-2-component round-trip has run through it.

---

*Last updated: Phase II PR 1 — Lane B (Provenance section added post-PR-1 review)*
