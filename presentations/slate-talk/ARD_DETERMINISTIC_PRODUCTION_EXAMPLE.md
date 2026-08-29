# Deterministic Production in Slate

## A concrete example from `ard-explainer`

The strongest example is scene **`b15-verify`** from the Agentic Resource
Discovery explainer.

This scene can be reconstructed without relying on the original agent session.
Its intent, approvals, narration, timing, visual design, executable timeline,
rendered output, cost, and review evidence all survive as project artifacts.

## Preservation chain

### 1. Project identity

Source: `projects/ard-explainer/project.json`

```json
{
  "name": "Agentic Resource Discovery, Explained",
  "slug": "ard-explainer",
  "series": "Learning Friday Series",
  "part": 3,
  "budget_usd": 10.0,
  "created_at": "2026-06-25T18:00:00Z"
}
```

Preserves:

- Project name and slug
- Series and episode
- Budget
- Creation date
- Brief location

### 2. Intent and factual grounding

Source: `projects/ard-explainer/brief.md`

```text
Audience: mixed technical and non-technical
Runtime target: 3.5-4.5 minutes
Tone: calm, friendly teacher; confident, never hypey

The grown-up point:
Discovery is only half the job - verification is the other half.
```

The research section also preserves the factual basis for the scene:

```text
Every capability can carry a trust manifest:
- cryptographic identity
- attestations
- provenance
- signatures

Discovery without verification is just trusting strangers at scale.
```

Preserves:

- Audience and desired outcome
- Narrative angle
- Verified claims and sources
- Available production capabilities
- Cost estimate and constraints
- Why trust and verification belong in the story

This artifact explains **why the scene exists**.

### 3. Human approvals and production decisions

Source: `projects/ard-explainer/decisions.jsonl`

Selected fields from the append-only events:

```jsonl
{"type":"checkpoint","checkpoint_id":"ck_brief_01","scope":"creative brief"}
{"type":"checkpoint_resolved","checkpoint_id":"ck_brief_01","verdict":"approved"}
{"type":"checkpoint","checkpoint_id":"ck_script_01","scope":"narration script"}
{"type":"checkpoint_resolved","checkpoint_id":"ck_script_01","verdict":"approved","note":"Amazing script"}
{"type":"treatment_chosen","decision":"motion_first_rechunk","value":"21 beats from 10 narration scenes"}
{"type":"delivered","render":"renders/ard-explainer.mp4","runtime_sec":278.8}
```

Preserves:

- Brief approval
- Script approval
- User request for maximum motion
- Scene-plan and treatment decisions
- Later visual, music, and speed changes
- Final delivery event

Prior decisions are not rewritten. A changed decision is appended as new
history, making the revision visible.

### 4. Exact creative direction

Source: `projects/ard-explainer/art-direction-v3.json`

```json
{
  "conceptName": "Exploded Schematic",
  "material": "Technical drawing on a dark drafting board",
  "palette": {
    "signalAmber": "#FFB14E",
    "verifyGreen": "#3DD1A0",
    "rejectRed": "#FF6B5E"
  }
}
```

For `b15-verify`, the art direction requires:

- A cryptographic signature locking onto a capability connector
- A valid connector turning green
- An impostor failing verification and turning red
- The dark engineering-schematic visual world
- Exact palette, material, typography, and motion rules

Source: `projects/ard-explainer/scene-plan-v3.md`

```text
b15-verify - SchSign - 24.05s

A key-signature descends and locks onto a connector.
The genuine capability becomes SIGNED and green.
An impostor fails with DOMAIN MISMATCH, turns red,
and is rejected out of frame.

Choreograph approximately six phases.
```

These artifacts preserve **what the scene should mean and feel like** before it
becomes executable.

### 5. Exact narration and measured timing

Sources:

```text
projects/ard-explainer/assets/nar-b15.wav
projects/ard-explainer/assets/nar-b15.words.json
```

```json
{
  "text": "So verification is built in. Every capability can carry a signed, cryptographic identity...",
  "duration": 21.409,
  "source": "estimate",
  "words": [
    {"word": "So", "start": 0.5355, "end": 0.7882},
    {"word": "verification", "start": 0.7882, "end": 1.8855}
  ]
}
```

The sidecar preserves:

- Exact spoken text
- Audio duration: **21.409 seconds**
- Estimated per-word caption timings

Slate does not have to estimate timing from the script during rendering.

### 6. Executable composition contract

Source: `projects/ard-explainer/composition-v3.split-15-b15-verify.scf.json`

The preserved SCF scene is equivalent to:

```json
{
  "id": "b15-verify",
  "duration": 21.85,
  "component": "SchSign",
  "props": {
    "visualBeats": ["p1", "p2", "p3", "p4", "p5", "p6"]
  },
  "narration": "assets/nar-b15.wav",
  "narrationText": "So verification is built in...",
  "transition": "crossfade"
}
```

The narration lasts **21.409 seconds**. SCF provides a **21.85-second** scene
window, leaving a measurable safety buffer before the next scene.

The complete 21-scene video contract is preserved in:

```text
projects/ard-explainer/composition-v3.scf.json
```

### 7. Exact visual structure and motion

Source: `projects/ard-explainer/components/SchSign/index.html`

```html
<div class="ss-card ss-fake">
  <div class="ss-dom">acme-tools.net</div>
  <div class="ss-claim">claims -> weather.example.com</div>
  <div class="ss-verdict ss-verdict-f">Blocked - impostor</div>
</div>

<div class="ss-card ss-real">
  <div class="ss-dom">weather.example.com</div>
  <div class="ss-claim">capability -> forecast.lookup</div>
  <div class="ss-verdict ss-verdict-r">Connect - signed</div>
</div>
```

Preserves the scene's visual structure, including:

- Genuine and impostor capability cards
- Identity and attestation fields
- Green and red verdict treatments
- Engineering title block and visual system

Source: `projects/ard-explainer/components/SchSign/animation.js`

```javascript
master.to(real, {
  borderColor: GREEN,
  duration: 0.6
}, tReal + 1.0);

master.to(fake, {
  borderColor: RED,
  duration: 0.5
}, tFake);

master.to(fake, {
  x: -1700,
  rotation: -8,
  autoAlpha: 0,
  duration: 0.7
}, tBounce + 0.5);
```

Preserves the exact motion sequence:

1. Cards assemble
2. Signing key descends
3. Genuine identity turns green
4. Verification evidence appears
5. Impostor fails red and exits
6. Verified capability recenters

The renderer executes this timeline. It does not ask an agent to reinvent the
motion during frame capture.

### 8. Per-scene and final renders

Preserved outputs:

```text
projects/ard-explainer/renders/composition-v3-split-scenes/15-b15-verify.mp4
projects/ard-explainer/renders/ard-explainer-v2.mp4
projects/ard-explainer/renders/ARD-Demo-Final.mp4
projects/ard-explainer/renders/ard-explainer-FINAL-4m39s.mp4
```

The scene is preserved independently before final assembly. It can be inspected
or rerendered without recreating the brief, script, or other scenes.

The scene is preserved independently before final assembly. Historical and
delivered cuts remain side by side rather than replacing one another.

### 9. Cost and asset provenance

Source: `projects/ard-explainer/ledger.jsonl`

Selected fields from three receipts:

```jsonl
{"tool":"foundry_tts","model":"gpt-4o-mini-tts","units":{"seconds":23.55},"cost_usd":0.0236,"artifact":"assets/nar-b15.wav"}
{"tool":"foundry_image_gen","model":"gpt-image-2","units":{"images":1},"cost_usd":0.04,"artifact":"assets/img-2-dark-web.png"}
{"tool":"foundry_video_gen","model":"sora-2","units":{"seconds":8},"cost_usd":0.71,"artifact":"assets/sora-1-boxed.mp4"}
```

Each paid generation records:

- Tool and model
- Duration or quantity
- Cost
- Approval checkpoint
- Resulting artifact path

This provides a receipt trail for narration, generated images, and Sora clips.

### 10. Review evidence

Sources:

```text
projects/ard-explainer/review_report.md
projects/ard-explainer/review_report.json
```

```json
{
  "scores": {
    "pacing": 3,
    "narration_timing": 3,
    "audio_quality": 3,
    "visual_consistency": 1,
    "caption_accuracy": 2
  },
  "passed": false,
  "summary": "Explicit review stage executed after compose using ReviewerAgent. Compose self-review verdict was FAIL."
}
```

The preserved review records:

- Pacing: passed
- Narration timing: passed
- Audio quality: passed
- Visual consistency: failed
- Overall verdict: revise

This illustrates an important property: preservation does not claim every
version was perfect. It preserves failures as evidence too.

Later decisions record revisions and a final delivered video, but this project
does not contain a newer post-fix review report. That missing evidence is itself
visible because the historical review and later delivery record were not
silently overwritten.

## Why the artifacts work together

| Artifact | What it preserves |
|---|---|
| Brief and research | Why the video exists and which facts it may claim |
| Decisions | What people approved, changed, or superseded |
| Script | Exact message |
| Art direction and scene plan | Intended visual meaning and treatment |
| Assets | Concrete media inputs |
| SCF | Exact scene order, timing, media references, and transitions |
| Components | Exact visual structure and motion |
| Split and final renders | Produced evidence |
| Review report | Whether the output passed inspection |
| Ledger | Cost and generation provenance |

## The central idea

```text
Artifacts = intent, evidence, approvals, and history
SCF       = exact production instructions
Assets    = concrete media inputs
Renderer  = repeatable execution
Review    = evidence that the result worked
```

The agent can disappear entirely. Another session can still understand the
creative intent, reproduce the scene, inspect the result, and identify any
missing approval or review evidence.
