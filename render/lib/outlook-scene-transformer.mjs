// OutlookScene PROP_TRANSFORMER — defaults + PII scrubber for Outlook chrome shell.
// Slot fields (eventCardHtml, viewBodyHtml, floatingTabsHtml, contextualTabs,
// rightHeaderSlot, toastTitle, toastBody) are filled by Wave B agents; this
// transformer only normalizes scaffolding props and runs the Contoso scrubber
// on every string field so author HTML cannot leak Microsoft PII into renders.

const VALID_VARIANTS = new Set([
  'mail-home', 'mail-view', 'mail-help',
  'compose-message', 'compose-format', 'compose-insert',
  'search', 'calendar-home', 'none',
]);

const VALID_RAILS = new Set([
  'mail', 'calendar', 'people', 'tasks', 'groups', 'apps',
]);

const VALID_THEMES = new Set(['light', 'dark']);
const VALID_TOAST_STATES = new Set(['hidden', 'visible']);

const CONTOSO_NAMES = [
  'Alex Chen', 'Jordan Park', 'Sam Rivera', 'Morgan Singh',
  'Casey Lee', 'Riley Brooks', 'Drew Patel',
];

const CONTOSO_MEETINGS = [
  'Q4 Roadmap Review', 'Design Critique',
  'Eng All-Hands', 'Architecture Sync',
];

// Names/aliases to scrub from demo content.
// Add your own team members' names here if distributing internally.
// Match is case-insensitive and word-bounded.
const MS_PERSON_PATTERNS = [
  // Example patterns — replace with your org's names if needed
  /\bJohn\s+Doe\b/gi,
  /\bjdoe\b/gi,
  /\bJane\s+Smith\b/gi,
];

// Repo paths that need rewriting — add your org-specific paths here.
const MS_PATH_PATTERNS = [
  // Example: [/\/src\/internal-project[^"\s'<>]*/g, '/src/contoso/checkout/platform'],
];

// Meeting/PR titles to scrub — add your org-specific titles here.
const MS_MEETING_PATTERNS = [
  // Example: /\bTeam Standup\b/gi,
];

// Stable hash so the same input string always maps to the same Contoso entry.
function stableIndex(seed, modulus) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulus;
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scrubText(s) {
  if (typeof s !== 'string' || !s) return s;
  let out = s;

  // 1. Email domain rewrite: anything @microsoft.com → @contoso.com
  out = out.replace(/@microsoft\.com\b/gi, '@contoso.com');

  // 2. Bare microsoft.com hostname mentions
  out = out.replace(/\bmicrosoft\.com\b/gi, 'contoso.com');

  // 3. Real-people names → Contoso roster (deterministic mapping)
  for (const pat of MS_PERSON_PATTERNS) {
    out = out.replace(pat, (m) => CONTOSO_NAMES[stableIndex(m.toLowerCase(), CONTOSO_NAMES.length)]);
  }

  // 4. File path rewrites
  for (const [pat, repl] of MS_PATH_PATTERNS) {
    out = out.replace(pat, repl);
  }

  // 5. Meeting / PR title rewrites
  for (const pat of MS_MEETING_PATTERNS) {
    out = out.replace(pat, (m) => CONTOSO_MEETINGS[stableIndex(m.toLowerCase(), CONTOSO_MEETINGS.length)]);
  }

  return out;
}

function recurseScrub(node) {
  if (node == null) return node;
  if (typeof node === 'string') return scrubText(node);
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = recurseScrub(node[i]);
    return node;
  }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) {
      node[k] = recurseScrub(node[k]);
    }
    return node;
  }
  return node;
}

// Slot fields the chrome template references; default to empty string so the
// renderer never leaks raw `{{{ }}}` placeholders into output.
const SLOT_DEFAULTS = {
  eventCardHtml: '',
  rightHeaderSlot: '',
  contextualTabs: '',
  viewBodyHtml: '',
  floatingTabsHtml: '',
  toastTitle: '',
  toastBody: '',
  searchPlaceholder: 'Search',
};

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function renderLegacyViewBody(props) {
  const currentFolder = scrubText(props.currentFolder || 'Inbox');
  const safeFolder = scrubText(currentFolder);
  const stepsHtml = hasText(props.stepsHtml) ? props.stepsHtml : '';
  const folders = [
    { name: 'Inbox', count: '12' },
    { name: 'Drafts', count: '3' },
    { name: 'Sent Items', count: '' },
    { name: 'Archive', count: '' },
  ];
  const folderRows = folders.map((folder) => {
    const active = folder.name.toLowerCase() === safeFolder.toLowerCase();
    const activeStyle = active ? 'background:#e5f1fb;color:#0f6cbd;font-weight:600;' : 'color:var(--ol-text-primary);';
    const count = folder.count ? `<span style="margin-left:auto;color:var(--ol-text-secondary);font-size:12px">${escapeHtml(folder.count)}</span>` : '';
    return `<div style="display:flex;align-items:center;gap:10px;height:32px;padding:0 12px;border-radius:4px;${activeStyle}"><span>${escapeHtml(folder.name)}</span>${count}</div>`;
  }).join('');
  return `<div class="ol-legacy-layout" style="position:relative;display:flex;height:100%;min-height:0;background:var(--ol-bg)">
    <aside class="ol-folders" style="width:240px;flex:0 0 240px;padding:12px 8px;border-right:1px solid var(--ol-divider);background:var(--ol-bg);box-sizing:border-box;display:flex;flex-direction:column;gap:4px">
      <div style="padding:4px 12px 8px;font-size:12px;font-weight:600;color:var(--ol-text-secondary)">Folders</div>
      ${folderRows}
    </aside>
    <section class="ol-msglist" style="width:360px;flex:0 0 360px;border-right:1px solid var(--ol-divider);background:var(--ol-surface);display:flex;flex-direction:column;min-width:0">
      <div style="display:flex;align-items:center;gap:18px;padding:14px 16px 10px;border-bottom:1px solid var(--ol-divider);font-size:14px"><span style="font-weight:600;color:var(--ol-text-primary);border-bottom:2px solid var(--ol-accent);padding-bottom:6px">Focused</span><span style="color:var(--ol-text-secondary)">Other</span></div>
      <div class="ol-msglist-items" style="flex:1 1 auto;overflow:hidden;padding:6px 0">${stepsHtml}</div>
    </section>
    <section style="flex:1 1 auto;min-width:0;background:var(--ol-surface);display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--ol-divider);font-size:13px;color:var(--ol-text-secondary)"><span>Reading pane</span><span>${escapeHtml(props.accountName || 'Contoso User')}</span></div>
      <div class="ol-reading-content" style="flex:1 1 auto;display:flex;align-items:center;justify-content:center;padding:24px;color:var(--ol-text-secondary);font-size:14px;text-align:center">Select a message to preview</div>
    </section>
    <div class="ol-compose-overlay" style="position:absolute;right:24px;bottom:0;width:520px;height:62%;background:var(--ol-surface);border:1px solid var(--ol-divider);border-radius:8px 8px 0 0;box-shadow:0 -8px 28px rgba(0,0,0,0.12);opacity:0;transform:translateY(100%);pointer-events:none;z-index:4;display:flex;align-items:center;justify-content:center;color:var(--ol-text-secondary);font-size:14px">Compose draft</div>
  </div>`;
}

export function transformOutlookScene(props /*, sceneCtx */) {
  if (!props || typeof props !== 'object') return;

  // ── 1. Validate enum-style props (throw early with useful message) ──
  if (props.ribbonVariant != null && !VALID_VARIANTS.has(props.ribbonVariant)) {
    throw new Error(
      `OutlookScene: invalid ribbonVariant "${props.ribbonVariant}". ` +
      `Valid: ${[...VALID_VARIANTS].join(', ')}`
    );
  }
  if (props.activeRail != null && !VALID_RAILS.has(props.activeRail)) {
    throw new Error(
      `OutlookScene: invalid activeRail "${props.activeRail}". ` +
      `Valid: ${[...VALID_RAILS].join(', ')}`
    );
  }
  if (props.theme != null && !VALID_THEMES.has(props.theme)) {
    throw new Error(
      `OutlookScene: invalid theme "${props.theme}". Valid: light, dark`
    );
  }
  if (props.toastState != null && !VALID_TOAST_STATES.has(props.toastState)) {
    throw new Error(
      `OutlookScene: invalid toastState "${props.toastState}". Valid: hidden, visible`
    );
  }

  // ── 2. Defaults ──
  if (!props.theme)         props.theme = 'light';
  if (!props.activeRail)    props.activeRail = 'mail';
  if (!props.ribbonVariant) props.ribbonVariant = 'mail-home';
  if (!props.toastState)    props.toastState = 'hidden';
  if (props.notifCount == null) props.notifCount = 9;
  if (!props.accountName)   props.accountName = CONTOSO_NAMES[0];
  if (!props.accountInitial) {
    props.accountInitial = (props.accountName || 'A').trim().charAt(0).toUpperCase();
  }

  // ── 3. Slot defaults (so template never emits literal `{{{ }}}`) ──
  for (const [k, v] of Object.entries(SLOT_DEFAULTS)) {
    if (typeof props[k] !== 'string') props[k] = v;
  }

  if (!hasText(props.viewBodyHtml) && hasText(props.stepsHtml)) {
    props.viewBodyHtml = renderLegacyViewBody(props);
  }
  if (!hasText(props.toastTitle) && hasText(props.stepsHtml) && /data-kind=\"send\"/i.test(props.stepsHtml)) {
    props.toastTitle = 'Message sent';
  }
  if (!hasText(props.toastBody) && hasText(props.stepsHtml) && /data-kind=\"send\"/i.test(props.stepsHtml)) {
    props.toastBody = 'Your email was sent successfully.';
  }

  // ── 4. PII scrub every string field (recursively) ──
  recurseScrub(props);

  // ── 5. Re-derive accountInitial after scrub in case the name changed ──
  if (typeof props.accountName === 'string' && props.accountName.length) {
    props.accountInitial = props.accountName.trim().charAt(0).toUpperCase();
  }
}

// Exported for unit tests
export const __test__ = {
  scrubText,
  recurseScrub,
  stableIndex,
  CONTOSO_NAMES,
  CONTOSO_MEETINGS,
  VALID_VARIANTS,
  VALID_RAILS,
};
