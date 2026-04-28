"""Slate command-line entry point."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ASSET_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".mov", ".wav", ".mp3", ".m4a", ".json"}
TEMP_PATTERNS = ("_test", "test_", "_tmp", "tmp_", "_placeholder", "placeholder_", "_fallback", "fallback-")
PLACEHOLDER_SIZE_BYTES = 200 * 1024


@dataclass
class CleanupCandidate:
    path: str
    reason: str
    size_bytes: int


@dataclass
class CleanupReport:
    project_path: str
    candidates: list[CleanupCandidate] = field(default_factory=list)
    deleted: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "project_path": self.project_path,
            "candidates": [candidate.__dict__ for candidate in self.candidates],
            "deleted": self.deleted,
            "skipped": self.skipped,
        }


class ProjectCleaner:
    """Conservative cleanup for stale generated project assets."""

    def __init__(self, project: str | Path, projects_dir: str | Path = "projects") -> None:
        raw = Path(project)
        self.project_path = raw if raw.exists() else Path(projects_dir) / str(project)
        self.project_path = self.project_path.resolve()
        self.assets_dir = self.project_path / "assets"
        self.decisions_path = self.project_path / "decisions.jsonl"

    def dry_run(self) -> CleanupReport:
        report = CleanupReport(project_path=str(self.project_path))
        if not self.project_path.exists() or not self.assets_dir.exists():
            return report
        referenced = self._referenced_assets()
        latest_decision = self._latest_decision_timestamp()
        for path in sorted(self.assets_dir.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in ASSET_SUFFIXES:
                continue
            rel = path.relative_to(self.project_path).as_posix()
            if rel in referenced or path.name in referenced:
                report.skipped.append(rel)
                continue
            reason = self._candidate_reason(path, latest_decision)
            if reason:
                report.candidates.append(CleanupCandidate(rel, reason, path.stat().st_size))
        return report

    def apply(self) -> CleanupReport:
        report = self.dry_run()
        for candidate in report.candidates:
            path = self.project_path / candidate.path
            try:
                path.unlink()
                report.deleted.append(candidate.path)
            except FileNotFoundError:
                report.skipped.append(candidate.path)
            except OSError as exc:
                report.skipped.append(f"{candidate.path}: {exc}")
        if report.deleted:
            self._append_cleanup_decision(report)
        return report

    def _candidate_reason(self, path: Path, latest_decision: datetime | None) -> str | None:
        name = path.name.lower()
        if any(token in name for token in TEMP_PATTERNS):
            return "temporary-or-placeholder-name"
        size = path.stat().st_size
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} and size < PLACEHOLDER_SIZE_BYTES:
            return "small-image-placeholder-threshold"
        if latest_decision and datetime.fromtimestamp(path.stat().st_mtime, timezone.utc) < latest_decision:
            return "older-than-latest-decision"
        return None

    def _latest_decision_timestamp(self) -> datetime | None:
        latest: datetime | None = None
        if not self.decisions_path.exists():
            return latest
        for line in self.decisions_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            raw = row.get("timestamp") or row.get("ts") or row.get("time")
            if not raw:
                continue
            try:
                parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            except ValueError:
                continue
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            latest = parsed if latest is None or parsed > latest else latest
        return latest

    def _referenced_assets(self) -> set[str]:
        refs: set[str] = set()
        for scf_path in self.project_path.glob("*.scf.json"):
            try:
                data = json.loads(scf_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            for value in self._walk_strings(data):
                normalized = value.replace("\\", "/")
                if "/assets/" in normalized:
                    normalized = normalized.split("/assets/", 1)[1]
                    refs.add(f"assets/{normalized}")
                    refs.add(Path(normalized).name)
                elif normalized.startswith("assets/"):
                    refs.add(normalized)
                    refs.add(Path(normalized).name)
        return refs

    def _walk_strings(self, value: Any):
        if isinstance(value, str):
            yield value
        elif isinstance(value, list):
            for item in value:
                yield from self._walk_strings(item)
        elif isinstance(value, dict):
            for item in value.values():
                yield from self._walk_strings(item)

    def _append_cleanup_decision(self, report: CleanupReport) -> None:
        self.decisions_path.parent.mkdir(parents=True, exist_ok=True)
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "cleanup_applied",
            "files_deleted": report.deleted,
            "candidate_count": len(report.candidates),
        }
        with self.decisions_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, sort_keys=True) + "\n")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="slate")
    sub = parser.add_subparsers(dest="command", required=True)
    clean = sub.add_parser("clean", help="Clean stale generated assets from a project")
    clean.add_argument("project", help="Project slug under projects/ or an explicit project path")
    mode = clean.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Report files that would be deleted")
    mode.add_argument("--apply", action="store_true", help="Delete candidates and append a cleanup decision")
    clean.add_argument("--json", action="store_true", help="Emit machine-readable JSON")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.command == "clean":
        cleaner = ProjectCleaner(args.project)
        report = cleaner.apply() if args.apply else cleaner.dry_run()
        if args.json:
            print(json.dumps(report.to_dict(), indent=2))
        else:
            action = "Deleted" if args.apply else "Would delete"
            print(f"{action} {len(report.deleted if args.apply else report.candidates)} file(s) in {report.project_path}")
            for candidate in report.candidates:
                marker = "deleted" if candidate.path in report.deleted else candidate.reason
                print(f"  - {candidate.path} ({marker}, {candidate.size_bytes} bytes)")
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())