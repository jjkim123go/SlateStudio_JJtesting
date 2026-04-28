# Video Indexer — Deep Review Signals

> Layer 2 — Slate-specific. Load this skill during the **review** stage when
> Azure Video Indexer is configured (`config/models.yaml` →
> `analysis_services.video-indexer` populated and `vi.is_available == True`).

## What VI gives you

After `_self_review()` invokes `VideoIndexer().execute(video_path=...)`, the
`vi_signals` dict contains the following Slate-normalized fields:

| Field | Type | Source | What it measures |
|-------|------|--------|------------------|
| `ocr_texts` | `list[str]` | VI OCR | Every text string actually rendered onto frames (titles, captions, structured-visual labels, lower-thirds) |
| `transcript_lines` | `list[{text, start, end, confidence}]` | VI STT | What VI's own ASR heard in the audio track, with timestamps |
| `scenes` | `list[{start, end, keyframe_id}]` | VI shot/scene detection | Visual scene boundaries VI inferred from the rendered video |
| `audio_effects` | `list[{type, start, end}]` | VI audio classification | Detected silence, speech, music, applause, etc. |
| `moderation` | `dict` | VI content safety | Adult/racy/violence flags per shot |
| `keywords` | `list[str]` | VI topic extraction | Auto-extracted topics |
| `faces` | `list[{name?, appearances}]` | VI face detection | People detected (named if VI recognizes them) |

All fields are present even when empty — never `None`.

## Signal → Rubric mapping

The 7-dimension P6 rubric in [review-director](../pipelines/animated-explainer/review-director.md)
already scores everything heuristically. VI **upgrades** specific dimensions
from heuristic to measurement. Use this table as the contract:

| Rubric dimension | Heuristic signal | VI upgrade signal | Threshold |
|------------------|------------------|--------------------|-----------|
| **caption_accuracy** | Word count vs duration | Word-overlap ratio: `len(narration_words ∩ vi_transcript_words) / len(narration_words)` | ≥0.85 = 3, 0.70–0.84 = 2, <0.70 = 1 |
| **content_coverage** | Scene count vs script paragraphs | Compare VI `keywords` against expected key terms from script | All key terms present = 3, ≥80% = 2, <80% = 1 |
| **visual_consistency** | FFmpeg frozen-frame detection | VI `scenes` count vs authored scene count: `abs(vi_scenes - authored_scenes) / authored_scenes` | ≤0.15 drift = 3, ≤0.30 = 2, >0.30 = 1 |
| **brand_compliance** | Brand-package field check | OCR-extract brand name & key terms; verify spelling matches brand package | Exact match = 3, minor case/punct = 2, misspelled = 1 |
| **content_redundancy** | Narration duplicate-line detection | OCR text duplication across non-adjacent scenes | No cross-scene OCR duplication = 3, 1 dup = 2, ≥2 = 1 |
| **audio_quality** | FFmpeg loudness probe | VI `audio_effects` — silence gaps in narration regions | No mid-narration silence >0.5s = 3 |
| **pacing** | Duration vs target | VI `scenes` durations — none should be <2s or >12s | All within range = 3, 1 outlier = 2, ≥2 = 1 |

## Required interpretation rules

When `vi_signals` is present, the review-director MUST apply these rules
**before** finalizing scores:

### Rule R1: Caption accuracy is measured, not estimated
Compute `caption_accuracy_ratio` = word-overlap as defined above. **Replace**
the heuristic caption_accuracy score with the measured score. Add a warning
line stating the exact ratio (e.g., `"Caption accuracy 68% — narration drift detected"`).

### Rule R2: Scene-count drift flags soft transitions
If `len(vi_signals["scenes"]) < authored_scenes_count * 0.85`, VI failed to
detect some authored boundaries. Most likely cause: crossfades too long
(>500ms) or visually similar adjacent scenes. Add warning, score
`visual_consistency` no higher than 2.

### Rule R3: OCR spell-check against brand package
For every term in `brand_package.glossary` (or company name, product names),
check it appears verbatim in `vi_signals["ocr_texts"]`. A misspelled brand
name on screen scores `brand_compliance = 1` regardless of color/font checks.

### Rule R4: Mid-narration silence is an audio defect
For each authored scene with a narration track, check VI `audio_effects` for
`type == "silence"` segments overlapping the scene's narration region. Any
silence ≥500ms inside narration → `audio_quality = 1`, recommend re-render
of that scene's audio.

### Rule R5: Moderation flags block delivery
If any `moderation.adult|racy|violence` shot-level score is `>0.5`,
override the entire verdict to `BLOCK` regardless of other scores. This is
a hard stop — escalate to user before any publish.

### Rule R6: Faces in non-people scenes flag prompt drift
If a scene was authored without people-related keywords but VI detects
faces, the image generator likely hallucinated a person. Add warning,
review the scene's `visual_prompt` for ambiguity.

## What VI does NOT replace

| Heuristic | Why VI doesn't help |
|-----------|---------------------|
| Frozen-frame detection | VI scene boundaries are too coarse; keep FFmpeg `freezedetect` |
| Sample frame extraction | VI keyframes are for VI's UI, not arbitrary frame inspection |
| Brand-color verification | VI doesn't analyze color palettes against brand spec |
| Font verification | VI OCR doesn't return font metadata |
| Cost tracking | VI is itself a cost — log per-review usage to `cost_log.jsonl` |

## When VI is NOT available

If `vi.is_available == False` (no config, no token, network failure):

1. **Do not block the review.** All 7 dimensions still score via heuristics.
2. **Do** add the warning `"Video Indexer not configured — caption accuracy uses heuristic scoring"` (already emitted by `_self_review`).
3. **Do not** invent VI-style scores. Heuristic caption_accuracy is duration-based only and tops out at 2/3 unless narration text is verifiably aligned.
4. **Do** suggest enabling VI in the final review report for higher-fidelity reviews on future productions, with the cost estimate (`$0.09/min × video_duration`).

## Cost & rate limits

- **Cost:** $0.09/min (Standard) or $0.15/min (Advanced). Slate uses Standard.
- **Time:** ~1× video duration for indexing (a 2-min video → ~2 min of VI processing).
- **Rate limits:** VI rejects re-uploads of identical content within ~24h with HTTP 409 ALREADY_EXISTS — reuse the returned `video id` if encountered.
- **Budget:** Account for VI in the project budget — log each invocation to `cost_log.jsonl` with `service: "video-indexer"`.

## Output contract

After applying VI signals, the review-director report MUST include a
"Deep-Review Signals" section listing the raw VI counts and which rubric
dimensions were upgraded. This makes the audit trail explicit:

```markdown
## Deep-Review Signals (Azure Video Indexer)

- OCR hits: 114
- Transcript segments: 22
- Scenes detected: 6 (authored: 8, drift: -25%)
- Audio effects: 3 silence gaps detected
- Moderation: clean (no flags)
- Faces: 0 detected

**Upgraded scores:**
- caption_accuracy: 2/3 (measured 68% word overlap)
- visual_consistency: 2/3 (scene drift -25%)
```

If VI was not available, that section reads:
```markdown
## Deep-Review Signals

Video Indexer not configured — review used heuristic scoring only.
Enable VI for measured caption accuracy and scene-drift detection
(~$0.09/min, ~2 min indexing time per video).
```
