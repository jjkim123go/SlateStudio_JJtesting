"""BaseTool — Abstract contract for all Slate tools.

Every tool in the tools/ directory must inherit from BaseTool and implement execute().
The ToolRegistry auto-discovers all BaseTool subclasses.

Architecture note: The tool-contract pattern (ToolTier, ToolRuntime, ResourceProfile,
support_envelope, fallback_tools) is a clean-room design inspired by OpenMontage's
ToolContract architecture (AGPL-3.0, https://github.com/calesthio/OpenMontage).
Slate's implementation is original, adapted for Azure-first enterprise requirements
including compliance_level, data_residency, and audit_fields.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ToolTier(str, Enum):
    """Classification of tool capability domain."""
    CORE = "core"           # FFmpeg, HyperFrames, transcription
    VOICE = "voice"         # TTS, voice cloning
    ENHANCE = "enhance"     # Color grading, upscaling, noise reduction
    GENERATE = "generate"   # Image gen, video gen
    SOURCE = "source"       # Stock footage, music, templates
    ANALYZE = "analyze"     # Video analysis, scene detection, quality check
    PUBLISH = "publish"     # Teams, SharePoint, Stream, YouTube
    INGEST = "ingest"       # PPT, Word, Excel, PDF parsing
    CAPTURE = "capture"     # Screen recording, Playwright
    AVATAR = "avatar"       # Digital spokesperson


class ToolRuntime(str, Enum):
    """Where the tool executes."""
    LOCAL = "local"         # Runs entirely on local machine
    LOCAL_GPU = "local_gpu" # Needs local GPU
    API = "api"             # Calls external API
    HYBRID = "hybrid"       # Local processing + API call


class ToolStability(str, Enum):
    """Maturity level."""
    STABLE = "stable"
    BETA = "beta"
    EXPERIMENTAL = "experimental"


@dataclass
class ToolResult:
    """Standard return type from tool execution."""
    success: bool
    output: Any = None
    error: str | None = None
    cost_usd: float = 0.0
    duration_seconds: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def __bool__(self) -> bool:
        return self.success


class BaseTool(ABC):
    """Abstract base for all Slate tools.

    Subclasses MUST define all class-level attributes and implement execute().
    The ToolRegistry discovers tools by scanning for BaseTool subclasses.
    """

    # --- Required contract fields (subclass MUST override) ---
    name: str = ""
    version: str = "0.1.0"
    tier: ToolTier = ToolTier.CORE
    capability: str = ""        # One-sentence description
    provider: str = ""          # foundry / ffmpeg / hyperframes / local / epidemic
    runtime: ToolRuntime = ToolRuntime.LOCAL
    stability: ToolStability = ToolStability.BETA

    input_schema: dict[str, Any] = {}
    output_schema: dict[str, Any] = {}
    fallback_tools: list[str] = []
    resource_profile: dict[str, Any] = {}

    # Enterprise fields
    compliance_level: str = "general"   # general / confidential / highly-confidential
    data_residency: str = "in-tenant"   # in-tenant / external
    audit_fields: dict[str, Any] = {}

    # JIT skill loading — names of skills (Layer 2 or Layer 3) the agent MUST
    # read before invoking this tool. The agent looks up each name in
    # skills/INDEX.md to resolve the file path. Keep this list focused: only
    # the skills that materially change prompt quality or correctness for
    # this tool. See AGENT_GUIDE / copilot-instructions for the JIT contract.
    agent_skills: list[str] = []

    @abstractmethod
    async def execute(self, **kwargs: Any) -> ToolResult:
        """Execute the tool with the given parameters.

        Returns a ToolResult with success/failure, output, cost, duration.
        """
        ...

    def support_envelope(self) -> dict[str, Any]:
        """Return a JSON-serializable description of this tool's capabilities.

        Used by the ToolRegistry to build the capability manifest that the agent reads.
        """
        return {
            "name": self.name,
            "version": self.version,
            "tier": self.tier.value,
            "capability": self.capability,
            "provider": self.provider,
            "runtime": self.runtime.value,
            "stability": self.stability.value,
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
            "fallback_tools": self.fallback_tools,
            "resource_profile": self.resource_profile,
            "compliance_level": self.compliance_level,
            "data_residency": self.data_residency,
            "agent_skills": self.agent_skills,
        }

    async def execute_with_tracking(self, **kwargs: Any) -> ToolResult:
        """Wrapper that adds timing to execute()."""
        start = time.monotonic()
        try:
            result = await self.execute(**kwargs)
        except Exception as e:
            result = ToolResult(success=False, error=f"{type(e).__name__}: {e}")
        result.duration_seconds = time.monotonic() - start
        result.metadata["tool_name"] = self.name
        result.metadata["tool_version"] = self.version
        return result

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name!r} tier={self.tier.value}>"
