// CompareSlider — title + headers fade in, then comparison rows stagger in
(function () {
  var S = '.scene-' + SCENE_ID;

  master.fromTo(S + ' .cs-title',
    { autoAlpha: 0, y: -20 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    SCENE_START + 0.2);

  master.fromTo(S + ' .cs-headers',
    { autoAlpha: 0, y: 16 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.6);

  var rows = document.querySelectorAll(S + ' .cs-row');
  var count = Math.max(rows.length, 1);
  var staggerEach = Math.min(0.35, (SCENE_DURATION - 2.2) / count);

  master.fromTo(S + ' .cs-row',
    { autoAlpha: 0, y: 36 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: { each: staggerEach, from: 'start' } },
    SCENE_START + 0.9);

  master.to(S + ' .cs-rows, ' + S + ' .cs-title, ' + S + ' .cs-headers',
    { autoAlpha: 0, duration: 0.4, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.5);
})();
