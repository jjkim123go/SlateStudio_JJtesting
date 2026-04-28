# Render Audit Trail

> **Tier:** Layer 2 (Slate-specific) · meta · governance · observability
> **When to load:** post-render. Anyone debugging a render, reproducing an old MP4, attributing cost, or compiling a compliance report consumes the audit JSON files this skill describes.

---

## What gets emitted

Every `node render/render.mjs <scf>` invocation — success **or** failure — appends one JSON document to `output/render_audit/`. The filename pattern is:

```
output/render_audit/<ISO-timestamp>-<short-runId>.json
```

Example: `output/render_audit/2026-04-18T10-14-22-321Z-9c2f1ab8.json`. The colons in the ISO timestamp are replaced with hyphens so the filename is portable across Windows.

---

## Schema

```json
{
  "runId": "9c2f1ab8-3c1d-4f0b-9d3e-7e2f1a4c6b2d",
  "timestamp": "2026-04-18T10:14:22.321Z",
  "gitCommit": "a3f9c7b1d8e2f4a6c0b9d1e8f2a4c6b8d0e9f1a3",
  "scfPath": "C:\\Projects\\Slate\\tests\\qa-scenarios\\pr2-audit-trail.scf.json",
  "pipeline": "animated-explainer",
  "deliveryProfile": "internal",
  "brandPackage": null,
  "brandPackageHash": null,
  "brandPackageSource": null,
  "brandLintPassed": null,
  "componentsUsed": ["AuditTrail"],
  "sceneCount": 3,
  "totalDurationSec": 23,
  "output": { "width": 1920, "height": 1080, "fps": 30 },
  "status": "success",
  "error": null,
  "renderDurationSec": 18.6,
  "costUsd": null,
  "foundryModelsUsed": [],
  "toolsInvoked": []
}
```

### Field-by-field

| Field                  | Source                         | Notes |
|------------------------|--------------------------------|-------|
| `runId`                | `crypto.randomUUID()`          | Stable per render attempt; appears in stdout so users can grep logs. |
| `timestamp`            | `new Date().toISOString()`     | UTC, ISO 8601. |
| `gitCommit`            | `git rev-parse HEAD`           | `null` if outside a git working copy or git unavailable. Graceful degrade — never blocks the render. |
| `scfPath`              | CLI arg                         | Absolute path. |
| `pipeline`             | `scf.pipeline`                 | Pipeline manifest name. |
| `deliveryProfile`      | `scf.outputProfile.deliveryProfile` | One of `draft \| internal \| external \| executive \| regulated`. Defaults to `internal`. |
| `brandPackage`         | `scf.brandPackage`             | Brand package basename (e.g. `"contoso"`); resolves to `config/org/brand-packages/<name>.yaml`. |
| `brandPackageHash`     | `scf.brandPackageHash`         | SHA-256 of the resolved brand-package YAML. **PR 5 leaves this `null`** — populated by the brand-linting tool in PR 9. |
| `brandPackageSource`   | `scf.brandPackageSource`       | Optional URL/file pointer to the brand package's authoritative source. |
| `brandLintPassed`      | `scf.brandLintPassed`          | `null` until the brand-package linter has run; `true`/`false` after. |
| `componentsUsed`       | compiler output                | Array of component names used by any scene. Computed by `compileSCFToHTML` and surfaced for cost/coverage analytics. |
| `sceneCount`           | compiler output                | |
| `totalDurationSec`     | compiler output                | |
| `output`               | `scf.outputProfile`            | Width/height/fps actually used. |
| `status`               | render lifecycle               | `success \| failure \| dry-run \| preview`. |
| `error`                | render lifecycle               | Human-readable error text if `status = failure`; `null` otherwise. |
| `renderDurationSec`    | wall-clock                      | Time inside `executeRenderJob`. `null` for `dry-run` / `preview`. |
| `costUsd`              | (post-render attribution)      | **Always `null` from the renderer itself.** Filled in by a downstream join with `output/cost_log.jsonl` keyed on `runId`. The renderer cannot know per-asset cost — that comes from the Foundry tools. |
| `foundryModelsUsed`    | (post-render attribution)      | Same — populated downstream from cost_log entries within the run window. |
| `toolsInvoked`         | (post-render attribution)      | Same. |

---

## How to consume it

### Reproduce an old render
1. `cat output/render_audit/2026-04-18*-9c2f1ab8.json | jq '.scfPath, .gitCommit'`
2. `git checkout <commit>`
3. `node render/render.mjs <scfPath>`

### Compliance report (PR 9 will automate this)
For every render in a date range, join with cost_log + brand-lint result + demo-data-classifier output:

```sh
ls output/render_audit/2026-04-*.json | xargs -I{} jq -c '{runId,scfPath,deliveryProfile,brandLintPassed,status}' {}
```

### Failure forensics
The audit file is written even when render fails — open the JSON to see which compile/render stage broke.

---

## Privacy considerations

The audit record contains:
- File paths (may include user names on Windows)
- Git commit (publicly identifying)
- Brand package name (org-identifying)

It does NOT contain:
- Scene content / narration text
- Generated images or audio
- Brand-package contents (only the name and an optional hash)

This matches the granularity used by other observability layers (CI logs, build metadata) and avoids re-creating the very data-leak surface the demo-data classifier exists to prevent.

---

## Per-run cost attribution (the gap)

The renderer does not own cost or model usage — the Foundry tools do, and they write to `output/cost_log.jsonl` independently. PR 5 leaves `costUsd`, `foundryModelsUsed`, `toolsInvoked` as **null/empty placeholders** in the audit record so a future tool can join them in.

The simplest join: log the `runId` from the audit file as a tag on every cost_log entry written during the run. Slate's pipeline orchestrator can put `runId` into a process-wide context and the Foundry tools can read it from there. Out of scope for PR 5 — documented here so the gap is explicit.

---

## Relationship to other audit surfaces

| Surface                                | Owner            | Purpose |
|----------------------------------------|------------------|---------|
| `output/render_audit/*.json`           | this skill       | Per-render reproducibility + governance. |
| `output/cost_log.jsonl`                | Foundry tools    | Per-API-call cost attribution. Joined to renders by `runId` (future). |
| `projects/<slug>/decisions.jsonl`      | pipeline runner  | Per-project decision log; append-only, durable per production. |
| `output/assets/manifest.json`          | asset director   | Per-asset (image/audio/video) provenance. |

These four files together are what an external auditor needs to reconstruct "what made this MP4". The render audit trail is the spine that ties them together by `runId` + timestamp + git commit.

---

## Provenance

- **Audit-record schema**: derived from common SBOM-style provenance practice (in particular `provenance` records in SLSA v1.0 — `slsa.dev/spec/v1.0` — which separate "what was built" from "how it was built"). The Slate audit record is much simpler than SLSA but follows the same separation: render inputs (scfPath, gitCommit, brandPackage) ≠ render outputs (status, durations).
- **Per-run unique id pattern**: long-standing convention from CI systems (GitHub Actions `run_id`, Azure DevOps `Build.BuildNumber`) and observability (OpenTelemetry trace ids).
- **Always-emit-on-failure rule**: from incident-response practice — failures are exactly when audit data matters most. If the audit write itself fails, log to stderr but never propagate (P12 — fail forward with transparency). The renderer's contract is "make a video"; audit is best-effort.
- **Filename `<ts>-<runId>` ordering**: chosen so `ls` is chronological by default and `runId` collisions (impossible with UUIDv4 in practice) would still be safely disambiguated.
- **Cost attribution as a downstream join**: standard pattern in distributed cost-allocation systems — Slate's renderer is one process, the Foundry tools are several processes that ran earlier, joining by a shared id is the only correct architecture. Separating "render-time facts" from "post-render attribution" keeps the renderer fast and side-effect-free.

What this skill is NOT based on: a specific Microsoft internal audit standard, or any one cloud provider's audit-log format. It's a deliberately small, hand-rolled record tailored to Slate's surface area.
