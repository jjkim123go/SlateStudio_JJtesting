"""CostTracker — Budget governance and cost transparency.

Tracks per-tool costs, running totals, budget limits. Writes a JSON cost log
that feeds into the audit trail and chargeback system.

Lineage: Per-action cost tracking and observe/warn/cap budget modes carry
implementation lineage from OpenMontage's budget configuration (AGPL-3.0).
Slate extends them with JSONL audit data and enterprise chargeback fields. See
docs/OPENMONTAGE_LINEAGE.md.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class CostEntry:
    """A single cost event."""
    tool_name: str
    operation: str
    cost_usd: float
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: dict[str, Any] = field(default_factory=dict)


class CostTracker:
    """Tracks costs per project/session with budget enforcement.

    Usage:
        tracker = CostTracker(budget_usd=5.00, log_path="projects/<slug>/ledger.jsonl")
        tracker.estimate("foundry_tts", duration_seconds=30)  # → $0.03
        tracker.record("foundry_tts", "generate_speech", 0.03)
        tracker.check_budget()  # → True (under budget)
    """

    def __init__(self, budget_usd: float = 100.0, log_path: str | Path | None = None):
        self.budget_usd = budget_usd
        self.log_path = Path(log_path) if log_path else None
        self._entries: list[CostEntry] = []
        self._running_total: float = 0.0

        if self.log_path:
            self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def record(self, tool_name: str, operation: str, cost_usd: float, **metadata: Any) -> None:
        """Record a cost event."""
        entry = CostEntry(
            tool_name=tool_name,
            operation=operation,
            cost_usd=cost_usd,
            metadata=metadata,
        )
        self._entries.append(entry)
        self._running_total += cost_usd

        if self.log_path:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry.__dict__) + "\n")

        logger.info("Cost: $%.4f for %s.%s (total: $%.4f / $%.2f)",
                     cost_usd, tool_name, operation, self._running_total, self.budget_usd)

    def check_budget(self) -> bool:
        """Return True if under budget."""
        return self._running_total <= self.budget_usd

    @property
    def remaining(self) -> float:
        """Remaining budget in USD."""
        return max(0.0, self.budget_usd - self._running_total)

    @property
    def total_spent(self) -> float:
        return self._running_total

    def summary(self) -> dict[str, Any]:
        """Cost summary grouped by tool."""
        by_tool: dict[str, float] = {}
        for entry in self._entries:
            by_tool[entry.tool_name] = by_tool.get(entry.tool_name, 0.0) + entry.cost_usd
        return {
            "total_usd": round(self._running_total, 4),
            "budget_usd": self.budget_usd,
            "remaining_usd": round(self.remaining, 4),
            "under_budget": self.check_budget(),
            "by_tool": {k: round(v, 4) for k, v in sorted(by_tool.items())},
            "entry_count": len(self._entries),
        }

    # --- Cost estimation (pre-execution) ---
    # Costs loaded from config/models.yaml at init time for consistency.
    # Fallback to these defaults if models.yaml is unavailable.

    _DEFAULT_ESTIMATES: dict[str, dict[str, float]] = {
        "foundry_image_gen": {"per_image": 0.04},
        "foundry_tts": {"per_second": 0.001},
        "foundry_transcribe": {"per_second": 0.0001},
        "foundry_video_gen": {"per_second": 0.10},
        "video_indexer": {"per_minute": 0.09},
        "hyperframes_render": {"per_minute": 0.0},
        "ffmpeg_transcode": {"per_minute": 0.0},
        "epidemic_music": {"per_track": 0.0},
    }

    @property
    def COST_ESTIMATES(self) -> dict[str, dict[str, float]]:
        """Load costs from models.yaml if available, else use defaults."""
        try:
            from pathlib import Path as _P
            import yaml as _yaml
            cfg_path = _P(__file__).resolve().parent.parent.parent / "config" / "models.yaml"
            if cfg_path.exists():
                with open(cfg_path, encoding="utf-8") as f:
                    reg = _yaml.safe_load(f) or {}
                estimates = dict(self._DEFAULT_ESTIMATES)
                # Override from registry
                for model_key, entry in reg.get("image_models", {}).items():
                    if isinstance(entry, dict) and "cost_per_image" in entry:
                        estimates["foundry_image_gen"] = {"per_image": entry["cost_per_image"]}
                        break  # Use first image model cost as default
                tts = reg.get("tts_models", {}).get("gpt-4o-mini-tts", {})
                if tts.get("cost_per_second"):
                    estimates["foundry_tts"] = {"per_second": tts["cost_per_second"]}
                vid = reg.get("video_models", {}).get("sora-2", {})
                if vid.get("cost_per_second"):
                    estimates["foundry_video_gen"] = {"per_second": vid["cost_per_second"]}
                # Transcription cost from registry
                trans = reg.get("transcription_models", {}).get("gpt-4o-transcribe", {})
                if trans.get("cost_per_minute"):
                    estimates["foundry_transcribe"] = {"per_second": trans["cost_per_minute"] / 60.0}
                return estimates
        except Exception:
            pass
        return self._DEFAULT_ESTIMATES

    def estimate(self, tool_name: str, **kwargs: Any) -> float:
        """Estimate cost before execution. Returns USD."""
        rates = self.COST_ESTIMATES.get(tool_name, {})
        if not rates:
            return 0.0

        cost = 0.0
        if "per_image" in rates and "count" in kwargs:
            cost = rates["per_image"] * kwargs["count"]
        elif "per_second" in rates and "duration_seconds" in kwargs:
            cost = rates["per_second"] * kwargs["duration_seconds"]
        elif "per_minute" in rates and "duration_minutes" in kwargs:
            cost = rates["per_minute"] * kwargs["duration_minutes"]
        elif "per_track" in rates:
            cost = rates["per_track"]

        return round(cost, 4)
