// Build the PR 8c showcase SCF by concatenating all 16 productivity-surface
// scenes with TitleCard chapter dividers between surface groups.
// Output: tests/qa-scenarios/pr8c-showcase.scf.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const QA = path.join(ROOT, 'tests', 'qa-scenarios');

const ORDER = {
  Lists:     ['pr8c-lists-default', 'pr8c-lists-row-selected', 'pr8c-lists-menu-open'],
  Planner:   ['pr8c-planner-board', 'pr8c-planner-task-open', 'pr8c-planner-charts'],
  OneDrive:  ['pr8c-onedrive-myfiles', 'pr8c-onedrive-context-menu', 'pr8c-onedrive-share-dialog'],
  Forms:     ['pr8c-forms-home', 'pr8c-forms-gallery', 'pr8c-forms-builder', 'pr8c-forms-preview'],
  Bookings:  ['pr8c-bookings-home', 'pr8c-bookings-public-page', 'pr8c-bookings-create-modal'],
};

// M365 surface brand accents
const SECTION_BG = {
  Lists:    '#038387',
  Planner:  '#31752F',
  OneDrive: '#0364B8',
  Forms:    '#2C5234',
  Bookings: '#1F6068',
};

const scenes = [];

scenes.push({
  id: 'showcase-intro',
  duration: 3.5,
  component: 'TitleCard',
  props: {
    title: 'PR 8c — Productivity Surfaces',
    subtitle: 'Lists · Planner · OneDrive · Forms · Bookings — 16 variants, 5 components',
    background: '#0F172A',
  },
});

let totalDuration = 3.5;
let variantCount = 0;

for (const [surface, files] of Object.entries(ORDER)) {
  scenes.push({
    id: `chapter-${surface.toLowerCase()}`,
    duration: 2.5,
    component: 'TitleCard',
    props: {
      title: surface,
      subtitle: `${files.length} variant${files.length === 1 ? '' : 's'}`,
      background: SECTION_BG[surface],
    },
  });
  totalDuration += 2.5;

  for (const stem of files) {
    const src = JSON.parse(fs.readFileSync(path.join(QA, `${stem}.scf.json`), 'utf8'));
    const original = src.scenes[0];
    const cloned = JSON.parse(JSON.stringify(original));
    cloned.id = `showcase-${stem.replace(/^pr8c-/, '')}`;
    scenes.push(cloned);
    totalDuration += cloned.duration;
    variantCount += 1;
  }
}

scenes.push({
  id: 'showcase-outro',
  duration: 4,
  component: 'TitleCard',
  props: {
    title: `${variantCount} variants · all green`,
    subtitle: 'Lint 0/63 · Smoke 68/68 · Wave A→D shipped',
    background: '#0F172A',
  },
});
totalDuration += 4;

const showcase = {
  $schema: '../../schemas/scf-v1.0.schema.json',
  version: '1.0',
  pipeline: 'animated-explainer',
  outputProfile: { width: 1920, height: 1080, fps: 30 },
  scenes,
};

const outPath = path.join(QA, 'pr8c-showcase.scf.json');
fs.writeFileSync(outPath, JSON.stringify(showcase, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`  scenes: ${scenes.length}`);
console.log(`  variant scenes: ${variantCount}`);
console.log(`  total duration: ${totalDuration}s`);
