from __future__ import annotations

import json

import pytest

from slate.core.budget import (
    DEFAULT_PROJECT_BUDGET_USD,
    apply_hard_cap_enforcement,
    load_project_config,
    resolve_project_budget,
)
from slate.core.governance_policy import GovernancePolicy


def test_explicit_budget_wins():
    budget, source = resolve_project_budget(
        explicit_budget_usd=150,
        project_config={"budget_usd": 50},
        org_policy=GovernancePolicy(default_project_budget_usd=75),
    )
    assert budget == 150
    assert source == "explicit"


def test_project_budget_wins_over_org_default():
    budget, source = resolve_project_budget(
        project_config={"budget_usd": 60},
        org_policy=GovernancePolicy(default_project_budget_usd=75),
    )
    assert budget == 60
    assert source == "project"


def test_org_default_wins_over_builtin():
    budget, source = resolve_project_budget(org_policy=GovernancePolicy(default_project_budget_usd=80))
    assert budget == 80
    assert source == "org"


def test_builtin_default_is_100():
    budget, source = resolve_project_budget()
    assert budget == DEFAULT_PROJECT_BUDGET_USD == 100.0
    assert source == "builtin"


@pytest.mark.parametrize("bad_value", [0, -1, "0", "-5", "not-a-number", None])
def test_invalid_budget_values_are_ignored(bad_value):
    budget, source = resolve_project_budget(
        explicit_budget_usd=bad_value,
        project_config={"budget_usd": bad_value},
        org_policy=GovernancePolicy(default_project_budget_usd=90),
    )
    assert budget == 90
    assert source == "org"


def test_explicit_budget_can_be_clamped_by_policy():
    budget, _ = resolve_project_budget(explicit_budget_usd=150)
    capped, warnings = apply_hard_cap_enforcement(
        budget,
        GovernancePolicy(hard_budget_cap=100, budget_cap_enforcement="clamp"),
    )
    assert capped == 100
    assert warnings and "CLAMPED" in warnings[0]


def test_hard_cap_warn_does_not_clamp():
    policy = GovernancePolicy(hard_budget_cap=25, budget_cap_enforcement="warn")
    budget, warnings = apply_hard_cap_enforcement(100, policy)
    assert budget == 100
    assert warnings and "exceeds" in warnings[0]


def test_hard_cap_clamp():
    policy = GovernancePolicy(hard_budget_cap=25, budget_cap_enforcement="clamp")
    budget, warnings = apply_hard_cap_enforcement(100, policy)
    assert budget == 25
    assert warnings and "CLAMPED" in warnings[0]


def test_hard_cap_block():
    policy = GovernancePolicy(hard_budget_cap=25, budget_cap_enforcement="block")
    with pytest.raises(ValueError):
        apply_hard_cap_enforcement(100, policy)


def test_load_project_config(tmp_path):
    project_dir = tmp_path / "demo"
    project_dir.mkdir()
    (project_dir / "project.json").write_text(json.dumps({"budget_usd": 42}), encoding="utf-8")
    assert load_project_config("demo", projects_dir=tmp_path)["budget_usd"] == 42