from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

from scripts.quality_eval import analyze_frame, classify_frozen_sections, theme_sameness_summary, visual_design_summary, _score_packet


def test_analyze_frame_marks_flat_frame_blank(tmp_path: Path):
    image_path = tmp_path / "flat.png"
    Image.new("RGB", (320, 180), "#d1d5db").save(image_path)

    result = analyze_frame(image_path)

    assert result["blank"] is True


def test_analyze_frame_keeps_dark_frame_with_text_contentful(tmp_path: Path):
    image_path = tmp_path / "title.png"
    image = Image.new("RGB", (320, 180), "#020617")
    draw = ImageDraw.Draw(image)
    draw.rectangle((60, 70, 260, 112), fill="#f8fafc")
    image.save(image_path)

    result = analyze_frame(image_path)

    assert result["blank"] is False
    assert result["edge_mean"] > 1


def test_theme_sameness_warns_before_failure_threshold(tmp_path: Path):
    blue_frame = tmp_path / "blue.png"
    warm_frame = tmp_path / "warm.png"
    Image.new("RGB", (320, 180), "#020617").save(blue_frame)
    Image.new("RGB", (320, 180), "#251C17").save(warm_frame)

    frames = [
        {"exists": True, "analysis": analyze_frame(blue_frame)},
        {"exists": True, "analysis": analyze_frame(blue_frame)},
        {"exists": True, "analysis": analyze_frame(warm_frame)},
        {"exists": True, "analysis": analyze_frame(warm_frame)},
    ]

    summary = theme_sameness_summary(frames)

    assert summary["dark_blue_ratio"] == 0.5
    assert summary["warning"] is not None
    assert summary["hard_failure"] is None


def test_theme_sameness_fails_when_most_frames_are_dark_blue(tmp_path: Path):
    blue_frame = tmp_path / "blue.png"
    warm_frame = tmp_path / "warm.png"
    Image.new("RGB", (320, 180), "#020617").save(blue_frame)
    Image.new("RGB", (320, 180), "#251C17").save(warm_frame)

    frames = [
        {"exists": True, "analysis": analyze_frame(blue_frame)},
        {"exists": True, "analysis": analyze_frame(blue_frame)},
        {"exists": True, "analysis": analyze_frame(warm_frame)},
    ]

    summary = theme_sameness_summary(frames)

    assert summary["dark_blue_ratio"] >= 0.65
    assert summary["warning"] is None
    assert summary["hard_failure"] is not None


def test_theme_sameness_can_be_explicitly_allowed(tmp_path: Path):
    blue_frame = tmp_path / "blue.png"
    Image.new("RGB", (320, 180), "#020617").save(blue_frame)

    frames = [{"exists": True, "analysis": analyze_frame(blue_frame)}]

    summary = theme_sameness_summary(frames, allow_dark_blue=True)

    assert summary["dark_blue_ratio"] == 1.0
    assert summary["warning"] is None
    assert summary["hard_failure"] is None


def test_classify_frozen_sections_marks_component_hold_as_motion_review_only():
    scf = {
        "scenes": [
            {"id": "title", "duration": 5, "component": "TitleCard", "props": {}}
        ]
    }

    summary = classify_frozen_sections(scf, [{"start_sec": 0.7, "end_sec": 4.6, "duration_sec": 3.9}])

    assert summary["video_freezes"] == []
    assert summary["long_static_holds"]
    assert summary["sections"][0]["classification"] == "component_static_hold"
    assert summary["hard_failures"] == []
    assert summary["warnings"][0].startswith("STATIC_VISUAL_HOLD:")


def test_classify_frozen_sections_marks_video_layer_freeze_as_blocker():
    scf = {
        "scenes": [
            {"id": "clip", "duration": 5, "layers": [{"type": "video", "src": "clip.mp4"}]}
        ]
    }

    summary = classify_frozen_sections(scf, [{"start_sec": 1.0, "end_sec": 3.0, "duration_sec": 2.0}])

    assert summary["video_freezes"]
    assert summary["sections"][0]["classification"] == "video_freeze"
    assert summary["hard_failures"][0].startswith("VIDEO_FREEZE:")


def test_score_packet_replaces_raw_frozen_warning_with_classified_static_hold():
    freeze_classification = {
        "hard_failures": [],
        "warnings": ["STATIC_VISUAL_HOLD: 1 non-video hold section(s) in title run 3.9s total; review motion beats"],
    }

    score = _score_packet(
        {"passed": True},
        {"issues": ["FROZEN_FRAMES: 1 sections (3.9s total)"]},
        [],
        {"warning": None, "hard_failure": None},
        freeze_classification,
    )

    assert score["verdict"] == "PASS_WITH_REVIEW"
    assert score["warnings"] == freeze_classification["warnings"]


def test_score_packet_fails_classified_video_freeze():
    freeze_classification = {
        "hard_failures": ["VIDEO_FREEZE: 1 authored video-layer section(s) freeze for 2.0s total"],
        "warnings": [],
    }

    score = _score_packet(
        {"passed": True},
        {"issues": ["FROZEN_FRAMES: 1 sections (2.0s total)"]},
        [],
        {"warning": None, "hard_failure": None},
        freeze_classification,
    )

    assert score["verdict"] == "FAIL_TO_RENDER"
    assert score["hard_failures"] == freeze_classification["hard_failures"]


def test_score_packet_marks_publish_gate_as_not_publish_ready():
    score = _score_packet(
        {
            "passed": False,
            "summary": "Pre-render blockers for publish profile: 1 caption issues",
            "blocking_issues": [{"category": "caption_issues", "issue": "captions_required"}],
            "review_issues": [],
        },
        {"issues": []},
        [],
        {"warning": None, "hard_failure": None},
        {"hard_failures": [], "warnings": []},
        profile="publish",
    )

    assert score["verdict"] == "FAIL_TO_PUBLISH"
    assert score["render_failures"] == []
    assert score["publish_failures"]


def test_score_packet_keeps_guided_review_issues_as_warnings():
    score = _score_packet(
        {
            "passed": True,
            "review_issues": [{"detail": "Narrated videos should include visible captions."}],
        },
        {"issues": []},
        [],
        {"warning": None, "hard_failure": None},
        {"hard_failures": [], "warnings": []},
        profile="guided",
    )

    assert score["verdict"] == "PASS_WITH_REVIEW"
    assert score["warnings"] == ["Narrated videos should include visible captions."]


def test_visual_design_summary_flags_tiny_structured_visual(tmp_path: Path):
    image_path = tmp_path / "tiny-flow.png"
    image = Image.new("RGB", (640, 960), "#f7e7e9")
    draw = ImageDraw.Draw(image)
    y = 540
    for x in (160, 280, 400):
        draw.rectangle((x, y, x + 48, y + 30), fill="#d1d5db")
        draw.line((x + 48, y + 15, x + 72, y + 15), fill="#22c55e", width=2)
    image.save(image_path)

    frame = {
        "scene_id": "workflow",
        "component": "DataFlow",
        "timestamp_sec": 2.0,
        "exists": True,
        "analysis": analyze_frame(image_path),
    }

    summary = visual_design_summary([frame])

    assert summary["issues"]
    assert summary["issues"][0]["issue"] == "primary_visual_too_small"
    assert summary["hard_failures"]


def test_visual_design_summary_flags_narrow_dataflow(tmp_path: Path):
    image_path = tmp_path / "narrow-flow.png"
    image = Image.new("RGB", (640, 960), "#f7e7e9")
    draw = ImageDraw.Draw(image)
    for y in (300, 430, 560, 690):
        draw.rectangle((260, y, 380, y + 70), fill="#ffffff", outline="#d7dee9")
    image.save(image_path)

    frame = {
        "scene_id": "workflow",
        "component": "DataFlow",
        "timestamp_sec": 2.0,
        "exists": True,
        "analysis": analyze_frame(image_path),
    }

    summary = visual_design_summary([frame])

    assert any(issue["issue"] == "primary_visual_too_narrow" for issue in summary["issues"])


def test_visual_design_summary_flags_content_touching_edge(tmp_path: Path):
    image_path = tmp_path / "overflow.png"
    image = Image.new("RGB", (640, 360), "#fff1f2")
    draw = ImageDraw.Draw(image)
    draw.rectangle((80, 100, 635, 220), fill="#ffffff", outline="#f3bbc5")
    draw.text((590, 145), "overflow", fill="#24111a")
    draw.rectangle((628, 150, 639, 174), fill="#24111a")
    image.save(image_path)

    frame = {
        "scene_id": "metrics",
        "component": "MetricStack",
        "timestamp_sec": 2.0,
        "exists": True,
        "analysis": analyze_frame(image_path),
    }

    summary = visual_design_summary([frame])

    assert any(issue["issue"] == "content_touches_frame_edge" for issue in summary["issues"])


def test_visual_design_summary_flags_muddy_neutral_on_light_warm_background(tmp_path: Path):
    image_path = tmp_path / "muddy.png"
    image = Image.new("RGB", (640, 360), "#f6e3e5")
    draw = ImageDraw.Draw(image)
    draw.rectangle((120, 95, 520, 275), fill="#8b8d94")
    image.save(image_path)

    frame = {
        "scene_id": "metrics",
        "component": "MetricStack",
        "timestamp_sec": 2.0,
        "exists": True,
        "analysis": analyze_frame(image_path),
    }

    summary = visual_design_summary([frame])

    assert any(issue["issue"] == "muddy_neutral_on_light_background" for issue in summary["issues"])
    assert summary["warnings"]


def test_score_packet_blocks_severe_visual_design_issue_in_publish():
    visual_design = {
        "hard_failures": ["Primary visual in scene workflow occupies only 4% of the sampled frame."],
        "warnings": [],
    }

    score = _score_packet(
        {"passed": True, "review_issues": []},
        {"issues": []},
        [],
        {"warning": None, "hard_failure": None},
        {"hard_failures": [], "warnings": []},
        visual_design,
        profile="publish",
    )

    assert score["verdict"] == "FAIL_TO_PUBLISH"
    assert score["publish_failures"] == visual_design["hard_failures"]


def test_score_packet_warns_severe_visual_design_issue_in_guided():
    visual_design = {
        "hard_failures": ["Primary visual in scene workflow occupies only 4% of the sampled frame."],
        "warnings": [],
    }

    score = _score_packet(
        {"passed": True, "review_issues": []},
        {"issues": []},
        [],
        {"warning": None, "hard_failure": None},
        {"hard_failures": [], "warnings": []},
        visual_design,
        profile="guided",
    )

    assert score["verdict"] == "PASS_WITH_REVIEW"
    assert score["publish_failures"] == []
    assert score["warnings"] == visual_design["hard_failures"]
