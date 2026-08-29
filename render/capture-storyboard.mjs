#!/usr/bin/env node
/** Capture one deterministic storyboard snapshot per SCF scene in one session. */
import {
    captureFrameToBuffer,
    closeCaptureSession,
    createCaptureSession,
    createFileServer,
    initializeSession,
} from '@hyperframes/producer';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { compileSCFToHTML } from './lib/scf-to-html.mjs';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--scf') out.scf = argv[++i];
    else if (argv[i] === '--output-dir') out.outputDir = argv[++i];
    else if (argv[i] === '--width') out.width = Number(argv[++i]);
    else if (argv[i] === '--height') out.height = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return out;
}

async function main() {
  const flags = args(process.argv.slice(2));
  if (!flags.scf || !flags.outputDir) {
    throw new Error('Usage: capture-storyboard.mjs --scf <composition.scf.json> --output-dir <snapshots>');
  }
  const scfPath = resolve(flags.scf);
  if (!existsSync(scfPath)) throw new Error(`SCF not found: ${scfPath}`);
  const outputDir = resolve(flags.outputDir);
  const scfDir = dirname(scfPath);
  // The producer always opens /index.html. Serve the actual project directory
  // so component-relative assets such as assets/images/hero.png resolve.
  const workDir = scfDir;
  const htmlPath = resolve(workDir, 'index.html');
  const backupPath = resolve(workDir, '.index.before-storyboard-capture.html');
  mkdirSync(outputDir, { recursive: true });

  const scf = JSON.parse(readFileSync(scfPath, 'utf-8'));
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const compiled = compileSCFToHTML(scf, { scfDir, projectDir: workDir, repoRoot });
  if (existsSync(htmlPath)) renameSync(htmlPath, backupPath);
  writeFileSync(htmlPath, compiled.html, 'utf-8');

  const width = Number.isFinite(flags.width) ? flags.width : compiled.width;
  const height = Number.isFinite(flags.height) ? flags.height : compiled.height;
  const fps = compiled.fps || 30;
  let server = null;
  let session = null;
  let cursor = 0;
  const captures = [];
  try {
    server = await createFileServer({ projectDir: workDir, port: 0 });
    session = await createCaptureSession(server.url, workDir,
      { width, height, fps, format: 'png' }, null, { forceScreenshot: true });
    await initializeSession(session);
    for (const scene of scf.scenes || []) {
      const duration = Number(scene.duration || 0);
      const offset = Math.min(Math.max(duration * 0.58, 1.2), Math.max(1.2, duration - 1.2));
      const time = cursor + offset;
      const frameIndex = Math.round(time * fps);
      const { buffer, captureTimeMs } = await captureFrameToBuffer(session, frameIndex, time);
      const output = resolve(outputDir, `${scene.id}.png`);
      writeFileSync(output, buffer);
      captures.push({ id: scene.id, time, frameIndex, output, captureTimeMs });
      console.log(`[snapshot] ${scene.id} @ ${time.toFixed(2)}s → ${basename(output)}`);
      cursor += duration;
    }
    writeFileSync(resolve(outputDir, 'manifest.json'), JSON.stringify({
      scf: scfPath, width, height, fps, duration: compiled.totalDuration, captures,
    }, null, 2));
  } finally {
    if (session) await closeCaptureSession(session).catch(() => {});
    if (server) server.close();
    rmSync(htmlPath, { force: true });
    if (existsSync(backupPath)) renameSync(backupPath, htmlPath);
  }
}

main().catch((error) => {
  console.error(`[Slate capture-storyboard] ${error.stack || error.message}`);
  process.exit(1);
});
