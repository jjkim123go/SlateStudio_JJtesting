# ProgressBar Component

> Layer 2 component skill. Load when a scene needs to show where the viewer is
> within a lesson, module, or staged workflow.

## When to use

**Trigger vocabulary:** `progress, completion, milestone tracker, module
progress, segmented progress, current section, chapter progress`.

Choose `ProgressBar` when the content is about sequence position, not task
detail. Prefer `StepByStep` for instructions and `Roadmap` for calendar time.

## Authoring cues

- Use segmented mode when the module has named sections.
- Set the current section explicitly so the narration can anchor to it.
- Keep labels short enough to read in motion.

## Working examples

- `tests/qa-scenarios/pr6-progress-bar.scf.json`
- `tests/qa-scenarios/pr6-combined.scf.json`
