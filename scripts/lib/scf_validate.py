"""Slate SCF pre-compose validation.

Run these checks AFTER generating assets but BEFORE rendering, to catch
timing mismatches, missing assets, and other issues that are cheap to fix
pre-render but expensive to discover post-render.
"""

import json
import math
import re
import subprocess
from copy import deepcopy
from pathlib import Path

try:
    from component_inventory import build_component_manifest
except Exception:  # pragma: no cover - validator still works without inventory helpers
    build_component_manifest = None


MEDIA_SUFFIXES = {".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg"}
MAX_VISUAL_HOLD_SEC = 4.0
VISUAL_BEAT_KEYS = {
    "beats",
    "visualBeats",
    "steps",
    "stepsHtml",
    "frames",
    "shots",
    "pages",
    "events",
    "timeline",
    "metrics",
    "slides",
    "states",
    "cards",
    "textureSrcs",
}

TIMING_SENSITIVE_COMPONENTS = {
    "DataChart",
    "DataFlow",
    "MetricsCard",
    "MetricStack",
    "ArchitectureDiagram",
    "VSCodeScene",
    "GitHubScene",
    "TeamsScene",
    "OutlookScene",
    "ExcelScene",
    "PlannerScene",
    "PowerPointScene",
    "PowerBIScene",
    "CTABlock",
    "StepByStep",
    "TerminalCast",
    "TerminalScene",
    "PALReviewSurface",
    # 3D / WebGL components: continuous camera + material motion drives
    # perceptual change every frame even when there's only one "logical" beat.
    "ThreeScene",
    "DeviceStage3D",
    "HTMLTextureWall",
    "MoneyTransferScene",
}

QUALITY_FIRST_METADATA_KEYS = {"qualityFirst", "quality_first", "requireSceneContracts", "require_scene_contracts"}
QUALITY_PROFILES = {"draft", "guided", "publish", "ci"}
DEFAULT_VALIDATION_PROFILE = "guided"

STRUCTURAL_BLOCKER_GROUPS = {
    "narration_overflows",
    "video_layer_issues",
    "missing_assets",
}

PUBLISH_BLOCKER_GROUPS = STRUCTURAL_BLOCKER_GROUPS | {
    "component_regressions",
    "caption_issues",
    "visual_hold_issues",
    "visual_support_issues",
    "bridge_component_issues",
    "narration_text_issues",
    "narration_text_present_issues",
    "component_prop_contract_issues",
    "scene_contract_issues",
    "reusable_footage_issues",
    "text_on_image_issues",
}

CI_BLOCKER_GROUPS = PUBLISH_BLOCKER_GROUPS | {
    "slideshow_warnings",
    "precise_video_language_issues",
}


def normalize_quality_profile(profile: str | None) -> str:
    normalized = (profile or DEFAULT_VALIDATION_PROFILE).strip().lower()
    if normalized not in QUALITY_PROFILES:
        raise ValueError(f"Unknown quality profile '{profile}'. Expected one of: {', '.join(sorted(QUALITY_PROFILES))}.")
    return normalized


def _default_caption_config(scf: dict) -> dict:
    output_profile = scf.get("outputProfile") or {}
    height = int(output_profile.get("height") or 1080)
    portrait = height > int(output_profile.get("width") or 1920)
    return {
        "style": "static",
        "font": "Aptos",
        "fontSize": 30 if portrait else 32,
        "color": "#172033",
        "lineBackgroundColor": "rgba(255,255,255,0.92)",
        "position": "bottom",
        "maxWordsPerLine": 5 if portrait else 7,
    }


def repair_scf_for_profile(scf: dict, profile: str | None = None) -> tuple[dict, list[dict]]:
    """Apply deterministic, low-risk SCF repairs before validation/render.

    Repairs must be safe enough for first-time users: no component swaps, no
    creative rewrites, and no hidden asset generation. Anything interpretive
    remains a validator warning or publish blocker.
    """
    profile = normalize_quality_profile(profile)
    repaired = deepcopy(scf)
    repairs = []

    if any(_has_narration(scene) for scene in repaired.get("scenes", [])):
        captions = repaired.get("captions") or {}
        if not captions or captions.get("style") == "none":
            repaired["captions"] = _default_caption_config(repaired)
            repairs.append({
                "issue": "captions_auto_added",
                "detail": "Added default visible static captions for narrated draft output.",
                "profile": profile,
            })

    return repaired, repairs


def _issue_blocks_profile(group: str, issue: dict, profile: str) -> bool:
    if profile in {"draft", "guided"}:
        if group in STRUCTURAL_BLOCKER_GROUPS:
            return True
        return group == "component_prop_contract_issues" and issue.get("severity") == "error"
    if profile == "publish":
        if group not in PUBLISH_BLOCKER_GROUPS:
            return False
        return issue.get("severity", "error") == "error"
    if profile == "ci":
        if group not in CI_BLOCKER_GROUPS:
            return False
        return issue.get("severity", "error") in {"error", "warning"}
    return False


def _annotate_profile_issues(issue_groups: dict[str, list[dict]], profile: str) -> tuple[list[dict], list[dict]]:
    blocking = []
    review = []
    for group, issues in issue_groups.items():
        for issue in issues:
            annotated = dict(issue)
            annotated.setdefault("severity", "error")
            annotated["category"] = group
            annotated["profile"] = profile
            annotated["blocking"] = _issue_blocks_profile(group, annotated, profile)
            if annotated["blocking"]:
                blocking.append(annotated)
            else:
                review.append(annotated)
    return blocking, review


def _scene_id(scene: dict) -> str:
    return scene.get("id") or scene.get("title") or "?"


def _looks_like_media_path(value: str) -> bool:
    try:
        return Path(value).suffix.lower() in MEDIA_SUFFIXES or "/" in value or "\\" in value
    except Exception:
        return False


def _narration_text(scene: dict) -> str:
    for key in ("narrationText", "narration_text", "voiceover", "voiceoverText"):
        value = scene.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    narration = scene.get("narration")
    if isinstance(narration, dict):
        for key in ("text", "script", "content"):
            value = narration.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    if isinstance(narration, str) and narration.strip() and not _looks_like_media_path(narration):
        return narration.strip()
    return ""


def _has_narration(scene: dict) -> bool:
    narration = scene.get("narration")
    return bool(narration or _narration_text(scene))


def _count_html_steps(value: str) -> int:
    if not value.strip():
        return 0
    markers = len(re.findall(r"(<li\b|<div\b|<p\b|<br\b|data-step=|data-kind=)", value, re.I))
    return max(1, markers)


def _count_beats(value) -> int:
    if value is None:
        return 0
    if isinstance(value, str):
        return _count_html_steps(value)
    if isinstance(value, dict):
        return max(1, len(value))
    if isinstance(value, (list, tuple)):
        return len(value)
    return 1


def _component_visual_beats(component: str | None, props: dict) -> int:
    if not component:
        return 0
    beats = 1
    if component in TIMING_SENSITIVE_COMPONENTS:
        beats = 3
    for key, value in (props or {}).items():
        if key in VISUAL_BEAT_KEYS or key.endswith("Steps") or key.endswith("States") or key.endswith("Beats"):
            beats = max(beats, _count_beats(value))
    return beats


def _scene_visual_beat_count(scene: dict) -> int:
    beats = _component_visual_beats(scene.get("component"), scene.get("props") or {})
    if not beats and scene.get("layers"):
        beats = 1

    visual_starts: set[float] = set()
    for layer in scene.get("layers") or []:
        if layer.get("type") == "component":
            beats = max(beats, _component_visual_beats(layer.get("component"), layer.get("props") or {}))
        if layer.get("type") in {"image", "video", "shape", "text", "caption"}:
            try:
                visual_starts.add(float(layer.get("startTime") or layer.get("start") or 0))
            except Exception:
                visual_starts.add(0.0)
    if visual_starts:
        beats = max(beats, len(visual_starts))

    return beats


def _has_video_motion(scene: dict) -> bool:
    return any(layer.get("type") == "video" for layer in scene.get("layers") or [])


def _scene_surface_text(scene: dict) -> str:
    try:
        return json.dumps({
            "component": scene.get("component"),
            "props": scene.get("props") or {},
            "layers": scene.get("layers") or [],
            "title": scene.get("title") or "",
        }, ensure_ascii=True).lower()
    except Exception:
        return str(scene).lower()


def _scene_component_names(scene: dict) -> list[str]:
    components = []
    if scene.get("component"):
        components.append(str(scene.get("component")))
    for layer in scene.get("layers") or []:
        if layer.get("type") == "component" and layer.get("component"):
            components.append(str(layer.get("component")))
    return components


def _scene_contracts(scf: dict) -> dict[str, dict]:
    metadata = scf.get("metadata") or {}
    candidates = metadata.get("sceneContracts") or metadata.get("scene_contracts") or {}
    if isinstance(candidates, list):
        return {
            str(item.get("sceneId") or item.get("scene_id") or item.get("id")): item
            for item in candidates
            if isinstance(item, dict) and (item.get("sceneId") or item.get("scene_id") or item.get("id"))
        }
    return candidates if isinstance(candidates, dict) else {}


def _quality_first_enabled(scf: dict) -> bool:
    metadata = scf.get("metadata") or {}
    return any(bool(metadata.get(key)) for key in QUALITY_FIRST_METADATA_KEYS)


def _inventory_by_name(scf_dir: str | None = None) -> dict[str, dict]:
    if build_component_manifest is None:
        return {}
    try:
        manifest = build_component_manifest()
    except Exception:
        return {}
    inventory = {
        item.get("name"): item
        for item in manifest.get("components", [])
        if item.get("name")
    }
    # Project-scoped one-off components live in `<project>/components/<Name>/`
    # and render without a global registration; treat them as known here so the
    # scene-contract check does not flag a bespoke one-off as "unregistered".
    if scf_dir:
        comp_root = Path(scf_dir) / "components"
        if comp_root.is_dir():
            for child in comp_root.iterdir():
                if child.is_dir() and (child / "index.html").exists():
                    inventory.setdefault(child.name, {"name": child.name, "project_scoped": True, "has_prop_contract": (child / "props.json").exists()})
    return inventory


def _ffprobe_duration(path: str) -> float | None:
    """Get media file duration via ffprobe. Returns None on failure."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
            capture_output=True, text=True, timeout=10
        )
        return float(json.loads(result.stdout)["format"]["duration"])
    except Exception:
        return None


def _ffprobe_has_audio(path: str) -> bool:
    """Check if a media file has an audio stream."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", path],
            capture_output=True, text=True, timeout=10
        )
        streams = json.loads(result.stdout).get("streams", [])
        return any(s.get("codec_type") == "audio" for s in streams)
    except Exception:
        return False


def validate_narration_fit(scf: dict, scf_dir: str) -> list[dict]:
    """Check that all narration audio fits within scene durations.

    Returns list of overflow dicts: {scene_id, scene_duration, audio_duration,
    overflow_sec} for any scenes where audio overflows by > 0.5s.
    """
    issues = []
    for scene in scf.get("scenes", []):
        narration = scene.get("narration")
        scene_dur = scene.get("duration", 0)
        if not narration or not scene_dur:
            continue

        audio_path = Path(scf_dir) / narration
        if not audio_path.exists():
            issues.append({
                "scene_id": scene.get("id", "?"),
                "scene_duration": scene_dur,
                "audio_duration": None,
                "overflow_sec": None,
                "error": f"Narration file not found: {narration}",
            })
            continue

        audio_dur = _ffprobe_duration(str(audio_path))
        if audio_dur is None:
            continue

        overflow = audio_dur - scene_dur
        if overflow > 0.5:
            issues.append({
                "scene_id": scene.get("id", "?"),
                "scene_duration": scene_dur,
                "audio_duration": round(audio_dur, 2),
                "overflow_sec": round(overflow, 2),
            })

    return issues


def validate_video_layers(scf: dict, scf_dir: str) -> list[dict]:
    """Check that video layer clips fit within scene durations and have no audio.

    AI-generated video clips (Sora-2) should have their audio stripped before
    composing. This check catches clips that still have audio embedded and
    clips shorter than their scene duration (which causes black frames).
    """
    issues = []
    for scene in scf.get("scenes", []):
        scene_dur = scene.get("duration", 0)
        for layer in scene.get("layers", []):
            if layer.get("type") != "video":
                continue
            src = layer.get("src", "")
            video_path = Path(scf_dir) / src
            if not video_path.exists():
                issues.append({
                    "scene_id": scene.get("id", "?"),
                    "issue": "missing_video",
                    "detail": f"Video file not found: {src}",
                })
                continue

            scene_dur = scene.get("duration", 0)
            layer_start = layer.get("startTime", 0)
            layer_end = layer.get("endTime", scene_dur)
            window = max(0, layer_end - layer_start)

            video_path = Path(scf_dir) / src
            if not video_path.exists():
                continue

            clip_dur = _ffprobe_duration(str(video_path))
            if clip_dur is not None and clip_dur < window - 0.5:
                issues.append({
                    "scene_id": scene.get("id", "?"),
                    "issue": "clip_too_short",
                    "detail": f"Video clip is {clip_dur:.1f}s but layer window is {window}s "
                              f"({window - clip_dur:.1f}s will be black)",
                    "clip_duration": round(clip_dur, 2),
                    "scene_duration": scene_dur,
                })

            if _ffprobe_has_audio(str(video_path)):
                issues.append({
                    "scene_id": scene.get("id", "?"),
                    "issue": "video_has_audio",
                    "detail": f"Video clip {src} has an audio track — "
                              "strip with ffmpeg -an to prevent mystery audio bleed",
                })

    return issues


def validate_missing_assets(scf: dict, scf_dir: str) -> list[dict]:
    """Check that all referenced assets exist on disk."""
    issues = []
    for scene in scf.get("scenes", []):
        # Check narration
        narration = scene.get("narration")
        if narration and not (Path(scf_dir) / narration).exists():
            issues.append({
                "scene_id": scene.get("id", "?"),
                "asset": narration,
                "type": "narration",
            })
        # Check layers
        for layer in scene.get("layers", []):
            src = layer.get("src")
            if src and not (Path(scf_dir) / src).exists():
                issues.append({
                    "scene_id": scene.get("id", "?"),
                    "asset": src,
                    "type": layer.get("type", "unknown"),
                })
        # Check component props with asset paths
        props = scene.get("props", {})
        for key, val in props.items():
            if isinstance(val, str) and (key.endswith("Src") or key.endswith("Path") or key == "src"):
                if val and not val.startswith("http") and not (Path(scf_dir) / val).exists():
                    issues.append({
                        "scene_id": scene.get("id", "?"),
                        "asset": val,
                        "type": f"prop:{key}",
                    })
    return issues


def validate_component_regression(scf: dict, source_scenario: dict | None = None) -> list[dict]:
    """Detect component scenes that were downgraded to layer-only scenes."""
    expected: dict[str, str] = {}
    if source_scenario:
        expected.update({
            scene.get("id"): scene.get("component")
            for scene in source_scenario.get("scenes", [])
            if scene.get("id") and scene.get("component")
        })
    expected.update(scf.get("metadata", {}).get("source_components", {}) or {})

    issues = []
    if not expected:
        return issues

    scenes_by_id = {scene.get("id"): scene for scene in scf.get("scenes", [])}
    for scene_id, component in expected.items():
        scene = scenes_by_id.get(scene_id)
        if not scene:
            issues.append({
                "severity": "error",
                "scene_id": scene_id,
                "issue": "component_scene_missing",
                "detail": f"Source scenario declared component {component}, but the SCF scene is missing.",
            })
            continue
        if scene.get("component") != component:
            issues.append({
                "severity": "error",
                "scene_id": scene_id,
                "issue": "component_regression",
                "detail": f"Source scenario declared component {component}, but SCF has {scene.get('component') or 'no component'}.",
            })
    return issues


def _is_image_text_slide(scene: dict) -> bool:
    if scene.get("component"):
        return False
    layers = scene.get("layers", [])
    if not layers:
        return False
    types = {layer.get("type") for layer in layers}
    return types.issubset({"image", "text", "caption", "shape"}) and "text" in types


def validate_slideshow_drift(scf: dict, threshold: int = 4) -> list[dict]:
    """Warn when too many consecutive scenes are image/text overlays."""
    issues = []
    run: list[str] = []
    for scene in scf.get("scenes", []):
        if _is_image_text_slide(scene):
            run.append(scene.get("id", "?"))
            continue
        if len(run) >= threshold:
            issues.append({
                "severity": "warning",
                "scene_id": run[0],
                "issue": "slideshow_drift",
                "detail": f"{len(run)} consecutive image/text overlay scenes: {', '.join(run)}",
            })
        run = []
    if len(run) >= threshold:
        issues.append({
            "severity": "warning",
            "scene_id": run[0],
            "issue": "slideshow_drift",
            "detail": f"{len(run)} consecutive image/text overlay scenes: {', '.join(run)}",
        })
    return issues


def validate_captions_required(scf: dict) -> list[dict]:
    """Require visible captions whenever the composition has narration."""
    if not any(_has_narration(scene) for scene in scf.get("scenes", [])):
        return []

    captions = scf.get("captions") or {}
    if captions and captions.get("style", "word-highlight") != "none":
        return []

    return [{
        "severity": "error",
        "scene_id": "global",
        "issue": "captions_required",
        "detail": "Narrated videos must include visible captions; set captions.style to word-highlight, sentence, karaoke, or static.",
    }]


def validate_visual_hold_duration(scf: dict, max_hold_sec: float = MAX_VISUAL_HOLD_SEC) -> list[dict]:
    """Fail scenes that hold one visual longer than the maximum beat duration."""
    issues = []
    for scene in scf.get("scenes", []):
        try:
            duration = float(scene.get("duration") or 0)
        except Exception:
            duration = 0.0
        if duration <= max_hold_sec:
            continue

        # Narrated scenes can hold a single image longer (up to 10s)
        has_narration = bool(scene.get("narration") or scene.get("narrationText"))
        effective_max = 10.0 if has_narration else max_hold_sec
        if duration <= effective_max:
            continue

        if _has_video_motion(scene):
            continue

        beats = _scene_visual_beat_count(scene)
        required_beats = max(2, math.ceil(duration / max_hold_sec))
        if beats < required_beats:
            severity = "warning" if has_narration else "error"
            issues.append({
                "severity": severity,
                "scene_id": _scene_id(scene),
                "issue": "visual_hold_too_long",
                "detail": (
                    f"Scene runs {duration:.1f}s with only {beats} visual beat(s). "
                    f"Use at least {required_beats} beat(s), a video layer, or a sequenced component so no visual holds longer than {max_hold_sec:.0f}s."
                ),
                "duration": round(duration, 2),
                "visual_beats": beats,
                "required_beats": required_beats,
            })
    return issues


SEMANTIC_VISUAL_RULES = [
    {
        "issue": "architecture_visual_missing",
        "keywords": ("architecture", "service architecture", "system diagram", "flow diagram", "data flow"),
        "required": ("architecturediagram", "dataflow", "azureportalscene", "componentoverlay", "diagram", "arrow"),
        "detail": "Architecture or flow narration needs a real service/flow diagram with visible nodes and arrows, not decorative imagery.",
    },
    {
        "issue": "metric_visual_missing",
        "keywords": ("over time", "trend", "dashboard", "kpi"),
        "required": ("metricstack", "metricscard", "datachart", "powerbiscene", "excelscene", "chart", "dashboard"),
        "detail": "Metric narration needs an explicit dashboard, KPI stack, or chart with the metric visible.",
    },
    {
        "issue": "book_page_visual_missing",
        "keywords": ("book", "page", "turning a page", "page is turned"),
        "required": ("bookpagemetrics", "pageturn", "componentoverlay", "spread"),
        "detail": "Book/page narration needs the book/page treatment or a rich overlay on the page, not a slide surface.",
    },
    {
        "issue": "vscode_visual_missing",
        "keywords": ("vs code", "visual studio code", "copilot", "developer", "typing a prompt"),
        "required": ("vscodescene", "terminalcast", "terminalscene", "githubscene", "azuredevopsscene", "stepshtml", "codecontenthtml", "primarysidebarbodyhtml"),
        "detail": "Developer/Copilot narration needs a moving VS Code, terminal, GitHub, or Azure DevOps synthetic surface with visible actions.",
    },
    {
        "issue": "spreadsheet_visual_missing",
        "keywords": ("spreadsheet", "excel", "workbook", "formula", "cell"),
        "required": ("excelscene", "datachart", "metricstack", "table", "formula", "workbook"),
        "detail": "Spreadsheet narration needs an Excel/table surface with cells, formulas, typing, or chart output.",
    },
    {
        "issue": "collaboration_visual_missing",
        "keywords": ("teams", "outlook", "microsoft 365", "m365"),
        "required": ("teamsscene", "outlookscene", "excelscene", "splitScreen", "splitscreen", "loopscene"),
        "detail": "Teams/Outlook/M365 narration needs the matching synthetic app surfaces, preferably sequenced together.",
    },
    {
        "issue": "cli_visual_missing",
        "keywords": ("cli", "command line", "run a command", "execute a command", "jetbridge"),
        "required": ("terminalcast", "terminalscene", "vscodescene", "stepshtml"),
        "detail": "CLI narration needs a terminal or VS Code command sequence, not a static screenshot.",
    },
]


def validate_narration_visual_support(scf: dict) -> list[dict]:
    """Require narration claims to be backed by the corresponding visual surface."""
    issues = []
    for scene in scf.get("scenes", []):
        narration = _narration_text(scene).lower()
        if not narration:
            continue
        surface = _scene_surface_text(scene)
        for rule in SEMANTIC_VISUAL_RULES:
            if not any(
                f" {keyword} " in f" {narration} "
                or narration.startswith(f"{keyword} ")
                or narration.endswith(f" {keyword}")
                or narration == keyword
                for keyword in rule["keywords"]
            ):
                continue
            if any(required.lower() in surface for required in rule["required"]):
                continue
            issues.append({
                "severity": "error",
                "scene_id": _scene_id(scene),
                "issue": rule["issue"],
                "detail": rule["detail"],
            })
    return issues


PRECISE_VIDEO_ASPECTS = ("subject", "scene", "motion", "spatial", "camera")
CINEMATIC_COMPONENTS = {
    "AssetCascade",
    "CollageShatter",
    "DepthZoomPunch",
    "FilmstripFlip",
    "GlitchPulse",
    "IrisZoom",
    "OrbitReveal",
    "PageTurn",
    "ParticleAssemble",
    "PrismRefract",
    "ShakeImpact",
    "SwirlVortex",
    "TypewriterDissolve",
}

BRIDGE_ONLY_COMPONENTS = {
    "CollageShatter",
    "DepthZoomPunch",
    "FilmstripFlip",
    "GlitchPulse",
    "IrisZoom",
    "PrismRefract",
    "ShakeImpact",
    "SwirlVortex",
    "TypewriterDissolve",
}


def _visual_spec(scene: dict) -> dict:
    props = scene.get("props") or {}
    value = scene.get("visualSpec") or scene.get("visual_spec") or props.get("visualSpec") or props.get("visual_spec")
    return value if isinstance(value, dict) else {}


def _needs_precise_video_spec(scene: dict) -> bool:
    surface = _scene_surface_text(scene)
    if any(layer.get("type") == "video" for layer in scene.get("layers") or []):
        return True
    if scene.get("component") in CINEMATIC_COMPONENTS:
        return True
    return any(token in surface for token in ("sora", "video_prompt", "generated video", "camera", "dolly", "rack focus", "cinematic"))


def validate_precise_video_language(scf: dict) -> list[dict]:
    """Warn when cinematic/generated-video scenes lack a five-aspect visual spec."""
    issues = []
    for scene in scf.get("scenes", []):
        if not _needs_precise_video_spec(scene):
            continue
        spec = _visual_spec(scene)
        missing = [aspect for aspect in PRECISE_VIDEO_ASPECTS if not str(spec.get(aspect, "")).strip()]
        if not missing:
            continue
        issues.append({
            "severity": "warning",
            "scene_id": _scene_id(scene),
            "issue": "precise_video_language_missing",
            "detail": (
                "Cinematic or generated-video scene is missing a complete visualSpec "
                "(subject, scene, motion, spatial, camera). Add it so Sora prompts "
                "and reviewer checks share the same visible intent."
            ),
            "missing_aspects": missing,
        })
    return issues


def validate_bridge_component_usage(scf: dict, max_bridge_scene_sec: float = 1.5) -> list[dict]:
    """Reject bridge/transition components used as long standalone scenes.

    These components are useful punctuation between content scenes, but novice
    agents can mistake them for complete visual treatments. In rendered output
    that creates empty color fields, flashes, or abstract motion with no story
    information. Keep them short or wrap them in a content-bearing component.
    """
    issues = []
    for scene in scf.get("scenes", []):
        component = scene.get("component")
        if component not in BRIDGE_ONLY_COMPONENTS:
            continue
        if (scene.get("props") or {}).get("allowStandaloneBridge") is True:
            continue
        try:
            duration = float(scene.get("duration") or 0)
        except Exception:
            duration = 0.0
        if duration <= max_bridge_scene_sec:
            continue
        issues.append({
            "severity": "error",
            "scene_id": _scene_id(scene),
            "issue": "bridge_component_used_as_scene",
            "detail": (
                f"{component} is a bridge/transition component but this scene runs {duration:.1f}s. "
                "Use it as a short transition beat, or choose a content component that renders visible story information."
            ),
            "component": component,
            "duration": round(duration, 2),
        })
    return issues


def validate_narration_text_quality(scf: dict) -> list[dict]:
    """Catch punctuation artifacts that TTS will read aloud."""
    issues = []
    for scene in scf.get("scenes", []):
        narration = _narration_text(scene)
        if not narration:
            continue
        if "..." in narration or "…" in narration or re.search(r"\bdot\s+dot\b", narration, re.I):
            issues.append({
                "severity": "error",
                "scene_id": _scene_id(scene),
                "issue": "narration_punctuation_artifact",
                "detail": "Narration contains ellipses or literal 'dot dot' phrasing that TTS may read aloud; rewrite with commas, periods, or explicit pauses.",
            })
    return issues


def validate_narration_text_present(scf: dict) -> list[dict]:
    """Require every narrated scene to embed narrationText.

    The semantic validators (visual support, text quality) silently
    no-op when scenes lack narrationText, which lets bad SCFs pass
    review with high scores. This validator makes the rubric
    self-defending: any scene with a `narration` audio reference must
    also include the matching `narrationText` field.
    """
    issues = []
    for scene in scf.get("scenes", []):
        if not _has_narration(scene):
            continue
        if _narration_text(scene):
            continue
        issues.append({
            "severity": "error",
            "scene_id": _scene_id(scene),
            "issue": "narration_text_missing",
            "detail": (
                "Scene has narration audio but no narrationText field. "
                "Embed the spoken script so semantic validators (visual "
                "support, ellipses, redundancy) can read it."
            ),
        })
    return issues


def validate_component_prop_contracts(scf: dict, scf_dir: str | None = None) -> list[dict]:
    """Warn when scenes use components without a machine-readable prop contract.

    Components can render without a schema, but novice-quality UX depends on
    the agent knowing what props are real. This warning gives evals a concrete
    signal when a scene is relying on undocumented or arbitrary props.
    """
    inventory = _inventory_by_name(scf_dir)
    if not inventory:
        return []

    issues = []
    for scene in scf.get("scenes", []):
        for component in _scene_component_names(scene):
            record = inventory.get(component)
            if not record:
                issues.append({
                    "severity": "error",
                    "scene_id": _scene_id(scene),
                    "issue": "component_not_in_inventory",
                    "detail": f"Component {component} is not present in the live component inventory.",
                    "component": component,
                })
                continue
            if record.get("has_prop_contract"):
                continue
            issues.append({
                "severity": "warning",
                "scene_id": _scene_id(scene),
                "issue": "component_prop_contract_missing",
                "detail": (
                    f"Component {component} has no schema guard or props.json. "
                    "Scene may still render, but the agent cannot validate prop fit before render."
                ),
                "component": component,
            })
    return issues


def validate_scene_contracts(scf: dict, require_contracts: bool | None = None, scf_dir: str | None = None) -> list[dict]:
    """Validate quality-first scene contracts attached to SCF metadata.

    Scene contracts are the bridge between a user's intent and the SCF. They
    are not pixel prescriptions; they state what each scene must accomplish,
    which component owns it, what motion beats keep it alive, and which cheap
    fallback paths are forbidden.
    """
    if require_contracts is None:
        require_contracts = _quality_first_enabled(scf)

    contracts = _scene_contracts(scf)
    issues = []
    inventory = _inventory_by_name(scf_dir)

    for scene in scf.get("scenes", []):
        scene_id = _scene_id(scene)
        contract = contracts.get(scene_id)

        if not contract:
            if require_contracts:
                issues.append({
                    "severity": "error",
                    "scene_id": scene_id,
                    "issue": "scene_contract_missing",
                    "detail": "Quality-first SCF requires a scene contract for every scene before compose.",
                })
            continue

        narrative_purpose = str(contract.get("narrativePurpose") or contract.get("narrative_purpose") or "").strip()
        visual_treatment = str(contract.get("visualTreatment") or contract.get("visual_treatment") or contract.get("visualJob") or contract.get("visual_job") or "").strip()
        primary = contract.get("primaryComponent") or contract.get("primary_component")
        motion_beats = contract.get("motionBeats") or contract.get("motion_beats") or []
        forbidden = [str(item).lower() for item in (contract.get("forbiddenFallbacks") or contract.get("forbidden_fallbacks") or [])]

        if not narrative_purpose:
            issues.append({
                "severity": "error",
                "scene_id": scene_id,
                "issue": "scene_contract_missing_narrative_purpose",
                "detail": "Scene contract must state why the scene exists in the story.",
            })
        if not visual_treatment:
            issues.append({
                "severity": "error",
                "scene_id": scene_id,
                "issue": "scene_contract_missing_visual_treatment",
                "detail": "Scene contract must state the intended visual treatment or visual job.",
            })

        scene_components = _scene_component_names(scene)
        if primary:
            if inventory and primary not in inventory:
                issues.append({
                    "severity": "error",
                    "scene_id": scene_id,
                    "issue": "scene_contract_unknown_component",
                    "detail": f"Scene contract names {primary}, but that component is not registered.",
                    "component": primary,
                })
            if scene_components and primary not in scene_components:
                issues.append({
                    "severity": "error",
                    "scene_id": scene_id,
                    "issue": "scene_contract_component_mismatch",
                    "detail": f"Scene contract expects {primary}, but SCF uses {', '.join(scene_components)}.",
                    "component": primary,
                })
        elif scene_components:
            issues.append({
                "severity": "warning",
                "scene_id": scene_id,
                "issue": "scene_contract_primary_component_missing",
                "detail": "Scene uses a component but the contract does not name the primary component.",
            })

        try:
            duration = float(scene.get("duration") or 0)
        except Exception:
            duration = 0.0
        if duration > MAX_VISUAL_HOLD_SEC and not _has_video_motion(scene):
            required_beats = max(2, math.ceil(duration / MAX_VISUAL_HOLD_SEC))
            if not isinstance(motion_beats, list) or len(motion_beats) < required_beats:
                issues.append({
                    "severity": "error",
                    "scene_id": scene_id,
                    "issue": "scene_contract_motion_beats_insufficient",
                    "detail": (
                        f"Scene runs {duration:.1f}s and needs at least {required_beats} motion beats "
                        "in its contract so the visual stays alive through narration."
                    ),
                    "motion_beats": len(motion_beats) if isinstance(motion_beats, list) else 0,
                    "required_beats": required_beats,
                })

        surface = _scene_surface_text(scene)
        if "raw text layer" in forbidden and '"type": "text"' in surface:
            issues.append({
                "severity": "error",
                "scene_id": scene_id,
                "issue": "scene_contract_forbidden_raw_text_layer",
                "detail": "Scene contract forbids raw text layers, but the SCF contains a text layer.",
            })
        if "generic ai image" in forbidden and '"type": "image"' in surface and not scene_components:
            issues.append({
                "severity": "error",
                "scene_id": scene_id,
                "issue": "scene_contract_forbidden_generic_image",
                "detail": "Scene contract forbids generic image fallback, but the SCF uses image layers without a component.",
            })

    return issues


def validate_reusable_footage_ratio(scf: dict, scf_dir: str,
                                     min_ratio: float = 0.60) -> list[dict]:
    """Flag low utilization of existing footage in `output/`.

    Walks every video layer in every scene and computes the ratio of
    runtime sourced from `output/` (the reusable showcase library) vs.
    runtime sourced from `assets/` (newly generated). For most product
    showcases we want ≥60% reuse; falling below that almost always means
    we regenerated something we already had.
    """
    total_video_runtime = 0.0
    reusable_video_runtime = 0.0
    scene_dir = Path(scf_dir) if scf_dir else None

    for scene in scf.get("scenes", []):
        try:
            scene_dur = float(scene.get("duration") or 0)
        except Exception:
            scene_dur = 0.0
        for layer in scene.get("layers") or []:
            if layer.get("type") != "video":
                continue
            src = layer.get("src") or ""
            if not src:
                continue
            try:
                start = float(layer.get("startTime") or 0)
            except Exception:
                start = 0.0
            try:
                end = float(layer.get("endTime") or scene_dur)
            except Exception:
                end = scene_dur
            layer_dur = max(0.0, end - start)
            total_video_runtime += layer_dur

            normalized = src.replace("\\", "/").lower()
            from_output = (
                normalized.startswith("output/")
                or normalized.startswith("../output/")
                or "/output/" in normalized
            )
            if from_output:
                reusable_video_runtime += layer_dur

    if total_video_runtime <= 0:
        return []

    ratio = reusable_video_runtime / total_video_runtime
    if ratio >= min_ratio:
        return []

    return [{
        "severity": "error" if ratio < (min_ratio * 0.5) else "warning",
        "scene_id": "global",
        "issue": "reusable_footage_underutilized",
        "detail": (
            f"Only {ratio:.0%} of video runtime sources existing footage "
            f"from `output/`; target is {min_ratio:.0%}. Reusable showcases "
            "(Outlook, Teams, VS Code, Excel, PPT, Edge, GitHub clips) "
            "should carry the body of any product video — re-check the "
            "asset library before generating new clips."
        ),
        "ratio": round(ratio, 3),
        "reusable_seconds": round(reusable_video_runtime, 2),
        "total_seconds": round(total_video_runtime, 2),
    }]


def validate_no_text_on_image_layers(scf: dict) -> list[dict]:
    """Flag the 'ugly text on background image' anti-pattern.

    A scene that places a top-level `text` layer over a top-level
    `image` (or `video`) layer without going through a designed
    component (LowerThird, TitleCard, AnimatedCaption, Callout, etc.)
    almost always renders as raw system-font text floating on a photo —
    the exact failure mode the user flagged in v3 ("ugly fonts laid on
    top of an image").
    """
    issues = []
    safe_components_for_text = {
        "TitleCard", "LowerThird", "AnimatedCaption", "BrandIntro",
        "BrandOutro", "Callout", "QuoteCard", "PullQuote",
    }
    for scene in scf.get("scenes", []):
        # Component scenes are exempt — the component owns its typography.
        if scene.get("component"):
            continue
        layers = scene.get("layers") or []
        has_text_layer = any(
            (layer.get("type") or "").lower() == "text"
            for layer in layers
        )
        has_image_or_video = any(
            (layer.get("type") or "").lower() in ("image", "video")
            for layer in layers
        )
        if has_text_layer and has_image_or_video:
            issues.append({
                "severity": "error",
                "scene_id": _scene_id(scene),
                "issue": "text_on_image_anti_pattern",
                "detail": (
                    "Scene combines a raw text layer with an image or "
                    "video layer, which renders as bare typography over "
                    "background art. Use a component instead "
                    f"({', '.join(sorted(safe_components_for_text))}) "
                    "or move the text into a Callout/LowerThird/TitleCard "
                    "with proper styling."
                ),
            })
    return issues


def validate_scf_pre_render(scf: dict, scf_dir: str, profile: str | None = None) -> dict:
    """Run all pre-compose validations and return a structured report.

    Returns:
        {
            "passed": bool,
            "narration_overflows": [...],
            "video_layer_issues": [...],
            "missing_assets": [...],
            "summary": str,
        }
    """
    profile = normalize_quality_profile(profile)

    narration_issues = validate_narration_fit(scf, scf_dir)
    video_issues = validate_video_layers(scf, scf_dir)
    missing = validate_missing_assets(scf, scf_dir)
    component_regressions = validate_component_regression(scf)
    slideshow_warnings = validate_slideshow_drift(scf)
    caption_issues = validate_captions_required(scf)
    visual_hold_issues = validate_visual_hold_duration(scf)
    visual_support_issues = validate_narration_visual_support(scf)
    precise_video_language_issues = validate_precise_video_language(scf)
    bridge_component_issues = validate_bridge_component_usage(scf)
    narration_text_issues = validate_narration_text_quality(scf)
    narration_text_present_issues = validate_narration_text_present(scf)
    component_prop_contract_issues = validate_component_prop_contracts(scf, scf_dir=scf_dir)
    scene_contract_issues = validate_scene_contracts(scf, scf_dir=scf_dir)
    reusable_footage_issues = validate_reusable_footage_ratio(scf, scf_dir)
    text_on_image_issues = validate_no_text_on_image_layers(scf)

    issue_groups = {
        "narration_overflows": narration_issues,
        "video_layer_issues": video_issues,
        "missing_assets": missing,
        "component_regressions": component_regressions,
        "slideshow_warnings": slideshow_warnings,
        "caption_issues": caption_issues,
        "visual_hold_issues": visual_hold_issues,
        "visual_support_issues": visual_support_issues,
        "precise_video_language_issues": precise_video_language_issues,
        "bridge_component_issues": bridge_component_issues,
        "narration_text_issues": narration_text_issues,
        "narration_text_present_issues": narration_text_present_issues,
        "component_prop_contract_issues": component_prop_contract_issues,
        "scene_contract_issues": scene_contract_issues,
        "reusable_footage_issues": reusable_footage_issues,
        "text_on_image_issues": text_on_image_issues,
    }
    blocking_issue_details, review_issue_details = _annotate_profile_issues(issue_groups, profile)
    passed = len(blocking_issue_details) == 0

    parts = []
    if narration_issues:
        parts.append(f"{len(narration_issues)} narration overflow(s)")
    if video_issues:
        parts.append(f"{len(video_issues)} video layer issue(s)")
    if missing:
        parts.append(f"{len(missing)} missing asset(s)")
    if component_regressions:
        parts.append(f"{len(component_regressions)} component regression(s)")
    if slideshow_warnings:
        parts.append(f"{len(slideshow_warnings)} slideshow warning(s)")
    if caption_issues:
        parts.append(f"{len(caption_issues)} caption issue(s)")
    if visual_hold_issues:
        parts.append(f"{len(visual_hold_issues)} long visual hold(s)")
    if visual_support_issues:
        parts.append(f"{len(visual_support_issues)} unsupported narration visual(s)")
    if precise_video_language_issues:
        parts.append(f"{len(precise_video_language_issues)} precise-video-language warning(s)")
    if bridge_component_issues:
        parts.append(f"{len(bridge_component_issues)} bridge-component issue(s)")
    if narration_text_issues:
        parts.append(f"{len(narration_text_issues)} narration text issue(s)")
    if narration_text_present_issues:
        parts.append(f"{len(narration_text_present_issues)} scene(s) missing narrationText")
    if component_prop_contract_issues:
        parts.append(f"{len(component_prop_contract_issues)} component prop-contract warning(s)")
    if scene_contract_issues:
        parts.append(f"{len(scene_contract_issues)} scene-contract issue(s)")
    if reusable_footage_issues:
        parts.append(f"{len(reusable_footage_issues)} reusable-footage warning(s)")
    if text_on_image_issues:
        parts.append(f"{len(text_on_image_issues)} text-on-image scene(s)")

    if not parts:
        summary = f"All pre-render checks passed for {profile} profile."
    elif passed:
        summary = f"Pre-render passed for {profile} profile with review issues: {', '.join(parts)}"
    else:
        blocking_categories = []
        for category in sorted({issue["category"] for issue in blocking_issue_details}):
            blocking_categories.append(f"{sum(1 for issue in blocking_issue_details if issue['category'] == category)} {category.replace('_', ' ')}")
        summary = f"Pre-render blockers for {profile} profile: {', '.join(blocking_categories)}"

    return {
        "profile": profile,
        "passed": passed,
        "blocking_issue_count": len(blocking_issue_details),
        "review_issue_count": len(review_issue_details),
        "blocking_issues": blocking_issue_details,
        "review_issues": review_issue_details,
        "narration_overflows": narration_issues,
        "video_layer_issues": video_issues,
        "missing_assets": missing,
        "component_regressions": component_regressions,
        "slideshow_warnings": slideshow_warnings,
        "caption_issues": caption_issues,
        "visual_hold_issues": visual_hold_issues,
        "visual_support_issues": visual_support_issues,
        "precise_video_language_issues": precise_video_language_issues,
        "bridge_component_issues": bridge_component_issues,
        "narration_text_issues": narration_text_issues,
        "narration_text_present_issues": narration_text_present_issues,
        "component_prop_contract_issues": component_prop_contract_issues,
        "scene_contract_issues": scene_contract_issues,
        "reusable_footage_issues": reusable_footage_issues,
        "text_on_image_issues": text_on_image_issues,
        "summary": summary,
    }


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Validate an SCF before rendering.")
    parser.add_argument("scf_file", help="Path to composition.scf.json")
    parser.add_argument(
        "--profile",
        choices=sorted(QUALITY_PROFILES),
        default=DEFAULT_VALIDATION_PROFILE,
        help="Validation strictness. guided is the default authoring profile; publish/ci are stricter.",
    )
    parser.add_argument(
        "--repair",
        action="store_true",
        help="Print safe auto-repair suggestions and validate the repaired SCF in memory.",
    )
    args = parser.parse_args()

    scf_path = args.scf_file
    with open(scf_path, encoding="utf-8") as f:
        scf = json.load(f)

    repairs = []
    if args.repair:
        scf, repairs = repair_scf_for_profile(scf, args.profile)

    scf_dir = str(Path(scf_path).parent)
    report = validate_scf_pre_render(scf, scf_dir, profile=args.profile)

    print(f"\n{'='*50}")
    print(f"  SCF Pre-Render Validation ({report['profile']}): {'PASS' if report['passed'] else 'FAIL'}")
    print(f"{'='*50}")

    if repairs:
        print("\n  Safe repairs applied in-memory:")
        for repair in repairs:
            print(f"    - {repair['detail']}")

    if report["narration_overflows"]:
        print("\n  Narration overflows:")
        for o in report["narration_overflows"]:
            if o.get("error"):
                print(f"    ❌ {o['scene_id']}: {o['error']}")
            else:
                print(f"    ⚠ {o['scene_id']}: {o['audio_duration']}s audio > {o['scene_duration']}s scene (+{o['overflow_sec']}s)")

    if report["video_layer_issues"]:
        print("\n  Video layer issues:")
        for v in report["video_layer_issues"]:
            print(f"    ⚠ {v['scene_id']}: {v['detail']}")

    if report["missing_assets"]:
        print("\n  Missing assets:")
        for m in report["missing_assets"]:
            print(f"    ❌ {m['scene_id']}: {m['type']} — {m['asset']}")

    if report["component_regressions"]:
        print("\n  Component regressions:")
        for issue in report["component_regressions"]:
            print(f"    ❌ {issue['scene_id']}: {issue['detail']}")

    if report["slideshow_warnings"]:
        print("\n  Slideshow drift warnings:")
        for issue in report["slideshow_warnings"]:
            print(f"    ⚠ {issue['scene_id']}: {issue['detail']}")

    for key, label in (
        ("caption_issues", "Caption issues"),
        ("visual_hold_issues", "Long visual holds"),
        ("visual_support_issues", "Unsupported narration visuals"),
        ("precise_video_language_issues", "Precise video language warnings"),
        ("bridge_component_issues", "Bridge component issues"),
        ("narration_text_issues", "Narration text issues"),
        ("component_prop_contract_issues", "Component prop-contract warnings"),
        ("scene_contract_issues", "Scene contract issues"),
    ):
        if report[key]:
            print(f"\n  {label}:")
            for issue in report[key]:
                icon = "❌" if issue.get("severity") == "error" else "⚠"
                print(f"    {icon} {issue['scene_id']}: {issue['detail']}")

    print()
    sys.exit(0 if report["passed"] else 1)
