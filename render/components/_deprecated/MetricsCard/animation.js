// MetricsCard — glassmorphic card with counter tween, delta, sub-metrics
// All animations on master timeline (no standalone gsap.to)
var S = '.scene-' + SCENE_ID;

// --- Setup: parse headline target, configure delta colors ---
var headlineEl = document.querySelector(S + ' .mc-headline');
var deltaRow = document.querySelector(S + ' .mc-delta-row');
var headlineTarget = headlineEl ? headlineEl.getAttribute('data-target') || '0' : '0';
var numericTarget = parseFloat(headlineTarget.replace(/[^0-9.\-]/g, '')) || 0;
var hasDecimal = headlineTarget.indexOf('.') !== -1;
var prefix = headlineTarget.replace(/[0-9.\-,]+.*/, '');
var trailMatch = headlineTarget.match(/[0-9.\-,]+(.*)$/);
var trail = trailMatch ? trailMatch[1] : '';

// Delta direction colors
if (deltaRow) {
  var dir = deltaRow.getAttribute('data-direction') || 'up';
  var isUp = dir === 'up';
  var arrowColor = isUp ? '#22c55e' : '#f43f5e';
  deltaRow.style.color = arrowColor;
  var upPath = deltaRow.querySelector('.mc-arrow-up');
  var downPath = deltaRow.querySelector('.mc-arrow-down');
  if (upPath && isUp) upPath.style.display = 'block';
  if (downPath && !isUp) downPath.style.display = 'block';
}

// Counter proxy
var counter = { val: 0 };

// Phase 1: card entrance
master.fromTo(S + ' .mc-inner',
  { autoAlpha: 0, y: 28, scale: 0.97 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' },
  SCENE_START + 0.15);

// Phase 2: headline counter tween — ON the master timeline
if (headlineEl) {
  master.to(S + ' .mc-headline', { opacity: 1, duration: 0.15 }, SCENE_START + 0.4);
  master.to(counter, {
    val: numericTarget,
    duration: 1.4,
    ease: 'power1.out',
    onUpdate: function() {
      if (!headlineEl) return;
      var display = hasDecimal ? counter.val.toFixed(1) : String(Math.floor(counter.val));
      headlineEl.textContent = prefix + display + trail;
    }
  }, SCENE_START + 0.4);
}

// Phase 2b: suffix fades in with headline
master.fromTo(S + ' .mc-suffix',
  { autoAlpha: 0, x: -10 },
  { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.55);

// Phase 3: delta row slides in
master.fromTo(S + ' .mc-delta-row',
  { autoAlpha: 0, x: -16 },
  { autoAlpha: 1, x: 0, duration: 0.45, ease: 'power2.out' },
  SCENE_START + 1.5);

// Phase 4: sub-metric cards staggered reveal
master.fromTo(S + ' .mc-sub',
  { autoAlpha: 0, y: 24, scale: 0.94 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.35)', stagger: 0.15 },
  SCENE_START + 2.0);

// Fade out near scene end
master.to(S + ' .mc-inner',
  { autoAlpha: 0, y: -12, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
