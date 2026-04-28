"""GovernancePolicy — Loads and provides org-level governance configuration.

Reads config/org/governance-policy.yaml and exposes typed access to
enterprise-wide rules (budget caps, content safety, provider restrictions,
audit settings, review rubric requirements).

Separate from governance YAML to prevent governance drift.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

# Default path relative to repo root
DEFAULT_POLICY_PATH = "config/org/governance-policy.yaml"


@dataclass
class ReviewPolicy:
    """Review rubric requirements."""
    dimensions: list[str] = field(default_factory=lambda: [
        "brand_compliance", "caption_accuracy", "audio_quality",
        "visual_consistency", "pacing", "content_accuracy",
    ])
    min_dimension_score: int = 2
    min_total_score: int = 14


@dataclass
class ContentSafetyPolicy:
    """Content safety configuration."""
    enabled: bool = True
    blocked_categories: list[str] = field(default_factory=lambda: [
        "violence", "hate_speech", "sexual_content", "self_harm",
    ])
    check_generated_assets: bool = True


@dataclass
class AuditPolicy:
    """Audit and tracing configuration."""
    persist_after_phase: bool = True
    include_hashes: bool = True
    retention_days: int = 90


@dataclass
class ProviderPolicy:
    """Provider restrictions."""
    forbidden_providers: list[str] = field(default_factory=list)
    preferred_providers: list[str] = field(default_factory=lambda: ["azure_foundry"])
    data_residency: str = "us"


@dataclass
class SkillsEnforcementPolicy:
    """Configures whether ``skills_required`` per stage is enforced.

    When ``required`` is True, the orchestrator MUST treat any
    ``MISSING_REQUIRED_SKILL`` violation as a stage-blocking error
    according to ``fail_action``.
    """
    required: bool = True
    trace_field: str = "skills_consulted"
    fail_action: str = "block_stage_advancement"  # or "warn"


class GovernancePolicy:
    """Org-level governance policy loaded from YAML.

    Usage:
        policy = GovernancePolicy.load("config/org/governance-policy.yaml")
        policy.hard_budget_cap  # → 25.00
        policy.require_independent_review  # → True
        policy.content_safety.enabled  # → True
    """

    def __init__(
        self,
        hard_budget_cap: float = 100.0,
        default_project_budget_usd: float = 100.0,
        budget_cap_enforcement: str = "warn",
        require_hitl_gates: bool = True,
        require_independent_review: bool = True,
        max_retries_per_stage: int = 3,
        max_production_duration: int = 1800,
        content_safety: ContentSafetyPolicy | None = None,
        providers: ProviderPolicy | None = None,
        audit: AuditPolicy | None = None,
        review: ReviewPolicy | None = None,
        skills_enforcement: SkillsEnforcementPolicy | None = None,
    ):
        self.hard_budget_cap = hard_budget_cap
        self.default_project_budget_usd = default_project_budget_usd
        self.budget_cap_enforcement = budget_cap_enforcement
        self.require_hitl_gates = require_hitl_gates
        self.require_independent_review = require_independent_review
        self.max_retries_per_stage = max_retries_per_stage
        self.max_production_duration = max_production_duration
        self.content_safety = content_safety or ContentSafetyPolicy()
        self.providers = providers or ProviderPolicy()
        self.audit = audit or AuditPolicy()
        self.review = review or ReviewPolicy()
        self.skills_enforcement = skills_enforcement or SkillsEnforcementPolicy()

    @classmethod
    def load(cls, path: str | Path | None = None) -> GovernancePolicy:
        """Load governance policy from YAML file.

        Falls back to defaults if file not found.
        """
        if path is None:
            path = DEFAULT_POLICY_PATH

        path = Path(path)
        if not path.exists():
            logger.warning(
                "Governance policy not found at %s, using defaults", path
            )
            return cls()

        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        gov = data.get("governance", {})
        cs_data = data.get("content_safety", {})
        prov_data = data.get("providers", {})
        audit_data = data.get("audit", {})
        review_data = data.get("review", {})
        skills_data = data.get("skills_enforcement", {})

        policy = cls(
            hard_budget_cap=gov.get("hard_budget_cap", 100.0),
            default_project_budget_usd=gov.get("default_project_budget_usd", 100.0),
            budget_cap_enforcement=gov.get("budget_cap_enforcement", "warn"),
            require_hitl_gates=gov.get("require_hitl_gates", True),
            require_independent_review=gov.get("require_independent_review", True),
            max_retries_per_stage=gov.get("max_retries_per_stage", 3),
            max_production_duration=gov.get("max_production_duration", 1800),
            content_safety=ContentSafetyPolicy(
                enabled=cs_data.get("enabled", True),
                blocked_categories=cs_data.get("blocked_categories", []),
                check_generated_assets=cs_data.get("check_generated_assets", True),
            ),
            providers=ProviderPolicy(
                forbidden_providers=prov_data.get("forbidden_providers", []),
                preferred_providers=prov_data.get("preferred_providers", ["azure_foundry"]),
                data_residency=prov_data.get("data_residency", "us"),
            ),
            audit=AuditPolicy(
                persist_after_phase=audit_data.get("persist_after_phase", True),
                include_hashes=audit_data.get("include_hashes", True),
                retention_days=audit_data.get("retention_days", 90),
            ),
            review=ReviewPolicy(
                dimensions=review_data.get("dimensions", [
                    "brand_compliance", "caption_accuracy", "audio_quality",
                    "visual_consistency", "pacing", "content_accuracy",
                ]),
                min_dimension_score=review_data.get("min_dimension_score", 2),
                min_total_score=review_data.get("min_total_score", 14),
            ),
            skills_enforcement=SkillsEnforcementPolicy(
                required=skills_data.get("required", True),
                trace_field=skills_data.get("trace_field", "skills_consulted"),
                fail_action=skills_data.get("fail_action", "block_stage_advancement"),
            ),
        )

        logger.info("Governance policy loaded from %s", path)
        return policy

    def to_dict(self) -> dict[str, Any]:
        """Serialize for audit trail."""
        return {
            "hard_budget_cap": self.hard_budget_cap,
            "default_project_budget_usd": self.default_project_budget_usd,
            "budget_cap_enforcement": self.budget_cap_enforcement,
            "require_hitl_gates": self.require_hitl_gates,
            "require_independent_review": self.require_independent_review,
            "max_retries_per_stage": self.max_retries_per_stage,
            "max_production_duration": self.max_production_duration,
            "content_safety": {
                "enabled": self.content_safety.enabled,
                "blocked_categories": self.content_safety.blocked_categories,
                "check_generated_assets": self.content_safety.check_generated_assets,
            },
            "providers": {
                "forbidden_providers": self.providers.forbidden_providers,
                "preferred_providers": self.providers.preferred_providers,
                "data_residency": self.providers.data_residency,
            },
            "audit": {
                "persist_after_phase": self.audit.persist_after_phase,
                "include_hashes": self.audit.include_hashes,
                "retention_days": self.audit.retention_days,
            },
            "review": {
                "dimensions": self.review.dimensions,
                "min_dimension_score": self.review.min_dimension_score,
                "min_total_score": self.review.min_total_score,
            },
            "skills_enforcement": {
                "required": self.skills_enforcement.required,
                "trace_field": self.skills_enforcement.trace_field,
                "fail_action": self.skills_enforcement.fail_action,
            },
        }
