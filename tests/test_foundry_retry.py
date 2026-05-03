from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path
from unittest import mock
from urllib.error import HTTPError

import pytest

from slate.core.foundry_retry import RetryConfig, calculate_wait, classify_http_error, parse_retry_after


def _http_error(code: int, body: bytes = b"error", headers: dict[str, str] | None = None) -> HTTPError:
    return HTTPError("https://example.test", code, "error", headers or {}, BytesIO(body))


def test_parse_retry_after_seconds():
    assert parse_retry_after(_http_error(429, headers={"Retry-After": "7"})) == 7


@pytest.mark.parametrize(
    ("code", "expected"),
    [(429, "rate_limit"), (500, "transient"), (503, "transient"), (408, "transient"), (401, "permanent"), (404, "permanent")],
)
def test_classify_http_error(code: int, expected: str):
    assert classify_http_error(_http_error(code)) == expected


def test_calculate_wait_honors_retry_after():
    config = RetryConfig(jitter=False, max_wait_sec=90)
    assert calculate_wait(0, "rate_limit", config, retry_after=12) == 12


def test_calculate_wait_exponential_without_jitter():
    config = RetryConfig(jitter=False, rate_limit_base_sec=15, transient_base_sec=1)
    assert calculate_wait(0, "rate_limit", config) == 15
    assert calculate_wait(1, "rate_limit", config) == 30
    assert calculate_wait(2, "transient", config) == 4


def test_tts_retries_429_then_succeeds(tmp_path: Path, monkeypatch):
    from scripts.lib import tts_gen

    monkeypatch.setattr(tts_gen, "_get_azure_token", lambda: "token")
    monkeypatch.setattr(tts_gen, "_write_word_sidecar", lambda *args, **kwargs: None)
    response = mock.MagicMock()
    response.read.return_value = b"RIFF\x24\x00\x00\x00WAVEfmt "
    response.__enter__.return_value = response
    response.__exit__.return_value = None
    calls = [_http_error(429, b"rate limited", {"Retry-After": "1"}), response]

    def fake_urlopen(*args, **kwargs):
        item = calls.pop(0)
        if isinstance(item, BaseException):
            raise item
        return item

    monkeypatch.setattr(tts_gen.urllib.request, "urlopen", fake_urlopen)
    with mock.patch("time.sleep") as sleep:
        result = tts_gen.generate_tts("Hello", str(tmp_path / "out.wav"), allow_fallback=False)

    assert result["method"] == "azure-openai-tts"
    sleep.assert_called_once_with(1)


def test_tts_permanent_error_fails_without_fallback(tmp_path: Path, monkeypatch):
    from scripts.lib import tts_gen

    monkeypatch.setattr(tts_gen, "_get_azure_token", lambda: "token")

    def fake_urlopen(*args, **kwargs):
        raise _http_error(401, b"unauthorized")

    monkeypatch.setattr(tts_gen.urllib.request, "urlopen", fake_urlopen)
    result = tts_gen.generate_tts("Hello", str(tmp_path / "out.wav"), allow_fallback=False)

    assert result["success"] is False
    assert "HTTP 401" in result["error"]
    assert not (tmp_path / "out.wav").exists()


def test_video_retries_429_then_succeeds(tmp_path: Path, monkeypatch):
    from scripts.lib import video_gen

    client = mock.MagicMock()
    video = mock.MagicMock()
    video.status = "completed"
    video.id = "video-1"
    content = mock.MagicMock()
    content.read.return_value = b"fake-mp4"
    client.videos.create_and_poll.side_effect = [Exception("429 rate limit"), video]
    client.videos.download_content.return_value = content
    monkeypatch.setattr(video_gen, "_get_client", lambda: client)
    monkeypatch.setattr(video_gen, "_strip_audio_track", lambda path: False)

    with mock.patch("time.sleep") as sleep:
        result = video_gen.generate_video_clip("shot", str(tmp_path / "out.mp4"), allow_fallback=False)

    assert result["method"] == "sora-2"
    assert client.videos.create_and_poll.call_count == 2
    sleep.assert_called()


def test_video_timeout_fails_loud_without_fallback(tmp_path: Path, monkeypatch):
    from scripts.lib import video_gen

    client = mock.MagicMock()
    monkeypatch.setattr(video_gen, "_get_client", lambda: client)
    monkeypatch.setattr(video_gen, "_run_with_timeout", mock.Mock(side_effect=TimeoutError("poll timeout")))

    result = video_gen.generate_video_clip("shot", str(tmp_path / "out.mp4"), allow_fallback=False)

    assert result["success"] is False
    assert "poll timeout" in result["error"]
    assert not (tmp_path / "out.mp4").exists()


def test_transcription_retries_429_then_succeeds(tmp_path: Path, monkeypatch):
    from scripts.lib import live_subtitles

    audio_path = tmp_path / "sample.wav"
    audio_path.write_bytes(b"fake-wav")
    monkeypatch.setattr(live_subtitles, "_get_azure_token", lambda: "token")
    monkeypatch.setattr(live_subtitles, "_PRIMARY_WORD_TIMESTAMP_SUPPORTED", False)
    monkeypatch.setattr(live_subtitles, "_wait_for_transcription_slot", lambda deployment: None)

    response = mock.MagicMock()
    response.read.return_value = (
        b'{"text":"Hello world","words":[{"word":"Hello","start":0,"end":0.4}]}'
    )
    response.__enter__.return_value = response
    response.__exit__.return_value = None
    calls = [_http_error(429, b"rate limited", {"Retry-After": "1"}), response]

    def fake_urlopen(*args, **kwargs):
        item = calls.pop(0)
        if isinstance(item, BaseException):
            raise item
        return item

    monkeypatch.setattr(live_subtitles, "urlopen", fake_urlopen)
    with mock.patch("time.sleep") as sleep:
        result = live_subtitles.transcribe_with_azure(str(audio_path))

    assert result["source"] == "whisper"
    assert result["words"][0]["word"] == "Hello"
    sleep.assert_called_once_with(1)


def test_load_word_sidecar(tmp_path: Path):
    from scripts.lib.live_subtitles import load_word_sidecar

    audio_path = tmp_path / "scene.wav"
    audio_path.write_bytes(b"fake")
    sidecar_path = tmp_path / "scene.words.json"
    sidecar_path.write_text(
        json.dumps({
            "source": "whisper",
            "words": [{"word": "Hi", "start": 0, "end": 0.2}],
        }),
        encoding="utf-8",
    )

    result = load_word_sidecar(str(audio_path))

    assert result["source"] == "whisper"
    assert result["words"][0]["word"] == "Hi"