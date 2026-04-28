"""AudioProbe — Extract audio metadata via ffprobe."""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)


class AudioProbe(BaseTool):
    """Probes audio files using ffprobe to extract codec, duration, sample rate, etc."""

    name = "audio_probe"
    agent_skills = ["core/ffmpeg-audio"]
    version = "0.1.0"
    tier = ToolTier.ANALYZE
    capability = "Extract audio metadata (duration, codec, sample rate, channels, bitrate) via ffprobe"
    provider = "ffmpeg"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA

    input_schema = {
        "type": "object",
        "properties": {
            "audio_path": {"type": "string", "description": "Path to audio file"},
        },
        "required": ["audio_path"],
    }
    output_schema = {
        "type": "object",
        "properties": {
            "duration": {"type": "number"},
            "sample_rate": {"type": "integer"},
            "channels": {"type": "integer"},
            "codec": {"type": "string"},
            "bitrate": {"type": "integer"},
            "format": {"type": "string"},
        },
    }
    compliance_level = "general"
    data_residency = "in-tenant"

    async def execute(self, **kwargs: Any) -> ToolResult:
        audio_path: str = kwargs["audio_path"]

        if not os.path.isfile(audio_path):
            return ToolResult(
                success=False,
                error=f"File not found: {audio_path}",
            )

        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            audio_path,
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
        except FileNotFoundError:
            return ToolResult(
                success=False,
                error="ffprobe not found on PATH",
            )

        if proc.returncode != 0:
            return ToolResult(
                success=False,
                error=f"ffprobe failed (rc={proc.returncode}): {stderr.decode().strip()}",
            )

        try:
            probe = json.loads(stdout.decode())
        except json.JSONDecodeError as exc:
            return ToolResult(success=False, error=f"Invalid ffprobe JSON: {exc}")

        audio_stream = next(
            (s for s in probe.get("streams", []) if s.get("codec_type") == "audio"),
            None,
        )
        fmt = probe.get("format", {})

        if audio_stream is None:
            return ToolResult(success=False, error="No audio stream found in file")

        output = {
            "duration": float(fmt.get("duration", audio_stream.get("duration", 0))),
            "sample_rate": int(audio_stream.get("sample_rate", 0)),
            "channels": int(audio_stream.get("channels", 0)),
            "codec": audio_stream.get("codec_name", "unknown"),
            "bitrate": int(fmt.get("bit_rate", audio_stream.get("bit_rate", 0))),
            "format": fmt.get("format_name", "unknown"),
        }

        return ToolResult(
            success=True,
            output=output,
            cost_usd=0.0,
            metadata={"audio_path": audio_path},
        )
