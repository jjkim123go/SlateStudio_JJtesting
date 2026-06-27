// TransitionWipe — full-screen bridge between sections.
// Phase 1 (0%-40%): wipe enters and fully covers screen.
// Phase 2 (40%-60%): wipe holds at full coverage, chapter card fades in/out.
// Phase 3 (60%-100%): wipe exits in the opposite direction.
// Props consumed: direction, color (Mustache substitutions).

(function () {
  // Provide a sensible color default if prop was empty (Mustache yields '')
  var bg = document.querySelector('.scene-' + SCENE_ID + ' .twp-bg');
  var colorProp = '{{color}}';
  if (bg && (!colorProp || colorProp.trim() === '')) {
    bg.style.setProperty('--twp-color', 'var(--brand-primary, #0078D4)');
  }
})();

var __twpScope = '.scene-' + SCENE_ID + ' ';
var __twpDir = '{{direction}}' || 'left-to-right';

// Set initial offscreen position + final exit offscreen position based on direction.
// Diagonal uses rotation; the others use straight x/y translates.
var __twpEnterFrom, __twpExitTo;
if (__twpDir === 'right-to-left') {
  __twpEnterFrom = { xPercent: 100, yPercent: 0, rotation: 0 };
  __twpExitTo    = { xPercent: -100, yPercent: 0, rotation: 0 };
} else if (__twpDir === 'top-to-bottom') {
  __twpEnterFrom = { xPercent: 0, yPercent: -100, rotation: 0 };
  __twpExitTo    = { xPercent: 0, yPercent: 100,  rotation: 0 };
} else if (__twpDir === 'bottom-to-top') {
  __twpEnterFrom = { xPercent: 0, yPercent: 100,  rotation: 0 };
  __twpExitTo    = { xPercent: 0, yPercent: -100, rotation: 0 };
} else if (__twpDir === 'diagonal') {
  // Oversized rotated panel — slide along its rotated x axis
  __twpEnterFrom = { xPercent: -120, yPercent: 0, rotation: -12 };
  __twpExitTo    = { xPercent: 120,  yPercent: 0, rotation: -12 };
} else {
  // default: left-to-right
  __twpEnterFrom = { xPercent: -100, yPercent: 0, rotation: 0 };
  __twpExitTo    = { xPercent: 100,  yPercent: 0, rotation: 0 };
}

var __twpEnterDur = SCENE_DURATION * 0.4;
var __twpHold     = SCENE_DURATION * 0.2;
var __twpExitDur  = SCENE_DURATION - __twpEnterDur - __twpHold;

// Phase 1 — wipe enters
master.fromTo(__twpScope + '.twp-wipe',
  __twpEnterFrom,
  { xPercent: 0, yPercent: 0, rotation: __twpEnterFrom.rotation, duration: __twpEnterDur, ease: 'power3.inOut' },
  SCENE_START);

// Phase 2 — chapter card fades in (number first, rule, then title)
var __cardStart = SCENE_START + __twpEnterDur * 0.85;
master.fromTo(__twpScope + '.twp-num',
  { opacity: 0, y: 12 },
  { opacity: 0.85, y: 0, duration: 0.35, ease: 'power2.out' },
  __cardStart);
master.fromTo(__twpScope + '.twp-rule',
  { opacity: 0, scaleX: 0 },
  { opacity: 1, scaleX: 1, duration: 0.35, ease: 'power2.out', transformOrigin: 'center' },
  __cardStart + 0.1);
master.fromTo(__twpScope + '.twp-title',
  { opacity: 0, y: 24 },
  { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
  __cardStart + 0.15);
master.fromTo(__twpScope + '.twp-card',
  { opacity: 0 },
  { opacity: 1, duration: 0.35, ease: 'power1.out' },
  __cardStart);

// Phase 2.5 — fade chapter card out before the exit wipe
var __cardOut = SCENE_START + __twpEnterDur + __twpHold - 0.15;
master.to(__twpScope + '.twp-card',
  { opacity: 0, duration: 0.3, ease: 'power2.in' },
  __cardOut);

// Phase 3 — wipe exits the opposite direction
master.to(__twpScope + '.twp-wipe',
  { xPercent: __twpExitTo.xPercent, yPercent: __twpExitTo.yPercent, rotation: __twpExitTo.rotation, duration: __twpExitDur, ease: 'power3.inOut' },
  SCENE_START + __twpEnterDur + __twpHold);
