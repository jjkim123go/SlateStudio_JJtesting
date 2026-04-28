// FilmstripFlip — 3D card flip with cinematic drop shadow.
// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  if (typeof master === 'undefined') return;

  var S = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(S + '.ff-root');
  if (!root) return;

  // ── Props ────────────────────────────────────────────────────────────────
  var dirAttr = (root.getAttribute('data-direction') || '').toLowerCase();
  if (dirAttr.indexOf('{{') !== -1 || !dirAttr) dirAttr = 'flip-left';

  var isVertical = dirAttr === 'flip-up' || dirAttr === 'flip-down';
  var isReverse = dirAttr === 'flip-right' || dirAttr === 'flip-down';

  // Back face pre-rotation handled in CSS (index.html) via data-direction
  // attribute selectors — no gsap.set() needed at eval time.

  // ── Build sprocket holes─────────────────────────────────────────────────
  var sprocketContainers = root.querySelectorAll(S.trim() + ' .ff-sprockets');
  var holeEls = [];
  for (var sc = 0; sc < sprocketContainers.length; sc++) {
    var container = sprocketContainers[sc];
    for (var h = 0; h < 14; h++) {
      var hole = document.createElement('div');
      hole.className = 'ff-hole';
      container.appendChild(hole);
      holeEls.push(hole);
    }
  }

  // ── Timing ───────────────────────────────────────────────────────────────
  var dur = SCENE_DURATION;
  // Phase durations: sprocket-in, pause, flip-out, edge-flash, flip-in, sprocket-out, exit-fade
  var sprocketIn = dur * 0.12;
  var preFlipHold = dur * 0.08;
  var flipHalf = dur * 0.25;
  var edgeFlash = dur * 0.04;

  var cardSel = S + '.ff-card';
  var edgeSel = S + '.ff-edge';
  var shadowSel = S + '.ff-shadow';

  // Flip angle (front → edge = 0→90, edge → back = 90→180 effectively via back-face)
  var outAngle = isReverse ? -90 : 90;
  var inAngle = isReverse ? 90 : -90;

  // ── 1. Sprocket holes fade in with stagger ───────────────────────────────
  if (holeEls.length > 0) {
    master.to(holeEls, {
      autoAlpha: 0.6,
      duration: sprocketIn,
      stagger: { each: 0.02, from: 'start' },
      ease: 'power1.out'
    }, SCENE_START);
  }

  // ── 2. Shadow builds during pre-flip ─────────────────────────────────────
  master.to(shadowSel, {
    autoAlpha: 0.4,
    duration: preFlipHold,
    ease: 'power1.in'
  }, SCENE_START + sprocketIn);

  // ── 3. Phase 1 — flip outgoing face away (0→90°) ────────────────────────
  var flipOutStart = SCENE_START + sprocketIn + preFlipHold;

  if (isVertical) {
    master.to(cardSel, {
      rotationX: outAngle,
      duration: flipHalf,
      ease: 'power2.in'
    }, flipOutStart);
  } else {
    master.to(cardSel, {
      rotationY: outAngle,
      duration: flipHalf,
      ease: 'power2.in'
    }, flipOutStart);
  }

  // Shadow swings during flip-out
  var shadowShiftX = isVertical ? 0 : (isReverse ? -30 : 30);
  var shadowShiftY = isVertical ? (isReverse ? -30 : 30) : 0;
  master.to(shadowSel, {
    x: shadowShiftX,
    y: shadowShiftY,
    autoAlpha: 0.7,
    duration: flipHalf,
    ease: 'power2.in'
  }, flipOutStart);

  // ── 4. Edge frame flash at midpoint ──────────────────────────────────────
  var midpoint = flipOutStart + flipHalf;
  master.to(edgeSel, {
    autoAlpha: 1,
    duration: edgeFlash * 0.5,
    ease: 'power1.in'
  }, midpoint - edgeFlash * 0.5);
  master.to(edgeSel, {
    autoAlpha: 0,
    duration: edgeFlash * 0.5,
    ease: 'power1.out'
  }, midpoint);

  // ── 5. Phase 2 — flip incoming face into view (–90→0° effectively) ──────
  var flipInStart = midpoint;
  var targetAngle = isReverse ? -180 : 180;

  if (isVertical) {
    master.to(cardSel, {
      rotationX: targetAngle,
      duration: flipHalf,
      ease: 'power2.out'
    }, flipInStart);
  } else {
    master.to(cardSel, {
      rotationY: targetAngle,
      duration: flipHalf,
      ease: 'power2.out'
    }, flipInStart);
  }

  // Shadow swings back
  master.to(shadowSel, {
    x: 0,
    y: 0,
    autoAlpha: 0.2,
    duration: flipHalf,
    ease: 'power2.out'
  }, flipInStart);

  // ── 6. Shadow and sprockets fade out ─────────────────────────────────────
  var postFlip = flipInStart + flipHalf;

  master.to(shadowSel, {
    autoAlpha: 0,
    duration: dur * 0.1,
    ease: 'power1.in'
  }, postFlip);

  if (holeEls.length > 0) {
    master.to(holeEls, {
      autoAlpha: 0,
      duration: dur * 0.1,
      stagger: { each: 0.015, from: 'end' },
      ease: 'power1.in'
    }, postFlip);
  }

  // ── 7. Exit fade — completes ≥ 0.3s before scene end ──────────────────
  master.to(S + '.ff-root', {
    autoAlpha: 0,
    duration: 0.2,
    ease: 'power2.in'
  }, SCENE_START + dur - 0.5);
})();
