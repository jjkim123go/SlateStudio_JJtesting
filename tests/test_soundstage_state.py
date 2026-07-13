"""Contract tests for the Soundstage living-storyboard board.

The board is read-only and defensive: it must derive rich state from a
well-formed project and degrade (never raise) on missing/garbage input, and it
must never read outside a project directory (path-traversal fence).
"""

import json
import sys
import types
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


def test_delivered_project_is_not_awaiting(tmp_path):
    """Inline-verdict checkpoints + a revision_delivered decision must resolve the
    gate: a shipped video is DELIVERED, never 'awaiting you'."""
    d = tmp_path / "shipped"
    _write(d / "project.json", {"name": "Shipped", "slug": "shipped", "budget_usd": 10.0})
    _write(d / "composition.scf.json", {
        "metadata": {"title": "Shipped", "theme": {"name": "t"}},
        "scenes": [{"id": "s1", "duration": 5.0, "narration": "assets/narration/s01.wav"}],
    })
    with open(d / "decisions.jsonl", "w", encoding="utf-8") as f:
        # single-line checkpoints carrying inline verdicts (no checkpoint_resolved):
        # a 'validate' pass is automated, and the review carries verdict inline.
        f.write(json.dumps({"type": "checkpoint", "checkpoint_id": "ck_compose",
                            "checkpoint_type": "validate", "scope": "compose"}) + "\n")
        f.write(json.dumps({"type": "checkpoint", "checkpoint_id": "ck_review",
                            "checkpoint_type": "CK-REVIEW", "scope": "review",
                            "verdict": "PASS"}) + "\n")
        f.write(json.dumps({"type": "revision_delivered", "version": "v3",
                            "note": "shipped"}) + "\n")
    (d / "renders").mkdir(parents=True)
    (d / "renders" / "composition.mp4").write_bytes(b"\x00")
    s = load_board_state(d)
    assert s["delivered"] is True
    assert s["awaiting_human"] is False
    assert s["active_gate"] is None
    publish = next(st for st in s["stages"] if st["name"] == "publish")
    assert publish["status"] == "completed"
    summ = summarize_project(d)
    assert summ["awaiting_human"] is False and summ["delivered"] is True


def test_narration_falls_back_to_script_md(tmp_path):
    """After the SCF exists, per-scene narration + the whole script must come from
    script.md when the SCF references audio by path (no inline narrationText)."""
    d = tmp_path / "scripted"
    _write(d / "project.json", {"name": "Scripted", "slug": "scripted"})
    _write(d / "composition.scf.json", {
        "metadata": {"title": "Scripted", "theme": {"name": "t"}},
        "scenes": [
            {"id": "s1", "duration": 6.0, "narration": "assets/narration/s01.wav"},
            {"id": "s2", "duration": 6.0, "narration": "assets/narration/s02.wav"},
        ],
    })
    _write(d / "script.md",
           "# Script\n\n## Scene 1 \u2014 Hook (~6s)\n\n> The opening line.\n\n"
           "## Scene 2 \u2014 Point (~6s)\n\n> The second line.\n")
    _write(d / "assets" / "narration" / "s01.words.json",
           {"duration": 5.9, "text": "The opening line.", "words": []})
    s = load_board_state(d)
    scenes = s["storyboard"]["scenes"]
    assert scenes[0]["narration_text"] == "The opening line."
    assert scenes[1]["narration_text"] == "The second line."
    assert scenes[0]["narration_seconds"] == 5.9   # from the sidecar, not the ledger


def test_scene_narration_audio_and_cost_series(tmp_path):
    """Scenes expose a playable narration_audio path (#4) and cost carries a
    cumulative spend-over-time series (#5)."""
    d = tmp_path / "media"
    _write(d / "project.json", {"name": "M", "slug": "media", "budget_usd": 10.0})
    _write(d / "composition.scf.json", {"metadata": {"title": "M"},
        "scenes": [{"id": "s1", "duration": 5.0, "narration": "assets/narration/s01.wav"}]})
    (d / "assets" / "narration").mkdir(parents=True)
    (d / "assets" / "narration" / "s01.wav").write_bytes(b"\x00")
    with open(d / "ledger.jsonl", "w", encoding="utf-8") as f:
        f.write(json.dumps({"ts": "t1", "tool": "azure_speech_tts", "cost_usd": 0.06}) + "\n")
        f.write(json.dumps({"ts": "t2", "tool": "foundry_image_gen", "cost_usd": 0.04}) + "\n")
    s = load_board_state(d)
    assert s["storyboard"]["scenes"][0]["narration_audio"] == "assets/narration/s01.wav"
    assert [round(p["cumulative"], 2) for p in s["cost"]["series"]] == [0.06, 0.10]


def test_gate_action_endpoint(tmp_path, monkeypatch):
    """POST /api/project/<slug>/gate appends a checkpoint_resolved (the one write
    Soundstage makes) and flips the board from awaiting -> resolved (#3)."""
    import http.client
    import threading
    from http.server import ThreadingHTTPServer

    monkeypatch.setattr(server, "PROJECTS_DIR", tmp_path)
    d = tmp_path / "gated"
    _write(d / "project.json", {"name": "Gated", "slug": "gated"})
    _write(d / "composition.scf.json", {"metadata": {"title": "Gated"},
                                        "scenes": [{"id": "s1", "duration": 5.0}]})
    _write(d / "decisions.jsonl", json.dumps(
        {"type": "checkpoint", "checkpoint_id": "ck_x",
         "checkpoint_type": "CK-REVIEW", "scope": "script"}) + "\n")
    assert load_board_state(d)["awaiting_human"] is True

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    try:
        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
        conn.request("POST", "/api/project/gated/gate",
                     body=json.dumps({"verdict": "approved"}),
                     headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        payload = json.loads(resp.read())
        conn.close()
    finally:
        httpd.shutdown()
        t.join(timeout=5)

    assert resp.status == 200 and payload["ok"] is True and payload["resolved"] == "ck_x"
    after = load_board_state(d)
    assert after["awaiting_human"] is False and after["active_gate"] is None
    last = json.loads((d / "decisions.jsonl").read_text(encoding="utf-8").strip().splitlines()[-1])
    assert last["type"] == "checkpoint_resolved" and last["source"] == "soundstage"


def test_gate_action_rejects_bad_verdict(tmp_path, monkeypatch):
    import http.client
    import threading
    from http.server import ThreadingHTTPServer

    monkeypatch.setattr(server, "PROJECTS_DIR", tmp_path)
    d = tmp_path / "g2"
    _write(d / "project.json", {"name": "G2", "slug": "g2"})
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    try:
        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
        conn.request("POST", "/api/project/g2/gate", body=json.dumps({"verdict": "haxx"}),
                     headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        resp.read()
        conn.close()
    finally:
        httpd.shutdown()
        t.join(timeout=5)
    assert resp.status == 400
    assert not (d / "decisions.jsonl").exists()      # nothing written on a bad verdict


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


def _planned_fixture(root: Path) -> Path:
    """A project with script + art-direction + narration sidecars, but NO SCF."""
    d = root / "planned-video"
    _write(d / "project.json", {"name": "Planned", "slug": "planned-video", "budget_usd": 25.0})
    _write(d / "script.md",
           "# Planned — Script\n\n"
           "## Scene 1 — Hook: the cold open (~10s)\n\n"
           "> The first thing you notice is the light.\n\n"
           "## Scene 2 — The idea (~20s)\n\n"
           "> Then it all comes together in one simple picture.\n\n"
           "### Word-count check\n~30 words.\n")
    _write(d / "art-direction.json", {
        "concept": "a test world",
        "theme": {"name": "planned-theme", "primary": "#123456"},
        "captions": {"style": "static"},
        "productionLayers": {"music": "built-in", "voice": "en-US-Andrew:DragonHDLatestNeural"},
        "sceneTreatments": {"s1": "generated-image hero (a cold open)", "s2": "kinetic type on paper"},
    })
    _write(d / "assets" / "narration" / "s01.words.json",
           {"text": "...", "duration": 9.6, "source": "azure-speech-wordboundary", "words": []})
    _write(d / "assets" / "narration" / "s02.words.json",
           {"text": "...", "duration": 19.2, "source": "azure-speech-wordboundary", "words": []})
    return d


def test_planned_storyboard_before_scf(tmp_path):
    """The living board must surface script/scene-plan/narration BEFORE the SCF."""
    s = load_board_state(_planned_fixture(tmp_path))
    assert s["has_scf"] is False
    sb = s["storyboard"]
    assert sb is not None and sb.get("planned") is True
    assert len(sb["scenes"]) == 2
    s1, s2 = sb["scenes"]
    # script narration surfaced (this is what fills the screenplay panel)
    assert s1["narration_text"].startswith("The first thing you notice")
    assert s2["technique"] == "kinetic type on paper"
    assert s1["treatment_class"] == "generated"   # generated-image hero
    assert s2["treatment_class"] == "hand"
    # measured narration seconds from the sidecars (+0.5s buffer in the shot)
    assert s1["narration_seconds"] == 9.6
    assert s1["duration"] == pytest.approx(10.1)
    # theme/captions/music come from art-direction so the board is tinted early
    assert sb["theme"]["name"] == "planned-theme"
    assert sb["captions"]["style"] == "static"
    assert sb["music"] is not None
    # stage rail: script + scene_plan done, compose still pending (no SCF)
    rail = {st["name"]: st["status"] for st in s["stages"]}
    assert rail["script"] == "completed"
    assert rail["scene_plan"] == "completed"
    assert rail["compose"] == "pending"


def test_planned_storyboard_parses_canonical_script_template(tmp_path):
    """Canonical scripts use plain narration + a duration footer, not the
    legacy blockquote + duration-in-heading shape."""
    d = tmp_path / "canonical-script"
    _write(d / "project.json", {"name": "Canonical", "slug": "canonical-script"})
    _write(d / "script.md", """---
voice: coral
target_duration_sec: 25
total_word_count: 12
---

## Scene 1: The first beat

Plain narration must appear in the living storyboard.

[VISUAL: A useful visual direction that is not narration]

*Duration: 11s · Words: 8 · WPS: 0.7*

---

## Scene 2: The second beat

The second narration appears too.

[COMPONENT: VSCodeScene]

*Duration: 14s · Words: 5 · WPS: 0.4*
""")
    _write(d / "art-direction.json", {
        "sceneTreatments": {
            "s01": "kinetic typography on warm paper",
            "s02": "VSCodeScene Copilot walkthrough",
            "s03": "AzurePortalScene resource group",
            "s04": "WindowsScene specialist setup",
        },
        "captions": {"style": "static"},
        "productionLayers": {"music": "built-in"},
    })

    state = load_board_state(d)
    storyboard = state["storyboard"]
    assert storyboard["planned"] is True
    assert storyboard["total_duration_seconds"] == 25.0
    assert storyboard["scenes"][0]["duration"] == 11.0
    assert storyboard["scenes"][0]["narration_text"] == (
        "Plain narration must appear in the living storyboard."
    )
    assert storyboard["scenes"][1]["narration_text"] == "The second narration appears too."
    assert storyboard["scenes"][1]["treatment_class"] == "chrome"
    assert storyboard["scenes"][2]["treatment_class"] == "chrome"
    assert storyboard["scenes"][3]["treatment_class"] == "chrome"
    assert "VISUAL" not in storyboard["scenes"][0]["narration_text"]


def test_open_surface_browser_and_both(tmp_path, monkeypatch):
    """The default browser surface must visibly launch even inside VS Code,
    and `both` must not return after only attempting the Simple Browser."""
    opened: list[str] = []
    processes: list[list[str]] = []
    fake_webbrowser = types.SimpleNamespace(
        open_new_tab=lambda url: opened.append(url) or True,
    )
    monkeypatch.setitem(sys.modules, "webbrowser", fake_webbrowser)
    monkeypatch.setattr(server.shutil, "which", lambda _name: "code")
    monkeypatch.setattr(
        server.subprocess,
        "Popen",
        lambda args, **_kwargs: processes.append(args) or object(),
    )
    url = "http://127.0.0.1:4770/p/demo"

    server._open_surface(url, "browser")
    assert opened == [url]
    assert processes == []

    opened.clear()
    server._open_surface(url, "both")
    assert processes == [["code", "--command", "simpleBrowser.show", url]]
    assert opened == [url]
