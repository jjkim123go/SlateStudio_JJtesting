"""Live production events for the Soundstage board (optional, additive).

Emitting a start/finish event around each scene's asset generation makes the
board's storyboard card shimmer "generating…" live and drives the Activity feed.
The board works fine WITHOUT these — it also watches file mtimes — so this is a
pure enhancement. Every function is append-only, best-effort, and NEVER raises:
a production must never break because of a board event.

    from slate.soundstage.events import generating, emit_event

    with generating("projects/my-slug", "foundry_image_gen", scene_id="s4"):
        ...generate the asset...

    emit_event("projects/my-slug", "foundry_tts", "finish", scene_id="s2", cost_usd=0.011)
"""

from __future__ import annotations

import json
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def emit_event(project_dir: Any, tool: str, event: str, *,
               scene_id: str | None = None, cost_usd: float | None = None,
               **extra: Any) -> None:
    """Append one live event to ``projects/<slug>/events.jsonl``. Best-effort.

    Args:
        project_dir: the project workspace (path or str).
        tool: the tool doing the work, e.g. ``"foundry_image_gen"``.
        event: ``"start"`` | ``"finish"`` | ``"error"``.
        scene_id: SCF scene id this event belongs to (ties it to a card).
        cost_usd: optional spend for this call (finish events).
        **extra: any additional fields to record.

    Never raises — a failed board event must not affect the production.
    """
    try:
        rec: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "tool": str(tool),
            "event": str(event),
        }
        if scene_id is not None:
            rec["scene_id"] = str(scene_id)
        if cost_usd is not None:
            rec["cost_usd"] = float(cost_usd)
        rec.update(extra)
        path = Path(project_dir) / "events.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec) + "\n")
    except Exception:
        pass  # the board is an observer; never break a production over an event


@contextmanager
def generating(project_dir: Any, tool: str, scene_id: str, **extra: Any):
    """Emit ``start`` around a block, then ``finish`` (or ``error`` on raise).

    Wrap a scene's asset generation so its storyboard card shimmers live::

        with generating(proj, "foundry_tts", "s2"):
            synthesize_narration(...)
    """
    emit_event(project_dir, tool, "start", scene_id=scene_id, **extra)
    try:
        yield
    except Exception:
        emit_event(project_dir, tool, "error", scene_id=scene_id)
        raise
    else:
        emit_event(project_dir, tool, "finish", scene_id=scene_id)
