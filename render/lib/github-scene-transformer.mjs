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

function renderRepoTabs(variant) {
  const activeClass = variant === 'pr-diff' ? ' gh-repo-tab--active' : '';
  const codeActive = variant === 'repo-home' ? ' gh-repo-tab--active' : '';
  return [
    `<div class="gh-repo-tab${codeActive}"><svg width="16" height="16" aria-hidden="true"><use href="#gh-icon-code"/></svg><span>Code</span></div>`,
    '<div class="gh-repo-tab"><svg width="16" height="16" aria-hidden="true"><use href="#gh-icon-issue-opened"/></svg><span>Issues</span><span class="gh-repo-tab-count">12</span></div>',
    `<div class="gh-repo-tab${activeClass}"><svg width="16" height="16" aria-hidden="true"><use href="#gh-icon-pull-request"/></svg><span>Pull requests</span><span class="gh-repo-tab-count">4</span></div>`,
    '<div class="gh-repo-tab"><svg width="16" height="16" aria-hidden="true"><use href="#gh-icon-play"/></svg><span>Actions</span></div>',
    '<div class="gh-repo-tab"><svg width="16" height="16" aria-hidden="true"><use href="#gh-icon-shield-check"/></svg><span>Security</span></div>',
  ].join('');
}

function renderLegacyPrBody(props) {
  const prTitle = escapeHtml(props.prTitle || 'Pull request');
  const prNumber = escapeHtml(props.prNumber || '');
  const branch = escapeHtml(props.branch || 'main');
  const stepsHtml = hasText(props.stepsHtml) ? props.stepsHtml : '<div class="gh-step" data-kind="pause" data-duration="0.6" style="display:none"></div>';
  return `<div class="gh-pr"><div class="gh-pr-head"><div class="gh-pr-title">${prTitle}<span class="gh-pr-num">#${prNumber}</span></div><div class="gh-pr-meta"><span class="gh-pr-status"><svg width="14" height="14" aria-hidden="true"><use href="#gh-icon-pull-request"/></svg><span>Open</span></span><span><strong style="color:var(--gh-text)">${escapeHtml(props.repoOwner || 'contoso')}</strong> proposes changes from <code style="background:rgba(175,184,193,0.2);padding:1px 6px;border-radius:3px;font-family:ui-monospace,monospace">${branch}</code></span></div></div><div class="gh-pr-files"><div class="gh-legacy-step-stack">${stepsHtml}</div></div></div>`;
}

export function transformGitHubScene(props /*, sceneCtx */) {
  if (!props || typeof props !== 'object') return;

  const hasLegacyContract = hasText(props.stepsHtml) || hasText(props.prTitle) || props.prNumber != null;
  if (!hasLegacyContract) return;

  if (!hasText(props.variant)) props.variant = 'pr-diff';
  if (!hasText(props.theme)) props.theme = 'light';
  if (!hasText(props.repoBranchHtml)) props.repoBranchHtml = props.branch || 'main';
  if (!hasText(props.watchersCount)) props.watchersCount = '24';
  if (!hasText(props.forksCount)) props.forksCount = '8';
  if (!hasText(props.starsCount)) props.starsCount = '128';
  if (!hasText(props.searchPlaceholder)) props.searchPlaceholder = 'Type / to search';
  if (!hasText(props.repoTabsHtml)) props.repoTabsHtml = renderRepoTabs(props.variant);
  if (!hasText(props.bodyHtml)) props.bodyHtml = renderLegacyPrBody(props);
  if (typeof props.footerStatusHtml !== 'string') props.footerStatusHtml = '';
}