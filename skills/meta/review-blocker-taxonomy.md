# Review Blocker Taxonomy

> **Layer:** Meta — cross-cutting review severity policy  
> **Stage:** `review`  
> **Purpose:** Define which classes of defects are blockers, which are warnings, and how to route them.

---

## Severity levels

Use these meanings consistently:

- `info`: purely descriptive, no action needed
- `suggestion`: improvement that does not affect acceptability
- `warning`: real defect or risk, but artifact can still be shown to the user
- `blocker`: artifact must not advance until fixed or explicitly waived by a human

---

## Automatic blockers at final review

The Reviewer must issue a blocker when any of the following is true:

### Render integrity blockers

- blank or black screen segments long enough to be viewer-noticeable
- frozen-frame / repeated-frame spans that materially break the scene
- multi-scene authored video collapses to one detected scene without a deliberate reason
- missing critical overlays, captions, or scene bodies so the screen is effectively empty
- narrated showcase scenes that hold one static visual for more than 4 seconds
	without internal component beats, a moving video layer, or transcript-anchored
	state changes
- screenshot/Pillow-only treatment for a narrated product workflow when a
	synthetic moving surface or existing rendered showcase clip is available

### Audio-caption blockers

- narrated video with no meaningful detected speech or transcript
- severe narration / caption mismatch that breaks comprehension
- narrated video with captions omitted or `captions.style: none` without an
	explicit human opt-out
- narration containing ellipses or literal punctuation artifacts such as
	"dot dot" that TTS reads aloud
- long silence inside expected narration regions
- narration that overlaps into adjacent scenes and causes simultaneous or scene-bleeding speech without deliberate design
- audio clipping, corruption, or sync failure obvious to a viewer

### Governance blockers

- moderation flag requiring escalation
- brand misspelling on screen for branded output
- legal / compliance disclaimer omitted when required
- rights / copyright issue requiring human decision

### Content blockers

- materially incorrect claim
- missing core message such that the video no longer serves its purpose
- narrated explainer whose primary audience cannot paraphrase the core idea
- fact-list structure with no causal through-line or accumulating example when
	the brief promises understanding or instruction
- central example, actor, or artifact changes without an explicit handoff,
	breaking the viewer's mental model
- necessary technical terms appear before the script supplies concrete context
	for the least familiar primary viewer
- persistent unnatural spoken phrasing after the mandatory read-aloud pass,
	including repeated slogan cadence or formulaic dramatic framing that obscures
	the mechanism
- narration claim not supported by a visible same-beat visual: architecture
	without a node/arrow architecture or flow diagram, metrics without a metric
	dashboard/chart, book/page narration without a book/page treatment, or
	app/workflow narration without the matching synthetic moving app surface

---

## Warning-only classes

Default to `warning` when the problem is noticeable but not delivery-blocking:

- minor brand deviations without explicit package requirements
- one awkward transition in an otherwise coherent video
- small OCR / transcript drift that does not break comprehension
- minor pacing inefficiency
- cosmetic style inconsistency with clear content still present

---

## Routing policy

Route blocker ownership by root cause:

- `script`: factual errors, tone mismatch, missing story beats, broken narrative
	spine, jargon-before-grounding, or failed spoken-language comprehension
- `assets`: prompt drift, poor source imagery, brand asset mismatch
- `compose`: black frames, frozen sections, bad timing, missing captions, bad mix, transition failure
- `human`: moderation, legal, policy waiver, unclear governance edge case

Route by the stage that must change to resolve the issue, not the stage where it became visible.

---

## Threshold guidance

Use these as default thresholds unless a pipeline overrides them:

- viewer-visible blank / black output lasting more than `2.0s` in one span is a blocker
- aggregate blank / black or frozen output above `10%` of runtime is a blocker
- scene-count drift above `30%` in a multi-scene video is a blocker candidate and must not score visual consistency above `1/3`
- narrated content with `0` transcript segments is a blocker candidate and must not score caption accuracy above `1/3`
- any authored scene with fewer visual beats than `ceil(scene_duration / 4s)`
	is a blocker candidate and must not score visual consistency above `1/3`
- unsupported narration-to-visual mappings are blocker candidates and must not
	score visual consistency above `1/3`

These are defaults, not excuses to ignore a clearly bad video that falls just under a numeric threshold.

---

## Interaction with self-review

The independent Reviewer should treat self-review as one evidence source, not as ground truth.

If self-review says `PASS` but blocker evidence exists, the Reviewer must fail the artifact and note that self-review under-called the defect.

---

## Output style

For every blocker, the report must include:

- what failed
- why it is blocking
- which evidence proved it
- who owns the fix
- the next concrete action

Example:

```markdown
Blocker: Rendered visual collapse
Evidence: authored 3 scenes, Video Indexer detected 1 scene, 17s black segment observed
Owner: compose
Fix: re-render the affected scene(s), then rerun render inspection and review
```
