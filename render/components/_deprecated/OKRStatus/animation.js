/*
 * OKRStatus
 * Purpose: build KR DOM once, then animate objective + KR progress.
 * Rule: if progressPct is present, use it for both bar width and displayed percent.
 * Otherwise derive from (current - baseline) / (target - baseline) * 100, clamped [0, 100].
 */
(function() {
var __okrScope = '.scene-' + SCENE_ID + ' ';
var __okrRoot = document.querySelector(__okrScope + '.okr-root');

if (!__okrRoot) {
  return;
}

var SVG_NS = 'http://www.w3.org/2000/svg';

function __okrClamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function __okrNum(value, fallback) {
  var numeric = Number(value);
  return isFinite(numeric) ? numeric : fallback;
}

function __okrParseIsland(id) {
  var node = document.getElementById(id);
  if (!node) return null;
  var raw = String(node.textContent || '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function __okrStatusLabel(value) {
  if (!value) return '';
  return String(value)
    .split('-')
    .map(function(part) {
      return part ? part.charAt(0).toUpperCase() + part.slice(1) : '';
    })
    .join(' ');
}

function __okrFormatMetric(value, unit) {
  var numeric = __okrNum(value, null);
  if (numeric === null) return String(value || '');
  var abs = Math.abs(numeric);
  var decimals = abs >= 100 || Math.round(numeric) === numeric ? 0 : abs >= 10 ? 1 : 2;
  var formatted = numeric.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  var normalizedUnit = String(unit || '').trim();
  if (!normalizedUnit) return formatted;
  if (/^[€£$]/.test(normalizedUnit)) return normalizedUnit + formatted;
  if (normalizedUnit === '%') return formatted + normalizedUnit;
  return formatted + ' ' + normalizedUnit;
}

function __okrResolveProgress(kr) {
  if (kr.progressPct !== null && kr.progressPct !== undefined && kr.progressPct !== '') {
    return __okrClamp(__okrNum(kr.progressPct, 0), 0, 100);
  }
  var baseline = __okrNum(kr.baseline, 0);
  var current = __okrNum(kr.current, 0);
  var target = __okrNum(kr.target, 0);
  var denominator = target - baseline;
  if (!isFinite(denominator) || denominator === 0) {
    return current >= target ? 100 : 0;
  }
  return __okrClamp(((current - baseline) / denominator) * 100, 0, 100);
}

function __okrCreateEl(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function __okrSvgNode(name, attrs) {
  var node = document.createElementNS(SVG_NS, name);
  Object.keys(attrs || {}).forEach(function(key) {
    node.setAttribute(key, String(attrs[key]));
  });
  return node;
}

function __okrBuildSparklinePoints(values) {
  if (!Array.isArray(values) || !values.length) return null;
  var nums = values
    .map(function(value) { return __okrNum(value, null); })
    .filter(function(value) { return value !== null; });
  if (!nums.length) return null;

  var min = Math.min.apply(Math, nums);
  var max = Math.max.apply(Math, nums);
  var range = max - min || 1;
  var width = 120;
  var height = 32;
  var inset = 3;
  var step = nums.length === 1 ? 0 : (width - inset * 2) / (nums.length - 1);
  var points = nums.map(function(value, index) {
    var x = inset + step * index;
    var y = height - inset - (((value - min) / range) * (height - inset * 2));
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    };
  });

  return {
    points: points.map(function(point) { return point.x + ',' + point.y; }).join(' '),
    endX: points[points.length - 1].x,
    endY: points[points.length - 1].y
  };
}

function __okrBuildKRCard(kr, index) {
  var article = __okrCreateEl('article', 'okr-kr');
  article.setAttribute('data-kr-id', kr.id);
  article.setAttribute('data-kr-status', kr.status || '');

  var head = __okrCreateEl('div', 'okr-kr-head');
  var copy = __okrCreateEl('div', 'okr-kr-copy');
  copy.appendChild(__okrCreateEl('div', 'okr-kr-eyebrow', 'KR ' + kr.id));
  copy.appendChild(__okrCreateEl('h2', 'okr-kr-title', kr.title));

  var summary = __okrCreateEl('div', 'okr-kr-summary');
  var progressPill = __okrCreateEl('div', 'okr-progress-pill');
  var progressValue = __okrCreateEl('span', 'okr-progress-value', '0%');
  progressPill.appendChild(progressValue);

  var statusChip = __okrCreateEl('span', 'okr-status-chip', __okrStatusLabel(kr.status));
  statusChip.setAttribute('data-okr-status-chip', '');
  if (kr.status) {
    statusChip.classList.add('okr-status-chip--' + kr.status);
  }

  summary.appendChild(progressPill);
  summary.appendChild(statusChip);
  head.appendChild(copy);
  head.appendChild(summary);

  var metrics = __okrCreateEl('div', 'okr-kr-metrics');
  [
    ['Baseline', __okrFormatMetric(__okrNum(kr.baseline, 0), kr.unit)],
    ['Current', __okrFormatMetric(__okrNum(kr.current, 0), kr.unit)],
    ['Target', __okrFormatMetric(__okrNum(kr.target, 0), kr.unit)]
  ].forEach(function(metric) {
    var metricNode = __okrCreateEl('div', 'okr-metric');
    metricNode.appendChild(__okrCreateEl('span', 'okr-metric-label', metric[0]));
    metricNode.appendChild(__okrCreateEl('span', 'okr-metric-value', metric[1]));
    metrics.appendChild(metricNode);
  });

  var barTrack = __okrCreateEl('div', 'okr-bar-track');
  barTrack.setAttribute('aria-hidden', 'true');
  var barFill = __okrCreateEl('div', 'okr-bar-fill');
  barFill.style.width = '0%';
  barTrack.appendChild(barFill);

  var sparkWrap = __okrCreateEl('div', 'okr-sparkline-wrap');
  var sparkReveal = null;
  var sparkDot = null;
  var sparkData = __okrBuildSparklinePoints(kr.sparkline);

  if (sparkData) {
    var sparkId = String(kr.id || index + 1).replace(/\s+/g, '-');
    var gradientId = 'okr-spark-gradient-' + sparkId + '-' + SCENE_ID;
    var clipId = 'okr-spark-clip-' + sparkId + '-' + SCENE_ID;
    var svg = __okrSvgNode('svg', {
      class: 'okr-sparkline',
      viewBox: '0 0 120 32',
      preserveAspectRatio: 'none',
      role: 'presentation',
      'aria-hidden': 'true'
    });
    var defs = __okrSvgNode('defs', {});
    var gradient = __okrSvgNode('linearGradient', {
      id: gradientId,
      x1: '0',
      x2: '1',
      y1: '0',
      y2: '0'
    });
    gradient.appendChild(__okrSvgNode('stop', { offset: '0%', 'stop-color': '#38bdf8' }));
    gradient.appendChild(__okrSvgNode('stop', { offset: '100%', 'stop-color': '#22c55e' }));
    var clipPath = __okrSvgNode('clipPath', { id: clipId });
    sparkReveal = __okrSvgNode('rect', {
      class: 'okr-sparkline-reveal',
      x: '0',
      y: '0',
      width: '0',
      height: '32'
    });
    clipPath.appendChild(sparkReveal);
    defs.appendChild(gradient);
    defs.appendChild(clipPath);
    svg.appendChild(defs);
    svg.appendChild(__okrSvgNode('polyline', {
      class: 'okr-sparkline-track',
      points: '0,16 120,16'
    }));
    svg.appendChild(__okrSvgNode('polyline', {
      class: 'okr-sparkline-line',
      points: sparkData.points,
      stroke: 'url(#' + gradientId + ')',
      'clip-path': 'url(#' + clipId + ')'
    }));
    sparkDot = __okrSvgNode('circle', {
      class: 'okr-sparkline-dot',
      cx: String(sparkData.endX),
      cy: String(sparkData.endY),
      r: '0'
    });
    svg.appendChild(sparkDot);
    sparkWrap.appendChild(svg);
  } else {
    sparkWrap.classList.add('okr-sparkline-wrap--empty');
    sparkWrap.hidden = true;
  }

  var commentary = __okrCreateEl('p', 'okr-commentary', kr.commentary || '');
  if (!kr.commentary) {
    commentary.classList.add('okr-commentary--empty');
  }

  article.appendChild(head);
  article.appendChild(metrics);
  article.appendChild(barTrack);
  article.appendChild(sparkWrap);
  article.appendChild(commentary);

  return {
    card: article,
    progressEl: progressValue,
    barFill: barFill,
    statusChip: statusChip,
    sparkWrap: sparkWrap,
    sparkReveal: sparkReveal,
    sparkDot: sparkDot,
    hasSparkline: !!sparkData,
  };
}

var __okrList = __okrRoot.querySelector('[data-section="keyResults"]');
var __okrIsland = __okrParseIsland('okr-krs-data-' + SCENE_ID);
var __okrKeyResults = Array.isArray(__okrIsland) ? __okrIsland : [];
var __okrThemeMode = (__okrRoot.dataset.themeMode || '').trim() || 'cards';
if (__okrThemeMode !== 'stacked-bars') {
  __okrThemeMode = 'cards';
}
__okrRoot.classList.add('okr-root--' + __okrThemeMode);

var __okrOverallChip = __okrRoot.querySelector('[data-okr-overall-status]');
var __okrOverallStatus = (__okrRoot.dataset.status || '').trim();
if (__okrOverallChip) {
  __okrOverallChip.textContent = __okrStatusLabel(__okrOverallStatus);
  if (__okrOverallStatus) {
    __okrOverallChip.classList.add('okr-status-chip--' + __okrOverallStatus);
  }
}

var __okrCardModels = [];
if (__okrList) {
  __okrList.textContent = '';
  __okrKeyResults.forEach(function(rawKr, index) {
    var kr = {
      id: rawKr && rawKr.id != null ? String(rawKr.id) : String(index + 1),
      title: rawKr && rawKr.title != null ? String(rawKr.title) : '',
      baseline: rawKr && rawKr.baseline != null ? rawKr.baseline : 0,
      current: rawKr && rawKr.current != null ? rawKr.current : 0,
      target: rawKr && rawKr.target != null ? rawKr.target : 0,
      unit: rawKr && rawKr.unit != null ? String(rawKr.unit) : '',
      progressPct: rawKr ? rawKr.progressPct : null,
      status: rawKr && rawKr.status != null ? String(rawKr.status) : '',
      sparkline: rawKr && Array.isArray(rawKr.sparkline) ? rawKr.sparkline : null,
      commentary: rawKr && rawKr.commentary != null ? String(rawKr.commentary) : ''
    };
    var model = __okrBuildKRCard(kr, index);
    model.kr = kr;
    model.progress = __okrResolveProgress(kr);
    __okrCardModels.push(model);
    __okrList.appendChild(model.card);
  });
}

var __okrHeaderStart = SCENE_START + 0.08;
var __okrCardsStart = SCENE_START + 0.42;
var __okrCardStagger = __okrThemeMode === 'stacked-bars' ? 0.14 : 0.18;
var __okrBarLead = __okrThemeMode === 'stacked-bars' ? 0.2 : 0.26;
var __okrExitDuration = __okrClamp(SCENE_DURATION * 0.12, 0.28, 0.48);

master.fromTo(__okrScope + '.okr-header',
  { autoAlpha: 0, y: 28 },
  { autoAlpha: 1, y: 0, duration: 0.64, ease: 'power3.out' },
  __okrHeaderStart);

master.fromTo(__okrScope + '.okr-header .okr-pill, ' + __okrScope + '.okr-objective, ' + __okrScope + '.okr-supporting > *',
  { autoAlpha: 0, y: 18 },
  { autoAlpha: 1, y: 0, duration: 0.48, ease: 'power2.out', stagger: 0.07 },
  __okrHeaderStart + 0.06);

if (__okrOverallChip) {
  master.fromTo(__okrOverallChip,
    { autoAlpha: 0, scale: 0.92, filter: 'blur(5px)' },
    { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.46, ease: 'back.out(1.45)' },
    __okrHeaderStart + 0.16);
  master.to(__okrOverallChip,
    { boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 0 28px var(--okr-status-shadow)', duration: 0.32, ease: 'power2.out' },
    __okrHeaderStart + 0.34);
}

__okrCardModels.forEach(function(model, index) {
  var cardStart = __okrCardsStart + index * __okrCardStagger;
  var counterState = { value: 0 };

  master.fromTo(model.card,
    { autoAlpha: 0, y: 22, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.48, ease: 'power3.out' },
    cardStart);

  if (model.statusChip) {
    master.fromTo(model.statusChip,
      { autoAlpha: 0, scale: 0.9, filter: 'blur(4px)' },
      { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.38, ease: 'back.out(1.5)' },
      cardStart + 0.12);
    master.to(model.statusChip,
      { boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 0 22px var(--okr-status-shadow)', duration: 0.28, ease: 'power2.out' },
      cardStart + 0.26);
  }

  master.to(model.barFill, {
    width: model.progress + '%',
    duration: 0.72,
    ease: 'power2.out'
  }, cardStart + __okrBarLead);

  master.to(counterState, {
    value: model.progress,
    duration: 0.72,
    ease: 'power2.out',
    onUpdate: function() {
      model.progressEl.textContent = Math.round(counterState.value) + '%';
    },
    onComplete: function() {
      model.progressEl.textContent = Math.round(model.progress) + '%';
    }
  }, cardStart + __okrBarLead);

  if (model.hasSparkline && model.sparkReveal) {
    master.to(model.sparkReveal, {
      attr: { width: 120 },
      duration: 0.42,
      ease: 'power2.out'
    }, cardStart + __okrBarLead + 0.44);
  }

  if (model.hasSparkline && model.sparkDot) {
    master.fromTo(model.sparkDot,
      { attr: { r: 0 } },
      { attr: { r: 3.25 }, duration: 0.18, ease: 'power2.out' },
      cardStart + __okrBarLead + 0.66);
  }
});

master.to(__okrScope + '.okr-root',
  { autoAlpha: 0, y: -10, duration: __okrExitDuration, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - __okrExitDuration);
})();
