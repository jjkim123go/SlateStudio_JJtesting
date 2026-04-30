"""Foundry Image Generation — gpt-image-2.

BaseTool wrapper that delegates to scripts/lib/image_gen.py (the production
implementation). Calls gpt-image-2 on Azure AI Foundry; falls back to Pillow
slides if no token / API failure (handled inside the real implementation).

Design note: The BaseTool subclass pattern (name, tier, capability, provider,
support_envelope) is a clean-room design inspired by OpenMontage's tool contract
(AGPL-3.0). Slate's tool implementations are Azure-native with enterprise fields
(compliance_level, data_residency).
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

# Make scripts/lib importable so we can call the real image_gen implementation.
_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPTS_LIB = _REPO_ROOT / "scripts" / "lib"
if str(_SCRIPTS_LIB) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_LIB))

try:
    from image_gen import generate_ai_image as _generate_ai_image  # type: ignore
    from image_gen import generate_scene_image as _generate_scene_image  # type: ignore
    from image_gen import normalize_image_quality as _normalize_image_quality  # type: ignore
    _IMPL_AVAILABLE = True
    _IMPORT_ERROR: str | None = None
except Exception as e:  # pragma: no cover - import-time guard
    _generate_ai_image = None  # type: ignore
    _generate_scene_image = None  # type: ignore
    _normalize_image_quality = None  # type: ignore
    _IMPL_AVAILABLE = False
    _IMPORT_ERROR = f"{type(e).__name__}: {e}"


def _resolve_size(width: int, height: int) -> str:
    """Coerce (width, height) to one of gpt-image-2's accepted size presets."""
    valid = {(1024, 1024), (1024, 1536), (1536, 1024)}
    if (width, height) in valid:
        return f"{width}x{height}"
    # Pick the closest valid preset by aspect ratio
    if width > height:
        return "1536x1024"
    if height > width:
        return "1024x1536"
    return "1024x1024"


class FoundryImageGen(BaseTool):
    """Generate images using Azure AI Foundry gpt-image-2."""

    name = "foundry_image_gen"

    @property
    def is_available(self) -> bool:
        from slate.core.azure_config import azure_config
        return azure_config.is_configured

    agent_skills = ["core/foundry-models", "core/structured-visuals"]
    version = "0.3.0"
    tier = ToolTier.GENERATE
    capability = "Generate images from text prompts using Azure AI Foundry (gpt-image-2)"
    provider = "azure-foundry"
    runtime = ToolRuntime.API
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "prompt": {"type": "string", "description": "Image generation prompt"},
            "width": {"type": "integer", "default": 1024, "enum": [1024, 1536]},
            "height": {"type": "integer", "default": 1024, "enum": [1024, 1536]},
            "quality": {
                "type": "string",
                "default": "medium",
                "enum": ["low", "medium", "high", "standard", "hd", "auto"],
                "description": "gpt-image-2 quality level",
            },
            "model_hint": {
                "type": "string",
                "enum": ["structured"],
                "description": "Use 'structured' to route to Pillow renderer for code/tables/UI",
            },
        },
        "required": ["prompt"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "image_path": {"type": "string"},
            "width": {"type": "integer"},
            "height": {"type": "integer"},
            "model": {"type": "string"},
        },
    }

    fallback_tools = []  # Production routing handled by scripts/lib/image_gen.py

    async def execute(self, **kwargs: Any) -> ToolResult:
        prompt: str = kwargs.get("prompt", "")
        width: int = kwargs.get("width", 1024)
        height: int = kwargs.get("height", 1024)
        quality: str = kwargs.get("quality", "medium")
        normalized_quality = _normalize_image_quality(quality) if _normalize_image_quality else quality
        model_hint: str = kwargs.get("model_hint", "") or None

        if not prompt:
            return ToolResult(success=False, error="prompt is required", metadata={})

        if not _IMPL_AVAILABLE:
            return ToolResult(
                success=False,
                error=f"image_gen implementation unavailable: {_IMPORT_ERROR}",
                metadata={"provider": self.provider},
            )

        # Resolve output path: caller may pass output_path or output_dir.
        output_path: str | None = kwargs.get("output_path")
        if not output_path:
            output_dir = kwargs.get("output_dir", "output")
            os.makedirs(output_dir, exist_ok=True)
            filename = f"foundry_img_{uuid.uuid4().hex[:8]}.png"
            output_path = os.path.join(output_dir, filename)
        else:
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        size = _resolve_size(int(width), int(height))
        start = time.monotonic()

        if kwargs.get("dry_run"):
            if _generate_scene_image is None:
                return ToolResult(
                    success=False,
                    error=f"image_gen dry-run implementation unavailable: {_IMPORT_ERROR}",
                    metadata={"provider": self.provider, "model": "gpt-image-2"},
                )
            await asyncio.to_thread(_generate_scene_image, output_path, prompt[:80], palette="premium-velvet")
            return ToolResult(
                success=True,
                output={
                    "image_path": output_path,
                    "width": int(size.split("x")[0]),
                    "height": int(size.split("x")[1]),
                    "model": "gpt-image-2",
                    "quality": normalized_quality,
                    "method": "dry-run-pillow",
                    "size_kb": round(Path(output_path).stat().st_size / 1024),
                    "stub": True,
                },
                cost_usd=0.04,
                duration_seconds=time.monotonic() - start,
                metadata={"prompt_length": len(prompt), "provider": self.provider, "model": "gpt-image-2", "method": "dry-run-pillow", "size": size, "dry_run": True},
            )

        try:
            result = await asyncio.to_thread(
                _generate_ai_image,
                prompt,
                output_path,
                size,
                normalized_quality,
                model_hint,
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"{type(e).__name__}: {e}",
                duration_seconds=time.monotonic() - start,
                metadata={"provider": self.provider, "model": "gpt-image-2"},
            )

        duration = time.monotonic() - start
        method = result.get("method", "unknown")
        model = result.get("model", "gpt-image-2")
        cost = float(result.get("cost", 0.0) or 0.0)

        try:
            out_w, out_h = (int(x) for x in size.split("x"))
        except Exception:
            out_w, out_h = width, height

        return ToolResult(
            success=bool(result.get("success", method != "failed")),
            output={
                "image_path": result.get("path", output_path),
                "width": out_w,
                "height": out_h,
                "model": model,
                "quality": normalized_quality,
                "method": method,
                "size_kb": result.get("size_kb"),
                "stub": bool(result.get("stub", False)),
            },
            error=result.get("error") if not result.get("success", method != "failed") else None,
            cost_usd=cost,
            duration_seconds=duration,
            metadata={
                "prompt_length": len(prompt),
                "provider": self.provider,
                "model": model,
                "method": method,
                "size": size,
            },
        )
