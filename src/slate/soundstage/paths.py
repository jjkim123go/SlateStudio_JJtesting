"""Canonical paths for Soundstage — the single source of truth.

``PROJECTS_DIR`` is where the board looks for productions. It is
environment-overridable (``SLATE_PROJECTS_DIR``) so tests and demos can point
the board at a staging directory without touching the real ``projects/``.
"""

from __future__ import annotations

import os
from pathlib import Path

# src/slate/soundstage/paths.py -> parents: [0]=soundstage [1]=slate [2]=src [3]=repo root
REPO_ROOT = Path(__file__).resolve().parents[3]

_env = os.environ.get("SLATE_PROJECTS_DIR")
PROJECTS_DIR = Path(_env).resolve() if _env else (REPO_ROOT / "projects")

# Cache dir for downscaled thumbnails / extracted video posters (never inside a project).
CACHE_DIR = REPO_ROOT / ".soundstage" / "cache"
