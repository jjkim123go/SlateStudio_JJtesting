// AuditTrail — timeline draws downward, event cards snap in, highlights pulse
// Animation pattern: proposal line 496; globals: CONTRACT §4.1 (lines 96–107)
// Selector hygiene: CONTRACT §4.3 (line 117); stateful anim: CONTRACT §4.4 (line 120)

// Title fade in
master.fromTo('.scene-' + SCENE_ID + ' .at-title',
  { opacity: 0, y: -16 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.2);

// Timeline stroke reveal — core GSAP strokeDashoffset technique
// Pattern: ArchitectureDiagram/animation.js lines 15–22; CONTRACT §4.4 master.call
master.call(function() {
  var line = document.querySelector('.scene-' + SCENE_ID + ' .at-timeline-line');
  var container = document.querySelector('.scene-' + SCENE_ID + ' .at-events');
  if (!line || !container) return;
  var h = container.offsetHeight || 400;
  line.setAttribute('y2', String(h));
  if (!line.getTotalLength) return;
  var len = line.getTotalLength();
  line.style.strokeDasharray = len;
  line.style.strokeDashoffset = len;
  gsap.to(line, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.out' });
}, [], SCENE_START + 0.4);

// Event cards stagger in — mirroring StepByStep stagger pattern
var atEvents = document.querySelectorAll('.scene-' + SCENE_ID + ' .at-event');
var atCount = Math.max(atEvents.length, 1);
var atAvail = Math.max(SCENE_DURATION - 2.5, atCount * 0.35);
var atPer = Math.min(0.55, atAvail / atCount);

master.fromTo('.scene-' + SCENE_ID + ' .at-event',
  { opacity: 0, x: -24 },
  { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out', stagger: atPer },
  SCENE_START + 0.6);

// Highlighted events pulse once after all cards revealed
master.call(function() {
  var cards = document.querySelectorAll(
    '.scene-' + SCENE_ID + ' .at-event[data-highlighted="true"] .at-card'
  );
  if (!cards.length) return;
  cards.forEach(function(card) {
    gsap.fromTo(card,
      { boxShadow: '0 0 0px rgba(245,158,11,0)' },
      { boxShadow: '0 0 24px rgba(245,158,11,0.5)', duration: 0.5,
        ease: 'power2.inOut', yoyo: true, repeat: 1 });
  });
}, [], SCENE_START + 0.6 + atPer * atCount + 0.2);

// Footer
master.fromTo('.scene-' + SCENE_ID + ' .at-footer',
  { opacity: 0, y: 8 },
  { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.6 + atPer * atCount + 0.4);

// Exit fade — ≥ 0.3s before SCENE_START + SCENE_DURATION (CONTRACT §7 line 170)
master.to('.scene-' + SCENE_ID + ' .at-root',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
