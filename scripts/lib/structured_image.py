"""Slate Structured Image Renderer — Pillow-based programmatic image generation
for content types that AI image models cannot reliably render.

Routes: code, tables, UI mockups, diagrams, charts — anything requiring
exact spelling, precise layout, or structured text.

These render deterministically at zero cost and zero latency.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

# ── Theme ────────────────────────────────────────────────────────────────────
# Dark enterprise theme (matches Slate's dark style palette)
THEME = {
    "bg":           (30, 30, 46),
    "bg_alt":       (38, 38, 56),
    "surface":      (45, 45, 65),
    "border":       (65, 65, 90),
    "text":         (205, 214, 244),
    "text_dim":     (150, 160, 185),
    "text_muted":   (108, 112, 134),
    "heading":      (180, 190, 254),
    "accent":       (137, 180, 250),   # Blue
    "accent2":      (166, 227, 161),   # Green
    "accent3":      (250, 179, 135),   # Orange
    "accent4":      (203, 166, 247),   # Purple
    "accent5":      (245, 194, 231),   # Pink
    "success":      (166, 227, 161),
    "warning":      (250, 179, 135),
    "error":        (243, 139, 168),
    "bar_blue":     (137, 180, 250),
    "bar_green":    (166, 227, 161),
    "bar_orange":   (250, 179, 135),
    "bar_purple":   (203, 166, 247),
    "status_bar":   (0, 120, 212),
}

CHART_COLORS = [
    (137, 180, 250), (166, 227, 161), (250, 179, 135),
    (203, 166, 247), (245, 194, 231), (148, 226, 213),
    (249, 226, 175), (243, 139, 168),
]


# ── Fonts ────────────────────────────────────────────────────────────────────
def _font(size: int) -> ImageFont.FreeTypeFont:
    for fp in ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]:
        if Path(fp).exists():
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()

def _bold(size: int) -> ImageFont.FreeTypeFont:
    for fp in ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if Path(fp).exists():
            return ImageFont.truetype(fp, size)
    return _font(size)

def _mono(size: int) -> ImageFont.FreeTypeFont:
    for fp in ["C:/Windows/Fonts/cascadiamono.ttf", "C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cour.ttf"]:
        if Path(fp).exists():
            return ImageFont.truetype(fp, size)
    return _font(size)

def _save(img: Image.Image, path: str) -> str:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(out), "PNG", quality=95)
    return str(out)


# ═════════════════════════════════════════════════════════════════════════════
# 1. CODE / JSON RENDERER
# ═════════════════════════════════════════════════════════════════════════════

# Token colors for JSON syntax highlighting
_CODE_COLORS = {
    "brace":    (205, 214, 244),
    "key":      (137, 180, 250),
    "string":   (166, 227, 161),
    "comment":  (108, 112, 134),
    "keyword":  (203, 166, 247),
    "number":   (250, 179, 135),
}

def _colorize_json(line: str) -> list[tuple[str, tuple]]:
    segments = []
    indent = line[:len(line) - len(line.lstrip())]
    if indent:
        segments.append((indent, _CODE_COLORS["brace"]))
    rest = line.lstrip()
    while rest:
        if rest.startswith("//"):
            segments.append((rest, _CODE_COLORS["comment"]))
            break
        elif rest.startswith('"') and '":' in rest:
            end = rest.index('"', 1) + 1
            segments.append((rest[:end], _CODE_COLORS["key"]))
            rest = rest[end:]
        elif rest.startswith('"'):
            try:
                end = rest.index('"', 1) + 1
            except ValueError:
                end = len(rest)
            segments.append((rest[:end], _CODE_COLORS["string"]))
            rest = rest[end:]
        elif rest[0] in '{}[]:,':
            segments.append((rest[0], _CODE_COLORS["brace"]))
            rest = rest[1:]
        elif any(rest.startswith(kw) for kw in ('true', 'false', 'null')):
            for kw in ('true', 'false', 'null'):
                if rest.startswith(kw):
                    segments.append((kw, _CODE_COLORS["keyword"]))
                    rest = rest[len(kw):]
                    break
        elif rest[0].isdigit() or (rest[0] == '-' and len(rest) > 1 and rest[1].isdigit()):
            j = 0
            while j < len(rest) and rest[j] in '0123456789.-':
                j += 1
            segments.append((rest[:j], _CODE_COLORS["number"]))
            rest = rest[j:]
        elif rest[0] == ' ':
            segments.append((' ', _CODE_COLORS["brace"]))
            rest = rest[1:]
        else:
            segments.append((rest[0], _CODE_COLORS["brace"]))
            rest = rest[1:]
    return segments


def generate_code_image(
    output_path: str, title: str, code_lines: list[str],
    width: int = 1920, height: int = 1080, highlight_line: int | None = None,
) -> str:
    """Render syntax-highlighted code/JSON in a dark editor chrome."""
    img = Image.new("RGB", (width, height), THEME["bg"])
    draw = ImageDraw.Draw(img)
    mono = _mono(22)
    title_f = _font(16)
    ln_f = _mono(18)

    # Title bar
    bar_h = 48
    draw.rectangle([0, 0, width, bar_h], fill=(20, 20, 34))
    tab_w = min(400, len(title) * 10 + 60)
    draw.rectangle([0, 0, tab_w, bar_h], fill=THEME["bg"])
    draw.rectangle([16, 14, 28, 30], outline=THEME["accent"], width=1)
    draw.text((36, 14), title, font=title_f, fill=(200, 210, 230))
    draw.rectangle([0, bar_h, tab_w, bar_h + 2], fill=THEME["accent"])
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse([width - 80 + i * 24, 16, width - 66 + i * 24, 30], fill=c)

    # Gutter + code
    gutter_w = 65
    draw.rectangle([0, bar_h, gutter_w, height], fill=(22, 22, 36))
    y0 = bar_h + 12
    lh = 30
    for i, line in enumerate(code_lines[: (height - y0 - 40) // lh]):
        y = y0 + i * lh
        if highlight_line is not None and i == highlight_line:
            draw.rectangle([gutter_w, y - 2, width, y + lh - 2], fill=THEME["surface"])
        draw.text((12, y + 2), str(i + 1).rjust(3), font=ln_f, fill=THEME["text_muted"])
        x = gutter_w + 20
        for txt, col in _colorize_json(line):
            draw.text((x, y), txt, font=mono, fill=col)
            x += mono.getbbox(txt)[2] - mono.getbbox(txt)[0]

    # Status bar
    sb = 28
    draw.rectangle([0, height - sb, width, height], fill=THEME["status_bar"])
    draw.text((16, height - sb + 4), "JSON  •  UTF-8  •  LF", font=title_f, fill=(255, 255, 255))
    return _save(img, output_path)


# ═════════════════════════════════════════════════════════════════════════════
# 2. TABLE / SPREADSHEET RENDERER
# ═════════════════════════════════════════════════════════════════════════════

def generate_table_image(
    output_path: str,
    title: str,
    headers: list[str],
    rows: list[list[str]],
    col_widths: list[int] | None = None,
    highlight_row: int | None = None,
    width: int = 1920,
    height: int = 1080,
) -> str:
    """Render a styled data table with header and optional row highlight."""
    img = Image.new("RGB", (width, height), THEME["bg"])
    draw = ImageDraw.Draw(img)
    hdr_f = _bold(22)
    cell_f = _font(20)
    title_f = _bold(32)
    sub_f = _font(16)

    ncols = len(headers)
    if col_widths is None:
        usable = width - 120
        col_widths = [usable // ncols] * ncols

    table_w = sum(col_widths)
    x_start = (width - table_w) // 2
    row_h = 48
    hdr_h = 52

    # Title
    draw.text((x_start, 40), title, font=title_f, fill=THEME["heading"])
    draw.rectangle([x_start, 82, x_start + 120, 85], fill=THEME["accent"])

    table_y = 110

    # Header row
    draw.rectangle([x_start, table_y, x_start + table_w, table_y + hdr_h], fill=THEME["accent"])
    x = x_start
    for i, h in enumerate(headers):
        draw.text((x + 14, table_y + 14), h, font=hdr_f, fill=(20, 20, 34))
        x += col_widths[i]

    # Data rows
    for r_idx, row in enumerate(rows):
        ry = table_y + hdr_h + r_idx * row_h
        if ry + row_h > height - 60:
            break
        bg = THEME["surface"] if r_idx % 2 == 0 else THEME["bg"]
        if highlight_row is not None and r_idx == highlight_row:
            bg = (55, 55, 85)
        draw.rectangle([x_start, ry, x_start + table_w, ry + row_h], fill=bg)
        # Row border
        draw.line([x_start, ry + row_h, x_start + table_w, ry + row_h], fill=THEME["border"], width=1)
        x = x_start
        for i, cell in enumerate(row):
            color = THEME["text"]
            # Color-code status-like values
            cl = cell.lower().strip()
            if cl in ("active", "pass", "healthy", "yes", "true", "completed"):
                color = THEME["success"]
            elif cl in ("warning", "pending", "partial"):
                color = THEME["warning"]
            elif cl in ("fail", "error", "inactive", "no", "false", "blocked"):
                color = THEME["error"]
            draw.text((x + 14, ry + 13), cell[:40], font=cell_f, fill=color)
            x += col_widths[i]

        # Column dividers
        x = x_start
        for cw in col_widths[:-1]:
            x += cw
            draw.line([x, ry, x, ry + row_h], fill=THEME["border"], width=1)

    # Column dividers in header
    x = x_start
    for cw in col_widths[:-1]:
        x += cw
        draw.line([x, table_y, x, table_y + hdr_h], fill=(20, 20, 34), width=1)

    # Row count badge
    badge = f"{len(rows)} rows"
    draw.text((x_start, height - 50), badge, font=sub_f, fill=THEME["text_muted"])
    return _save(img, output_path)


# ═════════════════════════════════════════════════════════════════════════════
# 3. UI MOCKUP RENDERER
# ═════════════════════════════════════════════════════════════════════════════

def generate_ui_mockup(
    output_path: str,
    title: str,
    elements: list[dict],
    width: int = 1920,
    height: int = 1080,
) -> str:
    """Render a UI mockup with buttons, text fields, dropdowns, cards.

    Each element dict has:
        type: "button" | "input" | "dropdown" | "card" | "label" | "badge" | "divider"
        text: display text
        x, y: position (absolute pixels)
        w, h: size (optional, auto-sized)
        variant: "primary" | "secondary" | "outline" | "success" | "danger" (for buttons)
        items: list of dropdown options (for dropdown type)
    """
    img = Image.new("RGB", (width, height), THEME["bg"])
    draw = ImageDraw.Draw(img)
    btn_f = _bold(18)
    label_f = _font(16)
    title_f = _bold(28)
    input_f = _font(18)
    badge_f = _bold(14)

    # Title bar (app chrome)
    draw.rectangle([0, 0, width, 56], fill=(20, 20, 34))
    draw.text((24, 14), title, font=title_f, fill=THEME["heading"])
    draw.rectangle([0, 56, width, 58], fill=THEME["accent"])

    for el in elements:
        t = el.get("type", "label")
        x = el.get("x", 0)
        y = el.get("y", 0) + 70  # offset for title bar
        text = el.get("text", "")

        if t == "button":
            w = el.get("w", len(text) * 12 + 40)
            h = el.get("h", 42)
            variant = el.get("variant", "primary")
            colors = {
                "primary": (THEME["accent"], (20, 20, 34)),
                "secondary": (THEME["surface"], THEME["text"]),
                "outline": (None, THEME["accent"]),
                "success": (THEME["success"], (20, 20, 34)),
                "danger": (THEME["error"], (20, 20, 34)),
            }
            bg, fg = colors.get(variant, colors["primary"])
            if bg:
                draw.rounded_rectangle([x, y, x + w, y + h], radius=6, fill=bg)
            else:
                draw.rounded_rectangle([x, y, x + w, y + h], radius=6, outline=fg, width=2)
            tw = btn_f.getbbox(text)[2]
            draw.text((x + (w - tw) // 2, y + 10), text, font=btn_f, fill=fg)

        elif t == "input":
            w = el.get("w", 300)
            h = el.get("h", 42)
            placeholder = el.get("placeholder", "")
            draw.rounded_rectangle([x, y, x + w, y + h], radius=6,
                                   fill=(22, 22, 36), outline=THEME["border"], width=1)
            display = text or placeholder
            color = THEME["text"] if text else THEME["text_muted"]
            draw.text((x + 14, y + 10), display, font=input_f, fill=color)

        elif t == "dropdown":
            w = el.get("w", 280)
            h = el.get("h", 42)
            items = el.get("items", [])
            # Closed state
            draw.rounded_rectangle([x, y, x + w, y + h], radius=6,
                                   fill=(22, 22, 36), outline=THEME["border"], width=1)
            draw.text((x + 14, y + 10), text or "Select...", font=input_f, fill=THEME["text"])
            # Chevron
            cx = x + w - 28
            cy = y + h // 2
            draw.polygon([(cx, cy - 4), (cx + 10, cy - 4), (cx + 5, cy + 4)], fill=THEME["text_muted"])
            # Dropdown options (expanded preview)
            if items:
                for i, item in enumerate(items[:5]):
                    iy = y + h + 2 + i * 36
                    ibg = THEME["surface"] if i % 2 == 0 else THEME["bg_alt"]
                    draw.rounded_rectangle([x, iy, x + w, iy + 34], radius=4, fill=ibg)
                    draw.text((x + 14, iy + 7), item, font=input_f, fill=THEME["text"])

        elif t == "card":
            w = el.get("w", 350)
            h = el.get("h", 160)
            draw.rounded_rectangle([x, y, x + w, y + h], radius=10,
                                   fill=THEME["bg_alt"], outline=THEME["border"], width=1)
            draw.text((x + 20, y + 16), text, font=_bold(20), fill=THEME["heading"])
            subtitle = el.get("subtitle", "")
            if subtitle:
                draw.text((x + 20, y + 46), subtitle, font=label_f, fill=THEME["text_dim"])
            value = el.get("value", "")
            if value:
                draw.text((x + 20, y + h - 50), value, font=_bold(36), fill=THEME["accent"])

        elif t == "badge":
            tw = badge_f.getbbox(text)[2] + 20
            h = 26
            variant = el.get("variant", "primary")
            bg_map = {"primary": THEME["accent"], "success": THEME["success"],
                      "warning": THEME["warning"], "danger": THEME["error"]}
            bg = bg_map.get(variant, THEME["accent"])
            draw.rounded_rectangle([x, y, x + tw, y + h], radius=12, fill=bg)
            draw.text((x + 10, y + 4), text, font=badge_f, fill=(20, 20, 34))

        elif t == "label":
            draw.text((x, y), text, font=label_f, fill=THEME["text_dim"])

        elif t == "divider":
            w = el.get("w", width - 100)
            draw.line([x, y, x + w, y], fill=THEME["border"], width=1)

    return _save(img, output_path)


# ═════════════════════════════════════════════════════════════════════════════
# 4. DIAGRAM WITH LABELED ARROWS RENDERER
# ═════════════════════════════════════════════════════════════════════════════

# Canvas safe area (inside title bar). 1920x1080 minus title (top 100) and margins.
_SAFE_X_MIN, _SAFE_X_MAX = 80, 1840
_SAFE_Y_MIN, _SAFE_Y_MAX = 180, 1000
_SAFE_W = _SAFE_X_MAX - _SAFE_X_MIN
_SAFE_H = _SAFE_Y_MAX - _SAFE_Y_MIN


def _detect_topology(boxes: list[dict], arrows: list[dict]) -> str:
    """Return 'linear' | 'tree' | 'grid'."""
    if not arrows:
        return "grid"
    out_edges: dict[str, list[str]] = {b["id"]: [] for b in boxes}
    in_edges: dict[str, list[str]] = {b["id"]: [] for b in boxes}
    for a in arrows:
        s, d = a.get("from_id"), a.get("to_id")
        if s in out_edges and d in in_edges:
            out_edges[s].append(d)
            in_edges[d].append(s)
    sources = [b["id"] for b in boxes if not in_edges[b["id"]]]
    sinks = [b["id"] for b in boxes if not out_edges[b["id"]]]
    max_out = max((len(v) for v in out_edges.values()), default=0)
    max_in = max((len(v) for v in in_edges.values()), default=0)
    if len(sources) == 1 and len(sinks) == 1 and max_out <= 1 and max_in <= 1:
        return "linear"
    if len(sources) == 1 and max_in <= 1:
        return "tree"
    return "grid"


def _topo_order(boxes: list[dict], arrows: list[dict]) -> list[str]:
    """Kahn topological sort. Falls back to declared order on cycles."""
    in_count = {b["id"]: 0 for b in boxes}
    out_edges: dict[str, list[str]] = {b["id"]: [] for b in boxes}
    for a in arrows:
        s, d = a.get("from_id"), a.get("to_id")
        if s in in_count and d in in_count:
            out_edges[s].append(d)
            in_count[d] += 1
    queue = [b["id"] for b in boxes if in_count[b["id"]] == 0]
    order: list[str] = []
    while queue:
        n = queue.pop(0)
        order.append(n)
        for m in out_edges[n]:
            in_count[m] -= 1
            if in_count[m] == 0:
                queue.append(m)
    if len(order) != len(boxes):
        return [b["id"] for b in boxes]
    return order


def _auto_layout(boxes: list[dict], arrows: list[dict]) -> dict[str, tuple[int, int, int, int]]:
    """Assign (x, y, w, h) per box id. Fills the safe area uniformly.

    Returns: {box_id: (x, y, w, h)}
    """
    n = len(boxes)
    if n == 0:
        return {}
    topo = _detect_topology(boxes, arrows)
    order = _topo_order(boxes, arrows)
    coords: dict[str, tuple[int, int, int, int]] = {}

    if topo == "linear":
        if n <= 6:
            # Horizontal flow: distribute across width, vertical center of CANVAS
            gap = 60
            box_w = min(280, (_SAFE_W - gap * (n - 1)) // n)
            box_h = 130
            total_w = box_w * n + gap * (n - 1)
            start_x = _SAFE_X_MIN + (_SAFE_W - total_w) // 2
            # Center vertically in the canvas (1080), not the safe area
            cy = (1080 - box_h) // 2
            for i, bid in enumerate(order):
                coords[bid] = (start_x + i * (box_w + gap), cy, box_w, box_h)
        else:
            # Vertical 2-column zigzag
            box_w, box_h = 360, 100
            col_x = [_SAFE_X_MIN + 200, _SAFE_X_MIN + 200 + box_w + 120]
            rows = (n + 1) // 2
            row_gap = max(40, (_SAFE_H - rows * box_h) // (rows + 1))
            for i, bid in enumerate(order):
                col = i % 2
                row = i // 2
                coords[bid] = (col_x[col], _SAFE_Y_MIN + row_gap + row * (box_h + row_gap), box_w, box_h)

    elif topo == "tree":
        # Group nodes by depth from root
        in_edges: dict[str, list[str]] = {b["id"]: [] for b in boxes}
        for a in arrows:
            s, d = a.get("from_id"), a.get("to_id")
            if s in in_edges and d in in_edges:
                in_edges[d].append(s)
        depth: dict[str, int] = {}
        for bid in order:
            preds = in_edges[bid]
            depth[bid] = 0 if not preds else max(depth.get(p, 0) for p in preds) + 1
        max_depth = max(depth.values()) + 1
        levels: dict[int, list[str]] = {}
        for bid, d in depth.items():
            levels.setdefault(d, []).append(bid)
        box_w, box_h = 280, 130
        # Center vertically on canvas
        total_h = max_depth * box_h + (max_depth - 1) * 100 if max_depth > 1 else box_h
        start_y = max(_SAFE_Y_MIN, (1080 - total_h) // 2)
        row_h = (box_h + 100) if max_depth > 1 else 0
        for d, ids in levels.items():
            cnt = len(ids)
            total_w = cnt * box_w + (cnt - 1) * 80
            start_x = (1920 - total_w) // 2
            y = start_y + d * row_h
            for i, bid in enumerate(ids):
                cx = start_x + i * (box_w + 80)
                coords[bid] = (cx, y, box_w, box_h)

    else:  # grid — center on canvas, scale up boxes for small n
        cols = math.ceil(math.sqrt(n))
        rows = math.ceil(n / cols)
        gap = 80
        # Larger boxes when few cells; cap to keep readable
        box_w = min(440, (_SAFE_W - gap * (cols - 1)) // cols)
        box_h = min(200, (_SAFE_H - gap * (rows - 1)) // rows)
        total_w = cols * box_w + (cols - 1) * gap
        total_h = rows * box_h + (rows - 1) * gap
        start_x = (1920 - total_w) // 2
        start_y = (1080 - total_h) // 2
        for i, bid in enumerate(order):
            r, c = divmod(i, cols)
            x = start_x + c * (box_w + gap)
            y = start_y + r * (box_h + gap)
            coords[bid] = (x, y, box_w, box_h)

    return coords


def _needs_auto_layout(boxes: list[dict]) -> bool:
    """True when boxes lack coords OR provided coords fail the L2 sanity check
    (don't fill the canvas)."""
    if not boxes:
        return False
    # Missing coords on any box → auto
    if any("x" not in b or "y" not in b for b in boxes):
        return True
    xs = [b["x"] for b in boxes]
    ys = [b["y"] for b in boxes]
    ws = [b.get("w", 220) for b in boxes]
    hs = [b.get("h", 80) for b in boxes]
    span_w = max(x + w for x, w in zip(xs, ws)) - min(xs)
    span_h = max(y + h for y, h in zip(ys, hs)) - min(ys)
    # Heuristic: layout fills <50% width AND <40% height → bad LLM output
    if span_w < _SAFE_W * 0.50 and span_h < _SAFE_H * 0.40:
        return True
    return False


def _orthogonal_arrow(
    draw: ImageDraw.Draw,
    src: tuple[int, int, int, int],
    dst: tuple[int, int, int, int],
    color: tuple,
    width: int = 3,
    head_size: int = 14,
) -> tuple[int, int]:
    """Manhattan-routed arrow between two box rects. Returns label anchor (mx, my)."""
    sx, sy, sw, sh = src
    dx_, dy_, dw, dh = dst
    src_cx, src_cy = sx + sw // 2, sy + sh // 2
    dst_cx, dst_cy = dx_ + dw // 2, dy_ + dh // 2
    dx_diff = dst_cx - src_cx
    dy_diff = dst_cy - src_cy

    # Pick exit/entry sides based on dominant axis
    if abs(dx_diff) >= abs(dy_diff):
        # Horizontal dominant — exit right or left
        if dx_diff >= 0:
            x1, y1 = sx + sw, src_cy
            x2, y2 = dx_, dst_cy
        else:
            x1, y1 = sx, src_cy
            x2, y2 = dx_ + dw, dst_cy
        if y1 == y2:
            draw.line([x1, y1, x2, y2], fill=color, width=width)
            mx, my = (x1 + x2) // 2, y1 - 22
        else:
            mid_x = (x1 + x2) // 2
            draw.line([x1, y1, mid_x, y1], fill=color, width=width)
            draw.line([mid_x, y1, mid_x, y2], fill=color, width=width)
            draw.line([mid_x, y2, x2, y2], fill=color, width=width)
            mx, my = mid_x + 8, (y1 + y2) // 2
        # Arrowhead horizontal
        head_dir = 1 if dx_diff >= 0 else -1
        draw.polygon([
            (x2, y2),
            (x2 - head_dir * head_size, y2 - head_size // 2),
            (x2 - head_dir * head_size, y2 + head_size // 2),
        ], fill=color)
    else:
        # Vertical dominant — exit top or bottom
        if dy_diff >= 0:
            x1, y1 = src_cx, sy + sh
            x2, y2 = dst_cx, dy_
        else:
            x1, y1 = src_cx, sy
            x2, y2 = dst_cx, dy_ + dh
        if x1 == x2:
            draw.line([x1, y1, x2, y2], fill=color, width=width)
            mx, my = x1 + 8, (y1 + y2) // 2
        else:
            mid_y = (y1 + y2) // 2
            draw.line([x1, y1, x1, mid_y], fill=color, width=width)
            draw.line([x1, mid_y, x2, mid_y], fill=color, width=width)
            draw.line([x2, mid_y, x2, y2], fill=color, width=width)
            mx, my = (x1 + x2) // 2, mid_y - 22
        head_dir = 1 if dy_diff >= 0 else -1
        draw.polygon([
            (x2, y2),
            (x2 - head_size // 2, y2 - head_dir * head_size),
            (x2 + head_size // 2, y2 - head_dir * head_size),
        ], fill=color)
    return mx, my


def _draw_arrow(draw: ImageDraw.Draw, x1: int, y1: int, x2: int, y2: int,
                color: tuple, width: int = 2, head_size: int = 12):
    """Legacy diagonal arrow — retained for non-diagram callers."""
    draw.line([x1, y1, x2, y2], fill=color, width=width)
    angle = math.atan2(y2 - y1, x2 - x1)
    ax1 = x2 - head_size * math.cos(angle - 0.4)
    ay1 = y2 - head_size * math.sin(angle - 0.4)
    ax2 = x2 - head_size * math.cos(angle + 0.4)
    ay2 = y2 - head_size * math.sin(angle + 0.4)
    draw.polygon([(x2, y2), (int(ax1), int(ay1)), (int(ax2), int(ay2))], fill=color)


def generate_diagram_image(
    output_path: str,
    title: str,
    boxes: list[dict],
    arrows: list[dict],
    width: int = 1920,
    height: int = 1080,
) -> str:
    """Render a flow/architecture diagram with labeled boxes and arrows.

    Args:
        output_path: Filesystem path to write the output PNG.
        title: Diagram title rendered at the top.
        boxes: List of dicts, each requiring:
            - ``id`` (int): Unique box identifier.
            - ``text`` (str): Label displayed inside the box.
            Optional keys: ``x``, ``y``, ``w``, ``h`` (int, pixel coords),
            ``color_idx`` (int, index into CHART_COLORS),
            ``subtitle`` (str, secondary text below the label).
            When boxes lack coordinates, auto-layout assigns positions
            based on detected topology (linear / tree / grid).
        arrows: List of dicts, each requiring:
            - ``from_id`` (int): ``id`` of the source box.
            - ``to_id`` (int): ``id`` of the target box.
            Optional keys: ``label`` (str, text along the arrow),
            ``color_idx`` (int).
        width: Canvas width in pixels (default 1920).
        height: Canvas height in pixels (default 1080).

    Returns:
        The output_path on success.

    Raises:
        ValueError: If any box is missing ``id`` or ``text``.
    """
    # Validate required box fields
    for i, b in enumerate(boxes):
        if "id" not in b or "text" not in b:
            missing = [k for k in ("id", "text") if k not in b]
            raise ValueError(
                f"boxes[{i}] is missing required key(s): {', '.join(missing)}. "
                f"Each box must have 'id' (int) and 'text' (str)."
            )
    img = Image.new("RGB", (width, height), THEME["bg"])
    draw = ImageDraw.Draw(img)
    title_f = _bold(36)
    box_f = _bold(22)
    sub_f = _font(16)
    arrow_f = _font(16)

    # Title
    draw.text((60, 30), title, font=title_f, fill=THEME["heading"])
    draw.rectangle([60, 78, 200, 82], fill=THEME["accent"])

    # Auto-layout if needed (rule L1/L2 from structured-visuals skill)
    if _needs_auto_layout(boxes):
        coords = _auto_layout(boxes, arrows)
        for b in boxes:
            if b["id"] in coords:
                b["x"], b["y"], b["w"], b["h"] = coords[b["id"]]

    # Index boxes by id for arrow lookups
    box_map = {}
    for b in boxes:
        box_map[b["id"]] = b
        x, y = b["x"], b["y"]
        w, h = b.get("w", 220), b.get("h", 80)
        ci = b.get("color_idx", 0)
        color = CHART_COLORS[ci % len(CHART_COLORS)]
        # Box with rounded corners and colored left bar
        draw.rounded_rectangle([x, y, x + w, y + h], radius=10,
                               fill=THEME["bg_alt"], outline=THEME["border"], width=1)
        draw.rectangle([x, y + 6, x + 6, y + h - 6], fill=color)
        # Text — wrap to width
        text = b.get("text", "")
        lines = []
        words = text.split()
        cur = ""
        for word in words:
            test = f"{cur} {word}".strip()
            if box_f.getbbox(test)[2] < w - 36:
                cur = test
            else:
                if cur:
                    lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
        line_h = 28
        sub = b.get("subtitle", "")
        block_h = len(lines) * line_h + (22 if sub else 0)
        ty = y + (h - block_h) // 2
        for ln in lines:
            draw.text((x + 22, ty), ln, font=box_f, fill=THEME["text"])
            ty += line_h
        if sub:
            # Truncate subtitle with ellipsis to fit (rule L3)
            max_w = w - 32
            if sub_f.getbbox(sub)[2] > max_w:
                while len(sub) > 1 and sub_f.getbbox(sub + "…")[2] > max_w:
                    sub = sub[:-1]
                sub = sub.rstrip() + "…"
            draw.text((x + 22, ty + 4), sub, font=sub_f, fill=THEME["text_muted"])

    # Arrows — orthogonal routing
    for a in arrows:
        src = box_map.get(a["from_id"])
        dst = box_map.get(a["to_id"])
        if not src or not dst:
            continue
        ci = a.get("color_idx", 0)
        color = CHART_COLORS[ci % len(CHART_COLORS)]
        src_rect = (src["x"], src["y"], src.get("w", 220), src.get("h", 80))
        dst_rect = (dst["x"], dst["y"], dst.get("w", 220), dst.get("h", 80))
        mx, my = _orthogonal_arrow(draw, src_rect, dst_rect, color, width=3)
        # Label
        label = a.get("label", "")
        if label:
            draw.text((mx, my), label, font=arrow_f, fill=color)

    return _save(img, output_path)


# ═════════════════════════════════════════════════════════════════════════════
# 5. BAR/PIE CHART RENDERER
# ═════════════════════════════════════════════════════════════════════════════

def generate_bar_chart(
    output_path: str,
    title: str,
    labels: list[str],
    values: list[float],
    unit: str = "",
    width: int = 1920,
    height: int = 1080,
    show_values: bool = True,
) -> str:
    """Render a horizontal bar chart with labeled values."""
    img = Image.new("RGB", (width, height), THEME["bg"])
    draw = ImageDraw.Draw(img)
    title_f = _bold(32)
    label_f = _font(20)
    val_f = _bold(20)
    axis_f = _font(14)

    # Title
    draw.text((80, 40), title, font=title_f, fill=THEME["heading"])
    draw.rectangle([80, 82, 200, 85], fill=THEME["accent"])

    if not values:
        return _save(img, output_path)

    max_val = max(values) if values else 1
    n = len(labels)
    chart_x = 280
    chart_w = width - chart_x - 120
    chart_y = 120
    bar_h = min(50, (height - chart_y - 80) // max(n, 1) - 16)
    gap = 12

    for i in range(n):
        y = chart_y + i * (bar_h + gap)
        if y + bar_h > height - 60:
            break
        # Label
        draw.text((40, y + bar_h // 2 - 12), labels[i][:25], font=label_f, fill=THEME["text"])
        # Bar
        bar_w = int((values[i] / max_val) * chart_w) if max_val > 0 else 0
        color = CHART_COLORS[i % len(CHART_COLORS)]
        draw.rounded_rectangle([chart_x, y, chart_x + max(bar_w, 4), y + bar_h],
                               radius=4, fill=color)
        # Value label
        if show_values:
            vtext = f"{values[i]:,.1f}{unit}" if isinstance(values[i], float) else f"{values[i]}{unit}"
            draw.text((chart_x + bar_w + 12, y + bar_h // 2 - 12), vtext, font=val_f, fill=color)

    return _save(img, output_path)


def generate_donut_chart(
    output_path: str,
    title: str,
    labels: list[str],
    values: list[float],
    width: int = 1920,
    height: int = 1080,
) -> str:
    """Render a donut/pie chart with labeled segments and percentages."""
    img = Image.new("RGB", (width, height), THEME["bg"])
    draw = ImageDraw.Draw(img)
    title_f = _bold(32)
    label_f = _font(20)
    pct_f = _bold(48)
    legend_f = _font(18)
    val_f = _bold(18)

    draw.text((80, 40), title, font=title_f, fill=THEME["heading"])
    draw.rectangle([80, 82, 200, 85], fill=THEME["accent"])

    total = sum(values) if values else 1
    cx, cy = width // 3, height // 2 + 20
    r_outer = min(cx - 100, cy - 120)
    r_inner = int(r_outer * 0.55)

    # Draw arcs (using pieslice as approximation)
    start = -90
    for i, v in enumerate(values):
        sweep = (v / total) * 360 if total > 0 else 0
        color = CHART_COLORS[i % len(CHART_COLORS)]
        draw.pieslice([cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer],
                      start, start + sweep, fill=color)
        start += sweep

    # Inner circle (donut hole)
    draw.ellipse([cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner], fill=THEME["bg"])
    # Center text
    center_text = f"{total:,.0f}"
    tw = pct_f.getbbox(center_text)[2]
    draw.text((cx - tw // 2, cy - 30), center_text, font=pct_f, fill=THEME["text"])
    draw.text((cx - 20, cy + 25), "total", font=label_f, fill=THEME["text_muted"])

    # Legend
    lx = cx + r_outer + 80
    ly = 140
    for i, lbl in enumerate(labels):
        if ly > height - 60:
            break
        color = CHART_COLORS[i % len(CHART_COLORS)]
        draw.rounded_rectangle([lx, ly, lx + 20, ly + 20], radius=4, fill=color)
        pct = (values[i] / total * 100) if total > 0 else 0
        draw.text((lx + 32, ly - 2), lbl, font=legend_f, fill=THEME["text"])
        draw.text((lx + 32, ly + 22), f"{values[i]:,.0f} ({pct:.1f}%)", font=val_f, fill=THEME["text_dim"])
        ly += 60

    return _save(img, output_path)
