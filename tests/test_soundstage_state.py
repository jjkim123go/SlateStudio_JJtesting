"""Contract tests for the Soundstage living-storyboard board.

The board is read-only and defensive: it must derive rich state from a
well-formed project and degrade (never raise) on missing/garbage input, and it
must never read outside a project directory (path-traversal fence).
"""

import json
from pathlib import Path

import pytest

from slate.soundstage import events, server
from slate.soundstage.state import load_board_state, summarize_project


def _write(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data if isinstance(data, str) else json.dumps(data), encoding="utf-8")


def _fixture(root: Path) -> Path:
    d = root / "demo-video"
    _write(d / "project.json", {"name": "Demo", "slug": "demo-video",
                                "budget_usd": 10.0, "created_at": "2026-01-01T00:00:00Z"})
    _write(d / "composition.scf.json", {
        "version": "1.0",
        "metadata": {"title": "Demo Video", "voice": "coral",
                     "theme": {"name": "demo", "primary": "#4ea1ff", "accent": "#6ee7a8"},
                     "totalDurationSec": 12.0},
        "scenes": [
            {"id": "s1", "duration": 6.0, "narration": "assets/s1.wav",
             "narrationText": "Hello there.", "transition": "crossfade",
             "layers": [{"type": "text", "content": "Hi"}]},
            {"id": "s2", "duration": 6.0, "narration": "assets/s2.wav",
             "narrationText": "Second beat.", "component": "VSCodeScene"},
        ],
    })
    with open(d / "decisions.jsonl", "w", encoding="utf-8") as f:
        f.write(json.dumps({"ts": "2026-01-01T00:00:01Z", "type": "project_created", "slug": "demo-video"}) + "\n")
        f.write(json.dumps({"ts": "2026-01-01T00:00:02Z", "type": "checkpoint", "checkpoint_id": "ck1",
                            "checkpoint_type": "CK-REVIEW", "scope": "script"}) + "\n")
        f.write(json.dumps({"ts": "2026-01-01T00:00:03Z", "type": "checkpoint_resolved",
                            "checkpoint_id": "ck1", "verdict": "approved"}) + "\n")
    _write(d / "ledger.jsonl", json.dumps({"ts": "2026-01-01T00:00:04Z", "tool": "foundry_tts",
                                           "model": "gpt-4o-mini-tts", "units": {"seconds": 5.5},
                                           "cost_usd": 0.0055, "artifact": "assets/s1.wav"}))
    (d / "assets").mkdir(exist_ok=True)
    return d


def test_load_board_state_full(tmp_path):
    s = load_board_state(_fixture(tmp_path))
    assert s["title"] == "Demo Video"
    assert s["has_scf"] is True
    names = {st["name"] for st in s["stages"]}
    assert {"ingest", "script", "assets", "compose", "review", "publish"} <= names
    sb = s["storyboard"]
    assert len(sb["scenes"]) == 2
    s1, s2 = sb["scenes"]
    assert s1["treatment_class"] == "hand"        # text layer -> hand-stitched
    assert s2["treatment_class"] == "chrome"      # VSCodeScene -> product chrome
    assert s1["narration_seconds"] == 5.5         # joined from the ledger
    assert s["cost"]["spent_usd"] == pytest.approx(0.0055)
    assert "variety" in sb and "histogram" in sb["variety"]


def test_never_raises_on_garbage(tmp_path):
    assert load_board_state(tmp_path / "does-not-exist")["has_scf"] is False
    d = tmp_path / "broken"
    d.mkdir()
    (d / "decisions.jsonl").write_text('{"type":"x"}\n{bad json\n', encoding="utf-8")
    (d / "composition.scf.json").write_text("{not json", encoding="utf-8")
    s = load_board_state(d)           # must not raise
    assert s["has_scf"] is False
    assert summarize_project(d)["slug"] == "broken"


def test_narration_overflow_flagged(tmp_path):
    d = tmp_path / "overflow"
    _write(d / "composition.scf.json", {
        "version": "1.0", "metadata": {"totalDurationSec": 3.0},
        "scenes": [{"id": "s1", "duration": 3.0, "narration": "assets/s1.wav",
                    "narrationText": "Way too long for the shot."}]})
    _write(d / "ledger.jsonl", json.dumps({"tool": "foundry_tts", "units": {"seconds": 9.0},
                                           "cost_usd": 0.01, "artifact": "assets/s1.wav"}))
    sc = load_board_state(d)["storyboard"]["scenes"][0]
    assert sc["narration_overflow"] is True


def test_path_fencing(tmp_path, monkeypatch):
    monkeypatch.setattr(server, "PROJECTS_DIR", tmp_path)
    (tmp_path / "ok").mkdir()
    assert server._project_dir("ok") is not None
    assert server._project_dir("../etc") is None       # traversal
    assert server._project_dir("bad/slug") is None      # separator
    assert server._project_dir("UPPER") is None          # slug must be lowercase
    proj = tmp_path / "ok"
    (proj / "a.png").write_bytes(b"x")
    assert server._fenced(proj, "a.png") is not None
    assert server._fenced(proj, "../secret") is None     # cannot escape the project


def test_events_emitter(tmp_path):
    events.emit_event(tmp_path, "foundry_tts", "start", scene_id="s1")
    with events.generating(tmp_path, "foundry_image_gen", "s2"):
        pass
    lines = (tmp_path / "events.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert [json.loads(x)["event"] for x in lines] == ["start", "start", "finish"]
