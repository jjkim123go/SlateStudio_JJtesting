"""Tests for core infrastructure."""

import pytest
from slate.core.base_tool import BaseTool, ToolResult, ToolTier, ToolRuntime
from slate.core.tool_registry import ToolRegistry
from slate.core.cost_tracker import CostTracker


class MockTool(BaseTool):
    name = "mock_tool"
    version = "1.0.0"
    tier = ToolTier.CORE
    capability = "A mock tool for testing"
    provider = "test"
    runtime = ToolRuntime.LOCAL

    async def execute(self, **kwargs):
        return ToolResult(success=True, output="mock output", cost_usd=0.01)


class TestBaseTool:
    def test_support_envelope(self):
        tool = MockTool()
        envelope = tool.support_envelope()
        assert envelope["name"] == "mock_tool"
        assert envelope["tier"] == "core"
        assert envelope["capability"] == "A mock tool for testing"

    @pytest.mark.asyncio
    async def test_execute_with_tracking(self):
        tool = MockTool()
        result = await tool.execute_with_tracking()
        assert result.success
        assert result.output == "mock output"
        assert result.duration_seconds >= 0
        assert result.metadata["tool_name"] == "mock_tool"


class TestToolRegistry:
    def setup_method(self):
        registry = ToolRegistry()
        registry.reset()

    def test_singleton(self):
        r1 = ToolRegistry()
        r2 = ToolRegistry()
        assert r1 is r2

    def test_capability_manifest_empty(self):
        registry = ToolRegistry()
        assert registry.capability_manifest() == []
        assert registry.count == 0


class TestCostTracker:
    def test_record_and_summary(self):
        tracker = CostTracker(budget_usd=1.00)
        tracker.record("foundry_tts", "generate", 0.05)
        tracker.record("foundry_image_gen", "generate", 0.10)
        summary = tracker.summary()
        assert summary["total_usd"] == 0.15
        assert summary["under_budget"] is True
        assert summary["by_tool"]["foundry_tts"] == 0.05

    def test_budget_enforcement(self):
        tracker = CostTracker(budget_usd=0.10)
        tracker.record("expensive_tool", "run", 0.15)
        assert not tracker.check_budget()
        assert tracker.remaining == 0.0

    def test_estimate(self):
        tracker = CostTracker()
        est = tracker.estimate("foundry_tts", duration_seconds=60)
        assert est == 0.06  # 0.001 * 60
