# Prompting Tips for Premium Slate Videos

> A practical guide for users working with Slate (the agentic video production
> engine) to consistently produce videos that look **alive, cinematic, and
> premium** — not generic "AI-slop".
>
> Slate is a director, not a renderer. The quality of the output is shaped
> heavily by *how you brief it*. The tips below are distilled from real
> production sessions where users iterated from B+ output to A+ output.

---

## How to Use This Guide

- Read the **TL;DR cheat sheet** at the bottom for a copy-paste prompt template.
- Skim the section headings to find the lever you want to pull (animation,
  components, sound, pacing, etc.).
- For iteration / feedback rounds, the **"Iterate With Visual Specificity"**
  and **"Anti-Patterns"** sections will save you the most time.
- The **"#1 Failure Mode"** and **"Verification — Catch Issues Before
  Delivery"** sections are distilled from real production rounds where users
  had to push the agent through 3+ revisions to reach A+ quality. Read them
  *before* your first run, not after.

---

## 🚨 The #1 Failure Mode: two opposite traps (chrome vs design)

There are **two** opposite traps, and which one applies depends on the kind of
scene. Getting this backwards is the most common reason a first pass looks like
AI-slop.

**Trap A — faking real product chrome.** When a scene shows real software —
"a Windows File Explorer with our evidence files", "an Outlook calendar with the
rollout dates", "a VS Code workspace" — Slate has polished, registered **chrome**
components (`WindowsScene`, `OutlookScene`, `VSCodeScene`, `TerminalCast`,
`ScreenDemoFrame`, …). If you don't name them, the agent may hand-draw window
chrome from rectangles + text, or paste a generated screenshot — which looks
hand-drawn and PowerPoint-y. **For product chrome: name the component; never
hand-draw a fake app.**

**Trap B — filling a catalog "design" component.** The opposite trap, and the more
insidious one: for *design / explanatory* scenes (diagrams, charts, metrics,
steps, comparisons, abstract or hero moments), reaching for a finished catalog
component (`MetricsCard`, `DataFlow`, `StepByStep`, `CompareSlider`,
`TerminologyCard`…) makes every video converge on the same ~10 looks. **For
design scenes: don't fill a catalog component — have Slate commit a per-video art
direction and hand-stitch the scene from primitives** (GSAP / SVG / Canvas). See
[`skills/creative/art-direction.md`](../skills/creative/art-direction.md) and
[`scene-primitives.md`](../skills/creative/scene-primitives.md).

**Why it happens:** The agent is biased toward "build something" over
"discover what exists". Without an explicit instruction, scene planning
defaults to layered shapes/text instead of querying the component catalog.

**How to prevent it (do all three):**

1. **Force a component-discovery pass before scene planning.** Add this to
   your brief:
   > *"Before scene planning, list every scene that involves a real software
   > UI (Windows, Mac, browser chrome, Outlook, Teams, VS Code, Excel,
   > terminals, file explorers, charts, tables, code) and name which
   > registered component will render it. If no component exists for one of
   > those scenes, **say so and create one** before the scene plan is
   > approved. Do not hand-draw a UI from primitives."*

2. **Name the component explicitly when you describe the scene.** Don't say
   "show a calendar with the launch dates" — say *"use `OutlookScene` with
   a 3-month calendar (Apr / May / Sep) showing Phase 1, Phase 2, GA as
   real calendar events on the actual day cells"*.

3. **Reject hand-drawn UIs in feedback.** If you see a scene that looks
   like rectangles-and-text trying to be a real app, write back:
   > *"Replace this with the actual `<ComponentName>` component. There is
   > a real `<X>Scene` in the registry. Do not roll your own."*
   The fix is usually one component swap, not a redraw.

**Bonus directive that stops improvisation cold:**
> *"For every scene, justify the choice: which registered component am I
> using, and why? If you are about to layer shapes/text to imitate a
> familiar UI, stop and either find the registered component or build a
> new one — never imitate."*

---

## 🎯 Frame the Brief Like a Director, Not a Spec

- **Lead with audience + emotion**, not features.
  - ❌ "Show our product."
  - ✅ "Make a 90s explainer that makes a busy PM feel *relieved* this finally exists."
- **Give a reference**: "Apple keynote vibe", "Stripe explainer style",
  "Vercel launch reel" — sets aesthetic in one phrase.
- **State the constraint explicitly**: "Premium, alive, not AI-slop".
  Slate listens for these adjectives and dials up motion / polish.
- **Name the theme up front**: e.g. "white + radar blue" or
  "matte navy + warm gold" — locks the palette across every component.
- **Tell it the deployment context**: "internal exec review", "social teaser",
  "developer onboarding" — changes pacing, captions, and tone defaults.

---

## 🎬 Demand Animation, Forbid Static

- Say *"animate the user doing X"* instead of *"show a screenshot of X"*.
  Triggers synthetic UI demos with cursor + interaction, not pasted PNGs.
- Use motion verbs: **fly in, zoom, pan, parallax, stroke-draw, type out,
  count up, ripple, lift, settle**.
- "No cut-out scenes — full screen, edge to edge" → kills awkward thumbnail
  crops that scream "stock asset".
- "Every screen should *do something*" → forces every scene to have at least
  one tween.
- "Add subtle camera moves between scenes (slow push-in, gentle pan)" →
  adds cinematic continuity instead of hard cuts.

**Critical: Match animation length to narration length.** A common failure
is a scene where the visual finishes its animation in 1–2 seconds (e.g.
`TerminalCast` types 30 chars in 1.5s) but the narration runs for 8s — the
remaining 6.5s is dead air on a frozen frame. Add this to your brief:

> *"For every scene, the visual motion must occupy the FULL narration
> length, not just the first beat. If the component finishes early, slow
> the typing, stagger reveals, add follow-on micro-motion (cursor blink,
> highlight pass, value tick), or break the content into more steps. No
> scene should hold a frozen frame for more than 1 second of narration."*

---

## 🧩 Push for Custom Components Over Stitched Overlays

This is the **single biggest lever** for premium output. It's so important
it's also called out as the #1 failure mode at the top of this doc — read
that section first.

- **Reuse chrome; hand-stitch design.** Tell the agent:
  > *"For product-UI scenes, use the matching registered chrome component
  > (`VSCodeScene`, `OutlookScene`, …) — never hand-draw a fake app. For design /
  > explanatory scenes (diagrams, charts, metrics, steps, comparisons), do NOT
  > fill a catalog component — commit an art direction and hand-stitch from
  > primitives so the video doesn't look like every other one."*
- Say **"create a new component if none exists"** — Slate has
  component-authoring skills it won't invoke unless asked.
- Stitching divs on top of a screenshot looks cheap and drifts under camera
  moves. Native components don't.
  - ❌ "Overlay a search box on the screenshot" → drift / misalignment
    when the camera zooms.
  - ✅ "Build a real search interaction inside the marketplace canvas" →
    native GSAP, perfect alignment under any zoom.
- "Imagine the report — don't show the screenshot" gives the agent
  permission to *invent* a Radar-style report from scratch.
- For UI demos: **"animate as if recording someone's screen"** dictates
  cursor movement, focus rings, typing rhythm.
- For complex flows: **"build it like Outlook / Teams / VS Code does it"** —
  reference the interaction model of polished consumer apps.
- **Beware hardcoded component defaults.** Some components ship with a
  default accent color (e.g. cyan-indigo) that may ignore your brand
  palette. Add to your brief:
  > *"Audit every component used for hardcoded colors before render. Patch
  > the component to honor my palette tokens, or replace it. Do not let a
  > stray cyan or default blue appear in a velvet/warm/branded video."*

---

## ✨ Demand Premium Visual Language

- Avoid words like "ppt-style", "boxes", "panels". Use:
  - **"glass cards"** (translucent + blurred backdrop)
  - **"matte sheen"** (no shiny gradients)
  - **"soft shadows"** (premium depth, not drop-shadow stamp)
  - **"depth"** / **"3D parallax"** (multi-layer scenes)
- "Use the design-system tokens, not flat fills" → invokes brand-token
  gradients and elevation shadows.
- "Add subtle micro-motion on every card — breathing, hover lift, idle pulse"
  → no scene feels frozen, no awkward dead air.
- "Use Three.js / WebGL for the hero if it adds depth" → unlocks 3D
  backgrounds. If you know the system: add **`--use-gpu` with 2 workers** for
  smooth WebGL capture.

---

## 🎨 Lock the Palette Before Anything Renders

Color words like "deep purple", "matte navy", "warm gold" are interpreted
loosely. "Deep purple matte sheen" can land as dark blue, deep violet, or
muted aubergine — three very different feelings. Don't discover this after
a 12-minute render.

**Force a swatch checkpoint:**

> *"Before any scene renders, generate a 1080×270 palette swatch image
> showing every color in the proposed palette (BG base, BG deep, primary,
> secondary, warm/accent, body text). Show it to me with hex codes labeled.
> If I reject the palette, regenerate. Do not proceed to scene rendering
> until I approve the swatch."*

**Use precise palette language.** Compare:

- ❌ "Use deep purple."
- ✅ "Use a *velvety dark plum* — warm undertone, not blue-leaning. Think
  Burgundy meets aubergine, not navy. Hex around `#1B0E33` to `#2A1838`
  for backgrounds; `#B27AF0` velvet lilac for primary accents; `#D69EE8`
  dusty mauve for secondary."

**Audit components for hardcoded colors.** Some shipped components have
default gradients (e.g. cyan-indigo for `MetricStack` numeric values) that
override the brand palette. Add to the brief:

> *"Before render, audit each component for hardcoded colors. Either pass
> palette tokens via props or patch the component (backward-compatible) to
> read from data attributes. No off-palette accents in the final output."*

**Smoke-test on one scene first.** For long videos (>60s), render a single
representative scene at quality `medium` first — eye-check the palette,
then commit to the full render.

---

## 🎵 Get the Sound Design Right

- Specify music *mood + tempo*: "warm electronic, mid-tempo, builds at 60s".
  Vague briefs get generic tracks.
- "Duck music under narration aggressively" → narration stays crisp.
- Mention if narration should sound human:
  **"warm conversational voice, not corporate VO"** → routes to better TTS
  voices (e.g. coral, nova).
- Long video? Just say **"and loop the music"** — Slate now does this
  natively (background music shorter than the composition will repeat).
- "Add a subtle audio swell on the hero moment" → emotional punctuation.

---

## 🪜 Pace Like a Story, Not a Slideshow

- Give a **3-act arc** in the brief: *Pain → Solution → Magic moment*.
  The agent will allocate scene durations accordingly.
- "Don't rush the hero moment — give it 6+ seconds" → critical scenes get
  breathing room.
- "Cut faster in the demo, slower in the close" → variable pacing instead of
  uniform 8-second scenes.
- Allow it to break the budget: "Go beyond 90s if the marketplace section
  needs more focus" — quality > arbitrary length.
- "Open on a question, close on a confident answer" → narrative bookends.

---

## 🗣️ Iterate With Visual Specificity

When something looks off, vague feedback gets vague fixes.

- ❌ "It looks bad."
- ✅ "The blue is too saturated — make it a matte sheen, not crayon. Side
  panels at 60% opacity look ghostly — push to 95%."

Tactics:

- **Annotate frames**: tell the agent *which timestamp and which element*.
  "At 0:31 the Dashboard panel overlaps the subtitle — relocate it."
- Ask **"why?"** when something feels off. "Why is there a blank panel at
  0:78?" → agent will trace and remove it instead of just hiding it.
- Compare to a target: **"This feels like a webinar slide. Make it feel like
  an Apple product page."**
- Say **"escalate to A+"** when the bar shifts — Slate has a polish-round
  workflow that re-reviews every scene.
- **Force a self-critique pass.** After every render, before showing the
  video to you, ask the agent:
  > *"Self-critique the video on every dimension (component fit, palette
  > adherence, animation-narration sync, content-visual relevance,
  > placeholder usage, decorative-vs-meaningful imagery). Surface anything
  > below A-quality with a timestamp and proposed fix. Do not tell me 'good'
  > if there's a flaw — fix it first or flag it explicitly."*

---

## 📚 Use Source Materials As Ground Truth — Forbid Placeholders

When you give Slate a folder of references (specs, design docs, slide
decks, READMEs), it should pull every name, term, screenshot, and product
string from there. Without an explicit instruction, the agent often falls
back to safe placeholders ("Contoso", "Acme", "ProductName", "Customer") —
which makes the video feel generic and AI-generated.

Add this to your brief whenever you provide source material:

> *"All product names, team names, file names, customer names, and brand
> strings must come from the source material at `<path>`. **Do not use
> Contoso, Acme, ExampleCorp, or any placeholder.** If a name is missing
> from the source, ask me — don't invent. Real evidence file names, real
> ticket IDs, real domain language wherever possible."*

Bonus: tell the agent which terms are non-negotiable:

> *"The product is called **MAGE** (Master Agent for Gathering Evidence).
> The team is **Financial Controls**. The audit cycle is **FY26-Q3**.
> These exact strings appear in every relevant scene."*

---

## 💰 Budget Directives That Stick

When you say "go big, cost is no concern", Slate's stage-gate workflow
will *still* pause to confirm spend at every checkpoint — because that's
its safe default. To skip that loop, be explicit:

> *"I authorize unlimited spend on this video. Do not pause to ask for
> cost approval at any checkpoint. Spend whatever the quality requires —
> Sora-2 video clips, multiple gpt-image-2 generations, full reviewer
> sub-agent runs, re-renders. Just keep going and report total cost at the
> end."*

Conversely, if budget is tight:

> *"Hard cap: $5. If a planned scene would push us over, downgrade the
> approach (use a static image instead of a Sora clip; reuse a generated
> image instead of regenerating). Show me the cost forecast before assets
> render."*

---

## 🖥️ Hardware Directives — Don't Let Them Get Silently Dropped

If you specify GPU usage, worker count, or a specific renderer, the agent
might hit a hardware limitation and silently fall back without telling
you. Force transparency:

> *"If I specify GPU usage, worker count, NVENC, or a specific render
> backend and you cannot honor it on this hardware, **stop and tell me
> why** before rendering. Do not silently change my flags. If you have
> to deviate, explain the constraint at the moment of the choice — not
> after delivery."*

Common hardware traps to know about:

- `--use-gpu true` requires a real NVIDIA GPU with NVENC. Hyper-V VMs
  expose only a virtual adapter — NVENC will crash. WebGL d3d11 capture
  is still GPU-accelerated even without `--use-gpu`.
- Increasing `--workers` past 2 helps only if you have GPU + VRAM
  headroom; on a CPU-bound box, 3+ workers can hang the desktop.
- WebGL-heavy renders should start at `--workers 1 --safe-webgl` and only
  scale up after a successful single-scene probe.

---

## 🛡️ Trust + Transparency Phrases That Work

These phrases trigger Slate's stage-gate review behavior:

- **"Show me the brief before generating"** → forces stage-gate review.
- **"Estimate cost first"** → honest budget summary upfront.
- **"Use real data from the spec, not placeholders"** → grounds visuals in
  source material (PRs, docs, designs you reference).
- **"Run the reviewer subagent after rendering"** → triggers P6 quality
  scoring across 8 dimensions (brand, captions, audio, visual consistency,
  pacing, accuracy, redundancy, narration timing).
- **"Walk me through the scene plan before assets"** → catches plan-level
  issues before money is spent on generation.

---

## 🎁 Micro-Hacks That Punch Above Their Weight

Small additions, big polish gain:

- **Add a kicker line**: "Each scene needs a small uppercase label in the
  top-left" — instant editorial polish.
- **Ask for a sparkline, counter, or mini-chart** in any data scene —
  counters tweening from 0 → final value feels alive.
- **Request "phase pills"** for any multi-step flow
  (`1·Detect → 2·Render → 3·Review`) — visual progress = comprehension.
- **"Cursor with click ripple"** for synthetic UI demos — sells the recording
  illusion.
- **"Sentence captions, not karaoke"** for executive videos;
  **"word-highlight"** for social / TikTok.
- **"Open with a wide shot, push in on the second beat"** — classic film
  language the agent understands.
- **"Use a vignette overlay only on hero scenes"** — focuses the eye without
  feeling heavy-handed everywhere.

---

## 🚫 Anti-Patterns to Call Out Explicitly

State these in the brief or in feedback to prevent them up front:

- **"No hand-drawn UI when a registered component exists"** — call out
  Windows Explorer, Outlook, VS Code, Teams, browser chrome by name.
- **"No generic placeholders"** — Contoso, Acme, FooCorp, ExampleCustomer
  are forbidden when source materials supply real names.
- **"No animations that finish before narration ends"** — every motion must
  occupy the full narration window.
- **"No silent override of explicit hardware/budget directives"** — if
  `--use-gpu`, `--workers`, or unlimited spend can't be honored, surface
  the constraint immediately, don't quietly change flags.
- **"No cost reconfirmation prompts after unlimited budget is authorized"**
  — once spend cap is lifted, stop asking.
- **"No decorative imagery unrelated to scene narration"** — a 3D globe in
  a finance-evidence scene is noise, not polish.
- **"No off-palette accent colors from hardcoded component defaults"** —
  audit and patch.
- "No floating buttons appearing on top of UI screens unless functional"
- "No mystery empty panels — every element must earn its place"
- "Don't paste static screenshots if a real interaction is possible"
- "Don't repeat narration content across scenes"
- "Don't end on a fade-to-black — end on a confident card with a CTA"
- "No generic stock-photo metaphors (handshakes, lightbulbs, gears)"
- "No emoji in titles unless the brand explicitly uses them"

---

## 🔍 Verification — Catch Issues Before You Watch the Whole Render

A 3-minute video takes ~12 minutes to render. Don't watch the whole thing
to discover scene 4 is empty. Force a verification pass *before* delivery:

> *"After render but before showing me the video, extract a still frame
> at the midpoint of every scene (use the scene timings from the SCF).
> Inspect each frame for: empty/black render, missing text, off-palette
> color, component crash, placeholder strings. Surface anything broken
> with the timestamp and the proposed fix. Re-render the affected scenes
> if needed. Only then show me the final video."*

Bonus check for narration-heavy scenes:

> *"For any scene with narration > 4 seconds, sample frames at the
> midpoint AND at narration-end-minus-1s. If the frames are visually
> identical (frozen), the animation is too short — fix it."*

This catches the failure where a `TerminalCast` types a single short
command in 2s but the scene runs for 10s: the last 8s look broken even
though the render technically succeeded.

---

## 🧠 Working With Slate's Component Library — reuse chrome, hand-stitch design

**The classification step is non-negotiable.** Before any scene is planned,
the agent should split scenes into two kinds and treat them oppositely:

- **Product chrome** (real software UIs) → **reuse** the registered chrome
  component; never hand-draw a fake app.
- **Design / explanatory / abstract** (diagrams, charts, metrics, steps,
  comparisons, hero moments) → **hand-stitch** from primitives under a committed
  art direction; do **not** fill a catalog component (that's the sameness trap).

Lead your brief with:

> *"Classify every scene: product-chrome vs design. For chrome, name the
> registered chrome component (VSCodeScene, OutlookScene, …) and never hand-draw
> a fake UI. For design / explanatory scenes, commit a per-video art direction
> and hand-stitch from primitives (GSAP/SVG/Canvas) — don't fill a catalog design
> component. Show me the per-scene treatment plan before approving the scene
> plan."*

Reference by name in your prompts:

**Product chrome — reuse the component (don't fake it):**

| If you want to show… | Ask for… |
|---|---|
| Code, CLI commands | "TerminalCast / VSCodeScene — animated typing, no screenshots" |
| Windows Explorer / file browser | "WindowsScene — real File Explorer chrome with file rows" |
| Outlook / calendar | "OutlookScene — real Outlook chrome with calendar/inbox modes" |
| Teams / Excel / Azure portal / GitHub | "TeamsScene / ExcelScene / AzurePortalScene / GitHubScene" |
| Synthetic web / app demo | "ScreenDemoFrame / EdgeBrowserScene around the content" |
| Brand bookends | "BrandIntro / BrandOutro — logo reveal + tagline" |

**Design / explanatory — hand-stitch from primitives (don't fill a catalog look):**

| If you want to show… | Ask for… |
|---|---|
| Architecture / data flow | "a hand-stitched node+arrow diagram on this video's art direction — not the default DataFlow" |
| Numbers / KPIs | "a bespoke count-up / data moment in the art-direction's material — not a default MetricsCard" |
| Charts | "a hand-stitched chart (SVG/Canvas); use DataChart only if you need exact chart.js axes, then restyle it" |
| Steps / comparisons | "a bespoke sequence / split designed for this video — not a default StepByStep / CompareSlider" |

For design scenes, point the agent at
[`art-direction.md`](../skills/creative/art-direction.md) +
[`scene-primitives.md`](../skills/creative/scene-primitives.md). Bespoke one-offs
are authored project-scoped (`projects/<slug>/components/`), not added to the
global catalog.

**Audit hardcoded colors before render** — see the *Lock the Palette*
section above. A component may ship with a default cyan-indigo gradient
that ignores your brand palette unless you patch it or pass overrides.

---

## 📋 Stage-Gate Checkpoints — Use Them

Slate pauses for review at these points. Use them deliberately instead of
saying "just render it":

1. **After ingest** — confirms what it understood from your inputs.
2. **After brief** — locks audience, tone, duration, theme, slug.
3. **After script** — review the narration before any TTS spend.
4. **After scene plan** — confirms each scene's component + treatment.
5. **After assets** — verify generated images / clips before composing.
6. **After render** — review the MP4 before delivery.

Skipping checkpoints saves time on tiny videos but burns budget on big ones.
For anything > 60s, **always review the script and scene plan**.

---

## 🎨 Theme & Brand Tips

- If you have a brand package, **mention it in the first message** — Slate
  will load tokens (colors, fonts, logo) and apply them everywhere.
- No brand package? Describe a palette in plain English:
  *"clean white background, radar blue accents (#0067b8), warm grey text"*.
- "Use the same accent color for all headlines, CTAs, and active states" →
  visual consistency without naming a token system.
- "Logo placement: top-left on intro, bottom-right small on outro" →
  precise placement language works better than "add the logo".

---

## ⏱️ When To Tell Slate To Iterate

After the first render, do a **structured pass**:

1. **Watch end-to-end with sound** — note timestamps where you flinch.
2. **Pause on hero frames** — are they screenshot-able for marketing?
3. **List specific issues with timestamps** — feed them all in one message.
4. **Group fixes by type**: visual / animation / audio / pacing / content.

Avoid drip-feeding feedback one issue at a time — Slate batches fixes more
efficiently when given a structured list.

---

## TL;DR — Cheat Sheet Prompt Template

Copy, fill the blanks, paste:

> Make a **[duration]** premium **[theme]** explainer for **[audience]**.
>
> **Goal**: make them feel **[emotion]** about **[product / change]**.
>
> **Arc**: [pain] → [solution] → [magic moment / CTA].
>
> **Constraints**:
> - **Reuse chrome, hand-stitch design**: name the chrome component for
>   product-UI scenes; for design / explanatory scenes commit an art direction
>   and hand-stitch from primitives (don't fill a catalog component). Show the
>   per-scene treatment plan before approving.
> - **Lock the palette via swatch** before any render. Hex codes, not
>   color words. Audit components for hardcoded colors.
> - **Animation must run the full narration length** of every scene.
>   No frozen frames after a fast reveal.
> - Animate every scene end-to-end. No static screenshots, no cut-outs.
> - Use design-system tokens, glass cards, soft depth.
> - **Pull all names/terms from the source material at `<path>`. No
>   placeholders (Contoso/Acme/FooCorp).**
> - Reference: **[Apple keynote / Stripe / Vercel / etc.]** vibe.
>
> **Audio**: **[mood]** music, ducked under a warm conversational narration.
> Loop music if needed.
>
> **Pacing**: faster cuts in demo, slower on hero / close. Don't rush the
> magic moment.
>
> **Budget**: I authorize unlimited spend — don't pause for cost
> reconfirmation. *(Or: hard cap $X — downgrade approach if over.)*
>
> **Hardware**: Use GPU + 2 workers. If you can't honor this, stop and
> tell me why before rendering.
>
> **Workflow**: Show me the brief first. Estimate cost. Stage-gate review on
> script and scene plan. Run the reviewer subagent after render. **Extract
> midpoint frames per scene before delivery — surface anything broken or
> off-palette.**
>
> **Inputs**: [paste paths to spec docs, PRs, screenshots, brand assets].

---

## Related Reading

- [`COMPONENT_CATALOG.md`](COMPONENT_CATALOG.md) — what each component does
- [`COMPONENT_REFERENCE.md`](COMPONENT_REFERENCE.md) — full component prop schemas
- [`EXAMPLE_USE_CASES.md`](EXAMPLE_USE_CASES.md) — sample briefs by archetype
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how Slate's pipeline works under the hood
