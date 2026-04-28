master.fromTo('.scene-' + SCENE_ID + ' .ac-text',
  { opacity: 0, y: 12 },
  { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
  SCENE_START + 0.1);

master.to('.scene-' + SCENE_ID + ' .ac-text',
  { opacity: 0, y: -8, duration: 0.3, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.3);
