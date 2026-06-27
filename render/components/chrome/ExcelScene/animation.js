// ExcelScene — Wave A animation stub (PR 10c)
// Chrome shell reveals then exits. Wave B extends with cell/formula/chart steps.

// Fade in chrome
master.fromTo('.scene-' + SCENE_ID + ' .xl-bg',
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.05);

// Exit fade
master.to('.scene-' + SCENE_ID + ' .xl-bg',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
