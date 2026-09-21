# Content Studio: Create a New Article

HyperFrames walkthrough for the Microsoft Content Studio article-creation flow.

## Run locally

Prerequisites: Node.js 20 or later and a Chromium-based browser.

```powershell
git clone --branch handoff/content-studio-hyperframes https://github.com/jjkim123go/SlateStudio_JJtesting.git
cd SlateStudio_JJtesting/videos/content-studio-create-article
npm run check
npm run dev
```

The preview command prints the local URL. No Azure credentials are required for the current composition.

## Render

```powershell
npm run render
```

The project pins HyperFrames `0.8.40` through its npm scripts. Shared Microsoft components and assets remain available in the repository root.
