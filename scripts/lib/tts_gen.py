"""Slate TTS generation using Azure OpenAI gpt-4o-mini-tts.

Design note: The TTS voice preset abstraction (mapping semantic names to provider
voice IDs) follows patterns from OpenMontage's tts_selector (AGPL-3.0). Slate's
implementation is Azure-exclusive, supporting gpt-4o-mini-tts via Azure OpenAI.
"""

import json
import struct
import subprocess
import time
import urllib.request
import wave
from pathlib import Path
from urllib.error import HTTPError

from slate.core.foundry_retry import RetryConfig, should_retry
from live_subtitles import estimate_word_timestamps, transcribe_audio


# Azure OpenAI TTS configuration
from slate.core.azure_config import azure_config as _az_cfg

def _azure_endpoint():
    return _az_cfg.endpoint
TTS_DEPLOYMENT = "gpt-4o-mini-tts"
TTS_API_VERSION = "2025-01-01-preview"
TTS_TIMEOUT_SEC = 90
TTS_RETRY_CONFIG = RetryConfig(timeout_sec=TTS_TIMEOUT_SEC, max_retries=2, max_wait_sec=90)
# Cost loaded from config/models.yaml via model_registry
try:
    from model_registry import tts_cost_per_sec as _tts_cost_per_sec
    TTS_COST_PER_SEC = _tts_cost_per_sec()
except ImportError:
    TTS_COST_PER_SEC = 0.001  # fallback USD per second

# Voice options for gpt-4o-mini-tts (OpenAI voice IDs)
VOICES = {
    "professional-female": "coral",
    "professional-male": "echo",
    "friendly-female": "shimmer",
    "friendly-male": "onyx",
    "narrator-female": "nova",
    "narrator-male": "fable",
}

DEFAULT_VOICE = "narrator-female"  # nova — warm, clear, works across video types

# ── Video-type-based voice selection ─────────────────────────────────────────
# Maps video type → list of preferred voice presets (cycled round-robin across
# scenes for variety).  Agent can pass video_type to auto-select.
VIDEO_TYPE_VOICES: dict[str, list[str]] = {
    "explainer":     ["narrator-female", "narrator-male"],          # nova, fable — measured, clear
    "corporate":     ["narrator-female", "professional-male"],      # nova, echo  — measured, authoritative
    "tutorial":      ["friendly-female", "narrator-female"],        # shimmer, nova — warm, conversational
    "marketing":     ["friendly-female", "friendly-male"],          # shimmer, onyx — energetic, engaging
    "internal":      ["narrator-male", "narrator-female"],          # fable, nova  — relaxed, informative
    "onboarding":    ["friendly-female", "narrator-female"],        # shimmer, nova — welcoming
}

def select_voice_for_scene(
    video_type: str = "explainer",
    scene_index: int = 0,
    override: str | None = None,
) -> str:
    """Pick a voice preset for a scene based on video type.

    Cycles through the preferred voices for the video type so multi-scene
    videos get natural variety without jarring switches.
    """
    if override:
        return override
    voices = VIDEO_TYPE_VOICES.get(video_type, VIDEO_TYPE_VOICES["explainer"])
    return voices[scene_index % len(voices)]


def _get_azure_token() -> str | None:
    """Get bearer token for Azure Cognitive Services."""
    try:
        result = subprocess.run(
            "az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken -o tsv",
            capture_output=True, text=True, timeout=30, shell=True
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def _create_silence_wav(output_path: str, duration_sec: float, sample_rate: int = 24000) -> str:
    """Create a silence WAV file as fallback."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    n_samples = int(sample_rate * duration_sec)
    with wave.open(str(out), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack(f"<{n_samples}h", *([0] * n_samples)))
    return str(out)


def estimate_speech_duration(text: str, wpm: int = 155) -> float:
    """Estimate speech duration from text (words per minute)."""
    word_count = len(text.split())
    return max(1.0, (word_count / wpm) * 60)


def _read_http_error(error: HTTPError) -> str:
    try:
        return error.read().decode("utf-8", errors="replace")[:300]
    except Exception:
        return str(error)


def _tts_api_request(text: str, voice_id: str, instructions: str, token: str) -> bytes:
    url = (
        f"{_azure_endpoint()}/openai/deployments/{TTS_DEPLOYMENT}"
        f"/audio/speech?api-version={TTS_API_VERSION}"
    )
    body = {
        "model": TTS_DEPLOYMENT,
        "input": text,
        "voice": voice_id,
        "response_format": "wav",
    }
    if instructions:
        body["instructions"] = instructions

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TTS_RETRY_CONFIG.timeout_sec) as resp:
        return resp.read()


def _write_word_sidecar(audio_path: str, text: str, duration_sec: float) -> None:
    sidecar_path = str(Path(audio_path).with_suffix(".words.json"))
    transcript = None
    try:
        transcript = transcribe_audio(audio_path)
    except Exception:
        transcript = None
    words = []
    source = "estimate"
    if transcript and isinstance(transcript, dict) and transcript.get("words"):
        words = transcript.get("words", [])
        source = "gpt-4o-transcribe"
    if not words:
        words = estimate_word_timestamps(text, duration_sec)
    payload = {
        "text": text,
        "duration": round(float(duration_sec or 0), 3),
        "source": source,
        "words": words,
    }
    Path(sidecar_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def generate_tts(
    text: str,
    output_path: str,
    voice: str = DEFAULT_VOICE,
    instructions: str = "",
    allow_fallback: bool = False,
) -> dict:
    """Generate TTS audio using Azure OpenAI gpt-4o-mini-tts.

    Args:
        text: Text to synthesize
        output_path: Where to save the WAV file
        voice: Voice preset name or OpenAI voice ID
        instructions: Optional style instructions (e.g., "Speak warmly and clearly")

    Returns:
        dict with path, duration, voice_used, method
    """
    voice_id = VOICES.get(voice, voice)
    duration_est = estimate_speech_duration(text)

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    token = _get_azure_token()
    if token:
        audio_data = None
        last_error = None
        for attempt in range(TTS_RETRY_CONFIG.max_retries + 1):
            try:
                audio_data = _tts_api_request(text, voice_id, instructions, token)
                break
            except HTTPError as e:
                body = _read_http_error(e)
                retry, error_class, wait = should_retry(e, attempt, TTS_RETRY_CONFIG)
                last_error = f"Azure OpenAI TTS HTTP {e.code}: {body}"
                if not retry:
                    print(f"  ❌ {last_error}")
                    break
                print(f"  ⚠️  TTS HTTP {e.code} ({error_class}); retrying in {wait:g}s")
                time.sleep(wait)
            except Exception as e:
                retry, error_class, wait = should_retry(e, attempt, TTS_RETRY_CONFIG)
                last_error = f"Azure OpenAI TTS error: {type(e).__name__}: {e}"
                if not retry:
                    print(f"  ❌ {last_error}")
                    break
                print(f"  ⚠️  TTS {error_class} error; retrying in {wait:g}s: {e}")
                time.sleep(wait)

        if audio_data:
            out.write_bytes(audio_data)

            # Calculate actual duration from WAV
            try:
                with wave.open(str(out), "r") as wf:
                    nframes = wf.getnframes()
                    framerate = wf.getframerate()
                    # OpenAI TTS returns INT_MAX nframes — calculate from file size
                    if nframes > 10_000_000:
                        data_bytes = len(audio_data) - 44  # WAV header ~ 44 bytes
                        bytes_per_sample = wf.getsampwidth() * wf.getnchannels()
                        duration_est = data_bytes / (bytes_per_sample * framerate)
                    else:
                        duration_est = nframes / framerate
            except Exception:
                pass

            _write_word_sidecar(str(out), text, duration_est)

            return {
                "path": str(out),
                "duration": round(duration_est, 2),
                "voice": voice_id,
                "method": "azure-openai-tts",
                "text_length": len(text),
                "word_count": len(text.split()),
                "size_kb": round(len(audio_data) / 1024),
                "cost": round(duration_est * TTS_COST_PER_SEC, 4),
            }
        if not allow_fallback:
            return _tts_failure(last_error or "Azure OpenAI TTS failed", voice_id, text)
    elif not allow_fallback:
        return _tts_failure("Azure OpenAI TTS token unavailable", voice_id, text)

    # Fallback: silence WAV
    print(f"  → Generating silence fallback ({duration_est:.1f}s)")
    _create_silence_wav(str(out), duration_est)
    _write_word_sidecar(str(out), text, duration_est)
    return {
        "path": str(out),
        "duration": round(duration_est, 2),
        "voice": voice_id,
        "method": "silence-fallback",
        "text_length": len(text),
        "word_count": len(text.split()),
        "cost": 0.0,
    }


def _tts_failure(error: str, voice_id: str, text: str) -> dict:
    return {
        "success": False,
        "error": error,
        "path": None,
        "duration": 0.0,
        "voice": voice_id,
        "method": "failed",
        "text_length": len(text),
        "word_count": len(text.split()),
        "cost": 0.0,
    }


def generate_scene_narrations(
    scenes: list[dict],
    output_dir: str,
    voice: str = DEFAULT_VOICE,
    video_type: str = "explainer",
) -> list[dict]:
    """Generate TTS for all scenes that have narration text.

    Args:
        scenes: List of scene dicts with 'id' and 'narration_text' keys
        output_dir: Directory to save audio files
        voice: Voice preset to use (overrides video_type selection if set)
        video_type: Video type for automatic voice selection (explainer, tutorial, etc.)

    Returns:
        List of result dicts with path, duration, etc.
    """
    results = []
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # If caller passed the old default, use video_type selection instead
    use_auto_voice = (voice == DEFAULT_VOICE)

    for i, scene in enumerate(scenes):
        text = scene.get("narration_text", "")
        if not text:
            results.append({"path": None, "duration": scene.get("duration", 3.0), "method": "none"})
            continue

        scene_id = scene.get("id", f"scene_{i:03d}")
        audio_path = str(out / f"{scene_id}.wav")
        scene_voice = select_voice_for_scene(video_type, i) if use_auto_voice else voice
        print(f"  🔊 Scene {i+1}/{len(scenes)} [{scene_id}]: {len(text.split())} words (voice: {scene_voice})")
        result = generate_tts(text, audio_path, voice=scene_voice)
        results.append(result)

    return results


if __name__ == "__main__":
    import sys
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("test_audio")
    out_dir.mkdir(parents=True, exist_ok=True)

    result = generate_tts(
        "Welcome to Contoso, where we're building the future of enterprise AI. "
        "In just sixty seconds, let me show you what's possible.",
        str(out_dir / "intro.wav"),
        voice="professional-female"
    )
    print(f"Generated: {result['path']} ({result['duration']:.1f}s, method={result['method']})")
