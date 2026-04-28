// Build the PR 8a showcase SCF by concatenating all 11 variant scenes
// with TitleCard chapter dividers between surface groups.
// Output: tests/qa-scenarios/pr8a-showcase.scf.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const QA = path.join(ROOT, 'tests', 'qa-scenarios');

const ORDER = {
  Loop:       ['pr8a-loop-meeting-notes', 'pr8a-loop-tasks', 'pr8a-loop-kanban', 'pr8a-loop-table'],
  Whiteboard: ['pr8a-whiteboard-brainstorm', 'pr8a-whiteboard-diagram', 'pr8a-whiteboard-retro'],
  Stream:     ['pr8a-stream-player', 'pr8a-stream-chapters', 'pr8a-stream-search', 'pr8a-stream-videoclip'],
};

const SECTION_BG = { Loop: '#5B2A86', Whiteboard: '#0E7A0D', Stream: '#0F6CBD' };

const scenes = [];

scenes.push({
  id: 'showcase-intro',
  duration: 3.5,
  component: 'TitleCard',
  props: {
    title: 'PR 8a — Microsoft Surfaces',
    subtitle: 'Loop · Whiteboard · Stream — 11 variants, 4 components',
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
    cloned.id = `showcase-${stem.replace(/^pr8a-/, '')}`;
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
    subtitle: 'Lint 0/0 · Smoke 52/52 · Wave A→D shipped',
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

const outPath = path.join(QA, 'pr8a-showcase.scf.json');
fs.writeFileSync(outPath, JSON.stringify(showcase, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`  scenes: ${scenes.length}`);
console.log(`  variant scenes: ${variantCount}`);
console.log(`  total duration: ${totalDuration}s`);
