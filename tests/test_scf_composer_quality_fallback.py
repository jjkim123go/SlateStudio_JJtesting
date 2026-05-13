from __future__ import annotations

from slate.core.scf_composer import AssetManifest, SCFComposer


def test_default_scene_uses_slide_renderer_not_raw_text_layers():
    scenario = {
        "title": "Quality UX",
        "company": "Slate",
        "scenes": [
            {
                "id": "workflow-risk",
                "title": "Risk appears in review",
                "narration": "The reviewer sees the downstream impact before merge.",
                "bullet_points": ["Contract changed", "Owners found", "Reviewers added"],
                "duration": 8,
            }
        ],
    }
    assets = AssetManifest(scene_images={"workflow-risk": "assets/workflow.png"})

    scf = SCFComposer().from_scenario(scenario, assets)
    scene = next(item for item in scf["scenes"] if item["id"] == "workflow-risk")

    assert scene["component"] == "SlideRenderer"
    assert "layers" not in scene
    assert scene["props"]["layout"] == "title-bullets-image"
    assert scene["narrationText"] == "The reviewer sees the downstream impact before merge."
    assert scf["metadata"]["source_components"]["workflow-risk"] == "SlideRenderer"


def test_quality_first_metadata_and_scene_contracts_are_preserved():
    scenario = {
        "title": "Quality UX",
        "quality_first": True,
        "scene_contracts": {
            "workflow-risk": {
                "narrativePurpose": "Show review awareness.",
                "visualTreatment": "Designed slide fallback.",
                "primaryComponent": "SlideRenderer",
                "motionBeats": ["headline", "bullet one"],
            }
        },
        "scenes": [{"id": "workflow-risk", "title": "Risk", "duration": 5}],
    }

    scf = SCFComposer().from_scenario(scenario)

    assert scf["metadata"]["qualityFirst"] is True
    assert "workflow-risk" in scf["metadata"]["sceneContracts"]
