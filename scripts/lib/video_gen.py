"""Slate Video Generation using Azure OpenAI Sora-2.

Generates video clips from text prompts via the Sora-2 model deployed on
Azure AI Foundry. Uses the OpenAI Python SDK with create_and_poll workflow.

Requires:
  pip install openai azure-identity

Auth: DefaultAzureCredential → https://ai.azure.com/.default
Endpoint: https://{resource}.openai.azure.com/openai/v1/

Design note: The video generation tool contract (provider abstraction, fallback
handling, duration snapping) follows patterns established in OpenMontage's
video_selector (AGPL-3.0). Slate's implementation is Azure-exclusive, using
Sora-2 via the OpenAI SDK with Azure identity federation.
"""

import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from pathlib import Path

from slate.core.foundry_retry import RetryConfig, should_retry

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

try:
    from openai import OpenAI
    from azure.identity import DefaultAzureCredential, get_bearer_token_provider
    HAS_SDK = True
except ImportError:
    HAS_SDK = False

# Azure OpenAI Sora-2 configuration
from slate.core.azure_config import azure_config as _az_cfg

def _azure_resource():
    return _az_cfg.resource_name

def _azure_base_url():
    return f"https://{_azure_resource()}.openai.azure.com/openai/v1/"
VIDEO_DEPLOYMENT = "sora"  # deployment name (model: sora-2)

# Sora-2 supports: 480x480, 480x720, 720x480, 720x1280, 1280x720
RESOLUTIONS = {
    "landscape": "1280x720",
    "portrait": "720x1280",
    "square": "480x480",
    "720p": "1280x720",
    "720p-portrait": "720x1280",
    "480p": "480x480",
}

DEFAULT_RESOLUTION = "landscape"
VALID_DURATIONS = [4, 8, 12]  # Sora-2 only supports these exact values
DEFAULT_DURATION_SEC = 4
POLL_INTERVAL_SEC = 5
MAX_POLL_TIME_SEC = 240  # 4 minutes max wait per Sora polling attempt
DOWNLOAD_TIMEOUT_SEC = 60
VIDEO_RETRY_CONFIG = RetryConfig(max_retries=2, rate_limit_base_sec=15, transient_base_sec=5, max_wait_sec=90, timeout_sec=MAX_POLL_TIME_SEC)

# Cost — loaded from config/models.yaml via model_registry
try:
    from model_registry import video_cost_per_sec as _video_cost_per_sec
    SORA2_BASE_COST_PER_SEC = _video_cost_per_sec("sora-2")
except ImportError:
    SORA2_BASE_COST_PER_SEC = 0.20  # fallback USD per second at 1080p
_REF_PIXELS = 1920 * 1080


def _snap_duration(requested: int) -> int:
    """Snap to nearest valid Sora-2 duration (4, 8, or 12 seconds)."""
    return min(VALID_DURATIONS, key=lambda v: abs(v - requested))


def _estimate_cost(duration_sec: int, resolution_key: str) -> float:
    """Return estimated USD cost for a Sora-2 generation."""
    size_str = RESOLUTIONS.get(resolution_key, RESOLUTIONS[DEFAULT_RESOLUTION])
    w, h = (int(x) for x in size_str.split("x"))
    scale = (w * h) / _REF_PIXELS
    return round(_snap_duration(duration_sec) * SORA2_BASE_COST_PER_SEC * scale, 2)

_client = None

# ── Sora-2 prompt guidelines ─────────────────────────────────────────────────
# Sora-2 moderation blocks abstract/AI-visualization prompts but passes
# concrete physical/human/environmental scenes. This sanitizer detects risky
# patterns and rewrites them into grounded visual descriptions.

_RISKY_ABSTRACT = re.compile(
    r"\b(data\s+stream|neural\s+network|binary\s+code|code\s+matrix|"
    r"flowing\s+data|digital\s+pipeline|abstract\s+ai|glowing\s+circuit|"
    r"cyber\s+grid|holographic\s+display|ai\s+brain|machine\s+learning\s+visualization|"
    r"algorithmic\s+pattern|quantum\s+computation|data\s+flow)\b",
    re.IGNORECASE,
)

_CONCRETE_REWRITES = {
    "data stream": "a modern glass-walled office with large monitors showing colorful dashboards",
    "neural network": "a team of engineers collaborating at whiteboards with architectural diagrams",
    "binary code": "hands typing on a laptop keyboard in a well-lit workspace",
    "code matrix": "a developer workspace with multiple monitors showing code editors",
    "flowing data": "a modern data center hallway with blinking server racks",
    "digital pipeline": "an automated factory floor with robotic assembly lines",
    "abstract ai": "a diverse team discussing ideas around a conference table",
    "glowing circuit": "close-up of a circuit board being manufactured in a clean room",
    "cyber grid": "an aerial view of a smart city at twilight with lit buildings",
    "holographic display": "a presenter gesturing at a large touchscreen display in a conference room",
    "ai brain": "a research lab with scientists examining data on large screens",
    "machine learning visualization": "a researcher annotating images on a tablet in a lab",
    "algorithmic pattern": "geometric architectural patterns in a modern building facade",
    "quantum computation": "a clean room with scientists working around specialized equipment",
    "data flow": "an overhead view of a modern office with people working at standing desks",
}


def sanitize_video_prompt(prompt: str) -> str:
    """Rewrite abstract/AI-visualization prompts into concrete visual scenes.

    Sora-2 moderation tends to block prompts with abstract tech/AI imagery.
    This function detects risky patterns and replaces them with grounded,
    physical alternatives that convey similar themes.

    Returns the sanitized prompt (may be unchanged if no risky patterns found).
    """
    modified = prompt
    changes = []
    for pattern, replacement in _CONCRETE_REWRITES.items():
        regex = re.compile(re.escape(pattern), re.IGNORECASE)
        if regex.search(modified):
            modified = regex.sub(replacement, modified)
            changes.append(f"'{pattern}' → grounded visual")

    if changes:
        print(f"    🔄 Prompt sanitized: {', '.join(changes)}")

    return modified


def _get_client() -> "OpenAI | None":
    """Get or create a cached OpenAI client for Sora-2."""
    global _client
    if _client is not None:
        return _client
    if not HAS_SDK:
        print("    ⚠️  openai/azure-identity packages not installed")
        return None
    try:
        token_provider = get_bearer_token_provider(
            DefaultAzureCredential(), "https://ai.azure.com/.default"
        )
        _client = OpenAI(
            base_url=_azure_base_url(),
            api_key=token_provider(),
        )
        return _client
    except Exception as e:
        print(f"    ⚠️  Failed to create OpenAI client: {e}")
        return None


def _strip_audio_track(video_path: str) -> bool:
    """Strip audio from a video file in-place using FFmpeg.

    Sora-2 embeds AI-generated audio that causes unexpected music/noise when
    the clip is composed with narration. This strips the audio track so the
    compose stage only uses the intended narration audio.

    Returns True if audio was stripped, False if no audio or FFmpeg failed.
    """
    try:
        # Check if there's an audio stream
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", video_path],
            capture_output=True, text=True, timeout=10
        )
        streams = __import__("json").loads(probe.stdout).get("streams", [])
        has_audio = any(s.get("codec_type") == "audio" for s in streams)
        if not has_audio:
            return False

        tmp_path = video_path + ".noaudio.mp4"
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-an", "-c:v", "copy", tmp_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and Path(tmp_path).exists():
            Path(video_path).unlink()
            Path(tmp_path).rename(video_path)
            return True
        else:
            # Clean up failed attempt
            if Path(tmp_path).exists():
                Path(tmp_path).unlink()
            return False
    except Exception:
        return False


def _run_with_timeout(fn, timeout_sec: float, timeout_label: str):
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(fn)
    try:
        return future.result(timeout=timeout_sec)
    except FutureTimeoutError as exc:
        future.cancel()
        raise TimeoutError(f"{timeout_label} exceeded {timeout_sec:g}s") from exc
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def _call_with_retries(label: str, fn, config: RetryConfig):
    last_error = None
    for attempt in range(config.max_retries + 1):
        try:
            return fn()
        except Exception as exc:
            last_error = exc
            retry, error_class, wait = should_retry(exc, attempt, config)
            if not retry:
                break
            print(f"    ⚠️  {label} {error_class} error; retrying in {wait:g}s: {str(exc)[:120]}")
            time.sleep(wait)
    raise last_error  # type: ignore[misc]


def generate_video_clip(
    prompt: str,
    output_path: str,
    duration_sec: int = DEFAULT_DURATION_SEC,
    resolution: str = DEFAULT_RESOLUTION,
    n_variants: int = 1,
    allow_fallback: bool = False,
) -> dict:
    """Generate a video clip from a text prompt using Sora-2.

    Args:
        prompt: Text description of the video to generate.
        output_path: Path to save the generated MP4 file.
        duration_sec: Duration in seconds (1-20, default 5).
        resolution: One of 'landscape', 'portrait', 'square', '720p', '720p-portrait'.
        n_variants: Number of variants to generate (default 1).

    Returns:
        dict with: method, output_path, duration_sec, resolution, video_id,
                   generation_time_sec, size_kb, or error info on failure.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    requested_duration_sec = duration_sec
    duration_sec = _snap_duration(duration_sec)
    size = RESOLUTIONS.get(resolution, RESOLUTIONS[DEFAULT_RESOLUTION])

    # Sanitize prompt to reduce moderation blocks
    prompt = sanitize_video_prompt(prompt)

    client = _get_client()
    if not client:
        if allow_fallback:
            return _fallback_clip(output_path, duration_sec, prompt, "no_client", resolution)
        return _failure("Sora-2 client unavailable", duration_sec, resolution)

    print(f"    🎬 Sora-2: generating video ({size}, {duration_sec}s)...")

    try:
        t0 = time.time()

        def create_and_poll():
            return _run_with_timeout(
                lambda: client.videos.create_and_poll(
                    model=VIDEO_DEPLOYMENT,
                    prompt=prompt,
                    size=size,
                    seconds=duration_sec,
                ),
                MAX_POLL_TIME_SEC,
                "Sora-2 create_and_poll",
            )

        video = _call_with_retries("Sora-2 create_and_poll", create_and_poll, VIDEO_RETRY_CONFIG)

        if video.status != "completed":
            err_msg = getattr(video, 'error', None) or video.status
            print(f"    ❌ Sora-2 generation {video.status}: {err_msg}")
            if allow_fallback:
                return _fallback_clip(output_path, duration_sec, prompt, f"job_{video.status}", resolution)
            return _failure(f"Sora-2 generation {video.status}: {err_msg}", duration_sec, resolution)

        generation_time = time.time() - t0
        print(f"    ⏳ Generated in {generation_time:.0f}s — downloading...")

        def download_content():
            return _run_with_timeout(
                lambda: client.videos.download_content(video.id),
                DOWNLOAD_TIMEOUT_SEC,
                "Sora-2 download_content",
            )

        content = _call_with_retries(
            "Sora-2 download_content",
            download_content,
            RetryConfig(max_retries=2, rate_limit_base_sec=15, transient_base_sec=2, max_wait_sec=45, timeout_sec=DOWNLOAD_TIMEOUT_SEC),
        )
        video_bytes = content.read() if hasattr(content, 'read') else content
        out.write_bytes(video_bytes)

        size_kb = len(video_bytes) // 1024
        print(f"    ✅ Video saved: {out.name} ({size_kb} KB)")

        # Auto-strip audio from Sora-2 output — AI-generated video clips embed
        # an audio track that causes mystery music/noise when composed with
        # narration. Strip it proactively so the compose stage is clean.
        stripped = _strip_audio_track(str(out))
        if stripped:
            size_kb = Path(out).stat().st_size // 1024
            print(f"    🔇 Audio track stripped ({size_kb} KB)")

        return {
            "method": "sora-2",
            "output_path": str(out),
            "duration_sec": duration_sec,
            "requested_duration_sec": requested_duration_sec,
            "duration_snapped": requested_duration_sec != duration_sec,
            "resolution": size,
            "video_id": video.id,
            "generation_time_sec": round(generation_time, 1),
            "size_kb": size_kb,
            "cost": _estimate_cost(duration_sec, resolution),
        }

    except Exception as e:
        print(f"    ❌ Sora-2 error: {e}")
        if allow_fallback:
            return _fallback_clip(output_path, duration_sec, prompt, str(e)[:120], resolution)
        return _failure(f"Sora-2 error: {e}", duration_sec, resolution)


def _failure(error: str, duration_sec: int, resolution: str) -> dict:
    return {
        "success": False,
        "error": error,
        "method": "failed",
        "output_path": None,
        "duration_sec": duration_sec,
        "resolution": RESOLUTIONS.get(resolution, RESOLUTIONS[DEFAULT_RESOLUTION]),
        "cost": 0.0,
    }


def _generate_placeholder_slide(output_path: str, title: str, reason: str,
                                 width: int = 1920, height: int = 1080) -> None:
    """Generate a clean branded placeholder slide using Pillow.

    The slide is customer-facing — it shows the scene topic as a title card
    with professional styling. NO error messages or failure reasons are shown.
    The reason is only logged to console for developer diagnostics.
    """
    if not HAS_PILLOW:
        return  # fallback_clip will use plain color instead

    # Log reason to console only (developer diagnostic, never in video)
    print(f"    📝 Placeholder reason (dev-only): {reason[:100]}")

    img = Image.new("RGB", (width, height), (26, 26, 46))  # dark navy
    draw = ImageDraw.Draw(img)

    # Try to find a reasonable font
    for font_name in ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"]:
        try:
            title_font = ImageFont.truetype(font_name, 52)
            sub_font = ImageFont.truetype(font_name, 28)
            break
        except (OSError, IOError):
            continue
    else:
        title_font = ImageFont.load_default()
        sub_font = title_font

    # Subtle gradient accent bar
    draw.rectangle([0, height // 2 - 130, width, height // 2 - 126], fill=(0, 120, 212))

    # Title text (centered) — shows the scene topic, not error info
    lines = _wrap_text_simple(title, title_font, int(width * 0.8), draw)
    y = height // 2 - 80
    for line in lines[:3]:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, y), line, font=title_font, fill=(255, 255, 255))
        y += 64

    img.save(output_path, "PNG")


def _wrap_text_simple(text: str, font, max_width: int, draw) -> list[str]:
    """Simple word-wrap for Pillow text."""
    words = text.split()
    lines, current = [], ""
    for w in words:
        test = f"{current} {w}".strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_width and current:
            lines.append(current)
            current = w
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def _fallback_clip(output_path: str, duration_sec: int, prompt: str, reason: str, resolution: str = DEFAULT_RESOLUTION) -> dict:
    """Create a branded placeholder clip when Sora-2 is unavailable.

    Generates a professional dark slide with scene title text (via Pillow),
    then converts to MP4 via FFmpeg. Never shows raw test patterns.
    """
    print(f"    ⚠️  Fallback: generating placeholder clip (reason: {reason})")
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    size = RESOLUTIONS.get(resolution, RESOLUTIONS[DEFAULT_RESOLUTION])
    width, height = (int(part) for part in size.split("x"))

    # Extract a short title from the prompt for the placeholder slide
    title = prompt[:80].strip()
    if len(prompt) > 80:
        title = title.rsplit(" ", 1)[0] + "…"

    placeholder_img = out.parent / (out.stem + "_placeholder.png")
    _generate_placeholder_slide(str(placeholder_img), title, reason, width=width, height=height)

    try:
        # Convert static image → looped video for the requested duration
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning",
            "-loop", "1", "-i", str(placeholder_img),
            "-t", str(duration_sec),
            "-vf", f"scale={width}:{height}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
            str(out),
        ]
        subprocess.run(cmd, capture_output=True, timeout=60)
    except Exception:
        # Ultra-fallback: plain dark clip (no Pillow needed)
        try:
            cmd = [
                "ffmpeg", "-y",
                "-f", "lavfi", "-i", f"color=c=#1a1a2e:s={width}x{height}:d={duration_sec}:r=30",
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                str(out),
            ]
            subprocess.run(cmd, capture_output=True, timeout=30)
        except Exception:
            pass

    # Clean up temp image
    if placeholder_img.exists():
        placeholder_img.unlink()

    size_kb = out.stat().st_size // 1024 if out.exists() else 0

    return {
        "method": "fallback-ffmpeg",
        "output_path": str(out),
        "duration_sec": duration_sec,
        "resolution": size,
        "fallback_reason": reason,
        "size_kb": size_kb,
        "cost": 0.0,
    }


def estimate_video_cost(duration_sec: int, resolution: str = "landscape") -> dict:
    """Estimate the cost of a Sora-2 video generation.

    Based on Azure OpenAI pricing for Sora-2 (Global Standard).
    """
    size_str = RESOLUTIONS.get(resolution, RESOLUTIONS[DEFAULT_RESOLUTION])
    w, h = (int(x) for x in size_str.split("x"))
    pixels = w * h

    # Pricing: ~$0.20 per second for 1080p, scaled by resolution
    base_rate = 0.20  # $/sec for 1080p
    scale = pixels / (1920 * 1080)
    estimated_cost = _snap_duration(duration_sec) * base_rate * scale

    return {
        "duration_sec": _snap_duration(duration_sec),
        "resolution": size_str,
        "estimated_cost_usd": round(estimated_cost, 2),
        "note": "Estimate based on Azure OpenAI Sora-2 pricing (preview)",
    }
