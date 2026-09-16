import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRenderJob, executeRenderJob } from '../../render/node_modules/@hyperframes/producer/dist/index.js';

const projectDir = dirname(fileURLToPath(import.meta.url));
const entryFile = process.argv[2] || 'scene-2-proof.html';
const outputFile = process.argv[3] || entryFile.replace(/\.html$/i, '.mp4');
const outputPath = resolve(projectDir, outputFile);
const job = createRenderJob({ fps: 30, quality: 'draft', format: 'mp4', entryFile, workers: 1 });

await executeRenderJob(job, projectDir, outputPath, (state, message) => {
  const progress = Math.round((state.progress || 0) * 100);
  process.stdout.write(`\r[HyperFrames] ${progress}% ${message || ''}`);
});
process.stdout.write(`\n${outputPath}\n`);