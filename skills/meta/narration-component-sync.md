# Narration ↔ Component Sync

> **Layer:** Meta — cross-cutting timing intelligence  
> **Stage:** `scene_plan` (Pass 1 — seeding) AND `compose` (Pass 2 — correction)  
> **File:** `skills/meta/narration-component-sync.md`  
> **Purpose:** Align component reveal cues to actual narration duration instead of rough scene estimates.

---

## When to load this skill

Load this skill whenever ANY of the following conditions are true:

1. A scene uses a timing-sensitive component: `StepByStep`, `DataChart`,
   `ArchitectureDiagram`, `MetricsCard`, `CompareSlider`, `TerminalScene`,
   `VSCodeScene`, `AzurePortalScene`, `GitHubScene`, `ComplianceBadgeWall`,
   `DataFlow`, `AuditTrail`, `PolicyEnforcement`, `SectionDivider`,
   `AudienceSafe`, `Disclaimer`, `CustomerStory`, `PricingTable`,
   `CompetitiveMatrix`, `ROICalculator`, or any `*Scene` synthetic
   surface with sequenced reveal. (`ScrollingBackground` is intentionally
   excluded — continuous ambient layer with no anchor verbs.)
2. The user or script mentions any of these trigger words:
   - narrationStartSec, sync, timing, reveal, cue
   - TTS, transcript, subtitles
   - line highlight, chart reveal
   - "reveal at", "animate when I say", "sync to voice"
   - certification names (SOC 2, ISO 27001, HIPAA, FedRAMP, GDPR, NIST, PCI DSS), "certified", "attested", "compliant", "meets"
   - "flows to", "moves to", "encrypted", "classified as", "ingest", "store", "export"
   - "audit trail", "audit log", "first", "then", "next", "after", "finally", "critical event", "retained for"
   - "request", "policy", "check", "verify", "allow", "deny", "challenge", "redact", "blocked", "per policy", "according to rule"
   - "chapter", "part", "section", "phase", "next up", "moving on", "let's look at", "episode", "module", "lesson"
   - "watermark appears", "watermark pulses", "internal only", "for partners", audience marker
   - "disclaimer reveals", "acknowledge", "forward-looking", "safe-harbor", "illustrative only", "subject to change"
   - "customer", "case study", "testimonial", "X chose us", "reduced", "increased", proof, hero customer, "results show"
   - "pricing", "plans", "tier", "Free", "Pro", "Enterprise", "per user", "per month", recommended plan, billing
   - "compared to", "vs", "competitor", "we have it", "they don't", "yes / no / partial", checkmark, parity
   - "ROI", "return on investment", "payback", "savings", "annual savings", TCO, "break-even", "the formula", "the math"
3. The pipeline stage is `scene_plan` (seeding pass) or `compose` (correction pass).
4. A transcript with word-level timestamps is available from `gpt-4o-transcribe`.

---

## Chain position

This skill is the SECOND in the Phase II intelligence chain:

1. **scene-component-routing** → picks components ← runs first
2. **narration-component-sync** → times reveals ← YOU ARE HERE
3. **brand-package-linting** → verifies compliance ← runs after

Sync operates on a scene plan that already has components assigned (by routing).
It produces timing patches that the brand linter then validates for safe-area
compliance (e.g., ensuring timed LowerThird reveals don't overlap caption zones).

---

## Two-pass operation

This skill runs TWICE in the pipeline — once speculatively, once definitively.

### Pass 1: Seeding (at `scene_plan` stage)

**Context:** No narration audio exists yet. No transcript. Only the script text
and estimated scene durations.

**Strategy:** Use `fallback-anchor` (heuristic math) to seed initial timing props.
These are scaffolding values — good enough for scene planning and user review,
but will be corrected later.

**Output:** SCF scene plan with timing props populated by heuristic estimates.

### Pass 2: Correction (at `compose` stage, AFTER asset generation)

**Context:** TTS narration has been generated. `gpt-4o-transcribe` has produced
a transcript with word-level timestamps. Actual audio durations are known.

**Strategy:** Use `phrase-anchor` (transcript matching) to replace all fallback
timings with precise measurements. Where explicit anchors exist, validate them
against actual duration.

**Output:** JSON patches that update the SCF timing props to match real narration.

**Critical rule:** Pass 2 MUST execute BEFORE the SCF goes to `render/render.mjs`.
If it doesn't, reveals will be misaligned — components will animate at heuristic
times rather than matching the actual spoken words.

---

## The three timing-anchor strategies

### Grammar (from proposal §4.3)

```bnf
<timing-anchor> ::= <explicit-anchor> | <phrase-anchor> | <fallback-anchor>

<explicit-anchor> ::= props containing narrationStartSec / revealAt / emphasisWords
<phrase-anchor>   ::= transcript phrase boundaries matched to scene nouns and verbs
<fallback-anchor> ::= evenly distribute reveals across narration duration
```

---

### Strategy 1: `explicit-anchor`

**When it applies:** The SCF props already carry timing values set by the user
or a previous agent pass:
- `narrationStartSec` — when the component should begin its entrance
- `revealAt` — when a specific sub-element should appear
- `emphasisWords[]` — words that trigger visual emphasis

**Behavior:**
1. Parse the explicit values from props.
2. Validate they are within `[0, sceneDuration]`.
3. If out of range, clamp and emit a warning.
4. Pass through as-is — no modification needed.

**Example:**
```json
{
  "id": "hero-metric",
  "duration": 8,
  "component": "MetricsCard",
  "props": {
    "value": 99.9,
    "unit": "%",
    "label": "Uptime SLA",
    "narrationStartSec": 1.2,
    "counterStartSec": 1.5,
    "counterDurationSec": 2.0
  }
}
```
All timing props are explicit → no sync action needed. Validate only.

---

### Strategy 2: `phrase-anchor`

**When it applies:** A transcript with word-level timestamps is available (Pass 2).
The component has defined `narrationAnchors` — key phrases that trigger reveals.

**How `narrationAnchors` work:**

Each timing-sensitive component may declare anchor phrases in its props:

```json
{
  "narrationAnchors": {
    "stepReveal": ["first,", "next,", "then,", "finally,"],
    "metricRevealStart": ["we achieved", "the number is", "reaching"],
    "chartFillStart": ["watch the", "as you can see", "the data shows"]
  }
}
```

**Algorithm:**

1. Load the transcript (word-level timestamps from `gpt-4o-transcribe`):
   ```json
   {
     "words": [
       {"word": "First,", "start": 0.2, "end": 0.5},
       {"word": "we", "start": 0.5, "end": 0.6},
       {"word": "achieved", "start": 0.6, "end": 1.1},
       {"word": "99.9%", "start": 1.1, "end": 1.6},
       {"word": "uptime.", "start": 1.6, "end": 2.1}
     ]
   }
   ```

2. For each anchor phrase in `narrationAnchors`:
   - Normalize: lowercase, strip trailing punctuation for matching.
   - Scan the transcript word list for a sequence match (sliding window).
   - Record the `start` timestamp of the first word in the matched phrase.

3. Map matched timestamps to component props:
   - `stepReveal[i]` → `revealAt` for step `i`
   - `metricRevealStart` → `counterStartSec`
   - `chartFillStart` → `animationStartSec`

4. If a phrase is NOT found in the transcript:
   - Fall back to `fallback-anchor` math for that specific reveal.
   - Emit a warning: "Anchor phrase 'watch the' not found in transcript."

**Matching rules:**
- Case-insensitive.
- Punctuation-tolerant (ignore trailing commas, periods, exclamation marks).
- Multi-word phrases match as a contiguous sequence.
- If multiple matches exist, use the FIRST occurrence.

---

### Strategy 3: `fallback-anchor`

**When it applies:** No transcript available (Pass 1), or transcript matching
failed for specific anchors.

**Heuristic math — character-proportional distribution:**

```
Given:
  sceneDuration = total scene time (seconds)
  narrationText = full narration for this scene
  totalChars = len(narrationText)
  revealPoints = number of reveals needed (e.g., 4 steps)

For reveal i (0-indexed):
  cumulativeChars[i] = characters from start through anchor point i
  revealTime[i] = sceneDuration * (cumulativeChars[i] / totalChars)
```

**Syllable-density refinement:**

The naive character-proportional model assumes uniform speaking rate. Refine it:

1. **Dense content** (nouns, verbs, technical terms, numbers) → speaker slows down.
   Weight: 1.3× character count.
2. **Filler words** ("um", "you know", "basically", "right") → speaker speeds through.
   Weight: 0.5× character count.
3. **Punctuation pauses** — add fixed offsets:
   - Period/question mark/exclamation: +0.3s
   - Comma/semicolon: +0.15s
   - Em-dash: +0.2s
4. **Paragraph break** (if narration has explicit paragraph splits): +0.5s

**Refined formula:**

```
weightedChars[i] = sum(charWeight(word) for word in narrationText[:anchor_i])
totalWeightedChars = sum(charWeight(word) for word in narrationText)
revealTime[i] = sceneDuration * (weightedChars[i] / totalWeightedChars)

where charWeight(word):
  if word in FILLER_WORDS: return len(word) * 0.5
  if word contains digits or is ALLCAPS: return len(word) * 1.3
  if word is a technical term (>8 chars): return len(word) * 1.2
  else: return len(word) * 1.0
```

**FILLER_WORDS** (English): `["um", "uh", "like", "you know", "basically",
"actually", "right", "so", "well", "I mean", "kind of", "sort of"]`

---

## Per-component sync recipes

### MetricsCard

**Timing-sensitive props:**
- `counterStartSec` — when the counter begins counting up
- `counterDurationSec` — how long the count animation takes
- `sparklineDrawSec` — when the sparkline starts drawing (if present)
- `deltaRevealSec` — when the delta arrow/badge appears

**Recommended strategy:** `phrase-anchor` (match "we achieved", "reaching", the
number itself) → `explicit-anchor` if user sets manually.

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "metricRevealStart": ["achieved", "reaching", "hit", "improved to", "grew to"],
    "deltaReveal": ["up from", "compared to", "improvement of", "increase of"]
  }
}
```

**Sync recipe:**

| Anchor match | Prop patched | Value |
|-------------|-------------|-------|
| `metricRevealStart` found at T | `counterStartSec` | T + 0.1 (slight lag for visual anticipation) |
| Duration unknown | `counterDurationSec` | min(2.0, sceneDuration - counterStartSec - 0.5) |
| `deltaReveal` found at T2 | `deltaRevealSec` | T2 |
| No delta anchor | `deltaRevealSec` | counterStartSec + counterDurationSec + 0.3 |

**Worked example (3-sentence narration → props):**

Script: *"Our platform uptime improved significantly this quarter. We achieved
99.9% availability — up from 98.2% last quarter. That's enterprise-grade reliability."*

Scene duration: 10s

Pass 1 (fallback):
```json
{
  "counterStartSec": 3.3,
  "counterDurationSec": 2.0,
  "deltaRevealSec": 5.6
}
```
Rationale: "We achieved" starts at ~33% of narration characters; "up from" at ~56%.

Pass 2 (phrase-anchor with transcript):
```json
{
  "counterStartSec": 3.7,
  "counterDurationSec": 1.8,
  "deltaRevealSec": 5.9
}
```
Rationale: Transcript shows "achieved" at 3.6s → +0.1 = 3.7; "up from" at 5.9s.

---

### StepByStep

**Timing-sensitive props:**
- `steps[].revealAt` — when each step appears
- `steps[].checkAt` — when the checkmark fills (optional)
- `stepInterval` — default time between steps (if not per-step)

**Recommended strategy:** `phrase-anchor` (match ordinal markers: "first",
"second", "next", "then", "finally") → `fallback-anchor` (equal distribution).

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "stepReveal": ["first", "second", "third", "fourth", "fifth",
                   "next", "then", "after that", "finally", "last"]
  }
}
```

**Sync recipe:**

For N steps in a scene of duration D:

| Strategy | revealAt[i] formula |
|----------|-------------------|
| `phrase-anchor` | timestamp where anchor phrase i starts in transcript |
| `fallback-anchor` | `D * (i / N)` + 0.5s initial delay |

`checkAt[i]` = `revealAt[i]` + 0.8s (fixed delay for check animation).

**Worked example:**

Script: *"Let's walk through the onboarding flow. First, create your account.
Next, configure your workspace. Then, invite your team. Finally, run your
first pipeline."*

Scene duration: 12s, 4 steps.

Pass 1 (fallback — equal distribution):
```json
{
  "steps": [
    { "text": "Create your account", "revealAt": 2.0 },
    { "text": "Configure workspace", "revealAt": 4.5 },
    { "text": "Invite your team", "revealAt": 7.0 },
    { "text": "Run first pipeline", "revealAt": 9.5 }
  ]
}
```
Math: 12s / 4 steps = 3s interval, offset by 0.5s + proportional distribution.

Pass 2 (phrase-anchor with real transcript):
```json
{
  "steps": [
    { "text": "Create your account", "revealAt": 2.8 },
    { "text": "Configure workspace", "revealAt": 5.1 },
    { "text": "Invite your team", "revealAt": 7.4 },
    { "text": "Run first pipeline", "revealAt": 9.8 }
  ]
}
```
Transcript: "First," at 2.7s → +0.1 = 2.8; "Next," at 5.0s → +0.1 = 5.1; etc.

---

### DataChart

**Timing-sensitive props:**
- `animationStartSec` — when the chart begins animating
- `animationDurationSec` — total chart fill time
- `series[].revealOffset` — per-series stagger (for multi-series charts)
- `series[].revealDuration` — how long each series animates
- `labelRevealSec` — when axis labels/legend appear

**Recommended strategy:** `phrase-anchor` (match "watch the bars", "as you can see",
series-specific keywords) → `fallback-anchor` (proportional to narration structure).

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "chartFillStart": ["watch", "as you can see", "the data shows", "look at",
                       "notice how", "the chart", "the bars", "the graph"],
    "seriesReveal": ["revenue", "cost", "profit", "users", "growth"]
  }
}
```

**Sync recipe — ordered reveal:**

When the script says "watch the bars climb in order":

```
animationStartSec = timestamp of "watch" anchor
Per-series stagger:
  revealOffset[0] = 0
  revealOffset[i] = i * (animationDurationSec / seriesCount)
```

When the script names series: "First revenue, then costs, finally profit":

```
revealOffset[i] = timestamp of series[i] name in transcript - animationStartSec
```

**Worked example:**

Script: *"Now let's look at the quarterly results. Watch the bars climb in order —
Q1 revenue grew 23%, Q2 added another 18%, and Q3 hit our stretch goal of 31%."*

Scene duration: 14s, 3 series (Q1, Q2, Q3).

Pass 1 (fallback):
```json
{
  "animationStartSec": 4.0,
  "animationDurationSec": 6.0,
  "series": [
    { "label": "Q1", "value": 23, "revealOffset": 0 },
    { "label": "Q2", "value": 18, "revealOffset": 2.0 },
    { "label": "Q3", "value": 31, "revealOffset": 4.0 }
  ]
}
```
Math: "Watch" at ~29% of chars = 4.0s; 3 series stagger over 6s = 2s each.

Pass 2 (phrase-anchor):
```json
{
  "animationStartSec": 4.3,
  "animationDurationSec": 5.5,
  "series": [
    { "label": "Q1", "value": 23, "revealOffset": 0 },
    { "label": "Q2", "value": 18, "revealOffset": 2.1 },
    { "label": "Q3", "value": 31, "revealOffset": 3.8 }
  ]
}
```
Transcript: "Watch" at 4.2s → +0.1; "Q2" at 6.4s = offset 2.1; "Q3" at 8.1s = offset 3.8.

---

### ArchitectureDiagram

**Timing-sensitive props:**
- `boxes[].popAt` — when each box appears
- `boxes[].popDuration` — pop animation length (default 0.3s)
- `arrows[].strokeAt` — when each arrow begins drawing
- `arrows[].strokeDuration` — stroke-draw animation length (default 0.5s)
- `overallRevealDuration` — total time for the full diagram build

**Recommended strategy:** `phrase-anchor` (match component/service names mentioned
in narration) → `fallback-anchor` (left-to-right or top-to-bottom sequential).

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "boxReveal": ["<box_label_lowercase>"],
    "connectionReveal": ["connects to", "sends to", "flows to", "calls", "invokes"]
  }
}
```

The sync skill auto-populates `boxReveal` anchors from the actual box labels in
the diagram data — no manual anchor specification needed.

**Sync recipe:**

1. Extract box labels from `props.boxes[].text`.
2. For each label, search the transcript for that word/phrase.
3. Assign `popAt` = transcript timestamp of the label mention.
4. For arrows: if the script says "A connects to B", the arrow from A→B gets
   `strokeAt` = timestamp of "connects to" + 0.2s.
5. If no transcript match for a box, use topological order with equal spacing.

**Fallback (no transcript):**
```
popAt[i] = (sceneDuration * 0.1) + i * (sceneDuration * 0.8 / boxCount)
strokeAt[j] = popAt[arrow[j].target] - 0.3
```

---

### Synthetic Surface Scenes (`TerminalScene`, `VSCodeScene`, `AzurePortalScene`, etc.)

**Timing-sensitive props:**
- `actions[].startSec` — when each action begins
- `actions[].durationSec` — how long the action takes
- `actions[].typingSpeed` — characters per second (TerminalScene)
- `pauseAfterAction` — breathing room between actions

**Recommended strategy:** `phrase-anchor` (match action descriptions in narration:
"type the following", "click on", "navigate to") → `fallback-anchor` (equal
distribution across scene).

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "actionStart": ["type", "enter", "click", "navigate", "select",
                    "open", "run", "execute", "install", "deploy"]
  }
}
```

**Sync recipe:**

For N actions in a scene of duration D:

| Strategy | startSec[i] formula |
|----------|-------------------|
| `phrase-anchor` | timestamp of action verb i in transcript |
| `fallback-anchor` | `0.5 + i * ((D - 1.0) / N)` |

Action `durationSec` is computed from content:
- Typing: `len(text) / typingSpeed` (default typingSpeed: 30 chars/sec)
- Click/navigation: 0.5s (fixed)
- Output reveal: `lines * 0.1s` (per-line stagger)

---

### CompareSlider

**Timing-sensitive props:**
- `revealStartSec` — when the slider begins moving
- `revealDurationSec` — how long the slide takes
- `labelRevealSec` — when "Before"/"After" labels appear

**Recommended strategy:** `phrase-anchor` (match "compare", "versus", "before and after",
"look at the difference") → explicit if user sets.

**Sync recipe:**
```
revealStartSec = anchor timestamp + 0.2
revealDurationSec = min(3.0, sceneDuration - revealStartSec - 1.0)
labelRevealSec = revealStartSec - 0.5
```

---

### ComplianceBadgeWall

**Timing-sensitive props:**
- `tilesStartSec` — when the badge tiles begin staggering in
- `tileStaggerSec` — per-tile delay (default 0.12s)
- `spotlightStartSec` — when a single badge is highlighted (optional)
- `footerRevealSec` — when the verification footer appears

**Recommended strategy:** `phrase-anchor` → `fallback-anchor`.

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "tilesStart": ["our certifications", "we hold", "attestations include",
                   "we are certified", "trust signals", "compliance posture"],
    "spotlightStart": ["focus on", "in particular", "of note", "lead with",
                       "highlight", "specifically"],
    "footerReveal": ["all verified", "audited annually", "see report",
                     "evidence available", "renewal date"]
  }
}
```

**Sync recipe:**
```
tilesStartSec    = tilesStart anchor timestamp + 0.1   # or 0.5 if no anchor
spotlightStartSec = spotlightStart anchor timestamp    # null if not narrated
footerRevealSec  = footerReveal anchor timestamp - 0.3 # or SCENE_DURATION - 1.5
```

For N tiles, last tile lands at `tilesStartSec + (N-1) * tileStaggerSec`.
Validate: `footerRevealSec` MUST be ≥ last-tile time + 0.3.

---

### DataFlow

**Timing-sensitive props:**
- `stagesStartSec` — when stage nodes appear (staggered)
- `stageStaggerSec` — per-stage delay (default 0.18s)
- `edgesStartSec` — when edges (data hops) draw
- `edgeStaggerSec` — per-edge delay (default 0.25s)
- `locksRevealSec` — when encryption lock icons appear (optional)
- `classificationRevealSec` — when classification banners reveal
- `calloutsStartSec` — when residency / DLP callouts appear (staggered)

**Recommended strategy:** `phrase-anchor` → `fallback-anchor`.

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "stagesStart": ["data flows", "starts at", "ingested", "lands in",
                    "arrives at", "originates", "persisted"],
    "edgesStart":  ["flows to", "moves to", "routes to", "replicates",
                    "hops", "hands off", "syncs to"],
    "locksReveal": ["encrypted", "signed", "protected", "secured",
                    "TLS", "at rest", "in transit"],
    "classificationReveal": ["classified as", "labelled", "tagged",
                             "PII", "confidential", "sensitive"],
    "calloutsStart": ["note that", "remember", "retained for", "data residency",
                      "stays in", "never leaves", "GDPR transfer"]
  }
}
```

**Sync recipe:**
```
stagesStartSec      = stagesStart anchor + 0.1   # or 0.4 fallback
edgesStartSec       = stagesStartSec + (stagesCount * stageStaggerSec) + 0.2
locksRevealSec      = locksReveal anchor    # null when no anchor
classificationRevealSec = classificationReveal anchor + 0.1
calloutsStartSec    = calloutsStart anchor  # or SCENE_DURATION - (callouts.length * 0.6) - 1.0
```

Validate: edges MUST start AFTER all stages have appeared; locks/classification
overlay edges so they may share the same window.

---

### AuditTrail

**Timing-sensitive props:**
- `timelineStartSec` — when the spine line draws in
- `eventsStartSec` — when the first event card reveals
- `eventStaggerSec` — per-event delay (default 0.4s)
- `highlightStartSec` — when highlighted events pulse (optional)
- `retentionRevealSec` — when the retention footer appears

**Recommended strategy:** `phrase-anchor` → `fallback-anchor`.

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "timelineStart": ["audit trail", "audit log", "activity log", "the trail",
                      "who did what when", "evidence record", "compliance log"],
    "eventReveal":  ["first", "then", "next", "after that", "afterwards",
                     "subsequently", "finally", "submitted", "validated",
                     "flagged", "attached", "escalated", "resolved"],
    "highlightStart": ["critical event", "this action", "that export",
                       "that denial", "the variance", "the breach",
                       "key moment", "important to note"],
    "retentionReveal": ["retained for", "kept for", "stored for",
                        "preserved", "available for"]
  }
}
```

**Sync recipe:**
```
timelineStartSec  = timelineStart anchor + 0.1     # or 0.3 fallback
eventsStartSec    = timelineStartSec + 0.6         # spine draws first
For N events: eventReveal[i] = nth eventReveal anchor in transcript
              fallback: eventsStartSec + i * eventStaggerSec
highlightStartSec = highlightStart anchor          # null when none
retentionRevealSec = retentionReveal anchor - 0.2  # or SCENE_DURATION - 1.2
```

Validate: highlighted events MUST already be revealed before
`highlightStartSec`. retentionRevealSec MUST be ≤ SCENE_DURATION − 0.5.

---

### PolicyEnforcement

**Timing-sensitive props:**
- `requestRevealSec` — when the inbound request card appears
- `checksStartSec` — when policy checks begin stamping
- `checkStaggerSec` — per-check delay (default 0.45s)
- `decisionRevealSec` — when the final allow/deny/challenge/redact decision lands
- `ruleCitationRevealSec` — when the rule citation chip appears (optional)
- `auditRefRevealSec` — when the auditRef chip appears (optional)

**Recommended strategy:** `phrase-anchor` → `fallback-anchor`.

**Default narrationAnchors:**
```json
{
  "narrationAnchors": {
    "requestReveal": ["request", "attempts to", "tries to access", "asks for",
                      "when a user", "an admin tries", "the caller wants"],
    "checkReveal":   ["check", "verify", "evaluate", "policy", "role check",
                      "device check", "location check", "classification check",
                      "approval", "MFA", "conditional access"],
    "decisionReveal": ["allow", "permit", "approved", "deny", "blocked",
                       "rejected", "challenge", "step-up", "redact", "mask",
                       "the decision", "the system"],
    "ruleCitationReveal": ["per policy", "according to rule", "control",
                           "policy version", "as defined in", "rule",
                           "compliance control"]
  }
}
```

**Sync recipe:**
```
requestRevealSec = requestReveal anchor + 0.1            # or 0.4 fallback
checksStartSec   = requestRevealSec + 0.5
For N checks: checkReveal[i] = nth checkReveal anchor in transcript
              fallback: checksStartSec + i * checkStaggerSec
decisionRevealSec     = decisionReveal anchor + 0.1
                        # or checksStartSec + N * checkStaggerSec + 0.4
ruleCitationRevealSec = ruleCitationReveal anchor        # null when not narrated
auditRefRevealSec     = decisionRevealSec + 0.4          # always trails decision
```

Validate: all checks MUST be revealed before `decisionRevealSec`. When
`auditRef` is set in props, the targeted `<audit-scene-id>#<event-id>` SHOULD
exist in another scene of the same SCF (lint warning, not blocker — visual
chip only, not a runtime cross-link).

---

### SectionDivider

Anchor verbs (4 props):

| Prop | Anchor verb / phrase |
|------|----------------------|
| `numeralScaleStartSec` | spoken numeral — "chapter", "part", "phase", "two", "three" |
| `titleWipeStartSec` | first content word of the title phrase |
| `subtitleFadeStartSec` | summary verb — "covers", "explains", "shows", "walks through" |
| `progressTickStartSec` | count phrase — "two of five", "halfway through", "the next" |

**Sync recipe:**
```
numeralScaleStartSec = numeral anchor + 0.0       # fallback 0.20
titleWipeStartSec    = title anchor + 0.0         # fallback numeralScaleStartSec + 0.40
subtitleFadeStartSec = summaryVerb anchor + 0.0   # fallback titleWipeStartSec + 0.80
                                                  # null/skip when subtitle empty
progressTickStartSec = countPhrase anchor + 0.0   # fallback subtitleFadeStartSec + 0.40
                                                  # null/skip when totalChapters absent
```

Validate: monotonic order numeral → title → subtitle → progress. Skip a prop
(omit from patch) when the underlying field (`subtitle`, `totalChapters`) is
absent. Anchor matching is fuzzy on the numeral — accept word OR digit
("chapter two" / "chapter 2"). For full-screen chapter cards with no
narration overlap (silent slate), fall through to defaults.

---

### AudienceSafe

Anchor verbs (2 props):

| Prop | Anchor verb / phrase |
|------|----------------------|
| `appearStartSec` | "watermark appears", "internal only", "for partners", "executive only", classification phrase |
| `pulseStartSec` | "watermark pulses", "reminder", "still confidential", "stay aware" — **warn tier only** |

**Sync recipe:**
```
appearStartSec = audienceMarker anchor + 0.0      # fallback 0.30
pulseStartSec  = pulseReminder anchor + 0.0       # fallback appearStartSec + 0.90
                                                  # null/omit when tier != "warn"
```

Validate: AudienceSafe is an **overlay** layered on a host scene. The skill
MUST NOT push other scene timings out — anchor matching reads the host
scene's narration, not its own. When no anchor verb is present (most
ambient overlays), use defaults silently. `pulseStartSec` is only valid for
`tier: "warn"`; omit from the patch entirely when tier is `info`.

---

### Disclaimer

Anchor verbs (2 props):

| Prop | Anchor verb / phrase |
|------|----------------------|
| `revealStartSec` | "disclaimer reveals", "legal notice", "forward-looking", "subject to change", "illustrative only", "not financial advice", "demo data" |
| `acknowledgeChipStartSec` | "acknowledge", "I understand", "click to confirm", "tap to dismiss" — **only when `mustAcknowledge: true`** |

**Sync recipe:**
```
revealStartSec           = disclaimer anchor + 0.0   # fallback by variant:
                                                     #   footer / modal → 0.20
                                                     #   scene-end → 0.00
acknowledgeChipStartSec  = ack anchor + 0.0          # fallback revealStartSec + 1.20
                                                     # null/omit when mustAcknowledge != true
```

Validate: scene-end variant SHOULD start at `revealStartSec: 0` (the disclaimer
IS the scene). Footer / modal variants overlay other content — the host scene's
narration drives the anchor, not the disclaimer text itself. When
`mustAcknowledge` is false, OMIT `acknowledgeChipStartSec` from the patch;
do NOT emit a `null` (the component reads "absent" as "no chip rendered").

---

### CustomerStory

Anchor verbs (5 props):

| Prop | Anchor verb / phrase |
|------|----------------------|
| `quoteRevealStartSec` | "<customer> said", "in their words", "they told us", quote attribution, "<name> shared" |
| `attributionRevealStartSec` | "<name>, <title>", "<title> at <customer>", "<name> from <customer>" |
| `metricsRevealStartSec` | "the results", "they saw", "outcomes were", "metrics tell the story", first numeric in narration |
| `metricStaggerSec` | derived (default 0.18s between consecutive chips) |
| `logoFadeStartSec` | "<customer> chose us", "<customer> said", first mention of customer name |

**Sync recipe:**
```
logoFadeStartSec          = customer-name first-mention − 0.20  (fallback 0.30)
quoteRevealStartSec       = quote anchor + 0.0                  (fallback 1.20)
attributionRevealStartSec = attribution anchor + 0.0            (fallback quoteRevealStartSec + 3.0)
metricsRevealStartSec     = metrics anchor + 0.0                (fallback attributionRevealStartSec + 1.50)
metricStaggerSec          = max(0.12, min(0.24, 1.2 / metricCount))
```

Validate: when `metrics` is empty/omitted, OMIT `metricsRevealStartSec` and
`metricStaggerSec` from the patch. When `attribution.photoSrc` is missing,
the photo column collapses — do NOT emit a separate `photoFadeStartSec`.
Quote text length sanity-check against `quoteRevealStartSec →
metricsRevealStartSec` window: aim for ≥ `length / 22` seconds reading
time; if window is tighter, log a warning patch and let the orchestrator
extend the scene.

---

### PricingTable

Anchor verbs (4 props):

| Prop | Anchor verb / phrase |
|------|----------------------|
| `tiersRevealStartSec` | "we offer", "the plans are", "three tiers", "Free, Pro, and Enterprise", first tier name mentioned |
| `tierStaggerSec` | derived (default 0.20s between columns) |
| `recommendedPulseStartSec` | "the most popular", "we recommend", "best for most teams", "the sweet spot" — anchor on the recommended-tier name |
| `disclaimerFadeStartSec` | "prices in <currency>", "billed annually", "taxes may apply", "subject to terms" |

**Sync recipe:**
```
tiersRevealStartSec      = tiers anchor + 0.0           (fallback 0.40)
tierStaggerSec           = max(0.12, min(0.30, 0.80 / tierCount))
recommendedPulseStartSec = recommend anchor + 0.0       (fallback tiersRevealStartSec + tierCount × tierStaggerSec + 0.40)
                                                        # null/omit when recommendedTierId not set
disclaimerFadeStartSec   = disclaimer anchor + 0.0      (fallback SCENE_DURATION − 1.20)
                                                        # null/omit when disclaimer is empty
```

Validate: tier count is capped at 4; if narration mentions ≥ 5 tiers, log
a `rejects` patch and let the routing skill propose a `structured_image` PNG
(table). When `recommendedTierId` is null AND no recommend-anchor is found,
omit `recommendedPulseStartSec`. Disclaimer fade should always finish
before SCENE_DURATION − 0.5s (exit-fade buffer).

---

### CompetitiveMatrix

Anchor verbs (5 props):

| Prop | Anchor verb / phrase |
|------|----------------------|
| `productsRevealStartSec` | "compared to", "vs", "alongside", first competitor name, "us against" |
| `featuresRevealStartSec` | "let's compare", "feature by feature", "across these capabilities", first feature name |
| `featureStaggerSec` | derived (default 0.10s per row) |
| `highlightColumnStartSec` | "where we win", "our advantage", "we have it, they don't", "our column", us-product name re-mention |
| `footnotesFadeStartSec` | "as of <date>", "based on", "publicly available", "see footnote", footnote-marker mention |

**Sync recipe:**
```
productsRevealStartSec  = products anchor + 0.0       (fallback 0.40)
featuresRevealStartSec  = features anchor + 0.0       (fallback productsRevealStartSec + 1.20)
featureStaggerSec       = max(0.06, min(0.16, 1.4 / featureCount))
highlightColumnStartSec = highlight anchor + 0.0      (fallback featuresRevealStartSec + featureCount × featureStaggerSec + 0.30)
                                                      # null/omit when highlightProductId not set
footnotesFadeStartSec   = footnotes anchor + 0.0      (fallback SCENE_DURATION − 1.50)
                                                      # null/omit when both disclaimer + footnotes are empty
```

Validate: products ≤ 4, features ≤ 12 (schema cap). If narration walks
more features than will fit, log `rejects` and propose a `structured_image` PNG
(table). The `highlightColumnStartSec` MUST land AFTER all feature rows
have revealed (otherwise the pulse fires on a half-built grid). When the
host scene's narration is short (< 6s) and ≥ 8 features are listed,
tighten `featureStaggerSec` toward the 0.06 floor and warn that detail
will be lost.

---

### ROICalculator

Anchor verbs (8 props):

| Prop | Anchor verb / phrase |
|------|----------------------|
| `inputsRevealStartSec` | "let's plug in", "given", "with these inputs", "if we assume", first input value mentioned |
| `inputStaggerSec` | derived (default 0.18s per input) |
| `formulaRevealStartSec` | "the formula is", "the math goes", "we calculate", "ROI equals", "multiply by" |
| `formulaTokenHighlightSec` | derived (default formulaRevealStartSec + 0.40) |
| `resultCounterStartSec` | "which gives us", "the result is", "totaling", "annual savings of", "comes to", "X dollars per year" |
| `resultCounterDurationSec` | derived (1.2–2.4s based on log10(result.value)) |
| `stepsRevealStartSec` | "step by step", "first we", "then", "minus", "net of", derivation walk-through |
| `sensitivityRevealStartSec` | "what if", "sensitivity to", "if X changed", "best case / worst case", range mention |
| `disclaimerFadeStartSec` | "estimates based on", "actual results may vary", "illustrative", customer-data caveat |

**Sync recipe:**
```
inputsRevealStartSec      = inputs anchor + 0.0       (fallback 0.30)
inputStaggerSec           = max(0.10, min(0.28, 1.2 / inputCount))
formulaRevealStartSec     = formula anchor + 0.0      (fallback inputsRevealStartSec + inputCount × inputStaggerSec + 0.40)
formulaTokenHighlightSec  = formulaRevealStartSec + 0.40
resultCounterStartSec     = result anchor + 0.0       (fallback formulaRevealStartSec + 1.40)
resultCounterDurationSec  = clamp(1.2 + log10(max(result.value, 1)) × 0.15, 1.2, 2.4)
stepsRevealStartSec       = steps anchor + 0.0        (fallback resultCounterStartSec + resultCounterDurationSec + 0.30)
                                                      # null/omit when stepsJson is empty
sensitivityRevealStartSec = sensitivity anchor + 0.0  (fallback stepsRevealStartSec + (stepCount × 0.5) + 0.40
                                                                || resultCounterStartSec + 1.80)
                                                      # null/omit when sensitivityJson is empty
disclaimerFadeStartSec    = disclaimer anchor + 0.0   (fallback SCENE_DURATION − 1.20)
                                                      # null/omit when disclaimer is empty
```

Validate: inputs ≤ 8 (schema cap). The formula token highlighter uses
the component's longest-first substring matcher — token IDs MUST be
unique and present in `formula.template`; the sync skill should NOT emit
per-token timing patches (the component handles in-template highlight
scheduling). `resultCounterStartSec` MUST land within 0.4s of the
result-anchor word (viewers expect the number to land WITH the word).
When `stepsJson` is supplied, schedule `stepsRevealStartSec` AFTER the
counter finishes — overlapping the counter with the steps strip causes
optical clutter.

---

### ScrollingBackground

**No timing anchors.** ScrollingBackground is a continuous ambient layer
intended to play behind other components for the entire scene duration.
The component exposes no `*StartSec` props. The sync skill MUST skip
ScrollingBackground entirely — emit no patch operations for any scene
whose component is `ScrollingBackground`.

---

## Output contract

The sync skill emits a per-scene JSON patch document:

```json
{
  "sceneId": "intro-metrics",
  "pass": 2,
  "strategy": "phrase-anchor",
  "patches": [
    { "path": "/props/counterStartSec", "op": "add", "value": 3.7 },
    { "path": "/props/counterDurationSec", "op": "add", "value": 1.8 },
    { "path": "/props/deltaRevealSec", "op": "add", "value": 5.9 }
  ],
  "anchorTrace": [
    {
      "phrase": "we achieved",
      "transcriptTime": 3.6,
      "matchedAnchor": "metricRevealStart",
      "confidence": 1.0
    },
    {
      "phrase": "up from",
      "transcriptTime": 5.9,
      "matchedAnchor": "deltaReveal",
      "confidence": 1.0
    }
  ],
  "warnings": []
}
```

### Patch semantics

Slate's patch op vocabulary aligns with **RFC 6902 (JSON Patch)** — see
https://www.rfc-editor.org/rfc/rfc6902.txt — so generic JSON Patch tooling
can consume Slate timing patches without translation.

- `op: "add"` — prop doesn't exist yet (seeding from fallback or phrase).
  Maps to RFC 6902 `add`.
- `op: "replace"` — prop exists from Pass 1, being corrected by Pass 2.
  Maps to RFC 6902 `replace`.
- `op: "test"` — prop was explicit (author-provided); assert it is within
  bounds before proceeding. Maps to RFC 6902 `test`. The patcher must reject
  the whole scene's patch set if a `test` op fails, so authors can rely on
  explicit timing values being honored.

> **Compatibility note:** Earlier drafts of this skill called the assertion
> op `validate`. The Slate compose-stage patcher accepts both `validate`
> (deprecated) and `test` (preferred, RFC 6902) for one release cycle and
> emits a deprecation warning when `validate` is encountered. New code
> must emit `test`.

### Aggregate output

The full sync pass produces an array of per-scene patches:

```json
{
  "syncPass": 2,
  "timestamp": "2025-07-15T14:30:00Z",
  "transcriptSource": "gpt-4o-transcribe",
  "scenesPatched": 5,
  "scenesSkipped": 2,
  "totalPatches": 14,
  "warnings": ["Anchor 'watch the' not found in scene-3 transcript"],
  "patches": [ /* per-scene patch objects */ ]
}
```

---

## Validation rules

After patching, the sync skill validates:

1. **Range check:** Every timing prop is within `[0, sceneDuration]`.
2. **Ordering check:** For sequential reveals (StepByStep, DataChart series),
   `revealAt[i] < revealAt[i+1]`.
3. **Minimum gap:** Between consecutive reveals, at least 0.3s separation
   (prevents visual pile-up).
4. **End buffer:** Last reveal must be at least 0.5s before scene end
   (prevents cut-off animations).
5. **Duration sanity:** `counterDurationSec`, `revealDurationSec`, etc. must be
   > 0 and ≤ remaining scene time from their start point.

If validation fails, the sync skill adjusts:
- Clamp out-of-range values.
- Redistribute overlapping reveals with minimum gap.
- Warn the agent about adjustments made.

---

## Worked examples

### Example 1: MetricsCard with explicit anchor (no transcript needed)

**Input scene:**
```json
{
  "id": "uptime-metric",
  "duration": 8,
  "component": "MetricsCard",
  "props": {
    "value": 99.9,
    "unit": "%",
    "label": "Platform Uptime",
    "trend": "up",
    "delta": "+1.7%",
    "counterStartSec": 1.5,
    "counterDurationSec": 2.0,
    "deltaRevealSec": 4.0
  }
}
```

**Sync output:**
```json
{
  "sceneId": "uptime-metric",
  "pass": 1,
  "strategy": "explicit-anchor",
  "patches": [],
  "anchorTrace": [],
  "warnings": [],
  "validation": {
    "rangeCheck": "pass",
    "orderCheck": "pass",
    "note": "All explicit timing props within valid range [0, 8]"
  }
}
```

No patches needed — all props are explicit and valid.

---

### Example 2: StepByStep — fallback then correction

**Input scene (at scene_plan — no transcript):**
```json
{
  "id": "onboarding-steps",
  "duration": 12,
  "component": "StepByStep",
  "narration": "Let's walk through setup. First, create your account. Next, configure your workspace. Then, invite your team. Finally, run your first pipeline.",
  "props": {
    "steps": [
      { "text": "Create your account", "icon": "person-add" },
      { "text": "Configure workspace", "icon": "settings" },
      { "text": "Invite your team", "icon": "people" },
      { "text": "Run first pipeline", "icon": "rocket" }
    ]
  }
}
```

**Pass 1 output (fallback-anchor):**
```json
{
  "sceneId": "onboarding-steps",
  "pass": 1,
  "strategy": "fallback-anchor",
  "patches": [
    { "path": "/props/steps/0/revealAt", "op": "add", "value": 1.8 },
    { "path": "/props/steps/1/revealAt", "op": "add", "value": 4.4 },
    { "path": "/props/steps/2/revealAt", "op": "add", "value": 7.0 },
    { "path": "/props/steps/3/revealAt", "op": "add", "value": 9.6 },
    { "path": "/props/steps/0/checkAt", "op": "add", "value": 2.6 },
    { "path": "/props/steps/1/checkAt", "op": "add", "value": 5.2 },
    { "path": "/props/steps/2/checkAt", "op": "add", "value": 7.8 },
    { "path": "/props/steps/3/checkAt", "op": "add", "value": 10.4 }
  ],
  "anchorTrace": [
    { "phrase": "First,", "estimatedTime": 1.8, "matchedAnchor": "stepReveal[0]", "confidence": 0.7 },
    { "phrase": "Next,", "estimatedTime": 4.4, "matchedAnchor": "stepReveal[1]", "confidence": 0.7 },
    { "phrase": "Then,", "estimatedTime": 7.0, "matchedAnchor": "stepReveal[2]", "confidence": 0.7 },
    { "phrase": "Finally,", "estimatedTime": 9.6, "matchedAnchor": "stepReveal[3]", "confidence": 0.7 }
  ],
  "warnings": []
}
```

Fallback math: Total 148 chars. "First," starts at char 27 → 12 * (27/148) = 2.2s.
With density refinement ("Let's walk through setup." is filler-heavy → compressed),
actual estimate lands at 1.8s.

**Pass 2 output (phrase-anchor with transcript):**

Transcript from `gpt-4o-transcribe`:
```json
{
  "words": [
    {"word": "Let's", "start": 0.0, "end": 0.3},
    {"word": "walk", "start": 0.3, "end": 0.5},
    {"word": "through", "start": 0.5, "end": 0.8},
    {"word": "setup.", "start": 0.8, "end": 1.3},
    {"word": "First,", "start": 1.5, "end": 1.9},
    {"word": "create", "start": 1.9, "end": 2.2},
    {"word": "your", "start": 2.2, "end": 2.4},
    {"word": "account.", "start": 2.4, "end": 3.0},
    {"word": "Next,", "start": 3.3, "end": 3.7},
    {"word": "configure", "start": 3.7, "end": 4.3},
    {"word": "your", "start": 4.3, "end": 4.5},
    {"word": "workspace.", "start": 4.5, "end": 5.2},
    {"word": "Then,", "start": 5.5, "end": 5.9},
    {"word": "invite", "start": 5.9, "end": 6.3},
    {"word": "your", "start": 6.3, "end": 6.5},
    {"word": "team.", "start": 6.5, "end": 7.0},
    {"word": "Finally,", "start": 7.3, "end": 7.8},
    {"word": "run", "start": 7.8, "end": 8.0},
    {"word": "your", "start": 8.0, "end": 8.2},
    {"word": "first", "start": 8.2, "end": 8.5},
    {"word": "pipeline.", "start": 8.5, "end": 9.2}
  ]
}
```

```json
{
  "sceneId": "onboarding-steps",
  "pass": 2,
  "strategy": "phrase-anchor",
  "patches": [
    { "path": "/props/steps/0/revealAt", "op": "replace", "value": 1.6 },
    { "path": "/props/steps/1/revealAt", "op": "replace", "value": 3.4 },
    { "path": "/props/steps/2/revealAt", "op": "replace", "value": 5.6 },
    { "path": "/props/steps/3/revealAt", "op": "replace", "value": 7.4 },
    { "path": "/props/steps/0/checkAt", "op": "replace", "value": 2.4 },
    { "path": "/props/steps/1/checkAt", "op": "replace", "value": 4.2 },
    { "path": "/props/steps/2/checkAt", "op": "replace", "value": 6.4 },
    { "path": "/props/steps/3/checkAt", "op": "replace", "value": 8.2 }
  ],
  "anchorTrace": [
    { "phrase": "First,", "transcriptTime": 1.5, "matchedAnchor": "stepReveal[0]", "confidence": 1.0 },
    { "phrase": "Next,", "transcriptTime": 3.3, "matchedAnchor": "stepReveal[1]", "confidence": 1.0 },
    { "phrase": "Then,", "transcriptTime": 5.5, "matchedAnchor": "stepReveal[2]", "confidence": 1.0 },
    { "phrase": "Finally,", "transcriptTime": 7.3, "matchedAnchor": "stepReveal[3]", "confidence": 1.0 }
  ],
  "warnings": []
}
```

Note how Pass 2 REPLACED the fallback values: step 1 moved from 1.8s → 1.6s,
step 2 from 4.4s → 3.4s. The actual narration was faster in the first half
than the heuristic predicted.

---

### Example 3: DataChart with narrated reveal cue

**Script:** *"Now look at our growth trajectory. Watch the bars climb — Q1 at
12 million, Q2 jumped to 18, and by Q3 we hit 27 million in revenue."*

**Input scene:**
```json
{
  "id": "growth-chart",
  "duration": 14,
  "component": "DataChart",
  "props": {
    "chartType": "bar",
    "title": "Quarterly Revenue",
    "unit": "$M",
    "series": [
      { "label": "Q1", "value": 12 },
      { "label": "Q2", "value": 18 },
      { "label": "Q3", "value": 27 }
    ],
    "narrationAnchors": {
      "chartFillStart": ["Watch the bars"],
      "seriesReveal": ["Q1", "Q2", "Q3"]
    }
  }
}
```

**Pass 1 (fallback):**
```json
{
  "sceneId": "growth-chart",
  "pass": 1,
  "strategy": "fallback-anchor",
  "patches": [
    { "path": "/props/animationStartSec", "op": "add", "value": 3.5 },
    { "path": "/props/animationDurationSec", "op": "add", "value": 7.0 },
    { "path": "/props/series/0/revealOffset", "op": "add", "value": 0 },
    { "path": "/props/series/1/revealOffset", "op": "add", "value": 2.3 },
    { "path": "/props/series/2/revealOffset", "op": "add", "value": 4.6 }
  ],
  "anchorTrace": [
    { "phrase": "Watch the bars", "estimatedTime": 3.5, "matchedAnchor": "chartFillStart", "confidence": 0.7 }
  ],
  "warnings": []
}
```

**Pass 2 (phrase-anchor with transcript):**
```json
{
  "sceneId": "growth-chart",
  "pass": 2,
  "strategy": "phrase-anchor",
  "patches": [
    { "path": "/props/animationStartSec", "op": "replace", "value": 4.1 },
    { "path": "/props/animationDurationSec", "op": "replace", "value": 6.5 },
    { "path": "/props/series/0/revealOffset", "op": "replace", "value": 0 },
    { "path": "/props/series/1/revealOffset", "op": "replace", "value": 2.4 },
    { "path": "/props/series/2/revealOffset", "op": "replace", "value": 4.8 }
  ],
  "anchorTrace": [
    { "phrase": "Watch the bars", "transcriptTime": 4.0, "matchedAnchor": "chartFillStart", "confidence": 1.0 },
    { "phrase": "Q1", "transcriptTime": 4.8, "matchedAnchor": "seriesReveal[0]", "confidence": 1.0 },
    { "phrase": "Q2", "transcriptTime": 7.2, "matchedAnchor": "seriesReveal[1]", "confidence": 1.0 },
    { "phrase": "Q3", "transcriptTime": 9.6, "matchedAnchor": "seriesReveal[2]", "confidence": 1.0 }
  ],
  "warnings": []
}
```

The series reveal offsets are relative to `animationStartSec`:
- Q1: 4.8 - 4.1 = 0.7 → rounded to 0 (first bar starts immediately)
- Q2: 7.2 - 4.1 = 3.1 → but we use offset from animation start = 2.4
  (the bar needs lead time before the narrator names it)
- Q3: 9.6 - 4.1 = 5.5 → offset 4.8 (same lead-time logic)

---

## Self-check checklist

Before emitting patches, the sync agent verifies:

- [ ] Determined which pass this is (1 = seeding, 2 = correction).
- [ ] For Pass 2: confirmed transcript exists with word-level timestamps.
- [ ] Identified all timing-sensitive components in the SCF.
- [ ] For each component: selected the appropriate anchor strategy.
- [ ] Phrase-anchor matching used case-insensitive, punctuation-tolerant comparison.
- [ ] All `revealAt` values are within `[0, sceneDuration]`.
- [ ] Sequential reveals maintain minimum 0.3s gap.
- [ ] Last reveal has ≥ 0.5s buffer before scene end.
- [ ] Duration props (counterDurationSec, etc.) don't exceed remaining scene time.
- [ ] Fallback-anchor applied syllable-density refinement (not naive char-proportional).
- [ ] `anchorTrace` includes confidence scores for audit trail.
- [ ] Warnings emitted for unmatched anchor phrases.
- [ ] Patches use correct `op` ("add" for seeding, "replace" for correction).
- [ ] Output JSON is valid and written to `output/sync_patches.json`.

---

## Edge cases

| Situation | Behavior |
|-----------|----------|
| Scene has no narration (music-only) | Skip sync entirely for that scene |
| Transcript is shorter than scene duration | Scale timing to transcript duration, pad remainder |
| Transcript is longer than scene duration | Warn — audio may be clipped; scale to scene duration |
| Component has no timing-sensitive props | Skip (BrandIntro, BrandOutro, TitleCard, etc.) |
| Multiple anchor phrases match same word | Use first match, warn about ambiguity |
| Scene uses explicit anchors that conflict with transcript | Trust explicit anchors (user intent), warn only |
| Pass 2 runs but no transcript available | Re-run fallback-anchor, emit warning |
| Two components in same scene need sync | Process each independently, ensure no timing conflicts |

---

## Integration with other skills

| Skill | Relationship |
|-------|-------------|
| `scene-component-routing` (Lane A) | Runs BEFORE this skill. Routing decides WHICH component; sync decides WHEN things animate. |
| `meta/brand-package-linting` | Runs AFTER this skill. Linting validates the final SCF (including patched timing props). |
| `core/hyperframes-rendering` | Consumes the synced SCF. Timing props drive GSAP animation positions. |
| `core/component-authoring` | CONTRACT.md §4.2 defines `SCENE_START` + offset timing — sync props map directly to these offsets. |
| `core/components/metrics-card` | Timing-sensitive: `counterStartSec`, `counterDurationSec`, `sparklineDrawSec`. |
| `core/components/step-by-step` | Timing-sensitive: `steps[].revealAt`, `steps[].checkAt`. |
| `core/components/data-chart` | Timing-sensitive: `animationStartSec`, `series[].revealOffset`. |
| `core/components/architecture-diagram` | Timing-sensitive: `boxes[].popAt`, `arrows[].strokeAt`. |
| `core/synthetic-screen-recording` | Timing-sensitive: `actions[].startSec`, `actions[].durationSec`. |

---

## Chain reminder

Per proposal §4.4, these three skills form the minimum viable intelligence layer:

1. **scene-component-routing** picks → what component to use
2. **narration-component-sync** times → when elements reveal ← this skill
3. **brand-package-linting** verifies → whether the result is compliant

Build and invoke them as a chain. The routing skill's output (component assignment)
is this skill's input. This skill's output (timing-patched SCF) is the linting
skill's input. The linting skill's output (pass/fail) gates the render.

---

## Provenance

This skill is **largely invented from first principles.** The two-pass
architecture is sound design but was NOT cross-referenced against existing
narration-sync systems (Descript, Premiere Pro auto-captions, Adobe Audition,
Captions.app, Remotion's caption pattern, ElevenLabs sync) before drafting.

### Research-derived (limited)
- **Word-level timestamps from gpt-4o-transcribe** are a real Azure
  capability documented in the model registry (`config/models.yaml`) and
  validated by the existing `scripts/lib/live_subtitles.py`. The
  `verbose_json` + `timestamp_granularities[]=word` API contract is real.

### Invented — needs validation
- **Two-pass design** (Pass 1 seeds timing in scene_plan from narration text;
  Pass 2 corrects from word-timestamps in compose) — invented. May or may not
  match how Descript / Premiere / Captions.app structure their pipelines.
- **Patch op vocabulary** (`add` / `replace` / `validate`) — invented.
  **JSON Patch RFC 6902 defines `add` / `remove` / `replace` / `move` /
  `copy` / `test`** — the `validate` op should likely be renamed to `test`
  to align with that standard. Pending research confirmation.
- **Per-component timing recipes** (MetricsCard counter on numeric word,
  StepByStep advance on step-keyword, DataChart bars in narration order,
  CompareSlider sweep on transition word) — invented. After Effects
  expressions and Lottie data-binding patterns were NOT reviewed for
  prior art.
- **The invariant "MUST NOT strip user-set `narrationStartSec` /
  `revealAt`"** — reasonable design choice, no precedent checked.

### Prior-art findings (post-research, 2026-04-18)

A targeted prior-art research pass landed concrete corrections. See
`.internal/research-notes-phase2-sources.md` for citations.

#### Confirmed grounded (with citations now available)
- **Two-pass design (transcribe → align/correct)** is the canonical pattern
  used by:
  - WhisperX: https://github.com/m-bain/whisperX (forced alignment for
    word-level timestamps after transcription).
  - aeneas: https://github.com/readbeyond/aeneas (text-fragment to audio
    sync maps).
  - Remotion captions: https://www.remotion.dev/docs/captions (transcribe →
    display → export workflow).
- **Word-level timestamp shape `{word, start, end}`** is the WhisperX /
  gpt-4o-transcribe convention. Slate already uses this via
  `scripts/lib/live_subtitles.py` — schema is real.

#### Confirmed invented — RENAMED (patch PR, 2026-04-18)
- **Patch op vocabulary `add` / `replace` / `validate`** did not align with
  RFC 6902 JSON Patch (https://www.rfc-editor.org/rfc/rfc6902.txt), which
  defines `add` / `remove` / `replace` / `move` / `copy` / `test`.
  - `add` ✓ aligns
  - `replace` ✓ aligns
  - **`validate` → renamed to `test`** to follow RFC 6902.
  - Slate's prior `validate` semantic (assert pre-conditions on existing
    values) is exactly what RFC 6902 `test` does.

  **Status:** Skill body now uses `test`. The compose-stage patcher does not
  yet exist (PR 2 will be its first real consumer); when it lands it must
  accept both `test` (preferred) and `validate` (deprecated, deprecation
  warning) for one release cycle, then drop `validate`.

#### Confirmed invented — keep as Slate heuristics
- **Per-component timing recipes** (MetricsCard counter on numeric word,
  StepByStep advance on step-keyword, DataChart bars in narration order,
  CompareSlider sweep on transition word) — no prior art found. These are
  Slate-specific. Label them as "Slate heuristics" in component docs.
- **Specific formulas** (`char-proportional` seeding, `0.1s lag`,
  `0.3s minimum gap`) are Slate inventions. No authoritative source for
  these magic numbers — adjust based on real-world feedback.

### Validation plan
1. ✅ Prior-art research complete (above). RFC 6902 alignment confirmed
   as the right call.
2. **Pending decision:** rename `validate` → `test` now (small patch PR
   before PR 2 lands) or after PR 2 ships? Recommendation: rename now —
   PR 2 will be the first real consumer of the patch op vocabulary, and
   shipping with `validate` would harden the wrong name into precedent.
3. PR 2 components (Compliance/Security) are the first real consumers.
   Each component that needs timing sync will validate the recipe pattern.

---

*Last updated: Phase II PR 1 — Lane B (Provenance section added post-PR-1 review)*
