"""Concrete discovery for Slate music libraries.

The agent must inspect the filesystem for media assets because repository
search and git status can hide ignored MP3 files that are still present locally.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"}


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _track_files(directory: Path) -> list[Path]:
    if not directory.exists() or not directory.is_dir():
        return []
    return sorted(
        path
        for path in directory.rglob("*")
        if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS
    )


def _manifest_tracks(manifest_path: Path) -> list[dict[str, Any]]:
    if not manifest_path.exists():
        return []
    data = yaml.safe_load(manifest_path.read_text(encoding="utf-8")) or {}
    tracks = data.get("tracks", {}) if isinstance(data, dict) else {}
    result: list[dict[str, Any]] = []
    if not isinstance(tracks, dict):
        return result
    for slot, track in sorted(tracks.items()):
        if not isinstance(track, dict):
            continue
        path_value = track.get("path")
        if not path_value:
            continue
        audio_path = (manifest_path.parent / str(path_value)).resolve()
        result.append({
            "slot": slot,
            "path": str(audio_path),
            "exists": audio_path.exists(),
            "duration_sec": track.get("duration_sec"),
            "mood": track.get("mood", ""),
            "use_case": track.get("use_case", ""),
            "composer": track.get("composer", ""),
            "license": track.get("license", ""),
        })
    return result


def _source_summary(label: str, path: Path, manifest: Path | None = None) -> dict[str, Any]:
    tracks = _track_files(path)
    manifest_tracks = _manifest_tracks(manifest) if manifest else []
    return {
        "label": label,
        "path": str(path),
        "found": path.exists() and (bool(tracks) or bool(manifest_tracks)),
        "track_count": len(tracks),
        "tracks": [str(track) for track in tracks],
        "manifest": str(manifest) if manifest and manifest.exists() else None,
        "manifest_tracks": manifest_tracks,
        "missing_manifest_tracks": [track for track in manifest_tracks if not track["exists"]],
    }


def discover_music_sources(root: str | Path | None = None) -> dict[str, Any]:
    """Return concrete music availability from local disk.

    This intentionally uses direct filesystem traversal instead of git/search
    APIs so ignored-but-present media files are still discovered.
    """
    base = Path(root).resolve() if root else repo_root()
    brand_music_root = base / "config" / "org" / "brand-packages"
    brand_roots = sorted(brand_music_root.glob("*/music")) if brand_music_root.exists() else []
    brand_sources = [_source_summary(f"brand:{path.parent.name}", path) for path in brand_roots]
    org_source = _source_summary("org", base / "config" / "org" / "music")
    built_in_path = base / "assets" / "music" / "library"
    built_in = _source_summary("built-in", built_in_path, built_in_path / "MANIFEST.yaml")
    all_sources = [*brand_sources, org_source, built_in]
    return {
        "brand_sources": brand_sources,
        "org_source": org_source,
        "built_in_source": built_in,
        "available": any(source["found"] for source in all_sources),
        "track_count": sum(source["track_count"] for source in all_sources),
    }