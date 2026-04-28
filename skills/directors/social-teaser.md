# Director — Social Teaser

> **Role:** advisor. Load when the brief asks for a short, attention-first
> video for social channels (LinkedIn, Twitter/X, internal Yammer/Viva,
> launch announcements).
> **Mixable:** yes. Often paired with `explainer.md` (use this for the
> social cut, explainer for the long form).

This is a director skill, not a pipeline. The full agentic loop is in
[`skills/meta/production-loop.md`](../meta/production-loop.md).

## Research grounding

- Fluent 2, [Motion](https://fluent2.microsoft.design/motion): motion should be functional, natural, consistent, and appealing; choreography should guide attention.
- Material Design, [Understanding motion](https://m2.material.io/design/motion/understanding-motion.html): motion should be informative and focused, and can express brand personality.
- MDN, [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) and W3C WCAG 2.3.3 [Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html): avoid unnecessary large-field or jarring motion and provide reduced-motion alternatives for interactive/web cuts.

Social does not excuse slop. Use motion and captions to clarify the idea, not to cover weak composition.

---

## When the social-teaser treatment fits

- Runtime: 10–30s. Anything longer is no longer a teaser.
- Goal: stop the scroll, plant one idea, drive ONE action (visit URL,
  watch full video, register).
- Channel matters: LinkedIn favors landscape 1920×1080, Twitter/X works
  with both, Reels/Shorts demands portrait 1080×1920. Confirm in brief.

---

## Scene scaffold

Aggressive. Three beats, no more.

| # | Beat | Duration | Treatment |
|---|---|---|---|
| 1 | Hook — visual + 3-word claim | 2–4s | Punchy image / motion + bold text overlay |
| 2 | Reveal — what / why | 5–12s | One image OR one short video clip; one narration sentence |
| 3 | CTA — single action | 3–5s | BrandOutro variant with URL or QR + one verb |

For 15s social cuts, often just hook + CTA — drop the middle.

---

## Visual choice rules

1. **Motion beats stills on social.** Even a slow Ken Burns push on a
   still image outperforms a static frame for retention. Use HyperFrames
   transitions or generate a short Sora-2 clip if budget allows.
2. **Text on screen is mandatory** — most social viewers watch muted.
   Captions are not optional; they're the primary channel.
3. **Brand colors front-loaded.** The first frame must look like *yours*
   — viewers identify the brand in <500ms or scroll past.
4. **First frame is a designed frame.** It must contain the object, brand,
  or offer clearly enough to work as a poster frame.
5. **No text-only hooks.** Pair the claim with a real visual action,
  component reveal, product surface, or motion-designed proof.

---

## Narration / audio rules

- **Narration is OPTIONAL** for social. If used, max one sentence per
  beat, ~8s of narration total for a 15s teaser.
- **Music IS mandatory** — silent social videos test poorly. Pick
  energetic for hooks, restrained for B2B.
- **Captions match exact narration.** Use `subtitle_gen` from the
  narration WAV — never type captions by hand.

---

## Format / aspect ratio

| Channel | Aspect | Resolution | Notes |
|---|---|---|---|
| LinkedIn feed | 16:9 or 1:1 | 1920×1080 or 1080×1080 | 1:1 wins on mobile feed |
| Twitter/X | 16:9 | 1920×1080 | |
| Instagram Reels / TikTok / YouTube Shorts | 9:16 | 1080×1920 | Generate assets at correct aspect; never just letterbox |
| Internal Teams / Viva | 16:9 | 1920×1080 | |

Set `outputProfile.width` and `outputProfile.height` in the SCF before
generating any assets — image gen at the wrong aspect wastes cost.

---

## Self-review checklist (teaser-specific)

- [ ] **First 2 seconds work with NO sound and NO context.** If a viewer
      sees only the opening still, do they know what this is about?
- [ ] **Motion has a job.** It guides attention, shows change, or expresses
  brand; it is not random energy.
- [ ] **One claim, one action.** Multiple CTAs = no CTA.
- [ ] **Captions on every word of narration.** Burned-in or sidecar SRT
      depending on platform.
- [ ] **Runtime under the platform's optimal threshold** (LinkedIn ≤30s,
      Reels ≤15s for full-watch rate).
