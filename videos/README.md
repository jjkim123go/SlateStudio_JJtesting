# Direct HyperFrames Video Workflow

Use the standalone HyperFrames project pattern from
[`keantonc_microsoft/technical-explainer-pipeline`](https://github.com/keantonc_microsoft/technical-explainer-pipeline)
for future video creation in this workspace.

## Local Reference

`videos/knowledge-to-video-factory/` is the current verified reference project.
It uses:

- direct HTML composition authoring
- project-local `hyperframes.json`
- a pinned HyperFrames CLI version for reproducible renders
- the `/hyperframes` workflow router and its video-authoring skills
- `npm run check` as the required pre-render validation

The project passed the complete HyperFrames check with CLI version `0.8.14` on
September 16, 2026: lint, runtime, layout, motion, and contrast all reported no
errors or warnings.

## Starting A Video

Create each new video as a sibling directory under `videos/`, using
`videos/knowledge-to-video-factory/` as the structural reference. Keep its own:

```text
videos/<slug>/
  AGENTS.md
  BRIEF.md
  SCRIPT.md
  STORYBOARD.md
  hyperframes.json
  index.html
  meta.json
  package.json
  assets/
  compositions/
```

Only create directories that the production actually needs. Pin the
HyperFrames CLI version in `package.json`, and update deliberately with:

```powershell
npx hyperframes@latest upgrade --project . --check
npx hyperframes@latest upgrade --project .
```

## Authoring And Validation

From the video project directory:

```powershell
npx hyperframes skills update hyperframes
npx hyperframes preview --background
npx hyperframes preview --status
npm run check
npm run render
npx hyperframes preview --stop
```

Start with the `/hyperframes` skill and let it route the work to
`/faceless-explainer`, `/general-video`, `/product-launch-video`, or another
matching workflow. Author the visual system directly in HyperFrames HTML and
GSAP. Do not introduce SCF, Soundstage, SlateStudio orchestration, or the Slate
component catalog unless a specific production requests them.

## Access Note

The upstream repository currently requires Microsoft EMU SSO and was not
readable through the Git credentials available to this workspace. Treat the
local reference project as the working integration until authenticated access
is available. Once access is restored, compare its latest starter files,
skills, and CLI pin before beginning the next production.