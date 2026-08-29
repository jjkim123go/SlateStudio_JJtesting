"""ToolRegistry — Auto-discovers and indexes all BaseTool subclasses.

Walks the tools/ package tree, imports modules, finds BaseTool subclasses,
and builds a capability manifest for agent consumption.

For contributors adding a new tool, see ``docs/TOOL_ONBOARDING.md`` —
it has the copy-paste skeleton, the field guide, and the preflight
verification step.

Lineage: Auto-discovery and capability-manifest behavior carry implementation
lineage from OpenMontage's tool registry (AGPL-3.0). Slate extends the registry
with Azure providers and enterprise capability metadata. See
docs/OPENMONTAGE_LINEAGE.md.
"""

from __future__ import annotations

import importlib
import inspect
import logging
import os
import pkgutil
from pathlib import Path
from typing import Any

from .base_tool import BaseTool, ToolRuntime, ToolTier

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Singleton registry that auto-discovers all tools.

    Usage:
        registry = ToolRegistry()
        registry.discover()                # walks the installed slate.tools package
        registry.discover("src/slate/tools")  # legacy path-based form (still supported)
        tool = registry.get("audio_probe")
        manifest = registry.capability_manifest()
        report  = registry.provider_menu_summary()  # agent-facing report
    """

    _instance: ToolRegistry | None = None
    _tools: dict[str, BaseTool]
    _runtime_warnings: list[str]
    _import_failures: dict[str, str]
    _discovered: bool

    def __new__(cls) -> ToolRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_state()
        return cls._instance

    def _init_state(self) -> None:
        """Initialise mutable state. Idempotent — safe to call from __new__
        OR from defensive code paths if a caller bypassed __new__ via
        ``ToolRegistry.__new__(ToolRegistry)`` (see tests/test_governance.py)."""
        if not hasattr(self, "_tools"):
            self._tools = {}
        if not hasattr(self, "_runtime_warnings"):
            self._runtime_warnings = []
        if not hasattr(self, "_import_failures"):
            self._import_failures = {}
        if not hasattr(self, "_discovered"):
            self._discovered = False

    def discover(self, tools_package_path: str | Path | None = None) -> int:
        """Walk the tools package tree and register all BaseTool subclasses.

        If ``tools_package_path`` is omitted, walks the installed ``slate.tools``
        package (works regardless of cwd / install layout). When passed a path,
        keeps the legacy behaviour of walking that directory on disk.

        Per-module AND per-class errors are isolated: one broken tool will
        never prevent the rest from registering. Failures are collected into
        ``runtime_warnings`` and ``import_failures`` for the agent report.
        """
        self._init_state()
        package_name = "slate.tools"

        if tools_package_path is None:
            try:
                pkg = importlib.import_module(package_name)
            except Exception as e:
                self._runtime_warnings.append(
                    f"Could not import package {package_name!r}: {type(e).__name__}: {e}"
                )
                self._discovered = True
                return 0
            search_paths = list(getattr(pkg, "__path__", []))
        else:
            tools_path = Path(tools_package_path)
            if not tools_path.exists():
                msg = f"Tools path does not exist: {tools_path}"
                logger.warning(msg)
                self._runtime_warnings.append(msg)
                self._discovered = True
                return 0
            search_paths = [str(tools_path)]

        count = 0
        for _importer, module_name, _is_pkg in pkgutil.walk_packages(
            search_paths, prefix=f"{package_name}."
        ):
            # Skip the registry itself and the BaseTool module if they ever
            # land under tools/ — defence-in-depth, current layout is fine.
            tail = module_name.rsplit(".", 1)[-1]
            if tail in {"base_tool", "tool_registry", "__init__"}:
                continue

            try:
                module = importlib.import_module(module_name)
            except Exception as e:
                err = f"{type(e).__name__}: {e}"
                self._import_failures[module_name] = err
                self._runtime_warnings.append(f"Failed to import {module_name}: {err}")
                logger.warning("Failed to import %s: %s", module_name, e)
                continue

            for _attr_name, attr in inspect.getmembers(module, inspect.isclass):
                # Only register classes defined in THIS module (skip re-exports
                # and intermediate abstract bases imported from elsewhere).
                if attr.__module__ != module.__name__:
                    continue
                if attr is BaseTool or not issubclass(attr, BaseTool):
                    continue
                if inspect.isabstract(attr):
                    continue
                if not getattr(attr, "name", ""):
                    continue

                try:
                    instance = attr()
                except Exception as e:
                    err = f"{type(e).__name__}: {e}"
                    self._runtime_warnings.append(
                        f"Failed to instantiate {module_name}.{attr.__name__}: {err}"
                    )
                    logger.warning(
                        "Failed to instantiate %s.%s: %s", module_name, attr.__name__, e
                    )
                    continue

                self._tools[instance.name] = instance
                count += 1
                logger.info("Discovered tool: %s (%s)", instance.name, instance.tier.value)

        self._discovered = True
        logger.info("Tool discovery complete: %d tools found", count)
        return count

    def get(self, name: str) -> BaseTool | None:
        """Get a tool by name."""
        return self._tools.get(name)

    def get_by_tier(self, tier: ToolTier) -> list[BaseTool]:
        """Get all tools in a specific tier."""
        return [t for t in self._tools.values() if t.tier == tier]

    def list_tools(self) -> list[str]:
        """List all registered tool names."""
        return sorted(self._tools.keys())

    def capability_manifest(self) -> list[dict[str, Any]]:
        """Generate the full capability manifest for agent consumption.

        This is what gets injected into the agent's system prompt so it
        knows what tools are available and what they can do.
        """
        return [tool.support_envelope() for tool in sorted(
            self._tools.values(), key=lambda t: (t.tier.value, t.name)
        )]

    @property
    def count(self) -> int:
        return len(self._tools)

    def reset(self) -> None:
        """Clear all registered tools. Mainly for testing."""
        self._init_state()
        self._tools.clear()
        self._runtime_warnings.clear()
        self._import_failures.clear()
        self._discovered = False

    # ------------------------------------------------------------------
    # Agent-facing introspection
    # ------------------------------------------------------------------

    @property
    def runtime_warnings(self) -> list[str]:
        """Discovery-time warnings (broken imports, failed instantiations)."""
        self._init_state()
        return list(self._runtime_warnings)

    @property
    def import_failures(self) -> dict[str, str]:
        """Module path -> error string for each module that failed to import."""
        self._init_state()
        return dict(self._import_failures)

    def is_available(self, tool: BaseTool) -> bool:
        """Best-effort availability check for a tool.

        Tools may opt in to richer signalling by exposing an ``is_available``
        property/attribute (see ``VideoIndexer``). Otherwise, API tools are
        considered available iff any obvious env var hint is set; LOCAL tools
        are assumed available.
        """
        flag = getattr(tool, "is_available", None)
        if isinstance(flag, bool):
            return flag
        if callable(flag):
            try:
                return bool(flag())
            except Exception:
                return False

        # Heuristic: API/HYBRID tools generally need credentials. We don't
        # know the exact env var, so fall back to "assume available" — the
        # tool itself will fail loudly when invoked. This keeps the menu
        # honest without hard-coding provider knowledge.
        return True

    def provider_menu_summary(self) -> dict[str, Any]:
        """Agent-facing report — what to read at session start.

        Shape:
            {
              "tool_count": int,
              "tools_by_tier": {tier: [tool_name, ...]},
              "available": [{name, tier, runtime, capability, provider}],
              "unavailable": [{name, reason}],
              "runtime_warnings": [str, ...],
              "import_failures": {module: error, ...},
            }
        """
        self._init_state()
        if not self._discovered:
            self.discover()

        available: list[dict[str, Any]] = []
        unavailable: list[dict[str, Any]] = []
        tools_by_tier: dict[str, list[str]] = {}

        for tool in sorted(self._tools.values(), key=lambda t: (t.tier.value, t.name)):
            tools_by_tier.setdefault(tool.tier.value, []).append(tool.name)

            row = {
                "name": tool.name,
                "tier": tool.tier.value,
                "runtime": tool.runtime.value,
                "provider": tool.provider,
                "stability": tool.stability.value,
                "capability": tool.capability,
                "fallback_tools": list(tool.fallback_tools),
                "agent_skills": list(tool.agent_skills),
            }

            if self.is_available(tool):
                available.append(row)
            else:
                reason = "Tool reports is_available=False (likely missing config / credentials)"
                unavailable.append({**row, "reason": reason})

        return {
            "tool_count": len(self._tools),
            "tools_by_tier": tools_by_tier,
            "available": available,
            "unavailable": unavailable,
            "runtime_warnings": list(self._runtime_warnings),
            "import_failures": dict(self._import_failures),
        }


# Module-level singleton — convenient for `from slate.core.tool_registry import registry`.
registry = ToolRegistry()
