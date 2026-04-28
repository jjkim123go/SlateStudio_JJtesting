/**
 * Slate — Video render verification (anti-frozen-frame SSIM check).
 *
 * Purpose
 * -------
 * Catches the failure mode protected by Standing Rule #17: every <video>
 * element must emit an explicit `id` so HyperFrames producer's
 * `injectVideoFramesBatch` can find it by id at render time. When that
 * contract is broken, the rendered MP4 shows the static poster frame for the
 * entire duration of the video scene — but the producer's own audit envelope
 * reports `videoCount:1, errors:[]` because parsing succeeded and frames
 * *were* extracted, just never injected. The SCF compiles, the render
 * "succeeds", and only watching the file (or this check) reveals the bug.
 *
 * Strategy
 * --------
 *   1. Render `tests/qa-scenarios/pr8a-stream-videoclip.scf.json` (uses a
 *      real ~12s Sora-2 clip via StreamScene's videoClipMode).
 *   2. Extract two frames from the rendered MP4 inside the time window where
 *      the embedded video should be playing — t=2s and t=10s.
 *   3. Compute SSIM between the two frames using ffmpeg's `ssim` filter.
 *   4. Assert SSIM < THRESHOLD. If the embedded video is frozen on its
 *      poster, the two frames are nearly identical and SSIM ≈ 1.0. If the
 *      video is actually advancing, SSIM is comfortably below the threshold.
 *
 * Heaviness
 * ---------
 * This test renders a real composition through HyperFrames + Chromium and
 * runs ffmpeg three times. Expect ~60-180s wall time. It is *not* part of
 * `npm run smoke`. Run it explicitly:
 *
 *   node tests/_video_render_check.mjs
 *
 * Skip via env var (e.g. on CI runners without ffmpeg or with constrained
 * resources):
 *
 *   SLATE_SKIP_VIDEO_CHECK=1 node tests/_video_render_check.mjs
 *
 * Exit codes: 0 = pass, 1 = fail, 2 = skipped (missing prerequisites).
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SCF_PATH = resolve(REPO_ROOT, 'tests', 'qa-scenarios', 'pr8a-stream-videoclip.scf.json');
const RENDER_SCRIPT = resolve(REPO_ROOT, 'render', 'render.mjs');
const ASSET_PATH = resolve(REPO_ROOT, 'tests', 'qa-scenarios', 'assets', 'pr8a-stream-clip-test.mp4');

// SSIM thresholds.
//   - A truly frozen scene (poster only) yields SSIM ≈ 0.97-1.0 between any
//     two frames inside the scene's duration.
//   - A real advancing 12s Sora-2 clip yields SSIM ≈ 0.3-0.6 between t=2s
//     and t=10s in the videoclip region.
//   - Threshold = 0.85: comfortably above any plausible "real motion" SSIM,
//     comfortably below any plausible "frozen poster" SSIM. Tweak only if
//     both sides start landing inside the same band.
const SSIM_FROZEN_THRESHOLD = 0.85;
const SAMPLE_T1 = 2;
const SAMPLE_T2 = 10;

function skip(msg) {
  console.log(`[video-check] SKIP — ${msg}`);
  process.exit(2);
}

function fail(msg) {
  console.error(`[video-check] FAIL — ${msg}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf-8', shell: false, ...opts });
  if (r.error) throw r.error;
  return r;
}

function ffmpegOk() {
  const r = run('ffmpeg', ['-version']);
  return r.status === 0;
}

function extractFrame(srcMp4, ts, outPng) {
  const r = run('ffmpeg', [
    '-y',
    '-ss', String(ts),
    '-i', srcMp4,
    '-frames:v', '1',
    '-q:v', '2',
    outPng,
  ]);
  if (r.status !== 0) {
    fail(`ffmpeg failed extracting frame at t=${ts}s: ${r.stderr.split('\n').slice(-5).join('\n')}`);
  }
}

function ssimBetween(pngA, pngB) {
  // ffmpeg's ssim filter prints to stderr a line like:
  //   [Parsed_ssim_0 @ 000...] SSIM Y:0.823 (...) U:0.91 ... All:0.842 (8.00)
  const r = run('ffmpeg', [
    '-y',
    '-i', pngA,
    '-i', pngB,
    '-filter_complex', '[0:v][1:v]ssim',
    '-f', 'null',
    '-',
  ]);
  if (r.status !== 0) {
    fail(`ffmpeg ssim filter failed: ${r.stderr.split('\n').slice(-5).join('\n')}`);
  }
  const m = r.stderr.match(/SSIM[^\n]*All:\s*([0-9.]+)/i);
  if (!m) fail(`could not parse SSIM from ffmpeg output:\n${r.stderr}`);
  return parseFloat(m[1]);
}

function main() {
  if (process.env.SLATE_SKIP_VIDEO_CHECK === '1') skip('SLATE_SKIP_VIDEO_CHECK=1');
  if (!existsSync(SCF_PATH)) skip(`SCF not found: ${SCF_PATH}`);
  if (!existsSync(ASSET_PATH)) skip(`Sora-2 test clip not found: ${ASSET_PATH} (run PR 8a generation first)`);
  if (!existsSync(RENDER_SCRIPT)) skip(`renderer not found: ${RENDER_SCRIPT}`);
  if (!ffmpegOk()) skip('ffmpeg not available on PATH');

  const workDir = resolve(tmpdir(), `slate-video-check-${process.pid}`);
  mkdirSync(workDir, { recursive: true });
  const outMp4 = resolve(workDir, 'render.mp4');
  const frameA = resolve(workDir, `frame-t${SAMPLE_T1}.png`);
  const frameB = resolve(workDir, `frame-t${SAMPLE_T2}.png`);

  console.log(`[video-check] rendering SCF: ${SCF_PATH}`);
  console.log(`[video-check] (this may take 60-180s — full HyperFrames render)`);
  const renderStart = Date.now();
  const r = run('node', [RENDER_SCRIPT, SCF_PATH, '--output', outMp4, '--quality', 'draft'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (r.status !== 0) fail(`render exited with status ${r.status}`);
  if (!existsSync(outMp4)) fail(`render reported success but output MP4 missing: ${outMp4}`);
  const renderSec = ((Date.now() - renderStart) / 1000).toFixed(1);
  console.log(`[video-check] render OK (${renderSec}s) → ${outMp4}`);

  console.log(`[video-check] extracting frames at t=${SAMPLE_T1}s and t=${SAMPLE_T2}s`);
  extractFrame(outMp4, SAMPLE_T1, frameA);
  extractFrame(outMp4, SAMPLE_T2, frameB);

  const ssim = ssimBetween(frameA, frameB);
  console.log(`[video-check] SSIM(t=${SAMPLE_T1}s, t=${SAMPLE_T2}s) = ${ssim.toFixed(4)}  (threshold < ${SSIM_FROZEN_THRESHOLD})`);

  if (ssim >= SSIM_FROZEN_THRESHOLD) {
    fail(
      `SSIM ${ssim.toFixed(4)} ≥ threshold ${SSIM_FROZEN_THRESHOLD}. ` +
      `The embedded video appears FROZEN (poster shown for whole scene). ` +
      `This is the SR #17 failure mode — verify every <video src=> emitter ` +
      `(scf-to-html.mjs renderVideoLayer / transformStreamScene / etc.) ` +
      `emits an explicit id="..." attribute. See render/PATCHES.md.`,
    );
  }

  // Cleanup on success only (keep artifacts for debugging on failure)
  try { rmSync(workDir, { recursive: true, force: true }); } catch { /* noop */ }
  console.log(`[video-check] PASS — embedded video is animating correctly (SR #17 contract upheld)`);
  process.exit(0);
}

main();
