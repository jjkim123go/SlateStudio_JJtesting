// GaugeRing — radial gauge with SVG arc fill + counter tween
// Compiler injects: master, SCENE_ID, SCENE_START, SCENE_DURATION, SCENE_PROPS

var S = '.scene-' + SCENE_ID;

// Read values from data attributes at build time
var arcEl = document.querySelector(S + ' .gr-arc');
var compEl = document.querySelector(S + ' .gr-comparison');
var numEl = document.querySelector(S + ' .gr-number');

var circumference = 2 * Math.PI * 160; // ~1005.31
var value = arcEl ? (parseFloat(arcEl.getAttribute('data-value')) || 0) : 0;
var maxVal = arcEl ? (parseFloat(arcEl.getAttribute('data-max')) || 100) : 100;
var ratio = Math.min(value / maxVal, 1);
var targetOffset = circumference * (1 - ratio);

// Set initial SVG state synchronously
if (arcEl) {
  arcEl.style.strokeDasharray = String(circumference);
  arcEl.style.strokeDashoffset = String(circumference);
}
if (compEl) {
  var compVal = parseFloat(compEl.getAttribute('data-value')) || 0;
  var compMax = parseFloat(compEl.getAttribute('data-max')) || 100;
  var compRatio = Math.min(compVal / compMax, 1);
  var compTargetOffset = circumference * (1 - compRatio);
  compEl.style.strokeDasharray = String(circumference);
  compEl.style.strokeDashoffset = String(circumference);
}

// Counter proxy — MUST be declared outside the timeline so tween can update it
var counter = { val: 0 };

// Phase 1 (0–0.5s): container + track fade in
master.fromTo(S + ' .gr-container',
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.1);

master.fromTo(S + ' .gr-track',
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.2);

// Phase 2 (0.5–2.0s): arc fill + counter — ON the master timeline (not standalone gsap.to)
if (arcEl) {
  master.fromTo(arcEl,
    { strokeDashoffset: circumference },
    { strokeDashoffset: targetOffset, duration: 1.2, ease: 'power2.inOut' },
    SCENE_START + 0.5);
}

if (compEl && compVal > 0) {
  master.fromTo(compEl,
    { strokeDashoffset: circumference },
    { strokeDashoffset: compTargetOffset, duration: 1.0, ease: 'power2.inOut' },
    SCENE_START + 0.5);
}

// Counter tween — ON the master timeline
if (numEl) {
  numEl.style.opacity = '0';
  master.to(S + ' .gr-number', { opacity: 1, duration: 0.2 }, SCENE_START + 0.5);
  master.to(counter, {
    val: value,
    duration: 1.2,
    ease: 'power1.out',
    onUpdate: function() {
      if (numEl) numEl.textContent = (value % 1 !== 0) ? counter.val.toFixed(1) : String(Math.floor(counter.val));
    }
  }, SCENE_START + 0.5);
}

// Suffix fades in with the number
master.fromTo(S + ' .gr-suffix',
  { opacity: 0 },
  { opacity: 1, duration: 0.3, ease: 'power2.out' },
  SCENE_START + 0.6);

// Phase 3 (2.0–2.5s): label + subtitle fade in with y slide
master.fromTo(S + ' .gr-label',
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 2.0);

master.fromTo(S + ' .gr-subtitle',
  { opacity: 0, y: 14 },
  { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 2.3);

// Phase 4 (2.5–3.0s): subtle scale pulse on the number for emphasis
master.fromTo(S + ' .gr-number',
  { scale: 1 },
  { scale: 1.06, duration: 0.3, ease: 'power2.inOut', yoyo: true, repeat: 1 },
  SCENE_START + 2.6);

// Fade out near scene end
master.to(S + ' .gr-container',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
