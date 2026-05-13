// MetricStack — stacked metric rows with counter tweens, delta arrows
// All animations on master timeline (no standalone gsap.to, no repeat:-1)
var S = '.scene-' + SCENE_ID;

// --- Build metric rows from JSON data attribute ---
var rootEl = document.querySelector(S + ' .ms-root');
var gridEl = document.querySelector(S + ' .ms-grid');
var metricsRaw = rootEl ? rootEl.getAttribute('data-metrics-json') : '[]';
var metrics = [];
try { metrics = JSON.parse(metricsRaw); } catch(e) { metrics = []; }

if ((!Array.isArray(metrics) || metrics.length === 0) && typeof SCENE_PROPS === 'object' && SCENE_PROPS) {
  metrics = [1, 2, 3].map(function(index) {
    var label = SCENE_PROPS['metric' + index + 'Label'];
    var value = SCENE_PROPS['metric' + index + 'Value'];
    if (label == null && value == null) return null;
    var unit = SCENE_PROPS['metric' + index + 'Unit'] || '';
    return {
      label: label || '',
      value: String(value == null ? 0 : value) + unit,
      delta: SCENE_PROPS['metric' + index + 'Delta'] || '',
      note: SCENE_PROPS['metric' + index + 'Note'] || ''
    };
  }).filter(Boolean);
}

// Optional palette override via data attributes — backward compatible
var textColor  = (rootEl && rootEl.getAttribute('data-text-color')) || (SCENE_PROPS && SCENE_PROPS.textColor) || '#ffffff';
var mutedColor = (rootEl && rootEl.getAttribute('data-muted-text-color')) || (SCENE_PROPS && SCENE_PROPS.mutedTextColor) || 'rgba(255,255,255,0.55)';
var surfaceColor = (rootEl && rootEl.getAttribute('data-surface-color')) || (SCENE_PROPS && SCENE_PROPS.surfaceColor) || 'rgba(30,41,59,0.55)';
var elevatedSurfaceColor = (rootEl && rootEl.getAttribute('data-elevated-surface-color')) || surfaceColor;
var borderColor = (rootEl && rootEl.getAttribute('data-border-color')) || (SCENE_PROPS && SCENE_PROPS.borderColor) || 'rgba(148,163,184,0.12)';
var primaryColor = (rootEl && rootEl.getAttribute('data-primary-color')) || '#38bdf8';
var accentColor = (rootEl && rootEl.getAttribute('data-accent-color')) || '#818cf8';
var accentFrom = (rootEl && rootEl.getAttribute('data-accent-from')) || primaryColor;
var accentTo   = (rootEl && rootEl.getAttribute('data-accent-to'))   || accentColor;
var rowBg      = (rootEl && rootEl.getAttribute('data-row-bg')) || surfaceColor;
var rowStroke  = (rootEl && rootEl.getAttribute('data-row-stroke')) || borderColor;
var bgFrom     = rootEl && rootEl.getAttribute('data-bg-from');
var bgTo       = rootEl && rootEl.getAttribute('data-bg-to');
var panelGlow  = rootEl && rootEl.getAttribute('data-panel-glow');
var panelBg    = rootEl && rootEl.getAttribute('data-panel-bg');
var panelStroke= rootEl && rootEl.getAttribute('data-panel-stroke');
var bounds = rootEl && rootEl.getBoundingClientRect ? rootEl.getBoundingClientRect() : { width: 1920, height: 1080 };
var compact = bounds.height > bounds.width * 1.12 || bounds.width < 900;

if (rootEl && (bgFrom || bgTo || panelGlow)) {
  var glow = panelGlow || 'rgba(56,189,248,0.10)';
  var from = bgFrom || '#020617';
  var to   = bgTo   || '#0f172a';
  rootEl.style.background =
    'radial-gradient(circle at 30% 20%,' + glow + ',transparent 50%),' +
    'linear-gradient(135deg,' + from + ' 0%,' + to + ' 100%)';
}
var panelEl = document.querySelector(S + ' .ms-panel');
if (panelEl && (panelBg || panelStroke)) {
  if (panelBg)     panelEl.style.background = panelBg;
  if (panelStroke) panelEl.style.border     = '1px solid ' + panelStroke;
}
if (compact && panelEl) {
  panelEl.style.width = '78%';
  panelEl.style.padding = '40px 34px';
  panelEl.style.borderRadius = '28px';
}
var titleEl = document.querySelector(S + ' .ms-title');
if (compact && titleEl) {
  titleEl.style.fontSize = '46px';
  titleEl.style.marginBottom = '30px';
}

metrics.forEach(function(m, i) {
  var numericVal = parseFloat(String(m.value).replace(/[^0-9.\-]/g, '')) || 0;
  var prefix = String(m.value).replace(/[0-9.\-,]+.*/, '');
  var trailMatch = String(m.value).match(/[0-9.\-,]+(.*)$/);
  var trail = trailMatch ? trailMatch[1] : '';
  var decParts = String(m.value).split('.');
  var decPlaces = decParts.length > 1 ? decParts[1].replace(/[^0-9]/g, '').length : 0;
  var isUp = !m.delta || m.delta.indexOf('-') === -1;
  var deltaColor = isUp ? '#22c55e' : '#f43f5e';

  var row = document.createElement('div');
  row.className = 'ms-row';
  if (compact) {
    row.style.cssText = 'display:grid;grid-template-columns:96px 1fr;grid-template-areas:"label label" "value delta" "note note";align-items:center;gap:6px 18px;padding:20px 24px;border-radius:18px;'
      + 'background:' + rowBg + ';border:1px solid ' + rowStroke + ';opacity:0;overflow:hidden';
  } else {
    row.style.cssText = 'display:flex;align-items:center;padding:22px 28px;border-radius:18px;'
      + 'background:' + rowBg + ';border:1px solid ' + rowStroke + ';opacity:0;overflow:hidden';
  }

  var labelStyle = 'font-size:' + (compact ? '18px' : '24px') + ';font-weight:500;color:' + mutedColor + ';letter-spacing:0.04em;text-transform:uppercase;min-width:0;';
  var valueStyle = 'font-size:' + (compact ? '48px' : '56px') + ';font-weight:800;letter-spacing:-0.03em;line-height:1.05;font-variant-numeric:tabular-nums;background:linear-gradient(135deg,' + accentFrom + ',' + accentTo + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;min-width:0;';
  var deltaStyle = 'display:flex;align-items:center;gap:8px;color:' + deltaColor + ';min-width:0;';
  var deltaTextStyle = 'font-size:' + (compact ? '24px' : '28px') + ';font-weight:700;line-height:1.08;overflow-wrap:anywhere;';
  var noteStyle = 'font-size:' + (compact ? '16px' : '18px') + ';line-height:1.35;color:' + mutedColor + ';min-width:0;overflow-wrap:anywhere;';

  if (compact) {
    row.innerHTML =
      '<span class="ms-label" style="grid-area:label;' + labelStyle + '">' + (m.label || '') + '</span>'
      + '<span class="ms-val" data-target="' + numericVal + '" data-prefix="' + prefix
      + '" data-trail="' + trail + '" data-decimals="' + decPlaces + '" style="grid-area:value;' + valueStyle + '">0</span>'
      + '<div class="ms-delta" style="grid-area:delta;' + deltaStyle + '">'
      + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
      + (isUp ? '<path d="M7 17 L17 7 M17 7 L17 14 M17 7 L10 7"/>' : '<path d="M17 7 L7 17 M7 17 L7 10 M7 17 L14 17"/>')
      + '</svg><span style="' + deltaTextStyle + '">' + (m.delta || '') + '</span></div>'
      + (m.note ? '<div style="grid-area:note;' + noteStyle + '">' + m.note + '</div>' : '');
  } else {
    row.innerHTML =
      '<div style="flex:1;display:flex;flex-direction:column;gap:4px;min-width:0">'
      + '<span class="ms-label" style="' + labelStyle + '">' + (m.label || '') + '</span>'
      + '<span class="ms-val" data-target="' + numericVal + '" data-prefix="' + prefix
      + '" data-trail="' + trail + '" data-decimals="' + decPlaces + '" style="' + valueStyle + '">0</span></div>'
      + '<div class="ms-delta" style="' + deltaStyle + '"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
      + (isUp ? '<path d="M7 17 L17 7 M17 7 L17 14 M17 7 L10 7"/>' : '<path d="M17 7 L7 17 M7 17 L7 10 M7 17 L14 17"/>')
      + '</svg><span style="' + deltaTextStyle + '">' + (m.delta || '') + '</span></div>'
      + (m.note ? '<div style="flex:0 1 300px;margin-left:24px;' + noteStyle + '">' + m.note + '</div>' : '');
  }

  gridEl.appendChild(row);
});

// --- Animations ---

// Phase 1: panel entrance
master.fromTo(S + ' .ms-panel',
  { autoAlpha: 0, y: 28, scale: 0.97 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' },
  SCENE_START + 0.15);

// Phase 2: title
master.fromTo(S + ' .ms-title',
  { autoAlpha: 0, y: 16 },
  { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' },
  SCENE_START + 0.45);

// Phase 3: rows staggered reveal
master.fromTo(S + ' .ms-row',
  { autoAlpha: 0, y: 24, scale: 0.94 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.35)', stagger: 0.18 },
  SCENE_START + 0.85);

// Phase 4: counter tweens for each row — ON the master timeline
var valEls = document.querySelectorAll(S + ' .ms-val');
valEls.forEach(function(el, i) {
  var target = parseFloat(el.getAttribute('data-target')) || 0;
  var pfx = el.getAttribute('data-prefix') || '';
  var trl = el.getAttribute('data-trail') || '';
  var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
  var proxy = { val: 0 };
  master.to(proxy, {
    val: target,
    duration: 1.2,
    ease: 'power1.out',
    onUpdate: function() {
      el.textContent = pfx + (dec > 0 ? proxy.val.toFixed(dec) : String(Math.floor(proxy.val))) + trl;
    }
  }, SCENE_START + 1.1 + i * 0.18);
});

// Fade out near scene end
master.to(S + ' .ms-panel',
  { autoAlpha: 0, y: -14, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.45);
