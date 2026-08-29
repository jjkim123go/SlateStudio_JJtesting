"""Slate video composition using FFmpeg — combines images + audio → MP4.

Lineage: FFmpeg-centered audio mixing, transcoding, and concatenation carry
implementation lineage from OpenMontage's media assembly approach (AGPL-3.0).
Slate adds HyperFrames for visual composition and animation. See
docs/OPENMONTAGE_LINEAGE.md.
"""

import json
import subprocess
from pathlib import Path


def _run_ffmpeg(args: list[str], description: str = "", timeout: int = 300) -> bool:
    """Run FFmpeg command with error handling."""
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "warning"] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if result.returncode != 0:
            print(f"  ✗ FFmpeg error ({description}): {result.stderr[:500]}")
            return False
        return True
    except subprocess.TimeoutExpired:
        print(f"  ✗ FFmpeg timeout ({description})")
        return False
    except FileNotFoundError:
        print("  ✗ FFmpeg not found — is it installed?")
        return False


def create_scene_video(
    image_path: str,
    audio_path: str | None,
    output_path: str,
    duration: float,
    fps: int = 30,
    width: int = 1920,
    height: int = 1080,
) -> str | None:
    """Create a video from a static image + optional audio.

    Returns path to created video, or None on failure.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    args = [
        "-loop", "1",
        "-i", image_path,
        "-t", str(duration),
    ]

    if audio_path and Path(audio_path).exists():
        args += ["-i", audio_path]
        args += [
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
            "-r", str(fps),
            "-pix_fmt", "yuv420p",
            "-shortest",
            str(out),
        ]
    else:
        args += [
            "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "64k",
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
            "-r", str(fps),
            "-pix_fmt", "yuv420p",
            "-shortest",
            str(out),
        ]

    if _run_ffmpeg(args, f"scene video → {out.name}"):
        return str(out)
    return None


def concatenate_videos(
    video_paths: list[str],
    output_path: str,
) -> str | None:
    """Concatenate multiple scene videos into one using FFmpeg concat demuxer.

    Returns path to concatenated video, or None on failure.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    # Write concat list file
    concat_file = out.parent / "concat_list.txt"
    with open(concat_file, "w") as f:
        for vp in video_paths:
            # FFmpeg requires forward slashes in concat files
            safe_path = Path(vp).resolve().as_posix()
            f.write(f"file '{safe_path}'\n")

    args = [
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(out),
    ]

    if _run_ffmpeg(args, "concatenate"):
        concat_file.unlink(missing_ok=True)
        return str(out)
    return None


def burn_subtitles(
    video_path: str,
    srt_path: str,
    output_path: str,
    font_size: int = 24,
    font_color: str = "white",
    outline_color: str = "black",
) -> str | None:
    """Burn SRT subtitles into video.

    Returns path to subtitled video, or None on failure.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    # FFmpeg subtitles filter needs forward-slash escaped path
    srt_safe = str(Path(srt_path).resolve()).replace("\\", "/").replace(":", "\\\\:")

    args = [
        "-i", video_path,
        "-vf", f"subtitles='{srt_safe}':force_style='Fontsize={font_size},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,MarginV=30'",
        "-c:v", "libx264", "-crf", "18",
        "-c:a", "copy",
        str(out),
    ]

    if _run_ffmpeg(args, "burn subtitles"):
        return str(out)
    return None


def add_background_music(
    video_path: str,
    music_path: str,
    output_path: str,
    music_volume: float = 0.12,
) -> str | None:
    """Mix background music under existing video audio.

    Returns path to output video, or None on failure.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    args = [
        "-i", video_path,
        "-i", music_path,
        "-filter_complex",
        f"[1:a]aloop=loop=-1:size=2e+09,volume={music_volume}[music];"
        f"[0:a][music]amix=inputs=2:duration=first:dropout_transition=3[aout]",
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(out),
    ]

    if _run_ffmpeg(args, "add music"):
        return str(out)
    return None


def probe_video(video_path: str) -> dict | None:
    """Probe a video file for metadata (duration, resolution, codecs, has_audio).

    Returns dict with metadata, or None on failure.
    """
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            return None
        data = json.loads(result.stdout)
        fmt = data.get("format", {})
        streams = data.get("streams", [])

        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

        return {
            "duration": float(fmt.get("duration", 0)),
            "size_bytes": int(fmt.get("size", 0)),
            "format": fmt.get("format_name", "unknown"),
            "width": int(video_stream["width"]) if video_stream else 0,
            "height": int(video_stream["height"]) if video_stream else 0,
            "video_codec": video_stream.get("codec_name", "none") if video_stream else "none",
            "audio_codec": audio_stream.get("codec_name", "none") if audio_stream else "none",
            "has_audio": audio_stream is not None,
            "fps": eval(video_stream.get("r_frame_rate", "30/1")) if video_stream else 30,
        }
    except Exception as e:
        print(f"  ✗ Probe failed: {e}")
        return None


def create_clip_scene_video(
    clip_path: str,
    output_path: str,
    narration_path: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    duration: float | None = None,
    mute_original: bool = False,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
) -> str | None:
    """Create a scene video from a user-provided video clip.

    Supports:
    - Trimming (start_time/end_time or duration)
    - Looping short clips to fill target duration (prevents frame-freeze)
    - Overlaying TTS narration (narration_path)
    - Muting original audio (mute_original)
    - Rescaling to target resolution

    Returns path to created video, or None on failure.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    if not Path(clip_path).exists():
        print(f"  ✗ Clip not found: {clip_path}")
        return None

    # Probe clip duration to detect if looping is needed
    clip_dur = None
    probe = probe_video(clip_path)
    if probe:
        clip_dur = probe.get("duration", 0)

    args = []

    # If target duration exceeds clip length, use fast concat-based looping
    # instead of -stream_loop (which is very slow with scale + audio filters).
    needs_loop = (
        duration is not None
        and clip_dur is not None
        and clip_dur > 0
        and duration > clip_dur + 0.5  # half-second tolerance
        and start_time is None  # don't loop when trimming a subrange
    )

    actual_clip = clip_path
    if needs_loop:
        import math
        loops_needed = math.ceil(duration / clip_dur)
        print(f"  ↻ Clip {clip_dur:.1f}s < target {duration:.1f}s — concat {loops_needed}x to fill")
        # Fast concat: repeat the clip N times without re-encoding
        looped_path = str(out.parent / (out.stem + "_looped.mp4"))
        concat_file = out.parent / (out.stem + "_loop_list.txt")
        safe = Path(clip_path).resolve().as_posix()
        with open(concat_file, "w") as f:
            for _ in range(loops_needed):
                f.write(f"file '{safe}'\n")
        loop_args = [
            "-f", "concat", "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            looped_path,
        ]
        if _run_ffmpeg(loop_args, "loop concat", timeout=60):
            actual_clip = looped_path
            concat_file.unlink(missing_ok=True)
        else:
            # Fall back to stream_loop if concat fails
            args += ["-stream_loop", "-1"]

    # Input with optional trim
    if start_time is not None:
        args += ["-ss", str(start_time)]
    args += ["-i", actual_clip]
    if end_time is not None:
        args += ["-to", str(end_time - (start_time or 0))]
    elif duration is not None:
        args += ["-t", str(duration)]

    # Add narration if provided
    if narration_path and Path(narration_path).exists():
        args += ["-i", narration_path]

    # Video filter: scale + pad to target resolution
    vf = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2"
    args += ["-vf", vf, "-r", str(fps)]

    # Audio handling
    if narration_path and Path(narration_path).exists():
        if mute_original:
            # Replace original audio with narration
            args += ["-map", "0:v", "-map", "1:a"]
        else:
            # Mix original audio + narration
            args += [
                "-filter_complex",
                "[0:a]volume=0.3[orig];[1:a]volume=1.0[narr];[orig][narr]amix=inputs=2:duration=first[aout]",
                "-map", "0:v", "-map", "[aout]",
            ]
            # Remove -vf from args since we'll use it differently
            # Actually, we need both video filter and audio filter complex
            vf_idx = args.index("-vf")
            args.pop(vf_idx)  # Remove "-vf"
            args.pop(vf_idx)  # Remove the filter value
            args += ["-vf", vf]
    elif mute_original:
        args += ["-an"]  # Strip audio entirely

    args += [
        "-c:v", "libx264", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out),
    ]

    # Use longer timeout for looped clips (more data to process)
    ffmpeg_timeout = 600 if needs_loop else 300

    if _run_ffmpeg(args, f"clip scene → {out.name}", timeout=ffmpeg_timeout):
        # Clean up temporary looped file
        if needs_loop and actual_clip != clip_path:
            Path(actual_clip).unlink(missing_ok=True)
        return str(out)

    # Clean up on failure too
    if needs_loop and actual_clip != clip_path:
        Path(actual_clip).unlink(missing_ok=True)
    return None


def compose_from_scf(
    scf: dict,
    assets_dir: str,
    output_path: str,
) -> str | None:
    """Compose a full video from SCF data + generated assets.

    Expects:
      - scf: parsed SCF JSON with scenes
      - assets_dir: directory containing scene images and audio files
      - output_path: where to write final MP4

    Asset naming convention:
      - Images: {scene_id}.png
      - Audio: {scene_id}.wav

    Returns path to final MP4, or None on failure.
    """
    assets = Path(assets_dir)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    profile = scf.get("outputProfile", {})
    width = profile.get("width", 1920)
    height = profile.get("height", 1080)
    fps = profile.get("fps", 30)

    scenes = scf.get("scenes", [])
    if not scenes:
        print("  ✗ No scenes in SCF")
        return None

    # Step 1: Create individual scene videos
    scene_videos = []
    temp_dir = output.parent / "_temp_scenes"
    temp_dir.mkdir(parents=True, exist_ok=True)

    for i, scene in enumerate(scenes):
        scene_id = scene.get("id", f"scene_{i:03d}")
        duration = scene.get("duration", 5.0)
        image_file = assets / f"{scene_id}.png"
        audio_file = assets / f"{scene_id}.wav"

        if not image_file.exists():
            print(f"  ⚠ Missing image for scene '{scene_id}', skipping")
            continue

        scene_video = str(temp_dir / f"{scene_id}.mp4")
        audio_path = str(audio_file) if audio_file.exists() else None

        print(f"  🎬 Rendering scene {i+1}/{len(scenes)}: {scene_id} ({duration:.1f}s)")
        result = create_scene_video(
            str(image_file), audio_path, scene_video,
            duration=duration, fps=fps, width=width, height=height,
        )
        if result:
            scene_videos.append(result)

    if not scene_videos:
        print("  ✗ No scene videos were created")
        return None

    # Step 2: Concatenate all scene videos
    print(f"  🔗 Concatenating {len(scene_videos)} scenes...")
    final = concatenate_videos(scene_videos, str(output))

    # Cleanup temp files
    for sv in scene_videos:
        Path(sv).unlink(missing_ok=True)
    temp_dir.rmdir() if temp_dir.exists() else None

    if final:
        size_mb = Path(final).stat().st_size / (1024 * 1024)
        print(f"  ✅ Video saved: {final} ({size_mb:.1f} MB)")

    return final


if __name__ == "__main__":
    import sys
    # Quick test: create a 5-second test video from a single image
    test_dir = Path("test_compose")
    test_dir.mkdir(exist_ok=True)

    # Generate a test image
    from image_gen import generate_scene_image
    generate_scene_image(str(test_dir / "test.png"), "Test Scene", "This is a composition test")

    result = create_scene_video(
        str(test_dir / "test.png"), None,
        str(test_dir / "test_scene.mp4"), duration=5.0,
    )
    print(f"Test scene video: {result}")
