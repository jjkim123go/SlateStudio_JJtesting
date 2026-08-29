"""Soundstage server — a near read-only local board over ``projects/``.

Stdlib-only by default (``http.server``) so ``pip install slate`` stays lean.
A background watcher polls project mtimes and pushes change notifications to
browsers over SSE; the browser refetches board state. The server NEVER executes
project code and reads JSON / MD / media only. The ONE write it makes is an
explicit, human-initiated gate action (Approve / Request changes) that APPENDS a
``checkpoint_resolved`` decision to ``decisions.jsonl`` — append-only, never
modifying or deleting existing state.

If ``watchfiles`` is installed it is used for instant change detection instead
of the mtime poll (optional turbo, never required).

Lineage: The local read-only server, filesystem watcher, and live board update
model carry direct lineage from OpenMontage Backlot (PR #273, AGPL-3.0). See
docs/OPENMONTAGE_LINEAGE.md.
"""

from __future__ import annotations

import json
import queue
import shutil
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from . import DEFAULT_PORT
from . import state as _state
from .paths import CACHE_DIR, PROJECTS_DIR
from .state import list_projects, load_board_state, summarize_project  # noqa: F401

# Dev convenience: when True, hot-reload the state module before each state read
# so edits to state.py take effect without restarting the server (`--reload`).
RELOAD = False


def _maybe_reload() -> None:
    if RELOAD:
        try:
            import importlib
            importlib.reload(_state)
        except Exception:
            pass


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

UI_DIR = Path(__file__).resolve().parent / "ui"
_SLUG_OK = __import__("re").compile(r"^[a-z0-9][a-z0-9._-]*$")
_FFMPEG = shutil.which("ffmpeg")
SSE_HEARTBEAT = 15.0
WATCH_INTERVAL = 0.8

_MIME = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4",
}


# --------------------------------------------------------------------------
# change fan-out
# --------------------------------------------------------------------------

class ChangeHub:
    """Fan out project-change notifications to SSE subscribers.

    Each subscriber optionally filters to one project so a burst on project A
    can't flood a board watching project B.
    """

    def __init__(self) -> None:
        self._subs: dict[queue.Queue, str | None] = {}
        self._lock = threading.Lock()

    def subscribe(self, slug: str | None = None) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=64)
        with self._lock:
            self._subs[q] = slug
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        with self._lock:
            self._subs.pop(q, None)

    def publish(self, slug: str) -> None:
        with self._lock:
            subs = list(self._subs.items())
        for q, only in subs:
            if only is not None and only != slug:
                continue
            try:
                q.put_nowait(slug)
            except queue.Full:
                pass


HUB = ChangeHub()


def _project_signature() -> dict[str, float]:
    """Per-project max mtime across state-bearing files (cheap, bounded)."""
    sig: dict[str, float] = {}
    if not PROJECTS_DIR.is_dir():
        return sig
    for d in PROJECTS_DIR.iterdir():
        if not d.is_dir() or d.name.startswith((".", "_")):
            continue
        latest = 0.0
        for name in ("decisions.jsonl", "ledger.jsonl", "events.jsonl",
                     "composition.scf.json", "review_report.json", "project.json",
                     "brief.md", "research.md", "script.md", "scene-plan.md",
                     "art-direction.json"):
            try:
                latest = max(latest, (d / name).stat().st_mtime)
            except OSError:
                pass
        narration_dir = d / "assets" / "narration"
        if narration_dir.is_dir():
            for sidecar in narration_dir.glob("*.words.json"):
                try:
                    latest = max(latest, sidecar.stat().st_mtime)
                except OSError:
                    pass
        sig[d.name] = latest
    return sig


def _watch_loop() -> None:
    prev = _project_signature()
    while True:
        time.sleep(WATCH_INTERVAL)
        try:
            cur = _project_signature()
        except Exception:
            continue
        for slug, m in cur.items():
            if prev.get(slug) != m:
                HUB.publish(slug)
        prev = cur


# --------------------------------------------------------------------------
# thumbnails (extracted video poster / downscaled image), cached on disk
# --------------------------------------------------------------------------

def _thumb(project_dir: Path, rel: str) -> Path | None:
    src = _fenced(project_dir, rel)
    if src is None or not src.exists():
        return None
    try:
        mtime = int(src.stat().st_mtime)
    except OSError:
        return None
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = f"{project_dir.name}_{rel}_{mtime}".replace("/", "_").replace("\\", "_")
    out = CACHE_DIR / f"{key}.jpg"
    if out.exists():
        return out
    ext = src.suffix.lower()
    try:
        if ext in {".mp4", ".webm", ".mov"} and _FFMPEG:
            subprocess.run(
                [_FFMPEG, "-y", "-ss", "1.2", "-i", str(src), "-frames:v", "1",
                 "-vf", "scale=720:-2", "-q:v", "4", str(out)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20, check=False,
            )
        else:
            try:
                from PIL import Image
                im = Image.open(src)
                im.thumbnail((720, 720))
                im.convert("RGB").save(out, "JPEG", quality=82)
            except Exception:
                return src  # serve original if Pillow unavailable
    except Exception:
        return None
    return out if out.exists() else None


# --------------------------------------------------------------------------
# path fencing (security: never read outside the project dir)
# --------------------------------------------------------------------------

def _project_dir(slug: str) -> Path | None:
    if not slug or not _SLUG_OK.match(slug) or ".." in slug:
        return None
    d = (PROJECTS_DIR / slug)
    try:
        d.resolve().relative_to(PROJECTS_DIR.resolve())
    except (ValueError, OSError):
        return None
    return d if d.is_dir() else None


def _fenced(project_dir: Path, rel: str) -> Path | None:
    rel = unquote(rel or "").lstrip("/")
    if ".." in rel:
        return None
    p = (project_dir / rel)
    try:
        p.resolve().relative_to(project_dir.resolve())
    except (ValueError, OSError):
        return None
    return p


# --------------------------------------------------------------------------
# request handler
# --------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = "Soundstage/0.1"

    def log_message(self, *args):  # keep the console quiet
        pass

    def handle(self):
        # Clients dropping SSE/media connections is normal — don't dump tracebacks.
        try:
            super().handle()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError, OSError):
            pass

    # ---- helpers ----
    def _send(self, code: int, body: bytes, ctype: str, extra: dict | None = None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _json(self, obj, code: int = 200):
        self._send(code, json.dumps(obj).encode("utf-8"), "application/json")

    def _file(self, path: Path, code: int = 200):
        try:
            data = path.read_bytes()
        except OSError:
            return self._send(404, b"not found", "text/plain")
        self._send(code, data, _MIME.get(path.suffix.lower(), "application/octet-stream"))

    def _static(self, name: str):
        p = (UI_DIR / name)
        try:
            p.resolve().relative_to(UI_DIR.resolve())
        except (ValueError, OSError):
            return self._send(404, b"not found", "text/plain")
        if not p.is_file():
            return self._send(404, b"not found", "text/plain")
        self._file(p)

    # ---- routing ----
    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        try:
            if path == "/" or path == "/index.html":
                return self._static("index.html")
            if path.startswith("/p/"):
                return self._static("board.html")
            if path.startswith("/ui/"):
                return self._static(path[len("/ui/"):])
            if path == "/api/health":
                return self._json({"ok": True, "app": "soundstage"})
            if path == "/api/projects":
                _maybe_reload()
                return self._json(_state.list_projects())
            if path.startswith("/api/project/") and path.endswith("/state"):
                slug = path[len("/api/project/"):-len("/state")]
                d = _project_dir(slug)
                _maybe_reload()
                return self._json(_state.load_board_state(d) if d else {"error": "not found"},
                                  200 if d else 404)
            if path.startswith("/api/project/") and path.endswith("/events"):
                slug = path[len("/api/project/"):-len("/events")]
                return self._sse(slug if _project_dir(slug) else None)
            if path == "/api/library/events":
                return self._sse(None)
            if path.startswith("/media/"):
                return self._serve_media(path[len("/media/"):], thumb=False)
            if path.startswith("/thumb/"):
                return self._serve_media(path[len("/thumb/"):], thumb=True)
            return self._send(404, b"not found", "text/plain")
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as exc:  # never 500 the board into a crash loop
            try:
                self._json({"error": str(exc)}, 500)
            except Exception:
                pass

    # ---- the one write: human gate actions (Approve / Request changes) ----
    _VERDICTS = {"approved", "changes_requested", "rejected"}

    def do_POST(self):
        path = unquote(urlparse(self.path).path)
        try:
            if path.startswith("/api/project/") and path.endswith("/gate"):
                slug = path[len("/api/project/"):-len("/gate")]
                d = _project_dir(slug)
                if d is None:
                    return self._json({"error": "not found"}, 404)
                return self._gate_action(d, slug)
            return self._send(404, b"not found", "text/plain")
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as exc:
            try:
                self._json({"error": str(exc)}, 500)
            except Exception:
                pass

    def _read_body(self) -> dict:
        try:
            n = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(n) if n > 0 else b""
            obj = json.loads(raw.decode("utf-8")) if raw else {}
            return obj if isinstance(obj, dict) else {}
        except Exception:
            return {}

    def _gate_action(self, project_dir: Path, slug: str):
        """Append a human gate decision (Approve / Request changes) so the agent
        sees it on its next read. This is the ONLY write Soundstage makes —
        append-only, human-initiated, localhost-only."""
        body = self._read_body()
        verdict = str(body.get("verdict") or "").strip().lower()
        if verdict not in self._VERDICTS:
            return self._json({"error": "invalid verdict"}, 400)
        cid = str(body.get("checkpoint_id") or "").strip() or None
        note = str(body.get("note") or "").strip()
        if not cid:                          # resolve whatever gate is open now
            gate = (_state.load_board_state(project_dir).get("active_gate") or {})
            cid = gate.get("checkpoint_id")
        entry = {
            "ts": _now_iso(),
            "type": "checkpoint_resolved",
            "checkpoint_id": cid,
            "verdict": verdict,
            "note": note or f"{verdict.replace('_', ' ')} via Soundstage",
            "source": "soundstage",
        }
        try:                                 # APPEND-ONLY — never rewrites state
            with open(project_dir / "decisions.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
        except OSError as exc:
            return self._json({"error": str(exc)}, 500)
        HUB.publish(slug)
        return self._json({"ok": True, "resolved": cid, "verdict": verdict})

    def _serve_media(self, tail: str, *, thumb: bool):
        parts = tail.split("/", 1)
        if len(parts) != 2:
            return self._send(404, b"not found", "text/plain")
        slug, rel = parts
        d = _project_dir(slug)
        if d is None:
            return self._send(404, b"not found", "text/plain")
        if thumb:
            t = _thumb(d, rel)
            return self._file(t) if t else self._send(404, b"no thumb", "text/plain")
        f = _fenced(d, rel)
        if f is None or not f.is_file():
            return self._send(404, b"not found", "text/plain")
        return self._file(f)

    def _sse(self, slug: str | None):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        q = HUB.subscribe(slug)

        def write(payload: dict) -> bool:
            try:
                self.wfile.write(f"data: {json.dumps(payload)}\n\n".encode("utf-8"))
                self.wfile.flush()
                return True
            except (BrokenPipeError, ConnectionResetError, OSError):
                return False

        try:
            if not write({"type": "hello", "slug": slug}):
                return
            while True:
                try:
                    changed = q.get(timeout=SSE_HEARTBEAT)
                except queue.Empty:
                    if not write({"type": "heartbeat", "ts": time.time()}):
                        return
                    continue
                while not q.empty():          # coalesce a burst
                    try:
                        q.get_nowait()
                    except queue.Empty:
                        break
                if not write({"type": "change", "slug": changed}):
                    return
        finally:
            HUB.unsubscribe(q)


# --------------------------------------------------------------------------
# lifecycle
# --------------------------------------------------------------------------

def serve(port: int = DEFAULT_PORT, *, open_browser_slug: str | None = None,
          surface: str = "auto", reload: bool = False) -> None:
    global RELOAD
    RELOAD = reload
    # optional watchfiles turbo
    try:
        import watchfiles  # noqa: F401
        _start_watchfiles()
    except Exception:
        threading.Thread(target=_watch_loop, daemon=True).start()

    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    httpd.daemon_threads = True
    root = f"http://127.0.0.1:{port}/"
    url = root + (f"p/{open_browser_slug}" if open_browser_slug else "")
    print(f"Soundstage → {url}")
    print(f"  projects: {PROJECTS_DIR}")
    if open_browser_slug is not None:
        _open_surface(url, surface)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nSoundstage stopped.")


def _start_watchfiles() -> None:
    import watchfiles

    def loop():
        for changes in watchfiles.watch(PROJECTS_DIR, recursive=True):
            touched: set[str] = set()
            for _c, p in changes:
                try:
                    rel = Path(p).resolve().relative_to(PROJECTS_DIR.resolve())
                    touched.add(rel.parts[0])
                except (ValueError, OSError, IndexError):
                    pass
            for slug in touched:
                HUB.publish(slug)

    threading.Thread(target=loop, daemon=True).start()


def _open_surface(url: str, surface: str) -> None:
    """Open the board in the browser and/or inside VS Code (Simple Browser)."""
    import os
    # The external browser is the reliable default.  The old `auto` behavior
    # silently preferred VS Code whenever TERM_PROGRAM=vscode; `code --command`
    # can return successfully without opening/focusing a Simple Browser tab,
    # leaving the user with no visible board.  Keep VS Code as an explicit
    # opt-in surface and make `both` genuinely open both surfaces.
    in_vscode = surface in ("vscode", "both")
    want_browser = surface in ("auto", "browser", "both")
    if in_vscode:
        code = shutil.which("code") or shutil.which("code-insiders")
        if code:
            try:
                subprocess.Popen([code, "--command", "simpleBrowser.show", url],
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                want_browser = True
        else:
            want_browser = True
    if want_browser:
        try:
            import webbrowser
            webbrowser.open_new_tab(url)
        except Exception:
            pass
