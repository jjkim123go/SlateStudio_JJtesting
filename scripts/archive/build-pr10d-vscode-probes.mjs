#!/usr/bin/env node
/**
 * Build the 4 PR 10d VSCode probe SCF files.
 * Run from repo root: node scripts\build-pr10d-vscode-probes.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'tests', 'qa-scenarios');
mkdirSync(OUT_DIR, { recursive: true });

// --- helpers ----------------------------------------------------------------
// PR 10d v2 fix: emit explicit width/height attrs on every <svg>. Without
// them, slot-injected icons with no class-based CSS sizing rule (extension
// thumbnail, MCP rows, PROBLEMS rows) fall back to the SVG default ~300x150
// box and overflow their parent. width/height attrs are presentation
// attributes (specificity 0), so existing class-targeted CSS rules in
// index.html still win for chrome icons (.vs-tree-icon svg, etc.).
const svg = (id, size = 16) => `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#vscode-icon-${id}"/></svg>`;

const treeRow = ({ depth = 0, chevron = null, icon, label, badge = '', active = false, selected = false }) => {
  const cls = ['vs-tree-row'];
  if (active) cls.push('is-active');
  if (selected) cls.push('is-selected');
  const pad = 8 + depth * 8;
  const chev = chevron
    ? `<span class="vs-tree-chevron">${svg('chevron-' + chevron + '-tree')}</span>`
    : `<span class="vs-tree-chevron"></span>`;
  return `<div class="${cls.join(' ')}" style="padding-left:${pad}px">${chev}<span class="vs-tree-icon">${svg(icon)}</span><span class="vs-tree-label">${label}</span>${badge}</div>`;
};

const sectionHeader = ({ chevron = 'down', title, count = null }) => {
  const c = count !== null ? `<span class="vs-side-section-count">${count}</span>` : '';
  return `<div class="vs-side-section"><span class="vs-tree-chevron">${svg('chevron-' + chevron + '-tree')}</span><span class="vs-side-section-title">${title}</span>${c}</div>`;
};

const tab = ({ icon, label, active = false, dirty = false }) => {
  const cls = ['vs-tab'];
  if (active) cls.push('vs-tab--active');
  const closeOrDirty = dirty
    ? `<span class="vs-tab-dirty"></span>`
    : `<button class="vs-tab-close" aria-label="Close">${svg('close')}</button>`;
  return `<div class="${cls.join(' ')}"><span class="vs-tab-icon">${svg('file-' + icon)}</span><span class="vs-tab-label">${label}</span>${closeOrDirty}</div>`;
};

const breadcrumb = (parts) => {
  const sep = `<span class="vs-bc-sep">${svg('chevron-right')}</span>`;
  return parts.map(([icon, text]) => {
    const ic = icon ? `<span style="display:inline-flex;width:14px;height:14px">${svg(icon)}</span>` : '';
    return `<span class="vs-bc-item">${ic}<span>${text}</span></span>`;
  }).join(sep);
};

const sbItem = (icon, text) => `<span class="vs-sb-item">${icon ? svg(icon) : ''}${text ? `<span>${text}</span>` : ''}</span>`;

const gutter = (n) => Array.from({ length: n }, (_, i) => `<span class="vs-gutter-line">${i + 1}</span>`).join('');

const minimap = (rows) => rows.map(t => `<div class="vs-minimap-row${t ? ' is-' + t : ''}"></div>`).join('');

const sidebarActions = (icons) => icons.map(i => `<button class="vs-side-action" aria-label="${i}">${svg(i)}</button>`).join('');

const codeLine = (parts) => `<span class="vs-code-line">${parts}</span>`;

const tk = (cls, txt) => `<span class="vs-tk-${cls}">${txt}</span>`;

// --- 1. Chat-left -----------------------------------------------------------
{
  const tabs = [
    tab({ icon: 'ts', label: 'auth.ts', active: true, dirty: true }),
    tab({ icon: 'ts', label: 'login.ts' })
  ].join('');

  const bc = breadcrumb([
    ['folder', 'contoso-app'],
    ['folder', 'src'],
    ['folder', 'auth'],
    ['file-ts', 'auth.ts']
  ]);

  const codeLines = [
    codeLine(`${tk('com', '// Authentication service')}`),
    codeLine(`${tk('kw', 'import')} { ${tk('var', 'sign')}, ${tk('var', 'verify')} } ${tk('kw', 'from')} ${tk('str', "'jsonwebtoken'")};`),
    codeLine(`${tk('kw', 'import')} { ${tk('var', 'hash')}, ${tk('var', 'compare')} } ${tk('kw', 'from')} ${tk('str', "'bcrypt'")};`),
    codeLine(``),
    codeLine(`${tk('kw', 'export')} ${tk('kw', 'class')} ${tk('type', 'AuthService')} {`),
    codeLine(`  ${tk('kw', 'private')} ${tk('var', 'secret')}: ${tk('type', 'string')};`),
    codeLine(``),
    codeLine(`  ${tk('kw', 'constructor')}(${tk('var', 'secret')}: ${tk('type', 'string')}) {`),
    codeLine(`    ${tk('kw', 'this')}.${tk('prop', 'secret')} = ${tk('var', 'secret')};`),
    codeLine(`  }`),
    codeLine(``),
    codeLine(`  ${tk('kw', 'async')} ${tk('fn', 'login')}(${tk('var', 'email')}: ${tk('type', 'string')}, ${tk('var', 'password')}: ${tk('type', 'string')}) {`),
    codeLine(`    ${tk('kw', 'const')} ${tk('var', 'user')} = ${tk('kw', 'await')} ${tk('fn', 'findUser')}(${tk('var', 'email')});`),
    codeLine(`    ${tk('kw', 'if')} (!${tk('var', 'user')}) ${tk('kw', 'return')} ${tk('kw', 'null')};`),
    codeLine(`    ${tk('kw', 'const')} ${tk('var', 'ok')} = ${tk('kw', 'await')} ${tk('fn', 'compare')}(${tk('var', 'password')}, ${tk('var', 'user')}.${tk('prop', 'hash')});`),
    codeLine(`    ${tk('kw', 'if')} (!${tk('var', 'ok')}) ${tk('kw', 'return')} ${tk('kw', 'null')};`),
    codeLine(`    ${tk('kw', 'return')} ${tk('fn', 'sign')}({ ${tk('prop', 'sub')}: ${tk('var', 'user')}.${tk('prop', 'id')} }, ${tk('kw', 'this')}.${tk('prop', 'secret')});`),
    codeLine(`  }`),
    codeLine(``),
    codeLine(`  ${tk('fn', 'verify')}(${tk('var', 'token')}: ${tk('type', 'string')}) {`),
    codeLine(`    ${tk('kw', 'return')} ${tk('fn', 'verify')}(${tk('var', 'token')}, ${tk('kw', 'this')}.${tk('prop', 'secret')});`),
    codeLine(`  }`),
    codeLine(`}`)
  ].join('');

  // Chat sidebar body
  const chatBody = [
    `<div style="padding:12px 16px;font-size:12px;color:var(--vs-text-sec);border-bottom:1px solid var(--vs-divider)">CHAT (Copilot)</div>`,
    `<div style="padding:12px 14px;display:flex;flex-direction:column;gap:14px">`,
      `<div style="display:flex;gap:10px"><div style="width:24px;height:24px;border-radius:50%;background:#0d6efd;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:600;flex:0 0 24px">A</div><div style="flex:1"><div style="font-size:12px;color:var(--vs-text);margin-bottom:4px">Add a login flow that uses JWT and bcrypt.</div></div></div>`,
      `<div style="display:flex;gap:10px"><div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#7e57ff,#3aa8ff);display:flex;align-items:center;justify-content:center;color:#fff;flex:0 0 24px">${svg('copilot')}</div><div style="flex:1;font-size:12px;color:var(--vs-text);line-height:1.6"><div style="margin-bottom:6px">I&rsquo;ll add an <code style="background:#1e1e1e;padding:1px 4px;border-radius:3px;font-family:'Cascadia Code',monospace;font-size:11px">AuthService</code> class with a <code style="background:#1e1e1e;padding:1px 4px;border-radius:3px;font-family:'Cascadia Code',monospace;font-size:11px">login()</code> method that signs a JWT after checking the bcrypt hash:</div><div style="background:#1e1e1e;border:1px solid var(--vs-border);border-radius:4px;padding:8px 10px;font-family:'Cascadia Code',monospace;font-size:11px;line-height:1.5;color:var(--vs-text)"><span style="color:#569cd6">async</span> <span style="color:#dcdcaa">login</span>(email, password) {<br/>&nbsp;&nbsp;<span style="color:#569cd6">const</span> user = <span style="color:#569cd6">await</span> findUser(email);<br/>&nbsp;&nbsp;<span style="color:#569cd6">if</span> (!user) <span style="color:#569cd6">return</span> <span style="color:#569cd6">null</span>;<br/>&nbsp;&nbsp;...<br/>}</div><div style="margin-top:6px">I&rsquo;ve applied the change to <span style="color:var(--vs-info)">src/auth/auth.ts</span>. Want me to add a test?</div></div></div>`,
    `</div>`,
    `<div style="margin-top:auto;padding:10px 12px;border-top:1px solid var(--vs-divider);background:var(--vs-sidebar)"><div style="background:#1e1e1e;border:1px solid var(--vs-border);border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:6px"><div style="font-size:12px;color:var(--vs-text-sec)">Ask Copilot a question or type / for commands</div><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><button class="vs-side-action" aria-label="Attach">${svg('attach')}</button><button class="vs-side-action" aria-label="Mic">${svg('mic')}</button><button class="vs-side-action" aria-label="Send" style="color:var(--vs-accent)">${svg('send')}</button></div></div></div>`
  ].join('');

  const panelTabs = [
    `<button class="vs-panel-tab">Problems <span class="vs-panel-tab-count">2</span></button>`,
    `<button class="vs-panel-tab">Output</button>`,
    `<button class="vs-panel-tab">Debug Console</button>`,
    `<button class="vs-panel-tab vs-panel-tab--active">Terminal</button>`,
    `<button class="vs-panel-tab">Ports</button>`
  ].join('');

  const panelBody = [
    `<span class="vs-prompt">PS</span> <span class="vs-prompt-path">~/projects/contoso-app</span> <span class="vs-prompt-arrow">&gt;</span> npm test\n`,
    `\n`,
    `> contoso-app@1.0.0 test\n`,
    `> jest --coverage\n`,
    `\n`,
    ` PASS  src/auth/auth.test.ts\n`,
    `  AuthService\n`,
    `    <span class="vs-out-ok">&#10003;</span> issues a JWT for valid credentials (24 ms)\n`,
    `    <span class="vs-out-ok">&#10003;</span> rejects bad password (8 ms)\n`,
    `    <span class="vs-out-ok">&#10003;</span> rejects unknown email (5 ms)\n`,
    `\n`,
    `Test Suites: 1 passed, 1 total\n`,
    `Tests:       3 passed, 3 total\n`,
    `<span class="vs-prompt">PS</span> <span class="vs-prompt-path">~/projects/contoso-app</span> <span class="vs-prompt-arrow">&gt;</span> <span style="background:rgba(255,255,255,0.6);width:7px;height:14px;display:inline-block;vertical-align:middle"></span>`
  ].join('');

  const sbLeft = [
    sbItem('git-branch', 'main*'),
    sbItem('sync-sb', '↓ 0 ↑ 1'),
    sbItem('error', '0'),
    sbItem('warning', '1'),
    sbItem(null, 'Copilot ready')
  ].join('');

  const sbRight = [
    sbItem(null, 'Ln 13, Col 28'),
    sbItem(null, 'Spaces: 2'),
    sbItem(null, 'UTF-8'),
    sbItem(null, 'LF'),
    sbItem(null, 'TypeScript'),
    sbItem('feedback', null),
    sbItem('bell', null)
  ].join('');

  const probe = {
    version: '1.0',
    pipeline: 'animated-explainer',
    outputProfile: { width: 1920, height: 1080, fps: 30 },
    scenes: [{
      id: 'vscode-chat-left',
      duration: 4,
      component: 'VSCodeScene',
      props: {
        showSecondary: 'false',
        showPanel: 'true',
        showMinimap: 'true',
        showBreadcrumb: 'true',
        activeActivity: 'chat',
        titlebarText: 'contoso-app — Visual Studio Code',
        scmBadgeHtml: '<span class="vs-ab-badge">3</span>',
        primarySidebarTitle: 'CHAT',
        primarySidebarActionsHtml: sidebarActions(['add', 'history', 'ellipsis']),
        primarySidebarBodyHtml: chatBody,
        secondarySidebarTitle: '',
        secondarySidebarActionsHtml: '',
        secondarySidebarBodyHtml: '',
        tabListHtml: tabs,
        breadcrumbHtml: bc,
        gutterHtml: gutter(23),
        codeContentHtml: codeLines,
        minimapHtml: minimap(['kw','com','kw','empty','kw','var','empty','kw','prop','empty','kw','var','var','var','var','var','kw','empty','kw','kw','empty','kw']),
        panelTabsHtml: panelTabs,
        panelBodyHtml: panelBody,
        statusbarLeftHtml: sbLeft,
        statusbarRightHtml: sbRight
      }
    }]
  };

  writeFileSync(join(OUT_DIR, 'pr10d-vscode-chat-left.scf.json'), JSON.stringify(probe, null, 2));
}

// --- 2. Extensions-right ----------------------------------------------------
{
  const tabs = [
    tab({ icon: 'json', label: 'package.json' }),
    tab({ icon: 'ts', label: 'app.ts', active: true }),
    tab({ icon: 'md', label: 'README.md' })
  ].join('');

  const bc = breadcrumb([
    ['folder', 'contoso-app'],
    ['folder', 'src'],
    ['file-ts', 'app.ts']
  ]);

  const explorerBody = [
    sectionHeader({ chevron: 'down', title: 'CONTOSO-APP' }),
    treeRow({ depth: 0, chevron: 'down', icon: 'folder-open', label: 'src' }),
    treeRow({ depth: 1, chevron: 'right', icon: 'folder', label: 'auth' }),
    treeRow({ depth: 1, chevron: 'down', icon: 'folder-open', label: 'components' }),
    treeRow({ depth: 2, icon: 'file-ts', label: 'Header.tsx' }),
    treeRow({ depth: 2, icon: 'file-ts', label: 'Sidebar.tsx', badge: '<span class="vs-tree-badge is-modified">M</span>' }),
    treeRow({ depth: 1, chevron: 'right', icon: 'folder', label: 'lib' }),
    treeRow({ depth: 1, icon: 'file-ts', label: 'app.ts', active: true, selected: true }),
    treeRow({ depth: 1, icon: 'file-ts', label: 'index.ts' }),
    treeRow({ depth: 0, chevron: 'right', icon: 'folder', label: 'tests' }),
    treeRow({ depth: 0, icon: 'file-md', label: 'README.md' }),
    treeRow({ depth: 0, icon: 'file-json', label: 'package.json' }),
    treeRow({ depth: 0, icon: 'file-yaml', label: 'tsconfig.json' })
  ].join('');

  const codeLines = [
    codeLine(`${tk('com', '// Application entry point')}`),
    codeLine(`${tk('kw', 'import')} { ${tk('var', 'createServer')} } ${tk('kw', 'from')} ${tk('str', "'./server'")};`),
    codeLine(`${tk('kw', 'import')} { ${tk('var', 'AuthService')} } ${tk('kw', 'from')} ${tk('str', "'./auth/auth'")};`),
    codeLine(`${tk('kw', 'import')} { ${tk('var', 'config')} } ${tk('kw', 'from')} ${tk('str', "'./config'")};`),
    codeLine(``),
    codeLine(`${tk('kw', 'const')} ${tk('var', 'auth')} = ${tk('kw', 'new')} ${tk('type', 'AuthService')}(${tk('var', 'config')}.${tk('prop', 'jwtSecret')});`),
    codeLine(`${tk('kw', 'const')} ${tk('var', 'app')} = ${tk('fn', 'createServer')}({ ${tk('prop', 'auth')} });`),
    codeLine(``),
    codeLine(`${tk('var', 'app')}.${tk('fn', 'listen')}(${tk('var', 'config')}.${tk('prop', 'port')}, () =&gt; {`),
    codeLine(`  ${tk('var', 'console')}.${tk('fn', 'log')}(${tk('str', "`Server running on :${config.port}`")});`),
    codeLine(`});`),
    codeLine(``),
    codeLine(`${tk('kw', 'export')} { ${tk('var', 'app')} };`)
  ].join('');

  // Extensions in secondary sidebar
  const extBody = [
    `<div style="padding:8px 12px;border-bottom:1px solid var(--vs-divider)"><div style="display:flex;align-items:center;gap:6px;background:#1e1e1e;border:1px solid var(--vs-border);border-radius:4px;padding:4px 8px"><span style="color:var(--vs-text-sec);display:inline-flex;align-items:center;flex:0 0 14px">${svg('search-input', 14)}</span><span style="font-size:12px;color:var(--vs-text-sec);flex:1">Search Extensions in Marketplace</span><span style="color:var(--vs-text-sec);display:inline-flex;align-items:center;flex:0 0 14px">${svg('filter', 14)}</span></div></div>`,
    sectionHeader({ chevron: 'down', title: 'INSTALLED', count: 12 }),
    extItem('Copilot', 'GitHub', 'AI pair programmer', true),
    extItem('GitHub Pull Requests', 'GitHub', 'Review PRs in editor', true),
    extItem('IntelliCode', 'Microsoft', 'AI-assisted IntelliSense', true),
    extItem('Dev Containers', 'Microsoft', 'Open folder in container', true),
    extItem('Git History', 'Don Jayamanne', 'View git log, file history', true),
    sectionHeader({ chevron: 'down', title: 'MCP SERVERS', count: 4 }),
    mcpItem('ado', 'Connected', true),
    mcpItem('azure', 'Connected', true),
    mcpItem('icm-mcp', 'Connected', true),
    mcpItem('teams-mcp', 'Idle', false)
  ].join('');

  function extItem(name, pub, desc, verified) {
    const v = verified ? `<span style="display:inline-flex;align-items:center;flex:0 0 14px">${svg('verified', 14)}</span>` : '';
    return `<div style="display:flex;gap:10px;padding:8px 14px;border-bottom:1px solid var(--vs-divider);cursor:pointer"><div style="width:40px;height:40px;border-radius:4px;background:#0d1117;display:flex;align-items:center;justify-content:center;flex:0 0 40px"><span style="color:var(--vs-accent);display:inline-flex;align-items:center;justify-content:center">${svg('package', 24)}</span></div><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--vs-text)"><span style="overflow:hidden;text-overflow:ellipsis">${name}</span>${v}</div><div style="font-size:11px;color:var(--vs-text-sec);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${desc}</div><div style="font-size:11px;color:var(--vs-text-sec);margin-top:2px">${pub}</div></div></div>`;
  }

  function mcpItem(name, status, ok) {
    const dot = ok ? '#73c991' : '#cca700';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 14px;font-size:12px;color:var(--vs-text)"><span style="color:var(--vs-text-sec);display:inline-flex;align-items:center;flex:0 0 14px">${svg('server', 14)}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span><span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--vs-text-sec)"><span style="width:6px;height:6px;border-radius:50%;background:${dot}"></span>${status}</span></div>`;
  }

  const sbLeft = [
    sbItem('git-branch', 'main'),
    sbItem('sync-sb', '↓ 0 ↑ 0'),
    sbItem('error', '0'),
    sbItem('warning', '0')
  ].join('');

  const sbRight = [
    sbItem(null, 'Ln 6, Col 1'),
    sbItem(null, 'Spaces: 2'),
    sbItem(null, 'UTF-8'),
    sbItem(null, 'LF'),
    sbItem(null, 'TypeScript'),
    sbItem('feedback', null),
    sbItem('bell', null)
  ].join('');

  const probe = {
    version: '1.0',
    pipeline: 'animated-explainer',
    outputProfile: { width: 1920, height: 1080, fps: 30 },
    scenes: [{
      id: 'vscode-extensions-right',
      duration: 4,
      component: 'VSCodeScene',
      props: {
        showSecondary: 'true',
        showPanel: 'false',
        showMinimap: 'true',
        showBreadcrumb: 'true',
        activeActivity: 'explorer',
        titlebarText: 'contoso-app — Visual Studio Code',
        scmBadgeHtml: '',
        primarySidebarTitle: 'EXPLORER',
        primarySidebarActionsHtml: sidebarActions(['new-file', 'new-folder', 'refresh', 'collapse-all']),
        primarySidebarBodyHtml: explorerBody,
        secondarySidebarTitle: 'EXTENSIONS',
        secondarySidebarActionsHtml: sidebarActions(['filter', 'refresh', 'ellipsis']),
        secondarySidebarBodyHtml: extBody,
        tabListHtml: tabs,
        breadcrumbHtml: bc,
        gutterHtml: gutter(13),
        codeContentHtml: codeLines,
        minimapHtml: minimap(['com','kw','kw','kw','empty','kw','kw','empty','var','var','var','empty','kw']),
        panelTabsHtml: '',
        panelBodyHtml: '',
        statusbarLeftHtml: sbLeft,
        statusbarRightHtml: sbRight
      }
    }]
  };

  writeFileSync(join(OUT_DIR, 'pr10d-vscode-extensions-right.scf.json'), JSON.stringify(probe, null, 2));
}

// --- 3. Explorer-default ----------------------------------------------------
{
  const tabs = [
    tab({ icon: 'md', label: 'README.md', active: true })
  ].join('');

  const bc = breadcrumb([
    ['folder', 'contoso-app'],
    ['file-md', 'README.md']
  ]);

  const explorerBody = [
    sectionHeader({ chevron: 'down', title: 'CONTOSO-APP' }),
    treeRow({ depth: 0, chevron: 'down', icon: 'folder-open', label: 'docs' }),
    treeRow({ depth: 1, icon: 'file-md', label: 'getting-started.md' }),
    treeRow({ depth: 1, icon: 'file-md', label: 'architecture.md' }),
    treeRow({ depth: 0, chevron: 'right', icon: 'folder', label: 'src' }),
    treeRow({ depth: 0, chevron: 'right', icon: 'folder', label: 'tests' }),
    treeRow({ depth: 0, chevron: 'right', icon: 'folder', label: 'scripts' }),
    treeRow({ depth: 0, icon: 'file-yaml', label: '.eslintrc.yaml' }),
    treeRow({ depth: 0, icon: 'file-generic', label: '.gitignore' }),
    treeRow({ depth: 0, icon: 'file-md', label: 'README.md', active: true, selected: true }),
    treeRow({ depth: 0, icon: 'file-json', label: 'package.json' }),
    treeRow({ depth: 0, icon: 'file-json', label: 'tsconfig.json' })
  ].join('');

  // Markdown-style code area (not really code, but rendered as the editor body)
  const codeLines = [
    codeLine(`<span style="color:#569cd6;font-weight:600">#</span> ${tk('html-text', 'Contoso App')}`),
    codeLine(``),
    codeLine(`${tk('html-text', 'A reference application demonstrating the Contoso platform.')}`),
    codeLine(``),
    codeLine(`<span style="color:#569cd6;font-weight:600">##</span> ${tk('html-text', 'Getting started')}`),
    codeLine(``),
    codeLine(`${tk('html-text', '1. Install dependencies:')}`),
    codeLine(``),
    codeLine(`   <span style="background:#2d2d2d;padding:1px 4px;border-radius:3px">npm install</span>`),
    codeLine(``),
    codeLine(`${tk('html-text', '2. Start the dev server:')}`),
    codeLine(``),
    codeLine(`   <span style="background:#2d2d2d;padding:1px 4px;border-radius:3px">npm run dev</span>`),
    codeLine(``),
    codeLine(`<span style="color:#569cd6;font-weight:600">##</span> ${tk('html-text', 'Project layout')}`),
    codeLine(``),
    codeLine(`<span style="color:#9cdcfe">- </span>${tk('html-text', '`src/` — application source')}`),
    codeLine(`<span style="color:#9cdcfe">- </span>${tk('html-text', '`tests/` — Jest test suites')}`),
    codeLine(`<span style="color:#9cdcfe">- </span>${tk('html-text', '`docs/` — long-form documentation')}`),
    codeLine(`<span style="color:#9cdcfe">- </span>${tk('html-text', '`scripts/` — build and release helpers')}`)
  ].join('');

  const sbLeft = [
    sbItem('git-branch', 'main'),
    sbItem('sync-sb', '↓ 0 ↑ 0'),
    sbItem('error', '0'),
    sbItem('warning', '0')
  ].join('');

  const sbRight = [
    sbItem(null, 'Ln 1, Col 1'),
    sbItem(null, 'Spaces: 2'),
    sbItem(null, 'UTF-8'),
    sbItem(null, 'LF'),
    sbItem(null, 'Markdown'),
    sbItem('feedback', null),
    sbItem('bell', null)
  ].join('');

  const probe = {
    version: '1.0',
    pipeline: 'animated-explainer',
    outputProfile: { width: 1920, height: 1080, fps: 30 },
    scenes: [{
      id: 'vscode-explorer-default',
      duration: 4,
      component: 'VSCodeScene',
      props: {
        showSecondary: 'false',
        showPanel: 'false',
        showMinimap: 'true',
        showBreadcrumb: 'true',
        activeActivity: 'explorer',
        titlebarText: 'contoso-app — Visual Studio Code',
        scmBadgeHtml: '',
        primarySidebarTitle: 'EXPLORER',
        primarySidebarActionsHtml: sidebarActions(['new-file', 'new-folder', 'refresh', 'collapse-all']),
        primarySidebarBodyHtml: explorerBody,
        secondarySidebarTitle: '',
        secondarySidebarActionsHtml: '',
        secondarySidebarBodyHtml: '',
        tabListHtml: tabs,
        breadcrumbHtml: bc,
        gutterHtml: gutter(20),
        codeContentHtml: codeLines,
        minimapHtml: minimap(['kw','empty','com','empty','kw','empty','com','empty','str','empty','com','empty','str','empty','kw','empty','com','com','com','com']),
        panelTabsHtml: '',
        panelBodyHtml: '',
        statusbarLeftHtml: sbLeft,
        statusbarRightHtml: sbRight
      }
    }]
  };

  writeFileSync(join(OUT_DIR, 'pr10d-vscode-explorer-default.scf.json'), JSON.stringify(probe, null, 2));
}

// --- 4. SCM-staged ----------------------------------------------------------
{
  const tabs = [
    tab({ icon: 'ts', label: 'user.ts (Working Tree)', active: true, dirty: true })
  ].join('');

  const bc = breadcrumb([
    ['folder', 'contoso-app'],
    ['folder', 'src'],
    ['folder', 'models'],
    ['file-ts', 'user.ts']
  ]);

  const scmBody = [
    `<div style="padding:8px 14px;border-bottom:1px solid var(--vs-divider)"><div style="background:#1e1e1e;border:1px solid var(--vs-border);border-radius:4px;padding:6px 8px;display:flex;flex-direction:column;gap:6px"><div style="font-size:12px;color:var(--vs-text)">Refactor user model — split into reader/writer</div><div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:11px;color:var(--vs-text-sec)">Message (Ctrl+Enter to commit)</span><button style="background:var(--vs-accent);color:#fff;border:0;border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer">&#10003; Commit</button></div></div></div>`,
    sectionHeader({ chevron: 'down', title: 'STAGED CHANGES', count: 2 }),
    `<div class="vs-tree-row" style="padding-left:8px"><span class="vs-tree-icon">${svg('file-ts')}</span><span class="vs-tree-label">user.ts</span><span class="vs-tree-badge is-modified">M</span></div>`,
    `<div class="vs-tree-row" style="padding-left:8px"><span class="vs-tree-icon">${svg('file-ts')}</span><span class="vs-tree-label">user.test.ts</span><span class="vs-tree-badge is-modified">M</span></div>`,
    sectionHeader({ chevron: 'down', title: 'CHANGES', count: 3 }),
    `<div class="vs-tree-row" style="padding-left:8px"><span class="vs-tree-icon">${svg('file-ts')}</span><span class="vs-tree-label">user-reader.ts</span><span class="vs-tree-badge is-untracked">U</span></div>`,
    `<div class="vs-tree-row" style="padding-left:8px"><span class="vs-tree-icon">${svg('file-ts')}</span><span class="vs-tree-label">user-writer.ts</span><span class="vs-tree-badge is-untracked">U</span></div>`,
    `<div class="vs-tree-row" style="padding-left:8px"><span class="vs-tree-icon">${svg('file-md')}</span><span class="vs-tree-label">CHANGELOG.md</span><span class="vs-tree-badge is-modified">M</span></div>`
  ].join('');

  // Diff view in editor
  const codeLines = [
    `<span class="vs-code-line vs-diff-hunk">@@ -1,18 +1,12 @@ class User {</span>`,
    `<span class="vs-code-line">  ${tk('com', '// User entity')}</span>`,
    `<span class="vs-code-line">  ${tk('kw', 'export')} ${tk('kw', 'class')} ${tk('type', 'User')} {</span>`,
    `<span class="vs-code-line">    ${tk('var', 'id')}: ${tk('type', 'string')};</span>`,
    `<span class="vs-code-line">    ${tk('var', 'email')}: ${tk('type', 'string')};</span>`,
    `<span class="vs-code-line vs-diff-del">-   ${tk('var', 'passwordHash')}: ${tk('type', 'string')};</span>`,
    `<span class="vs-code-line vs-diff-del">-   ${tk('var', 'lastLoginAt')}: ${tk('type', 'Date')};</span>`,
    `<span class="vs-code-line vs-diff-add">+   ${tk('var', 'createdAt')}: ${tk('type', 'Date')};</span>`,
    `<span class="vs-code-line">  }</span>`,
    `<span class="vs-code-line"></span>`,
    `<span class="vs-code-line vs-diff-del">- ${tk('kw', 'export')} ${tk('kw', 'async')} ${tk('kw', 'function')} ${tk('fn', 'loadUser')}(${tk('var', 'id')}: ${tk('type', 'string')}) {</span>`,
    `<span class="vs-code-line vs-diff-del">-   ${tk('kw', 'return')} ${tk('kw', 'await')} ${tk('fn', 'db')}.${tk('fn', 'query')}(${tk('str', "'SELECT * FROM users WHERE id = ?'")}, [${tk('var', 'id')}]);</span>`,
    `<span class="vs-code-line vs-diff-del">- }</span>`,
    `<span class="vs-code-line vs-diff-add">+ ${tk('kw', 'export')} { ${tk('type', 'UserReader')} } ${tk('kw', 'from')} ${tk('str', "'./user-reader'")};</span>`,
    `<span class="vs-code-line vs-diff-add">+ ${tk('kw', 'export')} { ${tk('type', 'UserWriter')} } ${tk('kw', 'from')} ${tk('str', "'./user-writer'")};</span>`,
    `<span class="vs-code-line"></span>`,
    `<span class="vs-code-line vs-diff-hunk">@@ -25,4 +20,4 @@</span>`,
    `<span class="vs-code-line">  ${tk('kw', 'export')} ${tk('kw', 'function')} ${tk('fn', 'serialize')}(${tk('var', 'u')}: ${tk('type', 'User')}) {</span>`,
    `<span class="vs-code-line">    ${tk('kw', 'return')} { ${tk('prop', 'id')}: ${tk('var', 'u')}.${tk('prop', 'id')}, ${tk('prop', 'email')}: ${tk('var', 'u')}.${tk('prop', 'email')} };</span>`,
    `<span class="vs-code-line">  }</span>`
  ].join('');

  const panelTabs = [
    `<button class="vs-panel-tab vs-panel-tab--active">Problems <span class="vs-panel-tab-count">3</span></button>`,
    `<button class="vs-panel-tab">Output</button>`,
    `<button class="vs-panel-tab">Debug Console</button>`,
    `<button class="vs-panel-tab">Terminal</button>`
  ].join('');

  const panelBody = [
    `<div style="display:flex;align-items:center;gap:8px;padding:2px 0"><span style="color:var(--vs-error);display:inline-flex;align-items:center;flex:0 0 14px">${svg('error', 14)}</span><span style="color:var(--vs-text)">Property 'passwordHash' does not exist on type 'User'.</span><span style="color:var(--vs-text-sec);font-size:11px">user.test.ts (42, 18) — ts(2339)</span></div>`,
    `<div style="display:flex;align-items:center;gap:8px;padding:2px 0"><span style="color:var(--vs-error);display:inline-flex;align-items:center;flex:0 0 14px">${svg('error', 14)}</span><span style="color:var(--vs-text)">Cannot find name 'loadUser'.</span><span style="color:var(--vs-text-sec);font-size:11px">user.test.ts (12, 7) — ts(2304)</span></div>`,
    `<div style="display:flex;align-items:center;gap:8px;padding:2px 0"><span style="color:var(--vs-warn);display:inline-flex;align-items:center;flex:0 0 14px">${svg('warning', 14)}</span><span style="color:var(--vs-text)">'lastLoginAt' is declared but never used.</span><span style="color:var(--vs-text-sec);font-size:11px">user-reader.ts (8, 3) — ts(6133)</span></div>`
  ].join('');

  const sbLeft = [
    sbItem('git-branch', 'feature/user-split*'),
    sbItem('sync-sb', '↓ 2 ↑ 5'),
    sbItem('error', '2'),
    sbItem('warning', '1')
  ].join('');

  const sbRight = [
    sbItem(null, 'Ln 7, Col 12'),
    sbItem(null, 'Spaces: 2'),
    sbItem(null, 'UTF-8'),
    sbItem(null, 'LF'),
    sbItem(null, 'TypeScript'),
    sbItem('feedback', null),
    sbItem('bell', null)
  ].join('');

  const probe = {
    version: '1.0',
    pipeline: 'animated-explainer',
    outputProfile: { width: 1920, height: 1080, fps: 30 },
    scenes: [{
      id: 'vscode-scm-staged',
      duration: 4,
      component: 'VSCodeScene',
      props: {
        showSecondary: 'false',
        showPanel: 'true',
        showMinimap: 'true',
        showBreadcrumb: 'true',
        activeActivity: 'scm',
        titlebarText: 'contoso-app [feature/user-split] — Visual Studio Code',
        scmBadgeHtml: '<span class="vs-ab-badge">5</span>',
        primarySidebarTitle: 'SOURCE CONTROL',
        primarySidebarActionsHtml: sidebarActions(['check', 'refresh', 'ellipsis']),
        primarySidebarBodyHtml: scmBody,
        secondarySidebarTitle: '',
        secondarySidebarActionsHtml: '',
        secondarySidebarBodyHtml: '',
        tabListHtml: tabs,
        breadcrumbHtml: bc,
        gutterHtml: gutter(20),
        codeContentHtml: codeLines,
        minimapHtml: minimap(['kw','com','kw','var','var','del','del','add','empty','empty','del','del','del','add','add','empty','kw','kw','prop','empty']),
        panelTabsHtml: panelTabs,
        panelBodyHtml: panelBody,
        statusbarLeftHtml: sbLeft,
        statusbarRightHtml: sbRight
      }
    }]
  };

  writeFileSync(join(OUT_DIR, 'pr10d-vscode-scm-staged.scf.json'), JSON.stringify(probe, null, 2));
}

console.log('OK — wrote 4 PR 10d VSCode probes');
