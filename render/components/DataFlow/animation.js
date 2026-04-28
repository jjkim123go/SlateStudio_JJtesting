// DataFlow — Premium glassmorphic pipeline visualization
// Glassmorphic node cards, neon-glow connections, energy pulse orbs,
// rich typography with Inter. All tweens on the shared `master` timeline.
//
// Selector hygiene: '.scene-' + SCENE_ID per CONTRACT §4.3.
// Transform-only animation (x, y, scale, rotation, autoAlpha) — no layout props.

(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var XHTML_NS = 'http://www.w3.org/1999/xhtml';
  var VIEW_W = 1800, VIEW_H = 760;
  var S = '.scene-' + SCENE_ID;

  // ---- Build DOM synchronously (IIFE body, not master.call) ----------------
  (function buildDOM() {
    var root = document.querySelector(S + ' .df-root');
    if (!root) return;

    function safeParse(raw, fallback) {
      if (raw === null || raw === undefined || raw === '') return fallback;
      if (typeof raw !== 'string') return raw;
      if (raw.indexOf('{{') !== -1) return fallback;
      try { return JSON.parse(raw); } catch (_e) { return fallback; }
    }

    var stages = safeParse(root.getAttribute('data-df-stages'), []);
    var edges = safeParse(root.getAttribute('data-df-edges'), []);
    var legend = safeParse(root.getAttribute('data-df-legend'), null);
    var callouts = safeParse(root.getAttribute('data-df-callouts'), []);
    var mode = (root.getAttribute('data-df-mode') || 'linear').toLowerCase();
    if (mode !== 'mesh') mode = 'linear';

    var svg = root.querySelector('.df-svg');
    var stagesLayer = root.querySelector('.df-stages-layer');
    var edgesLayer = root.querySelector('.df-edges-layer');
    var bannersLayer = root.querySelector('.df-banners-layer');
    var packetsLayer = root.querySelector('.df-packets-layer');
    var locksLayer = root.querySelector('.df-locks-layer');
    var calloutsLayer = root.querySelector('.df-callouts-layer');
    var legendEl = root.querySelector('.df-legend');
    if (!svg || !stagesLayer || !edgesLayer) return;

    var STAGE_W = 220, STAGE_H = 130;

    // icon map for systemType
    function typeIcon(t) {
      switch ((t || '').toLowerCase()) {
        case 'client': return '💬';
        case 'service': return '⚙️';
        case 'storage': return '📦';
        case 'consumer': case 'warehouse': return '📊';
        case 'database': case 'db': return '🗄️';
        case 'api': case 'gateway': return '🔗';
        default: return '◆';
      }
    }

    // ---- layout ------------------------------------------------------------
    function layoutLinear(items) {
      var n = items.length;
      if (n === 0) return [];
      var totalW = n * STAGE_W;
      var gap = (VIEW_W - totalW) / (n + 1);
      gap = Math.max(50, gap);
      var startX = (VIEW_W - (n * STAGE_W + (n - 1) * gap)) / 2;
      var y = (VIEW_H - STAGE_H) / 2;
      return items.map(function (s, i) {
        return { id: s.id, raw: s, x: startX + i * (STAGE_W + gap), y: y };
      });
    }

    function layoutMesh(items) {
      var n = items.length;
      if (n === 0) return [];
      var cols = Math.min(n, Math.ceil(Math.sqrt(n * 1.6)));
      var rows = Math.ceil(n / cols);
      var gx = (VIEW_W - cols * STAGE_W) / (cols + 1);
      var gy = (VIEW_H - rows * STAGE_H) / (rows + 1);
      gx = Math.max(50, gx); gy = Math.max(50, gy);
      var totalRowH = rows * STAGE_H + (rows - 1) * gy;
      var startY = (VIEW_H - totalRowH) / 2;
      return items.map(function (s, i) {
        var c = i % cols, r = Math.floor(i / cols);
        return {
          id: s.id, raw: s,
          x: gx + c * (STAGE_W + gx),
          y: startY + r * (STAGE_H + gy)
        };
      });
    }

    var positioned = (mode === 'mesh') ? layoutMesh(stages) : layoutLinear(stages);
    var byId = {};
    positioned.forEach(function (p) { byId[p.id] = p; });

    // ---- SVG helpers -------------------------------------------------------
    function el(name, attrs, parent) {
      var e = document.createElementNS(SVG_NS, name);
      if (attrs) {
        for (var k in attrs) {
          if (Object.prototype.hasOwnProperty.call(attrs, k)) {
            e.setAttribute(k, attrs[k]);
          }
        }
      }
      if (parent) parent.appendChild(e);
      return e;
    }

    function classColor(cls) {
      switch ((cls || '').toLowerCase()) {
        case 'public': return '#94a3b8';
        case 'internal': return '#38bdf8';
        case 'confidential': return '#a78bfa';
        case 'restricted': return '#f472b6';
        case 'pii': return '#f43f5e';
        default: return '#64748b';
      }
    }

    // ---- stage nodes (glassmorphic cards via foreignObject) -----------------
    positioned.forEach(function (p) {
      var g = el('g', {
        'class': 'df-stage',
        'data-id': p.id,
        'transform': 'translate(' + p.x + ',' + p.y + ')'
      }, stagesLayer);

      // foreignObject for CSS glassmorphism (backdrop-filter works here)
      var fo = el('foreignObject', {
        'x': 0, 'y': 0, 'width': STAGE_W, 'height': STAGE_H
      }, g);

      var card = document.createElementNS(XHTML_NS, 'div');
      card.setAttribute('class', 'df-node-card');
      card.setAttribute('xmlns', XHTML_NS);
      fo.appendChild(card);

      var iconDiv = document.createElementNS(XHTML_NS, 'div');
      iconDiv.setAttribute('class', 'df-node-icon');
      iconDiv.textContent = typeIcon(p.raw.systemType);
      card.appendChild(iconDiv);

      var labelDiv = document.createElementNS(XHTML_NS, 'div');
      labelDiv.setAttribute('class', 'df-node-label');
      labelDiv.textContent = p.raw.label || p.id;
      card.appendChild(labelDiv);

      var subText = p.raw.description || p.raw.systemType || p.raw.region || '';
      if (subText) {
        var subDiv = document.createElementNS(XHTML_NS, 'div');
        subDiv.setAttribute('class', 'df-node-sub');
        subDiv.textContent = subText;
        card.appendChild(subDiv);
      }

      // classification banner
      if (p.raw.classification) {
        var bw = 130, bh = 22;
        var bg = el('g', {
          'class': 'df-class-banner',
          'data-id': p.id,
          'transform': 'translate(' + (p.x + STAGE_W / 2 - bw / 2) + ',' + (p.y - bh - 8) + ')'
        }, bannersLayer);
        el('rect', {
          'class': 'df-class-banner-rect',
          'x': 0, 'y': 0, 'width': bw, 'height': bh,
          'fill': classColor(p.raw.classification)
        }, bg);
        var bl = el('text', {
          'class': 'df-class-banner-label',
          'x': bw / 2, 'y': bh / 2 + 4, 'text-anchor': 'middle'
        }, bg);
        bl.textContent = String(p.raw.classification).toUpperCase();
      }
    });

    // ---- edges + glow lines + pills + pulse orbs --------------------------
    var edgePaths = [];
    var pulseOrbs = [];

    edges.forEach(function (e, idx) {
      var src = byId[e.from], dst = byId[e.to];
      if (!src || !dst) return;

      // connect from right edge of source to left edge of destination
      var sx = src.x + STAGE_W;
      var sy = src.y + STAGE_H / 2;
      var dx = dst.x;
      var dy = dst.y + STAGE_H / 2;

      // for mesh mode or non-horizontal, use smarter anchoring
      if (mode === 'mesh') {
        var csx = src.x + STAGE_W / 2, csy = src.y + STAGE_H / 2;
        var cdx = dst.x + STAGE_W / 2, cdy = dst.y + STAGE_H / 2;
        if (Math.abs(cdx - csx) >= Math.abs(cdy - csy)) {
          sx = cdx > csx ? src.x + STAGE_W : src.x;
          dx = cdx > csx ? dst.x : dst.x + STAGE_W;
          sy = csy; dy = cdy;
        } else {
          sy = cdy > csy ? src.y + STAGE_H : src.y;
          dy = cdy > csy ? dst.y : dst.y + STAGE_H;
          sx = csx; dx = cdx;
        }
      }

      // smooth cubic bezier for clean curves
      var cpOff = Math.min(Math.abs(dx - sx) * 0.4, 120);
      var d = 'M' + sx + ',' + sy +
              ' C' + (sx + cpOff) + ',' + sy +
              ' ' + (dx - cpOff) + ',' + dy +
              ' ' + dx + ',' + dy;

      var encrypted = e.encrypted === true || e.encrypted === 'true';
      var explicitFalse = e.encrypted === false || e.encrypted === 'false';
      var encAttr = encrypted ? 'true' : (explicitFalse ? 'false' : null);

      // glow layer (wide blurred stroke behind)
      var glowAttrs = { 'class': 'df-edge-glow', 'd': d };
      if (encAttr) glowAttrs['data-encrypted'] = encAttr;
      el('path', glowAttrs, edgesLayer);

      // main edge line
      var marker = encrypted ? 'url(#df-arrow-enc-' + SCENE_ID + ')'
                   : explicitFalse ? 'url(#df-arrow-unenc-' + SCENE_ID + ')'
                   : 'url(#df-arrow-' + SCENE_ID + ')';
      var pathAttrs = {
        'class': 'df-edge',
        'd': d,
        'data-from': e.from, 'data-to': e.to,
        'marker-end': marker
      };
      if (encAttr) pathAttrs['data-encrypted'] = encAttr;
      var path = el('path', pathAttrs, edgesLayer);
      edgePaths.push(path);

      // edge label as pill
      var labelText = e.dataType || '';
      if (e.protocol) labelText = labelText ? (labelText + ' · ' + e.protocol) : e.protocol;
      if (e.gatedBy) labelText = labelText ? (labelText + ' ⛨ ' + e.gatedBy) : ('⛨ ' + e.gatedBy);
      if (labelText) {
        var midX = (sx + dx) / 2;
        var midY = (sy + dy) / 2;
        var pillG = el('g', {
          'class': 'df-edge-pill',
          'data-edge': idx
        }, edgesLayer);
        // measure text width (approximate: 7.5px per char)
        var tw = labelText.length * 7.5 + 20;
        var th = 24;
        el('rect', {
          'class': 'df-edge-pill-bg',
          'x': midX - tw / 2, 'y': midY - th / 2 - 16,
          'width': tw, 'height': th, 'rx': 12, 'ry': 12
        }, pillG);
        var lt = el('text', {
          'class': 'df-edge-pill-text',
          'x': midX, 'y': midY - 16 + 1,
          'text-anchor': 'middle', 'dominant-baseline': 'central'
        }, pillG);
        lt.textContent = labelText;
      }

      // lock icon on encrypted edges
      if (encrypted || explicitFalse) {
        var lmx = (sx + dx) / 2, lmy = (sy + dy) / 2;
        var lg = el('g', {
          'class': 'df-lock',
          'transform': 'translate(' + (lmx - 10) + ',' + (lmy + 8) + ')'
        }, locksLayer);
        el('rect', { 'x': 0, 'y': 6, 'width': 20, 'height': 14, 'rx': 3,
          'fill': encrypted ? '#22c55e' : '#f59e0b' }, lg);
        el('path', {
          'd': 'M4,6 V3 a6,6 0 0 1 12,0 V6',
          'fill': 'none',
          'stroke': encrypted ? '#22c55e' : '#f59e0b',
          'stroke-width': 2
        }, lg);
      }

      // energy pulse orb — bright circle with glow filter
      var orbColor = encrypted ? '#22c55e' : (explicitFalse ? '#f59e0b' : '#38bdf8');
      var orb = el('circle', {
        'class': 'df-pulse',
        'r': 6,
        'cx': sx, 'cy': sy,
        'fill': orbColor,
        'filter': 'url(#df-glow-orb-' + SCENE_ID + ')',
        'data-edge': idx
      }, packetsLayer);
      // add a brighter white core
      var orbCore = el('circle', {
        'class': 'df-pulse',
        'r': 2.5,
        'cx': sx, 'cy': sy,
        'fill': '#ffffff',
        'data-edge': idx
      }, packetsLayer);
      pulseOrbs.push({
        orb: orb, core: orbCore, path: path,
        sx: sx, sy: sy, dx: dx, dy: dy
      });
    });

    // stash for animation phase
    root.__dfEdgePaths = edgePaths;
    root.__dfPulseOrbs = pulseOrbs;

    // ---- legend ------------------------------------------------------------
    if (legend && legendEl) {
      function group(title, items) {
        if (!items || items.length === 0) return;
        var g2 = document.createElement('div');
        g2.className = 'df-legend-group';
        if (title) {
          var t = document.createElement('span');
          t.className = 'df-legend-title';
          t.textContent = title;
          g2.appendChild(t);
        }
        items.forEach(function (item) {
          var chip = document.createElement('span');
          chip.className = 'df-legend-chip';
          var sw = document.createElement('span');
          sw.className = 'df-legend-swatch';
          var color = item.color || (title && title.toLowerCase().indexOf('class') >= 0
            ? classColor(item.label) : '#38bdf8');
          sw.style.background = color;
          chip.appendChild(sw);
          chip.appendChild(document.createTextNode(item.label || ''));
          g2.appendChild(chip);
        });
        legendEl.appendChild(g2);
      }
      if (Array.isArray(legend)) {
        group('', legend);
      } else {
        group('Classification', legend.classifications || []);
        group('Encryption', legend.encryptionStates || []);
      }
    }

    // ---- callouts ----------------------------------------------------------
    if (callouts.length > 0 && calloutsLayer) {
      callouts.forEach(function (c) {
        var p = byId[c.targetId];
        if (!p) return;
        var c2 = document.createElement('div');
        c2.className = 'df-callout';
        c2.textContent = c.text || '';
        var px = ((p.x + STAGE_W / 2) / VIEW_W) * 100;
        var py = ((p.y - 24) / VIEW_H) * 100;
        c2.style.left = 'calc(' + px + '% - 130px)';
        c2.style.top = 'calc(' + py + '% - 90px)';
        calloutsLayer.appendChild(c2);
      });
    }
  })();

  // ---- Animations (all on master timeline) ---------------------------------

  // Phase 0: Background + title fade in (0.0–0.5s)
  master.fromTo(S + ' .df-root',
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.3, ease: 'power2.out' },
    SCENE_START + 0.0);

  master.fromTo(S + ' .df-header',
    { autoAlpha: 0, y: -15 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    SCENE_START + 0.1);

  master.fromTo(S + ' .df-title-accent',
    { autoAlpha: 0, scaleX: 0, transformOrigin: 'left center' },
    { autoAlpha: 1, scaleX: 1, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.3);

  // Phase 1: Node cards appear one by one with scale-up pop (0.3–1.2s)
  master.fromTo(S + ' .df-stage',
    { autoAlpha: 0, scale: 0.8, transformOrigin: '50% 50%' },
    { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)',
      stagger: 0.15 },
    SCENE_START + 0.3);

  // Phase 2: Connection lines draw in via strokeDashoffset (1.2–2.0s)
  // Set initial stroke-dash state synchronously, then tween on master
  (function initEdgeStrokes() {
    var root = document.querySelector(S + ' .df-root');
    if (!root || !root.__dfEdgePaths) return;
    var paths = root.__dfEdgePaths;
    // also select glow paths
    var glows = document.querySelectorAll(S + ' .df-edge-glow');
    var allPaths = [];
    glows.forEach(function (g) { allPaths.push(g); });
    paths.forEach(function (p) { allPaths.push(p); });

    allPaths.forEach(function (p) {
      var len;
      try { len = p.getTotalLength(); } catch (_e) { len = 600; }
      p.setAttribute('stroke-dasharray', len);
      p.setAttribute('stroke-dashoffset', len);
    });

    // tween each edge pair (glow + main) on master
    for (var i = 0; i < paths.length; i++) {
      var mainP = paths[i];
      var glowP = glows[i];
      var len2;
      try { len2 = mainP.getTotalLength(); } catch (_e2) { len2 = 600; }

      master.to(mainP,
        { attr: { 'stroke-dashoffset': 0 }, duration: 0.6, ease: 'power2.inOut' },
        SCENE_START + 1.2 + i * 0.12);
      if (glowP) {
        master.to(glowP,
          { attr: { 'stroke-dashoffset': 0 }, duration: 0.6, ease: 'power2.inOut' },
          SCENE_START + 1.2 + i * 0.12);
      }
    }
  })();

  // Phase 2.5: Edge label pills fade in (1.5–2.2s)
  master.fromTo(S + ' .df-edge-pill',
    { autoAlpha: 0, y: -4 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.12 },
    SCENE_START + 1.5);

  // Phase 3: Energy pulse orbs travel along each path (2.0–3.0s)
  (function initPulseOrbs() {
    var root = document.querySelector(S + ' .df-root');
    if (!root || !root.__dfPulseOrbs) return;
    var orbs = root.__dfPulseOrbs;

    orbs.forEach(function (o, idx) {
      var offset = SCENE_START + 2.0 + idx * 0.18;
      // fade in
      master.fromTo(o.orb,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.15 },
        offset);
      master.fromTo(o.core,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.15 },
        offset);

      // travel: use the SVG path to compute points along the path
      // Since we can't use MotionPath plugin, animate cx/cy through mid-point
      var midX = (o.sx + o.dx) / 2;
      var midY = (o.sy + o.dy) / 2;

      // first half
      master.to(o.orb,
        { attr: { cx: midX, cy: midY }, duration: 0.35, ease: 'power1.in' },
        offset + 0.05);
      master.to(o.core,
        { attr: { cx: midX, cy: midY }, duration: 0.35, ease: 'power1.in' },
        offset + 0.05);

      // second half
      master.to(o.orb,
        { attr: { cx: o.dx, cy: o.dy }, duration: 0.35, ease: 'power1.out' },
        offset + 0.4);
      master.to(o.core,
        { attr: { cx: o.dx, cy: o.dy }, duration: 0.35, ease: 'power1.out' },
        offset + 0.4);

      // fade out
      master.to(o.orb,
        { autoAlpha: 0, duration: 0.2 },
        offset + 0.7);
      master.to(o.core,
        { autoAlpha: 0, duration: 0.2 },
        offset + 0.7);
    });
  })();

  // Phase 4: Classification banners slide in (2.5s+)
  master.fromTo(S + ' .df-class-banner',
    { autoAlpha: 0, y: -8 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.10 },
    SCENE_START + 2.5);

  // Locks reveal
  master.fromTo(S + ' .df-lock',
    { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' },
    { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)', stagger: 0.10 },
    SCENE_START + 2.6);

  // Callouts fade in
  master.fromTo(S + ' .df-callout',
    { autoAlpha: 0, y: 6 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.18 },
    SCENE_START + 2.8);

  // Legend fades in (only if populated)
  master.fromTo(S + ' .df-legend',
    { autoAlpha: 0, y: 8 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 3.2);

  // Exit fade (CONTRACT §7 — 0.4s before scene end)
  master.to(S + ' .df-root',
    { autoAlpha: 0, duration: 0.4, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.4);
})();
