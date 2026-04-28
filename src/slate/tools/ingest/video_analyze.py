"""VideoAnalyze — Probe a video file with ffprobe + ffmpeg.

Returns:
- duration, resolution, fps, codec, bitrate
- has_audio + audio metadata (codec, sample rate, channels)
- scene_changes: list of timestamps where ffmpeg's scene filter detected cuts
- keyframes: extracted PNG paths at evenly-spaced timestamps (or scene changes)

All ffmpeg/ffprobe operations are local, free, and deterministic.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
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


async def _run(cmd: list[str], timeout: float = 120) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return -1, "", f"timed out after {timeout}s"
    return proc.returncode or 0, stdout.decode(errors="replace"), stderr.decode(errors="replace")


async def _ffprobe(video_path: str) -> dict[str, Any] | None:
    rc, out, err = await _run([
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", video_path,
    ])
    if rc != 0:
        logger.warning("ffprobe failed: %s", err)
        return None
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return None


async def _detect_scenes(video_path: str, threshold: float = 0.4, limit: int = 50) -> list[float]:
    """Run ffmpeg scene-change filter; return timestamps in seconds."""
    cmd = [
        "ffmpeg", "-hide_banner", "-nostats",
        "-i", video_path,
        "-filter:v", f"select='gt(scene,{threshold})',showinfo",
        "-f", "null", "-",
    ]
    rc, _out, err = await _run(cmd, timeout=180)
    if rc != 0 and not err:
        return []
    timestamps: list[float] = []
    for line in err.splitlines():
        idx = line.find("pts_time:")
        if idx == -1:
            continue
        tail = line[idx + len("pts_time:"):].split()
        if not tail:
            continue
        try:
            timestamps.append(float(tail[0]))
        except ValueError:
            continue
        if len(timestamps) >= limit:
            break
    return timestamps


async def _extract_keyframes(
    video_path: str, output_dir: Path, timestamps: list[float],
) -> list[dict[str, Any]]:
    """Extract a PNG at each timestamp."""
    output_dir.mkdir(parents=True, exist_ok=True)
    frames: list[dict[str, Any]] = []
    stem = Path(video_path).stem

    for i, ts in enumerate(timestamps):
        out_path = output_dir / f"{stem}_kf{i:03d}.png"
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-ss", f"{ts:.3f}",
            "-i", video_path,
            "-frames:v", "1",
            "-q:v", "2",
            str(out_path),
        ]
        rc, _out, _err = await _run(cmd, timeout=30)
        if rc == 0 and out_path.exists():
            frames.append({
                "timestamp": round(ts, 3),
                "path": str(out_path),
                "size_bytes": out_path.stat().st_size,
            })
    return frames


def _summarize_streams(probe: dict[str, Any]) -> dict[str, Any]:
    fmt = probe.get("format", {})
    streams = probe.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)

    summary: dict[str, Any] = {
        "duration": float(fmt.get("duration", 0) or 0),
        "size_bytes": int(fmt.get("size", 0) or 0),
        "format": fmt.get("format_name", "unknown"),
        "bitrate": int(fmt.get("bit_rate", 0) or 0),
    }
    if video:
        # FPS may be "30/1" or "30000/1001"
        fps_raw = video.get("r_frame_rate") or video.get("avg_frame_rate") or "0/1"
        try:
            num, den = fps_raw.split("/")
            fps = round(float(num) / float(den), 3) if float(den) else 0.0
        except (ValueError, ZeroDivisionError):
            fps = 0.0
        summary.update({
            "video_codec": video.get("codec_name", "unknown"),
            "width": int(video.get("width", 0) or 0),
            "height": int(video.get("height", 0) or 0),
            "fps": fps,
            "pix_fmt": video.get("pix_fmt", ""),
        })
    summary["has_audio"] = audio is not None
    if audio:
        summary["audio"] = {
            "codec": audio.get("codec_name", "unknown"),
            "sample_rate": int(audio.get("sample_rate", 0) or 0),
            "channels": int(audio.get("channels", 0) or 0),
        }
    return summary


class VideoAnalyze(BaseTool):
    """Probe a video file: duration, resolution, fps, codec, scene cuts, keyframes."""

    name = "video_analyze"
    version = "0.1.0"
    tier = ToolTier.ANALYZE
    capability = "Probe a video file for metadata, detect scene changes, and extract keyframe stills"
    provider = "ffmpeg"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Path to video file"},
            "extract_keyframes": {
                "type": "boolean", "default": True,
                "description": "Extract PNG stills at detected scene changes",
            },
            "max_keyframes": {"type": "integer", "default": 8, "minimum": 0, "maximum": 50},
            "scene_threshold": {
                "type": "number", "default": 0.4, "minimum": 0.05, "maximum": 1.0,
                "description": "ffmpeg scene-detect sensitivity (lower = more cuts)",
            },
            "output_dir": {
                "type": "string",
                "description": "Directory for extracted keyframes (default: <video>_keyframes)",
            },
        },
        "required": ["path"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "duration": {"type": "number"},
            "width": {"type": "integer"},
            "height": {"type": "integer"},
            "fps": {"type": "number"},
            "video_codec": {"type": "string"},
            "has_audio": {"type": "boolean"},
            "audio": {"type": "object"},
            "scene_changes": {"type": "array"},
            "keyframes": {"type": "array"},
        },
    }

    async def execute(self, **kwargs: Any) -> ToolResult:
        path = kwargs.get("path", "")
        if not path:
            return ToolResult(success=False, error="path is required")
        if not os.path.isfile(path):
            return ToolResult(success=False, error=f"File not found: {path}")

        start = time.monotonic()
        probe = await _ffprobe(path)
        if not probe:
            return ToolResult(
                success=False,
                error="ffprobe failed or returned invalid JSON. Is ffprobe installed?",
            )

        summary = _summarize_streams(probe)

        scene_changes: list[float] = []
        keyframes: list[dict[str, Any]] = []
        max_kf = int(kwargs.get("max_keyframes", 8))
        if max_kf > 0:
            threshold = float(kwargs.get("scene_threshold", 0.4))
            scene_changes = await _detect_scenes(path, threshold=threshold, limit=max_kf * 2)

            # Pick keyframe timestamps: scene changes if any, else evenly spaced
            duration = summary.get("duration", 0.0)
            timestamps: list[float]
            if scene_changes:
                timestamps = scene_changes[:max_kf]
            elif duration > 0:
                step = duration / (max_kf + 1)
                timestamps = [round(step * (i + 1), 3) for i in range(max_kf)]
            else:
                timestamps = []

            if kwargs.get("extract_keyframes", True) and timestamps:
                out_dir = Path(kwargs.get("output_dir") or f"{path}_keyframes")
                keyframes = await _extract_keyframes(path, out_dir, timestamps)

        summary["scene_changes"] = [round(t, 3) for t in scene_changes]
        summary["keyframes"] = keyframes
        summary["path"] = path

        return ToolResult(
            success=True,
            output=summary,
            cost_usd=0.0,
            duration_seconds=time.monotonic() - start,
            metadata={
                "path": path,
                "scene_change_count": len(scene_changes),
                "keyframe_count": len(keyframes),
            },
        )
