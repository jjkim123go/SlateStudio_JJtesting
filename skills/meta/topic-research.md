# Topic Research — ground the script in verified sources

> **Meta — operating model. Load at INGEST → BRIEF, before writing the
> brief and script**, whenever the topic is factual rather than pure opinion.
> Enforced by [`production-loop.md`](production-loop.md) **Rule 2b** for every
> video archetype (not just the explainer series); `directors/*` assume a
> research-grounded brief.

## When this fires (almost every video — not just explainers)

Do a research pass BEFORE the brief and script for **any Slate video** —
explainer, walkthrough, teaser, recap, product showcase, exec briefing, launch
reveal, any archetype — if the topic involves any of: a current or fast-moving
subject ("…in 2026", "latest", "how X works *now*"), named products / specs /
standards / companies, versions or release dates, statistics or benchmarks,
research findings, or anything the audience could fact-check. If in doubt,
research. Only skip for pure opinion / timeless first-principles pieces, or a
video built entirely from user-supplied content.

**Why:** model training data is stale and lossy. Writing a current topic from
memory produces wrong dates, outdated versions, invented numbers, and missed
recent developments — the fastest way to lose a technical audience. Research
replaces recall with verifiable fact.

## The path (tools you actually have)

| Tool | Use it for |
|---|---|
| `fetch_webpage` (host tool) | Primary. Fetch + summarize one or more URLs against a query. Use for authoritative pages and to follow links. |
| `web_fetch` (Slate BaseTool) | Fetch + parse a single URL to clean text/metadata (scriptable via Python/terminal). |
| `ingest_artifacts` (Slate) | When the user supplied URLs/docs/images — routes each to the right ingester and returns a unified report. |

There is **no** "search the web from a query string" tool that returns ranked
results. So: **reason your way to authoritative sources** (official docs, vendor
blogs, primary papers, standards bodies), fetch them directly, then **follow the
links** they cite to reach primary sources.

## The pass (do this, in order)

1. **Decompose** the topic into the 4–6 load-bearing claims/sub-questions you
   must get right (definitions, mechanism, who/when, numbers, current state).
2. **Name 3–6 authoritative sources.** Prefer primary (papers, specs, official
   docs/engineering blogs) over reputable secondary. Avoid SEO content farms.
3. **Fetch them** with `fetch_webpage`/`web_fetch`; follow links to primaries.
4. **Cross-check every load-bearing fact against ≥ 2 independent sources** —
   especially dates, versions, numbers, and "who did what when." Note conflicts.
5. **Capture** into `projects/<slug>/research.md`: each verified fact + its
   source URL + a confidence/conflict note. Keep quotes short and attributed.
6. **Bind the script to `research.md`.** Every factual claim must be traceable
   to a source. Put a short "Research grounding" + source list in the brief
   (see the rag-/prompting-/ard-explainer briefs for the shape).

## Anti-hallucination rules

- For a current topic, **never** state a version, date, benchmark, or specific
  number from memory — verify it or don't say it.
- If you can't verify a claim, **soften, attribute, or drop it** — do not invent.
- For fast-moving facts, frame as "as of <date>, per <source>" so the video
  ages honestly.
- Distinguish what's *shipped* from what's *announced/roadmap*; say which.

## Checkpoint

The brief's "Research grounding" section is the artifact. Show it (with the
source list) at the brief CK-REVIEW so the user can sanity-check the facts
before any script or spend.
