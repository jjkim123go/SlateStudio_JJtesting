"""HyperFramesRender — Render SCF compositions to MP4 via the Node.js HyperFrames renderer.

Pipeline: SCF JSON → SCF→HTML compiler (render/lib/scf-to-html.mjs) →
@hyperframes/producer (headless Chrome capture + FFmpeg encode + audio mix) → MP4.

Design note: The separation of composition format (SCF JSON) from rendering
engine is a clean-room design inspired by OpenMontage (AGPL-3.0). Slate uses
HyperFrames (Apache-2.0, © HeyGen Inc.) as its primary renderer.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import jsonschema

from slate.core.base_tool import BaseTool, ToolResult, ToolRuntime, ToolStability, ToolTier

# Resolve project root (repo root contains the schemas/ and render/ directories)
_THIS_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _THIS_DIR.parents[3]  # src/slate/tools/video -> project root
_SCHEMA_PATH = _PROJECT_ROOT / "schemas" / "scf-v1.0.schema.json"
_RENDER_DIR = _PROJECT_ROOT / "render"
_RENDER_SCRIPT = _RENDER_DIR / "render.mjs"


def _load_schema() -> dict[str, Any]:
    """Load and cache the SCF JSON schema."""
    with open(_SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


_SCF_SCHEMA: dict[str, Any] | None = None


def _get_schema() -> dict[str, Any]:
    global _SCF_SCHEMA
    if _SCF_SCHEMA is None:
        _SCF_SCHEMA = _load_schema()
    return _SCF_SCHEMA


class HyperFramesRender(BaseTool):
    """Render an SCF composition to MP4 via the HyperFrames Node.js renderer."""

    name = "hyperframes_render"
    agent_skills = ["core/hyperframes-rendering", "core/component-authoring"]
    version = "0.1.0"
    tier = ToolTier.CORE
    capability = "Render SCF composition to MP4 via HyperFrames"
    provider = "hyperframes"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA

    async def execute(self, **kwargs: Any) -> ToolResult:
        """Execute the HyperFrames renderer.

        Args (via kwargs):
            scf: SCF composition as a dict or a string file path to a .json file.
            output_dir: Directory for output files (default: "renders", relative to project root).
            quality: Render preset — "draft" | "standard" | "high" (default: "standard").
            dry_run: If True, compile SCF → HTML only and skip render.
        """
        scf_input = kwargs.get("scf")
        output_dir = kwargs.get("output_dir", "renders")
        quality = kwargs.get("quality", "standard")
        dry_run = bool(kwargs.get("dry_run", False))

        if scf_input is None:
            return ToolResult(success=False, error="Missing required parameter: scf")

        # --- Load SCF data ---
        if isinstance(scf_input, str):
            scf_path = Path(scf_input)
            if not scf_path.exists():
                return ToolResult(success=False, error=f"SCF file not found: {scf_input}")
            try:
                with open(scf_path, encoding="utf-8") as f:
                    scf_data = json.load(f)
            except (json.JSONDecodeError, OSError) as exc:
                return ToolResult(success=False, error=f"Failed to read SCF file: {exc}")
        elif isinstance(scf_input, dict):
            scf_data = scf_input
        else:
            return ToolResult(
                success=False, error="scf must be a dict or a file path string"
            )

        # --- Validate against schema ---
        try:
            jsonschema.validate(instance=scf_data, schema=_get_schema())
        except jsonschema.ValidationError as exc:
            return ToolResult(success=False, error=f"SCF validation failed: {exc.message}")

        # --- Write SCF to output dir ---
        out_dir = _PROJECT_ROOT / output_dir
        out_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        scf_file = out_dir / f"{timestamp}.scf.json"
        with open(scf_file, "w", encoding="utf-8") as f:
            json.dump(scf_data, f, indent=2)

        # --- Build renderer command ---
        cmd = ["node", str(_RENDER_SCRIPT), str(scf_file), "--quality", quality]
        if dry_run:
            cmd.append("--dry-run")

        # --- Run HyperFrames renderer ---
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(_RENDER_DIR),
            )
            stdout_bytes, stderr_bytes = await proc.communicate()
        except FileNotFoundError:
            return ToolResult(
                success=False,
                error="Node.js not found. Ensure 'node' is on the PATH.",
            )
        except OSError as exc:
            return ToolResult(success=False, error=f"Failed to launch renderer: {exc}")

        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")

        if proc.returncode != 0:
            return ToolResult(
                success=False,
                error=stderr or stdout or f"HyperFrames renderer exited with code {proc.returncode}",
                metadata={"stdout": stdout, "stderr": stderr, "returncode": proc.returncode},
            )

        # --- Determine output paths ---
        # render.mjs writes HTML next to the SCF, MP4 in renders/ subdirectory
        scf_stem = scf_file.stem.replace(".scf", "")
        html_path = scf_file.parent / f"{scf_stem}.html"
        mp4_path = scf_file.parent / "renders" / f"{scf_stem}.mp4"

        return ToolResult(
            success=True,
            output={
                "mp4_path": str(mp4_path) if mp4_path.exists() else None,
                "html_path": str(html_path) if html_path.exists() else None,
                "scf_path": str(scf_file),
            },
            cost_usd=0.0,
            metadata={"stdout": stdout, "stderr": stderr, "dry_run": dry_run},
        )
