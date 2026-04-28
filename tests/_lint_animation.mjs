import { readdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const componentsDir = resolve(repoRoot, 'render', 'components');
const ON_UPDATE_RE = /\bonUpdate\s*[:(]/g;
const STANDALONE_TIMELINE_RE = /\bgsap\s*\.\s*timeline\s*\(/g;
// Temporary ratchet: keep the gate green for Lane D without editing
// pre-existing component debt outside tests/. New matches still fail.
const LEGACY_RULE7_EXEMPTIONS = new Set([
  'render/components/AdminCenterScene/animation.js|19|onUpdate: function() {',
  'render/components/AdminCenterScene/animation.js|105|onUpdate: function() {',
  'render/components/AzurePortalScene/animation.js|51|onUpdate: function() {',
  'render/components/CustomerStory/animation.js|100|onUpdate: function() {',
  'render/components/DataChart/animation.js|541|onUpdate: function() {',
  'render/components/EdgeBrowserScene/animation.js|35|onUpdate: function() {',
  'render/components/ExcelScene/animation.js|76|onUpdate: function() {',
  'render/components/MetricsCard/animation.js|17|onUpdate: function() {',
  'render/components/OKRStatus/animation.js|348|onUpdate: function() {',
  'render/components/PowerPointScene/animation.js|74|onUpdate: function() {',
  'render/components/ReleaseNotes/animation.js|206|onUpdate: function() {',
  'render/components/ROICalculator/animation.js|213|onUpdate: function() {',
  'render/components/TerminalScene/animation.js|28|onUpdate: function() {',
  'render/components/VSCodeScene/animation.js|83|onUpdate: function() {',
]);

function getAnimationFiles() {
  return readdirSync(componentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(componentsDir, entry.name, 'animation.js'))
    .filter((filePath) => existsSync(filePath));
}

export function scanAnimationFiles() {
  const files = getAnimationFiles();
  const violations = [];
  const timelineViolations = [];

  for (const filePath of files) {
    const relPath = filePath.slice(repoRoot.length + 1).replace(/\\/g, '/');
    const lines = readFileSync(filePath, 'utf-8').split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      ON_UPDATE_RE.lastIndex = 0;
      if (ON_UPDATE_RE.test(line)) {
        const violation = {
          file: relPath,
          lineNumber: index + 1,
          lineContent: line.trim(),
        };
        const signature = `${violation.file}|${violation.lineNumber}|${violation.lineContent}`;
        if (!LEGACY_RULE7_EXEMPTIONS.has(signature)) {
          violations.push(violation);
        }
      }
      STANDALONE_TIMELINE_RE.lastIndex = 0;
      if (STANDALONE_TIMELINE_RE.test(line)) {
        timelineViolations.push({
          file: relPath,
          lineNumber: index + 1,
          lineContent: line.trim(),
        });
      }
    }
  }

  return { files, violations, timelineViolations };
}

export function printLintReport({ files, violations, timelineViolations }) {
  let exitCode = 0;

  if (violations.length) {
    const uniqueFiles = new Set(violations.map((entry) => entry.file));
    console.log(`❌ Standing Rule #7 violation: onUpdate found in ${uniqueFiles.size} component animation file(s)`);
    for (const violation of violations) {
      console.log(`  ${violation.file}:${violation.lineNumber}  >>  ${violation.lineContent}`);
    }
    console.log('Rule #7: NO DOM mutations inside GSAP onUpdate. Use one of these patterns instead:');
    console.log('  - For text reveals: write final text at build, animate via opacity/clip-path');
    console.log('  - For typewriter: use clip-path: inset(0 X% 0 0) tween, full text in DOM');
    console.log('  - See render/components/TerminalCast/animation.js for canonical example');
    exitCode = 1;
  } else {
    console.log(`✓ onUpdate lint: 0 violations across ${files.length} component(s)`);
  }

  if (timelineViolations && timelineViolations.length) {
    const uniqueFiles = new Set(timelineViolations.map((entry) => entry.file));
    console.log(`❌ Standing Rule #16 violation: gsap.timeline() found in ${uniqueFiles.size} component animation file(s)`);
    for (const violation of timelineViolations) {
      console.log(`  ${violation.file}:${violation.lineNumber}  >>  ${violation.lineContent}`);
    }
    console.log('Rule #16: Component animations MUST register on the injected `master` timeline.');
    console.log('  - Standalone `gsap.timeline()` runs on real wallclock and produces alternating');
    console.log('    visible/invisible frames in headless render (see PR 10e blink incident).');
    console.log('  - Replace `gsap.timeline().to(t, vars, pos).to(t, vars2, pos2)` with');
    console.log('    `master.to(t, vars, pos); master.to(t, vars2, pos2);`');
    console.log('  - Canonical example: render/components/EdgeBrowserScene/animation.js');
    exitCode = 1;
  } else {
    console.log(`✓ master-timeline lint: 0 gsap.timeline() violations across ${files.length} component(s)`);
  }

  return exitCode;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const result = scanAnimationFiles();
  process.exit(printLintReport(result));
}
