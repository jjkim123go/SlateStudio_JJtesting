/**
 * PlannerScene PROP_TRANSFORMER — Microsoft Planner chrome (board / charts / task-detail modal).
 *
 * Variants (proposal §6.5):
 *   variant: "board"   → bucket columns with task cards (default, primary)
 *            "charts"  → 4-card progress dashboard (donut + bars)
 *
 * Modal overlay (independent of variant):
 *   state:   "default"   → no overlay
 *            "task-open" → Task detail modal centered + scrim
 *
 * Note: Planner's "Grid" view IS just a ListsScene with planner-styled
 * columns. Authors should compose ListsScene directly for that case rather
 * than re-implementing the grid here. (See §6.2 reuse rule.)
 *
 * Author-facing props (canonical):
 *   variant         : enum                    // board | charts
 *   state           : enum                    // default | task-open
 *   planName        : string                  // "Livesite – Radar Controls"
 *   breadcrumb      : string                  // "My plans"
 *   activeTab       : enum                    // Goals|Grid|Board|Calendar|Charts
 *   groupBy         : string                  // "Bucket"
 *   accountInitial  : string                  // "I"
 *   buckets         : Bucket[]                // when variant=board
 *   chartCards      : ChartCard[]             // when variant=charts
 *   selectedTask    : TaskDetail              // when state=task-open
 *
 * Bucket = { name: string, hasHelpIcon?: boolean, tasks: Task[] }
 * Task   = {
 *   title: string,
 *   recurrence?: boolean,                     // shows orange clock icon
 *   priority?: "urgent"|"important"|"medium"|"low",
 *   progress?: "notStarted"|"inProgress"|"completed",
 *   labels?: [{ text, color }],               // colored stripe labels
 *   assignees?: [{ name }],                   // bottom-right person dots
 *   dueText?: string                          // "Due Apr 28"
 * }
 *
 * ChartCard = { title, type: "donut"|"bar", value?, label?, bars?, legend? }
 * Donut: { title:"Tasks left", type:"donut", value: 12, label: "Tasks left", legend: [...] }
 * Bar:   { title:"Priority",   type:"bar",   bars: [{ label:"Medium", value:12, segments:[{name:"Not Started",value:12}] }], legend: [...] }
 *
 * TaskDetail = {
 *   title, createdMeta, status, priority, startDate, dueDate, repeat, bucket,
 *   checklistItems?: [{ text, done }], notes?: string, showChat?: boolean
 * }
 *
 * Slots emitted (referenced as `{{{slotName}}}` in index.html):
 *   bodyHtml         : either bucketsHtml or chartsHtml depending on variant
 *   tabsHtml         : tab strip with active highlight
 *   modalHtml        : empty unless state="task-open"
 */

const VALID_VARIANTS = new Set(['board', 'charts']);
const VALID_STATES = new Set(['default', 'task-open']);
const VALID_TABS = new Set(['Goals', 'Grid', 'Board', 'Calendar', 'Charts']);
const VALID_PRIORITIES = new Set(['urgent', 'important', 'medium', 'low']);
const VALID_PROGRESS = new Set(['notStarted', 'inProgress', 'completed']);

const SEGMENT_COLORS = {
  notStarted: '#C8B6F7',  // purple
  inProgress: '#5B5FC7',  // blue (Planner brand)
  late: '#D74053',        // red
  completed: '#3FB984',   // green
};
// Map human-readable segment/legend names to SEGMENT_COLORS keys
const SEGMENT_NAME_MAP = {
  'not started': 'notStarted',
  'in progress': 'inProgress',
  'late': 'late',
  'completed': 'completed',
};
function resolveSegmentColor(name) {
  const key = SEGMENT_NAME_MAP[(name || '').toLowerCase()] || null;
  return key ? SEGMENT_COLORS[key] : (SEGMENT_COLORS[name] || SEGMENT_COLORS.notStarted);
}

const PRIORITY_DOT = {
  urgent: '#D74053',
  important: '#E8770E',
  medium: '#5B5FC7',
  low: '#7A7A7A',
};

const ICON_PATHS = {
  recurrence:   'M5.13 4.13A4 4 0 0 1 12 7a.75.75 0 0 0 1.5 0 5.5 5.5 0 0 0-9.39-3.89L3 2v3.75c0 .14.11.25.25.25H7a.75.75 0 0 0 0-1.5H4.93l.2-.37Zm5.74 7.74A4 4 0 0 1 4 9a.75.75 0 0 0-1.5 0 5.5 5.5 0 0 0 9.39 3.89L13 14v-3.75a.25.25 0 0 0-.25-.25H9a.75.75 0 0 0 0 1.5h2.07l-.2.37Z',
  goal:         'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  label:        'M2 4.75A2.75 2.75 0 0 1 4.75 2H8.5a2.5 2.5 0 0 1 1.77.73l4 4a2.5 2.5 0 0 1 0 3.54l-3.5 3.5a2.5 2.5 0 0 1-3.54 0l-4-4A2.5 2.5 0 0 1 2 8V4.75ZM5.5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  assign:       'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6c0-2.21 2.24-4 5-4s5 1.79 5 4v.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V14Z',
  details:      'M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9ZM4 5h2v2H4V5Zm0 4h2v2H4V9Zm4-4h4v1H8V5Zm0 2h4v1H8V7Zm0 2h4v1H8V9Zm0 2h4v1H8v-1Z',
  attachment:   'M11.5 6 6.7 10.8a1.5 1.5 0 1 0 2.12 2.12l5.66-5.66a3 3 0 1 0-4.24-4.24L4.59 8.7a4.5 4.5 0 1 0 6.36 6.36l4.6-4.6a.75.75 0 0 0-1.06-1.06l-4.6 4.6a3 3 0 1 1-4.24-4.24l5.66-5.66a1.5 1.5 0 1 1 2.12 2.12L8.88 11.74a.75.75 0 1 1-1.06-1.06L12.62 5.6 11.5 6Z',
  chat:         'M2 4.75A2.75 2.75 0 0 1 4.75 2h6.5A2.75 2.75 0 0 1 14 4.75v4.5A2.75 2.75 0 0 1 11.25 12H8.06l-2.6 2.32A.75.75 0 0 1 4.25 13.7V12h-.5A1.75 1.75 0 0 1 2 10.25v-5.5Z',
  ellipsis:     'M3.5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  more:         'M3.5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  close:        'M4.21 4.21a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.73a.75.75 0 1 1 1.07 1.06L9.06 8l2.73 2.72a.75.75 0 1 1-1.07 1.07L8 9.06l-2.73 2.73a.75.75 0 1 1-1.06-1.07L6.94 8 4.21 5.27a.75.75 0 0 1 0-1.06Z',
  caret:        'M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z',
  calendar:     'M4 1.75a.75.75 0 0 1 1.5 0V2h5v-.25a.75.75 0 0 1 1.5 0V2h.75A2.25 2.25 0 0 1 15 4.25v8.5A2.25 2.25 0 0 1 12.75 15h-9.5A2.25 2.25 0 0 1 1 12.75v-8.5A2.25 2.25 0 0 1 3.25 2H4v-.25ZM3.25 3.5a.75.75 0 0 0-.75.75V6h11V4.25a.75.75 0 0 0-.75-.75H3.25Z',
  bucket:       'M3 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4Z',
  goalsTab:     'M3 13a3 3 0 0 1 3-3v-1a3 3 0 1 1 4 0v1a3 3 0 0 1 3 3v.5a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 3 13.5V13Zm5-7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  gridTab:      'M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9ZM3.5 4v3h3V4h-3Zm4 0v3h2V4h-2Zm3 0v3h1V4h-1Zm-7 4v3h3V8h-3Zm4 0v3h2V8h-2Zm3 0v3h1V8h-1Z',
  boardTab:     'M2 4.5A2.5 2.5 0 0 1 4.5 2h7A2.5 2.5 0 0 1 14 4.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5v-7ZM4 4v8h3V4H4Zm5 0v5h3V4H9Z',
  calendarTab:  'M4 1.75a.75.75 0 0 1 1.5 0V2h5v-.25a.75.75 0 0 1 1.5 0V2h.75A2.25 2.25 0 0 1 15 4.25v8.5A2.25 2.25 0 0 1 12.75 15h-9.5A2.25 2.25 0 0 1 1 12.75v-8.5A2.25 2.25 0 0 1 3.25 2H4v-.25ZM2.5 6V12.75c0 .41.34.75.75.75h9.5a.75.75 0 0 0 .75-.75V6h-11Z',
  chartsTab:    'M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5ZM4 11h2V7H4v4Zm3.5 0h1V4h-1v7Zm2.5 0h2V8h-2v3Z',
  filterTab:    'M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 .58 1.22L9 9.62v3.13a.75.75 0 0 1-1.18.6l-2-1.43A.75.75 0 0 1 5.5 11.3V9.63L1.42 4.22A.75.75 0 0 1 2 3.75Z',
  searchTab:    'M11.5 6.5a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-1.39 4.32a6 6 0 1 1 .7-.7l3.14 3.13a.5.5 0 1 1-.7.7l-3.14-3.13Z',
  send:         'M1.72 1.72a.75.75 0 0 1 .82-.16l11.5 5a.75.75 0 0 1 0 1.38l-11.5 5a.75.75 0 0 1-1.04-.86L3.6 8 1.5 2.92a.75.75 0 0 1 .22-.74Z',
};

const TAB_ICONS = {
  Goals: 'goalsTab', Grid: 'gridTab', Board: 'boardTab',
  Calendar: 'calendarTab', Charts: 'chartsTab',
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

function fluentIcon(name, extraClass = '') {
  const d = ICON_PATHS[name];
  if (!d) return '';
  const cls = `ps-icon ps-i-${name}${extraClass ? ' ' + extraClass : ''}`;
  return `<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}

function initial(name) {
  if (!name) return '?';
  return String(name).trim().charAt(0).toUpperCase() || '?';
}

function renderTabs(activeTab) {
  const tabs = ['Goals', 'Grid', 'Board', 'Calendar', 'Charts'];
  const left = tabs.map((t) => {
    const isActive = t === activeTab;
    const cls = isActive ? 'ps-tab ps-tab--active' : 'ps-tab';
    return `<button type="button" class="${cls}">${fluentIcon(TAB_ICONS[t])}<span>${escapeHtml(t)}</span></button>`;
  }).join('');
  const right = `<div class="ps-tabs-right">${fluentIcon('filterTab', 'ps-tab-icon-only')}${fluentIcon('searchTab', 'ps-tab-icon-only')}</div>`;
  return left + right;
}

function renderTaskCard(task) {
  const recurrence = task.recurrence
    ? `<span class="ps-card-recurrence">${fluentIcon('recurrence')}</span>` : '';
  const labels = Array.isArray(task.labels) && task.labels.length
    ? `<div class="ps-card-labels">${task.labels.map(l =>
        `<span class="ps-card-label" style="background:${escapeHtml(l.color || '#5B5FC7')}"></span>`
      ).join('')}</div>` : '';
  const priority = task.priority && task.priority !== 'medium'
    ? `<span class="ps-card-priority" data-priority="${escapeHtml(task.priority)}" style="background:${PRIORITY_DOT[task.priority] || '#7A7A7A'}"></span>` : '';
  const due = task.dueText
    ? `<span class="ps-card-due">${fluentIcon('calendar')}<span>${escapeHtml(task.dueText)}</span></span>` : '';
  const assignees = Array.isArray(task.assignees) && task.assignees.length
    ? `<div class="ps-card-people">${task.assignees.slice(0, 4).map(p =>
        `<span class="ps-card-person" title="${escapeHtml(p.name || '')}">${escapeHtml(initial(p.name))}</span>`
      ).join('')}</div>` : '';
  const meta = (due || assignees) ? `<div class="ps-card-meta">${due}${assignees}</div>` : '';

  return `<div class="ps-card">
    ${labels}
    <div class="ps-card-row">
      ${recurrence}
      <div class="ps-card-title">${escapeHtml(task.title || '')}</div>
      ${priority}
    </div>
    ${meta}
    <span class="ps-card-overflow" aria-label="More actions">${fluentIcon('more')}</span>
  </div>`;
}

function renderBuckets(buckets) {
  if (!Array.isArray(buckets) || buckets.length === 0) {
    return `<div class="ps-buckets-empty">No buckets yet.</div>`;
  }
  return buckets.map((bucket) => {
    const help = bucket.hasHelpIcon
      ? `<span class="ps-bucket-help">?</span>` : '';
    const tasks = Array.isArray(bucket.tasks) ? bucket.tasks : [];
    const cards = tasks.map(renderTaskCard).join('');
    return `<div class="ps-bucket">
      <div class="ps-bucket-head">${help}<span class="ps-bucket-name">${escapeHtml(bucket.name || '')}</span></div>
      <button type="button" class="ps-add-task">+&nbsp; Add task</button>
      <div class="ps-bucket-body">${cards}</div>
    </div>`;
  }).join('') + `<button type="button" class="ps-add-bucket">Add a new bucket</button>`;
}

function renderDonut(card) {
  const total = card.value || 0;
  // Build SVG arcs from legend segments for multi-color donut ring
  const legend = Array.isArray(card.legend) ? card.legend : [];
  const legendTotal = legend.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0);
  let arcs = '';
  if (legendTotal > 0) {
    const R = 48, C = 2 * Math.PI * R;
    let offset = 0;
    arcs = legend.map(l => {
      const v = parseFloat(l.value) || 0;
      if (v === 0) return '';
      const frac = v / legendTotal;
      const dash = frac * C;
      const color = l.color ? (SEGMENT_COLORS[l.color] || l.color) : resolveSegmentColor(l.label || l.name || '');
      const arc = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${escapeHtml(color)}" stroke-width="20"`
        + ` stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}"`
        + ` stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 60 60)"/>`;
      offset += dash;
      return arc;
    }).join('');
  } else {
    arcs = `<circle cx="60" cy="60" r="48" fill="none" stroke="${SEGMENT_COLORS.notStarted}" stroke-width="20"/>`;
  }

  return `<div class="ps-chart-card">
    <div class="ps-chart-title">${escapeHtml(card.title || '')}</div>
    <div class="ps-chart-body">
      <div class="ps-donut">
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          ${arcs}
        </svg>
        <div class="ps-donut-value">
          <div class="ps-donut-num">${escapeHtml(total)}</div>
          <div class="ps-donut-label">${escapeHtml(card.label || '')}</div>
        </div>
      </div>
    </div>
    ${renderLegend(card.legend)}
  </div>`;
}

function renderBarChart(card) {
  const bars = Array.isArray(card.bars) ? card.bars : [];
  const maxVal = Math.max(1, ...bars.map(b => b.value || 0));
  const yTicks = [0, Math.ceil(maxVal / 4), Math.ceil(maxVal / 2), Math.ceil((3 * maxVal) / 4), maxVal];

  const yAxis = yTicks.slice().reverse().map(t =>
    `<div class="ps-chart-y-tick">${escapeHtml(t)}</div>`
  ).join('');

  const barsHtml = bars.map((b) => {
    const segs = Array.isArray(b.segments) && b.segments.length ? b.segments : [{ name: 'value', value: b.value || 0 }];
    const pct = ((b.value || 0) / maxVal) * 100;
    const segStack = segs.map((s) => {
      const segPct = ((s.value || 0) / maxVal) * 100;
      const color = resolveSegmentColor(s.name);
      return `<div class="ps-bar-seg" style="height:${segPct}%;background:${color}"></div>`;
    }).join('');
    return `<div class="ps-bar-col">
      <div class="ps-bar" style="height:${pct}%">${segStack}</div>
      <div class="ps-bar-label">${escapeHtml(b.label || '')}</div>
    </div>`;
  }).join('');

  return `<div class="ps-chart-card">
    <div class="ps-chart-title">${escapeHtml(card.title || '')}</div>
    <div class="ps-chart-body ps-chart-body--bar">
      <div class="ps-chart-y">${yAxis}</div>
      <div class="ps-chart-bars">${barsHtml}</div>
    </div>
    ${renderLegend(card.legend)}
  </div>`;
}

function renderLegend(legend) {
  if (!Array.isArray(legend) || legend.length === 0) return '';
  return `<div class="ps-chart-legend">${legend.map(l => {
    const color = l.color ? (SEGMENT_COLORS[l.color] || l.color) : resolveSegmentColor(l.label || l.name || '');
    return `<span class="ps-legend-item"><span class="ps-legend-swatch" style="background:${escapeHtml(color)}"></span><span>${escapeHtml(l.label || l.name || '')}</span></span>`;
  }).join('')}</div>`;
}

function renderCharts(chartCards) {
  if (!Array.isArray(chartCards) || chartCards.length === 0) {
    return `<div class="ps-charts-empty">No charts available.</div>`;
  }
  return `<div class="ps-charts-grid">${chartCards.map((c) =>
    c.type === 'donut' ? renderDonut(c) : renderBarChart(c)
  ).join('')}</div>`;
}

function renderTaskModal(task, planName) {
  if (!task) return '';
  const checklist = Array.isArray(task.checklistItems) && task.checklistItems.length
    ? task.checklistItems.map((it) =>
        `<div class="ps-checklist-item"><span class="ps-check ${it.done ? 'is-done' : ''}"></span><span>${escapeHtml(it.text || '')}</span></div>`
      ).join('')
    : `<div class="ps-checklist-empty"><span class="ps-check"></span><span class="ps-muted">Add steps to complete this task. Mark them done as you go.</span></div>`;

  const chatPanel = task.showChat !== false
    ? `<div class="ps-modal-chat">
        <div class="ps-chat-head">Task chat</div>
        <div class="ps-chat-body">
          <div class="ps-chat-empty">
            <div class="ps-chat-emoji">💬</div>
            <div class="ps-chat-empty-title">Start the conversation</div>
            <div class="ps-chat-empty-sub">Use @mentions to loop in teammates and emoji reactions to quickly share what you think.</div>
          </div>
        </div>
        <div class="ps-chat-input">
          <span class="ps-chat-placeholder">Type a message</span>
          <span class="ps-chat-send">${fluentIcon('send')}</span>
        </div>
      </div>` : '';

  const notes = task.notes
    ? `<div class="ps-notes-text">${escapeHtml(task.notes)}</div>`
    : `<div class="ps-notes-placeholder">Type a description or add notes here</div>`;

  return `<div class="ps-modal-scrim"></div>
    <div class="ps-modal" role="dialog">
      <div class="ps-modal-head">
        <span class="ps-modal-plan">${escapeHtml(planName || '')}</span>
        <span class="ps-modal-actions">
          <span class="ps-modal-icon-btn">${fluentIcon('ellipsis')}</span>
          <span class="ps-modal-icon-btn ps-modal-chat-toggle">${fluentIcon('chat')}</span>
          <span class="ps-modal-icon-btn">${fluentIcon('close')}</span>
        </span>
      </div>
      <div class="ps-modal-grid">
        <div class="ps-modal-main">
          <div class="ps-modal-title-row">
            ${fluentIcon('recurrence', 'ps-modal-icon-leading')}
            <div class="ps-modal-title">${escapeHtml(task.title || '')} <span class="ps-modal-title-ellipsis">…</span></div>
          </div>
          <div class="ps-modal-meta">${escapeHtml(task.createdMeta || '')} <span class="ps-modal-info-i">ⓘ</span></div>

          <div class="ps-modal-row">${fluentIcon('goal', 'ps-modal-row-icon')}<span class="ps-muted">Connect to a goal</span></div>
          <div class="ps-modal-row">${fluentIcon('label', 'ps-modal-row-icon')}<span class="ps-muted">Add label</span></div>
          <div class="ps-modal-row">${fluentIcon('assign', 'ps-modal-row-icon')}<span class="ps-muted">Assign to</span></div>

          <div class="ps-modal-pills">
            <button type="button" class="ps-pill-btn ps-pill-btn--active">${fluentIcon('details')}<span>Task details</span></button>
            <button type="button" class="ps-pill-btn">${fluentIcon('attachment')}<span>Attachments</span></button>
          </div>

          <div class="ps-field-grid">
            <div class="ps-field"><label>Status</label><div class="ps-field-input"><span class="ps-field-dot" style="background:#A6A6A6"></span><span>${escapeHtml(task.status || 'Not started')}</span><span class="ps-field-caret">${fluentIcon('caret')}</span></div></div>
            <div class="ps-field"><label>Priority</label><div class="ps-field-input"><span class="ps-field-dot" style="background:${PRIORITY_DOT[(task.priority || 'medium').toString().toLowerCase()] || PRIORITY_DOT.medium}"></span><span>${escapeHtml(task.priority ? task.priority[0].toUpperCase() + task.priority.slice(1) : 'Medium')}</span><span class="ps-field-caret">${fluentIcon('caret')}</span></div></div>
            <div class="ps-field"><label>Start date</label><div class="ps-field-input"><span class="ps-muted">${escapeHtml(task.startDate || 'Set start date')}</span><span class="ps-field-caret">${fluentIcon('calendar')}</span></div></div>
            <div class="ps-field"><label>Due date</label><div class="ps-field-input"><span class="ps-muted">${escapeHtml(task.dueDate || 'Set due date')}</span><span class="ps-field-caret">${fluentIcon('calendar')}</span></div></div>
            <div class="ps-field"><label>Repeat <span class="ps-modal-info-i">ⓘ</span></label><div class="ps-field-input">${fluentIcon('recurrence')}<span>${escapeHtml(task.repeat || 'Does not repeat')}</span><span class="ps-field-caret">${fluentIcon('caret')}</span></div></div>
            <div class="ps-field"><label>Bucket <span class="ps-modal-info-i">ⓘ</span></label><div class="ps-field-input">${fluentIcon('bucket')}<span>${escapeHtml(task.bucket || 'No bucket')}</span><span class="ps-field-caret">${fluentIcon('caret')}</span></div></div>
          </div>

          <div class="ps-section">
            <div class="ps-section-head">Checklist</div>
            <div class="ps-checklist">${checklist}</div>
          </div>

          <div class="ps-section">
            <div class="ps-section-head">Notes</div>
            ${notes}
          </div>
        </div>
        ${chatPanel}
      </div>
    </div>`;
}

function transformPlannerScene(props) {
  const variant = (props.variant || 'board').toLowerCase();
  if (!VALID_VARIANTS.has(variant)) {
    throw new Error(`PlannerScene: invalid variant "${props.variant}". Must be one of: ${[...VALID_VARIANTS].join(', ')}`);
  }
  const state = (props.state || 'default').toLowerCase();
  if (!VALID_STATES.has(state)) {
    throw new Error(`PlannerScene: invalid state "${props.state}". Must be one of: ${[...VALID_STATES].join(', ')}`);
  }
  const activeTab = props.activeTab || (variant === 'charts' ? 'Charts' : 'Board');
  if (!VALID_TABS.has(activeTab)) {
    throw new Error(`PlannerScene: invalid activeTab "${activeTab}". Must be one of: ${[...VALID_TABS].join(', ')}`);
  }

  // Validate task priorities and progress
  if (Array.isArray(props.buckets)) {
    props.buckets.forEach((bucket, bi) => {
      if (Array.isArray(bucket.tasks)) {
        bucket.tasks.forEach((task, ti) => {
          if (task.priority && !VALID_PRIORITIES.has(task.priority)) {
            throw new Error(`PlannerScene: bucket[${bi}].tasks[${ti}].priority="${task.priority}" invalid. Must be one of: ${[...VALID_PRIORITIES].join(', ')}`);
          }
          if (task.progress && !VALID_PROGRESS.has(task.progress)) {
            throw new Error(`PlannerScene: bucket[${bi}].tasks[${ti}].progress="${task.progress}" invalid. Must be one of: ${[...VALID_PROGRESS].join(', ')}`);
          }
        });
      }
    });
  }

  // Defaults forwarded for template
  props.variant = variant;
  props.state = state;
  props.activeTab = activeTab;
  props.planName = props.planName || 'My plan';
  props.breadcrumb = props.breadcrumb || 'My plans';
  props.groupBy = props.groupBy || 'Bucket';
  props.accountInitial = (props.accountInitial || 'A').toString().toUpperCase().charAt(0);
  const shouldShowModal = state === 'task-open' && !!props.selectedTask;
  props.hasModal = shouldShowModal;

  // ── Boolean normalization for data-attributes (Mustache renders false as "false") ──
  props.dataModal = shouldShowModal ? '1' : '0';

  // Slot rendering
  props.tabsHtml = renderTabs(activeTab);

  if (variant === 'board') {
    props.bodyHtml = `<div class="ps-buckets">${renderBuckets(props.buckets)}</div>`;
  } else {
    props.bodyHtml = renderCharts(props.chartCards);
  }

  props.modalHtml = shouldShowModal ? renderTaskModal(props.selectedTask, props.planName) : '';
}

export { transformPlannerScene };
export const __test__ = {
  renderTaskCard, renderBuckets, renderCharts, renderTaskModal,
  VALID_VARIANTS, VALID_STATES, VALID_TABS,
};
