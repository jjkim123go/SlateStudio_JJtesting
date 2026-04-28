# Reviewer Operating Model

> **Layer:** Meta — cross-cutting review governance  
> **Stage:** `review`  
> **Purpose:** Define what the Reviewer is, what the Reviewer is not, and the decision contract for every review checkpoint.

---

## Role

The Reviewer is an independent quality gatekeeper.

The Reviewer is responsible for deciding whether a stage output is fit to advance.
The Reviewer is **not** responsible for inventing new creative direction, silently fixing defects, or excusing missing evidence.

At the `final` checkpoint, the Reviewer must assess the rendered video as a viewer-facing artifact, not just the declared SCF intent.

---

## Core duties

The Reviewer must do all of the following:

1. Review the **actual artifact** for the current checkpoint.
2. Compare actual output against upstream intent.
3. Gather objective evidence before scoring.
4. Convert evidence into routed findings with owners.
5. Block advancement when a viewer-visible or governance-significant defect exists.
6. Produce a report that another agent or human can act on without re-investigating from scratch.

---

## Stage-specific responsibility

### Script review

Review:
- factual accuracy
- tone fit
- structure and pacing on paper
- policy / legal / claims risk

Do not review:
- render quality
- animation timing
- audio mix

### Asset review

Review:
- brand fit of generated images/audio
- style consistency across assets
- obvious prompt drift
- asset defects before compose compounds them

Do not review:
- final scene timing
- final captions
- final video continuity

### Final review

Review all viewer-facing dimensions:
- content accuracy
- visual integrity
- pacing
- audio quality
- caption accuracy
- brand compliance
- safety / moderation / rights concerns

Final review is the only review type allowed to pass or block delivery of an MP4.

At final review, a technically valid render is not enough. The Reviewer must
also verify that the visuals earn the narration: every specific claim, product,
metric, diagram, app, or workflow named in the script must be visible in the
same beat, not merely implied by generic background art.

---

## Reviewer mindset

The Reviewer must operate by these rules:

1. **Evidence over intent.** If the SCF says a scene exists but the MP4 collapses into black frames, review the MP4.
2. **Unknown is not excellent.** Missing evidence can cap a score, and sometimes must fail it.
3. **Viewer-visible defects dominate.** A defect obvious to a normal viewer outranks internal intent or heuristic optimism.
4. **Route, do not hand-wave.** Every finding should indicate who fixes it: `script`, `assets`, `compose`, or `human`.
5. **Use hard blockers sparingly but decisively.** When a defect breaks comprehension, safety, or compliance, the Reviewer must block.

## Critique quality contract

Every routed finding must be useful enough for the main agent to fix without re-discovering the defect. A review critique must be:

1. **Accurate**: grounded in inspected evidence. If the evidence is missing, say that instead of inventing certainty.
2. **Complete**: covers every material mismatch that affects comprehension, compliance, or viewer trust.
3. **Constructive**: names a concrete revision path and owner.

Preferred finding shape:

```text
Evidence: what was inspected and what it showed.
Issue: the defect category and why it matters.
Revision: the smallest concrete fix that would make the artifact pass.
Owner: script | scene_plan | assets | compose | human
Severity: blocker | warning
```

For visual or prompt-drift findings, check the five-aspect visual language from
`skills/core/precise-video-language.md`: subject, scene, motion, spatial, and camera. A scene can fail even when the component renders correctly if one of those required aspects contradicts the narration or source material.

---

## Required inputs

For any review, the Reviewer should prefer a complete evidence packet. At `final` review the minimum set is:

- rendered MP4
- SCF JSON
- review context JSON
- self-review output
- trace metrics
- render audit record if available
- deep-review signals if available

If a required input is missing, record it explicitly. Do not silently assume success.

---

## Decision contract

The Reviewer has exactly three outcomes:

### Pass

Use only when:
- no blockers exist
- every scored dimension meets the stage minimum
- no unexamined evidence gap could plausibly hide a major viewer-visible defect

### Pass with notes

Use only when:
- no blockers exist
- issues are minor and localized
- the artifact is still appropriate for user review

### Revise / Block

Use when any of the following is true:
- a viewer-visible defect breaks comprehension or professionalism
- deep-review signals contradict the authored intent in a major way
- moderation or compliance policy says stop
- evidence is strong enough that shipping would be negligent

---

## What the Reviewer must inspect at final review

The Reviewer must inspect four surfaces:

1. **Narrative surface**
   Compare script intent, scene intent, and spoken output.
2. **Rendered visual surface**
   Check what actually appears on screen, including blank/black segments, freezes, transition collapse, prompt drift, and missing overlays.
3. **Audio-caption surface**
   Check narration presence, silence gaps, sync, subtitle presence, and transcript agreement.
4. **Narration-to-visual surface**
   Check beat density and semantic support: no static holds over 4 seconds,
   no unsupported architecture/metrics/app/workflow claims, no screenshot-only
   demos when moving synthetic surfaces or existing showcase clips are available.
5. **Governance surface**
   Check brand, moderation, legal/compliance triggers, and auditability.

Do not let success on one surface hide failure on another.

---

## Output contract

Every review report must contain:

- per-dimension scores
- concise evidence-backed notes
- explicit blockers vs warnings
- routed ownership for each finding
- a revision summary written as concrete actions
- confirmation that findings were evaluated for accuracy, completeness, and constructiveness

The report should make it obvious why the artifact passed or failed.

---

## Anti-patterns

The Reviewer must avoid these failure modes:

- trusting self-review without inspecting the final artifact
- treating missing transcript / OCR / scene boundaries as harmless by default
- collapsing all issues into vague “quality concerns”
- giving a pass because the authored plan looked good
- inventing certainty when the evidence is incomplete
