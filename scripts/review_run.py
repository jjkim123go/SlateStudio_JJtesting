import argparse
import json
import subprocess
import sys
import time
import types
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "src"))
sys.path.insert(0, str(REPO_ROOT / "scripts"))
sys.path.insert(0, str(REPO_ROOT / "scripts" / "lib"))


def _stub_module(name: str, attrs: dict) -> None:
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules.setdefault(name, module)


# Standalone review only needs the review helpers, not the full generation stack.
_stub_module(
    "image_gen",
    {
        "generate_brand_intro": lambda *args, **kwargs: None,
        "generate_brand_outro": lambda *args, **kwargs: None,
        "generate_scene_image": lambda *args, **kwargs: None,
        "generate_ai_image": lambda *args, **kwargs: None,
        "generate_structured_image": lambda *args, **kwargs: None,
        "PALETTES": {},
    },
)
_stub_module(
    "tts_gen",
    {
        "generate_tts": lambda *args, **kwargs: None,
        "estimate_speech_duration": lambda *args, **kwargs: 0.0,
        "select_voice_for_scene": lambda *args, **kwargs: "",
        "VIDEO_TYPE_VOICES": {},
    },
)
_stub_module(
    "video_compose",
    {
        "create_scene_video": lambda *args, **kwargs: None,
        "create_clip_scene_video": lambda *args, **kwargs: None,
        "concatenate_videos": lambda *args, **kwargs: None,
        "burn_subtitles": lambda *args, **kwargs: None,
        "probe_video": lambda *args, **kwargs: {},
    },
)
_stub_module("video_gen", {"generate_video_clip": lambda *args, **kwargs: None})
_stub_module("subtitle_burner", {"burn_subtitle_on_image": lambda *args, **kwargs: None})
_stub_module(
    "live_subtitles",
    {
        "load_word_sidecar": lambda *args, **kwargs: None,
        "transcribe_audio": lambda *args, **kwargs: None,
        "estimate_word_timestamps": lambda *args, **kwargs: [],
        "group_into_segments": lambda *args, **kwargs: [],
        "create_scene_video_with_subtitles": lambda *args, **kwargs: None,
    },
)

from slate_render import _run_review_stage, _self_review


def _probe_duration_seconds(video_path: Path) -> float | None:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(video_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception:
        pass
    return None


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Standalone Slate reviewer for an existing rendered video.")
    parser.add_argument(
        "--video",
        default=str(REPO_ROOT / "output" / "omart-publisher-explainer" / "v1" / "omart-explainer.mp4"),
        help="Path to the rendered MP4",
    )
    parser.add_argument(
        "--scenario",
        default="",
        help="Path to the scenario JSON",
    )
    parser.add_argument(
        "--scf",
        default="",
        help="Path to the SCF JSON (used when no scenario JSON exists)",
    )
    parser.add_argument(
        "--trace",
        default=str(REPO_ROOT / "output" / "omart-publisher-explainer" / "v1" / "production_trace.json"),
        help="Path to the production trace JSON",
    )
    parser.add_argument(
        "--output-dir",
        default="",
        help="Directory to write review artifacts into (defaults to video parent)",
    )
    return parser


def _infer_companion_file(video_path: Path, patterns: list[str]) -> Path | None:
    for pattern in patterns:
        matches = sorted(video_path.parent.glob(pattern))
        if matches:
            return matches[0]
    return None


def _load_review_inputs(video_path: Path, scenario_arg: str, scf_arg: str) -> tuple[dict, str | None]:
    scenario_path = Path(scenario_arg) if scenario_arg else None
    scf_path = Path(scf_arg) if scf_arg else None

    if scenario_path and scenario_path.exists():
        scenario = json.loads(scenario_path.read_text(encoding="utf-8"))
        return scenario, None

    if scf_path is None or not scf_path.exists():
        scf_path = _infer_companion_file(video_path, ["*.scf.json", "*.json"])
        if scf_path and scf_path.name == "review_context.json":
            scf_path = None

    if not scf_path or not scf_path.exists():
        raise SystemExit(
            "No scenario JSON found and no SCF JSON available. Provide --scenario or --scf."
        )

    scf = json.loads(scf_path.read_text(encoding="utf-8"))
    scenario = {
        "title": scf.get("metadata", {}).get("title") or scf.get("title") or video_path.stem,
        "target_duration": sum(float(scene.get("duration", 0) or 0) for scene in scf.get("scenes", [])) or None,
        "motion_style": "image",
        "brand_package": scf.get("brandPackage"),
        "captions": scf.get("captions"),
        "scf_document": str(scf_path),
        "scenes": [],
    }

    has_video_layers = False
    has_image_layers = False
    has_component_layers = False

    def layer_components(layers: list[dict]) -> list[str]:
        return [
            str(layer.get("component"))
            for layer in layers
            if layer.get("type") == "component" and layer.get("component")
        ]

    for scene in scf.get("scenes", []):
        layers = scene.get("layers", [])
        components = layer_components(layers)
        if scene.get("component"):
            has_component_layers = True
        normalized = {
            "id": scene.get("id"),
            "title": scene.get("title") or scene.get("id"),
            "duration": scene.get("duration"),
            "component": scene.get("component") or (components[0] if len(components) == 1 else None),
            "components": ([scene.get("component")] if scene.get("component") else []) + components,
            "props": scene.get("props", {}),
            "layers": layers,
        }
        narration = scene.get("narration")
        if isinstance(narration, dict):
            normalized["narration"] = narration.get("text", "")
        elif isinstance(narration, str):
            normalized["narration"] = ""
        else:
            normalized["narration"] = ""
        for layer in layers:
            if layer.get("type") == "video":
                has_video_layers = True
            if layer.get("type") == "image":
                has_image_layers = True
            if layer.get("type") == "component":
                has_component_layers = True
        scenario["scenes"].append(normalized)

    if has_video_layers and has_image_layers:
        scenario["motion_style"] = "hybrid"
    elif has_video_layers and has_component_layers:
        scenario["motion_style"] = "hybrid"
    elif has_video_layers:
        scenario["motion_style"] = "motion"
    elif has_component_layers:
        scenario["motion_style"] = "image"

    return scenario, str(scf_path)


def main() -> int:
    args = _build_parser().parse_args()

    video_path = Path(args.video)
    trace_path = Path(args.trace)
    output_dir = Path(args.output_dir) if args.output_dir else video_path.parent

    if not video_path.exists():
        raise SystemExit(f"Video not found: {video_path}")

    scenario, inferred_scf_path = _load_review_inputs(video_path, args.scenario, args.scf)
    narrations = [scene.get("narration", "") for scene in scenario.get("scenes", []) if scene.get("narration")]
    total_duration = _probe_duration_seconds(video_path) or float(scenario.get("target_duration") or 0.0)

    t0 = time.time()
    self_review = _self_review(
        trace_path=str(trace_path) if trace_path.exists() else None,
        total_duration=total_duration,
        target_duration=float(scenario.get("target_duration") or 0.0) or None,
        scene_count=len(scenario.get("scenes", [])),
        brand_name=scenario.get("brand_package"),
        video_path=str(video_path),
        fallback_scenes=[],
        motion_style=scenario.get("motion_style"),
        scenes=scenario.get("scenes", []),
        narration_texts=narrations,
        captions=scenario.get("captions"),
    )
    explicit_review = _run_review_stage(
        output_dir=output_dir,
        self_review=self_review,
        video_path=str(video_path),
        scf_path=scenario.get("scf_document") or inferred_scf_path,
        brand_name=scenario.get("brand_package"),
        title=scenario.get("title"),
    )
    elapsed = time.time() - t0

    print("---SELF REVIEW---")
    print(json.dumps({
        "verdict": self_review["verdict"],
        "scores": self_review["scores"],
        "warnings": self_review["warnings"][:20],
    }, indent=2))
    print("---EXPLICIT REVIEW---")
    print(json.dumps({
        "passed": explicit_review["report"]["passed"],
        "total_score": explicit_review["report"]["total_score"],
        "max_score": explicit_review["report"]["max_score"],
        "review_report_path": explicit_review["review_report_path"],
        "review_markdown_path": explicit_review["review_markdown_path"],
        "review_context_path": explicit_review["review_context_path"],
    }, indent=2))
    print(f"---ELAPSED: {elapsed:.2f}s---")
    return 0 if explicit_review["report"].get("passed") else 1


if __name__ == "__main__":
    raise SystemExit(main())
