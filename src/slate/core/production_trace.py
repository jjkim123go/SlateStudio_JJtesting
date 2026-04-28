"""ProductionTrace — Meta-observer for Slate video production pipelines.

Tracks every phase and tool invocation as spans in an append-only DAG.
Enforces phase contracts (allowed/required/forbidden tools), detects
governance violations (budget overruns, skipped gates, forbidden tools),
and persists a complete audit trail to JSON.

Inspired by the ScanTrace pattern from the security-red-team-agent project,
reimagined for video production governance.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class SpanKind(str, Enum):
    """Type of trace span."""
    PHASE = "phase"
    TOOL = "tool"
    REVIEW = "review"
    GATE = "gate"


class ViolationType(str, Enum):
    """Types of governance violations."""
    FORBIDDEN_TOOL = "forbidden_tool"
    MISSING_REQUIRED_TOOL = "missing_required_tool"
    MISSING_REQUIRED_SKILL = "missing_required_skill"
    BUDGET_EXCEEDED = "budget_exceeded"
    STAGE_BUDGET_EXCEEDED = "stage_budget_exceeded"
    DURATION_EXCEEDED = "duration_exceeded"
    GATE_SKIPPED = "gate_skipped"
    UNTRACED_EXECUTION = "untraced_execution"


class SpanStatus(str, Enum):
    """Status of a span."""
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Violation:
    """A governance violation detected during production."""
    type: ViolationType
    phase: str
    detail: str
    severity: str = "warning"  # warning | error | critical
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["type"] = self.type.value
        return d


@dataclass
class Span:
    """A single trace span — either a phase or a tool invocation."""
    id: str
    kind: SpanKind
    name: str
    parent_id: str | None = None
    status: SpanStatus = SpanStatus.ACTIVE
    started_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    ended_at: str | None = None
    duration_seconds: float = 0.0
    cost_usd: float = 0.0
    input_hash: str | None = None
    output_hash: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    violations: list[Violation] = field(default_factory=list)

    # Internal — not serialized
    _start_mono: float = field(default_factory=time.monotonic, repr=False)

    def end(self, status: SpanStatus = SpanStatus.COMPLETED) -> None:
        self.status = status
        self.ended_at = datetime.now(timezone.utc).isoformat()
        self.duration_seconds = round(time.monotonic() - self._start_mono, 3)

    def to_dict(self) -> dict[str, Any]:
        d = {
            "id": self.id,
            "kind": self.kind.value,
            "name": self.name,
            "parent_id": self.parent_id,
            "status": self.status.value,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "duration_seconds": self.duration_seconds,
            "cost_usd": self.cost_usd,
            "metadata": self.metadata,
            "violations": [v.to_dict() for v in self.violations],
        }
        if self.input_hash:
            d["input_hash"] = self.input_hash
        if self.output_hash:
            d["output_hash"] = self.output_hash
        return d


@dataclass
class PhaseContract:
    """Contract for what a pipeline phase is allowed/required to do."""
    tools_allowed: list[str] = field(default_factory=list)
    tools_required: list[str] = field(default_factory=list)
    tools_forbidden: list[str] = field(default_factory=list)
    skills_required: list[str] = field(default_factory=list)
    max_cost: float | None = None
    max_duration: float | None = None  # seconds
    gate_required: bool = False
    review_checkpoint: str | None = None  # script | asset | final

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PhaseContract:
        return cls(
            tools_allowed=data.get("tools_allowed", []),
            tools_required=data.get("tools_required", []),
            tools_forbidden=data.get("tools_forbidden", []),
            skills_required=data.get("skills_required", []),
            max_cost=data.get("max_cost"),
            max_duration=data.get("max_duration"),
            gate_required=data.get("gate_required", False),
            review_checkpoint=data.get("review_checkpoint"),
        )


class ProductionTrace:
    """Meta-observer that records and governs a video production run.

    Usage:
        trace = ProductionTrace(output_dir="output/")
        phase = trace.begin_phase("assets", contract=contract)
        trace.trace_tool("foundry_image_gen", phase_id=phase.id, cost=0.04)
        violations = trace.end_phase(phase.id)
        trace.persist()
    """

    def __init__(
        self,
        output_dir: str | Path | None = None,
        pipeline_name: str = "",
        hard_budget_cap: float | None = None,
    ):
        self.production_id = str(uuid.uuid4())[:12]
        self.pipeline_name = pipeline_name
        self.hard_budget_cap = hard_budget_cap
        self.output_dir = Path(output_dir) if output_dir else None

        self._spans: list[Span] = []
        self._violations: list[Violation] = []
        self._contracts: dict[str, PhaseContract] = {}
        self._phase_tools: dict[str, list[str]] = {}  # phase_id → [tool_names]
        self._phase_skills: dict[str, list[str]] = {}  # phase_id → [skill_ids]
        self._total_cost: float = 0.0
        self._started_at = datetime.now(timezone.utc).isoformat()

        if self.output_dir:
            self.output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(
            "ProductionTrace initialized (id=%s, pipeline=%s)",
            self.production_id, pipeline_name,
        )

    def set_contract(self, phase_name: str, contract: PhaseContract) -> None:
        """Register a phase contract."""
        self._contracts[phase_name] = contract

    def begin_phase(
        self,
        name: str,
        contract: PhaseContract | None = None,
    ) -> Span:
        """Start a new phase span. Returns the span for later reference."""
        if contract:
            self._contracts[name] = contract

        span = Span(
            id=f"phase-{name}-{uuid.uuid4().hex[:6]}",
            kind=SpanKind.PHASE,
            name=name,
        )
        self._spans.append(span)
        self._phase_tools[span.id] = []
        self._phase_skills[span.id] = []

        logger.info("Phase started: %s (span=%s)", name, span.id)
        return span

    def trace_tool(
        self,
        tool_name: str,
        phase_id: str,
        cost_usd: float = 0.0,
        input_data: Any = None,
        output_data: Any = None,
        metadata: dict[str, Any] | None = None,
    ) -> Span:
        """Record a tool invocation within a phase.

        Checks phase contract for forbidden tools and budget limits.
        Returns the tool span.
        """
        # Find the parent phase
        phase_span = self._get_span(phase_id)
        if phase_span is None:
            raise ValueError(f"Unknown phase span: {phase_id}")

        phase_name = phase_span.name
        contract = self._contracts.get(phase_name)

        # Check forbidden tools BEFORE execution
        if contract and tool_name in contract.tools_forbidden:
            violation = Violation(
                type=ViolationType.FORBIDDEN_TOOL,
                phase=phase_name,
                detail=f"Tool '{tool_name}' is forbidden in phase '{phase_name}'",
                severity="error",
            )
            self._violations.append(violation)
            phase_span.violations.append(violation)
            logger.warning("VIOLATION: %s", violation.detail)

        # Check allowed tools (if allowlist is specified, tool must be on it)
        if (
            contract
            and contract.tools_allowed
            and tool_name not in contract.tools_allowed
        ):
            violation = Violation(
                type=ViolationType.FORBIDDEN_TOOL,
                phase=phase_name,
                detail=f"Tool '{tool_name}' not in allowed list for phase '{phase_name}'",
                severity="warning",
            )
            self._violations.append(violation)
            phase_span.violations.append(violation)
            logger.warning("VIOLATION: %s", violation.detail)

        # Create tool span
        span = Span(
            id=f"tool-{tool_name}-{uuid.uuid4().hex[:6]}",
            kind=SpanKind.TOOL,
            name=tool_name,
            parent_id=phase_id,
            cost_usd=cost_usd,
            input_hash=_hash_data(input_data) if input_data else None,
            output_hash=_hash_data(output_data) if output_data else None,
            metadata=metadata or {},
        )
        span.end()
        self._spans.append(span)

        # Track tool usage for required-tools check
        self._phase_tools.setdefault(phase_id, []).append(tool_name)

        # Track cost
        self._total_cost += cost_usd
        phase_span.cost_usd += cost_usd

        # Check stage budget
        if contract and contract.max_cost and phase_span.cost_usd > contract.max_cost:
            violation = Violation(
                type=ViolationType.STAGE_BUDGET_EXCEEDED,
                phase=phase_name,
                detail=(
                    f"Phase '{phase_name}' cost ${phase_span.cost_usd:.4f} "
                    f"exceeds limit ${contract.max_cost:.2f}"
                ),
                severity="error",
            )
            if not any(
                v.type == ViolationType.STAGE_BUDGET_EXCEEDED
                and v.phase == phase_name
                for v in self._violations
            ):
                self._violations.append(violation)
                phase_span.violations.append(violation)
                logger.warning("VIOLATION: %s", violation.detail)

        # Check global budget
        if self.hard_budget_cap and self._total_cost > self.hard_budget_cap:
            violation = Violation(
                type=ViolationType.BUDGET_EXCEEDED,
                phase=phase_name,
                detail=(
                    f"Total cost ${self._total_cost:.4f} exceeds "
                    f"hard cap ${self.hard_budget_cap:.2f}"
                ),
                severity="critical",
            )
            if not any(
                v.type == ViolationType.BUDGET_EXCEEDED for v in self._violations
            ):
                self._violations.append(violation)
                phase_span.violations.append(violation)
                logger.warning("VIOLATION: %s", violation.detail)

        return span

    def end_phase(self, phase_id: str, status: SpanStatus = SpanStatus.COMPLETED) -> list[Violation]:
        """End a phase span. Checks required-tools contract. Returns violations found."""
        span = self._get_span(phase_id)
        if span is None:
            raise ValueError(f"Unknown phase span: {phase_id}")

        span.end(status)
        phase_name = span.name
        contract = self._contracts.get(phase_name)
        new_violations: list[Violation] = []

        # Stamp the consulted skills onto the phase span metadata so the
        # persisted trace records what the agent actually read.
        skills_consulted = list(self._phase_skills.get(phase_id, []))
        if skills_consulted:
            span.metadata["skills_consulted"] = skills_consulted

        # Check required tools were actually called
        if contract and contract.tools_required:
            tools_used = set(self._phase_tools.get(phase_id, []))
            for required_tool in contract.tools_required:
                if required_tool not in tools_used:
                    v = Violation(
                        type=ViolationType.MISSING_REQUIRED_TOOL,
                        phase=phase_name,
                        detail=f"Required tool '{required_tool}' was not called in phase '{phase_name}'",
                        severity="error",
                    )
                    self._violations.append(v)
                    span.violations.append(v)
                    new_violations.append(v)

        # Check required skills were actually consulted
        if contract and contract.skills_required:
            skills_used = set(skills_consulted)
            for required_skill in contract.skills_required:
                if required_skill not in skills_used:
                    v = Violation(
                        type=ViolationType.MISSING_REQUIRED_SKILL,
                        phase=phase_name,
                        detail=(
                            f"Required skill '{required_skill}' was not consulted "
                            f"in phase '{phase_name}'"
                        ),
                        severity="error",
                    )
                    self._violations.append(v)
                    span.violations.append(v)
                    new_violations.append(v)

        # Check duration limit
        if contract and contract.max_duration and span.duration_seconds > contract.max_duration:
            v = Violation(
                type=ViolationType.DURATION_EXCEEDED,
                phase=phase_name,
                detail=(
                    f"Phase '{phase_name}' took {span.duration_seconds:.1f}s, "
                    f"limit is {contract.max_duration:.0f}s"
                ),
                severity="warning",
            )
            self._violations.append(v)
            span.violations.append(v)
            new_violations.append(v)

        # Auto-persist after each phase
        self._auto_persist()

        logger.info(
            "Phase ended: %s (duration=%.1fs, cost=$%.4f, violations=%d)",
            phase_name, span.duration_seconds, span.cost_usd, len(span.violations),
        )
        return new_violations

    def record_skill_consultation(self, skill_id: str, phase_id: str) -> None:
        """Mark a skill as consulted within a phase.

        The agent (or a wrapper around its `read_file` operations) calls this
        whenever it loads a skill markdown file under `skills/`. At
        ``end_phase`` time the trace verifies every entry of
        ``contract.skills_required`` was consulted; missing entries become
        ``MISSING_REQUIRED_SKILL`` violations.

        Idempotent — duplicate consultations are deduplicated.
        """
        phase_span = self._get_span(phase_id)
        if phase_span is None:
            raise ValueError(f"Unknown phase span: {phase_id}")
        bucket = self._phase_skills.setdefault(phase_id, [])
        if skill_id not in bucket:
            bucket.append(skill_id)
            logger.debug(
                "Skill consulted: %s (phase=%s)", skill_id, phase_span.name
            )

    def record_gate(self, phase_name: str, gate_type: str, approved_by: str = "") -> Span:
        """Record a gate/checkpoint event."""
        span = Span(
            id=f"gate-{phase_name}-{uuid.uuid4().hex[:6]}",
            kind=SpanKind.GATE,
            name=f"{phase_name}_gate",
            metadata={"gate_type": gate_type, "approved_by": approved_by},
        )
        span.end()
        self._spans.append(span)
        return span

    def record_review(
        self,
        review_type: str,
        scores: dict[str, int],
        findings: list[dict[str, Any]] | None = None,
        reviewer: str = "independent",
    ) -> Span:
        """Record a review checkpoint."""
        span = Span(
            id=f"review-{review_type}-{uuid.uuid4().hex[:6]}",
            kind=SpanKind.REVIEW,
            name=f"{review_type}_review",
            metadata={
                "reviewer": reviewer,
                "scores": scores,
                "findings": findings or [],
                "total_score": sum(scores.values()),
                "max_score": len(scores) * 3,
            },
        )
        span.end()
        self._spans.append(span)
        return span

    def record_violation(self, violation_type: ViolationType, phase: str, detail: str,
                         severity: str = "warning") -> Violation:
        """Manually record a governance violation."""
        v = Violation(type=violation_type, phase=phase, detail=detail, severity=severity)
        self._violations.append(v)
        logger.warning("VIOLATION recorded: [%s] %s", violation_type.value, detail)
        return v

    # --- Queries ---

    @property
    def total_cost(self) -> float:
        return self._total_cost

    @property
    def violations(self) -> list[Violation]:
        return list(self._violations)

    @property
    def has_critical_violations(self) -> bool:
        return any(v.severity == "critical" for v in self._violations)

    @property
    def has_errors(self) -> bool:
        return any(v.severity in ("error", "critical") for v in self._violations)

    def phase_spans(self) -> list[Span]:
        return [s for s in self._spans if s.kind == SpanKind.PHASE]

    def tool_spans(self, phase_id: str | None = None) -> list[Span]:
        spans = [s for s in self._spans if s.kind == SpanKind.TOOL]
        if phase_id:
            spans = [s for s in spans if s.parent_id == phase_id]
        return spans

    def metrics(self) -> dict[str, Any]:
        """Summary metrics for the entire production run."""
        phases = self.phase_spans()
        tools = self.tool_spans()
        return {
            "production_id": self.production_id,
            "pipeline": self.pipeline_name,
            "started_at": self._started_at,
            "total_phases": len(phases),
            "total_tool_calls": len(tools),
            "total_cost_usd": round(self._total_cost, 4),
            "total_duration_seconds": round(
                sum(s.duration_seconds for s in phases), 2
            ),
            "total_violations": len(self._violations),
            "critical_violations": sum(
                1 for v in self._violations if v.severity == "critical"
            ),
            "error_violations": sum(
                1 for v in self._violations if v.severity == "error"
            ),
            "phases": {
                s.name: {
                    "duration_seconds": s.duration_seconds,
                    "cost_usd": s.cost_usd,
                    "tool_calls": len(self._phase_tools.get(s.id, [])),
                    "skills_consulted": list(self._phase_skills.get(s.id, [])),
                    "violations": len(s.violations),
                    "status": s.status.value,
                }
                for s in phases
            },
        }

    # --- Persistence ---

    def to_dict(self) -> dict[str, Any]:
        """Full serialization of the production trace."""
        return {
            "production_id": self.production_id,
            "pipeline": self.pipeline_name,
            "started_at": self._started_at,
            "hard_budget_cap": self.hard_budget_cap,
            "spans": [s.to_dict() for s in self._spans],
            "violations": [v.to_dict() for v in self._violations],
            "metrics": self.metrics(),
        }

    def persist(self, path: str | Path | None = None) -> Path | None:
        """Write the full trace to JSON."""
        if path:
            out = Path(path)
        elif self.output_dir:
            out = self.output_dir / "production_trace.json"
        else:
            return None

        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)

        logger.info("Production trace persisted to %s", out)
        return out

    def _auto_persist(self) -> None:
        """Auto-persist after phase boundaries if output_dir is set."""
        if self.output_dir:
            self.persist()

    def _get_span(self, span_id: str) -> Span | None:
        for s in self._spans:
            if s.id == span_id:
                return s
        return None


def _hash_data(data: Any) -> str:
    """Create a short hash of arbitrary data for audit without storing full payloads."""
    raw = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]
