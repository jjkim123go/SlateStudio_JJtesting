#!/usr/bin/env node
/**
 * Build the 4 PR 10e Wave A+B utility-surface probe SCF files:
 *   1. pr10e-windows-file-explorer.scf.json (WindowsScene, Win11 light)
 *   2. pr10e-terminal-split.scf.json        (TerminalScene, dark split-pane)
 *   3. pr10e-github-repo-home.scf.json      (GitHubScene, variant=repo-home)
 *   4. pr10e-github-pr-diff.scf.json        (GitHubScene, variant=pr-diff)
 *
 * Run from repo root: node scripts\build-pr10e-utility-probes.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'tests', 'qa-scenarios');
mkdirSync(OUT_DIR, { recursive: true });

// ────────────────────────────────────────────────────────────────────────────
// Common helpers — bake explicit width/height on every <svg> (PR 10d v2 lesson)
// ────────────────────────────────────────────────────────────────────────────
const feSvg = (id, size = 16) => `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#fe-icon-${id}"/></svg>`;
const wtSvg = (id, size = 16) => `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#wt-icon-${id}"/></svg>`;
const ghSvg = (id, size = 16) => `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#gh-icon-${id}"/></svg>`;

// ════════════════════════════════════════════════════════════════════════════
// 1. WindowsScene — File Explorer "Pictures > Vacation 2026"
// Class names used here MUST match the live CSS in WindowsScene/index.html:
//   .fe-tab / .fe-tab--active / .fe-tab-close
//   .fe-cmd / .fe-cmd--primary / .fe-cmd--icon / .fe-cmd-chev / .fe-cmd-divider
//   .fe-navbtn / .fe-bc-icon / .fe-bc-item / .fe-bc-sep
//   .fe-rail-section / .fe-rail-row / .fe-rail-row--active / .fe-rail-chev / .fe-rail-icon / .fe-rail-label
//   .fe-grid / .fe-tile / .fe-tile-thumb / .fe-tile-label
// ════════════════════════════════════════════════════════════════════════════
{
  // Title-bar tabs
  const titlebarTabsHtml = `
    <div class="fe-tab fe-tab--active">
      ${feSvg('folder', 14)}
      <span>Vacation 2026</span>
      <button class="fe-tab-close" aria-label="Close">×</button>
    </div>
    <div class="fe-tab">
      ${feSvg('folder', 14)}
      <span>Documents</span>
    </div>
  `.trim();

  // Command bar
  const commandBarHtml = `
    <button class="fe-cmd fe-cmd--primary">${feSvg('plus')}<span>New</span><span class="fe-cmd-chev">${feSvg('chevron-down', 10)}</span></button>
    <div class="fe-cmd-divider"></div>
    <button class="fe-cmd fe-cmd--icon" aria-label="Cut">${feSvg('cut')}</button>
    <button class="fe-cmd fe-cmd--icon" aria-label="Copy">${feSvg('copy')}</button>
    <button class="fe-cmd fe-cmd--icon" aria-label="Rename">${feSvg('rename')}</button>
    <button class="fe-cmd fe-cmd--icon" aria-label="Share">${feSvg('share')}</button>
    <button class="fe-cmd fe-cmd--icon" aria-label="Delete">${feSvg('delete')}</button>
    <div class="fe-cmd-divider"></div>
    <button class="fe-cmd">${feSvg('sort')}<span>Sort</span></button>
    <button class="fe-cmd">${feSvg('view-tile')}<span>View</span></button>
    <button class="fe-cmd">${feSvg('more')}<span>More</span></button>
  `.trim();

  // Breadcrumb
  const breadcrumbHtml = `
    <span class="fe-bc-icon">${feSvg('thispc')}</span>
    <span class="fe-bc-item">This PC</span>
    <span class="fe-bc-sep">${feSvg('chevron-right', 10)}</span>
    <span class="fe-bc-item">Pictures</span>
    <span class="fe-bc-sep">${feSvg('chevron-right', 10)}</span>
    <span class="fe-bc-item">Vacation 2026</span>
  `.trim();

  // Navigation rail
  const railRow = ({ icon, label, depth = 0, active = false, expanded = false }) => {
    const cls = ['fe-rail-row'];
    if (active) cls.push('fe-rail-row--active');
    const pad = 8 + depth * 14;
    const chev = expanded
      ? `<span class="fe-rail-chev">${feSvg('chevron-down', 10)}</span>`
      : (depth === 0
          ? `<span class="fe-rail-chev">${feSvg('chevron-right', 10)}</span>`
          : `<span class="fe-rail-chev"></span>`);
    return `<div class="${cls.join(' ')}" style="padding-left:${pad}px">${chev}<span class="fe-rail-icon">${feSvg(icon)}</span><span class="fe-rail-label">${label}</span></div>`;
  };

  const navTreeHtml = [
    `<div class="fe-rail-section">Home</div>`,
    railRow({ icon: 'home',     label: 'Home' }),
    railRow({ icon: 'gallery',  label: 'Gallery' }),
    railRow({ icon: 'onedrive', label: 'OneDrive' }),
    `<div class="fe-rail-section">This PC</div>`,
    railRow({ icon: 'folder',   label: 'Desktop' }),
    railRow({ icon: 'document', label: 'Documents' }),
    railRow({ icon: 'folder',   label: 'Downloads' }),
    railRow({ icon: 'music',    label: 'Music' }),
    railRow({ icon: 'image',    label: 'Pictures', expanded: true }),
    railRow({ icon: 'folder',   label: 'Family',         depth: 1 }),
    railRow({ icon: 'folder',   label: 'Vacation 2026',  depth: 1, active: true }),
    railRow({ icon: 'folder',   label: 'Wallpapers',     depth: 1 }),
    railRow({ icon: 'video',    label: 'Videos' }),
    `<div class="fe-rail-section">Network</div>`,
    railRow({ icon: 'network',  label: 'Network' })
  ].join('');

  // 8 photo tiles laid out in a grid (uses .fe-grid + .fe-tile + .fe-tile-thumb + .fe-tile-label)
  // First tile gets fe-tile--selected to match "1 item selected" status text (PR 10e polish)
  const tile = ({ name, hue, label, selected = false }) => `
    <div class="fe-tile${selected ? ' fe-tile--selected' : ''}">
      <div class="fe-tile-thumb" style="background:linear-gradient(135deg, hsl(${hue},65%,60%), hsl(${(hue+40)%360},70%,45%));display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.85);font-size:13px;font-weight:600">
        <span>${label}</span>
      </div>
      <div class="fe-tile-label">${name}</div>
    </div>`.trim();

  const contentHtml = `
    <div class="fe-grid">
      ${tile({ name: 'IMG_4821.jpg', hue: 200, label: 'Beach', selected: true })}
      ${tile({ name: 'IMG_4822.jpg', hue: 220, label: 'Sunset' })}
      ${tile({ name: 'IMG_4823.jpg', hue: 30,  label: 'Sand' })}
      ${tile({ name: 'IMG_4824.jpg', hue: 110, label: 'Trail' })}
      ${tile({ name: 'IMG_4825.jpg', hue: 280, label: 'Dusk' })}
      ${tile({ name: 'IMG_4826.jpg', hue: 10,  label: 'Coral' })}
      ${tile({ name: 'IMG_4827.jpg', hue: 180, label: 'Reef' })}
      ${tile({ name: 'IMG_4828.jpg', hue: 50,  label: 'Dune' })}
    </div>
  `.trim();

  const probe = {
    version: '1.0',
    pipeline: 'animated-explainer',
    outputProfile: { width: 1920, height: 1080, fps: 30 },
    scenes: [{
      id: 'win-explorer',
      duration: 4,
      component: 'WindowsScene',
      props: {
        theme: 'light',
        titlebarTabsHtml,
        commandBarHtml,
        breadcrumbHtml,
        searchPlaceholder: 'Search Vacation 2026',
        navTreeHtml,
        contentHtml,
        statusLeftHtml: '8 items',
        statusRightHtml: '<span>1 item selected · 4.21 MB</span>'
      }
    }]
  };
  writeFileSync(join(OUT_DIR, 'pr10e-windows-file-explorer.scf.json'), JSON.stringify(probe, null, 2));
}

// ════════════════════════════════════════════════════════════════════════════
// 2. TerminalScene — Windows Terminal split-pane
// Class names used MUST match TerminalScene/index.html:
//   .wt-tab / .wt-tab--active / .wt-tab-close
//   .wt-line / .wt-cmd / .wt-cursor / .wt-mute / .wt-ok / .wt-bad / .wt-warn / .wt-info / .wt-flag
//   .wt-prompt-pwsh / .wt-prompt-ubuntu / .wt-path
// Symbol IDs: pwsh, linux, cmd, terminal, plus, chevron-down, settings, close-x, win-min/max/close
// ════════════════════════════════════════════════════════════════════════════
{
  const tabsHtml = `
    <div class="wt-tab wt-tab--active">
      ${wtSvg('pwsh', 14)}
      <span>PowerShell</span>
      <button class="wt-tab-close" aria-label="Close">${wtSvg('close-x', 10)}</button>
    </div>
    <div class="wt-tab">
      ${wtSvg('linux', 14)}
      <span>Ubuntu</span>
    </div>
    <div class="wt-tab">
      ${wtSvg('cmd', 14)}
      <span>cmd</span>
    </div>
  `.trim();

  // PowerShell pane content
  const psLine = (parts) => `<div class="wt-line">${parts}</div>`;
  const psPrompt = (path) =>
    `<span class="wt-prompt-pwsh">PS</span> <span class="wt-path">${path}</span><span class="wt-prompt-pwsh">&gt;</span> `;

  const leftPaneContentHtml = [
    psLine(`${psPrompt('C:\\repos\\slate')}<span class="wt-cmd">git status</span>`),
    psLine(`<span class="wt-mute">On branch <span class="wt-flag">feature/pr10e</span></span>`),
    psLine(`<span class="wt-mute">Your branch is ahead of 'origin/main' by 4 commits.</span>`),
    psLine(`&nbsp;`),
    psLine(`<span class="wt-mute">Changes to be committed:</span>`),
    psLine(`&nbsp;&nbsp;<span class="wt-ok">new file:&nbsp;&nbsp; render/components/WindowsScene/index.html</span>`),
    psLine(`&nbsp;&nbsp;<span class="wt-ok">new file:&nbsp;&nbsp; render/components/TerminalScene/index.html</span>`),
    psLine(`&nbsp;&nbsp;<span class="wt-ok">new file:&nbsp;&nbsp; render/components/GitHubScene/index.html</span>`),
    psLine(`&nbsp;&nbsp;<span class="wt-warn">modified:&nbsp;&nbsp; tests/_smoke_components.mjs</span>`),
    psLine(`&nbsp;`),
    psLine(`${psPrompt('C:\\repos\\slate')}<span class="wt-cmd">node tests/_smoke_components.mjs</span>`),
    psLine(`<span class="wt-mute">Running 45 component smokes...</span>`),
    psLine(`<span class="wt-ok">  PASS</span> <span class="wt-mute">pr10d-vscode-chat-left</span>`),
    psLine(`<span class="wt-ok">  PASS</span> <span class="wt-mute">pr10e-windows-file-explorer</span>`),
    psLine(`<span class="wt-ok">  PASS</span> <span class="wt-mute">pr10e-terminal-split</span>`),
    psLine(`<span class="wt-ok">  PASS</span> <span class="wt-mute">pr10e-github-repo-home</span>`),
    psLine(`<span class="wt-ok">  PASS</span> <span class="wt-mute">pr10e-github-pr-diff</span>`),
    psLine(`&nbsp;`),
    psLine(`${psPrompt('C:\\repos\\slate')}<span class="wt-cursor">▋</span>`)
  ].join('');

  // Ubuntu pane content
  const uPrompt = (host, path) =>
    `<span class="wt-prompt-ubuntu">user@${host}</span>:<span class="wt-path">${path}</span><span class="wt-prompt-ubuntu">$</span> `;

  const rightPaneContentHtml = [
    `<div class="wt-line">${uPrompt('slate-dev', '~/projects/slate')}<span class="wt-cmd">ls -la render/components/</span></div>`,
    `<div class="wt-line"><span class="wt-mute">total 56</span></div>`,
    `<div class="wt-line"><span class="wt-mute">drwxr-xr-x  9 user user 4096 Apr  6 14:22 .</span></div>`,
    `<div class="wt-line"><span class="wt-mute">drwxr-xr-x  4 user user 4096 Apr  6 13:10 ..</span></div>`,
    `<div class="wt-line"><span class="wt-info">drwxr-xr-x  2 user user 4096 Apr  6 14:21 GitHubScene</span></div>`,
    `<div class="wt-line"><span class="wt-info">drwxr-xr-x  2 user user 4096 Apr  6 14:21 TerminalScene</span></div>`,
    `<div class="wt-line"><span class="wt-info">drwxr-xr-x  2 user user 4096 Apr  6 14:20 VSCodeScene</span></div>`,
    `<div class="wt-line"><span class="wt-info">drwxr-xr-x  2 user user 4096 Apr  6 14:21 WindowsScene</span></div>`,
    `<div class="wt-line">&nbsp;</div>`,
    `<div class="wt-line">${uPrompt('slate-dev', '~/projects/slate')}<span class="wt-cmd">ffmpeg -version | head -1</span></div>`,
    `<div class="wt-line"><span class="wt-mute">ffmpeg version 6.1.1 Copyright (c) 2000-2023</span></div>`,
    `<div class="wt-line">&nbsp;</div>`,
    `<div class="wt-line">${uPrompt('slate-dev', '~/projects/slate')}<span class="wt-cmd">echo "Ready to render."</span></div>`,
    `<div class="wt-line"><span class="wt-mute">Ready to render.</span></div>`,
    `<div class="wt-line">&nbsp;</div>`,
    `<div class="wt-line">${uPrompt('slate-dev', '~/projects/slate')}<span class="wt-cursor">▋</span></div>`
  ].join('');

  const probe = {
    version: '1.0',
    pipeline: 'animated-explainer',
    outputProfile: { width: 1920, height: 1080, fps: 30 },
    scenes: [{
      id: 'wt-split',
      duration: 4,
      component: 'TerminalScene',
      props: {
        theme: 'dark',
        tabsHtml,
        leftPaneTitle: 'PowerShell',
        leftPaneContentHtml,
        rightPaneTitle: 'Ubuntu',
        rightPaneContentHtml,
        statusHtml: '<span>UTF-8 · CRLF · 80×24 · feature/pr10e*</span>'
      }
    }]
  };
  writeFileSync(join(OUT_DIR, 'pr10e-terminal-split.scf.json'), JSON.stringify(probe, null, 2));
}

// ════════════════════════════════════════════════════════════════════════════
// Shared GitHub helpers
// ════════════════════════════════════════════════════════════════════════════
const ghTab = ({ icon, label, count = null, active = false }) => {
  const cls = ['gh-repo-tab'];
  if (active) cls.push('gh-repo-tab--active');
  const cnt = count !== null ? `<span class="gh-repo-tab-count">${count}</span>` : '';
  return `<div class="${cls.join(' ')}">${ghSvg(icon)}<span>${label}</span>${cnt}</div>`;
};

const ghTabsHtml = ({ active = 'code' }) => [
  ghTab({ icon: 'code',         label: 'Code',                              active: active === 'code' }),
  ghTab({ icon: 'issue-opened', label: 'Issues',          count: '23',      active: active === 'issues' }),
  ghTab({ icon: 'pull-request', label: 'Pull requests',   count: '4',       active: active === 'pulls' }),
  ghTab({ icon: 'play',         label: 'Actions',                            active: active === 'actions' }),
  ghTab({ icon: 'table',        label: 'Projects',                           active: active === 'projects' }),
  ghTab({ icon: 'book',         label: 'Wiki',                               active: active === 'wiki' }),
  ghTab({ icon: 'shield-check', label: 'Security',                           active: active === 'security' }),
  ghTab({ icon: 'graph',        label: 'Insights',                           active: active === 'insights' })
].join('');

// ════════════════════════════════════════════════════════════════════════════
// 3. GitHubScene — repo-home
// ════════════════════════════════════════════════════════════════════════════
{
  const fileRow = ({ kind, name, msg, time }) => {
    const iconCls = kind === 'folder' ? 'gh-rh-file-icon--folder' : 'gh-rh-file-icon--file';
    const iconId  = kind === 'folder' ? 'folder' : 'file';
    return `<div class="gh-rh-file-row"><span class="gh-rh-file-icon ${iconCls}">${ghSvg(iconId)}</span><span class="gh-rh-file-name">${name}</span><span class="gh-rh-file-msg">${msg}</span><span class="gh-rh-file-time">${time}</span></div>`;
  };

  const filesBody = [
    fileRow({ kind: 'folder', name: '.github',        msg: 'ci: tighten release matrix',      time: '2 days ago' }),
    fileRow({ kind: 'folder', name: 'docs',           msg: 'docs: rewrite quickstart',         time: '3 days ago' }),
    fileRow({ kind: 'folder', name: 'src',            msg: 'feat(billing): add invoice retry', time: '14 hours ago' }),
    fileRow({ kind: 'folder', name: 'tests',          msg: 'test: cover dunning flow',         time: '14 hours ago' }),
    fileRow({ kind: 'file',   name: '.gitignore',     msg: 'chore: ignore .env.local',         time: '2 weeks ago' }),
    fileRow({ kind: 'file',   name: 'LICENSE',        msg: 'Initial commit',                   time: '8 months ago' }),
    fileRow({ kind: 'file',   name: 'README.md',      msg: 'docs: add architecture diagram',   time: 'yesterday' }),
    fileRow({ kind: 'file',   name: 'package.json',   msg: 'deps: bump express to 4.21.2',     time: '5 days ago' }),
    fileRow({ kind: 'file',   name: 'tsconfig.json',  msg: 'build: enable strict null checks', time: '3 weeks ago' })
  ].join('');

  const repoHomeBodyHtml = `
    <div class="gh-rh">
      <div class="gh-rh-main">
        <div class="gh-rh-action-bar">
          <button class="gh-rh-branch">${ghSvg('git-branch')}<span>main</span><svg class="gh-rh-branch-chev" width="12" height="12" aria-hidden="true"><use href="#gh-icon-chevron-down"/></svg></button>
          <span style="font-size:13px;color:var(--gh-text-sec);margin-left:8px">847 branches · 64 tags</span>
          <span class="gh-rh-action-spacer"></span>
          <button class="gh-rh-codebtn">${ghSvg('code', 14)}<span>Code</span><svg width="12" height="12" aria-hidden="true"><use href="#gh-icon-chevron-down"/></svg></button>
        </div>
        <div class="gh-rh-files">
          <div class="gh-rh-file-head">
            <span class="gh-rh-file-head-author"><span class="gh-avatar">M</span><span style="font-weight:600">marcus-h</span></span>
            <span class="gh-rh-file-head-msg">feat(billing): add invoice retry queue with idempotency keys</span>
            <span class="gh-rh-file-head-meta">a4f2c19 · 14 hours ago</span>
            <span class="gh-rh-file-head-meta" style="font-weight:600">1,247 commits</span>
          </div>
          ${filesBody}
        </div>
        <div class="gh-rh-readme">
          <div class="gh-rh-readme-head">${ghSvg('book')}<span>README.md</span></div>
          <div class="gh-rh-readme-body">
            <h1>billing-service</h1>
            <div class="gh-rh-badge-row">
              <span class="gh-rh-badge gh-rh-badge--build">build passing</span>
              <span class="gh-rh-badge gh-rh-badge--cov">coverage 94%</span>
              <span class="gh-rh-badge gh-rh-badge--lic">license MIT</span>
            </div>
            <p>Stripe-backed billing microservice powering subscription, metered, and one-time charges across the Contoso platform.</p>
            <h2>Quickstart</h2>
            <p>Install dependencies with <code>npm install</code> then start the dev server with <code>npm run dev</code>. Configure your Stripe keys in <code>.env.local</code>.</p>
          </div>
        </div>
      </div>
      <div class="gh-rh-aside">
        <div class="gh-rh-about">
          <div class="gh-rh-about-head"><span>About</span><span style="color:var(--gh-text-sec);font-weight:400;font-size:13px">⚙</span></div>
          <p class="gh-rh-about-text">Subscription, metered, and one-time charges for the Contoso platform.</p>
          <div class="gh-rh-about-meta">
            <div class="gh-rh-about-meta-row">${ghSvg('book')}<span>Readme</span></div>
            <div class="gh-rh-about-meta-row">${ghSvg('shield-check')}<span>MIT license</span></div>
            <div class="gh-rh-about-meta-row">${ghSvg('star')}<span><strong>1.2k</strong> stars</span></div>
            <div class="gh-rh-about-meta-row">${ghSvg('eye')}<span><strong>48</strong> watching</span></div>
            <div class="gh-rh-about-meta-row">${ghSvg('fork')}<span><strong>184</strong> forks</span></div>
          </div>
          <div class="gh-rh-about-topics">
            <span class="gh-rh-topic">billing</span>
            <span class="gh-rh-topic">stripe</span>
            <span class="gh-rh-topic">typescript</span>
            <span class="gh-rh-topic">microservice</span>
            <span class="gh-rh-topic">subscriptions</span>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const probe = {
    version: '1.0',
    pipeline: 'animated-explainer',
    outputProfile: { width: 1920, height: 1080, fps: 30 },
    scenes: [{
      id: 'gh-home',
      duration: 4,
      component: 'GitHubScene',
      props: {
        variant: 'repo-home',
        theme: 'light',
        searchPlaceholder: 'Type / to search',
        repoOwner: 'contoso',
        repoName: 'billing-service',
        repoBranchHtml: 'main',
        starsCount: '1.2k',
        forksCount: '184',
        watchersCount: '48',
        repoTabsHtml: ghTabsHtml({ active: 'code' }),
        bodyHtml: repoHomeBodyHtml,
        footerStatusHtml: ''
      }
    }]
  };
  writeFileSync(join(OUT_DIR, 'pr10e-github-repo-home.scf.json'), JSON.stringify(probe, null, 2));
}

// ════════════════════════════════════════════════════════════════════════════
// 4. GitHubScene — pr-diff
// ════════════════════════════════════════════════════════════════════════════
{
  const subTab = ({ icon, label, count = null, active = false }) => {
    const cls = ['gh-pr-subtab'];
    if (active) cls.push('gh-pr-subtab--active');
    const cnt = count !== null ? `<span class="gh-pr-subtab-count">${count}</span>` : '';
    return `<div class="${cls.join(' ')}">${ghSvg(icon)}<span>${label}</span>${cnt}</div>`;
  };

  const subTabs = [
    subTab({ icon: 'comment-discussion', label: 'Conversation',  count: '12' }),
    subTab({ icon: 'history',            label: 'Commits',       count: '7' }),
    subTab({ icon: 'checklist',          label: 'Checks',        count: '8' }),
    subTab({ icon: 'file-diff',          label: 'Files changed', count: '2', active: true })
  ].join('');

  const diffRow = ({ marker, ln = '', rn = '', code }) => {
    const cls = ['gh-pr-diff-row'];
    if (marker === '+') cls.push('gh-pr-diff-row--add');
    if (marker === '-') cls.push('gh-pr-diff-row--rm');
    return `<div class="${cls.join(' ')}"><span class="gh-pr-diff-num">${ln}</span><span class="gh-pr-diff-num gh-pr-diff-num--right">${rn}</span><span class="gh-pr-diff-marker">${marker || ' '}</span><span class="gh-pr-diff-code">${code}</span></div>`;
  };

  const hunk = (text) => `<div class="gh-pr-diff-hunk">${text}</div>`;

  // File 1 diff: palette.ts
  const palette1Diff = [
    hunk('@@ -12,7 +12,9 @@ export const PALETTE = {'),
    diffRow({ marker: ' ', ln: 12, rn: 12, code: '  primary: "#0078d4",' }),
    diffRow({ marker: ' ', ln: 13, rn: 13, code: '  secondary: "#605e5c",' }),
    diffRow({ marker: '-', ln: 14,         code: '  accent: "#00bcf2",' }),
    diffRow({ marker: '+', rn: 14,         code: '  accent: "#26c6da",' }),
    diffRow({ marker: '+', rn: 15,         code: '  accentHover: "#00acc1",' }),
    diffRow({ marker: '+', rn: 16,         code: '  accentMuted: "#80deea",' }),
    diffRow({ marker: ' ', ln: 15, rn: 17, code: '  success: "#107c10",' }),
    diffRow({ marker: ' ', ln: 16, rn: 18, code: '  warning: "#ff8c00",' }),
    diffRow({ marker: ' ', ln: 17, rn: 19, code: '  danger: "#d13438",' }),
    diffRow({ marker: ' ', ln: 18, rn: 20, code: '} as const;' })
  ].join('');

  // File 2 diff: palette.test.ts
  const palette2Diff = [
    hunk('@@ -8,3 +8,11 @@ describe("PALETTE", () => {'),
    diffRow({ marker: ' ', ln: 8,  rn: 8,  code: '    expect(PALETTE.primary).toBe("#0078d4");' }),
    diffRow({ marker: ' ', ln: 9,  rn: 9,  code: '  });' }),
    diffRow({ marker: ' ', ln: 10, rn: 10, code: '});' }),
    diffRow({ marker: '+', rn: 11,         code: '' }),
    diffRow({ marker: '+', rn: 12,         code: 'describe("accent palette", () => {' }),
    diffRow({ marker: '+', rn: 13,         code: '  it("exposes hover + muted variants", () => {' }),
    diffRow({ marker: '+', rn: 14,         code: '    expect(PALETTE.accentHover).toBe("#00acc1");' }),
    diffRow({ marker: '+', rn: 15,         code: '    expect(PALETTE.accentMuted).toBe("#80deea");' }),
    diffRow({ marker: '+', rn: 16,         code: '  });' }),
    diffRow({ marker: '+', rn: 17,         code: '});' })
  ].join('');

  const file1 = `
    <div class="gh-pr-file">
      <div class="gh-pr-file-head">
        <span class="gh-pr-file-chev">${ghSvg('chevron-down', 12)}</span>
        <span class="gh-pr-file-stat-add">+3</span>
        <span class="gh-pr-file-stat-rm">-1</span>
        <span class="gh-pr-file-name">src/styles/palette.ts</span>
        <span class="gh-pr-file-spacer"></span>
        <button class="gh-pr-file-action" aria-label="Copy">${ghSvg('copy', 14)}</button>
        <button class="gh-pr-file-action" aria-label="More">${ghSvg('kebab', 14)}</button>
      </div>
      <div class="gh-pr-diff">${palette1Diff}</div>
      <div class="gh-pr-comment">
        <div class="gh-pr-comment-head">
          <span class="gh-avatar">L</span>
          <span class="gh-pr-comment-author">lin-reviewer</span>
          <span class="gh-pr-comment-time">commented 2 hours ago on line 14</span>
        </div>
        <div class="gh-pr-comment-body">
          Nice — moving to the cyan family lands closer to our brand spec. Can we also update the dark-theme override in <code>theme/dark.ts</code> in the same PR to keep the two palettes in sync?
        </div>
      </div>
    </div>`.trim();

  const file2 = `
    <div class="gh-pr-file">
      <div class="gh-pr-file-head">
        <span class="gh-pr-file-chev">${ghSvg('chevron-down', 12)}</span>
        <span class="gh-pr-file-stat-add">+7</span>
        <span class="gh-pr-file-stat-rm">-0</span>
        <span class="gh-pr-file-name">src/styles/palette.test.ts</span>
        <span class="gh-pr-file-spacer"></span>
        <button class="gh-pr-file-action" aria-label="Copy">${ghSvg('copy', 14)}</button>
        <button class="gh-pr-file-action" aria-label="More">${ghSvg('kebab', 14)}</button>
      </div>
      <div class="gh-pr-diff">${palette2Diff}</div>
    </div>`.trim();

  const prDiffBodyHtml = `
    <div class="gh-pr">
      <div class="gh-pr-head">
        <div class="gh-pr-title">Refresh accent palette to cyan family<span class="gh-pr-num">#1284</span></div>
        <div class="gh-pr-meta">
          <span class="gh-pr-status">${ghSvg('pull-request', 14)}<span>Open</span></span>
          <span><strong style="color:var(--gh-text)">marcus-h</strong> wants to merge <strong style="color:var(--gh-text)">7</strong> commits into <code style="background:rgba(175,184,193,0.2);padding:1px 6px;border-radius:3px;font-family:ui-monospace,monospace">main</code> from <code style="background:rgba(175,184,193,0.2);padding:1px 6px;border-radius:3px;font-family:ui-monospace,monospace">feat/palette-refresh</code></span>
        </div>
      </div>
      <div class="gh-pr-subtabs">${subTabs}</div>
      <div class="gh-pr-files">
        ${file1}
        ${file2}
      </div>
    </div>
  `.trim();

  const probe = {
    version: '1.0',
    pipeline: 'animated-explainer',
    outputProfile: { width: 1920, height: 1080, fps: 30 },
    scenes: [{
      id: 'gh-pr',
      duration: 4,
      component: 'GitHubScene',
      props: {
        variant: 'pr-diff',
        theme: 'light',
        searchPlaceholder: 'Type / to search',
        repoOwner: 'contoso',
        repoName: 'billing-service',
        repoBranchHtml: 'main',
        starsCount: '1.2k',
        forksCount: '184',
        watchersCount: '48',
        repoTabsHtml: ghTabsHtml({ active: 'pulls' }),
        bodyHtml: prDiffBodyHtml,
        footerStatusHtml: ''
      }
    }]
  };
  writeFileSync(join(OUT_DIR, 'pr10e-github-pr-diff.scf.json'), JSON.stringify(probe, null, 2));
}

console.log('OK — wrote 4 PR 10e utility-surface probes:');
console.log('  - pr10e-windows-file-explorer.scf.json');
console.log('  - pr10e-terminal-split.scf.json');
console.log('  - pr10e-github-repo-home.scf.json');
console.log('  - pr10e-github-pr-diff.scf.json');
