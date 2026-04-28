// Lane A PR-9 lottie compile harness — verifies:
//  (1) good SCF compiles, embeds vendor + driver + data island + raw JSON
//  (2) bad SCF (Lottie with non-empty assets[]) throws a clear error
//
// Run:  node tests/_lottie_compile_check.mjs

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const compilerUrl = pathToFileURL(resolve(repoRoot, 'render/lib/scf-to-html.mjs')).href;
const { compileSCFToHTML } = await import(compilerUrl);

let failures = 0;

function check(label, ok, detail) {
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// --- (1) Happy path ---------------------------------------------------------
const goodPath = resolve(repoRoot, 'tests/qa-scenarios/pr9-lottie-smoke.scf.json');
const good = JSON.parse(readFileSync(goodPath, 'utf-8'));
const out = compileSCFToHTML(good, { scfDir: dirname(goodPath) });
const html = out.html;

check('compiled HTML returned', typeof html === 'string' && html.length > 1000);
check('vendor script inlined (lottie marker present)',
  html.includes('lottie-web 5.12.2 svg renderer'));
check('vendor script inlined exactly once',
  (html.match(/lottie-web 5\.12\.2 svg renderer/g) || []).length === 1);
check('vendor script body inlined (not external src)',
  !html.includes('<script src="render/vendor/lottie-web') &&
  html.includes('lottie-web 5.12.2 svg renderer'));
check('data island id present', html.includes('id="lottie-data-checkmark-1"'));
check('container div present',
  html.includes('class="layer layer-lottie lottie-container lottie-checkmark-1"'));
check('container has data-* attrs',
  html.includes('data-lottie-speed="1.5"') &&
  html.includes('data-lottie-loop="1"') &&
  html.includes('data-lottie-scene-start="0"'));
check('triple-Mustache rendered raw (no &quot; in JSON content)',
  !/<script type="application\/json"[^>]*lottie-data[^>]*>[^<]*&quot;/.test(html));
check('raw JSON parseable from data island', (() => {
  const m = html.match(/<script type="application\/json" id="lottie-data-checkmark-1">([^<]*)<\/script>/);
  if (!m) return false;
  try { const j = JSON.parse(m[1]); return j.fr === 30 && Array.isArray(j.assets) && j.assets.length === 0; }
  catch { return false; }
})());
check('driver bootstrap emitted (Slate Lottie driver banner)',
  html.includes('=== Slate Lottie driver (PR 9'));
check('driver bootstrap exactly once',
  (html.match(/=== Slate Lottie driver \(PR 9/g) || []).length === 1);
check('driver hooks gsap.ticker', html.includes('gsap.ticker.add(tick)'));
check('image layer still works alongside lottie',
  html.includes('class="layer layer-image"'));

// --- (2) Bad path: Lottie with external assets MUST throw -------------------
const badPath = resolve(repoRoot, 'tests/qa-scenarios/pr9-lottie-bad-assets.scf.json');
const bad = JSON.parse(readFileSync(badPath, 'utf-8'));
let threw = null;
try {
  compileSCFToHTML(bad, { scfDir: dirname(badPath) });
} catch (e) {
  threw = e;
}
check('bad-assets SCF threw at compile time', threw !== null,
  threw ? `got: ${threw.message.slice(0, 120)}` : 'no throw');
check('error message identifies the violating layer',
  threw && /scene "bad-lottie-scene"/.test(threw.message) && /assets/i.test(threw.message),
  threw ? threw.message.slice(0, 160) : '');

// --- (3) No-Lottie SCF must NOT inject vendor/driver -----------------------
const cleanScf = {
  version: '1.0', pipeline: 'no-lottie', metadata: { title: 'no-lottie' },
  outputProfile: { width: 1920, height: 1080, fps: 30 },
  scenes: [{ id: 's1', duration: 2, layers: [{ type: 'shape', fill: '#222' }] }]
};
const cleanOut = compileSCFToHTML(cleanScf, { scfDir: repoRoot }).html;
check('non-lottie SCF: vendor tag absent',
  !cleanOut.includes('lottie-web 5.12.2 svg renderer'));
check('non-lottie SCF: driver bootstrap absent',
  !cleanOut.includes('Slate Lottie driver'));

console.log(`\nLottie compile check: ${failures === 0 ? 'OK' : failures + ' FAILURE(S)'}`);
process.exit(failures ? 1 : 0);
