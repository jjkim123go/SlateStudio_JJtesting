from __future__ import annotations

from scripts.lib.script_quality import DISCLAIMER, lint_script_text


def _script(narration: str, *, duration: int = 10, frontmatter: str = "") -> str:
    return f"""---
target_duration_sec: 30
{frontmatter}---

## Scene 1: Example

{narration}

[VISUAL: The example changes on screen.]

*Estimated duration: {duration} seconds*
"""


def test_linter_warns_but_does_not_claim_ai_detection():
    report = lint_script_text(_script("In today's world, let's explore this important idea."))

    assert report["warnings"]
    assert report["disclaimer"] == DISCLAIMER
    assert "does not detect AI authorship" in report["disclaimer"]
    assert all(warning["severity"] == "warning" for warning in report["warnings"])


def test_linter_warns_on_repeated_sentence_openings():
    report = lint_script_text(
        _script("The worker starts. The worker checks. The worker stops when the test passes.")
    )

    assert any(warning["code"] == "repeated_sentence_opening" for warning in report["warnings"])


def test_linter_warns_on_high_words_per_second():
    narration = " ".join(["word"] * 40) + "."
    report = lint_script_text(_script(narration, duration=5))

    warning = next(w for w in report["warnings"] if w["code"] == "high_wps")
    assert warning["words_per_second"] == 8.0


def test_term_ladder_warns_only_from_declared_grounding_order():
    report = lint_script_text(
        _script(
            "Loop engineering gives the recurring task a feedback path.",
            frontmatter="term_ladder:\n  - term: loop engineering\n    grounded_by_scene: 1\n",
        )
    )

    warning = next(w for w in report["warnings"] if w["code"] == "term_before_grounding")
    assert warning["term"] == "loop engineering"
    assert warning["first_scene"] == 1


def test_term_ladder_uses_whole_term_matching():
    report = lint_script_text(
        _script(
            "Microsoft Foundry includes evaluations in its development lifecycle.",
            frontmatter="term_ladder:\n  - term: eval\n    grounded_by_scene: 1\n",
        )
    )

    assert not any(warning["code"] == "term_before_grounding" for warning in report["warnings"])


def test_direct_plain_narration_can_return_no_warnings():
    report = lint_script_text(
        _script(
            "Maya opens the shared tracker each Friday. Today, three requests are still waiting. "
            "She asks an agent to sort them, check each owner, and stop when a decision needs her."
        )
    )

    assert report["warnings"] == []