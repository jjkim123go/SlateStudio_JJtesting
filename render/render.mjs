/**
 * Slate HyperFrames Renderer — SCF JSON → MP4 via @hyperframes/producer
 *
 * Usage:
 *   node render.mjs <scf-file.json> [--output <path>] [--quality draft|standard|high]
 *                                   [--workers <n>] [--use-gpu true|false]
 *                                   [--safe-webgl] [--scene <id>] [--split-scenes]
 *                                   [--dry-run] [--preview]
 */

import { execSync, spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runGovernanceGate } from './lib/governance-gate.mjs';
import { compileSCFToHTML } from './lib/scf-to-html.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WEBGL_COMPONENTS = new Set(['BuildingBlocksScene', 'ThreeScene', 'DeviceStage3D', 'HTMLTextureWall']);
const DEFAULT_WEBGL_WORKERS = 2;

// ---------- PR 5 render audit trail -----------------------------------------
// Every render attempt — success or failure — emits a JSON line under
// `output/render_audit/`. Provides reproducibility (git commit + SCF path),
// governance (deliveryProfile + brandPackage[Hash]), and a hand-off slot for
// post-render cost/model attribution from cost_log.jsonl.

function captureGitCommit() {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return null;
  }
}

function writeRenderAudit(record) {
  try {
    const auditDir = resolve('output', 'render_audit');
    mkdirSync(auditDir, { recursive: true });
    const safeTs = record.timestamp.replace(/[:.]/g, '-');
    const file = resolve(auditDir, `${safeTs}-${record.runId.slice(0, 8)}.json`);
    writeFileSync(file, JSON.stringify(record, null, 2), 'utf-8');
    return file;
  } catch (err) {
    console.error(`[Slate] (audit-trail write failed: ${err.message})`);
    return null;
  }
}

function buildAuditRecord({ runId, scfPath, scf, compiled, status, error, durationSec, governanceGateResult }) {
  const profile = (scf && scf.outputProfile) || {};
  return {
    runId,
    timestamp: new Date().toISOString(),
    gitCommit: captureGitCommit(),
    scfPath,
    pipeline: scf?.pipeline ?? null,
    deliveryProfile: profile.deliveryProfile ?? 'internal',
    brandPackage: scf?.brandPackage ?? null,
    brandPackageHash: scf?.brandPackageHash ?? null,
    brandPackageSource: scf?.brandPackageSource ?? null,
    brandLintPassed: scf?.brandLintPassed ?? null,
    componentsUsed: compiled ? compiled.componentsUsed : [],
    sceneCount: compiled ? compiled.sceneCount : (scf?.scenes?.length ?? 0),
    totalDurationSec: compiled ? compiled.totalDuration : null,
    output: { width: profile.width ?? null, height: profile.height ?? null, fps: profile.fps ?? null },
    status,
    error: error || null,
    renderDurationSec: durationSec ?? null,
    governanceGateResult: governanceGateResult ?? null,
    lottieAssets: [],
    // Post-render attribution slots (filled by other tools reading cost_log.jsonl).
    costUsd: null,
    foundryModelsUsed: [],
    toolsInvoked: [],
  };
}

function parseArgs(argv) {
  const args = { positional: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.flags.dryRun = true;
    else if (a === '--preview') args.flags.preview = true;
    else if (a === '--safe-webgl') args.flags.safeWebgl = true;
    else if (a === '--debug-render') args.flags.debugRender = true;
    else if (a === '--split-scenes') args.flags.splitScenes = true;
    else if (a === '--scene') args.flags.scene = argv[++i];
    else if (a === '--output') args.flags.output = argv[++i];
    else if (a === '--quality') args.flags.quality = argv[++i];
    else if (a === '--workers') args.flags.workers = argv[++i];
    else if (a === '--use-gpu') args.flags.useGpu = argv[++i];
    else if (a === '--webgl-backend') args.flags.webglBackend = argv[++i];
    else args.positional.push(a);
  }
  return args;
}

function usage() {
  console.log('Slate HyperFrames Renderer v0.1.0');
  console.log('');
  console.log('Usage: node render.mjs <scf-file.json> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --output <path>     Output MP4 path (default: output/<basename>.mp4)');
  console.log('  --quality <preset>  draft | standard | high (default: standard)');
  console.log('  --workers <n>       Capture worker count; WebGL default is 2 unless --safe-webgl is set');
  console.log('  --use-gpu <bool>    Request GPU encode/capture path when supported (WebGL default: true)');
  console.log('  --webgl-backend <b> ANGLE backend: swiftshader | d3d11 | default');
  console.log('  --safe-webgl        Force conservative WebGL defaults (workers=1, draft if quality omitted, swiftshader)');
  console.log('  --debug-render      Preserve producer work directories for render diagnostics');
  console.log('  --scene <id>        Render only one scene from the SCF');
  console.log('  --split-scenes      Render scenes sequentially, then concatenate with FFmpeg');
  console.log('  --dry-run           Compile SCF → HTML and exit (no render)');
  console.log('  --preview           Open compiled HTML in default browser');
}

function parsePositiveIntegerFlag(value, flagName) {
  if (value == null) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flagName} must be a positive integer`);
  }
  return parsed;
}

function parseBooleanFlag(value, flagName) {
  if (value == null) return undefined;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'off'].includes(text)) return false;
  throw new Error(`${flagName} must be true or false`);
}

function parseWebGLBackendFlag(value) {
  if (value == null) return undefined;
  const backend = String(value).trim().toLowerCase();
  if (['swiftshader', 'd3d11', 'default'].includes(backend)) return backend;
  throw new Error('--webgl-backend must be swiftshader, d3d11, or default');
}

function isProducerGpuDisabled() {
  return String(process.env.PRODUCER_DISABLE_GPU || '').trim().toLowerCase() === 'true';
}

function defaultWebGLBackend() {
  return process.platform === 'win32' ? 'd3d11' : 'default';
}

function applyWebGLDefaults({ hasWebGL, safeWebgl, quality, qualityProvided, workers, useGpu, webglBackend }) {
  if (!hasWebGL) {
    return { quality, workers, useGpu, webglBackend, message: null };
  }

  if (safeWebgl) {
    return {
      quality: qualityProvided ? quality : 'draft',
      workers: workers ?? 1,
      useGpu: useGpu ?? false,
      webglBackend: webglBackend ?? 'swiftshader',
      message: 'safe',
    };
  }

  return {
    quality,
    workers: workers ?? DEFAULT_WEBGL_WORKERS,
    useGpu: useGpu ?? !isProducerGpuDisabled(),
    webglBackend: webglBackend ?? defaultWebGLBackend(),
    message: 'gpu-default',
  };
}

function hasWebGLScene(scf) {
  const hasWebGLValue = (value) => {
    if (!value || typeof value !== 'object') return false;
    if (WEBGL_COMPONENTS.has(value.component)) return true;
    if (Array.isArray(value.layers) && value.layers.some(hasWebGLValue)) return true;
    if (Array.isArray(value.children) && value.children.some(hasWebGLValue)) return true;
    return false;
  };
  return Array.isArray(scf?.scenes) && scf.scenes.some(hasWebGLValue);
}

function filterToScene(scf, sceneId) {
  if (!sceneId) return scf;
  const index = scf.scenes?.findIndex((scene) => scene.id === sceneId) ?? -1;
  if (index < 0) {
    throw new Error(`Scene not found: ${sceneId}`);
  }
  return {
    ...scf,
    pipeline: `${scf.pipeline || 'slate'}-scene-${sceneId}`,
    scenes: [scf.scenes[index]],
    metadata: {
      ...(scf.metadata || {}),
      sourceSceneIndex: index,
      sourceSceneId: sceneId,
    },
  };
}

function shellQuoteForFfmpegConcat(filePath) {
  return String(filePath).replace(/\\/g, '/').replace(/'/g, "'\\''");
}

function renderSplitScenes({ scf, scfPath, scfBase, outputMp4, quality, workers, useGpu, webglBackend, safeWebgl, debugRender, dryRun }) {
  const scenes = scf.scenes || [];
  if (scenes.length === 0) {
    throw new Error('SCF contains no scenes');
  }
  const splitDir = resolve(dirname(outputMp4), `${scfBase}-split-scenes`);
  mkdirSync(splitDir, { recursive: true });
  const splitHasWebGL = hasWebGLScene(scf);
  const defaults = applyWebGLDefaults({
    hasWebGL: splitHasWebGL,
    safeWebgl,
    quality: quality || 'standard',
    qualityProvided: Boolean(quality),
    workers,
    useGpu,
    webglBackend,
  });
  const effectiveWorkers = defaults.workers;
  const effectiveQuality = defaults.quality;
  const effectiveUseGpu = defaults.useGpu;
  const effectiveWebGLBackend = defaults.webglBackend;

  const rendered = [];
  console.log(`[Slate] Split render: ${scenes.length} scene(s), quality=${effectiveQuality}, workers=${effectiveWorkers ?? 'auto'}, useGpu=${effectiveUseGpu ?? 'producer-default'}, webglBackend=${effectiveWebGLBackend || process.env.PRODUCER_WEBGL_BACKEND || 'producer-default'}`);
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const stem = `${String(i + 1).padStart(2, '0')}-${scene.id}`;
    const sceneScfPath = join(dirname(scfPath), `${scfBase}.split-${stem}.scf.json`);
    const sceneOutput = join(splitDir, `${stem}.mp4`);
    const sceneScf = filterToScene(scf, scene.id);
    // Path B: strip composition-level music from per-scene SCFs.
    // Each split-scene render would otherwise replay the music from t=0 of the
    // source file, causing the same intro motif to loop N times after concat.
    // Music is added back as a single continuous track in addMusicToFinalRender().
    if (sceneScf.music) {
      delete sceneScf.music;
    }
    writeFileSync(sceneScfPath, JSON.stringify(sceneScf, null, 2), 'utf-8');
    rendered.push(sceneOutput);

    const childArgs = [
      fileURLToPath(import.meta.url),
      sceneScfPath,
      '--quality',
      effectiveQuality,
      '--output',
      sceneOutput,
      '--scene',
      scene.id,
    ];
    if (effectiveWorkers != null) childArgs.push('--workers', String(effectiveWorkers));
    if (effectiveUseGpu != null) childArgs.push('--use-gpu', String(effectiveUseGpu));
    if (effectiveWebGLBackend != null) childArgs.push('--webgl-backend', effectiveWebGLBackend);
    if (safeWebgl) childArgs.push('--safe-webgl');
    if (debugRender) childArgs.push('--debug-render');
    if (dryRun) childArgs.push('--dry-run');

    console.log(`[Slate] Split render scene ${i + 1}/${scenes.length}: ${scene.id}`);
    const child = spawnSync(process.execPath, childArgs, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(effectiveWorkers != null ? { PRODUCER_MAX_WORKERS: String(effectiveWorkers) } : {}),
        ...(effectiveWebGLBackend != null ? { PRODUCER_WEBGL_BACKEND: effectiveWebGLBackend } : {}),
      },
    });
    if (child.status !== 0) {
      throw new Error(`Scene render failed: ${scene.id} (exit ${child.status})`);
    }
  }

  if (dryRun) {
    console.log('[Slate] --dry-run: split scene SCFs were generated; skipping concat');
    return;
  }

  const concatPath = join(splitDir, 'concat.txt');
  writeFileSync(
    concatPath,
    rendered.map((file) => `file '${shellQuoteForFfmpegConcat(resolve(file))}'`).join('\n') + '\n',
    'utf-8',
  );

  const hasMusic = Boolean(scf.music?.src);
  const concatTarget = hasMusic
    ? join(splitDir, '_concat-no-music.mp4')
    : outputMp4;

  console.log(`[Slate] Concatenating ${rendered.length} scene render(s) → ${concatTarget}`);
  const ffmpeg = spawnSync('ffmpeg', ['-y', '-hide_banner', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', concatTarget], {
    stdio: 'inherit',
  });
  if (ffmpeg.status !== 0) {
    throw new Error(`FFmpeg concat failed (exit ${ffmpeg.status})`);
  }

  if (hasMusic) {
    addMusicToFinalRender({
      concatMp4: concatTarget,
      outputMp4,
      music: scf.music,
      scfDir: dirname(scfPath),
      projectDir: dirname(scfPath),
      repoRoot: resolve(__dirname, '..'),
    });
  }
}

/**
 * Mix a single continuous music bed into a fully-concatenated split-scene
 * render. This is the second half of Path B: per-scene SCFs were stripped of
 * music in renderSplitScenes() so each scene's audio is narration-only; here
 * we add looping music to the full timeline as one stream, eliminating the
 * intro-motif-on-every-scene bug.
 */
function addMusicToFinalRender({ concatMp4, outputMp4, music, scfDir, projectDir, repoRoot }) {
  const musicSrc = resolveMusicSrc(music.src, { scfDir, projectDir, repoRoot });
  if (!existsSync(musicSrc)) {
    console.warn(`[Slate] Music source not found, skipping music mix: ${musicSrc}`);
    if (concatMp4 !== outputMp4) {
      copyFileSync(concatMp4, outputMp4);
    }
    return;
  }
  const volume = music.volume ?? 0.15;
  console.log(`[Slate] Mixing continuous music bed (vol=${volume}) into ${outputMp4}`);
  const filter = `[1:a]volume=${volume}[mus];[0:a][mus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[outa]`;
  const args = [
    '-y', '-hide_banner',
    '-i', concatMp4,
    '-stream_loop', '-1', '-i', musicSrc,
    '-filter_complex', filter,
    '-map', '0:v',
    '-map', '[outa]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outputMp4,
  ];
  const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`FFmpeg music mix failed (exit ${result.status})`);
  }
}

function resolveMusicSrc(src, { scfDir, projectDir, repoRoot }) {
  if (!src) return null;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  for (const base of [scfDir, projectDir, repoRoot]) {
    const candidate = resolve(base, src);
    if (existsSync(candidate)) return candidate;
  }
  return resolve(scfDir, src);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.positional.length === 0) {
    usage();
    process.exit(0);
  }

  const runId = randomUUID();
  const scfPath = resolve(args.positional[0]);
  if (!existsSync(scfPath)) {
    console.error(`SCF file not found: ${scfPath}`);
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf: null, compiled: null,
      status: 'failure', error: 'SCF file not found',
    }));
    process.exit(1);
  }

  const scfDir = dirname(scfPath);
  const scfBase = basename(scfPath).replace(/\.scf\.json$/, '').replace(/\.json$/, '');

  // Default output location is the SCF's own directory (projects/<slug>/).
  // This keeps all artifacts co-located. --output overrides the MP4 path.
  const outputDir = scfDir;
  mkdirSync(outputDir, { recursive: true });

  const outputMp4 = args.flags.output
    ? resolve(args.flags.output)
    : resolve(outputDir, 'renders', `${scfBase}.mp4`);
  const htmlPath = resolve(outputDir, `${scfBase}.html`);
  mkdirSync(dirname(outputMp4), { recursive: true });

  // Ensure renders/ subdirectory exists when using default path
  if (!args.flags.output) {
    mkdirSync(resolve(outputDir, 'renders'), { recursive: true });
  }
  let quality = args.flags.quality || 'standard';
  let workers;
  let useGpu;
  let webglBackend;
  try {
    workers = parsePositiveIntegerFlag(args.flags.workers, '--workers');
    useGpu = parseBooleanFlag(args.flags.useGpu, '--use-gpu');
    webglBackend = parseWebGLBackendFlag(args.flags.webglBackend);
  } catch (err) {
    console.error(`[Slate] Invalid render option: ${err.message}`);
    process.exit(1);
  }

  console.log(`[Slate] Reading SCF: ${scfPath}`);
  console.log(`[Slate] Run id: ${runId}`);
  let scf;
  try {
    scf = JSON.parse(readFileSync(scfPath, 'utf-8'));
  } catch (err) {
    console.error(`[Slate] Failed to parse SCF JSON: ${err.message}`);
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf: null, compiled: null,
      status: 'failure', error: `parse: ${err.message}`,
    }));
    process.exit(1);
  }
  if (args.flags.scene) {
    try {
      scf = filterToScene(scf, args.flags.scene);
    } catch (err) {
      console.error(`[Slate] ${err.message}`);
      process.exit(1);
    }
  }
  if (args.flags.splitScenes) {
    try {
      renderSplitScenes({
        scf,
        scfPath,
        scfBase,
        outputMp4,
        quality: args.flags.quality,
        workers,
        useGpu,
        webglBackend,
        safeWebgl: args.flags.safeWebgl,
        debugRender: args.flags.debugRender,
        dryRun: args.flags.dryRun,
      });
      writeRenderAudit(buildAuditRecord({
        runId,
        scfPath,
        scf,
        compiled: null,
        status: args.flags.dryRun ? 'split-scenes-dry-run' : 'split-scenes-success',
        error: null,
      }));
      return;
    } catch (err) {
      console.error(`[Slate] Split render failed: ${err.message}`);
      writeRenderAudit(buildAuditRecord({
        runId,
        scfPath,
        scf,
        compiled: null,
        status: 'failure',
        error: `split-scenes: ${err.message}`,
      }));
      process.exit(4);
    }
  }

  console.log('[Slate] Running governance gate...');
  let governanceGateResult;
  try {
    governanceGateResult = await runGovernanceGate(scf, scfPath, {
      auditCallback: (finding) => {
        if (finding.severity === 'high' && !finding.waiverPresent) {
          console.warn(`[Slate]   ⚠ ${finding.class}: ${finding.match} (${finding.scenePath})`);
        }
      },
    });
  } catch (err) {
    console.error(`[Slate] Governance gate error: ${err.message}`);
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf, compiled: null,
      status: 'failure', error: `governance: ${err.message}`,
    }));
    process.exit(10);
  }

  if (!governanceGateResult.passed) {
    console.error(`❌ Governance gate FAILED: ${governanceGateResult.reason}`);
    console.error(`   Profile: ${governanceGateResult.profile}`);
    console.error(`   Blocking findings: ${governanceGateResult.blockingFindings.length}`);
    for (const f of governanceGateResult.blockingFindings.slice(0, 5)) {
      console.error(`     - ${f.scenePath}: ${f.class} (${f.match})`);
    }
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf, compiled: null,
      status: 'governance-blocked', error: governanceGateResult.reason,
      governanceGateResult,
    }));
    process.exit(10);
  }

  if (governanceGateResult.classifierResult?.summary?.totalFindings > 0) {
    console.log(`[Slate] Governance: ${governanceGateResult.classifierResult.summary.totalFindings} finding(s) (profile=${governanceGateResult.profile}, passed)`);
  } else {
    console.log(`[Slate] Governance: clean (profile=${governanceGateResult.profile})`);
  }

  console.log('[Slate] Compiling SCF → HyperFrames HTML...');
  let compiled;
  try {
    compiled = compileSCFToHTML(scf, { scfDir, projectDir: dirname(htmlPath), repoRoot: resolve(dirname(fileURLToPath(import.meta.url)), '..') });
  } catch (err) {
    console.error(`[Slate] Compile failed: ${err.message}`);
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf, compiled: null,
      status: 'failure', error: `compile: ${err.message}`,
      governanceGateResult,
    }));
    process.exit(2);
  }

  writeFileSync(htmlPath, compiled.html, 'utf-8');
  console.log(`[Slate] HTML composition: ${htmlPath}`);
  console.log(`[Slate] Composition: ${compiled.sceneCount} scenes, ${compiled.totalDuration}s @ ${compiled.width}x${compiled.height}`);
  const compiledHasWebGL = compiled.componentsUsed?.some((c) => WEBGL_COMPONENTS.has(c));
  const defaults = applyWebGLDefaults({
    hasWebGL: compiledHasWebGL,
    safeWebgl: args.flags.safeWebgl,
    quality,
    qualityProvided: Boolean(args.flags.quality),
    workers,
    useGpu,
    webglBackend,
  });
  quality = defaults.quality;
  workers = defaults.workers;
  useGpu = defaults.useGpu;
  webglBackend = defaults.webglBackend;
  if (defaults.message === 'safe') {
    console.warn('[Slate]   WebGL composition detected; using safe local capture defaults (workers=1, quality=draft unless overridden, software WebGL backend).');
  } else if (defaults.message === 'gpu-default') {
    console.warn(`[Slate]   WebGL composition detected; defaulting to GPU-oriented capture (workers=${workers}, useGpu=${useGpu}, webglBackend=${webglBackend}).`);
    console.warn('[Slate]     Use --safe-webgl for conservative software WebGL fallback, or override --workers/--use-gpu/--webgl-backend explicitly.');
  }

  if (args.flags.dryRun) {
    console.log('[Slate] --dry-run: skipping render');
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf, compiled,
      status: 'dry-run', error: null,
      governanceGateResult,
    }));
    return;
  }

  if (args.flags.preview) {
    const url = `file://${htmlPath.replace(/\\/g, '/')}`;
    console.log(`[Slate] --preview: open ${url}`);
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf, compiled,
      status: 'preview', error: null,
      governanceGateResult,
    }));
    return;
  }

  // Lazy-import producer so --dry-run works without the heavy dep installed
  let producer;
  try {
    producer = await import('@hyperframes/producer');
  } catch (err) {
    console.error('[Slate] @hyperframes/producer is not installed.');
    console.error('        Run `cd render && npm install` to install renderer deps.');
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf, compiled,
      status: 'failure', error: 'producer not installed',
      governanceGateResult,
    }));
    process.exit(3);
  }

  const { createRenderJob, executeRenderJob } = producer;
  if (webglBackend != null) {
    process.env.PRODUCER_WEBGL_BACKEND = webglBackend;
  }

  const fps = compiled.fps === 24 || compiled.fps === 60 ? compiled.fps : 30;
  const job = createRenderJob({
    fps,
    quality,
    format: 'mp4',
    entryFile: basename(htmlPath),
    ...(workers != null ? { workers } : {}),
    ...(useGpu != null ? { useGpu } : {}),
    ...(args.flags.debugRender ? { debug: true } : {}),
  });

  const projectDir = dirname(htmlPath);

  const workerLabel = workers != null ? workers : (process.env.PRODUCER_MAX_WORKERS || 'auto');
  console.log(`[Slate] Rendering via @hyperframes/producer (quality=${quality}, fps=${fps}, workers=${workerLabel}, webglBackend=${webglBackend || process.env.PRODUCER_WEBGL_BACKEND || 'producer-default'})`);
  if (compiledHasWebGL && !args.flags.splitScenes) {
    console.warn('[Slate]   For long WebGL videos, prefer `--split-scenes` to isolate scene failures; use `--safe-webgl` only for software fallback.');
  }
  const startMs = Date.now();
  try {
    await executeRenderJob(job, projectDir, outputMp4, (j, message) => {
      const pct = Math.round((j.progress || 0) * 100);
      process.stdout.write(`\r[Slate] ${j.status.padEnd(12)} ${pct.toString().padStart(3)}%  ${message || ''}     `);
    });
    process.stdout.write('\n');
  } catch (err) {
    process.stdout.write('\n');
    console.error(`[Slate] Render failed: ${err.message}`);
    if (job.errorDetails) {
      console.error(`        Stage: ${job.failedStage}`);
      console.error(`        Free memory: ${job.errorDetails.freeMemoryMB}MB`);
    }
    writeRenderAudit(buildAuditRecord({
      runId, scfPath, scf, compiled,
      status: 'failure', error: `render: ${err.message}`,
      durationSec: ((Date.now() - startMs) / 1000),
      governanceGateResult,
    }));
    process.exit(4);
  }

  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`[Slate] ✓ Rendered ${outputMp4} in ${elapsedSec}s`);
  if (job.perfSummary) {
    console.log(`[Slate]   Frames: ${job.perfSummary.totalFrames}, FPS: ${job.perfSummary.fps}, Audio tracks: ${job.perfSummary.audioCount}`);
  }
  const auditFile = writeRenderAudit(buildAuditRecord({
    runId, scfPath, scf, compiled,
    status: 'success', error: null,
    durationSec: parseFloat(elapsedSec),
    governanceGateResult,
  }));
  if (auditFile) console.log(`[Slate]   Audit: ${auditFile}`);
}

main().catch((err) => {
  console.error(`[Slate] Unhandled error: ${err.stack || err.message}`);
  process.exit(99);
});
