from __future__ import annotations

import sys
from pathlib import Path


SCRIPTS_LIB = Path(__file__).resolve().parents[1] / "scripts" / "lib"
if str(SCRIPTS_LIB) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_LIB))

import azure_speech_tts


def test_speech_credentials_prefer_environment(monkeypatch):
    monkeypatch.setenv("SLATE_AZURE_SPEECH_KEY", "test-key")
    monkeypatch.setenv("SLATE_AZURE_SPEECH_REGION", "westus2")

    assert azure_speech_tts._get_key_credentials() == ("test-key", "westus2")
    assert azure_speech_tts.is_configured() is True


def test_speech_credentials_require_key_and_region(monkeypatch):
    monkeypatch.setenv("SLATE_AZURE_SPEECH_KEY", "test-key")
    monkeypatch.delenv("SLATE_AZURE_SPEECH_REGION", raising=False)
    monkeypatch.delenv("SLATE_AZURE_LOCATION", raising=False)
    monkeypatch.setattr(azure_speech_tts, "_SUB", "")
    monkeypatch.setattr(azure_speech_tts, "_RG", "")
    monkeypatch.setattr(azure_speech_tts, "_ACCT", "")

    class EmptyKeyring:
        @staticmethod
        def get_password(service_name, username):
            return None

    monkeypatch.setitem(sys.modules, "keyring", EmptyKeyring)

    assert azure_speech_tts._get_key_credentials() == (None, None)
    assert azure_speech_tts.is_configured() is False