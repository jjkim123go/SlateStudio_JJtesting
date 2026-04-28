# ListsScene Component

> Layer 2 component skill. Load when a scene needs a Microsoft Lists style
> operational tracker with typed cells, pills, people, and row state.

## When to use

**Trigger vocabulary:** `Lists, incident list, tracker, records grid, rich row
table, operational list, row selection, list filter`.

Choose `ListsScene` when the content is row-and-column operational data with UI
chrome. Prefer `structured_image` tables for exact static diagrams and
`PlannerScene` for task buckets.

## Variants / states

- `state: default`
- menu-open / row-selected style probe states via the existing fixtures

## Working examples

- `tests/qa-scenarios/pr8c-lists-default.scf.json`
- `tests/qa-scenarios/pr8c-lists-row-selected.scf.json`
