"""Component Texture Capture — HyperFrames component/SCF frame → PNG texture.

This tool is the first-class bridge from existing Slate HyperFrames components
to PNG textures for three.js surfaces (device screens, browser walls, 3D cards).
It reuses the local SCF compiler plus ``@hyperframes/producer`` frame capture;
it does not rasterize arbitrary HTML and it does not approximate UI/text with
image generation.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import time
import uuid
from pathlib import Path
from typing import Any

import jsonschema

from slate.core.base_tool import (
    BaseTool,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)

_THIS_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _THIS_DIR.parents[3]
_SCHEMA_PATH = _PROJECT_ROOT / "schemas" / "scf-v1.0.schema.json"
_RENDER_DIR = _PROJECT_ROOT / "render"
_CAPTURE_SCRIPT = _RENDER_DIR / "capture-frame.mjs"

_SCF_SCHEMA: dict[str, Any] | None = None


def _get_schema() -> dict[str, Any]:
    global _SCF_SCHEMA
    if _SCF_SCHEMA is None:
        _SCF_SCHEMA = json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))
    return _SCF_SCHEMA


class ComponentTextureCapture(BaseTool):
    """Capture a HyperFrames component or SCF frame as an exact PNG texture."""

    name = "component_texture_capture"
    agent_skills = [
        "core/render/html-in-canvas",
        "core/render/three-js",
        "core/hyperframes-rendering",
    ]
    version = "0.1.0"
    tier = ToolTier.GENERATE
    capability = (
        "Capture a deterministic PNG frame from a HyperFrames component or SCF "
        "composition for use as a three.js texture."
    )
    provider = "hyperframes"
    runtime = ToolRuntime.LOCAL
    stability = ToolStability.BETA
    compliance_level = "general"
    data_residency = "local"

    input_schema = {
        "type": "object",
        "properties": {
            "mode": {
                "type": "string",
                "enum": ["component_frame", "scf_frame"],
                "description": "Capture a single component scene or a frame from an SCF composition.",
            },
            "component": {
                "type": "string",
                "description": "Component name for mode=component_frame, e.g. TitleCard or ScreenDemoFrame.",
            },
            "props": {
                "type": "object",
                "description": "Props for the component scene.",
            },
            "duration": {"type": "number", "default": 3},
            "scf": {
                "type": "object",
                "description": "Inline SCF document for mode=scf_frame.",
            },
            "scf_path": {
                "type": "string",
                "description": "Path to an SCF JSON file for mode=scf_frame.",
            },
            "time": {"type": "number", "default": 0},
            "width": {"type": "integer", "default": 1024},
            "height": {"type": "integer", "default": 1024},
            "fps": {"type": "integer", "default": 30},
            "output_dir": {"type": "string", "default": "output/component_textures"},
            "output_path": {"type": "string"},
        },
        "required": ["mode"],
    }

    output_schema = {
        "type": "object",
        "properties": {
            "texture_path": {"type": "string"},
            "width": {"type": "integer"},
            "height": {"type": "integer"},
            "time": {"type": "number"},
            "frame_index": {"type": "integer"},
            "fps": {"type": "integer"},
            "duration": {"type": "number"},
            "mode": {"type": "string"},
            "deterministic": {"type": "boolean"},
            "html_path": {"type": "string"},
            "work_dir": {"type": "string"},
        },
    }

    fallback_tools = ["html_texture_render"]

    async def execute(self, **kwargs: Any) -> ToolResult:
        start = time.monotonic()
        mode = kwargs.get("mode")
        if mode not in {"component_frame", "scf_frame"}:
            return ToolResult(
                success=False,
                error="mode must be 'component_frame' or 'scf_frame'",
            )

        if shutil.which("node") is None:
            return ToolResult(
                success=False,
                error="Node.js not found. Install Node.js >=22 to capture component textures.",
                metadata={"failed_dependency": "node"},
            )
        if not _CAPTURE_SCRIPT.exists():
            return ToolResult(
                success=False,
                error=f"Capture script not found: {_CAPTURE_SCRIPT}",
                metadata={"failed_dependency": "render/capture-frame.mjs"},
            )
        if not (_RENDER_DIR / "node_modules" / "@hyperframes" / "producer").exists():
            return ToolResult(
                success=False,
                error="Renderer dependencies are not installed. Run `cd render && npm install`.",
                metadata={"failed_dependency": "@hyperframes/producer"},
            )

        try:
            width = int(kwargs.get("width", 1024))
            height = int(kwargs.get("height", 1024))
            fps = int(kwargs.get("fps", 30))
            capture_time = float(kwargs.get("time", 0))
            duration = float(kwargs.get("duration", 3))
        except (TypeError, ValueError) as exc:
            return ToolResult(success=False, error=f"Invalid numeric input: {exc}")

        if width <= 0 or height <= 0 or fps <= 0:
            return ToolResult(success=False, error=f"Invalid capture geometry: {width}x{height}@{fps}")
        if capture_time < 0:
            return ToolResult(success=False, error="time must be >= 0")

        output_path = self._resolve_output_path(kwargs)
        work_dir = output_path.parent / f"{output_path.stem}_work"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            scf_path, scf_data = self._prepare_scf(mode, kwargs, width, height, fps, duration, work_dir)
        except ValueError as exc:
            return ToolResult(success=False, error=str(exc))
        except jsonschema.ValidationError as exc:
            return ToolResult(success=False, error=f"SCF validation failed: {exc.message}")
        except OSError as exc:
            return ToolResult(success=False, error=f"Failed to prepare SCF: {exc}")

        cmd = [
            "node",
            str(_CAPTURE_SCRIPT),
            "--scf",
            str(scf_path),
            "--output",
            str(output_path),
            "--work-dir",
            str(work_dir),
            "--time",
            str(capture_time),
            "--fps",
            str(fps),
            "--width",
            str(width),
            "--height",
            str(height),
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(_RENDER_DIR),
            )
            stdout_bytes, stderr_bytes = await proc.communicate()
        except OSError as exc:
            return ToolResult(success=False, error=f"Failed to launch capture: {exc}")

        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
        if proc.returncode != 0:
            return ToolResult(
                success=False,
                error=stderr or stdout or f"Capture exited with code {proc.returncode}",
                duration_seconds=time.monotonic() - start,
                metadata={"stdout": stdout, "stderr": stderr, "returncode": proc.returncode},
            )

        try:
            capture_info = self._parse_json_line(stdout)
        except ValueError as exc:
            return ToolResult(
                success=False,
                error=f"Capture completed but did not return JSON: {exc}",
                metadata={"stdout": stdout, "stderr": stderr},
            )

        if not output_path.exists():
            return ToolResult(
                success=False,
                error=f"Capture reported success but PNG was not written: {output_path}",
                metadata={"stdout": stdout, "stderr": stderr, "capture_info": capture_info},
            )

        output = {
            "texture_path": str(output_path.resolve()),
            "width": width,
            "height": height,
            "time": capture_info.get("time", capture_time),
            "frame_index": capture_info.get("frame_index"),
            "fps": fps,
            "duration": capture_info.get("duration", scf_data["scenes"][0]["duration"]),
            "mode": mode,
            "deterministic": True,
            "html_path": capture_info.get("html_path"),
            "work_dir": capture_info.get("work_dir"),
        }
        return ToolResult(
            success=True,
            output=output,
            cost_usd=0.0,
            duration_seconds=time.monotonic() - start,
            metadata={
                "renderer": "@hyperframes/producer",
                "stdout": stdout,
                "stderr": stderr,
                "scf_path": str(scf_path.resolve()),
            },
        )

    def _resolve_output_path(self, kwargs: dict[str, Any]) -> Path:
        explicit = kwargs.get("output_path")
        if explicit:
            output_path = Path(explicit)
        else:
            output_dir = Path(kwargs.get("output_dir", "output/component_textures"))
            filename = f"component_texture_{uuid.uuid4().hex[:8]}.png"
            output_path = output_dir / filename
        if not output_path.is_absolute():
            output_path = _PROJECT_ROOT / output_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        return output_path

    def _prepare_scf(
        self,
        mode: str,
        kwargs: dict[str, Any],
        width: int,
        height: int,
        fps: int,
        duration: float,
        work_dir: Path,
    ) -> tuple[Path, dict[str, Any]]:
        if mode == "component_frame":
            component = str(kwargs.get("component") or "").strip()
            if not component:
                raise ValueError("component is required for mode=component_frame")
            if duration <= 0:
                raise ValueError("duration must be > 0 for mode=component_frame")
            scf_data = {
                "version": "1.0",
                "pipeline": "component-texture-capture",
                "outputProfile": {"width": width, "height": height, "fps": fps},
                "scenes": [
                    {
                        "id": "capture",
                        "duration": duration,
                        "component": component,
                        "props": kwargs.get("props") or {},
                    }
                ],
            }
            scf_path = work_dir / "component-frame.scf.json"
        else:
            scf_path_arg = kwargs.get("scf_path")
            inline_scf = kwargs.get("scf")
            if bool(scf_path_arg) == bool(inline_scf):
                raise ValueError("Exactly one of scf or scf_path is required for mode=scf_frame")
            if scf_path_arg:
                scf_path = Path(str(scf_path_arg))
                if not scf_path.is_absolute():
                    scf_path = _PROJECT_ROOT / scf_path
                if not scf_path.exists():
                    raise ValueError(f"SCF file not found: {scf_path}")
                scf_data = json.loads(scf_path.read_text(encoding="utf-8"))
            else:
                if not isinstance(inline_scf, dict):
                    raise ValueError("scf must be an object for mode=scf_frame")
                scf_data = inline_scf
                scf_path = work_dir / "inline.scf.json"

        jsonschema.validate(instance=scf_data, schema=_get_schema())
        scf_path.parent.mkdir(parents=True, exist_ok=True)
        if mode == "component_frame" or not kwargs.get("scf_path"):
            scf_path.write_text(json.dumps(scf_data, indent=2), encoding="utf-8")
        return scf_path, scf_data

    @staticmethod
    def _parse_json_line(stdout: str) -> dict[str, Any]:
        for line in reversed(stdout.splitlines()):
            text = line.strip()
            if text.startswith("{") and text.endswith("}"):
                return json.loads(text)
        raise ValueError("no JSON object found in stdout")

