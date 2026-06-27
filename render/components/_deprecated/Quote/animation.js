// Quote — staggered reveal of quotation mark, text, attribution
master.fromTo('.scene-' + SCENE_ID + ' .qt-mark',
  { opacity: 0, scale: 0.6 },
  { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)' },
  SCENE_START + 0.2);

master.fromTo('.scene-' + SCENE_ID + ' .qt-text',
  { opacity: 0, y: 24 },
  { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
  SCENE_START + 0.6);

master.fromTo('.scene-' + SCENE_ID + ' .qt-rule',
  { opacity: 0, scaleX: 0 },
  { opacity: 1, scaleX: 1, duration: 0.5, ease: 'power2.out', transformOrigin: 'center center' },
  SCENE_START + 1.1);

master.fromTo('.scene-' + SCENE_ID + ' .qt-attr',
  { opacity: 0, y: 16 },
  { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 1.5);

master.to('.scene-' + SCENE_ID + ' .qt-inner',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);

// Continuous background drift (anti-freeze) — orbs slowly roam for the whole beat
master.fromTo('.scene-' + SCENE_ID + ' .qt-orb-a',
  { xPercent: 0, yPercent: 0, scale: 1 },
  { xPercent: 14, yPercent: 10, scale: 1.12, duration: SCENE_DURATION, ease: 'sine.inOut', repeat: -1, yoyo: true },
  SCENE_START);
master.fromTo('.scene-' + SCENE_ID + ' .qt-orb-b',
  { xPercent: 0, yPercent: 0, scale: 1.08 },
  { xPercent: -12, yPercent: -9, scale: 1, duration: SCENE_DURATION, ease: 'sine.inOut', repeat: -1, yoyo: true },
  SCENE_START);
// Subtle slow push on the quote block so the frame never sits still
master.fromTo('.scene-' + SCENE_ID + ' .qt-inner',
  { scale: 1 },
  { scale: 1.025, duration: Math.max(2, SCENE_DURATION - 0.5), ease: 'sine.inOut' },
  SCENE_START + 0.6);
