"""Slate model registry — loads pricing and config from config/models.yaml.

Every tool reads costs from the registry so that swapping models or updating
pricing requires only a YAML edit, not code changes.
"""

from pathlib import Path

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

_registry: dict | None = None
_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "models.yaml"


def _load() -> dict:
    """Load and cache the model registry."""
    global _registry
    if _registry is not None:
        return _registry

    if HAS_YAML and _CONFIG_PATH.exists():
        with open(_CONFIG_PATH) as f:
            _registry = yaml.safe_load(f) or {}
    else:
        _registry = {}
    return _registry


def image_cost(model_key: str) -> float:
    """Get cost per image for a model. Falls back to 0.0 if unknown."""
    reg = _load()
    models = reg.get("image_models", {})
    entry = models.get(model_key, {})
    if isinstance(entry, dict):
        return entry.get("cost_per_image", 0.0)
    # Check fallback_costs
    return reg.get("fallback_costs", {}).get(model_key, 0.0)


def tts_cost_per_sec(model_key: str = "gpt-4o-mini-tts") -> float:
    """Get cost per second for a TTS model."""
    reg = _load()
    entry = reg.get("tts_models", {}).get(model_key, {})
    return entry.get("cost_per_second", 0.001)


def video_cost_per_sec(model_key: str = "sora-2") -> float:
    """Get cost per second for a video model."""
    reg = _load()
    entry = reg.get("video_models", {}).get(model_key, {})
    return entry.get("cost_per_second", 0.20)


def video_valid_durations(model_key: str = "sora-2") -> list[int]:
    """Get valid durations for a video model."""
    reg = _load()
    entry = reg.get("video_models", {}).get(model_key, {})
    return entry.get("valid_durations", [4, 8, 12])


def fallback_cost(key: str) -> float:
    """Get cost for a fallback method (always 0 but explicit is better)."""
    reg = _load()
    return reg.get("fallback_costs", {}).get(key, 0.0)


def reload():
    """Force-reload the registry (useful after config edits)."""
    global _registry
    _registry = None
    _load()
