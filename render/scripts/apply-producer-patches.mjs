#!/usr/bin/env node
/**
 * Slate — HyperFrames producer postinstall patcher
 *
 * Applies any producer-version-specific source patches documented in
 * render/PATCHES.md to `node_modules/@hyperframes/producer/dist/index.js`.
 *
 * As of @hyperframes 0.5.7 (the pinned runtime) NO patches are required: the
 * four 0.4.x-era patches (2× Windows path separator, configurable WebGL ANGLE
 * backend, short-audio loop) were all either fixed upstream or had their
 * surrounding source refactored away. The PATCHES array is therefore empty.
 * It is kept (not deleted) as the wiring + idempotency harness so a future
 * runtime bump that needs a patch can re-populate it.
 *
 * NOTE: HyperFrames 0.6.0+ is a deliberate non-target — it introduces a
 * sub-composition timeline requirement that is incompatible with Slate's
 * current data-composition-id emission (see render/PATCHES.md and
 * docs/ARCHITECTURE.md). Re-pinning to 0.6/0.7 requires a compiler migration,
 * not a producer patch.
 *
 * Behaviour:
 *   - If the producer file is missing (e.g. fresh checkout before `npm install`
 *     finishes resolving deps), exit 0 with a warning so we don't break install.
 *   - With an empty PATCHES array, exit 0 with a "no patches required" log.
 *   - If a patch needle is missing AND the patched form is also missing, log a
 *     loud warning so the developer knows the producer version drifted.
 *
 * Wired via `"postinstall": "node scripts/apply-producer-patches.mjs"` in
 * render/package.json, so it runs automatically after every `npm install` /
 * `npm ci` inside render/.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Producer source patches, keyed by needle → replacement; `replacement`
// doubles as the idempotency sentinel when populated.
//
// EMPTY for the pinned @hyperframes 0.5.7 runtime — no patches required
// (see the file header for the history of the retired 0.4.x patches).
const PATCHES = [];

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
  } else if (PATCHES.length === 0) {
    console.log(
      '[Slate] HyperFrames producer: no source patches required for the pinned 0.5.x runtime.',
    );
  } else {
    console.log('[Slate] HyperFrames producer patches verified:');
  }
  for (const line of summary) console.log(line);
}

main();
