# State and Decisions — the project folder

> **Trigger:** load this skill the first time you open or create a project in
> a session. Stay loaded for the duration.

There is no `pipeline_state.json` anymore. There is no current "stage".
Project state is reconstructed by replaying append-only logs. This is the
same pattern ORIN uses for its dashboard — and the same pattern Git uses for
history. It's robust to crashes, cheap to resume, and easy to audit.

---

## Layout

```
projects/<slug>/
  project.json          ← tiny: {name, budget_usd, created_at, brief_path}
  brief.md              ← human-editable; set at intake, rarely mutated
  decisions.jsonl       ← APPEND-ONLY structured decisions + checkpoints
  ledger.jsonl          ← APPEND-ONLY paid calls (the audit trail of $)
  events.jsonl          ← (optional) live tool events → Soundstage shimmer
  composition.scf.json  ← the generated SCF (root; the Soundstage board reads this)
  assets/               ← generated images, narration, music
  renders/              ← MP4s; latest = final.mp4, prior = final.v1.mp4 etc.
```

> SCF location: the current convention (and what the Soundstage board reads
> first) is `composition.scf.json` at the project root. Older runs kept it under
> `scf/`; the board tolerates both. Keep split renders under
> `renders/composition-split-scenes/`.

At project creation, open the board — `python -m slate.soundstage open <slug>`
(idempotent, non-fatal; see [`living-storyboard.md`](living-storyboard.md)).

`<slug>` is `kebab-case` derived from the user's intent (e.g. `onboarding-q1`,
`launch-teaser-skylark`). Pick it during intake; confirm with the user
before creating the folder.

---

## project.json

Minimum viable, set once at intake:

```json
{
  "name": "Q1 Onboarding Video",
  "slug": "onboarding-q1",
  "budget_usd": 10.0,
  "created_at": "2025-01-15T18:30:00Z",
  "brief_path": "brief.md"
}
```

Mutate this only for explicit user actions: budget change, name change. Never
embed runtime state here.

---

## brief.md

Human-editable Markdown. Sections — keep them in this order, all required:

```markdown
# <project name>

## Intent
One paragraph: who's the audience, what outcome, what runtime.

## Capability scan
- Brand package: found at config/org/brand-packages/contoso/ — logo, fonts, no music dir
- User-supplied media: 2 logos, 0 footage, 0 narration
- Foundry models: gpt-4o-mini-tts ✓, gpt-image-2 ✓, Sora ✗
- Music sources: brand music ✗, org music ✗, slate library ✗ — will need user-supplied or no music

## Treatment
1–2 paragraphs of how you'll approach it. Reference any director skills
loaded (e.g. "Following directors/explainer.md scaffold, with directors/
walkthrough.md applied to scenes 2–3").

## Constraints
- Budget: $10
- Brand: Contoso (use #0078D4 accents, Segoe UI font)
- Audience: new hires, week-1
- Tone: friendly-professional
```

Edits to this file are decisions in their own right — append to
`decisions.jsonl` with `type=brief_updated` so the audit trail captures the
change.

---

## decisions.jsonl — every meaningful choice

One JSON object per line. Append-only. Never rewrite a prior line.

```jsonl
{"ts":"2025-01-15T18:30:05Z","type":"project_created","slug":"onboarding-q1","budget_usd":10.0}
{"ts":"2025-01-15T18:31:42Z","type":"brief_finalized","brief_hash":"sha256:..."}
{"ts":"2025-01-15T18:32:10Z","type":"director_loaded","skill":"directors/explainer.md","rationale":"audience=new hires, outcome=comprehension"}
{"ts":"2025-01-15T18:33:00Z","type":"voice_chosen","voice":"coral","rationale":"warm, friendly tone matches week-1 audience"}
{"ts":"2025-01-15T18:34:15Z","type":"checkpoint","checkpoint_id":"ck_a3f1","checkpoint_type":"CK-REVIEW","scope":"script draft","shown":"projects/onboarding-q1/script.md"}
{"ts":"2025-01-15T18:35:01Z","type":"checkpoint_resolved","checkpoint_id":"ck_a3f1","verdict":"approved"}
{"ts":"2025-01-15T18:35:30Z","type":"scene_treatment","scene_id":"s2","treatment":"walkthrough","rationale":"scene shows the actual app UI; static image would lie"}
{"ts":"2025-01-15T18:36:00Z","type":"visual_spec","scene_id":"s2","subject":"dashboard forecast panel","scene":"synthetic web app surface","motion":"cursor opens forecast; chart updates","spatial":"medium-wide UI with right-side panel","camera":"locked-off screen capture"}
{"ts":"2025-01-15T18:36:40Z","type":"critique_revision","scope":"scene_plan:s2","draft_ref":"scene-plan.v1.md#s2","critique":"motion claim is not visible","revision_ref":"scene-plan.v2.md#s2","accepted":true,"critiqued_by":"reviewer-agent"}
```

Common `type` values:

| type | When |
|---|---|
| `project_created` | Once, at init |
| `brief_finalized` / `brief_updated` | Brief written or edited |
| `director_loaded` | A director skill was loaded into this project's plan |
| `treatment_chosen` | A creative decision (visual style, music, voice, runtime) |
| `scene_treatment` | Per-scene decision (which director, image vs video vs structured) |
| `visual_spec` | Per-scene five-aspect visual language: subject, scene, motion, spatial, camera |
| `candidate_selection` | Best-of-N scene/spec/prompt selection with rubric scores and selected rationale |
| `critique_revision` | Draft -> critique -> revision triple for scripts, scene plans, prompts, SCF, or review fixes |
| `tool_planned` | About to call a paid tool (paired with `slate_cost_estimate`) |
| `checkpoint` | A user-facing pause was shown |
| `checkpoint_resolved` | The user replied to a checkpoint |
| `render_complete` | An MP4 was produced (paired with the SCF path + render path) |
| `delivered` | Final handoff to user |
| `note` | Free-form agent note for future-you |

Use `slate_log_decision` if available; otherwise write the line yourself.

### Draft -> critique -> revision triples

When an agent, reviewer, or human materially revises a script, scene plan, Sora prompt, or SCF because of critique, append a `critique_revision` event. Keep the event compact: reference artifacts by path/hash where possible instead of embedding long drafts.

Required fields:

| field | Meaning |
|---|---|
| `scope` | What changed, such as `script`, `scene_plan:s3`, `sora_prompt:s4`, or `scf` |
| `draft_ref` | Path/hash/id for the draft being critiqued |
| `critique` | Short accurate finding that caused the revision |
| `revision_ref` | Path/hash/id for the revised artifact |
| `accepted` | Whether the main agent accepted the critique after evaluating it in context |
| `critiqued_by` | Optional: `self-review`, `reviewer-agent`, `human`, or an agent name |

For best-of-N planning or prompts, append `candidate_selection` with the candidate ids, rubric dimensions, scores, and selected rationale. Do not log every full prompt inline if the content is large; write candidate artifacts and reference them.

---

## ledger.jsonl — every paid call

One JSON object per line. Append-only. Each line is the receipt for one
paid API call.

```jsonl
{"ts":"2025-01-15T18:40:11Z","tool":"foundry_tts","model":"gpt-4o-mini-tts","units":{"seconds":58},"cost_usd":0.058,"decision_id":"ck_a3f5","artifact":"projects/onboarding-q1/assets/narration.wav"}
{"ts":"2025-01-15T18:42:02Z","tool":"foundry_image_gen","model":"gpt-image-2","units":{"images":4},"cost_usd":0.16,"decision_id":"ck_a3f6","artifact":"projects/onboarding-q1/assets/scene-1.png"}
```

Required fields: `ts`, `tool`, `model`, `units`, `cost_usd`. Optional but
strongly recommended: `decision_id` (which checkpoint approved this spend),
`artifact` (what file landed on disk).

Use `slate_log_cost` if available — it refuses if the running total would
exceed the budget. Otherwise write directly AND check budget yourself
(`sum(cost_usd) + this_call <= project.budget_usd`).

---

## How to resume a project at session start

When the user mentions a project (or you find one in `projects/`):

1. Read `project.json` for budget + slug.
2. Read `brief.md` so you know audience / treatment.
3. Tail the last ~50 lines of `decisions.jsonl` to learn:
   - Which directors are loaded (don't re-load if already there)
   - Which scenes have been planned/rendered
   - Whether there's an unresolved checkpoint waiting on the user
4. Sum `ledger.jsonl` to learn current spend.
5. Greet the user with a one-line resume message: *"Resuming
   onboarding-q1 — script approved, 3 of 4 scenes rendered, $0.31 of $10
   spent. Want me to render scene 4 next?"*

This is free. It does not require any "phase=" enum to know where you are.

---

## Why append-only?

Mutable state lies. If a render crashes mid-write to `pipeline_state.json`,
the next session sees a corrupted "current phase" with no way to verify it.
Append-only logs can't lie: either the line is there in full or it isn't.
Replaying the log reconstructs truth. The same property makes every action
auditable for compliance — nobody can quietly "fix" a prior decision.

---

## When the new MCP tools aren't available

Until `slate_log_decision`, `slate_record_checkpoint`, `slate_log_cost`,
`slate_init_project`, `slate_get_project` are registered on the user's
machine, do the appends yourself with file writes:

```python
import json
from datetime import datetime, timezone
from pathlib import Path

proj = Path("projects/onboarding-q1")
event = {"ts": datetime.now(timezone.utc).isoformat(), "type": "...", ...}
with open(proj / "decisions.jsonl", "a", encoding="utf-8") as f:
    f.write(json.dumps(event) + "\n")
```

Mention this fallback to the user once per session so they know to register
the new tools when convenient.
