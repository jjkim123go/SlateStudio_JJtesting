# Director — Recap / Celebration

> **Role:** advisor. Load when the brief calls for a team recap, milestone
> celebration, quarterly wins review, or any "look what we accomplished"
> video aimed at recognition and momentum.
> **Mixable:** yes. Pair with `explainer.md` for context-heavy wins that
> need deeper explanation, or `social-teaser.md` for a short cut-down
> highlight reel.

This is a director skill, not a pipeline. You decide when to apply its
guidance and when the brief overrides it. The full agentic loop is in
[`skills/meta/production-loop.md`](../meta/production-loop.md).

## Research grounding

- Nielsen Norman Group, [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/): avoid irrelevant images and meaningless typography flourishes; keep attention on useful proof.
- Nielsen Norman Group, [Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/): recaps should show recognisable proof points, not rely on the audience remembering context.
- Fluent 2, [Motion](https://fluent2.microsoft.design/motion): choreograph hierarchy so important achievements get more emphasis and less important details move together.

Recap videos are not lists of wins. Each win needs evidence, impact, and a forward cue.

---

## When the recap treatment fits

- Audience needs to *feel good* about what's been achieved — recognition,
  not education.
- There are 2–5 concrete wins to highlight (metrics, launches, milestones).
- The video closes with forward momentum (what's next) rather than a lesson.
- Runtime 30–90s. Past 90s, the energy drops — split into chapters or pair
  a long-form explainer with a recap cold-open.

**Not a recap if:**
- The audience doesn't know the context yet → use `explainer.md` first.
- The goal is to demo a product → use `walkthrough.md`.
- It's a 15s social cut → use `social-teaser.md` and borrow recap beats.

---

## Audience awareness

Recaps are deeply audience-dependent. Calibrate tone:

| Audience | Tone | Pacing | What to emphasize |
|----------|------|--------|-------------------|
| Peer team (stand-up, retro) | Casual, celebratory, high-energy | Fast, punchy | Inside jokes welcome; raw metrics OK |
| Leadership / VP present | Warm but polished, confident | Moderate, deliberate | Business impact, strategic alignment |
| Cross-org / all-hands | Inclusive, accessible | Moderate | Explain acronyms; lead with outcomes not process |
| External / customer-facing | Professional, grateful | Measured | Customer impact, partnership language |

---

## Scene scaffold (recommend, don't enforce)

A solid recap arc has five beats. Compress or expand based on runtime and
number of wins.

| # | Beat | Typical duration | Visual treatment |
|---|------|------------------|------------------|
| 1 | **Opening warmth** — acknowledge the audience, set positive tone | 4–6s | BrandIntro or TitleCard with warm imagery. Narration: "What a quarter." / "Let's celebrate what we built." |
| 2 | **Win 1** — concrete metric or moment with visual proof | 6–12s | MetricsCard for quantitative wins ("P95 latency dropped 63%"), or CompareSlider / before-after for qualitative improvements |
| 3 | **Win 2** — same structure, different visual to keep energy | 6–12s | DataChart for trend data, CustomerStory for testimonials, SlideRenderer for launch announcements |
| 4 | **Win 3** — same structure | 6–12s | Mix components: TerminalCast for a shipped CLI, ScreenDemoFrame for a new UI, MetricsCard for another KPI |
| 5 | **Forward look / CTA** — what's next, momentum | 4–6s | CTABlock for action items, or BrandOutro with a forward-looking tagline |

Each win beat must use a component-backed proof surface when possible. Metrics go to `MetricsCard` or `MetricStack`; product wins go to `ScreenDemoFrame` or synthetic surface scenes; customer proof goes to `CustomerStory`.

For a 60s video this lands 5–6 scenes. Don't pad. If you only have 2 wins,
drop beat 4 and give wins 1–2 more breathing room.

**Scaling:** For 3+ wins, keep each win scene to 6–8s max. For a single
hero win, expand beats 2–3 into a mini-narrative (context → metric → impact)
and skip beats 3–4.

---

## Component matches

| Script trigger | Component | Notes |
|----------------|-----------|-------|
| "X jumped from … to …", "X% improvement" | `MetricsCard` | Count-up animation sells the delta |
| "Before we had … now we have …" | `CompareSlider` | Side-by-side before/after |
| "Our customer said …" | `CustomerStory` | Quote + logo + metric attribution |
| Growth chart, trend over time | `DataChart` | Line or bar chart with animated reveal |
| "We shipped …" (product/feature) | `ScreenDemoFrame` or `SlideRenderer` | Screenshot in device frame, or announcement slide |
| "Get started" / "Join us" / "What's next" | `CTABlock` | Closing action with accent color |
| Team photo / team recognition | Image scene (gpt-image-2) | Photorealistic people — use sparingly |

---

## Visual choice rules

1. **Metrics → MetricsCard, always.** Never ask an AI image model to render
   numbers. MetricsCard's count-up animation is the visual proof point.
2. **Qualitative wins → before/after or customer story.** "We redesigned
   the dashboard" → CompareSlider. "Contoso loved it" → CustomerStory.
3. **Momentum/energy → motion.** Use HyperFrames transitions (crossfade,
   slide) and DataChart animated reveals to keep energy high.
4. **People sparingly.** One team/people image per recap is enough. Use
   gpt-image-2 for photorealism.

---

## Narration rules

- **Pace:** ~150 wpm (≈ 2.5 words per second), same as explainer. 60s
  video = ~150 words. Tight — celebrate, don't ramble.
- **Voice:** warm and celebratory. See
  [`skills/creative/voice-selection.md`](../creative/voice-selection.md)
  for the tone × audience matrix. Defaults:
  - Team recap → `shimmer` (warm, conversational, friendly)
  - VP-present → `coral` (professional, warm)
  - External → `echo` (professional, clear, authoritative)
- **Celebrate, don't list.** "We crushed our latency target — down 63% in
  one quarter" beats "P95 latency went from 380ms to 142ms." The MetricsCard
  shows the numbers; narration says why it matters.
- **Forward look has a verb.** "Next quarter, we're tackling …" or "Join us
  at …" — not "thanks for watching."

---

## Example beats

### Example 1: Team quarterly recap (VP present, 60s)

**Beat 1 — Opening warmth (5s)**
> "Q2 was one for the books. Let's look at what the product team delivered."
> `[COMPONENT: BrandIntro]` with warm background image

**Beat 2 — Win 1 (10s)**
> "Our control execution latency dropped 63% — from 380 milliseconds to 142. That's faster than the blink of an eye."
> `[COMPONENT: MetricsCard]` — label: "P95 LATENCY", value: 142, prevValue: 380, unit: "ms", deltaText: "−63%"

**Beat 3 — Win 2 (10s)**
> "We onboarded three new SOX controls, bringing our coverage to 94% of all revenue streams."
> `[COMPONENT: DataChart]` — bar chart showing coverage by quarter

**Beat 4 — Win 3 (8s)**
> "And our zero-touch automation rate hit 87% — fewer manual interventions, fewer errors, more sleep."
> `[COMPONENT: MetricsCard]` — label: "ZERO-TOUCH RATE", value: 87, prevValue: 71, unit: "%", deltaText: "+16pp"

**Beat 5 — Forward look (5s)**
> "Next quarter, we're targeting full Gen 3 migration. Stay tuned."
> `[COMPONENT: CTABlock]` — eyebrow: "What's next", title: "Gen 3 Migration", ctaText: "View the roadmap"

### Example 2: Casual team retro (peer team, 40s)

**Beat 1 (4s):** "Three wins this sprint. Let's go." `[COMPONENT: TitleCard]`
**Beat 2 (10s):** "The BvR reconciliation now runs in under 2 minutes." `[COMPONENT: MetricsCard]`
**Beat 3 (10s):** "We finally killed the legacy Horizon script for RMCA." `[COMPONENT: CompareSlider]` before/after
**Beat 4 (4s):** "Retro action items are in the backlog. Ship it." `[COMPONENT: CTABlock]`

---

## Self-review checklist (recap-specific)

Before CK-DELIVER, verify:

- [ ] **Opening sets the right energy level** for the audience (casual for
      peers, polished for VP).
- [ ] **Every win has a proof point** — a number, a visual, a quote. No
      "we did great things" without evidence.
- [ ] **No stitched slide deck.** If the recap is a sequence of static image
  scenes with titles, reroute to proof components before render.
- [ ] **Wins are ordered by impact**, strongest first (or strongest last
      for a crescendo — pick one, don't alternate).
- [ ] **Forward look has a verb** — a specific next step, not a vague
      platitude.
- [ ] **Runtime matches audience attention** — peers tolerate 60s, VP
      wants 30–45s, all-hands should stay under 90s.

Score 1–3 on each. Anything at 1 = fix before delivering.
