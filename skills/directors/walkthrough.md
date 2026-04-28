# Director — Walkthrough

> **Role:** advisor. Load when the brief involves showing an actual app,
> dashboard, workflow, or product UI in motion.
> **Mixable:** yes. Pair with `explainer.md` to wrap UI segments in
> conceptual framing.

This is a director skill, not a pipeline. The full agentic loop is in
[`skills/meta/production-loop.md`](../meta/production-loop.md).

## Research grounding

- Nielsen Norman Group, [Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/): UI walkthroughs must keep controls and state visible so viewers recognize the path instead of recalling it from narration.
- Nielsen Norman Group, [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/): offload memory work into visible state, smart defaults, and contextual cues.
- Fluent 2, [Motion](https://fluent2.microsoft.design/motion): motion should identify the next step, inform people of UI changes, and stay constrained to the element in focus.

Do not author walkthroughs as static screenshots with narration. Every scene must show a state change, focus change, typed input, cursor/focus change, command output, or result.

---

## When the walkthrough treatment fits

- Audience needs to *see how something works*, not just understand the
  concept.
- The product / dashboard / app actually exists (or is being prototyped)
  and the user is OK showing it.
- Runtime per UI segment: 8–20s. Longer feels like documentation; shorter
  loses the user.

If the user has no real screen recording, choose in this order:

1. **Existing rendered showcase/demo clips.** Search `output/`, `renders/`, and
  `projects/*/renders/` for relevant MP4s before generating new static assets.
  Example: if Outlook is narrated and `output/outlook-fidelity/SHOWCASE-OUTLOOK-v1.mp4`
  exists, trim it into the scene instead of rebuilding a static screenshot.
2. **Synthetic moving UI scenes.** Use `VSCodeScene`, `TerminalCast`,
  `GitHubScene`, `TeamsScene`, `OutlookScene`, `ExcelScene`, `LoopScene`,
  `ScreenDemoFrame`, or another registered surface with `steps`, `stepsHtml`,
  state props, cursor/focus markers, and transcript-aligned reveals.
3. **Structured UI PNGs as inner content only.** Use the `structured_image` tool
  (`scripts/lib/structured_image.py`) with type `ui` to create deterministic
  UI screenshots when needed as **inner content** for `ScreenDemoFrame`,
  then sequence multiple states inside the component or a video
  layer. Prefer component surfaces directly (e.g., `ExcelScene`, `TeamsScene`,
  `OutlookScene`) over generating static PNGs whenever a matching surface
  component exists. A single PNG held under narration is not a walkthrough.
4. **Generated UI imagery.** Last resort. AI image models hallucinate UI
   chrome, button labels, and data. Only use for stylized "feel" shots,
   never for steps the user must follow.

---

## Scene scaffold

Walkthrough segments are not standalone videos — they're segments inside
a larger explainer. A typical segment looks like:

| # | Beat | Duration | Treatment |
|---|---|---|---|
| 1 | Context — "Here's the screen we'll work with" | 2–4s | Existing clip, synthetic app component, or first UI state in `ScreenDemoFrame` |
| 2 | Action — "Click here, then this happens" | 3–4s per action | Sequenced component states, typed input, cursor/focus motion, Sora-2 clip, or user-supplied recording |
| 3 | Result — "And now you've done X" | 2–4s | Final UI state with visible changed result |

Repeat for each step. Most demos work in 2–4 such segments.

---

## Visual choice rules

1. **Real screen recording** (user-supplied) → use as-is, trim with
   ffmpeg, overlay narration. Always preferred when available.
2. **Existing Slate showcase clip** → trim/reuse the MP4 when it matches the
  narrated product surface. Prefer this over re-rendering a screenshot.
3. **No recording, demo is internal-only** → synthetic surface component or a
  sequence of `structured_image` UI states inside `ScreenDemoFrame` —
  deterministic, no PII risk, brand-controllable.
4. **No recording, demo is a generic concept** → can use Sora-2 for
   short motion clips (e.g. cursor moving, button highlighting). Costly;
   confirm with CK-CONFIRM.
5. **Never** use gpt-image-2 for UI mockups that have specific
   labels, buttons, or data. They hallucinate.
6. **Synthetic product surfaces beat static PNGs.** Use `VSCodeScene`,
  `GitHubScene`, `TeamsScene`, `OutlookScene`, `ScreenDemoFrame`, or another
  registered surface component whenever the scene is about workflow state.

## State progression checklist

- [ ] The chrome stays stable across related steps; only the focus region changes.
- [ ] Every scene advances the workflow: selection, command, system response, or final state.
- [ ] No three consecutive scenes show the same UI state.
- [ ] Each action has a visible focus marker, cursor, callout, or changed result.

---

## Narration rules

- **Two narration modes.** Either narrate the action ("Click 'New Report'
  in the top right…") OR narrate the value ("In two clicks, your report
  is shared org-wide"). Pick one per segment; don't switch mid-segment.
- **Pace slower than explainer.** ~120 wpm — the viewer needs eye time on
  the UI.
- **Pause beats matter.** Insert 0.5–1s of silence after a "click" so the
  viewer's eye catches the action. Use `audio_mixer` to add the gap.

---

## Synthetic UI checklist

When generating UI mockups with the `structured_image` tool (type `ui`):

- Use realistic-looking but obviously-fake data (no real customer names,
  emails, financials). See `skills/meta/demo-data-classification.md`.
- Mirror the actual app's visual language — same primary color, similar
  typography. Don't invent a new design system.
- For multi-step demos, keep the chrome (header, sidebar) IDENTICAL
  across scenes; only the content area changes. Otherwise the viewer
  gets disoriented.

---

## Self-review checklist (walkthrough-specific)

- [ ] **Could a viewer who's never seen this product follow along?** If
      no, the segment is too dense — split into more scenes or simplify.
- [ ] **No PII anywhere on screen** (real names, real emails, real data).
- [ ] **Cursor / focus is always visible** when an action is happening.
- [ ] **Each step's outcome is shown**, not just announced.
- [ ] **The scene can be understood with narration muted** because the visual state progression is explicit.
