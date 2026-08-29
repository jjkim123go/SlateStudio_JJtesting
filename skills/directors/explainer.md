# Director — Explainer

> **Role:** advisor. Load when the brief calls for a concept-explanation
> video aimed at understanding (executive overviews, product explainers,
> training intros, "what is X / why it matters" pieces).
> **Mixable:** yes. Pair with `walkthrough.md` for live-app demo segments,
> or `social-teaser.md` for short cut-down versions.

This is a director skill, not a pipeline. You decide when to apply its
guidance and when the brief overrides it. The full agentic loop is in
[`skills/meta/production-loop.md`](../meta/production-loop.md).

## Research grounding

Use these external sources as constraints, not decoration:

- Nielsen Norman Group, [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/): remove visual clutter, build on known mental models, and offload memory work into visible structure.
- Nielsen Norman Group, [Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/): prefer visible cues and recognition over forcing the viewer to remember prior narration.
- Material Design, [Understanding motion](https://m2.material.io/design/motion/understanding-motion.html): motion should be informative, focused, expressive, and should reveal hierarchy or feedback.

If a proposed scene is mostly text on an image, treat that as a failed explainer scene unless the text is the object being explained.

---

## When the explainer treatment fits

- Audience needs to *understand* something they don't yet know.
- The visual job is to make abstract concepts concrete (analogies, metaphors,
  diagrams, structured visuals).
- Runtime 30–120s. Past 120s, restructure as multi-chapter or hand the
  middle section to `walkthrough.md`.

If the brief is "show our app in action" or "demo the dashboard", you want
`walkthrough.md`, not this. If the brief is "30s social cut for LinkedIn",
load `social-teaser.md` and use this only as scaffolding.

---

## Scene scaffold (recommend, don't enforce)

A solid explainer arc has five beats. Compress or expand based on runtime.

| # | Beat | Typical duration | Visual treatment |
|---|---|---|---|
| 1 | Hook — name the problem | 4–6s | BrandIntro or TitleCard with strong visual |
| 2 | Stakes — why it matters | 4–8s | Visual proof: metric, UI state, concrete example, or image with motion |
| 3 | The idea — your concept | 8–16s | Sequenced structured visual or component reveal; split into 3–4s beats |
| 4 | Proof / specifics | 8–20s | Concrete example. Prefer component, dashboard, diagram, or walkthrough segment |
| 5 | Close — CTA / takeaway | 4–8s | BrandOutro |

For a 60s video this lands ~6–8 scenes. Don't pad. Cut a beat before adding
narration to fill time.

---

## Narrative spine — walk one example, don't list the topic

The five beats are structure, not continuity. Choose one recognizable person,
decision, situation, or artifact and let it accumulate change from hook to
close. Each scene should inherit a question, action, or consequence from the
previous scene. If most scenes still make sense after random reordering, the
script is probably an encyclopedia of facts rather than an explanation.

For mixed audiences, use the least specialized shared situation as the primary
example. Introduce code, APIs, builds, or model internals later as supporting
proof, not as the only entrance into the idea. Show the concrete situation
before naming unfamiliar jargon, then use the term consistently.

Write the spine as three states before scripting:

1. **Before:** what is hard, incomplete, or repeatedly manual?
2. **During:** what changes as the concept is applied?
3. **After:** what can the person now see, decide, or do?

Load [`creative/narration-writing.md`](../creative/narration-writing.md) for the
full planning, drafting, and editing contract.

---

## Visual choice rules

These are the explainer-specific applications of P5 (Deep Artifact
Understanding) and the structured-visual rule from
`skills/core/structured-visuals.md`:

1. **Concepts → metaphors via image generation.** "AI insight engine"
   becomes "telescope at night" or "lighthouse beam" — use gpt-image-2 for
   both photorealistic and illustrated styles.
2. **Comparisons → CompareSlider, PricingTable, or DataChart component.** Never have an
   AI image model render a comparison table; it will hallucinate the
   numbers. Use `structured_image` only if pixel-perfect static fidelity is required.
3. **Process / flow → DataFlow or ArchitectureDiagram component.** Animated
   node+arrow reveal guides the audience through structure far better than a static PNG.
4. **People / human moments → gpt-image-2.** Use sparingly; one human-face
   scene per explainer is usually enough.
5. **Abstract claims → component-first visual proof.** Use `ArchitectureDiagram`,
  `DataFlow`, `MetricStack`, `BookPageMetrics`, `CompareSlider`, or
  `ScreenDemoFrame` before asking for a decorative generated image.
6. **One idea per scene.** If the narration asks the viewer to hold more than
  three concepts at once, split the scene or use a sequenced component reveal.
7. **Narration claim → visible evidence.** Every named object in narration
  must show up in the same visual beat. Do not say "metric over time" without
  a metric dashboard/chart, "architecture" without a node/arrow diagram,
  "spreadsheet" without an Excel/table surface, or "Copilot in VS Code" without
  a moving VS Code/Copilot surface.
8. **No long static holds.** A narrated scene longer than 4s needs internal
  visual beats, a video layer, or transcript-anchored component states.

---

## Narration rules

- **Pace:** ~150 wpm (≈ 2.5 words per second). 60s video = ~150 words total
  across all scenes. Tight.
- **Voice default:** `coral` for friendly-professional, `nova` for
  authoritative, `echo` for measured/serious. Confirm with brief tone.
- **Don't narrate what's on screen.** If a structured visual already shows
  the comparison, the narration should explain *why it matters*, not read
  it aloud.
- **Write for the least familiar primary viewer.** Use a concrete shared
  situation before a technical name, then explain the mechanism with active
  actors and verbs.
- **Edit in separate passes.** Utility, coherence, grounding, and read-aloud
  quality are mandatory before script approval. Do not ask an LLM to judge its
  own draft with one holistic "is this good?" prompt.

---

## Self-review checklist (explainer-specific)

Before CK-DELIVER, verify:

- [ ] **Hook lands in 4 seconds.** A bored viewer scrolls.
- [ ] **One core idea, not three.** If the brief had three ideas, you
      negotiated down to one or split into multiple videos.
- [ ] **One accumulating example.** The same recognizable situation or artifact
  changes from problem to result; scenes cannot be freely reordered.
- [ ] **Jargon is earned.** The least familiar primary viewer sees or hears the
  concrete situation before its technical name.
- [ ] **Passes the ear test.** Read aloud, the narration sounds like one person
  explaining causality rather than a sequence of slogans or slide headings.
- [ ] **Every scene's visual answers the narration's question** (not just
      decorates it).
- [ ] **Every spoken noun has visual support** in the same beat; no generic art
  behind specific claims.
- [ ] **No single visual stays on screen for more than 3-4 seconds** unless it
  is a moving video layer or an actively sequenced component.
- [ ] **Captions exist** for all narration unless the user opted out.
- [ ] **No slideshow drift.** Three image-plus-text scenes in a row means the
  plan must be re-routed through components or synthetic scenes.
- [ ] **Close has a verb.** "Try the docs", "request access", "watch
      part 2" — not "thanks for watching".

Score 1–3 on each. Anything at 1 = fix before delivering.

---

## Salvaged from the prior stage-bound skills

The prior `skills/pipelines/animated-explainer/` directory had per-stage
director files. The agentic loop replaces "stages" but the per-step
guidance is preserved here in compressed form. If you need the original
deeper how-tos, check git history — they were thorough but redundant with
the core skills (`hyperframes-rendering.md`, `ffmpeg-audio.md`,
`structured-visuals.md`, `narration.md`) which remain authoritative.
