from __future__ import annotations

from scripts.lib.scf_validate import (
    validate_captions_required,
    validate_component_regression,
    validate_narration_text_quality,
    validate_narration_visual_support,
    validate_precise_video_language,
    validate_slideshow_drift,
    validate_visual_hold_duration,
)


def test_component_regression_uses_metadata():
    scf = {
        "metadata": {"source_components": {"s1": "ArchitectureDiagram"}},
        "scenes": [{"id": "s1", "duration": 5, "layers": [{"type": "image", "src": "x.png"}]}],
    }

    issues = validate_component_regression(scf)

    assert issues
    assert issues[0]["severity"] == "error"
    assert issues[0]["issue"] == "component_regression"


def test_component_regression_passes_when_preserved():
    scf = {
        "metadata": {"source_components": {"s1": "ArchitectureDiagram"}},
        "scenes": [{"id": "s1", "duration": 5, "component": "ArchitectureDiagram", "props": {}}],
    }

    assert validate_component_regression(scf) == []


def test_slideshow_drift_warns_on_consecutive_image_text_scenes():
    scf = {
        "scenes": [
            {"id": f"s{i}", "duration": 5, "layers": [{"type": "image", "src": "x.png"}, {"type": "text", "content": "Title"}]}
            for i in range(4)
        ]
    }

    issues = validate_slideshow_drift(scf, threshold=4)

    assert issues
    assert issues[0]["severity"] == "warning"


def test_captions_required_for_narrated_scf():
    scf = {"scenes": [{"id": "s1", "duration": 3, "narration": "assets/s1.wav"}]}

    issues = validate_captions_required(scf)

    assert issues
    assert issues[0]["issue"] == "captions_required"


def test_visual_hold_duration_blocks_long_static_scene():
    scf = {
        "scenes": [
            {"id": "s1", "duration": 12, "component": "TitleCard", "props": {"title": "One static card"}}
        ]
    }

    issues = validate_visual_hold_duration(scf)

    assert issues
    assert issues[0]["issue"] == "visual_hold_too_long"
    assert issues[0]["required_beats"] == 3


def test_visual_hold_duration_allows_sequenced_component():
    scf = {
        "scenes": [
            {
                "id": "s1",
                "duration": 12,
                "component": "VSCodeScene",
                "props": {"steps": ["type prompt", "copilot thinks", "files update"]},
            }
        ]
    }

    assert validate_visual_hold_duration(scf) == []


def test_narration_visual_support_blocks_unsupported_architecture_claim():
    scf = {
        "scenes": [
            {
                "id": "arch",
                "duration": 4,
                "narration": "The service architecture shows how requests flow through Slate.",
                "layers": [{"type": "image", "src": "blue-art.png"}],
            }
        ]
    }

    issues = validate_narration_visual_support(scf)

    assert issues
    assert issues[0]["issue"] == "architecture_visual_missing"


def test_narration_visual_support_accepts_architecture_component():
    scf = {
        "scenes": [
            {
                "id": "arch",
                "duration": 4,
                "narration": "The service architecture shows how requests flow through Slate.",
                "component": "ArchitectureDiagram",
                "props": {"nodes": ["Prompt", "SCF", "Render"], "arrows": [["Prompt", "SCF"]]},
            }
        ]
    }

    assert validate_narration_visual_support(scf) == []


def test_narration_text_quality_blocks_dot_dot_artifacts():
    scf = {"scenes": [{"id": "s1", "duration": 3, "narration": "Slate thinks dot dot then renders."}]}

    issues = validate_narration_text_quality(scf)

    assert issues
    assert issues[0]["issue"] == "narration_punctuation_artifact"


def test_precise_video_language_warns_on_cinematic_component_without_visual_spec():
    scf = {"scenes": [{"id": "bridge", "duration": 2, "component": "IrisZoom", "props": {}}]}

    issues = validate_precise_video_language(scf)

    assert issues
    assert issues[0]["severity"] == "warning"
    assert issues[0]["issue"] == "precise_video_language_missing"
    assert set(issues[0]["missing_aspects"]) == {"subject", "scene", "motion", "spatial", "camera"}


def test_precise_video_language_accepts_complete_visual_spec():
    scf = {
        "scenes": [
            {
                "id": "bridge",
                "duration": 2,
                "component": "IrisZoom",
                "props": {
                    "visualSpec": {
                        "subject": "current and next scene artwork",
                        "scene": "full-frame transition",
                        "motion": "iris closes and opens",
                        "spatial": "center focal point",
                        "camera": "iris-style transition",
                    }
                },
            }
        ]
    }

    assert validate_precise_video_language(scf) == []