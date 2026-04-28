"""WebFetch — Fetch a URL and extract title, main text, and image references.

Stdlib-only implementation (urllib + html.parser) so it works without extra deps.
For richer extraction, install `readability-lxml` or `beautifulsoup4` — the tool
will use them automatically when present.
"""

from __future__ import annotations

import logging
import re
import time
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin
import urllib.error
import urllib.request

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

logger = logging.getLogger(__name__)

USER_AGENT = "Slate/0.1 (+https://github.com/slate-video) document-ingest"
_BLOCK_TAGS = {"script", "style", "noscript", "template", "svg", "iframe"}
_WS_RE = re.compile(r"\s+")


class _Extractor(HTMLParser):
    """Minimal HTML→text extractor that collects title, body text, image URLs."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self._skip_depth = 0
        self.text_parts: list[str] = []
        self.images: list[str] = []
        self._in_body = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag == "title":
            self._in_title = True
        elif tag == "body":
            self._in_body = True
        elif tag in _BLOCK_TAGS:
            self._skip_depth += 1
        elif tag == "img":
            for k, v in attrs:
                if k == "src" and v:
                    self.images.append(v)
                    break
        elif tag in {"p", "br", "h1", "h2", "h3", "h4", "li", "div"}:
            self.text_parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title":
            self._in_title = False
        elif tag in _BLOCK_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return
        if self._in_title:
            self.title += data
        elif self._in_body or not self.text_parts:
            self.text_parts.append(data)


def _stdlib_extract(html: str) -> tuple[str, str, list[str]]:
    parser = _Extractor()
    try:
        parser.feed(html)
    except Exception as exc:  # noqa: BLE001 — html.parser can raise on weird input
        logger.warning("HTML parse error: %s", exc)
    text = _WS_RE.sub(" ", "".join(parser.text_parts)).strip()
    return parser.title.strip(), text, parser.images


def _readability_extract(html: str, url: str) -> tuple[str, str, list[str]] | None:
    """Try readability-lxml + BeautifulSoup if available, else None."""
    try:
        from readability import Document  # type: ignore[import-not-found]
        from bs4 import BeautifulSoup  # type: ignore[import-not-found]
    except ImportError:
        return None
    try:
        doc = Document(html)
        title = doc.short_title() or ""
        cleaned = doc.summary(html_partial=True)
        soup = BeautifulSoup(cleaned, "html.parser")
        text = _WS_RE.sub(" ", soup.get_text(" ").strip())
        images = [img.get("src", "") for img in soup.find_all("img") if img.get("src")]
        return title, text, images
    except Exception as exc:  # noqa: BLE001
        logger.debug("readability failed: %s", exc)
        return None


class WebFetch(BaseTool):
    """Fetch a URL and extract title, main text, and image references."""

    name = "web_fetch"
    version = "0.1.0"
    tier = ToolTier.INGEST
    capability = "Fetch a URL and extract title, main text content, and image references"
    provider = "local"
    runtime = ToolRuntime.API
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "external"  # remote URL — caller's responsibility

    input_schema = {
        "type": "object",
        "properties": {
            "url": {"type": "string", "description": "HTTP/HTTPS URL to fetch"},
            "max_bytes": {"type": "integer", "default": 1_500_000, "minimum": 1024},
            "timeout_seconds": {"type": "integer", "default": 20, "minimum": 1, "maximum": 120},
            "max_text_chars": {"type": "integer", "default": 20_000, "minimum": 100},
        },
        "required": ["url"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "url": {"type": "string"},
            "status": {"type": "integer"},
            "title": {"type": "string"},
            "text": {"type": "string"},
            "char_count": {"type": "integer"},
            "images": {"type": "array"},
            "extractor": {"type": "string"},
        },
    }

    async def execute(self, **kwargs: Any) -> ToolResult:
        url = kwargs.get("url", "")
        if not url:
            return ToolResult(success=False, error="url is required")
        if not (url.startswith("http://") or url.startswith("https://")):
            return ToolResult(success=False, error="url must start with http:// or https://")

        max_bytes = int(kwargs.get("max_bytes", 1_500_000))
        timeout = int(kwargs.get("timeout_seconds", 20))
        max_chars = int(kwargs.get("max_text_chars", 20_000))

        start = time.monotonic()
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,*/*"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                status = resp.status
                raw = resp.read(max_bytes)
                charset = resp.headers.get_content_charset() or "utf-8"
                final_url = resp.geturl()
        except urllib.error.HTTPError as exc:
            return ToolResult(success=False, error=f"HTTP {exc.code}: {exc.reason}")
        except urllib.error.URLError as exc:
            return ToolResult(success=False, error=f"URL error: {exc.reason}")
        except OSError as exc:
            return ToolResult(success=False, error=f"Network error: {exc}")

        try:
            html = raw.decode(charset, errors="replace")
        except LookupError:
            html = raw.decode("utf-8", errors="replace")

        extracted = _readability_extract(html, final_url)
        if extracted is not None:
            title, text, images = extracted
            extractor = "readability"
        else:
            title, text, images = _stdlib_extract(html)
            extractor = "stdlib"

        # Resolve relative image URLs
        resolved_images = [urljoin(final_url, src) for src in images if src]
        truncated = text[:max_chars]

        return ToolResult(
            success=True,
            output={
                "url": final_url,
                "status": status,
                "title": title,
                "text": truncated,
                "char_count": len(truncated),
                "truncated": len(text) > max_chars,
                "images": resolved_images[:50],
                "extractor": extractor,
            },
            cost_usd=0.0,
            duration_seconds=time.monotonic() - start,
            metadata={"url": final_url, "extractor": extractor},
        )
