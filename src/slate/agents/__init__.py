"""ReviewerAgent — Independent review protocol for Slate productions.

The Reviewer is spawned as a sub-agent at review checkpoints to provide
independent quality assessment. Unlike the Director's self-review (P6),
the Reviewer has no stake in the creative decisions and applies the
rubric objectively.

Review Types:
  - script_review: After script stage — checks accuracy, tone, compliance
  - asset_review: After assets stage — checks brand, style, quality
  - final_review: After compose — full independent review of everything

Each review produces a structured ReviewReport with:
  - Per-dimension scores (1-3)
  - Specific findings with revision ownership
  - Overall pass/fail determination
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class ReviewType(str, Enum):
    """Types of review checkpoints."""
    SCRIPT = "script"
    ASSET = "asset"
    FINAL = "final"


class FindingSeverity(str, Enum):
    """Severity of a review finding."""
    INFO = "info"
    SUGGESTION = "suggestion"
    WARNING = "warning"
    BLOCKER = "blocker"


class RevisionOwner(str, Enum):
    """Who owns fixing a finding."""
    SCRIPT = "script"       # Route back to script stage
    ASSETS = "assets"       # Route back to asset generation
    COMPOSE = "compose"     # Route back to composition
    HUMAN = "human"         # Requires human intervention (governance/compliance)


# Default review dimensions (from governance policy)
DEFAULT_DIMENSIONS = [
    "brand_compliance",
    "caption_accuracy",
    "audio_quality",
    "visual_consistency",
    "pacing",
    "content_accuracy",
]

# Which dimensions apply to each review type
REVIEW_DIMENSIONS: dict[ReviewType, list[str]] = {
    ReviewType.SCRIPT: ["content_accuracy", "pacing"],
    ReviewType.ASSET: ["brand_compliance", "visual_consistency"],
    ReviewType.FINAL: DEFAULT_DIMENSIONS,  # All dimensions
}

REPO_ROOT = Path(__file__).resolve().parents[3]

REVIEW_SKILL_PATHS: dict[ReviewType, list[str]] = {
    ReviewType.SCRIPT: [],
    ReviewType.ASSET: [],
    ReviewType.FINAL: [
        "skills/core/video-indexer-review.md",
        "skills/meta/reviewer-operating-model.md",
        "skills/meta/review-evidence-collection.md",
        "skills/meta/review-blocker-taxonomy.md",
        "skills/meta/render-audit-trail.md",
        "skills/meta/checkpoint-protocol.md",
    ],
}

# Mapping from finding category to revision owner
FINDING_ROUTING: dict[str, RevisionOwner] = {
    "factual_error": RevisionOwner.SCRIPT,
    "tone_mismatch": RevisionOwner.SCRIPT,
    "script_length": RevisionOwner.SCRIPT,
    "brand_color": RevisionOwner.ASSETS,
    "brand_font": RevisionOwner.ASSETS,
    "brand_logo": RevisionOwner.ASSETS,
    "image_quality": RevisionOwner.ASSETS,
    "style_inconsistency": RevisionOwner.ASSETS,
    "timing_issue": RevisionOwner.COMPOSE,
    "caption_sync": RevisionOwner.COMPOSE,
    "audio_level": RevisionOwner.COMPOSE,
    "transition_jarring": RevisionOwner.COMPOSE,
    "content_safety": RevisionOwner.HUMAN,
    "compliance_violation": RevisionOwner.HUMAN,
    "copyright_concern": RevisionOwner.HUMAN,
}


def _load_review_skill_bundle(review_type: ReviewType) -> dict[str, Any]:
    """Load the concrete skill files required for this review type."""
    required_paths = REVIEW_SKILL_PATHS.get(review_type, [])
    loaded_skills: list[dict[str, Any]] = []
    missing_paths: list[str] = []

    for relative_path in required_paths:
        skill_path = REPO_ROOT / relative_path
        if not skill_path.exists():
            missing_paths.append(relative_path)
            loaded_skills.append(
                {
                    "path": relative_path,
                    "loaded": False,
                    "content": "",
                    "error": "missing skill file",
                }
            )
            continue

        loaded_skills.append(
            {
                "path": relative_path,
                "loaded": True,
                "content": skill_path.read_text(encoding="utf-8"),
            }
        )

    return {
        "required_paths": required_paths,
        "loaded_skills": loaded_skills,
        "missing_paths": missing_paths,
    }


@dataclass
class ReviewFinding:
    """A specific issue found during review."""
    category: str
    description: str
    severity: FindingSeverity = FindingSeverity.SUGGESTION
    owner: RevisionOwner = RevisionOwner.COMPOSE
    scene_id: str | None = None
    suggested_fix: str = ""

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["severity"] = self.severity.value
        d["owner"] = self.owner.value
        return d

    @classmethod
    def create(
        cls,
        category: str,
        description: str,
        severity: FindingSeverity = FindingSeverity.SUGGESTION,
        scene_id: str | None = None,
        suggested_fix: str = "",
    ) -> ReviewFinding:
        """Create a finding with auto-routed ownership."""
        owner = FINDING_ROUTING.get(category, RevisionOwner.COMPOSE)
        return cls(
            category=category,
            description=description,
            severity=severity,
            owner=owner,
            scene_id=scene_id,
            suggested_fix=suggested_fix,
        )


@dataclass
class ReviewReport:
    """Structured output from a review checkpoint."""
    review_type: ReviewType
    reviewer: str = "independent"
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    scores: dict[str, int] = field(default_factory=dict)
    findings: list[ReviewFinding] = field(default_factory=list)
    summary: str = ""
    passed: bool = False

    @property
    def total_score(self) -> int:
        return sum(self.scores.values())

    @property
    def max_score(self) -> int:
        return len(self.scores) * 3

    @property
    def blockers(self) -> list[ReviewFinding]:
        return [f for f in self.findings if f.severity == FindingSeverity.BLOCKER]

    @property
    def warnings(self) -> list[ReviewFinding]:
        return [f for f in self.findings if f.severity == FindingSeverity.WARNING]

    def route_findings(self) -> dict[str, list[ReviewFinding]]:
        """Group findings by revision owner for routing."""
        routed: dict[str, list[ReviewFinding]] = {}
        for finding in self.findings:
            owner = finding.owner.value
            routed.setdefault(owner, []).append(finding)
        return routed

    def to_dict(self) -> dict[str, Any]:
        return {
            "review_type": self.review_type.value,
            "reviewer": self.reviewer,
            "timestamp": self.timestamp,
            "scores": self.scores,
            "total_score": self.total_score,
            "max_score": self.max_score,
            "passed": self.passed,
            "findings": [f.to_dict() for f in self.findings],
            "blockers": len(self.blockers),
            "warnings": len(self.warnings),
            "summary": self.summary,
            "routed_findings": {
                k: [f.to_dict() for f in v]
                for k, v in self.route_findings().items()
            },
        }


class ReviewerAgent:
    """Independent review agent protocol.

    The ReviewerAgent doesn't execute LLM calls itself — it provides the
    protocol, rubric, and structured output format. The actual review is
    performed by a Copilot sub-agent using the review skill prompt + this
    protocol's input/output contract.

    Usage:
        reviewer = ReviewerAgent(min_dimension_score=2, min_total_score=14)

        # Build the review context for a sub-agent
        context = reviewer.build_review_context(
            review_type=ReviewType.FINAL,
            artifacts={"script": ..., "scene_plan": ..., "assets": ...},
            trace_metrics={...},
        )

        # After sub-agent returns scores and findings:
        report = reviewer.create_report(
            review_type=ReviewType.FINAL,
            scores={"brand_compliance": 3, "pacing": 2, ...},
            findings=[ReviewFinding.create("timing_issue", "Scene 3 too long")],
            summary="Overall good quality with minor timing issues",
        )

        report.passed  # → True/False based on scores and blockers
    """

    def __init__(
        self,
        min_dimension_score: int = 2,
        min_total_score: int = 14,
        dimensions: list[str] | None = None,
    ):
        self.min_dimension_score = min_dimension_score
        self.min_total_score = min_total_score
        self.dimensions = dimensions or DEFAULT_DIMENSIONS

    def build_review_context(
        self,
        review_type: ReviewType,
        artifacts: dict[str, Any],
        trace_metrics: dict[str, Any] | None = None,
        brand_package: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Build the context payload for a reviewer sub-agent."""
        applicable_dims = REVIEW_DIMENSIONS.get(review_type, self.dimensions)
        skill_bundle = _load_review_skill_bundle(review_type)

        return {
            "review_type": review_type.value,
            "dimensions": applicable_dims,
            "scoring_rubric": {
                "scale": "1-3 per dimension",
                "1": "Significant issues — needs rework",
                "2": "Acceptable — minor issues noted",
                "3": "Excellent — no issues",
            },
            "min_dimension_score": self.min_dimension_score,
            "min_total_score": self.min_total_score,
            "artifacts": artifacts,
            "trace_metrics": trace_metrics or {},
            "brand_package": brand_package,
            "required_skill_paths": skill_bundle["required_paths"],
            "skill_bundle": skill_bundle,
            "agent_action_contract": {
                "instruction": "Validate review findings against the available evidence, then fix the valid issues before delivery.",
                "on_pass": "Proceed to user review or delivery.",
                "on_fail": "Do not stop at reporting. Validate the findings, act on them, and re-run review unless a human override is required.",
                "allowed_actions": [
                    "fix_and_rerender",
                    "request_human_override",
                    "escalate_to_human",
                ],
            },
            "finding_categories": list(FINDING_ROUTING.keys()),
            "severity_levels": [s.value for s in FindingSeverity],
        }

    def create_report(
        self,
        review_type: ReviewType,
        scores: dict[str, int],
        findings: list[ReviewFinding] | None = None,
        summary: str = "",
        reviewer: str = "independent",
    ) -> ReviewReport:
        """Create a structured review report and determine pass/fail."""
        findings = findings or []

        has_blockers = any(
            f.severity == FindingSeverity.BLOCKER for f in findings
        )
        all_dims_pass = all(
            score >= self.min_dimension_score for score in scores.values()
        )
        total_passes = sum(scores.values()) >= self.min_total_score

        passed = not has_blockers and all_dims_pass and total_passes

        report = ReviewReport(
            review_type=review_type,
            reviewer=reviewer,
            scores=scores,
            findings=findings,
            summary=summary,
            passed=passed,
        )

        logger.info(
            "Review %s: %s (score=%d/%d, blockers=%d, passed=%s)",
            review_type.value, "PASSED" if passed else "FAILED",
            report.total_score, report.max_score,
            len(report.blockers), passed,
        )
        return report

    def parse_agent_response(
        self,
        review_type: ReviewType,
        response: dict[str, Any],
    ) -> ReviewReport:
        """Parse a sub-agent's response into a structured ReviewReport.

        Expected response format:
        {
            "scores": {"brand_compliance": 3, ...},
            "findings": [{"category": "...", "description": "...", "severity": "..."}],
            "summary": "..."
        }
        """
        scores = response.get("scores", {})
        raw_findings = response.get("findings", [])
        summary = response.get("summary", "")

        findings = []
        for rf in raw_findings:
            findings.append(ReviewFinding.create(
                category=rf.get("category", "unknown"),
                description=rf.get("description", ""),
                severity=FindingSeverity(rf.get("severity", "suggestion")),
                scene_id=rf.get("scene_id"),
                suggested_fix=rf.get("suggested_fix", ""),
            ))

        return self.create_report(
            review_type=review_type,
            scores=scores,
            findings=findings,
            summary=summary,
        )
