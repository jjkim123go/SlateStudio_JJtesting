// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  var scope = '.scene-' + SCENE_ID + ' ';
  var rootSel = scope + '.pa-root';
  var assemblyDuration = Math.min(Math.max(parseFloat('{{assemblyDuration}}') || 1.5, 0.5), Math.max(0.7, SCENE_DURATION - 0.35));
  var entranceStart = SCENE_START + Math.min(0.12, Math.max(0.03, SCENE_DURATION * 0.06));
  var finalStart = entranceStart + assemblyDuration * 0.62;

  function seeded(i) {
    return ((i * 9301 + 49297) % 233280) / 233280;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  master.call(function () {
    var root = document.querySelector(rootSel);
    if (!root) return;

    var layer = root.querySelector('.pa-particle-layer');
    var assembly = root.querySelector('.pa-assembly');
    var finalImg = root.querySelector('.pa-final');
    var fallback = root.querySelector('.pa-fallback');
    if (!layer || !assembly) return;

    layer.innerHTML = '';

    var count = parseInt(root.getAttribute('data-pa-particle-count'), 10);
    if (!count || count < 24) count = 200;
    count = clamp(count, 24, 360);

    var width = Math.max(assembly.clientWidth || 860, 320);
    var height = Math.max(assembly.clientHeight || 300, 180);
    var cols = Math.max(10, Math.round(Math.sqrt(count * (width / height))));
    var rows = Math.max(6, Math.ceil(count / cols));
    var cellW = width / cols;
    var cellH = height / rows;
    var imageSrc = root.getAttribute('data-pa-image-src') || '';
    var hasImage = !!(imageSrc && imageSrc.trim() && imageSrc.indexOf('{{') === -1);

    if (finalImg) {
      finalImg.style.display = hasImage ? 'block' : 'none';
    }
    if (fallback) {
      fallback.style.display = hasImage ? 'none' : 'flex';
    }

    for (var i = 0; i < count; i += 1) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var targetX = col * cellW + cellW * 0.5;
      var targetY = row * cellH + cellH * 0.5;
      var scatterX = (seeded(i * 3 + 11) - 0.5) * (width * 2.2 + 460);
      var scatterY = (seeded(i * 5 + 17) - 0.5) * (height * 2.1 + 420);
      var curveLift = (seeded(i * 7 + 19) - 0.5) * 180;
      var curveX = scatterX * 0.22 + curveLift * (seeded(i * 13 + 23) > 0.5 ? 1 : -1);
      var curveY = scatterY * 0.22 - curveLift;
      var scale = 0.22 + seeded(i * 11 + 29) * 1.35;
      var rotate = -170 + seeded(i * 17 + 31) * 340;
      var size = Math.max(3, Math.min(cellW, cellH) * (0.44 + seeded(i * 19 + 37) * 0.56));

      var particle = document.createElement('div');
      particle.className = 'pa-particle';
      particle.style.left = (targetX - size * 0.5) + 'px';
      particle.style.top = (targetY - size * 0.5) + 'px';
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.borderRadius = seeded(i * 23 + 41) > 0.22 ? '999px' : '4px';
      particle.style.opacity = '0';
      particle.setAttribute('data-scatter-x', scatterX.toFixed(3));
      particle.setAttribute('data-scatter-y', scatterY.toFixed(3));
      particle.setAttribute('data-curve-x', curveX.toFixed(3));
      particle.setAttribute('data-curve-y', curveY.toFixed(3));
      particle.setAttribute('data-rotate', rotate.toFixed(3));
      particle.setAttribute('data-scale', scale.toFixed(3));
      particle.style.transform = 'translate(' + scatterX.toFixed(3) + 'px,' + scatterY.toFixed(3) + 'px) scale(' + scale.toFixed(3) + ') rotate(' + rotate.toFixed(3) + 'deg)';
      layer.appendChild(particle);
    }

    var particles = layer.querySelectorAll('.pa-particle');
    master.fromTo(particles,
      {
        x: function (_i, el) { return parseFloat(el.getAttribute('data-scatter-x')) || 0; },
        y: function (_i, el) { return parseFloat(el.getAttribute('data-scatter-y')) || 0; },
        rotation: function (_i, el) { return parseFloat(el.getAttribute('data-rotate')) || 0; },
        scale: function (_i, el) { return parseFloat(el.getAttribute('data-scale')) || 0.6; },
        autoAlpha: 0,
        filter: 'blur(10px)'
      },
      {
        x: function (_i, el) { return parseFloat(el.getAttribute('data-curve-x')) || 0; },
        y: function (_i, el) { return parseFloat(el.getAttribute('data-curve-y')) || 0; },
        rotation: function (_i, el) {
          return (parseFloat(el.getAttribute('data-rotate')) || 0) * 0.18;
        },
        scale: 1.08,
        autoAlpha: 1,
        filter: 'blur(1.2px)',
        duration: assemblyDuration * 0.72,
        ease: 'power3.out',
        stagger: { each: Math.min(0.0035, assemblyDuration / 260) }
      },
      entranceStart);

    master.to(particles,
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: assemblyDuration * 0.28,
        ease: 'power2.out',
        stagger: { each: Math.min(0.0035, assemblyDuration / 260) }
      },
      entranceStart + assemblyDuration * 0.58);

    master.to(particles,
      {
        autoAlpha: 0.28,
        filter: 'blur(0px)',
        duration: Math.min(0.3, assemblyDuration * 0.22),
        ease: 'power2.out'
      },
      finalStart);
  }, [], SCENE_START + 0.01);

  master.fromTo(scope + '.pa-final',
    { autoAlpha: 0, scale: 0.985, filter: 'blur(8px)' },
    { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: Math.min(0.42, assemblyDuration * 0.38), ease: 'power2.out' },
    finalStart);

  master.fromTo(scope + '.pa-fallback',
    { autoAlpha: 0, scale: 0.94, filter: 'blur(8px)' },
    { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: Math.min(0.42, assemblyDuration * 0.38), ease: 'power2.out' },
    finalStart);
})();
