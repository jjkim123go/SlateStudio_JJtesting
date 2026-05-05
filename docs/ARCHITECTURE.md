# Slate — Architecture Guide

> **Slate** is an enterprise-grade, agentic video production engine. An AI
> coding assistant acts as the **Director Agent**, making narrative, visual,
> and editorial decisions, while a deterministic, governance-aware set of
> single-responsibility tools generates assets, composes a declarative
> composition document (SCF), renders it through HyperFrames, and audits the
> result.

> **Document updated April 2026.** Slate originally shipped a `Pipeline`
> state machine + YAML manifests under `pipeline_defs/`. Those have been
> **removed**. The agent now operates from an **agentic playbook**
> ([`skills/meta/production-loop.md`](../skills/meta/production-loop.md)) and
> **mixable director skills** under [`skills/directors/`](../skills/directors/).
> Project state is **append-only event logs** under `projects/<slug>/` (not
> a pipeline state). Section 8 describes the agentic production loop that
> replaced the pipeline.

This document is for developers, architects, and reviewers who need to
understand how Slate is put together: the agent contract, the framework layer,
the tool system, the SCF composition format, the HyperFrames component
library, the governance/audit model, and the end-to-end data flow from a
prompt to a finished, brand-compliant MP4.

> **Lineage.** Slate's design patterns (tool contracts, declarative
> composition, capability registries, delivery-promise classification) are clean-room
> reimaginings of concepts pioneered in **OpenMontage** (AGPL-3.0), an
> open-source project by the same author. Slate is an independent, proprietary
> codebase built for Azure AI Foundry and enterprise compliance — no source
> code is shared. Rendering is performed by **HyperFrames** (Apache-2.0). See
> [`NOTICE.md`](../NOTICE.md) for full attribution.

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [The Twelve Slate Principles](#2-the-twelve-slate-principles)
3. [System Architecture](#3-system-architecture)
4. [Repository Layout](#4-repository-layout)
5. [Core Framework (`src/slate/core/`)](#5-core-framework-srcslatecore)
6. [Tool System (`src/slate/tools/`)](#6-tool-system-srcslatetools)
7. [Skills System (`skills/`)](#7-skills-system-skills)
8. [Agentic Production Loop](#8-agentic-production-loop)
9. [SCF — Slate Composition Format (`schemas/`)](#9-scf--slate-composition-format-schemas)
10. [Rendering Pipeline (`render/`)](#10-rendering-pipeline-render)
11. [HyperFrames Component Library](#11-hyperframes-component-library)
12. [AI Model Integration (Azure AI Foundry)](#12-ai-model-integration-azure-ai-foundry)
13. [Governance, Audit & Cost](#13-governance-audit--cost)
14. [Brand System](#14-brand-system)
15. [Quality Assurance & Self-Review](#15-quality-assurance--self-review)
16. [Entry Points & Scripts](#16-entry-points--scripts)
17. [Data Flow — Prompt to MP4](#17-data-flow--prompt-to-mp4)
18. [Roadmap — Phase II & Phase III](#18-roadmap--phase-ii--phase-iii)
19. [Appendix A — Authentication & API Scopes](#appendix-a--authentication--api-scopes)
20. [Appendix B — Key Design Decisions](#appendix-b--key-design-decisions)

---

## 1. Overview & Philosophy

### 1.1 What Slate Is

Slate sits at the intersection of generative AI and traditional video
post-production. It accepts:

- **Inputs**: a text prompt; a document (PPTX, DOCX, XLSX); media files
  (images, audio, video clips); or any combination thereof.
- **Output**: a polished MP4 with narration, captions, brand compliance, and a
  complete, append-only audit trail.
- **Orchestrator**: an AI assistant — the **Director Agent** — that reasons
  about storytelling, shot composition, pacing, and brand identity.

### 1.2 The Agent-First Philosophy

Traditional video tools are imperative — the user pushes buttons. Slate
inverts this: the **agent is the director**. It reads a brief, writes a
script, plans scenes, generates assets, composes an SCF document, renders via
HyperFrames, reviews its own work against a rubric, and delivers the result —
all while consulting the human at defined stage gates.

This philosophy is captured in the **Twelve Slate Principles** (§2) and
enforced by the governance layer (§13).

### 1.3 Architectural Tenets

- **Declarative over imperative.** Brand packages, governance policies,
  production decisions, and compositions are data (YAML / JSON / JSONL), not code.
- **Filesystem as source of truth.** Project state, generated assets, cost
  logs, and production traces are written to disk as they happen — crashes
  do not lose work.
- **Single-responsibility tools.** Each tool does one thing well. Composition
  happens at the agent / SCF layer, not inside the tools.
- **Auditable by default.** Every tool call is wrapped in a traced span with
  cost, governance state, and result. Production traces are append-only.
- **Vendor-agnostic where possible.** SCF is the contract between agent and
  renderer. Today HyperFrames renders it; tomorrow another engine could.

---

## 2. The Twelve Slate Principles

These principles are the agent's operating contract. They are encoded in
`.github/copilot-instructions.md`, enforced by the governance/audit layer,
and surfaced through the skills index and JIT-loaded skill files.

| # | Principle | Summary |
|---|-----------|---------|
| **P1** | Agent-as-Director | The AI assistant *is* the creative director, not just a tool runner. |
| **P2** | Capability Manifest Awareness | Always check the tool registry and skills index before claiming something is impossible. |
| **P3** | Deterministic Workflow, Creative Content | The agentic loop is deterministic; content within each step is creative. |
| **P4** | SCF-First Composition | Generate SCF JSON for HyperFrames rendering; use FFmpeg only for what HyperFrames cannot do. |
| **P5** | Deep Artifact Understanding | Thoroughly analyze every input file before proceeding. |
| **P6** | Review via Sub-Agent | Deploy a reviewer sub-agent to score 8 dimensions; fix anything that scores 1/3. Pre-compose validation catches timing issues before render. |
| **P7** | Human-in-the-Loop at Stage Boundaries | Present work for approval at defined checkpoints. |
| **P8** | Tool Creation as Escape Hatch | If a needed capability is missing, create a new tool following `BaseTool`. |
| **P9** | Single-Responsibility Tools | Each tool does one thing well. Compose, don't monolith. |
| **P10** | Externalized State | All project state lives on the filesystem, never only in memory. |
| **P11** | Progressive Disclosure | Start simple, add complexity on request. |
| **P12** | Fail Forward with Transparency | Never silently drop content; report failures and try alternatives. |

---

## 3. System Architecture

### 3.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER / CI TRIGGER                               │
│                  prompt ─ documents ─ media files                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DIRECTOR AGENT (P1)                              │
│                                                                         │
│   AI assistant — creative judgment + orchestration                       │
│   Reads playbook + skills index; runs preflight; invokes tools via trace │
│                                                                         │
│   ┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐       │
│   │GovernanceCtx │  │ GovernancePolicy │  │ BrandPackage       │       │
│   │(phase, gates)│  │ (org rules YAML) │  │ (colors,fonts,logo)│       │
│   └──────┬───────┘  └────────┬─────────┘  └────────┬───────────┘       │
│          └───────────────────┼──────────────────────┘                   │
│                              ▼                                          │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │              TRACED DISPATCHER                               │      │
│   │  Wraps every tool call with:                                 │      │
│   │    • ProductionTrace span (append-only DAG)                  │      │
│   │    • CostTracker recording + budget enforcement              │      │
│   │    • Policy enforcement (tool allow/forbid per phase)        │      │
│   │    • Skill-consultation audit                                │      │
│   └──────────────────────────┬───────────────────────────────────┘      │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                       ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│   TOOL LAYER     │ │   TOOL LAYER     │ │   TOOL LAYER         │
│ src/slate/tools/ │ │                  │ │                      │
│                  │ │ audio/           │ │ video/               │
│ graphics/        │ │  foundry_tts     │ │  foundry_video_gen   │
│  foundry_image_  │ │  audio_mixer     │ │  hyperframes_render  │
│   gen            │ │  audio_probe     │ │  media_transcode     │
│                  │ │  foundry_        │ │                      │
│ ingest/          │ │  transcribe      │ │ analysis/            │
│  parsers         │ │                  │ │  video_indexer       │
│  (pptx/docx/xlsx)│ │ subtitle/        │ │                      │
│                  │ │  subtitle_gen    │ │                      │
└────────┬─────────┘ └────────┬─────────┘ └──────────┬───────────┘
         │                    │                       │
         └────────────────────┼───────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SCF COMPOSER (core)                                  │
│                                                                         │
│  Builds an SCF JSON document from scene plan + asset manifest +          │
│  brand package. Validates against schemas/scf-v1.0.schema.json.         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  HYPERFRAMES RENDERING ENGINE                            │
│                                                                         │
│  Node.js ≥22  ──  @hyperframes/{core,engine,producer}@0.4.3             │
│                                                                         │
│  scf-to-html.mjs  →  HTML (79 components + GSAP timelines)              │
│  render.mjs       →  headless Chrome  →  frames  →  FFmpeg  →  MP4      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     REVIEWER SUB-AGENT (P6)                             │
│                                                                         │
│  Independent quality audit against the 8-dimension rubric.              │
│  Pre-compose: scf_validate.py (narration overflow, black frames, assets)│
│  Post-render: scripts/review_run.py (FFmpeg + optional Video Indexer)   │
│  EvalHarness scores → eval_report. Can signal needs_rerender.           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     OUTPUT (filesystem-first, P10)                       │
│                                                                         │
│  projects/<slug>/renders/*.mp4     Final video                       │
│  projects/<slug>/assets/*          Generated images, audio, clips    │
│  projects/<slug>/ledger.jsonl      Per-call cost records              │
│  projects/<slug>/decisions.jsonl   Decision & checkpoint log          │
│  projects/<slug>/composition.scf.json  Composition document           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Layer Responsibilities

| Layer | Responsibility | Key Locations |
|-------|----------------|---------------|
| Director Agent | Creative decisions, orchestration, user interaction | (the AI assistant + `.github/copilot-instructions.md`) |
| Skills | Layered guidance the agent must consult | [skills/](../skills/) |
| Agentic Playbook | Production loop, director skills, checkpoint protocol | [`skills/meta/production-loop.md`](../skills/meta/production-loop.md) |
| Core Framework | Production tracing, governance, budget/cost, brand, retry policy, SCF composition | [src/slate/core/](../src/slate/core/) |
| Tool Layer | Single-responsibility capabilities (`BaseTool` subclasses) | [src/slate/tools/](../src/slate/tools/) |
| SCF Composer | Builds + validates the composition JSON | [src/slate/core/scf_composer.py](../src/slate/core/scf_composer.py) |
| Render Engine | Compiles SCF → HTML → MP4 via HyperFrames | [render/](../render/) |
| Output | Filesystem-based project artifacts and ad-hoc render staging | `projects/`, `output/` |

---

## 4. Repository Layout

```
C:\Projects\Slate\
├── .github/
│   └── copilot-instructions.md         Director Agent system prompt (12 principles, tools, models, onboarding)
├── config/
│   ├── models.yaml                     Model registry (endpoints, costs, deployments)
│   └── org/
│       ├── governance-policy.yaml      Enterprise governance rules
│       ├── brand-packages/             Brand identity YAML files
│       ├── approved-providers/         Provider allowlist data
│       └── compliance-rules/           Compliance rule sets
├── docs/
│   ├── ARCHITECTURE.md                 This document
│   ├── COMPONENT_REFERENCE.md          Full component prop contracts
│   ├── TOOL_ONBOARDING.md             BaseTool creation guide
│   ├── FEATURE-SPEC.md                 Original product thesis (historical)
│   └── TOOL_LICENSING_INFO.md          Third-party license inventory
├── projects/                           Per-video project folders (P10)
│   └── <slug>/
│       ├── project.json                Name, slug, budget, created_at
│       ├── brief.md                    Creative brief
│       ├── script.md                   Narration script
│       ├── scene-plan.md               Scene plan
│       ├── composition.scf.json        SCF composition
│       ├── assets/                     Generated images, audio, video clips
│       ├── renders/                    Final MP4s
│       ├── ledger.jsonl                Append-only cost log
│       └── decisions.jsonl             Append-only decision & checkpoint log
├── schemas/
│   └── scf-v1.0.schema.json            SCF schema definition (authoritative)
├── scripts/
│   ├── slate_render.py                 End-to-end renderer entry point
│   ├── scope-css.mjs                   CSS scoping utility for components
│   └── lib/                            Production helpers (image_gen, tts_gen, video_gen,
│                                       video_compose, subtitle_burner, live_subtitles,
│                                       structured_image, video_inspect, scf_validate,
│                                       model_registry)
├── skills/                             Layered skill system (see §7)
│   ├── INDEX.md                        Thin skill directory (read once for awareness; load skills JIT)
│   ├── core/                           Layer 2 — Slate-specific contracts + component skills
│   ├── directors/                      Mixable director skills (explainer, walkthrough, social-teaser, recap)
│   ├── creative/                       Creative direction skills (voice selection)
│   ├── meta/                           Cross-cutting (production loop, checkpoints, state, review, setup)
│   └── models/                         Model-specific skills (gpt-image-2, gpt-4o-mini-tts, sora-2)
├── src/
│   └── slate/
│       ├── __init__.py                 Public API (version export)
│       ├── core/                       Framework (13 modules — see §5)
│       ├── agents/                     ReviewerAgent protocol + data types
│       └── tools/                      17 preflight-registered tools (see §6)
├── render/
│   ├── render.mjs                      Render CLI entry point (Node ≥22)
│   ├── lib/scf-to-html.mjs             SCF → HyperFrames HTML compiler
│   ├── components/                     79 SCF-registered HyperFrames components (see §11)
│   │   └── CONTRACT.md                 Component authoring contract
│   └── package.json                    @hyperframes/{core,engine,producer}@0.4.3
├── tests/                              Pytest suite (core, tools, e2e, governance, hyperframes)
├── output/                             Ad-hoc work, HTML probes, render staging
├── NOTICE.md                           Third-party attribution (HyperFrames, OpenMontage, GSAP)
├── scripts/review_run.py               Standalone reviewer CLI
├── pyproject.toml                      Package metadata (slate v0.1.0, Python ≥3.11)
└── setup.ps1                           One-time setup script
```

---

## 5. Core Framework (`src/slate/core/`)

The core framework provides the infrastructure every production depends on.
Thirteen modules, all small and single-purpose.

| Module | Purpose | Key Classes |
|--------|---------|-------------|
| [`base_tool.py`](../src/slate/core/base_tool.py) | Universal tool contract | `BaseTool`, `ToolResult`, `ToolTier`, `ToolRuntime`, `ToolStability` |
| [`tool_registry.py`](../src/slate/core/tool_registry.py) | Auto-discovery of `BaseTool` subclasses, capability manifest | `ToolRegistry` |
| [`production_trace.py`](../src/slate/core/production_trace.py) | Append-only span DAG, violation log | `ProductionTrace`, `Span`, `Violation`, `ViolationType`, `SpanKind` |
| [`governance_context.py`](../src/slate/core/governance_context.py) | Bundles trace + policy + artifacts; phase tracking | `GovernanceContext` |
| [`governance_policy.py`](../src/slate/core/governance_policy.py) | Loads org governance YAML | `GovernancePolicy`, `ContentSafetyPolicy`, `AuditPolicy`, `ProviderPolicy`, `ReviewPolicy`, `SkillsEnforcementPolicy` |
| [`traced_dispatcher.py`](../src/slate/core/traced_dispatcher.py) | Wraps tool invocation with tracing, cost, policy | `TracedDispatcher` |
| [`cost_tracker.py`](../src/slate/core/cost_tracker.py) | Budget tracking + JSONL audit log | `CostTracker`, `CostEntry` |
| [`budget.py`](../src/slate/core/budget.py) | Central budget resolution, default budget, org cap enforcement | `DEFAULT_PROJECT_BUDGET_USD`, `resolve_project_budget`, `apply_hard_cap_enforcement` |
| [`foundry_retry.py`](../src/slate/core/foundry_retry.py) | Shared retry/backoff helper for Azure Foundry calls | `retry_foundry_call`, `FoundryRetryConfig` |
| [`scf_composer.py`](../src/slate/core/scf_composer.py) | Builds + validates SCF JSON | `SCFComposer`, `AssetManifest` |
| [`brand_package.py`](../src/slate/core/brand_package.py) | Loads + enforces enterprise brand identity | `BrandPackage`, `ColorPalette`, `LogoSpec`, `LockedElements`, `Typography`, `VoiceSpec` |
| [`artifact_store.py`](../src/slate/core/artifact_store.py) | Versioned per-stage artifact persistence | `ArtifactStore`, `ArtifactVersion`, `ArtifactRecord`, `ArtifactStatus` |
| [`eval_harness.py`](../src/slate/core/eval_harness.py) | Pluggable post-production evaluators | `EvalHarness`, `EvalReport`, `DimensionScore` |

> **`src/slate/agents/`** contains the `ReviewerAgent` protocol class — a
> data contract (not an LLM agent) that structures review inputs, defines
> the scoring rubric, routes findings to revision owners, and formats
> structured reports. Used by `_run_review_stage()` in `slate_render.py`.

### 5.1 `BaseTool` — the universal contract

Every tool — image gen, audio mix, transcribe, render, transcode — implements
the same interface. This gives the framework uniform invocation, pre-flight
cost estimation, dry-run support, and input validation.

```
┌─────────────────────────────────────────┐
│              BaseTool                    │
├─────────────────────────────────────────┤
│ + name: str                             │
│ + description: str                      │
│ + tier: ToolTier (GENERATE/ANALYZE/…)   │
│ + runtime: ToolRuntime (LOCAL/API/…)    │
│ + stability: ToolStability              │
│ + cost_model: CostModel | None          │
├─────────────────────────────────────────┤
│ + execute(**kwargs) → ToolResult        │
│ + validate_inputs(**kwargs) → bool      │
│ + estimate_cost(**kwargs) → float       │
│ + dry_run(**kwargs) → DryRunResult      │
└─────────────────────────────────────────┘
```

Tools are stateless — all state is passed in via kwargs and returned via
`ToolResult`. Only `execute()` is required; everything else has sensible
defaults.

### 5.2 `ToolRegistry` — auto-discovery (P2)

At startup the registry walks `src/slate/tools/` via `pkgutil`, imports each
module, finds classes inheriting from `BaseTool`, and registers them by name.
The Director Agent calls `registry.capabilities()` to obtain a
machine-readable manifest of every available tool — its tier, runtime, cost
model, and inputs. This is how P2 (Capability Manifest Awareness) is
operationalized.

### 5.3 `ProductionTrace` — append-only audit DAG

An append-only directed acyclic graph that records every significant event
during a production run.

```
Production Run #abc-123
├── [span] pipeline:start
│   ├── [span] stage:ingest
│   │   ├── [span] tool:pptx_parser           cost=$0.00
│   │   └── [gate] user_approval               passed=true
│   ├── [span] stage:script
│   │   └── [gate] user_approval               passed=true
│   ├── [span] stage:assets
│   │   ├── [span] tool:foundry_image_gen     cost=$0.04 model=gpt-image-2
│   │   ├── [span] tool:foundry_image_gen     cost=$0.04 model=gpt-image-2
│   │   ├── [span] tool:foundry_tts            cost=$0.06
│   │   └── [span] tool:foundry_video_gen      cost=$0.80
│   ├── [span] stage:compose
│   │   ├── [span] tool:scf_composer           cost=$0.00
│   │   └── [span] tool:hyperframes_render     cost=$0.00
│   ├── [span] stage:review
│   │   ├── [span] tool:video_indexer          cost=$0.50
│   │   └── [gate] self_review                 passed=true scores={...}
│   └── [gate] user_approval                   passed=true
└── [span] pipeline:complete                   total_cost=$1.45
```

**Properties:** append-only (spans are never mutated after `end_span()`),
hierarchical, cost-annotated, gate-aware, and violation-tracking.

### 5.4 `TracedDispatcher` — the enforcement chokepoint

The dispatcher wraps every tool invocation with cross-cutting concerns:

```
dispatcher.dispatch("foundry_image_gen", prompt="...")
    1. GovernanceContext.check_tool_allowed()  → policy + phase check
    2. CostTracker.estimate()                   → budget remaining?
    3. ProductionTrace.start_span()             → open audit span
    4. tool.execute(**kwargs)                   → actual call
    5. CostTracker.record(actual_cost)          → JSONL append
    6. ProductionTrace.end_span(result, cost)   → close span
    7. return ToolResult
```

A `PolicyViolationError` raised here is recorded in the trace even if the call
was blocked. Skill consultation requirements (from tool `agent_skills`,
director dependencies, and `skills/INDEX.md` triggers) are checked against
the trace at stage completion.

### 5.5 `CostTracker` — pre-flight + runtime + persistence

```
CostTracker + budget.py
  ├── resolve_project_budget(...) → float       # CLI/project/org/default
  ├── apply_hard_cap_enforcement(...)           # warn | clamp | block
  ├── estimate(tool_name, **kwargs) → float     # Pre-flight
  ├── record(tool_name, actual_cost)            # Post-call → ledger/cost JSONL
  ├── total_spent → float
  ├── budget_remaining → float
  ├── warn_threshold  = 50%                     # Warn user
  └── pause_threshold = 90%                     # Stop, ask to extend
```

Each project writes append-only cost records to `projects/<slug>/ledger.jsonl`
(and legacy/ad-hoc flows may still write `output/cost_log.jsonl`). Each record
contains `tool`, `model`, `estimated`, `actual`, `ts`, and `metadata`; these
files are the input to chargeback workflows.

### 5.6 `BrandPackage`, `ArtifactStore`, `EvalHarness`

- **`BrandPackage`** loads a YAML brand identity (colors, fonts, logos, voice,
  locked elements, disclaimers) and exposes `to_scf_props()` to populate
  `BrandIntro`/`BrandOutro` components.
- **`ArtifactStore`** persists per-stage artifacts (brief, script, scene plan,
  SCF, MP4) with version history and status (`draft`/`final`/`superseded`).
- **`EvalHarness`** runs pluggable evaluators (audio levels, caption sync,
  brand compliance, duration, custom) and aggregates scores into an
  `EvalReport` that becomes part of the trace.

---

## 6. Tool System (`src/slate/tools/`)

Tools are organized by capability domain. Each subdirectory groups related
single-responsibility tools (P9). The `BaseTool` contract makes them
uniformly invokable via the `TracedDispatcher`.

### 6.1 Directory Map

```
src/slate/tools/
├── analysis/
│   └── video_indexer.py          Azure AI Video Indexer integration (deep review)
├── audio/
│   ├── foundry_tts.py            Text-to-speech via gpt-4o-mini-tts
│   ├── audio_mixer.py            Multi-track mixing with ducking + EBU R128 normalization
│   ├── audio_probe.py            ffprobe wrapper for audio metadata
│   └── foundry_transcribe.py     Speech-to-text with word-level timestamps
├── governance/
│   └── demo_data_classifier.py   PII / confidentiality heuristics for demo data safety
├── graphics/
│   ├── foundry_image_gen.py      Image generation via gpt-image-2
│   └── structured_image.py       Deterministic Pillow rendering (code, tables, diagrams, charts, UI)
├── ingest/
│   ├── orchestrator.py           Top-level ingest dispatcher (classifies inputs, routes to tools)
│   ├── document_ingest.py        PPTX / DOCX / XLSX / PDF → structured content
│   ├── image_analyze.py          Image description, dimensions, dominant colors, text detection
│   ├── video_analyze.py          Video probing (duration, resolution, codec, keyframes)
│   ├── web_fetch.py              URL → clean text/metadata
│   └── parsers.py                Legacy PPTX / DOCX / XLSX parser (kept for backward compat)
├── subtitle/
│   └── subtitle_gen.py           SRT/VTT generation from word-level transcripts
└── video/
    ├── foundry_video_gen.py      Sora-2 AI video clip generation (4/8/12s)
    ├── hyperframes_render.py     SCF → MP4 via render.mjs
    └── media_transcode.py        Format conversion via FFmpeg
```

**17 preflight-registered tools** across 7 domains. The filesystem contains
additional legacy/helpers such as ingest parser/orchestrator modules, but the
live capability menu is the `python -m slate.preflight --summary` registry.
Phase III placeholder directories
(`avatar/`, `capture/`, `enhancement/`, `publish/`) are documented in the
repo-root `tools/` skeleton but not yet implemented.

### 6.2 Implementation Tier — Stubs vs Production

Some tools live in `src/slate/tools/` as **`BaseTool`-conforming stubs** that
return placeholder output for the test suite, while the **production code**
lives in `scripts/lib/`. This lets the registry, dispatcher, and pipeline be
exercised end-to-end without spending API budget.

| Tool | Stub (`src/slate/tools/`) | Production (`scripts/lib/`) |
|------|---------------------------|------------------------------|
| Image generation | `graphics/foundry_image_gen.py` | `image_gen.py` (gpt-image-2, retry + explicit fallback tracking) |
| Structured visuals | `graphics/structured_image.py` | `structured_image.py` (Pillow-rendered code/table/diagram/chart/UI) |
| Text-to-speech | `audio/foundry_tts.py` | `tts_gen.py` (gpt-4o-mini-tts via Azure) |
| AI video | `video/foundry_video_gen.py` | `video_gen.py` (Sora-2 via OpenAI SDK, auto-strips audio) |
| Transcription | `audio/foundry_transcribe.py` | `live_subtitles.py` (gpt-4o-transcribe) |
| Video composition | `video/hyperframes_render.py` | `video_compose.py` (FFmpeg post-processing) |
| SCF pre-validation | — | `scf_validate.py` (narration overflow, clip duration, missing assets) |

### 6.3 Tool Categorisation (`ToolTier`)

`base_tool.py` defines tiers used for capability surfacing and policy
enforcement:

| Tier | Examples |
|------|----------|
| `GENERATE` | foundry_image_gen, foundry_tts, foundry_video_gen |
| `ANALYZE` | audio_probe, video_indexer, foundry_transcribe |
| `COMPOSE` | scf_composer, hyperframes_render |
| `TRANSFORM` | audio_mixer, media_transcode, subtitle_gen |
| `INGEST` | parsers (pptx/docx/xlsx) |
| `PUBLISH` | (Phase III) teams, sharepoint, stream |

The Reviewer stage's policy permits only `ANALYZE` tier tools — preventing
the reviewer from regenerating assets to mask flaws.

### 6.4 Tool Creation (P8)

When a production needs a capability that doesn't exist:

1. Check whether existing tools can be composed.
2. If not, create a new `.py` file under the appropriate `src/slate/tools/`
   subdirectory.
3. Subclass `BaseTool`; implement at minimum `execute()`.
4. Test via `dry_run()` before live use.
5. The creation is recorded in the production trace for review.

---

## 7. Skills System (`skills/`)

Skills are layered, on-demand guidance documents the agent **must consult**
before acting. Requirements come from tool `agent_skills`, director-skill
dependencies, component-authoring contracts, and trigger rows in
[`skills/INDEX.md`](../skills/INDEX.md). The production trace audits whether
they were actually read.

### 7.1 Layer Model

| Layer | Purpose | Location |
|-------|---------|----------|
| **Boot** | Project identity, 12 principles, tool inventory | [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) |
| **Layer 2 — Slate-specific** | Slate tool contracts, SCF schema, conventions | [`skills/core/*.md`](../skills/core/) |
| **Layer 3 — Vendor best practices** | GSAP, HyperFrames, FFmpeg canonical guidance | [`skills/core/animation/`](../skills/core/), [`skills/core/hyperframes-rendering.md`](../skills/core/) |
| **Director Skills** | Mixable video-archetype advisors (not pipeline-bound) | [`skills/directors/`](../skills/directors/) — explainer, walkthrough, social-teaser, recap, council |
| **Meta** | Cross-cutting — production loop, checkpoints, state, review, brand, Azure setup | [`skills/meta/*.md`](../skills/meta/) |
| **Models** | Per-model prompting, parameter, and pricing | [`skills/models/`](../skills/models/) |
| **Creative** | Creative direction (voice selection) | [`skills/creative/`](../skills/creative/) |

### 7.2 Discovery Contract (JIT)

1. At session start the agent **skims** [`skills/INDEX.md`](../skills/INDEX.md)
   — a thin directory of every skill with triggers — for awareness only.
2. **Just-in-time loading.** A skill file is read **before** acting when:
   (a) a tool with `agent_skills=[...]` is about to execute,
   (b) a director skill lists it as a dependency,
   (c) a script-line / scene / asset trigger-matches a row in INDEX.md.
3. Skills supersede general best-practice guesses.

### 7.3 Layer 2 Core Skills (canonical 13)

1. **hyperframes-rendering** — SCF schema, render pipeline, full component reference, CLI.
2. **component-authoring** — Paused master timelines, `SCENE_DURATION`, transform-only rule, scene-ID scoping.
3. **foundry-models** — Image / TTS / video / transcription model selection, prompts, costs, intelligent routing.
4. **ffmpeg-audio** — Mixing, ducking, EBU R128 normalization, transcoding, probing.
5. **video-indexer-review** — VI signal taxonomy (OCR, transcript, scenes, audio_effects, faces) and rules R1–R6 mapping signals onto the P6 rubric.
6. **structured-visuals** — Decision tree: `structured_image` tool vs `foundry_image_gen` vs `foundry_video_gen` vs **components**; layout contracts L1–L4; AI-fallback complexity threshold (>8 boxes).
7. **scene-component-routing** — Six-rule precedence ladder, routing table covering all 79 registered components.

### 7.4 Director Council

For high-stakes scene planning, Slate can run a planning council before the
main agent synthesizes the final scene plan:

| Role | Focus |
|------|-------|
| **Cinematic Director** | Shot rhythm, framing, visual contrast, emotional pacing |
| **Motion Designer** | Transitions, choreography, component motion, visual continuity |
| **Concept / Rhetoric Director** | Message hierarchy, proof, audience comprehension, narrative economy |
| **Synthesizer** | Resolves conflicts into one executable scene plan and SCF direction |

Council skills are research-grounded: they cite external design, motion,
accessibility, and comprehension literature where the local skill depends on
more than project-specific contracts.

Additional skills cover narration-component sync, brand-compliance, demo-data
classification, and the meta P6 rubric itself.

### 7.5 Governance Hook

Skill consultation is audited in the production trace. The agent records
which skills were consulted before each action, and the `ReviewerAgent`
can verify consultation occurred. Missing skills surface as warnings in
the review report.

---

## 8. Agentic Production Loop

Slate has no fixed pipeline state machine. The agent — the Director — is the
intelligence. It reads intent, chooses skills, mixes tools, and keeps the
user in the creative loop. The full operating model is in
[`skills/meta/production-loop.md`](../skills/meta/production-loop.md).

### 8.1 The Loop

```
INTENT → BRIEF → DECIDE → CHECKPOINT → ACT → LOG → REVIEW → LOG → DELIVER
                  ▲                            │
                  └────── adjust on feedback ──┘
```

Six rules govern the loop:

1. **Always start from intent, not a template** — answer who, what outcome,
   runtime, governance before choosing tools.
2. **Capability-first** — run a concrete availability scan (brand, models,
   media) before the brief is final.
3. **Compose director skills; don't pick "a pipeline"** — blend explainer +
   walkthrough + social-teaser as the brief demands.
4. **Checkpoint before any irreversible or expensive step** — every paid call
   needs a cost estimate and user approval.
5. **Log decisions and costs as you go** — append to `decisions.jsonl` and
   `ledger.jsonl` so the next session can reconstruct what happened.
6. **Validate before render, review via sub-agent after render** — run
   `scf_validate.py` pre-compose, deploy a reviewer sub-agent post-render.

### 8.2 Director Skills (Mixable)

| Director | Best for | File |
|----------|----------|------|
| `explainer` | Concept-explanation, "what is X / why it matters" | `skills/directors/explainer.md` |
| `walkthrough` | Synthetic-UI or real-recording product demos | `skills/directors/walkthrough.md` |
| `social-teaser` | Short, vertical, captions-mandatory clips | `skills/directors/social-teaser.md` |
| `recap` | Release recaps, milestone summaries | `skills/directors/recap.md` |

Directors are advisors, not routers. A real video often blends archetypes.

### 8.3 Checkpoints

Four checkpoint types gate the loop (see
[`skills/meta/checkpoint-protocol.md`](../skills/meta/checkpoint-protocol.md)):

| Type | Use |
|------|-----|
| `CK-CONFIRM` | Before any paid call or render — approving scope + cost |
| `CK-REVIEW` | After the reviewer sub-agent scores the render — pass/revise |
| `CK-CHOICE` | When there's a genuine fork (visual style, voice, music) |
| `CK-DELIVER` | Final hand-off with cost summary and "anything to change?" |

### 8.4 Output Profiles

| Profile | Resolution | FPS | Codec | Quality | Use |
|---------|-----------|-----|-------|---------|-----|
| `draft` | 1280×720 | 24 | h264 | draft | Quick preview |
| `standard` | 1920×1080 | 30 | h264 | standard | Internal sharing |
| `high` | 1920×1080 | 30 | h264 | high | External / production |
| `ultra` | 3840×2160 | 30 | h264 | ultra | Broadcast / keynote |

---

## 9. SCF — Slate Composition Format (`schemas/`)

SCF is the JSON document format that describes a complete video composition.
It is the **single source of truth** for what will be rendered. The schema
is [`schemas/scf-v1.0.schema.json`](../schemas/scf-v1.0.schema.json).

### 9.1 Why SCF Exists

The agent makes creative decisions; the renderer turns them into pixels.
SCF decouples the two:

```
Director Agent  ──▶  SCFComposer  ──▶  SCF JSON  ──▶  HyperFrames  ──▶  MP4
 (creative)         (validates)    (declarative)     (technical)
```

This means the same SCF document can be re-rendered tomorrow with a different
engine, on a different machine, at a different resolution — and produce the
same video. SCF is also the correct artifact for diff/review/version-control.

### 9.2 Top-Level Shape

```json
{
  "version": "1.0",
  "pipeline": "animated-explainer",
  "brandPackage": "contoso@2.1",
  "brandPackageHash": "sha256:…",
  "brandLintPassed": true,
  "outputProfile": { "width": 1920, "height": 1080, "fps": 30 },
  "scenes": [ /* … */ ],
  "music": { "src": "…", "volume": 0.15, "duck_on_narration": true },
  "captions": { "style": "word-highlight", "position": "bottom", "fontSize": 24, "panel": false },
  "metadata": { /* agent notes, costs, versions */ }
}
```

### 9.3 Scene Shape

A scene declares either a `component` (preferred — see §11) or a custom
`layers` stack:

```json
{
  "id": "intro",                     // kebab-case, required
  "duration": 4,                     // 0.5–300 s
  "component": "BrandIntro",         // OR omit + use layers
  "props": { "logoSrc": "…", "companyName": "Contoso" },
  "layers": [ /* image / video / text / shape / caption */ ],
  "narration": "assets/narration-1.wav",
  "transition": "crossfade",
  "notes": "Director's creative notes (audit-only)",
  "_demoDataWaiver": { "reason": "…", "approvedBy": "…", "timestamp": "…" }
}
```

### 9.4 Five Scene Types

| Type | Trigger Field | Renderer | Cost |
|------|---------------|----------|------|
| **Component** | `component: "BrandIntro"` | HyperFrames built-in component | Free |
| **Static image** | `layers` with `type: image` | HyperFrames layers | Image-gen cost |
| **Structured visual** | `layers` with `type: image` (PNG from `structured_image` tool) | Pillow (Python) | Free |
| **AI video** | `layers` with `type: video` (MP4 from `foundry_video_gen` tool) | Sora-2 → FFmpeg overlay | ~$0.20/sec |
| **User video clip** | `layers` with `type: video, src: …` | FFmpeg passthrough | Free |

> **Routing rule (P9 + structured-visuals skill):** when scene content involves
> code, JSON, tables, charts, UI mockups, or precise text → generate a PNG with
> the `structured_image` tool (deterministic, free, pixel-accurate) and reference
> it as an image layer. AI image models reliably hallucinate code syntax and
> misspell labels.

### 9.5 Transitions

Transitions can be simple strings (`crossfade`, `wipe`, `dissolve`, `slide`,
`zoom`, `rotate`, `custom`) or typed transition objects with direction and
`props`. The compiler maps transition objects to component-backed motion
overlays such as `TransitionWipe`, `PageTurn`, `IrisZoom`, `FilmstripFlip`,
`CollageShatter`, `DepthZoomPunch`, and related transition components when
the built-in primitives are insufficient.

### 9.6 Delivery Profiles

The schema's `deliveryProfile` enum drives governance strictness:

| Profile | Brand pin | Demo data | Compliance audits |
|---------|-----------|-----------|-------------------|
| `draft` | Optional | Allowed | None |
| `internal` | Optional | Warning | Light |
| `external` | **Required** | **Forbidden** | Full |
| `executive` | **Required** | **Forbidden** | Full + highest quality |
| `regulated` | **Required + hashed** | **Forbidden** | Full + GDPR/HIPAA/SOC2 + data residency |

---

## 10. Rendering Pipeline (`render/`)

### 10.1 Stack

- **Node.js ≥ 22**, ESM modules.
- **`@hyperframes/core@0.4.3`**, **`@hyperframes/engine@0.4.3`**,
  **`@hyperframes/producer@0.4.3`** — Apache-2.0.
- **GSAP 3.12** (free standard license) — animation timelines, injected via
  CDN at render time.
- **FFmpeg** — audio mix, subtitle burn, transcoding, AI-clip integration.

### 10.2 Render Flow

```
            SCF JSON
               │
               ▼
        ┌──────────────────────────┐
        │ render/lib/scf-to-html.mjs │   compile to HyperFrames HTML
        └──────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ HyperFrames HTML         │   one paused GSAP timeline per scene,
        │ (79 components + scoped  │   master timeline on window.__timelines
        │  CSS + GSAP CDN)         │
        └──────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ @hyperframes/producer    │   headless Chrome capture → frames
        └──────────────┬───────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ FFmpeg                   │   frames + audio mix + subtitles → MP4
        └──────────────┬───────────┘
                       │
                       ▼
                 output/renders/*.mp4
```

### 10.3 CLI

```bash
node render/render.mjs <scf-file.json> [options]

  --output <path>     Output MP4 (default: output/<basename>.mp4)
  --quality <preset>  draft | standard | high | ultra
  --workers <n>       Capture worker count; WebGL default is 2 unless --safe-webgl is set
  --use-gpu <bool>    Request GPU acceleration when supported; WebGL default is true
  --webgl-backend <b> ANGLE backend: swiftshader | d3d11 | default
  --safe-webgl        Conservative WebGL defaults (workers=1, draft if quality omitted, swiftshader)
  --scene <id>        Render one scene from the SCF
  --split-scenes      Render scenes sequentially, then concatenate with FFmpeg
  --dry-run           Compile SCF → HTML and exit (no render)
  --preview           Open the compiled HTML in default browser
```

For WebGL-heavy SCFs (`ThreeScene`, `DeviceStage3D`, `HTMLTextureWall`), Slate
defaults to GPU-oriented capture when no explicit render flags are supplied:

```bash
node render/render.mjs <scf-file.json> --split-scenes --output <out.mp4>
```

On Windows this resolves to `workers=2`, `useGpu=true`, and
`webglBackend=d3d11` unless the user or environment overrides it. If
`PRODUCER_DISABLE_GPU=true` is set, Slate does not request GPU encoding.

The safe local fallback remains:

```bash
node render/render.mjs <scf-file.json> --safe-webgl --split-scenes --output <out.mp4>
```

This avoids auto-parallel 1080p Chromium/WebGL capture, which can saturate CPU
and disk I/O on desktops when Chrome falls back to software WebGL.

When a real GPU is available, first render one representative WebGL scene with
`--workers 1 --use-gpu true` (and `--webgl-backend d3d11` on Windows). If that
probe is stable, visually correct, and faster, rerun the same scene with
`--workers 2`; use `workers=2` for the full split-scene render only if the
second probe improves throughput without black frames, crashes, throttling, or
memory pressure. Try `workers=3` only on machines with clear GPU/VRAM headroom;
otherwise keep `workers=2` or the conservative safe-WebGL path.

The `hyperframes_render` tool (`src/slate/tools/video/hyperframes_render.py`)
wraps this CLI with `BaseTool` semantics so it integrates with the dispatcher,
the trace, and the cost tracker.

### 10.4 The SCF → HTML Compiler

[`render/lib/scf-to-html.mjs`](../render/lib/scf-to-html.mjs) is the bridge
from declarative SCF to executable HTML:

- Validates SCF (Python pre-validates; mjs has fallback validation).
- Resolves asset paths (absolute, `file://`, `data:`, or relative to the SCF
  directory).
- For each scene, instantiates the requested component (templated via
  Mustache: `{{var}}` is HTML-escaped, `{{{var}}}` is raw HTML) and registers
  its paused GSAP timeline on `window.__timelines[<sceneId>]`.
- Injects local brand `@font-face` rules when a brand package supplies fonts,
  then exposes `window.__slateFontsReady` so rendering waits for font readiness.
- Renders component-backed transition overlays when the SCF transition object
  requests one.
- Builds a master timeline that the producer drives frame-by-frame.

### 10.5 FFmpeg Responsibilities

HyperFrames handles visual composition; FFmpeg handles everything else:

- **Audio mix** — narration + background music with side-chain ducking.
- **Subtitle burn** — render SRT/VTT into the video stream.
- **Transcoding** — format / codec conversion for publishing targets.
- **Probing** — `ffprobe` for media inspection.
- **AI video integration** — overlay narration on Sora-2 clips, mute the
  source audio, retime as needed.

---

## 11. HyperFrames Component Library

The component library is the primary way the agent expresses scenes (P4).
Every component has a stable contract documented in
[`render/components/CONTRACT.md`](../render/components/CONTRACT.md):

- `index.html` — structure + Mustache templating.
- `style.css` — optional, scene-ID-scoped to prevent leakage.
- `animation.js` — paused GSAP timeline registered on
  `window.__timelines[SCENE_ID]`. Transform-only animations (no layout-
  triggering properties). Honors `SCENE_DURATION` for pacing.

### 11.1 The 79 SCF-Registered Components

The SCF schema currently registers 79 renderable component IDs. The filesystem
may contain extra legacy or experimental component folders; schema registration
is the source of truth for what an agent can reference in `scene.component`.

#### Framing primitives (5)
`BrandIntro` · `BrandOutro` · `TitleCard` · `AnimatedCaption` · `LowerThird`

#### Reusable scene components (9)
`MetricsCard` · `CompareSlider` · `CalloutPin` · `CalloutBox` · `Quote` ·
`ArchitectureDiagram` · `StepByStep` · `CTABlock` · `DataChart`

#### Synthetic Microsoft surface mockups (18)
`TerminalScene` · `VSCodeScene` · `AzurePortalScene` · `GitHubScene` ·
`EdgeBrowserScene` · `TeamsScene` · `OutlookScene` · `ExcelScene` ·
`PowerPointScene` · `PowerBIScene` · `FabricScene` · `WindowsScene` ·
`AdminCenterScene` · `LoopScene` · `StreamScene` · `ListsScene` ·
`PlannerScene` · `OneDriveScene`

#### M365 collaboration apps (3)
`FormsScene` · `BookingsScene` · `WhiteboardScene`

#### Overlays & framing (8)
`WebcamOverlay` · `TransitionWipe` · `SlideRenderer` · `ScreenDemoFrame` ·
`SplitScreen` · `SectionDivider` · `ScrollingBackground` · `PresenterBug`

#### Governance & compliance (4)
`ComplianceBadgeWall` · `DataFlow` · `AuditTrail` · `PolicyEnforcement`

#### Business & metrics (7)
`Roadmap` · `BurnDown` · `OKRStatus` · `ReleaseNotes` ·
`PricingTable` · `CompetitiveMatrix` · `ROICalculator`

#### Education & engagement (4)
`Quiz` · `TerminologyCard` · `ProgressBar` · `AskTheAudience`

#### Content & identity (5)
`CustomerStory` · `AudienceSafe` · `Disclaimer` · `EventBranding` ·
`TerminalCast`

#### Cinematic transitions & motion primitives (12)
`CollageShatter` · `DepthZoomPunch` · `SwirlVortex` · `PageTurn` ·
`PrismRefract` · `IrisZoom` · `OrbitReveal` · `FilmstripFlip` ·
`TypewriterDissolve` · `ParticleAssemble` · `GlitchPulse` · `ShakeImpact`

#### Rich composition helpers (4)
`AssetCascade` · `ComponentOverlay` · `MetricStack` · `BookPageMetrics`

### 11.2 Component vs Layer vs Structured Visual

The agent's choice — encoded in the `scene-component-routing` skill — is a
strict precedence ladder:

1. **Brand-required openers/closers** → `BrandIntro` / `BrandOutro`.
2. **Recognized intent** (terminal demo, code walkthrough, metrics, quote,
   compare, etc.) → matching component.
3. **Microsoft product mockup intent** → `*Scene` component.
4. **Structured data with precise text** (code, table, chart, diagram, UI) →
   generate a PNG with the `structured_image` tool, then place as an image layer.
5. **Photorealistic / illustrative imagery** → `layers` with image generated
   by `foundry_image_gen` routing engine.
6. **Motion footage** → `foundry_video_gen` (Sora-2) or user-provided clip, placed as a video layer.

### 11.3 Component Authoring Contract

The `component-authoring` skill enforces:

- **Paused master timeline.** The producer drives the timeline by setting
  its progress; components must not auto-play.
- **`SCENE_DURATION` awareness.** Animations scale to the scene's declared
  duration.
- **Transform-only animations.** No `width`/`height`/`top`/`left` (layout
  triggers); only `transform` and `opacity`.
- **Scene-ID scoping.** All CSS scoped via `[data-scene-id="…"]` to prevent
  cross-scene leakage. The `scripts/scope-css.mjs` utility automates this.
- **No forbidden GSAP plugins.** `ScrollTrigger`, `ScrollSmoother`,
  `Draggable` are blocked by `governance-policy.yaml` because they don't
  work in headless capture.

---

## 12. AI Model Integration (Azure AI Foundry)

All model configuration is centralized in
[`config/models.yaml`](../config/models.yaml) — the single source of truth
for endpoints, deployment names, costs, and constraints. All models are
hosted on a single Azure AI Foundry resource.

### 12.1 Model Registry

| Deployment | Model | Provider | Use case | Cost |
|-----------|-------|----------|----------|------|
| `gpt-image-2` | gpt-image-2 | OpenAI (Azure) | All image generation (faces, scenes, creative, text-in-image) | ~$0.04 / image |
| `gpt-4o-mini-tts` | gpt-4o-mini-tts | OpenAI (Azure) | Text-to-speech narration (6 voices) | ~$0.001 / sec |
| `gpt-4o-transcribe` | gpt-4o-transcribe | OpenAI (Azure) | Speech-to-text with word-level timestamps | ~$0.006 / min |
| `sora` | Sora-2 | OpenAI SDK (Azure) | AI video clip generation | ~$0.20 / sec |

Plus the analysis service:

| Service | Use | Cost |
|---------|-----|------|
| Azure AI Video Indexer | Deep video review (OCR, transcript, scenes, faces, moderation) | $0.09–0.15 / min (2400 free trial min) |

### 12.2 Image Generation

All AI image generation uses `gpt-image-2`. Structured content (code,
tables, charts, UI mockups) routes to the Pillow-based `structured_image`
tool via `model_hint="structured"`. Legacy quality aliases are normalized to
the values accepted by the deployment (`low`, `medium`, `high`).

- **Override** with `model_hint`: `"structured"` routes to Pillow tools.
- **Retry / fallback contract**: generation retries transient Foundry failures.
  Placeholder or FFmpeg fallback output is allowed only when explicitly
  requested or approved, and fallback use is recorded for review. Slate fails
  loud by default instead of silently downgrading a scene.

### 12.3 TTS Voices

`gpt-4o-mini-tts` exposes six voices, selected by `BrandPackage.voice` or
inferred from requested tone:

| Voice | Character |
|-------|-----------|
| `coral` | Warm, professional (default) |
| `echo` | Clear, authoritative |
| `shimmer` | Friendly, approachable |
| `onyx` | Deep, cinematic |
| `nova` | Energetic, modern |
| `fable` | Storytelling, narrative |

### 12.4 AI Video — Sora-2 Constraints

`scripts/lib/video_gen.py` (production) and
`src/slate/tools/video/foundry_video_gen.py` (stub) wrap Sora-2 with strict
constraints validated up-front:

- **Durations**: exactly **4, 8, or 12 seconds**. Other values → 400 error.
- **Max resolution**: 1280×720 (no 1080p in preview).
- **Rate limit**: 1 request per 60 seconds; expect 60–160s per clip.
- **Auth**: `DefaultAzureCredential` with scope `https://ai.azure.com/.default`
  (different from image/TTS).
- **SDK**: OpenAI Python SDK only — raw REST fails model validation.
- **Fallback**: if Sora-2 is unavailable, fallback clips are opt-in and tracked
  in the generation result so review can distinguish an approved downgrade
  from a failed generation.

### 12.5 Transcription — gpt-4o-transcribe

- API version `2025-04-01-preview`, multipart form-data POST.
- `response_format=verbose_json` + `timestamp_granularities[]=word` for
  word-level timestamps (used by `AnimatedCaption`).
- Max file size 25 MB; supports wav, mp3, flac, ogg, m4a.
- Rate limit 100 RPM at capacity 1.

### 12.6 Video Indexer (Optional Deep Review)

`src/slate/tools/analysis/video_indexer.py` uploads the rendered MP4 to a
Video Indexer account and retrieves OCR, transcript, scenes, audio_effects,
faces, and moderation results. The reviewer maps these signals onto the P6
rubric via the rules R1–R6 in the `video-indexer-review` skill. If VI is
not configured, the reviewer falls back to local FFmpeg heuristics.

---

## 13. Governance, Audit & Cost

### 13.1 Three Cooperating Layers

```
   ┌────────────────────────────────────────────────────────────────┐
   │  GovernancePolicy   ←  config/org/governance-policy.yaml       │  static rules
   ├────────────────────────────────────────────────────────────────┤
   │  GovernanceContext  ←  bundles trace + policy + artifacts      │  per-run state
   ├────────────────────────────────────────────────────────────────┤
   │  TracedDispatcher   ←  enforces at every tool call             │  enforcement
   └────────────────────────────────────────────────────────────────┘
```

### 13.2 Org Policy (`governance-policy.yaml`)

Loaded by `GovernancePolicy`. Highlights:

```yaml
governance:
  default_project_budget_usd: 100.00  # USD per production unless overridden
  hard_budget_cap: 100.00             # Org cap; handling controlled below
  budget_cap_enforcement: warn        # warn | clamp | block
  require_hitl_gates: true            # human-in-loop at every gate
  require_independent_review: true    # reviewer cannot regenerate
  max_retries_per_stage: 3
  max_production_duration: 1800       # 30 minutes wall clock

content_safety:
  enabled: true
  blocked_categories: [violence, hate_speech, sexual_content, self_harm]
  check_generated_assets: true

providers:
  data_residency: us
  preferred_providers: [azure_foundry]

audit:
  persist_after_phase: true
  include_hashes: true
  retention_days: 90

runtime_libraries:
  allowed:    [gsap@^3.12, gsap-flip@^3.12, shiki@^1.0, mermaid@^10.0, chart.js@^4.0]
  forbidden:  [ScrollTrigger, ScrollSmoother, Draggable, …]
```

### 13.3 Two-Phase Review Model

Slate enforces review via a **sub-agent** deployed by the main agent, not
self-scoring:

```
┌────────────────────────────────┐    ┌─────────────────────────────────┐
│  PRE-COMPOSE VALIDATION        │    │  POST-RENDER REVIEW (sub-agent) │
│                                │    │                                 │
│  scf_validate.py               │    │  scripts/review_run.py          │
│  ✅ Narration overflow check   │    │  ✅ FFmpeg inspection            │
│  ✅ Clip duration check        │    │  ✅ Black frame detection        │
│  ✅ Sora-2 audio strip verify  │    │  ✅ Audio level analysis         │
│  ✅ Missing asset detection    │    │  ✅ Video Indexer (optional)     │
│  ✅ Captions required          │    │  ✅ Beat-density checks          │
│  ✅ Visual beat density        │    │  ✅ Narration/visual support     │
│                                │    │  ✅ 8-dimension scoring          │
│  Runs BEFORE render            │    │  Runs AFTER render               │
└────────────────────────────────┘    └─────────────────────────────────┘
```

The reviewer sub-agent cannot regenerate assets — it can only inspect and
report. If issues are found, the main agent fixes them, re-renders, and
re-reviews.

### 13.4 Cost Governance

```
┌────────────────┐     ┌────────────────┐     ┌──────────────────┐
│ Pre-flight     │     │ Runtime        │     │ Post-production  │
│ estimate       │────▶│ record         │────▶│ report + audit   │
│ CostTracker    │     │ TracedDispatch │     │ cost_log.jsonl   │
│ .estimate()    │     │ .record()      │     │ ProductionTrace  │
└────────────────┘     └────────────────┘     └──────────────────┘
```

- **Default per-production budget**: $100 from `governance.default_project_budget_usd`.
- **Configurable budget**: per-project config and `scripts/slate_render.py --budget-usd`
  flow through [`src/slate/core/budget.py`](../src/slate/core/budget.py).
- **Org hard cap**: $100 by default, with `budget_cap_enforcement` set to
  `warn`, `clamp`, or `block` in `governance-policy.yaml`.
- **Warn** at 50%, **pause** at 90% — the agent must ask the user to extend
  the budget or reduce scope.
- **`output/cost_log.jsonl`** is the canonical audit log:

```jsonl
{"tool":"foundry_image_gen","model":"gpt-image-2","estimated":0.04,"actual":0.04,"ts":"2026-04-15T10:23:45Z"}
{"tool":"foundry_image_gen","model":"gpt-image-2","estimated":0.04,"actual":0.04,"ts":"2026-04-15T10:23:47Z"}
{"tool":"foundry_tts","model":"gpt-4o-mini-tts","estimated":0.06,"actual":0.058,"ts":"2026-04-15T10:24:12Z"}
{"tool":"foundry_video_gen","model":"sora-2","estimated":0.80,"actual":0.96,"ts":"2026-04-15T10:26:45Z"}
```

### 13.5 Policy Enforcement Flow

```
Director calls dispatch("foundry_image_gen", prompt="…")
     │
     ▼
TracedDispatcher
     ├─▶ GovernanceContext.check_tool_allowed("foundry_image_gen")
     │       ├── GovernancePolicy.is_tool_permitted(current_phase, …)
     │       │      checks YAML tools_available / tools_forbidden
     │       └── Stage-role check (reviewer cannot generate)
    ├─▶ CostTracker.estimate(…) → $0.04. Budget remaining $99.96. OK.
     ├─▶ ProductionTrace.start_span("foundry_image_gen", parent=stage_span)
     ├─▶ tool.execute(prompt=…) → ToolResult(image_path=…)
     ├─▶ CostTracker.record("foundry_image_gen", actual=$0.04)  → cost_log.jsonl
     └─▶ ProductionTrace.end_span(span_id, result, cost=$0.04)
```

A violation (forbidden tool, budget exceeded, missing skill) is recorded in
the trace **even when the call is blocked** — preserving the attempt in the
audit record.

---

## 14. Brand System

Brand packages are loaded by `BrandPackage` from
`config/org/brand-packages/<name>.yaml`. They drive both asset generation
prompts and SCF composition props.

### 14.1 Brand Package Shape

```yaml
name: Contoso
primary_color: "#0078D4"
secondary_colors: ["#50E6FF", "#D83B01", "#FFB900"]
fonts:
  heading: "Segoe UI Semibold"
  body: "Segoe UI"
  caption: "Segoe UI Light"
logo:
  path: "assets/brand/contoso-logo.png"
  min_size: 80          # px — never render smaller
  placement: "top-left"
  margin: 24
voice: "coral"          # preferred TTS voice
intro:
  tagline: "Empowering every person and every organization."
  duration: 4
outro:
  cta: "Learn more at contoso.com"
  contact: "info@contoso.com"
locked_elements:
  - logo                # cannot be cropped, recolored, or scaled
  - primary_color       # cannot be substituted
disclaimers:
  - "Forward-looking statements may involve risk."
```

### 14.2 Enforcement Levels

| Level | Mechanism | Checks |
|-------|-----------|--------|
| **Asset generation** | Prompt injection | Image-gen prompts include brand colors |
| **SCF composition** | `BrandPackage.to_scf_props()` | `BrandIntro`/`BrandOutro` get correct props |
| **SCF schema** | `brandPackage` + `brandPackageHash` fields | `external`/`executive` profiles **must** pin a hashed brand version |
| **Post-render review** | P6 `brand_compliance` dimension | Logo present, colors consistent, locked elements intact |

### 14.3 Default Behavior (No Brand Package — P11)

When no brand package is loaded:
- Dark background `#1a1a2e`, white text, Microsoft blue accent `#0078D4`.
- No logo.
- TTS voice `coral`.

The agent is expected to ask whether to load a brand package before going
to a cost-intensive stage.

---

## 15. Quality Assurance & Self-Review

### 15.1 Two-Phase Review Model (P6)

Review is split into **pre-compose validation** and **post-render review**,
enforced by separate tools.

**Phase 1 — Pre-compose validation** (`scripts/lib/scf_validate.py`):

Run after generating assets but before rendering. Catches:
- Narration audio that overflows scene durations (the #1 quality killer)
- Video clips shorter than their scene (causes black frames)
- Video clips with embedded audio (Sora-2 audio bleed)
- Missing asset files
- Narrated videos with captions missing or disabled
- Scenes where one static visual holds longer than 3-4 seconds
- Narration that says architecture, metric, book/page, VS Code/Copilot,
  spreadsheet, Teams/Outlook/M365, or CLI without the corresponding visual surface
- Narration text artifacts such as ellipses / "dot dot" that TTS may read aloud

**Phase 2 — Post-render review** (`scripts/review_run.py`):

A **reviewer sub-agent** (deployed via `runSubagent`) runs the review CLI
after rendering. The main agent does not self-score — the reviewer operates
independently to avoid sunk-cost bias.

The reviewer scores **8 dimensions** (1–3 scale):

| Dimension | Score 1 (Fail) | Score 2 (Acceptable) | Score 3 (Excellent) |
|-----------|----------------|----------------------|---------------------|
| **brand_compliance** | Wrong colors/fonts, missing logo | Mostly correct, minor deviations | Perfect brand adherence |
| **caption_accuracy** | Major errors, wrong timing | Minor typos, slight misalignment | Perfect accuracy & sync |
| **audio_quality** | Clipping, bad levels, silence gaps >3s | Clean audio, basic mixing | Professional mix, smooth ducking |
| **visual_consistency** | Black frames, jarring style changes | Generally consistent | Cohesive visual language |
| **pacing** | Scenes too long/short, uneven | Reasonable pacing | Natural flow, well-timed |
| **content_accuracy** | Hallucinations, facts wrong | Generally accurate | Fully traceable to source |
| **content_redundancy** | >60% word overlap between scenes | Moderate repetition | Each scene has distinct content |
| **narration_timing** | Narration overflows scene duration | Minor timing mismatch | Audio fits within all scenes |

**Verdict.** Aggregate 8–24. **Any** dimension scoring 1 triggers a REVISE
verdict; the agent must fix the issue, re-render, and re-review before
CK-DELIVER.

### 15.2 Inspection Tools

| Tool | What it checks |
|------|---------------|
| `detect_frozen_frames()` | FFmpeg `freezedetect` — repeated identical frames |
| `detect_black_frames()` | FFmpeg `blackdetect` — missing content, failed asset loads |
| `probe_audio_levels()` | FFmpeg `volumedetect` + `silencedetect` — levels, silence gaps |
| `extract_sample_frames()` | Evenly-spaced PNG frames for visual review |
| Video Indexer (optional) | Deep review: OCR, transcript, scene boundaries, moderation |

### 15.2 Stage Gates (P7)

The `_stage_gate()` helper in `slate_render.py` is the human-in-the-loop
checkpoint:

1. Present the current artifact (brief, script, scene plan, or rendered
   video).
2. Ask for explicit approval.
3. Record the decision in the production trace.
4. Advance only if approved.

### 15.3 EvalHarness — Pluggable Evaluators

[`src/slate/core/eval_harness.py`](../src/slate/core/eval_harness.py) hosts
runtime-registered evaluators that contribute to the rubric:

```
EvalHarness
  ├── AudioLevelEvaluator       # Peak / RMS within target range
  ├── CaptionSyncEvaluator      # Caption timing matches narration
  ├── BrandComplianceEvaluator  # Colors / fonts / logo
  ├── DurationEvaluator         # Total duration within target ±10%
  ├── DemoDataEvaluator         # Fail if demo data in external/exec/regulated
  └── (custom evaluators)       # Project-registered
```

Each returns a `DimensionScore` with score, evidence, and findings, which
the harness aggregates into an `EvalReport` attached to the trace.

### 15.4 Local Inspection — `video_inspect.py`

[`scripts/lib/video_inspect.py`](../scripts/lib/video_inspect.py) does
multimodal local inspection (FFmpeg-only, free): keyframe sampling, audio
RMS analysis, scene-change detection, and side-by-side comparison against
the SCF — all without uploading to Video Indexer.

---

## 16. Entry Points & Scripts

### 16.1 Primary Entry — `scripts/slate_render.py`

End-to-end renderer. Takes a scenario JSON and orchestrates ingest →
research → script → scene_plan → assets → compose → review.

Key responsibilities:

- Initialize `GovernanceContext` (trace + policy + artifacts).
- Resolve budget via `budget.py` from CLI override, project config, org policy,
  or the `$100` default.
- Optionally load `BrandPackage`.
- Walk the agentic production stages, opening one trace span per stage.
- Invoke production tools from `scripts/lib/`.
- At `compose`: build SCF via `SCFComposer`, run `scripts/lib/scf_validate.py`,
  validate against schema, invoke `node render.mjs`.
- At `review`: run the reviewer surface (`scripts/review_run.py` / P6 rubric +
  EvalHarness + optional Video Indexer) and re-render if a dimension scores 1.
- Persist `production_trace.json`, ledger/cost JSONL, decisions, SCF, review
  report, and rendered MP4 under the project folder.

### 16.2 Production Library — `scripts/lib/`

| File | Purpose |
|------|---------|
| `image_gen.py` | gpt-image-2 image generation with Pillow fallback |
| `tts_gen.py` | Azure gpt-4o-mini-tts |
| `video_gen.py` | Sora-2 via OpenAI SDK (auto-strips audio from AI clips) |
| `live_subtitles.py` | gpt-4o-transcribe with word-level timestamps |
| `subtitle_burner.py` | SRT/VTT burn-in via FFmpeg |
| `video_compose.py` | Scene assembly, concat, audio mix, subtitle integration |
| `structured_image.py` | Pillow-rendered code / table / UI / diagram / bar / donut |
| `video_inspect.py` | Multimodal local inspection (frozen frames, black frames, audio levels) |
| `scf_validate.py` | Pre-compose validation (narration overflow, clip duration, missing assets) |
| `model_registry.py` | Wraps `config/models.yaml` |

### 16.3 Other Entry Points

- **`setup.ps1`** — One-time environment setup (Python deps, Node deps,
  Azure CLI prerequisites).
- **`slate clean`** — Package CLI entry point for dry-run and executed cleanup
  of generated project/output artifacts.
- **`scripts/review_run.py`** — Standalone reviewer for re-evaluating an existing
  rendered MP4 + SCF without re-rendering.
- **`render/render.mjs`** — Render CLI (Node).

### 16.4 `pyproject.toml`

```toml
[project]
name = "slate"
version = "0.1.0"
description = "Agentic content production engine for the enterprise"
requires-python = ">=3.11"
dependencies = [
  "jsonschema>=4.20",
  "pyyaml>=6.0",
  "pydantic>=2.5",
  "httpx>=0.27",
  "rich>=13.0",
  "Pillow>=10.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23", "ruff>=0.4"]

[project.scripts]
slate = "slate.cli:main"
```

The package is imported as a library (`from slate.core import …`) and exposes
the `slate` console command for maintenance helpers such as `slate clean`.

---

## 17. Data Flow — Prompt to MP4

```
USER PROMPT: "Make a 60-second explainer about our new AI product."
     │
     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  INTENT → BRIEF                                                        ║
║  • Parse prompt for: audience, tone, duration, topic                    ║
║  • If files provided → run ingest tools (pptx/docx/xlsx/image/video)    ║
║  • Concrete availability scan (brand, models, media)                    ║
║  • Produce brief.md → ──── CK-REVIEW: user approval ────               ║
╚══════════════════════════════════════════════════════════════════════════╝
     │
     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  SCRIPT                                                                 ║
║  • Write narration with per-scene timing                                ║
║  • Match requested tone & duration (~150 wpm)                           ║
║  • Produce script.md → ──── CK-REVIEW: user approval ────              ║
╚══════════════════════════════════════════════════════════════════════════╝
     │
     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  SCENE PLAN                                                             ║
║  For each scene: id, duration, component (or layers), visual prompt /   ║
║  asset references, narration segment, transition.                       ║
║  Load director skills + scene-component-routing + structured-visuals.   ║
║  Produce scene-plan.md → ──── CK-REVIEW: user approval ────            ║
╚══════════════════════════════════════════════════════════════════════════╝
     │
     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  ASSETS — ──── CK-CONFIRM: cost estimate + approval ────               ║
║  Parallel generation:                                                   ║
║   • image_gen (gpt-image-2)                                              ║
║   • tts_gen (selected voice)                                            ║
║   • video_gen (Sora-2, 4/8/12s — audio auto-stripped)                   ║
║   • structured_image (Pillow, free)                                     ║
║  Outputs → projects/<slug>/assets/                                       ║
╚══════════════════════════════════════════════════════════════════════════╝
     │
     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  PRE-COMPOSE VALIDATION                                                 ║
║  python scripts/lib/scf_validate.py <scf>                               ║
║  • Narration overflow detection (TTS audio vs scene duration)            ║
║  • Video clip duration vs scene duration (black frame prevention)        ║
║  • Sora-2 audio track verification                                      ║
║  • Missing asset detection                                              ║
║  Fix all issues before rendering.                                       ║
╚══════════════════════════════════════════════════════════════════════════╝
     │
     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  COMPOSE                                                                ║
║  1. Build SCF JSON (composition.scf.json)                                ║
║  2. Validate against schemas/scf-v1.0.schema.json                       ║
║  3. node render/render.mjs <scf> → governance gate → HTML → MP4          ║
╚══════════════════════════════════════════════════════════════════════════╝
     │
     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  REVIEW (sub-agent)                                                     ║
║  python scripts/review_run.py --video <mp4> --scf <scf>                 ║
║  • Local FFmpeg inspection (frozen frames, black frames, audio levels)   ║
║  • Azure Video Indexer deep review (optional)                           ║
║  • 8-dimension scoring (1-3 scale)                                      ║
║  • ──── CK-REVIEW: pass/revise verdict ────                             ║
║  If any dimension = 1 → fix, re-render, re-review                       ║
╚══════════════════════════════════════════════════════════════════════════╝
     │
     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  ──── CK-DELIVER ────                                                   ║
║  Present: MP4 path, runtime, cost summary, review report                ║
║  "Anything to change, or are we shipping?"                              ║
╚══════════════════════════════════════════════════════════════════════════╝
     │
     ▼
FINAL OUTPUT
  ├── projects/<slug>/renders/*.mp4          The video
  ├── projects/<slug>/assets/                Generated assets
  ├── projects/<slug>/ledger.jsonl           Per-call costs
  ├── projects/<slug>/decisions.jsonl        Decision & checkpoint log
  ├── projects/<slug>/composition.scf.json   Composition document
  └── projects/<slug>/review_report.md       Quality review
```

### 17.1 State Persistence (P10)

| State | Location | Format |
|-------|----------|--------|
| Project metadata | `projects/<slug>/project.json` | JSON |
| Creative brief | `projects/<slug>/brief.md` | Markdown |
| Decision log | `projects/<slug>/decisions.jsonl` | JSONL (append-only) |
| Cost ledger | `projects/<slug>/ledger.jsonl` | JSONL (append-only) |
| Generated assets | `projects/<slug>/assets/` | Binary files |
| Rendered videos | `projects/<slug>/renders/` | MP4 |
| SCF composition | `projects/<slug>/composition.scf.json` | JSON |
| Review report | `projects/<slug>/review_report.md` | Markdown + JSON |
| Brand package | `config/org/brand-packages/` | YAML |
| Governance policy | `config/org/governance-policy.yaml` | YAML |
| Model registry | `config/models.yaml` | YAML |
| SCF schema | `schemas/scf-v1.0.schema.json` | JSON Schema |

---

## 18. Roadmap — Phase II & Phase III

### Phase I — ✅ Complete

- 5 framing + 9 scene + 13 Microsoft surface components.
- SCF v1.0 schema, validated end-to-end.
- Agentic production loop with 6 rules + 4 checkpoint types.
- Layered skills system + governance audit.
- gpt-image-2, Sora-2, gpt-4o-mini-tts, gpt-4o-transcribe.
- P6 two-phase review rubric + EvalHarness.

### Phase II — ✅ Largely Complete

Component library expanded from 36 to **79 registered components** across all personas:
M365 collaboration (Loop, Stream, Whiteboard, Lists, Planner, OneDrive,
Forms, Bookings), business (Roadmap, BurnDown, OKR, PricingTable,
CompetitiveMatrix, ROICalculator, ReleaseNotes), education (Quiz,
TerminologyCard, ProgressBar), event (TerminalCast, PresenterBug,
EventBranding, AskTheAudience), compliance (ComplianceBadgeWall, DataFlow,
AuditTrail, PolicyEnforcement), content (CustomerStory, AudienceSafe,
Disclaimer), cinematic transitions (PageTurn, IrisZoom, FilmstripFlip,
CollageShatter, and related motion primitives), and rich composition helpers
(ComponentOverlay, MetricStack, BookPageMetrics, AssetCascade).

**Intelligence layer:**
- Scene-component-routing skill (✅ delivered).
- Visual-storytelling-components umbrella skill (✅ delivered).
- Director council skills for cinematic, motion, and rhetoric review (✅ delivered).
- Narration-component sync (✅ delivered).
- Demo-data classifier (✅ delivered).
- Pre-compose validation (`scf_validate.py`) — narration overflow, clip
  duration mismatch, Sora-2 audio bleed detection (✅ delivered).
- Reviewer sub-agent model with 8-dimension rubric (✅ delivered).
- Black frame detection in video_inspect.py (✅ delivered).
- Auto-strip audio from Sora-2 clips in video_gen.py (✅ delivered).

### Phase III — Planned

- `src/slate/agents/` — Multi-agent extensions (currently: `ReviewerAgent` protocol).
- `src/slate/tools/avatar/` — digital spokesperson generation.
- `src/slate/tools/capture/` — desktop and Playwright browser capture.
- `src/slate/tools/enhancement/` — color grading, super-resolution, noise
  reduction.
- `src/slate/tools/publish/` — Teams, SharePoint, Stream upload.

---

## Appendix A — Authentication & API Scopes

| Service | Auth | Scope / resource |
|---------|------|------------------|
| Image gen (gpt-image-2) | Azure CLI bearer token | `https://cognitiveservices.azure.com` |
| TTS (gpt-4o-mini-tts) | Azure CLI bearer token | `https://cognitiveservices.azure.com` |
| Transcribe (gpt-4o-transcribe) | Azure CLI bearer token | `https://cognitiveservices.azure.com` |
| Video gen (Sora-2) | `DefaultAzureCredential` | `https://ai.azure.com/.default` |
| Video Indexer | Azure CLI bearer token | Service-specific (account-scoped) |
| Publishing (Teams, SharePoint, Stream — Phase III) | Microsoft Graph | `https://graph.microsoft.com` |

> **Sora-2 caveat.** Sora-2 uses a different scope (`ai.azure.com`) than
> image/TTS (`cognitiveservices.azure.com`). The OpenAI Python SDK is
> required — raw REST calls fail with model-validation errors.
>
> **Windows caveat.** `az` CLI subprocess calls require `shell=True` because
> `az.cmd` is a batch file.

---

## Appendix B — Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Agent-as-Director** (not agent-as-tool) | Video production needs creative judgment — shot composition, pacing, narrative arc. A tool-calling loop cannot make these decisions; a director agent can. |
| **SCF JSON as intermediate format** | Decouples creative decisions from rendering technology. Today HyperFrames; tomorrow another engine. Also makes diff/review/version-control sensible. |
| **Append-only `ProductionTrace`** | Immutable audit trail for enterprise compliance. No span is mutated post-completion. |
| **Two-phase review (pre-compose + post-render sub-agent)** | Pre-compose validation catches timing issues cheaply. Post-render sub-agent ensures independent inspection without sunk-cost bias. 8-dimension rubric covers narration timing and black frames. |
| **Declarative YAML pipelines** \u2192 **Agentic loop** | Originally pipelines were YAML manifests (`pipeline_defs/`). Replaced by agent-driven production loop with mixable director skills and append-only decision logs. More flexible, same governance. |
| **Single image model** | gpt-image-2 excels at all content types — faces, scenes, creative, text-in-image. Single-model simplicity reduces routing complexity and failure modes. |
| **Structured visuals (Pillow)** | AI image models cannot reliably render code, tables, or charts. Pillow is deterministic, free, and pixel-accurate. |
| **Cost-aware by default** | Pre-flight estimates, gate-level budget caps, JSONL audit log are core infrastructure, not optional add-ons. |
| **Configurable `$100` default budget** | `budget.py` centralizes default, project, CLI, and org-cap behavior so cost limits do not drift across tools. |
| **Filesystem-first state (P10)** | Project state, assets, cost logs, traces are written to disk immediately. Crashes do not lose work. |
| **Single-responsibility tools (P9)** | Small tools are easier to test, compose, and replace. A monolithic "video maker" tool would be brittle and opaque. |
| **Layered skills with audit** | Skills are mandatory; the trace records consultation. "Read the skill before you act" becomes enforceable, not aspirational. |
| **Stub vs production tool tier** | `BaseTool` stubs in `src/slate/tools/` allow end-to-end test runs without API spend; production code lives in `scripts/lib/`. |
| **Fail-loud Foundry generation** | Azure image, TTS, and video generation retry transient failures, then fail visibly unless an explicit fallback was approved and tracked. |
| **Repo-root `tools/` as documentation skeleton** | Surfaces the planned tool taxonomy by phase without committing to immediate implementation. |

---

*This document describes the architecture of Slate as of April 2026 (Phase II
largely complete). For the SCF schema specification see
[`schemas/scf-v1.0.schema.json`](../schemas/scf-v1.0.schema.json). For
agent operating instructions see
[`.github/copilot-instructions.md`](../.github/copilot-instructions.md). For
skill discovery see [`skills/INDEX.md`](../skills/INDEX.md).*
