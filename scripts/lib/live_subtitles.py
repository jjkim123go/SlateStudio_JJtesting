"""Live subtitle pipeline — transcribe TTS audio via Azure transcription,
segment into timed captions, and burn onto scene images frame-by-frame.

Flow:
    TTS audio (WAV) → Azure transcription (word timestamps) → segment into phrases
  → generate one image per phrase with subtitle burned → FFmpeg image-sequence video

Primary: Azure gpt-4o-transcribe — text transcript when available.
Word timestamps: Azure Whisper fallback with RPM-aware backoff.
Fallback: Estimated timestamps from known text + duration.
"""

import json
import subprocess
import threading
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

try:
    from subtitle_burner import burn_subtitle_on_image
except ImportError:
    from scripts.lib.subtitle_burner import burn_subtitle_on_image

# Azure configuration
from slate.core.azure_config import azure_config as _az_cfg
from slate.core.foundry_retry import RetryConfig, should_retry

def _azure_endpoint():
    return _az_cfg.endpoint
TRANSCRIBE_DEPLOYMENT = "gpt-4o-transcribe"
TRANSCRIBE_API_VERSION = "2025-04-01-preview"
WORD_TIMESTAMP_FALLBACK_DEPLOYMENT = "whisper"
TRANSCRIBE_TIMEOUT_SEC = 120
TRANSCRIBE_RETRY_CONFIG = RetryConfig(
    timeout_sec=TRANSCRIBE_TIMEOUT_SEC,
    max_retries=3,
    rate_limit_base_sec=20,
    transient_base_sec=2,
    max_wait_sec=120,
)
WORD_TIMESTAMP_MIN_INTERVAL_SEC = 21.0

_WORD_TIMESTAMP_RATE_LIMITED_DEPLOYMENTS = {WORD_TIMESTAMP_FALLBACK_DEPLOYMENT}
_TRANSCRIPTION_THROTTLE_LOCK = threading.Lock()
_NEXT_TRANSCRIPTION_CALL_AT: dict[str, float] = {}
_PRIMARY_WORD_TIMESTAMP_SUPPORTED: bool | None = None



def _get_azure_token() -> str | None:
    try:
        result = subprocess.run(
            "az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken -o tsv",
            capture_output=True, text=True, timeout=30, shell=True,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def _read_http_error(error: HTTPError) -> str:
    try:
        return error.read().decode("utf-8", errors="replace")[:300]
    except Exception:
        return str(error)


def _wait_for_transcription_slot(deployment: str) -> None:
    if deployment not in _WORD_TIMESTAMP_RATE_LIMITED_DEPLOYMENTS:
        return

    with _TRANSCRIPTION_THROTTLE_LOCK:
        now = time.monotonic()
        next_call_at = _NEXT_TRANSCRIPTION_CALL_AT.get(deployment, 0.0)
        wait = max(0.0, next_call_at - now)
        _NEXT_TRANSCRIPTION_CALL_AT[deployment] = max(now, next_call_at) + WORD_TIMESTAMP_MIN_INTERVAL_SEC

    if wait > 0:
        print(f"  → Waiting {wait:.1f}s for Azure {deployment} RPM budget")
        time.sleep(wait)


def _post_transcription(audio_path: str, deployment: str, response_format: str, token: str) -> dict | None:
    audio_file = Path(audio_path)
    if not audio_file.exists():
        return None

    url = (
        f"{_azure_endpoint()}/openai/deployments/{deployment}"
        f"/audio/transcriptions?api-version={TRANSCRIBE_API_VERSION}"
    )

    boundary = "----SlateTranscribeBoundary"
    body_parts = []
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n{deployment}")
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"response_format\"\r\n\r\n{response_format}")
    if response_format == "verbose_json":
        body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"timestamp_granularities[]\"\r\n\r\nword")

    file_data = audio_file.read_bytes()
    suffix = audio_file.suffix.lower()
    content_type_map = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".flac": "audio/flac", ".ogg": "audio/ogg", ".m4a": "audio/mp4"}
    ct = content_type_map.get(suffix, "application/octet-stream")
    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{audio_file.name}\"\r\nContent-Type: {ct}\r\n\r\n"
    )

    body_bytes = b""
    for part in body_parts[:-1]:
        body_bytes += part.encode("utf-8") + b"\r\n"
    body_bytes += body_parts[-1].encode("utf-8")
    body_bytes += file_data
    body_bytes += f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = Request(url, data=body_bytes, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    for attempt in range(TRANSCRIBE_RETRY_CONFIG.max_retries + 1):
        _wait_for_transcription_slot(deployment)
        try:
            with urlopen(req, timeout=TRANSCRIBE_RETRY_CONFIG.timeout_sec) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            err_body = _read_http_error(e)
            retry, error_class, wait = should_retry(e, attempt, TRANSCRIBE_RETRY_CONFIG)
            if not retry:
                print(f"  ⚠ Azure transcription {deployment} HTTP {e.code}: {err_body}")
                return None
            print(f"  ⚠ Azure transcription {deployment} HTTP {e.code} ({error_class}); retrying in {wait:g}s")
            time.sleep(wait)
        except Exception as e:
            retry, error_class, wait = should_retry(e, attempt, TRANSCRIBE_RETRY_CONFIG)
            if not retry:
                print(f"  ⚠ Azure transcription {deployment} error: {e}")
                return None
            print(f"  ⚠ Azure transcription {deployment} {error_class} error; retrying in {wait:g}s: {e}")
            time.sleep(wait)

    return None


def _parse_transcription_response(data: dict, source: str) -> dict:
    words = []
    for w in data.get("words", []):
        words.append({
            "word": w.get("word", "").strip(),
            "start": w.get("start", 0.0),
            "end": w.get("end", 0.0),
        })

    full_text = data.get("text", "")
    duration = words[-1]["end"] if words else data.get("duration", 0.0)
    return {"text": full_text, "words": words, "duration": duration, "source": source}


def load_word_sidecar(audio_path: str) -> dict | None:
    """Load an existing word-timestamp sidecar next to a narration file."""
    sidecar_path = Path(audio_path).with_suffix(".words.json")
    if not sidecar_path.exists():
        return None
    try:
        payload = json.loads(sidecar_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict) or not isinstance(payload.get("words"), list):
        return None
    return payload


def transcribe_with_azure(audio_path: str) -> dict | None:
    """Transcribe audio via Azure gpt-4o-transcribe with word-level timestamps.

    Uses the OpenAI-compatible transcription API on Azure AI Services.
    Returns {"text": str, "words": [...], "duration": float} or None on failure.
    """
    token = _get_azure_token()
    if not token:
        print("  ⚠ Azure auth unavailable — skipping cloud transcription")
        return None

    global _PRIMARY_WORD_TIMESTAMP_SUPPORTED

    try:
        result = None
        if _PRIMARY_WORD_TIMESTAMP_SUPPORTED is not False:
            data = _post_transcription(audio_path, TRANSCRIBE_DEPLOYMENT, "json", token)
            result = _parse_transcription_response(data or {}, TRANSCRIBE_DEPLOYMENT)
            if result.get("words"):
                _PRIMARY_WORD_TIMESTAMP_SUPPORTED = True
                return result
            if data is not None:
                _PRIMARY_WORD_TIMESTAMP_SUPPORTED = False

        data = _post_transcription(audio_path, WORD_TIMESTAMP_FALLBACK_DEPLOYMENT, "verbose_json", token)
        return _parse_transcription_response(data or {}, WORD_TIMESTAMP_FALLBACK_DEPLOYMENT) if data else result

    except HTTPError as e:
        err_body = _read_http_error(e)
        print(f"  ⚠ Azure gpt-4o-transcribe HTTP {e.code}: {err_body}")
        return None
    except Exception as e:
        print(f"  ⚠ Azure gpt-4o-transcribe error: {e}")
        return None


def transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio with word-level timestamps.

    Priority: Azure gpt-4o-transcribe → estimated timestamps.

    Returns:
        {
            "text": str,
            "words": [{"word": str, "start": float, "end": float}, ...],
            "duration": float,
        }
    """
    # 1. Try Azure transcription (cloud; RPM-aware retry/backoff)
    result = transcribe_with_azure(audio_path)
    if result and result.get("words"):
        print(f"     → Azure {result.get('source', TRANSCRIBE_DEPLOYMENT)}: {len(result['words'])} words, {result['duration']:.1f}s")
        return result

    # 2. Fallback: return None → caller uses estimate_word_timestamps()
    print("  ⚠ All transcription backends failed — falling back to estimated timestamps")
    return None


def estimate_word_timestamps(narration: str, duration: float) -> list[dict]:
    """Estimate word-level timestamps from known text and TTS duration.

    Fallback when transcription is unavailable. Distributes words
    proportionally across the audio duration based on character length.
    """
    words = narration.split()
    if not words or duration <= 0:
        return []

    # Weight each word by character count (longer words take longer to say)
    weights = [len(w) + 1 for w in words]  # +1 for minimum duration
    total_weight = sum(weights)

    # Leave small buffer at start/end
    usable = duration * 0.95
    start_offset = duration * 0.025

    result = []
    cursor = start_offset
    for i, w in enumerate(words):
        word_dur = (weights[i] / total_weight) * usable
        result.append({
            "word": w,
            "start": round(cursor, 3),
            "end": round(cursor + word_dur, 3),
        })
        cursor += word_dur

    return result


def group_into_segments(
    words: list[dict],
    max_words: int = 8,
    max_chars: int = 45,
) -> list[dict]:
    """Group word timestamps into readable subtitle segments."""
    segments = []
    current_words = []
    current_text = ""

    for entry in words:
        word = entry["word"]
        candidate = f"{current_text} {word}".strip() if current_text else word

        if current_words and (
            len(current_words) >= max_words or len(candidate) > max_chars
        ):
            segments.append({
                "start": current_words[0]["start"],
                "end": current_words[-1]["end"],
                "text": current_text,
            })
            current_words = []
            current_text = ""

        current_words.append(entry)
        current_text = f"{current_text} {word}".strip() if current_text else word

    if current_words:
        segments.append({
            "start": current_words[0]["start"],
            "end": current_words[-1]["end"],
            "text": current_text,
        })

    return segments


def create_subtitle_frames(
    image_path: str,
    segments: list[dict],
    output_dir: str,
    font_size: int = 28,
) -> list[dict]:
    """Generate one image per subtitle segment with caption burned in.

    Returns list of {"path": str, "start": float, "end": float, "duration": float}
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    frames = []
    for i, seg in enumerate(segments):
        frame_path = str(out / f"sub_{i:04d}.png")
        burn_subtitle_on_image(image_path, seg["text"], frame_path, font_size=font_size)
        frames.append({
            "path": frame_path,
            "start": seg["start"],
            "end": seg["end"],
            "duration": seg["end"] - seg["start"],
        })

    return frames


def create_scene_video_with_subtitles(
    image_path: str,
    audio_path: str,
    output_path: str,
    segments: list[dict],
    frames_dir: str,
    duration: float,
    fps: int = 30,
    width: int = 1920,
    height: int = 1080,
) -> str | None:
    """Create scene video with timed subtitle frames.

    Uses FFmpeg concat demuxer with per-frame durations to show each
    subtitle segment for exactly its duration.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    frames = create_subtitle_frames(image_path, segments, frames_dir)

    if not frames:
        return None

    # Also need a "no subtitle" frame for gaps
    no_sub_path = str(Path(frames_dir) / "sub_nosub.png")
    # Copy original image as the no-subtitle frame
    import shutil
    # Use original without subtitle for gaps
    burn_subtitle_on_image(image_path, "", no_sub_path)

    # Build FFmpeg concat file with durations
    concat_file = Path(frames_dir) / "subtitle_concat.txt"
    entries = []

    # Before first subtitle
    if frames[0]["start"] > 0.05:
        entries.append((no_sub_path, frames[0]["start"]))

    for i, frame in enumerate(frames):
        entries.append((frame["path"], frame["duration"]))
        # Gap between this and next segment
        if i < len(frames) - 1:
            gap = frames[i + 1]["start"] - frame["end"]
            if gap > 0.05:
                entries.append((no_sub_path, gap))

    # After last subtitle to fill remaining duration
    last_end = frames[-1]["end"] if frames else 0
    remaining = duration - last_end
    if remaining > 0.05:
        entries.append((no_sub_path, remaining))

    with open(concat_file, "w") as f:
        for path, dur in entries:
            safe_path = Path(path).resolve().as_posix()
            f.write(f"file '{safe_path}'\n")
            f.write(f"duration {dur:.3f}\n")
        # FFmpeg concat needs the last file repeated
        if entries:
            safe_path = Path(entries[-1][0]).resolve().as_posix()
            f.write(f"file '{safe_path}'\n")

    # Build video from image sequence + audio
    args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "warning"]
    args += ["-f", "concat", "-safe", "0", "-i", str(concat_file)]

    if audio_path and Path(audio_path).exists():
        args += ["-i", audio_path]
        args += [
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
            "-r", str(fps),
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(out),
        ]
    else:
        args += [
            "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-vf", f"scale={width}:{height}",
            "-r", str(fps),
            "-c:a", "aac", "-b:a", "64k",
            "-shortest",
            str(out),
        ]

    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"  ✗ FFmpeg subtitle video error: {result.stderr[:300]}")
            return None
        return str(out)
    except Exception as e:
        print(f"  ✗ Subtitle video failed: {e}")
        return None
