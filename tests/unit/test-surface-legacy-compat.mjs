import { transformGitHubScene } from '../../render/lib/github-scene-transformer.mjs';
import { transformOutlookScene } from '../../render/lib/outlook-scene-transformer.mjs';
import { transformTeamsScene } from '../../render/lib/teams-scene-transformer.mjs';
import { transformVSCodeScene } from '../../render/lib/vscode-scene-transformer.mjs';

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ok ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.log(`  not ok ${msg}`);
  }
}

console.log('\n[surface-legacy-compat] Outlook legacy contract');
{
  const props = {
    accountName: 'maya@contoso.com',
    currentFolder: 'Inbox',
    stepsHtml: '<div class="tm-step" data-kind="calendar_invite" data-duration="1.0">invite</div><div class="tm-step" data-kind="send" data-duration="0.5">send</div>',
  };
  transformOutlookScene(props);
  assert(props.viewBodyHtml.includes('class="ol-folders"'), 'Outlook legacy body renders folder column');
  assert(props.viewBodyHtml.includes('class="ol-msglist"'), 'Outlook legacy body renders message list');
  assert(props.viewBodyHtml.includes('calendar_invite'), 'Outlook legacy body preserves authored steps');
  assert(props.toastTitle === 'Message sent', 'Outlook send step seeds toast title');
}

console.log('\n[surface-legacy-compat] VSCode legacy contract');
{
  const props = {
    filename: 'compose.ts',
    statusbarText: 'Ln 8, Col 24   UTF-8   LF   TypeScript',
    stepsHtml: '<div class="vs-step" data-kind="type" data-duration="1.0"><pre class="vs-type-text" data-text="const offset = 1;"></pre></div>',
  };
  transformVSCodeScene(props);
  assert(props.titlebarText.includes('compose.ts'), 'VSCode titlebar seeded from filename');
  assert(props.tabListHtml.includes('compose.ts'), 'VSCode tab strip seeded from filename');
  assert(props.codeContentHtml.includes('class="vs-step"'), 'VSCode legacy steps injected into code content');
  assert(props.statusbarRightHtml.includes('UTF-8'), 'VSCode status bar seeded from legacy statusbarText');
}

console.log('\n[surface-legacy-compat] GitHub legacy contract');
{
  const props = {
    repoOwner: 'contoso',
    repoName: 'slate',
    prNumber: 128,
    prTitle: 'Fix audio sync drift',
    branch: 'fix/audio-sync',
    stepsHtml: '<div class="gh-step" data-kind="review" data-duration="0.8">approved</div>',
  };
  transformGitHubScene(props);
  assert(props.variant === 'pr-diff', 'GitHub legacy contract defaults to pr-diff');
  assert(props.repoTabsHtml.includes('Pull requests'), 'GitHub tabs seeded for legacy PR scene');
  assert(props.bodyHtml.includes('Fix audio sync drift'), 'GitHub body seeded from legacy PR title');
  assert(props.bodyHtml.includes('class="gh-step"'), 'GitHub body preserves authored legacy steps');
}

console.log('\n[surface-legacy-compat] Teams chat_message alias');
{
  const props = {
    steps: [
      { kind: 'chat_message', author: 'Alex Chen', text: 'hello', time: '9:00 AM' },
    ],
  };
  transformTeamsScene(props);
  assert(props.contentHtml.includes('data-kind="message"'), 'Teams chat_message alias normalizes to message');
}

console.log(`\n[surface-legacy-compat] ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const failure of failures) console.log('  - ' + failure);
  process.exit(1);
}
process.exit(0);