// Disclaimer — reveal animation for 3 placement variants, markdown parsing,
// optional auto-dismiss (modal-card), optional acknowledge chip.
// Props consumed (Mustache): placement, revealStartSec, revealDurationSec,
//   durationSec, mustAcknowledge, acknowledgeChipStartSec

var __dclPlacement = '{{placement}}' || 'full-width-footer';
var __dclRevealStart = parseFloat('{{revealStartSec}}');
if (!isFinite(__dclRevealStart)) {
  __dclRevealStart = __dclPlacement === 'scene-end' ? 0 : 0.2;
}
var __dclRevealDur = parseFloat('{{revealDurationSec}}');
if (!isFinite(__dclRevealDur)) __dclRevealDur = 0.5;

var __dclDuration = parseFloat('{{durationSec}}');
var __dclMustAck = '{{mustAcknowledge}}' === 'true';
var __dclAckStart = parseFloat('{{acknowledgeChipStartSec}}');
if (!isFinite(__dclAckStart)) __dclAckStart = 1.4;

var __dclScope = '.scene-' + SCENE_ID + ' ';

// ── Markdown-lite: parse **bold**, *italic*, newlines at SCENE_START ──
master.call(function() {
  var els = document.querySelectorAll(__dclScope + '.dcl-body-text');
  for (var i = 0; i < els.length; i++) {
    var raw = els[i].textContent;
    els[i].innerHTML = raw
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
}, null, SCENE_START);

// ═══════════════════════════════════════════
// full-width-footer: slide up from bottom
// ═══════════════════════════════════════════
if (__dclPlacement === 'full-width-footer') {
  master.fromTo(__dclScope + '.dcl-footer',
    { y: '100%' },
    { y: '0%', duration: __dclRevealDur, ease: 'power2.out' },
    SCENE_START + __dclRevealStart);

  // Exit: slide back down
  master.to(__dclScope + '.dcl-footer',
    { y: '100%', duration: 0.4, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.5);
}

// ═══════════════════════════════════════════
// modal-card: dimmer + card scale-in
// ═══════════════════════════════════════════
if (__dclPlacement === 'modal-card') {
  // Dimmer fade
  master.fromTo(__dclScope + '.dcl-dimmer',
    { opacity: 0 },
    { opacity: 1, duration: 0.3, ease: 'power2.out' },
    SCENE_START + __dclRevealStart);

  // Card scale + fade
  master.fromTo(__dclScope + '.dcl-card',
    { opacity: 0, scale: 0.95 },
    { opacity: 1, scale: 1, duration: __dclRevealDur, ease: 'power2.out' },
    SCENE_START + __dclRevealStart + 0.3);

  // Auto-dismiss (if durationSec set) or exit fade
  var __dclOutAt;
  if (isFinite(__dclDuration) && __dclDuration > 0) {
    __dclOutAt = Math.min(
      SCENE_START + __dclRevealStart + __dclDuration,
      SCENE_START + SCENE_DURATION - 0.5
    );
  } else {
    __dclOutAt = SCENE_START + SCENE_DURATION - 0.5;
  }

  master.to(__dclScope + '.dcl-card',
    { opacity: 0, scale: 0.95, duration: 0.4, ease: 'power2.in' },
    __dclOutAt);
  master.to(__dclScope + '.dcl-dimmer',
    { opacity: 0, duration: 0.4, ease: 'power2.in' },
    __dclOutAt);
}

// ═══════════════════════════════════════════
// scene-end: simple fade in (whole scene is the disclaimer)
// ═══════════════════════════════════════════
if (__dclPlacement === 'scene-end') {
  master.fromTo(__dclScope + '.dcl-scene-end',
    { opacity: 0 },
    { opacity: 1, duration: __dclRevealDur, ease: 'power2.out' },
    SCENE_START + __dclRevealStart);

  // Exit fade
  master.to(__dclScope + '.dcl-scene-end',
    { opacity: 0, duration: 0.4, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.5);
}

// ── Acknowledge chip (mustAcknowledge only) — slide from right + fade ──
if (__dclMustAck) {
  // Target the visible variant's chip
  var __dclChipSel = __dclScope + '.dcl-ack-chip';
  master.fromTo(__dclChipSel,
    { opacity: 0, x: 20 },
    { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + __dclAckStart);
}
