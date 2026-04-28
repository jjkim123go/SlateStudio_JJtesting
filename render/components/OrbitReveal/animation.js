// OrbitReveal — logarithmic spiral comet with radial mask reveal.
// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  if (typeof master === 'undefined') return;

  var S = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(S + '.or-root');
  if (!root) return;

  // ── Props ────────────────────────────────────────────────────────────────
  var dirAttr = (root.getAttribute('data-direction') || '').toLowerCase();
  if (dirAttr.indexOf('{{') !== -1 || !dirAttr) dirAttr = 'clockwise';
  var ccw = dirAttr === 'counterclockwise';

  var trailCount = parseInt(root.getAttribute('data-trail-count'), 10);
  if (!trailCount || trailCount < 1) trailCount = 18;
  trailCount = Math.min(trailCount, 40); // perf cap

  var spiralTurns = parseFloat(root.getAttribute('data-spiral-turns'));
  if (!spiralTurns || spiralTurns < 0.5) spiralTurns = 2.5;

  var colorProp = root.style.getPropertyValue('--or-color').trim();
  if (!colorProp || colorProp.indexOf('{{') !== -1) {
    root.style.setProperty('--or-color', 'var(--brand-primary, #0078D4)');
  }

  // ── Build trail particles in DOM once ────────────────────────────────────
  var trailContainer = root.querySelector('.or-trail');
  var particles = [];
  if (trailContainer) {
    for (var i = 0; i < trailCount; i++) {
      var p = document.createElement('div');
      p.className = 'or-particle';
      // Deterministic size variation based on index
      var sz = 4 + (i % 5);
      p.style.width = sz + 'px';
      p.style.height = sz + 'px';
      trailContainer.appendChild(p);
      particles.push(p);
    }
  }

  // ── Compute spiral waypoints ─────────────────────────────────────────────
  // Logarithmic spiral: r = a * e^(b*theta)
  // We want r to go from ~2% to ~75% of half-viewport (960px at 1920w)
  var STEPS = 60;
  var halfW = 960, halfH = 540;
  var maxR = Math.min(halfW, halfH) * 0.75; // ~405px
  var minR = 8;
  var a = minR;
  var totalAngle = spiralTurns * 2 * Math.PI;
  var b = Math.log(maxR / a) / totalAngle;

  var waypoints = [];
  for (var si = 0; si <= STEPS; si++) {
    var t = si / STEPS;
    var theta = t * totalAngle;
    var r = a * Math.exp(b * theta);
    var angle = ccw ? -theta : theta;
    waypoints.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      r: r,
      t: t
    });
  }

  // ── Timing ───────────────────────────────────────────────────────────────
  var dur = SCENE_DURATION;
  var spiralDur = dur * 0.85;
  var fadeOutStart = SCENE_START + dur - 0.35;

  // ── Comet animation (keyframes on x/y) ───────────────────────────────────
  var cometSel = S + '.or-comet';

  // Initial state: comet visible at center glow
  master.fromTo(cometSel,
    { x: 0, y: 0, scale: 0.3, autoAlpha: 0 },
    { scale: 1, autoAlpha: 1, duration: 0.15, ease: 'power2.out' },
    SCENE_START);

  // Animate comet along waypoints using keyframe segments
  var segmentDur = spiralDur / STEPS;
  for (var wi = 1; wi <= STEPS; wi++) {
    var wp = waypoints[wi];
    master.to(cometSel, {
      x: wp.x,
      y: wp.y,
      duration: segmentDur,
      ease: 'none'
    }, SCENE_START + (wi - 1) * segmentDur);
  }

  // Comet fades at end
  master.to(cometSel,
    { autoAlpha: 0, scale: 0.5, duration: 0.25, ease: 'power2.in' },
    SCENE_START + spiralDur - 0.1);

  // ── Trail particles — follow comet with staggered delay ──────────────────
  // Each particle follows the same path but delayed by a fraction
  var trailDelay = 0.04; // seconds between each particle
  for (var pi = 0; pi < particles.length; pi++) {
    var pDelay = (pi + 1) * trailDelay;
    var pSel = particles[pi];

    // Fade in
    master.to(pSel, {
      autoAlpha: 0.7 - (pi / particles.length) * 0.5,
      duration: 0.1,
      ease: 'none'
    }, SCENE_START + pDelay);

    // Follow waypoints with offset
    for (var pwi = 1; pwi <= STEPS; pwi++) {
      var pwp = waypoints[pwi];
      var pTime = SCENE_START + pDelay + (pwi - 1) * segmentDur;
      if (pTime > SCENE_START + spiralDur) break;
      master.to(pSel, {
        x: pwp.x,
        y: pwp.y,
        duration: segmentDur,
        ease: 'none'
      }, pTime);
    }

    // Fade out trailing particles earlier
    var pFadeTime = SCENE_START + spiralDur - 0.3 + pi * 0.01;
    if (pFadeTime < fadeOutStart) {
      master.to(pSel, {
        autoAlpha: 0,
        duration: 0.2,
        ease: 'power1.in'
      }, pFadeTime);
    }
  }

  // ── Radial mask reveal — clip-path circle() grows with spiral radius ─────
  var revealSel = S + '.or-reveal';
  var maskSteps = 20;
  var maskSegDur = spiralDur / maskSteps;
  for (var mi = 0; mi <= maskSteps; mi++) {
    var mt = mi / maskSteps;
    // Map to spiral radius as percentage of viewport diagonal
    var mTheta = mt * totalAngle;
    var mR = a * Math.exp(b * mTheta);
    var pct = (mR / Math.sqrt(halfW * halfW + halfH * halfH)) * 100;
    pct = Math.min(pct, 80);

    master.to(revealSel, {
      clipPath: 'circle(' + pct.toFixed(1) + '% at 50% 50%)',
      duration: maskSegDur,
      ease: 'none'
    }, SCENE_START + mi * maskSegDur);
  }

  // Final reveal — expand to full coverage
  master.to(revealSel, {
    clipPath: 'circle(100% at 50% 50%)',
    duration: dur * 0.12,
    ease: 'power2.out'
  }, SCENE_START + spiralDur);

  // ── Exit fade — completes ≥ 0.3s before scene end ─────────────────────
  master.to(S + '.or-root',
    { autoAlpha: 0, duration: 0.2, ease: 'power2.in' },
    SCENE_START + dur - 0.5);
})();
