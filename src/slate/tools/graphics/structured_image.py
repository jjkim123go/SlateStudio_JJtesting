"""Structured Image — deterministic, Pillow-rendered visuals.

Wraps `scripts/lib/structured_image.py` as a registered BaseTool so the agent
discovers it through the standard tool registry instead of reaching into
`scripts/lib/` ad-hoc.

Use this tool for any scene whose content requires exact text, code, data,
or precise layout — content that AI image models cannot reliably render
(they hallucinate syntax and misspell labels).

Supported types: code, table, ui, diagram, bar_chart, donut_chart.
Zero cost, zero latency, deterministic output.
"""

from __future__ import annotations

import logging
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

logger = logging.getLogger(__name__)

# Make scripts/lib importable. The tool is the single registered entry point;
# scripts/lib/structured_image.py remains the renderer implementation.
_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPTS_LIB = _REPO_ROOT / "scripts" / "lib"
if str(_SCRIPTS_LIB) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_LIB))


class StructuredImage(BaseTool):
    """Render structured visuals (code, tables, charts, UI, diagrams) with Pillow."""

    name = "structured_image"
    agent_skills = ["core/structured-visuals"]
    version = "0.1.0"
    tier = ToolTier.GENERATE
    capability = (
        "Deterministically render code, tables, UI mockups, diagrams, and charts "
        "as PNGs (no AI image model — zero cost, exact text)."
    )
    provider = "local"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.STABLE
    compliance_level = "general"
    data_residency = "local"

    input_schema = {
        "type": "object",
        "properties": {
            "type": {
                "type": "string",
                "enum": ["code", "table", "ui", "diagram", "bar_chart", "donut_chart"],
                "description": "Which structured visual to render.",
            },
            "title": {"type": "string", "description": "Visual title / caption."},
            "data": {
                "type": "object",
                "description": (
                    "Type-specific data payload. See each type's required fields:\n"
                    "  code:        {lines: string[], highlight_line?: int}\n"
                    "  table:       {headers: string[], rows: string[][], "
                    "col_widths?: int[], highlight_row?: int}\n"
                    "  ui:          {elements: [{type, text, x, y, w, h, variant?, items?}]}\n"
                    "  diagram:     {boxes: [{id, text, x?, y?, w?, h?, color_idx?, subtitle?}], "
                    "arrows: [{from_id, to_id, label?, color_idx?}]}\n"
                    "  bar_chart:   {labels: string[], values: number[], unit?: string}\n"
                    "  donut_chart: {labels: string[], values: number[]}"
                ),
            },
            "width": {"type": "integer", "default": 1920},
            "height": {"type": "integer", "default": 1080},
            "output_dir": {"type": "string", "default": "."},
            "output_path": {
                "type": "string",
                "description": "Optional explicit output path; overrides output_dir.",
            },
        },
        "required": ["type", "title", "data"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "image_path": {"type": "string"},
            "type": {"type": "string"},
            "width": {"type": "integer"},
            "height": {"type": "integer"},
        },
    }

    fallback_tools = ["foundry_image_gen"]

    async def execute(self, **kwargs: Any) -> ToolResult:
        visual_type: str = kwargs.get("type", "")
        title: str = kwargs.get("title", "")
        data: dict[str, Any] = kwargs.get("data") or {}
        width: int = int(kwargs.get("width", 1920))
        height: int = int(kwargs.get("height", 1080))
        output_dir: str = kwargs.get("output_dir", ".")
        explicit_path: str | None = kwargs.get("output_path")

        if not visual_type:
            return ToolResult(success=False, error="`type` is required")
        if not title:
            return ToolResult(success=False, error="`title` is required")
        if not isinstance(data, dict):
            return ToolResult(success=False, error="`data` must be an object")

        if explicit_path:
            output_path = explicit_path
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        else:
            os.makedirs(output_dir, exist_ok=True)
            filename = f"structured_{visual_type}_{uuid.uuid4().hex[:8]}.png"
            output_path = os.path.join(output_dir, filename)

        start = time.monotonic()
        try:
            import structured_image as si  # type: ignore[import-not-found]
        except ImportError as exc:
            return ToolResult(
                success=False,
                error=f"structured_image renderer not importable: {exc}",
                metadata={"scripts_lib": str(_SCRIPTS_LIB)},
            )

        try:
            if visual_type == "code":
                lines = data.get("lines") or []
                highlight = data.get("highlight_line")
                si.generate_code_image(
                    output_path, title, lines, width, height, highlight
                )
            elif visual_type == "table":
                si.generate_table_image(
                    output_path,
                    title,
                    data.get("headers") or [],
                    data.get("rows") or [],
                    width=width,
                    height=height,
                    col_widths=data.get("col_widths"),
                    highlight_row=data.get("highlight_row"),
                )
            elif visual_type == "ui":
                si.generate_ui_mockup(
                    output_path,
                    title,
                    data.get("elements") or [],
                    width=width,
                    height=height,
                )
            elif visual_type == "diagram":
                si.generate_diagram_image(
                    output_path,
                    title,
                    data.get("boxes") or [],
                    data.get("arrows") or [],
                    width=width,
                    height=height,
                )
            elif visual_type == "bar_chart":
                si.generate_bar_chart(
                    output_path,
                    title,
                    data.get("labels") or [],
                    data.get("values") or [],
                    unit=data.get("unit", ""),
                    width=width,
                    height=height,
                )
            elif visual_type == "donut_chart":
                si.generate_donut_chart(
                    output_path,
                    title,
                    data.get("labels") or [],
                    data.get("values") or [],
                    width=width,
                    height=height,
                )
            else:
                return ToolResult(
                    success=False,
                    error=f"Unknown structured visual type: {visual_type!r}",
                )
        except Exception as exc:  # noqa: BLE001 — surface renderer failure as ToolResult
            logger.exception("structured_image renderer failed")
            return ToolResult(
                success=False,
                error=f"Renderer failed: {exc}",
                duration_seconds=time.monotonic() - start,
                metadata={"type": visual_type, "title": title},
            )

        return ToolResult(
            success=True,
            output={
                "image_path": output_path,
                "type": visual_type,
                "width": width,
                "height": height,
            },
            cost_usd=0.0,
            duration_seconds=time.monotonic() - start,
            metadata={"renderer": "pillow", "deterministic": True},
        )
