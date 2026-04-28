"""Slate Azure configuration setup wizard.

Usage::

    python -m slate.setup
"""

from __future__ import annotations

import sys
from pathlib import Path

from slate.core.azure_config import _CONFIG_DIR, _AZURE_LOCAL_YAML, azure_config, _deep_merge, _load_yaml


def _prompt(label: str, current: str, required: bool = False) -> str:
    """Prompt the user for a value, showing the current value as default."""
    suffix = " (required)" if required and not current else ""
    default_hint = f" [{current}]" if current else ""
    while True:
        value = input(f"  {label}{suffix}{default_hint}: ").strip()
        if not value:
            value = current
        if required and not value:
            print(f"    ⚠ {label} is required — please enter a value.")
            continue
        return value


def main() -> None:
    """Interactive setup wizard for config/azure.local.yaml."""
    print("\n╔══════════════════════════════════════════╗")
    print("║        Slate Azure Configuration         ║")
    print("╚══════════════════════════════════════════╝\n")

    existing = _load_yaml(_AZURE_LOCAL_YAML)
    ai = existing.get("ai_services", {}) or {}

    if existing and ai.get("resource_name"):
        print(f"  Existing config found: {_AZURE_LOCAL_YAML}")
        print(f"    resource_name : {ai.get('resource_name', '')}")
        print(f"    resource_group: {ai.get('resource_group', '')}")
        print(f"    subscription  : {ai.get('subscription_id', '')}")
        print(f"    location      : {ai.get('location', '')}")
        update = input("\n  Update existing config? [Y/n]: ").strip().lower()
        if update and update not in ("y", "yes"):
            print("  Keeping existing config.")
            return
        print()

    print("  Enter your Azure AI Services details:\n")
    resource_name = _prompt("Resource name", ai.get("resource_name", ""), required=True)
    resource_group = _prompt("Resource group", ai.get("resource_group", ""))
    subscription_id = _prompt("Subscription ID", ai.get("subscription_id", ""))
    location = _prompt("Location", ai.get("location", ""))

    new_ai = {
        "resource_name": resource_name,
        "resource_group": resource_group,
        "subscription_id": subscription_id,
        "location": location,
    }
    # Deep-merge to preserve existing fields (e.g. video_indexer)
    merged = _deep_merge(existing, {"ai_services": new_ai})

    # Write YAML
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    try:
        import yaml
        with open(_AZURE_LOCAL_YAML, "w") as f:
            yaml.dump(merged, f, default_flow_style=False, sort_keys=False)
    except ImportError:
        # Fallback: write a simple YAML manually
        lines = ["ai_services:"]
        for k, v in new_ai.items():
            lines.append(f"  {k}: {v!r}" if v else f"  {k}: ''")
        # Preserve other top-level sections
        for key, val in existing.items():
            if key != "ai_services":
                lines.append(f"\n{key}:")
                if isinstance(val, dict):
                    for sk, sv in val.items():
                        lines.append(f"  {sk}: {sv!r}" if sv else f"  {sk}: ''")
        with open(_AZURE_LOCAL_YAML, "w") as f:
            f.write("\n".join(lines) + "\n")

    # Reload the singleton
    azure_config.reload()

    print(f"\n  ✅ Config written to {_AZURE_LOCAL_YAML}")
    print(f"     Endpoint: {azure_config.endpoint}")
    print(f"     Configured: {azure_config.is_configured}\n")


if __name__ == "__main__":
    main()
