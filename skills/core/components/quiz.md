# Quiz Component

> Layer 2 component skill. Load when a scene needs an explicit knowledge check
> with answer reveal.

## When to use

**Trigger vocabulary:** `quiz, knowledge check, multiple choice, reveal answer,
assessment, check for understanding, question slide`.

Choose `Quiz` when the viewer should answer a question before the correct
response is revealed. Prefer `AskTheAudience` for live-poll results and
`TerminologyCard` for definition-first teaching.

## Authoring cues

- Provide `question`, `options[]`, and `correctOptionId`.
- Use `revealAnswerAtSec` when narration calls for a delayed reveal.
- Add `scoreBadge` only if the scene sits inside a larger learning module.

## Working examples

- `tests/qa-scenarios/pr6-quiz.scf.json`
- `tests/qa-scenarios/pr6-combined.scf.json`
