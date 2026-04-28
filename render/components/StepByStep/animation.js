// StepByStep — title fades in, then each card reveals with stagger
(function () {
  var S = '.scene-' + SCENE_ID;

  master.fromTo(S + ' .sbs-title',
    { autoAlpha: 0, y: -20 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    SCENE_START + 0.2);

  var cards = document.querySelectorAll(S + ' .sbs-step');
  var count = Math.max(cards.length, 1);
  var staggerEach = Math.min(0.35, (SCENE_DURATION - 2.0) / count);

  master.fromTo(S + ' .sbs-step',
    { autoAlpha: 0, y: 40 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: { each: staggerEach, from: 'start' } },
    SCENE_START + 0.7);

  master.fromTo(S + ' .sbs-num',
    { autoAlpha: 0, scale: 0.5 },
    { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)', stagger: { each: staggerEach, from: 'start' } },
    SCENE_START + 0.85);

  master.to(S + ' .sbs-list, ' + S + ' .sbs-title',
    { autoAlpha: 0, duration: 0.4, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.5);
})();
