"""GovernanceContext — Wires governance infrastructure into production.

Provides a high-level context manager that initializes ProductionTrace,
GovernancePolicy, and ArtifactStore, and exposes helpers for the render
pipeline to record phase boundaries, tool invocations, and reviews.

Usage:
    ctx = GovernanceContext(output_dir="output/", policy_path="config/org/governance-policy.yaml")
    ctx.begin_phase("assets", contract=...)
    ctx.record_tool("foundry_image_gen", cost=0.04)
    ctx.end_phase("assets")
    ctx.finalize()  # persists trace + summary
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from slate.core.artifact_store import ArtifactStore
from slate.core.governance_policy import GovernancePolicy
from slate.core.production_trace import PhaseContract, ProductionTrace

logger = logging.getLogger(__name__)


@dataclass
class GovernanceContext:
    """High-level governance wrapper for a single video production run.

    Backward-compatible: the render pipeline can check `if governance:`
    and skip all governance calls if it's None.
    """

    output_dir: str
    policy_path: str | None = None
    pipeline_contracts: dict[str, dict[str, Any]] = field(default_factory=dict)

    # Initialized in __post_init__
    trace: ProductionTrace = field(init=False)
    policy: GovernancePolicy = field(init=False)
    artifacts: ArtifactStore = field(init=False)
    _active_phases: dict[str, str] = field(init=False, default_factory=dict)

    def __post_init__(self) -> None:
        out = Path(self.output_dir)
        out.mkdir(parents=True, exist_ok=True)

        # Load policy
        if self.policy_path:
            self.policy = GovernancePolicy.load(self.policy_path)
        else:
            self.policy = GovernancePolicy()

        # Init trace with hard budget from policy
        self.trace = ProductionTrace(
            pipeline_name="slate-render",
            hard_budget_cap=self.policy.hard_budget_cap,
            output_dir=self.output_dir,
        )

        # Init artifact store
        self.artifacts = ArtifactStore(output_dir=self.output_dir)

        logger.info(
            "Governance context initialized (budget cap=$%.2f, output=%s)",
            self.policy.hard_budget_cap,
            self.output_dir,
        )

    def begin_phase(self, phase_name: str) -> str:
        """Start a traced phase. Returns the span ID."""
        contract_data = self.pipeline_contracts.get(phase_name, {})
        contract = PhaseContract.from_dict(contract_data) if contract_data else None
        span = self.trace.begin_phase(phase_name, contract=contract)
        self._active_phases[phase_name] = span.id
        return span.id

    def end_phase(self, phase_name: str) -> list[dict]:
        """End a traced phase. Returns any new violations as dicts."""
        phase_id = self._active_phases.pop(phase_name, None)
        if phase_id is None:
            return []
        violations_before = len(self.trace.violations)
        self.trace.end_phase(phase_id)
        new_violations = self.trace.violations[violations_before:]
        return [
            {"type": v.type.value, "phase": v.phase, "detail": v.detail, "severity": v.severity}
            for v in new_violations
        ]

    def record_tool(
        self,
        tool_name: str,
        phase_name: str | None = None,
        cost: float = 0.0,
        output_hash: str | None = None,
    ) -> None:
        """Record a tool invocation in the trace."""
        phase_id = self._active_phases.get(phase_name, "") if phase_name else ""
        if not phase_id:
            return
        metadata = {"output_hash": output_hash} if output_hash else None
        self.trace.trace_tool(tool_name, phase_id=phase_id, cost_usd=cost, metadata=metadata)

    def record_skill(self, skill_id: str, phase_name: str | None = None) -> None:
        """Record that the agent consulted a skill within a phase.

        ``skill_id`` is the path under ``skills/`` without extension, e.g.
        ``"core/component-authoring"`` or ``"core/animation/sequencing"`` —
        the same identifier the agent records when it consults a skill
        from ``skills/INDEX.md``.
        """
        phase_id = self._active_phases.get(phase_name or "", "")
        if not phase_id:
            return
        self.trace.record_skill_consultation(skill_id, phase_id=phase_id)

    def stage_blocked_by_skills(self, phase_name: str) -> list[dict]:
        """Return the list of MISSING_REQUIRED_SKILL violations for a phase
        when policy says they should block stage advancement.

        Caller (the orchestrator) decides whether to halt; this method just
        surfaces the policy verdict so callers don't have to reach into
        the trace internals.
        """
        if not self.policy.skills_enforcement.required:
            return []
        if self.policy.skills_enforcement.fail_action != "block_stage_advancement":
            return []
        from slate.core.production_trace import ViolationType
        return [
            {"type": v.type.value, "phase": v.phase, "detail": v.detail}
            for v in self.trace.violations
            if v.type == ViolationType.MISSING_REQUIRED_SKILL
            and v.phase == phase_name
        ]

    def record_gate(self, phase_name: str, approved: bool) -> None:
        """Record a HITL gate decision."""
        gate_type = "approved" if approved else "rejected"
        self.trace.record_gate(phase_name, gate_type=gate_type)

    def check_budget(self) -> dict:
        """Check current budget status against policy."""
        metrics = self.trace.metrics()
        total = metrics["total_cost_usd"]
        cap = self.policy.hard_budget_cap
        return {
            "total_cost": total,
            "hard_cap": cap,
            "remaining": round(cap - total, 4),
            "pct_used": (total / cap * 100) if cap > 0 else 0,
            "warn": total >= cap * 0.5,
            "exceeded": total >= cap,
        }

    def finalize(self) -> dict:
        """Finalize the governance context, persist trace, return summary."""
        self.trace.persist()

        metrics = self.trace.metrics()
        violations = [
            {"type": v.type.value, "phase": v.phase, "detail": v.detail}
            for v in self.trace.violations
        ]
        budget = self.check_budget()

        summary = {
            "governance": True,
            "metrics": metrics,
            "violations": violations,
            "violation_count": len(violations),
            "budget": budget,
            "trace_file": str(Path(self.output_dir) / "production_trace.json"),
            "policy_source": self.policy_path or "defaults",
        }

        # Write governance summary alongside trace
        summary_path = Path(self.output_dir) / "governance_summary.json"
        summary_path.write_text(json.dumps(summary, indent=2, default=str))
        logger.info(
            "Governance finalized: %d violations, $%.4f spent",
            len(violations),
            metrics["total_cost_usd"],
        )
        return summary
