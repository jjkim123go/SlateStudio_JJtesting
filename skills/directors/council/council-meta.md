# Director Council — Meta Protocol

Use this when a scene plan needs multiple expert passes before synthesis. The main agent remains the synthesizer and owns the final plan.

## Research grounding

- Nielsen Norman Group, [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/): reduce extraneous processing and split overloaded scenes.
- Nielsen Norman Group, [Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/): prefer visual cues and recognition over recall-heavy narration.
- Fluent 2, [Motion](https://fluent2.microsoft.design/motion): motion must be functional, natural, consistent, and accessible.
- Material Design, [Understanding motion](https://m2.material.io/design/motion/understanding-motion.html): motion should clarify hierarchy, feedback, status, and user education.

## Council roles

1. Cinematic Director: shot language, pacing, transitions, visual variety.
2. Motion Designer: choreography, component timing, transition purpose, reduced-motion risk.
3. Concept/Rhetoric Director: argument, audience fit, cognitive load, proof quality.
4. Synthesizer: resolves conflicts into one SCF-ready scene plan.

## Best-of-N selection mode

Use this mode for high-stakes scenes: opening hook, executive launch moment,
final CTA, expensive Sora prompt, or any scene where visual proof is more
important than fast drafting.

1. Generate 2-4 candidate scene treatments or prompts.
2. Score each candidate on: visible proof, cognitive load, component fit,
	five-aspect coverage, brand fit, and render risk.
3. Select one candidate and explain the tradeoff in one paragraph.
4. Log the candidate ids, rubric scores, and selected rationale as a
	`candidate_selection` event in `decisions.jsonl`.

Example event:

```jsonl
{"ts":"2025-01-15T18:35:30Z","type":"candidate_selection","scene_id":"s2","candidates":[{"id":"c1","visible_proof":3,"cognitive_load":2,"component_fit":3,"five_aspect_coverage":3,"render_risk":1},{"id":"c2","visible_proof":2,"cognitive_load":3,"component_fit":2,"five_aspect_coverage":2,"render_risk":2}],"selected":"c1","rationale":"Dashboard treatment provides stronger same-beat proof and lower render risk."}
```

The main agent remains the synthesizer. A council recommendation is evidence,
not an automatic decision.

## Non-negotiables

- Component-first routing for exact text, UI, metrics, diagrams, code, or data.
- No single visual may hold for more than 3-4 seconds in a narrated showcase.
	Longer scenes must be decomposed into transcript-anchored beats, video layers,
	or sequenced component states.
- No more than two consecutive image-only scenes; three triggers reroute.
- Every scene must state its visual job: orient, prove, demonstrate, compare, transition, or close.
- Cinematic or generated-video scenes must also state a five-aspect visual spec:
	subject, scene, motion, spatial, and camera. Load
	`skills/core/precise-video-language.md` before writing or reviewing those
	scenes.
- Every narration claim must have visible proof in the same beat. Architecture
	narration needs a real node/arrow architecture or flow diagram; metrics need a
	metric dashboard/chart; book/page narration needs a book/page treatment;
	VS Code, CLI, Teams, Outlook, and Excel narration needs synthetic moving app
	surfaces, not screenshots or decorative generated art.
- Captions are mandatory for narrated videos. Do not set `captions.style` to
	`none` unless the user explicitly opts out.
- Never put decorative explanatory labels such as "Turning a page" on screen
	when the motion itself already communicates the action.
- Any skill-writing or director guidance must cite local project constraints plus external literature when it makes a design claim.