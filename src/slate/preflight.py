"""``python -m slate.preflight`` — read-only capability report for the agent.

Run this at the start of every session (or any time you suspect drift between
the docs and the code) to get the live tool inventory: what is registered,
what is unavailable, what failed to import, and what the agent can offer the
user RIGHT NOW.

This entry point performs no network calls, no file writes, no Azure auth.
It only imports tool modules and instantiates them; tools that defer work
to ``execute()`` are completely safe to introspect.

Usage:
    python -m slate.preflight              # full JSON report
    python -m slate.preflight --summary    # one-line per tool
    python -m slate.preflight --json-only  # pure JSON to stdout (for piping)
"""

from __future__ import annotations

import argparse
import json
import sys

from slate.core.music_library import discover_music_sources
from slate.core.tool_registry import registry


def _scrub_for_windows(text: str) -> str:
    """Make output safe on Windows cp1252 stdout (em-dash, smart quotes, etc.)."""
    return (
        text
        .replace("\u2014", "--")
        .replace("\u2013", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )


def _print(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        print(_scrub_for_windows(text))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="slate.preflight",
        description="Live capability report for the Slate agent.",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print a one-line-per-tool human summary instead of full JSON.",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Pure JSON to stdout (no banner). Use for piping.",
    )
    args = parser.parse_args(argv)

    count = registry.discover()
    report = registry.provider_menu_summary()
    report["music_sources"] = discover_music_sources()

    if args.json_only:
        print(json.dumps(report, indent=2, default=str))
        return 0

    if args.summary:
        _print(f"Slate preflight: {count} tool(s) discovered\n")
        for tier, names in sorted(report["tools_by_tier"].items()):
            _print(f"  [{tier}]")
            for name in names:
                tool = registry.get(name)
                if tool is None:
                    continue
                avail = "OK " if registry.is_available(tool) else "?? "
                _print(f"    {avail} {name:25s} {tool.runtime.value:7s} {tool.capability}")
        if report["runtime_warnings"]:
            _print("\nWarnings:")
            for w in report["runtime_warnings"]:
                _print(f"  - {w}")
        music = report["music_sources"]
        built_in = music["built_in_source"]
        _print("\nMusic:")
        _print(f"  Built-in library: {'OK' if built_in['found'] else 'missing'} ({built_in['track_count']} file(s))")
        if built_in.get("missing_manifest_tracks"):
            _print(f"  Missing manifest tracks: {len(built_in['missing_manifest_tracks'])}")
        return 0

    _print("=" * 70)
    _print(f"Slate preflight report -- {count} tool(s) discovered")
    _print("=" * 70)
    print(json.dumps(report, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
