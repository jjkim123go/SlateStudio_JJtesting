# Slate Skills — INDEX

> Thin directory of every skill. The agent reads THIS file once per
> session for awareness, then loads individual skill files JIT — only
> when the trigger fires (a tool is about to be invoked, a director
> is being chosen, a component is being authored, or a keyword matches).
>
> **JIT contract** (see [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)):
>
> 1. Before calling tool `X`, read every skill listed in `X.agent_skills`.
> 2. When producing a video, read [`meta/production-loop.md`](meta/production-loop.md)
>    plus the relevant `directors/*` skill(s). Mix directors freely.
> 3. When a script line / scene / brand asset trigger-matches a row
>    below, load that skill before authoring or routing.
>
> **Layer key:** Meta = cross-cutting policy & operating model ·
> Directors = mixable shape advisors · L2 = Slate-specific contracts ·
> L3 = vendor best-practice · Model = per-model card.

## Component-modification contract (read before editing any component file)

The trigger rows below tell you which skills to load when **planning a scene**
that uses a component. They do **not** cover the inverse case: editing the
component's source itself. That path has its own required skills.

**Before editing any file under `render/components/<X>/`** (e.g.
`render/components/MetricsCard/animation.js`, `index.html`, `props.json`,
or adding a new component folder), load all of the following:

| Always load | Why |
|---|---|
| [`core/component-authoring`](core/component-authoring.md) | Master timeline contract, SCENE_DURATION, scf-to-html, file layout |
| [`core/animation/sequencing`](core/animation/sequencing.md) | How to build the master timeline (every component needs one) |
| [`core/animation/basics`](core/animation/basics.md) | Tween conventions, easing, duration norms |
| [`meta/narration-component-sync`](meta/narration-component-sync.md) | Caption / `narrationStartSec` / cue alignment |

**Also load when relevant:**

| Conditional | When |
|---|---|
| [`core/render/gsap-flip`](core/render/gsap-flip.md) | The component reorders, swaps positions, or expands a child (FLIP-style layout choreography) |
| [`core/render/shiki`](core/render/shiki.md) | The component renders source code with token-level highlighting |
| [`core/hyperframes-rendering`](core/hyperframes-rendering.md) | First time touching components this session, or unsure how SCF maps to a component's props |
| `components/<x>` row below | A row exists for the specific component being edited — load that row's skill too for design intent and trigger semantics |

If you skip these, expect: timeline drift, narration desync, broken
SCENE_DURATION semantics, or animations that look fine standalone but
break when composed.

## Layer 2 — Core Slate skills

| Skill | File | Trigger |
|-------|------|---------|
| `hyperframes-rendering` | [`skills/core/hyperframes-rendering.md`](core/hyperframes-rendering.md) | SCF, render, compose, scene, component, MP4, HyperFrames, TitleCard, BrandIntro, BrandOutro, AnimatedCaption, LowerThird |
| `component-authoring` | [`skills/core/component-authoring.md`](core/component-authoring.md) | new component, edit component, animation.js, index.html, master timeline, render/components, SCENE_DURATION, scf-to-html |
| `foundry-models` | [`skills/core/foundry-models.md`](core/foundry-models.md) | image, photo, face, portrait, narration, voice, TTS, video clip, Sora, transcribe, captions, model, prompt, Foundry, Azure AI |
| `ffmpeg-audio` | [`skills/core/ffmpeg-audio.md`](core/ffmpeg-audio.md) | audio, mix, ducking, normalize, loudness, transcode, ffmpeg, music, narration, sample rate, codec |
| `video-indexer-review` | [`skills/core/video-indexer-review.md`](core/video-indexer-review.md) | review stage, deep review, Video Indexer, VI signals, caption accuracy, scene drift, moderation, OCR |
| `structured-visuals` | [`skills/core/structured-visuals.md`](core/structured-visuals.md) | scene_plan, assets, diagram, flowchart, architecture, table, code slide, chart, UI mockup, structured_image |
| `scene-component-routing` | [`skills/core/scene-component-routing.md`](core/scene-component-routing.md) | scene_plan stage; any time the agent is choosing between two registered components, mapping a vague script line to a component, or deciding whether a scene needs a component at all. Runs FIRST in… |
| `precise-video-language` | [`skills/core/precise-video-language.md`](core/precise-video-language.md) | generated video, Sora prompt, cinematic component, cinematic prompt, shot plan, camera movement, subject/scene/motion/spatial/camera, prompt drift, video-language spec, visual critique, DepthZoomPunch, IrisZoom, OrbitReveal, SwirlVortex, PrismRefract, FilmstripFlip |
| `visual-storytelling-components` | [`skills/core/visual-storytelling-components.md`](core/visual-storytelling-components.md) | scene_plan stage; any script with metrics/numbers, before/after, customer quote, point at an image, multi-step instructions, closing CTA, side-by-side, animated chart, branded slide, framed device… |
| `synthetic-screen-recording` | [`skills/core/synthetic-screen-recording.md`](core/synthetic-screen-recording.md) | terminal, CLI, command line, install flow, deploy walkthrough, "watch as I run", "type the following", build output, npm/yarn/pip/cargo/kubectl/az/git/docker, app, app UI, web app, browser,… |

## Layer 2 — Component skills (load when planning a scene that uses one)

| Skill | File | Trigger |
|-------|------|---------|
| `components/architecture-diagram` | [`skills/core/components/architecture-diagram.md`](core/components/architecture-diagram.md) | architecture, system architecture, service map, topology, dependency graph, component diagram, integration flow, microservices, boxes and arrows, data flow with sequential reveal |
| `components/metrics-card` | [`skills/core/components/metrics-card.md`](core/components/metrics-card.md) | metric, metrics, team metrics, KPI, dashboard, stat, trend, delta, latency, uptime, throughput, SLA, SLO, response time, P95/P99, "X% improvement", "jumped from … to …", headline number |
| `components/terminal-scene` | [`skills/core/components/terminal-scene.md`](core/components/terminal-scene.md) | terminal, CLI, command line, "run this command", install flow, deploy walkthrough, npm/yarn/pip/cargo install, kubectl, az, git, docker, "watch as I run", build output demo. (See also the… |
| `components/compare-slider` | [`skills/core/components/compare-slider.md`](core/components/compare-slider.md) | before/after, vs, comparison, with and without, old vs new, legacy vs modern, classical vs ML, manual vs automated, "sweep between two images". Use over SplitScreen when both sides show the *same*… |
| `components/quote` | [`skills/core/components/quote.md`](core/components/quote.md) | testimonial, quote, "as our CEO said", "one customer told us", "according to", pull quote, customer voice, executive statement |
| `components/callout-pin` | [`skills/core/components/callout-pin.md`](core/components/callout-pin.md) | "this part of the UI", "look here", "notice the X in the top-right", annotated screenshot, point out, callout, highlight on image. Use over CalloutBox for ≤ 12-word labels, multiple pins on one… |
| `components/step-by-step` | [`skills/core/components/step-by-step.md`](core/components/step-by-step.md) | numbered steps, checklist, tutorial sequence, "1. … 2. … 3. …", onboarding flow, "first … then … finally", how-to |
| `components/cta-block` | [`skills/core/components/cta-block.md`](core/components/cta-block.md) | closing scene, call to action, "get started", "learn more", "sign up", "contact us", final ask, conclusion |
| `components/vscode-scene` | [`skills/core/components/vscode-scene.md`](core/components/vscode-scene.md) | VS Code, IDE walkthrough, "open the file", typing code, IntelliSense demo, gutter marker, integrated terminal, editor demo |
| `components/azure-portal-scene` | [`skills/core/components/azure-portal-scene.md`](core/components/azure-portal-scene.md) | Azure portal, resource blade, "click Create", subscription picker, ARM resource demo, Azure UI walkthrough, portal field input |
| `components/github-scene` | [`skills/core/components/github-scene.md`](core/components/github-scene.md) | GitHub, pull request, code review, merge, GitHub Actions run, commit history, repo navigation, PR discussion |
| `components/edge-browser-scene` | [`skills/core/components/edge-browser-scene.md`](core/components/edge-browser-scene.md) | browser, web app demo, address bar, "navigate to", DevTools, page load, tab open, generic SaaS surface behind chrome |
| `components/teams-scene` | [`skills/core/components/teams-scene.md`](core/components/teams-scene.md) | Microsoft Teams, chat, channel, mention, reaction, meeting join, screen share, Teams collaboration demo |
| `components/outlook-scene` | [`skills/core/components/outlook-scene.md`](core/components/outlook-scene.md) | Outlook, inbox, email arrival, compose, send, attach, calendar invite, mail workflow, "an email comes in" |
| `components/excel-scene` | [`skills/core/components/excel-scene.md`](core/components/excel-scene.md) | Excel, spreadsheet, formula, cell recompute, pivot, chart insert, "in cell B5", workbook demo |
| `components/powerpoint-scene` | [`skills/core/components/powerpoint-scene.md`](core/components/powerpoint-scene.md) | PowerPoint editing demo, deck *being built*, slide transition demo, Designer suggestion, image drop, slide thumbnail rail, "show me PowerPoint". Use **only** when the demo is *about* PowerPoint… |
| `components/power-bi-scene` | [`skills/core/components/power-bi-scene.md`](core/components/power-bi-scene.md) | Power BI, report, slicer, drill-down, KPI tile, tooltip, BI dashboard demo |
| `components/fabric-scene` | [`skills/core/components/fabric-scene.md`](core/components/fabric-scene.md) | Microsoft Fabric, lakehouse, notebook cell, data pipeline, OneLake, Fabric workspace |
| `components/windows-scene` | [`skills/core/components/windows-scene.md`](core/components/windows-scene.md) | Windows desktop, taskbar, Start menu, window drag, toast notification, OS-level demo |
| `components/admin-center-scene` | [`skills/core/components/admin-center-scene.md`](core/components/admin-center-scene.md) | M365 admin center, tenant, user provisioning, policy assign, compliance check, IT admin workflow |
| `components/callout-box` | [`skills/core/components/callout-box.md`](core/components/callout-box.md) | "explain this region", "annotate the chart with two sentences", "callout with detail", "tooltip on a screenshot", labelled photo, technical diagram annotation, side-of-image card. Use over… |
| `components/webcam-overlay` | [`skills/core/components/webcam-overlay.md`](core/components/webcam-overlay.md) | "presenter webcam", "talking head over the demo", "face-cam in the corner", "founder in the corner", "speaker in the corner", "host in the corner", PiP, founder explaining, expert commentary,… |
| `components/transition-wipe` | [`skills/core/components/transition-wipe.md`](core/components/transition-wipe.md) | "chapter break", "act break", "now let's switch to", "moving on", section divider, segment intro, "Part 2", "Chapter 3". Use sparingly — 1 to 3 per video at major topic boundaries |
| `components/data-chart` | [`skills/core/components/data-chart.md`](core/components/data-chart.md) | chart, graph, bar chart, donut, pie, line chart, area chart, "show the numbers", quarterly results, growth trend, breakdown, distribution, "X grew Y%". Use over a `structured_image` PNG when the chart… |
| `components/slide-renderer` | [`skills/core/components/slide-renderer.md`](core/components/slide-renderer.md) | presentation slide, deck slide, "slide that says…", keynote-style slide, executive summary, title slide, opening slide, cover slide, agenda slide, recap slide, closing slide, "title slide with… |
| `components/screen-demo-frame` | [`skills/core/components/screen-demo-frame.md`](core/components/screen-demo-frame.md) | "wrap this in a browser frame", "phone mockup", "tablet demo", "macOS window", product demo, app screenshot, "show this on mobile", marketing-style framed asset |
| `components/split-screen` | [`skills/core/components/split-screen.md`](core/components/split-screen.md) | split screen, side by side, "show both", before/after together, two views, comparison, dual-pane, "left shows X, right shows Y". Use over CompareSlider when both regions should be fully visible… |
| `components/compliance-badge-wall` | [`skills/core/components/compliance-badge-wall.md`](core/components/compliance-badge-wall.md) | SOC 2, ISO 27001, HIPAA, FedRAMP, GDPR, NIST, PCI DSS, CSA STAR, HITRUST, attestations, certifications, badges, trust signals, "we are certified", "in scope", "meets standard", regional data… |
| `components/data-flow` | [`skills/core/components/data-flow.md`](core/components/data-flow.md) | data flow, data movement, governance, lineage, ingest, store, export, encryption at rest/in transit, classification, PII flow, sovereignty, residency, GDPR transfer, cross-border, ETL,… |
| `components/audit-trail` | [`skills/core/components/audit-trail.md`](core/components/audit-trail.md) | audit trail, audit log, activity log, "who did what when", evidence, retention, attested actions, compliance log, change log, immutable record, SOX trail, change history, correlation id. Use for… |
| `components/policy-enforcement` | [`skills/core/components/policy-enforcement.md`](core/components/policy-enforcement.md) | policy, access control, RBAC, ABAC, allow, deny, redact, challenge, MFA prompt, conditional access, policy evaluation, role check, device check, location check, classification check, "the system… |
| `components/section-divider` | [`skills/core/components/section-divider.md`](core/components/section-divider.md) | chapter, part, section, phase, "next up", "moving on", "let's look at", episode marker, module, lesson break, act, segment, topic shift, intermission. Use for full-screen chapter / section… |
| `components/scrolling-background` | [`skills/core/components/scrolling-background.md`](core/components/scrolling-background.md) | ambient background, scrolling backdrop, parallax, motion wallpaper, looping pattern, animated gradient, "subtle motion behind the content", continuous backdrop. Use as a background-only layer… |
| `components/audience-safe` | [`skills/core/components/audience-safe.md`](core/components/audience-safe.md) | audience watermark, "internal only", "for partners", "executive only", "regulated audience", confidentiality marker, classification banner, audience-restricted content, deliveryProfile watermark.… |
| `components/disclaimer` | [`skills/core/components/disclaimer.md`](core/components/disclaimer.md) | disclaimer, legal notice, forward-looking statement, safe-harbor, "subject to change", "not financial advice", "illustrative only", "demo data", "non-production", regulatory statement, attestation… |
| `components/customer-story` | [`skills/core/components/customer-story.md`](core/components/customer-story.md) | customer story, case study, testimonial, "X chose us", "X reduced/increased", customer quote, hero customer, logo + quote + metrics, attribution, "Sarah from Contoso said", proof point, reference… |
| `components/pricing-table` | [`skills/core/components/pricing-table.md`](core/components/pricing-table.md) | pricing, plans, tiers, "Free / Pro / Enterprise", "per user / month", subscription tiers, price comparison, "what's included", feature list per tier, recommended plan, billing cadence, CTA per… |
| `components/competitive-matrix` | [`skills/core/components/competitive-matrix.md`](core/components/competitive-matrix.md) | competitive comparison, "us vs them", feature parity, "how we compare", competitor matrix, checkmark grid, yes/no/partial, "we have it, they don't", capability comparison, vendor evaluation, RFP… |
| `components/roi-calculator` | [`skills/core/components/roi-calculator.md`](core/components/roi-calculator.md) | ROI, return on investment, payback, savings calculation, "annual savings", TCO, total cost of ownership, cost-benefit, business case, "X hours saved × Y rate", break-even, sensitivity analysis,… |
| `components/roadmap` | [`skills/core/components/roadmap.md`](core/components/roadmap.md) | roadmap, milestone timeline, quarter plan, release horizon, swimlane roadmap, milestone dependency, delivery plan, timeline view |
| `components/burn-down` | [`skills/core/components/burn-down.md`](core/components/burn-down.md) | burndown, burn down, remaining work, sprint trend, ideal line, actual line, scope change, backlog burn, date-based trend |
| `components/okr-status` | [`skills/core/components/okr-status.md`](core/components/okr-status.md) | OKR, objective, key result, goal progress, target status, confidence, status rollup, quarterly goals |
| `components/release-notes` | [`skills/core/components/release-notes.md`](core/components/release-notes.md) | release notes, changelog, what's new, shipped features, hotfix, GA update, product update, notable changes |
| `components/quiz` | [`skills/core/components/quiz.md`](core/components/quiz.md) | quiz, knowledge check, check for understanding, poll question, multiple choice, reveal answer, score badge |
| `components/terminology-card` | [`skills/core/components/terminology-card.md`](core/components/terminology-card.md) | terminology, glossary, definition, term of art, concept explainer, analogy, "do not confuse with", vocabulary anchor |
| `components/progress-bar` | [`skills/core/components/progress-bar.md`](core/components/progress-bar.md) | progress bar, module progress, lesson progress, course map, milestone progress, segmented progress, current section |
| `components/terminal-cast` | [`skills/core/components/terminal-cast.md`](core/components/terminal-cast.md) | terminal cast, conference terminal demo, shell walkthrough, narrated CLI segment, command sequence, zoom on command output |
| `components/presenter-bug` | [`skills/core/components/presenter-bug.md`](core/components/presenter-bug.md) | presenter bug, speaker lower-third, presenter identity, stage speaker, photo + name + pronouns, social handle strip |
| `components/event-branding` | [`skills/core/components/event-branding.md`](core/components/event-branding.md) | event opener, conference branding, sponsor lockup, session id, venue, event title card, summit opener |
| `components/ask-the-audience` | [`skills/core/components/ask-the-audience.md`](core/components/ask-the-audience.md) | audience poll, live poll, vote results, response count, show of hands, session interaction, ranking bars |
| `components/loop-scene` | [`skills/core/components/loop-scene.md`](core/components/loop-scene.md) | Microsoft Loop, meeting notes, collaborative task list, kanban board, Loop table, shared workspace, coauthoring surface |
| `components/whiteboard-scene` | [`skills/core/components/whiteboard-scene.md`](core/components/whiteboard-scene.md) | Microsoft Whiteboard, brainstorm, sticky notes, retro, diagramming board, whiteboard template, collaborative sketch |
| `components/stream-scene` | [`skills/core/components/stream-scene.md`](core/components/stream-scene.md) | Microsoft Stream, transcript player, chapter navigation, video search, enterprise video portal, embedded clip playback |
| `components/lists-scene` | [`skills/core/components/lists-scene.md`](core/components/lists-scene.md) | Microsoft Lists, operational tracker, incident list, tabular SaaS list, row selection, list filtering, grid with rich cells |
| `components/planner-scene` | [`skills/core/components/planner-scene.md`](core/components/planner-scene.md) | Microsoft Planner, task board, bucket board, plan charts, task detail pane, team planning board |
| `components/onedrive-scene` | [`skills/core/components/onedrive-scene.md`](core/components/onedrive-scene.md) | OneDrive, my files, share dialog, file list, context menu, recent files, shared files, document handoff |
| `components/forms-scene` | [`skills/core/components/forms-scene.md`](core/components/forms-scene.md) | Microsoft Forms, survey builder, quiz builder, response preview, forms gallery, questionnaire workflow |
| `components/bookings-scene` | [`skills/core/components/bookings-scene.md`](core/components/bookings-scene.md) | Microsoft Bookings, appointment scheduling, booking page, service calendar, appointment modal, self-serve scheduling |
| `components/collage-shatter` | [`skills/core/components/collage-shatter.md`](core/components/collage-shatter.md) | "shatter", "explode", "break apart", "fragment", "burst into pieces", "tiles flying", high-energy reveal between scenes, hero brand reveal |
| `components/depth-zoom-punch` | [`skills/core/components/depth-zoom-punch.md`](core/components/depth-zoom-punch.md) | "punch into", "zoom hit", "rack focus", "dolly zoom", "speed ramp", "impact cut", cinematic energy bridge between two visuals |
| `components/swirl-vortex` | [`skills/core/components/swirl-vortex.md`](core/components/swirl-vortex.md) | "swirl", "spiral", "whirlpool", "vortex", "spin into", "twist transition", dreamy/abstract bridge, brand-color radial bands |
| `components/page-turn` | [`skills/core/components/page-turn.md`](core/components/page-turn.md) | "page turn", "next chapter", "flip the page", "open the next section", book/magazine metaphor, editorial tactile bridge |
| `components/prism-refract` | [`skills/core/components/prism-refract.md`](core/components/prism-refract.md) | "rainbow split", "prism", "refract", "spectrum sweep", chromatic-aberration band sweep, color-spectrum reveal |
| `components/iris-zoom` | [`skills/core/components/iris-zoom.md`](core/components/iris-zoom.md) | "iris", "zoom into a point", "telescope into", "focus through a pinhole", classic film iris in/out, focus-on-detail bridge |
| `components/orbit-reveal` | [`skills/core/components/orbit-reveal.md`](core/components/orbit-reveal.md) | "orbit", "spiral in", "comet trail", "spiral reveal", "circle around", "sweeping arc", radial reveal of incoming scene |
| `components/filmstrip-flip` | [`skills/core/components/filmstrip-flip.md`](core/components/filmstrip-flip.md) | "flip", "card flip", "filmstrip", "page flip 3D", "rotate to next", "Y-axis flip", "X-axis flip", 3D card-rotation transition |
| `components/typewriter-dissolve` | [`skills/core/components/typewriter-dissolve.md`](core/components/typewriter-dissolve.md) | "typewriter", "ASCII", "code transition", "characters delete and retype", developer-coded vibe, terminal-style scene change |
| `components/particle-assemble` | [`skills/core/components/particle-assemble.md`](core/components/particle-assemble.md) | "particles assemble", "form from particles", "logo materialize", "dust forms shape", scattered-points-converge-to-image effect, hero brand or logo reveal |
| `components/glitch-pulse` | [`skills/core/components/glitch-pulse.md`](core/components/glitch-pulse.md) | "glitch", "RGB split", "scanlines", "VHS", "data-corruption flash", "TV static burst", short punctuation effect inside a scene |
| `components/shake-impact` | [`skills/core/components/shake-impact.md`](core/components/shake-impact.md) | "shake", "rumble", "earthquake", "impact thud", "punch hit", short on-beat camera-shake reaction, music-sync impact |
| `components/asset-cascade` | [`skills/core/components/asset-cascade.md`](core/components/asset-cascade.md) | "cascade in", "fan out", "deal cards", "stagger reveal of multiple images", asset wall, customer-logo wall, capability matrix reveal |
| `components/component-overlay` | [`skills/core/components/component-overlay.md`](core/components/component-overlay.md) | component overlay, layered component, transparent component host, glass panel, rich overlay over image, composite component scene |
| `components/metric-stack` | [`skills/core/components/metric-stack.md`](core/components/metric-stack.md) | three metrics, KPI stack, metric trio, proof stack, stacked cards, multiple headline numbers |
| `components/book-page-metrics` | [`skills/core/components/book-page-metrics.md`](core/components/book-page-metrics.md) | book page metrics, metrics on page, chapter metrics, editorial spread, page turn metrics, playbook proof |

## Layer 3 — Animation references (load when authoring components)

| Skill | File | Trigger |
|-------|------|---------|
| `animation/basics` | [`skills/core/animation/basics.md`](core/animation/basics.md) | writing any tween in a component |
| `animation/sequencing` | [`skills/core/animation/sequencing.md`](core/animation/sequencing.md) | building a component master timeline (every component) |
| `animation/performance` | [`skills/core/animation/performance.md`](core/animation/performance.md) | diagnosing render lag or designing motion-heavy scenes |
| `animation/value-helpers` | [`skills/core/animation/value-helpers.md`](core/animation/value-helpers.md) | computing scene-time-derived values in a component or in the SCF→HTML compiler |
| `render/gsap-flip` | [`skills/core/render/gsap-flip.md`](core/render/gsap-flip.md) | a component needs FLIP-style layout choreography (reorder, expand, swap-position) instead of manual transform tweens |

## Layer 3 — Render libraries (load when authoring structured content)

| Skill | File | Trigger |
|-------|------|---------|
| `render/shiki` | [`skills/core/render/shiki.md`](core/render/shiki.md) | authoring a component that renders source code and needs token-level highlighting beyond a single solid color |
| `render/mermaid` | [`skills/core/render/mermaid.md`](core/render/mermaid.md) | a structured diagram exceeds Pillow's complexity threshold (>8 nodes, sequence/ER/class/gantt/state) |
| `render/chartjs` | [`skills/core/render/chartjs.md`](core/render/chartjs.md) | a `bar_chart`/`donut_chart` scene needs interactive- fidelity axes, gridlines, legend, or stacked series |

## Layer 3 — Icon kits (load when placing product/affordance icons)

| Skill | File | Trigger |
|-------|------|---------|
| `icons/fluent` | [`skills/core/icons/fluent.md`](core/icons/fluent.md) | placing icons inside any Microsoft-idiom scene (VSCodeScene activity bar, Teams rail, Outlook ribbon, Admin Center) |
| `icons/octicons` | [`skills/core/icons/octicons.md`](core/icons/octicons.md) | depicting GitHub UI (GitHubScene) or any source- control concept (branch, fork, commit, merge) |
| `icons/azure` | [`skills/core/icons/azure.md`](core/icons/azure.md) | an architecture diagram (ArchitectureDiagram or AzurePortalScene) references named Azure services. Tracked under `vendored_assets:` in governance-policy.yaml — recolor / crop / flip / rotate /… |

## Director skills (mixable, advisor role — load when planning a video)

| Skill | File | Trigger |
|-------|------|---------|
| `directors/explainer` | [`skills/directors/explainer.md`](directors/explainer.md) | concept-led narrative explainer, "explain X", educational, what/why/how, talking-head style, narrated overview |
| `directors/walkthrough` | [`skills/directors/walkthrough.md`](directors/walkthrough.md) | product/workflow demo, "how to use X", click-through, synthetic UI, screen recording, training, onboarding |
| `directors/social-teaser` | [`skills/directors/social-teaser.md`](directors/social-teaser.md) | short, vertical, social, TikTok/Reels/Shorts, hype clip, captions-mandatory, ≤30s teaser |
| `directors/visual-density` | [`skills/directors/visual-density.md`](directors/visual-density.md) | product video, showcase, demo reel, capability tour, marketing trailer, feature reel, multi-noun narration, ≥80% existing-footage budget, ≤4s shot economy — overlay on top of any other director |
| `directors/recap` | [`skills/directors/recap.md`](directors/recap.md) | team recap, quarterly wins, milestone celebration, "look what we accomplished", recognition, momentum video |
| `directors/council` | [`skills/directors/council/council-meta.md`](directors/council/council-meta.md) | scene planning council, cinematic director, motion designer, concept director, synthesize scene plan, anti-slideshow review |

## Creative skills

| Skill | File | Trigger |
|-------|------|---------|
| `creative/voice-selection` | [`skills/creative/voice-selection.md`](creative/voice-selection.md) | choosing a TTS voice, user voice preference, tone × audience matrix, voice override, "use a male voice", "warm voice" |
| `creative/component-design-system` | [`skills/creative/component-design-system.md`](creative/component-design-system.md) | creating a new component, choosing visual style, selecting colors/typography without a brand package, chart type selection, design system query |
| `creative/gsap-component-patterns` | [`skills/creative/gsap-component-patterns.md`](creative/gsap-component-patterns.md) | authoring or modifying a HyperFrames component animation, choosing GSAP patterns, stagger reveals, counter tweens, node+arrow diagrams, chart animations, data visualization motion |

## Meta skills

| Skill | File | Trigger |
|-------|------|---------|
| `production-loop` | [`skills/meta/production-loop.md`](meta/production-loop.md) | every video production — agentic operating model, intent → brief → script → scenes → assets → compose → review → deliver |
| `checkpoint-protocol` | [`skills/meta/checkpoint-protocol.md`](meta/checkpoint-protocol.md) | every approval gate — what to present, when to pause, how to resume |
| `state-and-decisions` | [`skills/meta/state-and-decisions.md`](meta/state-and-decisions.md) | start of every project — project folder layout, append-only `ledger.jsonl` and `decisions.jsonl`, recovery from interruption |
| `brand-package-linting` | [`skills/meta/brand-package-linting.md`](meta/brand-package-linting.md) | composing with a non-empty `brandPackage` field. Also: brand, color, logo, safe area, typography, watermark |
| `narration-component-sync` | [`skills/meta/narration-component-sync.md`](meta/narration-component-sync.md) | scene planning AND compose. Also: narrationStartSec, sync, timing, reveal, cue, "reveal at", "animate when I say", "sync to voice" |
| `reviewer-operating-model` | [`skills/meta/reviewer-operating-model.md`](meta/reviewer-operating-model.md) | self-review, ReviewerAgent, review report, pass/fail decision, routed findings, checkpoint, independent review |
| `review-evidence-collection` | [`skills/meta/review-evidence-collection.md`](meta/review-evidence-collection.md) | self-review, evidence, inspection, frozen frames, black frames, transcript, OCR, sample frames, render audit, deep review |
| `review-blocker-taxonomy` | [`skills/meta/review-blocker-taxonomy.md`](meta/review-blocker-taxonomy.md) | blocker, warning, severity, fail delivery, black screen, freeze, moderation, compliance, routed owner |
| `render-audit-trail` | [`skills/meta/render-audit-trail.md`](meta/render-audit-trail.md) | render telemetry, audit log, governance trace, ProductionTrace persistence |
| `azure-foundry-setup` | [`skills/meta/azure-foundry-setup.md`](meta/azure-foundry-setup.md) | availability scan reports missing required Azure model deployments, no Foundry resource reachable, OR user explicitly asks to deploy / configure / inspect Azure AI Foundry resources. Do **not** load on routine sessions where models are healthy. |
| `script-template` | [`skills/meta/script-template.md`](meta/script-template.md) | writing or parsing a script (script.md), canonical scene block format, frontmatter schema, [VISUAL:] / [COMPONENT:] tags, words-per-second math, duration footer |

## Provenance & licensing

| Skill | File | Trigger |
|-------|------|---------|
