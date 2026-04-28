// Quote — staggered reveal of quotation mark, text, attribution
master.fromTo('.scene-' + SCENE_ID + ' .qt-mark',
  { opacity: 0, scale: 0.6 },
  { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)' },
  SCENE_START + 0.2);

master.fromTo('.scene-' + SCENE_ID + ' .qt-text',
  { opacity: 0, y: 24 },
  { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
  SCENE_START + 0.6);

master.fromTo('.scene-' + SCENE_ID + ' .qt-attr',
  { opacity: 0, y: 16 },
  { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 1.4);

master.to('.scene-' + SCENE_ID + ' .qt-inner',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
