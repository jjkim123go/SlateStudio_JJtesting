# Living Storyboard (Soundstage) — the board opens itself

> **Trigger:** the moment you create a project workspace (`projects/<slug>/`),
> before any stage runs. This is a standing duty for every production — it is
> the ONE thing the agent does for the board. Stay aware of it for the session.

Soundstage is Slate's **living storyboard**: a local, **read-only** web board
that turns a production into something the user can watch — stage rail, cream
screenplay script, an SCF-native storyboard filmstrip, a narration timeline,
approval gates, a decision trail, cost, live generation activity, and a Final
Cut player. It derives everything from the files you already write to
`projects/<slug>/` (`project.json`, `decisions.jsonl`, `ledger.jsonl`,
`composition.scf.json`, `review_report.json`, `assets/`, `renders/`). You never
update the UI; the board reads the truth off disk.

Soundstage carries direct lineage from OpenMontage's Backlot (PR #273,
AGPL-3.0, same author) and extends it for Slate's append-only state and SCF.
See `docs/design/LIVING_STORYBOARD.md` and `docs/OPENMONTAGE_LINEAGE.md`.

---

## Your only duty: open it at project creation

Right after you write `project.json` (and before the first stage runs), run:

```powershell
python -m slate.soundstage open <slug> --surface browser
```

That is it. The command is **idempotent and self-contained**: it starts the
board server if it isn't already running, then opens the project's board in the
external browser. VS Code's Simple Browser remains an explicit surface. Surfaces:

```powershell
python -m slate.soundstage open <slug> --surface browser  # external browser (default and most reliable)
python -m slate.soundstage open <slug> --surface both     # browser AND VS Code tab
python -m slate.soundstage open                            # the library (all projects)
```

**Never block, never break.** If the command fails (port busy, no browser,
headless CI), **continue the production** — the board is an observer, never a
dependency. Do not retry in a loop, do not ask the user to fix it, do not let it
gate a single stage. Log nothing special; just move on.

Log the action once in `decisions.jsonl` if you like (`type:"note"`,
`"opened Soundstage board"`), but it is not required.

---

## How it stays live (you get this for free)

A file watcher on `projects/` pushes changes to the browser over SSE. So the
board fills in **live** as you work — the brief lands, the script card appears,
scene cards populate as `composition.scf.json` is written, the cost meter ticks
up as you append to `ledger.jsonl`, gates light amber when a `checkpoint` has no
matching `checkpoint_resolved`. You do nothing to make this happen beyond
writing the honest state files the state-and-decisions contract already
requires. **A well-formed run produces a beautiful board** — that is the reward
for following the contract.

---

## Optional: live "generating…" shimmer per scene

For sub-second scene-level liveness (a card shimmers "generating…" while its
asset renders), emit start/finish events around each scene's paid generation.
This is **additive** — the board works without it (it also watches file mtimes).

```python
from slate.soundstage.events import generating, emit_event

proj = "projects/my-slug"

# context manager (preferred): emits start, then finish (or error on exception)
with generating(proj, "foundry_image_gen", scene_id="s4-result"):
    generate_the_image(...)

# or emit explicitly
emit_event(proj, "foundry_tts", "start", scene_id="s2")
...
emit_event(proj, "foundry_tts", "finish", scene_id="s2", cost_usd=0.011)
```

`event` is `start` | `finish` | `error`; `scene_id` ties the event to a
storyboard card (use the SCF scene `id`). Events are append-only, best-effort,
and never raise — a failed event will never break a production.

---

## What the board shows (so honest logging pays off)

| Board element | The disk truth it reads |
|---|---|
| identity, budget | `project.json` |
| stage rail + gates | derived from artifacts on disk × `checkpoint`/`checkpoint_resolved` events in `decisions.jsonl` (an unresolved checkpoint = "◈ awaiting you") |
| cream script card | the SCF scenes' `narrationText` (fixed 4 sections + "expand" modal) |
| storyboard filmstrip | `composition.scf.json` scenes × `scene_treatment` decisions × `assets/` × per-scene split renders (keyframes) |
| narration timeline | scene durations × narration seconds (from `ledger.jsonl` TTS entries) — flags overflow |
| variety meter | per-scene technique (chrome / hand-stitched / generated) — flags sameness |
| decision trail | `decisions.jsonl` (treatments, `critique_revision`, `candidate_selection`, gates, `supersedes` → "also considered") |
| cost burndown | `ledger.jsonl` summed vs `project.json` budget |
| Final Cut player | newest `renders/*.mp4` |
| live activity / shimmer | `events.jsonl` (this skill's optional emitter) |

The board degrades gracefully: a sparse or legacy project shows "what it found
on disk"; a contract-following run gets the full, wow board.
