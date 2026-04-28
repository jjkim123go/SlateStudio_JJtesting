// CustomerStory — logo+name, quote wipe, attribution, metric chips with counters
var __csScope = '.scene-' + SCENE_ID + ' ';

// ── 1. Header fade-in (logo + name + industry) ──
master.fromTo(__csScope + '.cs-header',
  { opacity: 0, y: 16 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.1);

// ── 2. Quote wipe via clip-path ──
master.fromTo(__csScope + '.cs-quote-wrap',
  { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
  { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.out' },
  SCENE_START + 0.5);

// ── 3. Attribution fade-in ──
master.fromTo(__csScope + '.cs-attr',
  { opacity: 0, y: 12 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 1.8);

// ── 4. Metric chips — build from data-island, then cascade + counter ──
master.call(function() {
  var island = document.getElementById('cs-data-' + SCENE_ID);
  if (!island) return;
  var raw = island.textContent.trim();
  if (!raw || raw === 'undefined' || raw === 'null') return;
  var metrics;
  try { metrics = JSON.parse(raw); } catch (e) { return; }
  if (!Array.isArray(metrics)) return;

  // Cap at 6
  metrics = metrics.slice(0, 6);
  var container = document.querySelector(__csScope + '.cs-metrics');
  if (!container) return;

  metrics.forEach(function(m, i) {
    var chip = document.createElement('div');
    chip.className = 'cs-chip';

    var valSpan = document.createElement('span');
    valSpan.className = 'cs-chip-value';
    valSpan.setAttribute('data-target', String(m.value));
    valSpan.textContent = '0';
    chip.appendChild(valSpan);

    if (m.unit) {
      var unitSpan = document.createElement('span');
      unitSpan.className = 'cs-chip-unit';
      unitSpan.textContent = m.unit;
      valSpan.appendChild(unitSpan);
    }

    var labelEl = document.createElement('div');
    labelEl.className = 'cs-chip-label';
    labelEl.textContent = m.label || '';
    chip.appendChild(labelEl);

    if (m.deltaPct != null) {
      var deltaEl = document.createElement('div');
      deltaEl.className = 'cs-chip-delta';
      var neg = m.deltaPct < 0;
      deltaEl.setAttribute('data-negative', String(neg));
      deltaEl.textContent = (neg ? '' : '+') + m.deltaPct + '%';
      chip.appendChild(deltaEl);
    }

    container.appendChild(chip);

    // Cascade fade-in per chip
    var delay = SCENE_START + 2.3 + i * 0.25;
    master.fromTo(chip,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      delay);

    // Counter roll for numeric values
    master.call(function() {
      var target = parseFloat(valSpan.getAttribute('data-target'));
      if (!isFinite(target)) { valSpan.textContent = String(m.value); return; }
      var obj = { v: 0 };
      var isFloat = target % 1 !== 0;
      var unitText = m.unit || '';
      // Build DOM structure ONCE (number span + optional unit span); animation
      // only mutates numSpan.textContent. Avoids per-frame appendChild leak.
      valSpan.textContent = '';
      var numSpan = document.createElement('span');
      numSpan.className = 'cs-chip-num';
      valSpan.appendChild(numSpan);
      if (unitText) {
        var u = document.createElement('span');
        u.className = 'cs-chip-unit';
        u.textContent = unitText;
        valSpan.appendChild(u);
      }
      gsap.to(obj, {
        v: target,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: function() {
          numSpan.textContent = isFloat ? obj.v.toFixed(1) : Math.round(obj.v).toLocaleString();
        }
      });
    }, [], delay + 0.1);
  });
}, [], SCENE_START + 2.25);

// ── 5. Exit fade ──
master.to(__csScope + '.cs-root',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
