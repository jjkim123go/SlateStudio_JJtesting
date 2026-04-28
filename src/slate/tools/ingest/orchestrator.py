"""IngestArtifacts — Orchestrator that fans out to the right per-artifact tool.

Single entry point for the ingest stage. Given a list of paths and/or URLs, it:
  1. Routes each input to document_ingest / image_analyze / video_analyze / web_fetch
  2. Aggregates results into a structured Ingest Report
  3. Produces a one-paragraph summary the agent can use as the basis of a creative brief

This is the tool the agent should call FIRST when a user provides any input materials.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from pathlib import Path
from typing import Any

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)
from slate.tools.ingest.document_ingest import DocumentIngest, SUPPORTED_EXTS as DOC_EXTS
from slate.tools.ingest.image_analyze import ImageAnalyze
from slate.tools.ingest.video_analyze import VideoAnalyze
from slate.tools.ingest.web_fetch import WebFetch

logger = logging.getLogger(__name__)

_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}
_VIDEO_EXTS = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"}
_AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}


def _classify(item: str) -> str:
    if item.startswith("http://") or item.startswith("https://"):
        return "url"
    ext = Path(item).suffix.lower()
    if ext in _IMAGE_EXTS:
        return "image"
    if ext in _VIDEO_EXTS:
        return "video"
    if ext in DOC_EXTS:
        return "document"
    if ext in _AUDIO_EXTS:
        return "audio"
    return "unknown"


def _summarize(reports: list[dict[str, Any]]) -> str:
    """One-paragraph aggregated summary across all artifacts."""
    by_kind: dict[str, list[dict[str, Any]]] = {}
    for r in reports:
        by_kind.setdefault(r["kind"], []).append(r)

    parts: list[str] = []
    if "document" in by_kind:
        for r in by_kind["document"]:
            o = r.get("output") or {}
            if r["status"] == "ok":
                parts.append(
                    f"Document '{o.get('title', r['source'])}' "
                    f"({o.get('source_type')}, {o.get('section_count', 0)} sections)"
                )
    if "image" in by_kind:
        for r in by_kind["image"]:
            o = r.get("output") or {}
            if r["status"] == "ok":
                desc = o.get("description") or o.get("suggested_use") or "image"
                dims = f"{o.get('width', '?')}×{o.get('height', '?')}"
                parts.append(f"Image '{Path(r['source']).name}' ({dims}) — {desc[:100]}")
    if "video" in by_kind:
        for r in by_kind["video"]:
            o = r.get("output") or {}
            if r["status"] == "ok":
                parts.append(
                    f"Video '{Path(r['source']).name}' — {o.get('duration', 0):.1f}s, "
                    f"{o.get('width', '?')}×{o.get('height', '?')}, "
                    f"{len(o.get('scene_changes', []))} scene cuts"
                )
    if "url" in by_kind:
        for r in by_kind["url"]:
            o = r.get("output") or {}
            if r["status"] == "ok":
                parts.append(f"URL '{o.get('title', r['source'])}' ({o.get('char_count', 0)} chars)")

    failed = [r for r in reports if r["status"] != "ok"]
    summary = "; ".join(parts) if parts else "No artifacts successfully analyzed."
    if failed:
        summary += f" | {len(failed)} failed: " + ", ".join(
            f"{Path(r['source']).name}({r.get('error', 'unknown')[:40]})" for r in failed[:3]
        )
    return summary


class IngestArtifacts(BaseTool):
    """Fan out a list of files/URLs to the right per-artifact analysis tool."""

    name = "ingest_artifacts"
    version = "0.1.0"
    tier = ToolTier.INGEST
    capability = "Analyze a batch of input artifacts (documents, images, videos, URLs) and return a unified Ingest Report"
    provider = "local"
    runtime = ToolRuntime.HYBRID
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "in-tenant"

    input_schema = {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Mix of file paths and http(s) URLs",
            },
            "image_use_vision": {
                "type": "boolean", "default": True,
                "description": "Use GPT-4o vision for images (costs ~$0.005 per image)",
            },
            "video_extract_keyframes": {"type": "boolean", "default": True},
            "video_max_keyframes": {"type": "integer", "default": 6},
            "concurrency": {"type": "integer", "default": 4, "minimum": 1, "maximum": 16},
        },
        "required": ["items"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "artifact_count": {"type": "integer"},
            "ok_count": {"type": "integer"},
            "failed_count": {"type": "integer"},
            "total_cost_usd": {"type": "number"},
            "reports": {"type": "array"},
        },
    }

    async def execute(self, **kwargs: Any) -> ToolResult:
        items: list[str] = list(kwargs.get("items") or [])
        if not items:
            return ToolResult(success=False, error="items is required and must be non-empty")

        concurrency = max(1, int(kwargs.get("concurrency", 4)))
        sem = asyncio.Semaphore(concurrency)
        start = time.monotonic()

        doc_tool = DocumentIngest()
        img_tool = ImageAnalyze()
        vid_tool = VideoAnalyze()
        url_tool = WebFetch()

        async def _analyze(item: str) -> dict[str, Any]:
            kind = _classify(item)
            base: dict[str, Any] = {"source": item, "kind": kind}
            async with sem:
                if kind == "document":
                    res = await doc_tool.execute_with_tracking(path=item)
                elif kind == "image":
                    res = await img_tool.execute_with_tracking(
                        path=item,
                        use_vision=bool(kwargs.get("image_use_vision", True)),
                    )
                elif kind == "video":
                    res = await vid_tool.execute_with_tracking(
                        path=item,
                        extract_keyframes=bool(kwargs.get("video_extract_keyframes", True)),
                        max_keyframes=int(kwargs.get("video_max_keyframes", 6)),
                    )
                elif kind == "url":
                    res = await url_tool.execute_with_tracking(url=item)
                elif kind == "audio":
                    base.update({
                        "status": "skipped",
                        "error": "audio inputs not yet routed by ingest_artifacts (use audio_probe directly)",
                    })
                    return base
                else:
                    if not (item.startswith("http") or os.path.exists(item)):
                        base.update({"status": "failed", "error": f"path does not exist: {item}"})
                        return base
                    base.update({"status": "failed", "error": f"unsupported artifact type: {Path(item).suffix or 'no extension'}"})
                    return base

            base["status"] = "ok" if res.success else "failed"
            base["cost_usd"] = res.cost_usd
            base["duration_seconds"] = round(res.duration_seconds, 3)
            if res.success:
                base["output"] = res.output
            else:
                base["error"] = res.error
            return base

        reports = await asyncio.gather(*(_analyze(i) for i in items))

        ok = sum(1 for r in reports if r["status"] == "ok")
        failed = sum(1 for r in reports if r["status"] == "failed")
        total_cost = round(sum(float(r.get("cost_usd", 0) or 0) for r in reports), 6)

        return ToolResult(
            success=True,
            output={
                "summary": _summarize(reports),
                "artifact_count": len(items),
                "ok_count": ok,
                "failed_count": failed,
                "total_cost_usd": total_cost,
                "reports": reports,
            },
            cost_usd=total_cost,
            duration_seconds=time.monotonic() - start,
            metadata={"item_count": len(items), "ok": ok, "failed": failed},
        )
