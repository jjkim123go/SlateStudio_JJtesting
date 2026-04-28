"""SubtitleGen — Generate SRT and VTT subtitle files from transcript word data."""

from __future__ import annotations

from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)


def _format_timestamp_srt(seconds: float) -> str:
    """Format seconds as SRT timestamp: HH:MM:SS,mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _format_timestamp_vtt(seconds: float) -> str:
    """Format seconds as VTT timestamp: HH:MM:SS.mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def group_words_into_segments(
    words: list[dict[str, Any]],
    max_words_per_line: int = 8,
    max_chars_per_line: int = 42,
) -> list[dict[str, Any]]:
    """Group words into subtitle segments respecting word and character limits.

    Each segment is: {"start": float, "end": float, "text": str}
    """
    segments: list[dict[str, Any]] = []
    current_words: list[dict[str, Any]] = []
    current_text = ""

    for word_entry in words:
        word = word_entry["word"]
        candidate = f"{current_text} {word}".strip() if current_text else word

        if current_words and (
            len(current_words) >= max_words_per_line
            or len(candidate) > max_chars_per_line
        ):
            # Flush the current segment
            segments.append({
                "start": current_words[0]["start"],
                "end": current_words[-1]["end"],
                "text": current_text,
            })
            current_words = []
            current_text = ""

        current_words.append(word_entry)
        current_text = f"{current_text} {word}".strip() if current_text else word

    # Flush remaining words
    if current_words:
        segments.append({
            "start": current_words[0]["start"],
            "end": current_words[-1]["end"],
            "text": current_text,
        })

    return segments


def render_srt(segments: list[dict[str, Any]]) -> str:
    """Render segments as SRT subtitle text."""
    lines: list[str] = []
    for idx, seg in enumerate(segments, start=1):
        start_ts = _format_timestamp_srt(seg["start"])
        end_ts = _format_timestamp_srt(seg["end"])
        lines.append(str(idx))
        lines.append(f"{start_ts} --> {end_ts}")
        lines.append(seg["text"])
        lines.append("")  # blank line separator
    return "\n".join(lines)


def render_vtt(segments: list[dict[str, Any]]) -> str:
    """Render segments as WebVTT subtitle text."""
    lines: list[str] = ["WEBVTT", ""]
    for seg in segments:
        start_ts = _format_timestamp_vtt(seg["start"])
        end_ts = _format_timestamp_vtt(seg["end"])
        lines.append(f"{start_ts} --> {end_ts}")
        lines.append(seg["text"])
        lines.append("")  # blank line separator
    return "\n".join(lines)


class SubtitleGen(BaseTool):
    """Generates SRT or VTT subtitle files from word-level transcript data."""

    name = "subtitle_gen"
    agent_skills = ["core/ffmpeg-audio"]
    version = "0.1.0"
    tier = ToolTier.CORE
    capability = "Generate SRT/VTT subtitle files from transcript word data"
    provider = "local"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA

    input_schema = {
        "type": "object",
        "properties": {
            "transcript": {
                "type": "object",
                "properties": {
                    "words": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word": {"type": "string"},
                                "start": {"type": "number"},
                                "end": {"type": "number"},
                            },
                            "required": ["word", "start", "end"],
                        },
                    },
                },
                "required": ["words"],
            },
            "output_path": {"type": "string"},
            "format": {"type": "string", "enum": ["srt", "vtt"]},
            "max_words_per_line": {"type": "integer", "default": 8},
            "max_chars_per_line": {"type": "integer", "default": 42},
        },
        "required": ["transcript", "output_path", "format"],
    }
    output_schema = {
        "type": "object",
        "properties": {
            "output_path": {"type": "string"},
            "format": {"type": "string"},
            "segment_count": {"type": "integer"},
        },
    }
    compliance_level = "general"
    data_residency = "in-tenant"

    async def execute(self, **kwargs: Any) -> ToolResult:
        transcript: dict = kwargs["transcript"]
        output_path: str = kwargs["output_path"]
        fmt: str = kwargs["format"]
        max_words: int = kwargs.get("max_words_per_line", 8)
        max_chars: int = kwargs.get("max_chars_per_line", 42)

        words = transcript.get("words", [])
        if not words:
            return ToolResult(success=False, error="Transcript contains no words")

        if fmt not in ("srt", "vtt"):
            return ToolResult(
                success=False,
                error=f"Unsupported format: {fmt!r}. Must be 'srt' or 'vtt'.",
            )

        segments = group_words_into_segments(words, max_words, max_chars)

        if fmt == "srt":
            content = render_srt(segments)
        else:
            content = render_vtt(segments)

        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(content)
        except OSError as exc:
            return ToolResult(success=False, error=f"Failed to write file: {exc}")

        return ToolResult(
            success=True,
            output={
                "output_path": output_path,
                "format": fmt,
                "segment_count": len(segments),
            },
            cost_usd=0.0,
            metadata={"word_count": len(words)},
        )
