// PolicyEnforcement — request slides in, checks stamp sequentially, decision gate expands
// Animation pattern: proposal line 465; globals: CONTRACT §4.1 (lines 96–107)
// Selector hygiene: CONTRACT §4.3 (line 117); exit fade: CONTRACT §7 (line 170)

// Title fade
master.fromTo('.scene-' + SCENE_ID + ' .pe-title',
  { opacity: 0, y: -16 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.2);

// Rule citation chip
master.fromTo('.scene-' + SCENE_ID + ' .pe-citation',
  { opacity: 0, x: 16 },
  { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' },
  SCENE_START + 0.3);

// Request card slide
master.fromTo('.scene-' + SCENE_ID + ' .pe-request',
  { opacity: 0, x: -32 },
  { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' },
  SCENE_START + 0.3);

// First connector
var cons = document.querySelectorAll('.scene-' + SCENE_ID + ' .pe-connector');
if (cons.length > 0) {
  master.fromTo(cons[0],
    { opacity: 0, scaleY: 0 },
    { opacity: 1, scaleY: 1, duration: 0.25, ease: 'power2.out',
      transformOrigin: 'top center' },
    SCENE_START + 0.6);
}

// Check items stamp in with stagger
var peChecks = document.querySelectorAll('.scene-' + SCENE_ID + ' .pe-check');
var peCheckCount = Math.max(peChecks.length, 1);
var peAvail = Math.max(SCENE_DURATION - 3.0, peCheckCount * 0.35);
var pePer = Math.min(0.45, peAvail / peCheckCount);

master.fromTo('.scene-' + SCENE_ID + ' .pe-check',
  { opacity: 0, scale: 0.85, y: 10 },
  { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)', stagger: pePer },
  SCENE_START + 0.7);

// Failed-check emphasis — slight red glow after stamp-in
var peStampEnd = SCENE_START + 0.7 + pePer * peCheckCount + 0.15;
master.call(function() {
  var failed = document.querySelectorAll(
    '.scene-' + SCENE_ID + ' .pe-check:has(.pe-stamp[data-outcome="fail"])'
  );
  if (!failed.length) return;
  failed.forEach(function(el) {
    gsap.to(el, {
      borderColor: 'rgba(239,68,68,0.5)',
      boxShadow: '0 0 16px rgba(239,68,68,0.15)',
      duration: 0.4, ease: 'power2.out'
    });
  });
}, [], peStampEnd);

// Second connector
if (cons.length > 1) {
  master.fromTo(cons[1],
    { opacity: 0, scaleY: 0 },
    { opacity: 1, scaleY: 1, duration: 0.25, ease: 'power2.out',
      transformOrigin: 'top center' },
    peStampEnd + 0.1);
}

// Decision gate expand
var peDecStart = peStampEnd + 0.3;
master.fromTo('.scene-' + SCENE_ID + ' .pe-decision',
  { opacity: 0, scale: 0.9 },
  { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' },
  peDecStart);

// Audit-ref and any footer chips
master.fromTo('.scene-' + SCENE_ID + ' .pe-chip',
  { opacity: 0, y: 6 },
  { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: 0.12 },
  peDecStart + 0.35);

// Exit fade — ≥ 0.3s before SCENE_START + SCENE_DURATION (CONTRACT §7 line 170)
master.to('.scene-' + SCENE_ID + ' .pe-root',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
