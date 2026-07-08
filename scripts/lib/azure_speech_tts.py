"""Azure AI Speech (Foundry) text-to-speech backend for Slate.

Why this exists
---------------
`tts_gen.py` speaks to Azure OpenAI ``gpt-4o-mini-tts`` (6 fixed voices, no
word-level timing). This module is the preferred, higher-quality narration
engine: Azure AI Speech neural voices — **the full catalog** (700+ voices across
150+ locales, incl. DragonHD / Dragon HD Omni), explicit styles, and, crucially,
**word-boundary events** that give *true* word-level timing for captions (no
estimation drift).

Design notes
------------
- **No hardcoded voice list.** Voices are discovered live from the service's
  ``voices/list`` endpoint and cached. Callers/agents pick any voice by name and
  filter the catalog by locale / accent / gender / HD-tier / style.
- **Auth** reuses the same data-plane AAD token Slate already uses
  (``az account get-access-token --resource https://cognitiveservices.azure.com``),
  passed to Speech as ``aad#<resourceId>#<token>`` (verified working on the
  configured resource).
- **Synthesis** uses the Speech SDK so we capture ``synthesis_word_boundary``
  events in the same pass that writes the WAV.
"""

from __future__ import annotations

import json
import subprocess
import time
import wave
from pathlib import Path
from typing import Any, Optional
from xml.sax.saxutils import escape as _xml_escape

# ── Resource identity (region + resourceId) ──────────────────────────────────
try:  # slate is installed; fall back to env/yaml if not importable
    from slate.core.azure_config import azure_config as _CFG
    _REGION = _CFG.location or "eastus2"
    _SUB = _CFG.subscription_id
    _RG = _CFG.resource_group
    _ACCT = _CFG.resource_name
except Exception:  # pragma: no cover - defensive
    import os as _os
    _REGION = _os.environ.get("SLATE_AZURE_LOCATION", "eastus2")
    _SUB = _os.environ.get("SLATE_AZURE_SUBSCRIPTION_ID", "")
    _RG = _os.environ.get("SLATE_AZURE_RESOURCE_GROUP", "")
    _ACCT = _os.environ.get("SLATE_AZURE_RESOURCE", "")


def _resource_id() -> str:
    return (
        f"/subscriptions/{_SUB}/resourceGroups/{_RG}"
        f"/providers/Microsoft.CognitiveServices/accounts/{_ACCT}"
    )


# A sensible default: premium, GA, calm English HD voice. Callers should override
# per video / language. This is NOT a whitelist — any catalog voice is valid.
DEFAULT_VOICE = "en-US-Ava:DragonHDLatestNeural"
DEFAULT_SAMPLE_RATE = 24000  # matches the rest of the pipeline (24 kHz mono PCM)

_VOICE_CACHE = Path(__file__).resolve().parent.parent.parent / "output" / ".cache" / "azure_speech_voices.json"
_VOICE_CACHE_TTL_SEC = 7 * 24 * 3600


# ── Auth ─────────────────────────────────────────────────────────────────────
def _get_token() -> Optional[str]:
    try:
        r = subprocess.run(
            "az account get-access-token --resource https://cognitiveservices.azure.com "
            "--query accessToken -o tsv",
            capture_output=True, text=True, shell=True, timeout=30,
        )
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    except Exception:
        pass
    return None


def _aad_auth_token(token: str) -> str:
    """Speech AAD auth token format for a custom-subdomain resource."""
    return f"aad#{_resource_id()}#{token}"


# ── Voice catalog (full, cached, filterable) ─────────────────────────────────
def list_voices(
    locale: Optional[str] = None,
    gender: Optional[str] = None,
    hd_only: bool = False,
    style: Optional[str] = None,
    force_refresh: bool = False,
) -> list[dict[str, Any]]:
    """Return the live voice catalog, optionally filtered.

    Args:
        locale: prefix match, e.g. "en", "en-US", "fr-FR".
        gender: "Male" / "Female" (case-insensitive).
        hd_only: only NeuralHD / DragonHD voices.
        style: only voices that advertise this style in ``StyleList``.
        force_refresh: bypass the on-disk cache.
    """
    voices = _load_voice_catalog(force_refresh=force_refresh)
    out = voices
    if locale:
        loc = locale.lower()
        out = [v for v in out if (v.get("Locale", "").lower().startswith(loc))]
    if gender:
        g = gender.lower()
        out = [v for v in out if v.get("Gender", "").lower() == g]
    if hd_only:
        out = [v for v in out if "HD" in (v.get("VoiceType", "") or "")
               or "Dragon" in (v.get("ShortName", "") or "")]
    if style:
        s = style.lower()
        out = [v for v in out if any(s == (x or "").lower() for x in (v.get("StyleList") or []))]
    return out


def _load_voice_catalog(force_refresh: bool = False) -> list[dict[str, Any]]:
    if not force_refresh and _VOICE_CACHE.exists():
        age = time.time() - _VOICE_CACHE.stat().st_mtime
        if age < _VOICE_CACHE_TTL_SEC:
            try:
                return json.loads(_VOICE_CACHE.read_text(encoding="utf-8"))
            except Exception:
                pass
    voices = _fetch_voice_catalog()
    try:
        _VOICE_CACHE.parent.mkdir(parents=True, exist_ok=True)
        _VOICE_CACHE.write_text(json.dumps(voices, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass
    return voices


def _fetch_voice_catalog() -> list[dict[str, Any]]:
    import urllib.request
    token = _get_token()
    if not token:
        raise RuntimeError("No Azure token (az login?) — cannot list Speech voices")
    url = f"https://{_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list"
    req = urllib.request.Request(url, headers={"Authorization": _aad_auth_token(token)})
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ── SSML ─────────────────────────────────────────────────────────────────────
def build_ssml(
    text: str,
    voice: str,
    style: Optional[str] = None,
    role: Optional[str] = None,
    style_degree: Optional[float] = None,
    rate: Optional[str] = None,
    pitch: Optional[str] = None,
    temperature: Optional[float] = None,
) -> str:
    """Build SSML. Style/role wrap in mstts:express-as; rate/pitch in prosody.

    Only voices that support styles (Dragon HD Omni, or standard voices whose
    ``StyleList`` includes the style) will honor express-as; others ignore it.
    """
    locale = "-".join(voice.split("-")[:2]) if "-" in voice else "en-US"
    inner = _xml_escape(text)
    if rate or pitch:
        attrs = ""
        if rate:
            attrs += f' rate="{rate}"'
        if pitch:
            attrs += f' pitch="{pitch}"'
        inner = f"<prosody{attrs}>{inner}</prosody>"
    if style:
        deg = f' styledegree="{style_degree}"' if style_degree else ""
        role_attr = f' role="{role}"' if role else ""
        inner = f'<mstts:express-as style="{_xml_escape(style)}"{role_attr}{deg}>{inner}</mstts:express-as>'
    # DragonHD voices accept an expressiveness `temperature` via the voice tag.
    voice_params = f' parameters="temperature={temperature}"' if temperature is not None else ""
    return (
        '<speak version="1.0" '
        'xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="http://www.w3.org/2001/mstts" '
        f'xml:lang="{locale}">'
        f'<voice name="{_xml_escape(voice)}"{voice_params}>{inner}</voice>'
        "</speak>"
    )


# ── Synthesis (SDK; captures word boundaries) ────────────────────────────────
def synthesize(
    text: str,
    output_path: str,
    voice: str = DEFAULT_VOICE,
    style: Optional[str] = None,
    role: Optional[str] = None,
    style_degree: Optional[float] = None,
    rate: Optional[str] = None,
    pitch: Optional[str] = None,
    temperature: Optional[float] = None,
    capture_word_timings: bool = True,
) -> dict[str, Any]:
    """Synthesize ``text`` to a WAV at ``output_path`` using Azure AI Speech.

    Returns a dict: ``{audio_path, duration_seconds, voice, engine, words,
    method, sample_rate}``. ``words`` is ``[{word, start, end}]`` from real
    word-boundary events (empty if capture disabled or unavailable).
    """
    import azure.cognitiveservices.speech as speechsdk

    token = _get_token()
    if not token:
        raise RuntimeError("No Azure token (az login?) — cannot synthesize speech")

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    speech_config = speechsdk.SpeechConfig(auth_token=_aad_auth_token(token), region=_REGION)
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm
    )
    audio_config = speechsdk.audio.AudioOutputConfig(filename=str(out))
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    words: list[dict[str, Any]] = []
    if capture_word_timings:
        def _on_word_boundary(evt):  # noqa: ANN001
            # audio_offset is in 100-ns ticks; duration is a timedelta (newer SDK)
            try:
                start = float(evt.audio_offset) / 10_000_000.0
            except Exception:
                start = 0.0
            dur = getattr(evt, "duration", None)
            try:
                dur_s = dur.total_seconds() if hasattr(dur, "total_seconds") else float(dur) / 10_000_000.0
            except Exception:
                dur_s = 0.0
            wtext = getattr(evt, "text", "") or ""
            # Skip punctuation-only boundaries for cleaner caption timing
            if wtext.strip():
                words.append({"word": wtext, "start": round(start, 3), "end": round(start + dur_s, 3)})
        synthesizer.synthesis_word_boundary.connect(_on_word_boundary)

    ssml = build_ssml(text, voice, style=style, role=role, style_degree=style_degree, rate=rate, pitch=pitch, temperature=temperature)
    result = synthesizer.speak_ssml_async(ssml).get()

    reason = result.reason
    if reason == speechsdk.ResultReason.Canceled:
        details = result.cancellation_details
        raise RuntimeError(
            f"Azure Speech canceled: {details.reason} — {details.error_details}"
        )
    if reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        raise RuntimeError(f"Azure Speech synthesis failed: reason={reason}")

    duration = _wav_duration(out)
    return {
        "audio_path": str(out),
        "duration_seconds": duration,
        "voice": voice,
        "engine": "azure-speech",
        "method": "azure-speech-sdk",
        "sample_rate": DEFAULT_SAMPLE_RATE,
        "words": words,
        "words_source": "azure-speech-wordboundary" if words else "none",
    }


def _wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "r") as wf:
            return round(wf.getnframes() / float(wf.getframerate() or DEFAULT_SAMPLE_RATE), 3)
    except Exception:
        return 0.0


# ── Smoke test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    cat = list_voices()
    hd = list_voices(locale="en-US", hd_only=True)
    print(f"catalog: {len(cat)} voices | en-US HD: {len(hd)} "
          f"(e.g. {[v['ShortName'] for v in hd[:5]]})")

    out_path = sys.argv[1] if len(sys.argv) > 1 else "output/_speech_smoke.wav"
    res = synthesize(
        "An eval is just a test for an A.I. Vibes get you a demo. Evals get you a product.",
        out_path,
        voice=sys.argv[2] if len(sys.argv) > 2 else DEFAULT_VOICE,
    )
    print(f"synth OK: {res['duration_seconds']}s, {len(res['words'])} word timings -> {res['audio_path']}")
    print("first words:", res["words"][:6])
