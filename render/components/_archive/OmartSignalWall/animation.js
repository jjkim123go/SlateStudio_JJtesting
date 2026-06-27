// Intent: glass — premium signal convergence into a trusted marketplace hero.
(function () {
  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' .osw-root');
  if (!root) return;
  var mode = (root.getAttribute('data-mode') || 'converge').toLowerCase();
  var MAT = { enter:{ duration:0.4, ease:'power2.out' }, exit:{ duration:0.28, ease:'power2.in' }, stagger:0.08, distance:20 };
  var panels = S + ' .osw-panel';
  var hero = S + ' .osw-hero';
  var chips = S + ' .osw-chip';

  master.set([S + ' .osw-copy', panels, hero, chips], { autoAlpha: 0 }, SCENE_START);
  master.fromTo(S + ' .osw-orb-a', { x: 30, y: -12, scale: .96 }, { x: -24, y: 18, scale: 1.03, duration: SCENE_DURATION * .86, ease: 'sine.inOut' }, SCENE_START);
  master.fromTo(S + ' .osw-orb-b', { x: -26, y: 20, scale: 1.02 }, { x: 36, y: -18, scale: .98, duration: SCENE_DURATION * .82, ease: 'sine.inOut' }, SCENE_START);
  master.fromTo(S + ' .osw-copy', { y: -MAT.distance, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .52, ease: 'power2.out' }, SCENE_START + .16);

  if (mode === 'hero') {
    master.fromTo(hero, { scale: .92, y: 26, rotationX: 5, autoAlpha: 0 }, { scale: 1, y: 0, rotationX: 0, autoAlpha: 1, duration: .7, ease: 'power2.out' }, SCENE_START + .62);
    master.fromTo(panels, { y: 36, z: -80, scale: .86, autoAlpha: 0 }, { y: 0, z: 0, scale: .92, autoAlpha: .96, duration: .62, ease: 'power2.out', stagger: { each: .05, from: 'center' } }, SCENE_START + .18);
    master.fromTo(chips, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .32, ease: 'power2.out', stagger: .06 }, SCENE_START + 1.45);
    master.to(panels, { y: -8, duration: SCENE_DURATION * .55, ease: 'sine.inOut', stagger: { each: .03, from: 'edges' } }, SCENE_START + 1.25);
  } else {
    master.fromTo(panels, { y: 42, z: -110, rotationX: 12, scale: .82, autoAlpha: 0 }, { y: 0, z: 0, rotationX: 0, scale: 1, autoAlpha: 1, duration: .58, ease: 'power2.out', stagger: { each: MAT.stagger, from: 'center' } }, SCENE_START + .34);
    master.to(panels, { y: -10, duration: 1.8, ease: 'sine.inOut', stagger: { each: .05, from: 'edges' } }, SCENE_START + 1.35);
    master.to(panels, { x: function(i){ return [610,245,-132,-510,505,0,-372][i] || 0; }, y: function(i){ return [78,140,72,146,-172,-194,-150][i] || 0; }, scale: .34, rotationX: 0, rotationY: 0, autoAlpha: .22, duration: .82, ease: 'power2.inOut', stagger: { each: .04, from: 'edges' } }, SCENE_START + Math.min(3.0, SCENE_DURATION * .46));
    master.fromTo(hero, { scale: .90, y: 38, rotationX: 6, autoAlpha: 0 }, { scale: 1, y: 0, rotationX: 0, autoAlpha: 1, duration: .78, ease: 'power2.out' }, SCENE_START + Math.min(3.35, SCENE_DURATION * .52));
    master.fromTo(chips, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .34, ease: 'power2.out', stagger: .06 }, SCENE_START + Math.min(4.15, SCENE_DURATION * .64));
  }

  master.to(S + ' .osw-hero-content', { y: -6, duration: SCENE_DURATION * .45, ease: 'sine.inOut' }, SCENE_START + SCENE_DURATION * .50);
  master.to(S + ' .osw-wall', { autoAlpha: 0, duration: .35, ease: 'power2.in' }, SCENE_START + SCENE_DURATION - .45);
}
)();
