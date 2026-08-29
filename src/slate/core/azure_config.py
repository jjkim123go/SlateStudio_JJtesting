"""Slate Azure configuration loader — single source of truth for Azure resource identity.

Precedence (highest wins):
    1. Environment variables (SLATE_AZURE_*)
    2. config/azure.local.yaml (user-specific, gitignored)
    3. config/azure.yaml (distribution template)

Usage::

    from slate.core.azure_config import azure_config

    resource = azure_config.resource_name   # raises if unconfigured
    endpoint = azure_config.endpoint        # auto-derived from resource_name
    rg       = azure_config.resource_group
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Resolve config/ relative to the repo root (three levels up from this file)
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_CONFIG_DIR = _REPO_ROOT / "config"
_AZURE_YAML = _CONFIG_DIR / "azure.yaml"
_AZURE_LOCAL_YAML = _CONFIG_DIR / "azure.local.yaml"

# Environment variable names
_ENV_MAP = {
    "resource_name": "SLATE_AZURE_RESOURCE",
    "endpoint": "SLATE_AZURE_ENDPOINT",
    "resource_group": "SLATE_AZURE_RESOURCE_GROUP",
    "subscription_id": "SLATE_AZURE_SUBSCRIPTION_ID",
    "location": "SLATE_AZURE_LOCATION",
    "video_deployment": "SLATE_AZURE_VIDEO_DEPLOYMENT",
    "vi_account_id": "SLATE_AZURE_VI_ACCOUNT_ID",
    "vi_account_name": "SLATE_AZURE_VI_ACCOUNT_NAME",
}


def _load_yaml(path: Path) -> dict[str, Any]:
    """Load a YAML file, returning empty dict on any failure."""
    if not path.exists():
        return {}
    try:
        import yaml
        with open(path) as f:
            return yaml.safe_load(f) or {}
    except ImportError:
        logger.warning("PyYAML not installed — cannot read %s", path)
        return {}
    except Exception as e:
        logger.warning("Failed to read %s: %s", path, e)
        return {}


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base. Non-empty override values win."""
    merged = dict(base)
    for key, val in override.items():
        if isinstance(val, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], val)
        elif val not in (None, ""):
            merged[key] = val
    return merged


@dataclass
class AzureConfig:
    """Resolved Azure configuration. Constructed via ``AzureConfig.load()``."""

    resource_name: str = ""
    endpoint: str = ""
    resource_group: str = ""
    subscription_id: str = ""
    location: str = ""
    video_deployment: str = "sora"
    vi_account_id: str = ""
    vi_account_name: str = ""
    _loaded: bool = field(default=False, repr=False)

    @classmethod
    def load(cls) -> AzureConfig:
        """Load config with full precedence chain."""
        # Layer 1: distribution template
        base = _load_yaml(_AZURE_YAML)
        # Layer 2: user-local override
        local = _load_yaml(_AZURE_LOCAL_YAML)
        merged = _deep_merge(base, local)

        ai = merged.get("ai_services", {}) or {}
        vi = merged.get("video_indexer", {}) or {}

        cfg = cls(
            resource_name=ai.get("resource_name", "") or "",
            endpoint=ai.get("endpoint", "") or "",
            resource_group=ai.get("resource_group", "") or "",
            subscription_id=ai.get("subscription_id", "") or "",
            location=ai.get("location", "") or "",
            video_deployment=ai.get("video_deployment", "sora") or "sora",
            # VI inherits from ai_services if its own fields are blank
            vi_account_id=vi.get("account_id", "") or "",
            vi_account_name=vi.get("account_name", "") or "",
        )

        # Layer 3: environment variables (highest precedence)
        for attr, env_key in _ENV_MAP.items():
            env_val = os.environ.get(env_key, "")
            if env_val:
                setattr(cfg, attr, env_val)

        # Auto-derive endpoint from resource_name if endpoint is blank
        if not cfg.endpoint and cfg.resource_name:
            cfg.endpoint = f"https://{cfg.resource_name}.cognitiveservices.azure.com"

        cfg._loaded = True
        return cfg

    @property
    def is_configured(self) -> bool:
        """True if at least the resource name is set."""
        return bool(self.resource_name)

    def require(self, *fields: str) -> None:
        """Raise a clear error if any of the named fields are empty.

        Usage::

            azure_config.require("resource_name", "resource_group")
        """
        missing = [f for f in fields if not getattr(self, f, "")]
        if missing:
            msg = (
                f"Azure configuration incomplete — missing: {', '.join(missing)}. "
                f"Set values in config/azure.local.yaml or via environment variables "
                f"({', '.join(_ENV_MAP[f] for f in missing if f in _ENV_MAP)})."
            )
            raise RuntimeError(msg)

    def reload(self) -> AzureConfig:
        """Force-reload from disk and env. Returns self for chaining."""
        fresh = AzureConfig.load()
        for attr in _ENV_MAP:
            setattr(self, attr, getattr(fresh, attr))
        self.endpoint = fresh.endpoint
        self._loaded = True
        return self


# Module-level singleton — import this everywhere.
azure_config = AzureConfig.load()
