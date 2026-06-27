// CalloutPin — base fades, vignette focuses, pin drops, pulse rings, card slides in
(function () {
  var S = '.scene-' + SCENE_ID;

  master.to(S + ' .cp-base',
    { autoAlpha: 1, duration: 0.6, ease: 'power2.out' },
    SCENE_START + 0.1);

  master.to(S + ' .cp-vignette',
    { autoAlpha: 1, duration: 0.7, ease: 'power2.out' },
    SCENE_START + 0.5);

  master.fromTo(S + ' .cp-pin',
    { autoAlpha: 0, scale: 0.2, y: -40 },
    { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(2)' },
    SCENE_START + 0.9);

  // Finite pulse repeats — compute from remaining scene time
  var pulseRepeats = Math.max(1, Math.floor((SCENE_DURATION - 2.0) / 1.6) - 1);
  master.to(S + ' .cp-pulse',
    { scale: 3, autoAlpha: 0, duration: 1.6, ease: 'power2.out', repeat: pulseRepeats },
    SCENE_START + 1.4);

  master.fromTo(S + ' .cp-card',
    { autoAlpha: 0, x: -20 },
    { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power2.out' },
    SCENE_START + 1.5);

  master.to(S + ' .cp-card, ' + S + ' .cp-pin, ' + S + ' .cp-vignette',
    { autoAlpha: 0, duration: 0.5, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.5);
})();
