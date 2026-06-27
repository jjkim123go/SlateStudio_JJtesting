// LoopScene — animation (Wave B, PR 8a)
// Variants: meetingNotes (Wave A — back-compat protected), taskList, kanbanBoard, tableDatabase
//
// Compliance:
//   Rule #7 — DOM built once at module setup; no innerHTML in tween callbacks.
//   SR #15 — Fluent UI 2 Filled icons (no emoji-as-icon).
//   SR #16 — All animation registered on the master timeline (no gsap.timeline).
//   No onUpdate calls.
//
// Tween budget: ~30 max concurrent (under 30-tween cap) per variant.
//
// Variant routing: fail-closed switch dispatcher. Unknown variants throw.

(function initLoopScene() {
  var prefix = '.scene-' + SCENE_ID;
  var root = document.querySelector(prefix + ' .loop-root');
  if (!root) return;

  var props = (typeof SCENE_PROPS === 'object' && SCENE_PROPS) ? SCENE_PROPS : {};
  var variant = props.variant || 'meetingNotes';
  root.setAttribute('data-variant', variant);

  // ============================================================
  // SHARED HELPERS
  // ============================================================
  function $(sel)  { return root.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function initials(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    return ((parts[0][0] || '') + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function avatarBg(name) {
    var palette = ['#0078D4','#107C10','#C239B3','#E8770E','#5C2D91','#038387','#CA5010','#8378DE'];
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }
  function makeAvatar(name, size, presence) {
    var a = el('span', 'loop-avatar');
    a.textContent = initials(name);
    a.style.background = avatarBg(name);
    if (size) { a.style.width = size + 'px'; a.style.height = size + 'px'; }
    if (presence) a.setAttribute('data-presence', '1');
    return a;
  }
  function fluentTickSvg() {
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', 'M3.2 8.4 L6.4 11.6 L12.8 4.8');
    svg.appendChild(p);
    return svg;
  }
  function cursorArrowSvg(fill) {
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'loop-cursor-arrow');
    svg.setAttribute('viewBox', '0 0 18 18');
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', 'M2 1 L2 14 L5.5 10.5 L8 16 L10.5 14.8 L8 9.5 L13 9.5 Z');
    p.setAttribute('fill', fill);
    p.setAttribute('stroke', '#FFFFFF');
    p.setAttribute('stroke-width', '0.8');
    p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
    return svg;
  }

  // ============================================================
  // SHARED REFS
  // ============================================================
  var canvasBody    = $('[data-slot="canvas-body"]');
  var canvasFrame   = $('[data-slot="canvas-frame"]');
  var copilotBody   = $('[data-slot="copilot-body"]');
  var copilotStatus = $('[data-slot="copilot-status"]');
  var appbarAvatars = $('[data-slot="appbar-avatars"]');

  // Default cast (Wave A used Avery/Jordan/Sam/Morgan/Taylor; Wave B introduces
  // Maya Lopez and Tariq Quinn for new variants but defaults preserve Wave A
  // behaviour when SCENE_PROPS.attendees is supplied or omitted).
  var attendees = (props.attendees && props.attendees.length)
    ? props.attendees
    : ['Avery Chen', 'Jordan Park', 'Sam Rivera', 'Morgan Lee', 'Taylor Quinn'];
  if (appbarAvatars) {
    for (var ai = 0; ai < attendees.length && ai < 5; ai++) {
      appbarAvatars.appendChild(makeAvatar(attendees[ai], 28, ai < 3 ? 1 : 0));
    }
  }

  // Live cursor wrapper — created on demand by variants that need it
  var liveCursor = null;
  function ensureLiveCursor(name, accent) {
    if (liveCursor) return liveCursor;
    liveCursor = el('div', 'loop-cursor');
    liveCursor.appendChild(cursorArrowSvg(accent));
    var pill = el('span', 'loop-cursor-pill', name);
    pill.style.background = accent;
    liveCursor.appendChild(pill);
    if (canvasFrame) canvasFrame.appendChild(liveCursor);
    return liveCursor;
  }

  // ============================================================
  // SHARED COPILOT SUGGESTIONS (token-stream reveal infra)
  // ============================================================
  function populateCopilotSuggestions(suggestions) {
    var tokens = [];
    if (!copilotBody) return tokens;
    for (var s = 0; s < suggestions.length; s++) {
      var sug = el('div', 'loop-copilot-suggest');
      var text = String(suggestions[s]);
      var idx = 0;
      var tokIndex = 0;
      while (idx < text.length) {
        var groupLen = 2 + (tokIndex % 3);
        var chunk = text.substr(idx, groupLen);
        var span = el('span', 'loop-copilot-tok', chunk);
        sug.appendChild(span);
        tokens.push({ span: span, suggestionIndex: s, tokenIndex: tokIndex });
        idx += groupLen;
        tokIndex++;
      }
      copilotBody.appendChild(sug);
    }
    return tokens;
  }

  // ============================================================
  // SHARED CHROME ANIMATIONS
  //   Registers the appbar/rail/canvas-body intro fades, FAB pulse, copilot
  //   panel slide-in, token streaming, and final scene exit. The set of tweens
  //   produced here is identical to Wave A's chrome registrations — back-compat
  //   for meetingNotes is anchored on this function being called with the same
  //   suggestion tokens, status text, and panel-in time as before.
  // ============================================================
  function animateChrome(suggestionTokens, statusSwapText, panelInTime) {
    var SS = SCENE_START;
    var panelIn = (panelInTime != null) ? panelInTime : (SS + 6.00);

    // 1. Chrome fade-in
    master.from(prefix + ' .loop-appbar',
      { opacity: 0, y: -8, duration: 0.35, ease: 'power2.out' },
      SS + 0.10);
    master.from(prefix + ' .loop-rail',
      { opacity: 0, x: -16, duration: 0.40, ease: 'power2.out' },
      SS + 0.20);
    master.from(prefix + ' .loop-rail-item, ' + prefix + ' .loop-rail-create',
      { opacity: 0, y: 8, duration: 0.30, ease: 'power2.out', stagger: 0.04 },
      SS + 0.30);

    // 2. Canvas body content stagger
    master.from(prefix + ' .loop-canvas-body > *',
      { opacity: 0, y: 12, duration: 0.40, ease: 'power2.out', stagger: 0.05 },
      SS + 0.50);

    // 6. Copilot panel slide-in
    master.set(prefix + ' .loop-copilot-panel',
      { xPercent: 100, x: 0, opacity: 0 }, SS);
    master.to(prefix + ' .loop-copilot-panel',
      { x: 0, opacity: 1, duration: 0.30, ease: 'power3.out',
        onStart: function () {
          var p = $('[data-slot="copilot-panel"]');
          if (p) gsap.set(p, { xPercent: 0 });
        }
      },
      panelIn);

    // 7. Status text swap
    master.call(function () {
      if (copilotStatus) copilotStatus.textContent = statusSwapText || 'Suggested follow-ups:';
    }, [], panelIn + 0.40);

    // 8. Token streaming
    var streamStart = panelIn + 0.55;
    for (var t = 0; t < suggestionTokens.length; t++) {
      master.to(suggestionTokens[t].span,
        { opacity: 1, duration: 0.05, ease: 'none' },
        streamStart + t * 0.045);
    }

    // 9. Diamond pulse (FAB)
    master.to(prefix + ' .loop-copilot-fab',
      { keyframes: [
          { scale: 1.08, duration: 0.30, ease: 'power2.out' },
          { scale: 1.00, duration: 0.30, ease: 'power2.in' }
        ],
        repeat: -1,
        repeatDelay: 1.80
      },
      SS + 1.00);
    master.to(prefix + ' .loop-copilot-fab-halo',
      { keyframes: [
          { opacity: 0.7, scale: 1.00, duration: 0.30, ease: 'power2.out' },
          { opacity: 0,   scale: 1.35, duration: 0.50, ease: 'power2.out' }
        ],
        repeat: -1,
        repeatDelay: 1.60
      },
      SS + 1.00);

    // 10. Scene exit
    master.to(prefix + ' .loop-root',
      { opacity: 0, duration: 0.45, ease: 'power2.in' },
      SS + SCENE_DURATION - 0.45);
  }

  // ============================================================
  // VARIANT 1 — meetingNotes (Wave A; back-compat protected)
  // ============================================================
  var meetingNotesActionItemEls = [];

  function buildMeetingNotes() {
    if (!canvasBody) return;
    var pageTitle = props.pageTitle || 'Q3 Planning — Sync Notes';
    var pageMeta  = props.pageMeta  || 'Updated just now · 5 contributors';
    var agenda    = props.agenda    || ['Roadmap commitments', 'Open dependencies', 'Risk review'];
    var discussion = props.discussion ||
      'Aligned on shipping the new ingest pipeline by end of Q3. Two integration risks logged below; owners assigned.';
    var actionItems = props.actionItems || [
      { text: 'Draft kickoff doc',          assignee: 'Avery Chen',   due: 'Fri' },
      { text: 'Review API contracts',       assignee: 'Jordan Park',  due: 'Mon' },
      { text: 'Schedule stakeholder demo',  assignee: 'Sam Rivera',   due: 'Wed' }
    ];

    var bc = el('div', 'loop-mn-breadcrumb');
    bc.appendChild(el('span', null, 'Platform Team'));
    bc.appendChild(el('span', 'loop-mn-breadcrumb-sep', '›'));
    bc.appendChild(el('span', null, 'Sync notes'));
    bc.appendChild(el('span', 'loop-mn-breadcrumb-sep', '›'));
    bc.appendChild(el('span', null, pageTitle));
    canvasBody.appendChild(bc);

    canvasBody.appendChild(el('h1', 'loop-mn-title', pageTitle));
    canvasBody.appendChild(el('div', 'loop-mn-meta', pageMeta));

    var attSec = el('section', 'loop-mn-section');
    attSec.appendChild(el('h2', 'loop-mn-h2', 'Attendees'));
    var attRow = el('div', 'loop-mn-attendees');
    for (var i = 0; i < attendees.length; i++) {
      var pill = el('span', 'loop-mn-attendee-pill');
      pill.appendChild(makeAvatar(attendees[i], 22, 0));
      pill.appendChild(el('span', null, attendees[i]));
      attRow.appendChild(pill);
    }
    attSec.appendChild(attRow);
    canvasBody.appendChild(attSec);

    var agSec = el('section', 'loop-mn-section');
    agSec.appendChild(el('h2', 'loop-mn-h2', 'Agenda'));
    for (var j = 0; j < agenda.length; j++) {
      agSec.appendChild(el('div', 'loop-mn-bullet', agenda[j]));
    }
    canvasBody.appendChild(agSec);

    var disSec = el('section', 'loop-mn-section');
    disSec.appendChild(el('h2', 'loop-mn-h2', 'Discussion'));
    var dp = el('p', null, discussion);
    dp.style.fontSize = '15px';
    dp.style.lineHeight = '1.55';
    dp.style.color = 'var(--loop-fg-1)';
    dp.style.margin = '0';
    disSec.appendChild(dp);
    canvasBody.appendChild(disSec);

    var aiSec = el('section', 'loop-mn-section');
    aiSec.appendChild(el('h2', 'loop-mn-h2', 'Action items'));
    for (var k = 0; k < actionItems.length; k++) {
      var item = actionItems[k];
      var row = el('div', 'loop-mn-task');

      var cb = el('span', 'loop-mn-checkbox');
      var tickWrap = el('span', 'loop-mn-checkbox-tick');
      tickWrap.appendChild(fluentTickSvg());
      tickWrap.style.opacity = '0';
      cb.appendChild(tickWrap);

      var textWrap = el('span', 'loop-mn-task-text');
      textWrap.appendChild(document.createTextNode(item.text));
      var strike = el('span', 'loop-mn-task-strike');
      textWrap.appendChild(strike);

      var assigneePill = el('span', 'loop-mn-task-assignee');
      assigneePill.appendChild(makeAvatar(item.assignee, 18, 0));
      assigneePill.appendChild(el('span', null, item.assignee.split(' ')[0]));

      var due = el('span', 'loop-mn-task-due', 'Due ' + item.due);

      row.appendChild(cb);
      row.appendChild(textWrap);
      row.appendChild(assigneePill);
      row.appendChild(due);
      aiSec.appendChild(row);

      meetingNotesActionItemEls.push({ row: row, checkbox: cb, tick: tickWrap, text: textWrap, strike: strike });
    }
    canvasBody.appendChild(aiSec);

    var lc = props.liveCursor || { name: 'Jordan', accentHex: '#E8770E' };
    ensureLiveCursor(lc.name, lc.accentHex);
  }

  function animateMeetingNotes() {
    var SS = SCENE_START;

    function computeWaypoints() {
      if (!liveCursor || meetingNotesActionItemEls.length < 2) return null;
      if (!canvasFrame) return null;
      var frameRect = canvasFrame.getBoundingClientRect();
      var targetCb = meetingNotesActionItemEls[1].checkbox;
      var tRect = targetCb.getBoundingClientRect();

      var x0 = frameRect.width * 0.78;
      var y0 = -20;
      var x2 = (tRect.left - frameRect.left) + tRect.width / 2;
      var y2 = (tRect.top  - frameRect.top)  + tRect.height / 2;
      var x1 = (x0 + x2) / 2 + 60;
      var y1 = (y0 + y2) / 2 - 80;

      var STEPS = 18;
      var pts = [];
      for (var i = 0; i <= STEPS; i++) {
        var t = i / STEPS;
        var omt = 1 - t;
        var x = omt * omt * x0 + 2 * omt * t * x1 + t * t * x2;
        var y = omt * omt * y0 + 2 * omt * t * y1 + t * t * y2;
        pts.push({ x: x, y: y });
      }
      return pts;
    }

    var cursorFlightStart = SS + 1.50;
    master.set(prefix + ' .loop-cursor', { opacity: 0 }, SS);
    master.call(function () {
      if (!liveCursor) return;
      var waypoints = computeWaypoints();
      if (!waypoints || !waypoints.length) return;
      gsap.set(liveCursor, { x: waypoints[0].x, y: waypoints[0].y, opacity: 0 });
      var keyframes = [];
      for (var w = 1; w < waypoints.length; w++) {
        keyframes.push({ x: waypoints[w].x, y: waypoints[w].y, duration: 0.10, ease: 'none' });
      }
      gsap.to(liveCursor, { opacity: 1, duration: 0.20, ease: 'power2.out' });
      gsap.to(liveCursor, { keyframes: keyframes, ease: 'power2.inOut' });
    }, [], cursorFlightStart);

    master.call(function () {
      if (meetingNotesActionItemEls.length < 2) return;
      var item = meetingNotesActionItemEls[1];
      item.checkbox.setAttribute('data-done', '1');
    }, [], SS + 4.00);

    // Use cached element refs — the ":nth-child(2)" selector matched the wrong
    // element (the section's <h2> heading is child #1, so :nth-child(2) hit
    // the FIRST task row, not the SECOND). Cached refs are heading-agnostic.
    var targetItem = meetingNotesActionItemEls[1];

    master.fromTo(targetItem.tick,
      { opacity: 0, scale: 0.4 },
      { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' },
      SS + 4.05);

    master.to(targetItem.strike,
      { scaleX: 1, duration: 0.40, ease: 'power2.out' },
      SS + 4.30);

    master.to(targetItem.text,
      { opacity: 0.55, duration: 0.30, ease: 'power2.out' },
      SS + 4.45);

    master.to(prefix + ' .loop-cursor',
      { opacity: 0, duration: 0.30, ease: 'power2.in' },
      SS + 5.20);

    var suggestions = props.copilotSuggestions || [
      'Summarize the discussion section',
      'Send action items to Teams chat',
      'Draft a status update for stakeholders'
    ];
    var tokens = populateCopilotSuggestions(suggestions);
    animateChrome(tokens, 'Suggested follow-ups:', SS + 6.00);
  }

  // ============================================================
  // VARIANT 2 — taskList
  // ============================================================
  var taskListEls = [];

  function buildTaskList() {
    if (!canvasBody) return;
    var pageTitle = props.pageTitle || 'Sprint 47 — Open work';
    var pageMeta  = props.pageMeta  || 'Updated just now · 7 active tasks';

    var bc = el('div', 'loop-mn-breadcrumb');
    bc.appendChild(el('span', null, 'Platform Team'));
    bc.appendChild(el('span', 'loop-mn-breadcrumb-sep', '›'));
    bc.appendChild(el('span', null, 'Tasks'));
    bc.appendChild(el('span', 'loop-mn-breadcrumb-sep', '›'));
    bc.appendChild(el('span', null, pageTitle));
    canvasBody.appendChild(bc);

    canvasBody.appendChild(el('h1', 'loop-mn-title', pageTitle));
    canvasBody.appendChild(el('div', 'loop-mn-meta', pageMeta));

    var sec = el('section', 'loop-mn-section');
    sec.appendChild(el('h2', 'loop-mn-h2', 'Open tasks'));

    var tasks = props.tasks || [
      { text: 'Wire up retry policy on ingest worker', assignee: 'Avery Chen',   due: 'Today',    priority: 'high' },
      { text: 'Land schema migration (rev 0042)',      assignee: 'Jordan Park',  due: 'Tomorrow', priority: 'high' },
      { text: 'Draft postmortem for Sev3 #6021',       assignee: 'Sam Rivera',   due: 'Thu',      priority: 'med'  },
      { text: 'Triage telemetry backlog',              assignee: 'Maya Lopez',   due: 'Fri',      priority: 'med'  },
      { text: 'Write runbook for failover drill',      assignee: 'Tariq Quinn',  due: 'Mon',      priority: 'low'  },
      { text: 'Code review: PR #4421',                 assignee: 'Avery Chen',   due: 'Today',    priority: 'med'  },
      { text: 'Update on-call rotation doc',           assignee: 'Jordan Park',  due: 'Wed',      priority: 'low'  }
    ];

    var list = el('div', 'loop-tasks-list');
    sec.appendChild(list);

    function buildRow(task, isStream) {
      var row = el('div', 'loop-tasks-row');
      if (isStream) row.setAttribute('data-stream', '1');

      var cb = el('span', 'loop-mn-checkbox');
      var tickWrap = el('span', 'loop-mn-checkbox-tick');
      tickWrap.appendChild(fluentTickSvg());
      tickWrap.style.opacity = '0';
      cb.appendChild(tickWrap);

      var textWrap = el('span', 'loop-tasks-text');
      var spans = [];
      if (isStream) {
        var idx = 0; var tIdx = 0;
        while (idx < task.text.length) {
          var groupLen = 2 + (tIdx % 3);
          var chunk = task.text.substr(idx, groupLen);
          var span = el('span', 'loop-tasks-tok', chunk);
          textWrap.appendChild(span);
          spans.push(span);
          idx += groupLen;
          tIdx++;
        }
      } else {
        textWrap.appendChild(document.createTextNode(task.text));
      }
      var strike = el('span', 'loop-mn-task-strike');
      textWrap.appendChild(strike);

      var assigneePill = el('span', 'loop-mn-task-assignee');
      assigneePill.appendChild(makeAvatar(task.assignee, 18, 0));
      assigneePill.appendChild(el('span', null, task.assignee.split(' ')[0]));

      var due = el('span', 'loop-mn-task-due', 'Due ' + task.due);

      var dot = el('span', 'loop-tasks-priority');
      dot.setAttribute('data-priority', task.priority || 'med');

      row.appendChild(cb);
      row.appendChild(textWrap);
      row.appendChild(assigneePill);
      row.appendChild(due);
      row.appendChild(dot);
      list.appendChild(row);
      taskListEls.push({ row: row, checkbox: cb, tick: tickWrap, text: textWrap, strike: strike, tokSpans: spans });
    }

    for (var i = 0; i < tasks.length; i++) buildRow(tasks[i], false);

    var followUps = props.followUps || [
      { text: 'Sync with Tariq on capacity plan',   assignee: 'Maya Lopez',  due: 'Fri', priority: 'med'  },
      { text: 'File ICM review for Tuesday outage', assignee: 'Avery Chen',  due: 'Tue', priority: 'high' }
    ];
    for (var f = 0; f < followUps.length; f++) buildRow(followUps[f], true);

    canvasBody.appendChild(sec);
  }

  function animateTaskList() {
    var SS = SCENE_START;
    var origTaskCount = taskListEls.length - 2;

    for (var i = origTaskCount; i < taskListEls.length; i++) {
      var item = taskListEls[i];
      master.set(item.row, { opacity: 0, y: 8 }, SS);
      for (var t = 0; t < item.tokSpans.length; t++) {
        master.set(item.tokSpans[t], { opacity: 0 }, SS);
      }
    }

    master.from(prefix + ' .loop-tasks-list .loop-tasks-row:nth-child(-n+' + origTaskCount + ')',
      { opacity: 0, y: 6, duration: 0.30, ease: 'power2.out', stagger: 0.05 },
      SS + 0.95);

    var streamRowStart = SS + 7.30;
    for (var s = 0; s < 2; s++) {
      var row = taskListEls[origTaskCount + s];
      master.to(row.row,
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        streamRowStart + s * 0.45);
      var tokenStart = streamRowStart + s * 0.45 + 0.10;
      for (var k = 0; k < row.tokSpans.length; k++) {
        master.to(row.tokSpans[k],
          { opacity: 1, duration: 0.05, ease: 'none' },
          tokenStart + k * 0.035);
      }
    }

    var tickRow = taskListEls[3];
    master.call(function () { tickRow.checkbox.setAttribute('data-done', '1'); }, [], SS + 9.40);
    master.fromTo(tickRow.tick,
      { opacity: 0, scale: 0.4 },
      { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' },
      SS + 9.45);
    master.to(tickRow.strike,
      { scaleX: 1, duration: 0.40, ease: 'power2.out' },
      SS + 9.70);
    master.to(tickRow.text,
      { opacity: 0.55, duration: 0.30, ease: 'power2.out' },
      SS + 9.85);

    var suggestions = props.copilotSuggestions || [
      "Add follow-ups from Tuesday's call",
      'Reassign overdue items',
      'Mark completed tasks as done'
    ];
    var tokens = populateCopilotSuggestions(suggestions);
    animateChrome(tokens, 'Suggested follow-ups:', SS + 5.50);
  }

  // ============================================================
  // VARIANT 3 — kanbanBoard
  // ============================================================
  var kanbanCols = [];
  var kanbanDragCard = null;
  var kanbanNewCard = null;

  function buildKanban() {
    if (!canvasBody) return;
    var pageTitle = props.pageTitle || 'Q3 Engineering Board';
    var pageMeta  = props.pageMeta  || 'Updated just now · 9 cards';

    var bc = el('div', 'loop-mn-breadcrumb');
    bc.appendChild(el('span', null, 'Platform Team'));
    bc.appendChild(el('span', 'loop-mn-breadcrumb-sep', '›'));
    bc.appendChild(el('span', null, 'Boards'));
    bc.appendChild(el('span', 'loop-mn-breadcrumb-sep', '›'));
    bc.appendChild(el('span', null, pageTitle));
    canvasBody.appendChild(bc);

    canvasBody.appendChild(el('h1', 'loop-mn-title', pageTitle));
    canvasBody.appendChild(el('div', 'loop-mn-meta', pageMeta));

    var board = el('div', 'loop-kb-board');
    var cols = props.columns || [
      { name: 'Backlog',     count: 4, tag: 'planning' },
      { name: 'In Progress', count: 3, tag: 'active'   },
      { name: 'Done',        count: 2, tag: 'done'     }
    ];
    var cards = props.cards || [
      { col: 0, title: 'Schema migration rev 0042', assignee: 'Jordan Park',  due: 'Mon',   tag: 'infra'    },
      { col: 0, title: 'Retry policy: ingest path', assignee: 'Avery Chen',   due: 'Tue',   tag: 'infra'    },
      { col: 0, title: 'On-call doc refresh',       assignee: 'Tariq Quinn',  due: 'Thu',   tag: 'docs'     },
      { col: 0, title: 'Sev3 postmortem #6021',     assignee: 'Sam Rivera',   due: 'Wed',   tag: 'review'   },
      { col: 1, title: 'Failover drill rehearsal',  assignee: 'Maya Lopez',   due: 'Today', tag: 'ops'      },
      { col: 1, title: 'PR #4421 review',           assignee: 'Avery Chen',   due: 'Today', tag: 'review'   },
      { col: 1, title: 'Telemetry triage Q3',       assignee: 'Jordan Park',  due: 'Fri',   tag: 'data'     },
      { col: 2, title: 'Capacity plan v2',          assignee: 'Tariq Quinn',  due: '—',     tag: 'planning' },
      { col: 2, title: 'Auth rotation runbook',     assignee: 'Sam Rivera',   due: '—',     tag: 'security' }
    ];

    for (var c = 0; c < cols.length; c++) {
      var col = el('div', 'loop-kb-col');
      var head = el('div', 'loop-kb-col-head');
      head.appendChild(el('span', 'loop-kb-col-name', cols[c].name));
      var countEl = el('span', 'loop-kb-col-count', String(cols[c].count));
      head.appendChild(countEl);
      col.appendChild(head);
      var slot = el('div', 'loop-kb-col-slot');
      col.appendChild(slot);
      board.appendChild(col);
      kanbanCols.push({ slot: slot, cards: [], countEl: countEl, count: cols[c].count });
    }

    function buildCard(card) {
      var k = el('div', 'loop-kb-card');
      var titleRow = el('div', 'loop-kb-card-title', card.title);
      var meta = el('div', 'loop-kb-card-meta');
      meta.appendChild(makeAvatar(card.assignee, 20, 0));
      var due = el('span', 'loop-mn-task-due', card.due);
      meta.appendChild(due);
      var tag = el('span', 'loop-kb-card-tag', card.tag);
      meta.appendChild(tag);
      k.appendChild(titleRow);
      k.appendChild(meta);
      return k;
    }

    for (var i = 0; i < cards.length; i++) {
      var k = buildCard(cards[i]);
      kanbanCols[cards[i].col].slot.appendChild(k);
      kanbanCols[cards[i].col].cards.push(k);
    }

    kanbanDragCard = kanbanCols[0].cards[0];

    var newCardData = props.newCard || {
      col: 0, title: 'Demo dry-run', assignee: 'Maya Lopez', due: 'Fri', tag: 'planning'
    };
    kanbanNewCard = buildCard(newCardData);
    kanbanNewCard.style.opacity = '0';
    kanbanNewCard.setAttribute('data-newcard', '1');
    kanbanCols[newCardData.col].slot.appendChild(kanbanNewCard);

    canvasBody.appendChild(board);

    var lc = props.liveCursor || { name: 'Avery', accentHex: '#0078D4' };
    ensureLiveCursor(lc.name, lc.accentHex);
  }

  function animateKanban() {
    var SS = SCENE_START;

    if (kanbanNewCard) master.set(kanbanNewCard, { opacity: 0, y: 8 }, SS);

    master.from(prefix + ' .loop-kb-card:not([data-newcard="1"])',
      { opacity: 0, scale: 0.92, y: 6, duration: 0.30, ease: 'back.out(1.6)', stagger: 0.05 },
      SS + 1.10);

    master.set(prefix + ' .loop-cursor', { opacity: 0 }, SS);
    master.call(function () {
      if (!liveCursor || !kanbanDragCard || !canvasFrame) return;
      var frameRect = canvasFrame.getBoundingClientRect();
      var srcRect = kanbanDragCard.getBoundingClientRect();
      var x0 = frameRect.width * 0.85;
      var y0 = -20;
      var x2 = (srcRect.left - frameRect.left) + srcRect.width / 2;
      var y2 = (srcRect.top  - frameRect.top)  + srcRect.height / 2;
      var x1 = (x0 + x2) / 2 + 40;
      var y1 = (y0 + y2) / 2 - 60;
      var STEPS = 16;
      var pts = [];
      for (var i = 0; i <= STEPS; i++) {
        var t = i / STEPS;
        var omt = 1 - t;
        pts.push({
          x: omt*omt*x0 + 2*omt*t*x1 + t*t*x2,
          y: omt*omt*y0 + 2*omt*t*y1 + t*t*y2
        });
      }
      gsap.set(liveCursor, { x: pts[0].x, y: pts[0].y, opacity: 0 });
      gsap.to(liveCursor, { opacity: 1, duration: 0.20, ease: 'power2.out' });
      var keyframes = [];
      for (var w = 1; w < pts.length; w++) {
        keyframes.push({ x: pts[w].x, y: pts[w].y, duration: 0.10, ease: 'none' });
      }
      gsap.to(liveCursor, { keyframes: keyframes, ease: 'power2.inOut' });
    }, [], SS + 1.60);

    master.to(kanbanDragCard,
      { scale: 1.03, boxShadow: '0 8px 20px rgba(0,0,0,0.18)', duration: 0.25, ease: 'power2.out' },
      SS + 3.50);

    // Drag motion: measure src/dst positions in an early callback (DOM is laid
    // out by then), stash dx/dy on closure, then promote the actual positional
    // motion to the master timeline so it scrubs deterministically with the
    // renderer's frame-by-frame capture (CONTRACT §4.4 — wallclock divorce).
    var dragDx = 0, dragDy = 0;
    var cursorStartX = 0, cursorStartY = 0;
    var cursorEndX = 0, cursorEndY = 0;
    master.call(function () {
      if (!kanbanDragCard || !canvasFrame || !kanbanCols[1]) return;
      var srcRect = kanbanDragCard.getBoundingClientRect();
      var dstRect = kanbanCols[1].slot.getBoundingClientRect();
      dragDx = (dstRect.left - srcRect.left) + 16;
      dragDy = (dstRect.top  - srcRect.top)  + (kanbanCols[1].slot.children.length * 8);
      var ctRect = canvasFrame.getBoundingClientRect();
      cursorStartX = (srcRect.left - ctRect.left) + srcRect.width / 2;
      cursorStartY = (srcRect.top  - ctRect.top)  + srcRect.height / 2;
      cursorEndX = (dstRect.left - ctRect.left) + 80;
      cursorEndY = (dstRect.top  - ctRect.top)  + 40;
    }, [], SS + 3.55);

    master.fromTo(kanbanDragCard,
      { x: 0, y: 0 },
      { x: function () { return dragDx; },
        y: function () { return dragDy; },
        duration: 0.80, ease: 'power2.inOut' },
      SS + 3.85);

    master.fromTo(prefix + ' .loop-cursor',
      { x: function () { return cursorStartX; },
        y: function () { return cursorStartY; } },
      { x: function () { return cursorEndX; },
        y: function () { return cursorEndY; },
        duration: 0.80, ease: 'power2.inOut' },
      SS + 3.85);

    // Drop instant: update column counts (Backlog -1, In Progress +1).
    master.call(function () {
      if (kanbanCols[0] && kanbanCols[0].countEl) {
        kanbanCols[0].countEl.textContent = String(kanbanCols[0].count - 1);
      }
      if (kanbanCols[1] && kanbanCols[1].countEl) {
        kanbanCols[1].countEl.textContent = String(kanbanCols[1].count + 1);
      }
    }, [], SS + 4.65);

    master.to(kanbanDragCard,
      { scale: 1.00, boxShadow: '0 1px 2px rgba(0,0,0,0.10)', duration: 0.25, ease: 'power2.out' },
      SS + 4.80);

    master.to(prefix + ' .loop-cursor',
      { opacity: 0, duration: 0.30, ease: 'power2.in' },
      SS + 5.40);

    if (kanbanNewCard) {
      master.to(kanbanNewCard,
        { opacity: 1, y: 0, duration: 0.40, ease: 'back.out(1.7)' },
        SS + 8.30);
    }

    var suggestions = props.copilotSuggestions || [
      "Add 'Demo dry-run' as follow-up?",
      'Promote Backlog candidates to In Progress',
      'Notify owners of moved cards'
    ];
    var tokens = populateCopilotSuggestions(suggestions);
    animateChrome(tokens, 'Suggested follow-ups:', SS + 6.20);
  }

  // ============================================================
  // VARIANT 4 — tableDatabase
  // ============================================================
  var tableRowEls = [];
  var tableFilterChips = [];
  var tableNewColCells = [];
  var tableMorphBadge = null;
  var tableMorphToast = null;

  function buildTable() {
    if (!canvasBody) return;
    var pageTitle = props.pageTitle || 'Q3 Feature Launches';
    var pageMeta  = props.pageMeta  || 'Updated just now · 8 features tracked';

    var bc = el('div', 'loop-mn-breadcrumb');
    bc.appendChild(el('span', null, 'Platform Team'));
    bc.appendChild(el('span', 'loop-mn-breadcrumb-sep', '›'));
    bc.appendChild(el('span', null, 'Databases'));
    bc.appendChild(el('span', 'loop-mn-breadcrumb-sep', '›'));
    bc.appendChild(el('span', null, pageTitle));
    canvasBody.appendChild(bc);

    canvasBody.appendChild(el('h1', 'loop-mn-title', pageTitle));
    canvasBody.appendChild(el('div', 'loop-mn-meta', pageMeta));

    var chips = el('div', 'loop-tbl-chips');
    var filters = ['All', 'On Track', 'At Risk', 'Done'];
    for (var f = 0; f < filters.length; f++) {
      var chip = el('span', 'loop-tbl-chip', filters[f]);
      if (f === 0) chip.setAttribute('data-active', '1');
      chips.appendChild(chip);
      tableFilterChips.push(chip);
    }
    canvasBody.appendChild(chips);

    var tbl = el('div', 'loop-tbl');
    var head = el('div', 'loop-tbl-row loop-tbl-head');
    var headers = ['Feature', 'Owner', 'Status', 'Target Date', 'Region', 'Risk'];
    for (var h = 0; h < headers.length; h++) head.appendChild(el('span', 'loop-tbl-cell', headers[h]));
    var newColHead = el('span', 'loop-tbl-cell loop-tbl-newcol', 'Mitigation');
    head.appendChild(newColHead);
    tableNewColCells.push(newColHead);
    tbl.appendChild(head);

    var rows = props.rows || [
      { feature: 'Adaptive ingest',     owner: 'Avery Chen',  status: 'On Track', date: 'Sep 14', region: 'WUS3', risk: 'Low',  mitigation: 'None' },
      { feature: 'Schema migration v4', owner: 'Jordan Park', status: 'At Risk',  date: 'Sep 21', region: 'EUS2', risk: 'High', mitigation: 'Rollback drill' },
      { feature: 'Failover drill',      owner: 'Maya Lopez',  status: 'On Track', date: 'Sep 28', region: 'WEU',  risk: 'Med',  mitigation: 'Comms plan' },
      { feature: 'Cost ceilings',       owner: 'Tariq Quinn', status: 'At Risk',  date: 'Oct 05', region: 'WUS3', risk: 'High', mitigation: 'Budget review' },
      { feature: 'Telemetry v3',        owner: 'Sam Rivera',  status: 'Done',     date: 'Aug 30', region: 'EUS2', risk: 'Low',  mitigation: 'Shipped' },
      { feature: 'Auth rotation',       owner: 'Avery Chen',  status: 'On Track', date: 'Oct 12', region: 'WEU',  risk: 'Low',  mitigation: 'None' },
      { feature: 'Capacity plan',       owner: 'Jordan Park', status: 'Done',     date: 'Aug 20', region: 'WUS3', risk: 'Low',  mitigation: 'Shipped' },
      { feature: 'Postmortem 6021',     owner: 'Sam Rivera',  status: 'On Track', date: 'Sep 18', region: 'EUS2', risk: 'Med',  mitigation: 'Owner aligned' }
    ];

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var row = el('div', 'loop-tbl-row');
      row.setAttribute('data-status', r.status);
      row.appendChild(el('span', 'loop-tbl-cell', r.feature));

      var ownerCell = el('span', 'loop-tbl-cell loop-tbl-owner');
      ownerCell.appendChild(makeAvatar(r.owner, 18, 0));
      ownerCell.appendChild(el('span', null, r.owner.split(' ')[0]));
      row.appendChild(ownerCell);

      var statusCell = el('span', 'loop-tbl-cell');
      var badge = el('span', 'loop-tbl-badge', r.status);
      badge.setAttribute('data-state', r.status);
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      if (i === 3) {
        tableMorphBadge = badge;
        // Inline "saved" toast — gives a narrative cause for the badge flip
        // ("Mitigation accepted by Tariq") so the At Risk → Done morph at
        // SS+9.50/9.70 doesn't read as glitchy.
        statusCell.style.position = 'relative';
        var toast = el('span', 'loop-tbl-saved-toast', 'Mitigation accepted · Tariq');
        toast.style.position = 'absolute';
        toast.style.left = '100%';
        toast.style.top = '50%';
        toast.style.marginLeft = '8px';
        toast.style.transform = 'translateY(-50%)';
        toast.style.padding = '2px 8px';
        toast.style.fontSize = '11px';
        toast.style.fontWeight = '500';
        toast.style.background = 'rgba(0, 120, 212, 0.12)';
        toast.style.color = '#0078D4';
        toast.style.borderRadius = '10px';
        toast.style.whiteSpace = 'nowrap';
        toast.style.opacity = '0';
        toast.style.pointerEvents = 'none';
        statusCell.appendChild(toast);
        tableMorphToast = toast;
      }

      row.appendChild(el('span', 'loop-tbl-cell', r.date));
      row.appendChild(el('span', 'loop-tbl-cell', r.region));
      row.appendChild(el('span', 'loop-tbl-cell', r.risk));

      var mitCell = el('span', 'loop-tbl-cell loop-tbl-newcol', r.mitigation);
      row.appendChild(mitCell);
      tableNewColCells.push(mitCell);

      tbl.appendChild(row);
      tableRowEls.push(row);
    }
    canvasBody.appendChild(tbl);

    var lc = props.liveCursor || { name: 'Sam', accentHex: '#107C10' };
    ensureLiveCursor(lc.name, lc.accentHex);
  }

  function animateTable() {
    var SS = SCENE_START;

    for (var n = 0; n < tableNewColCells.length; n++) {
      master.set(tableNewColCells[n], { opacity: 0, x: 16 }, SS);
    }

    master.from(prefix + ' .loop-tbl-row:not(.loop-tbl-head)',
      { opacity: 0, y: 6, duration: 0.30, ease: 'power2.out', stagger: 0.08 },
      SS + 1.05);

    master.set(prefix + ' .loop-cursor', { opacity: 0 }, SS);
    master.call(function () {
      if (!liveCursor || !canvasFrame || !tableFilterChips[2]) return;
      var frameRect = canvasFrame.getBoundingClientRect();
      var tRect = tableFilterChips[2].getBoundingClientRect();
      var x0 = frameRect.width * 0.20;
      var y0 = -20;
      var x2 = (tRect.left - frameRect.left) + tRect.width / 2;
      var y2 = (tRect.top  - frameRect.top)  + tRect.height / 2;
      var x1 = (x0 + x2) / 2 - 40;
      var y1 = (y0 + y2) / 2 - 60;
      var STEPS = 14;
      var pts = [];
      for (var i = 0; i <= STEPS; i++) {
        var t = i / STEPS;
        var omt = 1 - t;
        pts.push({
          x: omt*omt*x0 + 2*omt*t*x1 + t*t*x2,
          y: omt*omt*y0 + 2*omt*t*y1 + t*t*y2
        });
      }
      gsap.set(liveCursor, { x: pts[0].x, y: pts[0].y, opacity: 0 });
      gsap.to(liveCursor, { opacity: 1, duration: 0.20, ease: 'power2.out' });
      var keyframes = [];
      for (var w = 1; w < pts.length; w++) {
        keyframes.push({ x: pts[w].x, y: pts[w].y, duration: 0.10, ease: 'none' });
      }
      gsap.to(liveCursor, { keyframes: keyframes, ease: 'power2.inOut' });
    }, [], SS + 1.80);

    master.call(function () {
      if (tableFilterChips[0]) tableFilterChips[0].removeAttribute('data-active');
      if (tableFilterChips[2]) tableFilterChips[2].setAttribute('data-active', '1');
    }, [], SS + 3.40);
    master.fromTo(tableFilterChips[2],
      { scale: 1.0 },
      { scale: 1.06, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 },
      SS + 3.40);

    // Audit fix: row collapse was previously a gsap.to() inside a master.call()
    // — same wallclock-divorce class as the kanban drag. Promoted to per-row
    // master.to() so the height/padding interpolation scrubs deterministically.
    for (var ri = 0; ri < tableRowEls.length; ri++) {
      var rr = tableRowEls[ri];
      if (rr.getAttribute('data-status') !== 'At Risk') {
        master.to(rr,
          { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0,
            duration: 0.40, ease: 'power2.inOut' },
          SS + 3.65);
      }
    }

    master.to(prefix + ' .loop-cursor',
      { opacity: 0, duration: 0.30, ease: 'power2.in' },
      SS + 4.80);

    var newColStart = SS + 8.30;
    for (var c = 0; c < tableNewColCells.length; c++) {
      master.to(tableNewColCells[c],
        { opacity: 1, x: 0, duration: 0.40, ease: 'power2.out' },
        newColStart + c * 0.04);
    }

    if (tableMorphToast) {
      master.to(tableMorphToast,
        { opacity: 1, duration: 0.30, ease: 'power2.out' },
        SS + 9.00);
      master.to(tableMorphToast,
        { opacity: 0, duration: 0.35, ease: 'power2.in' },
        SS + 11.50);
    }

    if (tableMorphBadge) {
      master.to(tableMorphBadge,
        { backgroundColor: '#DFF6DD', color: '#0E700E', duration: 0.50, ease: 'power2.inOut' },
        SS + 9.50);
      master.call(function () {
        if (tableMorphBadge) {
          tableMorphBadge.textContent = 'Done';
          tableMorphBadge.setAttribute('data-state', 'Done');
        }
      }, [], SS + 9.70);
    }

    var suggestions = props.copilotSuggestions || [
      'Add Mitigation column?',
      'Filter to At Risk only',
      'Notify owners of slipping items'
    ];
    var tokens = populateCopilotSuggestions(suggestions);
    animateChrome(tokens, 'Suggested follow-ups:', SS + 6.00);
  }

  // ============================================================
  // VARIANT DISPATCHER (fail-closed)
  // ============================================================
  switch (variant) {
    case 'meetingNotes':  buildMeetingNotes(); animateMeetingNotes(); break;
    case 'taskList':      buildTaskList();     animateTaskList();     break;
    case 'kanbanBoard':   buildKanban();       animateKanban();       break;
    case 'tableDatabase': buildTable();        animateTable();        break;
    default: throw new Error('LoopScene: unknown variant "' + variant + '"');
  }

})();
