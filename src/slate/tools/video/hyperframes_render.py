"""HyperFramesRender — Render SCF compositions to MP4 via the Node.js HyperFrames renderer.

Pipeline: SCF JSON → SCF→HTML compiler (render/lib/scf-to-html.mjs) →
@hyperframes/producer (headless Chrome capture + FFmpeg encode + audio mix) → MP4.

Lineage: The separation of declarative composition from rendering carries
architectural lineage from OpenMontage (AGPL-3.0). SCF and the HyperFrames
integration are Slate extensions. HyperFrames is separately licensed under
Apache-2.0. See docs/OPENMONTAGE_LINEAGE.md and NOTICE.md.
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
            output_path: Optional MP4 output path.
            workers: Optional capture worker count. WebGL defaults to 2 in the renderer;
                pass safe_webgl=True for conservative workers=1 fallback.
            safe_webgl: If True, pass --safe-webgl to the renderer.
            split_scenes: If True, render scenes sequentially and concatenate.
            scene: Optional scene id to render in isolation.
            use_gpu: Optional bool passed to renderer.
            webgl_backend: Optional ANGLE backend passed to renderer
                ("swiftshader" | "d3d11" | "default").
            dry_run: If True, compile SCF → HTML only and skip render.
        """
        scf_input = kwargs.get("scf")
        output_dir = kwargs.get("output_dir", "renders")
        quality = kwargs.get("quality", "standard")
        output_path = kwargs.get("output_path")
        workers = kwargs.get("workers")
        safe_webgl = bool(kwargs.get("safe_webgl", False))
        split_scenes = bool(kwargs.get("split_scenes", False))
        scene = kwargs.get("scene")
        use_gpu = kwargs.get("use_gpu")
        webgl_backend = kwargs.get("webgl_backend")
        dry_run = bool(kwargs.get("dry_run", False))

        if scf_input is None:
            return ToolResult(success=False, error="Missing required parameter: scf")

        # --- Load SCF data ---
        scf_path: Path | None = None
        if isinstance(scf_input, str):
            scf_path = Path(scf_input)
            if not scf_path.is_absolute():
                scf_path = _PROJECT_ROOT / scf_path
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

        # --- Resolve SCF file ---
        # For existing SCF paths, render in place so relative assets like
        # assets/narration.wav continue to resolve against the project folder.
        if scf_path is not None:
            scf_file = scf_path
        else:
            out_dir = _PROJECT_ROOT / output_dir
            out_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
            scf_file = out_dir / f"{timestamp}.scf.json"
            with open(scf_file, "w", encoding="utf-8") as f:
                json.dump(scf_data, f, indent=2)

        # --- Build renderer command ---
        cmd = ["node", str(_RENDER_SCRIPT), str(scf_file), "--quality", quality]
        if output_path:
            output = Path(str(output_path))
            if not output.is_absolute():
                output = _PROJECT_ROOT / output
            output.parent.mkdir(parents=True, exist_ok=True)
            cmd.extend(["--output", str(output)])
        if workers is not None:
            try:
                worker_count = int(workers)
            except (TypeError, ValueError):
                return ToolResult(success=False, error="workers must be an integer")
            if worker_count < 1:
                return ToolResult(success=False, error="workers must be >= 1")
            cmd.extend(["--workers", str(worker_count)])
        if safe_webgl:
            cmd.append("--safe-webgl")
        if split_scenes:
            cmd.append("--split-scenes")
        if scene:
            cmd.extend(["--scene", str(scene)])
        if use_gpu is not None:
            cmd.extend(["--use-gpu", "true" if bool(use_gpu) else "false"])
        if webgl_backend is not None:
            backend = str(webgl_backend).strip().lower()
            if backend not in {"swiftshader", "d3d11", "default"}:
                return ToolResult(
                    success=False,
                    error="webgl_backend must be one of: swiftshader, d3d11, default",
                )
            cmd.extend(["--webgl-backend", backend])
        if dry_run:
            cmd.append("--dry-run")

        # --- Run HyperFrames renderer ---
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(_PROJECT_ROOT),
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
        mp4_path = Path(output_path) if output_path else scf_file.parent / "renders" / f"{scf_stem}.mp4"
        if not mp4_path.is_absolute():
            mp4_path = _PROJECT_ROOT / mp4_path

        return ToolResult(
            success=True,
            output={
                "mp4_path": str(mp4_path) if mp4_path.exists() else None,
                "html_path": str(html_path) if html_path.exists() else None,
                "scf_path": str(scf_file),
            },
            cost_usd=0.0,
            metadata={
                "stdout": stdout,
                "stderr": stderr,
                "dry_run": dry_run,
                "safe_webgl": safe_webgl,
                "split_scenes": split_scenes,
                "workers": workers,
            },
        )
