"""TracedDispatcher — Enforced tool execution through ProductionTrace.

Wraps the ToolRegistry so that ALL tool calls flow through the trace layer.
This is the enforcement boundary — without it, tools could be called directly
and bypass governance checks.

The dispatcher:
1. Checks the tool is allowed in the current phase (via phase contract)
2. Begins a tool span in the trace
3. Executes via BaseTool.execute_with_tracking()
4. Records cost, output hash, and duration
5. Ends the tool span
6. Returns the ToolResult

If a tool is forbidden, the dispatcher raises a GovernanceError rather
than silently allowing it.
"""

from __future__ import annotations

import logging
from typing import Any

from .base_tool import BaseTool, ToolResult
from .production_trace import ProductionTrace, ViolationType
from .tool_registry import ToolRegistry

logger = logging.getLogger(__name__)


class GovernanceError(Exception):
    """Raised when a tool call violates governance policy."""

    def __init__(self, violation_type: ViolationType, detail: str):
        self.violation_type = violation_type
        self.detail = detail
        super().__init__(f"[{violation_type.value}] {detail}")


class TracedDispatcher:
    """Enforced tool execution wrapper.

    Usage:
        dispatcher = TracedDispatcher(registry, trace)
        dispatcher.set_phase("assets", phase_span_id)

        # All tool calls go through here
        result = await dispatcher.execute("foundry_image_gen", prompt="...", size="1024x1024")
    """

    def __init__(
        self,
        registry: ToolRegistry,
        trace: ProductionTrace,
        block_forbidden: bool = True,
    ):
        self.registry = registry
        self.trace = trace
        self.block_forbidden = block_forbidden
        self._current_phase: str | None = None
        self._current_phase_id: str | None = None

    def set_phase(self, phase_name: str, phase_span_id: str) -> None:
        """Set the current pipeline phase for contract enforcement."""
        self._current_phase = phase_name
        self._current_phase_id = phase_span_id
        logger.info("TracedDispatcher phase set: %s (%s)", phase_name, phase_span_id)

    def clear_phase(self) -> None:
        """Clear the current phase (between stages)."""
        self._current_phase = None
        self._current_phase_id = None

    async def execute(self, tool_name: str, **kwargs: Any) -> ToolResult:
        """Execute a tool through the traced, governed path.

        Raises GovernanceError if the tool is forbidden and block_forbidden=True.
        """
        # Look up the tool
        tool = self.registry.get(tool_name)
        if tool is None:
            return ToolResult(
                success=False,
                error=f"Tool '{tool_name}' not found in registry",
            )

        phase_id = self._current_phase_id
        phase_name = self._current_phase or "unknown"

        # Pre-execution contract check
        if phase_id:
            contract = self.trace._contracts.get(phase_name)
            if contract:
                # Check forbidden
                if tool_name in contract.tools_forbidden:
                    detail = f"Tool '{tool_name}' is forbidden in phase '{phase_name}'"
                    if self.block_forbidden:
                        raise GovernanceError(ViolationType.FORBIDDEN_TOOL, detail)
                    # If not blocking, still record violation but continue
                    logger.warning("Forbidden tool allowed (non-blocking): %s", detail)

                # Check allowed list
                if contract.tools_allowed and tool_name not in contract.tools_allowed:
                    detail = f"Tool '{tool_name}' not in allowed list for phase '{phase_name}'"
                    if self.block_forbidden:
                        raise GovernanceError(ViolationType.FORBIDDEN_TOOL, detail)
                    logger.warning("Unlisted tool allowed (non-blocking): %s", detail)

        # Execute through BaseTool tracking
        result = await tool.execute_with_tracking(**kwargs)

        # Record in trace
        if phase_id:
            self.trace.trace_tool(
                tool_name=tool_name,
                phase_id=phase_id,
                cost_usd=result.cost_usd,
                input_data=kwargs if kwargs else None,
                output_data=None,  # Don't store full output — just hash via trace
                metadata={
                    "success": result.success,
                    "duration_seconds": result.duration_seconds,
                    "error": result.error,
                },
            )

        return result

    async def execute_with_fallback(
        self, tool_name: str, **kwargs: Any
    ) -> ToolResult:
        """Execute a tool, falling back to its declared fallback tools on failure."""
        tool = self.registry.get(tool_name)
        if tool is None:
            return ToolResult(success=False, error=f"Tool '{tool_name}' not found")

        result = await self.execute(tool_name, **kwargs)
        if result.success:
            return result

        # Try fallback tools
        for fallback_name in tool.fallback_tools:
            fallback = self.registry.get(fallback_name)
            if fallback is None:
                continue

            logger.info(
                "Tool '%s' failed, trying fallback '%s'",
                tool_name, fallback_name,
            )
            result = await self.execute(fallback_name, **kwargs)
            if result.success:
                return result

        return result

    @property
    def current_phase(self) -> str | None:
        return self._current_phase
