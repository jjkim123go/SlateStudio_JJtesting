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

---

## 🧩 Push for Custom Components Over Stitched Overlays

This is the **single biggest lever** for premium output.

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

- "No floating buttons appearing on top of UI screens unless functional"
- "No mystery empty panels — every element must earn its place"
- "Don't paste static screenshots if a real interaction is possible"
- "Don't repeat narration content across scenes"
- "Don't end on a fade-to-black — end on a confident card with a CTA"
- "No generic stock-photo metaphors (handshakes, lightbulbs, gears)"
- "No emoji in titles unless the brand explicitly uses them"

---

## 🧠 Working With Slate's Component Library

Slate's component library is designed to mix and match. Key components to
reference by name in your prompts:

| If you want to show… | Ask for… |
|---|---|
| Code, CLI commands | "Use TerminalCast / VSCodeScene — animated typing, no screenshots" |
| Architecture / data flow | "DataFlow component — nodes pop in, arrows stroke-draw" |
| Numbers / KPIs | "MetricsCard or MetricStack — animated counters" |
| Charts | "DataChart — animated bar / donut with reveal" |
| Tables / comparisons | "PricingTable or ExcelScene — row-by-row reveal" |
| Synthetic UI demo | "ScreenDemoFrame around a custom component — not a screenshot" |
| Chat / Copilot interaction | "OmartCopilotChat-style — VS Code chrome + chat panel + phase pills" |
| Brand bookends | "BrandIntro / BrandOutro — logo reveal + tagline" |

If a component you need doesn't exist, **say so**: "There's no good
component for this — please create one." Slate will spawn a sub-agent to
build it (component-authoring + design-system + GSAP skills auto-load).

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
> - Animate every scene end-to-end. No static screenshots, no cut-outs.
> - Build new components for **[X]**, **[Y]** if none exists.
> - Use design-system tokens, glass cards, soft depth.
> - Reference: **[Apple keynote / Stripe / Vercel / etc.]** vibe.
>
> **Audio**: **[mood]** music, ducked under a warm conversational narration.
> Loop music if needed.
>
> **Pacing**: faster cuts in demo, slower on hero / close. Don't rush the
> magic moment.
>
> **Workflow**: Show me the brief first. Estimate cost. Stage-gate review on
> script and scene plan. Run the reviewer subagent after render.
>
> **Inputs**: [paste paths to spec docs, PRs, screenshots, brand assets].

---

## Related Reading

- [`COMPONENT_CATALOG.md`](COMPONENT_CATALOG.md) — what each component does
- [`COMPONENT_REFERENCE.md`](COMPONENT_REFERENCE.md) — full component prop schemas
- [`EXAMPLE_USE_CASES.md`](EXAMPLE_USE_CASES.md) — sample briefs by archetype
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how Slate's pipeline works under the hood
