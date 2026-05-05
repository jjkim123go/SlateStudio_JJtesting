/**
 * Slate component/SCF frame capture — SCF JSON → deterministic PNG frame.
 *
 * This is intentionally a thin wrapper around the existing SCF compiler and
 * @hyperframes/producer capture primitives. It does not introduce a new HTML
 * rasterizer and does not patch node_modules.
 */

import {
  captureFrameToBuffer,
  closeCaptureSession,
  createCaptureSession,
  createFileServer,
  initializeSession,
} from '@hyperframes/producer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { compileSCFToHTML } from './lib/scf-to-html.mjs';

function parseArgs(argv) {
  const args = { flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--scf') args.flags.scf = argv[++i];
    else if (a === '--output') args.flags.output = argv[++i];
    else if (a === '--work-dir') args.flags.workDir = argv[++i];
    else if (a === '--time') args.flags.time = Number(argv[++i]);
    else if (a === '--fps') args.flags.fps = Number(argv[++i]);
    else if (a === '--width') args.flags.width = Number(argv[++i]);
    else if (a === '--height') args.flags.height = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args.flags;
}

function usage() {
  console.error('Usage: node capture-frame.mjs --scf <file.scf.json> --output <frame.png> [--time 0] [--fps 30] [--work-dir <dir>] [--width N --height N]');
}

async function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
  } catch (err) {
    usage();
    console.error(err.message);
    process.exit(2);
  }

  if (!flags.scf || !flags.output) {
    usage();
    process.exit(2);
  }

  const scfPath = resolve(flags.scf);
  if (!existsSync(scfPath)) {
    throw new Error(`SCF file not found: ${scfPath}`);
  }

  const outputPath = resolve(flags.output);
  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });

  const workDir = resolve(flags.workDir || outputDir, `.capture-${basename(outputPath, '.png')}`);
  mkdirSync(workDir, { recursive: true });

  const scf = JSON.parse(readFileSync(scfPath, 'utf-8'));
  const scfDir = dirname(scfPath);
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

  const compiled = compileSCFToHTML(scf, {
    scfDir,
    projectDir: workDir,
    repoRoot,
  });

  const htmlPath = resolve(workDir, 'index.html');
  writeFileSync(htmlPath, compiled.html, 'utf-8');

  const fps = Number.isFinite(flags.fps) ? flags.fps : (compiled.fps || 30);
  const width = Number.isFinite(flags.width) ? flags.width : compiled.width;
  const height = Number.isFinite(flags.height) ? flags.height : compiled.height;
  const time = Number.isFinite(flags.time) ? flags.time : 0;

  if (time < 0 || time > compiled.totalDuration) {
    throw new Error(`Capture time ${time}s is outside composition duration ${compiled.totalDuration}s`);
  }

  let fileServer = null;
  let session = null;
  try {
    fileServer = await createFileServer({ projectDir: workDir, port: 0 });
    session = await createCaptureSession(
      fileServer.url,
      workDir,
      { width, height, fps, format: 'png' },
      null,
      { forceScreenshot: true },
    );
    await initializeSession(session);
    const frameIndex = Math.round(time * fps);
    const { buffer, captureTimeMs } = await captureFrameToBuffer(session, frameIndex, time);
    writeFileSync(outputPath, buffer);

    console.log(JSON.stringify({
      texture_path: outputPath,
      width,
      height,
      time,
      frame_index: frameIndex,
      fps,
      duration: compiled.totalDuration,
      html_path: htmlPath,
      work_dir: workDir,
      capture_time_ms: captureTimeMs,
      deterministic: true,
      renderer: '@hyperframes/producer',
    }));
  } finally {
    if (session) await closeCaptureSession(session).catch(() => {});
    if (fileServer) fileServer.close();
  }
}

main().catch((err) => {
  console.error(`[Slate capture-frame] ${err.stack || err.message}`);
  process.exit(1);
});
