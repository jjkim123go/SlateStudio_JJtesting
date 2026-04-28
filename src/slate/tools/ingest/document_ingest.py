"""DocumentIngest — BaseTool wrapper over parsers.py + PDF support.

Single entry point for parsing PPTX / DOCX / XLSX / PDF / Markdown / TXT files
into the standardized IngestResult shape that pipeline stages can consume.

Graceful degradation: each format depends on its own optional library
(python-pptx, python-docx, openpyxl, pypdf). If a library is missing,
the parser returns a minimal result with a warning instead of crashing.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)
from slate.tools.ingest.parsers import (
    IngestResult,
    Section,
    parse_document as _parse_office_document,
)

logger = logging.getLogger(__name__)

_OFFICE_EXTS = {".pptx", ".docx", ".xlsx"}
_PDF_EXTS = {".pdf"}
_TEXT_EXTS = {".md", ".markdown", ".txt", ".rst"}

SUPPORTED_EXTS = _OFFICE_EXTS | _PDF_EXTS | _TEXT_EXTS


def _parse_pdf(path: Path) -> IngestResult:
    """Parse a PDF using pypdf. Each page becomes a Section."""
    try:
        from pypdf import PdfReader
    except ImportError:
        logger.warning("pypdf not installed — limited PDF extraction")
        return IngestResult(
            source_type="pdf",
            source_path=str(path),
            title=path.stem,
            metadata={"warning": "pypdf not installed"},
        )

    reader = PdfReader(str(path))
    sections: list[Section] = []
    for idx, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as exc:  # pypdf can raise on corrupt pages
            logger.warning("pypdf failed on page %d: %s", idx + 1, exc)
            text = ""
        first_line = text.strip().split("\n", 1)[0][:120] if text.strip() else f"Page {idx + 1}"
        sections.append(Section(
            index=idx,
            title=first_line or f"Page {idx + 1}",
            body=text.strip(),
        ))

    metadata: dict[str, Any] = {"page_count": len(reader.pages)}
    if reader.metadata:
        if reader.metadata.title:
            metadata["doc_title"] = reader.metadata.title
        if reader.metadata.author:
            metadata["author"] = reader.metadata.author

    return IngestResult(
        source_type="pdf",
        source_path=str(path),
        title=metadata.get("doc_title", path.stem),
        sections=sections,
        metadata=metadata,
    )


def _parse_text(path: Path) -> IngestResult:
    """Parse plain text or markdown. Splits on H1/H2 markers for markdown."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return IngestResult(
            source_type="text",
            source_path=str(path),
            title=path.stem,
            metadata={"error": str(exc)},
        )

    sections: list[Section] = []
    if path.suffix.lower() in {".md", ".markdown"}:
        # Split on top-level headings
        current_title = ""
        current_body: list[str] = []
        idx = 0
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("# ") or stripped.startswith("## "):
                if current_title or current_body:
                    sections.append(Section(
                        index=idx, title=current_title or path.stem,
                        body="\n".join(current_body).strip(),
                    ))
                    idx += 1
                current_title = stripped.lstrip("#").strip()
                current_body = []
            else:
                current_body.append(line)
        if current_title or current_body:
            sections.append(Section(
                index=idx, title=current_title or path.stem,
                body="\n".join(current_body).strip(),
            ))

    if not sections:
        sections = [Section(index=0, title=path.stem, body=text.strip())]

    return IngestResult(
        source_type="text",
        source_path=str(path),
        title=path.stem,
        sections=sections,
        metadata={"char_count": len(text)},
    )


def parse_any(path: str | Path, **kwargs: Any) -> IngestResult:
    """Auto-detect and parse any supported document type."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Document not found: {p}")

    ext = p.suffix.lower()
    if ext in _OFFICE_EXTS:
        return _parse_office_document(p, **kwargs)
    if ext in _PDF_EXTS:
        return _parse_pdf(p)
    if ext in _TEXT_EXTS:
        return _parse_text(p)
    raise ValueError(
        f"Unsupported document type: {ext}. Supported: {sorted(SUPPORTED_EXTS)}"
    )


def _result_to_dict(result: IngestResult) -> dict[str, Any]:
    """Convert IngestResult dataclass tree into JSON-friendly dict."""
    return {
        "source_type": result.source_type,
        "source_path": result.source_path,
        "title": result.title,
        "section_count": len(result.sections),
        "media_count": len(result.media_assets),
        "sections": [
            {
                "index": s.index,
                "title": s.title,
                "body": s.body,
                "speaker_notes": s.speaker_notes,
                "level": s.level,
                "bullet_points": s.bullet_points,
                "media_count": len(s.media),
            }
            for s in result.sections
        ],
        "media_assets": [asdict(m) for m in result.media_assets],
        "metadata": result.metadata,
        "estimated_duration_seconds": result.estimated_duration_seconds,
    }


class DocumentIngest(BaseTool):
    """Parse a document (PPTX/DOCX/XLSX/PDF/MD/TXT) into structured IngestResult."""

    name = "document_ingest"
    version = "0.1.0"
    tier = ToolTier.INGEST
    capability = "Parse a document into structured sections, bullets, speaker notes, and media references"
    provider = "local"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Path to document file"},
            "output_dir": {
                "type": "string",
                "description": "Directory to extract embedded media into (Office formats only)",
            },
        },
        "required": ["path"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "source_type": {"type": "string"},
            "title": {"type": "string"},
            "section_count": {"type": "integer"},
            "sections": {"type": "array"},
            "media_assets": {"type": "array"},
            "metadata": {"type": "object"},
        },
    }

    async def execute(self, **kwargs: Any) -> ToolResult:
        path = kwargs.get("path", "")
        if not path:
            return ToolResult(success=False, error="path is required")
        if not os.path.exists(path):
            return ToolResult(success=False, error=f"File not found: {path}")

        start = time.monotonic()
        try:
            result = parse_any(path, output_dir=kwargs.get("output_dir"))
        except ValueError as exc:
            return ToolResult(success=False, error=str(exc))
        except Exception as exc:  # noqa: BLE001 — surface parser errors verbatim
            return ToolResult(
                success=False,
                error=f"{type(exc).__name__}: {exc}",
                metadata={"path": path},
            )

        return ToolResult(
            success=True,
            output=_result_to_dict(result),
            cost_usd=0.0,
            duration_seconds=time.monotonic() - start,
            metadata={
                "path": path,
                "source_type": result.source_type,
                "section_count": len(result.sections),
            },
        )
