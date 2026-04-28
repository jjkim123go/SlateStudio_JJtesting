# Director skill: visual-density

**Trigger**: load this skill any time the brief calls for a "showcase," "product video," "feature reel," or any video where narration introduces multiple distinct nouns/surfaces in quick succession (Slate showcase, demo reel, capability tour, marketing trailer).

This is an **advisor** skill. It does not replace `explainer` / `walkthrough` — it overlays them with three non-negotiable disciplines: **shot economy**, **per-noun visual matching**, and **reusable-asset budget**.

---

## The three rules

### Rule 1 — Shot economy: ≤4s per visual, period.

No single visual atom (image, clip, component frame) holds for more than **4 seconds**. Most should be 2–3s. If a beat needs to feel "longer," extend it by **cutting between two clips of the same surface**, not by holding one.

Scenes are not visuals. A 12s scene is **3–4 sub-beats**, each with its own asset.

If the SCF has a single layer running 8s+ behind narration, you have already failed. Decompose it.

### Rule 2 — Per-noun visual match.

Every concrete noun the narration says must have a concrete on-screen match within 0.5s. Nouns to never miss:

- App surfaces (VS Code, Teams, Outlook, Excel, PowerPoint, Edge, GitHub, Terminal, Loop, Whiteboard, Stream, Windows Explorer)
- Artifacts (deck, spreadsheet, doc, PR, architecture diagram, files, notes, transcript, recording)
- Actions (typing, dragging, clicking, generating, rendering, reviewing, publishing)
- Outcomes (a chart updates, a video appears, a card lands, a notification fires)

If narration says "drop in your deck," the next frame is a deck. Not a generic blue gradient. Not text-on-image saying "Drop in your deck." A **deck**.

When narration mentions multiple nouns in one sentence ("…your deck, your spreadsheet, your notes…"), you cut between three clips inside that sentence — one per noun, ~1–1.5s each.

### Rule 3 — Reusable-asset budget: ≥80% existing footage.

Before you generate a single new asset, **scan `output/` recursively** for `.mp4`, `.wav`, `.png` and build a candidate map. Concretely:

```powershell
Get-ChildItem C:\Projects\Slate\output -Recurse -Include *.mp4,*.wav -File |
  Where-Object { $_.Length -gt 50KB }
```

Then bucket every clip by surface (`vscode`, `excel`, `outlook`, `teams`, `github`, `terminal`, `edge`, `ppt`, `windows`, `loop`, `stream`, `whiteboard`, `sora`, `composed-scene`).

For each beat in the script, your **first move** is "do we already have it?" — not "let's generate one." Generation is a fallback, not a default.

The **80% target** is runtime, not beat count. Math out the budget at scene-plan time:

```
total_runtime = 300s
existing_budget = 240s
new_generation_budget = 60s
```

If your scene plan exceeds the new-generation budget, you trim. Either:
- Replace a generated beat with an existing one (preferred)
- Cut a beat (if narration allows)
- Repeat-with-different-trim an existing clip (e.g., use seconds 0–3 of `excel-chart` early, seconds 3–6 later)

### Trim windows are mandatory

Every existing clip beat must specify `trim_in` and `trim_out` in the scene plan. A 6s clip can be cut to its punchy 3s. Do not hold a clip past the moment it stops moving. If the clip's "best" 2s is the close-up at second 4, your beat is `trim_in: 4, trim_out: 6`.

---

## Authoring workflow

1. **Inventory pass** (before script v1)
   - Run the `output/` scan above. Group clips by surface.
   - Read every `*-handoff.md` / `HANDOFF*.md` / `SHOWCASE*.md` you find — they describe what's actually in each clip and where the punchy moments are.
   - Produce a one-line manifest per clip: `{path, surface, duration, best_window, narration_pairings}`.

2. **Script pass**
   - Write narration with explicit nouns. "Your deck" not "your input." "VS Code" not "your editor."
   - Keep sentences short — 1 noun per ~2 seconds at 1.25× narration speed (~150 wpm effective).
   - Sanitize ellipses to em-dashes or commas. `gpt-4o-mini-tts` reads `…` literally as "dot dot."

3. **Scene-plan pass**
   - Decompose every scene into **2–4s sub-beats**.
   - For each sub-beat columns: `id | start | end | narration_phrase | visual_source (SHOWCASE / COMPONENT / SORA / IMAGE / STRUCTURED) | clip_path_or_prompt | trim_in | trim_out`.
   - Compute the asset-utilization budget at the top of the file:
     ```
     ## Asset utilization budget
     total_runtime: 300s
     existing_footage_runtime: 245s (81.7%)
     new_generation_runtime: 55s (18.3%)
     ```
   - List every existing clip used and where (timestamp).

4. **Anti-defaults checklist** (apply before handoff to producer)
   - [ ] No beat > 4.0s
   - [ ] Existing footage ≥ 80% of runtime
   - [ ] Every concrete noun in narration has a matching visual
   - [ ] No text-on-image (subtitles via `AnimatedCaption` only)
   - [ ] Narration has zero ellipses
   - [ ] ArchitectureDiagram count ≤ 1 (often 0 if real PR/repo clips exist)
   - [ ] No Pillow chart/UI placeholders standing in for a real surface clip
   - [ ] No "blue ambient gradient" backgrounds standing in for content
   - [ ] Captions enabled (word-highlight, white on rgba(0,0,0,0.45))
   - [ ] Narration speed = 1.25 (TTS speed parameter)

---

## Anti-patterns (these are how v3 failed)

| Anti-pattern | Why it slops | Fix |
|---|---|---|
| One visual held 18s while narration covers 6 nouns | Eye fatigues, narration disconnects | Decompose to 6 cuts |
| Generated Pillow chart for "metrics" when `excel-chart-b1-v2.mp4` exists | Real surface > synthetic illustration | Use the real clip |
| Text-on-image "Drop in your deck" overlaid on stock photo | Telling instead of showing | Cut to a real deck |
| ArchitectureDiagram with 4 boxes for "the architecture" | Generic, not your architecture | Show the GitHub repo + PR + terminal — that IS your architecture |
| BookPageMetrics renders as a tan card | Component fallback path silently kicked in | Verify component renders before scene plan locks |
| Generic Sora gradient between every scene | Sora is expensive and slow; gradients are filler | Cut directly between real clips, no bridge |
| Narration says "see them move" while frame is static | Worst possible mismatch | If narration promises motion, the asset must move |

---

## When to break the rules

- **Brand intro / outro**: a 4–6s held card is fine — it's a beat, not content.
- **A genuinely cinematic Sora clip** (e.g., the established `the-problem_clip.mp4` opener) can hold 4s if it's actually moving and on-message.
- **A composed showcase clip** (e.g., `SHOWCASE-OUTLOOK-v1.mp4`) is allowed to play through 6–8s if it's already cut tight internally — but verify by watching it; don't assume.

The rules are defaults, not laws. But you must be able to defend the exception in the scene-plan notes.
