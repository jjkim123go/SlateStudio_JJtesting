# Production Loop — the agentic playbook

> **Replaces:** the deleted "Pipeline Stages 1–7" funnel and `pipeline_defs/`.
> **Trigger:** load this skill at session start once the user signals intent
> to make a video. Stay loaded for the duration of the project.

Slate has no fixed pipeline. You — the agent — are the planner. You read the
brief, decide which director skills apply, mix tools as needed, gate every
expensive or irreversible step behind a checkpoint, and log every decision so
the next session can resume without you in the room.

This skill defines that loop. It is short on purpose. The deeper how-to lives in:

- [`skills/meta/checkpoint-protocol.md`](checkpoint-protocol.md) — every HITL pause uses this format.
- [`skills/meta/state-and-decisions.md`](state-and-decisions.md) — the `projects/<slug>/` layout, brief.md, decisions.jsonl, ledger.jsonl.
- [`skills/directors/`](../directors/) — mixable advisors per video archetype (explainer, walkthrough, social-teaser). Load only the ones the brief calls for. You may load more than one for the same project.

---

## The loop

```
INTENT → BRIEF → ART-DIRECTION → DECIDE → CHECKPOINT → ACT → LOG → REVIEW → LOG → DELIVER
                  ▲                                          │
                  └──────────────── adjust on feedback ──────┘
```

These rules govern the loop. Follow them every project.

### Rule 1 — Always start from intent, not from a template

The user's first message rarely names a "pipeline". They name a goal:
*"I want to onboard new hires"*, *"I need a teaser for our launch"*, *"explain
this dashboard to executives"*. Read that goal carefully and answer four
questions BEFORE choosing tools or skills:

1. **Who is the audience?** (executives, customers, devs, internal team)
2. **What outcome should the video produce?** (action, comprehension, emotion)
3. **What's the runtime?** (default 60s; explicitly confirm if longer)
4. **What governance applies?** (brand package, compliance, public vs internal)

If any of these four is unclear, ask. Don't guess and don't multi-question.
Pick the one most-blocking ambiguity and ask about it directly.

### Rule 2 — Capability-first, not capability-last

Before the brief is final, run a **concrete availability scan** and report
results in the brief. The user must know what is and isn't possible BEFORE
you propose a treatment.

Scan for: brand package + its assets (logo / fonts / music dir), any user-supplied
media, and which Foundry models are deployed. State each as `found / not found`
in the brief. Do not promise governed sources you have not verified exist.

The session intake / discovery contract lives in
[`.github/copilot-instructions.md`](../../.github/copilot-instructions.md#session-intake-contract).
If the scan exposes a missing Azure model deployment, load
[`skills/meta/azure-foundry-setup.md`](azure-foundry-setup.md) JIT.

### Rule 3 — Compose director skills; don't pick "a pipeline"

Director skills under [`skills/directors/`](../directors/) are advisors, not
routers. A real video often blends archetypes:

- *Training video* = explainer scenes 1 & 4 + walkthrough scenes 2 & 3
- *Launch teaser* = social-teaser pace + explainer scene structure
- *Exec briefing* = explainer scaffold + walkthrough for the demo segment

Load every director the brief implicates. If their advice conflicts on a
specific scene, the brief's audience and outcome decide. Log the call.

### Rule 3b — Commit an art direction, then plan scene-treatment variety

Before planning scenes for **any** video, commit a per-video art direction and
write `projects/<slug>/art-direction.json`. Load
[`skills/creative/art-direction.md`](../creative/art-direction.md) (the identity
contract: concept, palette, material, motion signature, composition, signature
motif, per-scene techniques) and
[`skills/creative/scene-primitives.md`](../creative/scene-primitives.md) (the
hand-stitch toolbox). Two rules make or break the result:

- **Reuse chrome, hand-stitch design.** Product-chrome scenes (VS Code, Terminal,
  Teams, Outlook, Excel, Azure, browser) use the reusable chrome components.
  Design / explanatory scenes (diagrams, data-viz, kinetic type, metaphor, hero
  moments) are **hand-stitched from primitives** — never a finished design
  component (DataFlow, DataChart, StepByStep, CompareSlider…) as default content.
- **Variety, not one motif.** Assign each scene a *distinct* technique
  (`sceneTreatments`). No technique is the hero of more than ~1/3 of scenes;
  never the same technique in two adjacent scenes. The signature motif is
  connective tissue (a transition / recurring mark / edge element), **not** the
  hero of every scene — the lesson of the token-tape pilot, where one beautiful
  component in all ten scenes still read as a template.

For factual / current topics, also load
[`skills/meta/topic-research.md`](topic-research.md) before scripting so claims
are grounded, not hallucinated. Gate the finished scenes with
[`skills/creative/design-critic.md`](../creative/design-critic.md) (Rule 6).

### Rule 4 — Checkpoint before any irreversible or expensive step

The agent has wide autonomy on cheap, local, reversible work (drafting a
script, sketching a scene plan, validating SCF). It has zero autonomy on:

- Generating any paid asset (image, narration, AI video, transcription)
- Rendering an MP4 (it's free but irreversible-feeling — user must approve scope)
- Publishing or sharing the result
- Deleting or overwriting prior renders

Every paid call MUST be preceded by `slate_cost_estimate` and a checkpoint
that names the cost in dollars. Use the format in
[`skills/meta/checkpoint-protocol.md`](checkpoint-protocol.md).

### Rule 5 — Log decisions and costs as you go

The next session that opens this project should be able to reconstruct
"what happened" from disk alone. That means:

- Every meaningful choice → append to `decisions.jsonl`
- Every paid call → append to `ledger.jsonl` (record AFTER the call returns)
- Every checkpoint → append to `decisions.jsonl` with `type=checkpoint`,
  including what was shown to the user and their verdict

Append-only. Never edit prior lines. If a decision is reversed, append a
new decision that supersedes it and says so. The full state contract is in
[`skills/meta/state-and-decisions.md`](state-and-decisions.md).

### Rule 6 — Validate before render, review via sub-agent after render

**Pre-compose validation (mandatory):** After generating all assets but
before rendering, run `python scripts/lib/scf_validate.py <scf-file>` (or
call `validate_scf_pre_render()` programmatically). This catches:

- Narration audio that overflows scene durations (the #1 quality killer)
- Video clips shorter than their scene (causes black frames)
- Video clips with embedded audio (Sora-2 audio bleed)
- Missing asset files

If any issue is found, fix it before rendering. Adjust scene durations to
match actual TTS output. Strip audio from AI video clips. Do not render
with known timing mismatches.

**Captions (default-on for narrated videos):** When the composition has
narration, generate caption blocks by default. **Use `style: "static"`, not
`word-highlight`.** Per-word highlighting is retired across all videos: its
per-word timing is unreliable (the highlight drifts off the spoken word), which
reads worse than no highlight. Static shows each caption line as a block that
appears/disappears on its own timing, with **no** individual word recolored.

1. After TTS generation, transcribe each narration WAV via `foundry_transcribe`
   / `scripts/lib/live_subtitles.py` to get word-level timestamps (still used for
   per-line block timing).
2. Include the captions in the SCF (`captions: { style: "static" }`).
3. **Contrast is mandatory** (there's no highlight to lean on): the caption block
   must stay readable on every scene — a dark, mostly-opaque line background
   (≥0.88 alpha) under bright near-white text, or the inverse. Match the block to
   the art direction but never drop below a legible contrast ratio.
4. If the user opted out during the brief ("no captions"), skip this step.

Caption generation costs ~$0.006/min of audio — negligible. Surface this
during the brief: *"I’ll add captions to the narration by default — keep them,
restyle, or skip?"* Scenes without narration do not get captions.

**Music (default-on):** A finished video has a music bed, ducked under
narration. Source it from the brand-package music dir, the org / built-in
library, or a user-supplied track — verify the path exists during the Rule 2
availability scan; don't promise a library that isn't there. Add it to the SCF
(`music: { src, volume, duck_on_narration: true }`) and bake a full-length
looped + faded bed (HTML `<audio loop>` is **not** honored by the deterministic
capture, so a short track plays once then goes silent). If you ship without
music, write down why — don't just forget it (the token-tape pilot shipped
silent because music wasn't on the checklist).

**Design-critic gate (variety + PPT-smell):** Alongside the technical reviewer,
run the [`design-critic`](../creative/design-critic.md) loop — render 2–3
keyframes per scene and score PPT-smell, premium signals, art-direction
adherence, distinctiveness, and reliability (1–3). Revise any scene that scores
1; **fail the video** if it is mostly default catalog or one motif repeated
across scenes. Write `projects/<slug>/design-review.json`. This is the gate that
catches the "every scene looks the same" failure before delivery.

**Post-render review (mandatory):** After rendering the MP4, deploy a
**reviewer sub-agent** (via `runSubagent`) to evaluate the output. The main
agent must NOT self-score — the reviewer runs independently to avoid
sunk-cost bias. The reviewer sub-agent:

1. Runs `python scripts/review_run.py --video <mp4> --scf <scf> --output-dir <dir>`
2. Interprets the structured output (scores, findings, corrective actions)
3. Reports back to the main agent with a pass/revise verdict

If the reviewer reports REVISE (any dimension scores 1), the main agent
must act on the findings — fix the issue, re-render, and re-review — before
proceeding to CK-DELIVER. The reviewer's report is the CK-REVIEW checkpoint
artifact.

The 8-dimension rubric covers: brand compliance, pacing, content coverage,
audio quality, visual consistency, caption accuracy, content redundancy,
and **narration timing** (overflow detection).

### Rule 7 — Fan out scene authoring for long videos (director + crew)

A single agent authoring every scene of a long video (10+ beats) degrades:
context fills, quality slips, shortcuts creep in ("it feels like too much").
A single sub-agent told to "build all the scenes" runs out of runway and
returns fragments. For anything beyond ~6–8 bespoke scenes, **fan out**: stay
the director, delegate the hands.

- **The director (main agent) keeps** what only it can do well: the
  `art-direction.json`; a precise per-scene **brief** (primary visual subject,
  assigned technique, exact on-screen text, narration file + measured duration,
  palette / material / motion tokens, the component name + prop contract); asset
  generation; SCF composition + `scf_validate`; render orchestration; and the
  **design-critic gate** — cross-scene variety and distinctness can only be
  judged by the one agent that sees every scene.
- **The crew (parallel sub-agents, high-frontier model)** each author **one**
  project-scoped component to the brief, on the tested runtime (master timeline,
  transform-only, seeded randomness, GSAP / SVG / Canvas / CSS), **self-verify a
  keyframe**, and return the finished `projects/<slug>/components/<Name>/` folder
  plus a one-line report. Keep each sub-agent's scope **small (1–3 simple
  scenes)** so it never exhausts its runway — the cause of the fragment problem.
- **Why it stays coherent across many hands:** every sub-agent receives the
  *same* `art-direction.json` + the runtime capability harness + the
  component-authoring contract, so independently-built scenes share one world.
  Project-scoped components need **no** global registration, so parallel writes
  never collide; scenes are independent, so they parallelize cleanly.
- **Author the hero / signature beats yourself** (or give them the most detailed
  briefs): the hook, the one or two "medium-enacts-the-story" moments, and the
  close carry the most weight and are least forgiving of misinterpretation.
- **Verify one scene before fanning out the rest.** Build a single
  representative scene end-to-end (render a draft, check a keyframe) to prove the
  world + runtime conventions, then parallelize with that proven pattern baked
  into the brief.

This reconciles autonomy with quality: the agent still "drives" (direction +
integration + the gate); the crew executes tightly-specified work. For long
videos this is the default, not an exception.

---

## What governance survives the deletion of pipelines

The Pipeline state machine is gone. These are the governance mechanisms that
replace it. Treat them as non-negotiable.

| Survived | Now lives in |
|---|---|
| Human-in-the-loop checkpoints (P7) | `checkpoint-protocol.md` — every gate is an explicit checkpoint message |
| Cost gates (P11/P12) | Rule 4 above + `slate_cost_estimate` before any paid call |
| Self-review rubric (P6) | The "REVIEW" step in the loop — a reviewer sub-agent runs `scripts/review_run.py` and scores 1–3 on 8 dimensions. Pre-compose validation via `scf_validate.py` catches timing issues before render. |
| Audit trail | `decisions.jsonl` + `ledger.jsonl` (append-only event log; replay reconstructs truth) |
| Brand / policy enforcement | `governance_context` + `governance_policy` (Python infra, unchanged) — wired at render time, not at "stage entry" |

---

## On the external `slate_*` MCP tools

The user-side MCP server still exposes a small toolkit for project state.
The naming is being migrated to match this loop. When you have access to the
new names, prefer them; the legacy names will continue to work during the
transition.

| Old name | New name | Purpose |
|---|---|---|
| `slate_set_project` | `slate_init_project` | Create `projects/<slug>/` with brief.md + empty logs |
| `slate_get_pipeline_state` | `slate_get_project` | Replay the logs to summarize project state |
| `slate_record_cost` | `slate_log_cost` | Append to `ledger.jsonl`; refuses if total would exceed budget |
| `slate_cost_estimate` | (unchanged) | Pre-flight a paid call; required before each one |
| `slate_read_skill` | (unchanged) | JIT skill loading |
| — | `slate_log_decision` | Append a structured decision to `decisions.jsonl` |
| — | `slate_record_checkpoint` | Append a checkpoint event (what was shown + verdict) |
| `slate_advance_phase` | DELETED | No more stages |
| `slate_read_pipeline_def` | DELETED | No more pipeline manifests |

If the new tools are not yet registered on the user's machine, fall back to
direct file operations (write to `decisions.jsonl` / `ledger.jsonl` yourself)
and tell the user once.
