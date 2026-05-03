"""Slate Video Renderer — end-to-end video production from a scenario description.

Usage:
    python scripts/slate_render.py <scenario_json> [output_dir]

The scenario JSON should contain:
    title: Video title
    company: Company name (default: Contoso)
    tagline: Company tagline
    voice: Voice preset (default: professional-female)
    style: Visual style/palette (default: premium-velvet)
    scenes: list of scene objects with:
        id: Unique scene ID
        title: Scene title
        narration: Narration text
        visual_prompt: (optional) AI image generation prompt
        bullet_points: (optional) list of bullet points
        duration: (optional) override duration — auto-calculated from narration if omitted

Design note: The stage-based orchestration pattern (ingest → script → scene_plan →
assets → compose → review) is a clean-room design inspired by OpenMontage's pipeline
architecture (AGPL-3.0). Slate's renderer is purpose-built for Azure AI Foundry
models and enterprise brand compliance.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

# Add scripts/lib and project root to path
sys.path.insert(0, str(Path(__file__).parent / "lib"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from image_gen import (
    generate_brand_intro,
    generate_brand_outro,
    generate_scene_image,
    generate_ai_image,
    generate_structured_image,
    PALETTES,
)
from tts_gen import generate_tts, estimate_speech_duration, select_voice_for_scene, VIDEO_TYPE_VOICES
from video_compose import (
    create_scene_video,
    create_clip_scene_video,
    concatenate_videos,
    burn_subtitles,
    probe_video,
)
from video_gen import generate_video_clip
from subtitle_burner import burn_subtitle_on_image
from live_subtitles import (
    load_word_sidecar,
    transcribe_audio,
    estimate_word_timestamps,
    group_into_segments,
    create_scene_video_with_subtitles,
)
from scf_validate import (
    validate_captions_required,
    validate_narration_text_quality,
    validate_narration_visual_support,
    validate_scf_pre_render,
    validate_visual_hold_duration,
)

# Governance is optional — only imported when governance=True
_governance_available = False
try:
    from slate.core.governance_context import GovernanceContext
    _governance_available = True
except ImportError:
    pass

# Cost tracking — always available (no external deps)
_cost_tracker_available = False
try:
    from slate.core.cost_tracker import CostTracker
    from slate.core.budget import apply_hard_cap_enforcement, load_project_config, resolve_project_budget
    _cost_tracker_available = True
except ImportError:
    pass

# Brand package + SCF composer — optional, for brand enforcement and SCF output
_brand_available = False
try:
    from slate.core.brand_package import BrandPackage
    from slate.core.scf_composer import SCFComposer, AssetManifest
    _brand_available = True
except ImportError:
    pass

# Document ingest — optional, for --input flag
_ingest_available = False
try:
    from slate.tools.ingest.parsers import parse_document
    _ingest_available = True
except ImportError:
    pass

# Eval harness — optional, for P6 self-review post-render
_eval_available = False
try:
    from slate.core.eval_harness import EvalHarness
    _eval_available = True
except ImportError:
    pass


# Video inspection — optional, for multimodal self-review (P6)
_inspect_available = False
try:
    from video_inspect import inspect_video
    _inspect_available = True
except ImportError:
    pass

# Video Indexer — optional, for deep review (OCR, transcript, scenes)
_vi_available = False
try:
    from slate.tools.analysis.video_indexer import VideoIndexer, VideoIndexerConfig
    _vi_available = True
except ImportError:
    pass

# Reviewer protocol — optional, for explicit post-compose review stage
_reviewer_available = False
try:
    from slate.agents import ReviewerAgent, ReviewFinding, ReviewType, FindingSeverity
    _reviewer_available = True
except ImportError:
    pass


def _build_reviewer_findings(self_review: dict) -> list:
    """Map self-review failures and warnings into ReviewerAgent findings."""
    if not _reviewer_available:
        return []

    findings = []
    score_categories = {
        "brand_compliance": "brand_color",
        "caption_accuracy": "caption_sync",
        "audio_quality": "audio_level",
        "visual_consistency": "transition_jarring",
        "pacing": "timing_issue",
        "content_accuracy": "factual_error",
        "content_coverage": "script_length",
    }

    for dimension, score in (self_review.get("scores") or {}).items():
        if score >= 3:
            continue
        findings.append(
            ReviewFinding.create(
                category=score_categories.get(dimension, "unknown"),
                description=f"{dimension} scored {score}/3 during compose self-review",
                severity=FindingSeverity.BLOCKER if score == 1 else FindingSeverity.WARNING,
            )
        )

    for warning in self_review.get("warnings", []):
        findings.append(
            ReviewFinding.create(
                category="unknown",
                description=warning,
                severity=FindingSeverity.WARNING,
            )
        )

    return findings


_FALLBACK_METHODS = {"fallback-ffmpeg", "silence-fallback"}


def _require_generation_success(result: dict, scene_id: str, asset_type: str) -> None:
    """Raise when an asset generator failed."""
    if not isinstance(result, dict):
        raise RuntimeError(f"{asset_type} generation for {scene_id} returned no result")
    method = result.get("method")
    if result.get("success") is False or method == "failed":
        detail = result.get("error") or result.get("fallback_reason") or method or "unknown failure"
        raise RuntimeError(f"{asset_type} generation failed for {scene_id}: {detail}")


def _track_generation_fallback(result: dict, scene_id: str, asset_type: str, fallback_scenes: list[str]) -> None:
    """Record explicitly approved generation fallbacks for review visibility."""
    method = result.get("method") if isinstance(result, dict) else None
    if method not in _FALLBACK_METHODS:
        return
    if scene_id not in fallback_scenes:
        fallback_scenes.append(scene_id)
    detail = result.get("fallback_reason") or result.get("error") or method
    print(f"     ⚠ {asset_type} fallback used for {scene_id}: {detail}")


def _write_review_report_markdown(report: dict, review_md_path: Path, video_path: str | None = None) -> None:
    """Persist a concise review report for the explicit review stage."""
    lines = [
        "# Review Report",
        "",
        f"**Outcome:** {'Pass' if report.get('passed') else 'Revise'}",
        f"**Reviewer:** {report.get('reviewer', 'runtime-review-stage')}",
    ]
    if video_path:
        lines.append(f"**Video:** {video_path}")
    lines.extend([
        "",
        "## Scores",
        "",
        "| Dimension | Score |",
        "|---|---|",
    ])

    for dimension, score in (report.get("scores") or {}).items():
        lines.append(f"| {dimension} | {score}/3 |")

    lines.extend([
        "",
        f"**Total:** {report.get('total_score', 0)}/{report.get('max_score', 0)}",
        "",
        "## Summary",
        "",
        report.get("summary", "No summary provided."),
    ])

    findings = report.get("findings") or []
    if findings:
        lines.extend(["", "## Findings", ""])
        for finding in findings:
            lines.append(
                f"- [{finding.get('severity', 'suggestion')}] {finding.get('category', 'unknown')}: "
                f"{finding.get('description', '')}"
            )

    review_md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _run_review_stage(
    output_dir: str | Path,
    self_review: dict,
    video_path: str | None = None,
    scf_path: str | None = None,
    brand_name: str | None = None,
    title: str | None = None,
) -> dict:
    """Execute the post-compose review stage using ReviewerAgent."""
    out_dir = Path(output_dir)
    review_context_path = out_dir / "review_context.json"
    review_json_path = out_dir / "review_report.json"
    review_md_path = out_dir / "review_report.md"

    artifacts = {
        "video_path": video_path,
        "scf_path": scf_path,
        "self_review": self_review,
        "title": title,
    }
    trace_metrics = {
        "self_review_total": self_review.get("total", 0),
        "self_review_max_total": self_review.get("max_total", 0),
        "self_review_verdict": self_review.get("verdict", "UNKNOWN"),
    }

    if not _reviewer_available:
        fallback = {
            "review_type": "final",
            "reviewer": "runtime-review-stage",
            "scores": self_review.get("scores", {}),
            "total_score": self_review.get("total", 0),
            "max_score": self_review.get("max_total", 0),
            "passed": self_review.get("verdict") != "FAIL",
            "findings": [],
            "summary": "ReviewerAgent unavailable — falling back to compose self-review verdict.",
        }
        review_context_path.write_text(
            json.dumps(
                {
                    "artifacts": artifacts,
                    "trace_metrics": trace_metrics,
                    "agent_action_contract": {
                        "instruction": "Validate review findings against the available evidence, then fix the valid issues before delivery.",
                        "on_pass": "Proceed to user review or delivery.",
                        "on_fail": "Do not stop at reporting. Validate the findings, act on them, and re-run review unless a human override is required.",
                        "allowed_actions": ["fix_and_rerender", "request_human_override", "escalate_to_human"],
                    },
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        review_json_path.write_text(json.dumps(fallback, indent=2), encoding="utf-8")
        _write_review_report_markdown(fallback, review_md_path, video_path=video_path)
        return {
            "review_context_path": str(review_context_path),
            "review_report_path": str(review_json_path),
            "review_markdown_path": str(review_md_path),
            "report": fallback,
        }

    reviewer = ReviewerAgent(min_dimension_score=2, min_total_score=14)
    review_context = reviewer.build_review_context(
        review_type=ReviewType.FINAL,
        artifacts=artifacts,
        trace_metrics=trace_metrics,
        brand_package={"name": brand_name} if brand_name else None,
    )
    findings = _build_reviewer_findings(self_review)
    report = reviewer.create_report(
        review_type=ReviewType.FINAL,
        scores=self_review.get("scores", {}),
        findings=findings,
        summary=(
            "Explicit review stage executed after compose using ReviewerAgent. "
            f"Compose self-review verdict was {self_review.get('verdict', 'UNKNOWN')}."
        ),
        reviewer="runtime-review-stage",
    )
    report_dict = report.to_dict()

    review_context_path.write_text(json.dumps(review_context, indent=2), encoding="utf-8")
    review_json_path.write_text(json.dumps(report_dict, indent=2), encoding="utf-8")
    _write_review_report_markdown(report_dict, review_md_path, video_path=video_path)

    print(f"  🧾 Review stage: {'PASS' if report.passed else 'REVISE'} ({report.total_score}/{report.max_score})")
    print(f"     Review report: {review_md_path}")

    return {
        "review_context_path": str(review_context_path),
        "review_report_path": str(review_json_path),
        "review_markdown_path": str(review_md_path),
        "report": report_dict,
    }


def _self_review(trace_path: str | None, total_duration: float, target_duration: float | None,
                  scene_count: int, brand_name: str | None,
                  video_path: str | None = None,
                  fallback_scenes: list[str] | None = None,
                  motion_style: str | None = None,
                  scenes: list[dict] | None = None,
                  deep_review: bool = True,
                  narration_texts: list[str] | None = None,
                  captions: dict | None = None) -> dict:
    """P6 Self-Review: automated quality check after render.

    Runs the 6-dimension rubric, the EvalHarness (if trace available),
    and multimodal video inspection (if video_path provided + tools available).

    When ``deep_review`` is True (default) AND the Video Indexer client is
    importable AND the configured account is reachable, we additionally
    run Azure AI Video Indexer for frame-level OCR, transcript comparison,
    scene boundary detection, and content moderation. If VI is not
    configured, this step silently no-ops and the rubric falls back to
    heuristic scoring.

    Returns a summary dict with scores and warnings.
    """
    scores = {}
    warnings = []
    fallback_scenes = fallback_scenes or []
    scenes = scenes or []

    def _has_renderable_content(value) -> bool:
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, (list, tuple, dict, set)):
            return bool(value)
        return True

    def _review_synthetic_surface_contracts() -> tuple[int, list[str]]:
        score = 3
        findings: list[str] = []
        rules = {
            "OutlookScene": {
                "required": ("viewBodyHtml", "stepsHtml"),
                "canonical": ("viewBodyHtml",),
            },
            "VSCodeScene": {
                "required": ("codeContentHtml", "primarySidebarBodyHtml", "stepsHtml"),
                "canonical": ("codeContentHtml", "primarySidebarBodyHtml"),
            },
            "GitHubScene": {
                "required": ("bodyHtml", "stepsHtml"),
                "canonical": ("bodyHtml",),
            },
            "TeamsScene": {
                "required": ("contentHtml", "stepsHtml", "steps"),
                "canonical": ("contentHtml", "steps"),
            },
        }

        for scene in scenes:
            components = [scene.get("component"), *(scene.get("components") or [])]
            components = [component for component in components if component]
            components = list(dict.fromkeys(components))
            if not components:
                continue
            component_layers = {
                layer.get("component"): layer.get("props") or {}
                for layer in scene.get("layers") or []
                if layer.get("type") == "component" and layer.get("component")
            }
            for component in components:
                rule = rules.get(component)
                if not rule:
                    continue
                props = component_layers.get(component) or scene.get("props") or {}
                if not any(_has_renderable_content(props.get(field)) for field in rule["required"]):
                    score = 1
                    findings.append(
                        f"Synthetic surface {scene.get('id', component)} ({component}) is missing a renderable body contract"
                    )
                    continue

                has_legacy = _has_renderable_content(props.get("stepsHtml"))
                has_canonical = any(_has_renderable_content(props.get(field)) for field in rule["canonical"])
                if has_legacy and not has_canonical:
                    score = min(score, 2)
                    findings.append(
                        f"Synthetic surface {scene.get('id', component)} ({component}) is using the legacy compatibility path; prefer the canonical slot contract"
                    )

        return score, findings

    # 0a. Motion style governance — soft warning if not set
    if not motion_style:
        warnings.append(
            "⚠ No motion_style set in scenario — "
            "the ingest stage should confirm image/motion/hybrid with the user (P7 governance)"
        )
    elif scenes:
        # Check for mismatches between declared style and actual scene content
        has_video_prompts = any(s.get("video_prompt") for s in scenes)
        has_image_scenes = any(not s.get("video_prompt") and s.get("visual_prompt") for s in scenes)
        if motion_style == "image" and has_video_prompts:
            warnings.append(
                "⚠ motion_style is 'image' but some scenes have video_prompt — "
                "scene plan doesn't match the agreed motion style"
            )
        if motion_style == "motion" and has_image_scenes and not has_video_prompts:
            warnings.append(
                "⚠ motion_style is 'motion' but no scenes have video_prompt — "
                "scene plan doesn't match the agreed motion style"
            )

    # 0b. Fallback detection — flag any scenes that used placeholder clips
    if fallback_scenes:
        warnings.append(
            f"⚠ {len(fallback_scenes)} scene(s) used fallback placeholders instead of AI video: "
            + ", ".join(fallback_scenes)
        )

    # 1. Brand compliance (3=brand applied, 2=partial, 1=no brand when expected)
    if brand_name:
        scores["brand_compliance"] = 3
    else:
        scores["brand_compliance"] = 2
        warnings.append("No brand package applied — consider using --brand for consistency")

    # 2. Pacing (check duration vs target)
    if target_duration and target_duration > 0:
        deviation = abs(total_duration - target_duration) / target_duration
        if deviation <= 0.10:
            scores["pacing"] = 3
        elif deviation <= 0.20:
            scores["pacing"] = 2
            warnings.append(f"Duration {total_duration:.0f}s vs target {target_duration:.0f}s ({deviation:.0%} off)")
        else:
            scores["pacing"] = 1
            warnings.append(f"⚠ Duration {total_duration:.0f}s significantly off target {target_duration:.0f}s ({deviation:.0%})")
    else:
        scores["pacing"] = 2  # No target specified — can't fully evaluate

    # 3. Scene coverage (at least 3 content scenes for a substantive video)
    if scene_count >= 5:
        scores["content_coverage"] = 3
    elif scene_count >= 3:
        scores["content_coverage"] = 2
    else:
        scores["content_coverage"] = 1
        warnings.append(f"Only {scene_count} scenes — may feel incomplete")

    surface_contract_score, surface_contract_findings = _review_synthetic_surface_contracts()
    warnings.extend(surface_contract_findings)

    normalized_review_scenes = []
    for index, scene in enumerate(scenes):
        normalized = dict(scene)
        if narration_texts and index < len(narration_texts) and narration_texts[index]:
            normalized.setdefault("narrationText", narration_texts[index])
        normalized_review_scenes.append(normalized)

    # 3b. Narration overflow — check that narration audio fits within scene durations
    narration_overflows = []
    if scenes:
        for scene in scenes:
            narration_src = scene.get("narration")
            scene_dur = scene.get("duration", 0)
            if not narration_src or not scene_dur:
                continue
            # Try to probe actual narration audio duration
            try:
                narration_path = Path(narration_src)
                if not narration_path.is_absolute() and video_path:
                    # Try resolving relative to video's parent directory
                    narration_path = Path(video_path).parent / narration_src
                if narration_path.exists():
                    probe_result = subprocess.run(
                        ["ffprobe", "-v", "quiet", "-print_format", "json",
                         "-show_format", str(narration_path)],
                        capture_output=True, text=True, timeout=10
                    )
                    audio_dur = float(json.loads(probe_result.stdout)["format"]["duration"])
                    overflow = audio_dur - scene_dur
                    if overflow > 0.5:
                        narration_overflows.append({
                            "scene_id": scene.get("id", "?"),
                            "scene_duration": scene_dur,
                            "audio_duration": round(audio_dur, 2),
                            "overflow_sec": round(overflow, 2),
                        })
            except Exception:
                pass

    if narration_overflows:
        scores["narration_timing"] = 1
        overflow_details = ", ".join(
            f"{o['scene_id']} ({o['audio_duration']}s audio in {o['scene_duration']}s scene)"
            for o in narration_overflows
        )
        warnings.append(f"⚠ Narration overflow in {len(narration_overflows)} scene(s): {overflow_details}")
    elif scenes and any(s.get("narration") for s in scenes):
        scores["narration_timing"] = 3
    else:
        scores["narration_timing"] = 3  # No narration to check

    # 4-6. Multimodal inspection: frozen frames, audio levels, silence gaps
    inspection = None
    if video_path and _inspect_available:
        try:
            inspection = inspect_video(video_path)
        except Exception as e:
            warnings.append(f"Video inspection failed: {e}")

    vi_signals = None
    if deep_review and _vi_available and video_path:
        try:
            import asyncio
            vi = VideoIndexer()
            if vi.is_available:
                loop = asyncio.get_event_loop() if asyncio.get_event_loop().is_running() else asyncio.new_event_loop()
                result = loop.run_until_complete(vi.execute(video_path=video_path))
                if result.success:
                    vi_signals = result.output
                    warnings.append(
                        f"🔍 Video Indexer deep review: {len(vi_signals.get('ocr_texts', []))} OCR hits, "
                        f"{len(vi_signals.get('transcript_lines', []))} transcript segments, "
                        f"{len(vi_signals.get('scenes', []))} scenes detected"
                    )
                else:
                    warnings.append(f"Video Indexer analysis skipped: {result.error}")
            else:
                warnings.append("Video Indexer not configured — caption accuracy uses heuristic scoring")
        except Exception as e:
            warnings.append(f"Video Indexer failed: {e}")

    if inspection and not inspection.get("error"):
        # 4. Audio quality — based on volume levels and silence gaps
        audio = inspection.get("audio_levels")
        if audio and audio.get("mean_volume_db") is not None:
            mean_db = audio["mean_volume_db"]
            max_db = audio.get("max_volume_db", -10)
            long_silences = [s for s in audio.get("silence_ranges", []) if s["duration_sec"] > 3.0]
            if -30 <= mean_db <= -5 and max_db < -0.3 and not long_silences:
                scores["audio_quality"] = 3
            elif mean_db < -35 or max_db > -0.5 or long_silences:
                scores["audio_quality"] = 1
                if mean_db < -35:
                    warnings.append(f"Audio too quiet: mean {mean_db:.1f} dB")
                if max_db > -0.5:
                    warnings.append(f"Audio clipping risk: peak {max_db:.1f} dB")
                if long_silences:
                    warnings.append(f"{len(long_silences)} silence gap(s) > 3 seconds")
            else:
                scores["audio_quality"] = 2
        else:
            scores["audio_quality"] = 2

        def _video_intervals() -> list[tuple[float, float]]:
            intervals: list[tuple[float, float]] = []
            cursor = 0.0
            for scene in scenes:
                try:
                    scene_dur = float(scene.get("duration") or 0)
                except Exception:
                    scene_dur = 0.0
                for layer in scene.get("layers") or []:
                    if layer.get("type") != "video":
                        continue
                    start = cursor + float(layer.get("startTime") or 0)
                    end = cursor + float(layer.get("endTime") or scene_dur)
                    if end > start:
                        intervals.append((start, end))
                cursor += scene_dur
            return intervals

        def _overlaps_interval(section: dict, intervals: list[tuple[float, float]]) -> bool:
            start = float(section.get("start_sec") or 0)
            end = float(section.get("end_sec") or start)
            return any(start < interval_end and end > interval_start for interval_start, interval_end in intervals)

        # 5. Visual consistency — frozen frame detection.
        #    Static/component scenes are expected to hold on an image or UI surface.
        #    In hybrid videos, only freezes that overlap authored video-layer windows
        #    are suspicious; otherwise the detector raises false positives on valid
        #    static product-showcase scenes.
        video_intervals = _video_intervals()
        if motion_style == "image":
            scores["visual_consistency"] = 3
        else:
            frozen = inspection.get("frozen_sections", [])
            if motion_style == "hybrid" and video_intervals:
                frozen = [f for f in frozen if _overlaps_interval(f, video_intervals)]
            if not frozen:
                scores["visual_consistency"] = 3
            elif len(frozen) <= 1 and all(f["duration_sec"] < 2.0 for f in frozen):
                scores["visual_consistency"] = 2
                warnings.append(f"Minor freeze detected: {frozen[0]['duration_sec']:.1f}s at {frozen[0]['start_sec']:.1f}s")
            else:
                scores["visual_consistency"] = 1
                total_frozen = sum(f["duration_sec"] for f in frozen)
                warnings.append(f"⚠ {len(frozen)} frozen sections ({total_frozen:.1f}s total) — clip looping may be needed")

        # 5b. Black frame detection — missing content, failed asset loads, gaps
        blacks = inspection.get("black_sections", [])
        if blacks:
            total_black = sum(b["duration_sec"] for b in blacks)
            if total_black > 2.0:
                # Dark cinematic clips and dark-background components can trip the
                # luminance heuristic even when authored content is present. Treat
                # as a warning for authored SCF scenes; missing assets are caught by
                # pre-compose validation before render.
                scores["visual_consistency"] = min(scores.get("visual_consistency", 3), 2)
                warnings.append(
                    f"Dark/black sections detected ({len(blacks)} section(s), {total_black:.1f}s total); "
                    "verify intentional dark scenes vs. missing content"
                )
            elif total_black > 0.5:
                scores["visual_consistency"] = min(scores.get("visual_consistency", 3), 2)
                warnings.append(
                    f"Minor black section(s): {total_black:.1f}s total — "
                    "may be transition gaps or short asset load failures"
                )

        if not vi_signals:
            scores["caption_accuracy"] = 2

        # Surface all inspection issues
        for issue in inspection.get("issues", []):
            if issue not in [w for w in warnings]:
                warnings.append(f"Inspection: {issue}")
    else:
        # No inspection available — default to assumed-OK
        scores["audio_quality"] = 2
        scores["visual_consistency"] = 2
        scores["caption_accuracy"] = 2

    if vi_signals:
        vi_scene_count = len(vi_signals.get("scenes", []))
        authored_scene_count = max(scene_count, 1)

        # Compare VI transcript against expected narration texts
        vi_transcript = " ".join(t["text"] for t in vi_signals.get("transcript_lines", []))
        expected_narration = " ".join(narration_texts) if narration_texts else ""

        if vi_transcript and expected_narration:
            vi_words = set(vi_transcript.lower().split())
            expected_words = set(expected_narration.lower().split())
            if expected_words:
                overlap = len(vi_words & expected_words) / len(expected_words)
                if overlap >= 0.85:
                    scores["caption_accuracy"] = 3
                elif overlap >= 0.60:
                    scores["caption_accuracy"] = 2
                    warnings.append(f"Caption accuracy ~{overlap:.0%} — some narration words missing from audio")
                else:
                    scores["caption_accuracy"] = 1
                    warnings.append(f"⚠ Caption accuracy {overlap:.0%} — significant narration/audio mismatch")
            else:
                scores["caption_accuracy"] = 2
        elif vi_signals.get("ocr_texts"):
            scores["caption_accuracy"] = 2
        else:
            scores["caption_accuracy"] = 1 if expected_narration else 2
            if expected_narration:
                warnings.append("⚠ Video Indexer found no transcript segments for narrated content")

        scene_drift = abs(vi_scene_count - authored_scene_count) / authored_scene_count
        if scene_drift > 0.30:
            # Video Indexer often groups static/component-heavy sections into
            # fewer detected scenes than the authored SCF. Treat that as a
            # review warning rather than a blocker; hard blockers should come
            # from missing assets, black-frame spans, or real clip freezes.
            scores["visual_consistency"] = min(scores.get("visual_consistency", 2), 2)
            warnings.append(
                f"Video Indexer scene drift {scene_drift:.0%} — authored {authored_scene_count}, detected {vi_scene_count}"
            )
        elif scene_drift > 0.15:
            scores["visual_consistency"] = min(scores.get("visual_consistency", 2), 2)
            warnings.append(
                f"Video Indexer scene drift {scene_drift:.0%} — authored {authored_scene_count}, detected {vi_scene_count}"
            )

        audio_effects = vi_signals.get("audio_effects", [])
        silence_effects = [e for e in audio_effects if e["type"] in ("Silence", "silence")]
        if silence_effects and scores.get("audio_quality", 2) >= 2:
            total_silence = sum(e["end_sec"] - e["start_sec"] for e in silence_effects)
            if total_silence > 5.0:
                scores["audio_quality"] = max(1, scores.get("audio_quality", 2) - 1)
                warnings.append(f"VI detected {total_silence:.1f}s total silence in audio")

        mod = vi_signals.get("moderation", {})
        if mod.get("is_adult") or mod.get("is_racy"):
            warnings.append(
                f"⚠ Content moderation flag: adult={mod.get('adult_score', 0):.2f}, "
                f"racy={mod.get('racy_score', 0):.2f} — review before publishing"
            )

    scores["visual_consistency"] = min(scores.get("visual_consistency", 2), surface_contract_score)

    scf_like_for_quality = {"captions": captions or {}, "scenes": normalized_review_scenes}
    caption_issues = validate_captions_required(scf_like_for_quality)
    visual_hold_issues = validate_visual_hold_duration(scf_like_for_quality)
    visual_support_issues = validate_narration_visual_support(scf_like_for_quality)
    narration_text_issues = validate_narration_text_quality(scf_like_for_quality)

    if caption_issues:
        scores["caption_accuracy"] = 1
        warnings.extend(f"⚠ {issue['detail']}" for issue in caption_issues)

    if visual_hold_issues:
        scores["visual_consistency"] = 1
        warnings.extend(
            f"⚠ {issue['scene_id']}: {issue['detail']}"
            for issue in visual_hold_issues
        )

    if visual_support_issues:
        scores["visual_consistency"] = 1
        scores["content_coverage"] = min(scores.get("content_coverage", 2), 1)
        warnings.extend(
            f"⚠ {issue['scene_id']}: {issue['detail']}"
            for issue in visual_support_issues
        )

    if narration_text_issues:
        scores["audio_quality"] = 1
        warnings.extend(
            f"⚠ {issue['scene_id']}: {issue['detail']}"
            for issue in narration_text_issues
        )

    # 7. Content redundancy — detect repetitive narration across scenes
    if narration_texts and len(narration_texts) >= 3:
        words_per_scene = [set(n.lower().split()) for n in narration_texts if n]
        if len(words_per_scene) >= 3:
            max_overlap = 0.0
            for a in range(len(words_per_scene)):
                for b in range(a + 1, len(words_per_scene)):
                    if words_per_scene[a] and words_per_scene[b]:
                        overlap = len(words_per_scene[a] & words_per_scene[b]) / max(
                            len(words_per_scene[a] | words_per_scene[b]), 1
                        )
                        max_overlap = max(max_overlap, overlap)
            if max_overlap < 0.40:
                scores["content_redundancy"] = 3
            elif max_overlap < 0.60:
                scores["content_redundancy"] = 2
                warnings.append(f"Moderate narration overlap ({max_overlap:.0%}) between scenes — consider varying language")
            else:
                scores["content_redundancy"] = 1
                warnings.append(f"⚠ High narration overlap ({max_overlap:.0%}) — scenes repeat too much content")
        else:
            scores["content_redundancy"] = 3  # Not enough scenes to compare
    else:
        scores["content_redundancy"] = 3  # Too few scenes or no narration

    # Run EvalHarness on production trace if available
    eval_report = None
    if trace_path and _eval_available:
        try:
            trace_file = Path(trace_path)
            if trace_file.exists():
                eval_report = EvalHarness.evaluate(trace_file)
        except Exception as e:
            warnings.append(f"EvalHarness failed: {e}")

    total = sum(scores.values())
    max_total = len(scores) * 3
    any_fail = any(v == 1 for v in scores.values())
    verdict = "FAIL" if any_fail or (total / max_total < 0.67) else "PASS"

    # ── Corrective loop: generate actionable fix suggestions for score=1 dims ──
    fixes_needed = []
    for dim, score in scores.items():
        if score != 1:
            continue
        if dim == "pacing":
            fixes_needed.append({
                "dimension": "pacing",
                "action": "trim_narration",
                "detail": "Total narration exceeds target duration by >25%. "
                          "Trim narration text in the longest scenes or reduce scene count.",
            })
        elif dim == "visual_consistency":
            frozen_count = len(inspection.get("frozen_sections", [])) if inspection else 0
            fixes_needed.append({
                "dimension": "visual_consistency",
                "action": "fix_frozen_frames",
                "detail": f"{frozen_count} frozen section(s) detected. "
                          "Ensure clips are long enough for their scene duration "
                          "(use -stream_loop or extend clip).",
            })
        elif dim == "audio_quality":
            fixes_needed.append({
                "dimension": "audio_quality",
                "action": "fix_audio_levels",
                "detail": "Audio levels outside acceptable range or long silence gaps detected. "
                          "Re-mix with normalized levels or regenerate TTS for affected scenes.",
            })
        elif dim == "content_coverage":
            fixes_needed.append({
                "dimension": "content_coverage",
                "action": "add_scenes",
                "detail": f"Only {scene_count} scenes — add more content scenes for a substantive video.",
            })
        elif dim == "content_redundancy":
            fixes_needed.append({
                "dimension": "content_redundancy",
                "action": "rewrite_narration",
                "detail": "Multiple scenes have >60% word overlap. Rewrite narration to "
                          "vary vocabulary and present distinct points in each scene.",
            })
        elif dim == "narration_timing":
            overflow_detail = "; ".join(
                f"{o['scene_id']}: {o['audio_duration']}s audio > {o['scene_duration']}s scene"
                for o in narration_overflows
            ) if narration_overflows else "narration exceeds scene duration"
            fixes_needed.append({
                "dimension": "narration_timing",
                "action": "fix_narration_overflow",
                "detail": f"Narration audio overflows scene duration in {len(narration_overflows)} scene(s). "
                          f"Extend scene durations to match actual TTS output or re-generate shorter narration. "
                          f"Overflows: {overflow_detail}",
            })

    if fixes_needed:
        print(f"    🔧 {len(fixes_needed)} corrective action(s) recommended:")
        for fix in fixes_needed:
            print(f"       → [{fix['dimension']}] {fix['action']}: {fix['detail'][:80]}...")

    # Print summary
    print(f"\n  {'─'*50}")
    print(f"  🔍 P6 SELF-REVIEW — {verdict} ({total}/{max_total})")
    print(f"  {'─'*50}")
    for dim, score in scores.items():
        icon = "✅" if score == 3 else ("⚠️" if score == 2 else "❌")
        print(f"    {icon} {dim}: {score}/3")
    for w in warnings:
        print(f"    💡 {w}")
    if inspection and inspection.get("sample_frames"):
        print(f"    📸 {len(inspection['sample_frames'])} sample frames extracted for visual review")
    if eval_report:
        print(f"    📊 EvalHarness: {eval_report.verdict} ({eval_report.score_pct:.0f}%)")
    print(f"  {'─'*50}")

    return {
        "verdict": verdict,
        "scores": scores,
        "total": total,
        "max_total": max_total,
        "warnings": warnings,
        "inspection": {
            "frozen_sections": inspection.get("frozen_sections", []) if inspection else [],
            "black_sections": inspection.get("black_sections", []) if inspection else [],
            "audio_levels": inspection.get("audio_levels") if inspection else None,
            "sample_frame_count": len(inspection.get("sample_frames", [])) if inspection else 0,
        },
        "eval_harness": eval_report.to_dict() if eval_report else None,
        "fixes_needed": fixes_needed,
    }


# Default words-per-minute for narration timing estimation
_DEFAULT_WPM = 150
_DURATION_WARN_THRESHOLD = 0.10  # 10% deviation triggers warning
_DURATION_FAIL_THRESHOLD = 0.25  # 25% deviation is a hard warn


def validate_script_timing(scenario: dict) -> list[str]:
    """Check narration word counts against target duration.

    Returns a list of warning strings. Empty list = all good.
    Called before rendering to catch pacing issues early.
    """
    warnings = []
    target = scenario.get("target_duration")
    if not target:
        return warnings  # No target to validate against

    target = float(target)
    scenes = scenario.get("scenes", [])
    total_words = 0
    for scene in scenes:
        narration = scene.get("narration", "")
        total_words += len(narration.split())

    # Add intro/outro narration words
    intro_words = len(scenario.get("intro_narration", "").split())
    outro_words = len(scenario.get("outro_narration", "").split())
    total_words += intro_words + outro_words

    estimated_sec = (total_words / _DEFAULT_WPM) * 60
    # Add ~1s padding per scene for transitions
    estimated_sec += len(scenes) * 1.0 + 2.0  # +2 for intro/outro transitions

    if target > 0:
        deviation = abs(estimated_sec - target) / target
        if deviation > _DURATION_FAIL_THRESHOLD:
            warnings.append(
                f"⚠ PACING: {total_words} words ≈ {estimated_sec:.0f}s at {_DEFAULT_WPM} WPM, "
                f"but target is {target:.0f}s ({deviation:.0%} off). "
                f"Consider {'adding' if estimated_sec < target else 'trimming'} narration."
            )
        elif deviation > _DURATION_WARN_THRESHOLD:
            warnings.append(
                f"💡 PACING: {total_words} words ≈ {estimated_sec:.0f}s at {_DEFAULT_WPM} WPM "
                f"vs target {target:.0f}s ({deviation:.0%} off)."
            )

    return warnings


def _stage_gate(stage_name: str, summary: str, interactive: bool) -> bool:
    """Human-in-the-loop stage gate. Presents summary and waits for approval.

    Returns True to proceed, False to abort.
    In non-interactive mode, always returns True (auto-approve).
    """
    if not interactive:
        return True

    print(f"\n{'─'*50}")
    print(f"  🚦 STAGE GATE: {stage_name}")
    print(f"{'─'*50}")
    print(summary)
    print(f"{'─'*50}")

    while True:
        response = input("  Proceed? [Y]es / [N]o / [E]dit: ").strip().lower()
        if response in ("y", "yes", ""):
            return True
        elif response in ("n", "no"):
            print("  ⏸  Pipeline paused by user.")
            return False
        elif response in ("e", "edit"):
            print("  📝 (In agentic mode, the agent would offer edit options here.)")
            print("     For CLI mode, edit the scenario JSON and re-run.")
            return False
        else:
            print("  Please enter Y, N, or E.")


def render_video(scenario: dict, output_dir: str, use_ai_images: bool = True,
                  interactive: bool = False, governance: bool = False,
                  brand_name: str | None = None,
                  budget_usd: float | None = None) -> dict:
    """Render a complete video from a scenario definition.

    Args:
        scenario: Scenario dict with title, scenes, etc.
        output_dir: Directory for all generated assets + final video
        use_ai_images: Whether to use AI image generation for visuals (vs Pillow only)
        interactive: Whether to pause at stage boundaries for human approval (P7)
        governance: Whether to enable governance tracing and audit trail (Phase 3A)
        brand_name: Brand package name to load from config/org/brand-packages/ (optional)
        budget_usd: Optional explicit budget override in USD

    Returns:
        dict with final_video path, duration, scene_count, and per-scene details
    """
    start_time = time.time()
    out = Path(output_dir)
    images_dir = out / "images"
    audio_dir = out / "audio"
    scenes_dir = out / "scenes"
    for d in [images_dir, audio_dir, scenes_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # ── Governance setup (optional) ──────────────────────────
    gov = None
    if governance and _governance_available:
        policy_path = str(Path(__file__).resolve().parent.parent / "config" / "org" / "governance-policy.yaml")
        gov = GovernanceContext(
            output_dir=output_dir,
            policy_path=policy_path if Path(policy_path).exists() else None,
        )
        print("  🛡️  Governance: ENABLED")
    elif governance and not _governance_available:
        print("  ⚠️  Governance requested but slate.core not importable — running without governance")

    # ── Cost tracking (always on when available) ──────────────
    cost_tracker = None
    if _cost_tracker_available:
        cost_log_path = out / "cost_log.jsonl"
        project_config = load_project_config(out.name)
        resolved_budget, budget_source = resolve_project_budget(
            explicit_budget_usd=budget_usd,
            project_config=project_config,
            org_policy=gov.policy if gov else None,
        )
        if gov:
            resolved_budget, cap_warnings = apply_hard_cap_enforcement(resolved_budget, gov.policy)
            for warning in cap_warnings:
                print(f"  ⚠️  {warning}")
        cost_tracker = CostTracker(budget_usd=resolved_budget, log_path=str(cost_log_path))
        print(f"  💰 Cost tracking: {cost_log_path} (${resolved_budget:.2f}, {budget_source})")

    # ── Brand package setup (optional) ────────────────────────
    brand = None
    if brand_name and _brand_available:
        brand_dir = Path(__file__).resolve().parent.parent / "config" / "org" / "brand-packages"
        brand_file = brand_dir / f"{brand_name}.yaml"
        if not brand_file.exists():
            # Try discover
            available = BrandPackage.discover(brand_dir)
            if brand_name in available:
                brand_file = available[brand_name]
            else:
                print(f"  ⚠️  Brand package '{brand_name}' not found. Available: {list(available.keys())}")
                brand_file = None
        if brand_file and brand_file.exists():
            brand = BrandPackage.load(brand_file)
            print(f"  🎨 Brand: {brand.name} ({brand.org})")
            if brand.is_locked:
                print(f"     🔒 Locked package — brand elements cannot be overridden")
    elif brand_name and not _brand_available:
        print("  ⚠️  Brand requested but slate.core.brand_package not importable")

    title = scenario.get("title", "Untitled Video")
    company = scenario.get("company", "Contoso")
    tagline = scenario.get("tagline", "")
    voice = scenario.get("voice", "professional-female")
    style = scenario.get("style", "premium-velvet")
    scenes = scenario.get("scenes", [])

    # ── Fix: Auto-detect video_type for voice cycling ──────────
    video_type = scenario.get("video_type", "")
    if not video_type:
        # Infer from title/tags — look for keywords
        title_lower = title.lower()
        tags = " ".join(scenario.get("tags", [])).lower()
        combined = f"{title_lower} {tags}"
        if any(k in combined for k in ("tutorial", "how to", "guide", "walkthrough")):
            video_type = "tutorial"
        elif any(k in combined for k in ("marketing", "promo", "launch", "campaign")):
            video_type = "marketing"
        elif any(k in combined for k in ("onboarding", "welcome", "getting started")):
            video_type = "onboarding"
        elif any(k in combined for k in ("internal", "team update", "all-hands")):
            video_type = "internal"
        elif any(k in combined for k in ("corporate", "earnings", "investor", "annual")):
            video_type = "corporate"
        else:
            video_type = "explainer"  # safe default

    # If voice is the old default ("professional-female") and the agent didn't
    # explicitly pick it, auto-select based on video_type for the whole video.
    # Individual scenes will still cycle via select_voice_for_scene().
    if voice == "professional-female" and not scenario.get("voice"):
        voice = select_voice_for_scene(video_type=video_type, scene_index=0)

    # ── Fix: Company name validation — warn if it looks like a topic ──
    if company and title:
        company_lower = company.lower().strip()
        title_lower_check = title.lower().strip()
        # If company name is a substring of the title, it's probably the topic not an org
        if (len(company_lower) > 3 and company_lower in title_lower_check
                and company_lower not in ("contoso", "microsoft", "azure", "google", "apple")):
            print(f"  ⚠️  Company '{company}' appears in the video title — did you mean this as the topic?")
            print(f"       If so, set 'company' to the actual producing org (or omit for default).")

    # Brand overrides: apply visual identity (colors, fonts, logo) but
    # do NOT blindly replace the scenario title/company.  Brand.org should
    # only fill in a default when the scenario didn't specify its own.
    if brand:
        if brand.audio and brand.audio.approved_voices:
            brand_voice = brand.audio.approved_voices[0]
            # VoiceSpec → extract the style field as TTS voice instructions,
            # and map the model's voice name to a VOICES preset key.
            if hasattr(brand_voice, 'style') and hasattr(brand_voice, 'name'):
                # Use the VoiceSpec style as the voice hint; keep the scenario
                # voice preset (a plain string) so tts_gen can resolve it.
                pass  # keep scenario voice — brand style applied via TTS instructions
            elif isinstance(brand_voice, str):
                voice = brand_voice
        # Only use brand.org as fallback when scenario has no explicit company
        if not scenario.get("company"):
            company = brand.org or company
        tagline = tagline or brand.tagline or ""

    print(f"\n{'='*60}")
    print(f"  SLATE VIDEO RENDERER")
    print(f"  {title}")
    print(f"  {len(scenes)} scenes | voice: {voice} | style: {style}")
    print(f"{'='*60}\n")

    # ── HITL Gate: Scene Plan ─────────────────────────────────
    scene_types = []
    for s in scenes:
        if s.get("video_prompt"):
            scene_types.append("ai-video")
        elif s.get("clip_path"):
            scene_types.append("clip")
        elif s.get("visual_prompt"):
            scene_types.append("ai-image")
        else:
            scene_types.append("slide")

    plan_summary = f"  Video: {title}\n"
    plan_summary += f"  Company: {company} | Voice: {voice}\n"
    plan_summary += f"  Scenes ({len(scenes)}):\n"
    for i, s in enumerate(scenes):
        stype = scene_types[i]
        narr_words = len(s.get("narration", "").split()) if s.get("narration") else 0
        plan_summary += f"    {i+1}. [{stype:8}] {s.get('title', 'Untitled')}"
        if narr_words:
            plan_summary += f" — {narr_words} words"
        if s.get("clip_path"):
            plan_summary += f" — clip: {Path(s['clip_path']).name}"
        if s.get("video_prompt"):
            plan_summary += f" — gen: {s['video_prompt'][:50]}..."
        plan_summary += "\n"

    if not _stage_gate("Scene Plan Review", plan_summary, interactive):
        if gov:
            gov.record_gate("scene_plan", approved=False)
            gov.finalize()
        return {"error": "aborted_by_user", "stage": "scene_plan"}

    if gov:
        gov.record_gate("scene_plan", approved=True)

    # ── Motion style gate: require explicit choice in interactive mode ──
    motion_style = scenario.get("motion_style")
    if interactive and not motion_style:
        has_video = any(s.get("video_prompt") for s in scenes)
        has_image = any(s.get("visual_prompt") and not s.get("video_prompt") for s in scenes)
        if has_video and has_image:
            default = "hybrid"
        elif has_video:
            default = "motion"
        else:
            default = "image"
        print(f"\n  ⚠ motion_style not set — auto-detected: '{default}'")
        print(f"    (image = static slides, motion = AI video clips, hybrid = mix)")
        if not _stage_gate("Motion Style Confirmation",
                           f"  Detected motion style: {default}\n  Approve or abort to change.", interactive):
            if gov:
                gov.record_gate("motion_style", approved=False)
                gov.finalize()
            return {"error": "aborted_by_user", "stage": "motion_style"}
        scenario["motion_style"] = default
        if gov:
            gov.record_gate("motion_style", approved=True)

    # Cycle through palettes for visual variety
    palette_names = list(PALETTES.keys())
    accent_cycle = ["blue", "green", "yellow", "red", "white"]

    all_scene_data = []
    scene_videos = []
    fallback_scenes_list = []  # Track scenes that used fallback placeholders

    # ── Pre-flight: validate script pacing ──
    timing_warnings = validate_script_timing(scenario)
    for tw in timing_warnings:
        print(f"  {tw}")

    # ── Pre-flight: cost estimate gate ──
    if cost_tracker:
        est_images = sum(1 for s in scenes if s.get("visual_prompt") and not s.get("structured_visual"))
        est_video_secs = sum(s.get("video_duration", s.get("duration", 5)) for s in scenes if s.get("video_prompt"))
        est_narration_words = sum(len(s.get("narration", "").split()) for s in scenes if s.get("narration"))
        est_tts_secs = (est_narration_words / _DEFAULT_WPM) * 60 + 5  # +5s for intro/outro
        est_cost = (
            cost_tracker.estimate("foundry_image_gen", count=est_images)
            + cost_tracker.estimate("foundry_video_gen", duration_seconds=est_video_secs)
            + cost_tracker.estimate("foundry_tts", duration_seconds=est_tts_secs)
        )
        print(f"  💵 Estimated cost: ${est_cost:.2f} "
              f"({est_images} images, {est_video_secs:.0f}s video, {est_tts_secs:.0f}s TTS)")
        if est_cost > cost_tracker.budget_usd * 0.9:
            print(f"  ⚠ Estimated cost is ≥90% of ${cost_tracker.budget_usd:.2f} budget!")
            if not _stage_gate("Cost Estimate Review",
                               f"  Estimated: ${est_cost:.2f} / Budget: ${cost_tracker.budget_usd:.2f}\n"
                               f"  Proceed?", interactive):
                if gov:
                    gov.record_gate("cost_estimate", approved=False)
                    gov.finalize()
                return {"error": "aborted_by_user", "stage": "cost_estimate"}
            if gov:
                gov.record_gate("cost_estimate", approved=True)

    # ── PHASE 1: Brand Intro ─────────────────────────────────
    print("📌 Phase 1: Brand Intro")
    if gov:
        gov.begin_phase("brand_intro")
    intro_img = str(images_dir / "brand_intro.png")
    generate_brand_intro(intro_img, company, tagline)
    if gov:
        gov.record_tool("pillow_render", "brand_intro")
    intro_narration = scenario.get("intro_narration", f"Welcome to {company}.")
    intro_audio = str(audio_dir / "brand_intro.wav")
    tts_result = generate_tts(intro_narration, intro_audio, voice=voice)
    _require_generation_success(tts_result, "brand_intro", "TTS")
    _track_generation_fallback(tts_result, "brand_intro", "TTS", fallback_scenes_list)
    tts_cost = tts_result.get("cost", 0.0)
    if gov:
        gov.record_tool("foundry_tts", "brand_intro", cost=tts_cost)
    if cost_tracker and tts_cost > 0:
        cost_tracker.record("foundry_tts", "brand_intro", tts_cost)
    intro_duration = max(3.0, tts_result["duration"] + 0.5)

    intro_video = str(scenes_dir / "00_brand_intro.mp4")
    create_scene_video(intro_img, intro_audio, intro_video, duration=intro_duration)
    scene_videos.append(intro_video)
    print(f"  ✅ Brand intro: {intro_duration:.1f}s\n")
    if gov:
        gov.record_tool("ffmpeg_compose", "brand_intro")
        gov.end_phase("brand_intro")

    # ── PHASE 2: Content Scenes ──────────────────────────────
    print(f"📌 Phase 2: {len(scenes)} Content Scenes")
    if gov:
        gov.begin_phase("assets")
    total_scenes = len(scenes)

    for i, scene in enumerate(scenes):
        scene_id = scene.get("id", f"scene_{i+1:03d}")
        scene_title = scene.get("title", f"Scene {i+1}")
        narration = scene.get("narration", "")
        visual_prompt = scene.get("visual_prompt", "")
        video_prompt = scene.get("video_prompt", "")
        structured_visual = scene.get("structured_visual")
        bullets = scene.get("bullet_points", [])
        clip_path = scene.get("clip_path", "")
        clip_start = scene.get("clip_start")
        clip_end = scene.get("clip_end")
        mute_clip = scene.get("mute_original", False)

        print(f"\n  ── Scene {i+1}/{total_scenes}: {scene_title} ──")

        # ── AI-Video scene: Sora-2 generated clip ──
        if video_prompt:
            vid_duration = scene.get("video_duration", scene.get("duration", 5))
            vid_resolution = scene.get("video_resolution", "landscape")
            gen_clip_path = str(images_dir / f"{scene_id}_clip.mp4")

            print(f"  🎬 AI video: {video_prompt[:60]}...")
            vid_result = generate_video_clip(
                prompt=video_prompt,
                output_path=gen_clip_path,
                duration_sec=vid_duration,
                resolution=vid_resolution,
            )
            _require_generation_success(vid_result, scene_id, "video")
            _track_generation_fallback(vid_result, scene_id, "video", fallback_scenes_list)
            vid_cost = vid_result.get("cost", 0.0)
            print(f"     → {vid_result['method']} ({vid_result.get('generation_time_sec', 0)}s gen, "
                  f"{vid_result.get('size_kb', 0)} KB)")
            if gov:
                gov.record_tool("foundry_video_gen", "assets", cost=vid_cost)
            if cost_tracker and vid_cost > 0:
                cost_tracker.record("foundry_video_gen", scene_id, vid_cost)

            # Use the generated clip as input to clip scene pipeline
            clip_path = gen_clip_path

            # Generate TTS for voiceover if narration provided
            audio_path = None
            if narration:
                audio_path = str(audio_dir / f"{scene_id}.wav")
                print(f"  🔊 TTS voiceover: {len(narration.split())} words")
                tts_result = generate_tts(narration, audio_path, voice=voice)
                _require_generation_success(tts_result, scene_id, "TTS")
                _track_generation_fallback(tts_result, scene_id, "TTS", fallback_scenes_list)
                tts_cost = tts_result.get("cost", 0.0)
                print(f"     → {tts_result['method']} ({tts_result['duration']:.1f}s)")
                if gov:
                    gov.record_tool("foundry_tts", "assets", cost=tts_cost)
                if cost_tracker and tts_cost > 0:
                    cost_tracker.record("foundry_tts", scene_id, tts_cost)

            # Target duration = narration length (or scene config, or clip length)
            # This is critical: without an explicit duration, the clip won't loop
            # and will freeze on its last frame when narration exceeds clip length.
            target_duration = scene.get("duration")
            if audio_path and tts_result:
                narr_dur = tts_result.get("duration", 0)
                if narr_dur > 0:
                    target_duration = narr_dur + 0.3  # small buffer for fade

            scene_video = str(scenes_dir / f"{i+1:02d}_{scene_id}.mp4")
            result = create_clip_scene_video(
                clip_path, scene_video,
                narration_path=audio_path,
                mute_original=True,  # Always mute AI-generated video audio
                duration=target_duration,
            )
            duration = target_duration or vid_duration

        # ── Clip scene: user-provided video ──
        elif clip_path and Path(clip_path).exists():
            print(f"  🎞️  Video clip: {Path(clip_path).name}")
            probe = probe_video(clip_path)
            if probe:
                print(f"     → {probe['width']}×{probe['height']}, {probe['duration']:.1f}s, {probe['video_codec']}")

            # Generate TTS for voiceover if narration provided
            audio_path = None
            if narration:
                audio_path = str(audio_dir / f"{scene_id}.wav")
                print(f"  🔊 TTS voiceover: {len(narration.split())} words")
                tts_result = generate_tts(narration, audio_path, voice=voice)
                _require_generation_success(tts_result, scene_id, "TTS")
                _track_generation_fallback(tts_result, scene_id, "TTS", fallback_scenes_list)
                tts_cost = tts_result.get("cost", 0.0)
                print(f"     → {tts_result['method']} ({tts_result['duration']:.1f}s)")
                if gov:
                    gov.record_tool("foundry_tts", "assets", cost=tts_cost)
                if cost_tracker and tts_cost > 0:
                    cost_tracker.record("foundry_tts", scene_id, tts_cost)

            scene_video = str(scenes_dir / f"{i+1:02d}_{scene_id}.mp4")
            result = create_clip_scene_video(
                clip_path, scene_video,
                narration_path=audio_path,
                start_time=clip_start,
                end_time=clip_end,
                duration=scene.get("duration"),
                mute_original=mute_clip,
            )
            duration = probe["duration"] if probe else scene.get("duration", 5.0)
            if clip_start is not None and clip_end is not None:
                duration = clip_end - clip_start
            elif scene.get("duration"):
                duration = scene["duration"]

        # ── Image scene: AI-generated or Pillow slide ──
        else:
            img_path = str(images_dir / f"{scene_id}.png")

            # ── Structured visual: Pillow-rendered code, tables, diagrams, charts ──
            if structured_visual:
                # Complexity router: re-route complex diagrams to AI image generation
                # per skills/core/structured-visuals.md routing table
                if structured_visual.get("type") == "diagram" and use_ai_images:
                    from image_gen import should_use_image_for_diagram
                    data = structured_visual.get("data", {})
                    fallback_prompt = should_use_image_for_diagram(
                        data.get("boxes", []), data.get("arrows", [])
                    )
                    if fallback_prompt:
                        print(f"  🔀 Diagram too complex for Pillow auto-layout — routing to AI image")
                        ai_prompt = fallback_prompt
                        if brand:
                            ai_prompt = f"Color scheme: {brand.primary_color} primary, {brand.accent_color} accent. {ai_prompt}"
                        img_result = generate_ai_image(ai_prompt, img_path, quality="medium")
                        img_cost = img_result.get("cost", 0.0)
                        print(f"     → {img_result['method']} ({img_result['size_kb']} KB)")
                        if gov:
                            gov.record_tool("foundry_image_gen", "assets", cost=img_cost)
                        if cost_tracker and img_cost > 0:
                            cost_tracker.record("foundry_image_gen", scene_id, img_cost)
                    else:
                        img_result = generate_structured_image(structured_visual, img_path)
                        img_cost = 0.0
                        print(f"     → {img_result['method']} ({img_result['size_kb']} KB)")
                else:
                    img_result = generate_structured_image(structured_visual, img_path)
                    img_cost = 0.0
                    print(f"     → {img_result['method']} ({img_result['size_kb']} KB)")

            elif use_ai_images and visual_prompt:
                # Inject brand color guidance into AI image prompts
                ai_prompt = visual_prompt
                if brand:
                    ai_prompt = f"Color scheme: {brand.primary_color} primary, {brand.accent_color} accent. {visual_prompt}"
                print(f"  🎨 AI image: {visual_prompt[:60]}...")
                img_result = generate_ai_image(ai_prompt, img_path, quality="medium")
                img_cost = img_result.get("cost", 0.0)
                print(f"     → {img_result['method']} ({img_result['size_kb']} KB)")
                if gov:
                    gov.record_tool("foundry_image_gen", "assets", cost=img_cost)
                if cost_tracker and img_cost > 0:
                    cost_tracker.record("foundry_image_gen", scene_id, img_cost)
            else:
                palette = palette_names[i % len(palette_names)]
                accent = accent_cycle[i % len(accent_cycle)]
                # Use brand colors for Pillow slides when available
                if brand:
                    accent = brand.accent_color
                generate_scene_image(
                    img_path, scene_title, narration or "",
                    palette=palette, accent=accent,
                    scene_number=i + 1, total_scenes=total_scenes,
                    bullet_points=bullets,
                )
                print(f"     → Pillow slide ({palette}{'+ brand' if brand else ''})")

            # Generate TTS
            audio_path = str(audio_dir / f"{scene_id}.wav")
            if narration:
                print(f"  🔊 TTS: {len(narration.split())} words")
                tts_result = generate_tts(narration, audio_path, voice=voice)
                _require_generation_success(tts_result, scene_id, "TTS")
                _track_generation_fallback(tts_result, scene_id, "TTS", fallback_scenes_list)
                tts_cost = tts_result.get("cost", 0.0)
                duration = max(scene.get("duration", 0), tts_result["duration"] + 0.3)
                print(f"     → {tts_result['method']} ({tts_result['duration']:.1f}s)")
                if gov:
                    gov.record_tool("foundry_tts", "assets", cost=tts_cost)
                if cost_tracker and tts_cost > 0:
                    cost_tracker.record("foundry_tts", scene_id, tts_cost)

                # Live subtitles: transcribe audio → timed subtitle frames → video
                print("  💬 Loading live subtitle timings...")
                transcript = load_word_sidecar(audio_path)
                if transcript and transcript.get("words"):
                    source = transcript.get("source", "unknown")
                    print(f"     → Sidecar: {len(transcript['words'])} words ({source})")
                else:
                    transcript = transcribe_audio(audio_path)
                if transcript and transcript.get("words"):
                    words = transcript["words"]
                    print(f"     → Timed: {len(words)} words, {transcript['duration']:.1f}s")
                else:
                    # Fallback: estimate timestamps from narration text + TTS duration
                    words = estimate_word_timestamps(narration, tts_result["duration"])
                    print(f"     → Estimated: {len(words)} words")

                segments = group_into_segments(words)
                print(f"     → {len(segments)} subtitle segments")
            else:
                duration = scene.get("duration", 0) or 5.0
                audio_path = None
                segments = None

            # Compose scene video
            scene_video = str(scenes_dir / f"{i+1:02d}_{scene_id}.mp4")
            if segments and audio_path:
                sub_frames_dir = str(images_dir / f"{scene_id}_subframes")
                result = create_scene_video_with_subtitles(
                    img_path, audio_path, scene_video,
                    segments, sub_frames_dir, duration,
                )
            else:
                result = create_scene_video(img_path, audio_path, scene_video, duration=duration)
            if gov:
                gov.record_tool("ffmpeg_compose", "assets")

        if result:
            scene_videos.append(result)
            # Determine scene type for metadata
            if video_prompt:
                stype_meta = "ai-video"
            elif scene.get("clip_path"):
                stype_meta = "clip"
            else:
                stype_meta = "image"
            all_scene_data.append({
                "id": scene_id,
                "title": scene_title,
                "type": stype_meta,
                "duration": round(duration, 2),
                "image": img_path if stype_meta == "image" else None,
                "clip": clip_path if stype_meta in ("clip", "ai-video") else None,
                "audio": audio_path,
                "video": result,
            })
            print(f"  ✅ Scene video: {duration:.1f}s")
        else:
            print(f"  ❌ Scene video FAILED")

    if gov:
        gov.end_phase("assets")

    # ── HITL Gate: Asset Review ───────────────────────────────
    asset_summary = f"  Assets generated for {len(all_scene_data)} scenes:\n"
    for sd in all_scene_data:
        asset_summary += f"    • {sd['title']} [{sd['type']}] — {sd['duration']:.1f}s"
        if sd.get('image'):
            asset_summary += f" | img: {Path(sd['image']).name}"
        if sd.get('clip'):
            asset_summary += f" | clip: {Path(sd['clip']).name}"
        asset_summary += "\n"
    total_so_far = sum(s["duration"] for s in all_scene_data)
    asset_summary += f"\n  Total content: {total_so_far:.0f}s ({len(all_scene_data)} scenes)"
    asset_summary += f"\n  Review scene images/clips in: {images_dir}"
    asset_summary += f"\n  Review TTS audio in: {audio_dir}"
    if gov:
        budget = gov.check_budget()
        asset_summary += f"\n  💰 Budget: ${budget['total_cost']:.4f} / ${budget['hard_cap']:.2f}"

    if not _stage_gate("Asset Review", asset_summary, interactive):
        if gov:
            gov.record_gate("asset_review", approved=False)
            gov.finalize()
        return {"error": "aborted_by_user", "stage": "asset_review", "scenes": all_scene_data}
    if gov:
        gov.record_gate("asset_review", approved=True)

    # ── PHASE 3: Brand Outro ─────────────────────────────────
    print(f"\n📌 Phase 3: Brand Outro")
    if gov:
        gov.begin_phase("compose")
    outro_img = str(images_dir / "brand_outro.png")
    cta = scenario.get("cta_text", "Learn More")
    cta_url = scenario.get("cta_url", "")
    credits = scenario.get("credits", "")
    generate_brand_outro(outro_img, company, cta, cta_url)
    # Burn credits onto outro image if provided
    if credits:
        from subtitle_burner import burn_subtitle_on_image
        burn_subtitle_on_image(outro_img, credits, font_size=22, margin_bottom=120)
    outro_narration = scenario.get("outro_narration", f"Thank you for watching. Visit {company} to learn more.")
    outro_audio = str(audio_dir / "brand_outro.wav")
    tts_result = generate_tts(outro_narration, outro_audio, voice=voice)
    _require_generation_success(tts_result, "brand_outro", "TTS")
    _track_generation_fallback(tts_result, "brand_outro", "TTS", fallback_scenes_list)
    tts_cost = tts_result.get("cost", 0.0)
    if gov:
        gov.record_tool("foundry_tts", "compose", cost=tts_cost)
    if cost_tracker and tts_cost > 0:
        cost_tracker.record("foundry_tts", "brand_outro", tts_cost)
    outro_duration = max(3.0, tts_result["duration"] + 0.5)

    outro_video = str(scenes_dir / f"{len(scenes)+1:02d}_brand_outro.mp4")
    create_scene_video(outro_img, outro_audio, outro_video, duration=outro_duration)
    scene_videos.append(outro_video)
    print(f"  ✅ Brand outro: {outro_duration:.1f}s\n")

    # ── PHASE 4: Concatenate ─────────────────────────────────
    print(f"📌 Phase 4: Concatenating {len(scene_videos)} clips")
    final_video = str(out / f"{_slugify(title)}.mp4")
    result = concatenate_videos(scene_videos, final_video)
    if gov:
        gov.record_tool("ffmpeg_concat", "compose")
        gov.end_phase("compose")

    elapsed = time.time() - start_time

    if result:
        size_mb = Path(result).stat().st_size / (1024 * 1024)
        total_duration = sum(s["duration"] for s in all_scene_data) + intro_duration + outro_duration
        print(f"\n{'='*60}")
        print(f"  ✅ VIDEO COMPLETE")
        print(f"  📁 {result}")
        print(f"  📊 {size_mb:.1f} MB | {total_duration:.0f}s | {len(scene_videos)} clips")
        print(f"  ⏱  Rendered in {elapsed:.0f}s")
        if brand:
            print(f"  🎨 Brand: {brand.name}")
        if gov:
            gov_summary = gov.finalize()
            print(f"  🛡️  Governance: {gov_summary['violation_count']} violations, "
                  f"${gov_summary['budget']['total_cost']:.4f} spent")

        # ── Generate SCF document alongside render output ──
        scf_path = None
        if _brand_available:
            try:
                asset_manifest = AssetManifest(
                    scene_images={s["id"]: s["image"] for s in all_scene_data if s.get("image")},
                    scene_narrations={s["id"]: s["audio"] for s in all_scene_data if s.get("audio")},
                    scene_videos={s["id"]: s["clip"] for s in all_scene_data if s.get("clip")},
                    brand_intro_image=str(images_dir / "brand_intro.png"),
                    brand_outro_image=str(images_dir / "brand_outro.png"),
                )
                composer = SCFComposer(brand=brand, pipeline="animated-explainer")
                scf = composer.from_scenario(scenario, asset_manifest)
                structural_errors = composer.validate(scf)
                if structural_errors:
                    raise RuntimeError("SCF structural validation failed: " + "; ".join(structural_errors))
                pre_render_report = validate_scf_pre_render(scf, str(out))
                if not pre_render_report.get("passed"):
                    raise RuntimeError(pre_render_report.get("summary", "SCF pre-render validation failed"))
                for warning in pre_render_report.get("slideshow_warnings", []):
                    print(f"  ⚠️  SCF warning: {warning.get('message', warning)}")
                scf_file = out / "composition.json"
                composer.write(scf, scf_file)
                scf_path = str(scf_file)
                print(f"  📋 SCF: {scf_file}")
            except Exception as e:
                print(f"  ⚠️  SCF generation failed: {e}")

        # ── P6 Self-Review: automated quality rubric ──
        trace_path = str(out / "production_trace.json") if gov else None
        target_dur = scenario.get("target_duration")
        narration_texts = [s.get("narration", "") for s in scenes if s.get("narration")]
        review_result = _self_review(
            trace_path=trace_path,
            total_duration=total_duration,
            target_duration=float(target_dur) if target_dur else None,
            scene_count=len(scenes),
            brand_name=brand.name if brand else None,
            video_path=result,
            fallback_scenes=fallback_scenes_list,
            motion_style=scenario.get("motion_style"),
            scenes=scenes,
            narration_texts=narration_texts,
            captions=scenario.get("captions"),
        )
        explicit_review = _run_review_stage(
            output_dir=out,
            self_review=review_result,
            video_path=result,
            scf_path=scf_path,
            brand_name=brand.name if brand else None,
            title=title,
        )

        # ── Cost summary ──────────────────────────────────────────
        cost_summary = None
        if cost_tracker:
            cost_summary = cost_tracker.summary()
            print(f"  💰 Cost: ${cost_summary['total_usd']:.4f} / ${cost_summary['budget_usd']:.2f} "
                  f"({cost_summary['entry_count']} API calls)")

        print(f"{'='*60}\n")
        output = {
            "final_video": result,
            "size_mb": round(size_mb, 1),
            "total_duration": round(total_duration, 1),
            "scene_count": len(scene_videos),
            "scenes": all_scene_data,
            "render_time_sec": round(elapsed, 1),
            "self_review": review_result,
            "review_report": explicit_review["report"],
            "review_report_path": explicit_review["review_report_path"],
            "review_markdown_path": explicit_review["review_markdown_path"],
            "review_context_path": explicit_review["review_context_path"],
        }

        # ── Review-stage fail enforcement: signal the agent to pause delivery ──
        if not explicit_review["report"].get("passed", False):
            output["needs_rerender"] = True
            output["fixes_needed"] = review_result.get("fixes_needed", [])
            output["agent_next_action"] = {
                "type": "validate_and_fix_review_findings",
                "instruction": "Validate review findings against the available evidence, then fix the valid issues and re-run review.",
                "allowed_actions": ["fix_and_rerender", "request_human_override", "escalate_to_human"],
            }
            failed_dims = [d for d, s in explicit_review["report"].get("scores", {}).items() if s == 1]
            print(f"  🛑 REVIEW FAIL — delivery blocked pending review")
            print(f"     Failed dimensions: {', '.join(failed_dims)}")
            print(f"     Next action: validate the findings, fix the valid issues, and re-run review")

        if brand:
            output["brand_package"] = brand.name
        if scf_path:
            output["scf_document"] = scf_path
        if gov:
            output["governance"] = gov_summary
        if cost_summary:
            output["cost_summary"] = cost_summary
        return output

    print(f"\n  ❌ CONCATENATION FAILED after {elapsed:.0f}s")
    if gov:
        gov.finalize()
    return {"error": "concatenation_failed", "render_time_sec": round(elapsed, 1)}


def _slugify(text: str) -> str:
    """Convert text to a filename-safe ASCII slug."""
    # Replace common Unicode dashes/punctuation with ASCII equivalents
    import unicodedata
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    return "".join(c if c.isalnum() or c in " -_" else "" for c in text).strip().replace(" ", "-").lower()[:60]


# ── Predefined Scenarios ─────────────────────────────────────

SCENARIOS = {
    "contoso-ai-launch": {
        "title": "Contoso AI Platform Launch",
        "company": "Contoso",
        "tagline": "AI-Powered Innovation",
        "voice": "professional-female",
        "style": "ai-native",
        "intro_narration": "Welcome to Contoso, where we are redefining enterprise AI.",
        "outro_narration": "Join us on this journey. Visit contoso.com to get started today.",
        "cta_text": "Get Started Today",
        "cta_url": "contoso.com/ai",
        "scenes": [
            {
                "id": "vision",
                "title": "The Vision",
                "narration": "Every enterprise is on a journey to harness the power of artificial intelligence. But the path from idea to production has been too complex, too slow, and too expensive.",
                "visual_prompt": "A futuristic enterprise office with holographic AI dashboards floating in air, blue-toned lighting, professional corporate setting, photorealistic",
                "bullet_points": ["Complex implementation", "Slow time to market", "High costs"],
            },
            {
                "id": "platform",
                "title": "Introducing Contoso AI Platform",
                "narration": "Contoso AI Platform changes everything. One unified platform that brings together data, models, and deployment in a seamless experience your teams will love.",
                "visual_prompt": "A clean modern tech platform dashboard showing AI metrics and model performance, dark mode UI, enterprise software screenshot style",
            },
            {
                "id": "capabilities",
                "title": "Key Capabilities",
                "narration": "From natural language processing to computer vision, from predictive analytics to generative AI. Contoso AI Platform supports every use case across your organization.",
                "bullet_points": [
                    "Natural Language Processing",
                    "Computer Vision & Image Analysis",
                    "Predictive Analytics",
                    "Generative AI & Content Creation",
                    "Enterprise-grade Security",
                ],
            },
            {
                "id": "results",
                "title": "Proven Results",
                "narration": "Our customers see results in weeks, not months. Forty percent faster time to production. Sixty percent reduction in AI infrastructure costs. And a platform that scales with your ambitions.",
                "visual_prompt": "Business growth chart with upward trending lines in blue and green on a dark background, professional data visualization, enterprise analytics dashboard",
                "bullet_points": ["40% faster time to production", "60% cost reduction", "Enterprise scale"],
            },
        ],
    },

    "azure-security": {
        "title": "Azure Security Best Practices",
        "company": "Microsoft Azure",
        "tagline": "Secure by Default",
        "voice": "professional-male",
        "style": "dark",
        "intro_narration": "Security is not an afterthought. It is the foundation of everything we build on Azure.",
        "outro_narration": "Protect your workloads today. Learn more at azure.com slash security.",
        "cta_text": "Secure Your Cloud",
        "cta_url": "azure.com/security",
        "scenes": [
            {
                "id": "threat-landscape",
                "title": "The Modern Threat Landscape",
                "narration": "Cyber threats are evolving faster than ever. Ransomware attacks increased by three hundred percent last year. Every organization needs a defense-in-depth strategy.",
                "visual_prompt": "A cybersecurity operations center with multiple screens showing threat maps and security alerts, dark dramatic lighting, neon accents",
            },
            {
                "id": "zero-trust",
                "title": "Zero Trust Architecture",
                "narration": "Zero Trust means never trust, always verify. Every access request is authenticated, authorized, and encrypted. Azure Active Directory and Conditional Access make this seamless.",
                "bullet_points": [
                    "Verify explicitly — always authenticate",
                    "Least privilege access",
                    "Assume breach — minimize blast radius",
                ],
            },
            {
                "id": "defender",
                "title": "Microsoft Defender for Cloud",
                "narration": "Defender for Cloud provides unified security management across your hybrid and multi-cloud workloads. Get real-time threat protection with AI-powered detection and automated response.",
                "visual_prompt": "Microsoft Defender security dashboard showing compliance scores and threat detection alerts, clean modern UI design",
            },
            {
                "id": "compliance",
                "title": "Compliance & Governance",
                "narration": "Azure meets over ninety compliance certifications globally. From HIPAA to SOC 2, from GDPR to FedRAMP. Your data stays protected and compliant wherever it resides.",
                "bullet_points": [
                    "90+ compliance certifications",
                    "HIPAA, SOC 2, GDPR, FedRAMP",
                    "Built-in governance policies",
                    "Automated compliance reporting",
                ],
            },
            {
                "id": "action",
                "title": "Take Action Today",
                "narration": "Security is a continuous journey. Start with a security assessment. Enable Defender for Cloud. Implement Zero Trust. Azure gives you the tools to stay ahead of threats.",
            },
        ],
    },

    "q3-revenue": {
        "title": "Q3 Revenue Highlights",
        "company": "Contoso",
        "tagline": "Q3 FY26 Financial Summary",
        "voice": "professional-female",
        "style": "corporate",
        "intro_narration": "Here are the Q3 fiscal year twenty-six revenue highlights for Contoso.",
        "outro_narration": "Thank you for reviewing our quarterly results. Full details are available in the investor portal.",
        "cta_text": "View Full Report",
        "cta_url": "contoso.com/investors",
        "scenes": [
            {
                "id": "topline",
                "title": "Top-Line Revenue",
                "narration": "Total revenue for Q3 reached twelve point four billion dollars, representing eighteen percent year-over-year growth. This marks our fifth consecutive quarter of double-digit growth.",
                "bullet_points": ["$12.4B total revenue", "18% YoY growth", "5th consecutive quarter of double-digit growth"],
            },
            {
                "id": "segments",
                "title": "Revenue by Segment",
                "narration": "Cloud services led with seven point two billion at twenty-four percent growth. Enterprise software contributed three point eight billion. Professional services rounded out at one point four billion.",
                "visual_prompt": "Clean corporate revenue pie chart with three segments in blue, green, and purple on white background, minimal enterprise design",
                "bullet_points": ["Cloud: $7.2B (+24%)", "Enterprise: $3.8B (+12%)", "Services: $1.4B (+8%)"],
            },
            {
                "id": "outlook",
                "title": "Q4 Outlook",
                "narration": "Looking ahead, we project Q4 revenue between thirteen and thirteen point five billion dollars, driven by continued cloud adoption and new enterprise contracts signed this quarter.",
                "bullet_points": ["Q4 guidance: $13.0-13.5B", "Strong cloud pipeline", "42 new enterprise deals signed"],
            },
        ],
    },

    "onboarding": {
        "title": "Welcome to Contoso",
        "company": "Contoso",
        "tagline": "Your Journey Starts Here",
        "voice": "friendly-female",
        "style": "ocean",
        "intro_narration": "Welcome to the Contoso family! We are thrilled to have you on board.",
        "outro_narration": "We cannot wait to see what you will accomplish. Welcome aboard!",
        "cta_text": "Start Your Journey",
        "cta_url": "",
        "scenes": [
            {
                "id": "welcome",
                "title": "We're Glad You're Here",
                "narration": "At Contoso, we believe great things happen when talented people come together. You were chosen because you bring something special to our team.",
                "visual_prompt": "A welcoming modern office space with diverse team members collaborating, warm natural lighting, friendly corporate environment",
            },
            {
                "id": "culture",
                "title": "Our Culture",
                "narration": "Our culture is built on three pillars: innovation, inclusion, and impact. We encourage bold ideas, celebrate diverse perspectives, and measure success by the difference we make.",
                "bullet_points": ["Innovation — think big, start small, learn fast", "Inclusion — every voice matters", "Impact — make a difference every day"],
            },
            {
                "id": "first-week",
                "title": "Your First Week",
                "narration": "In your first week, you will meet your team, set up your workspace, and complete your onboarding checklist. Your buddy will be there to help every step of the way.",
                "bullet_points": ["Day 1: Meet your team & manager", "Day 2-3: System setup & training", "Day 4-5: Shadow sessions & first project"],
            },
        ],
    },

    "ignite-teaser": {
        "title": "Product Demo Teaser for Ignite",
        "company": "Microsoft",
        "tagline": "Microsoft Ignite 2026",
        "voice": "professional-male",
        "style": "innovation",
        "intro_narration": "Something big is coming to Microsoft Ignite twenty twenty-six.",
        "outro_narration": "See it live at Microsoft Ignite. Register now at ignite dot microsoft dot com.",
        "cta_text": "Register for Ignite",
        "cta_url": "ignite.microsoft.com",
        "scenes": [
            {
                "id": "tease",
                "title": "The Future Is Here",
                "narration": "What if every team in your organization could create professional video content in minutes? What if an AI agent could be your creative director, editor, and producer — all at once?",
                "visual_prompt": "A dramatic futuristic stage with purple and blue lighting, holographic displays showing video editing interface, tech conference keynote atmosphere",
            },
            {
                "id": "reveal",
                "title": "Introducing Slate",
                "narration": "Introducing Slate — the agentic video production engine that turns your ideas into polished, brand-consistent videos through the power of conversation. No timeline. No editing skills. Just describe what you want.",
                "visual_prompt": "A sleek modern product logo 'Slate' with minimal design, dark background with subtle animated particles, tech product launch aesthetic",
            },
            {
                "id": "demo-preview",
                "title": "See It In Action",
                "narration": "From executive presentations to training modules, from product demos to quarterly reports. Slate handles it all — with enterprise-grade security, brand governance, and Azure AI at its core.",
                "bullet_points": [
                    "Executive presentations",
                    "Training & onboarding",
                    "Product demos",
                    "Financial reporting",
                    "Event marketing",
                ],
            },
        ],
    },
}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/slate_render.py <scenario_name_or_json> [output_dir] [flags]")
        print(f"\nAvailable scenarios: {', '.join(SCENARIOS.keys())}")
        print("\nFlags:")
        print("  --no-ai             Use Pillow slides instead of AI-generated images")
        print("  --interactive       Pause at stage gates for human approval (P7)")
        print("  --governance        Enable governance tracing and audit trail (Phase 3A)")
        print("  --brand <name>      Apply brand package from config/org/brand-packages/")
        print("  --input <file>      Ingest document (PPTX/DOCX/XLSX) as scenario source")
        print("  --budget-usd <n>    Override project budget in USD")
        sys.exit(1)

    scenario_input = sys.argv[1]
    output_base = Path(sys.argv[2]) if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else Path("C:/Projects/Slate/test_output")

    # Parse flags
    use_ai = "--no-ai" not in sys.argv
    interactive = "--interactive" in sys.argv
    enable_governance = "--governance" in sys.argv

    budget_usd = None
    if "--budget-usd" in sys.argv:
        idx = sys.argv.index("--budget-usd")
        if idx + 1 < len(sys.argv):
            budget_usd = float(sys.argv[idx + 1])
        else:
            print("Error: --budget-usd requires a positive number")
            sys.exit(1)

    # Parse --brand <name>
    brand_name = None
    if "--brand" in sys.argv:
        idx = sys.argv.index("--brand")
        if idx + 1 < len(sys.argv):
            brand_name = sys.argv[idx + 1]
        else:
            print("Error: --brand requires a package name (e.g., --brand contoso-corporate)")
            sys.exit(1)

    # Parse --input <file> for document ingest
    input_file = None
    if "--input" in sys.argv:
        idx = sys.argv.index("--input")
        if idx + 1 < len(sys.argv):
            input_file = sys.argv[idx + 1]
        else:
            print("Error: --input requires a file path (e.g., --input deck.pptx)")
            sys.exit(1)

    # Determine scenario source
    if input_file:
        # Document ingest path
        if not _ingest_available:
            print("Error: Document ingest requires slate.tools.ingest.parsers")
            print("Install optional deps: pip install python-pptx python-docx openpyxl")
            sys.exit(1)
        if not Path(input_file).exists():
            print(f"Error: File not found: {input_file}")
            sys.exit(1)
        print(f"📄 Ingesting document: {input_file}")
        ingest_result = parse_document(input_file)
        if ingest_result.metadata.get("warning"):
            print(f"  ⚠️  {ingest_result.metadata['warning']}")
        scenario = ingest_result.to_scenario()
        out_dir = output_base / _slugify(scenario.get("title", "ingested"))
        print(f"  → {len(scenario['scenes'])} scenes extracted, ~{scenario.get('estimated_duration', '?')}s")
    elif scenario_input in SCENARIOS:
        scenario = SCENARIOS[scenario_input]
        out_dir = output_base / scenario_input
    elif Path(scenario_input).exists():
        scenario = json.loads(Path(scenario_input).read_text(encoding="utf-8"))
        out_dir = output_base / _slugify(scenario.get("title", "custom"))
    else:
        print(f"Unknown scenario: {scenario_input}")
        print(f"Available: {', '.join(SCENARIOS.keys())}")
        sys.exit(1)

    result = render_video(scenario, str(out_dir), use_ai_images=use_ai,
                          interactive=interactive, governance=enable_governance,
                          brand_name=brand_name, budget_usd=budget_usd)
    print(json.dumps(result, indent=2))
