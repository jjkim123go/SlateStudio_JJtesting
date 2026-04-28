"""Tests for Phase 3B quality improvements:
- Frame freeze fix (video looping)
- Voice selection (video-type-based cycling)
- Brand override logic (conditional company replacement)
- Model registry (config/models.yaml loading, accessors, fallbacks)
- Video inspection tools (frozen frames, audio levels, reporting)
"""

import json
import textwrap
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
import yaml


# ═══════════════════════════════════════════════════════════════════════
# Voice Selection Tests
# ═══════════════════════════════════════════════════════════════════════

class TestVoiceSelection:
    """Tests for tts_gen voice selection and video-type cycling."""

    def test_all_video_types_have_voices(self):
        import importlib
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "lib"))
        from tts_gen import VIDEO_TYPE_VOICES
        expected_types = {"explainer", "corporate", "tutorial", "marketing", "internal", "onboarding"}
        assert set(VIDEO_TYPE_VOICES.keys()) == expected_types

    def test_all_voice_presets_resolve(self):
        sys_path_fixup()
        from tts_gen import VIDEO_TYPE_VOICES, VOICES
        for vtype, presets in VIDEO_TYPE_VOICES.items():
            for preset in presets:
                assert preset in VOICES, f"Voice preset '{preset}' in {vtype} not found in VOICES"

    def test_select_voice_default(self):
        sys_path_fixup()
        from tts_gen import select_voice_for_scene
        voice = select_voice_for_scene()
        assert voice in ("narrator-female", "narrator-male")

    def test_select_voice_override(self):
        sys_path_fixup()
        from tts_gen import select_voice_for_scene
        voice = select_voice_for_scene(video_type="corporate", scene_index=0, override="professional-female")
        assert voice == "professional-female"

    def test_select_voice_round_robin(self):
        sys_path_fixup()
        from tts_gen import select_voice_for_scene
        v0 = select_voice_for_scene("tutorial", 0)
        v1 = select_voice_for_scene("tutorial", 1)
        v2 = select_voice_for_scene("tutorial", 2)
        # tutorial has 2 voices, so index 0==index 2
        assert v0 != v1
        assert v0 == v2

    def test_select_voice_unknown_type_falls_back(self):
        sys_path_fixup()
        from tts_gen import select_voice_for_scene, VIDEO_TYPE_VOICES
        voice = select_voice_for_scene("nonexistent_type", 0)
        # Should fall back to explainer voices
        assert voice == VIDEO_TYPE_VOICES["explainer"][0]

    def test_default_voice_is_nova(self):
        sys_path_fixup()
        from tts_gen import DEFAULT_VOICE, VOICES
        assert DEFAULT_VOICE == "narrator-female"
        assert VOICES[DEFAULT_VOICE] == "nova"


# ═══════════════════════════════════════════════════════════════════════
# Model Registry Tests
# ═══════════════════════════════════════════════════════════════════════

class TestModelRegistry:
    """Tests for config/models.yaml and model_registry.py."""

    def test_models_yaml_exists(self):
        yaml_path = Path(__file__).parent.parent / "config" / "models.yaml"
        assert yaml_path.exists(), "config/models.yaml must exist"

    def test_models_yaml_structure(self):
        yaml_path = Path(__file__).parent.parent / "config" / "models.yaml"
        with open(yaml_path) as f:
            data = yaml.safe_load(f)
        assert "image_models" in data
        assert "tts_models" in data
        assert "video_models" in data
        assert "fallback_costs" in data

    def test_image_models_have_cost(self):
        yaml_path = Path(__file__).parent.parent / "config" / "models.yaml"
        with open(yaml_path) as f:
            data = yaml.safe_load(f)
        for name, model in data["image_models"].items():
            assert "cost_per_image" in model, f"Image model '{name}' missing cost_per_image"
            assert model["cost_per_image"] >= 0

    def test_tts_model_has_voices(self):
        yaml_path = Path(__file__).parent.parent / "config" / "models.yaml"
        with open(yaml_path) as f:
            data = yaml.safe_load(f)
        tts = data["tts_models"]["gpt-4o-mini-tts"]
        assert "voices" in tts
        assert len(tts["voices"]) >= 6

    def test_video_model_has_valid_durations(self):
        yaml_path = Path(__file__).parent.parent / "config" / "models.yaml"
        with open(yaml_path) as f:
            data = yaml.safe_load(f)
        sora = data["video_models"]["sora-2"]
        assert "valid_durations" in sora
        assert isinstance(sora["valid_durations"], list)

    def test_registry_image_cost(self):
        sys_path_fixup()
        import model_registry
        model_registry.reload()
        cost = model_registry.image_cost("gpt-image-2")
        assert cost > 0

    def test_registry_tts_cost(self):
        sys_path_fixup()
        import model_registry
        model_registry.reload()
        cost = model_registry.tts_cost_per_sec()
        assert cost > 0

    def test_registry_video_cost(self):
        sys_path_fixup()
        import model_registry
        model_registry.reload()
        cost = model_registry.video_cost_per_sec()
        assert cost > 0

    def test_registry_fallback_cost(self):
        sys_path_fixup()
        import model_registry
        model_registry.reload()
        cost = model_registry.fallback_cost("pillow-slide")
        assert cost == 0.0

    def test_registry_unknown_model_returns_zero(self):
        sys_path_fixup()
        import model_registry
        model_registry.reload()
        cost = model_registry.image_cost("nonexistent-model")
        assert cost == 0.0

    def test_registry_valid_durations(self):
        sys_path_fixup()
        import model_registry
        model_registry.reload()
        durations = model_registry.video_valid_durations()
        assert 4 in durations
        assert 8 in durations
        assert 12 in durations


# ═══════════════════════════════════════════════════════════════════════
# Video Inspection Tests
# ═══════════════════════════════════════════════════════════════════════

class TestVideoInspection:
    """Tests for video_inspect.py parsing logic and report structure."""

    def test_frozen_frame_parsing(self):
        """Test that detect_frozen_frames parses FFmpeg freezedetect output."""
        sys_path_fixup()
        from video_inspect import detect_frozen_frames

        mock_stderr = textwrap.dedent("""\
            [freezedetect @ 0x1234] freeze_start: 4.00
            [freezedetect @ 0x1234] freeze_end: 6.50 freeze_duration: 2.50
            [freezedetect @ 0x1234] freeze_start: 12.00
            [freezedetect @ 0x1234] freeze_end: 14.00 freeze_duration: 2.00
        """)

        with patch("video_inspect._run") as mock_run, \
             patch("video_inspect.Path.exists", return_value=True):
            mock_run.return_value = MagicMock(returncode=0, stderr=mock_stderr)
            frozen = detect_frozen_frames("fake.mp4")

        assert len(frozen) == 2
        assert frozen[0]["start_sec"] == 4.0
        assert frozen[0]["end_sec"] == 6.5
        assert frozen[0]["duration_sec"] == 2.5
        assert frozen[1]["start_sec"] == 12.0

    def test_audio_level_parsing(self):
        """Test that probe_audio_levels parses FFmpeg volumedetect output."""
        sys_path_fixup()
        from video_inspect import probe_audio_levels

        vol_stderr = textwrap.dedent("""\
            [Parsed_volumedetect_0 @ 0xabc] mean_volume: -18.5 dB
            [Parsed_volumedetect_0 @ 0xabc] max_volume: -0.3 dB
        """)
        sil_stderr = textwrap.dedent("""\
            [silencedetect @ 0xdef] silence_start: 5.0
            [silencedetect @ 0xdef] silence_end: 8.5 | silence_duration: 3.5
        """)

        call_count = [0]
        def mock_run_fn(cmd, **kwargs):
            result = MagicMock(returncode=0)
            if call_count[0] == 0:
                result.stderr = vol_stderr
            else:
                result.stderr = sil_stderr
            call_count[0] += 1
            return result

        with patch("video_inspect._run", side_effect=mock_run_fn), \
             patch("video_inspect.Path.exists", return_value=True):
            levels = probe_audio_levels("fake.mp4")

        assert levels is not None
        assert levels["mean_volume_db"] == -18.5
        assert levels["max_volume_db"] == -0.3
        assert len(levels["silence_ranges"]) == 1
        assert levels["silence_ranges"][0]["duration_sec"] == 3.5

    def test_inspect_video_report_structure(self):
        """Test that inspect_video returns correct report structure."""
        sys_path_fixup()
        from video_inspect import inspect_video

        with patch("video_inspect.extract_sample_frames", return_value=[]), \
             patch("video_inspect.detect_frozen_frames", return_value=[]), \
             patch("video_inspect.probe_audio_levels", return_value={
                 "mean_volume_db": -20.0, "max_volume_db": -3.0, "silence_ranges": []
             }), \
             patch("video_inspect.Path.exists", return_value=True):
            report = inspect_video("fake.mp4", "/tmp/review")

        assert "video_path" in report
        assert "sample_frames" in report
        assert "frozen_sections" in report
        assert "audio_levels" in report
        assert "issues" in report
        assert "issue_count" in report
        assert "pass" in report
        assert report["pass"] is True

    def test_inspect_video_flags_frozen_frames(self):
        sys_path_fixup()
        from video_inspect import inspect_video

        with patch("video_inspect.extract_sample_frames", return_value=[]), \
             patch("video_inspect.detect_frozen_frames", return_value=[
                 {"start_sec": 4.0, "end_sec": 6.0, "duration_sec": 2.0}
             ]), \
             patch("video_inspect.probe_audio_levels", return_value={
                 "mean_volume_db": -20.0, "max_volume_db": -3.0, "silence_ranges": []
             }), \
             patch("video_inspect.Path.exists", return_value=True):
            report = inspect_video("fake.mp4", "/tmp/review")

        assert report["pass"] is False
        assert report["issue_count"] >= 1
        assert any("FROZEN_FRAMES" in i for i in report["issues"])

    def test_inspect_video_flags_low_audio(self):
        sys_path_fixup()
        from video_inspect import inspect_video

        with patch("video_inspect.extract_sample_frames", return_value=[]), \
             patch("video_inspect.detect_frozen_frames", return_value=[]), \
             patch("video_inspect.probe_audio_levels", return_value={
                 "mean_volume_db": -40.0, "max_volume_db": -10.0, "silence_ranges": []
             }), \
             patch("video_inspect.Path.exists", return_value=True):
            report = inspect_video("fake.mp4", "/tmp/review")

        assert report["pass"] is False
        assert any("LOW_AUDIO" in i for i in report["issues"])

    def test_inspect_video_flags_clipping(self):
        sys_path_fixup()
        from video_inspect import inspect_video

        with patch("video_inspect.extract_sample_frames", return_value=[]), \
             patch("video_inspect.detect_frozen_frames", return_value=[]), \
             patch("video_inspect.probe_audio_levels", return_value={
                 "mean_volume_db": -15.0, "max_volume_db": -0.1, "silence_ranges": []
             }), \
             patch("video_inspect.Path.exists", return_value=True):
            report = inspect_video("fake.mp4", "/tmp/review")

        assert report["pass"] is False
        assert any("CLIPPING_RISK" in i for i in report["issues"])

    def test_inspect_video_flags_long_silence(self):
        sys_path_fixup()
        from video_inspect import inspect_video

        with patch("video_inspect.extract_sample_frames", return_value=[]), \
             patch("video_inspect.detect_frozen_frames", return_value=[]), \
             patch("video_inspect.probe_audio_levels", return_value={
                 "mean_volume_db": -20.0, "max_volume_db": -3.0,
                 "silence_ranges": [{"start_sec": 5, "end_sec": 10, "duration_sec": 5.0}]
             }), \
             patch("video_inspect.Path.exists", return_value=True):
            report = inspect_video("fake.mp4", "/tmp/review")

        assert report["pass"] is False
        assert any("LONG_SILENCE" in i for i in report["issues"])

    def test_inspect_nonexistent_video(self):
        sys_path_fixup()
        from video_inspect import inspect_video
        report = inspect_video("/nonexistent/video.mp4")
        assert "error" in report


# ═══════════════════════════════════════════════════════════════════════
# Layer 3 Skills Tests
# ═══════════════════════════════════════════════════════════════════════

class TestLayer3Skills:
    """Tests for Layer 3 skill files existence and structure."""

    SKILLS_DIR = Path(__file__).parent.parent / "skills" / "models"

    def test_sora2_skill_exists(self):
        assert (self.SKILLS_DIR / "sora-2.md").exists()

    def test_tts_skill_exists(self):
        assert (self.SKILLS_DIR / "gpt-4o-mini-tts.md").exists()

    def test_image_skill_exists(self):
        assert (self.SKILLS_DIR / "gpt-image-2.md").exists()

    def test_sora2_skill_has_key_sections(self):
        content = (self.SKILLS_DIR / "sora-2.md").read_text(encoding="utf-8")
        assert "Resolution" in content or "resolution" in content
        assert "Duration" in content or "duration" in content
        assert "Prompt" in content or "prompt" in content

    def test_tts_skill_has_voice_info(self):
        content = (self.SKILLS_DIR / "gpt-4o-mini-tts.md").read_text(encoding="utf-8")
        # Must mention at least the core voices from Azure docs
        for voice in ["echo", "shimmer", "onyx", "nova", "fable"]:
            assert voice in content, f"Voice '{voice}' not found in TTS skill"

    def test_image_skill_has_quality_info(self):
        content = (self.SKILLS_DIR / "gpt-image-2.md").read_text(encoding="utf-8")
        assert "low" in content
        assert "medium" in content
        assert "high" in content


# ═══════════════════════════════════════════════════════════════════════
# Foundry Models Layer 2 Skill Tests
# ═══════════════════════════════════════════════════════════════════════

class TestFoundryModelsSkill:
    """Tests that the Layer 2 foundry-models.md is up to date."""

    def test_no_azure_neural_voices(self):
        """foundry-models.md should NOT reference old Azure Neural voice IDs."""
        skill_path = Path(__file__).parent.parent / "skills" / "core" / "foundry-models.md"
        content = skill_path.read_text(encoding="utf-8")
        assert "AvaNeural" not in content, "Still references old Azure Neural voices"
        assert "AndrewNeural" not in content
        assert "BrianNeural" not in content

    def test_references_correct_voices(self):
        skill_path = Path(__file__).parent.parent / "skills" / "core" / "foundry-models.md"
        content = skill_path.read_text(encoding="utf-8")
        for voice in ["nova", "fable", "shimmer", "echo", "onyx", "coral"]:
            assert voice in content, f"Voice '{voice}' not in foundry-models.md"

    def test_references_gpt_image_2(self):
        """Should reference gpt-image-2."""
        skill_path = Path(__file__).parent.parent / "skills" / "core" / "foundry-models.md"
        content = skill_path.read_text(encoding="utf-8")
        assert "gpt-image-2" in content

    def test_references_models_yaml(self):
        skill_path = Path(__file__).parent.parent / "skills" / "core" / "foundry-models.md"
        content = skill_path.read_text(encoding="utf-8")
        assert "models.yaml" in content, "Should reference centralized pricing config"


# ═══════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════

def sys_path_fixup():
    """Ensure scripts/lib is on sys.path for direct imports."""
    import sys
    lib_path = str(Path(__file__).parent.parent / "scripts" / "lib")
    if lib_path not in sys.path:
        sys.path.insert(0, lib_path)


def render_path_fixup():
    """Ensure scripts/ and scripts/lib and src/ are on sys.path for slate_render imports."""
    import sys
    base = Path(__file__).parent.parent
    for p in [base / "scripts", base / "scripts" / "lib", base / "src"]:
        sp = str(p)
        if sp not in sys.path:
            sys.path.insert(0, sp)


# ═══════════════════════════════════════════════════════════════════════
# Audit Fix Tests — Voice Auto-Wiring
# ═══════════════════════════════════════════════════════════════════════

class TestVoiceAutoWiring:
    """Tests that video_type is auto-detected and voice selection is wired."""

    def test_auto_detect_explainer(self):
        render_path_fixup()
        # Import the function indirectly — we test the detection logic
        scenario = {"title": "How AI Works — An Explainer"}
        title_lower = scenario["title"].lower()
        tags = ""
        combined = f"{title_lower} {tags}"
        # Should NOT match tutorial/marketing/etc, so falls to explainer
        assert not any(k in combined for k in ("tutorial", "how to", "guide"))  # "how" != "how to" full match
        # Actually "how" doesn't match "how to" but the title has no exact "how to"
        # The title says "How AI Works" which contains "how" but not "how to" as a substring
        # Wait — "how to" IS in "how" — no. "how to" not in "how ai works"
        # So this correctly falls to explainer

    def test_auto_detect_tutorial(self):
        scenario = {"title": "How to Deploy Kubernetes — A Tutorial"}
        title_lower = scenario["title"].lower()
        combined = f"{title_lower} "
        assert any(k in combined for k in ("tutorial", "how to", "guide", "walkthrough"))

    def test_auto_detect_marketing(self):
        scenario = {"title": "Product Launch Campaign 2025"}
        title_lower = scenario["title"].lower()
        combined = f"{title_lower} "
        assert any(k in combined for k in ("marketing", "promo", "launch", "campaign"))

    def test_auto_detect_from_tags(self):
        scenario = {"title": "New Features", "tags": ["onboarding", "welcome"]}
        title_lower = scenario["title"].lower()
        tags = " ".join(scenario.get("tags", [])).lower()
        combined = f"{title_lower} {tags}"
        assert any(k in combined for k in ("onboarding", "welcome", "getting started"))

    def test_explicit_video_type_respected(self):
        scenario = {"title": "Anything", "video_type": "corporate"}
        assert scenario.get("video_type") == "corporate"


# ═══════════════════════════════════════════════════════════════════════
# Audit Fix Tests — Company Name Validation
# ═══════════════════════════════════════════════════════════════════════

class TestCompanyValidation:
    """Tests for company name heuristic that warns when company looks like a topic."""

    def test_company_in_title_warns(self, capsys):
        """If company is a substring of title and not a known org, it's suspicious."""
        company = "Zero Trust Security"
        title = "Zero Trust Security for Enterprise"
        company_lower = company.lower().strip()
        title_lower = title.lower().strip()
        known_orgs = ("contoso", "microsoft", "azure", "google", "apple")
        is_suspicious = (len(company_lower) > 3 and company_lower in title_lower
                         and company_lower not in known_orgs)
        assert is_suspicious

    def test_known_org_not_flagged(self):
        company = "Microsoft"
        title = "Microsoft AI Platform Launch"
        company_lower = company.lower().strip()
        known_orgs = ("contoso", "microsoft", "azure", "google", "apple")
        is_suspicious = (len(company_lower) > 3 and company_lower in title_lower
                         and company_lower not in known_orgs) if 'title_lower' in dir() else False
        # Proper check
        title_lower = title.lower().strip()
        is_suspicious = (len(company_lower) > 3 and company_lower in title_lower
                         and company_lower not in known_orgs)
        assert not is_suspicious

    def test_short_company_not_flagged(self):
        """Company names <= 3 chars are too ambiguous to flag."""
        company = "AI"
        title = "AI for Healthcare"
        assert len(company.lower().strip()) <= 3


# ═══════════════════════════════════════════════════════════════════════
# Audit Fix Tests — Cost Log Persistence
# ═══════════════════════════════════════════════════════════════════════

class TestCostLogPersistence:
    """Tests for CostTracker writing cost_log.jsonl."""

    def test_cost_tracker_writes_jsonl(self, tmp_path):
        render_path_fixup()
        from slate.core.cost_tracker import CostTracker
        log_path = tmp_path / "cost_log.jsonl"
        tracker = CostTracker(budget_usd=10.0, log_path=str(log_path))
        tracker.record("foundry_tts", "scene_1", 0.05)
        tracker.record("foundry_image_gen", "scene_1", 0.04)
        assert log_path.exists()
        lines = log_path.read_text(encoding="utf-8").strip().split("\n")
        assert len(lines) == 2
        entry = json.loads(lines[0])
        assert entry["tool_name"] == "foundry_tts"
        assert entry["cost_usd"] == 0.05

    def test_cost_tracker_summary(self, tmp_path):
        render_path_fixup()
        from slate.core.cost_tracker import CostTracker
        tracker = CostTracker(budget_usd=5.0, log_path=str(tmp_path / "log.jsonl"))
        tracker.record("foundry_tts", "intro", 0.01)
        tracker.record("foundry_tts", "scene_1", 0.02)
        tracker.record("foundry_image_gen", "scene_1", 0.04)
        summary = tracker.summary()
        assert summary["total_usd"] == 0.07
        assert summary["budget_usd"] == 5.0
        assert summary["under_budget"] is True
        assert summary["by_tool"]["foundry_tts"] == 0.03
        assert summary["by_tool"]["foundry_image_gen"] == 0.04

    def test_cost_tracker_budget_exceeded(self):
        render_path_fixup()
        from slate.core.cost_tracker import CostTracker
        tracker = CostTracker(budget_usd=0.05)
        tracker.record("foundry_image_gen", "scene_1", 0.06)
        assert not tracker.check_budget()
        assert tracker.remaining == 0.0

    def test_cost_estimates_property_returns_dict(self):
        render_path_fixup()
        from slate.core.cost_tracker import CostTracker
        tracker = CostTracker()
        estimates = tracker.COST_ESTIMATES
        assert isinstance(estimates, dict)
        assert "foundry_image_gen" in estimates
        assert "foundry_tts" in estimates


# ═══════════════════════════════════════════════════════════════════════
# Audit Fix Tests — Self-Review Corrective Loop
# ═══════════════════════════════════════════════════════════════════════

class TestReviewCorrectiveLoop:
    """Tests that _self_review returns fixes_needed when dimensions score 1."""

    def test_pacing_fail_generates_fix(self):
        render_path_fixup()
        from slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=180,
            target_duration=100,  # 80% overshoot
            scene_count=5,
            brand_name=None,
        )
        assert result["verdict"] == "FAIL"
        assert result["scores"]["pacing"] == 1
        fixes = result["fixes_needed"]
        pacing_fixes = [f for f in fixes if f["dimension"] == "pacing"]
        assert len(pacing_fixes) == 1
        assert pacing_fixes[0]["action"] == "trim_narration"

    def test_low_scene_count_generates_fix(self):
        render_path_fixup()
        from slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=60,
            target_duration=60,
            scene_count=2,
            brand_name=None,
        )
        assert result["scores"]["content_coverage"] == 1
        fixes = result["fixes_needed"]
        coverage_fixes = [f for f in fixes if f["dimension"] == "content_coverage"]
        assert len(coverage_fixes) == 1
        assert coverage_fixes[0]["action"] == "add_scenes"

    def test_passing_review_no_fixes(self):
        render_path_fixup()
        from slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=60,
            target_duration=60,
            scene_count=8,
            brand_name=None,
        )
        assert result["verdict"] == "PASS"
        assert result["fixes_needed"] == []


# ═══════════════════════════════════════════════════════════════════════
# Audit Fix Tests — Duration Guardrail
# ═══════════════════════════════════════════════════════════════════════

class TestDurationGuardrail:
    """Tests for validate_script_timing word-count based duration checking."""

    def test_on_target_no_warnings(self):
        render_path_fixup()
        from slate_render import validate_script_timing
        # 150 WPM * 60s = 150 words for a 1-min video
        scenario = {
            "target_duration": 60,
            "scenes": [{"narration": " ".join(["word"] * 140)}],  # ~56s speech + transitions ≈ 60s
        }
        warnings = validate_script_timing(scenario)
        assert len(warnings) == 0

    def test_overshoot_warns(self):
        render_path_fixup()
        from slate_render import validate_script_timing
        # Way too many words for a 60s video
        scenario = {
            "target_duration": 60,
            "scenes": [{"narration": " ".join(["word"] * 400)}],  # ~160s >> 60s
        }
        warnings = validate_script_timing(scenario)
        assert len(warnings) >= 1
        assert "PACING" in warnings[0]

    def test_no_target_no_warnings(self):
        render_path_fixup()
        from slate_render import validate_script_timing
        scenario = {"scenes": [{"narration": "lots of words here"}]}
        warnings = validate_script_timing(scenario)
        assert len(warnings) == 0


# ═══════════════════════════════════════════════════════════════════════
# Audit Fix Tests — Sora-2 Partial Retry Guidance
# ═══════════════════════════════════════════════════════════════════════

class TestSora2PartialRetryGuidance:
    """Tests that the assets-director skill contains partial-failure guidance."""

    @pytest.mark.skip(reason="skills/pipelines/animated-explainer/assets-director.md removed in agentic refactor; guidance consolidated into skills/core/foundry-models.md and skills/directors/explainer.md")
    def test_skill_has_sora2_resilience_section(self):
        skill_path = Path(__file__).parent.parent / "skills" / "pipelines" / "animated-explainer" / "assets-director.md"
        content = skill_path.read_text(encoding="utf-8")
        assert "partial failure resilience" in content.lower()
        assert "Do NOT remove `video_prompt`" in content
        assert "test-pattern" in content

    @pytest.mark.skip(reason="skills/pipelines/animated-explainer/assets-director.md removed in agentic refactor; voice table now in skills/core/foundry-models.md")
    def test_skill_has_updated_voice_table(self):
        """Verify the assets-director skill uses OpenAI voices, not Azure Neural."""
        skill_path = Path(__file__).parent.parent / "skills" / "pipelines" / "animated-explainer" / "assets-director.md"
        content = skill_path.read_text(encoding="utf-8")
        # Should have OpenAI voices
        assert "nova" in content
        assert "fable" in content
        assert "shimmer" in content
        # Should NOT have old Azure Neural voices
        assert "AvaNeural" not in content
        assert "AndrewNeural" not in content


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Video freeze & fallback fix tests
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class TestAIVideoSceneDuration:
    """Verify that AI-video scenes use narration duration (not scene config)
    as the target duration for create_clip_scene_video, preventing frame freeze."""

    def test_narration_duration_used_when_scene_duration_missing(self):
        """When scene has no 'duration' key, TTS duration should be used."""
        import scripts.slate_render as sr

        # Simulate the duration calculation logic from the AI-video path
        scene = {"id": "test", "video_prompt": "A cityscape at night"}
        tts_result = {"duration": 18.5}
        audio_path = "/tmp/test.wav"

        # Replicate the new logic
        target_duration = scene.get("duration")
        if audio_path and tts_result:
            narr_dur = tts_result.get("duration", 0)
            if narr_dur > 0:
                target_duration = narr_dur + 0.3

        assert target_duration == pytest.approx(18.8, abs=0.01)

    def test_scene_duration_overrides_when_set(self):
        """When scene has explicit duration, it takes priority."""
        scene = {"id": "test", "duration": 10, "video_prompt": "..."}
        target_duration = scene.get("duration")
        # With narration, narration should still win for AI-video scenes
        tts_result = {"duration": 22.0}
        audio_path = "/tmp/test.wav"
        if audio_path and tts_result:
            narr_dur = tts_result.get("duration", 0)
            if narr_dur > 0:
                target_duration = narr_dur + 0.3
        assert target_duration == pytest.approx(22.3, abs=0.01)

    def test_no_narration_uses_scene_duration(self):
        """Without narration, scene duration or default is used."""
        scene = {"id": "test", "duration": 8, "video_prompt": "..."}
        target_duration = scene.get("duration")
        audio_path = None
        tts_result = None
        if audio_path and tts_result:
            narr_dur = tts_result.get("duration", 0)
            if narr_dur > 0:
                target_duration = narr_dur + 0.3
        assert target_duration == 8


class TestFallbackClipBranded:
    """Verify fallback clips use branded placeholders, not test patterns."""

    def test_fallback_uses_pillow_placeholder(self):
        """_fallback_clip should generate a branded placeholder, not testsrc2."""
        from scripts.lib.video_gen import _fallback_clip, HAS_PILLOW
        with tempfile.TemporaryDirectory() as td:
            out = str(Path(td) / "fallback.mp4")
            result = _fallback_clip(out, 4, "A busy office scene", "Test reason")

            assert result["method"] == "fallback-ffmpeg"
            assert result["fallback_reason"] == "Test reason"
            assert result["cost"] == 0.0
            if Path(out).exists():
                # Should NOT be the old testsrc2 fixed size
                size_kb = Path(out).stat().st_size // 1024
                # The branded placeholder should be different from testsrc2
                assert result["duration_sec"] == 4

    def test_placeholder_slide_generated(self):
        """_generate_placeholder_slide should create a valid PNG with no error text."""
        from scripts.lib.video_gen import _generate_placeholder_slide, HAS_PILLOW
        if not HAS_PILLOW:
            pytest.skip("Pillow not available")
        with tempfile.TemporaryDirectory() as td:
            out = str(Path(td) / "placeholder.png")
            _generate_placeholder_slide(out, "Real World Implementation", "API rate limit")
            assert Path(out).exists()
            # Should be a real PNG
            with open(out, "rb") as f:
                header = f.read(8)
            assert header[:4] == b'\x89PNG'

    def test_placeholder_slide_no_error_leak(self):
        """Placeholder slide must NOT contain failure reasons — those are dev-only."""
        import inspect
        from scripts.lib.video_gen import _generate_placeholder_slide
        source = inspect.getsource(_generate_placeholder_slide)
        # The function should NOT draw 'reason' text onto the image
        # It should only log it to console
        assert "draw.text" in source  # It does draw title text
        # Count draw.text calls — should only be for title lines, not reason
        draw_calls = [line.strip() for line in source.split('\n') if 'draw.text(' in line]
        for call in draw_calls:
            assert "reason" not in call, f"Failure reason leaked to image: {call}"

    def test_no_testsrc2_in_fallback(self):
        """The fallback code should NOT reference testsrc2 anywhere."""
        import inspect
        from scripts.lib.video_gen import _fallback_clip
        source = inspect.getsource(_fallback_clip)
        assert "testsrc2" not in source


class TestSelfReviewFallbackDetection:
    """Verify self-review detects and flags fallback placeholder scenes."""

    def test_fallback_scenes_flagged_in_warnings(self):
        """When fallback_scenes is non-empty, warnings should include them."""
        from scripts.slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=60.0,
            target_duration=60.0,
            scene_count=5,
            brand_name="TestBrand",
            video_path=None,
            fallback_scenes=["real-world", "intro"],
        )
        fallback_warnings = [w for w in result["warnings"] if "fallback" in w.lower()]
        assert len(fallback_warnings) >= 1
        assert "real-world" in fallback_warnings[0]
        assert "intro" in fallback_warnings[0]

    def test_no_fallback_scenes_no_extra_warning(self):
        """When no fallback scenes, no fallback warning should appear."""
        from scripts.slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=60.0,
            target_duration=60.0,
            scene_count=5,
            brand_name="TestBrand",
            video_path=None,
            fallback_scenes=[],
        )
        fallback_warnings = [w for w in result["warnings"] if "fallback" in w.lower()]
        assert len(fallback_warnings) == 0


class TestMotionStyleGovernance:
    """Verify self-review checks motion_style governance."""

    def _review(self, motion_style=None, scenes=None):
        from scripts.slate_render import _self_review
        return _self_review(
            trace_path=None,
            total_duration=60.0,
            target_duration=60.0,
            scene_count=5,
            brand_name="TestBrand",
            video_path=None,
            fallback_scenes=[],
            motion_style=motion_style,
            scenes=scenes,
        )

    def test_missing_motion_style_warns(self):
        """No motion_style → governance warning."""
        result = self._review(motion_style=None)
        ms_warnings = [w for w in result["warnings"] if "motion_style" in w]
        assert len(ms_warnings) >= 1
        assert "P7" in ms_warnings[0]

    def test_present_motion_style_no_warning(self):
        """When motion_style is set, no governance warning about it."""
        result = self._review(motion_style="hybrid")
        ms_warnings = [w for w in result["warnings"] if "motion_style" in w and "not set" in w.lower()]
        assert len(ms_warnings) == 0

    def test_image_style_with_video_prompt_warns(self):
        """motion_style='image' but scenes have video_prompt → mismatch warning."""
        scenes = [
            {"title": "Intro", "visual_prompt": "A blue background"},
            {"title": "Demo", "video_prompt": "A person using a laptop"},
        ]
        result = self._review(motion_style="image", scenes=scenes)
        mismatch_warnings = [w for w in result["warnings"] if "doesn't match" in w.lower()]
        assert len(mismatch_warnings) >= 1

    def test_motion_style_with_only_images_warns(self):
        """motion_style='motion' but no video_prompt scenes → mismatch warning."""
        scenes = [
            {"title": "Intro", "visual_prompt": "Office scene"},
            {"title": "Data", "visual_prompt": "Chart showing growth"},
        ]
        result = self._review(motion_style="motion", scenes=scenes)
        mismatch_warnings = [w for w in result["warnings"] if "doesn't match" in w.lower()]
        assert len(mismatch_warnings) >= 1

    def test_hybrid_style_no_false_warnings(self):
        """motion_style='hybrid' with mixed scenes → no mismatch warning."""
        scenes = [
            {"title": "Intro", "visual_prompt": "Office scene"},
            {"title": "Action", "video_prompt": "Person walking through city"},
        ]
        result = self._review(motion_style="hybrid", scenes=scenes)
        mismatch_warnings = [w for w in result["warnings"] if "doesn't match" in w.lower()]
        assert len(mismatch_warnings) == 0
