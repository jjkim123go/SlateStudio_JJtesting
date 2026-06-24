# Component Catalog — What's Available

> **When to read:** At scene-plan stage, before choosing a component for any scene.
> This catalog tells you what each component does, what it looks like, and when
> to pick it. For detailed props, see `docs/COMPONENT_REFERENCE.md`.

## Data & Metrics

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **MetricsCard** | Single big KPI with counter tween, delta arrow, optional sub-metrics | "92% uptime", "revenue grew 23%", one hero number |
| **MetricStack** | Multiple KPIs stacked vertically, each with counter + delta | "This quarter: 3 metrics" — dashboard summary |
| **GaugeRing** | Radial ring gauge with SVG arc fill + counter, optional comparison ring | "92% utilization", budget usage, single percentage KPI |
| **DataChart** | Animated bar, line, donut, scatter charts via Chart.js | Any data visualization with multiple data points |
| **BurnDown** | Sprint burndown line chart with ideal vs actual | Sprint retrospectives, iteration progress |
| **OKRStatus** | OKR progress cards with percentage fills | Quarterly objectives, team goals |
| **ProgressBar** | Multi-section horizontal progress indicator | Feature rollout, migration progress |
| **ROICalculator** | Structured ROI narrative with formula tokens | Business case, cost justification |

## Diagrams & Architecture

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **DataFlow** | Glassmorphic pipeline with glowing connections + energy pulses | "How it works" flows, data pipelines, ETL |
| **ArchitectureDiagram** | System topology with boxes + arrows, sequential reveal | Service architecture, microservices, dependency maps |

## Comparisons & Tables

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **CompareSlider** | Two-column comparison with color-coded rows (red/green) | Before/after, us vs them, old vs new |
| **PricingTable** | Multi-tier pricing cards with feature checkmarks | Product pricing, plan comparison |
| **CompetitiveMatrix** | Feature comparison grid with check/cross marks | Competitive analysis, feature parity |
| **SplitScreen** | Side-by-side panels for any two components or images | Any A/B visual comparison |

## Text & Narrative

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **TitleCard** | Full-screen title with background image + overlay text | Opening slides, chapter dividers |
| **Quote** | Large quotation with attribution (name + role) | Customer testimonials, expert quotes |
| **CalloutBox** | Floating annotation card with leader line | Highlighting a specific detail on screen |
| **CalloutPin** | Glowing pin marker with glassmorphic callout card | "Key Insight" callouts, highlighted facts |
| **CTABlock** | Premium closing card with glassmorphic button + glow | "Get Started", "Learn More" — video endings |
| **StepByStep** | Numbered glassmorphic cards for sequential instructions | "3 steps to get started", setup guides |
| **TerminologyCard** | Single-term explainer with definition + analogy + example | Glossary entries, concept definitions |
| **CustomerStory** | Testimonial + metrics showcase | Case studies, success stories |

## Brand & Structure

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **BrandIntro** | Animated logo + company name + tagline reveal | Video opening (first scene) |
| **BrandOutro** | Closing card with tagline and CTA | Video ending (last scene) |
| **SectionDivider** | Full-screen chapter break with title | Between major sections |
| **LowerThird** | Professional name + title bar overlay | Speaker identification |
| **AnimatedCaption** | Word-highlight / sentence / karaoke captions | Narrated scenes (auto-added) |

## Code & Developer Surfaces

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **TerminalCast** | Polished terminal with typing animation + shell themes | CLI demos, command sequences |
| **VSCodeScene** | Full VS Code UI with editor, sidebar, extensions | Code editing, Copilot demos |
| **KustoExplorerScene** | Realistic Kusto Explorer desktop surface with connection tree, KQL editor, result grid, and callout layer | KQL query walkthroughs, ADX investigation paths, finance-control classifier demos |
| **AzureDevOpsScene** | Azure DevOps repo, file, PR, diff, PR Assistant comment, and reviewer activity surface with anonymized structured props | ADO repo walkthroughs, PR Assistant demos, PAL impact review explanations |
| **GitHubScene** | GitHub UI (repo, PR, diff views) | Repository walkthroughs, PR reviews |
| **ScreenDemoFrame** | Browser chrome wrapping a screenshot or inner content | Any web app demo with browser UI |

## Microsoft 365 Surfaces

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **TeamsScene** | Full Teams UI (chat, channels, calendar) | Teams workflow demos |
| **OutlookScene** | Outlook mail, calendar, compose views | Email workflow demos |
| **ExcelScene** | Excel with formulas, charts, tables | Spreadsheet demos |
| **PowerPointScene** | PowerPoint with slide editor | Presentation demos |
| **PowerBIScene** | Power BI dashboard | Analytics demos |
| **LoopScene** | Microsoft Loop (kanban, tasks, tables) | Collaboration demos |
| **WhiteboardScene** | Microsoft Whiteboard (diagrams, brainstorm) | Ideation demos |
| **OneDriveScene** | OneDrive file browser | File management demos |
| **BookingsScene** | Microsoft Bookings | Scheduling demos |
| **FormsScene** | Microsoft Forms builder/preview | Survey demos |
| **ListsScene** | Microsoft Lists | List management demos |
| **PlannerScene** | Microsoft Planner (board/chart views) | Task management demos |
| **StreamScene** | Microsoft Stream video player | Video hosting demos |
| **AdminCenterScene** | Admin Center UI | IT admin demos |
| **FabricScene** | Microsoft Fabric | Data platform demos |
| **WindowsScene** | Windows desktop/explorer | OS-level demos |
| **EdgeBrowserScene** | Edge browser with tabs | Web browsing demos |

## Transitions & Effects

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **ThreeScene** | Deterministic three.js/WebGL hero stage with real 3D depth, lighting, particles, and texture-ready planes | Premium hero moments where spatial depth carries meaning, not routine text/data scenes |
| **DeviceStage3D** | three.js stage that renders a screenshot/texture on a tilted browser/device/glass panel with soft camera orbit + accent glow | Product-screenshot reveals, "show the laptop / phone in hand" beats, demo openings where the artifact itself is the hero |
| **HTMLTextureWall** | three.js wall or carousel of card planes textured via CanvasTexture (exact text) or pre-rendered images, with staggered reveal | Logo / customer / quote / capability walls; "many things at once" beats where each card needs to read clearly |
| **CollageShatter** | Image shatters into fragments | Dramatic scene transition |
| **DepthZoomPunch** | Zoom punch with depth layers | Energetic transition |
| **SwirlVortex** | Spiral vortex transition | Creative/playful transition |
| **PageTurn** | Book page turn effect | Chapter transitions |
| **IrisZoom** | Circular iris open/close | Classic cinematic transition |
| **OrbitReveal** | Orbiting point reveals next scene | Sci-fi/tech transition |
| **FilmstripFlip** | 3D card flip with filmstrip | Retro/creative transition |
| **TypewriterDissolve** | Monospace grid dissolve | Tech/hacker aesthetic |
| **ParticleAssemble** | Particles assemble into image | Dramatic reveal |
| **GlitchPulse** | Digital glitch effect | Edgy/disruptive transition |
| **ShakeImpact** | Screen shake on impact | Action emphasis |
| **AssetCascade** | Multiple assets cascade in | Portfolio/showcase reveal |
| **TransitionWipe** | Directional wipe between scenes | Clean chapter bridge |

## Overlays & Helpers

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **WebcamOverlay** | Picture-in-picture presenter bubble | Talking-head overlay |
| **PresenterBug** | Small presenter name/photo bug | Conference/event speaker ID |
| **EventBranding** | Event/conference branding frame | Event intro/outro |
| **AudienceSafe** | Governance watermark overlay | Compliance marking |
| **Disclaimer** | Legal/compliance text overlay | Legal requirements |
| **ScrollingBackground** | Animated scrolling background | Behind other content |
| **ComponentOverlay** | Nest one component inside another | Composite scenes |
| **BookPageMetrics** | Metrics displayed on a book page | Creative data presentation |
| **AskTheAudience** | Live/closed poll visualization | Interactive presentations |

## PM & Release

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **Roadmap** | Horizontal swimlane roadmap | Product planning, release timelines |
| **ReleaseNotes** | Feature/fix/breaking-change digest | Release communications |
| **Quiz** | Single-answer quiz with option reveal | Training, assessment |

## Governance & Compliance

| Component | What it does | When to use |
|-----------|-------------|-------------|
| **ComplianceBadgeWall** | Grid of compliance certification badges | Trust/compliance showcase |
| **AuditTrail** | Sequential audit log entries | Compliance narrative |
| **PolicyEnforcement** | Policy rule visualization | Security/governance demos |
