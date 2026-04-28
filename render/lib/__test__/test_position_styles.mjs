// Unit test for positionStyles() in ../scf-to-html.mjs
// Verifies anchor → left/top/right/bottom + transform mapping.
// Run: node render/lib/__test__/test_position_styles.mjs
import { positionStyles } from '../scf-to-html.mjs';

let failures = 0;

function check(label, actual, expected) {
  // Compare as sets of `key:value` declarations so ordering doesn't matter.
  const norm = (s) => s.split(';').filter(Boolean).map(x => x.trim()).sort().join(';');
  const a = norm(actual);
  const e = norm(expected);
  if (a === e) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}`);
    console.log(`        expected: ${e}`);
    console.log(`        actual:   ${a}`);
  }
}

console.log('positionStyles anchor mapping:');

check('center',
  positionStyles({ anchor: 'center' }),
  'left:50%;top:50%;transform:translate(-50%,-50%)');

check('top-center',
  positionStyles({ anchor: 'top-center' }),
  'left:50%;top:0;transform:translateX(-50%)');

check('bottom-center uses bottom:0 (NOT top)',
  positionStyles({ anchor: 'bottom-center' }),
  'left:50%;bottom:0;transform:translateX(-50%)');

check('top-left',
  positionStyles({ anchor: 'top-left' }),
  'left:0;top:0');

check('top-right',
  positionStyles({ anchor: 'top-right' }),
  'right:0;top:0');

check('bottom-left',
  positionStyles({ anchor: 'bottom-left' }),
  'left:0;bottom:0');

check('bottom-right',
  positionStyles({ anchor: 'bottom-right' }),
  'right:0;bottom:0');

check('center-left',
  positionStyles({ anchor: 'center-left' }),
  'left:0;top:50%;transform:translateY(-50%)');

check('center-right',
  positionStyles({ anchor: 'center-right' }),
  'right:0;top:50%;transform:translateY(-50%)');

console.log('\npositionStyles explicit overrides + width/height:');

check('explicit x overrides anchor left',
  positionStyles({ anchor: 'center', x: 100 }),
  'left:100px;top:50%;transform:translate(-50%,-50%)');

check('explicit y overrides anchor top',
  positionStyles({ anchor: 'top-center', y: 200 }),
  'left:50%;top:200px;transform:translateX(-50%)');

check('explicit x and y override both, transform still applied',
  positionStyles({ anchor: 'center', x: '10%', y: '20%' }),
  'left:10%;top:20%;transform:translate(-50%,-50%)');

check('width and height passed through (number → px)',
  positionStyles({ anchor: 'center', width: 400, height: 200 }),
  'left:50%;top:50%;width:400px;height:200px;transform:translate(-50%,-50%)');

check('width and height as strings passed through',
  positionStyles({ anchor: 'top-left', width: '50%', height: 'auto' }),
  'left:0;top:0;width:50%;height:auto');

console.log('\npositionStyles backwards-compat (no anchor):');

check('no anchor, only x/y → just left/top (legacy behavior)',
  positionStyles({ x: 100, y: 50 }),
  'left:100px;top:50px');

check('no position at all → empty',
  positionStyles(undefined),
  '');

check('empty object → empty',
  positionStyles({}),
  '');

check('default anchor applied when none on layer',
  positionStyles({}, { anchor: 'top-center' }),
  'left:50%;top:0;transform:translateX(-50%)');

check('layer anchor wins over default',
  positionStyles({ anchor: 'bottom-center' }, { anchor: 'top-center' }),
  'left:50%;bottom:0;transform:translateX(-50%)');

console.log('');
if (failures === 0) {
  console.log('OK');
  process.exit(0);
} else {
  console.log(`FAILED: ${failures} assertion(s)`);
  process.exit(1);
}
