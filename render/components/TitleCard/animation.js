master.fromTo('.scene-' + SCENE_ID + ' .tc-title',
  { opacity: 0, y: 24, scale: 0.98 },
  { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' },
  SCENE_START + 0.2);

master.fromTo('.scene-' + SCENE_ID + ' .tc-subtitle',
  { opacity: 0, y: 16 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.7);

master.to('.scene-' + SCENE_ID + ' .tc-stack',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
