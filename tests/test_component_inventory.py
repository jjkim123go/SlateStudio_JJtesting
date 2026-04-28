"""Consistency checks for component discoverability inventories."""

from __future__ import annotations

import json
import re
from pathlib import Path

import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[1]
COMPONENTS_DIR = PROJECT_ROOT / "render" / "components"
SKILLS_DIR = PROJECT_ROOT / "skills" / "core" / "components"
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "scf-v1.0.schema.json"
LLMS_INDEX_PATH = PROJECT_ROOT / "skills" / "INDEX.md"
COMPILER_PATH = PROJECT_ROOT / "render" / "lib" / "scf-to-html.mjs"

NO_SKILL_COMPONENTS = {
    "AnimatedCaption",
    "BrandIntro",
    "BrandOutro",
    "LowerThird",
    "TitleCard",
}

PLACEHOLDER_COMPONENTS = {
    "CodeWalkthrough",
}

SPECIAL_SKILL_STEMS = {
    "CTABlock": "cta-block",
    "GitHubScene": "github-scene",
    "OKRStatus": "okr-status",
    "OneDriveScene": "onedrive-scene",
    "PowerBIScene": "power-bi-scene",
    "PowerPointScene": "powerpoint-scene",
    "ROICalculator": "roi-calculator",
    "VSCodeScene": "vscode-scene",
}


def component_to_skill_stem(component_name: str) -> str:
    if component_name in SPECIAL_SKILL_STEMS:
        return SPECIAL_SKILL_STEMS[component_name]
    return re.sub(r"(?<!^)(?=[A-Z])", "-", component_name).lower()


def registered_components() -> set[str]:
    text = COMPILER_PATH.read_text(encoding="utf-8")
    match = re.search(r"const KNOWN_COMPONENTS = new Set\(\[(.*?)\]\);", text, re.S)
    assert match, "Could not locate KNOWN_COMPONENTS in scf-to-html.mjs"
    return set(re.findall(r"'([^']+)'", match.group(1)))


def schema_components() -> set[str]:
    data = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    return set(data["$defs"]["Scene"]["properties"]["component"]["enum"])


def pipeline_component_skill_refs() -> set[str]:
    """Deprecated stub kept so old test names still resolve.

    pipeline_defs/ was removed in the agentic refactor. Component coverage
    is now enforced by INDEX.md (see test_llms_index_lists_all_component_skills).
    """
    return set()


def llms_component_skill_stems() -> set[str]:
    text = LLMS_INDEX_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"`components/([a-z0-9-]+)`", text))


class TestComponentInventory:
    def test_registered_components_match_directories(self):
        component_dirs = {
            path.name
            for path in COMPONENTS_DIR.iterdir()
            if path.is_dir()
        }
        registered = registered_components()

        missing_from_registered = sorted(
            component_dirs - PLACEHOLDER_COMPONENTS - registered
        )
        assert missing_from_registered == []

    def test_registered_components_exist_in_schema(self):
        registered = registered_components()
        missing_from_schema = sorted(registered - schema_components())
        assert missing_from_schema == []

    def test_component_skill_files_cover_registered_components(self):
        registered = registered_components()
        skill_stems = {path.stem for path in SKILLS_DIR.glob("*.md")}
        expected = {
            component_to_skill_stem(name)
            for name in registered
            if name not in NO_SKILL_COMPONENTS
        }
        missing_skills = sorted(expected - skill_stems)
        assert missing_skills == []

    def test_llms_index_lists_all_component_skills(self):
        skill_stems = {path.stem for path in SKILLS_DIR.glob("*.md")}
        missing_from_index = sorted(skill_stems - llms_component_skill_stems())
        assert missing_from_index == []

    def test_pipeline_references_all_component_skills(self):
        """Replaced by test_llms_index_lists_all_component_skills.

        pipeline_defs/ was removed in the agentic refactor — INDEX.md is now
        the single source of truth for component skill discoverability.
        """
        import pytest
        pytest.skip("pipeline_defs removed; INDEX.md is now the source of truth")