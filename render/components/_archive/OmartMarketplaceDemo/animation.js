// Intent: glass — guided product walkthrough over real Omart screenshots.
(function () {
  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' .omd-root');
  if (!root) return;
  var mode = (root.getAttribute('data-mode') || 'browse').toLowerCase();
  var MAT = { enter:{ duration:0.4, ease:'power2.out' }, exit:{ duration:0.28, ease:'power2.in' }, stagger:0.08, distance:20 };
  var cursor = S + ' .omd-cursor';
  var visible = S + ' [data-modes]';
  master.set(visible, { autoAlpha: 0 }, SCENE_START);
  master.set(cursor, { autoAlpha: 0, x: 250, y: 220 }, SCENE_START);
  master.fromTo(S + ' .omd-stage', { scale: 1.015, x: 0, y: 0 }, { scale: mode === 'trust' ? 1.075 : 1.025, x: mode === 'trust' ? -36 : 0, y: mode === 'trust' ? -18 : 0, duration: SCENE_DURATION * .86, ease: 'sine.inOut' }, SCENE_START);

  function show(sel, at, vars) {
    master.fromTo(sel, Object.assign({ y: MAT.distance, scale: .985, autoAlpha: 0 }, vars && vars.from || {}), Object.assign({ y: 0, scale: 1, autoAlpha: 1, duration: MAT.enter.duration, ease: MAT.enter.ease }, vars && vars.to || {}), SCENE_START + at);
  }
  function move(x, y, at, dur) { master.to(cursor, { x:x, y:y, duration: dur || .55, ease:'power2.inOut', autoAlpha:1 }, SCENE_START + at); }
  function click(at) { master.to(cursor, { scale:.82, duration:.08, ease:'power2.in' }, SCENE_START + at); master.to(cursor, { scale:1, duration:.16, ease:'power2.out' }, SCENE_START + at + .08); }

  if (mode === 'browse') {
    move(110, 548, .28, .01); show(S + ' .omd-search', .38); master.to(S + ' .omd-search .omd-type', { clipPath:'inset(0 0% 0 0)', duration:1.05, ease:'steps(24)' }, SCENE_START + .82);
    move(1810, 548, 1.9); show(S + ' .omd-filter', 2.08, { from:{ y:10, scale:.96 } }); click(2.22);
    move(1210, 606, 2.85); show(S + ' .omd-fresh', 3.02, { from:{ y:10, scale:.96 } });
    move(1228, 712, 3.72); show(S + ' .omd-card-focus', 3.58, { from:{ scale:.94 } });
    move(1246, 862, 4.56); show(S + ' .omd-open-glow', 4.40, { from:{ scale:.90 } }); click(4.95);
    master.to(S + ' .omd-stage', { scale:1.07, x:-96, y:-42, duration:.72, ease:'power2.inOut' }, SCENE_START + 5.05);
  } else if (mode === 'trust') {
    show(S + ' .omd-lens', .30, { from:{ scale:.92, x:38 }, to:{ scale:1, x:0 } }); show(S + ' .omd-card-focus', .48, { from:{ scale:.95 } });
    show(S + ' .omd-certified', 1.00); show(S + ' .omd-owner', 1.45); show(S + ' .omd-lineage', 2.00); show(S + ' .omd-freshness', 2.55); show(S + ' .omd-audience', 3.10);
    move(1120, 390, .75, .01); move(1275, 284, 1.35); move(1438, 408, 1.92); move(1180, 540, 2.46); move(1408, 666, 3.02);
  } else if (mode === 'compose') {
    show(S + ' .omd-card-focus', .42, { from:{ scale:.94 } });
    // Reveal the Radar-style report shell from the right early so it's visible during picking.
    master.set(S + ' .omd-tray-body .omd-tile', { autoAlpha: 0, y: 12, scale: .96 }, SCENE_START);
    show(S + ' .omd-tray', .55, { from:{ x: 60, scale: .94 } });
    show(S + ' .omd-tray-head', .82, { from:{ y: 10 } });

    // Pick 1: Control Health
    move(1215, 710, .85, .01); click(1.18);
    show(S + ' .omd-fly-a', 1.20, { from:{ scale:.78 }, to:{ x:469, y:-231, scale:.42, autoAlpha:0, duration:.92, ease:'power2.inOut' } });
    show(S + ' .omd-tray-body .omd-tile[data-tile="control"]', 2.05, { from:{ y:14, scale:.92 } });

    // Pick 2: Incident trend
    move(640, 710, 2.30); click(2.62);
    show(S + ' .omd-fly-b', 2.66, { from:{ scale:.78 }, to:{ x:1009, y:-61, scale:.42, autoAlpha:0, duration:.92, ease:'power2.inOut' } });
    show(S + ' .omd-tray-body .omd-tile[data-tile="incident"]', 3.50, { from:{ y:14, scale:.92 } });
    // Animate the sparkline bars
    master.fromTo(S + ' .omd-tile[data-tile="incident"] .omd-tile-spark span', { scaleY: .05 }, { scaleY: 1, duration: .52, ease: 'power2.out', stagger: .05 }, SCENE_START + 3.78);

    // Pick 3: Cost signal
    move(1605, 710, 3.95); click(4.28);
    show(S + ' .omd-fly-c', 4.30, { from:{ scale:.78 }, to:{ x:29, y:109, scale:.42, autoAlpha:0, duration:.92, ease:'power2.inOut' } });
    show(S + ' .omd-tray-body .omd-tile[data-tile="cost"]', 5.10, { from:{ y:14, scale:.92 } });

    // Hold on the assembled report; subtle scale up to feature it.
    master.to(S + ' .omd-tray', { scale: 1.025, x: -10, duration: .85, ease: 'power2.inOut' }, SCENE_START + 5.55);
  } else if (mode === 'custom-report') {
    master.set(S + ' .omd-typed span', { clipPath:'inset(0 100% 0 0)' }, SCENE_START);
    master.set(S + ' .omd-source-card, ' + S + ' .omd-report-card, ' + S + ' .omd-share-row .omd-native-pill', { autoAlpha:0, y:14, scale:.98 }, SCENE_START);
    show(S + ' .omd-native-builder', .18, { from:{ y:18, scale:.985 } });
    move(370, 272, .52, .01); click(.84);
    master.to(S + ' .omd-title-text span', { clipPath:'inset(0 0% 0 0)', duration:.78, ease:'steps(24)' }, SCENE_START + .96);
    move(370, 376, 1.62); click(1.92);
    master.to(S + ' .omd-prompt-text span', { clipPath:'inset(0 0% 0 0)', duration:1.34, ease:'steps(42)' }, SCENE_START + 2.08);
    move(350, 552, 3.48); click(3.72);
    master.to(S + ' .omd-source-card', { autoAlpha:1, y:0, scale:1, duration:.4, ease:'power2.out', stagger:.16 }, SCENE_START + 3.62);
    move(350, 700, 4.34); click(4.54);
    move(350, 842, 4.90); click(5.12);
    master.to(S + ' .omd-report-card', { autoAlpha:1, y:0, scale:1, duration:.42, ease:'power2.out', stagger:.13 }, SCENE_START + 5.34);
    master.fromTo(S + ' .omd-mini-bar span', { scaleX:.06 }, { scaleX:1, duration:.52, ease:'power2.out' }, SCENE_START + 5.92);
    master.to(S + ' .omd-share-row .omd-native-pill', { autoAlpha:1, y:0, scale:1, duration:.34, ease:'power2.out', stagger:.1 }, SCENE_START + 6.35);
    move(1410, 902, 6.68); click(6.98);
  } else if (mode === 'manage') {
    show(S + ' .omd-status-focus', .50, { from:{ scale:.96 } }); move(1138, 330, .42, .01); show(S + ' .omd-status-ready', .92); click(1.05);
    move(1366, 330, 1.82); show(S + ' .omd-status-actions', 2.05, { from:{ y:10, scale:.96 } }); click(2.28);
    master.to(S + ' .omd-status-focus', { x:-10, scale:1.025, duration:.64, ease:'power2.inOut' }, SCENE_START + 2.8);
    master.to(S + ' .omd-stage', { scale:1.055, x:-18, duration:SCENE_DURATION * .45, ease:'sine.inOut' }, SCENE_START + 1.0);
  }
  master.to(cursor, { autoAlpha: 0, duration:.22, ease:'power2.in' }, SCENE_START + SCENE_DURATION - .42);
  master.to(visible, { autoAlpha: 0, duration:.28, ease:'power2.in' }, SCENE_START + SCENE_DURATION - .36);
})();
