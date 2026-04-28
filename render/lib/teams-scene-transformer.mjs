// TeamsScene PROP_TRANSFORMER — renders structured props into HTML slots
// (topBarHtml, railHtml, navigatorHtml, contentHtml) for the Teams chrome.
// Backward-compat: any *Html slot supplied by author wins.

// Fluent 2 system icons. Regular = 1.5px stroke, no fill. Filled = solid fill.
// Path data inspired by microsoft/fluentui-system-icons (MIT). Geometry kept
// simple so 1.5px strokes render crisply at 16-22px output sizes.
const ICONS = {
  // ───── Top bar (16px) ─────
  back:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg>',
  forward: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>',
  search:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"/><path d="m13.5 13.5-3.2-3.2"/></svg>',
  ellipsis:'<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.25"/><circle cx="8" cy="8" r="1.25"/><circle cx="12.5" cy="8" r="1.25"/></svg>',

  // ───── Left rail (24px viewBox, rendered ~22px) ─────
  sidebar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.25" y="4.5" width="17.5" height="15" rx="2.25"/><path d="M9 5v14"/></svg>',

  activity:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0-6 6v3.2c0 .53-.16 1.05-.45 1.49L4.2 15.5a1 1 0 0 0 .85 1.55h13.9a1 1 0 0 0 .85-1.55l-1.36-1.81a2.7 2.7 0 0 1-.44-1.5V9a6 6 0 0 0-6-6z"/><path d="M9.75 19a2.25 2.25 0 0 0 4.5 0"/></svg>',
  activityFill:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25a6.75 6.75 0 0 0-6.75 6.75v3.2c0 .47-.14.94-.4 1.32l-1.36 2.04A1.25 1.25 0 0 0 4.54 17.5h14.92a1.25 1.25 0 0 0 1.05-1.94l-1.36-2.04a2.4 2.4 0 0 1-.4-1.33V9A6.75 6.75 0 0 0 12 2.25zM9 19a3 3 0 0 0 6 0H9z"/></svg>',

  chat:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v8.5A2.75 2.75 0 0 1 18.25 18H13l-4.2 3.5a.5.5 0 0 1-.8-.4V18H5.75A2.75 2.75 0 0 1 3 15.25v-8.5A2.75 2.75 0 0 1 5.75 4z"/></svg>',
  chatFill:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v8.5A2.75 2.75 0 0 1 18.25 18H13.4l-4.6 3.83A.5.5 0 0 1 8 21.45V18H5.75A2.75 2.75 0 0 1 3 15.25v-8.5A2.75 2.75 0 0 1 5.75 4z"/></svg>',

  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.25" y="5" width="17.5" height="15.5" rx="2.25"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
  calFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 2.25a.75.75 0 0 1 .75.75V4h6.5V3a.75.75 0 0 1 1.5 0v1h.5A2.75 2.75 0 0 1 20 6.75V9H4V6.75A2.75 2.75 0 0 1 6.75 4h.5V3A.75.75 0 0 1 8 2.25zM4 10.5h16v7.75A2.75 2.75 0 0 1 17.25 21H6.75A2.75 2.75 0 0 1 4 18.25V10.5z"/></svg>',

  calls:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 4h2.86a1 1 0 0 1 .94.66l1.4 3.85a1 1 0 0 1-.42 1.18l-1.55.93a11.4 11.4 0 0 0 5.16 5.16l.93-1.55a1 1 0 0 1 1.18-.42l3.85 1.4a1 1 0 0 1 .66.94v2.86A1.97 1.97 0 0 1 18.5 21 16.5 16.5 0 0 1 3 5.5 1.5 1.5 0 0 1 5.5 4z"/></svg>',

  onedrive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.75 18A4.25 4.25 0 0 1 5.95 9.55a6 6 0 0 1 11.4-1.5A4.25 4.25 0 0 1 18.5 18z"/></svg>',

  // Communities: stylized "community badge" — house with people group inside, matching Fluent 2
  community:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 3.5 8v11a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V8z"/><circle cx="12" cy="11" r="1.75"/><path d="M9 17.5c0-1.5 1.35-2.5 3-2.5s3 1 3 2.5"/></svg>',

  add:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 8v8M8 12h8"/></svg>',

  // Apps: 3x3 rounded squares (Fluent grid)
  apps:    '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4.5" height="4.5" rx="1.25"/><rect x="9.75" y="3" width="4.5" height="4.5" rx="1.25"/><rect x="16.5" y="3" width="4.5" height="4.5" rx="1.25"/><rect x="3" y="9.75" width="4.5" height="4.5" rx="1.25"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1.25"/><rect x="16.5" y="9.75" width="4.5" height="4.5" rx="1.25"/><rect x="3" y="16.5" width="4.5" height="4.5" rx="1.25"/><rect x="9.75" y="16.5" width="4.5" height="4.5" rx="1.25"/><rect x="16.5" y="16.5" width="4.5" height="4.5" rx="1.25"/></svg>',

  // ───── Composer toolbar (16px) ─────
  bold:    '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.25 2.5h4.25a2.88 2.88 0 0 1 1.86 5.07A3.13 3.13 0 0 1 9 13.5H4.25a.75.75 0 0 1-.75-.75v-9.5a.75.75 0 0 1 .75-.75zM5 7h3.25a1.38 1.38 0 0 0 0-2.75H5V7zm0 5h3.75a1.5 1.5 0 0 0 0-3H5v3z"/></svg>',
  italic:  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 2.5a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-1.85L8.45 12.75H10a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1 0-1.5H6.6l1.95-9.5H7.25a.75.75 0 0 1-.75-.75z"/></svg>',
  underline:'<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.75 2a.75.75 0 0 1 .75.75v5.5a3.5 3.5 0 0 0 7 0v-5.5a.75.75 0 0 1 1.5 0v5.5a5 5 0 0 1-10 0v-5.5A.75.75 0 0 1 3.75 2zM3 13.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75z"/></svg>',
  attach:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7.5 7.5 13a3.5 3.5 0 0 1-5-5l6-6a2.5 2.5 0 0 1 3.5 3.5L6.5 11a1.5 1.5 0 0 1-2-2L9 4.5"/></svg>',
  emoji:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M5.75 9.75a3 3 0 0 0 4.5 0"/><circle cx="6" cy="6.75" r="0.55" fill="currentColor" stroke="none"/><circle cx="10" cy="6.75" r="0.55" fill="currentColor" stroke="none"/></svg>',
  send:    '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.72 2.04a.75.75 0 0 1 .8-.08l12 6a.75.75 0 0 1 0 1.34l-12 6a.75.75 0 0 1-1.05-.86l1.34-4.45a.5.5 0 0 1 .39-.35l5.6-.95a.25.25 0 0 0 0-.49l-5.6-.95a.5.5 0 0 1-.39-.35L1.47 2.9a.75.75 0 0 1 .25-.86z"/></svg>',

  // ───── Meet now / video camera (16px filled) ─────
  meetnow: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 4A1.5 1.5 0 0 0 1 5.5v5A1.5 1.5 0 0 0 2.5 12h7A1.5 1.5 0 0 0 11 10.5v-5A1.5 1.5 0 0 0 9.5 4h-7zm12.13.07A.5.5 0 0 1 15 4.5v7a.5.5 0 0 1-.83.37L12 10v-4l2.17-1.93a.5.5 0 0 1 .46-.07z"/></svg>',

  // ───── Activity / message actions (16px) ─────
  reply:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3 2.5 7l4 4M2.5 7H10a4 4 0 0 1 4 4v2"/></svg>',
  mention: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M10.5 8v1.25a1.75 1.75 0 0 0 3.5 0V8a6 6 0 1 0-2.5 4.87"/></svg>',

  // ───── Shared files (16px) ─────
  filter:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5h11l-4.25 5.5v3.5l-2.5 1.5V9z"/></svg>',
  upload:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11V3m0 0L4.75 6.25M8 3l3.25 3.25M3 13h10"/></svg>',
  pinned:  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M10.45 1.61a.75.75 0 0 1 1.06 0l2.88 2.88a.75.75 0 0 1 0 1.06l-1.7 1.7-1.46.4-3.13 3.13L8.5 12.6 5.4 9.5l1.82-.6 3.13-3.13.4-1.46 1.7-1.7zM4.7 10.2l1.1 1.1L2.5 14.5l-.78-.78L4.7 10.2z"/></svg>',

  // ───── Additions: useful in chrome (referenced or queued for use) ─────
  // Members count / people (24px)
  people:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.25"/><path d="M3.75 18.5c0-2.9 2.35-5.25 5.25-5.25s5.25 2.35 5.25 5.25"/><circle cx="17" cy="9.75" r="2.5"/><path d="M15 13.5h2c1.93 0 3.5 1.57 3.5 3.5"/></svg>',
  // Member-list view (16px)
  list:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="3" cy="4" r="0.75" fill="currentColor"/><circle cx="3" cy="8" r="0.75" fill="currentColor"/><circle cx="3" cy="12" r="0.75" fill="currentColor"/><path d="M6 4h8M6 8h8M6 12h8"/></svg>',
  // Sync / refresh (16px)
  sync:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5a5.5 5.5 0 0 1 9.4-3.9L13.5 5"/><path d="M13.5 2.5V5h-2.5"/><path d="M13.5 8.5a5.5 5.5 0 0 1-9.4 3.9L2.5 11"/><path d="M2.5 13.5V11H5"/></svg>',
  // Inline video-message marker (16px) used in chat-row "meeting ended" indicators
  videoMsg:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="4" width="9" height="8" rx="1.5"/><path d="M10.5 7.5 14 5.5v5L10.5 8.5z"/></svg>',
  // Add-reaction smiley with plus (16px)
  addReaction:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8a6 6 0 1 1-6-6"/><path d="M5.75 9.75a3 3 0 0 0 4.5 0"/><circle cx="6" cy="6.75" r="0.55" fill="currentColor" stroke="none"/><circle cx="10" cy="6.75" r="0.55" fill="currentColor" stroke="none"/><path d="M13 1.5v3M11.5 3h3"/></svg>',
  // Recent / clock (16px)
  recent:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.25 1.5"/></svg>',
  // Chain link (16px)
  links:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5a2.5 2.5 0 0 0 3.54 0l2-2a2.5 2.5 0 0 0-3.54-3.54l-.7.7"/><path d="M9.5 6.5a2.5 2.5 0 0 0-3.54 0l-2 2a2.5 2.5 0 0 0 3.54 3.54l.7-.7"/></svg>',
  // Document (16px)
  file:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 2h6l3 3v9a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M9.5 2v3h3"/></svg>',
  // Microphone (16px)
  mic:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="4" height="8" rx="2"/><path d="M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5V14"/></svg>',
  // Copilot wand sparkle (16px)
  copilot: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 2 8.6 4.6 6 5.5l2.6.9.9 2.6.9-2.6L13 5.5l-2.6-.9zM4.5 8 4 9.5 2.5 10l1.5.5.5 1.5.5-1.5L6.5 10 5 9.5zM10 11l-.6 1.6L7.8 13l1.6.6.6 1.4.6-1.4 1.4-.6-1.4-.6z"/></svg>',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name, max = 2) {
  if (!name) return '?';
  return String(name).trim().split(/\s+/).slice(0, max).map(p => p[0] || '').join('').toUpperCase();
}

// ───── Top app bar ─────
function renderTopBar(props) {
  const tb = props.topBar || {};
  const workspace = tb.workspace || { letter: 'M', label: 'Microsoft Teams' };
  const pill = tb.optimizedPill !== false ? `<div class="tm-pill">${esc(tb.optimizedPillLabel || 'Premium')}</div>` : '';
  const user = tb.user || { name: 'Megan Bowen', status: 'online' };
  const avatarInitials = initials(user.name);
  const status = esc(user.status || 'online');
  return `
    <div class="tm-workspace">
      <div class="tm-ws-letter">${esc(workspace.letter || 'M')}</div>
      <span>${esc(workspace.label || 'Microsoft Teams')}</span>
    </div>
    ${pill}
    <div class="tm-nav-arrows">${ICONS.back}${ICONS.forward}</div>
    <div class="tm-search">${ICONS.search}<span>${esc(tb.searchPlaceholder || 'Search (Ctrl+E)')}</span></div>
    <div class="tm-topbar-right">
      <div class="tm-topbar-icon">${ICONS.ellipsis}</div>
      <div class="tm-avatar">${esc(avatarInitials)}<div class="tm-presence" data-status="${status}"></div></div>
      <div class="tm-win-controls">
        <div class="tm-wc">─</div><div class="tm-wc">▢</div><div class="tm-wc">✕</div>
      </div>
    </div>`;
}

// ───── Left rail ─────
// Teams 2025 IA: 48px rail, no sidebar toggle (that lives in the top bar).
// Order matches the public Teams client: Activity, Chat, Teams, Calendar,
// Calls, OneDrive, More (overflow), Apps. Optional 10-11px label under each
// icon when rail.showLabels === true. iconActive provides Fluent 2 filled
// variant for the selected item.
const RAIL_DEFAULTS = [
  { id: 'activity', icon: 'activity', iconActive: 'activityFill', label: 'Activity' },
  { id: 'chat',     icon: 'chat',     iconActive: 'chatFill',     label: 'Chat' },
  { id: 'teams',    icon: 'community',                            label: 'Teams' },
  { id: 'calendar', icon: 'calendar', iconActive: 'calFill',      label: 'Calendar' },
  { id: 'calls',    icon: 'calls',                                label: 'Calls' },
  { id: 'onedrive', icon: 'onedrive',                             label: 'OneDrive' },
  { id: 'more',     icon: 'ellipsis',                             label: 'More' },
  { id: 'apps',     icon: 'apps',                                 label: 'Apps' },
];

const VIEW_TO_RAIL_ID = {
  chat:         'chat',
  channel_post: 'teams',
  calendar:     'calendar',
  activity:     'activity',
  shared:       'chat',
};

function renderRail(props) {
  const rail = props.rail || {};
  const items = Array.isArray(rail.items) ? rail.items : RAIL_DEFAULTS;
  const view = props.view || 'chat';
  const activeId = rail.active || VIEW_TO_RAIL_ID[view] || 'chat';
  const badges = rail.badges || (view === 'chat' ? { chat: '15' } : {});
  const showLabels = rail.showLabels === true;
  return items.map(it => {
    const isActive = it.id === activeId;
    const iconKey = isActive && it.iconActive ? it.iconActive : it.icon;
    const icon = ICONS[iconKey] || ICONS.chat;
    const badgeVal = badges[it.id];
    const badge = (badgeVal !== undefined && badgeVal !== null && badgeVal !== '')
      ? `<div class="tm-rail-badge">${esc(badgeVal)}</div>`
      : '';
    const label = (showLabels && it.label)
      ? `<div class="tm-rail-label">${esc(it.label)}</div>`
      : '';
    return `<div class="tm-rail-item" data-rail-id="${esc(it.id)}" data-active="${isActive}">${icon}${label}${badge}</div>`;
  }).join('');
}

// ───── Middle navigator ─────
// Teams 2025: 260px column. Header is title + small icon-button row whose
// contents vary by view. Optional search box (opt-in) sits beneath the
// header. List rows are tighter (~36px) for plain lists; chat threads with
// previews stay taller (~56px) — handled in CSS via data-has-preview.
const NAV_DEFAULT_ACTIONS = {
  chat:         ['ellipsis', 'search', 'add'],
  channel_post: ['ellipsis', 'search', 'add'],
  calendar:     ['ellipsis'],
  activity:     ['ellipsis', 'search'],
  shared:       ['ellipsis', 'search', 'add'],
};

function _navHeaderActionsHtml(view, nav) {
  const explicit = Array.isArray(nav.actions) ? nav.actions : null;
  const keys = explicit || NAV_DEFAULT_ACTIONS[view] || NAV_DEFAULT_ACTIONS.chat;
  return keys.map(k => {
    const ic = ICONS[k] || '';
    return ic ? `<div class="tm-nav-action-btn" data-action="${esc(k)}">${ic}</div>` : '';
  }).join('');
}

function renderNavigator(props) {
  const nav = props.navigator || {};
  const view = props.view || 'chat';
  const title = esc(nav.title || (
    view === 'calendar'     ? 'Calendar' :
    view === 'activity'     ? 'Activity' :
    view === 'channel_post' ? 'Teams'    :
    'Chat'
  ));
  const headerActions = `<div class="tm-nav-header-actions">${_navHeaderActionsHtml(view, nav)}</div>`;
  const header = `<div class="tm-nav-header"><span>${title}</span>${headerActions}</div>`;

  // Optional search box (opt-in). Default: no search (matches Teams 2025
  // screenshots where global search lives in the top bar). Authors can
  // enable it via nav.searchBox=true or nav.searchPlaceholder='...'.
  const wantsSearch = nav.searchBox === true || typeof nav.searchPlaceholder === 'string';
  const searchBox = wantsSearch
    ? `<div class="tm-nav-search">${ICONS.search}<span>${esc(nav.searchPlaceholder || 'Search')}</span></div>`
    : '';

  // Calendar view: render mini-calendar instead of sections
  if (view === 'calendar') {
    return header + searchBox + renderMiniCalendar(nav.miniCalendar || {});
  }

  // Activity view: filters now live in the content header; nav stays minimal
  if (view === 'activity') {
    return header + searchBox + `<div class="tm-nav-section"><div class="tm-nav-section-header">Filter</div></div>`;
  }

  const sections = Array.isArray(nav.sections) ? nav.sections : [];
  const selectedId = nav.selectedItemId || '';
  const sectionsHtml = sections.map(sec => {
    const items = (sec.items || []).map(it => renderNavItem(it, selectedId)).join('');
    const labelHtml = sec.label
      ? `<div class="tm-nav-section-header"><svg class="tm-nav-section-chevron" viewBox="0 0 12 12" fill="currentColor"><path d="M3 4.5 6 7.5 9 4.5z"/></svg>${esc(sec.label)}</div>`
      : '';
    return `<div class="tm-nav-section">
      ${labelHtml}
      <div class="tm-nav-list">${items}</div>
    </div>`;
  }).join('');
  return header + searchBox + sectionsHtml;
}

function renderNavItem(it, selectedId) {
  const selected = it.id && it.id === selectedId ? 'true' : 'false';
  const unread = it.unread ? 'true' : 'false';
  const status = esc(it.status || 'online');
  const kind = esc(it.kind || '');
  const hasPreview = it.preview ? 'true' : 'false';
  const presence = it.kind === 'channel' ? '' : `<div class="tm-presence-sm" data-status="${status}"></div>`;
  const avatar = it.iconLetter
    ? `<div class="tm-nav-avatar" style="background:${esc(it.iconColor || '#5B5FC7')}">${esc(it.iconLetter)}${presence}</div>`
    : `<div class="tm-nav-avatar">${esc(initials(it.title))}${presence}</div>`;
  const time = it.time ? `<span class="tm-nav-item-time">${esc(it.time)}</span>` : '';
  const preview = it.preview ? `<div class="tm-nav-item-preview">${esc(it.preview)}</div>` : '';
  const unreadBadge = it.unreadCount ? `<span class="tm-nav-unread-badge">${esc(it.unreadCount)}</span>` : '';
  return `<div class="tm-nav-item" data-item-id="${esc(it.id || '')}" data-selected="${selected}" data-unread="${unread}" data-kind="${kind}" data-has-preview="${hasPreview}">
    ${avatar}
    <div class="tm-nav-item-body">
      <div class="tm-nav-item-row1">
        <span class="tm-nav-item-title">${esc(it.title || '')}</span>
        ${time}
      </div>
      ${preview}
    </div>
    ${unreadBadge}
  </div>`;
}

function renderMiniCalendar(mc) {
  // Lightweight 6×7 mini-cal for nav. Pure visual; not interactive.
  const month = esc(mc.month || 'November 2025');
  const today = Number(mc.todayDom || 6);
  const startOffset = Number(mc.startOffset || 6); // 0=Mon
  // Build 42 cells
  const cells = [];
  let dom = 1 - startOffset;
  for (let i = 0; i < 42; i++) {
    const inMonth = dom >= 1 && dom <= 30;
    const isToday = inMonth && dom === today;
    const cls = isToday ? 'background:var(--tm-accent);color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center'
                       : (inMonth ? 'color:var(--tm-text-1)' : 'color:var(--tm-text-3)');
    cells.push(`<div style="width:32px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px"><span style="${cls}">${inMonth ? dom : (dom < 1 ? 30 + dom : dom - 30)}</span></div>`);
    dom++;
  }
  return `<div style="padding:8px 16px 16px">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:13px;font-weight:600;color:var(--tm-text-1)">
      <span>${month}</span>
      <span style="color:var(--tm-text-2)">‹ ›</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0;font-size:11px;color:var(--tm-text-2);text-align:center;padding:4px 0">
      <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr)">${cells.join('')}</div>
  </div>`;
}

// ───── Content header ─────
// View-specific chrome to match Teams 2025:
//   chat    → round avatar + name + presence dot + tabs + right icons
//   channel → square icon + # prefix + tabs + meet/ellipsis
//   activity→ title + filter chips (selected = filled accent pill)
//   shared  → title + tab pills + Sort/View/Upload + accent "+ New"
// Generic kind (or unknown view) falls back to the chat variant which is
// the closest match to the legacy generic header.
function _hdrIconBtn(iconKey) {
  const ic = ICONS[iconKey];
  if (!ic) return '';
  return `<div class="tm-header-icon-btn" data-icon="${esc(iconKey)}">${ic}</div>`;
}

function _hdrTextBtn(iconKey, label) {
  const ic = ICONS[iconKey] || '';
  return `<div class="tm-header-text-btn">${ic}<span>${esc(label)}</span></div>`;
}

function _hdrAccentBtn(iconKey, label) {
  const ic = ICONS[iconKey] || '';
  return `<div class="tm-header-accent-btn">${ic}<span>${esc(label)}</span></div>`;
}

function _renderActions(actions) {
  return (actions || []).map(a => {
    if (typeof a === 'string') return _hdrIconBtn(a);
    if (!a) return '';
    if (a.kind === 'accent') return _hdrAccentBtn(a.icon, a.label || '');
    if (a.kind === 'text')   return _hdrTextBtn(a.icon, a.label || '');
    return _hdrIconBtn(a.icon || 'ellipsis');
  }).join('');
}

function _renderTabs(tabs) {
  return (tabs || []).map(t =>
    `<div class="tm-tab" data-active="${t.active ? 'true' : 'false'}">${esc(t.label)}</div>`
  ).join('');
}

function _renderPillTabs(tabs) {
  return (tabs || []).map(t =>
    `<div class="tm-pill-tab" data-active="${t.active ? 'true' : 'false'}">${esc(t.label)}</div>`
  ).join('');
}

function _renderChatHeader(ch) {
  const iconBg = esc(ch.iconColor || '#5B5FC7');
  const iconLabel = esc(ch.iconLetter || initials(ch.title || 'C'));
  const presenceStatus = esc(ch.status || 'online');
  const title = esc(ch.title || '');
  const sens = ch.sensitivityLabel ? `<div class="tm-sensitivity">🔒 ${esc(ch.sensitivityLabel)}</div>` : '';
  const tabs = (ch.tabs && ch.tabs.length) ? ch.tabs : [
    { label: 'Chat', active: true },
    { label: 'Files' },
    { label: 'Photos' },
    { label: 'Apps' },
  ];
  const actions = ch.actions || ['meetnow', 'calls', 'add', 'ellipsis'];
  return `<div class="tm-content-header" data-kind="chat">
    <div class="tm-content-icon" style="background:${iconBg}">${iconLabel}<div class="tm-presence-sm" data-status="${presenceStatus}"></div></div>
    <div class="tm-content-title">${title}</div>
    ${sens}
    <div class="tm-tabs">${_renderTabs(tabs)}</div>
    <div class="tm-header-actions">${_renderActions(actions)}</div>
  </div>`;
}

function _renderChannelHeader(ch) {
  const iconBg = esc(ch.iconColor || '#5B5FC7');
  const iconLabel = esc(ch.iconLetter || initials(ch.title || 'C'));
  const title = esc(ch.title || '');
  const sens = ch.sensitivityLabel ? `<div class="tm-sensitivity">🔒 ${esc(ch.sensitivityLabel)}</div>` : '';
  const tabs = (ch.tabs && ch.tabs.length) ? ch.tabs : [
    { label: 'Posts', active: true },
    { label: 'Files' },
    { label: 'Notes' },
  ];
  const pinned = ch.pinnedTabsCount ? `<div class="tm-tab-pinned">+${esc(ch.pinnedTabsCount)}</div>` : '';
  const join = ch.showJoinButton ? `<div class="tm-join-btn">${ICONS.meetnow}<span>Join</span></div>` : '';
  const actions = ch.actions || ['people', 'meetnow', 'ellipsis'];
  return `<div class="tm-content-header" data-kind="channel">
    <div class="tm-content-icon" style="background:${iconBg}">${iconLabel}</div>
    <div class="tm-content-title"><span class="tm-channel-prefix">#</span>${title}</div>
    ${sens}
    <div class="tm-tabs">${_renderTabs(tabs)}${pinned}</div>
    <div class="tm-header-actions">${join}${_renderActions(actions)}</div>
  </div>`;
}

function _renderActivityHeader(ch) {
  const title = esc(ch.title || 'Activity');
  const filters = (ch.filters && ch.filters.length) ? ch.filters : [
    { label: 'All', active: true },
    { label: '@Mentions' },
    { label: 'Replies' },
    { label: 'Reactions' },
    { label: 'Missed call' },
    { label: 'Apps' },
  ];
  const chips = filters.map(f =>
    `<div class="tm-chip" data-active="${f.active ? 'true' : 'false'}">${esc(f.label)}</div>`
  ).join('');
  const actions = ch.actions || ['ellipsis', 'search'];
  return `<div class="tm-content-header" data-kind="activity">
    <div class="tm-content-title">${title}</div>
    <div class="tm-activity-chips">${chips}</div>
    <div class="tm-header-actions">${_renderActions(actions)}</div>
  </div>`;
}

function _renderSharedHeader(ch) {
  const title = esc(ch.title || 'Files');
  const tabs = (ch.tabs && ch.tabs.length) ? ch.tabs : [
    { label: 'Files', active: true },
    { label: 'Links' },
    { label: 'Recent' },
  ];
  const actions = ch.actions || [
    { kind: 'text',   icon: 'filter', label: 'Sort'   },
    { kind: 'text',   icon: 'list',   label: 'View'   },
    { kind: 'text',   icon: 'upload', label: 'Upload' },
    { kind: 'accent', icon: 'add',    label: 'New'    },
  ];
  return `<div class="tm-content-header" data-kind="shared">
    <div class="tm-content-title">${title}</div>
    <div class="tm-shared-tabs">${_renderPillTabs(tabs)}</div>
    <div class="tm-header-actions">${_renderActions(actions)}</div>
  </div>`;
}

const VIEW_TO_HEADER_KIND = {
  chat:         'chat',
  channel_post: 'channel',
  activity:     'activity',
  shared:       'shared',
  calendar:     'calendar',
};

function renderContentHeader(props) {
  const ch = props.contentHeader || {};
  if (ch.hidden) return '';
  const view = props.view || 'chat';
  const kind = ch.kind || VIEW_TO_HEADER_KIND[view] || 'chat';
  if (kind === 'activity') return _renderActivityHeader(ch);
  if (kind === 'shared')   return _renderSharedHeader(ch);
  if (kind === 'channel')  return _renderChannelHeader(ch);
  // Calendar header is owned by renderCalendarContent's toolbar; if a caller
  // asks for it here, render the chat variant as a sensible fallback.
  return _renderChatHeader(ch);
}

// ───── Step rendering (chat/channel messages, etc.) ─────
function renderSteps(steps) {
  if (!Array.isArray(steps)) return '';
  let lastAuthor = null;
  return steps.map((s, idx) => {
    const rawKind = s.kind || 'message';
    const kind = rawKind === 'chat_message' ? 'message' : rawKind;
    const id = esc(s.id || `step-${idx}`);
    const stepAttrs = `class="tm-step" data-kind="${esc(kind)}" data-step-id="${id}"`;

    if (kind === 'pause') {
      return `<div ${stepAttrs} data-duration="${esc(s.duration || 1)}"></div>`;
    }
    if (kind === 'date_divider') {
      lastAuthor = null;
      return `<div ${stepAttrs} class="tm-step tm-date-divider">${esc(s.label || 'Today')}</div>`;
    }
    if (kind === 'message' || kind === 'message_with_quote') {
      const author = esc(s.author || '');
      const continuation = author === lastAuthor ? 'true' : 'false';
      lastAuthor = author;
      const time = esc(s.time || '');
      const status = esc(s.status || 'online');
      const avatarColor = esc(s.avatarColor || '#5B5FC7');
      const text = renderMessageText(s.text || '');
      const quote = (kind === 'message_with_quote' && s.quote)
        ? `<div class="tm-msg-quote"><span class="tm-msg-quote-author">${esc(s.quote.author || '')}</span>${esc(s.quote.text || '')}</div>`
        : '';
      const reactions = renderReactions(s.reactions);
      const file = s.file ? renderFileAttachment(s.file) : '';
      return `<div ${stepAttrs} class="tm-step tm-msg" data-continuation="${continuation}">
        <div class="tm-msg-avatar" style="background:${avatarColor}">${esc(initials(author))}<div class="tm-presence-sm" data-status="${status}"></div></div>
        <div class="tm-msg-body">
          <div class="tm-msg-meta"><span class="tm-msg-author">${author}</span><span class="tm-msg-time">${time}</span></div>
          <div class="tm-msg-bubble">${quote}${text}${file}</div>
          ${reactions}
        </div>
      </div>`;
    }
    if (kind === 'reaction') {
      // Adds a reaction to a previous message; rendered as a no-op step (animation handles attaching)
      return `<div ${stepAttrs} data-target="${esc(s.targetStepId || '')}" data-emoji="${esc(s.emoji || '👍')}" data-from="${esc(s.from || '')}"></div>`;
    }
    if (kind === 'file_link') {
      return `<div ${stepAttrs} class="tm-step tm-msg">
        <div class="tm-msg-avatar">${esc(initials(s.author || 'C'))}</div>
        <div class="tm-msg-body">
          <div class="tm-msg-meta"><span class="tm-msg-author">${esc(s.author || '')}</span><span class="tm-msg-time">${esc(s.time || '')}</span></div>
          ${renderFileAttachment(s.file || {})}
        </div>
      </div>`;
    }
    if (kind === 'activity_item') {
      const icon = ICONS[s.iconKey] || ICONS.mention;
      return `<div ${stepAttrs} class="tm-step tm-activity-item">
        <div class="tm-activity-icon">${icon}</div>
        <div class="tm-activity-body">
          <div class="tm-activity-meta"><span><span class="tm-activity-actor">${esc(s.actor || '')}</span> ${esc(s.action || '')}</span><span class="tm-activity-time">${esc(s.time || '')}</span></div>
          <div class="tm-activity-preview">${esc(s.preview || '')}</div>
          <div class="tm-activity-source">${esc(s.source || '')}</div>
        </div>
      </div>`;
    }
    return `<div ${stepAttrs}></div>`;
  }).join('');
}

function renderMessageText(text) {
  // Replace @Name tokens with mention chips. Pre-escape the rest.
  const escaped = esc(text);
  return escaped.replace(/@([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g, '<span class="tm-mention">@$1</span>');
}

function renderReactions(rxs) {
  if (!Array.isArray(rxs) || rxs.length === 0) return '';
  const pills = rxs.map(r => `<span class="tm-reaction-pill">${esc(r.emoji || '👍')}<span>${esc(r.count || 1)}</span></span>`).join('');
  return `<div class="tm-msg-reactions">${pills}<span class="tm-reaction-add">+</span></div>`;
}

function renderFileAttachment(f) {
  const ext = (f.type || (f.name || '').split('.').pop() || 'docx').toLowerCase();
  const label = esc(ext.toUpperCase().slice(0, 4));
  return `<div class="tm-msg-file">
    <div class="tm-msg-file-icon" data-type="${esc(ext)}">${label}</div>
    <div class="tm-msg-file-meta">
      <div class="tm-msg-file-name">${esc(f.name || 'file')}</div>
      <div class="tm-msg-file-sub">${esc(f.sub || (f.size || ''))}</div>
    </div>
  </div>`;
}

// ───── Composer ─────
function renderComposer(props) {
  const c = props.composer || {};
  if (c.hidden) return '';
  const placeholder = esc(c.placeholder || 'Type a message');
  return `<div class="tm-composer-wrap">
    <div class="tm-composer">
      <div class="tm-composer-toolbar">
        ${ICONS.bold}${ICONS.italic}${ICONS.underline}<div class="tm-divider-v"></div>${ICONS.attach}${ICONS.emoji}
      </div>
      <div class="tm-composer-input">${placeholder}</div>
      <div class="tm-composer-actions">
        ${ICONS.attach}${ICONS.emoji}
        <div class="tm-composer-send">${ICONS.send}</div>
      </div>
    </div>
  </div>`;
}

// ───── View renderers ─────
function renderChatContent(props, stepsHtml) {
  const header = renderContentHeader(props);
  return `${header}
    <div class="tm-msg-area">${stepsHtml}</div>
    ${renderComposer(props)}`;
}

// ───── Channel posts (cards, not chat bubbles) ─────
// Channel posts are CARDs: header (avatar + author + role + time), optional
// pinned badge, optional announcement banner, subject line, body, attachments,
// reactions row, and a reply thread. Top-level grouping rules:
//   • A step with `parentId` (or kind:'reply') referencing a known post → reply
//     nested under that post.
//   • Anything else → a top-level post card.
//   • date_divider steps are emitted between cards.
//   • Reactions (kind:'reaction' targetStepId:X) were already absorbed by
//     normalizeReactions into the target's reactions[] array — they'll appear
//     in the right card automatically.
function renderChannelContent(props /* stepsHtml unused — channel re-walks steps */) {
  const header = renderContentHeader(props);
  const groups = groupChannelPosts(Array.isArray(props.steps) ? props.steps : []);
  const feedHtml = groups.map(g => g.type === 'divider'
    ? `<div class="tm-step tm-ch-divider" data-kind="date_divider" data-step-id="${esc(g.raw.id || '')}"><span>${esc(g.label)}</span></div>`
    : renderChannelPost(g.post)
  ).join('');
  return `${header}
    <div class="tm-ch-feed">${feedHtml}</div>
    ${renderComposer(props)}`;
}

function groupChannelPosts(steps) {
  const postById = new Map();
  const order = [];
  for (const s of steps) {
    if (!s) continue;
    const k = s.kind || 'message';
    if (k === 'pause') continue;
    if (k === 'date_divider') {
      order.push({ type: 'divider', label: s.label || 'Today', raw: s });
      continue;
    }
    // Reply attachment: explicit kind:'reply' OR parentId pointing to a known post
    const parentId = s.parentId || s.replyTo || (k === 'reply' ? s.targetPostId : null);
    if (parentId && postById.has(parentId)) {
      postById.get(parentId).replies.push(s);
      continue;
    }
    // Top-level post
    const post = { ...s, replies: Array.isArray(s.replies) ? s.replies.slice() : [] };
    if (s.id) postById.set(s.id, post);
    order.push({ type: 'post', post });
  }
  return order;
}

function renderChannelPost(p) {
  const id = esc(p.id || '');
  const kind = esc(p.kind || 'message');
  const isPinned = p.pinned === true;
  const isAnnouncement = p.announcement === true || !!p.announcementTitle;
  const dataAttrs = `data-step-id="${id}" data-kind="${kind}" data-pinned="${isPinned}" data-announcement="${isAnnouncement}"`;

  const pinnedBadge = isPinned
    ? `<div class="tm-ch-pinned-badge">${ICONS.pinned}<span>Pinned</span></div>`
    : '';

  const announceBanner = isAnnouncement
    ? `<div class="tm-ch-announce-banner" style="${p.announcementColor ? `--tm-ch-accent:${esc(p.announcementColor)}` : ''}">
        <div class="tm-ch-announce-eyebrow">Announcement</div>
        <div class="tm-ch-announce-title">${esc(p.announcementTitle || p.subject || '')}</div>
        ${p.announcementSub ? `<div class="tm-ch-announce-sub">${esc(p.announcementSub)}</div>` : ''}
      </div>`
    : '';

  const author = esc(p.author || '');
  const status = esc(p.status || 'online');
  const avatarColor = esc(p.avatarColor || '#5B5FC7');
  const role = p.role ? esc(p.role) : '';
  const team = p.team ? esc(p.team) : '';
  const subParts = [role, team].filter(Boolean).join(' · ');
  const sub = subParts ? `<div class="tm-ch-author-sub">${subParts}</div>` : '';
  const time = esc(p.time || '');

  const head = `<div class="tm-ch-post-head">
    <div class="tm-ch-avatar" style="background:${avatarColor}">${esc(initials(author))}<div class="tm-presence-sm" data-status="${status}"></div></div>
    <div class="tm-ch-author-block">
      <div class="tm-ch-author">${author}</div>
      ${sub}
    </div>
    <div class="tm-ch-post-time">${time}</div>
    <div class="tm-ch-post-more">${ICONS.ellipsis}</div>
  </div>`;

  // Subject — only when not already shown in announcement banner
  const subject = (p.subject && !isAnnouncement)
    ? `<div class="tm-ch-subject">${esc(p.subject)}</div>`
    : '';

  // Body: support text + quote (from message_with_quote), and the legacy
  // file_link variant which has no text but a single file.
  const quote = (p.kind === 'message_with_quote' && p.quote)
    ? `<div class="tm-msg-quote"><span class="tm-msg-quote-author">${esc(p.quote.author || '')}</span>${esc(p.quote.text || '')}</div>`
    : '';
  const text = p.text ? `<div class="tm-ch-body">${renderMessageText(p.text)}</div>` : '';

  // Attachments: prefer attachments[] array, fall back to single .file
  const attachItems = Array.isArray(p.attachments)
    ? p.attachments
    : (p.file ? [p.file] : []);
  const attachments = attachItems.length
    ? `<div class="tm-ch-attachments">${attachItems.map(renderPostAttachment).join('')}</div>`
    : '';

  const reactions = renderPostReactions(p.reactions);
  const replies = renderPostReplies(p.replies || []);

  return `<div class="tm-step tm-ch-card" ${dataAttrs}>
    ${pinnedBadge}
    ${announceBanner}
    ${head}
    ${subject}
    ${quote}
    ${text}
    ${attachments}
    ${reactions}
    ${replies}
  </div>`;
}

function renderPostAttachment(f) {
  const ext = (f.type || (f.name || '').split('.').pop() || 'docx').toLowerCase();
  const label = esc(ext.toUpperCase().slice(0, 4));
  return `<div class="tm-ch-file-chip" data-type="${esc(ext)}">
    <div class="tm-ch-file-chip-icon">${label}</div>
    <div class="tm-ch-file-chip-meta">
      <div class="tm-ch-file-chip-name">${esc(f.name || 'file')}</div>
      <div class="tm-ch-file-chip-sub">${esc(f.sub || f.size || '')}</div>
    </div>
  </div>`;
}

function renderPostReactions(rxs) {
  const pills = (Array.isArray(rxs) && rxs.length)
    ? rxs.map(r => `<span class="tm-reaction-pill">${esc(r.emoji || '👍')}<span>${esc(r.count || 1)}</span></span>`).join('')
    : '';
  return `<div class="tm-ch-reactions">
    ${pills}
    <button class="tm-ch-react-add" type="button">${ICONS.addReaction}<span>React</span></button>
  </div>`;
}

function renderPostReplies(replies) {
  if (!replies || !replies.length) {
    // Always show the inline reply affordance
    return `<div class="tm-ch-replies" data-empty="true">
      <div class="tm-ch-reply-input">${ICONS.reply}<span>Reply</span></div>
    </div>`;
  }
  const collapsed = replies.length > 3;
  const visible = collapsed ? replies.slice(-2) : replies;
  const hiddenCount = replies.length - visible.length;
  const collapsedNote = collapsed
    ? `<div class="tm-ch-reply-collapsed">${ICONS.reply}<span>${hiddenCount} earlier ${hiddenCount === 1 ? 'reply' : 'replies'}</span></div>`
    : '';
  const items = visible.map(renderChannelReply).join('');
  return `<div class="tm-ch-replies" data-empty="false" data-collapsed="${collapsed}">
    ${collapsedNote}
    ${items}
    <div class="tm-ch-reply-input">${ICONS.reply}<span>Reply</span></div>
  </div>`;
}

function renderChannelReply(r) {
  const id = esc(r.id || '');
  const kind = esc(r.kind || 'reply');
  const author = esc(r.author || '');
  const status = esc(r.status || 'online');
  const avatarColor = esc(r.avatarColor || '#5B5FC7');
  const time = esc(r.time || '');
  const text = r.text ? renderMessageText(r.text) : '';
  const quote = (r.kind === 'message_with_quote' && r.quote)
    ? `<div class="tm-msg-quote"><span class="tm-msg-quote-author">${esc(r.quote.author || '')}</span>${esc(r.quote.text || '')}</div>`
    : '';
  const attachItems = Array.isArray(r.attachments) ? r.attachments : (r.file ? [r.file] : []);
  const attachments = attachItems.length
    ? `<div class="tm-ch-reply-attachments">${attachItems.map(renderPostAttachment).join('')}</div>`
    : '';
  const reactions = (Array.isArray(r.reactions) && r.reactions.length)
    ? `<div class="tm-ch-reply-reactions">${r.reactions.map(rx => `<span class="tm-reaction-pill">${esc(rx.emoji || '👍')}<span>${esc(rx.count || 1)}</span></span>`).join('')}</div>`
    : '';
  return `<div class="tm-step tm-ch-reply" data-step-id="${id}" data-kind="${kind}">
    <div class="tm-ch-reply-avatar" style="background:${avatarColor}">${esc(initials(author))}<div class="tm-presence-sm" data-status="${status}"></div></div>
    <div class="tm-ch-reply-body">
      <div class="tm-ch-reply-meta"><span class="tm-ch-reply-author">${author}</span><span class="tm-ch-reply-time">${time}</span></div>
      ${quote}
      ${text ? `<div class="tm-ch-reply-text">${text}</div>` : ''}
      ${attachments}
      ${reactions}
    </div>
  </div>`;
}

// ───── Activity feed (teams-redo-activity) ─────
// Header is owned by teams-redo-headers; this function renders the list only.
// Renders directly from props.steps so activity items get the new card markup
// without touching renderSteps (which other views depend on).
function renderActivityContent(props /*, stepsHtml */) {
  const steps = Array.isArray(props.steps) ? props.steps : [];
  const itemsHtml = steps.map((s, idx) => renderActivityStep(s, idx)).join('');
  return `<div class="tm-activity-list tm-act-list">${itemsHtml}</div>`;
}

// Map iconKey aliases → canonical kind. Backward compat with existing SCFs.
function activityKind(iconKey) {
  const k = String(iconKey || '').toLowerCase();
  if (k === 'mention' || k === '@' || k === 'mentions') return 'mention';
  if (k === 'reply' || k === 'replies') return 'reply';
  if (k === 'reaction' || k === 'addreaction' || k === 'like' || k === 'liked') return 'reaction';
  if (k === 'missed' || k === 'missed-call' || k === 'missedcall' || k === 'calls' || k === 'call') return 'missed-call';
  if (k === 'new-post' || k === 'newpost' || k === 'thread' || k === 'post') return 'new-post';
  if (k === 'file-edit' || k === 'fileedit' || k === 'file' || k === 'edit') return 'file-edit';
  return 'generic';
}

function activityKindIcon(kind) {
  switch (kind) {
    case 'mention':     return ICONS.mention;
    case 'reply':       return ICONS.reply;
    case 'reaction':    return ICONS.emoji;
    case 'missed-call': return ICONS.calls;
    case 'new-post':    return ICONS.pinned;
    case 'file-edit':   return ICONS.attach;
    default:            return ICONS.mention;
  }
}

function renderActivityStep(s, idx) {
  const kind = s.kind || 'activity_item';
  const id = esc(s.id || `step-${idx}`);

  if (kind === 'pause') {
    return `<div class="tm-step" data-kind="pause" data-step-id="${id}" data-duration="${esc(s.duration || 1)}"></div>`;
  }
  // Hidden control steps for mark-read / new-activity — animation system can target them by id.
  if (kind === 'mark-read' || kind === 'new-activity') {
    return `<div class="tm-step" data-kind="${esc(kind)}" data-step-id="${id}" data-target="${esc(s.target || '')}"></div>`;
  }
  if (kind !== 'activity_item') {
    // Unknown kind in activity view — emit a benign step so animation cursor still advances.
    return `<div class="tm-step" data-kind="${esc(kind)}" data-step-id="${id}"></div>`;
  }

  const aKind = activityKind(s.iconKey);
  const actor = esc(s.actor || '');
  const action = esc(s.action || '');
  const time = esc(s.time || '');
  const preview = esc(s.preview || '');
  const source = esc(s.source || '');
  const avatarColor = esc(s.avatarColor || '#5B5FC7');
  const unread = (s.unread === undefined) ? (aKind === 'mention' || aKind === 'missed-call') : !!s.unread;
  const selected = s.selected ? 'true' : 'false';
  const kindIconSvg = activityKindIcon(aKind);

  // Source line: support "Team › Channel" with separator preserved
  const sourceParts = source ? source.split(/\s*[›>·]\s*/).filter(Boolean) : [];
  const sourceHtml = sourceParts.length > 1
    ? sourceParts.map((p, i) => i === 0
        ? `<span class="tm-act-source-team">${p}</span>`
        : `<span class="tm-act-source-sep">›</span><span class="tm-act-source-channel">${p}</span>`
      ).join('')
    : (source ? `<span class="tm-act-source-team">${source}</span>` : '');

  return `<div class="tm-step tm-act-row" data-kind="activity_item" data-step-id="${id}" data-act-kind="${aKind}" data-unread="${unread ? 'true' : 'false'}" data-selected="${selected}">
    <div class="tm-act-unread-dot" aria-hidden="true"></div>
    <div class="tm-act-avatar-wrap">
      <div class="tm-act-avatar" style="background:${avatarColor}">${esc(initials(actor || 'C'))}</div>
      <div class="tm-act-kind-badge" data-act-kind="${aKind}">${kindIconSvg}</div>
    </div>
    <div class="tm-act-body">
      <div class="tm-act-line1">
        <span class="tm-act-title"><span class="tm-act-actor">${actor}</span> <span class="tm-act-action">${action}</span></span>
        <span class="tm-act-time">${time}</span>
      </div>
      ${preview ? `<div class="tm-act-preview">${preview}</div>` : ''}
      ${sourceHtml ? `<div class="tm-act-source">${sourceHtml}</div>` : ''}
    </div>
    <div class="tm-act-hover-actions" aria-hidden="true">
      <div class="tm-act-hover-btn" title="Mark as read">${ICONS.pinned}</div>
      <div class="tm-act-hover-btn" title="More options">${ICONS.ellipsis}</div>
    </div>
  </div>`;
}

// ───── Calendar helpers (teams-redo-calendar) ─────

// Parse a wide variety of time strings into minutes-from-midnight.
// Accepts: "9:00 AM", "09:00", "9am", "9", "13:30", "12:00 PM", " 8:05pm ", "noon", "midnight".
// Returns null on failure so callers can decide a sensible default.
function parseTimeToMin(input) {
  if (input == null) return null;
  if (typeof input === 'number' && Number.isFinite(input)) {
    // Treat bare numbers as 24-hour hour values (e.g. 9 → 9:00, 13.5 → 13:30).
    const h = Math.floor(input);
    const m = Math.round((input - h) * 60);
    return h * 60 + m;
  }
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  if (s === 'noon')     return 12 * 60;
  if (s === 'midnight') return 0;
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3];
  if (mer === 'am') {
    if (hour === 12) hour = 0;
  } else if (mer === 'pm') {
    if (hour < 12) hour += 12;
  }
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  return hour * 60 + min;
}

function formatTimeLabel(min) {
  if (min == null) return '';
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const mer = h24 >= 12 ? 'PM' : 'AM';
  const h = ((h24 + 11) % 12) + 1;
  return m === 0 ? `${h} ${mer}` : `${h}:${String(m).padStart(2, '0')} ${mer}`;
}

function formatHourLabel(min) {
  const h24 = Math.floor(min / 60) % 24;
  const mer = h24 >= 12 ? 'PM' : 'AM';
  const h = ((h24 + 11) % 12) + 1;
  return `${h} ${mer}`;
}

// Normalize a day entry to {dow, dom, today}. Accepts strings like "Mon 13",
// "Mon" or objects like {dow:"Mon", dom:13, today:true}.
function normalizeDay(d, idx, todayIndex) {
  const isToday = (todayIndex != null) && (Number(todayIndex) === idx);
  if (typeof d === 'string') {
    const m = d.trim().match(/^([A-Za-z]+)\s*(\d+)?$/);
    if (m) return { dow: m[1].slice(0, 3), dom: m[2] || '', today: isToday || false };
    return { dow: d, dom: '', today: isToday || false };
  }
  if (d && typeof d === 'object') {
    return {
      dow: String(d.dow || d.label || '').slice(0, 3),
      dom: d.dom != null ? String(d.dom) : '',
      today: !!d.today || isToday,
    };
  }
  return { dow: '', dom: '', today: isToday || false };
}

// Normalize an hour label entry to a starting minute-of-day.
function normalizeHour(h) {
  if (typeof h === 'object' && h && h.hour24 != null) return Number(h.hour24) * 60;
  const parsed = parseTimeToMin(h);
  return parsed != null ? parsed : null;
}

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(91,95,199,${alpha})`;
  const h = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(91,95,199,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Small inline glyphs used inside event blocks (kept local to avoid mutating
// the global ICONS map). Strokes are currentColor so they tint with the event.
const CAL_GLYPHS = {
  teams:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1.5" y="4.5" width="8" height="7" rx="1.25"/><path d="m9.5 6.5 3.5-1.7v6.4L9.5 9.5z"/></svg>',
  recurring: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8a5 5 0 0 1 8.5-3.5L13 6M13 8a5 5 0 0 1-8.5 3.5L3 10"/><path d="M13 3v3h-3M3 13v-3h3"/></svg>',
  location:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 9.8 8 14 8 14z"/><circle cx="8" cy="6.5" r="1.6"/></svg>',
};

function renderCalendarContent(props) {
  const cal = props.calendar || {};

  // ── Days ─────────────────────────────────────────────
  const rawDays = Array.isArray(cal.days) && cal.days.length
    ? cal.days
    : [
        { dow: 'Mon', dom: 3 }, { dow: 'Tue', dom: 4 }, { dow: 'Wed', dom: 5 },
        { dow: 'Thu', dom: 6, today: true }, { dow: 'Fri', dom: 7 },
        { dow: 'Sat', dom: 8 }, { dow: 'Sun', dom: 9 },
      ];
  const todayIndex = (cal.todayIndex != null) ? Number(cal.todayIndex) : null;
  const days = rawDays.map((d, i) => normalizeDay(d, i, todayIndex));
  const dayCount = days.length;

  // ── Hours / day window ───────────────────────────────
  const rawHours = Array.isArray(cal.hours) && cal.hours.length
    ? cal.hours
    : ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];
  const hourMins = rawHours.map(normalizeHour).filter(v => v != null);
  // Default to 8 AM start, 1-hour spacing if parsing failed.
  const dayStartMin = (cal.startHour != null) ? Number(cal.startHour) * 60
                    : (hourMins.length ? hourMins[0] : 8 * 60);
  // Ensure we have a hour-aligned label for every hour in the visible range.
  const hourCount = hourMins.length || 11;
  const hourLabels = (hourMins.length ? hourMins : Array.from({ length: hourCount }, (_, i) => dayStartMin + i * 60))
    .map((min, i) => `<div class="tm-cal-hour-label">${i === 0 ? '' : esc(formatHourLabel(min))}</div>`).join('');

  const rowHeight = Number(cal.rowHeight) || 52;

  // ── Day headers ──────────────────────────────────────
  const dayHeaders = days.map(d =>
    `<div class="tm-cal-day-header" data-today="${d.today ? 'true' : 'false'}">
       <span class="tm-cal-dow">${esc(d.dow)}</span>
       <span class="tm-cal-dom">${esc(d.dom)}</span>
     </div>`).join('');

  // ── All-day ribbons ──────────────────────────────────
  const events = Array.isArray(cal.events) ? cal.events : [];
  const allDayEvents = events.filter(e => e && (e.allDay === true || e.kind === 'allday'));
  const timedEvents  = events.filter(e => !(e && (e.allDay === true || e.kind === 'allday')));

  const allDayRibbons = allDayEvents.map(e => {
    const start = Math.max(0, Math.min(dayCount - 1, Number(e.day) || 0));
    const span  = Math.max(1, Math.min(dayCount - start, Number(e.span) || 1));
    const color = e.color || 'var(--tm-accent)';
    const bg = e.color ? hexToRgba(e.color, 0.18) : 'var(--tm-accent-bg)';
    const sel = e.selected ? ' data-state="selected"' : '';
    return `<div class="tm-cal-allday-event" style="grid-column: ${start + 2} / span ${span}; --evt-bar:${esc(color)}; --evt-bg:${esc(bg)};"${sel}>
      <span class="tm-cal-allday-title">${esc(e.title || '')}</span>
    </div>`;
  }).join('');
  const hasAllDay = allDayEvents.length > 0;
  const allDayBlock = `<div class="tm-cal-allday" data-empty="${hasAllDay ? 'false' : 'true'}">
    <div class="tm-cal-allday-label">All day</div>
    <div class="tm-cal-allday-track" style="grid-column: 2 / span ${dayCount};">
      <div class="tm-cal-allday-grid" style="grid-template-columns: repeat(${dayCount}, 1fr);">
        ${days.map(() => `<div class="tm-cal-allday-cell"></div>`).join('')}
      </div>
      <div class="tm-cal-allday-events" style="grid-template-columns: repeat(${dayCount}, 1fr);">
        ${allDayRibbons}
      </div>
    </div>
  </div>`;

  // ── Day columns: hour rows + absolutely-positioned events ─
  const totalHeight = rowHeight * hourCount;
  const dayCols = days.map((d, dayIdx) => {
    const rows = Array.from({ length: hourCount }, () => `<div class="tm-cal-hour-row"></div>`).join('');
    const dayEvents = timedEvents.filter(e => Number(e.day) === dayIdx).map(e => {
      const startMin = parseTimeToMin(e.start);
      const endMin   = parseTimeToMin(e.end);
      if (startMin == null) return '';
      const dur = (endMin != null && endMin > startMin) ? (endMin - startMin) : (Number(e.durationMin) || 30);
      const top    = ((startMin - dayStartMin) / 60) * rowHeight;
      const height = Math.max(18, (dur / 60) * rowHeight - 2);
      const compact = dur < 45;
      const bar = e.color || 'var(--tm-accent)';
      const bg  = e.color ? hexToRgba(e.color, 0.18) : 'var(--tm-accent-bg)';
      const txt = e.color ? hexToRgba(e.color, 1) : 'var(--tm-accent)';
      const state = e.selected ? 'selected' : (e.state || 'normal');
      const cat   = esc(e.category || 'work');
      const timeLabel = (endMin != null)
        ? `${formatTimeLabel(startMin)} – ${formatTimeLabel(endMin)}`
        : formatTimeLabel(startMin);
      const badges = [
        e.isTeamsMeeting ? `<span class="tm-cal-event-badge tm-cal-badge-teams" title="Teams meeting">${CAL_GLYPHS.teams}</span>` : '',
        e.isRecurring    ? `<span class="tm-cal-event-badge tm-cal-badge-recurring" title="Recurring">${CAL_GLYPHS.recurring}</span>` : '',
      ].join('');
      const location = (!compact && e.location)
        ? `<div class="tm-cal-event-loc">${CAL_GLYPHS.location}<span>${esc(e.location)}</span></div>`
        : '';
      const style = `top:${top.toFixed(1)}px;height:${height.toFixed(1)}px;`
                  + `--evt-bar:${esc(bar)};--evt-bg:${esc(bg)};--evt-txt:${esc(txt)};`;
      return `<div class="tm-cal-event" data-state="${esc(state)}" data-category="${cat}" data-compact="${compact ? 'true' : 'false'}" style="${style}">
        <div class="tm-cal-event-time">${esc(timeLabel)}</div>
        <div class="tm-cal-event-title">${esc(e.title || '')}${badges}</div>
        ${location}
      </div>`;
    }).join('');

    // Now-line (only on today's column)
    let nowLine = '';
    if (d.today && cal.now != null) {
      const nowMin = parseTimeToMin(cal.now);
      if (nowMin != null && nowMin >= dayStartMin && nowMin <= dayStartMin + hourCount * 60) {
        const nowTop = ((nowMin - dayStartMin) / 60) * rowHeight;
        nowLine = `<div class="tm-cal-now" style="top:${nowTop.toFixed(1)}px"><span class="tm-cal-now-dot"></span></div>`;
      }
    }

    return `<div class="tm-cal-day-col" data-today="${d.today ? 'true' : 'false'}" style="height:${totalHeight}px">
      ${rows}${dayEvents}${nowLine}
    </div>`;
  }).join('');

  // Header (Today / nav / date / new meeting) is owned by teams-redo-headers.
  // We render only the calendar grid here.
  const gridCols = `60px repeat(${dayCount}, 1fr)`;
  return `<div class="tm-cal-grid" data-days="${dayCount}" style="--tm-cal-row-h:${rowHeight}px; --tm-cal-cols:${gridCols};">
    <div class="tm-cal-day-headers" style="grid-template-columns: ${gridCols};">
      <div class="tm-cal-day-header tm-cal-corner"></div>
      ${dayHeaders}
    </div>
    ${allDayBlock}
    <div class="tm-cal-body">
      <div class="tm-cal-body-inner" style="grid-template-columns: ${gridCols};">
        <div class="tm-cal-time-col" style="height:${totalHeight}px">${hourLabels}</div>
        ${dayCols}
      </div>
    </div>
  </div>`;
}

// Extension / authored type → canonical file-type bucket. Buckets drive both
// the colored icon badge (Fluent 2 file-type colors) and the letter glyph.
const SHARED_TYPE_MAP = {
  doc: 'word', docx: 'word', word: 'word',
  xls: 'excel', xlsx: 'excel', csv: 'excel', excel: 'excel',
  ppt: 'powerpoint', pptx: 'powerpoint', powerpoint: 'powerpoint',
  pdf: 'pdf',
  fig: 'figma', figma: 'figma',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', image: 'image',
  mp4: 'video', mov: 'video', webm: 'video', video: 'video',
  txt: 'text', md: 'text', text: 'text',
  folder: 'folder', channel: 'folder',
};
const SHARED_TYPE_LABEL = {
  word: 'W', excel: 'X', powerpoint: 'P', pdf: 'PDF',
  figma: 'F', image: 'IMG', video: 'VID', text: 'TXT',
  generic: '',
};
function sharedFileType(f) {
  const explicit = String(f.type || '').toLowerCase();
  if (SHARED_TYPE_MAP[explicit]) return SHARED_TYPE_MAP[explicit];
  const ext = String((f.name || '').split('.').pop() || '').toLowerCase();
  return SHARED_TYPE_MAP[ext] || 'generic';
}

const SHARED_AVATAR_PALETTE = ['#5B5FC7', '#0078D4', '#107C10', '#B146C2', '#C239B3', '#D13438', '#CA5010', '#038387'];
function sharedAvatarColor(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SHARED_AVATAR_PALETTE[h % SHARED_AVATAR_PALETTE.length];
}

function sharedFileSlug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'file';
}

// Inline SVGs scoped to shared-files surface (kept here so the global ICONS
// table stays focused on the chrome). Folder uses a subtle outline; the
// shared-link badge sits in the lower-right corner of the file icon.
const SHARED_FOLDER_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.75 6.5A2 2 0 0 1 5.75 4.5h3.4a2 2 0 0 1 1.45.62l1.18 1.23a.5.5 0 0 0 .36.15h6.36a2 2 0 0 1 2 2v8.75A2.25 2.25 0 0 1 18.25 19.5h-12.5A2.25 2.25 0 0 1 3.5 17.25V6.5z"/></svg>';
const SHARED_LINK_BADGE_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9.5a2.5 2.5 0 0 0 3.54 0l2-2a2.5 2.5 0 0 0-3.54-3.54l-.7.7"/><path d="M9.5 6.5a2.5 2.5 0 0 0-3.54 0l-2 2a2.5 2.5 0 0 0 3.54 3.54l.7-.7"/></svg>';
const SHARED_DOWNLOAD_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5v8m0 0L4.75 7.25M8 10.5l3.25-3.25M3 13.5h10"/></svg>';
const SHARED_OPEN_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5h4v4M13.5 2.5 7.75 8.25"/><path d="M12.5 9.5v3a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3"/></svg>';
const SHARED_SORT_ARROW_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';

function renderSharedContent(props) {
  const sh = props.shared || {};
  const files = Array.isArray(sh.files) ? sh.files : [];
  const sortKey = String(sh.sortKey || 'name').toLowerCase();
  const sortDir = String(sh.sortDir || 'asc').toLowerCase();

  const th = (key, label, mods = '') => {
    const active = sortKey === key ? 'true' : 'false';
    const arrow = sortKey === key
      ? `<span class="tm-sf-sort-arrow" data-dir="${esc(sortDir)}">${SHARED_SORT_ARROW_SVG}</span>`
      : '';
    return `<div class="tm-sf-th tm-sf-cell-${esc(key)}${mods ? ' ' + mods : ''}" data-sort-key="${esc(key)}" data-sort-active="${active}"><span class="tm-sf-th-label">${esc(label)}</span>${arrow}</div>`;
  };
  const thead = `<div class="tm-sf-thead">
    ${th('name', 'Name')}
    ${th('modby', 'Modified by')}
    ${th('mod', 'Modified')}
    <div class="tm-sf-th tm-sf-cell-actions" aria-hidden="true"></div>
  </div>`;

  const rows = files.map((f, idx) => {
    const t = sharedFileType(f);
    const isFolder = t === 'folder';
    const author = String(f.author || f.modifiedBy || '');
    const modified = String(f.date || f.modified || '');
    const fileId = esc(f.id || `file-${sharedFileSlug(f.name) || idx}`);
    const selected = f.selected ? 'true' : 'false';

    const iconInner = isFolder
      ? SHARED_FOLDER_SVG
      : `<span class="tm-sf-icon-letter">${esc(SHARED_TYPE_LABEL[t] || '')}</span>`;
    const sharedBadge = (f.sharedExternally || f.shared)
      ? `<span class="tm-sf-icon-badge" aria-hidden="true">${SHARED_LINK_BADGE_SVG}</span>`
      : '';
    const subRow = f.sharedIn
      ? `<div class="tm-sf-name-sub">Shared in ${esc(f.sharedIn)}</div>`
      : '';

    const authorBlock = author
      ? `<div class="tm-sf-author-avatar" style="background:${sharedAvatarColor(author)}">${esc(initials(author))}</div><span class="tm-sf-author-name">${esc(author)}</span>`
      : `<span class="tm-sf-author-name tm-sf-author-empty">—</span>`;

    return `<div class="tm-sf-row tm-step" data-step-id="${fileId}" data-kind="row-select" data-file-id="${fileId}" data-row-id="${fileId}" data-selected="${selected}" data-type="${esc(t)}" data-folder="${isFolder ? 'true' : 'false'}">
      <div class="tm-sf-cell tm-sf-cell-name">
        <div class="tm-sf-icon" data-type="${esc(t)}">${iconInner}${sharedBadge}</div>
        <div class="tm-sf-name-wrap">
          <div class="tm-sf-name">${esc(f.name || '')}</div>
          ${subRow}
        </div>
      </div>
      <div class="tm-sf-cell tm-sf-cell-modby">${authorBlock}</div>
      <div class="tm-sf-cell tm-sf-cell-mod">${esc(modified)}</div>
      <div class="tm-sf-cell tm-sf-cell-actions">
        <button class="tm-sf-action" type="button" title="Open" aria-label="Open">${SHARED_OPEN_SVG}</button>
        <button class="tm-sf-action" type="button" title="Copy link" aria-label="Copy link">${SHARED_LINK_BADGE_SVG}</button>
        <button class="tm-sf-action" type="button" title="Download" aria-label="Download">${SHARED_DOWNLOAD_SVG}</button>
        <button class="tm-sf-action" type="button" title="More options" aria-label="More options">${ICONS.ellipsis}</button>
      </div>
    </div>`;
  }).join('');

  const header = renderContentHeader(props);
  return `${header}<div class="tm-sf-table" data-view="${esc(sh.view || 'list')}">${thead}${rows}</div>`;
}

// ───── SCF author-shape → renderer-shape normalizer ─────
// SCFs are authored in a friendlier shape than the renderers consume.
// This translates them in-place so existing callers using either shape work.

const RAIL_KEY_TO_ICON = {
  activity: 'activity',
  chat: 'chat',
  teams: 'community',
  community: 'community',
  communities: 'community',
  calendar: 'calendar',
  calls: 'calls',
  files: 'onedrive',
  apps: 'apps',
};

function _parseHourString(s) {
  // Accepts "9:00", "09:30", "13:45", "9 AM", "9:30 PM"
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3] ? m[3].toUpperCase() : null;
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return { h, m: mm };
}

function _formatHourLabel(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function _formatRange(sh, sm, eh, em) {
  const fmt = (h, m) => {
    const ap = h < 12 ? 'AM' : 'PM';
    let hh = h % 12; if (hh === 0) hh = 12;
    return m ? `${hh}:${String(m).padStart(2, '0')} ${ap}` : `${hh}:${String(m).padStart(2, '0')} ${ap}`;
  };
  return `${fmt(sh, sm)} – ${fmt(eh, em)}`;
}

function _parseDayString(s) {
  // "Mon 13" → { dow: 'Mon', dom: 13 }
  if (typeof s !== 'string') return null;
  const m = s.trim().match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (!m) return null;
  return { dow: m[1], dom: parseInt(m[2], 10) };
}

function normalizeRail(rail) {
  if (!rail || !Array.isArray(rail.items)) return rail;
  // If items already have id+icon (renderer shape), leave alone.
  const looksAuthored = rail.items.some(it => it && (it.key || it.badge != null || it.active != null));
  if (!looksAuthored && rail.items.every(it => it && it.id)) return rail;

  const out = { ...rail };
  const badges = { ...(rail.badges || {}) };
  let active = rail.active || null;
  out.items = rail.items.map(it => {
    const id = it.id || it.key || (it.label ? it.label.toLowerCase() : 'item');
    const icon = it.icon || RAIL_KEY_TO_ICON[id] || RAIL_KEY_TO_ICON[(it.label || '').toLowerCase()] || 'chat';
    if (it.active === true) active = id;
    if (it.badge != null && it.badge !== false) badges[id] = String(it.badge);
    return { id, icon, label: it.label || id };
  });
  out.active = active;
  out.badges = badges;
  return out;
}

function normalizeNavigator(nav, view) {
  if (!nav) return nav;
  // If already in {sections: [...]} shape, leave alone.
  if (Array.isArray(nav.sections)) return nav;
  if (!Array.isArray(nav.items)) return nav;

  const out = { ...nav };
  let selectedItemId = nav.selectedItemId || null;

  // Detect "team groups" shape: items with type:'team' + channels[]
  const isTeamsShape = nav.items.some(it => it && (it.type === 'team' || Array.isArray(it.channels)));

  if (isTeamsShape) {
    out.sections = nav.items.map((team, ti) => {
      const channels = Array.isArray(team.channels) ? team.channels : [];
      return {
        label: team.name || `Team ${ti + 1}`,
        collapsed: team.expanded === false,
        items: channels.map((ch, ci) => {
          const id = ch.id || `team-${ti}-ch-${ci}`;
          if (ch.active === true) selectedItemId = id;
          return {
            id,
            kind: 'channel',
            title: ch.name || '',
            unread: ch.unread === true,
          };
        }),
      };
    });
  } else {
    // Flat chat list → wrap in single unlabelled section
    out.sections = [{
      label: null,
      items: nav.items.map((it, idx) => {
        const id = it.id || `chat-${idx}`;
        if (it.active === true) selectedItemId = id;
        const isGroup = it.kind === 'group' || it.type === 'group';
        return {
          id,
          kind: isGroup ? 'group' : 'oneOnOne',
          title: it.name || it.title || '',
          preview: it.lastMessage || it.preview || '',
          time: it.time || '',
          status: it.presence || it.status || null,
          iconLetter: it.iconLetter || (it.name ? it.name.trim().charAt(0).toUpperCase() : ''),
          iconColor: it.avatarColor || it.iconColor || '#5B5FC7',
          unread: it.unread === true,
          unreadCount: typeof it.unread === 'number' ? it.unread : (it.unreadCount || null),
        };
      }),
    }];
  }
  out.selectedItemId = selectedItemId;
  return out;
}

function normalizeContentHeader(props) {
  // For channel_post view, synthesize a contentHeader from `channel` if author didn't supply one.
  if (props.view === 'channel_post' && !props.contentHeader && props.channel) {
    const ch = props.channel;
    props.contentHeader = {
      kind: 'channel',
      title: ch.name || 'General',
      subtitle: ch.team || '',
      tabs: ch.tabs || [{ label: 'Posts', active: true }, { label: 'Files' }],
    };
  }
  // Map avatarColor → iconColor for renderer compatibility
  if (props.contentHeader && props.contentHeader.avatarColor && !props.contentHeader.iconColor) {
    props.contentHeader.iconColor = props.contentHeader.avatarColor;
  }
  if (props.contentHeader && !props.contentHeader.iconLetter && props.contentHeader.title) {
    props.contentHeader.iconLetter = props.contentHeader.title.trim().charAt(0).toUpperCase();
  }
  return props;
}

function normalizeCalendar(props) {
  const cal = props.calendar;
  if (!cal) return props;

  // weekLabel → dateLabel
  if (cal.weekLabel && !cal.dateLabel) cal.dateLabel = cal.weekLabel;

  // Parse day strings → {dow, dom}
  if (Array.isArray(cal.days) && cal.days.length && typeof cal.days[0] === 'string') {
    cal.days = cal.days.map(s => _parseDayString(s) || { dow: s, dom: '' });
  }

  // Compute first hour for offset; default 9
  let firstHour = 9;
  if (Array.isArray(cal.hours) && cal.hours.length) {
    const fp = _parseHourString(cal.hours[0]);
    if (fp) firstHour = fp.h;
  }
  cal._firstHour = firstHour;

  // Parse events: start/end strings → startHour/startMin/durationMin/time
  if (Array.isArray(cal.events)) {
    cal.events = cal.events.map(e => {
      const out = { ...e };
      const sp = _parseHourString(e.start);
      const ep = _parseHourString(e.end);
      if (sp) {
        out.startHour = sp.h;
        out.startMin = sp.m;
      }
      if (sp && ep) {
        out.durationMin = (ep.h * 60 + ep.m) - (sp.h * 60 + sp.m);
        if (!out.time) out.time = _formatRange(sp.h, sp.m, ep.h, ep.m);
      }
      if (e.selected === true && !out.state) out.state = 'selected';
      return out;
    });
  }
  return props;
}

function normalizeShared(props) {
  const sh = props.shared;
  if (!sh || !Array.isArray(sh.files)) return props;
  sh.files = sh.files.map(f => ({
    ...f,
    date: f.date || f.modified || '',
    author: f.author || f.modifiedBy || '',
    sub: f.sub || (f.size ? `${f.size}` : ''),
  }));
  return props;
}

function normalizeReactions(steps) {
  // Convert separate {kind:'reaction', targetStepId, emoji, from} steps
  // into reactions[] arrays attached to the target message step.
  if (!Array.isArray(steps)) return steps;
  const byId = new Map();
  for (const s of steps) if (s && s.id) byId.set(s.id, s);
  const out = [];
  for (const s of steps) {
    if (s && s.kind === 'reaction' && s.targetStepId && byId.has(s.targetStepId)) {
      const target = byId.get(s.targetStepId);
      target.reactions = target.reactions || [];
      target.reactions.push({ emoji: s.emoji || '👍', from: s.from || '' });
      continue; // drop the standalone step
    }
    out.push(s);
  }
  return out;
}

function normalizeTopBar(props) {
  const tb = props.topBar;
  if (!tb) return props;
  if (tb.search && tb.search.placeholder && !tb.searchPlaceholder) {
    tb.searchPlaceholder = tb.search.placeholder;
  }
  // Pipe top-level user/workspace into topBar if missing
  if (!tb.user && props.user) tb.user = props.user;
  return props;
}

function normalizeSceneProps(props) {
  if (!props || typeof props !== 'object') return props;
  normalizeTopBar(props);
  if (props.rail) props.rail = normalizeRail(props.rail);
  if (props.navigator) props.navigator = normalizeNavigator(props.navigator, props.view);
  normalizeContentHeader(props);
  normalizeCalendar(props);
  normalizeShared(props);
  if (Array.isArray(props.steps)) props.steps = normalizeReactions(props.steps);
  return props;
}

// ───── Main entrypoint ─────
export function transformTeamsScene(props /*, sceneCtx */) {
  // Defaults
  if (!props.theme) props.theme = 'light';
  if (!props.view) props.view = 'chat';

  // Normalize SCF author-shape → renderer-shape (in place, idempotent)
  normalizeSceneProps(props);

  // Backward-compat: if author supplied legacy stepsHtml, wrap it as chat content
  // (still let them override individual *Html slots).
  const view = props.view;
  const stepsHtml = (typeof props.stepsHtml === 'string')
    ? props.stepsHtml
    : renderSteps(props.steps);

  if (typeof props.topBarHtml !== 'string')   props.topBarHtml = renderTopBar(props);
  if (typeof props.railHtml !== 'string')     props.railHtml = renderRail(props);
  if (typeof props.navigatorHtml !== 'string') props.navigatorHtml = renderNavigator(props);

  if (typeof props.contentHtml !== 'string') {
    if (view === 'calendar')      props.contentHtml = renderCalendarContent(props);
    else if (view === 'shared')   props.contentHtml = renderSharedContent(props);
    else if (view === 'activity') props.contentHtml = renderActivityContent(props, stepsHtml);
    else if (view === 'channel_post') props.contentHtml = renderChannelContent(props, stepsHtml);
    else                          props.contentHtml = renderChatContent(props, stepsHtml);
  }

  // Defaults so template never leaks {{{ }}} literals
  if (typeof props.topBarHtml !== 'string')   props.topBarHtml = '';
  if (typeof props.railHtml !== 'string')     props.railHtml = '';
  if (typeof props.navigatorHtml !== 'string') props.navigatorHtml = '';
  if (typeof props.contentHtml !== 'string')  props.contentHtml = '';
  if (typeof props.stepsHtml !== 'string')    props.stepsHtml = stepsHtml;
}
