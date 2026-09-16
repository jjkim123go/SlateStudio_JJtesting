"""Validate and securely store Azure Speech credentials for Slate."""

from __future__ import annotations

import getpass
import json
import sys
import urllib.error
import urllib.request

import keyring


SERVICE_NAME = "SlateAzureSpeech"


def main() -> int:
    region = input("Azure Speech region (for example, eastus): ").strip()
    if not region:
        print("Region is required.", file=sys.stderr)
        return 1

    api_key = getpass.getpass("Azure Speech key (input is hidden): ").strip()
    if not api_key:
        print("Speech key is required.", file=sys.stderr)
        return 1

    url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list"
    request = urllib.request.Request(
        url,
        headers={"Ocp-Apim-Subscription-Key": api_key},
    )
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            voices = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        print(
            f"Azure Speech rejected the credentials (HTTP {error.code}). "
            "Check the key and resource region.",
            file=sys.stderr,
        )
        return 1
    except Exception as error:
        print(f"Could not reach Azure Speech: {error}", file=sys.stderr)
        return 1

    keyring.set_password(SERVICE_NAME, "azure_api_key", api_key)
    keyring.set_password(SERVICE_NAME, "azure_region", region)
    english_voices = sum(
        1 for voice in voices if str(voice.get("Locale", "")).startswith("en-")
    )
    print(
        f"Azure Speech verified: {len(voices)} voices "
        f"({english_voices} English). Credentials saved to Windows Credential Manager."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())