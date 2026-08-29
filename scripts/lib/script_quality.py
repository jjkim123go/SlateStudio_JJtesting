"""Diagnostic checks for Slate narration scripts.

This module reports measurable risk signals. It does not detect AI authorship
or certify relevance, coherence, tone, or naturalness; those require the script
comprehension checkpoint in skills/meta/checkpoint-protocol.md.
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
from collections import Counter
from pathlib import Path
from typing import Any

import yaml

SCENE_HEADING = re.compile(r"^## Scene\s+(\d+):\s*(.+)$", re.MULTILINE)
SENTENCE = re.compile(r"(?<=[.!?])\s+")
WORD = re.compile(r"[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)?")
ESTIMATED_DURATION = re.compile(r"\*Estimated duration:\s*([\d.]+)\s*seconds?\*", re.I)
CANONICAL_DURATION = re.compile(r"\*Duration:\s*([\d.]+)s\b", re.I)

PLACEHOLDER_PHRASES = (
    "in today's world",
    "it is important to understand",
    "as we move forward",
    "let's explore",
    "in conclusion",
)

TRANSITION_OPENINGS = (
    "additionally",
    "furthermore",
    "moreover",
    "however",
    "in contrast",
    "on the other hand",
    "ultimately",
)

DISCLAIMER = (
    "Diagnostic warnings only. This tool does not detect AI authorship or "
    "approve prose quality."
)


def _frontmatter(text: str) -> dict[str, Any]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end < 0:
        return {}
    parsed = yaml.safe_load(text[4:end]) or {}
    return parsed if isinstance(parsed, dict) else {}


def parse_script_scenes(text: str) -> list[dict[str, Any]]:
    """Parse canonical Slate scene headings, narration, and declared duration."""
    matches = list(SCENE_HEADING.finditer(text))
    scenes: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        body_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end():body_end].strip()
        narration_lines: list[str] = []
        for line in body.splitlines():
            stripped = line.strip()
            if stripped.startswith("[") or stripped.startswith("*") or stripped == "---":
                break
            if stripped:
                narration_lines.append(stripped)
        duration_match = ESTIMATED_DURATION.search(body) or CANONICAL_DURATION.search(body)
        scenes.append(
            {
                "number": int(match.group(1)),
                "title": match.group(2).strip(),
                "narration": " ".join(narration_lines),
                "duration": float(duration_match.group(1)) if duration_match else None,
            }
        )
    return scenes


def _warning(code: str, message: str, **details: Any) -> dict[str, Any]:
    return {"severity": "warning", "code": code, "message": message, **details}


def lint_script_text(text: str) -> dict[str, Any]:
    """Return diagnostic narration warnings for a canonical Slate script."""
    metadata = _frontmatter(text)
    scenes = parse_script_scenes(text)
    warnings: list[dict[str, Any]] = []

    if not scenes:
        warnings.append(_warning("no_scenes", "No canonical '## Scene N:' blocks found."))
        return {"disclaimer": DISCLAIMER, "scene_count": 0, "warnings": warnings}

    all_narration = " ".join(scene["narration"] for scene in scenes)
    lowered = all_narration.lower()

    for phrase in PLACEHOLDER_PHRASES:
        count = lowered.count(phrase)
        if count:
            warnings.append(
                _warning(
                    "placeholder_phrase",
                    f"Review generic phrase '{phrase}'; confirm it adds specific meaning.",
                    phrase=phrase,
                    count=count,
                )
            )

    sentences = [
        sentence.strip()
        for scene in scenes
        for sentence in SENTENCE.split(scene["narration"])
        if sentence.strip()
    ]
    openings = [" ".join(WORD.findall(sentence.lower())[:2]) for sentence in sentences]
    for opening, count in Counter(openings).most_common():
        if opening and count >= 3:
            warnings.append(
                _warning(
                    "repeated_sentence_opening",
                    f"'{opening}' opens {count} sentences; check for templated cadence.",
                    opening=opening,
                    count=count,
                )
            )

    transition_counts = Counter(
        transition
        for sentence in sentences
        for transition in TRANSITION_OPENINGS
        if sentence.lower().startswith(transition)
    )
    for transition, count in transition_counts.items():
        if count >= 2:
            warnings.append(
                _warning(
                    "repeated_transition",
                    f"'{transition}' starts {count} sentences; replace formula "
                    "with causal handoffs.",
                    transition=transition,
                    count=count,
                )
            )

    sentence_lengths = [len(WORD.findall(sentence)) for sentence in sentences]
    if len(sentence_lengths) >= 8:
        mean = statistics.mean(sentence_lengths)
        coefficient_of_variation = statistics.pstdev(sentence_lengths) / mean if mean else 0.0
        if coefficient_of_variation < 0.18:
            warnings.append(
                _warning(
                    "uniform_sentence_length",
                    "Sentence lengths are unusually uniform; listen for mechanical rhythm.",
                    mean_words=round(mean, 2),
                    coefficient_of_variation=round(coefficient_of_variation, 3),
                )
            )

    for scene in scenes:
        if scene["duration"]:
            word_count = len(WORD.findall(scene["narration"]))
            words_per_second = word_count / scene["duration"]
            if words_per_second > 3.5:
                warnings.append(
                    _warning(
                        "high_wps",
                        f"Scene {scene['number']} is {words_per_second:.2f} WPS; "
                        "narration may feel rushed.",
                        scene=scene["number"],
                        words=word_count,
                        duration=scene["duration"],
                        words_per_second=round(words_per_second, 2),
                    )
                )

    for entry in metadata.get("term_ladder", []):
        if not isinstance(entry, dict):
            continue
        term = str(entry.get("term", "")).strip()
        grounded_by_scene = entry.get("grounded_by_scene")
        if not term or not isinstance(grounded_by_scene, int):
            continue
        term_pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
        first_scene = next(
            (scene["number"] for scene in scenes if term_pattern.search(scene["narration"])),
            None,
        )
        if first_scene is not None and first_scene <= grounded_by_scene:
            warnings.append(
                _warning(
                    "term_before_grounding",
                    f"'{term}' first appears in scene {first_scene}, but grounding "
                    f"is declared through scene {grounded_by_scene}.",
                    term=term,
                    first_scene=first_scene,
                    grounded_by_scene=grounded_by_scene,
                )
            )

    return {"disclaimer": DISCLAIMER, "scene_count": len(scenes), "warnings": warnings}


def lint_script_file(path: str | Path) -> dict[str, Any]:
    script_path = Path(path)
    report = lint_script_text(script_path.read_text(encoding="utf-8-sig"))
    report["script"] = str(script_path)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Emit warning-only Slate script diagnostics.")
    parser.add_argument("script", help="Path to script.md")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    args = parser.parse_args()
    report = lint_script_file(args.script)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(report["disclaimer"])
        print(f"Scenes: {report['scene_count']} | Warnings: {len(report['warnings'])}")
        for warning in report["warnings"]:
            print(f"- [{warning['code']}] {warning['message']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())