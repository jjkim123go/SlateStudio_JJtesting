# Roadmap Component

> Layer 2 component skill. Load when a scene needs a time-based milestone view
> across lanes, owners, or workstreams.

## When to use

**Trigger vocabulary:** `roadmap, milestone, quarter plan, release horizon,
delivery plan, swimlane timeline, dependency timeline, what ships when`.

Choose `Roadmap` when narration is about sequencing work over time. Prefer
`BurnDown` for remaining-work trends, `OKRStatus` for goal rollups, and
`ReleaseNotes` for shipped-change summaries.

## Authoring cues

- Use `horizonStart` / `horizonEnd` to define the visible window.
- Model lanes in `swimlanes[]` and dated work in `milestones[]`.
- Use `todayMarker` when the narration needs a “you are here” beat.

## Working examples

- `tests/qa-scenarios/pr4-roadmap.scf.json`
- `tests/qa-scenarios/pr4-combined.scf.json`
