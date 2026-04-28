# PresenterBug Component

> Layer 2 component skill. Load when a speaker identity needs to stay on-screen
> during an event or explainer segment.

## When to use

**Trigger vocabulary:** `presenter bug, speaker identity, on-screen speaker,
name and title, pronouns, social handle, presenter overlay`.

Choose `PresenterBug` for persistent speaker identity. Prefer `LowerThird` for
short intro overlays and `WebcamOverlay` when the person is visually present.

## Authoring cues

- Include the presenter name, role, and optional pronouns/socials.
- Use it in a title-safe corner so captions remain readable.
- Keep the copy minimal; this is an identity chip, not a biography card.

## Working examples

- `tests/qa-scenarios/pr6-presenter-bug.scf.json`
- `tests/qa-scenarios/pr6-combined.scf.json`
