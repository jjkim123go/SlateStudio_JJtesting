# Managing usage-based billing for Microsoft 365 Copilot

## Production Notes

- **Product:** Microsoft 365 Copilot
- **Feature:** Usage-based billing and Copilot Credits
- **Classification:** Hybrid conceptual/procedural. The video explains the billing model and demonstrates the essential administrative flow without reproducing a live tenant.
- **Style:** Customer-education explainer with two synthetic product walkthroughs.
- **Audience:** Microsoft 365 administrators; Azure cost administrators are a secondary audience.
- **Assumed knowledge:** Basic familiarity with Microsoft 365 administration, Azure subscriptions, and security groups.
- **Target runtime:** 55 seconds
- **Tone:** Clear, reassuring, and authoritative.
- **Format:** 1920x1080, 30 fps, with a 1080x1920 safe crop.
- **Source grounding:** Microsoft Learn research captured in [research.md](research.md) on 2026-09-10.

## Learning Objectives

After watching, viewers should be able to:

1. Understand how a Microsoft 365 billing policy connects eligible usage to an Azure billing scope.
2. Identify how users, groups, and supported services are governed by the policy.
3. Validate a configuration without assuming that usage reports update instantly.
4. Distinguish budget alerts from controls that automatically stop consumption.

## Prerequisites And Review Flags

- Configuration requires appropriate Microsoft 365 and Azure permissions; use least privilege and verify current role requirements before deployment.
- The Microsoft 365 billing experience is evolving. Product reviewers should confirm current navigation labels before publication.
- Copilot Credit consumption varies by eligible experience and action. The video must not imply that every Copilot interaction is charged.
- Microsoft 365 and Azure cost reporting can be delayed.
- Billing-policy budgets and standard Azure budget alerts notify; they do not automatically stop usage.
- All product views are fictional, simplified, and labeled `Conceptual UI`. No live tenant was configured or tested.
- Neural narration is not currently available. Final VO requires supplied audio, Clipchamp production, or restored Azure Speech access.

## Scene Script

| Scene | Time | Purpose | Voiceover | Visual Direction | On-Screen Text | Source / Capture Notes | Review Flags |
|---|---:|---|---|---|---|---|---|
| S1 | 0:00-0:07 | Establish the value proposition. | Usage-based billing lets your organization pay for supported Copilot services and AI experiences as they're used. | Dormant Copilot service tiles activate only when a request pulse reaches them. Each activation emits a measured credit token into a restrained cost counter. | `Pay for eligible usage` | Hand-stitched conceptual animation; no product capture. | Keep `supported` and `eligible` visible. |
| S2 | 0:07-0:16 | Show the billing connection. | In Microsoft 365, create a billing policy, then connect an Azure subscription and resource group. | Simplified Microsoft 365 admin chrome enters on `Copilot > Cost management`. A new policy expands; `Subscription` and `Resource group` populate in sequence, then a connector locks into an Azure billing-scope tile. | `Connect` · `Billing policy` · `Azure subscription` · `Resource group` | Synthetic admin-center treatment based on current Microsoft Learn labels. | Review current navigation before publication. |
| S3 | 0:16-0:27 | Explain governance and the budget limitation. | Scope the policy to eligible users or groups, and connect a supported service. A budget can send alerts, but it doesn't automatically stop usage. | The policy adds a fictional security group and service. A dotted budget threshold appears; crossing it triggers an alert while the usage pulse continues beyond the line. | `Govern` · `Users or groups` · `Supported service` · `Alerts don't stop usage` | Synthetic UI with fictional names. | Budget behavior must remain explicit. |
| S4 | 0:27-0:36 | Demonstrate configuration validation. | Validate the setup with an eligible user and supported experience. Features and actions can consume different amounts of Copilot Credits. | A test user sends one simple request through the connected policy. It resolves into differently sized credit markers to show variable consumption without claiming exact rates. | `Validate` · `Consumption varies` | Conceptual validation loop; no live test claim. | Avoid exact credit quantities. |
| S5 | 0:36-0:46 | Show monitoring across Microsoft 365 and Azure. | Microsoft 365 reports show usage. Azure Cost Management adds cost analysis, forecasts, and alerts. Allow time for charges and reports to appear. | A compact Microsoft 365 Credits report reveals policy and agent rows; Azure Cost analysis grows a simple line beside `Actual cost` and `Forecast`. A clock badge settles between both surfaces. | `Observe` · `Usage` · `Actual cost` · `Forecast` · `Reporting can be delayed` | Synthetic Microsoft 365 and Azure surfaces; no customer data. | Keep latency caveat legible. |
| S6 | 0:46-0:55 | Close with prerequisites and operating model. | Before you begin, confirm the required Microsoft 365 and Azure permissions. With billing connected, scoped, and monitored, you can expand access while keeping costs visible. | Two admin-role badges verify, then three states align: a connected billing scope, a governed policy, and an observable cost signal. End on a clean title lockup. | `Connect` · `Govern` · `Observe` | Hand-stitched close. | Confirm permissions wording. |

## Production Summary

- **Estimated voiceover word count:** 123 words
- **Estimated speaking rate:** 133 words per minute over 55 seconds
- **Screen captures required:** None. Product surfaces are deterministic conceptual UI.
- **Reusable assets:** Microsoft 365 admin chrome, Azure portal chrome, Fluent icons, and a static high-contrast caption block.
- **Localization:** Keep labels separate from narration, allow text expansion, and retain product labels where Microsoft does not localize them.
- **Accessibility:** Do not rely on color alone for connected, alert, or validated states.
- **Confidence:** High for the operating model and caveats; medium-high for navigation labels because the billing experience is evolving.
