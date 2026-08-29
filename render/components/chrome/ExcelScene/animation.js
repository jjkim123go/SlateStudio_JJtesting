// ExcelScene — Wave A animation stub (PR 10c)
// Chrome shell reveals then exits. Wave B extends with cell/formula/chart steps.

// Fade in chrome
master.fromTo('.scene-' + SCENE_ID + ' .xl-bg',
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.05);

master.from('.scene-' + SCENE_ID + ' .xl-cost-overlay', {
  y: 28, autoAlpha: 0, duration: 0.5, ease: 'power2.out'
}, SCENE_START + 0.7);

master.from('.scene-' + SCENE_ID + ' .xl-data-row', {
  x: -22, autoAlpha: 0, duration: 0.35, ease: 'power2.out', stagger: 0.45
}, SCENE_START + 1.5);

master.from('.scene-' + SCENE_ID + ' .xl-total-row', {
  y: 16, autoAlpha: 0, duration: 0.4, ease: 'power2.out'
}, SCENE_START + Math.min(6, SCENE_DURATION * 0.55));

// Exit fade
master.to('.scene-' + SCENE_ID + ' .xl-bg',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
