// ExpandableCardGrid — cards reveal, then each card expands into focus in turn
// (active card scales up + reveals detail; siblings dim back). Continuous
// background orb drift keeps the frame alive (anti-freeze) for deterministic
// headless capture. All tweens are registered on `master` (Standing Rule #16).
(function () {
  if (typeof master === 'undefined') return;
  var S = '.scene-' + SCENE_ID;

  var cards = document.querySelectorAll(S + ' .ecg-card');
  var n = Math.max(cards.length, 1);

  // --- Title + subtitle ---
  master.fromTo(S + ' .ecg-title',
    { autoAlpha: 0, y: -24 },
    { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' },
    SCENE_START + 0.2);
  master.fromTo(S + ' .ecg-sub',
    { autoAlpha: 0, y: -14 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    SCENE_START + 0.5);

  // --- Continuous background orb drift (whole-frame motion → no frozen frames) ---
  master.fromTo(S + ' .ecg-orb-a',
    { xPercent: -8, yPercent: -6 },
    { xPercent: 10, yPercent: 8, duration: Math.max(6, SCENE_DURATION * 0.55),
      ease: 'sine.inOut', repeat: -1, yoyo: true },
    SCENE_START);
  master.fromTo(S + ' .ecg-orb-b',
    { xPercent: 7, yPercent: 5 },
    { xPercent: -10, yPercent: -8, duration: Math.max(7, SCENE_DURATION * 0.62),
      ease: 'sine.inOut', repeat: -1, yoyo: true },
    SCENE_START + 0.4);

  // --- Reveal all cards (settle at a dimmed rest state) ---
  var revealStart = SCENE_START + 0.7;
  var revealStagger = Math.min(0.22, 1.1 / n);
  master.fromTo(S + ' .ecg-card',
    { autoAlpha: 0, y: 40, scale: 0.93 },
    { autoAlpha: 0.5, y: 0, scale: 0.95, duration: 0.55, ease: 'power2.out',
      stagger: { each: revealStagger, from: 'start' } },
    revealStart);

  // --- Focus sequence: each card expands into the screen in turn ---
  var focusStart = revealStart + 0.55 + revealStagger * n + 0.25;
  var focusEnd = SCENE_START + SCENE_DURATION - 0.8;
  var win = Math.max(2.0, (focusEnd - focusStart) / n);

  for (var i = 0; i < n; i++) {
    var t = focusStart + i * win;
    var active = S + ' .ecg-card[data-card-index="' + i + '"]';

    // Reset every card to the dimmed rest state, hide every detail.
    master.to(S + ' .ecg-card',
      { autoAlpha: 0.42, scale: 0.95, duration: 0.4, ease: 'power2.inOut' }, t);
    master.to(S + ' .ecg-card-glow',
      { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, t);
    master.to(S + ' .ecg-detail',
      { autoAlpha: 0, y: 10, duration: 0.3, ease: 'power2.in' }, t);

    // Raise the active card forward and reveal its detail.
    master.to(active,
      { autoAlpha: 1, scale: 1.085, duration: 0.55, ease: 'back.out(1.5)' }, t + 0.06);
    master.to(active + ' .ecg-card-glow',
      { autoAlpha: 1, duration: 0.55, ease: 'power2.out' }, t + 0.1);
    master.fromTo(active + ' .ecg-detail',
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, t + 0.2);
  }

  // Hold the last card lifted through the tail, then fade the whole scene out.
  master.to(S + ' .ecg-root',
    { autoAlpha: 0, duration: 0.5, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.5);
})();
