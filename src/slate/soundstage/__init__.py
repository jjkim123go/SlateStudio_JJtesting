"""Soundstage — Slate's living storyboard.

A read-only, disk-derived production board for Slate. A small local web server
watches ``projects/`` and renders each production as a studio wall: a stage
ribbon, the script, an SCF-native storyboard with a narration timeline,
approval gates, a decision trail, cost, and live generation activity.

Design contract (see docs/design/LIVING_STORYBOARD.md):
- Observation, not orchestration. All state derives from files Slate already
  writes (project.json, decisions.jsonl, ledger.jsonl, composition.scf.json,
  review_report.json, assets/, renders/). The board never writes to a project.
- Never block, never break. Malformed or missing state degrades gracefully.
- The agent's only duty: ``python -m slate.soundstage open <slug>`` at project
  creation. If it fails, production continues — the board is an observer.

Inspired by Backlot, the living storyboard for OpenMontage
(github.com/calesthio/OpenMontage#273, AGPL-3.0, same author). Independently
reimplemented against Slate's append-only state contract. No source shared.
See NOTICE.md.
"""

__version__ = "0.1.0"

DEFAULT_PORT = 4770
