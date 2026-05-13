from __future__ import annotations

from scripts.lib.component_inventory import build_component_manifest


def test_component_manifest_matches_renderer_and_schema_counts():
    manifest = build_component_manifest()
    summary = manifest["summary"]

    assert summary["registered_count"] >= 90
    assert summary["registered_count"] == summary["schema_enum_count"]
    assert set(manifest["issues"]["unregistered_component_dirs"]).issubset({"CodeWalkthrough"})
    assert manifest["issues"]["registered_missing_dirs"] == []
    assert manifest["issues"]["registered_missing_schema_enum"] == []


def test_component_manifest_surfaces_prop_contract_gap():
    manifest = build_component_manifest()

    assert manifest["summary"]["missing_prop_contract_count"] > 0
    fixed_high_use_components = {
        "DataFlow",
        "GitHubScene",
        "StepByStep",
        "OutlookScene",
        "TeamsScene",
        "PlannerScene",
    }
    missing = set(manifest["issues"]["registered_missing_prop_contract"])
    assert fixed_high_use_components.isdisjoint(missing)
