# Narration Writing - clear, coherent, human speech

> **Trigger:** load before writing or revising narration for any Slate video.
> This skill governs what the words say and how they sound. The canonical
> Markdown shape still comes from [`meta/script-template.md`](../meta/script-template.md).

## The standard

Write for a person listening once while also watching a scene. The script is
not an article, a slide deck, a product page, or a list of polished statements.
It must help the intended viewer follow one line of thought without stopping to
decode jargon or remember disconnected facts.

Do not try to make prose "pass as human" with a word blacklist. Research on
AI-assisted writing finds corpus-level vocabulary signals, narrower stylistic
range, repeated syntactic templates, and lower content diversity, but those
signals cannot prove authorship for an individual passage. More useful quality
dimensions are:

- **Utility:** relevance and information density
- **Trust:** factuality, appropriate confidence, and a real point of view
- **Speech quality:** coherence, natural phrasing, varied structure, concise
  wording, and tone suited to the audience

The strongest dimensions require human judgment. Automated checks may warn;
they do not approve prose.

## Before drafting

Write these five planning notes before scene narration:

1. **Audience:** Who is the least familiar primary viewer? What can that person
   already recognize without explanation?
2. **Outcome:** What should that viewer be able to explain, decide, or try after
   the video? Use one observable verb.
3. **Point of view:** What does the director believe matters here? Do not hide
   behind a neutral catalog of facts.
4. **Spine:** Pick one situation, person, decision, or artifact that can carry
   the explanation from problem to result. Record its before, during, and after
   states. A scene may deepen or change it, but may not quietly replace it.
5. **Term ladder:** List unfamiliar terms in introduction order. For each term,
   write the concrete situation the viewer will understand before hearing its
   name. If the situation cannot be stated plainly, the term is not ready.

For a mixed audience, use the least specialized shared situation as the spine.
Code, APIs, build logs, and model architecture may become supporting proof, but
they should not be the only doorway into the idea unless the primary audience is
technical.

For factual topics, build these notes from `research.md`, not model memory. The
research pass must supply concrete examples as well as verified claims.

## Drafting rules

- Start with a recognizable moment, question, choice, or consequence. Do not
  open with a definition unless the audience explicitly asked for a reference.
- Introduce a technical name only after the viewer understands the situation it
  names. Then use the term consistently.
- Give each scene one explanatory job. Its first sentence should continue the
  prior scene's question, action, or consequence.
- State who does what. Prefer "The worker reads the error and tries again" to
  "A retry is initiated after error analysis."
- Prefer present tense and direct verbs. Replace hidden verbs such as "performs
  an evaluation" with "evaluates" when meaning is unchanged.
- Use contractions and ordinary spoken syntax when they fit the narrator.
- Let sentence length follow thought. A short sentence can land a result; it
  should not become a repeated dramatic mannerism.
- Put a concrete noun or action behind abstract claims. "The system improves"
  is incomplete; say what changes, who can see it, and what happens next.
- Let the visual carry visible detail. Narration explains causality, stakes, or
  interpretation rather than reading labels aloud.
- Write only what the viewer needs for the promised outcome. Interesting facts
  that do not advance the spine belong in notes, not narration.

## Four mandatory edit passes

Do not combine these into one vague request to "make it better." Review the
draft in this order and edit specific spans.

### 1. Utility pass

For every sentence ask: **What new work does this do for the viewer?** Mark its
job as setup, action, cause, evidence, consequence, definition, or transition.
Delete or rewrite sentences that only announce importance, restate the visual,
repeat a prior claim, praise the topic, or summarize without adding meaning.

Watch for filler such as "in today's world," "it is important to understand,"
"let's explore," and "as we move forward." These phrases are examples, not a
complete banned-word list. A normal word is never a defect by itself.

### 2. Coherence pass

Write the causal handoff between adjacent scenes in the margin: **because,
but, so, therefore, meanwhile, or for example**. The connector need not appear
in narration, but the relationship must be clear.

Then run the reorder test: if most scenes can be shuffled without changing the
meaning, the script is probably an encyclopedia. Rebuild it around the spine so
each scene inherits a question or changed state from the previous one.

Pronouns and backward references must have an obvious recent referent. Do not
write "this changes everything" when the viewer must guess what "this" means.

### 3. Grounding pass

- Circle every term that the least familiar primary viewer may not know.
- Confirm that a concrete situation or visible example precedes its first use.
- On first use, explain the term in the fewest words that preserve accuracy.
- Confirm that each factual claim traces to `research.md` and each named object
  has same-beat visual support.
- Replace examples that require specialized context with a shared example, or
  supply that context before asking the viewer to reason about it.

### 4. Ear and anti-template pass

Read the script aloud at a natural pace. Rewrite anything that is grammatically
correct but awkward to say, too formal for the setting, or dependent on visual
punctuation. Then inspect structure, not just vocabulary:

- Vary sentence openings and lengths without manufacturing randomness.
- Remove repeated mini-slogans, rhetorical questions, and three-part crescendos.
- Use "not X but Y" only for a real correction, not as a default dramatic frame.
- Remove aphorisms that sound quotable but hide the mechanism.
- Remove strings of clipped declarations that all share the same cadence.
- Replace generic transitions with the actual causal link.
- Keep one narrator persona. Do not jump from colleague to lecturer to marketer.

Generate a short TTS proof after script approval and listen once without the
text open. A strong script remains easy to follow through the voice alone.

## Delivery pace is part of the approved performance

Natural delivery takes priority over a target runtime. Treat the duration in a
brief or script as a planning estimate, not permission to accelerate the voice.

- Never change TTS rate, apply `atempo`, time-compress pauses, or otherwise alter
  an approved narration performance to hit a runtime target without explicit
  human approval for that exact pacing change.
- If measured narration runs long, report the natural duration and offer clear
  choices: keep the longer video, shorten and re-approve the script, choose a
  naturally faster voice, or approve a specific rate change.
- Do not infer approval from an earlier runtime target. Runtime approval and
  performance-speed approval are separate decisions.
- Preserve the original synthesized audio and timings whenever an approved
  post-processing experiment is made.
- Listen to a representative full scene, not only a short voice sample. Long-
  form pace and prosody may differ from a sample sentence.

A five-minute video with natural speech is preferable to a four-minute video
that sounds rushed, unless the user explicitly chooses the faster treatment.

## Contrastive repairs

These examples come from a technically accurate script that failed its mixed-
audience narration review.

**Aphorism instead of mechanism**

- Weak: "The real build produces evidence, not an opinion."
- Better: "The worker runs the real build. If it fails, that error goes back
  into the next attempt."

The repair names the actor, action, result, and next step.

**Dramatic antithesis instead of causality**

- Weak: "The mistake did not end the work. It made the next attempt better."
- Better: "That error becomes the next instruction, so the worker can try again
  with better information."

The repair explains how the mistake affects the next attempt.

**Inventory before shared context**

- Weak: "Our build guardian needs seven pieces: the task, tools, state, stop
  rules, permissions, evidence, and a handoff."
- Better: Show one familiar recurring task first. Then introduce only the parts
  needed as the task reaches them: what starts it, what it may use, how it checks
  its work, and when it stops for a person.

The repair makes the framework answer questions raised by the example instead
of asking viewers to memorize a taxonomy.

## Script checkpoint

At CK-REVIEW, report the spine and term ladder with the script. Ask the reviewer
to judge comprehension, not polish alone:

1. What is the idea, in your own words?
2. What single example carried the explanation?
3. Where did you first feel lost or hear a term before you needed it?
4. Did any line sound written rather than spoken?

A script is blocked before paid narration or rendering when the primary viewer
cannot paraphrase the core idea, scenes behave like reorderable facts, the
example changes without explanation, necessary jargon appears before grounding,
or the read-aloud pass exposes persistent unnatural phrasing.

## Automation boundary

A script linter may warn about measurable risk signals: WPS, repeated sentence
openings, suspiciously uniform sentence lengths, repeated transition templates,
placeholder phrases, and definitions that precede their planned examples. These
signals route attention; they are not defects on their own.

Never use the linter to:

- claim whether AI wrote a passage
- ban normal vocabulary because it appears in an AI-writing study
- replace the comprehension checkpoint
- auto-rewrite approved narration
- pass a script whose coherence, relevance, or tone has not been reviewed
- justify speeding up narration to satisfy a duration estimate

## Research basis

- Shaib et al., *Measuring AI "Slop" in Text* (arXiv:2509.19163v2, 2026):
  multidimensional taxonomy; relevance, density, and tone were strong predictors;
  prompted LLM judges aligned poorly with human annotations.
- Russell, Karpinska, and Iyyer, ACL 2025: frequent LLM users detected generated
  nonfiction using lexical clues plus formality, originality, and clarity, even
  under paraphrasing and humanization.
- Kobak et al., *Science Advances* 2025: excess style vocabulary is measurable
  across a large corpus but cannot identify individual LLM-assisted documents.
- Padmakumar and He, ICLR 2024: instruction-tuned writing assistance reduced
  lexical and content diversity across writers in a controlled study.
- Chakrabarty, Laban, and Wu, 2025: targeted expert-informed edits improved
  writing; general LLM judges remained weak on subjective writing quality.
- Digital.gov plain-language guidance: write for a specific audience, use active
  voice and direct verbs, organize for understanding, and test early by asking
  users to paraphrase.
- Nielsen Norman Group: experts prefer succinct familiar language; build on
  existing mental models and favor recognition over recall.