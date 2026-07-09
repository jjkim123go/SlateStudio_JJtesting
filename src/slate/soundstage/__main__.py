"""``python -m slate.soundstage`` — open or serve the living storyboard.

    python -m slate.soundstage open <slug>     # start (if needed) + open the board
    python -m slate.soundstage open             # open the library
    python -m slate.soundstage serve            # just run the server

The agent's only board duty is ``open <slug>`` at project creation. It is
idempotent (reuses a running server) and non-fatal: if it can't start, the
production continues — the board is an observer, never a blocker.
"""

from __future__ import annotations

import argparse
import sys
import urllib.request

from . import DEFAULT_PORT
from .server import _open_surface, serve


def _server_up(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=0.6) as r:
            return r.status == 200
    except Exception:
        return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="slate.soundstage",
                                     description="Slate's living storyboard.")
    sub = parser.add_subparsers(dest="cmd")

    p_open = sub.add_parser("open", help="open the board (start server if needed)")
    p_open.add_argument("slug", nargs="?", default=None)
    p_open.add_argument("--port", type=int, default=DEFAULT_PORT)
    p_open.add_argument("--surface", choices=["auto", "vscode", "browser", "both"],
                        default="auto")
    p_open.add_argument("--reload", action="store_true",
                        help="dev: hot-reload state.py on each request (no restart)")

    p_serve = sub.add_parser("serve", help="run the server (no browser)")
    p_serve.add_argument("--port", type=int, default=DEFAULT_PORT)
    p_serve.add_argument("--reload", action="store_true",
                         help="dev: hot-reload state.py on each request (no restart)")

    args = parser.parse_args(argv)
    cmd = args.cmd or "open"

    if cmd == "serve":
        serve(args.port, reload=args.reload)
        return 0

    # open
    port = args.port
    slug = args.slug
    if _server_up(port):
        url = f"http://127.0.0.1:{port}/" + (f"p/{slug}" if slug else "")
        print(f"Soundstage already running → {url}")
        _open_surface(url, args.surface)
        return 0
    # not running → start it and open once ready
    serve(port, open_browser_slug=slug if slug is not None else "",
          surface=args.surface, reload=args.reload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
