"""Smoke tests for the HyperFramesRender tool — full SCF → render pipeline.

These tests exercise SCF schema validation and the SCF→HTML compile path
via dry-run. They do NOT require @hyperframes/producer or Chrome to be
installed (dry-run skips the actual capture/encode stage).
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from slate.tools.video.hyperframes_render import HyperFramesRender


def _base_scf(**overrides) -> dict:
    """Return a minimal valid SCF dict, with optional overrides."""
    scf = {
        "version": "1.0",
        "pipeline": "smoke-test",
        "outputProfile": {"width": 1920, "height": 1080, "fps": 30},
        "scenes": [
            {
                "id": "title",
                "duration": 3,
                "component": "TitleCard",
                "props": {"title": "Slate Smoke Test", "subtitle": "If you see this, it works"},
            }
        ],
    }
    scf.update(overrides)
    return scf


def _node_available() -> bool:
    return shutil.which("node") is not None


pytestmark = pytest.mark.skipif(not _node_available(), reason="Node.js not on PATH")


# -------------------------------------------------------------------
# Happy-path: single TitleCard scene (dry-run compiles SCF → HTML)
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_smoke_title_card_compile():
    """Smoke test: a simple TitleCard SCF compiles to HTML successfully."""
    tool = HyperFramesRender()
    result = await tool.execute(scf=_base_scf(), dry_run=True)

    assert result.success, f"Compile failed: {result.error}"
    assert result.output["html_path"] is not None
    assert Path(result.output["html_path"]).exists()


# -------------------------------------------------------------------
# Invalid SCF — missing required field
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invalid_scf_missing_scenes():
    """An SCF without 'scenes' must fail schema validation."""
    bad_scf = {
        "version": "1.0",
        "pipeline": "bad",
        "outputProfile": {"width": 1920, "height": 1080, "fps": 30},
        # 'scenes' deliberately omitted
    }
    tool = HyperFramesRender()
    result = await tool.execute(scf=bad_scf, dry_run=True)

    assert not result.success
    assert "SCF validation failed" in result.error


# -------------------------------------------------------------------
# Multiple scenes
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_multi_scene_compile():
    """Compile an SCF with multiple scenes."""
    scf = _base_scf(
        scenes=[
            {"id": "intro", "duration": 2, "component": "TitleCard", "props": {"title": "Scene One"}},
            {"id": "body",  "duration": 4, "component": "TitleCard", "props": {"title": "Scene Two"}},
            {"id": "outro", "duration": 2, "component": "TitleCard", "props": {"title": "Scene Three"}},
        ]
    )
    tool = HyperFramesRender()
    result = await tool.execute(scf=scf, dry_run=True)

    assert result.success, f"Compile failed: {result.error}"
    assert Path(result.output["html_path"]).exists()


# -------------------------------------------------------------------
# SCF loaded from a file path
# -------------------------------------------------------------------

@pytest.mark.asyncio
async def test_scf_from_file_path(tmp_path: Path):
    """HyperFramesRender should accept a file path string as the scf argument."""
    scf_file = tmp_path / "test-input.scf.json"
    scf_file.write_text(json.dumps(_base_scf()), encoding="utf-8")

    tool = HyperFramesRender()
    result = await tool.execute(scf=str(scf_file), dry_run=True)

    assert result.success, f"Compile failed: {result.error}"
    assert Path(result.output["html_path"]).exists()


@pytest.mark.asyncio
async def test_component_transition_and_metric_stack_compile():
    """Component-backed boundary transitions and H8 components compile."""
    scf = _base_scf(
        brandPackage="contoso-corporate",
        scenes=[
            {
                "id": "metrics",
                "duration": 4,
                "component": "MetricStack",
                "props": {
                    "metric1Label": "Plans", "metric1Prev": 0, "metric1Value": 10, "metric1Unit": "", "metric1Delta": "ready", "metric1Note": "Briefs become scenes.",
                    "metric2Label": "Components", "metric2Prev": 0, "metric2Value": 76, "metric2Unit": "", "metric2Delta": "live", "metric2Note": "The library carries the visuals.",
                    "metric3Label": "Checks", "metric3Prev": 0, "metric3Value": 8, "metric3Unit": "", "metric3Delta": "passed", "metric3Note": "Review runs before delivery.",
                },
                "transition": {"type": "PageTurn", "duration": 1.2, "props": {"frontLabel": "Metrics", "backLabel": "Workflow"}},
            },
            {
                "id": "book",
                "duration": 4,
                "component": "BookPageMetrics",
                "props": {"title": "Proof on the page", "body": "Exact values stay readable."},
            },
        ],
    )
    tool = HyperFramesRender()
    result = await tool.execute(scf=scf, dry_run=True)

    assert result.success, f"Compile failed: {result.error}"
    html = Path(result.output["html_path"]).read_text(encoding="utf-8")
    assert "slate-transition-overlay" in html
    assert "data-scene-component=\"MetricStack\"" in html
    assert "data-scene-component=\"BookPageMetrics\"" in html


@pytest.mark.asyncio
async def test_brand_font_readiness_marker_compile():
    """Brand typography propagates into text-layer CSS and exposes font readiness."""
    scf = _base_scf(
        brandPackage="contoso-corporate",
        scenes=[
            {
                "id": "text-brand",
                "duration": 2,
                "layers": [
                    {"type": "text", "content": "Brand text", "style": "heading", "position": {"anchor": "center"}}
                ],
            }
        ],
    )
    tool = HyperFramesRender()
    result = await tool.execute(scf=scf, dry_run=True)

    assert result.success, f"Compile failed: {result.error}"
    html = Path(result.output["html_path"]).read_text(encoding="utf-8")
    assert "Segoe UI" in html
    assert "__slateFontsReady" in html


@pytest.mark.asyncio
async def test_webgl_compile_defaults_to_gpu_two_workers():
    """WebGL components should dry-run through the GPU-oriented default path."""
    scf = _base_scf(
        scenes=[
            {
                "id": "three",
                "duration": 2,
                "component": "ThreeScene",
                "props": {"title": "GPU default", "mode": "orbital"},
            }
        ]
    )
    tool = HyperFramesRender()
    result = await tool.execute(scf=scf, dry_run=True)

    assert result.success, f"Compile failed: {result.error}"
    html = Path(result.output["html_path"]).read_text(encoding="utf-8")
    assert "vendor/three/three.module.min.js" in html
    output = result.metadata["stdout"] + result.metadata["stderr"]
    assert "defaulting to GPU-oriented capture" in output
    assert "workers=2" in output
    assert "useGpu=true" in output
