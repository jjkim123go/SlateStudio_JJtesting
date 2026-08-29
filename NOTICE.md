# NOTICE — Lineage, Dependencies, and Attribution

Slate is a proprietary Microsoft project with documented architectural and
implementation lineage from open-source work, including OpenMontage. This
notice records that relationship alongside Slate's runtime dependencies.

## Architectural Inspiration

Slate's design and implementation experience draw from the following
open-source project:

### OpenMontage
- **Repository:** https://github.com/calesthio/OpenMontage
- **License:** GNU Affero General Public License v3.0 (AGPL-3.0)
- **Author:** the original author
- **Relationship:** Slate's author is also the creator of OpenMontage.
  Tool contracts, capability registries, model/tool routing, declarative
  production, media assembly, budget controls, and the agent-directed
  production workflow carry OpenMontage lineage into Slate. Slate extends
  those foundations for Azure AI Foundry and enterprise governance.
- **Soundstage (living storyboard):** Slate's `slate.soundstage` board is a
  reimplementation and extension of **Backlot**, the living storyboard shipped in
  OpenMontage (PR #273, https://github.com/calesthio/OpenMontage/pull/273).
  The read-only, disk-derived production-board model is shared lineage. Slate
  applies it to its append-only state contract (`decisions.jsonl`
  / `ledger.jsonl` + SCF) and extends it (variety meter, narration-timeline,
  design-critic overlay, provenance trail, governance panel).
- **Detailed map:** See `docs/OPENMONTAGE_LINEAGE.md` for the subsystem-level
  relationship and the Slate files where attribution is carried.

### HyperFrames
- **Repository:** https://github.com/HeyGen-Official/hyperframes
- **License:** Apache License 2.0
- **Copyright:** Copyright (c) HeyGen Inc.
- **Usage:** HyperFrames (`@hyperframes/producer`, `@hyperframes/core`,
  `@hyperframes/engine`) is used as a runtime dependency for headless
  HTML-to-MP4 video rendering. Slate compiles its SCF JSON contract to a
  HyperFrames HTML composition; HyperFrames performs the capture/encode.
  Its Apache-2.0 license permits commercial use. The upstream NOTICE file
  (when present) is preserved per Apache-2.0 §4(d). "HyperFrames" and
  "HeyGen" are trademarks of their respective owners; Slate is not
  affiliated with or endorsed by HeyGen Inc.

### GSAP (GreenSock Animation Platform)
- **Repository:** https://github.com/greensock/gsap
- **License:** Standard "No Charge" license (free for most uses) — see https://gsap.com/standard-license
- **Copyright:** Copyright (c) GreenSock, Inc.
- **Usage:** GSAP is injected into HyperFrames compositions at render time
  via CDN (`cdn.jsdelivr.net/npm/gsap@3.14.2`). It powers all component
  animation timelines under `render/components/**`. GSAP is not bundled or
  redistributed by Slate — it is fetched at compile time by HyperFrames.
  As of GSAP 3.13 (Webflow, 2025) the entire library — including the
  formerly-paid plugins (SplitText, DrawSVG, MorphSVG, MotionPath, Physics2D,
  Custom* eases) — is free under the Standard "No Charge" license; Slate uses
  the core API plus these now-free plugins. Plugins requiring scroll/pointer
  interaction (ScrollTrigger, ScrollSmoother, Draggable, Observer) are excluded
  for technical reasons (incompatible with deterministic headless seek-render),
  not licensing. "GSAP" and "GreenSock" are trademarks of GreenSock, Inc.

### GSAP AI Skills (greensock/gsap-skills)
- **Repository:** https://github.com/greensock/gsap-skills
- **License:** MIT License (Copyright (c) 2026 GreenSock)
- **Usage:** A subset of the official GSAP AI skill files (gsap-core,
  gsap-timeline, gsap-performance, gsap-utils) is vendored under
  `skills/core/animation/` to provide canonical GSAP guidance to the Slate
  agent when authoring component animations. The MIT LICENSE is preserved at
  `skills/core/animation/LICENSE` per the license terms.

---

Slate-specific implementations and extensions coexist with the documented
OpenMontage lineage. Where a source-level audit identifies copied or adapted
material, the corresponding file must preserve its applicable upstream notice
and the lineage map must identify the upstream path and revision.
