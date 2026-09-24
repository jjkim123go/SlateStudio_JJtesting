# Content Studio: Create an update issue and draft

HyperFrames walkthrough for the Microsoft Content Studio article-update flow.

## Included production data

- Final deterministic composition and project configuration.
- Approved script, brief, storyboard, frame direction, and art direction.
- Azure Speech narration using `en-US-Ava:DragonHDLatestNeural`.
- Azure word-boundary timings used to synchronize the UI actions.

The source meeting recording is documented in `BRIEF.md` but is not a render
dependency and is not committed because it contains meeting participants and
other source-only information. Generated snapshots, pointer audits, and
reference extracts are also excluded.

## Run locally

Prerequisites: Node.js 20 or later and a Chromium-based browser.

```powershell
git clone --branch handoff/content-studio-hyperframes https://github.com/jjkim123go/SlateStudio_JJtesting.git
cd SlateStudio_JJtesting/videos/content-studio-update-issue-draft
npm run check
npm run dev
```

No Azure credentials are required to preview or render because the approved
narration and timing data are included.

## Render

```powershell
npm run render
```

For the managed render path used for the reviewed master:

```powershell
npm run render:cloud
```

The composition is 1920x1080 at 30 fps with a 157.2-second runtime. The project
pins HyperFrames `0.8.43` through its npm scripts.