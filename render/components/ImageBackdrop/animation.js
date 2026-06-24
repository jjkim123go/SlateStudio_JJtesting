// ImageBackdrop — full-bleed CSS background image (no <img>, so the producer
// does NOT pillarbox it) with a slow Ken-Burns push and a fade-up caption.
// The continuous transform keeps the frame moving (anti-freeze) for headless
// capture. All tweens registered on `master` (Standing Rule #16).
(function () {
  if (typeof master === 'undefined') return;
  var S = '.scene-' + SCENE_ID;

  // Slow Ken-Burns push + drift across the whole scene (continuous motion).
  master.fromTo(S + ' .ib-img',
    { scale: 1.05, xPercent: -1.5, yPercent: -1 },
    { scale: 1.12, xPercent: 1.5, yPercent: 1, duration: Math.max(6, SCENE_DURATION),
      ease: 'sine.inOut' },
    SCENE_START);

  // Caption fade-up.
  master.fromTo(S + ' .ib-kicker',
    { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    SCENE_START + 0.4);
  master.fromTo(S + ' .ib-title',
    { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' },
    SCENE_START + 0.6);
  master.fromTo(S + ' .ib-sub',
    { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' },
    SCENE_START + 0.95);

  // Scene fade-out.
  master.to(S + ' .ib-root',
    { autoAlpha: 0, duration: 0.5, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.5);
})();
