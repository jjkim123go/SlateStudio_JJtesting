// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION
// Intent: glass/liquid hybrid — premium motion showcase with visible, scene-specific physics.

(function () {
  var scope = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(scope + '.pms-root');
  if (!root) return;

  var mode = (root.getAttribute('data-pms-mode') || 'hero').toLowerCase();
  var stage = root.querySelector('.pms-dynamic');
  var particles = root.querySelector('.pms-particles');
  var palette = ['#ff44c9', '#00e5ff', '#f7c948', '#8b5cf6', '#3ddc97', '#ff6b6b'];

  function seeded(i) {
    return ((i * 9301 + 49297) % 233280) / 233280;
  }

  function el(className, parent, text) {
    var node = document.createElement('div');
    node.className = className;
    if (text !== undefined) node.textContent = text;
    (parent || stage).appendChild(node);
    return node;
  }

  function px(value) {
    return Math.round(value) + 'px';
  }

  function colorVars(node, index) {
    node.style.setProperty('--pms-a', palette[index % palette.length]);
    node.style.setProperty('--pms-b', palette[(index + 2) % palette.length]);
    node.style.color = palette[index % palette.length];
  }

  for (var i = 0; i < 92; i += 1) {
    var dot = el('pms-dot', particles);
    dot.style.left = px(40 + seeded(i * 3 + 1) * 1840);
    dot.style.top = px(24 + seeded(i * 5 + 2) * 1030);
    dot.style.width = px(2 + seeded(i * 7 + 3) * 7);
    dot.style.height = dot.style.width;
    dot.style.color = palette[i % palette.length];
    dot.style.opacity = String(0.14 + seeded(i * 11 + 4) * 0.48);
  }

  function buildHero() {
    var card = el('pms-glass pms-logo-card');
    card.innerHTML = '<div class="pms-logo">Slate</div><div class="pms-tag">Every frame breathes.</div>';
    for (var i = 0; i < 10; i += 1) {
      var ring = el('pms-ring');
      var size = 240 + i * 82;
      ring.style.width = px(size);
      ring.style.height = px(size);
      ring.style.marginLeft = px(size / -2);
      ring.style.marginTop = px(size / -2);
      ring.style.color = palette[i % palette.length];
      ring.style.transform = 'rotateX(' + (62 + i * 2) + 'deg) rotateZ(' + (i * 18) + 'deg)';
    }
  }

  function buildAscii() {
    var chars = 'SLATE{}[]<>/\\0101MOTION';
    for (var i = 0; i < 150; i += 1) {
      var ch = el('pms-char', stage, chars.charAt(i % chars.length));
      ch.style.left = px(210 + (i % 25) * 58);
      ch.style.top = px(154 + Math.floor(i / 25) * 62);
      ch.setAttribute('data-rx', String((seeded(i * 3) - 0.5) * 1220));
      ch.setAttribute('data-ry', String((seeded(i * 5) - 0.5) * 760));
      ch.setAttribute('data-sx', String(Math.sin(i * 0.7) * 70));
      ch.setAttribute('data-sy', String(Math.cos(i * 0.55) * 48));
    }
  }

  function buildVortex() {
    for (var i = 0; i < 18; i += 1) {
      var ring = el('pms-ring');
      var size = 160 + i * 62;
      ring.style.width = px(size);
      ring.style.height = px(size);
      ring.style.marginLeft = px(size / -2);
      ring.style.marginTop = px(size / -2);
      ring.style.borderStyle = i % 2 ? 'dashed' : 'solid';
      ring.style.color = palette[i % palette.length];
      ring.style.transform = 'rotateX(68deg) rotateY(' + (i * 7) + 'deg) rotateZ(' + (i * 14) + 'deg)';
    }
    for (var j = 0; j < 34; j += 1) {
      var shard = el('pms-shard');
      colorVars(shard, j);
      shard.style.left = px(885 + Math.cos(j) * (140 + j * 8));
      shard.style.top = px(462 + Math.sin(j * 1.4) * (110 + j * 5));
      shard.style.width = px(24 + seeded(j) * 90);
      shard.style.height = px(12 + seeded(j * 2) * 72);
    }
  }

  function buildSpectrum() {
    for (var i = 0; i < 16; i += 1) {
      var shard = el('pms-shard');
      colorVars(shard, i);
      shard.style.left = px(160 + i * 112);
      shard.style.top = px(145 + (i % 4) * 132);
      shard.style.width = px(130 + (i % 3) * 52);
      shard.style.height = px(370);
      shard.style.borderRadius = '42px';
      shard.style.mixBlendMode = 'screen';
    }
  }

  function buildPulse() {
    for (var i = 0; i < 9; i += 1) {
      var panel = el('pms-glass pms-panel');
      panel.style.left = px(260 + (i % 3) * 420);
      panel.style.top = px(160 + Math.floor(i / 3) * 210);
      panel.style.width = '330px';
      panel.style.height = '150px';
      panel.style.borderRadius = '34px';
      panel.innerHTML = '<div style="font-size:54px;font-weight:900;margin:26px 28px 2px;color:' + palette[i % palette.length] + ';">' + (24 + i * 8) + '</div><div style="font-size:22px;margin-left:30px;color:#d9cdea;">motion signal</div>';
    }
  }

  function buildLiquid() {
    var tube = el('pms-tube');
    for (var i = 0; i < 5; i += 1) {
      var wave = el('pms-wave', tube);
      wave.style.top = px(28 + i * 42);
      wave.style.opacity = String(0.35 + i * 0.1);
    }
    for (var j = 0; j < 32; j += 1) {
      var drop = el('pms-drop');
      drop.style.left = px(150 + seeded(j * 3) * 1620);
      drop.style.top = px(270 + seeded(j * 5) * 340);
    }
  }

  function buildShapes() {
    for (var i = 0; i < 28; i += 1) {
      var shard = el('pms-shard');
      colorVars(shard, i);
      shard.style.left = px(210 + seeded(i * 2) * 1420);
      shard.style.top = px(130 + seeded(i * 4) * 610);
      shard.style.width = px(72 + seeded(i * 6) * 160);
      shard.style.height = px(72 + seeded(i * 8) * 160);
    }
  }

  function buildZoom() {
    el('pms-tunnel-gate');
    for (var i = 0; i < 18; i += 1) {
      var frame = el('pms-tunnel-frame');
      colorVars(frame, i);
      var scale = 0.2 + i * 0.105;
      frame.style.transform = 'translateZ(' + (-900 + i * 70) + 'px) scale(' + scale + ') rotateZ(' + (-4 + i * 0.55) + 'deg)';
      frame.setAttribute('data-depth', String(i));
    }
    for (var j = 0; j < 26; j += 1) {
      var streak = el('pms-tunnel-streak');
      colorVars(streak, j);
      streak.style.transform = 'rotate(' + (j * 360 / 26) + 'deg) translateX(115px)';
      streak.setAttribute('data-angle', String(j * 360 / 26));
    }
  }

  function buildGlitch() {
    el('pms-glitch-word base', stage, 'CONTROLLED\nCHAOS');
    el('pms-glitch-word cyan', stage, 'CONTROLLED\nCHAOS');
    el('pms-glitch-word magenta', stage, 'CONTROLLED\nCHAOS');
    el('pms-scan');
  }

  function buildOrbits() {
    var core = el('pms-glass pms-panel');
    core.style.left = '50%';
    core.style.top = '46%';
    core.style.width = '230px';
    core.style.height = '230px';
    core.style.margin = '-115px 0 0 -115px';
    core.style.borderRadius = '50%';
    for (var i = 0; i < 11; i += 1) {
      var ring = el('pms-ring');
      var size = 260 + i * 62;
      ring.style.width = px(size);
      ring.style.height = px(size * (0.42 + (i % 3) * 0.08));
      ring.style.marginLeft = px(size / -2);
      ring.style.marginTop = px(size * (0.42 + (i % 3) * 0.08) / -2);
      ring.style.color = palette[i % palette.length];
      ring.style.transform = 'rotateX(' + (58 + i * 3) + 'deg) rotateZ(' + (i * 16) + 'deg)';
      var dot = el('pms-orbit-dot', ring);
      dot.style.transform = 'translateX(' + px(size / 2) + ')';
    }
  }

  function buildHologram() {
    for (var i = 0; i < 8; i += 1) {
      var panel = el('pms-glass pms-panel');
      panel.style.left = px(260 + i * 170);
      panel.style.top = px(150 + (i % 2) * 190);
      panel.style.width = '310px';
      panel.style.height = '390px';
      panel.style.borderRadius = '42px';
      panel.style.transform = 'rotateY(' + (-34 + i * 10) + 'deg) rotateZ(' + (-6 + i) + 'deg)';
    }
  }

  function buildGallery() {
    for (var i = 0; i < 12; i += 1) {
      var card = el('pms-card');
      colorVars(card, i);
      card.style.left = px(180 + (i % 4) * 390);
      card.style.top = px(120 + Math.floor(i / 4) * 220);
    }
  }

  function buildReel() {
    var strip = el('pms-strip');
    for (var i = 0; i < 7; i += 1) {
      var frame = el('pms-frame', strip);
      colorVars(frame, i);
      frame.style.left = px(52 + i * 184);
    }
    for (var j = 0; j < 2; j += 1) {
      var reel = el('pms-ring');
      var size = 250;
      reel.style.width = px(size);
      reel.style.height = px(size);
      reel.style.marginLeft = '0';
      reel.style.marginTop = '0';
      reel.style.left = j === 0 ? '210px' : '1460px';
      reel.style.top = '240px';
      reel.style.color = palette[(j + 2) % palette.length];
    }
  }

  function buildChart() {
    var values = [42, 76, 118, 164, 226, 300];
    for (var i = 0; i < values.length; i += 1) {
      var bar = el('pms-bar');
      colorVars(bar, i);
      bar.style.left = px(430 + i * 176);
      bar.style.height = px(values[i]);
    }
  }

  function buildOutro() {
    buildHero();
  }

  var builders = {
    hero: buildHero,
    ascii: buildAscii,
    vortex: buildVortex,
    spectrum: buildSpectrum,
    pulse: buildPulse,
    liquid: buildLiquid,
    shapes: buildShapes,
    zoom: buildZoom,
    glitch: buildGlitch,
    orbits: buildOrbits,
    hologram: buildHologram,
    gallery: buildGallery,
    reel: buildReel,
    chart: buildChart,
    outro: buildOutro
  };
  (builders[mode] || buildHero)();

  var t = SCENE_START;
  var d = SCENE_DURATION;
  master.set(scope + '.pms-dynamic, ' + scope + '.pms-copy', { autoAlpha: 1 }, t);
  master.fromTo(scope + '.pms-aurora', { x: -90, y: 28, scale: 1.08 }, { x: 90, y: -26, scale: 1.18, duration: d, ease: 'sine.inOut' }, t);
  master.fromTo(scope + '.pms-dot', { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 0.7, scale: 1, duration: 1.1, ease: 'power2.out', stagger: { each: 0.006, from: 'random' } }, t + 0.06);
  master.to(scope + '.pms-dot', { x: function (i) { return Math.sin(i * 1.7) * 48; }, y: function (i) { return Math.cos(i * 1.1) * 36; }, duration: d - 0.2, ease: 'sine.inOut' }, t + 0.1);
  master.fromTo(scope + '.pms-eyebrow', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, t + 0.18);
  master.fromTo(scope + '.pms-title', { autoAlpha: 0, y: 42, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out' }, t + 0.3);
  master.fromTo(scope + '.pms-subtitle', { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, t + 0.78);

  if (mode === 'ascii') {
    master.fromTo(scope + '.pms-char',
      { x: function (_i, node) { return Number(node.getAttribute('data-rx')) || 0; }, y: function (_i, node) { return Number(node.getAttribute('data-ry')) || 0; }, rotation: function (i) { return i * 17; }, autoAlpha: 0, filter: 'blur(8px)' },
      { x: function (_i, node) { return Number(node.getAttribute('data-sx')) || 0; }, y: function (_i, node) { return Number(node.getAttribute('data-sy')) || 0; }, rotation: 0, autoAlpha: 0.92, filter: 'blur(0px)', duration: 1.8, ease: 'power3.out', stagger: { each: 0.006, from: 'random' } },
      t + 0.15);
    master.to(scope + '.pms-char', { x: 0, y: 0, rotation: function (i) { return (i % 5 - 2) * 4; }, duration: 2.1, ease: 'sine.inOut', stagger: { each: 0.004, from: 'center' } }, t + 2.15);
  } else if (mode === 'vortex') {
    master.fromTo(scope + '.pms-ring', { scale: 0.08, autoAlpha: 0, rotation: -120 }, { scale: 1, autoAlpha: 0.92, rotation: 260, duration: 1.7, ease: 'power3.out', stagger: 0.035 }, t + 0.06);
    master.to(scope + '.pms-ring', { rotation: function (i) { return i % 2 ? '-=420' : '+=520'; }, scale: function (i) { return 0.82 + i * 0.012; }, duration: d - 0.45, ease: 'none' }, t + 0.35);
    master.fromTo(scope + '.pms-shard', { scale: 0, autoAlpha: 0, rotation: -90 }, { scale: 1, autoAlpha: 0.8, rotation: 220, duration: 1.1, ease: 'power3.out', stagger: { each: 0.025, from: 'random' } }, t + 0.6);
    master.to(scope + '.pms-shard', { x: function (i) { return Math.cos(i) * -520; }, y: function (i) { return Math.sin(i * 1.4) * -330; }, rotation: '+=620', scale: 0.16, duration: d - 1.2, ease: 'power2.in' }, t + 1.1);
  } else if (mode === 'spectrum') {
    master.fromTo(scope + '.pms-shard', { autoAlpha: 0, y: 220, rotationY: -42, scaleY: 0.55 }, { autoAlpha: 0.86, y: 0, rotationY: 24, scaleY: 1, duration: 0.9, ease: 'power2.out', stagger: 0.045 }, t + 0.2);
    master.to(scope + '.pms-shard', { x: function (i) { return (i % 2 ? -1 : 1) * 90; }, rotationZ: function (i) { return -10 + i * 2; }, duration: d - 1.0, ease: 'sine.inOut' }, t + 1.0);
  } else if (mode === 'pulse') {
    master.fromTo(scope + '.pms-panel', { autoAlpha: 0, y: 80, scale: 0.72 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.5)', stagger: { each: 0.07, from: 'center' } }, t + 0.25);
    master.to(scope + '.pms-panel', { scale: function (i) { return i % 2 ? 1.08 : 0.96; }, duration: d - 1.5, ease: 'sine.inOut' }, t + 1.2);
  } else if (mode === 'liquid') {
    master.fromTo(scope + '.pms-tube', { autoAlpha: 0, scaleX: 0.28, filter: 'blur(12px)' }, { autoAlpha: 1, scaleX: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out' }, t + 0.2);
    master.fromTo(scope + '.pms-wave', { x: -260, y: function (i) { return Math.sin(i) * 20; } }, { x: 260, y: function (i) { return Math.cos(i) * 28; }, duration: d - 0.6, ease: 'sine.inOut', stagger: 0.08 }, t + 0.45);
    master.fromTo(scope + '.pms-drop', { autoAlpha: 0, x: -280, scale: 0.2 }, { autoAlpha: 0.88, x: 310, scale: 1, duration: 2.3, ease: 'power1.inOut', stagger: { each: 0.045, repeat: 1 } }, t + 0.7);
  } else if (mode === 'shapes') {
    master.fromTo(scope + '.pms-shard', { autoAlpha: 0, scale: 0, rotation: -180 }, { autoAlpha: 0.9, scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.4)', stagger: { each: 0.025, from: 'random' } }, t + 0.2);
    master.to(scope + '.pms-shard', { borderRadius: '50%', rotation: '+=180', x: function (i) { return Math.sin(i * 0.9) * 130; }, y: function (i) { return Math.cos(i * 0.7) * 88; }, duration: d - 1.2, ease: 'sine.inOut' }, t + 1.1);
  } else if (mode === 'zoom') {
    master.fromTo(scope + '.pms-tunnel-gate', { autoAlpha: 0, scale: 0.55, filter: 'blur(10px)' }, { autoAlpha: 0.82, scale: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out' }, t + 0.12);
    master.fromTo(scope + '.pms-tunnel-frame',
      { autoAlpha: 0, scale: 0.18, rotationZ: -9, z: -600, filter: 'blur(5px)' },
      { autoAlpha: 0.92, scale: function (i) { return 0.34 + i * 0.09; }, rotationZ: function (i) { return -4 + i * 0.55; }, z: 0, filter: 'blur(0px)', duration: 1.0, ease: 'power3.out', stagger: { each: 0.035, from: 'end' } },
      t + 0.2);
    master.to(scope + '.pms-tunnel-frame',
      { scale: function (i) { return 0.95 + i * 0.18; }, rotationZ: function (i) { return 7 + i * 1.1; }, z: 420, autoAlpha: function (i) { return i < 3 ? 0.18 : 0.82; }, duration: d - 1.0, ease: 'none' },
      t + 0.78);
    master.fromTo(scope + '.pms-tunnel-streak',
      { autoAlpha: 0, scaleX: 0.2, x: 0 },
      { autoAlpha: 0.74, scaleX: 1.3, x: 420, duration: 1.1, ease: 'power2.out', stagger: { each: 0.018, from: 'random' } },
      t + 0.45);
    master.to(scope + '.pms-tunnel-streak', { x: 820, scaleX: 2.1, autoAlpha: 0.28, duration: d - 1.4, ease: 'none' }, t + 1.1);
  } else if (mode === 'glitch') {
    master.fromTo(scope + '.pms-glitch-word', { autoAlpha: 0, y: 42, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power3.out', stagger: 0.035 }, t + 0.18);
    for (var g = 0; g < 8; g += 1) {
      master.to(scope + '.pms-glitch-word.cyan', { x: -24 - g * 2, skewX: -8, clipPath: 'inset(' + (g * 7 % 38) + '% 0 ' + (20 + g * 5 % 42) + '% 0)', duration: 0.08, ease: 'none' }, t + 0.9 + g * 0.42);
      master.to(scope + '.pms-glitch-word.magenta', { x: 24 + g * 2, skewX: 8, clipPath: 'inset(' + (12 + g * 4 % 42) + '% 0 ' + (g * 9 % 40) + '% 0)', duration: 0.08, ease: 'none' }, t + 0.94 + g * 0.42);
      master.to(scope + '.pms-glitch-word.cyan, ' + scope + '.pms-glitch-word.magenta', { x: 0, skewX: 0, clipPath: 'inset(0 0 0 0)', duration: 0.11, ease: 'power2.out' }, t + 1.02 + g * 0.42);
    }
    master.fromTo(scope + '.pms-scan', { autoAlpha: 0, y: -80 }, { autoAlpha: 0.42, y: 80, duration: d - 0.5, ease: 'none' }, t + 0.2);
  } else if (mode === 'orbits') {
    master.fromTo(scope + '.pms-panel', { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, t + 0.25);
    master.fromTo(scope + '.pms-ring', { autoAlpha: 0, scale: 0.35 }, { autoAlpha: 0.92, scale: 1, duration: 0.8, ease: 'power2.out', stagger: 0.04 }, t + 0.35);
    master.to(scope + '.pms-ring', { rotation: function (i) { return i % 2 ? '-=480' : '+=560'; }, duration: d - 0.6, ease: 'none' }, t + 0.5);
  } else if (mode === 'hologram') {
    master.fromTo(scope + '.pms-panel', { autoAlpha: 0, y: 150, rotationY: -60, filter: 'blur(12px)' }, { autoAlpha: 0.86, y: 0, rotationY: function (i) { return -34 + i * 10; }, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', stagger: 0.08 }, t + 0.25);
    master.to(scope + '.pms-panel', { y: function (i) { return i % 2 ? -34 : 34; }, rotationY: '+=20', duration: d - 1.0, ease: 'sine.inOut' }, t + 1.0);
  } else if (mode === 'gallery') {
    master.fromTo(scope + '.pms-card', { autoAlpha: 0, y: 180, rotationX: -48, scale: 0.76 }, { autoAlpha: 1, y: 0, rotationX: 0, scale: 1, duration: 0.72, ease: 'back.out(1.25)', stagger: { each: 0.055, from: 'center' } }, t + 0.2);
    master.to(scope + '.pms-card', { y: function (i) { return i % 2 ? -26 : 24; }, rotationZ: function (i) { return -3 + (i % 4) * 2; }, duration: d - 1.1, ease: 'sine.inOut' }, t + 1.0);
  } else if (mode === 'reel') {
    master.fromTo(scope + '.pms-strip', { autoAlpha: 0, rotationY: -62, scale: 0.76 }, { autoAlpha: 1, rotationY: 0, scale: 1, duration: 0.8, ease: 'power3.out' }, t + 0.24);
    master.fromTo(scope + '.pms-frame', { autoAlpha: 0, y: 80, rotationY: -90 }, { autoAlpha: 1, y: 0, rotationY: 0, duration: 0.5, ease: 'power2.out', stagger: 0.06 }, t + 0.55);
    master.fromTo(scope + '.pms-ring', { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 0.9, scale: 1, duration: 0.55, ease: 'power2.out', stagger: 0.08 }, t + 0.35);
    master.to(scope + '.pms-strip', { x: -230, rotationY: 18, duration: d - 1.1, ease: 'sine.inOut' }, t + 1.0);
    master.to(scope + '.pms-ring', { rotation: '+=720', duration: d - 0.8, ease: 'none' }, t + 0.7);
  } else if (mode === 'chart') {
    master.fromTo(scope + '.pms-bar', { autoAlpha: 0, scaleY: 0, y: 50 }, { autoAlpha: 1, scaleY: 1, y: 0, duration: 0.85, ease: 'back.out(1.15)', stagger: 0.12 }, t + 0.5);
    master.to(scope + '.pms-bar', { y: function (i) { return i % 2 ? -24 : -10; }, duration: d - 1.9, ease: 'sine.inOut' }, t + 1.55);
  } else {
    master.fromTo(scope + '.pms-glass, ' + scope + '.pms-ring', { autoAlpha: 0, scale: 0.72, filter: 'blur(18px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', stagger: 0.035 }, t + 0.2);
    master.to(scope + '.pms-ring', { rotation: function (i) { return i % 2 ? '-=360' : '+=420'; }, duration: d - 0.6, ease: 'none' }, t + 0.5);
  }

  master.to(scope + '.pms-copy', { autoAlpha: 0, y: -18, duration: 0.28, ease: 'power2.in' }, t + d - 0.38);
})();
