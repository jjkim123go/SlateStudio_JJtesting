"""Tests for Foundry API stub tools.

Validates that all four Foundry stubs:
- Have correct metadata (name, tier, provider, runtime)
- Return ToolResult with success=True
- Calculate costs reasonably
- Create stub files on disk
"""

from __future__ import annotations

import os
import wave

import pytest
import pytest_asyncio  # noqa: F401 — ensure plugin loads

from slate.core.base_tool import ToolResult, ToolRuntime, ToolStability, ToolTier
from slate.tools.audio.foundry_transcribe import FoundryTranscribe
from slate.tools.audio.foundry_tts import FoundryTTS
from slate.tools.graphics.foundry_image_gen import FoundryImageGen
from slate.tools.video.foundry_video_gen import FoundryVideoGen


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def image_gen():
    return FoundryImageGen()


@pytest.fixture
def tts():
    return FoundryTTS()


@pytest.fixture
def transcribe():
    return FoundryTranscribe()


@pytest.fixture
def video_gen():
    return FoundryVideoGen()


@pytest.fixture
def scratch_dir(tmp_path):
    """Provide a temp directory for stub output files."""
    return str(tmp_path)


# ---------------------------------------------------------------------------
# FoundryImageGen
# ---------------------------------------------------------------------------

class TestFoundryImageGen:
    def test_metadata(self, image_gen):
        assert image_gen.name == "foundry_image_gen"
        assert image_gen.tier == ToolTier.GENERATE
        assert image_gen.provider == "azure-foundry"
        assert image_gen.runtime == ToolRuntime.API
        assert image_gen.data_residency == "in-tenant"

    @pytest.mark.asyncio
    async def test_execute_success(self, image_gen, scratch_dir):
        result = await image_gen.execute(
            prompt="A serene mountain landscape at sunset",
            width=1024,
            height=1024,
            quality="standard",
            output_dir=scratch_dir,
            dry_run=True,
        )
        assert isinstance(result, ToolResult)
        assert result.success is True
        assert result.output["model"] == "gpt-image-2"
        assert result.output["stub"] is True

    @pytest.mark.asyncio
    async def test_cost_standard(self, image_gen, scratch_dir):
        result = await image_gen.execute(prompt="test", quality="medium", output_dir=scratch_dir, dry_run=True)
        assert result.cost_usd == pytest.approx(0.04)

    @pytest.mark.asyncio
    async def test_cost_high(self, image_gen, scratch_dir):
        result = await image_gen.execute(prompt="test", quality="high", output_dir=scratch_dir, dry_run=True)
        assert result.cost_usd == pytest.approx(0.04)  # flat rate per image

    @pytest.mark.asyncio
    async def test_creates_valid_png(self, image_gen, scratch_dir):
        result = await image_gen.execute(prompt="test", output_dir=scratch_dir, dry_run=True)
        path = result.output["image_path"]
        assert os.path.isfile(path)
        with open(path, "rb") as f:
            sig = f.read(8)
        assert sig == b"\x89PNG\r\n\x1a\n", "File should start with PNG signature"

    @pytest.mark.asyncio
    async def test_missing_prompt(self, image_gen):
        result = await image_gen.execute()
        assert result.success is False
        assert "prompt" in result.error.lower()


# ---------------------------------------------------------------------------
# FoundryTTS
# ---------------------------------------------------------------------------

class TestFoundryTTS:
    def test_metadata(self, tts):
        assert tts.name == "foundry_tts"
        assert tts.tier == ToolTier.VOICE
        assert tts.provider == "azure-foundry"
        assert tts.runtime == ToolRuntime.API

    @pytest.mark.asyncio
    async def test_execute_success(self, tts, scratch_dir):
        out_path = os.path.join(scratch_dir, "speech.wav")
        result = await tts.execute(
            text="Hello world, this is a test of the speech synthesis system.",
            voice="en-US-AvaNeural",
            output_path=out_path,
            dry_run=True,
        )
        assert isinstance(result, ToolResult)
        assert result.success is True
        assert result.output["model"] == "gpt-4o-mini-tts"
        assert result.output["duration_seconds"] > 0

    @pytest.mark.asyncio
    async def test_cost_scales_with_text(self, tts, scratch_dir):
        short = await tts.execute(text="Hi", output_path=os.path.join(scratch_dir, "s.wav"), dry_run=True)
        long_text = " ".join(["word"] * 300)
        long = await tts.execute(text=long_text, output_path=os.path.join(scratch_dir, "l.wav"), dry_run=True)
        assert long.output["duration_seconds"] > short.output["duration_seconds"]

    @pytest.mark.asyncio
    async def test_creates_valid_wav(self, tts, scratch_dir):
        out_path = os.path.join(scratch_dir, "out.wav")
        result = await tts.execute(text="Testing WAV creation.", output_path=out_path, dry_run=True)
        assert os.path.isfile(out_path)
        with open(out_path, "rb") as f:
            header = f.read(12)
        assert header[:4] == b"RIFF"
        assert header[8:12] == b"WAVE"

    @pytest.mark.asyncio
    async def test_wav_data_size_matches_duration(self, tts, scratch_dir):
        out_path = os.path.join(scratch_dir, "dur.wav")
        result = await tts.execute(text="One two three four five", output_path=out_path, dry_run=True)
        est_duration = result.output["duration_seconds"]
        assert est_duration > 0
        if result.output.get("method") == "silence-fallback":
            with wave.open(out_path, "rb") as wav:
                actual_duration = wav.getnframes() / wav.getframerate()
                assert wav.getnchannels() == 1
                assert wav.getsampwidth() == 2
            assert abs(actual_duration - est_duration) < 0.05

    @pytest.mark.asyncio
    async def test_missing_text(self, tts):
        result = await tts.execute()
        assert result.success is False

    @pytest.mark.asyncio
    async def test_failure_result_propagates(self, tts, monkeypatch, scratch_dir):
        import slate.tools.audio.foundry_tts as tts_module

        def fail(*args, **kwargs):
            return {"success": False, "error": "forced tts failure", "method": "failed"}

        monkeypatch.setattr(tts_module, "_generate_tts", fail)
        result = await tts.execute(text="hello", output_path=os.path.join(scratch_dir, "fail.wav"))

        assert result.success is False
        assert "forced tts failure" in result.error

    @pytest.mark.asyncio
    async def test_silence_fallback_requires_explicit_opt_in(self, tts, monkeypatch, scratch_dir):
        import slate.tools.audio.foundry_tts as tts_module

        def fallback(*args, **kwargs):
            return {"success": True, "path": args[1], "duration": 1.0, "method": "silence-fallback"}

        monkeypatch.setattr(tts_module, "_generate_tts", fallback)
        strict = await tts.execute(text="hello", output_path=os.path.join(scratch_dir, "strict.wav"))
        opted_in = await tts.execute(
            text="hello",
            output_path=os.path.join(scratch_dir, "fallback.wav"),
            fallback_ok=True,
        )

        assert strict.success is False
        assert opted_in.success is True
        assert opted_in.output["method"] == "silence-fallback"


# ---------------------------------------------------------------------------
# FoundryTranscribe
# ---------------------------------------------------------------------------

class TestFoundryTranscribe:
    def test_metadata(self, transcribe):
        assert transcribe.name == "foundry_transcribe"
        assert transcribe.tier == ToolTier.ANALYZE
        assert transcribe.provider == "azure-foundry"
        assert transcribe.runtime == ToolRuntime.API

    @pytest.mark.asyncio
    async def test_execute_success(self, tts, transcribe, scratch_dir):
        # First create a WAV file via TTS stub
        wav_path = os.path.join(scratch_dir, "input.wav")
        await tts.execute(
            text="Welcome to the quarterly business review. Let us discuss the results.",
            output_path=wav_path,
            dry_run=True,
        )
        result = await transcribe.execute(audio_path=wav_path, language="en")
        assert isinstance(result, ToolResult)
        assert result.success is True
        assert "text" in result.output
        assert "words" in result.output
        assert result.output["duration"] > 0
        assert result.output["model"] == "gpt-4o-transcribe"

    @pytest.mark.asyncio
    async def test_word_timestamps_ordered(self, tts, transcribe, scratch_dir):
        wav_path = os.path.join(scratch_dir, "ts.wav")
        await tts.execute(text="A short sentence for testing.", output_path=wav_path, dry_run=True)
        result = await transcribe.execute(audio_path=wav_path)
        words = result.output["words"]
        assert len(words) > 0
        for i in range(1, len(words)):
            assert words[i]["start"] >= words[i - 1]["start"], "Timestamps must be non-decreasing"

    @pytest.mark.asyncio
    async def test_cost_scales_with_audio_length(self, tts, transcribe, scratch_dir):
        short_wav = os.path.join(scratch_dir, "short.wav")
        await tts.execute(text="Hi", output_path=short_wav, dry_run=True)
        long_wav = os.path.join(scratch_dir, "long.wav")
        await tts.execute(text=" ".join(["word"] * 200), output_path=long_wav, dry_run=True)

        r_short = await transcribe.execute(audio_path=short_wav)
        r_long = await transcribe.execute(audio_path=long_wav)
        assert r_long.cost_usd > r_short.cost_usd

    @pytest.mark.asyncio
    async def test_missing_file(self, transcribe):
        result = await transcribe.execute(audio_path="/nonexistent/file.wav")
        assert result.success is False
        assert "not found" in result.error.lower()

    @pytest.mark.asyncio
    async def test_missing_audio_path(self, transcribe):
        result = await transcribe.execute()
        assert result.success is False


# ---------------------------------------------------------------------------
# FoundryVideoGen
# ---------------------------------------------------------------------------

class TestFoundryVideoGen:
    def test_metadata(self, video_gen):
        assert video_gen.name == "foundry_video_gen"
        assert video_gen.tier == ToolTier.GENERATE
        assert video_gen.provider == "azure-foundry"
        assert video_gen.runtime == ToolRuntime.API
        assert video_gen.compliance_level == "confidential"

    @pytest.mark.asyncio
    async def test_execute_success(self, video_gen, scratch_dir):
        result = await video_gen.execute(
            prompt="A cinematic drone shot over a coastal city at golden hour",
            duration=12,
            aspect_ratio="16:9",
            output_dir=scratch_dir,
            fallback_ok=True,
        )
        assert isinstance(result, ToolResult)
        assert result.success is True
        assert result.output["model"] in {"Sora-2", "fallback-ffmpeg"}
        assert result.output["resolution"] == "1280x720"  # Sora-2 max is 720p

    @pytest.mark.asyncio
    async def test_cost_scales_with_duration(self, video_gen, scratch_dir):
        r4 = await video_gen.execute(prompt="test", duration=4, output_dir=scratch_dir, fallback_ok=True)
        r12 = await video_gen.execute(prompt="test", duration=12, output_dir=scratch_dir, fallback_ok=True)
        assert r4.output["duration"] == 4
        assert r12.output["duration"] == 12

    @pytest.mark.asyncio
    async def test_creates_file_on_disk(self, video_gen, scratch_dir):
        result = await video_gen.execute(prompt="test", output_dir=scratch_dir, fallback_ok=True)
        path = result.output["video_path"]
        assert os.path.isfile(path)
        assert os.path.getsize(path) > 0

    @pytest.mark.asyncio
    async def test_aspect_ratios(self, video_gen, scratch_dir):
        for ar, expected_res in [("16:9", "1280x720"), ("9:16", "720x1280"), ("1:1", "480x480")]:
            result = await video_gen.execute(prompt="test", aspect_ratio=ar, output_dir=scratch_dir, fallback_ok=True)
            assert result.output["resolution"] == expected_res

    @pytest.mark.asyncio
    async def test_invalid_aspect_ratio(self, video_gen):
        result = await video_gen.execute(prompt="test", aspect_ratio="4:3")
        assert result.success is False

    @pytest.mark.asyncio
    async def test_duration_clamped(self, video_gen, scratch_dir):
        result = await video_gen.execute(prompt="test", duration=99, output_dir=scratch_dir, fallback_ok=True)
        assert result.output["duration"] == 12  # snapped to nearest valid: 4, 8, or 12
        assert result.output["requested_duration"] == 99
        assert result.output["duration_snapped"] is True

    @pytest.mark.asyncio
    async def test_missing_prompt(self, video_gen):
        result = await video_gen.execute()
        assert result.success is False

    @pytest.mark.asyncio
    async def test_failure_result_propagates(self, video_gen, monkeypatch, scratch_dir):
        import slate.tools.video.foundry_video_gen as video_module

        def fail(*args, **kwargs):
            return {"success": False, "error": "forced video failure", "method": "failed"}

        monkeypatch.setattr(video_module, "_generate_video_clip", fail)
        result = await video_gen.execute(prompt="hello", output_dir=scratch_dir)

        assert result.success is False
        assert "forced video failure" in result.error

    @pytest.mark.asyncio
    async def test_ffmpeg_fallback_requires_explicit_opt_in(self, video_gen, monkeypatch, scratch_dir):
        import slate.tools.video.foundry_video_gen as video_module

        def fallback(*args, **kwargs):
            return {
                "success": True,
                "output_path": args[1],
                "duration_sec": args[2],
                "resolution": "1280x720",
                "method": "fallback-ffmpeg",
            }

        monkeypatch.setattr(video_module, "_generate_video_clip", fallback)
        strict = await video_gen.execute(prompt="hello", output_dir=scratch_dir)
        opted_in = await video_gen.execute(prompt="hello", output_dir=scratch_dir, fallback_ok=True)

        assert strict.success is False
        assert opted_in.success is True
        assert opted_in.output["method"] == "fallback-ffmpeg"


# ---------------------------------------------------------------------------
# Cross-cutting: support_envelope
# ---------------------------------------------------------------------------

class TestSupportEnvelope:
    """Ensure all tools produce valid registry envelopes."""

    @pytest.mark.parametrize("tool_cls", [FoundryImageGen, FoundryTTS, FoundryTranscribe, FoundryVideoGen])
    def test_envelope_has_required_keys(self, tool_cls):
        tool = tool_cls()
        env = tool.support_envelope()
        for key in ("name", "version", "tier", "provider", "runtime", "compliance_level"):
            assert key in env, f"Missing key {key} in {tool.name} envelope"
        assert env["provider"] == "azure-foundry"
