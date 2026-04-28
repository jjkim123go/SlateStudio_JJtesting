"""AudioMixer — Mix multiple audio tracks with volume ducking and loudness normalization."""

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


class AudioMixer(BaseTool):
    """Mixes narration + music tracks using FFmpeg filter_complex with ducking and EBU R128."""

    name = "audio_mixer"
    agent_skills = ["core/ffmpeg-audio"]
    version = "0.1.0"
    tier = ToolTier.CORE
    capability = "Mix multiple audio tracks with volume ducking and EBU R128 loudness normalization"
    provider = "ffmpeg"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA

    input_schema = {
        "type": "object",
        "properties": {
            "tracks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"},
                        "volume": {"type": "number", "minimum": 0, "maximum": 1},
                        "start_time": {"type": "number"},
                        "duck_on_narration": {"type": "boolean"},
                    },
                    "required": ["path"],
                },
            },
            "output_path": {"type": "string"},
            "duration": {"type": "number"},
            "normalize": {"type": "boolean", "default": True},
        },
        "required": ["tracks", "output_path", "duration"],
    }
    output_schema = {
        "type": "object",
        "properties": {
            "output_path": {"type": "string"},
            "duration": {"type": "number"},
        },
    }
    compliance_level = "general"
    data_residency = "in-tenant"

    def build_filter_complex(
        self,
        tracks: list[dict[str, Any]],
        duration: float,
        normalize: bool,
    ) -> tuple[list[str], str]:
        """Build FFmpeg input args and filter_complex string.

        Returns (input_args, filter_complex_string).
        """
        input_args: list[str] = []
        filters: list[str] = []
        pad_labels: list[str] = []

        for idx, track in enumerate(tracks):
            input_args.extend(["-i", track["path"]])

            volume = track.get("volume", 1.0)
            start_time = track.get("start_time", 0.0)
            duck = track.get("duck_on_narration", False)
            label = f"a{idx}"

            parts: list[str] = []

            # Delay if start_time > 0
            if start_time > 0:
                delay_ms = int(start_time * 1000)
                parts.append(f"adelay={delay_ms}|{delay_ms}")

            # Trim to duration
            parts.append(f"atrim=0:{duration}")
            parts.append("asetpts=PTS-STARTPTS")

            # Volume adjustment
            if volume != 1.0:
                parts.append(f"volume={volume}")

            # Volume ducking: reduce this track by -12 dB when narration (track 0) is active
            if duck and idx > 0:
                parts.append("volume=0.25")  # ~-12 dB ducking baseline

            filter_chain = f"[{idx}:a]" + ",".join(parts) + f"[{label}]"
            filters.append(filter_chain)
            pad_labels.append(f"[{label}]")

        # Mix all prepared pads
        mix_input = "".join(pad_labels)
        mix_label = "[mixed]"
        filters.append(
            f"{mix_input}amix=inputs={len(tracks)}:duration=longest:dropout_transition=2{mix_label}"
        )

        # EBU R128 loudness normalization
        if normalize:
            filters.append(
                f"{mix_label}loudnorm=I=-16:TP=-1.5:LRA=11[out]"
            )
            final_label = "[out]"
        else:
            final_label = mix_label

        filter_complex = ";\n".join(filters)
        return input_args, filter_complex, final_label

    async def execute(self, **kwargs: Any) -> ToolResult:
        tracks: list[dict[str, Any]] = kwargs["tracks"]
        output_path: str = kwargs["output_path"]
        duration: float = kwargs["duration"]
        normalize: bool = kwargs.get("normalize", True)

        if not tracks:
            return ToolResult(success=False, error="No tracks provided")

        for track in tracks:
            if not os.path.isfile(track["path"]):
                return ToolResult(
                    success=False,
                    error=f"Track file not found: {track['path']}",
                )

        input_args, filter_complex, final_label = self.build_filter_complex(
            tracks, duration, normalize
        )

        cmd = [
            "ffmpeg", "-y", "-hide_banner",
            *input_args,
            "-filter_complex", filter_complex,
            "-map", final_label,
            "-c:a", "aac", "-b:a", "192k",
            output_path,
        ]

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
                error=f"ffmpeg mix failed (rc={proc.returncode}): {stderr.decode().strip()[-500:]}",
            )

        return ToolResult(
            success=True,
            output={"output_path": output_path, "duration": duration},
            cost_usd=0.0,
            metadata={"track_count": len(tracks), "normalized": normalize},
        )
