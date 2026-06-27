/* BrandIntro animations are timed against the master timeline at SCENE_START */
master.fromTo('.scene-' + SCENE_ID + ' .bi-logo',
  { opacity: 0, scale: 0.8, y: 20 },
  { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 0.3);

master.fromTo('.scene-' + SCENE_ID + ' .bi-company',
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 0.9);

master.fromTo('.scene-' + SCENE_ID + ' .bi-tagline',
  { opacity: 0, y: 12 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 1.4);

// Hold then fade out near the end
master.to('.scene-' + SCENE_ID + ' .bi-stack',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
