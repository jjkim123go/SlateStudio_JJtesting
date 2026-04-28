/* GitHubScene animation — minimal fade-in (PR 10e Wave A).
 * Standing Rule #12/#13: synchronous DOM, no setTimeout/await, no ticker.
 */
(function () {
  if (typeof gsap === 'undefined') return;
  if (typeof SCENE_START === 'undefined') return;
  if (typeof SCENE_DURATION === 'undefined') return;

  var sceneSel = '.scene-' + SCENE_ID + ' ';
  var window$ = document.querySelector(sceneSel + '[data-scene-component="GitHubScene"] .gh-window');
  if (!window$) return;

  if (typeof master === 'undefined') return;

  gsap.set(window$, { opacity: 0, y: 16, scale: 0.985, transformOrigin: 'center center' });

  master.to(window$, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.55,
    ease: 'power3.out'
  }, SCENE_START + 0.15);

  master.to(window$, {
    opacity: 0,
    duration: 0.5,
    ease: 'power2.inOut'
  }, SCENE_START + Math.max(0.5, SCENE_DURATION - 0.5));

  var steps = document.querySelectorAll(sceneSel + '.gh-step');
  var cursor = SCENE_START + 0.55;

  steps.forEach(function (step) {
    var kind = step.getAttribute('data-kind') || 'comment';
    var dur = parseFloat(step.getAttribute('data-duration') || '0.6') || 0.6;

    if (kind === 'pause') {
      cursor += dur;
      return;
    }

    if (kind === 'merge' || kind === 'pill') {
      master.fromTo(step,
        { opacity: 0, scale: 0.92, transformOrigin: 'left center' },
        { opacity: 1, scale: 1, duration: Math.min(0.35, dur), ease: 'back.out(1.4)' },
        cursor);
      cursor += dur + 0.08;
      return;
    }

    master.fromTo(step,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: Math.min(0.3, dur), ease: 'power2.out' },
      cursor);

    if (kind === 'actions_run' || kind === 'commit_history') {
      var rowSelector = kind === 'actions_run' ? '.gh-check-row' : '.gh-commit-row';
      var rows = step.querySelectorAll(rowSelector);
      if (rows.length) {
        gsap.set(rows, { opacity: 0, y: 4 });
        master.to(rows, {
          opacity: 1,
          y: 0,
          duration: 0.18,
          ease: 'power2.out',
          stagger: kind === 'actions_run' ? 0.18 : 0.14
        }, cursor + 0.12);
      }
    }

    cursor += dur + 0.08;
  });
})();
