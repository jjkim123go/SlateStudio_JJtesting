"""Build EdgeBrowserScene Wave B content-fill SCFs (5 variants).

Generates 5 render-ready SCF JSON files for QA validation.
Re-run after editing HTML/CSS below to regenerate deterministically.

Variants:
  V1  edge-newtab-b1       New Tab start page (Bing search, top sites, news)
  V2  edge-search-b1       Bing search results page
  V3  edge-wikipedia-b1    Wikipedia article
  V4  edge-github-b1       GitHub repository page (single tab)
  V5  edge-multi-tab-b1    Multi-tab session (5 tabs, GitHub active)
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = REPO / "tests" / "qa-scenarios"

# ═══════════════════════════════════════════════════════════════════════════════
# Inline SVG Favicons — sites not in the chrome shell symbol defs
# ═══════════════════════════════════════════════════════════════════════════════
FAV = {
    "edge": '<svg aria-hidden="true"><use href="#edge-icon-edge-logo"/></svg>',
    "bing": (
        '<svg viewBox="0 0 16 16" aria-hidden="true">'
        '<path d="M3 2l3 1.1v8.4l3.6-2.1-2-1L9.2 6l5.8 2.2v3.3L8.6 15 3 12V2z" fill="#008373"/>'
        '</svg>'
    ),
    "wiki": (
        '<svg viewBox="0 0 16 16" aria-hidden="true">'
        '<text x="2" y="13" font-family="Georgia,serif" font-size="14" font-weight="700" fill="#333">W</text>'
        '</svg>'
    ),
    "github": (
        '<svg viewBox="0 0 16 16" aria-hidden="true">'
        '<path d="M8 .2A8 8 0 0 0 5.47 15.79c.4.07.55-.17.55-.38v-1.33'
        'C3.82 14.5 3.35 13 3.35 13a2.37 2.37 0 0 0-1-1.3c-.8-.55.06-.54'
        '.06-.54a1.88 1.88 0 0 1 1.37.92 1.91 1.91 0 0 0 2.61.75 1.92'
        ' 1.92 0 0 1 .57-1.2c-2-.23-4.1-1-4.1-4.45a3.48 3.48 0 0 1'
        ' .93-2.42 3.24 3.24 0 0 1 .09-2.38s.96-.31 2.68 1c.77-.22'
        ' 1.6-.33 2.42-.33.83 0 1.66.11 2.43.33 1.72-1.3 2.47-1.03'
        ' 2.47-1.03a3.24 3.24 0 0 1 .09 2.38 3.48 3.48 0 0 1 .93'
        ' 2.42c0 3.46-2.1 4.22-4.11 4.44a2.14 2.14 0 0 1 .61 1.67'
        'v2.47c0 .21.14.46.55.38A8 8 0 0 0 8 .2z" fill="#24292f"/>'
        '</svg>'
    ),
    "contoso": (
        '<svg viewBox="0 0 16 16" aria-hidden="true">'
        '<rect width="16" height="16" rx="3" fill="#0078D4"/>'
        '<text x="3" y="12" font-family="Segoe UI,sans-serif" font-size="10"'
        ' font-weight="700" fill="#fff">C</text>'
        '</svg>'
    ),
    "globe": '<svg aria-hidden="true"><use href="#edge-icon-globe"/></svg>',
}

CLOSE_BTN = (
    '<button class="edge-tab-close" aria-label="Close tab">'
    '<svg aria-hidden="true"><use href="#edge-icon-close"/></svg>'
    '</button>'
)


# ═══════════════════════════════════════════════════════════════════════════════
# Tab / Bookmark Helpers
# ═══════════════════════════════════════════════════════════════════════════════
def tab(fav: str, title: str, active: bool = False) -> str:
    cls = "edge-tab edge-tab--active" if active else "edge-tab"
    return (
        f'<div class="{cls}">'
        f'<span class="edge-tab-favicon">{FAV[fav]}</span>'
        f'<span class="edge-tab-title">{title}</span>'
        f'{CLOSE_BTN}'
        f'</div>'
    )


def bm(label: str, fav: str = "globe") -> str:
    return (
        f'<a class="edge-bm-item">'
        f'<span class="edge-bm-item-icon">{FAV[fav]}</span>'
        f'<span class="edge-bm-item-label">{label}</span>'
        f'</a>'
    )


BOOKMARKS = "".join([
    bm("Contoso Portal", "contoso"),
    bm("Incident Dashboard"),
    bm("Pull Requests"),
    bm("Project Board"),
    bm("Cloud Dashboard"),
    bm("Design System"),
    bm("Analytics"),
])


# ═══════════════════════════════════════════════════════════════════════════════
# Shared CSS base — b1e- prefix throughout (NEVER reuse .edge-)
# ═══════════════════════════════════════════════════════════════════════════════
CSS_BASE = (
    '.b1e-page{width:100%;height:100%;overflow:hidden;'
    'font-family:"Segoe UI Variable","Segoe UI",-apple-system,'
    'BlinkMacSystemFont,system-ui,sans-serif;'
    '-webkit-font-smoothing:antialiased;box-sizing:border-box;}'
    '.b1e-page *,.b1e-page *::before,.b1e-page *::after{box-sizing:inherit;}'
)


# ═══════════════════════════════════════════════════════════════════════════════
# V1 — New Tab Start Page
# ═══════════════════════════════════════════════════════════════════════════════
CSS_NEWTAB = CSS_BASE + (
    '.b1e-nt{display:flex;flex-direction:column;align-items:center;'
    'background:#f5f5f5;padding-top:72px;min-height:100%;}'
    '.b1e-nt-greeting{font-size:28px;font-weight:300;color:#1a1a1a;'
    'margin-bottom:24px;letter-spacing:-.3px;}'
    '.b1e-nt-search{display:flex;align-items:center;width:580px;height:44px;'
    'background:#fff;border:1px solid #ddd;border-radius:22px;'
    'padding:0 16px;gap:10px;box-shadow:0 2px 6px rgba(0,0,0,.06);}'
    '.b1e-nt-search svg{width:18px;height:18px;color:#666;flex-shrink:0;}'
    '.b1e-nt-search-text{font-size:14px;color:#999;flex:1;}'
    '.b1e-nt-sites{display:grid;grid-template-columns:repeat(6,80px);'
    'gap:16px;margin-top:40px;}'
    '.b1e-nt-site{display:flex;flex-direction:column;align-items:center;'
    'gap:6px;cursor:default;}'
    '.b1e-nt-site-icon{width:48px;height:48px;border-radius:12px;'
    'background:#fff;display:flex;align-items:center;justify-content:center;'
    'box-shadow:0 1px 4px rgba(0,0,0,.08);}'
    '.b1e-nt-site-icon svg{width:24px;height:24px;}'
    '.b1e-nt-site-label{font-size:11px;color:#555;text-align:center;'
    'max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    '.b1e-nt-feed{margin-top:40px;width:680px;}'
    '.b1e-nt-feed-title{font-size:13px;font-weight:600;color:#333;'
    'margin-bottom:12px;}'
    '.b1e-nt-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}'
    '.b1e-nt-card{background:#fff;border-radius:8px;overflow:hidden;'
    'box-shadow:0 1px 4px rgba(0,0,0,.06);}'
    '.b1e-nt-card-img{width:100%;height:100px;display:flex;'
    'align-items:center;justify-content:center;color:#aaa;font-size:11px;}'
    '.b1e-nt-card-body{padding:10px 12px;}'
    '.b1e-nt-card-headline{font-size:12.5px;font-weight:600;color:#1a1a1a;'
    'line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;'
    '-webkit-box-orient:vertical;overflow:hidden;}'
    '.b1e-nt-card-source{font-size:11px;color:#888;margin-top:6px;}'
    '.b1e-nt-weather{display:flex;align-items:center;gap:8px;'
    'position:absolute;top:16px;right:24px;font-size:12px;color:#555;}'
)


def v1_content() -> str:
    sites = [
        ("Outlook", "#0078D4"),
        ("Teams", "#6264A7"),
        ("OneDrive", "#0078D4"),
        ("GitHub", "#24292f"),
        ("Azure", "#0078D4"),
        ("Contoso", "#0078D4"),
    ]
    sites_html = ""
    for name, color in sites:
        letter = name[0]
        sites_html += (
            f'<div class="b1e-nt-site">'
            f'<div class="b1e-nt-site-icon">'
            f'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="{color}"/>'
            f'<text x="7" y="17" font-family="Segoe UI,sans-serif" font-size="13"'
            f' font-weight="600" fill="#fff">{letter}</text></svg>'
            f'</div>'
            f'<span class="b1e-nt-site-label">{name}</span>'
            f'</div>'
        )

    cards = [
        ("Cloud adoption accelerates as enterprises shift workloads",
         "background:linear-gradient(135deg,#d4e8fc,#b8d4f0);",
         "Contoso News"),
        ("New developer tooling announced at annual conference",
         "background:linear-gradient(135deg,#e8d4fc,#d0b8f0);",
         "Tech Weekly"),
        ("Quarterly earnings beat expectations across tech sector",
         "background:linear-gradient(135deg,#d4fce8,#b8f0d0);",
         "Financial Times"),
    ]
    cards_html = ""
    for headline, bg_style, source in cards:
        cards_html += (
            f'<div class="b1e-nt-card">'
            f'<div class="b1e-nt-card-img" style="{bg_style}"></div>'
            f'<div class="b1e-nt-card-body">'
            f'<div class="b1e-nt-card-headline">{headline}</div>'
            f'<div class="b1e-nt-card-source">{source}</div>'
            f'</div></div>'
        )

    return (
        f'<style>{CSS_NEWTAB}</style>'
        f'<div class="b1e-page"><div class="b1e-nt" style="position:relative;">'
        f'<div class="b1e-nt-weather">'
        f'\u2601\ufe0f Redmond, WA &middot; 62\u00b0F</div>'
        f'<div class="b1e-nt-greeting">Good afternoon, Alex</div>'
        f'<div class="b1e-nt-search">'
        f'<svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5" fill="none"'
        f' stroke="currentColor" stroke-width="1.5"/>'
        f'<path d="M12.5 12.5l4 4" fill="none" stroke="currentColor"'
        f' stroke-width="1.5" stroke-linecap="round"/></svg>'
        f'<span class="b1e-nt-search-text">Search the web</span>'
        f'</div>'
        f'<div class="b1e-nt-sites">{sites_html}</div>'
        f'<div class="b1e-nt-feed">'
        f'<div class="b1e-nt-feed-title">My Feed</div>'
        f'<div class="b1e-nt-cards">{cards_html}</div>'
        f'</div>'
        f'</div></div>'
    )


# ═══════════════════════════════════════════════════════════════════════════════
# V2 — Bing Search Results
# ═══════════════════════════════════════════════════════════════════════════════
CSS_SEARCH = CSS_BASE + (
    '.b1e-sr{background:#fff;min-height:100%;}'
    '.b1e-sr-header{display:flex;align-items:center;gap:16px;'
    'padding:12px 24px;border-bottom:1px solid #e8e8e8;}'
    '.b1e-sr-logo svg{width:80px;height:32px;}'
    '.b1e-sr-bar{display:flex;align-items:center;flex:1;max-width:560px;'
    'height:40px;border:1px solid #ddd;border-radius:22px;'
    'padding:0 14px;gap:8px;box-shadow:0 1px 4px rgba(0,0,0,.04);}'
    '.b1e-sr-bar svg{width:16px;height:16px;color:#666;flex-shrink:0;}'
    '.b1e-sr-bar-text{font-size:14px;color:#1a1a1a;flex:1;}'
    '.b1e-sr-tabs{display:flex;gap:0;padding:0 24px 0 158px;'
    'border-bottom:1px solid #e8e8e8;}'
    '.b1e-sr-tab{font-size:12px;font-weight:600;padding:10px 16px;'
    'color:#555;text-transform:uppercase;letter-spacing:.3px;'
    'cursor:default;border-bottom:2px solid transparent;white-space:nowrap;}'
    '.b1e-sr-tab.b1e-active{color:#008373;border-bottom-color:#008373;}'
    '.b1e-sr-results{padding:20px 24px 24px 158px;max-width:680px;}'
    '.b1e-sr-count{font-size:12px;color:#666;margin-bottom:16px;}'
    '.b1e-sr-result{margin-bottom:22px;}'
    '.b1e-sr-result-cite{font-size:12px;color:#006d5b;margin-bottom:2px;'
    'display:flex;align-items:center;gap:6px;}'
    '.b1e-sr-result-cite svg{width:14px;height:14px;flex-shrink:0;}'
    '.b1e-sr-result-title{font-size:18px;color:#1a0dab;font-weight:400;'
    'margin-bottom:4px;cursor:default;}'
    '.b1e-sr-result-title:hover{text-decoration:underline;}'
    '.b1e-sr-result-desc{font-size:13px;color:#545454;line-height:1.5;}'
    '.b1e-sr-result-desc b{font-weight:600;color:#1a1a1a;}'
)


def v2_content() -> str:
    tabs = [
        ("ALL", True), ("SEARCH", False), ("IMAGES", False),
        ("VIDEOS", False), ("MAPS", False), ("NEWS", False),
        ("MORE", False),
    ]
    tabs_html = "".join(
        f'<span class="b1e-sr-tab{" b1e-active" if a else ""}">{t}</span>'
        for t, a in tabs
    )

    results = [
        (
            "microsoft.com",
            "https://www.microsoft.com/en-us/edge",
            "Microsoft Edge \u2013 The AI Browser | Microsoft",
            "<b>Microsoft Edge</b> is a fast, secure browser with built-in "
            "AI-powered features including Copilot, enhanced privacy controls, "
            "and seamless integration with Microsoft 365 services."
        ),
        (
            "en.wikipedia.org",
            "https://en.wikipedia.org/wiki/Microsoft_Edge",
            "Microsoft Edge \u2013 Wikipedia",
            "<b>Microsoft Edge</b> is a proprietary, cross-platform web "
            "browser created by <b>Microsoft</b>. It was first released in 2015 "
            "as part of Windows 10 and later rebuilt on Chromium in 2020."
        ),
        (
            "support.microsoft.com",
            "https://support.microsoft.com/en-us/microsoft-edge",
            "Microsoft Edge help & learning \u2013 Microsoft Support",
            "Get help with <b>Microsoft Edge</b>. Learn about features, "
            "troubleshoot issues, and discover tips for browsing faster and "
            "more securely with the latest version."
        ),
        (
            "github.com",
            "https://github.com/nicedoc/microsoft-edge",
            "GitHub \u2013 nicedoc/microsoft-edge: Edge extensions",
            "A collection of community-built extensions and tools "
            "for <b>Microsoft Edge</b>. Includes privacy add-ons, "
            "developer tools, and productivity enhancers."
        ),
    ]

    results_html = ""
    for domain, url, title, desc in results:
        results_html += (
            f'<div class="b1e-sr-result">'
            f'<div class="b1e-sr-result-cite">'
            f'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none"'
            f' stroke="#006d5b" stroke-width="1"/>'
            f'<text x="4" y="12" font-size="9" fill="#006d5b">'
            f'{domain[0].upper()}</text></svg>'
            f'{url}</div>'
            f'<div class="b1e-sr-result-title">{title}</div>'
            f'<div class="b1e-sr-result-desc">{desc}</div>'
            f'</div>'
        )

    return (
        f'<style>{CSS_SEARCH}</style>'
        f'<div class="b1e-page"><div class="b1e-sr">'
        f'<div class="b1e-sr-header">'
        f'<div class="b1e-sr-logo">'
        f'<svg viewBox="0 0 80 32">'
        f'<text x="0" y="24" font-family="Segoe UI,sans-serif" font-size="22"'
        f' font-weight="600" fill="#008373">bing</text></svg></div>'
        f'<div class="b1e-sr-bar">'
        f'<svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"'
        f' fill="none" stroke="currentColor" stroke-width="1.5"/>'
        f'<path d="M12.5 12.5l4 4" fill="none" stroke="currentColor"'
        f' stroke-width="1.5" stroke-linecap="round"/></svg>'
        f'<span class="b1e-sr-bar-text">microsoft edge browser</span>'
        f'</div></div>'
        f'<div class="b1e-sr-tabs">{tabs_html}</div>'
        f'<div class="b1e-sr-results">'
        f'<div class="b1e-sr-count">About 142,000,000 results</div>'
        f'{results_html}'
        f'</div></div></div>'
    )


# ═══════════════════════════════════════════════════════════════════════════════
# V3 — Wikipedia Article
# ═══════════════════════════════════════════════════════════════════════════════
CSS_WIKI = CSS_BASE + (
    '.b1e-wiki{display:flex;background:#fff;min-height:100%;}'
    '.b1e-wiki-toc{width:190px;flex-shrink:0;padding:14px 12px 16px 20px;'
    'font-size:13px;}'
    '.b1e-wiki-toc-hdr{font-size:14px;font-weight:600;color:#1a1a1a;'
    'margin-bottom:6px;display:flex;align-items:center;'
    'justify-content:space-between;}'
    '.b1e-wiki-toc-hdr button{font-size:11px;color:#36c;background:none;'
    'border:1px solid #a2a9b1;border-radius:3px;padding:1px 6px;'
    'cursor:default;}'
    '.b1e-wiki-toc a{display:block;padding:3px 0;color:#36c;'
    'text-decoration:none;font-size:12.5px;}'
    '.b1e-wiki-toc .b1e-indent{padding-left:14px;}'
    '.b1e-wiki-main{flex:1;padding:0 24px 24px;min-width:0;}'
    '.b1e-wiki-bar{display:flex;align-items:center;border-bottom:1px solid #a7d7f9;'
    'margin-bottom:0;font-size:13px;}'
    '.b1e-wiki-bar-tab{padding:8px 12px;color:#36c;cursor:default;}'
    '.b1e-wiki-bar-tab.b1e-active{background:#fff;border:1px solid #a7d7f9;'
    'border-bottom:1px solid #fff;margin-bottom:-1px;color:#1a1a1a;}'
    '.b1e-wiki-bar-actions{margin-left:auto;display:flex;font-size:12px;color:#36c;}'
    '.b1e-wiki-bar-actions span{padding:8px 10px;cursor:default;}'
    '.b1e-wiki h1{font-size:28px;font-weight:400;color:#1a1a1a;margin:8px 0 8px;'
    'font-family:Georgia,serif;line-height:1.2;border-bottom:1px solid #a7d7f9;'
    'padding-bottom:6px;}'
    '.b1e-wiki-notice{background:#f8f9fa;border:1px solid #eaecf0;'
    'padding:8px 12px;font-size:12px;color:#555;font-style:italic;'
    'margin-bottom:14px;line-height:1.4;}'
    '.b1e-wiki p{font-size:14px;line-height:1.6;color:#1a1a1a;margin:0 0 10px;}'
    '.b1e-wiki p a{color:#36c;text-decoration:none;}'
    '.b1e-wiki-ib{float:right;width:250px;margin:0 0 14px 20px;'
    'border:1px solid #a2a9b1;background:#f8f9fa;font-size:12.5px;}'
    '.b1e-wiki-ib-cap{background:#cee0f2;font-size:14px;font-weight:600;'
    'padding:6px;text-align:center;}'
    '.b1e-wiki-ib-img{height:140px;background:#e8e8e8;display:flex;'
    'align-items:center;justify-content:center;color:#999;font-size:11px;}'
    '.b1e-wiki-ib-row{display:flex;border-top:1px solid #eaecf0;}'
    '.b1e-wiki-ib-key{padding:4px 8px;font-weight:600;color:#555;'
    'white-space:nowrap;width:110px;flex-shrink:0;}'
    '.b1e-wiki-ib-val{padding:4px 8px;}'
    '.b1e-wiki h2{font-size:20px;font-weight:400;color:#1a1a1a;'
    'margin:18px 0 8px;font-family:Georgia,serif;'
    'border-bottom:1px solid #a7d7f9;padding-bottom:4px;}'
    '.b1e-wiki sup{font-size:10px;color:#36c;}'
)


def v3_content() -> str:
    toc_items = [
        ("(Top)", False),
        ("Features", False),
        ("Edge for Business", True),
        ("Release channels", True),
        ("Surf (video game)", True),
        ("Development", False),
        ("New Edge release history", True),
        ("Reception", False),
        ("Controversy", True),
        ("Market share", True),
        ("Notes", False),
        ("References", False),
        ("External links", False),
    ]
    toc_html = ""
    for label, indent in toc_items:
        cls = ' class="b1e-indent"' if indent else ""
        toc_html += f'<a{cls}>{label}</a>'

    ib_rows = [
        ("Original author", "Microsoft"),
        ("Developer", "Microsoft AI"),
        ("Initial release", "January 15, 2020"),
        ("Engine", "Blink, V8"),
        ("OS", "Windows, macOS, Linux, Android, iOS"),
        ("License", "Proprietary"),
    ]
    ib_html = ""
    for k, v in ib_rows:
        ib_html += (
            f'<div class="b1e-wiki-ib-row">'
            f'<div class="b1e-wiki-ib-key">{k}</div>'
            f'<div class="b1e-wiki-ib-val">{v}</div></div>'
        )

    return (
        f'<style>{CSS_WIKI}</style>'
        f'<div class="b1e-page"><div class="b1e-wiki">'
        # TOC sidebar
        f'<div class="b1e-wiki-toc">'
        f'<div class="b1e-wiki-toc-hdr"><span>Contents</span>'
        f'<button>hide</button></div>'
        f'{toc_html}</div>'
        # Main
        f'<div class="b1e-wiki-main">'
        # Article/Talk tabs
        f'<div class="b1e-wiki-bar">'
        f'<span class="b1e-wiki-bar-tab b1e-active">Article</span>'
        f'<span class="b1e-wiki-bar-tab">Talk</span>'
        f'<div class="b1e-wiki-bar-actions">'
        f'<span>Read</span><span>Edit</span><span>View history</span>'
        f'</div></div>'
        # Heading
        f'<h1>Microsoft Edge</h1>'
        # Infobox
        f'<div class="b1e-wiki-ib">'
        f'<div class="b1e-wiki-ib-cap">Microsoft Edge</div>'
        f'<div class="b1e-wiki-ib-img">Screenshot of Microsoft Edge</div>'
        f'{ib_html}</div>'
        # Notice
        f'<div class="b1e-wiki-notice">'
        f'Not to be confused with the older EdgeHTML-based '
        f'<a>Microsoft Edge Legacy</a>, formerly known as simply '
        f'Microsoft Edge.</div>'
        # Body paragraphs
        f'<p><b>Microsoft Edge</b> is a <a>proprietary</a>, '
        f'<a>cross-platform web browser</a> created by '
        f'<a>Microsoft</a> and based on the '
        f'<a>Chromium open-source project</a>, superseding '
        f'<a>Edge Legacy</a>.<sup>[10][11]</sup> In '
        f'<a>Windows 11</a>, Edge is the only browser available '
        f'from Microsoft.</p>'
        f'<p>First made available only for <a>Android</a> and '
        f'<a>iOS</a> in 2017,<sup>[13]</sup> in late 2018, '
        f'Microsoft announced it would completely rebuild Edge as a '
        f'<a>Chromium</a>-based browser with <a>Blink</a> and '
        f'<a>V8</a> engines, which allowed the browser to be ported '
        f'from <a>Windows 10</a> to <a>macOS</a> and '
        f'<a>Linux</a>.<sup>[17][18]</sup></p>'
        f'<h2>Features</h2>'
        f'<p>The new Microsoft Edge is the default web browser, '
        f'replacing <a>Edge Legacy</a>. In Windows 11, Edge is '
        f'the only browser available from Microsoft (for '
        f'compatibility) with <a>Google Chrome</a>. However, it '
        f'includes an "Internet Explorer mode" aimed at fixing '
        f'compatibility issues.</p>'
        f'</div></div></div>'
    )


# ═══════════════════════════════════════════════════════════════════════════════
# V4 / V5 — GitHub Repository (shared content, different tab sets)
# ═══════════════════════════════════════════════════════════════════════════════
CSS_GITHUB = CSS_BASE + (
    '.b1e-gh{background:#fff;min-height:100%;}'
    # Top navbar
    '.b1e-gh-nav{background:#24292f;color:#fff;padding:10px 24px;'
    'display:flex;align-items:center;gap:16px;font-size:14px;}'
    '.b1e-gh-nav a{color:#fff;text-decoration:none;cursor:default;}'
    '.b1e-gh-nav svg{width:32px;height:32px;flex-shrink:0;}'
    '.b1e-gh-nav-links{display:flex;gap:16px;}'
    '.b1e-gh-search-box{display:flex;align-items:center;height:28px;'
    'padding:0 10px;border:1px solid #57606a;border-radius:6px;'
    'font-size:13px;color:#8b949e;width:240px;gap:6px;}'
    '.b1e-gh-nav-right{margin-left:auto;display:flex;gap:12px;'
    'align-items:center;font-size:13px;}'
    # Repo header
    '.b1e-gh-repo-hdr{padding:10px 24px;border-bottom:1px solid #d0d7de;}'
    '.b1e-gh-repo-name{font-size:20px;display:flex;align-items:center;gap:4px;}'
    '.b1e-gh-repo-name a{color:#0969da;text-decoration:none;font-weight:600;}'
    '.b1e-gh-repo-name .b1e-sl{color:#656d76;font-weight:300;margin:0 2px;}'
    '.b1e-gh-badge{font-size:11px;color:#656d76;border:1px solid #d0d7de;'
    'border-radius:12px;padding:0 8px;margin-left:8px;line-height:22px;'
    'display:inline-block;}'
    '.b1e-gh-repo-actions{display:flex;gap:8px;margin-top:6px;margin-left:auto;'
    'float:right;}'
    '.b1e-gh-repo-btn{display:flex;align-items:center;gap:4px;'
    'background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;'
    'padding:3px 10px;font-size:12px;color:#24292f;cursor:default;}'
    '.b1e-gh-repo-btn svg{width:16px;height:16px;}'
    '.b1e-gh-repo-btn strong{margin-left:2px;}'
    # Repo tabs
    '.b1e-gh-tabs{display:flex;gap:0;padding:6px 24px 0;'
    'border-bottom:1px solid #d0d7de;}'
    '.b1e-gh-tab{display:flex;align-items:center;gap:5px;font-size:13px;'
    'color:#656d76;padding:8px 12px;cursor:default;'
    'border-bottom:2px solid transparent;margin-bottom:-1px;}'
    '.b1e-gh-tab.b1e-active{color:#24292f;font-weight:600;'
    'border-bottom-color:#fd8c73;}'
    '.b1e-gh-tab-ct{font-size:11px;background:rgba(175,184,193,.2);'
    'border-radius:12px;padding:0 6px;line-height:18px;}'
    # Body
    '.b1e-gh-body{display:flex;gap:24px;padding:16px 24px;}'
    '.b1e-gh-main{flex:1;min-width:0;}'
    # Branch bar
    '.b1e-gh-bbr{display:flex;align-items:center;gap:10px;margin-bottom:12px;'
    'font-size:13px;color:#656d76;}'
    '.b1e-gh-bbr-btn{display:flex;align-items:center;gap:4px;'
    'background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;'
    'padding:4px 12px;font-size:13px;cursor:default;}'
    '.b1e-gh-code-btn{display:flex;align-items:center;gap:4px;'
    'background:#1a7f37;color:#fff;border-radius:6px;padding:6px 14px;'
    'font-size:13px;font-weight:600;margin-left:auto;cursor:default;}'
    # Commit bar
    '.b1e-gh-cbar{display:flex;align-items:center;gap:8px;padding:8px 12px;'
    'background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px 6px 0 0;'
    'font-size:12px;color:#656d76;margin-bottom:-1px;}'
    '.b1e-gh-cbar strong{color:#24292f;}'
    '.b1e-gh-cbar-msg{flex:1;white-space:nowrap;overflow:hidden;'
    'text-overflow:ellipsis;}'
    '.b1e-gh-cbar-meta{margin-left:auto;white-space:nowrap;}'
    # File list
    '.b1e-gh-files{border:1px solid #d0d7de;border-radius:0 0 6px 6px;}'
    '.b1e-gh-f{display:flex;align-items:center;gap:8px;padding:6px 12px;'
    'border-top:1px solid #d0d7de;font-size:13px;}'
    '.b1e-gh-f:first-child{border-top:none;}'
    '.b1e-gh-f svg{width:16px;height:16px;flex-shrink:0;}'
    '.b1e-gh-f-folder svg{color:#54aeff;}'
    '.b1e-gh-f-file svg{color:#656d76;}'
    '.b1e-gh-f-name{color:#24292f;min-width:150px;flex-shrink:0;}'
    '.b1e-gh-f-name a{color:#24292f;text-decoration:none;}'
    '.b1e-gh-f-msg{flex:1;color:#656d76;white-space:nowrap;overflow:hidden;'
    'text-overflow:ellipsis;}'
    '.b1e-gh-f-msg a{color:#656d76;text-decoration:none;}'
    '.b1e-gh-f-date{flex-shrink:0;color:#656d76;white-space:nowrap;'
    'text-align:right;min-width:80px;}'
    # Sidebar
    '.b1e-gh-side{width:280px;flex-shrink:0;font-size:13px;}'
    '.b1e-gh-side-title{font-size:15px;font-weight:600;margin-bottom:6px;}'
    '.b1e-gh-side-desc{font-size:14px;line-height:1.5;margin-bottom:10px;}'
    '.b1e-gh-side-link{display:flex;align-items:center;gap:6px;'
    'color:#0969da;font-size:13px;margin-bottom:10px;}'
    '.b1e-gh-topics{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px;}'
    '.b1e-gh-topic{background:#ddf4ff;color:#0969da;font-size:12px;'
    'padding:2px 10px;border-radius:12px;}'
    '.b1e-gh-side-row{display:flex;align-items:center;gap:6px;'
    'font-size:13px;color:#656d76;padding:3px 0;}'
    '.b1e-gh-side-row svg{width:16px;height:16px;}'
    '.b1e-gh-stat{display:flex;align-items:center;gap:6px;font-size:13px;'
    'color:#656d76;padding:4px 0;}'
    '.b1e-gh-stat svg{width:16px;height:16px;}'
    '.b1e-gh-stat strong{color:#24292f;}'
    '.b1e-gh-side-section{font-size:15px;font-weight:600;margin:14px 0 6px;'
    'padding-top:10px;border-top:1px solid #d0d7de;}'
)

FOLDER_ICON = (
    '<svg viewBox="0 0 16 16"><path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5'
    'C0 14.22.78 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5'
    'A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2'
    'c-.33-.44-.85-.7-1.4-.7H1.75z" fill="#54aeff"/></svg>'
)
FILE_ICON = (
    '<svg viewBox="0 0 16 16"><path d="M3.75 1.5a.25.25 0 0 0-.25.25'
    'v12.5c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75'
    'A1.75 1.75 0 0 1 8 4.25V1.5H3.75z" fill="#656d76"/></svg>'
)


def github_content() -> str:
    """Shared GitHub repo page body (used by V4 and V5)."""
    gh_tabs = [
        ("Code", True, ""),
        ("Issues", False, "5k+"),
        ("Pull requests", False, "1.7k"),
        ("Actions", False, ""),
        ("Projects", False, ""),
        ("Wiki", False, ""),
        ("Security", False, "23"),
        ("Insights", False, ""),
    ]
    tabs_html = ""
    for label, active, count in gh_tabs:
        cls = ' b1e-active' if active else ''
        ct = f'<span class="b1e-gh-tab-ct">{count}</span>' if count else ''
        tabs_html += f'<span class="b1e-gh-tab{cls}">{label}{ct}</span>'

    files = [
        (True,  ".devcontainer",    "Bump ghcr.io/devcontainers/features",  "2 months ago"),
        (True,  ".github",          "ci: allow copilot extension version",  "2 days ago"),
        (True,  ".vscode",          "Update endgame notebook milestones",   "2 days ago"),
        (True,  "build",            "Agents: extract BaseAgentHost...",     "1 hour ago"),
        (True,  "cli",              "build(deps): bump rand from 0.8.5",   "2 days ago"),
        (True,  "extensions",       "Merge pull request #310892 from...",   "2 hours ago"),
        (True,  "src",              "Allow vscode-agent-host scheme",       "1 hour ago"),
        (True,  "test",             "Try to make multiroot smoke test",     "2 days ago"),
        (False, ".editorconfig",    "No forcing tabsize on users",          "8 years ago"),
        (False, ".eslint-ignore",   "exclude extensions/copilot from",      "last month"),
        (False, ".gitattributes",   "removes checked in baseline images",   "2 weeks ago"),
        (False, ".gitignore",       "Add performance tests",                "2 days ago"),
        (False, "package.json",     "v1.100.0-insider",                     "3 days ago"),
        (False, "README.md",        "Update README badge links",            "2 months ago"),
    ]
    files_html = ""
    for is_dir, name, msg, date in files:
        icon_cls = "b1e-gh-f-folder" if is_dir else "b1e-gh-f-file"
        icon = FOLDER_ICON if is_dir else FILE_ICON
        files_html += (
            f'<div class="b1e-gh-f">'
            f'<span class="{icon_cls}">{icon}</span>'
            f'<span class="b1e-gh-f-name"><a>{name}</a></span>'
            f'<span class="b1e-gh-f-msg"><a>{msg}</a></span>'
            f'<span class="b1e-gh-f-date">{date}</span>'
            f'</div>'
        )

    topics = ["electron", "microsoft", "editor", "typescript", "visual-studio-code"]
    topics_html = "".join(
        f'<span class="b1e-gh-topic">{t}</span>' for t in topics
    )

    sidebar_rows = [
        ("Readme", ""),
        ("MIT license", ""),
        ("Code of conduct", ""),
        ("Security policy", ""),
    ]
    sidebar_html = ""
    for label, _ in sidebar_rows:
        sidebar_html += (
            f'<div class="b1e-gh-side-row">'
            f'<svg viewBox="0 0 16 16"><path d="M0 1.75A.75.75 0 0 1'
            f' .75 1h4.253c1.227 0 2.317.59 3 1.501A3.74 3.74 0 0 1'
            f' 11 1h4.25a.75.75 0 0 1 .75.75v9.5a.75.75 0 0 1-.75.75'
            f'H11a2.5 2.5 0 0 0-2.5 2.5.75.75 0 0 1-1.5 0A2.5 2.5 0'
            f' 0 0 4.5 12H.75a.75.75 0 0 1-.75-.75z" fill="#656d76"/></svg>'
            f'{label}</div>'
        )

    return (
        f'<style>{CSS_GITHUB}</style>'
        f'<div class="b1e-page"><div class="b1e-gh">'
        # GitHub navbar
        f'<div class="b1e-gh-nav">'
        f'<svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8'
        f'c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82'
        f'-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13'
        f'-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87'
        f' 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87'
        f'.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82'
        f'.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82'
        f' 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07'
        f'-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01'
        f' 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"'
        f' fill="#fff"/></svg>'
        f'<div class="b1e-gh-nav-links">'
        f'<a>Platform</a><a>Solutions</a><a>Open Source</a>'
        f'<a>Enterprise</a><a>Pricing</a></div>'
        f'<div class="b1e-gh-search-box">'
        f'Search or jump to...</div>'
        f'<div class="b1e-gh-nav-right">'
        f'<a>Sign in</a><a>Sign up</a></div>'
        f'</div>'
        # Repo header
        f'<div class="b1e-gh-repo-hdr">'
        f'<div class="b1e-gh-repo-name">'
        f'<a>microsoft</a><span class="b1e-sl">/</span>'
        f'<a>vscode</a>'
        f'<span class="b1e-gh-badge">Public</span>'
        f'</div>'
        f'</div>'
        # Tabs
        f'<div class="b1e-gh-tabs">{tabs_html}</div>'
        # Body
        f'<div class="b1e-gh-body">'
        # Main column
        f'<div class="b1e-gh-main">'
        f'<div class="b1e-gh-bbr">'
        f'<span class="b1e-gh-bbr-btn">main</span>'
        f'<span>3,587 Branches</span>'
        f'<span>356 Tags</span>'
        f'<span class="b1e-gh-code-btn">Code</span>'
        f'</div>'
        # Commit bar
        f'<div class="b1e-gh-cbar">'
        f'<strong>roblourens</strong> and <strong>Copilot</strong>'
        f'<span class="b1e-gh-cbar-msg">'
        f'Allow vscode-agent-host scheme in chat content mark\u2026</span>'
        f'<span class="b1e-gh-cbar-meta">155,189 Commits</span>'
        f'</div>'
        # File tree
        f'<div class="b1e-gh-files">{files_html}</div>'
        f'</div>'
        # Sidebar
        f'<div class="b1e-gh-side">'
        f'<div class="b1e-gh-side-title">About</div>'
        f'<div class="b1e-gh-side-desc">Visual Studio Code</div>'
        f'<div class="b1e-gh-side-link">'
        f'<svg viewBox="0 0 16 16"><path d="M7.78 1a.75.75 0 0 1 .53.22'
        f'l3.5 3.5a.75.75 0 0 1-1.06 1.06L8 3.06 5.25 5.78a.75.75 0 0 1'
        f'-1.06-1.06l3.5-3.5A.75.75 0 0 1 7.78 1z" fill="#656d76"/></svg>'
        f'code.visualstudio.com</div>'
        f'<div class="b1e-gh-topics">{topics_html}</div>'
        f'{sidebar_html}'
        f'<div class="b1e-gh-stat">'
        f'<svg viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 0 1 .673.418'
        f'l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719'
        f' 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0'
        f' 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21'
        f'-.611L7.327.668A.75.75 0 0 1 8 .25z" fill="#656d76"/></svg>'
        f'<strong>184k</strong> stars</div>'
        f'<div class="b1e-gh-stat">'
        f'<svg viewBox="0 0 16 16"><path d="M5 3.25a.75.75 0 1 1-1.5 0'
        f' .75.75 0 0 1 1.5 0zM1.75 0A1.75 1.75 0 0 0 0 1.75v12.5C0'
        f' 15.22.78 16 1.75 16h12.5A1.75 1.75 0 0 0 16 14.25V1.75A1.75'
        f' 1.75 0 0 0 14.25 0H1.75z" fill="#656d76"/></svg>'
        f'<strong>39.3k</strong> forks</div>'
        f'<div class="b1e-gh-side-section">Releases <span style="font-weight:400'
        f';color:#656d76">205</span></div>'
        f'<div style="font-size:13px;margin-top:4px;">'
        f'v0.44.1 <span style="background:#1a7f37;color:#fff;font-size:11px;'
        f'padding:0 6px;border-radius:12px;margin-left:4px;">Latest</span>'
        f'<div style="font-size:12px;color:#656d76;margin-top:2px;">'
        f'3 days ago</div></div>'
        f'</div>'
        f'</div>'
        f'</div></div>'
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SCF Writer
# ═══════════════════════════════════════════════════════════════════════════════
def write_scf(filename: str, scene_id: str, props: dict) -> None:
    scf = {
        "version": "1.0",
        "pipeline": "synthetic-recording",
        "outputProfile": {"width": 1920, "height": 1080, "fps": 30},
        "scenes": [{
            "id": scene_id,
            "duration": 4,
            "component": "EdgeBrowserScene",
            "props": {"theme": "light", **props},
        }],
    }
    out = OUT_DIR / filename
    out.write_text(json.dumps(scf, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  \u2713 {out.relative_to(REPO)}")


# ═══════════════════════════════════════════════════════════════════════════════
# Build all 5 variants
# ═══════════════════════════════════════════════════════════════════════════════
def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Building EdgeBrowserScene Wave B SCFs...")

    # V1 — New Tab Start Page
    write_scf("edge-newtab-b1.scf.json", "edge-newtab-b1", {
        "tabListHtml": tab("edge", "New tab", active=True),
        "urlText": "Search or enter web address",
        "bookmarksHtml": BOOKMARKS,
        "pageContentHtml": v1_content(),
    })

    # V2 — Bing Search Results
    write_scf("edge-search-b1.scf.json", "edge-search-b1", {
        "tabListHtml": tab("bing", "microsoft edge browser - Search", active=True),
        "urlText": "microsoft edge browser",
        "bookmarksHtml": BOOKMARKS,
        "pageContentHtml": v2_content(),
    })

    # V3 — Wikipedia Article
    write_scf("edge-wikipedia-b1.scf.json", "edge-wikipedia-b1", {
        "tabListHtml": tab("wiki", "Microsoft Edge - Wikipedia", active=True),
        "urlText": "en.wikipedia.org/wiki/Microsoft_Edge",
        "bookmarksHtml": BOOKMARKS,
        "pageContentHtml": v3_content(),
    })

    # V4 — GitHub Repo (single tab)
    write_scf("edge-github-b1.scf.json", "edge-github-b1", {
        "tabListHtml": tab("github", "microsoft/vscode", active=True),
        "urlText": "github.com/microsoft/vscode",
        "bookmarksHtml": BOOKMARKS,
        "pageContentHtml": github_content(),
    })

    # V5 — Multi-tab (5 tabs, GitHub active)
    multi_tabs = "".join([
        tab("edge", "New tab"),
        tab("bing", "microsoft edge bro\u2026"),
        tab("wiki", "Microsoft Edge - Wi\u2026"),
        tab("contoso", "Contoso Portal"),
        tab("github", "microsoft/vscode", active=True),
    ])
    write_scf("edge-multi-tab-b1.scf.json", "edge-multi-tab-b1", {
        "tabListHtml": multi_tabs,
        "urlText": "github.com/microsoft/vscode",
        "bookmarksHtml": BOOKMARKS,
        "pageContentHtml": github_content(),
    })

    print("Done \u2014 5 SCFs written.")


if __name__ == "__main__":
    main()
