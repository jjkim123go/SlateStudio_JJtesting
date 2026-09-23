---
format: 1920x1080
duration: 160s
message: "Content Studio turns a clear update request into a draft that the contributor reviews, edits, and publishes"
arc: Need -> Request -> Agent draft -> Review -> Edit -> Merge -> Resolve
audience: Microsoft Learn content contributors
mode: autonomous
music: none
---

# Storyboard - Create an Update issue and draft

## Frame 1 - Quick Start intro
- status: outline
- src: index.html
- duration: 5s
- narration: line 1 begins under the title card.
- on_screen: Dark-green title field, mustard `Content Studio Quick Start` label,
  white title, and a cropped preview of the Update form.
- motion: Headline settles upward; UI crop rises from the lower edge.
- transition: White flash into the Content Studio dashboard.

## Frame 2 - Start the update request
- status: outline
- src: index.html
- duration_driver: narration lines 1-3
- on_screen: Content Studio dashboard; pointer selects Update; modal opens; title,
  target article URL, change request, context, and GitHub ID fill in sequence.
- why: Shows how a clear request gives the agent usable context.
- motion: Slow push toward the Update control, then measured pointer moves and
  field-focus outlines with readable holds.

## Frame 3 - Issue and draft generation
- status: outline
- src: index.html
- duration_driver: narration line 4
- on_screen: Submission success, generated GitHub issue, agent pickup activity,
  generated draft message, and linked pull request.
- why: Makes the asynchronous Content Studio handoff visible.
- motion: Return to full context, then scroll the GitHub activity timeline as
  status entries appear.

## Frame 4 - Review the proposed pull request
- status: outline
- src: index.html
- duration_driver: narration line 5
- on_screen: GitHub PR conversation followed by Files changed; changed markdown
  lines, links, metadata, and review controls remain legible.
- why: Reinforces that the generated content is a starting point.
- motion: Pointer selects Files changed; camera pushes into the diff and tracks
  down the changed lines.

## Frame 5 - Edit in Content Mentor
- status: outline
- src: index.html
- duration_driver: narration lines 6-8
- on_screen: Open in Content Mentor, VS Code for the Web setup, Content Mentor
  sidebar, repository fork and branch status, markdown edit, Create PR, `ms.date`
  decision, and Create Pull Request dialog.
- why: Shows the complete contributor-controlled edit loop.
- motion: Stable VS Code chrome; sidebar state changes, typed markdown insertion,
  and pointer-confirmed actions with short pauses.

## Frame 6 - Merge and resolve
- status: outline
- src: index.html
- duration_driver: narration lines 9-10
- on_screen: Updated original PR, successful review checks, Merge pull request,
  Content Studio issue status update, and a compact recap of Update -> Review -> Merge.
- why: Closes the loop from request to customer-ready publication.
- motion: Merge confirmation lands, then the camera returns to the Content Studio
  dashboard before the recap.

## Frame 7 - Microsoft close
- status: outline
- src: index.html
- duration: 3.6s
- narration: none
- on_screen: Centered Microsoft mark on white.
- motion: Restrained fade and hold.

## Video direction

The piece behaves like one continuous guided screen recording. Product chrome
stays stable within each surface; only the active field, pointer, scroll position,
or workflow state changes. Fine gray rules, compact data density, and restrained
camera pushes preserve the approved Video 3 language. GitHub and VS Code use dark
surfaces from the source recording, while Content Studio remains bright and calm.