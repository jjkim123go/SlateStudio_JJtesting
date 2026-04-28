"""Slate image generation — Pillow slides + Azure AI (gpt-image-2).

All AI image generation uses gpt-image-2 via Azure AI Foundry.
Structured content (code, tables, UI mockups, diagrams, charts) is rendered
locally via Pillow for deterministic, zero-cost output.

Design note: The structured-vs-AI routing pattern is inspired by OpenMontage's
image_selector (AGPL-3.0). Slate's implementation is a clean-room design using
Azure-native models tuned for enterprise visual styles.
"""

import base64
import json
import re
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

from PIL import Image, ImageDraw, ImageFont

# Structured image renderers (Pillow-based, for content AI models can't render)
try:
    from structured_image import (
        generate_code_image as _structured_code,
        generate_table_image as _structured_table,
        generate_ui_mockup as _structured_ui,
        generate_diagram_image as _structured_diagram,
        generate_bar_chart as _structured_bar,
        generate_donut_chart as _structured_donut,
    )
    _STRUCTURED_AVAILABLE = True
except ImportError:
    _STRUCTURED_AVAILABLE = False


# ── Structured image dispatcher ──────────────────────────────────────────────

_STRUCTURED_DISPATCH = {
    "code": "_structured_code",
    "table": "_structured_table",
    "ui": "_structured_ui",
    "diagram": "_structured_diagram",
    "bar_chart": "_structured_bar",
    "donut_chart": "_structured_donut",
}


def generate_structured_image(structured_visual: dict, output_path: str) -> dict:
    """Render structured content (code, tables, UI, diagrams, charts) via Pillow.

    Args:
        structured_visual: dict with 'type' key and 'data' key containing
            type-specific parameters (e.g. code/language/theme for code,
            rows/headers for tables, elements for UI mockups, etc.)
        output_path: Where to save the PNG.

    Returns:
        dict with path, method, size_kb
    """
    stype = structured_visual.get("type", "code")
    data = structured_visual.get("data", {})
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    if not _STRUCTURED_AVAILABLE:
        # Fallback to basic scene image if structured renderers aren't importable
        generate_scene_image(str(out), data.get("title", stype), palette="dark")
        return {"path": str(out), "method": f"pillow-{stype}-fallback", "size_kb": round(out.stat().st_size / 1024)}

    dispatch = {
        "code": _structured_code,
        "table": _structured_table,
        "ui": _structured_ui,
        "diagram": _structured_diagram,
        "bar_chart": _structured_bar,
        "donut_chart": _structured_donut,
    }

    renderer = dispatch.get(stype)
    if not renderer:
        generate_scene_image(str(out), data.get("title", stype), palette="dark")
        return {"path": str(out), "method": "pillow-fallback", "size_kb": round(out.stat().st_size / 1024)}

    renderer(output_path=str(out), **data)
    return {"path": str(out), "method": f"structured-{stype}", "size_kb": round(out.stat().st_size / 1024)}

# ── Azure AI Foundry endpoints ──────────────────────────────────────────────
from slate.core.azure_config import azure_config as _az_cfg

def _azure_resource():
    return _az_cfg.resource_name

def _azure_endpoint():
    return _az_cfg.endpoint

# ── Model config ─────────────────────────────────────────────────────────────
MODEL_CONFIG = {
    "deployment": "gpt-image-2",
    "api_version": "2025-04-01-preview",
    "best_for": "all image generation — 4K, faces, scenes, creative, text-in-image",
}

# Max retries before Pillow fallback
_API_MAX_RETRIES = 2
_QUALITY_ALIASES = {
    "standard": "medium",
    "hd": "high",
    "auto": "medium",
}


def normalize_image_quality(quality: str | None) -> str:
    """Return a gpt-image-2 compatible quality value."""
    normalized = (quality or "medium").lower().strip()
    normalized = _QUALITY_ALIASES.get(normalized, normalized)
    if normalized not in {"low", "medium", "high"}:
        return "medium"
    return normalized

# ── Cost estimates — loaded from config/models.yaml via model_registry ────────
try:
    from model_registry import image_cost as _image_cost
    IMAGE_COST_USD = {"gpt-image-2": _image_cost("gpt-image-2"), "pillow-fallback": 0.0, "none": 0.0}
except ImportError:
    IMAGE_COST_USD = {"gpt-image-2": 0.04, "pillow-fallback": 0.0, "none": 0.0}

# ── Scene-content routing (structured vs AI) ────────────────────────────────


# ── Structured content detection ─────────────────────────────────────────────
_STRUCTURED_KEYWORDS = {
    "code": re.compile(
        r"\b(code\s+editor|json\s+contract|json\s+schema|syntax|source\s*code|"
        r"code\s+snippet|api\s+endpoint|http\s+method|rest\s+api|sql\s+query|"
        r"kql\s+query|kusto\s+query|yaml|xml|csharp|python\s+code|bash|shell|"
        r"curl\s+command|cli\s+command)\b", re.IGNORECASE),
    "table": re.compile(
        r"\b(table|spreadsheet|schema\s+table|columns?\s+and\s+rows|"
        r"data\s+grid|database\s+schema|field\s+list|column\s+definition)\b", re.IGNORECASE),
    "ui": re.compile(
        r"\b(ui\s+mockup|user\s+interface|wireframe|form\s+layout|"
        r"button.*dropdown|search\s+bar.*filter|catalog\s+page|dashboard\s+layout)\b", re.IGNORECASE),
    "diagram": re.compile(
        r"\b(flow\s*diagram|architecture\s+diagram|pipeline\s+diagram|"
        r"data\s*flow|sequence\s+diagram)\b", re.IGNORECASE),
    "bar_chart": re.compile(
        r"\b(bar\s+chart|histogram|horizontal\s+bar|comparison\s+chart)\b", re.IGNORECASE),
    "donut_chart": re.compile(
        r"\b(donut\s+chart|pie\s+chart|distribution\s+chart|percentage\s+breakdown)\b", re.IGNORECASE),
}


def detect_structured_type(prompt: str) -> str | None:
    """Detect if a prompt describes content that should use structured rendering.

    Returns the structured type key (code, table, ui, diagram, bar_chart, donut_chart)
    or None if AI image generation is appropriate.
    """
    # Skip structured routing for creative/showcase prompts
    _creative_guard = re.compile(
        r"\b(showcase|collage|preview\s+cards?|artistic|creative\s+layout|"
        r"mood\s+board|gallery|montage|poster)\b", re.IGNORECASE)
    if _creative_guard.search(prompt):
        return None

    for stype, pattern in _STRUCTURED_KEYWORDS.items():
        if pattern.search(prompt):
            return stype
    return None


def select_model(prompt: str, hint: str | None = None) -> str:
    """Choose between structured (Pillow) and AI (gpt-image-2) rendering.

    All AI image generation uses gpt-image-2. Legacy model_hint values
    (faces, photo, creative) are accepted for backward compatibility and
    map to gpt-image-2.

    Returns 'structured' for content best rendered deterministically, or
    'gpt-image-2' for everything else.
    """
    if hint:
        hint_lower = hint.lower()
        if hint_lower in ("code", "table", "ui", "diagram", "chart"):
            return "structured"
        # All other hints (faces, photo, creative, etc.) → gpt-image-2
        return "gpt-image-2"

    # Check for structured content first
    if detect_structured_type(prompt):
        return "structured"

    return "gpt-image-2"

# Enterprise color palettes (gradient pairs: top-left → bottom-right)
PALETTES = {
    "tech-blue":    ((15, 32, 85),    (30, 80, 180)),
    "dark":         ((10, 10, 20),    (35, 35, 55)),
    "data-green":   ((10, 45, 30),    (25, 110, 75)),
    "innovation":   ((50, 15, 80),    (100, 40, 150)),
    "warm":         ((80, 25, 10),    (180, 75, 30)),
    "neutral":      ((30, 35, 45),    (65, 70, 80)),
    "ocean":        ((5, 30, 60),     (20, 90, 140)),
    "sunset":       ((60, 20, 50),    (170, 60, 40)),
    "forest":       ((10, 35, 20),    (30, 90, 45)),
    "corporate":    ((20, 25, 60),    (40, 55, 120)),
}

# Microsoft brand colors
ACCENT_COLORS = {
    "blue":   (0, 120, 212),
    "green":  (16, 124, 16),
    "yellow": (255, 185, 0),
    "red":    (232, 17, 35),
    "white":  (255, 255, 255),
}

def _find_font(size: int) -> ImageFont.FreeTypeFont:
    """Find the best available font on the system."""
    font_paths = [
        "C:/Windows/Fonts/segoeui.ttf",    # Segoe UI (Microsoft standard)
        "C:/Windows/Fonts/segoeuib.ttf",    # Segoe UI Bold
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    for fp in font_paths:
        if Path(fp).exists():
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def _find_bold_font(size: int) -> ImageFont.FreeTypeFont:
    """Find bold font variant."""
    bold_paths = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]
    for fp in bold_paths:
        if Path(fp).exists():
            return ImageFont.truetype(fp, size)
    return _find_font(size)


def create_gradient(width: int, height: int, color1: tuple, color2: tuple) -> Image.Image:
    """Create a diagonal gradient background."""
    img = Image.new("RGB", (width, height))
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            # Diagonal blend factor
            t = (x / width * 0.6 + y / height * 0.4)
            r = int(color1[0] + (color2[0] - color1[0]) * t)
            g = int(color1[1] + (color2[1] - color1[1]) * t)
            b = int(color1[2] + (color2[2] - color1[2]) * t)
            pixels[x, y] = (r, g, b)
    return img


def _draw_accent_bar(draw: ImageDraw.Draw, y: int, width: int, color: tuple, thickness: int = 4):
    """Draw a horizontal accent bar."""
    bar_width = int(width * 0.15)
    x_start = int(width * 0.08)
    draw.rectangle([x_start, y, x_start + bar_width, y + thickness], fill=color)


def _draw_text_with_shadow(draw: ImageDraw.Draw, position: tuple, text: str,
                           font: ImageFont.FreeTypeFont, fill: tuple, shadow_offset: int = 2):
    """Draw text with a subtle drop shadow for depth."""
    x, y = position
    shadow_color = (0, 0, 0, 128)
    draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=shadow_color)
    draw.text((x, y), text, font=font, fill=fill)


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    """Word-wrap text to fit within max_width pixels."""
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = font.getbbox(test_line)
        if bbox[2] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    return lines


def generate_scene_image(
    output_path: str,
    title: str,
    subtitle: str = "",
    palette: str = "tech-blue",
    accent: str = "blue",
    width: int = 1920,
    height: int = 1080,
    scene_number: int = 0,
    total_scenes: int = 0,
    bullet_points: list[str] | None = None,
) -> str:
    """Generate a professional enterprise slide image.

    Args:
        output_path: Where to save the PNG
        title: Main title text
        subtitle: Subtitle or narration summary
        palette: Color palette name from PALETTES
        accent: Accent color from ACCENT_COLORS
        width/height: Output dimensions
        scene_number: Current scene index (for numbering)
        total_scenes: Total scenes (for numbering)
        bullet_points: Optional list of bullet points to display

    Returns:
        Path to generated PNG
    """
    colors = PALETTES.get(palette, PALETTES["tech-blue"])
    accent_color = ACCENT_COLORS.get(accent, ACCENT_COLORS["blue"])

    # Create gradient background
    img = create_gradient(width, height, colors[0], colors[1])
    draw = ImageDraw.Draw(img)

    # Layout constants
    margin_x = int(width * 0.08)
    max_text_width = int(width * 0.84)

    # Title font sizing — adapt to title length
    title_size = 72 if len(title) < 40 else 58 if len(title) < 70 else 48
    title_font = _find_bold_font(title_size)
    subtitle_font = _find_font(32)
    bullet_font = _find_font(28)
    scene_font = _find_font(20)

    # Scene number badge (top right)
    if scene_number > 0 and total_scenes > 0:
        badge_text = f"{scene_number}/{total_scenes}"
        badge_bbox = scene_font.getbbox(badge_text)
        badge_x = width - margin_x - badge_bbox[2]
        draw.rounded_rectangle(
            [badge_x - 12, 40, badge_x + badge_bbox[2] + 12, 40 + badge_bbox[3] + 16],
            radius=8,
            fill=(*accent_color, 180),
        )
        draw.text((badge_x, 48), badge_text, font=scene_font, fill=(255, 255, 255))

    # Accent bar
    y_cursor = int(height * 0.30)
    _draw_accent_bar(draw, y_cursor, width, accent_color, thickness=5)
    y_cursor += 25

    # Title (wrapped)
    title_lines = _wrap_text(title, title_font, max_text_width)
    for line in title_lines:
        _draw_text_with_shadow(draw, (margin_x, y_cursor), line, title_font, (255, 255, 255))
        y_cursor += title_size + 10
    y_cursor += 15

    # Subtitle (wrapped, with reduced opacity effect)
    if subtitle:
        sub_lines = _wrap_text(subtitle, subtitle_font, max_text_width)
        max_sub_lines = 3 if bullet_points else 5  # Leave room for bullets
        for line in sub_lines[:max_sub_lines]:
            draw.text((margin_x, y_cursor), line, font=subtitle_font, fill=(200, 210, 225))
            y_cursor += 40
        y_cursor += 15

    # Bullet points
    if bullet_points:
        for bp in bullet_points[:6]:  # Max 6 bullets
            bullet_lines = _wrap_text(f"•  {bp}", bullet_font, max_text_width - 20)
            for bl in bullet_lines:
                draw.text((margin_x + 20, y_cursor), bl, font=bullet_font, fill=(180, 195, 210))
                y_cursor += 36
            y_cursor += 8

    # Bottom bar with subtle branding
    bar_height = 3
    draw.rectangle([0, height - bar_height, width, height], fill=accent_color)

    # Save
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(out), "PNG", quality=95)
    return str(out)


def generate_brand_intro(
    output_path: str,
    company_name: str = "Contoso",
    tagline: str = "",
    width: int = 1920,
    height: int = 1080,
) -> str:
    """Generate a brand intro slide with centered logo text."""
    img = create_gradient(width, height, (8, 12, 25), (20, 30, 55))
    draw = ImageDraw.Draw(img)

    # Company name — large, centered
    name_font = _find_bold_font(96)
    bbox = name_font.getbbox(company_name)
    x = (width - bbox[2]) // 2
    y = (height - bbox[3]) // 2 - 40
    _draw_text_with_shadow(draw, (x, y), company_name, name_font, (255, 255, 255), shadow_offset=3)

    # Tagline below
    if tagline:
        tag_font = _find_font(36)
        tag_bbox = tag_font.getbbox(tagline)
        tx = (width - tag_bbox[2]) // 2
        draw.text((tx, y + bbox[3] + 30), tagline, font=tag_font, fill=(140, 165, 200))

    # Accent line
    line_width = 200
    line_x = (width - line_width) // 2
    line_y = y + bbox[3] + (80 if tagline else 30)
    draw.rectangle([line_x, line_y, line_x + line_width, line_y + 3], fill=ACCENT_COLORS["blue"])

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(out), "PNG", quality=95)
    return str(out)


def generate_brand_outro(
    output_path: str,
    company_name: str = "Contoso",
    cta_text: str = "Learn more",
    url: str = "",
    width: int = 1920,
    height: int = 1080,
) -> str:
    """Generate a brand outro/CTA slide."""
    img = create_gradient(width, height, (8, 12, 25), (15, 22, 45))
    draw = ImageDraw.Draw(img)

    # CTA text
    cta_font = _find_bold_font(64)
    bbox = cta_font.getbbox(cta_text)
    x = (width - bbox[2]) // 2
    y = (height // 2) - 60
    _draw_text_with_shadow(draw, (x, y), cta_text, cta_font, (255, 255, 255))

    # URL
    if url:
        url_font = _find_font(30)
        url_bbox = url_font.getbbox(url)
        ux = (width - url_bbox[2]) // 2
        draw.text((ux, y + bbox[3] + 30), url, font=url_font, fill=ACCENT_COLORS["blue"])

    # Company name small at bottom
    small_font = _find_font(24)
    name_bbox = small_font.getbbox(company_name)
    nx = (width - name_bbox[2]) // 2
    draw.text((nx, height - 80), company_name, font=small_font, fill=(100, 115, 140))

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(out), "PNG", quality=95)
    return str(out)


def _get_azure_token() -> str | None:
    """Get bearer token for Azure Cognitive Services."""
    try:
        result = subprocess.run(
            "az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken -o tsv",
            capture_output=True, text=True, timeout=30, shell=True
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def _save_and_resize(raw_bytes: bytes, out: Path, target: tuple = (1920, 1080)) -> None:
    """Write raw image bytes, then resize to target resolution for video frames.
    
    Uses high-quality LANCZOS resampling and preserves aspect ratio when the
    source image is close to the target aspect ratio (within 5%).
    """
    out.write_bytes(raw_bytes)
    img = Image.open(str(out))
    if img.size != target:
        src_ar = img.width / img.height
        tgt_ar = target[0] / target[1]
        if abs(src_ar - tgt_ar) / tgt_ar > 0.05:
            # Aspect ratios differ significantly — letterbox/pillarbox instead of stretch
            img.thumbnail(target, Image.LANCZOS)
            canvas = Image.new("RGB", target, (0, 0, 0))
            paste_x = (target[0] - img.width) // 2
            paste_y = (target[1] - img.height) // 2
            canvas.paste(img, (paste_x, paste_y))
            canvas.save(str(out), "PNG")
        else:
            img = img.resize(target, Image.LANCZOS)
            img.save(str(out), "PNG")





def _call_image_api(token: str, prompt: str, out: Path,
                    size: str, quality: str) -> tuple[dict | None, str | None]:
    """Call gpt-image-2 via Azure OpenAI Image Generations API.

    Retries up to _API_MAX_RETRIES times on transient failures before
    returning (None, last_error). Caller decides whether to fall back.
    Returns (result_dict, None) on success or (None, error_string) on failure.
    """
    url = (
        f"{_azure_endpoint()}/openai/deployments/{MODEL_CONFIG['deployment']}"
        f"/images/generations?api-version={MODEL_CONFIG['api_version']}"
    )
    body = {"prompt": prompt, "n": 1, "size": size, "quality": normalize_image_quality(quality)}

    import time
    last_error = None
    last_retry_after = None
    for attempt in range(1 + _API_MAX_RETRIES):
        try:
            req = Request(
                url,
                data=json.dumps(body).encode("utf-8"),
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(req, timeout=240) as resp:
                data = json.loads(resp.read())

            b64 = (data.get("data") or [{}])[0].get("b64_json")
            if b64:
                _save_and_resize(base64.b64decode(b64), out)
                return {"path": str(out), "method": "gpt-image-2", "size_kb": round(out.stat().st_size / 1024)}, None

            img_url = (data.get("data") or [{}])[0].get("url")
            if img_url:
                from urllib.request import urlretrieve
                urlretrieve(img_url, str(out))
                _save_and_resize(out.read_bytes(), out)
                return {"path": str(out), "method": "gpt-image-2", "size_kb": round(out.stat().st_size / 1024)}, None
        except HTTPError as e:
            body_text = e.read().decode()[:300]
            last_error = f"HTTP {e.code}: {body_text}"
            # Honor Retry-After header (especially for 429)
            ra = e.headers.get("Retry-After") if hasattr(e, "headers") and e.headers else None
            try:
                last_retry_after = int(ra) if ra else None
            except (ValueError, TypeError):
                last_retry_after = None
            print(f"  [image_gen] gpt-image-2 {last_error} (attempt {attempt + 1}/{1 + _API_MAX_RETRIES})")
        except Exception as e:
            last_error = str(e)
            last_retry_after = None
            print(f"  [image_gen] gpt-image-2 error: {last_error} (attempt {attempt + 1}/{1 + _API_MAX_RETRIES})")

        if attempt < _API_MAX_RETRIES:
            # 429 needs much longer waits than transient errors. Honor Retry-After
            # if server provided it; otherwise use generous exponential backoff
            # for rate limits (15s, 30s, 60s) vs short backoff for other errors.
            if "HTTP 429" in (last_error or ""):
                wait = last_retry_after if last_retry_after else (15 * (2 ** attempt))
                wait = min(wait, 90)  # cap at 90s
            else:
                wait = 2 ** attempt  # 1s, 2s for transient
            print(f"  [image_gen] sleeping {wait}s before retry...")
            time.sleep(wait)

    return None, last_error


def generate_ai_image(
    prompt: str,
    output_path: str,
    size: str = "1536x1024",
    quality: str = "medium",
    model_hint: str | None = None,
) -> dict:
    """Generate an image using gpt-image-2 on Azure AI Foundry.

    For structured content (code, tables, UI, diagrams), use structured_image
    tools instead — they produce deterministic, zero-cost output.

    Args:
        prompt: Image generation prompt
        output_path: Where to save the PNG
        size: Image size (1024x1024, 1024x1536, 1536x1024)
        quality: low, medium, high, or legacy aliases standard/hd/auto
        model_hint: Optional hint — 'structured' routes to Pillow; all other
                    values (including legacy 'faces', 'photo', 'creative')
                    route to gpt-image-2.

    Returns:
        dict with path, method, model, size_kb
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    chosen = select_model(prompt, model_hint)
    print(f"  [image_gen] Model routing: {chosen} (prompt: {prompt[:60]}...)")

    if chosen == "structured":
        generate_scene_image(str(out), prompt[:80], palette="tech-blue")
        return {"path": str(out), "method": "structured", "model": "none", "size_kb": round(out.stat().st_size / 1024), "cost": 0.0}

    token = _get_azure_token()
    if not token:
        print("  [image_gen] FAILED: no Azure token available")
        return {
            "path": None, "method": "failed", "model": "gpt-image-2",
            "size_kb": 0, "cost": 0.0, "success": False,
            "error": "No Azure token (run `az login`)",
        }

    result, last_error = _call_image_api(token, prompt, out, size, normalize_image_quality(quality))

    if result:
        result["model"] = "gpt-image-2"
        result["cost"] = IMAGE_COST_USD.get("gpt-image-2", 0.04)
        result["success"] = True
        return result

    # FAIL LOUD: do not silently substitute Pillow. The caller (agent) must decide
    # whether to retry with smaller size / lower quality, or accept a Pillow fallback.
    print(f"  [image_gen] gpt-image-2 failed after retries: {last_error}")
    return {
        "path": None,
        "method": "failed",
        "model": "gpt-image-2",
        "size_kb": 0,
        "cost": 0.0,
        "success": False,
        "error": last_error or "gpt-image-2 exhausted retries",
    }


def should_use_image_for_diagram(boxes: list[dict], arrows: list[dict]) -> str | None:
    """Decide whether a `structured_visual: diagram` is too complex for Pillow
    auto-layout and should be re-routed to AI image generation instead.

    Returns: an AI image prompt string when fallback is recommended, else None.

    Triggers (per skills/core/structured-visuals.md routing table):
      - More than 8 boxes
      - Cyclic graph (non-DAG)
      - Mesh / fan-in fan-out (more than one node has >2 incoming or >2 outgoing edges)
    """
    n = len(boxes)
    if n == 0:
        return None
    if n > 8:
        return _diagram_image_prompt(boxes, arrows, reason="complexity")

    # Build adjacency
    out_edges: dict[str, list[str]] = {b["id"]: [] for b in boxes}
    in_count: dict[str, int] = {b["id"]: 0 for b in boxes}
    for a in arrows:
        s, d = a.get("from_id"), a.get("to_id")
        if s in out_edges and d in in_count:
            out_edges[s].append(d)
            in_count[d] += 1

    # Cycle detection via Kahn's algorithm
    queue = [bid for bid, c in in_count.items() if c == 0]
    visited = 0
    counts = dict(in_count)
    while queue:
        n_id = queue.pop(0)
        visited += 1
        for m in out_edges[n_id]:
            counts[m] -= 1
            if counts[m] == 0:
                queue.append(m)
    if visited != n:
        return _diagram_image_prompt(boxes, arrows, reason="cyclic")

    # Mesh detection
    high_fanout = sum(1 for v in out_edges.values() if len(v) > 2)
    high_fanin = sum(1 for c in in_count.values() if c > 2)
    if high_fanout >= 2 or high_fanin >= 2:
        return _diagram_image_prompt(boxes, arrows, reason="mesh")

    return None


def _diagram_image_prompt(boxes: list[dict], arrows: list[dict], reason: str) -> str:
    """Construct an AI image prompt that describes the diagram for FLUX/gpt-image."""
    box_descriptions = ", ".join(
        f"'{b.get('text', '')}'" + (f" ({b['subtitle']})" if b.get('subtitle') else "")
        for b in boxes[:12]
    )
    flow = " → ".join(
        f"'{next((b['text'] for b in boxes if b['id'] == a['from_id']), '')}'"
        f" to '{next((b['text'] for b in boxes if b['id'] == a['to_id']), '')}'"
        for a in arrows[:8]
    )
    return (
        f"Clean enterprise architecture diagram, dark navy background "
        f"(#1e1e2e), modern flat design, rounded rectangle nodes with "
        f"subtle shadows, accent colors (blue #89b4fa, green #a6e3a1, "
        f"orange #fab387, purple #cba6f7), white text labels, "
        f"orthogonal arrows with arrowheads. "
        f"Components: {box_descriptions}. "
        f"Connections: {flow}. "
        f"Style: technical documentation diagram, professional, "
        f"high contrast, no clutter, 16:9 aspect ratio."
    )



    """Render a structured image using Pillow — for content AI models can't handle.

    The structured_visual dict must contain:
        type: "code" | "table" | "ui" | "diagram" | "bar_chart" | "donut_chart"
        title: display title
        data: type-specific data (see schemas below)

    Data schemas by type:
        code:        {"lines": [...], "highlight_line": int|null}
        table:       {"headers": [...], "rows": [[...]], "col_widths": [...]|null, "highlight_row": int|null}
        ui:          {"elements": [{type, text, x, y, ...}]}
        diagram:     {"boxes": [{id, text, x, y, w, h, ...}], "arrows": [{from_id, to_id, label, ...}]}
        bar_chart:   {"labels": [...], "values": [...], "unit": ""}
        donut_chart: {"labels": [...], "values": [...]}

    Returns:
        dict with path, method, model, size_kb, cost
    """
    if not _STRUCTURED_AVAILABLE:
        print("  ⚠ structured_image module not available — Pillow slide fallback")
        generate_scene_image(output_path, structured_visual.get("title", ""), palette="tech-blue")
        out = Path(output_path)
        return {"path": str(out), "method": "pillow-fallback", "model": "none",
                "size_kb": round(out.stat().st_size / 1024), "cost": 0.0}

    stype = structured_visual.get("type", "code")
    title = structured_visual.get("title", "")
    data = structured_visual.get("data", {})

    render_map = {
        "code":        lambda: _structured_code(output_path, title, data.get("lines", []),
                                                highlight_line=data.get("highlight_line")),
        "table":       lambda: _structured_table(output_path, title, data.get("headers", []),
                                                 data.get("rows", []),
                                                 col_widths=data.get("col_widths"),
                                                 highlight_row=data.get("highlight_row")),
        "ui":          lambda: _structured_ui(output_path, title, data.get("elements", [])),
        "diagram":     lambda: _structured_diagram(output_path, title, data.get("boxes", []),
                                                   data.get("arrows", [])),
        "bar_chart":   lambda: _structured_bar(output_path, title, data.get("labels", []),
                                               data.get("values", []),
                                               unit=data.get("unit", "")),
        "donut_chart": lambda: _structured_donut(output_path, title, data.get("labels", []),
                                                 data.get("values", [])),
    }

    renderer = render_map.get(stype)
    if not renderer:
        print(f"  ⚠ Unknown structured type '{stype}' — Pillow slide fallback")
        generate_scene_image(output_path, title, palette="tech-blue")
    else:
        print(f"  📐 Structured image: {stype} — {title[:50]}")
        renderer()

    out = Path(output_path)
    return {"path": str(out), "method": f"structured-{stype}", "model": "pillow",
            "size_kb": round(out.stat().st_size / 1024), "cost": 0.0}


if __name__ == "__main__":
    import sys
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("test_images")
    out_dir.mkdir(parents=True, exist_ok=True)

    generate_brand_intro(str(out_dir / "intro.png"), "Contoso", "AI-Powered Innovation")
    generate_scene_image(str(out_dir / "scene1.png"), "The Future of Enterprise AI",
                        "Our platform transforms how teams create content",
                        palette="tech-blue", scene_number=1, total_scenes=5)
    generate_scene_image(str(out_dir / "scene2.png"), "Key Capabilities",
                        subtitle="Everything you need in one place",
                        palette="innovation", accent="yellow", scene_number=2, total_scenes=5,
                        bullet_points=["Automated video creation", "Brand-consistent output", "Enterprise-grade security"])
    generate_brand_outro(str(out_dir / "outro.png"), "Contoso", "Get Started Today", "contoso.com/ai")
    print(f"Generated {len(list(out_dir.glob('*.png')))} images in {out_dir}")
