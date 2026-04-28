/*
 * AskTheAudience — animation contract
 *
 * Two viz modes: bars (horizontal bar chart) and donut (SVG ring chart).
 * Results read from data-island, DOM built once before tweens.
 * Winner logic: highest pct → tiebreak by count → no winner if still tied.
 *
 * Globals: master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION
 */
(function () {
  var S = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(S + '.ata-root');
  if (!root) return;

  // ── Helpers ───────────────────────────────────────────────────────────

  function isPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function safeJsonArray(idPrefix) {
    var el = document.getElementById(idPrefix + '-' + SCENE_ID);
    if (!el) return [];
    var raw = (el.textContent || '').trim();
    if (!raw || raw === 'undefined' || raw === 'null') return [];
    try { var p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
    catch (_) { return []; }
  }

  // ── Default palette ───────────────────────────────────────────────────

  var PALETTE = [
    '#3b82f6', '#14b8a6', '#f97316', '#a855f7',
    '#ec4899', '#eab308', '#38bdf8', '#22c55e'
  ];

  // ── Read & normalise results ──────────────────────────────────────────

  var rawResults = safeJsonArray('ata-results');
  var results = [];
  for (var i = 0; i < rawResults.length; i++) {
    var r = rawResults[i];
    if (!r || typeof r !== 'object') continue;
    results.push({
      label: (r.label && typeof r.label === 'string') ? r.label : '?',
      pct:   num(r.pct, 0),
      count: num(r.count, 0),
      accent: (r.accent && typeof r.accent === 'string') ? r.accent : PALETTE[results.length % PALETTE.length]
    });
  }

  // ── Props from data attributes ────────────────────────────────────────

  var viz = (root.getAttribute('data-viz') || 'bars').toLowerCase();
  if (isPlaceholder(viz) || (viz !== 'bars' && viz !== 'donut')) viz = 'bars';

  var pollState = (root.getAttribute('data-poll-state') || '').toLowerCase();
  if (isPlaceholder(pollState)) pollState = '';

  var source = root.getAttribute('data-source') || '';
  if (isPlaceholder(source)) source = '';

  var responseCount = num(root.getAttribute('data-response-count'), 0);

  // ── Winner logic ──────────────────────────────────────────────────────

  var winnerIdx = -1;
  if (results.length > 0) {
    var maxPct = -1;
    for (var i = 0; i < results.length; i++) {
      if (results[i].pct > maxPct) maxPct = results[i].pct;
    }
    var maxGroup = [];
    for (var i = 0; i < results.length; i++) {
      if (results[i].pct === maxPct) maxGroup.push(i);
    }
    if (maxGroup.length === 1) {
      winnerIdx = maxGroup[0];
    } else {
      // Tiebreak by count
      var maxCount = -1;
      for (var j = 0; j < maxGroup.length; j++) {
        if (results[maxGroup[j]].count > maxCount) maxCount = results[maxGroup[j]].count;
      }
      var countGroup = [];
      for (var j = 0; j < maxGroup.length; j++) {
        if (results[maxGroup[j]].count === maxCount) countGroup.push(maxGroup[j]);
      }
      if (countGroup.length === 1) {
        winnerIdx = countGroup[0];
      }
      // else: still tied → no winner
    }
  }

  // ── Proportional normalisation (geometry only) ────────────────────────

  var pctTotal = 0;
  for (var i = 0; i < results.length; i++) pctTotal += results[i].pct;
  var displayPct = [];
  for (var i = 0; i < results.length; i++) {
    displayPct.push(pctTotal > 0 ? (results[i].pct / pctTotal) * 100 : 0);
  }

  // ── Container refs ────────────────────────────────────────────────────

  var body      = root.querySelector('.ata-body');
  var badges    = root.querySelector('.ata-badges');
  var footer    = root.querySelector('.ata-footer');
  var emptyDiv  = root.querySelector('.ata-empty');
  var countSpan = root.querySelector('.ata-response-count');
  var ctaSpan   = root.querySelector('.ata-cta');

  // ── Empty state ───────────────────────────────────────────────────────

  if (results.length === 0) {
    if (body) body.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (badges) badges.style.display = 'none';
    if (emptyDiv) {
      master.fromTo(S + '.ata-empty',
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' },
        SCENE_START + 0.3);
      master.to(S + '.ata-empty',
        { opacity: 0, duration: 0.4, ease: 'power2.in' },
        SCENE_START + SCENE_DURATION - 0.4);
    }
    return;
  }

  if (emptyDiv) emptyDiv.style.display = 'none';

  // ── Build badges ──────────────────────────────────────────────────────

  if (badges) {
    if (pollState === 'live') {
      var b = document.createElement('span');
      b.className = 'ata-badge ata-badge-live';
      var d = document.createElement('span');
      d.className = 'ata-badge-dot';
      d.style.background = '#22c55e';
      b.appendChild(d);
      b.appendChild(document.createTextNode('LIVE'));
      badges.appendChild(b);
    } else if (pollState === 'closed') {
      var b = document.createElement('span');
      b.className = 'ata-badge ata-badge-closed';
      var d = document.createElement('span');
      d.className = 'ata-badge-dot';
      d.style.background = '#ef4444';
      b.appendChild(d);
      b.appendChild(document.createTextNode('POLL CLOSED'));
      badges.appendChild(b);
    }
    if (source) {
      var sb = document.createElement('span');
      sb.className = 'ata-badge ata-badge-source';
      sb.textContent = source;
      badges.appendChild(sb);
    }
  }

  // ── Build bars OR donut ───────────────────────────────────────────────

  var barFills = [];     // for animating bar widths
  var pctNodes = [];     // for count-up text updates
  var legendItems = [];  // for donut legend fade-in
  var donutSegs = [];    // for donut arc animation
  var donutWinner = null;

  if (viz === 'bars') {
    var barsWrap = document.createElement('div');
    barsWrap.className = 'ata-bars';
    for (var i = 0; i < results.length; i++) {
      var row = document.createElement('div');
      row.className = 'ata-bar-row' + (i === winnerIdx ? ' ata-bar-winner' : '');

      var lbl = document.createElement('span');
      lbl.className = 'ata-bar-label';
      lbl.textContent = results[i].label;

      var track = document.createElement('div');
      track.className = 'ata-bar-track';

      var fill = document.createElement('div');
      fill.className = 'ata-bar-fill';
      fill.style.background = results[i].accent;
      fill.style.width = '0%';

      var pctSpan = document.createElement('span');
      pctSpan.className = 'ata-bar-pct';
      pctSpan.textContent = results[i].pct + '%';
      pctSpan.style.opacity = '0';

      fill.appendChild(pctSpan);
      track.appendChild(fill);
      row.appendChild(lbl);
      row.appendChild(track);
      barsWrap.appendChild(row);

      barFills.push({ el: fill, pctEl: pctSpan, displayPct: displayPct[i] });
    }
    body.appendChild(barsWrap);

  } else {
    // ── DONUT MODE ──────────────────────────────────────────────────────

    var donutWrap = document.createElement('div');
    donutWrap.className = 'ata-donut-wrap';

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 600');
    svg.setAttribute('class', 'ata-donut-svg');
    svg.setAttribute('width', '420');
    svg.setAttribute('height', '420');

    var r = 160, sw = 48;
    var circ = 2 * Math.PI * r;
    var cumOffset = 0;

    // Background ring
    var bgRing = document.createElementNS(svgNS, 'circle');
    bgRing.setAttribute('cx', '300');
    bgRing.setAttribute('cy', '300');
    bgRing.setAttribute('r', String(r));
    bgRing.setAttribute('fill', 'none');
    bgRing.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    bgRing.setAttribute('stroke-width', String(sw));
    svg.appendChild(bgRing);

    for (var i = 0; i < results.length; i++) {
      var segLen = (displayPct[i] / 100) * circ;
      var seg = document.createElementNS(svgNS, 'circle');
      seg.setAttribute('cx', '300');
      seg.setAttribute('cy', '300');
      seg.setAttribute('r', String(r));
      seg.setAttribute('fill', 'none');
      seg.setAttribute('stroke', results[i].accent);
      seg.setAttribute('stroke-width', String(sw));
      seg.setAttribute('stroke-linecap', 'butt');
      // Final visible state in attributes
      seg.setAttribute('stroke-dasharray', segLen + ' ' + circ);
      seg.setAttribute('stroke-dashoffset', String(-cumOffset));
      // Rotate so arcs start from 12 o'clock
      seg.setAttribute('transform', 'rotate(-90 300 300)');
      svg.appendChild(seg);
      donutSegs.push({
        el: seg,
        segLen: segLen,
        finalOffset: -cumOffset,
        hiddenOffset: -cumOffset + segLen,
        idx: i
      });
      cumOffset += segLen;
    }

    // Winner ring (pulsing outer ring on winning segment)
    if (winnerIdx >= 0) {
      var winR = r + sw / 2 + 6;
      var winCirc = 2 * Math.PI * winR;
      // Recalculate segment positions for the larger ring
      var winCum = 0;
      for (var k = 0; k < winnerIdx; k++) {
        winCum += (displayPct[k] / 100) * winCirc;
      }
      var winSegLen = (displayPct[winnerIdx] / 100) * winCirc;

      var ring = document.createElementNS(svgNS, 'circle');
      ring.setAttribute('cx', '300');
      ring.setAttribute('cy', '300');
      ring.setAttribute('r', String(winR));
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', results[winnerIdx].accent);
      ring.setAttribute('stroke-width', '4');
      ring.setAttribute('stroke-linecap', 'butt');
      ring.setAttribute('stroke-dasharray', winSegLen + ' ' + winCirc);
      ring.setAttribute('stroke-dashoffset', String(-winCum));
      ring.setAttribute('transform', 'rotate(-90 300 300)');
      ring.setAttribute('opacity', '0');
      svg.appendChild(ring);
      donutWinner = ring;
    }

    donutWrap.appendChild(svg);

    // Center text
    var center = document.createElement('div');
    center.className = 'ata-donut-center';
    var cntNum = document.createElement('div');
    cntNum.className = 'ata-donut-count';
    cntNum.textContent = String(responseCount);
    var cntLbl = document.createElement('div');
    cntLbl.className = 'ata-donut-label';
    cntLbl.textContent = 'responses';
    center.appendChild(cntNum);
    center.appendChild(cntLbl);
    donutWrap.appendChild(center);

    // Legend
    var legend = document.createElement('div');
    legend.className = 'ata-legend';
    for (var i = 0; i < results.length; i++) {
      var item = document.createElement('div');
      item.className = 'ata-legend-item';
      var swatch = document.createElement('span');
      swatch.className = 'ata-legend-swatch';
      swatch.style.background = results[i].accent;
      var txt = document.createElement('span');
      txt.textContent = results[i].label + ' ' + results[i].pct + '%';
      item.appendChild(swatch);
      item.appendChild(txt);
      legend.appendChild(item);
      legendItems.push(item);
    }

    var donutCol = document.createElement('div');
    donutCol.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:100%';
    donutCol.appendChild(donutWrap);
    donutCol.appendChild(legend);
    body.appendChild(donutCol);
  }

  // ── Response count text ───────────────────────────────────────────────

  if (countSpan) {
    countSpan.textContent = responseCount > 0
      ? responseCount + ' responses'
      : '';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ANIMATION TIMELINE
  // ═══════════════════════════════════════════════════════════════════════

  var t0 = SCENE_START;

  // 1) Question slide 0–0.6s
  master.fromTo(S + '.ata-question',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
    t0);

  // 2) Badges 0.6–1.0s
  if (badges && badges.children.length > 0) {
    master.fromTo(S + '.ata-badges',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      t0 + 0.6);

    // Live dot pulse
    var liveDot = root.querySelector('.ata-badge-live .ata-badge-dot');
    if (liveDot) {
      master.to(liveDot,
        { opacity: 0.3, duration: 0.5, ease: 'sine.inOut', repeat: -1, yoyo: true },
        t0 + 1.0);
    }
  }

  // 3) Bars grow / Donut sweep 1.0–2.0s
  if (viz === 'bars') {
    for (var i = 0; i < barFills.length; i++) {
      (function (bf, idx) {
        master.to(bf.el,
          { width: Math.max(bf.displayPct, 0) + '%', duration: 1.0, ease: 'power2.out' },
          t0 + 1.0 + idx * 0.08);
      })(barFills[i], i);
    }
  } else {
    // Donut: sweep from hidden → visible
    for (var i = 0; i < donutSegs.length; i++) {
      var ds = donutSegs[i];
      // Override to hidden state
      ds.el.style.strokeDashoffset = String(ds.hiddenOffset);
      master.to(ds.el,
        { strokeDashoffset: ds.finalOffset, duration: 1.0, ease: 'power2.out' },
        t0 + 1.0 + i * 0.06);
    }
  }

  // 4) Pct labels fade-in (bars only) — text set at build time
  if (viz === 'bars') {
    for (var i = 0; i < barFills.length; i++) {
      master.fromTo(barFills[i].pctEl,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' },
        t0 + 2.0 + i * 0.08);
    }
  }

  // 5) ResponseCount reveal (donut center) 2.2–2.6s — text set at build time
  if (viz === 'donut' && responseCount > 0) {
    var centerEl = root.querySelector('.ata-donut-center');
    if (centerEl) {
      master.fromTo(S + '.ata-donut-center',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' },
        t0 + 2.2);
    }
  }

  // 6) Winner glow / ring 3.5–4.5s
  if (winnerIdx >= 0) {
    if (viz === 'bars') {
      var winFill = barFills[winnerIdx];
      if (winFill) {
        master.fromTo(winFill.el,
          { boxShadow: '0 0 0px rgba(255,255,255,0)' },
          { boxShadow: '0 0 24px rgba(255,255,255,0.35)', duration: 0.5, ease: 'power2.out' },
          t0 + 3.5);
      }
    } else if (donutWinner) {
      master.to(donutWinner,
        { opacity: 1, duration: 0.5, ease: 'power2.out' },
        t0 + 3.5);
      master.to(donutWinner,
        { opacity: 0.4, duration: 0.6, ease: 'sine.inOut', repeat: -1, yoyo: true },
        t0 + 4.0);
    }
  }

  // 7) Legend items stagger (donut only) 3.0–4.0s
  if (viz === 'donut' && legendItems.length > 0) {
    for (var i = 0; i < legendItems.length; i++) {
      master.fromTo(legendItems[i],
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        t0 + 3.0 + i * 0.1);
    }
  }

  // 8) Footer: response count + cta 4.5–5.5s
  if (countSpan && responseCount > 0) {
    master.fromTo(S + '.ata-response-count',
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: 'power2.out' },
      t0 + 4.5);
  }
  if (ctaSpan && ctaSpan.textContent.trim() && !isPlaceholder(ctaSpan.textContent.trim())) {
    master.fromTo(S + '.ata-cta',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      t0 + 5.0);
  }

  // 9) Exit fade (≥0.3s margin per CONTRACT §7)
  master.to(S + '.ata-root',
    { opacity: 0, duration: 0.4, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.4);

})();
