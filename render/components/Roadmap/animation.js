/*
 * Roadmap — horizontal time-axis sweep with swimlanes, milestone cards,
 * dependency lines, today marker, and legend.
 *
 * Safety contract (rubber-duck §1):
 *   • All DOM/SVG nodes are constructed ONCE during init.
 *   • onUpdate callbacks only mutate textContent / style / attributes on
 *     pre-existing nodes — no appendChild / createElement / insertAdjacentHTML
 *     anywhere inside a tween callback.
 *   • Every <clipPath> / gradient / filter id ends with '-' + SCENE_ID.
 *
 * Globals provided by scf-to-html.mjs: master, SCENE_ID, SCENE_START,
 * SCENE_DURATION, SCENE_PROPS, gsap, document, window.
 */

var __rmScope = '.scene-' + SCENE_ID + ' ';
var __rmRoot = document.querySelector(__rmScope + '.rm-root');
if (!__rmRoot) { return; }

var SVG_NS = 'http://www.w3.org/2000/svg';

/* ── viewBox geometry (matches index.html: viewBox="0 0 1700 760") ── */
var VB_W = 1700;
var VB_H = 760;
var LANE_LABEL_W = 220;          // left gutter for swimlane labels
var AXIS_TOP = 56;               // y of axis baseline
var BAND_TOP = 86;               // y where swimlane bands begin
var BAND_BOTTOM = VB_H - 24;     // y where swimlane bands end
var AXIS_X0 = LANE_LABEL_W + 8;
var AXIS_X1 = VB_W - 24;
var AXIS_W = AXIS_X1 - AXIS_X0;
var CARD_W = 168;
var CARD_H = 64;
var STACK_DY = 14;               // vertical offset per same-day collision step

/* ── status palette ── */
var STATUS_COLORS = {
  done:        '#22c55e',
  complete:    '#22c55e',
  inprogress:  '#38bdf8',
  in_progress: '#38bdf8',
  active:      '#38bdf8',
  planned:     '#a78bfa',
  upcoming:    '#a78bfa',
  atrisk:      '#f97316',
  at_risk:     '#f97316',
  blocked:     '#ef4444',
  delayed:     '#ef4444',
  cancelled:   '#94a3b8'
};
var LANE_PALETTE = ['#38bdf8', '#a78bfa', '#fb7185', '#facc15', '#34d399', '#f97316'];

/* ── helpers ── */
function svgEl(name, attrs) {
  var el = document.createElementNS(SVG_NS, name);
  if (attrs) {
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        el.setAttribute(k, attrs[k]);
      }
    }
  }
  return el;
}
function readIsland(id) {
  var node = document.getElementById(id);
  if (!node) return null;
  var raw = (node.textContent || '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function parseDate(s) {
  if (!s) return NaN;
  var t = Date.parse(s);
  return isFinite(t) ? t : NaN;
}
function fmtMonth(ts) {
  var d = new Date(ts);
  var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return months[d.getUTCMonth()] + " '" + String(d.getUTCFullYear()).slice(-2);
}
function fmtShortDate(ts) {
  var d = new Date(ts);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getUTCMonth()] + ' ' + d.getUTCDate();
}
function statusColor(status) {
  var key = String(status || '').toLowerCase().replace(/[\s-]+/g, '');
  return STATUS_COLORS[key] || '#94a3b8';
}
function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

/* ── 1. Read & validate inputs ──────────────────────────────────────── */
var horizonStart = parseDate(__rmRoot.getAttribute('data-horizon-start'));
var horizonEnd = parseDate(__rmRoot.getAttribute('data-horizon-end'));
if (!isFinite(horizonStart) || !isFinite(horizonEnd) || horizonEnd <= horizonStart) {
  return; // invalid horizon — bail silently rather than throw
}
var horizonSpan = horizonEnd - horizonStart;
var revealMode = (__rmRoot.getAttribute('data-reveal-mode') || 'date').toLowerCase();
if (revealMode !== 'lane' && revealMode !== 'status') revealMode = 'date';

var swimlanesRaw = readIsland('rm-swimlanes-data-' + SCENE_ID);
var milestonesRaw = readIsland('rm-milestones-data-' + SCENE_ID);
var legendRaw = readIsland('rm-legend-data-' + SCENE_ID);
var todayRaw = readIsland('rm-today-data-' + SCENE_ID);

var swimlanes = Array.isArray(swimlanesRaw) ? swimlanesRaw.filter(function (s) {
  return s && typeof s.id === 'string' && s.id.length;
}) : [];
if (!swimlanes.length) { return; }

/* assign palette colors to lanes that didn't supply one */
swimlanes.forEach(function (lane, i) {
  if (!lane.color) lane.color = LANE_PALETTE[i % LANE_PALETTE.length];
});
var laneIndex = {};
swimlanes.forEach(function (lane, i) { laneIndex[lane.id] = i; });

/* filter milestones: must have valid id, swimlaneId in laneIndex, date in range */
var rawMilestones = Array.isArray(milestonesRaw) ? milestonesRaw : [];
var milestones = [];
rawMilestones.forEach(function (m) {
  if (!m || typeof m.id !== 'string' || !m.id.length) return;
  if (!Object.prototype.hasOwnProperty.call(laneIndex, m.swimlaneId)) return;
  var ts = parseDate(m.date);
  if (!isFinite(ts)) return;
  if (ts < horizonStart || ts > horizonEnd) return; // §5: silently filter out-of-range
  milestones.push({
    id: m.id,
    title: String(m.title || m.id),
    date: ts,
    swimlaneId: m.swimlaneId,
    status: m.status || 'planned',
    owner: m.owner || '',
    confidence: (m.confidence || '').toLowerCase(),
    dependencyIds: Array.isArray(m.dependencyIds) ? m.dependencyIds.slice() : [],
    badge: m.badge || '',
    note: m.note || ''
  });
});

/* milestone lookup (post-filter so invalid dep refs are auto-dropped) */
var milestoneById = {};
milestones.forEach(function (m) { milestoneById[m.id] = m; });

/* ── 2. Compute geometry (positions + same-day collision stacking) ──── */
function xForTs(ts) {
  return AXIS_X0 + ((ts - horizonStart) / horizonSpan) * AXIS_W;
}
var laneCount = swimlanes.length;
var bandH = (BAND_BOTTOM - BAND_TOP) / laneCount;
function laneCenterY(i) { return BAND_TOP + bandH * i + bandH / 2; }

/* Same-day collision: bucket by `${swimlaneId}::${dateKey}`, then assign
 * stack offsets centered around lane center. */
var collisionBuckets = {};
milestones.forEach(function (m) {
  var key = m.swimlaneId + '::' + m.date;
  (collisionBuckets[key] = collisionBuckets[key] || []).push(m);
});
Object.keys(collisionBuckets).forEach(function (key) {
  var bucket = collisionBuckets[key];
  bucket.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  var n = bucket.length;
  bucket.forEach(function (m, i) {
    m._stackIndex = i;
    m._stackOffset = (i - (n - 1) / 2) * STACK_DY;
  });
});
milestones.forEach(function (m) {
  m._x = xForTs(m.date);
  m._yBase = laneCenterY(laneIndex[m.swimlaneId]);
  m._y = m._yBase + (m._stackOffset || 0);
});

/* ── 3. Build all SVG nodes ONCE ───────────────────────────────────── */
var svg = __rmRoot.querySelector('.rm-svg');
var bandsLayer = svg.querySelector('.rm-layer-bands');
var axisLayer = svg.querySelector('.rm-layer-axis');
var axisLabelsLayer = svg.querySelector('.rm-layer-axis-labels');
var lanesLayer = svg.querySelector('.rm-layer-lanes');
var depsLayer = svg.querySelector('.rm-layer-deps');
var milestonesLayer = svg.querySelector('.rm-layer-milestones');
var todayLayer = svg.querySelector('.rm-layer-today');
var clipRect = svg.querySelector('#rm-axis-clip-' + SCENE_ID + ' rect');

/* 3a. Swimlane bands (alternating tint) + accent bars + lane labels */
var laneNodes = [];
swimlanes.forEach(function (lane, i) {
  var y = BAND_TOP + bandH * i;
  var band = svgEl('rect', {
    'class': 'rm-swimlane-band',
    'data-alt': String(i % 2),
    x: 0, y: y, width: VB_W, height: bandH
  });
  bandsLayer.appendChild(band);

  if (i > 0) {
    bandsLayer.appendChild(svgEl('line', {
      'class': 'rm-swimlane-rule',
      x1: AXIS_X0, y1: y, x2: AXIS_X1, y2: y
    }));
  }

  var accent = svgEl('line', {
    'class': 'rm-lane-accent',
    x1: 18, y1: y + 14, x2: 18, y2: y + bandH - 14,
    stroke: lane.color
  });
  lanesLayer.appendChild(accent);

  var labelGroup = svgEl('g', { 'class': 'rm-lane-label-group', opacity: '0' });
  var label = svgEl('text', {
    'class': 'rm-lane-label',
    x: 36, y: y + bandH / 2 - (lane.owner ? 4 : -6)
  });
  label.textContent = lane.label || lane.id;
  labelGroup.appendChild(label);
  if (lane.owner) {
    var owner = svgEl('text', {
      'class': 'rm-lane-owner',
      x: 36, y: y + bandH / 2 + 14
    });
    owner.textContent = lane.owner;
    labelGroup.appendChild(owner);
  }
  lanesLayer.appendChild(labelGroup);
  laneNodes.push(labelGroup);
});

/* 3b. Axis baseline + tick marks (clipped via clipPath for sweep effect) */
var baseline = svgEl('line', {
  'class': 'rm-axis-baseline',
  x1: AXIS_X0, y1: AXIS_TOP, x2: AXIS_X1, y2: AXIS_TOP
});
axisLayer.appendChild(baseline);

/* monthly ticks if span >= 45 days, else weekly ticks */
var DAY_MS = 86400000;
var tickStep, tickFmt;
if (horizonSpan / DAY_MS >= 45) {
  tickStep = 'month';
  tickFmt = fmtMonth;
} else {
  tickStep = 'week';
  tickFmt = fmtShortDate;
}
var ticks = [];
if (tickStep === 'month') {
  var d = new Date(horizonStart);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() <= horizonEnd) {
    if (d.getTime() >= horizonStart) ticks.push(d.getTime());
    var nd = new Date(d.getTime());
    nd.setUTCMonth(nd.getUTCMonth() + 1);
    d = nd;
  }
} else {
  var t = horizonStart + 7 * DAY_MS;
  while (t <= horizonEnd) { ticks.push(t); t += 7 * DAY_MS; }
}
ticks.forEach(function (ts) {
  var tx = xForTs(ts);
  axisLayer.appendChild(svgEl('line', {
    'class': 'rm-axis-tick',
    x1: tx, y1: AXIS_TOP - 6, x2: tx, y2: BAND_BOTTOM
  }));
  var labelEl = svgEl('text', {
    'class': 'rm-axis-label',
    x: tx, y: AXIS_TOP - 12,
    'text-anchor': 'middle',
    opacity: '0'
  });
  labelEl.textContent = tickFmt(ts);
  axisLabelsLayer.appendChild(labelEl);
});
/* always-on endpoint labels (start / end of horizon) */
var startLabel = svgEl('text', {
  'class': 'rm-axis-label',
  x: AXIS_X0, y: AXIS_TOP - 12, 'text-anchor': 'start', opacity: '0'
});
startLabel.textContent = tickFmt(horizonStart);
axisLabelsLayer.appendChild(startLabel);
var endLabel = svgEl('text', {
  'class': 'rm-axis-label',
  x: AXIS_X1, y: AXIS_TOP - 12, 'text-anchor': 'end', opacity: '0'
});
endLabel.textContent = tickFmt(horizonEnd);
axisLabelsLayer.appendChild(endLabel);

/* 3c. Milestone cards (group-per-milestone, all built upfront, opacity 0) */
milestones.forEach(function (m) {
  var col = statusColor(m.status);
  /* clamp x so card stays inside axis area */
  var cardX = clamp(m._x - CARD_W / 2, AXIS_X0 + 4, AXIS_X1 - CARD_W - 4);
  var cardY = m._y - CARD_H / 2;

  var g = svgEl('g', {
    'class': 'rm-milestone',
    'data-milestone-id': m.id,
    'data-status': m.status,
    transform: 'translate(0,0)',
    opacity: '0'
  });

  /* anchor dot on the timeline (at exact lane center, not stacked) */
  var dot = svgEl('circle', {
    'class': 'rm-card-anchor',
    cx: m._x, cy: m._yBase, r: 4,
    fill: col
  });
  g.appendChild(dot);

  /* connector from anchor to card */
  var connector = svgEl('line', {
    'class': 'rm-card-connector',
    x1: m._x, y1: m._yBase,
    x2: cardX + CARD_W / 2, y2: cardY + (m._y > m._yBase ? 0 : CARD_H),
    stroke: 'rgba(148,163,184,0.45)', 'stroke-width': '1'
  });
  g.appendChild(connector);

  var bg = svgEl('rect', {
    'class': 'rm-card-bg',
    x: cardX, y: cardY, width: CARD_W, height: CARD_H
  });
  g.appendChild(bg);

  /* left accent bar tinted by lane color */
  var laneCol = swimlanes[laneIndex[m.swimlaneId]].color;
  g.appendChild(svgEl('rect', {
    'class': 'rm-card-accent',
    x: cardX, y: cardY, width: 4, height: CARD_H,
    fill: laneCol
  }));

  /* status chip pill (top-right) — pulses on entry */
  var chip = svgEl('rect', {
    'class': 'rm-card-status',
    x: cardX + CARD_W - 14, y: cardY + 8, width: 6, height: 14,
    fill: col,
    'data-status-chip': '1'
  });
  g.appendChild(chip);

  /* title */
  var titleEl = svgEl('text', {
    'class': 'rm-card-title',
    x: cardX + 12, y: cardY + 22
  });
  var titleText = m.title.length > 26 ? m.title.slice(0, 25) + '…' : m.title;
  titleEl.textContent = titleText;
  g.appendChild(titleEl);

  /* date */
  var dateEl = svgEl('text', {
    'class': 'rm-card-date',
    x: cardX + 12, y: cardY + 40
  });
  dateEl.textContent = fmtShortDate(m.date) + (m.owner ? ' • ' + m.owner : '');
  g.appendChild(dateEl);

  /* badge (optional) */
  if (m.badge) {
    var bw = Math.min(72, 14 + m.badge.length * 6);
    g.appendChild(svgEl('rect', {
      'class': 'rm-card-badge',
      x: cardX + 12, y: cardY + 46, width: bw, height: 14
    }));
    var badgeText = svgEl('text', {
      'class': 'rm-card-badge-text',
      x: cardX + 12 + bw / 2, y: cardY + 56,
      'text-anchor': 'middle'
    });
    badgeText.textContent = m.badge.length > 10 ? m.badge.slice(0, 9) + '…' : m.badge;
    g.appendChild(badgeText);
  }

  /* confidence indicator (optional) */
  if (m.confidence === 'low' || m.confidence === 'med' || m.confidence === 'high') {
    var conf = svgEl('text', {
      'class': 'rm-card-conf',
      'data-conf': m.confidence,
      x: cardX + CARD_W - 10, y: cardY + 56,
      'text-anchor': 'end'
    });
    conf.textContent = m.confidence;
    g.appendChild(conf);
  }

  milestonesLayer.appendChild(g);

  /* cache attach points for dependency lines: source = right edge of card,
   * target = left edge of card */
  m._node = g;
  m._chip = chip;
  m._cardX = cardX;
  m._cardY = cardY;
  m._attachOutX = cardX + CARD_W;
  m._attachOutY = cardY + CARD_H / 2;
  m._attachInX = cardX;
  m._attachInY = cardY + CARD_H / 2;
});

/* 3d. Dependency lines — built upfront, hidden via stroke-dashoffset trick.
 *     Animation later sets stroke-dasharray + animates stroke-dashoffset. */
var deps = [];
milestones.forEach(function (target) {
  target.dependencyIds.forEach(function (depId) {
    var src = milestoneById[depId];
    if (!src) return;             // §6: invalid id -> silently ignore
    if (src === target) return;   // self-loop guard
    /* build path: src right edge -> target left edge with bezier */
    var x1 = src._attachOutX, y1 = src._attachOutY;
    var x2 = target._attachInX, y2 = target._attachInY;
    var dx = Math.max(40, (x2 - x1) * 0.5);
    var d = 'M ' + x1 + ' ' + y1 +
            ' C ' + (x1 + dx) + ' ' + y1 +
            ' ' + (x2 - dx) + ' ' + y2 +
            ' ' + x2 + ' ' + y2;
    var path = svgEl('path', {
      'class': 'rm-dep-line',
      d: d,
      opacity: '0'
    });
    /* compute path length once for stroke-draw animation */
    var len = 0;
    if (typeof path.getTotalLength === 'function') {
      try { len = path.getTotalLength(); } catch (e) { len = 0; }
    }
    if (!len) {
      // jsdom / non-browser: estimate Euclidean length as fallback
      len = Math.hypot(x2 - x1, y2 - y1) * 1.15;
    }
    path.setAttribute('stroke-dasharray', len + ' ' + len);
    path.setAttribute('stroke-dashoffset', String(len));
    depsLayer.appendChild(path);
    deps.push({ src: src, target: target, path: path, length: len });
  });
});

/* 3e. Today marker — clamp date and decide visibility */
var todayNode = null;
var todayLine = null;
var todayPill = null;
var todayLabel = null;
var todayLabelText = null;
var showToday = false;
if (todayRaw && typeof todayRaw === 'object' && todayRaw.date) {
  var todayTs = parseDate(todayRaw.date);
  if (isFinite(todayTs)) {
    var inRange = todayTs >= horizonStart && todayTs <= horizonEnd;
    /* §5: out-of-range today marker -> clamp position AND hide entirely
     *     (documented choice: simplest and avoids misleading viewer) */
    if (inRange) {
      showToday = true;
      var tx = xForTs(todayTs);
      var grp = svgEl('g', { 'class': 'rm-today', opacity: '0' });
      todayLine = svgEl('line', {
        'class': 'rm-today-line',
        x1: tx, y1: BAND_TOP - 8, x2: tx, y2: BAND_BOTTOM + 4
      });
      grp.appendChild(todayLine);
      var labelStr = (todayRaw.label || 'TODAY');
      var pillW = Math.max(54, labelStr.length * 6.5 + 16);
      todayPill = svgEl('rect', {
        'class': 'rm-today-pill',
        x: tx - pillW / 2, y: BAND_TOP - 24, width: pillW, height: 18
      });
      grp.appendChild(todayPill);
      todayLabel = svgEl('text', {
        'class': 'rm-today-label',
        x: tx, y: BAND_TOP - 11,
        'text-anchor': 'middle'
      });
      todayLabel.textContent = labelStr;
      grp.appendChild(todayLabel);
      todayLayer.appendChild(grp);
      todayNode = grp;
    }
  }
}

/* 3f. Legend (HTML, outside SVG) */
var legendContainer = __rmRoot.querySelector('.rm-legend');
var legendItems = Array.isArray(legendRaw) ? legendRaw.filter(function (l) {
  return l && (l.label || l.status);
}) : [];
legendItems.forEach(function (entry) {
  var item = document.createElement('span');
  item.className = 'rm-legend-item';
  item.style.opacity = '0';
  var sw = document.createElement('span');
  sw.className = 'rm-legend-swatch';
  sw.style.background = entry.color || statusColor(entry.status);
  item.appendChild(sw);
  var txt = document.createElement('span');
  txt.textContent = entry.label || entry.status;
  item.appendChild(txt);
  legendContainer.appendChild(item);
});

/* ── 4. Animation timeline ─────────────────────────────────────────── */
var t0 = SCENE_START + 0.1;

/* 4a. Header (title + horizon caption) fade-in */
master.fromTo(__rmScope + '.rm-header',
  { opacity: 0, y: 12 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  t0);

/* 4b. Axis sweep — animate clipPath rect width left→right */
var sweepDur = 1.0;
master.fromTo(clipRect,
  { attr: { width: 0 } },
  { attr: { width: VB_W }, duration: sweepDur, ease: 'power2.inOut' },
  t0 + 0.2);

/* 4c. Lane labels stagger fade-in (after axis settles slightly) */
laneNodes.forEach(function (g, i) {
  master.to(g,
    { opacity: 1, duration: 0.4, ease: 'power2.out' },
    t0 + 0.4 + i * 0.08);
});

/* 4d. Axis tick labels fade-in alongside sweep */
Array.prototype.forEach.call(axisLabelsLayer.childNodes, function (n, i) {
  master.to(n,
    { opacity: 1, duration: 0.35, ease: 'power1.out' },
    t0 + 0.3 + i * 0.04);
});

/* 4e. Milestone reveal — order by revealMode ─────────────────── */
var milestoneStartT = t0 + 1.2;
var milestoneStaggerStep = 0.18;
function milestoneSortKey(m) {
  if (revealMode === 'lane') return [laneIndex[m.swimlaneId], m.date, m.id];
  if (revealMode === 'status') return [String(m.status), m.date, m.id];
  return [m.date, laneIndex[m.swimlaneId], m.id];
}
function cmpKeys(a, b) {
  for (var i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}
var ordered = milestones.slice().sort(function (a, b) {
  return cmpKeys(milestoneSortKey(a), milestoneSortKey(b));
});

/* group consecutive items that share the same primary key so they appear
 * together (e.g., same date in 'date' mode) for nicer pacing */
var groupBucketKey = function (m) {
  if (revealMode === 'lane') return laneIndex[m.swimlaneId];
  if (revealMode === 'status') return String(m.status);
  return m.date;
};

var entryTimeById = {};
var lastBucket = null;
var bucketIdx = -1;
ordered.forEach(function (m, i) {
  var bk = groupBucketKey(m);
  if (bk !== lastBucket) { bucketIdx++; lastBucket = bk; }
  /* slight intra-bucket stagger so simultaneous cards don't perfectly overlap */
  var inBucketJitter = (i % 4) * 0.04;
  var entryT = milestoneStartT + bucketIdx * milestoneStaggerStep + inBucketJitter;
  entryTimeById[m.id] = entryT;

  master.fromTo(m._node,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' },
    entryT);

  /* status chip pulse (single pulse on entry) — width tween then back */
  master.fromTo(m._chip,
    { attr: { width: 6 } },
    { attr: { width: 18 }, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 },
    entryT + 0.15);
});

/* 4f. Dependency lines — only after BOTH endpoints visible (§7 guard) */
deps.forEach(function (dep) {
  var srcT = entryTimeById[dep.src.id] || milestoneStartT;
  var tgtT = entryTimeById[dep.target.id] || milestoneStartT;
  var startT = Math.max(srcT, tgtT) + 0.45 + 0.05; // both cards finished entry
  /* fade in path container, then stroke-draw via dashoffset */
  master.to(dep.path,
    { opacity: 1, duration: 0.2, ease: 'power1.out' },
    startT);
  master.fromTo(dep.path,
    { attr: { 'stroke-dashoffset': dep.length } },
    { attr: { 'stroke-dashoffset': 0 }, duration: 0.6, ease: 'power2.inOut' },
    startT);
});

/* 4g. Today marker — fade in after milestones begin */
if (showToday && todayNode) {
  var todayT = milestoneStartT + Math.max(1, ordered.length * 0.12) + 0.2;
  master.to(todayNode,
    { opacity: 1, duration: 0.45, ease: 'power2.out' },
    todayT);
}

/* 4h. Legend fade-in (cascade) */
var legendT = milestoneStartT + Math.max(1.2, ordered.length * 0.14);
Array.prototype.forEach.call(legendContainer.childNodes, function (item, i) {
  master.to(item,
    { opacity: 1, duration: 0.35, ease: 'power2.out' },
    legendT + i * 0.08);
});
master.to(__rmScope + '.rm-legend',
  { opacity: 1, duration: 0.3, ease: 'power1.out' },
  legendT);

/* 4i. Exit fade */
master.to(__rmScope + '.rm-root',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
