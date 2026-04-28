"""Generate a Sora-2 12s clip for the PR 8a showcase videoClipMode variant.

Replaces output/assets/pr8a-stream-clip-test.mp4 with a real Sora-2 generation.
Backs up the test pattern first.
"""
import sys
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "lib"))

from video_gen import generate_video_clip  # noqa: E402

ASSET = ROOT / "output" / "assets" / "pr8a-stream-clip-test.mp4"
BACKUP = ROOT / "output" / "assets" / "pr8a-stream-clip-test.testpattern.mp4"

PROMPT = (
    "Wide cinematic shot of a modern Microsoft corporate all-hands meeting on a softly "
    "lit stage. A presenter in business-casual attire stands at a sleek lectern with a "
    "subtle Microsoft-blue accent light, gesturing toward a large background screen "
    "showing abstract data visualizations and a quarterly roadmap. Audience seats blurred "
    "in the foreground bokeh. Warm professional lighting, slow gentle dolly-in camera "
    "move. No on-screen text, no logos, no faces in close-up. Photorealistic, 4K corporate "
    "video aesthetic, shallow depth of field."
)

def main() -> int:
    if ASSET.exists() and not BACKUP.exists():
        shutil.copy2(ASSET, BACKUP)
        print(f"📦 Backed up test pattern → {BACKUP.name}")

    print(f"🎬 Generating Sora-2 clip → {ASSET}")
    result = generate_video_clip(
        prompt=PROMPT,
        output_path=str(ASSET),
        duration_sec=12,
        resolution="landscape",
    )
    print()
    print("Result:")
    for k, v in result.items():
        print(f"  {k}: {v}")

    if result.get("method") == "sora-2":
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
