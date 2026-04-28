# NOTICE — Third-Party Inspiration & Attribution

Slate is an independent, proprietary Microsoft project. No code has been
forked, copied, or derived from any open-source repository.

## Architectural Inspiration

Slate's design draws conceptual inspiration from the following open-source
project:

### OpenMontage
- **Repository:** https://github.com/calesthio/OpenMontage
- **License:** GNU Affero General Public License v3.0 (AGPL-3.0)
- **Author:** the original author
- **Relationship:** Slate's author is also the creator of OpenMontage.
  Architectural patterns (tool contracts, pipeline manifests, capability
  registries, delivery-promise classification) were reimagined for
  enterprise use — no source code was reused.

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
  via CDN (`cdn.jsdelivr.net/npm/gsap@3.12.5`). It powers all component
  animation timelines under `render/components/**`. GSAP is not bundled or
  redistributed by Slate — it is fetched at compile time by HyperFrames.
  Slate uses only the free core API and does not depend on Club GSAP plugins.
  "GSAP" and "GreenSock" are trademarks of GreenSock, Inc.

### GSAP AI Skills (greensock/gsap-skills)
- **Repository:** https://github.com/greensock/gsap-skills
- **License:** MIT License (Copyright (c) 2026 GreenSock)
- **Usage:** A subset of the official GSAP AI skill files (gsap-core,
  gsap-timeline, gsap-performance, gsap-utils) is vendored under
  `skills/core/animation/` to provide canonical GSAP guidance to the Slate
  agent when authoring component animations. The MIT LICENSE is preserved at
  `skills/core/animation/LICENSE` per the license terms.

---

All Slate source code is original work. Where design patterns parallel those
found in OpenMontage, this reflects shared authorship and common problem-solving
in the agentic video production domain — not code derivation.
