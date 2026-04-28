"""Foundry TTS — gpt-4o-mini-tts.

BaseTool wrapper that delegates to scripts/lib/tts_gen.py (the production
implementation). Calls gpt-4o-mini-tts on Azure OpenAI.

Design note: The TTS tool contract (voice presets, output format, cost tracking)
follows clean-room patterns inspired by OpenMontage's TTS tools (AGPL-3.0).
Slate targets Azure-native voice models exclusively.
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

# Make scripts/lib importable so we can call the real tts_gen implementation.
_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPTS_LIB = _REPO_ROOT / "scripts" / "lib"
if str(_SCRIPTS_LIB) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_LIB))

try:
    from tts_gen import (  # type: ignore
        TTS_COST_PER_SEC as _TTS_COST_PER_SEC,
        VOICES as _VOICES,
        _create_silence_wav as _create_silence_wav,
        estimate_speech_duration as _estimate_speech_duration,
        generate_tts as _generate_tts,
    )
    _IMPL_AVAILABLE = True
    _IMPORT_ERROR: str | None = None
except Exception as e:  # pragma: no cover - import-time guard
    _generate_tts = None  # type: ignore
    _create_silence_wav = None  # type: ignore
    _estimate_speech_duration = None  # type: ignore
    _TTS_COST_PER_SEC = 0.001  # type: ignore
    _VOICES: dict[str, str] = {}
    _IMPL_AVAILABLE = False
    _IMPORT_ERROR = f"{type(e).__name__}: {e}"


class FoundryTTS(BaseTool):
    """Text-to-speech using Azure gpt-4o-mini-tts."""

    name = "foundry_tts"

    @property
    def is_available(self) -> bool:
        from slate.core.azure_config import azure_config
        return azure_config.is_configured

    agent_skills = ["core/foundry-models"]
    version = "0.2.0"
    tier = ToolTier.VOICE
    capability = "Synthesize natural speech from text using Azure gpt-4o-mini-tts"
    provider = "azure-foundry"
    runtime = ToolRuntime.API
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "Text to synthesize"},
            "voice": {
                "type": "string",
                "default": "coral",
                "enum": ["coral", "echo", "shimmer", "onyx", "nova", "fable"],
                "description": "gpt-4o-mini-tts voice preset",
            },
            "speed": {"type": "number", "default": 1.0, "minimum": 0.25, "maximum": 4.0},
            "output_path": {"type": "string", "description": "Where to write the WAV file"},
        },
        "required": ["text"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "audio_path": {"type": "string"},
            "duration_seconds": {"type": "number"},
            "voice": {"type": "string"},
            "model": {"type": "string"},
        },
    }

    fallback_tools = []  # No fallback — gpt-4o-mini-tts is the only TTS path

    async def execute(self, **kwargs: Any) -> ToolResult:
        text: str = kwargs.get("text", "")
        voice: str = kwargs.get("voice", "coral")
        speed: float = kwargs.get("speed", 1.0)
        output_path: str | None = kwargs.get("output_path")
        instructions: str = kwargs.get("instructions", "") or ""

        if not text:
            return ToolResult(success=False, error="text is required", metadata={})

        if not _IMPL_AVAILABLE:
            return ToolResult(
                success=False,
                error=f"tts_gen implementation unavailable: {_IMPORT_ERROR}",
                metadata={"provider": self.provider},
            )

        if not output_path:
            output_dir = kwargs.get("output_dir", "output")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"foundry_tts_{uuid.uuid4().hex[:8]}.wav")
        else:
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        # The real impl accepts either preset names ('professional-female') or raw
        # OpenAI voice IDs ('coral', 'echo', ...). Pass the input through unchanged.
        start = time.monotonic()
        fallback_allowed = bool(kwargs.get("fallback_ok") or kwargs.get("dry_run"))
        if kwargs.get("dry_run"):
            if _create_silence_wav is None or _estimate_speech_duration is None:
                return ToolResult(
                    success=False,
                    error=f"tts_gen dry-run implementation unavailable: {_IMPORT_ERROR}",
                    metadata={"provider": self.provider, "model": "gpt-4o-mini-tts"},
                )
            voice_id = _VOICES.get(voice, voice)
            audio_duration = float(_estimate_speech_duration(text))
            await asyncio.to_thread(_create_silence_wav, output_path, audio_duration)
            return ToolResult(
                success=True,
                output={
                    "audio_path": output_path,
                    "duration_seconds": round(audio_duration, 2),
                    "voice": voice_id,
                    "speed": speed,
                    "word_count": len(text.split()),
                    "model": "gpt-4o-mini-tts",
                    "method": "dry-run-silence",
                    "size_kb": round(Path(output_path).stat().st_size / 1024),
                },
                cost_usd=round(audio_duration * _TTS_COST_PER_SEC, 6),
                duration_seconds=time.monotonic() - start,
                metadata={"text_length": len(text), "provider": self.provider, "model": "gpt-4o-mini-tts", "method": "dry-run-silence", "dry_run": True},
            )
        try:
            result = await asyncio.to_thread(
                _generate_tts,
                text,
                output_path,
                voice,
                instructions,
                allow_fallback=fallback_allowed,
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"{type(e).__name__}: {e}",
                duration_seconds=time.monotonic() - start,
                metadata={"provider": self.provider, "model": "gpt-4o-mini-tts"},
            )

        duration = time.monotonic() - start
        method = result.get("method", "unknown")
        if result.get("success") is False or method == "failed" or (method == "silence-fallback" and not fallback_allowed):
            return ToolResult(
                success=False,
                error=result.get("error") or "TTS generation failed",
                duration_seconds=duration,
                metadata={"provider": self.provider, "model": "gpt-4o-mini-tts", "method": method},
            )
        cost = float(result.get("cost", 0.0) or 0.0)
        audio_duration = float(result.get("duration", 0.0) or 0.0)

        return ToolResult(
            success=True,
            output={
                "audio_path": result.get("path", output_path),
                "duration_seconds": round(audio_duration, 2),
                "voice": result.get("voice", voice),
                "speed": speed,
                "word_count": result.get("word_count", len(text.split())),
                "model": "gpt-4o-mini-tts",
                "method": method,
                "size_kb": result.get("size_kb"),
            },
            cost_usd=round(cost, 6),
            duration_seconds=duration,
            metadata={
                "text_length": len(text),
                "provider": self.provider,
                "model": "gpt-4o-mini-tts",
                "method": method,
            },
        )
