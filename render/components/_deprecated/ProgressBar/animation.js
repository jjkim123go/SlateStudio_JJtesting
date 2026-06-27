/*
 * ProgressBar — Multi-section progress indicator (topbar | sidebar | segmented).
 *
 * Fill precedence (rubber-duck rule):
 *   1. If completionPct is provided (number 0-100), use that directly.
 *   2. Otherwise derive: cumulative weight up to (including half of)
 *      currentSectionId ÷ total weight.
 *   3. Unknown currentSectionId → degrade to first section, no error.
 *   4. Invalid weight (≤0 or non-number) → treated as 1.
 *
 * DOM-SAFETY: All segment rects/paths, labels, milestones, and the fill bar
 * are built ONCE inside a master.call() block. Subsequent animations only
 * mutate width, height, opacity, transform, fill — never rebuild DOM.
 *
 * ID CONTRACT: All SVG ids suffix SCENE_ID. Section/milestone IDs are strings
 * — never coerced via Number(). String-keyed lookups via plain objects.
 *
 * Globals: master, SCENE_ID, SCENE_START, SCENE_DURATION, gsap, document
 */
(function () {
  var S = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(S + '.pg-root');
  if (!root) return;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // ── Helpers ─────────────────────────────────────────────────────────────

  function parseIsland(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var raw = el.textContent.trim();
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try { return JSON.parse(raw); } catch (_e) { return null; }
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        el.setAttribute(keys[i], String(attrs[keys[i]]));
      }
    }
    return el;
  }

  function isPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }

  function safeWeight(w) {
    return (typeof w === 'number' && isFinite(w) && w > 0) ? w : 1;
  }

  // ── Parse data ──────────────────────────────────────────────────────────

  var sections = parseIsland('pg-sections-' + SCENE_ID);
  var milestones = parseIsland('pg-milestones-' + SCENE_ID);
  if (!Array.isArray(sections) || sections.length === 0) return;
  if (!Array.isArray(milestones)) milestones = [];

  var currentIdAttr = root.getAttribute('data-current-section-id') || '';
  var currentSectionId = isPlaceholder(currentIdAttr) ? '' : currentIdAttr;

  var pctAttr = root.getAttribute('data-completion-pct') || '';
  var completionPctRaw = isPlaceholder(pctAttr) ? NaN : parseFloat(pctAttr);

  var styleAttr = (root.getAttribute('data-style') || '').toLowerCase();
  if (isPlaceholder(styleAttr)) styleAttr = '';
  var style = (styleAttr === 'sidebar' || styleAttr === 'segmented') ? styleAttr : 'topbar';
  root.setAttribute('data-style', style);

  var showNumAttr = root.getAttribute('data-show-numbers') || '';
  var showNumbers = (!isPlaceholder(showNumAttr) && showNumAttr === 'true');

  // ── Normalize weights + build section map ───────────────────────────────

  var sectionList = [];
  var sectionMap = {};
  var totalWeight = 0;
  for (var si = 0; si < sections.length; si++) {
    var sec = sections[si];
    if (!sec || typeof sec !== 'object') continue;
    var sId = (typeof sec.id !== 'undefined' && sec.id !== null) ? String(sec.id) : '';
    var w = safeWeight(sec.weight);
    var entry = {
      id: sId,
      label: (typeof sec.label === 'string') ? sec.label : String(sec.label || ''),
      shortLabel: (typeof sec.shortLabel === 'string') ? sec.shortLabel : '',
      weight: w,
      idx: sectionList.length
    };
    totalWeight += w;
    sectionList.push(entry);
    sectionMap[sId] = entry;
  }

  if (sectionList.length === 0) return;
  if (totalWeight <= 0) totalWeight = sectionList.length;

  // ── Resolve current section ─────────────────────────────────────────────

  var currentIdx = -1;
  if (currentSectionId !== '' && sectionMap.hasOwnProperty(currentSectionId)) {
    currentIdx = sectionMap[currentSectionId].idx;
  }
  if (currentIdx < 0) currentIdx = 0; // degrade to first section

  // ── Compute fill percentage ─────────────────────────────────────────────

  var fillPct;
  if (isFinite(completionPctRaw)) {
    fillPct = Math.max(0, Math.min(100, completionPctRaw));
  } else {
    var cumWeight = 0;
    for (var fi = 0; fi < currentIdx; fi++) {
      cumWeight += sectionList[fi].weight;
    }
    cumWeight += sectionList[currentIdx].weight / 2;
    fillPct = (cumWeight / totalWeight) * 100;
  }

  // ── Milestone section-position lookup ───────────────────────────────────

  var milestoneEntries = [];
  for (var mi = 0; mi < milestones.length; mi++) {
    var ms = milestones[mi];
    if (!ms || typeof ms !== 'object') continue;
    var msId = (typeof ms.sectionId !== 'undefined' && ms.sectionId !== null)
      ? String(ms.sectionId) : '';
    if (msId !== '' && sectionMap.hasOwnProperty(msId)) {
      milestoneEntries.push({
        sectionIdx: sectionMap[msId].idx,
        label: (typeof ms.label === 'string') ? ms.label : ''
      });
    }
  }

  var svg = root.querySelector('.pg-svg');
  if (!svg) return;

  var endTime = SCENE_START + SCENE_DURATION;

  // ── 1. Skeleton fade-in (0.0–0.5s) ─────────────────────────────────────

  master.fromTo(S + '.pg-svg',
    { opacity: 0 },
    { opacity: 1, duration: 0.5, ease: 'power2.out' },
    SCENE_START + 0.0);

  // ── 2. Build SVG + schedule animations (ONE master.call) ────────────────

  master.call(function () {
    var n = sectionList.length;

    // ── Style-specific geometry ────────────────────────────────────────────

    if (style === 'sidebar') {
      svg.setAttribute('viewBox', '0 0 260 800');
      buildSidebar(n);
    } else if (style === 'segmented') {
      svg.setAttribute('viewBox', '0 0 1000 180');
      buildSegmented(n);
    } else {
      svg.setAttribute('viewBox', '0 0 1000 56');
      buildTopbar(n);
    }

    // ── TOPBAR ──────────────────────────────────────────────────────────────

    function buildTopbar(count) {
      var trackY = 16;
      var trackH = 24;
      var trackX = 0;
      var trackW = 1000;
      var cumW = 0;

      // Track background
      var bg = svgEl('rect', {
        x: trackX, y: trackY, width: trackW, height: trackH, rx: 6,
        fill: 'rgba(148,163,184,0.1)',
        id: 'pg-track-bg-' + SCENE_ID
      });
      svg.appendChild(bg);

      // Segment rects + tick marks
      for (var i = 0; i < count; i++) {
        var wFrac = sectionList[i].weight / totalWeight;
        var sx = trackX + (cumW / totalWeight) * trackW;
        var sw = wFrac * trackW;

        var cls = i < currentIdx ? 'pg-seg-complete'
          : i === currentIdx ? 'pg-seg-current'
          : 'pg-seg-incomplete';

        var segRect = svgEl('rect', {
          x: sx, y: trackY, width: sw, height: trackH,
          'class': 'pg-seg-rect ' + cls,
          rx: (i === 0) ? '6 0 0 6' : (i === count - 1) ? '0 6 6 0' : '0',
          opacity: 0,
          id: 'pg-seg-' + i + '-' + SCENE_ID
        });
        // Rounded corners via rx on first/last only
        if (i === 0) segRect.setAttribute('rx', '6');
        else if (i === count - 1) segRect.setAttribute('rx', '6');
        else segRect.setAttribute('rx', '0');
        svg.appendChild(segRect);

        // Tick mark between segments
        if (i > 0) {
          var tick = svgEl('line', {
            x1: sx, y1: trackY, x2: sx, y2: trackY + trackH,
            'class': 'pg-tick-line'
          });
          svg.appendChild(tick);
        }

        // Label below track
        var lbl = svgEl('text', {
          x: sx + sw / 2, y: trackY + trackH + 16,
          'text-anchor': 'middle',
          'class': 'pg-label-text' + (i === currentIdx ? ' pg-label-current' : '')
        });
        lbl.textContent = sectionList[i].shortLabel || sectionList[i].label;
        svg.appendChild(lbl);

        cumW += sectionList[i].weight;

        // Segment paint animation (0.5–1.5s, 0.1s stagger)
        master.fromTo(segRect,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: 'power2.out' },
          SCENE_START + 0.5 + i * 0.1);
      }

      // Fill bar
      var fillBar = svgEl('rect', {
        x: trackX, y: trackY + 1, width: 0, height: trackH - 2, rx: 5,
        fill: 'url(#pg-fill-grad-' + SCENE_ID + ')',
        'class': 'pg-fill-bar',
        id: 'pg-fill-' + SCENE_ID
      });
      svg.appendChild(fillBar);

      // Fill animation (1.5–2.5s)
      var targetW = (fillPct / 100) * trackW;
      master.to(fillBar,
        { attr: { width: targetW }, duration: 1.0, ease: 'power2.inOut' },
        SCENE_START + 1.5);

      // Current segment brighten + pulse (2.5–3.5s)
      var curSeg = svg.querySelector('#pg-seg-' + currentIdx + '-' + SCENE_ID);
      if (curSeg) {
        master.to(curSeg,
          { opacity: 1, fill: 'rgba(59,130,246,0.6)', duration: 0.5, ease: 'power2.out' },
          SCENE_START + 2.5);
        // Pulse ring around current segment
        var cFrac = 0;
        for (var pi = 0; pi < currentIdx; pi++) cFrac += sectionList[pi].weight;
        var pulseX = trackX + (cFrac / totalWeight) * trackW;
        var pulseW = (sectionList[currentIdx].weight / totalWeight) * trackW;
        var pulse = svgEl('rect', {
          x: pulseX - 2, y: trackY - 2, width: pulseW + 4, height: trackH + 4,
          rx: 8, 'class': 'pg-pulse-ring',
          id: 'pg-pulse-' + SCENE_ID
        });
        svg.appendChild(pulse);
        master.fromTo(pulse,
          { opacity: 0.8, attr: { x: pulseX - 2, y: trackY - 2, width: pulseW + 4, height: trackH + 4 } },
          { opacity: 0, attr: { x: pulseX - 6, y: trackY - 6, width: pulseW + 12, height: trackH + 12 },
            duration: 0.8, ease: 'power2.out' },
          SCENE_START + 2.8);
      }

      // Milestones (3.5+)
      buildMilestones(trackX, trackW, trackY - 8, 'h');
    }

    // ── SIDEBAR ─────────────────────────────────────────────────────────────

    function buildSidebar(count) {
      var barX = 0;
      var barW = 48;
      var barY = 0;
      var barH = 800;
      var labelX = 64;
      var cumW = 0;

      // Track background
      svg.appendChild(svgEl('rect', {
        x: barX, y: barY, width: barW, height: barH, rx: 8,
        fill: 'rgba(148,163,184,0.1)',
        id: 'pg-track-bg-' + SCENE_ID
      }));

      for (var i = 0; i < count; i++) {
        var wFrac = sectionList[i].weight / totalWeight;
        var sy = barY + (cumW / totalWeight) * barH;
        var sh = wFrac * barH;

        var cls = i < currentIdx ? 'pg-seg-complete'
          : i === currentIdx ? 'pg-seg-current'
          : 'pg-seg-incomplete';

        var segRect = svgEl('rect', {
          x: barX, y: sy, width: barW, height: sh,
          'class': 'pg-seg-rect ' + cls,
          rx: (i === 0 || i === count - 1) ? 8 : 0,
          opacity: 0,
          id: 'pg-seg-' + i + '-' + SCENE_ID
        });
        svg.appendChild(segRect);

        // Tick
        if (i > 0) {
          svg.appendChild(svgEl('line', {
            x1: barX, y1: sy, x2: barX + barW, y2: sy,
            'class': 'pg-tick-line'
          }));
        }

        // Label
        var lbl = svgEl('text', {
          x: labelX, y: sy + sh / 2 + 5,
          'class': 'pg-label-text pg-sidebar-label' + (i === currentIdx ? ' pg-label-current' : '')
        });
        lbl.textContent = sectionList[i].label;
        svg.appendChild(lbl);

        // Number
        if (showNumbers) {
          var numEl = svgEl('text', {
            x: barX + barW / 2, y: sy + sh / 2 + 10,
            'text-anchor': 'middle',
            'class': 'pg-number-text'
          });
          numEl.textContent = String(i + 1);
          svg.appendChild(numEl);
        }

        cumW += sectionList[i].weight;

        master.fromTo(segRect,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: 'power2.out' },
          SCENE_START + 0.5 + i * 0.1);
      }

      // Fill bar (vertical)
      var fillBar = svgEl('rect', {
        x: barX + 2, y: barY, width: barW - 4, height: 0, rx: 6,
        fill: 'url(#pg-fill-grad-v-' + SCENE_ID + ')',
        'class': 'pg-fill-bar',
        id: 'pg-fill-' + SCENE_ID
      });
      svg.appendChild(fillBar);

      var targetH = (fillPct / 100) * barH;
      master.to(fillBar,
        { attr: { height: targetH }, duration: 1.0, ease: 'power2.inOut' },
        SCENE_START + 1.5);

      // Current brighten
      var curSeg = svg.querySelector('#pg-seg-' + currentIdx + '-' + SCENE_ID);
      if (curSeg) {
        master.to(curSeg,
          { opacity: 1, fill: 'rgba(59,130,246,0.6)', duration: 0.5, ease: 'power2.out' },
          SCENE_START + 2.5);
      }

      buildMilestones(barY, barH, barX + barW + 4, 'v');
    }

    // ── SEGMENTED (chevrons) ────────────────────────────────────────────────

    function buildSegmented(count) {
      var chevW = 30;
      var padX = 20;
      var totalAvail = 1000 - padX * 2;
      var segH = 120;
      var segY = 30;
      var cumW = 0;

      for (var i = 0; i < count; i++) {
        var wFrac = sectionList[i].weight / totalWeight;
        var sx = padX + (cumW / totalWeight) * totalAvail;
        var sw = wFrac * totalAvail;

        var cls = i < currentIdx ? 'pg-seg-complete'
          : i === currentIdx ? 'pg-seg-current'
          : 'pg-seg-incomplete';

        // Chevron polygon: flat left on first, pointed left on rest
        var lx = sx;
        var rx = sx + sw;
        var points;
        if (i === 0) {
          points = lx + ',' + segY + ' ' +
            (rx - chevW) + ',' + segY + ' ' +
            rx + ',' + (segY + segH / 2) + ' ' +
            (rx - chevW) + ',' + (segY + segH) + ' ' +
            lx + ',' + (segY + segH);
        } else if (i === count - 1) {
          points = lx + ',' + segY + ' ' +
            rx + ',' + segY + ' ' +
            rx + ',' + (segY + segH) + ' ' +
            lx + ',' + (segY + segH) + ' ' +
            (lx + chevW) + ',' + (segY + segH / 2);
        } else {
          points = lx + ',' + segY + ' ' +
            (rx - chevW) + ',' + segY + ' ' +
            rx + ',' + (segY + segH) + ' ' +
            (rx - chevW) + ',' + (segY + segH) + ' ' +
            lx + ',' + (segY + segH) + ' ' +
            (lx + chevW) + ',' + (segY + segH / 2);
        }

        // Fix: standard chevron with arrow both sides (except first/last)
        if (i === 0) {
          points = lx + ',' + segY + ' ' +
            (rx - chevW) + ',' + segY + ' ' +
            rx + ',' + (segY + segH / 2) + ' ' +
            (rx - chevW) + ',' + (segY + segH) + ' ' +
            lx + ',' + (segY + segH);
        } else {
          points = (lx) + ',' + segY + ' ' +
            (rx - (i < count - 1 ? chevW : 0)) + ',' + segY + ' ' +
            rx + ',' + (segY + segH / 2) + ' ' +
            (rx - (i < count - 1 ? chevW : 0)) + ',' + (segY + segH) + ' ' +
            lx + ',' + (segY + segH) + ' ' +
            (lx + chevW) + ',' + (segY + segH / 2);
        }

        var chev = svgEl('polygon', {
          points: points,
          'class': cls + ' pg-chevron',
          opacity: 0,
          id: 'pg-seg-' + i + '-' + SCENE_ID
        });
        svg.appendChild(chev);

        // Label inside chevron
        var cx = sx + sw / 2;
        var cy = segY + segH / 2;
        if (showNumbers) {
          var numEl = svgEl('text', {
            x: cx, y: cy - 8, 'text-anchor': 'middle',
            'dominant-baseline': 'central',
            'class': 'pg-number-text' + (i === currentIdx ? ' pg-label-current' : '')
          });
          numEl.textContent = String(i + 1);
          svg.appendChild(numEl);
        }

        var lbl = svgEl('text', {
          x: cx, y: cy + (showNumbers ? 18 : 5),
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          'class': 'pg-label-text' + (i === currentIdx ? ' pg-label-current' : '')
        });
        lbl.textContent = sectionList[i].shortLabel || sectionList[i].label;
        svg.appendChild(lbl);

        cumW += sectionList[i].weight;

        master.fromTo(chev,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: 'power2.out' },
          SCENE_START + 0.5 + i * 0.1);
      }

      // No continuous fill bar for segmented — segments themselves show state.
      // Current segment brighten + pulse (2.5–3.5s)
      var curSeg = svg.querySelector('#pg-seg-' + currentIdx + '-' + SCENE_ID);
      if (curSeg) {
        master.to(curSeg,
          { fill: 'rgba(59,130,246,0.7)', duration: 0.5, ease: 'power2.out' },
          SCENE_START + 2.5);
        master.fromTo(curSeg,
          { attr: { 'stroke-width': 2 } },
          { attr: { 'stroke-width': 4 }, duration: 0.4, ease: 'power1.inOut', yoyo: true, repeat: 1 },
          SCENE_START + 2.8);
      }

      // Milestones for segmented (below chevrons)
      buildMilestonesSegmented(padX, totalAvail, segY + segH + 12);
    }

    // ── Milestones builder (horizontal / vertical) ──────────────────────────

    function buildMilestones(trackOrigin, trackLen, milestonePos, orient) {
      for (var mi = 0; mi < milestoneEntries.length; mi++) {
        var ms = milestoneEntries[mi];
        // Position: midpoint of the milestone's sectionId segment
        var cumBefore = 0;
        for (var bi = 0; bi < ms.sectionIdx; bi++) cumBefore += sectionList[bi].weight;
        var midFrac = (cumBefore + sectionList[ms.sectionIdx].weight / 2) / totalWeight;
        var pos = trackOrigin + midFrac * trackLen;

        var g = svgEl('g', { 'class': 'pg-milestone-group', id: 'pg-ms-' + mi + '-' + SCENE_ID });

        if (orient === 'h') {
          // Diamond marker above track
          g.appendChild(svgEl('polygon', {
            points: (pos) + ',' + (milestonePos - 8) + ' ' +
                    (pos + 6) + ',' + milestonePos + ' ' +
                    (pos) + ',' + (milestonePos + 8) + ' ' +
                    (pos - 6) + ',' + milestonePos,
            'class': 'pg-milestone-diamond'
          }));
          if (ms.label) {
            var t = svgEl('text', {
              x: pos, y: milestonePos - 14,
              'text-anchor': 'middle',
              'class': 'pg-milestone-text'
            });
            t.textContent = ms.label;
            g.appendChild(t);
          }
        } else {
          // Diamond marker to the right of bar
          g.appendChild(svgEl('polygon', {
            points: (milestonePos) + ',' + (pos - 6) + ' ' +
                    (milestonePos + 8) + ',' + pos + ' ' +
                    (milestonePos) + ',' + (pos + 6) + ' ' +
                    (milestonePos - 8) + ',' + pos,
            'class': 'pg-milestone-diamond'
          }));
          if (ms.label) {
            var t2 = svgEl('text', {
              x: milestonePos + 14, y: pos + 4,
              'class': 'pg-milestone-text'
            });
            t2.textContent = ms.label;
            g.appendChild(t2);
          }
        }

        svg.appendChild(g);

        // Bounce-in at 3.5+ (0.15s stagger between milestones)
        master.fromTo(g,
          { opacity: 0, scale: 0, transformOrigin: '50% 50%' },
          { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.5)' },
          SCENE_START + 3.5 + mi * 0.15);
      }
    }

    function buildMilestonesSegmented(padX, totalAvail, yPos) {
      for (var mi = 0; mi < milestoneEntries.length; mi++) {
        var ms = milestoneEntries[mi];
        var cumBefore = 0;
        for (var bi = 0; bi < ms.sectionIdx; bi++) cumBefore += sectionList[bi].weight;
        var midFrac = (cumBefore + sectionList[ms.sectionIdx].weight / 2) / totalWeight;
        var xPos = padX + midFrac * totalAvail;

        var g = svgEl('g', { 'class': 'pg-milestone-group', id: 'pg-ms-' + mi + '-' + SCENE_ID });
        g.appendChild(svgEl('polygon', {
          points: xPos + ',' + yPos + ' ' +
                  (xPos + 6) + ',' + (yPos + 8) + ' ' +
                  xPos + ',' + (yPos + 16) + ' ' +
                  (xPos - 6) + ',' + (yPos + 8),
          'class': 'pg-milestone-diamond'
        }));
        if (ms.label) {
          var t = svgEl('text', {
            x: xPos, y: yPos + 28,
            'text-anchor': 'middle',
            'class': 'pg-milestone-text'
          });
          t.textContent = ms.label;
          g.appendChild(t);
        }
        svg.appendChild(g);

        master.fromTo(g,
          { opacity: 0, scale: 0, transformOrigin: '50% 50%' },
          { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.5)' },
          SCENE_START + 3.5 + mi * 0.15);
      }
    }

  }, null, SCENE_START);

  // ── Exit fade (CONTRACT §7 ≥ 0.3s margin) ──────────────────────────────

  master.to(S + '.pg-root',
    { opacity: 0, duration: 0.4, ease: 'power2.in' },
    endTime - 0.4);
})();
