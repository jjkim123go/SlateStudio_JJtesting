"""Foundry Video Generation — Sora-2.

BaseTool wrapper that delegates to scripts/lib/video_gen.py (the production
implementation). Calls Sora-2 on Azure AI Foundry via the OpenAI Python SDK.

Design note: The video generation tool abstraction (duration snapping, resolution
profiles, fallback handling) is a clean-room design inspired by OpenMontage's
video generation tools (AGPL-3.0). Slate's implementation targets Azure AI Foundry
with Sora-2 as the primary video generation model.
"""

from __future__ import annotations

import asyncio
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

_ASPECT_RATIOS = {
    "16:9": (1280, 720),   # Sora-2 max is 720p in preview
    "9:16": (720, 1280),
    "1:1": (480, 480),
}

_ASPECT_TO_RES_KEY = {
    "16:9": "landscape",
    "9:16": "portrait",
    "1:1": "square",
}

# Sora-2 only supports exactly 4, 8, or 12 seconds
_VALID_DURATIONS = [4, 8, 12]

# Make scripts/lib importable so we can call the real video_gen implementation.
_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPTS_LIB = _REPO_ROOT / "scripts" / "lib"
if str(_SCRIPTS_LIB) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_LIB))

try:
    from video_gen import generate_video_clip as _generate_video_clip  # type: ignore
    _IMPL_AVAILABLE = True
    _IMPORT_ERROR: str | None = None
except Exception as e:  # pragma: no cover - import-time guard
    _generate_video_clip = None  # type: ignore
    _IMPL_AVAILABLE = False
    _IMPORT_ERROR = f"{type(e).__name__}: {e}"


class FoundryVideoGen(BaseTool):
    """Generate short video clips using Azure Sora-2."""

    name = "foundry_video_gen"

    @property
    def is_available(self) -> bool:
        from slate.core.azure_config import azure_config
        return azure_config.is_configured

    agent_skills = ["core/foundry-models"]
    version = "0.2.0"
    tier = ToolTier.GENERATE
    capability = "Generate short video clips from text prompts using Azure AI Foundry Sora-2"
    provider = "azure-foundry"
    runtime = ToolRuntime.API
    stability = ToolStability.EXPERIMENTAL
    compliance_level = "confidential"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "prompt": {"type": "string", "description": "Video generation prompt"},
            "duration": {
                "type": "integer",
                "default": 8,
                "enum": [4, 8, 12],
                "description": "Duration in seconds (Sora-2 supports exactly 4, 8, or 12s)",
            },
            "aspect_ratio": {
                "type": "string",
                "default": "16:9",
                "enum": ["16:9", "9:16", "1:1"],
            },
        },
        "required": ["prompt"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "video_path": {"type": "string"},
            "duration": {"type": "integer"},
            "resolution": {"type": "string"},
            "model": {"type": "string"},
        },
    }

    fallback_tools = []

    async def execute(self, **kwargs: Any) -> ToolResult:
        prompt: str = kwargs.get("prompt", "")
        requested_duration: int = kwargs.get("duration", 8)
        duration: int = requested_duration
        aspect_ratio: str = kwargs.get("aspect_ratio", "16:9")

        if not prompt:
            return ToolResult(success=False, error="prompt is required", metadata={})

        # Snap to nearest valid Sora-2 duration
        duration = min(_VALID_DURATIONS, key=lambda d: abs(d - duration))

        if aspect_ratio not in _ASPECT_RATIOS:
            return ToolResult(
                success=False,
                error=f"Invalid aspect_ratio: {aspect_ratio}. Must be one of {list(_ASPECT_RATIOS)}",
                metadata={},
            )

        width, height = _ASPECT_RATIOS[aspect_ratio]
        resolution = f"{width}x{height}"
        resolution_key = _ASPECT_TO_RES_KEY[aspect_ratio]

        if not _IMPL_AVAILABLE:
            return ToolResult(
                success=False,
                error=f"video_gen implementation unavailable: {_IMPORT_ERROR}",
                metadata={"provider": self.provider, "model": "Sora-2"},
            )

        # Resolve output path: caller may pass output_path or output_dir.
        output_path: str | None = kwargs.get("output_path")
        if not output_path:
            output_dir = kwargs.get("output_dir", "output")
            os.makedirs(output_dir, exist_ok=True)
            filename = f"foundry_video_{uuid.uuid4().hex[:8]}.mp4"
            output_path = os.path.join(output_dir, filename)
        else:
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        start = time.monotonic()
        fallback_allowed = bool(kwargs.get("fallback_ok") or kwargs.get("dry_run"))
        try:
            result = await asyncio.to_thread(
                _generate_video_clip,
                prompt,
                output_path,
                duration,
                resolution_key,
                allow_fallback=fallback_allowed,
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"{type(e).__name__}: {e}",
                duration_seconds=time.monotonic() - start,
                metadata={"provider": self.provider, "model": "Sora-2"},
            )

        elapsed = time.monotonic() - start
        method = result.get("method", "unknown")
        if result.get("success") is False or method == "failed" or (method == "fallback-ffmpeg" and not fallback_allowed):
            return ToolResult(
                success=False,
                error=result.get("error") or result.get("fallback_reason") or "Video generation failed",
                duration_seconds=elapsed,
                metadata={"provider": self.provider, "model": "Sora-2", "method": method},
            )
        cost = float(result.get("cost", 0.0) or 0.0)
        actual_duration = int(result.get("duration_sec", duration) or duration)
        actual_resolution = result.get("resolution", resolution)

        return ToolResult(
            success=True,
            output={
                "video_path": result.get("output_path", output_path),
                "duration": actual_duration,
                "requested_duration": requested_duration,
                "duration_snapped": requested_duration != duration,
                "aspect_ratio": aspect_ratio,
                "resolution": actual_resolution,
                "fps": 30 if method == "fallback-ffmpeg" else 24,
                "model": "Sora-2" if method == "sora-2" else method,
                "method": method,
                "video_id": result.get("video_id"),
                "size_kb": result.get("size_kb"),
                "fallback_reason": result.get("fallback_reason"),
            },
            cost_usd=round(cost, 4),
            duration_seconds=elapsed,
            metadata={
                "prompt_length": len(prompt),
                "requested_duration": requested_duration,
                "duration_snapped": requested_duration != duration,
                "provider": self.provider,
                "model": "Sora-2",
                "method": method,
                "compliance_level": self.compliance_level,
                "generation_time_sec": result.get("generation_time_sec"),
            },
        )
