"""Windows SAPI TTS — free, fully local narration fallback.

Escape hatch (P8) for projects with no Azure AI Foundry resource configured.
Uses the OS-native System.Speech.Synthesis engine via PowerShell — no network
call, no account, no cost. Voice quality is standard SAPI (not neural HD);
use azure_speech_tts / foundry_tts instead whenever Azure is configured.
"""

from __future__ import annotations

import asyncio
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

_PS_SCRIPT = """
param([string]$Text, [string]$OutputPath, [string]$VoiceName, [int]$Rate)
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ($VoiceName) {
    try { $synth.SelectVoice($VoiceName) } catch { }
}
$synth.Rate = $Rate
$synth.SetOutputToWaveFile($OutputPath)
$synth.Speak($Text)
$synth.Dispose()
"""


class WindowsTTS(BaseTool):
    """Text-to-speech using the Windows-native SAPI engine (offline, free)."""

    name = "windows_tts"
    version = "0.1.0"
    tier = ToolTier.VOICE
    capability = (
        "Synthesize narration locally using Windows built-in SAPI voices — "
        "offline, free, no Azure account required (lower quality than neural TTS)"
    )
    provider = "windows-sapi"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "local"

    input_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["synthesize", "list_voices"],
                "default": "synthesize",
            },
            "text": {"type": "string", "description": "Text to synthesize"},
            "voice": {"type": "string", "description": "Installed SAPI voice name (optional)"},
            "rate": {"type": "integer", "default": 0, "description": "SAPI rate, -10 to 10"},
            "output_path": {"type": "string", "description": "Where to write the WAV file"},
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
            "voices": {"type": "array", "items": {"type": "string"}},
        },
    }

    fallback_tools: list[str] = []

    @property
    def is_available(self) -> bool:
        return sys.platform == "win32" and shutil.which("powershell") is not None

    async def execute(self, **kwargs: Any) -> ToolResult:
        if not self.is_available:
            return ToolResult(
                success=False,
                error="windows_tts requires Windows with PowerShell available",
            )

        action = kwargs.get("action", "synthesize")

        if action == "list_voices":
            list_script = (
                "Add-Type -AssemblyName System.Speech; "
                "(New-Object System.Speech.Synthesis.SpeechSynthesizer)"
                ".GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }"
            )
            proc = await asyncio.to_thread(
                subprocess.run,
                ["powershell", "-NoProfile", "-Command", list_script],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if proc.returncode != 0:
                return ToolResult(success=False, error=proc.stderr.strip() or "list_voices failed")
            voices = [line.strip() for line in proc.stdout.splitlines() if line.strip()]
            return ToolResult(success=True, output={"voices": voices}, cost_usd=0.0)

        text = kwargs.get("text", "")
        output_path = kwargs.get("output_path")
        if not text or not output_path:
            return ToolResult(success=False, error="text and output_path are required")

        voice = kwargs.get("voice", "")
        rate = int(kwargs.get("rate", 0))
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".ps1", delete=False, encoding="utf-8"
        ) as tf:
            tf.write(_PS_SCRIPT)
            script_path = tf.name

        try:
            proc = await asyncio.to_thread(
                subprocess.run,
                [
                    "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                    "-File", script_path,
                    "-Text", text, "-OutputPath", str(out),
                    "-VoiceName", voice, "-Rate", str(rate),
                ],
                capture_output=True,
                text=True,
                timeout=120,
            )
        finally:
            Path(script_path).unlink(missing_ok=True)
        if proc.returncode != 0 or not out.exists():
            return ToolResult(
                success=False,
                error=f"SAPI synthesis failed: {proc.stderr.strip() or 'no output file'}",
            )

        duration = 0.0
        try:
            with wave.open(str(out), "rb") as wf:
                duration = wf.getnframes() / float(wf.getframerate())
        except Exception:
            pass

        return ToolResult(
            success=True,
            output={
                "audio_path": str(out),
                "duration_seconds": round(duration, 3),
                "voice": voice or "(default SAPI voice)",
                "word_count": len(text.split()),
            },
            cost_usd=0.0,
            metadata={"provider": self.provider},
        )
