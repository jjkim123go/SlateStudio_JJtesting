"""ImageAnalyze — Describe an image with dimensions, dominant colors, OCR text, and (optionally) a GPT-4o vision summary.

Three layers of capability, each gracefully degrading:

1. **Always available** — file size, dimensions (header parse, no Pillow needed for PNG/JPEG)
2. **Pillow available** — dominant colors, format details
3. **GPT-4o vision + Azure OpenAI deployment available** — natural-language description,
   detected text, suggested use ("background", "headshot", "logo", "diagram")

The tool never hard-fails: if vision is unavailable, it returns whatever it could compute.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import struct
import subprocess
import time
from collections import Counter
from pathlib import Path
from typing import Any

import urllib.request
import urllib.error

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

logger = logging.getLogger(__name__)

from slate.core.azure_config import azure_config as _az_cfg

def _azure_resource():
    return _az_cfg.resource_name

def _azure_endpoint():
    return _az_cfg.endpoint
GPT4O_DEPLOYMENT = os.environ.get("SLATE_VISION_DEPLOYMENT", "gpt-4o")
API_VERSION = "2024-10-21"


# ---------- Layer 1: zero-dependency dimensions ----------

def _read_dimensions_from_header(path: Path) -> tuple[int, int] | None:
    """Read width/height from PNG or JPEG header without external libraries."""
    try:
        with open(path, "rb") as f:
            head = f.read(32)
            if head[:8] == b"\x89PNG\r\n\x1a\n":
                w, h = struct.unpack(">II", head[16:24])
                return int(w), int(h)
            if head[:2] == b"\xff\xd8":  # JPEG
                f.seek(2)
                while True:
                    marker = f.read(2)
                    if len(marker) < 2:
                        return None
                    if marker[0] != 0xFF:
                        return None
                    code = marker[1]
                    if 0xC0 <= code <= 0xCF and code not in (0xC4, 0xC8, 0xCC):
                        f.read(3)  # length(2) + precision(1)
                        h, w = struct.unpack(">HH", f.read(4))
                        return int(w), int(h)
                    seg_len = struct.unpack(">H", f.read(2))[0]
                    f.seek(seg_len - 2, 1)
    except (OSError, struct.error):
        return None
    return None


# ---------- Layer 2: Pillow-based color/format ----------

def _pillow_analysis(path: Path) -> dict[str, Any]:
    """Return mode, format, dominant colors via Pillow if available."""
    try:
        from PIL import Image
    except ImportError:
        return {"pillow_available": False}

    try:
        with Image.open(path) as img:
            img.load()
            width, height = img.size
            mode = img.mode
            fmt = img.format or "unknown"
            # Sample dominant colors from a downsized thumbnail
            small = img.convert("RGB").resize((64, 64))
            pixels = list(small.getdata())
            top = Counter(pixels).most_common(5)
            dominant = [
                {
                    "rgb": list(rgb),
                    "hex": "#{:02x}{:02x}{:02x}".format(*rgb),
                    "share": round(count / len(pixels), 3),
                }
                for rgb, count in top
            ]
            return {
                "pillow_available": True,
                "width": width,
                "height": height,
                "mode": mode,
                "format": fmt,
                "dominant_colors": dominant,
            }
    except Exception as exc:  # noqa: BLE001
        return {"pillow_available": True, "error": str(exc)}


# ---------- Layer 3: GPT-4o vision ----------

def _get_token() -> str | None:
    """Acquire an Azure bearer token via az CLI. Returns None on failure."""
    try:
        result = subprocess.run(
            "az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken -o tsv",
            shell=True,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode == 0:
            return result.stdout.strip()
        logger.debug("az token fetch failed: %s", result.stderr.strip())
    except (subprocess.SubprocessError, OSError) as exc:
        logger.debug("az subprocess error: %s", exc)
    return None


def _vision_describe(path: Path, mime_type: str) -> dict[str, Any] | None:
    """Call GPT-4o vision via Azure OpenAI Chat Completions. Returns None on any failure."""
    token = _get_token()
    if not token:
        return None

    try:
        with open(path, "rb") as f:
            data_url = f"data:{mime_type};base64,{base64.b64encode(f.read()).decode('ascii')}"
    except OSError:
        return None

    url = (
        f"{_azure_endpoint()}/openai/deployments/{GPT4O_DEPLOYMENT}/chat/completions"
        f"?api-version={API_VERSION}"
    )
    body = {
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an image analyst for a video production system. "
                    "Reply ONLY with compact JSON: "
                    '{"description": str, "text_detected": str, "suggested_use": '
                    '"background"|"headshot"|"logo"|"diagram"|"product"|"other", '
                    '"notable_elements": [str]}'
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this image."},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "max_tokens": 400,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        logger.debug("vision HTTP %s: %s", exc.code, exc.read()[:200])
        return None
    except (urllib.error.URLError, json.JSONDecodeError, OSError) as exc:
        logger.debug("vision call failed: %s", exc)
        return None

    try:
        content = payload["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return parsed
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        logger.debug("vision parse failed: %s", exc)
        return None


# ---------- BaseTool ----------

_MIME_BY_EXT = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
}


class ImageAnalyze(BaseTool):
    """Analyze an image: dimensions, dominant colors, GPT-4o description (when available)."""

    name = "image_analyze"
    version = "0.1.0"
    tier = ToolTier.ANALYZE
    capability = "Analyze an image: dimensions, dominant colors, OCR text, suggested use, GPT-4o description"
    provider = "azure-foundry"
    runtime = ToolRuntime.HYBRID
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Path to image file"},
            "use_vision": {
                "type": "boolean",
                "default": True,
                "description": "Call GPT-4o vision for natural-language description (costs ~$0.005)",
            },
        },
        "required": ["path"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "path": {"type": "string"},
            "size_bytes": {"type": "integer"},
            "width": {"type": "integer"},
            "height": {"type": "integer"},
            "format": {"type": "string"},
            "dominant_colors": {"type": "array"},
            "description": {"type": "string"},
            "text_detected": {"type": "string"},
            "suggested_use": {"type": "string"},
        },
    }

    async def execute(self, **kwargs: Any) -> ToolResult:
        path_str = kwargs.get("path", "")
        use_vision = bool(kwargs.get("use_vision", True))
        if not path_str:
            return ToolResult(success=False, error="path is required")
        path = Path(path_str)
        if not path.is_file():
            return ToolResult(success=False, error=f"File not found: {path}")

        start = time.monotonic()
        result: dict[str, Any] = {
            "path": str(path),
            "size_bytes": path.stat().st_size,
        }
        warnings: list[str] = []

        # Layer 1
        dims = _read_dimensions_from_header(path)
        if dims:
            result["width"], result["height"] = dims

        # Layer 2
        pill = _pillow_analysis(path)
        if pill.get("pillow_available"):
            for key in ("width", "height", "format", "mode", "dominant_colors"):
                if key in pill:
                    result[key] = pill[key]
        else:
            warnings.append("Pillow not installed — no color analysis")

        # Layer 3
        cost = 0.0
        if use_vision:
            mime = _MIME_BY_EXT.get(path.suffix.lower(), "image/png")
            vision = _vision_describe(path, mime)
            if vision:
                result["description"] = vision.get("description", "")
                result["text_detected"] = vision.get("text_detected", "")
                result["suggested_use"] = vision.get("suggested_use", "other")
                result["notable_elements"] = vision.get("notable_elements", [])
                cost = 0.005  # rough GPT-4o vision cost per small image
            else:
                warnings.append("GPT-4o vision unavailable — no semantic description")

        if warnings:
            result["warnings"] = warnings

        return ToolResult(
            success=True,
            output=result,
            cost_usd=cost,
            duration_seconds=time.monotonic() - start,
            metadata={"path": str(path), "vision_used": use_vision and "description" in result},
        )
