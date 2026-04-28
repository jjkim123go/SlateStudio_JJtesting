# Checkpoint Protocol

> **Trigger:** every time you pause for user approval. Mandatory format.
> **Why:** without explicit, parseable checkpoints, the agentic model becomes
> chaotic — the user can't tell if you're asking permission, reporting status,
> or done. Checkpoints are the contract that replaces stage gates.

A checkpoint is a structured pause. It has three parts: **what you did**, **what
you propose next**, **what choice you need from the user**. Every checkpoint
ends with a single, unambiguous question.

---

## The four checkpoint types

Pick the right type — they cost the user different amounts of attention.

### CK-CONFIRM — "I'm about to do X. OK?"

Use before any paid call, any render, or any publish. Cheap to read, cheap to
answer. The user is approving SCOPE (and cost), not reviewing OUTPUT.

**Required elements:** action, est. cost, est. time, what changes if user says no.

```
🔵 CK-CONFIRM — generate narration

I'll synthesize 6 narration clips with gpt-4o-mini-tts (voice: coral).
  Estimated cost: $0.18  ·  Estimated time: ~45s
  If you say no: I'll keep the script, skip narration, and ask what to
  change.

Proceed? (yes / no / change voice)
```

### CK-REVIEW — "Here's the artifact. Approve, change, or reject?"

Use after producing any user-visible artifact: brief, script, scene plan,
SCF, render. The user is reviewing CONTENT.

**Required elements:** path to artifact, 1-line summary, what specifically you
want feedback on, three explicit response options.

```
🟢 CK-REVIEW — script draft

Saved to: projects/onboarding-q1/script.md
Length: 58s narration · 4 scenes · executive tone

What I'd like your eyes on: scene 3 explains role-based access. I went
with a metaphor (apartment keys); the alternative is a literal screen
walkthrough.

Approve / Edit (tell me what) / Try the screen-walkthrough alternative?
```

### CK-CHOICE — "I see N viable paths. Pick one."

Use when there's a real fork in the road and the user's preference matters
(visual style, voice, music selection, delivery channel). NEVER use this to
hide indecision — only when each option is genuinely defensible.

**Required elements:** 2–4 numbered options, one-line tradeoff per option, your
recommendation with reason.

```
🟡 CK-CHOICE — music selection

For the closing scene I have three viable picks:

  1. uplift-corporate-60s.mp3   — safe, brand-aligned, slightly generic
  2. minimal-piano-loop.mp3     — quieter, lets narration breathe
  3. (no music)                 — punchiest, draws full attention to CTA

My pick: 2. The CTA narration is dense; music #1 fights it.

Which? (1 / 2 / 3)
```

### CK-REVIEW — "The reviewer sub-agent scored the render. Here's the verdict."

Use after the reviewer sub-agent runs `scripts/review_run.py` on the rendered MP4.
This checkpoint bridges the reviewer's findings and the main agent's next
action. If the review passes, proceed to CK-DELIVER. If it fails, fix the
issues, re-render, and re-review.

**Required elements:** reviewer verdict (PASS/REVISE), dimension scores table,
blocker findings with corrective actions, path to review report.

```
🔍 CK-REVIEW — post-render quality review

Reviewer verdict: REVISE (18/24)

| Dimension          | Score |
|--------------------|-------|
| brand_compliance   | 3/3   |
| pacing             | 3/3   |
| content_coverage   | 3/3   |
| audio_quality      | 1/3 ← blocker |
| visual_consistency | 3/3   |
| caption_accuracy   | 2/3   |
| content_redundancy | 3/3   |
| narration_timing   | 3/3   |

Blockers:
  → audio_quality: 1 silence gap > 3s (scene 3: 2.5s gap between
    video clip end and scene end). Fix: extend video clip or trim scene.

Report: projects/my-project/review_report.md

I'll fix the audio gap and re-render. (Or override and deliver as-is?)
```

### CK-DELIVER — "Done. Here's the result and what it cost."

Final checkpoint. Use once when you're handing off the finished video.

**Required elements:** path to MP4, runtime, total spend vs budget, full asset
breakdown, one explicit "anything to change?" question.

```
✅ CK-DELIVER — onboarding-q1

Render: projects/onboarding-q1/renders/final.mp4  (1:02, 1080p30, 24 MB)
Spent:  $0.41 of $10.00 budget
Assets: 4 images (gpt-image-2), 1 narration (gpt-4o-mini-tts), 1
        music track (uplift-corporate-60s)

Decisions log: projects/onboarding-q1/decisions.jsonl (12 entries)
Cost ledger:   projects/onboarding-q1/ledger.jsonl (6 entries)

Anything to change, or are we shipping?
```

---

## Required elements on every checkpoint

Every checkpoint, regardless of type, MUST include:

1. **A type tag** — one of `CK-CONFIRM`, `CK-REVIEW`, `CK-CHOICE`, `CK-DELIVER`
2. **A short scope label** — what the checkpoint is about (e.g. "script draft")
3. **A single closing question** — never bury the ask inside paragraphs
4. **An ID** — append to `decisions.jsonl` with `type=checkpoint`,
   `checkpoint_type`, `scope`, `shown` (what you showed), `verdict` (filled
   in after the user replies). Use `slate_record_checkpoint` if available, or
   write directly. The ID lets later decisions reference back.

---

## Things checkpoints are NOT

- **Not a status report.** "I generated the images" is not a checkpoint.
  Checkpoints require a user decision.
- **Not a way to dump uncertainty on the user.** If you're not sure what to
  do, think harder, propose a recommendation, then checkpoint with that
  recommendation. Don't hand the user a blank menu.
- **Not optional for paid calls.** Every paid call requires a CK-CONFIRM, no
  exceptions. Even if the cost is tiny. The user's trust depends on being
  able to predict spend.
- **Not for trivial reversible work.** Drafting a script doesn't need a
  checkpoint mid-draft. Save the checkpoint for when you're done and want
  approval (CK-REVIEW).

---

## What "user said yes / no" means in the log

When the user responds, append a follow-up decision to `decisions.jsonl`:

```json
{"ts":"2025-01-15T19:42:11Z","type":"checkpoint_resolved","checkpoint_id":"ck_a3f2","verdict":"approved","note":"User: 'go ahead'"}
{"ts":"2025-01-15T19:43:02Z","type":"checkpoint_resolved","checkpoint_id":"ck_a3f3","verdict":"changed","note":"User picked option 2 (minimal-piano-loop)"}
{"ts":"2025-01-15T19:51:30Z","type":"checkpoint_resolved","checkpoint_id":"ck_a3f4","verdict":"rejected","note":"User: 'try a different metaphor for scene 3'"}
```

A `rejected` verdict is informational, not a failure — it means you adjust
and re-checkpoint. Only escalate if rejected three times on the same scope.
