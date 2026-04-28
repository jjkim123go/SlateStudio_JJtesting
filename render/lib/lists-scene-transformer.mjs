/**
 * ListsScene PROP_TRANSFORMER — defaults + structured-data → HTML slot rendering.
 *
 * ListsScene is the shared Fluent 2 data-grid base. It is also reused by
 * Planner Grid view and OneDrive table view (proposal §6.2 / §6.6 / §6.7).
 *
 * Author-facing props (canonical):
 *   listName        : string                  // "Incidents list"
 *   breadcrumb      : string                  // "Cosmos BDP"
 *   iconColor       : enum                    // see VALID_ICON_COLORS
 *   activeView      : string                  // "All Items"
 *   state           : enum                    // default | row-selected | menu-open
 *   selectedRowIndex: integer | -1            // index into props.rows when state != default
 *   columns         : Column[]                // header definitions
 *   rows            : Row[]                   // row data
 *   contextMenu     : MenuItem[]              // when state=menu-open, what items to show
 *
 * Column = { name: string, width?: number|"flex", sort?: "asc"|"desc"|null,
 *            filterable?: boolean }
 * Row    = { cells: { [colName: string]: Cell } }
 * Cell   = string                       // plain text
 *        | { type: "text",   value }
 *        | { type: "pill",   value, color: enum }   // status pill
 *        | { type: "person", name }                 // person chip
 *        | { type: "link",   text, hrefDisplay? }   // blue link
 *        | { type: "rich",   html }                 // pre-sanitized inline HTML
 *        | { type: "icons",  items: ["scissors", "chain", "alert"] }  // small inline icon row
 *
 * MenuItem = { label, icon?, hasSubmenu?, divider?: true }
 *
 * Slots emitted (referenced as `{{{slotName}}}` in index.html):
 *   columnsHeaderHtml  : full <div class="ls-grid-col-header"> row
 *   rowsHtml           : the data-row stack
 *   contextMenuHtml    : empty unless state="menu-open"
 *   commandBarHtml     : context-aware (Comment shown only when selected)
 *   selectionStatusHtml: "{n} selected" + Details, only when row-selected
 */

const VALID_ICON_COLORS = new Set([
  'purple', 'teal', 'red', 'orange', 'green', 'blue', 'pink', 'gray',
]);

const VALID_STATES = new Set(['default', 'row-selected', 'menu-open']);

const VALID_PILL_COLORS = new Set([
  // semantic
  'success', 'warning', 'danger', 'info', 'neutral',
  // friendly aliases used in real lists
  'green', 'amber', 'red', 'blue', 'gray', 'teal', 'purple', 'orange',
]);

// Map friendly aliases → canonical token
const PILL_COLOR_ALIAS = {
  green: 'success', red: 'danger', amber: 'warning', orange: 'warning',
  blue: 'info', teal: 'info', purple: 'info-alt', gray: 'neutral',
  success: 'success', warning: 'warning', danger: 'danger',
  info: 'info', neutral: 'neutral',
};

const ICON_PATHS = {
  // 16px Fluent Filled — `d` paths from FluentUI System Icons.
  // Stored here so the component HTML stays template-clean; transformer injects.
  share:        'M11.75 1c1.24 0 2.25 1.01 2.25 2.25S12.99 5.5 11.75 5.5c-.7 0-1.32-.32-1.74-.83L7.04 6.36c.13.36.21.74.21 1.14 0 .31-.05.61-.13.9l3.66 1.94c.41-.32.93-.51 1.5-.51 1.24 0 2.25 1.01 2.25 2.25S13.49 14.5 12.25 14.5 10 13.49 10 12.25c0-.16.02-.31.05-.46l-3.66-1.94c-.5.42-1.16.65-1.86.65A2.75 2.75 0 0 1 1.78 7.5C1.78 5.98 3.02 4.75 4.53 4.75c.74 0 1.41.29 1.92.77l3.34-1.78c-.03-.16-.04-.32-.04-.49C9.75 2 10.76 1 12 1Z',
  copyLink:     'M9.71 5.32a.75.75 0 0 1 1.06 1.06l-4.39 4.39a.75.75 0 0 1-1.06-1.06l4.39-4.39ZM7.45 2.46a3.5 3.5 0 1 1 4.95 4.95l-1.6 1.6a.75.75 0 1 1-1.06-1.06l1.6-1.6a2 2 0 1 0-2.83-2.83l-1.6 1.6a.75.75 0 1 1-1.06-1.06l1.6-1.6Zm-3.4 7.4a.75.75 0 0 1 0 1.06l-1.6 1.6a2 2 0 1 0 2.83 2.83l1.6-1.6a.75.75 0 1 1 1.06 1.06l-1.6 1.6a3.5 3.5 0 1 1-4.95-4.95l1.6-1.6a.75.75 0 0 1 1.06 0Z',
  comment:      'M2 4.75A2.75 2.75 0 0 1 4.75 2h6.5A2.75 2.75 0 0 1 14 4.75v4.5A2.75 2.75 0 0 1 11.25 12H8.06l-2.6 2.32A.75.75 0 0 1 4.25 13.7V12h-.5A1.75 1.75 0 0 1 2 10.25v-5.5Z',
  edit:         'M11.66 2.34a2.5 2.5 0 0 1 3.54 3.54l-7.5 7.5a2 2 0 0 1-.85.5l-3.1.83a.75.75 0 0 1-.92-.92l.83-3.1c.1-.32.27-.6.5-.85l7.5-7.5Z',
  share2:       'M8.75 1.75v8.69l1.97-1.97a.75.75 0 0 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 9.53a.75.75 0 0 1 1.06-1.06l1.97 1.97V1.75a.75.75 0 0 1 1.5 0Zm-5.5 11a.75.75 0 0 1 .75.75V14a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-.5a.75.75 0 0 1 1.5 0V14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-.5a.75.75 0 0 1 .75-.75Z',
  export:       'M2 11.5A.5.5 0 0 1 2.5 11h11a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1-.5-.5ZM5.22 4.78a.75.75 0 0 0 1.06 1.06L7.25 4.81V9.5a.75.75 0 0 0 1.5 0V4.81l.97.97a.75.75 0 0 0 1.06-1.06L8.53 2.47a.75.75 0 0 0-1.06 0L5.22 4.78Z',
  integrate:    'M3 4.5A1.5 1.5 0 0 1 4.5 3h2A1.5 1.5 0 0 1 8 4.5v2A1.5 1.5 0 0 1 6.5 8h-2A1.5 1.5 0 0 1 3 6.5v-2Zm6 0A1.5 1.5 0 0 1 10.5 3h2A1.5 1.5 0 0 1 14 4.5v2A1.5 1.5 0 0 1 12.5 8h-2A1.5 1.5 0 0 1 9 6.5v-2Zm-6 6A1.5 1.5 0 0 1 4.5 9h2A1.5 1.5 0 0 1 8 10.5v2A1.5 1.5 0 0 1 6.5 14h-2A1.5 1.5 0 0 1 3 12.5v-2Zm6 0A1.5 1.5 0 0 1 10.5 9h2A1.5 1.5 0 0 1 14 10.5v2A1.5 1.5 0 0 1 12.5 14h-2A1.5 1.5 0 0 1 9 12.5v-2Z',
  more:         'M3.5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  details:      'M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9ZM4 5h2v2H4V5Zm0 4h2v2H4V9Zm4-4h4v1H8V5Zm0 2h4v1H8V7Zm0 2h4v1H8V9Zm0 2h4v1H8v-1Z',
  collapse:     'M5.97 4.22a.75.75 0 1 0-1.06 1.06L7.94 8l-3.03 2.72a.75.75 0 1 0 1.06 1.06l3.5-3.25a.75.75 0 0 0 0-1.06l-3.5-3.25Z',
  filter:       'M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 .58 1.22L9 9.62v3.13a.75.75 0 0 1-1.18.6l-2-1.43A.75.75 0 0 1 5.5 11.3V9.63L1.42 4.22A.75.75 0 0 1 2 3.75Z',
  group:        'M2.5 4a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11Zm2 4a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Zm2 4a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3Z',
  sort:         'M4.5 1.5a.75.75 0 0 1 .75.75v9.69l1.97-1.97a.75.75 0 0 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L.72 11.03a.75.75 0 1 1 1.06-1.06l1.97 1.97V2.25a.75.75 0 0 1 .75-.75Zm7 13a.75.75 0 0 1-.75-.75V4.06L8.78 6.03a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 1 1-1.06 1.06l-1.97-1.97v9.69a.75.75 0 0 1-.75.75Z',
  star:         'M7.55 1.92c.18-.37.71-.37.9 0l1.5 3.04 3.36.49c.41.06.57.56.27.85l-2.43 2.37.57 3.34c.07.4-.35.71-.72.52L7.99 11l-3 1.58c-.36.19-.79-.12-.72-.52l.58-3.34-2.43-2.37a.5.5 0 0 1 .27-.85l3.36-.49 1.5-3.04Z',
  search:       'M11.5 6.5a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-1.39 4.32a6 6 0 1 1 .7-.7l3.14 3.13a.5.5 0 1 1-.7.7l-3.14-3.13Z',
  manageAccess: 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6c0-2.21 2.24-4 5-4s5 1.79 5 4v.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V14Z',
  alert:        'M8 1a5 5 0 0 0-5 5v2.59L1.71 10.3A.75.75 0 0 0 2.24 11.6h11.52a.75.75 0 0 0 .53-1.3L13 8.6V6a5 5 0 0 0-5-5Zm0 14a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2Z',
  alertAdd:     'M11 1a4 4 0 0 0-4 4v.13a5 5 0 0 0-3 4.6V12L2.71 13.3A.75.75 0 0 0 3.24 14.6h7.52a.75.75 0 0 0 .53-1.3L10 12V9.74a5 5 0 0 0-2-4V5a2 2 0 0 1 4 0v.5a.5.5 0 0 0 1 0V5a4 4 0 0 0-3-4Z',
};

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s) { return escapeHtml(s); }

function fluentIcon(name, extraClass = '') {
  const d = ICON_PATHS[name];
  if (!d) return '';
  const cls = `ls-icon ls-i-${name}${extraClass ? ' ' + extraClass : ''}`;
  return `<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}

function renderCell(cell, colName) {
  if (cell == null || cell === '') return '<div class="ls-cell-empty"></div>';

  if (typeof cell === 'string' || typeof cell === 'number') {
    return `<div class="ls-cell-text">${escapeHtml(cell)}</div>`;
  }

  if (typeof cell !== 'object') return '';

  switch (cell.type) {
    case 'text':
      return `<div class="ls-cell-text">${escapeHtml(cell.value || '')}</div>`;

    case 'pill': {
      const raw = (cell.color || 'neutral').toString().toLowerCase();
      const tone = PILL_COLOR_ALIAS[raw] || 'neutral';
      return `<span class="ls-pill" data-tone="${escapeAttr(tone)}">${escapeHtml(cell.value || '')}</span>`;
    }

    case 'person': {
      const name = cell.name || '';
      const initial = name.trim().charAt(0).toUpperCase() || '?';
      return `<span class="ls-person"><span class="ls-person-avatar">${escapeHtml(initial)}</span><span class="ls-person-name">${escapeHtml(name)}</span></span>`;
    }

    case 'link': {
      const display = cell.text || cell.hrefDisplay || '';
      return `<span class="ls-link">${escapeHtml(display)}</span>`;
    }

    case 'rich':
      return `<div class="ls-cell-rich">${cell.html || ''}</div>`;

    case 'icons': {
      const items = Array.isArray(cell.items) ? cell.items : [];
      return `<div class="ls-cell-icons">${items.map(n => fluentIcon(n, 'ls-icon-inline')).join('')}</div>`;
    }

    default:
      return `<div class="ls-cell-text">${escapeHtml(String(cell.value || ''))}</div>`;
  }
}

function renderColumnHeader(col, colCount) {
  const w = col.width === 'flex' || col.width == null
    ? 'flex:1 1 0; min-width:0;'
    : `flex:0 0 ${Number(col.width)}px;`;
  const sortIcon = col.sort === 'desc'
    ? '<span class="ls-col-sort" aria-label="Sorted descending">↓</span>'
    : col.sort === 'asc'
      ? '<span class="ls-col-sort" aria-label="Sorted ascending">↑</span>'
      : '';
  return `<div class="ls-col" style="${w}"><span class="ls-col-name">${escapeHtml(col.name || '')}</span>${sortIcon}</div>`;
}

function renderRow(row, columns, rowIndex, selectedIndex) {
  const isSelected = rowIndex === selectedIndex;
  const cells = columns.map(col => {
    const w = col.width === 'flex' || col.width == null
      ? 'flex:1 1 0; min-width:0;'
      : `flex:0 0 ${Number(col.width)}px;`;
    const cell = (row.cells || {})[col.name];
    return `<div class="ls-cell" style="${w}">${renderCell(cell, col.name)}</div>`;
  }).join('');

  // Checkbox: filled if selected, empty circle otherwise.
  // NOTE: SR #15 lint exception — checkbox SVGs use stroke for circle outline and
  // checkmark geometry. Filled-only ring/check would require alternate path math.
  const cbSvg = isSelected
    ? '<svg viewBox="0 0 16 16" class="ls-cb-svg ls-cb-on" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#742774"/><path d="M5 8.2l2.2 2.2L11 6.6" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 16 16" class="ls-cb-svg ls-cb-off" aria-hidden="true"><circle cx="8" cy="8" r="7" stroke="#a19f9d" stroke-width="1" fill="none"/></svg>';

  return `<div class="ls-row" data-selected="${isSelected ? '1' : '0'}" data-row-index="${rowIndex}">`
       + `<div class="ls-row-checkbox" aria-label="${isSelected ? 'Selected' : 'Select row'}">${cbSvg}</div>`
       + `<div class="ls-row-cells">${cells}</div>`
       + `<div class="ls-row-overflow" aria-label="More actions">${fluentIcon('more')}</div>`
       + `</div>`;
}

function renderContextMenu(menu, anchorRowIndex) {
  if (!menu || !menu.length) return '';
  const items = menu.map(item => {
    if (item.divider) return '<div class="ls-cm-divider"></div>';
    const icon = item.icon ? fluentIcon(item.icon) : '<span class="ls-cm-icon-spacer"></span>';
    const submenu = item.hasSubmenu ? '<span class="ls-cm-chevron">›</span>' : '';
    return `<div class="ls-cm-item" role="menuitem">`
         + `<span class="ls-cm-icon">${icon}</span>`
         + `<span class="ls-cm-label">${escapeHtml(item.label || '')}</span>`
         + submenu
         + `</div>`;
  }).join('');

  // Position anchor: align with the row's "..." overflow click point. Y derived
  // from row index (header chrome occupies first 168px; rows are ~76px each).
  // X anchored at the action well inside the Title cell (~265px from left).
  const ROW_TOP_OFFSET = 168;
  const ROW_HEIGHT = 76;
  const top = ROW_TOP_OFFSET + (anchorRowIndex * ROW_HEIGHT) + 8;
  const left = 265;
  return `<div class="ls-context-menu" role="menu" style="top:${top}px; left:${left}px;">${items}</div>`;
}

function renderCommandBar(state, hasSelection) {
  // Default cluster: Edit in grid view | Share | Copy link | Export ▾ | Integrate ▾ | ⋯
  // Selected cluster: Edit in grid view | Share | Copy link | Comment | Integrate ▾ | ⋯  (Export drops out)
  const items = [];
  items.push({ icon: 'edit',      label: 'Edit in grid view' });
  items.push({ icon: 'share',     label: 'Share' });
  items.push({ icon: 'copyLink',  label: 'Copy link' });
  if (hasSelection) {
    items.push({ icon: 'comment', label: 'Comment' });
  } else {
    items.push({ icon: 'export',  label: 'Export', chevron: true });
  }
  items.push({ icon: 'integrate', label: 'Integrate', chevron: true });

  const html = items.map(it => `<button class="ls-cmd-btn" type="button">`
    + `<span class="ls-cmd-icon">${fluentIcon(it.icon)}</span>`
    + `<span class="ls-cmd-label">${escapeHtml(it.label)}</span>`
    + (it.chevron ? '<span class="ls-cmd-chev">▾</span>' : '')
    + `</button>`).join('');

  const overflow = `<button class="ls-cmd-btn ls-cmd-overflow" type="button" aria-label="More commands">${fluentIcon('more')}</button>`;
  return html + overflow;
}

function renderSelectionStatus(selectedCount) {
  if (!selectedCount) return '';
  return `<span class="ls-sel-status">`
       + `<span class="ls-sel-x" aria-hidden="true">✕</span>`
       + `<span class="ls-sel-count">${selectedCount} selected</span>`
       + `</span>`
       + `<button class="ls-cmd-btn ls-details-toggle" type="button">`
       +   `<span class="ls-cmd-icon">${fluentIcon('details')}</span>`
       +   `<span class="ls-cmd-label">Details</span>`
       + `</button>`;
}

function renderDefaultRightCluster() {
  return `<button class="ls-cmd-btn ls-details-toggle" type="button">`
       +   `<span class="ls-cmd-icon">${fluentIcon('details')}</span>`
       +   `<span class="ls-cmd-label">Details</span>`
       + `</button>`
       + `<button class="ls-cmd-btn ls-collapse-btn" type="button" aria-label="Collapse command bar">${fluentIcon('collapse')}</button>`;
}

function fillIconColor(props) {
  if (props.iconColor && VALID_ICON_COLORS.has(props.iconColor)) return;
  props.iconColor = 'purple';
}

export function transformListsScene(props /*, sceneCtx */) {
  if (!props || typeof props !== 'object') return;

  // ── 1. Validate enums ──
  if (props.state != null && !VALID_STATES.has(props.state)) {
    throw new Error(`ListsScene: invalid state "${props.state}". Valid: ${[...VALID_STATES].join(', ')}`);
  }
  if (props.iconColor != null && !VALID_ICON_COLORS.has(props.iconColor)) {
    throw new Error(`ListsScene: invalid iconColor "${props.iconColor}". Valid: ${[...VALID_ICON_COLORS].join(', ')}`);
  }
  for (const row of (props.rows || [])) {
    for (const colName of Object.keys(row.cells || {})) {
      const cell = row.cells[colName];
      if (cell && typeof cell === 'object' && cell.type === 'pill') {
        const raw = (cell.color || 'neutral').toString().toLowerCase();
        if (!VALID_PILL_COLORS.has(raw)) {
          throw new Error(`ListsScene: invalid pill color "${cell.color}" in row col "${colName}". Valid: ${[...VALID_PILL_COLORS].join(', ')}`);
        }
      }
    }
  }

  // ── 2. Defaults ──
  if (!props.state)        props.state = 'default';
  if (!props.listName)     props.listName = 'My list';
  if (!props.breadcrumb)   props.breadcrumb = '';
  if (!props.activeView)   props.activeView = 'All Items';
  if (!Array.isArray(props.columns)) props.columns = [];
  if (!Array.isArray(props.rows))    props.rows = [];
  if (!Array.isArray(props.contextMenu)) props.contextMenu = [];
  if (typeof props.selectedRowIndex !== 'number') props.selectedRowIndex = -1;
  if (props.searchPlaceholder == null) props.searchPlaceholder = 'Search';
  if (props.notifCount == null)        props.notifCount = 0;
  if (!props.accountInitial)           props.accountInitial = 'A';
  fillIconColor(props);
  if ((props.state === 'row-selected' || props.state === 'menu-open')
      && (props.selectedRowIndex < 0 || props.selectedRowIndex >= props.rows.length)) {
    props.selectedRowIndex = 0;
  }

  // Forward computed booleans for template conditionals (used as data-attrs).
  props.hasSelection = props.state === 'row-selected' || props.state === 'menu-open';
  props.menuOpen     = props.state === 'menu-open';

  // ── 3. Render slot HTML ──
  props.columnsHeaderHtml = props.columns
    .map(col => renderColumnHeader(col, props.columns.length))
    .join('');

  let selectionCount = 0;
  props.rowsHtml = props.rows
    .map((row, idx) => {
      const isSelected = idx === props.selectedRowIndex;
      if (isSelected) selectionCount += 1;
      return renderRow(row, props.columns, idx, props.selectedRowIndex);
    })
    .join('');
  if (props.hasSelection && selectionCount === 0) selectionCount = 1;

  props.contextMenuHtml = props.menuOpen
    ? renderContextMenu(props.contextMenu, props.selectedRowIndex >= 0 ? props.selectedRowIndex : 0)
    : '';

  props.commandBarHtml = renderCommandBar(props.state, props.hasSelection);

  props.commandBarRightHtml = props.hasSelection
    ? renderSelectionStatus(selectionCount)
    : renderDefaultRightCluster();

  // Header chip icon — a lightbulb-style filled glyph in colored chip.
  props.headerIconSvg = `<svg viewBox="0 0 24 24" aria-hidden="true" class="ls-header-icon-svg">`
    + `<path d="M12 2.5A6.5 6.5 0 0 0 7.5 13.7c.7.78 1.1 1.6 1.3 2.3h6.4c.2-.7.6-1.52 1.3-2.3A6.5 6.5 0 0 0 12 2.5Zm-2.5 15.5h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5Zm.75 2.5h3.5l-.5 1a1 1 0 0 1-.9.5h-.7a1 1 0 0 1-.9-.5l-.5-1Z" fill="#fff"/>`
    + `</svg>`;

  // Stable row count for downstream JSON island validation
  props.rowCount = props.rows.length;
}

export const __test__ = {
  escapeHtml,
  renderCell,
  renderRow,
  renderColumnHeader,
  renderContextMenu,
  PILL_COLOR_ALIAS,
  VALID_STATES,
  VALID_ICON_COLORS,
};
