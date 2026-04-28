// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  var scope = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(scope + '.si-root');
  var triggerOffset = Math.max(0, parseFloat('{{triggerSec}}') || 0.5);
  var intensity = root ? ((root.getAttribute('data-si-intensity') || 'medium').toLowerCase()) : 'medium';
  var direction = root ? ((root.getAttribute('data-si-direction') || 'both').toLowerCase()) : 'both';
  var targetSelector = root ? (root.getAttribute('data-si-target-selector') || '') : '';
  if (!targetSelector || targetSelector.indexOf('{{') !== -1) {
    targetSelector = '.scene-' + SCENE_ID;
  }

  var amplitudes = {
    subtle: { x: 8, y: 6, sat: 1.1, contrast: 1.04 },
    medium: { x: 15, y: 11, sat: 1.2, contrast: 1.08 },
    heavy: { x: 22, y: 16, sat: 1.28, contrast: 1.12 }
  };
  var cfg = amplitudes[intensity] || amplitudes.medium;
  if (direction === 'horizontal') cfg.y = 0;
  if (direction === 'vertical') cfg.x = 0;

  var trigger = SCENE_START + Math.min(triggerOffset, Math.max(0.02, SCENE_DURATION - 0.24));

  master.to(targetSelector,
    {
      x: cfg.x,
      y: -cfg.y,
      filter: 'contrast(' + cfg.contrast + ') saturate(' + cfg.sat + ')',
      duration: 0.04,
      ease: 'power2.out'
    },
    trigger);

  master.to(targetSelector,
    {
      x: -cfg.x * 0.72,
      y: cfg.y * 0.66,
      filter: 'contrast(' + (1 + (cfg.contrast - 1) * 0.84) + ') saturate(' + (1 + (cfg.sat - 1) * 0.82) + ')',
      duration: 0.05,
      ease: 'power1.inOut'
    },
    trigger + 0.04);

  master.to(targetSelector,
    {
      x: cfg.x * 0.34,
      y: -cfg.y * 0.28,
      filter: 'contrast(' + (1 + (cfg.contrast - 1) * 0.45) + ') saturate(' + (1 + (cfg.sat - 1) * 0.44) + ')',
      duration: 0.06,
      ease: 'power1.out'
    },
    trigger + 0.09);

  master.to(targetSelector,
    {
      x: 0,
      y: 0,
      filter: 'contrast(1) saturate(1)',
      duration: 0.09,
      ease: 'power2.out'
    },
    trigger + 0.15);
})();
