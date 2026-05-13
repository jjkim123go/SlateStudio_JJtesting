"""Slate quality-first video evaluation packet builder.

This is intentionally artifact-first: it validates the SCF, inspects the MP4,
extracts per-scene frames, and writes a compact packet for human-like review.
The packet is designed for repeated novice-prompt evals where we compare what
Slate intended against what a viewer actually sees.
"""

from __future__ import annotations

import argparse
import colorsys
import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageFilter, ImageStat

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts" / "lib"))

from scf_validate import QUALITY_PROFILES, validate_scf_pre_render  # noqa: E402
from video_inspect import inspect_video  # noqa: E402


DEFAULT_EVAL_PROFILE = "publish"
RENDER_BLOCKING_CATEGORIES = {
    "narration_overflows",
    "video_layer_issues",
    "missing_assets",
}
# Calibrated from rendered eval frames: warn when almost half a video shares the
# dark-blue/slate family, and fail publish when it dominates most sampled frames.
DARK_BLUE_WARN_THRESHOLD = 0.45
DARK_BLUE_FAIL_THRESHOLD = 0.65
# Structured visuals below these bbox shares tend to read as decorative instead
# of legible content. Publish treats the smaller threshold as a hard failure.
STRUCTURED_VISUAL_OCCUPANCY_WARNING = 0.14
STRUCTURED_VISUAL_OCCUPANCY_FAILURE = 0.08
# Downsampled foreground extraction skips tiny anti-aliased differences from the
# estimated background while preserving real panels, text, charts, and diagrams.
FOREGROUND_DISTANCE_THRESHOLD = 34
PRIMARY_CONTENT_TOP_SKIP_RATIO = 0.18
STRUCTURED_VISUAL_COMPONENTS = {
    "ArchitectureDiagram",
    "BurnDown",
    "DataChart",
    "DataFlow",
    "ExcelScene",
    "GitHubScene",
    "MetricStack",
    "MetricsCard",
    "OKRStatus",
    "OutlookScene",
    "PlannerScene",
    "PowerBIScene",
    "PowerPointScene",
    "Roadmap",
    "ScreenDemoFrame",
    "StepByStep",
    "TeamsScene",
    "TerminalCast",
    "TerminalScene",
    "VSCodeScene",
}


def _run(cmd: list[str], timeout: int = 120) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def _probe_duration(video_path: Path) -> float | None:
    result = _run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(video_path),
    ], timeout=30)
    if result.returncode != 0 or not result.stdout.strip():
        return None
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def _scene_windows(scf: dict[str, Any]) -> list[dict[str, Any]]:
    windows = []
    cursor = 0.0
    for scene in scf.get("scenes", []):
        duration = float(scene.get("duration") or 0)
        layers = scene.get("layers") or []
        windows.append({
            "id": scene.get("id") or f"scene-{len(windows) + 1}",
            "component": scene.get("component"),
            "start": cursor,
            "end": cursor + duration,
            "duration": duration,
            "has_video_layer": any(layer.get("type") == "video" for layer in layers),
            "has_image_layer": any(layer.get("type") == "image" for layer in layers),
            "narrationText": scene.get("narrationText", ""),
            "notes": scene.get("notes", ""),
        })
        cursor += duration
    return windows


def _overlap_seconds(start: float, end: float, window_start: float, window_end: float) -> float:
    return max(0.0, min(end, window_end) - max(start, window_start))


def classify_frozen_sections(
    scf: dict[str, Any],
    frozen_sections: list[dict[str, Any]],
    static_hold_threshold_sec: float = 3.5,
) -> dict[str, Any]:
    """Classify raw FFmpeg freezes using SCF scene context.

    FFmpeg cannot tell the difference between a broken video clip and a
    deliberate component hold. Slate can: real video-layer freezes are defects;
    non-video holds are motion-review signals only when they run long enough to
    make a scene feel lifeless.
    """
    windows = _scene_windows(scf)
    classified = []

    for section in frozen_sections or []:
        start = float(section.get("start_sec") or 0)
        end = float(section.get("end_sec") or start)
        duration = float(section.get("duration_sec") or max(0.0, end - start))
        overlaps = []
        for window in windows:
            overlap = _overlap_seconds(start, end, float(window["start"]), float(window["end"]))
            if overlap <= 0:
                continue
            overlaps.append({
                "scene_id": window["id"],
                "component": window.get("component"),
                "overlap_sec": round(overlap, 2),
                "has_video_layer": bool(window.get("has_video_layer")),
                "has_image_layer": bool(window.get("has_image_layer")),
            })

        if any(item["has_video_layer"] for item in overlaps):
            classification = "video_freeze"
        elif any(item.get("component") for item in overlaps):
            classification = "component_static_hold"
        elif any(item["has_image_layer"] for item in overlaps):
            classification = "image_static_hold"
        else:
            classification = "non_video_static_hold"

        classified.append({
            "start_sec": round(start, 2),
            "end_sec": round(end, 2),
            "duration_sec": round(duration, 2),
            "classification": classification,
            "scene_overlaps": overlaps,
        })

    video_freezes = [item for item in classified if item["classification"] == "video_freeze"]
    static_holds = [item for item in classified if item["classification"] != "video_freeze"]
    long_static_holds = [item for item in static_holds if item["duration_sec"] >= static_hold_threshold_sec]

    hard_failures = []
    warnings = []
    if video_freezes:
        total = sum(item["duration_sec"] for item in video_freezes)
        hard_failures.append(f"VIDEO_FREEZE: {len(video_freezes)} authored video-layer section(s) freeze for {total:.1f}s total")
    if long_static_holds:
        total = sum(item["duration_sec"] for item in long_static_holds)
        scenes = sorted({
            overlap["scene_id"]
            for item in long_static_holds
            for overlap in item.get("scene_overlaps", [])
            if overlap.get("scene_id")
        })
        scene_text = f" in {', '.join(scenes[:6])}" if scenes else ""
        if len(scenes) > 6:
            scene_text += ", ..."
        warnings.append(
            f"STATIC_VISUAL_HOLD: {len(long_static_holds)} non-video hold section(s){scene_text} run {total:.1f}s total; review motion beats"
        )

    return {
        "sections": classified,
        "video_freezes": video_freezes,
        "static_holds": static_holds,
        "long_static_holds": long_static_holds,
        "hard_failures": hard_failures,
        "warnings": warnings,
    }


def _sample_times(start: float, end: float, dense: bool) -> list[float]:
    duration = max(0.0, end - start)
    if duration <= 0:
        return []
    if dense:
        times = []
        t = start + 0.5
        while t < end - 0.25:
            times.append(round(t, 2))
            t += 1.0
        return times or [round(start + duration / 2, 2)]
    return sorted(set(round(min(end - 0.2, max(start + 0.2, value)), 2) for value in (
        start + 0.5,
        start + duration / 2,
        end - 0.5,
    )))


def extract_scene_frames(video_path: Path, scf: dict[str, Any], output_dir: Path, dense: bool = False) -> list[dict[str, Any]]:
    frames_dir = output_dir / "scene_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    video_duration = _probe_duration(video_path)

    for scene in _scene_windows(scf):
        for index, timestamp in enumerate(_sample_times(scene["start"], scene["end"], dense), start=1):
            if video_duration is not None:
                timestamp = min(timestamp, max(0.0, video_duration - 0.05))
            frame_path = frames_dir / f"{scene['id']}_{index:02d}_{timestamp:.2f}s.png"
            result = _run([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning",
                "-ss", f"{timestamp:.2f}", "-i", str(video_path),
                "-frames:v", "1", "-q:v", "2", str(frame_path),
            ])
            analysis = analyze_frame(frame_path) if frame_path.exists() else {}
            frames.append({
                "scene_id": scene["id"],
                "component": scene.get("component"),
                "timestamp_sec": timestamp,
                "path": str(frame_path),
                "exists": frame_path.exists() and result.returncode == 0,
                "analysis": analysis,
            })
    return frames


def analyze_frame(frame_path: Path) -> dict[str, Any]:
    """Return simple visual complexity metrics for an extracted frame.

    FFmpeg black/freeze filters are useful hints, but they overcall deliberate
    dark title cards and static dashboards. These image metrics catch the case
    we actually care about in quality eval: a sampled frame with almost no
    visible content at all.
    """
    try:
        rgb_image = Image.open(frame_path).convert("RGB").resize((240, 135))
        image = rgb_image.convert("L")
    except Exception as exc:
        return {"error": str(exc), "blank": True}

    background_rgb = _estimate_background_rgb(rgb_image)
    content_metrics = _foreground_metrics(rgb_image, background_rgb)
    dominant_colors = _dominant_colors(rgb_image)
    stat = ImageStat.Stat(image)
    mean = float(stat.mean[0])
    stddev = float(stat.stddev[0])
    red, green, blue = (float(value) for value in ImageStat.Stat(rgb_image).mean)
    edges = image.filter(ImageFilter.FIND_EDGES)
    edge_mean = float(ImageStat.Stat(edges).mean[0])
    blank = stddev < 2.5
    hue = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)[0] * 360
    dark_blue = mean < 70 and 200 <= hue <= 250 and blue > red * 1.12 and blue >= green * 0.88
    return {
        "mean_luma": round(mean, 2),
        "mean_rgb": [round(red, 2), round(green, 2), round(blue, 2)],
        "mean_hue": round(hue, 1),
        "stddev_luma": round(stddev, 2),
        "edge_mean": round(edge_mean, 2),
        "blank": blank,
        "dark_blue_family": dark_blue,
        "background_rgb": [round(value, 2) for value in background_rgb],
        "content_bbox_ratio": content_metrics["content_bbox_ratio"],
        "content_pixel_ratio": content_metrics["content_pixel_ratio"],
        "primary_bbox_ratio": content_metrics["primary_bbox_ratio"],
        "primary_pixel_ratio": content_metrics["primary_pixel_ratio"],
        "primary_width_ratio": content_metrics["primary_width_ratio"],
        "primary_height_ratio": content_metrics["primary_height_ratio"],
        "primary_min_x_ratio": content_metrics["primary_min_x_ratio"],
        "primary_max_x_ratio": content_metrics["primary_max_x_ratio"],
        "dominant_colors": dominant_colors,
    }


def _estimate_background_rgb(image: Image.Image) -> tuple[float, float, float]:
    width, height = image.size
    pixels = image.load()
    samples = []
    for x in range(0, width, 4):
        samples.append(pixels[x, 0])
        samples.append(pixels[x, height - 1])
    for y in range(0, height, 4):
        samples.append(pixels[0, y])
        samples.append(pixels[width - 1, y])
    if not samples:
        return (255.0, 255.0, 255.0)
    channels = list(zip(*samples, strict=True))
    return tuple(float(sorted(channel)[len(channel) // 2]) for channel in channels)  # type: ignore[return-value]


def _foreground_metrics(image: Image.Image, background_rgb: tuple[float, float, float]) -> dict[str, float]:
    width, height = image.size
    pixels = image.load()
    full_points = []
    primary_points = []
    primary_min_y = int(height * PRIMARY_CONTENT_TOP_SKIP_RATIO)

    for y in range(height):
        for x in range(width):
            red, green, blue = pixels[x, y]
            distance = math.sqrt(
                (red - background_rgb[0]) ** 2
                + (green - background_rgb[1]) ** 2
                + (blue - background_rgb[2]) ** 2
            )
            if distance < FOREGROUND_DISTANCE_THRESHOLD:
                continue
            point = (x, y)
            full_points.append(point)
            if y >= primary_min_y:
                primary_points.append(point)

    def metrics(points: list[tuple[int, int]]) -> tuple[float, float]:
        if not points:
            return 0.0, 0.0
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        bbox_area = (max(xs) - min(xs) + 1) * (max(ys) - min(ys) + 1)
        frame_area = width * height
        return bbox_area / frame_area, len(points) / frame_area

    content_bbox_ratio, content_pixel_ratio = metrics(full_points)
    primary_bbox_ratio, primary_pixel_ratio = metrics(primary_points)
    primary_xs = [point[0] for point in primary_points]
    primary_ys = [point[1] for point in primary_points]
    if primary_points:
        primary_width_ratio = (max(primary_xs) - min(primary_xs) + 1) / width
        primary_height_ratio = (max(primary_ys) - min(primary_ys) + 1) / height
        min_x_ratio = min(primary_xs) / width
        max_x_ratio = max(primary_xs) / width
    else:
        primary_width_ratio = 0.0
        primary_height_ratio = 0.0
        min_x_ratio = 1.0
        max_x_ratio = 0.0
    return {
        "content_bbox_ratio": round(content_bbox_ratio, 3),
        "content_pixel_ratio": round(content_pixel_ratio, 3),
        "primary_bbox_ratio": round(primary_bbox_ratio, 3),
        "primary_pixel_ratio": round(primary_pixel_ratio, 3),
        "primary_width_ratio": round(primary_width_ratio, 3),
        "primary_height_ratio": round(primary_height_ratio, 3),
        "primary_min_x_ratio": round(min_x_ratio, 3),
        "primary_max_x_ratio": round(max_x_ratio, 3),
    }


def _relative_luminance(rgb: tuple[float, float, float]) -> float:
    channels = []
    for value in rgb:
        value = value / 255
        channels.append(value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def _contrast_ratio(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    luma_a = _relative_luminance(a)
    luma_b = _relative_luminance(b)
    lighter = max(luma_a, luma_b)
    darker = min(luma_a, luma_b)
    return (lighter + 0.05) / (darker + 0.05)


def _dominant_colors(image: Image.Image) -> list[dict[str, Any]]:
    quantized = image.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette() or []
    counts = quantized.getcolors(maxcolors=8) or []
    total = max(1, sum(count for count, _ in counts))
    colors = []
    for count, index in sorted(counts, reverse=True):
        offset = index * 3
        if offset + 2 >= len(palette):
            continue
        rgb = tuple(float(value) for value in palette[offset:offset + 3])
        hue, saturation, _value = colorsys.rgb_to_hsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
        colors.append({
            "rgb": [round(value, 2) for value in rgb],
            "ratio": round(count / total, 3),
            "hue": round(hue * 360, 1),
            "saturation": round(saturation, 3),
            "luma": round(_relative_luminance(rgb), 3),
        })
    return colors


def theme_sameness_summary(
    scene_frames: list[dict[str, Any]],
    allow_dark_blue: bool = False,
    warn_threshold: float = DARK_BLUE_WARN_THRESHOLD,
    fail_threshold: float = DARK_BLUE_FAIL_THRESHOLD,
) -> dict[str, Any]:
    analyzed = [frame for frame in scene_frames if frame.get("exists") and frame.get("analysis")]
    if not analyzed:
        return {"sampled_frames": 0, "dark_blue_frames": 0, "dark_blue_ratio": 0.0, "warning": None, "hard_failure": None}
    dark_blue_count = sum(1 for frame in analyzed if frame.get("analysis", {}).get("dark_blue_family"))
    ratio = dark_blue_count / len(analyzed)
    warning = None
    hard_failure = None
    message = f"Dark-blue visual sameness: {ratio:.0%} of sampled frames fall in a dark blue/slate family."
    if ratio >= fail_threshold and not allow_dark_blue:
        hard_failure = message + " Choose a different visual lane or mark the SCF as intentionally dark-blue."
    elif ratio >= warn_threshold and not allow_dark_blue:
        warning = message
    return {
        "sampled_frames": len(analyzed),
        "dark_blue_frames": dark_blue_count,
        "dark_blue_ratio": round(ratio, 3),
        "allow_dark_blue": allow_dark_blue,
        "warning": warning,
        "hard_failure": hard_failure,
    }


def _scene_frame_groups(scene_frames: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for frame in scene_frames:
        groups.setdefault(str(frame.get("scene_id") or "?"), []).append(frame)
    return groups


def _light_warm_background(colors: list[dict[str, Any]]) -> dict[str, Any] | None:
    candidates = [
        color for color in colors
        if color.get("ratio", 0) >= 0.18 and color.get("luma", 0) >= 0.70
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda color: color.get("ratio", 0))


def _muddy_neutral_surface(colors: list[dict[str, Any]], background: dict[str, Any]) -> dict[str, Any] | None:
    background_rgb = tuple(float(value) for value in background.get("rgb", [255, 255, 255]))
    for color in colors:
        if color is background:
            continue
        if color.get("ratio", 0) < 0.07:
            continue
        if not (0.10 <= color.get("luma", 0) <= 0.58):
            continue
        if color.get("saturation", 1) > 0.18:
            continue
        rgb = tuple(float(value) for value in color.get("rgb", [0, 0, 0]))
        contrast = _contrast_ratio(background_rgb, rgb)
        if contrast < 5.0:
            result = dict(color)
            result["contrast_with_background"] = round(contrast, 2)
            return result
    return None


def visual_design_summary(
    scene_frames: list[dict[str, Any]],
    occupancy_warning_threshold: float = STRUCTURED_VISUAL_OCCUPANCY_WARNING,
    occupancy_failure_threshold: float = STRUCTURED_VISUAL_OCCUPANCY_FAILURE,
) -> dict[str, Any]:
    """Flag rendered-frame design issues that SCF structure cannot reveal."""
    issues = []
    scene_summaries = []

    for scene_id, frames in _scene_frame_groups(scene_frames).items():
        analyzed = [frame for frame in frames if frame.get("exists") and frame.get("analysis")]
        if not analyzed:
            continue
        component = analyzed[0].get("component") or ""
        primary_bbox_values = [
            float(frame.get("analysis", {}).get("primary_bbox_ratio") or 0)
            for frame in analyzed
        ]
        primary_pixel_values = [
            float(frame.get("analysis", {}).get("primary_pixel_ratio") or 0)
            for frame in analyzed
        ]
        primary_width_values = [
            float(frame.get("analysis", {}).get("primary_width_ratio") or 0)
            for frame in analyzed
        ]
        primary_max_x_values = [
            float(frame.get("analysis", {}).get("primary_max_x_ratio") or 0)
            for frame in analyzed
        ]
        primary_min_x_values = [
            float(frame.get("analysis", {}).get("primary_min_x_ratio") or 1)
            for frame in analyzed
        ]
        max_primary_bbox = max(primary_bbox_values or [0.0])
        max_primary_pixels = max(primary_pixel_values or [0.0])
        max_primary_width = max(primary_width_values or [0.0])
        max_primary_x = max(primary_max_x_values or [0.0])
        min_primary_x = min(primary_min_x_values or [1.0])
        scene_summaries.append({
            "scene_id": scene_id,
            "component": component,
            "max_primary_bbox_ratio": round(max_primary_bbox, 3),
            "max_primary_pixel_ratio": round(max_primary_pixels, 3),
            "max_primary_width_ratio": round(max_primary_width, 3),
        })

        if component in STRUCTURED_VISUAL_COMPONENTS and max_primary_bbox < occupancy_warning_threshold:
            severity = "error" if max_primary_bbox < occupancy_failure_threshold else "warning"
            issues.append({
                "severity": severity,
                "scene_id": scene_id,
                "component": component,
                "issue": "primary_visual_too_small",
                "detail": (
                    f"Primary visual in scene {scene_id} occupies only {max_primary_bbox:.0%} "
                    "of the sampled frame after the title area. Enlarge or re-layout the diagram/chart/UI."
                ),
                "max_primary_bbox_ratio": round(max_primary_bbox, 3),
                "max_primary_pixel_ratio": round(max_primary_pixels, 3),
            })

        if component == "DataFlow" and max_primary_width < 0.42:
            severity = "error" if max_primary_width < 0.30 else "warning"
            issues.append({
                "severity": severity,
                "scene_id": scene_id,
                "component": component,
                "issue": "primary_visual_too_narrow",
                "detail": (
                    f"DataFlow scene {scene_id} uses only {max_primary_width:.0%} of the frame width. "
                    "Use a portrait/vertical layout or increase node scale so the workflow is readable."
                ),
                "max_primary_width_ratio": round(max_primary_width, 3),
            })

        if component in STRUCTURED_VISUAL_COMPONENTS and (max_primary_x > 0.965 or min_primary_x < 0.035):
            issues.append({
                "severity": "warning",
                "scene_id": scene_id,
                "component": component,
                "issue": "content_touches_frame_edge",
                "detail": (
                    f"Scene {scene_id} has foreground content reaching the frame edge. "
                    "Review for clipped labels, overflowing notes, or missing safe-area padding."
                ),
                "primary_min_x_ratio": round(min_primary_x, 3),
                "primary_max_x_ratio": round(max_primary_x, 3),
            })

        for frame in analyzed:
            colors = frame.get("analysis", {}).get("dominant_colors") or []
            background = _light_warm_background(colors)
            if not background:
                continue
            muddy = _muddy_neutral_surface(colors, background)
            if not muddy:
                continue
            issues.append({
                "severity": "warning",
                "scene_id": scene_id,
                "component": component,
                "issue": "muddy_neutral_on_light_background",
                "detail": (
                    f"Scene {scene_id} pairs a light warm background with a large low-saturation grey surface "
                    f"at {muddy['contrast_with_background']}:1 contrast. Consider a cleaner surface, stronger border, or theme-matched panel color."
                ),
                "timestamp_sec": frame.get("timestamp_sec"),
                "surface_ratio": muddy.get("ratio"),
                "contrast_with_background": muddy.get("contrast_with_background"),
            })
            break

    hard_failures = [issue["detail"] for issue in issues if issue.get("severity") == "error"]
    warnings = [issue["detail"] for issue in issues if issue.get("severity") != "error"]
    return {
        "issues": issues,
        "hard_failures": hard_failures,
        "warnings": warnings,
        "scene_summaries": scene_summaries,
    }


def allows_dark_blue_sameness(scf: dict[str, Any]) -> bool:
    metadata = scf.get("metadata") or {}
    theme = metadata.get("theme") or {}
    visual_direction = metadata.get("visual_direction") or metadata.get("visualDirection") or {}
    if theme.get("visualFamily") == "dark-blue":
        return True
    if isinstance(visual_direction, dict) and visual_direction.get("allowDarkBlueSameness") is True:
        return True
    text = json.dumps(visual_direction).lower() if isinstance(visual_direction, (dict, list)) else str(visual_direction).lower()
    return any(term in text for term in ("intentional dark blue", "navy", "dark-blue"))


def _score_packet(
    pre_render: dict[str, Any],
    inspection: dict[str, Any],
    scene_frames: list[dict[str, Any]],
    theme_sameness: dict[str, Any],
    freeze_classification: dict[str, Any] | None = None,
    visual_design: dict[str, Any] | None = None,
    profile: str = DEFAULT_EVAL_PROFILE,
) -> dict[str, Any]:
    profile = profile.strip().lower()
    render_failures = []
    publish_failures = []
    warnings = []

    if not pre_render.get("passed"):
        blocking_categories = {
            issue.get("category")
            for issue in pre_render.get("blocking_issues", [])
            if issue.get("category")
        }
        target = render_failures if blocking_categories & RENDER_BLOCKING_CATEGORIES else publish_failures
        target.append(pre_render.get("summary", "Pre-render validation failed"))
    if theme_sameness.get("hard_failure"):
        if profile in {"publish", "ci"}:
            publish_failures.append(theme_sameness["hard_failure"])
        else:
            warnings.append(theme_sameness["hard_failure"])
    missing_frames = [frame for frame in scene_frames if not frame.get("exists")]
    if missing_frames:
        render_failures.append(f"Missing extracted frames: {len(missing_frames)}")
    blank_frames = [
        frame for frame in scene_frames
        if frame.get("exists") and frame.get("analysis", {}).get("blank")
    ]
    if blank_frames:
        render_failures.append(
            "Blank sampled frames: " + ", ".join(
                f"{frame['scene_id']}@{frame['timestamp_sec']:.2f}s" for frame in blank_frames[:8]
            ) + ("..." if len(blank_frames) > 8 else "")
        )

    if freeze_classification:
        render_failures.extend(freeze_classification.get("hard_failures") or [])
        warnings.extend(freeze_classification.get("warnings") or [])
    if inspection.get("issues"):
        warnings.extend(
            issue for issue in inspection["issues"]
            if not str(issue).startswith("FROZEN_FRAMES:")
        )
    if theme_sameness.get("warning"):
        warnings.append(theme_sameness["warning"])
    if visual_design:
        if profile in {"publish", "ci"}:
            publish_failures.extend(visual_design.get("hard_failures") or [])
        else:
            warnings.extend(visual_design.get("hard_failures") or [])
        warnings.extend(visual_design.get("warnings") or [])

    warnings.extend(
        issue.get("detail", str(issue))
        for issue in pre_render.get("review_issues", [])
    )

    hard_failures = render_failures + publish_failures
    if render_failures:
        verdict = "FAIL_TO_RENDER"
    elif publish_failures:
        verdict = "FAIL_TO_PUBLISH"
    elif warnings:
        verdict = "PASS_WITH_REVIEW"
    else:
        verdict = "PASS"

    return {
        "profile": profile,
        "verdict": verdict,
        "hard_failures": hard_failures,
        "render_failures": render_failures,
        "publish_failures": publish_failures,
        "warnings": warnings,
        "frame_count": len(scene_frames),
    }


def write_markdown_report(report: dict[str, Any], output_path: Path) -> None:
    lines = [
        "# Slate Quality Eval Packet",
        "",
        f"**Verdict:** {report['score']['verdict']}",
        f"**Profile:** {report['score'].get('profile', DEFAULT_EVAL_PROFILE)}",
        f"**Video:** {report['video']}",
        f"**SCF:** {report['scf']}",
        "",
        "## Automated Findings",
        "",
    ]
    if report["score"]["hard_failures"]:
        lines.append("### Blockers")
        lines.extend(f"- {item}" for item in report["score"]["hard_failures"])
        lines.append("")
    if report["score"]["warnings"]:
        lines.append("### Warnings")
        lines.extend(f"- {item}" for item in report["score"]["warnings"])
        lines.append("")
    if not report["score"]["hard_failures"] and not report["score"]["warnings"]:
        lines.append("No automated blockers or warnings. Human frame review still required.")
        lines.append("")

    lines.extend([
        "## Scene Frame Review",
        "",
        "Review these like a viewer, not like a schema validator: does the frame clearly show what the narration promised, does it feel alive, and would you ship it?",
        "",
        "| Scene | Component | Time | Frame | Pixel check | Human notes |",
        "|---|---|---:|---|---|---|",
    ])
    for frame in report["scene_frames"]:
        rel = Path(frame["path"]).relative_to(output_path.parent).as_posix() if Path(frame["path"]).exists() else frame["path"]
        analysis = frame.get("analysis") or {}
        pixel_check = "blank" if analysis.get("blank") else f"edge {analysis.get('edge_mean', '?')} / std {analysis.get('stddev_luma', '?')}"
        lines.append(
            f"| {frame['scene_id']} | {frame.get('component') or ''} | {frame['timestamp_sec']:.2f}s | [{Path(frame['path']).name}]({rel}) | {pixel_check} |  |"
        )

    lines.extend([
        "",
        "## SCF Validation Summary",
        "",
        report["pre_render"].get("summary", ""),
        "",
        "## Video Inspection",
        "",
        json.dumps({
            "issues": report["inspection"].get("issues", []),
            "frozen_sections": report["inspection"].get("frozen_sections", []),
            "freeze_classification": report.get("freeze_classification", {}),
            "black_sections": report["inspection"].get("black_sections", []),
            "audio_levels": report["inspection"].get("audio_levels"),
        }, indent=2),
        "",
        "## Theme Sameness",
        "",
        json.dumps(report.get("theme_sameness", {}), indent=2),
        "",
        "## Visual Design Lint",
        "",
        json.dumps(report.get("visual_design", {}), indent=2),
        "",
    ])
    output_path.write_text("\n".join(lines), encoding="utf-8")


def evaluate(video_path: Path, scf_path: Path, output_dir: Path, dense: bool = False, profile: str = DEFAULT_EVAL_PROFILE) -> dict[str, Any]:
    scf = json.loads(scf_path.read_text(encoding="utf-8"))
    output_dir.mkdir(parents=True, exist_ok=True)

    pre_render = validate_scf_pre_render(scf, str(scf_path.parent), profile=profile)
    inspection = inspect_video(str(video_path), str(output_dir / "global_frames"), frame_count=8)
    scene_frames = extract_scene_frames(video_path, scf, output_dir, dense=dense)
    theme_sameness = theme_sameness_summary(scene_frames, allow_dark_blue=allows_dark_blue_sameness(scf))
    freeze_classification = classify_frozen_sections(scf, inspection.get("frozen_sections") or [])
    visual_design = visual_design_summary(scene_frames)
    score = _score_packet(
        pre_render,
        inspection,
        scene_frames,
        theme_sameness,
        freeze_classification,
        visual_design,
        profile=profile,
    )

    report = {
        "video": str(video_path),
        "scf": str(scf_path),
        "pre_render": pre_render,
        "inspection": inspection,
        "scene_frames": scene_frames,
        "theme_sameness": theme_sameness,
        "freeze_classification": freeze_classification,
        "visual_design": visual_design,
        "score": score,
    }
    (output_dir / "quality_eval.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    write_markdown_report(report, output_dir / "quality_eval.md")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a Slate quality eval packet for a rendered MP4.")
    parser.add_argument("--video", required=True, help="Rendered MP4 path")
    parser.add_argument("--scf", required=True, help="SCF JSON path")
    parser.add_argument("--output-dir", required=True, help="Directory for eval artifacts")
    parser.add_argument("--dense", action="store_true", help="Extract roughly one frame per second per scene")
    parser.add_argument(
        "--profile",
        choices=sorted(QUALITY_PROFILES),
        default=DEFAULT_EVAL_PROFILE,
        help="Quality strictness for scoring. publish is the default eval profile.",
    )
    args = parser.parse_args()

    report = evaluate(Path(args.video), Path(args.scf), Path(args.output_dir), dense=args.dense, profile=args.profile)
    print(json.dumps(report["score"], indent=2))
    return 0 if not report["score"]["verdict"].startswith("FAIL") else 1


if __name__ == "__main__":
    raise SystemExit(main())
