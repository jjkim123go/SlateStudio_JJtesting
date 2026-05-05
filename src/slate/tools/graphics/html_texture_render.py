"""HTML Texture Render — deterministic HTML/SVG/card → PNG textures for 3D scenes.

This tool produces a PNG texture suitable for mapping onto a three.js mesh
(planes, cards, device screens, billboards). It is the *texture-generation*
counterpart to a future ``ThreeScene`` / ``HTMLTextureWall`` HyperFrames
component family — those components consume the PNGs this tool emits and
upload them as ``THREE.CanvasTexture`` / ``THREE.Texture`` instances.

Design constraints (MVP, conservative):

- **Local, deterministic, zero-cost.** No headless browser, no Node, no new
  native dependencies beyond Pillow (already in ``pyproject.toml``).
- **Honest about fidelity.** Arbitrary HTML is *not* rasterized — we reject
  the input rather than fake it. Use a ``card`` template or an ``svg`` body
  for guaranteed-correct output, or a constrained subset of HTML if/when a
  Satori/resvg/Playwright-backed mode is added later.
- **Output is a PNG file path** plus dimensions and the mode actually used.

Inputs (one of):

- ``template`` — a named, deterministic Pillow card template (``"text-card"``,
  ``"label"``, ``"badge"``) plus ``data`` keys.
- ``svg`` — raw SVG markup. Rasterized via ``cairosvg`` if available, else
  the tool returns a ``failed_dependency`` error (no silent fallback).
- ``html`` — arbitrary HTML. **Always** returns a ``failed_dependency`` error
  in the MVP; documented escape hatches are listed in the
  ``core/render/html-in-canvas`` skill.

Outputs::

    {
      "texture_path": "<absolute path>",
      "width": 1024,
      "height": 1024,
      "mode": "card" | "svg" | "html",
      "deterministic": true
    }

See ``skills/core/render/html-in-canvas.md`` for routing guidance and
``skills/core/render/three-js.md`` for the three.js consumer contract
(text-as-texture rule, CORS/taint warnings, master-timeline integration).
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from pathlib import Path
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

logger = logging.getLogger(__name__)


# --- Card templates -----------------------------------------------------

_DEFAULT_BG = (15, 23, 42, 255)        # slate-900
_DEFAULT_FG = (248, 250, 252, 255)     # slate-50
_DEFAULT_ACCENT = (56, 189, 248, 255)  # sky-400


def _load_font(size: int):
    """Load a TTF if any common one is available; otherwise default bitmap font.

    The default Pillow bitmap font is small but always present, so we never
    hard-fail on missing fonts. Determinism is preserved as long as the same
    machine is used for re-renders.
    """
    from PIL import ImageFont  # local import to keep top-level cheap

    candidates = [
        # Windows
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\consola.ttf",
        # macOS / Linux fallbacks (harmless on Windows)
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def _render_text_card(
    output_path: str,
    width: int,
    height: int,
    data: dict[str, Any],
) -> None:
    """Render a simple text card: title + optional subtitle on a flat background.

    Data keys (all optional):
      title, subtitle, bg (#hex or [r,g,b]), fg (#hex or [r,g,b]),
      accent (#hex or [r,g,b]), title_size (px), subtitle_size (px),
      align ("center" | "left").
    """
    from PIL import Image, ImageDraw

    bg = _coerce_color(data.get("bg"), _DEFAULT_BG)
    fg = _coerce_color(data.get("fg"), _DEFAULT_FG)
    accent = _coerce_color(data.get("accent"), _DEFAULT_ACCENT)

    img = Image.new("RGBA", (width, height), bg)
    draw = ImageDraw.Draw(img)

    # Accent rule along the top — gives a card a brand anchor.
    rule_h = max(4, height // 120)
    draw.rectangle([0, 0, width, rule_h], fill=accent)

    title = str(data.get("title", "")).strip()
    subtitle = str(data.get("subtitle", "")).strip()
    align = data.get("align", "center")

    title_size = int(data.get("title_size", max(36, height // 8)))
    subtitle_size = int(data.get("subtitle_size", max(18, height // 18)))

    title_font = _load_font(title_size)
    subtitle_font = _load_font(subtitle_size)

    pad = max(24, width // 30)

    # Vertical layout: center stack of title + subtitle.
    title_h = _text_height(draw, title or "X", title_font)
    subtitle_h = _text_height(draw, subtitle, subtitle_font) if subtitle else 0
    gap = subtitle_h and max(8, height // 40) or 0
    stack_h = title_h + gap + subtitle_h
    y0 = (height - stack_h) // 2

    if title:
        _draw_text(draw, title, title_font, fg, width, y0, pad, align)
    if subtitle:
        y1 = y0 + title_h + gap
        _draw_text(draw, subtitle, subtitle_font, fg, width, y1, pad, align)

    img.save(output_path, "PNG")


def _render_label(
    output_path: str,
    width: int,
    height: int,
    data: dict[str, Any],
) -> None:
    """Render a single short label (one line) — useful for 3D billboard labels."""
    from PIL import Image, ImageDraw

    bg = _coerce_color(data.get("bg"), (0, 0, 0, 0))  # transparent default
    fg = _coerce_color(data.get("fg"), _DEFAULT_FG)
    text = str(data.get("text", "")).strip() or "label"
    size = int(data.get("size", max(48, height // 2)))
    font = _load_font(size)

    img = Image.new("RGBA", (width, height), bg)
    draw = ImageDraw.Draw(img)
    th = _text_height(draw, text, font)
    y = (height - th) // 2
    _draw_text(draw, text, font, fg, width, y, max(16, width // 40), "center")
    img.save(output_path, "PNG")


def _render_badge(
    output_path: str,
    width: int,
    height: int,
    data: dict[str, Any],
) -> None:
    """Render a pill-shaped badge with a short caption. Good for scene chips."""
    from PIL import Image, ImageDraw

    bg = _coerce_color(data.get("bg"), (0, 0, 0, 0))
    pill = _coerce_color(data.get("pill"), _DEFAULT_ACCENT)
    fg = _coerce_color(data.get("fg"), (15, 23, 42, 255))
    text = str(data.get("text", "")).strip() or "BADGE"
    size = int(data.get("size", max(28, height // 3)))
    font = _load_font(size)

    img = Image.new("RGBA", (width, height), bg)
    draw = ImageDraw.Draw(img)

    pad_x = max(20, width // 16)
    pad_y = max(10, height // 6)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pill_w = tw + pad_x * 2
    pill_h = th + pad_y * 2
    x0 = (width - pill_w) // 2
    y0 = (height - pill_h) // 2
    radius = pill_h // 2
    draw.rounded_rectangle([x0, y0, x0 + pill_w, y0 + pill_h], radius=radius, fill=pill)
    draw.text((x0 + pad_x - bbox[0], y0 + pad_y - bbox[1]), text, font=font, fill=fg)
    img.save(output_path, "PNG")


# --- Helpers -------------------------------------------------------------


def _coerce_color(value: Any, default: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    if value is None:
        return default
    if isinstance(value, (list, tuple)) and len(value) in (3, 4):
        rgba = list(value) + ([255] if len(value) == 3 else [])
        return tuple(int(c) for c in rgba)  # type: ignore[return-value]
    if isinstance(value, str) and value.startswith("#"):
        h = value.lstrip("#")
        if len(h) == 6:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
        if len(h) == 8:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16))
    return default


def _text_height(draw, text: str, font) -> int:
    if not text:
        return 0
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]


def _draw_text(draw, text: str, font, fill, width: int, y: int, pad: int, align: str) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    if align == "left":
        x = pad - bbox[0]
    else:  # center
        x = (width - tw) // 2 - bbox[0]
    draw.text((x, y - bbox[1]), text, font=font, fill=fill)


# --- Tool ----------------------------------------------------------------


_VALID_TEMPLATES = {"text-card", "label", "badge"}


class HtmlTextureRender(BaseTool):
    """Render deterministic HTML/SVG/card templates to PNG textures for 3D scenes."""

    name = "html_texture_render"
    agent_skills = [
        "core/render/html-in-canvas",
        "core/structured-visuals",
    ]
    version = "0.1.0"
    tier = ToolTier.GENERATE
    capability = (
        "Render deterministic HTML/SVG/card templates to PNG textures for 3D "
        "scenes (three.js CanvasTexture / Texture). MVP supports card "
        "templates and SVG (when cairosvg is installed); arbitrary HTML is "
        "rejected rather than approximated."
    )
    provider = "local"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "local"

    input_schema = {
        "type": "object",
        "properties": {
            "template": {
                "type": "string",
                "enum": ["text-card", "label", "badge"],
                "description": (
                    "Named deterministic card template (Pillow). Mutually "
                    "exclusive with `svg` and `html`."
                ),
            },
            "svg": {
                "type": "string",
                "description": (
                    "Raw SVG markup. Rasterized via cairosvg if available; "
                    "otherwise the tool returns a failed_dependency error."
                ),
            },
            "html": {
                "type": "string",
                "description": (
                    "Arbitrary HTML markup. NOT supported in the MVP — the "
                    "tool returns a failed_dependency error. See "
                    "skills/core/render/html-in-canvas.md for documented "
                    "escape hatches (Satori/resvg, browser screenshot)."
                ),
            },
            "data": {
                "type": "object",
                "description": (
                    "Template-specific data. Common keys: title, subtitle, "
                    "text, bg, fg, accent, pill, size."
                ),
            },
            "width": {"type": "integer", "default": 1024},
            "height": {"type": "integer", "default": 1024},
            "output_dir": {"type": "string", "default": "."},
            "output_path": {
                "type": "string",
                "description": "Optional explicit output path; overrides output_dir.",
            },
        },
    }

    output_schema = {
        "type": "object",
        "properties": {
            "texture_path": {"type": "string"},
            "width": {"type": "integer"},
            "height": {"type": "integer"},
            "mode": {"type": "string", "enum": ["card", "svg", "html"]},
            "deterministic": {"type": "boolean"},
        },
    }

    fallback_tools = ["structured_image", "foundry_image_gen"]

    async def execute(self, **kwargs: Any) -> ToolResult:
        template: str | None = kwargs.get("template")
        svg: str | None = kwargs.get("svg")
        html: str | None = kwargs.get("html")
        data: dict[str, Any] = kwargs.get("data") or {}
        width: int = int(kwargs.get("width", 1024))
        height: int = int(kwargs.get("height", 1024))
        output_dir: str = kwargs.get("output_dir", ".")
        explicit_path: str | None = kwargs.get("output_path")

        sources_set = sum(1 for v in (template, svg, html) if v)
        if sources_set == 0:
            return ToolResult(
                success=False,
                error="One of `template`, `svg`, or `html` is required.",
            )
        if sources_set > 1:
            return ToolResult(
                success=False,
                error="`template`, `svg`, and `html` are mutually exclusive.",
            )

        if width <= 0 or height <= 0:
            return ToolResult(
                success=False, error=f"Invalid dimensions: {width}x{height}"
            )

        # Power-of-two warning for three.js mipmap-friendliness — non-fatal.
        meta_warnings: list[str] = []
        if not (_is_pow2(width) and _is_pow2(height)):
            meta_warnings.append(
                "Texture dimensions are not power-of-two; three.js will "
                "disable mipmaps unless `texture.minFilter = LinearFilter`."
            )

        if explicit_path:
            output_path = explicit_path
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        else:
            os.makedirs(output_dir, exist_ok=True)
            kind = "card" if template else ("svg" if svg else "html")
            filename = f"htmltex_{kind}_{uuid.uuid4().hex[:8]}.png"
            output_path = os.path.join(output_dir, filename)

        start = time.monotonic()

        try:
            if template:
                if template not in _VALID_TEMPLATES:
                    return ToolResult(
                        success=False, error=f"Unknown template: {template!r}"
                    )
                mode = "card"
                if template == "text-card":
                    _render_text_card(output_path, width, height, data)
                elif template == "label":
                    _render_label(output_path, width, height, data)
                elif template == "badge":
                    _render_badge(output_path, width, height, data)
            elif svg:
                mode = "svg"
                try:
                    import cairosvg  # type: ignore[import-not-found]
                except ImportError:
                    return ToolResult(
                        success=False,
                        error=(
                            "SVG rasterization requires `cairosvg` (not installed). "
                            "Install it, or use a `template` instead. See "
                            "skills/core/render/html-in-canvas.md."
                        ),
                        metadata={"failed_dependency": "cairosvg"},
                    )
                cairosvg.svg2png(
                    bytestring=svg.encode("utf-8"),
                    write_to=output_path,
                    output_width=width,
                    output_height=height,
                )
            else:  # html — explicitly unsupported in MVP
                return ToolResult(
                    success=False,
                    error=(
                        "Arbitrary HTML rasterization is not supported in the "
                        "MVP. Options: (1) use a `template` for cards/labels/"
                        "badges, (2) pre-rasterize via Satori+resvg or a "
                        "headless browser and pass the result as a `template` "
                        "image asset, (3) author a HyperFrames component and "
                        "screenshot it. See skills/core/render/html-in-canvas.md."
                    ),
                    metadata={"failed_dependency": "html-rasterizer"},
                )
        except Exception as exc:  # noqa: BLE001 — surface as ToolResult
            logger.exception("html_texture_render failed")
            return ToolResult(
                success=False,
                error=f"Renderer failed: {exc}",
                duration_seconds=time.monotonic() - start,
            )

        return ToolResult(
            success=True,
            output={
                "texture_path": str(Path(output_path).resolve()),
                "width": width,
                "height": height,
                "mode": mode,
                "deterministic": True,
            },
            cost_usd=0.0,
            duration_seconds=time.monotonic() - start,
            metadata={
                "renderer": "pillow" if mode == "card" else mode,
                "deterministic": True,
                "warnings": meta_warnings,
            },
        )


def _is_pow2(n: int) -> bool:
    return n > 0 and (n & (n - 1)) == 0
