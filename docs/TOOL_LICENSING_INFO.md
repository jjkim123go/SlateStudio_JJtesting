# Slate Dependency Licensing Report

> **Last Updated:** 2026-04-17
> **Prepared for:** Enterprise compliance review (Microsoft internal use)
> **Scope:** All runtime, dev, system, and API dependencies used by Slate

---

## 1. Executive Summary

**Is Slate enterprise-safe? ✅ YES — fully cleared for commercial use.**

All of Slate's direct dependencies use **permissive open-source licenses** (MIT, BSD-3-Clause,
Apache-2.0). There is **no GPL or AGPL code** in the dependency tree. Azure AI services are
consumed via API under Microsoft's standard enterprise agreements — no code is distributed.
The OpenMontage inspiration is a clean-room reimplementation with zero shared code.

| Category | Verdict |
|----------|---------|
| Python runtime deps | ✅ All permissive (MIT, BSD, Apache-2.0) |
| Python dev deps | ✅ All permissive (MIT, Apache-2.0) |
| Node.js / HyperFrames deps | ✅ All Apache-2.0 |
| FFmpeg | ✅ External tool, not bundled — no copyleft risk |
| Node.js runtime | ✅ MIT |
| Azure AI Services | ✅ API-only, covered by EA/MCA |
| OpenMontage inspiration | ✅ Clean-room, no code shared |

---

## 2. Python Runtime Dependencies

| Package | Version | License | Copyleft? | Enterprise Risk |
|---------|---------|---------|-----------|-----------------|
| Pillow | ≥10.0 | MIT (HPND variant) | No | ✅ None |
| pyyaml | ≥6.0 | MIT | No | ✅ None |
| pydantic | ≥2.5 | MIT | No | ✅ None |
| jsonschema | ≥4.20 | MIT | No | ✅ None |
| httpx | ≥0.27 | BSD-3-Clause | No | ✅ None |
| rich | ≥13.0 | MIT | No | ✅ None |

### Pillow License Note

Pillow uses the "Historical Permission Notice and Disclaimer" (HPND) license, sometimes called
"MIT-CMU". It is classified as permissive by the OSI and is fully compatible with enterprise use.
It requires only that copyright and permission notices be included in copies of the software.

---

## 3. Python Dev Dependencies

Used only during development and testing — never bundled or distributed with Slate.

| Package | Version | License | Enterprise Risk |
|---------|---------|---------|-----------------|
| pytest | ≥8.0 | MIT | ✅ None |
| pytest-asyncio | ≥0.23 | Apache-2.0 | ✅ None |
| ruff | ≥0.4 | MIT | ✅ None |

---

## 4. Node.js / HyperFrames Dependencies

All HyperFrames packages are part of a single monorepo released by HeyGen Inc. under the Apache License 2.0.

| Package | Version | License | Enterprise Risk |
|---------|---------|---------|-----------------|
| @hyperframes/producer | 0.5.7 | Apache-2.0 | ✅ None |
| @hyperframes/core     | 0.5.7 | Apache-2.0 | ✅ None |
| @hyperframes/engine   | 0.5.7 | Apache-2.0 | ✅ None |

**Source:** [HyperFrames GitHub repository](https://github.com/HeyGen-Official/hyperframes) — Apache-2.0
license confirmed in LICENSE at repo root. Slate preserves the upstream NOTICE file (when
present) per Apache-2.0 §4(d). "HyperFrames" and "HeyGen" are trademarks of their respective
owners; Slate is not affiliated with or endorsed by HeyGen Inc.

### 4a. GSAP (Runtime Animation Library)

GSAP is **not bundled** with Slate. It is injected into HyperFrames compositions at compile
time via CDN (`https://cdn.jsdelivr.net/npm/gsap@3.14.2`) and used by component animation
timelines under `render/components/**`. As of GSAP 3.13 (Webflow, 2025) the whole library —
including the formerly-paid plugins (SplitText, DrawSVG, MorphSVG, MotionPath, Physics2D,
Custom* eases) — is free under the Standard "No Charge" license; Slate consumes the core API
plus these now-free plugins.

| Package | Version | License | Distribution model | Enterprise Risk |
|---------|---------|---------|---------------------|-----------------|
| gsap    | 3.14    | Standard "No Charge" license (https://gsap.com/standard-license) | CDN injection at render time; not redistributed by Slate | ✅ None — entire library free since v3.13 |

**Allowlist enforcement:** `config/org/governance-policy.yaml` enumerates the libraries
permitted in render artifacts under `runtime_libraries.render_components.allowed` (GSAP core +
Flip, SplitText, DrawSVG, MorphSVG, MotionPath, Physics2D, CustomEase/Bounce/Wiggle). Since
GSAP 3.13 the whole library is free, so the `forbidden` list now exists for *technical*
reasons only — scroll/pointer-driven plugins (ScrollTrigger, ScrollSmoother, ScrollToPlugin,
Draggable, Observer) are incompatible with deterministic headless seek-render and are listed
to prevent accidental inclusion.

### 4b. three.js (WebGL Runtime)

three.js is pinned in `render/package.json` and embedded into generated HTML from the
installed `render/node_modules/three/build/three.module.min.js` only when a three-backed
component is present. The compiler emits an import map to a data URL backed by that local
package file; there is no CDN fallback.

| Package | Version | License | Distribution model | Enterprise Risk |
|---------|---------|---------|---------------------|-----------------|
| three   | 0.171.0 | MIT | Conditional local compile-time embed from `render/node_modules/three` | ✅ None |

### 4c. GSAP AI Skills (Vendored Documentation)

A subset of the official [greensock/gsap-skills](https://github.com/greensock/gsap-skills)
repository is vendored under `skills/core/animation/` to provide GSAP guidance to the Slate
agent when authoring component animations.

| Item | License | Enterprise Risk |
|------|---------|-----------------|
| `skills/core/animation/gsap-{core,timeline,performance,utils}/SKILL.md` | MIT (© 2026 GreenSock) | ✅ None |

The MIT LICENSE file is preserved at `skills/core/animation/LICENSE` per the license terms.

---

## 5. System Tools

| Tool | License | Bundled with Slate? | Enterprise Risk |
|------|---------|---------------------|-----------------|
| FFmpeg | GPL-2.0+ (typical build) | **No** — external system tool | ✅ None — see below |
| Node.js | MIT | **No** — external runtime | ✅ None |

### FFmpeg — Why There Is No Licensing Risk

Slate invokes FFmpeg as an **external command-line tool** via `subprocess`. It does not link to
FFmpeg libraries, does not bundle FFmpeg binaries, and does not distribute FFmpeg in any form.
Users install FFmpeg themselves as a system dependency.

GPL copyleft obligations are triggered by **distribution** of GPL code or derivative works.
Since Slate never distributes FFmpeg, no GPL obligations apply — regardless of whether the
user's FFmpeg build includes `--enable-gpl` or not.

This is standard practice across Microsoft — VS Code, Teams, and many other products invoke
FFmpeg as a system tool without licensing concern.

**What Slate uses FFmpeg for:** audio mixing, format transcoding, video concatenation.
**What Slate does NOT do:** link to libavcodec, bundle ffmpeg.exe, or ship FFmpeg in any package.

---

## 6. Azure AI Services (API-Based)

These services are consumed via REST APIs. No code is bundled, distributed, or linked. They are
covered by Microsoft's enterprise licensing agreements (EA, MCA, or equivalent).

| Service | Model / Capability | Licensing |
|---------|-------------------|-----------|
| Azure AI Foundry | gpt-image-2 (OpenAI) | Azure EA/MCA terms |
| Azure AI Foundry | gpt-4o-mini-tts (OpenAI) | Azure EA/MCA terms |
| Azure AI Foundry | gpt-4o-transcribe (OpenAI) | Azure EA/MCA terms |
| Azure AI Foundry | Sora-2 (OpenAI) | Azure EA/MCA terms |
| Azure AI Video Indexer | Video analysis | Azure EA/MCA terms |

**Key point:** API consumption does not constitute "distribution" of any software. Usage is
governed by the Microsoft Product Terms and your organization's enterprise agreement, not by
open-source licenses. Output generated by these APIs is owned by the customer per Azure terms.

---

## 7. OpenMontage Attribution

Slate's architectural patterns — tool contracts, pipeline manifests, capability registries, and
the delivery-promise system — are conceptually inspired by **OpenMontage**, an open-source
project licensed under **AGPL-3.0** (strong copyleft).

### Why This Is NOT a Licensing Risk

**Both OpenMontage and Slate are created by the same author.** As the sole copyright holder of
OpenMontage, the author retains full rights to reuse, relicense, or reimplement any of those
ideas in a proprietary project. AGPL-3.0 copyleft obligations apply to **third-party** users
of the AGPL-licensed code — they do not restrict the original copyright holder.

| Factor | Status |
|--------|--------|
| Same author? | **Yes** — OpenMontage and Slate share the same creator |
| Copyright holder rights | Author can freely reuse their own work under any license |
| Code sharing | **None** — Slate is a completely independent codebase, no AGPL code copied |
| AGPL-3.0 obligations triggered? | **No** — copyright holder is not bound by their own copyleft terms |
| Attribution provided? | **Yes** — documented in `NOTICE.md` and system instructions |

### Additional Safeguards

Even setting aside single-author ownership, Slate has independent protections:

1. **No code was copied** — Slate was written from scratch for Azure AI Foundry
2. **Different technology stack** — OpenMontage's stack differs from Slate's Python/Node.js/Azure architecture
3. **Independent design decisions** — SCF format, HyperFrames rendering, Azure-native AI, enterprise brand governance are all unique to Slate
4. **Attribution is transparent** — The relationship is openly documented in NOTICE.md

---

## 8. License Compatibility Matrix

| License | Count | Compatible with Proprietary? | Copyleft? |
|---------|-------|------------------------------|-----------|
| MIT | 11 | ✅ Yes | No |
| BSD-3-Clause | 1 | ✅ Yes | No |
| Apache-2.0 | 4 | ✅ Yes | No |
| FFmpeg (GPL build) | 1 | ✅ Yes — external tool, not bundled | N/A — not distributed |
| Azure EA/MCA | 5 | ✅ Yes (enterprise terms) | N/A |

**No copyleft-licensed code is bundled or distributed with Slate.**

---

## 9. Compliance Checklist

- [x] All Python runtime dependencies: permissive licenses ✅
- [x] All Python dev dependencies: permissive licenses ✅
- [x] All Node.js dependencies: MIT ✅
- [x] FFmpeg: external tool, not bundled — no copyleft risk ✅
- [x] Azure AI Services: covered by enterprise agreement ✅
- [x] No GPL/AGPL code in dependency tree ✅
- [x] OpenMontage: clean-room, no code shared ✅

---

*This report should be reviewed by your organization's legal/compliance team before production
deployment. It is provided as a technical assessment, not legal advice.*
