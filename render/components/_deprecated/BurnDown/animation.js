/*
 * BurnDown — Sprint / iteration burn-down chart with SVG line-draw animation.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ DIVERGENCE (rubber-duck-validated):                                    ║
 * ║ This component uses inline SVG, NOT Chart.js as proposed in §3.3.      ║
 * ║ Reasons: zero new render-time deps; consistency with DataChart;        ║
 * ║ full control of the reveal mask and stroke-dashoffset animation.       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ todayIndex CONTRACT:                                                   ║
 * ║ todayIndex is the index into the MERGED SORTED x-domain of            ║
 * ║   plan ∪ actual ∪ forecast  (deduplicated, ascending).                ║
 * ║ It is NOT an index into `actual` alone.                                ║
 * ║ If todayIndex < 0 OR >= mergedDomain.length → silently hide marker.   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * DOM-SAFETY: All SVG paths, lines, markers, highlights, and legend items
 * are built ONCE inside a single master.call() block. Subsequent animations
 * only mutate stroke-dashoffset, opacity, transform, and mask/clip rect
 * width — never rebuild path data or call appendChild inside onUpdate.
 * Ref: CustomerStory/animation.js lines 78–106 (canonical safe pattern).
 *
 * Dashed-line reveal strategy:
 *   Plan + forecast (CSS stroke-dasharray) → clipPath rect width animation
 *   Actual (solid)                         → stroke-dashoffset animation
 *   Variance area                          → mask rect width + fillOpacity
 *
 * Globals: master, SCENE_ID, SCENE_START, SCENE_DURATION, gsap, document, window
 */

var __bdScope = '.scene-' + SCENE_ID + ' ';

// ── Helpers (prefixed to avoid collisions) ──────────────────────────────────

var BD_SVG_NS = 'http://www.w3.org/2000/svg';

function bdSvgNode(tag, attrs) {
  var el = document.createElementNS(BD_SVG_NS, tag);
  if (attrs) {
    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i++) {
      el.setAttribute(keys[i], String(attrs[keys[i]]));
    }
  }
  return el;
}

function bdParseIsland(suffix) {
  var el = document.getElementById('bd-' + suffix + '-' + SCENE_ID);
  if (!el) return null;
  var raw = el.textContent.trim();
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function bdNiceMax(v) {
  if (v <= 0) return 1;
  var exp = Math.floor(Math.log10(v));
  var frac = v / Math.pow(10, exp);
  var nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}

function bdClamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

// ── 1. Header fade-in ───────────────────────────────────────────────────────

master.fromTo(__bdScope + '.bd-header',
  { opacity: 0, y: 16 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.08);

// ── 2. Canvas wrap fade-in ──────────────────────────────────────────────────

master.fromTo(__bdScope + '.bd-canvas-wrap',
  { autoAlpha: 0, y: 12 },
  { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.2);

// ── 3. Build entire chart skeleton (ONE master.call — all DOM created here) ─

master.call(function() {
  var root = document.querySelector(__bdScope + '.bd-root');
  if (!root) return;
  var svg = root.querySelector('.bd-svg');
  if (!svg) return;

  // ── Parse data islands ────────────────────────────────────────────────
  var plan = bdParseIsland('plan-data');
  var actual = bdParseIsland('actual-data');
  var forecast = bdParseIsland('forecast-data');
  var highlights = bdParseIsland('highlights-data');

  if (!Array.isArray(plan) || plan.length === 0) return;
  if (!Array.isArray(actual)) actual = [];
  if (!Array.isArray(forecast)) forecast = [];
  if (!Array.isArray(highlights)) highlights = [];

  var todayIndexRaw = root.dataset.todayIndex;
  var todayIndex = (todayIndexRaw !== '' && todayIndexRaw != null)
    ? parseInt(todayIndexRaw, 10) : -1;
  if (!isFinite(todayIndex)) todayIndex = -1;

  var goalLineRaw = root.dataset.goalLine;
  var goalLine = (goalLineRaw !== '' && goalLineRaw != null)
    ? parseFloat(goalLineRaw) : NaN;

  var xLabel = root.dataset.xLabel || 'Day';
  var yLabel = root.dataset.yLabel || 'Points';

  // ── Compute merged x-domain (deduplicated, ascending) ─────────────────
  // x values may be number OR string per schema (BurnDownProps.{plan,actual,
  // forecast,highlights}.items.properties.x: ["number","string"]).
  // We must NOT coerce to Number — that breaks date strings ("2025-01-01" → NaN)
  // and any non-numeric labels. Dedupe by string key, preserve original value,
  // sort numerically only when ALL values are numeric-coerceable.
  var i;
  var seen = {};
  var mergedX = [];
  function pushX(v) {
    var k = String(v);
    if (!seen[k]) { seen[k] = true; mergedX.push(v); }
  }
  for (i = 0; i < plan.length; i++) pushX(plan[i].x);
  for (i = 0; i < actual.length; i++) pushX(actual[i].x);
  for (i = 0; i < forecast.length; i++) pushX(forecast[i].x);
  var allNumeric = mergedX.every(function(v) {
    if (typeof v === 'number') return isFinite(v);
    return typeof v === 'string' && v.trim() !== '' && isFinite(Number(v));
  });
  mergedX.sort(allNumeric
    ? function(a, b) { return Number(a) - Number(b); }
    : function(a, b) { var sa = String(a), sb = String(b); return sa < sb ? -1 : sa > sb ? 1 : 0; });
  // String-keyed lookup so xToPixel works for string OR number x values.
  var xIndex = {};
  for (i = 0; i < mergedX.length; i++) xIndex[String(mergedX[i])] = i;

  // Build x→y lookup maps
  var planMap = {}, actualMap = {}, forecastMap = {};
  for (i = 0; i < plan.length; i++) planMap[plan[i].x] = plan[i].y;
  for (i = 0; i < actual.length; i++) actualMap[actual[i].x] = actual[i].y;
  for (i = 0; i < forecast.length; i++) forecastMap[forecast[i].x] = forecast[i].y;

  // ── Compute y range ───────────────────────────────────────────────────
  var allY = [];
  for (i = 0; i < plan.length; i++) allY.push(plan[i].y);
  for (i = 0; i < actual.length; i++) allY.push(actual[i].y);
  for (i = 0; i < forecast.length; i++) allY.push(forecast[i].y);
  if (isFinite(goalLine)) allY.push(goalLine);
  var yMax = bdNiceMax(Math.max.apply(null, allY));
  var yMin = 0;

  // ── Plot rect (matching DataChart's 1000×600 viewBox) ─────────────────
  var plot = { left: 104, top: 48, right: 952, bottom: 520 };
  var plotW = plot.right - plot.left;
  var plotH = plot.bottom - plot.top;
  var yRange = yMax - yMin || 1;

  function xToPixel(xVal) {
    var idx = xIndex[String(xVal)];
    if (idx == null) idx = 0;
    var n = mergedX.length > 1 ? mergedX.length - 1 : 1;
    return plot.left + (idx / n) * plotW;
  }
  function yToPixel(yVal) {
    return plot.bottom - ((yVal - yMin) / yRange) * plotH;
  }

  // ── Grid + axes ───────────────────────────────────────────────────────
  var gridGroup = bdSvgNode('g', { 'class': 'bd-grid-group', opacity: '0' });
  var tickCount = 5;
  for (i = 0; i <= tickCount; i++) {
    var tickY = yMin + (yRange / tickCount) * i;
    var py = yToPixel(tickY);
    gridGroup.appendChild(bdSvgNode('line', {
      x1: plot.left, y1: py, x2: plot.right, y2: py,
      'class': 'bd-gridline'
    }));
    var tickLbl = bdSvgNode('text', {
      x: plot.left - 14, y: py + 5,
      'class': 'bd-axis-number', 'text-anchor': 'end'
    });
    tickLbl.textContent = Math.round(tickY).toString();
    gridGroup.appendChild(tickLbl);
  }

  // Y-axis label (rotated)
  var yLblEl = bdSvgNode('text', {
    x: 24, y: (plot.top + plot.bottom) / 2,
    'class': 'bd-axis-label', 'text-anchor': 'middle',
    transform: 'rotate(-90 24 ' + ((plot.top + plot.bottom) / 2) + ')'
  });
  yLblEl.textContent = yLabel;
  gridGroup.appendChild(yLblEl);

  // X-axis tick labels (decimate if too many)
  var maxLabels = 14;
  var labelStep = Math.max(1, Math.ceil(mergedX.length / maxLabels));
  for (i = 0; i < mergedX.length; i++) {
    if (i % labelStep !== 0 && i !== mergedX.length - 1) continue;
    var xLblEl = bdSvgNode('text', {
      x: xToPixel(mergedX[i]), y: plot.bottom + 36,
      'class': 'bd-axis-label', 'text-anchor': 'middle'
    });
    xLblEl.textContent = String(mergedX[i]);
    gridGroup.appendChild(xLblEl);
  }

  // X-axis title
  var xTitleEl = bdSvgNode('text', {
    x: (plot.left + plot.right) / 2, y: plot.bottom + 58,
    'class': 'bd-axis-label', 'text-anchor': 'middle'
  });
  xTitleEl.textContent = xLabel;
  gridGroup.appendChild(xTitleEl);

  // Domain lines
  gridGroup.appendChild(bdSvgNode('line', {
    x1: plot.left, y1: plot.bottom, x2: plot.right, y2: plot.bottom,
    'class': 'bd-domain'
  }));
  gridGroup.appendChild(bdSvgNode('line', {
    x1: plot.left, y1: plot.top, x2: plot.left, y2: plot.bottom,
    'class': 'bd-domain'
  }));
  svg.appendChild(gridGroup);

  // ── Variance region (area between plan and actual where both exist) ───
  var variancePts = [];
  for (i = 0; i < mergedX.length; i++) {
    var xv = mergedX[i];
    if (planMap[xv] !== undefined && actualMap[xv] !== undefined) {
      variancePts.push({ x: xv, planY: planMap[xv], actualY: actualMap[xv] });
    }
  }
  var variancePath = null;
  if (variancePts.length >= 2) {
    var vd = 'M ' + xToPixel(variancePts[0].x) + ' ' + yToPixel(variancePts[0].planY);
    for (i = 1; i < variancePts.length; i++) {
      vd += ' L ' + xToPixel(variancePts[i].x) + ' ' + yToPixel(variancePts[i].planY);
    }
    for (i = variancePts.length - 1; i >= 0; i--) {
      vd += ' L ' + xToPixel(variancePts[i].x) + ' ' + yToPixel(variancePts[i].actualY);
    }
    vd += ' Z';
    variancePath = bdSvgNode('path', {
      d: vd,
      'class': 'bd-variance',
      fill: '#3b82f6',
      'fill-opacity': '0',
      mask: 'url(#bd-reveal-mask-' + SCENE_ID + ')'
    });
    svg.appendChild(variancePath);
  }

  // ── Goal line ─────────────────────────────────────────────────────────
  var goalGroup = null;
  if (isFinite(goalLine)) {
    var gy = yToPixel(goalLine);
    goalGroup = bdSvgNode('g');
    goalGroup.appendChild(bdSvgNode('line', {
      x1: plot.left, y1: gy, x2: plot.right, y2: gy,
      'class': 'bd-goal-line'
    }));
    var goalLblEl = bdSvgNode('text', {
      x: plot.right + 8, y: gy + 4,
      'class': 'bd-goal-label'
    });
    goalLblEl.textContent = 'Goal: ' + goalLine;
    goalGroup.appendChild(goalLblEl);
    svg.appendChild(goalGroup);
  }

  // ── Plan line (dashed — revealed via clipPath) ────────────────────────
  var planPathD = '';
  for (i = 0; i < plan.length; i++) {
    var px = xToPixel(plan[i].x);
    var ppy = yToPixel(plan[i].y);
    planPathD += (i === 0 ? 'M ' : ' L ') + px + ' ' + ppy;
  }
  var planPath = bdSvgNode('path', {
    d: planPathD,
    'class': 'bd-plan-path',
    'clip-path': 'url(#bd-clip-plan-' + SCENE_ID + ')'
  });
  svg.appendChild(planPath);

  // ── Actual line (solid — revealed via stroke-dashoffset) + dots ───────
  var actualPathD = '';
  var actualDots = [];
  for (i = 0; i < actual.length; i++) {
    var ax = xToPixel(actual[i].x);
    var ay = yToPixel(actual[i].y);
    actualPathD += (i === 0 ? 'M ' : ' L ') + ax + ' ' + ay;
    var dot = bdSvgNode('circle', {
      cx: ax, cy: ay, r: 6,
      'class': 'bd-actual-dot',
      opacity: '0'
    });
    actualDots.push(dot);
  }
  var actualPath = null;
  if (actualPathD) {
    actualPath = bdSvgNode('path', {
      d: actualPathD,
      'class': 'bd-actual-path'
    });
    svg.appendChild(actualPath);
    // Set up stroke-dashoffset for line-draw animation
    var actualLen = 0;
    if (typeof actualPath.getTotalLength === 'function') {
      actualLen = actualPath.getTotalLength();
    }
    if (actualLen > 0) {
      actualPath.style.strokeDasharray = actualLen + ' ' + actualLen;
      actualPath.style.strokeDashoffset = String(actualLen);
      actualPath.dataset.pathLength = String(actualLen);
    }
  }
  for (i = 0; i < actualDots.length; i++) svg.appendChild(actualDots[i]);

  // ── Forecast line (dashed — revealed via clipPath) ────────────────────
  var forecastPath = null;
  if (forecast.length > 0) {
    var fPathD = '';
    // Connect from last actual point for visual continuity
    if (actual.length > 0) {
      var la = actual[actual.length - 1];
      fPathD = 'M ' + xToPixel(la.x) + ' ' + yToPixel(la.y);
      for (i = 0; i < forecast.length; i++) {
        fPathD += ' L ' + xToPixel(forecast[i].x) + ' ' + yToPixel(forecast[i].y);
      }
    } else {
      for (i = 0; i < forecast.length; i++) {
        fPathD += (i === 0 ? 'M ' : ' L ') + xToPixel(forecast[i].x) + ' ' + yToPixel(forecast[i].y);
      }
    }
    forecastPath = bdSvgNode('path', {
      d: fPathD,
      'class': 'bd-forecast-path',
      'clip-path': 'url(#bd-clip-forecast-' + SCENE_ID + ')',
      opacity: '0'
    });
    svg.appendChild(forecastPath);
  }

  // ── Today marker ──────────────────────────────────────────────────────
  // todayIndex indexes into mergedX (see CONTRACT at file top)
  var todayValid = isFinite(todayIndex) && todayIndex >= 0 && todayIndex < mergedX.length;
  var todayGroup = null;
  if (todayValid) {
    var todayPx = xToPixel(mergedX[todayIndex]);
    todayGroup = bdSvgNode('g', { 'class': 'bd-today-group', opacity: '0' });
    todayGroup.appendChild(bdSvgNode('line', {
      x1: todayPx, y1: plot.top, x2: todayPx, y2: plot.bottom,
      'class': 'bd-today-line'
    }));
    todayGroup.appendChild(bdSvgNode('circle', {
      cx: todayPx, cy: plot.top - 12, r: 5,
      'class': 'bd-today-dot'
    }));
    var todayLbl = bdSvgNode('text', {
      x: todayPx, y: plot.top - 24,
      'class': 'bd-today-label', 'text-anchor': 'middle'
    });
    todayLbl.textContent = 'Today';
    todayGroup.appendChild(todayLbl);
    svg.appendChild(todayGroup);
  }

  // ── Highlights ────────────────────────────────────────────────────────
  var highlightNodes = [];
  for (i = 0; i < highlights.length; i++) {
    var h = highlights[i];
    var hPx = xToPixel(h.x);
    // Position on actual if exists, else plan
    var hYVal = actualMap[h.x] !== undefined ? actualMap[h.x]
              : (planMap[h.x] !== undefined ? planMap[h.x] : null);
    if (hYVal === null) continue;
    var hPy = yToPixel(hYVal);
    var kind = h.kind || 'slip';
    var hColor = kind === 'recover' ? '#22c55e'
               : kind === 'scope-change' ? '#eab308'
               : '#ef4444';

    var hg = bdSvgNode('g', { 'class': 'bd-highlight-marker' });
    // Diamond marker
    var pts = hPx + ',' + (hPy - 10) + ' '
            + (hPx + 8) + ',' + hPy + ' '
            + hPx + ',' + (hPy + 10) + ' '
            + (hPx - 8) + ',' + hPy;
    hg.appendChild(bdSvgNode('polygon', {
      points: pts,
      fill: hColor, stroke: '#0f172a',
      'class': 'bd-highlight-diamond'
    }));
    var hLbl = bdSvgNode('text', {
      x: hPx + 14, y: hPy + 4,
      'class': 'bd-highlight-label', fill: hColor
    });
    hLbl.textContent = h.label;
    hg.appendChild(hLbl);
    svg.appendChild(hg);
    highlightNodes.push(hg);
  }

  // ── Build legend ──────────────────────────────────────────────────────
  var legendContainer = root.querySelector('.bd-legend');
  if (legendContainer) {
    var legendDefs = [
      { label: 'Plan', color: '#94a3b8', dashed: true },
      { label: 'Actual', color: '#3b82f6', dashed: false }
    ];
    if (forecast.length > 0) {
      legendDefs.push({ label: 'Forecast', color: '#a78bfa', dashed: true });
    }
    if (isFinite(goalLine)) {
      legendDefs.push({ label: 'Goal', color: '#22c55e', dashed: true });
    }
    for (i = 0; i < legendDefs.length; i++) {
      var li = legendDefs[i];
      var item = document.createElement('div');
      item.className = 'bd-legend-item';
      var sw = document.createElement('span');
      sw.className = li.dashed ? 'bd-legend-swatch bd-legend-swatch--dashed' : 'bd-legend-swatch';
      if (li.dashed) {
        sw.style.setProperty('--bd-swatch-c', li.color);
      } else {
        sw.style.background = li.color;
      }
      item.appendChild(sw);
      var txt = document.createElement('span');
      txt.textContent = li.label;
      item.appendChild(txt);
      legendContainer.appendChild(item);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ANIMATIONS — all on pre-built DOM; no DOM mutations in onUpdate.
  // ═══════════════════════════════════════════════════════════════════════
  var t0 = SCENE_START;
  var drawDur = bdClamp(SCENE_DURATION * 0.15, 0.5, 1.2);

  // a) Grid fade-in
  master.to(gridGroup, { opacity: 1, duration: 0.4, ease: 'power2.out' }, t0 + 0.3);

  // b) Plan line reveal (clipPath rect width)
  var planClipRect = svg.querySelector('.bd-clip-plan');
  if (planClipRect) {
    master.to(planClipRect, {
      attr: { width: 1000 },
      duration: drawDur,
      ease: 'power2.out'
    }, t0 + 0.5);
  }

  // c) Reveal mask rect (for variance area — starts with plan)
  var maskRect = svg.querySelector('.bd-mask-rect');
  if (maskRect) {
    master.to(maskRect, {
      attr: { width: 1000 },
      duration: drawDur * 2,
      ease: 'power2.out'
    }, t0 + 0.5);
  }

  // d) Actual line draw (stroke-dashoffset on solid line)
  if (actualPath && actualPath.dataset.pathLength) {
    master.to(actualPath, {
      strokeDashoffset: 0,
      duration: drawDur,
      ease: 'power2.out'
    }, t0 + 0.5 + drawDur * 0.7);
  }

  // e) Actual dots pop (staggered during line draw)
  for (i = 0; i < actualDots.length; i++) {
    master.to(actualDots[i], {
      opacity: 1,
      duration: 0.2,
      ease: 'power2.out'
    }, t0 + 0.5 + drawDur * 0.7 + i * 0.08);
  }

  // f) Goal line fade-in
  if (goalGroup) {
    master.to(goalGroup.querySelectorAll('.bd-goal-line, .bd-goal-label'), {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out'
    }, t0 + 0.5 + drawDur * 1.0);
  }

  // g) Variance area fill
  if (variancePath) {
    master.to(variancePath, {
      fillOpacity: 0.12,
      duration: 0.6,
      ease: 'power2.out'
    }, t0 + 0.5 + drawDur * 1.4);
  }

  // h) Forecast line reveal (clipPath rect width + opacity)
  if (forecastPath) {
    master.to(forecastPath, { opacity: 0.7, duration: 0.01 }, t0 + 0.5 + drawDur * 1.6);
    var forecastClipRect = svg.querySelector('.bd-clip-forecast');
    if (forecastClipRect) {
      master.to(forecastClipRect, {
        attr: { width: 1000 },
        duration: drawDur * 0.8,
        ease: 'power2.out'
      }, t0 + 0.5 + drawDur * 1.6);
    }
  }

  // i) Today marker pop
  if (todayGroup) {
    master.to(todayGroup, {
      opacity: 1,
      duration: 0.35,
      ease: 'back.out(2)'
    }, t0 + 0.5 + drawDur * 2.0);
  }

  // j) Highlights stagger pop
  for (i = 0; i < highlightNodes.length; i++) {
    master.to(highlightNodes[i], {
      opacity: 1,
      duration: 0.3,
      ease: 'back.out(1.7)'
    }, t0 + 0.5 + drawDur * 2.2 + i * 0.2);
  }

  // k) Legend fade-in
  master.fromTo(__bdScope + '.bd-legend',
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    t0 + 0.5 + drawDur * 2.4);

}, [], SCENE_START + 0.25);

// ── 4. Exit fade ────────────────────────────────────────────────────────────

master.to(__bdScope + '.bd-shell',
  { autoAlpha: 0, y: -10, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
