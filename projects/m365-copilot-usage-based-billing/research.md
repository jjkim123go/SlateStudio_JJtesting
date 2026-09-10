# Research: Microsoft 365 Copilot usage-based billing

Research date: 2026-09-10

## Scope

This research supports a short customer-education video for Microsoft 365
administrators. The video explains the durable operating model rather than a
pixel-exact tutorial: connect billing, govern access and spending, then observe
usage and cost.

## Verified facts

### 1. Copilot Credits and eligible experiences

- Copilot Credits are a common usage currency for eligible Microsoft services
  with usage-based billing. The newer Microsoft 365 admin-center Cost management
  experience supports services such as Cowork, apps built with Cowork, and the
  Work IQ API. Microsoft says more services will be added over time.
- Microsoft Copilot Chat, SharePoint agents, and the Microsoft Copilot Retrieval
  API (preview) use the Copilot pay-as-you-go path documented separately.
- For Copilot Chat extensibility, whether Copilot Credit charges apply depends
  on the user's license and what the agent does. Shared tenant data access can
  create metered consumption; instructions-only or public-site-grounded agents
  do not necessarily create extra usage charges.

Sources:

- https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-overview-copilot-credits
- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/overview
- https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/cost-considerations

Confidence: High. Product scope is evolving, so the video should say
"supported services and eligible AI experiences" rather than imply that every
Copilot feature uses Copilot Credits.

### 2. Billing setup is a connection plus a policy

- Pay-as-you-go setup requires a Microsoft 365 administrator to associate an
  Azure subscription and resource group with a billing policy.
- The documented Microsoft 365 path includes policy name, Azure subscription,
  resource group, region, user or group scope, and an optional budget.
- Creating the billing policy does not complete setup. The policy must be
  connected to a supported Copilot service.
- Current Microsoft guidance places the entry point under `Copilot > Cost
  management`; the classic flow remains available from the banner and includes
  Billing policies and Pay-as-you-go services.

Sources:

- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/setup
- https://learn.microsoft.com/en-us/microsoft-365/commerce/services/pay-as-you-go-setup-copilot
- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/overview

Confidence: High. The UI is in transition, so the video will use simplified
conceptual chrome and show the stable nouns, not reproduce every control.

### 3. Permissions are required in both systems

- Microsoft documents Billing Administrator, AI Administrator, or Global
  Administrator as roles that can configure Copilot pay-as-you-go. Global
  Reader has read-only visibility in the overview guidance.
- Setup also requires an Azure subscription and resource group in the same
  tenant, with Owner or Contributor rights for the Azure subscription and
  resource group.
- Microsoft recommends least privilege and limiting Global Administrator use.

Sources:

- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/setup
- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/overview
- https://learn.microsoft.com/en-us/microsoft-365/commerce/services/pay-as-you-go-setup-copilot

Confidence: High.

### 4. Usage and cost can be monitored in Microsoft 365 and Azure

- The Microsoft 365 Copilot Credits report can show total credits and usage by
  user, agent, billing policy, and user-agent pair for supported metered agent
  activity.
- The report path is `Reports > Usage > Microsoft Copilot > Credits`.
- Microsoft 365 pay-as-you-go cost can also be viewed under `Billing > Cost
  management`; Microsoft documents Azure Cost Management as an additional cost
  analysis surface.
- Microsoft documents the `m365copilotchat` tag as one way to filter accumulated
  Copilot Chat cost in Azure Cost Management.

Sources:

- https://learn.microsoft.com/en-us/microsoft-365/admin/activity-reports/microsoft-365-copilot-credits
- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/view-cost
- https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/overview-cost-management

Confidence: High for the named reports and navigation. The conceptual video
will avoid fabricated customer totals or claims that all usage appears
immediately.

### 5. Reporting has latency and budgets are not automatic stop controls

- Microsoft says Copilot pay-as-you-go amounts can take up to 24 hours to appear
  in Azure Cost Management.
- Azure says cost and usage data is typically available within 8-24 hours for
  EA and MCA subscriptions and can take up to 72 hours for pay-as-you-go
  subscriptions.
- Microsoft 365 billing-policy budgets and ordinary Azure budget alerts notify
  recipients; they do not, by themselves, stop service consumption.
- Azure budgets can use actual or forecast thresholds. Automated action groups
  are a separate capability available at supported Azure scopes.

Sources:

- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/view-cost
- https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data
- https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets
- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/setup

Confidence: High. The script must not say that a budget automatically blocks
Copilot usage.

### 6. Microsoft provides a configuration test

- Microsoft recommends having an eligible pay-as-you-go user ask a simple
  prompt of a supported test agent, then confirming the resulting activity in
  the Copilot Credits report.
- The video should portray this as a conceptual validation loop, not claim that
  this workspace tested a live customer tenant. No tenant changes were made.

Sources:

- https://learn.microsoft.com/en-us/microsoft-365/copilot/pay-as-you-go/setup
- https://learn.microsoft.com/en-us/microsoft-365/admin/activity-reports/microsoft-365-copilot-credits

Confidence: High.

## UI reference findings

The Microsoft documentation supports these stable labels for the simplified
prototype:

- Microsoft 365: `Copilot`, `Cost management`, `Billing policies`,
  `Pay-as-you-go services`, `Subscription`, `Resource group`, `Region`,
  `Users and groups`, `Budget`, `Connected`.
- Reporting: `Overview`, `Consumption`, `Reports`, `Usage`, `Credits`.
- Azure: `Cost Management`, `Cost analysis`, `Scope`, `Services`, `Budget`,
  `Actual cost`, `Forecast`, `Alerts`.

The prototype will use fictitious tenant, group, subscription, resource-group,
and cost values. It will not display personal information or a real customer
environment.

## Script implications

- Keep the supplied opening and closing idea, but replace the broad phrase
  "AI services" with "supported Copilot services and AI experiences."
- Explain that the billing policy connects an Azure billing scope, a user or
  group scope, and a supported service.
- Describe Copilot Credit consumption as variable by experience and action.
- Say budget alerts provide visibility; do not imply they enforce a hard stop.
- Include a short configuration-validation beat and the reporting-latency
  caveat in on-screen text or end matter.