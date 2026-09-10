# Managing usage-based billing for Microsoft 365 Copilot

## Intent

Create a 50-60 second customer-education video for Microsoft 365
administrators, with Azure cost administrators as a supporting audience. The
viewer should understand the operating model for usage-based Copilot billing:
connect an Azure billing scope, govern eligible users and services with a
billing policy, validate activity, and monitor Copilot Credit usage and cost.
The project slug is `m365-copilot-usage-based-billing`.

## Capability scan

- Brand package: not found.
- User-supplied media: script text found; no logo, footage, narration, or music.
- HyperFrames rendering: available locally through Slate's SCF-to-HTML renderer
  and `@hyperframes/producer`.
- Microsoft 365 admin chrome: `AdminCenterScene` found; project-specific billing
  content is required because the stock component targets users and compliance.
- Azure chrome: `AzurePortalScene` found; project-specific Cost analysis content
  is required for the simplified view.
- Image generation: unavailable. It is not needed because product UI must be
  deterministic rather than generated.
- Natural neural narration: unavailable (`azure_speech_tts` and `foundry_tts`
  are not callable). Local Windows TTS is available but lower quality.
- Transcription: unavailable. Static high-contrast captions can still be timed
  from an approved narration track or supplied timing data.
- Brand music library: not found.
- Organization music library: not found.
- Built-in Slate music library: found with 13 tracks.

## Research grounding

Research is captured in [research.md](research.md). The load-bearing findings
are:

- Copilot Credits meter supported usage-based experiences; not every Copilot
  interaction necessarily creates a usage charge.
- The durable billing model is policy plus Azure subscription/resource group,
  user or group scope, optional budget, and a connection to a supported service.
- Microsoft 365 and Azure permissions are both required.
- Usage and cost are visible through Microsoft 365 reports and Microsoft/Azure
  Cost Management, but reporting is not instantaneous.
- Budget alerts notify. They do not automatically stop consumption.

Primary sources:

- https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-overview-copilot-credits
- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/overview
- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/setup
- https://learn.microsoft.com/en-us/microsoft-365/commerce/services/pay-as-you-go-setup-copilot
- https://learn.microsoft.com/en-us/microsoft-365/admin/activity-reports/microsoft-365-copilot-credits
- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/view-cost
- https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/overview-cost-management
- https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets

## Treatment

Use an explainer spine with two concise walkthrough moments. One fictional admin
starts with an eligible Copilot experience that has no billing path, creates a
policy that connects a fictional Azure subscription and security group, then
sees test activity become visible as Copilot Credits and cost. The before state
is ungoverned access; the after state is connected, scoped, and observable.

The UI will be deliberately simplified but recognizable. Microsoft 365 scenes
use stable admin-center chrome with only the controls needed for `Copilot > Cost
management`; Azure scenes use stable portal chrome with a compact Cost analysis
view and a budget alert. Every interaction will visibly change state. The
prototype will be labeled `Conceptual UI` and use fictional values.

Before authoring the complete scene set, build and locally test one
representative Microsoft 365 billing-policy scene end to end. The test must
verify readable labels at 1920x1080 and 1080x1920 safe crops, stable chrome,
policy-state transitions, and deterministic HyperFrames frame capture. Only
after that proof passes should the Azure view and remaining scenes be built.

## Constraints

- Content classification: hybrid conceptual/procedural.
- Audience: Microsoft 365 administrators; secondary Azure cost administrators.
- Runtime: 50-60 seconds.
- Output: 1920x1080, 30 fps, H.264.
- Brand: Microsoft-adjacent Fluent visual language without claiming pixel-exact
  product reproduction.
- UI: super simplified conceptual product surfaces; no AI-generated UI images.
- Data: fictional tenant and cost data only; no PII.
- Captions: static, high-contrast blocks by default.
- Music: quiet built-in technology bed, subject to scene-plan approval.
- Voice: do not use lower-quality Windows TTS for final delivery without user
  approval; prefer user-supplied/Clipchamp audio or Azure Speech if it becomes
  available.
- Budget: $100 project ceiling; no paid calls are currently available or
  proposed.
- Governance: no rendering, paid generation, publishing, or Azure resource
  changes before explicit approval.

## Proposed next step

After brief approval, refine the supplied narration with the Video Script
Producer contract, including production notes, learning objectives, exact
voiceover, visual guidance, review risks, and `script-package.json`. Then present
the script for a separate comprehension review before any UI prototype or
render.