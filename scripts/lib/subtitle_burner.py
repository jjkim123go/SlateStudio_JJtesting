"""Pillow-based subtitle burner — burns subtitle text onto scene images.

Avoids FFmpeg subtitle filter. Instead, composites styled caption text
directly onto the image using Pillow before the image→video step.

For static-image scenes (which is what Slate image scenes are), this produces
identical results to FFmpeg subtitle burn but with zero FFmpeg dependency for
the text rendering.

Supports two modes:
  1. burn_subtitle_on_image() — single subtitle bar (full scene narration)
  2. burn_segmented_subtitles() — multiple images for timed subtitle segments
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def _find_font(size: int) -> ImageFont.FreeTypeFont:
    for fp in ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]:
        if Path(fp).exists():
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def _find_bold(size: int) -> ImageFont.FreeTypeFont:
    for fp in ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if Path(fp).exists():
            return ImageFont.truetype(fp, size)
    return _find_font(size)


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    """Word-wrap text to fit within max_width pixels."""
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        if font.getbbox(test)[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def burn_subtitle_on_image(
    image_path: str,
    text: str,
    output_path: str | None = None,
    font_size: int = 28,
    max_lines: int = 2,
    margin_bottom: int = 60,
    margin_x: int = 120,
    bg_opacity: int = 180,
) -> str:
    """Burn a subtitle caption bar onto the bottom of an image.

    Args:
        image_path: Source image to add subtitles to
        text: Subtitle text (will be word-wrapped)
        output_path: Where to save (defaults to overwriting image_path)
        font_size: Caption font size
        max_lines: Maximum lines of subtitle text
        margin_bottom: Pixels from bottom edge
        margin_x: Horizontal margin from edges
        bg_opacity: Background overlay opacity (0-255)

    Returns:
        Path to the output image
    """
    out = output_path or image_path
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size

    font = _find_bold(font_size)
    max_text_w = w - margin_x * 2
    lines = _wrap_text(text, font, max_text_w)[:max_lines]

    if not lines:
        img.convert("RGB").save(out, "PNG")
        return out

    line_height = font_size + 8
    block_h = len(lines) * line_height + 24  # padding top/bottom
    block_y = h - margin_bottom - block_h

    # Semi-transparent background bar
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rounded_rectangle(
        [margin_x - 20, block_y, w - margin_x + 20, block_y + block_h],
        radius=10,
        fill=(0, 0, 0, bg_opacity),
    )
    img = Image.alpha_composite(img, overlay)

    # Draw text centered
    draw = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        bbox = font.getbbox(line)
        tw = bbox[2] - bbox[0]
        tx = (w - tw) // 2
        ty = block_y + 12 + i * line_height
        # Outline for readability
        for dx, dy in [(-1, -1), (-1, 1), (1, -1), (1, 1), (-2, 0), (2, 0), (0, -2), (0, 2)]:
            draw.text((tx + dx, ty + dy), line, font=font, fill=(0, 0, 0, 255))
        draw.text((tx, ty), line, font=font, fill=(255, 255, 255, 255))

    img.convert("RGB").save(out, "PNG")
    return out


def burn_segmented_subtitles(
    image_path: str,
    segments: list[dict],
    output_dir: str,
    font_size: int = 28,
    margin_bottom: int = 60,
) -> list[dict]:
    """Generate multiple images with different subtitle segments for timed display.

    Args:
        image_path: Base scene image
        segments: List of {"start": float, "end": float, "text": str}
        output_dir: Directory to write numbered frame images
        font_size: Caption font size

    Returns:
        List of {"image_path": str, "start": float, "end": float, "duration": float}
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for i, seg in enumerate(segments):
        frame_path = str(out_dir / f"frame_{i:04d}.png")
        burn_subtitle_on_image(
            image_path, seg["text"], frame_path,
            font_size=font_size, margin_bottom=margin_bottom,
        )
        results.append({
            "image_path": frame_path,
            "start": seg["start"],
            "end": seg["end"],
            "duration": seg["end"] - seg["start"],
        })

    return results
