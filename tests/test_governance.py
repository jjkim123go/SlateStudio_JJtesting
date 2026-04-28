"""Tests for the governance infrastructure: ProductionTrace, TracedDispatcher,
PhaseContracts, ReviewerAgent, ArtifactStore, GovernancePolicy."""

import asyncio
import json
import tempfile
from pathlib import Path
from typing import Any

import pytest
import yaml

from slate.core.base_tool import BaseTool, ToolResult, ToolTier, ToolRuntime
from slate.core.production_trace import (
    PhaseContract,
    ProductionTrace,
    SpanKind,
    SpanStatus,
    ViolationType,
)
from slate.core.traced_dispatcher import GovernanceError, TracedDispatcher
from slate.core.tool_registry import ToolRegistry
from slate.core.artifact_store import ArtifactStore
from slate.core.governance_policy import GovernancePolicy
from slate.agents import (
    FindingSeverity,
    ReviewerAgent,
    ReviewFinding,
    ReviewType,
    RevisionOwner,
)


# ─── Test Fixtures ───────────────────────────────────────────────────

class MockImageTool(BaseTool):
    name = "foundry_image_gen"
    tier = ToolTier.GENERATE
    capability = "Generate images"
    provider = "azure_foundry"
    runtime = ToolRuntime.API

    async def execute(self, **kwargs: Any) -> ToolResult:
        return ToolResult(success=True, output="image.png", cost_usd=0.04)


class MockTTSTool(BaseTool):
    name = "foundry_tts"
    tier = ToolTier.VOICE
    capability = "Text to speech"
    provider = "azure_foundry"
    runtime = ToolRuntime.API

    async def execute(self, **kwargs: Any) -> ToolResult:
        return ToolResult(success=True, output="audio.wav", cost_usd=0.01)


class MockCostTracker(BaseTool):
    name = "cost_tracker"
    tier = ToolTier.CORE
    capability = "Track costs"
    provider = "local"
    runtime = ToolRuntime.LOCAL

    async def execute(self, **kwargs: Any) -> ToolResult:
        return ToolResult(success=True, output="tracked")


class MockHyperFramesRender(BaseTool):
    name = "hyperframes_render"
    tier = ToolTier.CORE
    capability = "Render via HyperFrames"
    provider = "hyperframes"
    runtime = ToolRuntime.LOCAL

    async def execute(self, **kwargs: Any) -> ToolResult:
        return ToolResult(success=True, output="video.mp4")


class FailingTool(BaseTool):
    name = "failing_tool"
    tier = ToolTier.CORE
    capability = "Always fails"
    provider = "test"
    runtime = ToolRuntime.LOCAL
    fallback_tools = ["foundry_image_gen"]

    async def execute(self, **kwargs: Any) -> ToolResult:
        return ToolResult(success=False, error="Intentional failure")


@pytest.fixture
def registry() -> ToolRegistry:
    """Fresh registry with mock tools."""
    reg = ToolRegistry.__new__(ToolRegistry)
    reg._tools = {}
    for tool_cls in [MockImageTool, MockTTSTool, MockCostTracker, MockHyperFramesRender, FailingTool]:
        inst = tool_cls()
        reg._tools[inst.name] = inst
    return reg


@pytest.fixture
def trace(tmp_path: Path) -> ProductionTrace:
    return ProductionTrace(
        output_dir=tmp_path / "output",
        pipeline_name="test-pipeline",
        hard_budget_cap=10.0,
    )


@pytest.fixture
def assets_contract() -> PhaseContract:
    return PhaseContract(
        tools_allowed=["foundry_image_gen", "foundry_tts", "cost_tracker"],
        tools_required=["cost_tracker"],
        tools_forbidden=["hyperframes_render"],
        max_cost=5.0,
        max_duration=300,
    )


# ═══════════════════════════════════════════════════════════════════════
# ProductionTrace Tests
# ═══════════════════════════════════════════════════════════════════════

class TestProductionTrace:
    def test_init(self, trace: ProductionTrace):
        assert trace.pipeline_name == "test-pipeline"
        assert trace.hard_budget_cap == 10.0
        assert trace.total_cost == 0.0
        assert len(trace.violations) == 0

    def test_begin_end_phase(self, trace: ProductionTrace):
        span = trace.begin_phase("assets")
        assert span.kind == SpanKind.PHASE
        assert span.name == "assets"
        assert span.status == SpanStatus.ACTIVE

        violations = trace.end_phase(span.id)
        assert span.status == SpanStatus.COMPLETED
        assert span.duration_seconds >= 0
        assert violations == []

    def test_trace_tool(self, trace: ProductionTrace):
        phase = trace.begin_phase("assets")
        tool_span = trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)
        assert tool_span.kind == SpanKind.TOOL
        assert tool_span.parent_id == phase.id
        assert tool_span.cost_usd == 0.04
        assert trace.total_cost == 0.04

    def test_tool_cost_accumulates(self, trace: ProductionTrace):
        phase = trace.begin_phase("assets")
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)
        trace.trace_tool("foundry_tts", phase.id, cost_usd=0.01)
        assert trace.total_cost == pytest.approx(0.09)
        assert phase.cost_usd == pytest.approx(0.09)

    def test_forbidden_tool_violation(self, trace: ProductionTrace, assets_contract: PhaseContract):
        phase = trace.begin_phase("assets", contract=assets_contract)
        trace.trace_tool("hyperframes_render", phase.id)

        # Forbidden tool triggers both "forbidden" and "not in allowed list" violations
        assert len(trace.violations) == 2
        assert any("forbidden" in v.detail for v in trace.violations)
        assert any("not in allowed list" in v.detail for v in trace.violations)

    def test_unlisted_tool_violation(self, trace: ProductionTrace, assets_contract: PhaseContract):
        phase = trace.begin_phase("assets", contract=assets_contract)
        trace.trace_tool("unknown_tool", phase.id)

        assert len(trace.violations) == 1
        assert "not in allowed list" in trace.violations[0].detail

    def test_required_tool_missing(self, trace: ProductionTrace, assets_contract: PhaseContract):
        phase = trace.begin_phase("assets", contract=assets_contract)
        # Only call image_gen, not cost_tracker (which is required)
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)
        violations = trace.end_phase(phase.id)

        assert len(violations) == 1
        assert violations[0].type == ViolationType.MISSING_REQUIRED_TOOL
        assert "cost_tracker" in violations[0].detail

    def test_required_tool_satisfied(self, trace: ProductionTrace, assets_contract: PhaseContract):
        phase = trace.begin_phase("assets", contract=assets_contract)
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)
        trace.trace_tool("cost_tracker", phase.id)
        violations = trace.end_phase(phase.id)
        assert violations == []

    def test_required_skill_missing(self, trace: ProductionTrace):
        contract = PhaseContract(
            skills_required=["core/hyperframes-rendering", "core/component-authoring"],
        )
        phase = trace.begin_phase("compose", contract=contract)
        trace.record_skill_consultation("core/hyperframes-rendering", phase.id)
        # core/component-authoring intentionally NOT consulted
        violations = trace.end_phase(phase.id)

        missing = [v for v in violations if v.type == ViolationType.MISSING_REQUIRED_SKILL]
        assert len(missing) == 1
        assert "core/component-authoring" in missing[0].detail
        assert missing[0].severity == "error"

    def test_required_skill_satisfied(self, trace: ProductionTrace):
        contract = PhaseContract(
            skills_required=["core/hyperframes-rendering", "core/component-authoring"],
        )
        phase = trace.begin_phase("compose", contract=contract)
        trace.record_skill_consultation("core/hyperframes-rendering", phase.id)
        trace.record_skill_consultation("core/component-authoring", phase.id)
        # idempotent
        trace.record_skill_consultation("core/component-authoring", phase.id)
        violations = trace.end_phase(phase.id)

        assert [v for v in violations if v.type == ViolationType.MISSING_REQUIRED_SKILL] == []
        # Verify it landed in the persisted span metadata
        assert phase.metadata["skills_consulted"] == [
            "core/hyperframes-rendering",
            "core/component-authoring",
        ]

    def test_stage_budget_exceeded(self, trace: ProductionTrace, assets_contract: PhaseContract):
        phase = trace.begin_phase("assets", contract=assets_contract)
        for _ in range(130):  # 130 * $0.04 = $5.20 > $5.00
            trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)

        budget_violations = [
            v for v in trace.violations if v.type == ViolationType.STAGE_BUDGET_EXCEEDED
        ]
        assert len(budget_violations) == 1

    def test_hard_budget_exceeded(self, tmp_path: Path):
        trace = ProductionTrace(
            output_dir=tmp_path / "output",
            pipeline_name="test",
            hard_budget_cap=0.10,
        )
        phase = trace.begin_phase("assets")
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.05)
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.06)  # Over cap

        budget_violations = [
            v for v in trace.violations if v.type == ViolationType.BUDGET_EXCEEDED
        ]
        assert len(budget_violations) == 1
        assert trace.has_critical_violations

    def test_record_gate(self, trace: ProductionTrace):
        gate = trace.record_gate("ingest", "user_approval", approved_by="user")
        assert gate.kind == SpanKind.GATE
        assert gate.metadata["approved_by"] == "user"

    def test_record_review(self, trace: ProductionTrace):
        scores = {"brand_compliance": 3, "pacing": 2}
        review = trace.record_review("final", scores)
        assert review.kind == SpanKind.REVIEW
        assert review.metadata["total_score"] == 5

    def test_metrics(self, trace: ProductionTrace):
        phase = trace.begin_phase("assets")
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)
        trace.end_phase(phase.id)

        m = trace.metrics()
        assert m["total_phases"] == 1
        assert m["total_tool_calls"] == 1
        assert m["total_cost_usd"] == 0.04
        assert "assets" in m["phases"]

    def test_persistence(self, trace: ProductionTrace, tmp_path: Path):
        phase = trace.begin_phase("assets")
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)
        trace.end_phase(phase.id)

        path = trace.persist()
        assert path is not None
        assert path.exists()

        data = json.loads(path.read_text())
        assert data["pipeline"] == "test-pipeline"
        assert len(data["spans"]) == 2  # 1 phase + 1 tool
        assert data["metrics"]["total_cost_usd"] == 0.04

    def test_to_dict(self, trace: ProductionTrace):
        phase = trace.begin_phase("ingest")
        trace.end_phase(phase.id)
        d = trace.to_dict()
        assert "production_id" in d
        assert "spans" in d
        assert "violations" in d
        assert "metrics" in d

    def test_manual_violation(self, trace: ProductionTrace):
        v = trace.record_violation(
            ViolationType.GATE_SKIPPED, "compose", "User gate was bypassed"
        )
        assert v.type == ViolationType.GATE_SKIPPED
        assert trace.has_errors is False  # "warning" severity by default


# ═══════════════════════════════════════════════════════════════════════
# TracedDispatcher Tests
# ═══════════════════════════════════════════════════════════════════════

class TestTracedDispatcher:
    @pytest.fixture
    def dispatcher(self, registry: ToolRegistry, trace: ProductionTrace,
                   assets_contract: PhaseContract) -> TracedDispatcher:
        trace.set_contract("assets", assets_contract)
        phase = trace.begin_phase("assets")
        d = TracedDispatcher(registry, trace, block_forbidden=True)
        d.set_phase("assets", phase.id)
        return d

    def test_execute_allowed_tool(self, dispatcher: TracedDispatcher):
        result = asyncio.get_event_loop().run_until_complete(
            dispatcher.execute("foundry_image_gen", prompt="test")
        )
        assert result.success
        assert result.cost_usd == 0.04

    def test_execute_records_in_trace(self, dispatcher: TracedDispatcher, trace: ProductionTrace):
        asyncio.get_event_loop().run_until_complete(
            dispatcher.execute("foundry_image_gen", prompt="test")
        )
        tools = trace.tool_spans()
        assert len(tools) == 1
        assert tools[0].name == "foundry_image_gen"

    def test_forbidden_tool_blocked(self, dispatcher: TracedDispatcher):
        with pytest.raises(GovernanceError) as exc_info:
            asyncio.get_event_loop().run_until_complete(
                dispatcher.execute("hyperframes_render")
            )
        assert exc_info.value.violation_type == ViolationType.FORBIDDEN_TOOL

    def test_forbidden_tool_non_blocking(self, registry: ToolRegistry, trace: ProductionTrace,
                                          assets_contract: PhaseContract):
        trace.set_contract("assets", assets_contract)
        phase = trace.begin_phase("assets")
        d = TracedDispatcher(registry, trace, block_forbidden=False)
        d.set_phase("assets", phase.id)

        result = asyncio.get_event_loop().run_until_complete(
            d.execute("hyperframes_render")
        )
        # Doesn't raise, but still records violation
        assert result.success
        assert len(trace.violations) >= 1

    def test_tool_not_found(self, dispatcher: TracedDispatcher):
        result = asyncio.get_event_loop().run_until_complete(
            dispatcher.execute("nonexistent_tool")
        )
        assert not result.success
        assert "not found" in result.error

    def test_execute_with_fallback(self, registry: ToolRegistry, trace: ProductionTrace):
        phase = trace.begin_phase("test")
        d = TracedDispatcher(registry, trace)
        d.set_phase("test", phase.id)

        result = asyncio.get_event_loop().run_until_complete(
            d.execute_with_fallback("failing_tool")
        )
        # Should fall back to foundry_image_gen
        assert result.success

    def test_clear_phase(self, dispatcher: TracedDispatcher):
        dispatcher.clear_phase()
        assert dispatcher.current_phase is None


# ═══════════════════════════════════════════════════════════════════════
# PhaseContract Tests (YAML loading)
# ═══════════════════════════════════════════════════════════════════════

class TestPhaseContracts:
    def test_from_dict(self):
        c = PhaseContract.from_dict({
            "tools_allowed": ["a", "b"],
            "tools_required": ["a"],
            "tools_forbidden": ["c"],
            "skills_required": ["core/x"],
            "max_cost": 5.0,
            "max_duration": 300,
        })
        assert c.tools_allowed == ["a", "b"]
        assert c.tools_required == ["a"]
        assert c.tools_forbidden == ["c"]
        assert c.skills_required == ["core/x"]
        assert c.max_cost == 5.0

    def test_real_pipeline_yaml_carries_skills_required(self):
        """Skipped — pipeline_defs/ removed in agentic refactor.

        Skill governance now flows through tool.agent_skills introspection
        and director skills. PhaseContract is still used by ProductionTrace
        to record per-phase tool/skill governance.
        """
        pytest.skip("pipeline_defs removed in agentic refactor")

    def test_empty_contract(self):
        c = PhaseContract.from_dict({})
        assert c.tools_allowed == []
        assert c.tools_required == []
        assert c.max_cost is None

    def test_pipeline_yaml_loads_contracts(self, tmp_path: Path):
        pytest.skip("pipeline_defs removed in agentic refactor; PhaseContract.from_dict covered above")

    def test_pipeline_phase_contracts_method(self, tmp_path: Path):
        pytest.skip("pipeline_defs removed in agentic refactor; PhaseContract.from_dict covered above")


# ═══════════════════════════════════════════════════════════════════════
# ArtifactStore Tests
# ═══════════════════════════════════════════════════════════════════════

class TestArtifactStore:
    @pytest.fixture
    def store(self, tmp_path: Path) -> ArtifactStore:
        return ArtifactStore(tmp_path / "output")

    def test_save_and_load(self, store: ArtifactStore):
        store.save_stage_artifact("ingest", {"creative_brief": "Make a video about AI"})
        loaded = store.load_stage_artifact("ingest")
        assert loaded is not None
        assert loaded["creative_brief"] == "Make a video about AI"

    def test_versioning(self, store: ArtifactStore):
        store.save_stage_artifact("script", {"v": 1})
        store.save_stage_artifact("script", {"v": 2})
        loaded = store.load_stage_artifact("script")
        assert loaded["v"] == 2

    def test_finalize(self, store: ArtifactStore):
        store.save_stage_artifact("ingest", {"brief": "test"})
        store.finalize_stage_artifact("ingest")

        path = store.stage_dir / "ingest.json"
        data = json.loads(path.read_text())
        assert data["versions"][-1]["status"] == "final"

    def test_superseded_on_new_version(self, store: ArtifactStore):
        store.save_stage_artifact("script", {"v": 1})
        store.save_stage_artifact("script", {"v": 2})

        path = store.stage_dir / "script.json"
        data = json.loads(path.read_text())
        assert data["versions"][0]["status"] == "superseded"
        assert data["versions"][1]["status"] == "draft"

    def test_save_review(self, store: ArtifactStore):
        store.save_review("script", {
            "scores": {"content_accuracy": 3, "pacing": 2},
            "passed": True,
        })
        loaded = store.load_review("script")
        assert loaded is not None
        assert loaded["passed"] is True

    def test_manifest(self, store: ArtifactStore):
        store.save_stage_artifact("ingest", {"brief": "test"})
        store.save_review("final", {"scores": {}, "passed": True})

        m = store.manifest()
        assert m["artifact_count"] == 2
        assert "ingest" in m["artifacts"]
        assert "final_review" in m["artifacts"]

    def test_list_artifacts(self, store: ArtifactStore):
        store.save_stage_artifact("ingest", {})
        store.save_stage_artifact("script", {})
        assert store.list_artifacts() == ["ingest", "script"]

    def test_load_nonexistent(self, store: ArtifactStore):
        assert store.load_stage_artifact("nonexistent") is None
        assert store.load_review("nonexistent") is None

    def test_file_persistence(self, store: ArtifactStore):
        store.save_stage_artifact("ingest", {"brief": "test"})
        assert (store.stage_dir / "ingest.json").exists()

        store.save_review("final", {"scores": {}})
        assert (store.review_dir / "final_review.json").exists()


# ═══════════════════════════════════════════════════════════════════════
# GovernancePolicy Tests
# ═══════════════════════════════════════════════════════════════════════

class TestGovernancePolicy:
    def test_defaults(self):
        policy = GovernancePolicy()
        assert policy.hard_budget_cap == 100.0
        assert policy.require_hitl_gates is True
        assert policy.require_independent_review is True
        assert policy.content_safety.enabled is True
        assert len(policy.review.dimensions) == 6

    def test_load_from_yaml(self, tmp_path: Path):
        yaml_data = {
            "governance": {
                "hard_budget_cap": 50.0,
                "require_hitl_gates": False,
                "require_independent_review": True,
                "max_retries_per_stage": 5,
                "max_production_duration": 3600,
            },
            "content_safety": {
                "enabled": True,
                "blocked_categories": ["violence"],
                "check_generated_assets": False,
            },
            "providers": {
                "forbidden_providers": ["external_provider"],
                "preferred_providers": ["azure_foundry"],
                "data_residency": "eu",
            },
            "audit": {
                "persist_after_phase": True,
                "include_hashes": False,
                "retention_days": 30,
            },
            "review": {
                "dimensions": ["pacing", "content_accuracy"],
                "min_dimension_score": 1,
                "min_total_score": 4,
            },
        }
        p = tmp_path / "governance-policy.yaml"
        with open(p, "w") as f:
            yaml.dump(yaml_data, f)

        policy = GovernancePolicy.load(p)
        assert policy.hard_budget_cap == 50.0
        assert policy.require_hitl_gates is False
        assert policy.max_retries_per_stage == 5
        assert policy.content_safety.blocked_categories == ["violence"]
        assert policy.providers.forbidden_providers == ["external_provider"]
        assert policy.providers.data_residency == "eu"
        assert policy.audit.retention_days == 30
        assert policy.review.dimensions == ["pacing", "content_accuracy"]
        assert policy.review.min_total_score == 4

    def test_load_missing_file_returns_defaults(self):
        policy = GovernancePolicy.load("nonexistent.yaml")
        assert policy.hard_budget_cap == 100.0

    def test_to_dict(self):
        policy = GovernancePolicy()
        d = policy.to_dict()
        assert d["hard_budget_cap"] == 100.0
        assert "content_safety" in d
        assert "providers" in d
        assert "audit" in d
        assert "review" in d

    def test_load_actual_config(self):
        """Load the real governance-policy.yaml from the repo."""
        path = Path("config/org/governance-policy.yaml")
        if path.exists():
            policy = GovernancePolicy.load(path)
            assert policy.hard_budget_cap == 100.0
            assert policy.require_independent_review is True


# ═══════════════════════════════════════════════════════════════════════
# ReviewerAgent Tests
# ═══════════════════════════════════════════════════════════════════════

class TestReviewerAgent:
    @pytest.fixture
    def reviewer(self) -> ReviewerAgent:
        return ReviewerAgent(min_dimension_score=2, min_total_score=14)

    def test_build_review_context(self, reviewer: ReviewerAgent):
        ctx = reviewer.build_review_context(
            review_type=ReviewType.FINAL,
            artifacts={"script": "Hello world"},
            trace_metrics={"total_cost_usd": 1.50},
        )
        assert ctx["review_type"] == "final"
        assert len(ctx["dimensions"]) == 6
        assert ctx["min_total_score"] == 14
        assert "scoring_rubric" in ctx

    def test_build_script_review_context(self, reviewer: ReviewerAgent):
        ctx = reviewer.build_review_context(
            review_type=ReviewType.SCRIPT,
            artifacts={"script": "test"},
        )
        assert ctx["dimensions"] == ["content_accuracy", "pacing"]

    def test_create_report_passes(self, reviewer: ReviewerAgent):
        scores = {
            "brand_compliance": 3,
            "caption_accuracy": 3,
            "audio_quality": 2,
            "visual_consistency": 3,
            "pacing": 2,
            "content_accuracy": 3,
        }
        report = reviewer.create_report(ReviewType.FINAL, scores)
        assert report.passed is True
        assert report.total_score == 16
        assert report.max_score == 18

    def test_create_report_fails_low_score(self, reviewer: ReviewerAgent):
        scores = {
            "brand_compliance": 1,
            "caption_accuracy": 1,
            "audio_quality": 1,
            "visual_consistency": 1,
            "pacing": 1,
            "content_accuracy": 1,
        }
        report = reviewer.create_report(ReviewType.FINAL, scores)
        assert report.passed is False

    def test_create_report_fails_with_blocker(self, reviewer: ReviewerAgent):
        scores = {
            "brand_compliance": 3,
            "caption_accuracy": 3,
            "audio_quality": 3,
            "visual_consistency": 3,
            "pacing": 3,
            "content_accuracy": 3,
        }
        findings = [
            ReviewFinding.create(
                "content_safety", "Inappropriate content detected",
                severity=FindingSeverity.BLOCKER,
            )
        ]
        report = reviewer.create_report(ReviewType.FINAL, scores, findings=findings)
        assert report.passed is False
        assert len(report.blockers) == 1

    def test_finding_routing(self):
        f1 = ReviewFinding.create("factual_error", "Wrong date mentioned")
        assert f1.owner == RevisionOwner.SCRIPT

        f2 = ReviewFinding.create("brand_color", "Wrong blue shade")
        assert f2.owner == RevisionOwner.ASSETS

        f3 = ReviewFinding.create("timing_issue", "Scene 3 too long")
        assert f3.owner == RevisionOwner.COMPOSE

        f4 = ReviewFinding.create("content_safety", "Blocked content")
        assert f4.owner == RevisionOwner.HUMAN

    def test_route_findings(self, reviewer: ReviewerAgent):
        findings = [
            ReviewFinding.create("factual_error", "Wrong date"),
            ReviewFinding.create("brand_color", "Wrong blue"),
            ReviewFinding.create("timing_issue", "Too long"),
            ReviewFinding.create("content_safety", "Blocked"),
        ]
        report = reviewer.create_report(
            ReviewType.FINAL,
            scores={"brand_compliance": 2, "pacing": 2},
            findings=findings,
        )
        routed = report.route_findings()
        assert "script" in routed
        assert "assets" in routed
        assert "compose" in routed
        assert "human" in routed

    def test_parse_agent_response(self, reviewer: ReviewerAgent):
        response = {
            "scores": {"content_accuracy": 3, "pacing": 2},
            "findings": [
                {
                    "category": "factual_error",
                    "description": "Wrong year",
                    "severity": "warning",
                }
            ],
            "summary": "Good script with minor issue",
        }
        report = reviewer.parse_agent_response(ReviewType.SCRIPT, response)
        assert report.total_score == 5
        assert len(report.findings) == 1
        assert report.findings[0].owner == RevisionOwner.SCRIPT

    def test_report_to_dict(self, reviewer: ReviewerAgent):
        scores = {"brand_compliance": 3, "pacing": 2}
        findings = [ReviewFinding.create("timing_issue", "Too slow")]
        report = reviewer.create_report(ReviewType.FINAL, scores, findings)
        d = report.to_dict()
        assert d["review_type"] == "final"
        assert d["total_score"] == 5
        assert d["blockers"] == 0
        assert d["warnings"] == 0
        assert "routed_findings" in d


# ═══════════════════════════════════════════════════════════════════════
# Integration: ProductionTrace + Pipeline phase_contracts()
# ═══════════════════════════════════════════════════════════════════════

class TestIntegration:
    def test_pipeline_contracts_to_trace(self, tmp_path: Path):
        """Contract-driven enforcement: PhaseContract → ProductionTrace → violations.

        Builds contracts directly via PhaseContract.from_dict (no longer
        loaded from pipeline YAML — agent now drives phases and contracts
        directly).
        """
        contracts = {
            "assets": {
                "tools_allowed": ["foundry_image_gen", "cost_tracker"],
                "tools_required": ["cost_tracker"],
                "tools_forbidden": ["hyperframes_render"],
                "max_cost": 1.0,
            },
        }

        trace = ProductionTrace(
            output_dir=tmp_path / "output",
            pipeline_name="integration-test",
        )

        # Register contracts
        for stage_name, contract_data in contracts.items():
            trace.set_contract(stage_name, PhaseContract.from_dict(contract_data))

        # Run the "assets" phase
        phase = trace.begin_phase("assets")

        # Allowed tool — no violation
        trace.trace_tool("foundry_image_gen", phase.id, cost_usd=0.04)
        assert len(trace.violations) == 0

        # Forbidden tool — violation (both forbidden + not-in-allowed-list)
        trace.trace_tool("hyperframes_render", phase.id)
        assert len(trace.violations) == 2

        # End without calling required tool (cost_tracker) — another violation
        violations = trace.end_phase(phase.id)
        assert any(v.type == ViolationType.MISSING_REQUIRED_TOOL for v in violations)

        # Verify persistence
        path = trace.persist()
        assert path.exists()
        data_out = json.loads(path.read_text())
        assert len(data_out["violations"]) >= 3  # forbidden + not-in-allowed + missing-required

    def test_full_governed_production(self, registry: ToolRegistry, tmp_path: Path):
        """Simulate a full governed production run: trace + dispatcher + reviewer."""
        trace = ProductionTrace(
            output_dir=tmp_path / "output",
            pipeline_name="full-gov-test",
            hard_budget_cap=10.0,
        )

        # Set up assets phase contract
        contract = PhaseContract(
            tools_allowed=["foundry_image_gen", "foundry_tts", "cost_tracker"],
            tools_required=["cost_tracker"],
            tools_forbidden=["hyperframes_render"],
            max_cost=5.0,
        )

        # Begin assets phase
        phase = trace.begin_phase("assets", contract=contract)

        # Use dispatcher
        dispatcher = TracedDispatcher(registry, trace, block_forbidden=True)
        dispatcher.set_phase("assets", phase.id)

        # Execute tools through dispatcher
        r1 = asyncio.get_event_loop().run_until_complete(
            dispatcher.execute("foundry_image_gen", prompt="A modern office")
        )
        assert r1.success

        r2 = asyncio.get_event_loop().run_until_complete(
            dispatcher.execute("foundry_tts", text="Welcome to our product")
        )
        assert r2.success

        r3 = asyncio.get_event_loop().run_until_complete(
            dispatcher.execute("cost_tracker")
        )
        assert r3.success

        # Forbidden tool should be blocked
        with pytest.raises(GovernanceError):
            asyncio.get_event_loop().run_until_complete(
                dispatcher.execute("hyperframes_render")
            )

        # End phase — should pass (required tool was called)
        violations = trace.end_phase(phase.id)
        assert violations == []

        # Run reviewer
        reviewer = ReviewerAgent(min_dimension_score=2, min_total_score=14)
        scores = {
            "brand_compliance": 3,
            "caption_accuracy": 3,
            "audio_quality": 2,
            "visual_consistency": 3,
            "pacing": 2,
            "content_accuracy": 3,
        }
        report = reviewer.create_report(ReviewType.FINAL, scores)
        assert report.passed

        # Record review in trace
        trace.record_review("final", scores)

        # Persist
        path = trace.persist()
        assert path.exists()

        # Verify metrics
        m = trace.metrics()
        assert m["total_tool_calls"] == 3  # image, tts, cost_tracker
        assert m["total_violations"] == 0


class TestGovernanceContext:
    """Tests for the high-level GovernanceContext integration wrapper."""

    def test_init_with_policy(self, tmp_path: Path):
        """GovernanceContext initializes with policy from YAML."""
        from slate.core.governance_context import GovernanceContext

        # Write a minimal policy file matching the expected YAML structure
        policy = {"governance": {"hard_budget_cap": 15.0}}
        policy_file = tmp_path / "policy.yaml"
        policy_file.write_text(yaml.dump(policy))

        ctx = GovernanceContext(
            output_dir=str(tmp_path / "out"),
            policy_path=str(policy_file),
        )
        assert ctx.policy.hard_budget_cap == 15.0
        assert ctx.trace is not None
        assert ctx.artifacts is not None

    def test_init_defaults(self, tmp_path: Path):
        """GovernanceContext works with default policy."""
        from slate.core.governance_context import GovernanceContext

        ctx = GovernanceContext(output_dir=str(tmp_path / "out"))
        assert ctx.policy.hard_budget_cap == 100.0  # default from GovernancePolicy

    def test_phase_lifecycle(self, tmp_path: Path):
        """begin_phase/end_phase creates trace spans."""
        from slate.core.governance_context import GovernanceContext

        ctx = GovernanceContext(output_dir=str(tmp_path / "out"))
        span_id = ctx.begin_phase("assets")
        assert span_id  # non-empty string
        ctx.record_tool("foundry_image_gen", "assets", cost=0.04)
        violations = ctx.end_phase("assets")
        assert isinstance(violations, list)

    def test_budget_check(self, tmp_path: Path):
        """check_budget reports cost vs policy cap."""
        from slate.core.governance_context import GovernanceContext

        ctx = GovernanceContext(output_dir=str(tmp_path / "out"))
        ctx.begin_phase("assets")
        ctx.record_tool("tool1", "assets", cost=1.50)
        budget = ctx.check_budget()
        assert budget["total_cost"] == 1.50
        assert budget["remaining"] == 98.50
        assert not budget["exceeded"]

    def test_finalize_persists(self, tmp_path: Path):
        """finalize() writes trace + governance_summary.json."""
        from slate.core.governance_context import GovernanceContext

        out = tmp_path / "out"
        ctx = GovernanceContext(output_dir=str(out))
        ctx.begin_phase("test")
        ctx.record_tool("tool_a", "test", cost=0.10)
        ctx.end_phase("test")

        summary = ctx.finalize()
        assert summary["governance"] is True
        assert summary["violation_count"] == 0
        assert (out / "governance_summary.json").exists()
        assert (out / "production_trace.json").exists()

    def test_record_gate(self, tmp_path: Path):
        """record_gate creates gate spans in trace."""
        from slate.core.governance_context import GovernanceContext

        ctx = GovernanceContext(output_dir=str(tmp_path / "out"))
        ctx.record_gate("scene_plan", approved=True)
        ctx.record_gate("asset_review", approved=False)
        gate_spans = [s for s in ctx.trace._spans if s.kind.value == "gate"]
        assert len(gate_spans) == 2
