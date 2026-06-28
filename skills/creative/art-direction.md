# Art Direction — the per-video visual identity contract

> **Creative — Layer 2. Load at BRIEF → SCENE-PLAN, before choosing any
> component.** Mandatory for every video.
> Companions: [`component-design-system.md`](component-design-system.md)
> (design-data lookup), [`premium-motion-routing.md`](premium-motion-routing.md)
> (treatment tier), [`design-critic.md`](design-critic.md) (the gate that
> checks you actually followed this).

## Why this exists

Slate videos look the same because the agent's creative act has been *"pick a
finished component from the catalog and fill its props."* That is templating.
Variety becomes "use a different catalog item," so every video converges on the
same ~10 components and reads like a styled slide deck.

The fix is not more components. It is **a distinct, coherent art direction per
video, that every scene must express** — and a shift from *selecting* components
to *composing bespoke scenes* that embody that direction. Two videos with
different art direction will not look alike even if they share primitives.

## Step 1 — Commit to an Art Direction (before scene planning)

Write `projects/<slug>/art-direction.json`. Decide these seven things and treat
them as binding for the whole video. **The `Example` column below shows *one
hypothetical* video purely to illustrate each field — it is not a menu to pick
from or a default to reuse. Invent values specific to *this* brief; never carry
an example value (or a previous video's choice) into a new video.**

| Field | What it is | Example |
|---|---|---|
| `concept` | One sentence: the metaphor *world* this video lives in. Not the topic — the *look* of the topic. | "An architect's blueprint coming to life, line by line." |
| `palette` | bg/surface ramp (3–4 steps) + 1 accent + 1 secondary, **plus a gradient-mesh spec** (2–3 color stops + angle). Ground in design-data, then deviate to be distinctive. | bg `#0A1A2F`→`#12345A`, accent `#5EE0C8`, mesh `linear 135deg #0A1A2F → #163E6B → #5EE0C8@8%` |
| `material` | ONE surface personality, used everywhere. | glass · liquid · paper · metal · holographic · matte · blueprint-ink |
| `motionSignature` | A *named* movement language + 2–3 concrete rules. | "Drafting": elements stroke-draw on like ink, then settle with a 6px float; camera drifts, never cuts hard. |
| `composition` | Layout grammar + type scale + negative-space rule. | Asymmetric editorial; headline 120px top-left, content lower-right third; ≥45% empty. |
| `signatureMotif` | ONE recurring element that is *connective tissue* — a transition, a recurring mark, a persistent edge element, a material echo — that ties scenes together. **It is NOT the hero visual of every scene.** Let it own the hook + one hero + the close; elsewhere it is a ≤20% accent. | A grid-line that redraws between scenes; a thin context-meter pinned to one edge; a single travelling light. |
| `sceneTreatments` | A per-scene plan assigning each scene a **distinct visual technique** (see [`scene-primitives.md`](scene-primitives.md)). This is how you get variety instead of one motif repeated. | s1 kinetic-type · s2 3D-stack · s3 hand-drawn line · s4 particle-field · s5 chrome-demo · … |
| `referenceDirection` | 1–2 named looks to design *toward* (raises the ceiling above the agent's bland prior). | "Apple keynote dark", "Stripe docs", "noir title sequence", "Kurzgesagt flat-depth". |

### Find the world in the subject — never default to an idiom

The `concept` is the whole game. The agent's lazy default is **"dark background +
glowing neon nodes / grid" — 'premium tech'**. Resist it. That idiom is the *new*
sameness: competent, expected, forgettable. **There is no house style — every
video earns its own world**, and the strongest worlds *resonate with the subject*
so the look itself carries meaning:

- a film about a **library** → aged paper, letterpress serif, ink that can *burn*;
- a film about **compound interest** → a personal ledger / graph-paper notebook;
- a film about **security threats** → rain-slick neon-noir.

Ask: **what visual world belongs to *this* subject, audience, and emotion that I
have not used before?** If your answer resembles a past video — or the tech-dark
default — you haven't found it yet. Push until the world surprises you. The brief
and script stages are where a human signs off on the world, so be **bold** in
proposing one.

**A gallery to stretch your range — NOT a menu.** These ten worlds are
deliberately unalike; the point is the *breadth* of the space, not the items.
**Invent one that is not on this list, derived from your subject** — listing them
is to break the default, never to pick from.

| World | Material & type | Resonates with |
|---|---|---|
| Archival / illuminated manuscript | aged paper, letterpress serif, ink, wax seal, foxing | history, knowledge, provenance, "the record" |
| Engineer's blueprint | cyan line on slate, graph paper, compass arcs, annotations | architecture, systems, planning |
| Wet-ink newsprint / risograph | newsprint grain, halftone, bold condensed heads, 2-colour misregistration | news, announcements, bold claims |
| Botanical / natural-history plate | copperplate engraving, sepia, hand-labelled specimens, gold leaf | growth, taxonomy, organic systems |
| Antique star-chart / cartography | indigo, constellations, brass instruments, map linework | discovery, navigation, exploration |
| Brutalist Swiss grid | raw concrete, stark Helvetica, primary blocks, hard shadow | infrastructure, policy, modern statements |
| Paper-craft diorama | layered cut paper, felt, soft studio light, tactile shadow | human stories, onboarding, simple ideas |
| Neon-noir, rain-slick city | wet asphalt reflections, neon signage, volumetric fog | security, mystery, high-stakes drama |
| Chalk on slate / vintage textbook | chalk dust, handwritten equations, eraser smudge | education, math, fundamentals |
| Molten glass / liquid metal | chrome, refraction, caustics, HDR bloom | transformation, fluidity, premium hardware |

**Ground it, then deviate.** Query the design system for a credible starting
point, then push it somewhere specific:
```
python skills/creative/design-search/search.py "<audience> <tone> <topic>" --design-system
```
Use its palette/typography as a *floor*, not the answer. A great art direction
has a point of view the generic lookup won't give you.

**Anti-sameness rule.** Before committing, read the previous 1–2 videos'
`art-direction.json`. Your `concept`, `material`, `motionSignature`, and
`signatureMotif` must be **materially different** from them. If you can't say in
one sentence how this video looks different from the last, you haven't art-
directed it yet.

## Step 2 — Two classes of visual: reuse chrome, hand-stitch design

Slate has two kinds of visual, and only ONE is reusable:

- **Product / chrome — REUSABLE.** Anything imitating real software must look
  real and consistent: VS Code, Terminal, GitHub/ADO, Teams, Outlook, Excel,
  PowerPoint, Azure Portal, a browser or phone shell. Use the catalog
  components (TerminalCast, VSCodeScene, ScreenDemoFrame, ExcelScene, …) and
  feed them content. Don't hand-draw a fake Outlook.
- **Design / explanatory / abstract — HAND-STITCHED from primitives.**
  Diagrams, data-viz, kinetic type, metaphor scenes, transitions, hero moments.
  **Do not reach for a finished design component** (DataFlow, StepByStep,
  "workflow", a one-motif token-strip) as the scene's content — that is the
  sameness trap. Compose each from primitives (GSAP, SVG, Canvas, WebGL/3D,
  CSS) on the HyperFrames runtime so every scene is its own thing. See
  [`scene-primitives.md`](scene-primitives.md).

## Step 3 — Plan scene-treatment variety

Assign each scene a **distinct technique** (kinetic-type, 3D/WebGL, hand-drawn
data-viz, particle field, generated-image hero, Sora bed, chrome demo, macro
material, SVG assembly, photographic collage). Record it as `sceneTreatments`.

- **Hard rules:**
  - **Variety.** No single technique/component is the hero of more than ~1/3 of
    scenes; never the same technique in two adjacent scenes. One bespoke
    component reused everywhere is a prettier template — the exact failure the
    design-critic now gates on.
  - **No hero-component spine.** The `signatureMotif` is connective tissue, and it
    appears in **one or at most two beats** (typically the climax) — never as the
    visual scaffolding of every scene. It earns its weight by being *scarce*.
    Test: if a scene still works with the motif removed, the motif doesn't belong
    there. (Picking one striking visual and reusing it every scene with different
    text underneath *feels* custom but is mechanically branded slides — the
    SignalTape mistake.)
  - **Hero / signature beats: author bespoke** — express ≥3 of {palette,
    material, motionSignature, composition, signatureMotif}. Use
    [`scene-primitives.md`](scene-primitives.md) +
    [`gsap-component-patterns`](gsap-component-patterns.md); keep the timeline/
    text-fit on the tested runtime so it can't break.
  - A catalog **design** component is allowed only as a *restyled base*, never
    its default look, and never two back-to-back.
  - `material` + `palette` identical across all scenes; `motionSignature`
    governs every entrance/transition.

### Make each scene its own composition

Before writing any scene, answer concretely:

- **What is this scene's PRIMARY visual subject?** A character · a diagram · a
  piece of evidence · a landscape · a typographic moment · a void. It must be
  *different* from the previous scene's. (The design-critic fails the video if any
  two scenes share their primary subject.)
- **Why does this beat exist?** What does it do that no other beat does? If two
  scenes collapse into one without losing meaning, collapse them.
- **How does it differ from its neighbours?** Vary at least two of: composition
  (thirds / centred / split), scale (intimate close vs wide field), motion
  register (still vs busy), palette emphasis, type treatment.

### Let the medium enact the story

The strongest scenes don't *decorate* the narration — the visual **performs** it.
When the script says a library burned, the paper on screen chars and tears; when
it says a number compounds, the curve draws itself off the page. Find the one or
two moments per video where the material can *become* the meaning, and build those
beats bespoke. This is the line between "nicely animated" and "crafted."

## Step 4 — Don't forget the production layers

A finished video has **music** (always, ducked under narration), **captions**
(default on, styled to the art direction), and usually **≥1 generated image or
Sora clip** for texture/variety. If you skip one, write down why — don't just
forget it. (The token-tape pilot shipped with no music and zero generated
media because these weren't on the checklist; they are now.)

**Captions ≠ on-screen text — pick one role.** Decide once per video: are captions
carrying meaning the spoken words can't (a number, a name, a quote attribution),
or are they accessibility subtitles echoing the narration? If a scene already
shows a big headline that reads the script line verbatim, do **not** also burn a
caption with the same words — the doubled phrase looks amateurish even when the
scene is beautiful. Either scope captions to scenes whose on-screen text differs
from what's said, or keep captions and keep the on-screen text minimal.

## Step 5 — Gate it

Before accepting any scene, run the [`design-critic`](design-critic.md) loop:
render 2–3 keyframes → score for PPT-smell, premium signals, art-direction
adherence, and distinctiveness → revise until it passes. Bespoke is safe because
it is *verified*, not because it was pre-built.

## art-direction.json shape (worked EXAMPLE — invent your own values)

> **⚠ This block illustrates the file's *shape and fields only* — it is NOT a
> template, default, or house style.** The values below describe *one
> hypothetical* video (a "blueprint" world). **Every real video must invent its
> own** `concept`, `palette`, `material`, `motionSignature`, `signatureMotif`,
> and `sceneTreatments`, driven by *this* brief's audience, topic, and tone.
> Do **not** copy these literal values, and do **not** reuse a previous video's.
> The design space is wide — one video might be "blueprint-ink", the next "wet
> newsprint", "neon-noir terminal", "paper-craft diorama", "liquid-metal HUD",
> or "botanical engraving". If your art direction resembles this example or a
> prior video, you have **not** art-directed it (see the Step 1 anti-sameness
> rule). Only the **field names** and the **rules** (chrome reusable · design
> hand-stitched · motif = accent · per-scene variety) are constant.

```json
{
  "_comment": "EXAMPLE VALUES ONLY — replace every field with choices specific to THIS video; do not reuse across videos.",
  "concept": "EXAMPLE world (replace) — an architect's blueprint coming to life, line by line.",
  "palette": {
    "bg": ["#0A1A2F", "#12345A"], "accent": "#5EE0C8", "secondary": "#F2C14E",
    "text": "#EAF2FF", "mutedText": "#9DB4D0",
    "gradientMesh": "linear-gradient(135deg,#0A1A2F 0%,#163E6B 60%,#5EE0C8 8%)"
  },
  "material": "blueprint-ink",
  "motionSignature": {
    "name": "Drafting",
    "rules": ["elements stroke-draw on like ink", "settle with a 6px float",
              "camera drifts; never hard-cut"]
  },
  "composition": { "grammar": "asymmetric-editorial", "headlinePx": 120,
                   "negativeSpaceMin": 0.45 },
  "signatureMotif": "a thin cyan grid-line that redraws between scenes (accent, not the hero of every scene)",
  "sceneTreatments": {
    "s01": "kinetic-typography", "s02": "3D-window-stack", "s03": "hand-drawn-decay-line",
    "s04": "particle-network", "s05": "chrome-demo", "s06": "hero-fold", "s07": "SVG-assembly",
    "s08": "generated-image-parallax", "s09": "macro-material", "s10": "Sora-bed-close"
  },
  "referenceDirection": ["Apple keynote dark", "architectural blueprint"]
}
```

## Failure modes this prevents

- "It looks like every other Slate video." → distinct per-video identity + anti-sameness.
- "It looks like a PowerPoint." → bespoke composition + material/depth + the design-critic gate.
- "The bespoke scene broke." → primitives stay on the tested runtime; the gate renders+verifies before shipping.
