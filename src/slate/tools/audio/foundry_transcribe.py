"""Foundry Transcribe — gpt-4o-transcribe contract stub.

Defines the BaseTool contract for audio transcription with word-level timestamps.
Currently a STUB that returns realistic mock transcript data for testing.

Production transcription is handled by scripts/lib/live_subtitles.py using
Azure gpt-4o-transcribe.
"""

from __future__ import annotations

import logging
import os
import struct
import time
import wave
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

logger = logging.getLogger(__name__)

# Realistic mock transcript fragments for stub output
_MOCK_SENTENCES = [
    "Welcome to the quarterly business review.",
    "Let's start by looking at the key metrics for this period.",
    "Revenue grew twelve percent year over year, exceeding our forecast.",
    "Customer satisfaction scores remained above ninety percent.",
    "We're on track to deliver all major milestones by end of quarter.",
]


def _get_wav_duration(audio_path: str) -> float:
    """Read duration from a WAV file header, or estimate from file size."""
    try:
        with wave.open(audio_path, "rb") as wav:
            frame_rate = wav.getframerate()
            if frame_rate > 0:
                return wav.getnframes() / frame_rate
    except (OSError, wave.Error, EOFError):
        pass

    try:
        with open(audio_path, "rb") as f:
            header = f.read(44)
            if len(header) >= 44 and header[:4] == b"RIFF":
                sample_rate = struct.unpack_from("<I", header, 24)[0]
                byte_rate = struct.unpack_from("<I", header, 28)[0]
                data_size = struct.unpack_from("<I", header, 40)[0]
                if byte_rate > 0:
                    return data_size / byte_rate
        # Fallback: estimate from file size (~48kB/s for 24kHz 16-bit mono)
        size = os.path.getsize(audio_path)
        return max(1.0, size / 48000)
    except (OSError, struct.error):
        return 10.0  # default assumption


def _generate_mock_words(duration: float) -> tuple[str, list[dict[str, Any]]]:
    """Build a realistic mock transcript with word timestamps."""
    words: list[dict[str, Any]] = []
    cursor = 0.0
    sentences_used: list[str] = []

    for sentence in _MOCK_SENTENCES:
        if cursor >= duration:
            break
        sentence_words = sentence.split()
        sentences_used.append(sentence)

        for w in sentence_words:
            word_dur = 0.3 + len(w) * 0.05  # longer words take more time
            if cursor + word_dur > duration:
                break
            words.append({
                "word": w,
                "start": round(cursor, 3),
                "end": round(cursor + word_dur, 3),
                "confidence": 0.97,
            })
            cursor += word_dur + 0.08  # small gap between words

        cursor += 0.4  # pause between sentences

    full_text = " ".join(sentences_used)
    return full_text, words


class FoundryTranscribe(BaseTool):
    """Transcribe audio using Azure gpt-4o-transcribe (STUB — see scripts/lib/live_subtitles.py)."""

    name = "foundry_transcribe"

    @property
    def is_available(self) -> bool:
        from slate.core.azure_config import azure_config
        return azure_config.is_configured

    agent_skills = ["core/foundry-models"]
    version = "0.2.0"
    tier = ToolTier.ANALYZE
    capability = "Transcribe audio with word-level timestamps using Azure gpt-4o-transcribe"
    provider = "azure-foundry"
    runtime = ToolRuntime.API
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "audio_path": {"type": "string", "description": "Path to audio file"},
            "language": {"type": "string", "default": "en"},
            "response_format": {
                "type": "string",
                "default": "verbose_json",
                "enum": ["json", "verbose_json", "text", "srt", "vtt"],
                "description": "Output format — use verbose_json for word timestamps",
            },
        },
        "required": ["audio_path"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "text": {"type": "string"},
            "words": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "word": {"type": "string"},
                        "start": {"type": "number"},
                        "end": {"type": "number"},
                        "confidence": {"type": "number"},
                    },
                },
            },
            "duration": {"type": "number"},
        },
    }

    fallback_tools = []  # Production fallback chain is in scripts/lib/live_subtitles.py

    async def execute(self, **kwargs: Any) -> ToolResult:
        audio_path: str = kwargs.get("audio_path", "")
        language: str = kwargs.get("language", "en")

        if not audio_path:
            return ToolResult(success=False, error="audio_path is required", metadata={})

        if not os.path.isfile(audio_path):
            return ToolResult(
                success=False,
                error=f"Audio file not found: {audio_path}",
                metadata={},
            )

        logger.info("STUB: Would call gpt-4o-transcribe on: %s", audio_path)
        logger.info("STUB: Language=%s", language)

        start = time.monotonic()

        audio_duration = _get_wav_duration(audio_path)

        # Cost: gpt-4o-transcribe ~$0.006/minute ($0.0001/sec)
        cost = audio_duration * 0.0001

        full_text, words = _generate_mock_words(audio_duration)

        duration = time.monotonic() - start

        return ToolResult(
            success=True,
            output={
                "text": full_text,
                "words": words,
                "duration": round(audio_duration, 2),
                "language": language,
                "model": "gpt-4o-transcribe",
                "stub": True,
            },
            cost_usd=round(cost, 6),
            duration_seconds=duration,
            metadata={
                "audio_path": audio_path,
                "audio_duration": round(audio_duration, 2),
                "word_count": len(words),
                "provider": self.provider,
                "model": "gpt-4o-transcribe",
            },
        )
