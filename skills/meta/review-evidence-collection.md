# Review Evidence Collection

> **Layer:** Meta — cross-cutting review instrumentation  
> **Stage:** `review`  
> **Purpose:** Define the minimum evidence the Reviewer must gather before scoring and the order to gather it in.

---

## Principle

Review quality is limited by evidence quality.

The Reviewer must collect concrete signals from both declared artifacts and the rendered output before scoring. A rubric without evidence is a guess.

---

## Evidence ladder

Collect evidence in this order at `final` review:

1. **Declared intent**
   - scene plan / SCF
   - narration text
   - per-scene visual job and visual beats
   - five-aspect visual spec when available: subject, scene, motion, spatial, camera
   - target duration
   - brand package
2. **Self-review + trace evidence**
   - compose self-review scores
   - warnings
   - fixes_needed
   - trace metrics
3. **Render evidence**
   - MP4 duration
   - frame-level inspection results
   - frozen-frame / blank-frame detection
   - sample frames when available
4. **Deep-review evidence**
   - Video Indexer OCR
   - transcript lines
   - scene boundaries
   - audio effects
   - moderation
5. **Audit evidence**
   - render audit record
   - cost / provenance notes if relevant to compliance

If evidence later in the ladder contradicts earlier evidence, trust the later, more concrete evidence.

---

## Minimum checks at final review

Before a `Pass` or `Pass with notes`, the Reviewer must have checked:

- actual MP4 exists and duration is plausible
- authored scene count vs rendered/deep-review scene count
- presence of speech/transcript when narration was expected
- presence of visible text / OCR when captions or overlays were expected
- captions are configured for narrated content unless explicitly waived
- every narration claim has same-beat visual support in SCF or sampled frames
- visual spec is present for motion scenes: Sora, video layers, or cinematic components must include a `visualSpec` object with populated subject, scene, motion, spatial, and camera fields
- generated-video and cinematic scenes preserve the intended subject, scene, motion, spatial composition, and camera treatment
- no authored visual beat holds longer than 3-4 seconds without motion or state change
- frozen or blank sections across the rendered timeline
- moderation / safety flags when deep review is available

If any of these checks are skipped, the report must say so explicitly.

---

## Evidence-backed scoring rules

### Visual consistency

Use all available sources:
- frame inspection
- frozen or blank section detection
- scene-count drift
- sample frame sanity checks

Do not score `3/3` on visual consistency unless actual rendered evidence was checked.
Do not score above `1/3` when narrated scenes are supported only by generic art,
static screenshots, or a single visual held longer than 4 seconds.

### Caption accuracy

Use:
- transcript overlap when narration exists
- OCR or subtitle presence when on-screen text is expected

If narration is expected but no transcript is found, cap at `1/3` unless there is strong alternative evidence proving speech is present and aligned.
If narration exists and captions are absent or disabled, score caption accuracy
`1/3` unless a human explicitly opted out.

### Audio quality

Use:
- loudness probe
- silence gaps
- narration presence
- scene duration vs narration duration when per-scene narration assets exist
- playback evidence of adjacent-scene speech overlap when available

If narration is expected and the evidence suggests long silence or missing speech, do not pass audio quality.
If narration extends beyond its authored scene boundary and creates viewer-noticeable overlap into the next scene,
do not pass audio quality or pacing.

---

## Evidence gaps

When evidence is missing, classify the gap:

### Benign gap

Example:
- brand package absent for an unbranded internal demo

Outcome:
- warning or capped score

### Material gap

Example:
- no transcript for narrated content
- no meaningful scene boundaries in a multi-scene video
- no render inspection for a suspicious MP4

Outcome:
- warning at minimum
- blocker if the gap is itself evidence of probable output failure

---

## Reviewer checklist

At the end of evidence collection, the Reviewer should be able to answer:

1. What was supposed to be shown?
2. What was actually rendered?
3. What objective signals support that conclusion?
4. Which stage owns each defect?
5. Is each critique accurate, complete, and constructive?
6. Why is this safe to pass, or why must it fail?

If any answer is missing, the review is incomplete.
