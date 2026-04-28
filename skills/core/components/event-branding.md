# EventBranding Component

> Layer 2 component skill. Load when a scene needs a conference, summit, or
> internal event opener with sponsor and session metadata.

## When to use

**Trigger vocabulary:** `event opener, conference branding, sponsor lockup,
session ID, venue, event title card, summit intro`.

Choose `EventBranding` for event framing. Prefer `BrandIntro` for generic brand
openers and `TitleCard` for plain chapter or topic titles.

## Authoring cues

- Use `style` to choose opener vs lighter framing treatments.
- Include `eventName`, `series`, `venue`, `date`, and `sessionId` when present.
- Keep sponsor lockups secondary to the event title.

## Working examples

- `tests/qa-scenarios/pr6-event-branding.scf.json`
- `tests/qa-scenarios/pr9-lottie-event-branding.scf.json`
