const DEFAULT_LINE_COUNT = 18;

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function makeStatusbarItems(text) {
  const parts = String(text || '')
    .split(/\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return '';
  return parts.map((part) => `<span class="vs-sb-item"><span>${escapeHtml(part)}</span></span>`).join('');
}

function makeLineNumbers(count) {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    return `<span class="vs-gutter-line">${index + 1}</span>`;
  }).join('');
}

function makeMinimap(count) {
  return Array.from({ length: Math.max(8, count) }, (_, index) => {
    const kind = index % 5 === 0 ? 'is-kw' : (index % 3 === 0 ? 'is-str' : (index % 2 === 0 ? 'is-com' : 'is-empty'));
    return `<div class="vs-minimap-row ${kind}"></div>`;
  }).join('');
}

function inferLineCount(stepsHtml) {
  if (!hasText(stepsHtml)) return DEFAULT_LINE_COUNT;
  const matches = stepsHtml.match(/class=\"vs-step\"/g);
  return Math.max(DEFAULT_LINE_COUNT, (matches ? matches.length : 0) + 6);
}

function makeTree(filename) {
  const safeFilename = escapeHtml(filename || 'app.ts');
  return [
    '<div class="vs-side-section"><span class="vs-side-section-title">WORKSPACE</span></div>',
    '<div class="vs-tree-row" style="padding-left:8px"><span class="vs-tree-chevron"></span><span class="vs-tree-icon"><svg width="16" height="16" aria-hidden="true"><use href="#vscode-icon-folder-open"/></svg></span><span class="vs-tree-label">src</span></div>',
    '<div class="vs-tree-row" style="padding-left:16px"><span class="vs-tree-chevron"></span><span class="vs-tree-icon"><svg width="16" height="16" aria-hidden="true"><use href="#vscode-icon-file-ts"/></svg></span><span class="vs-tree-label">index.ts</span></div>',
    `<div class="vs-tree-row is-active is-selected" style="padding-left:16px"><span class="vs-tree-chevron"></span><span class="vs-tree-icon"><svg width="16" height="16" aria-hidden="true"><use href="#vscode-icon-file-ts"/></svg></span><span class="vs-tree-label">${safeFilename}</span></div>`,
    '<div class="vs-tree-row" style="padding-left:8px"><span class="vs-tree-chevron"></span><span class="vs-tree-icon"><svg width="16" height="16" aria-hidden="true"><use href="#vscode-icon-folder"/></svg></span><span class="vs-tree-label">tests</span></div>',
    '<div class="vs-tree-row" style="padding-left:8px"><span class="vs-tree-chevron"></span><span class="vs-tree-icon"><svg width="16" height="16" aria-hidden="true"><use href="#vscode-icon-file-json"/></svg></span><span class="vs-tree-label">package.json</span></div>',
  ].join('');
}

function makeTab(filename) {
  const safeFilename = escapeHtml(filename || 'app.ts');
  return `<div class="vs-tab vs-tab--active"><span class="vs-tab-icon"><svg width="16" height="16" aria-hidden="true"><use href="#vscode-icon-file-ts"/></svg></span><span class="vs-tab-label">${safeFilename}</span><button class="vs-tab-close" aria-label="Close"><svg width="16" height="16" aria-hidden="true"><use href="#vscode-icon-close"/></svg></button></div>`;
}

function makeBreadcrumb(filename) {
  const safeFilename = escapeHtml(filename || 'app.ts');
  return `<span class="vs-bc-item"><span>src</span></span><span class="vs-bc-sep"><svg width="16" height="16" aria-hidden="true"><use href="#vscode-icon-chevron-right"/></svg></span><span class="vs-bc-item"><span>${safeFilename}</span></span>`;
}

function makeCodeContent(stepsHtml) {
  if (hasText(stepsHtml)) {
    return `<div class="vs-legacy-playback" style="position:relative;min-height:100%;padding:12px 0">${stepsHtml}</div>`;
  }
  return [
    '<span class="vs-code-line"><span style="color:#569cd6">const</span> <span style="color:#9cdcfe">main</span> = <span style="color:#dcdcaa">async</span> () =&gt; {</span>',
    '<span class="vs-code-line">  <span style="color:#9cdcfe">console</span>.<span style="color:#dcdcaa">log</span>(<span style="color:#ce9178">\'Legacy compatibility path active\'</span>);</span>',
    '<span class="vs-code-line">};</span>',
  ].join('');
}

export function transformVSCodeScene(props /*, sceneCtx */) {
  if (!props || typeof props !== 'object') return;

  const hasLegacyContract = hasText(props.stepsHtml) || hasText(props.filename) || hasText(props.statusbarText);
  if (!hasLegacyContract) return;

  const filename = props.filename || 'app.ts';
  const lineCount = inferLineCount(props.stepsHtml);

  if (!hasText(props.titlebarText)) props.titlebarText = `${filename} - Visual Studio Code`;
  if (!hasText(props.primarySidebarTitle)) props.primarySidebarTitle = 'EXPLORER';
  if (!hasText(props.primarySidebarBodyHtml)) props.primarySidebarBodyHtml = makeTree(filename);
  if (!hasText(props.tabListHtml)) props.tabListHtml = makeTab(filename);
  if (!hasText(props.breadcrumbHtml)) props.breadcrumbHtml = makeBreadcrumb(filename);
  if (!hasText(props.gutterHtml)) props.gutterHtml = makeLineNumbers(lineCount);
  if (!hasText(props.codeContentHtml)) props.codeContentHtml = makeCodeContent(props.stepsHtml);
  if (!hasText(props.minimapHtml)) props.minimapHtml = makeMinimap(lineCount);
  if (!hasText(props.statusbarRightHtml) && hasText(props.statusbarText)) {
    props.statusbarRightHtml = makeStatusbarItems(props.statusbarText);
  }
  if (!hasText(props.statusbarLeftHtml)) {
    props.statusbarLeftHtml = '<span class="vs-sb-item"><span>main</span></span>';
  }
  if (typeof props.showSecondary !== 'string') props.showSecondary = 'false';
  if (typeof props.showPanel !== 'string') props.showPanel = 'false';
  if (typeof props.showMinimap !== 'string') props.showMinimap = 'true';
  if (typeof props.showBreadcrumb !== 'string') props.showBreadcrumb = 'true';
  if (!hasText(props.activeActivity)) props.activeActivity = 'explorer';
  if (typeof props.primarySidebarActionsHtml !== 'string') props.primarySidebarActionsHtml = '';
  if (typeof props.secondarySidebarTitle !== 'string') props.secondarySidebarTitle = '';
  if (typeof props.secondarySidebarActionsHtml !== 'string') props.secondarySidebarActionsHtml = '';
  if (typeof props.secondarySidebarBodyHtml !== 'string') props.secondarySidebarBodyHtml = '';
  if (typeof props.panelTabsHtml !== 'string') props.panelTabsHtml = '';
  if (typeof props.panelBodyHtml !== 'string') props.panelBodyHtml = '';
  if (typeof props.scmBadgeHtml !== 'string') props.scmBadgeHtml = '';
}