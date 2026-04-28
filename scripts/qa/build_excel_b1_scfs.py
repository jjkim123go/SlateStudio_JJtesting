#!/usr/bin/env python3
"""Build 5 ExcelScene Wave-B SCF variants for PR 10c fidelity hardening.

Variants
--------
V1  excel-start-b1          Start screen  (data-view-mode="start")
V2  excel-table-b1          Formatted data table
V3  excel-chart-b1          Inline SVG bar chart + source data
V4  excel-formula-active-b1 Cell in editing mode, formula bar active
V5  excel-multi-sheet-b1    4-6 sheet tabs, active tab "Q3"

Usage:  python scripts/qa/build_excel_b1_scfs.py
"""
import json, os, pathlib, textwrap

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent.parent
OUT = REPO / "tests" / "qa-scenarios"
OUT.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def C(text="", *cls):
    """One grid cell with optional helper classes."""
    c = " ".join(["xl-gcell"] + list(cls))
    return f'<div class="{c}">{text}</div>'

EC = '<div class="xl-gcell"></div>'

def R(*cells):
    return "<div class=\"xl-grow\">" + "".join(cells) + "</div>"

def pad(cells, n=21):
    return list(cells) + [EC] * (n - len(cells))

def grid(data_rows, total=20, cols=21):
    rows = [R(*pad(dr, cols)) for dr in data_rows]
    er = R(*([EC] * cols))
    while len(rows) < total:
        rows.append(er)
    return "".join(rows)

def stab(name, active=False):
    cls = "xl-stab xl-stab--active" if active else "xl-stab"
    return f'<button class="{cls}">{name}</button>'

def stat(label, value):
    return f'<span class="xl-sb-stat">{label}: {value}</span>'

# ---------------------------------------------------------------------------
# HOME RIBBON — default Home-tab button groups (from Wave A chrome)
# ---------------------------------------------------------------------------
HOME_RIBBON = (
    '<!-- Clipboard -->'
    '<div class="xl-rgroup"><div class="xl-rgroup-body">'
    '<button class="xl-rbtn xl-rbtn--lg"><svg><use href="#xl-icon-paste"/></svg>'
    '<span class="xl-rlabel">Paste</span></button>'
    '<div class="xl-rstack">'
    '<button class="xl-rbtn xl-rbtn--sm"><svg><use href="#xl-icon-cut"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--sm"><svg><use href="#xl-icon-copy"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--sm"><svg><use href="#xl-icon-format-painter"/></svg></button>'
    '</div></div><span class="xl-rgroup-label">Clipboard</span></div>'

    '<!-- Font -->'
    '<div class="xl-rgroup"><div class="xl-rgroup-body">'
    '<div style="display:flex;gap:2px;align-items:center">'
    '<div class="xl-font-name"><span>Aptos Narrow</span><svg><use href="#xl-icon-chevron-down"/></svg></div>'
    '<div class="xl-font-size"><span>11</span><svg><use href="#xl-icon-chevron-down"/></svg></div>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-font-increase"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-font-decrease"/></svg></button>'
    '</div>'
    '<div style="display:flex;gap:1px;align-items:center">'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-bold"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-italic"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-underline"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-borders"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><div class="xl-color-swatch" style="background:#ffc000"></div></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><div class="xl-color-swatch" style="background:#ff0000;height:2px;border-radius:0"></div></button>'
    '</div></div><span class="xl-rgroup-label">Font</span></div>'

    '<!-- Alignment -->'
    '<div class="xl-rgroup"><div class="xl-rgroup-body">'
    '<div style="display:flex;gap:1px;align-items:center">'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-align-top"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-align-middle"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-align-bottom"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-text-orient"/></svg></button>'
    '</div>'
    '<div style="display:flex;gap:1px;align-items:center">'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-align-left"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-align-center"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-align-right"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon xl-rbtn--dropdown"><svg><use href="#xl-icon-indent-dec"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon xl-rbtn--dropdown"><svg><use href="#xl-icon-indent-inc"/></svg></button>'
    '</div>'
    '<div style="display:flex;gap:1px;align-items:center">'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-wrap-text"/></svg><span>Wrap Text</span></button>'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-merge-center"/></svg><span>Merge &amp; Center</span></button>'
    '</div></div><span class="xl-rgroup-label">Alignment</span></div>'

    '<!-- Number -->'
    '<div class="xl-rgroup"><div class="xl-rgroup-body">'
    '<div style="display:flex;gap:2px;align-items:center;width:100%">'
    '<div class="xl-num-fmt"><span>General</span><svg><use href="#xl-icon-chevron-down"/></svg></div>'
    '</div>'
    '<div style="display:flex;gap:1px;align-items:center">'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-accounting"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-percent"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-comma-style"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-decimal-inc"/></svg></button>'
    '<button class="xl-rbtn xl-rbtn--icon"><svg><use href="#xl-icon-decimal-dec"/></svg></button>'
    '</div></div><span class="xl-rgroup-label">Number</span></div>'

    '<!-- Styles -->'
    '<div class="xl-rgroup"><div class="xl-rgroup-body">'
    '<div class="xl-rstack" style="gap:2px">'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-conditional-format"/></svg><span>Conditional Formatting</span></button>'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-format-table"/></svg><span>Format as Table</span></button>'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-cell-styles"/></svg><span>Cell Styles</span></button>'
    '</div></div><span class="xl-rgroup-label">Styles</span></div>'

    '<!-- Cells -->'
    '<div class="xl-rgroup"><div class="xl-rgroup-body">'
    '<div class="xl-rstack" style="gap:2px">'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-insert"/></svg><span>Insert</span></button>'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-delete"/></svg><span>Delete</span></button>'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-format"/></svg><span>Format</span></button>'
    '</div></div><span class="xl-rgroup-label">Cells</span></div>'

    '<!-- Editing -->'
    '<div class="xl-rgroup"><div class="xl-rgroup-body">'
    '<div class="xl-rstack" style="gap:2px">'
    '<button class="xl-rbtn xl-rbtn--sm"><svg><use href="#xl-icon-autosum"/></svg><span>\u03a3 AutoSum</span></button>'
    '<button class="xl-rbtn xl-rbtn--sm xl-rbtn--dropdown"><svg><use href="#xl-icon-sort"/></svg><span>Sort &amp; Filter</span></button>'
    '<button class="xl-rbtn xl-rbtn--sm"><svg><use href="#xl-icon-find"/></svg><span>Find &amp; Select</span></button>'
    '</div></div><span class="xl-rgroup-label">Editing</span></div>'
)

# ---------------------------------------------------------------------------
# V1 — START SCREEN
# ---------------------------------------------------------------------------
V1_CSS = textwrap.dedent("""\
<style>
.xl-bg:has(.b1x-start) .xl-ribbon-tabs,
.xl-bg:has(.b1x-start) .xl-ribbon-content,
.xl-bg:has(.b1x-start) .xl-formulabar,
.xl-bg:has(.b1x-start) .xl-sheettabs,
.xl-bg:has(.b1x-start) .xl-statusbar,
.xl-bg:has(.b1x-start) .xl-copilot-fab,
.xl-bg:has(.b1x-start) .xl-grid-corner,
.xl-bg:has(.b1x-start) .xl-grid-colhead,
.xl-bg:has(.b1x-start) .xl-grid-rowhead { display:none!important }
.xl-bg:has(.b1x-start) .xl-grid-wrapper>div:first-child { display:none!important }
.xl-bg:has(.b1x-start) .xl-grid-wrapper { overflow:visible!important }
.xl-bg:has(.b1x-start) .xl-grid-cells {
  position:absolute!important; inset:0!important;
  overflow:hidden!important; display:flex!important;
}
.b1x-start { display:flex; width:100%; height:100%; font-family:'Segoe UI',sans-serif }
.b1x-side { width:64px; flex-shrink:0; background:#107C41; display:flex;
  flex-direction:column; align-items:center; padding:12px 0; gap:4px }
.b1x-sn { display:flex; flex-direction:column; align-items:center; gap:2px;
  padding:8px 0; width:100%; color:rgba(255,255,255,.7); cursor:default; font-size:10px }
.b1x-sn.b1x-a { background:rgba(255,255,255,.15); color:#fff }
.b1x-sn svg { width:20px; height:20px; fill:currentColor }
.b1x-main { flex:1; padding:40px 48px; background:#f3f2f1; overflow:hidden }
.b1x-greet { font-size:28px; font-weight:600; color:#242424; margin-bottom:20px }
.b1x-sec { display:flex; align-items:baseline; gap:8px; font-size:14px; color:#242424;
  margin-bottom:12px }
.b1x-more { margin-left:auto; font-size:13px; color:#0078d4; font-weight:600 }
.b1x-trow { display:flex; gap:16px; margin-bottom:28px }
.b1x-tc { width:136px; flex-shrink:0; display:flex; flex-direction:column; gap:6px; cursor:default }
.b1x-ti { width:136px; height:96px; border-radius:4px; border:1px solid #e1dfdd; background:#fff;
  display:flex; align-items:center; justify-content:center; font-size:11px; color:#616161 }
.b1x-ti.b1x-green { background:#e6f4ea; color:#107C41; font-weight:600; font-size:12px;
  flex-direction:column; gap:4px; text-align:center; line-height:1.3 }
.b1x-tl { font-size:12px; color:#424242; text-align:center }
.b1x-tabs { display:flex; gap:4px; margin-bottom:12px }
.b1x-tab { padding:6px 16px; border-radius:16px; font-size:13px; border:1px solid #d4d4d4;
  background:#fff; color:#242424; cursor:default }
.b1x-tab.b1x-a { background:#107C41; color:#fff; border-color:#107C41 }
.b1x-fhdr { display:flex; padding:8px 0; font-size:12px; color:#616161; font-weight:600;
  border-bottom:1px solid #e1dfdd }
.b1x-fr { display:flex; align-items:center; padding:10px 0; border-bottom:1px solid #f0f0f0;
  font-size:13px; gap:12px }
.b1x-fi { width:20px; height:20px; flex-shrink:0; background:#107C41; border-radius:2px;
  display:flex; align-items:center; justify-content:center; color:#fff; font-size:8px;
  font-weight:700 }
.b1x-fn { flex:1; color:#242424 }
.b1x-fp { flex:1; color:#8a8886; font-size:12px }
.b1x-fd { width:130px; color:#8a8886; font-size:12px; text-align:right }
</style>""")

V1_HTML = (
    '<div class="b1x-start">'
    '<div class="b1x-side">'
    '<div class="b1x-sn b1x-a"><svg viewBox="0 0 20 20"><path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z"/></svg><span>Home</span></div>'
    '<div class="b1x-sn"><svg viewBox="0 0 20 20"><path d="M4 3h8.5L16 6.5V17a1 1 0 01-1 1H5a1 1 0 01-1-1V3z"/></svg><span>New</span></div>'
    '<div class="b1x-sn"><svg viewBox="0 0 20 20"><path d="M2 5a1 1 0 011-1h6l2 2h6a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V5z"/></svg><span>Open</span></div>'
    '</div>'
    '<div class="b1x-main">'
    '<div class="b1x-greet">Good afternoon</div>'
    '<div class="b1x-sec"><span>\u25BE New</span><span class="b1x-more">More templates \u2192</span></div>'
    '<div class="b1x-trow">'
    '<div class="b1x-tc"><div class="b1x-ti" style="position:relative"><div style="position:absolute;top:18px;left:18px;width:50px;height:1px;background:#107C41"></div><div style="position:absolute;top:18px;left:18px;width:1px;height:55px;background:#e1dfdd"></div></div><span class="b1x-tl">Blank workbook</span></div>'
    '<div class="b1x-tc"><div class="b1x-ti b1x-green">Take a tour</div><span class="b1x-tl">Welcome to Excel</span></div>'
    '<div class="b1x-tc"><div class="b1x-ti b1x-green"><span>Get started with</span><span style="font-size:16px">Formulas</span></div><span class="b1x-tl">Formula tutorial</span></div>'
    '<div class="b1x-tc"><div class="b1x-ti b1x-green"><span>Make your first</span><span style="font-size:16px">PivotTable</span></div><span class="b1x-tl">PivotTable tutorial</span></div>'
    '<div class="b1x-tc"><div class="b1x-ti" style="background:#f5f5f5"></div><span class="b1x-tl">Simple Gantt chart</span></div>'
    '<div class="b1x-tc"><div class="b1x-ti" style="background:#f5f5f5"></div><span class="b1x-tl">Calendar template</span></div>'
    '</div>'
    '<div class="b1x-tabs"><div class="b1x-tab b1x-a">Recent</div><div class="b1x-tab">Favorites</div><div class="b1x-tab">Shared with Me</div></div>'
    '<div class="b1x-fhdr"><span style="flex:1;padding-left:32px">Name</span><span style="width:130px;text-align:right">Date modified</span></div>'
    '<div class="b1x-fr"><div class="b1x-fi">X</div><span class="b1x-fn">Q4_Budget_Draft.xlsx</span><span class="b1x-fp">OneDrive \u203a Finance</span><span class="b1x-fd">Wed at 2:18 PM</span></div>'
    '<div class="b1x-fr"><div class="b1x-fi">X</div><span class="b1x-fn">Sales_Pipeline_2026.xlsx</span><span class="b1x-fp">SharePoint \u203a Northwind</span><span class="b1x-fd">Wed at 2:18 PM</span></div>'
    '<div class="b1x-fr"><div class="b1x-fi">X</div><span class="b1x-fn">Inventory_Tracker.xlsx</span><span class="b1x-fp">OneDrive \u203a Operations</span><span class="b1x-fd">Tue at 10:00 AM</span></div>'
    '<div class="b1x-fr"><div class="b1x-fi">X</div><span class="b1x-fn">Regional_Revenue_FY26.xlsx</span><span class="b1x-fp">SharePoint \u203a Analytics</span><span class="b1x-fd">March 25</span></div>'
    '<div class="b1x-fr"><div class="b1x-fi">X</div><span class="b1x-fn">Headcount_Forecast.xlsx</span><span class="b1x-fp">OneDrive \u203a HR Planning</span><span class="b1x-fd">March 24</span></div>'
    '</div></div>'
)

def v1_start():
    return ("excel-start-b1", "excel-start-b1.scf.json", {
        "filename": "Excel",
        "ribbonContentHtml": "",
        "nameBox": "",
        "formulaText": "",
        "cellsHtml": V1_CSS + V1_HTML,
        "sheetTabsHtml": "",
        "statusHtml": "",
    })

# ---------------------------------------------------------------------------
# V2 — DATA TABLE  (10 data rows + header + total = 12 rows)
# ---------------------------------------------------------------------------
V2_TABLE = [
    # (Region, Product, Q1 Sales, Q2 Sales, Growth, Status)
    ("Region",   "Product",     "Q1 Sales",  "Q2 Sales",  "Growth", "Status"),
    ("North",    "Widget Pro",  "$45,200",   "$52,100",   "15.3%",  "Active"),
    ("North",    "Gadget Plus", "$31,800",   "$29,400",   "\u22127.5%", "Review"),
    ("East",     "Widget Pro",  "$38,900",   "$41,200",   "5.9%",   "Active"),
    ("East",     "Gadget Plus", "$22,100",   "$26,300",   "19.0%",  "Active"),
    ("South",    "Widget Pro",  "$29,400",   "$33,800",   "15.0%",  "Active"),
    ("South",    "Gadget Plus", "$18,700",   "$21,500",   "15.0%",  "Active"),
    ("West",     "Widget Pro",  "$41,600",   "$48,900",   "17.5%",  "Active"),
    ("West",     "Gadget Plus", "$25,300",   "$23,100",   "\u22128.7%", "Review"),
    ("Central",  "Widget Pro",  "$33,200",   "$36,800",   "10.8%",  "Active"),
    ("Central",  "Gadget Plus", "$19,800",   "$22,400",   "13.1%",  "Active"),
    ("Total",    "",            "$306,000",  "$335,500",  "9.6%",   ""),
]

def v2_table():
    rows = []
    for i, t in enumerate(V2_TABLE):
        cells = []
        is_hdr = (i == 0)
        is_total = (i == len(V2_TABLE) - 1)
        is_stripe = (i % 2 == 0 and not is_hdr and not is_total)
        for j, val in enumerate(t):
            cls = []
            if is_hdr:
                cls.append("xl-cell-table-header")
            elif is_stripe:
                cls.append("xl-cell-table-stripe")
            if is_total and j == 0:
                cls.append("xl-cell-bold")
            if j in (2, 3) and not is_hdr:
                cls.append("xl-cell-number")
            if j == 4 and not is_hdr:
                cls.append("xl-cell-number")
            cells.append(C(val, *cls))
        # A1 selected
        if i == 0:
            cells[0] = C(t[0], "xl-cell-table-header", "xl-cell-selected")
        rows.append(cells)
    return ("excel-table-b1", "excel-table-b1.scf.json", {
        "filename": "Q4_Sales_Report.xlsx \u2013 Excel",
        "ribbonContentHtml": HOME_RIBBON,
        "nameBox": "A1",
        "formulaText": "",
        "cellsHtml": grid(rows),
        "sheetTabsHtml": stab("Sales Data", True) + stab("Summary"),
        "statusHtml": stat("Average", "$28,000") + stat("Count", "12") + stat("Sum", "$335,500"),
    })

# ---------------------------------------------------------------------------
# V3 — CHART  (source data left, SVG bar chart right)
# ---------------------------------------------------------------------------
V3_DATA = [
    ("Region",  "Revenue"),
    ("North",   "$380,000"),
    ("South",   "$245,000"),
    ("East",    "$310,000"),
    ("West",    "$205,000"),
]

V3_CHART_SVG = textwrap.dedent("""\
<svg xmlns="http://www.w3.org/2000/svg" class="b1x-chart"
     viewBox="0 0 480 220" style="position:absolute;left:220px;top:8px;width:480px;height:220px">
  <rect x="50" y="20" width="420" height="170" fill="#fff" stroke="#d4d4d4" stroke-width=".5"/>
  <text x="260" y="14" text-anchor="middle" font-size="11" font-weight="600"
        fill="#242424" font-family="Segoe UI">Regional Revenue ($K)</text>
  <line x1="50" y1="55"  x2="470" y2="55"  stroke="#e8e8e8" stroke-width=".5"/>
  <line x1="50" y1="90"  x2="470" y2="90"  stroke="#e8e8e8" stroke-width=".5"/>
  <line x1="50" y1="125" x2="470" y2="125" stroke="#e8e8e8" stroke-width=".5"/>
  <line x1="50" y1="160" x2="470" y2="160" stroke="#e8e8e8" stroke-width=".5"/>
  <text x="45" y="58"  text-anchor="end" font-size="9" fill="#616161">400</text>
  <text x="45" y="93"  text-anchor="end" font-size="9" fill="#616161">300</text>
  <text x="45" y="128" text-anchor="end" font-size="9" fill="#616161">200</text>
  <text x="45" y="163" text-anchor="end" font-size="9" fill="#616161">100</text>
  <rect x="80"  y="28"  width="55" height="162" fill="#4472C4" rx="2"/>
  <rect x="180" y="68"  width="55" height="122" fill="#ED7D31" rx="2"/>
  <rect x="280" y="48"  width="55" height="142" fill="#A5A5A5" rx="2"/>
  <rect x="380" y="88"  width="55" height="102" fill="#FFC000" rx="2"/>
  <line x1="50" y1="190" x2="470" y2="190" stroke="#242424" stroke-width="1"/>
  <line x1="50" y1="20"  x2="50"  y2="190" stroke="#242424" stroke-width="1"/>
  <text x="107" y="205" text-anchor="middle" font-size="10" fill="#242424">North</text>
  <text x="207" y="205" text-anchor="middle" font-size="10" fill="#242424">South</text>
  <text x="307" y="205" text-anchor="middle" font-size="10" fill="#242424">East</text>
  <text x="407" y="205" text-anchor="middle" font-size="10" fill="#242424">West</text>
</svg>""").replace("\n", "")

V3_CSS = '<style>.b1x-chart{pointer-events:none}</style>'

def v3_chart():
    rows = []
    for i, (reg, rev) in enumerate(V3_DATA):
        is_hdr = (i == 0)
        cells = [
            C(reg, *(["xl-cell-table-header"] if is_hdr else (["xl-cell-table-stripe"] if i % 2 == 0 else []))),
            C(rev, *(["xl-cell-table-header"] if is_hdr else ["xl-cell-number"])),
        ]
        rows.append(cells)
    # Inject chart SVG into first row after the data via a wrapper
    cells_html = V3_CSS + '<div style="position:relative">' + grid(rows) + V3_CHART_SVG + '</div>'
    return ("excel-chart-b1", "excel-chart-b1.scf.json", {
        "filename": "Regional_Revenue.xlsx \u2013 Excel",
        "ribbonContentHtml": HOME_RIBBON,
        "nameBox": "G3",
        "formulaText": "",
        "cellsHtml": cells_html,
        "sheetTabsHtml": stab("Chart", True) + stab("Data"),
        "statusHtml": stat("Average", "$285,000") + stat("Count", "4") + stat("Sum", "$1,140,000"),
    })

# ---------------------------------------------------------------------------
# V4 — FORMULA ACTIVE  (cell B12 editing, formula bar shows =SUM)
# ---------------------------------------------------------------------------
V4_BUDGET = [
    ("Category",    "Budget"),
    ("Salaries",    "$125,000"),
    ("Benefits",    "$37,500"),
    ("Marketing",   "$45,000"),
    ("Operations",  "$28,000"),
    ("Travel",      "$15,000"),
    ("Software",    "$22,000"),
    ("Training",    "$8,500"),
    ("Supplies",    "$12,000"),
    ("Utilities",   "$9,800"),
    ("Misc",        "$5,200"),
    ("Total",       "=SUM(B2:B11)"),
]

V4_CSS = textwrap.dedent("""\
<style>
.xl-bg:has(.b1x-edit-mode) .xl-sb-mode { font-size:0!important }
.xl-bg:has(.b1x-edit-mode) .xl-sb-mode::before { content:"Edit"; font-size:11px }
</style>""")

def v4_formula():
    rows = []
    for i, (cat, val) in enumerate(V4_BUDGET):
        is_hdr = (i == 0)
        is_total = (i == len(V4_BUDGET) - 1)
        c0_cls = ["xl-cell-table-header"] if is_hdr else (["xl-cell-bold"] if is_total else [])
        c1_cls = ["xl-cell-table-header"] if is_hdr else ["xl-cell-number"]
        if is_total:
            c1_cls.append("xl-cell-editing")
            c1_cls.append("xl-cell-formula-result")
        if not is_hdr and not is_total and i % 2 == 0:
            c0_cls.append("xl-cell-table-stripe")
            c1_cls.append("xl-cell-table-stripe")
        cells = [C(cat, *c0_cls), C(val, *c1_cls)]
        rows.append(cells)
    return ("excel-formula-active-b1", "excel-formula-active-b1.scf.json", {
        "filename": "Budget_FY2025.xlsx \u2013 Excel",
        "ribbonContentHtml": HOME_RIBBON,
        "nameBox": "B12",
        "formulaText": "=SUM(B2:B11)",
        "cellsHtml": V4_CSS + '<div class="b1x-edit-mode">' + grid(rows) + '</div>',
        "sheetTabsHtml": stab("Budget", True) + stab("Actuals"),
        "statusHtml": stat("Sum", "$308,000"),
    })

# ---------------------------------------------------------------------------
# V5 — MULTI-SHEET  (6 tabs, Q3 active, quarterly P&L data)
# ---------------------------------------------------------------------------
V5_DATA = [
    ("Metric",       "Jul",      "Aug",      "Sep",      "Q3 Total"),
    ("Revenue",      "$94,200",  "$101,300", "$98,500",  "$294,000"),
    ("COGS",         "$47,100",  "$50,650",  "$49,250",  "$147,000"),
    ("Gross Margin", "$47,100",  "$50,650",  "$49,250",  "$147,000"),
    ("OpEx",         "$28,200",  "$30,390",  "$29,550",  "$88,140"),
    ("Net Income",   "$18,900",  "$20,260",  "$19,700",  "$58,860"),
]

def v5_multi_sheet():
    rows = []
    for i, tup in enumerate(V5_DATA):
        is_hdr = (i == 0)
        cells = []
        for j, val in enumerate(tup):
            cls = []
            if is_hdr:
                cls.append("xl-cell-table-header")
            elif j >= 1:
                cls.append("xl-cell-number")
            if not is_hdr and i % 2 == 0:
                cls.append("xl-cell-table-stripe")
            if j == 0 and not is_hdr:
                cls.append("xl-cell-bold")
            cells.append(C(val, *cls))
        rows.append(cells)
    # C5 selected (row 4 col 2 in 0-indexed = row 5 col C in Excel)
    rows[4][2] = C(V5_DATA[4][2], "xl-cell-number", "xl-cell-table-stripe", "xl-cell-selected")
    tabs = (
        stab("Summary") + stab("Q1") + stab("Q2")
        + stab("Q3", True) + stab("Q4") + stab("Notes")
    )
    return ("excel-multi-sheet-b1", "excel-multi-sheet-b1.scf.json", {
        "filename": "Quarterly_Report.xlsx \u2013 Excel",
        "ribbonContentHtml": HOME_RIBBON,
        "nameBox": "C5",
        "formulaText": "",
        "cellsHtml": grid(rows),
        "sheetTabsHtml": tabs,
        "statusHtml": stat("Average", "$94,250") + stat("Count", "8") + stat("Sum", "$754,000"),
    })

# ---------------------------------------------------------------------------
# SCF builder
# ---------------------------------------------------------------------------
def make_scf(vid, props):
    return {
        "version": "1.0",
        "pipeline": "synthetic-recording",
        "outputProfile": {"width": 1920, "height": 1080, "fps": 30},
        "scenes": [{
            "id": vid,
            "duration": 4,
            "component": "ExcelScene",
            "props": props,
        }],
    }

def main():
    builders = [v1_start, v2_table, v3_chart, v4_formula, v5_multi_sheet]
    print(f"Building {len(builders)} ExcelScene Wave-B variants...")
    for build_fn in builders:
        vid, fname, props = build_fn()
        scf = make_scf(vid, props)
        path = OUT / fname
        path.write_text(json.dumps(scf, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  \u2713 {fname}")
    print("Done.")

if __name__ == "__main__":
    main()
