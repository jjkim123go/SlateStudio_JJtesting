"""Tests for Phase 3B features: BrandPackage, SCFComposer, Ingest Parsers, EvalHarness."""

import json
import tempfile
from pathlib import Path

import pytest
import yaml


# ═══════════════════════════════════════════════════════════════════════
# Brand Package Tests
# ═══════════════════════════════════════════════════════════════════════

class TestBrandPackage:
    """Tests for BrandPackage loading, properties, and SCF integration."""

    def test_load_contoso_brand(self, tmp_path):
        from slate.core.brand_package import BrandPackage
        yaml_content = {
            "identity": {"name": "TestBrand", "org": "TestOrg", "version": "1.0", "locked": True},
            "visual_language": {
                "color_palette": {
                    "primary": ["#FF0000", "#CC0000"],
                    "accent": ["#00FF00"],
                    "background": "#000000",
                    "text": "#FFFFFF",
                },
                "locked_elements": {
                    "logo": {"file": "logo.svg", "position": "top-right", "required": True},
                    "legal_disclaimer": {"text": "© Test", "required_for": ["external"]},
                    "intro_template": "intro.mp4",
                    "outro_template": "outro.mp4",
                },
            },
            "typography": {
                "headings": {"font": "Arial", "weight": 700},
                "body": {"font": "Helvetica", "weight": 400},
            },
            "audio": {
                "approved_voices": [
                    {"name": "Narrator", "model": "gpt-4o-mini-tts", "style": "warm"},
                ],
                "music_library": {"source": "sharepoint://test/", "fallback": "ambient"},
            },
            "compliance": {
                "content_classification": "Confidential",
                "rai_screening": True,
                "pii_scan": True,
                "export_watermark": True,
            },
        }
        p = tmp_path / "brand.yaml"
        p.write_text(yaml.dump(yaml_content), encoding="utf-8")

        brand = BrandPackage.load(p)
        assert brand.name == "TestBrand"
        assert brand.org == "TestOrg"
        assert brand.is_locked is True
        assert brand.primary_color == "#FF0000"
        assert brand.accent_color == "#00FF00"
        assert brand.logo.required is True
        assert brand.logo.file == "logo.svg"
        assert brand.heading_font == "Arial"
        assert brand.body_font == "Helvetica"
        assert len(brand.audio.approved_voices) == 1
        assert brand.compliance.content_classification == "Confidential"
        assert brand.compliance.pii_scan is True

    def test_default_brand(self):
        from slate.core.brand_package import BrandPackage
        brand = BrandPackage.default()
        assert brand.name == "default"
        assert brand.primary_color == "#0078D4"
        assert brand.logo.required is False

    def test_to_scf_props(self, tmp_path):
        from slate.core.brand_package import BrandPackage
        yaml_content = {
            "identity": {"name": "SCFTest", "org": "SCF Corp"},
            "visual_language": {
                "color_palette": {"primary": ["#123456"]},
                "locked_elements": {"logo": {"file": "logo.png", "position": "top-left"}},
            },
        }
        p = tmp_path / "brand.yaml"
        p.write_text(yaml.dump(yaml_content), encoding="utf-8")
        brand = BrandPackage.load(p)
        props = brand.to_scf_props()
        assert props["companyName"] == "SCF Corp"
        assert props["primaryColor"] == "#123456"
        assert props["logoSrc"] == "logo.png"
        assert props["logoPosition"] == "top-left"

    def test_to_style_vars(self):
        from slate.core.brand_package import BrandPackage
        brand = BrandPackage.default()
        vars_ = brand.to_style_vars()
        assert vars_["--brand-primary"] == "#0078D4"
        assert "--font-heading" in vars_

    def test_validate_color(self, tmp_path):
        from slate.core.brand_package import BrandPackage
        yaml_content = {
            "identity": {"name": "Test"},
            "visual_language": {
                "color_palette": {"primary": ["#0078D4"], "accent": ["#FFB900"]},
            },
        }
        p = tmp_path / "brand.yaml"
        p.write_text(yaml.dump(yaml_content), encoding="utf-8")
        brand = BrandPackage.load(p)
        assert brand.validate_color("#0078D4") is True
        assert brand.validate_color("#0078d4") is True  # case insensitive
        assert brand.validate_color("#FFB900") is True
        assert brand.validate_color("#999999") is False

    def test_discover_packages(self, tmp_path):
        from slate.core.brand_package import BrandPackage
        (tmp_path / "brand-a.yaml").write_text("identity:\n  name: A", encoding="utf-8")
        (tmp_path / "brand-b.yaml").write_text("identity:\n  name: B", encoding="utf-8")
        (tmp_path / "not-yaml.txt").write_text("nope", encoding="utf-8")
        packages = BrandPackage.discover(tmp_path)
        assert len(packages) == 2
        assert "brand-a" in packages
        assert "brand-b" in packages

    def test_load_missing_file(self):
        from slate.core.brand_package import BrandPackage
        with pytest.raises(FileNotFoundError):
            BrandPackage.load("nonexistent.yaml")

    def test_load_real_contoso_package(self):
        """Test loading the actual contoso-corporate.yaml shipped with Slate."""
        from slate.core.brand_package import BrandPackage
        path = Path("config/org/brand-packages/contoso-corporate.yaml")
        if not path.exists():
            pytest.skip("contoso-corporate.yaml not found")
        brand = BrandPackage.load(path)
        assert brand.name == "Contoso Corporate"
        assert brand.org == "Contoso Ltd."
        assert brand.is_locked is True
        assert len(brand.colors.primary) == 2
        assert brand.logo.required is True


# ═══════════════════════════════════════════════════════════════════════
# SCF Composer Tests
# ═══════════════════════════════════════════════════════════════════════

class TestSCFComposer:
    """Tests for SCF JSON generation from scenario + brand + assets."""

    def _sample_scenario(self):
        return {
            "title": "Test Video",
            "company": "TestCo",
            "tagline": "Innovation starts here",
            "style": "tech-blue",
            "scenes": [
                {"id": "scene-1", "title": "Introduction", "narration": "Welcome to our product."},
                {"id": "scene-2", "title": "Features", "narration": "Here are the features.",
                 "bullet_points": ["Fast", "Reliable", "Secure"]},
            ],
        }

    def test_basic_scf_generation(self):
        from slate.core.scf_composer import SCFComposer
        composer = SCFComposer()
        scf = composer.from_scenario(self._sample_scenario())
        assert scf["version"] == "1.0"
        assert scf["pipeline"] == "animated-explainer"
        assert len(scf["scenes"]) == 4  # intro + 2 content + outro
        assert scf["scenes"][0]["component"] == "BrandIntro"
        assert scf["scenes"][-1]["component"] == "BrandOutro"

    def test_scf_with_brand_package(self, tmp_path):
        from slate.core.brand_package import BrandPackage
        from slate.core.scf_composer import SCFComposer
        yaml_content = {
            "identity": {"name": "BrandTest", "org": "BrandCo"},
            "visual_language": {
                "color_palette": {"primary": ["#AA0000"], "text": "#EEEEEE"},
            },
        }
        p = tmp_path / "brand.yaml"
        p.write_text(yaml.dump(yaml_content), encoding="utf-8")
        brand = BrandPackage.load(p)

        composer = SCFComposer(brand=brand)
        scf = composer.from_scenario(self._sample_scenario())
        assert scf["brandPackage"] == "BrandTest"
        # Brand props should flow to BrandIntro
        intro = scf["scenes"][0]
        assert intro["props"]["primaryColor"] == "#AA0000"

    def test_scf_with_assets(self):
        from slate.core.scf_composer import SCFComposer, AssetManifest
        assets = AssetManifest(
            scene_images={"scene-1": "assets/scene1.png", "scene-2": "assets/scene2.png"},
            scene_narrations={"scene-1": "assets/narr1.wav", "scene-2": "assets/narr2.wav"},
            brand_intro_image="assets/intro.png",
            music_track="assets/bg.mp3",
        )
        composer = SCFComposer()
        scf = composer.from_scenario(self._sample_scenario(), assets)
        # Check scene-1 has image layer and narration
        scene1 = scf["scenes"][1]  # index 0 is brand intro
        assert any(l["src"] == "assets/scene1.png" for l in scene1["layers"])
        assert scene1["narration"] == "assets/narr1.wav"
        # Music track
        assert scf["music"]["src"] == "assets/bg.mp3"
        assert scf["music"]["duck_on_narration"] is True

    def test_scf_with_video_clips(self):
        from slate.core.scf_composer import SCFComposer, AssetManifest
        assets = AssetManifest(
            scene_videos={"scene-1": "clips/demo.mp4"},
            scene_narrations={"scene-1": "assets/narr1.wav"},
        )
        composer = SCFComposer()
        scf = composer.from_scenario(self._sample_scenario(), assets)
        scene1 = scf["scenes"][1]
        assert any(l["type"] == "video" and l["src"] == "clips/demo.mp4" for l in scene1["layers"])

    def test_scf_preserves_component_scenes(self):
        from slate.core.scf_composer import SCFComposer, AssetManifest
        scenario = {
            "title": "Component Test",
            "company": "TestCo",
            "scenes": [
                {
                    "id": "architecture",
                    "duration": 7,
                    "component": "ArchitectureDiagram",
                    "props": {"title": "Flow", "nodes": [{"id": "api", "label": "API"}]},
                    "transition": "crossfade",
                }
            ],
        }
        assets = AssetManifest(scene_narrations={"architecture": "assets/narr.wav"})
        composer = SCFComposer()

        scf = composer.from_scenario(scenario, assets)
        scene = scf["scenes"][1]

        assert scene["component"] == "ArchitectureDiagram"
        assert scene["props"]["title"] == "Flow"
        assert scene["narration"] == "assets/narr.wav"
        assert "layers" not in scene
        assert scf["metadata"]["source_components"] == {"architecture": "ArchitectureDiagram"}

    def test_scf_validation_valid(self):
        from slate.core.scf_composer import SCFComposer
        composer = SCFComposer()
        scf = composer.from_scenario(self._sample_scenario())
        errors = composer.validate(scf)
        assert errors == [], f"Unexpected errors: {errors}"

    def test_scf_validation_missing_fields(self):
        from slate.core.scf_composer import SCFComposer
        composer = SCFComposer()
        errors = composer.validate({"version": "2.0"})
        assert any("version" in e.lower() or "pipeline" in e.lower() for e in errors)

    def test_scf_validation_duplicate_ids(self):
        from slate.core.scf_composer import SCFComposer
        composer = SCFComposer()
        scf = {
            "version": "1.0",
            "pipeline": "test",
            "outputProfile": {"width": 1920, "height": 1080, "fps": 30},
            "scenes": [
                {"id": "dup", "duration": 5, "component": "TitleCard"},
                {"id": "dup", "duration": 5, "component": "TitleCard"},
            ],
        }
        errors = composer.validate(scf)
        assert any("duplicate" in e.lower() for e in errors)

    def test_scf_write_and_read(self, tmp_path):
        from slate.core.scf_composer import SCFComposer
        composer = SCFComposer()
        scf = composer.from_scenario(self._sample_scenario())
        out = tmp_path / "comp.json"
        composer.write(scf, out)
        loaded = json.loads(out.read_text(encoding="utf-8"))
        assert loaded["version"] == "1.0"
        assert len(loaded["scenes"]) == 4

    def test_total_duration(self):
        from slate.core.scf_composer import SCFComposer
        composer = SCFComposer()
        scf = composer.from_scenario(self._sample_scenario())
        dur = composer.total_duration(scf)
        assert dur > 0
        # 4 (intro) + 8 + 8 + 4 (outro) = 24
        assert dur == 24

    def test_caption_config_with_brand(self, tmp_path):
        from slate.core.brand_package import BrandPackage
        from slate.core.scf_composer import SCFComposer
        yaml_content = {
            "identity": {"name": "CaptionBrand"},
            "visual_language": {"color_palette": {"primary": ["#AABB00"], "text": "#CCDDEE"}},
            "typography": {"body": {"font": "Comic Sans"}},
        }
        p = tmp_path / "brand.yaml"
        p.write_text(yaml.dump(yaml_content), encoding="utf-8")
        brand = BrandPackage.load(p)
        composer = SCFComposer(brand=brand)
        scf = composer.from_scenario(self._sample_scenario())
        assert scf["captions"]["font"] == "Comic Sans"
        assert scf["captions"]["highlightColor"] == "#AABB00"


# ═══════════════════════════════════════════════════════════════════════
# Ingest Parser Tests
# ═══════════════════════════════════════════════════════════════════════

class TestIngestParsers:
    """Tests for document ingest parsers (PPTX, DOCX, XLSX)."""

    def test_ingest_result_to_scenario(self):
        from slate.tools.ingest.parsers import IngestResult, Section
        result = IngestResult(
            source_type="pptx",
            source_path="test.pptx",
            title="My Presentation",
            sections=[
                Section(index=0, title="Intro", body="Welcome", speaker_notes="Say hello"),
                Section(index=1, title="Details", bullet_points=["Point A", "Point B"]),
            ],
        )
        scenario = result.to_scenario(company="TestCo")
        assert scenario["title"] == "My Presentation"
        assert scenario["company"] == "TestCo"
        assert len(scenario["scenes"]) == 2
        assert scenario["scenes"][0]["title"] == "Intro"
        assert scenario["scenes"][0]["narration"] == "Say hello"  # speaker notes preferred
        assert scenario["scenes"][1]["bullet_points"] == ["Point A", "Point B"]

    def test_section_to_scene_data(self):
        from slate.tools.ingest.parsers import Section
        section = Section(
            index=2,
            title="Revenue Growth",
            body="Revenue grew 15% YoY",
            bullet_points=["Cloud: +25%", "On-prem: -5%"],
        )
        scene = section.to_scene_data("revenue-scene")
        assert scene["id"] == "revenue-scene"
        assert scene["title"] == "Revenue Growth"
        assert scene["narration"] == "Revenue grew 15% YoY"  # body when no speaker notes
        assert "visual_prompt" in scene

    def test_section_auto_id(self):
        from slate.tools.ingest.parsers import Section
        section = Section(index=4, title="Test")
        scene = section.to_scene_data()
        assert scene["id"] == "scene-5"

    def test_parse_document_unsupported(self):
        from slate.tools.ingest.parsers import parse_document
        with pytest.raises(ValueError, match="Unsupported"):
            parse_document("file.pdf")

    def test_parse_document_missing_file(self):
        from slate.tools.ingest.parsers import parse_document
        with pytest.raises(FileNotFoundError):
            parse_document("nonexistent.pptx")

    def test_pptx_fallback_no_library(self, tmp_path):
        """Test PPTX parser fallback when python-pptx is not installed."""
        from slate.tools.ingest.parsers import PptxParser
        import importlib
        # Create a dummy file
        p = tmp_path / "test.pptx"
        p.write_bytes(b"dummy")
        parser = PptxParser()
        # This will hit the fallback path if python-pptx is not installed,
        # or parse the dummy bytes and likely fail. Either way it shouldn't crash.
        try:
            result = parser.parse(p)
            # If python-pptx is installed, it may fail on dummy bytes
        except Exception:
            pass  # Expected — dummy bytes aren't valid PPTX

    def test_docx_fallback_no_library(self, tmp_path):
        from slate.tools.ingest.parsers import DocxParser
        p = tmp_path / "test.docx"
        p.write_bytes(b"dummy")
        parser = DocxParser()
        try:
            result = parser.parse(p)
        except Exception:
            pass  # Expected

    def test_xlsx_fallback_no_library(self, tmp_path):
        from slate.tools.ingest.parsers import XlsxParser
        p = tmp_path / "test.xlsx"
        p.write_bytes(b"dummy")
        parser = XlsxParser()
        try:
            result = parser.parse(p)
        except Exception:
            pass  # Expected

    def test_ingest_result_estimated_duration(self):
        from slate.tools.ingest.parsers import IngestResult, Section
        result = IngestResult(
            source_type="docx",
            source_path="test.docx",
            title="Test",
            sections=[Section(index=i, title=f"S{i}") for i in range(5)],
        )
        scenario = result.to_scenario()
        assert result.estimated_duration_seconds == 48  # 5*8 + 8 = 48
        assert len(scenario["scenes"]) == 5

    def test_media_asset_dataclass(self):
        from slate.tools.ingest.parsers import MediaAsset
        asset = MediaAsset(
            asset_type="image",
            source_index=2,
            file_path="img.png",
            description="Chart from slide 3",
        )
        assert asset.asset_type == "image"
        assert asset.source_index == 2


# ═══════════════════════════════════════════════════════════════════════
# Eval Harness Tests
# ═══════════════════════════════════════════════════════════════════════

class TestEvalHarness:
    """Tests for governance evaluation harness."""

    def _make_trace(self, tmp_path, **overrides):
        """Create a minimal production trace JSON for testing."""
        trace = {
            "spans": [
                {"id": "sp1", "name": "ingest", "start_time": "2026-01-01T00:00:00Z",
                 "end_time": "2026-01-01T00:01:00Z", "parent_id": None, "span_type": "phase"},
                {"id": "sp2", "name": "compose", "start_time": "2026-01-01T00:01:00Z",
                 "end_time": "2026-01-01T00:02:00Z", "parent_id": None, "span_type": "phase"},
                {"id": "t1", "name": "foundry_image_gen", "parent_id": "sp1", "span_type": "tool",
                 "start_time": "2026-01-01T00:00:10Z", "end_time": "2026-01-01T00:00:20Z"},
            ],
            "violations": [],
            "metrics": {"total_cost_usd": 0.50},
            "gates": [{"gate_type": "approved", "phase": "ingest"}],
        }
        trace.update(overrides)
        p = tmp_path / "trace.json"
        p.write_text(json.dumps(trace), encoding="utf-8")
        return p

    def test_clean_trace_passes(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(tmp_path)
        report = EvalHarness.evaluate(p)
        assert report.verdict == "PASS"
        assert report.violation_count == 0
        assert report.total_cost_usd == 0.50

    def test_budget_exceeded_fails(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(
            tmp_path,
            metrics={"total_cost_usd": 30.0},
            violations=[{"violation_type": "BUDGET_EXCEEDED", "message": "Over $25 cap"}],
        )
        report = EvalHarness.evaluate(p, budget_cap=25.0)
        assert report.verdict == "FAIL"
        budget_dim = next(d for d in report.dimensions if d.name == "budget_compliance")
        assert budget_dim.score == 1

    def test_forbidden_tool_violation(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(
            tmp_path,
            violations=[
                {"violation_type": "FORBIDDEN_TOOL", "message": "ffmpeg_raw used in compose"},
                {"violation_type": "FORBIDDEN_TOOL", "message": "shell_exec used"},
                {"violation_type": "FORBIDDEN_TOOL", "message": "another forbidden"},
            ],
        )
        report = EvalHarness.evaluate(p)
        tool_dim = next(d for d in report.dimensions if d.name == "tool_governance")
        assert tool_dim.score == 1  # 3+ violations = score 1

    def test_minor_tool_violations_warning(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(
            tmp_path,
            violations=[
                {"violation_type": "FORBIDDEN_TOOL", "message": "one violation"},
            ],
        )
        report = EvalHarness.evaluate(p)
        tool_dim = next(d for d in report.dimensions if d.name == "tool_governance")
        assert tool_dim.score == 2  # 1-2 violations = warning

    def test_gate_skipped_fails(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(
            tmp_path,
            violations=[{"violation_type": "GATE_SKIPPED", "message": "compose gate skipped"}],
            gates=[],
        )
        report = EvalHarness.evaluate(p)
        gate_dim = next(d for d in report.dimensions if d.name == "gate_compliance")
        assert gate_dim.score == 1

    def test_duration_exceeded(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(
            tmp_path,
            violations=[{"violation_type": "DURATION_EXCEEDED", "message": "compose > 120s"}],
        )
        report = EvalHarness.evaluate(p)
        dur_dim = next(d for d in report.dimensions if d.name == "duration_compliance")
        assert dur_dim.score == 1

    def test_empty_trace_warnings(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(
            tmp_path,
            spans=[],
            violations=[],
            metrics={"total_cost_usd": 0},
            gates=[],
        )
        report = EvalHarness.evaluate(p)
        assert any("No phases" in w for w in report.warnings)
        assert any("No tool calls" in w for w in report.warnings)

    def test_report_summary_string(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(tmp_path)
        report = EvalHarness.evaluate(p)
        summary = report.summary()
        assert "PASS" in summary
        assert "budget_compliance" in summary

    def test_report_to_dict(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(tmp_path)
        report = EvalHarness.evaluate(p)
        d = report.to_dict()
        assert d["verdict"] == "PASS"
        assert "dimensions" in d
        assert len(d["dimensions"]) == 6

    def test_near_budget_warning(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(tmp_path, metrics={"total_cost_usd": 21.0})
        report = EvalHarness.evaluate(p, budget_cap=25.0)
        budget_dim = next(d for d in report.dimensions if d.name == "budget_compliance")
        assert budget_dim.score == 2  # 84% = near limit

    def test_missing_trace_file(self):
        from slate.core.eval_harness import EvalHarness
        with pytest.raises(FileNotFoundError):
            EvalHarness.evaluate("nonexistent.json")

    def test_score_percentage(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(tmp_path)
        report = EvalHarness.evaluate(p)
        assert 0 <= report.score_pct <= 100
        assert report.total_score == report.max_score  # clean trace = perfect score

    def test_critical_violation_fails_overall(self, tmp_path):
        """Any critical violation type (FORBIDDEN_TOOL, BUDGET_EXCEEDED, GATE_SKIPPED) → FAIL."""
        from slate.core.eval_harness import EvalHarness
        p = self._make_trace(
            tmp_path,
            violations=[{"violation_type": "BUDGET_EXCEEDED", "message": "over"}],
            metrics={"total_cost_usd": 30.0},
        )
        report = EvalHarness.evaluate(p, budget_cap=25.0)
        assert report.verdict == "FAIL"

    def test_eval_with_policy_file(self, tmp_path):
        from slate.core.eval_harness import EvalHarness
        # Create a policy YAML with a low budget cap
        policy = {"governance": {"hard_budget_cap": 5.0}}
        policy_path = tmp_path / "policy.yaml"
        policy_path.write_text(yaml.dump(policy), encoding="utf-8")
        # Trace with cost above that cap
        p = self._make_trace(
            tmp_path,
            metrics={"total_cost_usd": 4.5},
            violations=[{"violation_type": "BUDGET_EXCEEDED", "message": "over cap"}],
        )
        report = EvalHarness.evaluate(p, policy_path=policy_path)
        assert report.budget_cap_usd == 5.0


# ═══════════════════════════════════════════════════════════════════════
# Integration: Ingest → SCF Pipeline
# ═══════════════════════════════════════════════════════════════════════

class TestIngestToSCFIntegration:
    """End-to-end: IngestResult → scenario → SCF JSON."""

    def test_ingest_to_scf_pipeline(self, tmp_path):
        from slate.tools.ingest.parsers import IngestResult, Section
        from slate.core.scf_composer import SCFComposer
        from slate.core.brand_package import BrandPackage

        # Simulate a parsed document
        result = IngestResult(
            source_type="pptx",
            source_path="slides.pptx",
            title="Q4 Results",
            sections=[
                Section(index=0, title="Overview", speaker_notes="Welcome to Q4 review"),
                Section(index=1, title="Revenue", body="Revenue up 15%",
                        bullet_points=["Cloud +25%", "On-prem -5%"]),
                Section(index=2, title="Outlook", speaker_notes="Strong pipeline ahead"),
            ],
        )

        # Convert to scenario
        scenario = result.to_scenario(company="Contoso", tagline="Q4 FY26")

        # Generate SCF
        brand = BrandPackage.default()
        composer = SCFComposer(brand=brand, pipeline="ppt-to-video")
        scf = composer.from_scenario(scenario)

        # Validate
        errors = composer.validate(scf)
        assert errors == [], f"SCF validation errors: {errors}"

        # Structural checks
        assert scf["pipeline"] == "ppt-to-video"
        assert len(scf["scenes"]) == 5  # intro + 3 content + outro
        assert scf["scenes"][0]["component"] == "BrandIntro"
        assert scf["scenes"][0]["props"]["companyName"] == "Contoso"
        assert scf["scenes"][-1]["component"] == "BrandOutro"

        # Write to file
        out = tmp_path / "composition.json"
        composer.write(scf, out)
        assert out.exists()
        reloaded = json.loads(out.read_text(encoding="utf-8"))
        assert reloaded["version"] == "1.0"

    def test_empty_ingest_to_scf(self):
        """Even an empty document should produce a valid (minimal) SCF."""
        from slate.tools.ingest.parsers import IngestResult
        from slate.core.scf_composer import SCFComposer

        result = IngestResult(source_type="docx", source_path="empty.docx", title="Empty")
        scenario = result.to_scenario()
        composer = SCFComposer()
        scf = composer.from_scenario(scenario)
        errors = composer.validate(scf)
        assert errors == []
        assert len(scf["scenes"]) == 2  # just intro + outro


# ═══════════════════════════════════════════════════════════════════════
# Pipeline Wiring Tests (Phase 3B → render pipeline)
# ═══════════════════════════════════════════════════════════════════════

class TestPipelineWiring:
    """Verify that Phase 3B modules are wired into the render pipeline."""

    def test_render_accepts_brand_name_kwarg(self):
        """render_video() accepts brand_name parameter."""
        render_src = (Path(__file__).resolve().parent.parent / "scripts" / "slate_render.py").read_text(encoding="utf-8")
        assert "brand_name: str | None = None" in render_src
        assert "--brand" in render_src
        assert "--input" in render_src

    def test_brand_import_block_present(self):
        """Verify brand_package and scf_composer imports are in slate_render.py."""
        render_src = (Path(__file__).resolve().parent.parent / "scripts" / "slate_render.py").read_text(encoding="utf-8")
        assert "from slate.core.brand_package import BrandPackage" in render_src
        assert "from slate.core.scf_composer import SCFComposer, AssetManifest" in render_src

    def test_ingest_import_block_present(self):
        """Verify ingest parser import is in slate_render.py."""
        render_src = (Path(__file__).resolve().parent.parent / "scripts" / "slate_render.py").read_text(encoding="utf-8")
        assert "from slate.tools.ingest.parsers import parse_document" in render_src

    def test_scf_output_generation_block(self):
        """Verify SCF output generation is wired into the render pipeline."""
        render_src = (Path(__file__).resolve().parent.parent / "scripts" / "slate_render.py").read_text(encoding="utf-8")
        assert "composer = SCFComposer(brand=brand" in render_src
        assert "composer.from_scenario(scenario" in render_src
        assert "composition.json" in render_src

    def test_brand_color_injection(self):
        """Verify brand colors are injected into AI image prompts."""
        render_src = (Path(__file__).resolve().parent.parent / "scripts" / "slate_render.py").read_text(encoding="utf-8")
        assert "brand.primary_color" in render_src
        assert "brand.accent_color" in render_src

    def test_brand_voice_override(self):
        """Verify brand voice overrides scenario voice."""
        render_src = (Path(__file__).resolve().parent.parent / "scripts" / "slate_render.py").read_text(encoding="utf-8")
        assert "brand.audio.approved_voices" in render_src

    def test_scf_composer_with_brand_end_to_end(self):
        """Full integration: brand + scenario → SCF with brand props."""
        from slate.core.brand_package import BrandPackage
        from slate.core.scf_composer import SCFComposer, AssetManifest

        brand = BrandPackage.default()
        scenario = {
            "title": "Integration Test",
            "company": "TestCorp",
            "scenes": [
                {"id": "s1", "title": "Scene One", "narration": "Test narration."}
            ],
        }
        assets = AssetManifest(
            scene_images={"s1": "output/s1.png"},
            scene_narrations={"s1": "output/s1.wav"},
        )
        composer = SCFComposer(brand=brand, pipeline="animated-explainer")
        scf = composer.from_scenario(scenario, assets)
        errors = composer.validate(scf)
        assert errors == []
        # Brand intro should have brand props
        intro = scf["scenes"][0]
        assert intro["component"] == "BrandIntro"
        assert intro["props"]["companyName"] == "TestCorp"


# ═══════════════════════════════════════════════════════════════════════
# Gap Fix Tests: Cost Tracking, Self-Review, Duration, Prompt Sanitizer
# ═══════════════════════════════════════════════════════════════════════

class TestCostTracking:
    """Verify tool wrappers include cost in return dicts."""

    def test_image_gen_cost_constant(self):
        from scripts.lib.image_gen import IMAGE_COST_USD
        assert "gpt-image-2" in IMAGE_COST_USD
        assert IMAGE_COST_USD["gpt-image-2"] > 0
        assert IMAGE_COST_USD["pillow-fallback"] == 0.0

    def test_tts_cost_constant(self):
        from scripts.lib.tts_gen import TTS_COST_PER_SEC
        assert TTS_COST_PER_SEC > 0
        assert TTS_COST_PER_SEC == 0.001

    def test_video_cost_estimate(self):
        from scripts.lib.video_gen import _estimate_cost
        cost_4s = _estimate_cost(4, "landscape")
        cost_12s = _estimate_cost(12, "landscape")
        assert cost_4s > 0
        assert cost_12s > cost_4s  # More seconds = more cost
        assert _estimate_cost(4, "480p") < cost_4s  # Lower res = cheaper

    def test_video_fallback_has_cost(self):
        from scripts.lib.video_gen import _fallback_clip
        import tempfile, os
        with tempfile.TemporaryDirectory() as td:
            path = os.path.join(td, "test.mp4")
            result = _fallback_clip(path, 4, "test prompt", "test_reason")
            assert "cost" in result
            assert result["cost"] == 0.0


class TestSelfReview:
    """Verify the P6 self-review function."""

    def test_self_review_pass(self):
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
        from slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=120.0,
            target_duration=120.0,
            scene_count=5,
            brand_name="test-brand",
        )
        assert result["verdict"] == "PASS"
        assert result["scores"]["brand_compliance"] == 3
        assert result["scores"]["pacing"] == 3

    def test_self_review_pacing_warn(self):
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
        from slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=100.0,
            target_duration=120.0,  # 17% off
            scene_count=5,
            brand_name="test-brand",
        )
        assert result["scores"]["pacing"] == 2
        assert any("Duration" in w for w in result["warnings"])

    def test_self_review_no_brand(self):
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
        from slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=60.0,
            target_duration=60.0,
            scene_count=3,
            brand_name=None,
        )
        assert result["scores"]["brand_compliance"] == 2
        assert any("brand" in w.lower() for w in result["warnings"])

    def test_self_review_few_scenes(self):
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
        from slate_render import _self_review
        result = _self_review(
            trace_path=None,
            total_duration=30.0,
            target_duration=30.0,
            scene_count=2,
            brand_name="brand",
        )
        assert result["scores"]["content_coverage"] == 1


class TestDurationGuardrail:
    """Verify the WPM-based duration validation."""

    def test_on_target(self):
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
        from slate_render import validate_script_timing
        # 60s target at 150 WPM ≈ 150 words, minus ~4s transitions → ~140 words needed
        scenario = {
            "target_duration": 60,
            "intro_narration": " ".join(["word"] * 30),
            "outro_narration": " ".join(["word"] * 30),
            "scenes": [
                {"narration": " ".join(["word"] * 40)},
                {"narration": " ".join(["word"] * 40)},
            ],
        }
        warnings = validate_script_timing(scenario)
        assert len(warnings) == 0

    def test_way_under(self):
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
        from slate_render import validate_script_timing
        scenario = {
            "target_duration": 120,
            "intro_narration": "hello",
            "outro_narration": "bye",
            "scenes": [{"narration": "Short."}],
        }
        warnings = validate_script_timing(scenario)
        assert len(warnings) > 0
        assert "PACING" in warnings[0]

    def test_no_target(self):
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
        from slate_render import validate_script_timing
        scenario = {"scenes": [{"narration": "No target duration."}]}
        warnings = validate_script_timing(scenario)
        assert warnings == []


class TestSoraPromptSanitizer:
    """Verify prompt sanitization for Sora-2."""

    def test_abstract_prompt_rewritten(self):
        from scripts.lib.video_gen import sanitize_video_prompt
        prompt = "A data stream flowing through a glowing pipeline"
        result = sanitize_video_prompt(prompt)
        assert "data stream" not in result.lower()
        assert len(result) > 0

    def test_safe_prompt_unchanged(self):
        from scripts.lib.video_gen import sanitize_video_prompt
        prompt = "A diverse team collaborating in a modern office"
        result = sanitize_video_prompt(prompt)
        assert result == prompt

    def test_multiple_risky_terms(self):
        from scripts.lib.video_gen import sanitize_video_prompt
        prompt = "Neural network processing binary code in a digital pipeline"
        result = sanitize_video_prompt(prompt)
        assert "neural network" not in result.lower()
        assert "binary code" not in result.lower()
        assert "digital pipeline" not in result.lower()
