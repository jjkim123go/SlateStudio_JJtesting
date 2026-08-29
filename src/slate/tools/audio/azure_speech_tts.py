"""Azure AI Speech TTS — the preferred narration engine.

BaseTool wrapper around ``scripts/lib/azure_speech_tts.py``. Unlike
``foundry_tts`` (gpt-4o-mini-tts, 6 fixed voices), this exposes the **full live
Azure AI Speech catalog** (700+ neural voices across 150+ locales, incl.
DragonHD / Dragon HD Omni), speaking styles, and **real word-level timings**
for captions. Voices are discovered from the service — not a hardcoded list —
so agents/users can pick any voice by language, accent, gender, HD tier, or
style. Use ``action="list_voices"`` to browse/filter the catalog.

This Azure-native voice provider is a Slate extension to the model-routing
lineage documented in docs/OPENMONTAGE_LINEAGE.md.
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

# Make scripts/lib importable so we can call the real backend implementation.
_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPTS_LIB = _REPO_ROOT / "scripts" / "lib"
if str(_SCRIPTS_LIB) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_LIB))

try:
    import azure_speech_tts as _backend  # type: ignore
    _IMPL_AVAILABLE = True
    _IMPORT_ERROR: str | None = None
except Exception as e:  # pragma: no cover - import-time guard
    _backend = None  # type: ignore
    _IMPL_AVAILABLE = False
    _IMPORT_ERROR = f"{type(e).__name__}: {e}"

# Approx neural-HD price (varies by tier/region); used for cost reporting only.
_COST_PER_CHAR = 0.000016


class AzureSpeechTTS(BaseTool):
    """Text-to-speech using Azure AI Speech neural HD voices (full catalog)."""

    name = "azure_speech_tts"

    @property
    def is_available(self) -> bool:
        from slate.core.azure_config import azure_config
        return azure_config.is_configured

    agent_skills = ["core/foundry-models"]
    version = "0.1.0"
    tier = ToolTier.VOICE
    capability = (
        "Synthesize narration with Azure AI Speech neural HD voices — full live "
        "catalog (700+ voices, 150+ locales), styles, and real word-level timings"
    )
    provider = "azure-speech"
    runtime = ToolRuntime.API
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["synthesize", "list_voices"],
                "default": "synthesize",
                "description": "synthesize speech, or list/filter the live voice catalog",
            },
            "text": {"type": "string", "description": "Text to synthesize (for synthesize)"},
            "voice": {
                "type": "string",
                "default": "en-US-Ava:DragonHDLatestNeural",
                "description": (
                    "ANY Azure Speech voice short-name — not limited to a shortlist. "
                    "e.g. 'en-US-Andrew:DragonHDLatestNeural', 'en-GB-SoniaNeural', "
                    "'fr-FR-Vivienne:DragonHDLatestNeural'. Use action=list_voices to browse."
                ),
            },
            "style": {"type": "string", "description": "Optional speaking style (e.g. 'calm', 'excited') — style-capable voices only"},
            "temperature": {"type": "number", "minimum": 0.0, "maximum": 1.0, "description": "Expressiveness for DragonHD voices (higher = more expressive)"},
            "rate": {"type": "string", "description": "Optional prosody rate, e.g. '-8%', 'slow'"},
            "output_path": {"type": "string", "description": "Where to write the WAV file"},
            # list_voices filters:
            "locale": {"type": "string", "description": "Filter voices by locale prefix, e.g. 'en', 'en-GB'"},
            "gender": {"type": "string", "description": "Filter voices by gender: Male / Female"},
            "hd_only": {"type": "boolean", "default": False, "description": "Only NeuralHD / DragonHD voices"},
        },
        "required": [],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "audio_path": {"type": "string"},
            "duration_seconds": {"type": "number"},
            "voice": {"type": "string"},
            "word_count": {"type": "number"},
            "model": {"type": "string"},
            "voices": {"type": "array", "items": {"type": "object"}},
        },
    }

    fallback_tools = ["foundry_tts"]  # gpt-4o-mini-tts is the fallback engine

    async def execute(self, **kwargs: Any) -> ToolResult:
        if not _IMPL_AVAILABLE:
            return ToolResult(
                success=False,
                error=f"azure_speech_tts backend unavailable: {_IMPORT_ERROR}",
                metadata={"provider": self.provider},
            )

        action = kwargs.get("action", "synthesize")
        start = time.monotonic()

        if action == "list_voices":
            try:
                voices = await asyncio.to_thread(
                    _backend.list_voices,
                    kwargs.get("locale"),
                    kwargs.get("gender"),
                    bool(kwargs.get("hd_only", False)),
                    kwargs.get("style"),
                )
            except Exception as e:
                return ToolResult(
                    success=False,
                    error=f"{type(e).__name__}: {e}",
                    duration_seconds=time.monotonic() - start,
                    metadata={"provider": self.provider},
                )
            slim = [
                {k: v.get(k) for k in ("ShortName", "Gender", "Locale", "LocaleName", "VoiceType", "Status", "StyleList")}
                for v in voices
            ]
            return ToolResult(
                success=True,
                output={"count": len(slim), "voices": slim},
                cost_usd=0.0,
                duration_seconds=time.monotonic() - start,
                metadata={"provider": self.provider, "action": "list_voices"},
            )

        text: str = kwargs.get("text", "")
        if not text:
            return ToolResult(success=False, error="text is required for synthesize", metadata={})

        voice = kwargs.get("voice") or "en-US-Ava:DragonHDLatestNeural"
        output_path = kwargs.get("output_path")
        if not output_path:
            output_dir = kwargs.get("output_dir", "output")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"azure_speech_{uuid.uuid4().hex[:8]}.wav")
        else:
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        try:
            res = await asyncio.to_thread(
                _backend.synthesize,
                text,
                output_path,
                voice=voice,
                style=kwargs.get("style"),
                rate=kwargs.get("rate"),
                pitch=kwargs.get("pitch"),
                temperature=kwargs.get("temperature"),
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"{type(e).__name__}: {e}",
                duration_seconds=time.monotonic() - start,
                metadata={"provider": self.provider, "model": "azure-speech"},
            )

        audio_duration = float(res.get("duration_seconds", 0.0) or 0.0)
        words = res.get("words") or []
        return ToolResult(
            success=True,
            output={
                "audio_path": res.get("audio_path", output_path),
                "duration_seconds": round(audio_duration, 2),
                "voice": res.get("voice", voice),
                "word_count": len(text.split()),
                "word_timings": len(words),
                "model": "azure-speech",
                "method": res.get("method", "azure-speech-sdk"),
            },
            cost_usd=round(len(text) * _COST_PER_CHAR, 6),
            duration_seconds=time.monotonic() - start,
            metadata={
                "text_length": len(text),
                "provider": self.provider,
                "model": "azure-speech",
                "voice": res.get("voice", voice),
                "words_source": res.get("words_source", "azure-speech-wordboundary"),
            },
        )
