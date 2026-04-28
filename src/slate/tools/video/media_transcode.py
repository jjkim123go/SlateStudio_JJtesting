"""MediaTranscode — Transcode video/audio files between formats using FFmpeg."""

from __future__ import annotations

import asyncio
import os
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

QUALITY_PRESETS: dict[str, dict[str, Any]] = {
    "draft":    {"crf": 28, "preset": "ultrafast"},
    "standard": {"crf": 23, "preset": "medium"},
    "high":     {"crf": 18, "preset": "slow"},
    "ultra":    {"crf": 15, "preset": "veryslow"},
}


class MediaTranscode(BaseTool):
    """Transcodes video/audio files with quality presets via FFmpeg libx264."""

    name = "media_transcode"
    agent_skills = ["core/ffmpeg-audio"]
    version = "0.1.0"
    tier = ToolTier.CORE
    capability = "Transcode video/audio files between formats with quality presets"
    provider = "ffmpeg"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA

    input_schema = {
        "type": "object",
        "properties": {
            "input_path": {"type": "string"},
            "output_path": {"type": "string"},
            "codec": {"type": "string", "default": "libx264"},
            "quality": {"type": "string", "enum": ["draft", "standard", "high", "ultra"]},
            "width": {"type": "integer"},
            "height": {"type": "integer"},
            "fps": {"type": "integer"},
        },
        "required": ["input_path", "output_path", "quality"],
    }
    output_schema = {
        "type": "object",
        "properties": {
            "output_path": {"type": "string"},
            "codec": {"type": "string"},
            "quality": {"type": "string"},
        },
    }
    compliance_level = "general"
    data_residency = "in-tenant"

    @staticmethod
    def build_command(
        input_path: str,
        output_path: str,
        codec: str,
        quality: str,
        width: int | None = None,
        height: int | None = None,
        fps: int | None = None,
    ) -> list[str]:
        """Build the ffmpeg command list for a transcode operation."""
        preset_cfg = QUALITY_PRESETS.get(quality)
        if preset_cfg is None:
            raise ValueError(f"Unknown quality preset: {quality!r}")

        cmd = [
            "ffmpeg", "-y", "-hide_banner",
            "-i", input_path,
            "-c:v", codec,
            "-crf", str(preset_cfg["crf"]),
            "-preset", preset_cfg["preset"],
        ]

        if width and height:
            cmd.extend(["-vf", f"scale={width}:{height}"])
        elif width:
            cmd.extend(["-vf", f"scale={width}:-2"])
        elif height:
            cmd.extend(["-vf", f"scale=-2:{height}"])

        if fps:
            cmd.extend(["-r", str(fps)])

        cmd.append(output_path)
        return cmd

    async def execute(self, **kwargs: Any) -> ToolResult:
        input_path: str = kwargs["input_path"]
        output_path: str = kwargs["output_path"]
        codec: str = kwargs.get("codec", "libx264")
        quality: str = kwargs["quality"]
        width: int | None = kwargs.get("width")
        height: int | None = kwargs.get("height")
        fps: int | None = kwargs.get("fps")

        if not os.path.isfile(input_path):
            return ToolResult(success=False, error=f"Input file not found: {input_path}")

        if quality not in QUALITY_PRESETS:
            return ToolResult(
                success=False,
                error=f"Invalid quality preset: {quality!r}. Must be one of {list(QUALITY_PRESETS)}",
            )

        cmd = self.build_command(input_path, output_path, codec, quality, width, height, fps)

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
        except FileNotFoundError:
            return ToolResult(success=False, error="ffmpeg not found on PATH")

        if proc.returncode != 0:
            return ToolResult(
                success=False,
                error=f"ffmpeg transcode failed (rc={proc.returncode}): {stderr.decode().strip()[-500:]}",
            )

        return ToolResult(
            success=True,
            output={"output_path": output_path, "codec": codec, "quality": quality},
            cost_usd=0.0,
            metadata={"input_path": input_path, "preset": QUALITY_PRESETS[quality]},
        )
