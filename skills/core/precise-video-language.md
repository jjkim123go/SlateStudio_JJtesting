# Precise Video Language

> Core Slate skill. Load when a scene uses generated video, user-provided video, cinematic image generation, camera language, shot planning, or any review that must decide whether the visual truly matches the narration.

## Purpose

Slate should not treat a scene prompt as complete just because it sounds vivid. Before expensive generation or final review, describe the visible intent in five compact aspects so the director, tool prompt, SCF, and reviewer are judging the same thing.

The five-aspect spec is adapted for Slate production work:

| Aspect | Question | Examples |
|---|---|---|
| `subject` | Who or what must be visible? | product screen, engineer, dashboard, server rack, document |
| `scene` | Where is it and what visual context matters? | modern office, Azure portal, city exterior, neutral studio, workshop table |
| `motion` | What changes over time? | user types, chart animates, camera reveals, cursor selects, team reviews |
| `spatial` | How is the frame composed? | wide shot, close-up, split depth, foreground obstruction, centered UI |
| `camera` | How does the viewer move or focus? | locked-off, slow dolly, pan right, rack focus, low angle, top-down |

## When to require it

Require a five-aspect spec before:

- Sora or any generated video prompt.
- User-provided video analysis that will drive editing decisions.
- Cinematic image prompts where shot size, composition, or camera angle matters.
- Scene-plan review for launch, executive, or showcase videos.
- Any reviewer finding about prompt drift, unsupported narration, missing motion, or camera mismatch.

For simple title cards, lower thirds, CTA cards, and deterministic app components, the spec can be abbreviated or omitted if the component contract already defines the visual proof.

For premium / cinematic cues that hint at depth, parallax, or 3D rather
than a single Sora-2 prompt — "logo wall", "device flythrough", "rotate to
reveal", "shader portal" — load
[`../creative/premium-motion-routing.md`](../creative/premium-motion-routing.md)
before locking the five-aspect spec. The motion ladder may resolve the
moment in standard 2D / 2.5D polish without needing a generated video clip
at all.

## Scene-plan format

Use this compact block inside scene plans or decision logs:

```yaml
visual_spec:
  subject: "The product dashboard with the forecast panel selected"
  scene: "Synthetic web app surface inside a browser frame"
  motion: "Cursor opens the forecast panel; chart bars update from left to right"
  spatial: "Medium-wide UI view with the forecast panel occupying the right third"
  camera: "Locked-off screen capture style; no simulated handheld movement"
```

Keep each field objective and visible. Do not include audience emotion, business claims, or metaphor unless it is represented on screen.

## Prompt-routing rules

- For exact text, code, UI, charts, or data, route to deterministic components or `structured_image`; do not ask an image/video model to spell it.
- For Sora prompts, translate abstract terms into concrete physical scenes before generation.
- For product/workflow demos, prefer moving synthetic app surfaces over static screenshots.
- For generated video, make the `motion` and `camera` fields simple. Sora may miss complex sequencing and left/right instructions.

## Critique rules

When reviewing a scene, write critiques that are:

1. **Accurate**: backed by visible evidence or an explicit evidence gap.
2. **Complete**: covers every material mismatch across subject, scene, motion, spatial composition, and camera.
3. **Constructive**: states the specific revision, not only the defect.

Good finding shape:

```text
Evidence: Scene 3 narration says the dashboard trend updates, but the visual is a static hero image.
Issue: motion mismatch; the required state change is absent.
Revision: use PowerBIScene/DataChart with two timed chart states, or add a generated video only if the data does not need exact labels.
Owner: scene_plan/assets
```

## Best-of-N use

For high-stakes scenes, generate 2-4 candidate visual specs or prompts, score each on the five aspects, and select the one with the best visible proof. Log the candidates, rubric scores, and selected rationale in `decisions.jsonl`.

Use best-of-N selectively. It is useful for opening scenes, final calls to action, executive launch moments, and Sora prompts; it is wasteful for routine deterministic UI states.