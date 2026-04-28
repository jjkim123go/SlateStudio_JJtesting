// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  var scope = '.scene-' + SCENE_ID + ' ';
  var rootSel = scope + '.gp-root';

  master.call(function () {
    var sceneRoot = document.querySelector('.scene-' + SCENE_ID);
    var root = document.querySelector(rootSel);
    if (!sceneRoot || !root) return;

    var channels = root.querySelectorAll('.gp-shell');
    channels.forEach(function (shell) { shell.innerHTML = ''; });

    Array.prototype.slice.call(sceneRoot.children).forEach(function (child) {
      if (child === root) return;
      if (child.classList && child.classList.contains('gp-root')) return;
      channels.forEach(function (shell, idx) {
        var clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.style.pointerEvents = 'none';
        clone.style.userSelect = 'none';
        clone.style.transform = 'translateZ(0)';
        clone.style.filter = idx === 0
          ? 'grayscale(1) contrast(1.45) brightness(1.35)'
          : 'grayscale(1) contrast(1.6) brightness(1.5)';
        shell.appendChild(clone);
      });
    });
  }, [], SCENE_START + 0.02);

  var root = document.querySelector(rootSel);
  var intensityKey = root ? ((root.getAttribute('data-gp-intensity') || 'medium').toLowerCase()) : 'medium';
  var map = {
    low: { duration: 0.42, shift: 6, noise: 0.24, scan: 0.42 },
    medium: { duration: 0.5, shift: 10, noise: 0.34, scan: 0.54 },
    high: { duration: 0.58, shift: 15, noise: 0.46, scan: 0.68 }
  };
  var cfg = map[intensityKey] || map.medium;
  var effectDuration = Math.min(cfg.duration, Math.max(0.28, SCENE_DURATION - 0.12));
  var trigger = SCENE_START + Math.min(Math.max(parseFloat('{{triggerSec}}') || 0.3, 0), Math.max(0.02, SCENE_DURATION - effectDuration - 0.02));
  var clearAt = trigger + effectDuration;

  master.set(rootSel, { autoAlpha: 0 }, SCENE_START);
  master.set(scope + '.gp-channel, ' + scope + '.gp-noise, ' + scope + '.gp-scan, ' + scope + '.gp-scanlines', { autoAlpha: 0 }, SCENE_START);

  master.to(rootSel, { autoAlpha: 1, duration: 0.04, ease: 'power1.out' }, trigger);

  master.fromTo(scope + '.gp-channel--base',
    { autoAlpha: 0, x: 0, filter: 'contrast(1) saturate(1)' },
    { autoAlpha: 0.32, x: 0, filter: 'contrast(1.45) saturate(1.3)', duration: effectDuration * 0.18, ease: 'power2.out' },
    trigger);

  master.fromTo(scope + '.gp-channel--c1',
    { autoAlpha: 0, x: 0, clipPath: 'inset(0 0 0 0)' },
    { autoAlpha: 0.72, x: -cfg.shift, clipPath: 'inset(4% 0 3% 0)', duration: effectDuration * 0.2, ease: 'power1.out' },
    trigger);
  master.to(scope + '.gp-channel--c1',
    { autoAlpha: 0.24, x: -cfg.shift * 0.25, clipPath: 'inset(0 0 0 0)', duration: effectDuration * 0.32, ease: 'power1.inOut' },
    trigger + effectDuration * 0.24);
  master.to(scope + '.gp-channel--c1',
    { autoAlpha: 0, x: 0, duration: effectDuration * 0.18, ease: 'power2.in' },
    clearAt - effectDuration * 0.18);

  master.fromTo(scope + '.gp-channel--c2',
    { autoAlpha: 0, x: 0, clipPath: 'inset(0 0 0 0)' },
    { autoAlpha: 0.72, x: cfg.shift, clipPath: 'inset(2% 0 6% 0)', duration: effectDuration * 0.2, ease: 'power1.out' },
    trigger + 0.015);
  master.to(scope + '.gp-channel--c2',
    { autoAlpha: 0.22, x: cfg.shift * 0.3, clipPath: 'inset(0 0 0 0)', duration: effectDuration * 0.32, ease: 'power1.inOut' },
    trigger + effectDuration * 0.24);
  master.to(scope + '.gp-channel--c2',
    { autoAlpha: 0, x: 0, duration: effectDuration * 0.18, ease: 'power2.in' },
    clearAt - effectDuration * 0.18);

  master.fromTo(scope + '.gp-noise',
    { autoAlpha: 0, x: -18, y: -12, filter: 'contrast(1.2) saturate(1.2)' },
    { autoAlpha: cfg.noise, x: 10, y: 8, filter: 'contrast(1.65) saturate(1.55)', duration: effectDuration * 0.18, ease: 'power1.out' },
    trigger);
  master.to(scope + '.gp-noise',
    { autoAlpha: cfg.noise * 0.72, x: -8, y: 6, clipPath: 'inset(14% 0 18% 0)', duration: effectDuration * 0.18, ease: 'none' },
    trigger + effectDuration * 0.18);
  master.to(scope + '.gp-noise',
    { autoAlpha: 0, x: 0, y: 0, clipPath: 'inset(0 0 0 0)', duration: effectDuration * 0.2, ease: 'power2.in' },
    clearAt - effectDuration * 0.2);

  master.fromTo(scope + '.gp-scan',
    { autoAlpha: 0, yPercent: -120, scaleY: 0.22, filter: 'blur(8px)' },
    { autoAlpha: cfg.scan, yPercent: 120, scaleY: 0.42, filter: 'blur(2px)', duration: effectDuration * 0.44, ease: 'power1.inOut' },
    trigger + effectDuration * 0.08);
  master.to(scope + '.gp-scan', { autoAlpha: 0, duration: effectDuration * 0.1, ease: 'power1.in' }, clearAt - effectDuration * 0.08);

  master.fromTo(scope + '.gp-scanlines',
    { autoAlpha: 0, y: -6 },
    { autoAlpha: 0.16, y: 0, duration: effectDuration * 0.12, ease: 'power1.out' },
    trigger);
  master.to(scope + '.gp-scanlines',
    { autoAlpha: 0, duration: effectDuration * 0.14, ease: 'power2.in' },
    clearAt - effectDuration * 0.14);

  master.to(scope + '.gp-channel--base',
    { autoAlpha: 0, filter: 'contrast(1) saturate(1)', duration: effectDuration * 0.16, ease: 'power2.in' },
    clearAt - effectDuration * 0.16);
  master.to(rootSel, { autoAlpha: 0, duration: 0.05, ease: 'power1.in' }, clearAt - 0.02);
})();
