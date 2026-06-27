// Intent: glass - clean, precise Azure DevOps walkthrough surface.
(function () {
  if (typeof gsap === 'undefined') return;
  if (typeof master === 'undefined') return;
  if (typeof SCENE_START === 'undefined' || typeof SCENE_DURATION === 'undefined') return;

  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' [data-scene-component="AzureDevOpsScene"]');
  if (!root) return;

  var MAT = {
    enter: { duration: 0.4, ease: 'power2.out' },
    exit: { duration: 0.28, ease: 'power2.in' },
    stagger: 0.08,
    distance: 20
  };

  var windowEl = root.querySelector('.ado-window');
  var ambient = root.querySelector('.ado-ambient');
  var topbar = root.querySelector('.ado-topbar');
  var sidebar = root.querySelector('.ado-sidebar');
  var header = root.querySelector('.ado-page-head');
  var cards = root.querySelectorAll('.ado-card, .ado-comment-bubble');
  var rows = root.querySelectorAll('.ado-row, .ado-tree-row, .ado-code-row, .ado-diff-row, .ado-check-row, .ado-reviewer, .ado-activity, .ado-recommendations li');
  var callouts = root.querySelectorAll('.ado-callout, .ado-status, .ado-pill');

  gsap.set(windowEl, { autoAlpha: 0, y: 18, scale: 0.988, transformOrigin: 'center center' });
  gsap.set([topbar, sidebar, header], { autoAlpha: 0, y: MAT.distance });
  gsap.set(cards, { autoAlpha: 0, y: MAT.distance, scale: 0.992, transformOrigin: 'center top' });
  gsap.set(rows, { autoAlpha: 0, y: 8 });
  gsap.set(callouts, { autoAlpha: 0, y: 8 });

  if (ambient) {
    master.fromTo(ambient,
      { autoAlpha: 0.36, x: -10, y: 8 },
      { autoAlpha: 0.58, x: 10, y: -6, duration: Math.max(2, SCENE_DURATION - 0.5), ease: 'sine.inOut' },
      SCENE_START + 0.05);
  }

  master.to(windowEl,
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' },
    SCENE_START + 0.12);

  master.to(topbar,
    { autoAlpha: 1, y: 0, duration: MAT.enter.duration, ease: MAT.enter.ease },
    SCENE_START + 0.28);

  master.to(sidebar,
    { autoAlpha: 1, y: 0, duration: MAT.enter.duration, ease: MAT.enter.ease },
    SCENE_START + 0.40);

  master.to(header,
    { autoAlpha: 1, y: 0, duration: MAT.enter.duration, ease: MAT.enter.ease },
    SCENE_START + 0.52);

  if (cards.length) {
    master.to(cards,
      { autoAlpha: 1, y: 0, scale: 1, duration: MAT.enter.duration, ease: MAT.enter.ease, stagger: MAT.stagger },
      SCENE_START + 0.76);
  }

  if (rows.length) {
    master.to(rows,
      { autoAlpha: 1, y: 0, duration: 0.28, ease: MAT.enter.ease, stagger: Math.min(0.055, MAT.stagger) },
      SCENE_START + 1.02);
  }

  if (callouts.length) {
    master.to(callouts,
      { autoAlpha: 1, y: 0, duration: 0.3, ease: MAT.enter.ease, stagger: 0.05 },
      SCENE_START + 1.22);
  }

  master.to(windowEl,
    { autoAlpha: 0, y: -8, scale: 0.994, duration: MAT.exit.duration, ease: MAT.exit.ease },
    SCENE_START + Math.max(0.6, SCENE_DURATION - 0.36));
})();