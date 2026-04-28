"""Project budget resolution helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DEFAULT_PROJECT_BUDGET_USD = 100.0


def _positive_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def load_project_config(project_slug: str, projects_dir: str | Path = "projects") -> dict[str, Any] | None:
    """Load projects/<slug>/project.json if it exists."""
    path = Path(projects_dir) / project_slug / "project.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def resolve_project_budget(
    explicit_budget_usd: float | None = None,
    project_config: dict[str, Any] | None = None,
    org_policy: Any | None = None,
) -> tuple[float, str]:
    """Resolve the project budget using explicit > project > org > builtin."""
    explicit = _positive_float(explicit_budget_usd)
    if explicit is not None:
        return explicit, "explicit"

    project_budget = _positive_float((project_config or {}).get("budget_usd"))
    if project_budget is not None:
        return project_budget, "project"

    org_default = _positive_float(getattr(org_policy, "default_project_budget_usd", None))
    if org_default is not None:
        return org_default, "org"

    return DEFAULT_PROJECT_BUDGET_USD, "builtin"


def apply_hard_cap_enforcement(
    project_budget_usd: float,
    org_policy: Any | None = None,
) -> tuple[float, list[str]]:
    """Apply org budget cap policy without silently changing defaults."""
    warnings: list[str] = []
    if org_policy is None:
        return project_budget_usd, warnings

    hard_cap = _positive_float(getattr(org_policy, "hard_budget_cap", None))
    if hard_cap is None or project_budget_usd <= hard_cap:
        return project_budget_usd, warnings

    mode = getattr(org_policy, "budget_cap_enforcement", "warn") or "warn"
    detail = f"Project budget ${project_budget_usd:.2f} exceeds org hard cap ${hard_cap:.2f}"
    if mode == "block":
        raise ValueError(detail)
    if mode == "clamp":
        warnings.append(f"CLAMPED: {detail}")
        return hard_cap, warnings

    warnings.append(f"WARNING: {detail}")
    return project_budget_usd, warnings