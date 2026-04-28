/**
 * Governance Gate — PR 9 hard-blocking enforcement for sensitive delivery profiles.
 *
 * Runs the demo-data classifier on the RAW SCF (before compile) and enforces:
 *   - Brand-package version pinning for gated profiles
 *   - brandLintPassed === true for gated profiles
 *   - Zero unwaivered high-severity demo-data findings for gated profiles
 *
 * Gated profiles: external, executive, regulated.
 * Non-gated profiles (internal, draft, or missing): warn-only — always passes.
 *
 * Exit code 10 = governance-blocked (used by render.mjs).
 */

import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const GATED_PROFILES = new Set(['external', 'executive', 'regulated']);
const BRAND_PIN_RE = /^[a-z0-9_-]+@\d+(\.\d+)*$/i;

// Cached Python interpreter path (resolved once per process).
let _cachedPython = null;

/**
 * Find a working Python interpreter following the resolution order.
 * Caches the result so subsequent calls are instant.
 */
async function resolvePython() {
  if (_cachedPython) return _cachedPython;

  const envOverride = process.env.SLATE_PYTHON;
  if (envOverride) {
    _cachedPython = envOverride;
    return _cachedPython;
  }

  const candidates = process.platform === 'win32'
    ? [
        resolve(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe'),
        'py',
        'python3',
        'python',
      ]
    : [
        resolve(PROJECT_ROOT, '.venv', 'bin', 'python'),
        'python3',
        'python',
      ];

  for (const candidate of candidates) {
    // For absolute paths, check existence first to avoid noisy errors.
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (!existsSync(candidate)) continue;
    }
    try {
      await execFilePromise(candidate, ['--version']);
      _cachedPython = candidate;
      return _cachedPython;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    `Python interpreter not found. Tried: ${candidates.join(', ')}. ` +
    'Set SLATE_PYTHON env var to override.'
  );
}

function execFilePromise(cmd, args, opts = {}) {
  return new Promise((ok, fail) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        err.stdout = stdout;
        return fail(err);
      }
      ok({ stdout, stderr });
    });
  });
}

/**
 * Spawn the Python demo-data classifier as a subprocess and return parsed JSON.
 */
async function spawnClassifier(scfPath) {
  const python = await resolvePython();
  const env = { ...process.env, PYTHONPATH: resolve(PROJECT_ROOT, 'src') };

  const { stdout, stderr } = await execFilePromise(
    python,
    ['-m', 'slate.tools.governance.demo_data_classifier', scfPath],
    { env, maxBuffer: 10 * 1024 * 1024 }
  );

  if (stderr && stderr.trim()) {
    // Log warnings but don't treat as fatal — Python may emit deprecation notices.
    console.warn(`[Slate] Classifier stderr: ${stderr.trim()}`);
  }

  try {
    return JSON.parse(stdout);
  } catch (parseErr) {
    throw new Error(
      `Failed to parse classifier JSON output: ${parseErr.message}\n` +
      `stdout (first 500 chars): ${(stdout || '').slice(0, 500)}`
    );
  }
}

/**
 * Run the governance gate on a raw SCF document.
 *
 * @param {object} scf - Parsed SCF JSON document.
 * @param {string} scfPath - Filesystem path to the SCF file (passed to subprocess).
 * @param {object} [options]
 * @param {function} [options.auditCallback] - Called with each finding for audit-trail integration.
 * @returns {Promise<{
 *   passed: boolean,
 *   profile: string,
 *   blockingFindings: Array,
 *   waiversHonored: Array,
 *   reason?: string,
 *   brandLintRequired: boolean,
 *   brandPinRequired: boolean,
 *   classifierResult?: object
 * }>}
 */
export async function runGovernanceGate(scf, scfPath, { auditCallback } = {}) {
  const profile = scf?.outputProfile?.deliveryProfile ?? 'internal';
  const isGated = GATED_PROFILES.has(profile);

  const result = {
    passed: true,
    profile,
    blockingFindings: [],
    waiversHonored: [],
    reason: undefined,
    brandLintRequired: isGated,
    brandPinRequired: isGated,
    classifierResult: null,
  };

  // --- Brand checks (gated profiles only) ------------------------------------
  if (isGated) {
    const brandPkg = scf?.brandPackage;
    if (!brandPkg || !BRAND_PIN_RE.test(brandPkg)) {
      result.passed = false;
      result.reason = `brandPackage must be version-pinned (e.g. name@1.0) for ${profile} profile`;
      // Still run classifier so audit trail captures full picture.
    }

    if (scf?.brandLintPassed !== true) {
      result.passed = false;
      result.reason = result.reason
        ? `${result.reason}; brandLintPassed must be true for ${profile} profile`
        : `brandLintPassed must be true for ${profile} profile`;
    }
  }

  // --- Demo-data classifier --------------------------------------------------
  let classifierOutput;
  try {
    classifierOutput = await spawnClassifier(scfPath);
    result.classifierResult = classifierOutput;
  } catch (err) {
    if (isGated) {
      // Classifier failure in a gated profile is a hard block — fail-secure.
      result.passed = false;
      result.reason = result.reason
        ? `${result.reason}; classifier subprocess failed: ${err.message}`
        : `classifier subprocess failed: ${err.message}`;
      return result;
    }
    // Non-gated: warn and continue.
    console.warn(`[Slate] Governance: classifier failed (non-blocking): ${err.message}`);
    return result;
  }

  const findings = classifierOutput?.findings || [];

  // Emit each finding to audit callback.
  for (const finding of findings) {
    if (typeof auditCallback === 'function') {
      auditCallback(finding);
    }
  }

  if (!isGated) {
    // Non-gated profiles: warn-only — always pass.
    return result;
  }

  // Gated profiles: high-severity findings without waivers block the render.
  for (const finding of findings) {
    if (finding.severity !== 'high') continue;
    if (finding.waiverPresent) {
      result.waiversHonored.push(finding);
    } else {
      result.blockingFindings.push(finding);
    }
  }

  if (result.blockingFindings.length > 0) {
    result.passed = false;
    const countMsg = `${result.blockingFindings.length} high-severity demo-data finding(s) without waivers`;
    result.reason = result.reason
      ? `${result.reason}; ${countMsg}`
      : countMsg;
  }

  return result;
}
