# Design Critic — the "bespoke vs PowerPoint" gate

> **Creative — Layer 2. Load at REVIEW**, and run per-scene during authoring
> (render → critique → fix) and once on the final cut.
> Pairs with [`art-direction.md`](art-direction.md). The standard reviewer
> (`scripts/review_run.py`) checks *correctness* (frozen frames, audio, captions,
> timing). It does **not** check whether a scene looks *designed*. This is that
> check.

## How to run it

For each scene (and the final video): render 2–3 keyframes — early (entrance),
mid (settled), late (exit) — with a single-scene render, **look at them**, and
score. This is the loop that makes bespoke safe: you verify the look before the
scene ships.

```
node render/render.mjs <scene.scf.json> --split-scenes --quality standard
ffmpeg -ss <t> -i <scene.mp4> -frames:v 1 _crit.png   # view it
```

## The rubric — score each scene 1–3 on five axes

**1. PPT-smell (3 = none, 1 = reads as a slide).** Fail signals — count them:
- flat single-colour fills; no depth, light, or material
- evenly-spaced bullet rows / a centered single column
- clip-art or emoji icons standing in for design
- identical rounded rectangles in a grid
- instant or linear reveals; motion that only decorates
- a catalog component shipped with its **default** styling
- the title sits dead-center with even margins all around

3+ fail signals = score 1. This axis is a **hard gate**.

**2. Premium signals (3 = several, 1 = none).** Earn points for:
- layered depth / parallax / real foreground–background hierarchy
- genuine material: glass, grain, glow, soft shadow, ink, liquid
- type as a design element — scale contrast, overlap, kinetic, off-grid
- asymmetric / editorial composition with generous negative space
- purposeful motion that *reveals hierarchy* (not just fades things in)
- micro-detail: easing personality, a settle, a subtle ambient drift

**3. Art-direction adherence (3 = on-brief, 1 = off).** Does the scene express
≥3 of the video's {palette, material, motionSignature, composition,
signatureMotif}? Is the `signatureMotif` present? Same material + palette as
every other scene?

**4. Distinctiveness (3 = unmistakable, 1 = generic).** Two questions:
- Could this exact scene appear in *any* explainer? (generic = 1)
- Could it be mistaken for a *different Slate video*? (fingerprint clash = 1)
A 3 means: only THIS video, with THIS art direction, produces this scene.

**5. Reliability (3 = clean, 1 = broken).** No overflow/clipping, text legible
at 1080p, contrast ≥ 4.5:1, no black/garbled frames, motif renders, no frozen
hero. (This overlaps the standard reviewer — keep it here so a re-author can't
regress correctness.)

## Verdict

- **Any scene scoring 1 on PPT-smell, Distinctiveness, or Reliability → REVISE.**
  Don't tweak props — re-author the scene toward the art direction (bespoke
  composition, real material, the motif, the motion signature), then re-render
  and re-score.
- Aim: every scene ≥ 2 on all five, hero/close scenes = 3 on Premium +
  Distinctiveness.
- The video as a whole fails if **> 1/3 of scenes are default-styled catalog
  components**, even if each renders fine — that is the "all videos look the
  same" smell at the composition level.
- **Variety gate (video-level).** Tag each scene's visual *technique*. The video
  fails if any one technique/component is the hero of **> 1/3 of scenes**, or if
  two adjacent scenes use the same technique — even if every scene is bespoke and
  scores well on its own. One beautiful component repeated is still a template.
  Re-treat the offending scenes with different primitives.
- **Completeness (final cut).** Music present + ducked, captions on and styled,
  and ≥1 generated image / Sora clip or chrome scene for texture — or a written
  reason it's intentionally absent.

## Output

Write `projects/<slug>/design-review.json`: per-scene scores on the five axes,
the specific fix for anything < 2, and a one-line "fingerprint" of the video's
look (used by the next video's anti-sameness check).

```json
{
  "fingerprint": "blueprint-ink on deep navy; cyan grid-lines redraw between scenes; drafting motion",
  "varietyPass": true,
  "techniqueHistogram": { "kinetic-typography": 2, "particle-network": 1, "chrome-demo": 2, "hand-drawn-line": 1, "3D-stack": 1, "generated-image": 1, "hero-fold": 1, "Sora-bed": 1 },
  "scenes": [
    { "id": "s01", "technique": "kinetic-typography", "pptSmell": 3, "premium": 3, "adherence": 3,
      "distinct": 3, "reliability": 3 },
    { "id": "s04", "technique": "particle-network", "pptSmell": 1, "premium": 1, "adherence": 2, "distinct": 1,
      "reliability": 3,
      "fix": "Default StepByStep cards. Re-author as a particle network that draws n^2 links then thins; carry the cyan motif; asymmetric, not a centered 3-up." }
  ]
}
```

## Why a gate and not just guidance

Guidance ("make it premium") is ignored under deadline pressure; the agent
retreats to the safe catalog. A *gate* with a render-and-look step forces the
question "does this actually look designed?" on every scene — and makes bespoke
scenes safe, because each one is empirically verified before it ships.
