"""Live subtitle pipeline — transcribe TTS audio via Azure gpt-4o-transcribe,
segment into timed captions, and burn onto scene images frame-by-frame.

Flow:
  TTS audio (WAV) → Azure gpt-4o-transcribe (word timestamps) → segment into phrases
  → generate one image per phrase with subtitle burned → FFmpeg image-sequence video

Primary: Azure gpt-4o-transcribe — 100 RPM, word-level timestamps.
Fallback: Estimated timestamps from known text + duration.
"""

import json
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

try:
    from subtitle_burner import burn_subtitle_on_image
except ImportError:
    from scripts.lib.subtitle_burner import burn_subtitle_on_image

# Azure configuration
from slate.core.azure_config import azure_config as _az_cfg

def _azure_endpoint():
    return _az_cfg.endpoint
TRANSCRIBE_DEPLOYMENT = "gpt-4o-transcribe"
TRANSCRIBE_API_VERSION = "2025-04-01-preview"



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


def transcribe_with_azure(audio_path: str) -> dict | None:
    """Transcribe audio via Azure gpt-4o-transcribe with word-level timestamps.

    Uses the OpenAI-compatible transcription API on Azure AI Services.
    Returns {"text": str, "words": [...], "duration": float} or None on failure.
    """
    token = _get_azure_token()
    if not token:
        print("  ⚠ Azure auth unavailable — skipping cloud transcription")
        return None

    try:
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return None

        url = (
            f"{_azure_endpoint()}/openai/deployments/{TRANSCRIBE_DEPLOYMENT}"
            f"/audio/transcriptions?api-version={TRANSCRIBE_API_VERSION}"
        )

        # Build multipart/form-data manually (no requests dependency)
        boundary = "----SlateTranscribeBoundary"
        body_parts = []

        # model field (required by Azure OpenAI)
        body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n{TRANSCRIBE_DEPLOYMENT}")
        # response_format = json (Azure 2025-04-01-preview rejects verbose_json;
        # word timestamps are returned when timestamp_granularities includes "word")
        body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"response_format\"\r\n\r\njson")
        # timestamp_granularities = word
        body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"timestamp_granularities[]\"\r\n\r\nword")

        # Audio file
        file_data = audio_file.read_bytes()
        # Determine content type
        suffix = audio_file.suffix.lower()
        content_type_map = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".flac": "audio/flac", ".ogg": "audio/ogg", ".m4a": "audio/mp4"}
        ct = content_type_map.get(suffix, "application/octet-stream")
        body_parts.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{audio_file.name}\"\r\nContent-Type: {ct}\r\n\r\n"
        )

        # Assemble body bytes
        body_bytes = b""
        for i, part in enumerate(body_parts[:-1]):
            body_bytes += part.encode("utf-8") + b"\r\n"
        # Last text part (file header) + binary file data
        body_bytes += body_parts[-1].encode("utf-8")
        body_bytes += file_data
        body_bytes += f"\r\n--{boundary}--\r\n".encode("utf-8")

        req = Request(url, data=body_bytes, method="POST")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

        with urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        # Parse response: verbose_json includes "words" array
        words = []
        for w in data.get("words", []):
            words.append({
                "word": w.get("word", "").strip(),
                "start": w.get("start", 0.0),
                "end": w.get("end", 0.0),
            })

        full_text = data.get("text", "")
        duration = words[-1]["end"] if words else data.get("duration", 0.0)

        return {"text": full_text, "words": words, "duration": duration}

    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:300] if hasattr(e, "read") else str(e)
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
    # 1. Try Azure gpt-4o-transcribe (cloud — 100 RPM, word timestamps)
    result = transcribe_with_azure(audio_path)
    if result and result.get("words"):
        print(f"     → Azure gpt-4o-transcribe: {len(result['words'])} words, {result['duration']:.1f}s")
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
