"""Slate video inspection tools — gives the self-review agent "eyes and ears".

Extracts sample frames (FFmpeg), probes audio levels, detects frozen frames
and silence gaps so the reviewer can catch quality issues that metadata-only
checks would miss.
"""

import json
import subprocess
from pathlib import Path


def _run(cmd: list[str], timeout: int = 60) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


# ── Frame extraction ─────────────────────────────────────────────────────────

def extract_sample_frames(
    video_path: str,
    output_dir: str,
    count: int = 6,
) -> list[dict]:
    """Extract evenly-spaced sample frames from a video.

    Returns list of dicts: {path, timestamp_sec, index}
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    vp = Path(video_path)
    if not vp.exists():
        return []

    # Get duration
    probe = _run([
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", str(vp)
    ])
    dur = 0.0
    try:
        dur = float(json.loads(probe.stdout)["format"]["duration"])
    except Exception:
        dur = 10.0  # fallback

    if dur <= 0:
        return []

    interval = dur / (count + 1)
    frames = []
    for i in range(1, count + 1):
        ts = round(interval * i, 2)
        frame_path = str(out / f"frame_{i:03d}_{ts:.1f}s.png")
        result = _run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning",
            "-ss", str(ts), "-i", str(vp),
            "-frames:v", "1", "-q:v", "2", frame_path
        ])
        if result.returncode == 0 and Path(frame_path).exists():
            frames.append({"path": frame_path, "timestamp_sec": ts, "index": i})

    return frames


# ── Frozen-frame detection ───────────────────────────────────────────────────

def detect_black_frames(
    video_path: str,
    min_duration: float = 0.5,
    pixel_threshold: float = 0.10,
) -> list[dict]:
    """Detect black/blank sections using FFmpeg blackdetect filter.

    Returns list of dicts: {start_sec, end_sec, duration_sec}
    A black section indicates missing content (failed asset load, gap between
    video clip and scene end, or missing image).
    """
    vp = Path(video_path)
    if not vp.exists():
        return []

    result = _run([
        "ffmpeg", "-i", str(vp),
        "-vf", f"blackdetect=d={min_duration}:pix_th={pixel_threshold}",
        "-an", "-f", "null", "-"
    ], timeout=120)

    blacks = []
    for line in result.stderr.splitlines():
        if "black_start:" in line:
            try:
                parts = line.split("black_start:")[1].strip()
                start = float(parts.split()[0])
                # Duration and end are on the same line
                dur = float(line.split("black_duration:")[1].strip().split()[0])
                end = float(line.split("black_end:")[1].strip().split()[0])
                blacks.append({
                    "start_sec": round(start, 2),
                    "end_sec": round(end, 2),
                    "duration_sec": round(dur, 2),
                })
            except (IndexError, ValueError):
                pass

    return blacks


def detect_frozen_frames(
    video_path: str,
    threshold_sec: float = 1.5,
    noise_threshold: float = 0.003,
) -> list[dict]:
    """Detect sections where the video is frozen (repeated identical frames).

    Uses FFmpeg's freezedetect filter.
    Returns list of dicts: {start_sec, end_sec, duration_sec}
    """
    vp = Path(video_path)
    if not vp.exists():
        return []

    result = _run([
        "ffmpeg", "-i", str(vp),
        "-vf", f"freezedetect=n={noise_threshold}:d={threshold_sec}",
        "-f", "null", "-"
    ], timeout=120)

    # Parse freezedetect output from stderr
    frozen = []
    current_start = None
    for line in result.stderr.splitlines():
        if "freeze_start" in line:
            try:
                current_start = float(line.split("freeze_start:")[1].strip().split()[0])
            except (IndexError, ValueError):
                pass
        elif "freeze_end" in line and current_start is not None:
            try:
                parts = line.split("freeze_end:")[1].strip().split()
                end = float(parts[0])
                frozen.append({
                    "start_sec": round(current_start, 2),
                    "end_sec": round(end, 2),
                    "duration_sec": round(end - current_start, 2),
                })
                current_start = None
            except (IndexError, ValueError):
                pass

    return frozen


# ── Audio analysis ───────────────────────────────────────────────────────────

def probe_audio_levels(video_path: str) -> dict | None:
    """Measure audio levels (peak, mean, silence gaps) in a video.

    Uses FFmpeg's volumedetect and silencedetect filters.
    Returns dict with mean_volume_db, max_volume_db, silence_ranges.
    """
    vp = Path(video_path)
    if not vp.exists():
        return None

    # Volume detection
    vol_result = _run([
        "ffmpeg", "-i", str(vp),
        "-af", "volumedetect",
        "-f", "null", "-"
    ], timeout=60)

    levels = {"mean_volume_db": None, "max_volume_db": None, "silence_ranges": []}
    for line in vol_result.stderr.splitlines():
        if "mean_volume:" in line:
            try:
                levels["mean_volume_db"] = float(line.split("mean_volume:")[1].strip().split()[0])
            except (IndexError, ValueError):
                pass
        elif "max_volume:" in line:
            try:
                levels["max_volume_db"] = float(line.split("max_volume:")[1].strip().split()[0])
            except (IndexError, ValueError):
                pass

    # Silence detection (gaps > 1s)
    sil_result = _run([
        "ffmpeg", "-i", str(vp),
        "-af", "silencedetect=noise=-40dB:d=1.0",
        "-f", "null", "-"
    ], timeout=60)

    sil_start = None
    for line in sil_result.stderr.splitlines():
        if "silence_start:" in line:
            try:
                sil_start = float(line.split("silence_start:")[1].strip().split()[0])
            except (IndexError, ValueError):
                pass
        elif "silence_end:" in line and sil_start is not None:
            try:
                parts = line.split("silence_end:")[1].strip().split()
                sil_end = float(parts[0])
                levels["silence_ranges"].append({
                    "start_sec": round(sil_start, 2),
                    "end_sec": round(sil_end, 2),
                    "duration_sec": round(sil_end - sil_start, 2),
                })
                sil_start = None
            except (IndexError, ValueError):
                pass

    return levels


# ── Full video inspection ────────────────────────────────────────────────────

def inspect_video(
    video_path: str,
    output_dir: str | None = None,
    frame_count: int = 6,
) -> dict:
    """Run a full inspection of a rendered video.

    Combines: frame extraction, frozen-frame detection, audio analysis.
    Returns a structured report the self-review agent can reason about.
    """
    vp = Path(video_path)
    if not vp.exists():
        return {"error": f"Video not found: {video_path}"}

    if output_dir is None:
        output_dir = str(vp.parent / "_review")

    frames = extract_sample_frames(video_path, output_dir, count=frame_count)
    frozen = detect_frozen_frames(video_path)
    blacks = detect_black_frames(video_path)
    audio = probe_audio_levels(video_path)

    # Quality flags
    issues = []
    if blacks:
        total_black = sum(b["duration_sec"] for b in blacks)
        issues.append(f"BLACK_FRAMES: {len(blacks)} sections ({total_black:.1f}s total)")
    if frozen:
        total_frozen = sum(f["duration_sec"] for f in frozen)
        issues.append(f"FROZEN_FRAMES: {len(frozen)} sections ({total_frozen:.1f}s total)")
    if audio:
        if audio["mean_volume_db"] is not None and audio["mean_volume_db"] < -35:
            issues.append(f"LOW_AUDIO: mean volume {audio['mean_volume_db']:.1f} dB")
        if audio["max_volume_db"] is not None and audio["max_volume_db"] > -0.5:
            issues.append(f"CLIPPING_RISK: max volume {audio['max_volume_db']:.1f} dB")
        long_silences = [s for s in audio["silence_ranges"] if s["duration_sec"] > 3.0]
        if long_silences:
            issues.append(f"LONG_SILENCE: {len(long_silences)} gaps > 3s")

    return {
        "video_path": video_path,
        "sample_frames": frames,
        "frozen_sections": frozen,
        "black_sections": blacks,
        "audio_levels": audio,
        "issues": issues,
        "issue_count": len(issues),
        "pass": len(issues) == 0,
    }
