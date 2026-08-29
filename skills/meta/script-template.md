# Script Template — Canonical Format

> **Trigger:** load when writing or parsing a script (`script.md`). This
> skill defines the structure that downstream stages (scene_plan, assets,
> compose) expect. All director skills produce scripts in this format.
>
> **Why a canonical format?** Without one, each session invents its own
> script layout — blockquotes vs paragraphs vs tables — and the scene_plan
> stage has to guess what's narration vs direction. This template eliminates
> ambiguity.

---

## Structure overview

A script is a Markdown file with:

1. **YAML frontmatter** — metadata for downstream tools
2. **Scene blocks** — `## Scene N: <title>` headings, each containing
   narration, visual direction, and timing

```
---
voice: coral
target_duration_sec: 60
total_word_count: 150
---

## Scene 1: Hook — The Problem

Every quarter, finance teams spend 40 hours reconciling data that should
match automatically.

[VISUAL: Office worker staring at two spreadsheets side by side, late at night]
[COMPONENT: TitleCard]

*Duration: 5s · Words: 16 · WPS: 3.2*

---

## Scene 2: The Idea

...
```

---

## YAML frontmatter

Required fields at the top of every script:

```yaml
---
voice: coral                 # Voice ID from config/models.yaml
target_duration_sec: 60      # Target total runtime in seconds
total_word_count: 150        # Sum of all narration words across scenes
---
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `voice` | string | yes | Must be a valid voice ID: coral, echo, shimmer, onyx, nova, fable. See [`skills/creative/voice-selection.md`](../creative/voice-selection.md). |
| `target_duration_sec` | integer | yes | Target runtime. Scene durations should sum to approximately this value. |
| `total_word_count` | integer | yes | Total narration words. At 2.5 WPS, a 60s video ≈ 150 words. |

Optional fields:

| Field | Type | Notes |
|-------|------|-------|
| `tone` | string | e.g. "warm-celebratory", "professional-explainer". Informational for the voice instruction parameter. |
| `director` | string | Which director skill shaped this script, e.g. "directors/recap.md". |
| `audience` | string | e.g. "leadership-VP", "peer-team". Informational. |

---

## Scene blocks

Before writing narration, load
[`skills/creative/narration-writing.md`](../creative/narration-writing.md). This
file defines parseable structure and timing; the narration skill defines audience
fit, one accumulating example, jargon grounding, natural speech, and the four
mandatory edit passes. A script that matches this template but fails that quality
contract is not ready for paid TTS or rendering.

Each scene starts with a level-2 heading:

```markdown
## Scene N: <title>
```

Where `N` is a 1-based integer and `<title>` is a short descriptive label
(used in scene_plan and SCF `id` fields).

### Within each scene block

#### 1. Narration paragraph

Plain text — the words the TTS voice will speak. One paragraph per scene.
Keep it tight; every word costs time.

```markdown
Our control execution latency dropped 63 percent — from 380 milliseconds
to 142. That's faster than the blink of an eye.
```

**Rules:**
- Write numbers as words when spoken naturally ("sixty-three percent") or
  as digits when the MetricsCard will display them ("63%"). The narration
  paragraph is what gets spoken — write for the ear.
- No markdown formatting inside narration (no bold, italics, links). The
  TTS engine ignores them but they add noise.
- Complete the utility, coherence, grounding, and ear/anti-template passes from
  `creative/narration-writing.md` before CK-REVIEW.

#### 2. Visual direction tag

One or more bracketed tags describing what the viewer sees:

```markdown
[VISUAL: Animated metric card counting up from 380ms to 142ms with sparkline]
```

The `[VISUAL: ...]` tag is the primary visual direction. It tells the
scene_plan stage what kind of imagery to produce (image prompt, structured
visual, video clip, etc.).

#### 3. Component hint (optional)

If you already know which HyperFrames component fits:

```markdown
[COMPONENT: MetricsCard]
```

This is a **hint**, not a binding contract. The scene_plan stage may choose
a different component based on the full context. But providing it saves a
routing decision.

Multiple tags are allowed when a scene layers components:

```markdown
[VISUAL: Browser frame showing the new dashboard with metrics]
[COMPONENT: ScreenDemoFrame]
[COMPONENT: MetricsCard]
```

#### 4. Duration / word-count footer

Each scene ends with an italicized timing line:

```markdown
*Duration: 8s · Words: 25 · WPS: 3.1*
```

| Field | Meaning |
|-------|---------|
| Duration | Estimated scene runtime in seconds |
| Words | Word count of the narration paragraph |
| WPS | Words per second (Words ÷ Duration) |

**Baseline:** 2.5 WPS is the standard narration pace (~150 WPM). Acceptable
range is 2.0–3.5 WPS. Below 2.0 means the scene has dead air; above 3.5
means the narration is rushed.

#### 5. Scene separator

Use a horizontal rule (`---`) between scenes for visual clarity.

---

## Worked example — 60s quarterly recap

```markdown
---
voice: shimmer
target_duration_sec: 60
total_word_count: 148
tone: warm-celebratory
director: directors/recap.md
audience: leadership-VP
---

## Scene 1: Opening — What a Quarter

What a quarter for the product team. Let's celebrate
what we delivered.

[VISUAL: Warm, professional team celebration imagery with brand colors]
[COMPONENT: BrandIntro]

*Duration: 5s · Words: 16 · WPS: 3.2*

---

## Scene 2: Win 1 — Latency

Our control execution latency dropped sixty-three percent — from
three hundred eighty milliseconds to one hundred forty-two.
That's faster than the blink of an eye.

[VISUAL: Animated metric card counting up from 380ms to 142ms with downward sparkline]
[COMPONENT: MetricsCard]

*Duration: 10s · Words: 28 · WPS: 2.8*

---

## Scene 3: Win 2 — SOX Coverage

We onboarded three new SOX controls, bringing our coverage to
ninety-four percent of all revenue streams.

[VISUAL: Bar chart showing SOX coverage climbing quarter over quarter]
[COMPONENT: DataChart]

*Duration: 10s · Words: 19 · WPS: 1.9*

---

## Scene 4: Win 3 — Automation

And our zero-touch automation rate hit eighty-seven percent.
Fewer manual interventions, fewer errors, more sleep.

[VISUAL: Metric card showing 87% with upward trend from 71%]
[COMPONENT: MetricsCard]

*Duration: 8s · Words: 19 · WPS: 2.4*

---

## Scene 5: Forward Look

Next quarter, we're targeting full Gen 3 migration across all
control families. Stay tuned — it's going to be a big one.

[VISUAL: Forward-looking roadmap or brand outro with "Gen 3 Migration" headline]
[COMPONENT: CTABlock]

*Duration: 7s · Words: 22 · WPS: 3.1*
```

**Totals check:**
- Scenes: 5
- Duration: 5 + 10 + 10 + 8 + 7 = 40s (leaves room for transitions + music tail)
- Words: 16 + 28 + 19 + 19 + 22 = 104 words
- Average WPS: 104 ÷ 40 = 2.6 ✓

> Note: target_duration_sec is 60 but scene durations sum to 40. The
> remaining ~20s is consumed by transitions (crossfade overlaps), BrandIntro
> animation lead-in, music tail on outro, and breathing room. This is normal.
> If scene narration durations sum to >85% of target_duration_sec, the video
> will feel rushed.

---

## Parsing contract for downstream stages

The scene_plan stage and SCF generator can rely on:

1. **Frontmatter** is valid YAML between `---` fences.
2. **Scene headings** match `## Scene \d+: .+` (regex).
3. **Narration** is all plain text between the heading and the first `[` tag.
4. **`[VISUAL: ...]`** tags appear after narration, one per line.
5. **`[COMPONENT: ...]`** tags are optional, one per line.
6. **Duration footer** matches `*Duration: \d+s · Words: \d+ · WPS: [\d.]+*`.
7. **Scene separator** is `---` on its own line.

Any text outside this structure (comments, notes) should be in HTML comments
`<!-- ... -->` to avoid confusing parsers.

---

## Words-per-second reference

| WPS | Feel | When to use |
|-----|------|-------------|
| 2.0 | Slow, contemplative | Emotional beats, dramatic pauses, tutorial steps |
| 2.5 | Standard narration | Default for most scenes |
| 3.0 | Brisk, energetic | Hook scenes, social teasers, excitement |
| 3.5 | Fast, urgent | Maximum — only for very short bursts |

The 2.5 WPS baseline matches existing math in the codebase (150 WPM ÷ 60 = 2.5).
