from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from slate.cli import ProjectCleaner, main


def _write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def test_clean_dry_run_does_not_delete(tmp_path: Path):
    project = tmp_path / "project"
    old = project / "assets" / "scene_placeholder.png"
    _write(old, b"x" * 1024)

    report = ProjectCleaner(project).dry_run()

    assert [candidate.path for candidate in report.candidates] == ["assets/scene_placeholder.png"]
    assert old.exists()


def test_clean_apply_deletes_and_appends_decision(tmp_path: Path):
    project = tmp_path / "project"
    old = project / "assets" / "scene_tmp.png"
    _write(old, b"x" * 1024)

    report = ProjectCleaner(project).apply()

    assert report.deleted == ["assets/scene_tmp.png"]
    assert not old.exists()
    row = json.loads((project / "decisions.jsonl").read_text(encoding="utf-8").splitlines()[-1])
    assert row["type"] == "cleanup_applied"
    assert row["files_deleted"] == ["assets/scene_tmp.png"]


def test_clean_skips_assets_referenced_by_scf(tmp_path: Path):
    project = tmp_path / "project"
    referenced = project / "assets" / "keep_placeholder.png"
    _write(referenced, b"x" * 1024)
    scf = {
        "version": "1.0",
        "pipeline": "test",
        "outputProfile": {"width": 1920, "height": 1080, "fps": 30},
        "scenes": [{"id": "a", "duration": 1, "layers": [{"type": "image", "src": "assets/keep_placeholder.png"}]}],
    }
    (project / "composition.scf.json").write_text(json.dumps(scf), encoding="utf-8")

    report = ProjectCleaner(project).dry_run()

    assert report.candidates == []
    assert report.skipped == ["assets/keep_placeholder.png"]


def test_clean_flags_assets_older_than_latest_decision(tmp_path: Path):
    project = tmp_path / "project"
    asset = project / "assets" / "old-real.mp4"
    _write(asset, b"x" * 300_000)
    old_time = datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp()
    os.utime(asset, (old_time, old_time))
    (project / "decisions.jsonl").write_text(
        json.dumps({"timestamp": "2026-02-01T00:00:00+00:00", "type": "asset_generated"}) + "\n",
        encoding="utf-8",
    )

    report = ProjectCleaner(project).dry_run()

    assert report.candidates[0].reason == "older-than-latest-decision"


def test_clean_cli_json(tmp_path: Path, capsys):
    project = tmp_path / "project"
    _write(project / "assets" / "_test-medium.png", b"x" * 1024)

    assert main(["clean", str(project), "--dry-run", "--json"]) == 0
    output = json.loads(capsys.readouterr().out)
    assert output["candidates"][0]["path"] == "assets/_test-medium.png"