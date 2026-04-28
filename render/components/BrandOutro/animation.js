master.fromTo('.scene-' + SCENE_ID + ' .bo-logo',
  { opacity: 0, scale: 0.9 },
  { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.2);

master.fromTo('.scene-' + SCENE_ID + ' .bo-company',
  { opacity: 0, y: 16 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.6);

master.fromTo('.scene-' + SCENE_ID + ' .bo-cta',
  { opacity: 0, y: 12 },
  { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 1.0);

master.fromTo('.scene-' + SCENE_ID + ' .bo-contact',
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 1.3);

master.to('.scene-' + SCENE_ID + ' .bo-stack',
  { opacity: 0, duration: 0.6, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.6);
