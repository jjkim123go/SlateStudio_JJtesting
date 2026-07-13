# Slate Living Storyboard — Design & Delivery Plan

> **Status:** Design proposal (v1). Decisions resolved (see
> [§13](#13-resolved-decisions)); Phase 0 in progress.
>
> **Name:** **Soundstage** — the room where a production comes alive and you
> can walk in and watch it. (Confirmed. Considered: *Marquee*, *Callsheet*,
> *Dailies*, reuse *Backlot*.) The package is `slate.soundstage`
> (`python -m slate.soundstage`).
>
> **Surfaces:** both a standalone **browser board** *and* an in-editor **VS Code
> view** ship together — one read-only server, two front-ends.
>
> **Lineage / attribution.** Soundstage is a clean-room reimagining of
> **Backlot**, the living storyboard shipped in OpenMontage
> ([calesthio/OpenMontage#273](https://github.com/calesthio/OpenMontage/pull/273),
> AGPL-3.0, by the same author). We independently reimplement the *concept and
> process* — a read-only, disk-derived production board — against Slate's own
> state contract (append-only `decisions.jsonl` / `ledger.jsonl` + SCF), and
> extend it. No OpenMontage source is copied. Credit belongs in `NOTICE.md`,
> the board footer, and this doc. See [§14](#14-attribution).

---

## 1. One-paragraph pitch

Today a Slate production lives in chat messages, `decisions.jsonl`,
`ledger.jsonl`, `brief.md` / `script.md` / `scene-plan.md`, an
`art-direction.json`, a big `composition.scf.json`, a pile of split SCFs, and
`renders/`. That is powerful and fully auditable, but it is **not a product
experience** — a user has to trust that the agent is moving through the loop
correctly. **Soundstage** turns that invisible machinery into a visible
production room: a local, **read-only** web board that watches
`projects/<slug>/` and renders each production as a studio wall — stage rail,
screenplay script, an **SCF-native storyboard filmstrip**, approval gates,
a **decision/provenance trail**, **budget burndown**, live generation
activity, playable renders, and end-to-end **replay**. The agent's only new
duty is one line at project creation: open the board. Everything else derives
from files Slate already writes.

---

## 2. Design principles (inherited from Backlot, kept verbatim in spirit)

These three are non-negotiable and copied in intent from Backlot because they
are what make the pattern work:

1. **Observation, not orchestration.** The board is a *view* over disk. It is
   never a second state machine and never a dependency of the pipeline. Agents
   and tools write the source of truth; the board only reads. If the board is
   down, production continues unaffected.
2. **Never block, never break.** A malformed JSON line, a half-written SCF, a
   missing asset, a legacy project with no logs — every one of these must
   *degrade the board gracefully*, never crash it. A sparse project shows
   "what we found on disk." A rich, contract-following project produces a
   beautiful board. Following the contract is *rewarding*, not *required*.
3. **The agent's only duty is to open it.** At project creation the agent runs
   `python -m slate.board open <slug>`. That starts the server if needed and
   opens the browser. If it fails, the agent continues the production — the
   board is an observer, never a blocker.

A fourth principle is **Slate-specific and is our headline differentiator**:

4. **The board is also the review gate.** Backlot is mostly a *watch* surface.
   Because Slate already renders per-scene keyframes and runs a design-critic +
   8-dimension reviewer, Soundstage surfaces *quality* inline — variety,
   narration-timing safety, theme coherence, per-scene critique scores — so the
   storyboard is where you *approve the visuals before the render*, not after.

---

## 3. Understanding Backlot (so this doc stands alone)

Backlot (OpenMontage) is a FastAPI app under `backlot/` plus a static UI under
`backlot/ui/`. Its data flow:

| Board element | OpenMontage disk source |
|---|---|
| identity / rail order | `project.json` marker + `pipeline_defs/<type>.yaml` |
| stage states, gates, versions | `checkpoint_<stage>.json` + `history/` |
| script card / modal | `artifacts/script.json` |
| filmstrip cards | `scene_plan.json × script.json × asset_manifest.json` join |
| generating shimmer, activity | `events.jsonl` (written by `BaseTool` instrumentation) |
| cost meter | checkpoint `cost_snapshot` |
| renders | `renders/*.mp4` |

Mechanics worth stealing:

- **`state.py`** derives one `BoardState` dict per project, defensively (every
  helper returns `None`/`[]` on bad input; `load_board_state` "never raises").
- **`server.py`** is a `watchfiles` watcher → a `ChangeHub` fan-out → **SSE**;
  the browser refetches state on a debounced change. There are **no write
  endpoints**. A thumbnail endpoint downscales/caches images and extracts a
  poster frame from videos.
- **Path-traversal is fenced** (their finding "F-04"): a checkpoint that points
  at a file path is only resolved *inside the project dir*, so the board can't
  be tricked into reading arbitrary disk.
- **Replay** reconstructs the run from checkpoint-history + event timestamps and
  scrubs it in ~20s regardless of real duration.
- **`?static=1`** disables the live feed for deterministic screenshots.
- **Release hardening** they had to do (we inherit the fixes for free): mobile/
  tablet stacking, static-mode navigation, invalid-route error UI, active-take
  highlighting, and a Playwright bug-bash regression test.

Their eval rig (we mirror it): `scripts/backlot_screenshot_stage.py` stages
fictional projects → `scripts/backlot_visual_eval.py` captures canonical
screenshots, compares to goldens with a pixel threshold (`--bless` to update),
and runs a Playwright interaction smoke; `scripts/backlot_simulate_run.py`
drives a fake run through the *real* contract so the live board can be watched.

---

## 4. The key insight — Slate's substrate is *better* for this

Slate deliberately deleted the stage machine. There is **no `pipeline_state.json`
and no `checkpoint_<stage>.json`** — project state is reconstructed by replaying
**append-only logs**. That is *more* event-sourced than OpenMontage, and it is
a gift for a living board: two timestamped, append-only logs are the perfect
substrate for a live feed *and* for replay, with zero new state to invent.

### Contract mapping — OpenMontage → Slate

| Board needs… | OpenMontage source | **Slate source (what we derive from)** |
|---|---|---|
| project identity | `project.json` marker | `project.json` (`name`, `slug`, `budget_usd`, `created_at`) ✅ already exists |
| stage rail + status | `checkpoint_<stage>.json` files | **Derived** from artifact presence (`brief.md`→ingest, `script.md`→script, `scene-plan.md`+`art-direction.json`→scene_plan, `assets/`+ledger→assets, `composition.scf.json`+`renders/`→compose, `review_report.json`→review, `delivered` event→publish) crossed with checkpoint events in `decisions.jsonl` |
| approval gates | checkpoint `status=awaiting_human` | **`decisions.jsonl`**: a `type=checkpoint` with no matching `checkpoint_resolved` = *awaiting you*; the `checkpoint_type` (CK-CONFIRM/REVIEW/CHOICE/DELIVER) and `shown` field give the exact gate + text |
| script card | `artifacts/script.json` | `script.md` (parse Markdown headings/timing) + SCF `narration` refs |
| **storyboard filmstrip** | scene_plan × script × manifest | **`composition.scf.json` `scenes[]`** (real `id`, `duration`, `component`/`layers`, `transition`, `theme`) × `scene-plan.md` narrative × `assets/` on disk × `decisions.jsonl` `scene_treatment` |
| per-scene creative choice | (not surfaced) | `decisions.jsonl` `scene_treatment` / `visual_spec` / `candidate_selection` / `critique_revision` |
| cost meter | checkpoint `cost_snapshot` | **`ledger.jsonl`** (sum `cost_usd`) vs `project.json` `budget_usd`; planned spend from `tool_planned` events |
| generating shimmer / activity | `events.jsonl` | recent `ledger.jsonl` + `decisions.jsonl` appends + asset-file mtime; **optionally** a new lightweight `events.jsonl` emitter (degrade gracefully without it) |
| renders | `renders/*.mp4` | `renders/*.mp4` + `scf/` snapshots + `composition.split-*.{scf.json,html}` |
| replay | checkpoint history + events | **`decisions.jsonl` + `ledger.jsonl` timestamps** (both append-only) + per-scene split renders coming online |

**Takeaway:** we need essentially **no new persistent state**. The board is a
pure function of files Slate already writes. The one *optional* addition is a
fine-grained `events.jsonl` for sub-second "generating" shimmer; the board is
fully functional without it (it falls back to mtime + log tail).

---

## 5. What Soundstage does *better* than Backlot

These are the differentiators — each is grounded in something Slate uniquely
has. This is where we earn "better version."

1. **Variety Meter / anti-sameness radar** — Slate's entire recent doctrine
   (P4b, `art-direction.json`, `design-critic`) fights "all our videos look the
   same." The board reads each scene's `scene_treatment` and the SCF component,
   tags every scene **chrome vs hand-stitched vs generated**, and draws a
   video-level technique histogram that **flags when one technique dominates or
   repeats adjacently** — the design-critic variety gate made visible. Backlot
   has nothing like this.

2. **Design-critic scores on the filmstrip** — each scene card can show its
   rendered keyframe(s) plus the 1–3 critique scores (ppt-smell, premium,
   adherence, distinct, reliability) from `design-review.json`. The storyboard
   becomes the actual pre-render review gate (Principle 4).

3. **Narration-timing safety on every scene** — Slate's #1 quality killer is
   narration overflow. Each card shows a `narration_dur vs scene_dur` bar with
   an overflow warning, straight from `ffprobe`'d WAV durations vs SCF
   `duration`. A pre-compose diagnostic you can *see*.

4. **SCF-native storyboard** — scenes come from the real composition, so cards
   carry **component-type badges** (VSCodeScene, DataFlow, bespoke…),
   **transition ribbons** between cards, a **theme-polarity chip** (catches the
   light-component-in-dark-video clash), and caption config. Richer than a
   scene_plan.json.

5. **Provenance / Decision Trail (enterprise audit)** — render `decisions.jsonl`
   as a first-class, filterable audit trail: director loads, treatment choices
   *with rationale*, `candidate_selection` (best-of-N with rubric scores), and
   `critique_revision` triples (draft → critique → revision). A compliance-grade
   "why does the video look like this" view. This is Slate's enterprise
   positioning made tangible.

6. **Budget burndown, planned vs actual** — `ledger.jsonl` (actual) + `tool_planned`
   (planned) → a burndown with per-tool breakdown and the warn@50% / pause@90%
   thresholds drawn in. Cost is a first-class Slate concept; the board shows it.

7. **Governance & brand panel** — brand-compliance (colors/fonts/logo applied),
   `demo-data-classification` verdict, governance flags (e.g. `secret_like`
   asset paths), `compliance_level`. The enterprise trust layer Backlot doesn't
   emphasize.

8. **Checkpoint-native gates, zero new state files** — gate state is derived
   purely from the append-only log; the board shows the exact CK type and the
   `shown` text. No `checkpoint_<stage>.json` contract to maintain.

9. **True film-assembly replay** — because Slate keeps per-scene split renders
   plus timestamped logs, replay scrubs the **actual scenes coming online over
   time**, not just reconstructed abstract state.

10. **In-editor VS Code view** — Slate lives inside VS Code. The board opens
    *inside* the editor next to the chat (no context switch) **and** as a
    standalone browser tab — one server, two front-ends. Ships in v1, not a
    stretch. See [§8.1](#81-vs-code-surface).

---

## 6. BoardState — the derived data model

`state.load_board_state(project_dir) -> dict` returns one JSON object. Shape
(every field defensive; helpers return empty/None on bad input, never raise):

```jsonc
{
  "slug": "copilot-vscode-tour",
  "title": "GitHub Copilot in VS Code — 60s Tour",
  "budget_usd": 25.0,
  "created_at": "2026-07-01T17:00:00Z",
  "live": true,                       // recent append within LIVE_WINDOW
  "last_activity": 1751402700.0,
  "stages": [                         // derived rail: ingest→…→publish
    {"name": "script", "status": "completed", "gate": "CK-REVIEW",
     "awaiting_human": false, "timestamp": "…", "history": [...]},
    {"name": "scene_plan", "status": "awaiting_human", "gate": "CK-REVIEW",
     "shown": "projects/…/scene-plan.md", "checkpoint_id": "ck_sceneplan"}
    // …
  ],
  "script": { "sections": [ {"id":"s1","label":"Hook","text":"…",
                             "start_seconds":0,"end_seconds":6} ] },
  "storyboard": {
    "total_duration_seconds": 62.77,
    "theme": {"name":"vs-code-dark","background":"#0d1117","accent":"#8957e5"},
    "scenes": [
      {"id":"s2-completions","index":2,"duration_seconds":9.4,
       "component":"VSCodeScene","treatment_class":"chrome",
       "technique":"VSCodeScene","transition_in":"crossfade",
       "narration_seconds":8.7,"narration_overflow":false,
       "visual":{"path":"renders/…/keyframe.png","exists":true},
       "takes":[…],"critique":{"premium":3,"distinct":3,"ppt_smell":1},
       "generating":false}
    ],
    "variety": {"histogram":{"chrome":3,"hand_stitched":2,"generated":2},
                "dominant_share":0.43,"adjacent_repeat":false,"flag":false}
  },
  "decisions": [ /* tail of decisions.jsonl, typed */ ],
  "cost": {"spent_usd":0.74,"budget_usd":25.0,"planned_usd":0.9,
           "by_tool":{"foundry_tts":0.06,"foundry_image_gen":0.16},
           "warn_at":12.5,"pause_at":22.5},
  "governance": {"brand_package":null,"demo_data":"clean","flags":[]},
  "media": {"renders":[…],"splits":[…],"snapshots":[…],"music":[…]},
  "has_logs": true                    // false → degraded "found on disk" view
}
```

`summarize_project(project_dir)` returns a cheap library-card subset (no full
SCF parse) for the grid.

---

## 7. Visual design system

Dark-room editorial, like Backlot, but **Slate's own identity** — not a copy of
Backlot's palette. The metaphor is a **clapperboard / cutting-room**: matte
charcoal canvas, film-sprocket motifs on the filmstrip, artifacts *glow*.

**Palette (proposed, distinct from Backlot's amber):**

```
--bg:        #0b0d10   (near-black, faint slate-blue cast)
--surface:   #121519
--surface-2: #171b20
--border:    #23282f
--text:      #e9edf2
--text-2:    #9aa4b0
--text-3:    #5c6672
--accent:    #4ea1ff   (Slate signal-blue — primary)
--spark:     #6ee7a8   (mint — success / "live")
--gate:      #ffb454   (amber — awaiting-you gates)
--danger:    #f0655d   (blockers / overflow)
--film:      #2b3038   (sprocket / strip chrome)
```

**Type:** Inter (UI) · JetBrains Mono (data/mono) · a screenplay face
(Courier Prime) for the script card. A single `--fs-scale` var multiplies every
`font-size` for one-knob readability (Backlot's trick — keep it).

**Five views:**

1. **Library** (`/`) — grid of project cards: poster, title, mini stage-rail,
   LIVE/AWAITING/IDLE badge, spend, last-activity. Live via a library SSE feed.
2. **Live board** (`/p/<slug>`) — the cockpit:
   - *Slate header*: title, pipeline chips, LIVE/AWAITING/STALLED badge, cost.
   - *Stage rail*: ingest → research → script → scene_plan → assets → compose →
     review → publish, with status glyphs + gate markers; click → drawer with
     that stage's artifact + review summary.
   - *Gate banner*: when awaiting you, a loud amber banner with the CK type and
     the exact `shown` text/artifact link.
   - *Script card* (screenplay styling) + full-screen modal.
   - *Right rail*: **Decision Trail** (provenance) + **Activity** (live).
   - *Cost burndown* strip.
3. **Storyboard** (below the fold on the board) — the **SCF-native filmstrip**:
   duration-scaled cards, component badges, transition ribbons, per-scene
   keyframe, narration-timing bar, takes drawer, critique chips, **Variety
   Meter** header.
4. **Gate review** — the storyboard *is* the assets gate: approve-before-render.
5. **Replay** — scrub the whole run from the append-only logs; scenes/renders
   appear as they came online.

Responsive from day one (Backlot had to retrofit it): the board and storyboard
stack cleanly on tablet/mobile.

---

## 8. Architecture

New package **`src/slate/soundstage/`** (so `python -m slate.soundstage`):

```
src/slate/soundstage/
  __init__.py        # docstring = the design contract; __version__; DEFAULT_PORT=4770
  __main__.py        # CLI: `open [slug] [--surface auto|vscode|browser|both]`, `serve --port`
  state.py           # load_board_state / summarize_project / list_projects (pure, defensive)
  server.py          # http server, SSE change feed, watcher, thumbnails, media
  paths.py           # PROJECTS_DIR (env-overridable: SLATE_PROJECTS_DIR), REPO_ROOT
  ui/
    index.html       # library
    board.html       # project board
    board.css        # the design system above
    lib.js           # el(), fmt*, getJSON, subscribe(SSE), thumbURL, waveBars
    library.js
    board.js         # renders BoardState; SSE-live; replay; ?static=1 kills feed
```

**Server tech — stdlib-first, optional turbo.** Slate's deps are lean (no
FastAPI/uvicorn/watchfiles today). To honor "never block, never break" *and*
keep install light:

- **Default:** Python stdlib `http.server` (`ThreadingHTTPServer`) + an SSE
  endpoint that emits heartbeats and change pings. Change detection via a
  **debounced mtime-poll** of `projects/` (no extra dependency).
- **If `watchfiles` is installed:** use it for instant push instead of polling.
- **If `fastapi`+`uvicorn` are installed:** optionally mount there for nicer
  async SSE. Detected at runtime; never required.

This keeps `pip install slate` unchanged; the board works out of the box and
gets faster if the optional extras are present. (We'll add a `board` extra:
`pip install slate[board]` → `watchfiles`, `uvicorn`, `fastapi`.)

**Endpoints (all read-only, bound to 127.0.0.1):**

```
GET /                         → library UI
GET /p/<slug>                 → board UI
GET /api/projects             → [summaries]           (cached, watcher-invalidated)
GET /api/project/<slug>/state → BoardState
GET /api/project/<slug>/events→ SSE (per-project change pings + heartbeats)
GET /api/library/events       → SSE (any-project change)
GET /media/<slug>/<relpath>   → file (fenced to project dir)
GET /thumb/<slug>/<relpath>   → downscaled cached JPEG (poster frame for video)
GET /api/health               → {ok:true}
```

**Change fan-out:** a `ChangeHub` with per-project–filtered queues (Backlot's
design — a board watching one project can't be flooded by another's burst).

### 8.1 VS Code surface

The same server powers an in-editor view, so the board lives next to the chat:

- **Zero-extension path (v1 default):** `python -m slate.soundstage open <slug> --surface browser`
  opens the board URL in the external browser. Use `--surface vscode` to open
  VS Code's built-in **Simple Browser** editor tab
  (`code --command simpleBrowser.show <url>` / the `simpleBrowser.show`
  command), falling back to the system browser otherwise. An
  `--surface {auto,vscode,browser,both}` flag forces the choice. No extension
  to install — works today.
- **UI adapts:** the board reads a `?embed=vscode` query flag and tightens
  chrome (drops the redundant window header, snaps to a single-column layout
  early, honors `prefers-color-scheme`) so it feels native in an editor tab.
- **Native panel (later enrichment):** a thin VS Code extension can host the
  board in a real `WebviewPanel` with theme-token bridging and a
  "Soundstage: Open Board" command. Same server + state; nicer integration.
  Not required for v1 and explicitly out of the critical path.

---

## 9. Phase 0 — the observation contract (purely additive)

Before any UI, make sure Slate reliably writes what the board reads. **None of
this changes the pipeline; it only tightens and documents existing outputs.**

- **Confirm `project.json`** is written at intake (it is — verified in
  `copilot-vscode-tour`, `rag-explainer`). Add `title` alias = `name` for the
  board header. (Additive.)
- **Confirm checkpoint events** in `decisions.jsonl` carry `checkpoint_id`,
  `checkpoint_type`, `scope`, `shown`, and are matched by `checkpoint_resolved`
  with a `verdict`. (Already the documented contract in
  `skills/meta/checkpoint-protocol.md`.) The board's "awaiting you" is exactly
  *an unresolved checkpoint*.
- **Keep the SCF + splits in the project dir** (`composition.scf.json`,
  `composition.split-*.scf.json/.html`) — already the norm.
- **Per-scene keyframes for the board:** the reviewer already extracts
  keyframes. Standardize a location the board can find, e.g.
  `projects/<slug>/snapshots/<scene_id>.png` (or reuse review keyframes). Purely
  additive; absence → card shows the shot-spec placeholder.
- **Live `events.jsonl` (in Phase 0, confirmed):** add a tiny emitter in
  `traced_dispatcher` / the cost-logging path: `{"ts","tool","event":
  "start|finish|error","scene_id","cost_usd"}` appended around each paid/asset
  call. The board uses it for sub-second "generating" shimmer; **without it the
  board still works** (mtime + log tail), so the emitter is additive and
  never a hard dependency.
- **Contract doc + tests:** a short `schemas/`/doc note describing what the
  board reads, plus `tests/contracts/test_board_contract.py` asserting the
  derivation on a fixture project.

**Deliverable:** `docs/design/LIVING_STORYBOARD.md` (this file) +
`skills/meta/living-storyboard.md` (agent duty: open the board at init) wired
into `production-loop.md` and `.github/copilot-instructions.md`.

---

## 10. Phased delivery plan

Mirrors Backlot's own release phasing (which worked), adapted to Slate:

- **Phase 0 — Contract + docs (this doc).** Additive contract, agent-duty skill,
  wiring, fixtures. No UI. *Exit:* a fixture project derives a full BoardState in
  a unit test.
- **Phase 1 — Board server.** `state.py` (derivation, never raises) +
  `server.py` (stdlib http + SSE + mtime-poll watcher + thumbnails + fenced
  media) + `python -m slate.soundstage open/serve`. *Exit:* `curl /api/project/<slug>/state`
  returns correct JSON for real projects; degraded projects don't crash.
- **Phase 2 — Board UI.** Library + live board + SCF filmstrip + screenplay
  script + decision trail + gate banners + cost burndown + **Variety Meter**.
  Dark-room design system. Responsive, and the **VS Code Simple-Browser surface**
  (`--surface`, `?embed=vscode`) lands here too. *Exit:* every real project in
  `projects/` renders a coherent board in both browser and VS Code; sparse ones
  degrade cleanly.
- **Phase 3 — Replay + design-critic overlay + evals.** In-browser replay from
  the logs; keyframe + critique scores on cards; the full eval rig (§11);
  release hardening (mobile/tablet, invalid-route UI, static-mode nav).
  *Exit:* visual eval passes against goldens; interaction smoke green; simulate
  driver produces a watchable live run.

Each phase is a reviewable PR. Phase 0 is mergeable on its own (doc + contract +
skill), so we get alignment before writing server code.

---

## 11. Evals & QA

Direct parallels to Backlot's rig, renamed and extended for Slate:

**A. Contract / unit tests** (`tests/soundstage/`, `tests/contracts/test_soundstage_contract.py`):
- `load_board_state` **never raises** on: missing files, truncated JSONL,
  half-written SCF, unknown component, legacy project with no logs, non-UTF8.
- Stage-rail derivation from `decisions.jsonl` (checkpoint → awaiting_human;
  resolved → completed; presence-of-artifact → stage status).
- SCF storyboard join (scene × scene-plan × assets × scene_treatment).
- **Variety-meter correctness** (technique histogram, dominant-share, adjacent
  repeat). *Slate-specific.*
- **Narration-overflow flagging** (narration_seconds > duration). *Slate-specific.*
- **Theme-clash detection** (light component in dark theme). *Slate-specific.*
- **Path-traversal safety** (media/thumb/artifact refs resolve only inside the
  project dir — Backlot's F-04, ported).
- Cost derivation from `ledger.jsonl` vs budget; planned-vs-actual.
- Performance budgets (cold/warm `/api/projects`, `/state` under loose limits).

**B. Deterministic visual eval** (`scripts/soundstage_visual_eval.py` +
`scripts/soundstage_screenshot_stage.py`):
- Stage 4–5 **fictional Slate projects** at different states (early / script-gate
  / assets-live / complete / degraded) — our own equivalents of Backlot's
  lighthouse/orchard/static.
- Capture canonical screenshots with `?static=1`: `library`, `board-live`,
  `script-gate`, `storyboard`, **`variety-meter`**.
- Compare to goldens in `internal/evals/goldens/` with a pixel threshold;
  `--bless` to update; ignore-boxes over animated regions.

**C. Interaction smoke** (Playwright, invoked from the visual eval with
`--interactions`): open a stage drawer, open the script modal + Escape-close,
open a scene keyframe lightbox, toggle replay play/pause, assert mobile/tablet
stacking (no overflow), assert invalid-route shows the error UI (not raw JSON).

**D. Simulate-run driver** (`scripts/soundstage_simulate_run.py`): drive a fake Slate
production through the **real** contract — `init_project` →
`decisions.jsonl` checkpoints (awaiting_human → resolved) → `scene_treatment`
events → `ledger.jsonl` appends → per-scene PNGs → `render_complete` → review —
with `--fast` (compressed waits for CI) and `--cleanup`. Lets us *watch* the
live board and feeds the screenshot stage.

**E. Board-as-reviewer regression:** a golden BoardState JSON per fixture, so we
catch derivation drift independent of pixels.

---

## 12. Security model (read-only by construction)

- **Bind to `127.0.0.1` only.** No external interface. (Mitigates SSRF/exposure.)
- **No write endpoints.** The board cannot mutate a project. Approvals stay in
  chat; the board only *shows* the gate.
- **Path traversal fenced.** `/media`, `/thumb`, and any artifact path reference
  are `resolve()`d and must be `relative_to(project_dir)`; anything else → 404.
  Slug is validated against `^[a-z0-9][a-z0-9-]*$`; no `..`, no absolute paths.
- **Never execute project code.** The board reads JSON/MD/PNG/MP4 only. It does
  **not** import or run `generate_assets.py`, SCF JS, or component code.
- **Bounded reads.** Cap JSONL tail (e.g. last 250 lines), cap SCF size, cap
  directory scans (exclude `node_modules`, `.git`, `__pycache__`). A hostile or
  huge file degrades, never hangs.
- **Prompt-injection awareness.** Artifact text (script, decisions, brief) is
  rendered as **text/escaped HTML**, never interpreted as markup or script.

Maps cleanly to OWASP Top 10: A01 (no broken access — localhost + fenced
paths), A03 (no injection — escaped render, read-only), A10 (no SSRF — no
outbound fetches, localhost bind).

---

## 13. Resolved decisions

1. **Name:** **Soundstage.** Package `slate.soundstage`
   (`python -m slate.soundstage`), port `4770`.
2. **Surfaces:** **both** ship in v1 — a standalone browser board and an
   in-editor VS Code view (Simple-Browser path, no extension required; native
   `WebviewPanel` is a later enrichment). One read-only server, two front-ends.
3. **Live `events.jsonl`:** **yes, in Phase 0** — a ~15-line additive emitter
   for crisp "generating" shimmer; the board degrades to mtime + log tail if
   it's absent.

---

## 14. Attribution

Soundstage is inspired by **Backlot**, the living storyboard for OpenMontage
([calesthio/OpenMontage#273](https://github.com/calesthio/OpenMontage/pull/273),
AGPL-3.0, by the same author). Slate independently reimplements the concept and
process against its own append-only state contract and extends it (variety
meter, design-critic overlay, narration-timing safety, provenance trail,
governance panel). No OpenMontage source code is used. This attribution must
appear in `NOTICE.md`, the board UI footer, and the package docstring.
```
