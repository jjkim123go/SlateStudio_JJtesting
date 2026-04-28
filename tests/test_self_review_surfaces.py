import sys
import types
import json
from types import SimpleNamespace


def _stub_module(name: str, attrs: dict) -> None:
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules.setdefault(name, module)


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
_STUB_VIDEO_TYPE_VOICES = {
    "explainer": ["narrator-female", "narrator-male"],
    "corporate": ["narrator-female", "professional-male"],
    "tutorial": ["friendly-female", "narrator-female"],
    "marketing": ["friendly-female", "friendly-male"],
    "internal": ["narrator-male", "narrator-female"],
    "onboarding": ["friendly-female", "narrator-female"],
}

def _stub_select_voice(video_type=None, scene_index=0, override=None):
    if override:
        return override
    voices = _STUB_VIDEO_TYPE_VOICES.get(video_type or "explainer",
             _STUB_VIDEO_TYPE_VOICES["explainer"])
    return voices[scene_index % len(voices)]

_stub_module(
    "tts_gen",
    {
        "generate_tts": lambda *args, **kwargs: None,
        "estimate_speech_duration": lambda *args, **kwargs: 0.0,
        "select_voice_for_scene": _stub_select_voice,
        "VIDEO_TYPE_VOICES": _STUB_VIDEO_TYPE_VOICES,
        "VOICES": {
            "professional-female": "coral",
            "professional-male": "echo",
            "friendly-female": "shimmer",
            "friendly-male": "onyx",
            "narrator-female": "nova",
            "narrator-male": "fable",
        },
        "DEFAULT_VOICE": "narrator-female",
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
        "transcribe_audio": lambda *args, **kwargs: None,
        "estimate_word_timestamps": lambda *args, **kwargs: [],
        "group_into_segments": lambda *args, **kwargs: [],
        "create_scene_video_with_subtitles": lambda *args, **kwargs: None,
    },
)

from pathlib import Path

from scripts import slate_render
from scripts.slate_render import _run_review_stage, _self_review


def test_self_review_blocks_empty_synthetic_surface_contracts():
    result = _self_review(
        trace_path=None,
        total_duration=10.0,
        target_duration=10.0,
        scene_count=5,
        brand_name=None,
        video_path=None,
        scenes=[{"id": "blank-vscode", "component": "VSCodeScene", "props": {}}],
        deep_review=False,
    )

    assert result["scores"]["visual_consistency"] == 1
    assert any("missing a renderable body contract" in warning for warning in result["warnings"])


def test_self_review_warns_on_legacy_compatibility_path():
    result = _self_review(
        trace_path=None,
        total_duration=10.0,
        target_duration=10.0,
        scene_count=5,
        brand_name=None,
        video_path=None,
        scenes=[
            {
                "id": "legacy-github",
                "component": "GitHubScene",
                "props": {"stepsHtml": '<div class="gh-step" data-kind="review"></div>'},
            }
        ],
        deep_review=False,
    )

    assert result["scores"]["visual_consistency"] == 2
    assert any("legacy compatibility path" in warning for warning in result["warnings"])


def test_self_review_blocks_missing_captions_for_narrated_video():
    result = _self_review(
        trace_path=None,
        total_duration=4.0,
        target_duration=4.0,
        scene_count=1,
        brand_name=None,
        video_path=None,
        scenes=[{"id": "narrated", "duration": 4, "component": "MetricStack"}],
        narration_texts=["The metric improves over time."],
        captions={"style": "none"},
        deep_review=False,
    )

    assert result["verdict"] == "FAIL"
    assert result["scores"]["caption_accuracy"] == 1
    assert any("Narrated videos must include visible captions" in warning for warning in result["warnings"])


def test_self_review_blocks_long_static_visual_hold():
    result = _self_review(
        trace_path=None,
        total_duration=12.0,
        target_duration=12.0,
        scene_count=1,
        brand_name=None,
        video_path=None,
        scenes=[{"id": "static", "duration": 12, "component": "TitleCard", "props": {"title": "Static"}}],
        narration_texts=["Slate writes the script and prepares the scene plan."],
        captions={"style": "word-highlight"},
        deep_review=False,
    )

    assert result["verdict"] == "FAIL"
    assert result["scores"]["visual_consistency"] == 1
    assert any("no visual holds longer than" in warning for warning in result["warnings"])


def test_review_stage_writes_report_and_blocks_failed_review(tmp_path: Path):
    self_review = {
        "verdict": "FAIL",
        "scores": {
            "brand_compliance": 2,
            "caption_accuracy": 2,
            "audio_quality": 2,
            "visual_consistency": 1,
            "pacing": 2,
            "content_accuracy": 3,
            "content_coverage": 2,
            "content_redundancy": 3,
        },
        "total": 17,
        "max_total": 24,
        "warnings": ["Synthetic surface blank-vscode is missing a renderable body contract"],
        "fixes_needed": [{"dimension": "visual_consistency", "action": "fix_frozen_frames"}],
    }

    review = _run_review_stage(
        output_dir=tmp_path,
        self_review=self_review,
        video_path="output/final_video.mp4",
        scf_path="output/composition.json",
        title="Test Review",
    )

    assert Path(review["review_report_path"]).exists()
    assert Path(review["review_markdown_path"]).exists()
    assert Path(review["review_context_path"]).exists()
    assert review["report"]["passed"] is False
    assert review["report"]["review_type"] == "final"

    review_context = json.loads(Path(review["review_context_path"]).read_text(encoding="utf-8"))
    required_paths = review_context["required_skill_paths"]
    assert "skills/meta/reviewer-operating-model.md" in required_paths
    assert "skills/meta/review-evidence-collection.md" in required_paths
    assert "skills/meta/review-blocker-taxonomy.md" in required_paths
    assert all(skill["loaded"] for skill in review_context["skill_bundle"]["loaded_skills"])
    assert review_context["agent_action_contract"]["instruction"].startswith("Validate review findings")


def test_self_review_fails_on_video_indexer_scene_collapse(monkeypatch):
    class FakeVideoIndexer:
        is_available = True

        async def execute(self, video_path: str):
            return SimpleNamespace(
                success=True,
                output={
                    "ocr_texts": [],
                    "transcript_lines": [],
                    "scenes": [{"start_sec": 0.0, "end_sec": 24.0}],
                    "audio_effects": [],
                    "moderation": {},
                },
            )

    monkeypatch.setattr(slate_render, "_vi_available", True)
    monkeypatch.setattr(slate_render, "VideoIndexer", FakeVideoIndexer)
    monkeypatch.setattr(slate_render, "_inspect_available", False)

    result = _self_review(
        trace_path=None,
        total_duration=24.5,
        target_duration=24.5,
        scene_count=3,
        brand_name=None,
        video_path="output/opus47-run3-aurora/aurora.mp4",
        deep_review=True,
        scenes=[
            {"id": "s1", "narration": "Meet Aurora Assist."},
            {"id": "s2", "narration": "It watches your facilities every minute."},
            {"id": "s3", "narration": "Aurora explains every recommendation in plain language."},
        ],
        narration_texts=[
            "Meet Aurora Assist.",
            "It watches your facilities every minute.",
            "Aurora explains every recommendation in plain language.",
        ],
    )

    assert result["verdict"] == "FAIL"
    assert result["scores"]["visual_consistency"] == 2
    assert result["scores"]["caption_accuracy"] == 1
    assert any("scene drift" in warning for warning in result["warnings"])