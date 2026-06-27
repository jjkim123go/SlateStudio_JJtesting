"""Component inventory helpers for Slate quality gates.

The renderer is the source of truth for which components can actually render.
This module turns that live registry, the SCF schema, component directories,
props.json files, and component skill files into a machine-readable manifest
that validators and evals can use before a render spends time or money.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
COMPONENTS_DIR = PROJECT_ROOT / "render" / "components"
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "scf-v1.0.schema.json"
COMPILER_PATH = PROJECT_ROOT / "render" / "lib" / "scf-to-html.mjs"
COMPONENT_SKILLS_DIR = PROJECT_ROOT / "skills" / "core" / "components"

NO_SKILL_COMPONENTS = {
    "AnimatedCaption",
    "BrandIntro",
    "BrandOutro",
    "LowerThird",
    "TitleCard",
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


@dataclass(frozen=True)
class ComponentRecord:
    name: str
    registered: bool
    directory_exists: bool
    in_schema_enum: bool
    schema_props_guard: bool
    props_json: bool
    skill_file: str | None

    @property
    def has_prop_contract(self) -> bool:
        return self.schema_props_guard or self.props_json


def component_to_skill_stem(component_name: str) -> str:
    if component_name in SPECIAL_SKILL_STEMS:
        return SPECIAL_SKILL_STEMS[component_name]
    return re.sub(r"(?<!^)(?=[A-Z])", "-", component_name).lower()


def registered_components() -> set[str]:
    text = COMPILER_PATH.read_text(encoding="utf-8")
    match = re.search(r"const KNOWN_COMPONENTS = new Set\(\[(.*?)\]\);", text, re.S)
    if not match:
        raise ValueError(f"Could not locate KNOWN_COMPONENTS in {COMPILER_PATH}")
    return set(re.findall(r"'([^']+)'", match.group(1)))


def component_directories() -> set[str]:
    # Components may sit flat (render/components/<Name>/) or in category subfolders
    # (render/components/<category>/<Name>/). A component dir is identified by an
    # index.html; recurse one level into category folders.
    names: set[str] = set()
    for path in COMPONENTS_DIR.iterdir():
        if not path.is_dir():
            continue
        if (path / "index.html").exists():
            names.add(path.name)
        else:
            for sub in path.iterdir():
                if sub.is_dir() and (sub / "index.html").exists():
                    names.add(sub.name)
    return names


def schema_components() -> set[str]:
    data = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    return set(data["$defs"]["Scene"]["properties"]["component"]["enum"])


def schema_prop_guards() -> set[str]:
    text = SCHEMA_PATH.read_text(encoding="utf-8")
    return set(re.findall(r'"component"\s*:\s*\{\s*"const"\s*:\s*"([^"]+)"', text))


def props_json_components() -> set[str]:
    names = {path.parent.name for path in COMPONENTS_DIR.glob("*/props.json")}
    names |= {path.parent.name for path in COMPONENTS_DIR.glob("*/*/props.json")}
    return names


def component_skill_path(component_name: str) -> Path | None:
    if component_name in NO_SKILL_COMPONENTS:
        return None
    candidate = COMPONENT_SKILLS_DIR / f"{component_to_skill_stem(component_name)}.md"
    return candidate if candidate.exists() else None


def build_component_records() -> list[ComponentRecord]:
    registered = registered_components()
    directories = component_directories()
    schema = schema_components()
    guarded = schema_prop_guards()
    props_json = props_json_components()
    names = sorted(registered | directories | schema)

    return [
        ComponentRecord(
            name=name,
            registered=name in registered,
            directory_exists=name in directories,
            in_schema_enum=name in schema,
            schema_props_guard=name in guarded,
            props_json=name in props_json,
            skill_file=str(component_skill_path(name).relative_to(PROJECT_ROOT)).replace("\\", "/")
            if component_skill_path(name)
            else None,
        )
        for name in names
    ]


def build_component_manifest() -> dict[str, Any]:
    records = build_component_records()
    unregistered_dirs = [record.name for record in records if record.directory_exists and not record.registered]
    missing_dirs = [record.name for record in records if record.registered and not record.directory_exists]
    missing_schema = [record.name for record in records if record.registered and not record.in_schema_enum]
    missing_prop_contract = [record.name for record in records if record.registered and not record.has_prop_contract]

    return {
        "summary": {
            "registered_count": sum(1 for record in records if record.registered),
            "component_dir_count": sum(1 for record in records if record.directory_exists),
            "schema_enum_count": sum(1 for record in records if record.in_schema_enum),
            "schema_prop_guard_count": sum(1 for record in records if record.schema_props_guard),
            "props_json_count": sum(1 for record in records if record.props_json),
            "missing_prop_contract_count": len(missing_prop_contract),
        },
        "issues": {
            "unregistered_component_dirs": unregistered_dirs,
            "registered_missing_dirs": missing_dirs,
            "registered_missing_schema_enum": missing_schema,
            "registered_missing_prop_contract": missing_prop_contract,
        },
        "components": [asdict(record) | {"has_prop_contract": record.has_prop_contract} for record in records],
    }


def write_component_manifest(path: str | Path) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(build_component_manifest(), indent=2) + "\n", encoding="utf-8")
    return output_path


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Build a Slate component inventory manifest.")
    parser.add_argument("--output", default="output/component-manifest.json")
    args = parser.parse_args()

    manifest_path = write_component_manifest(args.output)
    manifest = build_component_manifest()
    print(f"Wrote {manifest_path}")
    print(json.dumps(manifest["summary"], indent=2))
