# HyperFrames Producer Patches

This file documents local patches applied to `node_modules/@hyperframes/producer/dist/index.js`. **These patches will be lost on `npm install`** — they are re-applied automatically by `render/scripts/apply-producer-patches.mjs`, which is wired as a `postinstall` hook in `render/package.json`. Run it manually with `npm run apply-patches` (from `render/`) if needed.

## Patch 1 + 2: Windows path separator in external-asset rewriter

**Symptom (Windows only):** Relative `<video src="assets/foo.mp4">` and `<source src="assets/foo.mp3">` references are misclassified as "external" assets, then either rewritten to broken `hf-ext/<absPath>` URLs or blocked entirely by the staging-copy safety check. Net effect: the asset never loads, and on video the frame extractor receives a path that resolves but the runtime `<video>` element shows nothing.

**Root cause:** `path.resolve()` on Windows returns `C:\Projects\Slate\output`, but the producer compares with:
```js
absPath.startsWith(absProjectDir + "/")  // wrong on Windows
```
The trailing `/` never matches because Windows uses `\`.

**Fix:** Use `path.sep` (or platform branch).

### Site 1 — `collectExternalAssets` (~line 107007)
```js
// BEFORE
absPath.startsWith(absProjectDir + "/")

// AFTER
absPath.startsWith(absProjectDir + (process.platform === "win32" ? "\\" : "/"))
```

### Site 2 — external-asset copy safety check (~line 107320)
```js
// BEFORE
outPath.startsWith(compileDir + "/")

// AFTER
outPath.startsWith(compileDir + (process.platform === "win32" ? "\\" : "/"))
```

## Producer behavior to be aware of (no patch — emitter responsibility)

`parseVideoElements` (~line 102276) auto-assigns an `id` like `hf-video-0` if the `<video>` element doesn't have one. **This auto-assigned id is only set on the producer's in-memory parsed DOM — it is never written back to the served HTML on disk.** At runtime, `injectVideoFramesBatch` calls `document.getElementById(item.videoId)`, which returns `null` for auto-assigned ids → frames are never injected → video element remains visually empty.

**Mitigation:** Always emit an explicit `id="..."` attribute on every `<video src="...">` element. The Slate compiler in `render/lib/scf-to-html.mjs` `transformStreamScene` does this. Any future emitter (e.g. `renderVideoLayer` for `type:"video"` SCF layers) must do the same.

## Upstream tracking

- File issues against `@hyperframes/producer` for both bugs.
- Until fixed upstream, consider adding a `postinstall` script that re-applies the two patches, or vendoring the producer.
