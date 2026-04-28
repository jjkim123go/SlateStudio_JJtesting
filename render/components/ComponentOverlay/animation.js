const overlayRoot = '.scene-' + SCENE_ID + ' .component-overlay-root';
master.fromTo(overlayRoot + ' .component-overlay-card',
  { autoAlpha: 0, y: 34, scale: 0.97 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.58, ease: 'power3.out' },
  SCENE_START + 0.18);
master.fromTo(overlayRoot + ' .component-overlay-eyebrow',
  { autoAlpha: 0, y: 10 },
  { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' },
  SCENE_START + 0.42);
master.fromTo(overlayRoot + ' .component-overlay-title',
  { autoAlpha: 0, y: 18 },
  { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' },
  SCENE_START + 0.62);
master.fromTo(overlayRoot + ' .component-overlay-body',
  { autoAlpha: 0, y: 16 },
  { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.92);
master.fromTo(overlayRoot + ' .component-overlay-slot',
  { autoAlpha: 0, y: 14 },
  { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out' },
  SCENE_START + 1.22);
master.to(overlayRoot + ' .component-overlay-backdrop',
  { scale: 1.06, duration: Math.max(1, SCENE_DURATION - 0.6), ease: 'none' },
  SCENE_START);
master.to(overlayRoot + ' .component-overlay-card',
  { autoAlpha: 0, y: -16, duration: 0.35, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
