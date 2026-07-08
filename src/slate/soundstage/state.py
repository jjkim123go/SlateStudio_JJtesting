"""BoardState derivation — turn a Slate project directory into renderable state.

Everything here is read-only and defensive: a malformed JSON file, a missing
artifact, or a half-written SCF must *degrade* the board, never crash it
(design principle: "never block, never break"). ``load_board_state`` never
raises.

Slate's substrate is append-only logs + the SCF, so the board is nearly a pure
function of what the pipeline already writes:

    project.json           -> identity, budget
    decisions.jsonl        -> stage rail, gates, decision trail (checkpoints)
    ledger.jsonl           -> cost, narration seconds
    composition.scf.json   -> the storyboard (scenes, durations, theme, captions)
    review_report.json     -> quality scores
    events.jsonl           -> live "generating" activity (optional)
    renders/ , assets/     -> keyframes, poster, media
"""

from __future__ import annotations

import json
import re
import time
from collections import Counter
from pathlib import Path
from typing import Any, Optional

from .paths import PROJECTS_DIR

# --------------------------------------------------------------------------
# constants
# --------------------------------------------------------------------------

CANONICAL_STAGES = [
    "ingest", "research", "script", "scene_plan",
    "assets", "compose", "review", "publish",
]

# Stages that are approval gates in Slate's loop (checkpoint-protocol.md).
GATED_STAGES = {"ingest", "script", "scene_plan", "assets", "review", "publish"}

# Product-chrome components look like real software and are REUSABLE by design;
# they are exempt from the anti-sameness rule (distinct layouts count as variety).
CHROME_COMPONENTS = {
    "VSCodeScene", "TerminalCast", "TerminalScene", "ScreenDemoFrame",
    "EdgeBrowserScene", "BrowserScene", "TeamsScene", "OutlookScene",
    "ExcelScene", "PowerPointScene", "AzurePortalScene", "GitHubScene",
    "PhoneScene", "PowerBIScene",
}
# Components whose content is a generated/photographic raster.
GENERATED_COMPONENTS = {"ImageBackdrop", "DeviceStage3D", "KenBurns"}

MEDIA_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MEDIA_VIDEO_EXT = {".mp4", ".webm", ".mov"}
MEDIA_AUDIO_EXT = {".mp3", ".wav", ".m4a", ".ogg"}

LIVE_WINDOW_SECONDS = 90          # recent append => board is "live"
BUDGET_WARN = 0.50                # warn at 50% of budget
BUDGET_PAUSE = 0.90               # pause at 90% of budget

# checkpoint scope keyword -> canonical stage
_SCOPE_TO_STAGE = [
    ("deliver", "publish"),
    ("publish", "publish"),
    ("review", "review"),
    ("asset", "assets"),
    ("scene plan", "scene_plan"),
    ("scene_plan", "scene_plan"),
    ("art direction", "scene_plan"),
    ("storyboard", "scene_plan"),
    ("script", "script"),
    ("brief", "ingest"),
    ("intake", "ingest"),
    ("research", "research"),
]


# --------------------------------------------------------------------------
# safe readers
# --------------------------------------------------------------------------

def _read_json(path: Path) -> Optional[dict]:
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except (OSError, ValueError):
        return None


def _read_jsonl(path: Path, limit: Optional[int] = None) -> list[dict]:
    """Read an append-only JSONL file. Skips malformed lines. Never raises."""
    out: list[dict] = []
    try:
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
    except OSError:
        return out
    if limit:
        lines = lines[-limit:]
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except ValueError:
            continue
        if isinstance(obj, dict):
            out.append(obj)
    return out


def _rel(project_dir: Path, p: Path) -> str:
    try:
        return str(p.relative_to(project_dir)).replace("\\", "/")
    except ValueError:
        return p.name


# --------------------------------------------------------------------------
# SCF
# --------------------------------------------------------------------------

def _load_scf(project_dir: Path) -> Optional[dict]:
    """Find the canonical composition SCF (root first, then scf/)."""
    candidates = [project_dir / "composition.scf.json"]
    scf_dir = project_dir / "scf"
    if scf_dir.is_dir():
        candidates += sorted(scf_dir.glob("*.scf.json"))
    for c in candidates:
        data = _read_json(c)
        if data and isinstance(data.get("scenes"), list):
            return data
    return None


_ACRONYMS = {"cta", "api", "ui", "ux", "cli", "ai", "ml", "url", "sdk",
             "faq", "ide", "pr", "kpi", "roi", "llm", "rag", "seo", "crm"}


def _scene_title(scene_id: str) -> str:
    """'s5b-payoff' -> 'Payoff'; 's6-cta' -> 'CTA'; 's2-completions' -> 'Completions'."""
    s = re.sub(r"^s\d+[a-z]?\s*[-_:]?\s*", "", str(scene_id or ""), flags=re.I)
    s = s.replace("-", " ").replace("_", " ").strip()
    if not s:
        return str(scene_id or "Scene")
    return " ".join(w.upper() if w.lower() in _ACRONYMS else w.capitalize()
                     for w in s.split())


def _classify(scene: dict, treatment: str) -> tuple[str, str, Optional[str]]:
    """Return (treatment_class, technique_label, component_name).

    treatment_class in {chrome, hand, generated}. Chrome = reusable product
    surface; hand = hand-stitched design (bespoke); generated = image/video.
    """
    comp = scene.get("component")
    layers = scene.get("layers") or []
    ltypes = [l.get("type") for l in layers if isinstance(l, dict)]
    nested = [l.get("component") for l in layers
              if isinstance(l, dict) and l.get("type") == "component"]
    name = comp or (nested[0] if nested else None)
    has_video = "video" in ltypes
    has_text = "text" in ltypes
    has_img = "image" in ltypes
    tl = (treatment or "").lower()

    # bespoke type over a generated bed (Sora / image) -> hand-stitched
    if "sora" in tl or (has_video and has_text):
        return "hand", "kinetic + Sora", None
    if comp in CHROME_COMPONENTS or (
        name and (name.endswith("Scene") or name.endswith("Frame"))
        and name not in GENERATED_COMPONENTS
    ):
        return "chrome", name, name
    if "kinetic" in tl or (has_text and not comp):
        return "hand", "kinetic type", name
    if comp in GENERATED_COMPONENTS or "generated-image" in tl or "image-hero" in tl:
        return "generated", "generated image", name
    if has_img:
        return "generated", "image", name
    if has_video:
        return "generated", "video", None
    if name:
        return "hand", _pretty_component(name), name
    return "hand", "custom", None


def _pretty_component(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", " ", name).strip()


# --------------------------------------------------------------------------
# ledger / cost
# --------------------------------------------------------------------------

def _narration_seconds(ledger: list[dict]) -> dict[str, float]:
    """Map narration wav basename -> seconds (from TTS ledger entries)."""
    out: dict[str, float] = {}
    for e in ledger:
        if "tts" not in str(e.get("tool", "")).lower():
            continue
        art = str(e.get("artifact", ""))
        secs = (e.get("units") or {}).get("seconds")
        if art and isinstance(secs, (int, float)):
            out[Path(art).name] = float(secs)
    return out


def _build_cost(ledger: list[dict], marker: dict) -> dict:
    budget = float(marker.get("budget_usd") or 0) or None
    by_tool: dict[str, float] = {}
    spent = 0.0
    for e in ledger:
        c = e.get("cost_usd")
        if isinstance(c, (int, float)):
            spent += float(c)
            tool = str(e.get("tool", "unknown"))
            by_tool[tool] = round(by_tool.get(tool, 0.0) + float(c), 4)
    return {
        "spent_usd": round(spent, 4),
        "budget_usd": budget,
        "by_tool": dict(sorted(by_tool.items(), key=lambda kv: -kv[1])),
        "calls": len([e for e in ledger if isinstance(e.get("cost_usd"), (int, float))]),
        "warn_usd": round(budget * BUDGET_WARN, 2) if budget else None,
        "pause_usd": round(budget * BUDGET_PAUSE, 2) if budget else None,
        "pct": round(spent / budget, 4) if budget else None,
    }


# --------------------------------------------------------------------------
# decisions -> stage rail, gate, trail, treatments
# --------------------------------------------------------------------------

def _scope_stage(scope: str) -> Optional[str]:
    s = (scope or "").lower()
    for kw, stage in _SCOPE_TO_STAGE:
        if kw in s:
            return stage
    return None


def _checkpoints(decisions: list[dict]) -> tuple[dict[str, dict], Optional[dict]]:
    """Return (stage -> latest checkpoint info, active unresolved gate or None)."""
    resolved: dict[str, dict] = {}
    for d in decisions:
        if d.get("type") == "checkpoint_resolved" and d.get("checkpoint_id"):
            resolved[d["checkpoint_id"]] = d
    by_stage: dict[str, dict] = {}
    active: Optional[dict] = None
    for d in decisions:
        if d.get("type") != "checkpoint":
            continue
        stage = _scope_stage(d.get("scope", ""))
        cid = d.get("checkpoint_id")
        res = resolved.get(cid)
        info = {
            "checkpoint_id": cid,
            "checkpoint_type": d.get("checkpoint_type"),
            "scope": d.get("scope"),
            "shown": d.get("shown"),
            "ts": d.get("ts"),
            "resolved": bool(res),
            "verdict": (res or {}).get("verdict"),
            "note": (res or {}).get("note"),
            "stage": stage,
        }
        if stage:
            by_stage[stage] = info          # last checkpoint per stage wins
        if not res:
            active = info                   # last unresolved wins
    return by_stage, active


def _scene_treatments(decisions: list[dict]) -> dict[str, str]:
    out: dict[str, str] = {}
    for d in decisions:
        if d.get("type") == "scene_treatment" and d.get("scene_id"):
            out[str(d["scene_id"])] = str(d.get("treatment", ""))
    return out


def _build_stage_rail(project_dir: Path, decisions: list[dict],
                      scf: Optional[dict], review: Optional[dict]) -> list[dict]:
    cps, _ = _checkpoints(decisions)
    delivered = any(d.get("type") == "delivered" for d in decisions)
    renders_dir = project_dir / "renders"
    rendered = any(d.get("type") == "render_complete" for d in decisions) or \
        (renders_dir.is_dir() and any(renders_dir.glob("*.mp4")))

    present = {
        "ingest": (project_dir / "brief.md").exists(),
        "research": (project_dir / "brief.md").exists(),
        "script": (project_dir / "script.md").exists(),
        "scene_plan": (project_dir / "scene-plan.md").exists()
        or (project_dir / "art-direction.json").exists(),
        "assets": bool(_read_jsonl(project_dir / "ledger.jsonl", 1))
        or (project_dir / "assets").is_dir(),
        "compose": bool(scf) and rendered,
        "review": (project_dir / "review_report.json").exists(),
        "publish": delivered,
    }

    rail = []
    for name in CANONICAL_STAGES:
        cp = cps.get(name)
        gated = name in GATED_STAGES or bool(cp)
        if cp and not cp["resolved"]:
            status = "awaiting_human"
        elif present.get(name):
            status = "completed"
        else:
            status = "pending"
        sub = None
        if name == "review" and review:
            sub = f"{review.get('total_score','?')}/{review.get('max_score','?')} " + \
                  ("PASS" if review.get("passed") else "REVISE")
        elif cp and cp["resolved"] and cp.get("verdict"):
            sub = f"{cp.get('checkpoint_type','gate')} {cp['verdict']}"
        elif name == "research":
            sub = "auto"
        rail.append({
            "name": name,
            "status": status,
            "gated": gated,
            "gate_type": (cp or {}).get("checkpoint_type"),
            "verdict": (cp or {}).get("verdict"),
            "sub": sub,
        })
    return rail


def _decision_trail(decisions: list[dict], limit: int = 40) -> list[dict]:
    """Human-friendly, typed events for the provenance panel."""
    resolved = {d.get("checkpoint_id"): d for d in decisions
                if d.get("type") == "checkpoint_resolved"}
    trail = []
    for d in decisions:
        t = d.get("type")
        if t in ("checkpoint_resolved",):
            continue
        entry = {"ts": d.get("ts"), "type": t}
        if t == "director_loaded":
            entry.update(kind="director", title=Path(str(d.get("skill", ""))).stem,
                         why=d.get("rationale"))
        elif t == "treatment_chosen":
            entry.update(kind="treatment",
                         title=f"{d.get('choice','')} · {_shortval(d.get('value'))}",
                         why=d.get("rationale"))
        elif t == "scene_treatment":
            entry.update(kind="scene", title=f"{d.get('scene_id')} → {d.get('treatment')}",
                         why=d.get("rationale"))
        elif t == "checkpoint":
            res = resolved.get(d.get("checkpoint_id"))
            entry.update(kind="gate",
                         title=f"{d.get('checkpoint_type','gate')} · {d.get('scope','')}",
                         verdict=(res or {}).get("verdict"), why=(res or {}).get("note"))
        elif t == "critique_revision":
            entry.update(kind="critique", title=f"revised {d.get('scope','')}",
                         why=d.get("critique"))
        elif t == "candidate_selection":
            entry.update(kind="critique", title=f"selected {d.get('scope','')}",
                         why=d.get("rationale"))
        elif t == "render_complete":
            entry.update(kind="render",
                         title=f"render · {_fmt_dur(d.get('duration_sec'))} · "
                               f"{d.get('scenes','?')} scenes")
        elif t == "delivered":
            entry.update(kind="render", title="delivered")
        elif t in ("brief_finalized", "brief_updated"):
            entry.update(kind="treatment", title=t.replace("_", " "),
                         why=d.get("change"))
        else:
            entry.update(kind="note", title=str(t or "note"),
                         why=_shortval(d.get("note") or d.get("rationale")))
        if d.get("supersedes") and not entry.get("also"):
            entry["also"] = _shortval(d.get("supersedes"))
        trail.append(entry)
    return trail[-limit:][::-1]     # newest first


def _shortval(v: Any, n: int = 60) -> str:
    if v is None:
        return ""
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
    return s if len(s) <= n else s[: n - 1] + "…"


# --------------------------------------------------------------------------
# storyboard
# --------------------------------------------------------------------------

def _split_scene_maps(project_dir: Path) -> dict[str, str]:
    """scene id -> relative path of its split render (best keyframe source)."""
    out: dict[str, str] = {}
    d = project_dir / "renders" / "composition-split-scenes"
    if not d.is_dir():
        return out
    for f in sorted(d.glob("*.mp4")):
        if f.name.startswith("_"):
            continue
        stem = f.stem  # e.g. 02-s2-completions
        m = re.match(r"\d+[-_](.+)", stem)
        key = m.group(1) if m else stem
        out[key] = _rel(project_dir, f)
    return out


def _scene_layer_asset(scene: dict) -> Optional[tuple[str, str]]:
    """Best raster/video asset referenced directly by the scene (path, kind)."""
    for l in scene.get("layers") or []:
        if not isinstance(l, dict):
            continue
        if l.get("type") == "image" and l.get("src"):
            return l["src"], "image"
    for l in scene.get("layers") or []:
        if isinstance(l, dict) and l.get("type") == "video" and l.get("src"):
            return l["src"], "video"
    for l in scene.get("layers") or []:
        if isinstance(l, dict) and l.get("type") == "component":
            src = (l.get("props") or {}).get("imageSrc")
            if src:
                return src, "image"
    props = scene.get("props") or {}
    if props.get("imageSrc"):
        return props["imageSrc"], "image"
    return None


def _keyframe(project_dir: Path, scene: dict, splits: dict[str, str]) -> Optional[dict]:
    sid = str(scene.get("id", ""))
    if sid in splits:
        return {"path": splits[sid], "kind": "video", "source": "render"}
    for key, rel in splits.items():
        if sid and (sid in key or key in sid):
            return {"path": rel, "kind": "video", "source": "render"}
    asset = _scene_layer_asset(scene)
    if asset:
        path, kind = asset
        exists = (project_dir / path).exists()
        return {"path": path, "kind": kind, "source": "asset", "exists": exists}
    return None


def _build_storyboard(project_dir: Path, scf: Optional[dict],
                      decisions: list[dict], ledger: list[dict],
                      events: list[dict]) -> Optional[dict]:
    if not scf or not isinstance(scf.get("scenes"), list):
        return None
    meta = scf.get("metadata") or {}
    theme = meta.get("theme") or {}
    treatments = _scene_treatments(decisions)
    narr_secs = _narration_seconds(ledger)
    splits = _split_scene_maps(project_dir)

    # live "generating" from events (scene has an unfinished start)
    generating: dict[str, dict] = {}
    for ev in events:
        sid = ev.get("scene_id")
        if not sid or ev.get("depth"):
            continue
        if ev.get("event") == "start":
            generating[str(sid)] = ev
        elif ev.get("event") in ("finish", "error"):
            generating.pop(str(sid), None)

    scenes = []
    cursor = 0.0
    for i, sc in enumerate(scf["scenes"]):
        if not isinstance(sc, dict):
            continue
        sid = str(sc.get("id", f"scene-{i+1}"))
        dur = float(sc.get("duration") or 0)
        treatment = treatments.get(sid, "")
        cls, tech, comp = _classify(sc, treatment)
        narr_text = sc.get("narrationText") or ""
        narr_path = sc.get("narration")
        nsec = None
        if narr_path:
            nsec = narr_secs.get(Path(str(narr_path)).name)
        overflow = bool(nsec and dur and nsec > dur + 0.05)
        tight = bool(nsec and dur and not overflow and nsec > dur - 0.8)
        hero = bool(sc.get("hero_moment")) or "payoff" in sid or "hero" in sid
        scenes.append({
            "id": sid,
            "index": i + 1,
            "title": _scene_title(sid),
            "duration": round(dur, 2),
            "start": round(cursor, 2),
            "narration_text": narr_text,
            "narration_seconds": round(nsec, 2) if nsec else None,
            "narration_overflow": overflow,
            "narration_tight": tight,
            "transition": sc.get("transition"),
            "treatment_class": cls,
            "technique": tech,
            "component": comp,
            "hero": hero,
            "keyframe": _keyframe(project_dir, sc, splits),
            "generating": str(sid) in generating,
        })
        cursor += dur

    total = meta.get("totalDurationSec") or round(cursor, 2)
    return {
        "scenes": scenes,
        "total_duration_seconds": round(float(total), 2),
        "theme": theme,
        "captions": scf.get("captions"),
        "music": scf.get("music"),
        "variety": _variety(scenes),
    }


def _variety(scenes: list[dict]) -> dict:
    if not scenes:
        return {"flag": False, "verdict": "—"}
    classes = Counter(s["treatment_class"] for s in scenes)
    techs = [s["technique"] for s in scenes]
    tech_hist = Counter(techs)
    n = len(scenes)

    # adjacent repeats of NON-chrome techniques are the sameness trap;
    # chrome runs (real product surfaces) are allowed if layouts differ.
    non_chrome_adj = any(
        scenes[i]["technique"] == scenes[i + 1]["technique"]
        and scenes[i]["treatment_class"] != "chrome"
        for i in range(n - 1)
    )
    non_chrome_techs = [s["technique"] for s in scenes if s["treatment_class"] != "chrome"]
    dominant_share = (max(Counter(non_chrome_techs).values()) / n) if non_chrome_techs else 0
    chrome_run = max(
        (count for (val, count) in _runs(s["treatment_class"] == "chrome" for s in scenes) if val),
        default=0,
    )

    flag = non_chrome_adj or dominant_share > 0.5
    if flag:
        verdict = "check"
        note = "A non-chrome technique repeats or dominates — vary the design beats."
    elif chrome_run >= 2:
        verdict = "varied"
        note = (f"{chrome_run}-scene product-chrome run — allowed (real UI, distinct "
                f"layouts); bespoke beats bracket it.")
    else:
        verdict = "varied"
        note = "Each beat uses a distinct visual technique."
    return {
        "histogram": {k: classes.get(k, 0) for k in ("chrome", "hand", "generated")},
        "techniques": dict(tech_hist),
        "dominant_share": round(dominant_share, 2),
        "chrome_run": chrome_run,
        "flag": flag,
        "verdict": verdict,
        "note": note,
    }


def _runs(bools):
    """Yield (value, count) runs — helper for chrome-run detection."""
    cur = None
    count = 0
    for b in bools:
        if b == cur:
            count += 1
        else:
            if cur is not None:
                yield (cur, count)
            cur, count = b, 1
    if cur is not None:
        yield (cur, count)


# --------------------------------------------------------------------------
# governance + media
# --------------------------------------------------------------------------

def _governance(scf: Optional[dict], marker: dict, review: Optional[dict]) -> dict:
    meta = (scf or {}).get("metadata") or {}
    theme = meta.get("theme") or {}
    caps = (scf or {}).get("captions") or {}
    return {
        "brand_package": marker.get("brand_package"),
        "captions": bool(caps) and caps.get("style", "none") != "none",
        "caption_style": caps.get("style"),
        "theme_name": theme.get("name"),
        "music": bool((scf or {}).get("music")),
        "review_passed": (review or {}).get("passed"),
        "review_scores": (review or {}).get("scores"),
    }


def _media(project_dir: Path) -> dict:
    renders = []
    rd = project_dir / "renders"
    if rd.is_dir():
        for f in sorted(rd.glob("*.mp4"), key=lambda p: -p.stat().st_mtime):
            renders.append({"path": _rel(project_dir, f), "name": f.name,
                            "bytes": _safe_size(f)})
    return {"renders": renders}


def _safe_size(p: Path) -> Optional[int]:
    try:
        return p.stat().st_size
    except OSError:
        return None


def _last_activity(project_dir: Path) -> Optional[float]:
    latest = None
    for name in ("decisions.jsonl", "ledger.jsonl", "events.jsonl",
                 "composition.scf.json", "review_report.json"):
        p = project_dir / name
        try:
            m = p.stat().st_mtime
        except OSError:
            continue
        if latest is None or m > latest:
            latest = m
    return latest


def _fmt_dur(sec: Any) -> str:
    try:
        sec = float(sec)
    except (TypeError, ValueError):
        return "—"
    m, s = divmod(int(round(sec)), 60)
    return f"{m}:{s:02d}"


# --------------------------------------------------------------------------
# progressive (pre-SCF) derivation — script.md / art-direction.json / assets
# --------------------------------------------------------------------------
# The board must be a LIVING storyboard: it surfaces artifacts AS the pipeline
# writes them, not only once composition.scf.json lands near the end. When there
# is no SCF yet, derive a "planned" storyboard from script.md (narration),
# art-direction.json (per-scene technique + theme + captions) and the narration
# `.words.json` sidecars (measured seconds). Same payload shape as the SCF
# storyboard, so the UI renders it 1:1 and simply enriches later.

_SCRIPT_SCENE_RE = re.compile(r"^##\s*Scene\s*(\d+)\s*[\u2014\-:]\s*(.+?)\s*$", re.I)
_DUR_HINT_RE = re.compile(r"\(~?\s*([\d.]+)\s*s\)\s*$")


def _read_text(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


def _parse_script_scenes(project_dir: Path) -> list[dict]:
    """Parse script.md '## Scene N — Title (~Xs)' headings + '>' narration blocks."""
    text = _read_text(project_dir / "script.md")
    if not text:
        return []
    scenes: list[dict] = []
    cur: Optional[dict] = None
    for raw in text.splitlines():
        stripped = raw.strip()
        m = _SCRIPT_SCENE_RE.match(stripped)
        if m:
            if cur:
                scenes.append(cur)
            title = m.group(2).strip()
            dh = _DUR_HINT_RE.search(title)
            dur_hint = float(dh.group(1)) if dh else None
            title = _DUR_HINT_RE.sub("", title).strip()
            cur = {"index": int(m.group(1)), "title": title, "_narr": [], "dur_hint": dur_hint}
        elif cur is not None and stripped.startswith(">"):
            cur["_narr"].append(stripped.lstrip(">").strip())
    if cur:
        scenes.append(cur)
    for sc in scenes:
        sc["narration_text"] = " ".join(x for x in sc.pop("_narr") if x).strip()
    return scenes


def _sidecar_duration(project_dir: Path, index: int) -> Optional[float]:
    """Measured narration seconds from a `.words.json` sidecar, if present."""
    nd = project_dir / "assets" / "narration"
    for name in (f"s{index:02d}", f"s{index}", f"scene-{index}", f"scene{index}"):
        data = _read_json(nd / f"{name}.words.json")
        if data and isinstance(data.get("duration"), (int, float)):
            return float(data["duration"])
    return None


def _short_technique(s: str) -> str:
    head = re.split(r"[+(\[\u2014]", s or "", 1)[0].strip()
    return head or "custom"


def _classify_planned(tech_str: str) -> tuple[str, str, Optional[str]]:
    t = (tech_str or "").lower()
    label = _short_technique(tech_str)
    if any(k in t for k in ("chrome", "terminal", "excel", "vscode", "teams",
                            "outlook", "browser", "screen demo", "azure portal", "github")):
        return "chrome", label, None
    if any(k in t for k in ("generated-image", "generated image", "gen-image",
                            "image hero", "sora", "photo bed", "imagebackdrop")):
        return "generated", label, None
    return "hand", label, None


def _build_planned_storyboard(project_dir: Path, decisions: list[dict],
                              ledger: list[dict], events: list[dict]) -> Optional[dict]:
    """Storyboard derived from script.md + art-direction.json BEFORE the SCF exists."""
    script_scenes = _parse_script_scenes(project_dir)
    ad = _read_json(project_dir / "art-direction.json") or {}
    treatments = ad.get("sceneTreatments") or {}
    if not script_scenes and not treatments:
        return None

    theme = ad.get("theme") or {}
    caps = ad.get("captions") or {}
    layers = ad.get("productionLayers") or {}

    generating: dict[str, dict] = {}
    for ev in events:
        sid = ev.get("scene_id")
        if not sid or ev.get("depth"):
            continue
        if ev.get("event") == "start":
            generating[str(sid)] = ev
        elif ev.get("event") in ("finish", "error"):
            generating.pop(str(sid), None)

    by_idx = {sc["index"]: sc for sc in script_scenes}
    tkeys = []
    for k in treatments:
        mm = re.match(r"s0*(\d+)$", str(k))
        if mm:
            tkeys.append(int(mm.group(1)))
    n = max([*by_idx.keys(), *tkeys, 0])

    scenes = []
    cursor = 0.0
    for i in range(1, n + 1):
        sc = by_idx.get(i, {})
        sid = f"s{i}"
        tech_str = treatments.get(f"s{i}") or treatments.get(f"s{i:02d}") or ""
        cls, tech, comp = _classify_planned(tech_str)
        nsec = _sidecar_duration(project_dir, i)
        dur = (nsec + 0.5) if nsec else float(sc.get("dur_hint") or 0.0)
        keyframe = None
        if cls == "generated":
            hero = project_dir / "assets" / "images" / f"s{i:02d}-hero.png"
            if hero.exists():
                keyframe = {"path": _rel(project_dir, hero), "kind": "image",
                            "source": "asset", "exists": True}
        scenes.append({
            "id": sid,
            "index": i,
            "title": sc.get("title") or _scene_title(sid),
            "duration": round(dur, 2),
            "start": round(cursor, 2),
            "narration_text": sc.get("narration_text", ""),
            "narration_seconds": round(nsec, 2) if nsec else None,
            "narration_overflow": False,
            "narration_tight": False,
            "transition": None,
            "treatment_class": cls,
            "technique": tech,
            "component": comp,
            "hero": "hero" in tech_str.lower(),
            "keyframe": keyframe,
            "generating": sid in generating,
            "status": "planned",
        })
        cursor += dur
    if not scenes:
        return None
    variety = _variety(scenes) if treatments else {
        "flag": False, "verdict": "planned",
        "note": "Scene techniques appear once the art direction is set.",
        "histogram": {}, "techniques": {}, "dominant_share": 0, "chrome_run": 0,
    }
    return {
        "scenes": scenes,
        "total_duration_seconds": round(cursor, 2),
        "theme": theme,
        "captions": ({"style": caps.get("style")} if caps else None),
        "music": ({"src": "(built-in library)"} if layers.get("music") else None),
        "variety": variety,
        "planned": True,
    }


# --------------------------------------------------------------------------
# public API
# --------------------------------------------------------------------------

def load_board_state(project_dir: Path) -> dict[str, Any]:
    """Full BoardState for one project. Never raises."""
    project_dir = Path(project_dir)
    slug = project_dir.name
    try:
        marker = _read_json(project_dir / "project.json") or {}
        scf = _load_scf(project_dir)
        decisions = _read_jsonl(project_dir / "decisions.jsonl", limit=500)
        ledger = _read_jsonl(project_dir / "ledger.jsonl", limit=500)
        events = _read_jsonl(project_dir / "events.jsonl", limit=400)
        review = _read_json(project_dir / "review_report.json")

        meta = (scf or {}).get("metadata") or {}
        title = meta.get("title") or marker.get("name") or slug.replace("-", " ").title()
        stages = _build_stage_rail(project_dir, decisions, scf, review)
        _, active_gate = _checkpoints(decisions)
        storyboard = _build_storyboard(project_dir, scf, decisions, ledger, events) \
            or _build_planned_storyboard(project_dir, decisions, ledger, events)
        cost = _build_cost(ledger, marker)

        last = _last_activity(project_dir)
        now = time.time()
        delivered = any(d.get("type") == "delivered" for d in decisions)
        rendered = bool((storyboard or {}).get("scenes")) and \
            any(s["status"] == "completed" for s in stages if s["name"] == "compose")

        return {
            "slug": slug,
            "title": title,
            "voice": meta.get("voice"),
            "budget_usd": marker.get("budget_usd"),
            "created_at": marker.get("created_at"),
            "stages": stages,
            "active_gate": active_gate,
            "awaiting_human": bool(active_gate),
            "storyboard": storyboard,
            "cost": cost,
            "decisions": _decision_trail(decisions),
            "governance": _governance(scf, marker, review),
            "media": _media(project_dir),
            "review": review,
            "delivered": delivered,
            "rendered": rendered,
            "last_activity": last,
            "live": bool(last and (now - last) < LIVE_WINDOW_SECONDS),
            "has_scf": bool(scf),
            "has_logs": bool(decisions or ledger),
        }
    except Exception as exc:  # never break the board
        return {
            "slug": slug, "title": slug.replace("-", " ").title(),
            "stages": [], "storyboard": None, "cost": {}, "decisions": [],
            "governance": {}, "media": {"renders": []}, "error": str(exc),
            "has_scf": False, "has_logs": False, "live": False,
        }


def summarize_project(project_dir: Path) -> dict[str, Any]:
    """Cheap library-card summary (no full storyboard parse)."""
    project_dir = Path(project_dir)
    slug = project_dir.name
    marker = _read_json(project_dir / "project.json") or {}
    scf = _load_scf(project_dir)
    decisions = _read_jsonl(project_dir / "decisions.jsonl", limit=200)
    ledger = _read_jsonl(project_dir / "ledger.jsonl", limit=500)
    review = _read_json(project_dir / "review_report.json")
    meta = (scf or {}).get("metadata") or {}
    _, active_gate = _checkpoints(decisions)
    stages = _build_stage_rail(project_dir, decisions, scf, review)
    scenes = (scf or {}).get("scenes") or _parse_script_scenes(project_dir)
    last = _last_activity(project_dir)
    now = time.time()
    poster = None
    rd = project_dir / "renders"
    if rd.is_dir():
        mp4s = sorted(rd.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
        if mp4s:
            poster = {"path": _rel(project_dir, mp4s[0]), "kind": "video"}
    theme = meta.get("theme") or {}
    return {
        "slug": slug,
        "title": meta.get("title") or marker.get("name") or slug.replace("-", " ").title(),
        "scene_count": len(scenes),
        "duration": meta.get("totalDurationSec"),
        "spent_usd": _build_cost(ledger, marker)["spent_usd"],
        "budget_usd": marker.get("budget_usd"),
        "awaiting_human": bool(active_gate),
        "delivered": any(d.get("type") == "delivered" for d in decisions),
        "accent": theme.get("primary") or theme.get("accent"),
        "accent2": theme.get("accent"),
        "stage_states": [{"name": s["name"], "status": s["status"]} for s in stages],
        "poster": poster,
        "live": bool(last and (now - last) < LIVE_WINDOW_SECONDS),
        "last_activity": last,
    }


def list_projects() -> list[dict]:
    if not PROJECTS_DIR.is_dir():
        return []
    out = []
    for d in sorted(PROJECTS_DIR.iterdir()):
        if not d.is_dir() or d.name.startswith((".", "_")):
            continue
        try:
            out.append(summarize_project(d))
        except Exception:
            continue
    out.sort(key=lambda s: s.get("last_activity") or 0, reverse=True)
    return out
