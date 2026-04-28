#!/usr/bin/env node
/**
 * Slate — HyperFrames producer postinstall patcher
 *
 * Idempotently re-applies the two Windows-path-separator patches documented
 * in render/PATCHES.md to `node_modules/@hyperframes/producer/dist/index.js`.
 *
 * Behaviour:
 *   - If the producer file is missing (e.g. fresh checkout before `npm install`
 *     finishes resolving deps), exit 0 with a warning so we don't break install.
 *   - If both patches are already present, exit 0 with a "verified" log.
 *   - If a patch needle is missing AND the patched form is also missing, log a
 *     loud warning so the developer knows the producer version drifted.
 *   - Otherwise apply the patch and exit 0.
 *
 * Wired via `"postinstall": "node scripts/apply-producer-patches.mjs"` in
 * render/package.json, so it runs automatically after every `npm install` /
 * `npm ci` inside render/.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCER_PATH = resolve(
  __dirname,
  '..',
  'node_modules',
  '@hyperframes',
  'producer',
  'dist',
  'index.js',
);

// Each patch declares the original (broken) needle and the patched replacement.
// `replacement` doubles as the idempotency sentinel — if it's already present
// in the file, we skip.
const PATCHES = [
  {
    name: 'Site 1 — collectExternalAssets (Windows path separator)',
    needle: 'absPath.startsWith(absProjectDir + "/")',
    replacement:
      'absPath.startsWith(absProjectDir + (process.platform === "win32" ? "\\\\" : "/"))',
  },
  {
    name: 'Site 2 — external-asset copy safety check (Windows path separator)',
    needle: 'outPath.startsWith(compileDir + "/")',
    replacement:
      'outPath.startsWith(compileDir + (process.platform === "win32" ? "\\\\" : "/"))',
  },
];

function main() {
  if (!existsSync(PRODUCER_PATH)) {
    console.warn(
      `[Slate] @hyperframes/producer not found at ${PRODUCER_PATH} — ` +
        `skipping patcher (run \`npm install\` inside render/ first).`,
    );
    return;
  }

  let src = readFileSync(PRODUCER_PATH, 'utf-8');
  let modified = false;
  const summary = [];

  for (const patch of PATCHES) {
    if (src.includes(patch.replacement)) {
      summary.push(`  [ok]   ${patch.name} — already patched`);
      continue;
    }
    if (!src.includes(patch.needle)) {
      summary.push(
        `  [warn] ${patch.name} — needle not found AND replacement not found. ` +
          `Producer version may have drifted; see render/PATCHES.md.`,
      );
      continue;
    }
    src = src.replace(patch.needle, patch.replacement);
    modified = true;
    summary.push(`  [fix]  ${patch.name} — applied`);
  }

  if (modified) {
    writeFileSync(PRODUCER_PATH, src, 'utf-8');
    console.log('[Slate] HyperFrames producer patches applied:');
  } else {
    console.log('[Slate] HyperFrames producer patches verified:');
  }
  for (const line of summary) console.log(line);
}

main();
