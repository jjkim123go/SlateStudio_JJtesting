# OpenMontage Lineage in Slate

Slate has substantial architectural and implementation lineage from
[OpenMontage](https://github.com/calesthio/OpenMontage), an AGPL-3.0 agentic
video production project created by the same author. OpenMontage should be
credited wherever its concepts materially shape Slate.

This document is the canonical repository map for that lineage. File headers
link here rather than repeating a long history in every module. The labels
below describe the relationship at a subsystem level; they do not make a
blanket claim that every implementation is either copied or independently
created. Source-level provenance requires comparison against the relevant
OpenMontage version and commit history.

## Relationship labels

- **Architectural lineage**: the subsystem follows a system pattern developed
  in OpenMontage, while Slate may use different contracts or technology.
- **Implementation lineage**: interfaces, control flow, routing, or operational
  behavior were informed by corresponding OpenMontage implementation work.
- **Slate extension**: behavior added for Slate, such as Azure integration,
  enterprise governance, SCF, HyperFrames rendering, or append-only audit data.

## Subsystem map

| OpenMontage lineage | Slate implementation | Relationship in Slate |
|---|---|---|
| Tool contracts and capability metadata | `src/slate/core/base_tool.py`, `src/slate/core/tool_registry.py` | Architectural and implementation lineage; extended with tier, runtime, stability, compliance, residency, fallbacks, and support envelopes. |
| Image, narration, and video selection/routing | `scripts/lib/image_gen.py`, `scripts/lib/tts_gen.py`, `scripts/lib/video_gen.py`, `src/slate/tools/graphics/foundry_image_gen.py`, `src/slate/tools/audio/foundry_tts.py`, `src/slate/tools/video/foundry_video_gen.py` | Implementation lineage from OpenMontage selector/tool patterns; providers and authentication are Azure-native in Slate. |
| FFmpeg-centered media assembly | `scripts/lib/video_compose.py`, `scripts/slate_render.py` | Architectural and implementation lineage; Slate adds SCF, HyperFrames, split-scene rendering, and enterprise review. |
| Agent-directed production workflow | `.github/copilot-instructions.md`, `skills/meta/production-loop.md`, `skills/meta/checkpoint-protocol.md` | Architectural lineage from OpenMontage's agentic production approach; Slate externalizes approvals, cost gates, and review contracts. |
| Durable production artifacts and resumability | `skills/meta/state-and-decisions.md`, `src/slate/core/cost_tracker.py`, project `decisions.jsonl` and `ledger.jsonl` contracts | Architectural lineage; Slate uses append-only decisions and cost receipts as its project state substrate. |
| Declarative composition | `schemas/scf-v1.0.schema.json`, `src/slate/core/scf_composer.py`, `render/lib/scf-to-html.mjs`, `render/render.mjs` | Architectural lineage from declarative scene/pipeline concepts; SCF and the HyperFrames compiler/render path are Slate-specific extensions. |
| Capability-aware rendering tool | `src/slate/tools/video/hyperframes_render.py` | Architectural lineage in the tool boundary; HyperFrames is an Apache-2.0 dependency separately attributed in `NOTICE.md`. |
| Cost estimation and budget modes | `src/slate/core/cost_tracker.py` | Implementation lineage from OpenMontage budget configuration; extended with project ledger and enterprise chargeback fields. |
| Living production board | `src/slate/soundstage/`, `skills/meta/living-storyboard.md`, `docs/design/LIVING_STORYBOARD.md` | Direct conceptual and implementation lineage from OpenMontage Backlot (PR #273); Slate adds SCF-native storyboards, narration overflow, variety, governance, and provenance views. |

## Slate-specific systems

The lineage above coexists with substantial Slate-specific work, including:

- Azure AI Foundry resource discovery, authentication, deployment, and model
  adapters.
- Slate Composition Format (SCF) schema details and the SCF-to-HyperFrames
  compiler.
- HyperFrames integration and project-scoped motion component contracts.
- Enterprise governance policy, delivery profiles, brand packages, and review
  dimensions.
- Append-only decision, checkpoint, event, and cost records used by Soundstage.

These extensions do not erase the OpenMontage lineage of the surrounding
production architecture.

## Attribution practice

1. Keep the repository-level relationship in `NOTICE.md` and `README.md`.
2. Put a short lineage note in each subsystem entry point listed above.
3. Link detailed design documents and skills back to this map.
4. If a future audit identifies source copied or adapted from a specific
   OpenMontage file, record the upstream path and commit here and preserve the
   applicable copyright and license notice in that file.
5. Do not add OpenMontage headers to generated projects, renders, caches,
   unrelated tests, or Azure-only integration modules without a concrete
   lineage relationship.

This document records technical provenance and attribution. It is not a legal
conclusion about license obligations for any particular file or distribution.