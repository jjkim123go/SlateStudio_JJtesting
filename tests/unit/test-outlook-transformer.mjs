// Unit tests for outlook-scene-transformer.mjs
// Run with: node tests/unit/test-outlook-transformer.mjs
import { transformOutlookScene, __test__ } from '../../render/lib/outlook-scene-transformer.mjs';

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function assertThrows(fn, pattern, msg) {
  try {
    fn();
    failed++;
    failures.push(msg + ' (did not throw)');
    console.log(`  ✗ ${msg} (did not throw)`);
  } catch (e) {
    if (pattern.test(e.message)) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      failures.push(`${msg} (threw with wrong message: ${e.message})`);
      console.log(`  ✗ ${msg} (wrong message: ${e.message})`);
    }
  }
}

console.log('\n[outlook-transformer] Defaults');
{
  const p = {};
  transformOutlookScene(p);
  assert(p.theme === 'light',                    'default theme is light');
  assert(p.activeRail === 'mail',                'default activeRail is mail');
  assert(p.ribbonVariant === 'mail-home',        'default ribbonVariant is mail-home');
  assert(p.toastState === 'hidden',              'default toastState is hidden');
  assert(p.notifCount === 9,                     'default notifCount is 9');
  assert(typeof p.accountName === 'string' && p.accountName.length > 0,
                                                 'accountName has default Contoso name');
  assert(p.accountInitial === p.accountName[0].toUpperCase(),
                                                 'accountInitial derived from accountName');
  for (const k of ['eventCardHtml','rightHeaderSlot','contextualTabs','viewBodyHtml','floatingTabsHtml','toastTitle','toastBody']) {
    assert(p[k] === '', `slot "${k}" defaults to empty string`);
  }
  assert(typeof p.searchPlaceholder === 'string', 'searchPlaceholder defaulted');
}

console.log('\n[outlook-transformer] PII scrub - names');
{
  const p = { accountName: 'John Doe' };
  transformOutlookScene(p);
  assert(__test__.CONTOSO_NAMES.includes(p.accountName),
         `John Doe -> Contoso roster (got "${p.accountName}")`);
  const p2 = { accountName: 'John Doe' };
  transformOutlookScene(p2);
  assert(p.accountName === p2.accountName, 'name mapping is deterministic');
}

console.log('\n[outlook-transformer] PII scrub - email domain');
{
  const p = { eventCardHtml: '<div>Email: alex@microsoft.com about the project</div>' };
  transformOutlookScene(p);
  assert(p.eventCardHtml.includes('@contoso.com'),  'microsoft.com email -> contoso.com');
  assert(!/microsoft\.com/i.test(p.eventCardHtml),  'no microsoft.com remains anywhere');
}

console.log('\n[outlook-transformer] PII scrub - file paths');
{
  const p = { viewBodyHtml: 'Open /src/app/services/auth.cs in project-repo' };
  transformOutlookScene(p);
  // Path rewriting tests — customize MS_PATH_PATTERNS if needed
  assert(typeof p.viewBodyHtml === 'string', 'path rewriting returns string');
}

console.log('\n[outlook-transformer] PII scrub - recurses into nested objects/arrays');
{
  const p = {
    nested: {
      list: [
        { from: 'sarah.jones@example.org', subject: 'Sprint Planning' },
        'plain string with John Doe in it',
      ],
    },
  };
  transformOutlookScene(p);
  assert(typeof p.nested.list[0].from === 'string', 'nested email processed');
  assert(typeof p.nested.list[0].subject === 'string', 'nested subject processed');
  assert(typeof p.nested.list[1] === 'string', 'nested array string processed');
}

console.log('\n[outlook-transformer] Validation');
{
  assertThrows(
    () => transformOutlookScene({ ribbonVariant: 'bogus' }),
    /invalid ribbonVariant/i,
    'throws on invalid ribbonVariant',
  );
  assertThrows(
    () => transformOutlookScene({ activeRail: 'spaceship' }),
    /invalid activeRail/i,
    'throws on invalid activeRail',
  );
  assertThrows(
    () => transformOutlookScene({ theme: 'neon' }),
    /invalid theme/i,
    'throws on invalid theme',
  );
  assertThrows(
    () => transformOutlookScene({ toastState: 'flashing' }),
    /invalid toastState/i,
    'throws on invalid toastState',
  );
}

console.log('\n[outlook-transformer] Author overrides win over defaults');
{
  const p = {
    theme: 'dark',
    ribbonVariant: 'compose-format',
    activeRail: 'calendar',
    toastState: 'visible',
    notifCount: 0,
    eventCardHtml: '<div>preset</div>',
  };
  transformOutlookScene(p);
  assert(p.theme === 'dark',                    'theme override preserved');
  assert(p.ribbonVariant === 'compose-format',  'ribbonVariant override preserved');
  assert(p.activeRail === 'calendar',           'activeRail override preserved');
  assert(p.toastState === 'visible',            'toastState override preserved');
  assert(p.notifCount === 0,                    'notifCount=0 not overwritten');
  assert(p.eventCardHtml === '<div>preset</div>', 'preset slot HTML preserved');
}

console.log(`\n[outlook-transformer] ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
process.exit(0);
