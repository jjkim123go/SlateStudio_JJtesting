from __future__ import annotations

from scripts.lib.scf_validate import (
    repair_scf_for_profile,
    validate_captions_required,
    validate_component_regression,
    validate_narration_text_quality,
    validate_narration_visual_support,
    validate_bridge_component_usage,
    validate_precise_video_language,
    validate_scene_contracts,
    validate_scf_pre_render,
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


def test_guided_profile_warns_but_does_not_block_missing_captions(tmp_path):
    scf = {"scenes": [{"id": "s1", "duration": 3, "narrationText": "A narrated draft scene."}]}

    report = validate_scf_pre_render(scf, str(tmp_path), profile="guided")

    assert report["passed"] is True
    assert report["blocking_issue_count"] == 0
    assert report["review_issue_count"] == 1
    assert report["caption_issues"][0]["issue"] == "captions_required"


def test_publish_profile_blocks_missing_captions(tmp_path):
    scf = {"scenes": [{"id": "s1", "duration": 3, "narrationText": "A narrated publish scene."}]}

    report = validate_scf_pre_render(scf, str(tmp_path), profile="publish")

    assert report["passed"] is False
    assert report["blocking_issue_count"] == 1
    assert report["blocking_issues"][0]["issue"] == "captions_required"


def test_repair_scf_for_profile_adds_default_captions():
    scf = {
        "outputProfile": {"width": 720, "height": 1280},
        "scenes": [{"id": "s1", "duration": 3, "narrationText": "A narrated vertical draft."}],
    }

    repaired, repairs = repair_scf_for_profile(scf, profile="guided")

    assert repairs[0]["issue"] == "captions_auto_added"
    assert repaired["captions"]["style"] == "word-highlight"
    assert repaired["captions"]["maxWordsPerLine"] == 5
    assert "captions" not in scf


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

def test_bridge_component_rejected_as_long_standalone_scene():
    scf = {
        "scenes": [
            {"id": "punch", "duration": 2.6, "component": "DepthZoomPunch", "props": {}}
        ]
    }

    issues = validate_bridge_component_usage(scf)

    assert issues
    assert issues[0]["issue"] == "bridge_component_used_as_scene"

def test_bridge_component_allowed_as_short_transition_beat():
    scf = {
        "scenes": [
            {"id": "punch", "duration": 1.0, "component": "DepthZoomPunch", "props": {}}
        ]
    }

    assert validate_bridge_component_usage(scf) == []

def test_scene_contracts_required_in_quality_first_mode():
    scf = {
        "metadata": {"qualityFirst": True},
        "scenes": [{"id": "s1", "duration": 5, "component": "DataFlow", "props": {}}],
    }

    issues = validate_scene_contracts(scf)

    assert issues
    assert issues[0]["issue"] == "scene_contract_missing"


def test_scene_contracts_block_component_mismatch_and_weak_motion_beats():
    scf = {
        "metadata": {
            "qualityFirst": True,
            "sceneContracts": {
                "s1": {
                    "narrativePurpose": "Show the pull request risk path.",
                    "visualTreatment": "Synthetic GitHub workflow.",
                    "primaryComponent": "GitHubScene",
                    "motionBeats": ["PR opens"],
                }
            },
        },
        "scenes": [{"id": "s1", "duration": 9, "component": "VSCodeScene", "props": {"steps": ["open file"]}}],
    }

    issues = validate_scene_contracts(scf)
    issue_names = {issue["issue"] for issue in issues}

    assert "scene_contract_component_mismatch" in issue_names
    assert "scene_contract_motion_beats_insufficient" in issue_names


def test_scene_contracts_accept_matching_component_and_motion_beats():
    scf = {
        "metadata": {
            "qualityFirst": True,
            "sceneContracts": {
                "s1": {
                    "narrativePurpose": "Show the pull request risk path.",
                    "visualTreatment": "Synthetic GitHub workflow.",
                    "primaryComponent": "GitHubScene",
                    "motionBeats": ["PR opens", "impact table appears", "reviewers added"],
                }
            },
        },
        "scenes": [{"id": "s1", "duration": 9, "component": "GitHubScene", "props": {"steps": ["open PR", "add reviewers"]}}],
    }

    assert validate_scene_contracts(scf) == []