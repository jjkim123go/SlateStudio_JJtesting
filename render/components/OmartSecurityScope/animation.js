// Intent: glass — quiet authority for scoped security reveal.
(function () {
  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' .oss-root');
  if (!root) return;

  var MAT = { enter:{ duration:0.4, ease:'power2.out' }, exit:{ duration:0.28, ease:'power2.in' }, stagger:0.08, distance:20 };
  master.set(S + ' .oss-veil, ' + S + ' .oss-group, ' + S + ' .oss-viewer, ' + S + ' .oss-rule', { autoAlpha:0 }, SCENE_START);

  master.fromTo(S + ' .oss-header', { y:-MAT.distance, autoAlpha:0 }, { y:0, autoAlpha:1, duration:.46, ease:'power2.out' }, SCENE_START + .12);
  master.fromTo(S + ' .oss-report', { x:-24, autoAlpha:0, scale:.985 }, { x:0, autoAlpha:1, scale:1, duration:.52, ease:'power2.out' }, SCENE_START + .42);
  master.fromTo(S + ' .oss-side', { x:24, autoAlpha:0, scale:.985 }, { x:0, autoAlpha:1, scale:1, duration:.52, ease:'power2.out' }, SCENE_START + .62);
  master.fromTo(S + ' .oss-card', { y:MAT.distance, autoAlpha:0, scale:.98 }, { y:0, autoAlpha:1, scale:1, duration:MAT.enter.duration, ease:MAT.enter.ease, stagger:MAT.stagger }, SCENE_START + .95);
  master.fromTo(S + ' .oss-bar span', { scaleX:.05 }, { scaleX:1, duration:.56, ease:'power2.out', stagger:.08 }, SCENE_START + 1.72);

  master.to(S + ' .oss-veil', { autoAlpha:1, duration:.5, ease:'power2.out' }, SCENE_START + 2.85);
  master.fromTo(S + ' .oss-lock', { y:14, scale:.94, autoAlpha:0 }, { y:0, scale:1, autoAlpha:1, duration:.42, ease:'power2.out' }, SCENE_START + 3.02);
  master.fromTo(S + ' .oss-group', { y:MAT.distance, autoAlpha:0, scale:.98 }, { y:0, autoAlpha:1, scale:1, duration:.42, ease:'power2.out' }, SCENE_START + 3.78);
  master.fromTo(S + ' .oss-avatar', { y:10, autoAlpha:0, scale:.86 }, { y:0, autoAlpha:1, scale:1, duration:.3, ease:'power2.out', stagger:.06 }, SCENE_START + 4.08);
  master.fromTo(S + ' .oss-viewer', { y:14, autoAlpha:0, scale:.98 }, { y:0, autoAlpha:1, scale:1, duration:.34, ease:'power2.out', stagger:.1 }, SCENE_START + 4.66);
  master.fromTo(S + ' .oss-rule', { y:14, autoAlpha:0, scale:.98 }, { y:0, autoAlpha:1, scale:1, duration:.34, ease:'power2.out' }, SCENE_START + 5.55);

  master.to(S + ' .oss-report', { scale:1.012, duration:SCENE_DURATION * .42, ease:'sine.inOut' }, SCENE_START + 4.0);
  master.to(S + ' .oss-root', { autoAlpha:0, duration:MAT.exit.duration, ease:MAT.exit.ease }, SCENE_START + SCENE_DURATION - .36);
})();
