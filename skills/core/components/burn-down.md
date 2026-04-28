# BurnDown Component

> Layer 2 component skill. Load when a scene needs a planned-vs-actual trend
> for remaining work over time.

## When to use

**Trigger vocabulary:** `burn down, burndown, remaining work, sprint trend,
ideal line, actual line, backlog burn, velocity drift, scope change`.

Choose `BurnDown` when the audience needs to compare trend lines over time.
Prefer `Roadmap` for milestone scheduling and `OKRStatus` for goal health.

## Authoring cues

- Provide date or category values on the x-axis; string dates are supported.
- Use separate series for planned and actual work.
- Call out scope shifts or risk moments in the narration, not as extra chrome.

## Working examples

- `tests/qa-scenarios/pr4-burndown.scf.json`
- `tests/qa-scenarios/pr4-burndown-string-x.scf.json`
