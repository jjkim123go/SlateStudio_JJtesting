"""Ingest tools — PPT, Word, Excel, PDF parsing.

Auto-detect and parse enterprise documents into structured IngestResult
objects that feed directly into Slate pipelines.

Usage:
    from slate.tools.ingest.parsers import parse_document
    result = parse_document("presentation.pptx")
    scenario = result.to_scenario(company="Contoso")
"""

from slate.tools.ingest.parsers import (
    IngestResult,
    Section,
    MediaAsset,
    PptxParser,
    DocxParser,
    XlsxParser,
    parse_document,
)
from slate.tools.ingest.document_ingest import DocumentIngest, parse_any
from slate.tools.ingest.image_analyze import ImageAnalyze
from slate.tools.ingest.video_analyze import VideoAnalyze
from slate.tools.ingest.web_fetch import WebFetch
from slate.tools.ingest.orchestrator import IngestArtifacts

__all__ = [
    # Existing parser primitives
    "IngestResult",
    "Section",
    "MediaAsset",
    "PptxParser",
    "DocxParser",
    "XlsxParser",
    "parse_document",
    "parse_any",
    # BaseTool subclasses (the agent-callable surface)
    "DocumentIngest",
    "ImageAnalyze",
    "VideoAnalyze",
    "WebFetch",
    "IngestArtifacts",
]
