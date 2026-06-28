# HyperFrames Producer Patches

This file documents local patches applied to `node_modules/@hyperframes/producer/dist/index.js`. **These patches will be lost on `npm install`** — they are re-applied automatically by `render/scripts/apply-producer-patches.mjs`, which is wired as a `postinstall` hook in `render/package.json`. Run it manually with `npm run apply-patches` (from `render/`) if needed.

## Status (runtime @hyperframes 0.5.7) — NO patches required

As of the pinned **`@hyperframes@0.5.7`** runtime, the `PATCHES` array in
`apply-producer-patches.mjs` is **empty**. All four 0.4.x-era patches below are
**obsolete**: the Windows path-separator bugs (Patches 1 & 2) and the
short-audio loop (Patch 4) were fixed upstream / had their surrounding source
refactored, and the configurable WebGL backend (Patch 3) is unnecessary because
0.5.x defaults to a working `swiftshader` backend with no `assertSwiftShader`
guard. Validated on Windows: external-asset copy, narration + music mixing, and
multi-scene split-render all succeed unpatched.

The sections below are retained as **historical reference** for the 0.4.x line.

### ⛔ Why not 0.6.0+ / 0.7.x (the npm `latest`)

HyperFrames **0.6.0** introduced a **sub-composition timeline requirement**: the
producer scans the DOM for *every* `[data-composition-id]` element and waits for
a matching `window.__timelines[id]` to be registered, failing with
`[FrameCapture] Sub-composition timelines not registered after 45000ms` if any
is missing. Slate's compiler (`scf-to-html.mjs`) currently emits
`data-composition-id` on nested **scene / narration / music** wrappers (the
0.4.x track/clip contract) but registers only the **root** composition timeline
— so on 0.6/0.7 every scene stays `opacity:0` and renders blank. 0.6.0 also adds
an `assertSwiftShader` guard requiring a pure-software GL backend for parallel
renders.

Re-pinning to 0.6/0.7 therefore requires a **compiler contract migration**
(stop emitting nested `data-composition-id`; adopt the 0.6+ track/clip
attributes; register sub-composition timelines where genuinely needed), not a
producer patch. Tracked as a follow-up. **`0.5.7` is the highest version
compatible with the current compiler.**

---

## Historical patches (0.4.x line — no longer applied)

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

## Patch 4: Loop short audio sources to fill requested duration

**Symptom:** Background music tracks shorter than the total composition duration are truncated. E.g. a 126s music file in a 176s video plays once and goes silent at 2:06.

**Root cause:** `prepareAudioTrack` (~line 102728) shells out to ffmpeg with `-ss <start> -t <duration> -i <src>`. Without `-stream_loop`, ffmpeg outputs `min(file_duration - start, requested_duration)` — silently truncating to file length.

The `loop` attribute on the HTML `<audio>` element is for in-browser playback only; the producer captures frames headlessly and bakes audio via ffmpeg afterward, so the attribute has no effect on the final MP4.

**Fix:** Prepend `-stream_loop -1` BEFORE the input. With `-t` after, output is bounded — looping only kicks in if requested duration > source duration, so narration tracks (always exact length) are unaffected.

### Site 4 — `prepareAudioTrack` (~line 102728)
```js
// BEFORE
const args = [
  "-ss", String(mediaStart),
  "-t", String(duration),
  "-i", srcPath,
  ...
];

// AFTER
const args = [
  "-stream_loop", "-1",
  "-ss", String(mediaStart),
  "-t", String(duration),
  "-i", srcPath,
  ...
];
```

## Producer behavior to be aware of (no patch — emitter responsibility)

`parseVideoElements` (~line 102276) auto-assigns an `id` like `hf-video-0` if the `<video>` element doesn't have one. **This auto-assigned id is only set on the producer's in-memory parsed DOM — it is never written back to the served HTML on disk.** At runtime, `injectVideoFramesBatch` calls `document.getElementById(item.videoId)`, which returns `null` for auto-assigned ids → frames are never injected → video element remains visually empty.

**Mitigation:** Always emit an explicit `id="..."` attribute on every `<video src="...">` element. The Slate compiler in `render/lib/scf-to-html.mjs` `transformStreamScene` does this. Any future emitter (e.g. `renderVideoLayer` for `type:"video"` SCF layers) must do the same.

## Upstream tracking

- File issues against `@hyperframes/producer` for both bugs.
- Until fixed upstream, consider adding a `postinstall` script that re-applies the two patches, or vendoring the producer.


---

## Note: companion fix in render.mjs (not a producer patch)

\
ender.mjs --split-scenes\ mode renders each scene independently and
concatenates with ffmpeg. Composition-level music in a per-scene SCF would
cause the producer to extract music starting at \	=0\ for every scene,
making the final concat play the same music intro 12 times instead of one
continuous track.

**Fix lives in \
ender/render.mjs\:**

1. \
enderSplitScenes\ strips \scf.music\ before writing each per-scene SCF.
2. After concat, \ddMusicToFinalRender\ mixes one continuous looped music
   bed over the joined video via:
   \\\
   ffmpeg -i concat.mp4 -stream_loop -1 -i music.mp3 \\
     -filter_complex "[1:a]volume=V[mus];[0:a][mus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[outa]" \\
     -map 0:v -map [outa] -c:v copy -c:a aac -b:a 192k -shortest output.mp4
   \\\

This is complementary to Patch 4 (which fixes single-render music looping
inside the producer). Both are needed — single-render path uses Patch 4,
split-scenes path uses the render.mjs post-mix.

Verified via MFCC similarity: rendered audio at \	=130s\ matches source
music at \	=130s\ (cos sim 0.998), and at \	=148s\ correctly wraps to
source \	=16s\ (148 - 132 music duration).
