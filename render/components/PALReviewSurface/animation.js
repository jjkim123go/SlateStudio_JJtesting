// Intent: glass - precise executive product demo with sustained PR-review momentum.
(function () {
  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' .pal-root');
  if (!root || typeof master === 'undefined') return;

  var mode = (root.getAttribute('data-mode') || 'pr-detection').toLowerCase();
  var D = Math.max(4, SCENE_DURATION);
  var MAT = { enter: { duration: 0.4, ease: 'power2.out' }, exit: { duration: 0.28, ease: 'power2.in' }, stagger: 0.08, distance: 20 };
  var active = S + ' [data-modes~="' + mode + '"]';

  function at(pct) { return SCENE_START + Math.min(D - 0.7, Math.max(0, D * pct)); }
  function show(sel, pos, from, to) {
    master.fromTo(sel,
      Object.assign({ autoAlpha: 0, y: MAT.distance, scale: 0.985 }, from || {}),
      Object.assign({ autoAlpha: 1, y: 0, scale: 1, duration: MAT.enter.duration, ease: MAT.enter.ease }, to || {}),
      pos);
  }

  master.set(S + ' [data-modes]', { autoAlpha: 0 }, SCENE_START);
  master.set(active, { autoAlpha: 1 }, SCENE_START);
  master.fromTo(S + ' .pal-stage',
    { autoAlpha: 0, y: 34, scale: 0.965, rotationX: 6, rotationY: -9 },
    { autoAlpha: 1, y: 0, scale: 1, rotationX: 4, rotationY: -6, duration: 0.75, ease: 'power2.out' },
    SCENE_START + 0.08);
  master.to(S + ' .pal-stage',
    { rotationY: mode === 'impact-comment' ? 4 : -2, rotationX: 2, scale: 1.018, duration: D * 0.78, ease: 'sine.inOut' },
    SCENE_START + 0.78);
  master.fromTo(S + ' .pal-aurora',
    { x: -24, y: 12, rotation: -4, autoAlpha: 0.72 },
    { x: 28, y: -14, rotation: 4, autoAlpha: 0.95, duration: D * 0.88, ease: 'sine.inOut' },
    SCENE_START);
  master.fromTo(S + ' .pal-orb-a',
    { x: 0, y: 0, scale: 0.98 },
    { x: -38, y: 24, scale: 1.04, duration: D * 0.82, ease: 'sine.inOut' },
    SCENE_START + 0.2);
  master.fromTo(S + ' .pal-orb-b',
    { x: 0, y: 0, scale: 1.02 },
    { x: 32, y: -22, scale: 0.97, duration: D * 0.82, ease: 'sine.inOut' },
    SCENE_START + 0.2);

  show(active + ' .pal-eyebrow', at(0.05), { y: 10 });
  show(active + ' .pal-title', at(0.075), { y: 18 });
  show(active + ' .pal-subtitle', at(0.105), { y: 14 });
  show(active + ' .pal-status', at(0.13), { x: 18, y: 0, scale: 0.97 });

  if (mode === 'pr-detection') {
    show(S + ' .pal-pr-card', at(0.18), { x: -28, rotationY: 5 });
    show(S + ' .pal-scan-card', at(0.24), { x: 28, rotationY: -5 });
    master.fromTo(S + ' .pal-file-row',
      { autoAlpha: 0, y: 18, scale: 0.97 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power2.out', stagger: Math.min(0.42, D * 0.035) },
      at(0.30));
    master.fromTo(S + ' .pal-step',
      { autoAlpha: 0, x: 24 },
      { autoAlpha: 1, x: 0, duration: 0.42, ease: 'power2.out', stagger: Math.min(0.64, D * 0.06) },
      at(0.44));
    master.fromTo(S + ' .pal-scanbar',
      { xPercent: -60, autoAlpha: 0 },
      { xPercent: 520, autoAlpha: 1, duration: D * 0.40, ease: 'power1.inOut' },
      at(0.34));
    show(S + ' .pal-map-strip', at(0.67), { y: 18, scale: 0.96 });
    master.fromTo(S + ' .pal-map-node, ' + S + ' .pal-arrow',
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out', stagger: 0.08 },
      at(0.71));
  } else if (mode === 'impact-comment') {
    show(S + ' .pal-comment', at(0.15), { x: -26, rotationY: 4 });
    show(S + ' .pal-reviewers', at(0.20), { x: 26, rotationY: -4 });
    master.fromTo(S + ' .pal-md h3, ' + S + ' .pal-md p',
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power2.out', stagger: 0.18 },
      at(0.25));
    master.fromTo(S + ' .pal-impact-table thead',
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' },
      at(0.33));
    master.fromTo(S + ' .pal-impact-row',
      { autoAlpha: 0, y: 18, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.46, ease: 'power2.out', stagger: Math.min(1.1, D * 0.065) },
      at(0.39));
    master.fromTo(S + ' .pal-owner',
      { autoAlpha: 0.28, scale: 0.92 },
      { autoAlpha: 1, scale: 1, duration: 0.32, ease: 'power2.out', stagger: 0.06 },
      at(0.58));
    master.fromTo(S + ' .pal-reviewer',
      { autoAlpha: 0, x: 34, scale: 0.95 },
      { autoAlpha: 1, x: 0, scale: 1, duration: 0.46, ease: 'power2.out', stagger: Math.min(0.9, D * 0.055) },
      at(0.68));
    show(S + ' .pal-no-page', at(0.84), { y: 20, scale: 0.96 });
  } else if (mode === 'monitoring-report') {
    show(S + ' .pal-report-grid', at(0.15), { y: 26, scale: 0.98 });
    master.fromTo(S + ' .pal-kpi',
      { autoAlpha: 0, y: 18, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: 'power2.out', stagger: Math.min(0.18, D * 0.025) },
      at(0.21));
    master.fromTo(S + ' .pal-kpi-num',
      { y: 14, clipPath: 'inset(0 100% 0 0)' },
      { y: 0, clipPath: 'inset(0 0% 0 0)', duration: Math.min(1.2, D * 0.16), ease: 'power1.out', stagger: Math.min(0.12, D * 0.018) },
      at(0.26));
    master.fromTo(S + ' .pal-report-card',
      { autoAlpha: 0, y: 22, scale: 0.975 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power2.out', stagger: 0.15 },
      at(0.46));
    master.fromTo(S + ' .pal-report-row',
      { autoAlpha: 0, x: -18 },
      { autoAlpha: 1, x: 0, duration: 0.34, ease: 'power2.out', stagger: Math.min(0.16, D * 0.025) },
      at(0.56));
    master.fromTo(S + ' .pal-repo-pill',
      { autoAlpha: 0, y: 10, scale: 0.94 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.30, ease: 'power2.out', stagger: Math.min(0.08, D * 0.012) },
      at(0.64));
  }

  master.to(S + ' .pal-browser',
    { autoAlpha: 0, y: -18, scale: 0.985, duration: MAT.exit.duration, ease: MAT.exit.ease },
    SCENE_START + SCENE_DURATION - 0.42);
})();
