// ParticleTextForm — particles converge into text-pixel positions.
// Globals: master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  if (typeof gsap === 'undefined' || typeof master === 'undefined') return;
  var scope = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(scope + '.ptf-root');
  if (!root) return;

  function attr(name, fallback) {
    var v = root.getAttribute(name);
    if (!v || v.indexOf('{{') !== -1 || v === '') return fallback;
    return v;
  }
  function num(name, fallback) {
    var v = parseFloat(attr(name, ''));
    return isFinite(v) && v > 0 ? v : fallback;
  }

  var text         = attr('data-ptf-text', 'MAGE');
  var color        = attr('data-ptf-color', '#c4b5fd');
  var colorAlt     = attr('data-ptf-color-alt', '#7c4dff');
  var count        = Math.min(1400, Math.max(120, Math.round(num('data-ptf-count', 700))));
  var assemblyDur  = Math.min(Math.max(num('data-ptf-duration', 3.5), 1.0), Math.max(1.2, SCENE_DURATION - 0.6));
  var fontFamily   = attr('data-ptf-font', "'Inter', -apple-system, 'Segoe UI', sans-serif");
  var fontWeight   = attr('data-ptf-weight', '900');
  var letterSpace  = parseFloat(attr('data-ptf-letter-spacing', '-0.04')) || -0.04;

  var stage = root.querySelector('.ptf-stage');
  var layer = root.querySelector('.ptf-particle-layer');
  var tagline = root.querySelector('.ptf-tagline');
  if (!stage || !layer) return;

  function seeded(i) { return ((i * 9301 + 49297) % 233280) / 233280; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  master.call(function () {
    layer.innerHTML = '';

    var W = Math.max(stage.clientWidth || 1280, 320);
    var H = Math.max(stage.clientHeight || 540, 200);

    // Render text to hidden canvas at higher resolution for fine sampling
    var SAMPLE_W = 1024;
    var SAMPLE_H = Math.round(SAMPLE_W * (H / W));
    var canvas = document.createElement('canvas');
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pick font size that fits inside SAMPLE_W with some margin
    var targetFontPx = Math.floor(SAMPLE_H * 0.78);
    var fontStr = fontWeight + ' ' + targetFontPx + 'px ' + fontFamily;
    ctx.font = fontStr;
    ctx.letterSpacing = letterSpace + 'em';
    var measured = ctx.measureText(text).width;
    if (measured > SAMPLE_W * 0.92) {
      targetFontPx = Math.floor(targetFontPx * (SAMPLE_W * 0.92 / measured));
      ctx.font = fontWeight + ' ' + targetFontPx + 'px ' + fontFamily;
    }
    ctx.fillText(text, SAMPLE_W / 2, SAMPLE_H / 2);

    var img = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    var pts = [];
    var step = 3;
    for (var y = 0; y < SAMPLE_H; y += step) {
      for (var x = 0; x < SAMPLE_W; x += step) {
        var idx = (y * SAMPLE_W + x) * 4 + 3;
        if (img[idx] > 180) pts.push([x / SAMPLE_W, y / SAMPLE_H]);
      }
    }

    if (pts.length === 0) return;

    // Subsample / oversample to match `count`
    var targets = [];
    for (var i = 0; i < count; i += 1) {
      targets.push(pts[Math.floor(seeded(i * 41 + 7) * pts.length)]);
    }

    // Create particles at text-target positions; they'll animate from scatter → final
    for (var j = 0; j < targets.length; j += 1) {
      var nx = targets[j][0], ny = targets[j][1];
      var targetX = nx * W;
      var targetY = ny * H;

      var sizeRand = seeded(j * 19 + 37);
      var size = 4 + sizeRand * 6;
      // Scatter origins — biased radially outward
      var angle = seeded(j * 13 + 11) * Math.PI * 2;
      var radius = (W * 0.65) + seeded(j * 17 + 23) * (W * 0.6);
      var scatterX = Math.cos(angle) * radius;
      var scatterY = Math.sin(angle) * radius * 0.65;
      // Curve waypoint: midpoint of scatter→target with a perpendicular nudge
      var perp = (seeded(j * 23 + 5) - 0.5) * 220;
      var curveX = scatterX * 0.45 + perp * Math.cos(angle + Math.PI / 2);
      var curveY = scatterY * 0.45 + perp * Math.sin(angle + Math.PI / 2);

      var rot = (seeded(j * 31 + 13) - 0.5) * 540;
      var startScale = 0.4 + seeded(j * 29 + 17) * 0.9;

      var particle = document.createElement('div');
      particle.className = 'ptf-particle';
      var pickAlt = seeded(j * 7 + 19) > 0.62;
      var c = pickAlt ? colorAlt : color;
      particle.style.background = c;
      particle.style.setProperty('--ptf-glow', c);
      particle.style.setProperty('--ptf-glow-soft', pickAlt ? color : colorAlt);
      particle.style.left = (targetX - size * 0.5) + 'px';
      particle.style.top  = (targetY - size * 0.5) + 'px';
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.opacity = '0';
      particle.setAttribute('data-sx', scatterX.toFixed(2));
      particle.setAttribute('data-sy', scatterY.toFixed(2));
      particle.setAttribute('data-cx', curveX.toFixed(2));
      particle.setAttribute('data-cy', curveY.toFixed(2));
      particle.setAttribute('data-rot', rot.toFixed(2));
      particle.setAttribute('data-scale', startScale.toFixed(3));
      particle.style.transform = 'translate(' + scatterX.toFixed(2) + 'px,' + scatterY.toFixed(2) + 'px) scale(' + startScale.toFixed(3) + ') rotate(' + rot.toFixed(2) + 'deg)';
      layer.appendChild(particle);
    }

    var particles = layer.querySelectorAll('.ptf-particle');
    var entrance = SCENE_START + 0.10;
    var converge = entrance + assemblyDur * 0.55;

    // Phase 1: scatter → curve waypoint (broad swirl)
    master.fromTo(particles,
      {
        x: function (_i, el) { return parseFloat(el.getAttribute('data-sx')) || 0; },
        y: function (_i, el) { return parseFloat(el.getAttribute('data-sy')) || 0; },
        rotation: function (_i, el) { return parseFloat(el.getAttribute('data-rot')) || 0; },
        scale: function (_i, el) { return parseFloat(el.getAttribute('data-scale')) || 0.5; },
        autoAlpha: 0,
        filter: 'blur(8px)'
      },
      {
        x: function (_i, el) { return parseFloat(el.getAttribute('data-cx')) || 0; },
        y: function (_i, el) { return parseFloat(el.getAttribute('data-cy')) || 0; },
        rotation: function (_i, el) { return (parseFloat(el.getAttribute('data-rot')) || 0) * 0.25; },
        scale: 1.05,
        autoAlpha: 0.85,
        filter: 'blur(2px)',
        duration: assemblyDur * 0.55,
        ease: 'power2.out',
        stagger: { each: Math.min(0.0035, assemblyDur / 320) }
      },
      entrance);

    // Phase 2: curve waypoint → text target (settle into letter shape)
    master.to(particles, {
      x: 0, y: 0,
      rotation: 0,
      scale: 1,
      autoAlpha: 1,
      filter: 'blur(0px)',
      duration: assemblyDur * 0.42,
      ease: 'power3.out',
      stagger: { each: Math.min(0.003, assemblyDur / 360) }
    }, converge);

    // Phase 3: subtle continuous shimmer (very gentle scale breathing)
    var shimmerStart = entrance + assemblyDur + 0.2;
    var holdLen = Math.max(0.5, SCENE_DURATION - (shimmerStart - SCENE_START) - 0.4);
    if (holdLen > 0.6) {
      master.to(particles, {
        scale: 1.06,
        duration: holdLen * 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
        stagger: { each: 0.001, from: 'random' }
      }, shimmerStart);
    }

    // Tagline reveal AFTER text forms
    if (tagline) {
      master.fromTo(tagline,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' },
        converge + assemblyDur * 0.4);
    }
  }, [], SCENE_START + 0.01);

  // Final fade out at scene end
  master.to(scope + '.ptf-particle-layer', {
    autoAlpha: 0.92,
    duration: 0.4,
    ease: 'power2.in'
  }, SCENE_START + SCENE_DURATION - 0.4);
})();
