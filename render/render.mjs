/**
 * Slate HyperFrames Renderer — SCF JSON → MP4 via @hyperframes/producer
 *
 * Usage:
 *   node render.mjs <scf-file.json> [--output <path>] [--quality draft|standard|high]
 *                                   [--dry-run] [--preview]
 */

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runGovernanceGate } from './lib/governance-gate.mjs';
import { compileSCFToHTML } from './lib/scf-to-html.mjs';

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
    else if (a === '--output') args.flags.output = argv[++i];
    else if (a === '--quality') args.flags.quality = argv[++i];
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
  console.log('  --dry-run           Compile SCF → HTML and exit (no render)');
  console.log('  --preview           Open compiled HTML in default browser');
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

  // Ensure renders/ subdirectory exists when using default path
  if (!args.flags.output) {
    mkdirSync(resolve(outputDir, 'renders'), { recursive: true });
  }
  const quality = args.flags.quality || 'standard';

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

  const fps = compiled.fps === 24 || compiled.fps === 60 ? compiled.fps : 30;
  const job = createRenderJob({
    fps,
    quality,
    format: 'mp4',
    entryFile: basename(htmlPath),
  });

  const projectDir = dirname(htmlPath);

  console.log(`[Slate] Rendering via @hyperframes/producer (quality=${quality}, fps=${fps})`);
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
