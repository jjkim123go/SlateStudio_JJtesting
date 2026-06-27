# Slate — Example Use Cases by Role

> **Who is this for?** Anyone at Microsoft who routinely turns information
> into video — and many who *don't yet*, because today's tools make it too
> expensive. Slate compresses "draft a 90-second video" from a multi-day,
> multi-vendor effort into a chat session with your coding assistant.
>
> **What it does.** You describe what you want, optionally drop in a deck or
> doc, and Slate handles script, visuals, narration, captions, brand
> compliance, review, and final MP4. You stay in control through approval
> gates at every stage.
>
> **What's enforced for you.** Brand colors, fonts, logos, and disclaimers.
> Cost caps. Content safety. Audit trail. Locked elements. Demo-data
> classification for external vs internal delivery profiles.

> **Note on the `Components` columns (2026 doctrine).** These name the *content*
> each video conveys, not a fixed recipe. Product-chrome surfaces (`VSCodeScene`,
> `OutlookScene`, `AzurePortalScene`, …) are still reused as named. But design /
> explanatory visuals (charts, diagrams, steps, metrics — `MetricsCard`,
> `DataFlow`, `StepByStep`, `Roadmap`, …) are now **hand-stitched per video** under
> a committed art direction, not filled from a fixed catalog component. Read those
> design-component names as *what the scene shows*, not a prescription. See
> [`skills/creative/scene-primitives.md`](../skills/creative/scene-primitives.md).

This document maps Slate's capabilities to concrete roles, the kinds of
videos they produce today (often painfully, or not at all), and the impact
Slate has on each.

---

## Table of Contents

- [Slate — Example Use Cases by Role](#slate--example-use-cases-by-role)
  - [Table of Contents](#table-of-contents)
  - [How to Read This Document](#how-to-read-this-document)
  - [1. Engineering \& Product](#1-engineering--product)
    - [1.1 PMs and Product Marketing Managers](#11-pms-and-product-marketing-managers)
    - [1.2 Engineering Managers and Tech Leads](#12-engineering-managers-and-tech-leads)
  - [2. Customer Success, FastTrack \& CSAs](#2-customer-success-fasttrack--csas)
  - [3. Sales \& Solution Engineering](#3-sales--solution-engineering)
  - [4. Field Marketing \& Product Marketing](#4-field-marketing--product-marketing)
  - [5. Internal Communications \& Employee Experience](#5-internal-communications--employee-experience)
  - [6. Learning, Training \& Readiness](#6-learning-training--readiness)
  - [7. Security, Compliance \& Risk](#7-security-compliance--risk)
  - [8. Finance \& Operations](#8-finance--operations)
  - [9. Executive \& Leadership Communications](#9-executive--leadership-communications)
  - [10. Research, Analyst Relations \& Public Speaking](#10-research-analyst-relations--public-speaking)
  - [11. Support \& Customer Service](#11-support--customer-service)
  - [12. HR, People \& Recruiting](#12-hr-people--recruiting)
  - [13. Cross-Cutting Patterns](#13-cross-cutting-patterns)
    - [13.1 "Turn this deck into a video"](#131-turn-this-deck-into-a-video)
    - [13.2 "Re-cut for a different audience"](#132-re-cut-for-a-different-audience)
    - [13.3 "Make the demo without recording the demo"](#133-make-the-demo-without-recording-the-demo)
    - [13.4 "Pin to a specific brand version for legal review"](#134-pin-to-a-specific-brand-version-for-legal-review)
    - [13.5 "Generate evidence I can show an auditor"](#135-generate-evidence-i-can-show-an-auditor)
    - [13.6 "Stay under budget"](#136-stay-under-budget)
    - [13.7 "Keep a human in the loop"](#137-keep-a-human-in-the-loop)
  - [14. What Slate Is *Not* For](#14-what-slate-is-not-for)
  - [Summary — The Common Thread](#summary--the-common-thread)

---

## How to Read This Document

Each role section follows the same structure:

- **Who** — the audience.
- **Pain today** — why this content is hard to produce now.
- **What Slate produces** — concrete video formats, with components used.
- **Impact** — measurable outcomes.
- **Example prompt** — what you'd actually type into your coding assistant.

The components referenced (`TitleCard`, `AzurePortalScene`, `ComplianceBadgeWall`,
etc.) are documented in [`ARCHITECTURE.md` §11](./ARCHITECTURE.md#11-hyperframes-component-library).
The pipeline gates (script approval, scene-plan approval, P6 review) are
historically documented in [`ARCHITECTURE.md` §8](./ARCHITECTURE.md). The
pipeline state machine has since been replaced by an agentic playbook — see
[`skills/meta/production-loop.md`](../skills/meta/production-loop.md) and the
mixable directors under [`skills/directors/`](../skills/directors/).

---

## 1. Engineering & Product

### 1.1 PMs and Product Marketing Managers

**Who:** PMs shipping features or running programs across multiple teams.

**Pain today:**
- Status updates live in 60-slide Word/PPT decks nobody reads end-to-end.
- Customer videos require a producer, an editor, and 3 weeks of lead time.
- Roadmap reviews drift across email threads, Loop, and Teams chats.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Sprint demo recap** | 60–90 s | `TitleCard`, `MetricsCard`, `VSCodeScene`, `AnimatedCaption`, `BrandOutro` | "Summarize the demos in this sprint review deck as a 90s video for the broader org." |
| **Roadmap walkthrough** | 2–3 min | `TitleCard`, `Roadmap` (Phase II), `OKRStatus`, `MetricsCard` | "Turn this Q3 plan into a 2-minute roadmap video for partner teams." |
| **Feature reveal** | 30–60 s | `BrandIntro`, `AzurePortalScene`/`PowerBIScene`, `CalloutBox`, `CTABlock` | "Show how the new Cost Management drilldown works in 45 seconds for the launch tweet." |
| **Release notes video** | 60 s | `TitleCard`, `StepByStep`, `CodeWalkthrough`, `BrandOutro` | "Convert RELEASE_NOTES.md for v2.4 into a release video." |

**Impact:**
- Sprint review attendance becomes optional — async video gets full
  coverage.
- Eng-to-marketing handoff time drops from weeks to hours.
- Brand compliance is automatic: logos, disclaimers, locked elements all
  enforced (see [§14 Brand System](./ARCHITECTURE.md#14-brand-system)).

### 1.2 Engineering Managers and Tech Leads

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Architecture explainer** | 2 min | `TitleCard`, `ArchitectureDiagram`, `DataFlow`, `CalloutPin` | "Explain this system design doc as a 2-minute architecture overview." |
| **Postmortem walkthrough** | 90 s | `TitleCard`, `AuditTrail`, `LogReplay` (Phase II), `MetricsCard` | "Summarize this incident retro for the broader division." |
| **Onboarding for new hire**| 3 min | `TitleCard`, `VSCodeScene`, `TerminalScene`, `StepByStep`, `GitHubScene` | "Make a 3-minute 'how our team works' video from this onboarding doc." |

**Impact:** Architecture knowledge stops dying with the original author.
Postmortems get watched, not just filed. New hires ramp faster.

---

## 2. Customer Success, FastTrack & CSAs

**Who:** Customer Success Account Managers, FastTrack engineers, Cloud
Solution Architects.

**Pain today:**
- Each customer wants their own personalized walkthrough.
- Producing a 5-minute custom video for one customer requires 1–2 days of
  effort that doesn't scale.
- Generic enablement videos don't reflect the customer's specific tenant,
  configuration, or industry.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Personalized adoption playbook** | 3–5 min | `BrandIntro` (co-branded), `CustomerStory` (Phase II), `MetricsCard`, `AzurePortalScene`, `StepByStep`, `CTABlock` | "Build a 3-minute adoption video for Contoso based on their last QBR deck and the M365 Copilot playbook." |
| **Configuration walkthrough** | 90 s | `TitleCard`, `AdminCenterScene`, `StepByStep`, `CalloutBox` | "Walk Acme Corp through enabling Conditional Access policies — show their tenant name." |
| **Health check report** | 2 min | `TitleCard`, `MetricsCard`, `SystemHealth` (Phase II), `ComplianceBadgeWall` | "Turn this Azure Advisor export into a 2-minute health summary for the customer's CTO." |
| **Quarterly business review** | 5 min | `BrandIntro`, `MetricsCard`, `OKRStatus`, `CustomerStory`, `Roadmap`, `BrandOutro` | "Make our Q3 QBR video for Fabrikam from these slides and last quarter's notes." |

**Impact:**
- A CSAM can deliver **personalized** video to every account in their book
  of business — not just the top 5.
- Co-branded `BrandIntro`/`BrandOutro` scales (provide the customer's logo
  via brand-package override).
- All customer-facing video flows through `external` deliveryProfile, which
  hard-blocks demo data and requires brand-package pinning
  ([§9.6](./ARCHITECTURE.md#96-delivery-profiles)).

---

## 3. Sales & Solution Engineering

**Who:** AEs, SEs, Specialists, Industry Advisors.

**Pain today:**
- Pre-call research lives in CRM, partner sites, news, and 10-K filings.
- "Send me something I can show my CIO" becomes a 4-day fire drill.
- Pricing/competitive content drifts out of date the moment it's recorded.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Discovery brief** | 60 s | `TitleCard`, `MetricsCard`, `Quote`, `CompetitiveMatrix` (Phase II) | "Brief me on Contoso's cloud spend and Azure footprint as a 60s video." |
| **Solution pitch** | 90 s | `BrandIntro`, `CustomerStory` (Phase II), `ROICalculator` (Phase II), `PricingTable` (Phase II), `CTABlock` | "Build a 90s 'why Azure for SAP' video targeted at retail CIOs." |
| **Competitive battle card** | 60 s | `TitleCard`, `CompetitiveMatrix`, `MetricsCard`, `Disclaimer` (Phase II) | "Turn this Azure-vs-AWS battle card into a 60s video — internal use only." |
| **Tech demo for CIO**| 2 min | `TitleCard`, `AzurePortalScene`, `FabricScene`, `PowerBIScene`, `LowerThird`, `BrandOutro` | "Demo OneLake → Power BI for a healthcare CIO in 2 minutes." |
| **Industry POV** | 90 s | `TitleCard`, `MapHeatmap` (Phase II), `Quote`, `MetricsCard`, `CustomerStory` | "Make a 90-second industry POV video for a CFO in financial services." |

**Impact:**
- Win rate uplift: video-first follow-ups get higher engagement than PDF
  attachments.
- Personalization at scale: each AE has 50+ accounts; Slate makes it
  feasible to brief on each one.
- Compliance built in: pricing/competitive content goes through
  `Disclaimer` and demo-data classification automatically.

---

## 4. Field Marketing & Product Marketing

**Who:** Product marketers, field marketers, partner marketing.

**Pain today:**
- Localizing a single 90s asset into 8 languages with brand compliance is a
  6-week project.
- Re-cutting a customer story for different verticals/regions costs
  $5–15K each.
- Webinar promotion videos get done by the agency at premium rates.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Webinar promo** | 30–45 s | `BrandIntro`, `EventBranding` (Phase II), `Quote`, `CTABlock`, `BrandOutro` | "Build a 30s teaser for next Thursday's Fabric webinar." |
| **Localized customer story** | 90 s | `BrandIntro`, `CustomerStory`, `MetricsCard`, `MapHeatmap`, `BrandOutro` | "Re-cut the Maersk customer story for Latin America in Brazilian Portuguese." |
| **Launch sizzle reel** | 60 s | `TransitionWipe`, `TitleCard`, multiple `*Scene` mockups, `MetricsCard`, `CTABlock` | "Turn the Ignite keynote highlights into a 60s sizzle reel." |
| **Partner co-marketing** | 90 s | Co-branded `BrandIntro` (two logos), `CustomerStory`, `BrandOutro` | "Make a 90s co-marketing video with Accenture for retail clients." |
| **Vertical adaptation** | 60 s | Same scene plan, different brand pack + voice + asset prompts | "Adapt the healthcare AI video for the financial services vertical." |

**Impact:**
- Localization cost drops by an order of magnitude — re-render with a
  different `voice` and translated narration; visuals stay the same.
- A/B testing becomes affordable: render 3 variants of the same scene
  plan and measure.
- Brand violations stop happening: locked elements (`logo`,
  `primary_color`) cannot be silently overridden ([§14.1](./ARCHITECTURE.md#141-brand-package-shape)).

---

## 5. Internal Communications & Employee Experience

**Who:** Internal comms, employee comms, HR comms, change management.

**Pain today:**
- All-hands recordings are 60 minutes nobody re-watches.
- Policy updates land in email and get ignored.
- Org changes get announced via Word doc.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **All-hands recap** | 90 s | `TitleCard`, `MetricsCard`, `Quote`, `OKRStatus`, `BrandOutro` | "Turn the CEO Q&A from yesterday's all-hands into a 90-second recap." |
| **Policy update** | 60 s | `TitleCard`, `PolicyEnforcement`, `StepByStep`, `Disclaimer`, `CTABlock` | "Communicate the new travel policy as a 60s video for all employees." |
| **Org change announcement** | 60 s | `BrandIntro`, `TeamGrid` (Phase II), `Quote`, `BrandOutro` | "Announce the new EVP and the team realignment in a 60s video." |
| **Wellness / culture moment** | 45 s | `TitleCard`, `Quote`, `AnimatedCaption`, gentle music | "Make a Mental Health Awareness week message from this Yammer post." |
| **Benefits enrollment reminder** | 60 s | `TitleCard`, `StepByStep`, `MetricsCard`, `CTABlock` | "Turn the open-enrollment FAQ into a 60s reminder video." |

**Impact:**
- Internal video completion rates run 3–5× email open rates.
- Comms team can produce **multiple** versions for different time zones,
  audience segments, or languages without scaling headcount.
- Employee `internal` deliveryProfile lets demo data through with warnings,
  speeding turnaround vs `external`.

---

## 6. Learning, Training & Readiness

**Who:** MS Learn, Training & Certification, Field Readiness, internal L&D.

**Pain today:**
- Course modules require a video team, voice talent, and a 3-month cycle.
- Updating a single product screen means re-recording the entire module.
- Internationalization is prohibitively expensive.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Microlearning module** | 2–3 min | `TitleCard`, `StepByStep`, `*Scene` (Azure/Teams/Excel), `Quiz` (Phase II), `CTABlock` | "Build a 3-minute lesson on Conditional Access from this MS Learn page." |
| **Certification prep** | 5 min | `TitleCard`, `TerminologyCard` (Phase II), `CodeWalkthrough`, `Quiz`, `ProgressBar` (Phase II) | "Make an AZ-104 exam prep video covering Network Security Groups." |
| **Tool training** | 90 s | `TitleCard`, `VSCodeScene`/`AdminCenterScene`, `StepByStep`, `BrandOutro` | "Train new hires on logging into the engineering portal — show the actual UI." |
| **Compliance training** | 90 s | `TitleCard`, `PolicyEnforcement`, `ComplianceBadgeWall`, `Disclaimer`, `Quiz` | "Annual data-handling training video — must include legal disclaimer." |

**Impact:**
- Course refresh becomes a re-render, not a re-shoot.
- Localized variants in 20 languages from one scene plan.
- Quiz interactions and progress markers embedded as components, so the
  content isn't a passive watch.

---

## 7. Security, Compliance & Risk

**Who:** Security engineers, GRC, compliance officers, risk managers.

**Pain today:**
- Threat briefings are dense PDFs nobody reads in time.
- Audit findings get communicated via spreadsheet.
- Compliance training is the most-skipped content in the company.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Threat advisory** | 60 s | `TitleCard`, `ThreatModel` (Phase II), `DataFlow`, `AuditTrail`, `Disclaimer` | "Brief the org on this CVE in 60s — include MITRE ATT&CK mapping." |
| **Audit findings briefing** | 2 min | `BrandIntro`, `ComplianceBadgeWall`, `AuditTrail`, `MetricsCard`, `CTABlock` | "Summarize the SOC 2 audit findings for the engineering org." |
| **Policy enforcement explainer** | 90 s | `TitleCard`, `PolicyEnforcement`, `StepByStep`, `BrandOutro` | "Explain the new DLP rollout — what changes for end users." |
| **Incident retrospective** | 2 min | `TitleCard`, `AuditTrail`, `DataFlow`, `MetricsCard`, `Disclaimer` | "Turn the post-incident report into a 2-minute leadership briefing." |
| **Regulatory update** | 60 s | `TitleCard`, `Disclaimer`, `StepByStep`, `ComplianceBadgeWall` | "Communicate the DORA implications for our EU customers." |

**Impact:**
- The `regulated` deliveryProfile enforces brand pinning, hashed assets,
  data-residency checks, and full content-safety audits — automatic
  evidence for SOC 2 / ISO / FedRAMP reviews
  ([§9.6](./ARCHITECTURE.md#96-delivery-profiles)).
- The `ComplianceBadgeWall`, `AuditTrail`, `DataFlow`, and
  `PolicyEnforcement` components were built specifically for this audience
  ([§11.1](./ARCHITECTURE.md#111-the-37-components-phase-i-complete)).
- Every video has a complete `production_trace.json` audit DAG — useful in
  compliance proceedings.

---

## 8. Finance & Operations

**Who:** Finance controllers, FP&A, Procurement, BizOps.

**Pain today:**
- Quarterly earnings prep is a death march.
- Internal financial walkthroughs use 80-row Excel tabs nobody can follow.
- Budget reviews are circular Teams meetings.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Earnings analyst briefing** | 90 s | `BrandIntro`, `MetricsCard`, `DataChart`, `Disclaimer` (forward-looking statements), `BrandOutro` | "Turn last quarter's earnings deck into a 90-second analyst briefing video." |
| **Budget walkthrough** | 2 min | `TitleCard`, `ExcelScene`, `DataChart`, `CalloutBox`, `OKRStatus` | "Walk the EVP staff through the FY27 plan in 2 minutes." |
| **Cost-management deep dive** | 90 s | `TitleCard`, `AzurePortalScene`, `MetricsCard`, `BurnDown` (Phase II) | "Explain why Azure spend is 12% over plan and what we're doing." |
| **Procurement update** | 60 s | `TitleCard`, `MetricsCard`, `StepByStep`, `Disclaimer`, `CTABlock` | "Communicate the new vendor onboarding process to engineering managers." |

**Impact:**
- Forward-looking statements and required disclaimers are **not optional** —
  the brand package's `disclaimers` array is locked into every external
  finance video automatically.
- Demo-data classifier blocks placeholder financial figures from leaving
  the building (`external`/`executive` profiles).
- Hard budget cap ($25 default) prevents an over-eager agent from running
  up an Azure bill rendering 50 takes of the same chart.

---

## 9. Executive & Leadership Communications

**Who:** EBC team, CEO/EVP comms, Chief of Staff orgs.

**Pain today:**
- Executives need 5 different tailored versions of the same message
  (CEO version, board version, investor version, customer version, staff
  version).
- Speechwriting + video production happen in different orgs with different
  cycles.
- Last-minute changes (a new metric, a fresh quote) require recutting.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Executive briefing video** | 2 min | `BrandIntro`, `LowerThird`, `MetricsCard`, `OKRStatus`, `Quote`, `BrandOutro` | "Brief our CEO on Azure FY26 H1 performance in 2 minutes." |
| **Board readout** | 3 min | `BrandIntro`, `MetricsCard`, `Roadmap`, `Quote`, `Disclaimer`, `BrandOutro` | "Convert the board pre-read into a 3-minute video summary." |
| **Customer-facing exec message** | 60 s | `BrandIntro`, exec headshot via `LowerThird`, `Quote`, `CTABlock` | "Have our EVP welcome a new strategic customer in a 60s personalized video." |
| **Crisis response** | 60 s | `TitleCard`, `Quote`, `Disclaimer`, `CTABlock` | "Draft a 60s 'here's what we're doing' video for the security incident." |

**Impact:**
- Uses the **`executive`** deliveryProfile — highest brand pinning, no
  placeholders, full content safety audit.
- 5 personalized variants from one scene plan — change brand package,
  voice, and a couple of `Quote` slots; everything else stays intact.
- Reviewer stage (P6 rubric, generation tools forbidden) ensures an
  executive video is **never** released with a brand violation.

---

## 10. Research, Analyst Relations & Public Speaking

**Who:** Microsoft Research, AR, conference speakers, evangelists.

**Pain today:**
- Conference talk prep eats weeks; the recording afterward eats more weeks.
- Research papers don't reach the audience that needs them — too dense.
- Analyst briefings happen by static deck.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Conference teaser** | 30 s | `EventBranding` (Phase II), `TitleCard`, `Quote`, `CTABlock` | "Build a 30s teaser for my Build session on agentic systems." |
| **Research paper summary** | 2 min | `TitleCard`, `Quote`, `DataChart`, `ArchitectureDiagram`, `CTABlock` | "Summarize this Microsoft Research paper for a non-technical audience." |
| **Analyst pre-briefing** | 90 s | `BrandIntro`, `MetricsCard`, `CompetitiveMatrix`, `Disclaimer`, `BrandOutro` | "Pre-brief Gartner on our copilot roadmap in 90s." |
| **Speaker bug / talk replay** | 2 min | `PresenterBug` (Phase II), `WebcamOverlay`, `*Scene` mockups, `LowerThird` | "Re-cut my keynote into a 2-minute highlight reel for the Microsoft homepage." |

**Impact:**
- Research reach extends from "people who read papers" to "people who watch
  90-second videos."
- Conference speakers walk in with brand-compliant intro/outro stings,
  tested against the rubric.
- Recordings are post-processed with `LowerThird`, `PresenterBug`, and
  `WebcamOverlay` overlays automatically.

---

## 11. Support & Customer Service

**Who:** Customer Service & Support (CSS), Support Engineers, Premier.

**Pain today:**
- Top KB articles get read once, by the support engineer; the customer
  rarely sees them.
- Repro-step videos are recorded by hand, one customer at a time.
- Diagnostic guidance is hard to convey in text.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **KB article video version** | 60 s | `TitleCard`, `*Scene` (the actual product), `StepByStep`, `CTABlock` | "Convert KB article #214567 to a 60s video showing the steps in Azure Portal." |
| **Diagnostic walkthrough** | 90 s | `TitleCard`, `TerminalScene`, `LogReplay` (Phase II), `CalloutBox` | "Show how to collect WinDbg traces in 90s for a customer ticket." |
| **Outage post-mortem** | 2 min | `TitleCard`, `AuditTrail`, `DataFlow`, `MetricsCard`, `Disclaimer` | "Communicate Friday's regional outage to enterprise customers in 2 minutes." |
| **Self-service onboarding** | 60 s | `TitleCard`, `AdminCenterScene`, `StepByStep`, `CTABlock` | "Walk new admins through enabling MFA in their first 60 seconds." |

**Impact:**
- Top-N KB articles become videos overnight — not over a quarter.
- Customer self-service deflection improves directly with video coverage.
- Support engineers spend less time on the same repeated walkthrough.

---

## 12. HR, People & Recruiting

**Who:** People team, Talent Acquisition, Diversity & Inclusion, L&D.

**Pain today:**
- Recruiting content is generic and rarely role-specific.
- Onboarding videos go stale within months.
- D&I storytelling is high-stakes and sensitive — easy to get wrong.

**What Slate produces:**

| Format | Length | Components | Trigger |
|--------|--------|-----------|---------|
| **Job posting video** | 45 s | `BrandIntro`, `TeamGrid` (Phase II), `Quote`, `CTABlock` | "Build a 45s video for our Principal SWE opening on the Cosmos DB team." |
| **Hiring manager briefing** | 60 s | `TitleCard`, `MetricsCard`, `LowerThird`, `BrandOutro` | "Brief the loop on this candidate's background — internal use." |
| **New-hire welcome** | 90 s | `BrandIntro` (personalized), `TeamGrid`, `StepByStep`, `BrandOutro` | "Create a personalized first-day welcome video for a new EM joining Azure Networking." |
| **Manager moment** | 60 s | `TitleCard`, `Quote`, `AudienceSafe` (Phase II), `BrandOutro` | "Communicate the new performance review framework to people managers." |

**Impact:**
- Recruiting content scales without losing personalization.
- The `AudienceSafe` component (Phase II) explicitly flags content for
  sensitive contexts.
- Brand-compliance and disclaimer enforcement catches inadvertent issues.

---

## 13. Cross-Cutting Patterns

These patterns recur across roles:

### 13.1 "Turn this deck into a video"

The single most-requested capability. Slate ingests `.pptx`/`.docx`/`.xlsx`
via `src/slate/tools/ingest/parsers.py`, extracts speaker notes as
narration source, and proposes a scene plan you approve before any cost is
incurred ([§17 Data Flow](./ARCHITECTURE.md#17-data-flow--prompt-to-mp4)).

### 13.2 "Re-cut for a different audience"

Same scene plan, different brand package, different voice, optionally
translated narration. The composition format ([SCF](./ARCHITECTURE.md#9-scf--slate-composition-format-schemas))
makes this a re-render, not a re-edit.

### 13.3 "Make the demo without recording the demo"

The 13 synthetic Microsoft surface mockups (`AzurePortalScene`,
`AdminCenterScene`, `VSCodeScene`, `TeamsScene`, `ExcelScene`,
`PowerBIScene`, `FabricScene`, `WindowsScene`, `OutlookScene`,
`PowerPointScene`, `GitHubScene`, `EdgeBrowserScene`, `TerminalScene`)
recreate product UIs without screen capture. Customer tenant names,
specific data, and any branding can be parameterized.

### 13.4 "Pin to a specific brand version for legal review"

Set `deliveryProfile: external|executive|regulated` on the SCF and the
schema enforces a hashed `brandPackage` reference. Legal can then verify
that the exact brand version they signed off on was used.

### 13.5 "Generate evidence I can show an auditor"

Every production produces `output/production_trace.json` — an append-only
DAG with every tool call, every cost, every gate decision, every policy
violation, every skill consultation. This is your audit artifact.

### 13.6 "Stay under budget"

Default per-production budget is $10. Org hard cap is $25. The agent
warns at 50%, pauses at 90%. You can't accidentally render a $400 video.

### 13.7 "Keep a human in the loop"

Stage gates are enforced: `user_approval` at brief, script, scene plan,
and final delivery; `self_review` at compose; `auto` only for assets
generation (after the cost-estimate gate). This is the default for
governed pipelines and cannot be disabled by the agent.

---

## 14. What Slate Is *Not* For

Slate is opinionated about scope. It is **not** the right tool for:

| Out of scope | Why | Use instead |
|--------------|-----|-------------|
| Long-form (>10 min) cinematic content | The 12 principles assume short-form professional video | Traditional NLE (Premiere, Resolve) |
| Real-time live streaming | Renders are batch-mode, multi-second per frame | Teams Live Events, Stream |
| Interactive video / branching | SCF is linear by design | H5P, custom React |
| Music composition | Slate uses provided/licensed music; does not synthesize | Suno, Stable Audio |
| Hyper-realistic deepfake of real people | Brand and ethics policies forbid it; `AudienceSafe` flags it | (use a properly-consented avatar pipeline) |
| Game cinematics / VFX shots | HyperFrames is HTML/CSS/GSAP; not a game engine | Unreal, Blender |
| Content the company shouldn't say at all | Content-safety policy will block it | Talk to comms / legal first |

When you hit one of these, escalate to a human producer — Slate's
`production_trace.json` plus the SCF document make handoff trivial.

---

## Summary — The Common Thread

Every role above shares the same fundamental pattern:

1. **Information already exists** (a deck, a doc, a ticket, an article, a
   roadmap, a metric, a customer record).
2. **Video would be a much better format** for the audience that needs it.
3. **The cost of producing video** today (people, time, money,
   coordination) is too high for the value at stake.
4. **Slate collapses that cost** by an order of magnitude, *while* enforcing
   brand and compliance more strictly than humans typically do.

The result: video stops being a privileged channel reserved for keynotes
and TV ads, and becomes a default communication medium for everyone at
Microsoft — auditable, brand-safe, and cheap enough to do at scale.

---

*For the technical architecture see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
For the agent operating contract see [`../.github/copilot-instructions.md`](../.github/copilot-instructions.md).
For the original product thesis see [`FEATURE-SPEC.md`](./FEATURE-SPEC.md).*
