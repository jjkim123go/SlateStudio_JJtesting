/**
 * Component smoke harness.
 *
 * Full gate:
 *   node tests/_smoke_components.mjs && node tests/_lint_animation.mjs
 *
 * This harness compiles each smoke SCF through scf-to-html.mjs and verifies:
 *   - the component compiles to complete HTML
 *   - no obvious compile-time regressions are present
 *   - every emitted <script type="application/json"> data island contains
 *     parseable JSON after Mustache templating
 *
 * IMPORTANT:
 *   Smoke SCFs MUST supply realistic data for every component prop that backs
 *   a <script type="application/json"> island, or the JSON.parse check will
 *   report false positives.
 *
 * Strategy: read scf-to-html.mjs source, patch the KNOWN_COMPONENTS Set
 * in-memory to include the new component names, write the patched module
 * to a sibling temp file, dynamically import it, and run compileSCFToHTML
 * against each smoke SCF. Patched file is deleted on completion.
 *
 * Usage: node tests/_smoke_components.mjs
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const compilerPath = resolve(repoRoot, 'render/lib/scf-to-html.mjs');
const patchedPath = resolve(repoRoot, 'render/lib/_scf-to-html.smoke-patched.mjs');
const outDir = resolve(repoRoot, 'output/_smoke');

const NEW_COMPONENTS = [
  'CalloutBox', 'WebcamOverlay', 'TransitionWipe',
  'ComplianceBadgeWall', 'DataFlow', 'AuditTrail', 'PolicyEnforcement',
  'SectionDivider', 'ScrollingBackground', 'AudienceSafe', 'Disclaimer',
  'CustomerStory', 'PricingTable', 'CompetitiveMatrix', 'ROICalculator',
  'Roadmap', 'BurnDown', 'OKRStatus', 'ReleaseNotes',
  'Quiz', 'TerminologyCard', 'ProgressBar',
  'TerminalCast', 'PresenterBug', 'EventBranding', 'AskTheAudience',
  'VSCodeScene',
  // PR 8a — Microsoft surface scenes
  'LoopScene', 'WhiteboardScene', 'StreamScene',
  // PR 8c — productivity surfaces
  'ListsScene',
  'PlannerScene',
  'OneDriveScene',
  'FormsScene',
  'BookingsScene',
];

const SMOKE_FILES = [
  ['CalloutBox',     'tests/qa-scenarios/smoke-calloutbox.scf.json'],
  ['WebcamOverlay',  'tests/qa-scenarios/smoke-webcamoverlay.scf.json'],
  ['TransitionWipe', 'tests/qa-scenarios/smoke-transitionwipe.scf.json'],
  ['ComplianceBadgeWall', 'tests/qa-scenarios/pr2-compliance-badge-wall.scf.json'],
  ['DataFlow',            'tests/qa-scenarios/pr2-data-flow.scf.json'],
  ['AuditTrail',          'tests/qa-scenarios/pr2-audit-trail.scf.json'],
  ['PolicyEnforcement',   'tests/qa-scenarios/pr2-policy-enforcement.scf.json'],
  ['PolicyEnforcement+AuditTrail', 'tests/qa-scenarios/pr2-policy-enforcement-with-audit.scf.json'],
  ['SectionDivider',      'tests/qa-scenarios/pr5-section-divider.scf.json'],
  ['ScrollingBackground', 'tests/qa-scenarios/pr5-scrolling-background.scf.json'],
  ['AudienceSafe-info',   'tests/qa-scenarios/pr5-audience-safe-info.scf.json'],
  ['AudienceSafe-warn',   'tests/qa-scenarios/pr5-audience-safe-warn.scf.json'],
  ['Disclaimer-footer',   'tests/qa-scenarios/pr5-disclaimer-footer.scf.json'],
  ['Disclaimer-modal',    'tests/qa-scenarios/pr5-disclaimer-modal.scf.json'],
  ['Disclaimer-sceneEnd', 'tests/qa-scenarios/pr5-disclaimer-scene-end.scf.json'],
  ['CustomerStory',       'tests/qa-scenarios/pr3-customer-story.scf.json'],
  ['PricingTable',        'tests/qa-scenarios/pr3-pricing-table.scf.json'],
  ['CompetitiveMatrix',   'tests/qa-scenarios/pr3-competitive-matrix.scf.json'],
  ['ROICalculator',       'tests/qa-scenarios/pr3-roi-calculator.scf.json'],
  ['Roadmap',             'tests/qa-scenarios/pr4-roadmap.scf.json'],
  ['BurnDown',            'tests/qa-scenarios/pr4-burndown.scf.json'],
  ['OKRStatus',           'tests/qa-scenarios/pr4-okrstatus.scf.json'],
  ['ReleaseNotes',        'tests/qa-scenarios/pr4-releasenotes.scf.json'],
  ['Quiz',                'tests/qa-scenarios/pr6-quiz.scf.json'],
  ['TerminologyCard',     'tests/qa-scenarios/pr6-terminology-card.scf.json'],
  ['ProgressBar',         'tests/qa-scenarios/pr6-progress-bar.scf.json'],
  ['TerminalCast',        'tests/qa-scenarios/pr6-terminal-cast.scf.json'],
  ['PresenterBug',        'tests/qa-scenarios/pr6-presenter-bug.scf.json'],
  ['EventBranding',       'tests/qa-scenarios/pr6-event-branding.scf.json'],
  ['AskTheAudience',      'tests/qa-scenarios/pr6-ask-the-audience.scf.json'],
  // PR 9 Lane B — Lottie variant smokes
  ['EventBranding+Lottie',       'tests/qa-scenarios/pr9-lottie-event-branding.scf.json'],
  ['ScrollingBackground+Lottie', 'tests/qa-scenarios/pr9-lottie-scrolling-background.scf.json'],
  ['ComplianceBadgeWall+Lottie', 'tests/qa-scenarios/pr9-lottie-compliance-badge-wall.scf.json'],
  // PR 10d — VSCodeScene Wave-A chrome fidelity probes
  ['VSCodeScene-chat-left',          'tests/qa-scenarios/pr10d-vscode-chat-left.scf.json'],
  ['VSCodeScene-extensions-right',   'tests/qa-scenarios/pr10d-vscode-extensions-right.scf.json'],
  ['VSCodeScene-explorer-default',   'tests/qa-scenarios/pr10d-vscode-explorer-default.scf.json'],
  ['VSCodeScene-scm-staged',         'tests/qa-scenarios/pr10d-vscode-scm-staged.scf.json'],
  // PR 10e Wave A+B — utility-surface chrome probes (Windows / Terminal / GitHub)
  ['WindowsScene-file-explorer',     'tests/qa-scenarios/pr10e-windows-file-explorer.scf.json'],
  ['TerminalScene-split',            'tests/qa-scenarios/pr10e-terminal-split.scf.json'],
  ['GitHubScene-repo-home',          'tests/qa-scenarios/pr10e-github-repo-home.scf.json'],
  ['GitHubScene-pr-diff',            'tests/qa-scenarios/pr10e-github-pr-diff.scf.json'],
  // PR 8a Wave A — Loop / Whiteboard / Stream canonical smokes
  ['LoopScene-meeting-notes',        'tests/qa-scenarios/pr8a-loop-meeting-notes.scf.json'],
  ['WhiteboardScene-brainstorm',     'tests/qa-scenarios/pr8a-whiteboard-brainstorm.scf.json'],
  ['StreamScene-player',             'tests/qa-scenarios/pr8a-stream-player.scf.json'],
  // PR 8a Wave B — variants
  ['LoopScene-tasks',                'tests/qa-scenarios/pr8a-loop-tasks.scf.json'],
  ['LoopScene-kanban',               'tests/qa-scenarios/pr8a-loop-kanban.scf.json'],
  ['LoopScene-table',                'tests/qa-scenarios/pr8a-loop-table.scf.json'],
  ['WhiteboardScene-diagram',        'tests/qa-scenarios/pr8a-whiteboard-diagram.scf.json'],
  ['WhiteboardScene-retro',          'tests/qa-scenarios/pr8a-whiteboard-retro.scf.json'],
  ['StreamScene-chapters',           'tests/qa-scenarios/pr8a-stream-chapters.scf.json'],
  ['StreamScene-search',             'tests/qa-scenarios/pr8a-stream-search.scf.json'],
  ['StreamScene-videoclip',          'tests/qa-scenarios/pr8a-stream-videoclip.scf.json'],
  // PR 8c Wave A — productivity surfaces (Lists base shell)
  ['ListsScene-default',             'tests/qa-scenarios/pr8c-lists-default.scf.json'],
  ['ListsScene-row-selected',        'tests/qa-scenarios/pr8c-lists-row-selected.scf.json'],
  ['ListsScene-menu-open',           'tests/qa-scenarios/pr8c-lists-menu-open.scf.json'],
  ['PlannerScene-board',             'tests/qa-scenarios/pr8c-planner-board.scf.json'],
  ['PlannerScene-task-open',         'tests/qa-scenarios/pr8c-planner-task-open.scf.json'],
  ['PlannerScene-charts',            'tests/qa-scenarios/pr8c-planner-charts.scf.json'],
  ['OneDriveScene-myfiles',          'tests/qa-scenarios/pr8c-onedrive-myfiles.scf.json'],
  ['OneDriveScene-context-menu',     'tests/qa-scenarios/pr8c-onedrive-context-menu.scf.json'],
  ['OneDriveScene-share-dialog',     'tests/qa-scenarios/pr8c-onedrive-share-dialog.scf.json'],
  ['FormsScene-home',                'tests/qa-scenarios/pr8c-forms-home.scf.json'],
  ['FormsScene-gallery',             'tests/qa-scenarios/pr8c-forms-gallery.scf.json'],
  ['FormsScene-builder',             'tests/qa-scenarios/pr8c-forms-builder.scf.json'],
  ['FormsScene-preview',             'tests/qa-scenarios/pr8c-forms-preview.scf.json'],
  ['BookingsScene-home',             'tests/qa-scenarios/pr8c-bookings-home.scf.json'],
  ['BookingsScene-public-page',      'tests/qa-scenarios/pr8c-bookings-public-page.scf.json'],
  ['BookingsScene-create-modal',     'tests/qa-scenarios/pr8c-bookings-create-modal.scf.json'],
];

function patchCompiler() {
  const src = readFileSync(compilerPath, 'utf-8');
  const additions = NEW_COMPONENTS.map((name) => `  '${name}',`).join('\n');
  const marker = "'AdminCenterScene',";
  if (!src.includes(marker)) {
    throw new Error(`Patch marker not found in ${compilerPath}`);
  }
  const patched = src.replace(marker, `${marker}\n${additions}`);
  writeFileSync(patchedPath, patched, 'utf-8');
}

function cleanup() {
  if (existsSync(patchedPath)) unlinkSync(patchedPath);
}

function previewContent(value, max = 100) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function extractIslandId(attrs) {
  const idMatch = attrs.match(/\bid=(['"])(.*?)\1/i);
  if (idMatch) return idMatch[2];
  const dataAttrMatch = attrs.match(/\b(data-[\w-]+)(?:=(['"])(.*?)\2)?/i);
  if (dataAttrMatch) return dataAttrMatch[3] || dataAttrMatch[1];
  return '(no-id)';
}

function collectJsonIslands(html) {
  const islands = [];
  let cursor = 0;
  while (cursor < html.length) {
    const openIndex = html.indexOf('<script', cursor);
    if (openIndex === -1) break;
    const tagEnd = html.indexOf('>', openIndex);
    if (tagEnd === -1) break;

    const openTag = html.slice(openIndex, tagEnd + 1);
    const closeIndex = html.indexOf('</script>', tagEnd + 1);
    if (closeIndex === -1) break;

    const typeMatch = openTag.match(/\btype=(['"])(.*?)\1/i);
    if (typeMatch && typeMatch[2].toLowerCase() === 'application/json') {
      islands.push({
        attrs: openTag,
        content: html.slice(tagEnd + 1, closeIndex),
      });
    }

    cursor = closeIndex + '</script>'.length;
  }
  return islands;
}

export function parseJsonIslands(html, sceneId) {
  const islands = collectJsonIslands(html);
  for (const island of islands) {
    const islandId = extractIslandId(island.attrs);
    const content = island.content ?? '';
    try {
      JSON.parse(content);
    } catch (error) {
      throw new Error(
        `JSON_ISLAND_PARSE_FAIL: scene=${sceneId}, island_id=${islandId}, error=${error.message}, content_preview=${previewContent(content)}`
      );
    }
  }
  return islands.length;
}

export async function runSmoke() {
  let failed = 0;
  let totalJsonIslands = 0;
  const results = [];

  try {
    patchCompiler();
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const mod = await import(pathToFileURL(patchedPath).href + `?t=${Date.now()}`);
    const compileSCFToHTML = mod.compileSCFToHTML;
    if (typeof compileSCFToHTML !== 'function') {
      throw new Error('compileSCFToHTML not exported from patched compiler');
    }

    for (const [name, relPath] of SMOKE_FILES) {
      const scfPath = resolve(repoRoot, relPath);
      let status = 'ok';
      let detail = '';
      let html = '';
      let islandCount = 0;
      try {
        const scf = JSON.parse(readFileSync(scfPath, 'utf-8'));
        const result = compileSCFToHTML(scf, { scfPath, scfDir: dirname(scfPath) });
        html = (result && typeof result === 'object' && typeof result.html === 'string') ? result.html : String(result);
        const checks = [
          ['contains <html', html.includes('<html')],
          ['contains scene wrapper', html.includes(`scene-${scf.scenes[0].id}`)],
          ['contains GSAP master timeline', html.includes('master')],
          ['contains animation.js content', html.length > 4000],
        ];
        const failedChecks = checks.filter(([, ok]) => !ok).map(([label]) => label);
        if (failedChecks.length) {
          status = 'fail';
          detail = `compiled but missing: ${failedChecks.join(', ')}`;
          failed += 1;
        } else {
          islandCount = parseJsonIslands(html, scf.scenes[0].id);
          totalJsonIslands += islandCount;
        }
        writeFileSync(resolve(outDir, `${name}.html`), html, 'utf-8');
      } catch (error) {
        status = 'fail';
        detail = error.message;
        failed += 1;
      }
      results.push({ name, status, detail, htmlSize: html.length, islandCount });
    }
  } finally {
    cleanup();
  }

  return {
    failed,
    totalJsonIslands,
    componentCount: SMOKE_FILES.length,
    results,
    outDir,
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const { failed, totalJsonIslands, componentCount, results, outDir: writtenOutDir } = await runSmoke();

  console.log('\nSmoke results:');
  for (const result of results) {
    const tag = result.status === 'ok' ? 'PASS' : 'FAIL';
    const islandInfo = result.status === 'ok' ? ` | json_islands=${result.islandCount}` : '';
    console.log(`  [${tag}] ${result.name.padEnd(24)} ${result.htmlSize ? `(${result.htmlSize}B)` : ''}${islandInfo} ${result.detail}`);
  }
  console.log(`\nSmoke summary: ${componentCount - failed}/${componentCount} passed | json_islands=${totalJsonIslands}`);
  console.log(`Output written to: ${writtenOutDir}`);
  process.exit(failed ? 1 : 0);
}
