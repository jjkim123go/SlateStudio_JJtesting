# Animation skills (Layer 3)

This directory contains generic animation best-practice references the Slate
agent loads when authoring or modifying components under `render/components/**`.

| File | Covers |
|------|--------|
| [basics.md](basics.md) | Tween primitives, easing, stagger, transform aliases, autoAlpha, defaults, `matchMedia` |
| [sequencing.md](sequencing.md) | Master timelines, position parameter, labels, nesting, playback control |
| [performance.md](performance.md) | Transform-only animation, `will-change`, batching, `quickTo`, render-perf hygiene |
| [value-helpers.md](value-helpers.md) | `clamp`, `mapRange`, `interpolate`, `random`, `snap`, `toArray`, `wrap`, `pipe`, `splitColor` |

## Provenance

Content is the official [greensock/gsap-skills](https://github.com/greensock/gsap-skills)
reference (MIT, © GreenSock), vendored verbatim. **Only the file names are
Slate-flavored** — the content keeps native GSAP API names because GSAP is
what HyperFrames injects and what Slate components actually call.

The MIT [LICENSE](LICENSE) is preserved here per the license terms. See
[../../../NOTICE.md](../../../NOTICE.md) and
[../../../docs/TOOL_LICENSING_INFO.md](../../../docs/TOOL_LICENSING_INFO.md)
for the full attribution and licensing posture.

## Companion Layer 2 skill

Generic animation patterns alone aren't enough — Slate's render pipeline has
specific component contracts (paused master timelines, `SCENE_DURATION`-aware
animations, transform-only inside headless capture). Those rules live in the
Layer 2 skill [`skills/core/component-authoring.md`](../component-authoring.md),
which references this directory.
