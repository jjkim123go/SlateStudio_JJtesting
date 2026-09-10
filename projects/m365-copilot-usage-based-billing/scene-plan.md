# Scene Plan: Managing usage-based billing for Microsoft 365 Copilot

## Direction

The video uses restrained conceptual product UI throughout. Each scene shows one billing action and its direct result. Decorative headings, ledger metaphors, rotated stamps, moving numbered tokens, and the black-and-coral reconciliation cross are excluded. S2 remains unchanged because the user approved it.

Every product surface carries a visible `Conceptual UI` marker. All tenant, group, subscription, resource-group, usage, and cost values are fictional.

## Scene Map

| Scene | Time | Primary Subject | Technique | Visual Progression | Product / Source Grounding |
|---|---:|---|---|---|---|
| S1 | 0:00-0:07 | Eligible usage being counted | Minimal service symbols and a usage meter | Keep only `Pay for eligible usage`. Three service symbols activate in sequence and the meter records three corresponding usage events. No labels, register terminology, or decorative marks appear. | Copilot Credits apply to supported services and eligible experiences; no exact rate shown. |
| S2 | 0:07-0:16 | Billing-policy drawer | Project-scoped Microsoft 365 admin chrome | Enter on `Copilot > Billing & usage`. Select `Billing policies`, open `Add a billing policy`, then populate fictional `Azure subscription` and `Resource group` fields. A firm `Connected` stamp confirms the state. | Current Microsoft Learn setup path and labels, reviewed 2026-09-10. This is the representative prototype scene. |
| S3 | 0:16-0:27 | Budget threshold and continuing usage | Simplified billing-policy chart | Group and supported-service fields confirm. Usage events appear in visible order from `01` through `07`. Events `05` through `07` continue after the threshold and alert notification. | Microsoft explicitly states budgets trigger notifications but do not prevent usage beyond the amount. |
| S4 | 0:27-0:36 | One configuration test | Simplified test-and-result surface | A fictional eligible user sends a simple prompt through a connected billing policy. An illustrative result panel then shows different relative consumption for a feature and an action, without exact rates. | Conceptual version of Microsoft’s documented eligible-user test; no live tenant claim and no quoted credit amount. |
| S5 | 0:36-0:46 | Microsoft 365 usage and delayed Azure cost | Two aligned conceptual product surfaces | The Microsoft 365 Copilot Credits report appears first. A centered horizontal handoff explicitly says reporting can take time. Azure Cost Management then appears with actual-cost and forecast views. | Microsoft 365 Credits reporting plus Azure Cost Analysis concepts. Reporting-delay caveat remains on screen. |
| S6 | 0:46-0:55 | Permissions and operating steps | Aligned cards and connectors | Microsoft 365 and Azure permissions confirm, followed by three simple cards: `Connect`, `Govern`, and `Observe`. End on `Expand access. Keep costs visible.` | Least-privilege prerequisite and the approved operating model. |

## Representative UI Proof

Build only S2 first as `projects/m365-copilot-usage-based-billing/components/BillingPolicyScene/`.

The proof must demonstrate:

1. Recognizable Microsoft 365 admin-center chrome with `Copilot > Billing & usage` and `Billing policies` selected.
2. A simplified drawer that visibly changes from empty to populated subscription and resource-group fields.
3. A `Connected` confirmation that uses text, icon, and shape rather than color alone.
4. Frozen, local Fluent SVG icons sourced from Microsoft’s official repository or equivalent clean-room geometry when no icon is needed.
5. Deterministic HyperFrames capture at early, mid, and late frames with no autoplay or independent animation clock.
6. Legible 1920x1080 output and an intentional 608-pixel centered portrait-safe column for a 1080x1920 crop.
7. No text below 24px in the video frame, no clipped labels, and contrast of at least 4.5:1.

Only after this proof passes frame capture and visual review should S3-S6 be authored.

## Transition And Layer Plan

- **Transitions:** restrained opacity and position changes inside scenes; no decorative page or ledger effects.
- **Captions:** static high-contrast blocks, positioned to avoid UI fields and short scene headlines.
- **Music:** select one restrained built-in technology track after the UI proof; bake a 55-second loop with fades and narration ducking.
- **Voiceover:** source remains unresolved. Do not create final timings or narration assets until supplied/Clipchamp audio is available or Azure Speech becomes callable.
- **Icons:** Microsoft Fluent UI System Icons plain SVG source: https://github.com/microsoft/fluentui-system-icons

## Review Risks

- Microsoft 365 navigation is evolving. Confirm labels immediately before publication.
- The video spans both the newer Copilot Credits model and classic pay-as-you-go concepts; avoid implying every Copilot action uses the same billing path.
- Budget alerts must never look like an automatic stop control.
- Azure forecast is a projection, not a guarantee.
- Reporting can be delayed; the animation must not imply immediate financial posting.
- No screen recording or live tenant validation is claimed.
