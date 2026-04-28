#!/usr/bin/env python3
"""
Build 5 PowerPointScene Wave-B SCF variants → tests/qa-scenarios/ppt-*-b1.scf.json

Variants:
  V1  ppt-start-b1              Start screen (New / Templates / Recent)
  V2  ppt-title-slide-b1        Slide 1/12 title slide — "Q4 Business Review"
  V3  ppt-content-slide-b1      Slide 4/12 bulleted content — "Revenue by Region"
  V4  ppt-chart-slide-b1        Slide 7/12 SVG column chart — "Revenue Growth FY20-FY24"
  V5  ppt-presenter-fullbleed-b1  Present mode — full-bleed, zero chrome

CSS namespace: all new classes use the b1p- prefix.
"""
import json, pathlib, textwrap

OUT = pathlib.Path(__file__).resolve().parents[2] / "tests" / "qa-scenarios"
OUT.mkdir(parents=True, exist_ok=True)

SCF_SHELL = {
    "version": "1.0",
    "pipeline": "synthetic-app-fidelity",
    "outputProfile": {"width": 1920, "height": 1080, "fps": 30},
}

# ── Office chart palette ──
CHART_BLUE    = "#4472C4"
CHART_LTBLUE  = "#5B9BD5"
CHART_GREEN   = "#70AD47"
CHART_GOLD    = "#FFC000"
CHART_ORANGE  = "#ED7D31"

# ═══════════════════════════════════════════════════════════════════════════════
# Shared HTML fragments (ribbon, thumbnails)
# ═══════════════════════════════════════════════════════════════════════════════

HOME_RIBBON = textwrap.dedent("""\
<!-- Clipboard -->
<div class="ppt-ribbon-group">
  <div class="ppt-ribbon-group-body">
    <div class="ppt-ribbon-btn-lg"><svg><use href="#ppt-icon-paste"/></svg><span class="ppt-ribbon-btn-text">Paste</span></div>
    <div class="ppt-ribbon-col" style="padding-top:4px">
      <span class="ppt-ribbon-btn-sm" title="Cut"><svg><use href="#ppt-icon-cut"/></svg></span>
      <span class="ppt-ribbon-btn-sm" title="Copy"><svg><use href="#ppt-icon-copy"/></svg></span>
      <span class="ppt-ribbon-btn-sm" title="Format Painter"><svg><use href="#ppt-icon-format-painter"/></svg></span>
    </div>
  </div>
  <div class="ppt-ribbon-group-label">Clipboard</div>
</div><div class="ppt-ribbon-sep"></div>
<!-- Slides -->
<div class="ppt-ribbon-group">
  <div class="ppt-ribbon-group-body">
    <div class="ppt-ribbon-btn-lg"><svg><use href="#ppt-icon-new-slide"/></svg><span class="ppt-ribbon-btn-text">New<br>Slide</span></div>
    <div class="ppt-ribbon-col" style="padding-top:4px">
      <span class="ppt-ribbon-btn-md" title="Layout"><svg><use href="#ppt-icon-layout"/></svg> Layout</span>
      <span class="ppt-ribbon-btn-md" title="Reset"><svg><use href="#ppt-icon-reset"/></svg> Reset</span>
      <span class="ppt-ribbon-btn-md" title="Section"><svg><use href="#ppt-icon-section"/></svg> Section</span>
    </div>
  </div>
  <div class="ppt-ribbon-group-label">Slides</div>
</div><div class="ppt-ribbon-sep"></div>
<!-- Font -->
<div class="ppt-ribbon-group">
  <div class="ppt-ribbon-group-body">
    <div class="ppt-ribbon-col">
      <div class="ppt-ribbon-row">
        <span class="ppt-ribbon-dropdown ppt-ribbon-font-dropdown">Segoe UI <svg><use href="#ppt-icon-chevron-down"/></svg></span>
        <span class="ppt-ribbon-dropdown ppt-ribbon-size-dropdown">11 <svg><use href="#ppt-icon-chevron-down"/></svg></span>
      </div>
      <div class="ppt-ribbon-row" style="margin-top:2px">
        <span class="ppt-ribbon-btn-sm" title="Bold"><svg><use href="#ppt-icon-bold"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Italic"><svg><use href="#ppt-icon-italic"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Underline"><svg><use href="#ppt-icon-underline"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Strikethrough"><svg><use href="#ppt-icon-strikethrough"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Font Color"><svg><use href="#ppt-icon-font-color"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Highlight"><svg><use href="#ppt-icon-highlight"/></svg></span>
      </div>
    </div>
  </div>
  <div class="ppt-ribbon-group-label">Font</div>
</div><div class="ppt-ribbon-sep"></div>
<!-- Paragraph -->
<div class="ppt-ribbon-group">
  <div class="ppt-ribbon-group-body">
    <div class="ppt-ribbon-col">
      <div class="ppt-ribbon-row">
        <span class="ppt-ribbon-btn-sm" title="Bullets"><svg><use href="#ppt-icon-bullets"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Numbering"><svg><use href="#ppt-icon-numbering"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Decrease Indent"><svg><use href="#ppt-icon-indent-dec"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Increase Indent"><svg><use href="#ppt-icon-indent-inc"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Line Spacing"><svg><use href="#ppt-icon-line-spacing"/></svg></span>
      </div>
      <div class="ppt-ribbon-row" style="margin-top:2px">
        <span class="ppt-ribbon-btn-sm" title="Align Left"><svg><use href="#ppt-icon-align-left"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Align Center"><svg><use href="#ppt-icon-align-center"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Align Right"><svg><use href="#ppt-icon-align-right"/></svg></span>
        <span class="ppt-ribbon-btn-sm" title="Justify"><svg><use href="#ppt-icon-align-justify"/></svg></span>
      </div>
    </div>
  </div>
  <div class="ppt-ribbon-group-label">Paragraph</div>
</div><div class="ppt-ribbon-sep"></div>
<!-- Drawing -->
<div class="ppt-ribbon-group">
  <div class="ppt-ribbon-group-body">
    <div class="ppt-ribbon-btn-lg"><svg><use href="#ppt-icon-drawing"/></svg><span class="ppt-ribbon-btn-text">Drawing</span></div>
    <div class="ppt-ribbon-col" style="padding-top:4px">
      <span class="ppt-ribbon-btn-md" title="Format Shape"><svg><use href="#ppt-icon-format-shape"/></svg></span>
      <span class="ppt-ribbon-btn-md" title="Arrange"><svg><use href="#ppt-icon-arrange"/></svg></span>
    </div>
  </div>
  <div class="ppt-ribbon-group-label">Drawing</div>
</div><div class="ppt-ribbon-sep"></div>
<!-- Editing + Extended -->
<div class="ppt-ribbon-group">
  <div class="ppt-ribbon-group-body">
    <div class="ppt-ribbon-btn-lg"><svg><use href="#ppt-icon-editing"/></svg><span class="ppt-ribbon-btn-text">Editing</span></div>
  </div>
  <div class="ppt-ribbon-group-label">Editing</div>
</div><div class="ppt-ribbon-sep"></div>
<div class="ppt-ribbon-group">
  <div class="ppt-ribbon-group-body">
    <div class="ppt-ribbon-btn-lg"><svg><use href="#ppt-icon-voice"/></svg><span class="ppt-ribbon-btn-text">Dictate</span></div>
    <div class="ppt-ribbon-btn-lg"><svg><use href="#ppt-icon-sensitivity"/></svg><span class="ppt-ribbon-btn-text">Sensitivity</span></div>
    <div class="ppt-ribbon-btn-lg"><svg><use href="#ppt-icon-addins"/></svg><span class="ppt-ribbon-btn-text">Add-ins</span></div>
    <div class="ppt-ribbon-btn-lg"><svg><use href="#ppt-icon-design-ideas"/></svg><span class="ppt-ribbon-btn-text">Design<br>Suggestions</span></div>
    <div class="ppt-ribbon-btn-lg"><svg style="color:#7b5cbb"><use href="#ppt-icon-copilot"/></svg><span class="ppt-ribbon-btn-text">Copilot</span></div>
  </div>
  <div class="ppt-ribbon-group-label">&nbsp;</div>
</div>""")


def _thumb(num, title, mini_style, selected=False):
    """Build one thumbnail row."""
    sel = ' ppt-thumb-selected' if selected else ''
    return (
        f'<div class="ppt-thumb-row">'
        f'<span class="ppt-thumb-num">{num}</span>'
        f'<div class="ppt-thumb{sel}">'
        f'<div class="ppt-thumb-content" style="{mini_style}">'
        f'<div><div style="font-weight:600;font-size:6px">{title}</div></div>'
        f'</div></div></div>'
    )


# ── 12-slide deck thumbnails (V2–V4 share the same deck) ──
DECK_THUMBS_TEMPLATE = [
    (1,  "Q4 Business Review",    "background:#1a365d;color:#fff;font-size:6px;padding:6px"),
    (2,  "Agenda",                "font-size:6px"),
    (3,  "Executive Summary",     "font-size:6px"),
    (4,  "Revenue by Region",     "font-size:6px"),
    (5,  "Customer Segments",     "font-size:6px"),
    (6,  "Product Pipeline",      "font-size:6px"),
    (7,  "Revenue Growth",        "font-size:6px"),
    (8,  "Competitive Analysis",  "font-size:6px"),
    (9,  "Go-to-Market Plan",     "font-size:6px"),
    (10, "Team Roadmap",          "font-size:6px"),
    (11, "Q&A",                   "font-size:6px"),
    (12, "Thank You",             "background:#1a365d;color:#fff;font-size:6px"),
]

def build_deck_thumbs(selected_num):
    return "\n".join(
        _thumb(n, t, s, selected=(n == selected_num))
        for n, t, s in DECK_THUMBS_TEMPLATE
    )


# ═══════════════════════════════════════════════════════════════════════════════
# V1 — Start screen
# ═══════════════════════════════════════════════════════════════════════════════

V1_CANVAS = textwrap.dedent("""\
<style>
.b1p-start{position:absolute;inset:0;display:flex;background:#fff;font-family:'Segoe UI',sans-serif}
.b1p-start-left{width:280px;background:#C43E1C;color:#fff;display:flex;flex-direction:column;padding:40px 28px}
.b1p-start-logo{font-size:22px;font-weight:700;margin-bottom:24px;display:flex;align-items:center;gap:8px}
.b1p-start-logo svg{width:28px;height:28px;fill:#fff}
.b1p-start-menu{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.b1p-start-menu-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:4px;cursor:pointer;font-size:14px}
.b1p-start-menu-item:hover,.b1p-start-menu-item.b1p-active{background:rgba(255,255,255,0.15)}
.b1p-start-menu-item.b1p-active{font-weight:600}
.b1p-start-right{flex:1;padding:36px 48px;overflow-y:auto}
.b1p-start-section{margin-bottom:32px}
.b1p-start-section h2{font-size:16px;font-weight:600;color:#333;margin:0 0 16px}
.b1p-tmpl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.b1p-tmpl-card{border:1px solid #e1e1e1;border-radius:6px;overflow:hidden;cursor:pointer}
.b1p-tmpl-card:hover{border-color:#C43E1C}
.b1p-tmpl-preview{height:90px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#666}
.b1p-tmpl-label{padding:8px 10px;font-size:12px;color:#444;border-top:1px solid #e1e1e1;background:#fafafa}
.b1p-recent-list{display:flex;flex-direction:column;gap:6px}
.b1p-recent-row{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:4px;font-size:13px;color:#333}
.b1p-recent-row:hover{background:#f3f2f1}
.b1p-recent-date{margin-left:auto;font-size:11px;color:#888}
</style>
<div class="b1p-start">
  <div class="b1p-start-left">
    <div class="b1p-start-logo">
      <svg viewBox="0 0 24 24"><rect x="1" y="1" width="10" height="10" rx="1" fill="#fff"/><rect x="13" y="1" width="10" height="10" rx="1" fill="#fff" opacity=".7"/><rect x="1" y="13" width="10" height="10" rx="1" fill="#fff" opacity=".7"/><rect x="13" y="13" width="10" height="10" rx="1" fill="#fff" opacity=".4"/></svg>
      PowerPoint
    </div>
    <div class="b1p-start-menu">
      <div class="b1p-start-menu-item b1p-active"><svg style="width:18px;height:18px"><use href="#ppt-icon-new-slide"/></svg> Home</div>
      <div class="b1p-start-menu-item"><svg style="width:18px;height:18px"><use href="#ppt-icon-new-slide"/></svg> New</div>
      <div class="b1p-start-menu-item"><svg style="width:18px;height:18px"><use href="#ppt-icon-save"/></svg> Open</div>
    </div>
  </div>
  <div class="b1p-start-right">
    <div class="b1p-start-section">
      <h2>New</h2>
      <div class="b1p-tmpl-grid">
        <div class="b1p-tmpl-card"><div class="b1p-tmpl-preview" style="background:#fff;border:2px dashed #ccc">+ Blank</div><div class="b1p-tmpl-label">Blank Presentation</div></div>
        <div class="b1p-tmpl-card"><div class="b1p-tmpl-preview" style="background:linear-gradient(135deg,#1a365d,#2a5298);color:#fff">Aa</div><div class="b1p-tmpl-label">Corporate</div></div>
        <div class="b1p-tmpl-card"><div class="b1p-tmpl-preview" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff">Aa</div><div class="b1p-tmpl-label">Modern</div></div>
        <div class="b1p-tmpl-card"><div class="b1p-tmpl-preview" style="background:linear-gradient(135deg,#f5af19,#f12711);color:#fff">Aa</div><div class="b1p-tmpl-label">Bold</div></div>
      </div>
    </div>
    <div class="b1p-start-section">
      <h2>Recent</h2>
      <div class="b1p-recent-list">
        <div class="b1p-recent-row"><svg style="width:16px;height:16px;color:#C43E1C"><use href="#ppt-icon-create-pdf"/></svg> Q4 Business Review.pptx<span class="b1p-recent-date">Today</span></div>
        <div class="b1p-recent-row"><svg style="width:16px;height:16px;color:#C43E1C"><use href="#ppt-icon-create-pdf"/></svg> Sprint 24 Demo.pptx<span class="b1p-recent-date">Yesterday</span></div>
        <div class="b1p-recent-row"><svg style="width:16px;height:16px;color:#C43E1C"><use href="#ppt-icon-create-pdf"/></svg> Platform Architecture.pptx<span class="b1p-recent-date">Dec 15</span></div>
        <div class="b1p-recent-row"><svg style="width:16px;height:16px;color:#C43E1C"><use href="#ppt-icon-create-pdf"/></svg> FY26 Strategy Draft.pptx<span class="b1p-recent-date">Dec 10</span></div>
      </div>
    </div>
  </div>
</div>""")

V1_THUMBS = ""  # Start screen has no thumbnails

V1_RIBBON = ""  # Start screen hides ribbon content

V1 = {
    "id": "ppt-start-b1",
    "duration": 5,
    "component": "PowerPointScene",
    "props": {
        "mode": "edit",
        "filename": "PowerPoint",
        "ribbonContentHtml": V1_RIBBON,
        "thumbnailsHtml": V1_THUMBS,
        "canvasHtml": V1_CANVAS,
        "notesText": "",
        "statusPosition": "",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# V2 — Title slide (Slide 1/12)
# ═══════════════════════════════════════════════════════════════════════════════

V2_CANVAS = textwrap.dedent("""\
<div class="ppt-slide-title" style="background:#1a365d;color:#fff">
  <div class="ppt-slide-heading" style="color:#fff;font-size:36px">Q4 Business Review</div>
  <div class="ppt-slide-subtitle" style="color:rgba(255,255,255,0.85);font-size:18px">FY26 Strategy &amp; Execution</div>
  <div style="margin-top:28px;font-size:14px;color:rgba(255,255,255,0.55)">
    Product Engineering &bull; December 2025
  </div>
</div>""")

V2 = {
    "id": "ppt-title-slide-b1",
    "duration": 5,
    "component": "PowerPointScene",
    "props": {
        "mode": "edit",
        "filename": "Q4 Business Review.pptx",
        "ribbonContentHtml": HOME_RIBBON,
        "thumbnailsHtml": build_deck_thumbs(1),
        "canvasHtml": V2_CANVAS,
        "notesText": "Welcome everyone to the Q4 Business Review. We will cover revenue, strategy, and next steps.",
        "statusPosition": "Slide 1 of 12",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# V3 — Content slide with bullets (Slide 4/12)
# ═══════════════════════════════════════════════════════════════════════════════

V3_CANVAS = (
    '<style>'
    '.b1p-content{position:absolute;inset:0;padding:5% 6%;font-family:"Segoe UI",sans-serif;background:#fff}'
    '.b1p-content h1{font-size:28px;font-weight:600;color:#1a365d;margin:0 0 24px}'
    '.b1p-content-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:8px}'
    '.b1p-region-card{border-left:4px solid;padding:12px 16px;background:#f9f9f9;border-radius:0 6px 6px 0}'
    '.b1p-region-card h3{font-size:16px;font-weight:600;color:#333;margin:0 0 8px}'
    '.b1p-region-card ul{margin:0;padding-left:18px;font-size:13px;color:#555;line-height:1.8}'
    '.b1p-region-card .b1p-metric{font-size:22px;font-weight:700;margin-bottom:4px}'
    '</style>'
    '<div class="b1p-content">'
    '  <h1>Revenue by Region</h1>'
    '  <div class="b1p-content-grid">'
    f'    <div class="b1p-region-card" style="border-color:{CHART_BLUE}">'
    f'      <div class="b1p-metric" style="color:{CHART_BLUE}">$142M</div>'
    '      <h3>North America</h3>'
    '      <ul><li>Enterprise growth +18% YoY</li><li>SMB segment expanding</li><li>New channel partnerships</li></ul>'
    '    </div>'
    f'    <div class="b1p-region-card" style="border-color:{CHART_GREEN}">'
    f'      <div class="b1p-metric" style="color:{CHART_GREEN}">$87M</div>'
    '      <h3>EMEA</h3>'
    '      <ul><li>UK &amp; Germany leading</li><li>Nordics +22% growth</li><li>Regulatory compliance done</li></ul>'
    '    </div>'
    f'    <div class="b1p-region-card" style="border-color:{CHART_GOLD}">'
    f'      <div class="b1p-metric" style="color:{CHART_GOLD}">$63M</div>'
    '      <h3>Asia Pacific</h3>'
    '      <ul><li>Japan anchor account</li><li>India market entry</li><li>ANZ steady at +8%</li></ul>'
    '    </div>'
    f'    <div class="b1p-region-card" style="border-color:{CHART_ORANGE}">'
    f'      <div class="b1p-metric" style="color:{CHART_ORANGE}">$28M</div>'
    '      <h3>Latin America</h3>'
    '      <ul><li>Brazil flagship deal</li><li>Mexico expansion Q1</li><li>Partner ecosystem growing</li></ul>'
    '    </div>'
    '  </div>'
    '</div>'
)

V3 = {
    "id": "ppt-content-slide-b1",
    "duration": 5,
    "component": "PowerPointScene",
    "props": {
        "mode": "edit",
        "filename": "Q4 Business Review.pptx",
        "ribbonContentHtml": HOME_RIBBON,
        "thumbnailsHtml": build_deck_thumbs(4),
        "canvasHtml": V3_CANVAS,
        "notesText": "North America remains our strongest region at $142M. EMEA is accelerating thanks to Nordics growth.",
        "statusPosition": "Slide 4 of 12",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# V4 — Chart slide with inline SVG column chart (Slide 7/12)
# ═══════════════════════════════════════════════════════════════════════════════

# Revenue data (millions)
_CHART_DATA = [
    ("FY20", 180, CHART_BLUE),
    ("FY21", 215, CHART_LTBLUE),
    ("FY22", 260, CHART_GREEN),
    ("FY23", 295, CHART_GOLD),
    ("FY24", 340, CHART_ORANGE),
]
_MAX_VAL = 360  # ceiling for y-axis
_BAR_W = 60
_GAP = 30
_CHART_H = 220
_CHART_W = len(_CHART_DATA) * (_BAR_W + _GAP) + _GAP
_CHART_LEFT = 80  # room for y-axis labels
_CHART_TOP = 30

def _svg_chart():
    bars = []
    labels = []
    for i, (label, val, color) in enumerate(_CHART_DATA):
        x = _CHART_LEFT + _GAP + i * (_BAR_W + _GAP)
        h = val / _MAX_VAL * _CHART_H
        y = _CHART_TOP + _CHART_H - h
        bars.append(f'<rect x="{x}" y="{y}" width="{_BAR_W}" height="{h}" fill="{color}" rx="3"/>')
        bars.append(f'<text x="{x + _BAR_W/2}" y="{y - 6}" text-anchor="middle" font-size="12" fill="#333" font-weight="600">${val}M</text>')
        labels.append(f'<text x="{x + _BAR_W/2}" y="{_CHART_TOP + _CHART_H + 18}" text-anchor="middle" font-size="12" fill="#555">{label}</text>')
    # y-axis gridlines
    gridlines = []
    for v in range(0, _MAX_VAL + 1, 100):
        y = _CHART_TOP + _CHART_H - (v / _MAX_VAL * _CHART_H)
        gridlines.append(f'<line x1="{_CHART_LEFT}" y1="{y}" x2="{_CHART_LEFT + _CHART_W}" y2="{y}" stroke="#e0e0e0" stroke-dasharray="4"/>')
        gridlines.append(f'<text x="{_CHART_LEFT - 8}" y="{y + 4}" text-anchor="end" font-size="11" fill="#888">${v}M</text>')
    # baseline
    gridlines.append(f'<line x1="{_CHART_LEFT}" y1="{_CHART_TOP + _CHART_H}" x2="{_CHART_LEFT + _CHART_W}" y2="{_CHART_TOP + _CHART_H}" stroke="#999"/>')
    total_w = _CHART_LEFT + _CHART_W + 20
    total_h = _CHART_TOP + _CHART_H + 36
    return (
        f'<svg viewBox="0 0 {total_w} {total_h}" style="width:100%;max-height:320px">'
        + "".join(gridlines) + "".join(bars) + "".join(labels) +
        '</svg>'
    )

V4_CANVAS = (
    '<style>'
    '.b1p-chart-slide{position:absolute;inset:0;padding:5% 6%;font-family:"Segoe UI",sans-serif;background:#fff}'
    '.b1p-chart-slide h1{font-size:28px;font-weight:600;color:#1a365d;margin:0 0 4px}'
    '.b1p-chart-slide .b1p-chart-sub{font-size:14px;color:#666;margin-bottom:20px}'
    '.b1p-chart-wrap{display:flex;align-items:center;justify-content:center}'
    '.b1p-chart-legend{display:flex;gap:16px;margin-top:12px;justify-content:center}'
    '.b1p-chart-legend span{display:flex;align-items:center;gap:5px;font-size:12px;color:#555}'
    '.b1p-chart-legend i{display:inline-block;width:12px;height:12px;border-radius:2px}'
    '</style>'
    '<div class="b1p-chart-slide">'
    '  <h1>Revenue Growth FY20 &ndash; FY24</h1>'
    '  <div class="b1p-chart-sub">Annual revenue in millions (USD)</div>'
    f'  <div class="b1p-chart-wrap">{_svg_chart()}</div>'
    '  <div class="b1p-chart-legend">'
    f'    <span><i style="background:{CHART_BLUE}"></i>FY20</span>'
    f'    <span><i style="background:{CHART_LTBLUE}"></i>FY21</span>'
    f'    <span><i style="background:{CHART_GREEN}"></i>FY22</span>'
    f'    <span><i style="background:{CHART_GOLD}"></i>FY23</span>'
    f'    <span><i style="background:{CHART_ORANGE}"></i>FY24</span>'
    '  </div>'
    '</div>'
)

V4 = {
    "id": "ppt-chart-slide-b1",
    "duration": 5,
    "component": "PowerPointScene",
    "props": {
        "mode": "edit",
        "filename": "Q4 Business Review.pptx",
        "ribbonContentHtml": HOME_RIBBON,
        "thumbnailsHtml": build_deck_thumbs(7),
        "canvasHtml": V4_CANVAS,
        "notesText": "Revenue has grown from $180M to $340M over five years — a CAGR of approximately 17%.",
        "statusPosition": "Slide 7 of 12",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# V5 — Presenter full-bleed (present mode, zero chrome)
# ═══════════════════════════════════════════════════════════════════════════════

V5_CANVAS = textwrap.dedent("""\
<div class="ppt-slide-fullbleed" style="background:#1a365d;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font-family:'Segoe UI',sans-serif">
  <div>
    <div style="font-size:48px;font-weight:700;letter-spacing:-0.5px">Q4 Business Review</div>
    <div style="font-size:22px;color:rgba(255,255,255,0.8);margin-top:16px">FY26 Strategy &amp; Execution</div>
    <div style="margin-top:36px;font-size:15px;color:rgba(255,255,255,0.5)">Product Engineering &bull; December 2025</div>
  </div>
</div>""")

V5 = {
    "id": "ppt-presenter-fullbleed-b1",
    "duration": 5,
    "component": "PowerPointScene",
    "props": {
        "mode": "present",
        "filename": "",
        "ribbonContentHtml": "",
        "thumbnailsHtml": "",
        "canvasHtml": V5_CANVAS,
        "notesText": "",
        "statusPosition": "",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# Write all 5 SCFs
# ═══════════════════════════════════════════════════════════════════════════════

VARIANTS = [V1, V2, V3, V4, V5]

def main():
    for v in VARIANTS:
        scf = {**SCF_SHELL, "scenes": [v]}
        path = OUT / f"{v['id']}.scf.json"
        path.write_text(json.dumps(scf, indent=2) + "\n", encoding="utf-8")
        print(f"  ✓  {path.name}")
    print(f"\nWrote {len(VARIANTS)} SCF files → {OUT}")


if __name__ == "__main__":
    main()
