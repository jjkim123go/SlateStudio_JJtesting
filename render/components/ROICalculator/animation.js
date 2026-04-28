// ROICalculator — inputs table, formula token highlight, steps, result counter, sensitivity bars
var __roiScope = '.scene-' + SCENE_ID + ' ';

// ── Helpers ──
function __roiParse(id) {
  var el = document.getElementById(id);
  if (!el) return null;
  var raw = el.textContent.trim();
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function __roiFmtNum(n) {
  if (typeof n !== 'number' || !isFinite(n)) return String(n);
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return n % 1 !== 0 ? n.toFixed(1) : n.toLocaleString();
}

// ── Parse data islands ──
var __roiInputs     = __roiParse('roi-inputs-'  + SCENE_ID) || [];
var __roiFormula    = __roiParse('roi-formula-' + SCENE_ID);
var __roiResult     = __roiParse('roi-result-'  + SCENE_ID) || {};
var __roiSteps      = __roiParse('roi-steps-'   + SCENE_ID) || [];
var __roiSensitivity = __roiParse('roi-sens-'   + SCENE_ID) || [];

// Cap arrays per spec
__roiInputs      = __roiInputs.slice(0, 8);
__roiSteps       = __roiSteps.slice(0, 5);
__roiSensitivity = __roiSensitivity.slice(0, 5);

// ── Track cumulative timeline offset ──
var __roiT = 0;

// ── 1. Title fade-in ──
master.fromTo(__roiScope + '.roi-title',
  { opacity: 0, y: 16 },
  { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 0.1);

// ── 2. Build & stagger input rows ──
master.call(function() {
  var container = document.querySelector(__roiScope + '.roi-inputs');
  if (!container) return;
  __roiInputs.forEach(function(inp, i) {
    var row = document.createElement('div');
    row.className = 'roi-input-row';

    var lbl = document.createElement('span');
    lbl.className = 'roi-input-label';
    lbl.textContent = inp.label || inp.id;
    row.appendChild(lbl);

    var valWrap = document.createElement('span');
    var valEl = document.createElement('span');
    valEl.className = 'roi-input-val';
    valEl.textContent = __roiFmtNum(inp.value);
    valWrap.appendChild(valEl);

    if (inp.unit) {
      var u = document.createElement('span');
      u.className = 'roi-input-unit';
      u.textContent = inp.unit;
      valWrap.appendChild(u);
    }
    if (inp.source) {
      var s = document.createElement('span');
      s.className = 'roi-input-src';
      s.textContent = '(' + inp.source + ')';
      valWrap.appendChild(s);
    }
    row.appendChild(valWrap);
    container.appendChild(row);

    master.fromTo(row,
      { opacity: 0, x: -12 },
      { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' },
      SCENE_START + 0.3 + i * 0.15);
  });
}, [], SCENE_START + 0.25);

__roiT = 0.3 + __roiInputs.length * 0.15 + 0.3;

// ── 3. Formula bar — render with token spans, then highlight each ──
master.call(function() {
  if (!__roiFormula || !__roiFormula.template) return;
  var bar = document.querySelector(__roiScope + '.roi-formula-bar');
  if (!bar) return;

  // Build a set of known token ids
  var tokenIds = {};
  (__roiFormula.tokens || []).forEach(function(tok) { tokenIds[tok.id] = tok; });

  // Tokenize: split on known ids, wrapping matches in roi-tok spans
  // Sort ids by length descending so longer ids match first
  var ids = Object.keys(tokenIds).sort(function(a, b) { return b.length - a.length; });
  var tmpl = __roiFormula.template;
  var html = '';
  var pos = 0;

  while (pos < tmpl.length) {
    var matched = false;
    for (var k = 0; k < ids.length; k++) {
      var tid = ids[k];
      if (tmpl.substr(pos, tid.length) === tid) {
        html += '<span class="roi-tok" data-token-id="' + tid + '">' + tid + '</span>';
        pos += tid.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Escape HTML for plain text chars
      var ch = tmpl.charAt(pos);
      if (ch === '<') html += '&lt;';
      else if (ch === '>') html += '&gt;';
      else if (ch === '&') html += '&amp;';
      else html += ch;
      pos++;
    }
  }

  bar.innerHTML = html;

  // Animate formula bar reveal
  master.fromTo(bar,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    SCENE_START + __roiT);

  // Highlight each token in sequence
  var tokEls = bar.querySelectorAll('.roi-tok');
  var highlightStart = SCENE_START + __roiT + 0.5;
  for (var t = 0; t < tokEls.length; t++) {
    (function(el, idx) {
      var at = highlightStart + idx * 0.4;
      master.call(function() {
        el.classList.add('roi-tok-highlight');
        gsap.to(el, {
          backgroundColor: 'rgba(56,189,248,0)',
          duration: 0.6,
          delay: 0.3,
          onComplete: function() { el.classList.remove('roi-tok-highlight'); }
        });
      }, [], at);
    })(tokEls[t], t);
  }

  // Update cumulative offset
  __roiT = __roiT + 0.5 + (tokEls.length * 0.4) + 0.3;
}, [], SCENE_START + __roiT - 0.05);

// ── 4. Steps cascade ──
master.call(function() {
  if (!__roiSteps.length) return;
  var container = document.querySelector(__roiScope + '.roi-steps');
  if (!container) return;

  __roiSteps.forEach(function(step, i) {
    var row = document.createElement('div');
    row.className = 'roi-step';

    var desc = document.createElement('span');
    desc.className = 'roi-step-desc';
    desc.textContent = step.description || '';
    row.appendChild(desc);

    var val = document.createElement('span');
    val.className = 'roi-step-val';
    val.textContent = typeof step.value === 'number' ? __roiFmtNum(step.value) : String(step.value);
    row.appendChild(val);

    container.appendChild(row);

    master.fromTo(row,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
      SCENE_START + __roiT + i * 0.2);
  });

  __roiT = __roiT + __roiSteps.length * 0.2 + 0.2;
}, [], SCENE_START + 0.1);

// ── 5. Result card scale-up + counter ──
master.call(function() {
  var resultCard = document.querySelector(__roiScope + '.roi-result');
  if (!resultCard) return;

  // Populate label and unit
  var labelEl = resultCard.querySelector('.roi-result-label');
  var unitEl  = resultCard.querySelector('.roi-result-unit');
  var valEl   = resultCard.querySelector('.roi-result-value');

  if (labelEl) labelEl.textContent = __roiResult.label || '';
  if (unitEl)  unitEl.textContent  = __roiResult.unit || '';
  if (valEl)   valEl.setAttribute('data-target', String(__roiResult.value || 0));

  // Scale-up reveal with back ease
  var resultAt = SCENE_START + Math.max(__roiT, 3.5);
  master.fromTo(resultCard,
    { opacity: 0, scale: 0.85 },
    { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.7)' },
    resultAt);

  // Counter roll
  master.call(function() {
    var target = parseFloat(valEl.getAttribute('data-target')) || 0;
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: function() {
        valEl.textContent = __roiFmtNum(obj.v);
      },
      onComplete: function() {
        valEl.textContent = __roiFmtNum(target);
      }
    });
  }, [], resultAt + 0.15);

  // ── 6. Sensitivity bars ──
  if (__roiSensitivity.length) {
    var sensContainer = document.querySelector(__roiScope + '.roi-sensitivity');
    if (!sensContainer) {
      __roiSensitivity = [];
      return;
    }

    var sensStart = resultAt + 1.2;
    __roiSensitivity.forEach(function(s, i) {
      var row = document.createElement('div');
      row.className = 'roi-sens-row';

      // Find input label for this id
      var inputMatch = __roiInputs.filter(function(inp) { return inp.id === s.inputId; })[0];
      var lbl = document.createElement('span');
      lbl.className = 'roi-sens-label';
      lbl.textContent = inputMatch ? inputMatch.label : s.inputId;
      row.appendChild(lbl);

      var track = document.createElement('div');
      track.className = 'roi-sens-track';
      var fill = document.createElement('div');
      fill.className = 'roi-sens-fill';
      track.appendChild(fill);
      row.appendChild(track);

      var range = document.createElement('span');
      range.className = 'roi-sens-range';
      var impactMin = typeof s.impact[0] === 'number' ? __roiFmtNum(s.impact[0]) : s.impact[0];
      var impactMax = typeof s.impact[1] === 'number' ? __roiFmtNum(s.impact[1]) : s.impact[1];
      range.textContent = impactMin + ' → ' + impactMax;
      row.appendChild(range);

      sensContainer.appendChild(row);

      var rowAt = sensStart + i * 0.25;
      master.fromTo(row,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' },
        rowAt);

      // Animate fill width based on relative impact magnitude
      var maxResult = __roiResult.value || 1;
      var pct = Math.min(100, Math.round((Math.abs(s.impact[1]) / Math.abs(maxResult)) * 100));
      master.fromTo(fill,
        { width: '0%' },
        { width: pct + '%', duration: 0.8, ease: 'power2.out' },
        rowAt + 0.15);
    });
  }

  // ── 7. Disclaimer fade ──
  var disclaimerAt = resultAt + 2.2;
  master.fromTo(__roiScope + '.roi-disclaimer',
    { opacity: 0 },
    { opacity: 1, duration: 0.4, ease: 'power2.out' },
    disclaimerAt);

}, [], SCENE_START + 0.1);

// ── 8. Exit fade ──
master.to(__roiScope + '.roi-root',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
