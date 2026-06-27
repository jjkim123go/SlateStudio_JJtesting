// ScrollingBackground — animation contract
//
// Lane A data-array pattern: `layers` and `gradientStops` are JSON-stringified
// into `data-layers` / `data-gradient-stops` attributes by the SCF author
// (until the Lane C compiler prop-builder shim ships — same convention as
// DataFlow / DataChart). `childHtml` is a flat HTML string rendered raw via
// the triple-mustache in index.html.
//
// Globals provided by the renderer (do NOT redeclare): master, gsap,
// SCENE_ID, SCENE_START, SCENE_DURATION.
(function () {
  var root = document.querySelector('.scene-' + SCENE_ID + ' .sb-root');
  if (!root) return;

  function isPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }
  function num(v, fb) {
    if (isPlaceholder(v)) return fb;
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : fb;
  }
  function safeJson(v, fb) {
    if (isPlaceholder(v)) return fb;
    try { return JSON.parse(v); } catch (_e) { return fb; }
  }

  // Normalize boolean-ish data attrs ("", "false", undefined) to literal
  // "false" so the CSS [data-noise="true"] gating is unambiguous.
  ['data-noise', 'data-safe-contrast'].forEach(function (a) {
    var v = root.getAttribute(a);
    if (isPlaceholder(v) || v.toLowerCase() !== 'true') root.setAttribute(a, 'false');
    else root.setAttribute(a, 'true');
  });

  var direction = (root.getAttribute('data-direction') || 'left').toLowerCase();
  if (isPlaceholder(direction)) direction = 'left';
  var loopSec = num(root.getAttribute('data-loop-sec'), 12);

  var stops = safeJson(root.getAttribute('data-gradient-stops'), null);
  if (!Array.isArray(stops) || !stops.length) {
    stops = ['#0a0e27', '#1a1f3a', '#0a0e27'];
  }

  var layers = safeJson(root.getAttribute('data-layers'), []);
  if (!Array.isArray(layers)) layers = [];

  // Direction → axis + sign (positive sign moves toward +x/+y).
  var axis = (direction === 'up' || direction === 'down') ? 'vertical' : 'horizontal';
  var sign;
  if (direction === 'right' || direction === 'down') sign = 1;
  else sign = -1;
  var isParallax = (direction === 'parallax');
  if (isParallax) { axis = 'horizontal'; sign = -1; }

  // Paint base gradient.
  var base = root.querySelector('.sb-base');
  if (base) {
    var angle = (axis === 'vertical') ? '180deg' : '90deg';
    base.style.background = 'linear-gradient(' + angle + ', ' + stops.map(String).join(', ') + ')';
  }

  // Build each layer DOM (two stacked tiles for a seamless loop).
  var layersHost = root.querySelector('.sb-layers');
  var rect = root.getBoundingClientRect();
  var hostW = rect.width || 1920;
  var hostH = rect.height || 1080;
  var tileSize = (axis === 'horizontal') ? hostW : hostH;

  var animSpecs = [];

  layers.forEach(function (lyr, i) {
    if (!lyr || typeof lyr !== 'object') return;
    var type = String(lyr.type || 'gradient').toLowerCase();
    var opacity = (typeof lyr.opacity === 'number') ? Math.max(0, Math.min(1, lyr.opacity)) : 1;
    var perLayerSpeed = (typeof lyr.speed === 'number' && lyr.speed > 0) ? lyr.speed : null;
    var color = (typeof lyr.color === 'string' && lyr.color) ? lyr.color : '#3b82f6';
    var asset = (typeof lyr.assetSrc === 'string' && lyr.assetSrc && !isPlaceholder(lyr.assetSrc)) ? lyr.assetSrc : '';

    var layerEl = document.createElement('div');
    layerEl.className = 'sb-layer';
    layerEl.setAttribute('data-axis', axis);
    layerEl.setAttribute('data-layer-index', String(i));
    layerEl.style.opacity = String(opacity);
    layerEl.style.zIndex = String(i + 1);

    if (axis === 'horizontal') {
      layerEl.style.width = (tileSize * 2) + 'px';
      layerEl.style.height = '100%';
    } else {
      layerEl.style.width = '100%';
      layerEl.style.height = (tileSize * 2) + 'px';
    }

    var tileBg;
    if (type === 'lottie' && lyr._lottieDataIslandId) {
      // PR 9 Lane B: Lottie tile — create a container div that the Lottie
      // driver will discover via .lottie-container class.
      var lottieDiv = document.createElement('div');
      lottieDiv.className = 'sb-tile sb-tile-lottie lottie-container';
      lottieDiv.setAttribute('data-lottie-data-id', lyr._lottieDataIslandId);
      lottieDiv.setAttribute('data-lottie-scene-start', String(SCENE_START));
      lottieDiv.setAttribute('data-lottie-scene-duration', String(SCENE_DURATION));
      lottieDiv.setAttribute('data-lottie-speed', String(lyr.speed || 1));
      lottieDiv.setAttribute('data-lottie-loop', lyr.loop !== false ? '1' : '0');
      lottieDiv.setAttribute('data-lottie-segment-from', '');
      lottieDiv.setAttribute('data-lottie-segment-to', '');
      lottieDiv.style.width = '100%';
      lottieDiv.style.height = '100%';
      for (var t = 0; t < 2; t++) {
        layerEl.appendChild(lottieDiv.cloneNode(true));
      }
      layersHost.appendChild(layerEl);
      var dur;
      if (isParallax) { dur = loopSec * (1 + i * 0.30); }
      else if (perLayerSpeed) { dur = tileSize / perLayerSpeed; }
      else { dur = loopSec; }
      if (!Number.isFinite(dur) || dur <= 0) dur = loopSec;
      animSpecs.push({ el: layerEl, axis: axis, sign: sign, tileSize: tileSize, dur: dur });
      return; // skip normal tile generation for lottie type
    } else if (type === 'image' && asset) {
      tileBg = 'url("' + asset + '") center/cover no-repeat';
    } else if (type === 'shape') {
      tileBg = 'radial-gradient(circle at 22% 50%, ' + color + ' 0%, transparent 22%),'
             + 'radial-gradient(circle at 68% 32%, ' + color + ' 0%, transparent 18%),'
             + 'radial-gradient(circle at 48% 78%, ' + color + ' 0%, transparent 26%)';
    } else if (type === 'noise') {
      tileBg = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\") center/400px 400px repeat";
    } else {
      var gAngle = (axis === 'vertical') ? '180deg' : '90deg';
      tileBg = 'linear-gradient(' + gAngle + ', transparent 0%, ' + color + ' 50%, transparent 100%)';
    }

    for (var t = 0; t < 2; t++) {
      var tile = document.createElement('div');
      tile.className = 'sb-tile';
      tile.style.background = tileBg;
      layerEl.appendChild(tile);
    }

    layersHost.appendChild(layerEl);

    // Compute per-layer loop duration.
    // - Parallax: each layer N gets multiplier (1 + N * 0.3) -> back layers move slower.
    // - Otherwise: respect per-layer speed prop, else fall back to top-level loopSec.
    var dur;
    if (isParallax) {
      dur = loopSec * (1 + i * 0.30);
    } else if (perLayerSpeed) {
      dur = tileSize / perLayerSpeed;
    } else {
      dur = loopSec;
    }
    if (!Number.isFinite(dur) || dur <= 0) dur = loopSec;

    animSpecs.push({
      el: layerEl,
      axis: axis,
      sign: sign,
      tileSize: tileSize,
      dur: dur
    });
  });

  // Launch the infinite loops in sync with the master timeline.
  // master.call schedules the kickoff at SCENE_START so all loops start aligned;
  // each underlying tween is its own infinite GSAP tween (not part of master),
  // which keeps the master timeline finite-length and renderer-friendly.
  master.call(function () {
    animSpecs.forEach(function (s) {
      var prop = (s.axis === 'horizontal') ? 'x' : 'y';
      var distance = s.tileSize * s.sign;
      var fromVars = {};
      var toVars = { duration: s.dur, ease: 'none', repeat: -1 };
      fromVars[prop] = 0;
      toVars[prop] = distance;
      gsap.fromTo(s.el, fromVars, toVars);
    });
  }, [], SCENE_START);

  // Clean exit: drop to muted level then fade out so the scene transition
  // does not snap a still-scrolling background.
  master.to('.scene-' + SCENE_ID + ' .sb-root',
    { opacity: 0.7, duration: 0.3, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.6);
  master.to('.scene-' + SCENE_ID + ' .sb-root',
    { opacity: 0, duration: 0.3, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.3);
})();
