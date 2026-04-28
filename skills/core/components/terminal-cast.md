# TerminalCast Component

> Layer 2 component skill. Load when a scene needs a conference-style terminal
> walkthrough rather than a plain product terminal surface.

## When to use

**Trigger vocabulary:** `terminal cast, shell demo, narrated CLI segment,
conference terminal, command walkthrough, zoomed terminal`.

Choose `TerminalCast` when the terminal itself is the hero and the scene should
feel like an on-stage demo. Prefer `TerminalScene` for straightforward product
or ops walkthroughs.

## Authoring cues

- Provide commands and outputs in the order the narration should follow them.
- Use shell/theme choices deliberately; PowerShell is a strong default for
  Microsoft-oriented demos.
- Reserve zoom or emphasis beats for one or two key command moments.

## Working examples

- `tests/qa-scenarios/pr6-terminal-cast.scf.json`
- `tests/qa-scenarios/pr6-combined.scf.json`
