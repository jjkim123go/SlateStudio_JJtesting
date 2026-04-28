// MetricStack — stacked metric rows with counter tweens, delta arrows
// All animations on master timeline (no standalone gsap.to, no repeat:-1)
var S = '.scene-' + SCENE_ID;

// --- Build metric rows from JSON data attribute ---
var rootEl = document.querySelector(S + ' .ms-root');
var gridEl = document.querySelector(S + ' .ms-grid');
var metricsRaw = rootEl ? rootEl.getAttribute('data-metrics-json') : '[]';
var metrics = [];
try { metrics = JSON.parse(metricsRaw); } catch(e) { metrics = []; }

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
  row.style.cssText = 'display:flex;align-items:center;padding:22px 28px;border-radius:18px;'
    + 'background:rgba(30,41,59,0.55);border:1px solid rgba(148,163,184,0.12);opacity:0';

  row.innerHTML =
    '<div style="flex:1;display:flex;flex-direction:column;gap:4px">'
    + '<span class="ms-label" style="font-size:24px;font-weight:500;color:rgba(255,255,255,0.55);'
    + 'letter-spacing:0.04em;text-transform:uppercase">' + (m.label || '') + '</span>'
    + '<span class="ms-val" data-target="' + numericVal + '" data-prefix="' + prefix
    + '" data-trail="' + trail + '" data-decimals="' + decPlaces
    + '" style="font-size:56px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;'
    + 'font-variant-numeric:tabular-nums;'
    + 'background:linear-gradient(135deg,#38bdf8,#818cf8);-webkit-background-clip:text;'
    + '-webkit-text-fill-color:transparent">0</span>'
    + '</div>'
    + '<div class="ms-delta" style="display:flex;align-items:center;gap:8px;color:' + deltaColor + '">'
    + '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
    + (isUp
      ? '<path d="M7 17 L17 7 M17 7 L17 14 M17 7 L10 7"/>'
      : '<path d="M17 7 L7 17 M7 17 L7 10 M7 17 L14 17"/>')
    + '</svg>'
    + '<span style="font-size:28px;font-weight:600">' + (m.delta || '') + '</span>'
    + '</div>';

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
