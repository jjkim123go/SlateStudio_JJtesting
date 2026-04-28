/*
 * WhiteboardScene — animation contract (Wave A + B, PR 8a)
 * ============================================================================
 * Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START,
 *   SCENE_DURATION, SCENE_PROPS, document, window.
 *
 * VARIANT DISPATCH (Wave B, fail-closed)
 *   SCENE_PROPS.variant ∈ { 'brainstorm' (default), 'diagramMode', 'templateRetro' }
 *   Unknown variants throw at module-eval — there is no silent fallback.
 *
 * SCENE_PROPS shape per variant:
 *
 *   variant: 'brainstorm'        (Wave A — pixel-identical contract preserved)
 *     boardTitle, stickies, clusters, liveCursors                — see Wave A
 *
 *   variant: 'diagramMode'       (Wave B)
 *     boardTitle, liveCursors[2 — Avery + Sam]
 *     5 hand-drawn boxes + 5 hand-drawn arrows are built deterministically
 *     by buildDiagram() (no per-scene authoring needed). Refine effect uses
 *     two SVG layers per shape with MATCHED GEOMETRY (same x/y/w/h bbox &
 *     anchor); rough fades out, clean fades in via master.to opacity. Path
 *     `d` is NEVER mutated from JS callbacks (Rule #7).
 *
 *   variant: 'templateRetro'     (Wave B)
 *     boardTitle, liveCursors[2 — Avery + Maya]
 *     4-column retrospective frame + 9 stickies (3+2+2+2) built
 *     deterministically by buildRetro().
 *
 * DOM-SAFETY: every DOM node is constructed ONCE during synchronous setup
 * that runs at module-eval (before any tween fires). Subsequent tweens only
 * mutate transform / opacity / textContent / strokeDashoffset on existing
 * nodes. No appendChild inside any timeline callback.
 *
 * Class prefix: wb-. All selectors namespaced via '.scene-' + SCENE_ID + ' .wb-...'.
 * SR #15: Fluent UI 2 Filled icons only (decorative emoji on stickies/reactions OK).
 * SR #16: every tween is registered on `master`. No standalone sub-timelines.
 * Rule #7: no DOM mutations inside any tween callback.
 * ============================================================================
 */

var __wbScope = '.scene-' + SCENE_ID + ' ';
var __wbRoot  = document.querySelector(__wbScope + '.wb-bg');
if (__wbRoot) (function () {

  // ── Helpers (shared) ─────────────────────────────────────────────────────
  function wbIsPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }
  function wbClamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function wbReadProps() {
    return (typeof SCENE_PROPS === 'object' && SCENE_PROPS) ? SCENE_PROPS : {};
  }

  // ── Color tokens (shared across variants) ────────────────────────────────
  var STICKY_COLOR_VAR = {
    yellow:  'var(--wb-sticky-yellow)',
    yellow2: 'var(--wb-sticky-yellow2)',
    pink:    'var(--wb-sticky-pink)',
    red:     'var(--wb-sticky-red)',
    orange:  'var(--wb-sticky-orange)',
    green:   'var(--wb-sticky-green)',
    mint:    'var(--wb-sticky-mint)',
    lblue:   'var(--wb-sticky-lblue)',
    blue:    'var(--wb-sticky-blue)',
    purple:  'var(--wb-sticky-purple)',
    gray:    'var(--wb-sticky-gray)',
    white:   'var(--wb-sticky-white)'
  };

  var CLUSTER_COLOR = {
    performance: '#2DA94F',
    pricing:     '#E07B00',
    onboarding:  '#5C8AF0'
  };

  var AUTHOR_COLOR = {
    Avery:  '#0F6CBD',
    Sam:    '#0E7A0D',
    Jordan: '#7719AA',
    Morgan: '#D83B01',
    Maya:   '#7719AA',
    Tariq:  '#D83B01'
  };

  // ── Read & sanitize props (shared) ───────────────────────────────────────
  var props      = wbReadProps();
  var variant    = (typeof props.variant === 'string' && !wbIsPlaceholder(props.variant))
                     ? props.variant : 'brainstorm';
  var boardTitle = (typeof props.boardTitle === 'string' && !wbIsPlaceholder(props.boardTitle))
                     ? props.boardTitle : 'Whiteboard';
  var stickies   = Array.isArray(props.stickies)    ? props.stickies    : [];
  var clusters   = Array.isArray(props.clusters)    ? props.clusters    : [];
  var liveCursors = Array.isArray(props.liveCursors) ? props.liveCursors : [];

  __wbRoot.setAttribute('data-variant', variant);

  // ── Board title ──────────────────────────────────────────────────────────
  var titleEl = __wbRoot.querySelector('.wb-board-name');
  if (titleEl) {
    var tt = (titleEl.textContent || '').trim();
    if (!tt || wbIsPlaceholder(tt)) titleEl.textContent = boardTitle;
  }

  // ── Shared canvas world handle ───────────────────────────────────────────
  var world = __wbRoot.querySelector('.wb-canvas-world');
  if (!world) return;

  // ── Bezier helpers (shared by all variants for cursor walks) ─────────────
  function quadBezier(p0, p1, p2, t) {
    var u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }
  function sampleCursorPath(path, samplesPerSeg) {
    samplesPerSeg = samplesPerSeg || 8;
    var out = [];
    var segs = [];
    if (path.length >= 5) {
      segs.push([path[0], path[1], path[2]]);
      segs.push([path[2], path[3], path[4]]);
    } else {
      segs.push([path[0], path[1], path[2]]);
    }
    for (var si = 0; si < segs.length; si++) {
      var seg = segs[si];
      var startI = (si === 0) ? 0 : 1;
      for (var ti = startI; ti < samplesPerSeg; ti++) {
        var t = ti / (samplesPerSeg - 1);
        out.push(quadBezier(seg[0], seg[1], seg[2], t));
      }
    }
    return out;
  }

  // ── Shared cursor builder (used by Wave-B variants only;
  //    Wave-A 'brainstorm' keeps its inline construction byte-for-byte
  //    identical to preserve back-compat).
  function wbBuildCursor(parent, cu) {
    if (!cu || typeof cu !== 'object' || !Array.isArray(cu.path) || cu.path.length < 3) return null;
    var name   = (typeof cu.name === 'string' && !wbIsPlaceholder(cu.name)) ? cu.name : 'User';
    var accent = (typeof cu.accentHex === 'string' && /^#[0-9a-f]{3,8}$/i.test(cu.accentHex))
                   ? cu.accentHex
                   : (AUTHOR_COLOR[name] || '#0F6CBD');

    var cursorEl = document.createElement('div');
    cursorEl.className = 'wb-cursor';
    cursorEl.setAttribute('data-cursor-name', name);

    var arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowSvg.setAttribute('class', 'wb-cursor-arrow');
    arrowSvg.setAttribute('viewBox', '0 0 20 20');
    arrowSvg.setAttribute('aria-hidden', 'true');
    var arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M2 1.5 L2 17 L6.5 12.5 L9.5 18 L12 16.8 L9 11.2 L15 11 Z');
    arrowPath.setAttribute('fill', accent);
    arrowPath.setAttribute('stroke', '#FFFFFF');
    arrowPath.setAttribute('stroke-width', '0.8');
    arrowSvg.appendChild(arrowPath);
    cursorEl.appendChild(arrowSvg);

    var pill = document.createElement('span');
    pill.className = 'wb-cursor-pill';
    pill.style.background = accent;
    pill.textContent = name;
    cursorEl.appendChild(pill);

    var p0 = cu.path[0];
    cursorEl.style.transform = 'translate3d(' + (p0.x|0) + 'px,' + (p0.y|0) + 'px,0)';
    cursorEl.style.opacity = '0';

    parent.appendChild(cursorEl);
    return { el: cursorEl, path: cu.path, accent: accent, name: name };
  }

  function wbBuildReaction(parent, emoji, x, y) {
    var rE = document.createElement('div');
    rE.className = 'wb-reaction';
    rE.textContent = emoji;
    rE.style.left = x + 'px';
    rE.style.top  = y + 'px';
    parent.appendChild(rE);
    return rE;
  }

  // Cursor walk: registers all segment tweens on master.
  function wbTweenCursorWalk(ref, startTime, totalDur) {
    var samples = sampleCursorPath(ref.path, 8);
    var segCount = samples.length - 1;
    if (segCount < 1) return;
    var segDur = totalDur / segCount;
    master.set(ref.el, { x: samples[0].x, y: samples[0].y }, startTime);
    master.fromTo(ref.el, { opacity: 0 }, { opacity: 1, duration: 0.30, ease: 'power2.out' }, startTime);
    for (var sgi = 0; sgi < segCount; sgi++) {
      var p = samples[sgi + 1];
      master.to(ref.el,
        { x: p.x, y: p.y, duration: segDur,
          ease: (sgi === 0) ? 'power1.out'
              : (sgi === segCount - 1) ? 'power1.in' : 'none' },
        startTime + sgi * segDur);
    }
    master.to(ref.el, { opacity: 0, duration: 0.40, ease: 'power2.in' },
      startTime + totalDur + 0.50);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VARIANT: 'brainstorm' (Wave A — preserved byte-equivalent)
  // ═══════════════════════════════════════════════════════════════════════
  var __bsRefs = null;

  function buildBrainstorm() {
    // Frame the brainstorm: stickies are authored in a 0..1600 x 0..900 space,
    // viewport (post-toolbar) is ~1920×1028. Scale 0.92, slight pan to center.
    var WORLD_OFFSET_X = 80;
    var WORLD_OFFSET_Y = 40;
    var WORLD_SCALE    = 0.92;
    world.style.transform = 'translate3d(' + WORLD_OFFSET_X + 'px, '
                            + WORLD_OFFSET_Y + 'px, 0) scale(' + WORLD_SCALE + ')';

    // Build sticky DOM ONCE
    var stickyRefs = [];
    for (var i = 0; i < stickies.length; i++) {
      var s = stickies[i];
      if (!s || typeof s !== 'object') continue;

      var el = document.createElement('div');
      el.className = 'wb-sticky';
      el.setAttribute('data-sticky-id', String(s.id || ('s' + i)));

      var colorKey = (typeof s.color === 'string') ? s.color : 'yellow';
      var colorVar = STICKY_COLOR_VAR[colorKey] || STICKY_COLOR_VAR.yellow;
      el.style.background = colorVar;

      var rot = (typeof s.rotation === 'number') ? s.rotation
                : (((i * 73) % 8) - 4);
      var x = (typeof s.x === 'number') ? s.x : 100 + (i % 4) * 180;
      var y = (typeof s.y === 'number') ? s.y : 100 + Math.floor(i / 4) * 180;
      el.style.left = x + 'px';
      el.style.top  = y + 'px';

      if (s.id === 'title' || /title/i.test(String(s.id || ''))) {
        el.classList.add('wb-sticky--title');
      }

      var textNode = document.createElement('span');
      textNode.className = 'wb-sticky-text';
      textNode.textContent = (typeof s.text === 'string' && !wbIsPlaceholder(s.text))
                                ? s.text : '';
      el.appendChild(textNode);

      if (s.author && typeof s.author === 'string' && !wbIsPlaceholder(s.author)) {
        var dot = document.createElement('span');
        dot.className = 'wb-sticky-author-dot';
        dot.style.background = AUTHOR_COLOR[s.author] || '#888';
        dot.setAttribute('aria-label', s.author);
        el.appendChild(dot);
      }

      var hasArrive = typeof s.arriveAt === 'number' && s.arriveAt > 0;
      if (hasArrive) {
        el.style.opacity = '0';
        el.style.transform = 'rotate(' + rot + 'deg) scale(0.8)';
      } else {
        el.style.opacity = '1';
        el.style.transform = 'rotate(' + rot + 'deg) scale(1)';
      }

      world.appendChild(el);
      stickyRefs.push({
        el: el,
        spec: { x: x, y: y, rotation: rot, cluster: s.cluster, arriveAt: hasArrive ? s.arriveAt : null }
      });
    }

    // Cluster labels
    var clusterLabels = [];
    for (var ci = 0; ci < clusters.length; ci++) {
      var c = clusters[ci];
      if (!c || typeof c !== 'object') continue;
      var lab = document.createElement('div');
      lab.className = 'wb-cluster-label';
      lab.setAttribute('data-cluster', String(c.id || ''));
      lab.textContent = (typeof c.label === 'string' && !wbIsPlaceholder(c.label))
                          ? c.label : '';
      var lx = (typeof c.x === 'number') ? c.x : 200 + ci * 400;
      var ly = (typeof c.y === 'number') ? c.y : 60;
      lab.style.left = lx + 'px';
      lab.style.top  = ly + 'px';
      world.appendChild(lab);
      clusterLabels.push(lab);
    }

    var clusterPos = {};
    for (var cj = 0; cj < clusters.length; cj++) {
      var cc = clusters[cj];
      if (cc && typeof cc === 'object' && cc.id) {
        clusterPos[String(cc.id)] = {
          x: (typeof cc.x === 'number') ? cc.x : 0,
          y: (typeof cc.y === 'number') ? cc.y : 0
        };
      }
    }

    // Cursor nodes (Wave-A inline construction — preserved byte-equivalent)
    var cursorRefs = [];
    for (var k = 0; k < liveCursors.length; k++) {
      var cu = liveCursors[k];
      if (!cu || typeof cu !== 'object' || !Array.isArray(cu.path) || cu.path.length < 3) continue;

      var name   = (typeof cu.name === 'string' && !wbIsPlaceholder(cu.name)) ? cu.name : 'User';
      var accent = (typeof cu.accentHex === 'string' && /^#[0-9a-f]{3,8}$/i.test(cu.accentHex))
                     ? cu.accentHex
                     : (AUTHOR_COLOR[name] || '#0F6CBD');

      var cursorEl = document.createElement('div');
      cursorEl.className = 'wb-cursor';
      cursorEl.setAttribute('data-cursor-name', name);

      cursorEl.innerHTML = '';
      var arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrowSvg.setAttribute('class', 'wb-cursor-arrow');
      arrowSvg.setAttribute('viewBox', '0 0 20 20');
      arrowSvg.setAttribute('aria-hidden', 'true');
      var arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arrowPath.setAttribute('d', 'M2 1.5 L2 17 L6.5 12.5 L9.5 18 L12 16.8 L9 11.2 L15 11 Z');
      arrowPath.setAttribute('fill', accent);
      arrowPath.setAttribute('stroke', '#FFFFFF');
      arrowPath.setAttribute('stroke-width', '0.8');
      arrowSvg.appendChild(arrowPath);
      cursorEl.appendChild(arrowSvg);

      var pill = document.createElement('span');
      pill.className = 'wb-cursor-pill';
      pill.style.background = accent;
      pill.textContent = name;
      cursorEl.appendChild(pill);

      var p0 = cu.path[0];
      cursorEl.style.transform = 'translate3d(' + (p0.x|0) + 'px,' + (p0.y|0) + 'px,0)';

      world.appendChild(cursorEl);
      cursorRefs.push({ el: cursorEl, path: cu.path, accent: accent, name: name });
    }

    // Reaction emoji nodes (Wave-A inline)
    var reactionEmojis = ['👍', '💡', '🎉'];
    var reactionAnchor = (cursorRefs.length > 0) ? cursorRefs[0].path[cursorRefs[0].path.length - 1]
                                                  : { x: 800, y: 500 };
    var reactionRefs = [];
    for (var ri = 0; ri < reactionEmojis.length; ri++) {
      var rE = document.createElement('div');
      rE.className = 'wb-reaction';
      rE.textContent = reactionEmojis[ri];
      rE.style.left = (reactionAnchor.x + (ri - 1) * 14) + 'px';
      rE.style.top  = (reactionAnchor.y - 10) + 'px';
      world.appendChild(rE);
      reactionRefs.push(rE);
    }

    return {
      stickyRefs: stickyRefs,
      clusterLabels: clusterLabels,
      clusterPos: clusterPos,
      cursorRefs: cursorRefs,
      reactionRefs: reactionRefs
    };
  }

  function animateBrainstorm(refs) {
    var stickyRefs    = refs.stickyRefs;
    var clusterLabels = refs.clusterLabels;
    var clusterPos    = refs.clusterPos;
    var cursorRefs    = refs.cursorRefs;
    var reactionRefs  = refs.reactionRefs;

    var dur = (typeof SCENE_DURATION === 'number' && SCENE_DURATION > 0) ? SCENE_DURATION : 12;
    var fadeMargin = 0.5;

    // 1. Chrome reveal
    master.fromTo(__wbScope + '.wb-toolbar',
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
      SCENE_START + 0.05);
    master.fromTo(__wbScope + '.wb-canvas-viewport',
      { opacity: 0 },
      { opacity: 1, duration: 0.45, ease: 'power2.out' },
      SCENE_START + 0.05);
    master.fromTo([__wbScope + '.wb-sticky-palette', __wbScope + '.wb-action-menu'],
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
      SCENE_START + 0.20);

    // 2. Sticky-arrival sequence
    var arriveStickies = [];
    for (var ai = 0; ai < stickyRefs.length; ai++) {
      if (stickyRefs[ai].spec.arriveAt !== null) arriveStickies.push(stickyRefs[ai]);
    }
    for (var aj = 0; aj < arriveStickies.length; aj++) {
      var R = arriveStickies[aj];
      var at = SCENE_START + R.spec.arriveAt;
      master.to(R.el,
        { opacity: 1, scale: 1, duration: 0.40, ease: 'back.out(1.6)' },
        at);
    }

    // 3. Live cursors — manual quadratic-bezier walks
    var CURSOR_START_OFFSET = 1.50;
    var CURSOR_TOTAL_DUR    = 6.30;
    for (var cri = 0; cri < cursorRefs.length; cri++) {
      var C = cursorRefs[cri];
      var samples = sampleCursorPath(C.path, 8);
      var segCount = samples.length - 1;
      if (segCount < 1) continue;
      var segDur = CURSOR_TOTAL_DUR / segCount;
      var cursorStart = SCENE_START + CURSOR_START_OFFSET + cri * 0.30;

      master.set(C.el,
        { x: samples[0].x, y: samples[0].y },
        cursorStart);
      master.fromTo(C.el,
        { opacity: 0 },
        { opacity: 1, duration: 0.30, ease: 'power2.out' },
        cursorStart);

      for (var sgi = 0; sgi < segCount; sgi++) {
        var p = samples[sgi + 1];
        master.to(C.el,
          { x: p.x, y: p.y, duration: segDur,
            ease: (sgi === 0) ? 'power1.out'
                : (sgi === segCount - 1) ? 'power1.in' : 'none' },
          cursorStart + sgi * segDur);
      }

      master.to(C.el,
        { opacity: 0, duration: 0.40, ease: 'power2.in' },
        cursorStart + CURSOR_TOTAL_DUR + 0.50);
    }

    // 4. Copilot "Categorize" sequence
    master.fromTo(__wbScope + '.wb-copilot-thinking',
      { opacity: 0, y: -6 },
      { opacity: 1, y: 0, duration: 0.40, ease: 'power3.out' },
      SCENE_START + 4.50);

    var SNAP_START = SCENE_START + 5.80;
    var SNAP_STAGGER = 0.04;
    var clusterCount = {};
    for (var ck in clusterPos) { if (Object.prototype.hasOwnProperty.call(clusterPos, ck)) clusterCount[ck] = 0; }

    for (var sn = 0; sn < stickyRefs.length; sn++) {
      var SR = stickyRefs[sn];
      var clusterId = SR.spec.cluster;
      if (!clusterId || !clusterPos[clusterId]) continue;
      var dest = clusterPos[clusterId];
      var idx = clusterCount[clusterId] || 0;
      clusterCount[clusterId] = idx + 1;

      var col = idx % 4;
      var row = Math.floor(idx / 4);
      var destX = dest.x + col * 110;
      var destY = dest.y + 50 + row * 110;
      var destLeft = destX - SR.spec.x;
      var destTop  = destY - SR.spec.y;

      master.to(SR.el,
        { x: destLeft, y: destTop, rotation: 0, scale: 1,
          duration: 0.70, ease: 'power3.inOut' },
        SNAP_START + sn * SNAP_STAGGER);
    }

    for (var cli = 0; cli < clusterLabels.length; cli++) {
      master.fromTo(clusterLabels[cli],
        { opacity: 0, y: -6, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.5)' },
        SCENE_START + 6.60 + cli * 0.10);
    }

    master.to(__wbScope + '.wb-copilot-thinking',
      { opacity: 0, y: -6, duration: 0.35, ease: 'power2.in' },
      SCENE_START + 7.70);

    // 5. Reaction emojis
    var REACT_START = SCENE_START + 9.00;
    for (var rj = 0; rj < reactionRefs.length; rj++) {
      var rEl = reactionRefs[rj];
      var t0 = REACT_START + rj * 0.18;
      master.fromTo(rEl,
        { opacity: 0, y: 0, scale: 0.4 },
        { opacity: 1, scale: 1.15, duration: 0.30, ease: 'back.out(2)' },
        t0);
      master.to(rEl,
        { y: -120, duration: 1.40, ease: 'power1.out' },
        t0 + 0.15);
      master.to(rEl,
        { opacity: 0, duration: 0.50, ease: 'power2.in' },
        t0 + 1.05);
    }

    // 6. Diamond pulse
    master.to(__wbScope + '.wb-copilot-btn',
      { scale: 1.10, duration: 1.20, ease: 'sine.inOut',
        repeat: -1, yoyo: true, transformOrigin: '50% 50%' },
      SCENE_START + 0.50);

    // 7. Exit fade
    master.to(__wbScope + '.wb-bg',
      { opacity: 0, duration: fadeMargin, ease: 'power2.in' },
      SCENE_START + dur - fadeMargin);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VARIANT: 'diagramMode' (Wave B)
  // ═══════════════════════════════════════════════════════════════════════
  // Two SVG layers per box/arrow, MATCHED GEOMETRY (same x/y/w/h bbox &
  // anchor). Refine effect = master.to opacity crossfade between layers.
  // Path `d` is set ONCE at build time; never mutated from JS callbacks.
  // ═══════════════════════════════════════════════════════════════════════

  // Deterministic jitter in [-3, 3] (sine-hash; seed-stable across renders).
  function wbDgJitter(seed, salt) {
    var v = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
    var f = v - Math.floor(v);
    return (f * 6) - 3;
  }

  function wbDgRoughRectPath(x, y, w, h, seed) {
    var j = function(s) { return wbDgJitter(seed, s); };
    var x0 = x + j(1),       y0 = y + j(2);
    var x1 = x + w + j(3),   y1 = y + j(4);
    var x2 = x + w + j(5),   y2 = y + h + j(6);
    var x3 = x + j(7),       y3 = y + h + j(8);
    return 'M ' + x0 + ' ' + y0 +
           ' L ' + x1 + ' ' + y1 +
           ' L ' + x2 + ' ' + y2 +
           ' L ' + x3 + ' ' + y3 + ' Z';
  }
  function wbDgCleanRectPath(x, y, w, h) {
    return 'M ' + x + ' ' + y +
           ' L ' + (x + w) + ' ' + y +
           ' L ' + (x + w) + ' ' + (y + h) +
           ' L ' + x + ' ' + (y + h) + ' Z';
  }
  function wbDgAnchor(b, side) {
    if (side === 'R') return { x: b.x + b.w, y: b.y + b.h / 2 };
    if (side === 'L') return { x: b.x,        y: b.y + b.h / 2 };
    if (side === 'T') return { x: b.x + b.w / 2, y: b.y };
    if (side === 'B') return { x: b.x + b.w / 2, y: b.y + b.h };
    return { x: b.x, y: b.y };
  }
  function wbDgArrowCleanPath(p0, p1, side1, side2) {
    if (side1 === 'R' && side2 === 'L' && p0.y === p1.y) {
      return 'M ' + p0.x + ' ' + p0.y + ' L ' + p1.x + ' ' + p1.y;
    }
    if (side1 === 'R' && side2 === 'L') {
      var mx = (p0.x + p1.x) / 2;
      return 'M ' + p0.x + ' ' + p0.y +
             ' L ' + mx + ' ' + p0.y +
             ' L ' + mx + ' ' + p1.y +
             ' L ' + p1.x + ' ' + p1.y;
    }
    if (side1 === 'B' && side2 === 'B') {
      var dy = Math.max(p0.y, p1.y) + 80;
      return 'M ' + p0.x + ' ' + p0.y +
             ' L ' + p0.x + ' ' + dy +
             ' L ' + p1.x + ' ' + dy +
             ' L ' + p1.x + ' ' + p1.y;
    }
    return 'M ' + p0.x + ' ' + p0.y + ' L ' + p1.x + ' ' + p1.y;
  }
  function wbDgArrowRoughPath(p0, p1, side1, side2, seed) {
    var j = function(s) { return wbDgJitter(seed, s); };
    if (side1 === 'R' && side2 === 'L') {
      var mx = (p0.x + p1.x) / 2 + j(1);
      var my = (p0.y + p1.y) / 2 + j(6);
      return 'M ' + p0.x + ' ' + p0.y +
             ' Q ' + (mx - 30 + j(4)) + ' ' + (p0.y + j(5)) + ' ' + mx + ' ' + my +
             ' Q ' + (mx + 30 + j(7)) + ' ' + (p1.y + j(8)) + ' ' + p1.x + ' ' + p1.y;
    }
    if (side1 === 'B' && side2 === 'B') {
      var dy = Math.max(p0.y, p1.y) + 80 + j(1);
      var midX = (p0.x + p1.x) / 2 + j(2);
      return 'M ' + p0.x + ' ' + p0.y +
             ' Q ' + (p0.x + j(3)) + ' ' + (dy - 30) + ' ' + midX + ' ' + dy +
             ' Q ' + (p1.x + j(4)) + ' ' + (dy - 30) + ' ' + p1.x + ' ' + p1.y;
    }
    return 'M ' + p0.x + ' ' + p0.y + ' L ' + p1.x + ' ' + p1.y;
  }

  function buildDiagram() {
    var SVG_NS = 'http://www.w3.org/2000/svg';

    var bubbleText = __wbRoot.querySelector('.wb-copilot-thinking-text');
    if (bubbleText) bubbleText.textContent = 'Clean up shapes?';

    // World stays at native viewport coords for diagram (no transform).
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'wb-dg-svg');
    svg.setAttribute('viewBox', '0 0 1920 1028');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Arrowhead markers — id-scoped per scene to avoid cross-scene id collisions.
    var defs = document.createElementNS(SVG_NS, 'defs');
    function makeMarker(id, color) {
      var m = document.createElementNS(SVG_NS, 'marker');
      m.setAttribute('id', id);
      m.setAttribute('viewBox', '0 0 10 10');
      m.setAttribute('refX', '9');
      m.setAttribute('refY', '5');
      m.setAttribute('markerWidth', '7');
      m.setAttribute('markerHeight', '7');
      m.setAttribute('orient', 'auto-start-reverse');
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', 'M 0 0 L 10 5 L 0 10 Z');
      p.setAttribute('fill', color);
      m.appendChild(p);
      return m;
    }
    var ROUGH_MARKER = 'wb-dg-arrow-rough-' + SCENE_ID;
    var CLEAN_MARKER = 'wb-dg-arrow-clean-' + SCENE_ID;
    defs.appendChild(makeMarker(ROUGH_MARKER, '#3A3A3A'));
    defs.appendChild(makeMarker(CLEAN_MARKER, '#0F6CBD'));
    svg.appendChild(defs);

    var boxSpecs = [
      { id: 'b1', x: 240,  y: 360, w: 200, h: 100, label: 'Plan',     seed:  1 },
      { id: 'b2', x: 560,  y: 360, w: 200, h: 100, label: 'Build',    seed:  2 },
      { id: 'b3', x: 880,  y: 360, w: 200, h: 100, label: 'Test',     seed:  3 },
      { id: 'b4', x: 1200, y: 220, w: 200, h: 100, label: 'Ship',     seed:  4 },
      { id: 'b5', x: 1200, y: 500, w: 200, h: 100, label: 'Iterate',  seed:  5 }
    ];

    var boxRefs = [];
    for (var bi = 0; bi < boxSpecs.length; bi++) {
      var b = boxSpecs[bi];
      var perim = 2 * (b.w + b.h);

      var g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'wb-dg-box');
      g.setAttribute('data-box-id', b.id);

      var roughPath = document.createElementNS(SVG_NS, 'path');
      roughPath.setAttribute('class', 'wb-dg-rough');
      roughPath.setAttribute('d', wbDgRoughRectPath(b.x, b.y, b.w, b.h, b.seed));
      roughPath.setAttribute('fill', 'rgba(255,255,255,0.96)');
      roughPath.setAttribute('stroke', '#3A3A3A');
      roughPath.setAttribute('stroke-width', '2.4');
      roughPath.setAttribute('stroke-linejoin', 'round');
      roughPath.setAttribute('stroke-linecap', 'round');
      roughPath.style.strokeDasharray = String(perim);
      roughPath.style.strokeDashoffset = String(perim);
      g.appendChild(roughPath);

      var cleanPath = document.createElementNS(SVG_NS, 'path');
      cleanPath.setAttribute('class', 'wb-dg-clean');
      cleanPath.setAttribute('d', wbDgCleanRectPath(b.x, b.y, b.w, b.h));
      cleanPath.setAttribute('fill', 'rgba(255,255,255,0.96)');
      cleanPath.setAttribute('stroke', '#0F6CBD');
      cleanPath.setAttribute('stroke-width', '2');
      cleanPath.setAttribute('stroke-linejoin', 'round');
      cleanPath.style.opacity = '0';
      g.appendChild(cleanPath);

      var label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('class', 'wb-dg-label');
      label.setAttribute('x', String(b.x + b.w / 2));
      label.setAttribute('y', String(b.y + b.h / 2 + 6));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-family', 'Segoe UI Variable, Segoe UI, sans-serif');
      label.setAttribute('font-size', '20');
      label.setAttribute('font-weight', '600');
      label.setAttribute('fill', '#1A1A1A');
      label.style.opacity = '0';
      label.textContent = b.label;
      g.appendChild(label);

      svg.appendChild(g);
      boxRefs.push({ rough: roughPath, clean: cleanPath, label: label, perim: perim, spec: b });
    }

    var arrowSpecs = [
      { id: 'a1', from: 0, to: 1, fromSide: 'R', toSide: 'L', seed: 11 },
      { id: 'a2', from: 1, to: 2, fromSide: 'R', toSide: 'L', seed: 12 },
      { id: 'a3', from: 2, to: 3, fromSide: 'R', toSide: 'L', seed: 13 },
      { id: 'a4', from: 2, to: 4, fromSide: 'R', toSide: 'L', seed: 14 },
      { id: 'a5', from: 4, to: 1, fromSide: 'B', toSide: 'B', seed: 15 }
    ];

    var arrowRefs = [];
    for (var ai = 0; ai < arrowSpecs.length; ai++) {
      var a = arrowSpecs[ai];
      var b1s = boxSpecs[a.from], b2s = boxSpecs[a.to];
      var p0 = wbDgAnchor(b1s, a.fromSide);
      var p1 = wbDgAnchor(b2s, a.toSide);

      var ag = document.createElementNS(SVG_NS, 'g');
      ag.setAttribute('class', 'wb-dg-arrow');
      ag.setAttribute('data-arrow-id', a.id);

      var ra = document.createElementNS(SVG_NS, 'path');
      ra.setAttribute('class', 'wb-dg-rough-arrow');
      ra.setAttribute('d', wbDgArrowRoughPath(p0, p1, a.fromSide, a.toSide, a.seed));
      ra.setAttribute('fill', 'none');
      ra.setAttribute('stroke', '#3A3A3A');
      ra.setAttribute('stroke-width', '2.2');
      ra.setAttribute('stroke-linecap', 'round');
      ra.setAttribute('marker-end', 'url(#' + ROUGH_MARKER + ')');
      var aLen = Math.hypot(p1.x - p0.x, p1.y - p0.y) + 120; // padding for bezier curvature + loop dy
      ra.style.strokeDasharray = String(aLen);
      ra.style.strokeDashoffset = String(aLen);
      ag.appendChild(ra);

      var ca = document.createElementNS(SVG_NS, 'path');
      ca.setAttribute('class', 'wb-dg-clean-arrow');
      ca.setAttribute('d', wbDgArrowCleanPath(p0, p1, a.fromSide, a.toSide));
      ca.setAttribute('fill', 'none');
      ca.setAttribute('stroke', '#0F6CBD');
      ca.setAttribute('stroke-width', '2');
      ca.setAttribute('stroke-linecap', 'round');
      ca.setAttribute('stroke-linejoin', 'round');
      ca.setAttribute('marker-end', 'url(#' + CLEAN_MARKER + ')');
      ca.style.opacity = '0';
      ag.appendChild(ca);

      svg.appendChild(ag);
      arrowRefs.push({ rough: ra, clean: ca, len: aLen });
    }

    world.appendChild(svg);

    var cursorRefs = [];
    for (var cui = 0; cui < liveCursors.length; cui++) {
      var ref = wbBuildCursor(world, liveCursors[cui]);
      if (ref) cursorRefs.push(ref);
    }

    var reactionRefs = [];
    if (cursorRefs.length > 0) {
      var emojis = ['🎉', '✨', '👏'];
      for (var ri = 0; ri < emojis.length; ri++) {
        var src = cursorRefs[ri % cursorRefs.length];
        var anchor = src.path[src.path.length - 1];
        reactionRefs.push(wbBuildReaction(world, emojis[ri], anchor.x + (ri - 1) * 16, anchor.y - 12));
      }
    }

    return { boxes: boxRefs, arrows: arrowRefs, cursors: cursorRefs, reactions: reactionRefs };
  }

  function animateDiagram(refs) {
    var dur = (typeof SCENE_DURATION === 'number' && SCENE_DURATION > 0) ? SCENE_DURATION : 12;
    var fadeMargin = 0.5;

    // 1. Chrome reveal
    master.fromTo(__wbScope + '.wb-toolbar',
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
      SCENE_START + 0.05);
    master.fromTo(__wbScope + '.wb-canvas-viewport',
      { opacity: 0 },
      { opacity: 1, duration: 0.45, ease: 'power2.out' },
      SCENE_START + 0.05);
    master.fromTo([__wbScope + '.wb-sticky-palette', __wbScope + '.wb-action-menu'],
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
      SCENE_START + 0.20);

    // 2. Boxes draw (path-draw via strokeDashoffset; staggered)
    var DRAW_START = SCENE_START + 0.60;
    var BOX_DRAW_DUR = 0.50;
    var BOX_STAGGER = 0.18;
    for (var bi = 0; bi < refs.boxes.length; bi++) {
      var box = refs.boxes[bi];
      var t = DRAW_START + bi * BOX_STAGGER;
      master.to(box.rough,
        { strokeDashoffset: 0, duration: BOX_DRAW_DUR, ease: 'power1.inOut' },
        t);
      master.fromTo(box.label,
        { opacity: 0 },
        { opacity: 1, duration: 0.30, ease: 'power2.out' },
        t + BOX_DRAW_DUR - 0.10);
    }

    // 3. Arrows draw (path-draw)
    var ARROW_START = DRAW_START + refs.boxes.length * BOX_STAGGER + 0.10;
    var ARROW_DUR = 0.45;
    var ARROW_STAGGER = 0.15;
    for (var ai = 0; ai < refs.arrows.length; ai++) {
      var arr = refs.arrows[ai];
      var t2 = ARROW_START + ai * ARROW_STAGGER;
      master.to(arr.rough,
        { strokeDashoffset: 0, duration: ARROW_DUR, ease: 'power2.out' },
        t2);
    }
    var ARROW_END = ARROW_START + refs.arrows.length * ARROW_STAGGER + ARROW_DUR;

    // 4. Copilot bubble appears: "Clean up shapes?"
    master.fromTo(__wbScope + '.wb-copilot-thinking',
      { opacity: 0, y: -6 },
      { opacity: 1, y: 0, duration: 0.40, ease: 'power3.out' },
      ARROW_END + 0.20);

    // 5. Refine — matched-geometry crossfade (rough opacity → 0, clean → 1).
    //    Same x/y/w/h bbox for both layers; opacity tween only.
    var REFINE_START = ARROW_END + 0.90;
    var REFINE_DUR = 0.55;
    for (var rbi = 0; rbi < refs.boxes.length; rbi++) {
      var rbox = refs.boxes[rbi];
      var rt = REFINE_START + rbi * 0.06;
      master.to(rbox.rough, { opacity: 0, duration: REFINE_DUR, ease: 'power2.inOut' }, rt);
      master.to(rbox.clean, { opacity: 1, duration: REFINE_DUR, ease: 'power2.inOut' }, rt);
    }
    for (var rai = 0; rai < refs.arrows.length; rai++) {
      var rarr = refs.arrows[rai];
      var rt2 = REFINE_START + 0.10 + rai * 0.05;
      master.to(rarr.rough, { opacity: 0, duration: REFINE_DUR, ease: 'power2.inOut' }, rt2);
      master.to(rarr.clean, { opacity: 1, duration: REFINE_DUR, ease: 'power2.inOut' }, rt2);
    }

    master.to(__wbScope + '.wb-copilot-thinking',
      { opacity: 0, y: -6, duration: 0.35, ease: 'power2.in' },
      REFINE_START + REFINE_DUR + 0.30);

    // 6. Cursor walks (Avery + Sam)
    var CURSOR_START = SCENE_START + 1.20;
    var CURSOR_TOTAL = Math.max(2.0, ARROW_END - CURSOR_START);
    for (var cri = 0; cri < refs.cursors.length; cri++) {
      wbTweenCursorWalk(refs.cursors[cri], CURSOR_START + cri * 0.30, CURSOR_TOTAL);
    }

    // 7. Reaction emojis after refine
    var REACT_START = REFINE_START + REFINE_DUR + 0.40;
    for (var rj = 0; rj < refs.reactions.length; rj++) {
      var rEl = refs.reactions[rj];
      var t0 = REACT_START + rj * 0.18;
      master.fromTo(rEl,
        { opacity: 0, y: 0, scale: 0.4 },
        { opacity: 1, scale: 1.15, duration: 0.30, ease: 'back.out(2)' },
        t0);
      master.to(rEl,
        { y: -120, duration: 1.40, ease: 'power1.out' },
        t0 + 0.15);
      master.to(rEl,
        { opacity: 0, duration: 0.50, ease: 'power2.in' },
        t0 + 1.05);
    }

    // 8. Diamond pulse
    master.to(__wbScope + '.wb-copilot-btn',
      { scale: 1.10, duration: 1.20, ease: 'sine.inOut',
        repeat: -1, yoyo: true, transformOrigin: '50% 50%' },
      SCENE_START + 0.50);

    // 9. Exit fade
    master.to(__wbScope + '.wb-bg',
      { opacity: 0, duration: fadeMargin, ease: 'power2.in' },
      SCENE_START + dur - fadeMargin);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VARIANT: 'templateRetro' (Wave B)
  // ═══════════════════════════════════════════════════════════════════════
  function buildRetro() {
    var bubbleText = __wbRoot.querySelector('.wb-copilot-thinking-text');
    if (bubbleText) bubbleText.textContent = 'Group similar items?';

    var COLS = ['What went well', 'Improve', 'Action items', 'Shoutouts'];
    var COL_COUNT = COLS.length;
    var FRAME_X = 60;
    var FRAME_Y = 40;
    var FRAME_W = 1800;
    var FRAME_H = 920;
    var COL_W = FRAME_W / COL_COUNT;
    var HEADER_H = 56;

    var frame = document.createElement('div');
    frame.className = 'wb-rt-frame';
    frame.style.left = FRAME_X + 'px';
    frame.style.top  = FRAME_Y + 'px';
    frame.style.width  = FRAME_W + 'px';
    frame.style.height = FRAME_H + 'px';
    frame.style.opacity = '0';

    var colHeaders = [];
    var colDividers = [];
    for (var ci = 0; ci < COL_COUNT; ci++) {
      var col = document.createElement('div');
      col.className = 'wb-rt-col';
      col.style.left = (ci * COL_W) + 'px';
      col.style.width = COL_W + 'px';

      var header = document.createElement('div');
      header.className = 'wb-rt-col-header';
      header.textContent = COLS[ci];
      header.style.opacity = '0';
      col.appendChild(header);
      colHeaders.push(header);

      frame.appendChild(col);

      if (ci > 0) {
        var div = document.createElement('div');
        div.className = 'wb-rt-col-divider';
        div.style.left = (ci * COL_W) + 'px';
        div.style.transformOrigin = 'top center';
        div.style.transform = 'scaleY(0)';
        frame.appendChild(div);
        colDividers.push(div);
      }
    }

    world.appendChild(frame);

    // Stickies: 3 + 2 + 2 + 2 = 9
    var stickySpecs = [
      { col: 0, slot: 0, text: 'Faster releases',     author: 'Avery',  color: 'green'   },
      { col: 0, slot: 1, text: 'Tight comms',         author: 'Sam',    color: 'mint'    },
      { col: 0, slot: 2, text: 'Stable CI runs',      author: 'Maya',   color: 'lblue'   },

      { col: 1, slot: 0, text: 'Flaky tests',         author: 'Jordan', color: 'pink'    },
      { col: 1, slot: 1, text: 'Slow E2E suite',      author: 'Maya',   color: 'red'     },

      { col: 2, slot: 0, text: 'Triage backlog',      author: 'Avery',  color: 'yellow'  },
      { col: 2, slot: 1, text: 'Pair on hardening',   author: 'Tariq',  color: 'yellow2' },

      { col: 3, slot: 0, text: 'Avery on the demo',   author: 'Sam',    color: 'orange'  },
      { col: 3, slot: 1, text: 'Maya unblocked us',   author: 'Jordan', color: 'purple'  }
    ];

    var stickyW = 200;
    var stickyH = 130;

    var stickyRefs = [];
    for (var si = 0; si < stickySpecs.length; si++) {
      var sp = stickySpecs[si];

      var st = document.createElement('div');
      st.className = 'wb-rt-sticky';
      st.setAttribute('data-col', String(sp.col));

      var x = FRAME_X + sp.col * COL_W + (COL_W - stickyW) / 2;
      var y = FRAME_Y + HEADER_H + 20 + sp.slot * (stickyH + 14);

      st.style.left = x + 'px';
      st.style.top  = y + 'px';
      st.style.width  = stickyW + 'px';
      st.style.height = stickyH + 'px';
      st.style.background = STICKY_COLOR_VAR[sp.color] || STICKY_COLOR_VAR.yellow;
      st.style.opacity = '0';
      st.style.transform = 'scale(0.7)';

      var txt = document.createElement('span');
      txt.className = 'wb-rt-sticky-text';
      txt.textContent = sp.text;
      st.appendChild(txt);

      var dot = document.createElement('span');
      dot.className = 'wb-rt-sticky-author-dot';
      dot.style.background = AUTHOR_COLOR[sp.author] || '#888';
      dot.setAttribute('aria-label', sp.author);
      st.appendChild(dot);

      world.appendChild(st);
      stickyRefs.push({ el: st, spec: sp, x: x, y: y, w: stickyW, h: stickyH });
    }

    // Cluster background tint behind 2 'Improve' stickies (idx 3 & 4)
    var clusterBg = document.createElement('div');
    clusterBg.className = 'wb-rt-cluster-bg';
    var impr0 = stickyRefs[3];
    var groupX = impr0.x - 14;
    var groupY = impr0.y - 14;
    var groupW = impr0.w + 28;
    var groupH = impr0.h * 2 + 10 + 28;
    clusterBg.style.left = groupX + 'px';
    clusterBg.style.top  = groupY + 'px';
    clusterBg.style.width  = groupW + 'px';
    clusterBg.style.height = groupH + 'px';
    clusterBg.style.opacity = '0';
    world.appendChild(clusterBg);

    // Cursors (Avery + Maya)
    var cursorRefs = [];
    for (var cui = 0; cui < liveCursors.length; cui++) {
      var ref = wbBuildCursor(world, liveCursors[cui]);
      if (ref) cursorRefs.push(ref);
    }

    // Reactions: 👍 over a 'What went well' sticky, 💡 over an 'Action items' sticky
    var reactionRefs = [];
    var thumbsAnchor = stickyRefs[0]; // col 0
    var bulbAnchor   = stickyRefs[5]; // col 2
    reactionRefs.push(wbBuildReaction(world, '👍',
      thumbsAnchor.x + thumbsAnchor.w / 2 - 14, thumbsAnchor.y - 18));
    reactionRefs.push(wbBuildReaction(world, '💡',
      bulbAnchor.x + bulbAnchor.w / 2 - 14,    bulbAnchor.y - 18));

    return {
      frame: frame,
      colHeaders: colHeaders,
      colDividers: colDividers,
      stickies: stickyRefs,
      clusterBg: clusterBg,
      cursors: cursorRefs,
      reactions: reactionRefs
    };
  }

  function animateRetro(refs) {
    var dur = (typeof SCENE_DURATION === 'number' && SCENE_DURATION > 0) ? SCENE_DURATION : 14;
    var fadeMargin = 0.5;

    // 1. Chrome
    master.fromTo(__wbScope + '.wb-toolbar',
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
      SCENE_START + 0.05);
    master.fromTo(__wbScope + '.wb-canvas-viewport',
      { opacity: 0 },
      { opacity: 1, duration: 0.45, ease: 'power2.out' },
      SCENE_START + 0.05);
    master.fromTo([__wbScope + '.wb-sticky-palette', __wbScope + '.wb-action-menu'],
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
      SCENE_START + 0.20);

    // 2. Frame fades in, dividers grow, headers fade in
    master.fromTo(refs.frame,
      { opacity: 0 },
      { opacity: 1, duration: 0.40, ease: 'power2.out' },
      SCENE_START + 0.40);
    for (var di = 0; di < refs.colDividers.length; di++) {
      master.to(refs.colDividers[di],
        { scaleY: 1, duration: 0.45, ease: 'power2.out' },
        SCENE_START + 0.55 + di * 0.06);
    }
    for (var hi = 0; hi < refs.colHeaders.length; hi++) {
      master.to(refs.colHeaders[hi],
        { opacity: 1, duration: 0.30, ease: 'power2.out' },
        SCENE_START + 0.80 + hi * 0.08);
    }

    // 3. Sticky pop-in (cursor positions before each sticky lands)
    var STICKY_START = SCENE_START + 1.60;
    var STICKY_STAGGER = 0.18;
    for (var si = 0; si < refs.stickies.length; si++) {
      var st = refs.stickies[si];
      var t = STICKY_START + si * STICKY_STAGGER;

      var cuIdx = (refs.cursors.length > 0) ? (si % refs.cursors.length) : -1;
      if (cuIdx >= 0) {
        var cu = refs.cursors[cuIdx];
        master.to(cu.el,
          { opacity: 1, duration: 0.20, ease: 'power2.out' },
          Math.max(SCENE_START, t - 0.30));
        master.to(cu.el,
          { x: st.x + 30, y: st.y + 20, duration: 0.30, ease: 'power2.inOut' },
          t - 0.20);
      }

      master.to(st.el,
        { opacity: 1, scale: 1, duration: 0.40, ease: 'back.out(1.6)' },
        t);
    }
    var STICKY_END = STICKY_START + refs.stickies.length * STICKY_STAGGER + 0.40;

    // 4. Copilot bubble: "Group similar items?"
    master.fromTo(__wbScope + '.wb-copilot-thinking',
      { opacity: 0, y: -6 },
      { opacity: 1, y: 0, duration: 0.40, ease: 'power3.out' },
      STICKY_END + 0.20);

    // 5. Group: 2 Improve stickies snap together + cluster bg fades in
    var GROUP_START = STICKY_END + 1.00;
    var s3 = refs.stickies[3];
    var s4 = refs.stickies[4];
    var targetY4 = s3.y + s3.h + 10;
    master.to(s3.el,
      { x: 0, y: 0, duration: 0.55, ease: 'power3.inOut' },
      GROUP_START);
    master.to(s4.el,
      { x: 0, y: targetY4 - s4.y, duration: 0.55, ease: 'power3.inOut' },
      GROUP_START);
    master.to(refs.clusterBg,
      { opacity: 1, duration: 0.45, ease: 'power2.out' },
      GROUP_START + 0.10);

    master.to(__wbScope + '.wb-copilot-thinking',
      { opacity: 0, y: -6, duration: 0.35, ease: 'power2.in' },
      GROUP_START + 0.85);

    // 6. Cursor exit fade
    for (var cei = 0; cei < refs.cursors.length; cei++) {
      master.to(refs.cursors[cei].el,
        { opacity: 0, duration: 0.40, ease: 'power2.in' },
        GROUP_START + 1.50);
    }

    // 7. Reactions
    var REACT_START = GROUP_START + 1.40;
    for (var rj = 0; rj < refs.reactions.length; rj++) {
      var rEl = refs.reactions[rj];
      var t0 = REACT_START + rj * 0.30;
      master.fromTo(rEl,
        { opacity: 0, y: 0, scale: 0.4 },
        { opacity: 1, scale: 1.15, duration: 0.30, ease: 'back.out(2)' },
        t0);
      master.to(rEl,
        { y: -120, duration: 1.40, ease: 'power1.out' },
        t0 + 0.15);
      master.to(rEl,
        { opacity: 0, duration: 0.50, ease: 'power2.in' },
        t0 + 1.05);
    }

    // 8. Diamond pulse
    master.to(__wbScope + '.wb-copilot-btn',
      { scale: 1.10, duration: 1.20, ease: 'sine.inOut',
        repeat: -1, yoyo: true, transformOrigin: '50% 50%' },
      SCENE_START + 0.50);

    // 9. Exit fade
    master.to(__wbScope + '.wb-bg',
      { opacity: 0, duration: fadeMargin, ease: 'power2.in' },
      SCENE_START + dur - fadeMargin);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DISPATCH (fail-closed switch — unknown variants throw)
  // ═══════════════════════════════════════════════════════════════════════
  switch (variant) {
    case 'brainstorm':    { __bsRefs = buildBrainstorm(); animateBrainstorm(__bsRefs); break; }
    case 'diagramMode':   { var __dgRefs = buildDiagram(); animateDiagram(__dgRefs); break; }
    case 'templateRetro': { var __rtRefs = buildRetro();    animateRetro(__rtRefs);    break; }
    default:
      throw new Error('WhiteboardScene: unknown variant "' + variant + '"');
  }

})();
