"""Tests for FFmpeg-based tools and subtitle generation."""

from __future__ import annotations

import asyncio
import os
import shutil
import struct
import tempfile
from pathlib import Path

import pytest

from slate.core.base_tool import ToolTier, ToolRuntime

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None
skip_no_ffmpeg = pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not on PATH")


@pytest.fixture()
def tmp_dir(tmp_path: Path):
    """Provide a temporary directory that's cleaned up automatically."""
    return tmp_path


def _write_wav_silence(path: str | Path, duration_s: float = 0.5, sample_rate: int = 16000) -> Path:
    """Write a minimal WAV file containing silence."""
    path = Path(path)
    num_channels = 1
    bits_per_sample = 16
    num_samples = int(sample_rate * duration_s)
    data_size = num_samples * num_channels * (bits_per_sample // 8)

    with open(path, "wb") as f:
        # RIFF header
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVE")
        # fmt chunk
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))  # chunk size
        f.write(struct.pack("<H", 1))   # PCM
        f.write(struct.pack("<H", num_channels))
        f.write(struct.pack("<I", sample_rate))
        f.write(struct.pack("<I", sample_rate * num_channels * bits_per_sample // 8))
        f.write(struct.pack("<H", num_channels * bits_per_sample // 8))
        f.write(struct.pack("<H", bits_per_sample))
        # data chunk
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        f.write(b"\x00" * data_size)

    return path


# ===========================================================================
# AudioProbe tests
# ===========================================================================

class TestAudioProbe:
    """Tests for the audio_probe tool."""

    @skip_no_ffmpeg
    @pytest.mark.asyncio
    async def test_probe_wav_file(self, tmp_dir: Path):
        from slate.tools.audio.audio_probe import AudioProbe

        wav = _write_wav_silence(tmp_dir / "test.wav", duration_s=1.0, sample_rate=44100)
        tool = AudioProbe()
        result = await tool.execute(audio_path=str(wav))

        assert result.success
        out = result.output
        assert abs(out["duration"] - 1.0) < 0.1
        assert out["sample_rate"] == 44100
        assert out["channels"] == 1
        assert out["codec"] == "pcm_s16le"
        assert out["format"] == "wav"

    @pytest.mark.asyncio
    async def test_probe_file_not_found(self):
        from slate.tools.audio.audio_probe import AudioProbe

        tool = AudioProbe()
        result = await tool.execute(audio_path="/nonexistent/audio.wav")

        assert not result.success
        assert "not found" in result.error.lower()

    def test_tool_metadata(self):
        from slate.tools.audio.audio_probe import AudioProbe

        tool = AudioProbe()
        assert tool.name == "audio_probe"
        assert tool.tier == ToolTier.ANALYZE
        assert tool.provider == "ffmpeg"
        assert tool.runtime == ToolRuntime.LOCAL


# ===========================================================================
# AudioMixer tests
# ===========================================================================

class TestAudioMixer:
    """Tests for the audio_mixer tool (filter_complex builder)."""

    def test_build_filter_two_tracks_normalized(self):
        from slate.tools.audio.audio_mixer import AudioMixer

        mixer = AudioMixer()
        tracks = [
            {"path": "narration.wav", "volume": 1.0, "start_time": 0, "duck_on_narration": False},
            {"path": "music.wav", "volume": 0.5, "start_time": 2.0, "duck_on_narration": True},
        ]

        input_args, fc, final_label = mixer.build_filter_complex(tracks, duration=30.0, normalize=True)

        # Two inputs
        assert input_args == ["-i", "narration.wav", "-i", "music.wav"]

        # Filter contains volume, delay, amix, and loudnorm
        assert "volume=0.5" in fc
        assert "adelay=" in fc
        assert "amix=inputs=2" in fc
        assert "loudnorm" in fc
        assert final_label == "[out]"

    def test_build_filter_no_normalize(self):
        from slate.tools.audio.audio_mixer import AudioMixer

        mixer = AudioMixer()
        tracks = [
            {"path": "a.wav", "volume": 1.0, "start_time": 0, "duck_on_narration": False},
        ]

        _, fc, final_label = mixer.build_filter_complex(tracks, duration=10.0, normalize=False)

        assert "loudnorm" not in fc
        assert final_label == "[mixed]"

    def test_build_filter_ducking_applied(self):
        from slate.tools.audio.audio_mixer import AudioMixer

        mixer = AudioMixer()
        tracks = [
            {"path": "narr.wav", "volume": 1.0, "start_time": 0, "duck_on_narration": False},
            {"path": "bg.wav", "volume": 0.8, "start_time": 0, "duck_on_narration": True},
        ]

        _, fc, _ = mixer.build_filter_complex(tracks, duration=5.0, normalize=True)

        # Track 1 (bg) should have ducking volume applied
        assert "volume=0.25" in fc

    @pytest.mark.asyncio
    async def test_execute_no_tracks(self):
        from slate.tools.audio.audio_mixer import AudioMixer

        mixer = AudioMixer()
        result = await mixer.execute(tracks=[], output_path="out.aac", duration=10.0)
        assert not result.success
        assert "no tracks" in result.error.lower()

    @pytest.mark.asyncio
    async def test_execute_missing_file(self, tmp_dir: Path):
        from slate.tools.audio.audio_mixer import AudioMixer

        mixer = AudioMixer()
        result = await mixer.execute(
            tracks=[{"path": str(tmp_dir / "nope.wav"), "volume": 1.0, "start_time": 0, "duck_on_narration": False}],
            output_path=str(tmp_dir / "out.aac"),
            duration=5.0,
        )
        assert not result.success
        assert "not found" in result.error.lower()

    def test_tool_metadata(self):
        from slate.tools.audio.audio_mixer import AudioMixer

        tool = AudioMixer()
        assert tool.name == "audio_mixer"
        assert tool.tier == ToolTier.CORE
        assert tool.provider == "ffmpeg"


# ===========================================================================
# MediaTranscode tests
# ===========================================================================

class TestMediaTranscode:
    """Tests for the media_transcode tool."""

    def test_quality_presets(self):
        from slate.tools.video.media_transcode import QUALITY_PRESETS

        assert QUALITY_PRESETS["draft"]["crf"] == 28
        assert QUALITY_PRESETS["draft"]["preset"] == "ultrafast"
        assert QUALITY_PRESETS["standard"]["crf"] == 23
        assert QUALITY_PRESETS["high"]["crf"] == 18
        assert QUALITY_PRESETS["ultra"]["crf"] == 15
        assert QUALITY_PRESETS["ultra"]["preset"] == "veryslow"

    def test_build_command_basic(self):
        from slate.tools.video.media_transcode import MediaTranscode

        cmd = MediaTranscode.build_command(
            input_path="in.mp4",
            output_path="out.mp4",
            codec="libx264",
            quality="standard",
        )

        assert cmd[0] == "ffmpeg"
        assert "-y" in cmd
        assert "-hide_banner" in cmd
        assert "-crf" in cmd
        idx = cmd.index("-crf")
        assert cmd[idx + 1] == "23"
        assert "-preset" in cmd
        pidx = cmd.index("-preset")
        assert cmd[pidx + 1] == "medium"
        assert cmd[-1] == "out.mp4"

    def test_build_command_with_resize_and_fps(self):
        from slate.tools.video.media_transcode import MediaTranscode

        cmd = MediaTranscode.build_command(
            input_path="in.mov",
            output_path="out.mp4",
            codec="libx264",
            quality="high",
            width=1920,
            height=1080,
            fps=30,
        )

        assert "-vf" in cmd
        vf_idx = cmd.index("-vf")
        assert "scale=1920:1080" in cmd[vf_idx + 1]
        assert "-r" in cmd
        r_idx = cmd.index("-r")
        assert cmd[r_idx + 1] == "30"

    def test_build_command_width_only(self):
        from slate.tools.video.media_transcode import MediaTranscode

        cmd = MediaTranscode.build_command(
            input_path="in.mp4",
            output_path="out.mp4",
            codec="libx264",
            quality="draft",
            width=1280,
        )

        vf_idx = cmd.index("-vf")
        assert "scale=1280:-2" in cmd[vf_idx + 1]

    @pytest.mark.asyncio
    async def test_execute_file_not_found(self):
        from slate.tools.video.media_transcode import MediaTranscode

        tool = MediaTranscode()
        result = await tool.execute(
            input_path="/nonexistent/video.mp4",
            output_path="out.mp4",
            quality="standard",
        )
        assert not result.success
        assert "not found" in result.error.lower()

    @pytest.mark.asyncio
    async def test_execute_invalid_quality(self, tmp_dir: Path):
        from slate.tools.video.media_transcode import MediaTranscode

        dummy = tmp_dir / "dummy.mp4"
        dummy.write_bytes(b"\x00" * 100)

        tool = MediaTranscode()
        result = await tool.execute(
            input_path=str(dummy),
            output_path=str(tmp_dir / "out.mp4"),
            quality="potato",
        )
        assert not result.success
        assert "invalid quality" in result.error.lower()

    def test_tool_metadata(self):
        from slate.tools.video.media_transcode import MediaTranscode

        tool = MediaTranscode()
        assert tool.name == "media_transcode"
        assert tool.tier == ToolTier.CORE
        assert tool.provider == "ffmpeg"


# ===========================================================================
# SubtitleGen tests
# ===========================================================================

SAMPLE_TRANSCRIPT = {
    "words": [
        {"word": "Hello", "start": 1.0, "end": 1.5},
        {"word": "world", "start": 1.5, "end": 2.0},
        {"word": "this", "start": 2.5, "end": 2.8},
        {"word": "is", "start": 2.8, "end": 3.0},
        {"word": "a", "start": 3.0, "end": 3.1},
        {"word": "subtitle", "start": 3.1, "end": 3.6},
        {"word": "generation", "start": 3.6, "end": 4.2},
        {"word": "test", "start": 4.2, "end": 4.5},
        {"word": "with", "start": 5.0, "end": 5.2},
        {"word": "multiple", "start": 5.2, "end": 5.6},
        {"word": "segments", "start": 5.6, "end": 6.0},
    ]
}


class TestSubtitleGen:
    """Tests for the subtitle_gen tool."""

    def test_word_grouping_max_words(self):
        from slate.tools.subtitle.subtitle_gen import group_words_into_segments

        segments = group_words_into_segments(
            SAMPLE_TRANSCRIPT["words"], max_words_per_line=4, max_chars_per_line=100
        )

        # 11 words / 4 per line = 3 segments
        assert len(segments) == 3
        assert segments[0]["text"] == "Hello world this is"
        assert segments[0]["start"] == 1.0
        assert segments[0]["end"] == 3.0

    def test_word_grouping_max_chars(self):
        from slate.tools.subtitle.subtitle_gen import group_words_into_segments

        # Very short char limit forces more segments
        segments = group_words_into_segments(
            SAMPLE_TRANSCRIPT["words"], max_words_per_line=100, max_chars_per_line=15
        )

        # Every segment's text should be <= 15 chars
        for seg in segments:
            assert len(seg["text"]) <= 15

    @pytest.mark.asyncio
    async def test_generate_srt(self, tmp_dir: Path):
        from slate.tools.subtitle.subtitle_gen import SubtitleGen

        out_path = tmp_dir / "test.srt"
        tool = SubtitleGen()
        result = await tool.execute(
            transcript=SAMPLE_TRANSCRIPT,
            output_path=str(out_path),
            format="srt",
            max_words_per_line=8,
            max_chars_per_line=42,
        )

        assert result.success
        content = out_path.read_text(encoding="utf-8")

        # SRT starts with sequence number "1"
        assert content.startswith("1\n")
        # SRT uses comma in timestamps
        assert "," in content.split("\n")[1]
        assert "-->" in content
        # Must not have WEBVTT header
        assert "WEBVTT" not in content

    @pytest.mark.asyncio
    async def test_generate_vtt(self, tmp_dir: Path):
        from slate.tools.subtitle.subtitle_gen import SubtitleGen

        out_path = tmp_dir / "test.vtt"
        tool = SubtitleGen()
        result = await tool.execute(
            transcript=SAMPLE_TRANSCRIPT,
            output_path=str(out_path),
            format="vtt",
            max_words_per_line=8,
            max_chars_per_line=42,
        )

        assert result.success
        content = out_path.read_text(encoding="utf-8")

        # VTT starts with WEBVTT
        assert content.startswith("WEBVTT")
        # VTT uses dot in timestamps
        lines = content.split("\n")
        ts_line = next(l for l in lines if "-->" in l)
        assert "." in ts_line

    @pytest.mark.asyncio
    async def test_srt_timestamp_format(self):
        from slate.tools.subtitle.subtitle_gen import _format_timestamp_srt

        assert _format_timestamp_srt(0.0) == "00:00:00,000"
        assert _format_timestamp_srt(61.5) == "00:01:01,500"
        assert _format_timestamp_srt(3661.123) == "01:01:01,123"

    @pytest.mark.asyncio
    async def test_vtt_timestamp_format(self):
        from slate.tools.subtitle.subtitle_gen import _format_timestamp_vtt

        assert _format_timestamp_vtt(0.0) == "00:00:00.000"
        assert _format_timestamp_vtt(61.5) == "00:01:01.500"
        assert _format_timestamp_vtt(3661.123) == "01:01:01.123"

    @pytest.mark.asyncio
    async def test_empty_transcript(self):
        from slate.tools.subtitle.subtitle_gen import SubtitleGen

        tool = SubtitleGen()
        result = await tool.execute(
            transcript={"words": []},
            output_path="out.srt",
            format="srt",
        )
        assert not result.success
        assert "no words" in result.error.lower()

    @pytest.mark.asyncio
    async def test_invalid_format(self, tmp_dir: Path):
        from slate.tools.subtitle.subtitle_gen import SubtitleGen

        tool = SubtitleGen()
        result = await tool.execute(
            transcript=SAMPLE_TRANSCRIPT,
            output_path=str(tmp_dir / "out.ass"),
            format="ass",
        )
        assert not result.success
        assert "unsupported format" in result.error.lower()

    def test_segment_count_in_output(self, tmp_dir: Path):
        from slate.tools.subtitle.subtitle_gen import SubtitleGen

        tool = SubtitleGen()
        result = asyncio.get_event_loop().run_until_complete(
            tool.execute(
                transcript=SAMPLE_TRANSCRIPT,
                output_path=str(tmp_dir / "test.srt"),
                format="srt",
            )
        )
        assert result.success
        assert result.output["segment_count"] > 0

    def test_tool_metadata(self):
        from slate.tools.subtitle.subtitle_gen import SubtitleGen

        tool = SubtitleGen()
        assert tool.name == "subtitle_gen"
        assert tool.tier == ToolTier.CORE
        assert tool.provider == "local"
        assert tool.runtime == ToolRuntime.LOCAL
