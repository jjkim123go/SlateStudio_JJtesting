# Voice Selection Guide

> **Trigger:** load when choosing a TTS voice for narration. Also load when
> the user specifies a voice preference ("use a male voice", "something warm")
> or when a director skill references voice selection.
>
> **Source of truth for available voices:** `config/models.yaml` under
> `tts_models.gpt-4o-mini-tts.voices`. This skill interprets those voices
> for creative decisions — it does not override the model registry.

---

## Available voices

Six voices are deployed on Slate's `gpt-4o-mini-tts` instance. The `alloy`
voice available on some OpenAI deployments is **not** available here.

| Voice | Character | Pace | Energy | Best single-word descriptor |
|-------|-----------|------|--------|-----------------------------|
| `coral` | Professional, warm | Moderate | Medium | **Polished** |
| `echo` | Professional, clear | Measured | Medium-low | **Authoritative** |
| `shimmer` | Conversational, friendly | Natural | Medium-high | **Warm** |
| `onyx` | Deep, engaging | Deliberate | High | **Dramatic** |
| `nova` | Measured, clear | Slow-moderate | Low-medium | **Calm** |
| `fable` | Relaxed, storytelling | Unhurried | Medium | **Narrative** |

---

## Tone × Audience matrix

Use this matrix to select a primary voice and fallback. The primary voice
is the best fit; the fallback is acceptable if the user prefers a different
character while staying in the same register.

### Warm-celebratory (recaps, milestone announcements, team wins)

| Audience | Primary | Fallback | Reasoning |
|----------|---------|----------|-----------|
| Peer team | `shimmer` | `fable` | Shimmer's conversational warmth feels genuine for team celebrations. Fable works if you want a more relaxed storytelling vibe. |
| Leadership / VP | `coral` | `shimmer` | Coral is warm but polished — appropriate gravitas for VP-present recaps. Shimmer if the culture is casual-first. |
| External customer | `coral` | `echo` | Professional warmth without over-familiarity. Echo if the brand is more formal. |
| Mixed internal | `shimmer` | `coral` | Shimmer's friendliness is inclusive. Coral if the content is more formal. |

### Professional-explainer (concept explainers, product overviews, training)

| Audience | Primary | Fallback | Reasoning |
|----------|---------|----------|-----------|
| Peer team | `coral` | `nova` | Coral's moderate pace and warmth are ideal for explaining concepts to peers. Nova for longer-form content where calm clarity matters. |
| Leadership / VP | `echo` | `coral` | Echo's authority and clarity suit executive-facing explainers. Coral if the tone should be warmer. |
| External customer | `echo` | `coral` | Professional clarity builds trust with external audiences. |
| Technical engineer | `nova` | `fable` | Nova's measured pace gives technical audiences time to absorb. Fable for tutorial-style walk-alongs. |
| Mixed internal | `coral` | `echo` | Coral is the safest all-rounder for internal explainers. |

### Authoritative-announcement (product launches, policy changes, org updates)

| Audience | Primary | Fallback | Reasoning |
|----------|---------|----------|-----------|
| Peer team | `echo` | `coral` | Echo's clear authority lands announcements without being stiff. |
| Leadership / VP | `echo` | `onyx` | Echo is the default authority voice. Onyx adds gravitas for high-stakes announcements. |
| External customer | `echo` | `coral` | Consistent, professional authority for public-facing announcements. |
| Mixed internal | `echo` | `coral` | Echo works across audience segments for announcements. |

### Conversational-walkthrough (product demos, UI walkthroughs, how-tos)

| Audience | Primary | Fallback | Reasoning |
|----------|---------|----------|-----------|
| Peer team | `shimmer` | `fable` | Shimmer's friendly, natural pace matches "let me show you" energy. |
| Leadership / VP | `coral` | `shimmer` | Coral guides without being overly casual for executive demos. |
| External customer | `coral` | `shimmer` | Professional but approachable for customer-facing demos. |
| Technical engineer | `fable` | `nova` | Fable's relaxed storytelling pace suits step-by-step technical walkthroughs. |

### Dramatic-narrative (brand films, vision pieces, keynote support)

| Audience | Primary | Fallback | Reasoning |
|----------|---------|----------|-----------|
| Any | `onyx` | `echo` | Onyx's deep, engaging quality creates emotional weight. Echo for a more restrained dramatic tone. |

### Calm-tutorial (onboarding, training modules, compliance walkthroughs)

| Audience | Primary | Fallback | Reasoning |
|----------|---------|----------|-----------|
| Any | `nova` | `fable` | Nova's measured, clear delivery is ideal for content the viewer must absorb and retain. Fable for a warmer tutorial feel. |

---

## Quick-pick cheat sheet

When you don't have time to consult the full matrix:

| If the video feels like… | Pick |
|--------------------------|------|
| A friendly colleague explaining something | `shimmer` |
| A polished conference talk | `coral` |
| A news anchor delivering an update | `echo` |
| A movie trailer or brand film | `onyx` |
| A calm instructor in a tutorial | `nova` |
| A podcast host telling a story | `fable` |

---

## Voice override — user preference mapping

When the user states a voice preference, map it to the closest available voice:

### Gender / character preferences

| User says | Map to | Notes |
|-----------|--------|-------|
| "male voice" or "masculine" | `onyx` or `echo` | Onyx is deeper; echo is crisper. Ask which register. |
| "female voice" or "feminine" | `shimmer` or `nova` | Shimmer is warmer; nova is calmer. |
| "neutral" or "no preference" | `coral` | Coral is the most balanced voice. |
| "deep voice" | `onyx` | |
| "warm voice" | `shimmer` or `coral` | Shimmer is warmer; coral is more polished. |
| "serious" or "formal" | `echo` | |
| "casual" or "friendly" | `shimmer` or `fable` | |
| "calm" or "soothing" | `nova` | |
| "energetic" | `shimmer` | Shimmer has the highest natural energy. |
| "storyteller" | `fable` | |

### Pace preferences

Voice pace is influenced by the `instructions` parameter on `gpt-4o-mini-tts`,
not just the voice choice. If the user asks for a specific pace:

| User says | Instruction hint |
|-----------|-----------------|
| "speak slowly" | "Speak at a slow, deliberate pace with clear pauses between sentences." |
| "speak quickly" | "Speak at a brisk, energetic pace." |
| "natural pace" | (omit pace instruction — let the voice's natural cadence apply) |

Combine voice selection with instruction tuning for best results. See
[`skills/models/gpt-4o-mini-tts.md`](../models/gpt-4o-mini-tts.md) for
full instruction parameter documentation.

---

## Director cross-references

Each director skill has its own voice defaults. This skill provides the
reasoning behind those choices:

- **Explainer** (`skills/directors/explainer.md`): defaults to `coral`
  (friendly-professional), `nova` (authoritative), `echo` (measured/serious).
- **Walkthrough** (`skills/directors/walkthrough.md`): narration pace is
  ~120 wpm (slower than explainer) — favor `fable` or `shimmer` for natural
  pacing.
- **Social teaser** (`skills/directors/social-teaser.md`): narration is
  optional and very short — `shimmer` for energy, `onyx` for drama.
- **Recap** (`skills/directors/recap.md`): warm-celebratory context —
  `shimmer` for peer team, `coral` for VP-present.

---

## Decision logging

When you select a voice, log the decision in `decisions.jsonl`:

```jsonl
{"ts":"...","type":"voice_chosen","voice":"shimmer","rationale":"warm-celebratory tone for peer-team quarterly recap; shimmer's conversational warmth matches the audience"}
```

Include the tone, audience, and why the chosen voice fits — this makes
voice decisions auditable and helps future sessions resume without
re-deriving the choice.
