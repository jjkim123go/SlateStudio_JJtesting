"""Eval Harness — Automated governance scoring for Slate productions.

Reads a production trace (projects/<slug>/trace.json) and evaluates it
against the governance policy and phase contracts. Produces a structured
EvalReport with pass/fail verdict, dimension scores, and violation details.

Usage (Python):
    from slate.core.eval_harness import EvalHarness
    report = EvalHarness.evaluate("projects/<slug>/trace.json",
                                   policy_path="config/org/governance-policy.yaml")
    print(report.verdict)  # "PASS" or "FAIL"

Usage (CLI):
    python -m slate.core.eval_harness projects/<slug>/trace.json
"""

from __future__ import annotations

import json
import logging
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from slate.core.budget import DEFAULT_PROJECT_BUDGET_USD

logger = logging.getLogger(__name__)


# ─── Scoring Dimensions ─────────────────────────────────────────────

DIMENSIONS = [
    "budget_compliance",
    "tool_governance",
    "stage_completeness",
    "gate_compliance",
    "duration_compliance",
    "violation_severity",
]

MAX_SCORE_PER_DIM = 3  # 1=fail, 2=warning, 3=pass


@dataclass
class DimensionScore:
    """Score for a single evaluation dimension."""
    name: str
    score: int = 3            # 1-3
    max_score: int = 3
    details: str = ""
    violations: list[str] = field(default_factory=list)


@dataclass
class EvalReport:
    """Complete evaluation report for a production trace."""
    trace_path: str
    verdict: str = "PASS"      # "PASS" or "FAIL"
    total_score: int = 0
    max_score: int = 0
    dimensions: list[DimensionScore] = field(default_factory=list)
    violation_count: int = 0
    phase_count: int = 0
    tool_call_count: int = 0
    total_cost_usd: float = 0.0
    budget_cap_usd: float = 0.0
    warnings: list[str] = field(default_factory=list)

    @property
    def score_pct(self) -> float:
        return (self.total_score / self.max_score * 100) if self.max_score > 0 else 0.0

    def summary(self) -> str:
        """Human-readable summary."""
        lines = [
            f"{'='*60}",
            f"  SLATE GOVERNANCE EVAL — {self.verdict}",
            f"{'='*60}",
            f"  Score: {self.total_score}/{self.max_score} ({self.score_pct:.0f}%)",
            f"  Phases: {self.phase_count} | Tools: {self.tool_call_count} | Violations: {self.violation_count}",
            f"  Cost: ${self.total_cost_usd:.4f} / ${self.budget_cap_usd:.2f} cap",
            f"{'─'*60}",
        ]
        for dim in self.dimensions:
            icon = "✅" if dim.score == 3 else ("⚠️" if dim.score == 2 else "❌")
            lines.append(f"  {icon} {dim.name}: {dim.score}/{dim.max_score} — {dim.details}")
            for v in dim.violations:
                lines.append(f"      └─ {v}")
        if self.warnings:
            lines.append(f"{'─'*60}")
            for w in self.warnings:
                lines.append(f"  ⚠️  {w}")
        lines.append(f"{'='*60}")
        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict,
            "total_score": self.total_score,
            "max_score": self.max_score,
            "score_pct": round(self.score_pct, 1),
            "violation_count": self.violation_count,
            "phase_count": self.phase_count,
            "tool_call_count": self.tool_call_count,
            "total_cost_usd": self.total_cost_usd,
            "budget_cap_usd": self.budget_cap_usd,
            "dimensions": [
                {"name": d.name, "score": d.score, "details": d.details, "violations": d.violations}
                for d in self.dimensions
            ],
            "warnings": self.warnings,
        }


class EvalHarness:
    """Evaluate a production trace against governance policy.

    The harness reads a serialized ProductionTrace JSON and scores it
    across 6 dimensions. Each dimension is scored 1-3:
      3 = compliant (no issues)
      2 = minor issues (warnings but not blocking)
      1 = non-compliant (violations that should block production)

    Verdict is FAIL if any dimension scores 1 or total < 67%.
    """

    @staticmethod
    def evaluate(
        trace_path: str | Path,
        policy_path: str | Path | None = None,
        budget_cap: float | None = None,
    ) -> EvalReport:
        """Run evaluation on a production trace.

        Args:
            trace_path: Path to production_trace.json
            policy_path: Path to governance-policy.yaml (optional)
            budget_cap: Override hard budget cap (default: from policy or $100)
        """
        trace_path = Path(trace_path)
        if not trace_path.exists():
            raise FileNotFoundError(f"Trace file not found: {trace_path}")

        with open(trace_path, "r", encoding="utf-8") as f:
            trace_data = json.load(f)

        # Load policy if provided
        effective_budget = budget_cap or DEFAULT_PROJECT_BUDGET_USD
        if policy_path:
            policy_path = Path(policy_path)
            if policy_path.exists():
                import yaml
                with open(policy_path, "r", encoding="utf-8") as f:
                    policy_data = yaml.safe_load(f)
                gov = policy_data.get("governance", {})
                effective_budget = budget_cap or gov.get("hard_budget_cap", DEFAULT_PROJECT_BUDGET_USD)

        # Extract trace data
        spans = trace_data.get("spans", [])
        violations = trace_data.get("violations", [])
        metrics = trace_data.get("metrics", {})
        gates = trace_data.get("gates", [])

        total_cost = metrics.get("total_cost_usd", 0.0)
        phase_spans = [s for s in spans if s.get("parent_id") is None or s.get("span_type") == "phase"]
        tool_spans = [s for s in spans if s.get("parent_id") is not None and s.get("span_type") != "phase"]

        # If no phase markers, count top-level spans as phases
        if not phase_spans:
            phase_spans = [s for s in spans if not s.get("parent_id")]
        if not tool_spans:
            tool_spans = [s for s in spans if s.get("parent_id")]

        report = EvalReport(
            trace_path=str(trace_path),
            phase_count=len(phase_spans),
            tool_call_count=len(tool_spans),
            total_cost_usd=total_cost,
            budget_cap_usd=effective_budget,
            violation_count=len(violations),
        )

        # ── Dimension 1: Budget Compliance ──
        budget_dim = _score_budget(total_cost, effective_budget, violations)
        report.dimensions.append(budget_dim)

        # ── Dimension 2: Tool Governance ──
        tool_dim = _score_tool_governance(violations)
        report.dimensions.append(tool_dim)

        # ── Dimension 3: Stage Completeness ──
        stage_dim = _score_stage_completeness(phase_spans, violations)
        report.dimensions.append(stage_dim)

        # ── Dimension 4: Gate Compliance ──
        gate_dim = _score_gate_compliance(gates, violations)
        report.dimensions.append(gate_dim)

        # ── Dimension 5: Duration Compliance ──
        duration_dim = _score_duration_compliance(phase_spans, violations)
        report.dimensions.append(duration_dim)

        # ── Dimension 6: Violation Severity ──
        severity_dim = _score_violation_severity(violations)
        report.dimensions.append(severity_dim)

        # ── Compute verdict ──
        report.total_score = sum(d.score for d in report.dimensions)
        report.max_score = sum(d.max_score for d in report.dimensions)

        has_critical = any(d.score == 1 for d in report.dimensions)
        if has_critical or report.score_pct < 67:
            report.verdict = "FAIL"
        else:
            report.verdict = "PASS"

        # Warnings
        if report.phase_count == 0:
            report.warnings.append("No phases found in trace — was governance enabled?")
        if report.tool_call_count == 0:
            report.warnings.append("No tool calls recorded in trace")

        return report


# ─── Scoring Functions ───────────────────────────────────────────────

def _score_budget(cost: float, cap: float, violations: list[dict]) -> DimensionScore:
    """Score budget compliance."""
    budget_violations = [v for v in violations if "BUDGET" in v.get("violation_type", "")]
    ratio = cost / cap if cap > 0 else 0

    if budget_violations or ratio > 1.0:
        return DimensionScore(
            name="budget_compliance",
            score=1,
            details=f"Over budget: ${cost:.4f} / ${cap:.2f} ({ratio:.0%})",
            violations=[v.get("message", str(v)) for v in budget_violations],
        )
    elif ratio > 0.8:
        return DimensionScore(
            name="budget_compliance",
            score=2,
            details=f"Near budget limit: ${cost:.4f} / ${cap:.2f} ({ratio:.0%})",
        )
    else:
        return DimensionScore(
            name="budget_compliance",
            score=3,
            details=f"Within budget: ${cost:.4f} / ${cap:.2f} ({ratio:.0%})",
        )


def _score_tool_governance(violations: list[dict]) -> DimensionScore:
    """Score tool usage governance."""
    tool_violations = [
        v for v in violations
        if v.get("violation_type", "") in ("FORBIDDEN_TOOL", "MISSING_REQUIRED_TOOL")
    ]
    if len(tool_violations) > 2:
        return DimensionScore(
            name="tool_governance",
            score=1,
            details=f"{len(tool_violations)} tool governance violations",
            violations=[v.get("message", str(v)) for v in tool_violations],
        )
    elif tool_violations:
        return DimensionScore(
            name="tool_governance",
            score=2,
            details=f"{len(tool_violations)} minor tool violation(s)",
            violations=[v.get("message", str(v)) for v in tool_violations],
        )
    return DimensionScore(
        name="tool_governance",
        score=3,
        details="All tool usage within policy",
    )


def _score_stage_completeness(phases: list[dict], violations: list[dict]) -> DimensionScore:
    """Score whether all required stages were completed."""
    missing = [v for v in violations if "MISSING_REQUIRED" in v.get("violation_type", "")]
    if not phases:
        return DimensionScore(
            name="stage_completeness",
            score=2,
            details="No phase data — cannot verify completeness",
        )
    completed = [p for p in phases if p.get("end_time")]
    if missing:
        return DimensionScore(
            name="stage_completeness",
            score=1,
            details=f"{len(completed)}/{len(phases)} phases complete, {len(missing)} missing required tools",
            violations=[v.get("message", str(v)) for v in missing],
        )
    if len(completed) < len(phases):
        return DimensionScore(
            name="stage_completeness",
            score=2,
            details=f"{len(completed)}/{len(phases)} phases complete",
        )
    return DimensionScore(
        name="stage_completeness",
        score=3,
        details=f"All {len(phases)} phases complete",
    )


def _score_gate_compliance(gates: list[dict], violations: list[dict]) -> DimensionScore:
    """Score gate/checkpoint compliance."""
    gate_violations = [v for v in violations if "GATE" in v.get("violation_type", "")]
    if gate_violations:
        return DimensionScore(
            name="gate_compliance",
            score=1,
            details=f"{len(gate_violations)} gate violation(s) — checkpoints skipped",
            violations=[v.get("message", str(v)) for v in gate_violations],
        )
    if not gates:
        return DimensionScore(
            name="gate_compliance",
            score=2,
            details="No gate records found — checkpoints may not be instrumented",
        )
    approved = [g for g in gates if g.get("approved") or g.get("gate_type") == "approved"]
    return DimensionScore(
        name="gate_compliance",
        score=3,
        details=f"All {len(gates)} gates recorded ({len(approved)} approved)",
    )


def _score_duration_compliance(phases: list[dict], violations: list[dict]) -> DimensionScore:
    """Score stage duration compliance."""
    duration_violations = [v for v in violations if "DURATION" in v.get("violation_type", "")]
    if duration_violations:
        return DimensionScore(
            name="duration_compliance",
            score=1,
            details=f"{len(duration_violations)} stage(s) exceeded duration limit",
            violations=[v.get("message", str(v)) for v in duration_violations],
        )
    return DimensionScore(
        name="duration_compliance",
        score=3,
        details="All phases within duration limits",
    )


def _score_violation_severity(violations: list[dict]) -> DimensionScore:
    """Overall violation severity score."""
    if not violations:
        return DimensionScore(
            name="violation_severity",
            score=3,
            details="No violations recorded",
        )
    # Count by type
    types: dict[str, int] = {}
    for v in violations:
        vtype = v.get("violation_type", "UNKNOWN")
        types[vtype] = types.get(vtype, 0) + 1

    critical_types = {"FORBIDDEN_TOOL", "BUDGET_EXCEEDED", "GATE_SKIPPED"}
    has_critical = any(t in critical_types for t in types)

    if has_critical:
        return DimensionScore(
            name="violation_severity",
            score=1,
            details=f"{len(violations)} violations ({len(types)} types), includes critical",
            violations=[f"{t}: {c}" for t, c in types.items()],
        )
    elif len(violations) > 5:
        return DimensionScore(
            name="violation_severity",
            score=2,
            details=f"{len(violations)} violations ({len(types)} types)",
            violations=[f"{t}: {c}" for t, c in types.items()],
        )
    return DimensionScore(
        name="violation_severity",
        score=2,
        details=f"{len(violations)} minor violation(s)",
        violations=[f"{t}: {c}" for t, c in types.items()],
    )


# ─── CLI Entry Point ─────────────────────────────────────────────────

def main() -> None:
    """CLI entry point: python -m slate.core.eval_harness <trace.json> [--policy <path>]"""
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print("Usage: python -m slate.core.eval_harness <production_trace.json> [--policy <path>]")
        sys.exit(0)

    trace_path = args[0]
    policy_path = None
    for i, a in enumerate(args):
        if a == "--policy" and i + 1 < len(args):
            policy_path = args[i + 1]

    report = EvalHarness.evaluate(trace_path, policy_path=policy_path)
    print(report.summary())

    # Write JSON report alongside trace
    report_path = Path(trace_path).with_suffix(".eval.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report.to_dict(), f, indent=2)
    print(f"\nReport written to: {report_path}")

    sys.exit(0 if report.verdict == "PASS" else 1)


if __name__ == "__main__":
    main()
