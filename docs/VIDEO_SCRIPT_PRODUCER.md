# Video Script Producer Guide

The **Video Script Producer** is a VS Code Copilot custom agent for turning
technical documentation into review-ready customer education video scripts.
It produces a Markdown production script and a structured JSON package that
can move into the Slate production workflow.

## Where The Agent Is Installed

The repository includes the workspace agent at:

```text
.github/agents/video-script-producer.agent.md
```

It appears in VS Code when the `SlateStudio_JJtesting` repository is the open
workspace. A user-level copy can also be installed at:

```text
%APPDATA%\Code\User\prompts\video-script-producer.agent.md
```

The user-level copy is private to your machine and appears in every VS Code
workspace. The workspace copy is shared with the repository through Git.

## Start A Script Project

1. Open the Slate repository in VS Code.
2. Open Copilot Chat.
3. Select **Video Script Producer** from the agent picker above the chat input.
4. Start a new chat session.
5. Provide the source, audience, target runtime, and a project slug.
6. Review the proposed production script and JSON package.
7. Approve the draft before the agent writes or replaces project files.

Do not use **New Agent** in Agent Customizations to start a video. That button
creates another agent definition. Use **New** in the Copilot Sessions panel to
start a new script session.

## Recommended Starter Prompt

```text
Create a customer education video production package from this source:

Source: <documentation URL or workspace file>
Audience: <specific viewer role and assumed knowledge>
Target runtime: <seconds or minutes>
Video goal: <what viewers should understand, do, or decide>
Project slug: <lowercase-project-name>
Tone: <clear, reassuring, authoritative, conversational, or other>

Analyze the source, flag prerequisites and licensing, classify the content,
and prepare the production script and JSON package for review. Do not write
project files until I approve the draft.
```

Useful optional context includes:

- Required and prohibited terminology
- Product version or release date
- Brand, accessibility, or localization requirements
- Existing images, recordings, diagrams, or end cards
- Whether screen capture is permitted
- Statements that require legal, product, or engineering review

## What The Agent Produces

### Production Script

The Markdown deliverable includes:

- Production notes and source grounding
- Target audience and assumed knowledge
- Content classification and rationale
- Learning objectives
- Prerequisites, licensing, limitations, and review flags
- Scene-level timing, voiceover, visual direction, and on-screen text
- Screen-capture and source requirements
- Runtime, word-count, localization, and confidence notes

Visual directions should explain what changes over time, including reveal
order, line drawing, diagram flow, icon emphasis, and synchronization with
spoken phrases. They should not describe a sequence of static slides.

### JSON Package

The JSON deliverable includes:

- Project metadata and video type
- Customer problem, value proposition, and viewer outcome
- Prerequisites, licensing, warnings, and limitations
- Numeric scene start times and durations
- Voiceover and visual direction for each scene
- Screen-capture requirements and rationale
- Confidence scoring, source gaps, and human-review areas
- Asset and localization requirements

For Slate projects, approved deliverables are written to:

```text
projects/<slug>/script.md
projects/<slug>/script-package.json
```

Scene durations in the JSON package must add up to the target runtime.

## Review And Approval

Check these items before approving a script:

1. The audience and assumed knowledge are correct.
2. Each learning objective describes a viewer outcome rather than a document
   section.
3. Product behavior, licensing, prerequisites, and availability claims are
   supported by the sources.
4. Voiceover sounds natural when read aloud and fits the scene durations.
5. Each scene has one clear communication job.
6. Screen capture is requested only when verified UI actions improve
   understanding.
7. Every uncertainty is listed as a source gap or review flag.
8. The final scene leaves appropriate room for the end card and does not place
   narration over a muted end card unless explicitly requested.

Useful review responses include:

```text
Approved. Write both files to projects/<slug>/.
```

```text
Revise S3 for a nontechnical audience, remove the licensing claim until it is
verified, and reduce the total runtime to 60 seconds. Return the revised draft
for approval.
```

## Continue Into Slate Production

The Video Script Producer stops after approved script artifacts are created.
It does not render video or generate paid media.

Continue in a normal Slate agent session with:

```text
Use the approved production package in projects/<slug>/ to create the brief,
art direction, and scene plan. Show each checkpoint for approval before asset
generation or rendering.
```

Slate then handles source research, availability checks, scene planning,
HyperFrames composition, narration, validation, rendering, and independent
review according to the repository workflow.

## Troubleshooting

### The Agent Does Not Appear

- Confirm the file ends in `.agent.md`.
- For workspace use, confirm it is under `.github/agents/` in the workspace
  currently open in VS Code.
- For cross-workspace use, confirm it is under
  `%APPDATA%\Code\User\prompts\`.
- Close and reopen Agent Customizations.
- Run **Developer: Reload Window** and reopen Copilot Chat.

If Agent Customizations shows **Workspace 0**, the current workspace does not
contain a `.github/agents/*.agent.md` file. Select the user-level agent or open
the Slate repository.

### The Agent Writes Generic Summaries

Specify the audience, runtime, video goal, and decision or action viewers
should take. Ask it to organize around learning outcomes rather than source
headings.

### The Script Is Too Long

Provide a hard runtime and ask the agent to calculate the word budget at
125-145 words per minute. Request a revised scene-duration total before
approval.

### Claims Are Uncertain

Provide authoritative product documentation or ask the agent to research
primary Microsoft sources. Do not approve ambiguous claims until the JSON
package records them in `review.sourceGaps` or `reviewAreas`.

## Example Requests

### Conceptual Explainer

```text
Create a 60-second conceptual video explaining Microsoft Entra hybrid identity
to new Microsoft 365 administrators. Focus on when organizations choose it and
what prerequisites they should understand. Use project slug
entra-hybrid-identity-overview.
```

### Procedural Video

```text
Create a 90-second procedural package from docs/setup.md for support engineers.
The viewer should be able to complete the configuration and verify success.
Recommend screen capture only for actions that cannot be explained clearly
with deterministic UI animation.
```

### Troubleshooting Video

```text
Turn incident-notes.md into a 75-second troubleshooting video for help-desk
agents. Explain the symptom, likely causes, diagnostic sequence, and escalation
boundary. Flag every step that requires product-owner verification.
```