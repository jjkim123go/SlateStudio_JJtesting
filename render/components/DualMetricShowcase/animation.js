// Intent: metal — side-by-side proof metrics should land with executive authority.
var S = '.scene-' + SCENE_ID + ' ';
var MAT = { enter: { duration: 0.3, ease: 'power3.out' }, exit: { duration: 0.2, ease: 'power3.in' }, stagger: 0.06, distance: 15 };

function parseMetrics(raw) {
  try {
    var parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function metricNumberParts(value) {
  var str = String(value == null ? '' : value);
  var match = str.match(/^([^0-9+\-.,]*)([+\-]?[0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);
  if (!match) return { prefix: '', target: 0, suffix: str, decimals: 0, numeric: false };
  var numeric = match[2].replace(/,/g, '');
  var decimals = numeric.indexOf('.') >= 0 ? numeric.split('.')[1].length : 0;
  return { prefix: match[1], target: parseFloat(numeric) || 0, suffix: match[3], decimals: decimals, numeric: true };
}

function renderMetric(containerSelector, metrics) {
  var el = document.querySelector(S + containerSelector);
  if (!el) return;
  metrics.forEach(function(metric) {
    var parts = metricNumberParts(metric.value);
    var row = document.createElement('div');
    row.className = 'dms-metric';
    row.innerHTML =
      '<div class="dms-metric-top"><span class="dms-label">' + (metric.label || '') + '</span><span class="dms-delta">' + (metric.delta || '') + '</span></div>' +
      '<div class="dms-value" data-prefix="' + parts.prefix + '" data-target="' + parts.target + '" data-suffix="' + parts.suffix + '" data-decimals="' + parts.decimals + '" data-numeric="' + parts.numeric + '">' + (parts.numeric ? '0' : (metric.value || '')) + '</div>' +
      '<div class="dms-note">' + (metric.note || '') + '</div>';
    el.appendChild(row);
  });
}

var root = document.querySelector(S + '.dms-root');
renderMetric('.dms-left-metrics', parseMetrics(root && root.getAttribute('data-left-metrics')));
renderMetric('.dms-right-metrics', parseMetrics(root && root.getAttribute('data-right-metrics')));

master.fromTo(S + '.dms-orbit',
  { autoAlpha: 0, scale: 0.92, y: 18 },
  { autoAlpha: 1, scale: 1, y: -10, duration: Math.max(3, SCENE_DURATION - 1.4), ease: 'sine.inOut', stagger: 0.18 },
  SCENE_START + 0.05);

master.fromTo(S + '.dms-eyebrow',
  { autoAlpha: 0, y: MAT.distance },
  { autoAlpha: 1, y: 0, duration: 0.3, ease: MAT.enter.ease },
  SCENE_START + 0.2);

master.fromTo(S + '.dms-title',
  { autoAlpha: 0, y: 22, scale: 0.98 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' },
  SCENE_START + 0.38);

master.fromTo(S + '.dms-panel',
  { autoAlpha: 0, y: 28, scale: 0.96, rotationX: 3 },
  { autoAlpha: 1, y: 0, scale: 1, rotationX: 0, duration: 0.48, ease: 'power3.out', stagger: 0.12 },
  SCENE_START + 0.85);

master.fromTo(S + '.dms-metric',
  { autoAlpha: 0, y: 18, scale: 0.97 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out', stagger: { each: MAT.stagger, from: 'edges' } },
  SCENE_START + 1.25);

document.querySelectorAll(S + '.dms-value').forEach(function(el, i) {
  var numeric = el.getAttribute('data-numeric') === 'true';
  if (!numeric) return;
  var target = parseFloat(el.getAttribute('data-target') || '0') || 0;
  var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
  var prefix = el.getAttribute('data-prefix') || '';
  var suffix = el.getAttribute('data-suffix') || '';
  var proxy = { value: 0 };
  master.to(proxy, {
    value: target,
    duration: 1.15,
    ease: 'power2.out',
    onUpdate: function() {
      el.textContent = prefix + (decimals > 0 ? proxy.value.toFixed(decimals) : Math.floor(proxy.value).toLocaleString()) + suffix;
    }
  }, SCENE_START + 1.45 + i * 0.08);
});

master.fromTo(S + '.dms-footer',
  { autoAlpha: 0, y: 12 },
  { autoAlpha: 1, y: 0, duration: 0.35, ease: MAT.enter.ease },
  SCENE_START + Math.min(5.0, SCENE_DURATION * 0.42));

master.to(S + '.dms-stage',
  { autoAlpha: 0, y: -10, duration: MAT.exit.duration, ease: MAT.exit.ease },
  SCENE_START + SCENE_DURATION - 0.35);
